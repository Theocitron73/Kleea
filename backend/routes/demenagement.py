"""Simulations, notes et annonces de déménagement."""
import html
import httpx
import json
import re
from fastapi import APIRouter, Depends, HTTPException
from google.genai import types
from imports_bancaires import clean_val_to_float
from journaux import detail_erreur, logger
from schemas import AnnonceModel, DuplicateScenarioRequest, NoteUpdate, ParseTextRequest, ScrapeUrlRequest, SimulationLineCreate
from sqlalchemy import text
from typing import List
from urllib.parse import unquote, urlparse
from base import client, engine, get_current_user


router = APIRouter()


@router.post("/api/simulation-demenagement")
def add_or_update_simulation_line(line: SimulationLineCreate, current_user: str = Depends(get_current_user)):
    clean_username = current_user  # 👈 Token forcé
    
    check_query = text("""
        SELECT id FROM simulations_demenagement 
        WHERE LOWER(utilisateur) = :u AND scenario = :sc AND titre = :t
    """)
    
    with engine.begin() as conn:
        existing_row = conn.execute(check_query, {
            "u": clean_username,
            "sc": line.scenario,
            "t": line.titre
        }).fetchone()
        
        if existing_row:
            existing_id = existing_row[0]
            conn.execute(text("""
                UPDATE simulations_demenagement 
                SET montant = :m, frequence = :freq, categorie = :c, flux_type = :f, cible = :cible
                WHERE id = :id AND LOWER(utilisateur) = :u
            """), {
                "id": existing_id,
                "u": clean_username,
                "m": line.montant,
                "freq": line.frequence,
                "c": line.categorie,
                "f": line.flux_type,
                "cible": line.cible
            })
            return {"id": existing_id, "status": "success"}
        else:
            insert_result = conn.execute(text("""
                INSERT INTO simulations_demenagement (utilisateur, scenario, titre, flux_type, categorie, montant, frequence, cible)
                VALUES (:u, :sc, :t, :f, :c, :m, :freq, :cible)
                RETURNING id
            """), {
                "u": clean_username,
                "sc": line.scenario,
                "t": line.titre,
                "f": line.flux_type,
                "c": line.categorie,
                "m": line.montant,
                "freq": line.frequence,
                "cible": line.cible
            })
            return {"id": insert_result.fetchone()[0], "status": "success"}


# --- 3. DÉMÉNAGEMENT ---
@router.get("/api/simulation-demenagement/{username}")
def get_simulation_demenagement(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("""
        SELECT id, scenario, titre, flux_type, categorie, montant, frequence, cible 
        FROM simulations_demenagement 
        WHERE LOWER(utilisateur) = :u
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"u": current_user})
        columns = result.keys()
        return [dict(zip(columns, row)) for row in result.fetchall()]


# 🟢 2. SIMULATION DÉMÉNAGEMENT
@router.delete("/api/simulation-demenagement/{line_id}")
def delete_simulation_line(line_id: int, current_user: str = Depends(get_current_user)):
    query = text("DELETE FROM simulations_demenagement WHERE id = :id AND LOWER(utilisateur) = :u")
    try:
        with engine.begin() as conn:
            result = conn.execute(query, {"id": line_id, "u": current_user})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Ligne introuvable.")
        return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.delete("/api/simulation-demenagement/{username}/{scenario_name}")
def delete_scenario(username: str, scenario_name: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    decoded_scenario = unquote(scenario_name).strip()
    decoded_scenario = re.sub(r'[\u00a0\u202f\s]+', ' ', decoded_scenario).strip()

    with engine.begin() as conn:
        result = conn.execute(text("""
            DELETE FROM simulations_demenagement 
            WHERE LOWER(utilisateur) = :u 
            AND (TRIM(scenario) = :sc OR REGEXP_REPLACE(scenario, '[\u00a0\\s]+', ' ', 'g') = :sc)
        """), {"u": current_user, "sc": decoded_scenario})
        
        if result.rowcount == 0:
            like_pattern = f"%{decoded_scenario.replace(' ', '%')}%"
            result = conn.execute(text("""
                DELETE FROM simulations_demenagement 
                WHERE LOWER(utilisateur) = :u AND scenario LIKE :sc_like
            """), {"u": current_user, "sc_like": like_pattern})

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Scénario introuvable")
            
    return {"status": "success", "message": f"{result.rowcount} lignes supprimées."}


@router.post("/api/simulation-demenagement/duplicate")
def duplicate_scenario(req: DuplicateScenarioRequest, current_user: str = Depends(get_current_user)):
    old_sc = req.scenario_source.strip()
    new_sc = req.nouveau_scenario.strip()
    
    if not new_sc or not old_sc:
        raise HTTPException(status_code=400, detail="Noms de scénarios invalides.")

    with engine.begin() as conn:
        # Vérifie que le nouveau nom n'existe pas déjà
        check = conn.execute(text("""
            SELECT 1 FROM simulations_demenagement 
            WHERE LOWER(utilisateur) = :u AND scenario = :new_sc LIMIT 1
        """), {"u": current_user, "new_sc": new_sc}).fetchone()
        
        if check:
            raise HTTPException(status_code=400, detail="Un scénario portant ce nom existe déjà.")

        # Clone toutes les lignes du scénario source en 1 seule requête SQL atomique
        conn.execute(text("""
            INSERT INTO simulations_demenagement (utilisateur, scenario, titre, flux_type, categorie, montant, frequence, cible)
            SELECT utilisateur, :new_sc, titre, flux_type, categorie, montant, frequence, cible
            FROM simulations_demenagement
            WHERE LOWER(utilisateur) = :u AND scenario = :old_sc
        """), {"u": current_user, "old_sc": old_sc, "new_sc": new_sc})

        # Renvoie la liste complète mise à jour
        rows = conn.execute(text("""
            SELECT id, scenario, titre, flux_type, categorie, montant, frequence, cible 
            FROM simulations_demenagement 
            WHERE LOWER(utilisateur) = :u
        """), {"u": current_user}).mappings().all()

    return {"status": "success", "new_scenario": new_sc, "data": [dict(r) for r in rows]}


@router.get("/api/notes-demenagement/{username}")
def get_user_notes(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    with engine.begin() as conn:
        res = conn.execute(
            text("SELECT contenu FROM notes_demenagement WHERE LOWER(utilisateur) = :u"),
            {"u": current_user.lower().strip()}
        ).scalar()
        return {"contenu": res if res else ""}


@router.post("/api/notes-demenagement")
def save_user_notes(note: NoteUpdate, current_user: str = Depends(get_current_user)):
    user_clean = current_user.lower().strip()
    with engine.begin() as conn:
        # 🟢 Sauvegarde infaillible sans colonne "mis_a_jour_le" inexistante
        conn.execute(text("""
            INSERT INTO notes_demenagement (utilisateur, contenu)
            VALUES (:u, :c)
            ON CONFLICT (utilisateur) DO UPDATE
            SET contenu = EXCLUDED.contenu
        """), {"u": user_clean, "c": note.contenu})
        
    return {"status": "success"}


# 2. Récupérer toutes les annonces de l'utilisateur
@router.get("/api/demenagement/annonces/{username}")
def get_user_annonces(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    with engine.connect() as conn:
        res = conn.execute(
            text("""
                SELECT id, titre, url, source, loyer, charges, surface, pieces, ville,
                       photos, dossier_envoye, date_dossier, visite_effectuee, date_visite,
                       statut_reponse, notes, favori, created_at
                FROM annonces_logement 
                WHERE LOWER(utilisateur) = :u 
                ORDER BY favori DESC, created_at DESC
            """),
            {"u": current_user.lower().strip()}
        ).mappings().all()

        annonces = []
        for r in res:
            item = dict(r)
            if item.get("photos"):
                try:
                    item["photos"] = json.loads(item["photos"])
                except Exception:
                    item["photos"] = [item["photos"]]
            else:
                item["photos"] = []
            annonces.append(item)
        return annonces


# 3. Créer une nouvelle annonce (Celle qui provoquait le 404 !)
@router.post("/api/demenagement/annonces")
@router.post("/api/demenagement/annonces/")
def add_annonce(a: AnnonceModel, current_user: str = Depends(get_current_user)):
    photos_json = json.dumps(a.photos or [])
    query = text("""
        INSERT INTO annonces_logement (
            utilisateur, titre, url, source, loyer, charges, surface, pieces,
            ville, photos, dossier_envoye, date_dossier, visite_effectuee,
            date_visite, statut_reponse, notes, favori
        ) VALUES (
            :u, :titre, :url, :source, :loyer, :charges, :surface, :pieces,
            :ville, :photos, :dossier, :date_dossier, :visite, :date_visite,
            :statut, :notes, :favori
        ) RETURNING id
    """)
    with engine.begin() as conn:
        res = conn.execute(query, {
            "u": current_user.lower().strip(),
            "titre": a.titre.strip(),
            "url": a.url.strip() if a.url else "",
            "source": a.source or "Autre",
            "loyer": a.loyer or 0.0,
            "charges": a.charges or 0.0,
            "surface": a.surface or 0.0,
            "pieces": a.pieces or 0,
            "ville": a.ville or "",
            "photos": photos_json,
            "dossier": a.dossier_envoye or False,
            "date_dossier": a.date_dossier,
            "visite": a.visite_effectuee or False,
            "date_visite": a.date_visite,
            "statut": a.statut_reponse or "en_attente",
            "notes": a.notes or "",
            "favori": a.favori or False
        })
        new_id = res.fetchone()[0]
    return {"status": "success", "id": new_id}


# 4. Modifier une annonce existante (statuts, notes, favori, etc.)
@router.put("/api/demenagement/annonces/{annonce_id}")
def update_annonce(annonce_id: int, a: AnnonceModel, current_user: str = Depends(get_current_user)):
    photos_json = json.dumps(a.photos or [])
    query = text("""
        UPDATE annonces_logement SET
            titre = :titre, url = :url, source = :source, loyer = :loyer,
            charges = :charges, surface = :surface, pieces = :pieces, ville = :ville,
            photos = :photos, dossier_envoye = :dossier, date_dossier = :date_dossier,
            visite_effectuee = :visite, date_visite = :date_visite,
            statut_reponse = :statut, notes = :notes, favori = :favori
        WHERE id = :id AND LOWER(utilisateur) = :u
    """)
    with engine.begin() as conn:
        res = conn.execute(query, {
            "id": annonce_id,
            "u": current_user.lower().strip(),
            "titre": a.titre.strip(),
            "url": a.url.strip() if a.url else "",
            "source": a.source or "Autre",
            "loyer": a.loyer or 0.0,
            "charges": a.charges or 0.0,
            "surface": a.surface or 0.0,
            "pieces": a.pieces or 0,
            "ville": a.ville or "",
            "photos": photos_json,
            "dossier": a.dossier_envoye or False,
            "date_dossier": a.date_dossier,
            "visite": a.visite_effectuee or False,
            "date_visite": a.date_visite,
            "statut": a.statut_reponse or "en_attente",
            "notes": a.notes or "",
            "favori": a.favori or False
        })
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Annonce introuvable")
    return {"status": "success"}


# 5. Supprimer une annonce
@router.delete("/api/demenagement/annonces/{annonce_id}")
def delete_annonce(annonce_id: int, current_user: str = Depends(get_current_user)):
    with engine.begin() as conn:
        res = conn.execute(
            text("DELETE FROM annonces_logement WHERE id = :id AND LOWER(utilisateur) = :u"),
            {"id": annonce_id, "u": current_user.lower().strip()}
        )
        if res.rowcount == 0:
            raise HTTPException(status_code=404, detail="Annonce introuvable")
    return {"status": "deleted"}


# 1. Route d'analyse de texte / partage via Gemini (100% infaillible même si DataDome bloque le lien)
@router.post("/api/demenagement/parse-text")
async def parse_ad_text(req: ParseTextRequest, current_user: str = Depends(get_current_user)):
    raw_text = req.text.strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Texte vide")

    try:
        prompt = f"""
        Tu es un extracteur d'annonces immobilières. Analyse ce texte et renvoie un JSON strict avec ces champs :
        - titre : titre court et clair (ex: "T2 lumineux avec balcon")
        - loyer : nombre décimal du loyer mensuel charges comprises (ex: 850)
        - charges : montant des charges si mentionné, sinon 0
        - surface : surface en m2 (ex: 45)
        - pieces : nombre de pièces entier (ex: 2)
        - ville : ville et code postal (ex: "Rennes (35)")
        - description : le texte descriptif nettoyé

        Texte :
        \"\"\"{raw_text[:4000]}\"\"\"
        """
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            )
        )
        data = json.loads(response.text)
        return {"success": True, **data}
    except Exception as e:
        logger.warning(f"Analyse de texte par Gemini impossible : {type(e).__name__}")
        # Fallback par Regex en cas de coupure de quota IA
        loyer = 0.0
        m_p = re.search(r'(\d[\d\s\u00a0]{2,6})\s*€', raw_text)
        if m_p: loyer = clean_val_to_float(m_p.group(1))
        
        surface = 0.0
        m_s = re.search(r'(\d+[\.,]?\d*)\s*(?:m²|m2)', raw_text)
        if m_s: surface = clean_val_to_float(m_s.group(1))

        pieces = 0
        m_pc = re.search(r'(\d+)\s*(?:pièces?|pieces?|\bp\b|\bt\b)', raw_text, re.IGNORECASE)
        if m_pc: pieces = int(m_pc.group(1))

        return {
            "success": True,
            "titre": "Logement extrait",
            "loyer": loyer,
            "charges": 0,
            "surface": surface,
            "pieces": pieces,
            "ville": "",
            "description": raw_text[:800]
        }


def extract_valid_photos(html_text: str, source: str) -> List[str]:
    photos = []
    seen = set()

    # 🟢 COUPE STRICTE : On jette tout ce qui se trouve après les sections de recommandations
    cutoff_patterns = [
        r'(?i)ces\s+annonces\s+peuvent\s+vous\s+int[eé]resser',
        r'(?i)annonces\s+similaires',
        r'(?i)vous\s+aimerez\s+aussi',
        r'(?i)autres\s+annonces\s+de',
        r'(?i)recommandations',
        r'(?i)similar[-_]ads',
        r'(?i)data-qa-id=["\']similar[-_]ads["\']'
    ]
    
    html_ad_only = html_text
    for pat in cutoff_patterns:
        parts = re.split(pat, html_ad_only, maxsplit=1)
        if len(parts) > 1:
            html_ad_only = parts[0]
            break

    if source == "Leboncoin":
        pattern = r'https?://img\.leboncoin\.fr/api/v1/lbcpb1/images/[a-f0-9/]+(?:\.jpg|\.webp|\.png)'
        matches = re.findall(pattern, html_ad_only, re.IGNORECASE)
        for m in matches:
            if any(bad in m.lower() for bad in ['avatar', 'user', 'logo', 'icon', 'banner', 'adinsertion']):
                continue
            base_url = m.split('?')[0]
            if base_url not in seen:
                seen.add(base_url)
                photos.append(f"{base_url}?rule=ad-large")

    elif source == "SeLoger":
        pattern = r'https?://(?:sl\.sl-resources\.com|photo\.seloger\.com|v\.seloger\.com)/[^\s"\'\)\>]+(?:\.jpg|\.webp|\.png)'
        for m in re.findall(pattern, html_ad_only, re.IGNORECASE):
            if not any(bad in m.lower() for bad in ['logo', 'icon', 'avatar', 'placeholder']):
                if m not in seen:
                    seen.add(m)
                    photos.append(m)

    elif source == "Bien'ici":
        pattern = r'https?://(?:photos\.bienici\.com|media\.bienici\.com)/[^\s"\'\)\>]+(?:\.jpg|\.webp|\.png)'
        for m in re.findall(pattern, html_ad_only, re.IGNORECASE):
            if m not in seen:
                seen.add(m)
                photos.append(m)

    return photos[:10]


@router.post("/api/demenagement/scrape-listing")
async def scrape_listing(req: ScrapeUrlRequest, current_user: str = Depends(get_current_user)):
    url = req.url.strip()
    if not url.startswith("http"):
        url = "https://" + url

    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    
    source = "Autre"
    if "leboncoin" in domain: source = "Leboncoin"
    elif "seloger" in domain: source = "SeLoger"
    elif "pap.fr" in domain: source = "PAP"
    elif "bienici" in domain: source = "Bien'ici"
    elif "jinka" in domain: source = "Jinka"
    elif "ouestfrance" in domain: source = "OuestFrance"
    elif "logic-immo" in domain: source = "Logic-Immo"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8",
        "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1"
    }

    html_text = ""
    is_blocked = False

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=headers) as c:
            resp = await c.get(url)
            if resp.status_code in (403, 429) or "datadome" in resp.text.lower():
                is_blocked = True
            else:
                html_text = resp.text
    except Exception:
        is_blocked = True

    titre = ""
    description = ""
    loyer = 0.0
    charges = 0.0
    surface = 0.0
    pieces = 0
    ville = ""
    photos = []

    # Fallback si le serveur est sous DataDome
    if is_blocked or not html_text:
        try:
            jina_url = f"https://r.jina.ai/{url}"
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as jina_client:
                j_res = await jina_client.get(jina_url)
                if j_res.status_code == 200:
                    html_text = j_res.text
        except Exception:
            pass

    # Dans scrape_listing :
    # 1. TENTATIVE VIA __NEXT_DATA__ (Leboncoin)
    if "__NEXT_DATA__" in html_text:
        try:
            m_next = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html_text, re.DOTALL)
            if m_next:
                ad = json.loads(m_next.group(1)).get("props", {}).get("pageProps", {}).get("ad", {})
                if ad:
                    titre = ad.get("subject") or titre
                    description = ad.get("body") or description
                    p_val = ad.get("price")
                    loyer = clean_val_to_float(p_val[0] if isinstance(p_val, list) and p_val else p_val)

                    for attr in ad.get("attributes", []):
                        k, v = attr.get("key"), attr.get("value")
                        if k == "square" and v: surface = clean_val_to_float(v)
                        elif k == "rooms" and v: pieces = int(clean_val_to_float(v))
                        elif k in ("charges", "charges_amount") and v: charges = clean_val_to_float(v)

                    loc = ad.get("location", {})
                    if loc.get("city"):
                        ville = f"{loc.get('city')} ({str(loc.get('zipcode', ''))[:2]})" if loc.get("zipcode") else loc.get("city")

                    # 🟢 Récupère STRICTEMENT les photos de CETTE annonce
                    ad_imgs = ad.get("images", {}).get("urls_large") or ad.get("images", {}).get("urls") or []
                    for u in ad_imgs:
                        if u and u not in photos:
                            photos.append(f"{u.split('?')[0]}?rule=ad-large")
        except Exception:
            pass

    # 2. Si aucune photo n'a été trouvée dans __NEXT_DATA__, on utilise le scraper nettoyé (sans annonces similaires)
    if not photos and html_text:
        photos = extract_valid_photos(html_text, source)

    # 3. Fallback JSON-LD
    if not loyer or not surface or not description:
        for ld_raw in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html_text, re.DOTALL):
            try:
                ld_obj = json.loads(ld_raw.strip())
                items = ld_obj if isinstance(ld_obj, list) else [ld_obj]
                for item in items:
                    if not isinstance(item, dict): continue
                    if "@graph" in item and isinstance(item["@graph"], list): items.extend(item["@graph"])

                    titre = titre or item.get("name") or item.get("headline") or ""
                    description = description or item.get("description") or ""

                    if not loyer:
                        offers = item.get("offers")
                        if isinstance(offers, dict): loyer = clean_val_to_float(offers.get("price"))
                        elif isinstance(offers, list) and offers: loyer = clean_val_to_float(offers[0].get("price"))
                        elif item.get("price"): loyer = clean_val_to_float(item.get("price"))

                    if not surface:
                        fs = item.get("floorSize")
                        surface = clean_val_to_float(fs.get("value") if isinstance(fs, dict) else fs)

                    if not pieces:
                        nbr = item.get("numberOfRooms") or item.get("numberOfBedrooms")
                        if nbr: pieces = int(clean_val_to_float(nbr))

                    if not ville and isinstance(item.get("address"), dict):
                        c, zp = item["address"].get("addressLocality"), item["address"].get("postalCode")
                        if c: ville = f"{c} ({str(zp)[:2]})" if zp else c
            except Exception:
                continue

    # 4. Fallback Regex Textuel
    text_corpus = html.unescape(f"{titre}\n{description}\n{html_text[:15000]}")
    if not loyer:
        m_p = re.search(r'(?:loyer|prix|cc)[^\d€]{0,25}(\d[\d\s\u00a0\.,]{2,6})\s*(?:€|euros?)', text_corpus, re.IGNORECASE)
        if not m_p: m_p = re.search(r'(\d[\d\s\u00a0\.,]{2,6})\s*€', text_corpus)
        if m_p: loyer = clean_val_to_float(m_p.group(1))

    if not surface:
        m_s = re.search(r'(\d+[\.,]?\d*)\s*(?:m²|m2|mètres\s*carrés?|m&#178;|m&sup2;)', text_corpus, re.IGNORECASE)
        if m_s: surface = clean_val_to_float(m_s.group(1))

    if not pieces:
        m_pc = re.search(r'(\d+)\s*(?:pièces?|pieces?|\bp\b|\bt\b)', text_corpus, re.IGNORECASE)
        if not m_pc: m_pc = re.search(r'\b(?:T|F|P)\s*(\d)\b', text_corpus, re.IGNORECASE)
        if m_pc: pieces = int(m_pc.group(1))

    if not ville:
        m_ct = re.search(r'\b(\d{5})\s+([A-Za-zÀ-ÿ\-]{3,25})\b', text_corpus)
        if m_ct: ville = f"{m_ct.group(2).capitalize()} ({m_ct.group(1)[:2]})"

    titre = re.sub(r'\s*[\-|–|\|]\s*(?:Leboncoin|SeLoger|PAP|Bien\'ici|Jinka|OuestFrance).*$', '', titre, flags=re.IGNORECASE).strip()
    if description:
        description = re.sub(r'<[^>]+>', '', description)
        description = re.sub(r'\s+', ' ', description).strip()

    return {
        "success": True,
        "titre": titre or f"Logement {source}",
        "description": description[:1200],
        "url": url,
        "source": source,
        "loyer": loyer,
        "charges": charges,
        "surface": surface,
        "pieces": pieces,
        "ville": ville,
        "photos": photos[:10]
    }
