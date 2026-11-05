"""Configuration commune : connexion à la base, client Gemini, mots de passe et authentification."""
import bcrypt
import jwt
import os
import socket
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google import genai
from journaux import demarrer_suivi_erreurs
from sqlalchemy import create_engine, text


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


security = HTTPBearer()


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


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token invalide")
        return username.lower().strip()
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
