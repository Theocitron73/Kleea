import { appliquerMouvement, calculerSoldes, creerLecteurMouvements, estTransfertInterne, totauxRevenusDepenses, trouverCompteCible } from './finance';

export function calculerRecapAnnuel({ allPrevisionsAnnee, cleanMonth, comptes, filters, getTxYear, moisListe, toutesLesTransactions }) {
    const anneeFiltre = parseInt(filters.annee);
    const maintenant = new Date();
    const moisActuelIdx = maintenant.getMonth();
    const anneeActuelle = maintenant.getFullYear();

    let dernierMoisClotureIdx = -1;
    if (anneeFiltre < anneeActuelle) dernierMoisClotureIdx = 11;
    else if (anneeFiltre === anneeActuelle) dernierMoisClotureIdx = moisActuelIdx - 1; // Août (M-1)

    const comptesDuProfil = (comptes || []).filter(c => 
      filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
    );
    const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

    // --- 1. DÉTECTION DES PRÉVISIONS ACTIVES ---
    let premierMoisAvecPreviIdx = 999;
    let dernierMoisAvecPreviIdx = -1;

    (allPrevisionsAnnee || []).forEach(p => {
      if (p.actif === false || p.actif === 0 || p.actif === "0") return;

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

      if (pYear === anneeFiltre && pMonthIdx >= 0) {
        if (filters.profil !== 'Tous') {
          const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
          if (compteAssocie?.groupe?.toLowerCase().trim() !== filters.profil.toLowerCase().trim()) return;
        }
        if (pMonthIdx < premierMoisAvecPreviIdx) premierMoisAvecPreviIdx = pMonthIdx;
        if (pMonthIdx > dernierMoisAvecPreviIdx) dernierMoisAvecPreviIdx = pMonthIdx;
      }
    });

    const hasAnyPrevisionInYear = dernierMoisAvecPreviIdx >= 0;

    // --- 2. HISTORIQUE RÉEL ---
    // Les années passées comptent aussi : le solde de départ est celui du 1er janvier.
    const soldesCourantsMois = {
      ...calculerSoldes({ comptes, transactions: toutesLesTransactions, annee: anneeFiltre, moisIndex: -1 }).soldesAu1erJanvier,
    };
    const lireMouvement = creerLecteurMouvements(comptes, toutesLesTransactions);

    const reelParMois = [];
    moisListe.forEach((moisObj, idx) => {
      const nomMois = cleanMonth(moisObj.v);

      const txDuMois = (toutesLesTransactions || []).filter(t => 
        getTxYear(t) === filters.annee.toString().trim() && 
        cleanMonth(t.mois) === nomMois &&
        (filters.profil === 'Tous' || nomsComptesProfil.includes(t.compte?.trim().toUpperCase()))
      );

      (toutesLesTransactions || []).forEach(t => {
        const anneeT = parseInt(getTxYear(t) || 0);
        const indexMoisT = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(t.mois));
        if (anneeT === anneeFiltre && indexMoisT === idx) {
          appliquerMouvement(soldesCourantsMois, lireMouvement(t));
        }
      });

      const { revenus: rev, depenses: dep } = totauxRevenusDepenses(txDuMois);

      const soldeTotal = nomsComptesProfil.reduce((acc, nom) => acc + (soldesCourantsMois[nom] || 0), 0);

      reelParMois.push({
        hasRealData: txDuMois.length > 0,
        rev,
        dep,
        epargne: rev - dep,
        soldeTotal,
        soldesComptes: { ...soldesCourantsMois }
      });
    });

    // --- 3. CUMUL DE PROJECTION PAR COMPTE ET TOTAL ---
    let soldesProjetesParCompte = {};
    let soldeTotalProjete = 0;

    const pointDeJonctionIdx = hasAnyPrevisionInYear 
      ? Math.max(0, Math.min(premierMoisAvecPreviIdx - 1, dernierMoisClotureIdx))
      : -1;

    return moisListe.map((moisObj, indexMoisCible) => {
      const isPasseCloture = (anneeFiltre < anneeActuelle) || (anneeFiltre === anneeActuelle && indexMoisCible < moisActuelIdx);
      const isMoisEnCours = (anneeFiltre === anneeActuelle && indexMoisCible === moisActuelIdx);
      const isFutur = (anneeFiltre > anneeActuelle) || (anneeFiltre === anneeActuelle && indexMoisCible > moisActuelIdx);

      const reel = reelParMois[indexMoisCible];

      const previsionsDuMois = (allPrevisionsAnnee || []).filter(p => {
        if (p.actif === false || p.actif === 0 || p.actif === "0") return false;
        const dateParts = String(p.date).split('T')[0].split('-');
        const pMonthIdx = parseInt(dateParts[1], 10) - 1;
        const pYear = parseInt(dateParts[0], 10);
        if (pMonthIdx !== indexMoisCible || pYear !== anneeFiltre) return false;

        if (filters.profil !== 'Tous') {
          const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
          return compteAssocie?.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim();
        }
        return true;
      });

      const hasPrevisionsCeMois = previsionsDuMois.length > 0;

      let revPrevu = 0;
      let depPrevu = 0;
      let revResteAVenir = 0;
      let depResteAVenir = 0;
      const impactResteParCompte = {};
      const impactFuturParCompte = {};
      nomsComptesProfil.forEach(nom => {
        impactResteParCompte[nom] = 0;
        impactFuturParCompte[nom] = 0;
      });

      previsionsDuMois.forEach(p => {
        const cat = (p.categorie || "").toLowerCase();
        const nom = (p.nom || "").toLowerCase();
        const compteSrc = (p.compte || "").trim().toUpperCase();
        const montantBrut = parseFloat(p.montant) || 0;
        const montantAbs = Math.abs(montantBrut);
        const isTransfert = estTransfertInterne(nom, cat);

        if (!isTransfert) {
          if (montantBrut > 0) revPrevu += montantBrut;
          else depPrevu += montantAbs;
        }

        if (isMoisEnCours) {
          const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
          const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
          const reste = Math.max(0, montantAbs - montantConsomme);

          if (!isTransfert) {
            if (montantBrut > 0) revResteAVenir += reste;
            else depResteAVenir += reste;
          }

          const impactReste = montantBrut >= 0 ? reste : -reste;
          if (impactResteParCompte.hasOwnProperty(compteSrc)) {
            impactResteParCompte[compteSrc] += impactReste;
          }
          if (isTransfert) {
            const cible = trouverCompteCible(`${nom} ${cat}`, compteSrc, comptes);
            if (cible && impactResteParCompte.hasOwnProperty(cible)) {
              impactResteParCompte[cible] -= impactReste;
            }
          }
        }

        if (isFutur) {
          if (impactFuturParCompte.hasOwnProperty(compteSrc)) {
            impactFuturParCompte[compteSrc] += montantBrut;
          }
          if (isTransfert) {
            const cible = trouverCompteCible(`${nom} ${cat}`, compteSrc, comptes);
            if (cible && impactFuturParCompte.hasOwnProperty(cible)) {
              impactFuturParCompte[cible] -= montantBrut;
            }
          }
        }
      });

      // Progression du cumul projeté
      if (isPasseCloture) {
        nomsComptesProfil.forEach(nom => {
          soldesProjetesParCompte[nom] = reel.soldesComptes[nom];
        });
        soldeTotalProjete = reel.soldeTotal;
      } else if (isMoisEnCours) {
        nomsComptesProfil.forEach(nom => {
          soldesProjetesParCompte[nom] = (reel.soldesComptes[nom] || 0) + impactResteParCompte[nom];
        });
        soldeTotalProjete = reel.soldeTotal + (revResteAVenir - depResteAVenir);
      } else if (isFutur && hasPrevisionsCeMois) {
        nomsComptesProfil.forEach(nom => {
          soldesProjetesParCompte[nom] = (soldesProjetesParCompte[nom] || 0) + impactFuturParCompte[nom];
        });
        soldeTotalProjete += (revPrevu - depPrevu);
      }

      // 🌟 CONTINUITÉ GARANTIE : La ligne pointillée commence à la jonction (Août) et continue sur Sep/Oct
      const estPointDeJonction = hasAnyPrevisionInYear && (indexMoisCible === pointDeJonctionIdx);
      const estDansLaPlagePrevisions = hasAnyPrevisionInYear && 
        (indexMoisCible >= premierMoisAvecPreviIdx && indexMoisCible <= dernierMoisAvecPreviIdx);
      
      const tracerPointilleCeMois = estPointDeJonction || estDansLaPlagePrevisions;

      // La ligne pleine réelle s'arrête au dernier mois clôturé (Août)
      const tracerLignePleine = isPasseCloture || reel.hasRealData;

      const revMoisEnCoursEstime = reel.rev + revResteAVenir;
      const depMoisEnCoursEstime = reel.dep + depResteAVenir;
      const epargneMoisEnCoursEstime = revMoisEnCoursEstime - depMoisEnCoursEstime;

      const detailComptesReel = {};
      const detailComptesProjete = {};
      nomsComptesProfil.forEach(nom => {
        detailComptesReel[nom] = tracerLignePleine ? reel.soldesComptes[nom] : null;
        detailComptesProjete[`PROJ_${nom}`] = tracerPointilleCeMois ? soldesProjetesParCompte[nom] : null;
      });

      return {
        nom: moisObj.l,
        isMoisEnCours,
        isPasseCloture,
        isFutur,
        hasPrevisions: hasPrevisionsCeMois,
        hasRealData: reel.hasRealData,

        // Données pour le tableau
        revReel: reel.rev,
        depReel: reel.dep,
        epargneReel: reel.epargne,
        soldeTotalReel: reel.soldeTotal,

        revPrevu: hasPrevisionsCeMois ? (isMoisEnCours ? revMoisEnCoursEstime : revPrevu) : null,
        depPrevu: hasPrevisionsCeMois ? (isMoisEnCours ? depMoisEnCoursEstime : depPrevu) : null,
        epargnePrevu: hasPrevisionsCeMois ? (isMoisEnCours ? epargneMoisEnCoursEstime : (revPrevu - depPrevu)) : null,
        soldeProjete: tracerPointilleCeMois ? soldeTotalProjete : null,

        // Données de courbes graphiques
        revenus: tracerLignePleine ? reel.rev : null,
        depenses: tracerLignePleine ? reel.dep : null,
        epargne: tracerLignePleine ? reel.epargne : null,

        // 🌟 VALEURS D'ATTACHE : À Août (jonction), la projection prend exactement la valeur réelle d'Août
        revenusProjete: tracerPointilleCeMois 
          ? (estPointDeJonction ? reel.rev : (isMoisEnCours ? revMoisEnCoursEstime : revPrevu)) 
          : null,
        depensesProjete: tracerPointilleCeMois 
          ? (estPointDeJonction ? reel.dep : (isMoisEnCours ? depMoisEnCoursEstime : depPrevu)) 
          : null,
        epargneProjete: tracerPointilleCeMois 
          ? (estPointDeJonction ? reel.epargne : (isMoisEnCours ? epargneMoisEnCoursEstime : (revPrevu - depPrevu))) 
          : null,

        soldeTotal: tracerLignePleine ? reel.soldeTotal : null,

        ...detailComptesReel,
        ...detailComptesProjete
      };
    });
  }

export function calculerStatsCategories({ financeData }) {
    const depensesActuelles = financeData.journal.depenses || [];
    const depensesPrecedentes = financeData.journal.depensesMoisPrecedent || [];

    const recapActuel = {};
    depensesActuelles.forEach(t => {
      const cat = t.categorie || "Autre";
      recapActuel[cat] = (recapActuel[cat] || 0) + Math.abs(parseFloat(t.montant) || 0);
    });

    const recapPrecedent = {};
    depensesPrecedentes.forEach(t => {
      const cat = t.categorie || "Autre";
      recapPrecedent[cat] = (recapPrecedent[cat] || 0) + Math.abs(parseFloat(t.montant) || 0);
    });

    return Object.entries(recapActuel)
      .map(([name, value]) => {
        const valeurMoisPrecedent = recapPrecedent[name] || 0;
        let evolution = null;
        let diffEuro = 0;

        if (valeurMoisPrecedent > 0) {
          evolution = Math.round(((value - valeurMoisPrecedent) / valeurMoisPrecedent) * 100);
          diffEuro = value - valeurMoisPrecedent; // Différence brute en €
        }

        return { 
          name, 
          value, 
          evolution, 
          diffEuro, 
          isNew: valeurMoisPrecedent === 0 
        };
      })
      .sort((a, b) => b.value - a.value);
  }

export function calculerTotauxAnnuels({ recapAnnuelStats }) {
    return (recapAnnuelStats || []).reduce((acc, m) => {
      let rev = 0;
      let dep = 0;

      if (m.isPasseCloture) {
        // Mois passés : données réelles
        rev = m.revReel || 0;
        dep = m.depReel || 0;
      } else if (m.isMoisEnCours) {
        // Mois en cours : prend le prévisionnel ajusté s'il existe (réel + reste à venir), sinon le réel
        rev = m.revPrevu !== null ? m.revPrevu : (m.revReel || 0);
        dep = m.depPrevu !== null ? m.depPrevu : (m.depReel || 0);
      } else if (m.isFutur) {
        // Mois futurs : prend les prévisions s'il y en a, sinon 0
        rev = m.revPrevu !== null ? m.revPrevu : 0;
        dep = m.depPrevu !== null ? m.depPrevu : 0;
      } else {
        rev = m.revReel || 0;
        dep = m.depReel || 0;
      }

      const ep = rev - dep;

      return {
        revenus: acc.revenus + rev,
        depenses: acc.depenses + dep,
        epargne: acc.epargne + ep
      };
    }, { revenus: 0, depenses: 0, epargne: 0 });
  }

export function calculerJaugesBudget({ activeTab, budgets, comptesDuProfil, filters, statsCategories, toutesLesTransactions }) {
    // 1. On décide quelle source de données utiliser
    // Si on est sur 'gerer', on prend tout (data), sinon on prend le filtré (statsCategories)
    const isGererPage = activeTab === 'gerer';

    // 2. On regroupe les budgets (on ne filtre par profil que si on n'est pas sur 'gerer')
    const budgetsAAfficher = budgets.filter(b => {
      if (isGererPage || filters.profil === 'Tous') return true;
      const nomsComptesDuProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
      return nomsComptesDuProfil.includes(b.compte?.trim().toUpperCase());
    });

    const categoriesRegroupees = budgetsAAfficher.reduce((acc, b) => {
      const nomCat = b.nom;
      if (!acc[nomCat]) acc[nomCat] = { nom: nomCat, limite: 0, comptes: [] };
      acc[nomCat].limite += b.somme;
      if (!acc[nomCat].comptes.includes(b.compte)) acc[nomCat].comptes.push(b.compte);
      return acc;
    }, {});

    // 3. Calcul du réel adapté au contexte
    return Object.values(categoriesRegroupees).map(bg => {
      let reel = 0;

      if (isGererPage) {
        // MODE GÉRER : On recalcule à la main sur la source brute pour ignorer les filtres UI
        reel = toutesLesTransactions.filter(t => 
          t.categorie === bg.nom && 
          bg.comptes.includes(t.compte) &&
          t.mois === filters.mois
        ).reduce((acc, t) => acc + Math.abs(t.montant), 0);
      } else {
        // MODE DASHBOARD : On utilise les stats déjà filtrées par l'interface
        reel = statsCategories.find(s => s.name === bg.nom)?.value || 0;
      }

      const pourcentage = bg.limite > 0 ? (reel / bg.limite) * 100 : 0;

      return {
        nom: bg.nom,
        limite: bg.limite,
        reel: reel,
        pourcentage: Math.round(pourcentage),
        rotation: Math.min(pourcentage * 180 / 100, 180),
        depasse: reel > bg.limite
      };
    });
    // On ajoute data et activeTab dans les dépendances
  }

export function calculerDonneesFinancieres({ cleanMonth, comptesDuProfil, filters, getTxYear, toutesLesTransactions }) {
    // 1. Préparation des constantes de filtrage
    const nomsComptesProfilMaj = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
    
    // On sécurise les transactions avec des IDs si manquants
    const transactionsSecurisees = (toutesLesTransactions || []).map((t, index) => ({
      ...t,
      id: t.id || `tr-${index}` 
    }));

    // 2. Logique pour déterminer le mois précédent
    const moisFr = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "décembre"];
    const moisIndex = moisFr.indexOf(filters.mois.toLowerCase().trim());
    
    let moisPrecedentLabel = filters.mois;
    let anneePrecedenteLabel = filters.annee;

    if (moisIndex !== -1) {
      // Si on est en Janvier (index 0), le mois précédent est Décembre (index 11) de l'année n-1
      const dateRef = new Date(parseInt(filters.annee), moisIndex);
      dateRef.setMonth(dateRef.getMonth() - 1);
      
      moisPrecedentLabel = moisFr[dateRef.getMonth()];
      anneePrecedenteLabel = dateRef.getFullYear().toString();
    }

    // 3. Fonction de filtrage réutilisable (Source, Cible, Transferts)
    const estUnTransfert = (t) => estTransfertInterne(t.nom, t.categorie);


    const filtrerParPeriode = (mois, annee) => {
      return transactionsSecurisees.filter(t => {
        const nomCompteTransac = (t.compte || "").trim().toUpperCase();
        const categorie = (t.categorie || "").toLowerCase();
        
        const matchSource = filters.profil === 'Tous' || nomsComptesProfilMaj.includes(nomCompteTransac);
        const matchCible = filters.profil !== 'Tous' && 
                          estTransfertInterne(t.nom, t.categorie) && 
                          nomsComptesProfilMaj.some(nomC => categorie.toUpperCase().includes(nomC));

        // 🟢 Normalisation des dates et mois
        const matchMois = cleanMonth(t.mois) === cleanMonth(mois);
        const matchAnnee = getTxYear(t) === annee.toString().trim();

        return (matchSource || matchCible) && matchMois && matchAnnee;
      });
    };

    // 4. Extraction des deux jeux de données
    const baseActuelle = filtrerParPeriode(filters.mois, filters.annee.toString());
    const basePrecedente = filtrerParPeriode(moisPrecedentLabel, anneePrecedenteLabel);

    // Séparation Revenus / Dépenses / Transferts (Mois Actuel)
    const revenusList = baseActuelle.filter(t => parseFloat(t.montant) > 0 && !estUnTransfert(t));
    const depensesList = baseActuelle.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t));
    const transfertsList = baseActuelle.filter(t => estUnTransfert(t));

    // Séparation Dépenses (Mois Précédent) pour l'analyse comparative
    const depensesMoisPrecedent = basePrecedente.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t));

    // 5. Calcul des totaux (Mois Actuel)
    const totalRev = revenusList.reduce((acc, t) => acc + parseFloat(t.montant), 0);
    const totalDep = depensesList.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0);

    return {
      journal: { 
        revenus: revenusList, 
        depenses: depensesList, 
        transferts: transfertsList,
        depensesMoisPrecedent: depensesMoisPrecedent // Crucial pour statsCategories
      },
      stats: { 
        totalRev,
        totalDep,
        solde: totalRev - totalDep,
        nb: baseActuelle.length 
      },
      periodeComparee: {
        mois: moisPrecedentLabel,
        annee: anneePrecedenteLabel
      }
    };
  }

export function calculerStatsAnnuellesCategories({ comptes, filters, toutesLesTransactions }) {
  const recap = {};
  let totalAnnuel = 0;

  // 1. IDENTIFIER LES COMPTES APPARTENANT AU PROFIL (Comme dans ton tableau)
  const comptesDuProfil = comptes.filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  // 2. FILTRER LES TRANSACTIONS PAR ANNÉE ET PAR COMPTES DU PROFIL
  const transAnnee = (toutesLesTransactions || []).filter(t => {
    const matchAnnee =filters.annee.toString().trim();
    // La transaction appartient au profil si son compte est dans la liste nomsComptesProfil
    const matchCompteProfil = nomsComptesProfil.includes(t.compte?.trim().toUpperCase());
    
    return matchAnnee && matchCompteProfil;
  });

  // 3. CALCULER LA RÉPARTITION
  transAnnee.forEach(t => {
    const montant = parseFloat(t.montant) || 0;
    const cat = t.categorie || "Autre";
    const estTransfert = estTransfertInterne(t.nom, t.categorie);

    // On ne prend que les dépenses (montant < 0)
    if (montant < 0 && !estTransfert) {
      const absMontant = Math.abs(montant);
      recap[cat] = (recap[cat] || 0) + absMontant;
      totalAnnuel += absMontant;
    }
  });

  // 4. FORMATAGE POUR RECHARTS
  return Object.entries(recap)
    .map(([name, value]) => ({
      name,
      value,
      percent: totalAnnuel > 0 ? Math.round((value / totalAnnuel) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

}
