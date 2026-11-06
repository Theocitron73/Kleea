"""Dépenses récurrentes ignorées par le compte connecté. La détection elle-même se fait dans le navigateur."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from base import engine, get_current_user


router = APIRouter()


class AbonnementIgnore(BaseModel):
    id: str = Field(min_length=1, max_length=200)


@router.get("/api/abonnements/ignores")
def lister_ignores(current_user: str = Depends(get_current_user)):
    with engine.connect() as conn:
        lignes = conn.execute(
            text("SELECT abonnement_id FROM abonnements_ignores WHERE utilisateur = :u ORDER BY created_at"),
            {"u": current_user},
        ).fetchall()
    return [ligne[0] for ligne in lignes]


@router.post("/api/abonnements/ignores")
def ajouter_ignore(ignore: AbonnementIgnore, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO abonnements_ignores (utilisateur, abonnement_id) VALUES (:u, :i)
                ON CONFLICT (utilisateur, abonnement_id) DO NOTHING
            """),
            {"u": current_user, "i": ignore.id},
        )
    return {"status": "success"}


@router.delete("/api/abonnements/ignores")
def retirer_ignore(id: str, current_user: str = Depends(get_current_user)):
    if not id:
        raise HTTPException(status_code=422, detail="Identifiant manquant.")
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM abonnements_ignores WHERE utilisateur = :u AND abonnement_id = :i"),
            {"u": current_user, "i": id},
        )
    return {"status": "success"}
