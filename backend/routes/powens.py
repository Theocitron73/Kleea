"""Connexion bancaire Powens et synchronisation."""
import asyncio
import hmac
import httpx
import jwt
import os
import requests
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Header
from imports_bancaires import build_powens_account_id_to_kleea_map, is_duplicate_py, match_powens_to_user_category, normalize_acc_name, normalize_powens_transactions, to_pure_date
from journaux import detail_erreur, logger
from schemas import PowensCallback
from sqlalchemy import text
from typing import Optional
from urllib.parse import quote
from base import ALGORITHM, SECRET_KEY, engine, get_current_user
from chiffrement import chiffrer_jeton, dechiffrer_jeton, decrypt_iban
from routes.categories import CATEGORIES_DEFAUT, fetch_memoire_data, get_mots_cles_rules, matches_keyword_boundary


router = APIRouter()


POWENS_CLIENT_ID = os.getenv("POWENS_CLIENT_ID")


POWENS_CLIENT_SECRET = os.getenv("POWENS_CLIENT_SECRET")


POWENS_DOMAIN = os.getenv("POWENS_DOMAIN", "https://kleea-sandbox.biapi.pro/2.0").rstrip("/")


# Nom d'hôte nettoyé uniquement pour le paramètre ?domain= de la Webview
POWENS_DOMAIN_HOST = POWENS_DOMAIN.replace("https://", "").replace("http://", "").split("/")[0]


POWENS_STATE_USAGE = "powens_connect"


POWENS_STATE_MINUTES = 30


def creer_state_powens(current_user: str) -> str:
    """`state` signé : il prouve que le retour de Powens répond à une connexion lancée par ce compte."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=POWENS_STATE_MINUTES)
    return jwt.encode({"sub": current_user, "usage": POWENS_STATE_USAGE, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def verifier_state_powens(state: str, current_user: str):
    try:
        contenu = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Lien de connexion bancaire invalide ou expiré. Relance la connexion.")
    if contenu.get("usage") != POWENS_STATE_USAGE or contenu.get("sub") != current_user:
        raise HTTPException(status_code=400, detail="Lien de connexion bancaire invalide ou expiré. Relance la connexion.")


def jeton_powens_du_compte(current_user: str) -> Optional[str]:
    """Le jeton Powens reste côté serveur : il ne passe jamais par le navigateur ni par une URL."""
    query = text("SELECT powens_token FROM users WHERE LOWER(username) = :u OR LOWER(email) = :u")
    with engine.connect() as conn:
        ligne = conn.execute(query, {"u": current_user}).fetchone()
    return dechiffrer_jeton(ligne[0]) if ligne and ligne[0] else None


@router.get("/powens/connect-url")
def get_connect_url(
    redirect_url: str,
    connection_id: int = None,  # 👈 Permet de cibler la reconnexion d'une banque précise
    current_user: str = Depends(get_current_user),
):
    try:
        encoded_redirect = quote(redirect_url, safe="")
        encoded_state = quote(creer_state_powens(current_user), safe="")

        domain = POWENS_DOMAIN.rstrip('/')
        if not domain.endswith('/2.0') and not domain.endswith('/v2'):
            domain += '/2.0'

        # Si connection_id est fourni, on ouvre le flux de reconnexion directe
        flow = "reconnect" if connection_id else "connect"
        webview_url = (
            f"https://webview.powens.com/fr/{flow}"
            f"?domain={POWENS_DOMAIN_HOST}"
            f"&client_id={POWENS_CLIENT_ID}"
            f"&redirect_uri={encoded_redirect}"
            f"&state={encoded_state}"
        )

        if connection_id:
            webview_url += f"&connection_id={connection_id}"

        user_token = jeton_powens_du_compte(current_user)
        if user_token:
            try:
                code_res = requests.get(
                    f"{domain}/auth/token/code",
                    headers={"Authorization": f"Bearer {user_token}"},
                    timeout=5
                )
                if code_res.status_code == 200:
                    temp_code = code_res.json().get("code")
                    if temp_code:
                        webview_url += f"&code={temp_code}"
            except Exception as inner_err:
                logger.warning(f"⚠️ Avertissement Powens token code: {inner_err}")

        return {"url": webview_url}

    except Exception as e:
        logger.error(f"Erreur génération de l'URL Powens : {e}")
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du lien bancaire.")


@router.post("/powens/callback")
def powens_callback(req: PowensCallback, current_user: str = Depends(get_current_user)):
    """
    Échange le code de la WebView contre un access_token, enregistré sur le compte connecté.
    """
    verifier_state_powens(req.state, current_user)

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'

    payload = {
        "grant_type": "authorization_code",
        "client_id": POWENS_CLIENT_ID,
        "client_secret": POWENS_CLIENT_SECRET,
        "code": req.code
    }
    if req.redirect_uri:
        payload["redirect_uri"] = req.redirect_uri

    res = requests.post(f"{domain}/auth/token/access", json=payload, headers={"Content-Type": "application/json"}, timeout=10)
    if res.status_code != 200:
        logger.error(f"❌ ERREUR POWENS {res.status_code} à l'échange du code")
        raise HTTPException(status_code=502, detail="Powens a refusé la connexion. Relance la connexion bancaire.")

    data = res.json()
    access_token = data.get("access_token") or data.get("token")
    if not access_token:
        raise HTTPException(status_code=502, detail="Réponse inattendue de Powens.")

    with engine.begin() as conn:
        resultat = conn.execute(text("""
            UPDATE users
            SET powens_token = :token
            WHERE LOWER(username) = :u OR LOWER(email) = :u
        """), {"token": chiffrer_jeton(access_token), "u": current_user})
        if resultat.rowcount == 0:
            raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    return {"status": "success"}


@router.get("/powens/accounts")
def get_powens_accounts(current_user: str = Depends(get_current_user)):
    """
    Récupère la liste de tous les comptes bancaires de l'utilisateur.
    """
    user_token = jeton_powens_du_compte(current_user)
    if not user_token:
        return []

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    url = f"{domain}/users/me/accounts"
    headers = {"Authorization": f"Bearer {user_token}"}

    res = requests.get(url, headers=headers, timeout=10)

    if res.status_code != 200:
        # Pas de 401 ici : il déconnecterait l'utilisateur de Kleea pour un jeton bancaire expiré.
        logger.error(f"❌ ERREUR POWENS {res.status_code} à la lecture des comptes")
        raise HTTPException(status_code=502, detail="Impossible de récupérer les comptes bancaires.")

    accounts = res.json().get("accounts", [])
    
    return [
        {
            "id": acc.get("id"),
            "name": acc.get("name"),
            "original_name": acc.get("original_name"),
            "balance": acc.get("balance"),
            "bank_name": acc.get("bank", {}).get("name") if isinstance(acc.get("bank"), dict) else None
        }
        for acc in accounts
    ]


def get_powens_transactions(user_token: str):
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    url = f"{domain}/users/me/transactions"
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # 🟢 CORRECTION 1 : 'category' au singulier uniquement (évite le 400 Bad Request de Powens)
    params = {
        "limit": 1000,
        "expand": "category"
    }

    res = requests.get(url, headers=headers, params=params, timeout=15)
    if res.status_code != 200:
        logger.error(f"Erreur Powens {res.status_code} à la lecture des transactions")
        raise Exception(f"Erreur API Powens ({res.status_code}): {res.text}")

    data = res.json()
    return data.get("transactions", [])


@router.get("/import-powens")
def import_powens(
    account_id: str = None, 
    compte_nom: str = "Powens",
    date_debut: str = None,
    date_fin: str = None,
    current_user: str = Depends(get_current_user)
):
    user_token = jeton_powens_du_compte(current_user)
    if not user_token:
        raise HTTPException(status_code=409, detail="Aucune banque connectée.")

    try:
        user_clean = current_user.lower().strip()
        
        # Nettoyage des dates reçues
        d_deb = None if not date_debut or date_debut in ("null", "undefined", "") else date_debut
        d_fin = None if not date_fin or date_fin in ("null", "undefined", "") else date_fin

        powens_raw = get_powens_transactions(user_token)

        transactions_brutes = normalize_powens_transactions(
            powens_raw,
            user_clean,
            compte_nom,
            target_account_id=account_id,
            date_debut=d_deb,
            date_fin=d_fin
        )

        mots_cles_rules = get_mots_cles_rules(user_clean)
        memoire_rules = fetch_memoire_data(user_clean)

        with engine.connect() as conn:
            cats_res = conn.execute(
                text("SELECT nom FROM categories WHERE LOWER(utilisateur) = :u"),
                {"u": user_clean}
            ).fetchall()
            user_categories = [r[0] for r in cats_res] + CATEGORIES_DEFAUT

        transactions_pretes = []
        
        for t in transactions_brutes:
            nom_t = t.get("nom", "")
            montant_float = float(t.get("montant", 0.0))
            nom_t_lower = nom_t.lower()
            texte_integral_upper = nom_t.upper()
            cat = "Autre"

            # A. Priorité 1 : Vrais virements internes vers vos livrets d'épargne
            types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL", "PEA"]
            type_cible = next((typ for typ in types_epargne if typ in texte_integral_upper), None)
            
            if type_cible and any(k in texte_integral_upper for k in ["VERS ", "VIR", "VIREMENT", "TO "]):
                cat = f"Virement : CCP vers {type_cible}" if montant_float < 0 else f"Virement : {type_cible} vers CCP"
            elif "COMPTE COMMUN" in texte_integral_upper and any(k in texte_integral_upper for k in ["VERS ", "VIR", "VIREMENT"]):
                cat = "Compte Commun"

            # B. Priorité 2 : Mémoire Apprise
            if cat == "Autre":
                nom_t_normalise = " ".join(nom_t_lower.split())
                for m in memoire_rules:
                    nom_memoire_clean = " ".join(m["nom"].lower().split())
                    if nom_memoire_clean in nom_t_normalise:
                        cat = m["categorie"]
                        break

            # C. Priorité 3 : Mots-Clés configurés par l'utilisateur
            if cat == "Autre":
                for rule in mots_cles_rules:
                    matched = False
                    for raw_k in rule["keywords"]:
                        parts = raw_k.split(':')
                        keyword_clean = parts[0].strip().lower()
                        filtre_signe = parts[1].strip().lower() if len(parts) > 1 else "both"

                        if not keyword_clean:
                            continue

                        if matches_keyword_boundary(keyword_clean, nom_t_lower):
                            match_positif = (filtre_signe == "positive" and montant_float > 0)
                            match_negatif = (filtre_signe == "negative" and montant_float < 0)
                            match_deux = (filtre_signe in ["both", "all"])

                            if match_positif or match_negatif or match_deux:
                                matched = True
                                cat = rule["categorie"]
                                break
                    if matched:
                        break

            # D. Priorité 4 : Catégorie native Powens
            if cat == "Autre" and t.get("raw_powens_category"):
                cat = match_powens_to_user_category(t["raw_powens_category"], user_categories)

            # E. Fallback virements tiers (externes)
            if cat == "Autre":
                if any(k in texte_integral_upper for k in ["VERS ", "VIR ", "VIR.", "VIREMENT", "SEPA"]):
                    cat = "Virements Reçus" if montant_float > 0 else "Virements envoyé"

            t["categorie"] = cat
            t.pop("raw_powens_category", None)
            transactions_pretes.append(t)

        # 🟢 CORRECTION 2 : Plus de variable 't' orpheline en dehors de la boucle for
        return transactions_pretes

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Erreur Import Powens : {error_msg}")
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            raise HTTPException(
                status_code=401, 
                detail="Jeton Powens expiré. Veuillez reconnecter votre banque."
            )
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur d'import Powens"))


# 🟢 VERSION SÉCURISÉE : IDENTIFICATION STRICTE PAR ID_CONNECTOR (NE MÉLANGE JAMAIS 2 BANQUES)
@router.get("/powens/connections-and-accounts")
def get_connections_and_accounts(current_user: str = Depends(get_current_user)):
    user_token = jeton_powens_du_compte(current_user)
    if not user_token:
        return {"connections_count": 0, "connections": [], "accounts_count": 0, "accounts": []}

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}

    # 🟢 1. On demande explicitement 'connector' ET 'sources' (où se trouve la vraie expiration DSP2)
    conn_res = requests.get(f"{domain}/users/me/connections?expand=connector,sources", headers=headers)
    connections = conn_res.json().get("connections", []) if conn_res.status_code == 200 else []

    valid_connections = [c for c in connections if not c.get("deleted")]
    valid_connections.sort(key=lambda x: x.get("id", 0), reverse=True)

    now_utc = datetime.now(timezone.utc)
    unique_connections = {}

    for c in valid_connections:
        connector_id = c.get("id_connector") or (c.get("connector", {}).get("id")) or c.get("id")
        conn_name = c.get("connector", {}).get("name") or f"Banque #{connector_id}"

        # 🟢 2. Recherche de la vraie date d'expiration dans la connexion OU dans ses sources
        raw_expire = c.get("expire")
        
        # Si vide sur la connexion, on cherche dans les sources (Open Banking / DirectAccess)
        if not raw_expire:
            sources = c.get("sources") or []
            for s in sources:
                if s.get("expire"):
                    raw_expire = s.get("expire")
                    break

        days_left = None
        expire_date_str = None

        # CAS A : Powens ou la banque a renvoyé la date officielle d'expiration
        if raw_expire:
            try:
                exp_dt = datetime.fromisoformat(str(raw_expire).replace("Z", "+00:00"))
                days_left = (exp_dt.date() - now_utc.date()).days
                expire_date_str = exp_dt.strftime("%Y-%m-%d")
            except Exception:
                pass

        # CAS B : Estimation légale basée sur 'created' (date initiale de connexion, JAMAIS last_update !)
        if days_left is None:
            created_ref = c.get("created")
            if created_ref:
                try:
                    created_dt = datetime.fromisoformat(str(created_ref).replace("Z", "+00:00"))
                    exp_dt = created_dt + timedelta(days=180)
                    days_left = (exp_dt.date() - now_utc.date()).days
                    expire_date_str = exp_dt.strftime("%Y-%m-%d")
                except Exception:
                    pass

        # Sécurité : Si toujours None, on met 180 par précaution
        if days_left is None:
            days_left = 180

        state = c.get("state")
        needs_reconnect = (days_left <= 0) or (state in [
            "SCARequired", "webauthRequired", "decoupled", 
            "actionNeeded", "passwordExpired", "wrongpass"
        ])

        #print(f"🔍 [POWENS DSP2] {conn_name} | Créé le: {c.get('created')} | Expire le: {expire_date_str} | Jours restants: {days_left}")

        if connector_id not in unique_connections:
            unique_connections[connector_id] = {
                "id": c.get("id"),
                "connector_id": connector_id,
                "connector_name": conn_name,
                "state": state,
                "last_update": c.get("last_update"),
                "created": c.get("created"),
                "expire": expire_date_str,
                "days_left": days_left,
                "needs_reconnect": needs_reconnect
            }

    filtered_connections = list(unique_connections.values())
    active_conn_ids = {c["id"] for c in filtered_connections}

    # Récupération des comptes
    acc_res = requests.get(f"{domain}/users/me/accounts", headers=headers)
    accounts = acc_res.json().get("accounts", []) if acc_res.status_code == 200 else []

    filtered_accounts = []
    seen_account_names = set()

    for a in accounts:
        if a.get("deleted") or a.get("disabled"):
            continue

        conn_id = a.get("connection_id") or a.get("id_connection")
        if conn_id not in active_conn_ids:
            continue

        raw_name = a.get("name", "").strip()
        dedup_key = f"{conn_id}_{raw_name.upper()}"
        if dedup_key in seen_account_names:
            continue
        seen_account_names.add(dedup_key)

        filtered_accounts.append({
            "id": a.get("id"),
            "connection_id": conn_id,
            "name": raw_name,
            "balance": a.get("balance"),
            "currency": a.get("currency", {}).get("symbol", "€") if isinstance(a.get("currency"), dict) else "€",
            "bank_name": a.get("company_name") or a.get("connector", {}).get("name")
        })

    return {
        "connections_count": len(filtered_connections),
        "connections": filtered_connections,
        "accounts_count": len(filtered_accounts),
        "accounts": filtered_accounts
    }


@router.get("/powens/connexion-active")
def powens_connexion_active(current_user: str = Depends(get_current_user)):
    return {"connecte": bool(jeton_powens_du_compte(current_user))}


# 🟢 VÉRIFICATION DU STATUT DE SYNCHRONISATION (SÉCURISÉE SANS CONFLIT DE TYPES)
@router.get("/powens/check-sync/{username}")
def check_sync_status(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    user_clean = username.lower().strip()

    # 1. Récupération du Token Powens
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            return {"has_pending": False, "count": 0, "accounts": {}}
        user_token = dechiffrer_jeton(res[0])

        # 2. Configurations Kleea (avec déchiffrement des IBANs)
        query_config = text("SELECT compte, powens_name FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()
        if not config_rows:
            return {"has_pending": False, "count": 0, "accounts": {}}

    decrypted_config_rows = [
        (row[0], decrypt_iban(row[1]) if row[1] else None)
        for row in config_rows
    ]

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}
    try:
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers, timeout=15)
        if res_acc.status_code != 200:
            # Sans ce signalement, un accès expiré ressemblerait à « rien à importer »
            logger.error(f"❌ [CHECK-SYNC] Erreur API Powens : {res_acc.status_code}")
            return {"has_pending": False, "count": 0, "accounts": {}, "error": f"Erreur API Powens ({res_acc.status_code})"}
        powens_accounts = res_acc.json().get("accounts", [])
        powens_txs = get_powens_transactions(user_token)
    except Exception as e:
        logger.error(f"❌ [CHECK-SYNC] Erreur API Powens: {e}")
        return {"has_pending": False, "count": 0, "accounts": {}, "error": "Powens indisponible"}

    acc_id_to_kleea = build_powens_account_id_to_kleea_map(powens_accounts, decrypted_config_rows)

    if not acc_id_to_kleea:
        return {"has_pending": False, "count": 0, "accounts": {}}

    # 3. Récupération des transactions en BDD (converties en date pure)
    with engine.connect() as conn:
        query_existing = text("""
            SELECT date, montant, compte FROM transactions WHERE LOWER(utilisateur) = LOWER(:u)
        """)
        existing_rows = conn.execute(query_existing, {"u": user_clean}).fetchall()

    db_by_acc = {}
    for r in existing_rows:
        if not r[0]: continue
        d_obj = to_pure_date(r[0])
        if not d_obj: continue
        
        m_val = round(float(r[1]), 2)
        c_norm = normalize_acc_name(str(r[2] or ""))
        if c_norm not in db_by_acc:
            db_by_acc[c_norm] = []
        db_by_acc[c_norm].append({"date": d_obj, "montant": m_val, "matched": False})

    # Fenêtre glissante de 60 jours
    now = datetime.now()
    window_limit = (now - timedelta(days=60)).date()

    pending_by_account = {}
    total_pending = 0

    valid_powens_txs = []
    for tx in powens_txs:
        raw_date_str = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0].split("T")[0]
        if not raw_date_str: continue
        
        d_obj = to_pure_date(raw_date_str)
        if not d_obj or d_obj < window_limit:
            continue

        acc_id = (
            tx.get("id_account") or 
            tx.get("account_id") or 
            (tx.get("account", {}).get("id") if isinstance(tx.get("account"), dict) else None)
        )
        if acc_id is None:
            continue

        acc_id_str = str(acc_id).strip()
        local_account = acc_id_to_kleea.get(acc_id_str) or acc_id_to_kleea.get(acc_id)
        if not local_account:
            continue

        montant = round(float(tx.get("value", 0.0)), 2)
        valid_powens_txs.append({
            "date": d_obj,
            "montant": montant,
            "local_account": local_account,
            "acc_norm": normalize_acc_name(local_account)
        })

    # 4. Rapprochement par Réservoir
    for p_tx in valid_powens_txs:
        acc_norm = p_tx["acc_norm"]
        local_acc = p_tx["local_account"]
        p_amount = p_tx["montant"]
        p_date = p_tx["date"]

        found_in_db = False
        candidates = db_by_acc.get(acc_norm, [])

        # A. Correspondance même date et montant
        for db_item in candidates:
            if not db_item["matched"] and abs(db_item["montant"] - p_amount) < 0.005 and db_item["date"] == p_date:
                db_item["matched"] = True
                found_in_db = True
                break

        # B. Correspondance tolérance ±3 jours (sans erreur de type)
        if not found_in_db:
            for db_item in candidates:
                if not db_item["matched"] and abs(db_item["montant"] - p_amount) < 0.005:
                    if abs((db_item["date"] - p_date).days) <= 3:
                        db_item["matched"] = True
                        found_in_db = True
                        break

        # C. Transaction non trouvée en base -> nouvelle transaction en attente
        if not found_in_db:
            total_pending += 1
            raw_tx_date_str = p_date.strftime("%Y-%m-%d")
            
            if local_acc not in pending_by_account:
                pending_by_account[local_acc] = {
                    "count": 0, 
                    "amount": 0.0,
                    "earliest_date": raw_tx_date_str # 👈 Date de la première transaction manquante
                }
            else:
                # On conserve la date la plus ancienne non importée
                if raw_tx_date_str < pending_by_account[local_acc]["earliest_date"]:
                    pending_by_account[local_acc]["earliest_date"] = raw_tx_date_str

            pending_by_account[local_acc]["count"] += 1
            pending_by_account[local_acc]["amount"] = round(pending_by_account[local_acc]["amount"] + abs(p_amount), 2)

    logger.debug(f"[CHECK-SYNC] En attente : {total_pending}")

    return {
        "has_pending": total_pending > 0,
        "count": total_pending,
        "accounts": pending_by_account
    }


# 🟢 FONCTION MÉTIER ATOMIQUE (Appelable par l'API et par les tâches de fond)
def exec_sync_user_transactions(username: str):
    user_clean = username.lower().strip()
    is_test_user = (user_clean == "test")

    # 1. Récupération du token Powens et configuration des comptes
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun compte bancaire Powens lié.")
        user_token = dechiffrer_jeton(res[0])
        
        query_config = text("SELECT compte, powens_name FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()

        cats_res = conn.execute(
            text("SELECT nom FROM categories WHERE LOWER(utilisateur) = :u"),
            {"u": user_clean}
        ).fetchall()
        user_categories = [r[0] for r in cats_res] + CATEGORIES_DEFAUT

    decrypted_config_rows = [
        (row[0], decrypt_iban(row[1]) if row[1] else None)
        for row in config_rows
    ]

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'
        
    headers = {"Authorization": f"Bearer {user_token}"}
    
    try:
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers, timeout=10)
        powens_accounts = res_acc.json().get("accounts", []) if res_acc.status_code == 200 else []
        powens_raw = get_powens_transactions(user_token)
    except Exception as err:
        raise HTTPException(status_code=500, detail=detail_erreur(err, "Erreur API Powens"))

    acc_id_to_kleea = build_powens_account_id_to_kleea_map(powens_accounts, decrypted_config_rows)
    if not acc_id_to_kleea:
        return {"status": "success", "added": 0, "message": "Aucun compte configuré avec un lien Powens."}

    # Tables d'IBANs et numéros de comptes
    iban_to_local_name = {}
    number_to_local_name = {}
    for acc in powens_accounts:
        acc_id = str(acc.get("id"))
        local_name = acc_id_to_kleea.get(acc_id)
        if local_name:
            iban = str(acc.get("iban") or "").strip().upper().replace(" ", "")
            number = str(acc.get("number") or "").strip().upper().replace(" ", "")
            if iban: iban_to_local_name[iban] = local_name
            if number: number_to_local_name[number] = local_name

    mots_cles_rules = get_mots_cles_rules(user_clean)
    memoire_rules = fetch_memoire_data(user_clean)
    mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    batch_occurrence_tracker = {}

    now = datetime.now()
    window_limit = (now - timedelta(days=90)).strftime("%Y-%m-%d")

    transactions_to_save = []

    for tx in powens_raw:
        try:
            raw_date = str(tx.get("date") or tx.get("rdate") or "").split(" ")[0]
            if not raw_date or raw_date < window_limit:
                continue

            tx_account_id = str(tx.get("id_account")) if tx.get("id_account") is not None else None
            local_account_name = acc_id_to_kleea.get(tx_account_id)
            if not local_account_name:
                continue
                
            montant = float(tx.get("value", 0.0))
            libelle_brut = (tx.get("simplified_wording") or tx.get("wording") or tx.get("raw_wording") or "Transaction").strip()
            base_nom = f"[TEST] {libelle_brut}" if is_test_user else libelle_brut
            
            tracker_key = (raw_date, round(montant, 2), base_nom.upper(), local_account_name.upper())
            occurrence_in_batch = batch_occurrence_tracker.get(tracker_key, 0) + 1
            batch_occurrence_tracker[tracker_key] = occurrence_in_batch
            
            nom_final = base_nom if occurrence_in_batch == 1 else f"{base_nom} #{occurrence_in_batch}"

            # --- DÉTERMINATION DE LA CATÉGORIE ---
            cat = "Autre"
            libelle_lower = libelle_brut.lower()
            libelle_compact = libelle_brut.upper().replace(" ", "")
            autre_compte_local = None

            for target_iban, local_name in iban_to_local_name.items():
                if local_name.upper() != local_account_name.upper() and target_iban in libelle_compact:
                    autre_compte_local = local_name
                    break
            
            if not autre_compte_local:
                for target_number, local_name in number_to_local_name.items():
                    if local_name.upper() != local_account_name.upper() and target_number in libelle_compact:
                        autre_compte_local = local_name
                        break

            if not autre_compte_local:
                for c_name, p_link in decrypted_config_rows:
                    if not p_link or c_name.upper() == local_account_name.upper():
                        continue
                    p_link_compact = p_link.replace(" ", "").upper()
                    if p_link_compact and p_link_compact in libelle_compact:
                        autre_compte_local = c_name
                        break

            if not autre_compte_local and any(k in libelle_brut.upper() for k in ["VERS ", "VIR ", "VIREMENT", "TO "]):
                types_epargne = ["LIVRET A", "LEP", "LDDS", "PEL"]
                type_cible = next((typ for typ in types_epargne if typ in libelle_brut.upper()), None)
                if type_cible: 
                    autre_compte_local = type_cible

            if autre_compte_local:
                cat = f"Virement : {local_account_name} vers {autre_compte_local}" if montant < 0 else f"Virement : {autre_compte_local} vers {local_account_name}"

            if cat == "Autre":
                for m in memoire_rules:
                    if m["nom"].lower() in libelle_lower:
                        cat = m["categorie"]
                        break
                        
            if cat == "Autre":
                for rule in mots_cles_rules:
                    for raw_k in rule["keywords"]:
                        parts = raw_k.split(':')
                        keyword = parts[0].strip().lower()
                        signe = parts[1].strip().lower() if len(parts) > 1 else "both"
                        if matches_keyword_boundary(keyword, libelle_lower):
                            if (signe == "positive" and montant > 0) or (signe == "negative" and montant < 0) or (signe in ["both", "all"]):
                                cat = rule["categorie"]
                                break

            if cat == "Autre":
                cat_obj = tx.get("category")
                powens_cat_name = None
                if isinstance(cat_obj, dict):
                    powens_cat_name = cat_obj.get("name")
                elif isinstance(cat_obj, str):
                    powens_cat_name = cat_obj

                if powens_cat_name:
                    cat = match_powens_to_user_category(powens_cat_name, user_categories)

            if cat == "Autre":
                is_transfer = (tx.get("type") == "transfer") or any(k in libelle_brut.upper() for k in ["VERS ", "VIR ", "VIREMENT", "TO "])
                if is_transfer:
                    cat = "Virements Reçus" if montant > 0 else "Virements envoyé"

            dt = datetime.strptime(raw_date, "%Y-%m-%d")

            transactions_to_save.append({
                "d": raw_date,
                "n": nom_final,
                "m": montant,
                "c": cat,
                "u": user_clean,
                "mo": mois_fr[dt.month - 1],
                "a": dt.year,
                "co": local_account_name
            })

        except Exception as parse_err:
            logger.warning(f"Ligne Powens ignorée : {type(parse_err).__name__}")
            continue

    # =========================================================================
    # 🟢 DÉDOUBLONNAGE INTELLIGENT AVANT INSERTION EN BASE DE DONNÉES
    # =========================================================================
    success_count = 0

    # 1. On charge l'historique récent de l'utilisateur (issu du CSV ou de précédents imports)
    query_existing = text("""
        SELECT id, date, montant, nom, compte FROM transactions 
        WHERE LOWER(utilisateur) = :u AND date >= :limit_date
        UNION ALL
        SELECT id, date, montant, nom, compte FROM split_sources 
        WHERE LOWER(utilisateur) = :u AND date >= :limit_date
    """)

    insert_query = text("""
        INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte)
        VALUES (:d, :n, :m, :c, :u, :mo, :a, :co)
        ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING
        RETURNING id
    """)

    with engine.begin() as conn:
        existing_rows = conn.execute(query_existing, {
            "u": user_clean,
            "limit_date": window_limit
        }).mappings().all()

        existing_db_list = [dict(r) for r in existing_rows]
        claimed_ids = set()

        for tx_data in transactions_to_save:
            tx_check_dict = {
                "date": tx_data["d"],
                "montant": tx_data["m"],
                "nom": tx_data["n"],
                "compte": tx_data["co"]
            }

            # 🟢 Si la transaction existe déjà (via CSV avec un libellé différent ou un décalage de date), ON L'IGNORE !
            if is_duplicate_py(tx_check_dict, existing_db_list, claimed_ids):
                continue

            res_insert = conn.execute(insert_query, tx_data)
            if res_insert.fetchone():
                success_count += 1
                # On ajoute aussi cette ligne dans existing_db_list pour éviter les doublons au sein du même lot
                existing_db_list.append(tx_check_dict)
            
    logger.info(f"✅ Synchronisation terminée: {success_count} transaction(s) importée(s).")
    return {"status": "success", "added": success_count}


# 🟢 ROUTE API SÉCURISÉE AVEC JWT (Sans paramètre inutilisé)
@router.post("/powens/sync-user/{username}")
def sync_user_transactions(
    username: str, 
    current_user: str = Depends(get_current_user)
):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return exec_sync_user_transactions(username)


# 🟢 LOGIQUE DE CALCUL DU SOLDE INITIAL
def exec_recalculate_balances(user_clean: str):
    user_clean = user_clean.lower().strip()

    # 1. Récupération du token Powens et de la configuration Kleea
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun jeton bancaire trouvé.")
        user_token = dechiffrer_jeton(res[0])

        query_config = text("SELECT compte, powens_name, solde FROM configuration WHERE LOWER(utilisateur) = LOWER(:u)")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()
        if not config_rows:
            return {"status": "success", "updated_balances": []}

    # 2. Déchiffrement des liens IBAN
    decrypted_config_rows = [
        (row[0], decrypt_iban(row[1]) if row[1] else None, float(row[2] or 0.0))
        for row in config_rows
    ]

    # 3. Récupération des comptes bancaires réels Powens
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    try:
        headers = {"Authorization": f"Bearer {user_token}"}
        res_acc = requests.get(f"{domain}/users/me/accounts", headers=headers, timeout=10)
        powens_accounts = res_acc.json().get("accounts", []) if res_acc.status_code == 200 else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur Powens"))

    # 4. Association infaillible Powens <-> Kleea
    acc_id_to_kleea = build_powens_account_id_to_kleea_map(powens_accounts, decrypted_config_rows)
    if not acc_id_to_kleea:
        return {"status": "success", "updated_balances": [], "message": "Aucun compte associé à recalibrer."}

    updates = []
    with engine.begin() as conn:
        for acc in powens_accounts:
            acc_id = str(acc.get("id"))
            local_account_name = acc_id_to_kleea.get(acc_id)
            if not local_account_name:
                continue

            real_balance = float(acc.get("balance", 0.0))

            # Somme exacte des transactions enregistrées sur ce compte Kleea
            query_sum = text("""
                SELECT COALESCE(SUM(montant), 0) FROM transactions 
                WHERE LOWER(utilisateur) = LOWER(:u) 
                  AND TRIM(UPPER(compte)) = TRIM(UPPER(:co))
            """)
            total_transactions = conn.execute(query_sum, {
                "u": user_clean, 
                "co": local_account_name
            }).scalar() or 0.0

            # Solde initial requis pour que : solde_initial + sum(transactions) == real_balance
            new_initial_balance = round(real_balance - float(total_transactions), 2)

            query_update = text("""
                UPDATE configuration 
                SET solde = :new_solde 
                WHERE LOWER(utilisateur) = LOWER(:u) 
                  AND TRIM(UPPER(compte)) = TRIM(UPPER(:co))
            """)
            conn.execute(query_update, {
                "new_solde": new_initial_balance, 
                "u": user_clean, 
                "co": local_account_name
            })

            updates.append({
                "compte": local_account_name, 
                "solde_initial": new_initial_balance, 
                "solde_reel": real_balance,
                "somme_transactions": total_transactions
            })
            
    return {"status": "success", "updated_balances": updates}


# 🟢 ROUTE API SÉCURISÉE AVEC JWT
@router.post("/powens/recalculate-balances/{username}")
def recalculate_initial_balances(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    return exec_recalculate_balances(current_user)


# Route de synchronisation globale de maintenance (exécutée par un cron externe)
def verifier_cle_maintenance(cle_recue: Optional[str]):
    """Refuse tout tant qu'aucune clé n'est configurée : une clé absente ne doit jamais ouvrir la route."""
    attendue = os.getenv("MAINTENANCE_API_KEY")
    if not attendue or not cle_recue or not hmac.compare_digest(cle_recue.encode(), attendue.encode()):
        raise HTTPException(status_code=401, detail="Non autorisé")


@router.post("/maintenance/sync-all")
def sync_all_users_background(
    auth_key: Optional[str] = None,
    x_maintenance_key: Optional[str] = Header(default=None),
):
    # L'en-tête est à préférer : une clé dans l'URL finit dans les logs.
    verifier_cle_maintenance(x_maintenance_key or auth_key)
        
    query = text("SELECT username FROM users WHERE powens_token IS NOT NULL AND import_mode = 'auto'")
    synced_users = []
    with engine.connect() as conn:
        users = conn.execute(query).fetchall()
        for u in users:
            try:
                # Appel direct des fonctions métiers
                exec_sync_user_transactions(u[0])
                exec_recalculate_balances(u[0])
                synced_users.append(u[0])
            except Exception as e:
                logger.error(f"❌ Échec synchro cron pour {u[0]}: {str(e)}")
                
    return {"status": "success", "synchronized_users": synced_users}


@router.post("/powens/clean-duplicates/{username}")
def clean_powens_duplicates(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    """
    Supprime les connexions en doublon pour une MÊME banque,
    sans jamais toucher aux autres banques.
    """
    user_clean = username.lower().strip()

    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun token Powens.")
        user_token = dechiffrer_jeton(res[0])

    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}

    # 🟢 Récupération avec expand
    res_conn = requests.get(f"{domain}/users/me/connections?expand=connector", headers=headers)
    connections = res_conn.json().get("connections", []) if res_conn.status_code == 200 else []
    
    by_connector = {}
    for c in connections:
        # Groupement strict par ID de connecteur
        connector_id = c.get("id_connector") or (c.get("connector", {}).get("id"))
        if connector_id not in by_connector:
            by_connector[connector_id] = []
        by_connector[connector_id].append(c)

    deleted_ids = []
    kept_ids = []

    for connector_id, conn_list in by_connector.items():
        conn_list.sort(key=lambda x: x.get("id", 0), reverse=True)
        
        kept = conn_list[0]
        bank_label = kept.get("connector", {}).get("name") or f"Banque #{connector_id}"
        kept_ids.append({"id": kept.get("id"), "bank": bank_label})

        # Supprime uniquement les doublons d'une même banque
        for old in conn_list[1:]:
            old_id = old.get("id")
            del_res = requests.delete(f"{domain}/users/me/connections/{old_id}", headers=headers)
            if del_res.status_code in [200, 204]:
                deleted_ids.append({"id": old_id, "bank": bank_label})

    return {
        "status": "success",
        "deleted_connections": deleted_ids,
        "kept_connections": kept_ids
    }


# 🟢 SUPPRESSION TOTALE DU COMPTE ET DES CONNEXIONS CHEZ POWENS + NETTOYAGE BDD
@router.delete("/powens/disconnect/{username}")
def disconnect_powens(username: str, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité JWT
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    user_clean = current_user
    
    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        user_token = dechiffrer_jeton(res[0]) if res else None

    # 1. Suppression définitive chez Powens via l'API (DELETE /users/me)
    if user_token:
        try:
            domain = POWENS_DOMAIN.rstrip('/')
            if not domain.endswith('/2.0') and not domain.endswith('/v2'):
                domain += '/2.0'
            elif domain.endswith('/v2'):
                domain = domain[:-3] + '/2.0'
                
            headers = {"Authorization": f"Bearer {user_token}"}
            del_res = requests.delete(f"{domain}/users/me", headers=headers)
            logger.info(f"🗑️ [POWENS PURGE USER] Réponse Powens: {del_res.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ Erreur lors de la suppression chez Powens: {e}")

    # 2. Nettoyage de la base de données locale Kleea
    with engine.connect() as conn:
        conn.execute(text("UPDATE users SET powens_token = NULL WHERE LOWER(username) = LOWER(:u)"), {"u": user_clean})
        conn.execute(text("UPDATE configuration SET powens_name = NULL WHERE LOWER(utilisateur) = LOWER(:u)"), {"u": user_clean})
        conn.commit()

    return {"status": "success", "message": "Accès bancaire Powens et identifiant supprimés avec succès."}


@router.post("/powens/reconcile-and-recalculate/{username}")
def reconcile_and_recalculate_all(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    """
    Déclenché lors de l'ajout ou la modification d'un compte :
    1. Re-scanne les transactions pour lier les virements miroirs avec le nouveau compte.
    2. Re-scanne les IBANs des comptes d'épargne.
    3. Recalcule automatiquement les soldes initiaux de tous les comptes.
    """
    user_clean = username.lower().strip()

    with engine.begin() as conn:
        # 1. Récupérer tous les comptes de l'utilisateur
        query_config = text("SELECT compte, powens_name, groupe FROM configuration WHERE LOWER(utilisateur) = :u")
        config_rows = conn.execute(query_config, {"u": user_clean}).fetchall()
        
        if not config_rows:
            return {"status": "success", "message": "Aucun compte configuré."}

        decrypted_config = [
            (row[0], decrypt_iban(row[1]) if row[1] else None, row[2])
            for row in config_rows
        ]

        # 2. Récupérer toutes les transactions de l'utilisateur
        query_tx = text("""
            SELECT id, date, montant, nom, compte, categorie 
            FROM transactions 
            WHERE LOWER(utilisateur) = :u
            ORDER BY date ASC, id ASC
        """)
        all_txs = [dict(r) for r in conn.execute(query_tx, {"u": user_clean}).mappings().all()]

        updates_to_make = []

        # A. Réconciliation par Paire Miroir Débit/Crédit (+/- montant sous 48h)
        debits = [t for t in all_txs if float(t["montant"]) < 0]
        credits = [t for t in all_txs if float(t["montant"]) > 0]
        matched_credit_ids = set()

        for d in debits:
            d_montant = abs(float(d["montant"]))
            d_date = datetime.strptime(str(d["date"]).split(" ")[0], "%Y-%m-%d")
            d_compte = d["compte"]

            for c in credits:
                if c["id"] in matched_credit_ids:
                    continue
                if c["compte"].strip().upper() == d_compte.strip().upper():
                    continue

                c_montant = float(c["montant"])
                if abs(d_montant - c_montant) < 0.01:
                    c_date = datetime.strptime(str(c["date"]).split(" ")[0], "%Y-%m-%d")
                    if abs((d_date - c_date).days) <= 2:
                        matched_credit_ids.add(c["id"])
                        cat_nom = f"Virement : {d_compte} vers {c['compte']}"
                        updates_to_make.append((cat_nom, d["id"]))
                        updates_to_make.append((cat_nom, c["id"]))
                        break

        # B. Réconciliation par IBAN déchiffré (pour les livrets non connectés à Powens)
        for (compte_nom, iban_dechiffre, _) in decrypted_config:
            if not iban_dechiffre:
                continue
            iban_clean = iban_dechiffre.replace(" ", "").upper()
            if len(iban_clean) < 6:
                continue

            for t in all_txs:
                if t["compte"].strip().upper() == compte_nom.strip().upper():
                    continue
                nom_compact = (t["nom"] or "").upper().replace(" ", "")
                if iban_clean in nom_compact:
                    montant = float(t["montant"])
                    cat_nom = f"Virement : {t['compte']} vers {compte_nom}" if montant < 0 else f"Virement : {compte_nom} vers {t['compte']}"
                    updates_to_make.append((cat_nom, t["id"]))

        # Application des nouvelles catégories en base
        for cat_nom, tx_id in updates_to_make:
            conn.execute(
                text("UPDATE transactions SET categorie = :cat WHERE id = :id"),
                {"cat": cat_nom, "id": tx_id}
            )

    # 3. Recalcul automatique des soldes initiaux
    try:
        exec_recalculate_balances(user_clean)
    except Exception as e:
        logger.warning(f"⚠️ Recalcul des soldes : {e}")

    return {
        "status": "success",
        "updated_transfers": len(updates_to_make),
        "message": "Virements internes et soldes initiaux synchronisés avec succès."
    }


async def declencher_actualisation_bancaire(user_token: str) -> dict:
    """Demande à Powens d'interroger chaque banque connectée, comme si l'utilisateur était présent."""
    domain = POWENS_DOMAIN.rstrip('/')
    if not domain.endswith('/2.0') and not domain.endswith('/v2'):
        domain += '/2.0'
    elif domain.endswith('/v2'):
        domain = domain[:-3] + '/2.0'

    headers = {"Authorization": f"Bearer {user_token}"}

    async with httpx.AsyncClient(timeout=15.0) as client:
        # 1. Récupération des connexions
        try:
            res_conn = await client.get(f"{domain}/users/me/connections", headers=headers)
            connections = res_conn.json().get("connections", []) if res_conn.status_code == 200 else []
        except Exception as e:
            logger.error(f"❌ Powens injoignable à la lecture des connexions : {type(e).__name__}")
            raise HTTPException(status_code=502, detail="Impossible de contacter Powens.")

        if not connections:
            return {"status": "no_connections", "message": "Aucune banque connectée.", "synced_connections": []}

        # 2. Actualisation parallèle de toutes les connexions
        async def trigger_connection_sync(conn_id):
            try:
                r = await client.put(
                    f"{domain}/users/me/connections/{conn_id}",
                    headers=headers,
                    params={"psu_requested": "true"}
                )
                return {"id": conn_id, "status": r.status_code}
            except Exception as e:
                logger.error(f"❌ Actualisation Powens de la connexion {conn_id} : {type(e).__name__}")
                return {"id": conn_id, "status": "error"}

        active_connection_ids = [
            c["id"] for c in connections if c.get("id") and not c.get("deleted")
        ]

        # Lance tous les appels simultanément
        synced = await asyncio.gather(*[trigger_connection_sync(cid) for cid in active_connection_ids])

    return {"status": "success", "synced_connections": synced}


@router.post("/powens/refresh-bank-sync/{username}")
async def refresh_bank_sync(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    user_clean = current_user.lower().strip()

    query_token = text("SELECT powens_token FROM users WHERE LOWER(username) = LOWER(:u)")
    with engine.connect() as conn:
        res = conn.execute(query_token, {"u": user_clean}).fetchone()
        if not res or not res[0]:
            raise HTTPException(status_code=400, detail="Aucun jeton bancaire Powens trouvé.")
        user_token = dechiffrer_jeton(res[0])

    return await declencher_actualisation_bancaire(user_token)
