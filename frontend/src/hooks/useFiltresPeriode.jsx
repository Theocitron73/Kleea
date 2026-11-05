import { useState } from 'react';

// Filtres de période, mémorisés par page.
export default function useFiltresPeriode({ activeTab, moisListe, user }) {
  const getPageKey = (tab) => {
    if (tab === 'previsions' || tab === 'previsionnel') return 'previsionnel';
    if (tab === 'gerer' || tab === 'transactions') return 'gerer';
    if (tab === 'dashboard') return 'dashboard';
    return 'default';
  };

  const getDefaultPeriod = () => ({
    profil: 'Tous',
    annee: new Date().getFullYear().toString(),
    mois: moisListe[new Date().getMonth()]?.v || 'Janvier'
  });

  const [filtersByPage, setFiltersByPage] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const saved = localStorage.getItem(`filters_v3_${savedUser.toLowerCase()}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            dashboard: parsed.dashboard || getDefaultPeriod(),
            previsionnel: parsed.previsionnel || parsed.previsions || getDefaultPeriod(),
            gerer: parsed.gerer || parsed.transactions || getDefaultPeriod(),
            default: parsed.default || getDefaultPeriod()
          };
        } catch (e) {
          console.error(e);
        }
      }
    }

    const def = getDefaultPeriod();
    return {
      dashboard: { ...def },
      previsionnel: { ...def },
      gerer: { ...def },
      default: { ...def }
    };
  });

  const currentKey = getPageKey(activeTab);
  const filters = filtersByPage[currentKey] || filtersByPage['dashboard'] || getDefaultPeriod();

  const setFilters = (newFiltersOrFn) => {
    setFiltersByPage(prev => {
      const targetKey = getPageKey(activeTab);
      const currentFilters = prev[targetKey] || prev['default'] || getDefaultPeriod();

      const updated = typeof newFiltersOrFn === 'function' 
        ? newFiltersOrFn(currentFilters) 
        : { ...currentFilters, ...newFiltersOrFn };

      const nextState = {
        ...prev,
        [targetKey]: updated
      };

      if (user) {
        const u = typeof user === 'string' ? user.toLowerCase() : user?.nom?.toLowerCase();
        if (u) {
          localStorage.setItem(`filters_v3_${u}`, JSON.stringify(nextState));
        }
      }

      return nextState;
    });
  };

  return { filters, filtersByPage, getDefaultPeriod, getPageKey, setFilters, setFiltersByPage };
}
