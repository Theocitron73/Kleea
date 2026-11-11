// Une nouvelle version du site s'installe en silence, puis s'applique quand la page n'est plus à l'écran
// (autre onglet, fenêtre réduite, appli en arrière-plan) : le rechargement ne se voit pas, et rien n'est coupé en pleine saisie.

/** `appliquer` recharge la page sur la nouvelle version ; il n'est appelé qu'une fois, quand la page est cachée. */
export function appliquerQuandCachee(appliquer, doc = document) {
  let fait = false;
  const essayer = () => {
    if (fait || doc.visibilityState !== 'hidden') return;
    fait = true;
    doc.removeEventListener('visibilitychange', essayer);
    appliquer();
  };
  doc.addEventListener('visibilitychange', essayer);
  essayer(); // Déjà en arrière-plan quand la version arrive : tout de suite.
}
