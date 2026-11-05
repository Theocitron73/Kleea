"""Projets d'épargne et enveloppes."""
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from journaux import logger
from schemas import Allocation, OrdreProjets, Projet
from sqlalchemy import text
from typing import Optional
from base import engine, get_current_user


router = APIRouter()


def verifier_nom_projet_libre(conn, nom: str, profil: str, current_user: str, sauf_id: Optional[int] = None):
    query = """
        SELECT 1 FROM projets
        WHERE LOWER(nom) = LOWER(:n) AND LOWER(profil) = LOWER(:p) AND LOWER(utilisateur) = :u
    """
    params = {"n": nom, "p": profil, "u": current_user}
    # Pas de paramètre NULL ici : avec psycopg 3, Postgres ne pourrait pas en déduire le type.
    if sauf_id is not None:
        query += " AND id <> :sauf"
        params["sauf"] = sauf_id
    if conn.execute(text(query), params).first():
        raise HTTPException(status_code=409, detail=f"Un projet « {nom} » existe déjà.")


# --- 1. PROJETS FUTURS ---
@router.get("/get-projets/{profil}")
def get_projets(profil: str, current_user: str = Depends(get_current_user)):
    query = text("""
        SELECT * FROM projets
        WHERE LOWER(profil) = LOWER(:p)
          AND LOWER(utilisateur) = :u
        ORDER BY ordre ASC NULLS LAST, date ASC
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"p": profil.lower(), "u": current_user}).mappings().all()
        return [dict(r) for r in res]


@router.post("/save-projet")
def save_projet(p: Projet, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO projets (utilisateur, profil, nom, cout, date, capa, apport_epargne, date_debut, utiliser_capa_stricte)
        VALUES (:u, :pr, :n, :co, :d, :ca, :ap, :dd, :ucs)
    """)
    with engine.begin() as conn:
        verifier_nom_projet_libre(conn, p.nom, p.profil, current_user)
        conn.execute(query, {
            "u": current_user,
            "pr": p.profil,
            "n": p.nom,
            "co": p.cout,
            "d": p.date,
            "ca": p.capa,
            "ap": p.apport,
            "dd": p.date_debut or str(date.today()),
            "ucs": p.utiliser_capa_stricte or False
        })
    return {"status": "success"}


@router.post("/reorder-projets")
def reorder_projets(ordre: OrdreProjets, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        for position, projet_id in enumerate(ordre.ids):
            conn.execute(
                text("UPDATE projets SET ordre = :o WHERE id = :id AND LOWER(utilisateur) = :u"),
                {"o": position, "id": projet_id, "u": current_user},
            )
    return {"status": "success"}


@router.post("/update-projet/{projet_id}")
def update_projet(projet_id: int, p: Projet, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE projets
        SET nom = :new_n, cout = :co, date = :d, capa = :ca, apport_epargne = :ap,
            date_debut = COALESCE(:dd, date_debut), utiliser_capa_stricte = :ucs
        WHERE id = :id AND LOWER(utilisateur) = :u
    """)
    with engine.begin() as conn:
        verifier_nom_projet_libre(conn, p.nom, p.profil, current_user, sauf_id=projet_id)
        res = conn.execute(query, {
            "id": projet_id,
            "u": current_user,
            "new_n": p.nom,
            "co": p.cout,
            "d": p.date,
            "ca": p.capa,
            "ap": p.apport,
            "dd": p.date_debut,
            "ucs": p.utiliser_capa_stricte or False
        })
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Projet introuvable")
    return {"status": "success"}


@router.delete("/delete-projet/{projet_id}")
def delete_projet(projet_id: int, current_user: str = Depends(get_current_user)):
    query = text("DELETE FROM projets WHERE id = :id AND LOWER(utilisateur) = :u")
    with engine.begin() as conn:
        res = conn.execute(query, {"id": projet_id, "u": current_user})
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Projet introuvable")
    return {"status": "deleted"}


# --- 2. ENVELOPPES D'ALLOCATIONS (RÉCUPÉRATION HISTORIQUE + SÉCURITÉ) ---
@router.get("/get-allocations/{profil_id}")
def get_allocations(profil_id: str, current_user: str = Depends(get_current_user)):
    query = text("""
        SELECT * FROM allocations 
        WHERE LOWER(profil) = LOWER(:p) 
          AND LOWER(utilisateur) = :u
        ORDER BY date_allocation DESC
    """)
    try:
        with engine.connect() as conn:
            res = conn.execute(query, {"p": str(profil_id), "u": current_user}).mappings().all()
            return [dict(r) for r in res]
    except Exception as e:
        logger.error(f"Erreur SQL Get Allocations: {e}")
        return []


# --- ENREGISTRER UNE NOUVELLE ALLOCATION ---
@router.post("/save-allocation")
def save_allocation(a: Allocation, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO allocations (utilisateur, profil, projet, montant_alloue)
        VALUES (:u, :pr, :pj, :m)
    """)
    with engine.begin() as conn:
        existe = conn.execute(text("""
            SELECT 1 FROM allocations
            WHERE LOWER(projet) = LOWER(:pj) AND LOWER(profil) = LOWER(:pr)
              AND LOWER(utilisateur) = :u
        """), {"pj": a.projet, "pr": a.profil, "u": current_user}).first()
        if existe:
            raise HTTPException(status_code=409, detail=f"Une enveloppe « {a.projet} » existe déjà.")
        conn.execute(query, {"u": current_user, "pr": a.profil, "pj": a.projet, "m": a.montant_alloue})
    return {"status": "success"}


@router.delete("/delete-enveloppe/{projet_nom}")
def delete_enveloppe(projet_nom: str, profil: str, current_user: str = Depends(get_current_user)):
    query = text("""
        DELETE FROM allocations
        WHERE LOWER(projet) = LOWER(:pj)
          AND LOWER(profil) = LOWER(:pr)
          AND LOWER(utilisateur) = :u
    """)
    with engine.begin() as conn:
        res = conn.execute(query, {"pj": projet_nom, "pr": profil, "u": current_user})
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Enveloppe introuvable")
    return {"status": "success"}


# --- MODIFIER LE MONTANT GLOBAL (remplace les lignes existantes de l'enveloppe) ---
@router.put("/update-enveloppe-montant")
def update_enveloppe_montant(projet: str, profil: str, nouveau_montant: float, current_user: str = Depends(get_current_user)):
    if nouveau_montant < 0:
        raise HTTPException(status_code=422, detail="Le montant ne peut pas être négatif.")
    query_del = text("""
        DELETE FROM allocations
        WHERE LOWER(projet) = LOWER(:pj)
          AND LOWER(profil) = LOWER(:pr)
          AND LOWER(utilisateur) = :u
    """)
    query_ins = text("""
        INSERT INTO allocations (utilisateur, profil, projet, montant_alloue)
        VALUES (:u, :pr, :pj, :m)
    """)
    with engine.begin() as conn:
        res = conn.execute(query_del, {"pj": projet, "pr": profil, "u": current_user})
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Enveloppe introuvable")
        conn.execute(query_ins, {"pj": projet, "pr": profil, "m": nouveau_montant, "u": current_user})
    return {"status": "success"}
