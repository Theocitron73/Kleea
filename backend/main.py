from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
import pandas as pd
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from typing import List
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
    query = text("SELECT id, date, nom, montant, categorie, utilisateur, mois, année, compte, enveloppe FROM transactions WHERE LOWER(utilisateur) = :u")
    
    try:
        with engine.connect() as conn:
            # On exécute la requête de manière standard avec SQLAlchemy
            result = conn.execute(query, {"u": u_lower})
            
            # On récupère les clés (noms des colonnes) et les lignes
            columns = result.keys()
            records = [dict(zip(columns, row)) for row in result.fetchall()]
            
            # Optionnel : Si tu as besoin de formater les dates en string pour éviter les bugs JSON
            for record in records:
                if record.get('date') and not isinstance(record['date'], str):
                    record['date'] = record['date'].strftime('%Y-%m-%d')
                    
            return records

    except Exception as e:
        print(f"Erreur lors de la récupération des transactions: {e}")
        # Crucial : Lever une vraie HTTPException propre pour que FastAPI 
        # renvoie le bon code d'erreur au navigateur AVEC les en-têtes CORS !
        raise HTTPException(status_code=500, detail=f"Erreur Base de données: {str(e)}")


class Transaction(BaseModel):
    nom: str
    montant: float
    categorie: str
    utilisateur: str
    mois: str
    annee: int
    compte: str
    id: Optional[int] = None  # Très important pour les modifs
    date: Optional[str] = None # Accepte que ce soit vide
    enveloppe: Optional[str] = None # 👈 AJOUT ICI

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
        SET nom=:n, montant=:m, categorie=:c, mois=:mo, année=:a, compte=:co, enveloppe=:env 
        WHERE id=:id AND utilisateur=:u
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "n": t.nom, "m": t.montant, "c": t.categorie, 
                "mo": t.mois, "a": t.annee, "co": t.compte,
                "env": t.enveloppe, "id": t_id, "u": t.utilisateur.lower()
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


class ResetRequest(BaseModel):
    email: EmailStr

@app.post("/forgot-password")
async def forgot_password(req: ResetRequest):
    # 1. Vérifier si l'email existe
    with engine.connect() as conn:
        query = text("SELECT username FROM users WHERE email = :email")
        user = conn.execute(query, {"email": req.email}).fetchone()
        
        # Réponse générique pour la sécurité
        response_msg = {"message": "Si cet email est associé à un compte, vous recevrez un lien sous peu."}
        
        if not user:
            return response_msg
            
    # 2. Générer un token unique
    token = secrets.token_urlsafe(32)
    
    # 3. Sauvegarder le token en base
    with engine.begin() as conn:
        update_query = text("UPDATE users SET reset_token = :t WHERE email = :e")
        conn.execute(update_query, {"t": token, "e": req.email})

    # 4. Préparer le lien (Vercel ou Localhost)
    frontend_url = os.getenv("FRONTEND_URL", "https://kleea.vercel.app")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    resend.api_key = os.getenv("RESEND_API_KEY")
    # 5. Envoyer le mail via l'API Resend (Port 443 - Jamais bloqué)
    try:
        html_content = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2 style="color: #10b981;">Reinitialisation demandee</h2>
                <p>Bonjour,</p>
                <p>Pour changer votre mot de passe Kleea, cliquez sur le bouton ci-dessous :</p>
                <a href="{reset_link}" 
                   style="background-color: #ffffff; color: #000000; padding: 12px 24px; 
                          text-decoration: none; border-radius: 8px; font-weight: bold; 
                          display: inline-block; border: 1px solid #e5e7eb;">
                   Changer mon mot de passe
                </a>
                <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
                    Si vous n'avez pas demandé ce changement, ignorez ce mail.
                </p>
            </body>
        </html>
        """

        # Envoi via l'API Resend
        resend.Emails.send({
            "from": "Kleea <onboarding@resend.dev>", # Utilise cette adresse exacte pour le test gratuit
            "to": [req.email],
            "subject": "Kleea - Recuperation de votre acces",
            "html": html_content
        })

    except Exception as e:
        print(f"ERREUR RESEND : {str(e)}")
        # On ne bloque pas l'utilisateur si le mail a un souci technique
        # mais on log l'erreur sur Render pour nous.
    
    return response_msg


class NewPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/reset-password-confirm")
async def reset_password_confirm(req: NewPasswordRequest):
    hashed_password = pwd_context.hash(req.new_password)
    
    with engine.connect() as conn:
        # Dans un vrai système, on chercherait l'utilisateur qui a CE token.
        # Pour ton test actuel, on va simplifier : on met à jour l'utilisateur par son token
        # (Assure-toi d'avoir une colonne 'reset_token' ou d'adapter selon ta logique)
        
        query = text("UPDATE users SET password = :pwd WHERE reset_token = :token")
        result = conn.execute(query, {"pwd": hashed_password, "token": req.token})
        conn.commit()
        
        if result.rowcount == 0:
            raise HTTPException(status_code=400, detail="Lien invalide ou expiré")
            
    return {"status": "success", "message": "Mot de passe mis à jour !"}



# 💡 1. AJOUT DE TAUX DANS LE MODÈLE PYDANTIC
class CompteConfig(BaseModel):
    compte: str
    groupe: str
    solde: float
    objectif: float
    couleur: str
    utilisateur: str
    taux: float = 0.0  # Optionnel par défaut à 0.0 si absent


@app.get("/config-comptes/{username}")
def get_config_comptes(username: str):
    u_clean = username.strip().lower()
    # 💡 2. Le SELECT * récupèrera automatiquement la nouvelle colonne taux
    query = text("SELECT * FROM configuration WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"u": u_clean})
    return df.to_dict(orient="records")


@app.post("/config-comptes")
def add_compte(c: CompteConfig):
    # 💡 3. AJOUT DE TAUX DANS L'INSERT
    query = text("""
        INSERT INTO configuration (compte, groupe, solde, objectif, couleur, utilisateur, taux) 
        VALUES (:c, :g, :s, :o, :col, :u, :t)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "c": c.compte, "g": c.groupe, "s": c.solde, 
            "o": c.objectif, "col": c.couleur, "u": c.utilisateur.lower(),
            "t": c.taux
        })
        conn.commit()
    return {"status": "success"}


@app.put("/config-comptes/{compte_name}")
def update_compte(compte_name: str, c: CompteConfig):
    name_clean = compte_name.strip()
    
    # 💡 4. AJOUT DE TAUX DANS L'UPDATE
    query = text("""
        UPDATE configuration 
        SET groupe = :g, solde = :s, objectif = :o, couleur = :col, taux = :t
        WHERE compte = :c AND LOWER(utilisateur) = :u
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {
            "g": c.groupe, 
            "s": c.solde, 
            "o": c.objectif, 
            "col": c.couleur, 
            "t": c.taux,
            "c": name_clean, 
            "u": c.utilisateur.lower()
        })
        conn.commit()
        
        if result.rowcount == 0:
            print(f"ATTENTION : Aucune ligne mise à jour pour {name_clean}")
            
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




# Dans main.py
class Projet(BaseModel):
    utilisateur: str
    profil: str
    nom: str
    cout: float
    date: str  # Format "YYYY-MM-DD"
    capa: float

@app.get("/get-projets/{profil}")
def get_projets(profil: str):
    query = text("SELECT * FROM projets WHERE LOWER(profil) = :p ORDER BY date ASC")
    with engine.connect() as conn:
        res = conn.execute(query, {"p": profil.lower()}).mappings().all()
        return [dict(r) for r in res]

@app.post("/save-projet")
def save_projet(p: Projet):
    query = text("""
        INSERT INTO projets (utilisateur, profil, nom, cout, date, capa)
        VALUES (:u, :pr, :n, :co, :d, :ca)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": p.utilisateur.lower(), "pr": p.profil, "n": p.nom, 
            "co": p.cout, "d": p.date, "ca": p.capa
        })
        conn.commit()
    return {"status": "success"}


# Ajoute 'old_name' à ton modèle Pydantic Projet si nécessaire, 
# ou passe-le en paramètre supplémentaire.

@app.post("/update-projet")
def update_projet(p: Projet, old_name: str): 
    query = text("""
        UPDATE projets 
        SET nom = :new_n, cout = :co, date = :d, capa = :ca
        WHERE nom = :old_n AND profil = :pr AND utilisateur = :u
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": p.utilisateur.lower(), 
            "pr": p.profil, 
            "new_n": p.nom,  # Le nouveau nom
            "old_n": old_name, # L'ancien pour le WHERE
            "co": p.cout, 
            "d": p.date, 
            "ca": p.capa
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
    compte: str
    type: str = "Categorie"
    nom: str
    somme: float

@app.get("/get-budgets/{utilisateur}")
@app.get("/get-budgets/{utilisateur}/{mois}")
def get_budgets(utilisateur: str, mois: Optional[str] = None):
    # Si 'mois' est fourni, on filtre. Sinon, on prend tout.
    if mois:
        query = text("""
            SELECT * FROM budgets 
            WHERE LOWER(utilisateur) = :u AND mois = :m 
        """)
        params = {"u": utilisateur.lower(), "m": mois}
    else:
        # Requête pour la page "Gérer" : on récupère tout l'historique
        query = text("""
            SELECT * FROM budgets 
            WHERE LOWER(utilisateur) = :u
        """)
        params = {"u": utilisateur.lower()}

    with engine.connect() as conn:
        res = conn.execute(query, params).mappings().all()
        return [dict(r) for r in res]



@app.post("/save-budget")
def save_budget(b: Budget):
    query = text("""
        INSERT INTO budgets (utilisateur, mois, compte, type, nom, somme)
        VALUES (:u, :m, :c, :t, :n, :s)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": b.utilisateur.lower(),
            "m": b.mois,
            "c": b.compte,
            "t": b.type,
            "n": b.nom,
            "s": b.somme
        })
        conn.commit()
    return {"status": "success"}


@app.post("/update-budget")
def update_budget(b: Budget, old_name: str):
    query = text("""
        UPDATE budgets 
        SET nom = :new_n, somme = :s, compte = :c
        WHERE nom = :old_n AND utilisateur = :u AND mois = :m
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": b.utilisateur.lower(),
            "m": b.mois,
            "new_n": b.nom,
            "old_n": old_name,
            "s": b.somme,
            "c": b.compte
        })
        conn.commit()
    return {"status": "success"}

@app.delete("/delete-budget/{nom}/{utilisateur}/{mois}")
def delete_budget(nom: str, utilisateur: str, mois: str):
    query = text("""
        DELETE FROM budgets 
        WHERE nom = :n AND utilisateur = :u AND mois = :m
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "n": nom, 
            "u": utilisateur.lower(), 
            "m": mois
        })
        conn.commit()
    return {"status": "deleted"}


class CategorieCreate(BaseModel):
    nom: str
    utilisateur: str

# Constante globale : une seule source de vérité côté serveur
CATEGORIES_DEFAUT = [
    "💰 Salaire", "🏥 Remboursements", "🤝 Virements Reçus", "👫 Compte Commun",
    "📱 Abonnements", "🛒 Alimentation", "🛍️ Shopping", "👕 Habillement", 
    "⚖️ Impôts", "🏦 Frais Bancaires", "🏠 Assurance Habitation", "🎮 Jeux vidéos",
    "🩺 Mutuelle", "💊 Pharmacie", "👨‍⚕️ Médecin/Santé", "🔑 Loyer", 
    "🔨 Bricolage", "🚌 Transports", "⛽ Carburant", "🚗 Auto", 
    "💸 Virements envoyé", "🏧 Retraits", "🌐 Web/Énergie", 
    "🔄 Virement : Livret A vers CCP", "🔄 Virement : CCP vers Livret A", "❓ Autre"
]

@app.get("/api/categories/{user}")
def get_categories(user: str):
    try:
        with engine.connect() as conn:
            query = text("SELECT nom FROM categories WHERE utilisateur = :u")
            result = conn.execute(query, {"u": user}).fetchall()
            categories_perso = [row[0] for row in result]
        
        # On renvoie un dictionnaire structuré
        return {
            "defaults": sorted(CATEGORIES_DEFAUT),
            "perso": sorted(categories_perso),
            "all": sorted(list(set(CATEGORIES_DEFAUT + categories_perso)))
        }
        
    except Exception as e:
        print(f"Erreur SQL: {e}")
        return {
            "defaults": sorted(CATEGORIES_DEFAUT),
            "perso": [],
            "all": sorted(CATEGORIES_DEFAUT)
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

from urllib.parse import unquote

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
                # On récupère les mots clés admin + utilisateur
                query_cat = text("""
                    SELECT categorie, mots_cles, utilisateur 
                    FROM config_categories 
                    WHERE utilisateur = :u OR utilisateur = 'admin'
                """)
                result = conn.execute(query_cat, {"u": utilisateur}).fetchall()
                
                # On gère la priorité utilisateur sur l'admin
                temp_rules = {}
                for row in result:
                    cat_name, raw_keywords, owner = row
                    if raw_keywords:
                        # Nettoyage du format {a,b,c} de Postgres
                        keywords_str = str(raw_keywords).replace('{', '').replace('}', '').replace('"', '')
                        keywords_list = [m.strip().lower() for m in keywords_str.split(',') if m.strip()]
                        
                        if cat_name not in temp_rules or owner == utilisateur:
                            temp_rules[cat_name] = keywords_list
                
                for cat, keys in temp_rules.items():
                    mots_cles_rules.append({"categorie": cat, "keywords": keys})
        except Exception as e:
            print(f"Erreur chargement mots_cles: {e}")

        # --- 5. CHARGEMENT DE LA MÉMOIRE (Liste d'objets triée) ---
        # get_memoire(u) renvoie : [{"nom": "UBER EATS", "categorie": "Repas"}, ...]
        memoire_rules = get_memoire(utilisateur)

        transactions_pretes = []
        mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

        # --- 6. BOUCLE DE TRAITEMENT ---
        for _, row in df.iterrows():
            if pd.isna(row[col_date]): continue
            
            # Filtre Revolut (état terminé)
            if col_etat and pd.notna(row[col_etat]):
                if str(row[col_etat]).upper() not in ['TERMINÉ', 'COMPLETED', 'FINI']:
                    continue

            try:
                # Nettoyage du montant
                def clean_val(val):
                    if pd.isna(val) or val == "": return "0"
                    res = str(val).replace('+', '').replace('\xa0', '').replace(' ', '').strip()
                    return res.replace(',', '.')

                montant_float = 0.0
                if col_debit or col_credit:
                    d_val = clean_val(row.get(col_debit)) if col_debit else "0"
                    c_val = clean_val(row.get(col_credit)) if col_credit else "0"
                    
                    # SI DÉBIT : On force le montant en NÉGATIF
                    if d_val and d_val not in ["0", "0.00", "0.0"]: 
                        montant_float = -abs(float(d_val)) 
                    
                    # SI CRÉDIT : On force le montant en POSITIF
                    elif c_val and c_val not in ["0", "0.00", "0.0"]: 
                        montant_float = abs(float(c_val))
                
                elif col_montant:
                    montant_float = float(clean_val(row[col_montant]))

                # Préparation des textes pour comparaison
                nom_t = str(row[col_nom]).strip()
                info_t = str(row[col_info]) if col_info and pd.notna(row[col_info]) else ""
                nom_t_lower = nom_t.lower()
                texte_integral_upper = (nom_t + " " + info_t).upper()

                # --- ALGORITHME DE CATÉGORISATION ---
                cat = "❓ Autre"
                
                # A. Priorité 1 : Virements Internes (Logique fixe)
                mes_comptes = ["LIVRET A", "LDDS", "COMPTE CHEQUES", "COMMUN", "CCP", "REVOLUT"]
                if any(k in texte_integral_upper for k in ["VERS", "VIR MME FONTA AUDE", "TO "]):
                    if "LIVRET A" in texte_integral_upper: cat = "🔄 Virement : CCP vers Livret A"
                    elif any(c in texte_integral_upper for c in ["COMPTE CHEQUES", "CCP"]): cat = "🔄 Virement : Livret A vers CCP"
                    elif any(c in texte_integral_upper for c in mes_comptes): cat = "🔄 Transfert Interne"

                
                # B. Priorité 2 : Mémoire Apprise (Recherche partielle flexible)
                if cat == "❓ Autre":
                    # 1. On normalise le nom de la transaction du CSV (minuscules + suppression espaces doubles)
                    # "ACHAT CB UBER    EATS" devient "achat cb uber eats"
                    nom_t_normalise = " ".join(nom_t_lower.split())

                    for m in memoire_rules:
                        # 2. On normalise aussi le nom stocké en mémoire par sécurité
                        nom_memoire_clean = " ".join(m["nom"].lower().split())
                        
                        # 3. On compare les deux versions propres
                        if nom_memoire_clean in nom_t_normalise:
                            cat = m["categorie"]
                            break

                # C. Priorité 3 : Intelligence (Mots-clés de la configuration)
                if cat == "❓ Autre":
                    for rule in mots_cles_rules:
                        if any(k in nom_t_lower for k in rule["keywords"]):
                            cat = rule["categorie"]
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
    # Ajout de 'groupe' dans les colonnes et les VALUES
    query = text("""
        INSERT INTO tricount (date, libellé, payé_par, pour_qui, montant, utilisateur, groupe,emoji)
        VALUES (:d, :l, :p, :pq, :m, :u, :g,:e)
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "d": t.date, 
            "l": t.libelle, 
            "p": t.paye_par, 
            "pq": t.pour_qui, 
            "m": t.montant, 
            "u": t.utilisateur,
            "g": t.groupe,  # <-- On envoie la valeur ici
            "token": t.token_partage,  # <-- On enregistre le token ici
            "e": t.emoji  # <--- ON ENVOIE L'EMOJI ICI
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

@app.get("/download-pdf/{username}/{group_name}")
def download_pdf(username: str, group_name: str, sujet: str = None):
    # --- 1. RÉCUPÉRATION DES DONNÉES ---
    query = text("SELECT * FROM tricount WHERE utilisateur = :u AND groupe = :g ORDER BY date DESC")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username, "g": group_name}).mappings().all()
        transactions = [dict(r) for r in res]
        df_groupe = pd.DataFrame(transactions)
    
    # --- 2. CALCULS ---
    transferts_finaux = calculer_balances(transactions)
    total_depenses = df_groupe['montant'].sum() if not df_groupe.empty else 0
    
    if sujet:
        transferts_a_afficher = [t for t in transferts_finaux if t['de'] == sujet or t['a'] == sujet]
        titre_doc = f"NOTE : {sujet}"
        sous_titre = f"Bilan personnel dans le groupe {group_name}"
    else:
        transferts_a_afficher = transferts_finaux
        titre_doc = group_name
        sous_titre = f"Bilan global du groupe - Total : {total_depenses:.2f} EUR"

    # --- 3. GÉNÉRATION DU PDF STYLISÉ ---
    pdf = StyledPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Application du header Dark
    pdf.header_style(titre_doc, sous_titre)
    
    # --- SECTION BILAN ---
    pdf.set_left_margin(20)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(30, 41, 59)
    pdf.cell(0, 10, "RÉCAPITULATIF DES TRANSFERTS", ln=True)
    
    # Petite barre indigo décorative
    pdf.set_fill_color(99, 102, 241)
    pdf.rect(20, pdf.get_y(), 10, 1, 'F')
    pdf.ln(5)

    largeur_utile = 170

    if transferts_a_afficher:
        for t in transferts_a_afficher:
            curr_y = pdf.get_y()
            
            # Logique de texte et couleur
            if sujet:
                if t['de'] == sujet:
                    color = (225, 29, 72) # Rose-600 (Dette)
                    texte = f"[-] VOUS DEVEZ DONNER {t['montant']:.2f} EUR A {t['a']}"
                else:
                    color = (5, 150, 105) # Emerald-600 (Reçu)
                    texte = f"[+] VOUS ALLEZ RECEVOIR {t['montant']:.2f} EUR DE {t['de']}"
            else:
                color = (79, 70, 229) # Indigo-600
                texte = f"> {t['de']} doit donner {t['montant']:.2f} EUR a {t['a']}"
            
            # Fond léger pour la ligne
            pdf.set_fill_color(248, 250, 252)
            pdf.rect(20, curr_y, largeur_utile, 10, 'F')
            
            # Petit indicateur coloré à gauche
            pdf.set_fill_color(*color)
            pdf.rect(20, curr_y, 1.5, 10, 'F')
            
            # Écriture du texte avec multi_cell pour éviter les coupures
            pdf.set_x(25)
            pdf.set_text_color(*color)
            pdf.set_font("Helvetica", "B", 10)
            pdf.multi_cell(w=largeur_utile - 5, h=10, txt=texte, align='L')
            pdf.ln(2)
    else:
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 10, "Aucun transfert a effectuer.", ln=True)

    

    # --- FINALISATION ET ENVOI ---
    pdf_bytes = bytes(pdf.output()) 
    
    headers = {
        'Content-Disposition': f'attachment; filename="Bilan_{group_name}.pdf"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers=headers
    )


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
    champ: str       # 'nom' ou 'categorie'
    condition: str   # 'EQUALS' ou 'CONTAINS'
    valeur: str      # ex: 'UberEats', 'Macdo', etc.

class CustomStatCreate(BaseModel):
    utilisateur: str
    titre: str
    flux_type: str   # 'depenses' ou 'revenus'
    operateur: str   # 'AND' ou 'OR'
    regles: List[CustomStatRule]

# --- 1. AJOUTER UNE STAT PERSO ---
@app.post("/custom-stats")
def create_custom_stat(stat: CustomStatCreate):
    query = text("""
        INSERT INTO custom_stats (utilisateur, titre, flux_type, operateur, regles)
        VALUES (:u, :t, :f, :o, :r)
        RETURNING id
    """)
    try:
        with engine.connect() as conn:
            # Remplacement de r.dict() par r.model_dump() (Standard Pydantic v2)
            regles_liste = [r.model_dump() for r in stat.regles]
            regles_json = json.dumps(regles_liste)
            
            result = conn.execute(query, {
                "u": stat.utilisateur.lower(),
                "t": stat.titre,
                "f": stat.flux_type,
                "o": stat.operateur,
                "r": regles_json
            })
            new_id = result.fetchone()[0]
            conn.commit()
            return {"id": new_id, "status": "success"}
    except Exception as e:
        print(f"Erreur SQL custom_stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. RÉCUPÉRER LES STATS D'UN UTILISATEUR ---
@app.get("/custom-stats/{username}")
def get_custom_stats(username: str):
    query = text("SELECT id, titre, flux_type, operateur, regles FROM custom_stats WHERE LOWER(utilisateur) = :u")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": username.lower()})
            columns = result.keys()
            records = []
            for row in result.fetchall():
                row_dict = dict(zip(columns, row))
                
                # Gestion propre du format selon le driver SQL (chaîne ou dict déjà parsé)
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






# 1. PLACE LE SCHÉMA ICI EN PREMIER
class ChatRequest(BaseModel):
    question: str
    transactions: List[dict]


# 1. Définition de la structure de sortie attendue par Gemini
class AISuggestedRule(BaseModel):
    # On ouvre les vannes sur les types de filtres possibles !
    champ: str = Field(description="Doit être 'nom', 'categorie', 'jour', 'montant', 'methode' ou 'frequence'")
    
    # On ajoute les opérateurs mathématiques pour le montant
    condition: str = Field(description="Doit être 'EQUALS', 'CONTAINS', 'GREATER_THAN' (strictement supérieur) ou 'LESS_THAN' (strictement inférieur)")
    
    valeur: str = Field(description="La valeur cible en minuscules (ex: 'amazon', 'lundi', 'paypal', ou un chiffre comme '50')")

class AICreationStat(BaseModel):
    titre: str = Field(description="Le titre de l'indicateur donné par l'utilisateur ou résumé proprement (ex: 'Suivi McDo')")
    flux_type: str = Field(description="Doit être 'depenses' ou 'revenus'")
    operateur: str = Field(description="Doit être 'AND' ou 'OR'")
    regles: List[AISuggestedRule]

class ChatResponseSchema(BaseModel):
    reponse: str = Field(description="Ta réponse d'expert financier en Français au format Markdown (tableaux, gras, listes).")
    creation_stat: Optional[AICreationStat] = Field(default=None, description="Remplis cet objet UNIQUEMENT si l'utilisateur demande explicitement de créer, enregistrer, suivre ou ajouter une statistique/indicateur permanent.")

# 2. La route modifiée
@app.post("/api/insights-chat")
def insights_chat(req: ChatRequest):
    try:
        client = genai.Client()

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
        
        Tu AS L'OBLIGATION de remplir l'objet `creation_stat` pour lui créer un indicateur permanent, MÊME s'il n'a pas dit explicitement les mots "créer" ou "sauvegarder". S'il s'intéresse à ce sujet, il veut le suivre à l'avenir.

        Règles de formatage globales pour l'objet JSON `creation_stat` :
        - titre : Le nom propre nettoyé de l'enseigne ou du sujet (ex: "Suivi Amazon", "Indicateur Courses")
        - flux_type : "depenses" ou "revenus"
        - operateur : "OR"
        - regles : Une liste d'objets contenant chacun :
            * champ : "nom", "categorie" ou "jour" (Ne jamais utiliser d'autres valeurs pour 'champ')
            * condition : "CONTAINS" ou "EQUALS" (ou "GREATER_THAN"/"LESS_THAN" si l'utilisateur parle de prix)
            * valeur : La valeur cible en minuscules (ex: "amazon", "lundi", "100")

        Si la question est globale (ex: "Combien j'ai dépensé au total ce mois-ci ?"), alors et seulement alors, tu laisses `creation_stat` vide.
        """

        # Appel avec contrainte de format (Structured Output)
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=req.question,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                # On force Gemini à cracher le schéma Pydantic ChatResponseSchema
                response_mime_type="application/json",
                response_schema=ChatResponseSchema,
            )
        )

        # On convertit la chaîne JSON renvoyée par Gemini en dictionnaire Python
        import json as python_json
        result_data = python_json.loads(response.text)
        return result_data

    except Exception as e:
        error_str = str(e)
        # On détecte si c'est un problème de quota épuisé (code 429)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {
                "reponse": "⚠️ **Quota Gemini épuisé pour aujourd'hui**.\n\nVous avez atteint la limite de l'offre gratuite de Google (20 requêtes/jour). Veuillez réessayer plus tard ou configurer une clé API pay-as-you-go.",
                "creation_stat": {}
            }
        
        # Pour les autres erreurs, on lève l'exception standard
        raise HTTPException(status_code=500, detail=error_str)