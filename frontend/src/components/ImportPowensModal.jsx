import { useState, useEffect, useMemo } from 'react';
import { Calendar, Check, RefreshCw, Landmark, Clock } from 'lucide-react';
import DatePicker from 'react-datepicker';
import api from '../axios';
import CustomSelect from './CustomSelect';
import { toast } from 'sonner';
import { toLocalDateString } from '../utils/dateUtils';

function ImportPowensModal({ 
  banqueConnectee,
  comptes = [], 
  syncCountByAccount = {}, // 👈 Vérification du nombre réel en attente
  onClose, 
  onSuccess 
}) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [modeDate, setModeDate] = useState('smart');

  const now = new Date();
  const todayStr = toLocalDateString(now);
  const [dateDebut, setDateDebut] = useState(todayStr);
  const [dateFin, setDateFin] = useState(todayStr);

// 🟢 CALCUL DU DÉBUT DE PÉRIODE BASÉ SUR LA 1ÈRE TRANSACTION NON IMPORTÉE
  const calculateSmartStartDate = (accId, fetchedAccounts) => {
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfCurrentMonthStr = firstOfCurrentMonth.toISOString().split('T')[0];

    // 1. Trouver le compte Kleea local
    const accountObj = fetchedAccounts.find(a => String(a.id) === String(accId));
    const powensAccName = accountObj ? accountObj.name : "";

    const associatedLocal = comptes.find(
      c => (c.powens_name || "").trim().toUpperCase() === (powensAccName || "").trim().toUpperCase()
    );
    const targetCompteName = associatedLocal ? associatedLocal.compte : powensAccName;

    // 2. Vérifier les données d'attente de ce compte
    const pendingData = syncCountByAccount?.[targetCompteName] || syncCountByAccount?.[powensAccName];
    const pendingCount = typeof pendingData === 'object' ? pendingData?.count : Number(pendingData || 0);
    const earliestPendingDate = typeof pendingData === 'object' ? pendingData?.earliest_date : null;

    // Si le compte est déjà à jour (0 en attente) -> 1er du mois en cours
    if (!pendingCount || pendingCount === 0) {
      return firstOfCurrentMonthStr;
    }

    // 🟢 Si la plus ancienne transaction non importée est dans le mois en cours (ex: 01/10)
    // -> On commence strictement au 1er du mois en cours (Septembre ne sera pas affiché !)
    if (earliestPendingDate && earliestPendingDate >= firstOfCurrentMonthStr) {
      return firstOfCurrentMonthStr;
    }

    // 🟢 Si et seulement si des transactions manquent dans le mois précédent (ex: 28/09)
    // -> On commence à cette date précise de septembre
    if (earliestPendingDate && earliestPendingDate < firstOfCurrentMonthStr) {
      return earliestPendingDate;
    }

    return firstOfCurrentMonthStr;
  };

  const smartButtonLabel = useMemo(() => {
    if (!dateDebut) return "Mois en cours";
    const firstOfCurrentMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    if (dateDebut < firstOfCurrentMonthStr) {
      const prevDate = new Date(dateDebut);
      const nomMoisPrecedent = prevDate.toLocaleDateString('fr-FR', { month: 'long' });
      const moisMaj = nomMoisPrecedent.charAt(0).toUpperCase() + nomMoisPrecedent.slice(1);
      return `Mois en cours + ${moisMaj}`;
    }

    return "Mois en cours";
  }, [dateDebut, now]);

  useEffect(() => {
    async function fetchAccounts() {
      if (!banqueConnectee) return;
      try {
        setLoading(true);
        const res = await api.get('/powens/accounts');
        const fetchedAccounts = res.data || [];
        setAccounts(fetchedAccounts);

        if (fetchedAccounts.length > 0) {
          const firstId = String(fetchedAccounts[0].id);
          setSelectedAccount(firstId);
          
          const smartStart = calculateSmartStartDate(firstId, fetchedAccounts);
          setDateDebut(smartStart);
          setDateFin(todayStr);
        }
      } catch (err) {
        console.error("Erreur chargement comptes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [banqueConnectee]);

  const handleAccountChange = (newAccId) => {
    setSelectedAccount(newAccId);
    if (modeDate === 'smart') {
      const smartStart = calculateSmartStartDate(newAccId, accounts);
      setDateDebut(smartStart);
      setDateFin(todayStr);
    }
  };

  const handleModeChange = (mode) => {
    setModeDate(mode);
    if (mode === 'smart') {
      const smartStart = calculateSmartStartDate(selectedAccount, accounts);
      setDateDebut(smartStart);
      setDateFin(todayStr);
    }
  };

  const accountOptions = accounts.map((acc) => ({
    v: String(acc.id),
    l: `${acc.bank_name ? `[${acc.bank_name}] ` : ''}${acc.name} ${acc.balance !== undefined ? `(${acc.balance}€)` : ''}`
  }));

  const handleImport = async () => {
    if (!selectedAccount) return;
    setImporting(true);
    try {
      const accountObj = accounts.find(a => String(a.id) === String(selectedAccount));
      const accountName = accountObj ? accountObj.name : "Powens";

      const associatedLocalAccount = comptes.find(
        (c) => (c.powens_name || "").trim().toUpperCase() === (accountName || "").trim().toUpperCase()
      );
      const targetLocalAccountName = associatedLocalAccount ? associatedLocalAccount.compte : accountName;

      const res = await api.get(
        `/import-powens?account_id=${selectedAccount}&compte_nom=${encodeURIComponent(accountName)}&date_debut=${dateDebut}&date_fin=${dateFin}`
      );

      onSuccess(res.data, targetLocalAccountName);
      onClose();
    } catch (err) {
      console.error("Erreur import Powens détaillée :", err);
      const detailServeur = err.response?.data?.detail;
      toast.error(detailServeur || "Erreur lors de l'importation Powens");
    } finally {
      setImporting(false);
    }
  };

  const formatDateApercu = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-[var(--glass-blur)] z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--surface)] border border-white/10 rounded-[calc(var(--radius)*1.667)] p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--secondary)]/10 rounded-2xl text-[var(--secondary)] border border-[var(--secondary)]/20">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-widest text-[var(--text-main)]">
                Comptes Powens
              </h3>
              <p className="text-[9px] text-[var(--text-main)]/30 font-bold uppercase tracking-wider">
                Compte et période d'import
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-main)]/30 hover:text-rose-500 p-2 text-xs font-black uppercase transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <RefreshCw size={24} className="text-[var(--secondary)] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
              Chargement des comptes bancaires...
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-center text-xs text-rose-400 py-4 font-bold">
            Aucun compte trouvé sur cette connexion bancaire.
          </p>
        ) : (
          <div className="space-y-5">
            
            {/* Sélection du compte */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                Compte à importer
              </label>
              
              <CustomSelect 
                value={selectedAccount}
                onChange={handleAccountChange}
                options={accountOptions}
                icon={Landmark}
              />
            </div>

            {/* Sélecteur de mode de période */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                Période des transactions
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                
                <button
                  type="button"
                  onClick={() => handleModeChange('smart')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[8.5px] font-black uppercase tracking-tight transition-all cursor-pointer leading-tight text-center ${
                    modeDate === 'smart'
                      ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20'
                      : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  <Clock size={11} className="shrink-0" />
                  <span className="truncate">
                    {smartButtonLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('custom_date')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    modeDate === 'custom_date'
                      ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20'
                      : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  <Calendar size={11} /> Personnalisé
                </button>
              </div>

              {/* Indicateur visuel des dates */}
              {modeDate === 'smart' && (
                <p className="text-[8px] text-emerald-400/80 font-bold uppercase tracking-wider px-1 pt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Du {formatDateApercu(dateDebut)} au {formatDateApercu(dateFin)}
                </p>
              )}
            </div>

            {/* Dates personnalisées */}
            {modeDate === 'custom_date' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">Du</label>
                  <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[var(--primary)] transition-all">
                    <DatePicker
                      selected={dateDebut ? new Date(dateDebut) : null}
                      onChange={(date) => setDateDebut(toLocalDateString(date))}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full cursor-pointer"
                      calendarClassName="custom-calendar-dark"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">Au</label>
                  <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[var(--primary)] transition-all">
                    <DatePicker
                      selected={dateFin ? new Date(dateFin) : null}
                      onChange={(date) => setDateFin(toLocalDateString(date))}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full cursor-pointer"
                      calendarClassName="custom-calendar-dark"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={onClose} 
                className="px-4 py-2.5 text-[9px] font-black text-[var(--text-main)]/30 hover:text-rose-500 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button 
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black font-black uppercase text-[10px] rounded-xl hover:scale-105 transition-all shadow-xl shadow-[var(--primary)]/20 disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Récupération...
                  </>
                ) : (
                  <>
                    <Check size={12} strokeWidth={3} /> Importer ce compte
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default ImportPowensModal;
