import React, { useState } from 'react';
import { 
  Brain, X, Plus, Settings2, ChevronRight, Eye, EyeOff, Trash2, 
  Target, Activity, Check, Edit3, Filter, User, Search, Calendar, 
  Database, List, CreditCard, Tag, MoreHorizontal, Pencil, ArrowUpDown, Wallet,
  Edit2, Sparkles, Layers 
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import { SketchPicker } from 'react-color';
import { CategoryIcon, getCleanCategoryName, LucideIconPicker, getCategoryIconInfo, getCategoryGroup } from './categoryIcons';

export default function GererMobile(props) {
  const {
    lastLearned, setLastLearned,
    toutesLesCategories = [], masquees = [], setMasquees, categoriesPerso = [], categoriesVisibles = [],
    addCategory, handleUpdateCategory, removeCategory, toggleVisibility,
    budgets = [], formBudget, setFormBudget, handleAddBudget,
    showBudgetDetails, setShowBudgetDetails,
    selectedBudgetYear, setSelectedBudgetYear, optionsAnnees,
    listeMoisDisponibles, selectedBudgetMonth, setSelectedBudgetMonth,
    editingBudget, setEditingBudget, handleUpdateBudget, confirmDelete2,
    filters, comptes = [], setFilters, selectedCompte, setSelectedCompte, availablePeriods = [], moisListe = [],
    statsFiltrées = { revenus: 0, depenses: 0, solde: 0 },
    isApprendreActive, setIsApprendreActive,
    showLearningList, setShowLearningList,
    fetchMemoire, elementsAppris = [], handleDeleteMemory,
    newTx, setNewTx, selectedDate, setSelectedDate, submitQuickTransaction,
    transactionsFiltrees = [], selectedIds = [], toggleAll, toggleSelect, updateCell,
    allocations = [], searchTerm, setSearchTerm,
    allPrevisionsAnnee = [], toutesLesTransactions = [],
    CustomSelect,
    handleProfilChange, handleCompteChange
  } = props;

  const [activeSection, setActiveSection] = useState('transactions');
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const [selectedIconName, setSelectedIconName] = useState('Tag');
  const [selectedCatColor, setSelectedCatColor] = useState('#818cf8');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showCatColorPicker, setShowCatColorPicker] = useState(false);

  const [editingCat, setEditingCat] = useState(null);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);
  const [showEditColorPicker, setShowEditColorPicker] = useState(false);

  // Groupes
  const [groupFilter, setGroupFilter] = useState('all');
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [userGroups, setUserGroups] = useState([
    'Logement', 'Vie courante', 'Transports', 'Santé', 'Loisirs', 'Revenus', 'Général'
  ]);

  // 🟢 1. Gestion synchronisée du changement de profil
  const onSelectProfilLocal = (nouveauProfil) => {
    if (typeof handleProfilChange === 'function') {
      handleProfilChange(nouveauProfil);
    } else {
      setFilters(f => ({ ...f, profil: nouveauProfil }));
      if (nouveauProfil === 'Tous') {
        if (typeof setSelectedCompte === 'function') setSelectedCompte('tous');
      } else {
        const duProfil = comptes.filter(c => c.groupe?.trim().toLowerCase() === nouveauProfil?.trim().toLowerCase());
        const ccp = duProfil.find(c => c.compte?.trim().toUpperCase().includes('CCP'));
        const cible = ccp ? ccp.compte : (duProfil[0]?.compte || 'tous');
        if (typeof setSelectedCompte === 'function') setSelectedCompte(cible);
      }
    }
  };

  // 🟢 2. Gestion synchronisée du changement de compte
  const onSelectCompteLocal = (nouveauCompte) => {
    if (typeof handleCompteChange === 'function') {
      handleCompteChange(nouveauCompte);
    } else {
      if (typeof setSelectedCompte === 'function') setSelectedCompte(nouveauCompte);
      if (nouveauCompte !== 'tous') {
        const cFound = comptes.find(c => c.compte?.trim().toUpperCase() === nouveauCompte?.trim().toUpperCase());
        if (cFound?.groupe) {
          setFilters(f => ({ ...f, profil: cFound.groupe }));
        }
      }
    }
  };

  const handleAssignCategoryGroup = async (catName, targetGroup) => {
    if (!targetGroup || !props.api) return;
    try {
      await props.api.put('/api/categories/assign-group', {
        nom: catName,
        groupe: targetGroup,
        utilisateur: props.user
      });
      if (props.fetchCategories) await props.fetchCategories();
    } catch (e) {
      console.error("Erreur assignation groupe mobile:", e);
    }
  };

  const handleAddGroupLocal = () => {
    const clean = newGroupName.trim();
    if (clean && !userGroups.some(g => g.toLowerCase() === clean.toLowerCase())) {
      setUserGroups(prev => [...prev, clean]);
      setGroupFilter(clean);
      setNewGroupName('');
      setShowNewGroupInput(false);
    }
  };

  const handleDeleteGroupLocal = async (grpName) => {
    if (!grpName || grpName.toLowerCase() === 'général') return;
    try {
      if (props.api) {
        await props.api.put('/api/categories/delete-group', {
          groupe: grpName,
          utilisateur: props.user,
          fallback_groupe: 'Général'
        });
      }
      setUserGroups(prev => prev.filter(g => g.toLowerCase() !== grpName.toLowerCase()));
      if (groupFilter.toLowerCase() === grpName.toLowerCase()) setGroupFilter('all');
      if (props.fetchCategories) await props.fetchCategories();
    } catch (e) {
      console.error("Erreur suppression groupe mobile:", e);
    }
  };

  const handleCreateCategory = () => {
    const input = document.getElementById('catInputMobile');
    const nom = input?.value?.trim();
    if (nom) {
      if (addCategory) addCategory(nom, selectedIconName, selectedCatColor);
      if (input) input.value = '';
      setSelectedIconName('Tag');
      setSelectedCatColor('#818cf8');
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCat) return;
    if (handleUpdateCategory) {
      await handleUpdateCategory(editingCat.nom, editingCat.icone, editingCat.couleur);
    }
    setEditingCat(null);
  };

  const openEditTx = (tx) => {
    setEditingTransaction({ ...tx });
  };

  const handleSaveMobileTx = async () => {
    if (!editingTransaction) return;
    
    await updateCell(editingTransaction.id, 'nom', editingTransaction.nom);
    await updateCell(editingTransaction.id, 'montant', parseFloat(editingTransaction.montant));
    await updateCell(editingTransaction.id, 'compte', editingTransaction.compte);
    await updateCell(editingTransaction.id, 'categorie', editingTransaction.categorie);
    await updateCell(editingTransaction.id, 'mois', editingTransaction.mois);
    await updateCell(editingTransaction.id, 'enveloppe', editingTransaction.enveloppe);
    await updateCell(editingTransaction.id, 'prevision_id', editingTransaction.prevision_id ? parseInt(editingTransaction.prevision_id) : null);
    
    setEditingTransaction(null);
  };

  const getFormattedDate = (t) => {
    if (t.date) {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {}
      return t.date;
    }
    if (t.jour) return `${t.jour} ${t.mois || ''}`.trim().toUpperCase();
    return (t.mois || 'À DÉFINIR').toUpperCase();
  };

  // Liste des comptes filtrée selon le profil actif (ou tous si 'Tous')
  const comptesDisponiblesMobile = (comptes || []).filter(c => 
    !filters?.profil || filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
      
      {/* NOTIFICATION FLOTTANTE */}
      {lastLearned && (
        <div className="fixed top-4 left-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-[#121212] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-[var(--glass-blur)] relative overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="bg-[var(--primary)]/20 p-2 rounded-xl">
                <Brain size={16} className="text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-wider text-[var(--primary)]">Mémoire mise à jour</span>
                  <button onClick={() => setLastLearned(null)} className="text-white/40"><X size={12} /></button>
                </div>
                <p className="text-xs font-bold truncate mt-1">{lastLearned.transaction}</p>
                <span className="text-[10px] text-white/40 italic">Cible : {lastLearned.categorie}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER MOBILE */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h1 className="text-xl font-black tracking-tight">Historique</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">
            {filters?.profil || 'Tous'} • {filters?.mois} {filters?.annee}
          </p>
        </div>
        
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
            showFilters || (selectedCompte && selectedCompte !== 'tous')
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white shadow-lg' 
              : 'bg-[var(--glass-bg)] border-white/10 text-white/60'
          }`}
        >
          <Filter size={14} />
          <span className="text-[10px] font-bold uppercase">
            {selectedCompte && selectedCompte !== 'tous' ? selectedCompte : 'Filtres'}
          </span>
        </button>
      </div>

      {/* RECAP MENSUEL RAPIDE */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl select-none">
        <div className="text-center">
          <p className="text-[8px] font-bold text-white/30 uppercase">Entrées</p>
          <p className="text-xs font-mono font-black text-emerald-400 mt-0.5">+{statsFiltrées.revenus.toFixed(0)}€</p>
        </div>
        <div className="text-center border-x border-white/5">
          <p className="text-[8px] font-bold text-white/30 uppercase">Sorties</p>
          <p className="text-xs font-mono font-black text-rose-400 mt-0.5">-{statsFiltrées.depenses.toFixed(0)}€</p>
        </div>
        <div className="text-center">
          <p className="text-[8px] font-bold text-white/30 uppercase">Solde</p>
          <p className={`text-xs font-mono font-black mt-0.5 ${statsFiltrées.solde >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {statsFiltrées.solde.toFixed(0)}€
          </p>
        </div>
      </div>

      {/* 🟢 VOLET DE FILTRES CORRIGÉ (Z-INDEX SÉCURISÉ POUR ÉVITER LES CLICS BLOQUÉS) */}
      {showFilters && (
        <div className="mb-4 bg-[#121214] border border-[var(--primary)]/40 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-4 duration-200 relative z-30 shadow-2xl">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">Filtres Actifs</span>
            <button onClick={() => setShowFilters(false)} className="text-white/40 hover:text-white p-1">
              <X size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {/* Profil cible */}
            <div className="relative z-40">
              <CustomSelect 
                label="Profil cible"
                value={filters.profil || 'Tous'}
                icon={User}
                options={['Tous', ...new Set(comptes.map(c => c.groupe).filter(Boolean))].map(p => ({ v: p, l: p }))}
                onChange={onSelectProfilLocal}
                className="p-2.5 rounded-xl text-[10px]"
              />
            </div>

            {/* Compte bancaire */}
            <div className="relative z-30">
              <CustomSelect 
                label="Compte bancaire"
                value={selectedCompte || 'tous'}
                icon={Search}
                options={[
                  { v: 'tous', l: 'Tous les comptes' },
                  ...comptesDisponiblesMobile.map(s => ({ v: s.compte, l: s.compte }))
                ]}
                onChange={onSelectCompteLocal}
                className="p-2.5 rounded-xl text-[10px]"
              />
            </div>

            {/* Mois & Année */}
            <div className="grid grid-cols-2 gap-3 relative z-20">
              <CustomSelect 
                label="Mois"
                value={filters.mois}
                icon={Calendar}
                options={moisListe}
                onChange={(val) => setFilters(f => ({ ...f, mois: val }))}
                className="p-2.5 rounded-xl text-[10px]"
              />

              <CustomSelect 
                label="Année"
                value={filters.annee}
                icon={Calendar}
                options={[...new Set(availablePeriods.map(p => p.annee))]
                  .sort((a, b) => b - a)
                  .map(year => ({ v: year.toString(), l: year.toString() }))
                }
                onChange={(val) => setFilters(f => ({ ...f, annee: val }))}
                className="p-2.5 rounded-xl text-[10px]"
              />
            </div>
          </div>

          <button
            onClick={() => setShowFilters(false)}
            className="w-full py-2 bg-white/10 hover:bg-white/15 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors mt-2"
          >
            Fermer les filtres
          </button>
        </div>
      )}

      {/* SÉLECTEUR DE SOUS-ONGLETS */}
      <div className="flex border-b border-white/5 mb-4 select-none">
        <button 
          onClick={() => setActiveSection('transactions')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeSection === 'transactions' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Flux ({transactionsFiltrees.length})
        </button>
        <button 
          onClick={() => setActiveSection('tools')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeSection === 'tools' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Catégories / Saisie
        </button>
        <button 
          onClick={() => setActiveSection('budgets')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            activeSection === 'budgets' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Budgets ({budgets.length})
        </button>
      </div>

      {/* ONGLET 1 : TRANSACTIONS */}
      {activeSection === 'transactions' && (
        <div className="space-y-3 flex-1 animate-in fade-in duration-200">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm && setSearchTerm(e.target.value)}
              placeholder="RECHERCHER DANS L'HISTORIQUE..."
              className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-xs font-medium text-white outline-none placeholder:text-white/20 tracking-wider"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm && setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                <X size={12} />
              </button>
            )}
          </div>

          <div className="space-y-2 mt-2">
            {transactionsFiltrees.length > 0 ? (
              transactionsFiltrees.map((t) => {
                const isTransfertInterne = Boolean(
                  t.categorie && (
                    t.categorie.includes(" vers ") || 
                    t.categorie.startsWith("Virement :") || 
                    t.categorie.includes("🔄")
                  )
                );
                const isRevenu = parseFloat(t.montant) > 0;
                const prevAssociee = (allPrevisionsAnnee || []).find(p => p.id === t.prevision_id);
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => openEditTx(t)}
                    className="p-3 bg-[var(--glass-bg)] border border-white/5 active:bg-white/5 rounded-2xl flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2.5 h-10 rounded-full shrink-0 ${
                        isTransfertInterne ? 'bg-[var(--primary)]/40' : isRevenu ? 'bg-emerald-500/40' : 'bg-rose-500/40'
                      }`} />
                      
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate pr-2">{t.nom || "Sans libellé"}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono uppercase">
                            {t.compte}
                          </span>
                          
                          <div className="flex items-center gap-1">
                            <CategoryIcon name={t.categorie} size={11} />
                            <span className="text-[8px] font-black uppercase text-white/80 truncate max-w-[110px]">
                              {getCleanCategoryName(t.categorie) || "Autre"}
                            </span>
                          </div>

                          {prevAssociee && (
                            <span className="text-[7.5px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-black max-w-[105px] truncate flex items-center gap-1">
                              <CategoryIcon name={prevAssociee.categorie || prevAssociee.nom} size={9} />
                              <span className="truncate">{getCleanCategoryName(prevAssociee.nom.replace(/^\[PRÉVI\]\s*/i, ''))}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2 flex items-center gap-2.5">
                      <div>
                        <span className={`text-xs font-mono font-black ${
                          isTransfertInterne 
                            ? 'text-[var(--primary)]' 
                            : isRevenu 
                              ? 'text-emerald-400' 
                              : 'text-rose-400'
                        }`}>
                          {isRevenu && !isTransfertInterne ? '+' : ''}
                          {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                        
                        <p className="text-[8.5px] text-white/40 font-black tracking-tight mt-1">
                          {getFormattedDate(t)}
                        </p>
                      </div>
                      
                      <div className="p-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-white/20">
                        <Pencil size={10} />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center">
                <span className="text-xl opacity-30">📂</span>
                <p className="text-[10px] text-white/40 uppercase font-black mt-2">Aucun flux trouvé</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ONGLET 2 : OUTILS & GESTION CATÉGORIES */}
      {activeSection === 'tools' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Saisie express */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest mb-3 flex items-center gap-2">
              <Plus size={12} /> Nouvelle Transaction Express
            </h3>
            
            <div className="space-y-3">
              <input 
                type="text" 
                id="quick-nom-mobile"
                placeholder="Nom du flux..." 
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
              />
              
              <div className="grid grid-cols-2 gap-3 items-end">
                <div className="relative">
                  <label className="text-[8px] uppercase font-black text-white/30 block mb-1">Montant (€)</label>
                  <input 
                    type="text" 
                    id="quick-montant-mobile"
                    placeholder="0.00" 
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-3 pr-6 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                  <span className="absolute right-3 top-[65%] -translate-y-1/2 text-[10px] text-white/30 font-bold">€</span>
                </div>
                
                <CustomSelect 
                  value={newTx.compte}
                  options={(comptesDisponiblesMobile.length > 0 ? comptesDisponiblesMobile : comptes).map(s => ({ v: s.compte, l: s.compte }))}
                  onChange={(val) => setNewTx({...newTx, compte: val})}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <CustomSelect 
                  value={newTx.categorie}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setNewTx({...newTx, categorie: val})}
                  icon={Tag}
                  className="p-2.5 rounded-xl text-[10px]"
                />

                <div className="bg-black/30 border border-white/10 rounded-xl px-2 py-2 h-[38px] flex items-center justify-center relative">
                  <Calendar size={12} className="text-[var(--primary)] absolute left-3" />
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="bg-transparent border-none outline-none text-center w-full cursor-pointer text-xs font-bold text-white pl-5"
                  />
                </div>
              </div>

              <button 
                onClick={() => {
                  const label = document.getElementById('quick-nom-mobile')?.value;
                  const amt = document.getElementById('quick-montant-mobile')?.value;
                  if (label && amt) {
                    const elN = document.getElementById('quick-nom');
                    const elM = document.getElementById('quick-montant');
                    if (elN) elN.value = label;
                    if (elM) elM.value = amt;
                    submitQuickTransaction();
                    const qnm = document.getElementById('quick-nom-mobile');
                    const qmm = document.getElementById('quick-montant-mobile');
                    if (qnm) qnm.value = '';
                    if (qmm) qmm.value = '';
                  }
                }}
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-2 shadow-lg cursor-pointer"
              >
                Valider et Enregistrer
              </button>
            </div>
          </div>

          {/* Créer une catégorie */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl relative">
            <h3 className="text-[10px] font-black uppercase text-white/80 tracking-widest mb-3 flex items-center gap-2">
              <Sparkles size={12} className="text-indigo-400" /> Créer une Catégorie
            </h3>

            <div className="bg-black/40 border border-white/5 rounded-2xl p-3 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer shadow-inner shrink-0"
                    title="Changer d'icône"
                  >
                    <CategoryIcon name={selectedIconName} size={16} color={selectedCatColor} />
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
                    className="w-7 h-7 rounded-lg border border-white/20 hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-md shrink-0"
                    style={{ backgroundColor: selectedCatColor }}
                    title="Changer la couleur"
                  />

                  {showCatColorPicker && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                      <div className="fixed inset-0" onClick={() => setShowCatColorPicker(false)} />
                      <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-10 animate-in zoom-in-95">
                        <SketchPicker 
                          color={selectedCatColor} 
                          onChange={(c) => setSelectedCatColor(c.hex)} 
                          disableAlpha 
                        />
                        <button
                          onClick={() => setShowCatColorPicker(false)}
                          className="w-full py-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                        >
                          Confirmer la couleur
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <input 
                  type="text" 
                  id="catInputMobile"
                  placeholder="Intitulé (ex: Cinéma)..." 
                  className="flex-1 bg-transparent border-b border-white/10 text-xs font-bold text-white outline-none px-2 py-1 placeholder:text-white/20 focus:border-indigo-400 transition-colors"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCategory();
                  }}
                />
              </div>

              <button 
                onClick={handleCreateCategory}
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                <Plus size={13} strokeWidth={3} /> Créer la catégorie
              </button>
            </div>
          </div>

          {/* Groupes & Catégories */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[10px] font-black uppercase text-white/80 tracking-widest">
                  Mes Groupes & Catégories
                </h3>
                <p className="text-[8px] text-white/30 uppercase font-bold">Rangement personnalisé</p>
              </div>

              {!showNewGroupInput ? (
                <button
                  type="button"
                  onClick={() => setShowNewGroupInput(true)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={10} /> Nouveau
                </button>
              ) : (
                <div className="flex items-center gap-1 bg-black/50 border border-indigo-500/30 p-1 rounded-lg">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nom groupe..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddGroupLocal()}
                    className="bg-transparent text-[10px] text-white px-1.5 py-0.5 outline-none w-24 font-bold"
                  />
                  <button onClick={handleAddGroupLocal} className="px-1.5 py-0.5 bg-indigo-600 text-white rounded text-[8px] font-bold cursor-pointer">OK</button>
                  <button onClick={() => setShowNewGroupInput(false)} className="text-white/40 cursor-pointer"><X size={10} /></button>
                </div>
              )}
            </div>

            {(() => {
              const allFromCats = toutesLesCategories.map(c => getCategoryGroup(c));
              const allUnique = [...new Set([...userGroups, ...allFromCats, 'Général'])].filter(Boolean).sort();
              const groupsOptions = allUnique.map(g => ({ v: g, l: g }));

              return (
                <>
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 select-none">
                    <button
                      type="button"
                      onClick={() => setGroupFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-[8.5px] font-black uppercase tracking-wider shrink-0 border cursor-pointer ${
                        groupFilter === 'all'
                          ? 'bg-white text-slate-900 border-white shadow-sm'
                          : 'bg-black/30 border-white/5 text-white/40'
                      }`}
                    >
                      <Layers size={9} className={groupFilter === 'all' ? 'text-slate-900' : 'opacity-40'} />
                      <span>Tous</span>
                      <span className="ml-1 opacity-50 font-mono">({toutesLesCategories.length})</span>
                    </button>

                    {allUnique.map(grp => {
                      const isActive = groupFilter === grp;
                      const count = toutesLesCategories.filter(c => getCategoryGroup(c) === grp).length;
                      const isGeneral = grp.toLowerCase() === 'général' || grp.toLowerCase() === 'general';

                      return (
                        <div
                          key={grp}
                          className={`rounded-lg transition-all flex items-center border shrink-0 ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                              : 'bg-black/30 border-white/5 text-white/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => setGroupFilter(grp)}
                            className="pl-2 pr-1.5 py-1 text-[8.5px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                          >
                            <Layers size={9} className={isActive ? 'text-white' : 'text-indigo-400'} />
                            <span>{grp}</span>
                            <span className="opacity-60 font-mono text-[7.5px]">({count})</span>
                          </button>

                          {!isGeneral && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteGroupLocal(grp);
                              }}
                              className="pr-1.5 pl-0.5 text-white/30 hover:text-rose-400 cursor-pointer"
                              title={`Supprimer le groupe "${grp}"`}
                            >
                              <X size={9} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar pt-1">
                    {toutesLesCategories
                      .filter(cat => {
                        const currentGrp = getCategoryGroup(cat);
                        return groupFilter === 'all' || currentGrp === groupFilter;
                      })
                      .sort((a, b) => a.localeCompare(b))
                      .map(cat => {
                        const estMasquee = masquees.includes(cat);
                        const estPerso = categoriesPerso.includes(cat);
                        const currentGrp = getCategoryGroup(cat);

                        return (
                          <div 
                            key={cat} 
                            className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                              estMasquee ? 'bg-black/20 border-white/5 opacity-40' : 'bg-black/30 border-white/5'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                                <CategoryIcon name={cat} size={14} />
                                <span className={`text-xs font-bold truncate ${estMasquee ? 'text-white/30 line-through' : 'text-white/90'}`}>
                                  {getCleanCategoryName(cat)}
                                </span>
                                {estPerso && (
                                  <span className="text-[6.5px] bg-[var(--primary)]/10 text-[var(--primary)] px-1 py-0.2 rounded font-black uppercase shrink-0">
                                    Perso
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button 
                                  onClick={() => {
                                    const info = getCategoryIconInfo(cat);
                                    setEditingCat({
                                      nom: cat,
                                      icone: info.iconName || 'Tag',
                                      couleur: info.hex || '#818cf8',
                                      groupe: currentGrp
                                    });
                                  }}
                                  className="p-1 rounded-lg text-white/40 hover:text-indigo-400 cursor-pointer"
                                  title="Modifier icône / couleur"
                                >
                                  <Edit2 size={12} />
                                </button>

                                <button 
                                  onClick={() => toggleVisibility(cat)}
                                  className={`p-1 rounded-lg cursor-pointer ${estMasquee ? 'text-rose-400' : 'text-white/40 hover:text-emerald-400'}`}
                                  title={estMasquee ? "Afficher" : "Masquer"}
                                >
                                  {estMasquee ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>

                                {estPerso && (
                                  <button 
                                    onClick={() => removeCategory(cat)} 
                                    className="p-1 rounded-lg text-rose-500/60 hover:text-rose-400 cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-2">
                              <span className="text-[7.5px] font-black uppercase text-white/30 tracking-wider flex items-center gap-1 shrink-0">
                                <Layers size={9} className="text-indigo-400 opacity-60" />
                                <span>Groupe :</span>
                              </span>
                              
                              <div className="flex-1 min-w-0">
                                <CustomSelect
                                  value={currentGrp}
                                  options={groupsOptions}
                                  onChange={(newGrp) => handleAssignCategoryGroup(cat, newGrp)}
                                  icon={Layers}
                                  className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-black/40 border-white/10 h-6.5"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ONGLET 3 : BUDGETS */}
      {activeSection === 'budgets' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest mb-3 flex items-center gap-2">
              <Target size={12} /> Définir un Budget
            </h3>
            
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <CustomSelect 
                  value={formBudget.compte || 'tous'}
                  options={[
                    { v: 'tous', l: 'Tous les comptes' },
                    ...comptesDisponiblesMobile.map(s => ({ v: s.compte, l: s.compte }))
                  ]}
                  onChange={(val) => setFormBudget({...formBudget, compte: val})}
                  icon={Search}
                  className="p-2.5 rounded-xl text-[10px]"
                />
                
                <CustomSelect 
                  value={formBudget.mois || filters.mois}
                  options={moisListe}
                  onChange={(val) => setFormBudget({...formBudget, mois: val})}
                  icon={Calendar}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-8">
                  <CustomSelect 
                    value={formBudget.nom}
                    options={toutesLesCategories
                      .filter(c => !masquees.includes(c))
                      .map(cat => ({ v: cat, l: cat }))
                    }
                    onChange={(val) => setFormBudget({...formBudget, nom: val})}
                    icon={Tag}
                    className="p-2.5 rounded-xl text-[10px]"
                  />
                </div>
                
                <div className="col-span-4 relative">
                  <label className="text-[8px] uppercase font-black text-white/30 block mb-1">Limite (€)</label>
                  <input 
                    type="text"
                    placeholder="0"
                    value={formBudget.somme}
                    onChange={(e) => setFormBudget({...formBudget, somme: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-2 py-2.5 text-xs font-mono font-bold text-white outline-none text-right pr-6"
                  />
                  <span className="absolute right-2 top-[65%] -translate-y-1/2 text-[9px] text-white/30 font-bold">€</span>
                </div>
              </div>

              <button 
                onClick={handleAddBudget}
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-1 cursor-pointer"
              >
                Fixer Objectif
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {budgets.map((b) => {
              const depenseReelle = props.toutesLesTransactions
                .filter(t => 
                  t.categorie === b.nom && 
                  t.compte === b.compte && 
                  t.mois === b.mois
                )
                .reduce((acc, t) => acc + Math.abs(t.montant), 0);

              const pourcentage = Math.min((depenseReelle / b.somme) * 100, 100);
              const estDepasse = depenseReelle > b.somme;

              return (
                <div key={b.id || `${b.nom}-${b.mois}`} className="p-3 bg-[var(--glass-bg)] border border-white/5 rounded-2xl">
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={b.nom} size={15} />
                      <div>
                        <p className="text-xs font-black text-white">{getCleanCategoryName(b.nom)}</p>
                        <span className="text-[8px] uppercase font-bold text-white/30 tracking-tight">
                          {b.compte} • {b.mois}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-black ${estDepasse ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {depenseReelle.toFixed(0)}€<span className="text-white/20 mx-0.5">/</span>{b.somme}€
                      </span>
                    </div>
                  </div>
                  
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mt-1">
                    <div 
                      className={`h-full transition-all duration-500 ${estDepasse ? 'bg-rose-500' : 'bg-[var(--primary)]'}`}
                      style={{ width: `${pourcentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODALE MOBILE D'ÉDITION DE TRANSACTION */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setEditingTransaction(null)} />

          <div 
            className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 overflow-visible space-y-4 animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest">Éditer la transaction</h4>
                <p className="text-[9px] text-white/30 uppercase font-black">Modification express sur mobile</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTransaction(null)} 
                className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTransaction.nom || editingTransaction.libelle || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, nom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="text"
                    value={editingTransaction.montant}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, montant: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                  />
                </div>
                
                <CustomSelect 
                  label="Compte associé"
                  value={editingTransaction.compte}
                  options={(comptesDisponiblesMobile.length > 0 ? comptesDisponiblesMobile : comptes).map(s => ({ v: s.compte, l: s.compte }))}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, compte: val })}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <CustomSelect 
                  label="Catégorie"
                  value={editingTransaction.categorie || "Autre"}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, categorie: val })}
                  icon={Tag}
                  className="p-2.5 rounded-xl text-[10px]"
                />
                
                <CustomSelect 
                  label="Mois affecté"
                  value={editingTransaction.mois || "À définir"}
                  options={moisListe}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, mois: val })}
                  icon={Calendar}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              {/* Prévision liée */}
              {(() => {
                const isTxPositive = (parseFloat(editingTransaction.montant) || 0) >= 0;
                const compteTx = (comptes || []).find(c => 
                  (c.compte || "").trim().toUpperCase() === (editingTransaction.compte || "").trim().toUpperCase()
                );
                const groupeCible = compteTx?.groupe || (filters?.profil !== 'Tous' ? filters?.profil : null);

                const previsionsDispos = (allPrevisionsAnnee || []).filter(p => {
                  const matchMois = cleanMonth(p.mois) === cleanMonth(editingTransaction.mois);
                  const anneeT = parseInt(editingTransaction.annee || editingTransaction.année || filters?.annee || new Date().getFullYear());
                  const anneeP = parseInt(p.annee || p.année || new Date().getFullYear());
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
                }).map(p => {
                  const rawNom = p.nom.replace(/^\[PRÉVI\]\s*/i, '');
                  const montantPrev = Math.abs(parseFloat(p.montant) || 0);

                  const liees = (toutesLesTransactions || []).filter(tx => tx.prevision_id === p.id);
                  const consomme = liees.reduce((sum, tx) => sum + Math.abs(parseFloat(tx.montant) || 0), 0);
                  const restant = montantPrev - consomme;

                  const labelStatut = isTxPositive
                    ? (consomme >= montantPrev ? `[100% Reçu]` : `[Attendu: ${Math.max(0, restant).toFixed(0)}€]`)
                    : (restant < 0 ? `[Dépassé +${Math.abs(restant).toFixed(0)}€]` : `[Reste: ${restant.toFixed(0)}€]`);

                  return {
                    v: String(p.id),
                    l: `${getCleanCategoryName(rawNom)} (${montantPrev.toFixed(0)}€ ${labelStatut})`
                  };
                });

                return (
                  <CustomSelect 
                    label={isTxPositive ? "Prévision liée (Revenu)" : "Prévision liée (Dépense)"}
                    value={editingTransaction.prevision_id ? String(editingTransaction.prevision_id) : ""}
                    options={[
                      { v: "", l: "✕ Aucune prévision" },
                      ...previsionsDispos
                    ]}
                    onChange={(val) => setEditingTransaction({ 
                      ...editingTransaction, 
                      prevision_id: val ? parseInt(val) : null 
                    })}
                    icon={Target}
                    className="p-2.5 rounded-xl text-[10px]"
                  />
                );
              })()}

              {/* Enveloppe */}
              <CustomSelect 
                label="Enveloppe d'épargne"
                value={editingTransaction.enveloppe || ""}
                options={[
                  { v: "", l: "✕ Aucune enveloppe" },
                  ...Array.from(new Set(allocations.map(a => a.projet))).map(p => ({ v: p, l: p }))
                ]}
                onChange={(val) => setEditingTransaction({ ...editingTransaction, enveloppe: val })}
                icon={Wallet}
                className="p-2.5 rounded-xl text-[10px]"
              />
            </div>

            <div className="flex gap-2 pt-3">
              <button 
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={handleSaveMobileTx}
                className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'ÉDITION CATÉGORIE */}
      {editingCat && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setEditingCat(null)} />
          
          <div 
            className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest">
                  Personnaliser la catégorie
                </h4>
                <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">
                  {getCleanCategoryName(editingCat.nom)}
                </p>
              </div>
              <button 
                onClick={() => setEditingCat(null)} 
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
              <CategoryIcon 
                name={editingCat.icone} 
                size={38} 
                color={editingCat.couleur} 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                  className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Tag size={13} />
                  <span>Icône</span>
                </button>

                {showEditIconPicker && (
                  <LucideIconPicker 
                    selectedIcon={editingCat.icone}
                    onSelectIcon={(icon) => {
                      setEditingCat({ ...editingCat, icone: icon });
                      setShowEditIconPicker(false);
                    }}
                    onClose={() => setShowEditIconPicker(false)}
                  />
                )}
              </div>

              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                  className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <div className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor: editingCat.couleur }} />
                  <span>Couleur</span>
                </button>

                {showEditColorPicker && (
                  <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                    <div className="fixed inset-0" onClick={() => setShowEditColorPicker(false)} />
                    <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-10 animate-in zoom-in-95">
                      <SketchPicker 
                        color={editingCat.couleur} 
                        onChange={(c) => setEditingCat({ ...editingCat, couleur: c.hex })} 
                        disableAlpha 
                      />
                      <button
                        onClick={() => setShowEditColorPicker(false)}
                        className="w-full py-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                      >
                        Valider la couleur
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSaveCategoryEdit}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer mt-2"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      )}

    </div>
  );
}