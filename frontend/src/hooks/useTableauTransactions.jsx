import { useState, useEffect, useMemo } from 'react';
import api from '../axios';
import { CategoryIcon, getCleanCategoryName, setGlobalCustomIconsMap } from '../categoryIcons';
import { estTransfertInterne } from '../utils/finance';
import { toast } from 'sonner';

// Tableau des transactions, catégories et mémoire de classement.
export default function useTableauTransactions({ cleanMonth, comptes, fetchTransactions, filters, financeData, getTxYear, masquees, moisListe, projets, selectedCompte, setCategoriesPerso, setEditingCat, setMasquees, setToutesLesCategories, setToutesLesTransactions, soldesTries, toutesLesCategories, toutesLesTransactions, user }) {
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // On récupère toutes les transactions filtrées par ton useMemo financeData
  // On fusionne revenus, dépenses et transferts pour le tableau de gestion

  const transactionsAAfficher = useMemo(() => {
    let data = [
      ...(financeData.journal.revenus || []),
      ...(financeData.journal.depenses || []),
      ...(financeData.journal.transferts || [])
    ];

    

    // Filtre compte (inchangé)
    if (selectedCompte && selectedCompte !== 'tous') {
      data = data.filter(t => t.compte?.trim().toUpperCase() === selectedCompte.trim().toUpperCase());
    }

    // TRI CORRIGÉ
    return [...data].sort((a, b) => {
      let aVal, bVal;

      if (sortConfig.key === 'jour') {
        // Si on demande de trier par "jour", on trie en fait par la "date" complète
        // Le format ISO YYYY-MM-DD permet un tri alphabétique parfait
        aVal = a.date || "";
        bVal = b.date || "";
      } else if (sortConfig.key === 'montant') {
        aVal = parseFloat(a.montant) || 0;
        bVal = parseFloat(b.montant) || 0;
      } else {
        aVal = (a[sortConfig.key] || "").toString().toLowerCase();
        bVal = (b[sortConfig.key] || "").toString().toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [financeData, sortConfig, selectedCompte]);





  const updateCell = async (id, field, value) => {
    const transactionActive = toutesLesTransactions.find(t => t.id == id);

    if (!transactionActive) {
      console.error("Transaction non trouvée pour l'ID:", id);
      return;
    }

    // --- 1. FONCTION DE NETTOYAGE INTERNE ---
    const nettoyerPourMemoire = (texte) => {
      if (!texte) return "";
      return texte
        .toLowerCase()
        .replace(/\d{2}[\.\/]\d{2}[\.\/]\d{2,4}/g, '') // Enlève les dates (08.03.26)
        .replace(/carte no \d+/gi, '')                 // Enlève "CARTE NO 132"
        .replace(/carte numero \d+/gi, '')             // Enlève "CARTE NUMERO 132"
        .replace(/\s+/g, ' ')                          // Transforme les espaces multiples en un seul
        .trim();
    };

    // --- 2. PRÉPARATION ET SÉCURISATION DES DONNÉES ---
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;

    let parsedValue = value;
    if (field === 'montant') parsedValue = parseFloat(value) || 0;
    if (field === 'prevision_id') parsedValue = value ? parseInt(value) : null;
    if (field === 'enveloppe') parsedValue = value || null;

    // Sécurisation de l'année
    let anneeTx = parseInt(transactionActive.annee);
    if (isNaN(anneeTx) && transactionActive.date) {
      anneeTx = new Date(transactionActive.date).getFullYear();
    }
    if (isNaN(anneeTx)) {
      anneeTx = parseInt(filters.annee) || new Date().getFullYear();
    }

    const updatedData = {
      nom: transactionActive.nom || "",
      montant: parseFloat(transactionActive.montant) || 0,
      categorie: transactionActive.categorie || "Autre",
      utilisateur: nomUtilisateur,
      mois: transactionActive.mois || filters.mois,
      compte: transactionActive.compte || "",
      enveloppe: transactionActive.enveloppe || null,
      prevision_id: transactionActive.prevision_id || null,
      annee: anneeTx,
      date: transactionActive.date || null,
      
      // Application de la valeur modifiée
      [field]: parsedValue 
    };

    try {
      // --- 3. SAUVEGARDE EN BASE DE DONNÉES ---
      await api.put(`/transactions/${id}`, updatedData);
      
      // 🟢 4. MISE À JOUR IMMÉDIATE DU STATE REACT (Résout le blocage de l'interface)
      setToutesLesTransactions(prev => 
        prev.map(t => {
          if (t.id == id) {
            return { ...t, [field]: parsedValue };
          }
          // Si apprentissage actif et qu'on modifie la catégorie, on propage aux libellés identiques
          if (field === 'categorie' && isApprendreActive && t.nom === transactionActive.nom) {
            return { ...t, categorie: parsedValue };
          }
          return t;
        })
      );

      // --- 5. LOGIQUE D'APPRENTISSAGE ---
      if (field === 'categorie' && isApprendreActive) {
        const nomPropre = nettoyerPourMemoire(transactionActive.nom);
        
        await api.post(`/memoire`, {
          nom: nomPropre,
          categorie: value,
          utilisateur: nomUtilisateur
        });

        toast.success(`Mémoire apprise : ${nomPropre}`, {
          icon: (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] mr-2.5">
              <CategoryIcon name={value} size={16} />
            </div>
          ),
          description: `Catégorie associée : ${value}`
        });

        if (typeof fetchMemoire === 'function') {
          await fetchMemoire();
        }
      }

    } catch (err) {
      console.error("Erreur de sauvegarde :", err.response?.data || err);
      toast.error("Erreur lors de la mise à jour de la transaction.");
      fetchTransactions();
    }
  };





  const [selectedIds, setSelectedIds] = useState([]);

  // A mettre dans ton composant parent
  const toggleAll = () => {
    // On compare la longueur actuelle avec le nombre de transactions affichées
    if (selectedIds.length === transactionsAAfficher.length) {
      // Si tout est sélectionné -> on vide tout
      setSelectedIds([]);
    } else {
      // SINON -> on récupère TOUS les IDs proprement dans un tableau
      const allIds = transactionsAAfficher.map(t => t.id);
      setSelectedIds(allIds);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        // On ajoute l'ID au tableau existant
        return [...prev, id];
      }
    });
  };


  const handleDeleteSelected = async () => {
    // Sécurité : on sort si rien n'est sélectionné
    if (selectedIds.length === 0) return;

    try {
      // Envoi de la liste d'IDs au backend
      const res = await api.delete(`/transactions/batch`, { 
        data: selectedIds 
      });

      if (res.data.status === "success") {
        // 1. Mise à jour instantanée du tableau local (UX fluide)
        setToutesLesTransactions(prev => 
          prev.filter(t => !selectedIds.includes(t.id))
        );
        
        // 2. Reset de la sélection pour la prochaine fois
        setSelectedIds([]);
        
       // console.log(`Suppression réussie : ${res.data.deleted_count} éléments.`);
      }
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      // Ici tu peux appeler ta propre notif d'erreur si tu en as une
    }
  };




  const [isApprendreActive, setIsApprendreActive] = useState(false);


  const fetchCategories = async () => {
    if (!user) return;

    // 1. Chargement garanti des catégories, icônes, couleurs et groupes
    try {
      const resCats = await api.get(`/api/categories/${user}`);
      if (resCats.data) {
        setToutesLesCategories(resCats.data.all || []);
        setCategoriesPerso(resCats.data.perso || []);
        setGlobalCustomIconsMap(
          resCats.data.icons_map || {}, 
          resCats.data.colors_map || {}, 
          resCats.data.groups_map || {}
        );
      }
    } catch (err) {
      console.error("Erreur chargement catégories:", err);
    }

    // 2. Chargement des masquages isolément
    try {
      const resMasquees = await api.get(`/api/categories_masquees/${user}`);
      if (resMasquees.data) {
        setMasquees(resMasquees.data || []);
      }
    } catch (err) {
      console.error("Erreur chargement masquées:", err);
    }
  };

  // Effet de chargement au montage
  useEffect(() => {
    if (user) {
      fetchCategories();
    }
  }, [user]);


  const addCategory = async (name, iconName = 'Tag', colorHex = '#818cf8') => {
    const cleanName = getCleanCategoryName(name);
    if (!cleanName) return;

    try {
      await api.post(`/api/categories`, {
        nom: cleanName,
        icone: iconName,
        couleur: colorHex, // 👈 Bien envoyé à l'API
        utilisateur: user
      });

      await fetchCategories(); 
    } catch (err) {
      console.error("Erreur ajout catégorie:", err);
      toast.error("Impossible d'ajouter la catégorie.");
    }
  };

  const handleUpdateCategory = async (name, iconName, colorHex) => {
    try {
      await api.put(`/api/categories`, {
        nom: name,
        icone: iconName,
        couleur: colorHex, // 👈 Bien envoyé à l'API
        utilisateur: user
      });

      await fetchCategories();
      setEditingCat(null);
    } catch (err) {
      console.error("Erreur modification catégorie:", err);
      toast.error("Impossible de modifier la catégorie.");
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);

  const removeCategory = (catName) => {
    setCatToDelete(catName);
    setShowDeleteConfirm(true);
  };

  const confirmDeletecat = async () => {
    if (!catToDelete) return;

    try {
      const encodedName = encodeURIComponent(catToDelete);
      const response = await api.delete(`/api/categories/${user}/${encodedName}`);

      if (response.data.status === "success" || response.data.status === "deleted") {
        setCategoriesPerso(prev => prev.filter(c => c !== catToDelete));
        setToutesLesCategories(prev => prev.filter(c => c !== catToDelete));
        setShowDeleteConfirm(false);
        setCatToDelete(null);
      }
    } catch (err) {
      console.error("Erreur réseau lors de la suppression:", err);
      toast.error("Erreur lors de la suppression");
      setShowDeleteConfirm(false);
    }
  };


  // --- 2. Ta logique de calcul (Dérivée) ---
  // Cette ligne doit être déclarée à chaque rendu, juste avant le "return"
  const categoriesVisibles = toutesLesCategories.filter(cat => !masquees.includes(cat));

  const toggleVisibility = async (catName) => {
    const nouvelleListe = masquees.includes(catName)
      ? masquees.filter(c => c !== catName)
      : [...masquees, catName];
    
    setMasquees(nouvelleListe); 

    try {
      await api.post(`/api/categories_masquees/${user}`, nouvelleListe);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde SQL:", err);
    }
  };





  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');


  // 🟢 Plus de localStorage : les groupes viennent de la BDD et des groupes par défaut
  const DEFAULT_STARTER_GROUPS = [
    'Logement',
    'Vie courante',
    'Transports',
    'Santé',
    'Loisirs',
    'Revenus',
    'Général'
  ];

  const [userManagedGroups, setUserManagedGroups] = useState(DEFAULT_STARTER_GROUPS);

  // Ajout d'un groupe en mémoire (sera persisté en BDD dès qu'une catégorie y sera assignée)

  // 🟢 INDISPENSABLE : Sauvegarde le nouveau groupe de la catégorie dans la BDD
  const handleAssignGroup = async (catName, targetGroup) => {
    if (!targetGroup) return;
    try {
      await api.put('/api/categories/assign-group', {
        nom: catName,
        groupe: targetGroup,
        utilisateur: user
      });
      // Rafraîchit immédiatement les catégories depuis PostgreSQL
      await fetchCategories();
    } catch (err) {
      console.error("Erreur lors de l'assignation du groupe :", err);
    }
  };

  // 🟢 Suppression instantanée en 1 clic (sans confirmation)
  const handleDeleteGroup = async (groupName) => {
    if (!groupName || groupName.toLowerCase() === 'général' || groupName.toLowerCase() === 'general') {
      return; // Sécurité : protège le groupe par défaut 'Général'
    }

    try {
      // 1. Réassigne en BDD les catégories de ce groupe vers "Général"
      await api.put('/api/categories/delete-group', {
        groupe: groupName,
        utilisateur: user,
        fallback_groupe: 'Général'
      });

      // 2. Retire le groupe de la liste
      setUserManagedGroups(prev => prev.filter(g => g.toLowerCase() !== groupName.toLowerCase()));
      
      // 3. Si le filtre actif était ce groupe, on repasse sur 'all'
      if (selectedGroupFilter.toLowerCase() === groupName.toLowerCase()) {
        setSelectedGroupFilter('all');
      }

      // 4. Rafraîchit les catégories
      await fetchCategories();
    } catch (err) {
      console.error("Erreur lors de la suppression du groupe :", err);
    }
  };


  const [selectedDate, setSelectedDate] = useState(new Date()); // 👈 RAJOUTEZ CETTE LIGNE
  // 1. On définit l'état initial (vide pour le compte)
  const [newTx, setNewTx] = useState({
    categorie: 'Autre',
    compte: ''
  });

  // 2. On synchronise le compte dès que le profil change
  useEffect(() => {
    // On filtre les comptes qui appartiennent au profil sélectionné
    // (Adapte 'c.groupe' selon le nom de ta clé dans ton objet compte)
    const comptesFiltrés = soldesTries.filter(s => 
      filters.profil === 'Tous' || s.groupe === filters.profil
    );

    if (comptesFiltrés.length > 0) {
      setNewTx(prev => ({
        ...prev,
        compte: comptesFiltrés[0].compte // On prend le premier de la liste filtrée
      }));
    }
  }, [filters.profil, soldesTries]); 
  // ^ Se déclenche si on change de profil OU si les données arrivent de l'API

  const submitQuickTransaction = async () => {
    const elNom = document.getElementById('quick-nom');
    const elMontant = document.getElementById('quick-montant');

    if (!elNom?.value || !elMontant?.value) return toast.warning("Le libellé et le montant sont obligatoires.");

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateFormatted = `${year}-${month}-${day}`;

    const fullTransaction = {
      nom: elNom.value,
      montant: parseFloat(elMontant.value),
      categorie: newTx.categorie,
      compte: newTx.compte,
      utilisateur: user,
      mois: moisListe[selectedDate.getMonth()].v,
      annee: year, // Pour le backend
      date: dateFormatted 
    };

    try {
      const res = await api.post(`/transactions`, fullTransaction);
      
      if (res.data && res.data.status === "success") {
        // ON CRÉE UN OBJET COMPATIBLE AVEC TON TABLEAU REACT
        const newTransactionForTable = {
          ...res.data,
          année: year, // On ajoute la clé avec accent pour l'affichage immédiat
          annee: year  // On garde sans accent pour la cohérence
        };

        // Ajout en haut de la liste
        setToutesLesTransactions(prev => [newTransactionForTable, ...prev]);
        
        // Reset des champs
        elNom.value = '';
        elMontant.value = '';
        
      } else if (res.data.status === "ignored") {
        toast.warning("Doublon détecté : cette transaction existe déjà.");
      }
    } catch (err) {
      console.error("Erreur lors de l'ajout :", err.response?.data?.detail || err.message);
      toast.error("Erreur lors de l'enregistrement.");
    }
  };



  const transactionsFiltrées = useMemo(() => {
    return (toutesLesTransactions || []).filter(t => {
      const compteInfo = comptes.find(c => (c.compte || "").trim().toUpperCase() === (t.compte || "").trim().toUpperCase());
      const groupeTransaction = compteInfo ? compteInfo.groupe : null;

      // 1. FILTRE PROFIL
      const matchProfil = filters.profil === 'Tous' || 
        (groupeTransaction && groupeTransaction.toLowerCase().trim() === filters.profil.toLowerCase().trim());
      
      // 2. FILTRE COMPTE
      const matchCompte = !selectedCompte || selectedCompte === 'tous' || 
        (t.compte && t.compte.trim().toUpperCase() === selectedCompte.trim().toUpperCase());
      
      // 3. FILTRE MOIS (insensible à la casse et aux accents : Février == Fevrier)
      const matchMois = filters.mois === 'Tous' || 
        cleanMonth(t.mois) === cleanMonth(filters.mois);
      
      // 4. FILTRE ANNÉE (accepte année et annee)
      const matchAnnee = filters.annee === 'Tous' || 
        getTxYear(t) === filters.annee.toString().trim();

      return matchProfil && matchCompte && matchMois && matchAnnee;
    });
  }, [toutesLesTransactions, filters, selectedCompte, comptes]);
  // Ajoute bien 'comptes' dans les dépendances ici !

  const statsFiltrées = useMemo(() => {
    return transactionsFiltrées.reduce((acc, t) => {
      const cat = String(t.categorie || "").toLowerCase().trim();
      const nom = String(t.nom || "").toLowerCase().trim();
      
      // 💡 Détection universelle des transferts internes (avec ou sans émoji) :
      // 1. Catégories de virements internes : "Virement : CCP vers Livret A", "vers", "transfert"
      // 2. Ancien symbole 🔄 au cas où
      // 3. On ne bloque PAS "Virements Reçus" ni "Virements envoyé" qui sont de vraies entrées/sorties externes
      const estUnTransfert = estTransfertInterne(nom, cat);

      if (estUnTransfert) {
        return acc; // On ignore ce virement interne pour ne pas fausser les totaux
      }

      const val = parseFloat(t.montant);
      if (!isNaN(val)) {
        if (val > 0) acc.revenus += val;
        else acc.depenses += Math.abs(val);
        
        acc.solde = acc.revenus - acc.depenses;
      }
      
      return acc;
    }, { revenus: 0, depenses: 0, solde: 0 });
  }, [transactionsFiltrées]);





  const [elementsAppris, setElementsAppris] = useState([]);

  const fetchMemoire = async () => {
    try {
      const nomUtilisateur = typeof user === 'object' ? user.nom : user;
      if (!nomUtilisateur) return;

      const response = await api.get(`/memoire/${nomUtilisateur.toLowerCase()}`);
      
      // Le backend envoie déjà [{"nom":...}, {"nom":...}]
      // On le stocke directement dans l'état
      setElementsAppris(response.data); 
    } catch (error) {
      console.error("Erreur fetch mémoire:", error);
    }
  };


  const handleDeleteMemory = async (itemNom) => {
    try {
      const nomUtilisateur = typeof user === 'object' ? user.nom : user;
      if (!nomUtilisateur) return;

      // Encodage du nom pour gérer les caractères spéciaux ou espaces dans l'URL
      const encodedNom = encodeURIComponent(itemNom.toLowerCase());
      
      // Appel à l'API DELETE
      await api.delete(`/memoire/${nomUtilisateur.toLowerCase()}/${encodedNom}`);

      // Mise à jour locale de l'état pour que l'UI réagisse instantanément
      setElementsAppris(prev => prev.filter(item => item.nom.toLowerCase() !== itemNom.toLowerCase()));

    } catch (error) {
      console.error("Erreur lors de la suppression de l'élément mémoire :", error);
      toast.error("Impossible de supprimer cet élément de la mémoire.");
    }
  };

  return { addCategory, catToDelete, categoriesVisibles, confirmDeletecat, elementsAppris, fetchCategories, fetchMemoire, handleAssignGroup, handleDeleteGroup, handleDeleteMemory, handleDeleteSelected, handleSort, handleUpdateCategory, isApprendreActive, newTx, removeCategory, selectedDate, selectedIds, setIsApprendreActive, setNewTx, setSelectedDate, setSelectedIds, setShowDeleteConfirm, setUserManagedGroups, showDeleteConfirm, sortConfig, statsFiltrées, submitQuickTransaction, toggleAll, toggleSelect, toggleVisibility, transactionsAAfficher, updateCell, userManagedGroups };
}
