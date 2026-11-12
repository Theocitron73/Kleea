import { useEffect, useState } from 'react';
import { Repeat, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';

const moisAnnee = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

/** « Une fois » ou « Chaque mois » : le même choix dans les formulaires de prévision et de budget. */
export function ChoixRepetition({ valeur, onChange, libelleUneFois = 'Une fois', taille = 'h-[30px]' }) {
  const options = [[false, libelleUneFois], [true, 'Chaque mois']];
  return (
    <div role="radiogroup" aria-label="Répétition" className={`inline-flex p-0.5 rounded-xl bg-black/25 border border-white/10 ${taille}`}>
      {options.map(([repeter, libelle]) => (
        <button
          key={libelle}
          type="button"
          role="radio"
          aria-checked={!!valeur === repeter}
          onClick={() => onChange(repeter)}
          className={`flex items-center gap-1.5 px-3 rounded-[10px] text-[10px] font-black uppercase tracking-wider cursor-pointer transition-colors ${!!valeur === repeter ? 'bg-white text-slate-900' : 'text-white/45 hover:text-white/80'}`}
        >
          {repeter && <Repeat size={11} aria-hidden="true" />}
          {libelle}
        </button>
      ))}
    </div>
  );
}

/** « Sans fin », puis les 24 mois à partir de celui donné, pour « jusqu'à ». */
export function optionsFin(depuis) {
  const base = depuis ? new Date(depuis) : new Date();
  const options = [{ v: '', l: 'Sans fin' }];
  for (let i = 0; i < 24; i += 1) {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    options.push({ v: iso, l: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) });
  }
  return options;
}

function frequence(regle) {
  const base = regle.type === 'budget' ? 'chaque mois' : `le ${regle.jour === 1 ? '1er' : regle.jour} de chaque mois`;
  if (!regle.actif) return 'en pause';
  return regle.fin ? `${base}, jusqu’en ${moisAnnee(regle.fin)}` : base;
}

/** Les prévisions et budgets qui se répètent seuls, avec de quoi les mettre en pause, changer le montant ou les arrêter. */
export default function ReglesRecurrentes({ version = 0, onChange, onCount, compact = false }) {
  const [regles, setRegles] = useState(null);
  const [montants, setMontants] = useState({});

  const charger = () => api.get('/api/regles')
    .then((res) => { const liste = Array.isArray(res.data) ? res.data : []; setRegles(liste); onCount?.(liste.length); })
    .catch(() => setRegles([]));

  useEffect(() => { charger(); }, [version]);

  const agir = async (requete, message) => {
    try {
      await requete;
      if (message) toast.success(message);
      await charger();
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'La règle n’a pas pu être modifiée.');
    }
  };

  const enregistrerMontant = (regle) => {
    const saisie = montants[regle.id];
    if (saisie === undefined) return;
    const montant = parseFloat(String(saisie).replace(',', '.'));
    setMontants((m) => { const reste = { ...m }; delete reste[regle.id]; return reste; });
    if (Number.isNaN(montant) || montant === regle.montant) return;
    agir(api.put(`/api/regles/${regle.id}`, { montant }), 'Montant changé pour les mois à venir.');
  };

  if (regles === null) return null;

  if (regles.length === 0 && compact) {
    return <p className="px-4 pb-3 text-[13px] text-white/55">Choisissez « Chaque mois » en ajoutant une prévision ou un budget : il se répétera seul, sans reconduire le mois.</p>;
  }

  if (regles.length === 0) {
    return (
      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-2 px-6 py-10">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10"><Repeat size={20} className="text-white/50" aria-hidden="true" /></div>
        <p className="text-[12px] font-bold text-white/80">Aucune prévision ni budget récurrent</p>
        <p className="text-[11px] text-white/55 max-w-sm">Choisissez « Chaque mois » en ajoutant une prévision ou un budget : il se répétera seul, sans reconduire le mois.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <p className="text-[11px] text-white/55 px-1">Modifier une règle change les mois à venir, jamais le mois en cours ni le passé.</p>
      <ul aria-label="Prévisions et budgets récurrents" className="space-y-1.5">
        {regles.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 rounded-xl bg-[var(--glass-bg)] border border-white/5 px-3 py-2 ${r.actif ? '' : 'opacity-55'}`}>
            <button
              type="button"
              role="switch"
              aria-checked={r.actif}
              aria-label={`${r.actif ? 'Mettre en pause' : 'Reprendre'} : ${r.nom}`}
              title={r.actif ? 'Mettre en pause' : 'Reprendre'}
              onClick={() => agir(api.put(`/api/regles/${r.id}`, { actif: !r.actif }), r.actif ? 'Règle en pause.' : 'Règle reprise.')}
              className={`relative w-8 h-[18px] rounded-full shrink-0 cursor-pointer transition-colors ${r.actif ? 'bg-[var(--primary)]' : 'bg-white/15'}`}
            >
              <span className={`absolute top-[3px] w-3 h-3 rounded-full bg-white transition-[left] ${r.actif ? 'left-[17px]' : 'left-[3px]'}`} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10.5px] font-black uppercase text-white truncate">
                {r.nom}
                <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[8px] font-black text-white/50 align-middle">{r.type === 'budget' ? 'Budget' : 'Prévision'}</span>
              </p>
              <p className="text-[11px] text-white/55 truncate">
                {frequence(r)}{r.categorie ? ` · ${r.categorie}` : ''}{r.compte && r.compte !== 'tous' ? ` · ${r.compte}` : ''}
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-bold text-white/40 shrink-0">
              <input
                aria-label={`Montant de ${r.nom}`}
                inputMode="decimal"
                className="w-20 bg-white/[0.04] border border-white/5 rounded-xl px-2.5 h-[28px] text-[11px] font-black text-white text-right outline-none focus:border-[var(--primary)]/50"
                value={montants[r.id] ?? String(r.montant).replace('.', ',')}
                onChange={(e) => setMontants((m) => ({ ...m, [r.id]: e.target.value }))}
                onBlur={() => enregistrerMontant(r)}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              />
              €
            </span>
            <button
              type="button"
              aria-label={`Arrêter la règle : ${r.nom}`}
              title="Arrêter la règle (le mois en cours et le passé restent)"
              onClick={() => agir(api.delete(`/api/regles/${r.id}`), 'Règle arrêtée. Le mois en cours et le passé sont conservés.')}
              className="p-1.5 rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/5 cursor-pointer transition-colors shrink-0"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
