import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import { calculerDepensesMensuellesParCategorie } from '../utils/calculsAnalyse';

const MOIS_COURTS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
// Largeurs des colonnes en pixels : les mois se partagent le reste, jamais moins de LARGEUR_MOIS chacun.
const LARGEUR_CATEGORIE = 112;
const LARGEUR_TOTAL = 50;
const LARGEUR_MOIS = 32;
const nombre = (n) => Math.round(n).toLocaleString('fr-FR');

/**
 * Les dépenses de l'année en tableau : une ligne par catégorie, une colonne par mois, et les totaux.
 * Les colonnes vont de janvier au dernier mois qui a des dépenses. Plus une case est foncée, plus la dépense est grosse.
 * Il ne défile jamais en largeur : quand tous les mois ne tiennent pas, il montre les plus récents qui tiennent en entier,
 * et les flèches ‹ › passent aux autres.
 */
export default function DepensesMensuelles({ comptes = [], filters = {}, toutesLesTransactions = [], couleurDepenses = '#f43f5e' }) {
  const { mois, lignes, totalAnnee, maximum } = useMemo(() => {
    const parMois = calculerDepensesMensuellesParCategorie({ comptes, filters, toutesLesTransactions });
    const dernier = parMois.reduce((d, m) => (m.total > 0 ? m.mois : d), -1);
    const affiches = parMois.slice(0, dernier + 1);
    const parCategorie = {};
    affiches.forEach((m) => m.categories.forEach((c) => {
      parCategorie[c.name] = parCategorie[c.name] || { name: c.name, total: 0, valeurs: Array(affiches.length).fill(0) };
      parCategorie[c.name].valeurs[m.mois] = c.value;
      parCategorie[c.name].total += c.value;
    }));
    const triees = Object.values(parCategorie).sort((a, b) => b.total - a.total);
    return {
      mois: affiches,
      lignes: triees,
      totalAnnee: affiches.reduce((s, m) => s + m.total, 0),
      maximum: Math.max(1, ...triees.flatMap((l) => l.valeurs)),
    };
  }, [comptes, filters, toutesLesTransactions]);

  // Le nombre de mois qui tiennent en entier se déduit de la largeur du tableau.
  const [largeur, setLargeur] = useState(null);
  const [decalage, setDecalage] = useState(0); // mois cachés à droite, les plus récents
  const conteneur = useCallback((boite) => {
    if (!boite || typeof ResizeObserver === 'undefined') return undefined;
    const observateur = new ResizeObserver(() => setLargeur(boite.clientWidth));
    observateur.observe(boite);
    return () => observateur.disconnect();
  }, []);
  const nbVisibles = largeur ? Math.max(1, Math.floor((largeur - LARGEUR_CATEGORIE - LARGEUR_TOTAL) / LARGEUR_MOIS)) : 12;

  const nb = Math.min(nbVisibles, mois.length);
  const decal = Math.min(decalage, mois.length - nb);
  const fin = mois.length - decal;
  const visibles = mois.slice(fin - nb, fin);
  const tronque = nb < mois.length;

  if (!lignes.length) {
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center text-[10px] font-black uppercase text-white/10 tracking-widest italic">
        Aucune dépense
      </div>
    );
  }

  const fond = (valeur) => (valeur > 0
    ? `color-mix(in srgb, ${couleurDepenses} ${Math.round(8 + (valeur / maximum) * 47)}%, transparent)`
    : undefined);
  const enTete = 'sticky top-0 bg-[var(--surface)] px-[3px] py-1.5 text-[8px] font-black uppercase text-white/40';
  const premiereColonne = 'sticky left-0 z-[5] bg-[var(--surface)]';

  return (
    <div ref={conteneur} className="depenses-mensuelles h-full w-full overflow-y-auto overflow-x-hidden custom-scrollbar rounded-xl border border-white/5 animate-in fade-in duration-300">
      <table className="w-full table-fixed border-collapse text-[9.5px] tabular-nums" aria-label="Dépenses par catégorie et par mois">
        <colgroup>
          <col style={{ width: LARGEUR_CATEGORIE }} />
          {visibles.map((m) => <col key={m.mois} />)}
          <col style={{ width: LARGEUR_TOTAL }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className={`${enTete} left-0 z-20 pl-1.5 text-left`}>
              {tronque ? (
                <span className="flex items-center gap-0.5 normal-case">
                  <button type="button" onClick={() => setDecalage(decal + 1)} disabled={fin - nb <= 0} aria-label="Mois précédents"
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default">
                    <ChevronLeft size={12} />
                  </button>
                  <button type="button" onClick={() => setDecalage(decal - 1)} disabled={decal <= 0} aria-label="Mois suivants"
                    className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent cursor-pointer disabled:cursor-default">
                    <ChevronRight size={12} />
                  </button>
                </span>
              ) : 'Catégorie'}
            </th>
            {visibles.map((m) => (
              <th key={m.mois} scope="col" className={`${enTete} z-10 text-right whitespace-nowrap`}>{MOIS_COURTS[m.mois]}</th>
            ))}
            <th scope="col" className={`${enTete} z-10 pr-1.5 text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l) => (
            <tr key={l.name} className="border-t border-white/[0.04] hover:bg-white/[0.03]">
              <th scope="row" className={`${premiereColonne} pl-1.5 pr-1 py-1 text-left font-semibold text-white/70`}>
                <span className="flex items-center gap-1 min-w-0">
                  <CategoryIcon name={l.name} size={10} />
                  <span className="truncate" title={l.name}>{getCleanCategoryName(l.name)}</span>
                </span>
              </th>
              {visibles.map(({ mois: i }) => l.valeurs[i]).map((v, j) => ({ v, i: visibles[j].mois })).map(({ v, i }) => (
                <td
                  key={i}
                  className={`px-[3px] py-1 text-right font-semibold whitespace-nowrap ${v > 0 ? 'text-white/85' : 'text-white/15'}`}
                  style={{ backgroundColor: fond(v) }}
                  title={v > 0 ? `${getCleanCategoryName(l.name)}, ${NOMS_MOIS[i]} : ${v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : undefined}
                >
                  {v > 0 ? nombre(v) : '·'}
                </td>
              ))}
              <td className="pl-1 pr-1.5 py-1 text-right font-black text-white whitespace-nowrap">{nombre(l.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-white/15">
            <th scope="row" className={`${premiereColonne} pl-1.5 pr-1 py-1.5 text-left text-[8px] font-black uppercase text-white/50`}>Total</th>
            {visibles.map((m) => (
              <td key={m.mois} className="px-[3px] py-1.5 text-right font-black whitespace-nowrap" style={{ color: couleurDepenses }}>
                {m.total > 0 ? nombre(m.total) : '·'}
              </td>
            ))}
            <td className="pl-1 pr-1.5 py-1.5 text-right font-black whitespace-nowrap" style={{ color: couleurDepenses }}>{nombre(totalAnnee)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
