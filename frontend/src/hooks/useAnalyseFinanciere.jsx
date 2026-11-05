import { useState, useMemo } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { anneeTransaction, calculerSoldes, nettoyerMois } from '../utils/finance';
import { calculerRecapAnnuel } from '../utils/calculsAnalyse';
import { calculerStatsCategories } from '../utils/calculsAnalyse';
import { calculerTotauxAnnuels } from '../utils/calculsAnalyse';
import { calculerDonneesFinancieres } from '../utils/calculsAnalyse';

// Calculs d'analyse : soldes, statistiques et récapitulatif annuel.
export default function useAnalyseFinanciere({ comptes, filters, hiddenCategories, moisListe, ordreComptes, setOrdreComptes, toutesLesTransactions }) {
  const comptesDuProfil = useMemo(() => {
    if (!comptes || comptes.length === 0) return [];
    
    const aDesGroupes = comptes.some(c => Boolean(c.groupe?.trim()));
    // S'il n'y a aucun groupe défini sur aucun compte, on affiche tout pour ne pas bloquer l'écran
    if (!aDesGroupes) return comptes;

    return comptes.filter(c => {
      const groupeCompte = c.groupe?.toLowerCase().trim() || "";
      const groupeFiltre = filters.profil?.toLowerCase().trim() || "";
      return groupeCompte === groupeFiltre;
    });
  }, [comptes, filters.profil]);




  const cleanMonth = nettoyerMois;
  const getTxYear = anneeTransaction;

  const financeData = useMemo(() => calculerDonneesFinancieres({ cleanMonth, comptesDuProfil, filters, getTxYear, toutesLesTransactions }), [toutesLesTransactions, comptesDuProfil, filters.mois, filters.annee, filters.profil]);




  // 🟢 CALCUL ROBUSTE DES SOLDES ET DES INTÉRÊTS PAR QUINZAINE (AVEC RÉCONCILIATION VIREMENTS ET HISTORIQUE)
  const soldesParCompte = useMemo(() => {
    const anneeFiltre = parseInt(filters.annee) || new Date().getFullYear();
    const indexMoisSelectionne = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(filters.mois));

    const { soldes: soldesCourants, interets: interetsEstimes } = calculerSoldes({
      comptes,
      transactions: toutesLesTransactions,
      annee: anneeFiltre,
      moisIndex: indexMoisSelectionne,
    });

    // 6. Rendu final des comptes avec solde réel et intérêts conformes
    return comptes
      .filter(c => filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim())
      .map(c => {
        const nomNettoye = c.compte.trim().toUpperCase();
        return {
          ...c,
          soldePeriode: soldesCourants[nomNettoye] || 0,
          interetsGagnesPériode: interetsEstimes[nomNettoye] || 0
        };
      });
  }, [comptes, toutesLesTransactions, filters]);


  const soldeGlobal = useMemo(() => 
    soldesParCompte.reduce((acc, c) => acc + c.soldePeriode, 0)
  , [soldesParCompte]);




  // --- 1. Ajouter cet effet pour charger l'ordre au démarrage ---

  // --- 2. Trier soldesParCompte selon cet ordre ---
  const soldesTries = useMemo(() => {
    if (!ordreComptes || ordreComptes.length === 0) return soldesParCompte;

    // On trie : les comptes présents dans l'ordre sauvegardé arrivent en premier
    return [...soldesParCompte].sort((a, b) => {
      const indexA = ordreComptes.indexOf(a.compte);
      const indexB = ordreComptes.indexOf(b.compte);
      
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }, [soldesParCompte, ordreComptes]);


  const statsCategories = useMemo(() => calculerStatsCategories({ financeData }), [financeData.journal.depenses, financeData.journal.depensesMoisPrecedent]);


    const chartData = statsCategories.filter(item => !hiddenCategories.includes(item.name));



  // --- 3. La fonction handleDragEnd mise à jour ---
  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (active.id !== over.id) {
      const oldIndex = soldesTries.findIndex(c => c.compte === active.id);
      const newIndex = soldesTries.findIndex(c => c.compte === over.id);
      
      const nouvelOrdre = arrayMove(soldesTries, oldIndex, newIndex).map(c => c.compte);
      
      // Sauvegarde locale
      setOrdreComptes(nouvelOrdre);
      localStorage.setItem('ordre_comptes_favoris', JSON.stringify(nouvelOrdre));
    }
  };





  // On stocke TOUTES les prévisions de l'année ici
  const [allPrevisionsAnnee, setallPrevisionsAnnee] = useState([]);


  const recapAnnuelStats = useMemo(() => calculerRecapAnnuel({ allPrevisionsAnnee, cleanMonth, comptes, filters, getTxYear, moisListe, toutesLesTransactions }), [toutesLesTransactions, comptes, filters.annee, filters.profil, moisListe, allPrevisionsAnnee]);


  // CALCUL DU SOLDE AU 1ER JANVIER DE L'ANNÉE SÉLECTIONNÉE
  const soldePremierJanvier = useMemo(() => {
    const { soldesAu1erJanvier } = calculerSoldes({
      comptes,
      transactions: toutesLesTransactions,
      annee: parseInt(filters.annee),
      moisIndex: -1,
    });

    return comptes
      .filter(c => filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim())
      .reduce((acc, c) => acc + (soldesAu1erJanvier[c.compte.trim().toUpperCase()] || 0), 0);
  }, [toutesLesTransactions, comptes, filters.annee, filters.profil]);


  // 🟢 1. CALCUL UNIFIÉ DES TOTAUX ANNUELS (Intègre le Réel + Prévisions futures)
  const totauxAnnuels = useMemo(() => calculerTotauxAnnuels({ recapAnnuelStats }), [recapAnnuelStats]);

  const tauxEpargneMoyen = useMemo(() => {
    return totauxAnnuels.revenus > 0 
      ? Math.max(0, Math.round((totauxAnnuels.epargne / totauxAnnuels.revenus) * 100))
      : 0;
  }, [totauxAnnuels]);

  const epargneCumuleeAnnuelle = useMemo(() => {
    return recapAnnuelStats
      ?.filter(m => m.epargne !== null) // On ne prend que les mois passés ou en cours
      .reduce((acc, m) => acc + (m.epargne || 0), 0) || 0;
  }, [recapAnnuelStats]);

  // L'objectif global (somme des objectifs de tes comptes)
  // Note : Si ton objectif dans "Comptes" est mensuel, multiplie le par 12 ici
  // pour comparer l'épargne annuelle à un objectif annuel.
  const objectifAnnuelGlobal = comptesDuProfil?.reduce((acc, c) => acc + (parseFloat(c.objectif) || 0), 0) || 0;

  const pourcentageAnnuel = objectifAnnuelGlobal > 0 
    ? Math.min(Math.round((epargneCumuleeAnnuelle / objectifAnnuelGlobal) * 100), 100) 
    : 0;

  return { allPrevisionsAnnee, chartData, cleanMonth, comptesDuProfil, epargneCumuleeAnnuelle, financeData, getTxYear, handleDragEnd, objectifAnnuelGlobal, pourcentageAnnuel, recapAnnuelStats, setallPrevisionsAnnee, soldeGlobal, soldePremierJanvier, soldesTries, statsCategories, tauxEpargneMoyen, totauxAnnuels };
}
