"""Configuration commune : connexion à la base, client Gemini, mots de passe et authentification."""
import bcrypt
import jwt
import os
import secrets
import socket
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google import genai
from journaux import demarrer_suivi_erreurs, logger
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional


# 1. Patch Hostname
def get_ascii_hostname():
    return "localhost"


socket.gethostname = get_ascii_hostname


load_dotenv()


demarrer_suivi_erreurs()


# 2. Configuration Base de données
# 2. Configuration Base de données optimisée
engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True,        # Vérifie que la connexion est vivante avant de l'utiliser
    pool_recycle=300,          # 5 minutes au lieu de 60s (réduit la latence de reconnexion)
    pool_size=10,              # 10 connexions persistantes au lieu de 5
    max_overflow=20,           # Jusqu'à 30 connexions en pic de charge
    pool_timeout=30,           # Évite les TimeoutError prématurés
    hide_parameters=True,      # Les valeurs des requêtes n'apparaissent jamais dans les erreurs
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10
    }
)


SECRET_KEY = os.getenv("JWT_SECRET_KEY")


if not SECRET_KEY:
    raise RuntimeError("CRITICAL : La variable JWT_SECRET_KEY est manquante dans votre .env !")


ALGORITHM = "HS256"


ACCESS_TOKEN_EXPIRE_DAYS = 7


security = HTTPBearer(auto_error=False)
# Le site garde la session dans ce cookie, que JavaScript ne peut pas lire : une faille XSS ne peut pas voler le jeton.
COOKIE_SESSION = "kleea_session"


def jeton_recu(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> str:
    """Le jeton de la requête : l'en-tête Bearer (Stream Deck, sessions d'avant le cookie) ou le cookie HttpOnly du site."""
    if credentials:
        return credentials.credentials
    jeton = request.cookies.get(COOKIE_SESSION)
    if not jeton:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return jeton


def poser_cookie_session(response: Response, jeton: str) -> None:
    # SameSite=Lax : le site et l'API sont sur le même domaine, un autre site ne peut pas envoyer ce cookie.
    response.set_cookie(COOKIE_SESSION, jeton, max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400, httponly=True, secure=True, samesite="lax", path="/")


def effacer_cookie_session(response: Response) -> None:
    response.delete_cookie(COOKIE_SESSION, path="/", httponly=True, secure=True, samesite="lax")


# 3. Helpers Mots de passe (bcrypt natif)
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return plain_password == hashed_password


# 8. Authentification & Rôles
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# Sessions de connexion. Le jeton porte un identifiant "sid" qui renvoie à une ligne de sessions_connexion.
# Une panne de cette table ne doit enfermer personne dehors : sans table, le jeton est émis sans "sid", comme avant.
SESSION_DECONNECTEE = "Cette session a été déconnectée. Veuillez vous reconnecter."


DELAI_ACTIVITE = timedelta(minutes=5)  # Au plus une écriture par session pendant ce délai.


NAVIGATEURS = (
    ("edg/", "Edge"), ("edge/", "Edge"), ("edgios/", "Edge"), ("opr/", "Opera"), ("opera", "Opera"),
    ("samsungbrowser/", "Samsung Internet"), ("firefox/", "Firefox"), ("fxios/", "Firefox"),
    ("chrome/", "Chrome"), ("crios/", "Chrome"), ("safari/", "Safari"),
)


SYSTEMES = (
    ("iphone", "iPhone"), ("ipad", "iPad"), ("android", "Android"), ("windows", "Windows"),
    ("mac os x", "macOS"), ("macintosh", "macOS"), ("cros", "ChromeOS"), ("linux", "Linux"),
)


def appareil_lisible(user_agent: Optional[str]) -> str:
    """Un nom court pour l'utilisateur. L'en-tête d'origine, plus identifiant, n'est pas conservé."""
    agent = (user_agent or "").lower()
    navigateur = next((nom for motif, nom in NAVIGATEURS if motif in agent), None)
    systeme = next((nom for motif, nom in SYSTEMES if motif in agent), None)
    if navigateur and systeme:
        return f"{navigateur} sur {systeme}"
    return navigateur or systeme or "Appareil inconnu"


def ouvrir_session(utilisateur: str, user_agent: Optional[str]) -> Optional[str]:
    """Renvoie l'identifiant de la nouvelle session, ou None si la table est absente ou inaccessible."""
    identifiant = secrets.token_urlsafe(24)
    maintenant = datetime.now(timezone.utc)
    try:
        with engine.begin() as conn:
            conn.execute(
                text("""
                    INSERT INTO sessions_connexion (id, utilisateur, appareil, cree_le, derniere_activite)
                    VALUES (:id, :u, :a, :t, :t)
                """),
                {"id": identifiant, "u": utilisateur.lower().strip(), "a": appareil_lisible(user_agent), "t": maintenant},
            )
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Session non enregistrée, jeton émis sans identifiant : {type(e).__name__}")
        return None
    return identifiant


def jeton_de_session(data: dict, user_agent: Optional[str]) -> str:
    identifiant = ouvrir_session(data["sub"], user_agent)
    return create_access_token({**data, "sid": identifiant} if identifiant else data)


def en_utc(valeur) -> Optional[datetime]:
    """SQLite renvoie du texte là où Postgres renvoie une date."""
    if isinstance(valeur, str):
        valeur = datetime.fromisoformat(valeur)
    if valeur is None:
        return None
    return valeur if valeur.tzinfo else valeur.replace(tzinfo=timezone.utc)


def verifier_session(identifiant: str, utilisateur: str) -> None:
    """Refuse une session révoquée ou inconnue, et note l'activité sans écrire à chaque requête."""
    try:
        with engine.connect() as conn:
            ligne = conn.execute(
                text("SELECT utilisateur, derniere_activite, revoquee_le FROM sessions_connexion WHERE id = :id"),
                {"id": identifiant},
            ).first()
    except SQLAlchemyError as e:
        # La route elle-même a besoin de la même base : refuser ici déconnecterait tout le monde à la moindre panne.
        logger.warning(f"⚠️ Vérification de session impossible : {type(e).__name__}")
        return
    if ligne is None or ligne.utilisateur != utilisateur or ligne.revoquee_le is not None:
        raise HTTPException(status_code=401, detail=SESSION_DECONNECTEE)

    maintenant = datetime.now(timezone.utc)
    seuil = maintenant - DELAI_ACTIVITE
    if en_utc(ligne.derniere_activite) >= seuil:
        return
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE sessions_connexion SET derniere_activite = :t WHERE id = :id AND derniere_activite < :seuil"),
                {"t": maintenant, "id": identifiant, "seuil": seuil},
            )
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Dernière activité non enregistrée : {type(e).__name__}")


def purger_sessions_expirees() -> None:
    """Au-delà de la durée du jeton, la ligne ne sert plus : le jeton est refusé de toute façon."""
    limite = datetime.now(timezone.utc) - timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS + 1)
    try:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM sessions_connexion WHERE cree_le < :limite"), {"limite": limite})
    except SQLAlchemyError as e:
        logger.warning(f"⚠️ Purge des sessions impossible : {type(e).__name__}")


def session_actuelle(jeton: str = Depends(jeton_recu)) -> Optional[str]:
    """L'identifiant de session du jeton, None pour un jeton émis sans identifiant. À utiliser avec get_current_user."""
    try:
        return jwt.decode(jeton, SECRET_KEY, algorithms=[ALGORITHM]).get("sid")
    except jwt.PyJWTError:
        return None


def get_current_user(token: str = Depends(jeton_recu)) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token invalide")
        utilisateur = username.lower().strip()
        # Les jetons émis sans identifiant restent acceptés jusqu'à leur expiration.
        identifiant = payload.get("sid")
        if identifiant:
            verifier_session(identifiant, utilisateur)
        return utilisateur
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée, veuillez vous reconnecter")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Accès non autorisé")


def get_current_admin(current_user: str = Depends(get_current_user)) -> str:
    with engine.connect() as conn:
        role = conn.execute(
            text("SELECT role FROM users WHERE LOWER(username) = :u"),
            {"u": current_user}
        ).scalar()
        if role != "admin":
            raise HTTPException(status_code=403, detail="Accès réservé aux administrateurs")
    return current_user


# 1. Initialisation du client Gemini (pense à bien définir GEMINI_API_KEY dans tes variables d'environnement)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
