import { useState, useEffect, useMemo } from 'react';
import api from '../axios';
import { estTransfertInterne, trouverCompteCible } from '../utils/finance';
import { toast } from 'sonner';
import { getTodayLocalDateString } from '../utils/dateUtils';

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


  const soldesPrevisionnels = useMemo(() => {
    const anneeFiltre = parseInt(filters.annee) || new Date().getFullYear();
    const maintenant = new Date();
    const moisActuelIdx = maintenant.getMonth();
    const anneeActuelle = maintenant.getFullYear();
    const indexMoisSelectionne = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(filters.mois));

    // 1. Initialisation des impacts par compte
    const impactPrevisions = {};
    soldesTries.forEach(c => { 
      impactPrevisions[c.compte.trim().toUpperCase()] = 0; 
    });

    // 2. Cumul intelligent : du mois en cours jusqu'au mois sélectionné
    (allPrevisionsAnnee || []).forEach(p => {
      if (p.actif === false || p.actif === 0 || p.actif === "0" || p.actif === "false") return;

      let pMonthIdx = -1;
      let pYear = 0;
      if (p.date) {
        const dateParts = String(p.date).split('T')[0].split('-');
        pYear = parseInt(dateParts[0], 10);
        pMonthIdx = parseInt(dateParts[1], 10) - 1;
      } else {
        pYear = parseInt(p.annee || 0, 10);
        pMonthIdx = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(p.mois));
      }

      if (pYear !== anneeFiltre) return;

      // 🟢 Condition de cumul chronologique :
      // - Si on regarde un mois futur (ex: Octobre), on prend le reste de Septembre + tout Octobre
      // - On ignore les mois au-delà du mois sélectionné (Novembre, Décembre)
      const isMoisEnCours = (anneeFiltre === anneeActuelle && pMonthIdx === moisActuelIdx);
      const isMoisDansLaPlage = (pMonthIdx >= moisActuelIdx && pMonthIdx <= indexMoisSelectionne);

      if (!isMoisDansLaPlage && !(anneeFiltre < anneeActuelle && pMonthIdx === indexMoisSelectionne)) {
        return;
      }

      const compteSrc = (p.compte || "").trim().toUpperCase();
      const montantBrut = parseFloat(p.montant) || 0;
      const montantAbs = Math.abs(montantBrut);

      let montantImpact = montantBrut;

      // Pour le mois en cours (Septembre), on n'ajoute que le reste non encore passé en banque
      if (isMoisEnCours) {
        const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
        const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
        const resteAVenir = Math.max(0, montantAbs - montantConsomme);
        montantImpact = montantBrut >= 0 ? resteAVenir : -resteAVenir;
      }

      // A. Impact sur le compte émetteur
      if (impactPrevisions.hasOwnProperty(compteSrc)) {
        impactPrevisions[compteSrc] += montantImpact;
      }

      // B. Impact sur le compte destinataire (en cas de virement interne vers livret/épargne)
      if (estTransfertInterne(p.nom || "", p.categorie || "")) {
        const texteComplet = `${p.nom || ""} ${p.categorie || ""}`;
        const compteCible = trouverCompteCible(texteComplet, compteSrc, comptes);
        
        if (compteCible && impactPrevisions.hasOwnProperty(compteCible)) {
          impactPrevisions[compteCible] -= montantImpact;
        }
      }
    });

    // 3. Calcul final par compte
    return soldesTries.map(c => ({
      ...c,
      soldeFinalEstime: c.soldePeriode + (impactPrevisions[c.compte.trim().toUpperCase()] || 0)
    }));
  }, [soldesTries, allPrevisionsAnnee, comptes, toutesLesTransactions, filters.annee, filters.mois]);

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
  const handleDeleteSelected2 = async () => {


    try {
      // On peut soit faire une boucle, soit créer une route backend DELETE avec un body [ids]
      await Promise.all(selectedIds2.map(id => 
        api.delete(`/previsions/${id}`)
      ));
      
      setSelectedIds2([]);
      loadPrevisions(); // Rafraîchir le tableau et les soldes
    } catch (err) {
      console.error("Erreur suppression groupée:", err);
    }
  };



  const recapPrevisionsStats = useMemo(() => {
    const maintenant = new Date();
    const moisActuelIdx = maintenant.getMonth();
    const anneeActuelle = maintenant.getFullYear();
    const anneeFiltre = parseInt(filters.annee);

    let cumulMobile = 0;

    return moisListe.map((moisObj, indexMois) => {
      const estFutur = (anneeFiltre > anneeActuelle) || (anneeFiltre === anneeActuelle && indexMois > moisActuelIdx);
      const estMoisEnCours = (anneeFiltre === anneeActuelle && indexMois === moisActuelIdx);
      const estPasse = !estFutur && !estMoisEnCours;

      const nomMoisComplet = `${moisObj.l} ${anneeFiltre}`;
      const estMasque = excludedMonths.includes(nomMoisComplet);

      // Données réelles du mois
      const statsReelles = recapAnnuelStats[indexMois] || { revenus: 0, depenses: 0, epargne: 0, soldeTotal: 0 };
      const revReel = statsReelles.revReel !== undefined ? statsReelles.revReel : (statsReelles.revenus || 0);
      const depReel = statsReelles.depReel !== undefined ? statsReelles.depReel : (statsReelles.depenses || 0);

      if (estPasse) {
        cumulMobile = (statsReelles.soldeTotalReel !== undefined ? statsReelles.soldeTotalReel : statsReelles.soldeTotal) ?? cumulMobile;
        return { 
          ...statsReelles, 
          revenus: revReel, 
          depenses: depReel, 
          epargne: revReel - depReel, 
          soldeTotal: cumulMobile, 
          type: 'réel' 
        };
      }

      // Prévisions pour ce mois
      const previsionsDuMois = (allPrevisionsAnnee || []).filter(p => {
        if (p.actif === false || p.actif === 0 || p.actif === "0") return false;
        
        let pMonthIdx = -1;
        let pYear = 0;
        if (p.date) {
          const parts = String(p.date).split('T')[0].split('-');
          pYear = parseInt(parts[0], 10);
          pMonthIdx = parseInt(parts[1], 10) - 1;
        } else {
          pYear = parseInt(p.annee || 0, 10);
          pMonthIdx = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(p.mois));
        }

        if (pMonthIdx !== indexMois || pYear !== anneeFiltre) return false;

        if (filters.profil !== 'Tous') {
          const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
          if (compteAssocie?.groupe?.toLowerCase().trim() !== filters.profil.toLowerCase().trim()) return false;
        }
        return true;
      });

      let revReste = 0;
      let depReste = 0;
      let totalConsommeDepensesLiees = 0;
      let totalConsommeRevenusLies = 0;

      if (!estMasque) {
        previsionsDuMois.forEach(p => {
          if (estTransfertInterne(p.nom || "", p.categorie || "")) return;

          const montantPrevuAbs = Math.abs(parseFloat(p.montant) || 0);
          const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
          const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
          const resteAVenir = Math.max(0, montantPrevuAbs - montantConsomme);

          if (parseFloat(p.montant) > 0) {
            revReste += resteAVenir;
            totalConsommeRevenusLies += montantConsomme;
          } else {
            depReste += resteAVenir;
            totalConsommeDepensesLiees += montantConsomme;
          }
        });
      }

      // 🌟 FORMULE EXACTE DU LIVE :
    
      const totalRev = estMoisEnCours 
        ? Math.max(revReel, totalConsommeRevenusLies) + revReste
        : (estFutur ? (previsionsDuMois.length > 0 ? revReste + totalConsommeRevenusLies : 0) : revReel);

      const totalDep = estMoisEnCours
        ? Math.max(depReel, totalConsommeDepensesLiees) + depReste
        : (estFutur ? (previsionsDuMois.length > 0 ? depReste + totalConsommeDepensesLiees : 0) : depReel);

      const balanceMois = totalRev - totalDep;
      cumulMobile += balanceMois;

      return {
        nom: moisObj.l,
        revenus: totalRev,
        depenses: totalDep,
        epargne: balanceMois,
        soldeTotal: cumulMobile,
        type: estMoisEnCours ? 'mixte' : 'projeté',
        isMasque: estMasque
      };
    });
  }, [recapAnnuelStats, allPrevisionsAnnee, filters.annee, filters.profil, moisListe, excludedMonths, toutesLesTransactions, comptes]);



  const moisDisponibles = useMemo(() => {
    // On prend TOUTE l'année pour générer les boutons de masquage
    const mois = allPrevisionsAnnee.map(p => { 
      const d = new Date(p.date);
      const m = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
      return m.charAt(0).toUpperCase() + m.slice(1);
    });
    return [...new Set(mois)].sort((a, b) => new Date(a) - new Date(b));
  }, [allPrevisionsAnnee]); // <--- Dépend de l'année complète


  const chartDataPrevisions = useMemo(() => {
    const aggregat = {};
    
    const previsionsVisiblesDuMois = previsionsFiltrees.filter(p => 
      !(p.actif === false || p.actif === 0 || p.actif === "0" || p.actif === "false")
    );

    // 🟢 On exclut les transferts internes des dépenses pures
    const depensesSeules = previsionsVisiblesDuMois.filter(p => 
      parseFloat(p.montant) < 0 && 
      !estTransfertInterne(p.nom, p.categorie)
    );

    depensesSeules.forEach(p => {
      const cat = p.categorie || "Sans catégorie";
      aggregat[cat] = (aggregat[cat] || 0) + Math.abs(parseFloat(p.montant));
    });

    return Object.keys(aggregat)
      .map(name => ({ name, value: aggregat[name] }))
      .sort((a, b) => b.value - a.value); 
      
  }, [previsionsFiltrees]);


  const [moisAvecPrevisions, setMoisAvecPrevisions] = useState([]);

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
