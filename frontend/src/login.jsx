import { useState, useEffect, useMemo, useRef } from 'react';
 // <-- Ajoute cette ligne tout en haut du fichier

 // À mettre en haut de ton fichier
import { TrendingUp, RefreshCw, ArrowUpCircle, ArrowDownCircle, Zap, BarChartHorizontal, Repeat } from 'lucide-react';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import fr from 'date-fns/locale/fr';
registerLocale('fr', fr); // Pour avoir le calendrier en français
 // À ajouter en haut de ton fichier
import api from './axios';
import GuideView from './GuideView';
 // Fonction pour générer des variations HSL à partir d'un HEX (percent: 0 à 100)
import CustomSelect from './components/CustomSelect';
import ProfileTab from './views/ProfileTab';
import TricountManager from './views/TricountManager';
import DemenagementPage from './views/DemenagementPage';
import CongesPage from './views/Congespage';
import AuthView from './views/AuthView';
import { deconnexionEnAttente } from './utils/sessions';
import ComptesView from './views/ComptesView';
import ThemeStudioDesktop from './views/ThemeStudioDesktop';
import { themeBackground } from './utils/gradient';
import ImportView from './views/ImportView';
import GererView from './views/GererView';
import PrevisionsView from './views/PrevisionsView';
import DashboardView from './views/DashboardView';
import { toast } from 'sonner'
import ExportModal from './components/ExportModal';
import LandingPage from './views/LandingPage';
import usePatrimoine from './hooks/usePatrimoine';
import DelayedDashboardLoader from './components/DelayedDashboardLoader';
import SortableAccountCard from './components/SortableAccountCard';
import UnifiedWidgets from './components/UnifiedWidgets';
import ImportPowensModal from './components/ImportPowensModal';
import NavigationPrincipale from './components/NavigationPrincipale';
import useAlertes from './hooks/useAlertes';
import IndicateurSynchroAuto from './components/IndicateurSynchroAuto';
import FenetreSuppressionCompte from './components/FenetreSuppressionCompte';
import BarreActionsTransactions from './components/BarreActionsTransactions';
import FenetreSuppressionSelection from './components/FenetreSuppressionSelection';
import FenetreSuppressionBudget from './components/FenetreSuppressionBudget';
import BarreActionsPrevisions from './components/BarreActionsPrevisions';
import FenetreSuppressionPrevisions from './components/FenetreSuppressionPrevisions';
import AssistantSolde from './components/AssistantSolde';
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
import useFiltresPeriode from './hooks/useFiltresPeriode';
import useThemeUtilisateur from './hooks/useThemeUtilisateur';
import useMenuNavigation from './hooks/useMenuNavigation';
import useAssistantSoldeCalcul from './hooks/useAssistantSoldeCalcul';
import useNotesVersion from './hooks/useNotesVersion';
import useDonneesPeriode from './hooks/useDonneesPeriode';
import useMoisBudget from './hooks/useMoisBudget';
import usePropagationAnnee from './hooks/usePropagationAnnee';
import useSynchroArrierePlan from './hooks/useSynchroArrierePlan';
import useActualisationPowens from './hooks/useActualisationPowens';
import { calculerSuiviPrevisions } from './utils/calculsPrevisions';
import { calculerStatsAnnuellesCategories } from './utils/calculsAnalyse';




















































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
  const [authViewMode, setAuthViewMode] = useState(() => (deconnexionEnAttente() ? 'login' : null)); // null = Landing Page, 'login' ou 'register' = Formulaire
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user'); // 👈 Nouvel état
  const [, setLoginName] = useState('')
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
const { filters, filtersByPage, getDefaultPeriod, getPageKey, setFilters, setFiltersByPage } = useFiltresPeriode({ activeTab, moisListe, user });

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
  
  

  const { fetchUserTheme, handleSaveThemeSQL, updateThemeLive } = useThemeUtilisateur({ setUserTheme, user });


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
  { v: "PEL", l: "PEL" }
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
  } catch  {
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



const [, setLoginPassword] = useState(''); // Ajoute cette ligne








const handleLogout = () => {
  // Retire l'appareil de la liste des sessions et efface le cookie de session ; un échec ne doit pas empêcher la déconnexion locale.
  const jeton = localStorage.getItem('token');
  api.post('/api/sessions/deconnexion', null, jeton ? { headers: { Authorization: `Bearer ${jeton}` } } : undefined).catch(() => {});

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



const { hiddenPages, setHiddenPages, visibleMenuItems } = useMenuNavigation({ userRole });





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



const { versionRegles, chartDataPrevisions, duplicateModal, epargneProjeteeTotale, epargneReelleCumulee, excludedMonths, handleAddPrevision, handleConfirmDuplicate, handleDeleteSelected2, handleTryDuplicate, loadPrevisions, moisDisponibles, newPrevi, optionsComptes, pctProjete, pctReel, previsionsFiltrees, recapPrevisionsStats, selectedIds2, setDuplicateModal, setExcludedMonths, setNewPrevi, setSelectedIds2, soldeGlobalProjete, soldesPrevisionnels, statsEpargnePrevisionnelle, toggleAll2, toggleSelect2, updatePrevision } = usePrevisions({ allPrevisionsAnnee, cleanMonth, comptes, filters, moisListe, objectifAnnuelGlobal, recapAnnuelStats, setDuplicateType, setallPrevisionsAnnee, soldesTries, toutesLesTransactions, user });


// --- 1. Tes States (Assure-toi que l'ordre est respecté) ---
const { allocations, fetchAllocations, setAllocations } = useEnveloppes({ filters, soldeGlobal });
const { patrimoine, recharger: rechargerPatrimoine, actif: patrimoineActif, valeurNette } = usePatrimoine({ user, profil: filters.profil, annee: filters.annee, soldeComptes: soldeGlobal });
const [ongletComptes, setOngletComptes] = useState('comptes');
const ouvrirPatrimoine = () => { setOngletComptes('biens'); setActiveTab('comptes'); };

// Lien d'invitation à un compte commun (?partage=…) : accepté dès que la personne est connectée.
useEffect(() => {
  const jeton = new URLSearchParams(window.location.search).get('partage');
  if (!user || !jeton) return;
  window.history.replaceState({}, '', window.location.pathname);
  api.post('/api/partages/accepter', { jeton })
    .then((res) => {
      toast.success(`Partage accepté : les comptes de ${res.data.proprietaire} sont dans le profil « Commun · ${res.data.proprietaire} ».`);
      setTimeout(() => window.location.reload(), 1500);
    })
    .catch((err) => toast.error(err.response?.data?.detail || 'Cette invitation n’est pas valable.'));
}, [user]);


const [deleteModal3, setDeleteModal3] = useState({ show: false, projetNom: null });





const [, setNote] = useState(""); // Initialise avec une chaîne vide




const [showLearningList, setShowLearningList] = useState(false);



const [searchTerm, setSearchTerm] = useState("");

// Ensuite, filtre tes transactions avant l'affichage
const transactionsFiltrees = transactionsAAfficher.filter(t => 
  t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
  t.categorie?.toLowerCase().includes(searchTerm.toLowerCase())
);

// Un résultat de la recherche globale : la page Gérer s'ouvre sur sa période et sur le profil de son compte.
// Pas de profil « Tous » : l'app le remplacerait aussitôt par le premier profil, et le résultat disparaîtrait.
const ouvrirResultatRecherche = (cible) => {
  if (cible.type === 'compte') {
    setActiveTab('comptes');
    return;
  }
  const memeNom = (a, b) => a?.trim().toUpperCase() === b?.trim().toUpperCase();
  const groupe = comptes.find(c => memeNom(c.compte, cible.compte))?.groupe;
  const mois = moisListe.find(m => cleanMonth(m.v) === cleanMonth(cible.mois))?.v || cible.mois;
  setFiltersByPage(prev => ({ ...prev, gerer: { ...prev.gerer, ...(groupe ? { profil: groupe } : {}), mois, annee: String(cible.annee) } }));
  setSelectedCompte(cible.type === 'operation' ? cible.compte : 'tous');
  setSearchTerm(cible.nom);
  setActiveTab('gerer');
};

const [annualTab, setAnnualTab] = useState('list'); // 'list' sera la vue par défaut
const statsAnnuellesCategories = useMemo(() => calculerStatsAnnuellesCategories({ comptes, filters, toutesLesTransactions }), [toutesLesTransactions, comptes, filters.annee, filters.profil]); 
// On dépend bien de 'comptes' aussi car c'est lui qui définit le profil !



const { assistantData, confirmerCalculAssistant, openCalculateurAssistant, setAssistantData } = useAssistantSoldeCalcul({ comptes, handleBlurUpdate, setComptes, toutesLesTransactions });


// État pour afficher ou masquer le popup flash
const { CURRENT_VERSION, handleClosePatchModal, showPatchModal } = useNotesVersion({ user });


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
const { donneesAffichees, estPeriode, moisDebut, moisFin, setMoisDebut, setMoisFin, setTotalTab, totalTab } = useDonneesPeriode({ filters, moisListe, recapAnnuelStats, tauxEpargneMoyen, totauxAnnuels });


const TAB_CONFIG = {
  revenus: { icon: ArrowUpCircle, label: 'Revenus', className: '' },
  depenses: { icon: ArrowDownCircle, label: 'Dépenses', className: '' },
  transferts: { icon: RefreshCw, label: 'Transferts', className: '' },
  // ✅ Désormais synchronisé sur ton point de rupture exact (2000px)
  Catégories: { icon: BarChartHorizontal, label: 'Catégories', className: 'min-[2000px]:hidden' }, 
  Variations: { icon: TrendingUp, label: 'Variations', className: '' },
  flash: { icon: Zap, label: 'Insights', className: '' },
  abonnements: { icon: Repeat, label: 'Abonnements', className: '' }
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


const { listeMoisDisponibles, selectedBudgetMonth, setSelectedBudgetMonth } = useMoisBudget({ budgets, filters, selectedBudgetYear });

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
const { confirmPropagateToYear, handleTryPropagateYear } = usePropagationAnnee({ filters, loadPrevisions, selectedIds2, setDuplicateModal, setDuplicateType, setSelectedIds2, user });



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
const { hiddenComptes, isAutoSyncingOnLoad, performBackgroundSyncIfNeeded, setHiddenComptes } = useSynchroArrierePlan({ fetchComptes, fetchPowensConnections, fetchTransactions, importMode, user });


const previsionsTracking = useMemo(() => calculerSuiviPrevisions({ allPrevisionsAnnee, toutesLesTransactions }), [allPrevisionsAnnee, toutesLesTransactions]);



// 1. États pour la création

// 2. États pour la modification d'une catégorie existante
const [showEditIconPicker, setShowEditIconPicker] = useState(false);
const [showEditColorPicker, setShowEditColorPicker] = useState(false);


const { handleForceRefreshPowens, isRefreshingPowens } = useActualisationPowens({ checkNewTransactions, fetchComptes, fetchPowensConnections, fetchTransactions, importMode, user });

// =========================================================================
// 🟢 NAVIGATION FLUIDE À LA MOLETTE DE LA SOURIS (WHEEL NAVIGATION)
// =========================================================================
const centreAlertes = useAlertes({ user, activeTab, comptes, transactions: toutesLesTransactions, connexions: powensData?.connections, aImporter: syncCountByAccount, importMode, budgetsAffiches: budgets, previsionsAffichees: allPrevisionsAnnee });

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
            onLoginSuccess={(loggedUser) => {
              setUser(loggedUser);
            }} 
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
          <NavigationPrincipale centreAlertes={centreAlertes} recherche={{ transactions: toutesLesTransactions, comptes, ouvrirResultat: ouvrirResultatRecherche }} CURRENT_VERSION={CURRENT_VERSION} activeTab={activeTab} handleLogout={handleLogout} handleWheelNavTabs={handleWheelNavTabs} setActiveTab={setActiveTab} user={user} visibleMenuItems={visibleMenuItems} />


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
      valeurNette={valeurNette}
      patrimoineActif={patrimoineActif}
      ouvrirPatrimoine={ouvrirPatrimoine}
      patrimoine={patrimoine}
      soldesTries={soldesTries}
      sensors={sensors}
      loadPrevisions={loadPrevisions}
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
    versionRegles={versionRegles}
    loadPrevisions={loadPrevisions}
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
    fetchTransactions={fetchTransactions}
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
    onglet={ongletComptes}
    setOnglet={setOngletComptes}
    patrimoine={patrimoine}
    rechargerPatrimoine={rechargerPatrimoine}
    profil={filters.profil}
    valeurNette={valeurNette}
    soldeComptes={soldeGlobal}
    patrimoineActif={patrimoineActif}
    soldesActuels={Object.fromEntries(soldesTries.map((c) => [c.compte, c.soldePeriode]))}
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
    <GuideView ouvrirPage={setActiveTab} pagesDisponibles={[...visibleMenuItems.map(item => item.id), 'profile']} />
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
          <BarreActionsTransactions handleDeleteSelected={handleDeleteSelected} selectedIds={selectedIds} setSelectedIds={setSelectedIds} updateCell={updateCell} categoriesVisibles={categoriesVisibles} />
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







{/* =========================================================================
    🎉 NOTES DE PATCH OFFICIELLES v4.5
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