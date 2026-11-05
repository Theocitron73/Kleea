"""Import de fichiers bancaires."""
import io
import pandas as pd
from fastapi import APIRouter, Depends, File, UploadFile
from imports_bancaires import clean_val_to_float, parse_ofx_data, parse_qif_data
from journaux import logger
from typing import Optional
from base import get_current_user
from routes.categories import fetch_memoire_data, get_mots_cles_rules, matches_keyword_boundary


router = APIRouter()


@router.post("/import-csv")
@router.post("/import-file")
async def import_file(
    compte: Optional[str] = None, 
    file: UploadFile = File(...),
    utilisateur: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    user_cible = current_user
    try:
        contents = await file.read()
        try:
            decoded = contents.decode('utf-8')
        except Exception:
            try:
                decoded = contents.decode('latin-1')
            except Exception:
                decoded = contents.decode('cp1252', errors='ignore')
            
        filename = (file.filename or "").lower()
        extracted_txs = []

        # 1. Détection et extraction selon le format
        if filename.endswith('.ofx') or filename.endswith('.qfx') or '<OFX>' in decoded.upper() or '<STMTTRN>' in decoded.upper():
            extracted_txs = parse_ofx_data(decoded)
        elif filename.endswith('.qif') or '!TYPE:BANK' in decoded.upper() or '!TYPE:CCARD' in decoded.upper():
            extracted_txs = parse_qif_data(decoded)
        else:
            # Traitement CSV classique
            lines = [l.strip() for l in decoded.splitlines() if l.strip()]
            if not lines:
                return []
            
            is_revolut = "Date de début" in lines[0] or "Type,Produit" in lines[0]
            separator = ',' if is_revolut else ';'
            
            start_line = 0
            for i, line in enumerate(lines[:20]):
                l = line.lower()
                if (any(k in l for k in ['date', 'le ']) and 
                    any(k in l for k in ['libell', 'montant', 'débit', 'crédit', 'description'])):
                    start_line = i
                    break
            
            csv_data = "\n".join(lines[start_line:])
            df = pd.read_csv(io.StringIO(csv_data), sep=separator, engine='python', on_bad_lines='skip')
            df.columns = [c.strip().lower() for c in df.columns]

            col_date = next((c for c in df.columns if any(k in c for k in ['date de début', 'start date', 'date operation', 'date'])), None)
            col_nom = next((c for c in df.columns if any(k in c for k in ['description', 'libelle simplifie', 'nom', 'libell'])), None)
            col_montant = next((c for c in df.columns if any(k in c for k in ['montant', 'amount', 'valeur'])), None)
            col_debit = next((c for c in df.columns if 'debit' in c or 'débit' in c), None)
            col_credit = next((c for c in df.columns if 'credit' in c or 'crédit' in c), None)
            col_etat = next((c for c in df.columns if any(k in c for k in ['état', 'status', 'state'])), None)
            col_info = next((c for c in df.columns if any(k in c for k in ['informations complementaires', 'info'])), None)

            for _, row in df.iterrows():
                if pd.isna(row.get(col_date)): continue
                if col_etat and pd.notna(row.get(col_etat)):
                    if str(row[col_etat]).upper() not in ['TERMINÉ', 'COMPLETED', 'FINI']:
                        continue

                montant_float = 0.0
                if col_debit or col_credit:
                    d_val = clean_val_to_float(row.get(col_debit)) if col_debit else 0.0
                    c_val = clean_val_to_float(row.get(col_credit)) if col_credit else 0.0
                    if d_val != 0.0: montant_float = -abs(d_val)
                    elif c_val != 0.0: montant_float = abs(c_val)
                elif col_montant:
                    montant_float = clean_val_to_float(row.get(col_montant))

                nom_t = str(row.get(col_nom, "")).strip()
                info_t = str(row.get(col_info, "")) if col_info and pd.notna(row.get(col_info)) else ""
                libelle_complet = f"{nom_t} {info_t}".strip() if info_t else nom_t

                extracted_txs.append({
                    "raw_date": str(row[col_date]).split(' ')[0],
                    "nom": libelle_complet,
                    "montant": montant_float
                })

        # 2. Intelligence, Mots-clés et Mémoire
        mots_cles_rules = get_mots_cles_rules(user_cible)
        memoire_rules = fetch_memoire_data(user_cible)

        transactions_pretes = []
        mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]

        for item in extracted_txs:
            try:
                dt = pd.to_datetime(item["raw_date"], dayfirst=True, errors='coerce')
                if pd.isna(dt): continue

                montant_float = item["montant"]
                nom_t = item["nom"]
                nom_t_lower = nom_t.lower()
                texte_integral_upper = nom_t.upper()

                # =========================================================
                # 🟢 CLASSIFICATION RÉVISÉE DES VIREMENTS & FLUX
                # =========================================================
                cat = "Autre"

                # A. Priorité 1 : VRAIS Virements internes (uniquement vers vos livrets ou compte commun)
                types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL", "PEA"]
                type_cible = next((t for t in types_epargne if t in texte_integral_upper), None)

                if type_cible and any(k in texte_integral_upper for k in ["VERS", "VIR", "VIREMENT", "TO "]):
                    cat = f"Virement : CCP vers {type_cible}" if montant_float < 0 else f"Virement : {type_cible} vers CCP"
                elif "COMPTE COMMUN" in texte_integral_upper and any(k in texte_integral_upper for k in ["VERS", "VIR", "VIREMENT"]):
                    cat = "Compte Commun"

                # B. Priorité 2 : Mémoire apprise (prioritaire sur les catégories génériques)
                if cat == "Autre":
                    nom_t_normalise = " ".join(nom_t_lower.split())
                    for m in memoire_rules:
                        nom_memoire_clean = " ".join(m["nom"].lower().split())
                        if nom_memoire_clean in nom_t_normalise:
                            cat = m["categorie"]
                            break

                # C. Priorité 3 : Mots-clés définis par l'utilisateur (ex: si le virement s'appelle "Virement Salaire")
                if cat == "Autre":
                    for rule in mots_cles_rules:
                        matched = False
                        for raw_k in rule["keywords"]:
                            parts = raw_k.split(':')
                            keyword_clean = parts[0].strip().lower()
                            filtre_signe = parts[1].strip().lower() if len(parts) > 1 else "both"
                            if not keyword_clean: continue

                            if matches_keyword_boundary(keyword_clean, nom_t_lower):
                                match_positif = (filtre_signe == "positive" and montant_float > 0)
                                match_negatif = (filtre_signe == "negative" and montant_float < 0)
                                match_deux = (filtre_signe in ["both", "all"])

                                if match_positif or match_negatif or match_deux:
                                    matched = True
                                    cat = rule["categorie"]
                                    break
                        if matched: break

                # 🟢 D. Priorité 4 : Virements externes vers/depuis des tiers (NON internes)
                # Si après la mémoire et les mots-clés, la transaction contient "virement" ou "vir" :
                if cat == "Autre":
                    if any(k in texte_integral_upper for k in ["VIREMENT", "VIR ", "VIR.", "SEPA"]):
                        cat = "Virement Reçu" if montant_float > 0 else "Virement Envoyé"

                transactions_pretes.append({
                    "date": dt.strftime('%Y-%m-%d'),
                    "nom": nom_t,
                    "montant": montant_float,
                    "categorie": cat,
                    "utilisateur": user_cible,
                    "compte": compte,
                    "mois": mois_fr[dt.month - 1],
                    "annee": int(dt.year)
                })

            except Exception as e:
                logger.warning(f"Ligne d'import ignorée : {type(e).__name__}")
                continue

        return transactions_pretes

    except Exception as e:
        logger.error(f"CRASH GÉNÉRAL IMPORT: {e}")
        return []
