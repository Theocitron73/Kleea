"""Valeur nette : échéancier des crédits, valeur des biens et rapprochement avec les opérations, sans accès à la base."""
import calendar
from datetime import date
from typing import Optional

MAX_ECHEANCES = 1200  # 100 ans : garde-fou si une mensualité ne couvre même pas les intérêts
SEUIL_ANTICIPE = 1.5  # un prélèvement relié de plus de 1,5 échéance ressemble à un remboursement anticipé


def ajouter_mois(jour: date, nombre: int) -> date:
    """Même jour du mois, ramené au dernier jour si le mois est plus court (31 janvier + 1 mois = 28 ou 29 février)."""
    index = jour.month - 1 + nombre
    annee, mois = jour.year + index // 12, index % 12 + 1
    return date(annee, mois, min(jour.day, calendar.monthrange(annee, mois)[1]))


def mensualite(capital: float, taux_annuel: float, nombre: int) -> float:
    if nombre <= 0:
        return capital
    r = taux_annuel / 1200
    if r == 0:
        return capital / nombre
    return capital * r / (1 - (1 + r) ** -nombre)


def tableau(montant: float, taux_annuel: float, duree_mois: int, debut: date, anticipes: Optional[list] = None) -> list:
    """Le tableau d'amortissement, remboursements anticipés compris.

    Chaque ligne : date, type (echeance ou anticipe), interets, capital (remboursé), restant, mensualite.
    Un remboursement anticipé « duree » garde la mensualité et raccourcit le crédit ; « mensualite » garde la fin et baisse la mensualité.
    """
    r = taux_annuel / 1200
    m = mensualite(montant, taux_annuel, duree_mois)
    restant = float(montant)
    a_venir = sorted(anticipes or [], key=lambda a: a["date"])
    lignes, rang = [], 0
    while restant > 0.005 and rang < MAX_ECHEANCES:
        echeance = ajouter_mois(debut, rang)
        while a_venir and a_venir[0]["date"] < echeance:
            a = a_venir.pop(0)
            verse = min(float(a["montant"]), restant)
            restant -= verse
            if a.get("effet") == "mensualite" and restant > 0.005:
                m = mensualite(restant, taux_annuel, max(duree_mois - rang, 1))
            lignes.append({"date": a["date"], "type": "anticipe", "interets": 0.0, "capital": verse, "restant": max(restant, 0.0), "mensualite": m})
        if restant <= 0.005:
            break
        interets = restant * r
        capital = min(m - interets, restant)
        if capital <= 0:
            break  # la mensualité ne couvre pas les intérêts : le crédit ne se rembourserait jamais
        restant -= capital
        lignes.append({"date": echeance, "type": "echeance", "interets": interets, "capital": capital, "restant": max(restant, 0.0), "mensualite": capital + interets})
        rang += 1
    return lignes


def etat_dette(dette: dict, aujourdhui: date) -> dict:
    """Ce que montre la carte du crédit : capital restant, mensualité en cours, fin, intérêts encore dus."""
    lignes = tableau(dette["montant"], dette["taux"], dette["duree_mois"], dette["debut"], dette.get("anticipes"))
    passees = [l for l in lignes if l["date"] <= aujourdhui]
    futures = [l for l in lignes if l["date"] > aujourdhui]
    restant = passees[-1]["restant"] if passees else float(dette["montant"])
    prochaine = next((l for l in futures if l["type"] == "echeance"), None)
    return {
        "capital_restant": round(restant, 2),
        "mensualite": round(prochaine["mensualite"] if prochaine else (passees[-1]["mensualite"] if passees else 0.0), 2),
        "fin": lignes[-1]["date"] if lignes else dette["debut"],
        "interets_restants": round(sum(l["interets"] for l in futures), 2),
        "rembourse_pct": round(100 * (1 - restant / dette["montant"]), 1) if dette["montant"] else 100.0,
        "echeances_payees": sum(1 for l in passees if l["type"] == "echeance"),
    }


def simuler_anticipe(dette: dict, montant: float, effet: str, aujourdhui: date) -> dict:
    """Ce que changerait un remboursement anticipé aujourd'hui : intérêts économisés, nouvelle fin ou nouvelle mensualité."""
    avant = etat_dette(dette, aujourdhui)
    hypothese = {**dette, "anticipes": [*(dette.get("anticipes") or []), {"date": aujourdhui, "montant": montant, "effet": effet}]}
    # Le versement compte dès aujourd'hui : l'état est lu juste après, avant la prochaine échéance.
    apres = etat_dette(hypothese, aujourdhui)
    return {
        "avant": avant,
        "apres": apres,
        "interets_economises": round(avant["interets_restants"] - apres["interets_restants"], 2),
        "mois_gagnes": (avant["fin"].year - apres["fin"].year) * 12 + avant["fin"].month - apres["fin"].month,
    }


def valeur_bien(bien: dict, aujourdhui: date, versements: float = 0.0, cours: Optional[float] = None) -> float:
    """Valeur saisie, moins la décote annuelle s'il y en a une, plus les versements reliés depuis la saisie.

    Une crypto suivie au cours du jour vaut quantité × cours ; sans cours (service injoignable), elle garde sa dernière valeur.
    """
    if bien.get("crypto_id") and bien.get("quantite") and cours:
        return round(float(bien["quantite"]) * cours, 2)
    valeur = float(bien["valeur"])
    if bien.get("decote"):
        annees = max((aujourdhui - bien["date_valeur"]).days, 0) / 365.25
        valeur *= (1 - float(bien["decote"]) / 100) ** annees
    return round(valeur + versements, 2)


def correspond(libelle: Optional[str], nom: Optional[str]) -> bool:
    return bool(libelle and libelle.strip()) and libelle.strip().lower() in (nom or "").lower()


def rapprocher(dette: dict, operations: list, aujourdhui: date, mois_controles: int = 6) -> dict:
    """Relie les prélèvements au crédit : échéances vues ou non sur les derniers mois, et remboursements anticipés probables."""
    if not (dette.get("libelle_lien") or "").strip():
        return {"echeances": [], "anticipes_detectes": []}
    liees = [o for o in operations if correspond(dette["libelle_lien"], o["nom"]) and float(o["montant"]) < 0]
    etat = etat_dette(dette, aujourdhui)
    deja = {a.get("operation_id") for a in dette.get("anticipes") or []} | set(dette.get("ignores") or [])
    detectes = [
        {"operation_id": o["id"], "date": o["date"], "montant": round(abs(float(o["montant"])), 2)}
        for o in liees
        if o["id"] not in deja and abs(float(o["montant"])) > SEUIL_ANTICIPE * etat["mensualite"] and o["date"] >= dette["debut"]
    ]
    echeances = []
    for rang in range(dette["duree_mois"]):
        jour = ajouter_mois(dette["debut"], rang)
        if jour > aujourdhui:
            break
        echeances.append(jour)
    controle = []
    for jour in echeances[-mois_controles:]:
        vue = any(o["date"].year == jour.year and o["date"].month == jour.month for o in liees)
        controle.append({"date": jour, "vue": vue})
    return {"echeances": controle, "anticipes_detectes": detectes}


def versements_lies(bien: dict, operations: list) -> float:
    """Les virements vers un placement (libellé relié) depuis la dernière valeur saisie s'ajoutent à sa valeur."""
    total = sum(
        abs(float(o["montant"]))
        for o in operations
        if correspond(bien.get("libelle_lien"), o["nom"]) and float(o["montant"]) < 0 and o["date"] > bien["date_valeur"]
    )
    return round(total, 2)


def capital_a_la_date(dette: dict, jour: date) -> float:
    """Capital restant dû à une date, d'après l'échéancier : le montant emprunté tant que la première échéance n'est pas passée."""
    lignes = [l for l in tableau(dette["montant"], dette["taux"], dette["duree_mois"], dette["debut"], dette.get("anticipes")) if l["date"] <= jour]
    return round(lignes[-1]["restant"], 2) if lignes else float(dette["montant"])


def fins_de_mois(annee: int) -> list:
    return [date(annee, mois, calendar.monthrange(annee, mois)[1]) for mois in range(1, 13)]


def historique(biens: list, dettes: list, operations: list, annee: int, aujourdhui: date, cours: Optional[dict] = None) -> list:
    """Total des biens et des dettes à la fin de chaque mois de l'année, jusqu'au mois en cours.

    Un bien compte à partir de sa saisie ; une crypto au cours du jour prend sa valeur actuelle (pas d'historique des cours).
    Une dette compte à partir de sa première échéance, avec son capital d'après l'échéancier.
    """
    cours = cours or {}
    points = []
    for fin in fins_de_mois(annee):
        jour = min(fin, aujourdhui)
        if jour < date(annee, fin.month, 1):
            break
        total_biens = 0.0
        for b in biens:
            if b["date_valeur"] > jour:
                continue
            avant = [o for o in operations if o["date"] <= jour]
            total_biens += valeur_bien(b, jour, versements_lies(b, avant), cours.get(b.get("crypto_id")))
        total_dettes = sum(capital_a_la_date(d, jour) for d in dettes if d["debut"] <= jour)
        points.append({"mois": f"{annee}-{fin.month:02d}", "biens": round(total_biens, 2), "dettes": round(total_dettes, 2)})
    return points
