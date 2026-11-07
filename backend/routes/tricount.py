"""Tricount et partage."""
import json
import pandas as pd
import re
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from journaux import detail_erreur, logger
from schemas import OptionsLienPartage, RenameGroupRequest, SharedTransactionDelete, SharedTransactionRequest, SharedTransactionUpdate, TricountTransaction, UpdateTransactionRequest
from sqlalchemy import text
from tricount_calculs import StyledPDF, calculer_balances, clean_for_pdf
from urllib.parse import unquote
from base import engine, get_current_user


router = APIRouter()

DUREE_LIEN_PAR_DEFAUT = 30
LONGUEUR_AUTEUR = 60
CHAMPS_DEPENSE = ("date", "libelle", "paye_par", "pour_qui", "montant")


def _en_utc(valeur):
    """Date lue en base. SQLite la rend en texte et sans fuseau ; elle est toujours écrite en UTC."""
    if valeur is None:
        return None
    moment = datetime.fromisoformat(valeur) if isinstance(valeur, str) else valeur
    return moment.replace(tzinfo=timezone.utc) if moment.tzinfo is None else moment.astimezone(timezone.utc)


def _en_iso(valeur):
    moment = _en_utc(valeur)
    return moment.isoformat() if moment else None


def _est_expire(expire_le) -> bool:
    moment = _en_utc(expire_le)
    return moment is not None and moment <= datetime.now(timezone.utc)


def _refus_lien(statut: int, code: str, message: str):
    # Aucune information sur le groupe : la personne n'a plus accès, ou n'a jamais eu accès.
    return HTTPException(status_code=statut, detail={"code": code, "message": message})


def verifier_lien(conn, token: str) -> dict:
    """Passage obligé de chaque route partagée. Un jeton sans règle est un lien d'avant les expirations : il reste valable."""
    regle = conn.execute(
        text("SELECT expire_le, revoque_le FROM tricount_liens WHERE token = :t"), {"t": token}
    ).mappings().first()
    if regle and regle["revoque_le"] is not None:
        raise _refus_lien(410, "lien_revoque", "Ce lien de partage a été révoqué.")
    if regle and _est_expire(regle["expire_le"]):
        raise _refus_lien(410, "lien_expire", "Ce lien de partage a expiré.")
    contexte = conn.execute(
        text("SELECT utilisateur, groupe FROM tricount WHERE token_partage = :t LIMIT 1"), {"t": token}
    ).mappings().first()
    if not contexte:
        raise _refus_lien(404, "lien_introuvable", "Lien de partage introuvable.")
    return {
        "utilisateur": contexte["utilisateur"],
        "groupe": contexte["groupe"],
        "expire_le": _en_iso(regle["expire_le"]) if regle else None,
    }


def _verifier_proprietaire(username: str, current_user: str) -> None:
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")


def _lien_du_groupe(conn, utilisateur: str, groupe: str) -> dict | None:
    ligne = conn.execute(text("""
        SELECT token_partage FROM tricount
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND token_partage IS NOT NULL
        ORDER BY token_partage
        LIMIT 1
    """), {"u": utilisateur, "g": groupe}).fetchone()
    if not ligne:
        return None
    regle = conn.execute(
        text("SELECT expire_le FROM tricount_liens WHERE token = :t"), {"t": ligne[0]}
    ).mappings().first()
    expire_le = regle["expire_le"] if regle else None
    return {"token": ligne[0], "expire_le": _en_iso(expire_le), "statut": "expire" if _est_expire(expire_le) else "actif"}


def _etat_lien(lien: dict | None) -> dict:
    return lien or {"token": None, "expire_le": None, "statut": None}


def _echeance(duree_jours: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=duree_jours)


def _revoquer_liens(conn, utilisateur: str, groupe: str) -> None:
    """Coupe tous les jetons du groupe, y compris ceux d'avant les expirations, qui n'ont encore aucune règle."""
    maintenant = datetime.now(timezone.utc)
    valeurs = {"u": utilisateur, "g": groupe}
    jetons = conn.execute(text("""
        SELECT DISTINCT token_partage FROM tricount
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND token_partage IS NOT NULL
    """), valeurs).fetchall()
    for (jeton,) in jetons:
        conn.execute(text("""
            INSERT INTO tricount_liens (token, utilisateur, groupe, revoque_le) VALUES (:t, :u, :g, :r)
            ON CONFLICT (token) DO UPDATE SET revoque_le = EXCLUDED.revoque_le
        """), {**valeurs, "t": jeton, "r": maintenant})
    conn.execute(text("""
        UPDATE tricount_liens SET revoque_le = :r
        WHERE utilisateur = :u AND groupe = :g AND revoque_le IS NULL
    """), {**valeurs, "r": maintenant})
    conn.execute(text("UPDATE tricount SET token_partage = NULL WHERE LOWER(utilisateur) = :u AND groupe = :g"), valeurs)


def _nouveau_lien(conn, utilisateur: str, groupe: str, duree_jours: int | None) -> dict:
    _revoquer_liens(conn, utilisateur, groupe)
    token = secrets.token_urlsafe(16)
    modifiees = conn.execute(
        text("UPDATE tricount SET token_partage = :t WHERE LOWER(utilisateur) = :u AND groupe = :g"),
        {"t": token, "u": utilisateur, "g": groupe},
    ).rowcount
    if not modifiees:
        raise HTTPException(status_code=404, detail="Groupe introuvable.")
    expire_le = _echeance(duree_jours or DUREE_LIEN_PAR_DEFAUT)
    conn.execute(
        text("INSERT INTO tricount_liens (token, utilisateur, groupe, expire_le) VALUES (:t, :u, :g, :e)"),
        {"t": token, "u": utilisateur, "g": groupe, "e": expire_le},
    )
    return {"token": token, "expire_le": _en_iso(expire_le), "statut": "actif"}


def _nettoyer_auteur(auteur: str | None) -> str | None:
    # Un nom trop long ou mal formé ne doit jamais empêcher d'enregistrer une dépense.
    nom = re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", auteur or "")).strip()
    return nom[:LONGUEUR_AUTEUR] or None


def _valeur_depense(depense) -> dict:
    valeur = {champ: depense[champ] for champ in CHAMPS_DEPENSE}
    # Le jour seul : la colonne est un horodatage, le formulaire envoie une date.
    valeur["date"] = str(valeur["date"])[:10] if valeur["date"] else None
    return valeur


def _noter_historique(conn, lien: dict, action: str, depense_id: int, auteur: str | None, avant: dict | None, apres: dict | None) -> None:
    """Écrit dans la transaction du changement : pas de changement sans trace. Ni jeton ni adresse IP ici."""
    conn.execute(text("""
        INSERT INTO tricount_historique (utilisateur, groupe, action, depense_id, auteur, ancienne_valeur, nouvelle_valeur, created_at)
        VALUES (:u, :g, :a, :d, :n, :av, :ap, :t)
    """), {
        "u": lien["utilisateur"].lower().strip(),
        "g": lien["groupe"],
        "a": action,
        "d": depense_id,
        "n": _nettoyer_auteur(auteur),
        "av": json.dumps(avant, ensure_ascii=False) if avant else None,
        "ap": json.dumps(apres, ensure_ascii=False) if apres else None,
        "t": datetime.now(timezone.utc),
    })


def _lire_depense_du_lien(conn, depense_id: int, token: str):
    """Sécurité : la dépense doit appartenir à ce lien. Verrouillée pour que l'ancienne valeur notée soit la bonne."""
    verrou = " FOR UPDATE" if conn.dialect.name == "postgresql" else ""
    depense = conn.execute(
        text(f"SELECT date, libelle, paye_par, pour_qui, montant FROM tricount WHERE id = :id AND token_partage = :token{verrou}"),
        {"id": depense_id, "token": token},
    ).mappings().first()
    if not depense:
        raise HTTPException(status_code=403, detail="Action non autorisée.")
    return depense


@router.get("/get-tricount/{username}/{group_name}")
def get_tricount(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    # 🔒 Vérifie que l'utilisateur consulte bien ses propres groupes
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    decoded_group = unquote(group_name).strip()
    query = text("""
        SELECT * FROM tricount 
        WHERE LOWER(utilisateur) = :u AND (groupe = :g OR TRIM(groupe) = :g) 
        ORDER BY date DESC
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user, "g": decoded_group}).mappings().all()
        transactions = [dict(r) for r in res]
        transferts = calculer_balances(transactions)
        return {
            "transactions": transactions, 
            "transferts": transferts
        }


@router.post("/save-tricount")
def save_tricount(t: TricountTransaction, current_user: str = Depends(get_current_user)):
    # 🔒 Force l'utilisateur connecté comme propriétaire du groupe
    query_token = text("""
        SELECT token_partage FROM tricount 
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    token_existant = None
    with engine.connect() as conn:
        row = conn.execute(query_token, {"u": current_user, "g": t.groupe}).fetchone()
        if row:
            token_existant = row[0]

    # Le jeton vient toujours de la base : l'accepter du client permettrait de se greffer sur un autre lien.
    token_final = token_existant

    query = text("""
        INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, utilisateur, groupe, emoji, token_partage)
        VALUES (:d, :l, :p, :pq, :m, :u, :g, :e, :token)
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, 
            "m": t.montant, "u": current_user, "g": t.groupe, "token": token_final, "e": t.emoji
        })
    return {"status": "success"}


@router.get("/get-groups/{username}")
def get_groups(username: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurisation JWT
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = text("""
        SELECT groupe, paye_par, emoji 
        FROM tricount 
        WHERE LOWER(utilisateur) = :u 
        AND emoji IS NOT NULL
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user}).mappings().all()
        emojis_par_groupe = {}
        for r in res:
            g = r['groupe']
            p = r['paye_par']
            e = r['emoji']
            if g not in emojis_par_groupe:
                emojis_par_groupe[g] = {}
            emojis_par_groupe[g][p] = e

    query_names = text("SELECT DISTINCT groupe FROM tricount WHERE LOWER(utilisateur) = :u ORDER BY groupe")
    with engine.connect() as conn:
        res_names = conn.execute(query_names, {"u": current_user}).all()
        final_groups = []
        for i, r in enumerate(res_names):
            nom_g = r[0]
            map_e = emojis_par_groupe.get(nom_g, {})
            chaine_emojis = ",".join([f"{k}:{v}" for k, v in map_e.items()])
            final_groups.append({
                "id": i,
                "nom": nom_g,
                "emojis": chaine_emojis
            })
        return final_groups


@router.delete("/delete-group/{username}/{group_name}")
def delete_group(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = text("DELETE FROM tricount WHERE LOWER(utilisateur) = :u AND groupe = :g")
    with engine.begin() as conn:
        valeurs = {"u": current_user.lower(), "g": group_name}
        conn.execute(query, valeurs)
        # Un groupe recréé plus tard sous ce nom n'hérite ni des anciens liens ni de leur historique.
        conn.execute(text("DELETE FROM tricount_liens WHERE utilisateur = :u AND groupe = :g"), valeurs)
        conn.execute(text("DELETE FROM tricount_historique WHERE utilisateur = :u AND groupe = :g"), valeurs)
    return {"status": "success", "message": f"Groupe {group_name} supprimé"}


@router.put("/rename-group")
def rename_group(request: RenameGroupRequest, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE tricount 
        SET groupe = :new 
        WHERE LOWER(utilisateur) = :u AND groupe = :old
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "new": request.newName,
            "u": current_user.lower(), # Empêche de renommer les groupes d'un autre
            "old": request.oldName
        })
        for table in ("tricount_liens", "tricount_historique"):
            conn.execute(text(f"UPDATE {table} SET groupe = :new WHERE utilisateur = :u AND groupe = :old"), {
                "new": request.newName, "u": current_user.lower(), "old": request.oldName
            })
    return {"status": "success", "message": f"Groupe renommé en {request.newName}"}


# ==========================================================
# ROUTE 1 : TELECHARGEMENT DE PDF (CONNECTÉ)
# ==========================================================
@router.get("/download-pdf/{username}/{group_name}")
def download_pdf(username: str, group_name: str, sujet: str = None, current_user: str = Depends(get_current_user)):
    # 🔒 Empêche un utilisateur externe de télécharger le bilan complet
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    try:
        # --- 1. RÉCUPÉRATION DES DONNÉES ---
        query = text("SELECT * FROM tricount WHERE utilisateur = :u AND groupe = :g ORDER BY date DESC")
        with engine.connect() as conn:
            res = conn.execute(query, {"u": username, "g": group_name}).mappings().all()
            transactions = [dict(r) for r in res]
            
        if not transactions:
            raise HTTPException(status_code=404, detail="Bilan vide ou groupe introuvable.")
            
        df_groupe = pd.DataFrame(transactions)
        
        # --- 2. CALCULS ---
        transferts_finaux = calculer_balances(transactions)
        total_depenses = df_groupe['montant'].sum() if not df_groupe.empty else 0
        
        # Nettoyage des titres
        group_name_clean = clean_for_pdf(group_name)
        
        if sujet:
            sujet_clean = clean_for_pdf(sujet)
            transferts_a_afficher = [
                t for t in transferts_finaux 
                if clean_for_pdf(t['de']) == sujet_clean or clean_for_pdf(t['a']) == sujet_clean
            ]
            titre_doc = f"NOTE : {sujet_clean}"
            sous_titre = f"Bilan personnel dans le groupe {group_name_clean}"
        else:
            sujet_clean = None
            transferts_a_afficher = transferts_finaux
            titre_doc = group_name_clean
            sous_titre = f"Bilan global du groupe - Total : {total_depenses:.2f} EUR"

        # --- 3. GÉNÉRATION DU PDF ---
        pdf = StyledPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        pdf.header_style(titre_doc, sous_titre)
        
        pdf.set_left_margin(20)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, "RECAPITULATIF DES TRANSFERTS", ln=True)
        
        pdf.set_fill_color(99, 102, 241)
        pdf.rect(20, pdf.get_y(), 10, 1, 'F')
        pdf.ln(5)

        largeur_utile = 170

        if transferts_a_afficher:
            for t in transferts_a_afficher:
                curr_y = pdf.get_y()
                de_clean = clean_for_pdf(t['de'])
                a_clean = clean_for_pdf(t['a'])
                
                if sujet:
                    if de_clean == sujet_clean:
                        color = (225, 29, 72)
                        texte = f"[-] VOUS DEVEZ DONNER {t['montant']:.2f} EUR A {a_clean}"
                    else:
                        color = (5, 150, 105)
                        texte = f"[+] VOUS ALLEZ RECEVOIR {t['montant']:.2f} EUR DE {de_clean}"
                else:
                    color = (79, 70, 229)
                    texte = f"> {de_clean} doit donner {t['montant']:.2f} EUR a {a_clean}"
                
                pdf.set_fill_color(248, 250, 252)
                pdf.rect(20, curr_y, largeur_utile, 10, 'F')
                pdf.set_fill_color(*color)
                pdf.rect(20, curr_y, 1.5, 10, 'F')
                
                pdf.set_x(25)
                pdf.set_text_color(*color)
                pdf.set_font("Helvetica", "B", 10)
                pdf.multi_cell(w=largeur_utile - 5, h=10, txt=texte, align='L')
                pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "Aucun transfert a effectuer.", ln=True)

        # 💡 EXTRACTION COMPATIBLE TOUTES VERSIONS FPDF (Ancienne & Nouvelle)
        pdf_bytes = b''
        try:
            # On essaye l'ancienne syntaxe PyFPDF (dest='S')
            raw_out = pdf.output(dest='S')
            if isinstance(raw_out, str) and raw_out != "":
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)
        except (TypeError, ValueError):
            # Si fpdf2 est installé, 'dest' provoquera une TypeError, on se replie sur sa syntaxe
            raw_out = pdf.output()
            if isinstance(raw_out, str):
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)

        headers = {
            'Content-Disposition': f'attachment; filename="Bilan_{group_name_clean}.pdf"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

    except Exception as e:
        logger.exception("Erreur de génération du PDF")
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur interne de PDF"))


# 1. Récupérer le lien du groupe, le créer s'il n'existe pas, ou changer sa durée
@router.post("/share-group/{username}/{group_name}")
def share_group(username: str, group_name: str, options: OptionsLienPartage | None = None, current_user: str = Depends(get_current_user)):
    # 🔒 Seul le créateur du groupe peut gérer son lien de partage
    _verifier_proprietaire(username, current_user)
    duree_jours = options.duree_jours if options else None

    with engine.begin() as conn:
        lien = _lien_du_groupe(conn, current_user, group_name)
        # Un lien expiré ne revit pas : le propriétaire repart d'un nouveau jeton.
        if not lien or lien["statut"] == "expire":
            return _nouveau_lien(conn, current_user, group_name, duree_jours)
        if not duree_jours:
            return lien
        expire_le = _echeance(duree_jours)
        conn.execute(text("""
            INSERT INTO tricount_liens (token, utilisateur, groupe, expire_le) VALUES (:t, :u, :g, :e)
            ON CONFLICT (token) DO UPDATE SET expire_le = EXCLUDED.expire_le
        """), {"t": lien["token"], "u": current_user, "g": group_name, "e": expire_le})
        return {**lien, "expire_le": _en_iso(expire_le)}


# 2. Récupérer le lien s'il existe déjà, avec son état
@router.get("/get-share-token/{username}/{group_name}")
def get_share_token(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    _verifier_proprietaire(username, current_user)
    with engine.connect() as conn:
        return _etat_lien(_lien_du_groupe(conn, current_user, group_name))


@router.post("/revoke-share/{username}/{group_name}")
def revoke_share(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    _verifier_proprietaire(username, current_user)
    with engine.begin() as conn:
        _revoquer_liens(conn, current_user, group_name)
    return _etat_lien(None)


@router.post("/regenerate-share/{username}/{group_name}")
def regenerate_share(username: str, group_name: str, options: OptionsLienPartage | None = None, current_user: str = Depends(get_current_user)):
    _verifier_proprietaire(username, current_user)
    with engine.begin() as conn:
        return _nouveau_lien(conn, current_user, group_name, options.duree_jours if options else None)


@router.get("/share-history/{username}/{group_name}")
def share_history(username: str, group_name: str, limite: int = Query(200, ge=1, le=500), current_user: str = Depends(get_current_user)):
    _verifier_proprietaire(username, current_user)
    with engine.connect() as conn:
        lignes = conn.execute(text("""
            SELECT id, action, depense_id, auteur, ancienne_valeur, nouvelle_valeur, created_at
            FROM tricount_historique
            WHERE utilisateur = :u AND groupe = :g
            ORDER BY created_at DESC, id DESC
            LIMIT :n
        """), {"u": current_user, "g": group_name, "n": limite}).mappings().all()
    return {"historique": [{
        "id": ligne["id"],
        "action": ligne["action"],
        "depense_id": ligne["depense_id"],
        "auteur": ligne["auteur"],
        "ancienne_valeur": json.loads(ligne["ancienne_valeur"]) if ligne["ancienne_valeur"] else None,
        "nouvelle_valeur": json.loads(ligne["nouvelle_valeur"]) if ligne["nouvelle_valeur"] else None,
        "date": _en_iso(ligne["created_at"]),
    } for ligne in lignes]}


# 3. Récupérer toutes les données d'un Tricount de manière anonyme via le Token
@router.get("/get-shared-tricount/{token}")
def get_shared_tricount(token: str):
    query = text("""
        SELECT * FROM tricount
        WHERE token_partage = :token
        ORDER BY date DESC
    """)
    with engine.connect() as conn:
        lien = verifier_lien(conn, token)
        res = conn.execute(query, {"token": token}).mappings().all()
        transactions = [dict(r) for r in res]

        transferts = calculer_balances(transactions)
        groupe_nom = transactions[0]["groupe"]
        utilisateur_origine = transactions[0]["utilisateur"]

        # Compiler les émojis des membres existants
        emojis_par_membre = {}
        for t in transactions:
            p = t.get('paye_par') or t.get('paye_par')
            e = t.get('emoji')
            if p and e:
                emojis_par_membre[p] = e
        chaine_emojis = ",".join([f"{k}:{v}" for k, v in emojis_par_membre.items()])

        return {
            "groupe": groupe_nom,
            "utilisateur": utilisateur_origine,
            "transactions": transactions,
            "transferts": transferts,
            "emojis": chaine_emojis,
            "expire_le": lien["expire_le"],
        }


@router.post("/save-shared-transaction/{token}")
def save_shared_transaction(token: str, t: SharedTransactionRequest):
    query_insert = text("""
        INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, utilisateur, groupe, token_partage, emoji)
        VALUES (:d, :l, :p, :pq, :m, :u, :g, :token, :e)
        RETURNING id
    """)
    with engine.begin() as conn:
        # Retrouver l'utilisateur et le groupe d'origine associés au token
        lien = verifier_lien(conn, token)
        depense_id = conn.execute(query_insert, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui,
            "m": t.montant, "u": lien["utilisateur"], "g": lien["groupe"], "token": token, "e": t.emoji
        }).scalar()
        _noter_historique(conn, lien, "ajout", depense_id, t.auteur, None, _valeur_depense(t.model_dump()))
    return {"status": "success"}


@router.put("/update-shared-transaction/{token}")
def update_shared_transaction(token: str, t: SharedTransactionUpdate):
    query_update = text("""
        UPDATE tricount
        SET date = :d, libelle = :l, paye_par = :p, pour_qui = :pq, montant = :m
        WHERE id = :id
    """)
    with engine.begin() as conn:
        lien = verifier_lien(conn, token)
        avant = _valeur_depense(_lire_depense_du_lien(conn, t.id, token))
        apres = _valeur_depense(t.model_dump())
        conn.execute(query_update, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, "m": t.montant, "id": t.id
        })
        # Enregistrer sans rien changer n'est pas une modification.
        if avant != apres:
            _noter_historique(conn, lien, "modification", t.id, t.auteur, avant, apres)
    return {"status": "success"}


# 6. Supprimer une transaction de manière sécurisée via le token de partage
@router.delete("/delete-shared-transaction/{token}/{id}")
def delete_shared_transaction(token: str, id: int, corps: SharedTransactionDelete | None = None):
    with engine.begin() as conn:
        lien = verifier_lien(conn, token)
        avant = _valeur_depense(_lire_depense_du_lien(conn, id, token))
        conn.execute(text("DELETE FROM tricount WHERE id = :id"), {"id": id})
        _noter_historique(conn, lien, "suppression", id, corps.auteur if corps else None, avant, None)
    return {"status": "success"}


# ==========================================================
# ROUTE 2 : TELECHARGEMENT DE PDF ANONYME (PARTAGÉ)
# ==========================================================
@router.get("/download-shared-pdf/{token}")
def download_shared_pdf(token: str, sujet: str = None):
    # Hors du try : le refus doit garder son statut, pas devenir une erreur de PDF.
    with engine.connect() as conn:
        verifier_lien(conn, token)
    try:
        query = text("SELECT * FROM tricount WHERE token_partage = :token ORDER BY date DESC")
        with engine.connect() as conn:
            res = conn.execute(query, {"token": token}).mappings().all()
            transactions = [dict(r) for r in res]
            
        if not transactions:
            raise HTTPException(status_code=404, detail="Bilan vide.")
            
        df_groupe = pd.DataFrame(transactions)
        transferts_finaux = calculer_balances(transactions)
        total_depenses = df_groupe['montant'].sum() if not df_groupe.empty else 0
        
        group_name = transactions[0]["groupe"]
        group_name_clean = clean_for_pdf(group_name)

        if sujet:
            sujet_clean = clean_for_pdf(sujet)
            transferts_a_afficher = [
                t for t in transferts_finaux 
                if clean_for_pdf(t['de']) == sujet_clean or clean_for_pdf(t['a']) == sujet_clean
            ]
            titre_doc = f"NOTE : {sujet_clean}"
            sous_titre = f"Bilan personnel dans le groupe {group_name_clean}"
        else:
            sujet_clean = None
            transferts_a_afficher = transferts_finaux
            titre_doc = group_name_clean
            sous_titre = f"Bilan global du groupe - Total : {total_depenses:.2f} EUR"

        # --- GÉNÉRATION DU PDF ---
        pdf = StyledPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        pdf.header_style(titre_doc, sous_titre)
        
        pdf.set_left_margin(20)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 41, 59)
        pdf.cell(0, 10, "RECAPITULATIF DES TRANSFERTS", ln=True)
        pdf.set_fill_color(99, 102, 241)
        pdf.rect(20, pdf.get_y(), 10, 1, 'F')
        pdf.ln(5)

        largeur_utile = 170

        if transferts_a_afficher:
            for t in transferts_a_afficher:
                curr_y = pdf.get_y()
                de_clean = clean_for_pdf(t['de'])
                a_clean = clean_for_pdf(t['a'])
                
                if sujet:
                    if de_clean == sujet_clean:
                        color = (225, 29, 72)
                        texte = f"[-] VOUS DEVEZ DONNER {t['montant']:.2f} EUR A {a_clean}"
                    else:
                        color = (5, 150, 105)
                        texte = f"[+] VOUS ALLEZ RECEVOIR {t['montant']:.2f} EUR DE {de_clean}"
                else:
                    color = (79, 70, 229)
                    texte = f"> {de_clean} doit donner {t['montant']:.2f} EUR a {a_clean}"
                
                pdf.set_fill_color(248, 250, 252)
                pdf.rect(20, curr_y, largeur_utile, 10, 'F')
                pdf.set_fill_color(*color)
                pdf.rect(20, curr_y, 1.5, 10, 'F')
                
                pdf.set_x(25)
                pdf.set_text_color(*color)
                pdf.set_font("Helvetica", "B", 10)
                pdf.multi_cell(w=largeur_utile - 5, h=10, txt=texte, align='L')
                pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(150, 150, 150)
            pdf.cell(0, 10, "Aucun transfert a effectuer.", ln=True)

        # 💡 EXTRACTION COMPATIBLE TOUTES VERSIONS FPDF (Ancienne & Nouvelle)
        pdf_bytes = b''
        try:
            # On essaye l'ancienne syntaxe PyFPDF (dest='S')
            raw_out = pdf.output(dest='S')
            if isinstance(raw_out, str) and raw_out != "":
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)
        except (TypeError, ValueError):
            # Si fpdf2 est installé, 'dest' provoquera une TypeError, on se replie sur sa syntaxe
            raw_out = pdf.output()
            if isinstance(raw_out, str):
                pdf_bytes = raw_out.encode('latin-1')
            else:
                pdf_bytes = bytes(raw_out)

        headers = {
            'Content-Disposition': f'attachment; filename="Bilan_{group_name_clean}.pdf"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)

    except Exception as e:
        logger.exception("Erreur de génération du PDF partagé")
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur interne de PDF"))


# 🟢 1. SUPPRESSION / MODIFICATION DE TRANSACTIONS TRICOUNT
@router.delete("/delete-transaction/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: str = Depends(get_current_user)):
    query = text("DELETE FROM tricount WHERE id = :id AND LOWER(utilisateur) = :u")
    try:
        with engine.begin() as conn:
            res = conn.execute(query, {"id": transaction_id, "u": current_user})
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Transaction introuvable.")
        return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.put("/update-transaction")
def update_transaction(t: UpdateTransactionRequest, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE tricount 
        SET date = :d, libelle = :l, paye_par = :p, pour_qui = :pq, montant = :m
        WHERE id = :id AND LOWER(utilisateur) = :u
    """)
    try:
        with engine.begin() as conn:
            res = conn.execute(query, {
                "d": t.date, "l": t.libelle, "p": t.paye_par, 
                "pq": t.pour_qui, "m": t.montant, "id": t.id,
                "u": current_user
            })
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Transaction introuvable.")
        return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.put("/update-member-emoji")
def update_member_emoji(data: dict, current_user: str = Depends(get_current_user)):
    # 🔒 Vérifie que l'émoji est modifié sur un groupe de l'utilisateur connecté
    query = text("""
        UPDATE tricount 
        SET emoji = :e 
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND paye_par = :m
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "e": data['new_emoji'],
            "u": current_user,
            "g": data['group_name'],
            "m": data['member_name']
        })
    return {"status": "success"}


@router.get("/get-members/{username}/{group_name}")
def get_members(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurisation JWT
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = text("""
        SELECT paye_par, pour_qui 
        FROM tricount 
        WHERE LOWER(utilisateur) = :u AND groupe = :g
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user, "g": group_name}).mappings().all()
        membres = set()
        for r in res:
            if r['paye_par']:
                membres.add(r['paye_par'].strip())
            pour_qui_raw = r['pour_qui'] or ""
            parts = [p.strip() for p in pour_qui_raw.split(',') if p.strip()]
            for p in parts:
                nom = p.split(':')[0] if ':' in p else p
                membres.add(nom.strip())
        return sorted(list(membres))
