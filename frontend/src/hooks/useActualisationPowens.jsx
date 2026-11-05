import { useState } from 'react';
import api from '../axios';
import { toast } from 'sonner';

// Actualisation forcée des banques.
export default function useActualisationPowens({ checkNewTransactions, fetchComptes, fetchPowensConnections, fetchTransactions, importMode, user }) {
  const [isRefreshingPowens, setIsRefreshingPowens] = useState(false);

  const handleForceRefreshPowens = async () => {
    if (isRefreshingPowens) return;
    setIsRefreshingPowens(true);

    // 1. On démarre le toast de chargement infini et on récupère son identifiant
    const toastId = toast.loading("Interrogation de votre banque en direct... ⏳", {
      description: "Connexion sécurisée aux serveurs bancaires"
    });

    try {
      // 🟢 1. Déclenche la connexion réelle de Powens auprès de vos serveurs bancaires
      await api.post(`/powens/refresh-bank-sync/${user}`);

      // 🟢 2. Si vous êtes en mode automatique, on importe les nouvelles transactions immédiatement
      if (importMode === 'auto') {
        await api.post(`/powens/sync-user/${user}`);
        await api.post(`/powens/recalculate-balances/${user}`);
        await fetchTransactions();
      }

      // 🟢 3. Rafraîchissement des soldes et du détecteur de nouvelles écritures
      await Promise.all([
        fetchPowensConnections(),
        checkNewTransactions(),
        fetchComptes()
      ]);

      // 2. Le toast de chargement se transforme instantanément en succès ✨
      toast.success("Banque interrogée et données synchronisées ! ⚡", {
        id: toastId, // 👈 C'est cet id qui remplace le message en cours
        description: "Vos soldes et transactions sont à jour"
      });

    } catch (err) {
      console.error("Erreur lors de l'actualisation manuelle :", err);
      
      // 3. En cas d'échec, il se transforme en erreur ❌
      toast.error("Impossible d'interroger la banque pour le moment.", {
        id: toastId, // 👈 Remplace le message en cours
        description: "Veuillez réessayer dans quelques instants"
      });

    } finally {
      setIsRefreshingPowens(false);
    }
  };

  return { handleForceRefreshPowens, isRefreshingPowens };
}
