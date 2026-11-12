import { useEffect, useRef } from 'react';
import { centrerDansRangee } from '../utils/defilerVers';

/**
 * Profil, année et mois sur téléphone : des boutons assez grands pour le pouce,
 * et le mois choisi toujours visible, même en fin d'année.
 */
// Juin et Juillet ne se distinguent pas sur trois lettres.
const abreger = (mois) => (/^jui/i.test(mois) ? mois.substring(0, 4) : mois.substring(0, 3));

export default function SelecteurPeriodeMobile({ profils, filters, setFilters, annees, mois }) {
  const rangeeMois = useRef(null);
  const rangeeProfils = useRef(null);

  useEffect(() => {
    centrerDansRangee(rangeeMois.current, rangeeMois.current?.querySelector('[aria-pressed="true"]'));
  }, [filters.mois, filters.annee, mois.length]);
  useEffect(() => {
    centrerDansRangee(rangeeProfils.current, rangeeProfils.current?.querySelector('[aria-pressed="true"]'));
  }, [filters.profil, profils.length]);

  const bouton = (choisi) => `h-9 shrink-0 rounded-lg px-3 text-[13px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
    choisi ? 'bg-white text-slate-900' : 'text-white/55 active:bg-white/10'
  }`;

  return (
    <div className="bg-[var(--glass-bg)] border border-white/10 p-2 rounded-2xl mb-3 space-y-2">
      <div className="flex items-center gap-2">
        <div ref={rangeeProfils} role="group" aria-label="Profil" className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar bg-black/30 p-1 rounded-xl">
          {profils.map((p) => {
            const choisi = filters.profil?.toLowerCase() === p?.toLowerCase();
            return (
              <button key={p} type="button" aria-pressed={choisi} onClick={() => setFilters({ ...filters, profil: p })} className={bouton(choisi)}>
                {p}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Année" className="flex shrink-0 gap-1 bg-black/30 p-1 rounded-xl">
          {annees.map((annee) => {
            const choisie = filters.annee?.toString() === annee;
            return (
              <button key={annee} type="button" aria-pressed={choisie} onClick={() => setFilters({ ...filters, annee })} className={`h-9 rounded-lg px-2.5 text-[13px] font-bold cursor-pointer ${choisie ? 'bg-emerald-500 text-white' : 'text-white/55 active:bg-white/10'}`}>
                {annee}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={rangeeMois} role="group" aria-label="Mois" className="flex gap-1 overflow-x-auto no-scrollbar select-none">
        {mois.map((m) => {
          const choisi = filters.mois === m.v;
          return (
            <button
              key={m.v}
              type="button"
              aria-pressed={choisi}
              aria-label={m.l}
              onClick={() => setFilters({ ...filters, mois: m.v })}
              className={`h-9 min-w-[3.25rem] shrink-0 rounded-lg px-2 text-[13px] font-bold transition-colors cursor-pointer ${
                choisi ? 'bg-[var(--primary)] text-white' : 'bg-black/20 text-white/50 active:bg-white/10'
              }`}
            >
              {abreger(m.l)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
