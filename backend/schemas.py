"""Modèles de données des routes de l'API."""
import unicodedata
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import text
from typing import Any, List, Optional


class Transaction(BaseModel):
    nom: str
    montant: float
    categorie: str
    utilisateur: str
    mois: str
    annee: int
    compte: str
    id: Optional[int] = None
    date: Optional[str] = None
    enveloppe: Optional[str] = None
    prevision_id: Optional[int] = None  # 👈 AJOUT ICI
    split_id: Optional[str] = None  # 👈 AJOUTEZ CETTE LIGNE


class LoginRequest(BaseModel):
    nom: str
    password: str


class RegisterRequest(BaseModel):
    nom: str        # Sera utilisé pour 'username'
    email: str
    password: str
    first_name: str
    last_name: str


# Modèle pour la mise à jour du mode d'import
class ImportModeRequest(BaseModel):
    import_mode: str  # 'auto' ou 'manual'


class ResetRequest(BaseModel):
    email: EmailStr


class NewPasswordRequest(BaseModel):
    token: str
    new_password: str


class UpdatePasswordRequest(BaseModel):
    new_password: str


# Modèle pour la mise à jour des infos personnelles
class UpdateProfileRequest(BaseModel):
    name: str
    email: str


# 💡 1. AJOUT DE TAUX DANS LE MODÈLE PYDANTIC
class CompteConfig(BaseModel):
    compte: str
    groupe: str
    solde: float
    objectif: float
    couleur: str
    utilisateur: str
    taux: float = 0.0  # Optionnel par défaut à 0.0 si absent
    powens_name: Optional[str] = None


class ThemeConfig(BaseModel):
    utilisateur: str
    bg_site: str
    primary_color: str
    text_main: str
    radius: str
    glass_blur: str  # <-- AJOUT
    glass_bg: str    # <-- AJOUT
    secondary_color: Optional[str] = None  # None : dérivée de la couleur primaire


class UserColorUpdate(BaseModel):
    user: str
    element: str
    couleur: str


def _date_valide(valeur: str, formats: tuple) -> str:
    for fmt in formats:
        try:
            datetime.strptime(valeur, fmt)
            return valeur
        except ValueError:
            continue
    raise ValueError("Date invalide")


class Projet(BaseModel):
    profil: str = Field(min_length=1, max_length=100)
    nom: str = Field(min_length=1, max_length=120)
    cout: float = Field(ge=0)
    date: str  # Date d'échéance / cible (Format "YYYY-MM-DD")
    capa: float = Field(default=0, ge=0)
    apport: float = Field(default=0, ge=0)
    date_debut: Optional[str] = None  # Format "YYYY-MM-DD" (ou "YYYY-MM")
    utiliser_capa_stricte: Optional[bool] = False

    @field_validator("nom")
    @classmethod
    def nom_non_vide(cls, valeur: str) -> str:
        valeur = valeur.strip()
        if not valeur:
            raise ValueError("Le nom est obligatoire")
        return valeur

    @field_validator("date")
    @classmethod
    def date_valide(cls, valeur: str) -> str:
        return _date_valide(valeur, ("%Y-%m-%d",))

    @field_validator("date_debut")
    @classmethod
    def date_debut_valide(cls, valeur: Optional[str]) -> Optional[str]:
        return _date_valide(valeur, ("%Y-%m-%d", "%Y-%m")) if valeur else valeur


class OrdreProjets(BaseModel):
    ids: List[int] = Field(max_length=500)


class Budget(BaseModel):
    utilisateur: str
    mois: str
    annee: int = Field(default_factory=lambda: date.today().year) # Détecte l'annee actuelle par défaut (ex: 2026)
    compte: str
    type: str = "Categorie"
    nom: str
    somme: float


# 1. Modèles Pydantic avec la couleur
class CategorieCreate(BaseModel):
    nom: str
    icone: Optional[str] = "Tag"
    couleur: Optional[str] = "#818cf8"
    utilisateur: str


class CategorieUpdate(BaseModel):
    nom: str
    icone: Optional[str] = "Tag"
    couleur: Optional[str] = "#818cf8"
    utilisateur: str


class CategorieAssignGroup(BaseModel):
    nom: str
    groupe: str
    utilisateur: str


# 🟢 ROUTE : SUPPRESSION D'UN GROUPE AVEC RÉASSIGNATION AUTOMATIQUE VERS "Général"
class DeleteGroupRequest(BaseModel):
    groupe: str
    utilisateur: str
    fallback_groupe: Optional[str] = "Général"


class Memoire(BaseModel):
    nom: str
    categorie: str
    utilisateur: str


class PrevisionIn(BaseModel):
    nom: str
    montant: float
    categorie: str
    compte: str
    utilisateur: str
    mois: str
    annee: int
    date: str
    actif: bool = True

    # 💡 Pydantic Validator : Nettoie automatiquement le mois à l'entrée de l'API
    @field_validator('mois')
    @classmethod
    def clean_mois(cls, v: str) -> str:
        if v:
            # Enlève les accents (Août -> Aout, Février -> Fevrier)
            
            v = "".join(c for c in unicodedata.normalize('NFD', v) if unicodedata.category(c) != 'Mn')
            # Optionnel : Forcer la première lettre en Majuscule et le reste en minuscule
            v = v.strip().capitalize()
        return v


class Allocation(BaseModel):
    profil: str = Field(min_length=1, max_length=100)
    projet: str = Field(min_length=1, max_length=120)
    montant_alloue: float = Field(ge=0)


class TricountTransaction(BaseModel):
    id: Optional[int] = None
    date: date
    libelle: str
    montant: float
    paye_par: str
    pour_qui: str # Stocké en string séparé par des virgules (ex: "Theo, Marie, Julie")
    utilisateur: str
    groupe: str
    token_partage: Optional[str] = None # <-- Nouveau champ
    emoji: Optional[str] = None  # <--- AJOUTE CETTE LIGNE


# Modèle pour valider les données reçues lors du renommage
class RenameGroupRequest(BaseModel):
    userId: str
    oldName: str
    newName: str


# 4. Sauvegarder une transaction anonyme depuis le lien de partage
class SharedTransactionRequest(BaseModel):
    date: date
    libelle: str
    montant: float
    paye_par: str
    pour_qui: str
    emoji: Optional[str] = None


# 5. Modifier une transaction de manière sécurisée via le token de partage
class SharedTransactionUpdate(BaseModel):
    id: int
    date: date
    libelle: str
    paye_par: str
    pour_qui: str
    montant: float


# Modèle pour la modification
class UpdateTransactionRequest(BaseModel):
    id: int
    date: str
    libelle: str
    paye_par: str
    pour_qui: str
    montant: float


# --- SCHÉMAS PYDANTIC POUR LES STATS PERSONNALISÉES ---
class CustomStatRule(BaseModel):
    champ: str       # 'nom', 'categorie' ou 'jour'
    condition: str   # 'EQUALS', 'CONTAINS', 'GREATER_THAN', 'LESS_THAN'
    valeur: str      # ex: 'UberEats', 'Macdo', 'lundi', etc.


class CustomStatCreate(BaseModel):
    utilisateur: str
    profil: str 
    titre: str
    flux_type: str   # 'depenses' ou 'revenus'
    operateur: str   # 'AND' ou 'OR'
    couleur: str  # 👈 Ajoute ici
    icone: str    # 👈 Ajoute ici
    regles: List[CustomStatRule]


# --- SCHÉMA DE MISE À JOUR ---
class CustomStatUpdate(BaseModel):
    titre: str
    flux_type: str
    operateur: str
    couleur: str
    icone: str
    regles: List[CustomStatRule]


# 1. PLACE LE SCHÉMA ICI EN PREMIER
class ChatRequest(BaseModel):
    question: str
    transactions: List[dict]
    custom_stats: Optional[List[dict]] = []


# 1. Définition de la structure de sortie attendue par Gemini
class AISuggestedRule(BaseModel):
    champ: str = Field(description="Doit être 'nom', 'categorie', 'jour', 'montant', 'methode' ou 'frequence'")
    condition: str = Field(description="Doit être 'EQUALS', 'CONTAINS', 'GREATER_THAN' ou 'LESS_THAN'")
    valeur: str = Field(description="La valeur cible en minuscules (ex: 'shopping', 'loisirs', 'amazon', 'lundi')")


class AICreationStat(BaseModel):
    action: str = Field(description="Doit être 'CREATE' pour une création, 'UPDATE' pour une modification d'un indicateur existant, ou 'DELETE' si l'utilisateur veut le supprimer.")
    id: Optional[str] = Field(default=None, description="L'ID exact de l'indicateur existant si action='UPDATE' ou 'DELETE'. Laisser null si 'CREATE'.")
    titre: str = Field(description="Le titre de l'indicateur nettoyé (ex: 'Suivi Shopping')")
    flux_type: str = Field(description="Doit être 'depenses' ou 'revenus'")
    operateur: str = Field(description="Doit être 'AND' ou 'OR'")
    couleur: str = Field(description="Choisis parmi exclusivement: 'rose', 'amber', 'emerald', 'indigo', 'cyan', 'violet', 'blue', 'orange', 'red', 'fuchsia'")
    icone: str = Field(description="Choisis parmi exclusivement: 'fastfood', 'shopping', 'car', 'home', 'sub', 'salary', 'star', 'alert', 'health', 'leisure', 'crypto', 'tech', 'travel', 'gift'")
    regles: List[AISuggestedRule]


class ChatResponseSchema(BaseModel):
    reponse: str = Field(description="Ta réponse d'expert financier en Français au format Markdown (tableaux, gras, listes).")
    creation_stat: Optional[AICreationStat] = Field(default=None, description="Remplis cet objet si l'utilisateur demande explicitement de créer/suivre une stat OU s'il s'intéresse à une/plusieurs catégories/enseignes/jours spécifiques.")


class ConseilCategorie(BaseModel):
  categorie: str = Field(description='Nom de la catégorie visée')
  depense_actuelle: float = Field(
      description='Montant dépensé ce mois-ci dans cette catégorie'
  )
  economie_potentielle: float = Field(
      description='Montant réaliste économisable le mois prochain'
  )
  action_concrete: str = Field(
      description='Conseil court et ultra-spécifique (1 à 2 phrases max)'
  )


class PermanentSavingsIndicatorResponse(BaseModel):
  potentiel_total: float = Field(
      description='Somme globale des économies identifiées'
  )
  score_sante_budget: str = Field(
      description='Évaluation globale courte (ex: Bon, À surveiller, Critique)'
  )
  conseils: list[ConseilCategorie] = Field(
      description='Liste des 2 à 3 meilleures opportunités d’économies'
  )


class SimulationLineCreate(BaseModel):
    id: int = None  # Ajout de l'ID optionnel pour l'éventuelle modification directe
    utilisateur: str
    scenario: str
    titre: str
    flux_type: str
    categorie: str
    montant: float
    frequence: str
    cible: str


class DuplicateScenarioRequest(BaseModel):
    scenario_source: str
    nouveau_scenario: str


class NoteUpdate(BaseModel):
    utilisateur: str
    contenu: str


class PowensCallback(BaseModel):
    code: str = Field(min_length=1)
    state: str = Field(min_length=1)
    redirect_uri: Optional[str] = None


class PropagateYearRequest(BaseModel):
    ids: List[int]
    mois_actuel: Any          # Nom du mois (ex: "Juin") ou chiffre (ex: 6)
    annee: Any                # Année cible (ex: 2026)
    utilisateur: Optional[Any] = None  # Conservé pour compatibilité front, mais ignoré au profit du JWT


class CongeCreate(BaseModel):
    utilisateur: str
    type: str  # 'CP', 'SANS_SOLDE', 'RECUP'
    date_debut: str
    date_fin: str
    nb_jours: float
    motif: Optional[str] = None
    anticipe: Optional[bool] = False
    jours_restants_apres: Optional[float] = None


class CongeProfile(BaseModel):
    utilisateur: str
    nom: str
    prenom: str
    societe: str
    poste: str
    jours_acquis_annuel: Optional[float] = 25.0
    date_embauche: Optional[str] = "2026-01-01"


class SplitLine(BaseModel):
    nom: str
    montant: float
    categorie: str
    enveloppe: Optional[str] = None
    prevision_id: Optional[int] = None


class SplitRequest(BaseModel):
    parts: List[SplitLine]


class ThemePresetIn(BaseModel):
    nom: str
    bg_site: str
    primary_color: str
    text_main: str
    radius: str
    glass_blur: str
    glass_bg: str
    secondary_color: Optional[str] = None
    gradient_style: Optional[str] = "radial"       # 👈 Ajout
    gradient_intensity: Optional[str] = "50%"      # 👈 Ajout
    gradient_color: Optional[str] = "auto"         # 👈 Ajout
    gradient_angle: Optional[str] = None
    gradient_shape: Optional[str] = None
    gradient_center: Optional[str] = None
    gradient_spread: Optional[str] = None


# 1. Modèle Pydantic des annonces
class AnnonceModel(BaseModel):
    titre: str
    url: Optional[str] = ""
    source: Optional[str] = "Autre"
    loyer: Optional[float] = 0.0
    charges: Optional[float] = 0.0
    surface: Optional[float] = 0.0
    pieces: Optional[int] = 0
    ville: Optional[str] = ""
    photos: Optional[List[str]] = []
    dossier_envoye: Optional[bool] = False
    date_dossier: Optional[str] = None
    visite_effectuee: Optional[bool] = False
    date_visite: Optional[str] = None
    statut_reponse: Optional[str] = "en_attente"
    notes: Optional[str] = ""
    favori: Optional[bool] = False


# 2. Route FastAPI
class ScrapeUrlRequest(BaseModel):
    url: str


class ParseTextRequest(BaseModel):
    text: str
