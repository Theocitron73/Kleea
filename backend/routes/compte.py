"""Inscription, connexion, profil et préférences du compte."""
import json
import os
import resend
import secrets
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from journaux import detail_erreur, logger
from schemas import ImportModeRequest, LoginRequest, NewPasswordRequest, RegisterRequest, ResetRequest, UpdatePasswordRequest, UpdateProfileRequest
from sqlalchemy import text
from base import engine, get_current_user, hash_password, jeton_de_session, supprimer_sessions, verify_password
from routes.double_auth import double_auth_active, emettre_code, jeton_etape_connexion, supprimer_double_auth
from routes.streamdeck import supprimer_jeton_streamdeck
from securite import HONEYPOT_USERNAMES, ban_ip, check_and_record_failed_attempt, check_is_rate_limited, get_client_ip


router = APIRouter()


@router.post("/register")
def register(req: RegisterRequest, request: Request):
    # 🟢 VALIDATION DE LA ROBUSTESSE DU MOT DE PASSE
    pwd = req.password.strip()
    if len(pwd) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit comporter au moins 8 caractères.")
    if not any(c.isdigit() for c in pwd):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins un chiffre.")
    if not any(c.isalpha() for c in pwd):
        raise HTTPException(status_code=400, detail="Le mot de passe doit contenir au moins une lettre.")

    hashed_password = hash_password(pwd)
    full_name = f"{req.first_name} {req.last_name}".strip()
    
    with engine.connect() as conn:
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:nom) OR LOWER(email) = LOWER(:email)")
        existing = conn.execute(check_query, {"nom": req.nom, "email": req.email}).fetchone()
        
        if existing:
            raise HTTPException(status_code=400, detail="Identifiant ou email déjà utilisé")
        
        insert_query = text("""
            INSERT INTO users (username, email, password, name) 
            VALUES (:username, :email, :password, :name)
        """)
        conn.execute(insert_query, {
            "username": req.nom,
            "email": req.email,
            "password": hashed_password,
            "name": full_name
        })
        conn.commit()
        
    token = jeton_de_session({"sub": req.nom}, request.headers.get("user-agent"))
    return {
        "status": "success", 
        "message": "Bienvenue chez Kleea",
        "access_token": token,
        "token_type": "bearer",
        "user": req.nom
    }


# --- ROUTE : CONNEXION SÉCURISÉE AVEC PARE-FEU & HONEYPOT ---
@router.post("/login")
def login(req: LoginRequest, request: Request):
    client_ip = get_client_ip(request)
    identifiant_clean = req.nom.strip().lower()

    # 🍯 1. PIÈGE HONEYPOT : Détection immédiate des bots cherchant "admin", "root", etc.
    if identifiant_clean in HONEYPOT_USERNAMES:
        ban_ip(client_ip, f"Tentative de scan sur compte piège ('{req.nom}')", duration_minutes=1440) # 24 heures
        raise HTTPException(status_code=403, detail="Accès définitivement bloqué pour cette IP.")

    # 2. Recherche normale de l'utilisateur
    query = text("""
        SELECT username, password, role 
        FROM users 
        WHERE LOWER(username) = :identifiant OR LOWER(email) = :identifiant
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"identifiant": identifiant_clean}).fetchone()
        
        if not result:
            is_banned, remaining = check_and_record_failed_attempt(client_ip)
            if is_banned:
                raise HTTPException(status_code=403, detail="Trop de tentatives. Votre IP est bloquée pour 30 minutes.")
            raise HTTPException(status_code=404, detail="Identifiant ou e-mail inconnu")
        
        db_username, db_hashed_password, db_role = result # 👈 On extrait db_role
        
        # Vérification mot de passe...
        if not verify_password(req.password, db_hashed_password):
            is_banned, remaining = check_and_record_failed_attempt(client_ip)
            if is_banned:
                raise HTTPException(status_code=403, detail="Trop d'échecs consécutifs. Votre IP est suspendue pour 30 minutes.")
            pluriel = "s" if remaining > 1 else ""
            raise HTTPException(status_code=401, detail=f"Mot de passe incorrect. Il vous reste {remaining} tentative{pluriel} avant suspension.")
            
    if double_auth_active(db_username):
        return {"status": "double_auth", "double_auth_requise": True, "jeton_double_auth": jeton_etape_connexion(db_username), "email_masque": emettre_code(db_username)}

    # Création du Token JWT en intégrant le rôle dans le payload
    role_final = db_role if db_role else "user"
    token = jeton_de_session({"sub": db_username, "role": role_final}, request.headers.get("user-agent"))

    return {
        "status": "success",
        "access_token": token,
        "token_type": "bearer",
        "user": db_username,
        "role": role_final # 👈 Renvoyé au client
    }


# --- ROUTE : RÉCUPÉRER LE PROFIL ---
@router.get("/profile/{username}")
def get_profile(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce profil")

    query = text("""
        SELECT username, email, name, import_mode, role 
        FROM users 
        WHERE LOWER(username) = LOWER(:username)
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"username": current_user}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        db_username, db_email, db_name, db_mode, db_role = result
        return {
            "username": db_username,
            "email": db_email,
            "name": db_name if db_name else db_username,
            "import_mode": db_mode if db_mode else "manual",
            "role": db_role if db_role else "user" # 👈 Renvoyé au client
        }


# --- ROUTE : CHANGER LE MODE D'IMPORT (AUTO / MANUAL) ---
@router.put("/profile/{username}/import-mode")
def update_import_mode(username: str, req: ImportModeRequest, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce profil")

    if req.import_mode not in ["auto", "manual"]:
        raise HTTPException(status_code=400, detail="Mode invalide")
        
    query = text("""
        UPDATE users 
        SET import_mode = :mode 
        WHERE LOWER(username) = LOWER(:username)
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"mode": req.import_mode, "username": current_user})
            conn.commit()
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        return {"status": "success", "import_mode": req.import_mode}
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.post("/forgot-password")
async def forgot_password(req: ResetRequest):
    email_clean = req.email.lower().strip()

    # 🟢 RATE LIMITING PERSISTANT : 1 demande toutes les 3 minutes max par e-mail
    if check_is_rate_limited(key=email_clean, action="password_reset", max_attempts=1, window_minutes=3):
        # Réponse neutre pour ne rien divulguer tout en bloquant l'envoi de mail
        return {"message": "Si cet email est associé à un compte, vous recevrez un lien sous peu."}

    response_msg = {"message": "Si cet email est associé à un compte, vous recevrez un lien sous peu."}
    
    with engine.begin() as conn:
        query = text("SELECT username FROM users WHERE LOWER(email) = LOWER(:email)")
        user = conn.execute(query, {"email": email_clean}).fetchone()
        
        if not user:
            return response_msg
            
        token = secrets.token_urlsafe(32)
        update_query = text("UPDATE users SET reset_token = :t WHERE LOWER(email) = LOWER(:e)")
        conn.execute(update_query, {"t": token, "e": email_clean})

    frontend_url = os.getenv("SOUS_DOMAINE_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    resend.api_key = os.getenv("RESEND_API_KEY")
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
        resend.Emails.send({
            "from": "Kleea <noreply@theolebarbier.fr>", 
            "to": [email_clean],
            "subject": "Kleea - Récupération de votre accès",
            "html": html_content
        })
    except Exception as e:
        logger.error(f"Envoi de l'e-mail de récupération impossible : {type(e).__name__}")
    
    return response_msg


@router.post("/reset-password-confirm")
async def reset_password_confirm(req: NewPasswordRequest):
    hashed_password = hash_password(req.new_password)
    
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


# --- ROUTE : CHANGER LE MOT DE PASSE ---
@router.put("/profile/{username}/password")
def update_password(username: str, req: UpdatePasswordRequest, current_user: str = Depends(get_current_user)):
    # 🔒 SÉCURITÉ JWT : Empêche quiconque de modifier le mot de passe d'un autre profil
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Vous ne pouvez pas modifier le mot de passe d'un autre utilisateur")

    # 1. On hache le nouveau mot de passe
    hashed_password = hash_password(req.new_password)
    
    with engine.connect() as conn:
        # 2. On vérifie d'abord si l'utilisateur existe (insensible à la casse)
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": current_user}).fetchone()
        
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
            "username": current_user
        })
        conn.commit()
        
    return {"status": "success", "message": "Mot de passe mis à jour avec succès"}


# --- ROUTE : SUPPRIMER DÉFINITIVEMENT LE COMPTE ---
@router.delete("/profile/{username}")
def delete_account(username: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce profil")

    with engine.connect() as conn:
        # 1. On vérifie d'abord si l'utilisateur existe (insensible à la casse)
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": current_user}).fetchone()
        
        if not user_exists:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable")
        
        # 2. Suppression de l'utilisateur (Les cascades en BDD nettoieront le reste)
        delete_query = text("DELETE FROM users WHERE LOWER(username) = LOWER(:username)")
        conn.execute(delete_query, {"username": current_user})
        supprimer_jeton_streamdeck(conn, current_user)
        conn.commit()

    supprimer_sessions(current_user)
    supprimer_double_auth(current_user)
    return {"status": "success", "message": "Compte et données associés détruits définitivement"}


# --- ROUTE : MODIFIER LES INFOS PERSONNELLES ---
@router.put("/profile/{username}/details")
def update_profile_details(username: str, req: UpdateProfileRequest, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce profil")

    with engine.connect() as conn:
        # 1. Vérifier si l'utilisateur existe
        check_query = text("SELECT username FROM users WHERE LOWER(username) = LOWER(:username)")
        user_exists = conn.execute(check_query, {"username": current_user}).fetchone()
        
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
            "username": current_user
        })
        conn.commit()
        
    return {"status": "success", "message": "Profil mis à jour avec succès"}


# --- 1. BLOC-NOTES ---
@router.get("/note/{username}")
def get_note(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("SELECT texte FROM notes WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user}).fetchone()
    return {"texte": res[0] if res else ""}


@router.post("/note")
def save_note(data: dict, current_user: str = Depends(get_current_user)):
    t = data.get('texte', '')
    with engine.connect() as conn:
        conn.execute(text("DELETE FROM notes WHERE LOWER(utilisateur) = :u"), {"u": current_user})
        conn.execute(text("INSERT INTO notes (utilisateur, texte) VALUES (:u, :t)"), {"u": current_user, "t": t})
        conn.commit()
    return {"status": "success"}


@router.delete("/profile/me")
def delete_my_account(current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE LOWER(username) = :u"), {"u": current_user})
        supprimer_jeton_streamdeck(conn, current_user)
    supprimer_sessions(current_user)
    supprimer_double_auth(current_user)
    return {"status": "success"}


# Route de test sécurisée par JWT
@router.get("/auth/test-token")
def test_jwt_token(current_user: str = Depends(get_current_user)):
    return {
        "status": "succès",
        "message": "Token valide et authentifié !",
        "utilisateur_detecte": current_user
    }


@router.get("/api/pages-masquees/{username}")
def get_pages_masquees(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    with engine.begin() as conn:
        res = conn.execute(
            text("SELECT pages FROM pages_masquees WHERE LOWER(utilisateur) = :u"),
            {"u": current_user.lower().strip()}
        ).scalar()

        if res:
            try:
                return json.loads(res)
            except Exception:
                return []
        return []


@router.post("/api/pages-masquees")
def save_pages_masquees(data: dict = Body(...), current_user: str = Depends(get_current_user)):
    pages_list = data.get("pages", [])
    pages_json = json.dumps(pages_list)

    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO pages_masquees (utilisateur, pages)
            VALUES (:u, :p)
            ON CONFLICT (utilisateur) DO UPDATE
            SET pages = EXCLUDED.pages
        """), {"u": current_user.lower().strip(), "p": pages_json})

    return {"status": "success", "pages": pages_list}
