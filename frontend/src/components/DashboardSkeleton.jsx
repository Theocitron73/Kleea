import { Trophy, Search, List, PieChart, CalendarDays, Sparkles, ArrowUpCircle, ArrowDownCircle, RefreshCw, BarChartHorizontal, TrendingUp, Zap, Repeat } from 'lucide-react';

// Squelette du tableau de bord : même découpage que DashboardView (bureau et téléphone),
// seuls les montants et les libellés propres aux données pulsent.

const ONGLETS_FLUX = [
  { icone: ArrowUpCircle, label: 'Revenus' },
  { icone: ArrowDownCircle, label: 'Dépenses' },
  { icone: RefreshCw, label: 'Transferts' },
  { icone: BarChartHorizontal, label: 'Catégories' },
  { icone: TrendingUp, label: 'Variations' },
  { icone: Zap, label: 'Insights' },
  { icone: Repeat, label: 'Abonnements' },
];
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const Barre = ({ className = '' }) => <div className={`rounded-sm animate-pulse ${className}`} />;

function LigneFlux({ compact = false }) {
  return (
    <div className={`${compact ? 'px-2.5 py-2' : 'px-3 py-1.5'} rounded-xl border border-white/5 bg-white/[0.03] flex items-center gap-3`}>
      <div className="flex flex-col items-center justify-center gap-1 min-w-[34px] h-9 bg-black/30 rounded-lg border border-white/5">
        <Barre className="h-2 w-3.5 bg-white/20" />
        <Barre className="h-1.5 w-4 bg-white/10" />
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex justify-between items-center gap-2">
          <Barre className="h-2.5 w-28 bg-white/15" />
          <Barre className="h-3 w-14 bg-white/20" />
        </div>
        <div className="flex justify-between items-center gap-2">
          <Barre className="h-2 w-16 bg-white/10" />
          <Barre className="h-2 w-12 bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function CarteCompte() {
  return (
    <div className="h-full p-3 rounded-[var(--radius)] flex flex-col justify-between bg-[var(--glass-bg)] border border-white/10">
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <Barre className="h-2 w-12 bg-white/10" />
          <Barre className="h-3 w-24 bg-white/20" />
        </div>
        <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10" />
      </div>
      <div>
        <span className="text-[8.5px] font-black uppercase text-white/40 block mb-1">Solde</span>
        <Barre className="h-5 w-24 bg-white/20" />
      </div>
    </div>
  );
}

// Courbe factice qui rappelle les graphiques de la colonne Analytique.
function Courbe({ couleur, chemin }) {
  return (
    <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="w-full h-full animate-pulse" aria-hidden="true">
      {[20, 45, 70].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="currentColor" className="text-white/5" />)}
      <path d={`${chemin} L300,100 L0,100 Z`} fill={couleur} opacity="0.12" />
      <path d={chemin} fill="none" stroke={couleur} strokeOpacity="0.5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Legende({ items }) {
  return (
    <div className="flex justify-end gap-3 text-[9px] font-black uppercase text-white/30 tracking-wider">
      {items.map(([label, couleur]) => (
        <span key={label} className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: couleur }} />{label}</span>
      ))}
    </div>
  );
}

function Bureau({ profil, mois, annee, couleurPatrimoine }) {
  return (
    <div className="hidden lg:flex flex-col px-4 md:px-8 h-[calc(99vh-100px)] overflow-hidden">

      {/* BARRE DE FILTRES */}
      <div className="shrink-0 flex flex-wrap items-center gap-4 mb-4 p-3 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius)] border border-white/10">
        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
          {profil
            ? <span className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-white text-slate-900 shadow-sm">{profil}</span>
            : <Barre className="h-[26px] w-20 bg-white/20 rounded-lg" />}
        </div>
        <div className="w-px h-6 bg-[var(--glass-bg)]" />
        <div className="flex items-center gap-1">
          <Barre className="h-[26px] w-[38px] bg-white/5 rounded-lg" />
          {mois
            ? <span className="min-w-[38px] px-1 py-1.5 rounded-lg text-[10px] font-black text-center bg-[var(--primary)] text-white">{mois.substring(0, 3).toUpperCase()}</span>
            : <Barre className="h-[26px] w-[38px] bg-[var(--primary)]/40 rounded-lg" />}
        </div>
        <div className="w-px h-6 bg-[var(--glass-bg)]" />
        <div className="flex items-center gap-1">
          <Barre className="h-[26px] w-12 bg-white/5 rounded-lg" />
          <span className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-emerald-500 text-white">{annee}</span>
        </div>
      </div>

      {/* CARTES : PATRIMOINE + COMPTES */}
      <div className="shrink-0 grid grid-cols-12 gap-4 mb-2 h-[118px]">
        <div className="col-span-2 pb-2">
          <div
            className="h-full rounded-[var(--radius)] p-3 flex flex-col justify-between shadow-xl"
            style={{ background: `linear-gradient(135deg, ${couleurPatrimoine}66 0%, ${couleurPatrimoine}33 100%)`, border: `1px solid ${couleurPatrimoine}33` }}
          >
            <div className="space-y-1.5">
              <span className="text-[9px] text-white/50 uppercase font-black tracking-tighter italic">{profil || 'Patrimoine'}</span>
              <p className="text-[10px] text-white/80 font-black truncate">{[mois, annee].filter(Boolean).join(' ')}</p>
            </div>
            <div>
              <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-1">Total</p>
              <Barre className="h-5 w-28 bg-white/25" />
            </div>
          </div>
        </div>
        <div className="col-span-10 flex gap-3 pb-2 min-w-0">
          {[1, 2, 3].map((i) => <div key={i} className="flex-1 min-w-0"><CarteCompte /></div>)}
        </div>
      </div>

      {/* GRILLE CENTRALE */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 mb-4">

        {/* COLONNE 1 : FLUX MENSUEL */}
        <div className="col-span-4 flex flex-col min-h-0 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-3 xl:p-2.5 shrink-0 border-b border-white/10 flex items-center justify-between gap-2">
            <div className="flex flex-col shrink-0">
              <h3 className="text-lg xl:text-2xl leading-8 font-black text-white tracking-tight uppercase whitespace-nowrap">Flux mensuel</h3>
              <div className="mt-1.5 h-3 flex items-center gap-2.5">
                <div className="h-1 w-10 bg-indigo-500 rounded-full shrink-0" />
                <span className="text-secondary-400 text-[9px] leading-none font-black tracking-[0.2em] uppercase whitespace-nowrap">{[mois, annee].filter(Boolean).join(' ')}</span>
              </div>
            </div>
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-0 xl:gap-1">
              {ONGLETS_FLUX.map((onglet, i) => {
                const Icone = onglet.icone;
                return (
                  <span key={onglet.label} className={`w-5 h-6 xl:w-7 xl:h-7 flex items-center justify-center rounded-lg ${i === 0 ? 'bg-[var(--glass-bg)] text-white border border-white/5' : 'text-white/30'}`}>
                    <Icone className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  </span>
                );
              })}
            </div>
          </div>

          <div className="px-4 pt-3 shrink-0">
            <div className="flex justify-between items-center px-1 pb-2 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-white/40 text-[10px] uppercase font-black tracking-wider whitespace-nowrap">Total revenus</span>
                <Barre className="h-4 w-20 bg-white/10 rounded-full" />
                <div className="relative w-36 ml-1 bg-black/30 border border-white/10 rounded-lg pl-7 pr-3 py-1 hidden xl:flex items-center">
                  <Search size={11} className="absolute left-2.5 text-white/30" />
                  <span className="text-[10px] text-white/20">Rechercher...</span>
                </div>
              </div>
              <Barre className="h-6 w-20 bg-emerald-500/25 rounded-md" />
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden p-4 space-y-1.5">
            {[1, 2, 3, 4, 5, 6].map((i) => <LigneFlux key={i} />)}
          </div>

          <div className="shrink-0 p-4 bg-white/[0.02] border-t border-white/10 flex flex-col gap-3">
            <h3 className="text-white/30 font-black text-[9px] uppercase tracking-[0.2em]">Objectifs Budgétaires</h3>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center min-w-[80px] p-2 bg-white/[0.01] border border-white/[0.03] rounded-xl">
                  <div className="w-14 h-7 border-[5px] border-b-0 border-white/10 rounded-t-full mb-1.5" />
                  <Barre className="h-2 w-12 bg-white/10 mb-1" />
                  <Barre className="h-2 w-8 bg-white/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLONNE 2 : BILAN ANNUEL + TOTAUX */}
        <div className="col-span-4 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 flex flex-col overflow-hidden shadow-2xl">
            <div className="p-3 xl:p-2.5 shrink-0 border-b border-white/10 flex items-center justify-between gap-2">
              <div className="flex flex-col shrink-0">
                <div className="h-8 flex items-baseline gap-2 xl:gap-3">
                  <h3 className="text-lg xl:text-2xl leading-8 font-black text-white tracking-tight uppercase whitespace-nowrap">Bilan Annuel</h3>
                  <span className="border-l border-white/10 pl-2 xl:pl-3 text-emerald-500 text-[10px] font-black tracking-[0.2em]">{annee}</span>
                </div>
                <div className="mt-1.5 h-3 flex items-center gap-2.5">
                  <div className="h-1 w-10 bg-emerald-500 rounded-full shrink-0" />
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">Solde 1er janvier :</span>
                  <Barre className="h-3 w-12 bg-emerald-500/25" />
                </div>
              </div>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                {[List, PieChart, CalendarDays, Sparkles].map((Icone, i) => (
                  <span key={i} className={`px-1 xl:px-3 py-1.5 rounded-lg ${i === 0 ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}><Icone size={14} /></span>
                ))}
              </div>
            </div>

            <div className="flex-1 min-h-0 p-2 flex flex-col">
              <div className="grid grid-cols-12 px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/30 shrink-0">
                <span className="col-span-3">Mois</span>
                <span className="col-span-2 text-right pr-1">Revenus</span>
                <span className="col-span-2 text-right pr-1">Dépenses</span>
                <span className="col-span-2 text-center">Épargne</span>
                <span className="col-span-3 text-right">Cumul</span>
              </div>
              <div className="flex-1 min-h-0 flex flex-col justify-between gap-0.5 overflow-hidden">
                {MOIS.map((nom) => (
                  <div key={nom} className="flex-1 max-h-7 grid grid-cols-12 items-center px-3 rounded-lg border border-white/[0.03] bg-white/[0.01]">
                    <span className="col-span-3 text-[11px] font-black uppercase text-white/60">{nom}</span>
                    <div className="col-span-2 flex justify-end pr-1"><Barre className="h-2.5 w-10 bg-emerald-500/20" /></div>
                    <div className="col-span-2 flex justify-end pr-1"><Barre className="h-2.5 w-10 bg-rose-500/20" /></div>
                    <div className="col-span-2 flex justify-center"><Barre className="h-3 w-10 bg-white/10 rounded-full" /></div>
                    <div className="col-span-3 flex justify-end"><Barre className="h-3 w-16 bg-emerald-500/25" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] shadow-xl shrink-0">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Totaux</span>
              <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-[var(--glass-bg)] text-white">Annuel</span>
                <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider text-white/30">Période</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[['Total Revenus', 'bg-emerald-500/25'], ['Total Dépenses', 'bg-rose-500/25'], ['Net Épargné', 'bg-white/20']].map(([label, couleur]) => (
                <div key={label} className="bg-black/20 p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-white/20 uppercase mb-1 truncate">{label}</p>
                  <Barre className={`h-4 w-16 ${couleur}`} />
                </div>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[7px] font-black uppercase text-white/20 leading-none">
                <span>Consommé</span><span className="text-emerald-400/60">Épargné</span>
              </div>
              <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div className="h-full w-2/3 bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* COLONNE 3 : ANALYTIQUE */}
        <div className="col-span-4 flex flex-col min-h-0">
          <div className="flex bg-slate-900/50 p-1.5 rounded-[var(--radius)] mb-2 border border-white/5 w-fit self-center shrink-0">
            {['Analytique', 'Épargne & Projets', 'Placements & crédits'].map((label, i) => (
              <span key={label} className={`px-3.5 py-2 whitespace-nowrap rounded-[calc(var(--radius)*0.75)] text-[10px] font-black uppercase tracking-[0.06em] ${i === 0 ? 'bg-white text-slate-900 shadow-xl' : 'text-white/30'}`}>{label}</span>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-h-0 gap-3">
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-3.5 shadow-2xl shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400/70"><Trophy size={16} /></div>
                  <div>
                    <h4 className="text-white/40 text-[9px] font-black uppercase tracking-[0.1em]">Objectif d'épargne {annee}</h4>
                    <div className="flex items-center gap-1.5 mt-1"><Barre className="h-4 w-20 bg-white/20" /><Barre className="h-2.5 w-14 bg-white/10" /></div>
                  </div>
                </div>
                <Barre className="h-6 w-10 bg-amber-500/20 rounded-lg" />
              </div>
              <div className="mt-3 h-2.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10">
                <div className="h-full w-1/2 bg-amber-400/30 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-h-0 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col gap-2 shadow-2xl">
              <div className="flex items-center justify-between gap-3 shrink-0">
                <h3 className="text-white font-bold text-sm">Évolution Patrimoine</h3>
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white text-slate-900">Mois</span>
                  <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-white/40">Années</span>
                </div>
              </div>
              <Legende items={[['Revenus', '#10b981'], ['Dépenses', '#f43f5e'], ['Épargne', '#ffffff']]} />
              <div className="flex-1 min-h-0">
                <Courbe couleur="#10b981" chemin="M0,85 L30,82 L60,78 L90,80 L120,70 L150,72 L180,60 L210,62 L240,45 L270,40 L300,30" />
              </div>
              <Legende items={[['Comptes', 'var(--primary)']]} />
              <div className="flex-1 min-h-0">
                <Courbe couleur="#818cf8" chemin="M0,70 L30,68 L60,66 L90,64 L120,62 L150,58 L180,55 L210,50 L240,46 L270,40 L300,35" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Mobile({ profil, mois, annee, couleurPatrimoine }) {
  return (
    <div className="flex lg:hidden flex-col pb-4 px-0.5 pt-1">
      <div className="mb-2 mt-1 px-1">
        <h1 className="text-2xl font-black tracking-tight leading-none text-[var(--text-main)]">Dashboard</h1>
        <p className="text-[var(--text-main)]/45 text-[13px] font-medium mt-1">Récaps, prévisions & graphiques</p>
      </div>

      {/* SÉLECTEUR DE PÉRIODE */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-2 rounded-2xl mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-1 bg-black/30 p-1 rounded-xl">
            {profil
              ? <span className="h-9 flex items-center rounded-lg px-3 text-[13px] font-bold bg-white text-slate-900">{profil}</span>
              : <Barre className="h-9 w-20 bg-white/20 rounded-lg" />}
          </div>
          <div className="flex shrink-0 gap-1 bg-black/30 p-1 rounded-xl">
            <span className="h-9 flex items-center rounded-lg px-2.5 text-[13px] font-bold bg-emerald-500 text-white">{annee}</span>
          </div>
        </div>
        <div className="flex gap-1 overflow-hidden">
          <Barre className="h-9 w-[3.25rem] shrink-0 bg-black/20 rounded-lg" />
          {mois
            ? <span className="h-9 min-w-[3.25rem] flex items-center justify-center rounded-lg px-2 text-[13px] font-bold bg-[var(--primary)] text-white">{/^jui/i.test(mois) ? mois.substring(0, 4) : mois.substring(0, 3)}</span>
            : <Barre className="h-9 w-[3.25rem] shrink-0 bg-[var(--primary)]/40 rounded-lg" />}
        </div>
      </div>

      {/* ONGLETS */}
      <div className="onglets-mobile flex border-b border-white/5 mb-3 shrink-0">
        {['Flux & comptes', 'Bilan annuel', 'Graphes'].map((label, i) => (
          <span key={label} className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider border-b-2 ${i === 0 ? 'border-[var(--secondary)] text-[var(--secondary)]' : 'border-transparent text-white/40'}`}>{label}</span>
        ))}
      </div>

      <div className="space-y-3">
        <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${couleurPatrimoine}66 0%, ${couleurPatrimoine}33 100%)` }}>
          <div>
            <p className="text-white/60 text-[7px] font-black uppercase tracking-widest leading-none mb-1.5">Patrimoine</p>
            <Barre className="h-5 w-32 bg-white/25" />
          </div>
          {profil && <span className="text-[8.5px] uppercase font-black tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-md">{profil}</span>}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            {/* Pas de libellé « Mes comptes » : le vrai tableau, monté derrière, porte déjà ce texte. */}
            <Barre className="h-2.5 w-24 bg-white/10" />
            <span className="px-2 py-0.5 rounded-lg border bg-white/5 border-white/10 text-white/50 text-[8px] font-black uppercase">Réorganiser ⇅</span>
          </div>
          <div className="flex gap-2 pb-1.5 overflow-hidden">
            {[1, 2].map((i) => <div key={i} className="w-[72%] max-w-[280px] h-[104px] shrink-0"><CarteCompte /></div>)}
          </div>
        </div>

        <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
          <span className="text-[13px] font-bold text-white/80">Flux mensuel</span>
          <div className="-mx-3 px-3 flex gap-1.5 overflow-hidden">
            {ONGLETS_FLUX.slice(0, 4).map((onglet, i) => {
              const Icone = onglet.icone;
              return (
                <span key={onglet.label} className={`shrink-0 h-9 flex items-center gap-1.5 pl-2.5 pr-3 rounded-full border text-[13px] font-semibold whitespace-nowrap ${i === 0 ? 'bg-white text-slate-900 border-white' : 'bg-white/[0.04] text-white/65 border-white/10'}`}>
                  <Icone size={15} />{onglet.label}
                </span>
              );
            })}
          </div>
          <div className="relative bg-black/30 border border-white/10 rounded-lg pl-7 py-1.5 flex items-center">
            <Search size={11} className="absolute left-2.5 text-white/30" />
            <span className="text-[10.5px] font-medium text-white/20">Filtrer les flux...</span>
          </div>
          <div className="space-y-1">
            {[1, 2, 3, 4].map((i) => <LigneFlux key={i} compact />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardSkeleton({ filters = {}, userTheme = {}, isFadingOut = false }) {
  const props = {
    // « Tous » n'est plus un profil affiché : on garde alors un emplacement neutre.
    profil: filters?.profil && filters.profil !== 'Tous' ? filters.profil : null,
    mois: filters?.mois || null,
    annee: filters?.annee || new Date().getFullYear(),
    couleurPatrimoine: userTheme?.color_patrimoine || '#37b58f',
  };

  return (
    <div className={`w-full select-none transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`} aria-busy="true" aria-label="Chargement du tableau de bord">
      <Bureau {...props} />
      <Mobile {...props} />
    </div>
  );
}
