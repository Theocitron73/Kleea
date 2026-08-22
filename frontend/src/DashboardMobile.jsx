import React, { useState, useRef } from 'react';
import { 
  DndContext, closestCenter 
} from '@dnd-kit/core';
import { 
  SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  ChevronLeft, ChevronRight, Search, X, List, PieChart as PieChartIcon, 
  CalendarDays, Sparkles, TrendingUp, Filter, Wallet, Eye, EyeOff 
} from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardMobile(props) {
  const {
    filters, setFilters, comptes, moisListe, availablePeriods, userTheme,
    soldeGlobal, soldesTries, sensors, handleDragEnd, SortableAccountCard,
    tabActive, setTabActive, TAB_CONFIG, financeData, searchTerm, setSearchTerm,
    statsCategories, chartData, hiddenCategories, toggleCategory, CategoriesView,
    VariationsView, FlashInsightsView, TransactionCard,
    budgetGauges, activeIndex, totalDots, navigateCarousel, carouselRef, handleScroll, scrollToPage,
    soldePremierJanvier, annualTab, setAnnualTab, recapAnnuelStats, statsAnnuellesCategories,
    CalendarSection, WrappedSection, toutesLesTransactions, comptesDuProfil,
    totalTab, setTotalTab, estPeriode, moisDebut, setMoisDebut, moisFin, setMoisFin, donneesAffichees,
    activeRightTab, setActiveRightTab, objectifAnnuelGlobal, epargneCumuleeAnnuelle, pourcentageAnnuel,
    visibleAnnuel, setVisibleAnnuel, hiddenComptes, setHiddenComptes, GestionEpargneProjet,
    allocations, setAllocations, projets, setProjets, user, api, fetchAllocations,
    categoriesVisibles, updateCell,
    AnnualCategoriesChart,generateGradientStep
  } = props;

  // États locaux de navigation mobile
  const [mobileHub, setMobileHub] = useState('flux'); // 'flux' | 'annual' | 'graphs'
  const [editingTransaction, setEditingTransaction] = useState(null); // Modale d'édition tactile
  const [isSortingAccounts, setIsSortingAccounts] = useState(false); // Mode réorganisation débrayable

  // Gérer la sauvegarde rapide d'une transaction éditée sur mobile
  const handleSaveMobileTx = async () => {
    if (!editingTransaction || !updateCell) return;
    
    await updateCell(editingTransaction.id, 'nom', editingTransaction.nom);
    await updateCell(editingTransaction.id, 'montant', parseFloat(editingTransaction.montant));
    await updateCell(editingTransaction.id, 'categorie', editingTransaction.categorie);
    await updateCell(editingTransaction.id, 'compte', editingTransaction.compte);
    
    setEditingTransaction(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">

      {/* 1. EN-TÊTE MOBILE */}
      <div className="flex items-center justify-between mb-3 mt-2">
        <div>
          <h1 className="text-xl font-black tracking-tight">Dashboard</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">Recaps et graphiques</p>
        </div>
        
        
      </div>
      
      {/* 1. FILTRES D'AFFICHAGE COMPACTS */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl mb-4 space-y-2">
        <div className="flex justify-between items-center gap-2">
          {/* Groupe Profil */}
          <div className="flex bg-black/30 p-0.5 rounded-lg shrink-0">
            {['Tous', ...new Set(comptes.map(c => c.groupe).filter(Boolean))].map(p => {
              const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
              return (
                <button
                  key={p}
                  onClick={() => setFilters({...filters, profil: p})}
                  className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${
                    isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Années */}
          <div className="flex bg-black/30 p-0.5 rounded-lg shrink-0">
            {[...new Set(availablePeriods.map(p => p.annee))]
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(year => (
                <button
                  key={year}
                  onClick={() => setFilters({...filters, annee: year.toString()})}
                  className={`px-2 py-1 rounded text-[9px] font-black transition-all ${
                    filters.annee?.toString() === year.toString() ? 'bg-emerald-500 text-white' : 'text-white/40'
                  }`}
                >
                  {year}
                </button>
              ))}
          </div>
        </div>

        {/* Swipe Horizontal des Mois */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 select-none">
          {moisListe.map(m => {
            const hasData = availablePeriods.some(p => 
              p.mois === m.v && p.annee.toString() === filters.annee?.toString()
            );
            if (!hasData) return null;
            return (
              <button
                key={m.v}
                onClick={() => setFilters({...filters, mois: m.v})}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black shrink-0 transition-all border ${
                  filters.mois === m.v 
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
                    : 'bg-black/10 border-transparent text-white/30'
                }`}
              >
                {m.l.substring(0, 3).toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BARRE D'ONGLETS PRINCIPAUX DU DASHBOARD */}
      <div className="flex border-b border-white/5 mb-4 select-none shrink-0">
        <button 
          onClick={() => setMobileHub('flux')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileHub === 'flux' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Flux & Comptes
        </button>
        <button 
          onClick={() => setMobileHub('annual')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileHub === 'annual' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Bilan Annuel
        </button>
        <button 
          onClick={() => setMobileHub('graphs')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileHub === 'graphs' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Graphes & Épargne
        </button>
      </div>

      {/* =========================================================================
          SECTION 1 : FLUX & COMPTES
          ========================================================================= */}
      {mobileHub === 'flux' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* CARTE PATRIMOINE ESTIMÉ */}
          <div 
            className="rounded-2xl p-4 text-white shadow-xl flex items-center justify-between transition-all"
            style={{ 
              background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
            }}
          >
            <div>
              <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-0.5">Patrimoine</p>
              <h2 className="text-xl font-black tracking-tighter leading-none">
                {soldeGlobal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </h2>
            </div>
            <span className="text-[10px] uppercase font-black tracking-wider bg-white/20 px-2 py-1 rounded-lg">
              {filters.profil}
            </span>
          </div>

          {/* DRAG AND DROP DES COMPTES BANCAIRES AVEC MODE TRIPTIQUE DÉBRAYABLE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">
                Mes Comptes ({soldesTries.length})
              </span>
              <button 
                onClick={() => setIsSortingAccounts(!isSortingAccounts)}
                className={`px-3 py-1 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center gap-1.5 ${
                  isSortingAccounts 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {isSortingAccounts ? 'Valider ✓' : 'Réorganiser ⇅'}
              </button>
            </div>

            {isSortingAccounts ? (
              /* Mode réorganisation : Tri vertical sans interférences de défilement */
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={soldesTries.map(c => c.compte)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-2 p-2 bg-black/20 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-[8px] font-black text-amber-400/80 uppercase text-center py-1 bg-amber-500/5 rounded-lg border border-amber-500/10">
                      ⇅ Glissez verticalement les cartes de comptes pour trier
                    </p>
                    {soldesTries.map(c => (
                      <div key={c.compte} className="w-full">
                        {/* 💡 On force l'interception tactile 'none' */}
                        <SortableAccountCard c={c} isSorting={true} />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              /* Mode lecture fluide : Swipe latéral 100% stable */
              <div className="flex gap-3 pb-2 overflow-x-auto no-scrollbar select-none">
                {soldesTries.map(c => (
                  <div key={c.compte} className="min-w-[155px] shrink-0">
                    {/* 💡 On libère l'interception tactile 'auto' pour un défilement libre */}
                    <SortableAccountCard c={c} isSorting={false} />
                  </div>
                ))}
              </div>
            )}
          </div>

{/* JOURNAL & RECHERCHE DES FLUX */}
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[10px] font-black uppercase tracking-wider">Flux mensuel</span>
              
              {/* TABS JOURNAL MOBILE */}
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5">
                {Object.keys(TAB_CONFIG).map((tab) => {
                  const config = TAB_CONFIG[tab];
                  const IconComponent = config.icon;
                  const isActive = tabActive === tab;

                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setTabActive(tab);
                        setSearchTerm('');
                      }}
                      className={`p-1.5 rounded-md transition-all ${
                        isActive ? 'bg-[var(--glass-bg)] text-white border border-white/5' : 'text-white/30'
                      }`}
                    >
                      <IconComponent size={12} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BARRE DE RECHERCHE COMPACTE */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Filtrer les flux..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* RENDU CONTENU DU JOURNAL MOBILE */}
            <div className="space-y-1.5 max-h-110 overflow-y-auto pr-1">
              {(() => {
                const rawTransactions = [...(financeData.journal[tabActive === 'Catégories' ? 'depenses' : tabActive] || [])];
                
                const filteredTransactions = rawTransactions.filter(t => {
                  if (!searchTerm.trim()) return true;
                  const term = searchTerm.toLowerCase().trim();
                  const nom = (t.nom || t.libelle || t.description || '').toLowerCase();
                  const category = (t.categorie || t.category || '').toLowerCase();
                  return nom.includes(term) || category.includes(term);
                });

                if (tabActive === 'Catégories') {
                  return (
                    /* 💡 CORRECTION : Ajout d'une hauteur explicite (h-80) et d'un comportement d'affichage 
                       pour que le graphique en barre horizontal s'initialise et s'affiche correctement */
                    <div className="h-130 w-full pb-4 animate-in fade-in duration-200">
                      <CategoriesView 
                        statsCategories={statsCategories}
                        chartData={chartData}
                        hiddenCategories={hiddenCategories}
                        toggleCategory={toggleCategory}
                        userTheme={userTheme}
                      />
                    </div>
                  );
                }

                if (tabActive === 'Variations') {
                  return (
                    <VariationsView 
                      statsCategories={statsCategories} 
                      userTheme={userTheme}
                      prevMonthLabel={financeData?.periodeComparee?.mois || "M-1"}
                    />
                  );
                }

                if (tabActive === 'flash') {
                  return (
                    <FlashInsightsView 
                      statsCategories={statsCategories} 
                      transactions={financeData?.journal?.depenses || []} 
                      user={user}
                      filters={filters}
                    />
                  );
                }

                return filteredTransactions.length > 0 ? (
                  filteredTransactions
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((t, i) => (
                      <div 
                        key={t.id || i}
                        onClick={() => updateCell && setEditingTransaction(t)}
                        className="active:bg-white/5 rounded-xl transition-all font-bold cursor-pointer"
                      >
                        <TransactionCard 
                          t={t} 
                          color={
                            tabActive === 'revenus' ? (userTheme?.color_revenus || '#10b981') : 
                            tabActive === 'depenses' ? (userTheme?.color_depenses || '#f43f5e') : 
                            '#6366f1'
                          }
                          bg={
                            tabActive === 'revenus' ? `${userTheme?.color_revenus || '#10b981'}15` : 
                            tabActive === 'depenses' ? `${userTheme?.color_depenses || '#f43f5e'}15` : 
                            'rgba(99, 102, 241, 0.1)'
                          }
                        />
                      </div>
                    ))
                ) : (
                  <p className="text-[10px] text-center text-white/30 uppercase font-bold py-6">Aucun flux trouvé</p>
                );
              })()}
            </div>
          </div>

          {/* OBJECTIFS BUDGÉTAIRES */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl space-y-3">
            <span className="text-[10px] font-black uppercase text-white/40 tracking-widest block">
              Suivi des Budgets
            </span>

            {budgetGauges.length > 0 ? (
              <div className="relative w-full">
                <div 
                  ref={carouselRef}
                  onScroll={handleScroll}
                  className="flex flex-row gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {budgetGauges.map((bg, i) => {
                    const radius = 25;
                    const circumference = Math.PI * radius;
                    const strokeDashoffset = circumference - (Math.min(bg.pourcentage, 100) / 100) * circumference;

                    return (
                      <div 
                        key={i} 
                        className="flex flex-col items-center min-w-[76px] max-w-[76px] shrink-0 snap-start bg-black/20 p-2 rounded-xl border border-white/5"
                      >
                        <div className="relative w-16 h-8">
                          <svg width="64" height="32" viewBox="0 0 64 32" className="absolute top-0 left-1/2 -translate-x-1/2">
                            <path d="M 8,32 A 24,24 0 0 1 56,32" fill="none" stroke="currentColor" strokeWidth="5" className="text-white/5" />
                            <path
                              d="M 8,32 A 24,24 0 0 1 56,32"
                              fill="none"
                              stroke={bg.depasse ? '#fb7185' : '#34d399'}
                              strokeWidth="5"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] font-bold truncate w-12 text-center">
                            {bg.nom.split(' ')[0]}
                          </div>
                        </div>
                        <div className="text-center mt-3 w-full">
                          <p className="text-[7px] text-white/30 uppercase truncate w-full">{bg.nom.split(' ').slice(1).join(' ') || 'Frais'}</p>
                          <p className={`text-[9px] font-black mt-0.5 ${bg.depasse ? 'text-rose-400' : 'text-[#34d399]'}`}>{bg.pourcentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-white/20 uppercase font-black text-center py-4">Aucun budget défini</p>
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          SECTION 2 : BILAN ANNUEL
          ========================================================================= */}
      {mobileHub === 'annual' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Bilan de l'année</span>
                <p className="text-xs font-black text-emerald-400 mt-0.5">Janvier à Décembre {filters.annee}</p>
              </div>

              {/* TABS BILAN ANNUEL MOBILE */}
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                <button 
                  onClick={() => setAnnualTab('list')}
                  className={`p-1.5 rounded-md ${annualTab === 'list' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <List size={12} />
                </button>
                <button 
                  onClick={() => setAnnualTab('chart')}
                  className={`p-1.5 rounded-md ${annualTab === 'chart' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <PieChartIcon size={12} />
                </button>
                <button 
                  onClick={() => setAnnualTab('calendar')}
                  className={`p-1.5 rounded-md ${annualTab === 'calendar' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <CalendarDays size={12} />
                </button>
                <button 
                  onClick={() => setAnnualTab('wrapped')}
                  className={`p-1.5 rounded-md ${annualTab === 'wrapped' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <Sparkles size={12} />
                </button>
              </div>
            </div>

            {/* RENDU DU CONTENU DU BILAN */}
            <div className="space-y-2">
              {annualTab === 'list' && (
                <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                  {recapAnnuelStats.map((m, i) => (
                    <div key={i} className="p-3 bg-black/20 rounded-xl border border-white/5 flex flex-col gap-2">
                      <div className="flex justify-between items-center pb-1.5 border-b border-white/[0.03]">
                        <span className="text-xs font-black text-white">{m.nom}</span>
                        <span className="text-xs font-mono font-black" style={{ color: userTheme.color_patrimoine }}>
                          {m.soldeTotal !== null ? `${m.soldeTotal.toLocaleString('fr-FR')} €` : '—'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                          <p className="text-[7px] font-bold text-white/30 uppercase">Revenus</p>
                          <p className="text-[10px] font-mono font-black text-emerald-400 mt-0.5">
                            {m.revenus > 0 ? `+${Math.round(m.revenus)}€` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold text-white/30 uppercase">Dépenses</p>
                          <p className="text-[10px] font-mono font-black text-rose-400 mt-0.5">
                            {m.depenses > 0 ? `-${Math.round(m.depenses)}€` : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold text-white/30 uppercase">Épargne</p>
                          <span 
                            className="inline-block px-1 rounded text-[9px] font-mono font-black mt-0.5"
                            style={{ 
                              backgroundColor: m.epargne >= 0 ? `${userTheme.color_epargne}15` : `${userTheme.color_depenses}15`,
                              color: m.epargne >= 0 ? userTheme.color_epargne : userTheme.color_depenses 
                            }}
                          >
                            {m.epargne !== null ? `${m.epargne > 0 ? '+' : ''}${Math.round(m.epargne)}€` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {annualTab === 'chart' && (
                <div className="h-100 w-full">
                  {AnnualCategoriesChart ? (
                    <AnnualCategoriesChart 
                      data={statsAnnuellesCategories} 
                      userTheme={userTheme} 
                      currentYear={filters.annee}
                      generateGradientStep={generateGradientStep} 
                    />
                  ) : (
                    <p className="text-center text-xs text-white/40 py-8">Graphique indisponible</p>
                  )}
                </div>
              )}

              {annualTab === 'calendar' && (
                <CalendarSection 
                  toutesLesTransactions={toutesLesTransactions}
                  comptesDuProfil={comptesDuProfil}
                  filters={filters}
                  moisListe={moisListe}
                />
              )}

              {annualTab === 'wrapped' && (
                <WrappedSection 
                  toutesLesTransactions={toutesLesTransactions}
                  comptesDuProfil={comptesDuProfil}
                  filters={filters}
                  moisListe={moisListe}
                />
              )}
            </div>
          </div>

          {/* SYNTHÈSE TOTAUX (PÉRIODE VS ANNUEL) */}
          <div className="p-4 bg-[var(--glass-bg)] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <span className="text-[9px] font-black uppercase text-white/30">Analyse de Période</span>
              <div className="flex bg-black/40 p-0.5 rounded-lg shrink-0">
                <button
                  onClick={() => setTotalTab('annuel')}
                  className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase ${!estPeriode ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  Annuel
                </button>
                <button
                  onClick={() => setTotalTab('periode')}
                  className={`px-2.5 py-0.5 rounded text-[8px] font-black uppercase ${estPeriode ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  Période
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/20 p-2 rounded-xl">
                <p className="text-[7px] font-bold text-white/30 uppercase mb-0.5">Revenus</p>
                <p className="text-sm font-mono font-black" style={{ color: userTheme.color_revenus }}>
                  {donneesAffichees.revenus.toLocaleString('fr-FR')}€
                </p>
              </div>
              <div className="bg-black/20 p-2 rounded-xl">
                <p className="text-[7px] font-bold text-white/30 uppercase mb-0.5">Dépenses</p>
                <p className="text-sm font-mono font-black" style={{ color: userTheme.color_depenses }}>
                  -{donneesAffichees.depenses.toLocaleString('fr-FR')}€
                </p>
              </div>
              <div className="bg-black/20 p-2 rounded-xl">
                <p className="text-[7px] font-bold text-white/30 uppercase mb-0.5">Net Épargné</p>
                <p className="text-sm font-mono font-black" style={{ color: userTheme.color_epargne }}>
                  {donneesAffichees.epargne.toLocaleString('fr-FR')}€
                </p>
              </div>
            </div>

            <div className="space-y-1 mt-1.5">
              <div className="flex justify-between text-[7px] font-black uppercase text-white/30">
                <span>Dépensé</span>
                <span className="text-emerald-400">Épargné ({donneesAffichees.tauxEffort}%)</span>
              </div>
              <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex flex-row border border-white/5">
                <div className="h-full bg-rose-500/50" style={{ width: `${100 - donneesAffichees.tauxEffort}%` }} />
                <div className="h-full bg-emerald-500" style={{ width: `${donneesAffichees.tauxEffort}%` }} />
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          SECTION 3 : GRAPHES & GESTION D'ÉPARGNE PROJETS
          ========================================================================= */}
      {mobileHub === 'graphs' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* SWITCH GRAPHES VS PROJETS */}
          <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto select-none">
            <button 
              onClick={() => setActiveRightTab('graphs')}
              className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                activeRightTab === 'graphs' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
              }`}
            >
              Analytique
            </button>
            <button 
              onClick={() => setActiveRightTab('epargneProjets')}
              className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                activeRightTab === 'epargneProjets' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
              }`}
            >
              Épargne & Projets
            </button>
          </div>

          {activeRightTab === 'graphs' ? (
            <div className="space-y-4">
              
              {/* JAUGE D'ÉPARGNE ANNUELLE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <span className="text-xs">🏆</span>
                    </div>
                    <div>
                      <h4 className="text-white/40 text-[8px] font-black uppercase">Objectif d'épargne</h4>
                      {objectifAnnuelGlobal > 0 ? (
                        <p className="text-white font-black text-sm mt-0.5">
                          {Math.floor(epargneCumuleeAnnuelle).toLocaleString('fr-FR')}€
                          <span className="text-white/20 text-[9px] font-medium ml-1">
                            / {objectifAnnuelGlobal.toLocaleString('fr-FR')}€
                          </span>
                        </p>
                      ) : (
                        <p className="text-white/20 font-black text-[9px] uppercase mt-0.5">Non défini</p>
                      )}
                    </div>
                  </div>

                  {objectifAnnuelGlobal > 0 && (
                    <div className="text-[8px] font-black px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {pourcentageAnnuel}%
                    </div>
                  )}
                </div>

                {objectifAnnuelGlobal > 0 && (
                  <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mt-3">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.min(pourcentageAnnuel, 100)}%`,
                        background: `linear-gradient(90deg, ${userTheme.color_jauge || '#f1c40f'}90, ${userTheme.color_jauge || '#f1c40f'})`,
                      }}
                    />
                  </div>
                )}
              </div>

             {/* GRAPHIQUES RECHARTS : TENDANCE GLOBALE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">Tendance Globale</h3>
                <div className="h-60 w-full pb-2">
                  <ResponsiveContainer width="100%" height="120%">
                    <AreaChart data={recapAnnuelStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mobileColorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="mobileColorDep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.25}/>
                          <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      
                      {/* 💡 CORRECTION : interval={0} rajouté pour forcer l'affichage de novembre et des 12 mois */}
                      <XAxis 
                        dataKey="nom" 
                        axisLine={false} 
                        tickLine={false} 
                        interval={0}
                        tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 8}} 
                        tickFormatter={(value) => value ? `${value.substring(0, 3).toUpperCase()}` : ''} 
                      />
                      
                      <YAxis 
                        hide={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                          return `${value}€`;
                        }}
                      />
                      
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        iconType="circle"
                        iconSize={6}
                        content={({ payload }) => (
                          <div className="flex justify-end gap-3 mb-2">
                            {payload.map((entry, index) => {
                              const key = entry.value; 
                              const isVisible = visibleAnnuel[key] !== false; 
                              return (
                                <div 
                                  key={`item-mobile-${index}`} 
                                  className="flex items-center gap-1 cursor-pointer select-none transition-opacity duration-200"
                                  style={{ opacity: isVisible ? 1 : 0.3 }}
                                  onClick={() => setVisibleAnnuel(prev => ({ ...prev, [key]: !prev[key] }))}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[8px] font-black uppercase tracking-wider text-white/40">
                                    {key === 'revenus' ? 'Revenus' : key === 'depenses' ? 'Dépenses' : 'Épargne'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />

                      {/* 💡 CORRECTION : Infobulle interactive (Tooltip) rajoutée au graphique des flux */}
                      <Tooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 1 }}
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#fff'
                        }}
                        formatter={(value, name) => {
                          const formattedValue = new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR',
                            maximumFractionDigits: 0
                          }).format(value);

                          const labelMap = {
                            revenus: 'Revenus',
                            depenses: 'Dépenses',
                            epargne: 'Épargne'
                          };

                          return [formattedValue, labelMap[name] || name];
                        }}
                      />

                      {/* 💡 CORRECTION : Points de couleur de données (dot et activeDot) ajoutés */}
                      <Area 
                        type="monotone" 
                        dataKey="revenus" 
                        hide={!visibleAnnuel?.revenus}
                        stroke={userTheme.color_revenus || "#10b981"} 
                        strokeWidth={2.5}
                        fill="url(#mobileColorRev)"
                        connectNulls={true}
                        isAnimationActive={false}
                        dot={{ r: 2.5, fill: userTheme.color_revenus || '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 4.5, strokeWidth: 0 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="depenses" 
                        hide={!visibleAnnuel?.depenses}
                        stroke={userTheme.color_depenses || "#f43f5e"} 
                        strokeWidth={2.5}
                        fill="url(#mobileColorDep)"
                        connectNulls={true}
                        isAnimationActive={false}
                        dot={{ r: 2.5, fill: userTheme.color_depenses || '#f43f5e', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 4.5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 📈 GRAPHIQUE ÉVOLUTION DÉTAILLÉE DES COMPTES DU PROFIL */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4">
                <h3 className="text-xs font-bold text-white mb-2">Évolution des Comptes</h3>
                <div className="h-60 w-full pb-2">
                  <ResponsiveContainer width="100%" height="120%">
                    <AreaChart data={recapAnnuelStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      
                      {/* 💡 CORRECTION : Dégradés HSL intégrés dans le bloc defs pour colorer les aires des comptes */}
                      <defs>
                        {comptesDuProfil?.map((compte, index) => (
                          <linearGradient 
                            key={`grad-mobile-${index}`} 
                            id={`colorGrad-mobile-${index}`}
                            x1="0" y1="0" x2="0" y2="1"
                          >
                            <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      
                      {/* 💡 CORRECTION : interval={0} rajouté pour forcer l'affichage de novembre et des 12 mois */}
                      <XAxis 
                        dataKey="nom" 
                        axisLine={false} 
                        tickLine={false} 
                        interval={0}
                        tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 8}} 
                        tickFormatter={(value) => value ? `${value.substring(0, 3).toUpperCase()}` : ''}
                      />
                      
                      <YAxis 
                        hide={false}
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                        tickFormatter={(value) => {
                          if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                          return `${value}€`;
                        }}
                      />
                      
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        content={({ payload }) => (
                          <div className="flex flex-wrap justify-end gap-x-2 gap-y-0.5 mb-2">
                            {payload.map((entry, index) => {
                              const isHidden = !!hiddenComptes[entry.value];
                              return (
                                <div 
                                  key={`item-accounts-mobile-${index}`} 
                                  className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity duration-200"
                                  style={{ opacity: isHidden ? 0.3 : 1 }}
                                  onClick={() => setHiddenComptes(prev => ({ ...prev, [entry.value]: !prev[entry.value] }))}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-[7.5px] font-black uppercase tracking-wider text-white/40">
                                    {entry.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />

                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-slate-900/95 backdrop-blur-sm p-3 rounded-xl border-none shadow-xl text-[10px]">
                                <p className="text-white/50 font-black uppercase mb-1.5">{label}</p>
                                <div className="flex flex-col gap-1">
                                  {payload.map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-white/70 font-medium">{entry.name}</span>
                                      </div>
                                      <span className="text-white font-bold">{entry.value?.toLocaleString('fr-FR')} €</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      {comptesDuProfil
                        ?.filter(c => c && c.compte)
                        .sort((a, b) => (b.solde_periode || 0) - (a.solde_periode || 0)) 
                        .map((compte, index) => {
                          const nomCleData = compte.compte.trim().toUpperCase();
                          const maCouleurBdd = compte.couleur || '#64748b';
                          return (
                            <Area
                              key={`area-compte-mobile-${index}`}
                              type="monotone"
                              dataKey={nomCleData}
                              name={compte.compte}
                              hide={!!hiddenComptes[compte.compte]}
                              stroke={maCouleurBdd}
                              
                              
                              fill={`url(#colorGrad-mobile-${index})`} 
                              fillOpacity={1}
                              strokeWidth={1.5}
                              connectNulls={true}
                              isAnimationActive={false}
                              
                              
                              dot={{ r: 2, fill: maCouleurBdd, strokeWidth: 1, stroke: '#ffffff' }}
                              activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                          );
                        })}
                      <Area
                        type="monotone"
                        dataKey="soldeTotal"
                        stroke="#ffffff"
                        strokeWidth={2}
                        fill="transparent"
                        name="PATRIMOINE TOTAL"
                        hide={!!hiddenComptes["PATRIMOINE TOTAL"]}
                        isAnimationActive={false}
                        dot={{ r: 2.5, fill: '#ffffff', strokeWidth: 1, stroke: '#ffffff' }}
                        activeDot={{ r: 4.5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-2">
              <GestionEpargneProjet
                soldeGlobal={soldeGlobal}
                allocations={allocations}
                setAllocations={setAllocations}
                projets={projets}
                setProjets={setProjets}
                transactions={toutesLesTransactions} 
                epargneCumuleeAnnuelle={epargneCumuleeAnnuelle}
                recapAnnuelStats={recapAnnuelStats}
                filters={filters}
                user={user}
                api={api}
                fetchAllocations={fetchAllocations}
              />
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          MODALE DE MODIFICATION RAPIDE DE TRANSACTION
          ========================================================================= */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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

            {/* Inputs de modification */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTransaction.nom || editingTransaction.libelle || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, nom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    value={editingTransaction.montant}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, montant: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Compte associé</label>
                  <select 
                    value={editingTransaction.compte}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, compte: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  >
                    {comptes.map(c => (
                      <option key={c.compte} value={c.compte}>{c.compte}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Catégorie</label>
                <select 
                  value={editingTransaction.categorie || "❓ Autre"}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, categorie: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                >
                  {categoriesVisibles?.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  )) || (
                    <option value={editingTransaction.categorie}>{editingTransaction.categorie}</option>
                  )}
                </select>
              </div>
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