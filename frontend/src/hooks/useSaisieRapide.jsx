import { useState, useEffect } from 'react';
import api from '../axios';
import { toast } from 'sonner';

// Ajout rapide d'une transaction.
export default function useSaisieRapide({ filters, moisListe, setToutesLesTransactions, soldesTries, user }) {
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

  return { newTx, selectedDate, setNewTx, setSelectedDate, submitQuickTransaction };
}
