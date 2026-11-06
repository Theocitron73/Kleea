import { useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';
import { dateSauvegarde, lignesApercu, messageErreurSauvegarde, nomFichierSauvegarde, TAILLE_MAX_SAUVEGARDE } from '../utils/sauvegarde';

// Un gros compte met plus longtemps que le délai habituel de l'API.
const DELAI = 180000;
const ENVOI = { headers: { 'Content-Type': 'application/json' }, timeout: DELAI };

const BOUTON_SECONDAIRE = 'bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition border border-white/5 cursor-pointer disabled:opacity-40';
const BOUTON_PRINCIPAL = 'bg-[var(--primary)] text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition cursor-pointer disabled:opacity-40';

export default function SauvegardeCard({ user }) {
  const champFichier = useRef(null);
  const [telechargement, setTelechargement] = useState(false);
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [resultat, setResultat] = useState(null);

  const telecharger = async () => {
    setTelechargement(true);
    try {
      const reponse = await api.get('/api/sauvegarde/export', { responseType: 'blob', timeout: DELAI });
      const lien = document.createElement('a');
      lien.href = URL.createObjectURL(reponse.data);
      lien.download = nomFichierSauvegarde(user);
      lien.click();
      URL.revokeObjectURL(lien.href);
      toast.success('Sauvegarde téléchargée. Gardez ce fichier en lieu sûr.');
    } catch {
      toast.error('Impossible de créer la sauvegarde. Réessayez dans un instant.');
    } finally {
      setTelechargement(false);
    }
  };

  const annuler = () => {
    setFichier(null);
    setApercu(null);
    setErreur(null);
  };

  const choisirFichier = async (evenement) => {
    const choisi = evenement.target.files?.[0];
    // Sans cela, choisir de nouveau le même fichier ne déclencherait rien.
    evenement.target.value = '';
    if (!choisi) return;
    annuler();
    setResultat(null);
    if (choisi.size > TAILLE_MAX_SAUVEGARDE) {
      setErreur(`Ce fichier dépasse la limite de ${TAILLE_MAX_SAUVEGARDE / (1024 * 1024)} Mo.`);
      return;
    }
    setOccupe(true);
    try {
      const reponse = await api.post('/api/sauvegarde/apercu', choisi, ENVOI);
      setFichier(choisi);
      setApercu(reponse.data);
    } catch (e) {
      setErreur(messageErreurSauvegarde(e));
    } finally {
      setOccupe(false);
    }
  };

  const confirmer = async () => {
    setOccupe(true);
    setErreur(null);
    try {
      const reponse = await api.post('/api/sauvegarde/import', fichier, ENVOI);
      setResultat(reponse.data);
      setFichier(null);
      setApercu(null);
    } catch (e) {
      setErreur(messageErreurSauvegarde(e));
    } finally {
      setOccupe(false);
    }
  };

  const date = dateSauvegarde(apercu);
  const aAjouter = apercu?.total_a_ajouter > 0;

  return (
    <div className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 space-y-3">
      <div>
        <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em] mb-1">Ma sauvegarde</h4>
        <p className="text-[10px] font-semibold text-white/50 leading-relaxed">
          Téléchargez toutes vos données dans un fichier que vous pourrez réimporter plus tard. Votre mot de passe et vos jetons n'y figurent jamais, mais vos opérations et vos IBAN y sont lisibles : gardez ce fichier en lieu sûr.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={telechargement} onClick={telecharger} className={BOUTON_PRINCIPAL}>
          {telechargement ? 'Préparation…' : 'Télécharger ma sauvegarde'}
        </button>
        <button type="button" disabled={occupe} onClick={() => champFichier.current?.click()} className={BOUTON_SECONDAIRE}>
          {occupe && !apercu ? 'Lecture du fichier…' : 'Importer une sauvegarde'}
        </button>
        <input
          ref={champFichier}
          type="file"
          accept=".json,application/json"
          onChange={choisirFichier}
          aria-label="Fichier de sauvegarde à importer"
          className="hidden"
        />
      </div>

      {erreur && <p role="alert" className="text-[10px] font-bold text-rose-300 leading-relaxed">{erreur}</p>}

      {apercu && (
        <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-white">
            {date ? `Sauvegarde du ${date}` : 'Contenu de la sauvegarde'}
          </p>
          <ul className="space-y-0.5">
            {lignesApercu(apercu).map((ligne) => (
              <li key={ligne.table} className="flex justify-between gap-3 text-[10px]">
                <span className={ligne.ajout ? 'font-semibold text-white/80' : 'font-semibold text-white/40'}>{ligne.libelle}</span>
                <span className={ligne.ajout ? 'font-bold text-emerald-400 text-right' : 'font-semibold text-white/30 text-right'}>{ligne.detail}</span>
              </li>
            ))}
          </ul>
          <p className="text-[10px] font-semibold text-white/50 leading-relaxed">
            {aAjouter
              ? "L'import ne fait qu'ajouter ce qui manque : rien de ce qui existe n'est modifié ni supprimé."
              : 'Rien à ajouter : tout le contenu de ce fichier est déjà dans votre compte.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {aAjouter && (
              <button type="button" disabled={occupe} onClick={confirmer} className={BOUTON_PRINCIPAL}>
                {occupe ? 'Import en cours…' : "Confirmer l'import"}
              </button>
            )}
            <button type="button" disabled={occupe} onClick={annuler} className={BOUTON_SECONDAIRE}>
              {aAjouter ? 'Annuler' : 'Fermer'}
            </button>
          </div>
        </div>
      )}

      {resultat && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-3">
          <p role="status" className="text-[10px] font-bold text-emerald-300">
            Import terminé : {resultat.total_a_ajouter.toLocaleString('fr-FR')} élément{resultat.total_a_ajouter > 1 ? 's' : ''} ajouté{resultat.total_a_ajouter > 1 ? 's' : ''}.
          </p>
          <button type="button" onClick={() => window.location.reload()} className={BOUTON_PRINCIPAL}>
            Recharger l'application
          </button>
        </div>
      )}
    </div>
  );
}
