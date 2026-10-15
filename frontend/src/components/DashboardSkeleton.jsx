import React from 'react';
import { Trophy, Search, List, PieChart, CalendarDays, Sparkles,ArrowUpCircle,ArrowDownCircle,RefreshCw,TrendingUp,Zap } from 'lucide-react';

export default function DashboardSkeleton({ userTheme = {}, filters = {}, isFadingOut = false }) {
  const moisAbreges = ['JAN', 'FEV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOUT', 'SEPT', 'OCT', 'NOV', 'DEC'];
  const moisComplets = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const anneeAffichee = filters?.annee || new Date().getFullYear();

  return (
    <div className={`w-full flex flex-col gap-4 select-none px-4 md:px-8 pt-1 pb-24 lg:pb-4 lg:h-[calc(99vh-100px)] lg:overflow-hidden transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* 1. BARRE DE FILTRES : TITRES ET BOUTONS VISIBLES */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 mb-2 p-3 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius)] border border-white/10">
        {/* Profil factice mais net */}
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
          <span className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white text-slate-900 shadow-sm uppercase">
            {filters?.profil || 'Tous'}
          </span>
        </div>

        <div className="hidden md:block w-px h-6 bg-white/10" />

        {/* 12 Mois statiques */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {moisAbreges.map((m, idx) => (
            <span
              key={m}
              className={`min-w-[38px] py-1.5 rounded-lg text-[10px] font-black text-center border ${
                idx === 0 
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
                  : 'border-transparent text-white/30'
              }`}
            >
              {m}
            </span>
          ))}
        </div>

        <div className="hidden md:block w-px h-6 bg-white/10" />

        {/* Année */}
        <span className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-emerald-500 text-white shadow-sm font-mono">
          {anneeAffichee}
        </span>
      </div>

      {/* 2. SECTION CARTES ALIGNÉES */}
      <div className="shrink-0 grid grid-cols-12 gap-4 mb-2 items-stretch">
        
        {/* Carte Total Patrimoine */}
        <div className="col-span-12 md:col-span-2 h-24 md:h-28 rounded-[var(--radius)] p-3 shadow-xl flex flex-col justify-between bg-gradient-to-br from-emerald-600/30 to-emerald-900/20 border border-emerald-500/20">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-white/50 uppercase font-black tracking-tighter italic">Patrimoine</span>
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
          </div>
          <div>
            <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-1">Total</p>
            {/* Zone de valeur en pulse */}
            <div className="h-6 w-28 bg-white/20 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Comptes bancaires factices */}
        <div className="col-span-12 md:col-span-10 flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className="flex-1 min-w-[145px] md:min-w-[160px] h-24 md:h-28 p-3 rounded-2xl md:rounded-[var(--radius)] flex flex-col justify-between bg-[var(--glass-bg)] border border-white/10"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="h-2 w-12 bg-white/10 rounded" />
                  <div className="h-3 w-20 bg-white/20 rounded" />
                </div>
                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10" />
              </div>
              <div>
                <span className="text-[8.5px] font-black uppercase text-white/40 block mb-1">Solde</span>
                <div className="h-5 w-24 bg-white/20 rounded font-mono animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. GRILLE CENTRALE EN 3 COLONNES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        
        {/* =========================================================
            COLONNE 1 : FLUX MENSUEL
            ========================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col justify-between shadow-2xl h-[420px] lg:h-full min-h-0 overflow-hidden">
          
          <div className="flex flex-col flex-1 min-h-0">
            {/* En-tête avec vrais titres et vrais boutons d'onglets */}
            <div className="pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-black bg-white bg-clip-text text-transparent tracking-tight uppercase">
                    Flux mensuel
                  </h3>
                  <span className="text-indigo-400 text-[10px] font-black tracking-[0.2em] uppercase border-l border-white/10 pl-3">
                    {filters?.mois || 'En cours'}
                  </span>
                </div>
                <div className="mt-1.5 h-1 w-12 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              </div>

              {/* Boutons d'onglets complets */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-0.5 opacity-60">
                <span className="p-1.5 rounded-lg bg-[var(--glass-bg)] text-white"><ArrowUpCircle size={14} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><ArrowDownCircle size={14} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><RefreshCw size={14} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><TrendingUp size={14} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><Zap size={14} /></span>
              </div>
            </div>

            {/* Barre de recherche + Total */}
            <div className="py-3 flex justify-between items-center border-b border-white/[0.04] shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-white/40 tracking-wider">Total</span>
                <div className="relative w-32 bg-black/30 border border-white/10 rounded-lg pl-7 pr-3 py-1 flex items-center">
                  <Search size={11} className="absolute left-2.5 text-white/30" />
                  <span className="text-[9.5px] text-white/20 uppercase font-bold">Rechercher...</span>
                </div>
              </div>
              {/* Montant total en pulse */}
              <div className="h-6 w-24 bg-white/20 rounded-lg animate-pulse" />
            </div>

            {/* Lignes de transactions (seuls nom et montant pulsent) */}
            <div className="space-y-2 flex-1 overflow-y-auto py-2 custom-scrollbar">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="px-3 py-2 rounded-xl border border-white/5 bg-black/20 flex items-center gap-3">
                  <div className="flex flex-col items-center justify-center min-w-[34px] h-9 bg-black/30 rounded-lg border border-white/5 text-[9px] font-black text-white/40">
                    --
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-36 bg-white/15 rounded animate-pulse" />
                      <div className="h-3.5 w-16 bg-white/20 rounded font-mono animate-pulse" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-2 w-16 bg-white/10 rounded" />
                      <div className="h-2 w-20 bg-white/10 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Jauges d'objectifs bas */}
          <div className="pt-3 border-t border-white/10 shrink-0">
            <h3 className="text-[var(--text-main)]/30 font-black text-[9px] uppercase tracking-[0.2em] mb-2">
              Objectifs Budgétaires
            </h3>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-col items-center min-w-[76px] p-2 bg-black/30 border border-white/5 rounded-xl flex">
                  <div className="w-12 h-6 border-t-2 border-white/20 rounded-t-full mb-1" />
                  <div className="h-2 w-10 bg-white/10 rounded mb-1" />
                  <div className="h-2 w-6 bg-white/20 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================
            COLONNE 2 : BILAN ANNUEL (VRAIS NOMS DE MOIS & EN-TÊTES)
            ========================================================= */}
        <div className="col-span-12 lg:col-span-4 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col justify-between shadow-2xl h-[420px] lg:h-full min-h-0 overflow-hidden">
          
          <div className="flex flex-col flex-1 min-h-0">
            {/* En-tête Bilan */}
            <div className="pb-3 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-baseline gap-3">
                  <h3 className="text-2xl font-black bg-white bg-clip-text text-transparent tracking-tight uppercase">
                    Bilan Annuel
                  </h3>
                  <span className="text-emerald-500 text-[10px] font-black tracking-[0.2em] border-l border-white/10 pl-3">
                    {anneeAffichee}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[8.5px] font-bold text-white/40 uppercase">Solde 1er janvier :</span>
                  <div className="h-3 w-14 bg-emerald-500/20 rounded animate-pulse" />
                </div>
              </div>

              {/* Vrais onglets du bilan annuel */}
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 opacity-60">
                <span className="p-1.5 rounded-lg bg-[var(--glass-bg)] text-white"><List size={13} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><PieChart size={13} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><CalendarDays size={13} /></span>
                <span className="p-1.5 rounded-lg text-white/30"><Sparkles size={13} /></span>
              </div>
            </div>

            {/* Vrais en-têtes de colonnes du tableau */}
            <div className="grid grid-cols-12 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/[0.04] shrink-0">
              <span className="col-span-3">Mois</span>
              <span className="col-span-2 text-right pr-1">Revenus</span>
              <span className="col-span-2 text-right pr-1">Dépenses</span>
              <span className="col-span-2 text-center">Épargne</span>
              <span className="col-span-3 text-right">Cumul</span>
            </div>

            {/* 12 Mois : LES NOMS SONT RÉELS, SEULES LES VALEURS PULSENT */}
            <div className="flex-1 flex flex-col justify-between py-1 overflow-hidden">
              {moisComplets.map((nomMois) => (
                <div 
                  key={nomMois}
                  className="grid grid-cols-12 items-center px-3 py-0.5 rounded-lg border border-white/[0.03] bg-white/[0.01]"
                >
                  <span className="col-span-3 text-[10px] font-black uppercase text-white/70">
                    {nomMois}
                  </span>
                  
                  {/* Revenus skeleton */}
                  <div className="col-span-2 flex justify-end pr-1">
                    <div className="h-2.5 w-12 bg-emerald-500/20 rounded animate-pulse" />
                  </div>

                  {/* Dépenses skeleton */}
                  <div className="col-span-2 flex justify-end pr-1">
                    <div className="h-2.5 w-12 bg-rose-500/20 rounded animate-pulse" />
                  </div>

                  {/* Épargne skeleton */}
                  <div className="col-span-2 flex justify-center">
                    <div className="h-3 w-10 bg-white/10 rounded-full animate-pulse" />
                  </div>

                  {/* Cumul skeleton */}
                  <div className="col-span-3 flex justify-end">
                    <div className="h-3 w-14 bg-white/20 rounded font-mono animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Synthèse Totaux bas avec vrais intitulés */}
          <div className="p-3 bg-[var(--glass-bg)] border border-white/10 rounded-xl shrink-0 space-y-2 mt-2">
            <div className="flex justify-between items-center pb-1 border-b border-white/5">
              <span className="text-[8.5px] font-black uppercase tracking-[0.2em] text-white/40">Totaux Annuel</span>
              <span className="text-[8px] font-black uppercase text-white/30">Période</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/20 p-2 rounded-xl text-center">
                <span className="text-[7px] font-black uppercase text-white/30 block mb-1">Total Revenus</span>
                <div className="h-4 w-16 bg-emerald-500/20 rounded mx-auto animate-pulse" />
              </div>
              <div className="bg-black/20 p-2 rounded-xl text-center">
                <span className="text-[7px] font-black uppercase text-white/30 block mb-1">Total Dépenses</span>
                <div className="h-4 w-16 bg-rose-500/20 rounded mx-auto animate-pulse" />
              </div>
              <div className="bg-black/20 p-2 rounded-xl text-center">
                <span className="text-[7px] font-black uppercase text-white/30 block mb-1">Net Épargné</span>
                <div className="h-4 w-16 bg-white/20 rounded mx-auto animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================
            COLONNE 3 : GRAPHES & PATRIMOINE
            ========================================================= */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3 h-[420px] lg:h-full min-h-0">
          
          {/* Vrais boutons d'onglets de droite */}
          <div className="flex bg-slate-900/50 p-1.5 rounded-[24px] border border-white/5 w-fit self-center shrink-0">
            <span className="px-5 py-1.5 rounded-[18px] text-[9.5px] font-black uppercase tracking-[0.15em] bg-white text-slate-900 shadow-md">
              Analytique
            </span>
            <span className="px-5 py-1.5 rounded-[18px] text-[9.5px] font-black uppercase tracking-[0.15em] text-white/30">
              Gestion Épargne & Projets
            </span>
          </div>

          {/* Jauge d'objectif avec vraie icône Trophy et labels */}
          <div className="bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-3.5 shrink-0 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Trophy size={16} />
                </div>
                <div>
                  <h4 className="text-[9px] font-black uppercase tracking-[0.1em] text-white/40">
                    Objectif d'épargne {anneeAffichee}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-4 w-20 bg-white/20 rounded animate-pulse" />
                    <span className="text-white/30 text-[10px] font-bold">/ Objectif</span>
                  </div>
                </div>
              </div>
              <div className="h-5 w-10 bg-amber-500/20 border border-amber-500/30 rounded-lg animate-pulse" />
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden mt-3">
              <div className="h-full w-2/3 bg-amber-400/40 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Graphique 1 avec vrai titre et vraies légendes */}
          <div className="flex-1 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col justify-between min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-xs uppercase tracking-wider">
                Évolution Patrimoine
              </h3>
              <div className="flex gap-3 text-[9px] font-black uppercase text-white/40">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Revenus</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Dépenses</span>
              </div>
            </div>
            {/* Onde graphique factice */}
            <div className="flex-1 w-full bg-black/20 rounded-xl flex items-end p-3 gap-1.5 overflow-hidden">
              {[35, 55, 45, 75, 60, 85, 70, 95, 65, 80, 75, 90].map((h, idx) => (
                <div 
                  key={idx} 
                  style={{ height: `${h}%` }} 
                  className="flex-1 bg-gradient-to-t from-emerald-500/10 to-emerald-400/30 rounded-t animate-pulse" 
                />
              ))}
            </div>
          </div>

          {/* Graphique 2 avec vrai titre */}
          <div className="flex-1 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col justify-between min-h-0">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white font-bold text-xs uppercase tracking-wider">
                Détail des comptes
              </h3>
              <div className="h-2 w-24 bg-white/10 rounded" />
            </div>
            {/* Onde graphique factice */}
            <div className="flex-1 w-full bg-black/20 rounded-xl flex items-end p-3 gap-1.5 overflow-hidden">
              {[45, 60, 50, 65, 70, 80, 75, 88, 82, 92, 85, 98].map((h, idx) => (
                <div 
                  key={idx} 
                  style={{ height: `${h}%` }} 
                  className="flex-1 bg-gradient-to-t from-indigo-500/10 to-indigo-400/30 rounded-t animate-pulse" 
                />
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}