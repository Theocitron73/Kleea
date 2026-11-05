import { useState } from 'react';
import api from '../axios';
import { toast } from 'sonner';

// Mémoire de classement.
export default function useMemoireClassement({ user }) {
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

  return { elementsAppris, fetchMemoire, handleDeleteMemory };
}
