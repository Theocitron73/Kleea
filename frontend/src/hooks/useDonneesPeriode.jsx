import { useState, useMemo } from 'react';

// Récapitulatif sur une période libre.
export default function useDonneesPeriode({ filters, moisListe, recapAnnuelStats, tauxEpargneMoyen, totauxAnnuels }) {
  const [moisDebut, setMoisDebut] = useState("Janvier");
  const [moisFin, setMoisFin] = useState(filters.mois || "12"); 

  // 2. État pour l'onglet actif ('annuel' ou 'periode')
  const [totalTab, setTotalTab] = useState('annuel');
  // 3. Calcul automatique basé sur ton tableau recapAnnuelStats
  // 🟢 2. CALCUL DE L'ONGLET "PÉRIODE" (Ex: De Janvier à Septembre ou Octobre)
  const donneesPeriodeDirecte = useMemo(() => {
    const libelleDebut = moisListe.find(m => m.v === moisDebut)?.l?.toLowerCase();
    const libelleFin = moisListe.find(m => m.v === moisFin)?.l?.toLowerCase();

    const listeNomsMois = moisListe.map(m => m.l?.toLowerCase());
    const idxDebut = listeNomsMois.indexOf(libelleDebut);
    const idxFin = listeNomsMois.indexOf(libelleFin);

    const idxMin = Math.min(idxDebut, idxFin);
    const idxMax = Math.max(idxDebut, idxFin);

    const moisSelectionnes = (recapAnnuelStats || []).filter(m => {
      const currentIdx = listeNomsMois.indexOf(m.nom?.toLowerCase());
      return currentIdx >= idxMin && currentIdx <= idxMax;
    });

    let revenus = 0;
    let depenses = 0;
    let epargne = 0;

    moisSelectionnes.forEach(m => {
      let rev = 0;
      let dep = 0;

      if (m.isPasseCloture) {
        rev = m.revReel || 0;
        dep = m.depReel || 0;
      } else if (m.isMoisEnCours) {
        rev = m.revPrevu !== null ? m.revPrevu : (m.revReel || 0);
        dep = m.depPrevu !== null ? m.depPrevu : (m.depReel || 0);
      } else if (m.isFutur) {
        rev = m.revPrevu !== null ? m.revPrevu : 0;
        dep = m.depPrevu !== null ? m.depPrevu : 0;
      } else {
        rev = m.revReel || 0;
        dep = m.depReel || 0;
      }

      revenus += rev;
      depenses += dep;
      epargne += (rev - dep);
    });

    const tauxEffort = revenus > 0 ? Math.max(0, Math.round((epargne / revenus) * 100)) : 0;

    return {
      revenus,
      depenses,
      epargne,
      tauxEffort
    };
  }, [recapAnnuelStats, moisDebut, moisFin, moisListe]);

  const estPeriode = totalTab === 'periode';
  const donneesAffichees = estPeriode ? donneesPeriodeDirecte : {
    revenus: totauxAnnuels.revenus,
    depenses: totauxAnnuels.depenses,
    epargne: totauxAnnuels.epargne,
    tauxEffort: tauxEpargneMoyen
  };

  return { donneesAffichees, estPeriode, moisDebut, moisFin, setMoisDebut, setMoisFin, setTotalTab, totalTab };
}
