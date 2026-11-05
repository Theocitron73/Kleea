import { useState } from 'react';
import api from '../axios';

// Sélection et suppression de transactions.
export default function useSelectionTransactions({ setToutesLesTransactions, transactionsAAfficher }) {
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

  return { handleDeleteSelected, selectedIds, setSelectedIds, toggleAll, toggleSelect };
}
