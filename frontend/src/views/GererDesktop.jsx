import React, { useState, useRef, useMemo, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import DatePicker from 'react-datepicker';
import { createPortal } from 'react-dom';
import { SketchPicker } from 'react-color';
import { 
  Filter, User, Search, Calendar, Calendar1, Database, List, Brain, X, 
  Trash2, Plus, CreditCard, Tag, ArrowUpDown, Pencil, MoreHorizontal, 
  WalletCards, Check, Activity, ChevronRight, Edit3, Layers, Settings2, 
  Eye, EyeOff, Edit2, Download, Target,Scissors,RotateCcw  
} from 'lucide-react';
import { 
  CategoryIcon, getCleanCategoryName, LucideIconPicker, 
  getCategoryIconInfo, getCategoryGroup 
} from '../categoryIcons';
import SplitTransactionModal from '../components/SplitTransactionModal';
import { toast } from 'sonner';
import api from '../axios';

// Badge date compact pour le tableau
const CustomBadgeDate = forwardRef(({ t }, ref) => {
  let displayDay = '??';
  let displayMonth = '??';
  let displayYear = '202X';

  if (t.date) {
    const dateSeule = t.date.includes('T') ? t.date.split('T')[0] : t.date;
    const parties = dateSeule.split(dateSeule.includes('-') ? '-' : '/');
    displayDay = dateSeule.includes('-') ? parties[2] : parties[0];
    displayMonth = parties[1];
    displayYear = parties[0];
  } else if (t.annee) {
    displayYear = t.annee;
  }

  const moisNoms = { 
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', '05': 'MAI', '06': 'JUIN', 
    '07': 'JUIL', '08': 'AOUT', '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DEC' 
  };

  return (
    <div className="flex items-center" ref={ref}>
      <div className="relative w-[54px] h-[54px] flex flex-col items-center justify-center bg-[var(--glass-bg)] border border-white/10 rounded-xl transition-all duration-300 shadow-lg">
        <span className="text-[7px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em] mb-0.5">
          {displayYear}
        </span>
        <span className="text-sm font-black text-[var(--text-main)] leading-none">
          {displayDay}
        </span>
        <span className="text-[8px] font-bold text-[var(--primary)]/60 uppercase tracking-widest mt-1">
          {moisNoms[displayMonth] || displayMonth}
        </span>
      </div>
    </div>
  );
});

export default function GererDesktop({
  filters,
  setFilters,
  fetchTransactions,
  comptes,
  soldesTries,
  handleProfilChange,
  handleCompteChange,
  selectedCompte,
  moisListe,
  availablePeriods,
  statsFiltrées,
  isApprendreActive,
  setIsApprendreActive,
  showLearningList,
  setShowLearningList,
  elementsAppris,
  fetchMemoire,
  handleDeleteMemory,
  newTx,
  setNewTx,
  selectedDate,
  setSelectedDate,
  submitQuickTransaction,
  setShowExportModal,
  searchTerm,
  setSearchTerm,
  transactionsFiltrees,
  selectedIds,
  toggleAll,
  toggleSelect,
  handleSort,
  sortConfig,
  updateCell,
  categoriesVisibles,
  toutesLesCategories,
  categoriesPerso,
  masquees,
  setMasquees,
  addCategory,
  handleUpdateCategory,
  removeCategory,
  toggleVisibility,
  allPrevisionsAnnee,
  allocations,
  budgets,
  formBudget,
  setFormBudget,
  handleAddBudget,
  showBudgetDetails,
  setShowBudgetDetails,
  selectedBudgetYear,
  setSelectedBudgetYear,
  optionsAnnees,
  listeMoisDisponibles,
  selectedBudgetMonth,
  setSelectedBudgetMonth,
  editingBudget,
  setEditingBudget,
  handleUpdateBudget,
  confirmDelete2,
  CustomSelect,
  toutesLesTransactions,
  userManagedGroups,
  setUserManagedGroups,
  handleAssignGroup,
  handleDeleteGroup
}) {

  const [splittingTx, setSplittingTx] = useState(null);
  // Gestion interne de la modale des catégories
  const [showListPopover, setShowListPopover] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showAddGroupInput, setShowAddGroupInput] = useState(false);

  // Sélecteur d'icône & couleur pour création
  const [selectedIconName, setSelectedIconName] = useState('Tag');
  const [selectedCatColor, setSelectedCatColor] = useState('#818cf8');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCatColorPicker, setShowCatColorPicker] = useState(false);

  // Édition d'une catégorie existante
  const [editingCat, setEditingCat] = useState(null);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  // Dropdowns de table
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [activePrevisionDropdownId, setActivePrevisionDropdownId] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState('bottom');

  // Virtualiseur local TanStack pour la table Desktop
  const tableContainerRef = useRef(null);
  const rowVirtualizer = useVirtualizer({
    count: transactionsFiltrees.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 54,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom = virtualRows.length > 0 ? totalSize - virtualRows[virtualRows.length - 1].end : 0;

  const moisOptionsAbrege = [
    { v: "Janvier", l: "Janv." },
    { v: "Février", l: "Févr." },
    { v: "Mars", l: "Mars" },
    { v: "Avril", l: "Avr." },
    { v: "Mai", l: "Mai" },
    { v: "Juin", l: "Juin" },
    { v: "Juillet", l: "Juil." },
    { v: "Aout", l: "Août" },
    { v: "Septembre", l: "Sept." },
    { v: "Octobre", l: "Oct." },
    { v: "Novembre", l: "Nov." },
    { v: "Décembre", l: "Déc." }
  ];

  // 🔄 Annulation directe de la Division
  const handleQuickUnsplit = async (splitId) => {
    if (!window.confirm("Voulez-vous annuler la Division et fusionner à nouveau cette transaction ?")) {
      return;
    }
    try {
      await api.post(`/transactions/unsplit/${splitId}`);
      toast.success("Division annulée : transaction originale restaurée ! 🔄");
      if (typeof fetchTransactions === 'function') {
        fetchTransactions();
      }
    } catch (err) {
      toast.error("Erreur lors de l'annulation de la Division.");
    }
  };

  // 🟢 État de la modale de confirmation pour annuler la Division
  const [unsplitModal, setUnsplitModal] = useState({ show: false, splitId: null, txName: '' });

  // Exécution de l'annulation
  const executeUnsplit = async () => {
    if (!unsplitModal.splitId) return;
    try {
      await api.post(`/transactions/unsplit/${unsplitModal.splitId}`);
      toast.success("Division annulée : écriture originale restaurée ! 🔄");
      if (typeof fetchTransactions === 'function') {
        fetchTransactions();
      }
      setUnsplitModal({ show: false, splitId: null, txName: '' });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'annulation de la Division.");
    }
  };

  const handleAddNewGroup = () => {
    const clean = newGroupName.trim();
    if (clean && !userManagedGroups.some(g => g.toLowerCase() === clean.toLowerCase())) {
      setUserManagedGroups(prev => [...prev, clean]);
      setSelectedGroupFilter(clean);
      setNewGroupName('');
      setShowAddGroupInput(false);
    }
  };

  return (
    <div className="hidden lg:flex flex-col animate-in fade-in duration-500 h-[calc(100vh-120px)] px-4">
      {/* HEADER */}
      <div className="mb-6 px-2 shrink-0">
        <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Historique & Gestion</h1>
        <p className="text-[var(--text-main)]/40 text-[11px] font-bold uppercase tracking-widest italic">
          Contrôle total de vos flux financiers
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-17 gap-4 flex-1 min-h-0">
        
        {/* COLONNE 1 : GESTION DES CATÉGORIES & BUDGETS (Gauche, 4 colonnes) */}
        <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 order-2 lg:order-1">
          <div className="z-[2000] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 p-5 rounded-[var(--radius)] shrink-0">
            <div className="flex items-center justify-between mb-6 relative">
              <div>
                <h3 className="text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  Catégories Personnalisées
                </h3>
                <p className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase">Ajouter une catégorie</p>
              </div>
            </div>

            {/* BLOC CRÉATION CATÉGORIE */}
            <div className="bg-black/40 border border-white/5 rounded-[1.5rem] p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 hover:border-indigo-500/40 transition-all cursor-pointer shadow-inner"
                    title="Changer d'icône"
                  >
                    <CategoryIcon name={selectedIconName} showBg={false} size={20} style={{ color: selectedCatColor }} />
                  </button>

                  {showIconPicker && (
                    <LucideIconPicker 
                      selectedIcon={selectedIconName}
                      onSelectIcon={(iconName) => {
                        setSelectedIconName(iconName);
                        setShowIconPicker(false);
                      }}
                      onClose={() => setShowIconPicker(false)}
                    />
                  )}
                </div>

                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowCatColorPicker(!showCatColorPicker)}
                    className="w-8 h-8 rounded-xl border border-white/20 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md"
                    style={{ backgroundColor: selectedCatColor }}
                    title="Changer la couleur"
                  />

                  {showCatColorPicker && (
                    <div className="absolute z-[110] top-10 left-0 animate-in zoom-in-95 duration-150">
                      <div className="fixed inset-0" onClick={() => setShowCatColorPicker(false)} />
                      <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                        <SketchPicker 
                          color={selectedCatColor} 
                          onChange={(c) => setSelectedCatColor(c.hex)} 
                          disableAlpha 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <input 
                  type="text" 
                  id="catInput"
                  placeholder="Nouvel intitulé..." 
                  className="flex-1 bg-transparent text-[var(--text-main)] text-sm font-medium outline-none placeholder:text-white/20"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      addCategory(e.target.value.trim(), selectedIconName, selectedCatColor);
                      e.target.value = '';
                      setSelectedIconName('Tag');
                      setSelectedCatColor('#818cf8');
                    }
                  }}
                />
              </div>

              <button 
                onClick={() => {
                  const input = document.getElementById('catInput');
                  if (input && input.value.trim()) {
                    addCategory(input.value.trim(), selectedIconName, selectedCatColor);
                    input.value = '';
                    setSelectedIconName('Tag');
                    setSelectedCatColor('#818cf8');
                  }
                }}
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-3 rounded-xl uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                <Plus size={14} /> Créer la catégorie
              </button>
            </div>

            {/* BOUTON GÉRER LES CATÉGORIES */}
            <div className="mt-4">
              <button 
                type="button"
                onClick={() => setShowListPopover(!showListPopover)}
                className="w-full flex items-center justify-between p-3 bg-[var(--glass-bg)] border border-white/10 rounded-xl hover:bg-white/[0.05] transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                    <Settings2 size={14} className="text-[var(--primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest leading-tight">
                      Gérer mes catégories
                    </p>
                    <p className="text-[9px] text-[var(--text-main)]/40 font-bold uppercase tracking-wider mt-0.5">
                      {toutesLesCategories.length} catégories • {masquees.length} masquées
                    </p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[var(--text-main)]/20 group-hover:translate-x-0.5 group-hover:text-[var(--text-main)] transition-all shrink-0" />
              </button>
            </div>

            {/* MODALE GÉRER MES CATÉGORIES */}
            {showListPopover && createPortal(
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <div 
                  className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
                  onClick={() => { setShowListPopover(false); setCategorySearch(''); setSelectedGroupFilter('all'); }} 
                />

                <div className="relative w-full max-w-4xl bg-[#121214] border border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] p-6 z-[10000] flex flex-col h-[720px] max-h-[88vh] min-h-[520px] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                  <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/20 text-[var(--primary)]">
                        <Settings2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-xs font-black uppercase text-white tracking-widest leading-none">Gestion des catégories</h3>
                        <p className="text-[9px] text-white/30 font-bold uppercase tracking-wider mt-1">Rangement par groupe, icônes & visibilité</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setShowListPopover(false); setCategorySearch(''); setSelectedGroupFilter('all'); }} 
                      className="p-1.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="my-3 flex items-center gap-2 shrink-0">
                    <div className="relative flex-1 flex items-center bg-black/40 rounded-xl border border-white/10 px-3 py-2 focus-within:border-[var(--primary)]/50 transition-colors">
                      <Search size={14} className="text-white/30 shrink-0" />
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        placeholder="Rechercher une catégorie..."
                        className="bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-white/20 w-full pl-2.5 pr-6"
                      />
                      {categorySearch && (
                        <button onClick={() => setCategorySearch('')} className="text-white/30 hover:text-white cursor-pointer">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {!showAddGroupInput ? (
                      <button
                        type="button"
                        onClick={() => setShowAddGroupInput(true)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Plus size={13} strokeWidth={3} />
                        <span>Nouveau Groupe</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 bg-black/50 border border-indigo-500/40 p-1 rounded-xl shrink-0 animate-in zoom-in-95">
                        <input
                          type="text"
                          autoFocus
                          placeholder="Nom du groupe..."
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddNewGroup()}
                          className="bg-transparent text-xs text-white px-2 py-1 outline-none w-32 font-bold placeholder:text-white/20"
                        />
                        <button onClick={handleAddNewGroup} className="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-black uppercase cursor-pointer">OK</button>
                        <button onClick={() => { setShowAddGroupInput(false); setNewGroupName(''); }} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={12} /></button>
                      </div>
                    )}
                  </div>

                  {/* Bandeau des groupes */}
                  {(() => {
                    const allGroupsFromCats = toutesLesCategories.map(c => getCategoryGroup(c));
                    const combined = [...new Set([...userManagedGroups, ...allGroupsFromCats, 'Général'])].filter(Boolean);
                    const groupsOptions = combined.map(g => ({ v: g, l: g }));

                    return (
                      <>
                        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2.5 mb-2.5 shrink-0 select-none border-b border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setSelectedGroupFilter('all')}
                            className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 border cursor-pointer ${
                              selectedGroupFilter === 'all'
                                ? 'bg-white text-slate-950 border-white shadow-md'
                                : 'bg-black/30 border-white/5 text-white/40 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Layers size={11} className={selectedGroupFilter === 'all' ? 'text-slate-950' : 'opacity-50'} />
                            <span>Tous</span>
                            <span className="text-[8px] font-mono opacity-60">({toutesLesCategories.length})</span>
                          </button>

                          {combined.map(grp => {
                            const isActive = selectedGroupFilter === grp;
                            const count = toutesLesCategories.filter(c => getCategoryGroup(c) === grp).length;
                            const isGeneral = grp.toLowerCase() === 'général' || grp.toLowerCase() === 'general';

                            return (
                              <div
                                key={grp}
                                className={`rounded-xl transition-all flex items-center border shrink-0 ${
                                  isActive
                                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                                    : 'bg-black/30 border-white/5 text-white/50 hover:text-white hover:bg-white/5'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedGroupFilter(grp)}
                                  className="pl-3 pr-2 py-1.5 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Layers size={11} className={isActive ? 'text-white' : 'text-indigo-400'} />
                                  <span>{grp}</span>
                                  <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-indigo-800 text-white' : 'bg-white/10 text-white/40'}`}>
                                    {count}
                                  </span>
                                </button>

                                {!isGeneral && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteGroup(grp);
                                    }}
                                    className={`pr-2 pl-1 py-1.5 text-white/30 hover:text-rose-400 transition-colors cursor-pointer opacity-50 hover:opacity-100 ${isActive ? 'hover:text-rose-200' : ''}`}
                                    title={`Supprimer le groupe "${grp}"`}
                                  >
                                    <X size={11} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Cartes des catégories */}
                        <div className="flex-1 overflow-y-auto pr-1.5 custom-scrollbar space-y-4 min-h-0">
                          {(() => {
                            const matchingCats = toutesLesCategories.filter(cat => {
                              const matchSearch = !categorySearch.trim() || getCleanCategoryName(cat).toLowerCase().includes(categorySearch.toLowerCase().trim());
                              const currentGrp = getCategoryGroup(cat);
                              const matchGroup = selectedGroupFilter === 'all' || currentGrp === selectedGroupFilter;
                              return matchSearch && matchGroup;
                            });

                            if (matchingCats.length === 0) {
                              return (
                                <div className="py-20 text-center text-white/20 text-xs font-bold uppercase">
                                  Aucune catégorie trouvée
                                </div>
                              );
                            }

                            const renderCatItem = (cat) => {
                              const estMasquee = masquees.includes(cat);
                              const estPerso = categoriesPerso.includes(cat);
                              const currentGroup = getCategoryGroup(cat);

                              return (
                                <div 
                                  key={cat}
                                  className={`group flex flex-col justify-between p-3 rounded-2xl border transition-all relative hover:z-20 focus-within:z-30 ${
                                    estMasquee 
                                      ? 'bg-black/30 border-white/[0.03] opacity-35' 
                                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
                                      <CategoryIcon name={cat} size={14} className="shrink-0" />
                                      <span className={`text-xs font-bold truncate ${estMasquee ? 'text-white/30 line-through' : 'text-white/90 group-hover:text-white'}`}>
                                        {getCleanCategoryName(cat)}
                                      </span>
                                      {estPerso && (
                                        <span className="text-[7px] bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.2 rounded font-black uppercase tracking-wider border border-[var(--primary)]/20 shrink-0">
                                          Perso
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button 
                                        type="button"
                                        onClick={() => {
                                          const info = getCategoryIconInfo(cat);
                                          setEditingCat({
                                            nom: cat,
                                            icone: info.iconName || 'Tag',
                                            couleur: info.hex || '#818cf8',
                                            groupe: currentGroup
                                          });
                                        }}
                                        className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
                                        title="Modifier l'icône et la couleur"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => toggleVisibility(cat)}
                                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                          estMasquee ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' : 'text-white/40 hover:text-emerald-400 hover:bg-white/5'
                                        }`}
                                        title={estMasquee ? "Afficher" : "Masquer"}
                                      >
                                        {estMasquee ? <EyeOff size={12} /> : <Eye size={12} />}
                                      </button>
                                      {estPerso && (
                                        <button 
                                          type="button"
                                          onClick={() => removeCategory(cat)} 
                                          className="p-1.5 rounded-lg text-white/30 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                          title="Supprimer la catégorie"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between gap-2">
                                    <span className="text-[8px] font-black uppercase text-white/30 tracking-wider shrink-0 flex items-center gap-1">
                                      <Layers size={10} className="text-indigo-400 opacity-60" />
                                      <span>Groupe :</span>
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <CustomSelect
                                        value={currentGroup}
                                        options={groupsOptions}
                                        onChange={(newGroup) => handleAssignGroup(cat, newGroup)}
                                        icon={Layers}
                                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-black/40 border-white/10 h-7"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            };

                            if (selectedGroupFilter !== 'all') {
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                  {matchingCats.sort((a, b) => a.localeCompare(b)).map(renderCatItem)}
                                </div>
                              );
                            }

                            const groupsWithContent = combined.filter(grp => matchingCats.some(c => getCategoryGroup(c) === grp));
                            return groupsWithContent.map(grp => {
                              const catsInThisGroup = matchingCats.filter(c => getCategoryGroup(c) === grp).sort((a, b) => a.localeCompare(b));
                              return (
                                <div key={grp} className="space-y-2">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-2">
                                      <Layers size={13} className="text-indigo-400" />
                                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-200">{grp}</span>
                                    </div>
                                    <span className="text-[8px] font-mono font-bold text-white/30">{catsInThisGroup.length} catégorie(s)</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                    {catsInThisGroup.map(renderCatItem)}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </>
                    );
                  })()}

                  <div className="pt-3.5 border-t border-white/5 flex items-center justify-between shrink-0 mt-auto">
                    {masquees.length > 0 ? (
                      <button 
                        type="button"
                        onClick={() => setMasquees([])}
                        className="text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
                      >
                        Réinitialiser la visibilité
                      </button>
                    ) : <div />}
                    <button 
                      type="button"
                      onClick={() => { setShowListPopover(false); setCategorySearch(''); setSelectedGroupFilter('all'); }}
                      className="px-5 py-2.5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-white/90 transition-all cursor-pointer shadow-lg active:scale-95"
                    >
                      Terminer
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )}
          </div>

          {/* OBJECTIFS BUDGETS */}
          <div className="z-[1000] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 p-5 rounded-[var(--radius)] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Target size={14} className="text-[var(--primary)]" /> Objectifs Budget
                </h3>
                <p className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase tracking-tighter">Définir vos limites par catégorie</p>
              </div>
              <div className="px-2 py-1 bg-[var(--primary)]/10 rounded-md border border-[var(--primary)]/20">
                <span className="text-[10px] font-mono font-bold text-[var(--primary)]">{budgets.length}</span>
              </div>
            </div>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <CustomSelect 
                  label="Compte associé"
                  value={formBudget.compte || 'tous'}
                  icon={Search}
                  options={[
                    { v: 'tous', l: 'Tous les comptes' },
                    ...soldesTries.map(s => ({ v: s.compte, l: s.compte }))
                  ]}
                  onChange={(val) => setFormBudget({...formBudget, compte: val})}
                />
                
                <CustomSelect 
                  label="Mois du budget"
                  value={formBudget.mois || filters.mois}
                  icon={Calendar}
                  options={moisListe}
                  onChange={(val) => setFormBudget({...formBudget, mois: val})}
                />
              </div>

              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-8">
                  <CustomSelect 
                    label="Catégorie"
                    value={formBudget.nom}
                    icon={Tag}
                    options={toutesLesCategories.filter(c => !masquees.includes(c)).map(cat => ({ v: cat, l: cat }))}
                    onChange={(val) => setFormBudget({...formBudget, nom: val})}
                  />
                </div>

                <div className="col-span-4 bg-[var(--glass-bg)] rounded-xl border border-white/10 px-3 flex items-center h-[38px] mb-[1px]">
                  <div className="flex flex-col w-full">
                    <label className="block text-[6px] uppercase font-black text-[var(--text-main)]/20 leading-none mb-1">Budget</label>
                    <div className="flex items-center">
                      <input 
                        type="number"
                        placeholder="0"
                        value={formBudget.somme}
                        onChange={(e) => setFormBudget({...formBudget, somme: e.target.value})}
                        className="w-full bg-transparent text-[var(--text-main)] text-[11px] font-mono font-bold outline-none placeholder:text-[var(--text-main)]/10"
                      />
                      <span className="text-[9px] font-bold text-[var(--text-main)]/20 ml-1">€</span>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleAddBudget}
                className="w-full mt-1 py-2.5 bg-[var(--primary)] hover:bg-indigo-600 text-[var(--text-main)] text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98] cursor-pointer"
              >
                <Plus size={14} strokeWidth={3} /> Fixer le budget
              </button>
            </div>

            {/* BOUTON D'OUVERTURE DE LA MODALE & PORTAL COMPLET */}
            <div className="mt-2">
              <button 
                type="button"
                onClick={() => setShowBudgetDetails(true)}
                className="w-full flex items-center justify-between p-3 bg-[var(--glass-bg)] border border-white/10 rounded-xl hover:bg-[var(--glass-bg)]/80 transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                    <Activity size={14} className="text-[var(--primary)]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Suivi Budgets</p>
                    <p className="text-[9px] text-[var(--text-main)]/40 font-bold uppercase">{budgets.length} objectifs au total</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-[var(--text-main)]/20 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* 🟢 PORTAL DE LA MODALE DE SUIVI DES BUDGETS */}
              {showBudgetDetails && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                  <div 
                    className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
                    onClick={() => { setShowBudgetDetails(false); setEditingBudget(null); }} 
                  />
                  
                  <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] p-6 z-[10000] animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 origin-center overflow-visible">
                    
                    {/* En-tête */}
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
                      <div>
                        <h4 className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest leading-none mb-1">Détails des budgets</h4>
                        <p className="text-[9px] text-[var(--text-main)]/40 font-bold uppercase tracking-wider">Structure des dépenses</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="w-24">
                          <CustomSelect 
                            value={selectedBudgetYear || new Date().getFullYear()}
                            options={optionsAnnees}
                            onChange={(valeurSelectionnee) => {
                              setSelectedBudgetYear(Number(valeurSelectionnee));
                              setEditingBudget(null);
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px]" 
                          />
                        </div>

                        <button 
                          type="button"
                          onClick={() => { setShowBudgetDetails(false); setEditingBudget(null); }} 
                          className="p-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-all cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Navigation mois */}
                    <div className="flex flex-row gap-1 overflow-x-auto pb-2 mb-4 scrollbar-hide border-b border-white/[0.03] select-none">
                      {listeMoisDisponibles.length > 0 ? (
                        listeMoisDisponibles.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSelectedBudgetMonth(m);
                              setEditingBudget(null);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap border shrink-0 cursor-pointer ${
                              selectedBudgetMonth === m
                                ? 'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/30'
                                : 'bg-white/[0.01] text-[var(--text-main)]/40 border-white/5 hover:text-[var(--text-main)]/70'
                            }`}
                          >
                            {m}
                          </button>
                        ))
                      ) : (
                        <span className="text-[8px] font-black uppercase text-[var(--text-main)]/20 tracking-wider py-1.5">
                          Aucun mois enregistré
                        </span>
                      )}
                    </div>

                    {/* Liste des budgets filtrés */}
                    <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                      {(() => {
                        const anneeCible = selectedBudgetYear || new Date().getFullYear();
                        
                        const budgetsFiltres = budgets.filter(b => {
                          const bAnnee = b.Annee || b.annee;
                          return bAnnee === anneeCible && b.mois === (selectedBudgetMonth || b.mois);
                        });

                        if (budgets.length === 0) {
                          return <p className="text-[10px] text-center py-12 text-[var(--text-main)]/20 font-bold uppercase italic tracking-widest">Aucun budget défini</p>;
                        }
                        if (budgetsFiltres.length === 0) {
                          return <p className="text-[10px] text-center py-12 text-[var(--text-main)]/20 font-bold uppercase italic tracking-widest">Aucun budget pour cette période</p>;
                        }

                        return [...budgetsFiltres]
                          .sort((a, b) => a.nom.localeCompare(b.nom))
                          .map((b) => {
                            const bAnnee = b.Annee || b.annee;
                            
                            const depenseReelle = toutesLesTransactions
                              .filter(t => 
                                t.categorie === b.nom && 
                                t.compte === b.compte && 
                                t.mois === b.mois &&
                                (t.annee || new Date().getFullYear()) === bAnnee
                              )
                              .reduce((acc, t) => acc + Math.abs(t.montant), 0);

                            const pourcentage = Math.min((depenseReelle / b.somme) * 100, 100);
                            const estDepasse = depenseReelle > b.somme;

                            const uniqueKey = b.id || `${b.nom}-${b.compte}-${b.mois}-${bAnnee}`;
                            const isEditing = editingBudget && editingBudget.id_ref === uniqueKey;

                            return (
                              <div key={uniqueKey} className="group relative">
                                {isEditing ? (
                                  <div className="bg-[var(--glass-bg)] p-3 rounded-xl border border-[var(--primary)]/30 animate-in zoom-in-95 duration-200">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                                          <CategoryIcon name={editingBudget.nom} size={16} />
                                        </div>
                                        <input 
                                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-main)] font-bold outline-none focus:border-[var(--primary)]"
                                          value={editingBudget.nom}
                                          onChange={e => setEditingBudget({...editingBudget, nom: e.target.value})}
                                          autoFocus
                                        />
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <input 
                                          type="number"
                                          className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--primary)] font-mono"
                                          value={editingBudget.somme}
                                          onChange={e => setEditingBudget({...editingBudget, somme: e.target.value})}
                                        />
                                        <button 
                                          type="button"
                                          onClick={() => handleUpdateBudget(editingBudget, b.nom)}
                                          className="p-2 bg-[var(--primary)] text-[var(--text-main)] rounded-lg hover:scale-105 transition-all cursor-pointer"
                                        >
                                          <Check size={12} />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => setEditingBudget(null)}
                                          className="p-2 bg-[var(--glass-bg)] text-[var(--text-main)]/50 rounded-lg hover:bg-[var(--glass-bg)] cursor-pointer"
                                        >
                                          <X size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="group/item py-1">
                                    <div className="flex justify-between items-start mb-1.5">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <CategoryIcon name={b.nom} size={16} />
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[11px] font-black text-[var(--text-main)]/90 leading-tight truncate">
                                            {b.nom}
                                          </span>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[7px] px-1.5 py-0.5 bg-white/5 rounded text-[var(--text-main)]/40 font-bold uppercase tracking-tighter border border-white/5 truncate max-w-[120px]">
                                              {b.compte}
                                            </span>
                                            <span className="text-[7px] text-[var(--primary)]/60 font-black uppercase tracking-tighter">
                                              {b.mois} {bAnnee}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 shrink-0">
                                        <span className={`text-[10px] font-mono font-bold ${estDepasse ? 'text-rose-400' : 'text-emerald-400'}`}>
                                          {depenseReelle.toFixed(0)}€<span className="text-[var(--text-main)]/20 mx-0.5">/</span>{b.somme}€
                                        </span>
                                        
                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <button 
                                            type="button"
                                            onClick={() => setEditingBudget({...b, id_ref: uniqueKey})}
                                            className="p-1 text-[var(--text-main)]/20 hover:text-blue-400 transition-colors cursor-pointer"
                                          >
                                            <Edit3 size={12} />
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => confirmDelete2(b)}
                                            className="p-1 text-[var(--text-main)]/20 hover:text-rose-500 transition-colors cursor-pointer"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className={`absolute left-0 top-0 h-full transition-all duration-1000 ${estDepasse ? 'bg-rose-500' : 'bg-[var(--primary)]'}`}
                                        style={{ width: `${pourcentage}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                </div>,
                document.body
              )}
            </div>
          </div>
        </div>

        {/* COLONNE 2 : FILTRES & RÉSUMÉ MENSUEL (3 colonnes) */}
        <div className="col-span-1 lg:col-span-3 order-1 lg:order-0">
          <div className="bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 p-5 rounded-[var(--radius)] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <Filter size={14} className="text-[var(--primary)]" />
                  <h3 className="text-[var(--text-main)] text-xs font-black uppercase tracking-widest">Filtrer</h3>
                </div>
                
                <div className="space-y-3">
                  <CustomSelect 
                    label="Profil cible"
                    value={filters.profil}
                    icon={User}
                    options={['Tous', ...new Set(comptes.map(c => c.groupe))].map(p => ({ v: p, l: p }))}
                    onChange={handleProfilChange}
                  />

                  <CustomSelect 
                    label="Compte bancaire"
                    value={selectedCompte}
                    icon={Search}
                    options={[
                      { v: 'tous', l: 'Tous les comptes' },
                      ...soldesTries.map(s => ({ v: s.compte, l: s.compte }))
                    ]}
                    onChange={handleCompteChange}
                  />

                  <CustomSelect 
                    label="Mois"
                    value={filters.mois}
                    icon={Calendar}
                    options={moisListe}
                    onChange={(val) => setFilters({...filters, mois: val})}
                  />

                  <CustomSelect 
                    label="Année"
                    value={filters.annee}
                    icon={Calendar1}
                    options={[...new Set(availablePeriods.map(p => p.annee))].sort((a, b) => b - a).map(year => ({ v: year, l: year.toString() }))}
                    onChange={(val) => setFilters({...filters, annee: val})}
                  />
                </div>
              </div>

              {/* Résumé Mensuel */}
              <div className="py-4 border-y border-white/5 my-4">
                <div className="flex items-center justify-between mb-3 px-1">
                  <p className="text-[9px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em]">Résumé Mensuel</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${statsFiltrées.solde >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {statsFiltrées.solde >= 0 ? 'Excédent' : 'Déficit'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-[var(--glass-bg)] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full bg-emerald-500" />
                      <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase">Entrées</span>
                    </div>
                    <p className="text-[14px] font-mono font-black text-emerald-400 truncate">
                      {statsFiltrées.revenus.toLocaleString('fr-FR')}€
                    </p>
                  </div>

                  <div className="p-3 bg-[var(--glass-bg)] rounded-2xl border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1 h-1 rounded-full bg-rose-500" />
                      <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase">Sorties</span>
                    </div>
                    <p className="text-[14px] font-mono font-black text-rose-400 truncate">
                      {statsFiltrées.depenses.toLocaleString('fr-FR')}€
                    </p>
                  </div>
                </div>

                <div className="mt-4 px-1">
                  <div className="h-1.5 w-full bg-[var(--glass-bg)] rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-700"
                      style={{ width: `${(statsFiltrées.revenus / (statsFiltrées.revenus + statsFiltrées.depenses || 1)) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-rose-500/30 transition-all duration-700"
                      style={{ width: `${(statsFiltrées.depenses / (statsFiltrées.revenus + statsFiltrées.depenses || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bloc Mémoire */}
              <div className="pt-2 relative">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={12} className="text-[var(--primary)]/50" />
                  <span className="text-[10px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.15em]">Apprentissage</span>
                </div>
                <p className="text-[9px] text-[var(--text-main)]/50 leading-relaxed mb-3">
                  Mémorise tes habitudes pour catégoriser automatiquement tes prochains imports CSV.
                </p>

                <div className="flex items-center gap-3 p-3 bg-[var(--glass-bg)] rounded-2xl border border-white/10 hover:bg-[var(--glass-bg)] transition-all group relative">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-xl group-hover:scale-110 transition-transform">
                    <Brain size={18} className="text-[var(--primary)]" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[11px] font-black text-[var(--text-main)] uppercase leading-none">Apprentissage</span>
                    <span className="text-[9px] text-[var(--text-main)]/30 font-bold uppercase mt-1">
                      {isApprendreActive ? "Activé" : "Désactivé"}
                    </span>
                  </div>

                  <button 
                    onClick={() => {
                      const newState = !showLearningList;
                      setShowLearningList(newState);
                      if (newState) fetchMemoire();
                    }}
                    className={`p-2 rounded-lg border transition-all z-20 cursor-pointer ${showLearningList ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'bg-[var(--glass-bg)] border-white/5 text-[var(--text-main)]/40 hover:bg-[var(--glass-bg)]'}`}
                  >
                    <List size={14} />
                  </button>
                  
                  <button 
                    onClick={() => setIsApprendreActive(!isApprendreActive)}
                    className={`w-10 h-5 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${isApprendreActive ? 'bg-[var(--primary)] shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-[var(--glass-bg)]'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isApprendreActive ? 'left-6' : 'left-1'}`} />
                  </button>

                  {/* Panneau mémoire déroulant */}
                  {showLearningList && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 z-50 bg-[#16191f] border border-white/10 rounded-2xl shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-200 origin-bottom backdrop-blur-xl">
                      <div className="flex justify-between items-center px-2 py-1 mb-2 border-b border-white/5">
                        <div className="flex items-center gap-1.5">
                          <Database size={11} className="text-[var(--primary)]" />
                          <span className="text-[8.5px] font-black uppercase text-[var(--text-main)]/50 tracking-widest">
                            Base Mémoire ({elementsAppris.length})
                          </span>
                        </div>
                        <button onClick={() => setShowLearningList(false)} className="p-0.5 hover:bg-white/5 rounded text-white/30 hover:text-white transition-colors cursor-pointer">
                          <X size={12} />
                        </button>
                      </div>
                      
                      <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar px-0.5">
                        {elementsAppris.length > 0 ? (
                          elementsAppris.map((item, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded-xl border border-white/5 group/item transition-colors">
                              <span className="text-[9.5px] text-white/85 font-bold uppercase truncate pr-2 flex-1" title={item.nom}>
                                {item.nom}
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/10 px-2 py-1 rounded-lg shadow-sm">
                                  <CategoryIcon name={item.categorie} size={12} />
                                  <span className="text-[8.5px] font-black uppercase text-white/80 tracking-tight">
                                    {getCleanCategoryName(item.categorie)}
                                  </span>
                                </div>
                                <button onClick={() => handleDeleteMemory(item.nom)} className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 hover:bg-rose-500/20 rounded-md text-rose-400 hover:text-rose-300 cursor-pointer" title="Supprimer cet apprentissage">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[8.5px] text-center py-4 text-white/20 uppercase font-bold tracking-wider">
                            Aucune règle mémorisée
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE 3 : NOUVELLE TRANSACTION & TABLEAU VIRTUALISÉ (Droite, 10 colonnes) */}
        <div className="col-span-12 lg:col-span-10 flex flex-col h-full min-h-0">
          
          {/* Saisie rapide */}
          <div className="mb-4 p-4 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] shrink-0">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20">
                  <Plus size={14} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="text-[var(--text-main)] font-bold text-[13px] tracking-wide">Nouvelle Transaction</h3>
                  <p className="text-[9px] text-[var(--text-main)]/30 uppercase tracking-widest font-medium">Saisie express</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-[var(--primary)]/5 rounded-full border border-[var(--primary)]/10 text-[9px] text-indigo-300/50 font-bold tracking-widest italic uppercase">
                ⚡ Auto-save Ready
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-[2] min-w-[200px] flex items-center gap-2 px-4 py-2 bg-black/20 rounded-2xl border border-white/5">
                <input 
                  type="text" 
                  id="quick-nom"
                  placeholder="Libellé..." 
                  className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-bold w-full placeholder:text-[var(--text-main)]/10"
                />
                <div className="w-[1px] h-4 bg-[var(--glass-bg)] mx-2" />
                <input 
                  type="number" 
                  id="quick-montant"
                  placeholder="0.00" 
                  className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-mono font-bold w-20 text-right placeholder:text-[var(--text-main)]/10"
                />
                <span className="text-[var(--text-main)]/20 font-bold text-xs">€</span>
              </div>

              <div className="w-40">
                <CustomSelect 
                  value={newTx.compte}
                  icon={CreditCard}
                  options={soldesTries.map(s => ({ v: s.compte, l: s.compte }))}
                  onChange={(val) => setNewTx({...newTx, compte: val})}
                />
              </div>

              <div className="w-48">
                <CustomSelect 
                  value={newTx.categorie}
                  icon={Tag}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setNewTx({...newTx, categorie: val})}
                />
              </div>

              <div className="w-40 flex items-center gap-2 px-3 py-2 bg-[var(--glass-bg)] rounded-xl border border-white/5 hover:border-[var(--primary)]/30 transition-all relative">
                <Calendar size={14} className="text-[var(--primary)]" />
                <DatePicker
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  dateFormat="dd/MM/yyyy"
                  className="bg-transparent border-none outline-none text-[var(--text-main)] text-[12px] font-bold w-full cursor-pointer"
                  calendarClassName="custom-calendar-dark"
                />
              </div>

              <button 
                onClick={submitQuickTransaction}
                className="ml-auto bg-[var(--primary)] hover:bg-indigo-600 text-[var(--text-main)] p-3 rounded-2xl transition-all shadow-lg shadow-[var(--primary)]/20 active:scale-95 group cursor-pointer"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Tableau des transactions */}
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="px-4 py-3 shrink-0 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex items-center gap-2 border-r border-white/10 pr-6 mr-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Vue active</span>
                </div>

                <div className="flex items-center divide-x divide-white/10">
                  <div className="flex items-center gap-2 pr-6">
                    <User size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-bold text-indigo-100/60 uppercase tracking-tight">{filters.profil}</span>
                  </div>

                  <div className="flex items-center gap-2 px-6">
                    <Search size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-bold text-indigo-100/60 uppercase tracking-tight">
                      {selectedCompte === 'tous' ? 'Tous les comptes' : selectedCompte}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pl-6">
                    <Calendar size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-tighter">
                      {filters.mois} {filters.annee}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm active:scale-95"
                  title="Exporter en Excel ou CSV"
                >
                  <Download size={12} strokeWidth={2.5} />
                  <span>Exporter</span>
                </button>

                <div className="relative group/search">
                  <Search 
                    size={12} 
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${searchTerm ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/20'}`} 
                  />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="RECHERCHER..."
                    className="bg-[var(--glass-bg)] border border-white/5 rounded-full py-1.5 pl-8 pr-4 text-[10px] font-bold text-[var(--text-main)] outline-none w-32 focus:w-64 focus:bg-white/[0.08] focus:border-[var(--primary)]/30 transition-all placeholder:text-[var(--text-main)]/10 tracking-widest"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-[var(--glass-bg)] rounded-full cursor-pointer">
                      <X size={10} className="text-[var(--text-main)]/30" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-[var(--glass-bg)] px-3 py-1.5 rounded-full border border-white/5 min-w-[100px] justify-center">
                  <span className="text-[9px] font-black text-[var(--primary)]">{transactionsFiltrees.length}</span>
                  <span className="text-[9px] font-medium text-[var(--text-main)]/30 uppercase tracking-widest">Résultats</span>
                </div>
              </div>
            </div>

            {/* Table virtualisée */}
            <div ref={tableContainerRef} className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-[var(--bg-site)]/95 backdrop-blur-md sticky top-0 z-40 border-b border-white/10 shadow-sm">
                    <th className="py-3 px-2 w-10 border-b border-white/10 text-center">
                      <input 
                        type="checkbox"
                        checked={transactionsFiltrees.length > 0 && selectedIds.length === transactionsFiltrees.length}
                        onChange={toggleAll}
                        className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-[var(--primary)] focus:ring-[var(--primary)]/40 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-2 w-16 cursor-pointer hover:bg-white/[0.02]" onClick={() => handleSort('jour')}>
                      <div className="flex items-center gap-1 text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                        Date {sortConfig.key === 'jour' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={10} />}
                      </div>
                    </th>
                    <th className="py-3 px-2 min-w-[260px] max-w-[420px] cursor-pointer hover:bg-white/[0.02]" onClick={() => handleSort('nom')}>
                      <div className="flex items-center gap-1 text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                        Transaction {sortConfig.key === 'nom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={10} />}
                      </div>
                    </th>
                    <th className="py-3 px-2 w-28 cursor-pointer hover:bg-white/[0.02] text-right" onClick={() => handleSort('montant')}>
                      <div className="flex items-center justify-end gap-1 text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                        Montant {sortConfig.key === 'montant' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={10} />}
                      </div>
                    </th>
                    <th className="py-3 px-2 hidden md:table-cell w-56 cursor-pointer hover:bg-white/[0.02]" onClick={() => handleSort('categorie')}>
                      <div className="flex items-center gap-1 text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                        Catégorie {sortConfig.key === 'categorie' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={10} />}
                      </div>
                    </th>
                    <th className="py-3 px-2 w-36 min-w-[135px] text-center text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                      Mois Affecté
                    </th>
                    <th className="py-3 px-2 w-28 text-center text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                      Prévision
                    </th>
                    <th className="py-3 px-2 w-20 text-center text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-wider">
                      Enveloppe
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.03]">
                  {transactionsFiltrees.length > 0 ? (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td colSpan={8} style={{ height: `${paddingTop}px`, padding: 0, border: 0 }} />
                        </tr>
                      )}

                      {virtualRows.map((virtualRow) => {
                        const t = transactionsFiltrees[virtualRow.index];
                        if (!t) return null;

                        const isSelected = selectedIds.includes(t.id);
                        const isTransfertInterne = Boolean(
                          t.categorie && (
                            t.categorie.includes(" vers ") || 
                            t.categorie.startsWith("Virement :") || 
                            t.categorie.includes("🔄")
                          )
                        );
                        const isRevenu = parseFloat(t.montant) > 0;

                        return (
                          <tr 
                            key={t.id || virtualRow.key} 
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className={`group transition-colors duration-150 ${
                              isSelected ? 'bg-[var(--primary)]/10 shadow-[inset_3px_0_0_0_#6366f1]' : 'hover:bg-white/[0.02]'
                            }`}
                          >
                            <td className="py-2.5 px-2 w-10 border-b border-white/[0.04] text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(t.id)}
                                className="w-3.5 h-3.5 rounded border-white/20 bg-black/40 text-[var(--primary)] cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-2 border-b border-white/[0.04] w-16 whitespace-nowrap">
                              <div className="pointer-events-none">
                                <CustomBadgeDate t={t} />
                              </div>
                            </td>

                            {/* 3. LIBELLÉ + BOUTON CISEAUX PERMANENT + BADGE VENTILÉE */}
                            <td className="py-2.5 px-2 border-b border-white/[0.04] min-w-[280px] max-w-[550px]">
                            <div className={`flex flex-col border-l-4 pl-2.5 py-0.5 transition-colors ${
                                isTransfertInterne
                                ? "border-[var(--primary)]/50 group-hover:border-[var(--primary)]" 
                                : isRevenu 
                                    ? "border-emerald-500/50 group-hover:border-emerald-400" 
                                    : "border-rose-500/50 group-hover:border-rose-400"
                            }`}>
                                
                                {/* Ligne 1 : Champ texte + Bouton Ciseaux permanent */}
                                <div className="flex items-start gap-2">
                                <textarea
                                    key={t.id}
                                    rows="1"
                                    defaultValue={t.nom}
                                    onBlur={(e) => updateCell(t.id, 'nom', e.target.value)}
                                    onInput={(e) => {
                                    e.target.style.height = "auto";
                                    e.target.style.height = `${Math.max(26, e.target.scrollHeight)}px`;
                                    }}
                                    ref={(el) => {
                                    if (el) {
                                        el.style.height = "auto";
                                        el.style.height = `${Math.max(26, el.scrollHeight)}px`;
                                    }
                                    }}
                                    className="bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/15 focus:border-[var(--primary)]/60 focus:bg-black/60 text-[12px] leading-snug font-bold text-[var(--text-main)] outline-none w-full resize-none overflow-hidden py-1 px-2 rounded-lg transition-all break-words cursor-text"
                                    placeholder="Modifier le libellé..."
                                />

                                {/* Badge si doublon #2, #3 */}
                                {/#\d+$/.test(t.nom) && (
                                    <span 
                                    title="Transaction similaire indexée"
                                    className="shrink-0 px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20 text-[7px] font-black uppercase mt-1"
                                    >
                                    {t.nom.match(/#\d+$/)[0]}
                                    </span>
                                )}

                                {/* ✂️ BOUTON CISEAUX VISIBLE TOUT LE TEMPS */}
                                <button
                                    type="button"
                                    onClick={() => setSplittingTx(t)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer shrink-0 mt-0.5 flex items-center justify-center ${
                                    t.split_id 
                                        ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                                        : 'bg-white/[0.04] text-white/50 border-white/10 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-indigo-500/10'
                                    }`}
                                    title={t.split_id ? "Transaction déjà Divisée (cliquer pour voir ou annuler)" : "Diviser cette transaction (Split)"}
                                >
                                    <Scissors size={12} strokeWidth={2.5} />
                                </button>

                                {/* Petite icône crayon d'indication */}
                                <div className="mt-1.5 shrink-0 opacity-20 group-hover:opacity-60 transition-opacity" title="Cliquer pour modifier">
                                    <Pencil size={10} className="text-white/40" />
                                </div>
                                </div>
                                
                                {/* Ligne 2 : Compte + Type + BADGE [VENTILÉE] */}
                                <div className="flex items-center gap-1.5 mt-0.5 pl-1 flex-wrap">
                                <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase font-mono tracking-wider">
                                    {t.compte}
                                </span>
                                <span className="text-white/10 text-[8px]">•</span>
                                <span className={`text-[7.5px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider ${
                                    isTransfertInterne
                                    ? "bg-[var(--primary)]/15 text-[var(--primary)]"
                                    : isRevenu 
                                        ? "bg-emerald-500/15 text-emerald-400" 
                                        : "bg-rose-500/15 text-rose-400"
                                }`}>
                                    {isTransfertInterne ? "Transfert" : isRevenu ? "Revenu" : "Dépense"}
                                </span>

                                {/* 🟢 BADGE [VENTILÉE] OUVRANT LA BELLE MODALE */}
                                    {t.split_id && (
                                        <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUnsplitModal({ show: true, splitId: t.split_id, txName: t.nom });
                                        }}
                                        className="px-2 py-0.5 rounded-lg bg-indigo-500/20 hover:bg-rose-500/20 text-indigo-300 hover:text-rose-300 border border-indigo-500/30 hover:border-rose-500/30 text-[7.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 transition-all cursor-pointer group/badge shadow-sm"
                                        title="Cliquer pour annuler la division et fusionner à nouveau"
                                        >
                                        <Scissors size={9} />
                                        <span>Divisée</span>
                                        <RotateCcw size={8} className="opacity-40 group-hover/badge:opacity-100 transition-opacity ml-0.5 text-rose-300" />
                                        </button>
                                    )}
                                </div>

                            </div>
                            </td>

                            <td className="py-2.5 px-2 text-right border-b border-white/[0.04] w-28 whitespace-nowrap">
                              <span className={`text-[13px] font-black tabular-nums transition-colors ${
                                isTransfertInterne ? 'text-[var(--primary)]' : isRevenu ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {isRevenu && !isTransfertInterne ? '+' : ''}
                                {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                            </td>

                            <td className="py-2.5 px-2 hidden md:table-cell border-b border-white/[0.04] w-44">
                              <CustomSelect 
                                value={t.categorie || "Autre"}
                                icon={Tag} 
                                options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                                onChange={(val) => updateCell(t.id, 'categorie', val)}
                                className="px-2 py-1 rounded-xl text-[10px] bg-black/25 border-white/5 hover:border-white/15 h-8 flex items-center justify-between"
                              />
                            </td>

                            <td className="py-2.5 px-2 border-b border-white/[0.04] w-36 min-w-[135px]">
                              <CustomSelect 
                                value={t.mois || "Janvier"}
                                icon={Calendar} 
                                options={moisOptionsAbrege}
                                onChange={(val) => updateCell(t.id, 'mois', val)}
                                className="px-2.5 py-1 rounded-xl text-[10.5px] font-bold bg-black/25 border-white/5 hover:border-white/15 h-8 flex items-center justify-between"
                              />
                            </td>

                            <td className={`py-2.5 px-2 border-b border-white/[0.04] w-28 text-center relative ${activePrevisionDropdownId === t.id ? 'z-[60]' : ''}`}>
                              {(() => {
                                const isTxPositive = (parseFloat(t.montant) || 0) >= 0;
                                const compteTx = (comptes || []).find(c => 
                                  (c.compte || "").trim().toUpperCase() === (t.compte || "").trim().toUpperCase()
                                );
                                const groupeCible = compteTx?.groupe || (filters?.profil !== 'Tous' ? filters?.profil : null);

                                const prevAssociee = (allPrevisionsAnnee || []).find(p => p.id === t.prevision_id);
                                const nomBadge = prevAssociee ? getCleanCategoryName(prevAssociee.nom.replace(/^\[PRÉVI\]\s*/i, '')) : null;

                                const previsionsDuMois = (allPrevisionsAnnee || []).filter(p => {
                                  const matchMois = String(p.mois || "").toLowerCase().trim() === String(t.mois || "").toLowerCase().trim();
                                  const anneeT = parseInt(t.annee || new Date().getFullYear());
                                  const anneeP = parseInt(p.annee || new Date().getFullYear());
                                  const matchAnnee = (anneeT === anneeP);

                                  let matchGroupe = true;
                                  if (groupeCible) {
                                    const compteP = (comptes || []).find(c => 
                                      (c.compte || "").trim().toUpperCase() === (p.compte || "").trim().toUpperCase()
                                    );
                                    matchGroupe = compteP?.groupe?.toLowerCase().trim() === groupeCible.toLowerCase().trim();
                                  }

                                  const isPrevPositive = (parseFloat(p.montant) || 0) >= 0;
                                  return matchMois && matchAnnee && matchGroupe && (isTxPositive === isPrevPositive);
                                });

                                return (
                                  <div className="flex items-center justify-center gap-1.5">
                                    {nomBadge ? (
                                      <span 
                                        title={`Lié à : ${nomBadge}`}
                                        className="text-[8.5px] font-black px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 uppercase max-w-[85px] truncate flex items-center gap-1"
                                      >
                                        <CategoryIcon name={prevAssociee.categorie || prevAssociee.nom} size={10} />
                                        <span className="truncate">{nomBadge}</span>
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold text-white/10 uppercase italic select-none">
                                        Aucune
                                      </span>
                                    )}

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (activePrevisionDropdownId === t.id) {
                                          setActivePrevisionDropdownId(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const spaceBelow = window.innerHeight - rect.bottom;
                                          setDropdownPosition(spaceBelow < 280 ? 'top' : 'bottom');
                                          setActivePrevisionDropdownId(t.id);
                                        }
                                      }}
                                      className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                                        activePrevisionDropdownId === t.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white hover:bg-white/5'
                                      }`}
                                    >
                                      <MoreHorizontal size={12} />
                                    </button>

                                    {activePrevisionDropdownId === t.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-50 cursor-default" 
                                          onClick={(e) => { e.stopPropagation(); setActivePrevisionDropdownId(null); }}
                                        />

                                        <div 
                                          onClick={(e) => e.stopPropagation()}
                                          className={`
                                            absolute right-0 w-60 bg-[#121214] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-2 z-[70] flex flex-col gap-1 text-left backdrop-blur-xl
                                            ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-9'}
                                          `}
                                        >
                                          <div className="px-2 py-1 text-[8px] font-black text-white/40 uppercase tracking-wider border-b border-white/5 flex items-center justify-between mb-1">
                                            <span>Prévisions ({t.mois})</span>
                                            <span className={isTxPositive ? 'text-emerald-400' : 'text-rose-400'}>
                                              {isTxPositive ? '+ Revenu' : '- Dépense'}
                                            </span>
                                          </div>

                                          <button
                                            onClick={async () => {
                                              await updateCell(t.id, 'prevision_id', null);
                                              setActivePrevisionDropdownId(null);
                                            }}
                                            className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                              !t.prevision_id ? 'bg-white/10 text-white' : 'text-white/40 hover:bg-white/5 hover:text-white'
                                            }`}
                                          >
                                            <span>✕</span> Aucune liaison
                                          </button>

                                          <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                            {previsionsDuMois.map((p) => {
                                              const isLinked = t.prevision_id === p.id;
                                              const nomAff = getCleanCategoryName(p.nom.replace(/^\[PRÉVI\]\s*/i, ''));
                                              const mntPrv = Math.abs(parseFloat(p.montant) || 0);

                                              return (
                                                <button
                                                  key={p.id}
                                                  onClick={async () => {
                                                    await updateCell(t.id, 'prevision_id', p.id);
                                                    setActivePrevisionDropdownId(null);
                                                  }}
                                                  className={`w-full text-left p-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                                    isLinked ? 'bg-emerald-500/15 text-emerald-300' : 'hover:bg-white/5 text-white/70'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1.5 truncate">
                                                    <CategoryIcon name={p.categorie || p.nom} size={11} />
                                                    <span className="truncate">{nomAff} ({mntPrv.toFixed(0)}€)</span>
                                                  </div>
                                                  {isLinked && <span className="text-emerald-400 text-xs">✓</span>}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </td>

                            <td className="py-2.5 px-2 border-b border-white/[0.04] w-20 text-center relative">
                              <div className="flex items-center justify-center gap-1">
                                {t.enveloppe ? (
                                  <span 
                                    title={`Alloué à : ${t.enveloppe}`}
                                    className="text-[8px] font-black px-1.5 py-0.5 rounded bg-[var(--primary)]/15 border border-[var(--primary)]/20 text-[var(--primary)] uppercase max-w-[65px] truncate"
                                  >
                                    {t.enveloppe}
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-bold text-white/10 uppercase italic select-none">
                                    Aucune
                                  </span>
                                )}

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveDropdownId(activeDropdownId === t.id ? null : t.id);
                                  }}
                                  className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                                    activeDropdownId === t.id ? 'bg-white/10 text-white' : 'text-white/20 hover:text-white hover:bg-white/5'
                                  }`}
                                >
                                  <MoreHorizontal size={12} />
                                </button>

                                {activeDropdownId === t.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-50 cursor-default" 
                                      onClick={(e) => { e.stopPropagation(); setActiveDropdownId(null); }}
                                    />

                                    <div className="absolute right-1 top-9 w-48 bg-[#121214] border border-white/10 rounded-xl shadow-2xl p-1.5 z-[60] flex flex-col gap-0.5 text-left backdrop-blur-md">
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          await updateCell(t.id, 'enveloppe', "");
                                          setActiveDropdownId(null);
                                        }}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-2 cursor-pointer ${
                                          !t.enveloppe ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-white/40 hover:bg-white/5 hover:text-white'
                                        }`}
                                      >
                                        <X size={12} className="shrink-0 opacity-60" />
                                        <span>Aucune enveloppe</span>
                                      </button>

                                      {Array.from(new Set(allocations.map(a => a.projet))).map((projetNom) => {
                                        const isSelected = t.enveloppe === projetNom;
                                        return (
                                          <button
                                            key={projetNom}
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              await updateCell(t.id, 'enveloppe', projetNom);
                                              setActiveDropdownId(null);
                                            }}
                                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                              isSelected ? 'bg-emerald-500/15 text-emerald-400' : 'text-white/70 hover:bg-white/5 hover:text-white'
                                            }`}
                                          >
                                            <div className="flex items-center gap-2 truncate min-w-0">
                                              <WalletCards size={12} className={`shrink-0 ${isSelected ? 'text-emerald-400' : 'text-white/40'}`} />
                                              <span className="truncate">{projetNom}</span>
                                            </div>
                                            {isSelected && <Check size={12} strokeWidth={3} className="shrink-0 text-emerald-400" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {paddingBottom > 0 && (
                        <tr>
                          <td colSpan={8} style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }} />
                        </tr>
                      )}
                    </>
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-3 mx-auto">
                          <span className="text-xl opacity-30">📂</span>
                        </div>
                        <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-[0.2em] opacity-40">
                          Aucune transaction trouvée
                        </h3>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

    {/* =========================================================================
          🔄 MODALE SOMBRE DE CONFIRMATION D'ANNULATION (UNSPLIT)
          ========================================================================= */}
      {unsplitModal.show && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          {/* Calque sombre et flouté */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setUnsplitModal({ show: false, splitId: null, txName: '' })}
          />
          
          {/* Boîte de dialogue Kleea */}
          <div className="relative bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl z-10 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/10">
              <RotateCcw size={24} />
            </div>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
              Annuler la Division ?
            </h3>
            
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Voulez-vous fusionner à nouveau les sous-parties de <strong className="text-white">"{unsplitModal.txName}"</strong> ? 
              <br />
              <span className="text-[10px] text-white/40 block mt-2">
                Les lignes découpées seront supprimées et l'écriture originale sera restaurée dans votre historique.
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUnsplitModal({ show: false, splitId: null, txName: '' })}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Garder découpé
              </button>
              
              <button
                type="button"
                onClick={executeUnsplit}
                className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-600/25 transition-all cursor-pointer active:scale-95"
              >
                Fusionner
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODALE DE SPLIT TRANSACTION */}
      <SplitTransactionModal
        isOpen={Boolean(splittingTx)}
        onClose={() => setSplittingTx(null)}
        transaction={splittingTx}
        categoriesVisibles={categoriesVisibles}
        allocations={allocations}
        onSuccess={() => {
          if (typeof fetchTransactions === 'function') {
            fetchTransactions(); // 👈 Actualise les données sans recharger la page
          }
        }}
      />
    </div>

    
  );
}