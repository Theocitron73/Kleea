import { useState, useEffect, useMemo } from 'react';
import api from '../axios';
import { suppressionAnnulable } from '../utils/annulation';
import { toast } from 'sonner';
import { getTodayLocalDateString } from '../utils/dateUtils';
import { calculerRecapPrevisions } from '../utils/calculsPrevisions';
import { calculerGraphiquePrevisions } from '../utils/calculsPrevisions';
import { calculerSoldesPrevisionnels } from '../utils/calculsPrevisions';

// Prévisions et épargne projetée.
export default function usePrevisions({ allPrevisionsAnnee, cleanMonth, comptes, filters, moisListe, objectifAnnuelGlobal, recapAnnuelStats, setDuplicateType, setallPrevisionsAnnee, soldesTries, toutesLesTransactions, user }) {
  const loadPrevisions = async () => {
    if (!user) return;
    try {
      // 1. On utilise la route 'previsions' (pas get-budgets)
      // 2. On passe 'ALL' pour avoir toute l'année d'un coup
      // 3. On passe l'année dynamiquement
      const url = `/previsions/${user}/ALL/${filters.annee}`;
      
      //console.log("Tentative de récupération :", url);
      
      const res = await api.get(url);
      
      if (res.data) {
        //console.log("Données reçues :", res.data.length, "lignes");
        setallPrevisionsAnnee(res.data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des prévisions :", err);
    }
  };

  // ⚠️ IMPORTANT : Retire filters.mois des dépendances ici !
  // On ne veut recharger l'API QUE si l'année ou l'user change.
  useEffect(() => {
    loadPrevisions();
  }, [user, filters.annee]);



  const previsionsFiltrees = useMemo(() => {
    if (!allPrevisionsAnnee || allPrevisionsAnnee.length === 0) return [];

    // Normalisation insensible aux accents pour éviter le bug Février / Fevrier
    const moisSelectionneClean = cleanMonth(filters.mois);

    const dataDuMois = allPrevisionsAnnee.filter(p => {
      const moisPrevisionClean = cleanMonth(p.mois);
      return moisPrevisionClean === moisSelectionneClean;
    });

    let resultatFinal = dataDuMois;
    if (filters.profil !== 'Tous') {
      resultatFinal = dataDuMois.filter(prev => {
        const nomCompte = String(prev.compte || "").trim().toUpperCase();
        const infoCompte = comptes?.find(c => 
          String(c?.compte || "").trim().toUpperCase() === nomCompte
        );
        return infoCompte?.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim();
      });
    }

    return [...resultatFinal].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return String(a.id).localeCompare(String(b.id));
    });
  }, [allPrevisionsAnnee, filters.mois, filters.profil, comptes]);



  // État pour les mois masqués (ex: ["Août 2024"])
  const [excludedMonths, setExcludedMonths] = useState([]);


  // On crée une version "Année" sans le filtre du mois sélectionné


  const soldesPrevisionnels = useMemo(() => calculerSoldesPrevisionnels({ allPrevisionsAnnee, cleanMonth, comptes, filters, moisListe, soldesTries, toutesLesTransactions }), [soldesTries, allPrevisionsAnnee, comptes, toutesLesTransactions, filters.annee, filters.mois]);

  const soldeGlobalProjete = useMemo(() => 
    soldesPrevisionnels.reduce((acc, c) => acc + c.soldeFinalEstime, 0)
  , [soldesPrevisionnels]);





  const [newPrevi, setNewPrevi] = useState({
    date: getTodayLocalDateString(),
    nom: '',
    montant: '',
    categorie: '',
    compte: comptes[0]?.compte || '' // On prend le premier compte de ta liste
  });

  const optionsComptes = useMemo(() => 
    comptes.map(c => ({ v: c.compte, l: c.compte })),
    [comptes]
  );

  const handleAddPrevision = async () => {
    if (!newPrevi.nom || !newPrevi.montant) return;

    // On crée un objet Date à partir de la sélection pour extraire les infos SQL
    const dateObj = new Date(newPrevi.date);
    const nomMoisLong = dateObj.toLocaleDateString('fr-FR', { month: 'long' });
    // On met la première lettre en majuscule (ex: "février" -> "Février")
    const moisFormate = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);

    const payload = {
      ...newPrevi,
      utilisateur: user,
      mois: moisFormate,
      annee: dateObj.getFullYear()
    };

    try {
      await api.post(`/previsions`, payload);
      setNewPrevi({ ...newPrevi, nom: '', montant: '' }); // On garde la date et le compte
      loadPrevisions();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };


  const updatePrevision = async (id, field, value) => {
    if (!id) {
      console.error("Impossible de modifier : l'ID de la prévision est introuvable.");
      return;
    }
    try {
      let finalValue = value;
      let extraData = {};

      if (field === 'date' && value) {
        const yyyy = value.getFullYear();
        const mm = String(value.getMonth() + 1).padStart(2, '0');
        const dd = String(value.getDate()).padStart(2, '0');
        finalValue = `${yyyy}-${mm}-${dd}`; 
        
        const nomMois = value.toLocaleDateString('fr-FR', { month: 'long' });
        let moisFormate = nomMois.charAt(0).toUpperCase() + nomMois.slice(1);
        moisFormate = moisFormate.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        extraData.mois = moisFormate;
        extraData.annee = parseInt(yyyy, 10);
      }

      const payload = { [field]: finalValue, ...extraData };

      // Envoi à l'API
      await api.put(`/previsions/${id}`, payload);
      
      // 💡 FORCE LE RECHARGEMENT IMMÉDIAT de la liste
      // (Puisque le backend gère la conversion, loadPrevisions() va récupérer la nouvelle valeur propre)
      await loadPrevisions();

    } catch (err) {
      console.error("Erreur update prévision:", err);
    }
  };



  const [selectedIds2, setSelectedIds2] = useState([]);

  // Sélectionner / Désélectionner tout
  const toggleAll2 = () => {
    if (selectedIds2.length === previsionsFiltrees.length) {
      setSelectedIds2([]);
    } else {
      setSelectedIds2(previsionsFiltrees.map(p => p.id));
    }
  };

  // Sélectionner / Désélectionner une ligne
  const toggleSelect2 = (id) => {
    setSelectedIds2(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Suppression groupée
  const handleDeleteSelected2 = () => {
    if (selectedIds2.length === 0) return;

    const ids = selectedIds2;
    suppressionAnnulable({
      message: ids.length > 1 ? `${ids.length} prévisions supprimées` : 'Prévision supprimée',
      retirer: () => {
        setallPrevisionsAnnee(prev => prev.filter(p => !ids.includes(p.id)));
        setSelectedIds2([]);
      },
      restaurer: () => loadPrevisions(),
      supprimer: async () => {
        await Promise.all(ids.map(id => api.delete(`/previsions/${id}`)));
        loadPrevisions(); // Rafraîchir le tableau et les soldes
      },
    });
  };



  const recapPrevisionsStats = useMemo(() => calculerRecapPrevisions({ allPrevisionsAnnee, cleanMonth, comptes, excludedMonths, filters, moisListe, recapAnnuelStats, toutesLesTransactions }), [recapAnnuelStats, allPrevisionsAnnee, filters.annee, filters.profil, moisListe, excludedMonths, toutesLesTransactions, comptes]);



  const moisDisponibles = useMemo(() => {
    // On prend TOUTE l'année pour générer les boutons de masquage
    const mois = allPrevisionsAnnee.map(p => { 
      const d = new Date(p.date);
      const m = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      return m.charAt(0).toUpperCase() + m.slice(1);
    });
    return [...new Set(mois)].sort((a, b) => new Date(a) - new Date(b));
  }, [allPrevisionsAnnee]); // <--- Dépend de l'année complète


  const chartDataPrevisions = useMemo(() => calculerGraphiquePrevisions({ previsionsFiltrees }), [previsionsFiltrees]);


  const [, setMoisAvecPrevisions] = useState([]);

  // On charge une fois la liste des périodes existantes en base prévisions
  const loadAvailablePreviPeriods = async () => {
    if (!user) return; // 👈 Sécurité anti-déconnexion
    try {
      const nomUtilisateur = (typeof user === 'object' && user !== null) ? user.nom : user;
      const res = await api.get(`/previsions/${nomUtilisateur}`);
      setMoisAvecPrevisions(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };


  const [duplicateModal, setDuplicateModal] = useState({
    show: false,
    count: 0,
    isSelection: false
  });

  // 1. Déclencheur révisé pour la reconduction mensuelle classique (mois suivant)
  const handleTryDuplicate = () => {
    setDuplicateType('month');
    setDuplicateModal({ 
      show: true, 
      count: selectedIds2.length, 
      isSelection: selectedIds2.length > 0 
    });
  };

  const handleConfirmDuplicate = async () => {
    const aCopier = selectedIds2.length > 0 
      ? previsionsFiltrees.filter(p => selectedIds2.includes(p.id))
      : previsionsFiltrees;

    try {
      const requetes = aCopier.map(prev => {
        // 1. On découpe la chaîne "YYYY-MM-DD" originale (ex: "2026-06-15")
        const [anneeBrute, moisBrut] = prev.date.split('-').map(Number);
        
        // 2. On calcule l'année et le mois suivants (Rappel : en JS, Janvier = 0, Décembre = 11)
        let anneeCible = anneeBrute;
        let moisCibleJS = (moisBrut - 1) + 1; // On passe au mois d'après

        if (moisCibleJS > 11) {
          moisCibleJS = 0;   // Reset à Janvier
          anneeCible += 1;   // Année suivante
        }

        // 3. On crée un objet Date calé au 1er du mois à midi pour le formatage du nom du mois
        const nouvelleDate = new Date(anneeCible, moisCibleJS, 1, 12, 0, 0);

        // 4. On assemble la date finale textuellement : TOUJOURS LE 01
        const mmFormate = String(nouvelleDate.getMonth() + 1).padStart(2, '0');
        const dateFormatee = `${anneeCible}-${mmFormate}-01`; 

        // 5. On récupère le nom du mois en français ("Juillet", etc.)
        const nomMoisLong = nouvelleDate.toLocaleDateString('fr-FR', { month: 'long' });
        const moisFormate = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);

        // 6. On s'assure que les types envoyés correspondent bien à ce qu'attend FastAPI
        const anneeStrict = parseInt(anneeCible, 10);
        const montantStrict = Number(prev.montant);

        // 🧼 NETTOYAGE DU NOM : On retire "[PRÉVI]" ou "[PREVI]" (insensible à la casse, avec ou sans espace après)
        let nomNettoye = prev.nom;
        if (nomNettoye) {
          nomNettoye = nomNettoye.replace(/^\[PRÉVI\]\s*|^\[PREVI\]\s*/i, '');
        }

        return api.post(`/previsions`, {
          nom: nomNettoye,        // Le nom tout propre, débarrassé du tag [PRÉVI]
          montant: montantStrict,
          categorie: prev.categorie,
          compte: prev.compte,
          date: dateFormatee,     // Sera toujours sous la forme "YYYY-MM-01"
          mois: moisFormate,       // Le nom propre du mois suivant
          annee: anneeStrict,     // L'année en nombre entier
          utilisateur: user
        });
      });

      await Promise.all(requetes);
      
      // Nettoyage et rafraîchissement
      setSelectedIds2([]);
      setDuplicateModal({ show: false, count: 0, isSelection: false });
      loadPrevisions();
      
      toast.success(`${aCopier.length} prévisions dupliquées avec succès !`);
      

    } catch (err) {
      console.error("Erreur duplication :", err);
      setDuplicateModal({ show: false, count: 0, isSelection: false });
      toast.error( "Erreur lors de la duplication.");
    }
  };


  const statsEpargnePrevisionnelle = useMemo(() => {
    if (!recapPrevisionsStats || recapPrevisionsStats.length === 0) {
      return { montant: 0, pourcentage: 0 };
    }

    // 🟢 Somme exacte des 12 mois de la colonne "Épargne" du tableau de projection
    const cumulEpargneAnnuel = recapPrevisionsStats.reduce((sum, m) => {
      return sum + (parseFloat(m.epargne) || 0);
    }, 0);

    const pourcentage = objectifAnnuelGlobal > 0 
      ? Math.max(0, Math.round((cumulEpargneAnnuel / objectifAnnuelGlobal) * 100))
      : 0;

    return {
      montant: cumulEpargneAnnuel,
      pourcentage: pourcentage
    };
  }, [recapPrevisionsStats, objectifAnnuelGlobal]);


  const { epargneReelleCumulee, epargneProjeteeTotale, pctReel, pctProjete } = useMemo(() => {
    let reelCumul = 0;
    let projeteTotal = 0;

    (recapAnnuelStats || []).forEach(m => {
      // Réel accumulé jusqu'à aujourd'hui
      if (m.hasRealData || m.isPasseCloture) {
        reelCumul += (m.epargneReel || 0);
      }
      // Projection totale sur l'année
      if (m.isPasseCloture) {
        projeteTotal += (m.epargneReel || 0);
      } else if (m.hasPrevisions) {
        projeteTotal += (m.epargnePrevu || 0);
      } else if (m.hasRealData) {
        projeteTotal += (m.epargneReel || 0);
      }
    });

    const obj = objectifAnnuelGlobal || 0;
    const pReel = obj > 0 ? Math.max(0, Math.round((reelCumul / obj) * 100)) : 0;
    const pProjete = obj > 0 ? Math.max(0, Math.round((projeteTotal / obj) * 100)) : 0;

    return {
      epargneReelleCumulee: reelCumul,
      epargneProjeteeTotale: projeteTotal,
      pctReel: pReel,
      pctProjete: pProjete
    };
  }, [recapAnnuelStats, objectifAnnuelGlobal]);


  useEffect(() => {
    loadAvailablePreviPeriods();
  }, [user]);

  return { chartDataPrevisions, duplicateModal, epargneProjeteeTotale, epargneReelleCumulee, excludedMonths, handleAddPrevision, handleConfirmDuplicate, handleDeleteSelected2, handleTryDuplicate, loadPrevisions, moisDisponibles, newPrevi, optionsComptes, pctProjete, pctReel, previsionsFiltrees, recapPrevisionsStats, selectedIds2, setDuplicateModal, setExcludedMonths, setNewPrevi, setSelectedIds2, soldeGlobalProjete, soldesPrevisionnels, statsEpargnePrevisionnelle, toggleAll2, toggleSelect2, updatePrevision };
}
