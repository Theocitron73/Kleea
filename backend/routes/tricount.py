"""Tricount et partage."""
import pandas as pd
import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from journaux import detail_erreur, logger
from schemas import RenameGroupRequest, SharedTransactionRequest, SharedTransactionUpdate, TricountTransaction, UpdateTransactionRequest
from sqlalchemy import text
from tricount_calculs import StyledPDF, calculer_balances, clean_for_pdf
from urllib.parse import unquote
from base import engine, get_current_user


router = APIRouter()


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

    token_final = t.token_partage or token_existant

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
        conn.execute(query, {"u": current_user.lower(), "g": group_name})
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


# 1. Générer ou récupérer un lien de partage unique pour un groupe
@router.post("/share-group/{username}/{group_name}")
def share_group(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    # 🔒 Seul le créateur du groupe peut générer son lien de partage
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query_check = text("""
        SELECT token_partage FROM tricount 
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query_check, {"u": current_user, "g": group_name}).fetchone()
        if row:
            return {"token": row[0]}
            
    token = secrets.token_urlsafe(16)
    query_update = text("""
        UPDATE tricount 
        SET token_partage = :token 
        WHERE LOWER(utilisateur) = :u AND groupe = :g
    """)
    with engine.begin() as conn:
        conn.execute(query_update, {"token": token, "u": current_user, "g": group_name})
        
    return {"token": token}


# 2. Récupérer le token s'il existe déjà
@router.get("/get-share-token/{username}/{group_name}")
def get_share_token(username: str, group_name: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = text("""
        SELECT token_partage FROM tricount 
        WHERE LOWER(utilisateur) = :u AND groupe = :g AND token_partage IS NOT NULL 
        LIMIT 1
    """)
    with engine.connect() as conn:
        row = conn.execute(query, {"u": current_user, "g": group_name}).fetchone()
        if row:
            return {"token": row[0]}
    return {"token": None}


# 3. Récupérer toutes les données d'un Tricount de manière anonyme via le Token
@router.get("/get-shared-tricount/{token}")
def get_shared_tricount(token: str):
    query = text("""
        SELECT * FROM tricount 
        WHERE token_partage = :token 
        ORDER BY date DESC
    """)
    with engine.connect() as conn:
        res = conn.execute(query, {"token": token}).mappings().all()
        transactions = [dict(r) for r in res]
        
        if not transactions:
            raise HTTPException(status_code=404, detail="Lien de partage introuvable ou groupe vide.")
            
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
            "emojis": chaine_emojis
        }


@router.post("/save-shared-transaction/{token}")
def save_shared_transaction(token: str, t: SharedTransactionRequest):
    # Retrouver l'utilisateur et le groupe d'origine associés au token
    query_context = text("""
        SELECT utilisateur, groupe FROM tricount 
        WHERE token_partage = :token 
        LIMIT 1
    """)
    with engine.connect() as conn:
        context = conn.execute(query_context, {"token": token}).mappings().first()
        if not context:
            raise HTTPException(status_code=404, detail="Lien de partage invalide.")
            
        username = context["utilisateur"]
        group_name = context["groupe"]

    query_insert = text("""
        INSERT INTO tricount (date, libelle, paye_par, pour_qui, montant, utilisateur, groupe, token_partage, emoji)
        VALUES (:d, :l, :p, :pq, :m, :u, :g, :token, :e)
    """)
    with engine.begin() as conn:
        conn.execute(query_insert, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, 
            "m": t.montant, "u": username, "g": group_name, "token": token, "e": t.emoji
        })
    return {"status": "success"}


@router.put("/update-shared-transaction/{token}")
def update_shared_transaction(token: str, t: SharedTransactionUpdate):
    # Sécurité : Vérifier que la transaction appartient bien à ce token de partage
    query_check = text("SELECT 1 FROM tricount WHERE id = :id AND token_partage = :token")
    with engine.connect() as conn:
        exists = conn.execute(query_check, {"id": t.id, "token": token}).fetchone()
        if not exists:
            raise HTTPException(status_code=403, detail="Action non autorisée.")

    query_update = text("""
        UPDATE tricount 
        SET date = :d, libelle = :l, paye_par = :p, pour_qui = :pq, montant = :m
        WHERE id = :id
    """)
    with engine.begin() as conn:
        conn.execute(query_update, {
            "d": t.date, "l": t.libelle, "p": t.paye_par, "pq": t.pour_qui, "m": t.montant, "id": t.id
        })
    return {"status": "success"}


# 6. Supprimer une transaction de manière sécurisée via le token de partage
@router.delete("/delete-shared-transaction/{token}/{id}")
def delete_shared_transaction(token: str, id: int):
    # Sécurité : Vérifier que la transaction appartient bien à ce token de partage
    query_check = text("SELECT 1 FROM tricount WHERE id = :id AND token_partage = :token")
    with engine.connect() as conn:
        exists = conn.execute(query_check, {"id": id, "token": token}).fetchone()
        if not exists:
            raise HTTPException(status_code=403, detail="Action non autorisée.")

    query_delete = text("DELETE FROM tricount WHERE id = :id")
    with engine.begin() as conn:
        conn.execute(query_delete, {"id": id})
    return {"status": "success"}


# ==========================================================
# ROUTE 2 : TELECHARGEMENT DE PDF ANONYME (PARTAGÉ)
# ==========================================================
@router.get("/download-shared-pdf/{token}")
def download_shared_pdf(token: str, sujet: str = None):
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
