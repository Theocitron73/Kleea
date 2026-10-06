import React, { useState, useEffect } from 'react';
import { 
  Plus, Calendar, Tag, Wallet, Eye, EyeOff, 
  PieChart as PieChartIcon, TrendingUp 
} from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import DatePicker from 'react-datepicker';
import { 
  ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, 
  Bar, Cell, LabelList 
} from 'recharts';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';

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

// 🟢 Composant Graphique des Prévisions (Exporté pour être aussi utilisable par PrevisionsMobile)
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

export default function PrevisionsDesktop({
  filters,
  setFilters,
  groupesDisponibles,
  handleWheelProfil,
  handleWheelMois,
  handleWheelAnnee,
  moisListe,
  availablePeriods,
  soldeGlobalProjete,
  soldesPrevisionnels,
  userTheme,
  sensors,
  handleDragEnd,
  SortableAccountCard,
  newPrevi,
  setNewPrevi,
  handleAddPrevision,
  selectedIds2,
  handleTryPropagateYear,
  handleTryDuplicate,
  previsionsFiltrees,
  toggleAll2,
  toggleSelect2,
  updatePrevision,
  categoriesVisibles,
  optionsComptes,
  toutesLesTransactions,
  previsionsTracking,
  chartDataPrevisions,
  moisDisponibles,
  excludedMonths,
  setExcludedMonths,
  recapPrevisionsStats,
  objectifAnnuelGlobal,
  statsEpargnePrevisionnelle,
  CustomSelect,
  isCompact
}) {
  return (
    <div className="hidden lg:flex flex-col animate-in fade-in duration-500 px-4 md:px-8 h-auto overflow-visible lg:h-[calc(98vh-100px)] lg:overflow-hidden">
      
      {/* 1. BARRE DE FILTRES DU PRÉVISIONNEL */}
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
          onWheel={(e) => handleWheelMois(e, true)}
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
          onWheel={(e) => handleWheelAnnee(e, true)}
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

      {/* 2. SECTION CARTES ALIGNÉES */}
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

        {/* CONTENEUR DES COMPTES PRÉVISIONNELS */}
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

      {/* CONTENEUR DOUBLE : TABLEAU & ACTIONS (GAUCHE) + PROJECTIONS (DROITE) */}
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 overflow-hidden p-2">
        
        {/* BLOC PRINCIPAL (3 PARTS) */}
        <div className="flex-[3] flex flex-col min-w-0 w-full h-full">
          
          {/* FORMULAIRE D'AJOUT EXPRESS */}
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
                              {/* 1. CHECKBOX & OEIL */}
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

                              {/* 2. LIBELLÉ */}
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

                              {/* 3. CATÉGORIE */}
                              <td className={`px-2 py-1.5 border-y border-white/5 overflow-visible ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                <CustomSelect 
                                  value={prev.categorie} 
                                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))} 
                                  icon={Tag} 
                                  onChange={(val) => updatePrevision(prev.id, 'categorie', val)} 
                                  className="p-1.5 rounded-xl text-[9.5px] h-[28px] flex items-center justify-between bg-white/[0.04] border border-white/5 hover:border-white/20 focus-within:border-[var(--primary)]/50"
                                />
                              </td>

                              {/* 4. COMPTE */}
                              <td className={`px-2 py-1.5 border-y border-white/5 overflow-visible ${isSelected ? 'bg-emerald-500/15' : 'bg-[var(--glass-bg)]'} transition-colors duration-300`}>
                                <CustomSelect 
                                  value={prev.compte} 
                                  options={optionsComptes} 
                                  icon={Wallet} 
                                  onChange={(val) => updatePrevision(prev.id, 'compte', val)} 
                                  className="p-1.5 rounded-xl text-[9.5px] h-[28px] flex items-center justify-between bg-white/[0.04] border border-white/5 hover:border-white/20 focus-within:border-[var(--primary)]/50"
                                />
                              </td>

                              {/* 5. MONTANT & SUIVI RÉALISÉ */}
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
                                                ? `${userTheme.color_revenus}e6` 
                                                : `${userTheme.color_depenses}e6` 
                                          }}
                                          defaultValue={prev.montant}
                                          onBlur={(e) => updatePrevision(prev.id, 'montant', parseFloat(e.target.value))}
                                        />
                                        <span className="ml-1 text-[8px] font-bold opacity-30 leading-none" style={{ color: isTransfert ? '#6d00fc' : isRevenu ? userTheme.color_revenus : userTheme.color_depenses }}>€</span>
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

                              {/* 6. DATE */}
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
                  themeColor={userTheme.color_depenses} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE DROITE : PROJECTIONS ANNUELLES */}
        <div className="flex-[1.2] min-w-[380px] max-w-[410px] flex flex-col bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 backdrop-blur-[var(--glass-blur)] p-4 shadow-2xl relative overflow-hidden h-full shrink-0 select-none">
          <div className="flex items-center justify-between mb-3.5 px-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400">
                <TrendingUp size={13} />
              </div>
              <div>
                <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.15em] leading-none">Projections</h3>
                <p className="text-[7.5px] text-[var(--text-main)]/30 font-black uppercase tracking-widest mt-1 italic">Année {filters.annee}</p>
              </div>
            </div>
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
                const estInteractif = m.type === 'projeté' || m.type === 'mixte';
                const safeRevenus = m.revenus || 0;
                const safeDepenses = m.depenses || 0;
                const safeEpargne = m.epargne || 0;

                return (
                  <div 
                    key={i} 
                    className={`
                      grid grid-cols-12 items-center px-4 rounded-xl border transition-all duration-200 group h-full min-h-0
                      ${estInteractif 
                        ? 'bg-black/20 border-white/5 hover:bg-white/[0.04]' 
                        : 'bg-white/[0.01] border-transparent opacity-40'
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
                        color: safeRevenus > 0 ? `${userTheme.color_revenus}e6` : 'rgba(255,255,255,0.06)',
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
                        color: safeDepenses > 0 ? `${userTheme.color_depenses}e6` : 'rgba(255,255,255,0.06)',
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
                          backgroundColor: safeEpargne >= 0 ? `${userTheme.color_epargne}12` : `${userTheme.color_depenses}12`, 
                          color: safeEpargne >= 0 ? userTheme.color_epargne : userTheme.color_depenses,
                          border: `1px solid ${safeEpargne >= 0 ? userTheme.color_epargne : userTheme.color_depenses}15`,
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
                          color: estInteractif ? userTheme.color_patrimoine : 'rgba(255,255,255,0.2)',
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
  );
}