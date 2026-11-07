import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';
import { calculerAlertes } from '../utils/alertes';

// Les données sont relues à chaque changement de page, et dès que l'application recharge ses budgets ou ses prévisions.
export default function useAlertes({ user, activeTab, comptes, transactions, connexions, aImporter, importMode, budgetsAffiches, previsionsAffichees }) {
  const [synchro, setSynchro] = useState(null);
  const [masquees, setMasquees] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [previsions, setPrevisions] = useState([]);

  const nom = encodeURIComponent(typeof user === 'object' ? user?.nom ?? '' : user ?? '');

  // Une source indisponible n'empêche pas d'afficher les alertes des autres.
  useEffect(() => {
    if (!nom) return undefined;
    let annule = false;
    api.get('/api/alertes/etat').then((res) => {
      if (annule) return;
      setSynchro(res.data?.synchro ?? null);
      setMasquees(Array.isArray(res.data?.masquees) ? res.data.masquees : []);
    }).catch(() => {});
    return () => { annule = true; };
  }, [nom, activeTab]);

  // Tous les budgets : le calcul retient lui-même le mois en cours, quelle que soit l'écriture du mois en base.
  useEffect(() => {
    if (!nom) return undefined;
    let annule = false;
    api.get(`/get-budgets/${nom}`).then((res) => {
      if (!annule && Array.isArray(res.data)) setBudgets(res.data);
    }).catch(() => {});
    return () => { annule = true; };
  }, [nom, activeTab, budgetsAffiches]);

  useEffect(() => {
    if (!nom) return undefined;
    let annule = false;
    api.get(`/previsions/${nom}/ALL/${new Date().getFullYear()}`).then((res) => {
      if (!annule && Array.isArray(res.data)) setPrevisions(res.data);
    }).catch(() => {});
    return () => { annule = true; };
  }, [nom, activeTab, previsionsAffichees]);

  const toutes = useMemo(() => calculerAlertes({
    connexions, aImporter, synchro, modeAuto: importMode === 'auto', budgets, previsions, comptes, transactions,
  }), [connexions, aImporter, synchro, importMode, budgets, previsions, comptes, transactions]);

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
