import ListePrevisions from '../components/ListePrevisions';
import AnalyseCategories from '../components/AnalyseCategories';
import { useState, useMemo } from 'react';
import { Plus, Calendar, Tag, Wallet, Eye, EyeOff, Repeat, PieChart as PieChartIcon, TrendingUp, X, Copy, AlertTriangle } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import DatePicker from 'react-datepicker';
import { 
  ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, 
  Bar, Cell, LabelList 
} from 'recharts';
import { CategoryIcon } from '../categoryIcons';

import ReglesRecurrentes, { ChoixRepetition, optionsFin } from '../components/ReglesRecurrentes';

// 🟢 Composant Graphique des Prévisions (Exporté pour réutilisation globale)
export default function PrevisionsView(props) {
  const {
    user,
    filters,
    setFilters,
    comptes = [],
    groupesDisponibles = [],
    handleWheelProfil,
    handleWheelMois,
    handleWheelAnnee,
    moisListe = [],
    availablePeriods = [],
    soldeGlobalProjete = 0,
    soldesPrevisionnels = [],
    userTheme = {},
    sensors,
    handleDragEnd,
    SortableAccountCard,
    newPrevi,
    setNewPrevi,
    handleAddPrevision,
    versionRegles = 0,
    loadPrevisions,
    selectedIds2 = [],
    handleTryPropagateYear,
    handleTryDuplicate,
    previsionsFiltrees = [],
    toggleAll2,
    toggleSelect2,
    updatePrevision,
    categoriesVisibles = [],
    optionsComptes = [],
    toutesLesTransactions = [],
    previsionsTracking = {},
    chartDataPrevisions = [],
    moisDisponibles = [],
    excludedMonths = [],
    setExcludedMonths,
    recapPrevisionsStats = [],
    objectifAnnuelGlobal = 0,
    statsEpargnePrevisionnelle = { montant: 0, pourcentage: 0 },
    pourcentageAnnuel = 0,
    CustomSelect,
    isCompact
  } = props;

  // États spécifiques au mode mobile
  const [mobileSubTab, setMobileSubTab] = useState('flux'); // 'flux' | 'projections'
  const [showAddForm, setShowAddForm] = useState(false);
  const [vueTableau, setVueTableau] = useState('mois'); // 'mois' | 'recurrentes'
  const [nbRegles, setNbRegles] = useState(0);



// 🟢 Détection stricte : JAMAIS les mois passés, et JAMAIS les mois sans prévisions
// 🟢 Alerte UNIQUEMENT sur les mois actuels/futurs qui ont de VRAIES prévisions
const moisCritiques = useMemo(() => {
  const decouverts = [];
  const deficits = [];

  (recapPrevisionsStats || []).forEach(m => {
    // 1. On ignore TOUJOURS les mois passés (type === 'réel')
    if (m.type === 'réel') return;

    // 2. Un mois a des prévisions SEULEMENT s'il a des revenus ou des dépenses prévus
    const aDesPrevisions = (m.revenus > 0 || m.depenses > 0 || (m.epargne !== null && m.epargne !== 0));
    if (!aDesPrevisions) return;

    // 3. Alerte Découvert : solde final négatif
    if (m.soldeTotal !== null && m.soldeTotal < 0) {
      decouverts.push({ nom: m.nom, montant: m.soldeTotal });
    }
    // 4. Alerte Déficit : dépenses supérieures aux rentrées
    else if (m.epargne !== null && m.epargne < 0) {
      deficits.push({ nom: m.nom, montant: m.epargne });
    }
  });

  return { decouverts, deficits };
}, [recapPrevisionsStats]);

  return (
    <div className="w-full select-none">

      {/* =========================================================================
          1. AFFICHAGE DESKTOP (100% IDENTIQUE AU DESIGN D'ORIGINE)
          ========================================================================= */}
      <div className="hidden lg:flex flex-col animate-in fade-in duration-500 px-4 md:px-8 h-auto overflow-visible lg:h-[calc(98vh-100px)] lg:overflow-hidden">
        
        {/* BARRE DE FILTRES GLOBALE */}
        <div className="shrink-0 flex flex-wrap items-center gap-4 mb-4 p-3 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius)] border border-white/10 select-none">
          
          {/* SECTION PROFIL */}
          <div 
            onWheel={handleWheelProfil}
            className="flex items-center gap-1 bg-black/20 p-1 rounded-xl cursor-ns-resize"
            title="Molette de la souris : changer de profil"
          >
            {groupesDisponibles.map(p => {
              const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters({ ...filters, profil: p })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-6 bg-[var(--glass-bg)]" />

          {/* SECTION MOIS */}
          <div 
            onWheel={(e) => handleWheelMois && handleWheelMois(e, true)}
            className="flex items-center gap-1 no-scrollbar cursor-ns-resize"
            title="Molette de la souris : changer de mois"
          >
            {moisListe.map(m => (
              <button
                key={m.v}
                type="button"
                onClick={() => setFilters({ ...filters, mois: m.v })}
                className={`min-w-[38px] py-1.5 rounded-lg text-[10px] font-black transition-all border cursor-pointer ${
                  filters.mois === m.v 
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-main)]' 
                    : 'bg-transparent border-transparent text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                }`}
              >
                {m.l.substring(0, 3).toUpperCase()}
              </button>
            ))}
          </div>

          <div className="hidden md:block w-px h-6 bg-[var(--glass-bg)]" />

          {/* SECTION ANNÉE */}
          <div 
            onWheel={(e) => handleWheelAnnee && handleWheelAnnee(e, true)}
            className="flex items-center gap-1 cursor-ns-resize"
            title="Molette de la souris : changer d'année"
          >
            {[...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setFilters({ ...filters, annee: year.toString() })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    filters.annee?.toString() === year.toString() 
                      ? 'bg-emerald-500 text-[var(--text-main)] shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  {year}
                </button>
              ))}
          </div>
        </div>



        {/* SECTION CARTES ALIGNÉES */}
        <div className="shrink-0 grid grid-cols-12 gap-4 mb-2 items-stretch">
          
          {/* CARTE SOLDE ESTIMÉ */}
          <div className="col-span-12 md:col-span-2 h-full pb-2">
            <div 
              className="h-full rounded-[var(--radius)] p-3 text-[var(--text-main)] shadow-xl flex flex-col justify-between transition-all duration-500 relative overflow-hidden"
              style={{ 
                background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
                border: `1px solid ${(userTheme.color_patrimoine || '#37b58f')}33`,
                boxShadow: `0 8px 20px -5px rgba(0, 0, 0, 0.3)`
              }}
            >
              <div className="flex flex-col gap-0.5 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-white/50 uppercase font-black tracking-tighter italic">
                    {filters.profil}
                  </span>
                  <div className="flex h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_5px_color-mix(in_srgb,var(--text-main)_50%,transparent)]" />
                </div>
                <p className="text-[10px] text-white/90 font-black truncate">
                  {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
                </p>
              </div>

              <div className="mt-auto">
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-0.5">Solde Final Estimé</p>
                <h2 className="text-xl font-black tracking-tighter leading-none text-white truncate">
                  {soldeGlobalProjete.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </h2>
              </div>
            </div>
          </div>

          {/* COMPTES PRÉVISIONNELS */}
          <div className="col-span-12 md:col-span-10 min-w-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={soldesPrevisionnels.map(c => c.compte)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-3 h-full pb-2 no-scrollbar cursor-grab active:cursor-grabbing">
                  {soldesPrevisionnels.map(c => (
                    <div key={c.compte} className="min-w-[160px] md:min-w-0 md:flex-1 h-full">
                      <SortableAccountCard c={c} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* CONTENEUR PRINCIPAL DESKTOP (TABLEAU + PROJECTIONS) */}
        <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 overflow-hidden p-2">
          
          {/* BLOC PRINCIPAL (3 PARTS) */}
          <div className="flex-[3] flex flex-col min-w-0 w-full h-full">
            
            {/* Formulaire d'ajout express Desktop */}
            <div className="grid grid-cols-12 gap-x-3 gap-y-2.5 mb-4 p-3 bg-[var(--glass-bg)] rounded-3xl border border-white/10 backdrop-blur-[var(--glass-blur)] relative z-30 shadow-xl w-full select-none">
              <div className="col-span-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-white/5 mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20">
                    <Plus size={12} className="text-[var(--secondary)]" />
                  </div>
                  <div>
                    <h3 className="text-[11px] font-black text-white uppercase tracking-wider leading-none">Nouvelle Prévision</h3>
                    <p className="text-[8px] text-white/20 uppercase tracking-[0.2em] font-medium leading-none mt-0.5">Saisie express</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
                  {selectedIds2.length > 0 && (
                    <button
                      type="button"
                      onClick={handleTryPropagateYear}
                      className="h-[30px] px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] tracking-widest uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                    >
                      <span>Propager sur l'année ({selectedIds2.length})</span>
                      <div className="w-3.5 h-3.5 rounded-lg bg-black/10 flex items-center justify-center font-bold text-[8px]">⚡</div>
                    </button>
                  )}

                  {previsionsFiltrees.length > 0 && (
                    <button
                      type="button"
                      onClick={handleTryDuplicate}
                      className="h-[30px] px-3 bg-[var(--primary)] hover:brightness-110 hover:saturate-150 text-white font-black text-[9px] tracking-widest uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_15%,transparent)]"
                    >
                      <span>
                        {selectedIds2.length > 0 
                          ? `Reconduire la sélection (${selectedIds2.length})` 
                          : 'Reconduire le mois'}
                      </span>
                      <div className="w-3.5 h-3.5 rounded-lg bg-black/10 flex items-center justify-center font-bold text-[8px]">+</div>
                    </button>
                  )}

                  <div className="px-2.5 py-1 bg-[var(--secondary)]/5 rounded-full border border-[var(--secondary)]/10 text-[8.5px] text-secondary-300/40 font-black tracking-widest italic uppercase w-full sm:w-auto text-center sm:text-left leading-none">
                    ⚡ Auto-save Ready
                  </div>
                </div>
              </div>

              {/* Date */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <label className="text-[8px] text-[var(--text-main)]/30 uppercase font-black mb-0.5 block italic leading-none">Date</label>
                <div className="flex items-center gap-1.5 bg-black/25 border border-white/10 rounded-xl px-2.5 h-[34px] focus-within:border-[var(--primary)]/50 transition-all w-full">
                  <Calendar size={12} className="text-[var(--text-main)]/30" />
                  <DatePicker
                    selected={newPrevi.date ? new Date(newPrevi.date) : null} 
                    onChange={(date) => setNewPrevi({ ...newPrevi, date: date })}
                    dateFormat="dd/MM/yyyy"
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white w-full cursor-pointer pl-0.5"
                  />
                </div>
              </div>

              {/* Libellé */}
              <div className="col-span-12 sm:col-span-6 md:col-span-2">
                <label className="text-[8px] text-[var(--text-main)]/30 uppercase font-black mb-0.5 block italic leading-none">Libellé</label>
                <input 
                  type="text"
                  placeholder="Ex: Salaire..."
                  className="w-full h-[34px] bg-black/25 border border-white/10 rounded-xl px-3 py-1 text-[10px] text-white outline-none focus:border-[var(--primary)]/50 transition-all font-bold"
                  value={newPrevi.nom}
                  onChange={e => setNewPrevi({ ...newPrevi, nom: e.target.value })}
                />
              </div>

              {/* Montant */}
              <div className="col-span-12 sm:col-span-4 md:col-span-2">
                <label className="text-[8px] text-[var(--text-main)]/30 uppercase font-black mb-0.5 block italic leading-none">Montant</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full h-[34px] bg-black/25 border border-white/10 rounded-xl px-3 py-1 text-[10px] text-white outline-none focus:border-[var(--primary)]/50 transition-all font-bold text-left sm:text-right"
                  value={newPrevi.montant}
                  onChange={e => setNewPrevi({ ...newPrevi, montant: e.target.value })}
                />
              </div>

              {/* Catégorie */}
              <div className="col-span-12 sm:col-span-4 md:col-span-2">
                <label className="text-[8px] text-[var(--text-main)]/30 uppercase font-black mb-0.5 block italic leading-none">Catégorie</label>
                <CustomSelect 
                  value={newPrevi.categorie}
                  icon={Tag}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setNewPrevi({ ...newPrevi, categorie: val })}
                  className="p-2.5 rounded-xl text-[10px] h-[34px]"
                />
              </div>

              {/* Compte */}
              <div className="col-span-12 sm:col-span-4 md:col-span-2">
                <label className="text-[8px] text-[var(--text-main)]/30 uppercase font-black mb-0.5 block italic leading-none">Compte</label>
                <CustomSelect 
                  value={newPrevi.compte}
                  icon={Wallet}
                  options={optionsComptes}
                  onChange={(val) => setNewPrevi({ ...newPrevi, compte: val })}
                  className="p-2.5 rounded-xl text-[10px] h-[34px]"
                />
              </div>

              {/* Bouton Ajouter */}
              <div className="col-span-12 md:col-span-2 flex items-end">
                <button 
                  type="button"
                  onClick={handleAddPrevision}
                  className="w-full h-[34px] bg-[var(--primary)] hover:brightness-110 hover:saturate-150 text-white font-black text-[9px] uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-[var(--primary)]/15 cursor-pointer"
                >
                  <span>Ajouter</span>
                  <div className="w-3.5 h-3.5 rounded-lg bg-white/20 flex items-center justify-center font-bold text-[8px]">+</div>
                </button>
              </div>

              <div className="col-span-12 flex flex-wrap items-center gap-x-3 gap-y-2 pt-2 border-t border-white/5">
                <span className="text-[8px] text-[var(--text-main)]/30 uppercase font-black italic leading-none">Répétition</span>
                <ChoixRepetition valeur={newPrevi.repeter} onChange={(v) => setNewPrevi({ ...newPrevi, repeter: v })} />
                {newPrevi.repeter && (
                  <>
                    <span className="text-[10px] font-bold text-white/60">
                      le {new Date(newPrevi.date || Date.now()).getDate()} de chaque mois, jusqu’à
                    </span>
                    <div className="w-44">
                      <CustomSelect
                        value={newPrevi.fin || ''}
                        icon={Calendar}
                        options={optionsFin(newPrevi.date)}
                        onChange={(val) => setNewPrevi({ ...newPrevi, fin: val })}
                        className="p-2 rounded-xl text-[10px] h-[30px]"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TABLEAU & GRAPHIQUE PRÉVU */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 w-full">
              
              {/* TABLEAU */}
              <div className="flex-[3] flex flex-col min-h-[350px] lg:min-h-0 relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/5 to-fuchsia-500/5 rounded-[var(--radius)] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />

                <div className="relative h-full flex flex-col bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-full">
                  <div role="tablist" aria-label="Prévisions" className="flex items-center gap-1 p-1.5 border-b border-white/10 bg-[var(--surface)] relative z-50">
                    {[['mois', 'Ce mois-ci', previsionsFiltrees.length], ['recurrentes', 'Récurrentes', nbRegles]].map(([id, libelle, nombre]) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={vueTableau === id}
                        onClick={() => setVueTableau(id)}
                        className={`flex items-center gap-1.5 px-3 h-[28px] rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-colors ${vueTableau === id ? 'bg-white text-slate-900' : 'text-white/45 hover:text-white/80'}`}
                      >
                        {id === 'recurrentes' && <Repeat size={11} aria-hidden="true" />}
                        {libelle}
                        <span className={`text-[8px] ${vueTableau === id ? 'text-slate-500' : 'text-white/30'}`}>{nombre}</span>
                      </button>
                    ))}
                  </div>
                  <div className={`flex-1 overflow-y-auto custom-scrollbar ${vueTableau === 'recurrentes' ? '' : 'hidden'}`}>
                    <ReglesRecurrentes version={versionRegles} onChange={loadPrevisions} onCount={setNbRegles} />
                  </div>
                  <div className={`flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full ${vueTableau === 'recurrentes' ? 'hidden' : ''}`}>
                    {previsionsFiltrees.length > 0 ? (
                      <ListePrevisions
                        previsions={previsionsFiltrees}
                        selectedIds={selectedIds2}
                        toggleSelect={toggleSelect2}
                        toggleAll={toggleAll2}
                        updatePrevision={updatePrevision}
                        categoriesVisibles={categoriesVisibles}
                        optionsComptes={optionsComptes}
                        toutesLesTransactions={toutesLesTransactions}
                        previsionsTracking={previsionsTracking}
                        userTheme={userTheme}
                      />
                    ) : (
                            <div className="py-24">
                              <div className="flex flex-col items-center justify-center text-center px-4">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 bg-[var(--primary)]/20 blur-2xl rounded-full" />
                                  <div className="relative w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-white/10 flex items-center justify-center">
                                    <Calendar size={28} className="text-[var(--secondary)]/40" />
                                  </div>
                                </div>
                                <h3 className="text-[var(--text-main)] font-black text-[10px] uppercase tracking-[0.3em] opacity-50">
                                  Calendrier de prévisions vide
                                </h3>
                                <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-3 leading-relaxed italic max-w-xs">
                                  Aucun mouvement programmé pour cette période. <br/>Ajoutez des prévisions pour anticiper vos dépenses.
                                </p>
                              </div>
                            </div>
                    )}
                  </div>
                </div>
              </div>

              {/* GRAPHIQUE PRÉVISIONNEL */}
              <div className="w-full lg:flex-1 flex flex-col bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[var(--radius)] shadow-2xl p-4 min-w-[300px] min-h-[300px]">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <PieChartIcon size={14} className="text-[var(--text-main)]/40" />
                  <h3 className="text-[10px] font-black text-[var(--text-main)]/40 uppercase tracking-widest italic">Analyse Prévue</h3>
                </div>
                
                <div className="flex-1 w-full">
                  <AnalyseCategories statsCategories={chartDataPrevisions} libelle="Dépenses prévues par catégorie" />
                </div>
              </div>
            </div>
          </div>

          {/* COLONNE DROITE : PROJECTIONS ANNUELLES */}
          <div className="flex-[1.2] min-w-[380px] max-w-[410px] flex flex-col bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 backdrop-blur-[var(--glass-blur)] p-4 shadow-2xl relative overflow-hidden h-full shrink-0 select-none">
            {/* EN-TÊTE PROJECTIONS AVEC L'ALERTE ALIGNÉE À DROITE DU TITRE */}
            <div className="flex items-center justify-between mb-3.5 px-1 shrink-0 gap-2">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                  <TrendingUp size={13} />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] leading-none">Projections</h3>
                  <p className="text-[7.5px] text-[var(--text-main)]/30 font-black uppercase tracking-widest mt-1 italic">Année {filters.annee}</p>
                </div>
              </div>

              {/* 🟢 ALERTE DÉCOUVERT / DÉFICIT PLACÉE À CÔTÉ DU TITRE */}
              {moisCritiques.decouverts.length > 0 ? (
                <div 
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)] animate-pulse min-w-0"
                  title={`Solde débiteur estimé en : ${moisCritiques.decouverts.map(m => `${m.nom} (${Math.round(m.montant)}€)`).join(', ')}`}
                >
                  <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                  <div className="flex flex-col text-right leading-none min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-rose-300 truncate">
                      Découvert ({moisCritiques.decouverts.length} mois)
                    </span>
                    <span className="text-[7px] text-white/60 font-mono mt-0.5 truncate">
                      {moisCritiques.decouverts.map(m => m.nom.substring(0, 4)).join(', ')}
                    </span>
                  </div>
                </div>
              ) : moisCritiques.deficits.length > 0 ? (
                <div 
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm min-w-0"
                  title={`Dépenses prévues supérieures aux revenus en : ${moisCritiques.deficits.map(m => m.nom).join(', ')}`}
                >
                  <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                  <div className="flex flex-col text-right leading-none min-w-0">
                    <span className="text-[8px] font-black uppercase tracking-wider text-amber-300 truncate">
                      Déficit ({moisCritiques.deficits.length} mois)
                    </span>
                    <span className="text-[7px] text-white/60 font-mono mt-0.5 truncate">
                      {moisCritiques.deficits.map(m => m.nom.substring(0, 4)).join(', ')}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Boutons d'exclusion de mois */}
            {moisDisponibles.length > 0 && (
              <div className="shrink-0 mb-3 px-1.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[7.5px] font-black text-white/20 uppercase tracking-widest">Exclure de la projection</span>
                  {excludedMonths.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setExcludedMonths([])}
                      className="text-[8.5px] font-black text-rose-500/60 hover:text-rose-400 uppercase transition-colors cursor-pointer"
                    >
                      Réactiver tout
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {moisDisponibles.map(m => {
                    const isVisible = !excludedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setExcludedMonths(prev => 
                          prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                        )}
                        className={`
                          px-1.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tight
                          transition-all duration-150 cursor-pointer border active:scale-95
                          ${isVisible 
                            ? 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white hover:border-white/10' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-300 font-bold shadow-[0_0_8px_rgba(244,63,94,0.1)]'
                          }
                        `}
                      >
                        {m.substring(0, 3).toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grille 12 mois */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="grid grid-cols-12 px-4 mb-2 shrink-0 select-none">
                <span className="col-span-3 text-[7.5px] font-black uppercase tracking-widest text-white/20">Mois</span>
                <span className="col-span-2 text-[7.5px] font-black uppercase tracking-widest text-white/20 text-right pr-1">Revenus</span>
                <span className="col-span-2 text-[7.5px] font-black uppercase tracking-widest text-white/20 text-right pr-1">Dépenses</span>
                <span className="col-span-2 text-[7.5px] font-black uppercase tracking-widest text-white/20 text-center">Épargne</span>
                <span className="col-span-3 text-[7.5px] font-black uppercase tracking-widest text-white/20 text-right">Cumul</span>
              </div>

              <div className="flex-1 grid grid-rows-12 gap-1 min-h-0 h-full w-full overflow-hidden select-none">
                {recapPrevisionsStats.map((m, i) => {
                  const estPasse = m.type === 'réel';
                  const estInteractif = m.type === 'projeté' || m.type === 'mixte';
                  const safeRevenus = m.revenus || 0;
                  const safeDepenses = m.depenses || 0;
                  const safeEpargne = m.epargne || 0;

                  // 🟢 Vrai test : le mois a des prévisions UNIQUEMENT s'il y a des montants prévus (pas les tirets --)
                  const aDesPrevisions = (safeRevenus > 0 || safeDepenses > 0 || (m.epargne !== null && m.epargne !== 0));

                  // 🟢 L'alerte ne s'applique STRICTEMENT QUE si :
                  // 1. Ce n'est PAS un mois passé
                  // 2. Le mois a de vraies prévisions
                  // 3. Le solde est négatif ou l'épargne est en déficit
                  const estAlerteDecouvert = !estPasse && aDesPrevisions && m.soldeTotal !== null && m.soldeTotal < 0;
                  const estAlerteDeficit = !estPasse && aDesPrevisions && !estAlerteDecouvert && m.epargne !== null && m.epargne < 0;

                  return (
                    <div 
                      key={i} 
                      className={`
                        grid grid-cols-12 items-center px-4 rounded-xl border transition-all duration-200 group h-full min-h-0
                        ${estPasse 
                          ? 'bg-white/[0.01] border-transparent opacity-40' 
                          : estAlerteDecouvert
                            ? 'bg-rose-500/[0.08] border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                            : estAlerteDeficit
                              ? 'bg-amber-500/[0.05] border-amber-500/30'
                              : 'bg-black/20 border-white/5 hover:bg-white/[0.04]'
                        }
                        ${m.isMasque ? 'grayscale opacity-20' : ''} 
                      `}
                    >
                      <div className="col-span-3 flex flex-col justify-center min-h-0">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-white/40 group-hover:text-white/60 transition-colors leading-none">
                          {m.nom}
                        </span>
                        <span className="text-[6.5px] uppercase font-bold text-white/20 italic leading-none mt-0.5">
                          {m.type}
                        </span>
                      </div>

                      <div 
                        className="col-span-2 font-black tracking-tighter text-right pr-1 whitespace-nowrap min-h-0" 
                        style={{ 
                          color: safeRevenus > 0 ? `${userTheme.color_revenus || '#10b981'}e6` : 'color-mix(in srgb, var(--text-main) 6%, transparent)',
                          fontSize: isCompact ? '11px' : '11px'
                        }}
                      >
                        {m.revenus !== null && m.revenus > 0 
                          ? `${m.revenus.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` 
                          : '—'
                        }
                      </div>

                      <div 
                        className="col-span-2 font-black tracking-tighter text-right pr-1 whitespace-nowrap min-h-0" 
                        style={{ 
                          color: safeDepenses > 0 ? `${userTheme.color_depenses || '#f43f5e'}e6` : 'color-mix(in srgb, var(--text-main) 6%, transparent)',
                          fontSize: isCompact ? '11px' : '11px'
                        }}
                      >
                        {m.depenses !== null && m.depenses > 0 
                          ? `-${m.depenses.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` 
                          : '—'
                        }
                      </div>

                      <div className="col-span-2 flex items-center justify-center min-h-0">
                        <span 
                          className="inline-block rounded-lg font-mono font-black text-center whitespace-nowrap leading-none transition-all" 
                          style={{ 
                            backgroundColor: safeEpargne >= 0 ? `${userTheme.color_epargne || '#ffffff'}12` : `${userTheme.color_depenses || '#f43f5e'}12`, 
                            color: safeEpargne >= 0 ? (userTheme.color_epargne || '#ffffff') : (userTheme.color_depenses || '#f43f5e'),
                            border: `1px solid ${safeEpargne >= 0 ? (userTheme.color_epargne || '#ffffff') : (userTheme.color_depenses || '#f43f5e')}15`,
                            fontSize: isCompact ? '10px' : '10px',
                            padding: isCompact ? '2px 4px' : '3px 6px'
                          }}
                        >
                          {m.epargne !== null && m.epargne !== 0 
                            ? `${m.epargne > 0 ? '+' : ''}${m.epargne.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` 
                            : '0€'
                          }
                        </span>
                      </div>

                      <div className="col-span-3 text-right flex items-center justify-end min-h-0">
                        <span 
                          className="font-mono font-black tracking-tighter leading-none whitespace-nowrap" 
                          style={{ 
                            color: m.soldeTotal !== null && m.soldeTotal < 0 
                              ? (userTheme?.color_depenses || '#f43f5e') // 🟢 Passe en ROUGE si négatif
                              : (estInteractif ? userTheme.color_patrimoine : 'color-mix(in srgb, var(--text-main) 20%, transparent)'),
                            fontSize: isCompact ? '12px' : '12px'
                          }}
                        >
                          {m.soldeTotal !== null 
                            ? `${m.soldeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` 
                            : '—'
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Synthèse globale fin d'année */}
            <div className="mt-3.5 p-3 bg-emerald-500/[0.01] border border-emerald-500/10 rounded-2xl flex flex-col gap-2.5 shrink-0 select-none text-[10px]">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[7.5px] font-black text-emerald-500/40 uppercase italic tracking-wider leading-none mb-1">
                    Résultat projeté fin {filters.annee}
                  </span>
                  <span className="text-sm font-black text-white tracking-tighter leading-none">
                    {recapPrevisionsStats && recapPrevisionsStats.length > 0 
                      ? `${recapPrevisionsStats[recapPrevisionsStats.length - 1].soldeTotal?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`
                      : "0.00€"
                    }
                  </span>
                </div>
                
                <div className="h-6.5 w-6.5 rounded-lg bg-black/30 border border-white/5 flex items-center justify-center text-[8px] font-black text-white/40 italic tabular-nums">
                  {recapPrevisionsStats && recapPrevisionsStats[0]?.soldeTotal !== 0
                    ? `${Math.round(((recapPrevisionsStats[recapPrevisionsStats.length - 1]?.soldeTotal / recapPrevisionsStats[0]?.soldeTotal) - 1) * 100)}%`
                    : "0%"
                  }
                </div>
              </div>

              <div className="h-[1px] w-full bg-white/[0.02]" />

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7.5px] font-black text-white/30 uppercase tracking-wider leading-none">
                      Projection Épargne Annuelle :
                    </span>
                    {objectifAnnuelGlobal > 0 && (
                      <span className="text-[10px] font-mono font-black text-white leading-none">
                        {Math.floor(statsEpargnePrevisionnelle.montant).toLocaleString('fr-FR')}€
                        <span className="text-white/20 text-[8px] font-medium ml-0.5">/{objectifAnnuelGlobal.toLocaleString('fr-FR')}€</span>
                      </span>
                    )}
                  </div>

                {objectifAnnuelGlobal > 0 && (
                  <div className="text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    {statsEpargnePrevisionnelle.pourcentage}%
                  </div>
                )}
              </div>

                {objectifAnnuelGlobal > 0 && (
                  <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.min(statsEpargnePrevisionnelle.pourcentage, 100)}%`,
                        background: `linear-gradient(90deg, ${userTheme.color_epargne || '#ffffff'}90, ${userTheme.color_epargne || '#f1c40f'})`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. AFFICHAGE MOBILE (100% IDENTIQUE AU DESIGN D'ORIGINE)
          ========================================================================= */}
      <div className="flex lg:hidden flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
        
        {/* EN-TÊTE MOBILE COMPACT */}
        <div className="flex items-center justify-between mb-3 mt-2 shrink-0">
          <div>
            <h1 className="text-xl font-black tracking-tight">Prévisions</h1>
            <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">Anticipation budgétaire</p>
          </div>

          <div 
            className="px-3 py-1.5 rounded-xl text-right text-white shadow-md shrink-0"
            style={{ backgroundColor: userTheme.color_patrimoine || '#37b58f' }}
          >
            <p className="text-[7px] opacity-70 uppercase font-black leading-none mb-0.5">Solde Estimé</p>
            <p className="text-xs font-mono font-black">{soldeGlobalProjete.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
          </div>
        </div>

        {/* FILTRES DE PÉRIODE (PROFILS & ANNÉES SANS DÉBORDEMENT) */}
        <div className="bg-[var(--glass-bg)] border border-white/10 p-2.5 rounded-xl mb-3 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between gap-1.5 min-w-0">
            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 bg-black/30 p-0.5 rounded-lg min-w-0">
              {(() => {
                const groupes = [...new Set((comptes || []).map(c => c.groupe).filter(Boolean))].sort();
                const liste = groupes.length > 0 ? groupes : [user ? user.charAt(0).toUpperCase() + user.slice(1) : 'Personnel'];

                return liste.map(p => {
                  const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFilters({...filters, profil: p})}
                      className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
            </div>

            <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-lg shrink-0 overflow-x-auto no-scrollbar max-w-[45%]">
              {[...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setFilters({...filters, annee: year.toString()})}
                    className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      filters.annee?.toString() === year.toString() ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/40'
                    }`}
                  >
                    {year}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 select-none">
            {moisListe.map(m => (
              <button
                key={m.v}
                type="button"
                onClick={() => setFilters({...filters, mois: m.v})}
                className={`px-2.5 py-1 rounded-md text-[8px] font-black shrink-0 transition-all border cursor-pointer ${
                  filters.mois === m.v 
                    ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
                    : 'bg-black/10 border-transparent text-white/30'
                }`}
              >
                {m.l.substring(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* BANDEAU D'ALERTE QUAND DES MOIS SONT EN NÉGATIF */}
          {moisCritiques.decouverts.length > 0 ? (
            <div className="mb-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-rose-300 tracking-wider">
                    Alerte Découvert Prévu ({moisCritiques.decouverts.length} mois)
                  </h4>
                  <p className="text-[10px] text-white/60">
                    Solde débiteur estimé en : {moisCritiques.decouverts.map(m => `${m.nom} (${Math.round(m.montant)}€)`).join(', ')}
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest shrink-0">
                Action Requise
              </span>
            </div>
          ) : moisCritiques.deficits.length > 0 ? (
            <div className="mb-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                <span className="text-[10.5px] font-bold text-amber-200 truncate">
                  Attention : dépenses supérieures aux revenus en {moisCritiques.deficits.map(m => m.nom).join(', ')}.
                </span>
              </div>
              <span className="text-[8px] font-black uppercase tracking-wider text-amber-400/80 shrink-0">
                Déficit mensuel
              </span>
            </div>
          ) : null}

        {/* LISTE HORIZONTALE DES COMPTES */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 shrink-0 select-none">
          {soldesPrevisionnels && soldesPrevisionnels.map(c => (
            <div key={c.compte} className="min-w-[160px] shrink-0">
              {SortableAccountCard ? (
                <SortableAccountCard c={c} isSorting={false} />
              ) : (
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <span className="text-[8px] font-black uppercase text-white/40 block">{c.compte}</span>
                  <span className="text-xs font-mono font-black text-white block mt-1">{c.soldeFinalEstime} €</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ONGLETS MOBILES */}
        <div className="flex border-b border-white/5 mb-4 select-none shrink-0">
          <button 
            type="button"
            onClick={() => setMobileSubTab('flux')}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mobileSubTab === 'flux' 
                ? 'border-[var(--secondary)] text-[var(--secondary)]' 
                : 'border-transparent text-white/40'
            }`}
          >
            Flux Prévus ({previsionsFiltrees.length})
          </button>
          <button 
            type="button"
            onClick={() => setMobileSubTab('projections')}
            className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mobileSubTab === 'projections' 
                ? 'border-[var(--secondary)] text-[var(--secondary)]' 
                : 'border-transparent text-white/40'
            }`}
          >
            Recap Projections
          </button>
        </div>

        {/* SOUS-ONGLET 1 : FLUX PRÉVUS */}
        {mobileSubTab === 'flux' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {previsionsFiltrees.length > 0 && (
              <button
                type="button"
                onClick={handleTryDuplicate}
                className="w-full py-2.5 bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <Copy size={12} />
                <span>
                  {selectedIds2.length > 0 
                    ? `Reconduire la sélection (${selectedIds2.length})` 
                    : 'Reconduire le mois complet'}
                </span>
              </button>
            )}

            {/* FORMULAIRE D'AJOUT RAPIDE MOBILE */}
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl overflow-visible relative">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full flex items-center justify-between p-3.5 text-[10px] uppercase font-black text-white/70"
              >
                <span className="flex items-center gap-2">
                  <Plus size={14} className="text-[var(--secondary)]" />
                  <span>Nouvelle Prévision Rapide</span>
                </span>
                <span>{showAddForm ? '▲' : '▼'}</span>
              </button>

              {showAddForm && (
                <div className="p-4 border-t border-white/5 space-y-3.5 bg-black/20 overflow-visible">
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Libellé</label>
                    <input 
                      type="text"
                      placeholder="Ex: Prime, Loyer..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                      value={newPrevi.nom}
                      onChange={e => setNewPrevi({...newPrevi, nom: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant</label>
                      <input 
                        type="number"
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                        value={newPrevi.montant}
                        onChange={e => setNewPrevi({...newPrevi, montant: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date</label>
                      <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[38px] flex items-center justify-center relative">
                        <Calendar size={12} className="text-[var(--secondary)] absolute left-3" />
                        <DatePicker
                          selected={newPrevi.date ? new Date(newPrevi.date) : null} 
                          onChange={(date) => setNewPrevi({ ...newPrevi, date: date })}
                          dateFormat="dd/MM/yyyy"
                          className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer pl-4"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <CustomSelect 
                      label="Catégorie"
                      value={newPrevi.categorie}
                      options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                      onChange={(val) => setNewPrevi({...newPrevi, categorie: val})}
                      icon={Tag}
                      className="p-2.5 rounded-xl text-[10px]"
                    />

                    <CustomSelect 
                      label="Compte associé"
                      value={newPrevi.compte}
                      options={optionsComptes}
                      onChange={(val) => setNewPrevi({...newPrevi, compte: val})}
                      icon={Wallet}
                      className="p-2.5 rounded-xl text-[10px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-black text-white/40 block">Répétition</label>
                    <ChoixRepetition valeur={newPrevi.repeter} onChange={(v) => setNewPrevi({ ...newPrevi, repeter: v })} taille="h-[34px] w-full [&>button]:flex-1 [&>button]:justify-center" />
                    {newPrevi.repeter && (
                      <CustomSelect
                        label={`Le ${new Date(newPrevi.date || Date.now()).getDate()} de chaque mois, jusqu’à`}
                        value={newPrevi.fin || ''}
                        icon={Calendar}
                        options={optionsFin(newPrevi.date)}
                        onChange={(val) => setNewPrevi({ ...newPrevi, fin: val })}
                        className="p-2.5 rounded-xl text-[10px]"
                      />
                    )}
                  </div>

                  <button 
                    type="button"
                    onClick={() => {
                      handleAddPrevision();
                      setShowAddForm(false);
                    }}
                    className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-1 cursor-pointer"
                  >
                    Ajouter au calendrier
                  </button>
                </div>
              )}
            </div>

            <div className="bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl">
              <h3 className="flex items-center gap-2 px-4 pt-3 text-[10px] font-black uppercase tracking-wider text-white/80">
                <Repeat size={12} aria-hidden="true" /> Récurrentes
              </h3>
              <ReglesRecurrentes version={versionRegles} onChange={loadPrevisions} />
            </div>

            {/* LISTE DES CARTES PRÉVISIONS */}
            <div className="space-y-2">
              {previsionsFiltrees.length > 0 ? (
                <ListePrevisions
                  mobile
                  previsions={previsionsFiltrees}
                  selectedIds={selectedIds2}
                  toggleSelect={toggleSelect2}
                  toggleAll={toggleAll2}
                  updatePrevision={updatePrevision}
                  categoriesVisibles={categoriesVisibles}
                  optionsComptes={optionsComptes}
                  toutesLesTransactions={toutesLesTransactions}
                  previsionsTracking={previsionsTracking}
                  userTheme={userTheme}
                />
              ) : (
                <div className="py-12 text-center bg-black/20 rounded-2xl border border-white/5">
                  <span className="text-xl opacity-30">📅</span>
                  <p className="text-[10px] text-white/40 uppercase font-black mt-2">Aucune prévision ce mois-ci</p>
                </div>
              )}
            </div>

            {chartDataPrevisions && chartDataPrevisions.length > 0 && (
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PieChartIcon size={14} className="text-white/40" />
                  <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Analyse Mensuelle Prévue
                  </h3>
                </div>

                <div className="min-h-[420px] w-full">
                  <AnalyseCategories statsCategories={chartDataPrevisions} libelle="Dépenses prévues par catégorie" />
                </div>
              </div>
            )}

          </div>
        )}

        {/* SOUS-ONGLET 2 : RECAP PROJECTIONS */}
        {mobileSubTab === 'projections' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {moisDisponibles.length > 0 && (
              <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Masquer des prévisions</span>
                  {excludedMonths.length > 0 && (
                    <button 
                      type="button"
                      onClick={() => setExcludedMonths([])}
                      className="text-[9px] font-black text-rose-500/50 uppercase"
                    >
                      Tout réactiver
                    </button>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {moisDisponibles.map(m => {
                    const isVisible = !excludedMonths.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setExcludedMonths(prev => 
                          prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                        )}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                          isVisible 
                            ? 'bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20' 
                            : 'bg-black/30 border border-white/5 text-white/20'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {recapPrevisionsStats.map((m, i) => {
                const estPasse = m.type === 'réel';
                const aDesPrevisions = (m.revenus > 0 || m.depenses > 0 || (m.epargne !== null && m.epargne !== 0));
                const estAlerteDecouvert = !estPasse && aDesPrevisions && m.soldeTotal !== null && m.soldeTotal < 0;
                const estAlerteDeficit = !estPasse && aDesPrevisions && !estAlerteDecouvert && m.epargne !== null && m.epargne < 0;

                return (
                  <div 
                    key={i} 
                    className={`p-3 bg-[var(--glass-bg)] border rounded-2xl flex flex-col gap-2 transition-all ${
                      estPasse 
                        ? 'border-transparent opacity-40' 
                        : estAlerteDecouvert
                          ? 'border-rose-500/50 bg-rose-500/[0.05]'
                          : estAlerteDeficit
                            ? 'border-amber-500/40 bg-amber-500/[0.03]'
                            : 'border-white/5 opacity-100'
                    } ${m.isMasque ? 'grayscale opacity-20' : ''}`}
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-white/[0.03]">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-white">{m.nom}</span>
                        <span className="text-[7px] uppercase font-bold text-white/20 italic">{m.type}</span>
                      </div>

                      <div className="text-right">
                        <span className={`text-xs font-mono font-black ${
                          m.soldeTotal !== null && m.soldeTotal < 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {m.soldeTotal?.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div>
                        <p className="text-[7px] font-bold text-white/30 uppercase">Revenus</p>
                        <p className="text-[10px] font-mono font-black text-emerald-500/80 mt-0.5">
                          {m.revenus > 0 ? `+${Math.round(m.revenus)}€` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] font-bold text-white/30 uppercase">Dépenses</p>
                        <p className="text-[10px] font-mono font-black text-rose-500/80 mt-0.5">
                          {m.depenses > 0 ? `-${Math.round(m.depenses)}€` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] font-bold text-white/30 uppercase">Épargne</p>
                        <span 
                          className="inline-block px-1.5 py-0.5 rounded-sm text-[9px] font-black mt-0.5"
                          style={{ 
                            backgroundColor: `${userTheme.color_epargne || '#ffffff'}10`,
                            color: userTheme.color_epargne || '#ffffff',
                          }}
                        >
                          {m.epargne !== 0 ? `${m.epargne > 0 ? '+' : ''}${Math.round(m.epargne)}€` : '0€'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[8px] font-black text-emerald-500/40 uppercase italic tracking-widest">
                    Projection fin {filters.annee}
                  </span>
                  <p className="text-lg font-black text-white tracking-tighter mt-0.5">
                    {recapPrevisionsStats && recapPrevisionsStats.length > 0 
                      ? `${recapPrevisionsStats[recapPrevisionsStats.length - 1].soldeTotal?.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}€`
                      : "0€"
                    }
                  </p>
                </div>
                
                <div className="h-7 w-7 rounded-full bg-[var(--glass-bg)] border border-white/5 flex items-center justify-center text-[9px] font-black text-white/40 italic">
                  {recapPrevisionsStats && recapPrevisionsStats[0]?.soldeTotal !== 0
                    ? `${Math.round(((recapPrevisionsStats[recapPrevisionsStats.length - 1]?.soldeTotal / recapPrevisionsStats[0]?.soldeTotal) - 1) * 100)}%`
                    : "0%"
                  }
                </div>
              </div>

              <div className="h-[1px] w-full bg-white/5" />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-white/40 text-[8px] font-black uppercase tracking-wider">
                      Projection Épargne Annuelle
                    </h4>
                    {objectifAnnuelGlobal > 0 ? (
                      <p className="text-white font-black text-xs mt-0.5">
                        {Math.floor(statsEpargnePrevisionnelle.montant).toLocaleString('fr-FR')} € 
                        <span className="text-white/20 text-[9px] font-medium ml-1">
                          / {objectifAnnuelGlobal.toLocaleString('fr-FR')} €
                        </span>
                      </p>
                    ) : (
                      <p className="text-white/20 font-black text-[9px] uppercase mt-0.5">Objectif non défini</p>
                    )}
                  </div>
                  
                  {objectifAnnuelGlobal > 0 && (
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-sm border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                      {statsEpargnePrevisionnelle.pourcentage}%
                    </span>
                  )}
                </div>

                {objectifAnnuelGlobal > 0 && (
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mt-1">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.min(pourcentageAnnuel, 100)}%`,
                        background: `linear-gradient(90deg, ${userTheme.color_epargne || '#ffffff'}90, ${userTheme.color_epargne || '#f1c40f'})`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* MODALE D'ÉDITION MOBILE DE PRÉVISION */}

      </div>

    </div>
  );
}