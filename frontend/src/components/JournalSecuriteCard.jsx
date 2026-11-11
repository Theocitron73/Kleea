import { useEffect, useState } from 'react';
import api from '../axios';

const dateLisible = (iso) => new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const VISIBLES = 8;

/** Connexions, échecs, mots de passe et partages des 90 derniers jours : de quoi repérer ce qui n'est pas de vous. */
export default function JournalSecuriteCard() {
  const [etat, setEtat] = useState(null); // null = en cours de chargement
  const [tout, setTout] = useState(false);

  useEffect(() => {
    api.get('/api/securite/journal')
      .then((res) => setEtat(res.data))
      .catch(() => setEtat({ disponible: false, evenements: [] }));
  }, []);

  const evenements = Array.isArray(etat?.evenements) ? etat.evenements : [];
  const affiches = tout ? evenements : evenements.slice(0, VISIBLES);

  return (
    <section aria-label="Journal de sécurité" className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 space-y-3">
      <div>
        <h4 className="text-[13px] font-bold text-white/90 mb-1">Journal de sécurité</h4>
        <p className="text-[11px] font-semibold text-white/65 leading-relaxed">
          Les connexions, échecs, changements de mot de passe et partages de votre compte, gardés 90 jours. Si une ligne n'est pas de vous, changez votre mot de passe et déconnectez vos autres appareils.
        </p>
      </div>

      {etat === null && <p className="text-[11px] font-semibold text-white/65">Chargement…</p>}
      {etat && !etat.disponible && <p className="text-[11px] font-semibold text-white/65">Le journal n'est pas disponible pour le moment.</p>}
      {etat?.disponible && evenements.length === 0 && <p className="text-[11px] font-semibold text-white/65">Aucun événement pour l'instant.</p>}

      {affiches.length > 0 && (
        <ul className="divide-y divide-white/5">
          {affiches.map((e, i) => (
            <li key={`${e.cree_le}-${i}`} className="py-2 flex items-start gap-3">
              <span aria-hidden="true" className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${e.echec ? 'bg-rose-400' : 'bg-emerald-400/70'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[12px] font-bold ${e.echec ? 'text-rose-300' : 'text-white/85'}`}>
                  {e.libelle}{e.detail ? <span className="font-semibold text-white/55"> · {e.detail}</span> : null}
                </p>
                <p className="text-[10px] font-semibold text-white/45 truncate">
                  {[dateLisible(e.cree_le), e.appareil, e.ip].filter(Boolean).join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {evenements.length > VISIBLES && (
        <button type="button" onClick={() => setTout((t) => !t)}
          className="bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md transition border border-white/5 cursor-pointer">
          {tout ? 'Afficher moins' : `Tout afficher (${evenements.length})`}
        </button>
      )}
    </section>
  );
}
