import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarPlus, EyeOff, Repeat, RotateCcw, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';
import { CategoryIcon } from '../categoryIcons';
import { detecterAbonnements, previsionsAAjouter, totauxAbonnements } from '../utils/abonnements';

const euros = (valeur) => `${Number(valeur || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const dateCourte = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
// Les noms courts sont le plus souvent des sigles : SFR, EDF…
const titre = (nom) => (nom.length <= 4 ? nom : nom.charAt(0) + nom.slice(1).toLowerCase());

function Tuile({ libelle, valeur }) {
  return (
    <div className="flex-1 min-w-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/5">
      <p className="text-[8.5px] font-black uppercase tracking-wider text-[var(--text-main)]/50 truncate">{libelle}</p>
      <p className="text-sm font-black text-[var(--text-main)] mt-0.5 truncate">{valeur}</p>
    </div>
  );
}

function Ligne({ abonnement: a, action }) {
  const hausse = a.changementPrix && a.changementPrix.nouveau > a.changementPrix.ancien;
  const IconePrix = hausse ? ArrowUpRight : ArrowDownRight;
  return (
    <li className={`flex items-center gap-2.5 p-2.5 rounded-xl border border-white/5 ${a.actif ? 'bg-white/[0.02]' : 'bg-white/[0.01] opacity-70'}`}>
      <CategoryIcon name={a.categorie} size={16} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-[var(--text-main)] truncate flex items-center gap-1.5">
          <span className="truncate">{titre(a.nom)}</span>
          {a.nouveau && <span className="shrink-0 px-1.5 py-px rounded-md bg-[var(--primary)]/25 text-[8px] font-black uppercase text-[var(--text-main)]">Nouveau</span>}
        </p>
        <p className="text-[9.5px] text-[var(--text-main)]/50 truncate">
          {a.frequenceLibelle}
          {a.actif ? ` · attendu vers le ${dateCourte(a.prochaine)}` : ` · dernier le ${dateCourte(a.derniere)}`}
        </p>
        {a.changementPrix && (
          <p className={`text-[9.5px] font-bold flex items-center gap-1 ${hausse ? 'text-rose-400' : 'text-emerald-400'}`}>
            <IconePrix size={10} className="shrink-0" />
            <span className="truncate">{euros(a.changementPrix.ancien)} → {euros(a.changementPrix.nouveau)} le {dateCourte(a.changementPrix.date)}</span>
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-black font-mono text-[var(--text-main)]">{a.variable ? '≈ ' : ''}{euros(a.montant)}</p>
        {a.frequence !== 'mensuel' && <p className="text-[9px] text-[var(--text-main)]/50">soit {euros(a.coutMensuel)} / mois</p>}
      </div>
      {action}
    </li>
  );
}

/** Dépenses récurrentes détectées dans tout l'historique du profil, indépendamment du mois affiché. */
export default function VueAbonnements({ transactions = [], comptesDuProfil = [], profil = 'Tous', user, rechargerPrevisions }) {
  const [ignores, setIgnores] = useState([]);
  const [enCours, setEnCours] = useState(null);
  const [voirIgnores, setVoirIgnores] = useState(false);

  const detectes = useMemo(() => detecterAbonnements(transactions, {
    comptes: profil === 'Tous' ? null : comptesDuProfil.map((c) => c.compte),
  }), [transactions, comptesDuProfil, profil]);

  useEffect(() => {
    let annule = false;
    api.get('/api/abonnements/ignores')
      .then((res) => { if (!annule && Array.isArray(res.data)) setIgnores(res.data); })
      .catch(() => { if (!annule) toast.error('Impossible de charger les lignes ignorées.'); });
    return () => { annule = true; };
  }, []);

  const ignorer = async (a) => {
    setIgnores((liste) => [...liste, a.id]);
    try {
      await api.post('/api/abonnements/ignores', { id: a.id });
    } catch {
      setIgnores((liste) => liste.filter((id) => id !== a.id));
      toast.error("Impossible d'ignorer cette ligne.");
    }
  };

  const reafficher = async (a) => {
    setIgnores((liste) => liste.filter((id) => id !== a.id));
    try {
      await api.delete('/api/abonnements/ignores', { params: { id: a.id } });
    } catch {
      setIgnores((liste) => [...liste, a.id]);
      toast.error('Impossible de réafficher cette ligne.');
    }
  };

  const prevoir = async (a) => {
    const nomUtilisateur = typeof user === 'object' ? user?.nom : user;
    setEnCours(a.id);
    try {
      // Les prévisions déjà enregistrées sont relues à chaque clic, pour ne jamais en créer deux fois.
      const annee = new Date().getFullYear();
      const reponses = await Promise.all([annee, annee + 1].map((an) => api.get(`/previsions/${encodeURIComponent(nomUtilisateur)}/ALL/${an}`)));
      const existantes = reponses.flatMap((res) => (Array.isArray(res.data) ? res.data : []));
      const aCreer = previsionsAAjouter(a, existantes);
      if (!aCreer.length) {
        toast.info(`${titre(a.nom)} est déjà dans vos prévisions.`);
        return;
      }
      for (const prevision of aCreer) {
        const res = await api.post('/previsions', { ...prevision, utilisateur: nomUtilisateur });
        if (res.data?.status === 'error') throw new Error('Prévision refusée');
      }
      toast.success(`${aCreer.length} prévision${aCreer.length > 1 ? 's' : ''} ajoutée${aCreer.length > 1 ? 's' : ''} pour ${titre(a.nom)}.`);
      await rechargerPrevisions?.();
    } catch {
      toast.error("Impossible d'ajouter les prévisions. Vérifiez la page Prévisionnel avant de réessayer.");
    } finally {
      setEnCours(null);
    }
  };

  const visibles = detectes.filter((a) => !ignores.includes(a.id));
  const masques = detectes.filter((a) => ignores.includes(a.id));
  const actifs = visibles.filter((a) => a.actif);
  const arretes = visibles.filter((a) => !a.actif);
  const totaux = totauxAbonnements(visibles);
  const aChange = actifs.filter((a) => a.changementPrix && a.changementPrix.nouveau > a.changementPrix.ancien).length;

  const boutonIgnorer = (a) => (
    <button type="button" title="Ce n'est pas une dépense récurrente" aria-label={`Ignorer ${titre(a.nom)}`} onClick={() => ignorer(a)} className="p-1 shrink-0 text-[var(--text-main)]/30 hover:text-[var(--text-main)] cursor-pointer">
      <X size={12} />
    </button>
  );

  const actionsActif = (a) => (
    <>
      <button type="button" title="Ajouter aux prévisions" aria-label={`Ajouter ${titre(a.nom)} aux prévisions`} disabled={enCours === a.id} onClick={() => prevoir(a)} className="p-1 shrink-0 text-[var(--text-main)]/40 hover:text-[var(--text-main)] disabled:opacity-40 cursor-pointer">
        <CalendarPlus size={13} />
      </button>
      {boutonIgnorer(a)}
    </>
  );

  if (!detectes.length) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-8 gap-2">
        <Repeat size={22} className="text-[var(--text-main)]/25" />
        <p className="text-xs font-bold text-[var(--text-main)]/70">Aucune dépense récurrente détectée</p>
        <p className="text-[10.5px] text-[var(--text-main)]/50 max-w-xs">Il faut au moins trois prélèvements réguliers d'un même montant. Importez plus d'historique pour en repérer davantage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pr-1">
      <div className="flex gap-2">
        <Tuile libelle="Par mois" valeur={euros(totaux.mensuel)} />
        <Tuile libelle="Par an" valeur={euros(totaux.annuel)} />
        <Tuile libelle="En cours" valeur={totaux.nombre} />
      </div>

      {aChange > 0 && (
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-rose-400 px-1">
          <Sparkles size={11} className="shrink-0" />
          {aChange} hausse{aChange > 1 ? 's' : ''} de prix repérée{aChange > 1 ? 's' : ''}.
        </p>
      )}

      {actifs.length > 0 && (
        <ul className="space-y-1.5" aria-label="Dépenses récurrentes en cours">
          {actifs.map((a) => <Ligne key={a.id} abonnement={a} action={actionsActif(a)} />)}
        </ul>
      )}

      {arretes.length > 0 && (
        <section className="space-y-1.5">
          <h4 className="text-[9px] font-black uppercase tracking-wider text-[var(--text-main)]/50 px-1">Semblent arrêtées</h4>
          <ul className="space-y-1.5" aria-label="Dépenses récurrentes arrêtées">
            {arretes.map((a) => <Ligne key={a.id} abonnement={a} action={boutonIgnorer(a)} />)}
          </ul>
        </section>
      )}

      {masques.length > 0 && (
        <section className="space-y-1.5">
          <button type="button" onClick={() => setVoirIgnores(!voirIgnores)} aria-expanded={voirIgnores} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-main)]/50 hover:text-[var(--text-main)] px-1 cursor-pointer">
            <EyeOff size={11} /> {masques.length} ignorée{masques.length > 1 ? 's' : ''}
          </button>
          {voirIgnores && (
            <ul className="space-y-1.5" aria-label="Dépenses récurrentes ignorées">
              {masques.map((a) => (
                <Ligne
                  key={a.id}
                  abonnement={a}
                  action={(
                    <button type="button" title="Réafficher" aria-label={`Réafficher ${titre(a.nom)}`} onClick={() => reafficher(a)} className="p-1 shrink-0 text-[var(--text-main)]/40 hover:text-[var(--text-main)] cursor-pointer">
                      <RotateCcw size={12} />
                    </button>
                  )}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-[9.5px] leading-relaxed text-[var(--text-main)]/40 px-1">
        Estimation à partir de vos transactions, sur tout l'historique{profil === 'Tous' ? '' : ` du profil ${profil}`}. Un abonnement annuel n'apparaît qu'après deux prélèvements.
      </p>
    </div>
  );
}
