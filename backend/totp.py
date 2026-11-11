"""Codes à 6 chiffres des applications d'authentification (RFC 6238 : TOTP, SHA-1, 30 secondes), sans dépendance."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from typing import Optional
from urllib.parse import quote

PERIODE = 30
CHIFFRES = 6
TOLERANCE = 1  # Une période avant ou après : l'horloge d'un téléphone n'est jamais tout à fait à l'heure.


def nouveau_secret() -> str:
    """160 bits en base32, sans le « = » de remplissage que certaines applications refusent."""
    return base64.b32encode(secrets.token_bytes(20)).decode().rstrip("=")


def _octets(secret: str) -> bytes:
    secret = secret.replace(" ", "").upper()
    return base64.b32decode(secret + "=" * (-len(secret) % 8))


def code(secret: str, etape: int) -> str:
    empreinte = hmac.new(_octets(secret), struct.pack(">Q", etape), hashlib.sha1).digest()
    decalage = empreinte[-1] & 0x0F
    nombre = struct.unpack(">I", empreinte[decalage:decalage + 4])[0] & 0x7FFFFFFF
    return f"{nombre % 10 ** CHIFFRES:0{CHIFFRES}d}"


def verifier(secret: str, saisi: str, derniere_etape: Optional[int], maintenant: Optional[float] = None) -> Optional[int]:
    """L'étape du code saisi s'il est bon et plus récent que le dernier accepté (un code ne sert qu'une fois), sinon None."""
    saisi = (saisi or "").replace(" ", "")
    if len(saisi) != CHIFFRES or not saisi.isdigit():
        return None
    actuelle = int((time.time() if maintenant is None else maintenant) // PERIODE)
    for etape in range(actuelle - TOLERANCE, actuelle + TOLERANCE + 1):
        if (derniere_etape is None or etape > derniere_etape) and hmac.compare_digest(code(secret, etape), saisi):
            return etape
    return None


def adresse(secret: str, compte: str) -> str:
    """Le lien otpauth:// que le QR code transporte vers l'application."""
    return f"otpauth://totp/Kleea:{quote(compte)}?secret={secret}&issuer=Kleea&digits={CHIFFRES}&period={PERIODE}"
