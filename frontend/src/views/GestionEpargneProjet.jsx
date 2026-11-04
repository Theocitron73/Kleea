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
import { toast } from 'sonner';
import { toLocalDateString, getTodayLocalDateString } from "../utils/dateUtils";
import {
  calculerVentilation,
  depensesParEnveloppe,
  epargneParMois,
  estimerFinancement,
  moisCibleDepuisFiltres,
  montantsParEnveloppe,
  nomsDesComptes,
  normaliserProjet,
  reserveNette,
} from "../utils/epargneProjet";

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
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`group relative border-white/70 transition-all rounded-[var(--radius)] ${
        isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : ''
      }`}>
        {!disabled && (
          <div 
            {...listeners} 
            className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-6 flex items-center justify-center bg-[var(--glass-bg)] hover:bg-white/20 border border-white/10 rounded-full cursor-grab active:cursor-grabbing touch-none z-50 transition-colors backdrop-blur-[var(--glass-blur)]"
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

const FORMULAIRE_VIDE = {
  nom: '',
  cout: '',
  apport: '',
  capa: '',
  date: null,
  date_debut: null,
  utiliser_capa_stricte: false,
};

const messageErreur = (error, repli) => {
  const detail = error?.response?.data?.detail;
  return typeof detail === 'string' ? detail : repli;
};

// Une suppression demande toujours une seconde confirmation.
function BoutonSupprimer({ onConfirm, className, nom }) {
  const [confirmer, setConfirmer] = useState(false);
  if (!confirmer) {
    return (
      <button
        type="button"
        aria-label={`Supprimer ${nom}`}
        onClick={() => setConfirmer(true)}
        className={`p-1 hover:text-rose-500 transition-colors ${className}`}
      >
        <Trash2 size={13} />
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[8px] font-black uppercase shrink-0">
      <span className="text-rose-400">Supprimer ?</span>
      <button type="button" onClick={() => { setConfirmer(false); onConfirm(); }} className="px-1.5 py-0.5 rounded-sm bg-rose-500 text-white cursor-pointer">Oui</button>
      <button type="button" onClick={() => setConfirmer(false)} className="px-1.5 py-0.5 rounded-sm bg-white/10 text-[var(--text-main)] cursor-pointer">Non</button>
    </span>
  );
}

export default function GestionEpargneProjet({
  soldeGlobal = 0,
  allocations = [],
  setAllocations = () => {},
  projets = [],
  setProjets = () => {},
  filters = { profil: 'default' },
  api,
  recapAnnuelStats = [],
  transactions = [],
  comptesDuProfil = [],
}) {
  // ==========================================
  // 1. ÉTATS LOCAUX
  // ==========================================
  const [activeTab, setActiveTab] = useState('envelopes');
  const [showAddProjet, setShowAddProjet] = useState(false);
  const [newProjet, setNewProjet] = useState({ nom: '', cout: '' });

  const [showAddProject, setShowAddProject] = useState(false);
  const [form2, setForm2] = useState({ ...FORMULAIRE_VIDE, date_debut: new Date() });
  const [editingId, setEditingId] = useState(null);
  const [tempProjet, setTempProjet] = useState(FORMULAIRE_VIDE);

  const profilId = filters?.profil;

  // ==========================================
  // 2. CALCULS (voir utils/epargneProjet.js)
  // ==========================================
  const comptes = useMemo(() => nomsDesComptes(comptesDuProfil), [comptesDuProfil]);
  const moisCourantStr = moisCibleDepuisFiltres(filters);
  const soldeGlobalNet = Math.max(0, parseFloat(soldeGlobal) || 0);

  const montantsEnveloppes = useMemo(() => montantsParEnveloppe(allocations), [allocations]);
  const depensesEnveloppes = useMemo(() => depensesParEnveloppe(transactions, comptes), [transactions, comptes]);
  const sommeEnveloppesNette = useMemo(
    () => reserveNette(montantsEnveloppes, depensesEnveloppes),
    [montantsEnveloppes, depensesEnveloppes],
  );
  const sommeAllocations = sommeEnveloppesNette;

  const listeAffichage = useMemo(() => {
    const enveloppes = new Map();
    (Array.isArray(allocations) ? allocations : []).forEach((a) => {
      const cle = String(a?.projet ?? '').trim().toLowerCase();
      if (cle && !enveloppes.has(cle)) enveloppes.set(cle, { id: a.projet, nom: a.projet });
    });
    return Array.from(enveloppes.values());
  }, [allocations]);

  const projetsListe = useMemo(() => (projets || []).map(normaliserProjet), [projets]);

  const epargneMensuelle = useMemo(() => epargneParMois({
    transactions,
    comptes,
    recapAnnuel: recapAnnuelStats,
    annee: moisCourantStr.slice(0, 4),
  }), [transactions, comptes, recapAnnuelStats, moisCourantStr]);

  const ventilationAutomatique = useMemo(() => calculerVentilation({
    projets: projetsListe,
    epargne: epargneMensuelle,
    moisCible: moisCourantStr,
    disponible: soldeGlobalNet - sommeEnveloppesNette,
  }), [projetsListe, epargneMensuelle, moisCourantStr, soldeGlobalNet, sommeEnveloppesNette]);

  const sommeFinancementProjets = useMemo(
    () => Object.values(ventilationAutomatique.cumulProjets).reduce((acc, val) => acc + val, 0),
    [ventilationAutomatique],
  );

  const soldeDisponiblePourEnveloppes = Math.max(0, soldeGlobalNet - sommeFinancementProjets);
  const pourcentageSanctuarise = soldeDisponiblePourEnveloppes > 0
    ? Math.min(100, Math.round((sommeAllocations / soldeDisponiblePourEnveloppes) * 100))
    : 0;
  const epargneDisponible = Math.max(0, soldeGlobalNet - (sommeEnveloppesNette + sommeFinancementProjets));

  const pctEnveloppes = soldeGlobalNet > 0 ? Math.min(100, Math.max(0, (sommeEnveloppesNette / soldeGlobalNet) * 100)) : 0;
  const pctProjets = soldeGlobalNet > 0 ? Math.min(100 - pctEnveloppes, Math.max(0, (sommeFinancementProjets / soldeGlobalNet) * 100)) : 0;
  const pctDisponible = Math.max(0, 100 - (pctEnveloppes + pctProjets));

  // ==========================================
  // 3. CHARGEMENT & ACTIONS API
  // ==========================================
  const fetchProjets = useCallback(async () => {
    if (!api || !profilId) return;
    try {
      const res = await api.get(`/get-projets/${encodeURIComponent(profilId)}`);
      if (Array.isArray(res.data)) setProjets(res.data);
    } catch (error) {
      console.error('Chargement des projets impossible :', error);
    }
  }, [api, profilId, setProjets]);

  const fetchAllocations = useCallback(async () => {
    if (!api || !profilId) return;
    try {
      const res = await api.get(`/get-allocations/${encodeURIComponent(profilId)}`);
      setAllocations(res.data);
    } catch (error) {
      console.error('Chargement des enveloppes impossible :', error);
    }
  }, [api, profilId, setAllocations]);

  useEffect(() => {
    if (profilId) {
      fetchAllocations();
      fetchProjets();
    }
  }, [profilId, fetchAllocations, fetchProjets]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // L'ordre donne la priorité de financement : il est enregistré à chaque déplacement.
  const handleDragEnd2 = async (event) => {
    const { active, over } = event;
    if (!active || !over || active.id === over.id) return;
    const oldIndex = projetsListe.findIndex((p) => p.cle === active.id);
    const newIndex = projetsListe.findIndex((p) => p.cle === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nouvelOrdre = arrayMove(projets, oldIndex, newIndex);
    setProjets(nouvelOrdre);
    try {
      await api.post('/reorder-projets', { ids: nouvelOrdre.map((p) => p.id) });
    } catch (error) {
      toast.error(messageErreur(error, "Le nouvel ordre n'a pas pu être enregistré."));
      fetchProjets();
    }
  };

  const handleSaveAllocation = async (nomEnveloppe, montant) => {
    const montantValide = parseFloat(montant);
    if (!String(nomEnveloppe || '').trim() || Number.isNaN(montantValide)) {
      toast.warning('Indique un nom et un montant pour cette enveloppe.');
      return;
    }
    try {
      await api.post('/save-allocation', {
        profil: String(profilId || 'default'),
        projet: String(nomEnveloppe).trim(),
        montant_alloue: montantValide,
      });
      setNewProjet({ nom: '', cout: '' });
      setShowAddProjet(false);
      fetchAllocations();
    } catch (error) {
      toast.error(messageErreur(error, "L'enveloppe n'a pas pu être créée."));
    }
  };

  const handleUpdateAllocation = async (projetNom, nouveauMontant) => {
    try {
      await api.put(
        `/update-enveloppe-montant?projet=${encodeURIComponent(projetNom)}&profil=${encodeURIComponent(profilId)}&nouveau_montant=${nouveauMontant}`
      );
    } catch (error) {
      toast.error(messageErreur(error, "Le montant n'a pas pu être enregistré."));
    }
    fetchAllocations();
  };

  const handleDeleteEnveloppe = async (projetNom) => {
    try {
      await api.delete(`/delete-enveloppe/${encodeURIComponent(projetNom)}?profil=${encodeURIComponent(profilId)}`);
      fetchAllocations();
    } catch (error) {
      toast.error(messageErreur(error, "L'enveloppe n'a pas pu être supprimée."));
    }
  };

  const corpsProjet = (donnees) => ({
    profil: String(profilId || 'default'),
    nom: String(donnees.nom).trim(),
    cout: parseFloat(donnees.cout) || 0,
    apport: parseFloat(donnees.apport) || 0,
    capa: parseFloat(donnees.capa) || 0,
    utiliser_capa_stricte: Boolean(donnees.utiliser_capa_stricte),
    date: toLocalDateString(donnees.date) || getTodayLocalDateString(),
    date_debut: toLocalDateString(donnees.date_debut) || getTodayLocalDateString(),
  });

  const handleAddProject = async () => {
    if (!String(form2.nom).trim() || !form2.cout) {
      toast.warning('Indique au moins un nom et un coût cible.');
      return;
    }
    try {
      await api.post('/save-projet', corpsProjet(form2));
      setForm2({ ...FORMULAIRE_VIDE, date_debut: new Date() });
      setShowAddProject(false);
      fetchProjets();
    } catch (error) {
      toast.error(messageErreur(error, "Le projet n'a pas pu être créé."));
    }
  };

  const handleUpdateProject = async (donnees, id) => {
    try {
      await api.post(`/update-projet/${id}`, corpsProjet(donnees));
      setEditingId(null);
      fetchProjets();
    } catch (error) {
      toast.error(messageErreur(error, "Le projet n'a pas pu être modifié."));
    }
  };

  const handleDeleteProject = async (id) => {
    try {
      await api.delete(`/delete-projet/${id}`);
      fetchProjets();
    } catch (error) {
      toast.error(messageErreur(error, "Le projet n'a pas pu être supprimé."));
    }
  };

  // ==========================================
  // 4. RENDU VISUEL
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
                <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold leading-none ${
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
                <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-bold leading-none ${
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
                const totalAlloue = montantsEnveloppes[nomClean] || 0;
                const dataDepenses = depensesEnveloppes[nomClean] || { montant: 0, count: 0 };
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
                      <BoutonSupprimer nom={projet.nom} onConfirm={() => handleDeleteEnveloppe(projet.nom)} className="text-[var(--text-main)]/20" />
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
                          min="0"
                          key={totalAlloue}
                          defaultValue={totalAlloue}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val >= 0 && val !== totalAlloue) handleUpdateAllocation(projet.nom, val);
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

                <div className="col-span-2 flex flex-col gap-0.5">
                  <label className="text-[8px] text-[var(--text-main)]/40 uppercase font-bold">Déjà mis de côté (€)</label>
                  <input
                    className="bg-black/20 border-b border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-t-lg outline-none"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form2.apport}
                    onChange={e => setForm2({...form2, apport: e.target.value})}
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

          {projetsListe.length > 1 && (
            <p className="text-[8px] text-[var(--text-main)]/40 font-medium mb-1.5 shrink-0">
              Le premier projet de la liste est financé en priorité. Fais-les glisser pour changer l'ordre.
            </p>
          )}

          <div className="overflow-y-auto pr-1 flex-1 space-y-2 custom-scrollbar">
            {projetsListe.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-xs text-[var(--text-main)]/30 font-medium mb-1">Aucun projet futur planifié.</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd2}>
                <SortableContext items={projetsListe.map(p => p.cle)} strategy={verticalListSortingStrategy}>
                  {projetsListe.map((p) => {
                    const isEditing = editingId === p.cle;
                    const dateEcheance = p.date ? new Date(p.date) : null;
                    const dateEcheanceValide = dateEcheance && !isNaN(dateEcheance.getTime()) ? dateEcheance : null;
                    const dateDebut = p.date_debut ? new Date(p.date_debut) : null;
                    const dateDebutValide = dateDebut && !isNaN(dateDebut.getTime()) ? dateDebut : null;
                    const projetACommence = moisCourantStr >= (p.moisDebut || moisCourantStr);

                    const apportTotalProjete = ventilationAutomatique.cumulProjets[p.cle] ?? p.apport;
                    const ajoutMois = ventilationAutomatique.repartitionProjets[p.cle] ?? 0;
                    const pctAvancement = p.cout > 0 ? Math.min(100, (apportTotalProjete / p.cout) * 100) : 0;
                    const { dateFin, faisable: estFaisable } = estimerFinancement({
                      besoinRestant: Math.max(0, p.cout - apportTotalProjete),
                      mensuel: p.capa,
                      moisDebut: p.moisDebut,
                      echeance: p.date,
                    });
                    const moisFinFormate = dateFin?.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

                    return (
                      <SortableItem key={p.cle} id={p.cle} disabled={isEditing}>
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

                              <label className="flex items-center justify-between gap-2 text-[9px] text-[var(--text-main)]/60">
                                Déjà mis de côté (€)
                                <input
                                  type="number"
                                  min="0"
                                  className="w-24 bg-black/40 border border-white/10 text-[var(--text-main)] text-xs p-1.5 rounded-lg outline-none text-right"
                                  value={tempProjet.apport}
                                  onChange={e => setTempProjet({...tempProjet, apport: e.target.value})}
                                  placeholder="0"
                                />
                              </label>

                              <label
                                htmlFor={`capa-stricte-${p.cle}`}
                                className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-white/10 cursor-pointer"
                              >
                                <span className="text-[11px] font-medium text-[var(--text-main)]">Capacité stricte</span>
                                <input
                                  type="checkbox"
                                  id={`capa-stricte-${p.cle}`}
                                  checked={!!tempProjet.utiliser_capa_stricte}
                                  onChange={(e) => setTempProjet({ ...tempProjet, utiliser_capa_stricte: e.target.checked })}
                                />
                              </label>

                              <div className="flex justify-end gap-2 mt-1">
                                <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-white/5 text-[var(--text-main)] text-[10px] rounded-lg">Annuler</button>
                                <button onClick={() => handleUpdateProject(tempProjet, p.id)} className="px-2 py-1 bg-[var(--primary)] text-white text-[10px] font-bold rounded-lg flex items-center gap-1">
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
                                    <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm font-bold uppercase border border-emerald-500/30">
                                      +{ajoutMois.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
                                    </span>
                                  )}
                                  {!projetACommence && (
                                    <span className="text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-sm font-bold border border-amber-500/20">
                                      Inactif
                                    </span>
                                  )}
                                </div>

                                <p className="text-[9px] text-[var(--text-main)]/40 font-medium italic mb-1">
                                  Début : {dateDebutValide?.toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' }) ?? '—'} • Échéance : {dateEcheanceValide?.toLocaleDateString('fr-FR') ?? '—'}
                                </p>

                                {p.utiliser_capa_stricte && (
                                  <div className="flex items-center gap-1.5 my-1 flex-wrap">
                                    <span className="text-[8px] bg-[var(--secondary)]/10 text-[var(--secondary)] px-1.5 py-0.5 rounded-sm font-bold border border-[var(--secondary)]/20">
                                      Capacité : {parseFloat(p.capa || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
                                    </span>
                                    {pctAvancement >= 100 ? (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm font-bold border border-emerald-500/30">Financé à 100%</span>
                                    ) : estFaisable ? (
                                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-sm font-bold border border-emerald-500/30">Faisable avant échéance</span>
                                    ) : (
                                      <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded-sm font-bold border border-rose-500/30">{moisFinFormate ? `Financé en ${moisFinFormate}` : 'Capacité à définir'}</span>
                                    )}
                                  </div>
                                )}

                                <div className="mt-1 pr-2">
                                  <div className="flex justify-between text-[9px] font-bold mb-1">
                                    <span className="text-[var(--text-main)]">
                                      {apportTotalProjete.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € 
                                      <span className="text-[var(--text-main)]/40 font-normal"> / {p.cout.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                                    </span>
                                    <span className={pctAvancement >= 100 ? "text-emerald-400" : "text-[var(--secondary)]"}>
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
                                    setEditingId(p.cle);
                                    setTempProjet({
                                      nom: p.nom,
                                      cout: p.cout,
                                      apport: p.apport,
                                      date: p.date,
                                      date_debut: p.date_debut,
                                      capa: p.capa,
                                      utiliser_capa_stricte: p.utiliser_capa_stricte,
                                    });
                                  }} 
                                  className="p-1 text-[var(--text-main)]/40 hover:text-[var(--secondary)] rounded-lg transition-colors"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <BoutonSupprimer nom={p.nom} onConfirm={() => handleDeleteProject(p.id)} className="text-[var(--text-main)]/40 rounded-lg" />
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