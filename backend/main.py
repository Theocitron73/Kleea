from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, text
import pandas as pd
import os
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
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


socket.gethostname = lambda: "localhost"

load_dotenv()
app = FastAPI()



# LE BLOC INDISPENSABLE :
# 3. Activation du Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En développement, on autorise tout
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


conf = ConnectionConfig(
    MAIL_USERNAME = "theolebarbier50@gmail.com",
    MAIL_PASSWORD = "pblo xpwn klsv fchb", # <--- Ton code de 16 caractères ici
    MAIL_FROM = "theolebarbier50@gmail.com",
    MAIL_PORT = 587,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_FROM_NAME = "Kleea", # Toujours garder sans accent
    MAIL_STARTTLS = True,
    MAIL_SSL_TLS = False,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine(os.getenv("DATABASE_URL"))

@app.get("/")
def read_root():
    return {"status": "L'API de finances est en ligne"}

@app.get("/transactions/{username}")
def get_transactions(username: str):
    u_lower = username.lower() # On force la minuscule ici
    query = text("SELECT * FROM transactions WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"u": u_lower})
    return df.to_dict(orient="records")


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


@app.put("/transactions/{t_id}")
def update_transaction(t_id: int, t: Transaction):
    query = text("""
        UPDATE transactions 
        SET nom=:n, montant=:m, categorie=:c, mois=:mo, année=:a, compte=:co 
        WHERE id=:id AND utilisateur=:u
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "n": t.nom, "m": t.montant, "c": t.categorie, 
                "mo": t.mois, "a": t.annee, 
                "co": t.compte, "id": t_id, "u": t.utilisateur.lower()
            })
            conn.commit()
        return {"status": "success"}
    except Exception as e:
        print(f"Erreur SQL: {e}") # Regarde ton terminal Python ici !
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
    query = text("SELECT username, password FROM users WHERE username = :nom")
    
    with engine.connect() as conn:
        result = conn.execute(query, {"nom": req.nom}).fetchone()
        
        if not result:
            raise HTTPException(status_code=404, detail="Utilisateur inconnu")
        
        db_username, db_hashed_password = result
        
        # Vérification : compare le mot de passe saisi avec le hash en base
        # Le try/except permet de gérer les anciens mots de passe en clair si besoin
        try:
            is_valid = pwd_context.verify(req.password, db_hashed_password)
        except Exception:
            is_valid = (req.password == db_hashed_password)

        if not is_valid:
            raise HTTPException(status_code=401, detail="Mot de passe incorrect")
            
        return {"status": "success", "user": db_username}


class ResetRequest(BaseModel):
    email: EmailStr

@app.post("/forgot-password")
async def forgot_password(req: ResetRequest):
    with engine.connect() as conn:
        # 1. Vérifier si l'email existe
        query = text("SELECT username FROM users WHERE email = :email")
        user = conn.execute(query, {"email": req.email}).fetchone()
        
        # Sécurité : On répond toujours la même chose pour éviter le "User Enumeration"
        response_msg = {"message": "Si cet email est associé à un compte, vous recevrez un lien sous peu."}
        
        if not user:
            return response_msg
            
        # 2. Générer un token unique
        token = secrets.token_urlsafe(32)
        
        # 3. SAUVEGARDER LE TOKEN EN BASE (OBLIGATOIRE POUR QUE LE LIEN MARCHE)
        with engine.begin() as conn: # Utilise .begin() pour un commit automatique
            update_query = text("UPDATE users SET reset_token = :t WHERE email = :e")
            conn.execute(update_query, {"t": token, "e": req.email})
            # Pas besoin de conn.commit() avec engine.begin()

       # 4. ENVOYER LE MAIL RÉEL
        reset_link = f"http://localhost:5173/reset-password?token={token}"
        
        # On évite les accents dans les chaînes f-string complexes pour le test
        html_content = f"""
        <html>
            <body style="font-family: sans-serif;">
                <h2>Reinitialisation demandee</h2>
                <p>Bonjour,</p>
                <p>Pour changer votre mot de passe Kleea, cliquez sur le lien :</p>
                <a href="{reset_link}">Changer mon mot de passe</a>
            </body>
        </html>
        """

        message = MessageSchema(
            subject="Kleea - Recuperation de votre acces", # Sujet sans accent
            recipients=[req.email],
            body=html_content,
            subtype=MessageType.html
        )

        fm = FastMail(conf)
        try:
                await fm.send_message(message)
        except Exception as e:
                import traceback
                traceback.print_exc() # Cela va afficher TOUT le chemin de l'erreur dans la console
                raise HTTPException(status_code=500, detail=str(e))
        
    return response_msg


class NewPasswordRequest(BaseModel):
    token: str
    new_password: str

@app.post("/reset-password-confirm")
def reset_password_confirm(req: NewPasswordRequest):
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



class CompteConfig(BaseModel):
    compte: str
    groupe: str
    solde: float
    objectif: float
    couleur: str
    utilisateur: str

@app.get("/config-comptes/{username}")
def get_config_comptes(username: str):
    u_clean = username.strip().lower()
    query = text("SELECT * FROM configuration WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"u": u_clean})
    return df.to_dict(orient="records")

@app.post("/config-comptes")
def add_compte(c: CompteConfig):
    query = text("""
        INSERT INTO configuration (compte, groupe, solde, objectif, couleur, utilisateur) 
        VALUES (:c, :g, :s, :o, :col, :u)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "c": c.compte, "g": c.groupe, "s": c.solde, 
            "o": c.objectif, "col": c.couleur, "u": c.utilisateur.lower()
        })
        conn.commit()
    return {"status": "success"}

@app.delete("/config-comptes/{compte_name}/{username}")
def delete_compte(compte_name: str, username: str):
    query = text("DELETE FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        conn.execute(query, {"c": compte_name, "u": username.lower()})
        conn.commit()
    return {"status": "deleted"}

@app.put("/config-comptes/{compte_name}")
def update_compte(compte_name: str, c: CompteConfig):
    # .strip() enlève les espaces au début et à la fin
    name_clean = compte_name.strip()
    
    query = text("""
        UPDATE configuration 
        SET groupe = :g, solde = :s, objectif = :o, couleur = :col 
        WHERE compte = :c AND LOWER(utilisateur) = :u
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {
            "g": c.groupe, 
            "s": c.solde, 
            "o": c.objectif, 
            "col": c.couleur, 
            "c": name_clean, 
            "u": c.utilisateur.lower()
        })
        conn.commit()
        
        # Petit check pour débugger dans ton terminal Python
        if result.rowcount == 0:
            print(f"ATTENTION : Aucune ligne mise à jour pour {name_clean}")
            
    return {"status": "updated", "rows_affected": result.rowcount}


# Dans main.py

class ThemeConfig(BaseModel):
    utilisateur: str
    bg_site: str
    primary_color: str
    text_main: str
    radius: str

@app.get("/get-theme/{username}")
def get_theme(username: str):
    query = text("SELECT * FROM user_theme WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": username.lower()}).fetchone()
        if res:
            return dict(res._mapping)
        return None # Retourne rien si l'utilisateur n'a pas de thème perso

@app.post("/save-theme")
def save_theme(t: ThemeConfig):
    # ON CONFLICT permet de mettre à jour si l'utilisateur existe déjà
    query = text("""
        INSERT INTO user_theme (utilisateur, bg_site, primary_color, text_main, radius)
        VALUES (:u, :bg, :p, :tm, :r)
        ON CONFLICT (utilisateur) DO UPDATE 
        SET bg_site = :bg, primary_color = :p, text_main = :tm, radius = :r
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": t.utilisateur.lower(), 
            "bg": t.bg_site, 
            "p": t.primary_color, 
            "tm": t.text_main, 
            "r": t.radius
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
    query = text("SELECT nom, categorie FROM memoire WHERE utilisateur = :u")
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"u": username.lower()})
    return dict(zip(df['nom'], df['categorie']))


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
async def import_csv(utilisateur: str, compte: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            decoded = contents.decode('utf-8')
        except:
            decoded = contents.decode('latin-1')
            
        lines = [l.strip() for l in decoded.splitlines() if l.strip()]
        
        # 1. RECHERCHE DE L'ENTÊTE
        start_line = 0
        for i, line in enumerate(lines[:20]):
            l = line.lower()
            if any(k in l for k in ['date', 'le ']) and any(k in l for k in ['libell', 'montant', 'débit', 'opéra', 'nom']):
                start_line = i
                break
        
        # 2. CHARGEMENT DU CSV (On force le séparateur ; détecté dans tes logs)
        csv_data = "\n".join(lines[start_line:])
        df = pd.read_csv(io.StringIO(csv_data), sep=';', engine='python', on_bad_lines='skip')
        df.columns = [c.strip().lower() for c in df.columns]
        
        # 3. IDENTIFICATION PRÉCISE DES COLONNES (basé sur ton CSV)
        col_date = next((c for c in df.columns if any(k in c for k in ['date de comptabilisation', 'date operation', 'date'])), None)
        col_nom = next((c for c in df.columns if any(k in c for k in ['libelle simplifie', 'libelle operation', 'nom', 'libell'])), None)
        col_debit = next((c for c in df.columns if 'debit' in c or 'débit' in c), None)
        col_credit = next((c for c in df.columns if 'credit' in c or 'crédit' in c), None)
        col_montant = next((c for c in df.columns if 'montant' in c or 'valeur' in c), None)

        # Chargement des règles de catégorisation
        mots_cles_rules = []
        try:
            with engine.connect() as conn:
                result = conn.execute(text("SELECT categorie, mots_cles FROM config_categories")).fetchall()
                for row in result:
                    if row[1]:
                        raw_keywords = str(row[1]).replace('{', '').replace('}', '').replace('"', '')
                        keywords = [m.strip().lower() for m in raw_keywords.split(',') if m.strip()]
                        mots_cles_rules.append({"categorie": row[0], "keywords": keywords})
        except: pass

        memoire = get_memoire(utilisateur)
        transactions_pretes = []
        mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

       # Identification de la colonne info (spécifique à ton nouveau CSV)
        col_info = next((c for c in df.columns if any(k in c for k in ['informations complementaires', 'info'])), None)

        # 4. BOUCLE DE TRAITEMENT
        for _, row in df.iterrows():
            if pd.isna(row[col_date]): continue
            
            try:
                # --- LOGIQUE MONTANT ---
                def clean_val(val):
                    if pd.isna(val): return ""
                    return str(val).replace('+', '').replace(',', '.').replace('\xa0', '').replace(' ', '').strip()

                montant_float = 0.0
                if col_debit or col_credit:
                    d_val, c_val = clean_val(row[col_debit]), clean_val(row[col_credit])
                    if d_val and d_val not in ["0", "0.00"]: montant_float = float(d_val)
                    elif c_val and c_val not in ["0", "0.00"]: montant_float = float(c_val)
                    else: continue
                elif col_montant:
                    montant_float = float(clean_val(row[col_montant]))

                # --- PRÉPARATION DU TEXTE POUR DÉTECTION ---
                nom_t = str(row[col_nom]).strip()
                info_t = str(row[col_info]) if col_info and pd.notna(row[col_info]) else ""
                texte_integral = (nom_t + " " + info_t).upper()

                cat = "❓ Autre"

                # --- ÉTAPE A : DÉTECTION DES TRANSFERTS INTERNES (🔄) ---
                mes_comptes = ["LIVRET A", "LDDS", "COMPTE CHEQUES", "COMMUN", "CCP"]
                
                if "VERS" in texte_integral or "VIR MME FONTA AUDE" in texte_integral:
                    if "LIVRET A" in texte_integral: 
                        cat = "🔄 Virement : CCP vers Livret A"
                    elif any(c in texte_integral for c in ["COMPTE CHEQUES", "CCP"]): 
                        cat = "🔄 Virement : Livret A vers CCP"
                    elif any(c in texte_integral for c in mes_comptes): 
                        cat = "🔄 Transfert Interne"

                # --- ÉTAPE B : MÉMOIRE & MOTS-CLÉS SQL (Si pas encore catégorisé) ---
                if cat == "❓ Autre":
                    # 1. Mémoire Neon
                    cat = memoire.get(nom_t, "❓ Autre")
                    
                    # 2. Mots-clés SQL
                    if cat == "❓ Autre":
                        nom_t_lower = nom_t.lower()
                        for rule in mots_cles_rules:
                            if any(k in nom_t_lower for k in rule["keywords"]):
                                cat = rule["categorie"]
                                break

                # --- GESTION DATE & FINALISATION ---
                dt = pd.to_datetime(row[col_date], dayfirst=True, errors='coerce')
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
            except: continue
            
        print(f"DEBUG: {len(transactions_pretes)} transactions préparées")
        return transactions_pretes

    except Exception as e:
        print(f"CRASH: {e}")
        return []
    




@app.post("/transactions/batch")
def add_transactions_batch(transactions: List[Transaction]):
    # Supprime temporairement le ON CONFLICT pour forcer et voir l'erreur
    query = text("""
        INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, année, compte) 
        VALUES (:d, :n, :m, :c, :u, :mo, :a, :co)
    """)
    
    success_count = 0
    with engine.connect() as conn:
        for t in transactions:
            try:
                conn.execute(query, {
                    "d": t.date, "n": t.nom, "m": t.montant, 
                    "c": t.categorie, "u": t.utilisateur.lower(),
                    "mo": t.mois, "a": t.annee, "co": t.compte
                })
                success_count += 1
            except Exception as e:
                print(f"ERREUR LIGNE {t.nom}: {e}")
        conn.commit()
    return {"status": "success", "added": success_count}


@app.put("/config-categories/update")
async def update_category_keywords(data: dict):
    try:
        categorie = data.get("categorie")
        keywords_list = data.get("keywords", [])
        
        # Formatage propre pour l'array Postgres
        # On échappe les virgules ou caractères spéciaux si nécessaire
        keywords_sql = "{" + ",".join(keywords_list) + "}"
        
        # UPSERT : Si la catégorie existe, update. Sinon, insert.
        query = text("""
            INSERT INTO config_categories (categorie, mots_cles) 
            VALUES (:c, :k)
            ON CONFLICT (categorie) 
            DO UPDATE SET mots_cles = EXCLUDED.mots_cles
        """)
        
        with engine.connect() as conn:
            conn.execute(query, {"k": keywords_sql, "c": categorie})
            conn.commit()
            
        return {"status": "success"}
    except Exception as e:
        print(f"Erreur Update: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/config-categories")
def get_categories_config():
    query = text("SELECT categorie, mots_cles FROM config_categories ORDER BY id ASC")
    try:
        with engine.connect() as conn:
            result = conn.execute(query).fetchall()
            data = []
            for row in result:
                # Sécurité : on s'assure que mots_cles est traité comme une liste
                keywords = row[1]
                if keywords is None:
                    keywords = []
                elif isinstance(keywords, str):
                    # Si c'est une string "{A,B}", on la nettoie
                    keywords = keywords.replace("{", "").replace("}", "").split(",")
                
                data.append({
                    "categorie": row[0],
                    "mots_cles": list(keywords)
                })
            return data
    except Exception as e:
        print(f"CRASH SQL: {e}")
        return []



@app.get("/previsions/{utilisateur}/{mois}/{annee}")
def get_previsions_filtrees(utilisateur: str, mois: str, annee: int):
    # On prépare la base de la requête
    sql_base = "SELECT id, date, nom, montant, categorie, compte, mois, année as annee FROM previsions WHERE utilisateur = :u AND année = :a"
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
                previsions.append({
                    "id": r["id"],
                    "date": r["date"].isoformat() if r["date"] else None,
                    "nom": r["nom"],
                    "montant": float(r["montant"]),
                    "categorie": r["categorie"],
                    "compte": r["compte"],
                    "mois": r["mois"],
                    "annee": int(r["annee"])
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

@app.post("/previsions")
def add_prevision(p: PrevisionIn):
    query = text("""
        INSERT INTO previsions (date, nom, montant, categorie, compte, mois, année, utilisateur)
        VALUES (:d, :n, :m, :c, :compte, :mois, :annee, :u)
    """)
    try:
        with engine.connect() as conn:
            conn.execute(query, {
                "d": p.date, "n": f"[PRÉVI] {p.nom}", "m": p.montant, 
                "c": p.categorie, "compte": p.compte, "mois": p.mois, 
                "annee": p.annee, "u": p.utilisateur
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

        # Gestion de l'accent sur 'année' si nécessaire
        if "annee" in data:
            data["année"] = data.pop("annee")
            
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