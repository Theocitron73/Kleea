import { useState, useEffect, useMemo } from 'react';
import api from '../axios';

// Budgets : chargement, modification et jauges.
export default function useBudgets({ activeTab, comptesDuProfil, filters, statsCategories, toutesLesTransactions, user }) {
  const [budgets, setBudgets] = useState([]);
  const [formBudget, setFormBudget] = useState({ nom: '', somme: '' });
  const [showBudgetDetails, setShowBudgetDetails] = useState(false);

  // 🛠️ AJOUT : État pour stocker l'année sélectionnée (par défaut l'année en cours)
  const [selectedBudgetYear, setSelectedBudgetYear] = useState(new Date().getFullYear()); 


  // Extraction et tri des années uniques (ex: [2026, 2025])
  const anneesUniques = [...new Set(budgets.map(b => b.annee || new Date().getFullYear()))].sort((a, b) => b - a);

  // Formatage pour ton CustomSelect { v: valeur, l: label }
  const optionsAnnees = anneesUniques.map(annee => ({
    v: annee,
    l: annee.toString()
  }));

  // 2. Fonction de chargement mise à jour
  const loadBudgets = async (fetchAll = false) => {
    try {
      const url = fetchAll 
        ? `/get-budgets/${user}` 
        : `/get-budgets/${user}/${filters.mois}`;
        
      const res = await api.get(url);
      
      if (Array.isArray(res.data)) {
          setBudgets(res.data);
      }
    } catch (err) {
      console.error("Erreur chargement :", err);
    }
  };


  const handleAddBudget = async (e) => {
    if (e) e.preventDefault();
    
    const budgetData = {
      utilisateur: String(user || "theo"), 
      mois: String(formBudget.mois || filters.mois), 
      // Optionnel : tu peux ajouter l'année ici ou laisser Python s'en occuper
      // annee: new Date().getFullYear(), 
      compte: String(formBudget.compte || "tous"),
      type: "Categorie",
      nom: String(formBudget.nom),
      somme: parseFloat(formBudget.somme) || 0
    };

    try {
      const res = await api.post(`/save-budget`, budgetData);
      if (res.status === 200) {
        setFormBudget({ ...formBudget, nom: '', somme: '' });
        const fetchAll = activeTab === 'gerer';
        await loadBudgets(fetchAll); 
      }
    } catch (err) {
      console.error("Erreur lors de l'ajout :", err.response?.data);
    }
  };


  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const confirmDelete2 = (budgetObj) => {
    setBudgetToDelete(budgetObj); // On stocke l'objet {nom, mois, compte...}
  };

  const executeDeleteBudget = async () => {
    if (!budgetToDelete) return;
    
    try {
      // 🛠️ AJOUT : On récupère aussi l'année de l'objet à supprimer
      const { nom, mois, annee } = budgetToDelete; 
      await api.delete(`/delete-budget/${encodeURIComponent(nom)}/${user}/${mois}/${annee}`);
      
      loadBudgets(activeTab === 'gerer');
      setBudgetToDelete(null); 
    } catch (err) {
      console.error("Erreur suppression budget:", err);
    }
  };


  const [editingBudget, setEditingBudget] = useState(null); // Stockera l'objet budget complet
  const handleUpdateBudget = async (updatedBudget, oldName) => {
    try {
      const updatedLocalBudgets = budgets.map(b => {
        // 🛠️ AJOUT : Prise en compte de l'année dans la vérification optimiste
        const isTarget = 
          b.nom === oldName && 
          b.compte === updatedBudget.compte && 
          b.mois === updatedBudget.mois &&
          b.annee === updatedBudget.annee;
        
        if (isTarget) {
          return { ...b, nom: updatedBudget.nom, somme: parseFloat(updatedBudget.somme) };
        }
        return b;
      });

      setBudgets(updatedLocalBudgets);
      setEditingBudget(null);

      const payload = {
        utilisateur: user,
        mois: updatedBudget.mois,
        annee: updatedBudget.annee, // 🛠️ Transmission de l'année au serveur
        compte: updatedBudget.compte,
        type: "Categorie",
        nom: updatedBudget.nom,
        somme: parseFloat(updatedBudget.somme)
      };

      const url = `/update-budget?old_name=${encodeURIComponent(oldName)}`;
      await api.post(url, payload);
      await loadBudgets(true); 

    } catch (err) {
      console.error("Erreur:", err);
      loadBudgets(true);
    }
  };


  const budgetGauges = useMemo(() => {
    // 1. On décide quelle source de données utiliser
    // Si on est sur 'gerer', on prend tout (data), sinon on prend le filtré (statsCategories)
    const isGererPage = activeTab === 'gerer';

    // 2. On regroupe les budgets (on ne filtre par profil que si on n'est pas sur 'gerer')
    const budgetsAAfficher = budgets.filter(b => {
      if (isGererPage || filters.profil === 'Tous') return true;
      const nomsComptesDuProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
      return nomsComptesDuProfil.includes(b.compte?.trim().toUpperCase());
    });

    const categoriesRegroupees = budgetsAAfficher.reduce((acc, b) => {
      const nomCat = b.nom;
      if (!acc[nomCat]) acc[nomCat] = { nom: nomCat, limite: 0, comptes: [] };
      acc[nomCat].limite += b.somme;
      if (!acc[nomCat].comptes.includes(b.compte)) acc[nomCat].comptes.push(b.compte);
      return acc;
    }, {});

    // 3. Calcul du réel adapté au contexte
    return Object.values(categoriesRegroupees).map(bg => {
      let reel = 0;

      if (isGererPage) {
        // MODE GÉRER : On recalcule à la main sur la source brute pour ignorer les filtres UI
        reel = toutesLesTransactions.filter(t => 
          t.categorie === bg.nom && 
          bg.comptes.includes(t.compte) &&
          t.mois === filters.mois
        ).reduce((acc, t) => acc + Math.abs(t.montant), 0);
      } else {
        // MODE DASHBOARD : On utilise les stats déjà filtrées par l'interface
        reel = statsCategories.find(s => s.name === bg.nom)?.value || 0;
      }

      const pourcentage = bg.limite > 0 ? (reel / bg.limite) * 100 : 0;

      return {
        nom: bg.nom,
        limite: bg.limite,
        reel: reel,
        pourcentage: Math.round(pourcentage),
        rotation: Math.min(pourcentage * 180 / 100, 180),
        depasse: reel > bg.limite
      };
    });
    // On ajoute data et activeTab dans les dépendances
  }, [budgets, toutesLesTransactions, statsCategories, filters.mois, filters.profil, activeTab, comptesDuProfil]);

  useEffect(() => {
    if (user) {
      if (activeTab === 'gerer') {
        loadBudgets(true); // Charge tous les mois pour la page gérer
      } else if (filters.mois) {
        loadBudgets(false); // Charge seulement le mois du dashboard
      }
    }
  }, [user, filters.mois, activeTab]);

  return { budgetGauges, budgetToDelete, budgets, confirmDelete2, editingBudget, executeDeleteBudget, formBudget, handleAddBudget, handleUpdateBudget, optionsAnnees, selectedBudgetYear, setBudgetToDelete, setEditingBudget, setFormBudget, setSelectedBudgetYear, setShowBudgetDetails, showBudgetDetails };
}
