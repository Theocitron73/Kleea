import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';
import { calculerAlertes } from '../utils/alertes';
import { nettoyerMois } from '../utils/finance';

const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Les données sont relues à chaque changement de page, pour tenir compte de ce qui vient d'être modifié.
export default function useAlertes({ user, activeTab, comptes, transactions, connexions, importMode }) {
  const [synchro, setSynchro] = useState(null);
  const [masquees, setMasquees] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [previsions, setPrevisions] = useState([]);

  useEffect(() => {
    if (!user) return undefined;
    const nom = encodeURIComponent(typeof user === 'object' ? user?.nom : user);
    const maintenant = new Date();
    const mois = encodeURIComponent(nettoyerMois(NOMS_MOIS[maintenant.getMonth()]));
    let annule = false;
    // Une source indisponible n'empêche pas d'afficher les alertes des autres.
    api.get('/api/alertes/etat').then((res) => {
      if (annule) return;
      setSynchro(res.data?.synchro ?? null);
      setMasquees(Array.isArray(res.data?.masquees) ? res.data.masquees : []);
    }).catch(() => {});
    api.get(`/get-budgets/${nom}/${mois}`).then((res) => {
      if (!annule && Array.isArray(res.data)) setBudgets(res.data);
    }).catch(() => {});
    api.get(`/previsions/${nom}/ALL/${maintenant.getFullYear()}`).then((res) => {
      if (!annule && Array.isArray(res.data)) setPrevisions(res.data);
    }).catch(() => {});
    return () => { annule = true; };
  }, [user, activeTab]);

  const toutes = useMemo(() => calculerAlertes({
    connexions, synchro, modeAuto: importMode === 'auto', budgets, previsions, comptes, transactions,
  }), [connexions, synchro, importMode, budgets, previsions, comptes, transactions]);

  const alertes = useMemo(() => toutes.filter((a) => !masquees.includes(a.id)), [toutes, masquees]);
  const nombreMasquees = toutes.length - alertes.length;

  const masquer = useCallback(async (id) => {
    setMasquees((liste) => [...liste, id]);
    try {
      await api.post('/api/alertes/masquees', { id });
    } catch {
      setMasquees((liste) => liste.filter((x) => x !== id));
      toast.error('Impossible de masquer cette alerte.');
    }
  }, []);

  const toutReafficher = useCallback(async () => {
    const avant = masquees;
    setMasquees([]);
    try {
      await api.delete('/api/alertes/masquees');
    } catch {
      setMasquees(avant);
      toast.error('Impossible de réafficher les alertes.');
    }
  }, [masquees]);

  return { alertes, nombreMasquees, masquer, toutReafficher };
}
