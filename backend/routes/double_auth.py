"""Double authentification facultative par code envoyé par e-mail : activation, connexion, désactivation."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
import resend
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError, SQLAlchemyError

from base import ALGORITHM, SECRET_KEY, en_utc, engine, get_current_user, jeton_de_session, verify_password
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


class Code(BaseModel):
    code: str = Field(min_length=1, max_length=32)


def empreinte_code(utilisateur: str, code: str) -> str:
    """Avec la clé du serveur : six chiffres seuls se retrouveraient vite à partir d'une copie de la base."""
    return hmac.new(SECRET_KEY.encode(), f"{utilisateur}:{code}".encode(), hashlib.sha256).hexdigest()


def masquer_email(email: str) -> str:
    nom, _, domaine = email.partition("@")
    return f"{nom[:1]}***@{domaine}"


def table_absente(erreur: Exception) -> bool:
    message = str(getattr(erreur, "orig", erreur)).lower()
    return "double_auth" in message and ("does not exist" in message or "no such table" in message)


def lire_ligne(conn, utilisateur: str):
    return conn.execute(
        text("SELECT active, code_empreinte, code_expire_le, essais FROM double_auth WHERE utilisateur = :u"),
        {"u": utilisateur},
    ).mappings().first()


def double_auth_active(utilisateur: str) -> bool:
    """Seule une table encore absente vaut « désactivée » : une autre panne ne doit pas contourner la protection."""
    try:
        with engine.connect() as conn:
            active = conn.execute(
                text("SELECT active FROM double_auth WHERE utilisateur = :u"), {"u": utilisateur.lower().strip()}
            ).scalar()
    except (ProgrammingError, OperationalError) as e:
        if table_absente(e):
            return False
        raise
    return bool(active)


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


def supprimer_double_auth(utilisateur: str) -> None:
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM double_auth WHERE utilisateur = :u"), {"u": utilisateur.lower().strip()})
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Double authentification non supprimée : {type(e).__name__}")


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


def mot_de_passe_valide(utilisateur: str, password: str) -> bool:
    with engine.connect() as conn:
        empreinte = conn.execute(
            text("SELECT password FROM users WHERE LOWER(username) = :u"), {"u": utilisateur}
        ).scalar()
    return bool(empreinte) and verify_password(password, empreinte)


@router.post("/login/double-auth")
def connexion_double_auth(corps: Connexion, request: Request):
    cle = utilisateur_du_jeton(corps.jeton)
    limiter(cle)
    with engine.begin() as conn:
        ligne = lire_ligne(conn, cle)
        accepte = bool(ligne and ligne["active"]) and consommer_code(conn, cle, ligne, corps.code)
        compte = conn.execute(
            text("SELECT username, role FROM users WHERE LOWER(username) = :u"), {"u": cle}
        ).first() if accepte else None
    if not compte:
        refuser(request, 401, "Code incorrect ou expiré.")

    role = compte[1] or "user"
    return {
        "status": "success",
        "access_token": jeton_de_session({"sub": compte[0], "role": role}, request.headers.get("user-agent")),
        "token_type": "bearer",
        "user": compte[0],
        "role": role,
    }


@router.post("/login/double-auth/renvoyer")
def renvoyer_code(corps: Jeton):
    cle = utilisateur_du_jeton(corps.jeton)
    if not double_auth_active(cle):
        raise HTTPException(status_code=401, detail="Connexion expirée. Saisissez de nouveau votre mot de passe.")
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
    return {"disponible": True, "active": bool(ligne and ligne["active"])}


# Mot de passe et codes refusés répondent 400 et non 401 : pour le frontend, 401 veut dire « session terminée ».
@router.post("/api/double-auth/preparer")
def preparer(corps: MotDePasse, request: Request, current_user: str = Depends(get_current_user)):
    """Envoie un premier code : l'activation prouve que l'adresse reçoit bien, avant d'en dépendre pour se connecter."""
    limiter(current_user)
    if not mot_de_passe_valide(current_user, corps.password):
        refuser(request, 400, "Mot de passe incorrect.")
    try:
        with engine.begin() as conn:
            resultat = conn.execute(
                text("""
                    INSERT INTO double_auth (utilisateur, active) VALUES (:u, :inactive)
                    ON CONFLICT (utilisateur) DO UPDATE SET active = EXCLUDED.active
                    WHERE double_auth.active = :inactive
                """),
                {"u": current_user, "inactive": False},
            )
    except (ProgrammingError, OperationalError) as e:
        if table_absente(e):
            raise HTTPException(status_code=503, detail=INDISPONIBLE)
        raise
    if resultat.rowcount != 1:
        raise HTTPException(status_code=409, detail="La double authentification est déjà activée.")
    return {"email_masque": emettre_code(current_user)}


@router.post("/api/double-auth/activer")
def activer(corps: Code, request: Request, current_user: str = Depends(get_current_user)):
    limiter(current_user)
    with engine.begin() as conn:
        ligne = lire_ligne(conn, current_user)
        if not ligne or ligne["active"]:
            raise HTTPException(status_code=409, detail="Recommencez l'activation depuis le début.")
        accepte = consommer_code(conn, current_user, ligne, corps.code)
        if accepte:
            conn.execute(text("UPDATE double_auth SET active = :a WHERE utilisateur = :u"), {"a": True, "u": current_user})
    if not accepte:
        refuser(request, 400, "Code incorrect ou expiré.")
    return {"status": "success"}


@router.post("/api/double-auth/desactiver")
def desactiver(corps: MotDePasse, request: Request, current_user: str = Depends(get_current_user)):
    limiter(current_user)
    if not mot_de_passe_valide(current_user, corps.password):
        refuser(request, 400, "Mot de passe incorrect.")
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM double_auth WHERE utilisateur = :u"), {"u": current_user})
    return {"status": "success"}
