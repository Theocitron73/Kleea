"""E-mails d'alerte au titulaire d'un compte : nouvel appareil, mot de passe changé, compte commun.

Un e-mail qui ne part pas ne doit jamais bloquer l'action qui l'a déclenché : tout est rattrapé et noté au journal.
"""
import html
import os
from datetime import datetime
from zoneinfo import ZoneInfo

import resend
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from base import appareil_lisible, engine
from journaux import logger

EXPEDITEUR = "Kleea <noreply@theolebarbier.fr>"
PARIS = ZoneInfo("Europe/Paris")


def maintenant_lisible() -> str:
    return datetime.now(PARIS).strftime("%d/%m/%Y à %H:%M")


def email_du_compte(utilisateur: str):
    try:
        with engine.connect() as conn:
            return conn.execute(text("SELECT email FROM users WHERE LOWER(username) = LOWER(:u)"), {"u": utilisateur}).scalar()
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Adresse du compte introuvable pour une alerte : {type(e).__name__}")
        return None


def prevenir(utilisateur: str, sujet: str, lignes: list) -> bool:
    """Envoie l'alerte au titulaire du compte. Renvoie False si rien n'est parti (pas d'adresse, pas de clé, panne)."""
    email = email_du_compte(utilisateur)
    cle = os.getenv("RESEND_API_KEY")
    if not email or not cle:
        return False
    corps = "".join(f"<p>{html.escape(ligne)}</p>" for ligne in lignes)
    try:
        resend.api_key = cle
        resend.Emails.send({
            "from": EXPEDITEUR,
            "to": [email],
            "subject": f"Kleea - {sujet}",
            "html": f"""
            <html><body style="font-family: sans-serif;">
                {corps}
                <p style="font-size: 12px; color: #6b7280;">
                    Si ce n'est pas vous, changez votre mot de passe tout de suite et déconnectez les autres appareils depuis votre profil Kleea.
                </p>
            </body></html>
            """,
        })
    except Exception as e:  # noqa: BLE001
        logger.error(f"Alerte « {sujet} » non envoyée : {type(e).__name__}")
        return False
    return True


def appareil_deja_vu(utilisateur: str, user_agent) -> bool:
    """Vrai si le compte a déjà une session sur ce type d'appareil. Sans table des sessions, rien n'est signalé."""
    try:
        with engine.connect() as conn:
            return conn.execute(
                text("SELECT 1 FROM sessions_connexion WHERE utilisateur = :u AND appareil = :a LIMIT 1"),
                {"u": utilisateur.lower().strip(), "a": appareil_lisible(user_agent)},
            ).first() is not None
    except SQLAlchemyError:
        return True


def prevenir_si_nouvel_appareil(utilisateur: str, user_agent) -> None:
    """À appeler juste avant d'ouvrir la session : après, l'appareil serait déjà connu."""
    if appareil_deja_vu(utilisateur, user_agent):
        return
    prevenir(utilisateur, "Connexion depuis un nouvel appareil", [
        f"Une connexion à votre compte Kleea a eu lieu le {maintenant_lisible()} depuis un appareil que nous ne connaissions pas : {appareil_lisible(user_agent)}.",
        "Si c'est vous, il n'y a rien à faire.",
    ])


def prevenir_mot_de_passe_change(utilisateur: str) -> None:
    prevenir(utilisateur, "Mot de passe changé", [
        f"Le mot de passe de votre compte Kleea a été changé le {maintenant_lisible()}.",
        "Si c'est vous, il n'y a rien à faire.",
    ])


def prevenir_invitation_envoyee(proprietaire: str, invite_email: str, comptes: list) -> None:
    prevenir(proprietaire, "Invitation au compte commun envoyée", [
        f"Le {maintenant_lisible()}, une invitation à partager {', '.join(comptes)} a été envoyée depuis votre compte Kleea à {invite_email}.",
        "Tant qu'elle n'est pas acceptée, vous pouvez l'annuler depuis la section Compte commun de votre profil.",
    ])


def prevenir_invitation_acceptee(proprietaire: str, invite: str) -> None:
    prevenir(proprietaire, "Compte commun accepté", [
        f"Le {maintenant_lisible()}, {invite} a accepté votre invitation : cette personne voit maintenant les comptes que vous partagez avec elle.",
        "Vous pouvez arrêter le partage à tout moment depuis la section Compte commun de votre profil.",
    ])
