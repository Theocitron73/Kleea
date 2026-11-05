import api from '../axios';
import { toast } from 'sonner';

// Propagation des prévisions sur l'année.
export default function usePropagationAnnee({ filters, loadPrevisions, selectedIds2, setDuplicateModal, setDuplicateType, setSelectedIds2, user }) {
  const handleTryPropagateYear = () => {
    if (selectedIds2.length === 0) {
      toast.info("Sélectionnez au moins une prévision à propager.");
      return;
    }
    setDuplicateType('year');
    setDuplicateModal({ 
      show: true, 
      count: selectedIds2.length, 
      isSelection: true 
    });
  };

  // 3. Fonction d'exécution de la propagation annuelle (avec loadPrevisions() de recharge !)
  const confirmPropagateToYear = async () => {
    try {
      const nomUtilisateur = typeof user === 'object' ? user.nom : user;

      const response = await api.post(`/api/previsions/propagate-year`, {
        ids: selectedIds2,
        utilisateur: nomUtilisateur,
        mois_actuel: filters.mois,
        annee: filters.annee.toString()
      });

      if (response.data.status === "success") {
        setSelectedIds2([]); // Vider les cases cochées
        
        // 💡 CORRECTION : Appel de votre vraie fonction de rafraîchissement
        await loadPrevisions(); 
        
        // Utilisation de votre système de toasts d'origine
        toast.success(`${response.data.inserted_count} prévisions propagées sur l'année avec succès !`);
       
      }
    } catch (err) {
      console.error("Erreur de propagation :", err);
      toast.error("Impossible de propager les prévisions sur l'année.");
      
    }
  };

  return { confirmPropagateToYear, handleTryPropagateYear };
}
