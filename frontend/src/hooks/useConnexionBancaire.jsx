import { useState, useEffect, useCallback } from 'react';
import api from '../axios';
import { toast } from 'sonner';
import { findSingleDuplicate } from '../utils/detectionDoublons';
import useVerificationSynchro from './useVerificationSynchro';
import useRetourPowens from './useRetourPowens';

// Import de fichiers et connexion bancaire Powens.
export default function useConnexionBancaire({ activeTab, comptes, fetchCategoriesConfig, fetchComptes, fetchTransactions, importCompte, importMode, selectedCompte, setActiveTab, setCelebrationModal, setImportMode, setOnboardingDismissed, setShowOnboarding, setTempTransactions, toutesLesTransactions, transactionsCalculees, user }) {
  const [, setFileName] = useState("");


  // 🟢 ENVOI EXCLUSIF DES NOUVELLES TRANSACTIONS
  const confirmBatchImport = async () => {
    try {
      // On filtre pour ne pas renvoyer celles qui sont déjà en base
      const nouvellesLignes = transactionsCalculees.filter(t => !t.isAlreadyImported);

      if (nouvellesLignes.length === 0) {
        toast.warning("Aucune nouvelle transaction à importer.");
        return;
      }

      const response = await api.post(`/transactions/batch`, nouvellesLignes);
      
      if (response.data.status === "success") {
         setTempTransactions([]);
         setFileName("");
         
         toast.success(
           `${response.data.added} nouvelle(s) transaction(s) importée(s) avec succès ! ⚡`
         
         );

         

         await fetchTransactions(); 
         await fetchComptes();
         await checkNewTransactions(); 
      }
    } catch (error) {
      console.error("Erreur import:", error);
      toast.error("Erreur lors de l'insertion des écritures");
    }
  };


  // 1. État pour afficher/masquer la modale de sélection
  const [showPowensModal, setShowPowensModal] = useState(false);
  const [isSyncingPowens, setIsSyncingPowens] = useState(false);
  // En haut de votre composant FinanceApp / Login :
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  // Remplace ou ajoute cet état en haut de ton composant
  const [isSyncingData] = useState(false);
  // 2. État pour stocker la liste des connexions et comptes
  const [powensData, setPowensData] = useState({
    connections_count: 0,
    connections: [],
    accounts_count: 0,
    accounts: []
  });

  const fetchPowensConnections = useCallback(async () => {
    try {
      const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
      if (!nomUtilisateur) return;

      // 1. Le serveur garde le jeton : il indique seulement si ce compte a une banque connectée
      let connecte = false;
      try {
        const resConnexion = await api.get('/powens/connexion-active');
        connecte = Boolean(resConnexion.data?.connecte);
      } catch (e) {
        console.error("Erreur vérification connexion bancaire:", e);
      }

      // 2. Sans banque connectée, on vide l'indicateur local et on arrête là
      if (!connecte) {
        localStorage.removeItem("powens_connecte");
        setPowensData({ connections_count: 0, connections: [], accounts_count: 0, accounts: [] });
        return;
      }

      localStorage.setItem("powens_connecte", "true");

      // 3. Récupération des connexions et comptes
      const res = await api.get('/powens/connections-and-accounts');
      if (res.data) {
        setPowensData(res.data);
      }
    } catch (err) {
      console.error("Erreur chargement banques/comptes Powens:", err);
    }
  }, [user]);



  // 🟢 VERSION SÉCURISÉE CONTRE LE DÉCALAGE ASYNCHRONE :
  const {  } = useRetourPowens({ activeTab, fetchCategoriesConfig, fetchComptes, fetchPowensConnections, fetchTransactions, setActiveTab, setImportMode, setIsManualSyncing, setOnboardingDismissed, setShowOnboarding, user });

  // 🟢 Ajout d'un paramètre optionnel 'overrideMode'
  const handleSyncPowens = async (overrideMode = null) => {
    const activeMode = overrideMode || importMode; // Utilise le mode forcé s'il est fourni, sinon l'état
    const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
    const token = localStorage.getItem('powens_connecte');

    if (!token) {
      setIsSyncingPowens(true);
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const resUrl = await api.get(
          `/powens/connect-url?redirect_url=${encodeURIComponent(redirectUri)}`
        );
        
        if (resUrl.data?.url) {
          window.location.href = resUrl.data.url;
          return;
        }
      } catch  {
        toast.error("Erreur lors de la génération de l'URL bancaire.");
        
      } finally {
        setIsSyncingPowens(false);
      }
    } else {
      await fetchPowensConnections();
      
      if (activeMode === 'auto') {
        setIsManualSyncing(true);
        try {
          await api.post(`/powens/sync-user/${nomUtilisateur}`);
          await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
          await fetchTransactions();
          await fetchComptes();
          await checkNewTransactions();
          toast.success("Comptes synchronisés avec succès ! ⚡");
         
        } catch (err) {
          console.error("Erreur de synchro silencieuse :", err);
        } finally {
          setIsManualSyncing(false);
        }
      } else {
        setShowPowensModal(true);
      }
    }
  };

  // =========================================================================
  // 🟢 MODULE DÉDOUBLONNAGE V4 (ALGORITHME EN 2 PASSES : DATE EXACTE PRIORITAIRE)
  // =========================================================================

  

  // =========================================================================
  // 🟢 1. IMPORT FICHIER CSV AVEC RÉCONCILIATION EN 2 PASSES
  // =========================================================================
  const handleFileUpload = async (file) => {
    if (!file) return;
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;
    const targetCompte = importCompte || selectedCompte || comptes[0]?.compte;

    try {
      const response = await api.post(
        `/import-csv?utilisateur=${nomUtilisateur}`, 
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const lignesBrutes = response.data;
      const batchOccurrences = {};

      // 1. Première passe locale : détection des doublons au sein du même fichier CSV (#2, #3)
      const preparedLines = lignesBrutes.map((t) => {
        const baseNom = (t.nom || "Transaction").trim();
        const dateStr = t.date ? String(t.date).trim() : "";
        const montantNum = parseFloat(t.montant) || 0;

        const groupKey = `${dateStr}_${montantNum.toFixed(2)}_${baseNom.toUpperCase()}`;
        const occurrence = (batchOccurrences[groupKey] || 0) + 1;
        batchOccurrences[groupKey] = occurrence;

        let nomFinal = baseNom;
        if (occurrence > 1 && !/#\d+$/.test(nomFinal)) {
          nomFinal = `${baseNom} #${occurrence}`;
        }

        return {
          ...t,
          nom: nomFinal,
          compte: targetCompte,
          duplicateIndex: occurrence
        };
      });

      const claimedDbIds = new Set();
      const matchedDuplicates = new Array(preparedLines.length).fill(null);

      // 🟢 PASSE 1 OBLIGATOIRE : Rapprochement STRICT sur la DATE EXACTE (diffDays = 0)
      // Empêche formellement une opération du 30/10 de voler le péage du 27/10 !
      for (let i = 0; i < preparedLines.length; i++) {
        const match = findSingleDuplicate(preparedLines[i], toutesLesTransactions || [], claimedDbIds, 0.5);
        if (match) {
          claimedDbIds.add(match.id);
          matchedDuplicates[i] = match;
        }
      }

      // 🟢 PASSE 2 : Tolérance floue (1 à 2 jours) UNIQUEMENT pour les lignes orphelines
      for (let i = 0; i < preparedLines.length; i++) {
        if (matchedDuplicates[i]) continue; // Déjà réconcilié à la date exacte
        const match = findSingleDuplicate(preparedLines[i], toutesLesTransactions || [], claimedDbIds, 2.0);
        if (match) {
          claimedDbIds.add(match.id);
          matchedDuplicates[i] = match;
        }
      }

      // 3. Construction des lignes finales avec statut propre
      let nbDoublonsDetectes = 0;
      const lignesTraitees = preparedLines.map((t, idx) => {
        const duplicateFound = matchedDuplicates[idx];
        const alreadyInDb = Boolean(duplicateFound);
        if (alreadyInDb) nbDoublonsDetectes++;

        return {
          ...t,
          isAlreadyImported: alreadyInDb,
          isPotentialDuplicate: alreadyInDb || t.duplicateIndex > 1,
          matchedWith: duplicateFound ? `${duplicateFound.nom} (${duplicateFound.date})` : null
        };
      });

      setTempTransactions(lignesTraitees);

      if (nbDoublonsDetectes > 0) {
        toast.info(`ℹ️ ${nbDoublonsDetectes} / ${lignesBrutes.length} transaction(s) déjà en base détectée(s) et ignorée(s).`);
      }

    } catch (error) {
      console.error("Erreur import:", error);
      toast.error("Erreur lors de l'analyse du CSV");
      setFileName("");
    }
  };

  // =========================================================================
  // 🟢 2. IMPORT POWENS MANUEL (DÉDOUBLONNÉ AVEC CSV & BDD)
  // =========================================================================
  const handlePowensImportSuccess = (transactions, accountName) => {
    if (!transactions || transactions.length === 0) {
      toast.warning(`Aucune transaction trouvée pour le compte ${accountName}.`);
      return;
    }

    const batchOccurrences = {};
    const preparedLines = transactions.map(t => {
      const baseNom = (t.nom || t.libelle || "Transaction").trim();
      const dateStr = t.date ? String(t.date).trim() : "";
      const montantNum = parseFloat(t.montant) || 0;

      const groupKey = `${dateStr}_${montantNum.toFixed(2)}_${baseNom.toUpperCase()}`;
      const occurrence = (batchOccurrences[groupKey] || 0) + 1;
      batchOccurrences[groupKey] = occurrence;

      let nomFinal = baseNom;
      if (occurrence > 1 && !/#\d+$/.test(nomFinal)) {
        nomFinal = `${baseNom} #${occurrence}`;
      }

      return {
        ...t,
        nom: nomFinal,
        compte: accountName,
        duplicateIndex: occurrence
      };
    });

    const claimedDbIds = new Set();
    const matchedDuplicates = new Array(preparedLines.length).fill(null);

    // PASSE 1 : Date exacte
    for (let i = 0; i < preparedLines.length; i++) {
      const match = findSingleDuplicate(preparedLines[i], toutesLesTransactions || [], claimedDbIds, 0.5);
      if (match) {
        claimedDbIds.add(match.id);
        matchedDuplicates[i] = match;
      }
    }

    // PASSE 2 : Décalage 1 à 2 jours
    for (let i = 0; i < preparedLines.length; i++) {
      if (matchedDuplicates[i]) continue;
      const match = findSingleDuplicate(preparedLines[i], toutesLesTransactions || [], claimedDbIds, 2.0);
      if (match) {
        claimedDbIds.add(match.id);
        matchedDuplicates[i] = match;
      }
    }

    let nbDoublons = 0;
    const transactionsMarquees = preparedLines.map((t, idx) => {
      const duplicate = matchedDuplicates[idx];
      const alreadyInDb = Boolean(duplicate);
      if (alreadyInDb) nbDoublons++;

      return {
        ...t,
        isAlreadyImported: alreadyInDb,
        isPotentialDuplicate: alreadyInDb || t.duplicateIndex > 1,
        matchedWith: duplicate ? duplicate.nom : null
      };
    });

    const nbNouvelles = transactionsMarquees.length - nbDoublons;

    setFileName(`Import Powens (${accountName})`);
    setTempTransactions(transactionsMarquees);

    toast.success(`${transactionsMarquees.length} transactions analysées (${nbNouvelles} nouvelle(s), ${nbDoublons} déjà en base).`);
    fetchPowensConnections();
    checkNewTransactions();
  };


  const handleConnectNewBank = async (connectionId = null) => {
    setIsSyncingPowens(true);
    try {
      const redirectUri = window.location.origin + window.location.pathname;

      let urlEndpoint = `/powens/connect-url?redirect_url=${encodeURIComponent(redirectUri)}`;
      if (connectionId) {
        urlEndpoint += `&connection_id=${connectionId}`;
      }

      const resUrl = await api.get(urlEndpoint);
      const url = resUrl.data?.url || resUrl.data?.redirect_url;

      if (url) {
        window.location.href = url;
      } else {
        toast.error("URL de connexion Powens introuvable.");
      }
    } catch (err) {
      console.error("Erreur génération lien Powens:", err);
      toast.error("Erreur lors de la génération de l'URL bancaire.");
    } finally {
      setIsSyncingPowens(false);
    }
  };

  // 🟢 Modale d'alerte Reconnexion DSP2 Jour J
    const [scaExpiredConnection, setScaExpiredConnection] = useState(null);

    // Vérifie si une banque connectée a expiré
    useEffect(() => {
      if (powensData?.connections && powensData.connections.length > 0) {
        const expiredConn = powensData.connections.find(c => {
          const isDismissed = sessionStorage.getItem(`sca_dismissed_${c.id}`);
          return !isDismissed && (c.needs_reconnect || (c.days_left !== null && c.days_left <= 0));
        });

        if (expiredConn) {
          setScaExpiredConnection(expiredConn);
        }
      }
    }, [powensData]);


  // Remplacez ou ajoutez ces états en haut de votre composant
  const { checkNewTransactions, hasPendingSync, isCheckingSync, loading, setLoading, syncCountByAccount } = useVerificationSynchro({ user });


  const handleAssociateAccount = async (powensAccountName, targetCompte) => {
    try {
      const targetCompteName = targetCompte || "";
      const localCompteObj = targetCompteName
        ? comptes?.find((c) => c.compte === targetCompteName)
        : comptes?.find((c) => (c.powens_name || "").trim().toUpperCase() === powensAccountName.trim().toUpperCase());

      if (!localCompteObj) return;

      const newPowensName = targetCompteName ? powensAccountName : null;

      const updatedCompte = {
        compte: localCompteObj.compte,
        groupe: localCompteObj.groupe || "Général",
        solde: parseFloat(localCompteObj.solde || 0),
        objectif: parseFloat(localCompteObj.objectif || 0),
        couleur: localCompteObj.couleur || "#000000",
        utilisateur: (localCompteObj.utilisateur || user || "defaut").toLowerCase(),
        taux: parseFloat(localCompteObj.taux || 0),
        powens_name: newPowensName
      };

      await api.put(
        `/config-comptes/${encodeURIComponent(localCompteObj.compte)}`,
        updatedCompte
      );

      // 🟢 EN MODE AUTO : Recalibrage rétroactif complet dès la liaison
      if (importMode === 'auto') {
        try {
          await api.post(`/powens/sync-user/${user}`);
          await api.post(`/powens/reconcile-and-recalculate/${user}`);
          await fetchTransactions();
          await fetchComptes();

          setCelebrationModal({
            show: true,
            accountName: localCompteObj.compte,
            count: 0
          });
        } catch (syncErr) {
          console.error("Échec recalibrage:", syncErr);
        }
      } else {
        fetchComptes();
      }

      setTimeout(() => {
        checkNewTransactions();
      }, 100);

    } catch (err) {
      console.error("Erreur lors de l'association:", err);
    }
  };

  return { checkNewTransactions, confirmBatchImport, fetchPowensConnections, handleAssociateAccount, handleConnectNewBank, handleFileUpload, handlePowensImportSuccess, handleSyncPowens, hasPendingSync, isCheckingSync, isManualSyncing, isSyncingData, isSyncingPowens, loading, powensData, scaExpiredConnection, setFileName, setIsManualSyncing, setLoading, setPowensData, setScaExpiredConnection, setShowPowensModal, showPowensModal, syncCountByAccount };
}
