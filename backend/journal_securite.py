"""Journal des événements de sécurité d'un compte, consultable par son titulaire pour enquêter après un incident.

Noter ne doit jamais faire échouer l'action notée : chaque écriture a sa propre transaction et toute panne est rattrapée.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from base import appareil_lisible, engine
from journaux import logger
from securite import get_client_ip

DUREE_CONSERVATION = timedelta(days=90)

# Code enregistré -> libellé montré dans le profil.
EVENEMENTS = {
    "connexion": "Connexion",
    "echec_connexion": "Échec de connexion",
    "reinitialisation_demandee": "Réinitialisation du mot de passe demandée",
    "mot_de_passe_change": "Mot de passe changé",
    "double_auth_activee": "Double authentification activée",
    "double_auth_desactivee": "Double authentification désactivée",
    "session_deconnectee": "Appareil déconnecté",
    "partage_invitation": "Invitation au compte commun envoyée",
    "partage_accepte": "Compte commun accepté",
    "partage_arrete": "Compte commun arrêté",
}


def adresse_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    return get_client_ip(request)[:64]


def noter_evenement(utilisateur: str, evenement: str, request: Optional[Request] = None, detail: Optional[str] = None) -> None:
    assert evenement in EVENEMENTS, evenement
    agent = request.headers.get("user-agent") if request is not None else None
    try:
        with engine.begin() as conn:
            conn.execute(
                text("""INSERT INTO journal_securite (utilisateur, evenement, detail, appareil, ip, cree_le)
                        VALUES (:u, :e, :d, :a, :i, :t)"""),
                {"u": utilisateur.lower().strip(), "e": evenement, "d": (detail or None) and detail[:300],
                 "a": appareil_lisible(agent) if request is not None else None, "i": adresse_ip(request), "t": datetime.now(timezone.utc)},
            )
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Événement de sécurité non noté ({evenement}) : {type(e).__name__}")


def purger_journal() -> None:
    """Les adresses IP ne sont pas gardées plus de 90 jours."""
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM journal_securite WHERE cree_le < :limite"), {"limite": datetime.now(timezone.utc) - DUREE_CONSERVATION})
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Purge du journal de sécurité impossible : {type(e).__name__}")
