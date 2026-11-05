import { useState, useEffect, useCallback } from 'react';
import api from '../axios';

// Nouvelles transactions disponibles côté banque.
export default function useVerificationSynchro({ user }) {
  const [hasPendingSync, setHasPendingSync] = useState(false);
    const [syncCountByAccount, setSyncCountByAccount] = useState({});
    const [isCheckingSync, setIsCheckingSync] = useState(false);
    const [loading, setLoading] = useState(true);
    // 🟢 APPEL DIRECT DU STATUT DE SYNCHRONISATION
    const checkNewTransactions = useCallback(async () => {
      if (!user) return;
      const token = localStorage.getItem("powens_connecte");
      if (!token) return;

      setIsCheckingSync(true);
      try {
        const res = await api.get(`/powens/check-sync/${user}`);
        if (res.data) {
          setHasPendingSync(Boolean(res.data.has_pending));
          setSyncCountByAccount(res.data.accounts || {});
        }
      } catch (err) {
        console.error("Erreur check-sync:", err);
      } finally {
        setIsCheckingSync(false);
      }
    }, [user]);

    // Déclencheur automatique lors de changements de transactions ou de comptes
    useEffect(() => {
      if (user && !loading) {
        checkNewTransactions();
      }
    }, [user, loading, checkNewTransactions]);

  return { checkNewTransactions, hasPendingSync, isCheckingSync, loading, setLoading, syncCountByAccount };
}
