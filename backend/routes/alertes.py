"""Centre d'alertes : état des synchronisations et alertes masquées. Le calcul des alertes se fait dans le navigateur."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from base import engine, get_current_user
from journaux import logger


router = APIRouter()


class AlerteMasquee(BaseModel):
    id: str = Field(min_length=1, max_length=200)


def noter_synchro(utilisateur: str, erreur: Exception | None = None) -> None:
    """Garde le résultat d'une synchronisation. Une panne ici ne doit jamais faire échouer la synchronisation elle-même."""
    maintenant = datetime.now(timezone.utc)
    # Seule la nature de l'erreur est gardée : son texte peut contenir des données bancaires.
    code = None
    if erreur is not None:
        code = f"HTTP {erreur.status_code}" if isinstance(erreur, HTTPException) else type(erreur).__name__
    valeurs = {
        "u": utilisateur.lower().strip(),
        "t": maintenant,
        "s": None if erreur else maintenant,
        "e": maintenant if erreur else None,
        "c": code[:60] if code else None,
    }
    try:
        with engine.begin() as conn:
            conn.execute(text("""
                INSERT INTO synchro_etat (utilisateur, derniere_tentative, dernier_succes, dernier_echec, code_erreur)
                VALUES (:u, :t, :s, :e, :c)
                ON CONFLICT (utilisateur) DO UPDATE SET
                    derniere_tentative = EXCLUDED.derniere_tentative,
                    dernier_succes = COALESCE(EXCLUDED.dernier_succes, synchro_etat.dernier_succes),
                    dernier_echec = COALESCE(EXCLUDED.dernier_echec, synchro_etat.dernier_echec),
                    code_erreur = EXCLUDED.code_erreur
            """), valeurs)
    except Exception as e:
        logger.warning(f"⚠️ État de synchronisation non enregistré : {type(e).__name__}")


def en_iso(valeur):
    return valeur.isoformat() if hasattr(valeur, "isoformat") else valeur


@router.get("/api/alertes/etat")
def etat_des_alertes(current_user: str = Depends(get_current_user)):
    with engine.connect() as conn:
        synchro = conn.execute(
            text("SELECT derniere_tentative, dernier_succes, dernier_echec, code_erreur FROM synchro_etat WHERE utilisateur = :u"),
            {"u": current_user},
        ).mappings().first()
        masquees = conn.execute(
            text("SELECT alerte_id FROM alertes_masquees WHERE utilisateur = :u"),
            {"u": current_user},
        ).fetchall()
    return {
        "synchro": {cle: en_iso(valeur) for cle, valeur in synchro.items()} if synchro else None,
        "masquees": [ligne[0] for ligne in masquees],
    }


@router.post("/api/alertes/masquees")
def masquer_alerte(alerte: AlerteMasquee, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO alertes_masquees (utilisateur, alerte_id) VALUES (:u, :i)
                ON CONFLICT (utilisateur, alerte_id) DO NOTHING
            """),
            {"u": current_user, "i": alerte.id},
        )
    return {"status": "success"}


@router.delete("/api/alertes/masquees")
def reafficher_alertes(current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM alertes_masquees WHERE utilisateur = :u"), {"u": current_user})
    return {"status": "success"}
