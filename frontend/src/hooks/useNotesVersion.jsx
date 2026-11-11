import { useState, useEffect } from 'react';

// Affichage des notes de version.
export default function useNotesVersion({ user }) {
  const [showPatchModal, setShowPatchModal] = useState(false);

  // Version du patch actuel (le compteur se reset tout seul si tu changes cette valeur !)
  const CURRENT_VERSION = "4.5"; 

  useEffect(() => {
    if (!user) return;

    // En incluant CURRENT_VERSION dans la clé, on crée un compteur unique par mise à jour
    const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
    const viewCount = parseInt(localStorage.getItem(patchKey)) || 0;

    // On l'affiche tant qu'on n'a pas atteint la limite (ici, 2 fois)
    if (viewCount < 1) {
      const timer = setTimeout(() => {
        setShowPatchModal(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user, CURRENT_VERSION]); // Ajout de CURRENT_VERSION dans les dépendances par sécurité

  const handleClosePatchModal = () => {
    setShowPatchModal(false);

    // On incrémente sur la clé qui contient la version actuelle
    const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
    const currentCount = parseInt(localStorage.getItem(patchKey)) || 0;
    localStorage.setItem(patchKey, currentCount + 1);
  };

  return { CURRENT_VERSION, handleClosePatchModal, showPatchModal };
}
