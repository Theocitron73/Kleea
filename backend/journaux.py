"""Journaux sans secret et suivi des erreurs. Ce module doit rester sans dépendance vers main.py."""
import logging
import os
import re
import sys
import uuid
from fastapi import HTTPException
from typing import Optional


# Les journaux contiennent des emojis : sur une sortie en cp1252 (Windows, hors console),
# le moindre journal lèverait UnicodeEncodeError et ferait échouer la requête en cours.
for _flux in (sys.stdout, sys.stderr):
    if hasattr(_flux, "reconfigure"):
        _flux.reconfigure(encoding="utf-8", errors="replace")

# --- JOURNAUX ---------------------------------------------------------------
# Ils ne doivent contenir ni secret ni donnée bancaire : ces motifs servent de filet de sécurité.
MOTIFS_SECRETS = [
    (re.compile(r"(?i)(bearer\s+)[\w.~+/=-]+"), r"\1***"),
    (re.compile(r"kleea_sd_[\w-]+"), "kleea_sd_***"),
    (re.compile(r"\beyJ[\w-]+\.[\w-]+\.[\w-]+"), "***"),
    (re.compile(r"(?i)\b(\w*(?:token|password|secret|api_key|auth_key|code)[\"']?\s*[=:]\s*[\"']?)[^\s&\"',}]+"), r"\1***"),
    (re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{2,4}){3,8}\b"), "***IBAN***"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "***@***"),
]
# Ces routes portent un jeton de partage dans leur chemin.
ROUTES_A_JETON = re.compile(
    r"/(get-shared-tricount|save-shared-transaction|update-shared-transaction|delete-shared-transaction|download-shared-pdf)/[^/?\s]+"
)


def masquer_secrets(texte) -> str:
    texte = str(texte)
    for motif, remplacement in MOTIFS_SECRETS:
        texte = motif.sub(remplacement, texte)
    return texte


def chemin_journalisable(chemin: str) -> str:
    """Sans paramètres d'URL ni jeton de partage."""
    return ROUTES_A_JETON.sub(r"/\1/***", str(chemin).split("?", 1)[0])


class FormateurSansSecrets(logging.Formatter):
    """Masque les secrets dans le message et dans la trace d'erreur."""

    def __init__(self, base: Optional[logging.Formatter] = None):
        super().__init__("%(asctime)s %(levelname)s %(message)s")
        self.base = base

    def format(self, record):
        return masquer_secrets(self.base.format(record) if self.base else super().format(record))


class FiltreJournalAcces(logging.Filter):
    """Uvicorn journalise l'URL complète de chaque requête : on n'en garde que le chemin nettoyé."""

    def filter(self, record):
        if isinstance(record.args, tuple) and len(record.args) == 5:
            client, methode, chemin, version, statut = record.args
            record.args = (client, methode, chemin_journalisable(chemin), version, statut)
        return True


logger = logging.getLogger("kleea")
if not logger.handlers:
    _sortie = logging.StreamHandler(sys.stdout)
    _sortie.setFormatter(FormateurSansSecrets())
    logger.addHandler(_sortie)
    logger.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    logger.propagate = False

logging.getLogger("uvicorn.access").addFilter(FiltreJournalAcces())
for _nom in ("uvicorn", "uvicorn.error"):
    for _sortie in logging.getLogger(_nom).handlers:
        if not isinstance(_sortie.formatter, FormateurSansSecrets):
            _sortie.setFormatter(FormateurSansSecrets(_sortie.formatter))


def detail_erreur(e: Exception, contexte: str = "Erreur interne") -> str:
    """Journalise la cause et renvoie au navigateur un message générique avec une référence pour la retrouver."""
    if isinstance(e, HTTPException):
        return e.detail
    reference = uuid.uuid4().hex[:8]
    logger.error(f"{contexte} [ref {reference}] : {type(e).__name__} : {e}")
    return f"{contexte}. Référence : {reference}"


def nettoyer_evenement_sentry(event, hint=None):
    """Rien d'identifiant ni de financier ne part vers le service de suivi d'erreurs."""
    for cle in ("user", "breadcrumbs", "server_name", "extra", "modules"):
        event.pop(cle, None)
    requete = event.get("request")
    if requete:
        event["request"] = {"method": requete.get("method"), "url": chemin_journalisable(requete.get("url", ""))}
    if isinstance(event.get("message"), str):
        event["message"] = masquer_secrets(event["message"])
    entree = event.get("logentry")
    if entree:
        entree.pop("params", None)
        for cle, valeur in entree.items():
            if isinstance(valeur, str):
                entree[cle] = masquer_secrets(valeur)
    for exception in (event.get("exception") or {}).get("values") or []:
        if exception.get("value"):
            exception["value"] = masquer_secrets(exception["value"])
        for cadre in (exception.get("stacktrace") or {}).get("frames") or []:
            for cle in ("vars", "pre_context", "context_line", "post_context"):
                cadre.pop(cle, None)
    return event


def demarrer_suivi_erreurs():
    """Inactif tant que SENTRY_DSN n'est pas défini : aucune donnée ne quitte alors le serveur."""
    dsn = os.getenv("SENTRY_DSN")
    if not dsn:
        return False
    try:
        import sentry_sdk

        sentry_sdk.init(
            dsn=dsn,
            environment=os.getenv("SENTRY_ENVIRONMENT", "production"),
            send_default_pii=False,
            include_local_variables=False,
            include_source_context=False,
            max_request_body_size="never",
            max_breadcrumbs=0,
            traces_sample_rate=0,
            before_send=nettoyer_evenement_sentry,
        )
        logger.info("Suivi d'erreurs actif.")
        return True
    except Exception as e:
        logger.warning(f"Suivi d'erreurs non démarré : {type(e).__name__}")
        return False
