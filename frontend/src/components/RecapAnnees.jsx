import React, { useMemo, useState } from 'react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { recapParAnnee } from '../utils/finance';

const AXE = { fill: 'color-mix(in srgb, var(--text-main) 50%, transparent)', fontSize: 11 };
const GRILLE = 'color-mix(in srgb, var(--text-main) 5%, transparent)';

const euros = (valeur, decimales = 0) =>
  `${Number(valeur).toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} €`;
const eurosSignes = (valeur, decimales = 0) => `${valeur > 0 ? '+' : ''}${euros(valeur, decimales)}`;
// Une décimale : sinon 1 600 € et 2 400 € s'affichent tous les deux « 2k€ ».
const axeEuros = (valeur) =>
  Math.abs(valeur) >= 1000 ? `${(valeur / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k€` : `${valeur}€`;

function InfoBulle({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)]/95 backdrop-blur-[var(--glass-blur)] border border-white/10 p-3 rounded-2xl shadow-2xl space-y-1.5 min-w-[180px] select-none">
      <p className="text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/5 pb-1.5">{label}</p>
      {payload.map((ligne) => (
        <div key={ligne.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-white/70 font-bold uppercase text-[11px]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ligne.color }} />
            {ligne.name}
          </span>
          <span className="font-mono font-black text-white">{euros(ligne.value, 2)}</span>
        </div>
      ))}
    </div>
  );
}

/** Récap année par année : flux, patrimoine et tableau. Une année s'ajoute d'elle-même dès qu'elle commence. */
export default function RecapAnnees({ comptes, transactions, profil, userTheme = {}, mobile = false }) {
  const [masquees, setMasquees] = useState({});

  const couleurs = {
    revenus: userTheme.color_revenus || '#10b981',
    depenses: userTheme.color_depenses || '#f43f5e',
    epargne: userTheme.color_epargne || '#ffffff',
    patrimoine: userTheme.color_patrimoine || '#37b58f',
  };

  const recap = useMemo(
    () => recapParAnnee({ comptes, transactions, profil, anneeCourante: new Date().getFullYear() }),
    [comptes, transactions, profil],
  );

  const flux = recap.map((r) => ({ ...r, libelle: r.enCours ? `${r.annee} (en cours)` : String(r.annee) }));
  const patrimoine = recap.length
    ? [
        { libelle: `Début ${recap[0].annee}`, solde: recap[0].soldeDebut },
        ...flux.map((r) => ({ libelle: r.libelle, solde: r.soldeFin })),
      ]
    : [];

  const series = [
    { cle: 'revenus', nom: 'Revenus' },
    { cle: 'depenses', nom: 'Dépenses' },
    { cle: 'epargne', nom: 'Épargne' },
  ];
  // Sur ordinateur, tout est déjà dans le bloc d'Analytique. Sur mobile, chaque graphique a sa carte, comme les autres.
  const carte = mobile
    ? 'bg-[var(--glass-bg)] border border-white/10 flex flex-col shadow-2xl backdrop-blur-[var(--glass-blur)] rounded-xl p-3'
    : 'flex flex-col';
  const colonnes = mobile ? 'grid-cols-[0.8fr_1fr_1fr_1fr_1.15fr]' : 'grid-cols-[0.7fr_1fr_1fr_1fr_0.55fr_1.1fr]';

  return (
    <div className={mobile ? 'space-y-3' : 'flex-1 flex flex-col min-h-0 gap-2 animate-in fade-in duration-500'}>
      <section className={`${carte} ${mobile ? '' : 'flex-1 min-h-0'}`}>
        <div className="flex items-center justify-between gap-3 mb-2 shrink-0">
          <h4 className="text-[var(--text-main)]/70 font-bold text-xs">Flux par année</h4>
          <div className="flex items-center gap-3">
            {series.map(({ cle, nom }) => (
              <button
                key={cle}
                type="button"
                onClick={() => setMasquees((etat) => ({ ...etat, [cle]: !etat[cle] }))}
                aria-pressed={!masquees[cle]}
                className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity"
                style={{ opacity: masquees[cle] ? 0.3 : 1 }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: couleurs[cle] }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/50">{nom}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={mobile ? 'h-[200px] w-full min-w-0' : 'flex-1 w-full min-h-[130px] min-w-0'}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={flux} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
              <defs>
                {series.map(({ cle }) => (
                  <linearGradient key={cle} id={`recap-${cle}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={couleurs[cle]} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={couleurs[cle]} stopOpacity={0.3} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRILLE} vertical={false} />
              <XAxis dataKey="libelle" axisLine={false} tickLine={false} tick={AXE} dy={6} />
              <YAxis axisLine={false} tickLine={false} tick={AXE} width={48} tickFormatter={axeEuros} />
              <ReferenceLine y={0} stroke="color-mix(in srgb, var(--text-main) 25%, transparent)" />
              <Tooltip content={<InfoBulle />} cursor={{ fill: 'color-mix(in srgb, var(--text-main) 5%, transparent)' }} />
              {series.map(({ cle, nom }) => (
                <Bar
                  key={cle}
                  dataKey={cle}
                  name={nom}
                  color={couleurs[cle]}
                  fill={`url(#recap-${cle})`}
                  hide={!!masquees[cle]}
                  maxBarSize={44}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={`${carte} ${mobile ? '' : 'flex-1 min-h-0'}`}>
        <h4 className="text-[var(--text-main)]/70 font-bold text-xs mb-1 shrink-0">Patrimoine au fil des années</h4>
        <div className={mobile ? 'h-[170px] w-full min-w-0' : 'flex-1 w-full min-h-[110px] min-w-0'}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <AreaChart data={patrimoine} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="recap-patrimoine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={couleurs.patrimoine} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={couleurs.patrimoine} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRILLE} vertical={false} />
              <XAxis dataKey="libelle" axisLine={false} tickLine={false} tick={AXE} dy={6} padding={{ left: 16, right: 16 }} />
              <YAxis axisLine={false} tickLine={false} tick={AXE} width={48} tickFormatter={axeEuros} />
              <Tooltip content={<InfoBulle />} cursor={{ stroke: 'color-mix(in srgb, var(--text-main) 15%, transparent)', strokeWidth: 2 }} />
              <Area
                type="monotone"
                dataKey="solde"
                name="Patrimoine"
                color={couleurs.patrimoine}
                stroke={couleurs.patrimoine}
                strokeWidth={3}
                fill="url(#recap-patrimoine)"
                dot={{ r: 4, fill: couleurs.patrimoine, strokeWidth: 1, stroke: 'var(--text-main)' }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={`${carte} shrink-0 ${mobile ? '' : 'border-t border-white/10 pt-2'}`}>
        <div className={`grid ${colonnes} gap-2 px-2 mb-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-[var(--text-main)]/40 text-right`}>
          <span className="text-left">Année</span>
          <span>Revenus</span>
          <span>Dépenses</span>
          <span>Épargne</span>
          {!mobile && <span>Taux</span>}
          <span>Patrimoine</span>
        </div>
        <div className="flex flex-col gap-1 max-h-[104px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--text-main)_20%,transparent)_transparent]">
          {[...recap].reverse().map((r) => (
            <div
              key={r.annee}
              className={`grid ${colonnes} gap-2 items-center px-2 py-1.5 rounded-xl border text-right text-[11px] font-black tracking-tight ${
                r.enCours ? 'bg-white/[0.03] border-white/20' : 'bg-[var(--glass-bg)] border-white/5'
              }`}
            >
              <span className="text-left text-[var(--text-main)]/80">
                {r.annee}
                {r.enCours && <span className="block text-[8px] font-bold text-[var(--text-main)]/40 tracking-normal">en cours</span>}
              </span>
              <span style={{ color: couleurs.revenus }}>{euros(r.revenus)}</span>
              <span style={{ color: couleurs.depenses }}>-{euros(r.depenses)}</span>
              <span style={{ color: r.epargne >= 0 ? couleurs.epargne : couleurs.depenses }}>{eurosSignes(r.epargne)}</span>
              {!mobile && <span className="text-[var(--text-main)]/60">{r.tauxEpargne === null ? '—' : `${r.tauxEpargne} %`}</span>}
              <span style={{ color: couleurs.patrimoine }}>{euros(r.soldeFin)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
