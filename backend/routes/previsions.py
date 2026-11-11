"""Budgets et prévisions."""
import re
import unicodedata
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from journaux import detail_erreur, logger
from schemas import Budget, PrevisionIn, PropagateYearRequest
from sqlalchemy import bindparam, text
from typing import Optional
from base import engine, get_current_user
from routes.regles import appliquer_sans_bloquer
from routes.partage import budgets_partages, cible, ligne_accessible, noter, previsions_partagees, resume


router = APIRouter()


# --- 1. BUDGETS ---
@router.get("/get-budgets/{utilisateur}")
@router.get("/get-budgets/{utilisateur}/{mois}")
def get_budgets(utilisateur: str, mois: Optional[str] = None, current_user: str = Depends(get_current_user)):
    if utilisateur.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    appliquer_sans_bloquer(current_user)

    if mois:
        query = text("""
            SELECT * FROM budgets
            WHERE LOWER(utilisateur) = :u AND mois = :m AND "annee" = :a
        """)
        params = {"u": current_user, "m": mois, "a": date.today().year}
    else:
        query = text("""
            SELECT * FROM budgets
            WHERE LOWER(utilisateur) = :u
            ORDER BY "annee" DESC, mois DESC
        """)
        params = {"u": current_user}

    with engine.connect() as conn:
        res = conn.execute(query, params).mappings().all()
        return [dict(r) for r in res] + budgets_partages(conn, current_user, mois, params.get("a"))


@router.post("/save-budget")
def save_budget(b: Budget, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO budgets (utilisateur, mois, annee, compte, type, nom, somme)
        VALUES (:u, :m, :a, :c, :t, :n, :s)
    """)
    with engine.begin() as conn:
        dest = cible(conn, current_user, b.compte)
        conn.execute(query, {
            "u": dest["utilisateur"],
            "m": b.mois,
            "a": b.annee,
            "c": dest["compte"],
            "t": b.type,
            "n": b.nom,
            "s": b.somme
        })
        noter(conn, dest["partage_id"], current_user, "ajout", f"objectif {b.nom} · {b.somme} €")
    return {"status": "success"}


@router.post("/update-budget")
def update_budget(b: Budget, old_name: str, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE budgets
        SET nom = :new_n, somme = :s, compte = :c, regle_id = NULL
        WHERE nom = :old_n AND LOWER(utilisateur) = :u AND mois = :m AND annee = :a
    """)
    with engine.begin() as conn:
        dest = cible(conn, current_user, b.compte)
        if dest["partage_id"]:
            # Objectif d'un compte partagé : il reste chez le propriétaire, sur ce compte-là.
            query = text(str(query) + " AND compte = :c")
        conn.execute(query, {
            "u": dest["utilisateur"],
            "m": b.mois,
            "a": b.annee,
            "new_n": b.nom,
            "old_n": old_name,
            "s": b.somme,
            "c": dest["compte"]
        })
        noter(conn, dest["partage_id"], current_user, "modification", f"objectif {b.nom} · {b.somme} €")
    return {"status": "success"}


@router.delete("/delete-budget/{nom}/{utilisateur}/{mois}/{annee}")
def delete_budget(nom: str, utilisateur: str, mois: str, annee: int, compte: Optional[str] = None, current_user: str = Depends(get_current_user)):
    if utilisateur.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("""
        DELETE FROM budgets
        WHERE nom = :n AND LOWER(utilisateur) = :u AND mois = :m AND annee = :a
    """)
    with engine.begin() as conn:
        dest = cible(conn, current_user, compte)
        params = {"n": nom, "u": dest["utilisateur"], "m": mois, "a": annee}
        if dest["partage_id"]:
            query = text(str(query) + " AND compte = :c")
            params["c"] = dest["compte"]
        conn.execute(query, params)
        noter(conn, dest["partage_id"], current_user, "suppression", f"objectif {nom}")
    return {"status": "deleted"}


# --- 2. PRÉVISIONS ---
@router.get("/previsions/{utilisateur}/{mois}/{annee}")
def get_previsions_filtrees(utilisateur: str, mois: str, annee: int, current_user: str = Depends(get_current_user)):
    if utilisateur.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    appliquer_sans_bloquer(current_user)

    sql_base = "SELECT id, date, nom, montant, categorie, compte, mois, annee, actif, regle_id FROM previsions WHERE LOWER(utilisateur) = :u AND annee = :a"
    params = {"u": current_user, "a": annee}

    if mois != "ALL":
        sql_base += " AND mois = :m"
        params["m"] = mois

    query = text(sql_base + " ORDER BY date ASC")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, params).fetchall()
            previsions = []
            for row in result:
                r = row._mapping
                est_actif = r["actif"] if r["actif"] is not None else True
                previsions.append({
                    "id": r["id"],
                    "date": r["date"].isoformat() if r["date"] else None,
                    "nom": r["nom"],
                    "montant": float(r["montant"]),
                    "categorie": r["categorie"],
                    "compte": r["compte"],
                    "mois": r["mois"],
                    "annee": int(r["annee"]),
                    "actif": est_actif,
                    "regle_id": r["regle_id"],
                })
            return previsions + previsions_partagees(conn, current_user, annee, mois)
    except Exception as e:
        logger.error(f"Erreur SQL Previsions: {e}")
        return []


@router.get("/previsions/{utilisateur}")
def get_all_user_previsions_periods(utilisateur: str, current_user: str = Depends(get_current_user)):
    query = text("SELECT DISTINCT mois, annee FROM previsions WHERE LOWER(utilisateur) = :u ORDER BY annee DESC")
    with engine.connect() as conn:
        res = conn.execute(query, {"u": current_user}).mappings().all()
        return [dict(r) for r in res]


@router.post("/previsions")
def add_prevision(p: PrevisionIn, current_user: str = Depends(get_current_user)):
    nom_nettoye = re.sub(r'^\[PRÉVI\]\s*|^\[PREVI\]\s*', '', p.nom, flags=re.IGNORECASE)
    nom_final = f"[PRÉVI] {nom_nettoye}"

    query = text("""
        INSERT INTO previsions (date, nom, montant, categorie, compte, mois, annee, utilisateur, actif, auteur)
        VALUES (:d, :n, :m, :c, :compte, :mois, :annee, :u, :actif, :au)
    """)
    try:
        with engine.begin() as conn:
            dest = cible(conn, current_user, p.compte)
            conn.execute(query, {
                "d": p.date,
                "n": nom_final,
                "m": p.montant,
                "c": p.categorie,
                "compte": dest["compte"],
                "mois": p.mois,
                "annee": p.annee,
                "u": dest["utilisateur"],
                "actif": p.actif,
                "au": current_user.lower() if dest["partage_id"] else None,
            })
            noter(conn, dest["partage_id"], current_user, "prevision", f"Ajout : {resume({'nom': nom_final, 'montant': p.montant})}")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": detail_erreur(e)}


# 🟢 COLONNES AUTORISÉES EXCLUSIVEMENT (Anti-Injection SQL)
ALLOWED_PREVISION_FIELDS = {"nom", "montant", "categorie", "compte", "mois", "annee", "date", "actif"}


@router.put("/previsions/{prev_id}")
def update_prevision(prev_id: int, data: dict, current_user: str = Depends(get_current_user)):
    try:
        if not data:
            return {"status": "error", "message": "No data provided"}

        # Nettoyage des champs envoyés
        filtered_data = {}
        for k, v in data.items():
            if k in ALLOWED_PREVISION_FIELDS:
                filtered_data[k] = v

        if not filtered_data:
            raise HTTPException(status_code=400, detail="Aucun champ valide à mettre à jour.")

        # Nettoyage du mois
        if "mois" in filtered_data and filtered_data["mois"]:
            m = str(filtered_data["mois"])
            m = "".join(c for c in unicodedata.normalize('NFD', m) if unicodedata.category(c) != 'Mn')
            filtered_data["mois"] = m.strip().capitalize()

        # Nettoyage du booléen actif
        if "actif" in filtered_data:
            val = filtered_data["actif"]
            if isinstance(val, str):
                filtered_data["actif"] = val.lower() not in ("0", "false")
            else:
                filtered_data["actif"] = val not in (0, False)

        # Construction dynamique sécurisée
        set_clause = ", ".join([f"{k} = :{k}" for k in filtered_data.keys()])

        # 🟢 ANTI-IDOR : la prévision est à l'utilisateur connecté, ou sur un compte partagé avec lui.
        # Une prévision vraiment retouchée à la main se détache de sa règle récurrente : la règle ne l'écrasera plus.
        # Les champs du tableau enregistrent aussi quand rien ne change : cela ne doit pas la détacher.
        change = " OR ".join(f"{k} IS DISTINCT FROM :{k}" for k in filtered_data.keys())
        query = text(f"UPDATE previsions SET {set_clause}, regle_id = CASE WHEN {change} THEN NULL ELSE regle_id END WHERE id = :id AND LOWER(utilisateur) = :u")

        with engine.begin() as conn:
            actuelle = ligne_accessible(conn, current_user, "previsions", prev_id)
            if not actuelle:
                raise HTTPException(status_code=404, detail="Prévision introuvable ou non autorisée.")
            if "compte" in filtered_data:
                dest = cible(conn, current_user, filtered_data["compte"])
                if dest["utilisateur"] != actuelle["utilisateur"].lower():
                    raise HTTPException(status_code=400, detail="Une prévision ne peut pas passer entre un compte partagé et vos propres comptes.")
                filtered_data["compte"] = dest["compte"]
                query = text(f"UPDATE previsions SET {', '.join(f'{k} = :{k}' for k in filtered_data)}, regle_id = CASE WHEN {change} THEN NULL ELSE regle_id END WHERE id = :id AND LOWER(utilisateur) = :u")
            result = conn.execute(query, {**filtered_data, "id": prev_id, "u": actuelle["utilisateur"].lower()})
            if result.rowcount == 0:
                raise HTTPException(status_code=404, detail="Prévision introuvable ou non autorisée.")
            noter(conn, actuelle["_partage_id"], current_user, "prevision", f"Modification : {resume(actuelle)}")

        return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Erreur update_prevision: {str(e)}")
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.delete("/previsions/{prev_id}")
def delete_prevision(prev_id: int, current_user: str = Depends(get_current_user)):
    # 🔒 Sécurité : la prévision est à l'utilisateur connecté, ou sur un compte partagé avec lui.
    query = text("DELETE FROM previsions WHERE id = :id")
    try:
        with engine.begin() as conn:
            actuelle = ligne_accessible(conn, current_user, "previsions", prev_id)
            if actuelle:
                conn.execute(query, {"id": prev_id})
                noter(conn, actuelle["_partage_id"], current_user, "prevision", f"Suppression : {resume(actuelle)}")
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": detail_erreur(e)}


@router.post("/api/previsions/propagate-year")
def propagate_previsions_year(
    req: PropagateYearRequest,
    current_user: str = Depends(get_current_user)
):
    # 1. Validation stricte des IDs
    clean_ids = [int(i) for i in req.ids if isinstance(i, (int, str)) and str(i).isdigit()]
    if not clean_ids:
        raise HTTPException(status_code=400, detail="Aucun identifiant de prévision valide fourni.")

    # 2. Dictionnaires de correspondance
    MONTH_NAME_TO_INT = {
        "janvier": 1, "jan": 1, "jan.": 1,
        "fevrier": 2, "fev": 2, "février": 2, "fév.": 2,
        "mars": 3, "mar": 3, "mar.": 3,
        "avril": 4, "avr": 4, "avr.": 4,
        "mai": 5,
        "juin": 6, "jui": 6, "jui.": 6,
        "juillet": 7, "juil": 7, "juil.": 7,
        "aout": 8, "aout.": 8, "août": 8, "août.": 8,
        "septembre": 9, "sep": 9, "sept": 9, "sept.": 9,
        "octobre": 10, "oct": 10, "oct.": 10,
        "novembre": 11, "nov": 11, "nov.": 11,
        "decembre": 12, "dec": 12, "décembre": 12, "déc.": 12
    }

    MONTH_INT_TO_NAME = [
        "", "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
        "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"
    ]

    def get_last_day_of_month(year: int, month: int) -> int:
        if month == 2:
            is_leap = (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0)
            return 29 if is_leap else 28
        return [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]

    try:
        # L'utilisateur est TOUJOURS celui certifié par le token JWT
        user_clean = current_user.lower().strip()

        # 3. Détection dynamique de la table et des colonnes (sécurisée)
        table_name = "previsions"
        with engine.connect() as conn:
            try:
                conn.execute(text("SELECT 1 FROM previsions LIMIT 1"))
                table_name = "previsions"
            except Exception:
                try:
                    conn.execute(text("SELECT 1 FROM previsionnel LIMIT 1"))
                    table_name = "previsionnel"
                except Exception as e_table:
                    raise HTTPException(
                        status_code=500,
                        detail=detail_erreur(e_table, "Table de prévisions introuvable")
                    )

        column_name = "nom"
        with engine.connect() as conn:
            try:
                conn.execute(text(f"SELECT nom FROM {table_name} LIMIT 1"))
                column_name = "nom"
            except Exception:
                column_name = "libelle"

        year_column = "annee"
        with engine.connect() as conn:
            try:
                conn.execute(text(f"SELECT annee FROM {table_name} LIMIT 1"))
                year_column = "annee"
            except Exception:
                year_column = "annee"

        # 4. Récupération des prévisions sources (Sécurisée via bindparam expanding)
        query_fetch = text(f"""
            SELECT id, date, {column_name} as nom, montant, categorie, compte, actif, utilisateur
            FROM {table_name}
            WHERE id IN :ids AND LOWER(utilisateur) = :u
        """).bindparams(bindparam("ids", expanding=True))

        with engine.connect() as conn:
            res = conn.execute(query_fetch, {
                "ids": clean_ids,          # Liste Python propre (plus de tuple !)
                "u": user_clean
            }).mappings().all()
            previsions_sources = [dict(r) for r in res]

        if not previsions_sources:
            raise HTTPException(
                status_code=404,
                detail="Aucune prévision correspondante trouvée pour cet utilisateur."
            )

        # 5. Résolution du mois de départ
        mois_raw = str(req.mois_actuel).lower().strip()
        mois_normalise = mois_raw.replace('é', 'e').replace('û', 'u').replace('ô', 'o').replace('è', 'e')

        if mois_normalise.isdigit():
            current_month_int = int(mois_normalise)
        else:
            current_month_int = MONTH_NAME_TO_INT.get(mois_normalise)
            if not current_month_int:
                current_month_int = next((v for k, v in MONTH_NAME_TO_INT.items() if k in mois_normalise), None)

        if not current_month_int or not (1 <= current_month_int <= 12):
            raise HTTPException(status_code=400, detail=f"Mois non reconnu : {req.mois_actuel}")

        if current_month_int >= 12:
            return {"status": "success", "inserted_count": 0, "message": "Déjà sur le mois de Décembre."}

        target_year = int(str(req.annee).strip())
        new_rows = []

        # 6. Génération des lignes futures (du mois suivant jusqu'à Décembre)
        for prev in previsions_sources:
            original_date = prev["date"]
            if isinstance(original_date, str):
                dt_orig = date.fromisoformat(original_date.split(" ")[0].split("T")[0])
            elif hasattr(original_date, "day"):
                dt_orig = original_date
            else:
                dt_orig = date.today()

            orig_day = dt_orig.day

            for m_idx in range(current_month_int + 1, 13):
                try:
                    target_date = date(target_year, m_idx, orig_day)
                except ValueError:
                    # Cas où le jour dépasse (ex: 31 sur un mois de 30 jours, ou 29 février)
                    last_day = get_last_day_of_month(target_year, m_idx)
                    target_date = date(target_year, m_idx, last_day)

                target_month_name = MONTH_INT_TO_NAME[m_idx]

                new_rows.append({
                    "d": target_date,
                    "n": prev["nom"],
                    "m": float(prev["montant"]),
                    "cat": prev["categorie"],
                    "c": prev["compte"],
                    "a": prev["actif"] if prev["actif"] is not None else True,
                    "u": user_clean,
                    "mois": target_month_name,
                    "annee": target_year
                })

        if not new_rows:
            return {"status": "success", "inserted_count": 0}

        # 7. Insertion de masse (Bulk Insert) en une seule transaction
        query_insert = text(f"""
            INSERT INTO {table_name} (date, {column_name}, montant, categorie, compte, actif, utilisateur, mois, {year_column})
            VALUES (:d, :n, :m, :cat, :c, :a, :u, :mois, :annee)
            ON CONFLICT DO NOTHING
        """)

        with engine.begin() as conn:
            conn.execute(query_insert, new_rows)

        return {"status": "success", "inserted_count": len(new_rows)}

    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Erreur propagation annuelle : {e}")
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur interne de propagation"))
