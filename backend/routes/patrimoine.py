"""Valeur nette : biens et dettes du compte, avec l'échéancier des crédits et le rapprochement des opérations."""
import json
import time
from datetime import date, datetime, timezone
from typing import Literal, Optional

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from base import engine, get_current_user
from journaux import logger
import patrimoine_calculs as calc

router = APIRouter()

TYPES_BIENS = Literal["immobilier", "placement", "crypto", "vehicule", "autre"]
TYPES_DETTES = Literal["immobilier", "auto", "conso", "autre"]
# Identifiants CoinGecko proposés : une liste fermée, pour ne jamais transmettre de saisie libre au service externe.
CRYPTOS = {
    "bitcoin": "Bitcoin", "ethereum": "Ethereum", "solana": "Solana", "binancecoin": "BNB", "ripple": "XRP",
    "cardano": "Cardano", "dogecoin": "Dogecoin", "polkadot": "Polkadot", "litecoin": "Litecoin", "chainlink": "Chainlink",
    "avalanche-2": "Avalanche", "tron": "TRON", "tether": "Tether (USDT)", "usd-coin": "USDC",
}
URL_COURS = "https://api.coingecko.com/api/v3/simple/price"
DUREE_CACHE = 300  # secondes : un cours vieux de 5 minutes suffit pour une valeur nette
_cache_cours: dict = {}


def cours_crypto(identifiants: set) -> dict:
    """Cours en euros des cryptos demandées. Un service injoignable renvoie ce qui est en cache, sans erreur."""
    identifiants = {i for i in identifiants if i in CRYPTOS}
    maintenant = time.time()
    manquants = sorted(i for i in identifiants if maintenant - _cache_cours.get(i, (0, 0))[0] > DUREE_CACHE)
    if manquants:
        try:
            reponse = requests.get(URL_COURS, params={"ids": ",".join(manquants), "vs_currencies": "eur"}, timeout=5)
            reponse.raise_for_status()
            for ident, valeurs in reponse.json().items():
                if isinstance(valeurs, dict) and isinstance(valeurs.get("eur"), (int, float)):
                    _cache_cours[ident] = (maintenant, float(valeurs["eur"]))
        except (requests.RequestException, ValueError) as erreur:
            logger.warning(f"Cours crypto indisponibles : {erreur}")
    return {i: _cache_cours[i][1] for i in identifiants if i in _cache_cours}


class BienIn(BaseModel):
    type: TYPES_BIENS
    nom: str = Field(min_length=1, max_length=200)
    valeur: Optional[float] = Field(default=None, ge=0, le=1e10)
    date_valeur: Optional[date] = None
    decote: Optional[float] = Field(default=None, ge=0, le=100)
    libelle_lien: Optional[str] = Field(default=None, max_length=100)
    profil: Optional[str] = None
    quantite: Optional[float] = Field(default=None, gt=0, le=1e12)
    crypto_id: Optional[str] = None


class BienModif(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=200)
    valeur: Optional[float] = Field(default=None, ge=0, le=1e10)
    decote: Optional[float] = Field(default=None, ge=0, le=100)
    libelle_lien: Optional[str] = Field(default=None, max_length=100)
    profil: Optional[str] = None
    quantite: Optional[float] = Field(default=None, gt=0, le=1e12)


class DetteIn(BaseModel):
    type: TYPES_DETTES
    nom: str = Field(min_length=1, max_length=200)
    montant: float = Field(gt=0, le=1e10)
    taux: float = Field(ge=0, le=50)
    duree_mois: int = Field(ge=1, le=600)
    debut: date
    libelle_lien: Optional[str] = Field(default=None, max_length=100)
    profil: Optional[str] = None
    powens_compte_id: Optional[str] = Field(default=None, max_length=50)


class DetteModif(BaseModel):
    nom: Optional[str] = Field(default=None, min_length=1, max_length=200)
    libelle_lien: Optional[str] = Field(default=None, max_length=100)
    profil: Optional[str] = None
    montant: Optional[float] = Field(default=None, gt=0, le=1e10)
    taux: Optional[float] = Field(default=None, ge=0, le=50)
    duree_mois: Optional[int] = Field(default=None, ge=1, le=600)
    debut: Optional[date] = None


class AnticipeIn(BaseModel):
    montant: float = Field(gt=0, le=1e10)
    date: date
    effet: Literal["duree", "mensualite"]
    operation_id: Optional[int] = None


def _jour(valeur) -> Optional[date]:
    if valeur is None or (isinstance(valeur, date) and not isinstance(valeur, datetime)):
        return valeur
    if isinstance(valeur, datetime):
        return valeur.date()
    return date.fromisoformat(str(valeur)[:10])


def _liste(valeur) -> list:
    try:
        return json.loads(valeur) if valeur else []
    except (TypeError, ValueError):
        return []


def _dette(ligne: dict) -> dict:
    anticipes = [{**a, "date": _jour(a["date"])} for a in _liste(ligne.get("anticipes"))]
    return {**ligne, "debut": _jour(ligne["debut"]), "anticipes": anticipes, "ignores": _liste(ligne.get("ignores"))}


def _operations(conn, utilisateur: str, libelles: set) -> list:
    """Les opérations dont le libellé contient l'un des mots reliés : rien n'est lu si aucun lien n'est défini."""
    libelles = {l.strip().lower() for l in libelles if l and l.strip()}
    if not libelles:
        return []
    conditions = " OR ".join(f"LOWER(nom) LIKE :l{i}" for i in range(len(libelles)))
    params = {f"l{i}": f"%{l}%" for i, l in enumerate(libelles)}
    lignes = conn.execute(
        text(f"SELECT id, date, nom, montant FROM transactions WHERE LOWER(utilisateur) = :u AND ({conditions})"),
        {"u": utilisateur, **params},
    ).mappings().all()
    return [{**dict(l), "date": _jour(l["date"])} for l in lignes if l["date"] is not None]


def _une(conn, table: str, ident: int, utilisateur: str) -> dict:
    ligne = conn.execute(text(f"SELECT * FROM {table} WHERE id = :id AND LOWER(utilisateur) = :u"), {"id": ident, "u": utilisateur}).mappings().first()
    if not ligne:
        raise HTTPException(status_code=404, detail="Élément introuvable.")
    return dict(ligne)


def _en_texte(valeur):
    return str(valeur) if isinstance(valeur, date) else valeur


def categorie_virement(nom_bien: str) -> str:
    """Le préfixe « Virement : » suffit pour que le flux, le bilan et les prévisions y voient un virement interne."""
    return f"Virement : vers {nom_bien.strip()}"[:100]


def relier_virements(conn, utilisateur: str, nom_bien: str, libelle: str) -> int:
    """Classe les virements vers ce placement comme virements internes : les passés tout de suite, les futurs par une règle d'import.

    Une opération déjà classée « Virement : … » garde sa catégorie. Renvoie le nombre d'opérations reclassées.
    """
    categorie = categorie_virement(nom_bien)
    reclassees = conn.execute(
        text("""UPDATE transactions SET categorie = :c
                WHERE LOWER(utilisateur) = :u AND LOWER(nom) LIKE :l AND montant < 0
                  AND (categorie IS NULL OR categorie NOT LIKE 'Virement :%')"""),
        {"c": categorie, "u": utilisateur, "l": f"%{libelle.strip().lower()}%"},
    ).rowcount
    conn.execute(text("DELETE FROM config_categories WHERE categorie = :c AND LOWER(utilisateur) = :u"), {"c": categorie, "u": utilisateur})
    mot = libelle.strip().replace('"', "")
    conn.execute(
        text("INSERT INTO config_categories (categorie, mots_cles, utilisateur) VALUES (:c, :k, :u)"),
        {"c": categorie, "k": "{" + f'"{mot}"' + "}", "u": utilisateur.lower()},
    )
    return reclassees


def delier_virements(conn, utilisateur: str, nom_bien: str) -> None:
    """Retire la règle d'import ; les opérations déjà classées gardent leur catégorie."""
    conn.execute(text("DELETE FROM config_categories WHERE categorie = :c AND LOWER(utilisateur) = :u"), {"c": categorie_virement(nom_bien), "u": utilisateur})


@router.get("/api/patrimoine")
def lire_patrimoine(annee: Optional[int] = None, profil: Optional[str] = None, current_user: str = Depends(get_current_user)):
    aujourdhui = date.today()
    with engine.connect() as conn:
        biens = [dict(b) for b in conn.execute(text("SELECT * FROM biens WHERE LOWER(utilisateur) = :u ORDER BY id"), {"u": current_user}).mappings()]
        dettes = [_dette(dict(d)) for d in conn.execute(text("SELECT * FROM dettes WHERE LOWER(utilisateur) = :u ORDER BY id"), {"u": current_user}).mappings()]
        operations = _operations(conn, current_user, {b.get("libelle_lien") for b in biens} | {d.get("libelle_lien") for d in dettes})
    cours = cours_crypto({b.get("crypto_id") for b in biens if b.get("crypto_id")})

    sortie_biens = []
    for b in biens:
        b["date_valeur"] = _jour(b["date_valeur"])
        verse = 0.0 if b.get("crypto_id") else calc.versements_lies(b, operations)
        sortie_biens.append({
            "id": b["id"], "type": b["type"], "nom": b["nom"], "valeur_saisie": b["valeur"], "date_valeur": str(b["date_valeur"]),
            "decote": b["decote"], "libelle_lien": b["libelle_lien"], "profil": b["profil"],
            "quantite": b.get("quantite"), "crypto_id": b.get("crypto_id"), "cours": cours.get(b.get("crypto_id")),
            "versements": verse, "valeur": calc.valeur_bien(b, aujourdhui, verse, cours.get(b.get("crypto_id"))),
        })
    sortie_dettes = []
    for d in dettes:
        etat = calc.etat_dette(d, aujourdhui)
        lien = calc.rapprocher(d, operations, aujourdhui)
        capital_calcule = etat["capital_restant"]
        # Le capital annoncé par la banque l'emporte sur le calcul : il tient compte de ce que l'échéancier ignore.
        if d.get("capital_banque") is not None:
            etat["capital_restant"] = round(float(d["capital_banque"]), 2)
        sortie_dettes.append({
            "id": d["id"], "type": d["type"], "nom": d["nom"], "montant": d["montant"], "taux": d["taux"], "duree_mois": d["duree_mois"],
            "debut": str(d["debut"]), "libelle_lien": d["libelle_lien"], "profil": d["profil"],
            "anticipes": [{**a, "date": str(a["date"])} for a in d["anticipes"]],
            **{k: _en_texte(v) for k, v in etat.items()},
            "capital_calcule": capital_calcule,
            "powens_compte_id": d.get("powens_compte_id"),
            "capital_banque_le": str(d["capital_banque_le"])[:10] if d.get("capital_banque_le") else None,
            "echeances": [{"date": str(e["date"]), "vue": e["vue"]} for e in lien["echeances"]],
            "anticipes_detectes": [{**a, "date": str(a["date"])} for a in lien["anticipes_detectes"]],
        })
    reponse = {
        "biens": sortie_biens,
        "dettes": sortie_dettes,
        "total_biens": round(sum(b["valeur"] for b in sortie_biens), 2),
        "total_dettes": round(sum(d["capital_restant"] for d in sortie_dettes), 2),
        "cryptos": CRYPTOS,
    }
    if annee:
        # Comme la carte du tableau de bord : un élément sans profil compte pour tous les profils.
        du_profil = lambda e: not profil or profil == "Tous" or not e.get("profil") or e["profil"] == profil  # noqa: E731
        reponse["historique"] = calc.historique([b for b in biens if du_profil(b)], [d for d in dettes if du_profil(d)], operations, annee, aujourdhui, cours)
    return reponse


@router.post("/api/biens")
def creer_bien(bien: BienIn, current_user: str = Depends(get_current_user)):
    valeur = bien.valeur
    if bien.crypto_id is not None:
        if bien.crypto_id not in CRYPTOS or not bien.quantite:
            raise HTTPException(status_code=400, detail="Choisissez une crypto de la liste et indiquez la quantité.")
        cours = cours_crypto({bien.crypto_id}).get(bien.crypto_id)
        if cours:
            valeur = round(bien.quantite * cours, 2)
    if valeur is None:
        raise HTTPException(status_code=400, detail="Indiquez la valeur actuelle (le cours n’est pas disponible pour le moment).")
    with engine.begin() as conn:
        ident = conn.execute(
            text("""INSERT INTO biens (utilisateur, type, nom, valeur, date_valeur, decote, libelle_lien, profil, quantite, crypto_id)
                    VALUES (:u, :t, :n, :v, :d, :dec, :l, :p, :q, :c) RETURNING id"""),
            {"u": current_user, "t": bien.type, "n": bien.nom.strip(), "v": valeur, "d": bien.date_valeur or date.today(),
             "dec": bien.decote or None, "l": (bien.libelle_lien or "").strip() or None, "p": bien.profil or None,
             "q": bien.quantite if bien.crypto_id else None, "c": bien.crypto_id},
        ).scalar()
        libelle = (bien.libelle_lien or "").strip()
        reclassees = relier_virements(conn, current_user, bien.nom, libelle) if libelle and not bien.crypto_id else 0
    return {"status": "success", "id": ident, "virements_reclasses": reclassees}


@router.put("/api/biens/{bien_id}")
def modifier_bien(bien_id: int, modif: BienModif, current_user: str = Depends(get_current_user)):
    champs = modif.model_dump(exclude_unset=True)
    if not champs:
        raise HTTPException(status_code=400, detail="Rien à modifier.")
    if "valeur" in champs:
        # Une nouvelle valeur saisie repart d'aujourd'hui : les versements reliés et la décote comptent à partir de là.
        champs["date_valeur"] = date.today()
    if "libelle_lien" in champs:
        champs["libelle_lien"] = (champs["libelle_lien"] or "").strip() or None
    reclassees = 0
    with engine.begin() as conn:
        avant = _une(conn, "biens", bien_id, current_user)
        affectations = ", ".join(f"{k} = :{k}" for k in champs)
        conn.execute(text(f"UPDATE biens SET {affectations} WHERE id = :id AND LOWER(utilisateur) = :u"), {**champs, "id": bien_id, "u": current_user})
        if ("libelle_lien" in champs or "nom" in champs) and not avant.get("crypto_id"):
            libelle = champs.get("libelle_lien", avant.get("libelle_lien"))
            delier_virements(conn, current_user, avant["nom"])
            if libelle:
                reclassees = relier_virements(conn, current_user, champs.get("nom", avant["nom"]), libelle)
    return {"status": "success", "virements_reclasses": reclassees}


@router.delete("/api/biens/{bien_id}")
def supprimer_bien(bien_id: int, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        bien = _une(conn, "biens", bien_id, current_user)
        conn.execute(text("DELETE FROM biens WHERE id = :id"), {"id": bien_id})
        delier_virements(conn, current_user, bien["nom"])
    return {"status": "success"}


@router.post("/api/dettes")
def creer_dette(dette: DetteIn, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        ident = conn.execute(
            text("""INSERT INTO dettes (utilisateur, type, nom, montant, taux, duree_mois, debut, libelle_lien, profil, anticipes, ignores, powens_compte_id)
                    VALUES (:u, :t, :n, :m, :taux, :duree, :debut, :l, :p, '[]', '[]', :pw) RETURNING id"""),
            {"u": current_user, "t": dette.type, "n": dette.nom.strip(), "m": dette.montant, "taux": dette.taux, "duree": dette.duree_mois,
             "debut": dette.debut, "l": (dette.libelle_lien or "").strip() or None, "p": dette.profil or None, "pw": dette.powens_compte_id},
        ).scalar()
    return {"status": "success", "id": ident}


@router.put("/api/dettes/{dette_id}")
def modifier_dette(dette_id: int, modif: DetteModif, current_user: str = Depends(get_current_user)):
    """Corriger le montant, le taux, la durée ou la date recalcule tout l'échéancier ; les remboursements anticipés restent."""
    champs = modif.model_dump(exclude_unset=True)
    champs = {k: v for k, v in champs.items() if v is not None or k in ("libelle_lien", "profil")}
    if not champs:
        raise HTTPException(status_code=400, detail="Rien à modifier.")
    if "libelle_lien" in champs:
        champs["libelle_lien"] = (champs["libelle_lien"] or "").strip() or None
    with engine.begin() as conn:
        _une(conn, "dettes", dette_id, current_user)
        affectations = ", ".join(f"{k} = :{k}" for k in champs)
        conn.execute(text(f"UPDATE dettes SET {affectations} WHERE id = :id AND LOWER(utilisateur) = :u"), {**champs, "id": dette_id, "u": current_user})
    return {"status": "success"}


@router.delete("/api/dettes/{dette_id}")
def supprimer_dette(dette_id: int, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        _une(conn, "dettes", dette_id, current_user)
        conn.execute(text("DELETE FROM dettes WHERE id = :id"), {"id": dette_id})
    return {"status": "success"}


@router.get("/api/dettes/{dette_id}/simulation")
def simuler(dette_id: int, montant: float, effet: Literal["duree", "mensualite"] = "duree", current_user: str = Depends(get_current_user)):
    if montant <= 0:
        raise HTTPException(status_code=400, detail="Indiquez un montant positif.")
    with engine.connect() as conn:
        dette = _dette(_une(conn, "dettes", dette_id, current_user))
    resultat = calc.simuler_anticipe(dette, montant, effet, date.today())
    return {
        "interets_economises": resultat["interets_economises"],
        "mois_gagnes": resultat["mois_gagnes"],
        "avant": {k: _en_texte(v) for k, v in resultat["avant"].items()},
        "apres": {k: _en_texte(v) for k, v in resultat["apres"].items()},
    }


@router.post("/api/dettes/{dette_id}/anticipes")
def ajouter_anticipe(dette_id: int, anticipe: AnticipeIn, current_user: str = Depends(get_current_user)):
    """Enregistre un remboursement anticipé : l'échéancier est recalculé à partir de cette date."""
    with engine.begin() as conn:
        dette = _une(conn, "dettes", dette_id, current_user)
        liste = _liste(dette.get("anticipes"))
        if anticipe.operation_id is not None and any(a.get("operation_id") == anticipe.operation_id for a in liste):
            return {"status": "success"}
        liste.append({"date": str(anticipe.date), "montant": anticipe.montant, "effet": anticipe.effet, "operation_id": anticipe.operation_id})
        conn.execute(text("UPDATE dettes SET anticipes = :a WHERE id = :id"), {"a": json.dumps(liste), "id": dette_id})
    return {"status": "success"}


@router.post("/api/dettes/{dette_id}/ignorer/{operation_id}")
def ignorer_operation(dette_id: int, operation_id: int, current_user: str = Depends(get_current_user)):
    """Ce prélèvement n'est pas un remboursement anticipé : il n'est plus proposé."""
    with engine.begin() as conn:
        dette = _une(conn, "dettes", dette_id, current_user)
        ignores = _liste(dette.get("ignores"))
        if operation_id not in ignores:
            ignores.append(operation_id)
        conn.execute(text("UPDATE dettes SET ignores = :i WHERE id = :id"), {"i": json.dumps(ignores), "id": dette_id})
    return {"status": "success"}


# --- Crédits remontés par la banque (Powens) ---

def comptes_powens(current_user: str) -> list:
    """Les comptes bancaires Powens du compte, ou une liste vide sans connexion. Séparé pour être remplacé dans les tests."""
    from routes.powens import POWENS_DOMAIN, jeton_powens_du_compte

    jeton = jeton_powens_du_compte(current_user)
    if not jeton:
        return []
    domaine = POWENS_DOMAIN.rstrip("/")
    if domaine.endswith("/v2"):
        domaine = domaine[:-3] + "/2.0"
    elif not domaine.endswith("/2.0"):
        domaine += "/2.0"
    reponse = requests.get(f"{domaine}/users/me/accounts", headers={"Authorization": f"Bearer {jeton}"}, timeout=10)
    if reponse.status_code != 200:
        logger.error(f"Powens {reponse.status_code} à la lecture des crédits")
        raise HTTPException(status_code=502, detail="Impossible de lire les crédits chez votre banque pour le moment.")
    return reponse.json().get("accounts", [])


def _type_dette(type_powens: Optional[str]) -> str:
    return {"mortgage": "immobilier", "consumercredit": "conso", "revolvingcredit": "conso"}.get(type_powens or "", "autre")


@router.get("/api/dettes/banque")
def credits_de_la_banque(current_user: str = Depends(get_current_user)):
    """Les crédits que la banque connectée expose, prêts à être ajoutés. Met aussi à jour le capital des crédits déjà reliés."""
    comptes = [c for c in comptes_powens(current_user) if isinstance(c.get("loan"), dict) and not c.get("deleted") and not c.get("disabled")]
    credits = []
    for compte in comptes:
        pret = compte["loan"]
        restant = abs(float(compte["balance"])) if compte.get("balance") is not None else None
        duree = pret.get("duration") or pret.get("nb_payments_total")
        credits.append({
            "powens_compte_id": str(compte.get("id")),
            "nom": compte.get("name") or "Crédit",
            "type": _type_dette(pret.get("type")),
            "montant": pret.get("total_amount"),
            "taux": pret.get("rate"),
            "duree_mois": duree,
            "debut": pret.get("start_repayment_date") or pret.get("subscription_date"),
            "fin": pret.get("maturity_date"),
            "mensualite": pret.get("next_payment_amount"),
            "capital_restant": restant,
            "complet": bool(pret.get("total_amount") and pret.get("rate") is not None and duree and (pret.get("start_repayment_date") or pret.get("subscription_date"))),
        })
    with engine.begin() as conn:
        relies = {
            r["powens_compte_id"]: r["id"]
            for r in conn.execute(text("SELECT id, powens_compte_id FROM dettes WHERE LOWER(utilisateur) = :u AND powens_compte_id IS NOT NULL"), {"u": current_user}).mappings()
        }
        for credit in credits:
            credit["deja_ajoute"] = credit["powens_compte_id"] in relies
            if credit["deja_ajoute"] and credit["capital_restant"] is not None:
                conn.execute(
                    text("UPDATE dettes SET capital_banque = :c, capital_banque_le = :le WHERE id = :id"),
                    {"c": credit["capital_restant"], "le": datetime.now(timezone.utc), "id": relies[credit["powens_compte_id"]]},
                )
    return credits
