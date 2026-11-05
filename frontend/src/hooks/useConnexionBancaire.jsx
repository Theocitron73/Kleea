import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../axios';
import { toast } from 'sonner';

// Import de fichiers et connexion bancaire Powens.
export default function useConnexionBancaire({ activeTab, comptes, fetchCategoriesConfig, fetchComptes, fetchTransactions, importCompte, importMode, selectedCompte, setActiveTab, setCelebrationModal, setImportMode, setOnboardingDismissed, setShowOnboarding, setTempTransactions, toutesLesTransactions, transactionsCalculees, user }) {
  const [fileName, setFileName] = useState("");


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
  const [isSyncingData, setIsSyncingData] = useState(false);
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
      } catch (error) {
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

  const BANQUE_STOP_WORDS = new Set([
    "de", "du", "des", "le", "la", "les", "a", "au", "aux", "en", "un", "une",
    "mme", "mr", "m", "monsieur", "madame", "mlle", "mademoiselle",
    "paiement", "carte", "cb", "fact", "facture", "virement", "vir", "sepa",
    "prlv", "prelevement", "debit", "credit", "retrait", "dab", "gab", "emission",
    "reception", "remise", "cotisation", "frais", "achat", "web", "echeance",
    "operation", "interbancaire", "bancaire", "vers", "pour", "par", "ref", "titre",
    "instantane", "recu", "emis", "motif"
  ]);

  const getSignificantTokens = (label) => {
    if (!label) return [];
    return Array.from(new Set(
      label
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\b\d{2}[\/\.-]\d{2}([\/\.-]\d{2,4})?\b/g, " ")
        .replace(/\b\d{1,2}h\d{2}\b/g, " ")
        .replace(/\b[a-z0-9_-]*\d{4,}[a-z0-9_-]*\b/gi, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(w => w.length >= 3 && !BANQUE_STOP_WORDS.has(w) && !/^\d+$/.test(w))
    ));
  };

  const areLabelsSimilar = (labelA, labelB) => {
    const tokensA = getSignificantTokens(labelA);
    const tokensB = getSignificantTokens(labelB);

    if (tokensA.length === 0 && tokensB.length === 0) return true;
    if (tokensA.length === 0 || tokensB.length === 0) return false;

    const setA = new Set(tokensA);
    const setB = new Set(tokensB);

    const intersection = tokensA.filter(t => setB.has(t));
    if (intersection.length === 0) {
      const strA = tokensA.join("");
      const strB = tokensB.join("");
      return strA.length >= 4 && strB.length >= 4 && (strA.includes(strB) || strB.includes(strA));
    }

    const isSubset = tokensA.every(t => setB.has(t)) || tokensB.every(t => setA.has(t));
    if (isSubset && intersection.some(t => t.length >= 3)) {
      return true;
    }

    const union = new Set([...tokensA, ...tokensB]);
    return (intersection.length / union.size) >= 0.4;
  };

  const parseDateOnly = (dStr) => {
    if (!dStr) return null;
    if (dStr instanceof Date) return isNaN(dStr.getTime()) ? null : dStr;
    const s = String(dStr).split('T')[0].split(' ')[0].trim();

    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(s)) {
      const [d, m, y] = s.split(/[-/]/).map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2}$/.test(s)) {
      const [d, m, y] = s.split(/[-/]/).map(Number);
      return new Date(2000 + y, m - 1, d);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // 🟢 VÉRIFICATION UNIQUE AVEC CONTRAINTE DE DISTANCE DE DATES
  const findSingleDuplicate = (incomingTx, existingList, claimedIds, maxAllowedDays) => {
    const incMontant = parseFloat(incomingTx.montant) || 0;
    const incDate = parseDateOnly(incomingTx.date);
    if (!incDate) return null;

    const incCompte = (incomingTx.compte || "").trim().toUpperCase();

    for (const exist of existingList) {
      if (claimedIds.has(exist.id)) continue;

      // 1. Montant identique au centime près
      const existMontant = parseFloat(exist.montant) || 0;
      if (Math.abs(Math.abs(incMontant) - Math.abs(existMontant)) > 0.01) continue;
      if ((incMontant > 0) !== (existMontant > 0)) continue;

      // 2. Vérification compte
      const existCompte = (exist.compte || "").trim().toUpperCase();
      if (incCompte && existCompte) {
        const c1 = incCompte.replace(/[^A-Z0-9]/g, '');
        const c2 = existCompte.replace(/[^A-Z0-9]/g, '');
        const isLivret1 = c1.includes('LIVRET') || c1.includes('LEP') || c1.includes('LDDS');
        const isLivret2 = c2.includes('LIVRET') || c2.includes('LEP') || c2.includes('LDDS');
        if (isLivret1 !== isLivret2) continue;
      }

      // 3. Écart de date
      const existDate = parseDateOnly(exist.date);
      if (!existDate) continue;

      const diffDays = Math.abs((incDate.getTime() - existDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > maxAllowedDays) continue;

      // 4. Comparaison du libellé
      if (areLabelsSimilar(incomingTx.nom, exist.nom)) {
        return exist;
      }
    }

    return null;
  };


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
