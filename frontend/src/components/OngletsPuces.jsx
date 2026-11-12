import { useEffect, useRef } from 'react';
import { centrerDansRangee } from '../utils/defilerVers';

/**
 * Onglets en pastilles pour téléphone : icône et libellé, assez hauts pour le pouce.
 * Quand ils ne tiennent pas tous, la rangée défile et l'onglet choisi reste visible.
 */
export default function OngletsPuces({ onglets, actif, choisir, libelle }) {
  const rangee = useRef(null);

  useEffect(() => {
    centrerDansRangee(rangee.current, rangee.current?.querySelector('[aria-pressed="true"]'));
  }, [actif]);

  return (
    <div ref={rangee} role="group" aria-label={libelle} className="relative -mx-3 px-3 flex gap-1.5 overflow-x-auto no-scrollbar snap-x scroll-px-3">
      {onglets.map(({ id, label, icon: Icone, title }) => {
        const estActif = actif === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => choisir(id)}
            title={title || label}
            aria-pressed={estActif}
            className={`snap-start shrink-0 h-9 flex items-center gap-1.5 pl-2.5 pr-3 rounded-full border text-[13px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              estActif
                ? 'bg-white text-slate-900 border-white'
                : 'bg-white/[0.04] text-white/65 border-white/10 active:bg-white/10'
            }`}
          >
            {Icone && <Icone size={15} aria-hidden="true" />}
            {label}
          </button>
        );
      })}
    </div>
  );
}
