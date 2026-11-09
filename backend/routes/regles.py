"""Prévisions et budgets récurrents.

Une règle crée elle-même les lignes ordinaires (prévisions ou budgets) des mois à venir, jusqu'à HORIZON mois.
Le reste de l'application les lit comme les autres. Une ligne modifiée à la main se détache de sa règle,
une ligne supprimée ne revient pas : la règle retient jusqu'à quel mois elle a déjà généré.
"""
import calendar
import re
from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from base import engine, get_current_user

router = APIRouter()

HORIZON = 12  # mois générés à l'avance, en comptant le mois en cours
# Les deux tables n'écrivent pas les mois de la même façon : on reprend chacune telle quelle.
MOIS_PREVISIONS = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"]
MOIS_BUDGETS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
_SANS_ACCENT = str.maketrans("éèêûôàâî", "eeeuoaai")


class RegleIn(BaseModel):
    type: Literal["prevision", "budget"]
    nom: str = Field(min_length=1, max_length=200)
    montant: float
    categorie: Optional[str] = None
    compte: Optional[str] = None
    jour: Optional[int] = Field(default=None, ge=1, le=31)
    debut: date
    fin: Optional[date] = None


class RegleModif(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=200)
    montant: Optional[float] = None
    categorie: Optional[str] = None
    compte: Optional[str] = None
    jour: Optional[int] = Field(default=None, ge=1, le=31)
    fin: Optional[date] = None
    sans_fin: bool = False
    actif: Optional[bool] = None


def _en_date(valeur) -> Optional[date]:
    if valeur is None or isinstance(valeur, date):
        return valeur
    return date.fromisoformat(str(valeur)[:10])


def premier_du_mois(jour: date) -> date:
    return jour.replace(day=1)


def mois_suivant(mois: date) -> date:
    return date(mois.year + mois.month // 12, mois.month % 12 + 1, 1)


def ajouter_mois(mois: date, nombre: int) -> date:
    for _ in range(nombre):
        mois = mois_suivant(mois)
    return mois


def numero_du_mois(nom: str) -> Optional[int]:
    """Lit un nom de mois écrit par l'une ou l'autre table, avec ou sans accent."""
    propre = str(nom or "").strip().lower().translate(_SANS_ACCENT)
    for numero, connu in enumerate(MOIS_PREVISIONS, start=1):
        if connu.lower() == propre:
            return numero
    return None


def mois_a_generer(regle: dict, aujourdhui: date) -> list:
    """Les mois que la règle doit encore créer : jamais avant le mois en cours, jamais deux fois."""
    courant = premier_du_mois(aujourdhui)
    debut = premier_du_mois(_en_date(regle["debut"]))
    deja = _en_date(regle.get("genere_jusqu_a"))
    depart = max(courant, debut, mois_suivant(deja) if deja else debut)
    fin = ajouter_mois(courant, HORIZON - 1)
    if regle.get("fin"):
        fin = min(fin, premier_du_mois(_en_date(regle["fin"])))
    mois, resultat = depart, []
    while mois <= fin:
        resultat.append(mois)
        mois = mois_suivant(mois)
    return resultat


def _nom_prevision(nom: str) -> str:
    return "[PRÉVI] " + re.sub(r"^\[PR[ÉE]VI\]\s*", "", nom, flags=re.IGNORECASE)


def _creer_ligne(conn, regle: dict, mois: date, utilisateur: str) -> None:
    if regle["type"] == "budget":
        nom_mois = MOIS_BUDGETS[mois.month - 1]
        # Un budget déjà fixé pour ce mois l'emporte : c'est l'exception voulue pour ce mois-là.
        existe = conn.execute(
            text("SELECT 1 FROM budgets WHERE LOWER(utilisateur) = :u AND nom = :n AND mois = :m AND annee = :a"),
            {"u": utilisateur, "n": regle["nom"], "m": nom_mois, "a": mois.year},
        ).first()
        if not existe:
            conn.execute(
                text("INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme, regle_id) VALUES (:u, :m, :a, :c, 'Categorie', :n, :s, :r)"),
                {"u": utilisateur, "m": nom_mois, "a": mois.year, "c": regle["compte"] or "tous", "n": regle["nom"], "s": regle["montant"], "r": regle["id"]},
            )
        return
    nom = _nom_prevision(regle["nom"])
    # Même règle que les budgets : une prévision du même nom déjà présente ce mois-là (retouchée à la main,
    # ou reconduite avec l'ancien bouton) l'emporte.
    existe = conn.execute(
        text("SELECT 1 FROM previsions WHERE LOWER(utilisateur) = :u AND nom = :n AND date >= :debut AND date < :fin"),
        {"u": utilisateur, "n": nom, "debut": mois, "fin": mois_suivant(mois)},
    ).first()
    if existe:
        return
    jour = min(regle["jour"] or 1, calendar.monthrange(mois.year, mois.month)[1])
    conn.execute(
        text("""
            INSERT INTO previsions (date, nom, montant, categorie, compte, mois, annee, utilisateur, actif, regle_id)
            VALUES (:d, :n, :m, :c, :compte, :mois, :a, :u, :actif, :r)
        """),
        {
            "d": date(mois.year, mois.month, jour), "n": nom, "m": regle["montant"],
            "c": regle["categorie"], "compte": regle["compte"], "mois": MOIS_PREVISIONS[mois.month - 1],
            "a": mois.year, "u": utilisateur, "actif": True, "r": regle["id"],
        },
    )


def appliquer_regles(conn, utilisateur: str, aujourdhui: Optional[date] = None) -> int:
    """Crée les lignes manquantes de toutes les règles actives du compte. Renvoie le nombre de mois traités."""
    aujourdhui = aujourdhui or date.today()
    regles = conn.execute(
        text("SELECT * FROM regles_recurrentes WHERE LOWER(utilisateur) = :u AND (actif IS NULL OR actif = :vrai)"),
        {"u": utilisateur, "vrai": True},
    ).mappings().all()
    total = 0
    for regle in regles:
        mois = mois_a_generer(dict(regle), aujourdhui)
        if not mois:
            continue
        # Deux pages ouvertes en même temps ne génèrent pas deux fois : seule celle qui avance le repère écrit.
        avant = _en_date(regle["genere_jusqu_a"])
        condition = "genere_jusqu_a = :avant" if avant else "genere_jusqu_a IS NULL"
        avance = conn.execute(
            text(f"UPDATE regles_recurrentes SET genere_jusqu_a = :jusqu_a WHERE id = :id AND {condition}"),
            {"jusqu_a": mois[-1], "id": regle["id"], "avant": avant},
        )
        if avance.rowcount != 1:
            continue
        for m in mois:
            _creer_ligne(conn, regle, m, utilisateur)
        total += len(mois)
    return total


def appliquer_sans_bloquer(utilisateur: str) -> None:
    """Pour les lectures : une règle en erreur ne doit jamais empêcher d'afficher les prévisions ou les budgets."""
    try:
        with engine.begin() as conn:
            appliquer_regles(conn, utilisateur)
    except Exception as erreur:  # noqa: BLE001
        from journaux import logger
        logger.error(f"Règles récurrentes non appliquées : {erreur}")


def _retirer_lignes_a_venir(conn, regle: dict, utilisateur: str, aujourdhui: date) -> None:
    """Retire les lignes encore rattachées à la règle pour les mois après le mois en cours. Le passé ne bouge pas."""
    apres = mois_suivant(premier_du_mois(aujourdhui))
    if regle["type"] == "prevision":
        # Une prévision déjà liée à une opération reste : la retirer casserait ce lien.
        conn.execute(
            text("""
                DELETE FROM previsions
                WHERE regle_id = :r AND LOWER(utilisateur) = :u AND date >= :apres
                  AND id NOT IN (SELECT prevision_id FROM transactions WHERE prevision_id IS NOT NULL)
            """),
            {"r": regle["id"], "u": utilisateur, "apres": apres},
        )
        return
    lignes = conn.execute(
        text("SELECT id, mois, annee FROM budgets WHERE regle_id = :r AND LOWER(utilisateur) = :u"),
        {"r": regle["id"], "u": utilisateur},
    ).mappings().all()
    for ligne in lignes:
        numero = numero_du_mois(ligne["mois"])
        if numero and date(int(ligne["annee"]), numero, 1) >= apres:
            conn.execute(text("DELETE FROM budgets WHERE id = :id"), {"id": ligne["id"]})


def _regle_du_compte(conn, regle_id: int, utilisateur: str) -> dict:
    regle = conn.execute(
        text("SELECT * FROM regles_recurrentes WHERE id = :id AND LOWER(utilisateur) = :u"),
        {"id": regle_id, "u": utilisateur},
    ).mappings().first()
    if not regle:
        raise HTTPException(status_code=404, detail="Règle introuvable.")
    return dict(regle)


def _pour_reponse(regle: dict) -> dict:
    return {
        **regle,
        "debut": str(_en_date(regle["debut"])),
        "fin": str(_en_date(regle["fin"])) if regle.get("fin") else None,
        "genere_jusqu_a": str(_en_date(regle["genere_jusqu_a"])) if regle.get("genere_jusqu_a") else None,
        "actif": regle.get("actif") is not False and regle.get("actif") != 0,
    }


@router.get("/api/regles")
def lister_regles(current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        appliquer_regles(conn, current_user)
        regles = conn.execute(
            text("SELECT * FROM regles_recurrentes WHERE LOWER(utilisateur) = :u ORDER BY type DESC, jour, nom"),
            {"u": current_user},
        ).mappings().all()
    return [_pour_reponse(dict(r)) for r in regles]


@router.post("/api/regles")
def creer_regle(regle: RegleIn, current_user: str = Depends(get_current_user)):
    if regle.type == "prevision" and not regle.jour:
        raise HTTPException(status_code=400, detail="Indiquez le jour du mois de la prévision.")
    if regle.fin and premier_du_mois(regle.fin) < premier_du_mois(regle.debut):
        raise HTTPException(status_code=400, detail="La fin doit venir après le début.")
    nom = re.sub(r"^\[PR[ÉE]VI\]\s*", "", regle.nom.strip(), flags=re.IGNORECASE)
    with engine.begin() as conn:
        nouvel_id = conn.execute(
            text("""
                INSERT INTO regles_recurrentes (utilisateur, type, nom, montant, categorie, compte, jour, debut, fin, actif)
                VALUES (:u, :t, :n, :m, :c, :compte, :j, :debut, :fin, :actif) RETURNING id
            """),
            {
                "u": current_user, "t": regle.type, "n": nom, "m": regle.montant, "c": regle.categorie,
                "compte": regle.compte, "j": regle.jour if regle.type == "prevision" else None,
                "debut": premier_du_mois(regle.debut), "fin": premier_du_mois(regle.fin) if regle.fin else None, "actif": True,
            },
        ).scalar()
        crees = appliquer_regles(conn, current_user)
    return {"status": "success", "id": nouvel_id, "mois_crees": crees}


@router.put("/api/regles/{regle_id}")
def modifier_regle(regle_id: int, modif: RegleModif, current_user: str = Depends(get_current_user)):
    """Change la règle pour les mois à venir : le mois en cours et le passé gardent leurs lignes."""
    aujourdhui = date.today()
    champs = {k: v for k, v in modif.model_dump(exclude_unset=True).items() if k not in ("sans_fin",) and v is not None}
    if "fin" in champs:
        champs["fin"] = premier_du_mois(champs["fin"])
    if modif.sans_fin:
        champs["fin"] = None
    if not champs:
        raise HTTPException(status_code=400, detail="Rien à modifier.")
    with engine.begin() as conn:
        regle = _regle_du_compte(conn, regle_id, current_user)
        _retirer_lignes_a_venir(conn, regle, current_user, aujourdhui)
        courant = premier_du_mois(aujourdhui)
        deja = _en_date(regle["genere_jusqu_a"])
        # Les mois à venir viennent d'être retirés : la règle les recréera avec ses nouvelles valeurs.
        champs["genere_jusqu_a"] = min(deja, courant) if deja else None
        affectations = ", ".join(f"{nom} = :{nom}" for nom in champs)
        conn.execute(
            text(f"UPDATE regles_recurrentes SET {affectations} WHERE id = :id AND LOWER(utilisateur) = :u"),
            {**champs, "id": regle_id, "u": current_user},
        )
        appliquer_regles(conn, current_user, aujourdhui)
    return {"status": "success"}


@router.delete("/api/regles/{regle_id}")
def supprimer_regle(regle_id: int, current_user: str = Depends(get_current_user)):
    """Arrête la règle : ses lignes à venir disparaissent, celles du mois en cours et du passé restent."""
    with engine.begin() as conn:
        regle = _regle_du_compte(conn, regle_id, current_user)
        _retirer_lignes_a_venir(conn, regle, current_user, date.today())
        table = "previsions" if regle["type"] == "prevision" else "budgets"
        conn.execute(text(f"UPDATE {table} SET regle_id = NULL WHERE regle_id = :r AND LOWER(utilisateur) = :u"), {"r": regle_id, "u": current_user})
        conn.execute(text("DELETE FROM regles_recurrentes WHERE id = :id"), {"id": regle_id})
    return {"status": "success"}
