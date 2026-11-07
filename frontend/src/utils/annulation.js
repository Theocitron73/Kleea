import { toast } from 'sonner';

export const DELAI_ANNULATION = 8000;

/**
 * Retire tout de suite de l'écran, et ne supprime en base qu'à la fin du délai : annuler rend tout, liens compris.
 * shortcut: fermer ou recharger la page pendant le délai abandonne la suppression (rien n'est perdu), à revoir si ça gêne.
 */
export function suppressionAnnulable({ message, retirer, restaurer, supprimer }) {
  retirer();
  const minuteur = setTimeout(async () => {
    try {
      await supprimer();
    } catch {
      restaurer();
      toast.error('La suppression a échoué : rien n’a été effacé.');
    }
  }, DELAI_ANNULATION);
  // Le message disparaît juste avant l'envoi : un clic tardif n'arrive jamais après la suppression.
  toast.info(message, { // Seuls les types nommés reçoivent le fond défini dans ToastProvider.
    duration: DELAI_ANNULATION - 500,
    action: { label: 'Annuler', onClick: () => { clearTimeout(minuteur); restaurer(); } },
  });
}
