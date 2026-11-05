"""Catégories, mots-clés et mémoire de classement."""
import csv
import re
from fastapi import APIRouter, Body, Depends, HTTPException
from journaux import logger
from schemas import CategorieAssignGroup, CategorieCreate, CategorieUpdate, DeleteGroupRequest
from sqlalchemy import text
from typing import List
from urllib.parse import unquote
from base import engine, get_current_user


router = APIRouter()


def parse_keywords_list(raw_kw) -> List[str]:
    """Parse de manière infaillible les mots-clés retournés par PostgreSQL (ARRAY ou chaîne)."""
    if not raw_kw:
        return []
    if isinstance(raw_kw, list):
        return [str(k).strip().strip('"').strip("'") for k in raw_kw if str(k).strip()]
    
    s = str(raw_kw).strip()
    if s.startswith('{') and s.endswith('}'):
        s = s[1:-1]
    elif s.startswith('[') and s.endswith(']'):
        s = s[1:-1]
    
    try:
        reader = csv.reader([s], delimiter=',', quotechar='"', skipinitialspace=True)
        items = next(reader)
        return [item.strip().strip('"').strip("'") for item in items if item.strip()]
    except Exception:
        return [k.strip().strip('"').strip("'") for k in s.split(',') if k.strip()]


def matches_keyword_boundary(keyword: str, text: str) -> bool:
    """
    Vérifie si 'keyword' est présent dans 'text'.
    Gère les phrases exactes ET les mots multiples dans le désordre (ex: 'Jean Dupont' match 'DUPONT JEAN').
    Empêche les faux-positifs ('Jean' seul ne matchera pas 'Jean Dupont').
    """
    if not keyword or not text:
        return False
    kw_clean = keyword.strip().lower().replace('"', '').replace("'", "")
    txt_clean = text.lower()

    # 1. Correspondance exacte de l'expression
    escaped = re.escape(kw_clean)
    pattern = rf"(?<!\w){escaped}(?!\w)"
    if re.search(pattern, txt_clean):
        return True

    # 2. Si le mot-clé contient plusieurs mots (ex: "Jean Dupont"), vérifier que TOUS les mots sont présents
    words = [w for w in kw_clean.split() if len(w) >= 2]
    if len(words) > 1:
        all_words_match = all(bool(re.search(rf"(?<!\w){re.escape(w)}(?!\w)", txt_clean)) for w in words)
        if all_words_match:
            return True

    return False


# Constante globale : une seule source de vérité côté serveur
# Constante globale : Base des catégories d'origine sans les virements câblés en dur
CATEGORIES_DEFAUT = [
    "Salaire", "Remboursements", "Virement Reçu", "Virement Envoyé", "Compte Commun",
    "Abonnements", "Alimentation", "Shopping", "Habillement", 
    "Impôts", "Frais Bancaires", "Assurance Habitation", "Jeux vidéos",
    "Mutuelle", "Pharmacie", "Médecin/Santé", "Loyer", 
    "Bricolage", "Transports", "Carburant", "Auto", 
    "Retraits", "Internet", "Autre"
]


@router.post("/api/categories")
def add_category(cat: CategorieCreate, current_user: str = Depends(get_current_user)):
    clean_name = cat.nom.strip()
    clean_icon = cat.icone if cat.icone else "Tag"
    clean_color = cat.couleur if cat.couleur else "#818cf8"

    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM categories WHERE LOWER(utilisateur) = :u AND LOWER(nom) = LOWER(:n)"), 
            {"u": current_user, "n": clean_name}
        )
        conn.execute(
            text("INSERT INTO categories (nom, icone, couleur, utilisateur) VALUES (:n, :i, :c, :u)"),
            {"n": clean_name, "i": clean_icon, "c": clean_color, "u": current_user}
        )
    return {"status": "success"}


# 3. Modification : met à jour icone ET couleur
@router.put("/api/categories")
def update_category(cat: CategorieUpdate, current_user: str = Depends(get_current_user)):
    clean_name = cat.nom.strip()
    clean_user = current_user  # 👈 Token forcé
    clean_icon = cat.icone if cat.icone else "Tag"
    clean_color = cat.couleur if cat.couleur else "#818cf8"

    with engine.begin() as conn:
        check = conn.execute(
            text("SELECT 1 FROM categories WHERE LOWER(utilisateur) = :u AND LOWER(nom) = LOWER(:n)"),
            {"u": clean_user, "n": clean_name}
        ).fetchone()
        
        if check:
            conn.execute(
                text("""
                    UPDATE categories 
                    SET icone = :i, couleur = :c 
                    WHERE LOWER(utilisateur) = :u AND LOWER(nom) = LOWER(:n)
                """),
                {"n": clean_name, "i": clean_icon, "c": clean_color, "u": clean_user}
            )
        else:
            conn.execute(
                text("INSERT INTO categories (nom, icone, couleur, utilisateur) VALUES (:n, :i, :c, :u)"),
                {"n": clean_name, "i": clean_icon, "c": clean_color, "u": clean_user}
            )
    return {"status": "success"}


# --- 1. CATÉGORIES & MASQUAGES ---
@router.get("/api/categories/{user}")
def get_categories(user: str, current_user: str = Depends(get_current_user)):
    if user.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    user_clean = current_user.strip().lower()
    with engine.connect() as conn:
        try:
            query_perso = text("SELECT nom, icone, couleur, groupe FROM categories WHERE LOWER(utilisateur) = :u")
            result_perso = conn.execute(query_perso, {"u": user_clean}).fetchall()
            categories_perso = [row[0] for row in result_perso]
            icons_map = {row[0]: row[1] for row in result_perso if row[1] and str(row[1]).strip().lower() != 'tag'}
            colors_map = {row[0]: (row[2] or "#818cf8") for row in result_perso if len(row) > 2 and row[2]}
            groups_map = {row[0]: (row[3] or "Général") for row in result_perso if len(row) > 3}
        except Exception:
            query_perso = text("SELECT nom, icone FROM categories WHERE LOWER(utilisateur) = :u")
            result_perso = conn.execute(query_perso, {"u": user_clean}).fetchall()
            categories_perso = [row[0] for row in result_perso]
            icons_map = {}
            colors_map = {}
            groups_map = {}

        query_comptes = text("SELECT compte FROM configuration WHERE LOWER(utilisateur) = :u")
        result_comptes = conn.execute(query_comptes, {"u": user_clean}).fetchall()
        comptes_noms = [row[0] for row in result_comptes]
    
    types_detectes = set()
    for nom in comptes_noms:
        nom_upper = nom.upper()
        for t in ["CCP", "LIVRET A", "LEP", "LDDS", "PEL", "AUTRE"]:
            if t in nom_upper:
                types_detectes.add(t)
                break

    virements_dynamiques = []
    liste_types = sorted(list(types_detectes))
    for i in range(len(liste_types)):
        for j in range(i + 1, len(liste_types)):
            virements_dynamiques.append(f"Virement : {liste_types[i]} vers {liste_types[j]}")
            virements_dynamiques.append(f"Virement : {liste_types[j]} vers {liste_types[i]}")

    base_categories = [c for c in CATEGORIES_DEFAUT if not c.startswith("Virement :")]
    defaults_finales = base_categories + virements_dynamiques
    toutes_les_categories = sorted(list(set(defaults_finales + categories_perso)))

    return {
        "defaults": sorted(defaults_finales),
        "perso": sorted(categories_perso),
        "all": toutes_les_categories,
        "icons_map": icons_map,
        "colors_map": colors_map,
        "groups_map": groups_map
    }


@router.delete("/api/categories/{user}/{nom}")
def delete_category(user: str, nom: str, current_user: str = Depends(get_current_user)):
    if user.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    nom_decode = unquote(nom)
    query = text("DELETE FROM categories WHERE LOWER(utilisateur) = :u AND nom = :n")
    with engine.connect() as conn:
        conn.execute(query, {"u": current_user, "n": nom_decode})
        conn.commit()
    return {"status": "success"}


@router.put("/api/categories/assign-group")
def assign_category_group(req: CategorieAssignGroup, current_user: str = Depends(get_current_user)):
    clean_user = current_user  # 👈 Token forcé
    clean_name = req.nom.strip()
    clean_group = req.groupe.strip()

    with engine.begin() as conn:
        check = conn.execute(
            text("SELECT 1 FROM categories WHERE LOWER(utilisateur) = :u AND LOWER(nom) = LOWER(:n)"),
            {"u": clean_user, "n": clean_name}
        ).fetchone()

        if check:
            conn.execute(
                text("UPDATE categories SET groupe = :g WHERE LOWER(utilisateur) = :u AND LOWER(nom) = LOWER(:n)"),
                {"g": clean_group, "u": clean_user, "n": clean_name}
            )
        else:
            conn.execute(
                text("INSERT INTO categories (nom, icone, couleur, groupe, utilisateur) VALUES (:n, 'Tag', '#818cf8', :g, :u)"),
                {"n": clean_name, "g": clean_group, "u": clean_user}
            )

    return {"status": "success", "nom": clean_name, "groupe": clean_group}


@router.put("/api/categories/delete-group")
def delete_category_group(req: DeleteGroupRequest, current_user: str = Depends(get_current_user)):
    clean_user = current_user  # 👈 Token forcé
    clean_group = req.groupe.strip()
    clean_fallback = (req.fallback_groupe or "Général").strip()

    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE categories 
                SET groupe = :fallback 
                WHERE LOWER(utilisateur) = :u AND LOWER(groupe) = LOWER(:g)
            """),
            {"fallback": clean_fallback, "u": clean_user, "g": clean_group}
        )

    return {"status": "success", "deleted_group": clean_group, "fallback": clean_fallback}


@router.post("/memoire")
def add_to_memory(m: dict, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO memoire (utilisateur, nom, categorie)
        VALUES (:u, :n, :c)
        ON CONFLICT (utilisateur, nom) 
        DO UPDATE SET categorie = EXCLUDED.categorie
    """)
    with engine.connect() as conn:
        conn.execute(query, {"u": current_user, "n": m['nom'], "c": m['categorie']})
        conn.commit()
    return {"status": "success"}


# 🟢 1. FONCTION INTERNE POUR PYTHON (import-powens, import-csv, sync-user)
def fetch_memoire_data(username: str):
    query = text("SELECT nom, categorie FROM memoire WHERE LOWER(utilisateur) = :u ORDER BY LENGTH(nom) DESC")
    with engine.connect() as conn:
        result = conn.execute(query, {"u": username.lower().strip()}).fetchall()
        return [{"nom": row[0], "categorie": row[1]} for row in result]


# 🟢 2. ROUTE API SÉCURISÉE AVEC JWT
@router.get("/memoire/{username}")
def get_memoire(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return fetch_memoire_data(current_user)


@router.delete("/memoire/{username}/{nom}")
def delete_from_memory(username: str, nom: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("DELETE FROM memoire WHERE LOWER(utilisateur) = :u AND LOWER(nom) = :n")
    with engine.connect() as conn:
        conn.execute(query, {"u": current_user, "n": nom.lower()})
        conn.commit()
    return {"status": "success"}


@router.get("/api/categories_masquees/{user}")
def get_masked_categories(user: str, current_user: str = Depends(get_current_user)):
    if user.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("SELECT nom FROM categories_masquees WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        result = conn.execute(query, {"u": current_user}).fetchall()
        return [row[0] for row in result]


# --- SAUVEGARDER LES PRÉFÉRENCES MASQUÉES ---
@router.post("/api/categories_masquees/{user}")
def save_masked_categories(user: str, categories: List[str] = Body(default=[]), current_user: str = Depends(get_current_user)):
    if user.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM categories_masquees WHERE LOWER(utilisateur) = :u"), {"u": current_user})
        for cat in categories:
            if cat and str(cat).strip():
                conn.execute(
                    text("INSERT INTO categories_masquees (nom, utilisateur) VALUES (:n, :u)"),
                    {"n": str(cat).strip(), "u": current_user}
                )
    return {"status": "success"}


@router.put("/config-categories/update")
async def update_category_keywords(data: dict, current_user: str = Depends(get_current_user)):
    categorie = data.get("categorie")
    keywords_list = data.get("keywords", [])

    quoted_items = []
    for k in keywords_list:
        clean_k = str(k).strip().strip('"').replace('"', '\\"')
        if clean_k:
            quoted_items.append(f'"{clean_k}"')
    keywords_sql = "{" + ",".join(quoted_items) + "}"
    
    query = text("""
        INSERT INTO config_categories (categorie, mots_cles, utilisateur) 
        VALUES (:c, :k, :u)
        ON CONFLICT (categorie, utilisateur) 
        DO UPDATE SET mots_cles = EXCLUDED.mots_cles
    """)
    
    with engine.begin() as conn:
        conn.execute(query, {"k": keywords_sql, "c": categorie, "u": current_user.lower()})
        
    return {"status": "success"}


@router.get("/config-categories")
def get_categories_config(current_user: str = Depends(get_current_user)):
    query = text("""
        SELECT categorie, mots_cles, utilisateur 
        FROM config_categories 
        WHERE LOWER(utilisateur) = :u OR LOWER(utilisateur) = 'admin'
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"u": current_user.lower()}).fetchall()
        final_config = {}
        for row in result:
            cat_name = row[0]
            kw_list = parse_keywords_list(row[1])
            is_user = (str(row[2]).strip().lower() == current_user.lower())
            if cat_name not in final_config or is_user:
                final_config[cat_name] = kw_list

        return [{"categorie": k, "mots_cles": v} for k, v in final_config.items()]


def get_mots_cles_rules(utilisateur: str):
    """Charge les règles de mots-clés configurées pour un utilisateur."""
    mots_cles_rules = []
    try:
        with engine.connect() as conn:
            query_cat = text("""
                SELECT categorie, mots_cles, utilisateur 
                FROM config_categories 
                WHERE LOWER(utilisateur) = :u OR LOWER(utilisateur) = 'admin'
            """)
            result = conn.execute(query_cat, {"u": utilisateur.lower().strip()}).fetchall()
            
            temp_rules = {}
            for row in result:
                cat_name = row[0]
                kw_list = parse_keywords_list(row[1])
                owner = str(row[2]).strip().lower()
                
                if cat_name not in temp_rules or owner == utilisateur.lower().strip():
                    temp_rules[cat_name] = kw_list
            
            for cat, keys in temp_rules.items():
                mots_cles_rules.append({"categorie": cat, "keywords": keys})
    except Exception as e:
        logger.error(f"Erreur chargement mots_cles: {e}")
    
    return mots_cles_rules
