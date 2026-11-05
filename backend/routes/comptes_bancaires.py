"""Configuration des comptes."""
from fastapi import APIRouter, Depends, HTTPException
from schemas import CompteConfig
from sqlalchemy import text
from base import engine, get_current_user
from chiffrement import decrypt_iban, encrypt_iban


router = APIRouter()


# --- ROUTE : RÉCUPÉRER LA CONFIGURATION DES COMPTES ---
@router.get("/config-comptes/{username}")
def get_config_comptes(username: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    u_clean = current_user.strip().lower()
    query = text("SELECT * FROM configuration WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        result = conn.execute(query, {"u": u_clean})
        comptes = [dict(row._mapping) for row in result]
        for c in comptes:
            if c.get("powens_name"):
                c["powens_name"] = decrypt_iban(c["powens_name"])
    return comptes


# 🟢 CRÉATION : Chiffre l'IBAN avant insertion en base
# --- ROUTE : AJOUTER UN COMPTE ---
@router.post("/config-comptes")
def add_compte(c: CompteConfig, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT : on force l'insertion sous l'utilisateur authentifié
    encrypted_link = encrypt_iban(c.powens_name) if c.powens_name else None
    query = text("""
        INSERT INTO configuration (compte, groupe, solde, objectif, couleur, utilisateur, taux, powens_name) 
        VALUES (:c, :g, :s, :o, :col, :u, :t, :p)
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "c": c.compte, "g": c.groupe, "s": c.solde, 
            "o": c.objectif, "col": c.couleur, "u": current_user,
            "t": c.taux, "p": encrypted_link
        })
        conn.commit()
    return {"status": "success"}


# --- ROUTE : METTRE À JOUR UN COMPTE ---
@router.put("/config-comptes/{compte_name}")
def update_compte(compte_name: str, c: CompteConfig, current_user: str = Depends(get_current_user)):
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
            "c": name_clean, "u": current_user
        })
        conn.commit()
    return {"status": "updated", "rows_affected": result.rowcount}


# --- ROUTE : SUPPRIMER UN COMPTE ---
@router.delete("/config-comptes/{compte_name}/{username}")
def delete_compte(compte_name: str, username: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("DELETE FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        conn.execute(query, {"c": compte_name, "u": current_user})
        conn.commit()
    return {"status": "deleted"}
