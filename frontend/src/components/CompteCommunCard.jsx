import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';

const SECONDAIRE = 'bg-white/5 hover:bg-white/10 text-white/75 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40 border-none';
const PRINCIPAL = 'bg-[var(--primary)] hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-40 border-none';
const CHAMP = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary)]';
const ACTIONS = { ajout: 'a ajouté', modification: 'a modifié', suppression: 'a supprimé', division: 'a divisé', prevision: 'prévision :', acceptation: 'a accepté le partage', arret: 'a arrêté le partage', synchro: ':', synchro_fin: ':', synchro_echec: ':' };

function ChoixComptes({ comptes, choisis, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {comptes.map((c) => {
        const actif = choisis.includes(c);
        return (
          <label key={c} className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-[11px] font-semibold cursor-pointer select-none ${actif ? 'border-[var(--primary)] bg-[var(--primary)]/15 text-white' : 'border-white/10 text-white/60'}`}>
            <input type="checkbox" className="accent-[var(--primary)]" checked={actif} onChange={() => onChange(actif ? choisis.filter((x) => x !== c) : [...choisis, c])} />
            {c}
          </label>
        );
      })}
    </div>
  );
}

/** Partager certains comptes avec une autre personne, qui garde sa propre connexion. */
export default function CompteCommunCard({ comptes = [] }) {
  const mesComptes = comptes.filter((c) => !c.partage).map((c) => c.compte);
  const [partages, setPartages] = useState([]);
  const [email, setEmail] = useState('');
  const [choisis, setChoisis] = useState([]);
  const [occupe, setOccupe] = useState(false);
  const [edition, setEdition] = useState(null);
  const [journal, setJournal] = useState({});
  const [aConfirmer, setAConfirmer] = useState(null);

  const charger = () => api.get('/api/partages').then((res) => setPartages(Array.isArray(res.data) ? res.data : [])).catch(() => setPartages([]));
  useEffect(() => { charger(); }, []);

  const agir = async (requete, message) => {
    setOccupe(true);
    try {
      const res = await requete;
      if (message) toast.success(typeof message === 'function' ? message(res.data) : message);
      await charger();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Une erreur est survenue. Réessayez.');
      return false;
    } finally {
      setOccupe(false);
    }
  };

  const inviter = async (e) => {
    e.preventDefault();
    if (!email.trim() || choisis.length === 0) return toast.warning('Indiquez une adresse e-mail et au moins un compte.');
    const ok = await agir(api.post('/api/partages', { email: email.trim(), comptes: choisis }), `Invitation envoyée à ${email.trim()}. Elle est valable 48 heures.`);
    if (ok) { setEmail(''); setChoisis([]); }
  };

  const voirJournal = async (id) => {
    if (journal[id]) return setJournal((j) => { const reste = { ...j }; delete reste[id]; return reste; });
    try {
      const res = await api.get(`/api/partages/${id}/journal`);
      setJournal((j) => ({ ...j, [id]: res.data }));
    } catch {
      toast.error('L’historique n’a pas pu être chargé.');
    }
  };

  const arreter = (p) => agir(api.delete(`/api/partages/${p.id}`), (data) => (
    p.role === 'invite' || data?.copiees
      ? 'Partage arrêté. Une copie des comptes partagés est gardée chez la personne invitée.'
      : 'Partage arrêté.'
  )).then(() => setAConfirmer(null));

  return (
    <section aria-label="Comptes partagés" className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 shadow-xl space-y-3">
      <div>
        <h4 className="text-[13px] font-bold text-white/90 mb-1">Compte commun</h4>
        <p className="text-[11px] font-semibold text-white/65 leading-relaxed">
          Partagez certains comptes avec une autre personne. Elle les voit et les modifie depuis son propre compte Kleea ; vos autres comptes restent privés.
        </p>
      </div>

      {partages.map((p) => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-bold text-white">
              {p.role === 'proprietaire' ? `Partagé avec ${p.avec}` : `${p.avec} partage avec vous`}
              <span className={`ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${p.etat === 'actif' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
                {p.etat === 'actif' ? 'actif' : 'invitation envoyée'}
              </span>
            </p>
            <div className="flex gap-1.5">
              {p.etat === 'actif' && <button type="button" className={SECONDAIRE} onClick={() => voirJournal(p.id)}>{journal[p.id] ? 'Masquer l’historique' : 'Historique'}</button>}
              {p.role === 'proprietaire' && <button type="button" className={SECONDAIRE} onClick={() => setEdition(edition?.id === p.id ? null : { id: p.id, comptes: p.comptes })}>Modifier les comptes</button>}
              {aConfirmer === p.id ? (
                <button type="button" className={`${SECONDAIRE} !text-rose-300`} disabled={occupe} onClick={() => arreter(p)}>Confirmer l’arrêt</button>
              ) : (
                <button type="button" className={`${SECONDAIRE} !text-rose-300`} onClick={() => setAConfirmer(p.id)}>Arrêter le partage</button>
              )}
            </div>
          </div>
          <p className="text-[11px] text-white/60">Comptes : {p.comptes.join(', ')}</p>
          {aConfirmer === p.id && (
            <p className="text-[11px] text-amber-200/90">
              {p.role === 'invite'
                ? 'Vous garderez une copie de ces comptes à leur état actuel, puis vous n’y aurez plus accès.'
                : p.etat === 'actif' ? `${p.avec} gardera une copie de ces comptes à leur état actuel, puis n’y aura plus accès.` : 'L’invitation sera annulée.'}
            </p>
          )}
          {edition?.id === p.id && (
            <div className="space-y-2">
              <ChoixComptes comptes={mesComptes} choisis={edition.comptes} onChange={(c) => setEdition({ ...edition, comptes: c })} />
              <button type="button" className={PRINCIPAL} disabled={occupe || edition.comptes.length === 0}
                onClick={() => agir(api.put(`/api/partages/${p.id}/comptes`, { comptes: edition.comptes }), 'Comptes partagés mis à jour.').then((ok) => ok && setEdition(null))}>
                Enregistrer
              </button>
            </div>
          )}
          {journal[p.id] && (
            <ul aria-label="Historique du partage" className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {journal[p.id].length === 0 && <li className="text-[11px] text-white/50">Aucune modification pour l’instant.</li>}
              {journal[p.id].map((l, i) => (
                <li key={i} className="text-[11px] text-white/70"><span className="text-white/45">{l.cree_le}</span> · {l.auteur} {ACTIONS[l.action] || l.action} {l.detail && !['acceptation', 'arret'].includes(l.action) ? l.detail : ''}</li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {mesComptes.length > 0 && (
        <form onSubmit={inviter} className="space-y-2">
          <p className="text-[10px] font-semibold text-white/70">Inviter une personne : elle recevra un lien par e-mail, à ouvrir en étant connectée à son compte Kleea avec cette adresse.</p>
          <input aria-label="Adresse e-mail de la personne invitée" type="email" className={CHAMP} placeholder="adresse@exemple.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
          <ChoixComptes comptes={mesComptes} choisis={choisis} onChange={setChoisis} />
          <button type="submit" className={PRINCIPAL} disabled={occupe}>Inviter</button>
        </form>
      )}
    </section>
  );
}
