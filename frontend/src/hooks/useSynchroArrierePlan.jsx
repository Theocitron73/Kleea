import { useState, useCallback } from 'react';
import api from '../axios';

// Synchronisation au chargement.
export default function useSynchroArrierePlan({ fetchComptes, fetchPowensConnections, fetchTransactions, importMode, user }) {
  const performBackgroundSyncIfNeeded = useCallback(async (forcedMode = null) => {
    const activeMode = forcedMode || importMode;
    if (!user || activeMode !== 'auto') return;

    const token = localStorage.getItem('powens_connecte');
    if (!token) return;

    const now = Date.now();
    const lastSyncStr = localStorage.getItem(`last_powens_sync_time_${user}`);
    const sixHoursInMs = 6 * 60 * 60 * 1000;

    if (!lastSyncStr || (now - parseInt(lastSyncStr, 10)) > sixHoursInMs || forcedMode) {
      // 🟢 1. Active l'indicateur visuel au démarrage
      setIsAutoSyncingOnLoad(true);

      try {
        await api.post(`/powens/sync-user/${user}`);
        await api.post(`/powens/recalculate-balances/${user}`);
        localStorage.setItem(`last_powens_sync_time_${user}`, now.toString());
        
        await fetchTransactions();
        await fetchComptes();
        await fetchPowensConnections();
      } catch (err) {
        console.error("Erreur lors de la synchronisation d'arrière-plan:", err);
      } finally {
        // 🟢 2. Masque l'indicateur avec un léger délai pour confirmer la fin
        setTimeout(() => {
          setIsAutoSyncingOnLoad(false);
        }, 1500);
      }
    }
  }, [user, importMode, fetchTransactions, fetchComptes, fetchPowensConnections]);
  /*
  // Effet pour surveiller et déclencher le cycle de vérification
  useEffect(() => {
    if (user && importMode === 'auto') {
      // Vérification immédiate lors de l'ouverture du site
      performBackgroundSyncIfNeeded();

      // Vérification récurrente toutes les 30 minutes pendant que l'onglet reste ouvert
      const interval = setInterval(() => {
        performBackgroundSyncIfNeeded();
      }, 30 * 60 * 1000);

      return () => clearInterval(interval);
    }
  }, [user, importMode, performBackgroundSyncIfNeeded]);
  */
  // État pour le deuxième graphique (Détaillé)
  // On stocke ici les noms des comptes masqués sous forme de tableau ou d'objet
  const [hiddenComptes, setHiddenComptes] = useState({});

  const [isAutoSyncingOnLoad, setIsAutoSyncingOnLoad] = useState(false);

  return { hiddenComptes, isAutoSyncingOnLoad, performBackgroundSyncIfNeeded, setHiddenComptes };
}
