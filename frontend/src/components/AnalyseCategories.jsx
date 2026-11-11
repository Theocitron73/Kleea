import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Eye } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import { couleursParCategorie } from '../utils/couleursCategories';

const euros = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;
const LIGNE = 34;

/**
 * Les dépenses du mois par catégorie, en barres horizontales de la plus grosse à la plus petite.
 * Chaque barre porte la couleur de sa catégorie, son montant, sa part du mois, son évolution sur le mois
 * précédent, et un repère à la hauteur de l'objectif budgétaire quand il y en a un. Un clic la masque.
 */
export default function AnalyseCategories({ statsCategories = [], hiddenCategories, toggleCategory, budgetGauges = [], libelle = 'Dépenses du mois par catégorie' }) {
  // Sans masquage fourni par la page, le graphique garde le sien.
  const [masqueesLocales, setMasqueesLocales] = useState([]);
  if (!toggleCategory) {
    hiddenCategories = masqueesLocales;
    toggleCategory = (nom) => setMasqueesLocales((avant) => (avant.includes(nom) ? avant.filter((n) => n !== nom) : [...avant, nom]));
  }
  hiddenCategories = hiddenCategories || [];

  // La place des noms et des étiquettes suit la largeur du panneau ; en étroit, l'étiquette se réduit au montant et au %.
  const zone = useRef(null);
  const [largeur, setLargeur] = useState(600);
  const [hauteur, setHauteur] = useState(0);
  useEffect(() => {
    const element = zone.current;
    if (!element) return undefined;
    const mesurer = () => {
      const { width, height } = element.getBoundingClientRect();
      setLargeur(width || 600);
      setHauteur(height || 0);
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);
  const compact = largeur < 460;
  const LARGEUR_NOMS = Math.round(Math.min(150, Math.max(92, largeur * 0.3)));
  const MARGE_DROITE = compact ? Math.round(Math.min(96, Math.max(70, largeur * 0.26))) : 150;
  const couleurs = useMemo(() => couleursParCategorie(statsCategories.map((s) => s.name)), [statsCategories]);
  const objectifs = useMemo(() => Object.fromEntries((budgetGauges || []).filter((b) => b.limite > 0).map((b) => [b.nom, b.limite])), [budgetGauges]);

  if (!statsCategories.length) {
    return (
      <div className="h-full w-full flex items-center justify-center text-[var(--text-main)]/10 text-[10px] uppercase font-black">
        Aucune donnée disponible
      </div>
    );
  }

  const visibles = statsCategories.filter((s) => !hiddenCategories.includes(s.name));
  const masquees = statsCategories.filter((s) => hiddenCategories.includes(s.name));
  const total = visibles.reduce((s, c) => s + c.value, 0);
  const donnees = visibles.map((c) => ({ ...c, objectif: objectifs[c.name] || 0, couleur: couleurs[c.name], part: total > 0 ? (c.value / total) * 100 : 0 }));
  // Une même échelle pour toutes les barres, objectifs compris, pour que les repères restent comparables.
  const echelle = Math.max(1, ...donnees.map((c) => Math.max(c.value, c.objectif)));

  const nom = ({ x, y, payload }) => (
    <foreignObject x={x - LARGEUR_NOMS + 12} y={y - 10} width={LARGEUR_NOMS - 16} height={20}>
      <div className="h-full flex items-center gap-1.5 min-w-0" title={getCleanCategoryName(payload.value)}>
        <CategoryIcon name={payload.value} size={12} showBg={false} />
        <span className="truncate text-[11.5px] font-semibold text-white/85">{getCleanCategoryName(payload.value)}</span>
      </div>
    </foreignObject>
  );

  // La barre, et le repère de l'objectif à sa place sur la même échelle.
  const barre = ({ x, y, width, height, payload }) => {
    const pleine = payload.value > 0 ? (width * echelle) / payload.value : 0;
    const repere = payload.objectif > 0 ? x + (payload.objectif / echelle) * pleine : null;
    const depasse = payload.objectif > 0 && payload.value > payload.objectif;
    return (
      <g className="cursor-pointer">
        <rect x={x} y={y} width={Math.max(width, 2)} height={height} rx={4} fill={payload.couleur} />
        {repere !== null && (
          <rect x={repere - 1} y={y - 3} width={2} height={height + 6} rx={1} fill={depasse ? '#fda4af' : 'rgba(255,255,255,0.75)'}>
            <title>{`Objectif : ${euros(payload.objectif)}`}</title>
          </rect>
        )}
      </g>
    );
  };

  const etiquette = ({ x, y, width, height, index }) => {
    const c = donnees[index];
    if (!c) return null;
    const depasse = c.objectif > 0 && c.value > c.objectif;
    const evolution = c.evolution !== null && c.evolution !== undefined && c.evolution !== 0 ? c.evolution : null;
    const repereFin = c.objectif > 0 ? Math.max(width, (c.objectif / c.value) * width) : width;
    return (
      <text x={x + repereFin + 8} y={y + height / 2} dominantBaseline="central" fontSize={11} fontWeight={700}>
        <tspan fill="rgba(255,255,255,0.9)">{euros(c.value)}</tspan>
        {compact && <tspan fill="rgba(255,255,255,0.45)">{`  ${Math.round(c.part)} %`}</tspan>}
        {!compact && c.objectif > 0 && <tspan fill={depasse ? '#fb7185' : 'rgba(255,255,255,0.45)'}>{` / ${euros(c.objectif)}`}</tspan>}
        {!compact && <tspan fill="rgba(255,255,255,0.45)">{`  ${Math.round(c.part)} %`}</tspan>}
        {!compact && evolution !== null && <tspan fill={evolution > 0 ? '#fb7185' : '#34d399'}>{`  ${evolution > 0 ? '+' : '−'}${Math.abs(evolution)} %`}</tspan>}
        {!compact && c.isNew && <tspan fill="rgba(255,255,255,0.45)">  nouveau</tspan>}
      </text>
    );
  };

  const bulle = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const c = payload[0].payload;
    return (
      <div className="bg-[var(--surface)]/95 border border-white/10 px-3 py-2 rounded-xl shadow-2xl text-[11px] text-white/80 space-y-0.5">
        <p className="flex items-center gap-1.5 font-bold text-white"><CategoryIcon name={c.name} size={12} showBg={false} />{getCleanCategoryName(c.name)}</p>
        <p>{euros(c.value)} · {Math.round(c.part)} % du total</p>
        {c.objectif > 0 && <p>Objectif : {euros(c.objectif)} ({Math.round((c.value / c.objectif) * 100)} %)</p>}
        {c.evolution !== null && c.evolution !== undefined && <p>{c.evolution > 0 ? '+' : ''}{c.evolution} % par rapport au mois précédent</p>}
        <p className="text-white/40">Cliquez pour masquer</p>
      </div>
    );
  };

  return (
    <div ref={zone} className="h-full w-full flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div role="img" aria-label={`${libelle} : ${donnees.map((c) => `${getCleanCategoryName(c.name)} ${euros(c.value)}`).join(', ')}`}
          style={{ height: Math.max(160, donnees.length * LIGNE + 8, Math.min(hauteur - (masquees.length ? 44 : 4), donnees.length * 56)) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: MARGE_DROITE, left: 0, bottom: 4 }} barCategoryGap={9}>
              <XAxis type="number" hide domain={[0, echelle]} />
              <YAxis type="category" dataKey="name" width={LARGEUR_NOMS} axisLine={false} tickLine={false} interval={0} tick={nom} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={bulle} isAnimationActive={false} />
              <Bar dataKey="value" maxBarSize={18} shape={barre} onClick={(d) => toggleCategory(d.name)} isAnimationActive animationDuration={500}>
                <LabelList content={etiquette} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {masquees.length > 0 && (
        <div className="shrink-0 flex flex-wrap items-center gap-1.5 pt-2 mt-1 border-t border-white/5" aria-label="Catégories masquées">
          <span className="text-[10px] text-white/40 mr-1">Masquées :</span>
          {masquees.map((c) => (
            <button key={c.name} type="button" onClick={() => toggleCategory(c.name)} title="Afficher de nouveau cette catégorie"
              className="flex items-center gap-1 px-2 h-6 rounded-md bg-white/5 hover:bg-white/10 text-[10.5px] font-semibold text-white/65 cursor-pointer">
              <Eye size={11} /> {getCleanCategoryName(c.name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
