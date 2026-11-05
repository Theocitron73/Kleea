import { useState, useEffect, useMemo } from 'react';

// Mois sélectionné du budget.
export default function useMoisBudget({ budgets, filters, selectedBudgetYear }) {
  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState('');

  // 💡 Tri chronologique strict des mois (Janvier -> Décembre)
  const listeMoisDisponibles = useMemo(() => {
    const getMonthIndex = (monthStr) => {
      if (!monthStr) return 999;
      const clean = monthStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const order = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
      const idx = order.indexOf(clean);
      return idx === -1 ? 999 : idx;
    };

    const anneeCible = selectedBudgetYear || new Date().getFullYear();
    const budgetsDeLAnnee = budgets.filter(b => (b.annee || new Date().getFullYear()) === anneeCible);
    const source = budgetsDeLAnnee.length > 0 ? budgetsDeLAnnee : budgets;

    return Array.from(new Set(source.map(b => b.mois).filter(Boolean)))
      .sort((a, b) => getMonthIndex(a) - getMonthIndex(b));
  }, [budgets, selectedBudgetYear]);

  // Sélectionne automatiquement le mois actif ou le premier mois chronologique
  useEffect(() => {
    if (listeMoisDisponibles.length > 0) {
      if (!selectedBudgetMonth || !listeMoisDisponibles.includes(selectedBudgetMonth)) {
        if (filters?.mois && listeMoisDisponibles.includes(filters.mois)) {
          setSelectedBudgetMonth(filters.mois);
        } else {
          setSelectedBudgetMonth(listeMoisDisponibles[0]);
        }
      }
    }
  }, [listeMoisDisponibles, selectedBudgetMonth, filters?.mois]);

  return { listeMoisDisponibles, selectedBudgetMonth, setSelectedBudgetMonth };
}
