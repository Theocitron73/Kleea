import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Wallet, Mail, Rocket, Lock, Target, Unlock, Plus, X, 
  ShieldCheck, Trash2, Edit3, Check, Calendar 
} from 'lucide-react';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePicker from "react-datepicker";

// Composant interne pour le Drag and Drop
function SortableItem({ id, children, disabled }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative',
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`group relative border-white/70 transition-all rounded-[var(--radius)] ${
        isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : ''
      }`}>
        {!disabled && (
          <div 
            {...listeners} 
            className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center bg-[var(--glass-bg)] hover:bg-white/20 border border-white/10 rounded-full cursor-grab active:cursor-grabbing z-50 transition-colors backdrop-blur-[var(--glass-blur)]"
          >
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white/40 rounded-full" />)}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default function GestionEpargneProjet({
  soldeGlobal = 0,
  allocations = [],
  setAllocations = () => {},
  projets = [],
  setProjets = () => {},
  filters = { profil: 'default' },
  user = 'Utilisateur',
  api,
  fetchAllocations = () => {},
  recapAnnuelStats = [],
  transactions = [],
}) {
  // ==========================================
  // 1. STATES LOCAUX
  // ==========================================
  const [activeTab, setActiveTab] = useState('envelopes');
  const [showAddProjet, setShowAddProjet] = useState(false);
  const [newProjet, setNewProjet] = useState({ nom: '', cout: '' });
  const [deleteModal, setDeleteModal] = useState({ show: false, projetNom: null });

  // Projets futurs
  const [showAddProject, setShowAddProject] = useState(false);
  const [form2, setForm2] = useState({ 
    nom: '', 
    cout: '', 
    apport: '', 
    capa: '', 
    date: null, 
    date_debut: new Date(),
    utiliser_capa_stricte: false
  });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [tempProjet, setTempProjet] = useState({ 
    nom: '', 
    cout: '', 
    apport: '', 
    date: null, 
    date_debut: null, 
    capa: '',
    utiliser_capa_stricte: false
  });
  const [itemToDelete, setItemToDelete] = useState(null);

  const profilId = filters?.profil;

  // ==========================================
  // 2. HELPERS / FONCTIONS UTILITAIRES
  // ==========================================
  const formatDateForApi = (dateInput) => {
    if (!dateInput) return new Date().toISOString().split('T')[0];
    const d = new Date(dateInput);
    return isNaN(d.getTime())
      ? new Date().toISOString().split('T')[0]
      : d.toISOString().split('T')[0];
  };

  const calculerMoisEcoules = (dateDebutStr, moisCourantStr) => {
    if (!dateDebutStr || !moisCourantStr) return 0;
    const dStr = String(dateDebutStr).slice(0, 7);
    const cStr = String(moisCourantStr).slice(0, 7);
    if (cStr < dStr) return 0;
    const [dYear, dMonth] = dStr.split('-').map(Number);
    const [cYear, cMonth] = cStr.split('-').map(Number);
    if (isNaN(dYear) || isNaN(dMonth) || isNaN(cYear) || isNaN(cMonth)) return 0;
    return Math.max(0, (cYear - dYear) * 12 + (cMonth - dMonth) + 1);
  };

  const calculerCumulProjet = (projet) => {
    const aujourdhui = new Date();
    const dateDebut = new Date(projet.date_debut);
    if (dateDebut > aujourdhui) return Number(projet.apport) || 0;
    const moisEcoules =
      (aujourdhui.getFullYear() - dateDebut.getFullYear()) * 12 +
      (aujourdhui.getMonth() - dateDebut.getMonth());
    const apportInitial = Number(projet.apport) || 0;
    const epargneMensuelle = Number(projet.capa) || 0;
    const coutTotal = Number(projet.cout) || 0;
    return Math.min(apportInitial + (moisEcoules * epargneMensuelle), coutTotal);
  };

  // ==========================================
  // 3. CALCULS MÉMOÏSÉS DE BASE & DÉPENSES
  // ==========================================
  const allocationsParProjet = useMemo(() => {
    const map = {};
    if (Array.isArray(allocations)) {
      allocations.forEach((a) => {
        if (a && a.projet && map[a.projet] === undefined) {
          map[a.projet] = parseFloat(a.montant_alloue) || 0;
        }
      });
    }
    return map;
  }, [allocations]);

  const sommeEnveloppes = useMemo(() => {
    return Object.values(allocationsParProjet).reduce((acc, curr) => acc + curr, 0);
  }, [allocationsParProjet]);

  const depensesParEnveloppe = useMemo(() => {
    return (transactions || []).reduce((acc, t) => {
      if (t && t.enveloppe) {
        const keyClean = String(t.enveloppe).toLowerCase().trim();
        const montant = Math.abs(parseFloat(t.montant) || 0);
        if (!acc[keyClean]) acc[keyClean] = { montant: 0, count: 0 };
        acc[keyClean].montant += montant;
        acc[keyClean].count += 1;
      }
      return acc;
    }, {});
  }, [transactions]);

  const totalDepensesEnveloppes = useMemo(() => {
    return Object.values(depensesParEnveloppe).reduce((acc, curr) => acc + curr.montant, 0);
  }, [depensesParEnveloppe]);

  const soldeGlobalNet = Math.max(0, parseFloat(soldeGlobal) || 0);

  const sommeEnveloppesNette = useMemo(() => {
    return Math.max(0, sommeEnveloppes - totalDepensesEnveloppes);
  }, [sommeEnveloppes, totalDepensesEnveloppes]);

  const sommeAllocations = sommeEnveloppesNette;

  const sommeApportsProjets = useMemo(() => {
    if (!Array.isArray(projets)) return 0;
    return projets.reduce((acc, p) => acc + (parseFloat(p.apport || p.apport_initial || 0)), 0);
  }, [projets]);

  const listeAffichage = useMemo(() => {
    const allocationsArray = Array.isArray(allocations) ? allocations : [];
    const enveloppesMap = new Map();
    allocationsArray.forEach((a) => {
      if (a && a.projet && !enveloppesMap.has(a.projet.toLowerCase())) {
        enveloppesMap.set(a.projet.toLowerCase(), {
          id: a.projet,
          nom: a.projet,
        });
      }
    });
    return Array.from(enveloppesMap.values());
  }, [allocations]);

  // ==========================================
  // 4. ÉPARGNE DU MOIS & VENTILATION AUTOMATIQUE
  // ==========================================
  const { epargneDuMois, moisCourantStr } = useMemo(() => {
    const moisListeLocaux = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const anneeFiltre = filters?.annee || new Date().getFullYear();
    let moisIndex = new Date().getMonth();

    if (filters?.mois !== undefined && filters?.mois !== null) {
      if (typeof filters.mois === 'number') {
        moisIndex = filters.mois;
      } else if (typeof filters.mois === 'string') {
        if (!isNaN(parseInt(filters.mois, 10))) {
          moisIndex = parseInt(filters.mois, 10) - 1;
        } else {
          const found = moisListeLocaux.findIndex(
            (m) => m.toLowerCase() === filters.mois.toLowerCase()
          );
          if (found !== -1) moisIndex = found;
        }
      }
    }

    const mm = String(moisIndex + 1).padStart(2, '0');
    const targetMoisStr = `${anneeFiltre}-${mm}`;

    let epargneTrouvee = 0;
    if (Array.isArray(recapAnnuelStats)) {
      const statMois = recapAnnuelStats.find((s) => {
        const dateStat = String(s.mois || s.date || '').slice(0, 7);
        return dateStat === targetMoisStr;
      });
      if (statMois) {
        epargneTrouvee = parseFloat(statMois.epargne) || 0;
      } else if (recapAnnuelStats[moisIndex]) {
        epargneTrouvee = parseFloat(recapAnnuelStats[moisIndex].epargne) || 0;
      }
    }

    return {
      epargneDuMois: Math.max(0, epargneTrouvee),
      moisCourantStr: targetMoisStr,
    };
  }, [filters?.annee, filters?.mois, recapAnnuelStats]);

  const ventilationAutomatique = useMemo(() => {
    const epargneBruteMois = Math.max(0, parseFloat(epargneDuMois) || 0);
    const disponibleGlobalBrut = Math.max(0, soldeGlobalNet - sommeEnveloppesNette);
    let epargneDuMoisRestante = Math.min(epargneBruteMois, disponibleGlobalBrut);

    let totalDistribueProjets = 0;
    const repartitionProjets = {};
    const cumulProjets = {};

    const getIndexMois = (nomMoisStr) => {
      const clean = String(nomMoisStr || '').toLowerCase().trim();
      if (clean.includes("janv")) return 0;
      if (clean.includes("févr") || clean.includes("fevr")) return 1;
      if (clean.includes("mars")) return 2;
      if (clean.includes("avr")) return 3;
      if (clean.includes("mai")) return 4;
      if (clean.includes("juin")) return 5;
      if (clean.includes("juil")) return 6;
      if (clean.includes("aou") || clean.includes("aoû")) return 7;
      if (clean.includes("sept")) return 8;
      if (clean.includes("oct")) return 9;
      if (clean.includes("nov")) return 10;
      if (clean.includes("déc") || clean.includes("dec")) return 11;
      return -1;
    };

    const [, moisSel] = (moisCourantStr || '').split('-').map(Number);
    const indexMoisCourant = moisSel ? moisSel - 1 : 0;

    const epargneCumuleeParMois = [];
    if (Array.isArray(recapAnnuelStats)) {
      recapAnnuelStats.forEach((stat, i) => {
        let idxMoisStat = getIndexMois(stat.nom || stat.mois);
        if (idxMoisStat === -1) idxMoisStat = i;
        epargneCumuleeParMois[idxMoisStat] = Math.max(0, parseFloat(stat.epargne) || 0);
      });
    }

    let cagnottePasseGlobalRestante = 0;
    for (let m = 0; m < indexMoisCourant; m++) {
      cagnottePasseGlobalRestante += epargneCumuleeParMois[m] || 0;
    }

    let soldeDisponiblePourPasse = Math.max(0, disponibleGlobalBrut - epargneDuMoisRestante);

    (projets || []).forEach((p, idx) => {
      const key = String(p.id || p._id || p.nom || idx);
      const cout = parseFloat(p.cout || p.cout_total || p.montant || 0);
      const apportInitial = parseFloat(p.apport || p.apport_initial || 0);
      const dateDebutStr = p.date_debut ? String(p.date_debut).slice(0, 7) : moisCourantStr;
      const capaProjet = parseFloat(p.capa) || 0;
      const utiliseCapaStricte = Boolean(p.utiliser_capa_stricte);

      if (moisCourantStr < dateDebutStr) {
        repartitionProjets[key] = 0;
        cumulProjets[key] = Math.min(apportInitial, cout);
        return;
      }

      const besoinTotal = Math.max(0, cout - apportInitial);
      const [, mDebut] = dateDebutStr.split('-').map(Number);
      const idxDebutProjet = mDebut ? mDebut - 1 : indexMoisCourant;

      if (utiliseCapaStricte) {
        let cumulStrict = apportInitial;
        let alloueCeMoisStrict = 0;

        for (let mIdx = idxDebutProjet; mIdx <= indexMoisCourant; mIdx++) {
          const estMoisCourant = mIdx === indexMoisCourant;
          let epargneMoisItere = estMoisCourant ? epargneDuMoisRestante : (epargneCumuleeParMois[mIdx] || 0);
          const besoinReste = Math.max(0, cout - cumulStrict);

          if (besoinReste > 0 && epargneMoisItere > 0) {
            const plafond = capaProjet > 0 ? Math.min(besoinReste, capaProjet) : besoinReste;
            const alloue = Math.min(epargneMoisItere, plafond);
            cumulStrict += alloue;
            if (estMoisCourant) alloueCeMoisStrict = alloue;
          }
        }

        repartitionProjets[key] = alloueCeMoisStrict;
        cumulProjets[key] = Math.max(apportInitial, Math.min(cout, cumulStrict, disponibleGlobalBrut));
        epargneDuMoisRestante = Math.max(0, epargneDuMoisRestante - alloueCeMoisStrict);
        totalDistribueProjets += alloueCeMoisStrict;

      } else {
        let cagnottePasseEligibleProjet = 0;
        for (let m = idxDebutProjet; m < indexMoisCourant; m++) {
          cagnottePasseEligibleProjet += epargneCumuleeParMois[m] || 0;
        }

        const maxPrelevablePasse = Math.min(cagnottePasseEligibleProjet, cagnottePasseGlobalRestante, soldeDisponiblePourPasse);
        const prisSurPasse = Math.min(maxPrelevablePasse, besoinTotal);

        cagnottePasseGlobalRestante = Math.max(0, cagnottePasseGlobalRestante - prisSurPasse);
        soldeDisponiblePourPasse = Math.max(0, soldeDisponiblePourPasse - prisSurPasse);

        let alloueMoisCourant = 0;
        const resteAFinancerGlobal = Math.max(0, besoinTotal - prisSurPasse);

        if (resteAFinancerGlobal > 0 && epargneDuMoisRestante > 0) {
          alloueMoisCourant = Math.min(epargneDuMoisRestante, resteAFinancerGlobal);
          epargneDuMoisRestante = Math.max(0, epargneDuMoisRestante - alloueMoisCourant);
          totalDistribueProjets += alloueMoisCourant;
        }

        repartitionProjets[key] = alloueMoisCourant;
        cumulProjets[key] = Math.min(cout, apportInitial + prisSurPasse + alloueMoisCourant, disponibleGlobalBrut);
      }
    });

    return {
      partProjets: totalDistribueProjets,
      partEnveloppes: Math.max(0, epargneDuMoisRestante),
      repartitionProjets,
      cumulProjets,
    };
  }, [epargneDuMois, moisCourantStr, projets, recapAnnuelStats, soldeGlobalNet, sommeEnveloppesNette]);

  // ==========================================
  // 5. CALCULS DÉPENDANTS DE LA VENTILATION
  // ==========================================
  const cumulGlobalEpargne = useMemo(() => {
    return (projets || [])
      .filter((p) => new Date(p.date_debut) <= new Date())
      .reduce((acc, p) => acc + calculerCumulProjet(p), 0);
  }, [projets]);

  const totalDepenseProjets = useMemo(() => {
    return Object.values(ventilationAutomatique.cumulProjets || {}).reduce(
      (acc, val) => acc + (parseFloat(val) || 0), 0
    );
  }, [ventilationAutomatique.cumulProjets]);

  const sommeFinancementProjets = useMemo(() => {
    if (!Array.isArray(projets)) return 0;
    return projets.reduce((acc, p, idx) => {
      const key = String(p.id || p._id || p.nom || idx);
      const financeDynamique = ventilationAutomatique.cumulProjets[key];
      const financeDirect = parseFloat(p.apport || p.apport_initial || p.financement_actuel || p.cumul || 0);
      return acc + (financeDynamique !== undefined ? financeDynamique : financeDirect);
    }, 0);
  }, [projets, ventilationAutomatique]);

  const soldeDisponiblePourEnveloppes = useMemo(() => {
    return Math.max(0, soldeGlobalNet - sommeFinancementProjets);
  }, [soldeGlobalNet, sommeFinancementProjets]);

  const pourcentageSanctuarise = soldeDisponiblePourEnveloppes > 0 
    ? Math.min(100, Math.round((sommeAllocations / soldeDisponiblePourEnveloppes) * 100)) 
    : 0;

  const epargneDisponible = useMemo(() => {
    return Math.max(0, soldeGlobalNet - (sommeEnveloppesNette + sommeFinancementProjets));
  }, [soldeGlobalNet, sommeEnveloppesNette, sommeFinancementProjets]);

  const pctEnveloppes = soldeGlobalNet > 0 ? Math.min(100, Math.max(0, (sommeEnveloppesNette / soldeGlobalNet) * 100)) : 0;
  const pctProjets = soldeGlobalNet > 0 ? Math.min(100 - pctEnveloppes, Math.max(0, (sommeFinancementProjets / soldeGlobalNet) * 100)) : 0;
  const pctDisponible = Math.max(0, 100 - (pctEnveloppes + pctProjets));

  // ==========================================
  // 6. FETCHING & ACTIONS API
  // ==========================================
  const fetchProjets = useCallback(async () => {
    if (!api || !profilId) return;
    try {
      const res = await api.get(`/get-projets/${encodeURIComponent(profilId)}`);
      if (Array.isArray(res.data)) setProjets(res.data);
    } catch (error) {}
  }, [api, profilId, setProjets]);

  const handleFetchAllocations = useCallback(async () => {
    if (!filters?.profil || !api) return;
    try {
      const response = await api.get(`/get-allocations/${filters.profil}`);
      setAllocations(response.data);
    } catch (error) {}
  }, [filters?.profil, api, setAllocations]);

  useEffect(() => {
    if (profilId) {
      handleFetchAllocations();
      fetchProjets();
    }
  }, [profilId, handleFetchAllocations, fetchProjets]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd2 = (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setProjets((items) => {
        const oldIndex = items.findIndex((i) => (i.id || i.nom) === active.id);
        const newIndex = items.findIndex((i) => (i.id || i.nom) === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveAllocation = async (nomEnveloppe, montant) => {
    const userName = typeof user === 'string' ? user : (user?.username || user?.nom || 'Anonyme');
    if (!nomEnveloppe || !montant) return;

    try {
      const res = await api.post(`/save-allocation`, {
        utilisateur: String(userName),
        profil: String(filters?.profil || 'default'),
        projet: String(nomEnveloppe),
        montant_alloue: parseFloat(montant),
      });
      if (res.data?.status === "success") {
        setNewProjet({ nom: '', cout: '' });
        setShowAddProjet(false);
        fetchAllocations();
      }
    } catch (error) {}
  };

  const handleUpdateAllocation = async (projetNom, nouveauMontant) => {
    if (!api) return;
    try {
      await api.put(
        `/update-enveloppe-montant?projet=${encodeURIComponent(projetNom)}&profil=${encodeURIComponent(filters?.profil)}&nouveau_montant=${nouveauMontant}`
      );
      fetchAllocations();
    } catch (error) {}
  };

  const handleDeleteEnveloppe = async (projetNom) => {
    if (!api) return;
    try {
      await api.delete(`/delete-enveloppe/${encodeURIComponent(projetNom)}?profil=${encodeURIComponent(filters?.profil)}`);
      fetchAllocations();
    } catch (error) {}
  };

  const handleAddProject = async () => {
    if (!form2.nom || !form2.cout || !api) return;
    const userName = typeof user === 'string' ? user : (user?.username || user?.nom || 'Anonyme');

    try {
      const res = await api.post('/save-projet', {
        utilisateur: String(userName),
        profil: String(filters?.profil || 'default'),
        nom: String(form2.nom),
        cout: parseFloat(form2.cout) || 0,
        apport: parseFloat(form2.apport) || 0,
        capa: parseFloat(form2.capa) || 0,
        utiliser_capa_stricte: Boolean(form2.utiliser_capa_stricte),
        date: formatDateForApi(form2.date),
        date_debut: formatDateForApi(form2.date_debut),
      });
      if (res.data?.status === "success") {
        setForm2({ nom: '', cout: '', apport: '', capa: '', utiliser_capa_stricte: false, date: null, date_debut: new Date() });
        setShowAddProject(false);
        fetchProjets();
      }
    } catch (error) {}
  };

  const handleUpdateProject = async (updatedData, oldNom) => {
    if (!api) return;
    const userName = typeof user === 'string' ? user : (user?.username || user?.nom || 'Anonyme');

    try {
      const res = await api.post(`/update-projet?old_name=${encodeURIComponent(oldNom)}`, {
        utilisateur: String(userName),
        profil: String(filters?.profil || 'default'),
        nom: String(updatedData.nom),
        cout: parseFloat(updatedData.cout) || 0,
        apport: parseFloat(updatedData.apport) || 0,
        capa: parseFloat(updatedData.capa) || 0,
        utiliser_capa_stricte: Boolean(updatedData.utiliser_capa_stricte),
        date: formatDateForApi(updatedData.date),
        date_debut: formatDateForApi(updatedData.date_debut),
      });
      if (res.data?.status === "success") {
        setEditingIndex(null);
        setEditingId(null);
        fetchProjets();
      }
    } catch (error) {}
  };

  const handleDeleteProject = async (nom) => {
    if (!api || !filters?.profil) return;
    try {
      await api.delete(`/delete-projet/${encodeURIComponent(nom)}/${encodeURIComponent(filters.profil)}`);
      fetchProjets();
    } catch (error) {}
  };

  // ==========================================
  // 7. RENDU VISUEL
  // ==========================================
  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 shadow-xl backdrop-blur-[var(--glass-blur)]">

      {/* HEADER & ONGLETS COMBINÉS */}
      <div className="p-2.5 px-3.5 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-transparent rounded-[var(--radius)] border border-white/10 shadow-sm backdrop-blur-[var(--glass-blur)] shrink-0 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 shrink-0">
                <Wallet size={14} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-[var(--text-main)]/50 tracking-wider">Épargne :</span>
                <span className="text-sm font-black text-[var(--text-main)] tabular-nums">
                  {soldeGlobalNet.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </div>
            </div>

            <div className="h-4 w-[1px] bg-white/10 hidden sm:block" />

            <div className="flex items-center gap-1 p-0.5 bg-black/30 rounded-lg border border-white/5">
              <button
                onClick={() => setActiveTab('envelopes')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'envelopes'
                    ? 'bg-white/10 text-[var(--text-main)] shadow-sm border border-white/10'
                    : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                <Mail size={13} className={activeTab === 'envelopes' ? 'text-emerald-400' : 'opacity-60'} />
                <span className="hidden md:inline">Enveloppes</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold leading-none ${
                  activeTab === 'envelopes' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-[var(--text-main)]/40'
                }`}>
                  {listeAffichage.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('projets')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'projets'
                    ? 'bg-white/10 text-[var(--text-main)] shadow-sm border border-white/10'
                    : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)] hover:bg-white/5'
                }`}
              >
                <Rocket size={13} className={activeTab === 'projets' ? 'text-amber-400' : 'opacity-60'} />
                <span className="hidden md:inline">Projets</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold leading-none ${
                  activeTab === 'projets' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-[var(--text-main)]/40'
                }`}>
                  {(projets || []).length}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 overflow-x-auto">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Lock size={11} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] uppercase text-[var(--text-main)]/50 font-semibold hidden lg:inline">Réservé :</span>
              <span className="text-xs font-black text-emerald-400 tabular-nums">
                {sommeEnveloppesNette.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <div className="h-3 w-[1px] bg-white/10" />

            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Target size={11} className="text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase text-[var(--text-main)]/50 font-semibold hidden lg:inline">Projets :</span>
              <span className="text-xs font-black text-amber-400 tabular-nums">
                {sommeFinancementProjets.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>

            <div className="h-3 w-[1px] bg-white/10" />

            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Unlock size={11} className="text-sky-400 shrink-0" />
              <span className="text-[10px] uppercase text-[var(--text-main)]/50 font-semibold hidden lg:inline">Libre :</span>
              <span className="text-xs font-black text-sky-400 tabular-nums">
                {epargneDisponible.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2 pt-1 border-t border-white/5">
          <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden flex gap-0.5">
            {pctEnveloppes > 0 && <div style={{ width: `${pctEnveloppes}%` }} className="h-full bg-emerald-500 rounded-full" />}
            {pctProjets > 0 && <div style={{ width: `${pctProjets}%` }} className="h-full bg-amber-500 rounded-full" />}
            {pctDisponible > 0 && <div style={{ width: `${pctDisponible}%` }} className="h-full bg-sky-500 rounded-full" />}
          </div>
        </div>
      </div>

      {/* ================= ONGLET 1 : ENVELOPPES ================= */}
      {activeTab === 'envelopes' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mb-3 p-3 bg-black/20 rounded-[var(--radius)] border border-white/5 shrink-0">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-widest">Part de l'épargne allouée</span>
              <span className="text-xs font-bold text-[var(--text-main)]/80">{pourcentageSanctuarise}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--glass-bg)] rounded-[var(--radius)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
                style={{ width: `${pourcentageSanctuarise}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2 text-[8px] text-[var(--text-main)]/40 font-medium">
              <span>Restant réservé : {sommeAllocations.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
              <span>Dispo réel : {soldeDisponiblePourEnveloppes.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span>
            </div>
          </div>

          {!showAddProjet ? (
            <button 
              onClick={() => setShowAddProjet(true)}
              className="w-full py-2.5 mb-3 border-2 border-dashed border-white/10 rounded-[var(--radius)] flex items-center justify-center gap-2 text-[var(--text-main)]/40 hover:text-[var(--text-main)] hover:border-white/20 transition-all shrink-0"
            >
              <div className="p-1 bg-[var(--glass-bg)] rounded-[var(--radius)]">
                <Plus size={14} />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">Créer une réserve d'épargne</span>
            </button>
          ) : (
            <div className="mb-3 p-4 bg-black/40 border border-white/10 rounded-xl shrink-0">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Nouvelle Enveloppe</span>
                <button onClick={() => setShowAddProjet(false)} className="text-[var(--text-main)]/20 hover:text-[var(--text-main)]">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  placeholder="Nom (ex: Urgence, Vacances)"
                  className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[var(--text-main)] outline-none"
                  value={newProjet.nom}
                  onChange={e => setNewProjet({...newProjet, nom: e.target.value})}
                />
                <input 
                  type="number"
                  placeholder="Montant alloué (€)"
                  className="bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-[var(--text-main)] outline-none"
                  value={newProjet.cout}
                  onChange={e => setNewProjet({...newProjet, cout: e.target.value})}
                />
              </div>
              <button 
                onClick={() => handleSaveAllocation(newProjet.nom, newProjet.cout)}
                className="w-full mt-3 py-2 bg-emerald-500 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
              >
                Allouer l'épargne
              </button>
            </div>
          )}

          <div className="overflow-y-auto pr-1 flex-1 grid grid-cols-1 md:grid-cols-2 min-[2000px]:grid-cols-1 gap-2.5 content-start custom-scrollbar w-full">
            {listeAffichage.length === 0 ? (
              <div className="text-center py-6 col-span-full">
                <p className="text-xs text-[var(--text-main)]/30 font-medium mb-1">Aucune enveloppe d'épargne créée.</p>
                <span className="text-[10px] text-[var(--text-main)]/20">Affectez votre solde actuel pour réserver vos fonds.</span>
              </div>
            ) : (
              listeAffichage.map((projet) => {
                const nomClean = String(projet.nom || '').toLowerCase().trim();
                const totalAlloue = allocationsParProjet[projet.nom] || 0;
                const dataDepenses = depensesParEnveloppe[nomClean] || { montant: 0, count: 0 };
                const totalDepense = dataDepenses.montant;
                const nbTransactions = dataDepenses.count;
                const soldeRestant = totalAlloue - totalDepense;

                return (
                  <div key={projet.id || projet.nom} className="group p-3 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] hover:border-white/20 transition-all">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className={soldeRestant >= 0 ? "text-emerald-400" : "text-rose-400"} />
                        <div>
                          <span className={`text-[8px] uppercase font-black tracking-widest block ${soldeRestant >= 0 ? 'text-emerald-400/80' : 'text-rose-400'}`}>
                            {soldeRestant >= 0 ? `Dépensé : ${totalDepense.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €` : `Budget dépassé (${Math.abs(soldeRestant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €)`}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <h5 className="text-[var(--text-main)] font-bold text-xs">{projet.nom}</h5>
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-white/10 text-white/60">
                              {nbTransactions} transaction{nbTransactions > 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteEnveloppe(projet.nom)} className="p-1 text-[var(--text-main)]/20 hover:text-rose-500 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-[var(--text-main)]/40">Solde Restant</span>
                        <span className={`text-sm font-black tabular-nums ${soldeRestant >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {soldeRestant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                      </div>
                      <div className="w-28">
                        <label className="block text-[8px] uppercase text-[var(--text-main)]/30 font-black mb-0.5 text-right">Réserve Initiale</label>
                        <input 
                          type="number"
                          key={totalAlloue}
                          defaultValue={totalAlloue}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val !== totalAlloue) handleUpdateAllocation(projet.nom, val);
                          }}
                          className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-right text-xs text-[var(--text-main)] font-bold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================= ONGLET 2 : OBJECTIFS FUTURS ================= */}
      {activeTab === 'projets' && (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="mb-3 shrink-0">
            {!showAddProject ? (
              <button 
                onClick={() => setShowAddProject(true)}
                className="w-full py-2.5 border-2 border-dashed border-white/10 rounded-[var(--radius)] flex items-center justify-center gap-2 text-[var(--text-main)]/40 hover:text-white"
              >
                <div className="p-1 bg-[var(--glass-bg)] rounded-full">
                  <Plus size={14} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Planifier un projet futur</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 bg-[var(--glass-bg)] p-3 rounded-xl border border-white/10">
                <div className="col-span-2 flex justify-between items-center mb-1">
                  <h3 className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Nouveau Projet Futur</h3>
                  <button onClick={() => setShowAddProject(false)} className="p-1 text-[var(--text-main)]/40 hover:text-[var(--text-main)]">
                    <X size={12} />
                  </button>
                </div>

                <input 
                  className="col-span-2 bg-black/20 border-b border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-t-lg outline-none" 
                  placeholder="Nom du projet (ex: Voiture, Voyage)" 
                  value={form2.nom} 
                  onChange={e => setForm2({...form2, nom: e.target.value})} 
                />
                
                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] text-[var(--text-main)]/40 uppercase font-bold">Coût Cible (€)</label>
                  <input 
                    className="bg-black/20 border-b border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-t-lg outline-none" 
                    type="number" 
                    placeholder="0"
                    value={form2.cout} 
                    onChange={e => setForm2({...form2, cout: e.target.value})} 
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] text-[var(--text-main)]/40 uppercase font-bold">Capacité / mois (€)</label>
                  <input 
                    className="bg-black/20 border-b border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-t-lg outline-none" 
                    type="number" 
                    placeholder="0"
                    value={form2.capa} 
                    onChange={e => setForm2({...form2, capa: e.target.value})} 
                  />
                </div>

                <div className="col-span-2">
                  <label 
                    htmlFor="utiliser_capa_stricte" 
                    className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col pr-3">
                      <span className="text-xs font-medium text-[var(--text-main)]">Mode capacité stricte</span>
                      <span className="text-[10px] text-[var(--text-main)]/50">Limiter le prélèvement à {form2.capa || 0} €/mois</span>
                    </div>
                    <div className="relative inline-flex items-center shrink-0">
                      <input
                        type="checkbox"
                        id="utiliser_capa_stricte"
                        checked={form2.utiliser_capa_stricte || false}
                        onChange={(e) => setForm2({ ...form2, utiliser_capa_stricte: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-black/40 border border-white/10 rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </div>
                  </label>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] text-[var(--text-main)]/40 uppercase font-bold">Mois de début</label>
                  <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5">
                    <Calendar size={12} className="text-[var(--text-main)]/40 shrink-0" />
                    <DatePicker
                      selected={form2.date_debut ? new Date(form2.date_debut) : new Date()}
                      onChange={(date) => setForm2({ ...form2, date_debut: date })}
                      dateFormat="MM/yyyy"
                      showMonthYearPicker
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-bold w-full cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[8px] text-[var(--text-main)]/40 uppercase font-bold">Échéance visée</label>
                  <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg px-2 py-1.5">
                    <Calendar size={12} className="text-[var(--text-main)]/40 shrink-0" />
                    <DatePicker
                      selected={form2.date ? new Date(form2.date) : null}
                      onChange={(date) => setForm2({ ...form2, date: date })}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-bold w-full cursor-pointer"
                    />
                  </div>
                </div>

                <button 
                  onClick={handleAddProject} 
                  className="col-span-2 mt-1 py-2 bg-white text-slate-900 rounded-lg font-black text-[9px] uppercase hover:bg-emerald-400 transition-all shadow-md active:scale-95"
                >
                  Ajouter le projet
                </button>
              </div>
            )}
          </div>

          <div className="overflow-y-auto pr-1 flex-1 space-y-2 custom-scrollbar">
            {(projets || []).length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-[var(--text-main)]/30 font-medium mb-1">Aucun projet futur planifié.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd2}>
                <SortableContext items={(projets || []).map(p => p.id || p.nom)} strategy={verticalListSortingStrategy}>
                  {(projets || []).map((pRaw, idx) => {
                    const keyProjet = String(pRaw.id || pRaw._id || pRaw.nom || idx);
                    const p = {
                      id: keyProjet,
                      nom: pRaw.nom || pRaw.title || "Projet sans nom",
                      cout: parseFloat(pRaw.cout || pRaw.cout_total || pRaw.montant || 0),
                      capa: parseFloat(pRaw.capa || pRaw.capacite || pRaw.epargne_mensuelle || 0),
                      date: pRaw.date || pRaw.date_echeance || new Date(),
                      date_debut: pRaw.date_debut || new Date(),
                      apport: parseFloat(pRaw.apport || pRaw.apport_initial || 0),
                      utiliser_capa_stricte: Boolean(pRaw.utiliser_capa_stricte),
                    };

                    const isEditing = editingIndex === idx;
                    const dateEcheance = new Date(p.date);
                    const dateEcheanceValide = !isNaN(dateEcheance.getTime()) ? dateEcheance : new Date();
                    const dateDebut = new Date(p.date_debut);
                    const dateDebutValide = !isNaN(dateDebut.getTime()) ? dateDebut : new Date();
                    const dateDebutStr = p.date_debut ? String(p.date_debut).slice(0, 7) : moisCourantStr;
                    const projetACommence = moisCourantStr >= dateDebutStr;

                    const cumulVentilation = ventilationAutomatique?.cumulProjets?.[keyProjet] ?? ventilationAutomatique?.cumulProjets?.[pRaw.nom];
                    const apportTotalProjete = cumulVentilation !== undefined ? cumulVentilation : p.apport;
                    const ajoutMois = ventilationAutomatique?.repartitionProjets?.[keyProjet] ?? ventilationAutomatique?.repartitionProjets?.[pRaw.nom] ?? 0;
                    const pctAvancement = p.cout > 0 ? Math.min(100, (apportTotalProjete / p.cout) * 100) : 0;
                    const besoinRestant = Math.max(0, p.cout - (apportTotalProjete || 0));

                    const epargneMensuelleCible = p.utiliser_capa_stricte ? parseFloat(p.capa || 0) : (ajoutMois || 0);
                    const moisNecessaires = epargneMensuelleCible > 0 ? Math.ceil(besoinRestant / epargneMensuelleCible) : Infinity;

                    const dateFinEstimee = new Date(dateDebutValide.getTime());
                    if (Number.isFinite(moisNecessaires)) {
                      dateFinEstimee.setMonth(dateFinEstimee.getMonth() + moisNecessaires);
                    }

                    const estFaisable = besoinRestant === 0 || (Number.isFinite(moisNecessaires) && dateFinEstimee <= dateEcheanceValide);
                    const moisFinFormate = dateFinEstimee.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

                    return (
                      <SortableItem key={p.id} id={p.id} disabled={isEditing}>
                        <div className={`group relative border transition-all p-3 rounded-xl ${
                          isEditing ? 'bg-slate-900/90 border-[var(--primary)]' : 'bg-[var(--glass-bg)] border-white/5 hover:bg-white/[0.08]'
                        }`}>
                          {isEditing ? (
                            <div className="flex flex-col gap-2">
                              <input 
                                className="bg-black/40 border border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-lg outline-none"
                                value={tempProjet.nom}
                                onChange={e => setTempProjet({...tempProjet, nom: e.target.value})}
                                placeholder="Nom du projet"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input 
                                  type="number"
                                  className="bg-black/40 border border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-lg outline-none"
                                  value={tempProjet.cout}
                                  onChange={e => setTempProjet({...tempProjet, cout: e.target.value})}
                                  placeholder="Coût (€)"
                                />
                                <input 
                                  type="number"
                                  className="bg-black/40 border border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-lg outline-none"
                                  value={tempProjet.capa}
                                  onChange={e => setTempProjet({...tempProjet, capa: e.target.value})}
                                  placeholder="Capacité (€)"
                                />
                              </div>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1">
                                  <Calendar size={12} className="text-[var(--text-main)]/40 shrink-0" />
                                  <DatePicker
                                    selected={tempProjet.date_debut ? new Date(tempProjet.date_debut) : new Date()}
                                    onChange={(date) => setTempProjet({ ...tempProjet, date_debut: date })}
                                    dateFormat="MM/yyyy"
                                    showMonthYearPicker
                                    className="bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-bold w-full cursor-pointer"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-lg px-2 py-1">
                                  <Calendar size={12} className="text-[var(--text-main)]/40 shrink-0" />
                                  <DatePicker
                                    selected={tempProjet.date ? new Date(tempProjet.date) : null}
                                    onChange={(d) => setTempProjet({ ...tempProjet, date: d })}
                                    dateFormat="dd/MM/yyyy"
                                    className="bg-transparent border-none outline-none text-[var(--text-main)] text-[9px] font-bold w-full cursor-pointer"
                                  />
                                </div>
                              </div>

                              <label 
                                htmlFor={`capa-stricte-${p.id}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
                              >
                                <span className="text-[11px] font-medium text-[var(--text-main)]">Capacité stricte</span>
                                <input
                                  type="checkbox"
                                  id={`capa-stricte-${p.id}`}
                                  checked={!!tempProjet.utiliser_capa_stricte}
                                  onChange={(e) => setTempProjet({ ...tempProjet, utiliser_capa_stricte: e.target.checked })}
                                />
                              </label>

                              <div className="flex justify-end gap-2 mt-1">
                                <button onClick={() => setEditingIndex(null)} className="px-2 py-1 bg-white/5 text-[var(--text-main)] text-[10px] rounded-lg">Annuler</button>
                                <button onClick={() => handleUpdateProject(tempProjet, editingId)} className="px-2 py-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
                                  <Check size={11} /> Enregistrer
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div className="w-full">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                  <h4 className="text-[var(--text-main)] font-bold text-xs">{p.nom}</h4>
                                  {ajoutMois > 0 && (
                                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-500/30">
                                      +{ajoutMois.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
                                    </span>
                                  )}
                                  {!projetACommence && (
                                    <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold border border-amber-500/20">
                                      Inactif
                                    </span>
                                  )}
                                </div>

                                <p className="text-[9px] text-[var(--text-main)]/40 font-medium italic mb-1">
                                  Début : {dateDebutValide.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })} • Échéance : {dateEcheanceValide.toLocaleDateString('fr-FR')}
                                </p>

                                {p.utiliser_capa_stricte && (
                                  <div className="flex items-center gap-1.5 my-1 flex-wrap">
                                    <span className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded font-bold border border-[var(--primary)]/20">
                                      Capacité : {parseFloat(p.capa || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
                                    </span>
                                    {pctAvancement >= 100 ? (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">Financé à 100%</span>
                                    ) : estFaisable ? (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-500/30">Faisable avant échéance</span>
                                    ) : (
                                      <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold border border-rose-500/30">Financé en {moisFinFormate}</span>
                                    )}
                                  </div>
                                )}

                                <div className="mt-1 pr-2">
                                  <div className="flex justify-between text-[9px] font-bold mb-1">
                                    <span className="text-[var(--text-main)]">
                                      {apportTotalProjete.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € 
                                      <span className="text-[var(--text-main)]/40 font-normal"> / {p.cout.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                                    </span>
                                    <span className={pctAvancement >= 100 ? "text-emerald-400" : "text-[var(--primary)]"}>
                                      {pctAvancement.toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-700 ease-out ${pctAvancement >= 100 ? 'bg-emerald-500' : 'bg-[var(--primary)]'}`}
                                      style={{ width: `${Math.min(100, pctAvancement)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                <button 
                                  onClick={() => { 
                                    setEditingIndex(idx); 
                                    setEditingId(p.id); 
                                    setTempProjet({ 
                                      nom: p.nom, 
                                      cout: p.cout, 
                                      date: p.date, 
                                      date_debut: p.date_debut, 
                                      capa: p.capa,
                                      utiliser_capa_stricte: Boolean(p.utiliser_capa_stricte)
                                    });
                                  }} 
                                  className="p-1 text-[var(--text-main)]/40 hover:text-[var(--primary)] rounded-lg transition-colors"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProject(p.nom)}
                                  className="p-1 text-[var(--text-main)]/40 hover:text-rose-500 rounded-lg transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </SortableItem>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}
    </div>
  );
}