import { useState, useEffect } from 'react';
import api from '../axios';

// Enveloppes d'épargne.
export default function useEnveloppes({ filters }) {
  const [allocations, setAllocations] = useState([]);

  // On calcule la somme de TOUTES les allocations récupérées du SQL
 // Le calcul se relance dès que la liste 'allocations' change

  // Le reste à ventiler se met à jour tout seul

  // --- 3. Tes Fonctions ---
  const fetchAllocations = async () => {
      if (!filters.profil) return;
      try {
          const response = await api.get(`/get-allocations/${filters.profil}`);
          // C'est ce setAllocations qui va déclencher la mise à jour du solde global
          setAllocations(response.data);
      } catch (error) {
          console.error("Erreur lors de la récupération des allocations:", error);
      }
  };










  useEffect(() => {
    if (filters.profil) {
      fetchAllocations();
      // fetchProjets(); // Assure-toi que ta fonction fetchProjets est aussi appelée ici
    }
  }, [filters.profil]);

  return { allocations, fetchAllocations, setAllocations };
}
