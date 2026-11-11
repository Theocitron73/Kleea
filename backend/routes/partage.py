"""Compte commun : partager certains comptes avec une autre personne, chacune avec sa propre connexion.

Principe de sécurité : les lignes partagées restent enregistrées chez le propriétaire. Toute lecture ou écriture
d'une autre personne passe par les fonctions de ce module, qui relisent à chaque requête le partage actif et la
liste exacte des comptes partagés. Rien n'est gardé dans la session : un partage arrêté coupe l'accès aussitôt.

Chez la personne invitée, un compte partagé porte un nom distinct (« Compte joint · theo ») : il ne se confond
jamais avec ses propres comptes, et le serveur sait ainsi vers quel propriétaire diriger chaque écriture.
"""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import resend
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import bindparam, text

from base import SECRET_KEY, engine, get_current_user
from journaux import logger

router = APIRouter()

SEPARATEUR = " · "
DUREE_INVITATION = timedelta(hours=48)
INVITATIONS_PAR_HEURE = 5
COLONNES_TX = "id, date, nom, montant, categorie, utilisateur, mois, annee, compte, enveloppe, prevision_id, split_id, auteur"


def maintenant() -> datetime:
    return datetime.now(timezone.utc)


def empreinte(jeton: str) -> str:
    return hmac.new(SECRET_KEY.encode(), f"partage:{jeton}".encode(), hashlib.sha256).hexdigest()


def alias(compte: str, proprietaire: str) -> str:
    return f"{compte}{SEPARATEUR}{proprietaire}"


def groupe_partage(proprietaire: str) -> str:
    return f"Commun{SEPARATEUR}{proprietaire}"


# --- La porte d'entrée unique des droits ---

def table_absente(erreur: Exception) -> bool:
    message = str(getattr(erreur, "orig", erreur)).lower()
    return "no such table" in message or "does not exist" in message


def comptes_partages_avec(conn, utilisateur: str) -> list:
    """Les comptes que d'autres partagent avec cet utilisateur, via un partage actif.

    Sans les tables du partage (base pas encore migrée), il n'y a simplement aucun partage. Le point de
    sauvegarde évite qu'une table absente n'interrompe la transaction en cours sous Postgres.
    """
    try:
        with conn.begin_nested():
            lignes = conn.execute(
                text("""SELECT p.id, p.proprietaire, c.compte FROM partages p JOIN partages_comptes c ON c.partage_id = p.id
                        WHERE LOWER(p.invite) = :u AND p.etat = 'actif' ORDER BY p.id, c.compte"""),
                {"u": utilisateur.lower()},
            ).mappings().all()
    except Exception as erreur:  # noqa: BLE001
        if table_absente(erreur):
            return []
        raise
    return [{"partage_id": l["id"], "proprietaire": l["proprietaire"].lower(), "compte": l["compte"], "alias": alias(l["compte"], l["proprietaire"].lower())} for l in lignes]


def cible(conn, utilisateur: str, compte: Optional[str]) -> dict:
    """Où écrire une ligne visant ce compte : chez soi, ou chez le propriétaire si c'est un compte partagé."""
    for partage in comptes_partages_avec(conn, utilisateur):
        if compte == partage["alias"]:
            return {"utilisateur": partage["proprietaire"], "compte": partage["compte"], "partage_id": partage["partage_id"]}
    return {"utilisateur": utilisateur.lower(), "compte": compte, "partage_id": None}


def ligne_accessible(conn, utilisateur: str, table: str, ident: int) -> Optional[dict]:
    """Une ligne (opération ou prévision) que l'utilisateur peut modifier : la sienne, ou une ligne d'un compte partagé."""
    ligne = conn.execute(text(f"SELECT * FROM {table} WHERE id = :id"), {"id": ident}).mappings().first()
    if not ligne:
        return None
    ligne = dict(ligne)
    if (ligne.get("utilisateur") or "").lower() == utilisateur.lower():
        return {**ligne, "_partage_id": None, "_alias": ligne.get("compte")}
    for partage in comptes_partages_avec(conn, utilisateur):
        if (ligne.get("utilisateur") or "").lower() == partage["proprietaire"] and ligne.get("compte") == partage["compte"]:
            return {**ligne, "_partage_id": partage["partage_id"], "_alias": partage["alias"]}
    return None


def ids_accessibles(conn, utilisateur: str, table: str, ids: List[int]) -> dict:
    """Parmi ces identifiants, ceux que l'utilisateur peut toucher, avec le partage concerné (None si c'est à lui)."""
    if not ids:
        return {}
    lignes = conn.execute(
        text(f"SELECT id, utilisateur, compte, nom, montant FROM {table} WHERE id IN :ids").bindparams(bindparam("ids", expanding=True)),
        {"ids": list(ids)},
    ).mappings().all()
    partages = comptes_partages_avec(conn, utilisateur)
    acces = {}
    for l in lignes:
        if (l["utilisateur"] or "").lower() == utilisateur.lower():
            acces[l["id"]] = (None, dict(l))
            continue
        for p in partages:
            if (l["utilisateur"] or "").lower() == p["proprietaire"] and l["compte"] == p["compte"]:
                acces[l["id"]] = (p["partage_id"], dict(l))
                break
    return acces


def noter(conn, partage_id: Optional[int], auteur: str, action: str, detail: str) -> None:
    """Journal des modifications faites par l'autre personne sur un compte partagé."""
    if partage_id:
        conn.execute(
            text("INSERT INTO partages_journal (partage_id, auteur, action, detail) VALUES (:p, :a, :ac, :d)"),
            {"p": partage_id, "a": auteur.lower(), "ac": action, "d": detail[:300]},
        )


def resume(ligne: dict) -> str:
    try:
        montant = f"{float(ligne.get('montant') or 0):.2f} €"
    except (TypeError, ValueError):
        montant = ""
    return f"{ligne.get('nom') or ''} {montant}".strip()


def operations_partagees(conn, utilisateur: str) -> list:
    """Les opérations des comptes partagés avec cet utilisateur, sous le nom de compte qu'il voit."""
    resultat = []
    par_proprietaire = {}
    for p in comptes_partages_avec(conn, utilisateur):
        par_proprietaire.setdefault(p["proprietaire"], {})[p["compte"]] = p["alias"]
    for proprietaire, comptes in par_proprietaire.items():
        lignes = conn.execute(
            text(f"SELECT {COLONNES_TX} FROM transactions WHERE LOWER(utilisateur) = :u AND compte IN :c").bindparams(bindparam("c", expanding=True)),
            {"u": proprietaire, "c": list(comptes)},
        ).mappings().all()
        for l in lignes:
            ligne = dict(l)
            ligne["compte"] = comptes[ligne["compte"]]
            ligne["partage"] = proprietaire
            resultat.append(ligne)
    return resultat


def comptes_visibles_partages(conn, utilisateur: str) -> list:
    """La configuration (solde initial, couleur…) des comptes partagés, en lecture seule. Ni IBAN ni liaison bancaire."""
    resultat = []
    for p in comptes_partages_avec(conn, utilisateur):
        ligne = conn.execute(
            text("SELECT compte, objectif, solde, couleur, taux FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u"),
            {"c": p["compte"], "u": p["proprietaire"]},
        ).mappings().first()
        if ligne:
            resultat.append({
                "compte": p["alias"], "groupe": groupe_partage(p["proprietaire"]), "solde": ligne["solde"], "objectif": ligne["objectif"],
                "couleur": ligne["couleur"], "taux": ligne["taux"], "powens_name": None, "partage": p["proprietaire"],
            })
    return resultat


def previsions_partagees(conn, utilisateur: str, annee: int, mois: Optional[str]) -> list:
    resultat = []
    for p in comptes_partages_avec(conn, utilisateur):
        sql = "SELECT id, date, nom, montant, categorie, compte, mois, annee, actif, regle_id FROM previsions WHERE LOWER(utilisateur) = :u AND compte = :c AND annee = :a"
        params = {"u": p["proprietaire"], "c": p["compte"], "a": annee}
        if mois and mois != "ALL":
            sql += " AND mois = :m"
            params["m"] = mois
        for l in conn.execute(text(sql), params).mappings():
            ligne = dict(l)
            resultat.append({
                **ligne, "date": ligne["date"].isoformat() if hasattr(ligne["date"], "isoformat") else ligne["date"],
                "montant": float(ligne["montant"]), "annee": int(ligne["annee"]), "actif": ligne["actif"] is not False,
                "compte": p["alias"], "partage": p["proprietaire"], "regle_id": None,
            })
    return resultat


def budgets_partages(conn, utilisateur: str, mois: Optional[str], annee: Optional[int]) -> list:
    """Les objectifs budgétaires des comptes partagés avec cet utilisateur, sous le nom de compte qu'il voit."""
    resultat = []
    for p in comptes_partages_avec(conn, utilisateur):
        sql = "SELECT * FROM budgets WHERE LOWER(utilisateur) = :u AND compte = :c"
        params = {"u": p["proprietaire"], "c": p["compte"]}
        if mois:
            sql += " AND mois = :m AND annee = :a"
            params.update(m=mois, a=annee)
        for l in conn.execute(text(sql), params).mappings():
            resultat.append({**dict(l), "compte": p["alias"], "partage": p["proprietaire"]})
    return resultat


# --- Invitation, acceptation, arrêt ---

class Invitation(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    comptes: List[str] = Field(min_length=1, max_length=50)


class ComptesPartages(BaseModel):
    comptes: List[str] = Field(min_length=1, max_length=50)


class Acceptation(BaseModel):
    jeton: str = Field(min_length=10, max_length=200)


def envoyer_invitation(email: str, proprietaire: str, lien: str) -> None:
    resend.api_key = os.getenv("RESEND_API_KEY")
    resend.Emails.send({
        "from": "Kleea <noreply@theolebarbier.fr>",
        "to": [email],
        "subject": "Kleea - Invitation à un compte commun",
        "html": f"""
        <html><body style="font-family: sans-serif;">
            <p>{proprietaire} vous invite à partager des comptes sur Kleea.</p>
            <p>Connectez-vous à Kleea avec cette adresse e-mail, puis ouvrez ce lien (valable 48 heures) :</p>
            <p><a href="{lien}">Accepter le partage</a></p>
            <p style="font-size: 12px; color: #6b7280;">Si vous ne connaissez pas cette personne, ignorez cet e-mail.</p>
        </body></html>
        """,
    })


def _comptes_du_proprietaire(conn, proprietaire: str, comptes: List[str]) -> List[str]:
    """Seuls des comptes qui existent chez le propriétaire peuvent être partagés."""
    existants = {r[0] for r in conn.execute(text("SELECT compte FROM configuration WHERE LOWER(utilisateur) = :u"), {"u": proprietaire})}
    choisis = sorted({c for c in comptes if c in existants})
    if not choisis:
        raise HTTPException(status_code=400, detail="Choisissez au moins un de vos comptes.")
    return choisis


@router.post("/api/partages")
def inviter(invitation: Invitation, current_user: str = Depends(get_current_user)):
    email = invitation.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Adresse e-mail invalide.")
    jeton = secrets.token_urlsafe(32)
    with engine.begin() as conn:
        moi = conn.execute(text("SELECT LOWER(email) FROM users WHERE LOWER(username) = :u"), {"u": current_user}).scalar()
        if moi and moi == email:
            raise HTTPException(status_code=400, detail="Vous ne pouvez pas vous inviter vous-même.")
        recentes = conn.execute(
            text("SELECT COUNT(*) FROM partages WHERE LOWER(proprietaire) = :u AND cree_le > :depuis"),
            {"u": current_user, "depuis": maintenant() - timedelta(hours=1)},
        ).scalar()
        if recentes >= INVITATIONS_PAR_HEURE:
            raise HTTPException(status_code=429, detail="Trop d'invitations envoyées. Réessayez dans une heure.")
        comptes = _comptes_du_proprietaire(conn, current_user, invitation.comptes)
        ident = conn.execute(
            text("""INSERT INTO partages (proprietaire, invite_email, etat, jeton_empreinte, jeton_expire_le)
                    VALUES (:p, :e, 'invite', :j, :x) RETURNING id"""),
            {"p": current_user, "e": email, "j": empreinte(jeton), "x": maintenant() + DUREE_INVITATION},
        ).scalar()
        for compte in comptes:
            conn.execute(text("INSERT INTO partages_comptes (partage_id, compte) VALUES (:p, :c)"), {"p": ident, "c": compte})
    lien = f"{os.getenv('SOUS_DOMAINE_URL', 'http://localhost:5173')}/?partage={jeton}"
    try:
        envoyer_invitation(email, current_user, lien)
    except Exception as erreur:  # noqa: BLE001
        logger.error(f"Invitation de partage non envoyée : {erreur}")
    # Même réponse que l'adresse ait un compte Kleea ou non : rien n'en est révélé.
    return {"status": "success", "id": ident}


@router.post("/api/partages/accepter")
def accepter(acceptation: Acceptation, current_user: str = Depends(get_current_user)):
    """Le lien reçu par e-mail prouve l'accès à la boîte ; la session prouve le compte. Il faut les deux."""
    refus = HTTPException(status_code=400, detail="Cette invitation n'est pas valable pour ce compte, ou elle a expiré.")
    with engine.begin() as conn:
        ligne = conn.execute(
            text("SELECT * FROM partages WHERE jeton_empreinte = :j AND etat = 'invite'"), {"j": empreinte(acceptation.jeton)},
        ).mappings().first()
        if not ligne:
            raise refus
        expire = ligne["jeton_expire_le"]
        if isinstance(expire, str):
            expire = datetime.fromisoformat(expire)
        if expire.tzinfo is None:
            expire = expire.replace(tzinfo=timezone.utc)
        email = conn.execute(text("SELECT LOWER(email) FROM users WHERE LOWER(username) = :u"), {"u": current_user}).scalar()
        if expire < maintenant() or not email or email != ligne["invite_email"].lower() or ligne["proprietaire"].lower() == current_user:
            raise refus
        conn.execute(
            text("UPDATE partages SET etat = 'actif', invite = :u, accepte_le = :t, jeton_empreinte = NULL WHERE id = :id"),
            {"u": current_user, "t": maintenant(), "id": ligne["id"]},
        )
        noter(conn, ligne["id"], current_user, "acceptation", "Partage accepté")
    return {"status": "success", "proprietaire": ligne["proprietaire"]}


def _partage_de(conn, ident: int, utilisateur: str) -> dict:
    """Un partage dont l'utilisateur est le propriétaire ou la personne invitée."""
    ligne = conn.execute(
        text("SELECT * FROM partages WHERE id = :id AND (LOWER(proprietaire) = :u OR LOWER(invite) = :u)"),
        {"id": ident, "u": utilisateur.lower()},
    ).mappings().first()
    if not ligne:
        raise HTTPException(status_code=404, detail="Partage introuvable.")
    return dict(ligne)


@router.get("/api/partages")
def lister(current_user: str = Depends(get_current_user)):
    with engine.connect() as conn:
        lignes = conn.execute(
            text("""SELECT * FROM partages WHERE (LOWER(proprietaire) = :u OR LOWER(invite) = :u) AND etat IN ('invite', 'actif') ORDER BY id"""),
            {"u": current_user},
        ).mappings().all()
        resultat = []
        for l in lignes:
            comptes = [r[0] for r in conn.execute(text("SELECT compte FROM partages_comptes WHERE partage_id = :p ORDER BY compte"), {"p": l["id"]})]
            proprietaire = l["proprietaire"].lower() == current_user
            resultat.append({
                "id": l["id"], "etat": l["etat"], "role": "proprietaire" if proprietaire else "invite",
                "avec": (l["invite"] or l["invite_email"]) if proprietaire else l["proprietaire"],
                "comptes": comptes if proprietaire else [alias(c, l["proprietaire"].lower()) for c in comptes],
                "accepte_le": str(l["accepte_le"])[:10] if l["accepte_le"] else None,
            })
    return resultat


@router.put("/api/partages/{ident}/comptes")
def changer_comptes(ident: int, choix: ComptesPartages, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        partage = _partage_de(conn, ident, current_user)
        if partage["proprietaire"].lower() != current_user or partage["etat"] not in ("invite", "actif"):
            raise HTTPException(status_code=403, detail="Seule la personne qui partage choisit les comptes.")
        comptes = _comptes_du_proprietaire(conn, current_user, choix.comptes)
        conn.execute(text("DELETE FROM partages_comptes WHERE partage_id = :p"), {"p": ident})
        for compte in comptes:
            conn.execute(text("INSERT INTO partages_comptes (partage_id, compte) VALUES (:p, :c)"), {"p": ident, "c": compte})
    return {"status": "success"}


def _nom_libre(conn, utilisateur: str, base: str) -> str:
    nom, n = base, 2
    while conn.execute(text("SELECT 1 FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u"), {"c": nom, "u": utilisateur}).first():
        nom, n = f"{base} ({n})", n + 1
    return nom


def copier_pour_l_invite(conn, partage: dict) -> int:
    """À l'arrêt, la personne invitée garde une copie indépendante des comptes partagés : opérations, prévisions et objectifs."""
    invite, proprietaire = partage["invite"].lower(), partage["proprietaire"].lower()
    copiees = 0
    for (compte,) in conn.execute(text("SELECT compte FROM partages_comptes WHERE partage_id = :p"), {"p": partage["id"]}).all():
        config = conn.execute(
            text("SELECT objectif, solde, couleur, taux FROM configuration WHERE compte = :c AND LOWER(utilisateur) = :u"), {"c": compte, "u": proprietaire},
        ).mappings().first()
        nouveau = _nom_libre(conn, invite, f"{compte} (copie de {proprietaire})")
        conn.execute(
            text("INSERT INTO configuration (compte, groupe, objectif, solde, utilisateur, couleur, taux) VALUES (:c, 'Commun (copie)', :o, :s, :u, :co, :t)"),
            {"c": nouveau, "o": (config or {}).get("objectif"), "s": (config or {}).get("solde") or 0, "u": invite,
             "co": (config or {}).get("couleur") or "#64748b", "t": (config or {}).get("taux") or 0},
        )
        for l in conn.execute(
            text("SELECT date, nom, montant, categorie, mois, annee FROM transactions WHERE compte = :c AND LOWER(utilisateur) = :u"), {"c": compte, "u": proprietaire},
        ).mappings().all():
            ajout = conn.execute(
                text("""INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte)
                        VALUES (:d, :n, :m, :ca, :u, :mo, :a, :co) ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING"""),
                {"d": l["date"], "n": l["nom"], "m": l["montant"], "ca": l["categorie"], "u": invite, "mo": l["mois"], "a": l["annee"], "co": nouveau},
            )
            copiees += ajout.rowcount or 0
        for l in conn.execute(
            text("SELECT date, nom, montant, categorie, mois, annee, actif FROM previsions WHERE compte = :c AND LOWER(utilisateur) = :u"), {"c": compte, "u": proprietaire},
        ).mappings().all():
            conn.execute(
                text("INSERT INTO previsions (date, nom, montant, categorie, compte, mois, annee, utilisateur, actif) VALUES (:d, :n, :m, :ca, :co, :mo, :a, :u, :ac)"),
                {"d": l["date"], "n": l["nom"], "m": l["montant"], "ca": l["categorie"], "co": nouveau, "mo": l["mois"], "a": l["annee"], "u": invite, "ac": l["actif"]},
            )
        conn.execute(
            text("""INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme)
                    SELECT :i, mois, annee, :co, type, nom, somme FROM budgets WHERE compte = :c AND LOWER(utilisateur) = :u"""),
            {"i": invite, "co": nouveau, "c": compte, "u": proprietaire},
        )
    return copiees


def arreter_partage(conn, partage: dict, par: str) -> int:
    copiees = copier_pour_l_invite(conn, partage) if partage["etat"] == "actif" and partage.get("invite") else 0
    conn.execute(
        text("UPDATE partages SET etat = 'arrete', arrete_le = :t, arrete_par = :p, jeton_empreinte = NULL WHERE id = :id"),
        {"t": maintenant(), "p": par.lower(), "id": partage["id"]},
    )
    noter(conn, partage["id"], par, "arret", "Partage arrêté")
    return copiees


@router.delete("/api/partages/{ident}")
def arreter(ident: int, current_user: str = Depends(get_current_user)):
    """L'une ou l'autre personne peut arrêter le partage. L'accès est coupé tout de suite."""
    with engine.begin() as conn:
        partage = _partage_de(conn, ident, current_user)
        if partage["etat"] == "arrete":
            return {"status": "success", "copiees": 0}
        copiees = arreter_partage(conn, partage, current_user)
    return {"status": "success", "copiees": copiees}


def arreter_tous_les_partages(conn, utilisateur: str) -> None:
    """À la suppression d'un compte Kleea : chaque partage s'arrête, et la personne invitée garde sa copie."""
    try:
        with conn.begin_nested():
            lignes = conn.execute(
                text("SELECT * FROM partages WHERE (LOWER(proprietaire) = :u OR LOWER(invite) = :u) AND etat IN ('invite', 'actif')"), {"u": utilisateur.lower()},
            ).mappings().all()
    except Exception as erreur:  # noqa: BLE001
        if table_absente(erreur):
            return
        raise
    for ligne in lignes:
        arreter_partage(conn, dict(ligne), utilisateur)


@router.get("/api/partages/{ident}/journal")
def journal(ident: int, current_user: str = Depends(get_current_user)):
    with engine.connect() as conn:
        _partage_de(conn, ident, current_user)
        lignes = conn.execute(
            text("SELECT auteur, action, detail, cree_le FROM partages_journal WHERE partage_id = :p ORDER BY id DESC LIMIT 100"), {"p": ident},
        ).mappings().all()
    return [{**dict(l), "cree_le": str(l["cree_le"])[:16]} for l in lignes]


DELAI_SYNCHRO = timedelta(minutes=15)


def lancer_synchro_du_proprietaire(proprietaire: str, partage_id: Optional[int] = None) -> None:
    """Synchronisation bancaire du propriétaire, avec sa propre connexion : le jeton ne quitte jamais son compte.

    La fin est notée au journal du partage, pour prévenir la personne invitée. Sans nombre d'opérations :
    il compterait aussi les comptes privés du propriétaire.
    """
    from routes.powens import synchroniser_et_noter

    try:
        synchroniser_et_noter(proprietaire)
        action, detail = "synchro_fin", "Synchronisation bancaire terminée"
    except Exception as erreur:  # noqa: BLE001
        logger.error(f"Synchronisation demandée par un partage échouée : {erreur}")
        action, detail = "synchro_echec", "La synchronisation bancaire a échoué"
    with engine.begin() as conn:
        noter(conn, partage_id, proprietaire, action, detail)


@router.post("/api/partages/{ident}/synchroniser")
def demander_synchro(ident: int, taches: BackgroundTasks, current_user: str = Depends(get_current_user)):
    """La personne invitée demande d'actualiser les comptes partagés depuis la banque du propriétaire.

    Rien n'est renvoyé de la banque : les nouvelles opérations arrivent chez le propriétaire, et les comptes
    partagés les montrent. Une demande au plus toutes les 15 minutes par partage.
    """
    from routes.powens import jeton_powens_du_compte

    with engine.begin() as conn:
        partage = _partage_de(conn, ident, current_user)
        if partage["etat"] != "actif" or (partage.get("invite") or "").lower() != current_user.lower():
            raise HTTPException(status_code=403, detail="Seule la personne invitée peut demander une synchronisation.")
        derniere = conn.execute(
            text("SELECT MAX(cree_le) FROM partages_journal WHERE partage_id = :p AND action = 'synchro'"), {"p": ident},
        ).scalar()
        if isinstance(derniere, str):
            derniere = datetime.fromisoformat(derniere)
        if derniere is not None and derniere.tzinfo is None:
            derniere = derniere.replace(tzinfo=timezone.utc)
        if derniere and maintenant() - derniere < DELAI_SYNCHRO:
            raise HTTPException(status_code=429, detail="Une synchronisation a déjà été demandée il y a moins de 15 minutes.")
        proprietaire = partage["proprietaire"].lower()
        if not jeton_powens_du_compte(proprietaire):
            raise HTTPException(status_code=400, detail=f"{partage['proprietaire']} n'a pas de banque connectée : ses comptes s'importent à la main.")
        noter(conn, ident, current_user, "synchro", "Synchronisation bancaire demandée")
    taches.add_task(lancer_synchro_du_proprietaire, proprietaire, ident)
    return {"status": "success"}
