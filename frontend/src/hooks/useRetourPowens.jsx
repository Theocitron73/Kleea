import { useEffect, useRef } from 'react';
import api from '../axios';
import { toast } from 'sonner';

// Retour de Powens après la connexion d'une banque.
export default function useRetourPowens({ activeTab, fetchCategoriesConfig, fetchComptes, fetchPowensConnections, fetchTransactions, setActiveTab, setImportMode, setIsManualSyncing, setOnboardingDismissed, setShowOnboarding, user }) {
  const codePowensTraite = useRef(null);
    useEffect(() => {
      const handlePowensCallback = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const powensCode = urlParams.get('code');
        const connectionId = urlParams.get('connection_id');

        if (!powensCode && !connectionId) return;

        // 🟢 Bloque immédiatement et définitivement la modale d'onboarding au retour de Powens
        setShowOnboarding(false);
        setOnboardingDismissed(true);
        const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
        if (nomUtilisateur) {
          localStorage.setItem(`onboarding_done_${nomUtilisateur}`, 'true');
        }

        const existingToken = localStorage.getItem('powens_connecte');

        // 🟢 Récupération immédiate et prioritaire du mode d'import réel en BDD
        let actualImportMode = 'manual';
        try {
          const profileRes = await api.get(`/profile/${nomUtilisateur}`);
          if (profileRes.data?.import_mode) {
            actualImportMode = profileRes.data.import_mode;
            setImportMode(actualImportMode); // Synchronise l'état local
          }
        } catch (e) {
          console.error("Erreur de pré-chargement du profil pour Powens:", e);
        }

        // CAS 1 : L'utilisateur a DÉJÀ un token (Ajout d'une autre banque)
        if (existingToken && (powensCode || connectionId)) {
          toast.success("Nouvel établissement connecté avec succès !");
          
          window.history.replaceState({}, document.title, window.location.pathname);
          await fetchPowensConnections();

          setActiveTab('comptes'); // 🟢 Redirige vers la configuration des comptes

          if (actualImportMode === 'auto') {
            // Mode automatique : exécution en arrière-plan et mise à jour
            try {
              setIsManualSyncing(true);
              await api.post(`/powens/sync-user/${nomUtilisateur}`);
              await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
              fetchTransactions();
              fetchComptes();
            } catch (err) {
              console.error("Erreur de synchronisation automatique initiale :", err);
            } finally {
              setIsManualSyncing(false);
            }
          }
          return;
        }

        // CAS 2 : Tout PREMIER ajout de banque
        if (powensCode && !existingToken && nomUtilisateur) {
          // Un code ne s'échange qu'une fois, même si cet effet se relance.
          if (codePowensTraite.current === powensCode) return;
          codePowensTraite.current = powensCode;

          try {
            const redirectUri = window.location.origin + window.location.pathname;
            const res = await api.post('/powens/callback', {
              code: powensCode,
              redirect_uri: redirectUri,
              state: urlParams.get('state') || '',
            });

            if (res.data?.status === 'success') {
              localStorage.setItem('powens_connecte', 'true');

              toast.success("Compte bancaire connecté avec succès !");
             
              window.history.replaceState({}, document.title, window.location.pathname);

              await fetchPowensConnections();

              setActiveTab('comptes'); // 🟢 Redirige vers la configuration des comptes

              if (actualImportMode === 'auto') {
                try {
                  setIsManualSyncing(true);
                  await api.post(`/powens/sync-user/${nomUtilisateur}`);
                  await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
                  fetchTransactions();
                  fetchComptes();
                } catch (err) {
                  console.error("Erreur de synchronisation automatique initiale :", err);
                } finally {
                  setIsManualSyncing(false);
                }
              }
            }
          } catch (err) {
            console.error("Erreur lors de l'échange du code Powens:", err);
            const detail = err.response?.data?.detail;
            toast.error(typeof detail === 'string' ? detail : "La connexion bancaire a échoué. Relance-la.");
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      };

      handlePowensCallback();
    }, [fetchPowensConnections, user]);

    // 🟢 2. CHARGEMENT AUTOMATIQUE AU CHANGEMENT D'ONGLET
    useEffect(() => {
      if (activeTab === 'importer') {
        fetchPowensConnections();
        fetchCategoriesConfig();
      }
    }, [activeTab, fetchPowensConnections]);

  return {  };
}
