"""Pare-feu, bannissement d'IP, limitation de débit et routes d'administration de la sécurité."""
import asyncio
import time
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from journaux import logger
from sqlalchemy import text
from base import engine, get_current_admin, purger_sessions_expirees


router = APIRouter()


# 4. Cache & Tâche de fond Sécurité
BANNED_IPS_CACHE = {}


LAST_BANNED_SYNC = 0.0


def refresh_banned_ips_cache(force: bool = False):
    global LAST_BANNED_SYNC, BANNED_IPS_CACHE
    now_ts = time.time()
    if force or (now_ts - LAST_BANNED_SYNC > 30):
        now = datetime.now(timezone.utc)
        try:
            with engine.connect() as conn:
                res = conn.execute(
                    text("SELECT ip, banned_until FROM banned_ips WHERE banned_until > :now"), 
                    {"now": now}
                ).fetchall()
                BANNED_IPS_CACHE = {row[0]: row[1] for row in res}
            LAST_BANNED_SYNC = now_ts
        except Exception as e:
            logger.warning(f"⚠️ Erreur synchro cache IP : {e}")


async def periodic_cleanup_task():
    """Purge les vieux rate-limits toutes les heures sans bloquer les requêtes."""
    while True:
        try:
            await asyncio.sleep(3600)
            now = datetime.now(timezone.utc)
            with engine.begin() as conn:
                conn.execute(text("DELETE FROM security_rate_limits WHERE attempted_at < :old"), {"old": now - timedelta(hours=24)})
                conn.execute(text("DELETE FROM login_failed_attempts WHERE attempted_at < :old"), {"old": now - timedelta(hours=2)})
            # Hors de la transaction ci-dessus : l'absence de cette table ne doit pas annuler les autres purges.
            purger_sessions_expirees()
            from journal_securite import purger_journal  # journal_securite importe ce module : import tardif

            purger_journal()
            logger.info("🧹 [MAINTENANCE] Tables de sécurité nettoyées.")
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"⚠️ Erreur tâche périodique : {e}")


# 🍯 Identifiants pièges (Honeypot) : Toute tentative bannit l'IP
HONEYPOT_USERNAMES = {
    "admin", "administrator", "root", "superuser", "system", 
    "guest", "test_admin", "user_admin", "demo", "master"
}


# 9. Pare-feu Sécurité
def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    cf_ip = request.headers.get("cf-connecting-ip")
    if cf_ip:
        return cf_ip.strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


async def security_firewall_middleware(request: Request, call_next):
    # 1. Laisse toujours passer les requêtes preflight CORS
    if request.method == "OPTIONS":
        return await call_next(request)

    client_ip = get_client_ip(request)
    now = datetime.now(timezone.utc)
    refresh_banned_ips_cache()

    # 2. Vérification si l'IP est bannie
    if client_ip in BANNED_IPS_CACHE:
        banned_until = BANNED_IPS_CACHE[client_ip]
        if banned_until and banned_until > now:
            # Calcule les minutes restantes
            minutes_restantes = max(1, int((banned_until - now).total_seconds() / 60))
            
            origin = request.headers.get("origin")
            response = JSONResponse(
                status_code=403,
                content={
                    "detail": f"🚫 Accès bloqué : trop de tentatives échouées. Votre adresse IP est suspendue pour encore {minutes_restantes} minute(s)."
                }
            )
            # 🟢 INDISPENSABLE : En-têtes CORS pour que le frontend puisse lire le message 403
            if origin:
                response.headers["Access-Control-Allow-Origin"] = origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
            return response
        else:
            del BANNED_IPS_CACHE[client_ip]

    response = await call_next(request)
    return response


def ban_ip(ip: str, reason: str, duration_minutes: int):
    global LAST_BANNED_SYNC
    banned_until = datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)
    BANNED_IPS_CACHE[ip] = banned_until
    LAST_BANNED_SYNC = time.time() # Met à jour le timestamp local

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO banned_ips (ip, reason, banned_until)
            VALUES (:ip, :reason, :until)
            ON CONFLICT (ip) DO UPDATE 
            SET reason = EXCLUDED.reason, banned_until = EXCLUDED.banned_until
        """), {"ip": ip, "reason": reason, "until": banned_until})
    
    logger.info(f"🚫 [FIREWALL] IP BANNIE : {ip} | Raison : {reason} | Jusqu'à : {banned_until}")


MAX_LOGIN_ATTEMPTS = 5  # 5 tentatives autorisées en 10 minutes


def check_and_record_failed_attempt(ip: str) -> tuple[bool, int]:
    """Enregistre l'échec et retourne (est_banni, tentatives_restantes)."""
    now = datetime.now(timezone.utc)
    ten_minutes_ago = now - timedelta(minutes=10)

    with engine.begin() as conn:
        # 1. Enregistrer l'échec
        conn.execute(
            text("INSERT INTO login_failed_attempts (ip, attempted_at) VALUES (:ip, :now)"), 
            {"ip": ip, "now": now}
        )

        # 2. Compter les échecs récents dans les 10 dernières minutes
        count = conn.execute(
            text("SELECT COUNT(*) FROM login_failed_attempts WHERE ip = :ip AND attempted_at > :window"),
            {"ip": ip, "window": ten_minutes_ago}
        ).scalar() or 0

    tentatives_restantes = max(0, MAX_LOGIN_ATTEMPTS - count)

    if count >= MAX_LOGIN_ATTEMPTS:
        ban_ip(ip, f"Force brute détectée ({count} tentatives échouées)", duration_minutes=30)
        return True, 0

    return False, tentatives_restantes


# --- ROUTE PRIVÉE THÉO : VOIR LES IP BANNIES ---
@router.get("/api/security/banned-ips")
def get_banned_ips(admin_user: str = Depends(get_current_admin)):
    with engine.connect() as conn:
        res = conn.execute(text("SELECT ip, reason, banned_until, created_at FROM banned_ips ORDER BY created_at DESC")).fetchall()
        return [dict(r._mapping) for r in res]


@router.delete("/api/security/unban-ip/{ip}")
def unban_ip(ip: str, admin_user: str = Depends(get_current_admin)):
    global LAST_BANNED_SYNC
    BANNED_IPS_CACHE.pop(ip, None)
    LAST_BANNED_SYNC = 0.0
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM banned_ips WHERE ip = :ip"), {"ip": ip})
        conn.execute(text("DELETE FROM login_failed_attempts WHERE ip = :ip"), {"ip": ip})
    return {"status": "success", "message": f"IP {ip} débloquée."}


def check_is_rate_limited(key: str, action: str, max_attempts: int, window_minutes: int) -> bool:
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=window_minutes)

    with engine.begin() as conn:
        # Compte les tentatives récentes dans la fenêtre
        count = conn.execute(
            text("""
                SELECT COUNT(*) FROM security_rate_limits 
                WHERE key = :k AND action = :a AND attempted_at > :ws
            """),
            {"k": key.lower().strip(), "a": action, "ws": window_start}
        ).scalar() or 0

        if count >= max_attempts:
            return True  # Limite dépassée

        # Enregistre cette tentative
        conn.execute(
            text("INSERT INTO security_rate_limits (key, action, attempted_at) VALUES (:k, :a, :now)"),
            {"k": key.lower().strip(), "a": action, "now": now}
        )
        return False
