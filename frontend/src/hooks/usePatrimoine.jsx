import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../axios';

const VIDE = { biens: [], dettes: [], total_biens: 0, total_dettes: 0 };

/** Un bien ou une dette sans profil compte pour tous les profils. */
export const duProfil = (element, profil) => !element.profil || !profil || profil === 'Tous' || element.profil === profil;

/** Placements, biens et crédits du compte, et le total net du profil affiché. */
export default function usePatrimoine({ user, profil, annee, soldeComptes = 0 }) {
  const [patrimoine, setPatrimoine] = useState(VIDE);

  const recharger = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/patrimoine', { params: { annee: annee || new Date().getFullYear(), profil } });
      setPatrimoine(res.data && Array.isArray(res.data.biens) ? res.data : VIDE);
    } catch {
      setPatrimoine(VIDE);
    }
  }, [user, annee, profil]);

  useEffect(() => { recharger(); }, [recharger]);

  const resume = useMemo(() => {
    const biens = patrimoine.biens.filter((b) => duProfil(b, profil));
    const dettes = patrimoine.dettes.filter((d) => duProfil(d, profil));
    const totalBiens = biens.reduce((s, b) => s + b.valeur, 0);
    const totalDettes = dettes.reduce((s, d) => s + d.capital_restant, 0);
    return {
      actif: biens.length > 0 || dettes.length > 0,
      totalBiens,
      totalDettes,
      valeurNette: soldeComptes + totalBiens - totalDettes,
    };
  }, [patrimoine, profil, soldeComptes]);

  return { patrimoine, recharger, ...resume };
}
