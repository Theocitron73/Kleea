import { useState, useEffect, useMemo } from 'react';
import api from '../axios';

// Enveloppes d'épargne.
export default function useEnveloppes({ filters, soldeGlobal }) {
  const [allocations, setAllocations] = useState([]);

  // On calcule la somme de TOUTES les allocations récupérées du SQL
  const sommeAllocations = useMemo(() => {
      return allocations.reduce((acc, curr) => {
          // On s'assure que montant_alloue est bien traité comme un nombre
          return acc + (parseFloat(curr.montant_alloue) || 0);
      }, 0);
  }, [allocations]); // Le calcul se relance dès que la liste 'allocations' change

  // Le reste à ventiler se met à jour tout seul
  const resteAVentiler = soldeGlobal - sommeAllocations;

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
