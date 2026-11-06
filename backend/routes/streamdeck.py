"""Plugin Stream Deck."""
import hashlib
import secrets
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Header, Response
from fastapi.concurrency import run_in_threadpool
from journaux import logger
from sqlalchemy import text
from streamdeck_calculs import calculer_vues_streamdeck
from typing import Optional
from base import engine, get_current_user
from routes.powens import check_sync_status, declencher_actualisation_bancaire, exec_recalculate_balances, synchroniser_et_noter, jeton_powens_du_compte
from securite import check_is_rate_limited


router = APIRouter()


def supprimer_jeton_streamdeck(conn, utilisateur: str):
    conn.execute(
        text("DELETE FROM streamdeck_tokens WHERE LOWER(utilisateur) = LOWER(:u)"),
        {"u": utilisateur},
    )


def empreinte_jeton_streamdeck(jeton: str) -> str:
    return hashlib.sha256(jeton.encode("utf-8")).hexdigest()


def get_streamdeck_user(x_streamdeck_token: Optional[str] = Header(None)) -> str:
    if not x_streamdeck_token:
        raise HTTPException(status_code=401, detail="Jeton Stream Deck manquant")
    with engine.begin() as conn:
        utilisateur = conn.execute(
            text("SELECT utilisateur FROM streamdeck_tokens WHERE token_hash = :h"),
            {"h": empreinte_jeton_streamdeck(x_streamdeck_token)},
        ).scalar()
    if not utilisateur:
        raise HTTPException(status_code=401, detail="Jeton Stream Deck invalide")
    return utilisateur


@router.get("/api/streamdeck/token")
def statut_jeton_streamdeck(current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        created_at = conn.execute(
            text("SELECT created_at FROM streamdeck_tokens WHERE LOWER(utilisateur) = LOWER(:u)"),
            {"u": current_user},
        ).scalar()
    return {"active": bool(created_at), "created_at": created_at}


@router.post("/api/streamdeck/token")
def generer_jeton_streamdeck(response: Response, current_user: str = Depends(get_current_user)):
    """Crée un jeton ou remplace l'ancien. Le jeton en clair n'est renvoyé qu'ici, une seule fois."""
    jeton = f"kleea_sd_{secrets.token_urlsafe(32)}"
    created_at = datetime.now(timezone.utc).isoformat()
    with engine.begin() as conn:
        supprimer_jeton_streamdeck(conn, current_user)
        conn.execute(
            text("INSERT INTO streamdeck_tokens (utilisateur, token_hash, created_at) VALUES (:u, :h, :c)"),
            {"u": current_user, "h": empreinte_jeton_streamdeck(jeton), "c": created_at},
        )
    response.headers["Cache-Control"] = "no-store"
    return {"token": jeton, "created_at": created_at}


@router.delete("/api/streamdeck/token")
def revoquer_jeton_streamdeck(current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        supprimer_jeton_streamdeck(conn, current_user)
    return {"status": "success"}


@router.get("/api/streamdeck/data")
def donnees_streamdeck(response: Response, utilisateur: str = Depends(get_streamdeck_user)):
    with engine.connect() as conn:
        comptes = conn.execute(
            text("SELECT compte, groupe, solde, couleur FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)"),
            {"u": utilisateur},
        ).mappings().all()
        transactions = conn.execute(
            text("SELECT date, nom, montant, categorie, mois, annee, compte FROM transactions WHERE LOWER(utilisateur) = LOWER(:u)"),
            {"u": utilisateur},
        ).mappings().all()
    response.headers["Cache-Control"] = "no-store"
    return calculer_vues_streamdeck([dict(c) for c in comptes], [dict(t) for t in transactions], date.today())


def etat_powens_streamdeck(utilisateur: str) -> dict:
    with engine.connect() as conn:
        powens_token = conn.execute(
            text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)"),
            {"u": utilisateur},
        ).scalar()
    if not powens_token:
        return {"connecte": False, "erreur": False, "count": 0, "comptes": {}}

    resultat = check_sync_status(utilisateur, utilisateur)
    return {
        "connecte": True,
        "erreur": bool(resultat.get("error")),
        "count": resultat.get("count", 0),
        "comptes": {nom: infos["count"] for nom, infos in resultat.get("accounts", {}).items()},
    }


@router.get("/api/streamdeck/powens")
def powens_streamdeck(response: Response, utilisateur: str = Depends(get_streamdeck_user)):
    """Nombre de transactions à importer. Route séparée car elle interroge Powens, bien plus lent que la base."""
    response.headers["Cache-Control"] = "no-store"
    return etat_powens_streamdeck(utilisateur)


# Une actualisation sollicite réellement les banques : un appui répété ne doit pas les saturer.
LIMITE_ACTUALISATIONS_STREAMDECK = 6  # par compte, sur 10 minutes


def importer_si_mode_auto(utilisateur: str) -> bool:
    """Comme le bouton Actualiser de la page Importer. Renvoie False si l'import a échoué."""
    with engine.connect() as conn:
        mode = conn.execute(
            text("SELECT import_mode FROM users WHERE LOWER(username) = LOWER(:u)"),
            {"u": utilisateur},
        ).scalar()
    if mode != "auto":
        return True
    try:
        synchroniser_et_noter(utilisateur)
        exec_recalculate_balances(utilisateur)
        return True
    except Exception as e:
        logger.error(f"❌ Import automatique après actualisation Stream Deck : {type(e).__name__}")
        return False


@router.post("/api/streamdeck/powens/actualiser")
async def actualiser_powens_streamdeck(response: Response, utilisateur: str = Depends(get_streamdeck_user)):
    """Équivalent du bouton Actualiser de la page Importer, pour la touche Powens."""
    response.headers["Cache-Control"] = "no-store"

    limite = await run_in_threadpool(
        check_is_rate_limited,
        key=utilisateur,
        action="streamdeck_bank_refresh",
        max_attempts=LIMITE_ACTUALISATIONS_STREAMDECK,
        window_minutes=10,
    )
    if limite:
        raise HTTPException(status_code=429, detail="Trop d'actualisations en peu de temps.")

    user_token = await run_in_threadpool(jeton_powens_du_compte, utilisateur)
    if not user_token:
        return {"connecte": False, "erreur": False, "count": 0, "comptes": {}, "actualisees": 0, "echecs": 0}

    actualisees, echecs = 0, 0
    try:
        resultat = await declencher_actualisation_bancaire(user_token)
        for connexion in resultat["synced_connections"]:
            statut = connexion["status"]
            if isinstance(statut, int) and 200 <= statut < 300:
                actualisees += 1
            else:
                echecs += 1
    except HTTPException:
        echecs += 1

    import_reussi = await run_in_threadpool(importer_si_mode_auto, utilisateur) if not echecs else True
    etat = await run_in_threadpool(etat_powens_streamdeck, utilisateur)
    return {
        **etat,
        "erreur": etat["erreur"] or not import_reussi,
        "actualisees": actualisees,
        "echecs": echecs,
    }
