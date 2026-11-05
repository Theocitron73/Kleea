"""Chiffrement des IBAN et des jetons Powens."""
import os
from cryptography.fernet import Fernet, InvalidToken
from journaux import logger


# 🟢 INITIALISATION SÉCURISÉE DE FERNET
IBAN_KEY = os.getenv("IBAN_ENCRYPTION_KEY")


cipher = None


if IBAN_KEY:
    try:
        cipher = Fernet(IBAN_KEY.strip().encode())
    except Exception as e:
        logger.warning(f"⚠️ Clé IBAN_ENCRYPTION_KEY invalide : {e}")
else:
    logger.info("ℹ️ Aucune clé IBAN_ENCRYPTION_KEY trouvée dans le .env. Le chiffrement est inactif.")


def encrypt_iban(val: str) -> str:
    """Chiffre l'IBAN s'il commence par 'FR' ou ressemble à un IBAN."""
    if not val or not cipher:
        return val or ""
    clean_val = val.strip().upper()
    # On chiffre uniquement si c'est un IBAN (évite de chiffrer les simples noms de comptes Powens)
    if clean_val.startswith("FR") and len(clean_val.replace(" ", "")) >= 14:
        try:
            return cipher.encrypt(clean_val.encode()).decode()
        except Exception:
            return val
    return val


def chiffrer_jeton(val: str) -> str:
    """Chiffre le jeton Powens avant de l'enregistrer. Sans clé, il reste en clair, comme les IBAN."""
    if not val or not cipher:
        return val
    return cipher.encrypt(val.encode()).decode()


def dechiffrer_jeton(val: str) -> str:
    """Lit un jeton Powens : ceux enregistrés avant le chiffrement sont en clair et restent valables."""
    if not val or not cipher:
        return val
    try:
        return cipher.decrypt(val.encode()).decode()
    except InvalidToken:
        return val


def decrypt_iban(val: str) -> str:
    """Déchiffre un IBAN chiffré. Renvoie la chaîne brute si non chiffrée."""
    if not val or not cipher:
        return val or ""
    try:
        return cipher.decrypt(val.encode()).decode()
    except Exception:
        return val
