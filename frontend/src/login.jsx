import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
 // <-- Ajoute cette ligne tout en haut du fichier

import { SketchPicker } from 'react-color'; // À mettre en haut de ton fichier
import { LayoutDashboard, ChartCandlestick, Settings2, FileUp, Wallet, Users2, Palette, LogOut, X, Trash2, TrendingUp, Tag, ChevronRight, Sparkles, FileText, CalendarDays, Copy, RefreshCw, ArrowUpCircle, ArrowDownCircle, Zap, BarChartHorizontal, Truck, ShieldAlert, Scissors, Scale, RotateCcw } from 'lucide-react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import fr from 'date-fns/locale/fr';
registerLocale('fr', fr); // Pour avoir le calendrier en français
 // À ajouter en haut de ton fichier
import api from './axios';
import GuideView from './GuideView';
import { CategoryIcon, getCleanCategoryName, LucideIconPicker, setGlobalCustomIconsMap } from './categoryIcons'; // Fonction pour générer des variations HSL à partir d'un HEX (percent: 0 à 100)
import CustomSelect from './components/CustomSelect';
import ProfileTab from './views/ProfileTab';
import TricountManager from './views/TricountManager';
import DemenagementPage from './views/DemenagementPage';
import CongesPage from './views/Congespage';
import AuthView from './views/AuthView';
import ComptesView from './views/ComptesView';
import ThemeStudioDesktop from './views/ThemeStudioDesktop';
import { themeBackground } from './utils/gradient';
import {
  anneeTransaction,
  appliquerMouvement,
  calculerSoldes,
  creerLecteurMouvements,
  estTransfertInterne,
  nettoyerMois,
  totauxRevenusDepenses,
  trouverCompteCible,
} from './utils/finance';
import ImportView from './views/ImportView';
import GererView from './views/GererView';
import PrevisionsView from './views/PrevisionsView';
import DashboardView from './views/DashboardView';
import { toast } from 'sonner'
import { getTodayLocalDateString } from './utils/dateUtils';
import { useVirtualizer } from '@tanstack/react-virtual';
import ExportModal from './components/ExportModal';
import LandingPage from './views/LandingPage';
import DelayedDashboardLoader from './components/DelayedDashboardLoader';
import SortableAccountCard from './components/SortableAccountCard';
import UnifiedWidgets from './components/UnifiedWidgets';
import ImportPowensModal from './components/ImportPowensModal';
import NavigationPrincipale from './components/NavigationPrincipale';
import IndicateurSynchroAuto from './components/IndicateurSynchroAuto';
import FenetreSuppressionCompte from './components/FenetreSuppressionCompte';
import BarreActionsTransactions from './components/BarreActionsTransactions';
import FenetreSuppressionSelection from './components/FenetreSuppressionSelection';
import FenetreSuppressionBudget from './components/FenetreSuppressionBudget';
import BarreActionsPrevisions from './components/BarreActionsPrevisions';
import FenetreSuppressionPrevisions from './components/FenetreSuppressionPrevisions';
import AssistantSolde from './components/AssistantSolde';
import FenetreDuplication from './components/FenetreDuplication';
import NotesDeVersion from './components/NotesDeVersion';
import FenetreReconduction from './components/FenetreReconduction';
import FenetreBienvenue from './components/FenetreBienvenue';
import FenetreModifCategorie from './components/FenetreModifCategorie';
import FenetreCelebration from './components/FenetreCelebration';
import FenetreReauthentification from './components/FenetreReauthentification';
import useAnalyseFinanciere from './hooks/useAnalyseFinanciere';
import useBudgets from './hooks/useBudgets';
import useMotsCles from './hooks/useMotsCles';
import useEnveloppes from './hooks/useEnveloppes';
import useCarrousel from './hooks/useCarrousel';
import useMolette from './hooks/useMolette';
import useTableauTransactions from './hooks/useTableauTransactions';
import useConnexionBancaire from './hooks/useConnexionBancaire';
import usePrevisions from './hooks/usePrevisions';




















































// Moteur de calcul éphémère pour les statistiques créées sur-mesure












function FinanceApp() {
  // Ces états sont lus par plusieurs hooks : ils sont déclarés avant eux.
  const [duplicateType, setDuplicateType] = useState('month'); // 'month' | 'year'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [importMode, setImportMode] = useState('manual');
  const [editingCat, setEditingCat] = useState(null); // { nom: "Courses", icone: "ShoppingCart", couleur: "#818cf8" }
  const [celebrationModal, setCelebrationModal] = useState({
    show: false,
    accountName: '',
    count: 0
  });



const [showExportModal, setShowExportModal] = useState(false);
  
// Liste des mois pour le select
const moisListe = [
  { v: "Janvier", l: "Janvier" }, 
  { v: "Février", l: "Février" },
  { v: "Mars", l: "Mars" },
  { v: "Avril", l: "Avril" },
  { v: "Mai", l: "Mai" },
  { v: "Juin", l: "Juin" },
  { v: "Juillet", l: "Juillet" },
  { v: "Aout", l: "Aout" },
  { v: "Septembre", l: "Septembre" },
  { v: "Octobre", l: "Octobre" },
  { v: "Novembre", l: "Novembre" },
  { v: "Décembre", l: "Décembre" }
];



  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRightTab, setActiveRightTab] = useState('graphs'); // 'graphs' ou 'projects'
 // Stocke le nom du projet à supprimer
  const [projets, setProjets] = useState([]);
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [authViewMode, setAuthViewMode] = useState(null); // null = Landing Page, 'login' ou 'register' = Formulaire
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user'); // 👈 Nouvel état
  const [loginName, setLoginName] = useState('')
  const [comptes, setComptes] = useState([]);

  // 🟢 Helper pour trouver le compte par défaut (CCP en priorité, sinon 1er compte)
  const getCompteDefaut = (nomProfil, listeComptes) => {
    if (!listeComptes || listeComptes.length === 0) return 'tous';

    // 1. On cible les comptes du profil concerné
    const comptesCibles = (nomProfil && nomProfil !== 'Tous')
      ? listeComptes.filter(c => c.groupe?.trim().toLowerCase() === nomProfil?.trim().toLowerCase())
      : listeComptes;

    const listeAAnalyser = comptesCibles.length > 0 ? comptesCibles : listeComptes;

    // 2. On cherche le CCP en priorité
    const compteCCP = listeAAnalyser.find(c => c.compte?.trim().toUpperCase().includes('CCP'));
    if (compteCCP) return compteCCP.compte;

    // 3. Sinon, le premier compte de la liste
    return listeAAnalyser[0]?.compte || 'tous';
  };

  const [selectedCompte, setSelectedCompte] = useState(''); // 👈 Ne démarre plus sur 'tous'
  const [importCompte, setImportCompte] = useState('');
  const initialCompteDefini = useRef(false);

  // 🟢 Applique le CCP ou le 1er compte par défaut dès que les comptes sont chargés
  useEffect(() => {
    if (comptes.length > 0 && !initialCompteDefini.current) {
      const profilActuel = filtersByPage['gerer']?.profil || filters.profil;
      const compteInitial = getCompteDefaut(profilActuel, comptes);
      if (compteInitial) {
        setSelectedCompte(compteInitial);
        initialCompteDefini.current = true;
      }
    }
  }, [comptes]);

 // 'bg', 'primary', 'text' ou null
  const [showPicker, setShowPicker] = useState(null); // Pour savoir quel picker est ouvert
  const handleColorChange = (index, color) => {
  const newComptes = [...comptes]; newComptes[index].couleur = color.hex; setComptes(newComptes);};
  const [newCompteColor, setNewCompteColor] = useState("#6366f1"); // Couleur par défaut
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [tabActive, setTabActive] = useState('revenus');

  // 💡 Dans la déclaration de ton useState (au tout début)
// =========================================================================
// 🟢 GESTIONNAIRE DE FILTRES INDÉPENDANTS PAR PAGE
// =========================================================================
const getPageKey = (tab) => {
  if (tab === 'previsions' || tab === 'previsionnel') return 'previsionnel';
  if (tab === 'gerer' || tab === 'transactions') return 'gerer';
  if (tab === 'dashboard') return 'dashboard';
  return 'default';
};

const getDefaultPeriod = () => ({
  profil: 'Tous',
  annee: new Date().getFullYear().toString(),
  mois: moisListe[new Date().getMonth()]?.v || 'Janvier'
});

const [filtersByPage, setFiltersByPage] = useState(() => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const saved = localStorage.getItem(`filters_v3_${savedUser.toLowerCase()}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          dashboard: parsed.dashboard || getDefaultPeriod(),
          previsionnel: parsed.previsionnel || parsed.previsions || getDefaultPeriod(),
          gerer: parsed.gerer || parsed.transactions || getDefaultPeriod(),
          default: parsed.default || getDefaultPeriod()
        };
      } catch (e) {
        console.error(e);
      }
    }
  }

  const def = getDefaultPeriod();
  return {
    dashboard: { ...def },
    previsionnel: { ...def },
    gerer: { ...def },
    default: { ...def }
  };
});

const currentKey = getPageKey(activeTab);
const filters = filtersByPage[currentKey] || filtersByPage['dashboard'] || getDefaultPeriod();

const setFilters = (newFiltersOrFn) => {
  setFiltersByPage(prev => {
    const targetKey = getPageKey(activeTab);
    const currentFilters = prev[targetKey] || prev['default'] || getDefaultPeriod();

    const updated = typeof newFiltersOrFn === 'function' 
      ? newFiltersOrFn(currentFilters) 
      : { ...currentFilters, ...newFiltersOrFn };

    const nextState = {
      ...prev,
      [targetKey]: updated
    };

    if (user) {
      const u = typeof user === 'string' ? user.toLowerCase() : user?.nom?.toLowerCase();
      if (u) {
        localStorage.setItem(`filters_v3_${u}`, JSON.stringify(nextState));
      }
    }

    return nextState;
  });
};

  const [deleteModal, setDeleteModal] = useState({ show: false, accountName: null });
  const [toutesLesTransactions, setToutesLesTransactions] = useState([]);
 // Stocke le nom ou l'ID du projet en cours d'édition*
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [ordreComptes, setOrdreComptes] = useState(() => {
  const saved = localStorage.getItem('ordre_comptes_favoris');
  return saved ? JSON.parse(saved) : [];
});
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const toggleCategory = (name) => {
    setHiddenCategories(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };




const [toutesLesCategories, setToutesLesCategories] = useState([]);
const [categoriesPerso, setCategoriesPerso] = useState([]);
const [masquees, setMasquees] = useState([]); // <-- Nouvel état à ajouter
/*
useEffect(() => {
  const chargerDonnees = async () => {
    try {
      // Axios combine l'appel et le .json()
      const [resCats, resMasquees] = await Promise.all([
        api.get(`/api/categories/${user}`),
        api.get(`/api/categories_masquees/${user}`)
      ]);

      // Avec Axios, les données sont dans .data
      setToutesLesCategories(resCats.data.all || []);
      setCategoriesPerso(resCats.data.perso || []);
      setMasquees(resMasquees.data || []);
      
    } catch (err) {
      console.error("Erreur lors du chargement des catégories:", err);
      // Fallback : au moins afficher les catégories par défaut si l'API crash
      setToutesLesCategories(CATEGORIES_DEFAUT_FRONT); 
    }
  };

  if (user) chargerDonnees();
}, [user]);
*/


const [userTheme, setUserTheme] = useState({
  color_revenus: "#10b981",
  color_depenses: "#f43f5e",
  color_epargne: "#ffffff",
  color_jauge: "#f1c40f",
  color_patrimoine: "#37b58f"
});


  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  const openDeleteModal = (name) => {
  setDeleteModal({ show: true, accountName: name });
};

const confirmDelete = async () => {
  if (!deleteModal.accountName) return;

  try {
    // ON AJOUTE L'UTILISATEUR À L'URL POUR CORRESPONDRE AU BACKEND
    const url = `/config-comptes/${encodeURIComponent(deleteModal.accountName)}/${encodeURIComponent(user)}`;
    
    await api.delete(url);
    
    // Rafraîchir la liste après suppression
    fetchComptes();
    
    // 💡 AJOUT : Supprime instantanément de l'affichage les virements associés au compte effacé
    fetchCategories();
    
    // Fermer la modal
    setDeleteModal({ show: false, accountName: null });
    
  } catch (err) {
    console.error("Erreur détaillée:", err.response?.data);
    toast.error("Erreur lors de la suppression. Vérifie les logs console.");
  }
};
  
  

  const updateThemeLive = (variable, value) => {
    document.documentElement.style.setProperty(variable, value);
    // Optionnel: on met aussi à jour le localStorage en bonus
    const currentTheme = JSON.parse(localStorage.getItem('mycash-theme')) || {};
    currentTheme[variable] = value;
    localStorage.setItem('mycash-theme', JSON.stringify(currentTheme));
  };

const fetchUserTheme = async (username) => {
  try {
    const resTheme = await api.get(`/get-theme/${username}`);
    if (resTheme.data) {
      document.documentElement.style.setProperty('--bg-site', resTheme.data.bg_site);
      document.documentElement.style.setProperty('--primary', resTheme.data.primary_color);
      if (resTheme.data.secondary_color) {
        document.documentElement.style.setProperty('--secondary', resTheme.data.secondary_color);
      } else {
        document.documentElement.style.removeProperty('--secondary');
      }
      document.documentElement.style.setProperty('--text-main', resTheme.data.text_main);
      document.documentElement.style.setProperty('--radius', resTheme.data.radius);
      document.documentElement.style.setProperty('--glass-blur', resTheme.data.glass_blur || '12px');
      document.documentElement.style.setProperty('--glass-bg', resTheme.data.glass_bg || 'color-mix(in srgb, var(--text-main) 3%, transparent)');

      // 🟢 METTRE EN CACHE POUR UN CHARGEMENT INSTANTANÉ AU PROCHAIN RAFRAÎCHISSEMENT
      localStorage.setItem('kleea-theme-cache', JSON.stringify(resTheme.data));
    }

    const resColors = await api.get(`/get-user-theme/${username}`);
    if (resColors.data && Object.keys(resColors.data).length > 0) {
      setUserTheme(prev => ({ ...prev, ...resColors.data }));
    }
  } catch (err) {
    console.error("Erreur chargement thème SQL", err);
  }
};




  const handleSaveThemeSQL = async () => {
  const styles = getComputedStyle(document.documentElement);
  const themeData = {
    utilisateur: user,
    bg_site: styles.getPropertyValue('--bg-site').trim() || '#152c48',
    primary_color: styles.getPropertyValue('--primary').trim() || '#4f46e5',
    // Lue sur le style en ligne : sans choix explicite, la secondaire reste dérivée de la primaire.
    secondary_color: document.documentElement.style.getPropertyValue('--secondary').trim() || null,
    text_main: styles.getPropertyValue('--text-main').trim() || '#0f172a',
    radius: styles.getPropertyValue('--radius').trim() || '1.5rem',
    glass_blur: getComputedStyle(document.documentElement).getPropertyValue('--glass-blur').trim()|| '#f8fafc',
    glass_bg: getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim()|| '#f8fafc',
  };

  try {
    await api.post(`/save-theme`, themeData);
    toast.success("Configuration propagée avec succès ! 🚀");
  } catch (err) {
    console.error(err);
    toast.error("Échec de la synchronisation cloud.");
  }
};


const fetchComptes = async () => {
  if (!user) {
    setLoading(false);
    return;
  }
  try {
    const res = await api.get(`/config-comptes/${user}`);
    setComptes(res.data || []);
  } catch (err) {
    console.error("Erreur chargement comptes", err);
  } finally {
    setLoading(false);
  }
};


const [selectedType, setSelectedType] = useState("");
const [compteName, setCompteName] = useState("");
const [creationPowensName, setCreationPowensName] = useState("");

const typeOptions = [
  { v: "CCP", l: "CCP" },
  { v: "LIVRET A", l: "LIVRET A" },
  { v: "LEP", l: "LEP" },
  { v: "LDDS", l: "LDDS" },
  { v: "PEL", l: "PEL" },
  { v: "PEA", l: "PEA" },
  { v: "ASSURANCE VIE", l: "ASSURANCE VIE" },
  { v: "PRET", l: "PRET" }
];

const handleAddCompte = async (e) => {
  e.preventDefault();
  
  let nomSaisi = compteName.trim().toUpperCase();
  if (!nomSaisi) {
    toast.warning("Veuillez saisir un nom pour votre compte !");
    return;
  }

  const finalCompteName = selectedType ? `${selectedType} - ${nomSaisi}` : nomSaisi;

  const nouveauCompte = {
    compte: finalCompteName,
    groupe: e.target.elements["compteGroupe"].value.trim().toUpperCase(),
    solde: parseFloat(e.target.elements["compteSolde"]?.value) || 0,
    taux: e.target.elements["compteTaux"] ? (parseFloat(e.target.elements["compteTaux"].value) || 0) : 0,
    objectif: 0,
    couleur: newCompteColor,
    utilisateur: user,
    powens_name: creationPowensName || null 
  };

  try {
    await api.post(`/config-comptes`, nouveauCompte);
    e.target.reset(); 
    setCompteName(""); 
    setSelectedType(""); 
    setNewCompteColor("#6366f1"); 
    setCreationPowensName(""); 
    setShowAddPicker(false);
    
    // 🟢 EN MODE AUTO : Réconciliation immédiate des virements + recalibrage des soldes
    if (importMode === 'auto') {
      try {
        await api.post(`/powens/sync-user/${user}`);
        await api.post(`/powens/reconcile-and-recalculate/${user}`);
        await fetchTransactions();
        await fetchComptes();

        setCelebrationModal({
          show: true,
          accountName: finalCompteName,
          count: toutesLesTransactions.length
        });
      } catch (syncErr) {
        console.error("Échec du recalibrage automatique:", syncErr);
      }
    } else {
      await fetchComptes();   
      await fetchCategories(); 
    }
  } catch (err) {
    toast.error("Erreur lors de l'ajout du compte.");
  }
};


  // Fonction pour mettre à jour un compte au moment où on finit de taper
  const handleBlurUpdate = async (compteModifie) => {
    try {
      // On nettoie le nom pour l'URL au cas où
      const compteName = compteModifie.compte.trim(); 
      await api.put(`/config-comptes/${compteName}`, compteModifie);
      fetchComptes(); // Optionnel : rafraîchir pour être sûr d'avoir les données du serveur
    } catch (err) {
      console.error("Erreur de sauvegarde automatique", err);
    }
  };



// 🟢 NE ROUVRE PAS LA MODALE SI ON REVIENT DE POWENS OU SI UNE BANQUE EST DÉJÀ LIÉE
const fetchTransactions = async () => {
  try {
    const res = await api.get(`/transactions/${user}`);
    const transactionsList = res.data || [];
    setToutesLesTransactions(transactionsList);

    // Vérifications contextuelles
    const urlParams = new URLSearchParams(window.location.search);
    const isReturningFromPowens = urlParams.has('code') || urlParams.has('connection_id');
    const hasPowensToken = Boolean(localStorage.getItem("powens_connecte"));
    const hasPassedOnboarding = localStorage.getItem(`onboarding_done_${user}`) === 'true';

    // 🟢 La modale ne s'ouvre QUE pour un premier accès réel (pas au retour de Powens)
    if (
      transactionsList.length === 0 &&
      !onboardingDismissed &&
      !isReturningFromPowens &&
      !hasPowensToken &&
      !hasPassedOnboarding
    ) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  } catch (err) {
    console.error("Erreur fetch:", err);
  }
};



const [loginPassword, setLoginPassword] = useState(''); // Ajoute cette ligne








const handleLogout = () => {
  // 1. Nettoyage impératif des clés résiduelles dans le navigateur
  localStorage.removeItem('user');
  localStorage.removeItem('powens_connecte'); // 👈 Évite de transmettre le jeton au prochain utilisateur
  localStorage.removeItem('token');

  // 2. Réinitialisation des états pour la session suivante
  setUser(null);
  setImportMode('manual'); // 👈 Réinitialise impérativement à 'manual'
  setComptes([]);
  setPowensData({ connections_count: 0, connections: [], accounts_count: 0, accounts: [] }); // 👈 Vide les banques connectées
  setShowOnboarding(false);
  setOnboardingDismissed(false);
  setLoading(true);
  setLoginName('');
  setLoginPassword('');
};








useEffect(() => {
  const fetchPeriods = async () => {
    try {
      const res = await api.get(`/dashboard/periodes/${user}`);
      setAvailablePeriods(res.data);
      // Suppression du setFilters d'ici pour éviter les doublons de logique
    } catch (err) {
      console.error("Erreur périodes:", err);
    }
  };

  if (user) {
    fetchPeriods();
  }
}, [user, toutesLesTransactions]);

// --- 1. CHARGEMENT AU CHANGEMENT D'UTILISATEUR ---
useEffect(() => {
  if (!user) return;
  const u = typeof user === 'string' ? user.toLowerCase() : user?.nom?.toLowerCase();
  const saved = localStorage.getItem(`filters_v3_${u}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setFiltersByPage({
        dashboard: parsed.dashboard || getDefaultPeriod(),
        previsionnel: parsed.previsionnel || parsed.previsions || getDefaultPeriod(),
        gerer: parsed.gerer || parsed.transactions || getDefaultPeriod(),
        default: parsed.default || getDefaultPeriod()
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }

  const def = getDefaultPeriod();
  setFiltersByPage({
    dashboard: { ...def },
    previsionnel: { ...def },
    gerer: { ...def },
    default: { ...def }
  });
}, [user]);

// --- 2. INITIALISATION DOUCE (PRÉVISIONNEL = MOIS/ANNÉE EN COURS) ---
useEffect(() => {
  if (comptes.length === 0) return;

  const targetKey = getPageKey(activeTab);
  const currentF = filtersByPage[targetKey];

  // Si la page a déjà ses filtres enregistrés, ON NE TOUCHE À RIEN
  if (currentF && currentF.profil && currentF.profil !== '' && currentF.annee && currentF.mois) {
    return;
  }

  const groupesUniques = [...new Set(comptes.map(c => c.groupe).filter(Boolean))].sort();
  const profilInitial = groupesUniques.length > 0 ? groupesUniques[0] : 'Tous';

  const now = new Date();
  const moisEnCours = moisListe[now.getMonth()]?.v || 'Janvier';
  const anneeEnCours = now.getFullYear().toString();

  // 🟢 SPÉCIFIQUE AU PRÉVISIONNEL : Mois et Année actuels par défaut
  if (targetKey === 'previsionnel') {
    setFilters({
      profil: profilInitial,
      annee: anneeEnCours,
      mois: moisEnCours
    });
    return;
  }

  // Pour les autres pages (Dashboard, Gérer), on prend la dernière période des transactions
  if (availablePeriods.length > 0) {
    const periodesTriees = [...availablePeriods].sort((a, b) => {
      const yearA = parseInt(a.annee);
      const yearB = parseInt(b.annee);
      if (yearB !== yearA) return yearB - yearA;
      const indexA = moisListe.findIndex(m => m.v === a.mois);
      const indexB = moisListe.findIndex(m => m.v === b.mois);
      return indexB - indexA;
    });
    const dernierePeriode = periodesTriees[0];

    if (dernierePeriode) {
      setFilters({
        profil: profilInitial,
        annee: dernierePeriode.annee.toString(),
        mois: dernierePeriode.mois
      });
    }
  }
}, [availablePeriods, comptes, activeTab]);



const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'previsionnel', label: 'Prévisionnel', icon: ChartCandlestick },
  { id: 'gerer', label: 'Gérer', icon: Settings2 },
  { id: 'importer', label: 'Importer', icon: FileUp },
  { id: 'comptes', label: 'Comptes', icon: Wallet },
  { id: 'tricount', label: 'Tricount', icon: Users2 },
  { id: 'theme', label: 'Thème', icon: Palette },
  { id: 'Guide', label: 'Guide', icon: FileText },
  { id: 'demenagement', label: 'Déménagement', icon: Truck },
  { id: 'conges', label: 'Congés', icon: CalendarDays }, // 👈 Ajout ici
];

const [hiddenPages, setHiddenPages] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('hidden_menu_pages') || '[]');
  } catch (e) {
    return [];
  }
});

const visibleMenuItems = menuItems.filter(item => {
  if (hiddenPages.includes(item.id)) {
    return false;
  }

  // 🟢 Pages réservées exclusivement aux administrateurs (Thème, Déménagement, Congés)
  if (item.id === 'theme' || item.id === 'demenagement' || item.id === 'conges') {
    return userRole === 'admin'; // 👈 Fini 'theo', vérifie le vrai rôle !
  }
  
  return true;
});





// 🟢 PARADE : Liste des groupes sans "Tous" avec secours automatique
const groupesDisponibles = useMemo(() => {
  const list = [...new Set(comptes.map(c => c.groupe).filter(Boolean))].sort();
  if (list.length > 0) return list;
  // S'il n'y a encore aucun groupe en base :
  return [user ? user.charAt(0).toUpperCase() + user.slice(1) : 'Personnel'];
}, [comptes, user]);

// 🟢 Redirection automatique si le cache contenait encore 'Tous'
useEffect(() => {
  if (comptes.length > 0 && (filters.profil === 'Tous' || !filters.profil)) {
    setFilters(f => ({ ...f, profil: groupesDisponibles[0] }));
  }
}, [comptes, filters.profil, groupesDisponibles]);

// 🟢 Comptes du profil avec secours si aucun groupe n'est encore configuré
const { allPrevisionsAnnee, chartData, cleanMonth, comptesDuProfil, epargneCumuleeAnnuelle, financeData, getTxYear, handleDragEnd, objectifAnnuelGlobal, pourcentageAnnuel, recapAnnuelStats, setallPrevisionsAnnee, soldeGlobal, soldePremierJanvier, soldesTries, statsCategories, tauxEpargneMoyen, totauxAnnuels } = useAnalyseFinanciere({ comptes, filters, hiddenCategories, moisListe, ordreComptes, setOrdreComptes, toutesLesTransactions });


// 1. On crée l'espace de stockage local
const { budgetGauges, budgetToDelete, budgets, confirmDelete2, editingBudget, executeDeleteBudget, formBudget, handleAddBudget, handleUpdateBudget, optionsAnnees, selectedBudgetYear, setBudgetToDelete, setEditingBudget, setFormBudget, setSelectedBudgetYear, setShowBudgetDetails, showBudgetDetails } = useBudgets({ activeTab, comptesDuProfil, filters, statsCategories, toutesLesTransactions, user }); // On ajoute activeTab ici



const { addCategory, catToDelete, categoriesVisibles, confirmDeletecat, elementsAppris, fetchCategories, fetchMemoire, handleAssignGroup, handleDeleteGroup, handleDeleteMemory, handleDeleteSelected, handleSort, handleUpdateCategory, isApprendreActive, newTx, removeCategory, selectedDate, selectedIds, setIsApprendreActive, setNewTx, setSelectedDate, setSelectedIds, setShowDeleteConfirm, setUserManagedGroups, showDeleteConfirm, sortConfig, statsFiltrées, submitQuickTransaction, toggleAll, toggleSelect, toggleVisibility, transactionsAAfficher, updateCell, userManagedGroups } = useTableauTransactions({ cleanMonth, comptes, fetchTransactions, filters, financeData, getTxYear, masquees, moisListe, projets, selectedCompte, setCategoriesPerso, setEditingCat, setMasquees, setToutesLesCategories, setToutesLesTransactions, soldesTries, toutesLesCategories, toutesLesTransactions, user });

const [tempTransactions, setTempTransactions] = useState([]);




useEffect(() => {
  if (comptes.length > 0 && !importCompte) {
    setImportCompte(comptes[0].compte);
  }
}, [comptes, importCompte]);


const [isDragging, setIsDragging] = useState(false);

const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    // 🟢 Accepte désormais .csv, .ofx, .qif et .qfx
    const validExtensions = ['.csv', '.ofx', '.qif', '.qfx'];
    const isSupported = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isSupported) {
      handleFileUpload(file);
    } else {
      toast.error("Format non supporté : déposez un fichier .csv, .ofx ou .qif");
    }
  };






// 1. L'état (Inchangé)
const { activeCategoryData, categoriesPourIntelligence, fetchCategoriesConfig, handleAddKeyword, handleRemoveKeyword, intelSelectedCat, setIntelSelectedCat, setSignType, signType, transactionsCalculees } = useMotsCles({ comptes, elementsAppris, importCompte, masquees, tempTransactions, toutesLesCategories, user });

const { checkNewTransactions, confirmBatchImport, fetchPowensConnections, handleAssociateAccount, handleConnectNewBank, handleFileUpload, handlePowensImportSuccess, handleSyncPowens, hasPendingSync, isCheckingSync, isManualSyncing, isSyncingData, isSyncingPowens, loading, powensData, scaExpiredConnection, setFileName, setIsManualSyncing, setLoading, setPowensData, setScaExpiredConnection, setShowPowensModal, showPowensModal, syncCountByAccount } = useConnexionBancaire({ activeTab, comptes, fetchCategoriesConfig, fetchComptes, fetchTransactions, importCompte, importMode, selectedCompte, setActiveTab, setCelebrationModal, setImportMode, setOnboardingDismissed, setShowOnboarding, setTempTransactions, toutesLesTransactions, transactionsCalculees, user });



const { chartDataPrevisions, duplicateModal, epargneProjeteeTotale, epargneReelleCumulee, excludedMonths, handleAddPrevision, handleConfirmDuplicate, handleDeleteSelected2, handleTryDuplicate, loadPrevisions, moisDisponibles, newPrevi, optionsComptes, pctProjete, pctReel, previsionsFiltrees, recapPrevisionsStats, selectedIds2, setDuplicateModal, setExcludedMonths, setNewPrevi, setSelectedIds2, soldeGlobalProjete, soldesPrevisionnels, statsEpargnePrevisionnelle, toggleAll2, toggleSelect2, updatePrevision } = usePrevisions({ allPrevisionsAnnee, cleanMonth, comptes, filters, moisListe, objectifAnnuelGlobal, recapAnnuelStats, setDuplicateType, setallPrevisionsAnnee, soldesTries, toutesLesTransactions, user });


// --- 1. Tes States (Assure-toi que l'ordre est respecté) ---
const { allocations, fetchAllocations, setAllocations } = useEnveloppes({ filters, soldeGlobal });


const [deleteModal3, setDeleteModal3] = useState({ show: false, projetNom: null });





const [note, setNote] = useState(""); // Initialise avec une chaîne vide




const [showLearningList, setShowLearningList] = useState(false);



const [searchTerm, setSearchTerm] = useState("");

// Ensuite, filtre tes transactions avant l'affichage
const transactionsFiltrees = transactionsAAfficher.filter(t => 
  t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
  t.categorie?.toLowerCase().includes(searchTerm.toLowerCase())
);

const [annualTab, setAnnualTab] = useState('list'); // 'list' sera la vue par défaut
const statsAnnuellesCategories = useMemo(() => {
  const recap = {};
  let totalAnnuel = 0;

  // 1. IDENTIFIER LES COMPTES APPARTENANT AU PROFIL (Comme dans ton tableau)
  const comptesDuProfil = comptes.filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  // 2. FILTRER LES TRANSACTIONS PAR ANNÉE ET PAR COMPTES DU PROFIL
  const transAnnee = (toutesLesTransactions || []).filter(t => {
    const matchAnnee =filters.annee.toString().trim();
    // La transaction appartient au profil si son compte est dans la liste nomsComptesProfil
    const matchCompteProfil = nomsComptesProfil.includes(t.compte?.trim().toUpperCase());
    
    return matchAnnee && matchCompteProfil;
  });

  // 3. CALCULER LA RÉPARTITION
  transAnnee.forEach(t => {
    const montant = parseFloat(t.montant) || 0;
    const cat = t.categorie || "Autre";
    const estTransfert = estTransfertInterne(t.nom, t.categorie);

    // On ne prend que les dépenses (montant < 0)
    if (montant < 0 && !estTransfert) {
      const absMontant = Math.abs(montant);
      recap[cat] = (recap[cat] || 0) + absMontant;
      totalAnnuel += absMontant;
    }
  });

  // 4. FORMATAGE POUR RECHARTS
  return Object.entries(recap)
    .map(([name, value]) => ({
      name,
      value,
      percent: totalAnnuel > 0 ? Math.round((value / totalAnnuel) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

}, [toutesLesTransactions, comptes, filters.annee, filters.profil]); 
// On dépend bien de 'comptes' aussi car c'est lui qui définit le profil !

// 🟢 Référence du conteneur de défilement du tableau
  const tableContainerRef = useRef(null);

  // 🟢 Virtualiseur de lignes de transactions Desktop
  const rowVirtualizer = useVirtualizer({
    count: transactionsFiltrees.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 54, // Hauteur moyenne d'une ligne en pixels
    overscan: 10,           // Pré-rend 10 lignes en avance pour un scroll 100% fluide
  });


const [assistantData, setAssistantData] = useState({ open: false, compte: null, valeur: "" });
const openCalculateurAssistant = (compte) => {
  setAssistantData({ open: true, compte: compte, valeur: "" });
};
const confirmerCalculAssistant = async () => {
  const { compte, valeur } = assistantData;
  const montantSaisi = parseFloat(valeur.replace(',', '.'));

  if (isNaN(montantSaisi)) {
    toast.error( "Veuillez saisir un montant valide");
    return;
  }

  const totalTransactions = (toutesLesTransactions || [])
    .filter(t => t.compte?.trim().toUpperCase() === compte.compte.trim().toUpperCase())
    .reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);

  const nouveauSoldeInitial = Math.round((montantSaisi - totalTransactions) * 100) / 100;

  try {
    const nouveauxComptes = comptes.map(c => 
      c.compte === compte.compte ? { ...c, solde: nouveauSoldeInitial } : c
    );
    
    setComptes(nouveauxComptes);
    await handleBlurUpdate({ ...compte, solde: nouveauSoldeInitial });

    toast.success(`Solde initial ajusté : ${nouveauSoldeInitial.toLocaleString('fr-FR')}€`);
    
    // Fermer la modale
    setAssistantData({ open: false, compte: null, valeur: "" });
    
    
  } catch (err) {
    toast.error("Erreur lors de la sauvegarde");
  }
};


// État pour afficher ou masquer le popup flash
const [showPatchModal, setShowPatchModal] = useState(false);

// Version du patch actuel (le compteur se reset tout seul si tu changes cette valeur !)
const CURRENT_VERSION = "4.3"; 

useEffect(() => {
  if (!user) return;

  // En incluant CURRENT_VERSION dans la clé, on crée un compteur unique par mise à jour
  const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
  const viewCount = parseInt(localStorage.getItem(patchKey)) || 0;

  // On l'affiche tant qu'on n'a pas atteint la limite (ici, 2 fois)
  if (viewCount < 1) {
    const timer = setTimeout(() => {
      setShowPatchModal(true);
    }, 1500);

    return () => clearTimeout(timer);
  }
}, [user, CURRENT_VERSION]); // Ajout de CURRENT_VERSION dans les dépendances par sécurité

const handleClosePatchModal = () => {
  setShowPatchModal(false);

  // On incrémente sur la clé qui contient la version actuelle
  const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
  const currentCount = parseInt(localStorage.getItem(patchKey)) || 0;
  localStorage.setItem(patchKey, currentCount + 1);
};


 // 'bottom' ou 'top'

// Variable de verrouillage

// =========================================================================
// 🟢 SYNCHRONISATION SAINE AU CLIC (ZÉRO BOUCLE INFINIE)
// =========================================================================
const handleProfilChange = (nouveauProfil) => {
  setFilters(f => ({ ...f, profil: nouveauProfil }));

  if (nouveauProfil === 'Tous') {
    setSelectedCompte('tous');
  } else {
    // Sélectionne automatiquement le CCP ou 1er compte du nouveau profil
    setSelectedCompte(getCompteDefaut(nouveauProfil, comptes));
  }
};


const handleCompteChange = (nouveauCompte) => {
  setSelectedCompte(nouveauCompte);

  // Si on choisit un compte précis, on aligne le profil sur son groupe automatiquement
  if (nouveauCompte !== 'tous') {
    const compteTrouve = comptes.find(c => c.compte?.trim().toUpperCase() === nouveauCompte?.trim().toUpperCase());
    if (compteTrouve && compteTrouve.groupe) {
      setFilters(f => ({ ...f, profil: compteTrouve.groupe }));
    }
  }
};



// 1. États locaux pour la période (on stocke les valeurs "v" de moisListe, ex: "01", "02"...)
const [moisDebut, setMoisDebut] = useState("Janvier");
const [moisFin, setMoisFin] = useState(filters.mois || "12"); 

// 2. État pour l'onglet actif ('annuel' ou 'periode')
const [totalTab, setTotalTab] = useState('annuel');
// 3. Calcul automatique basé sur ton tableau recapAnnuelStats
// 🟢 2. CALCUL DE L'ONGLET "PÉRIODE" (Ex: De Janvier à Septembre ou Octobre)
const donneesPeriodeDirecte = useMemo(() => {
  const libelleDebut = moisListe.find(m => m.v === moisDebut)?.l?.toLowerCase();
  const libelleFin = moisListe.find(m => m.v === moisFin)?.l?.toLowerCase();

  const listeNomsMois = moisListe.map(m => m.l?.toLowerCase());
  const idxDebut = listeNomsMois.indexOf(libelleDebut);
  const idxFin = listeNomsMois.indexOf(libelleFin);

  const idxMin = Math.min(idxDebut, idxFin);
  const idxMax = Math.max(idxDebut, idxFin);

  const moisSelectionnes = (recapAnnuelStats || []).filter(m => {
    const currentIdx = listeNomsMois.indexOf(m.nom?.toLowerCase());
    return currentIdx >= idxMin && currentIdx <= idxMax;
  });

  let revenus = 0;
  let depenses = 0;
  let epargne = 0;

  moisSelectionnes.forEach(m => {
    let rev = 0;
    let dep = 0;

    if (m.isPasseCloture) {
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    } else if (m.isMoisEnCours) {
      rev = m.revPrevu !== null ? m.revPrevu : (m.revReel || 0);
      dep = m.depPrevu !== null ? m.depPrevu : (m.depReel || 0);
    } else if (m.isFutur) {
      rev = m.revPrevu !== null ? m.revPrevu : 0;
      dep = m.depPrevu !== null ? m.depPrevu : 0;
    } else {
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    }

    revenus += rev;
    depenses += dep;
    epargne += (rev - dep);
  });

  const tauxEffort = revenus > 0 ? Math.max(0, Math.round((epargne / revenus) * 100)) : 0;

  return {
    revenus,
    depenses,
    epargne,
    tauxEffort
  };
}, [recapAnnuelStats, moisDebut, moisFin, moisListe]);

const estPeriode = totalTab === 'periode';
const donneesAffichees = estPeriode ? donneesPeriodeDirecte : {
  revenus: totauxAnnuels.revenus,
  depenses: totauxAnnuels.depenses,
  epargne: totauxAnnuels.epargne,
  tauxEffort: tauxEpargneMoyen
};


const TAB_CONFIG = {
  revenus: { icon: ArrowUpCircle, label: 'Revenus', className: '' },
  depenses: { icon: ArrowDownCircle, label: 'Dépenses', className: '' },
  transferts: { icon: RefreshCw, label: 'Transferts', className: '' },
  // ✅ Désormais synchronisé sur ton point de rupture exact (2000px)
  Catégories: { icon: BarChartHorizontal, label: 'Catégories', className: 'min-[2000px]:hidden' }, 
  Variations: { icon: TrendingUp, label: 'Variations', className: '' },
  flash: { icon: Zap, label: 'Insights', className: '' }
};



useEffect(() => {
  // 1. On crée le media query calqué sur ton point de rupture de 2000px
  const mediaQuery = window.matchMedia('(min-width: 2000px)');

  // 2. La fonction qui vérifie si on doit réinitialiser l'onglet
  const handleScreenChange = (e) => {
    // Si l'écran est grand ET que l'onglet actif est 'Catégories' (qui va disparaître)
    if (e.matches && tabActive === 'Catégories') {
      setTabActive('revenus'); // On bascule sur le 1er onglet par défaut
    }
  };

  // 3. On exécute la vérification au montage initial
  handleScreenChange(mediaQuery);

  // 4. On écoute les changements de taille d'écran (resize / changement de moniteur)
  mediaQuery.addEventListener('change', handleScreenChange);

  // Clean-up à la destruction du composant
  return () => mediaQuery.removeEventListener('change', handleScreenChange);
}, [tabActive]); // On re-déclenche si tabActive change pour garder la logique synchrone



const { activeIndex, carouselRef, handleScroll, navigateCarousel, scrollToPage, totalDots } = useCarrousel({ budgetGauges });


const [selectedBudgetMonth, setSelectedBudgetMonth] = useState('');

// 💡 Tri chronologique strict des mois (Janvier -> Décembre)
const listeMoisDisponibles = useMemo(() => {
  const getMonthIndex = (monthStr) => {
    if (!monthStr) return 999;
    const clean = monthStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const order = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    const idx = order.indexOf(clean);
    return idx === -1 ? 999 : idx;
  };

  const anneeCible = selectedBudgetYear || new Date().getFullYear();
  const budgetsDeLAnnee = budgets.filter(b => (b.annee || new Date().getFullYear()) === anneeCible);
  const source = budgetsDeLAnnee.length > 0 ? budgetsDeLAnnee : budgets;

  return Array.from(new Set(source.map(b => b.mois).filter(Boolean)))
    .sort((a, b) => getMonthIndex(a) - getMonthIndex(b));
}, [budgets, selectedBudgetYear]);

// Sélectionne automatiquement le mois actif ou le premier mois chronologique
useEffect(() => {
  if (listeMoisDisponibles.length > 0) {
    if (!selectedBudgetMonth || !listeMoisDisponibles.includes(selectedBudgetMonth)) {
      if (filters?.mois && listeMoisDisponibles.includes(filters.mois)) {
        setSelectedBudgetMonth(filters.mois);
      } else {
        setSelectedBudgetMonth(listeMoisDisponibles[0]);
      }
    }
  }
}, [listeMoisDisponibles, selectedBudgetMonth, filters?.mois]);

// 🟢 Détection insensible à la casse pour autoriser le défilement sur les pages longues
const isPageScrollable = [
  'demenagement', 
  'guide', 
  'tricount', 
  'profile', 
  'conges',
  'theme'
].includes(activeTab?.toLowerCase());


// État pour le premier graphique (Annuel)
const [visibleAnnuel, setVisibleAnnuel] = useState({
  revenus: true,
  depenses: true,
  epargne: true
});


// 💡 AJOUT : Détection de l'écran de PC standard 1080p pour le mode compact
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkScreenSize = () => {
        const width = window.innerWidth;
        // Compact uniquement sur écran de bureau classique 1080p (entre 1024px et 1999px)
        setIsCompact(width >= 1024 && width < 2000);
      };
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);





// 2. Déclencheur pour la propagation sur l'année complète (mois restants)
const handleTryPropagateYear = () => {
  if (selectedIds2.length === 0) {
    toast.info("Sélectionnez au moins une prévision à propager.");
    return;
  }
  setDuplicateType('year');
  setDuplicateModal({ 
    show: true, 
    count: selectedIds2.length, 
    isSelection: true 
  });
};

// 3. Fonction d'exécution de la propagation annuelle (avec loadPrevisions() de recharge !)
const confirmPropagateToYear = async () => {
  try {
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;

    const response = await api.post(`/api/previsions/propagate-year`, {
      ids: selectedIds2,
      utilisateur: nomUtilisateur,
      mois_actuel: filters.mois,
      annee: filters.annee.toString()
    });

    if (response.data.status === "success") {
      setSelectedIds2([]); // Vider les cases cochées
      
      // 💡 CORRECTION : Appel de votre vraie fonction de rafraîchissement
      await loadPrevisions(); 
      
      // Utilisation de votre système de toasts d'origine
      toast.success(`${response.data.inserted_count} prévisions propagées sur l'année avec succès !`);
     
    }
  } catch (err) {
    console.error("Erreur de propagation :", err);
    toast.error("Impossible de propager les prévisions sur l'année.");
    
  }
};



// Ajoutez cet état dans votre composant principal `FinanceApp`


// Effet pour détecter si l'utilisateur n'a aucun compte configuré
useEffect(() => {
  if (user && comptes.length === 0 && !loading && !onboardingDismissed) {
    setShowOnboarding(true);
  }
}, [comptes, loading, user, onboardingDismissed]); // 🟢 Ajout de onboardingDismissed dans les dépendances

const handleChooseMode = async (mode) => {
  try {
    const usernameClean = typeof user === 'object' ? user.nom : user;
    
    // 🟢 encodeURIComponent pour gérer proprement les pseudos avec espaces (ex: "test 2")
    await api.put(`/profile/${encodeURIComponent(usernameClean)}/import-mode`, { import_mode: mode });
    setImportMode(mode); 
    
    setOnboardingDismissed(true);
    setShowOnboarding(false);
    
    if (mode === 'auto') {
      const token = localStorage.getItem('powens_connecte');
      if (token) {
        setActiveTab('comptes'); 
      }
      handleSyncPowens(mode); 
    } else {
      setActiveTab('comptes'); 
    }
  } catch (err) {
    console.error("Erreur mode onboarding:", err);
  }
};



// Ajoutez cet effet de synchronisation dans FinanceApp
useEffect(() => {
  if (user) {
    api.get(`/profile/${user}`).then(res => {
      if (res.data?.import_mode) {
        setImportMode(res.data.import_mode);
      }
    });
  }
}, [user]);


// 🟢 SYNCHRONISATION EN ARRIÈRE-PLAN PLANIFIÉE (TOUTES LES 6 HEURES)
const performBackgroundSyncIfNeeded = useCallback(async (forcedMode = null) => {
  const activeMode = forcedMode || importMode;
  if (!user || activeMode !== 'auto') return;

  const token = localStorage.getItem('powens_connecte');
  if (!token) return;

  const now = Date.now();
  const lastSyncStr = localStorage.getItem(`last_powens_sync_time_${user}`);
  const sixHoursInMs = 6 * 60 * 60 * 1000;

  if (!lastSyncStr || (now - parseInt(lastSyncStr, 10)) > sixHoursInMs || forcedMode) {
    // 🟢 1. Active l'indicateur visuel au démarrage
    setIsAutoSyncingOnLoad(true);

    try {
      await api.post(`/powens/sync-user/${user}`);
      await api.post(`/powens/recalculate-balances/${user}`);
      localStorage.setItem(`last_powens_sync_time_${user}`, now.toString());
      
      await fetchTransactions();
      await fetchComptes();
      await fetchPowensConnections();
    } catch (err) {
      console.error("Erreur lors de la synchronisation d'arrière-plan:", err);
    } finally {
      // 🟢 2. Masque l'indicateur avec un léger délai pour confirmer la fin
      setTimeout(() => {
        setIsAutoSyncingOnLoad(false);
      }, 1500);
    }
  }
}, [user, importMode, fetchTransactions, fetchComptes, fetchPowensConnections]);
/*
// Effet pour surveiller et déclencher le cycle de vérification
useEffect(() => {
  if (user && importMode === 'auto') {
    // Vérification immédiate lors de l'ouverture du site
    performBackgroundSyncIfNeeded();

    // Vérification récurrente toutes les 30 minutes pendant que l'onglet reste ouvert
    const interval = setInterval(() => {
      performBackgroundSyncIfNeeded();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }
}, [user, importMode, performBackgroundSyncIfNeeded]);
*/
// État pour le deuxième graphique (Détaillé)
// On stocke ici les noms des comptes masqués sous forme de tableau ou d'objet
const [hiddenComptes, setHiddenComptes] = useState({});

const [isAutoSyncingOnLoad, setIsAutoSyncingOnLoad] = useState(false);


const previsionsTracking = useMemo(() => {
  const map = {};

  (allPrevisionsAnnee || []).forEach(p => {
    const prevMontantAbs = Math.abs(parseFloat(p.montant) || 0);
    map[p.id] = {
      prev: p,
      prevMontant: prevMontantAbs,
      consomme: 0,
      nbTransactions: 0,
      transactions: []
    };
  });

  (toutesLesTransactions || []).forEach(t => {
    if (t.prevision_id && map[t.prevision_id]) {
      const montantTx = Math.abs(parseFloat(t.montant) || 0);
      map[t.prevision_id].consomme += montantTx;
      map[t.prevision_id].nbTransactions += 1;
      map[t.prevision_id].transactions.push(t);
    }
  });

  Object.keys(map).forEach(id => {
    const item = map[id];
    // 🟢 Arrondi strict à 2 décimales pour éliminer les micro-décimales parasites
    item.consomme = Math.round(item.consomme * 100) / 100;
    item.restant = Math.round((item.prevMontant - item.consomme) * 100) / 100;
    
    // 🟢 Nouveaux états précis
    item.isComplet = Math.abs(item.restant) < 0.01;      // Exactement 0€ d'écart
    item.depasse = item.restant < -0.01;                  // Dépassé UNIQUEMENT si strictement supérieur au montant
    item.pct = item.prevMontant > 0 
      ? Math.min(100, Math.round((item.consomme / item.prevMontant) * 100)) 
      : 0;
  });

  return map;
}, [allPrevisionsAnnee, toutesLesTransactions]);



// 1. États pour la création

// 2. États pour la modification d'une catégorie existante
const [showEditIconPicker, setShowEditIconPicker] = useState(false);
const [showEditColorPicker, setShowEditColorPicker] = useState(false);


const [isRefreshingPowens, setIsRefreshingPowens] = useState(false);

const handleForceRefreshPowens = async () => {
  if (isRefreshingPowens) return;
  setIsRefreshingPowens(true);

  // 1. On démarre le toast de chargement infini et on récupère son identifiant
  const toastId = toast.loading("Interrogation de votre banque en direct... ⏳", {
    description: "Connexion sécurisée aux serveurs bancaires"
  });

  try {
    // 🟢 1. Déclenche la connexion réelle de Powens auprès de vos serveurs bancaires
    await api.post(`/powens/refresh-bank-sync/${user}`);

    // 🟢 2. Si vous êtes en mode automatique, on importe les nouvelles transactions immédiatement
    if (importMode === 'auto') {
      await api.post(`/powens/sync-user/${user}`);
      await api.post(`/powens/recalculate-balances/${user}`);
      await fetchTransactions();
    }

    // 🟢 3. Rafraîchissement des soldes et du détecteur de nouvelles écritures
    await Promise.all([
      fetchPowensConnections(),
      checkNewTransactions(),
      fetchComptes()
    ]);

    // 2. Le toast de chargement se transforme instantanément en succès ✨
    toast.success("Banque interrogée et données synchronisées ! ⚡", {
      id: toastId, // 👈 C'est cet id qui remplace le message en cours
      description: "Vos soldes et transactions sont à jour"
    });

  } catch (err) {
    console.error("Erreur lors de l'actualisation manuelle :", err);
    
    // 3. En cas d'échec, il se transforme en erreur ❌
    toast.error("Impossible d'interroger la banque pour le moment.", {
      id: toastId, // 👈 Remplace le message en cours
      description: "Veuillez réessayer dans quelques instants"
    });

  } finally {
    setIsRefreshingPowens(false);
  }
};

// =========================================================================
// 🟢 NAVIGATION FLUIDE À LA MOLETTE DE LA SOURIS (WHEEL NAVIGATION)
// =========================================================================
const { handleWheelAnnee, handleWheelAnnualTab, handleWheelMois, handleWheelNavTabs, handleWheelProfil, handleWheelRightTab, handleWheelTabActive } = useMolette({ TAB_CONFIG, activeRightTab, activeTab, annualTab, availablePeriods, filters, groupesDisponibles, moisListe, setActiveRightTab, setActiveTab, setAnnualTab, setFilters, setSearchTerm, setTabActive, tabActive, visibleMenuItems });


// 🟢 Récupération des pages masquées depuis PostgreSQL
  const fetchHiddenPages = async (username) => {
    try {
      const res = await api.get(`/api/pages-masquees/${username}`);
      if (Array.isArray(res.data)) {
        setHiddenPages(res.data);
        localStorage.setItem('hidden_menu_pages', JSON.stringify(res.data));
      }
    } catch (err) {
      console.error("Erreur chargement pages masquées BDD:", err);
    }
  };

// 🟢 CHARGEMENT SÉCURISÉ AU DÉMARRAGE DE L'APPLICATION
useEffect(() => {
  if (user) {
    fetchTransactions();
    fetchComptes();
    fetchUserTheme(user);
    fetchPowensConnections();
    fetchHiddenPages(user);
    api.get(`/note/${user}`).then(res => setNote(res.data.texte));
    
    // 🟢 Récupération officielle du profil (mode d'import + rôle)
    api.get(`/profile/${user}`).then(res => {
      // 1. Mise à jour du rôle utilisateur (admin / user)
      if (res.data?.role) {
        const roleCharge = res.data.role.toLowerCase();
        setUserRole(roleCharge);
        localStorage.setItem('role', roleCharge);
      }

      // 2. Gestion du mode d'import
      const modeBDD = res.data?.import_mode || 'manual';
      setImportMode(modeBDD);

      if (modeBDD === 'auto') {
        performBackgroundSyncIfNeeded('auto');
      }
    }).catch(err => console.error("Erreur profil:", err));
  }
}, [user, fetchPowensConnections]);




if (!user) {
    if (authViewMode) {
      return (
        <div className="relative">
          {/* Bouton retour vers la landing page */}
          <button
            onClick={() => setAuthViewMode(null)}
            className="fixed top-6 left-6 z-50 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider backdrop-blur-[var(--glass-blur)] cursor-pointer transition-all"
          >
            ← Retour à l'accueil
          </button>
          
          <AuthView 
            onLoginSuccess={(token, loggedUser, role) => {
              setUser(loggedUser);
            }} 
            userTheme={userTheme} 
          />
        </div>
      );
    }

    // Affichage de la One Page de présentation par défaut
    return (
      <LandingPage 
        onOpenAuth={(mode) => setAuthViewMode(mode)} 
      />
    );
  }


  return (
    <div 
      className={`p-4 md:p-8 text-[var(--text-main)] transition-colors duration-500 ${
          isPageScrollable 
            ? 'min-h-screen overflow-y-auto' 
            : 'h-screen lg:overflow-hidden'
        }`}
      style={{
        background: themeBackground(userTheme),
        backgroundAttachment: 'fixed'
      }}
    >
      {/* max-w-full permet d'occuper 100% de la largeur disponible, peu importe l'écran */}
      <div className="max-w-full mx-auto">
      
      {/* NAVIGATION GLOBALE */}
          <NavigationPrincipale CURRENT_VERSION={CURRENT_VERSION} activeTab={activeTab} handleLogout={handleLogout} handleWheelNavTabs={handleWheelNavTabs} setActiveTab={setActiveTab} user={user} visibleMenuItems={visibleMenuItems} />


        <main>


{activeTab === 'dashboard' && (
  <DelayedDashboardLoader loading={loading} userTheme={userTheme} filters={filters}>
    <DashboardView 
      filters={filters}
      setFilters={setFilters}
      moisListe={moisListe}
      availablePeriods={availablePeriods}
      groupesDisponibles={groupesDisponibles}
      handleWheelProfil={handleWheelProfil}
      handleWheelMois={handleWheelMois}
      handleWheelAnnee={handleWheelAnnee}
      handleWheelTabActive={handleWheelTabActive}
      handleWheelAnnualTab={handleWheelAnnualTab}
      handleWheelRightTab={handleWheelRightTab}
      userTheme={userTheme}
      soldeGlobal={soldeGlobal}
      soldesTries={soldesTries}
      sensors={sensors}
      handleDragEnd={handleDragEnd}
      SortableAccountCard={SortableAccountCard}
      TAB_CONFIG={TAB_CONFIG}
      tabActive={tabActive}
      setTabActive={setTabActive}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      financeData={financeData}
      statsCategories={statsCategories}
      chartData={chartData}
      hiddenCategories={hiddenCategories}
      toggleCategory={toggleCategory}
      user={user}
      budgetGauges={budgetGauges}
      carouselRef={carouselRef}
      handleScroll={handleScroll}
      totalDots={totalDots}
      activeIndex={activeIndex}
      navigateCarousel={navigateCarousel}
      scrollToPage={scrollToPage}
      setActiveTab={setActiveTab}
      annualTab={annualTab}
      setAnnualTab={setAnnualTab}
      soldePremierJanvier={soldePremierJanvier}
      recapAnnuelStats={recapAnnuelStats}
      statsAnnuellesCategories={statsAnnuellesCategories}
      toutesLesTransactions={toutesLesTransactions}
      comptesDuProfil={comptesDuProfil}
      isCompact={isCompact}
      totalTab={totalTab}
      setTotalTab={setTotalTab}
      estPeriode={estPeriode}
      moisDebut={moisDebut}
      setMoisDebut={setMoisDebut}
      moisFin={moisFin}
      setMoisFin={setMoisFin}
      donneesAffichees={donneesAffichees}
      activeRightTab={activeRightTab}
      setActiveRightTab={setActiveRightTab}
      objectifAnnuelGlobal={objectifAnnuelGlobal}
      epargneReelleCumulee={epargneReelleCumulee}
      epargneProjeteeTotale={epargneProjeteeTotale}
      pctReel={pctReel}
      pctProjete={pctProjete}
      visibleAnnuel={visibleAnnuel}
      setVisibleAnnuel={setVisibleAnnuel}
      comptes={comptes}
      hiddenComptes={hiddenComptes}
      setHiddenComptes={setHiddenComptes}
      allocations={allocations}
      setAllocations={setAllocations}
      projets={projets}
      setProjets={setProjets}
      epargneCumuleeAnnuelle={epargneCumuleeAnnuelle}
      pourcentageAnnuel={pourcentageAnnuel}
      api={api}
      fetchAllocations={fetchAllocations}
      CustomSelect={CustomSelect}
      categoriesVisibles={categoriesVisibles}
      updateCell={updateCell}
    />
  </DelayedDashboardLoader>
)}


{activeTab === 'previsionnel' && (
  <PrevisionsView 
    user={user}
    filters={filters}
    setFilters={setFilters}
    allPrevisionsAnnee={allPrevisionsAnnee}
    comptes={comptes}
    groupesDisponibles={groupesDisponibles}
    handleWheelProfil={handleWheelProfil}
    handleWheelMois={handleWheelMois}
    handleWheelAnnee={handleWheelAnnee}
    moisListe={moisListe}
    availablePeriods={availablePeriods}
    soldeGlobalProjete={soldeGlobalProjete}
    soldesPrevisionnels={soldesPrevisionnels}
    userTheme={userTheme}
    sensors={sensors}
    handleDragEnd={handleDragEnd}
    SortableAccountCard={SortableAccountCard}
    newPrevi={newPrevi}
    setNewPrevi={setNewPrevi}
    handleAddPrevision={handleAddPrevision}
    selectedIds2={selectedIds2}
    handleTryPropagateYear={handleTryPropagateYear}
    handleTryDuplicate={handleTryDuplicate}
    previsionsFiltrees={previsionsFiltrees}
    toggleAll2={toggleAll2}
    toggleSelect2={toggleSelect2}
    updatePrevision={updatePrevision}
    categoriesVisibles={categoriesVisibles}
    optionsComptes={optionsComptes}
    toutesLesTransactions={toutesLesTransactions}
    previsionsTracking={previsionsTracking}
    chartDataPrevisions={chartDataPrevisions}
    moisDisponibles={moisDisponibles}
    excludedMonths={excludedMonths}
    setExcludedMonths={setExcludedMonths}
    recapPrevisionsStats={recapPrevisionsStats}
    objectifAnnuelGlobal={objectifAnnuelGlobal}
    statsEpargnePrevisionnelle={statsEpargnePrevisionnelle}
    pourcentageAnnuel={pourcentageAnnuel}
    CustomSelect={CustomSelect}
    isCompact={isCompact}
  />
)}



 {activeTab === 'gerer' && (
  <GererView 
    filters={filters}
    setFilters={setFilters}
    fetchTransactions={fetchTransactions}
    comptes={comptes}
    soldesTries={soldesTries}
    handleProfilChange={handleProfilChange}
    handleCompteChange={handleCompteChange}
    selectedCompte={selectedCompte}
    setSelectedCompte={setSelectedCompte}
    moisListe={moisListe}
    availablePeriods={availablePeriods}
    statsFiltrées={statsFiltrées}
    isApprendreActive={isApprendreActive}
    setIsApprendreActive={setIsApprendreActive}
    showLearningList={showLearningList}
    setShowLearningList={setShowLearningList}
    elementsAppris={elementsAppris}
    fetchMemoire={fetchMemoire}
    handleDeleteMemory={handleDeleteMemory}
    newTx={newTx}
    setNewTx={setNewTx}
    selectedDate={selectedDate}
    setSelectedDate={setSelectedDate}
    submitQuickTransaction={submitQuickTransaction}
    setShowExportModal={setShowExportModal}
    searchTerm={searchTerm}
    setSearchTerm={setSearchTerm}
    transactionsFiltrees={transactionsFiltrees}
    selectedIds={selectedIds}
    toggleAll={toggleAll}
    toggleSelect={toggleSelect}
    handleSort={handleSort}
    sortConfig={sortConfig}
    updateCell={updateCell}
    categoriesVisibles={categoriesVisibles}
    toutesLesCategories={toutesLesCategories}
    categoriesPerso={categoriesPerso}
    masquees={masquees}
    setMasquees={setMasquees}
    addCategory={addCategory}
    handleUpdateCategory={handleUpdateCategory}
    removeCategory={removeCategory}
    toggleVisibility={toggleVisibility}
    allPrevisionsAnnee={allPrevisionsAnnee}
    allocations={allocations}
    budgets={budgets}
    formBudget={formBudget}
    setFormBudget={setFormBudget}
    handleAddBudget={handleAddBudget}
    showBudgetDetails={showBudgetDetails}
    setShowBudgetDetails={setShowBudgetDetails}
    selectedBudgetYear={selectedBudgetYear}
    setSelectedBudgetYear={setSelectedBudgetYear}
    optionsAnnees={optionsAnnees}
    listeMoisDisponibles={listeMoisDisponibles}
    selectedBudgetMonth={selectedBudgetMonth}
    setSelectedBudgetMonth={setSelectedBudgetMonth}
    editingBudget={editingBudget}
    setEditingBudget={setEditingBudget}
    handleUpdateBudget={handleUpdateBudget}
    confirmDelete2={confirmDelete2}
    CustomSelect={CustomSelect}
    toutesLesTransactions={toutesLesTransactions}
    userManagedGroups={userManagedGroups}
    setUserManagedGroups={setUserManagedGroups}
    handleAssignGroup={handleAssignGroup}
    handleDeleteGroup={handleDeleteGroup}
    user={user}
    fetchCategories={fetchCategories}
  />
)}



{activeTab === 'importer' && (
  <ImportView 
    importCompte={importCompte}
    setImportCompte={setImportCompte}
    selectedCompte={selectedCompte}
    setSelectedCompte={setSelectedCompte}
    comptes={comptes}
    powensData={powensData}
    syncCountByAccount={syncCountByAccount}
    handleAssociateAccount={handleAssociateAccount}
    isRefreshingPowens={isRefreshingPowens}
    isCheckingSync={isCheckingSync}
    handleForceRefreshPowens={handleForceRefreshPowens}
    isSyncingPowens={isSyncingPowens}
    handleConnectNewBank={handleConnectNewBank}
    isManualSyncing={isManualSyncing}
    setIsManualSyncing={setIsManualSyncing}
    isSyncingData={isSyncingData}
    handleSyncPowens={handleSyncPowens}
    hasPendingSync={hasPendingSync}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    isDragging={isDragging}
    setFileName={setFileName}
    handleFileUpload={handleFileUpload}
    transactionsCalculees={transactionsCalculees}
    setTempTransactions={setTempTransactions}
    confirmBatchImport={confirmBatchImport}
    intelSelectedCat={intelSelectedCat}
    setIntelSelectedCat={setIntelSelectedCat}
    categoriesPourIntelligence={categoriesPourIntelligence}
    activeCategoryData={activeCategoryData}
    handleRemoveKeyword={handleRemoveKeyword}
    handleAddKeyword={handleAddKeyword}
    signType={signType}
    setSignType={setSignType}
    CustomSelect={CustomSelect}
  />
)}



        







{activeTab === 'comptes' && (
  <ComptesView 
    comptes={comptes}
    setComptes={setComptes}
    handleAddCompte={handleAddCompte}
    selectedType={selectedType}
    setSelectedType={setSelectedType}
    typeOptions={typeOptions}
    compteName={compteName}
    setCompteName={setCompteName}
    newCompteColor={newCompteColor}
    setNewCompteColor={setNewCompteColor}
    showAddPicker={showAddPicker}
    setShowAddPicker={setShowAddPicker}
    showPicker={showPicker}
    setShowPicker={setShowPicker}
    handleBlurUpdate={handleBlurUpdate}
    openDeleteModal={openDeleteModal}
    openCalculateurAssistant={openCalculateurAssistant}
    handleColorChange={handleColorChange}
    CustomSelect={CustomSelect}
    importMode={importMode}
    powensData={powensData}
    handleAssociateAccount={handleAssociateAccount}
    creationPowensName={creationPowensName}
    setCreationPowensName={setCreationPowensName}
    handleConnectNewBank={handleConnectNewBank}
  />
)}


{activeTab === 'theme' && userRole === 'admin' && (
  <ThemeStudioDesktop 
    user={user}
    updateThemeLive={updateThemeLive}
    handleSaveThemeSQL={handleSaveThemeSQL}
    hiddenPages={hiddenPages}
    setHiddenPages={setHiddenPages}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
    userTheme={userTheme}       // 👈 Vérifiez cette ligne
    setUserTheme={setUserTheme}   // 👈 Vérifiez cette ligne
  />
)}
       


{activeTab === 'Guide' && (
  <div className="w-full">
    {/* 💡 On passe l'état de changement d'onglet pour lier le bouton du bas */}
    <GuideView userTheme={userTheme} setActiveTab={setActiveTab} />
  </div>
)}





{activeTab === 'demenagement' && userRole === 'admin' && (
  <DemenagementPage 
    user={user} 
    toutesLesCategories={toutesLesCategories} 
    comptes={comptes}
  />
)}



{activeTab === 'profile' && (
  <ProfileTab 
    user={user}
    powensData={powensData}
    comptes={comptes}
    syncCountByAccount={syncCountByAccount}
    handleAssociateAccount={handleAssociateAccount}
    setActiveTab={setActiveTab}
    // 🟢 AJOUT DES PROPS DE SYNCHRONISATION :
    importMode={importMode}
    setImportMode={setImportMode}
    onAutoSync={performBackgroundSyncIfNeeded}

    fetchPowensConnections={fetchPowensConnections}
    fetchComptes={fetchComptes}
    handleConnectNewBank={handleConnectNewBank}
  />
)}



      </main>

      </div>


      {/* MODALE D'EXPORTATION COMPTABLE */}
        <ExportModal 
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          toutesLesTransactions={toutesLesTransactions}
          comptes={comptes}
          filters={filters}
          recapAnnuelStats={recapAnnuelStats}
          statsAnnuellesCategories={statsAnnuellesCategories}
        />

{activeTab === 'conges' && userRole === 'admin' && (
  <CongesPage user={user} />
)}

{activeTab === 'tricount' && (
  <div className="w-full"> 
    <TricountManager userId={user} />
  </div>
)}
    


      {/* 💡 Appel unique du menu de widgets centralisé */}
      <UnifiedWidgets 
        user={user} 
        userTheme={userTheme} 
        setUserTheme={setUserTheme} 
      />

      {/* 🟢 INDICATEUR DE SYNCHRONISATION AUTOMATIQUE EN COURS AU DÉMARRAGE */}
      {isAutoSyncingOnLoad && (
        <IndicateurSynchroAuto  />
      )}
     

      {deleteModal.show && (
        <FenetreSuppressionCompte confirmDelete={confirmDelete} deleteModal={deleteModal} setDeleteModal={setDeleteModal} />
      )}



      {/* BARRE D'ACTION FLOTTANTE */}
        {selectedIds.length > 0 && (
          <BarreActionsTransactions handleDeleteSelected={handleDeleteSelected} selectedIds={selectedIds} setSelectedIds={setSelectedIds} />
        )}



        {/* MODALE DE CONFIRMATION CUSTOM */}
          {showDeleteConfirm && (
            <FenetreSuppressionSelection catToDelete={catToDelete} confirmDeletecat={confirmDeletecat} setShowDeleteConfirm={setShowDeleteConfirm} />
          )}



          {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
{budgetToDelete && (
  <FenetreSuppressionBudget budgetToDelete={budgetToDelete} executeDeleteBudget={executeDeleteBudget} setBudgetToDelete={setBudgetToDelete} />
)}


{selectedIds2.length > 0 && (
  <BarreActionsPrevisions handleDeleteSelected2={handleDeleteSelected2} selectedIds2={selectedIds2} setSelectedIds2={setSelectedIds2} />
)}



{/* --- MODAL DE CONFIRMATION PERSONNALISÉ --- */}
{deleteModal3.show && (
  <FenetreSuppressionPrevisions deleteModal3={deleteModal3} fetchAllocations={fetchAllocations} filters={filters} setDeleteModal3={setDeleteModal3} />
)}



{assistantData.open && (
  <AssistantSolde assistantData={assistantData} confirmerCalculAssistant={confirmerCalculAssistant} setAssistantData={setAssistantData} />
)}



{/* --- MODAL DE CONFIRMATION DE DUPLICATION PERSONNALISÉ --- */}
{duplicateModal.show && (
  <FenetreDuplication duplicateModal={duplicateModal} handleConfirmDuplicate={handleConfirmDuplicate} setDuplicateModal={setDuplicateModal} />
)}




{/* =========================================================================
    🎉 NOTES DE PATCH OFFICIELLES v4.3 : DIVISION DE TRANSACTIONS
    ========================================================================= */}
{showPatchModal && (
  <NotesDeVersion CURRENT_VERSION={CURRENT_VERSION} handleClosePatchModal={handleClosePatchModal} />
)}

{/* MODALE SELECTION COMPTE POWENS */}
{showPowensModal && (
  <ImportPowensModal
    banqueConnectee={Boolean(localStorage.getItem('powens_connecte'))}
    utilisateur={typeof user === 'object' ? user.nom : user}
    comptes={comptes}
    toutesLesTransactions={toutesLesTransactions}
    syncCountByAccount={syncCountByAccount} // 👈 Indispensable pour savoir si le compte est à jour
    onClose={() => setShowPowensModal(false)}
    onSuccess={(importedData, targetAccountName) => {
      if (targetAccountName) {
        setImportCompte(targetAccountName);
      }
      handlePowensImportSuccess(importedData, targetAccountName);
    }}
  />
)}



{/* =========================================================================
          💡 MODALE UNIFIÉE DE CONFIRMATION (RECONDUCTION MENSUELLE VS ANNUELLE)
          ========================================================================= */}
      {duplicateModal.show && (
        <FenetreReconduction confirmPropagateToYear={confirmPropagateToYear} duplicateType={duplicateType} filters={filters} handleConfirmDuplicate={handleConfirmDuplicate} selectedIds2={selectedIds2} setDuplicateModal={setDuplicateModal} />
      )}


{showOnboarding && toutesLesTransactions.length === 0 && (
  <FenetreBienvenue handleChooseMode={handleChooseMode} />
)}

{/* MODALE DE MODIFICATION D'UNE CATÉGORIE (ICÔNE & COULEUR) */}
{editingCat && (
  <FenetreModifCategorie editingCat={editingCat} handleUpdateCategory={handleUpdateCategory} setEditingCat={setEditingCat} setShowEditColorPicker={setShowEditColorPicker} setShowEditIconPicker={setShowEditIconPicker} showEditColorPicker={showEditColorPicker} showEditIconPicker={showEditIconPicker} />
)}

{/* =========================================================================
    🎉 MODALE DE CÉLÉBRATION : PREMIER IMPORT AUTOMATIQUE RÉUSSI
    ========================================================================= */}
{celebrationModal.show && (
  <FenetreCelebration celebrationModal={celebrationModal} setActiveTab={setActiveTab} setCelebrationModal={setCelebrationModal} />
)}


{/* =========================================================================
          🔒 MODALE JOUR J : RECONNEXION BANCAIRE DSP2 REQUISE
          ========================================================================= */}
      {scaExpiredConnection && (
        <FenetreReauthentification handleConnectNewBank={handleConnectNewBank} scaExpiredConnection={scaExpiredConnection} setScaExpiredConnection={setScaExpiredConnection} />
      )}

<style dangerouslySetInnerHTML={{__html: `
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
`}} />




    </div>  

  );
}

export default FinanceApp;