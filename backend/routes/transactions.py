"""Transactions de l'utilisateur."""
import pandas as pd
import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from imports_bancaires import is_duplicate_py
from journaux import detail_erreur, logger
from schemas import SplitRequest, Transaction
from sqlalchemy import bindparam, text
from typing import List, Optional
from base import engine, get_current_user
from routes.partage import cible, comptes_partages_avec, ids_accessibles, ligne_accessible, noter, operations_partagees, resume


router = APIRouter()


# Accepte /transactions ET /transactions/theo pour ne rien casser dans le frontend
@router.get("/transactions")
@router.get("/transactions/{username}")
def get_transactions(username: Optional[str] = None, current_user: str = Depends(get_current_user)):
    u_cible = current_user

    # 🟢 AJOUT DE 'split_id' DANS LE SELECT :
    query = text("""
        SELECT id, date, nom, montant, categorie, utilisateur, mois, annee, compte, enveloppe, prevision_id, split_id, auteur
        FROM transactions
        WHERE LOWER(utilisateur) = :u
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": u_cible})
            columns = result.keys()
            records = [dict(zip(columns, row)) for row in result.fetchall()]
            # Les comptes qu'on partage avec moi, sous leur nom de compte partagé.
            records += operations_partagees(conn, current_user)
            for record in records:
                if record.get('date') and not isinstance(record['date'], str):
                    record['date'] = record['date'].strftime('%Y-%m-%d')
            return records
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur Base de données"))


@router.post("/transactions")
def add_transaction(t: Transaction, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte, auteur)
        VALUES (:d, :n, :m, :c, :u, :mo, :a, :co, :au)
        ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING
        RETURNING id
    """)
    try:
        with engine.begin() as conn:
            # Sur un compte partagé, la ligne s'écrit chez son propriétaire, signée par son auteur.
            dest = cible(conn, current_user, t.compte)
            result = conn.execute(query, {
                "n": t.nom,
                "m": t.montant,
                "c": t.categorie,
                "u": dest["utilisateur"],
                "mo": t.mois,
                "a": t.annee,
                "co": dest["compte"],
                "d": t.date,
                "au": current_user.lower() if dest["partage_id"] else None,
            })
            row = result.fetchone()
            if row:
                noter(conn, dest["partage_id"], current_user, "ajout", resume(t.dict()))
                return {**t.dict(), "id": row[0], "status": "success"}
            return {**t.dict(), "status": "ignored", "message": "Doublon détecté"}
    except Exception as e:
        logger.error(f"Erreur SQL: {e}")
        return {"status": "error", "message": detail_erreur(e)}


@router.put("/transactions/{t_id}")
def update_transaction(t_id: int, t: Transaction, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE transactions
        SET nom=:n, montant=:m, categorie=:c, mois=:mo, annee=:a, compte=:co, enveloppe=:env, prevision_id=:prev_id, auteur=:au
        WHERE id=:id AND LOWER(utilisateur) = :u
    """)
    with engine.begin() as conn:
        actuelle = ligne_accessible(conn, current_user, "transactions", t_id)
        if not actuelle:
            raise HTTPException(status_code=404, detail="Transaction introuvable ou non autorisée")
        dest = cible(conn, current_user, t.compte)
        proprietaire = actuelle["utilisateur"].lower()
        # Une opération ne passe jamais d'un compte partagé à un compte privé, ni l'inverse.
        if dest["utilisateur"] != proprietaire:
            raise HTTPException(status_code=400, detail="Une opération ne peut pas passer entre un compte partagé et vos propres comptes.")
        partage_id = actuelle["_partage_id"] or dest["partage_id"]
        result = conn.execute(query, {
            "n": t.nom, "m": t.montant, "c": t.categorie,
            "mo": t.mois, "a": t.annee, "co": dest["compte"],
            "env": t.enveloppe,
            "prev_id": t.prevision_id,
            "id": t_id,
            "u": proprietaire,
            "au": current_user.lower() if partage_id else actuelle.get("auteur"),
        })
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transaction introuvable ou non autorisée")
        noter(conn, partage_id, current_user, "modification", resume(t.dict()))
    return {"status": "success"}


@router.delete("/transactions/batch")
def delete_transactions(ids: List[int], current_user: str = Depends(get_current_user)):
    """Supprime plusieurs transactions par leurs IDs en vérifiant le propriétaire"""
    if not ids:
        return {"status": "error", "message": "Aucun ID fourni"}

    # Validation stricte que tous les éléments sont bien des entiers
    clean_ids = [int(i) for i in ids if isinstance(i, (int, str)) and str(i).isdigit()]
    if not clean_ids:
        return {"status": "error", "message": "Identifiants invalides"}

    # expanding=True génère dynamiquement le nombre exact de paramètres bindés
    # Seules les lignes à soi, ou celles d'un compte partagé avec soi, peuvent partir.
    query = text("DELETE FROM transactions WHERE id IN :id_list").bindparams(bindparam("id_list", expanding=True))

    try:
        with engine.begin() as conn:
            acces = ids_accessibles(conn, current_user, "transactions", clean_ids)
            if not acces:
                return {"status": "success", "deleted_count": 0}
            result = conn.execute(query, {"id_list": list(acces)})
            for partage_id, ligne in acces.values():
                noter(conn, partage_id, current_user, "suppression", resume(ligne))
        return {"status": "success", "deleted_count": result.rowcount}
    except Exception as e:
        logger.error(f"Erreur SQL suppression: {e}")
        raise HTTPException(status_code=500, detail=detail_erreur(e))


@router.get("/transactions/stats/count/{username}")
def get_user_transactions_count(username: str, current_user: str = Depends(get_current_user)):
    """Renvoie le nombre total de transactions du compte connecté"""
    if username.lower().strip() != current_user:
        raise HTTPException(status_code=403, detail="Accès non autorisé")
    query = text("SELECT COUNT(*) FROM transactions WHERE LOWER(utilisateur) = :u")
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"u": current_user}).scalar()
            return {
                "username": username,
                "user_transactions_count": result
            }
    except Exception as e:
        logger.error(f"Erreur lors du calcul de la stat pour {current_user}: {e}")
        raise HTTPException(status_code=500, detail="Erreur lors du calcul de la statistique.")


# --- 2. PÉRIODES DASHBOARD ---
@router.get("/dashboard/periodes/{username}")
def get_periodes(username: str, current_user: str = Depends(get_current_user)):
    if username.lower() != current_user.lower():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    query = text("""
        SELECT DISTINCT annee, mois
        FROM transactions
        WHERE LOWER(utilisateur) = :u
        ORDER BY annee DESC
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"u": current_user})
        periodes = df.to_dict(orient="records")
        # Les mois des comptes partagés avec moi comptent aussi : sinon, sans opération à soi, on ne peut pas naviguer.
        vues = {(p["annee"], p["mois"]) for p in periodes}
        for partage in comptes_partages_avec(conn, current_user):
            for annee, mois in conn.execute(
                text("SELECT DISTINCT annee, mois FROM transactions WHERE LOWER(utilisateur) = :u AND compte = :c"),
                {"u": partage["proprietaire"], "c": partage["compte"]},
            ):
                if (annee, mois) not in vues:
                    vues.add((annee, mois))
                    periodes.append({"annee": annee, "mois": mois})
    return sorted(periodes, key=lambda p: -(p["annee"] or 0))


@router.post("/transactions/batch")
def add_transactions_batch(transactions: List[Transaction], current_user: str = Depends(get_current_user)):
    if not transactions:
        return {"status": "success", "added": 0, "warning": False}

    user_clean = current_user.lower().strip()

    insert_query = text("""
        INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte, auteur)
        VALUES (:d, :n, :m, :c, :u, :mo, :a, :co, :au)
        ON CONFLICT (date, nom, montant, utilisateur) DO NOTHING
        RETURNING id
    """)

    try:
        # Un seul bloc begin() = 1 seule transaction réseau atomique
        with engine.begin() as conn:
            ids = []
            rows_to_insert = []
            for t in transactions:
                dest = cible(conn, user_clean, t.compte)
                rows_to_insert.append((dest["partage_id"], {
                    "d": t.date, "n": t.nom, "m": t.montant, "c": t.categorie, "u": dest["utilisateur"],
                    "mo": t.mois, "a": t.annee, "co": dest["compte"], "au": user_clean if dest["partage_id"] else None,
                }))
            for partage_id, row in rows_to_insert:
                ligne = conn.execute(insert_query, row).fetchone()
                if ligne:
                    ids.append(ligne[0])
                    noter(conn, partage_id, user_clean, "ajout", resume({"nom": row["n"], "montant": row["m"]}))

        has_ignored = (len(rows_to_insert) - len(ids)) > 0
        return {
            "status": "success",
            "added": len(ids),
            "ids": ids,
            "warning": has_ignored
        }
    except Exception as e:
        logger.error(f"❌ Erreur bulk insert : {e}")
        raise HTTPException(status_code=500, detail=detail_erreur(e, "Erreur d'insertion par lot"))


# =========================================================================
# 🧹 ROUTE DE NETTOYAGE DES DOUBLONS DÉJÀ CRÉÉS EN BASE
# =========================================================================
@router.post("/transactions/clean-duplicates/{username}")
def clean_existing_duplicates(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé")

    user_clean = current_user.lower().strip()

    with engine.begin() as conn:
        rows = conn.execute(text("""
            SELECT id, date, montant, nom, compte
            FROM transactions
            WHERE LOWER(utilisateur) = :u
            ORDER BY date DESC, id DESC
        """), {"u": user_clean}).mappings().all()

        seen_txs = []
        to_delete_ids = []
        claimed_ids = set()

        for r in rows:
            tx_dict = dict(r)
            # Si cette ligne est identique à une ligne plus récente déjà vue, on la marque pour suppression
            if is_duplicate_py(tx_dict, seen_txs, claimed_ids):
                to_delete_ids.append(tx_dict["id"])
            else:
                seen_txs.append(tx_dict)

        if to_delete_ids:
            conn.execute(
                text("DELETE FROM transactions WHERE id = ANY(:ids)"),
                {"ids": to_delete_ids}
            )

    return {"status": "success", "deleted_duplicates_count": len(to_delete_ids)}


@router.post("/transactions/{t_id}/split")
def split_transaction(
    t_id: int,
    req: SplitRequest,
    current_user: str = Depends(get_current_user)
):
    if not req.parts or len(req.parts) < 2:
        raise HTTPException(status_code=400, detail="Une ventilation nécessite au moins 2 sous-catégories.")

    with engine.begin() as conn:
        # 1. La transaction d'origine : la sienne, ou celle d'un compte partagé avec soi.
        original_tx = ligne_accessible(conn, current_user, "transactions", t_id)

        if not original_tx:
            raise HTTPException(status_code=404, detail="Transaction introuvable ou non autorisée.")
        # Les lignes ventilées restent chez le propriétaire du compte ; le journal garde l'auteur.
        noter(conn, original_tx["_partage_id"], current_user, "division", resume(original_tx))
        current_user = original_tx["utilisateur"].lower()

        montant_total_origine = round(float(original_tx["montant"]), 2)
        somme_parties = round(sum(p.montant for p in req.parts), 2)

        # 2. Vérification d'équilibre strict au centime près
        if abs(montant_total_origine - somme_parties) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Déséquilibre : la somme ventilée ({somme_parties}€) ne correspond pas au montant d'origine ({montant_total_origine}€)."
            )

        # 3. Génération d'un identifiant de groupe de ventilation
        split_id = f"split_{uuid.uuid4().hex[:12]}"

        # 4. Enregistrement de l'empreinte d'origine dans split_sources (bloque les réimports Powens)
        conn.execute(text("""
            INSERT INTO split_sources (utilisateur, date, nom, montant, compte, categorie, split_id)
            VALUES (:u, :d, :n, :m, :co, :c, :sid)
        """), {
            "u": current_user,
            "d": original_tx["date"],
            "n": original_tx["nom"],
            "m": montant_total_origine,
            "co": original_tx["compte"],
            "c": original_tx["categorie"], # 👈 Sauvegarde la catégorie d'origine
            "sid": split_id
        })

        # 5. Suppression de la ligne parente unique
        conn.execute(text("DELETE FROM transactions WHERE id = :id AND LOWER(utilisateur) = :u"), {
            "id": t_id,
            "u": current_user
        })

        # 6. Insertion des nouvelles écritures ventilées
        insert_query = text("""
            INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte, enveloppe, prevision_id, split_id)
            VALUES (:d, :n, :m, :c, :u, :mo, :a, :co, :env, :prev_id, :sid)
        """)

        for part in req.parts:
            conn.execute(insert_query, {
                "d": original_tx["date"],
                "n": part.nom.strip(),
                "m": round(part.montant, 2),
                "c": part.categorie.strip(),
                "u": current_user,
                "mo": original_tx["mois"],
                "a": original_tx["annee"],
                "co": original_tx["compte"],
                "env": part.enveloppe,
                "prev_id": part.prevision_id,
                "sid": split_id
            })

    return {
        "status": "success",
        "split_id": split_id,
        "message": f"Transaction ventilée avec succès en {len(req.parts)} écritures."
    }


@router.post("/transactions/unsplit/{split_id}")
def unsplit_transaction(
    split_id: str,
    current_user: str = Depends(get_current_user)
):
    with engine.begin() as conn:
        # 1. La ventilation doit être la sienne, ou porter sur un compte partagé avec soi.
        source = conn.execute(text("SELECT * FROM split_sources WHERE split_id = :sid"), {"sid": split_id}).mappings().first()
        proprietaire = (source["utilisateur"] or "").lower() if source else ""
        if source and proprietaire != current_user.lower():
            partages = comptes_partages_avec(conn, current_user)
            if not any(p["proprietaire"] == proprietaire and p["compte"] == source["compte"] for p in partages):
                source = None

        if not source:
            raise HTTPException(status_code=404, detail="Historique de ventilation introuvable.")
        current_user = proprietaire

        # 2. Suppression propre de toutes les sous-parties ventilées
        conn.execute(text("DELETE FROM transactions WHERE split_id = :sid AND LOWER(utilisateur) = :u"), {
            "sid": split_id,
            "u": current_user
        })

        # 3. Formatage infaillible de la date
        raw_date = source["date"]
        if isinstance(raw_date, str):
            d_str = raw_date.split(" ")[0].split("T")[0]
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
        elif hasattr(raw_date, "year"):
            d_obj = raw_date
            d_str = d_obj.strftime("%Y-%m-%d")
        else:
            d_obj = date.today()
            d_str = d_obj.strftime("%Y-%m-%d")

        mois_fr = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"]
        mois_nom = mois_fr[d_obj.month - 1]
        annee_val = int(d_obj.year)

        # 4. Restauration de la transaction d'origine
        cat_origine = source.get("categorie") if source.get("categorie") else "Autre"

        conn.execute(text("""
            INSERT INTO transactions (date, nom, montant, categorie, utilisateur, mois, annee, compte, split_id)
            VALUES (:d, :n, :m, :c, :u, :mo, :a, :co, NULL)
        """), {
            "d": d_str,
            "n": source["nom"],
            "m": float(source["montant"]),
            "c": cat_origine,
            "u": current_user,
            "mo": mois_nom,
            "a": annee_val,
            "co": source["compte"]
        })

        # 5. Nettoyage de l'empreinte dans split_sources
        conn.execute(text("DELETE FROM split_sources WHERE split_id = :sid AND LOWER(utilisateur) = :u"), {
            "sid": split_id,
            "u": current_user
        })

    return {"status": "success", "message": "Transaction originale restaurée."}
