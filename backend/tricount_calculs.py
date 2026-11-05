"""Calcul des équilibres et mise en page des PDF du Tricount, sans accès à la base."""
from fpdf import FPDF


def clean_for_pdf(text_val: str) -> str:
    if not text_val:
        return ""
    # 1. Nettoyage strict des caractères de haute valeur (ord >= 256) comme les émojis
    text_val = "".join(c for c in text_val if ord(c) < 256)
    
    # 2. Remplacement des accents français courants pour éviter les plantages ou caractères corrompus
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'À': 'A', 'Â': 'A', 'Ä': 'A',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'Ù': 'U', 'Û': 'U', 'Ü': 'U',
        'î': 'i', 'ï': 'i',
        'Î': 'I', 'Ï': 'I',
        'ô': 'o', 'ö': 'o',
        'Ô': 'O', 'Ö': 'O',
        'ç': 'c', 'Ç': 'C',
        'œ': 'oe', 'Œ': 'OE'
    }
    for orig, rep in replacements.items():
        text_val = text_val.replace(orig, rep)
        
    try:
        return text_val.encode('latin-1', 'ignore').decode('latin-1')
    except Exception:
        return "".join(c for c in text_val if ord(c) < 128)


def calculer_balances(transactions):
    # 1. On initialise une matrice de dettes croisées
    # dettes[A][B] = ce que A doit à B
    dettes = {}
    participants = set()

    for t in transactions:
        payeur = str(t.get('paye_par') or t.get('paye_par') or '').strip()
        montant_total = float(t.get('montant') or 0)
        if not payeur or payeur == "Système" or montant_total <= 0:
            continue
        
        participants.add(payeur)
        pour_qui_raw = str(t.get('pour_qui') or '')
        parts = [p.strip() for p in pour_qui_raw.split(',') if p.strip()]

        for part in parts:
            if ':' in part:
                benef, montant_part = part.split(':')
                benef = benef.strip()
                participants.add(benef)
                if benef != payeur:
                    # Le bénéficiaire 'benef' doit 'montant_part' au 'payeur'
                    if benef not in dettes: dettes[benef] = {}
                    dettes[benef][payeur] = dettes[benef].get(payeur, 0) + float(montant_part)
            else:
                # Si format simple, on divise
                part_egale = montant_total / len(parts)
                benef = part.strip()
                participants.add(benef)
                if benef != payeur:
                    if benef not in dettes: dettes[benef] = {}
                    dettes[benef][payeur] = dettes[benef].get(payeur, 0) + part_egale

    # 2. Netting Bilatéral (Compensation entre deux personnes)
    # Si A doit 10 à B et B doit 5 à A, alors A doit 5 à B.
    transferts = []
    liste_p = list(participants)
    
    for i in range(len(liste_p)):
        for j in range(i + 1, len(liste_p)):
            p1 = liste_p[i]
            p2 = liste_p[j]
            
            dette_1_vers_2 = dettes.get(p1, {}).get(p2, 0)
            dette_2_vers_1 = dettes.get(p2, {}).get(p1, 0)
            
            if dette_1_vers_2 > dette_2_vers_1:
                diff = round(dette_1_vers_2 - dette_2_vers_1, 2)
                if diff > 0.01:
                    transferts.append({"de": p1, "a": p2, "montant": diff})
            elif dette_2_vers_1 > dette_1_vers_2:
                diff = round(dette_2_vers_1 - dette_1_vers_2, 2)
                if diff > 0.01:
                    transferts.append({"de": p2, "a": p1, "montant": diff})

    return transferts


class StyledPDF(FPDF):
    def header_style(self, title, subtitle):
        # 1. Fond sombre pour le Header (simule le bg du site)
        self.set_fill_color(15, 23, 42)  # Dark Blue #0f172a
        self.rect(0, 0, 210, 50, 'F')
        
        # 2. Ligne de "lumière" Indigo en haut (comme ton interface)
        self.set_fill_color(99, 102, 241) # Indigo-500
        self.rect(0, 0, 210, 2, 'F')
        
        # 3. Titre Principal
        self.set_y(15)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, title.upper(), ln=True, align='C')
        
        # 4. Sous-titre
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139) # Gris-bleu text-slate-400
        self.cell(0, 10, subtitle.upper(), ln=True, align='C')
        self.ln(20)
