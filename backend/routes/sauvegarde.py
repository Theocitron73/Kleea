"""Sauvegarde personnelle : export complet d'un compte, sans secret, et import qui ne fait qu'ajouter.

Tout ce qui s'écrit passe par l'inventaire TABLES : un nom de table ou de colonne n'est jamais lu dans le fichier,
et le compte visé est toujours celui de la session. test_sauvegarde.py compare cet inventaire aux révisions Alembic :
une nouvelle table ou colonne doit être classée ici, sauvegardée ou écartée, avant que les tests repassent.
"""
import json
import math
import re
import uuid
from collections import Counter
from dataclasses import dataclass
from datetime import date, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from journaux import logger
from sqlalchemy import bindparam, text
from sqlalchemy.exc import IntegrityError
from base import engine, get_current_user
from chiffrement import decrypt_iban, encrypt_iban


router = APIRouter()


FORMAT = "kleea-sauvegarde"
VERSION = 1
TAILLE_MAX = 20 * 1024 * 1024  # Environ 100 000 opérations : largement plus que les plus gros comptes.
TAILLE_LOT = 500
PREFIXE_FERNET = "gAAAA"
ENTIER_MAX = 2**31 - 1


@dataclass(frozen=True)
class Colonne:
    nom: str
    genre: str = "texte"  # texte, nombre, entier, booleen, instant, jour, structure, iban
    requis: bool = False
    longueur: int | None = None
    borne: float | None = None


@dataclass(frozen=True)
class Table:
    nom: str
    libelle: str
    colonnes: tuple
    cle: tuple | None  # Une ligne existe déjà si sa clé est présente. None : si une ligne identique est présente.
    souple: bool = False  # La clé ignore la casse et les espaces, comme les routes qui refusent les noms déjà pris.
    serie: bool = False  # La table a une colonne id : elle garde l'ordre des lignes, mais l'identifiant n'est pas repris.
    utilisateur: str = "utilisateur"


def _texte(nom, longueur=None, requis=False):
    return Colonne(nom, "texte", requis, longueur)


def _requis(nom, longueur=None):
    return Colonne(nom, "texte", True, longueur)


def _nombre(nom, requis=False, borne=None):
    return Colonne(nom, "nombre", requis, None, borne)


def _argent(nom, requis=False):
    return Colonne(nom, "nombre", requis, None, 1e8)  # numeric(10,2)


def _jours(nom, requis=False):
    return Colonne(nom, "nombre", requis, None, 1e3)  # numeric(5,2)


def _entier(nom, borne=ENTIER_MAX):
    return Colonne(nom, "entier", False, None, borne)


def _booleen(nom):
    return Colonne(nom, "booleen")


def _instant(nom, requis=False):
    return Colonne(nom, "instant", requis)


def _jour(nom, requis=False):
    return Colonne(nom, "jour", requis)


# L'ordre compte : les prévisions et les divisions sont écrites avant les opérations qui les citent.
TABLES = (
    Table("categories", "Catégories", (_requis("nom"), _texte("icone", 50), _texte("couleur", 30), _texte("groupe", 100)), ("nom",)),
    Table("categories_masquees", "Catégories masquées", (_requis("nom", 255),), ("nom",), serie=True),
    Table("config_categories", "Mots-clés de classement", (_texte("categorie"), _texte("mots_cles")), ("categorie",), serie=True),
    Table("memoire", "Base mémoire", (_requis("nom"), _texte("categorie")), ("nom",)),
    Table(
        "configuration", "Comptes",
        (_requis("compte"), _texte("groupe"), _nombre("objectif"), _nombre("solde"), _texte("couleur"), _nombre("taux"), Colonne("powens_name", "iban")),
        ("compte",),
    ),
    Table(
        "previsions", "Prévisions",
        (_entier("id"), _instant("date", True), _requis("nom"), _nombre("montant", True), _texte("categorie"), _texte("compte"), _texte("mois"), _nombre("annee"), _booleen("actif")),
        ("nom", "montant", "date"), serie=True,
    ),
    Table(
        "split_sources", "Opérations divisées",
        (_jour("date", True), _requis("nom", 255), _argent("montant", True), _requis("compte", 100), _requis("split_id", 50), _instant("created_at"), _texte("categorie", 100)),
        ("split_id",), serie=True,
    ),
    Table(
        "transactions", "Opérations",
        (_instant("date"), _texte("nom"), _nombre("montant"), _texte("categorie"), _texte("compte"), _texte("mois"), _nombre("annee"), _texte("enveloppe", 255), _entier("prevision_id"), _texte("split_id", 50)),
        ("date", "nom", "montant"), serie=True,
    ),
    Table(
        "budgets", "Budgets",
        (_requis("mois"), _requis("compte"), _texte("type"), _texte("nom"), _nombre("somme"), _entier("annee", 32767)),
        None, serie=True,
    ),
    Table(
        "projets", "Projets",
        (_texte("profil"), _texte("nom"), _nombre("cout"), _instant("date"), _nombre("capa"), _nombre("apport_epargne"), _texte("mode_epargne", 20), _texte("date_debut", 50), _booleen("utiliser_capa_stricte"), _entier("ordre")),
        ("profil", "nom"), souple=True, serie=True,
    ),
    Table(
        "allocations", "Enveloppes",
        (_requis("profil", 50), _requis("projet"), _nombre("montant_alloue", True), _instant("date_allocation")),
        ("profil", "projet"), souple=True, serie=True,
    ),
    Table(
        "tricount", "Dépenses Tricount",
        (_instant("date"), _texte("libelle"), _texte("paye_par"), _texte("pour_qui"), _nombre("montant"), _texte("groupe"), _texte("emoji")),
        None, serie=True,
    ),
    Table(
        "custom_stats", "Statistiques personnalisées",
        (_requis("titre", 255), _requis("flux_type", 255), _requis("operateur", 255), Colonne("regles", "structure", True), _requis("profil", 50), _texte("couleur", 20), _texte("icone", 20)),
        None, serie=True,
    ),
    Table(
        "conges_profile", "Profil de congés",
        (_texte("nom", 100), _texte("prenom", 100), _texte("societe", 100), _texte("poste", 100), _jour("date_embauche"), _jours("jours_acquis_annuel")),
        (),
    ),
    Table(
        "conges", "Congés",
        (_requis("type", 20), _jour("date_debut", True), _jour("date_fin", True), _jours("nb_jours", True), _texte("motif"), _booleen("anticipe"), _instant("created_at")),
        None, serie=True,
    ),
    Table(
        "annonces_logement", "Annonces de logement",
        (
            _requis("titre", 255), _texte("url"), _texte("source", 100), _argent("loyer"), _argent("charges"), _argent("surface"), _entier("pieces"),
            _texte("ville", 100), _texte("photos"), _booleen("dossier_envoye"), _texte("date_dossier", 50), _booleen("visite_effectuee"),
            _texte("date_visite", 50), _texte("statut_reponse", 50), _texte("notes"), _booleen("favori"), _instant("created_at"),
        ),
        None, serie=True,
    ),
    Table(
        "simulations_demenagement", "Simulations de logement",
        (_requis("scenario", 255), _requis("titre", 255), _requis("flux_type", 255), _requis("categorie", 255), _argent("montant", True), _requis("frequence", 50), _requis("cible", 50)),
        None, serie=True,
    ),
    Table("notes_demenagement", "Notes de logement", (_texte("contenu"), _instant("mis_a_jour_le")), ()),
    Table("notes", "Bloc-notes", (_texte("texte"),), ()),
    Table("pages_masquees", "Pages masquées", (_texte("pages"),), ()),
    Table("theme", "Couleurs des graphiques", (_requis("element"), _texte("couleur")), ("element",), utilisateur="user"),
    Table(
        "user_theme", "Thème",
        (_texte("bg_site"), _texte("primary_color"), _texte("text_main"), _texte("radius"), _texte("glass_blur"), _texte("glass_bg"), _texte("secondary_color")),
        (),
    ),
    Table(
        "theme_presets", "Thèmes enregistrés",
        (
            _requis("nom", 100), _requis("bg_site", 50), _requis("primary_color", 50), _requis("text_main", 50), _requis("glass_bg", 100),
            _requis("glass_blur", 20), _requis("radius", 20), _booleen("is_active"), _instant("created_at"), _texte("secondary_color"),
            _texte("gradient_style"), _texte("gradient_intensity"), _texte("gradient_color"), _texte("gradient_angle"),
            _texte("gradient_shape"), _texte("gradient_center"), _texte("gradient_spread"),
        ),
        ("nom",), serie=True,
    ),
    Table("abonnements_ignores", "Abonnements ignorés", (_requis("abonnement_id", 200), _instant("created_at")), ("abonnement_id",)),
    Table(
        "regles_recurrentes", "Prévisions et budgets récurrents",
        (_requis("type", 20), _requis("nom"), _nombre("montant", True), _texte("categorie"), _texte("compte"), _entier("jour"), _jour("debut", True), _jour("fin"), _booleen("actif"), _jour("genere_jusqu_a")),
        ("type", "nom", "debut"), serie=True,
    ),
    Table("alertes_masquees", "Alertes masquées", (_requis("alerte_id", 200), _instant("created_at")), ("alerte_id",)),
)

PAR_NOM = {table.nom: table for table in TABLES}

# Ce qui ne part jamais dans le fichier, et pourquoi.
TABLES_ECARTEES = {
    "streamdeck_tokens": "secret : un nouveau jeton se génère depuis le profil",
    "synchro_etat": "état technique, recalculé à la prochaine synchronisation",
    "tricount_liens": "secret : ce lien donne accès au groupe sans compte, il se recrée avec « Partager »",
    "tricount_historique": "journal de sécurité des liens partagés, propre à ce compte et non restaurable",
    "sessions_connexion": "état de connexion des appareils, propre à ce serveur",
    "double_auth": "réglage de sécurité : se réactive après la restauration, pour vérifier l'adresse e-mail",
    "banned_ips": "sécurité du site, sans lien avec un compte",
    "login_failed_attempts": "sécurité du site, sans lien avec un compte",
    "security_rate_limits": "sécurité du site, sans lien avec un compte",
}
COLONNES_ECARTEES = {
    "previsions": {"regle_id": "lien vers une règle récurrente : une ligne restaurée devient indépendante"},
    "budgets": {"regle_id": "lien vers une règle récurrente : une ligne restaurée devient indépendante"},
    "tricount": {"token_partage": "secret : ce lien donne accès au groupe sans compte, il se recrée avec « Partager »"},
    "users": {
        "password": "secret",
        "reset_token": "secret",
        "powens_token": "secret : la banque se reconnecte après la restauration",
        "role": "droit d'accès : un fichier ne doit jamais pouvoir en donner",
    },
}
# Lu pour information et jamais réimporté : le nom et l'e-mail restent ceux du compte connecté.
COLONNES_PROFIL = {"username": "identifiant", "name": "nom", "email": "email", "import_mode": "mode_import"}


def _q(nom: str) -> str:
    return f'"{nom}"'


def _instant_iso(valeur):
    if isinstance(valeur, datetime):
        return valeur.isoformat()
    if isinstance(valeur, date):
        return datetime(valeur.year, valeur.month, valeur.day).isoformat()
    return datetime.fromisoformat(str(valeur).replace("Z", "+00:00")).isoformat()


def _jour_iso(valeur):
    if isinstance(valeur, datetime):
        return valeur.date().isoformat()
    if isinstance(valeur, date):
        return valeur.isoformat()
    return datetime.fromisoformat(str(valeur).replace("Z", "+00:00")).date().isoformat()


def _vers_fichier(colonne: Colonne, valeur):
    """Une valeur lue en base, sous la forme qu'elle a dans le fichier."""
    if valeur is None:
        return None
    if colonne.genre == "nombre":
        nombre = float(valeur)
        return nombre if math.isfinite(nombre) else None
    if colonne.genre == "entier":
        return int(valeur)
    if colonne.genre == "booleen":
        return bool(valeur)
    if colonne.genre in ("instant", "jour"):
        try:
            return _instant_iso(valeur) if colonne.genre == "instant" else _jour_iso(valeur)
        except ValueError:
            return None
    if colonne.genre == "structure" and isinstance(valeur, str):
        try:
            return json.loads(valeur)
        except ValueError:
            return None
    if colonne.genre == "iban":
        # En clair dans le fichier : un chiffré ne se relirait plus si la clé du serveur change.
        clair = decrypt_iban(valeur)
        return None if clair.startswith(PREFIXE_FERNET) else clair
    return valeur


def _refuser(message: str):
    raise HTTPException(status_code=400, detail=message)


def _texte_valide(valeur) -> bool:
    if not isinstance(valeur, str) or "\x00" in valeur:
        return False
    try:
        valeur.encode("utf-8")
    except UnicodeEncodeError:
        return False
    return True


def _depuis_fichier(colonne: Colonne, valeur):
    """Contrôle une valeur du fichier selon les contraintes de sa colonne. Lève ValueError si elle ne convient pas."""
    if valeur is None:
        if colonne.requis:
            raise ValueError
        return None
    genre = colonne.genre
    if genre in ("texte", "iban"):
        if not _texte_valide(valeur) or (colonne.longueur and len(valeur) > colonne.longueur):
            raise ValueError
        return None if genre == "iban" and valeur.startswith(PREFIXE_FERNET) else valeur
    if genre == "nombre":
        if isinstance(valeur, bool) or not isinstance(valeur, (int, float)):
            raise ValueError
        try:
            nombre = float(valeur)
        except OverflowError:
            raise ValueError from None
        if not math.isfinite(nombre) or (colonne.borne and abs(nombre) >= colonne.borne):
            raise ValueError
        return nombre
    if genre == "entier":
        if isinstance(valeur, bool) or not isinstance(valeur, int) or abs(valeur) > colonne.borne:
            raise ValueError
        return valeur
    if genre == "booleen":
        if not isinstance(valeur, bool):
            raise ValueError
        return valeur
    if genre in ("instant", "jour"):
        if not isinstance(valeur, str):
            raise ValueError
        return _instant_iso(valeur) if genre == "instant" else _jour_iso(valeur)
    if genre == "structure":
        if not isinstance(valeur, (list, dict)):
            raise ValueError
        texte = json.dumps(valeur, ensure_ascii=False)
        if "\\u0000" in texte or not _texte_valide(texte):
            raise ValueError
        return valeur
    raise ValueError


def valider_fichier(fichier, utilisateur: str) -> dict:
    """Contrôle tout le fichier avant la moindre écriture, et renvoie ses lignes par table."""
    if not isinstance(fichier, dict) or fichier.get("format") != FORMAT:
        _refuser("Ce fichier n'est pas une sauvegarde Kleea.")
    version = fichier.get("version")
    if isinstance(version, bool) or not isinstance(version, int):
        _refuser("Ce fichier n'indique pas de version de sauvegarde lisible.")
    if version != VERSION:
        _refuser(f"Cette sauvegarde est en version {version}, et Kleea lit la version {VERSION}. Elle ne peut pas être importée.")
    compte = fichier.get("compte")
    if not isinstance(compte, str):
        _refuser("Ce fichier n'indique pas à quel compte il appartient.")
    if compte.strip().lower() != utilisateur:
        raise HTTPException(
            status_code=409,
            detail=f"Cette sauvegarde appartient au compte « {compte[:100]} » : elle ne peut pas être importée dans le compte « {utilisateur} ».",
        )
    donnees = fichier.get("donnees")
    if not isinstance(donnees, dict):
        _refuser("Ce fichier ne contient pas de données lisibles.")

    lignes_par_table = {}
    for nom, lignes in donnees.items():
        table = PAR_NOM.get(nom)
        if table is None:
            _refuser(f"Ce fichier contient une rubrique inconnue : {str(nom)[:50]}.")
        if not isinstance(lignes, list):
            _refuser(f"La rubrique « {table.libelle} » de ce fichier est illisible.")
        lignes_par_table[nom] = [_valider_ligne(table, ligne, rang) for rang, ligne in enumerate(lignes, start=1)]
    return lignes_par_table


def _valider_ligne(table: Table, ligne, rang: int) -> dict:
    if not isinstance(ligne, dict):
        _refuser(f"La ligne {rang} de « {table.libelle} » est illisible.")
    connues = {colonne.nom for colonne in table.colonnes}
    inconnue = next((cle for cle in ligne if cle not in connues), None)
    if inconnue is not None:
        # Y compris « utilisateur » : le compte visé ne vient jamais du fichier.
        _refuser(f"La ligne {rang} de « {table.libelle} » contient un champ inconnu : {str(inconnue)[:50]}.")
    resultat = {}
    for colonne in table.colonnes:
        try:
            resultat[colonne.nom] = _depuis_fichier(colonne, ligne.get(colonne.nom))
        except ValueError:
            _refuser(f"La ligne {rang} de « {table.libelle} » a une valeur invalide pour {colonne.nom}.")
    return resultat


def _lire(conn, table: Table, utilisateur: str) -> list:
    colonnes = ", ".join(_q(c.nom) for c in table.colonnes)
    ordre = ' ORDER BY "id"' if table.serie else ""
    # LOWER : les comptes anciens ont des lignes enregistrées avec la casse de leur identifiant.
    requete = text(f"SELECT {colonnes} FROM {table.nom} WHERE LOWER({_q(table.utilisateur)}) = :u{ordre}")
    resultat = []
    for ligne in conn.execute(requete, {"u": utilisateur}).mappings():
        resultat.append({c.nom: _vers_fichier(c, ligne[c.nom]) for c in table.colonnes})
    return resultat


def _cle(table: Table, ligne: dict) -> tuple:
    noms = table.cle if table.cle is not None else [c.nom for c in table.colonnes if c.nom != "created_at"]
    valeurs = []
    for nom in noms:
        valeur = ligne.get(nom)
        if isinstance(valeur, (list, dict)):
            valeur = json.dumps(valeur, sort_keys=True)
        elif table.souple and isinstance(valeur, str):
            valeur = valeur.strip().casefold()
        valeurs.append(valeur)
    return tuple(valeurs)


def _lignes_a_ajouter(table: Table, lignes: list, existantes: list) -> list:
    """Ne garde que ce qui manque. Sans clé, deux lignes identiques sont permises : elles se comptent une à une."""
    presentes = Counter(_cle(table, ligne) for ligne in existantes)
    a_ajouter = []
    for ligne in lignes:
        cle = _cle(table, ligne)
        if presentes[cle] > 0:
            if table.cle is None:
                presentes[cle] -= 1
            continue
        a_ajouter.append(ligne)
        if table.cle is not None:
            presentes[cle] = 1
    return a_ajouter


def _preparer(conn, utilisateur: str, lignes_par_table: dict) -> list:
    """Pour chaque table du fichier, ce qui est déjà là et ce qui manque. Rien n'est écrit ici."""
    plan = []
    for table in TABLES:
        lignes = lignes_par_table.get(table.nom)
        if not lignes:
            continue
        existantes = _lire(conn, table, utilisateur)
        plan.append({"table": table, "lignes": lignes, "existantes": existantes, "a_ajouter": _lignes_a_ajouter(table, lignes, existantes)})
    return plan


def _resumer(plan: list) -> dict:
    tables = [{
        "table": etape["table"].nom,
        "libelle": etape["table"].libelle,
        "dans_fichier": len(etape["lignes"]),
        "a_ajouter": len(etape["a_ajouter"]),
        "deja_presents": len(etape["lignes"]) - len(etape["a_ajouter"]),
    } for etape in plan]
    return {
        "tables": tables,
        "total_a_ajouter": sum(t["a_ajouter"] for t in tables),
        "total_deja_presents": sum(t["deja_presents"] for t in tables),
    }


def _pour_la_base(colonne: Colonne, valeur):
    if valeur is None:
        return None
    if colonne.genre == "structure":
        return json.dumps(valeur)
    if colonne.genre == "iban":
        return encrypt_iban(valeur)
    return valeur


def _inserer(conn, table: Table, lignes: list, utilisateur: str) -> None:
    colonnes = [c for c in table.colonnes if c.nom != "id"]
    noms = ", ".join([_q(table.utilisateur), *(_q(c.nom) for c in colonnes)])
    for debut in range(0, len(lignes), TAILLE_LOT):
        lot = lignes[debut:debut + TAILLE_LOT]
        valeurs = {}
        rangees = []
        for rang, ligne in enumerate(lot):
            valeurs[f"u{rang}"] = utilisateur
            for position, colonne in enumerate(colonnes):
                valeurs[f"v{rang}_{position}"] = _pour_la_base(colonne, ligne.get(colonne.nom))
            marques = ", ".join(f":v{rang}_{position}" for position in range(len(colonnes)))
            rangees.append(f"(:u{rang}, {marques})")
        conn.execute(text(f"INSERT INTO {table.nom} ({noms}) VALUES {', '.join(rangees)}"), valeurs)


def _ecrire_previsions(conn, etape: dict, utilisateur: str) -> dict:
    """Écrit les prévisions manquantes et renvoie, pour chaque identifiant du fichier, celui de la base."""
    table = etape["table"]
    colonnes = [c for c in table.colonnes if c.nom != "id"]
    noms = ", ".join([_q(table.utilisateur), *(_q(c.nom) for c in colonnes)])
    marques = ", ".join([":u", *(f":{c.nom}" for c in colonnes)])
    requete = text(f"INSERT INTO {table.nom} ({noms}) VALUES ({marques}) RETURNING id")
    identifiants = {_cle(table, ligne): ligne["id"] for ligne in etape["existantes"]}
    correspondance = {}
    for ligne in etape["lignes"]:
        cle = _cle(table, ligne)
        if cle not in identifiants:
            valeurs = {c.nom: _pour_la_base(c, ligne.get(c.nom)) for c in colonnes}
            identifiants[cle] = conn.execute(requete, {"u": utilisateur, **valeurs}).scalar()
        if ligne.get("id") is not None:
            correspondance[ligne["id"]] = identifiants[cle]
    return correspondance


def _divisions_a_renommer(conn, etape: dict, utilisateur: str) -> dict:
    """split_id est unique pour tout le site : celui d'un autre compte reçoit un nouvel identifiant, sans le dire."""
    renommer = {}
    identifiants = [ligne["split_id"] for ligne in etape["a_ajouter"]]
    requete = text("SELECT split_id FROM split_sources WHERE split_id IN :ids AND LOWER(utilisateur) <> :u").bindparams(bindparam("ids", expanding=True))
    for debut in range(0, len(identifiants), TAILLE_LOT):
        for (pris,) in conn.execute(requete, {"ids": identifiants[debut:debut + TAILLE_LOT], "u": utilisateur}):
            renommer[pris] = f"split_{uuid.uuid4().hex[:12]}"
    return renommer


def _ecrire(conn, plan: list, utilisateur: str) -> None:
    previsions = {}
    divisions = {}
    for etape in plan:
        table = etape["table"]
        a_ajouter = etape["a_ajouter"]
        if table.nom == "previsions":
            previsions = _ecrire_previsions(conn, etape, utilisateur)
            continue
        if table.nom == "split_sources":
            divisions = _divisions_a_renommer(conn, etape, utilisateur)
            a_ajouter = [{**l, "split_id": divisions.get(l["split_id"], l["split_id"])} for l in a_ajouter]
        elif table.nom == "transactions":
            # Un lien vers une prévision absente du fichier est retiré : il pourrait viser celle d'un autre compte.
            a_ajouter = [
                {**l, "prevision_id": previsions.get(l["prevision_id"]), "split_id": divisions.get(l["split_id"], l["split_id"])}
                for l in a_ajouter
            ]
        elif table.nom == "theme_presets" and any(l["is_active"] for l in etape["existantes"]):
            a_ajouter = [{**l, "is_active": False} for l in a_ajouter]
        _inserer(conn, table, a_ajouter, utilisateur)
        if table.nom == "tricount":
            _rattacher_aux_liens_existants(conn, a_ajouter, utilisateur)


def _rattacher_aux_liens_existants(conn, lignes: list, utilisateur: str) -> None:
    """Si un groupe a déjà un lien de partage, les dépenses ajoutées y apparaissent aussi."""
    if not lignes:
        return
    conn.execute(text("""
        UPDATE tricount SET token_partage = (
            SELECT MAX(t.token_partage) FROM tricount t
            WHERE LOWER(t.utilisateur) = :u AND t.groupe = tricount.groupe AND t.token_partage IS NOT NULL
        )
        WHERE LOWER(utilisateur) = :u AND token_partage IS NULL
    """), {"u": utilisateur})


def _verifier_compte(conn, utilisateur: str):
    profil = conn.execute(
        text("SELECT username, name, email, import_mode FROM users WHERE LOWER(username) = :u"),
        {"u": utilisateur},
    ).mappings().first()
    if not profil:
        raise HTTPException(status_code=404, detail="Compte introuvable.")
    return profil


async def _lire_fichier(request: Request):
    """Lit le corps de la requête sans jamais dépasser la limite, même si Content-Length est absent ou faux."""
    trop_gros = HTTPException(status_code=413, detail=f"Ce fichier dépasse la limite de {TAILLE_MAX // (1024 * 1024)} Mo.")
    annonce = request.headers.get("content-length", "")
    if annonce.isdigit() and int(annonce) > TAILLE_MAX:
        raise trop_gros
    morceaux = []
    recu = 0
    async for morceau in request.stream():
        recu += len(morceau)
        if recu > TAILLE_MAX:
            raise trop_gros
        morceaux.append(morceau)

    def constante_refusee(_):
        raise ValueError

    try:
        return json.loads(b"".join(morceaux), parse_constant=constante_refusee)
    except (ValueError, RecursionError):
        _refuser("Ce fichier n'est pas un fichier JSON lisible.")


def _date_de_sauvegarde(fichier: dict):
    valeur = fichier.get("exporte_le")
    if not isinstance(valeur, str):
        return None
    try:
        return _instant_iso(valeur)
    except ValueError:
        return None


def _construire_export(utilisateur: str) -> dict:
    donnees = {}
    with engine.connect() as conn:
        profil = _verifier_compte(conn, utilisateur)
        for table in TABLES:
            lignes = _lire(conn, table, utilisateur)
            requises = [c.nom for c in table.colonnes if c.requis]
            completes = [l for l in lignes if all(l[nom] is not None for nom in requises)]
            if len(completes) != len(lignes):
                logger.warning(f"Sauvegarde : {len(lignes) - len(completes)} ligne(s) illisible(s) écartée(s) de {table.nom}")
            donnees[table.nom] = completes
    return {
        "format": FORMAT,
        "version": VERSION,
        "exporte_le": datetime.now(timezone.utc).isoformat(),
        "compte": utilisateur,
        "profil": {sortie: profil[colonne] for colonne, sortie in COLONNES_PROFIL.items()},
        "donnees": donnees,
    }


def _construire_apercu(fichier, utilisateur: str) -> dict:
    lignes_par_table = valider_fichier(fichier, utilisateur)
    with engine.connect() as conn:
        _verifier_compte(conn, utilisateur)
        plan = _preparer(conn, utilisateur, lignes_par_table)
    return {"compte": utilisateur, "version": VERSION, "exporte_le": _date_de_sauvegarde(fichier), **_resumer(plan)}


def _importer(fichier, utilisateur: str) -> dict:
    lignes_par_table = valider_fichier(fichier, utilisateur)
    try:
        with engine.begin() as conn:
            # Cette ligne verrouillée fait attendre un second import du même compte : il verra les lignes du premier.
            verrou = conn.execute(text("UPDATE users SET name = name WHERE LOWER(username) = :u"), {"u": utilisateur})
            if verrou.rowcount == 0:
                raise HTTPException(status_code=404, detail="Compte introuvable.")
            plan = _preparer(conn, utilisateur, lignes_par_table)
            _ecrire(conn, plan, utilisateur)
    except IntegrityError:
        logger.warning("Sauvegarde : import annulé par une contrainte de la base")
        raise HTTPException(status_code=409, detail="L'import a été annulé : rien n'a été modifié. Réessayez dans un instant.") from None
    return {"status": "success", **_resumer(plan)}


@router.get("/api/sauvegarde/export")
def exporter_sauvegarde(current_user: str = Depends(get_current_user)):
    contenu = _construire_export(current_user)
    nom = re.sub(r"[^a-z0-9_-]", "_", current_user)
    return Response(
        content=json.dumps(contenu, ensure_ascii=False),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="kleea-sauvegarde-{nom}.json"',
            "Cache-Control": "no-store",
        },
    )


@router.post("/api/sauvegarde/apercu")
async def apercu_sauvegarde(request: Request, current_user: str = Depends(get_current_user)):
    fichier = await _lire_fichier(request)
    return await run_in_threadpool(_construire_apercu, fichier, current_user)


@router.post("/api/sauvegarde/import")
async def importer_sauvegarde(request: Request, current_user: str = Depends(get_current_user)):
    fichier = await _lire_fichier(request)
    return await run_in_threadpool(_importer, fichier, current_user)
