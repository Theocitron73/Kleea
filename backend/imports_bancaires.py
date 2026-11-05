"""Lecture des fichiers bancaires et détection des doublons, sans accès à la base."""
import pandas as pd
import re
import unicodedata
from datetime import date, datetime, timedelta
from sqlalchemy import text


def clean_val_to_float(val) -> float:
    if not val:
        return 0.0
    res = str(val).replace('+', '').replace('\xa0', '').replace(' ', '').replace('EUR', '').strip()
    res = res.replace(',', '.')
    try:
        return float(res)
    except ValueError:
        return 0.0


def parse_ofx_data(content: str):
    """Parseur robuste pour les fichiers bancaires OFX 1.x (SGML) et OFX 2.x (XML)."""
    transactions = []
    # Isole chaque bloc <STMTTRN>...</STMTTRN>
    blocks = re.findall(r'<STMTTRN>(.*?)(?:</STMTTRN>|(?=<STMTTRN>)|$)', content, flags=re.DOTALL | re.IGNORECASE)
    
    for block in blocks:
        # Date : <DTPOSTED>20261005120000 ou <DTPOSTED>2026-10-05
        date_match = re.search(r'<DTPOSTED>\s*([0-9\-\:\s]+)', block, re.IGNORECASE)
        # Montant : <TRNAMT>-45.50
        amount_match = re.search(r'<TRNAMT>\s*([\+\-0-9\.,\s]+)', block, re.IGNORECASE)
        # Nom : <NAME>CARREFOUR
        name_match = re.search(r'<NAME>\s*([^<\r\n]+)', block, re.IGNORECASE)
        # Memo / Info : <MEMO>CB 04/10
        memo_match = re.search(r'<MEMO>\s*([^<\r\n]+)', block, re.IGNORECASE)

        if date_match and amount_match:
            raw_date = date_match.group(1).strip()
            # Nettoyage date OFX (format YYYYMMDD...)
            if len(raw_date) >= 8 and raw_date[:8].isdigit():
                date_str = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:8]}"
            else:
                date_str = raw_date[:10]

            montant = clean_val_to_float(amount_match.group(1))
            nom = name_match.group(1).strip() if name_match else ""
            memo = memo_match.group(1).strip() if memo_match else ""
            
            libelle = f"{nom} {memo}".strip() if memo and memo != nom else (nom or memo or "Transaction OFX")
            transactions.append({
                "raw_date": date_str,
                "nom": libelle,
                "montant": montant
            })
    return transactions


def parse_qif_data(content: str):
    """Parseur officiel pour les fichiers Quicken QIF."""
    transactions = []
    # Sépare les enregistrements par le caractère '^'
    records = content.split('^')
    
    for record in records:
        lines = [l.strip() for l in record.splitlines() if l.strip()]
        if not lines:
            continue
        
        raw_date = None
        montant = 0.0
        payee = ""
        memo = ""

        for line in lines:
            code = line[0].upper()
            val = line[1:].strip()
            
            if code == 'D': # Date (ex: D05/10/2026 ou D05/10'26 ou D2026-10-05)
                raw_date = val.replace("'", "/")
            elif code == 'T': # Montant (ex: T-45.50)
                montant = clean_val_to_float(val)
            elif code == 'P': # Payee / Bénéficiaire
                payee = val
            elif code == 'M': # Memo / Description
                memo = val

        if raw_date and (payee or memo or montant != 0):
            # Normalisation de la date QIF
            dt = pd.to_datetime(raw_date, dayfirst=True, errors='coerce')
            if pd.notna(dt):
                date_str = dt.strftime('%Y-%m-%d')
                libelle = f"{payee} {memo}".strip() if memo and memo != payee else (payee or memo or "Transaction QIF")
                transactions.append({
                    "raw_date": date_str,
                    "nom": libelle,
                    "montant": montant
                })
    return transactions


def normalize_powens_transactions(
    powens_txs, 
    utilisateur: str, 
    compte_nom: str, 
    target_account_id: str = None,
    date_debut: str = None,  # Format "YYYY-MM-DD"
    date_fin: str = None     # Format "YYYY-MM-DD"
):
    mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    normalized = []

    target_id_str = str(target_account_id).strip() if target_account_id else None

    # Conversion des bornes de dates si fournies
    dt_debut = datetime.strptime(date_debut, '%Y-%m-%d') if date_debut else None
    dt_fin = datetime.strptime(date_fin, '%Y-%m-%d').replace(hour=23, minute=59, second=59) if date_fin else None

    # Fallback par défaut : si aucune date n'est transmise, prendre les 60 derniers jours
    if not dt_debut and not dt_fin:
        aujourdhui = datetime.now()
        dt_debut = aujourdhui - timedelta(days=60)
        dt_fin = aujourdhui

    for tx in powens_txs:
        # 1. Filtrage par ID Compte
        tx_account_id = str(tx.get("id_account")).strip() if tx.get("id_account") is not None else None
        if target_id_str and tx_account_id:
            if tx_account_id != target_id_str:
                continue

        # 2. Filtrage par Date
        raw_date = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0]
        try:
            dt = datetime.strptime(raw_date, '%Y-%m-%d')
        except ValueError:
            continue

        if dt_debut and dt < dt_debut:
            continue
        if dt_fin and dt > dt_fin:
            continue

        # Normalisation montant et libellé
        montant_float = float(tx.get("value", 0.0))
        libelle = (
            tx.get("simplified_wording") or 
            tx.get("wording") or 
            tx.get("raw_wording") or 
            "Transaction Inconnue"
        )

       # Extraction de la catégorie ML de Powens
        powens_cat = None

        # 1. Format 'category' standard
        cat_obj = tx.get("category")
        if isinstance(cat_obj, dict):
            powens_cat = cat_obj.get("name")
        elif isinstance(cat_obj, str):
            powens_cat = cat_obj

        # 2. Format 'categories' alternatif (Powens Categorization API)
        if not powens_cat:
            categories_obj = tx.get("categories")
            if isinstance(categories_obj, list) and len(categories_obj) > 0:
                powens_cat = categories_obj[0].get("name") or categories_obj[0].get("description")
            elif isinstance(categories_obj, dict):
                powens_cat = categories_obj.get("name") or categories_obj.get("description")

        normalized.append({
            "date": dt.strftime('%Y-%m-%d'),
            "nom": libelle.strip(),
            "montant": montant_float,
            "categorie": "Autre",
            "utilisateur": utilisateur.lower(),
            "compte": compte_nom,
            "mois": mois_fr[dt.month - 1],
            "annee": int(dt.year),
            "raw_powens_category": powens_cat  # 👈 Transmis pour le mapping
        })

    return normalized


def clean_text_for_matching(text_val: str) -> str:
    """Nettoie le texte pour faciliter la comparaison (sans accents, sans chiffres parasites)."""
    if not text_val:
        return ""
    text_val = text_val.lower()
    # Supprime les accents
    text_val = "".join(c for c in unicodedata.normalize('NFD', text_val) if unicodedata.category(c) != 'Mn')
    # Supprime les dates (ex: 25/08, 25.08, 2026)
    text_val = re.sub(r'\d+[\/\.]\d+([\/\.]\d+)?', '', text_val)
    # Supprime les numéros de carte ou identifiants longs
    text_val = re.sub(r'cb\s*\d+|carte\s*n[o°]\s*\d+|\b\d{6,}\b', '', text_val)
    # Nettoie les espaces multiples
    text_val = " ".join(text_val.split())
    return text_val


def check_is_duplicate(conn, user: str, date_str: str, montant: float, label: str) -> bool:
    """
    Vérifie si une transaction similaire existe déjà dans une fenêtre de +/- 3 jours
    avec le même montant exact et un libelle similaire.
    """
    tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    start_window = tx_date - timedelta(days=3)
    end_window = tx_date + timedelta(days=3)
    
    # Récupérer les transactions existantes sur cette période pour cet utilisateur
    query = text("""
        SELECT nom, montant FROM transactions 
        WHERE LOWER(utilisateur) = :u 
        AND date BETWEEN :start AND :end
        AND ABS(montant - :m) < 0.01
    """)
    
    candidates = conn.execute(query, {
        "u": user.lower(),
        "start": start_window,
        "end": end_window,
        "m": montant
    }).fetchall()
    
    if not candidates:
        return False
        
    cleaned_new = clean_text_for_matching(label)
    
    for db_nom, db_montant in candidates:
        cleaned_db = clean_text_for_matching(db_nom)
        # Si l'un des deux noms est contenu dans l'autre ou s'ils sont proches
        if cleaned_new in cleaned_db or cleaned_db in cleaned_new or len(set(cleaned_new.split()) & set(cleaned_db.split())) >= 2:
            return True
            
    return False


# 🟢 FONCTION UTILITAIRE : MAPPING UNIVERSEL POWENS -> KLEEA (NOM, IBAN, NUMÉRO, ID)
def build_powens_account_id_to_kleea_map(powens_accounts: list, config_rows: list) -> dict:
    """
    Associe de manière infaillible l'ID technique Powens (str) au compte Kleea local (str),
    que l'utilisateur ait renseigné le nom Powens, un IBAN, un numéro de compte ou un ID.
    """
    mapping = {}
    for acc in powens_accounts:
        acc_id = str(acc.get("id"))
        acc_name = str(acc.get("name") or "").strip().upper()
        acc_name_compact = acc_name.replace(" ", "")
        acc_iban = str(acc.get("iban") or "").strip().upper().replace(" ", "")
        acc_number = str(acc.get("number") or "").strip().upper().replace(" ", "")

        for row in config_rows:
            local_compte = row[0]
            k_link = str(row[1] or "").strip().upper().replace(" ", "")
            if not k_link:
                continue

            # Correspondance flexible (ID, Nom, IBAN ou Numéro de compte)
            is_match = (
                k_link == acc_id or 
                k_link == acc_name_compact or 
                k_link in acc_name_compact or 
                acc_name_compact in k_link or
                (acc_iban and (k_link == acc_iban or k_link in acc_iban or acc_iban in k_link)) or
                (acc_number and (k_link == acc_number or k_link in acc_number or acc_number in k_link))
            )

            if is_match:
                mapping[acc_id] = local_compte
                break
    return mapping


# 🟢 Helper de conversion stricte en datetime.date pure
def to_pure_date(d_val):
    if not d_val:
        return None
    if isinstance(d_val, datetime):
        return d_val.date()
    if isinstance(d_val, date):
        return d_val
    try:
        return datetime.strptime(str(d_val).split(" ")[0].split("T")[0], "%Y-%m-%d").date()
    except Exception:
        return None


def normalize_acc_name(name: str) -> str:
    if not name: return ""
    return re.sub(r'[\s\-_]+', '', name).upper()


BANQUE_STOP_WORDS = {
    "de", "du", "des", "le", "la", "les", "a", "au", "aux", "en", "un", "une",
    "mme", "mr", "m", "monsieur", "madame", "mlle", "mademoiselle",
    "paiement", "carte", "cb", "fact", "facture", "virement", "vir", "sepa",
    "prlv", "prelevement", "debit", "credit", "retrait", "dab", "gab", "emission",
    "reception", "remise", "cotisation", "frais", "achat", "web", "echeance",
    "operation", "interbancaire", "bancaire", "vers", "pour", "par", "ref", "titre",
    "instantane", "recu", "emis", "motif"
}


def clean_banking_label_py(label: str) -> list:
    if not label:
        return []
    text = label.lower()
    text = ''.join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'\b\d{2}[/.-]\d{2}([/.-]\d{2,4})?\b', ' ', text)
    text = re.sub(r'\b\d{1,2}h\d{2}\b', ' ', text)
    text = re.sub(r'\b[a-z0-9_-]*\d{4,}[a-z0-9_-]*\b', ' ', text)  # Nettoie les BIPT262900...
    text = re.sub(r'[^a-z0-9\s]', ' ', text)
    words = text.split()
    return list(dict.fromkeys([w for w in words if len(w) >= 3 and w not in BANQUE_STOP_WORDS and not w.isdigit()]))


def are_labels_similar_py(label_a: str, label_b: str) -> bool:
    tokens_a = clean_banking_label_py(label_a)
    tokens_b = clean_banking_label_py(label_b)

    if not tokens_a and not tokens_b:
        return True
    if not tokens_a or not tokens_b:
        return False

    set_a = set(tokens_a)
    set_b = set(tokens_b)

    common = set_a.intersection(set_b)
    if not common:
        str_a = "".join(tokens_a)
        str_b = "".join(tokens_b)
        if len(str_a) >= 4 and len(str_b) >= 4 and (str_a in str_b or str_b in str_a):
            return True
        return False

    # Inclusion complète (ex: "Carrefour" dans "Carrefour Market")
    if set_a.issubset(set_b) or set_b.issubset(set_a):
        if any(len(t) >= 4 for t in common):
            return True

    # Calcul de Jaccard (doit être >= 50%)
    union = set_a.union(set_b)
    return (len(common) / len(union)) >= 0.5


def is_duplicate_py(new_tx: dict, existing_tx_list: list, claimed_ids: set) -> bool:
    try:
        new_amount = float(new_tx.get('montant', 0) if new_tx.get('montant') is not None else new_tx.get('m', 0))
    except (ValueError, TypeError):
        return False

    raw_date = str(new_tx.get('date') or new_tx.get('d') or '')[:10]
    try:
        new_date = datetime.strptime(raw_date, '%Y-%m-%d').date()
    except ValueError:
        return False

    new_compte = (new_tx.get('compte') or new_tx.get('co') or "").strip().upper()
    new_nom = new_tx.get('nom') or new_tx.get('n') or ""

    for exist in existing_tx_list:
        exist_id = exist.get('id')
        if exist_id and exist_id in claimed_ids:
            continue

        # 1. Compte
        exist_compte = (exist.get('compte') or "").strip().upper()
        if new_compte and exist_compte and new_compte != exist_compte:
            continue

        # 2. Montant exact et même sens (+ ou -)
        try:
            exist_amount = float(exist.get('montant', 0))
        except (ValueError, TypeError):
            continue

        if abs(abs(new_amount) - abs(exist_amount)) > 0.01:
            continue
        if (new_amount > 0) != (exist_amount > 0):
            continue

        # 3. Écart de date (max 3 jours)
        exist_raw_date = str(exist.get('date', ''))[:10]
        try:
            exist_date = datetime.strptime(exist_raw_date, '%Y-%m-%d').date()
        except ValueError:
            continue

        diff_days = abs((new_date - exist_date).days)
        if diff_days > 3:
            continue

        # 4. Libellé strict via Jaccard
        if are_labels_similar_py(new_nom, exist.get('nom', '')):
            if exist_id:
                claimed_ids.add(exist_id)
            return True

    return False


# Dictionnaire de correspondance : chaque catégorie Powens pointe vers une liste de candidats Kleea par ordre de préférence
POWENS_CATEGORY_MAPPING = {
    # Alimentation & Supermarchés
    "supermarché / hypermarché": ["Alimentation", "Courses"],
    "alimentation": ["Alimentation", "Courses"],
    "boulangerie": ["Alimentation"],
    "restaurant": ["Restaurants", "Alimentation"],
    "restaurants / bars": ["Restaurants", "Alimentation"],
    "restauration rapide": ["Fast Food", "Restaurants", "Alimentation"],

    # Shopping, Bazar & Paiements en ligne (Paypal, Vinted, Normal...)
    "achats en ligne": ["Shopping"],
    "paiement en ligne": ["Shopping", "Autre"],
    "commerce électronique": ["Shopping"],
    "magasins / bazar": ["Shopping", "Alimentation"],
    "hygiène / beauté": ["Shopping", "Pharmacie"],
    "habillement / mode": ["Habillement", "Shopping"],
    "shopping": ["Shopping"],

    # Frais & Forfaits bancaires (Essentiel LBP, Cotisations...)
    "frais bancaires": ["Frais Bancaires"],
    "cotisation bancaire": ["Frais Bancaires"],
    "services bancaires": ["Frais Bancaires"],
    "banque": ["Frais Bancaires"],

    # Carburant & Transports
    "carburant": ["Carburant", "Auto", "Transports"],
    "station-service": ["Carburant", "Auto"],
    "péage": ["Péage", "Auto"],
    "stationnement / parking": ["Auto", "Transports"],
    "transports en commun": ["Transports"],
    "train": ["Transports"],

    # Logement & Factures
    "loyer": ["Loyer", "Logement"],
    "électricité": ["Électricité", "Logement"],
    "gaz": ["Gaz", "Énergie"],
    "eau": ["Eau"],
    "assurance habitation": ["Assurance Habitation"],
    "télécom / internet": ["Internet", "Abonnements"],

    # Virements & Revenus de tiers
    "virements reçus": ["Virement Reçu", "Remboursements"],
    "virement reçu": ["Virement Reçu", "Remboursements"],
    "salaire": ["Salaire"],
    "remboursement": ["Remboursements"]
}


def match_powens_to_user_category(powens_cat_raw: str, user_available_cats: list) -> str:
    # 🟢 Si Powens renvoie son code d'inconnu 9998 ou le texte 'Indéfini', on rejette
    if not powens_cat_raw or powens_cat_raw.lower().strip() in ["indéfini", "indefini", "9998", "none"]:
        return "Autre"

    p_clean = powens_cat_raw.lower().strip()
    user_cats_map = {c.lower().strip(): c for c in user_available_cats}

    # 1. Correspondance exacte
    if p_clean in user_cats_map:
        return user_cats_map[p_clean]

    # 2. Recherche dans le dictionnaire de mapping
    candidates = POWENS_CATEGORY_MAPPING.get(p_clean, [])
    for candidate in candidates:
        if candidate.lower().strip() in user_cats_map:
            return user_cats_map[candidate.lower().strip()]

    # 3. Ressemblance
    for user_cat_clean, real_name in user_cats_map.items():
        if user_cat_clean in p_clean or p_clean in user_cat_clean:
            return real_name

    return "Autre"
