"""Calcul des vues du Stream Deck, sans accès à la base."""
import re
import unicodedata
from datetime import date, datetime
from typing import Optional


STREAMDECK_MOIS = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet",
    "aout", "septembre", "octobre", "novembre", "decembre",
]


STREAMDECK_MOTS_IGNORES = {"CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE", "DE", "COMPTE", "BANQUE", "DU"}


STREAMDECK_TYPES_LIVRETS = ("LIVRET A", "LEP", "LDDS", "PEL", "PEA", "LIVRET")


def _sd_nettoyer_mois(mois) -> str:
    if not mois:
        return ""
    decompose = unicodedata.normalize("NFD", str(mois).lower())
    return "".join(c for c in decompose if unicodedata.category(c) != "Mn").strip()


def _sd_nom_compte(compte) -> str:
    return str(compte or "").strip().upper()


def _sd_montant(valeur) -> float:
    try:
        return float(valeur or 0)
    except (TypeError, ValueError):
        return 0.0


def _sd_annee(transaction: dict) -> int:
    if transaction.get("annee"):
        try:
            return int(transaction["annee"])
        except (TypeError, ValueError):
            return 0
    valeur = transaction.get("date")
    if isinstance(valeur, (date, datetime)):
        return valeur.year
    try:
        return int(str(valeur)[:4])
    except (TypeError, ValueError):
        return 0


def _sd_est_transfert(nom: str, categorie: str) -> bool:
    """Mêmes règles que `estTransfertInterne` (frontend/src/utils/finance.js)."""
    texte = f"{nom or ''} {categorie or ''}".upper()
    return (
        "🔄" in texte
        or re.search(r"(?<!\w)VERS(?!\w)", texte) is not None
        or "TRANSFERT" in texte
        or str(categorie or "").strip().upper().startswith("VIREMENT :")
    )


def _sd_compte_cible(texte: str, source: str, groupes: dict) -> Optional[str]:
    """Mêmes règles que `trouverCompteCible` (frontend/src/utils/finance.js)."""
    if not source:
        return None
    groupe_source = groupes.get(source)
    candidats = [
        nom for nom, groupe in groupes.items()
        if nom != source and not (groupe_source and groupe and groupe != groupe_source)
    ]
    for nom in candidats:
        mots = [m for m in re.split(r"[\s_-]+", nom) if len(m) >= 3 and m not in STREAMDECK_MOTS_IGNORES]
        if nom in texte or any(m in texte for m in mots):
            return nom
    for type_livret in STREAMDECK_TYPES_LIVRETS:
        if type_livret in texte:
            for nom in candidats:
                if type_livret in nom:
                    return nom
    return None


def calculer_vues_streamdeck(comptes: list, transactions: list, aujourd_hui: date) -> dict:
    """Reprend les règles de frontend/src/utils/finance.js pour que les touches affichent les mêmes
    chiffres que l'application. backend/tests/fixtures/calculs_finances.json vérifie cet accord."""
    annee = aujourd_hui.year
    indice_mois = aujourd_hui.month - 1
    mois_courant = STREAMDECK_MOIS[indice_mois]

    groupes = {_sd_nom_compte(c["compte"]): str(c.get("groupe") or "").strip().upper() for c in comptes}
    soldes = {_sd_nom_compte(c["compte"]): _sd_montant(c.get("solde")) for c in comptes}
    revenus = dict.fromkeys(soldes, 0.0)
    depenses = dict.fromkeys(soldes, 0.0)

    # Montants par (année, mois, compte) : sert à détecter l'écriture miroir d'un virement
    montants_index: dict = {}
    for t in transactions:
        cle = (_sd_annee(t), _sd_nettoyer_mois(t.get("mois")), _sd_nom_compte(t.get("compte")))
        montants_index.setdefault(cle, []).append(_sd_montant(t.get("montant")))

    for t in transactions:
        annee_t = _sd_annee(t)
        mois_t = _sd_nettoyer_mois(t.get("mois"))
        indice_t = STREAMDECK_MOIS.index(mois_t) if mois_t in STREAMDECK_MOIS else -1
        if annee_t > annee or (annee_t == annee and indice_t > indice_mois):
            continue

        montant = _sd_montant(t.get("montant"))
        source = _sd_nom_compte(t.get("compte"))
        categorie = str(t.get("categorie") or "")
        nom = str(t.get("nom") or "")
        est_transfert = _sd_est_transfert(nom, categorie)

        if source in soldes:
            soldes[source] += montant

        if est_transfert:
            cible = _sd_compte_cible(f"{nom} {categorie}".upper(), source, groupes)
            if cible:
                miroirs = montants_index.get((annee_t, mois_t, cible), [])
                if not any(abs(m + montant) < 0.1 for m in miroirs):
                    soldes[cible] -= montant

        if source in soldes and annee_t == annee and mois_t == mois_courant and not est_transfert:
            if montant > 0:
                revenus[source] += montant
            elif montant < 0:
                depenses[source] += abs(montant)

    return {
        "periode": {"mois": indice_mois + 1, "annee": annee},
        "comptes": [
            {
                "nom": c["compte"],
                "groupe": c.get("groupe") or "",
                "couleur": c.get("couleur") or "",
                "solde": round(soldes[_sd_nom_compte(c["compte"])], 2),
                "revenus_mois": round(revenus[_sd_nom_compte(c["compte"])], 2),
                "depenses_mois": round(depenses[_sd_nom_compte(c["compte"])], 2),
            }
            for c in comptes
        ],
    }
