import { useState } from 'react';
import api from '../axios';
import { suppressionAnnulable } from '../utils/annulation';

// Sélection et suppression de transactions.
export default function useSelectionTransactions({ setToutesLesTransactions, toutesLesTransactions, transactionsAAfficher }) {
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


    const handleDeleteSelected = () => {
      if (selectedIds.length === 0) return;

      const ids = selectedIds;
      const retirees = toutesLesTransactions.filter(t => ids.includes(t.id));
      suppressionAnnulable({
        message: ids.length > 1 ? `${ids.length} transactions supprimées` : 'Transaction supprimée',
        retirer: () => {
          setToutesLesTransactions(prev => prev.filter(t => !ids.includes(t.id)));
          setSelectedIds([]);
        },
        restaurer: () => setToutesLesTransactions(prev => [...prev.filter(t => !ids.includes(t.id)), ...retirees]),
        supprimer: async () => {
          const res = await api.delete(`/transactions/batch`, { data: ids });
          if (res.data.status !== 'success') throw new Error(res.data.message);
        },
      });
    };

  return { handleDeleteSelected, selectedIds, setSelectedIds, toggleAll, toggleSelect };
}
