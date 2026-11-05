import { useState } from 'react';
import { toast } from 'sonner';

// Assistant de correction du solde.
export default function useAssistantSoldeCalcul({ comptes, handleBlurUpdate, setComptes, toutesLesTransactions }) {
  const [assistantData, setAssistantData] = useState({ open: false, compte: null, valeur: "" });
  const openCalculateurAssistant = (compte) => {
    setAssistantData({ open: true, compte: compte, valeur: "" });
  };
  const confirmerCalculAssistant = async () => {
    const { compte, valeur } = assistantData;
    const montantSaisi = parseFloat(valeur.replace(',', '.'));

    if (isNaN(montantSaisi)) {
      toast.error( "Veuillez saisir un montant valide");
      return;
    }

    const totalTransactions = (toutesLesTransactions || [])
      .filter(t => t.compte?.trim().toUpperCase() === compte.compte.trim().toUpperCase())
      .reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);

    const nouveauSoldeInitial = Math.round((montantSaisi - totalTransactions) * 100) / 100;

    try {
      const nouveauxComptes = comptes.map(c => 
        c.compte === compte.compte ? { ...c, solde: nouveauSoldeInitial } : c
      );
      
      setComptes(nouveauxComptes);
      await handleBlurUpdate({ ...compte, solde: nouveauSoldeInitial });

      toast.success(`Solde initial ajusté : ${nouveauSoldeInitial.toLocaleString('fr-FR')}€`);
      
      // Fermer la modale
      setAssistantData({ open: false, compte: null, valeur: "" });
      
      
    } catch  {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return { assistantData, confirmerCalculAssistant, openCalculateurAssistant, setAssistantData };
}
