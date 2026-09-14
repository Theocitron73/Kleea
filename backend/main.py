from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
import pandas as pd
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from typing import List, Any # 💡 Importez "Any" depuis typing
import io
from fastapi import UploadFile, File
from passlib.context import CryptContext
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
import secrets
import socket
from datetime import date
from fpdf import FPDF
from fastapi import Response
import uuid
import resend
import re
import unicodedata
import json
from google import genai
from google.genai import types
from urllib.parse import unquote
from datetime import datetime, timezone, timedelta  # <-- Assure-toi d'importer timezone
from sqlalchemy import text
import httpx
import requests
from urllib.parse import quote
from fastapi import APIRouter
import traceback
import calendar
from fastapi import BackgroundTasks
from cryptography.fernet import Fernet
#print(Fernet.generate_key().decode())

def get_ascii_hostname():
    return "localhost"

socket.gethostname = get_ascii_hostname

load_dotenv()
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",    # Pour tes tests locaux
     os.getenv("DOMAINE_DEFAULT"),        # Ton URL Vercel
     os.getenv("SOUS_DOMAINE_URL"),
]

# LE BLOC INDISPENSABLE :
# 3. Activation du Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,             # Autorise ces domaines
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


conf = ConnectionConfig(
    MAIL_USERNAME = "theolebarbier50@gmail.com",
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"), # <--- Ton code de 16 caractères ici
    MAIL_FROM = "theolebarbier50@gmail.com",
    MAIL_PORT = 465,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_FROM_NAME = "Kleea", # Toujours garder sans accent
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True,  # INDISPENSABLE pour Neon (réveille la DB si besoin)
    pool_recycle=60,     # On recycle toutes les 60s pour éviter la déconnexion SSL
    pool_size=5,         # Neon supporte beaucoup de connexions, mais reste léger
    max_overflow=10,
    connect_args={
        "sslmode": "require",
        "connect_timeout": 10 # Donne un peu de temps à Neon pour sortir de veille
    }
)

@app.get("/")
def read_root():
    return {"status": "L'API de finances est en ligne"}

@app.get("/transactions/{username}")
def get_transactions(username: str):
    u_lower = username.lower()
    query = text("""
        SELECT id, date, nom, montant, categorie, utilisateur, mois, année, compte, enveloppe, prevision_id 
        FROM transactions 
        WHERE LOWER(utilisateur) = :u
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": u_lower})
            columns = result.keys()
            records = [dict(zip(columns, row)) for row in result.fetchall()]
            for record in records:
                if record.get('date') and not isinstance(record['date'], str):
                    record['date'] = record['date'].strftime('%Y-%m-%d')
            return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Base de données: {str(e)}")


class Transaction(BaseModel):
    nom: str
    montant: float
    categorie: str
    utilisateur: str
    mois: str
    annee: int
    compte: str
    id: Optional[int] = None
    date: Optional[str] = None
    enveloppe: Optional[str] = None
    prevision_id: Optional[int] = None  # 👈 AJOUT ICI

@app.post("/transactions")
def add_transaction(t: Transaction):
    # L'ordre SQL est crucial : INSERT -> ON CONFLICT -> RETURNING
    query = text("""
        INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, année, compte) 
        VALUES (:d, :n, :m, :c, :u, :mo, :a, :co)
        ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING
        RETURNING id
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {
                "n": t.nom, 
                "m": t.montant, 
                "c": t.categorie, 
                "u": t.utilisateur.lower(),
                "mo": t.mois,
                "a": t.annee,
                "co": t.compte,
                "d": t.date
            })
            
            # On récupère la ligne retournée
            row = result.fetchone()
            conn.commit()
            
            if row:
                # Cas 1 : Nouvelle insertion réussie
                new_id = row[0]
                return {**t.dict(), "id": new_id, "status": "success"}
            else:
                # Cas 2 : La transaction existe déjà (ON CONFLICT a agi)
                # On renvoie un status spécial pour informer le frontend
                return {**t.dict(), "status": "ignored", "message": "Doublon détecté"}
            
    except Exception as e:
        print(f"Erreur SQL: {e}")
        return {"status": "error", "message": str(e)}


# 2. Mets à jour la route d'UPDATE pour inclure l'enveloppe
@app.put("/transactions/{t_id}")
def update_transaction(t_id: int, t: Transaction):
    query = text("""
        UPDATE transactions 
        SET nom=:n, montant=:m, categorie=:c, mois=:mo, année=:a, compte=:co, enveloppe=:env, prevision_id=:prev_id 
        WHERE id=:id AND utilisateur=:u
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "n": t.nom, "m": t.montant, "c": t.categorie, 
                "mo": t.mois, "a": t.annee, "co": t.compte,
                "env": t.enveloppe, 
                "prev_id": t.prevision_id,  # 👈 AJOUT ICI
                "id": t_id, "u": t.utilisateur.lower()
            })
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Erreur SQL: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    

@app.delete("/transactions/batch")
def delete_transactions(ids: List[int]):
    """Supprime plusieurs transactions par leurs IDs"""
    if not ids:
        return {"status": "error", "message": "Aucun ID fourni"}
        
    query = text("DELETE FROM transactions WHERE id IN :id_list")
    
    try:
        with engine.connect() as conn:
            # SQLAlchemy attend un tuple pour le IN
            conn.execute(query, {"id_list": tuple(ids)})
            conn.commit()
        return {"status": "success", "deleted_count": len(ids)}
    except Exception as e:
        print(f"Erreur SQL suppression: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/transactions/stats/count/{username}")
def get_user_transactions_count(username: str):
    """Renvoie le nombre total de transactions associées à un utilisateur précis"""
    query = text("SELECT COUNT(*) FROM transactions WHERE LOWER(utilisateur) = :u")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": username.lower()}).scalar()
            return {
                "username": username,
                "user_transactions_count": result
            }
    except Exception as e:
        print(f"Erreur lors du calcul de la stat pour {username}: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur BDD: {str(e)}")



class LoginRequest(BaseModel):
    nom: str
    password: str

class RegisterRequest(BaseModel):
    nom: str        # Sera utilisé pour 'username'
    email: str
    password: str
    first_name: str
    last_name: str

@app.post("/register")
def register(req: RegisterRequest):
    hashed_password = pwd_context.hash(req.password)
    
    # ON FUSIONNE LE PRÉNOM ET LE NOM
    full_name = f"{req.first_name} {req.last_name}".strip()
    
    with engine.connect() as conn:
        # Vérification si pseudo ou email existe déjà
        check_query = text("SELECT username FROM users WHERE username = :nom OR email = :email")
        existing = conn.execute(check_query, {"nom": req.nom, "email": req.email}).fetchone()
        
        if existing:
            raise HTTPException(status_code=400, detail="Identifiant ou email déjà utilisé")
        
        # INSERTION DANS LA COLONNE 'name'
        insert_query = text("""
            INSERT INTO users (username, email, password, name) 
            VALUES (:username, :email, :password, :name)
        """)
        
        conn.execute(insert_query, {
            "username": req.nom,
            "email": req.email,
            "password": hashed_password,
            "name": full_name  # <--- Ici on envoie la version fusionnée
        })
        conn.commit()
        
    return {"status": "success", "message": "Bienvenue chez Kleea"}
# --- ROUTE : CONNEXION (LOGIN) ---
@app.post("/login")
def login(req: LoginRequest):
    # La clé est ici : on cherche si 'nom' matche avec username OR email
    query = text("""
        SELECT username, password 
        FROM users 
        WHERE username = :identifiant OR email = :identifiant
    """)
    
    with engine.connect() as conn:
        # On passe req.nom aux deux paramètres via le même dictionnaire
        result = conn.execute(query, {"identifiant": req.nom}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Utilisateur ou email inconnu")
        
        db_username, db_hashed_password = result
        
        # Vérification du mot de passe
        try:
            is_valid = pwd_context.verify(req.password, db_hashed_password)
        except Exception:
            is_valid = (req.password == db_hashed_password)

        if not is_valid:
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
            
        # On renvoie toujours le db_username pour le frontend, 
        # peu importe comment l'utilisateur s'est connecté
        return {"status": "success", "user": db_username}


# Modèle pour la mise à jour du mode d'import
class ImportModeRequest(BaseModel):
    import_mode: str  # 'auto' ou 'manual'

# Modifier le endpoint de profil existant pour retourner le mode d'import
@app.get("/profile/{username}")
def get_profile(username: str):
    query = text("""
        SELECT username, email, name, import_mode 
        FROM users 
        WHERE LOWER(username) = LOWER(:username)
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"username": username}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        db_username, db_email, db_name, db_mode = result
        return {
            "username": db_username,
            "email": db_email,
            "name": db_name if db_name else db_username,
            "import_mode": db_mode if db_mode else "manual"
        }

# Endpoint pour changer le mode d'importation
@app.put("/profile/{username}/import-mode")
def update_import_mode(username: str, req: ImportModeRequest):
    if req.import_mode not in ["auto", "manual"]:
        raise HTTPException(status_code=400, detail="Mode invalide")
        
    query = text("""
        UPDATE users 
        SET import_mode = :mode 
        WHERE LOWER(username) = LOWER(:username)
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"mode": req.import_mode, "username": username.lower()})
            conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        return {"status": "success", "import_mode": req.import_mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ResetRequest(BaseModel):
    email: EmailStr

@app.post("/forgot-password")
async def forgot_password(req: ResetRequest):
    # Réponse générique constante pour éviter l'énumération d'e-mails (sécurité)
    response_msg = {"message": "Si cet email est associé à un compte, vous recevrez un lien sous peu."}
    
    # 1. On ouvre une transaction unique pour chercher et mettre à jour le token
    with engine.begin() as conn:
        # Vérifier si l'utilisateur existe
        query = text("SELECT username FROM users WHERE email = :email")
        user = conn.execute(query, {"email": req.email}).fetchone()
        
        if not user:
            return response_msg
            
        # 2. Générer le token unique
        token = secrets.token_urlsafe(32)
        
        # 3. Sauvegarder le token en base (dans la même transaction)
        update_query = text("UPDATE users SET reset_token = :t WHERE email = :e")
        conn.execute(update_query, {"t": token, "e": req.email})

    # 4. Préparer le lien (Dynamique selon l'environnement)
    # Configurez FRONTEND_URL=https://kleea.theolebarbier.fr dans vos variables d'environnement sur Render !
    frontend_url = os.getenv("SOUS_DOMAINE_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    resend.api_key = os.getenv("RESEND_API_KEY")

    # 5. Envoyer le mail via l'API Resend
    try:
        html_content = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #10b981;">Réinitialisation demandée</h2>
                <p>Bonjour,</p>
                <p>Pour changer votre mot de passe Kleea, cliquez sur le bouton ci-dessous :</p>
                <div style="margin: 24px 0;">
                    <a href="{reset_link}" 
                       style="background-color: #ffffff; color: #000000; padding: 12px 24px; 
                              text-decoration: none; border-radius: 8px; font-weight: bold; 
                              display: inline-block; border: 1px solid #e5e7eb;">
                       Changer mon mot de passe
                    </a>
                </div>
                <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                    Si vous n'avez pas demandé ce changement, ignorez ce mail.
                </p>
            </body>
        </html>
        """

        # Envoi via l'API Resend
        resend.Emails.send({
            "from": "Kleea <noreply@theolebarbier.fr>", 
            "to": [req.email],
            "subject": "Kleea - Récupération de votre accès",
            "html": html_content
        })

    except Exception as e:
        # On log l'erreur mais on ne bloque pas l'UI
        print(f"ERREUR RESEND : {str(e)}")
    
    return response_msg


class NewPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/reset-password-confirm")
async def reset_password_confirm(req: NewPasswordRequest):
    hashed_password = pwd_context.hash(req.new_password)
    
    # On utilise engine.begin() pour s'assurer que le UPDATE est bien commit et fermé
    with engine.begin() as conn:
        # On met à jour le mot de passe ET on vide le reset_token pour qu'il ne serve qu'une fois !
        query = text("""
            UPDATE users 
            SET password = :pwd, reset_token = NULL 
            WHERE reset_token = :token
        """)
        result = conn.execute(query, {"pwd": hashed_password, "token": req.token})
        
        if result.rowcount == 0:
            raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
            
    return {"status": "success", "message": "Mot de passe mis à jour !"}




class UpdatePasswordRequest(BaseModel):
    new_password: str

# --- ROUTE : CHANGER LE MOT DE PASSE ---
@app.put("/profile/{username}/password")
def update_password(username: str, req: UpdatePasswordRequest):
    # 1. On hache le nouveau mot de passe
    hashed_password = pwd_context.hash(req.new_password)
    
    with engine.connect() as conn:
        # 2. On vérifie d'abord si l'utilisateur existe (insensible à la casse)
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": username}).fetchone()
        
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        # 3. Mise à jour du mot de passe
        update_query = text("""
            UPDATE users 
            SET password = :password 
            WHERE LOWER(username) = LOWER(:username)
        """)
        
        conn.execute(update_query, {
            "password": hashed_password,
            "username": username
        })
        conn.commit()
        
    return {"status": "success", "message": "Mot de passe mis à jour avec succès"}


# --- ROUTE : SUPPRIMER DÉFINITIVEMENT LE COMPTE ---
@app.delete("/profile/{username}")
def delete_account(username: str):
    with engine.connect() as conn:
        # 1. On vérifie d'abord si l'utilisateur existe (insensible à la casse)
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": username}).fetchone()
        
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        # 2. Suppression de l'utilisateur (Les cascades en BDD nettoieront le reste)
        delete_query = text("DELETE FROM users WHERE LOWER(username) = LOWER(:username)")
        conn.execute(delete_query, {"username": username})
        conn.commit()
        
    return {"status": "success", "message": "Compte et données associés détruits définitivement"}


# Modèle pour la mise à jour des infos personnelles
class UpdateProfileRequest(BaseModel):
    name: str
    email: str

# --- ROUTE : MODIFIER LES INFOS PERSONNELLES ---
@app.put("/profile/{username}/details")
def update_profile_details(username: str, req: UpdateProfileRequest):
    with engine.connect() as conn:
        # 1. Vérifier si l'utilisateur existe
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": username}).fetchone()
        
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        # 2. Mettre à jour le nom et l'email
        update_query = text("""
            UPDATE users 
            SET name = :name, email = :email 
            WHERE LOWER(username) = LOWER(:username)
        """)
        conn.execute(update_query, {
            "name": req.name,
            "email": req.email,
            "username": username
        })
        conn.commit()
        
    return {"status": "success", "message": "Profil mis à jour avec succès"}


# 💡 1. AJOUT DE TAUX DANS LE MODÈLE PYDANTIC
class CompteConfig(BaseModel):
    compte: str
    groupe: str
    solde: float
    objectif: float
    couleur: str
    utilisateur: str
    taux: float = 0.0  # Optionnel par défaut à 0.0 si absent
    powens_name: Optional[str] = None


@app.get("/config-comptes/{username}")
def get_config_comptes(username: str):
    u_clean = username.strip().lower()
    query = text("SELECT * FROM configuration WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        result = conn.execute(query, {"u": u_clean})
        comptes = [dict(row._mapping) for row in result]
        for c in comptes:
            if c.get("powens_name"):
                c["powens_name"] = decrypt_iban(c["powens_name"])
    return comptes


# 🟢 CRÉATION : Chiffre l'IBAN avant insertion en base
@app.post("/config-comptes")
def add_compte(c: CompteConfig):
    encrypted_link = encrypt_iban(c.powens_name) if c.powens_name else None
    query = text("""
        INSERT INTO configuration (compte, groupe, solde, objectif, couleur, utilisateur, taux, powens_name) 
        VALUES (:c, :g, :s, :o, :col, :u, :t, :p)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "c": c.compte, "g": c.groupe, "s": c.solde, 
            "o": c.objectif, "col": c.couleur, "u": c.utilisateur.lower(),
            "t": c.taux, "p": encrypted_link
        })
        conn.commit()
    return {"status": "success"}


# 🟢 MODIFICATION : Chiffre l'IBAN lors de la mise à jour (onBlur dans Kleea)
@app.put("/config-comptes/{compte_name}")
def update_compte(compte_name: str, c: CompteConfig):
    name_clean = compte_name.strip()
    encrypted_link = encrypt_iban(c.powens_name) if c.powens_name else None
    query = text("""
        UPDATE configuration 
        SET groupe = :g, solde = :s, objectif = :o, couleur = :col, taux = :t, powens_name = :p
        WHERE compte = :c AND LOWER(utilisateur) = :u
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {
            "g": c.groupe, "s": c.solde, "o": c.objectif, "col": c.couleur, "t": c.taux,
            "p": encrypted_link,
            "c": name_clean, "u": c.utilisateur.lower()
        })
        conn.commit()
    return {"status": "updated", "rows_affected": result.rowcount}

@app.delete("/config-comptes/{compte_name}/{username}")
def delete_compte(compte_name: str, username: str):
    query = text("DELETE FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        conn.execute(query, {"c": compte_name, "u": username.lower()})
        conn.commit()
    return {"status": "deleted"}
# Dans main.py

class ThemeConfig(BaseModel):
    utilisateur: str
    bg_site: str
    primary_color: str
    text_main: str
    radius: str
    glass_blur: str  # <-- AJOUT
    glass_bg: str    # <-- AJOUT

@app.get("/get-theme/{username}")
def get_theme(username: str):
    query = text("SELECT * FROM user_theme WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username.lower()}).fetchone()
        if res:
            return dict(res._mapping)
        return None

@app.post("/save-theme")
def save_theme(t: ThemeConfig):
    # Ajout des deux nouvelles colonnes dans l'INSERT et le SET du ON CONFLICT
    query = text("""
        INSERT INTO user_theme (utilisateur, bg_site, primary_color, text_main, radius, glass_blur, glass_bg)
        VALUES (:u, :bg, :p, :tm, :r, :gb, :gg)
        ON CONFLICT (utilisateur) DO UPDATE 
        SET bg_site = :bg, primary_color = :p, text_main = :tm, radius = :r, glass_blur = :gb, glass_bg = :gg
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": t.utilisateur.lower(), 
            "bg": t.bg_site, 
            "p": t.primary_color, 
            "tm": t.text_main, 
            "r": t.radius,
            "gb": t.glass_blur,  # <-- AJOUT
            "gg": t.glass_bg     # <-- AJOUT
        })
        conn.commit()
    return {"status": "success"}



@app.get("/note/{username}")
def get_note(username: str):
    query = text("SELECT texte FROM notes WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username.lower()}).fetchone()
    return {"texte": res[0] if res else ""}

@app.post("/note")
def save_note(data: dict):
    # On utilise un "INSERT OR REPLACE" ou un DELETE/INSERT pour n'avoir qu'une note
    u = data['utilisateur'].lower()
    t = data['texte']
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM notes WHERE utilisateur = :u"), {"u": u})
        conn.execute(text("INSERT INTO notes (utilisateur, texte) VALUES (:u, :t)"), {"u": u, "t": t})
        conn.commit()
    return {"status": "success"}

@app.get("/dashboard/periodes/{username}")
def get_periodes(username: str):
    # On sélectionne directement tes colonnes existantes
    query = text("""
        SELECT DISTINCT 
            année as annee, 
            mois 
        FROM transactions 
        WHERE LOWER(utilisateur) = :u
        ORDER BY année DESC
    """)
    with engine.connect() as conn:
        # On utilise pandas pour lire le résultat
        df = pd.read_sql(query, conn, params={"u": username.lower()})
    
    # On transforme le DataFrame en liste de dictionnaires
    return df.to_dict(orient="records")


@app.get("/get-user-theme/{username}")
def get_user_theme(username: str):
    try:
        u_lower = username.lower().strip()
        # Teste cette requête. Si elle crash, regarde ton terminal Python !
        # Note : On utilise des guillemets doubles pour les noms de colonnes sensibles
        query = text('SELECT element, "couleur" FROM theme WHERE LOWER("user") = :u')
        
        with engine.connect() as conn:
            result = conn.execute(query, {"u": u_lower})
            rows = result.mappings().all()
            
            data = {row['element']: row['couleur'] for row in rows}
            print(f"✅ Succès pour {username}: {data}") # Apparaîtra dans ton terminal
            return data
            
    except Exception as e:
        print(f"❌ ERREUR SQL : {e}") # L'erreur exacte s'affichera ici !
        # On renvoie un dico vide pour éviter l'erreur 500 et le blocage CORS
        return {}
    

class UserColorUpdate(BaseModel):
    user: str
    element: str
    couleur: str

@app.post("/save-user-theme")
def save_user_theme(c: UserColorUpdate):
    # Cette requête met à jour la couleur si le couple (user, element) existe déjà
    # Sinon, elle l'insère.
    query = text("""
        INSERT INTO theme ("user", element, "Couleur")
        VALUES (:u, :e, :c)
        ON CONFLICT ("user", element) DO UPDATE 
        SET "Couleur" = :c
    """)
    with engine.connect() as conn:
        conn.execute(query, {"u": c.user.lower(), "e": c.element, "c": c.couleur})
        conn.commit()
    return {"status": "success"}




class Projet(BaseModel):
    utilisateur: str
    profil: str
    nom: str
    cout: float
    date: str  # Date d'échéance / cible (Format "YYYY-MM-DD")
    capa: float
    date_debut: Optional[str] = None  # Format "YYYY-MM-DD" (ou "YYYY-MM")
    utiliser_capa_stricte: Optional[bool] = False

@app.get("/get-projets/{profil}")
def get_projets(profil: str):
    query = text("SELECT * FROM projets WHERE LOWER(profil) = :p ORDER BY date ASC")
    with engine.connect() as conn:
        res = conn.execute(query, {"p": profil.lower()}).mappings().all()
        return [dict(r) for r in res]

@app.post("/save-projet")
def save_projet(p: Projet):
    date_start = p.date_debut if p.date_debut else str(date.today())

    query = text("""
        INSERT INTO projets (utilisateur, profil, nom, cout, date, capa, date_debut, utiliser_capa_stricte)
        VALUES (:u, :pr, :n, :co, :d, :ca, :dd, :ucs)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": p.utilisateur.lower(), 
            "pr": p.profil, 
            "n": p.nom, 
            "co": p.cout, 
            "d": p.date, 
            "ca": p.capa,
            "dd": date_start,
            "ucs": p.utiliser_capa_stricte or False  # 👈 Paramètre envoyé
        })
        conn.commit()
    return {"status": "success"}


@app.post("/update-projet")
def update_projet(p: Projet, old_name: str):
    query = text("""
        UPDATE projets 
        SET nom = :new_n, cout = :co, date = :d, capa = :ca, date_debut = :dd, utiliser_capa_stricte = :ucs
        WHERE nom = :old_n AND profil = :pr AND LOWER(utilisateur) = :u
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": p.utilisateur.lower(), 
            "pr": p.profil, 
            "new_n": p.nom,
            "old_n": old_name,
            "co": p.cout, 
            "d": p.date, 
            "ca": p.capa,
            "dd": p.date_debut,
            "ucs": p.utiliser_capa_stricte or False  # 👈 Paramètre envoyé
        })
        conn.commit()
    return {"status": "success"}

@app.delete("/delete-projet/{nom}/{profil}")
def delete_projet(nom: str, profil: str):
    query = text("DELETE FROM projets WHERE nom = :n AND profil = :p")
    with engine.connect() as conn:
        conn.execute(query, {"n": nom, "p": profil})
        conn.commit()
    return {"status": "deleted"}



class Budget(BaseModel):
    utilisateur: str
    mois: str
    annee: int = Field(default_factory=lambda: date.today().year) # Détecte l'année actuelle par défaut (ex: 2026)
    compte: str
    type: str = "Categorie"
    nom: str
    somme: float


@app.get("/get-budgets/{utilisateur}")
@app.get("/get-budgets/{utilisateur}/{mois}")
def get_budgets(utilisateur: str, mois: Optional[str] = None):
    # Si 'mois' est fourni, on filtre par mois ET par année en cours
    if mois:
        query = text("""
            SELECT * FROM budgets 
            WHERE LOWER(utilisateur) = :u AND mois = :m AND "annee" = :a
        """)
        params = {
            "u": utilisateur.lower(), 
            "m": mois, 
            "a": date.today().year  # Filtre par défaut sur l'année en cours
        }
    else:
        query = text("""
            SELECT * FROM budgets 
            WHERE LOWER(utilisateur) = :u
            ORDER BY "annee" DESC, mois DESC
        """)
        params = {"u": utilisateur.lower()}

    with engine.connect() as conn:
        res = conn.execute(query, params).mappings().all()
        return [dict(r) for r in res]


@app.post("/save-budget")
def save_budget(b: Budget):
    
    query = text("""
        INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme)
        VALUES (:u, :m, :a, :c, :t, :n, :s)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": b.utilisateur.lower(),
            "m": b.mois,
            "a": b.annee, # Utilise l'année détectée ou reçue
            "c": b.compte,
            "t": b.type,
            "n": b.nom,
            "s": b.somme
        })
        conn.commit()
    return {"status": "success"}


@app.post("/update-budget")
def update_budget(b: Budget, old_name: str):
    #   SÉCURISATION : On filtre aussi par année pour l'UPDATE
    query = text("""
        UPDATE budgets 
        SET nom = :new_n, somme = :s, compte = :c
        WHERE nom = :old_n AND utilisateur = :u AND mois = :m AND annee = :a
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": b.utilisateur.lower(),
            "m": b.mois,
            "a": b.annee,
            "new_n": b.nom,
            "old_n": old_name,
            "s": b.somme,
            "c": b.compte
        })
        conn.commit()
    return {"status": "success"}


#   AJOUT DE L'ANNÉE DANS L'URL POUR LE DELETE
@app.delete("/delete-budget/{nom}/{utilisateur}/{mois}/{annee}")
def delete_budget(nom: str, utilisateur: str, mois: str, annee: int):
    query = text("""
        DELETE FROM budgets 
        WHERE nom = :n AND utilisateur = :u AND mois = :m AND annee = :a
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "n": nom, 
            "u": utilisateur.lower(), 
            "m": mois,
            "a": annee
        })
        conn.commit()
    return {"status": "deleted"}

class CategorieCreate(BaseModel):
    nom: str
    utilisateur: str

# Constante globale : une seule source de vérité côté serveur
# Constante globale : Base des catégories d'origine sans les virements câblés en dur
CATEGORIES_DEFAUT = [
    "💰 Salaire", "🏥 Remboursements", "🤝 Virements Reçus", "👫 Compte Commun",
    "📱 Abonnements", "🛒 Alimentation", "🛍️ Shopping", "👕 Habillement", 
    "⚖️ Impôts", "🏦 Frais Bancaires", "🏠 Assurance Habitation", "🎮 Jeux vidéos",
    "🩺 Mutuelle", "💊 Pharmacie", "👨‍⚕️ Médecin/Santé", "🔑 Loyer", 
    "🔨 Bricolage", "🚌 Transports", "⛽ Carburant", "🚗 Auto", 
    "💸 Virements envoyé", "🏧 Retraits", "🌐 Internet", 
    "❓ Autre" # 💡 Les virements dynamiques seront insérés juste avant "Autre"
]

@app.get("/api/categories/{user}")
def get_categories(user: str):
    try:
        user_clean = user.strip().lower()
        
        with engine.connect() as conn:
            # 1. Récupération des catégories personnalisées
            query_perso = text("SELECT nom FROM categories WHERE LOWER(utilisateur) = :u")
            result_perso = conn.execute(query_perso, {"u": user_clean}).fetchall()
            categories_perso = [row[0] for row in result_perso]
            
            # 2. Récupération de la liste des comptes pour les virements
            query_comptes = text("SELECT compte FROM configuration WHERE LOWER(utilisateur) = :u")
            result_comptes = conn.execute(query_comptes, {"u": user_clean}).fetchall()
            comptes_noms = [row[0] for row in result_comptes]
        
        # 3. Détecter les types de comptes uniques présents (ex: "CCP", "LIVRET A", etc.)
        types_detectes = set()
        types_possibles = ["CCP", "LIVRET A", "LEP", "LDDS", "PEL", "AUTRE"]
        
        for nom in comptes_noms:
            # Extraction du préfixe si le séparateur " - " est présent
            if " - " in nom:
                prefix = nom.split(" - ")[0].strip().upper()
                if prefix in types_possibles:
                    types_detectes.add(prefix)
                    continue
            
            # Recherche du mot-clé de secours si aucun séparateur n'est présent
            nom_upper = nom.upper()
            for t in types_possibles:
                if t in nom_upper:
                    types_detectes.add(t)
                    break

        # 4. Générer les permutations de transferts bidirectionnels entre les types détectés
        virements_dynamiques = []
        liste_types = sorted(list(types_detectes))
        
        for i in range(len(liste_types)):
            for j in range(i + 1, len(liste_types)):
                t1 = liste_types[i]
                t2 = liste_types[j]
                virements_dynamiques.append(f"🔄 Virement : {t1} vers {t2}")
                virements_dynamiques.append(f"🔄 Virement : {t2} vers {t1}")

        # 5. On retire les virements statiques si jamais il en reste dans CATEGORIES_DEFAUT
        base_categories = [c for c in CATEGORIES_DEFAUT if not c.startswith("🔄 Virement")]
        
        # Insérer les virements dynamiques juste avant "❓ Autre"
        if "❓ Autre" in base_categories:
            idx = base_categories.index("❓ Autre")
            defaults_finales = base_categories[:idx] + virements_dynamiques + base_categories[idx:]
        else:
            defaults_finales = base_categories + virements_dynamiques
        
        # On renvoie le dictionnaire structuré mis à jour
        return {
            "defaults": sorted(defaults_finales),
            "perso": sorted(categories_perso),
            "all": sorted(list(set(defaults_finales + categories_perso)))
        }
        
    except Exception as e:
        print(f"Erreur SQL: {e}")
        # En cas d'erreur, on se replie proprement sur CATEGORIES_DEFAUT sans virement dynamique
        base_categories_fallback = [c for c in CATEGORIES_DEFAUT if not c.startswith("🔄 Virement")]
        return {
            "defaults": sorted(base_categories_fallback),
            "perso": [],
            "all": sorted(base_categories_fallback)
        }
    


# AJOUTER une catégorie
@app.post("/api/categories")
def add_category(cat: CategorieCreate):
    query = text("INSERT INTO categories (nom, utilisateur) VALUES (:n, :u)")
    try:
        with engine.connect() as conn:
            conn.execute(query, {"n": cat.nom, "u": cat.utilisateur})
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.delete("/api/categories/{user}/{nom}")
def delete_category(user: str, nom: str):
    # unquote permet de transformer "🍕%20Resto" en "🍕 Resto" proprement
    nom_decode = unquote(nom)
    
    print(f"--- Tentative de suppression : '{nom_decode}' pour {user} ---")
    
    query = text("DELETE FROM categories WHERE utilisateur = :u AND nom = :n")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": user, "n": nom_decode})
            conn.commit()
            
            # rowcount dit combien de lignes ont été supprimées
            if result.rowcount == 0:
                print("❌ Aucune correspondance trouvée en base.")
                return {"status": "not_found", "message": "Catégorie non trouvée"}
            
            print("✅ Suppression réussie en base.")
            return {"status": "success"}
            
    except Exception as e:
        print(f"🔥 Erreur SQL : {e}")
        return {"status": "error", "message": str(e)}
    


class Memoire(BaseModel):
    nom: str
    categorie: str
    utilisateur: str

@app.post("/memoire")
def add_to_memory(m: dict): # Ou utilise un modèle Pydantic
    query = text("""
        INSERT INTO memoire (utilisateur, nom, categorie)
        VALUES (:u, :n, :c)
        ON CONFLICT (utilisateur, nom) 
        DO UPDATE SET categorie = EXCLUDED.categorie
    """)
    with engine.connect() as conn:
        conn.execute(query, {"u": m['utilisateur'], "n": m['nom'], "c": m['categorie']})
        conn.commit()
    return {"status": "success"}

@app.get("/memoire/{username}")
def get_memoire(username: str):
    # On récupère les noms et catégories, triés par longueur de nom décroissante
    # (pour que "UBER EATS" soit testé avant "UBER")
    query = text("""
        SELECT nom, categorie FROM memoire 
        WHERE utilisateur = :u 
        ORDER BY LENGTH(nom) DESC
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"u": username.lower()}).fetchall()
        # On renvoie une liste de règles
        return [{"nom": row[0], "categorie": row[1]} for row in result]



@app.delete("/memoire/{username}/{nom}")
def delete_from_memory(username: str, nom: str):
    query = text("""
        DELETE FROM memoire 
        WHERE LOWER(utilisateur) = :u AND LOWER(nom) = :n
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"u": username.lower(), "n": nom.lower()})
        conn.commit()
        
    return {"status": "success", "message": "Élément supprimé de la mémoire"}


# --- Récupérer les catégories masquées ---
@app.get("/api/categories_masquees/{user}")
def get_masked_categories(user: str):
    query = text("SELECT nom FROM categories_masquees WHERE utilisateur = :u")
    with engine.connect() as conn:
        result = conn.execute(query, {"u": user}).fetchall()
        return [row[0] for row in result]

# --- Sauvegarder les préférences ---
@app.post("/api/categories_masquees/{user}")
def save_masked_categories(user: str, categories: list[str]):
    try:
        with engine.begin() as conn:
            # On vide l'existant pour cet utilisateur
            conn.execute(
                text("DELETE FROM categories_masquees WHERE utilisateur = :u"), {"u": user}
            )
            # On insère les nouvelles
            for cat in categories:
                conn.execute(
                    text("INSERT INTO categories_masquees (nom, utilisateur) VALUES (:n, :u)"),
                    {"n": cat, "u": user}
                )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))





@app.post("/import-csv")
async def import_csv(utilisateur: str, compte: str = None, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            decoded = contents.decode('utf-8')
        except:
            decoded = contents.decode('latin-1')
            
        lines = [l.strip() for l in decoded.splitlines() if l.strip()]
        if not lines:
            return []
        
        # --- 1. DÉTECTION DU FORMAT ---
        is_revolut = "Date de début" in lines[0] or "Type,Produit" in lines[0]
        separator = ',' if is_revolut else ';'
        
        start_line = 0
        for i, line in enumerate(lines[:20]):
            l = line.lower()
            if (any(k in l for k in ['date', 'le ']) and 
                any(k in l for k in ['libell', 'montant', 'débit', 'crédit', 'description'])):
                start_line = i
                break
        
        # --- 2. CHARGEMENT DU CSV ---
        csv_data = "\n".join(lines[start_line:])
        df = pd.read_csv(io.StringIO(csv_data), sep=separator, engine='python', on_bad_lines='skip')
        df.columns = [c.strip().lower() for c in df.columns]

        # --- 3. IDENTIFICATION DES COLONNES ---
        col_date = next((c for c in df.columns if any(k in c for k in ['date de début', 'start date', 'date operation', 'date'])), None)
        col_nom = next((c for c in df.columns if any(k in c for k in ['description', 'libelle simplifie', 'nom', 'libell'])), None)
        col_montant = next((c for c in df.columns if any(k in c for k in ['montant', 'amount', 'valeur'])), None)
        col_debit = next((c for c in df.columns if 'debit' in c or 'débit' in c), None)
        col_credit = next((c for c in df.columns if 'credit' in c or 'crédit' in c), None)
        col_etat = next((c for c in df.columns if any(k in c for k in ['état', 'status', 'state'])), None)
        col_info = next((c for c in df.columns if any(k in c for k in ['informations complementaires', 'info'])), None)

        # --- 4. CHARGEMENT DE L'INTELLIGENCE (Mots-clés) ---
        mots_cles_rules = []
        try:
            with engine.connect() as conn:
                query_cat = text("""
                    SELECT categorie, mots_cles, utilisateur 
                    FROM config_categories 
                    WHERE utilisateur = :u OR utilisateur = 'admin'
                """)
                result = conn.execute(query_cat, {"u": utilisateur}).fetchall()
                
                temp_rules = {}
                for row in result:
                    cat_name, raw_keywords, owner = row
                    if raw_keywords:
                        keywords_str = str(raw_keywords).replace('{', '').replace('}', '').replace('"', '')
                        keywords_list = [m.strip().lower() for m in keywords_str.split(',') if m.strip()]
                        
                        if cat_name not in temp_rules or owner == utilisateur:
                            temp_rules[cat_name] = keywords_list
                
                for cat, keys in temp_rules.items():
                    mots_cles_rules.append({"categorie": cat, "keywords": keys})
        except Exception as e:
            print(f"Erreur chargement mots_cles: {e}")

        # --- 5. CHARGEMENT DE LA MÉMOIRE ---
        memoire_rules = get_memoire(utilisateur)

        transactions_pretes = []
        mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

        # --- 6. BOUCLE DE TRAITEMENT ---
        for _, row in df.iterrows():
            if pd.isna(row[col_date]): continue
            
            if col_etat and pd.notna(row[col_etat]):
                if str(row[col_etat]).upper() not in ['TERMINÉ', 'COMPLETED', 'FINI']:
                    continue

            try:
                def clean_val(val):
                    if pd.isna(val) or val == "": return "0"
                    res = str(val).replace('+', '').replace('\xa0', '').replace(' ', '').strip()
                    return res.replace(',', '.')

                montant_float = 0.0
                if col_debit or col_credit:
                    d_val = clean_val(row.get(col_debit)) if col_debit else "0"
                    c_val = clean_val(row.get(col_credit)) if col_credit else "0"
                    
                    if d_val and d_val not in ["0", "0.00", "0.0"]: 
                        montant_float = -abs(float(d_val)) 
                    elif c_val and c_val not in ["0", "0.00", "0.0"]: 
                        montant_float = abs(float(c_val))
                elif col_montant:
                    montant_float = float(clean_val(row[col_montant]))

                nom_t = str(row[col_nom]).strip()
                info_t = str(row[col_info]) if col_info and pd.notna(row[col_info]) else ""
                nom_t_lower = nom_t.lower()
                texte_integral_upper = (nom_t + " " + info_t).upper()

                # --- ALGORITHME DE CATÉGORISATION ---
                cat = "❓ Autre"
                
                # A. 💡 Priorité 1 : VIREMENTS INTERNES (Logique dynamique automatisée)
                if any(k in texte_integral_upper for k in ["VERS", "VIR MME FONTA AUDE", "TO ", "VIREMENT"]):
                    # Détection automatique du livret cible dans le libellé brut de la banque
                    types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL"]
                    type_cible = next((t for t in types_epargne if t in texte_integral_upper), None)
                    
                    if type_cible:
                        if montant_float < 0: # Débit : Argent envoyé du compte courant vers l'épargne
                            cat = f"🔄 Virement : CCP vers {type_cible}"
                        else: # Crédit : Argent retiré de l'épargne vers le compte courant
                            cat = f"🔄 Virement : {type_cible} vers {type_cible if type_cible != 'CCP' else 'LIVRET A'}" # Fallback
                            cat = f"🔄 Virement : {type_cible} vers CCP"
                    else:
                        # Si aucun livret connu n'est identifié
                        cat = "🔄 Transfert Interne"

                # B. Priorité 2 : Mémoire Apprise
                if cat == "❓ Autre":
                    nom_t_normalise = " ".join(nom_t_lower.split())
                    for m in memoire_rules:
                        nom_memoire_clean = " ".join(m["nom"].lower().split())
                        if nom_memoire_clean in nom_t_normalise:
                            cat = m["categorie"]
                            break

                # C. Priorité 3 : Intelligence (Mots-clés de la configuration)
                if cat == "❓ Autre":
                    for rule in mots_cles_rules:
                        matched = False
                        for raw_k in rule["keywords"]:
                            parts = raw_k.split(':')
                            keyword_clean = parts[0].strip().lower()
                            filtre_signe = parts[1].strip().lower() if len(parts) > 1 else "both"
                            
                            if not keyword_clean:
                                continue

                            if keyword_clean in nom_t_lower:
                                match_positif = (filtre_signe == "positive" and montant_float > 0)
                                match_negatif = (filtre_signe == "negative" and montant_float < 0)
                                match_deux = (filtre_signe in ["both", "all"])

                                if match_positif or match_negatif or match_deux:
                                    matched = True
                                    cat = rule["categorie"]
                                    break
                        if matched:
                            break

                # --- DATE ET FORMATAGE FINAL ---
                date_str = str(row[col_date]).split(' ')[0]
                dt = pd.to_datetime(date_str, dayfirst=True, errors='coerce')
                if pd.isna(dt): continue
                
                transactions_pretes.append({
                    "date": dt.strftime('%Y-%m-%d'),
                    "nom": nom_t,
                    "montant": montant_float,
                    "categorie": cat,
                    "utilisateur": utilisateur.lower(),
                    "compte": compte,
                    "mois": mois_fr[dt.month - 1],
                    "annee": int(dt.year)
                })

            except Exception as e:
                print(f"Erreur sur une ligne : {e}")
                continue
            
        return transactions_pretes

    except Exception as e:
        print(f"CRASH GÉNÉRAL IMPORT: {e}")
        return []
    




@app.post("/transactions/batch")
def add_transactions_batch(transactions: List[Transaction]):
    success_count = 0
    has_duplicates = False
    
    # On traite chaque transaction indépendamment pour éviter l'effet domino en cas de doublon
    for t in transactions:
        try:
            # On utilise .begin() individuellement pour valider (COMMIT) chaque ligne réussie
            with engine.begin() as conn:
                query = text("""
                    INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, année, compte) 
                    VALUES (:d, :n, :m, :c, :u, :mo, :a, :co)
                """)
                
                conn.execute(query, {
                    "d": t.date, "n": t.nom, "m": t.montant, 
                    "c": t.categorie, "u": t.utilisateur.lower(),
                    "mo": t.mois, "a": t.annee, "co": t.compte
                })
                success_count += 1
        except Exception as e:
            # Si l'erreur est un doublon (UniqueViolation), on le note mais on ne crash pas l'application
            print(f"Ligne ignorée (Doublon ou contrainte) sur {t.nom}: {e}")
            has_duplicates = True
            continue
            
    # On renvoie le résultat global
    return {
        "status": "success", 
        "added": success_count,
        "warning": has_duplicates
    }


@app.put("/config-categories/update")
async def update_category_keywords(data: dict):
    try:
        categorie = data.get("categorie")
        keywords_list = data.get("keywords", [])
        utilisateur = data.get("utilisateur") # <--- On récupère l'utilisateur
        
        if not utilisateur:
            raise HTTPException(status_code=400, detail="Utilisateur manquant")

        # Formatage propre (SQLAlchemy gère souvent mieux les listes Python directes 
        # si vous utilisez les types ARRAY, mais gardons votre logique)
        keywords_sql = "{" + ",".join(keywords_list) + "}"
        
        # L'UPSERT se base maintenant sur (categorie, utilisateur)
        query = text("""
            INSERT INTO config_categories (categorie, mots_cles, utilisateur) 
            VALUES (:c, :k, :u)
            ON CONFLICT (categorie, utilisateur) 
            DO UPDATE SET mots_cles = EXCLUDED.mots_cles
        """)
        
        with engine.connect() as conn:
            conn.execute(query, {"k": keywords_sql, "c": categorie, "u": utilisateur})
            conn.commit()
            
        return {"status": "success"}
    except Exception as e:
        print(f"Erreur Update: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config-categories")
def get_categories_config(utilisateur: str = None):
    # On récupère les deux versions
    query = text("""
        SELECT categorie, mots_cles, utilisateur 
        FROM config_categories 
        WHERE utilisateur = :u OR utilisateur = 'admin'
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": utilisateur}).fetchall()
            
            # Dictionnaire pour stocker le résultat final
            # Format : { "Nom Cat": {"mots_cles": [], "is_user": False} }
            final_config = {}
            
            for row in result:
                cat_name = row[0]
                kw = row[1] or []
                if isinstance(kw, str):
                    kw = kw.replace("{", "").replace("}", "").split(",")
                kw_list = [k for k in kw if k]
                is_user = (row[2] == utilisateur)

                # STRATÉGIE : Si on n'a rien pour cette catégorie, on prend ce qui vient.
                # Si on a déjà une version 'admin' mais que la ligne actuelle est 'utilisateur',
                # on ÉCRASE la version admin par celle de l'utilisateur.
                if cat_name not in final_config or is_user:
                    final_config[cat_name] = kw_list

            return [
                {"categorie": k, "mots_cles": v} 
                for k, v in final_config.items()
            ]
    except Exception as e:
        print(f"Erreur Fetch: {e}")
        return []



@app.get("/previsions/{utilisateur}/{mois}/{annee}")
def get_previsions_filtrees(utilisateur: str, mois: str, annee: int):
    # 💡 1. AJOUT DE LA COLONNE 'actif' DANS LE SELECT
    sql_base = "SELECT id, date, nom, montant, categorie, compte, mois, année as annee, actif FROM previsions WHERE utilisateur = :u AND année = :a"
    params = {"u": utilisateur, "a": annee}

    # CONDITION : Si mois n'est pas "ALL", on ajoute le filtre mois
    if mois != "ALL":
        sql_base += " AND mois = :m"
        params["m"] = mois

    query = text(sql_base + " ORDER BY date ASC")
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, params).fetchall()
            
            previsions = []
            for row in result:
                r = row._mapping
                
                # 💡 2. SÉCURITÉ POUR LES ANCIENNES LIGNES : 
                # Si 'actif' est NULL (None) ou absent, on le force à True par défaut
                est_actif = r["actif"] if r["actif"] is not None else True
                
                previsions.append({
                    "id": r["id"],
                    "date": r["date"].isoformat() if r["date"] else None,
                    "nom": r["nom"],
                    "montant": float(r["montant"]),
                    "categorie": r["categorie"],
                    "compte": r["compte"],
                    "mois": r["mois"],
                    "annee": int(r["annee"]),
                    "actif": est_actif  # 💡 3. AJOUT DU CHAMP DANS LA RÉPONSE JSON
                })
            return previsions
    except Exception as e:
        print(f"Erreur SQL Previsions: {e}")
        return []
    

class PrevisionIn(BaseModel):
    nom: str
    montant: float
    categorie: str
    compte: str
    utilisateur: str
    mois: str
    annee: int
    date: str
    actif: bool = True

    # 💡 Pydantic Validator : Nettoie automatiquement le mois à l'entrée de l'API
    @field_validator('mois')
    @classmethod
    def clean_mois(cls, v: str) -> str:
        if v:
            # Enlève les accents (Août -> Aout, Février -> Fevrier)
            
            v = "".join(c for c in unicodedata.normalize('NFD', v) if unicodedata.category(c) != 'Mn')
            # Optionnel : Forcer la première lettre en Majuscule et le reste en minuscule
            v = v.strip().capitalize()
        return v

@app.post("/previsions")
def add_prevision(p: PrevisionIn):
    # 🧼 NETTOYAGE DU NOM : Si le front envoie déjà "[PRÉVI]" ou "[PREVI]", on le retire 
    # pour éviter les doublons avant d'ajouter le tag propre standardisé.
    nom_nettoye = re.sub(r'^\[PRÉVI\]\s*|^\[PREVI\]\s*', '', p.nom, flags=re.IGNORECASE)
    nom_final = f"[PRÉVI] {nom_nettoye}"

    query = text("""
        INSERT INTO previsions (date, nom, montant, categorie, compte, mois, année, utilisateur,actif)
        VALUES (:d, :n, :m, :c, :compte, :mois, :annee, :u,:actif)
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "d": p.date, 
                "n": nom_final,        # Enregistre "[PRÉVI] Mon Titre" proprement
                "m": p.montant, 
                "c": p.categorie, 
                "compte": p.compte, 
                "mois": p.mois,         # Sera "Aout" (nettoyé par le validator Pydantic)
                "annee": p.annee, 
                "u": p.utilisateur,
                "actif": p.actif
            })
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    



@app.put("/previsions/{prev_id}")
def update_prevision(prev_id: int, data: dict):
    try:
        if not data:
            return {"status": "error", "message": "No data provided"}

        # 1. Gestion de l'accent sur 'année' si nécessaire
        if "annee" in data:
            data["année"] = data.pop("annee")
            
        # 2. 🛡️ SÉCURITÉ DU MOIS : Nettoyage automatique des accents si le mois change
        if "mois" in data and data["mois"]:
            m = data["mois"]
            # Enlève les accents (Août -> Aout, Février -> Fevrier)
            m = "".join(c for c in unicodedata.normalize('NFD', m) if unicodedata.category(c) != 'Mn')
            data["mois"] = m.strip().capitalize()

        # 3. 🛡️ SÉCURITÉ BOOLEEN : Conversion forcée pour PostgreSQL
        if "actif" in data:
            # Si data["actif"] vaut 0, "0", False ou "false" (insensible à la casse) -> False.
            # Pour toute autre valeur (comme 1, True, "true") -> True.
            val = data["actif"]
            if isinstance(val, str):
                data["actif"] = val.lower() not in ("0", "false")
            else:
                data["actif"] = val not in (0, False)

        # Construction de la requête SQL
        set_clause = ", ".join([f"{k} = :{k}" for k in data.keys()])
        query = text(f"UPDATE previsions SET {set_clause} WHERE id = :id")
        
        with engine.connect() as conn:
            conn.execute(query, {**data, "id": prev_id})
            conn.commit()
            
        return {"status": "success"}
    except Exception as e:
        print(f"Détail de l'erreur backend: {str(e)}")
        return {"status": "error", "message": str(e)}
    
    
@app.delete("/previsions/{prev_id}")
def delete_prevision(prev_id: int):
    query = text("DELETE FROM previsions WHERE id = :id")
    try:
        with engine.connect() as conn:
            conn.execute(query, {"id": prev_id})
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    


class Allocation(BaseModel):
    utilisateur: str   # Changé int -> str
    profil: str        # Changé int -> str
    projet: str        # Changé int -> str (si tu stockes le nom du projet)
    montant_alloue: float


@app.get("/get-allocations/{profil_id}")
def get_allocations(profil_id: str): # Change int en str ici
    # On s'assure de chercher la valeur telle qu'elle est stockée
    query = text("SELECT * FROM allocations WHERE profil = :p ORDER BY date_allocation DESC")
    try:
        with engine.connect() as conn:
            res = conn.execute(query, {"p": str(profil_id)}).mappings().all()
            return [dict(r) for r in res]
    except Exception as e:
        print(f"Erreur SQL Get Allocations: {e}")
        return []

# --- ENREGISTRER UNE NOUVELLE ALLOCATION ---
@app.post("/save-allocation")
def save_allocation(a: Allocation):
    query = text("""
        INSERT INTO allocations (utilisateur, profil, projet, montant_alloue)
        VALUES (:u, :pr, :pj, :m)
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "u": a.utilisateur,
                "pr": a.profil,
                "pj": a.projet,
                "m": a.montant_alloue
            })
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Erreur SQL Save Allocation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- SUPPRIMER TOUTE L'ENVELOPPE ---
@app.delete("/delete-enveloppe/{projet_nom}")
def delete_enveloppe(projet_nom: str, profil: str):
    query = text("DELETE FROM allocations WHERE projet = :pj AND profil = :pr")
    try:
        with engine.connect() as conn:
            conn.execute(query, {"pj": projet_nom, "pr": profil})
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- MODIFIER LE MONTANT GLOBAL (Met à jour la 1ère ligne trouvée ou recalcule) ---
@app.put("/update-enveloppe-montant")
def update_enveloppe_montant(projet: str, profil: str, nouveau_montant: float):
    # Pour faire simple, on supprime les anciennes lignes et on en recrée une propre
    query_del = text("DELETE FROM allocations WHERE projet = :pj AND profil = :pr")
    query_ins = text("""
        INSERT INTO allocations (utilisateur, profil, projet, montant_alloue) 
        VALUES ('System', :pr, :pj, :m)
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query_del, {"pj": projet, "pr": profil})
            conn.execute(query_ins, {"pj": projet, "pr": profil, "m": nouveau_montant})
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

class TricountTransaction(BaseModel):
    id: Optional[int] = None
    date: date
    libelle: str
    montant: float
    paye_par: str
    pour_qui: str # Stocké en string séparé par des virgules (ex: "Theo, Marie, Julie")
    utilisateur: str
    groupe: str
    token_partage: Optional[str] = None # <-- Nouveau champ
    emoji: Optional[str] = None  # <--- AJOUTE CETTE LIGNE

def clean_for_pdf(text_val: str) -> str:
    if not text_val:
        return ""
    # 1. Nettoyage strict des caractères de haute valeur (ord >= 256) comme les émojis
    text_val = "".join(c for c in text_val if ord(c) < 256)
    
    # 2. Remplacement des accents français courants pour éviter les plantages ou caractères corrompus
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'î': 'i', 'ï': 'i',
        'Î': 'I', 'Ï': 'I',
        'ô': 'o', 'ö': 'o',
        'Ô': 'O', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C',
        'œ': 'oe', 'Œ': 'OE'
    }
    for orig, rep in replacements.items():
        text_val = text_val.replace(orig, rep)
        
    try:
        return text_val.encode('latin-1', 'ignore').decode('latin-1')
    except Exception:
        return "".join(c for c in text_val if ord(c) < 128)

def calculer_balances(transactions):
    # 1. On initialise une matrice de dettes croisées
    # dettes[A][B] = ce que A doit à B
    dettes = {}
    participants = set()

    for t in transactions:
        payeur = str(t.get('paye_par') or t.get('payé_par') or '').strip()
        montant_total = float(t.get('montant') or 0)
        if not payeur or payeur == "Système" or montant_total <= 0:
            continue
        
        participants.add(payeur)
        pour_qui_raw = str(t.get('pour_qui') or '')
        parts = [p.strip() for p in pour_qui_raw.split(',') if p.strip()]

        for part in parts:
            if ':' in part:
                benef, montant_part = part.split(':')
                benef = benef.strip()
                participants.add(benef)
                if benef != payeur:
                    # Le bénéficiaire 'benef' doit 'montant_part' au 'payeur'
                    if benef not in dettes: dettes[benef] = {}
                    dettes[benef][payeur] = dettes[benef].get(payeur, 0) + float(montant_part)
            else:
                # Si format simple, on divise
                part_egale = montant_total / len(parts)
                benef = part.strip()
                participants.add(benef)
                if benef != payeur:
                    if benef not in dettes: dettes[benef] = {}
                    dettes[benef][payeur] = dettes[benef].get(payeur, 0) + part_egale

    # 2. Netting Bilatéral (Compensation entre deux personnes)
    # Si A doit 10 à B et B doit 5 à A, alors A doit 5 à B.
    transferts = []
    liste_p = list(participants)
    
    for i in range(len(liste_p)):
        for j in range(i + 1, len(liste_p)):
            p1 = liste_p[i]
            p2 = liste_p[j]
            
            dette_1_vers_2 = dettes.get(p1, {}).get(p2, 0)
            dette_2_vers_1 = dettes.get(p2, {}).get(p1, 0)
            
            if dette_1_vers_2 > dette_2_vers_1:
                diff = round(dette_1_vers_2 - dette_2_vers_1, 2)
                if diff > 0.01:
                    transferts.append({"de": p1, "a": p2, "montant": diff})
            elif dette_2_vers_1 > dette_1_vers_2:
                diff = round(dette_2_vers_1 - dette_1_vers_2, 2)
                if diff > 0.01:
                    transferts.append({"de": p2, "a": p1, "montant": diff})

    return transferts


@app.get("/get-tricount/{username}/{group_name}")
def get_tricount(username: str, group_name: str):
    # On ajoute le filtre "AND groupe = :g" dans la requête SQL
    query = text("""
        SELECT * FROM tricount 
        WHERE utilisateur = :u AND groupe = :g 
        ORDER BY date DESC
    """)
    
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username, "g": group_name}).mappings().all()
        transactions = [dict(r) for r in res]
        
        # La fonction calculer_balances ne recevra maintenant que 
        # les transactions de ce groupe précis
        transferts = calculer_balances(transactions)
        
        return {
            "transactions": transactions, 
            "transferts": transferts
        }

@app.post("/save-tricount")
def save_tricount(t: TricountTransaction):
    # 💡 AJOUT : Associe le token s'il existe déjà pour ce groupe
    query_token = text("""
        SELECT token_partage FROM tricount 
        WHERE utilisateur = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    token_existant = None
    with engine.connect() as conn:
        row = conn.execute(query_token, {"u": t.utilisateur, "g": t.groupe}).fetchone()
        if row:
            token_existant = row[0]

    token_final = t.token_partage or token_existant

    query = text("""
        INSERT INTO tricount (date, libellé, payé_par, pour_qui, montant, utilisateur, groupe, emoji, token_partage)
        VALUES (:d, :l, :p, :pq, :m, :u, :g, :e, :token)
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, 
            "m": t.montant, "u": t.utilisateur, "g": t.groupe, "token": token_final, "e": t.emoji
        })
    return {"status": "success"}

@app.get("/get-groups/{username}")
def get_groups(username: str):
    # On récupère les groupes et on essaie de construire une map Nom -> Emoji
    # en regardant les transactions passées
    query = text("""
        SELECT groupe, payé_par, emoji 
        FROM tricount 
        WHERE utilisateur = :u 
        AND emoji IS NOT NULL
    """)
    
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username}).mappings().all()
        
        # On crée un dictionnaire : { "NOM_GROUPE": { "Theo": "🍕", "Marie": "🐱" } }
        emojis_par_groupe = {}
        for r in res:
            g = r['groupe']
            p = r['payé_par']
            e = r['emoji']
            if g not in emojis_par_groupe:
                emojis_par_groupe[g] = {}
            emojis_par_groupe[g][p] = e

    # Récupération des noms de groupes uniques
    query_names = text("SELECT DISTINCT groupe FROM tricount WHERE utilisateur = :u ORDER BY groupe")
    with engine.connect() as conn:
        res_names = conn.execute(query_names, {"u": username}).all()
        
        final_groups = []
        for i, r in enumerate(res_names):
            nom_g = r[0]
            # On transforme le dictionnaire d'emojis en chaîne "Nom:Emoji,Nom:Emoji" pour le front
            map_e = emojis_par_groupe.get(nom_g, {})
            chaine_emojis = ",".join([f"{k}:{v}" for k, v in map_e.items()])
            
            final_groups.append({
                "id": i,
                "nom": nom_g,
                "emojis": chaine_emojis # On envoie ça au front
            })
        return final_groups
    
@app.delete("/delete-group/{username}/{group_name}")
def delete_group(username: str, group_name: str):
    # Suppression de toutes les transactions liées à ce groupe pour cet utilisateur
    query = text("DELETE FROM tricount WHERE utilisateur = :u AND groupe = :g")
    try:
        with engine.begin() as conn:
            conn.execute(query, {"u": username, "g": group_name})
        return {"status": "success", "message": f"Groupe {group_name} supprimé"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Modèle pour valider les données reçues lors du renommage
class RenameGroupRequest(BaseModel):
    userId: str
    oldName: str
    newName: str

@app.put("/rename-group")
def rename_group(request: RenameGroupRequest):
    # La requête SQL met à jour toutes les transactions du groupe
    query = text("""
        UPDATE tricount 
        SET groupe = :new 
        WHERE utilisateur = :u AND groupe = :old
    """)
    
    try:
        with engine.begin() as conn:
            conn.execute(query, {
                "new": request.newName,
                "u": request.userId,
                "old": request.oldName
            })
        return {"status": "success", "message": f"Groupe renommé en {request.newName}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    



class StyledPDF(FPDF):
    def header_style(self, title, subtitle):
        # 1. Fond sombre pour le Header (simule le bg du site)
        self.set_fill_color(15, 23, 42)  # Dark Blue #0f172a
        self.rect(0, 0, 210, 50, 'F')
        
        # 2. Ligne de "lumière" Indigo en haut (comme ton interface)
        self.set_fill_color(99, 102, 241) # Indigo-500
        self.rect(0, 0, 210, 2, 'F')
        
        # 3. Titre Principal
        self.set_y(15)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, title.upper(), ln=True, align='C')
        
        # 4. Sous-titre
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139) # Gris-bleu text-slate-400
        self.cell(0, 10, subtitle.upper(), ln=True, align='C')
        self.ln(20)

# ==========================================================
# ROUTE 1 : TELECHARGEMENT DE PDF (CONNECTÉ)
# ==========================================================
@app.get("/download-pdf/{username}/{group_name}")
def download_pdf(username: str, group_name: str, sujet: str = None):
    try:
        # --- 1. RÉCUPÉRATION DES DONNÉES ---
        query = text("SELECT * FROM tricount WHERE utilisateur = :u AND groupe = :g ORDER BY date DESC")
        with engine.connect() as conn:
            res = conn.execute(query, {"u": username, "g": group_name}).mappings().all()
            transactions = [dict(r) for r in res]
            
        if not transactions:
            raise HTTPException(status_code=404, detail="Bilan vide ou groupe introuvable.")
            
        df_groupe = pd.DataFrame(transactions)
        
        # --- 2. CALCULS ---
        transferts_finaux = calculer_balances(transactions)
        total_depenses = df_groupe['montant'].sum() if not df_groupe.empty else 0
        
        # Nettoyage des titres
        group_name_clean = clean_for_pdf(group_name)
        
        if sujet:
            sujet_clean = clean_for_pdf(sujet)
            transferts_a_afficher = [
                t for t in transferts_finaux 
                if clean_for_pdf(t['de']) == sujet_clean or clean_for_pdf(t['a']) == sujet_clean
            ]
            titre_doc = f"NOTE : {sujet_clean}"
            sous_titre = f"Bilan personnel dans le groupe {group_name_clean}"
        else:
            sujet_clean = None
            transferts_a_afficher = transferts_finaux
            titre_doc = group_name_clean
            sous_titre = f"Bilan global du groupe - Total : {total_depenses:.2f} EUR"

        # --- 3. GÉNÉRATION DU PDF ---
        pdf = StyledPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        pdf.header_style(titre_doc, sous_titre)
        
        pdf.set_left_margin(20)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, "RECAPITULATIF DES TRANSFERTS", ln=True)
        
        pdf.set_fill_color(99, 102, 241)
        pdf.rect(20, pdf.get_y(), 10, 1, 'F')
        pdf.ln(5)

        largeur_utile = 170

        if transferts_a_afficher:
            for t in transferts_a_afficher:
                curr_y = pdf.get_y()
                de_clean = clean_for_pdf(t['de'])
                a_clean = clean_for_pdf(t['a'])
                
                if sujet:
                    if de_clean == sujet_clean:
                        color = (225, 29, 72)
                        texte = f"[-] VOUS DEVEZ DONNER {t['montant']:.2f} EUR A {a_clean}"
                    else:
                        color = (5, 150, 105)
                        texte = f"[+] VOUS ALLEZ RECEVOIR {t['montant']:.2f} EUR DE {de_clean}"
                else:
                    color = (79, 70, 229)
                    texte = f"> {de_clean} doit donner {t['montant']:.2f} EUR a {a_clean}"
                
                pdf.set_fill_color(248, 250, 252)
                pdf.rect(20, curr_y, largeur_utile, 10, 'F')
                pdf.set_fill_color(*color)
                pdf.rect(20, curr_y, 1.5, 10, 'F')
                
                pdf.set_x(25)
                pdf.set_text_color(*color)
                pdf.set_font("Helvetica", "B", 10)
                pdf.multi_cell(w=largeur_utile - 5, h=10, txt=texte, align='L')
                pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "Aucun transfert a effectuer.", ln=True)

        # 💡 EXTRACTION COMPATIBLE TOUTES VERSIONS FPDF (Ancienne & Nouvelle)
        pdf_bytes = b''
        try:
            # On essaye l'ancienne syntaxe PyFPDF (dest='S')
            raw_out = pdf.output(dest='S')
            if isinstance(raw_out, str) and raw_out != "":
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)
        except (TypeError, ValueError):
            # Si fpdf2 est installé, 'dest' provoquera une TypeError, on se replie sur sa syntaxe
            raw_out = pdf.output()
            if isinstance(raw_out, str):
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)

        headers = {
            'Content-Disposition': f'attachment; filename="Bilan_{group_name_clean}.pdf"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

    except Exception as e:
        print("====== ERREUR CRASH GENERATION PDF ======")
        traceback.print_exc()
        print("=========================================")
        raise HTTPException(status_code=500, detail=f"Erreur interne de PDF: {str(e)}")







# 1. Générer ou récupérer un lien de partage unique pour un groupe
@app.post("/share-group/{username}/{group_name}")
def share_group(username: str, group_name: str):
    # On vérifie si un token existe déjà pour éviter d'en recréer un inutilement
    query_check = text("""
        SELECT token_partage FROM tricount 
        WHERE utilisateur = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query_check, {"u": username, "g": group_name}).fetchone()
        if row:
            return {"token": row[0]}
            
    # Sinon, on génère un token cryptographique sécurisé de 16 caractères
    token = secrets.token_urlsafe(16)
    query_update = text("""
        UPDATE tricount 
        SET token_partage = :token 
        WHERE utilisateur = :u AND groupe = :g
    """)
    with engine.begin() as conn:
        conn.execute(query_update, {"token": token, "u": username, "g": group_name})
        
    return {"token": token}

# 2. Récupérer le token s'il existe déjà
@app.get("/get-share-token/{username}/{group_name}")
def get_share_token(username: str, group_name: str):
    query = text("""
        SELECT token_partage FROM tricount 
        WHERE utilisateur = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query, {"u": username, "g": group_name}).fetchone()
        if row:
            return {"token": row[0]}
    return {"token": None}

# 3. Récupérer toutes les données d'un Tricount de manière anonyme via le Token
@app.get("/get-shared-tricount/{token}")
def get_shared_tricount(token: str):
    query = text("""
        SELECT * FROM tricount 
        WHERE token_partage = :token 
        ORDER BY date DESC
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"token": token}).mappings().all()
        transactions = [dict(r) for r in res]
        
        if not transactions:
            raise HTTPException(status_code=404, detail="Lien de partage introuvable ou groupe vide.")
            
        transferts = calculer_balances(transactions)
        groupe_nom = transactions[0]["groupe"]
        utilisateur_origine = transactions[0]["utilisateur"]
        
        # Compiler les émojis des membres existants
        emojis_par_membre = {}
        for t in transactions:
            p = t.get('paye_par') or t.get('payé_par')
            e = t.get('emoji')
            if p and e:
                emojis_par_membre[p] = e
        chaine_emojis = ",".join([f"{k}:{v}" for k, v in emojis_par_membre.items()])

        return {
            "groupe": groupe_nom,
            "utilisateur": utilisateur_origine,
            "transactions": transactions,
            "transferts": transferts,
            "emojis": chaine_emojis
        }

# 4. Sauvegarder une transaction anonyme depuis le lien de partage
class SharedTransactionRequest(BaseModel):
    date: date
    libelle: str
    montant: float
    paye_par: str
    pour_qui: str
    emoji: Optional[str] = None

@app.post("/save-shared-transaction/{token}")
def save_shared_transaction(token: str, t: SharedTransactionRequest):
    # Retrouver l'utilisateur et le groupe d'origine associés au token
    query_context = text("""
        SELECT utilisateur, groupe FROM tricount 
        WHERE token_partage = :token 
        LIMIT 1
    """)
    with engine.connect() as conn:
        context = conn.execute(query_context, {"token": token}).mappings().first()
        if not context:
            raise HTTPException(status_code=404, detail="Lien de partage invalide.")
            
        username = context["utilisateur"]
        group_name = context["groupe"]

    query_insert = text("""
        INSERT INTO tricount (date, libellé, payé_par, pour_qui, montant, utilisateur, groupe, token_partage, emoji)
        VALUES (:d, :l, :p, :pq, :m, :u, :g, :token, :e)
    """)
    with engine.begin() as conn:
        conn.execute(query_insert, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, 
            "m": t.montant, "u": username, "g": group_name, "token": token, "e": t.emoji
        })
    return {"status": "success"}

# 5. Modifier une transaction de manière sécurisée via le token de partage
class SharedTransactionUpdate(BaseModel):
    id: int
    date: date
    libelle: str
    paye_par: str
    pour_qui: str
    montant: float

@app.put("/update-shared-transaction/{token}")
def update_shared_transaction(token: str, t: SharedTransactionUpdate):
    # Sécurité : Vérifier que la transaction appartient bien à ce token de partage
    query_check = text("SELECT 1 FROM tricount WHERE id = :id AND token_partage = :token")
    with engine.connect() as conn:
        exists = conn.execute(query_check, {"id": t.id, "token": token}).fetchone()
        if not exists:
            raise HTTPException(status_code=403, detail="Action non autorisée.")

    query_update = text("""
        UPDATE tricount 
        SET date = :d, libellé = :l, payé_par = :p, pour_qui = :pq, montant = :m
        WHERE id = :id
    """)
    with engine.begin() as conn:
        conn.execute(query_update, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, "m": t.montant, "id": t.id
        })
    return {"status": "success"}

# 6. Supprimer une transaction de manière sécurisée via le token de partage
@app.delete("/delete-shared-transaction/{token}/{id}")
def delete_shared_transaction(token: str, id: int):
    # Sécurité : Vérifier que la transaction appartient bien à ce token de partage
    query_check = text("SELECT 1 FROM tricount WHERE id = :id AND token_partage = :token")
    with engine.connect() as conn:
        exists = conn.execute(query_check, {"id": id, "token": token}).fetchone()
        if not exists:
            raise HTTPException(status_code=403, detail="Action non autorisée.")

    query_delete = text("DELETE FROM tricount WHERE id = :id")
    with engine.begin() as conn:
        conn.execute(query_delete, {"id": id})
    return {"status": "success"}

# ==========================================================
# ROUTE 2 : TELECHARGEMENT DE PDF ANONYME (PARTAGÉ)
# ==========================================================
@app.get("/download-shared-pdf/{token}")
def download_shared_pdf(token: str, sujet: str = None):
    try:
        query = text("SELECT * FROM tricount WHERE token_partage = :token ORDER BY date DESC")
        with engine.connect() as conn:
            res = conn.execute(query, {"token": token}).mappings().all()
            transactions = [dict(r) for r in res]
            
        if not transactions:
            raise HTTPException(status_code=404, detail="Bilan vide.")
            
        df_groupe = pd.DataFrame(transactions)
        transferts_finaux = calculer_balances(transactions)
        total_depenses = df_groupe['montant'].sum() if not df_groupe.empty else 0
        
        group_name = transactions[0]["groupe"]
        group_name_clean = clean_for_pdf(group_name)

        if sujet:
            sujet_clean = clean_for_pdf(sujet)
            transferts_a_afficher = [
                t for t in transferts_finaux 
                if clean_for_pdf(t['de']) == sujet_clean or clean_for_pdf(t['a']) == sujet_clean
            ]
            titre_doc = f"NOTE : {sujet_clean}"
            sous_titre = f"Bilan personnel dans le groupe {group_name_clean}"
        else:
            sujet_clean = None
            transferts_a_afficher = transferts_finaux
            titre_doc = group_name_clean
            sous_titre = f"Bilan global du groupe - Total : {total_depenses:.2f} EUR"

        # --- GÉNÉRATION DU PDF ---
        pdf = StyledPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.header_style(titre_doc, sous_titre)
        
        pdf.set_left_margin(20)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, "RECAPITULATIF DES TRANSFERTS", ln=True)
        pdf.set_fill_color(99, 102, 241)
        pdf.rect(20, pdf.get_y(), 10, 1, 'F')
        pdf.ln(5)

        largeur_utile = 170

        if transferts_a_afficher:
            for t in transferts_a_afficher:
                curr_y = pdf.get_y()
                de_clean = clean_for_pdf(t['de'])
                a_clean = clean_for_pdf(t['a'])
                
                if sujet:
                    if de_clean == sujet_clean:
                        color = (225, 29, 72)
                        texte = f"[-] VOUS DEVEZ DONNER {t['montant']:.2f} EUR A {a_clean}"
                    else:
                        color = (5, 150, 105)
                        texte = f"[+] VOUS ALLEZ RECEVOIR {t['montant']:.2f} EUR DE {de_clean}"
                else:
                    color = (79, 70, 229)
                    texte = f"> {de_clean} doit donner {t['montant']:.2f} EUR a {a_clean}"
                
                pdf.set_fill_color(248, 250, 252)
                pdf.rect(20, curr_y, largeur_utile, 10, 'F')
                pdf.set_fill_color(*color)
                pdf.rect(20, curr_y, 1.5, 10, 'F')
                
                pdf.set_x(25)
                pdf.set_text_color(*color)
                pdf.set_font("Helvetica", "B", 10)
                pdf.multi_cell(w=largeur_utile - 5, h=10, txt=texte, align='L')
                pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "Aucun transfert a effectuer.", ln=True)

        # 💡 EXTRACTION COMPATIBLE TOUTES VERSIONS FPDF (Ancienne & Nouvelle)
        pdf_bytes = b''
        try:
            # On essaye l'ancienne syntaxe PyFPDF (dest='S')
            raw_out = pdf.output(dest='S')
            if isinstance(raw_out, str) and raw_out != "":
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)
        except (TypeError, ValueError):
            # Si fpdf2 est installé, 'dest' provoquera une TypeError, on se replie sur sa syntaxe
            raw_out = pdf.output()
            if isinstance(raw_out, str):
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)

        headers = {
            'Content-Disposition': f'attachment; filename="Bilan_{group_name_clean}.pdf"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

    except Exception as e:
        print("====== ERREUR CRASH GENERATION PDF SHARED ======")
        traceback.print_exc()
        print("================================================")
        raise HTTPException(status_code=500, detail=f"Erreur interne de PDF: {str(e)}")






# Modèle pour la modification
class UpdateTransactionRequest(BaseModel):
    id: int
    date: str
    libelle: str
    paye_par: str
    pour_qui: str
    montant: float

@app.delete("/delete-transaction/{transaction_id}")
def delete_transaction(transaction_id: int):
    query = text("DELETE FROM tricount WHERE id = :id")
    try:
        with engine.begin() as conn:
            conn.execute(query, {"id": transaction_id})
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/update-transaction")
def update_transaction(t: UpdateTransactionRequest):
    query = text("""
        UPDATE tricount 
        SET date = :d, libellé = :l, payé_par = :p, pour_qui = :pq, montant = :m
        WHERE id = :id
    """)
    try:
        with engine.begin() as conn:
            conn.execute(query, {
                "d": t.date, "l": t.libelle, "p": t.paye_par, 
                "pq": t.pour_qui, "m": t.montant, "id": t.id
            })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.put("/update-member-emoji")
def update_member_emoji(data: dict):
    # data contient : { "username": "...", "group_name": "...", "member_name": "...", "new_emoji": "🍕" }
    query = text("""
        UPDATE tricount 
        SET emoji = :e 
        WHERE utilisateur = :u AND groupe = :g AND payé_par = :m
    """)
    
    try:
        with engine.begin() as conn:
            conn.execute(query, {
                "e": data['new_emoji'],
                "u": data['username'],
                "g": data['group_name'],
                "m": data['member_name']
            })
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


app.get("/generate-share-link/{username}/{group_name}")
def generate_link(username: str, group_name: str):
    # 1. On vérifie si un token existe déjà pour ce groupe
    check_query = text("SELECT token_partage FROM tricount WHERE utilisateur = :u AND groupe = :g LIMIT 1")
    
    with engine.connect() as conn:
        row = conn.execute(check_query, {"u": username, "g": group_name}).first()
        if row and row[0]:
            return {"token": row[0]}
    
    # 2. Sinon, on en crée un nouveau
    new_token = str(uuid.uuid4())
    update_query = text("""
        UPDATE tricount SET token_partage = :t 
        WHERE utilisateur = :u AND groupe = :g
    """)
    
    with engine.begin() as conn:
        conn.execute(update_query, {"t": new_token, "u": username, "g": group_name})
    
    return {"token": new_token}


@app.get("/get-shared-tricount/{token}")
def get_shared_tricount(token: str):
    # On récupère les data uniquement via le token
    query = text("SELECT * FROM tricount WHERE token_partage = :t ORDER BY date DESC")
    
    with engine.connect() as conn:
        res = conn.execute(query, {"t": token}).mappings().all()
        if not res:
            raise HTTPException(status_code=404, detail="Lien invalide")
            
        transactions = [dict(r) for r in res]
        transferts = calculer_balances(transactions)
        
        # On renvoie aussi le nom du groupe et le proprio pour que le front sache où il est
        return {
            "nom_groupe": transactions[0]['groupe'],
            "proprietaire": transactions[0]['utilisateur'],
            "transactions": transactions,
            "transferts": transferts
        }
    
@app.get("/get-members/{username}/{group_name}")
def get_members(username: str, group_name: str):
    query = text("""
        SELECT payé_par, pour_qui 
        FROM tricount 
        WHERE utilisateur = :u AND groupe = :g
    """)
    
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username, "g": group_name}).mappings().all()
        
        membres = set()
        for r in res:
            # 1. On ajoute le payeur
            if r['payé_par']:
                membres.add(r['payé_par'].strip())
            
            # 2. On extrait les gens dans 'pour_qui'
            # Format attendu : "Theo:10,Marie:5" ou "Theo,Marie"
            pour_qui_raw = r['pour_qui'] or ""
            parts = [p.strip() for p in pour_qui_raw.split(',') if p.strip()]
            for p in parts:
                nom = p.split(':')[0] if ':' in p else p
                membres.add(nom.strip())
                
        return sorted(list(membres))
    




# --- SCHÉMAS PYDANTIC POUR LES STATS PERSONNALISÉES ---
class CustomStatRule(BaseModel):
    champ: str       # 'nom', 'categorie' ou 'jour'
    condition: str   # 'EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN'
    valeur: str      # ex: 'UberEats', 'Macdo', 'lundi', etc.

class CustomStatCreate(BaseModel):
    utilisateur: str
    profil: str 
    titre: str
    flux_type: str   # 'depenses' ou 'revenus'
    operateur: str   # 'AND' ou 'OR'
    couleur: str  # 👈 Ajoute ici
    icone: str    # 👈 Ajoute ici
    regles: List[CustomStatRule]

# --- 1. AJOUTER UNE STAT PERSO (CORRIGÉ ✨) ---
@app.post("/custom-stats")
def create_custom_stat(stat: CustomStatCreate):
    # Ajout du champ 'profil' dans la structure de l'INSERT SQL
    query = text("""
        INSERT INTO custom_stats (utilisateur, profil, titre, flux_type, operateur, couleur, icone, regles)
        VALUES (:u, :p, :t, :f, :o, :c, :i, :r)
        RETURNING id
    """)
    try:
        with engine.connect() as conn:
            regles_liste = [r.model_dump() for r in stat.regles]
            regles_json = json.dumps(regles_liste)
            
            result = conn.execute(query, {
                "u": stat.utilisateur.lower(),
                "p": stat.profil,  # 👈 On envoie enfin la valeur reçue du frontend !
                "t": stat.titre,
                "f": stat.flux_type,
                "o": stat.operateur,
                "r": regles_json,
                "c": stat.couleur,
                "i": stat.icone,
            })
            new_id = result.fetchone()[0]
            conn.commit()
            return {"id": new_id, "status": "success"}
    except Exception as e:
        print(f"Erreur SQL custom_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. RÉCUPÉRER LES STATS D'UN UTILISATEUR (CORRIGÉ ✨) ---
@app.get("/custom-stats/{username}")
def get_custom_stats(username: str):
    # 🌟 AJOUT DE COULEUR ET ICONE DANS LE SELECT :
    query = text("SELECT id, profil, titre, flux_type, operateur, couleur, icone, regles FROM custom_stats WHERE LOWER(utilisateur) = :u")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": username.lower()})
            columns = result.keys()
            records = []
            for row in result.fetchall():
                row_dict = dict(zip(columns, row))
                
                if isinstance(row_dict['regles'], str):
                    row_dict['regles'] = json.loads(row_dict['regles'])
                elif row_dict['regles'] is None:
                    row_dict['regles'] = []
                    
                records.append(row_dict)
            return records
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))
    

# --- 3. SUPPRIMER UNE STAT PERSO ---
@app.delete("/custom-stats/{stat_id}")
def delete_custom_stat(stat_id: int):
    query = text("DELETE FROM custom_stats WHERE id = :id")
    try:
        with engine.connect() as conn:
            conn.execute(query, {"id": stat_id})
            conn.commit()
            return {"status": "success"}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

# --- SCHÉMA DE MISE À JOUR ---
class CustomStatUpdate(BaseModel):
    titre: str
    flux_type: str
    operateur: str
    couleur: str
    icone: str
    regles: List[CustomStatRule]

# --- 4. MODIFIER UNE STAT PERSO (NOUVEAU ✨) ---
@app.put("/custom-stats/{stat_id}")
def update_custom_stat(stat_id: int, stat: CustomStatUpdate):
    query = text("""
        UPDATE custom_stats 
        SET titre = :t, flux_type = :f, operateur = :o, couleur = :c, icone = :i, regles = :r
        WHERE id = :id
    """)
    try:
        with engine.connect() as conn:
            regles_liste = [r.model_dump() for r in stat.regles]
            regles_json = json.dumps(regles_liste)
            
            conn.execute(query, {
                "id": stat_id,
                "t": stat.titre,
                "f": stat.flux_type,
                "o": stat.operateur,
                "c": stat.couleur,
                "i": stat.icone,
                "r": regles_json
            })
            conn.commit()
            return {"status": "success", "id": stat_id}
    except Exception as e:
        print(f"Erreur SQL update custom_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))





# 1. PLACE LE SCHÉMA ICI EN PREMIER
class ChatRequest(BaseModel):
    question: str
    transactions: List[dict]
    custom_stats: Optional[List[dict]] = []


# 1. Définition de la structure de sortie attendue par Gemini
class AISuggestedRule(BaseModel):
    champ: str = Field(description="Doit être 'nom', 'categorie', 'jour', 'montant', 'methode' ou 'frequence'")
    condition: str = Field(description="Doit être 'EQUALS', 'CONTAINS', 'GREATER_THAN' ou 'LESS_THAN'")
    valeur: str = Field(description="La valeur cible en minuscules (ex: 'shopping', 'loisirs', 'amazon', 'lundi')")

class AICreationStat(BaseModel):
    action: str = Field(description="Doit être 'CREATE' pour une création, 'UPDATE' pour une modification d'un indicateur existant, ou 'DELETE' si l'utilisateur veut le supprimer.")
    id: Optional[str] = Field(default=None, description="L'ID exact de l'indicateur existant si action='UPDATE' ou 'DELETE'. Laisser null si 'CREATE'.")
    titre: str = Field(description="Le titre de l'indicateur nettoyé (ex: 'Suivi Shopping')")
    flux_type: str = Field(description="Doit être 'depenses' ou 'revenus'")
    operateur: str = Field(description="Doit être 'AND' ou 'OR'")
    couleur: str = Field(description="Choisis parmi exclusivement: 'rose', 'amber', 'emerald', 'indigo', 'cyan', 'violet', 'blue', 'orange', 'red', 'fuchsia'")
    icone: str = Field(description="Choisis parmi exclusivement: 'fastfood', 'shopping', 'car', 'home', 'sub', 'salary', 'star', 'alert', 'health', 'leisure', 'crypto', 'tech', 'travel', 'gift'")
    regles: List[AISuggestedRule]

class ChatResponseSchema(BaseModel):
    reponse: str = Field(description="Ta réponse d'expert financier en Français au format Markdown (tableaux, gras, listes).")
    creation_stat: Optional[AICreationStat] = Field(default=None, description="Remplis cet objet si l'utilisateur demande explicitement de créer/suivre une stat OU s'il s'intéresse à une/plusieurs catégories/enseignes/jours spécifiques.")

# 2. La route modifiée
@app.post("/api/insights-chat")
def insights_chat(req: ChatRequest):
    print(f"--- 🚀 REQUÊTE REÇUE DU FRONTEND POUR GEMINI : {req.question} ---")
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        if not req.transactions:
            return {"reponse": "Je n'ai détecté aucune transaction à analyser ce mois-ci.", "creation_stat": None}

        payload_pour_gemini = []
        for t in req.transactions:
            payload_pour_gemini.append({
                "date": t.get("date"),
                "type": t.get("type") or ("revenus" if float(t.get("montant", 0)) > 0 else "depenses"),
                "cat": t.get("categorie"),
                "nom": t.get("nom"),
                "montant": float(t.get("montant") or 0)
            })

        system_instruction = f"""
        Tu es un analyste financier privé de haut niveau. Ton but est d'analyser les données et de configurer des filtres automatiques.
        
        Données de l'utilisateur :
        {json.dumps(payload_pour_gemini)}

        Indicateurs / Stats actuellement enregistrés par l'utilisateur :
        {json.dumps(req.custom_stats or [])}

        RÈGLE D'OR POUR L'OBJET 'creation_stat' (STRICTEMENT OBLIGATOIRE) :
        Dès que l'utilisateur pose une question centrée sur :
        1. Une enseigne ou un commerce spécifique (ex: UberEats, McDonald's, Amazon, Netflix...) -> champ="nom", condition="CONTAINS"
        2. Un mot-clé précis ou une catégorie (ex: Électricité, Loyers, Courses, Salaire...) -> champ="categorie" ou "nom"
        3. Un jour de la semaine en particulier (ex: "mes dépenses du lundi", "le dimanche"). 
           Si l'utilisateur cible un jour, utilise champ="jour", condition="EQUALS" et valeur="lundi" (en minuscules).
           Si l'utilisateur parle du "week-end", crée deux objets dans 'regles' avec l'opérateur "OR" : un pour "samedi" et un pour "dimanche".
        
        🌟 4. CAS SPÉCIAL DES ABONNEMENTS / CHARGES RÉCURRENTES :
        Si l'utilisateur te demande de suivre ses "abonnements", "charges récurrentes", "prélèvements" ou "charges fixes" :
        - Analyse TOUTES les données de l'utilisateur fournies ci-dessus.
        - Identifie TOUTES les transactions qui sont manifestement des abonnements ou des prélèvements (ex: Orange, Twitch, Mutuelle, Netflix, EDF, Loyer...).
        - Tu DOIS configurer l'objet `creation_stat` avec operateur="OR".
        - Dans la liste `regles`, crée UNE RÈGLE POUR CHAQUE ENSEIGNE d'abonnement ou prélèvement détectée.
          Exemple de format pour 'regles' si tu as détecté Orange et Twitch :
          [
            {{"champ": "nom", "condition": "CONTAINS", "valeur": "orange"}},
            {{"champ": "nom", "condition": "CONTAINS", "valeur": "twitch"}}
          ]
        - Mets comme titre : "Charges Récurrentes (IA)"

        🌟 5. CAS MULTI-CATÉGORIES OU MULTI-ENSEIGNES :
        Si l'utilisateur demande d'analyser ou de suivre plusieurs catégories ou enseignes ensemble (ex: "Shopping et Loisirs", "UberEats et McDo") :
        - Configuration de `creation_stat` avec operateur="OR".
        - Dans `regles`, crée UNE RÈGLE POUR CHAQUE catégorie ou enseigne ciblée.
        - Titre propre combinant les sujets (ex: "Shopping & Loisirs").

        🌟 6. MODIFICATION OU SUPPRESSION D'UN INDICATEUR EXISTANT :
        Si l'utilisateur demande de modifier un indicateur déjà existant (ex: "Retire les loisirs de l'indicateur Shopping & Loisirs" ou "Enlève UberEats") :
        - Repère l'indicateur correspondant dans la liste des indicateurs enregistrés ci-dessus.
        - Définis `action="UPDATE"` et reprends son `id` exact dans la propriété `id`.
        - Ajuste la liste `regles` en retirant ou ajoutant le critère demandé.
        - Met à jour le `titre` si nécessaire (ex: "Shopping & Loisirs" devient "Suivi Shopping").
        - Si l'utilisateur demande de supprimer complètement l'indicateur, mets `action="DELETE"` et indique son `id`.

        Tu AS L'OBLIGATION de remplir l'objet `creation_stat` pour lui créer ou adapter un indicateur permanent, MÊME s'il n'a pas dit explicitement les mots "créer" ou "sauvegarder".

        Règles de formatage globales pour l'objet JSON `creation_stat` :
        - action : "CREATE", "UPDATE" ou "DELETE"
        - id : L'ID string de la stat en cas de UPDATE/DELETE, sinon null
        - titre : Le nom propre nettoyé de l'enseigne ou du sujet
        - flux_type : "depenses" ou "revenus"
        - operateur : "OR"
        - regles : Une liste d'objets contenant chacun :
            * champ : "nom", "categorie" ou "jour"
            * condition : "CONTAINS", "EQUALS", "GREATER_THAN" ou "LESS_THAN"
            * valeur : La valeur cible en minuscules

        Si la question est globale (ex: "Combien j'ai dépensé au total ce mois-ci ?"), alors et seulement alors, tu laisses `creation_stat` vide.

        Règles d'esthétique pour 'couleur' et 'icone' (STRICTEMENT OBLIGATOIRE) :
        - Restauration rapide / Plaisirs coupables (McDo, UberEats, Bar...) -> couleur="rose", icone="fastfood"
        - Supermarché / Courses alimentaires récurrentes -> couleur="emerald", icone="shopping"
        - Abonnements / Prélèvements / Licences (Netflix, Spotify, Internet...) -> couleur="indigo", icone="sub"
        - Revenu / Salaire / Remboursement reçu -> couleur="emerald", icone="salary"
        - Voiture / Essence / Péage / Transports en commun -> couleur="cyan", icone="car"
        - Logement / Loyer / Électricité / Meubles -> couleur="blue", icone="home"
        - Santé / Pharmacie / Docteur / Mutuelle -> couleur="red", icone="health"
        - Sorties / Cinéma / Concerts / Musées / Loisirs -> couleur="fuchsia", icone="leisure"
        - Épargne / Bourse / Crypto-monnaies / Investissements -> couleur="violet", icone="crypto"
        - Technologie / Matériel informatique / Gadgets / Jeux-Vidéo -> couleur="orange", icone="tech"
        - Voyages / Vacances / Billets d'avion / Hôtel -> couleur="cyan", icone="travel"
        - Cadeaux / Dons / Anniversaires -> couleur="rose", icone="gift"
        - Danger / Alerte / Frais bancaires ou anomalies -> couleur="red", icone="alert"
        - Cas générique / Non classé -> couleur="amber", icone="star"
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=req.question,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=ChatResponseSchema,
            )
        )

        import json as python_json
        result_data = python_json.loads(response.text)
        return result_data

    except Exception as e:
        error_str = str(e)
        print(f"❌ CRASH ROUTE AI: {error_str}")
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {
                "reponse": "⚠️ **Quota Gemini épuisé pour aujourd'hui**.",
                "creation_stat": {}
            }
        raise HTTPException(status_code=500, detail=error_str)
    




class ConseilCategorie(BaseModel):
  categorie: str = Field(description='Nom de la catégorie visée')
  depense_actuelle: float = Field(
      description='Montant dépensé ce mois-ci dans cette catégorie'
  )
  economie_potentielle: float = Field(
      description='Montant réaliste économisable le mois prochain'
  )
  action_concrete: str = Field(
      description='Conseil court et ultra-spécifique (1 à 2 phrases max)'
  )


class PermanentSavingsIndicatorResponse(BaseModel):
  potentiel_total: float = Field(
      description='Somme globale des économies identifiées'
  )
  score_sante_budget: str = Field(
      description='Évaluation globale courte (ex: Bon, À surveiller, Critique)'
  )
  conseils: list[ConseilCategorie] = Field(
      description='Liste des 2 à 3 meilleures opportunités d’économies'
  )


# 1. Initialisation du client Gemini (pense à bien définir GEMINI_API_KEY dans tes variables d'environnement)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


@app.post(
    '/api/indicators/savings-analysis',
    response_model=PermanentSavingsIndicatorResponse,
)
def get_savings_indicator(data: dict):
    system_prompt = """
    Tu es un assistant financier intégré à un tableau de bord.
    Ta mission est d'analyser le panier de dépenses mensuel et d'extraire AUTOMATIQUEMENT les 2 ou 3 postes d'économies les plus pertinents pour le mois prochain.
    Reste synthétique, pragmatique et focalise-toi sur des gains réels.
    """

    prompt_user = f"""
    Mois : {data.get('mois')} {data.get('annee')}
    Total des dépenses : {data.get('total_depenses')}€
    Dépenses par catégorie : {json.dumps(data.get('categories'))}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_user,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type='application/json',
                response_schema=PermanentSavingsIndicatorResponse,
                temperature=0.2,
            ),
        )

        # Avec response_schema, response.text contient déjà du JSON valide
        return json.loads(response.text)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




class SimulationLineCreate(BaseModel):
    id: int = None  # Ajout de l'ID optionnel pour l'éventuelle modification directe
    utilisateur: str
    scenario: str
    titre: str
    flux_type: str
    categorie: str
    montant: float
    frequence: str
    cible: str

@app.post("/api/simulation-demenagement")
def add_or_update_simulation_line(line: SimulationLineCreate):
    clean_username = line.utilisateur.lower().strip()
    
    # 1. On cherche d'abord si la ligne existe déjà
    check_query = text("""
        SELECT id FROM simulations_demenagement 
        WHERE LOWER(utilisateur) = :u AND scenario = :sc AND titre = :t
    """)
    
    try:
        with engine.begin() as conn:
            result = conn.execute(check_query, {
                "u": clean_username,
                "sc": line.scenario,
                "t": line.titre
            })
            existing_row = result.fetchone()
            
            if existing_row:
                # 2. Si elle existe, on fait un UPDATE
                existing_id = existing_row[0]
                update_query = text("""
                    UPDATE simulations_demenagement 
                    SET montant = :m, frequence = :freq, categorie = :c, flux_type = :f, cible = :cible
                    WHERE id = :id
                """)
                conn.execute(update_query, {
                    "id": existing_id,
                    "m": line.montant,
                    "freq": line.frequence,
                    "c": line.categorie,
                    "f": line.flux_type,
                    "cible": line.cible
                })
                return {"id": existing_id, "status": "success"}
                
            else:
                # 3. Si elle n'existe pas, on fait un INSERT classique
                insert_query = text("""
                    INSERT INTO simulations_demenagement (utilisateur, scenario, titre, flux_type, categorie, montant, frequence, cible)
                    VALUES (:u, :sc, :t, :f, :c, :m, :freq, :cible)
                    RETURNING id
                """)
                insert_result = conn.execute(insert_query, {
                    "u": clean_username,
                    "sc": line.scenario,
                    "t": line.titre,
                    "f": line.flux_type,
                    "c": line.categorie,
                    "m": line.montant,
                    "freq": line.frequence,
                    "cible": line.cible
                })
                new_id = insert_result.fetchone()[0]
                return {"id": new_id, "status": "success"}
                
    except Exception as e:
        print(f"❌ Erreur lors du POST : {str(e)}")  # Cela s'affichera dans ton terminal FastAPI
        raise HTTPException(status_code=500, detail=f"Erreur base de données : {str(e)}")

@app.get("/api/simulation-demenagement/{username}")
def get_simulation_demenagement(username: str):
    query = text("""
        SELECT id, scenario, titre, flux_type, categorie, montant, frequence, cible 
        FROM simulations_demenagement 
        WHERE LOWER(utilisateur) = :u
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": username.lower().strip()})
            columns = result.keys()
            # Utilisation d'une compréhension de dictionnaire plus moderne/robuste
            return [dict(zip(columns, row)) for row in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/simulation-demenagement/{line_id}")
def delete_simulation_line(line_id: int):
    query = text("DELETE FROM simulations_demenagement WHERE id = :id")
    try:
        with engine.begin() as conn:
            result = conn.execute(query, {"id": line_id})
            # Optionnel : vérifier si la ligne existait vraiment
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Ligne introuvable")
                
        return {"status": "success"}
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/api/simulation-demenagement/{username}/{scenario_name}")
def delete_scenario(username: str, scenario_name: str):
    # 1. Nettoyage complet des chaînes
    decoded_scenario = unquote(scenario_name).strip()
    
    # Remplacer les espaces insécables (\u00a0 ou \u202f) par des espaces normaux
    decoded_scenario = re.sub(r'[\u00a0\u202f\s]+', ' ', decoded_scenario).strip()
    clean_username = username.lower().strip()

    # 2. Requête SQL tolérante aux espaces et à la casse
    # On applique un LOWER() sur l'utilisateur et un TRIM sur le scénario au cas où
    query = text("""
        DELETE FROM simulations_demenagement 
        WHERE LOWER(utilisateur) = :u 
          AND (TRIM(scenario) = :sc OR REGEXP_REPLACE(scenario, '[\u00a0\s]+', ' ', 'g') = :sc)
    """)
    
    try:
        with engine.begin() as conn:
            result = conn.execute(query, {
                "u": clean_username,
                "sc": decoded_scenario
            })
            
            # Si la requête exacte échoue, on tente une suppression plus large avec LIKE
            if result.rowcount == 0:
                fallback_query = text("""
                    DELETE FROM simulations_demenagement 
                    WHERE LOWER(utilisateur) = :u 
                      AND scenario LIKE :sc_like
                """)
                # On cherche "Loyer%900%€" en remplaçant les espaces par des jokers %
                like_pattern = f"%{decoded_scenario.replace(' ', '%')}%"
                result = conn.execute(fallback_query, {
                    "u": clean_username,
                    "sc_like": like_pattern
                })

            if result.rowcount == 0:
                print(f"⚠️ Aucun match trouvé pour l'utilisateur '{clean_username}' et le scénario '{decoded_scenario}'")
                raise HTTPException(status_code=404, detail="Scénario introuvable")
                
        return {"status": "success", "message": f"{result.rowcount} lignes supprimées."}
    except HTTPException as http_err:
        raise http_err
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

class NoteUpdate(BaseModel):
    utilisateur: str
    contenu: str

@app.get("/api/notes-demenagement/{username}")
def get_user_notes(username: str):
    query = text("SELECT contenu FROM notes_demenagement WHERE LOWER(utilisateur) = :u")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": username.lower().strip()})
            row = result.fetchone()
            # Si l'utilisateur n'a pas encore de note, on renvoie une chaîne vide
            return {"contenu": row[0] if row else ""}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notes-demenagement")
def save_user_notes(note: NoteUpdate):
    clean_username = note.utilisateur.lower().strip()
    now_utc = datetime.now(timezone.utc)
    
    # 1. On vérifie si l'utilisateur existe déjà
    check_query = text("SELECT utilisateur FROM notes_demenagement WHERE LOWER(utilisateur) = :u")
    
    try:
        with engine.begin() as conn: # engine.begin() gère le commit automatiquement
            exists = conn.execute(check_query, {"u": clean_username}).fetchone()
            
            if exists:
                # Mode UPDATE
                query = text("""
                    UPDATE notes_demenagement 
                    SET contenu = :c, mis_a_jour_le = :now 
                    WHERE LOWER(utilisateur) = :u
                """)
            else:
                # Mode INSERT
                query = text("""
                    INSERT INTO notes_demenagement (utilisateur, contenu, mis_a_jour_le) 
                    VALUES (:u, :c, :now)
                """)
                
            conn.execute(query, {
                "u": clean_username,
                "c": note.contenu,
                "now": now_utc
            })
            
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    
POWENS_CLIENT_ID = os.getenv("POWENS_CLIENT_ID")
POWENS_CLIENT_SECRET = os.getenv("POWENS_CLIENT_SECRET")
POWENS_DOMAIN = os.getenv("POWENS_DOMAIN", "https://kleea-sandbox.biapi.pro/2.0").rstrip("/")

# Nom d'hôte nettoyé uniquement pour le paramètre ?domain= de la Webview
POWENS_DOMAIN_HOST = POWENS_DOMAIN.replace("https://", "").replace("http://", "").split("/")[0]


@app.get("/powens/connect-url")
def get_connect_url(utilisateur: str, redirect_url: str, user_token: str = None):
    """
    Génère l'URL Powens Webview. 
    Si user_token est fourni et valide, génère un code temporaire pour RATTACHER la banque au profil existant.
    """
    try:
        encoded_redirect = quote(redirect_url, safe="")
        encoded_state = quote(utilisateur, safe="")

        domain = POWENS_DOMAIN.rstrip('/')
        if not domain.endswith('/2.0') and not domain.endswith('/v2'):
            domain += '/2.0'

        webview_url = (
            f"https://webview.powens.com/fr/connect"
            f"?domain={POWENS_DOMAIN_HOST}"
            f"&client_id={POWENS_CLIENT_ID}"
            f"&redirect_uri={encoded_redirect}"
            f"&state={encoded_state}"
        )

        # 🟢 Vérification : user_token ne doit être ni None, ni "null", ni vide
        if user_token and user_token.strip() and user_token != "null":
            # ⚠️ Powens attend un GET pour /auth/token/code
            code_res = requests.get(
                f"{domain}/auth/token/code",
                headers={"Authorization": f"Bearer {user_token}"}
            )
            
            if code_res.status_code == 200:
                temp_code = code_res.json().get("code")
                # En passant ce code à la Webview, Powens SAIT qu'il faut ajouter
                # la banque à l'utilisateur possédant ce token
                webview_url += f"&code={temp_code}"
            else:
                print(f"⚠️ Échec génération code temporaire Powens ({code_res.status_code}): {code_res.text}")

        return {"url": webview_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Webview: {str(e)}")


@app.get("/powens/callback")
def powens_callback(code: str, redirect_uri: str = None, state: str = None):
    """
    Échange le code de la WebView contre un access_token.
    """
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'

    url = f"{domain}/auth/token/access"
    
    payload = {
        "grant_type": "authorization_code",
        "client_id": POWENS_CLIENT_ID,
        "client_secret": POWENS_CLIENT_SECRET,
        "code": code
    }

    if redirect_uri:
        payload["redirect_uri"] = redirect_uri

    headers = {"Content-Type": "application/json"}
    res = requests.post(url, json=payload, headers=headers)

    if res.status_code != 200:
        print(f"❌ ERREUR POWENS {res.status_code}: {res.text}")
        raise HTTPException(
            status_code=res.status_code, 
            detail=f"Échec échange token Powens ({res.status_code}): {res.text}"
        )

    data = res.json()
    access_token = data.get("access_token") or data.get("token")

    # 🟢 AJOUT : Sauvegarde automatique du token dans la table users si 'state' (l'utilisateur) est présent
    if state and access_token:
        try:
            update_query = text("""
                UPDATE users 
                SET powens_token = :token 
                WHERE username = :username OR email = :username
            """)
            with engine.connect() as conn:
                conn.execute(update_query, {"token": access_token, "username": state})
                conn.commit()
        except Exception as e:
            print(f"⚠️ Erreur lors de l'enregistrement automatique du token en BDD : {e}")

    return {
        "access_token": access_token,
        "utilisateur": state
    }


@app.get("/powens/accounts")
def get_powens_accounts(user_token: str):
    """
    Récupère la liste de tous les comptes bancaires de l'utilisateur.
    """
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    url = f"{domain}/users/me/accounts"
    headers = {"Authorization": f"Bearer {user_token}"}

    res = requests.get(url, headers=headers)

    if res.status_code != 200:
        raise HTTPException(
            status_code=res.status_code, 
            detail=f"Erreur récupération comptes Powens: {res.text}"
        )

    accounts = res.json().get("accounts", [])
    
    return [
        {
            "id": acc.get("id"),
            "name": acc.get("name"),
            "original_name": acc.get("original_name"),
            "balance": acc.get("balance"),
            "bank_name": acc.get("bank", {}).get("name") if isinstance(acc.get("bank"), dict) else None
        }
        for acc in accounts
    ]

def get_powens_transactions(user_token: str):
    """
    Récupère la liste des transactions brutes depuis l'API Powens.
    """
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    url = f"{domain}/users/me/transactions"
    headers = {
        "Authorization": f"Bearer {user_token}"
    }
    
    # 🟢 AJOUT DU PARAMÈTRE LIMIT
    params = {
        "limit": 1000  # Powens requiert obligatoirement d'expliciter ce paramètre
    }

    res = requests.get(url, headers=headers, params=params)

    if res.status_code != 200:
        raise Exception(f"Powens API Error ({res.status_code}): {res.text}")

    data = res.json()
    # Powens renvoie généralement un objet { "transactions": [...] }
    return data.get("transactions", [])


def normalize_powens_transactions(
    powens_txs, 
    utilisateur: str, 
    compte_nom: str, 
    target_account_id: str = None,
    date_debut: str = None, # Format "YYYY-MM-DD"
    date_fin: str = None   # Format "YYYY-MM-DD"
):
    mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"]
    normalized = []

    target_id_str = str(target_account_id).strip() if target_account_id else None

    # Conversion des bornes si fournies
    dt_debut = datetime.strptime(date_debut, '%Y-%m-%d') if date_debut else None
    dt_fin = datetime.strptime(date_fin, '%Y-%m-%d').replace(hour=23, minute=59, second=59) if date_fin else None

    # Fallback par défaut : si aucune date n'est transmise, prendre le mois en cours
    if not dt_debut and not dt_fin:
        aujourdhui = datetime.now()
        dt_debut = aujourdhui.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        dt_fin = aujourdhui

    for tx in powens_txs:
        # 1. Filtrage par ID Compte
        tx_account_id = str(tx.get("id_account")).strip() if tx.get("id_account") is not None else None
        if target_id_str and tx_account_id:
            if tx_account_id != target_id_str:
                continue

        # 2. Filtrage par Date
        raw_date = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0]
        try:
            dt = datetime.strptime(raw_date, '%Y-%m-%d')
        except ValueError:
            continue

        if dt_debut and dt < dt_debut:
            continue
        if dt_fin and dt > dt_fin:
            continue

        # Normalisation
        montant_float = float(tx.get("value", 0.0))
        libelle = (
            tx.get("simplified_wording") or 
            tx.get("wording") or 
            tx.get("raw_wording") or 
            "Transaction Inconnue"
        )

        normalized.append({
            "date": dt.strftime('%Y-%m-%d'),
            "nom": libelle.strip(),
            "montant": montant_float,
            "categorie": "❓ Autre",
            "utilisateur": utilisateur.lower(),
            "compte": compte_nom,
            "mois": mois_fr[dt.month - 1],
            "annee": int(dt.year)
        })

    return normalized


def get_mots_cles_rules(utilisateur: str):
    """Charge les règles de mots-clés configurées pour un utilisateur (avec fallback admin)."""
    mots_cles_rules = []
    try:
        with engine.connect() as conn:
            query_cat = text("""
                SELECT categorie, mots_cles, utilisateur 
                FROM config_categories 
                WHERE utilisateur = :u OR utilisateur = 'admin'
            """)
            result = conn.execute(query_cat, {"u": utilisateur}).fetchall()
            
            temp_rules = {}
            for row in result:
                cat_name, raw_keywords, owner = row
                if raw_keywords:
                    keywords_str = str(raw_keywords).replace('{', '').replace('}', '').replace('"', '')
                    keywords_list = [m.strip().lower() for m in keywords_str.split(',') if m.strip()]
                    
                    if cat_name not in temp_rules or owner == utilisateur:
                        temp_rules[cat_name] = keywords_list
            
            for cat, keys in temp_rules.items():
                mots_cles_rules.append({"categorie": cat, "keywords": keys})
    except Exception as e:
        print(f"Erreur chargement mots_cles: {e}")
    
    return mots_cles_rules

@app.get("/import-powens")
async def import_powens(
    utilisateur: str, 
    user_token: str, 
    account_id: str = None, 
    compte_nom: str = "Powens",
    date_debut: str = None,
    date_fin: str = None
):
    try:
        powens_raw = get_powens_transactions(user_token)

        transactions_brutes = normalize_powens_transactions(
            powens_raw, 
            utilisateur, 
            compte_nom, 
            target_account_id=account_id,
            date_debut=date_debut,
            date_fin=date_fin
        )

        mots_cles_rules = get_mots_cles_rules(utilisateur)
        memoire_rules = get_memoire(utilisateur)

        transactions_pretes = []
        
        # --- TRAITEMENT DES RÈGLES DE CATÉGORISATION ---
        for t in transactions_brutes:
            nom_t = t["nom"]
            montant_float = t["montant"]
            nom_t_lower = nom_t.lower()
            texte_integral_upper = nom_t.upper()
            cat = "❓ Autre"

            # A. 💡 Priorité 1 : VIREMENTS INTERNES (Logique dynamique automatisée)
            if any(k in texte_integral_upper for k in ["VERS ", "VIR MME FONTA AUDE", "TO ", "VIREMENT"]):
                # Détection automatique du livret cible dans le libellé brut de Powens
                types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL"]
                type_cible = next((t for t in types_epargne if t in texte_integral_upper), None)
                
                if type_cible:
                    if montant_float < 0: # Débit : Argent envoyé du compte courant vers l'épargne
                        cat = f"🔄 Virement : CCP vers {type_cible}"
                    else: # Crédit : Argent retiré de l'épargne vers le compte courant
                        cat = f"🔄 Virement : {type_cible} vers CCP"
                else:
                    cat = "🔄 Transfert Interne"

            # B. Priorité 2 : Mémoire Apprise
            if cat == "❓ Autre":
                nom_t_normalise = " ".join(nom_t_lower.split())
                for m in memoire_rules:
                    nom_memoire_clean = " ".join(m["nom"].lower().split())
                    if nom_memoire_clean in nom_t_normalise:
                        cat = m["categorie"]
                        break

            # C. Priorité 3 : Mots-Clés (Intelligence)
            if cat == "❓ Autre":
                for rule in mots_cles_rules:
                    matched = False
                    for raw_k in rule["keywords"]:
                        parts = raw_k.split(':')
                        keyword_clean = parts[0].strip().lower()
                        filtre_signe = parts[1].strip().lower() if len(parts) > 1 else "both"

                        if not keyword_clean:
                            continue

                        if keyword_clean in nom_t_lower:
                            match_positif = (filtre_signe == "positive" and montant_float > 0)
                            match_negatif = (filtre_signe == "negative" and montant_float < 0)
                            match_deux = (filtre_signe in ["both", "all"])

                            if match_positif or match_negatif or match_deux:
                                matched = True
                                cat = rule["categorie"]
                                break
                    if matched:
                        break

            t["categorie"] = cat
            transactions_pretes.append(t)

        return transactions_pretes

    except Exception as e:
        error_msg = str(e)
        print(f"Erreur Sync Powens : {error_msg}")
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=401, 
                detail="Jeton Powens invalide ou expiré. Veuillez reconnecter votre compte bancaire."
            )
        raise HTTPException(status_code=500, detail=error_msg)

# 🟢 VERSION SÉCURISÉE : IDENTIFICATION STRICTE PAR ID_CONNECTOR (NE MÉLANGE JAMAIS 2 BANQUES)
@app.get("/powens/connections-and-accounts")
def get_connections_and_accounts(user_token: str):
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}

    # 1. 🟢 CRUCIAL : ?expand=connector pour récupérer le connecteur et son nom réel
    conn_res = requests.get(f"{domain}/users/me/connections?expand=connector", headers=headers)
    connections = conn_res.json().get("connections", []) if conn_res.status_code == 200 else []

    valid_connections = [c for c in connections if not c.get("deleted")]
    valid_connections.sort(key=lambda x: x.get("id", 0), reverse=True)

    unique_connections = {}
    for c in valid_connections:
        # 🟢 On groupe par l'ID technique du connecteur bancaire (ex: LBP != Revolut)
        connector_id = c.get("id_connector") or (c.get("connector", {}).get("id")) or c.get("id")
        conn_name = c.get("connector", {}).get("name") or f"Banque #{connector_id}"

        if connector_id not in unique_connections:
            unique_connections[connector_id] = {
                "id": c.get("id"),
                "connector_id": connector_id,
                "connector_name": conn_name,
                "state": c.get("state"),
                "last_update": c.get("last_update")
            }

    filtered_connections = list(unique_connections.values())
    active_conn_ids = {c["id"] for c in filtered_connections}

    # 2. Récupération des comptes
    acc_res = requests.get(f"{domain}/users/me/accounts", headers=headers)
    accounts = acc_res.json().get("accounts", []) if acc_res.status_code == 200 else []

    filtered_accounts = []
    seen_account_names = set()

    accounts.sort(key=lambda x: x.get("id", 0), reverse=True)

    for a in accounts:
        if a.get("deleted") or a.get("disabled"):
            continue

        conn_id = a.get("connection_id") or a.get("id_connection")
        if conn_id not in active_conn_ids:
            continue

        raw_name = a.get("name", "").strip()
        dedup_key = f"{conn_id}_{raw_name.upper()}"
        if dedup_key in seen_account_names:
            continue
        seen_account_names.add(dedup_key)

        filtered_accounts.append({
            "id": a.get("id"),
            "connection_id": conn_id,
            "name": raw_name,
            "balance": a.get("balance"),
            "currency": a.get("currency", {}).get("symbol", "€") if isinstance(a.get("currency"), dict) else "€",
            "bank_name": a.get("company_name") or a.get("connector", {}).get("name")
        })

    return {
        "connections_count": len(filtered_connections),
        "connections": filtered_connections,
        "accounts_count": len(filtered_accounts),
        "accounts": filtered_accounts
    }


class SavePowensTokenRequest(BaseModel):
    utilisateur: str
    user_token: str

@app.post("/powens/sauvegarder-token")
def sauvegarder_token(req: SavePowensTokenRequest):
    query = text("""
        UPDATE users 
        SET powens_token = :token 
        WHERE LOWER(username) = LOWER(:username) OR LOWER(email) = LOWER(:username)
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"token": req.user_token, "username": req.utilisateur})
            conn.commit()
            
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
                
        return {"status": "success", "message": "Token Powens sauvegardé en BDD."}
        
    except Exception as e:
        raise e


@app.get("/powens/recuperer-token")
def recuperer_token(utilisateur: str):
    query = text("""
        SELECT powens_token 
        FROM users 
        WHERE LOWER(username) = LOWER(:username) OR LOWER(email) = LOWER(:username)
    """)
    
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"username": utilisateur}).fetchone()
            
            if not result or not result[0]:
                return {"status": "success", "user_token": None}
                
            token_bdd = result[0]
            
        return {"status": "success", "user_token": token_bdd}
        
    except Exception as e:
        raise e

@app.get("/powens/transactions")
def read_powens_transactions(user_token: str):
    """
    Endpoint exposé au Front-end pour récupérer les transactions depuis Powens.
    """
    try:
        transactions = get_powens_transactions(user_token)
        return {"transactions": transactions}
    except Exception as e:
        error_msg = str(e)
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=401, 
                detail="Jeton Powens invalide ou expiré."
            )
        raise HTTPException(status_code=500, detail=error_msg)




class PropagateYearRequest(BaseModel):
    ids: List[int]
    utilisateur: Any  # 💡 Accepte une chaîne de caractères OU un dictionnaire/objet
    mois_actuel: Any  # 💡 Accepte une chaîne ou un entier
    annee: Any        # 💡 Accepte une chaîne ou un entier

@app.post("/api/previsions/propagate-year")
def propagate_previsions_year(req: PropagateYearRequest):
    # 💡 1. DICTIONNAIRE IMBRIQUÉ : Traduction du français en chiffres
    MONTH_NAME_TO_INT = {
        "janvier": 1, "jan": 1, "jan.": 1,
        "fevrier": 2, "fev": 2, "février": 2, "fév.": 2,
        "mars": 3, "mar": 3, "mar.": 3,
        "avril": 4, "avr": 4, "avr.": 4,
        "mai": 5,
        "juin": 6, "jui": 6, "jui.": 6,
        "juillet": 7, "juil": 7, "juil.": 7,
        "aout": 8, "aout.": 8, "août": 8, "août.": 8,
        "septembre": 9, "sep": 9, "sept": 9, "sept.": 9,
        "octobre": 10, "oct": 10, "oct.": 10,
        "novembre": 11, "nov": 11, "nov.": 11,
        "decembre": 12, "dec": 12, "décembre": 12, "déc.": 12
    }

    # 💡 2. LISTE IMBRIQUÉE : Traduction des index en noms sans accents
    MONTH_INT_TO_NAME = [
        "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"
    ]

    # 💡 3. CALCULATEUR IMBRIQUÉ : Dernier jour du mois (sans import)
    def get_last_day_of_month(year: int, month: int) -> int:
        if month == 2:
            is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
            return 29 if is_leap else 28
        return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]

    try:
        user_clean = req.utilisateur.lower().strip()
        
        # 1. AUTO-DÉTECTION DYNAMIQUE DE LA TABLE (previsions ou previsionnel)
        table_name = "previsions"
        with engine.connect() as conn:
            try:
                conn.execute(text("SELECT 1 FROM previsions LIMIT 1"))
                table_name = "previsions"
            except Exception:
                try:
                    conn.execute(text("SELECT 1 FROM previsionnel LIMIT 1"))
                    table_name = "previsionnel"
                except Exception as e_table:
                    print("ERREUR DIAGNOSTIQUE TABLE SQL INTROUVABLE")
                    raise HTTPException(
                        status_code=500, 
                        detail=f"La table de prévisions (previsions ou previsionnel) n'a pas pu être trouvée. Erreur SQL : {str(e_table)}"
                    )

        # 2. AUTO-DÉTECTION DE LA COLONNE DE DÉSIGNATION (nom, libellé ou libelle)
        column_name = "nom"
        with engine.connect() as conn:
            try:
                conn.execute(text(f"SELECT nom FROM {table_name} LIMIT 1"))
                column_name = "nom"
            except Exception:
                try:
                    conn.execute(text(f"SELECT libellé FROM {table_name} LIMIT 1"))
                    column_name = "libellé"
                except Exception:
                    try:
                        conn.execute(text(f"SELECT libelle FROM {table_name} LIMIT 1"))
                        column_name = "libelle"
                    except Exception as e_col:
                        raise HTTPException(
                            status_code=500, 
                            detail=f"Impossible d'identifier la colonne de désignation (nom, libellé, libelle) dans la table '{table_name}'. Erreur : {str(e_col)}"
                        )

        # 3. AUTO-DÉTECTION DE LA COLONNE D'ANNÉE (année ou annee)
        year_column = "année"
        with engine.connect() as conn:
            try:
                conn.execute(text(f"SELECT année FROM {table_name} LIMIT 1"))
                year_column = "année"
            except Exception:
                try:
                    conn.execute(text(f"SELECT annee FROM {table_name} LIMIT 1"))
                    year_column = "annee"
                except Exception:
                    year_column = "année"

        # 4. RÉCUPÉRATION DES PRÉVISIONS SOURCES
        query_fetch = text(f"""
            SELECT id, date, {column_name} as nom, montant, categorie, compte, actif, utilisateur
            FROM {table_name} 
            WHERE id IN :ids AND LOWER(utilisateur) = :u
        """)
        
        with engine.connect() as conn:
            res = conn.execute(query_fetch, {"ids": tuple(req.ids), "u": user_clean}).mappings().all()
            previsions_sources = [dict(r) for r in res]
            
        if not previsions_sources:
            raise HTTPException(status_code=404, detail="Aucun mouvement d'origine trouvé pour ces identifiants.")

        # SÉCURISATION DU MOIS
        mois_raw = str(req.mois_actuel)
        mois_normalise = mois_raw.lower().strip()
        mois_normalise = mois_normalise.replace('é', 'e').replace('û', 'u').replace('ô', 'o').replace('è', 'e')
        
        if mois_normalise.isdigit():
            current_month_int = int(mois_normalise)
        else:
            current_month_int = MONTH_NAME_TO_INT.get(mois_normalise)
            if not current_month_int:
                current_month_int = next((v for k, v in MONTH_NAME_TO_INT.items() if k in mois_normalise), None)

        if not current_month_int:
            raise HTTPException(status_code=400, detail=f"Mois actuellement non reconnu : {req.mois_actuel}")

        if current_month_int >= 12:
            return {"status": "success", "inserted_count": 0, "message": "Déjà sur le mois de Décembre."}

        new_rows = []
        target_year = int(req.annee)

        # 5. BOUCLE DE DUPLICATION DE MASSE
        for prev in previsions_sources:
            original_date = prev["date"]
            if isinstance(original_date, str):
                dt_orig = date.fromisoformat(original_date.split(" ")[0])
            else:
                dt_orig = original_date
                
            orig_day = dt_orig.day

            for m_idx in range(current_month_int + 1, 13):
                try:
                    target_date = date(target_year, m_idx, orig_day)
                except ValueError:
                    last_day = get_last_day_of_month(target_year, m_idx)
                    target_date = date(target_year, m_idx, last_day)

                target_month_name = MONTH_INT_TO_NAME[m_idx]

                new_rows.append({
                    "d": target_date,
                    "n": prev["nom"],
                    "m": prev["montant"],
                    "cat": prev["categorie"],
                    "c": prev["compte"],
                    "a": prev["actif"],
                    "u": prev["utilisateur"],
                    "mois": target_month_name,
                    "annee": target_year
                })

        # 6. INSERTION DE MASSE (BULK INSERT) DANS LA BONNE TABLE/COLONNE
        query_insert = text(f"""
            INSERT INTO {table_name} (date, {column_name}, montant, categorie, compte, actif, utilisateur, mois, {year_column})
            VALUES (:d, :n, :m, :cat, :c, :a, :u, :mois, :annee)
            ON CONFLICT ON CONSTRAINT constraint_prev DO NOTHING
        """)
        
        with engine.begin() as conn:
            for row in new_rows:
                conn.execute(query_insert, row)
                
        return {"status": "success", "inserted_count": len(new_rows)}

    except HTTPException as he:
        raise he
    except Exception as e:
        print("====== ERREUR CRASH PROPAGATION ======")
        traceback.print_exc()
        print("======================================")
        raise HTTPException(status_code=500, detail=f"Erreur interne de propagation: {str(e)}")



def clean_text_for_matching(text_val: str) -> str:
    """Nettoie le texte pour faciliter la comparaison (sans accents, sans chiffres parasites)."""
    if not text_val:
        return ""
    text_val = text_val.lower()
    # Supprime les accents
    text_val = "".join(c for c in unicodedata.normalize('NFD', text_val) if unicodedata.category(c) != 'Mn')
    # Supprime les dates (ex: 25/08, 25.08, 2026)
    text_val = re.sub(r'\d+[\/\.]\d+([\/\.]\d+)?', '', text_val)
    # Supprime les numéros de carte ou identifiants longs
    text_val = re.sub(r'cb\s*\d+|carte\s*n[o°]\s*\d+|\b\d{6,}\b', '', text_val)
    # Nettoie les espaces multiples
    text_val = " ".join(text_val.split())
    return text_val

def check_is_duplicate(conn, user: str, date_str: str, montant: float, label: str) -> bool:
    """
    Vérifie si une transaction similaire existe déjà dans une fenêtre de +/- 3 jours
    avec le même montant exact et un libellé similaire.
    """
    tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_window = tx_date - timedelta(days=3)
    end_window = tx_date + timedelta(days=3)
    
    # Récupérer les transactions existantes sur cette période pour cet utilisateur
    query = text("""
        SELECT nom, montant FROM transactions 
        WHERE LOWER(utilisateur) = :u 
        AND date BETWEEN :start AND :end
        AND ABS(montant - :m) < 0.01
    """)
    
    candidates = conn.execute(query, {
        "u": user.lower(),
        "start": start_window,
        "end": end_window,
        "m": montant
    }).fetchall()
    
    if not candidates:
        return False
        
    cleaned_new = clean_text_for_matching(label)
    
    for db_nom, db_montant in candidates:
        cleaned_db = clean_text_for_matching(db_nom)
        # Si l'un des deux noms est contenu dans l'autre ou s'ils sont proches
        if cleaned_new in cleaned_db or cleaned_db in cleaned_new or len(set(cleaned_new.split()) & set(cleaned_db.split())) >= 2:
            return True
            
    return False

# 🟢 FONCTION UTILITAIRE : MAPPING UNIVERSEL POWENS -> KLEEA (NOM, IBAN, NUMÉRO, ID)
def build_powens_account_id_to_kleea_map(powens_accounts: list, config_rows: list) -> dict:
    """
    Associe de manière infaillible l'ID technique Powens (str) au compte Kleea local (str),
    que l'utilisateur ait renseigné le nom Powens, un IBAN, un numéro de compte ou un ID.
    """
    mapping = {}
    for acc in powens_accounts:
        acc_id = str(acc.get("id"))
        acc_name = str(acc.get("name") or "").strip().upper()
        acc_name_compact = acc_name.replace(" ", "")
        acc_iban = str(acc.get("iban") or "").strip().upper().replace(" ", "")
        acc_number = str(acc.get("number") or "").strip().upper().replace(" ", "")

        for row in config_rows:
            local_compte = row[0]
            k_link = str(row[1] or "").strip().upper().replace(" ", "")
            if not k_link:
                continue

            # Correspondance flexible (ID, Nom, IBAN ou Numéro de compte)
            is_match = (
                k_link == acc_id or 
                k_link == acc_name_compact or 
                k_link in acc_name_compact or 
                acc_name_compact in k_link or
                (acc_iban and (k_link == acc_iban or k_link in acc_iban or acc_iban in k_link)) or
                (acc_number and (k_link == acc_number or k_link in acc_number or acc_number in k_link))
            )

            if is_match:
                mapping[acc_id] = local_compte
                break
    return mapping


# 🟢 1. VÉRIFICATION STRICTE DU MOIS EN COURS (ÉLIMINE LES DIZAINES DE MOIS PASSÉS)
@app.get("/powens/check-sync/{username}")
def check_sync_status(username: str):
    user_clean = username.lower().strip()
    is_test_user = (user_clean == "test")

    # 1. Token utilisateur
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            return {"has_pending": False, "count": 0, "accounts": {}}
        user_token = res[0]

        # 2. Configurations Kleea
        query_config = text("SELECT compte, powens_name FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()
        if not config_rows:
            return {"has_pending": False, "count": 0, "accounts": {}}

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers)
        powens_accounts = res_acc.json().get("accounts", [])
        powens_txs = get_powens_transactions(user_token)
    except Exception as e:
        print(f"❌ [CHECK-SYNC] Erreur API Powens: {e}")
        return {"has_pending": False, "count": 0, "accounts": {}, "error": str(e)}

    # Mapping universel ID Powens -> Compte Kleea
    acc_id_to_kleea = build_powens_account_id_to_kleea_map(powens_accounts, config_rows)
    if not acc_id_to_kleea:
        return {"has_pending": False, "count": 0, "accounts": {}}

    # 3. Répertoire exact des transactions en BDD
    with engine.connect() as conn:
        query_existing = text("""
            SELECT date, nom, montant, compte FROM transactions WHERE LOWER(utilisateur) = LOWER(:u)
        """)
        existing_rows = conn.execute(query_existing, {"u": user_clean}).fetchall()
        db_existing_set = set()
        for r in existing_rows:
            d_str = str(r[0]).split(" ")[0]
            n_str = str(r[1] or "").strip().upper()
            m_val = round(float(r[2]), 2)
            c_val = str(r[3] or "").strip().upper()
            db_existing_set.add((d_str, m_val, n_str, c_val))

    # 🟢 BORNE DE DATE : Uniquement le mois en cours (ex: depuis le 2026-09-01)
    now = datetime.now()
    start_of_current_month = now.replace(day=1).strftime("%Y-%m-%d")

    batch_tracker = {}
    pending_by_account = {}
    total_pending = 0

    for tx in powens_txs:
        raw_date = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0]
        
        # 🟢 Ignore toutes les transactions des mois antérieurs
        if raw_date < start_of_current_month:
            continue

        acc_id = str(tx.get("id_account"))
        local_account = acc_id_to_kleea.get(acc_id)
        if not local_account:
            continue

        montant = round(float(tx.get("value", 0.0)), 2)
        libelle_brut = (tx.get("simplified_wording") or tx.get("wording") or tx.get("raw_wording") or "Transaction").strip()
        base_nom = f"[TEST] {libelle_brut}" if is_test_user else libelle_brut

        tracker_key = (raw_date, montant, base_nom.upper(), local_account.upper())
        occurrence = batch_tracker.get(tracker_key, 0) + 1
        batch_tracker[tracker_key] = occurrence

        nom_final = base_nom if occurrence == 1 else f"{base_nom} #{occurrence}"

        # Vérifications d'existence en BDD
        is_in_db = (raw_date, montant, nom_final.upper(), local_account.upper()) in db_existing_set
        is_in_db_raw = (raw_date, montant, base_nom.upper(), local_account.upper()) in db_existing_set
        is_in_db_notest = (raw_date, montant, libelle_brut.upper(), local_account.upper()) in db_existing_set

        # Vérification intelligente si le libellé avait été légèrement nettoyé lors d'un import précédent
        is_duplicate = False
        if not is_in_db and not is_in_db_raw and not is_in_db_notest:
            cleaned_new = clean_text_for_matching(libelle_brut)
            for (d_str, m_val, n_str, c_val) in db_existing_set:
                if d_str == raw_date and abs(m_val - montant) < 0.01 and c_val == local_account.upper():
                    cleaned_db = clean_text_for_matching(n_str)
                    if cleaned_new in cleaned_db or cleaned_db in cleaned_new:
                        is_duplicate = True
                        break

        if not is_in_db and not is_in_db_raw and not is_in_db_notest and not is_duplicate:
            total_pending += 1
            if local_account not in pending_by_account:
                pending_by_account[local_account] = {"count": 0, "amount": 0.0}
            pending_by_account[local_account]["count"] += 1
            pending_by_account[local_account]["amount"] = round(pending_by_account[local_account]["amount"] + abs(montant), 2)

    print(f"📊 [CHECK-SYNC] Mois en cours ({start_of_current_month}) -> {total_pending} transaction(s) en attente pour '{user_clean}'")
    return {
        "has_pending": total_pending > 0,
        "count": total_pending,
        "accounts": pending_by_account
    }




# 🟢 INITIALISATION SÉCURISÉE DE FERNET
IBAN_KEY = os.getenv("IBAN_ENCRYPTION_KEY")
cipher = None

if IBAN_KEY:
    try:
        cipher = Fernet(IBAN_KEY.strip().encode())
    except Exception as e:
        print(f"⚠️ Clé IBAN_ENCRYPTION_KEY invalide : {e}")
else:
    print("ℹ️ Aucune clé IBAN_ENCRYPTION_KEY trouvée dans le .env. Le chiffrement est inactif.")

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

def decrypt_iban(val: str) -> str:
    """Déchiffre un IBAN chiffré. Renvoie la chaîne brute si non chiffrée."""
    if not val or not cipher:
        return val or ""
    try:
        return cipher.decrypt(val.encode()).decode()
    except Exception:
        return val


# 🟢 SYNCHRONISATION ROBUSTE AVEC DÉCHIFFREMENT ET DÉTECTION D'IBAN
@app.post("/powens/sync-user/{username}")
async def sync_user_transactions(username: str, background_tasks: BackgroundTasks):
    user_clean = username.lower().strip()
    is_test_user = (user_clean == "test")

    # 1. Token utilisateur
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun compte bancaire Powens lié.")
        user_token = res[0]
        
        # 2. Configurations brutes de Kleea
        query_config = text("SELECT compte, powens_name FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()

    # 🟢 Déchiffrement en mémoire vive de toutes les liaisons
    decrypted_config_rows = [
        (row[0], decrypt_iban(row[1]) if row[1] else None)
        for row in config_rows
    ]

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'
        
    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers)
        powens_accounts = res_acc.json().get("accounts", [])
        powens_raw = get_powens_transactions(user_token)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur Powens: {str(e)}")

    acc_id_to_kleea = build_powens_account_id_to_kleea_map(powens_accounts, decrypted_config_rows)
    if not acc_id_to_kleea:
        return {"status": "success", "added": 0, "message": "Aucun compte configuré avec un lien Powens."}

    # Bâtir les tables d'IBANs et numéros des comptes connectés Powens
    iban_to_local_name = {}
    number_to_local_name = {}
    for acc in powens_accounts:
        acc_id = str(acc.get("id"))
        local_name = acc_id_to_kleea.get(acc_id)
        if local_name:
            iban = acc.get("iban", "").strip().upper().replace(" ", "")
            number = acc.get("number", "").strip().upper().replace(" ", "")
            if iban: iban_to_local_name[iban] = local_name
            if number: number_to_local_name[number] = local_name

    mots_cles_rules = get_mots_cles_rules(user_clean)
    memoire_rules = get_memoire(user_clean)
    mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"]
    success_count = 0
    batch_occurrence_tracker = {}

    # 🟢 NOUVELLE BORNE STRICTE : 1er jour du mois en cours uniquement (ex: 2026-09-01)
    now = datetime.now()
    start_of_current_month = now.replace(day=1).strftime("%Y-%m-%d")

    with engine.connect() as conn:
        for tx in powens_raw:
            try:
                raw_date = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0]
                
                # Ignore les écritures trop anciennes (> 60 jours)
                if raw_date < start_of_current_month:
                    continue

                tx_account_id = str(tx.get("id_account")) if tx.get("id_account") is not None else None
                local_account_name = acc_id_to_kleea.get(tx_account_id)
                if not local_account_name:
                    continue
                    
                montant = float(tx.get("value", 0.0))
                libelle_brut = (tx.get("simplified_wording") or tx.get("wording") or tx.get("raw_wording") or "Transaction").strip()
                base_nom = f"[TEST] {libelle_brut}" if is_test_user else libelle_brut
                
                tracker_key = (raw_date, round(montant, 2), base_nom.upper(), local_account_name.upper())
                occurrence_in_batch = batch_occurrence_tracker.get(tracker_key, 0) + 1
                batch_occurrence_tracker[tracker_key] = occurrence_in_batch
                
                nom_final = base_nom if occurrence_in_batch == 1 else f"{base_nom} #{occurrence_in_batch}"

                # Vérification d'existence en BDD
                check_existing_query = text("""
                    SELECT 1 FROM transactions 
                    WHERE LOWER(utilisateur) = LOWER(:u) 
                      AND date = :d 
                      AND ABS(montant - :m) < 0.001 
                      AND nom = :n 
                      AND compte = :co 
                    LIMIT 1
                """)
                already_in_db = conn.execute(check_existing_query, {
                    "u": user_clean,
                    "d": raw_date,
                    "m": montant,
                    "n": nom_final,
                    "co": local_account_name
                }).fetchone()

                if already_in_db:
                    continue

                # Catégorisation
                cat = "❓ Autre"
                libelle_lower = libelle_brut.lower()
                libelle_compact = libelle_brut.upper().replace(" ", "")
                
                autre_compte_local = None

                # A. Recherche par IBAN issu de l'API Powens
                for target_iban, local_name in iban_to_local_name.items():
                    if local_name.upper() != local_account_name.upper() and target_iban in libelle_compact:
                        autre_compte_local = local_name
                        break
                
                # B. Recherche par Numéro de compte issu de l'API Powens
                if not autre_compte_local:
                    for target_number, local_name in number_to_local_name.items():
                        if local_name.upper() != local_account_name.upper() and target_number in libelle_compact:
                            autre_compte_local = local_name
                            break

                # 🟢 C. RECHERCHE PAR IBAN MANUEL DÉCHIFFRÉ (ex: votre LEP)
                if not autre_compte_local:
                    for c_name, p_link in decrypted_config_rows:
                        if not p_link or c_name.upper() == local_account_name.upper():
                            continue
                        p_link_compact = p_link.replace(" ", "").upper()
                        # Vérifie si l'IBAN déchiffré est écrit à l'intérieur du libellé
                        if p_link_compact and p_link_compact in libelle_compact:
                            autre_compte_local = c_name
                            print(f"🎯 [MATCH IBAN] Virement interne détecté vers '{c_name}' via l'IBAN '{p_link_compact}'")
                            break

                # D. Mots-clés livrets génériques
                if not autre_compte_local and any(k in libelle_brut.upper() for k in ["VERS ", "VIR ", "VIREMENT", "TO "]):
                    types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL"]
                    type_cible = next((t for t in types_epargne if t in libelle_brut.upper()), None)
                    if type_cible: 
                        autre_compte_local = type_cible

                # Attribution de la catégorie de virement interne
                if autre_compte_local:
                    cat = f"🔄 Virement : {local_account_name} vers {autre_compte_local}" if montant < 0 else f"🔄 Virement : {autre_compte_local} vers {local_account_name}"

                # Mémoire & mots-clés
                if cat == "❓ Autre":
                    for m in memoire_rules:
                        if m["nom"].lower() in libelle_lower:
                            cat = m["categorie"]
                            break
                            
                if cat == "❓ Autre":
                    for rule in mots_cles_rules:
                        for raw_k in rule["keywords"]:
                            parts = raw_k.split(':')
                            keyword = parts[0].strip().lower()
                            signe = parts[1].strip().lower() if len(parts) > 1 else "both"
                            if keyword in libelle_lower:
                                if (signe == "positive" and montant > 0) or (signe == "negative" and montant < 0) or (signe in ["both", "all"]):
                                    cat = rule["categorie"]
                                    break

                # Virements externes
                if cat == "❓ Autre":
                    is_transfer = (tx.get("type") == "transfer") or any(k in libelle_brut.upper() for k in ["VERS ", "VIR ", "VIREMENT", "TO "])
                    if is_transfer:
                        cat = "🤝 Virements Reçus" if montant > 0 else "💸 Virements envoyé"

                # Insertion
                dt = datetime.strptime(raw_date, "%Y-%m-%d")
                insert_query = text("""
                    INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, année, compte)
                    VALUES (:d, :n, :m, :c, :u, :mo, :a, :co)
                    ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING
                    RETURNING id
                """)
                res_insert = conn.execute(insert_query, {
                    "d": raw_date, "n": nom_final, "m": montant, "c": cat,
                    "u": user_clean, "mo": mois_fr[dt.month - 1], "a": dt.year,
                    "co": local_account_name
                })
                conn.commit()

                if res_insert.fetchone():
                    success_count += 1

            except Exception as line_error:
                conn.rollback()
                print(f"Ligne ignorée : {line_error}")
                continue
            
    print(f"✅ Synchronisation terminée: {success_count} transaction(s) importée(s).")
    return {"status": "success", "added": success_count}

# 🟢 CORRECTIF : ALIGNEMENT DES PARAMÈTRES ET TRACABILITÉ DES RECALCULS
@app.post("/powens/recalculate-balances/{username}")
def recalculate_initial_balances(username: str):
    """
    Récupère le solde réel de chaque compte de l'utilisateur sur Powens,
    calcule la somme de toutes les transactions existantes en base sur ce compte,
    et met à jour la colonne 'solde' (Solde Initial) dans la table configuration.
    """
    user_clean = username.lower().strip()
    print(f"🔄 [BALANCE RECALC] Début du calcul pour l'utilisateur: {user_clean}")

    # 1. Récupérer le token de l'utilisateur
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun jeton bancaire trouvé.")
        user_token = res[0]
        
    # 2. Récupérer les soldes réels de Powens
    try:
        domain = POWENS_DOMAIN.rstrip('/')
        if not domain.endswith('/2.0') and not domain.endswith('/v2'):
            domain += '/2.0'
        elif domain.endswith('/v2'):
            domain = domain[:-3] + '/2.0'

        headers = {"Authorization": f"Bearer {user_token}"}
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers)
        powens_accounts = res_acc.json().get("accounts", [])
        print(f"🔍 [BALANCE RECALC] {len(powens_accounts)} comptes récupérés sur Powens.")
    except Exception as e:
        print(f"❌ [BALANCE RECALC] Erreur récupération comptes Powens: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur Powens: {str(e)}")

    updates = []
    with engine.connect() as conn:
        for acc in powens_accounts:
            powens_name = acc.get("name")
            real_balance = float(acc.get("balance", 0.0))
            
            print(f"⚙️ [BALANCE RECALC] Traitement du compte Powens: '{powens_name}' (Solde réel: {real_balance}€)")

            # Trouver le compte Kleea correspondant
            query_local = text("""
                SELECT compte FROM configuration 
                WHERE LOWER(utilisateur) = LOWER(:u) AND TRIM(UPPER(powens_name)) = TRIM(UPPER(:p))
            """)
            local_row = conn.execute(query_local, {"u": user_clean, "p": powens_name}).fetchone()
            if not local_row:
                print(f"⚠️ [BALANCE RECALC] Aucun compte miroir Kleea trouvé en BDD pour '{powens_name}'")
                continue
                
            compte_local_name = local_row[0]
            print(f"🎯 [BALANCE RECALC] Compte Kleea associé trouvé: '{compte_local_name}'")
            
            # Calculer la somme des transactions de ce compte
            # 🟢 CORRIGÉ : Remplacement de :c par :co pour correspondre aux paramètres passés
            # 🟢 Requête insensible à la casse et aux espaces superflus
            query_sum = text("""
                SELECT COALESCE(SUM(montant), 0) FROM transactions 
                WHERE LOWER(utilisateur) = LOWER(:u) 
                AND TRIM(UPPER(compte)) = TRIM(UPPER(:co))
            """)
            total_transactions = conn.execute(query_sum, {"u": user_clean, "co": compte_local_name}).scalar()
            print(f"📊 [BALANCE RECALC] Somme des transactions Kleea pour '{compte_local_name}': {total_transactions}€")
            
            # Ajuster le solde de départ (Solde Initial = Solde Réel - Somme Transactions)
            new_initial_balance = round(real_balance - total_transactions, 2)
            print(f"💾 [BALANCE RECALC] Ajustement du Solde de Départ de '{compte_local_name}' à: {new_initial_balance}€")
            
            # Mettre à jour la configuration
            # 🟢 CORRIGÉ : Remplacement de :c par :co pour correspondre aux paramètres passés
            query_update = text("""
                UPDATE configuration 
                SET solde = :new_solde 
                WHERE LOWER(utilisateur) = LOWER(:u) AND compte = :co
            """)
            conn.execute(query_update, {"new_solde": new_initial_balance, "u": user_clean, "co": compte_local_name})
            conn.commit()
            
            updates.append({
                "compte": compte_local_name, 
                "solde_initial": new_initial_balance, 
                "solde_reel": real_balance,
                "somme_transactions": total_transactions
            })
            
    print(f"✅ [BALANCE RECALC] Calcul terminé. {len(updates)} comptes mis à jour.")
    return {"status": "success", "updated_balances": updates}

# Route de synchronisation globale de maintenance (exécutée par un cron externe)
@app.post("/maintenance/sync-all")
def sync_all_users_background(auth_key: str = None):
    # Sécuriser avec une clé secrète dans votre .env
    if auth_key != os.getenv("MAINTENANCE_API_KEY"):
        raise HTTPException(status_code=401, detail="Non autorisé")
        
    query = text("SELECT username FROM users WHERE powens_token IS NOT NULL AND import_mode = 'auto'")
    synced_users = []
    with engine.connect() as conn:
        users = conn.execute(query).fetchall()
        for u in users:
            try:
                # Appeler la logique de synchronisation pour chaque utilisateur en arrière-plan
                sync_user_transactions(u[0], BackgroundTasks())
                recalculate_initial_balances(u[0])
                synced_users.append(u[0])
            except Exception as e:
                print(f"Échec synchro cron pour {u[0]}: {str(e)}")
                
    return {"status": "success", "synchronized_users": synced_users}

@app.post("/powens/clean-duplicates/{username}")
def clean_powens_duplicates(username: str):
    """
    Supprime les connexions en doublon pour une MÊME banque,
    sans jamais toucher aux autres banques.
    """
    user_clean = username.lower().strip()

    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun token Powens.")
        user_token = res[0]

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}

    # 🟢 Récupération avec expand
    res_conn = requests.get(f"{domain}/users/me/connections?expand=connector", headers=headers)
    connections = res_conn.json().get("connections", []) if res_conn.status_code == 200 else []
    
    by_connector = {}
    for c in connections:
        # Groupement strict par ID de connecteur
        connector_id = c.get("id_connector") or (c.get("connector", {}).get("id"))
        if connector_id not in by_connector:
            by_connector[connector_id] = []
        by_connector[connector_id].append(c)

    deleted_ids = []
    kept_ids = []

    for connector_id, conn_list in by_connector.items():
        conn_list.sort(key=lambda x: x.get("id", 0), reverse=True)
        
        kept = conn_list[0]
        bank_label = kept.get("connector", {}).get("name") or f"Banque #{connector_id}"
        kept_ids.append({"id": kept.get("id"), "bank": bank_label})

        # Supprime uniquement les doublons d'une même banque
        for old in conn_list[1:]:
            old_id = old.get("id")
            del_res = requests.delete(f"{domain}/users/me/connections/{old_id}", headers=headers)
            if del_res.status_code in [200, 204]:
                deleted_ids.append({"id": old_id, "bank": bank_label})

    return {
        "status": "success",
        "deleted_connections": deleted_ids,
        "kept_connections": kept_ids
    }


# 🟢 SUPPRESSION TOTALE DU COMPTE ET DES CONNEXIONS CHEZ POWENS + NETTOYAGE BDD
@app.delete("/powens/disconnect/{username}")
def disconnect_powens(username: str):
    """
    Supprime définitivement l'utilisateur et toutes ses connexions chez Powens (DELETE /users/me),
    efface le token en base locale (users.powens_token = NULL)
    et délie les comptes dans configuration (powens_name = NULL).
    """
    user_clean = username.lower().strip()
    
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        user_token = res[0] if res else None

    # 1. Suppression définitive chez Powens via l'API (DELETE /users/me)
    if user_token:
        try:
            domain = POWENS_DOMAIN.rstrip('/')
            if not domain.endswith('/2.0') and not domain.endswith('/v2'):
                domain += '/2.0'
            elif domain.endswith('/v2'):
                domain = domain[:-3] + '/2.0'
                
            headers = {"Authorization": f"Bearer {user_token}"}
            # DELETE /users/me efface l'utilisateur, ses connexions, ses comptes et son token
            del_res = requests.delete(f"{domain}/users/me", headers=headers)
            print(f"🗑️ [POWENS PURGE USER] Réponse Powens: {del_res.status_code}")
        except Exception as e:
            print(f"⚠️ Erreur lors de la suppression chez Powens: {e}")
            # On poursuit pour nettoyer la base de données locale

    # 2. Nettoyage de la base de données locale Kleea
    with engine.begin() as conn:
        # Réinitialise le token utilisateur
        conn.execute(text("UPDATE users SET powens_token = NULL WHERE LOWER(username) = LOWER(:u)"), {"u": user_clean})
        # Retire les liaisons powens_name dans la table configuration
        conn.execute(text("UPDATE configuration SET powens_name = NULL WHERE LOWER(utilisateur) = LOWER(:u)"), {"u": user_clean})

    return {"status": "success", "message": "Accès bancaire Powens et identifiant supprimés avec succès."}