import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Layers, Calculator, User, Wallet, Landmark, Tag, 
  Plus, Calendar, Trash2, FileText, Copy, X, Check,
  Scale, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, 
  Sparkles, Award, ArrowRight, ShieldCheck, Home, ExternalLink,
  Camera, Eye, Star, Clock, MapPin, ChevronLeft, ChevronRight,
  ClipboardPaste, AlignLeft, Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';
import CustomSelect from '../components/CustomSelect';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';

export default function DemenagementPage({ user, toutesLesCategories = [], comptes = [] }) {
  // Mode d'affichage : 'simulator' | 'compare' | 'annonces'
  const [viewMode, setViewMode] = useState('simulator');

  // --- 1. ÉTATS DU SIMULATEUR ---
  const [notesHtml, setNotesHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [lignes, setLignes] = useState([]);
  const [scenarios, setScenarios] = useState(['Scénario de base']);
  const [currentScenario, setCurrentScenario] = useState('Scénario de base');
  const [nouveauScenarioNom, setNouveauScenarioNom] = useState('');

  // Modale de duplication de scénario
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);

  // Salaires
  const [salaireLui, setSalaireLui] = useState('');
  const [salaireElle, setSalaireElle] = useState('');

  // Dépenses personnelles
  const [depensePersoLui, setDepensePersoLui] = useState('');
  const [depensePersoElle, setDepensePersoElle] = useState('');

  // Ajout rapide et objectif global
  const [categorieSelect, setCategorieSelect] = useState(toutesLesCategories[0] || 'Logement');
  const [montantInitial, setMontantInitial] = useState('');
  const [montantCommunForfaitaire, setMontantCommunForfaitaire] = useState('');
  const [frequenceInitiale, setFrequenceInitiale] = useState('mensuel');

  const saveTimeoutRef = useRef(null);
  const editorRef = useRef(null);

  // --- 2. ÉTATS DU MODULE ANNONCES ---
  const [annonces, setAnnonces] = useState([]);
  const [loadingAnnonces, setLoadingAnnonces] = useState(false);
  const [isAnnonceModalOpen, setIsAnnonceModalOpen] = useState(false);
  const [scrapingUrl, setScrapingUrl] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [annonceFilter, setAnnonceFilter] = useState('all');
  
  // Analyse par texte/partage (IA)
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [pastedAdText, setPastedAdText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);

  // Carrousel photo et accordéon description
  const [activePhotoIdx, setActivePhotoIdx] = useState({});
  const [expandedDesc, setExpandedDesc] = useState({});

  const [annonceForm, setAnnonceForm] = useState({
    id: null,
    titre: '',
    url: '',
    source: 'Autre',
    loyer: '',
    charges: '',
    surface: '',
    pieces: '',
    ville: '',
    photos: [],
    dossier_envoye: false,
    date_dossier: '',
    visite_effectuee: false,
    date_visite: '',
    statut_reponse: 'en_attente',
    notes: '',
    favori: false
  });

  const diviseursFrequence = {
    'mensuel': 1,
    'trimestriel': 3,
    'semestriel': 6,
    'annuel': 12
  };

  const getLigneId = (ligne) => ligne?.id || ligne?._id;

  // --- 3. CHARGEMENTS ---
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await api.get(`/api/notes-demenagement/${user}`);
        if (res.data) {
          const contenu = res.data.contenu || "";
          setNotesHtml(contenu);
          if (editorRef.current) editorRef.current.innerHTML = contenu;
        }
      } catch (err) {
        console.error("Erreur notes :", err);
      }
    };
    if (user) fetchNotes();
  }, [user]);

  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && notesHtml) {
      editorRef.current.innerHTML = notesHtml;
    }
  }, [notesHtml]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get(`/api/simulation-demenagement/${user}`);
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setLignes(data);
          const uniqueScenarios = [...new Set(data.map(l => l.scenario))];
          setScenarios(uniqueScenarios);
          if (!uniqueScenarios.includes(currentScenario)) {
            setCurrentScenario(uniqueScenarios[0]);
          }
        }
      } catch (err) {
        console.error("Erreur simulations :", err);
      }
    };
    if (user) loadData();
  }, [user]);

  const fetchAnnonces = async () => {
    try {
      setLoadingAnnonces(true);
      const res = await api.get(`/api/demenagement/annonces/${user}`);
      setAnnonces(res.data || []);
    } catch (err) {
      console.error("Erreur annonces :", err);
    } finally {
      setLoadingAnnonces(false);
    }
  };

  useEffect(() => {
    if (user) fetchAnnonces();
  }, [user]);

  useEffect(() => {
    const currentData = lignes.filter(l => l.scenario === currentScenario);
    const salLui = currentData.find(l => l.titre === "Salaire Lui");
    const salElle = currentData.find(l => l.titre === "Salaire Elle");
    const persLui = currentData.find(l => l.titre === "Dépenses Perso (Lui)");
    const persElle = currentData.find(l => l.titre === "Dépenses Perso (Elle)");
    const mntGlobal = currentData.find(l => l.titre === "Objectif Compte Commun");

    setSalaireLui(salLui ? salLui.montant.toString() : '');
    setSalaireElle(salElle ? salElle.montant.toString() : '');
    setDepensePersoLui(persLui ? persLui.montant.toString() : '');
    setDepensePersoElle(persElle ? persElle.montant.toString() : '');
    setMontantCommunForfaitaire(mntGlobal ? mntGlobal.montant.toString() : '');
  }, [currentScenario, lignes]);

  // --- 4. BLOC-NOTES & TÂCHES ---
  const handleInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setNotesHtml(currentHtml);
    setIsSaving(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.post('/api/notes-demenagement', { utilisateur: user, contenu: currentHtml });
      } catch (err) {
        console.error("Erreur sauvegarde notes :", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const insererCheckbox = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const taskContainer = document.createElement('div');
    taskContainer.className = "task-item flex items-start gap-2.5 my-1.5 group/task relative select-none";
    taskContainer.contentEditable = "false";
    taskContainer.innerHTML = `
      <input type="checkbox" class="task-checkbox w-4 h-4 mt-0.5 rounded accent-indigo-500 cursor-pointer shrink-0" />
      <span class="task-text text-xs text-white/90 outline-none flex-1 font-medium leading-relaxed" contenteditable="true" placeholder="Nouvelle tâche..."></span>
      <button type="button" class="task-delete text-white/20 hover:text-rose-400 opacity-0 group-hover/task:opacity-100 transition-opacity px-1 text-xs cursor-pointer" title="Supprimer">✕</button>
    `;

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(taskContainer);
    } else {
      editorRef.current.appendChild(taskContainer);
    }

    const spanText = taskContainer.querySelector('.task-text');
    if (spanText) setTimeout(() => spanText.focus(), 10);
    handleInput();
  };

  const handleKeyDown = (e) => {
    const target = e.target;
    const isTaskText = target?.classList?.contains('task-text');
    const parentTask = target?.closest('.task-item');

    if (isTaskText && parentTask) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!target.textContent.trim()) {
          parentTask.remove();
          const p = document.createElement('div');
          p.innerHTML = '<br>';
          editorRef.current.appendChild(p);
          handleInput();
          return;
        }
        insererCheckbox();
        return;
      }
      if (e.key === 'Backspace' && !target.textContent) {
        e.preventDefault();
        parentTask.remove();
        handleInput();
      }
    }
  };

  const handleEditorClick = (e) => {
    const target = e.target;
    if (target && target.classList?.contains('task-checkbox')) {
      const taskText = target.parentElement?.querySelector('.task-text');
      if (target.checked) {
        target.setAttribute('checked', 'checked');
        taskText?.classList.add('line-through', 'text-white/30');
      } else {
        target.removeAttribute('checked');
        taskText?.classList.remove('line-through', 'text-white/30');
      }
      handleInput();
    }
    if (target && target.classList?.contains('task-delete')) {
      const parentTask = target.closest('.task-item');
      if (parentTask) {
        parentTask.remove();
        handleInput();
      }
    }
  };

  // --- 5. LOGIQUE DES LIGNES DU SIMULATEUR ---
  const upsertLigne = async (titre, fluxType, cat, mnt, freq = 'mensuel') => {
    const existante = lignes.find(l => l.scenario === currentScenario && l.titre === titre);
    const parsedMontant = parseFloat(mnt) || 0;

    const nouvelleLigne = {
      utilisateur: user,
      scenario: currentScenario,
      titre,
      flux_type: fluxType,
      categorie: cat,
      montant: parsedMontant,
      frequence: freq,
      cible: fluxType === 'revenus' ? 'perso' : 'compte_commun'
    };

    if (titre === "Salaire Lui") setSalaireLui(mnt.toString());
    if (titre === "Salaire Elle") setSalaireElle(mnt.toString());
    if (titre === "Dépenses Perso (Lui)") setDepensePersoLui(mnt.toString());
    if (titre === "Dépenses Perso (Elle)") setDepensePersoElle(mnt.toString());
    if (titre === "Objectif Compte Commun") setMontantCommunForfaitaire(mnt.toString());

    try {
      if (existante) {
        const idCle = getLigneId(existante);
        await api.post('/api/simulation-demenagement', { ...nouvelleLigne, id: idCle });
        setLignes(prev => prev.map(l => getLigneId(l) === idCle ? { ...l, montant: parsedMontant, frequence: freq } : l));
      } else {
        const res = await api.post('/api/simulation-demenagement', nouvelleLigne);
        const nouvelId = res.data.id || res.data._id;
        setLignes(prev => [...prev, { id: nouvelId, _id: nouvelId, ...nouvelleLigne }]);
      }
    } catch (err) {
      console.error("Erreur upsert simulation :", err);
    }
  };

  const handleSupprimerLigne = async (ligne) => {
    const idCle = getLigneId(ligne);
    if (!idCle) return;
    try {
      await api.delete(`/api/simulation-demenagement/${idCle}`);
      setLignes(prev => prev.filter(l => getLigneId(l) !== idCle));
      toast.success("Ligne supprimée.");
    } catch (err) {
      toast.error("Erreur lors de la suppression de la ligne.");
    }
  };

  const handleAjouterCategorie = (e) => {
    e.preventDefault();
    if (!categorieSelect) return;
    const cleanCat = getCleanCategoryName(categorieSelect);
    const existe = lignes.some(l => l.scenario === currentScenario && l.titre === cleanCat && l.flux_type === 'depenses');
    if (existe) {
      toast.warning("Cette catégorie est déjà présente dans ce scénario.");
      return;
    }

    upsertLigne(cleanCat, 'depenses', cleanCat, montantInitial || 0, frequenceInitiale);
    setMontantInitial('');
    setFrequenceInitiale('mensuel');
    toast.success(`Catégorie "${cleanCat}" ajoutée au scénario !`);
  };

  const handleCreerScenario = (e) => {
    e.preventDefault();
    const cleanNom = nouveauScenarioNom.trim();
    if (!cleanNom || scenarios.includes(cleanNom)) return;
    setScenarios(prev => [...prev, cleanNom]);
    setCurrentScenario(cleanNom);
    setNouveauScenarioNom('');
    toast.success(`Nouveau scénario créé : "${cleanNom}"`);
  };

  const handleSupprimerScenario = async (scenarioASupprimer) => {
    if (scenarios.length <= 1) {
      toast.warning("Impossible de supprimer le dernier scénario restant.");
      return;
    }
    if (!window.confirm(`Supprimer définitivement le scénario "${scenarioASupprimer}" ?`)) return;

    try {
      await api.delete(`/api/simulation-demenagement/${user}/${encodeURIComponent(scenarioASupprimer)}`);
      const nouveauxScenarios = scenarios.filter(sc => sc !== scenarioASupprimer);
      setScenarios(nouveauxScenarios);
      setLignes(prev => prev.filter(l => l.scenario !== scenarioASupprimer));
      setCurrentScenario(nouveauxScenarios[0]);
      toast.success(`Scénario "${scenarioASupprimer}" supprimé.`);
    } catch (err) {
      toast.error("Erreur lors de la suppression du scénario.");
    }
  };

  const handleExecuteDuplicate = async (e) => {
    e.preventDefault();
    const cleanNom = duplicateName.trim();
    if (!cleanNom) {
      toast.warning("Veuillez saisir un nom pour la copie.");
      return;
    }
    if (scenarios.includes(cleanNom)) {
      toast.warning("Un scénario avec ce nom existe déjà.");
      return;
    }

    setIsDuplicating(true);
    try {
      const res = await api.post('/api/simulation-demenagement/duplicate', {
        scenario_source: currentScenario,
        nouveau_scenario: cleanNom
      });

      if (res.data?.data) {
        setLignes(res.data.data);
      }
      setScenarios(prev => [...prev, cleanNom]);
      setCurrentScenario(cleanNom);
      setIsDuplicateModalOpen(false);
      setDuplicateName('');
      toast.success(`Scénario dupliqué : "${cleanNom}" ! 📋`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la duplication.");
    } finally {
      setIsDuplicating(false);
    }
  };

  // --- 6. GESTION DES ANNONCES (URL & SMART PASTE IA) ---
  const handleScrape = async () => {
    if (!scrapingUrl.trim()) return;
    setIsScraping(true);
    try {
      const res = await api.post('/api/demenagement/scrape-listing', { url: scrapingUrl });
      const d = res.data;
      if (d) {
        setAnnonceForm(prev => ({
          ...prev,
          url: d.url || scrapingUrl,
          source: d.source || 'Autre',
          titre: d.titre || prev.titre || 'Appartement',
          loyer: d.loyer > 0 ? d.loyer.toString() : prev.loyer,
          charges: d.charges > 0 ? d.charges.toString() : prev.charges,
          surface: d.surface > 0 ? d.surface.toString() : prev.surface,
          pieces: d.pieces > 0 ? d.pieces.toString() : prev.pieces,
          ville: d.ville || prev.ville,
          photos: d.photos && d.photos.length > 0 ? d.photos : prev.photos,
          notes: d.description || prev.notes || ''
        }));

        if (d.blocked) {
          toast.info("Protection du site détectée : certains champs peuvent être complétés ci-dessous.");
        } else {
          toast.success("Informations de l'annonce extraites ! ✨");
        }
      }
    } catch (err) {
      toast.warning("Lien enregistré, vous pouvez compléter les champs manuellement.");
      setAnnonceForm(prev => ({ ...prev, url: scrapingUrl }));
    } finally {
      setIsScraping(false);
    }
  };

  const handleSmartParseText = async () => {
    if (!pastedAdText.trim()) return;
    setIsParsingText(true);
    try {
      const res = await api.post('/api/demenagement/parse-text', { text: pastedAdText });
      const d = res.data;
      if (d) {
        setAnnonceForm(prev => ({
          ...prev,
          titre: d.titre || prev.titre,
          loyer: d.loyer > 0 ? d.loyer.toString() : prev.loyer,
          charges: d.charges > 0 ? d.charges.toString() : prev.charges,
          surface: d.surface > 0 ? d.surface.toString() : prev.surface,
          pieces: d.pieces > 0 ? d.pieces.toString() : prev.pieces,
          ville: d.ville || prev.ville,
          notes: d.description || prev.notes || pastedAdText
        }));
        setShowSmartPaste(false);
        setPastedAdText('');
        toast.success("Texte analysé avec succès par l'IA ! 🎯");
      }
    } catch (err) {
      toast.error("Impossible d'extraire les informations de ce texte.");
    } finally {
      setIsParsingText(false);
    }
  };

  const handleSaveAnnonce = async (e) => {
    e.preventDefault();
    if (!annonceForm.titre.trim()) {
      toast.error("Veuillez renseigner un titre pour l'annonce.");
      return;
    }

    const payload = {
      ...annonceForm,
      loyer: parseFloat(annonceForm.loyer) || 0,
      charges: parseFloat(annonceForm.charges) || 0,
      surface: parseFloat(annonceForm.surface) || 0,
      pieces: parseInt(annonceForm.pieces) || 0
    };

    try {
      if (annonceForm.id) {
        await api.put(`/api/demenagement/annonces/${annonceForm.id}`, payload);
        toast.success("Annonce mise à jour !");
      } else {
        await api.post('/api/demenagement/annonces', payload);
        toast.success("Annonce ajoutée au comparateur ! 🏡");
      }
      setIsAnnonceModalOpen(false);
      setScrapingUrl('');
      fetchAnnonces();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de l'annonce.");
    }
  };

  const handleDeleteAnnonce = async (id) => {
    if (!window.confirm("Supprimer cette annonce du comparateur ?")) return;
    try {
      await api.delete(`/api/demenagement/annonces/${id}`);
      setAnnonces(prev => prev.filter(a => a.id !== id));
      toast.success("Annonce supprimée.");
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  const handleToggleFavori = async (annonce) => {
    const updated = !annonce.favori;
    try {
      await api.put(`/api/demenagement/annonces/${annonce.id}`, { ...annonce, favori: updated });
      setAnnonces(prev => prev.map(a => a.id === annonce.id ? { ...a, favori: updated } : a));
    } catch (err) {
      toast.error("Erreur favori.");
    }
  };

  const handleQuickStatusChange = async (annonce, field, value) => {
    const payload = { ...annonce, [field]: value };
    try {
      await api.put(`/api/demenagement/annonces/${annonce.id}`, payload);
      setAnnonces(prev => prev.map(a => a.id === annonce.id ? payload : a));
      toast.success("Statut mis à jour !");
    } catch (err) {
      toast.error("Erreur de mise à jour.");
    }
  };

  const handleApplyLoyerToScenario = (loyer) => {
    upsertLigne("Loyer", "depenses", "Logement", loyer, "mensuel");
    setViewMode('simulator');
    toast.success(`Loyer de ${loyer} € appliqué au scénario "${currentScenario}" ! 🎯`);
  };

  const handleNextPhoto = (e, annonceId, totalPhotos) => {
    e.stopPropagation();
    setActivePhotoIdx(prev => ({
      ...prev,
      [annonceId]: ((prev[annonceId] || 0) + 1) % totalPhotos
    }));
  };

  const handlePrevPhoto = (e, annonceId, totalPhotos) => {
    e.stopPropagation();
    setActivePhotoIdx(prev => ({
      ...prev,
      [annonceId]: ((prev[annonceId] || 0) - 1 + totalPhotos) % totalPhotos
    }));
  };

  // --- 7. CALCULS DU SIMULATEUR DU SCÉNARIO COURANT (RÉTABLI !) ---
  const calculs = useMemo(() => {
    const duScenario = lignes.filter(l => l.scenario === currentScenario);
    
    const mntLui = parseFloat(salaireLui) || 0;
    const mntElle = parseFloat(salaireElle) || 0;
    const totalSalaires = mntLui + mntElle;

    const pLui = parseFloat(depensePersoLui) || 0;
    const pElle = parseFloat(depensePersoElle) || 0;

    const prorataLui = totalSalaires > 0 ? (mntLui / totalSalaires) : 0.5;
    const prorataElle = totalSalaires > 0 ? (mntElle / totalSalaires) : 0.5;

    const getMontantMensuelLisse = (ligne) => {
      const mnt = parseFloat(ligne.montant) || 0;
      const freq = (ligne.frequence || 'mensuel').toLowerCase().trim();
      const diviseur = diviseursFrequence[freq] || 1;
      return mnt / diviseur;
    };

    const totalCategories = duScenario
      .filter(l => l.flux_type === 'depenses' && !["Objectif Compte Commun", "Dépenses Perso (Lui)", "Dépenses Perso (Elle)"].includes(l.titre))
      .reduce((sum, l) => sum + getMontantMensuelLisse(l), 0);

    const alimentationCompte = parseFloat(montantCommunForfaitaire) > 0 
      ? parseFloat(montantCommunForfaitaire) 
      : totalCategories;

    const partLui = alimentationCompte * prorataLui;
    const partElle = alimentationCompte * prorataElle;
    const soldeRestantCommun = alimentationCompte - totalCategories;

    const resteLui = mntLui - partLui - pLui;
    const resteElle = mntElle - partElle - pElle;

    return {
      duScenario: duScenario.filter(l => l.flux_type === 'depenses' && !["Objectif Compte Commun", "Dépenses Perso (Lui)", "Dépenses Perso (Elle)"].includes(l.titre)),
      getMontantMensuelLisse,
      totalSalaires,
      prorataLui: prorataLui * 100,
      prorataElle: prorataElle * 100,
      charges: alimentationCompte,
      totalCategories,
      soldeRestantCommun,
      partLui,
      partElle,
      resteLui,
      resteElle,
      estForfaitaire: parseFloat(montantCommunForfaitaire) > 0
    };
  }, [lignes, currentScenario, salaireLui, salaireElle, depensePersoLui, depensePersoElle, montantCommunForfaitaire]);

  // Comparaison stratégique de tous les scénarios
  const comparaisonTousScenarios = useMemo(() => {
    return scenarios.map(sc => {
      const duScenario = lignes.filter(l => l.scenario === sc);

      const salLui = parseFloat(duScenario.find(l => l.titre === "Salaire Lui")?.montant) || 0;
      const salElle = parseFloat(duScenario.find(l => l.titre === "Salaire Elle")?.montant) || 0;
      const totalSalaires = salLui + salElle;

      const persLui = parseFloat(duScenario.find(l => l.titre === "Dépenses Perso (Lui)")?.montant) || 0;
      const persElle = parseFloat(duScenario.find(l => l.titre === "Dépenses Perso (Elle)")?.montant) || 0;
      const forfaitaire = parseFloat(duScenario.find(l => l.titre === "Objectif Compte Commun")?.montant) || 0;

      const chargesLissees = duScenario
        .filter(l => l.flux_type === 'depenses' && !["Objectif Compte Commun", "Dépenses Perso (Lui)", "Dépenses Perso (Elle)"].includes(l.titre))
        .reduce((sum, l) => {
          const mnt = parseFloat(l.montant) || 0;
          const freq = (l.frequence || 'mensuel').toLowerCase().trim();
          const diviseur = diviseursFrequence[freq] || 1;
          return sum + (mnt / diviseur);
        }, 0);

      const alimentationCompte = forfaitaire > 0 ? forfaitaire : chargesLissees;

      const prorataLui = totalSalaires > 0 ? (salLui / totalSalaires) : 0.5;
      const prorataElle = totalSalaires > 0 ? (salElle / totalSalaires) : 0.5;

      const partLui = alimentationCompte * prorataLui;
      const partElle = alimentationCompte * prorataElle;
      const soldeRestantCommun = alimentationCompte - chargesLissees;

      const resteLui = salLui - partLui - persLui;
      const resteElle = salElle - partElle - persElle;
      const resteCouple = resteLui + resteElle;

      const tauxEffort = totalSalaires > 0 ? (alimentationCompte / totalSalaires) * 100 : 0;
      const loyerItem = duScenario.find(l => l.titre.toLowerCase().includes('loyer') || l.categorie.toLowerCase().includes('loyer'));
      const montantLoyer = loyerItem ? parseFloat(loyerItem.montant) || 0 : 0;

      const pointsForts = [];
      const pointsFaibles = [];

      if (tauxEffort <= 33 && totalSalaires > 0) {
        pointsForts.push(`Taux d'effort remarquable (${tauxEffort.toFixed(0)}% < 33%) : budget très protecteur.`);
      } else if (tauxEffort > 40) {
        pointsFaibles.push(`Taux d'effort élevé (${tauxEffort.toFixed(0)}%) : charges lourdes pesant sur le couple.`);
      }

      if (resteLui >= 500 && resteElle >= 500) {
        pointsForts.push(`Excellente liberté financière individuelle (> 500 € net chacun après dépenses).`);
      } else if (resteLui < 200 || resteElle < 200) {
        const qui = resteLui < 200 && resteElle < 200 ? "Lui et Elle" : (resteLui < 200 ? "Lui" : "Elle");
        pointsFaibles.push(`Reste à vivre critique pour ${qui} (< 200 € / mois).`);
      }

      if (soldeRestantCommun > 40) {
        pointsForts.push(`Coussin de sécurité confortable sur le compte joint (+${soldeRestantCommun.toFixed(0)} €/mois).`);
      } else if (soldeRestantCommun < 0) {
        pointsFaibles.push(`Déficit mensuel sur le compte joint (${soldeRestantCommun.toFixed(0)} €/mois non couverts).`);
      }

      let verdict = "Option intermédiaire";
      let verdictColor = "indigo";

      if (resteCouple >= 1000 && tauxEffort <= 35 && soldeRestantCommun >= 0) {
        verdict = "Recommandé : Idéal pour l'épargne & la sérénité";
        verdictColor = "emerald";
      } else if (tauxEffort > 45 || resteLui < 150 || resteElle < 150 || soldeRestantCommun < 0) {
        verdict = "Vigilance : Risque de tensions budgétaires";
        verdictColor = "rose";
      } else {
        verdict = "Équilibré : Confortable avec gestion rigoureuse";
        verdictColor = "amber";
      }

      return {
        scenario: sc,
        salLui,
        salElle,
        totalSalaires,
        chargesLissees,
        alimentationCompte,
        soldeRestantCommun,
        partLui,
        partElle,
        prorataLui: prorataLui * 100,
        prorataElle: prorataElle * 100,
        resteLui,
        resteElle,
        resteCouple,
        tauxEffort,
        montantLoyer,
        pointsForts,
        pointsFaibles,
        verdict,
        verdictColor
      };
    });
  }, [scenarios, lignes]);

  const statsArbitrage = useMemo(() => {
    if (comparaisonTousScenarios.length <= 1) return null;
    const trieParReste = [...comparaisonTousScenarios].sort((a, b) => b.resteCouple - a.resteCouple);
    const meilleur = trieParReste[0];
    const moinsBon = trieParReste[trieParReste.length - 1];
    const ecartMensuel = meilleur.resteCouple - moinsBon.resteCouple;
    const ecartAnnuel = ecartMensuel * 12;

    return { meilleur, moinsBon, ecartMensuel, ecartAnnuel };
  }, [comparaisonTousScenarios]);

  const annoncesFiltrees = useMemo(() => {
    return annonces.filter(a => {
      if (annonceFilter === 'favoris') return a.favori;
      if (annonceFilter === 'dossier') return a.dossier_envoye;
      if (annonceFilter === 'visite') return a.visite_effectuee;
      if (annonceFilter === 'accepte') return a.statut_reponse === 'accepte';
      return true;
    });
  }, [annonces, annonceFilter]);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen text-white bg-[var(--main-bg)] select-none">
      
      {/* 1. EN-TÊTE PRINCIPAL & COMMUTATEUR DE VUES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
            <Layers size={18} className="text-indigo-400" /> Logement, Budget Couple & Comparateur
          </h1>
          <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
            Prorata de revenus, charges communes lissées et comparatif des annonces immobilières
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('simulator')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'simulator'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calculator size={13} />
            <span>Simulateur</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('compare')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'compare'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Scale size={13} />
            <span>Scénarios ({scenarios.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('annonces')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              viewMode === 'annonces'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                : 'text-white/40 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home size={13} />
            <span>Annonces & Visites ({annonces.length})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. STRUCTURE CENTRALE : GAUCHE (VUES) + DROITE (BLOC-NOTES FIXE)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* COLONNE GAUCHE (LARGE) */}
        <div className="flex-1 min-w-0 w-full space-y-6">

          {/* =====================================================================
              🌟 VUE 3 : COMPARATEUR D'ANNONCES
              ===================================================================== */}
          {viewMode === 'annonces' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Barre de filtres & Bouton Ajouter */}
              <div className="p-4 rounded-3xl bg-[var(--glass-bg)] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `Toutes (${annonces.length})` },
                    { id: 'favoris', label: `⭐ Favoris (${annonces.filter(a => a.favori).length})` },
                    { id: 'dossier', label: `📁 Dossier envoyé (${annonces.filter(a => a.dossier_envoye).length})` },
                    { id: 'visite', label: `🗓️ Visité (${annonces.filter(a => a.visite_effectuee).length})` },
                    { id: 'accepte', label: `🎉 Accepté (${annonces.filter(a => a.statut_reponse === 'accepte').length})` }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setAnnonceFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        annonceFilter === f.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-black/30 text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAnnonceForm({
                      id: null,
                      titre: '',
                      url: '',
                      source: 'Autre',
                      loyer: '',
                      charges: '',
                      surface: '',
                      pieces: '',
                      ville: '',
                      photos: [],
                      dossier_envoye: false,
                      date_dossier: '',
                      visite_effectuee: false,
                      date_visite: '',
                      statut_reponse: 'en_attente',
                      notes: '',
                      favori: false
                    });
                    setScrapingUrl('');
                    setIsAnnonceModalOpen(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-[9.5px] uppercase tracking-wider rounded-xl shadow-lg shadow-purple-600/20 active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>Ajouter une annonce</span>
                </button>
              </div>

              {/* Grille des annonces */}
              {annoncesFiltrees.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {annoncesFiltrees.map(a => {
                    const prixM2 = a.surface > 0 && a.loyer > 0 ? (a.loyer / a.surface).toFixed(1) : null;
                    const totalPhotos = a.photos?.length || 0;
                    const currentPhotoIdx = activePhotoIdx[a.id] || 0;
                    const photoAffichee = totalPhotos > 0 ? a.photos[currentPhotoIdx] : null;
                    const isDescExpanded = Boolean(expandedDesc[a.id]);

                    return (
                      <div 
                        key={a.id}
                        className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all bg-black/50 backdrop-blur-xl shadow-2xl ${
                          a.favori ? 'border-amber-500/50 shadow-amber-500/5' : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* 1. PHOTO PROPRE & CARROUSEL */}
                        <div className="relative h-64 sm:h-72 w-full bg-slate-950 overflow-hidden group select-none">
                          {photoAffichee ? (
                            <img 
                              src={photoAffichee} 
                              alt={a.titre}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-white/20 gap-2">
                              <Camera size={36} />
                              <span className="text-[9px] uppercase font-bold tracking-widest">Aucune photo</span>
                            </div>
                          )}

                          {totalPhotos > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handlePrevPhoto(e, a.id, totalPhotos)}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 cursor-pointer z-10"
                                title="Photo précédente"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleNextPhoto(e, a.id, totalPhotos)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90 cursor-pointer z-10"
                                title="Photo suivante"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </>
                          )}

                          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                            <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[8.5px] font-black uppercase text-purple-300 shadow-md">
                              {a.source || 'Annonce'}
                            </span>
                          </div>

                          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                            <button
                              type="button"
                              onClick={() => handleToggleFavori(a)}
                              className={`p-2 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
                                a.favori ? 'bg-amber-500 text-black border-amber-400' : 'bg-black/60 text-white/60 border-white/10 hover:text-white'
                              }`}
                              title={a.favori ? "Retirer des favoris" : "Ajouter aux favoris"}
                            >
                              <Star size={13} fill={a.favori ? "currentColor" : "none"} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAnnonce(a.id)}
                              className="p-2 rounded-xl bg-black/60 hover:bg-rose-500 text-white/60 hover:text-white backdrop-blur-md border border-white/10 transition-all cursor-pointer"
                              title="Supprimer l'annonce"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {totalPhotos > 1 && (
                            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[8px] font-mono text-white/80 z-10">
                              📷 {currentPhotoIdx + 1} / {totalPhotos}
                            </div>
                          )}
                        </div>

                        {/* 2. INFOS STRUCTURÉES (Sous la photo) */}
                        <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            {/* Ligne Prix & Loyer */}
                            <div className="flex items-baseline justify-between gap-2 pb-2 border-b border-white/5">
                              <div>
                                <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                                  {a.loyer > 0 ? `${a.loyer.toFixed(0)} €` : 'Loyer NC'}
                                </span>
                                <span className="text-[9px] text-white/40 uppercase font-bold ml-1.5">
                                  / mois {a.charges > 0 ? `(dont ${a.charges}€ ch.)` : 'CC'}
                                </span>
                              </div>

                              {prixM2 && (
                                <span className="text-[10px] font-bold text-white/60 font-mono bg-white/5 px-2.5 py-1 rounded-xl border border-white/5">
                                  {prixM2} € / m²
                                </span>
                              )}
                            </div>

                            {/* Spécifications en pastilles */}
                            <div className="flex flex-wrap items-center gap-2">
                              {a.surface > 0 && (
                                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] font-mono text-white font-bold flex items-center gap-1">
                                  📐 <strong>{a.surface} m²</strong>
                                </span>
                              )}

                              {a.pieces > 0 && (
                                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] font-mono text-white font-bold flex items-center gap-1">
                                  🚪 <strong>{a.pieces} pièce{a.pieces > 1 ? 's' : ''}</strong>
                                </span>
                              )}

                              {a.ville && (
                                <span className="px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-[10px] text-white/90 font-bold flex items-center gap-1">
                                  <MapPin size={11} className="text-purple-400" /> {a.ville}
                                </span>
                              )}
                            </div>

                            {/* Titre */}
                            <div className="flex items-start justify-between gap-2 pt-1">
                              <h3 className="text-sm font-black uppercase text-white leading-snug line-clamp-2 flex-1">
                                {a.titre}
                              </h3>
                              {a.url && (
                                <a 
                                  href={a.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="p-2 bg-white/5 hover:bg-purple-600 rounded-xl text-white/50 hover:text-white transition-all shrink-0"
                                  title="Ouvrir l'annonce sur le site"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>

                            {/* Description dépliable */}
                            {a.notes && (
                              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 space-y-1.5">
                                <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-white/40">
                                  <span className="flex items-center gap-1">
                                    <AlignLeft size={10} /> Description de l'annonce
                                  </span>
                                  {a.notes.length > 140 && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedDesc(prev => ({ ...prev, [a.id]: !prev[a.id] }))}
                                      className="text-purple-400 hover:text-purple-300 cursor-pointer"
                                    >
                                      {isDescExpanded ? 'Réduire ▲' : 'Lire la suite ▼'}
                                    </button>
                                  )}
                                </div>
                                <p className={`text-[10px] text-white/70 leading-relaxed font-medium ${
                                  isDescExpanded ? '' : 'line-clamp-2'
                                }`}>
                                  {a.notes}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 3. PIPELINE DE SUIVI (DOSSIER, VISITE, RÉPONSE) */}
                          <div className="space-y-2.5 pt-3 border-t border-white/5">
                            <span className="text-[8px] font-black uppercase tracking-wider text-white/30 block">
                              Suivi des démarches
                            </span>

                            <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(a, 'dossier_envoye', !a.dossier_envoye)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                  a.dossier_envoye 
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                                    : 'bg-black/30 border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className="font-bold flex items-center gap-1.5">
                                  <span>📁</span> Dossier envoyé
                                </span>
                                <span className="font-mono">{a.dossier_envoye ? '✓' : '—'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleQuickStatusChange(a, 'visite_effectuee', !a.visite_effectuee)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                                  a.visite_effectuee 
                                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' 
                                    : 'bg-black/30 border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <span className="font-bold flex items-center gap-1.5">
                                  <span>🗓️</span> Visite effectuée
                                </span>
                                <span className="font-mono">{a.visite_effectuee ? '✓' : '—'}</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-between gap-1 p-1 bg-black/40 rounded-xl border border-white/5">
                              {[
                                { id: 'en_attente', label: '⏳ En attente' },
                                { id: 'accepte', label: '🎉 Accepté' },
                                { id: 'refuse', label: '❌ Refusé' },
                                { id: 'sans_reponse', label: '👻 Sans suite' }
                              ].map(st => (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => handleQuickStatusChange(a, 'statut_reponse', st.id)}
                                  className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all cursor-pointer text-center ${
                                    a.statut_reponse === st.id
                                      ? 'bg-white/10 text-white shadow-sm'
                                      : 'text-white/30 hover:text-white'
                                  }`}
                                >
                                  {st.label}
                                </button>
                              ))}
                            </div>

                            {a.loyer > 0 && (
                              <button
                                type="button"
                                onClick={() => handleApplyLoyerToScenario(a.loyer)}
                                className="w-full py-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer mt-1"
                              >
                                <Calculator size={12} />
                                <span>Tester ce loyer ({a.loyer} €) dans le simulateur</span>
                              </button>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-12 text-center bg-black/20 rounded-3xl border border-dashed border-white/10 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
                    <Home size={24} />
                  </div>
                  <h3 className="text-sm font-black uppercase text-white tracking-wider">
                    Aucune annonce enregistrée
                  </h3>
                  <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                    Collez vos liens d'annonces ou le texte de vos annonces Leboncoin, SeLoger ou PAP pour les comparer.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAnnonceModalOpen(true)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer"
                  >
                    + Ajouter votre première annonce
                  </button>
                </div>
              )}
            </div>
          )}

          {/* =====================================================================
              VUE 2 : COMPARATEUR STRATÉGIQUE (SCÉNARIOS)
              ===================================================================== */}
          {viewMode === 'compare' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {statsArbitrage && statsArbitrage.ecartMensuel > 0 && (
                <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/15 via-indigo-500/10 to-transparent border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.25)] shrink-0">
                      <Award size={22} />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[8.5px] font-black uppercase tracking-widest text-emerald-400">
                        Arbitrage Financier
                      </span>
                      <h3 className="text-sm font-black text-white">
                        Le scénario <strong className="text-emerald-300">"{statsArbitrage.meilleur.scenario}"</strong> dégage <strong className="text-emerald-400">+{statsArbitrage.ecartMensuel.toFixed(0)} € / mois</strong> par rapport à "{statsArbitrage.moinsBon.scenario}".
                      </h3>
                      <p className="text-[10.5px] text-white/60">
                        Sur 1 an : gain net de <strong className="text-emerald-300">+{statsArbitrage.ecartAnnuel.toLocaleString('fr-FR')} € d'épargne supplémentaire</strong> pour le couple.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentScenario(statsArbitrage.meilleur.scenario);
                      setViewMode('simulator');
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer self-start md:self-auto"
                  >
                    <span>Activer</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              )}

              {/* Tableau comparatif côte à côte */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl space-y-3 overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Scale size={16} className="text-indigo-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">
                      Tableau Comparatif Côte à Côte
                    </h3>
                  </div>
                  <span className="text-[8.5px] font-black uppercase text-white/30 font-mono">
                    {scenarios.length} scénario(s) modélisé(s)
                  </span>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[9px] font-black uppercase text-white/40">
                        <th className="py-3 px-3 w-52">Critère / Métrique</th>
                        {comparaisonTousScenarios.map(s => (
                          <th key={s.scenario} className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-xs font-black uppercase truncate max-w-[150px] ${
                                s.scenario === currentScenario ? 'text-indigo-400 underline decoration-indigo-400 decoration-2' : 'text-white'
                              }`}>
                                {s.scenario}
                              </span>
                              <span className={`text-[7.5px] px-2 py-0.5 rounded-full font-black uppercase ${
                                s.verdictColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                                s.verdictColor === 'rose' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {s.tauxEffort.toFixed(0)}% effort
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/5 text-xs font-mono">
                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold text-white/60 text-[11px]">🏠 Loyer mensuel</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className="py-2.5 px-3 text-center font-bold text-white">
                            {s.montantLoyer > 0 ? `${s.montantLoyer.toFixed(0)} €` : '—'}
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold text-white/60 text-[11px]">💳 Total charges communes (lissées)</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className="py-2.5 px-3 text-center font-black text-indigo-300">
                            {s.chargesLissees.toFixed(0)} € / mois
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold text-white/60 text-[11px]">🛡️ Matelas / Surplus compte joint</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className={`py-2.5 px-3 text-center font-bold ${
                            s.soldeRestantCommun > 0 ? 'text-emerald-400' : s.soldeRestantCommun < 0 ? 'text-rose-400' : 'text-white/40'
                          }`}>
                            {s.soldeRestantCommun > 0 ? `+${s.soldeRestantCommun.toFixed(0)} €` : s.soldeRestantCommun < 0 ? `${s.soldeRestantCommun.toFixed(0)} €` : '0 €'}
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                        <td className="py-2.5 px-3 font-sans font-bold text-indigo-300 text-[11px]">👤 Part Lui (versée au joint)</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className="py-2.5 px-3 text-center font-bold text-white">
                            {s.partLui.toFixed(0)} € ({s.prorataLui.toFixed(0)}%)
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02] bg-white/[0.01]">
                        <td className="py-2.5 px-3 font-sans font-bold text-pink-300 text-[11px]">👤 Part Elle (versée au joint)</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className="py-2.5 px-3 text-center font-bold text-white">
                            {s.partElle.toFixed(0)} € ({s.prorataElle.toFixed(0)}%)
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold text-emerald-400 text-[11px]">✨ Reste net Lui (après perso)</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className={`py-2.5 px-3 text-center font-black ${s.resteLui >= 300 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {s.resteLui.toFixed(0)} €
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-3 font-sans font-bold text-emerald-400 text-[11px]">✨ Reste net Elle (après perso)</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className={`py-2.5 px-3 text-center font-black ${s.resteElle >= 300 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {s.resteElle.toFixed(0)} €
                          </td>
                        ))}
                      </tr>

                      <tr className="hover:bg-white/[0.03] bg-indigo-500/10 font-black">
                        <td className="py-3 px-3 font-sans uppercase tracking-wider text-indigo-300 text-[11px]">💰 Reste global Couple</td>
                        {comparaisonTousScenarios.map(s => (
                          <td key={s.scenario} className="py-3 px-3 text-center text-sm font-black text-white">
                            {s.resteCouple.toFixed(0)} € / mois
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fiches d'atouts & points faibles (+ et -) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparaisonTousScenarios.map(s => (
                  <div 
                    key={s.scenario}
                    className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                      s.scenario === currentScenario
                        ? 'bg-gradient-to-b from-indigo-500/15 via-black/40 to-black/60 border-indigo-500 shadow-xl'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-black uppercase text-white truncate max-w-[180px]">
                              {s.scenario}
                            </h4>
                            {s.scenario === currentScenario && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300 text-[7px] font-black uppercase">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-white/40 uppercase font-bold tracking-wider mt-0.5">
                            {s.chargesLissees.toFixed(0)} € charges • Reste couple : {s.resteCouple.toFixed(0)} €
                          </p>
                        </div>

                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                          s.verdictColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          s.verdictColor === 'rose' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {s.verdictColor === 'emerald' ? 'Optimal' : s.verdictColor === 'rose' ? 'Risqué' : 'Équilibré'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <p className="text-[10px] text-white/80 font-bold leading-relaxed">
                          💡 <strong className="text-white">Verdict :</strong> {s.verdict}.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Les Plus (+)
                        </span>
                        {s.pointsForts.map((pt, i) => (
                          <p key={i} className="text-[10px] text-emerald-200/90 leading-snug flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{pt}</span>
                          </p>
                        ))}
                      </div>

                      <div className="space-y-1 pt-1">
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1">
                          <AlertTriangle size={11} /> Les Moins (-)
                        </span>
                        {s.pointsFaibles.length > 0 ? (
                          s.pointsFaibles.map((pt, i) => (
                            <p key={i} className="text-[10px] text-rose-200/90 leading-snug flex items-start gap-1.5">
                              <span className="text-rose-400 font-bold shrink-0">✕</span>
                              <span>{pt}</span>
                            </p>
                          ))
                        ) : (
                          <p className="text-[9.5px] text-emerald-400/80 font-bold flex items-center gap-1">
                            <span>✓</span> Aucun point de vigilance critique.
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentScenario(s.scenario);
                        setViewMode('simulator');
                        toast.success(`Scénario "${s.scenario}" activé !`);
                      }}
                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        s.scenario === currentScenario
                          ? 'bg-white/10 text-white/50 border border-white/5 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95'
                      }`}
                    >
                      <span>{s.scenario === currentScenario ? 'Scénario déjà sélectionné' : 'Activer ce scénario'}</span>
                      {s.scenario !== currentScenario && <ArrowRight size={11} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              VUE 1 : SIMULATEUR DÉTAILLÉ
              ===================================================================== */}
          {viewMode === 'simulator' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Onglets scénarios & Création */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {scenarios.map(sc => {
                    const isCurrent = currentScenario === sc;
                    return (
                      <div 
                        key={sc} 
                        className={`flex items-center gap-2 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                          isCurrent 
                            ? 'border-indigo-500 text-white bg-indigo-500/15 shadow-sm' 
                            : 'border-white/5 text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setCurrentScenario(sc)}
                          className="outline-none cursor-pointer font-bold"
                        >
                          {sc}
                        </button>
                        
                        {isCurrent && scenarios.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleSupprimerScenario(sc)}
                            className="text-white/30 hover:text-rose-400 ml-1 transition-colors p-0.5 rounded cursor-pointer"
                            title={`Supprimer le scénario "${sc}"`}
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      setDuplicateName(`${currentScenario} (Copie)`);
                      setIsDuplicateModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                    title={`Dupliquer "${currentScenario}"`}
                  >
                    <Copy size={11} />
                    <span>Dupliquer</span>
                  </button>
                </div>

                <form onSubmit={handleCreerScenario} className="flex gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
                  <input 
                    type="text" 
                    placeholder="Nouveau scénario..." 
                    value={nouveauScenarioNom}
                    onChange={(e) => setNouveauScenarioNom(e.target.value)}
                    className="bg-transparent outline-none text-xs px-3 py-1.5 w-40 placeholder-white/20 font-bold"
                  />
                  <button type="submit" className="bg-indigo-500/10 hover:bg-indigo-500 text-indigo-300 hover:text-white px-3 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer">
                    + Créer
                  </button>
                </form>
              </div>

              {/* Salaires & Prorata */}
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col gap-5">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <Calculator size={16} className="text-emerald-400" />
                  <h2 className="text-xs font-black uppercase tracking-wider text-white/80">Nos Revenus Mensuels & Prorata</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase">Salaire Lui (€)</label>
                        <input 
                          type="number" 
                          value={salaireLui}
                          onChange={(e) => setSalaireLui(e.target.value)}
                          onBlur={(e) => upsertLigne("Salaire Lui", "revenus", "Salaire", e.target.value)}
                          className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-sm font-mono font-bold text-white outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-white/40 uppercase">Salaire Elle (€)</label>
                        <input 
                          type="number" 
                          value={salaireElle}
                          onChange={(e) => setSalaireElle(e.target.value)}
                          onBlur={(e) => upsertLigne("Salaire Elle", "revenus", "Salaire", e.target.value)} 
                          className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-sm font-mono font-bold text-white outline-none focus:border-emerald-500/50"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-amber-500/80 uppercase flex items-center gap-1">
                          <User size={10} /> Dépenses Perso Lui (€)
                        </label>
                        <input 
                          type="number" 
                          placeholder="Ex: 400" 
                          value={depensePersoLui}
                          onChange={(e) => setDepensePersoLui(e.target.value)}
                          onBlur={(e) => upsertLigne("Dépenses Perso (Lui)", "depenses", "Perso", e.target.value)}
                          className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs font-mono font-bold text-white outline-none focus:border-amber-500/40"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-amber-500/80 uppercase flex items-center gap-1">
                          <User size={10} /> Dépenses Perso Elle (€)
                        </label>
                        <input 
                          type="number" 
                          placeholder="Ex: 350" 
                          value={depensePersoElle}
                          onChange={(e) => setDepensePersoElle(e.target.value)}
                          onBlur={(e) => upsertLigne("Dépenses Perso (Elle)", "depenses", "Perso", e.target.value)}
                          className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs font-mono font-bold text-white outline-none focus:border-amber-500/40"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-3 rounded-xl border border-white/5 text-xs h-fit my-auto">
                    <div className="border-r border-white/5 pr-2">
                      <p className="font-black text-indigo-400 uppercase text-[9px] mb-1">Part Joint Lui ({calculs.prorataLui.toFixed(0)}%)</p>
                      <p className="text-base font-black font-mono">{calculs.partLui.toFixed(2)}€</p>
                    </div>
                    <div className="pl-1">
                      <p className="font-black text-pink-400 uppercase text-[9px] mb-1">Part Joint Elle ({calculs.prorataElle.toFixed(0)}%)</p>
                      <p className="text-base font-black font-mono">{calculs.partElle.toFixed(2)}€</p>
                    </div>
                  </div>
                </div>

                {/* Cible compte commun */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-wide text-white/80">Montant Cible du Compte Commun (Mensualisé)</span>
                      </div>
                      <p className="text-[10px] text-white/40">
                        {calculs.estForfaitaire 
                          ? "💡 Mode forfaitaire activé (versement différent de la somme exacte des charges)." 
                          : "💡 Mode automatique basé sur la somme lissée par mois de vos charges ci-dessous."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      <input 
                        type="number" 
                        placeholder="Fixer un total arbitraire..." 
                        value={montantCommunForfaitaire}
                        onChange={(e) => setMontantCommunForfaitaire(e.target.value)}
                        onBlur={(e) => upsertLigne("Objectif Compte Commun", "depenses", "Budget", e.target.value)}
                        className="h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs font-black text-indigo-400 placeholder-indigo-400/20 outline-none w-48 focus:border-indigo-500"
                      />
                      <div className="text-right shrink-0 border-l border-white/10 pl-3">
                        <p className="text-lg font-black text-indigo-400 font-mono">{calculs.charges.toFixed(2)} €</p>
                        <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Versé / mois</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-black/30 border border-white/5 rounded-lg px-3 py-1.5 text-[11px]">
                    <span className="text-white/40 font-medium flex items-center gap-1.5">
                      <Landmark size={12} className="text-white/30" /> Total des charges lissées : <strong className="text-white/70 font-mono">{calculs.totalCategories.toFixed(2)} € / mois</strong>
                    </span>
                    <span className={`font-black font-mono ${calculs.soldeRestantCommun >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {calculs.soldeRestantCommun >= 0 
                        ? `Reste sur le compte (Surplus) : +${calculs.soldeRestantCommun.toFixed(2)} €`
                        : `Manque à gagner sur le compte : ${calculs.soldeRestantCommun.toFixed(2)} €`
                      }
                    </span>
                  </div>
                </div>

                {/* Restes à vivre */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Reste net Lui</span>
                      <p className="text-[9px] text-emerald-400/60 font-medium">Après joint et dépenses persos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black font-mono text-emerald-400">
                        {calculs.resteLui.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Reste net Elle</span>
                      <p className="text-[9px] text-emerald-400/60 font-medium">Après joint et dépenses persos</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black font-mono text-emerald-400">
                        {calculs.resteElle.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ajout rapide de charge commune */}
              <form onSubmit={handleAjouterCategorie} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px] flex flex-col gap-1">
                  <label className="text-[10px] font-black text-white/40 uppercase">Sélectionner une catégorie</label>
                  <CustomSelect 
                    value={categorieSelect} 
                    options={toutesLesCategories.map(cat => ({ v: cat, l: cat }))} 
                    icon={Tag} 
                    isCategory={true}
                    onChange={(val) => setCategorieSelect(val)} 
                  />
                </div>
                
                <div className="w-32 flex flex-col gap-1">
                  <label className="text-[10px] font-black text-white/40 uppercase">Montant (€)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={montantInitial} 
                    onChange={(e) => setMontantInitial(e.target.value)} 
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>

                <div className="w-36 flex flex-col gap-1">
                  <label className="text-[10px] font-black text-white/40 uppercase">Fréquence</label>
                  <CustomSelect 
                    value={frequenceInitiale} 
                    options={[
                      { v: "mensuel", l: "Mensuel" },
                      { v: "trimestriel", l: "Trimestriel" },
                      { v: "semestriel", l: "Semestriel" },
                      { v: "annuel", l: "Annuel" }
                    ]} 
                    icon={Calendar} 
                    onChange={(val) => setFrequenceInitiale(val)} 
                  />
                </div>

                <button type="submit" className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[10px] tracking-wider px-5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95">
                  <Plus size={14} /> Ajouter la catégorie
                </button>
              </form>

              {/* Liste détaillée des charges */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/40 px-1">
                  Détails des frais du compte commun (valeurs brutes vs lissées)
                </p>
                
                <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                  {calculs.duScenario.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-white/5 rounded-xl text-white/20 text-xs font-bold uppercase">
                      Aucune catégorie de frais pour le moment.
                    </div>
                  ) : (
                    calculs.duScenario.map(l => {
                      const currentId = getLigneId(l);
                      const { getMontantMensuelLisse } = calculs;
                      const brawnValue = l.montant ?? '';

                      return (
                        <div key={currentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors gap-3">
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            <CategoryIcon name={l.categorie || l.titre} size={15} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-black uppercase tracking-wide text-white/80 truncate">
                                {getCleanCategoryName(l.titre)}
                              </span>
                              {l.frequence && l.frequence !== 'mensuel' && (
                                <span className="text-[10px] text-indigo-400 font-mono font-medium">
                                  Soit {getMontantMensuelLisse(l).toFixed(2)} € / mois
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 ml-auto sm:ml-0 shrink-0">
                            <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 h-7 focus-within:border-indigo-500/50">
                              <input 
                                type="number" 
                                className="bg-transparent text-right text-xs font-mono font-black text-white outline-none w-16"
                                value={brawnValue}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLignes(prev => prev.map(item => getLigneId(item) === currentId ? { ...item, montant: val } : item));
                                }}
                                onBlur={(e) => upsertLigne(l.titre, 'depenses', l.categorie, e.target.value, l.frequence || 'mensuel')}
                              />
                              <span className="text-[10px] font-bold text-white/30 ml-1">€</span>
                            </div>

                            <CustomSelect 
                              value={l.frequence || 'mensuel'} 
                              options={[
                                { v: "mensuel", l: "par mois" },
                                { v: "trimestriel", l: "par trimestre" },
                                { v: "semestriel", l: "par semestre" },
                                { v: "annuel", l: "par an" }
                              ]} 
                              icon={Calendar} 
                              onChange={(newFreq) => {
                                setLignes(prev => prev.map(item => getLigneId(item) === currentId ? { ...item, frequence: newFreq } : item));
                                upsertLigne(l.titre, 'depenses', l.categorie, l.montant, newFreq);
                              }} 
                            />

                            <button 
                              onClick={() => handleSupprimerLigne(l)} 
                              className="text-white/20 hover:text-rose-400 p-1 rounded-lg transition-colors ml-1 cursor-pointer"
                              title="Enlever cette catégorie"
                            >
                              <Trash2 size={13}/>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* 🟢 COLONNE DROITE PERMANENTE : BLOC-NOTES & TÂCHES */}
        <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col">
          <div className="bg-white/[0.01] border border-white/5 rounded-3xl p-5 sticky top-6 flex flex-col h-[580px] gap-3 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-indigo-400" />
                <h2 className="text-xs font-black uppercase tracking-wider text-white/80">Bloc-Notes & Tâches</h2>
              </div>
              
              <button 
                type="button"
                onClick={insererCheckbox}
                className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-2.5 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
                title="Ajouter une tâche"
              >
                <Plus size={11} strokeWidth={3} />
                <span>checkbox</span>
              </button>
            </div>
            
            <div
              ref={editorRef}
              contentEditable
              onInput={handleInput}
              onClick={handleEditorClick}
              onKeyDown={handleKeyDown}
              placeholder="Écrivez vos remarques, contacts d'agences..."
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-2xl p-3.5 text-xs text-white/80 outline-none overflow-y-auto focus:border-indigo-500/50 leading-relaxed font-medium custom-scrollbar"
              style={{ minHeight: '120px' }}
            />
            
            <div className="text-[9px] uppercase font-bold tracking-wider text-right transition-colors">
              {isSaving ? (
                <span className="text-amber-400 animate-pulse">Sauvegarde en cours...</span>
              ) : (
                <span className="text-white/30">Sauvegarde automatique active</span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          MODALE DE DUPLICATION DE SCÉNARIO
          ========================================================================= */}
      {isDuplicateModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsDuplicateModalOpen(false)} />

          <div 
            className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <Copy size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest leading-none">
                    Dupliquer le scénario
                  </h4>
                  <p className="text-[9px] text-white/30 uppercase font-bold mt-1">
                    Copie complète de "{currentScenario}"
                  </p>
                </div>
              </div>
              <button onClick={() => setIsDuplicateModalOpen(false)} className="p-1 text-white/40 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteDuplicate} className="space-y-4">
              <div>
                <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">
                  Nom du nouveau scénario
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={duplicateName}
                  onChange={(e) => setDuplicateName(e.target.value)}
                  placeholder="Ex: Scénario Loyer 1100€..."
                  className="w-full bg-black/40 border border-white/10 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-[9px] text-white/50 leading-relaxed">
                Tous les salaires, dépenses personnelles, charges communes et fréquences seront copiés à l'identique dans cette nouvelle version.
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="py-2.5 rounded-xl bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isDuplicating || !duplicateName.trim()}
                  className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  {isDuplicating ? "Copie en cours..." : "Dupliquer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALE D'AJOUT & SCRAPING D'ANNONCE IMMOBILIÈRE (AVEC SMART PASTE IA)
          ========================================================================= */}
      {isAnnonceModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsAnnonceModalOpen(false)} />

          <div 
            className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-xl">
                  <Home size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-widest leading-none">
                    {annonceForm.id ? "Modifier l'annonce" : "Nouvelle annonce"}
                  </h4>
                  <p className="text-[9px] text-white/30 uppercase font-bold mt-1">
                    Leboncoin, SeLoger, PAP ou saisie instantanée
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAnnonceModalOpen(false)} className="p-1 text-white/40 hover:text-white cursor-pointer">
                <X size={16} />
              </button>
            </div>

            {/* Commutateur de saisie : Lien URL ou Texte copié (IA) */}
            <div className="space-y-2">
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setShowSmartPaste(false)}
                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    !showSmartPaste ? 'bg-purple-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                >
                  🔗 Par Lien URL
                </button>
                <button
                  type="button"
                  onClick={() => setShowSmartPaste(true)}
                  className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    showSmartPaste ? 'bg-purple-600 text-white shadow-md' : 'text-white/40 hover:text-white'
                  }`}
                >
                  <Sparkles size={11} className="text-amber-400" />
                  <span>📋 Texte copié / Partage (IA)</span>
                </button>
              </div>

              {!showSmartPaste ? (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                  <label className="text-[8.5px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                    <Sparkles size={12} /> Coller le lien de l'annonce
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="url"
                      placeholder="https://www.leboncoin.fr/ad/locations/..."
                      value={scrapingUrl}
                      onChange={(e) => setScrapingUrl(e.target.value)}
                      className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleScrape}
                      disabled={isScraping || !scrapingUrl.trim()}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 shrink-0"
                    >
                      {isScraping ? "Analyse..." : "Extraire"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent border border-indigo-500/30 space-y-2.5">
                  <label className="text-[8.5px] font-black uppercase text-indigo-300 tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ClipboardPaste size={12} /> Collez le texte ou le message de partage de l'annonce
                    </span>
                    <span className="text-[7.5px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-200 font-mono">
                      Anti-blocage 100%
                    </span>
                  </label>
                  <textarea 
                    rows="3"
                    placeholder="Collez ici le texte de l'annonce Leboncoin ou le message généré par le bouton Partager de l'app mobile..."
                    value={pastedAdText}
                    onChange={(e) => setPastedAdText(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-indigo-500 placeholder:text-white/20"
                  />
                  <button
                    type="button"
                    onClick={handleSmartParseText}
                    disabled={isParsingText || !pastedAdText.trim()}
                    className="w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Sparkles size={12} />
                    <span>{isParsingText ? "Analyse par Gemini..." : "Extraire les infos par IA"}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Formulaire des champs */}
            <form onSubmit={handleSaveAnnonce} className="space-y-3.5">
              <div>
                <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Titre de l'annonce</label>
                <input 
                  type="text"
                  required
                  placeholder="Ex: T3 lumineux avec balcon centre-ville"
                  value={annonceForm.titre}
                  onChange={(e) => setAnnonceForm({ ...annonceForm, titre: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Loyer (€ CC / mois)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="850"
                    value={annonceForm.loyer}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, loyer: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Surface (m²)</label>
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="65"
                    value={annonceForm.surface}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, surface: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Nombre de pièces</label>
                  <input 
                    type="number"
                    placeholder="3"
                    value={annonceForm.pieces}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, pieces: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Ville / Quartier</label>
                  <input 
                    type="text"
                    placeholder="Rennes (Thabor)"
                    value={annonceForm.ville}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, ville: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Source & Lien */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Plateforme</label>
                  <select
                    value={annonceForm.source}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, source: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="Leboncoin">Leboncoin</option>
                    <option value="SeLoger">SeLoger</option>
                    <option value="PAP">PAP</option>
                    <option value="Bien'ici">Bien'ici</option>
                    <option value="Jinka">Jinka</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">Lien de l'annonce</label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    value={annonceForm.url}
                    onChange={(e) => setAnnonceForm({ ...annonceForm, url: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">
                  URL de la photo principale
                </label>
                <input 
                  type="url"
                  placeholder="https://image.jpg..."
                  value={annonceForm.photos && annonceForm.photos.length > 0 ? annonceForm.photos[0] : ''}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setAnnonceForm({ ...annonceForm, photos: val ? [val] : [] });
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-purple-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[8.5px] font-black uppercase text-white/40 tracking-wider block mb-1">
                  Description / Remarques
                </label>
                <textarea 
                  rows="3"
                  placeholder="Cuisine équipée, 2e étage sans ascenseur, parking souterrain..."
                  value={annonceForm.notes}
                  onChange={(e) => setAnnonceForm({ ...annonceForm, notes: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAnnonceModalOpen(false)}
                  className="py-2.5 rounded-xl bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 active:scale-95 cursor-pointer"
                >
                  {annonceForm.id ? "Mettre à jour" : "Ajouter l'annonce"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}