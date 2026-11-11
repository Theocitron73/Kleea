"""Double authentification facultative, par code envoyé par e-mail ou par application (TOTP) : activation, connexion, désactivation."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

import jwt
import resend
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

import totp
from alertes_email import prevenir_si_nouvel_appareil
from chiffrement import chiffrer_jeton, dechiffrer_jeton
from journal_securite import noter_evenement
from base import ALGORITHM, SECRET_KEY, en_utc, engine, get_current_user, jeton_de_session, poser_cookie_session, verify_password
from journaux import logger
from securite import check_and_record_failed_attempt, check_is_rate_limited, get_client_ip


router = APIRouter()

DUREE_CODE = timedelta(minutes=10)
ESSAIS_PAR_CODE = 5
DUREE_ETAPE_CONNEXION = timedelta(minutes=15)  # Laisse à l'e-mail le temps d'arriver et à un renvoi de servir.
INDISPONIBLE = "La double authentification n'est pas encore disponible sur ce serveur."


class Jeton(BaseModel):
    jeton: str = Field(min_length=1, max_length=2000)


class Connexion(Jeton):
    code: str = Field(min_length=1, max_length=32)


class MotDePasse(BaseModel):
    password: str = Field(min_length=1, max_length=500)


class Preparation(MotDePasse):
    methode: Literal["email", "application"] = "email"


class Code(BaseModel):
    code: str = Field(min_length=1, max_length=32)


def empreinte_code(utilisateur: str, code: str) -> str:
    """Avec la clé du serveur : six chiffres seuls se retrouveraient vite à partir d'une copie de la base."""
    return hmac.new(SECRET_KEY.encode(), f"{utilisateur}:{code}".encode(), hashlib.sha256).hexdigest()


def masquer_email(email: str) -> str:
    nom, _, domaine = email.partition("@")
    return f"{nom[:1]}***@{domaine}"


def table_absente(erreur: Exception) -> bool:
    """Seule la table manquante compte : une colonne manquante (révision pas appliquée) ne doit pas couper la protection."""
    message = str(getattr(erreur, "orig", erreur)).lower()
    return 'relation "double_auth" does not exist' in message or "no such table: double_auth" in message


def lire_ligne(conn, utilisateur: str):
    return conn.execute(
        text("SELECT active, code_empreinte, code_expire_le, essais, methode, secret, derniere_etape FROM double_auth WHERE utilisateur = :u"),
        {"u": utilisateur},
    ).mappings().first()


def methode_double_auth(utilisateur: str) -> Optional[str]:
    """« email » ou « application » si la double authentification est active, sinon None.

    Seule une table encore absente vaut « désactivée » : une autre panne ne doit pas contourner la protection.
    """
    try:
        with engine.connect() as conn:
            ligne = conn.execute(
                text("SELECT active, methode FROM double_auth WHERE utilisateur = :u"), {"u": utilisateur.lower().strip()}
            ).first()
    except (ProgrammingError, OperationalError) as e:
        if table_absente(e):
            return None
        raise
    return (ligne.methode or "email") if ligne and ligne.active else None



def jeton_etape_connexion(utilisateur: str) -> str:
    """Sans « sub », get_current_user le refuse : il ne donne accès qu'à la saisie du code."""
    fin = datetime.now(timezone.utc) + DUREE_ETAPE_CONNEXION
    return jwt.encode({"double_auth": utilisateur, "exp": fin}, SECRET_KEY, algorithm=ALGORITHM)


def utilisateur_du_jeton(jeton: str) -> str:
    try:
        utilisateur = jwt.decode(jeton, SECRET_KEY, algorithms=[ALGORITHM]).get("double_auth")
    except jwt.PyJWTError:
        utilisateur = None
    if not utilisateur:
        raise HTTPException(status_code=401, detail="Connexion expirée. Saisissez de nouveau votre mot de passe.")
    return utilisateur.lower().strip()


def envoyer_code(email: str, code: str) -> None:
    resend.api_key = os.getenv("RESEND_API_KEY")
    resend.Emails.send({
        "from": "Kleea <noreply@theolebarbier.fr>",
        "to": [email],
        "subject": "Kleea - Votre code de connexion",
        "html": f"""
        <html>
            <body style="font-family: sans-serif;">
                <p>Voici votre code de connexion à Kleea, valable 10 minutes :</p>
                <p style="font-size: 28px; font-weight: bold; letter-spacing: 6px;">{code}</p>
                <p style="font-size: 12px; color: #6b7280;">
                    Si vous n'êtes pas à l'origine de cette demande, quelqu'un connaît votre mot de passe : changez-le.
                </p>
            </body>
        </html>
        """,
    })


def emettre_code(utilisateur: str) -> str:
    """Remplace le code en cours, l'envoie et renvoie l'adresse masquée. Sans envoi réussi, pas de connexion possible."""
    cle = utilisateur.lower().strip()
    if check_is_rate_limited(key=cle, action="double_auth_envoi", max_attempts=5, window_minutes=15):
        raise HTTPException(status_code=429, detail="Trop de codes envoyés. Patientez quelques minutes.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    with engine.begin() as conn:
        email = conn.execute(text("SELECT email FROM users WHERE LOWER(username) = :u"), {"u": cle}).scalar()
        if not email:
            raise HTTPException(status_code=400, detail="Ajoutez d'abord une adresse e-mail à votre profil.")
        conn.execute(
            text("UPDATE double_auth SET code_empreinte = :h, code_expire_le = :f, essais = 0 WHERE utilisateur = :u"),
            {"h": empreinte_code(cle, code), "f": datetime.now(timezone.utc) + DUREE_CODE, "u": cle},
        )
    try:
        envoyer_code(email, code)
    except Exception as e:
        logger.error(f"Envoi du code de double authentification impossible : {type(e).__name__}")
        raise HTTPException(status_code=503, detail="Impossible d'envoyer le code par e-mail. Réessayez dans un instant.")
    return masquer_email(email)


def limiter(utilisateur: str) -> None:
    if check_is_rate_limited(key=utilisateur, action="double_auth", max_attempts=10, window_minutes=5):
        raise HTTPException(status_code=429, detail="Trop d'essais. Patientez quelques minutes.")


def refuser(request: Request, status: int, detail: str) -> None:
    bloquee, _ = check_and_record_failed_attempt(get_client_ip(request))
    if bloquee:
        raise HTTPException(status_code=403, detail="Trop d'échecs consécutifs. Votre IP est suspendue pour 30 minutes.")
    raise HTTPException(status_code=status, detail=detail)


def consommer_code(conn, utilisateur: str, ligne, code: str) -> bool:
    """Un code sert une fois, expire, et saute après trop d'essais : il faut alors en demander un autre."""
    expire_le = en_utc(ligne["code_expire_le"])
    if not ligne["code_empreinte"] or not expire_le or expire_le < datetime.now(timezone.utc) or ligne["essais"] >= ESSAIS_PAR_CODE:
        return False
    if hmac.compare_digest(empreinte_code(utilisateur, code.replace(" ", "")), ligne["code_empreinte"]):
        return conn.execute(  # Conditionnel : deux envois simultanés du même code n'en font passer qu'un.
            text("UPDATE double_auth SET code_empreinte = NULL, code_expire_le = NULL WHERE utilisateur = :u AND code_empreinte = :h"),
            {"u": utilisateur, "h": ligne["code_empreinte"]},
        ).rowcount == 1
    conn.execute(text("UPDATE double_auth SET essais = essais + 1 WHERE utilisateur = :u"), {"u": utilisateur})
    return False


def verifier_code(conn, utilisateur: str, ligne, code: str) -> bool:
    """Le code de l'application, ou celui reçu par e-mail, selon la méthode choisie."""
    if (ligne["methode"] or "email") != "application":
        return consommer_code(conn, utilisateur, ligne, code)
    etape = totp.verifier(dechiffrer_jeton(ligne["secret"] or ""), code, ligne["derniere_etape"]) if ligne["secret"] else None
    if etape is None:
        return False
    return conn.execute(  # Conditionnel : le même code envoyé deux fois en même temps n'ouvre qu'une session.
        text("UPDATE double_auth SET derniere_etape = :e WHERE utilisateur = :u AND (derniere_etape IS NULL OR derniere_etape < :e)"),
        {"e": etape, "u": utilisateur},
    ).rowcount == 1


def mot_de_passe_valide(utilisateur: str, password: str) -> bool:
    with engine.connect() as conn:
        empreinte = conn.execute(
            text("SELECT password FROM users WHERE LOWER(username) = :u"), {"u": utilisateur}
        ).scalar()
    return bool(empreinte) and verify_password(password, empreinte)


@router.post("/login/double-auth")
def connexion_double_auth(corps: Connexion, request: Request, response: Response):
    cle = utilisateur_du_jeton(corps.jeton)
    limiter(cle)
    with engine.begin() as conn:
        ligne = lire_ligne(conn, cle)
        accepte = bool(ligne and ligne["active"]) and verifier_code(conn, cle, ligne, corps.code)
        compte = conn.execute(
            text("SELECT username, role FROM users WHERE LOWER(username) = :u"), {"u": cle}
        ).first() if accepte else None
    if not compte:
        noter_evenement(cle, "echec_connexion", request, "Code de double authentification incorrect")
        refuser(request, 401, "Code incorrect ou expiré.")

    role = compte[1] or "user"
    prevenir_si_nouvel_appareil(compte[0], request.headers.get("user-agent"))
    noter_evenement(compte[0], "connexion", request, "Avec la double authentification")
    jeton = jeton_de_session({"sub": compte[0], "role": role}, request.headers.get("user-agent"))
    poser_cookie_session(response, jeton)
    # shortcut: le jeton reste aussi dans la réponse pour les applications déjà en cache sur les téléphones ; à retirer après quelques semaines.
    return {
        "status": "success",
        "access_token": jeton,
        "token_type": "bearer",
        "user": compte[0],
        "role": role,
    }


@router.post("/login/double-auth/renvoyer")
def renvoyer_code(corps: Jeton):
    cle = utilisateur_du_jeton(corps.jeton)
    methode = methode_double_auth(cle)
    if not methode:
        raise HTTPException(status_code=401, detail="Connexion expirée. Saisissez de nouveau votre mot de passe.")
    if methode != "email":
        raise HTTPException(status_code=400, detail="Le code vient de votre application d'authentification : aucun e-mail n'est envoyé.")
    return {"email_masque": emettre_code(cle)}


@router.get("/api/double-auth")
def etat_double_auth(current_user: str = Depends(get_current_user)):
    try:
        with engine.connect() as conn:
            ligne = lire_ligne(conn, current_user)
    except (ProgrammingError, OperationalError) as e:
        if table_absente(e):
            return {"disponible": False, "active": False}
        raise
    actif = bool(ligne and ligne["active"])
    return {"disponible": True, "active": actif, "methode": (ligne["methode"] or "email") if actif else None}


# Mot de passe et codes refusés répondent 400 et non 401 : pour le frontend, 401 veut dire « session terminée ».
@router.post("/api/double-auth/preparer")
def preparer(corps: Preparation, request: Request, current_user: str = Depends(get_current_user)):
    """Envoie un premier code, ou donne le secret à scanner : l'activation prouve que le code arrive, avant d'en dépendre."""
    limiter(current_user)
    if not mot_de_passe_valide(current_user, corps.password):
        refuser(request, 400, "Mot de passe incorrect.")
    secret = totp.nouveau_secret() if corps.methode == "application" else None
    try:
        with engine.begin() as conn:
            resultat = conn.execute(
                text("""
                    INSERT INTO double_auth (utilisateur, active, methode, secret, derniere_etape) VALUES (:u, :inactive, :m, :s, NULL)
                    ON CONFLICT (utilisateur) DO UPDATE SET active = EXCLUDED.active, methode = EXCLUDED.methode,
                        secret = EXCLUDED.secret, derniere_etape = NULL
                    WHERE double_auth.active = :inactive
                """),
                {"u": current_user, "inactive": False, "m": corps.methode, "s": chiffrer_jeton(secret) if secret else None},
            )
    except (ProgrammingError, OperationalError) as e:
        if table_absente(e):
            raise HTTPException(status_code=503, detail=INDISPONIBLE)
        raise
    if resultat.rowcount != 1:
        raise HTTPException(status_code=409, detail="La double authentification est déjà activée.")
    if secret:
        return {"methode": "application", "secret": secret, "adresse": totp.adresse(secret, current_user)}
    return {"methode": "email", "email_masque": emettre_code(current_user)}


@router.post("/api/double-auth/activer")
def activer(corps: Code, request: Request, current_user: str = Depends(get_current_user)):
    limiter(current_user)
    with engine.begin() as conn:
        ligne = lire_ligne(conn, current_user)
        if not ligne or ligne["active"]:
            raise HTTPException(status_code=409, detail="Recommencez l'activation depuis le début.")
        accepte = verifier_code(conn, current_user, ligne, corps.code)
        if accepte:
            conn.execute(text("UPDATE double_auth SET active = :a WHERE utilisateur = :u"), {"a": True, "u": current_user})
    if not accepte:
        refuser(request, 400, "Code incorrect ou expiré.")
    noter_evenement(current_user, "double_auth_activee", request, "Par application" if ligne["methode"] == "application" else "Par e-mail")
    return {"status": "success"}


@router.post("/api/double-auth/desactiver")
def desactiver(corps: MotDePasse, request: Request, current_user: str = Depends(get_current_user)):
    limiter(current_user)
    if not mot_de_passe_valide(current_user, corps.password):
        refuser(request, 400, "Mot de passe incorrect.")
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM double_auth WHERE utilisateur = :u"), {"u": current_user})
    noter_evenement(current_user, "double_auth_desactivee", request)
    return {"status": "success"}
