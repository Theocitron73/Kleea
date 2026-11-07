import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';

const SECONDAIRE = 'bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md transition-all cursor-pointer disabled:opacity-40 border-none';
const PRINCIPAL = 'bg-[var(--primary)] hover:opacity-90 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-md transition-all cursor-pointer disabled:opacity-40 border-none';
const CHAMP = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary)]';

/** Ne s'affiche que là où le serveur la propose. Facultative : rien ne change tant qu'on ne l'active pas. */
export default function DoubleAuthCard() {
  const [etat, setEtat] = useState(null);
  const [etape, setEtape] = useState('repos'); // repos | motdepasse | code | desactiver
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [emailMasque, setEmailMasque] = useState('');
  const [occupe, setOccupe] = useState(false);

  useEffect(() => {
    api.get('/api/double-auth')
      .then((res) => setEtat(res.data))
      .catch(() => setEtat({ disponible: false }));
  }, []);

  const repos = () => {
    setEtape('repos');
    setPassword('');
    setCode('');
  };

  const envoyer = (action) => async (e) => {
    e.preventDefault();
    setOccupe(true);
    try {
      await action();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Une erreur est survenue. Réessayez.');
    } finally {
      setOccupe(false);
    }
  };

  const preparer = envoyer(async () => {
    const res = await api.post('/api/double-auth/preparer', { password });
    setEmailMasque(res.data.email_masque);
    setPassword('');
    setEtape('code');
  });

  const activer = envoyer(async () => {
    await api.post('/api/double-auth/activer', { code });
    setEtat({ disponible: true, active: true });
    toast.success('Double authentification activée.');
    repos();
  });

  const desactiver = envoyer(async () => {
    await api.post('/api/double-auth/desactiver', { password });
    setEtat({ disponible: true, active: false });
    toast.success('Double authentification désactivée.');
    repos();
  });

  if (!etat?.disponible) return null;

  const champMotDePasse = (
    <>
      <p className="text-[10px] font-semibold text-white/70 leading-relaxed">
        Pour vérifier que c'est bien vous, saisissez le mot de passe que vous utilisez pour vous connecter à Kleea.
      </p>
      <input
        aria-label="Votre mot de passe actuel"
        type="password"
        className={CHAMP}
        autoComplete="current-password"
        placeholder="Votre mot de passe actuel"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
    </>
  );
  const boutons = (libelle) => (
    <div className="flex gap-2">
      <button type="submit" className={PRINCIPAL} disabled={occupe}>{libelle}</button>
      <button type="button" className={SECONDAIRE} onClick={repos}>Annuler</button>
    </div>
  );

  return (
    <section aria-label="Double authentification" className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 shadow-xl space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[13px] font-bold text-white/90 mb-1">Double authentification</h4>
          <p className="text-[11px] font-semibold text-white/65 leading-relaxed">
            {etat.active
              ? 'Activée : un code vous est envoyé par e-mail à chaque connexion.'
              : 'Facultative. Une fois activée, votre mot de passe seul ne suffit plus : la connexion demande aussi un code reçu par e-mail.'}
          </p>
        </div>
        {etape === 'repos' && (
          <button type="button" className={`${SECONDAIRE} shrink-0`} onClick={() => setEtape(etat.active ? 'desactiver' : 'motdepasse')}>
            {etat.active ? 'Désactiver' : 'Activer'}
          </button>
        )}
      </div>

      {etape === 'motdepasse' && (
        <form onSubmit={preparer} className="space-y-2">
          {champMotDePasse}
          {boutons('Recevoir un code')}
        </form>
      )}

      {etape === 'code' && (
        <form onSubmit={activer} className="space-y-2">
          <p className="text-[10px] font-semibold text-white/70 leading-relaxed">
            Saisissez le code à 6 chiffres envoyé à {emailMasque}. Il est valable 10 minutes.
          </p>
          <input
            aria-label="Code reçu par e-mail"
            className={CHAMP}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Code à 6 chiffres"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {boutons("Confirmer l'activation")}
        </form>
      )}

      {etape === 'desactiver' && (
        <form onSubmit={desactiver} className="space-y-2">
          {champMotDePasse}
          {boutons('Confirmer la désactivation')}
        </form>
      )}
    </section>
  );
}
