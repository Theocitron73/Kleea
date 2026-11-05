"""Congés."""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Response
from fpdf import FPDF
from schemas import CongeCreate, CongeProfile
from sqlalchemy import text
from tricount_calculs import clean_for_pdf
from base import engine, get_current_user


router = APIRouter()


@router.get("/api/conges/{username}")
def get_user_conges(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    with engine.connect() as conn:
        conges_res = conn.execute(
            text("SELECT * FROM conges WHERE LOWER(utilisateur) = :u ORDER BY date_debut DESC"),
            {"u": current_user}
        ).mappings().all()

        profile_res = conn.execute(
            text("SELECT * FROM conges_profile WHERE LOWER(utilisateur) = :u"),
            {"u": current_user}
        ).mappings().first()

        profile_dict = dict(profile_res) if profile_res else None
        if profile_dict and profile_dict.get("date_embauche"):
            profile_dict["date_embauche"] = profile_dict["date_embauche"].strftime("%Y-%m-%d")

    return {
        "conges": [dict(r) for r in conges_res],
        "profile": profile_dict
    }


@router.post("/api/conges")
def create_conge(req: CongeCreate, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO conges (utilisateur, type, date_debut, date_fin, nb_jours, motif, anticipe)
        VALUES (:u, :t, :dd, :df, :nb, :m, :anti)
        RETURNING id
    """)
    with engine.begin() as conn:
        res = conn.execute(query, {
            "u": current_user.lower().strip(),
            "t": req.type,
            "dd": req.date_debut,
            "df": req.date_fin,
            "nb": req.nb_jours,
            "m": req.motif,
            "anti": req.anticipe
        })
        new_id = res.fetchone()[0]

    return {"status": "success", "id": new_id}


@router.delete("/api/conges/{conge_id}")
def delete_conge(conge_id: int, current_user: str = Depends(get_current_user)):
    query = text("DELETE FROM conges WHERE id = :id AND LOWER(utilisateur) = :u")
    with engine.begin() as conn:
        conn.execute(query, {"id": conge_id, "u": current_user.lower().strip()})
    return {"status": "deleted"}


@router.put("/api/conges/config")
def save_conges_profile(p: CongeProfile, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO conges_profile (utilisateur, nom, prenom, societe, poste, jours_acquis_annuel, date_embauche)
        VALUES (:u, :n, :p, :s, :pos, :ja, :de)
        ON CONFLICT (utilisateur) DO UPDATE
        SET nom = EXCLUDED.nom, prenom = EXCLUDED.prenom, societe = EXCLUDED.societe,
            poste = EXCLUDED.poste, jours_acquis_annuel = EXCLUDED.jours_acquis_annuel,
            date_embauche = EXCLUDED.date_embauche
    """)
    with engine.begin() as conn:
        conn.execute(query, {
            "u": current_user.lower().strip(),
            "n": p.nom, "p": p.prenom, "s": p.societe, "pos": p.poste, 
            "ja": p.jours_acquis_annuel,
            "de": p.date_embauche
        })
    return {"status": "success"}


# --- GÉNÉRATEUR DU PDF OFFICIEL ISA GROUP CORRIGÉ ---
@router.get("/api/conges/pdf/{conge_id}")
def generate_isa_conge_pdf(conge_id: int, current_user: str = Depends(get_current_user)):
    user_clean = current_user.lower().strip()

    with engine.connect() as conn:
        # 1. Récupération de la demande de congé
        conge = conn.execute(
            text("SELECT * FROM conges WHERE id = :id AND LOWER(utilisateur) = :u"),
            {"id": conge_id, "u": user_clean}
        ).mappings().first()

        if not conge:
            raise HTTPException(status_code=404, detail="Congé introuvable.")

        # 2. Récupération du profil salarié
        profile = conn.execute(
            text("SELECT * FROM conges_profile WHERE LOWER(utilisateur) = :u"),
            {"u": user_clean}
        ).mappings().first()

        # Année de la demande
        annee_conge = conge["date_debut"].year

        # 3. Calcul dynamique du droit annuel selon la date d'embauche (base 30 jours ouvrables)
        base_annuelle = float(profile["jours_acquis_annuel"]) if profile and profile.get("jours_acquis_annuel") is not None else 30.0
        taux_mensuel = base_annuelle / 12.0 # 2.5 j / mois

        date_embauche = profile.get("date_embauche") if profile else None
        if isinstance(date_embauche, str):
            try:
                date_embauche = datetime.strptime(date_embauche, "%Y-%m-%d").date()
            except Exception:
                date_embauche = None

        if date_embauche and date_embauche.year == annee_conge:
            # Prorata depuis le mois d'embauche (ex: Septembre -> 12 - 9 + 1 = 4 mois)
            mois_restants = 12 - date_embauche.month + 1
            droit_total_annee = round(mois_restants * taux_mensuel, 1) # 4 * 2.5 = 10.0
        elif date_embauche and date_embauche.year > annee_conge:
            droit_total_annee = 0.0
        else:
            droit_total_annee = base_annuelle

        # 4. Total des CP pris pour CETTE année AVANT cette demande
        cp_pris_avant = conn.execute(
            text("""
                SELECT COALESCE(SUM(nb_jours), 0) 
                FROM conges 
                WHERE LOWER(utilisateur) = :u 
                  AND type = 'CP' 
                  AND EXTRACT(YEAR FROM date_debut) = :annee
                  AND (date_debut < :date_deb OR (date_debut = :date_deb AND id < :cid))
            """),
            {
                "u": user_clean,
                "annee": annee_conge,
                "date_deb": conge["date_debut"],
                "cid": conge_id
            }
        ).scalar() or 0.0

    nom = profile["nom"] if profile and profile.get("nom") else "LEBARBIER"
    prenom = profile["prenom"] if profile and profile.get("prenom") else "Théo"
    societe = profile["societe"] if profile and profile.get("societe") else "ISA Group"
    poste = profile["poste"] if profile and profile.get("poste") else "Salarié"

    # Calculs des compteurs précis pour ce formulaire
    jours_avant_ce_conge = max(0.0, float(droit_total_annee) - float(cp_pris_avant))
    jours_pris_ce_conge = float(conge["nb_jours"])
    jours_restants_apres = max(0.0, float(jours_avant_ce_conge) - float(jours_pris_ce_conge))

    def fmt_num(val):
        return f"{val:.1f}".replace(".0", "")

    # Initialisation PDF A4
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_margins(15, 10, 15)

    # =========================================================
    # 1. 🖼️ LOGO OFFICIEL ISA GROUP (VIA FICHIER PNG)
    # =========================================================
    logo_path = os.path.join(os.path.dirname(__file__), "assets", "logo_isa.png")
    
    # Fallback si l'image est directement dans le dossier backend/
    if not os.path.exists(logo_path):
        logo_path = os.path.join(os.path.dirname(__file__), "logo_isa.png")

    if os.path.exists(logo_path):
        # Positionnement de l'image (X=15mm, Y=10mm, Largeur=48mm, Hauteur proportionnelle)
        pdf.image(logo_path, x=15, y=10, w=48)
    else:
        # Solution de secours vectorielle si le fichier PNG est introuvable
        pdf.set_fill_color(229, 36, 33)
        pdf.ellipse(15, 9, 52, 17, style="F")
        pdf.set_xy(17, 12.5)
        pdf.set_font("Helvetica", "BI", 16)
        pdf.set_text_color(255, 235, 59)
        pdf.cell(20, 10, "ISA", align="C")
        pdf.set_xy(34, 13)
        pdf.set_font("Helvetica", "BI", 14)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(30, 10, "Group", align="C")

    # =========================================================
    # 2. BANDEAU TITRE
    # =========================================================
    pdf.set_xy(15, 30)
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.set_text_color(0, 0, 0)
    pdf.set_draw_color(0, 0, 0)
    pdf.set_line_width(0.3)
    pdf.cell(180, 8, "DEMANDES DE CONGES, RECUPERATIONS, CONGES SANS SOLDE", border=1, align="C")

    # =========================================================
    # 3. BLOC COORDONNÉES SALARIÉ
    # =========================================================
    pdf.set_xy(15, 45)
    # Ligne 1 : NOM & SOCIETE
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(25, 7, "NOM", border=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(65, 7, f" {clean_for_pdf(nom)}", border=1)
    
    pdf.cell(5, 7, "", border=0)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(25, 7, "SOCIETE", border=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(60, 7, f" {clean_for_pdf(societe)}", border=1, ln=True)

    pdf.set_xy(15, 53)
    # Ligne 2 : PRENOM & POSTE
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(25, 7, "PRENOM", border=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(65, 7, f" {clean_for_pdf(prenom)}", border=1)

    pdf.cell(5, 7, "", border=0)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(25, 7, "POSTE", border=0)
    pdf.set_font("Helvetica", "", 9)
    pdf.cell(60, 7, f" {clean_for_pdf(poste)}", border=1, ln=True)

    # =========================================================
    # 4. SECTION CONGÉS PAYÉS (VALEURS PRORATISÉES EXACTES)
    # =========================================================
    pdf.set_xy(15, 68)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "CONGES PAYES", ln=True)

    is_cp = (conge["type"] == "CP")

    # Ligne : Jours acquis ou restants
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(50, 6, "Nbre de jours acquis ou restants", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_avant_ce_conge)}" if is_cp else "", border=1)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.cell(0, 6, "  Le samedi est decompte a raison de 5 samedis sur une periode annuelle", ln=True)

    # Ligne : Du (au matin)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(50, 6, "Du (au matin)", border=0)
    pdf.cell(35, 6, f" {conge['date_debut'].strftime('%d/%m/%Y')}" if is_cp else "", border=1, ln=True)

    # Ligne : Au (inclus)
    pdf.cell(50, 6, "Au (inclus)", border=0)
    pdf.cell(35, 6, f" {conge['date_fin'].strftime('%d/%m/%Y')}" if is_cp else "", border=1, ln=True)

    # Ligne : Nombre jours pris
    pdf.cell(50, 6, "Nombre jours pris", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_pris_ce_conge)}" if is_cp else "", border=1)
    if is_cp and conge.get("anticipe"):
        pdf.set_font("Helvetica", "B", 7.5)
        pdf.cell(0, 6, "  Conges par anticipation", ln=True)
    else:
        pdf.set_font("Helvetica", "I", 7.5)
        pdf.cell(0, 6, "  Indiquer s'il s'agit de conges par anticipation", ln=True)

    # Ligne : Nombre de jours restants
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(50, 6, "Nombre de jours restants", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_restants_apres)}" if is_cp else "", border=1, ln=True)

    # =========================================================
    # 5. SECTION CONGÉS SANS SOLDE
    # =========================================================
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "CONGES SANS SOLDE - ABSENCE NON REMUNEREE", ln=True)

    is_ss = (conge["type"] == "SANS_SOLDE")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(50, 6, "Du (au matin)", border=0)
    pdf.cell(35, 6, f" {conge['date_debut'].strftime('%d/%m/%Y')}" if is_ss else "", border=1, ln=True)

    pdf.cell(50, 6, "Au (inclus)", border=0)
    pdf.cell(35, 6, f" {conge['date_fin'].strftime('%d/%m/%Y')}" if is_ss else "", border=1, ln=True)

    pdf.cell(50, 6, "Nombre jours", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_pris_ce_conge)}" if is_ss else "", border=1, ln=True)

    # =========================================================
    # 6. SECTION RÉCUPÉRATIONS
    # =========================================================
    pdf.ln(5)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(0, 6, "RECUPERATIONS", ln=True)

    is_recup = (conge["type"] == "RECUP")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(50, 6, "Nombre de jours a recuperer", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_pris_ce_conge)}" if is_recup else "", border=1, ln=True)

    pdf.cell(50, 6, "Du (au matin)", border=0)
    pdf.cell(35, 6, f" {conge['date_debut'].strftime('%d/%m/%Y')}" if is_recup else "", border=1, ln=True)

    pdf.cell(50, 6, "Au (inclus)", border=0)
    pdf.cell(35, 6, f" {conge['date_fin'].strftime('%d/%m/%Y')}" if is_recup else "", border=1, ln=True)

    pdf.cell(50, 6, "Nombre jours pris", border=0)
    pdf.cell(35, 6, f" {fmt_num(jours_pris_ce_conge)}" if is_recup else "", border=1, ln=True)

    # =========================================================
    # 7. ENCADRÉ MOTIF DE RÉCUPÉRATION
    # =========================================================
    pdf.ln(6)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(180, 5, "Jours recuperes : preciser obligatoirement le motif", border="LTR", ln=True)
    pdf.set_font("Helvetica", "", 8)
    motif_txt = f" {clean_for_pdf(conge['motif'])}" if is_recup and conge.get("motif") else ""
    pdf.multi_cell(180, 5, f"{motif_txt}\n\n", border="LBR")

    # =========================================================
    # 8. SIGNATURES EN BAS DE PAGE (CORRIGÉ SANS DÉBORDEMENT)
    # =========================================================
    pdf.set_y(225)
    w_box = 60
    h_box = 35
    today_fr = datetime.now().strftime("%d/%m/%Y")

    # 1. Salarié
    pdf.set_xy(15, 225)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(w_box, 6, " Le Salarie", border="LTR", ln=True)
    pdf.set_xy(15, 231)
    pdf.cell(w_box, h_box - 12, "", border="LR", ln=True)
    pdf.set_xy(15, 225 + h_box - 6)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(w_box, 6, f" Date : {today_fr}", border="LBR")

    # 2. Responsable
    pdf.set_xy(15 + w_box, 225)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(w_box, 6, " Le Responsable", border="LTR", ln=True)
    pdf.set_xy(15 + w_box, 231)
    pdf.cell(w_box, h_box - 12, "", border="LR", ln=True)
    pdf.set_xy(15 + w_box, 225 + h_box - 6)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(w_box, 6, " Date :", border="LBR")

    # 3. Direction / Service Administratif et Financier (ajusté à 6.8 pt pour ne plus déborder)
    pdf.set_xy(15 + 2 * w_box, 225)
    pdf.set_font("Helvetica", "B", 6.8)
    pdf.cell(w_box, 6, " Direction / Service Administratif et Financier", border="LTR", ln=True)
    pdf.set_xy(15 + 2 * w_box, 231)
    pdf.cell(w_box, h_box - 12, "", border="LR", ln=True)
    pdf.set_xy(15 + 2 * w_box, 225 + h_box - 6)
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(w_box, 6, " Date :", border="LBR")

    # Génération du flux binaire
    try:
        raw_out = pdf.output(dest='S')
        pdf_bytes = raw_out.encode('latin-1') if isinstance(raw_out, str) else bytes(raw_out)
    except (TypeError, ValueError):
        raw_out = pdf.output()
        pdf_bytes = raw_out.encode('latin-1') if isinstance(raw_out, str) else bytes(raw_out)

    headers = {
        'Content-Disposition': f'attachment; filename="Demande_Conges_ISA_{nom}.pdf"',
        'Access-Control-Expose-Headers': 'Content-Disposition'
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
