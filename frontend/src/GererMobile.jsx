import React, { useState } from 'react';
import { 
  Brain, X, Plus, Settings2, ChevronRight, Eye, EyeOff, Trash2, 
  Target, Activity, Check, Edit3, Filter, User, Search, Calendar, 
  Database, List, CreditCard, Tag, MoreHorizontal, Pencil, ArrowUpDown,Wallet 
} from 'lucide-react';
import DatePicker from 'react-datepicker';

export default function GererMobile(props) {
  const {
    lastLearned, setLastLearned,
    toutesLesCategories, masquees, setMasquees, categoriesPerso, categoriesVisibles,
    addCategory, removeCategory, toggleVisibility,
    budgets, formBudget, setFormBudget, handleAddBudget,
    showBudgetDetails, setShowBudgetDetails,
    selectedBudgetYear, setSelectedBudgetYear, optionsAnnees,
    listeMoisDisponibles, selectedBudgetMonth, setSelectedBudgetMonth,
    editingBudget, setEditingBudget, handleUpdateBudget, confirmDelete2,
    filters, comptes, setFilters, selectedCompte, setSelectedCompte, availablePeriods, moisListe,
    statsFiltrées,
    isApprendreActive, setIsApprendreActive,
    showLearningList, setShowLearningList,
    fetchMemoire, elementsAppris, handleDeleteMemory,
    newTx, setNewTx, selectedDate, setSelectedDate, submitQuickTransaction,
    transactionsFiltrees, selectedIds, toggleAll, toggleSelect, updateCell,
    allocations,searchTerm,
    // 💡 Récupération de votre composant CustomSelect
    CustomSelect
  } = props;

  // États locaux spécifiques au mobile
  const [activeSection, setActiveSection] = useState('transactions'); // 'transactions' | 'tools' | 'budgets'
  const [showFilters, setShowFilters] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null); // Transaction en cours d'édition mobile

  // Gérer l'ouverture du volet d'édition mobile d'une transaction
  const openEditTx = (tx) => {
    setEditingTransaction({ ...tx });
  };

  // Enregistrer les modifications depuis la modale mobile
  const handleSaveMobileTx = async () => {
    if (!editingTransaction) return;
    
    // On met à jour les champs modifiés
    await updateCell(editingTransaction.id, 'nom', editingTransaction.nom);
    await updateCell(editingTransaction.id, 'montant', parseFloat(editingTransaction.montant));
    await updateCell(editingTransaction.id, 'compte', editingTransaction.compte);
    await updateCell(editingTransaction.id, 'categorie', editingTransaction.categorie);
    await updateCell(editingTransaction.id, 'mois', editingTransaction.mois);
    await updateCell(editingTransaction.id, 'enveloppe', editingTransaction.enveloppe);
    
    setEditingTransaction(null);
  };

  // Formater proprement la date sur mobile de manière sécurisée
  const getFormattedDate = (t) => {
    if (t.date) {
      try {
        const d = new Date(t.date);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
      } catch (e) {
        // ignore
      }
      return t.date;
    }
    if (t.jour) {
      return `${t.jour} ${t.mois || ''}`.trim().toUpperCase();
    }
    return (t.mois || 'À DÉFINIR').toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
      
      {/* 1. ZONE DE NOTIFICATION GLOBALE */}
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

      {/* 2. EN-TÊTE MOBILE COMPACT */}
      <div className="flex items-center justify-between mb-4 mt-2">
        <div>
          <h1 className="text-xl font-black tracking-tight">Historique</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">Gestion des flux</p>
        </div>
        
        {/* Bouton d'accès rapide aux filtres */}
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
            showFilters || selectedCompte !== 'tous' 
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
              : 'bg-[var(--glass-bg)] border-white/10 text-white/60'
          }`}
        >
          <Filter size={14} />
          <span className="text-[10px] font-bold uppercase">Filtres</span>
        </button>
      </div>

      {/* 3. RECAP MENSUEL RAPIDE */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl">
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

      {/* 4. TIROIR DES FILTRES MOBILE AVEC SÉLECTEURS PERSONNALISÉS */}
      {showFilters && (
        <div className="mb-4 bg-[#121214] border border-[var(--primary)]/30 rounded-2xl p-4 space-y-3.5 animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--primary)]">Ajuster la vue</span>
            <button onClick={() => setShowFilters(false)} className="text-white/40"><X size={14} /></button>
          </div>
          
          <div className="space-y-4">
            {/* Profil cible */}
            <CustomSelect 
              label="Profil cible"
              value={filters.profil}
              icon={User}
              options={['Tous', ...new Set(comptes.map(c => c.groupe))].map(p => ({ v: p, l: p }))}
              onChange={(val) => setFilters(f => ({ ...f, profil: val }))}
              className="p-2.5 rounded-xl text-[10px]"
            />

            {/* Compte bancaire */}
            <CustomSelect 
              label="Compte bancaire"
              value={selectedCompte}
              icon={Search}
              options={[
                { v: 'tous', l: 'Tous les comptes' },
                ...props.soldesTries.map(s => ({ v: s.compte, l: s.compte }))
              ]}
              onChange={(val) => setSelectedCompte(val)}
              className="p-2.5 rounded-xl text-[10px]"
            />

            <div className="grid grid-cols-2 gap-3">
              {/* Mois */}
              <CustomSelect 
                label="Mois"
                value={filters.mois}
                icon={Calendar}
                options={moisListe}
                onChange={(val) => setFilters(f => ({ ...f, mois: val }))}
                className="p-2.5 rounded-xl text-[10px]"
              />

              {/* Année */}
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
        </div>
      )}

      {/* 5. COMMUTATEUR D'ONGLETS DE FONCTIONNALITÉS MOBILE */}
      <div className="flex border-b border-white/5 mb-4 select-none">
        <button 
          onClick={() => setActiveSection('transactions')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSection === 'transactions' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Flux ({transactionsFiltrees.length})
        </button>
        <button 
          onClick={() => setActiveSection('tools')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSection === 'tools' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Catégories / Saisie
        </button>
        <button 
          onClick={() => setActiveSection('budgets')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            activeSection === 'budgets' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Budgets ({budgets.length})
        </button>
      </div>

      {/* =========================================================================
          ONGLET 1 : LES TRANSACTIONS
          ========================================================================= */}
      {activeSection === 'transactions' && (
        <div className="space-y-3 flex-1 animate-in fade-in duration-200">
          {/* Barre de Recherche Dynamique */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="RECHERCHER DANS L'HISTORIQUE..."
              className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-xl py-2.5 pl-9 pr-8 text-xs font-medium text-white outline-none placeholder:text-white/20 tracking-wider"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
                <X size={12} />
              </button>
            )}
          </div>

          {/* INDICATEUR D'ACTION TACTILE DISCRET */}
          <div className="flex items-center gap-2 px-1 py-1 bg-[var(--primary)]/5 border border-[var(--primary)]/10 rounded-xl animate-pulse">
            <span className="text-[11px] pl-1">💡</span>
            <span className="text-[9px] font-black text-indigo-300/80 uppercase tracking-wider">
              Touchez une transaction pour la modifier rapidement
            </span>
          </div>

          {/* Liste des transactions */}
          <div className="space-y-2 mt-2">
            {transactionsFiltrees.length > 0 ? (
              transactionsFiltrees.map((t) => {
                const estVirement = t.categorie && t.categorie.includes("🔄 Virement");
                const estRevenu = parseFloat(t.montant) > 0;
                
                return (
                  <div 
                    key={t.id} 
                    onClick={() => openEditTx(t)}
                    className="p-3 bg-[var(--glass-bg)] border border-white/5 active:bg-white/5 rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Badge indicateur de type */}
                      <div className={`w-2.5 h-10 rounded-full shrink-0 ${
                        estVirement ? 'bg-[var(--primary)]/40' : estRevenu ? 'bg-emerald-500/40' : 'bg-rose-500/40'
                      }`} />
                      
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate pr-2">{t.nom || "Sans libellé"}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono uppercase">
                            {t.compte}
                          </span>
                          <span className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)]/80 px-1.5 py-0.5 rounded font-black max-w-[90px] truncate">
                            {t.categorie || "❓ Autre"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bloc montant + Date + Indicateur d'édition */}
                    <div className="text-right shrink-0 ml-2 flex items-center gap-2.5">
                      <div>
                        <span className={`text-xs font-mono font-black ${
                          estVirement ? 'text-[var(--primary)]' : estRevenu ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {estRevenu && !estVirement ? '+' : ''}
                          {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                        </span>
                        
                        <p className="text-[8.5px] text-white/40 font-black tracking-tight mt-1">
                          {getFormattedDate(t)}
                        </p>
                      </div>
                      
                      {/* Petit badge d'édition tactile discret */}
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

      {/* =========================================================================
          ONGLET 2 : OUTILS
          ========================================================================= */}
      {props.activeTab === 'gerer' && activeSection === 'tools' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* SAISIE EXPRESS AVEC SELECTEURS PERSONNALISÉS */}
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
                    type="number" 
                    id="quick-montant-mobile"
                    placeholder="0.00" 
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-3 pr-6 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                  <span className="absolute right-3 top-[65%] -translate-y-1/2 text-[10px] text-white/30 font-bold">€</span>
                </div>
                
                {/* CustomSelect Compte */}
                <CustomSelect 
                  value={newTx.compte}
                  options={props.soldesTries.map(s => ({ v: s.compte, l: s.compte }))}
                  onChange={(val) => setNewTx({...newTx, compte: val})}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                {/* CustomSelect Catégorie */}
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
                  const label = document.getElementById('quick-nom-mobile').value;
                  const amt = document.getElementById('quick-montant-mobile').value;
                  if (label && amt) {
                    document.getElementById('quick-nom').value = label;
                    document.getElementById('quick-montant').value = amt;
                    submitQuickTransaction();
                    document.getElementById('quick-nom-mobile').value = '';
                    document.getElementById('quick-montant-mobile').value = '';
                  }
                }}
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-2 shadow-lg"
              >
                Valider et Enregistrer
              </button>
            </div>
          </div>

          {/* CREER UNE CATEGORIE */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <h3 className="text-[10px] font-black uppercase text-white/60 tracking-widest mb-3">
              Créer une Catégorie
            </h3>
            <div className="flex gap-2">
              <input 
                type="text" 
                id="catInputMobile"
                placeholder="Intitulé de la catégorie..." 
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
              />
              <button 
                onClick={() => {
                  const input = document.getElementById('catInputMobile');
                  if(input.value.trim()) {
                    addCategory(`🏷️ ${input.value.trim()}`);
                    input.value = '';
                  }
                }}
                className="bg-[var(--primary)] px-4 py-2 rounded-xl text-xs font-black"
              >
                Créer
              </button>
            </div>
          </div>

          {/* VISIBILITE DES CATEGORIES */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-black uppercase text-white/60 tracking-widest">
                Activer / Masquer les Catégories
              </h3>
              <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-black">
                {toutesLesCategories.length - masquees.length} Actives
              </span>
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {[...toutesLesCategories]
                .sort((a,b) => a.localeCompare(b))
                .map(cat => {
                  const estMasquee = masquees.includes(cat);
                  const estPerso = categoriesPerso.includes(cat);
                  
                  return (
                    <div key={cat} className="flex items-center justify-between p-2 bg-black/20 rounded-xl">
                      <span className={`text-xs font-bold ${estMasquee ? 'text-white/20 line-through' : 'text-white/70'}`}>
                        {cat}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => toggleVisibility(cat)}
                          className={`p-1.5 rounded-lg ${estMasquee ? 'text-rose-400' : 'text-white/40 hover:text-white'}`}
                        >
                          {estMasquee ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        {estPerso && (
                          <button onClick={() => removeCategory(cat)} className="p-1.5 rounded-lg text-rose-500/70">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          ONGLET 3 : BUDGETS
          ========================================================================= */}
      {activeSection === 'budgets' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* DEFINIR UN BUDGET AVEC SELECTEURS PERSONNALISÉS */}
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
                    ...props.soldesTries.map(s => ({ v: s.compte, l: s.compte }))
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
                    type="number"
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
                className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-1"
              >
                Fixer Objectif
              </button>
            </div>
          </div>

          {/* LISTE ET PROGRESSION DES BUDGETS */}
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
                <div key={b.id} className="p-3 bg-[var(--glass-bg)] border border-white/5 rounded-2xl">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-black text-white">{b.nom}</p>
                      <span className="text-[8px] uppercase font-bold text-white/30 tracking-tight">
                        {b.compte} • {b.mois}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono font-black ${estDepasse ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {depenseReelle.toFixed(0)}€<span className="text-white/20 mx-0.5">/</span>{b.somme}€
                      </span>
                    </div>
                  </div>
                  
                  {/* Barre de Progression */}
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

      {/* =========================================================================
          MODALE DE MODIFICATION RAPIDE DE TRANSACTION AVEC SELECTEURS PERSONNALISÉS
          ========================================================================= */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full bg-[#121214] border-t border-white/10 rounded-t-[2rem] p-6 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header d'édition */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest">Éditer la transaction</h4>
                <p className="text-[9px] text-white/30 uppercase font-black">Modification express sur mobile</p>
              </div>
              <button 
                onClick={() => setEditingTransaction(null)} 
                className="p-1.5 bg-white/5 rounded-xl text-white/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inputs de modification avec CustomSelect */}
            <div className="space-y-4">
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTransaction.nom || editingTransaction.libelle || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, nom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none animate-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    value={editingTransaction.montant}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, montant: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
                
                {/* CustomSelect Compte */}
                <CustomSelect 
                  label="Compte associé"
                  value={editingTransaction.compte}
                  options={props.soldesTries.map(s => ({ v: s.compte, l: s.compte }))}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, compte: val })}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                {/* CustomSelect Catégorie */}
                <CustomSelect 
                  label="Catégorie"
                  value={editingTransaction.categorie || "❓ Autre"}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, categorie: val })}
                  icon={Tag}
                  className="p-2.5 rounded-xl text-[10px]"
                />
                
                {/* CustomSelect Mois affecté */}
                <CustomSelect 
                  label="Mois affecté"
                  value={editingTransaction.mois || "À définir"}
                  options={moisListe}
                  onChange={(val) => setEditingTransaction({ ...editingTransaction, mois: val })}
                  icon={Calendar}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>

              {/* CustomSelect Enveloppe d'épargne */}
              <CustomSelect 
                label="Enveloppe d'épargne"
                value={editingTransaction.enveloppe || ""}
                options={[
                  { v: "", l: "📦 Aucune enveloppe" },
                  ...Array.from(new Set(allocations.map(a => a.projet))).map(p => ({ v: p, l: `💰 ${p}` }))
                ]}
                onChange={(val) => setEditingTransaction({ ...editingTransaction, enveloppe: val })}
                icon={Wallet}
                className="p-2.5 rounded-xl text-[10px]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-3">
              <button 
                onClick={() => setEditingTransaction(null)}
                className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveMobileTx}
                className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}