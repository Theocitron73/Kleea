import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import api from '../axios';
import { DUREES_LIEN, DUREE_LIEN_PAR_DEFAUT, LIBELLES_ACTION, descriptionDuLien, lignesHistorique } from '../utils/tricountPartage';

const BOUTON_SECONDAIRE = 'py-2.5 px-3 rounded-xl bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer disabled:opacity-40';
const BOUTON_PRINCIPAL = 'py-2.5 px-3 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer disabled:opacity-40';

const CONFIRMATIONS = {
  revoquer: {
    question: "Le lien cessera de fonctionner immédiatement pour toutes les personnes qui l'ont reçu.",
    bouton: 'Confirmer la révocation',
  },
  regenerer: {
    question: "L'adresse actuelle cessera de fonctionner immédiatement. Il faudra envoyer la nouvelle à vos proches.",
    bouton: 'Confirmer le remplacement',
  },
};

// Gestion du lien de partage d'un groupe, réservée à son propriétaire : durée, révocation et historique.
export default function FenetrePartageTricount({ userId, groupe, onFermer, showToast }) {
  const [chargement, setChargement] = useState(true);
  const [occupe, setOccupe] = useState(false);
  const [lien, setLien] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [duree, setDuree] = useState(DUREE_LIEN_PAR_DEFAUT);
  const [confirmation, setConfirmation] = useState(null);

  const chemin = (route) => `/${route}/${userId}/${encodeURIComponent(groupe)}`;
  const adresse = lien?.token ? `${window.location.origin}/shared-tricount/${lien.token}` : '';
  const lienActif = lien?.statut === 'actif';

  useEffect(() => {
    let actif = true;
    Promise.all([api.get(chemin('get-share-token')), api.get(chemin('share-history'))])
      .then(([etat, journal]) => {
        if (!actif) return;
        setLien(etat.data);
        setHistorique(journal.data.historique || []);
      })
      .catch(() => { if (actif) showToast('Impossible de charger le partage de ce groupe.', 'error'); })
      .finally(() => { if (actif) setChargement(false); });
    return () => { actif = false; };
    // Le groupe et le compte ne changent pas tant que la fenêtre est ouverte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copier = async (token) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/shared-tricount/${token}`);
      showToast('Lien de partage copié dans le presse-papiers !', 'success');
    } catch {
      showToast('Copie impossible : sélectionnez le lien affiché pour le copier.', 'error');
    }
  };

  const agir = async (appel, messageErreur, suite) => {
    setOccupe(true);
    try {
      const reponse = await appel();
      setLien(reponse.data);
      setConfirmation(null);
      await suite?.(reponse.data);
    } catch {
      showToast(messageErreur, 'error');
    } finally {
      setOccupe(false);
    }
  };

  const creer = () => agir(
    () => api.post(chemin('share-group'), { duree_jours: duree }),
    'Erreur lors de la génération du lien',
    (nouveau) => copier(nouveau.token),
  );
  const appliquerDuree = () => agir(
    () => api.post(chemin('share-group'), { duree_jours: duree }),
    'La durée n’a pas pu être changée.',
    () => showToast('Durée du lien mise à jour.', 'success'),
  );
  const regenerer = () => agir(
    () => api.post(chemin('regenerate-share'), { duree_jours: duree }),
    'Erreur lors de la génération du lien',
    (nouveau) => copier(nouveau.token),
  );
  const revoquer = () => agir(
    () => api.post(chemin('revoke-share')),
    'Le lien n’a pas pu être révoqué.',
    () => showToast('Lien révoqué : il ne fonctionne plus.', 'success'),
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onFermer} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Partager ce Tricount"
        className="relative w-full max-w-xl bg-[var(--surface)] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 max-h-[85vh] overflow-y-auto custom-scrollbar space-y-5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="min-w-0">
            <h3 className="text-xs font-black uppercase text-[var(--secondary)] tracking-widest">Partager ce Tricount</h3>
            <p className="text-[10px] text-white/40 font-bold mt-1 truncate">{groupe}</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={onFermer} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>

        {chargement ? (
          <p className="text-xs text-white/40 text-center py-8">Chargement…</p>
        ) : (
          <>
            <div className="space-y-3">
              <p className={`text-xs font-bold ${lien?.statut === 'expire' ? 'text-rose-400' : 'text-white/70'}`}>{descriptionDuLien(lien)}</p>

              {lienActif && (
                <div className="flex gap-2">
                  <input
                    readOnly
                    aria-label="Adresse du lien de partage"
                    value={adresse}
                    onFocus={(e) => e.target.select()}
                    className="flex-1 min-w-0 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-mono text-white/80 outline-none select-text"
                  />
                  <button type="button" onClick={() => copier(lien.token)} className={`${BOUTON_PRINCIPAL} shrink-0`}>Copier le lien</button>
                </div>
              )}

              <div>
                <span id="duree-lien" className="text-[9px] font-black uppercase tracking-widest text-white/40 block mb-1.5">Durée du lien</span>
                <div role="group" aria-labelledby="duree-lien" className="flex flex-wrap gap-1.5 p-1.5 bg-black/25 rounded-xl border border-white/5">
                  {DUREES_LIEN.map(({ jours, libelle }) => (
                    <button
                      key={jours}
                      type="button"
                      aria-pressed={duree === jours}
                      onClick={() => setDuree(jours)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${duree === jours ? 'bg-[var(--primary)] text-white' : 'text-white/50 hover:text-white'}`}
                    >
                      {libelle}
                    </button>
                  ))}
                </div>
              </div>

              {confirmation ? (
                <div role="alert" className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-3">
                  <p className="text-xs font-bold text-rose-300">{CONFIRMATIONS[confirmation].question}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setConfirmation(null)} className={BOUTON_SECONDAIRE}>Annuler</button>
                    <button
                      type="button"
                      disabled={occupe}
                      onClick={confirmation === 'revoquer' ? revoquer : regenerer}
                      className="py-2.5 px-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-40"
                    >
                      {CONFIRMATIONS[confirmation].bouton}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {!lien?.token && <button type="button" disabled={occupe} onClick={creer} className={BOUTON_PRINCIPAL}>Créer le lien et le copier</button>}
                  {lien?.statut === 'expire' && <button type="button" disabled={occupe} onClick={regenerer} className={BOUTON_PRINCIPAL}>Générer un nouveau lien</button>}
                  {lienActif && (
                    <>
                      <button type="button" disabled={occupe} onClick={appliquerDuree} className={BOUTON_SECONDAIRE}>Appliquer cette durée</button>
                      <button type="button" disabled={occupe} onClick={() => setConfirmation('regenerer')} className={BOUTON_SECONDAIRE}>Générer un nouveau lien</button>
                      <button type="button" disabled={occupe} onClick={() => setConfirmation('revoquer')} className="py-2.5 px-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase tracking-wider hover:bg-rose-500 hover:text-white transition-all cursor-pointer disabled:opacity-40">Révoquer le lien</button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 pt-3 border-t border-white/5">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40">Historique des modifications</h4>
              {historique.length === 0 ? (
                <p className="text-xs text-white/40 py-2">Aucun changement n'a encore été fait par un lien de partage.</p>
              ) : (
                <ul className="space-y-2">
                  {historique.map((entree) => (
                    <li key={entree.id} className="p-3 bg-black/20 rounded-xl border border-white/5 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className="text-xs font-black text-white">
                          {LIBELLES_ACTION[entree.action] || entree.action} · {entree.auteur || 'Nom non indiqué'}
                        </span>
                        <time dateTime={entree.date} className="text-[10px] text-white/40">
                          {new Date(entree.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                        </time>
                      </div>
                      <dl className="space-y-0.5 text-[11px]">
                        {lignesHistorique(entree).map((ligne) => (
                          <div key={ligne.champ} className="flex flex-wrap gap-x-1.5 break-words">
                            <dt className="text-white/40">{ligne.libelle} :</dt>
                            <dd className="text-white/80 min-w-0">
                              {ligne.avant !== null && <span className={ligne.apres !== null ? 'line-through text-white/40' : ''}>{ligne.avant}</span>}
                              {ligne.avant !== null && ligne.apres !== null && ' → '}
                              {ligne.apres !== null && <span>{ligne.apres}</span>}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
