import { useState, useMemo } from 'react';
import api from '../axios';
import { CategoryIcon } from '../categoryIcons';
import { estTransfertInterne } from '../utils/finance';
import { toast } from 'sonner';
import useSelectionTransactions from './useSelectionTransactions';
import useCategories from './useCategories';
import useGroupesCategories from './useGroupesCategories';
import useSaisieRapide from './useSaisieRapide';
import useMemoireClassement from './useMemoireClassement';

// Tableau des transactions, catégories et mémoire de classement.
export default function useTableauTransactions({ cleanMonth, comptes, fetchTransactions, filters, financeData, getTxYear, masquees, moisListe, selectedCompte, setCategoriesPerso, setEditingCat, setMasquees, setToutesLesCategories, setToutesLesTransactions, soldesTries, toutesLesCategories, toutesLesTransactions, user }) {
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





  const { handleDeleteSelected, selectedIds, setSelectedIds, toggleAll, toggleSelect } = useSelectionTransactions({ setToutesLesTransactions, transactionsAAfficher });




  const [isApprendreActive, setIsApprendreActive] = useState(false);


  const { addCategory, catToDelete, categoriesVisibles, confirmDeletecat, fetchCategories, handleUpdateCategory, removeCategory, setShowDeleteConfirm, showDeleteConfirm, toggleVisibility } = useCategories({ masquees, setCategoriesPerso, setEditingCat, setMasquees, setToutesLesCategories, toutesLesCategories, user });





  const { handleAssignGroup, handleDeleteGroup, setUserManagedGroups, userManagedGroups } = useGroupesCategories({ fetchCategories, user });


  const { newTx, selectedDate, setNewTx, setSelectedDate, submitQuickTransaction } = useSaisieRapide({ filters, moisListe, setToutesLesTransactions, soldesTries, user });



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





  const { elementsAppris, fetchMemoire, handleDeleteMemory } = useMemoireClassement({ user });

  return { addCategory, catToDelete, categoriesVisibles, confirmDeletecat, elementsAppris, fetchCategories, fetchMemoire, handleAssignGroup, handleDeleteGroup, handleDeleteMemory, handleDeleteSelected, handleSort, handleUpdateCategory, isApprendreActive, newTx, removeCategory, selectedDate, selectedIds, setIsApprendreActive, setNewTx, setSelectedDate, setSelectedIds, setShowDeleteConfirm, setUserManagedGroups, showDeleteConfirm, sortConfig, statsFiltrées, submitQuickTransaction, toggleAll, toggleSelect, toggleVisibility, transactionsAAfficher, updateCell, userManagedGroups };
}
