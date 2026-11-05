import { useRef } from 'react';

// Navigation à la molette.
export default function useMolette({ TAB_CONFIG, activeRightTab, activeTab, annualTab, availablePeriods, filters, groupesDisponibles, moisListe, setActiveRightTab, setActiveTab, setAnnualTab, setFilters, setSearchTerm, setTabActive, tabActive, visibleMenuItems }) {
  const lastWheelTime = useRef(0);

  // Anti-rebond (160ms) pour garantir un défilement précis de 1 par 1
  const canWheelTrigger = () => {
    const now = Date.now();
    if (now - lastWheelTime.current < 160) return false;
    lastWheelTime.current = now;
    return true;
  };

  // 1. Défilement des Mois
  const handleWheelMois = (e, isPrevi = false) => {
    if (!canWheelTrigger()) return;

    const liste = isPrevi 
      ? moisListe 
      : moisListe.filter(m => availablePeriods.some(p => p.mois === m.v && p.annee.toString() === filters.annee?.toString()));

    if (liste.length <= 1) return;

    const currentIndex = liste.findIndex(m => m.v.toLowerCase() === filters.mois?.toLowerCase());
    if (currentIndex === -1) return;

    if (e.deltaY > 0) {
      // Molette vers le bas -> Mois suivant
      if (currentIndex < liste.length - 1) {
        setFilters({ mois: liste[currentIndex + 1].v });
      }
    } else if (e.deltaY < 0) {
      // Molette vers le haut -> Mois précédent
      if (currentIndex > 0) {
        setFilters({ mois: liste[currentIndex - 1].v });
      }
    }
  };

  // 2. Défilement des Années
  const handleWheelAnnee = (e, isPrevi = false) => {
    if (!canWheelTrigger()) return;

    const rawYears = isPrevi
      ? [...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
      : [...new Set(availablePeriods.map(p => p.annee.toString()))];

    const sortedYears = rawYears.sort((a, b) => parseInt(a) - parseInt(b));
    if (sortedYears.length <= 1) return;

    const currentIndex = sortedYears.findIndex(y => y === filters.annee?.toString());
    if (currentIndex === -1) return;

    if (e.deltaY > 0 && currentIndex < sortedYears.length - 1) {
      setFilters({ annee: sortedYears[currentIndex + 1] });
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setFilters({ annee: sortedYears[currentIndex - 1] });
    }
  };

  // 3. Défilement des Profils
  const handleWheelProfil = (e) => {
    if (!canWheelTrigger() || groupesDisponibles.length <= 1) return;

    const currentIndex = groupesDisponibles.findIndex(p => p.toLowerCase() === filters.profil?.toLowerCase());
    if (currentIndex === -1) return;

    if (e.deltaY > 0 && currentIndex < groupesDisponibles.length - 1) {
      setFilters({ profil: groupesDisponibles[currentIndex + 1] });
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setFilters({ profil: groupesDisponibles[currentIndex - 1] });
    }
  };

   const handleWheelNavTabs = (e) => {
      if (!canWheelTrigger() || !visibleMenuItems || visibleMenuItems.length <= 1) return;
      e.preventDefault();

      const currentIndex = visibleMenuItems.findIndex(item => item.id === activeTab);
      if (currentIndex === -1) return;

      if (e.deltaY > 0) {
        if (currentIndex < visibleMenuItems.length - 1) {
          setActiveTab(visibleMenuItems[currentIndex + 1].id);
        }
      } else if (e.deltaY < 0) {
        if (currentIndex > 0) {
          setActiveTab(visibleMenuItems[currentIndex - 1].id);
        }
      }
    };


  // 🟢 1. Molette sur les onglets du Flux mensuel (Revenus, Dépenses, Transferts, Catégories, Variations, Insights)
  const handleWheelTabActive = (e) => {
    if (!canWheelTrigger()) return;
    e.preventDefault();

    const tabKeys = Object.keys(TAB_CONFIG).filter(tab => {
      if (tab === 'Catégories' && window.innerWidth >= 2000) return false;
      return true;
    });

    const currentIndex = tabKeys.indexOf(tabActive);
    if (currentIndex === -1) return;

    if (e.deltaY > 0 && currentIndex < tabKeys.length - 1) {
      setTabActive(tabKeys[currentIndex + 1]);
      setSearchTerm('');
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setTabActive(tabKeys[currentIndex - 1]);
      setSearchTerm('');
    }
  };

  // 🟢 2. Molette sur les onglets du Bilan Annuel (Liste, Graphique, Calendrier, Wrapped)
  const handleWheelAnnualTab = (e) => {
    if (!canWheelTrigger()) return;
    e.preventDefault();

    const tabs = ['list', 'chart', 'calendar', 'wrapped'];
    const currentIndex = tabs.indexOf(annualTab);
    if (currentIndex === -1) return;

    if (e.deltaY > 0 && currentIndex < tabs.length - 1) {
      setAnnualTab(tabs[currentIndex + 1]);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setAnnualTab(tabs[currentIndex - 1]);
    }
  };

  // 🟢 3. Molette sur le sélecteur de droite (Analytique vs Épargne & Projets)
  const handleWheelRightTab = (e) => {
    if (!canWheelTrigger()) return;
    e.preventDefault();

    const tabs = ['graphs', 'epargneProjets'];
    const currentIndex = tabs.indexOf(activeRightTab);
    if (currentIndex === -1) return;

    if (e.deltaY > 0 && currentIndex < tabs.length - 1) {
      setActiveRightTab(tabs[currentIndex + 1]);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setActiveRightTab(tabs[currentIndex - 1]);
    }
  };

  return { handleWheelAnnee, handleWheelAnnualTab, handleWheelMois, handleWheelNavTabs, handleWheelProfil, handleWheelRightTab, handleWheelTabActive };
}
