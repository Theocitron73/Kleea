"""Statistiques personnalisées et analyses par IA."""
import json
import os
from fastapi import APIRouter, Depends, HTTPException, Request
from google import genai
from google.genai import types
from journaux import detail_erreur, logger
from schemas import ChatRequest, ChatResponseSchema, CustomStatCreate, CustomStatUpdate, PermanentSavingsIndicatorResponse
from sqlalchemy import text
from base import client, engine, get_current_user
from securite import check_is_rate_limited


router = APIRouter()


# --- 1. AJOUTER UNE STAT PERSO (CORRIGÉ ✨) ---
@router.post("/custom-stats")
def create_custom_stat(stat: CustomStatCreate, current_user: str = Depends(get_current_user)):
    query = text("""
        INSERT INTO custom_stats (utilisateur, profil, titre, flux_type, operateur, couleur, icone, regles)
        VALUES (:u, :p, :t, :f, :o, :c, :i, :r)
        RETURNING id
    """)
    with engine.begin() as conn:
        regles_json = json.dumps([r.model_dump() for r in stat.regles])
        result = conn.execute(query, {
            "u": current_user.lower(),
            "p": stat.profil,
            "t": stat.titre,
            "f": stat.flux_type,
            "o": stat.operateur,
            "r": regles_json,
            "c": stat.couleur,
            "i": stat.icone,
        })
        new_id = result.fetchone()[0]
        return {"id": new_id, "status": "success"}


# Vers la ligne 1238 :
@router.get("/custom-stats/{username}")
def get_custom_stats(username: str, current_user: str = Depends(get_current_user)):
    if username.lower().strip() != current_user.lower().strip():
        raise HTTPException(status_code=403, detail="Accès non autorisé.")

    query = text("""
        SELECT id, profil, titre, flux_type, operateur, couleur, icone, regles 
        FROM custom_stats 
        WHERE LOWER(utilisateur) = :u
    """)
    with engine.connect() as conn:
        result = conn.execute(query, {"u": current_user.lower()})
        columns = result.keys()
        records = []
        for row in result.fetchall():
            row_dict = dict(zip(columns, row))
            if isinstance(row_dict['regles'], str):
                row_dict['regles'] = json.loads(row_dict['regles'])
            elif row_dict['regles'] is None:
                row_dict['regles'] = []
            records.append(row_dict)
        return records


# --- 3. SUPPRIMER UNE STAT PERSO ---
@router.delete("/custom-stats/{stat_id}")
def delete_custom_stat(stat_id: int, current_user: str = Depends(get_current_user)):
    query = text("DELETE FROM custom_stats WHERE id = :id AND LOWER(utilisateur) = :u")
    try:
        with engine.begin() as conn:
            res = conn.execute(query, {"id": stat_id, "u": current_user})
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Indicateur introuvable.")
            return {"status": "success"}
    except HTTPException as he:
        raise he
    except Exception as e:
         raise HTTPException(status_code=500, detail=detail_erreur(e))


# --- 4. MODIFIER UNE STAT PERSO (NOUVEAU ✨) ---
@router.put("/custom-stats/{stat_id}")
def update_custom_stat(stat_id: int, stat: CustomStatUpdate, current_user: str = Depends(get_current_user)):
    query = text("""
        UPDATE custom_stats 
        SET titre = :t, flux_type = :f, operateur = :o, couleur = :c, icone = :i, regles = :r
        WHERE id = :id AND LOWER(utilisateur) = :u
    """)
    try:
        with engine.begin() as conn:
            regles_liste = [r.model_dump() for r in stat.regles]
            regles_json = json.dumps(regles_liste)
            
            res = conn.execute(query, {
                "id": stat_id,
                "t": stat.titre,
                "f": stat.flux_type,
                "o": stat.operateur,
                "c": stat.couleur,
                "i": stat.icone,
                "r": regles_json,
                "u": current_user
            })
            if res.rowcount == 0:
                raise HTTPException(status_code=404, detail="Indicateur introuvable.")
            return {"status": "success", "id": stat_id}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=detail_erreur(e))


# 2. La route modifiée
@router.post("/api/insights-chat")
def insights_chat(req: ChatRequest, request: Request, current_user: str = Depends(get_current_user)):
    user_key = current_user.lower()

    # 🟢 RATE LIMITING IA PERSISTANT : Maximum 15 requêtes Gemini par tranche de 10 minutes par utilisateur
    if check_is_rate_limited(key=user_key, action="gemini_chat", max_attempts=15, window_minutes=10):
        raise HTTPException(
            status_code=429, 
            detail="Trop de demandes d'analyse IA en peu de temps. Veuillez patienter quelques minutes."
        )

    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

        if not req.transactions:
            return {
                "reponse": "Je n'ai détecté aucune transaction à analyser ce mois-ci.", 
                "creation_stat": None
            }

        payload_pour_gemini = [
            {
                "date": str(t.get("date")),
                "type": t.get("type") or ("revenus" if float(t.get("montant", 0)) > 0 else "depenses"),
                "cat": t.get("categorie"),
                "nom": t.get("nom"),
                "montant": float(t.get("montant") or 0)
            }
            for t in req.transactions
        ]

        system_instruction = f"""
        Tu es un analyste financier privé de haut niveau. Ton but est d'analyser les données et de configurer des filtres automatiques.
        
        Données de l'utilisateur :
        {json.dumps(payload_pour_gemini)}

        Indicateurs / Stats actuellement enregistrés par l'utilisateur :
        {json.dumps(req.custom_stats or [])}

        RÈGLE D'OR POUR L'OBJET 'creation_stat' (STRICTEMENT OBLIGATOIRE) :
        Dès que l'utilisateur pose une question centrée sur :
        1. Une enseigne ou un commerce spécifique (ex: UberEats, McDonald's, Amazon, Netflix...) -> champ="nom", condition="CONTAINS"
        2. Un mot-clé précis ou une catégorie (ex: Électricité, Loyers, Courses, Salaire...) -> champ="categorie" ou "nom"
        3. Un jour de la semaine en particulier (ex: "mes dépenses du lundi", "le dimanche"). 
           Si l'utilisateur cible un jour, utilise champ="jour", condition="EQUALS" et valeur="lundi" (en minuscules).
           Si l'utilisateur parle du "week-end", crée deux objets dans 'regles' avec l'opérateur "OR" : un pour "samedi" et un pour "dimanche".
        
        🌟 4. CAS SPÉCIAL DES ABONNEMENTS / CHARGES RÉCURRENTES :
        Si l'utilisateur te demande de suivre ses "abonnements", "charges récurrentes", "prélèvements" ou "charges fixes" :
        - Analyse TOUTES les données de l'utilisateur fournies ci-dessus.
        - Identifie TOUTES les transactions qui sont manifestement des abonnements ou des prélèvements (ex: Orange, Twitch, Mutuelle, Netflix, EDF, Loyer...).
        - Tu DOIS configurer l'objet `creation_stat` avec operateur="OR".
        - Dans la liste `regles`, crée UNE RÈGLE POUR CHAQUE ENSEIGNE d'abonnement ou prélèvement détectée.
          Exemple de format pour 'regles' si tu as détecté Orange et Twitch :
          [
            {{"champ": "nom", "condition": "CONTAINS", "valeur": "orange"}},
            {{"champ": "nom", "condition": "CONTAINS", "valeur": "twitch"}}
          ]
        - Mets comme titre : "Charges Récurrentes (IA)"

        🌟 5. CAS MULTI-CATÉGORIES OU MULTI-ENSEIGNES :
        Si l'utilisateur demande d'analyser ou de suivre plusieurs catégories ou enseignes ensemble (ex: "Shopping et Loisirs", "UberEats et McDo") :
        - Configuration de `creation_stat` avec operateur="OR".
        - Dans `regles`, crée UNE RÈGLE POUR CHAQUE catégorie ou enseigne ciblée.
        - Titre propre combinant les sujets (ex: "Shopping & Loisirs").

        🌟 6. MODIFICATION OU SUPPRESSION D'UN INDICATEUR EXISTANT :
        Si l'utilisateur demande de modifier un indicateur déjà existant (ex: "Retire les loisirs de l'indicateur Shopping & Loisirs" ou "Enlève UberEats") :
        - Repère l'indicateur correspondant dans la liste des indicateurs enregistrés ci-dessus.
        - Définis `action="UPDATE"` et reprends son `id` exact dans la propriété `id`.
        - Ajuste la liste `regles` en retirant ou ajoutant le critère demandé.
        - Met à jour le `titre` si nécessaire (ex: "Shopping & Loisirs" devient "Suivi Shopping").
        - Si l'utilisateur demande de supprimer complètement l'indicateur, mets `action="DELETE"` et indique son `id`.

        Tu AS L'OBLIGATION de remplir l'objet `creation_stat` pour lui créer ou adapter un indicateur permanent, MÊME s'il n'a pas dit explicitement les mots "créer" ou "sauvegarder".

        Règles de formatage globales pour l'objet JSON `creation_stat` :
        - action : "CREATE", "UPDATE" ou "DELETE"
        - id : L'ID string de la stat en cas de UPDATE/DELETE, sinon null
        - titre : Le nom propre nettoyé de l'enseigne ou du sujet
        - flux_type : "depenses" ou "revenus"
        - operateur : "OR"
        - regles : Une liste d'objets contenant chacun :
            * champ : "nom", "categorie" ou "jour"
            * condition : "CONTAINS", "EQUALS", "GREATER_THAN" ou "LESS_THAN"
            * valeur : La valeur cible en minuscules

        Si la question est globale (ex: "Combien j'ai dépensé au total ce mois-ci ?"), alors et seulement alors, tu laisses `creation_stat` vide.

        Règles d'esthétique pour 'couleur' et 'icone' (STRICTEMENT OBLIGATOIRE) :
        - Restauration rapide / Plaisirs coupables (McDo, UberEats, Bar...) -> couleur="rose", icone="fastfood"
        - Supermarché / Courses alimentaires récurrentes -> couleur="emerald", icone="shopping"
        - Abonnements / Prélèvements / Licences (Netflix, Spotify, Internet...) -> couleur="indigo", icone="sub"
        - Revenu / Salaire / Remboursement reçu -> couleur="emerald", icone="salary"
        - Voiture / Essence / Péage / Transports en commun -> couleur="cyan", icone="car"
        - Logement / Loyer / Électricité / Meubles -> couleur="blue", icone="home"
        - Santé / Pharmacie / Docteur / Mutuelle -> couleur="red", icone="health"
        - Sorties / Cinéma / Concerts / Musées / Loisirs -> couleur="fuchsia", icone="leisure"
        - Épargne / Bourse / Crypto-monnaies / Investissements -> couleur="violet", icone="crypto"
        - Technologie / Matériel informatique / Gadgets / Jeux-Vidéo -> couleur="orange", icone="tech"
        - Voyages / Vacances / Billets d'avion / Hôtel -> couleur="cyan", icone="travel"
        - Cadeaux / Dons / Anniversaires -> couleur="rose", icone="gift"
        - Danger / Alerte / Frais bancaires ou anomalies -> couleur="red", icone="alert"
        - Cas générique / Non classé -> couleur="amber", icone="star"
        """

        # Appel du modèle Gemini
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=req.question,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.1,
                response_mime_type="application/json",
                response_schema=ChatResponseSchema,
            )
        )

        result_data = json.loads(response.text)

        # 🟢 Sécurisation stricte du format pour le frontend
        if result_data.get("creation_stat"):
            stat = result_data["creation_stat"]
            # Si le dictionnaire est vide ou n'a pas de règles, on le remet à None
            if not isinstance(stat, dict) or not stat.get("titre"):
                result_data["creation_stat"] = None
            else:
                stat.setdefault("regles", [])
        else:
            result_data["creation_stat"] = None

        return result_data

    except Exception as e:
        error_str = str(e)
        logger.error(f"❌ CRASH ROUTE AI : {error_str}")
        
        # 🟢 Fallback propre respectant le contrat d'interface
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            return {
                "reponse": "⚠️ **Quota Gemini momentanément épuisé**. Veuillez réessayer dans quelques instants.",
                "creation_stat": None  # Plus jamais de dictionnaire vide {}
            }
            
        return {
            "reponse": "⚠️ Une erreur est survenue lors de l'analyse IA.",
            "creation_stat": None
        }


LIMITE_ANALYSES_ECONOMIES = 15  # par compte, sur 10 minutes


@router.post(
    '/api/indicators/savings-analysis',
    response_model=PermanentSavingsIndicatorResponse,
)
def get_savings_indicator(data: dict, current_user: str = Depends(get_current_user)):
    if check_is_rate_limited(key=current_user, action="gemini_savings", max_attempts=LIMITE_ANALYSES_ECONOMIES, window_minutes=10):
        raise HTTPException(
            status_code=429,
            detail="Trop de demandes d'analyse IA en peu de temps. Veuillez patienter quelques minutes."
        )

    system_prompt = """
    Tu es un assistant financier intégré à un tableau de bord.
    Ta mission est d'analyser le panier de dépenses mensuel et d'extraire AUTOMATIQUEMENT les 2 ou 3 postes d'économies les plus pertinents pour le mois prochain.
    Reste synthétique, pragmatique et focalise-toi sur des gains réels.
    """

    prompt_user = f"""
    Mois : {data.get('mois')} {data.get('annee')}
    Total des dépenses : {data.get('total_depenses')}€
    Dépenses par catégorie : {json.dumps(data.get('categories'))}
    """

    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt_user,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type='application/json',
                response_schema=PermanentSavingsIndicatorResponse,
                temperature=0.2,
            ),
        )

        # Avec response_schema, response.text contient déjà du JSON valide
        return json.loads(response.text)

    except Exception as e:
        logger.error(f"Erreur analyse des économies : {e}")
        raise HTTPException(status_code=500, detail="L'analyse des économies a échoué.")
