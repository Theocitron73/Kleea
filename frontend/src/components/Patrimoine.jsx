import { createElement, useEffect, useState } from 'react';
import { Home, LineChart, Bitcoin, Car, Package, Landmark, Trash2, Plus, Link2, Check, X, Calculator, Repeat, AlertTriangle, Pencil, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart as Courbe, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import api from '../axios';
import { duProfil } from '../hooks/usePatrimoine';

const euros = (n, decimales = 0) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })} €`;
const moisAnnee = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
const jourMois = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

const TYPES_BIENS = [
  { v: 'immobilier', l: 'Immobilier', icone: Home },
  { v: 'placement', l: 'Placement (PEA, assurance vie)', icone: LineChart },
  { v: 'crypto', l: 'Crypto', icone: Bitcoin },
  { v: 'vehicule', l: 'Véhicule', icone: Car },
  { v: 'autre', l: 'Autre', icone: Package },
];
const TYPES_DETTES = [
  { v: 'immobilier', l: 'Crédit immobilier', icone: Home },
  { v: 'auto', l: 'Prêt auto', icone: Car },
  { v: 'conso', l: 'Crédit conso', icone: Landmark },
  { v: 'autre', l: 'Autre', icone: Landmark },
];
const icone = (types, type) => (types.find((t) => t.v === type) || types[types.length - 1]).icone;

const CHAMP = 'h-[34px] bg-black/25 border border-white/10 rounded-xl px-3 text-[11px] font-bold text-white outline-none focus:border-[var(--primary)]/50 [color-scheme:dark]';
const LABEL = 'text-[8px] text-[var(--text-main)]/40 uppercase font-black mb-0.5 block italic leading-none';
const CARTE = 'bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl p-4';
const BOUTON = 'h-[34px] px-4 bg-[var(--primary)] hover:brightness-110 text-white font-black text-[9px] uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40';
const SECONDAIRE = 'h-[28px] px-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-black text-[9px] uppercase tracking-wider rounded-lg cursor-pointer';

function depuis(iso) {
  const mois = Math.round((Date.now() - new Date(`${iso}T12:00:00`).getTime()) / (30.44 * 86400000));
  if (mois <= 0) return 'mise à jour ce mois-ci';
  return mois === 1 ? 'mise à jour il y a 1 mois' : `mise à jour il y a ${mois} mois`;
}

const pourcent = (n) => `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
const moisCourt = (t) => new Date(t).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });

// La valeur d'un PEA ou d'une assurance vie à chaque mise à jour, à côté de ce qui y a été versé : l'écart est la performance.
function SuiviPlacement({ nom, suivi }) {
  const points = suivi.points.map((p) => ({ ...p, t: new Date(`${p.date}T12:00:00`).getTime() }));
  const gagne = suivi.gain >= 0;
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-white/55">
        <span className={`font-black tabular-nums ${gagne ? 'text-emerald-400' : 'text-rose-400'}`}>
          {gagne ? '+' : '−'}{euros(Math.abs(suivi.gain))}{suivi.performance != null && ` (${pourcent(suivi.performance)})`}
        </span>{' '}
        depuis l’ouverture, hors versements · {euros(suivi.investi)} versés
      </p>
      {points.length > 1 && (
        <div className="h-28 -ml-2" role="img" aria-label={`Valeur de ${nom} : de ${euros(points[0].valeur)} le ${jourMois(points[0].date)} à ${euros(points[points.length - 1].valeur)} aujourd’hui, pour ${euros(suivi.investi)} versés`}>
          <ResponsiveContainer width="100%" height="100%">
            <Courbe data={points} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={moisCourt} minTickGap={24} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} />
              <YAxis width={40} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} domain={['auto', 'auto']} />
              <Tooltip labelFormatter={(t) => jourMois(new Date(t).toISOString().slice(0, 10))} formatter={(v, cle) => [euros(v), cle === 'valeur' ? 'Valeur' : 'Versé']}
                contentStyle={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
              <Line type="stepAfter" dataKey="investi" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="valeur" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, strokeWidth: 0, fill: 'var(--primary)' }} isAnimationActive={false} />
            </Courbe>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

async function envoyer(requete, message, recharger) {
  try {
    await requete;
    if (message) toast.success(message);
    await recharger();
    return true;
  } catch (err) {
    const detail = err.response?.data?.detail;
    toast.error(typeof detail === 'string' ? detail : 'Vérifiez les champs saisis.');
    return false;
  }
}

function ChoixProfil(props) {
  const { valeur, onChange, groupes, CustomSelect } = props;
  if (!groupes.length) return null;
  return (
    <div className="w-36">
      <label className={LABEL}>Profil</label>
      <CustomSelect value={valeur} options={[{ v: '', l: 'Tous les profils' }, ...groupes.map((g) => ({ v: g, l: g }))]} onChange={onChange}
        className="p-2 rounded-xl text-[10px] h-[34px]" />
    </div>
  );
}

function Biens({ biens, recharger, groupes, CustomSelect, cryptos = {} }) {
  const vide = { type: 'immobilier', nom: '', valeur: '', decote: '15', libelle_lien: '', profil: '', crypto_id: 'bitcoin', quantite: '' };
  const [form, setForm] = useState(vide);
  const [saisies, setSaisies] = useState({});

  const ajouter = async (e) => {
    e.preventDefault();
    const nombre = (v) => parseFloat(String(v).replace(',', '.'));
    const crypto = form.type === 'crypto';
    if (!form.nom.trim() || (crypto ? !nombre(form.quantite) : form.valeur === '')) {
      return toast.warning(crypto ? 'Indiquez un nom et la quantité détenue.' : 'Indiquez un nom et une valeur.');
    }
    const ok = await envoyer(api.post('/api/biens', {
      type: form.type, nom: form.nom, valeur: form.valeur === '' ? null : nombre(form.valeur),
      crypto_id: crypto ? form.crypto_id : null, quantite: crypto ? nombre(form.quantite) : null,
      decote: form.type === 'vehicule' ? parseFloat(form.decote) || null : null,
      libelle_lien: form.type === 'placement' ? form.libelle_lien : null,
      profil: form.profil || null,
    }), 'Ajouté.', recharger);
    if (ok) setForm({ ...vide, type: form.type });
  };

  const enregistrerValeur = (bien) => {
    const saisie = saisies[bien.id];
    setSaisies((s) => { const reste = { ...s }; delete reste[bien.id]; return reste; });
    if (saisie === undefined) return;
    const valeur = parseFloat(String(saisie).replace(/\s/g, '').replace(',', '.'));
    if (bien.crypto_id) {
      if (Number.isNaN(valeur) || valeur <= 0 || valeur === bien.quantite) return;
      envoyer(api.put(`/api/biens/${bien.id}`, { quantite: valeur }), 'Quantité mise à jour.', recharger);
      return;
    }
    if (Number.isNaN(valeur) || valeur === bien.valeur) return;
    envoyer(api.put(`/api/biens/${bien.id}`, { valeur }), 'Valeur mise à jour.', recharger);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={ajouter} className={`${CARTE} relative z-30 flex flex-wrap items-end gap-2.5`}>
        <div className="w-full text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]">Ajouter un placement ou un bien</div>
        <div className="w-52">
          <label className={LABEL}>Type</label>
          <CustomSelect value={form.type} options={TYPES_BIENS.map(({ v, l }) => ({ v, l }))} onChange={(v) => setForm({ ...form, type: v })}
            className="p-2 rounded-xl text-[10px] h-[34px]" />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className={LABEL}>Nom</label>
          <input aria-label="Nom du bien" className={`${CHAMP} w-full`} placeholder="Appartement Nantes" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        </div>
        {form.type === 'crypto' ? (
          <>
            <div className="w-40">
              <label className={LABEL}>Crypto</label>
              <CustomSelect value={form.crypto_id} options={Object.entries(cryptos).map(([v, l]) => ({ v, l }))} onChange={(v) => setForm({ ...form, crypto_id: v })}
                className="p-2 rounded-xl text-[10px] h-[34px]" />
            </div>
            <div className="w-32">
              <label className={LABEL}>Quantité</label>
              <input aria-label="Quantité détenue" inputMode="decimal" className={`${CHAMP} w-full text-right`} placeholder="0,05" value={form.quantite} onChange={(e) => setForm({ ...form, quantite: e.target.value })} />
            </div>
          </>
        ) : (
          <div className="w-36">
            <label className={LABEL}>Valeur actuelle (€)</label>
            <input aria-label="Valeur du bien" inputMode="decimal" className={`${CHAMP} w-full text-right`} placeholder="245000" value={form.valeur} onChange={(e) => setForm({ ...form, valeur: e.target.value })} />
          </div>
        )}
        {form.type === 'vehicule' && (
          <div className="w-32">
            <label className={LABEL}>Perte par an (%)</label>
            <input aria-label="Perte de valeur par an" inputMode="decimal" className={`${CHAMP} w-full text-right`} value={form.decote} onChange={(e) => setForm({ ...form, decote: e.target.value })} />
          </div>
        )}
        {form.type === 'placement' && (
          <div className="w-52">
            <label className={LABEL}>Libellé des virements (facultatif)</label>
            <input aria-label="Libellé des virements" className={`${CHAMP} w-full`} placeholder="VIR PEA" value={form.libelle_lien} onChange={(e) => setForm({ ...form, libelle_lien: e.target.value })} />
          </div>
        )}
        <ChoixProfil valeur={form.profil} onChange={(v) => setForm({ ...form, profil: v })} groupes={groupes} CustomSelect={CustomSelect} />
        <button type="submit" className={BOUTON}><Plus size={13} strokeWidth={3} /> Ajouter</button>
        {form.type === 'placement' && (
          <p className="w-full text-[11px] text-white/50">Avec un libellé, chaque virement correspondant depuis votre compte s’ajoute à la valeur, et compte comme un virement interne, pas comme une dépense.</p>
        )}
        {form.type === 'crypto' && (
          <p className="w-full text-[11px] text-white/50">La valeur suit le cours du jour (CoinGecko). Si le cours n’est pas disponible, la dernière valeur connue est gardée.</p>
        )}
      </form>

      {biens.length === 0 ? (
        <p className="text-center text-[11px] text-white/50 py-8">Aucun placement ni bien pour l’instant. Ajoutez un placement, de la crypto, un logement ou un véhicule.</p>
      ) : (
        <ul aria-label="Placements et biens" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {biens.map((b) => {
            return (
              <li key={b.id} className={`${CARTE} space-y-2`}>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">{createElement(icone(TYPES_BIENS, b.type), { size: 14, 'aria-hidden': true })}</span>
                  <span className="flex-1 min-w-0 text-[11px] font-black uppercase text-white truncate">{b.nom}</span>
                  {b.profil && <span className="text-[8px] font-black uppercase text-white/40">{b.profil}</span>}
                  <button type="button" aria-label={`Supprimer ${b.nom}`} title="Supprimer"
                    onClick={() => envoyer(api.delete(`/api/biens/${b.id}`), 'Supprimé.', recharger)}
                    className="p-1 rounded-md text-white/35 hover:text-rose-400 cursor-pointer"><Trash2 size={13} aria-hidden="true" /></button>
                </div>
                {b.crypto_id ? (
                  <>
                    <p className="text-lg font-black text-white tabular-nums">{euros(b.valeur)}</p>
                    <label className="flex items-center gap-1.5 text-[11px] text-white/55">
                      <input
                        aria-label={`Quantité de ${b.nom}`}
                        inputMode="decimal"
                        className="w-24 bg-white/[0.04] border border-white/10 rounded-lg px-2 h-[26px] text-[11px] font-bold text-white text-right outline-none focus:border-[var(--primary)]/60"
                        value={saisies[b.id] ?? String(b.quantite).replace('.', ',')}
                        onChange={(e) => setSaisies((s) => ({ ...s, [b.id]: e.target.value }))}
                        onBlur={() => enregistrerValeur(b)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                      />
                      {cryptos[b.crypto_id] || b.crypto_id} · {b.cours ? `cours ${euros(b.cours, 2)}` : 'cours indisponible, dernière valeur connue'}
                    </label>
                  </>
                ) : (
                <div className="flex items-baseline gap-1">
                  <input
                    aria-label={`Valeur de ${b.nom}`}
                    inputMode="decimal"
                    title="Saisir la valeur actuelle"
                    className="w-full bg-transparent border-b border-transparent hover:border-white/15 focus:border-[var(--primary)]/60 text-lg font-black text-white outline-none tabular-nums"
                    value={saisies[b.id] ?? Math.round(b.valeur).toLocaleString('fr-FR')}
                    onChange={(e) => setSaisies((s) => ({ ...s, [b.id]: e.target.value }))}
                    onBlur={() => enregistrerValeur(b)}
                    onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  />
                  <span className="text-white/50 font-black">€</span>
                </div>
                )}
                {!b.crypto_id && <p className="text-[11px] text-white/55">
                  {b.decote
                    ? `${euros(b.valeur_saisie)} au ${jourMois(b.date_valeur)} · −${b.decote} % par an`
                    : depuis(b.date_valeur)}
                  {b.versements > 0 && <span className="text-emerald-400"> · +{euros(b.versements)} de virements reliés</span>}
                </p>}
                {b.suivi && <SuiviPlacement nom={b.nom} suivi={b.suivi} />}
                {b.libelle_lien && <p className="flex items-center gap-1 text-[10px] text-white/40"><Link2 size={11} aria-hidden="true" /> virements « {b.libelle_lien} »</p>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Simulateur({ dette }) {
  const [montant, setMontant] = useState('');
  const [effet, setEffet] = useState('duree');
  const [resultat, setResultat] = useState(null);

  const simuler = async (e) => {
    e.preventDefault();
    const valeur = parseFloat(String(montant).replace(',', '.'));
    if (!valeur || valeur <= 0) return;
    try {
      const res = await api.get(`/api/dettes/${dette.id}/simulation`, { params: { montant: valeur, effet } });
      setResultat(res.data);
    } catch {
      toast.error('La simulation n’a pas pu être faite.');
    }
  };

  return (
    <form onSubmit={simuler} className="rounded-xl bg-black/20 border border-white/5 p-3 space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white/70"><Calculator size={12} aria-hidden="true" /> Simuler un remboursement anticipé</p>
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Montant à rembourser par anticipation" inputMode="decimal" className={`${CHAMP} w-28 text-right`} placeholder="10000" value={montant} onChange={(e) => { setMontant(e.target.value); setResultat(null); }} />
        <span className="text-white/50 text-[11px]">€ pour</span>
        <div role="radiogroup" aria-label="Effet du remboursement" className="inline-flex p-0.5 rounded-xl bg-black/25 border border-white/10 h-[34px]">
          {[['duree', 'Raccourcir'], ['mensualite', 'Baisser la mensualité']].map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={effet === v} onClick={() => { setEffet(v); setResultat(null); }}
              className={`px-3 rounded-[10px] text-[9px] font-black uppercase cursor-pointer ${effet === v ? 'bg-white text-slate-900' : 'text-white/45 hover:text-white/80'}`}>{l}</button>
          ))}
        </div>
        <button type="submit" className={SECONDAIRE}>Simuler</button>
      </div>
      {resultat && (
        <p role="status" className="text-[11px] text-white/80">
          {euros(resultat.interets_economises)} d’intérêts en moins.{' '}
          {effet === 'duree'
            ? `Fin en ${moisAnnee(resultat.apres.fin)} au lieu de ${moisAnnee(resultat.avant.fin)} (${resultat.mois_gagnes} mois de moins).`
            : `Mensualité de ${euros(resultat.apres.mensualite, 2)} au lieu de ${euros(resultat.avant.mensualite, 2)}.`}
        </p>
      )}
    </form>
  );
}

function ModifierCredit({ d, recharger, fermer }) {
  const [form, setForm] = useState({ montant: String(d.montant), taux: String(d.taux).replace('.', ','), annees: String(+(d.duree_mois / 12).toFixed(2)).replace('.', ','), debut: d.debut });
  const nombre = (v) => parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  const enregistrer = async (e) => {
    e.preventDefault();
    const corps = { montant: nombre(form.montant), taux: nombre(form.taux), duree_mois: Math.round(nombre(form.annees) * 12), debut: form.debut };
    if (!corps.montant || Number.isNaN(corps.taux) || !corps.duree_mois || !corps.debut) return toast.warning('Vérifiez le montant, le taux, la durée et la date.');
    if (await envoyer(api.put(`/api/dettes/${d.id}`, corps), 'Crédit modifié : l’échéancier est recalculé.', recharger)) fermer();
  };
  return (
    <form onSubmit={enregistrer} aria-label={`Modifier ${d.nom}`} className="rounded-xl bg-black/20 border border-white/10 p-3 flex flex-wrap items-end gap-2">
      {[['montant', 'Montant emprunté (€)', 'w-32'], ['taux', 'Taux (%)', 'w-20'], ['annees', 'Durée (ans)', 'w-20']].map(([champ, libelle, largeur]) => (
        <div key={champ} className={largeur}>
          <label className={LABEL}>{libelle}</label>
          <input aria-label={libelle} inputMode="decimal" className={`${CHAMP} w-full text-right`} value={form[champ]} onChange={(e) => setForm({ ...form, [champ]: e.target.value })} />
        </div>
      ))}
      <div className="w-36">
        <label className={LABEL}>1re échéance</label>
        <input aria-label="1re échéance" type="date" className={`${CHAMP} w-full`} value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} />
      </div>
      <button type="submit" className={BOUTON}><Check size={13} aria-hidden="true" /> Enregistrer</button>
      <button type="button" onClick={fermer} className={SECONDAIRE}>Annuler</button>
      <p className="w-full text-[10px] text-white/45">Tout l’échéancier est recalculé avec ces conditions ; les remboursements anticipés enregistrés restent.</p>
    </form>
  );
}

function CarteDette({ d, recharger }) {
  const [libelle, setLibelle] = useState('');
  const [modification, setModification] = useState(false);
  const nonVues = d.echeances.filter((e) => !e.vue);

  const ajouterAuPrevisionnel = () => {
    const maintenant = new Date();
    const debut = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}-01`;
    envoyer(api.post('/api/regles', {
      type: 'prevision', nom: d.nom, montant: -d.mensualite, categorie: null, compte: null,
      jour: Number(d.debut.slice(8, 10)), debut, fin: `${d.fin.slice(0, 7)}-01`,
    }), 'Mensualité ajoutée au Prévisionnel, chaque mois jusqu’à la fin du crédit.', recharger);
  };

  return (
    <li className={`${CARTE} space-y-3`}>
      <div className="flex items-center gap-2">
        <span className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70">{createElement(icone(TYPES_DETTES, d.type), { size: 14, 'aria-hidden': true })}</span>
        <span className="flex-1 min-w-0 text-[11px] font-black uppercase text-white truncate">{d.nom}</span>
        {d.profil && <span className="text-[8px] font-black uppercase text-white/40">{d.profil}</span>}
        <button type="button" aria-label={`Modifier ${d.nom}`} title="Modifier le montant, le taux ou la durée"
          onClick={() => setModification((m) => !m)}
          className="p-1 rounded-md text-white/35 hover:text-white cursor-pointer"><Pencil size={13} aria-hidden="true" /></button>
        <button type="button" aria-label={`Supprimer ${d.nom}`} title="Supprimer"
          onClick={() => envoyer(api.delete(`/api/dettes/${d.id}`), 'Crédit supprimé.', recharger)}
          className="p-1 rounded-md text-white/35 hover:text-rose-400 cursor-pointer"><Trash2 size={13} aria-hidden="true" /></button>
      </div>

      {modification && <ModifierCredit d={d} recharger={recharger} fermer={() => setModification(false)} />}

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase text-white/45">Capital restant</p>
          <p className="text-xl font-black text-white tabular-nums">{euros(d.capital_restant)}</p>
          {d.capital_banque_le && (
            <p className="flex items-center gap-1 text-[10px] text-white/45"><Building2 size={10} aria-hidden="true" /> selon votre banque, au {jourMois(d.capital_banque_le)} · calculé : {euros(d.capital_calcule)}</p>
          )}
        </div>
        <div className="text-right text-[11px] text-white/65">
          <p><span className="font-black text-white tabular-nums">{euros(d.mensualite, 2)}</span> / mois · {d.taux} %</p>
          <p>{d.capital_restant > 0 ? `fin en ${moisAnnee(d.fin)}` : 'remboursé'}</p>
        </div>
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-[var(--text-main)]/60" style={{ width: `${Math.min(d.rembourse_pct, 100)}%` }} /></div>
        <p className="flex justify-between text-[10px] text-white/50 mt-1">
          <span>{d.rembourse_pct} % remboursé sur {euros(d.montant)}</span>
          <span>{euros(d.interets_restants)} d’intérêts restants</span>
        </p>
      </div>

      {d.anticipes_detectes.map((a) => (
        <div key={a.operation_id} role="alert" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
            <AlertTriangle size={13} aria-hidden="true" /> Prélèvement de {euros(a.montant, 2)} le {jourMois(a.date)} : remboursement anticipé ?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[['duree', 'Oui, il raccourcit le crédit'], ['mensualite', 'Oui, il baisse la mensualité']].map(([effet, l]) => (
              <button key={effet} type="button" className={SECONDAIRE}
                onClick={() => envoyer(api.post(`/api/dettes/${d.id}/anticipes`, { montant: a.montant, date: a.date, effet, operation_id: a.operation_id }), 'Échéancier recalculé.', recharger)}>
                <Check size={11} className="inline mr-1" aria-hidden="true" />{l}
              </button>
            ))}
            <button type="button" className={SECONDAIRE} onClick={() => envoyer(api.post(`/api/dettes/${d.id}/ignorer/${a.operation_id}`), null, recharger)}>
              <X size={11} className="inline mr-1" aria-hidden="true" />Non
            </button>
          </div>
        </div>
      ))}

      {d.libelle_lien ? (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[10px] text-white/50">
            <Link2 size={11} aria-hidden="true" /> Prélèvements « {d.libelle_lien} »
            <button type="button" className="underline hover:text-white cursor-pointer" onClick={() => envoyer(api.put(`/api/dettes/${d.id}`, { libelle_lien: '' }), null, recharger)}>délier</button>
          </p>
          <ul aria-label={`Échéances de ${d.nom}`} className="flex flex-wrap gap-1">
            {d.echeances.map((e) => (
              <li key={e.date} title={e.vue ? 'Prélèvement vu' : 'Aucun prélèvement trouvé ce mois-là'}
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase border ${e.vue ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10' : 'border-rose-500/30 text-rose-300 bg-rose-500/10'}`}>
                {new Date(`${e.date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'short' })} {e.vue ? '✓' : '✗'}
              </li>
            ))}
          </ul>
          {nonVues.length > 0 && <p className="text-[10px] text-rose-300/80">{nonVues.length} échéance{nonVues.length > 1 ? 's' : ''} sans prélèvement trouvé.</p>}
        </div>
      ) : (
        <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (libelle.trim()) envoyer(api.put(`/api/dettes/${d.id}`, { libelle_lien: libelle }), 'Prélèvements reliés.', recharger); }}>
          <span className="text-[10px] text-white/50">Relier les prélèvements dont le libellé contient</span>
          <input aria-label={`Libellé des prélèvements de ${d.nom}`} className={`${CHAMP} w-40 h-[28px]`} placeholder="PRLV CREDIT" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
          <button type="submit" className={SECONDAIRE}><Link2 size={11} className="inline mr-1" aria-hidden="true" />Relier</button>
        </form>
      )}

      {d.capital_restant > 0 && (
        <>
          <Simulateur dette={d} />
          <button type="button" className={SECONDAIRE} onClick={ajouterAuPrevisionnel}>
            <Repeat size={11} className="inline mr-1" aria-hidden="true" />Ajouter la mensualité au Prévisionnel
          </button>
        </>
      )}
    </li>
  );
}

function CreditsBanque({ recharger, preRemplir }) {
  const [credits, setCredits] = useState([]);
  useEffect(() => {
    api.get('/api/dettes/banque').then((res) => setCredits(Array.isArray(res.data) ? res.data : [])).catch(() => setCredits([]));
  }, []);
  const aAjouter = credits.filter((c) => !c.deja_ajoute);
  if (aAjouter.length === 0) return null;

  const ajouter = async (c) => {
    if (!c.complet) return preRemplir(c);
    const ok = await envoyer(api.post('/api/dettes', {
      type: c.type, nom: c.nom, montant: c.montant, taux: c.taux, duree_mois: c.duree_mois, debut: c.debut, powens_compte_id: c.powens_compte_id,
    }), 'Crédit ajouté depuis votre banque.', recharger);
    if (ok) setCredits((liste) => liste.map((x) => (x.powens_compte_id === c.powens_compte_id ? { ...x, deja_ajoute: true } : x)));
  };

  return (
    <section aria-label="Crédits trouvés chez votre banque" className={`${CARTE} space-y-2`}>
      <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]"><Building2 size={12} aria-hidden="true" /> Crédits trouvés chez votre banque</p>
      {aAjouter.map((c) => (
        <div key={c.powens_compte_id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white/[0.04] border border-white/5 px-3 py-2">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase text-white truncate">{c.nom}</p>
            <p className="text-[10px] text-white/55">
              {c.capital_restant != null ? `${euros(c.capital_restant)} restants` : 'capital non communiqué'}
              {c.taux != null ? ` · ${c.taux} %` : ''}{c.fin ? ` · fin ${jourMois(c.fin)}` : ''}
            </p>
          </div>
          <button type="button" className={SECONDAIRE} onClick={() => ajouter(c)}>
            {c.complet ? 'Ajouter' : 'Compléter et ajouter'}
          </button>
        </div>
      ))}
      <p className="text-[10px] text-white/45">Un crédit ajouté depuis la banque garde le capital restant qu’elle annonce, mis à jour à chaque visite de cet onglet.</p>
    </section>
  );
}

function Dettes({ dettes, recharger, groupes, CustomSelect, brouillonCredit, onBrouillonUtilise }) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const vide = { type: 'immobilier', nom: '', montant: '', taux: '', annees: '', debut: aujourdhui, libelle_lien: '', profil: '' };
  const [form, setForm] = useState(vide);
  useEffect(() => {
    if (!brouillonCredit) return;
    setForm((f) => ({ ...f, ...brouillonCredit }));
    onBrouillonUtilise?.();
  }, [brouillonCredit, onBrouillonUtilise]);
  const preRemplir = (c) => {
    setForm({
      ...vide, type: c.type, nom: c.nom, montant: c.montant ? String(c.montant) : '', taux: c.taux != null ? String(c.taux).replace('.', ',') : '',
      annees: c.duree_mois ? String(+(c.duree_mois / 12).toFixed(2)).replace('.', ',') : '', debut: c.debut || vide.debut, powens_compte_id: c.powens_compte_id,
    });
    toast.info('Complétez les champs manquants, puis ajoutez le crédit.');
  };

  const ajouter = async (e) => {
    e.preventDefault();
    const nombre = (v) => parseFloat(String(v).replace(',', '.'));
    if (!form.nom.trim() || !nombre(form.montant) || Number.isNaN(nombre(form.taux)) || !nombre(form.annees) || !form.debut) {
      return toast.warning('Indiquez le nom, le montant emprunté, le taux, la durée et la date de la 1re échéance.');
    }
    const ok = await envoyer(api.post('/api/dettes', {
      type: form.type, nom: form.nom, montant: nombre(form.montant), taux: nombre(form.taux),
      duree_mois: Math.round(nombre(form.annees) * 12), debut: form.debut, libelle_lien: form.libelle_lien || null, profil: form.profil || null,
      powens_compte_id: form.powens_compte_id || null,
    }), 'Crédit ajouté.', recharger);
    if (ok) setForm({ ...vide, type: form.type });
  };

  return (
    <div className="space-y-4">
      <CreditsBanque recharger={recharger} preRemplir={preRemplir} />
      <form onSubmit={ajouter} className={`${CARTE} relative z-30 flex flex-wrap items-end gap-2.5`}>
        <div className="w-full text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]">Ajouter un crédit</div>
        <div className="w-44">
          <label className={LABEL}>Type</label>
          <CustomSelect value={form.type} options={TYPES_DETTES.map(({ v, l }) => ({ v, l }))} onChange={(v) => setForm({ ...form, type: v })}
            className="p-2 rounded-xl text-[10px] h-[34px]" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className={LABEL}>Nom</label>
          <input aria-label="Nom du crédit" className={`${CHAMP} w-full`} placeholder="Crédit immobilier" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        </div>
        <div className="w-32">
          <label className={LABEL}>Montant emprunté (€)</label>
          <input aria-label="Montant emprunté" inputMode="decimal" className={`${CHAMP} w-full text-right`} placeholder="200000" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} />
        </div>
        <div className="w-20">
          <label className={LABEL}>Taux (%)</label>
          <input aria-label="Taux annuel" inputMode="decimal" className={`${CHAMP} w-full text-right`} placeholder="3,5" value={form.taux} onChange={(e) => setForm({ ...form, taux: e.target.value })} />
        </div>
        <div className="w-24">
          <label className={LABEL}>Durée (ans)</label>
          <input aria-label="Durée en années" inputMode="decimal" className={`${CHAMP} w-full text-right`} placeholder="20" value={form.annees} onChange={(e) => setForm({ ...form, annees: e.target.value })} />
        </div>
        <div className="w-36">
          <label className={LABEL}>1re échéance</label>
          <input aria-label="Date de la première échéance" type="date" className={`${CHAMP} w-full`} value={form.debut} onChange={(e) => setForm({ ...form, debut: e.target.value })} />
        </div>
        <div className="w-40">
          <label className={LABEL}>Libellé du prélèvement</label>
          <input aria-label="Libellé du prélèvement" className={`${CHAMP} w-full`} placeholder="PRLV CREDIT" value={form.libelle_lien} onChange={(e) => setForm({ ...form, libelle_lien: e.target.value })} />
        </div>
        <ChoixProfil valeur={form.profil} onChange={(v) => setForm({ ...form, profil: v })} groupes={groupes} CustomSelect={CustomSelect} />
        <button type="submit" className={BOUTON}><Plus size={13} strokeWidth={3} /> Ajouter</button>
      </form>

      {dettes.length === 0 ? (
        <p className="text-center text-[11px] text-white/50 py-8">Aucun crédit pour l’instant. Le capital restant se calcule seul d’après l’échéancier.</p>
      ) : (
        <ul aria-label="Crédits" className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {dettes.map((d) => <CarteDette key={d.id} d={d} recharger={recharger} />)}
        </ul>
      )}
    </div>
  );
}

/** Onglets « Placements & biens » et « Crédits » de la page Comptes. */
export default function Patrimoine({ onglet, patrimoine, recharger, profil, groupes = [], CustomSelect, brouillonCredit, onBrouillonUtilise }) {
  const biens = patrimoine.biens.filter((b) => duProfil(b, profil));
  const dettes = patrimoine.dettes.filter((d) => duProfil(d, profil));
  return (
    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-2 pb-4">
      {onglet === 'biens'
        ? <Biens biens={biens} recharger={recharger} groupes={groupes} CustomSelect={CustomSelect} cryptos={patrimoine.cryptos || {}} />
        : <Dettes dettes={dettes} recharger={recharger} groupes={groupes} CustomSelect={CustomSelect} brouillonCredit={brouillonCredit} onBrouillonUtilise={onBrouillonUtilise} />}
    </div>
  );
}
