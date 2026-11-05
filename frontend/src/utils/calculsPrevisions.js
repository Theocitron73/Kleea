import { trouverCompteCible } from './finance';
import { estTransfertInterne } from './finance';

export function calculerRecapPrevisions({ allPrevisionsAnnee, cleanMonth, comptes, excludedMonths, filters, moisListe, recapAnnuelStats, toutesLesTransactions }) {
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
  }

export function calculerGraphiquePrevisions({ previsionsFiltrees }) {
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
      
  }

export function calculerSuiviPrevisions({ allPrevisionsAnnee, toutesLesTransactions }) {
  const map = {};

  (allPrevisionsAnnee || []).forEach(p => {
    const prevMontantAbs = Math.abs(parseFloat(p.montant) || 0);
    map[p.id] = {
      prev: p,
      prevMontant: prevMontantAbs,
      consomme: 0,
      nbTransactions: 0,
      transactions: []
    };
  });

  (toutesLesTransactions || []).forEach(t => {
    if (t.prevision_id && map[t.prevision_id]) {
      const montantTx = Math.abs(parseFloat(t.montant) || 0);
      map[t.prevision_id].consomme += montantTx;
      map[t.prevision_id].nbTransactions += 1;
      map[t.prevision_id].transactions.push(t);
    }
  });

  Object.keys(map).forEach(id => {
    const item = map[id];
    // 🟢 Arrondi strict à 2 décimales pour éliminer les micro-décimales parasites
    item.consomme = Math.round(item.consomme * 100) / 100;
    item.restant = Math.round((item.prevMontant - item.consomme) * 100) / 100;
    
    // 🟢 Nouveaux états précis
    item.isComplet = Math.abs(item.restant) < 0.01;      // Exactement 0€ d'écart
    item.depasse = item.restant < -0.01;                  // Dépassé UNIQUEMENT si strictement supérieur au montant
    item.pct = item.prevMontant > 0 
      ? Math.min(100, Math.round((item.consomme / item.prevMontant) * 100)) 
      : 0;
  });

  return map;
}

export function calculerSoldesPrevisionnels({ allPrevisionsAnnee, cleanMonth, comptes, filters, moisListe, soldesTries, toutesLesTransactions }) {
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
  }
