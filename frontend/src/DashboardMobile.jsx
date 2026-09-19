import React, { useState } from 'react';
import { 
  DndContext, closestCenter 
} from '@dnd-kit/core';
import { 
  SortableContext, verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { 
  Search, X, List, PieChart as PieChartIcon, 
  CalendarDays, Sparkles, Trophy 
} from 'lucide-react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CategoryIcon, getCleanCategoryName } from './categoryIcons';

export default function DashboardMobile(props) {
  const {
    filters, setFilters, comptes, moisListe, availablePeriods, userTheme,
    soldeGlobal, soldesTries, sensors, handleDragEnd, SortableAccountCard,
    tabActive, setTabActive, TAB_CONFIG, financeData, searchTerm, setSearchTerm,
    statsCategories, chartData, hiddenCategories, toggleCategory, CategoriesView,
    VariationsView, FlashInsightsView, TransactionCard,
    budgetGauges, carouselRef, handleScroll,
    annualTab, setAnnualTab, recapAnnuelStats, statsAnnuellesCategories,
    CalendarSection, WrappedSection, toutesLesTransactions, comptesDuProfil,
    totalTab, setTotalTab, estPeriode, donneesAffichees,
    activeRightTab, setActiveRightTab, objectifAnnuelGlobal, epargneCumuleeAnnuelle, pourcentageAnnuel,
    visibleAnnuel, setVisibleAnnuel, hiddenComptes, setHiddenComptes, GestionEpargneProjet,
    allocations, setAllocations, projets, setProjets, user, api, fetchAllocations,
    categoriesVisibles, updateCell,
    AnnualCategoriesChart, generateGradientStep
  } = props;

  const [mobileHub, setMobileHub] = useState('flux'); // 'flux' | 'annual' | 'graphs'
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSortingAccounts, setIsSortingAccounts] = useState(false);

  const handleSaveMobileTx = async () => {
    if (!editingTransaction || !updateCell) return;
    await updateCell(editingTransaction.id, 'nom', editingTransaction.nom);
    await updateCell(editingTransaction.id, 'montant', parseFloat(editingTransaction.montant));
    await updateCell(editingTransaction.id, 'categorie', editingTransaction.categorie);
    await updateCell(editingTransaction.id, 'compte', editingTransaction.compte);
    setEditingTransaction(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-3 pt-1 select-none">

      {/* 1. EN-TÊTE MOBILE */}
      <div className="flex items-center justify-between mb-2 mt-1 px-1">
        <div>
          <h1 className="text-lg font-black tracking-tight leading-none">Dashboard</h1>
          <p className="text-[var(--text-main)]/40 text-[8px] font-bold uppercase tracking-wider mt-0.5">Récaps & graphiques</p>
        </div>
      </div>
      
      {/* 2. FILTRES D'AFFICHAGE */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-2.5 rounded-xl mb-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          {/* Profils scrollables */}
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 bg-black/30 p-0.5 rounded-lg min-w-0">
            {(() => {
              const groupes = [...new Set((comptes || []).map(c => c.groupe).filter(Boolean))].sort();
              const liste = groupes.length > 0 ? groupes : [user ? user.charAt(0).toUpperCase() + user.slice(1) : 'Personnel'];

              return liste.map(p => {
                const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
                return (
                  <button
                    key={p}
                    onClick={() => setFilters({...filters, profil: p})}
                    className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    {p}
                  </button>
                );
              });
            })()}
          </div>

          {/* Années */}
          <div className="flex bg-black/30 p-0.5 rounded-lg shrink-0">
            {[...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(year => (
                <button
                  key={year}
                  onClick={() => setFilters({...filters, annee: year.toString()})}
                  className={`px-2 py-0.5 rounded text-[8px] font-black transition-all ${
                    filters.annee?.toString() === year.toString() ? 'bg-emerald-500 text-white' : 'text-white/40'
                  }`}
                >
                  {year}
                </button>
              ))}
          </div>
        </div>

        {/* Mois */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 select-none">
          {moisListe.map(m => {
            const hasData = availablePeriods.some(p => 
              p.mois === m.v && p.annee.toString() === filters.annee?.toString()
            );
            if (!hasData) return null;
            return (
              <button
                key={m.v}
                onClick={() => setFilters({...filters, mois: m.v})}
                className={`px-2.5 py-1 rounded-md text-[8px] font-black shrink-0 transition-all border ${
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

      {/* 3. BARRE D'ONGLETS */}
      <div className="flex border-b border-white/5 mb-3 select-none shrink-0">
        <button 
          onClick={() => setMobileHub('flux')}
          className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileHub === 'flux' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Flux & Comptes
        </button>
        <button 
          onClick={() => setMobileHub('annual')}
          className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileHub === 'annual' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Bilan Annuel
        </button>
        <button 
          onClick={() => setMobileHub('graphs')}
          className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 ${
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
        <div className="space-y-3 animate-in fade-in duration-200">
          
          {/* CARTE PATRIMOINE */}
          <div 
            className="rounded-xl p-3 text-white shadow-lg flex items-center justify-between transition-all"
            style={{ 
              background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
            }}
          >
            <div>
              <p className="text-white/60 text-[7px] font-black uppercase tracking-widest leading-none mb-1">Patrimoine</p>
              <h2 className="text-lg font-black tracking-tighter leading-none">
                {soldeGlobal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </h2>
            </div>
            <span className="text-[8.5px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
              {filters.profil}
            </span>
          </div>

          {/* COMPTES BANCAIRES */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[8.5px] font-black uppercase text-white/40 tracking-widest">
                Mes Comptes ({soldesTries.length})
              </span>
              <button 
                onClick={() => setIsSortingAccounts(!isSortingAccounts)}
                className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase transition-all flex items-center gap-1 ${
                  isSortingAccounts 
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                    : 'bg-white/5 border-white/10 text-white/50'
                }`}
              >
                {isSortingAccounts ? 'Valider ✓' : 'Réorganiser ⇅'}
              </button>
            </div>

            {isSortingAccounts ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={soldesTries.map(c => c.compte)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-1.5 p-1.5 bg-black/20 rounded-xl border border-white/5">
                    {soldesTries.map(c => (
                      <div key={c.compte} className="w-full">
                        <SortableAccountCard c={c} isSorting={true} />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex gap-2 pb-1.5 overflow-x-auto no-scrollbar select-none">
                {soldesTries.map(c => (
                  <div key={c.compte} className="min-w-[140px] shrink-0">
                    <SortableAccountCard c={c} isSorting={false} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* JOURNAL DES FLUX */}
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <span className="text-[9px] font-black uppercase tracking-wider text-white/70">Flux mensuel</span>
              
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
                      className={`p-1 rounded transition-all ${
                        isActive ? 'bg-[var(--glass-bg)] text-white border border-white/5' : 'text-white/30'
                      }`}
                    >
                      <IconComponent size={11} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RECHERCHE */}
            <div className="relative">
              <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                placeholder="Filtrer les flux..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-7 py-1.5 text-[10.5px] font-medium text-white placeholder:text-white/20 focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40">
                  <X size={11} />
                </button>
              )}
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto pr-0.5 custom-scrollbar">
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
                    <div className="h-96 w-full pb-2 animate-in fade-in duration-200">
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
                        className="active:bg-white/5 rounded-lg transition-all cursor-pointer"
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
                  <p className="text-[9px] text-center text-white/30 uppercase font-bold py-4">Aucun flux trouvé</p>
                );
              })()}
            </div>
          </div>

          {/* OBJECTIFS BUDGÉTAIRES */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-xl space-y-2">
            <span className="text-[8.5px] font-black uppercase text-white/40 tracking-widest block">
              Suivi des Budgets
            </span>

            {budgetGauges.length > 0 ? (
              <div className="relative w-full">
                <div 
                  ref={carouselRef}
                  onScroll={handleScroll}
                  className="flex flex-row gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {budgetGauges.map((bg, i) => {
                    const radius = 24;
                    const circumference = Math.PI * radius;
                    const strokeDashoffset = circumference - (Math.min(bg.pourcentage, 100) / 100) * circumference;

                    return (
                      <div 
                        key={i} 
                        className="flex flex-col items-center min-w-[72px] max-w-[72px] shrink-0 snap-start bg-black/25 p-2 rounded-xl border border-white/5"
                      >
                        <div className="relative w-[64px] h-[32px] flex items-center justify-center">
                          <svg width="64" height="32" viewBox="0 0 64 32" className="absolute top-0 left-0">
                            <path d="M 8,32 A 24,24 0 0 1 56,32" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                            <path
                              d="M 8,32 A 24,24 0 0 1 56,32"
                              fill="none"
                              stroke={bg.depasse ? '#fb7185' : '#34d399'}
                              strokeWidth="4"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                              strokeLinecap="round"
                              className="transition-all duration-700 ease-out"
                            />
                          </svg>

                          <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                            <CategoryIcon name={bg.nom} size={9} />
                          </div>
                        </div>

                        <div className="text-center mt-2 w-full">
                          <p className="text-[7.5px] font-black text-white/70 uppercase tracking-tight truncate w-full leading-none">
                            {getCleanCategoryName(bg.nom)}
                          </p>
                          <p className={`text-[9px] font-black mt-0.5 ${bg.depasse ? 'text-rose-400' : 'text-[#34d399]'} leading-none`}>
                            {bg.pourcentage}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-[9px] text-white/20 uppercase font-black text-center py-3">Aucun budget défini</p>
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          SECTION 2 : BILAN ANNUEL
          ========================================================================= */}
      {mobileHub === 'annual' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
              <div>
                <span className="text-[7.5px] font-black text-white/30 uppercase tracking-widest">Bilan de l'année</span>
                <p className="text-[11px] font-black text-emerald-400 mt-0.5">Janvier à Décembre {filters.annee}</p>
              </div>

              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                <button 
                  onClick={() => setAnnualTab('list')}
                  className={`p-1 rounded ${annualTab === 'list' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <List size={11} />
                </button>
                <button 
                  onClick={() => setAnnualTab('chart')}
                  className={`p-1 rounded ${annualTab === 'chart' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <PieChartIcon size={11} />
                </button>
                <button 
                  onClick={() => setAnnualTab('calendar')}
                  className={`p-1 rounded ${annualTab === 'calendar' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <CalendarDays size={11} />
                </button>
                <button 
                  onClick={() => setAnnualTab('wrapped')}
                  className={`p-1 rounded ${annualTab === 'wrapped' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                >
                  <Sparkles size={11} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {annualTab === 'list' && (
                <div className="space-y-1.5 overflow-y-auto max-h-[380px] pr-0.5 custom-scrollbar">
                  {recapAnnuelStats.map((m, i) => (
                    <div key={i} className="p-2.5 bg-black/20 rounded-lg border border-white/5 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center pb-1 border-b border-white/[0.03]">
                        <span className="text-[11px] font-black text-white">{m.nom}</span>
                        <span className="text-[11px] font-mono font-black" style={{ color: userTheme.color_patrimoine }}>
                          {m.soldeTotal !== null ? `${m.soldeTotal.toLocaleString('fr-FR')} €` : (m.soldeProjete !== null ? `${m.soldeProjete.toLocaleString('fr-FR')} €` : '—')}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1 text-center">
                        <div>
                          <p className="text-[6.5px] font-bold text-white/30 uppercase">Revenus</p>
                          <p className="text-[9.5px] font-mono font-black text-emerald-400 mt-0.5">
                            {m.revReel > 0 ? `+${Math.round(m.revReel)}€` : (m.revPrevu > 0 ? `+${Math.round(m.revPrevu)}€` : '—')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[6.5px] font-bold text-white/30 uppercase">Dépenses</p>
                          <p className="text-[9.5px] font-mono font-black text-rose-400 mt-0.5">
                            {m.depReel > 0 ? `-${Math.round(m.depReel)}€` : (m.depPrevu > 0 ? `-${Math.round(m.depPrevu)}€` : '—')}
                          </p>
                        </div>
                        <div>
                          <p className="text-[6.5px] font-bold text-white/30 uppercase">Épargne</p>
                          <span 
                            className="inline-block px-1 rounded text-[8.5px] font-mono font-black mt-0.5"
                            style={{ 
                              backgroundColor: (m.epargneReel ?? m.epargnePrevu) >= 0 ? `${userTheme.color_epargne}15` : `${userTheme.color_depenses}15`,
                              color: (m.epargneReel ?? m.epargnePrevu) >= 0 ? userTheme.color_epargne : userTheme.color_depenses 
                            }}
                          >
                            {(m.epargneReel !== null && m.hasRealData) ? `${m.epargneReel > 0 ? '+' : ''}${Math.round(m.epargneReel)}€` : (m.epargnePrevu !== null ? `${m.epargnePrevu > 0 ? '+' : ''}${Math.round(m.epargnePrevu)}€` : '—')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {annualTab === 'chart' && (
                <div className="h-80 w-full">
                  {AnnualCategoriesChart ? (
                    <AnnualCategoriesChart 
                      data={statsAnnuellesCategories} 
                      userTheme={userTheme} 
                      currentYear={filters.annee}
                      generateGradientStep={generateGradientStep} 
                    />
                  ) : (
                    <p className="text-center text-xs text-white/40 py-6">Graphique indisponible</p>
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
        </div>
      )}

      {/* =========================================================================
          SECTION 3 : GRAPHES & ÉPARGNE (AVEC LES 2 GRAPHIQUES COMPLETS)
          ========================================================================= */}
      {mobileHub === 'graphs' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 w-fit mx-auto select-none">
            <button 
              onClick={() => setActiveRightTab('graphs')}
              className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all ${
                activeRightTab === 'graphs' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
              }`}
            >
              Analytique
            </button>
            <button 
              onClick={() => setActiveRightTab('epargneProjets')}
              className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all ${
                activeRightTab === 'epargneProjets' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
              }`}
            >
              Épargne & Projets
            </button>
          </div>

          {activeRightTab === 'graphs' ? (
            <div className="space-y-3">
              
              {/* JAUGE D'OBJECTIF D'ÉPARGNE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Trophy size={15} className="text-amber-400" />
                    </div>
                    <div>
                      <h4 className="text-white/40 text-[7.5px] font-black uppercase">Objectif d'épargne {filters.annee}</h4>
                      {objectifAnnuelGlobal > 0 ? (
                        <p className="text-white font-black text-xs mt-0.5">
                          {Math.floor(epargneCumuleeAnnuelle).toLocaleString('fr-FR')}€
                          <span className="text-white/20 text-[8px] font-medium ml-1">
                            / {objectifAnnuelGlobal.toLocaleString('fr-FR')}€
                          </span>
                        </p>
                      ) : (
                        <p className="text-white/20 font-black text-[8px] uppercase mt-0.5">Non défini</p>
                      )}
                    </div>
                  </div>

                  {objectifAnnuelGlobal > 0 && (
                    <div className="text-[7.5px] font-black px-1.5 py-0.2 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {pourcentageAnnuel}%
                    </div>
                  )}
                </div>

                {objectifAnnuelGlobal > 0 && (
                  <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mt-2.5">
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

              {/* 🌟 GRAPHIQUE 1 : TENDANCE GLOBALE DES FLUX (RÉEL + POINTILLÉ PRÉVISIONNEL) */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3">
                <h3 className="text-[10px] font-black uppercase text-white/60 mb-2">Tendance Globale des Flux</h3>
                
                <div className="h-52 w-full pb-2">
                  <ResponsiveContainer width="100%" height="110%">
                    <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <defs>
                        {/* Dégradés Revenus */}
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRevProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                        </linearGradient>

                        {/* Dégradés Dépenses */}
                        <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDepProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                        </linearGradient>

                        {/* Dégradés Épargne */}
                        <linearGradient id="colorEp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEpProj" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.1}/>
                          <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      
                      <XAxis 
                        dataKey="nom" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
                        dy={10}
                        tickFormatter={(value) => value ? `${value.substring(0, 3)}.` : ''}
                      />

                      <YAxis 
                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(value) => {
                          if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                          if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                          return `${value}€`;
                        }}
                      />
                      
                      {/* INFOBULLE D'ORIGINE */}
                      <Tooltip 
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                          padding: '12px'
                        }}
                        formatter={(value, name) => {
                          const formattedValue = new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR',
                            minimumFractionDigits: 2 
                          }).format(value);

                          const labelMap = {
                            revenus: 'Revenus',
                            depenses: 'Dépenses',
                            epargne: 'Épargne',
                            revenusProjete: 'Revenus (Prévu)',
                            depensesProjete: 'Dépenses (Prévues)',
                            epargneProjete: 'Épargne (Prévue)'
                          };

                          return [formattedValue, labelMap[name] || name];
                        }}
                        itemStyle={{ 
                          fontSize: '12px', 
                          fontWeight: '900', 
                          textTransform: 'uppercase',
                          padding: '2px 0'
                        }}
                        labelStyle={{ 
                          color: 'rgba(255,255,255,0.5)', 
                          fontWeight: 'bold', 
                          marginBottom: '8px',
                          fontSize: '10px',
                          textTransform: 'uppercase'
                        }}
                      />

                      {/* 🌟 LÉGENDE INTERACTIVE RESTAURÉE */}
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        content={() => (
                          <div className="flex justify-end gap-6 mb-4">
                            {[
                              { key: 'revenus', label: 'Revenus', color: userTheme.color_revenus || "#10b981" },
                              { key: 'depenses', label: 'Dépenses', color: userTheme.color_depenses || "#f43f5e" },
                              { key: 'epargne', label: 'Épargne', color: userTheme.color_epargne || "#ffffff" }
                            ].map((item) => {
                              const isVisible = visibleAnnuel[item.key] !== false;
                              return (
                                <div 
                                  key={`item-${item.key}`} 
                                  className="flex items-center gap-2 cursor-pointer select-none transition-opacity duration-200"
                                  style={{ opacity: isVisible ? 1 : 0.3 }}
                                  onClick={() => setVisibleAnnuel(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: item.color }} 
                                  />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />

                      {/* 1. REVENUS (Ligne pleine jusqu'à M-1 + Pointillés reliés) */}
                      <Area 
                        type="monotone" 
                        dataKey="revenus" 
                        name="revenus"
                        hide={!visibleAnnuel.revenus}
                        stroke={userTheme.color_revenus || "#10b981"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRev)"
                        connectNulls={false}
                        dot={{ r: 3, fill: userTheme.color_revenus || '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenusProjete" 
                        name="revenusProjete"
                        legendType="none"
                        hide={!visibleAnnuel.revenus}
                        stroke={userTheme.color_revenus || "#10b981"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevProj)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_revenus || '#10b981' }}
                      />

                      {/* 2. DÉPENSES (Ligne pleine jusqu'à M-1 + Pointillés reliés) */}
                      <Area 
                        type="monotone" 
                        dataKey="depenses" 
                        name="depenses"
                        hide={!visibleAnnuel.depenses}
                        stroke={userTheme.color_depenses || "#f43f5e"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorDep)"
                        connectNulls={false}
                        dot={{ r: 3, fill: userTheme.color_depenses || '#f43f5e', strokeWidth: 1, stroke: '#ffffff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="depensesProjete" 
                        name="depensesProjete"
                        legendType="none"
                        hide={!visibleAnnuel.depenses}
                        stroke={userTheme.color_depenses || "#f43f5e"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDepProj)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_depenses || '#f43f5e' }}
                      />

                      {/* 3. ÉPARGNE (Ligne pleine jusqu'à M-1 + Pointillés reliés) */}
                      <Area 
                        type="monotone" 
                        dataKey="epargne" 
                        name="epargne"
                        hide={!visibleAnnuel.epargne}
                        stroke={userTheme.color_epargne || "#ffffff"} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorEp)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff', strokeWidth: 1, stroke: '#ffffff' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="epargneProjete" 
                        name="epargneProjete"
                        legendType="none"
                        hide={!visibleAnnuel.epargne}
                        stroke={userTheme.color_epargne || "#ffffff"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEpProj)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 🌟 GRAPHIQUE 2 : ÉVOLUTION DÉTAILLÉE DES COMPTES & PATRIMOINE TOTAL */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3">
                <h3 className="text-[10px] font-black uppercase text-white/60 mb-2">Évolution des Comptes & Patrimoine</h3>
                
                <div className="h-52 w-full pb-2">
                <ResponsiveContainer width="100%" height="120%">
                  <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    
                    <XAxis 
                      dataKey="nom" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 11}} 
                      tickFormatter={(value) => value ? `${value.substring(0, 3)}.` : ''} 
                    />
                    
                    <YAxis 
                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                      tickFormatter={(value) => {
                        if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                        if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                        return `${value}€`;
                      }}
                    />
                    
                    <defs>
                      {comptesDuProfil?.map((compte, index) => (
                        <React.Fragment key={`grad-${index}`}>
                          <linearGradient id={`colorGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id={`colorGradProj-${index}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                          </linearGradient>
                        </React.Fragment>
                      ))}
                    </defs>

                    {/* 🌟 INFOBULLE D'ORIGINE DÉDOUBLONNÉE */}
                    <Tooltip 
                      itemSorter={(item) => -item.value}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const seen = new Set();
                          const filteredList = payload.filter(entry => {
                            const baseName = entry.name.replace('PROJ_', '').replace(' (Prévu)', '');
                            if (seen.has(baseName)) return false;
                            seen.add(baseName);
                            return true;
                          });

                          return (
                            <div className="bg-slate-900/95 backdrop-blur-[var(--glass-blur)] p-4 rounded-xl border border-white/10 shadow-2xl">
                              <p className="text-[var(--text-main)]/50 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
                              <div className="flex flex-col gap-2">
                                {filteredList.map((entry, index) => {
                                  const isProj = entry.dataKey.startsWith('PROJ_') || entry.dataKey === 'soldeProjete';
                                  const displayName = entry.name.replace('PROJ_', '');
                                  return (
                                    <div key={index} className="flex items-center justify-between gap-8">
                                      <div className="flex items-center gap-2">
                                        <div 
                                          className="w-2 h-2 rounded-full" 
                                          style={{ backgroundColor: entry.color }} 
                                        />
                                        <span className="text-[var(--text-main)]/70 text-xs uppercase font-medium">
                                          {displayName} {isProj ? '(Prévu)' : ''}
                                        </span>
                                      </div>
                                      <span className="text-[var(--text-main)] font-bold text-xs">
                                        {new Intl.NumberFormat('fr-FR', { 
                                          style: 'currency', 
                                          currency: 'EUR', 
                                          maximumFractionDigits: 2 
                                        }).format(entry.value)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    
                    {/* 🌟 LÉGENDE INTERACTIVE DES COMPTES RESTAURÉE */}
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      content={() => (
                        <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 mb-4">
                          {comptesDuProfil?.map((compte, index) => {
                            const isHidden = !!hiddenComptes[compte.compte];
                            return (
                              <div 
                                key={`item-${index}`} 
                                className="flex items-center gap-2 cursor-pointer select-none transition-opacity duration-200"
                                style={{ opacity: isHidden ? 0.3 : 1 }}
                                onClick={() => setHiddenComptes(prev => ({ ...prev, [compte.compte]: !prev[compte.compte] }))}
                              >
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: compte.couleur || '#64748b' }} 
                                />
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                                  {compte.compte}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    />

                    {/* 1. COURBES PAR COMPTE (Ligne pleine jusqu'à M-1 + Pointillés reliés) */}
                    {comptesDuProfil
                      ?.filter(c => c && c.compte)
                      .sort((a, b) => (b.soldePeriode || 0) - (a.soldePeriode || 0)) 
                      .map((compte, index) => {
                        const nomCle = compte.compte.trim().toUpperCase();
                        const color = compte.couleur || '#64748b';
                        const isHidden = !!hiddenComptes[compte.compte];

                        return (
                          <React.Fragment key={`area-compte-${index}`}>
                            <Area
                              type="monotone"
                              dataKey={nomCle}
                              name={compte.compte}
                              hide={isHidden}
                              stroke={color}
                              fill={`url(#colorGrad-${index})`}
                              fillOpacity={1}
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 3, fill: color, strokeWidth: 1, stroke: '#ffffff' }}
                              isAnimationActive={false}
                            />
                            <Area
                              type="monotone"
                              dataKey={`PROJ_${nomCle}`}
                              name={`${compte.compte} (Prévu)`}
                              legendType="none"
                              hide={isHidden}
                              stroke={color}
                              strokeDasharray="4 4"
                              fill={`url(#colorGradProj-${index})`}
                              fillOpacity={1}
                              strokeWidth={2}
                              connectNulls={false}
                              dot={{ r: 2.5, fill: color }}
                              isAnimationActive={false}
                            />
                          </React.Fragment>
                        );
                      })}

                    {/* 2. PATRIMOINE TOTAL (Ligne blanche jusqu'à M-1) */}
                    <Area
                      type="monotone"
                      dataKey="soldeTotal"
                      stroke="#ffffff"
                      strokeWidth={3}
                      fill="transparent"
                      name="PATRIMOINE TOTAL"
                      hide={!!hiddenComptes["PATRIMOINE TOTAL"]}
                      dot={{ r: 3, fill: '#ffffff', strokeWidth: 1, stroke: '#ffffff' }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />

                    {/* 3. PATRIMOINE TOTAL PROJETÉ (Ligne pointillée reliée à M-1) */}
                    <Area
                      type="monotone"
                      dataKey="soldeProjete"
                      stroke="#38bdf8"
                      strokeDasharray="4 4"
                      strokeWidth={2.5}
                      fill="transparent"
                      name="PATRIMOINE TOTAL (Prévu)"
                      legendType="none"
                      hide={!!hiddenComptes["PATRIMOINE TOTAL"]}
                      dot={{ r: 3, fill: '#38bdf8' }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-2">
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

      {/* MODALE D'ÉDITION MOBILE */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full bg-[#121214] border border-white/10 rounded-2xl p-5 max-h-[85vh] overflow-y-auto space-y-3 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-[11px] font-black uppercase text-[var(--primary)] tracking-widest">Éditer la transaction</h4>
                <p className="text-[8px] text-white/30 uppercase font-black">Modification express</p>
              </div>
              <button 
                onClick={() => setEditingTransaction(null)} 
                className="p-1 bg-white/5 rounded-lg text-white/40"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTransaction.nom || editingTransaction.libelle || ''}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, nom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    value={editingTransaction.montant}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, montant: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Compte</label>
                  <select 
                    value={editingTransaction.compte}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, compte: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                  >
                    {(comptes || []).map(c => (
                      <option key={c.compte} value={c.compte}>{c.compte}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Catégorie</label>
                <select 
                  value={editingTransaction.categorie || "Autre"}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, categorie: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                >
                  {categoriesVisibles?.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  )) || (
                    <option value={editingTransaction.categorie}>{editingTransaction.categorie}</option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                onClick={() => setEditingTransaction(null)}
                className="flex-1 py-2.5 bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-lg"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveMobileTx}
                className="flex-1 py-2.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-500/10"
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