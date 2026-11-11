import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AlertTriangle, ArrowRight, Landmark, Wallet } from 'lucide-react';
import { duProfil } from '../hooks/usePatrimoine';

const euros = (n) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} €`;
const MOIS = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** Onglet « Placements & crédits » de la colonne de droite : l'année en courbe, puis ce qu'on a et ce qu'on doit. */
export default function ValeurNetteResume({ patrimoine, profil, recapAnnuelStats = [], soldeGlobal = 0, valeurNette = 0, actif, ouvrirPatrimoine, couleur = '#37b58f' }) {
  const biens = patrimoine.biens.filter((b) => duProfil(b, profil));
  const dettes = patrimoine.dettes.filter((d) => duProfil(d, profil));
  const totalBiens = biens.reduce((s, b) => s + b.valeur, 0);
  const totalDettes = dettes.reduce((s, d) => s + d.capital_restant, 0);
  const aVerifier = dettes.reduce((s, d) => s + d.anticipes_detectes.length + d.echeances.filter((e) => !e.vue).length, 0);

  // Total net de chaque mois : comptes (bilan annuel) + biens − dettes (historique du serveur).
  const courbe = useMemo(() => (patrimoine.historique || []).map((point, i) => {
    const comptes = recapAnnuelStats[i]?.soldeTotal;
    if (comptes === null || comptes === undefined) return null;
    return { mois: MOIS[Number(point.mois.slice(5, 7)) - 1], valeur: Math.round(comptes + point.biens - point.dettes) };
  }).filter(Boolean), [patrimoine.historique, recapAnnuelStats]);
  const ecart = courbe.length > 1 ? courbe[courbe.length - 1].valeur - courbe[0].valeur : null;

  if (!actif) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-6">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10"><Landmark size={22} className="text-white/50" aria-hidden="true" /></div>
        <p className="text-[13px] font-bold text-white/85">Vos placements et vos crédits</p>
        <p className="text-[11px] text-white/55 max-w-xs">Ajoutez votre logement, vos placements ou vos crédits : le total net les ajoute à vos comptes, et suit son évolution mois par mois.</p>
        <button type="button" onClick={ouvrirPatrimoine} className="mt-1 px-4 h-[32px] rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider cursor-pointer">Ajouter un placement ou un crédit</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-y-auto custom-scrollbar">
      <section aria-label="Placements & crédits" className="bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Total net{profil && profil !== 'Tous' ? ` · ${profil}` : ''}</p>
            <p className="text-2xl font-black text-white tabular-nums leading-tight">{euros(valeurNette)}</p>
            {ecart !== null && (
              <p className="text-[10px] font-bold mt-0.5" style={{ color: ecart >= 0 ? '#4cc38a' : '#e5484d' }}>
                {ecart >= 0 ? '+' : '−'}{euros(Math.abs(ecart))} depuis {courbe[0].mois.toLowerCase()}
              </p>
            )}
          </div>
          <button type="button" onClick={ouvrirPatrimoine} className="flex items-center gap-1 text-[9px] font-black uppercase text-white/55 hover:text-white cursor-pointer">
            Gérer <ArrowRight size={12} aria-hidden="true" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[['Comptes', soldeGlobal, 'text-white'], ['Placements', totalBiens, 'text-white'], ['Crédits', -totalDettes, 'text-rose-300']].map(([libelle, montant, couleurTexte]) => (
            <div key={libelle} className="rounded-xl bg-white/[0.04] border border-white/5 px-2.5 py-2">
              <p className="text-[8px] font-black uppercase text-white/45">{libelle}</p>
              <p className={`text-[12px] font-black tabular-nums ${couleurTexte}`}>{montant < 0 ? '−' : ''}{euros(Math.abs(montant))}</p>
            </div>
          ))}
        </div>
        {courbe.length > 1 && (
          <div className="h-36 mt-3 -ml-2" role="img" aria-label={`Total net de ${courbe[0].mois} à ${courbe[courbe.length - 1].mois} : de ${euros(courbe[0].valeur)} à ${euros(courbe[courbe.length - 1].valeur)}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={courbe} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="valeur-nette-remplissage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={couleur} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={couleur} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="mois" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} />
                <YAxis width={44} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} domain={['auto', 'auto']} />
                <Tooltip formatter={(v) => [euros(v), 'Total net']} contentStyle={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
                <Area type="monotone" dataKey="valeur" stroke={couleur} strokeWidth={2} fill="url(#valeur-nette-remplissage)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {aVerifier > 0 && (
        <button type="button" onClick={ouvrirPatrimoine} className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-left text-[11px] font-bold text-amber-200 cursor-pointer">
          <AlertTriangle size={13} aria-hidden="true" />
          {aVerifier} point{aVerifier > 1 ? 's' : ''} à vérifier sur vos crédits
          <ArrowRight size={12} className="ml-auto" aria-hidden="true" />
        </button>
      )}

      {dettes.length > 0 && (
        <section aria-label="Liste des crédits" className="bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-3 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Crédits</p>
          {dettes.map((d) => (
            <div key={d.id}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-black uppercase text-white truncate">{d.nom}</span>
                <span className="text-[11px] font-black text-white tabular-nums shrink-0">{euros(d.capital_restant)}</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden my-1"><div className="h-full rounded-full bg-[var(--text-main)]/60" style={{ width: `${Math.min(d.rembourse_pct, 100)}%` }} /></div>
              <p className="text-[10px] text-white/50">{euros(d.mensualite)} / mois · fin {new Date(`${d.fin}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })} · {d.rembourse_pct} % remboursé</p>
            </div>
          ))}
        </section>
      )}

      {biens.length > 0 && (
        <section aria-label="Placements et biens" className="bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-3 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Placements & biens</p>
          {[...biens].sort((a, b) => b.valeur - a.valeur).map((b) => (
            <div key={b.id} className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-white/85 truncate"><Wallet size={11} className="text-white/40 shrink-0" aria-hidden="true" />{b.nom}</span>
              <span className="text-[11px] font-black text-white tabular-nums shrink-0">{euros(b.valeur)}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
