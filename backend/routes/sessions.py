"""Appareils connectés : lister ses sessions et les révoquer. Toutes les requêtes sont limitées au compte connecté."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from journaux import logger
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
from journal_securite import EVENEMENTS, noter_evenement
from base import ACCESS_TOKEN_EXPIRE_DAYS, couper_sessions, effacer_cookie_session, en_utc, engine, get_current_user, jeton_recu, poser_cookie_session, session_actuelle


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
def se_deconnecter(response: Response, current_user: str = Depends(get_current_user), actuelle: Optional[str] = Depends(session_actuelle)):
    """Le bouton de déconnexion : sans cela, l'appareil resterait listé jusqu'à l'expiration du jeton."""
    effacer_cookie_session(response)
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


@router.get("/api/securite/journal")
def lire_journal(current_user: str = Depends(get_current_user)):
    """Les 100 derniers événements de sécurité du compte, du plus récent au plus ancien."""
    try:
        with engine.connect() as conn:
            lignes = conn.execute(
                text("""SELECT evenement, detail, appareil, ip, cree_le FROM journal_securite
                        WHERE utilisateur = :u ORDER BY cree_le DESC, id DESC LIMIT 100"""),
                {"u": current_user},
            ).mappings().all()
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Journal de sécurité illisible : {type(e).__name__}")
        return {"disponible": False, "evenements": []}
    return {"disponible": True, "evenements": [
        {**dict(l), "libelle": EVENEMENTS.get(l["evenement"], l["evenement"]), "cree_le": en_utc(l["cree_le"]).isoformat(),
         "echec": l["evenement"] == "echec_connexion"}
        for l in lignes
    ]}


@router.post("/api/sessions/cookie")
def passer_au_cookie(response: Response, current_user: str = Depends(get_current_user), jeton: str = Depends(jeton_recu)):
    """Une session ouverte avant le cookie : son jeton passe dans le cookie HttpOnly, et le site l'efface de son stockage."""
    poser_cookie_session(response, jeton)
    return {"status": "success"}


@router.post("/api/sessions/revoquer-autres")
def revoquer_les_autres(request: Request, current_user: str = Depends(get_current_user), actuelle: Optional[str] = Depends(session_actuelle)):
    try:
        revoquees = couper_sessions(current_user, actuelle)
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Révocation des sessions impossible : {type(e).__name__}")
        raise HTTPException(status_code=503, detail=INDISPONIBLE)
    if revoquees:
        noter_evenement(current_user, "session_deconnectee", request, f"Tous les autres appareils ({revoquees})")
    return {"status": "success", "revoquees": revoquees}


@router.delete("/api/sessions/{session_id}")
def revoquer_session(session_id: str, request: Request, current_user: str = Depends(get_current_user)):
    try:
        with engine.begin() as conn:
            appareil = conn.execute(
                text("SELECT appareil FROM sessions_connexion WHERE id = :id AND utilisateur = :u"), {"id": session_id, "u": current_user},
            ).scalar()
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
    noter_evenement(current_user, "session_deconnectee", request, appareil)
    return {"status": "success"}
