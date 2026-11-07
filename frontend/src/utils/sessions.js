// Appareils connectés : affichage des dates, et message à montrer après une déconnexion à distance.
const CLE_MESSAGE = 'kleea_message_connexion';
const MOBILE = /iphone|ipad|android/i;

export function estMobile(appareil) {
  return MOBILE.test(appareil || '');
}

/** « À l'instant », « il y a 12 min », « il y a 3 h », puis la date. */
export function activiteLisible(iso, maintenant = new Date()) {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return 'Activité inconnue';
  const minutes = Math.floor((maintenant.getTime() - date.getTime()) / 60000);
  // Un écart d'horloge avec le serveur peut donner une date à venir.
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (minutes < 24 * 60) return `Il y a ${Math.floor(minutes / 60)} h`;
  return `Le ${date.toLocaleDateString('fr-FR')}`;
}

/** Garde le motif pour l'écran de connexion. Ne doit jamais empêcher le retour à cet écran. */
export function noterDeconnexion(detail) {
  if (typeof detail !== 'string' || !detail.includes('déconnectée')) return;
  try {
    sessionStorage.setItem(CLE_MESSAGE, detail);
  } catch {
    // Stockage bloqué : le retour à la connexion se fait simplement sans message.
  }
}

/** Sans consommer le message : l'application ouvre alors le formulaire de connexion plutôt que la page d'accueil. */
export function deconnexionEnAttente() {
  try {
    return Boolean(sessionStorage.getItem(CLE_MESSAGE));
  } catch {
    return false;
  }
}

export function lireMessageDeconnexion() {
  try {
    const message = sessionStorage.getItem(CLE_MESSAGE);
    sessionStorage.removeItem(CLE_MESSAGE);
    return message;
  } catch {
    return null;
  }
}
