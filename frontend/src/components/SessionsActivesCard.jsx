import { useEffect, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';
import { activiteLisible, estMobile } from '../utils/sessions';

export default function SessionsActivesCard() {
  const [etat, setEtat] = useState(null); // null = en cours de chargement
  const [occupe, setOccupe] = useState(false);
  const [confirmation, setConfirmation] = useState(false);

  useEffect(() => {
    api.get('/api/sessions')
      .then((res) => setEtat(res.data))
      .catch(() => setEtat({ disponible: false }));
  }, []);

  const sessions = Array.isArray(etat?.sessions) ? etat.sessions : [];
  const autres = sessions.filter((s) => !s.actuelle);

  const deconnecter = async (session) => {
    setOccupe(true);
    try {
      await api.delete(`/api/sessions/${encodeURIComponent(session.id)}`);
      setEtat((e) => ({ ...e, sessions: e.sessions.filter((s) => s.id !== session.id) }));
      toast.success(`${session.appareil} a été déconnecté.`);
    } catch (err) {
      // Déjà déconnecté ailleurs : la ligne n'a plus lieu d'être.
      if (err.response?.status === 404) setEtat((e) => ({ ...e, sessions: e.sessions.filter((s) => s.id !== session.id) }));
      else toast.error(err.response?.data?.detail || "Impossible de déconnecter cet appareil.");
    } finally {
      setOccupe(false);
    }
  };

  const toutDeconnecter = async () => {
    setOccupe(true);
    try {
      await api.post('/api/sessions/revoquer-autres');
      setEtat((e) => ({ ...e, sessions: e.sessions.filter((s) => s.actuelle) }));
      toast.success('Vos autres appareils ont été déconnectés.');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Impossible de déconnecter vos autres appareils.');
    } finally {
      setOccupe(false);
      setConfirmation(false);
    }
  };

  const secondaire = 'bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md transition border border-white/5 cursor-pointer disabled:opacity-40 shrink-0';

  return (
    <section aria-label="Appareils connectés" className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[13px] font-bold text-white/90 mb-1">Appareils connectés</h4>
          <p className="text-[11px] font-semibold text-white/65 leading-relaxed">
            Vérifiez où votre compte est ouvert, et déconnectez un appareil que vous ne reconnaissez pas ou que vous n'utilisez plus.
          </p>
        </div>
        {autres.length > 0 && !confirmation && (
          <button type="button" disabled={occupe} onClick={() => setConfirmation(true)} className={secondaire}>
            Tout déconnecter
          </button>
        )}
      </div>

      {etat === null && <p className="text-[11px] font-semibold text-white/65">Chargement…</p>}
      {etat && !etat.disponible && (
        <p className="text-[11px] font-semibold text-white/65">La liste de vos appareils n'est pas disponible pour le moment.</p>
      )}

      {confirmation && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
          <p className="text-[10px] font-bold text-rose-300">
            Déconnecter vos {autres.length > 1 ? `${autres.length} autres appareils` : 'autre appareil'} ? Il faudra vous y reconnecter. Cet appareil reste connecté.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={occupe}
              onClick={toutDeconnecter}
              className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40"
            >
              Confirmer
            </button>
            <button type="button" disabled={occupe} onClick={() => setConfirmation(false)} className={secondaire}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {etat?.disponible && (
        <ul className="space-y-2">
          {sessions.map((session) => {
            const Icone = estMobile(session.appareil) ? Smartphone : Monitor;
            return (
              <li key={session.id} className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icone size={14} className="text-white/40 shrink-0" />
                  <div className="min-w-0 leading-tight">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-white truncate">{session.appareil}</span>
                      {session.actuelle && (
                        <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                          Cet appareil
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-semibold text-white/65">
                      {session.actuelle ? 'En ligne' : activiteLisible(session.derniere_activite)}
                      {session.cree_le ? ` · connecté le ${new Date(session.cree_le).toLocaleDateString('fr-FR')}` : ''}
                    </span>
                  </div>
                </div>
                {!session.actuelle && (
                  <button type="button" disabled={occupe} onClick={() => deconnecter(session)} className={secondaire}>
                    Déconnecter
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {etat?.disponible && !etat.session_suivie && (
        <p className="text-[11px] font-semibold text-white/65 leading-relaxed">
          Cet appareil n'apparaît pas ici : sa connexion date d'avant cette fonction, et elle ne peut pas être déconnectée à distance. Elle prendra fin d'elle-même sous 7 jours. Reconnectez-vous pour qu'il soit suivi.
        </p>
      )}
    </section>
  );
}
