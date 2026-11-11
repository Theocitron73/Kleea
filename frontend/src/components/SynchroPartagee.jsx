import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';

/** Sur la page Importer de la personne invitée : d'où viennent les opérations des comptes partagés, et comment les actualiser. */
// La synchronisation tourne chez le propriétaire : sa fin s'inscrit à l'historique du partage, qu'on relit.
const ATTENTE_MS = 5000;
const ESSAIS = 36;

export default function SynchroPartagee({ onTerminee }) {
  const [partages, setPartages] = useState([]);
  const [envoi, setEnvoi] = useState(null);
  const [enCours, setEnCours] = useState(null);
  const minuteur = useRef(null);

  useEffect(() => () => clearTimeout(minuteur.current), []);

  // shortcut: le suivi s'arrête si on quitte la page Importer, à déplacer dans le centre d'alertes s'il faut prévenir partout.
  const suivre = (p, essai = 0) => {
    minuteur.current = setTimeout(async () => {
      try {
        const res = await api.get(`/api/partages/${p.id}/journal`);
        const action = res.data?.[0]?.action;
        if (action === 'synchro_fin') {
          setEnCours(null);
          toast.success(`Import terminé : les opérations de ${p.comptes.join(', ')} sont à jour.`);
          onTerminee?.();
          return;
        }
        if (action === 'synchro_echec') {
          setEnCours(null);
          toast.error(`La synchronisation de ${p.avec} a échoué. Réessayez dans 15 minutes.`);
          return;
        }
      } catch { /* on retente au prochain passage */ }
      if (essai + 1 < ESSAIS) suivre(p, essai + 1);
      else setEnCours(null);
    }, ATTENTE_MS);
  };

  useEffect(() => {
    api.get('/api/partages')
      .then((res) => setPartages((Array.isArray(res.data) ? res.data : []).filter((p) => p.role === 'invite' && p.etat === 'actif')))
      .catch(() => setPartages([]));
  }, []);

  if (partages.length === 0) return null;

  const demander = async (p) => {
    setEnvoi(p.id);
    try {
      await api.post(`/api/partages/${p.id}/synchroniser`);
      toast.success(`Synchronisation demandée : les nouvelles opérations de ${p.avec} arrivent dans quelques instants.`);
      setEnCours(p.id);
      suivre(p);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'La synchronisation n’a pas pu être demandée.');
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <section aria-label="Comptes partagés avec vous" className="space-y-2">
      {partages.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-white/10 bg-[var(--glass-bg)] px-4 py-3">
          <Users size={16} className="text-[var(--text-main)]/50 shrink-0" aria-hidden="true" />
          <p className="flex-1 min-w-[220px] text-[12px] text-[var(--text-main)]/80">
            <b className="text-[var(--text-main)]">{p.comptes.join(', ')}</b> {p.comptes.length > 1 ? 'sont synchronisés' : 'est synchronisé'} par {p.avec}.
            Les nouvelles opérations apparaissent dès que {p.avec} les importe : vous n’avez rien à importer.
          </p>
          <button
            type="button"
            onClick={() => demander(p)}
            disabled={envoi === p.id || enCours === p.id}
            className="flex items-center gap-1.5 px-3 h-[30px] rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-[var(--text-main)] cursor-pointer disabled:opacity-40"
          >
            <RefreshCw size={12} className={envoi === p.id || enCours === p.id ? 'animate-spin' : ''} aria-hidden="true" />
            {enCours === p.id ? 'Import en cours…' : 'Demander une synchronisation'}
          </button>
        </div>
      ))}
    </section>
  );
}
