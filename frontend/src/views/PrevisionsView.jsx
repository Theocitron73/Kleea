import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Calendar, Tag, Wallet, Eye, EyeOff, 
  PieChart as PieChartIcon, TrendingUp, X, Copy,
  ChevronLeft, ChevronRight, Check,AlertTriangle 
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import DatePicker from 'react-datepicker';
import { 
  ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, 
  Bar, Cell, LabelList 
} from 'recharts';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import toLocalDateString from '../utils/dateUtils';

// 🟢 Helper interne : Détection stricte des transferts internes
const estTransfertInterne = (nom = "", cat = "") => {
  const txt = `${nom || ""} ${cat || ""}`.toUpperCase();
  return (
    txt.includes("🔄") ||
    txt.includes("VERS") ||
    txt.includes("TRANSFERT") ||
    txt.startsWith("VIREMENT :") ||
    /\bVERS\b/.test(txt)
  );
};

// 🟢 Composant Graphique des Prévisions (Exporté pour réutilisation globale)
export const PrevisionsChartView = ({ data, themeColor = "#f43f5e" }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  if (!data || data.length === 0) return (
    <div className="h-full w-full flex items-center justify-center text-[var(--text-main)]/20 text-[10px] uppercase font-black italic py-8">
      Aucune dépense prévisionnelle
    </div>
  );

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const maxVal = Math.max(...data.map(d => d.value), 1);

  if (isMobile) {
    return (
      <div className="w-full flex flex-col min-h-[420px] select-none animate-in fade-in duration-200">
        <div className="flex items-center justify-between px-1 pb-3 mb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white/50">
              Répartition des dépenses
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-white/40 font-mono">
              {data.length}
            </span>
          </div>
          <span className="text-xs font-bold text-white/70">
            Total : <strong className="font-black text-sm ml-1" style={{ color: themeColor }}>{Math.round(total).toLocaleString('fr-FR')} €</strong>
          </span>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 pr-1 min-h-[340px] max-h-[520px]">
          {data.map((entry, idx) => {
            const percentOfTotal = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
            const percentOfMax = Math.min(100, Math.round((entry.value / maxVal) * 100));

            return (
              <div 
                key={`mob-previ-${idx}`} 
                className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2 hover:bg-white/[0.06] transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <CategoryIcon name={entry.name} size={15} />
                    <span className="text-xs font-bold text-white truncate uppercase tracking-tight">
                      {getCleanCategoryName(entry.name)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-black text-white">
                      {Math.round(entry.value).toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white/60 font-mono">
                      {percentOfTotal}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ 
                      width: `${percentOfMax}%`,
                      background: `linear-gradient(90deg, ${themeColor}99, ${themeColor})`,
                      boxShadow: `0 0 8px ${themeColor}44`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const CustomYAxisTick = ({ x, y, payload }) => {
    const name = payload.value;
    const cleanName = getCleanCategoryName(name);
    const limit = 13;
    const displayName = cleanName.length > limit 
      ? `${cleanName.substring(0, limit - 1)}.` 
      : cleanName;

    const iconSize = 14;
    const iconOffset = -112;
    const textOffset = -90;

    return (
      <g transform={`translate(${x},${y})`} className="select-none pointer-events-none">
        <foreignObject 
          x={iconOffset} 
          y={-iconSize / 2} 
          width={iconSize} 
          height={iconSize}
          style={{ overflow: 'visible' }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon name={name} size={iconSize} />
          </div>
        </foreignObject>

        <text 
          x={textOffset} 
          y={3.5} 
          textAnchor="start" 
          fill="rgba(255,255,255,0.75)" 
          fontSize={9} 
          fontWeight="bold"
          className="uppercase tracking-tight"
        >
          {displayName}
        </text>
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="bg-[#0f172a]/95 backdrop-blur-md border border-white/10 p-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2.5">
          <CategoryIcon name={p.name} size={15} />
          <div>
            <p className="text-[9px] font-black uppercase text-white/50 tracking-wider">
              {getCleanCategoryName(p.name)}
            </p>
            <p className="text-xs font-black text-white font-mono mt-0.5">
              {Number(p.value).toLocaleString('fr-FR')} €
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full min-h-0 relative select-none">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data} 
          layout="vertical" 
          margin={{ top: 5, right: 48, left: 8, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorPrevi" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={themeColor} stopOpacity={0.15}/>
              <stop offset="100%" stopColor={themeColor} stopOpacity={0.9}/>
            </linearGradient>
          </defs>

          <XAxis type="number" hide />
          
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false}
            tickLine={false}
            interval={0}
            width={118}
            tick={<CustomYAxisTick />}
          />

          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
            content={<CustomTooltip />} 
          />

          <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={14}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill="url(#colorPrevi)" />
            ))}
            <LabelList 
              dataKey="value" 
              position="right" 
              offset={6}
              formatter={(val) => `${Math.round(val)}€`} 
              style={{ 
                fill: 'rgba(255,255,255,0.65)', 
                fontSize: 9, 
                fontWeight: '900', 
                fontFamily: 'monospace' 
              }} 
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function PrevisionsView(props) {
  const {
    user,
    filters,
    setFilters,
    comptes = [],
    allPrevisionsAnnee = [],
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
  const [editingTx, setEditingTx] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleOpenEditMobile = (prev) => {
    setEditingTx({ 
      ...prev,
      nomPropre: prev.nom.replace('[PRÉVI] ', '') 
    });
  };

  const handleSaveEditMobile = async () => {
    if (!editingTx) return;
    await updatePrevision(editingTx.id, 'nom', `[PRÉVI] ${editingTx.nomPropre}`);
    await updatePrevision(editingTx.id, 'montant', parseFloat(editingTx.montant));
    await updatePrevision(editingTx.id, 'categorie', editingTx.categorie);
    await updatePrevision(editingTx.id, 'compte', editingTx.compte);
    await updatePrevision(editingTx.id, 'date', editingTx.date);
    setEditingTx(null);
  };

  const cleanMonth = (m) => {
  if (!m) return "";
  return m.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

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
                  <div className="flex h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_5px_rgba(255,255,255,0.5)]" />
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
                    <Plus size={12} className="text-[var(--primary)]" />
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
                      className="h-[30px] px-3 bg-[var(--primary)] hover:brightness-110 hover:saturate-150 text-white font-black text-[9px] tracking-widest uppercase rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(99,102,241,0.15)]"
                    >
                      <span>
                        {selectedIds2.length > 0 
                          ? `Reconduire la sélection (${selectedIds2.length})` 
                          : 'Reconduire le mois'}
                      </span>
                      <div className="w-3.5 h-3.5 rounded-lg bg-black/10 flex items-center justify-center font-bold text-[8px]">+</div>
                    </button>
                  )}

                  <div className="px-2.5 py-1 bg-[var(--primary)]/5 rounded-full border border-[var(--primary)]/10 text-[8.5px] text-indigo-300/40 font-black tracking-widest italic uppercase w-full sm:w-auto text-center sm:text-left leading-none">
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
                  className="p-2.5 rounded-xl text-[10px] h-[34px] flex items-center justify-between bg-black/25 border border-white/10 hover:border-white/20 focus-within:border-[var(--primary)]/50"
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
                  className="p-2.5 rounded-xl text-[10px] h-[34px] flex items-center justify-between bg-black/25 border border-white/10 hover:border-white/20 focus-within:border-[var(--primary)]/50"
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
            </div>

            {/* TABLEAU & GRAPHIQUE PRÉVU */}
            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 w-full">
              
              {/* TABLEAU */}
              <div className="flex-[3] flex flex-col min-h-[350px] lg:min-h-0 relative group w-full">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/5 to-fuchsia-500/5 rounded-[var(--radius)] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />

                <div className="relative h-full flex flex-col bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl shadow-2xl overflow-hidden w-full">
                  <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar w-full">
                    <table className="w-full text-left border-separate border-spacing-y-1.5 relative z-10 table-fixed min-w-[650px]">
                      <thead className="sticky top-0 z-40 bg-[#0f172a]">
                        <tr className="bg-[#0f172a] text-[9px] text-[var(--text-main)]/50 uppercase font-black tracking-wider">
                          <th className="sticky top-0 z-40 py-3 px-3 w-14 text-center border-b border-white/10 bg-[#0f172a]">
                            <input 
                              type="checkbox"
                              checked={previsionsFiltrees.length > 0 && selectedIds2.length === previsionsFiltrees.length}
                              onChange={toggleAll2}
                              className="w-4 h-4 rounded border-white/20 bg-black/60 text-emerald-500 cursor-pointer"
                            />
                          </th>
                          <th className="sticky top-0 z-40 py-3 px-3 w-[26%] border-b border-white/10 bg-[#0f172a]">Libellé</th>
                          <th className="sticky top-0 z-40 py-3 px-3 w-[18%] border-b border-white/10 bg-[#0f172a]">Catégorie</th>
                          <th className="sticky top-0 z-40 py-3 px-3 w-[18%] border-b border-white/10 bg-[#0f172a]">Compte</th>
                          <th className="sticky top-0 z-40 py-3 px-3 w-[18%] text-right border-b border-white/10 bg-[#0f172a]">Montant</th>
                          <th className="sticky top-0 z-40 py-3 px-3 w-[20%] text-right border-b border-white/10 pr-4 bg-[#0f172a]">Date</th>
                        </tr>
                      </thead>

                      <tbody className="before:content-[''] before:block before:h-1">
                        {previsionsFiltrees.length > 0 ? (
                          previsionsFiltrees.map((prev) => {
                            const isSelected = selectedIds2.includes(prev.id);
                            const isTransfert = estTransfertInterne(prev.nom, prev.categorie);
                            const isActif = !(prev.actif === false || prev.actif === 0 || prev.actif === "0" || prev.actif === "false");

                            const tracking = (typeof previsionsTracking !== 'undefined' && previsionsTracking?.[prev.id]) || (() => {
                              const montantAbs = Math.abs(parseFloat(prev.montant) || 0);
                              const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === prev.id);
                              const consomme = liees.reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
                              const restant = montantAbs - consomme;
                              const depasse = consomme > montantAbs;
                              const pct = montantAbs > 0 ? Math.min(100, Math.round((consomme / montantAbs) * 100)) : 0;
                              return { consomme, restant, depasse, pct, nbTransactions: liees.length, transactions: liees };
                            })();

                            return (
                              <tr 
                                key={prev.id} 
                                className={`
                                  group transition-all duration-300 
                                  ${isSelected ? 'bg-transparent' : 'hover:[&>td]:bg-white/[0.04]'}
                                  ${!isActif ? 'opacity-30 hover:opacity-70 saturate-50' : ''}
                                `}
                              >
                                <td className={`p-1.5 border-y border-l border-white/5 text-center relative rounded-l-xl ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <input 
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleSelect2(prev.id)}
                                      className="w-4 h-4 border-white/20 bg-[var(--glass-bg)] text-emerald-500 cursor-pointer relative z-10"
                                    />
                                    
                                    <button
                                      type="button"
                                      onClick={() => updatePrevision(prev.id, 'actif', !isActif)}
                                      title={isActif ? "Désactiver du graphique et des calculs" : "Réactiver la transaction"}
                                      className={`p-1 rounded-md transition-all cursor-pointer ${isActif ? 'text-white/20 hover:text-white/60 hover:bg-white/5' : 'text-rose-400 hover:text-rose-300 bg-rose-500/10'}`}
                                    >
                                      {isActif ? <Eye size={11} /> : <EyeOff size={11} />}
                                    </button>
                                  </div>
                                </td>

                                <td className={`px-2 py-1.5 border-y border-white/5 ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  <div className="flex items-center gap-1.5 w-full">
                                    <input 
                                      className={`input-libelle bg-white/[0.04] border border-white/5 focus:border-emerald-500/40 rounded-lg px-2.5 py-1 text-[10.5px] text-[var(--text-main)] font-black uppercase w-full outline-none transition-all ${!isActif ? 'line-through opacity-60' : ''}`}
                                      defaultValue={prev.nom.replace('[PRÉVI] ', '')}
                                      onBlur={(e) => updatePrevision(prev.id, 'nom', `[PRÉVI] ${e.target.value}`)}
                                    />
                                    {tracking.nbTransactions > 0 && (
                                      <span 
                                        title={`${tracking.nbTransactions} transaction${tracking.nbTransactions > 1 ? 's liées' : ' liée'} : ${tracking.consomme.toFixed(2)}€ déjà enregistrés`}
                                        className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[7.5px] font-black uppercase tracking-wider shrink-0"
                                      >
                                        {tracking.nbTransactions} {tracking.nbTransactions > 1 ? 'liées' : 'liée'}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className={`px-2 py-1.5 border-y border-white/5 overflow-visible ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  <CustomSelect 
                                    value={prev.categorie} 
                                    options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))} 
                                    icon={Tag} 
                                    onChange={(val) => updatePrevision(prev.id, 'categorie', val)} 
                                    className="p-1.5 rounded-xl text-[9.5px] h-[28px] flex items-center justify-between bg-white/[0.04] border border-white/5 hover:border-white/20 focus-within:border-[var(--primary)]/50"
                                  />
                                </td>

                                <td className={`px-2 py-1.5 border-y border-white/5 overflow-visible ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  <CustomSelect 
                                    value={prev.compte} 
                                    options={optionsComptes} 
                                    icon={Wallet} 
                                    onChange={(val) => updatePrevision(prev.id, 'compte', val)} 
                                    className="p-1.5 rounded-xl text-[9.5px] h-[28px] flex items-center justify-between bg-white/[0.04] border border-white/5 hover:border-white/20 focus-within:border-[var(--primary)]/50"
                                  />
                                </td>

                                <td className={`px-2 py-1.5 border-y border-white/5 ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  {(() => {
                                    const isRevenu = (parseFloat(prev.montant) || 0) >= 0;
                                    const montantPrevu = Math.abs(parseFloat(prev.montant) || 0);
                                    const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === prev.id);
                                    const consomme = liees.reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
                                    
                                    const diff = montantPrevu - consomme;
                                    const diffArrondie = Math.round(Math.abs(diff));
                                    const estRegle = Math.abs(diff) < 0.5;
                                    const estDepasse = diff <= -0.5;
                                    const pct = montantPrevu > 0 ? Math.min(100, Math.round((consomme / montantPrevu) * 100)) : 0;

                                    return (
                                      <div className="flex flex-col gap-1">
                                        <div className="amount-box flex items-center bg-white/[0.04] border border-white/5 rounded-xl px-2.5 h-[28px] transition-all duration-300">
                                          <input 
                                            type="number"
                                            className="bg-transparent border-none outline-none text-right font-black w-full text-[11px] leading-none"
                                            style={{ 
                                              color: isTransfert 
                                                ? '#a855f7' 
                                                : isRevenu
                                                  ? `${userTheme.color_revenus || '#10b981'}e6` 
                                                  : `${userTheme.color_depenses || '#f43f5e'}e6` 
                                            }}
                                            defaultValue={prev.montant}
                                            onBlur={(e) => updatePrevision(prev.id, 'montant', parseFloat(e.target.value))}
                                          />
                                          <span className="ml-1 text-[8px] font-bold opacity-30 leading-none">€</span>
                                        </div>

                                        {liees.length > 0 ? (
                                          <div className="flex flex-col gap-0.5 px-1">
                                            <div className="flex items-center justify-between text-[7.5px] font-black uppercase tracking-tight">
                                              <span className="text-white/40">
                                                {isRevenu ? 'Perçu :' : 'Dépensé :'} <strong className="text-white">{consomme.toFixed(0)}€</strong>
                                              </span>

                                              {estRegle ? (
                                                <span className="text-emerald-400 font-black flex items-center gap-0.5">
                                                  <span>✓</span> {isRevenu ? '100% perçu' : '100% réglé'}
                                                </span>
                                              ) : estDepasse ? (
                                                <span className={isRevenu ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                                                  {isRevenu ? `+${diffArrondie}€ surplus` : `Dépassé (+${diffArrondie}€)`}
                                                </span>
                                              ) : (
                                                <span className={isRevenu ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                                                  {isRevenu ? `Attendu: ${Math.round(diff)}€` : `Reste: ${Math.round(diff)}€`}
                                                </span>
                                              )}
                                            </div>
                                            
                                            <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                              <div 
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                  estRegle
                                                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]'
                                                    : estDepasse 
                                                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' 
                                                      : isRevenu
                                                        ? 'bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.3)]' 
                                                        : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.3)]'
                                                }`}
                                                style={{ width: `${estRegle || estDepasse ? 100 : pct}%` }}
                                              />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-end px-1">
                                            <span className="text-[7.5px] font-bold text-white/20 uppercase tracking-widest italic">
                                              0 liée
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </td>

                                <td className={`px-3 py-1.5 border-y border-r border-white/5 text-right rounded-r-xl ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                  <div className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/5 rounded-xl px-2 h-[28px] focus-within:border-emerald-500/50 transition-all">
                                    <Calendar size={11} className="text-[var(--text-main)]/30" />
                                    <DatePicker
                                      selected={prev.date ? new Date(prev.date) : null}
                                      onChange={(date) => updatePrevision(prev.id, 'date', date)}
                                      dateFormat="dd/MM/yyyy"
                                      portalId="root" 
                                      className="bg-transparent border-none outline-none text-[9.5px] font-black text-[var(--text-main)] w-18 text-right cursor-pointer"
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-24">
                              <div className="flex flex-col items-center justify-center text-center px-4">
                                <div className="relative mb-6">
                                  <div className="absolute inset-0 bg-[var(--primary)]/20 blur-2xl rounded-full" />
                                  <div className="relative w-16 h-16 rounded-2xl bg-[var(--glass-bg)] border border-white/10 flex items-center justify-center">
                                    <Calendar size={28} className="text-[var(--primary)]/40" />
                                  </div>
                                </div>
                                <h3 className="text-[var(--text-main)] font-black text-[10px] uppercase tracking-[0.3em] opacity-50">
                                  Calendrier de prévisions vide
                                </h3>
                                <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-3 leading-relaxed italic max-w-xs">
                                  Aucun mouvement programmé pour cette période. <br/>Ajoutez des prévisions pour anticiper vos dépenses.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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
                  <PrevisionsChartView 
                    data={chartDataPrevisions} 
                    themeColor={userTheme?.color_depenses} 
                  />
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
                          color: safeRevenus > 0 ? `${userTheme.color_revenus || '#10b981'}e6` : 'rgba(255,255,255,0.06)',
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
                          color: safeDepenses > 0 ? `${userTheme.color_depenses || '#f43f5e'}e6` : 'rgba(255,255,255,0.06)',
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
                              : (estInteractif ? userTheme.color_patrimoine : 'rgba(255,255,255,0.2)'),
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
                  <div className="text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
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

            <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-lg shrink-0 overflow-x-auto no-scrollbar max-w-[45%]">
              {[...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setFilters({...filters, annee: year.toString()})}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-black transition-all whitespace-nowrap shrink-0 cursor-pointer ${
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
                ? 'border-[var(--primary)] text-[var(--primary)]' 
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
                ? 'border-[var(--primary)] text-[var(--primary)]' 
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
                  <Plus size={14} className="text-[var(--primary)]" />
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
                        <Calendar size={12} className="text-[var(--primary)] absolute left-3" />
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

            {/* LISTE DES CARTES PRÉVISIONS */}
            <div className="space-y-2">
              {previsionsFiltrees.length > 0 ? (
                previsionsFiltrees.map((prev) => {
                  const isSelected = selectedIds2.includes(prev.id);
                  const isActif = !(prev.actif === false || prev.actif === 0 || prev.actif === "0" || prev.actif === "false");
                  const isTransfert = estTransfertInterne(prev.nom, prev.categorie);
                  const isRevenu = (parseFloat(prev.montant) || 0) >= 0;
                  const montantAbs = Math.abs(parseFloat(prev.montant) || 0);

                  const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === prev.id);
                  const consomme = liees.reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
                  
                  const diff = montantAbs - consomme;
                  const diffEuro = Math.round(Math.abs(diff));
                  const estRegle = Math.abs(diff) < 0.5;
                  const estDepasse = diff <= -0.5;
                  const pct = montantAbs > 0 ? Math.min(100, Math.round((consomme / montantAbs) * 100)) : 0;

                  return (
                    <div 
                      key={prev.id}
                      onClick={() => handleOpenEditMobile(prev)}
                      className={`p-3 bg-[var(--glass-bg)] border border-white/5 rounded-2xl flex flex-col gap-2 transition-all active:bg-white/5 ${
                        !isActif ? 'opacity-35 saturate-50' : ''
                      } ${isSelected ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect2(prev.id)}
                            onClick={(e) => e.stopPropagation()} 
                            className="w-4 h-4 border-white/20 bg-[var(--glass-bg)] text-emerald-500 cursor-pointer rounded shrink-0 relative z-10"
                          />

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <CategoryIcon name={prev.categorie || prev.nom} size={13} />
                              <p className={`text-xs font-black uppercase text-white truncate pr-1 ${!isActif ? 'line-through text-white/50' : ''}`}>
                                {prev.nom.replace('[PRÉVI] ', '')}
                              </p>
                              {liees.length > 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[7px] font-black uppercase shrink-0">
                                  {liees.length} tx
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              <span className="text-[7.5px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono uppercase">
                                {prev.compte}
                              </span>
                              <div className="flex items-center gap-1 bg-[var(--primary)]/10 text-[var(--primary)] px-1.5 py-0.5 rounded text-[7.5px] font-black max-w-[95px] truncate">
                                <CategoryIcon name={prev.categorie} size={9} />
                                <span className="truncate">{getCleanCategoryName(prev.categorie)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2 flex items-center gap-2.5">
                          <div>
                            <span className="text-xs font-mono font-black" style={{ 
                              color: isTransfert ? '#a78bfa' : isRevenu ? (userTheme.color_revenus || '#10b981') : (userTheme.color_depenses || '#f43f5e') 
                            }}>
                              {isRevenu ? '+' : ''}{prev.montant.toFixed(0)} €
                            </span>
                            <p className="text-[8px] text-white/30 font-bold uppercase mt-0.5">
                              {prev.date ? new Date(prev.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'}) : 'À définir'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updatePrevision(prev.id, 'actif', !isActif);
                            }}
                            className={`p-1.5 rounded-lg border transition-all ${
                              isActif ? 'text-white/20 border-white/5' : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                            }`}
                          >
                            {isActif ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Suivi du réalisé */}
                      {liees.length > 0 && (
                        <div className="pt-1.5 border-t border-white/5 space-y-1">
                          <div className="flex justify-between items-center text-[7.5px] font-black uppercase tracking-tight">
                            <span className="text-white/40">
                              {isRevenu ? 'Perçu :' : 'Dépensé :'} <strong className="text-white">{consomme.toFixed(0)}€</strong>
                            </span>
                            
                            {estRegle ? (
                              <span className="text-emerald-400 font-black flex items-center gap-0.5">
                                <span>✓</span> {isRevenu ? '100% perçu' : '100% réglé'}
                              </span>
                            ) : estDepasse ? (
                              <span className={isRevenu ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {isRevenu ? `+${diffEuro}€ surplus` : `Dépassé (+${diffEuro}€)`}
                              </span>
                            ) : (
                              <span className={isRevenu ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {isRevenu ? `Attendu: ${diffEuro}€` : `Reste: ${diffEuro}€`}
                              </span>
                            )}
                          </div>

                          <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                estRegle
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                                  : isRevenu
                                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                    : estDepasse 
                                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]' 
                                      : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              }`}
                              style={{ width: `${estRegle || estDepasse ? 100 : pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })
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
                  <PrevisionsChartView 
                    data={chartDataPrevisions} 
                    themeColor={userTheme?.color_depenses} 
                  />
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
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20' 
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
                          className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black mt-0.5"
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
                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
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
        {editingTx && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setEditingTx(null)} />

            <div 
              className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 overflow-visible space-y-4 animate-in fade-in zoom-in-95 duration-200 relative z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest">Éditer la prévision</h4>
                  <p className="text-[9px] text-white/30 uppercase font-black">Changements appliqués instantanément</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingTx(null)} 
                  className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                  <input 
                    type="text"
                    value={editingTx.nomPropre}
                    onChange={(e) => setEditingTx({ ...editingTx, nomPropre: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingTx.montant}
                      onChange={(e) => setEditingTx({ ...editingTx, montant: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date estimée</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[34px] flex items-center justify-center relative">
                      <Calendar size={12} className="text-[var(--primary)] absolute left-3" />
                      <DatePicker
                        selected={editingTx.date ? new Date(editingTx.date) : null}
                        onChange={(date) => setEditingTx({ ...editingTx, date: toLocalDateString(date) })}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer pl-4"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <CustomSelect 
                    label="Catégorie"
                    value={editingTx.categorie}
                    options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                    onChange={(val) => setEditingTx({ ...editingTx, categorie: val })}
                    icon={Tag}
                    className="p-2.5 rounded-xl text-[10px]"
                  />

                  <CustomSelect 
                    label="Compte"
                    value={editingTx.compte}
                    options={optionsComptes}
                    onChange={(val) => setEditingTx({ ...editingTx, compte: val })}
                    icon={Wallet}
                    className="p-2.5 rounded-xl text-[10px]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button 
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={handleSaveEditMobile}
                  className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}