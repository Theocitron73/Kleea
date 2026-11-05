"""Thèmes et préréglages."""
from fastapi import APIRouter, Depends, HTTPException
from journaux import logger
from schemas import ThemeConfig, ThemePresetIn, UserColorUpdate
from sqlalchemy import text
from base import engine, get_current_user


router = APIRouter()


def verifier_proprietaire_theme(nom: str, current_user: str):
    """Le thème d'un compte n'est lisible et modifiable que par ce compte."""
    if nom.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")


@router.get("/get-theme/{username}")
def get_theme(username: str, current_user: str = Depends(get_current_user)):
    verifier_proprietaire_theme(username, current_user)
    query = text("SELECT * FROM user_theme WHERE LOWER(utilisateur) = :u")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user}).fetchone()
        if res:
            return dict(res._mapping)
        return None


@router.post("/save-theme")
def save_theme(t: ThemeConfig, current_user: str = Depends(get_current_user)):
    verifier_proprietaire_theme(t.utilisateur, current_user)
    # Ajout des deux nouvelles colonnes dans l'INSERT et le SET du ON CONFLICT
    query = text("""
        INSERT INTO user_theme (utilisateur, bg_site, primary_color, text_main, radius, glass_blur, glass_bg, secondary_color)
        VALUES (:u, :bg, :p, :tm, :r, :gb, :gg, :sc)
        ON CONFLICT (utilisateur) DO UPDATE
        SET bg_site = :bg, primary_color = :p, text_main = :tm, radius = :r, glass_blur = :gb, glass_bg = :gg, secondary_color = :sc
    """)
    with engine.connect() as conn:
        conn.execute(query, {
            "u": current_user, 
            "bg": t.bg_site, 
            "p": t.primary_color, 
            "tm": t.text_main, 
            "r": t.radius,
            "gb": t.glass_blur,  # <-- AJOUT
            "gg": t.glass_bg,    # <-- AJOUT
            "sc": t.secondary_color
        })
        conn.commit()
    return {"status": "success"}


@router.get("/get-user-theme/{username}")
def get_user_theme(username: str, current_user: str = Depends(get_current_user)):
    verifier_proprietaire_theme(username, current_user)
    try:
        u_lower = current_user
        # Teste cette requête. Si elle crash, regarde ton terminal Python !
        # Note : On utilise des guillemets doubles pour les noms de colonnes sensibles
        query = text('SELECT element, "couleur" FROM theme WHERE LOWER("user") = :u')
        
        with engine.connect() as conn:
            result = conn.execute(query, {"u": u_lower})
            rows = result.mappings().all()
            
            data = {row['element']: row['couleur'] for row in rows}
            return data
            
    except Exception as e:
        logger.error(f"❌ ERREUR SQL : {e}") # L'erreur exacte s'affichera ici !
        # On renvoie un dico vide pour éviter l'erreur 500 et le blocage CORS
        return {}


@router.post("/save-user-theme")
def save_user_theme(c: UserColorUpdate, current_user: str = Depends(get_current_user)):
    verifier_proprietaire_theme(c.user, current_user)
    query = text("""
        INSERT INTO theme ("user", element, couleur)
        VALUES (:u, :e, :c)
        ON CONFLICT ("user", element) DO UPDATE 
        SET couleur = :c
    """)
    with engine.begin() as conn:
        conn.execute(query, {"u": current_user, "e": c.element, "c": c.couleur})
    return {"status": "success"}


@router.get("/api/themes/presets")
def get_theme_presets(current_user: str = Depends(get_current_user)):
    with engine.connect() as conn:
        res = conn.execute(text("""
            SELECT id, nom, bg_site, primary_color, secondary_color, text_main, glass_bg, glass_blur, radius,
                   gradient_style, gradient_intensity, gradient_color,
                   gradient_angle, gradient_shape, gradient_center, gradient_spread, is_active
            FROM theme_presets 
            WHERE LOWER(utilisateur) = :u
            ORDER BY id ASC
        """), {"u": current_user}).mappings().all()
        return [dict(r) for r in res]


@router.post("/api/themes/presets")
def save_theme_preset(p: ThemePresetIn, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        query = text("""
            INSERT INTO theme_presets (utilisateur, nom, bg_site, primary_color, secondary_color, text_main, glass_bg, glass_blur, radius, gradient_style, gradient_intensity, gradient_color, gradient_angle, gradient_shape, gradient_center, gradient_spread)
            VALUES (:u, :nom, :bg, :pri, :sec, :tm, :gb, :gblur, :rad, :gs, :gi, :gc, :ga, :gsh, :gce, :gsp)
            ON CONFLICT (utilisateur, nom) DO UPDATE
            SET bg_site = EXCLUDED.bg_site, primary_color = EXCLUDED.primary_color,
                secondary_color = EXCLUDED.secondary_color, text_main = EXCLUDED.text_main,
                glass_bg = EXCLUDED.glass_bg, glass_blur = EXCLUDED.glass_blur, radius = EXCLUDED.radius,
                gradient_style = EXCLUDED.gradient_style, gradient_intensity = EXCLUDED.gradient_intensity,
                gradient_color = EXCLUDED.gradient_color, gradient_angle = EXCLUDED.gradient_angle,
                gradient_shape = EXCLUDED.gradient_shape, gradient_center = EXCLUDED.gradient_center,
                gradient_spread = EXCLUDED.gradient_spread
        """)
        conn.execute(query, {
            "u": current_user, "nom": p.nom, "bg": p.bg_site, "pri": p.primary_color, "sec": p.secondary_color,
            "tm": p.text_main, "gb": p.glass_bg, "gblur": p.glass_blur, "rad": p.radius,
            "gs": p.gradient_style or "radial", "gi": p.gradient_intensity or "50%", "gc": p.gradient_color or "auto",
            "ga": p.gradient_angle, "gsh": p.gradient_shape, "gce": p.gradient_center, "gsp": p.gradient_spread
        })
    return {"status": "success"}


@router.post("/api/themes/presets/{preset_id}/apply")
def apply_theme_preset(preset_id: int, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        preset = conn.execute(text("""
            SELECT * FROM theme_presets WHERE id = :id AND LOWER(utilisateur) = :u
        """), {"id": preset_id, "u": current_user}).mappings().first()
        
        if not preset:
            raise HTTPException(status_code=404, detail="Thème introuvable")

        # 1. Marque le thème comme actif
        conn.execute(text("UPDATE theme_presets SET is_active = FALSE WHERE LOWER(utilisateur) = :u"), {"u": current_user})
        conn.execute(text("UPDATE theme_presets SET is_active = TRUE WHERE id = :id"), {"id": preset_id})

        # 2. Met à jour user_theme (rechargé au boot du site)
        conn.execute(text("""
            INSERT INTO user_theme (utilisateur, bg_site, primary_color, text_main, radius, glass_blur, glass_bg, secondary_color)
            VALUES (:u, :bg, :p, :tm, :r, :gb, :gg, :sc)
            ON CONFLICT (utilisateur) DO UPDATE
            SET bg_site = :bg, primary_color = :p, text_main = :tm, radius = :r, glass_blur = :gb, glass_bg = :gg, secondary_color = :sc
        """), {
            "u": current_user, "bg": preset["bg_site"], "p": preset["primary_color"], "sc": preset["secondary_color"],
            "tm": preset["text_main"], "r": preset["radius"], "gb": preset["glass_blur"], "gg": preset["glass_bg"]
        })

    return {"status": "success", "preset": dict(preset)}


@router.delete("/api/themes/presets/{preset_id}")
def delete_theme_preset(preset_id: int, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        res = conn.execute(text("""
            DELETE FROM theme_presets WHERE id = :id AND LOWER(utilisateur) = :u
        """), {"id": preset_id, "u": current_user})
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Thème introuvable")
    return {"status": "success"}
