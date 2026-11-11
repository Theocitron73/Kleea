import { useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { EyeOff } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import { GRIS_AUTRES, couleursParCategorie } from '../utils/couleursCategories';
import { calculerStatsAnnuellesCategories } from '../utils/calculsAnalyse';

const MAX_PARTS = 7;
const SEUIL_PART = 0.03;
const AUTRES = 'Autres';

const euros = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;

/**
 * La répartition des dépenses de l'année : un anneau et la liste classée des catégories.
 * Au-delà de 7 catégories, ou sous 3 % du total, les catégories rejoignent la part « Autres ».
 */
export default function RepartitionDepenses({ data = [], currentYear, comptes = [], filters = {}, toutesLesTransactions = [] }) {
  const [masquees, setMasquees] = useState(() => new Set());
  const [actif, setActif] = useState(null);
  const annee = parseInt(currentYear, 10) || new Date().getFullYear();

  // La couleur suit la catégorie, pas son rang : masquer une catégorie ne repeint pas les autres.
  const couleurs = useMemo(() => couleursParCategorie(data.map((d) => d.name)), [data]);

  // Même calcul l'an dernier, arrêté au même jour pour l'année en cours.
  const precedente = useMemo(() => {
    const maintenant = new Date();
    const jusqua = annee === maintenant.getFullYear() ? { mois: maintenant.getMonth(), jour: maintenant.getDate() } : null;
    const stats = calculerStatsAnnuellesCategories({ comptes, filters: { ...filters, annee: annee - 1 }, toutesLesTransactions, jusqua });
    return Object.fromEntries(stats.map((s) => [s.name, s.value]));
  }, [comptes, filters, toutesLesTransactions, annee]);

  const visibles = data.filter((d) => !masquees.has(d.name));
  const total = visibles.reduce((s, d) => s + d.value, 0);

  // Les parts de l'anneau : les grosses catégories, puis « Autres ».
  const { parts, membresAutres } = useMemo(() => {
    const liste = [];
    const autres = [];
    visibles.forEach((d, i) => {
      if (i < MAX_PARTS && (total === 0 || d.value / total >= SEUIL_PART)) liste.push({ ...d, couleur: couleurs[d.name] });
      else autres.push(d.name);
    });
    if (autres.length === 1) {
      const seule = visibles.find((d) => d.name === autres[0]);
      liste.push({ ...seule, couleur: couleurs[seule.name] });
      return { parts: liste, membresAutres: new Set() };
    }
    if (autres.length > 1) {
      const valeur = visibles.filter((d) => autres.includes(d.name)).reduce((s, d) => s + d.value, 0);
      liste.push({ name: AUTRES, value: valeur, couleur: GRIS_AUTRES });
    }
    return { parts: liste, membresAutres: new Set(autres) };
  }, [visibles, total, couleurs]);

  if (!data.length) {
    return (
      <div className="h-full min-h-[300px] flex items-center justify-center text-[10px] font-black uppercase text-white/10 tracking-widest italic">
        Aucune donnée
      </div>
    );
  }

  const partDe = (nom) => (membresAutres.has(nom) ? AUTRES : nom);
  const partActive = actif ? partDe(actif) : null;
  const centre = actif
    ? (actif === AUTRES ? parts.find((p) => p.name === AUTRES) : visibles.find((d) => d.name === actif))
    : null;
  const maximum = visibles[0]?.value || 1;

  const basculer = (nom) => setMasquees((avant) => {
    const suite = new Set(avant);
    if (suite.has(nom)) suite.delete(nom);
    else suite.add(nom);
    return suite;
  });

  return (
    <div className="h-full w-full flex flex-col min-h-0 select-none p-3">
      <p className="text-[10px] font-black uppercase text-white/30 mb-2 tracking-[0.25em] text-center shrink-0">
        Répartition des dépenses {annee}
      </p>

      <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-4">
        <div className="relative sm:w-[48%] h-56 sm:h-full shrink-0" onMouseLeave={() => setActif(null)}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={parts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="64%" outerRadius="94%"
                paddingAngle={parts.length > 1 ? 2 : 0} cornerRadius={4} stroke="none" isAnimationActive animationDuration={500}
                onMouseEnter={(p) => setActif(p?.name ?? null)}>
                {parts.map((p) => (
                  <Cell key={p.name} fill={p.couleur} className="outline-none cursor-pointer transition-opacity"
                    style={{ opacity: partActive && partActive !== p.name ? 0.25 : 1 }} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-6">
            <span className="text-[9px] font-black text-white/35 uppercase tracking-[0.2em] mb-1 truncate max-w-full">
              {centre ? (centre.name === AUTRES ? 'Autres' : getCleanCategoryName(centre.name)) : 'Total'}
            </span>
            <span className="text-xl xl:text-2xl font-black text-white tracking-tight leading-none tabular-nums">
              {euros(centre ? centre.value : total)}
            </span>
            {centre && total > 0 && (
              <span className="mt-1 text-[11px] font-bold text-white/55 tabular-nums">{Math.round((centre.value / total) * 100)} % des dépenses</span>
            )}
          </div>
        </div>

        <ul aria-label="Dépenses par catégorie" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-1" onMouseLeave={() => setActif(null)}>
          {data.map((d) => {
            const masquee = masquees.has(d.name);
            const pct = total > 0 && !masquee ? (d.value / total) * 100 : 0;
            const avant = precedente[d.name];
            const evolution = avant > 0 ? Math.round(((d.value - avant) / avant) * 100) : null;
            const enAvant = !masquee && partActive && partDe(d.name) === partActive;
            return (
              <li key={d.name}>
                <button type="button" onClick={() => basculer(d.name)} onMouseEnter={() => !masquee && setActif(d.name)}
                  title={masquee ? 'Afficher de nouveau cette catégorie' : 'Masquer cette catégorie'}
                  aria-pressed={!masquee}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${enAvant ? 'bg-white/[0.07]' : 'hover:bg-white/[0.04]'} ${masquee ? 'opacity-35' : ''}`}>
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: membresAutres.has(d.name) ? GRIS_AUTRES : couleurs[d.name] }} />
                    <CategoryIcon name={d.name} size={12} showBg={false} />
                    <span className={`flex-1 min-w-0 truncate text-[12px] font-semibold text-white/90 ${masquee ? 'line-through' : ''}`}>{getCleanCategoryName(d.name)}</span>
                    {masquee && <EyeOff size={12} className="shrink-0 text-white/50" aria-label="Masquée" />}
                    {!masquee && evolution !== null && (
                      <span title={`${euros(avant)} en ${annee - 1}`} className={`shrink-0 text-[10px] font-bold tabular-nums ${evolution > 0 ? 'text-rose-400' : evolution < 0 ? 'text-emerald-400' : 'text-white/45'}`}>
                        {evolution > 0 ? '+' : evolution < 0 ? '−' : ''}{Math.abs(evolution)} %
                      </span>
                    )}
                    <span className="shrink-0 w-[72px] text-right text-[12px] font-bold tabular-nums text-white/85">{euros(d.value)}</span>
                    <span className="shrink-0 w-9 text-right text-[11px] font-semibold tabular-nums text-white/45">{masquee ? '' : `${Math.round(pct)} %`}</span>
                  </span>
                  <span className="mt-1 block h-1 rounded-full bg-white/[0.05] overflow-hidden">
                    <span className="block h-full rounded-full" style={{ width: `${masquee ? 0 : (d.value / maximum) * 100}%`, background: membresAutres.has(d.name) ? GRIS_AUTRES : couleurs[d.name] }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="shrink-0 pt-2 text-[10px] text-white/35 text-center">
        Cliquez sur une catégorie pour la masquer. Les écarts comparent avec {annee - 1}{annee === new Date().getFullYear() ? ' à la même date' : ''}.
      </p>
    </div>
  );
}
