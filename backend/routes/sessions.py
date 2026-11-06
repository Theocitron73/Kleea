"""Appareils connectés : lister ses sessions et les révoquer. Toutes les requêtes sont limitées au compte connecté."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from journaux import logger
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from base import ACCESS_TOKEN_EXPIRE_DAYS, en_utc, engine, get_current_user, session_actuelle


router = APIRouter()


INDISPONIBLE = "La gestion des appareils connectés n'est pas disponible pour le moment."


def en_iso(valeur) -> Optional[str]:
    date = en_utc(valeur)
    return date.isoformat() if date else None


@router.get("/api/sessions")
def lister_sessions(current_user: str = Depends(get_current_user), actuelle: Optional[str] = Depends(session_actuelle)):
    limite = datetime.now(timezone.utc) - timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    try:
        with engine.connect() as conn:
            lignes = conn.execute(
                text("""
                    SELECT id, appareil, cree_le, derniere_activite FROM sessions_connexion
                    WHERE utilisateur = :u AND revoquee_le IS NULL AND cree_le > :limite
                    ORDER BY derniere_activite DESC
                """),
                {"u": current_user, "limite": limite},
            ).fetchall()
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Liste des sessions indisponible : {type(e).__name__}")
        return {"disponible": False, "session_suivie": False, "sessions": []}

    sessions = [
        {
            "id": ligne.id,
            "appareil": ligne.appareil,
            "cree_le": en_iso(ligne.cree_le),
            "derniere_activite": en_iso(ligne.derniere_activite),
            "actuelle": ligne.id == actuelle,
        }
        for ligne in lignes
    ]
    # La session en cours d'abord, puis les plus récemment actives.
    sessions.sort(key=lambda s: not s["actuelle"])
    return {"disponible": True, "session_suivie": bool(actuelle), "sessions": sessions}


@router.post("/api/sessions/deconnexion")
def se_deconnecter(current_user: str = Depends(get_current_user), actuelle: Optional[str] = Depends(session_actuelle)):
    """Le bouton de déconnexion : sans cela, l'appareil resterait listé jusqu'à l'expiration du jeton."""
    if actuelle:
        try:
            with engine.begin() as conn:
                conn.execute(
                    text("UPDATE sessions_connexion SET revoquee_le = :t WHERE id = :id AND utilisateur = :u AND revoquee_le IS NULL"),
                    {"t": datetime.now(timezone.utc), "id": actuelle, "u": current_user},
                )
        except SQLAlchemyError as e:
            logger.warning(f"⚠️ Déconnexion non enregistrée : {type(e).__name__}")
    return {"status": "success"}


@router.post("/api/sessions/revoquer-autres")
def revoquer_les_autres(current_user: str = Depends(get_current_user), actuelle: Optional[str] = Depends(session_actuelle)):
    condition = "utilisateur = :u AND revoquee_le IS NULL"
    valeurs = {"t": datetime.now(timezone.utc), "u": current_user}
    if actuelle:
        condition += " AND id <> :actuelle"
        valeurs["actuelle"] = actuelle
    try:
        with engine.begin() as conn:
            resultat = conn.execute(text(f"UPDATE sessions_connexion SET revoquee_le = :t WHERE {condition}"), valeurs)
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Révocation des sessions impossible : {type(e).__name__}")
        raise HTTPException(status_code=503, detail=INDISPONIBLE)
    return {"status": "success", "revoquees": resultat.rowcount}


@router.delete("/api/sessions/{session_id}")
def revoquer_session(session_id: str, current_user: str = Depends(get_current_user)):
    try:
        with engine.begin() as conn:
            resultat = conn.execute(
                text("UPDATE sessions_connexion SET revoquee_le = :t WHERE id = :id AND utilisateur = :u AND revoquee_le IS NULL"),
                {"t": datetime.now(timezone.utc), "id": session_id, "u": current_user},
            )
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Révocation de la session impossible : {type(e).__name__}")
        raise HTTPException(status_code=503, detail=INDISPONIBLE)
    # Même réponse pour la session d'un autre compte et pour une session inexistante : rien n'est révélé.
    if resultat.rowcount == 0:
        raise HTTPException(status_code=404, detail="Session introuvable")
    return {"status": "success"}
