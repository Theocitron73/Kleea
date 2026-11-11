import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, LabelList, PieChart, Pie
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, ChevronRight, Download, List, PieChart as PieChartIcon, CalendarDays, Sparkles, Trophy, RefreshCw, Search, X, Flame, Terminal, Lightbulb, ShoppingCart, ArrowUpRight, ArrowDownRight, Minus, CheckCircle, TrendingDown, Ticket, HeartPulse, Cpu, Plane, Gift, AlertTriangle, Eye, EyeOff, Calendar, Wallet, Trash2 } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import api from '../axios';
import { toast } from 'sonner';
import GestionEpargneProjet from './GestionEpargneProjet';
import ValeurNetteResume from '../components/ValeurNetteResume';
import RecapAnnees from '../components/RecapAnnees';
import RepartitionDepenses from '../components/RepartitionDepenses';
import AnalyseCategories from '../components/AnalyseCategories';
import VueAbonnements from '../components/VueAbonnements';
import { depenseDuBudget, estTransfertInterne, indexMois } from '../utils/finance';

// =========================================================================
// 1. HELPERS & SOUS-COMPOSANTS ANALYTIQUES PARTAGÉS
// =========================================================================

export const generateGradientStep = (hex, stepIndex, totalSteps) => {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.1 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const finalS = s * (1 - (stepIndex / totalSteps) * 0.7); 
  const finalL = l + (stepIndex / totalSteps) * 0.15; 

  return `hsl(${Math.round(h * 360)}, ${Math.round(finalS * 100)}%, ${Math.round(finalL * 100)}%)`;
};

export const TransactionCard = ({ t, color, bg }) => {
  let day = '??';
  let month = '??';

  if (t.date) {
    const dateObj = new Date(t.date);
    if (!isNaN(dateObj.getTime())) {
      day = dateObj.getDate().toString().padStart(2, '0');
      month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); 
    } else {
      const dateStr = t.date.toString();
      if (dateStr.includes('-')) {
        const parties = dateStr.split(' ')[0].split('-');
        day = parties[0].length === 4 ? parties[2] : parties[0];
        month = parties[1];
      } else if (dateStr.includes('/')) {
        const parties = dateStr.split('/');
        day = parties[0];
        month = parties[1];
      }
    }
  }

  const moisNoms = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', 
    '05': 'MAI', '06': 'JUIN', '07': 'JUIL', '08': 'AOUT', 
    '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DEC'
  };

  return (
    <div style={{ backgroundColor: bg }} className="px-3 py-1.5 rounded-xl border border-white/5 group hover:bg-[var(--glass-bg)] transition-all flex items-center gap-3">
      <div className="flex flex-col items-center justify-center min-w-[34px] h-9 bg-black/30 rounded-lg border border-white/5 shadow-inner">
         <span style={{ color: color }} className="text-[11px] font-black leading-none">{day}</span>
         <span className="text-[7px] font-bold text-[var(--text-main)]/40 uppercase tracking-tighter mt-0.5">
           {moisNoms[month] || month}
         </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <p className="text-[var(--text-main)]/90 font-bold text-[11px] truncate leading-tight">
            {t.nom || 'Sans libellé'}
          </p>
          <span style={{ color: color }} className="font-black text-[12px] whitespace-nowrap tracking-tighter">
            {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </span>
        </div>
        
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase tracking-widest truncate">
            {t.compte}
          </span>
          <div className="flex items-center gap-1">
            <CategoryIcon name={t.categorie} size={12} />
            <span className="text-[12px] text-[var(--text-main)]/70 font-medium">
              {t.categorie}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VariationsView = ({ statsCategories = [], prevMonthLabel }) => {
  const shortPrevMonth = prevMonthLabel 
    ? prevMonthLabel.substring(0, 3).toLowerCase() + '.' 
    : 'm-1';

  const Variations = [...statsCategories]
    .filter(item => item.value > 0) 
    .sort((a, b) => {
      const aIsNew = a.evolution === null || a.isNew;
      const bIsNew = b.evolution === null || b.isNew;
      if (aIsNew && !bIsNew) return -1;
      if (!aIsNew && bIsNew) return 1;
      return (b.evolution || 0) - (a.evolution || 0);
    });

  if (Variations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-8 px-4 text-center animate-in fade-in duration-200">
        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
          <CheckCircle size={14} className="text-emerald-400" />
        </div>
        <h4 className="text-[var(--text-main)] font-black text-[9px] uppercase tracking-[0.2em] opacity-40">Stable</h4>
        <p className="text-[8px] text-[var(--text-main)]/20 font-bold uppercase mt-1">Aucune variation détectée</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 animate-in fade-in duration-200">
      <p className="text-[8.5px] md:text-[10px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] px-1">
        Variations par rapport à {shortPrevMonth}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 overflow-y-auto min-h-0 pr-0.5 custom-scrollbar pb-4">
        {Variations.map((item, i) => {
          const isNewCategory = item.evolution === null || item.isNew;
          const isStable = !isNewCategory && item.evolution === 0;
          const isAugmentation = item.evolution > 0;
          const isCritique = !isNewCategory && isAugmentation && (item.evolution >= 20 || item.diffEuro >= 50);

          return (
            <div 
              key={i} 
              className={`relative flex flex-col justify-between p-2 rounded-xl border min-h-[52px] transition-all ${
                isNewCategory
                  ? 'bg-indigo-500/[0.03] border-indigo-500/20'
                  : isStable
                    ? 'bg-white/[0.01] border-white/5 opacity-80'
                    : isCritique 
                      ? 'bg-rose-500/5 border-rose-500/20' 
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between w-full leading-none gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <CategoryIcon name={item.name} size={12} />
                  <span className="text-[9.5px] font-black uppercase tracking-tight text-white/70 truncate">
                    {getCleanCategoryName(item.name)}
                  </span>
                </div>
                <span className="text-[7.5px] font-bold tracking-wider uppercase shrink-0 italic text-white/20">
                  vs {shortPrevMonth}
                </span>
              </div>

              <div className="flex items-end justify-between w-full mt-1.5 leading-none gap-1.5">
                <div className="flex items-center gap-0.5 min-w-0">
                  {isNewCategory ? (
                    <div className="flex items-center gap-0.5 text-secondary-400">
                      <Sparkles size={9} />
                      <span className="text-[8.5px] font-black tracking-wider uppercase italic">Nouveau</span>
                    </div>
                  ) : isStable ? (
                    <div className="flex items-center gap-0.5 text-white/40">
                      <Minus size={9} strokeWidth={3} />
                      <span className="text-[8.5px] font-black tracking-wider uppercase italic">Identique</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <span className={`shrink-0 ${isAugmentation ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {isAugmentation ? <ArrowUpRight size={9} strokeWidth={3} /> : <ArrowDownRight size={9} strokeWidth={3} />}
                      </span>
                      <span className={`text-[11px] font-black tracking-tighter ${isAugmentation ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {Math.abs(item.evolution)}%
                      </span>
                    </div>
                  )}
                </div>

                <span className={`text-[11px] font-mono font-black tracking-tight shrink-0 ${
                  isNewCategory ? 'text-white' : isStable ? 'text-white/40' : isAugmentation ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {isNewCategory ? '' : isStable ? '=' : isAugmentation ? '+' : '-'}{Math.abs(Math.round(isNewCategory ? item.value : item.diffEuro))}€
                </span>
              </div>

              {isCritique && <span className="absolute top-1 right-1 w-1 h-1 rounded-full bg-rose-500 animate-ping" />}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MAP_ICONES = {
  fastfood: <Flame size={14} />,
  shopping: <ShoppingCart size={14} />,
  car: <Terminal size={14} />, 
  home: <Lightbulb size={14} />,
  sub: <Sparkles size={14} />,
  salary: <ShoppingCart size={14} />, 
  star: <Sparkles size={14} />,
  alert: <AlertTriangle size={14} />,
  health: <HeartPulse size={14} />,
  leisure: <Ticket size={14} />,
  crypto: <Wallet size={14} />,
  tech: <Cpu size={14} />,
  travel: <Plane size={14} />,
  gift: <Gift size={14} />
};

const MAP_COULEURS = {
  rose: { bg: "bg-rose-500/[0.03] border-rose-500/10", text: "text-rose-400" },
  amber: { bg: "bg-amber-500/[0.03] border-amber-500/10", text: "text-amber-400" },
  emerald: { bg: "bg-emerald-500/[0.03] border-emerald-500/10", text: "text-emerald-400" },
  indigo: { bg: "bg-indigo-500/[0.02] border-indigo-500/20", text: "text-secondary-400" },
  cyan: { bg: "bg-cyan-500/[0.03] border-cyan-500/10", text: "text-cyan-400" },
  violet: { bg: "bg-violet-500/[0.03] border-violet-500/10", text: "text-violet-400" },
  blue: { bg: "bg-blue-500/[0.03] border-blue-500/10", text: "text-blue-400" },
  orange: { bg: "bg-orange-500/[0.03] border-orange-500/10", text: "text-orange-400" },
  red: { bg: "bg-red-500/[0.03] border-red-500/10", text: "text-red-400" },
  fuchsia: { bg: "bg-fuchsia-500/[0.03] border-fuchsia-500/10", text: "text-fuchsia-400" },
};

const calculerMontantStatPerso = (config, transactions = []) => {
  const transactionsFiltrees = transactions.filter(t => {
    const montant = parseFloat(t.montant) || 0;
    if (config.flux_type === "depenses" && montant > 0) return false;
    if (config.flux_type === "revenus" && montant < 0) return false;

    const resultatsRegles = (config.regles || []).map(r => {
      let valeurChamp = "";
      if (r.champ === "categorie") valeurChamp = (t.categorie || "").toLowerCase();
      else if (r.champ === "nom") valeurChamp = (t.nom || "").toLowerCase();
      else if (r.champ === "jour") {
        if (!t.date) return false;
        const dateObj = new Date(t.date);
        valeurChamp = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
      } else if (r.champ === "montant") {
        const valeurAbsolue = Math.abs(montant);
        const seuilCible = parseFloat(r.valeur);
        if (r.condition === "GREATER_THAN") return valeurAbsolue > seuilCible;
        if (r.condition === "LESS_THAN") return valeurAbsolue < seuilCible;
      }

      const valeurCible = (r.valeur || "").toLowerCase();
      if (r.condition === "EQUALS") return valeurChamp === valeurCible;
      if (r.condition === "CONTAINS") return valeurChamp.includes(valeurCible);
      return false;
    });

    return config.operateur === "OR" 
      ? resultatsRegles.some(res => res === true)
      : resultatsRegles.every(res => res === true);
  });

  return transactionsFiltrees.reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
};

export const FlashInsightsView = ({ statsCategories = [], transactions = [], user, filters }) => {
  const [question, setQuestion] = useState("");
  const [reponseAI, setReponseAI] = useState("");
  const [loading, setLoading] = useState(false);
  const [customStats, setCustomStats] = useState([]);
  const [savingsIndicator, setSavingsIndicator] = useState(null);
  const [loadingSavings, setLoadingSavings] = useState(false);
  const [savingsCache, setSavingsCache] = useState({});

  useEffect(() => {
    const fetchCustomStats = async () => {
      try {
        const res = await api.get(`/custom-stats/${user}`);
        if (Array.isArray(res.data)) {
          setCustomStats(res.data);
        }
      } catch (err) {
        console.error("Erreur custom stats:", err);
      }
    };
    if (user) fetchCustomStats();
  }, [user]);

  useEffect(() => {
    const cacheKey = `${filters?.profil || 'Tous'}-${filters?.mois}-${filters?.annee}`;
    if (savingsCache[cacheKey]) {
      setSavingsIndicator(savingsCache[cacheKey]);
    } else {
      setSavingsIndicator(null);
    }
  }, [filters?.profil, filters?.mois, filters?.annee, savingsCache]);

  const genererAnalyseEconomies = async () => {
    const depensesMois = transactions.filter(t => parseFloat(t.montant) < 0);
    if (depensesMois.length === 0) return;

    const cacheKey = `${filters?.profil || 'Tous'}-${filters?.mois}-${filters?.annee}`;
    setLoadingSavings(true);

    const categoriesMap = {};
    let totalDepenses = 0;

    depensesMois.forEach(t => {
      const cat = t.categorie || "Autres";
      const montant = Math.abs(parseFloat(t.montant) || 0);
      categoriesMap[cat] = (categoriesMap[cat] || 0) + montant;
      totalDepenses += montant;
    });

    const payload = {
      mois: filters?.mois || "Mois en cours",
      annee: filters?.annee || new Date().getFullYear(),
      total_depenses: parseFloat(totalDepenses.toFixed(2)),
      categories: Object.keys(categoriesMap).map(cat => ({
        nom: cat,
        montant: parseFloat(categoriesMap[cat].toFixed(2))
      }))
    };

    try {
      const res = await api.post('/api/indicators/savings-analysis', payload);
      if (res.data) {
        setSavingsCache(prev => ({ ...prev, [cacheKey]: res.data }));
        setSavingsIndicator(res.data);
      }
    } catch (err) {
      console.error("Erreur économies:", err);
    } finally {
      setLoadingSavings(false);
    }
  };

  const supprimerStatPerso = async (id) => {
    try {
      await api.delete(`/custom-stats/${id}`);
      setCustomStats(prev => prev.filter(stat => stat.id !== id));
      toast.success("Indicateur supprimé");
    } catch  {
      toast.error("Impossible de supprimer l'indicateur");
    }
  };

  const analyserDonneesAvecGemini = async () => {
    if (!question.trim() || transactions.length === 0) return;
    setLoading(true);
    setReponseAI(""); 

    try {
      const res = await api.post('/api/insights-chat', { 
        question: question, 
        transactions: transactions,
        custom_stats: customStats 
      });
      
      const data = res.data;
      if (data.error) throw new Error(data.error);
      
      setReponseAI(data.reponse);
      setQuestion(""); 

      if (data?.creation_stat && Object.keys(data.creation_stat).length > 0) {
        const statData = data.creation_stat;
        const action = statData.action || "CREATE";
        const targetId = Number(statData.id);

        if (action === "UPDATE" && targetId) {
          const payloadUpdate = {
            id: targetId,
            titre: statData.titre,
            flux_type: statData.flux_type,
            operateur: statData.operateur,
            couleur: statData.couleur || "indigo",
            icone: statData.icone || "star",      
            regles: statData.regles
          };
          await api.put(`/custom-stats/${targetId}`, payloadUpdate);
          setCustomStats(prev => prev.map(s => Number(s.id) === targetId ? { ...s, ...payloadUpdate } : s));
          setReponseAI(prev => prev + "\n\n✨ **Indicateur mis à jour en direct !**");
        } else if (action === "DELETE" && targetId) {
          await api.delete(`/custom-stats/${targetId}`);
          setCustomStats(prev => prev.filter(s => Number(s.id) !== targetId));
          setReponseAI(prev => prev + "\n\n🗑️ **Indicateur supprimé en direct.**");
        } else {
          const nouvelleStat = {
            utilisateur: user.toLowerCase(),
            profil: filters?.profil || "Tous",
            titre: statData.titre,
            flux_type: statData.flux_type,
            operateur: statData.operateur,
            couleur: statData.couleur || "indigo",
            icone: statData.icone || "star",      
            regles: statData.regles
          };
          const saveRes = await api.post('/custom-stats', nouvelleStat);
          if (saveRes.data.status === "success" || saveRes.data.id) {
            setCustomStats(prev => [...prev, { id: Number(saveRes.data.id), ...nouvelleStat }]);
            setReponseAI(prev => prev + "\n\n✨ **Indicateur configuré en direct !**");
          }
        }
      }
    } catch  {
      setReponseAI("⚠️ Une erreur est survenue lors de l'analyse.");
    } finally {
      setLoading(false);
    }
  };
  
  const insights = useMemo(() => {
    const list = [];

    if (savingsIndicator && savingsIndicator.potentiel_total > 0) {
      const topConseil = savingsIndicator.conseils?.[0];
      list.push({
        id: 'permanent-savings-target',
        isDefault: true,
        type: 'success',
        customBgClass: 'bg-emerald-500/[0.04] border-emerald-500/20 col-span-1 sm:col-span-2',
        icon: <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />,
        text: (
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Opportunité d'économie du mois</span>
              <span className="text-xs font-black text-emerald-400 flex items-center gap-1">
                <TrendingDown size={14} /> +{savingsIndicator.potentiel_total.toLocaleString('fr-FR')}€
              </span>
            </div>
            {topConseil && (
              <p className="text-[11px] text-white/80 leading-snug">
                <strong className="text-white">{topConseil.categorie} :</strong> {topConseil.action_concrete} (Gain estimé : -{topConseil.economie_potentielle}€)
              </p>
            )}
          </div>
        )
      });
    }

    const pireAugmentation = [...statsCategories]
      .filter(item => item.evolution !== null && item.evolution > 25) 
      .sort((a, b) => b.evolution - a.evolution)[0];

    if (pireAugmentation) {
      list.push({
        id: 'pic-categorie',
        isDefault: true,
        type: 'danger',
        icon: <Flame size={14} className="text-rose-400 animate-pulse" />,
        text: `Vos dépenses en ${pireAugmentation.name} ont bondi de ${pireAugmentation.evolution}% par rapport au mois dernier (+${Math.round(pireAugmentation.diffEuro)}€).`
      });
    }

    const transacAlim = transactions.filter(t => {
      const cat = (t.categorie || "").toLowerCase();
      return cat.includes("alimentation") || cat.includes("courses");
    });

    if (transacAlim.length > 0) {
      const totalAlim = transacAlim.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0);
      const alimMoinsDe30 = transacAlim.filter(t => Math.abs(parseFloat(t.montant)) <= 30);

      list.push({
        id: 'compteur-alimentation',
        isDefault: true,
        type: 'info',
        icon: <ShoppingCart size={14} className="text-emerald-400" />,
        text: `Ce mois-ci, vous avez passé ${transacAlim.length} transactions au rayon Alimentation (${Math.round(totalAlim)}€ au total), dont ${alimMoinsDe30.length} achats de moins de 30€.`
      });
    }

    const microTransactions = transactions.filter(t => {
      const montant = parseFloat(t.montant);
      return montant < 0 && Math.abs(montant) <= 10;
    });

    if (microTransactions.length >= 8) {
      const totalMicroMontant = microTransactions.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0);
      list.push({
        id: 'micro-depenses',
        isDefault: true,
        type: 'warning',
        icon: <Terminal size={14} className="text-amber-400" />,
        text: `Attention aux fuites discrètes : vous avez accumulé ${microTransactions.length} micro-dépenses de moins de 10€ ce mois-ci, pour un total de ${Math.round(totalMicroMontant)}€.`
      });
    }

    const totalDepensesGlobales = transactions.filter(t => parseFloat(t.montant) < 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
    const totalRevenusGlobaux = transactions.filter(t => parseFloat(t.montant) > 0).reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);

    customStats
      .filter(config => !config.profil || config.profil.toLowerCase() === "tous" || config.profil.toLowerCase().trim() === (filters?.profil || '').toLowerCase().trim()) 
      .forEach((config) => {
        const total = calculerMontantStatPerso(config, transactions);
        const totalRef = config.flux_type === "revenus" ? totalRevenusGlobaux : totalDepensesGlobales;
        const pourcentage = totalRef > 0 ? ((total / totalRef) * 100).toFixed(1) : "0";
        const styleCouleur = MAP_COULEURS[config.couleur] || MAP_COULEURS.indigo;
        const composantIcone = MAP_ICONES[config.icone] || MAP_ICONES.star;

        list.push({
          id: config.id,
          isDefault: false,
          isAI: true,
          icon: React.cloneElement(composantIcone, { className: styleCouleur.text }),
          customBgClass: styleCouleur.bg,
          text: `Indicateur "${config.titre}" : ${total.toLocaleString()}€ (${pourcentage}% des ${config.flux_type}).`
        });
      });

    return list;
  }, [statsCategories, transactions, customStats, filters?.profil, savingsIndicator]);

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-0.5 custom-scrollbar">
      <div className="flex flex-col gap-2 transition-all duration-300">
        {reponseAI && (
          <div className="flex flex-col gap-1.5 p-3 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-xl relative group animate-fadeIn">
            <button 
              type="button"
              onClick={() => setReponseAI("")}
              className="absolute top-2 right-2 text-white/20 hover:text-white/60 text-[9px] uppercase tracking-widest transition-all px-1.5 py-0.5 rounded-sm hover:bg-white/5 cursor-pointer"
            >
              Fermer
            </button>
            <p className="text-[7px] font-black text-secondary-400 uppercase tracking-[0.2em] mb-0.5">
              ✨ Analyse de l'assistant
            </p>
            <div className="text-[11px] text-white/80 prose prose-invert max-w-none leading-relaxed break-words max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
              <ReactMarkdown>{reponseAI}</ReactMarkdown>
            </div>
          </div>
        )}

        <div className="relative flex items-center bg-white/[0.01] hover:bg-white/[0.03] focus-within:bg-black/40 rounded-xl border border-white/5 focus-within:border-indigo-500/30 p-0.5 transition-all">
          <input 
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            placeholder={loading ? "Analyse en cours..." : "Ajouter une stat (ex: 'Mes UberEats', 'Dépenses du lundi')"}
            className="flex-1 bg-transparent border-0 outline-none px-2.5 text-[11px] text-white/80 placeholder-white/40 h-7 disabled:opacity-50"
            onKeyDown={(e) => e.key === 'Enter' && analyserDonneesAvecGemini()}
          />
          <button
            type="button"
            onClick={analyserDonneesAvecGemini}
            disabled={loading || !question.trim()}
            className="h-7 px-3 rounded-lg bg-secondary-500/10 hover:bg-indigo-500 text-secondary-400 hover:text-white disabled:bg-white/0 disabled:text-white/50 text-[9px] font-black uppercase tracking-wider transition-all shrink-0 flex items-center justify-center cursor-pointer"
          >
            {loading ? <span className="w-3 h-3 border-2 border-white/50 border-t-indigo-400 rounded-full animate-spin" /> : "Demander"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1 mb-1">
          <p className="text-[10px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">
            Détecteur de comportement budgétaire & indicateurs
          </p>
          <button
            type="button"
            onClick={genererAnalyseEconomies}
            disabled={loadingSavings}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
          >
            {loadingSavings ? (
              <>
                <RefreshCw size={11} className="animate-spin text-emerald-400" />
                <span>Analyse...</span>
              </>
            ) : (
              <>
                <Sparkles size={11} />
                <span className="text-[10px]">{savingsIndicator ? "Re-calculer" : "Conseils"}</span>
              </>
            )}
          </button>
        </div>

        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-white/[0.01] border border-white/5 rounded-xl">
            <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
              <Lightbulb size={12} className="text-emerald-400" />
            </div>
            <h4 className="text-[var(--text-main)] font-black text-[10px] uppercase tracking-[0.2em] opacity-40">Rien à signaler</h4>
            <p className="text-[var(--text-main)]/20 text-[10px] font-bold uppercase tracking-wide mt-0.5">Habitudes de consommation stables.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insights.map((insight) => (
              <div 
                key={insight.id}
                className={`flex items-start justify-between gap-3 p-3 rounded-xl border transition-all ${
                  insight.customBgClass ? insight.customBgClass : 
                  insight.type === 'danger' ? 'bg-rose-500/[0.03] border-rose-500/10' :
                  insight.type === 'warning' ? 'bg-amber-500/[0.03] border-amber-500/10' :
                  'bg-white/[0.01] border-white/5'
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="shrink-0 mt-0.5">{insight.icon}</div>
                  <div className="text-[11px] font-bold text-white/70 leading-relaxed tracking-wide w-full">{insight.text}</div>
                </div>

                {!insight.isDefault && (
                  <button 
                    type="button"
                    onClick={() => supprimerStatPerso(insight.id)}
                    className="text-white/20 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all shrink-0 ms-2 cursor-pointer"
                    title="Supprimer cet indicateur"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const GridTile = React.memo(({ jour, index, totalJours }) => {
  const couleursIntensite = [
    'bg-white/[0.03] border-white/5', 
    'bg-rose-950/40 border-rose-900/20 text-rose-300', 
    'bg-rose-800/50 border-rose-700/30 text-rose-200', 
    'bg-rose-600/70 border-rose-500/40 text-rose-100', 
    'bg-rose-500 border-rose-400 text-white font-bold' 
  ];

  const estAuDebut = index < 14; 
  const estALaFin = index >= (totalJours - 14); 

  let classeXTooltip = "left-1/2 -translate-x-1/2"; 
  let classeXFleche = "left-1/2 -translate-x-1/2";
  
  if (estAuDebut) {
    classeXTooltip = "left-0 translate-x-0";
    classeXFleche = "left-1.5 translate-x-0";
  } else if (estALaFin) {
    classeXTooltip = "right-0 translate-x-0 left-auto";
    classeXFleche = "right-1.5 translate-x-0 left-auto";
  }

  const indexJourSemaine = index % 7;
  const estEnBas = indexJourSemaine >= 4; 
  const classeYTooltip = estEnBas ? "bottom-full mb-2 flex-col-reverse" : "top-full mt-2 flex-col";
  const classeYFleche = estEnBas ? "border-r border-b -mb-1" : "border-l border-t -mt-1";

  return (
    <div className={`w-full h-full rounded-[3px] border transition-all duration-150 relative group/tile ${couleursIntensite[jour.niveauIntensite]}`}>
      <div className={`absolute hidden group-hover/tile:flex items-center pointer-events-none z-50 animate-in fade-in duration-150 ${classeYTooltip} ${classeXTooltip}`}>
        <div className="bg-neutral-900/95 border border-white/10 text-white rounded-xl px-2.5 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-[var(--glass-blur)] min-w-[130px] isolate">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-wider">{jour.affichage}</p>
          <p className="text-xs font-black tracking-tight text-rose-400 mt-0.5 whitespace-nowrap">
            {jour.montant > 0 ? `${jour.montant.toLocaleString('fr-FR')} €` : '0,00 €'}
          </p>
        </div>
        <div className={`w-1.5 h-1.5 bg-neutral-900 border-white/10 rotate-45 z-50 ${classeYFleche} ${classeXFleche}`} />
      </div>
    </div>
  );
});
GridTile.displayName = 'GridTile';

export const CalendarSection = React.memo(({ toutesLesTransactions, comptesDuProfil, filters, moisListe }) => {
  const { semestre1, semestre2 } = useMemo(() => {
    const anneeCible = parseInt(filters.annee) || 2026;
    const anneeCibleStr = String(anneeCible);
    const nomsComptesProfilSet = new Set((comptesDuProfil || []).map(c => c.compte?.trim().toUpperCase()));
    const filtrerParProfil = filters.profil !== 'Tous';

    const moisMap = {};
    if (Array.isArray(moisListe)) {
      moisListe.forEach((m, idx) => {
        if (m?.v) moisMap[m.v.toLowerCase().trim()] = String(idx + 1).padStart(2, '0');
      });
    }

    const depensesParJour = {};
    const transactions = toutesLesTransactions || [];
    
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      const montant = parseFloat(t.montant) || 0;
      if (montant >= 0) continue;

      const cat = t.categorie || "";
      const lib = t.nom || "";
      if (estTransfertInterne(lib, cat)) continue;

      if (filtrerParProfil) {
        const nomCompteTransac = (t.compte || "").trim().toUpperCase();
        if (!nomsComptesProfilSet.has(nomCompteTransac)) continue;
      }

      let isoString = "";
      if (t.date && t.date.length >= 10) {
        if (t.date.substring(0, 4) !== anneeCibleStr) continue;
        isoString = t.date.substring(0, 10);
      } else {
        if (parseInt(t.annee || 0) !== anneeCible) continue;
        const mm = moisMap[String(t.mois || "").toLowerCase().trim()] || "01";
        isoString = `${anneeCibleStr}-${mm}-${String(t.jour || 1).padStart(2, '0')}`;
      }

      depensesParJour[isoString] = (depensesParJour[isoString] || 0) + Math.abs(montant);
    }

    const s1 = { jours: [], moisLabels: [] };
    const s2 = { jours: [], moisLabels: [] };
    let dernierMoisIdS1 = -1;
    let dernierMoisIdS2 = -1;
    
    const dateDebut = new Date(anneeCible, 0, 1);
    const dateFin = new Date(anneeCible, 11, 31);

    for (let d = new Date(dateDebut); d <= dateFin; d.setDate(d.getDate() + 1)) {
      const moisActuel = d.getMonth();
      const j = String(d.getDate()).padStart(2, '0');
      const m = String(moisActuel + 1).padStart(2, '0');
      const isoStr = `${anneeCibleStr}-${m}-${j}`;
      const montant = depensesParJour[isoStr] || 0;

      let niveauIntensite = 0;
      if (montant > 0) {
        if (montant <= 15) niveauIntensite = 1;
        else if (montant <= 40) niveauIntensite = 2;
        else if (montant <= 100) niveauIntensite = 3;
        else niveauIntensite = 4;
      }

      const jourObj = {
        dateStr: isoStr,
        affichage: `${d.getDate()} ${d.toLocaleDateString('fr-FR', { month: 'short' })}`,
        montant,
        niveauIntensite
      };

      if (moisActuel < 6) {
        if (moisActuel !== dernierMoisIdS1) {
          s1.moisLabels.push({ nom: d.toLocaleDateString('fr-FR', { month: 'short' }), colIndex: Math.floor(s1.jours.length / 7) });
          dernierMoisIdS1 = moisActuel;
        }
        s1.jours.push(jourObj);
      } else {
        if (moisActuel !== dernierMoisIdS2) {
          s2.moisLabels.push({ nom: d.toLocaleDateString('fr-FR', { month: 'short' }), colIndex: Math.floor(s2.jours.length / 7) });
          dernierMoisIdS2 = moisActuel;
        }
        s2.jours.push(jourObj);
      }
    }

    return { semestre1: s1, semestre2: s2 };
  }, [toutesLesTransactions, comptesDuProfil, filters.annee, filters.profil, moisListe]);

  // Toute l'année tient dans le panneau sans défilement : la taille des carrés suit la place disponible,
  // en largeur comme en hauteur, et ils restent carrés.
  const zone = useRef(null);
  const [cote, setCote] = useState(12);
  const nbColonnes = Math.max(Math.ceil(semestre1.jours.length / 7), Math.ceil(semestre2.jours.length / 7), 1);
  useEffect(() => {
    const element = zone.current;
    if (!element) return undefined;
    const ESPACE = 3, LIBELLE = 16, ENTRE_SEMESTRES = 16;
    const mesurer = () => {
      const { width, height } = element.getBoundingClientRect();
      const parLargeur = (width - (nbColonnes - 1) * ESPACE) / nbColonnes;
      // Sans hauteur imposée (mobile), seule la largeur compte.
      const parHauteur = height > 120 ? ((height - ENTRE_SEMESTRES) / 2 - LIBELLE - 7 * ESPACE) / 7 : Infinity;
      setCote(Math.max(6, Math.min(26, Math.floor(Math.min(parLargeur, parHauteur)))));
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [nbColonnes]);

  const semestre = (s) => {
    const colonnes = Math.ceil(s.jours.length / 7);
    return (
      <div className="grid gap-[3px] justify-center"
        style={{ gridTemplateColumns: `repeat(${colonnes}, ${cote}px)`, gridTemplateRows: `16px repeat(7, ${cote}px)`, gridAutoFlow: 'column' }}>
        {Array.from({ length: colonnes }).flatMap((_, colIdx) => {
          const moisLabel = s.moisLabels.find(m => m.colIndex === colIdx);
          const jours = s.jours.slice(colIdx * 7, colIdx * 7 + 7);
          return [
            <span key={`m-${colIdx}`} className="h-4 text-[9px] font-black uppercase text-[var(--text-main)]/40 tracking-wider whitespace-nowrap overflow-visible pointer-events-none">
              {moisLabel ? moisLabel.nom.replace('.', '') : ''}
            </span>,
            ...jours.map((jour, index) => (
              <GridTile key={jour.dateStr} jour={jour} index={colIdx * 7 + index} totalJours={s.jours.length} />
            )),
            ...Array.from({ length: 7 - jours.length }).map((_, k) => <span key={`v-${colIdx}-${k}`} />),
          ];
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full p-4 min-h-0 animate-in fade-in zoom-in-98 duration-300">
      <p className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-widest mb-3 self-start">
        Intensité des dépenses quotidiennes (Par semestre)
      </p>

      <div ref={zone} className="flex-1 min-h-0 flex flex-col justify-center gap-4">
        {semestre(semestre1)}
        {semestre(semestre2)}
      </div>

      <div className="flex items-center gap-1.5 pt-3 self-end text-[8px] font-bold text-[var(--text-main)]/30 uppercase tracking-wider">
        <span>Moins</span>
        <div className="w-2 h-2 rounded-sm bg-white/[0.03] border border-white/5" />
        <div className="w-2 h-2 rounded-sm bg-rose-950/40 border border-rose-900/20" />
        <div className="w-2 h-2 rounded-sm bg-rose-800/50 border border-rose-700/30" />
        <div className="w-2 h-2 rounded-sm bg-rose-600/70 border border-rose-500/40" />
        <div className="w-2 h-2 rounded-sm bg-rose-500 border border-rose-400" />
        <span>Plus</span>
      </div>
    </div>
  );
});
CalendarSection.displayName = 'CalendarSection';

const MOIS_NOMS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// Les chiffres d'une année pour le Wrapped. Servent aussi pour l'année précédente, en comparaison.
function calculerWrapped(toutesLesTransactions, comptesDuProfil, filters, anneeCible, limite = null) {
    const aujourdhui = new Date();
    const nomsComptesProfilSet = new Set((comptesDuProfil || []).map(c => c.compte?.trim().toUpperCase()));
    const filtrerParProfil = filters.profil !== 'Tous';

    let totalDepense = 0;
    let totalRevenus = 0;
    let nombreTotalTransactions = 0;
    let nbVirementsPositifs = 0;
    let plusGrosseDepense = { montant: 0, nom: "Aucune", date: "" };
    let nbPetitesDepenses = 0; 
    let depensesWeekend = 0;
    let depensesSemaine = 0;

    const categoriesMap = {};
    const moisAvecRevenus = new Set();
    const joursSemaineMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const moisMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0 };
    const dailySpendingMap = {}; 
    const saisonsMap = { Hiver: 0, Printemps: 0, Été: 0, Automne: 0 };

    const transactions = toutesLesTransactions || [];

    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      let dateObj = null;
      let anneeT = 0;
      let moisIndex = 0;
      let dateString = "";

      if (t.date) {
        dateObj = new Date(t.date);
        anneeT = dateObj.getFullYear();
        moisIndex = dateObj.getMonth();
        dateString = t.date.substring(0, 10);
      } else {
        anneeT = parseInt(t.annee || 0);
        moisIndex = parseInt(t.mois || 1) - 1;
        dateString = `Inconnu-${moisIndex}`;
      }
      
      if (anneeT !== anneeCible) continue;
      // Comparaison à date égale : rien après le même jour de l'année.
      if (limite && dateObj && (dateObj.getMonth() > limite.mois || (dateObj.getMonth() === limite.mois && dateObj.getDate() > limite.jour))) continue;

      if (filtrerParProfil) {
        const nomCompteTransac = (t.compte || "").trim().toUpperCase();
        if (!nomsComptesProfilSet.has(nomCompteTransac)) continue;
      }

      const montant = parseFloat(t.montant) || 0;
      const cat = (t.categorie || "").toLowerCase().trim();
      const lib = (t.nom || "").trim();

      const estTransfert = estTransfertInterne(lib, cat);

      if (montant > 0 && !estTransfert) {
        totalRevenus += montant;
        nbVirementsPositifs++;
        moisAvecRevenus.add(moisIndex);
        continue;
      }

      if (montant >= 0 || estTransfert) continue;

      const montantAbs = Math.abs(montant);
      totalDepense += montantAbs;
      nombreTotalTransactions++;

      if (montantAbs < 10) nbPetitesDepenses++;

      if (montantAbs > plusGrosseDepense.montant) {
        plusGrosseDepense = {
          montant: montantAbs,
          nom: lib,
          date: dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : `Mois ${moisIndex + 1}`
        };
      }

      if (cat) categoriesMap[t.categorie.trim()] = (categoriesMap[t.categorie.trim()] || 0) + montantAbs;
      moisMap[moisIndex] = (moisMap[moisIndex] || 0) + montantAbs;
      dailySpendingMap[dateString] = (dailySpendingMap[dateString] || 0) + montantAbs;

      if (moisIndex === 11 || moisIndex === 0 || moisIndex === 1) saisonsMap["Hiver"] += montantAbs;
      else if (moisIndex >= 2 && moisIndex <= 4) saisonsMap["Printemps"] += montantAbs;
      else if (moisIndex >= 5 && moisIndex <= 7) saisonsMap["Été"] += montantAbs;
      else if (moisIndex >= 8 && moisIndex <= 10) saisonsMap["Automne"] += montantAbs;

      if (dateObj && !isNaN(dateObj.getTime())) {
        const jourIndex = dateObj.getDay();
        joursSemaineMap[jourIndex] = (joursSemaineMap[jourIndex] || 0) + montantAbs;
        if (jourIndex === 0 || jourIndex === 6) depensesWeekend += montantAbs;
        else depensesSemaine += montantAbs;
      }
    }

    const topCategories = Object.entries(categoriesMap).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([nom, m]) => ({ nom, montant: m }));
    if (topCategories.length === 0) topCategories.push({ nom: "Aucune", montant: 0 });
    
    const joursNoms = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const topJourSemaine = Object.entries(joursSemaineMap).sort((a, b) => b[1] - a[1])[0] || [1, 0];
    const moisNoms = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Décembre"];
    const triMois = Object.entries(moisMap).sort((a, b) => b[1] - a[1]);
    const topMoisMax = triMois[0] || [0, 0];
    // Le mois le plus sage n'est cherché que parmi les mois terminés : un mois à venir n'a encore rien dépensé.
    const dernierMoisTermine = anneeCible === aujourdhui.getFullYear() ? aujourdhui.getMonth() - 1 : anneeCible < aujourdhui.getFullYear() ? 11 : -1;
    const moisTermines = triMois.filter(([m]) => Number(m) <= dernierMoisTermine);
    const topMoisMin = moisTermines[moisTermines.length - 1] || [0, 0];
    const pireJourDate = Object.entries(dailySpendingMap).sort((a, b) => b[1] - a[1])[0] || ["-", 0];

    let pireJourFormate = pireJourDate[0];
    if (pireJourFormate !== "-" && !pireJourFormate.includes('Inconnu')) {
      pireJourFormate = new Date(pireJourFormate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    let totalJoursAnnee = 365;
    if (anneeCible === aujourdhui.getFullYear()) {
      const debutAnnee = new Date(anneeCible, 0, 1);
      totalJoursAnnee = Math.max(1, Math.floor((aujourdhui - debutAnnee) / (1000 * 60 * 60 * 24)));
    }
    const joursSansDepense = Math.max(0, totalJoursAnnee - Object.keys(dailySpendingMap).filter(k => !k.includes('Inconnu')).length);
    const topSaison = Object.entries(saisonsMap).sort((a, b) => b[1] - a[1])[0] || ["Aucune", 0];
    const totalSemaineWeekend = depensesSemaine + depensesWeekend;

    // Plus longue suite de jours sans dépense, jusqu'à aujourd'hui pour l'année en cours.
    const serieSansDepense = { jours: 0, debut: null, fin: null };
    const fin = anneeCible === aujourdhui.getFullYear() ? aujourdhui : new Date(anneeCible, 11, 31);
    let debutSerie = null;
    for (let d = new Date(anneeCible, 0, 1); d <= fin; d.setDate(d.getDate() + 1)) {
      const cle = `${anneeCible}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (dailySpendingMap[cle]) { debutSerie = null; continue; }
      if (!debutSerie) debutSerie = new Date(d);
      const longueur = Math.round((d - debutSerie) / 86400000) + 1;
      if (longueur > serieSansDepense.jours) Object.assign(serieSansDepense, { jours: longueur, debut: new Date(debutSerie), fin: new Date(d) });
    }

    // Le premier poste de dépenses, en jours de travail : revenu mensuel moyen ÷ 21,67 jours ouvrés.
    const revenuParJour = moisAvecRevenus.size > 0 ? totalRevenus / moisAvecRevenus.size / 21.67 : 0;
    const joursDeTravail = revenuParJour > 0 && topCategories[0]?.montant > 0 ? topCategories[0].montant / revenuParJour : 0;
    const pctWeekend = totalSemaineWeekend > 0 ? (depensesWeekend / totalSemaineWeekend) * 100 : 0;

    return {
      totalDepense,
      totalRevenus,
      nbVirementsPositifs,
      plusGrosseDepense,
      topCategories,
      vraiTopJour: joursNoms[topJourSemaine[0]],
      vraiTopMois: moisNoms[topMoisMax[0]],
      montantTopMois: topMoisMax[1],
      moisLePlusSage: moisTermines.length ? moisNoms[topMoisMin[0]] : null,
      montantMoisSage: topMoisMin[1],
      nombreTotalTransactions,
      moyenneTransaction: nombreTotalTransactions > 0 ? totalDepense / nombreTotalTransactions : 0,
      nbPetitesDepenses,
      tauxEpargne: totalRevenus > 0 ? Math.max(0, ((totalRevenus - totalDepense) / totalRevenus) * 100) : 0,
      pireJourDate: pireJourFormate,
      pireJourMontant: pireJourDate[1],
      joursSansDepense,
      topSaison: topSaison[0],
      pctWeekend,
      serieSansDepense,
      joursDeTravail,
    };
}

export const WrappedSection = React.memo(({ toutesLesTransactions, comptesDuProfil, filters, user, objectifAnnuelGlobal = 0, epargneReelleCumulee = 0 }) => {
  const annee = parseInt(filters.annee) || 2026;
  const stats = useMemo(() => calculerWrapped(toutesLesTransactions, comptesDuProfil, filters, annee), [toutesLesTransactions, comptesDuProfil, filters, annee]);
  const enCours = annee === new Date().getFullYear();
  const precedente = useMemo(() => {
    const maintenant = new Date();
    return calculerWrapped(toutesLesTransactions, comptesDuProfil, filters, annee - 1, enCours ? { mois: maintenant.getMonth(), jour: maintenant.getDate() } : null);
  }, [toutesLesTransactions, comptesDuProfil, filters, annee, enCours]);
  const euros = (n) => `${Math.round(n).toLocaleString('fr-FR')} €`;
  const evolution = (actuel, avant, estDepense) => {
    if (!(avant > 0)) return null;
    const pct = Math.round(((actuel - avant) / avant) * 100);
    const favorable = estDepense ? pct <= 0 : pct >= 0;
    return (
      <p className={`text-[10px] font-bold ${favorable ? 'text-emerald-400' : 'text-rose-400'}`}>
        {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)} % {enCours ? `par rapport à ${annee - 1} à la même date` : `par rapport à ${annee - 1}`}
      </p>
    );
  };

  // Budgets de l'année : chaque budget d'un mois passé ou en cours compte comme tenu ou dépassé.
  const [budgetsAnnee, setBudgetsAnnee] = useState([]);
  useEffect(() => {
    if (!user) return;
    api.get(`/get-budgets/${user}`)
      .then((res) => setBudgetsAnnee((Array.isArray(res.data) ? res.data : []).filter((b) => parseInt(b.annee, 10) === annee)))
      .catch(() => setBudgetsAnnee([]));
  }, [user, annee]);
  const budgetsTenus = useMemo(() => {
    const maintenant = new Date();
    const dernierMois = annee < maintenant.getFullYear() ? 11 : annee > maintenant.getFullYear() ? -1 : maintenant.getMonth();
    const parMois = {};
    let tenus = 0;
    let total = 0;
    for (const b of budgetsAnnee) {
      const index = indexMois(b.mois);
      if (index < 0 || index > dernierMois || !(parseFloat(b.somme) > 0)) continue;
      const ok = depenseDuBudget(b, toutesLesTransactions) <= parseFloat(b.somme);
      total += 1;
      if (ok) tenus += 1;
      parMois[index] = parMois[index] || { tenus: 0, total: 0 };
      parMois[index].total += 1;
      if (ok) parMois[index].tenus += 1;
    }
    const meilleur = Object.entries(parMois).sort((a, b) => (b[1].tenus / b[1].total) - (a[1].tenus / a[1].total) || b[1].total - a[1].total)[0];
    return { tenus, total, meilleurMois: meilleur ? MOIS_NOMS[meilleur[0]] : null };
  }, [budgetsAnnee, toutesLesTransactions, annee]);

  const cartes = [
        <div key="carte-0" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Cumul annuel des sorties</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-white">
              {stats.totalDepense.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
            {evolution(stats.totalDepense, precedente.totalDepense, true) || <p className="text-[10px] font-medium text-white/60">Au total sur la période analysée.</p>}
          </div>
        </div>,
        <div key="carte-1" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Cumul annuel des entrées 💰</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-emerald-400">
              + {stats.totalRevenus.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
            </p>
            {evolution(stats.totalRevenus, precedente.totalRevenus, false) || <p className="text-[10px] font-medium text-white/60">Salaires, virements et rentrées d'argent.</p>}
          </div>
        </div>,
        <div key="carte-2" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Fréquence des bonnes nouvelles 🔔</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-teal-400">
              {stats.nbVirementsPositifs} virements reçus
            </p>
            <p className="text-[10px] font-medium text-white/60">Nombre de fois où votre compte a été crédité.</p>
          </div>
        </div>,
        <div key="carte-3" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Le pic unique de l'année 💸</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-rose-400">
              - {stats.plusGrosseDepense.montant.toLocaleString('fr-FR')} €
            </p>
            <p className="text-xs font-bold text-white/80 truncate capitalize">{stats.plusGrosseDepense.nom.toLowerCase()}</p>
            <p className="text-[10px] font-medium text-white/40">Le {stats.plusGrosseDepense.date}</p>
          </div>
        </div>,
        <div key="carte-4" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Le jour noir du compte 🖤</p>
          <div className="mt-4 space-y-1">
            <p className="text-lg font-black tracking-tight text-red-500 truncate">
              {stats.pireJourMontant.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € en 24h
            </p>
            <p className="text-xs font-bold text-white/70 truncate">{stats.pireJourDate}</p>
            <p className="text-[10px] font-medium text-white/40">Toutes transactions cumulées.</p>
          </div>
        </div>,
        <div key="carte-5" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Top 3 Catégories</p>
          <div className="mt-2 space-y-2">
            {stats.topCategories.map((cat, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <CategoryIcon name={cat.nom} size={12} showBg={false} />
                  <span className="flex-1 min-w-0 text-xs font-bold text-white/90 truncate">{getCleanCategoryName(cat.nom)}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-white/60">{euros(cat.montant)}</span>
                </div>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-400/80" style={{ width: `${stats.topCategories[0].montant > 0 ? (cat.montant / stats.topCategories[0].montant) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>,
        <div key="carte-6" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Le mois rouge 📈</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-red-400">{stats.vraiTopMois}</p>
            <p className="text-[10px] font-medium text-white/60">
              Un sommet de <span className="font-bold text-white">{stats.montantTopMois.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>.
            </p>
          </div>
        </div>,
        <div key="carte-7" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">L'Oasis Financière 🏝️</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-emerald-400">{stats.moisLePlusSage || '—'}</p>
            <p className="text-[10px] font-medium text-white/60">
              Calme avec seulement <span className="font-bold text-white">{stats.montantMoisSage.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>.
            </p>
          </div>
        </div>,
        <div key="carte-8" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Faiblesse hebdomadaire</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-amber-400">Chaque {stats.vraiTopJour}</p>
            <p className="text-[10px] font-medium text-white/60">Le jour de la semaine le plus chargé.</p>
          </div>
        </div>,
        <div key="carte-9" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Profil : Weekend vs Semaine</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-secondary-400">{stats.pctWeekend.toFixed(0)} %</p>
            <p className="text-[10px] font-medium text-white/60">De vos budgets s'envolent le weekend.</p>
          </div>
        </div>,
        <div key="carte-10" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Votre Saison "Flambeur" ☀️</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-fuchsia-400">{stats.topSaison.toLowerCase()}</p>
            <p className="text-[10px] font-medium text-white/60">La saison où le budget est le plus lâche.</p>
          </div>
        </div>,
        <div key="carte-11" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Jours de pure discipline 🧘‍♂️</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-teal-400">{stats.joursSansDepense} Jours</p>
            <p className="text-[10px] font-medium text-white/60">À 0,00 € de dépenses carte.</p>
          </div>
        </div>,
        <div key="carte-travail" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Votre premier poste, en jours de travail</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-amber-300">{stats.joursDeTravail > 0 ? `${Math.round(stats.joursDeTravail)} jours` : '—'}</p>
            <p className="text-[10px] font-medium text-white/60 truncate">
              {stats.joursDeTravail > 0 ? `de revenus pour ${getCleanCategoryName(stats.topCategories[0].nom)} (${euros(stats.topCategories[0].montant)}).` : 'Pas encore assez de revenus pour le calculer.'}
            </p>
          </div>
        </div>,
        <div key="carte-serie" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Plus longue série sans dépense</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-teal-400">{stats.serieSansDepense.jours} jour{stats.serieSansDepense.jours > 1 ? 's' : ''} d’affilée</p>
            <p className="text-[10px] font-medium text-white/60">
              {stats.serieSansDepense.jours > 0
                ? `Du ${stats.serieSansDepense.debut.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} au ${stats.serieSansDepense.fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.`
                : 'Pas un seul jour sans dépense.'}
            </p>
          </div>
        </div>,
        <div key="carte-budgets" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">Objectifs budgétaires tenus</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-emerald-400">{budgetsTenus.total > 0 ? `${budgetsTenus.tenus} sur ${budgetsTenus.total}` : '—'}</p>
            <p className="text-[10px] font-medium text-white/60">
              {budgetsTenus.total > 0 ? `Meilleur mois : ${budgetsTenus.meilleurMois}.` : 'Aucun objectif budgétaire fixé cette année.'}
            </p>
          </div>
        </div>,
        <div key="carte-epargne" className="h-[150px] min-w-0 overflow-hidden p-5 bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-xl">
          <p className="text-[9px] font-black uppercase text-white/40 tracking-wider">L’épargne de l’année</p>
          <div className="mt-4 space-y-1">
            <p className="text-xl font-black tracking-tight text-emerald-400">{euros(epargneReelleCumulee)} mis de côté</p>
            {objectifAnnuelGlobal > 0 ? (
              <>
                <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, (epargneReelleCumulee / objectifAnnuelGlobal) * 100)}%` }} />
                </div>
                <p className="text-[10px] font-medium text-white/60">{Math.round((epargneReelleCumulee / objectifAnnuelGlobal) * 100)} % de votre objectif de {euros(objectifAnnuelGlobal)}.</p>
              </>
            ) : <p className="text-[10px] font-medium text-white/60">Taux d’épargne : {Math.round(stats.tauxEpargne)} %.</p>}
          </div>
        </div>,
  ];

  // Les cartes se rangent en pages : autant qu'en contient le panneau, et un slider s'il en reste.
  const CARTE = 150;
  const ESPACE = 16;
  const zone = useRef(null);
  const [disposition, setDisposition] = useState({ colonnes: 3, parPage: cartes.length });
  const [page, setPage] = useState(0);
  useEffect(() => {
    const element = zone.current;
    if (!element) return undefined;
    const mesurer = () => {
      const { width, height } = element.getBoundingClientRect();
      const colonnes = width >= 620 ? 3 : width >= 400 ? 2 : 1;
      // Sans hauteur imposée (mobile), toutes les cartes s'affichent les unes sous les autres.
      const lignes = height >= CARTE ? Math.max(1, Math.floor((height + ESPACE) / (CARTE + ESPACE))) : Infinity;
      setDisposition({ colonnes, parPage: lignes === Infinity ? Infinity : colonnes * lignes });
    };
    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, []);
  const parPage = Math.max(1, Math.min(cartes.length, disposition.parPage));
  const nbPages = Math.ceil(cartes.length / parPage);
  const pageCourante = Math.min(page, nbPages - 1);
  const visibles = cartes.slice(pageCourante * parPage, (pageCourante + 1) * parPage);
  // La molette passe d'une page à l'autre, une page par cran, sans faire défiler le panneau.
  const derniereMolette = useRef(0);
  useEffect(() => {
    const element = zone.current;
    if (!element || nbPages <= 1) return undefined;
    const surMolette = (e) => {
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      const instant = Date.now();
      if (instant - derniereMolette.current < 350) return;
      derniereMolette.current = instant;
      setPage((p) => Math.max(0, Math.min(nbPages - 1, Math.min(p, nbPages - 1) + (delta > 0 ? 1 : -1))));
    };
    element.addEventListener('wheel', surMolette, { passive: false });
    return () => element.removeEventListener('wheel', surMolette);
  }, [nbPages]);

  // Carte de fin : un résumé de l'année en une image, à télécharger et à partager.
  const telechargerResume = () => {
    const toile = document.createElement('canvas');
    toile.width = 1080;
    toile.height = 1350;
    const c = toile.getContext('2d');
    const fond = c.createLinearGradient(0, 0, 1080, 1350);
    fond.addColorStop(0, '#0f172a');
    fond.addColorStop(1, '#312e81');
    c.fillStyle = fond;
    c.fillRect(0, 0, 1080, 1350);
    c.fillStyle = '#f43f5e';
    c.font = '700 30px system-ui, sans-serif';
    c.fillText('RÉTROSPECTIVE', 90, 150);
    c.fillStyle = '#ffffff';
    c.font = '800 84px system-ui, sans-serif';
    c.fillText(`Mon année ${annee}`, 90, 250);
    const lignes = [
      ['Dépenses', euros(stats.totalDepense), '#fda4af'],
      ['Revenus', euros(stats.totalRevenus), '#6ee7b7'],
      ['Épargne mise de côté', euros(epargneReelleCumulee), '#6ee7b7'],
      ['Catégorie n°1', `${getCleanCategoryName(stats.topCategories[0].nom)} · ${euros(stats.topCategories[0].montant)}`, '#fcd34d'],
      ['Plus longue série sans dépense', `${stats.serieSansDepense.jours} jours`, '#5eead4'],
      ['Mois le plus sage', String(stats.moisLePlusSage || '—'), '#c4b5fd'],
    ];
    lignes.forEach(([libelle, valeur, couleur], i) => {
      const y = 400 + i * 145;
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.font = '600 30px system-ui, sans-serif';
      c.fillText(libelle, 90, y);
      c.fillStyle = couleur;
      c.font = '800 54px system-ui, sans-serif';
      c.fillText(valeur, 90, y + 62, 900);
    });
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.font = '600 28px system-ui, sans-serif';
    c.fillText('Kleea', 90, 1290);
    const lien = document.createElement('a');
    lien.download = `kleea-wrapped-${annee}.png`;
    lien.href = toile.toDataURL('image/png');
    lien.click();
  };

  const FLECHE = 'w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-main)] cursor-pointer disabled:opacity-30 disabled:cursor-default transition-colors';

  return (
    <div className={`flex-1 w-full h-full min-h-0 p-6 flex flex-col gap-5 animate-in fade-in zoom-in-98 duration-300 ${nbPages > 1 ? '' : 'overflow-y-auto custom-scrollbar'}`}>
      <div className="shrink-0 flex items-end justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-black tracking-widest text-rose-500 uppercase">Rétrospective de l'année</span>
          <h2 className="text-2xl font-black tracking-tight text-[var(--text-main)]">Votre {filters.annee || 2026} Financial Wrapped</h2>
        </div>
        <button type="button" onClick={telechargerResume} title="Télécharger un résumé de l’année en image"
          className="shrink-0 flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[var(--text-main)] cursor-pointer transition-colors">
          <Download size={13} /> Télécharger
        </button>
      </div>

      <div ref={zone} className="flex-1 min-h-0">
        <div key={pageCourante} aria-label={nbPages > 1 ? `Page ${pageCourante + 1} sur ${nbPages}` : undefined}
          className="grid gap-4 content-start animate-in fade-in slide-in-from-right-4 duration-300"
          style={{ gridTemplateColumns: `repeat(${disposition.colonnes}, minmax(0, 1fr))` }}>
          {visibles}
        </div>
      </div>

      {nbPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-3" role="group" aria-label="Pages du Wrapped">
          <button type="button" className={FLECHE} aria-label="Cartes précédentes" disabled={pageCourante === 0} onClick={() => setPage(pageCourante - 1)}>
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: nbPages }).map((_, i) => (
              <button key={i} type="button" aria-label={`Page ${i + 1}`} aria-current={i === pageCourante ? 'page' : undefined} onClick={() => setPage(i)}
                className={`h-2 rounded-full cursor-pointer transition-all ${i === pageCourante ? 'w-6 bg-[var(--text-main)]' : 'w-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
          <button type="button" className={FLECHE} aria-label="Cartes suivantes" disabled={pageCourante === nbPages - 1} onClick={() => setPage(pageCourante + 1)}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
});
WrappedSection.displayName = 'WrappedSection';

// =========================================================================
// 2. COMPOSANT PRINCIPAL UNIFIÉ DU DASHBOARD (DESKTOP & MOBILE)
// =========================================================================

export default function DashboardView(props) {
  const {
    filters, setFilters, moisListe, availablePeriods, groupesDisponibles,
    handleWheelProfil, handleWheelMois, handleWheelAnnee, handleWheelTabActive,
    handleWheelAnnualTab, handleWheelRightTab, userTheme = {}, soldeGlobal = 0, valeurNette = 0, patrimoineActif = false, ouvrirPatrimoine, patrimoine = { biens: [], dettes: [] },
    soldesTries = [], sensors, handleDragEnd, SortableAccountCard, TAB_CONFIG,
    tabActive, setTabActive, searchTerm, setSearchTerm, financeData,
    statsCategories = [], hiddenCategories = [], toggleCategory, user,
    budgetGauges = [], carouselRef, handleScroll, totalDots = 1, activeIndex = 0,
    navigateCarousel, scrollToPage, setActiveTab, annualTab, setAnnualTab,
    soldePremierJanvier = 0, recapAnnuelStats = [], statsAnnuellesCategories = [],
    toutesLesTransactions = [], comptesDuProfil = [], isCompact = false, setTotalTab,
    estPeriode, moisDebut, setMoisDebut, moisFin, setMoisFin, donneesAffichees = { revenus: 0, depenses: 0, epargne: 0, tauxEffort: 0 },
    activeRightTab, setActiveRightTab, objectifAnnuelGlobal = 0, epargneReelleCumulee = 0,
    epargneProjeteeTotale = 0, pctReel = 0, pctProjete = 0, visibleAnnuel = {}, setVisibleAnnuel,
    comptes = [], hiddenComptes = {}, setHiddenComptes, allocations = [], setAllocations,
    projets = [], setProjets, api, CustomSelect, categoriesVisibles = [], updateCell, loadPrevisions
  } = props;

  const jaugeColor = userTheme.color_jauge || '#f1c40f';

  // Sous-onglets d'Analytique : les graphiques mois par mois, ou le récap année par année.
  const [vueAnalytique, setVueAnalytique] = useState('mois'); // 'mois' | 'annees'
  const selecteurVueAnalytique = (
    <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-fit shrink-0 select-none">
      {[{ id: 'mois', label: 'Mois' }, { id: 'annees', label: 'Années' }].map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setVueAnalytique(id)}
          aria-pressed={vueAnalytique === id}
          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
            vueAnalytique === id ? 'bg-white text-slate-900 shadow-md' : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  // --- ÉTATS SPÉCIFIQUES DU MODE MOBILE ---
  const [mobileHub, setMobileHub] = useState('flux'); // 'flux' | 'annual' | 'graphs'
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isSortingAccounts, setIsSortingAccounts] = useState(false);

  // Données de progression d'épargne réelles vs prévisionnelles (partagées Desktop & Mobile)
  const savingsData = useMemo(() => {
    let reelCumul = 0;
    let projeteTotal = 0;

    (recapAnnuelStats || []).forEach(m => {
      if (m.hasRealData || m.isPasseCloture) {
        reelCumul += (m.epargneReel || 0);
      }
      if (m.isPasseCloture) {
        projeteTotal += (m.epargneReel || 0);
      } else if (m.hasPrevisions) {
        projeteTotal += (m.epargnePrevu || 0);
      } else if (m.hasRealData) {
        projeteTotal += (m.epargneReel || 0);
      }
    });

    const obj = objectifAnnuelGlobal || 0;
    const pReel = obj > 0 ? Math.max(0, Math.round((reelCumul / obj) * 100)) : 0;
    const pProjete = obj > 0 ? Math.max(0, Math.round((projeteTotal / obj) * 100)) : 0;

    return {
      reel: epargneReelleCumulee || reelCumul,
      projete: epargneProjeteeTotale || projeteTotal,
      pctR: pctReel || pReel,
      pctP: pctProjete || pProjete
    };
  }, [recapAnnuelStats, objectifAnnuelGlobal, epargneReelleCumulee, epargneProjeteeTotale, pctReel, pctProjete]);

  const handleSaveMobileTx = async () => {
    if (!editingTransaction || !updateCell) return;
    await updateCell(editingTransaction.id, 'nom', editingTransaction.nom);
    await updateCell(editingTransaction.id, 'montant', parseFloat(editingTransaction.montant));
    await updateCell(editingTransaction.id, 'categorie', editingTransaction.categorie);
    await updateCell(editingTransaction.id, 'compte', editingTransaction.compte);
    setEditingTransaction(null);
  };

  return (
    <div className="w-full select-none">

      {/* =========================================================================
          1. AFFICHAGE DESKTOP (100% IDENTIQUE AU DESIGN D'ORIGINE)
          ========================================================================= */}
      <div className="hidden lg:flex flex-col animate-in fade-in duration-500 px-4 md:px-8 h-auto overflow-visible lg:h-[calc(99vh-100px)] lg:overflow-hidden">
        
        {/* BARRE DE FILTRES DU DASHBOARD */}
        <div className="shrink-0 flex flex-wrap items-center gap-4 mb-4 p-3 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] rounded-[var(--radius)] border border-white/10 select-none">
          
          {/* PROFIL */}
          <div 
            onWheel={handleWheelProfil}
            className="flex items-center gap-1 bg-black/20 p-1 rounded-xl cursor-ns-resize"
            title="Molette de la souris : changer de profil"
          >
            {groupesDisponibles.map(p => {
              const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters({ ...filters, profil: p })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-6 bg-[var(--glass-bg)]" />

          {/* MOIS */}
          <div 
            onWheel={(e) => handleWheelMois && handleWheelMois(e, false)}
            className="flex items-center gap-1 no-scrollbar cursor-ns-resize"
            title="Molette de la souris : changer de mois"
          >
            {moisListe.map(m => {
              const hasData = availablePeriods.some(p => 
                p.mois === m.v && p.annee.toString() === filters.annee?.toString()
              );
              if (!hasData) return null;
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setFilters({ ...filters, mois: m.v })}
                  className={`min-w-[38px] py-1.5 rounded-lg text-[10px] font-black transition-all border cursor-pointer ${
                    filters.mois === m.v 
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-main)]' 
                      : 'bg-transparent border-transparent text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  {m.l.substring(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>

          <div className="hidden md:block w-px h-6 bg-[var(--glass-bg)]" />

          {/* ANNÉE */}
          <div 
            onWheel={(e) => handleWheelAnnee && handleWheelAnnee(e, false)}
            className="flex items-center gap-1 cursor-ns-resize"
            title="Molette de la souris : changer d'année"
          >
            {[...new Set(availablePeriods.map(p => p.annee))]
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(year => (
                <button
                  key={year}
                  type="button"
                  onClick={() => setFilters({ ...filters, annee: year.toString() })}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    filters.annee?.toString() === year.toString() 
                      ? 'bg-emerald-500 text-[var(--text-main)] shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                  }`}
                >
                  {year}
                </button>
              ))}
          </div>
        </div>

        {/* SECTION CARTES ALIGNÉES */}
        <div className="shrink-0 grid grid-cols-12 gap-4 mb-2 items-stretch">
          
          {/* CARTE TOTAL PATRIMOINE */}
          <div className="col-span-12 md:col-span-2 h-full pb-2">
            <div 
              {...(patrimoineActif ? { role: 'button', tabIndex: 0, title: 'Voir les placements et les crédits', onClick: ouvrirPatrimoine, onKeyDown: (e) => { if (e.key === 'Enter') ouvrirPatrimoine?.(); } } : {})}
              className={`h-full rounded-[var(--radius)] p-3 text-[var(--text-main)] shadow-xl flex flex-col justify-between transition-all duration-500 relative overflow-hidden ${patrimoineActif ? 'cursor-pointer hover:brightness-110' : ''}`}
              style={{ 
                background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
                border: `1px solid ${(userTheme.color_patrimoine || '#37b58f')}33`,
                boxShadow: `0 8px 20px -5px rgba(0, 0, 0, 0.3)`
              }}
            >
              <div className="flex flex-col gap-0.5 mb-2">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] text-white/50 uppercase font-black tracking-tighter italic">
                    {filters.profil}
                  </span>
                  <div className="flex h-1.5 w-1.5 rounded-full bg-white/80 shadow-[0_0_5px_color-mix(in_srgb,var(--text-main)_50%,transparent)]" />
                </div>
                <p className="text-[10px] text-white/90 font-black truncate">
                  {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
                </p>
              </div>

              <div className="mt-auto">
                <p className="text-white/60 text-[8px] font-black uppercase tracking-widest mb-0.5">{patrimoineActif ? 'Total net' : 'Total'}</p>
                <h2 className="text-xl font-black tracking-tighter leading-none text-white truncate">
                  {(patrimoineActif ? valeurNette : soldeGlobal).toLocaleString('fr-FR', { minimumFractionDigits: patrimoineActif ? 0 : 2, maximumFractionDigits: patrimoineActif ? 0 : 2 })} €
                </h2>
                {patrimoineActif && (
                  <p className="text-[9px] font-bold text-white/75 mt-1 truncate">
                    comptes + placements − crédits
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* COMPTES BANCAIRES */}
          <div className="col-span-12 md:col-span-10 min-w-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={soldesTries.map(c => c.compte)} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-3 h-full pb-2 overflow-x-auto md:overflow-x-visible no-scrollbar cursor-grab active:cursor-grabbing">
                  {soldesTries.map(c => (
                    <div key={c.compte} className="min-w-[160px] md:min-w-0 md:flex-1 h-full">
                      <SortableAccountCard c={c} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* GRILLE CENTRALE (3 COLONNES) */}
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 mb-4 h-auto lg:h-full">
          
          {/* --- COLONNE 1 : LE JOURNAL DU MOIS --- */}
          <div className="col-span-12 lg:col-span-4 flex flex-col h-[400px] lg:h-full min-h-0 gap-4">
            <div className="flex flex-col flex-1 min-h-0 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 shadow-2xl backdrop-blur-[var(--glass-blur)] overflow-hidden">
              
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Même structure et mêmes marges que l'en-tête du Bilan annuel, pour rester alignés côte à côte. */}
                <div className="p-4 lg:p-3 xl:p-2.5 shrink-0 border-b border-white/10 flex items-center justify-between gap-2">
                  <div className="flex flex-col shrink-0">
                    <h3 className="text-2xl lg:text-lg xl:text-2xl leading-8 font-black bg-white bg-clip-text text-transparent tracking-tight uppercase whitespace-nowrap">
                      Flux mensuel
                    </h3>
                    <div className="mt-1.5 h-3 flex items-center gap-2.5">
                      <div className="h-1 w-10 bg-indigo-500 rounded-full shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_50%,transparent)] shrink-0" />
                      <span className="text-secondary-400 text-[9px] leading-none font-black tracking-[0.2em] uppercase whitespace-nowrap">
                        {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
                      </span>
                    </div>
                  </div>

                  <div onWheel={handleWheelTabActive} className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-0 xl:gap-1 min-[1500px]:gap-1.5">
                    {Object.keys(TAB_CONFIG).map((tab) => {
                      const config = TAB_CONFIG[tab];
                      const IconComponent = config.icon;
                      const isActive = tabActive === tab;

                      return (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setTabActive(tab);
                            setSearchTerm('');
                          }}
                          title={config.label}
                          className={`w-5 h-6 xl:w-7 xl:h-7 min-[1500px]:w-8 min-[1500px]:h-8 shrink-0 flex items-center justify-center rounded-lg transition-all duration-300 cursor-pointer ${config.className} ${
                            isActive 
                              ? 'bg-[var(--glass-bg)] text-[var(--text-main)] shadow-md border border-white/5' 
                              : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                          }`}
                        >
                          <IconComponent 
                            size={16} 
                            strokeWidth={isActive ? 2.5 : 2} 
                            className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${isActive ? 'opacity-100' : 'opacity-60'}`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {(() => {
                  const rawTransactions = [...(financeData?.journal?.[tabActive === 'Catégories' ? 'depenses' : tabActive] || [])];
                  const filteredTransactions = rawTransactions.filter(t => {
                    if (!searchTerm.trim()) return true;
                    const term = searchTerm.toLowerCase().trim();
                    const nom = (t.nom || t.libelle || t.description || '').toLowerCase();
                    const categorie = (t.categorie || t.category || '').toLowerCase();
                    const montant = (t.montant || '').toString();
                    const dateStr = t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '';
                    const rawDate = (t.date || '').toLowerCase();

                    return nom.includes(term) || categorie.includes(term) || montant.includes(term) || dateStr.includes(term) || rawDate.includes(term);
                  });

                  const currentTotal = filteredTransactions.reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);

                  return (
                    <>
                      <div className="px-4 pt-3 shrink-0">
                        {tabActive !== 'Catégories' && tabActive !== 'Variations' && tabActive !== 'flash' && tabActive !== 'abonnements' && (
                          <div className="flex justify-between items-center px-1 pb-2 border-b border-white/[0.02] gap-3">
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[var(--text-main)]/40 text-[10px] uppercase font-black tracking-wider">
                                Total {tabActive}
                              </span>
                              <span className="flex items-center justify-center bg-[var(--glass-bg)] border border-white/5 px-2 py-0.5 rounded-full text-[9px] font-bold text-[var(--text-main)] backdrop-blur-[var(--glass-blur)] transition-all">
                                {filteredTransactions.length} transaction{filteredTransactions.length > 1 ? 's' : ''}
                              </span>

                              <div className="relative w-36 ml-1">
                                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                                <input
                                  type="text"
                                  placeholder="Rechercher..."
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-6 py-1 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500/50 transition-all"
                                />
                                {searchTerm && (
                                  <button 
                                    type="button"
                                    onClick={() => setSearchTerm('')} 
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <X size={10} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end shrink-0">
                              <span 
                                className="text-2xl font-black leading-none transition-colors"
                                style={{ 
                                  color: 
                                    tabActive === 'revenus' ? (userTheme.color_revenus || '#10b981') : 
                                    tabActive === 'depenses' ? (userTheme.color_depenses || '#f43f5e') : 
                                    'var(--primary)'
                                }}
                              >
                                <span className="text-sm mr-0.5 opacity-70">
                                  {tabActive === 'revenus' ? '+' : tabActive === 'depenses' ? '-' : ''}
                                </span>
                                {Math.abs(currentTotal).toLocaleString()}
                                <span className="text-xs ml-1 opacity-50">€</span>
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
                        {tabActive === 'Catégories' && (
                          <div className="flex flex-col h-full min-h-0 min-[2000px]:hidden">
                            <h3 className="text-[var(--text-main)]/30 font-black text-[10px] uppercase tracking-[0.2em] mb-4 shrink-0"> 
                              Analyse par Catégorie 
                            </h3>
                            <div className="flex-1 min-h-0 w-full">
                              <AnalyseCategories
                                statsCategories={statsCategories}
                                hiddenCategories={hiddenCategories}
                                toggleCategory={toggleCategory}
                                budgetGauges={budgetGauges}
                              />
                            </div>
                          </div>
                        )}

                        {tabActive === 'Variations' && (
                          <VariationsView 
                            statsCategories={statsCategories} 
                            userTheme={userTheme}
                            prevMonthLabel={financeData?.periodeComparee?.mois || "M-1"}
                          />
                        )}

                        {tabActive === 'flash' && (
                          <FlashInsightsView 
                            statsCategories={statsCategories} 
                            transactions={[
                              ...(financeData?.journal?.depenses || []),
                              ...(financeData?.journal?.revenus || [])
                            ]} 
                            user={user}
                            filters={filters}
                          />
                        )}

                        {tabActive === 'abonnements' && (
                          <VueAbonnements transactions={toutesLesTransactions} comptesDuProfil={comptesDuProfil} profil={filters.profil} user={user} rechargerPrevisions={loadPrevisions} />
                        )}

                        {tabActive !== 'Variations' && tabActive !== 'flash' && tabActive !== 'abonnements' && (
                          <div className={`${tabActive === 'Catégories' ? 'hidden min-[2000px]:block' : 'block'} space-y-1.5 h-full`}>
                            {filteredTransactions.length > 0 ? (
                              filteredTransactions
                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                .map((t, i) => (
                                  <TransactionCard 
                                    key={t.id || i} 
                                    t={t} 
                                    color={
                                      tabActive === 'revenus' ? (userTheme?.color_revenus || '#10b981') : 
                                      tabActive === 'depenses' ? (userTheme?.color_depenses || '#f43f5e') : 
                                      'var(--primary)'
                                    }
                                    bg={
                                      tabActive === 'revenus' ? `${userTheme?.color_revenus || '#10b981'}15` : 
                                      tabActive === 'depenses' ? `${userTheme?.color_depenses || '#f43f5e'}15` : 
                                      'color-mix(in srgb, var(--primary) 10%, transparent)'
                                    }
                                  />
                                ))
                            ) : (
                              <div className="flex flex-col items-center justify-center py-8 text-white/30 text-xs font-bold uppercase tracking-wider">
                                <span>Aucune transaction trouvée</span>
                                {searchTerm && <span className="text-[10px] font-normal normal-case mt-1 opacity-60">pour « {searchTerm} »</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* GRAPHE CATÉGORIES (SEULEMENT > 2000px) */}
              <div className="hidden min-[2000px]:flex basis-[350px] max-h-[350px] bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/5 p-4 my-4 flex-col overflow-hidden shrink-0 mx-4">
                <h3 className="text-[var(--text-main)]/30 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                  Analyse par Catégorie
                </h3>
                <div className="flex-1 min-h-0">
                  <AnalyseCategories
                    statsCategories={statsCategories}
                    hiddenCategories={hiddenCategories}
                    toggleCategory={toggleCategory}
                    budgetGauges={budgetGauges}
                  />
                </div>
              </div>

              {/* JILLES D'OBJECTIFS BUDGÉTAIRES */}
              <div className="shrink-0 w-full p-4 bg-white/[0.02] border-t border-white/10 mt-auto flex flex-col gap-3 relative group/carousel">
                <div className="flex items-center justify-between">
                  <h3 className="text-[var(--text-main)]/30 font-black text-[9px] uppercase tracking-[0.2em]">
                    Objectifs Budgétaires
                  </h3>
                </div>

                {budgetGauges.length > 0 ? (
                  <div className="relative w-full">
                    {totalDots > 1 && activeIndex > 0 && (
                      <button 
                        type="button"
                        onClick={() => navigateCarousel('prev')}
                        className="absolute left-[-12px] top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-black/60 hover:bg-[var(--primary)] text-white border border-white/10 rounded-full flex items-center justify-center backdrop-blur-[var(--glass-blur)] transition-all active:scale-90 shadow-lg cursor-pointer"
                      >
                        <ChevronLeft size={14} strokeWidth={3} />
                      </button>
                    )}

                    {totalDots > 1 && activeIndex < totalDots - 1 && (
                      <button 
                        type="button"
                        onClick={() => navigateCarousel('next')}
                        className="absolute right-[-12px] top-1/2 -translate-y-1/2 z-10 w-7 h-7 bg-black/60 hover:bg-[var(--primary)] text-white border border-white/10 rounded-full flex items-center justify-center backdrop-blur-[var(--glass-blur)] transition-all active:scale-90 shadow-lg cursor-pointer"
                      >
                        <ChevronRight size={14} strokeWidth={3} />
                      </button>
                    )}

                    <div 
                      ref={carouselRef}
                      onScroll={handleScroll}
                      className="flex flex-row gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    > 
                      {budgetGauges.map((bg, i) => {
                        const radius = 30;
                        const circumference = Math.PI * radius;
                        const strokeDashoffset = circumference - (Math.min(bg.pourcentage, 100) / 100) * circumference;

                        return (
                          <div key={i} className="flex flex-col items-center min-w-[80px] max-w-[80px] shrink-0 snap-start bg-white/[0.01] border border-white/[0.03] p-2 rounded-xl">
                            <div className="relative w-20 h-10">
                              <svg width="80" height="40" viewBox="0 0 80 40" className="absolute top-0 left-1/2 -translate-x-1/2">
                                <path d="M 10,40 A 30,30 0 0 1 70,40" fill="none" stroke="currentColor" strokeWidth="6" className="text-[var(--text-main)]/5" />
                                <path
                                  d="M 10,40 A 30,30 0 0 1 70,40"
                                  fill="none"
                                  stroke={bg.depasse ? '#fb7185' : '#34d399'}
                                  strokeWidth="6"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={strokeDashoffset}
                                  strokeLinecap="round"
                                  className="transition-all duration-1000 ease-out"
                                />
                              </svg>

                              <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                                <CategoryIcon name={bg.nom} size={13} />
                              </div>

                              <div className="absolute -bottom-4 left-1 right-1 flex justify-between">
                                <span className="text-[7px] font-black text-[var(--text-main)]/90">{Math.round(bg.reel)}€</span>
                                <span className="text-[7px] font-black text-[var(--text-main)]/20">{bg.limite}€</span>
                              </div>
                            </div>

                            <div className="text-center mt-6 w-full">
                              <p className="text-[8.5px] font-black text-[var(--text-main)]/70 uppercase tracking-tight truncate w-full leading-none">
                                {bg.nom}
                              </p>
                              <p className={`text-[10px] font-black mt-0.5 ${bg.depasse ? 'text-rose-400' : 'text-[#34d399]'}`}>
                                {bg.pourcentage}%
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalDots > 1 && (
                      <div className="flex flex-col items-center gap-1.5 mt-3 select-none">
                        <div className="flex justify-center items-center gap-1.5">
                          {Array.from({ length: totalDots }).map((_, dotIndex) => (
                            <button
                              key={dotIndex}
                              type="button"
                              onClick={() => scrollToPage(dotIndex)}
                              className={`h-1 rounded-full transition-all duration-300 cursor-pointer ${
                                activeIndex === dotIndex ? 'w-4 bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]' : 'w-1 bg-white/20 hover:bg-white/40'
                              }`}
                              aria-label={`Aller à la page ${dotIndex + 1}`}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] font-black uppercase text-[var(--text-main)]/30 tracking-widest tabular-nums">
                          {activeIndex + 1} <span className="opacity-50">/</span> {totalDots}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-6 px-4 flex items-center justify-between bg-white/[0.01] border border-dashed border-white/10 rounded-2xl mt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg opacity-30">🎯</span>
                      <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest leading-tight">
                        Aucune limite de budget définie ce mois-ci <br/> pour vos catégories.
                      </p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('gerer')}
                      className="px-3 py-1.5 bg-[var(--glass-bg)] hover:bg-white/[0.06] hover:border-white/10 rounded-lg text-[var(--secondary)] text-[8px] font-black uppercase tracking-widest transition-all duration-200 border border-white/5 active:scale-95 cursor-pointer"
                    >
                      Limites →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- COLONNE 2 : LE BILAN ANNUEL --- */}
          <div className="col-span-12 lg:col-span-4 flex flex-col h-[500px] lg:h-full min-h-0">
            <div className="bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-[var(--glass-blur)]">
              
              <div className="p-4 lg:p-3 xl:p-2.5 shrink-0 border-b border-white/10 flex items-center justify-between gap-2 select-none">
                <div className="flex flex-col shrink-0">
                  <div className="h-8 flex items-baseline gap-3 lg:gap-2 xl:gap-3">
                    <h3 className="text-2xl lg:text-lg xl:text-2xl leading-8 font-black bg-white bg-clip-text text-transparent tracking-tight uppercase whitespace-nowrap">
                      Bilan Annuel
                    </h3>
                    <div className="border-l border-white/10 pl-3 lg:pl-2 xl:pl-3 flex flex-col">
                      <span className="text-emerald-500 text-[10px] font-black tracking-[0.2em]">
                        {filters.annee}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-1.5 h-3 flex items-center gap-2.5">
                    <div className="h-1 w-10 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)] shrink-0" />
                    <div className="flex items-center gap-1 leading-none whitespace-nowrap">
                      <span className="text-[9px] font-bold text-[var(--text-main)]/40 uppercase tracking-wider">
                        Solde 1er janvier :
                      </span>
                      <span className="text-[12px] font-black tracking-tight" style={{ color: userTheme.color_patrimoine }}>
                        {soldePremierJanvier.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€
                      </span>
                    </div>
                  </div>
                </div>

                <div onWheel={handleWheelAnnualTab} className="flex bg-black/40 p-1 rounded-xl border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('list')}
                    className={`px-3 lg:px-1 xl:px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${annualTab === 'list' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30 hover:text-white/60'}`}
                  >
                    <List size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('chart')}
                    title="Répartition des dépenses"
                    className={`px-3 lg:px-1 xl:px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${annualTab === 'chart' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30 hover:text-white/60'}`}
                  >
                    <PieChartIcon size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('calendar')}
                    className={`px-3 lg:px-1 xl:px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${annualTab === 'calendar' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30 hover:text-white/60'}`}
                    title="Activité des dépenses"
                  >
                    <CalendarDays size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('wrapped')}
                    className={`px-3 lg:px-1 xl:px-3 py-1.5 rounded-lg transition-all duration-300 cursor-pointer ${annualTab === 'wrapped' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30 hover:text-white/60'}`}
                    title="Rétrospective annuelle (Wrapped)"
                  >
                    <Sparkles size={14} />
                  </button>
                </div>
              </div>

              {/* CONTENU DE L'ONGLET ANNUEL */}
              <div className="flex-1 overflow-hidden p-2 min-h-0 flex flex-col">
                {annualTab === 'list' && (
                  <div className="flex flex-col h-full w-full overflow-hidden">
                    <div className="grid grid-cols-12 px-6 mb-1.5 shrink-0 select-none">
                      <span className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Mois</span>
                      <span className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Revenus</span>
                      <span className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Dépenses</span>
                      <span className="col-span-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30 text-center">Épargne</span>
                      <span className="col-span-3 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30 text-right">Cumul</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-1 min-h-0 h-full w-full overflow-hidden select-none">
                      {recapAnnuelStats.map((m, i) => {
                        const estMoisEnCours = m.isMoisEnCours;
                        const estFutur = m.isFutur;
                        const aDesPrevisions = m.hasPrevisions;

                        return (
                          <div 
                            key={i} 
                            className={`@container grid grid-cols-12 items-center px-4 rounded-xl border transition-all duration-300 group min-h-0 ${
                              estMoisEnCours
                                ? `${aDesPrevisions ? 'flex-[1.45] py-1.5' : 'flex-1 py-0.5'} bg-white/[0.03] border-white/20 shadow-md`
                                : estFutur
                                  ? 'flex-1 bg-white/[0.01] hover:bg-white/[0.04] border-white/5 border-dashed py-0.5 opacity-65 hover:opacity-100'
                                  : 'flex-1 bg-[var(--glass-bg)] hover:bg-white/[0.06] border-white/5 py-0.5'
                            }`}
                          >
                            <div className="col-span-3 flex items-center gap-2 min-h-0">
                              <span className={`font-black uppercase tracking-tight transition-colors ${
                                estMoisEnCours ? 'text-white font-extrabold' : 'text-[var(--text-main)]/50 group-hover:text-[var(--text-main)]/90'
                              } ${isCompact ? 'text-xs' : 'text-[11px]'}`}>
                                {m.nom}
                              </span>

                              {estFutur && aDesPrevisions && (
                                <span 
                                  className="text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded-sm tracking-wider shrink-0 select-none border"
                                  style={{
                                    backgroundColor: `${userTheme.color_patrimoine || '#37b58f'}1a`,
                                    borderColor: `${userTheme.color_patrimoine || '#37b58f'}33`,
                                    color: userTheme.color_patrimoine || '#37b58f'
                                  }}
                                >
                                  Prévu
                                </span>
                              )}
                            </div>

                            <div className="col-span-2 flex flex-col justify-center min-h-0">
                              {estMoisEnCours ? (
                                <>
                                  <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_revenus}e6`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                    {m.revReel > 0 ? `${m.revReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '0,00€'}
                                  </span>
                                  {aDesPrevisions && m.revPrevu !== null && (
                                    <span className="text-[9.5px] font-bold tracking-tight leading-none mt-1" style={{ color: `${userTheme.color_revenus}99` }}>
                                      prévu {m.revPrevu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                                    </span>
                                  )}
                                </>
                              ) : estFutur ? (
                                <div className="flex flex-col justify-center">
                                  <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_revenus}b3`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                    {aDesPrevisions && m.revPrevu !== null && m.revPrevu > 0 ? `${m.revPrevu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                  </span>
                                  {aDesPrevisions && m.revPrevu !== null && m.revPrevu > 0 && (
                                    <span className="text-[8px] font-bold tracking-tight leading-none mt-0.5" style={{ color: `${userTheme.color_revenus}66` }}>
                                      prévu
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_revenus}e6`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                  {m.revReel > 0 ? `${m.revReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                </span>
                              )}
                            </div>

                            <div className="col-span-2 flex flex-col justify-center min-h-0">
                              {estMoisEnCours ? (
                                <>
                                  <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_depenses}e6`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                    {m.depReel > 0 ? `-${m.depReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '0,00€'}
                                  </span>
                                  {aDesPrevisions && m.depPrevu !== null && (
                                    <span className="text-[9.5px] font-bold tracking-tight leading-none mt-1" style={{ color: `${userTheme.color_depenses}99` }}>
                                      prévu -{m.depPrevu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                                    </span>
                                  )}
                                </>
                              ) : estFutur ? (
                                <div className="flex flex-col justify-center">
                                  <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_depenses}b3`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                    {aDesPrevisions && m.depPrevu !== null && m.depPrevu > 0 ? `-${m.depPrevu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                  </span>
                                  {aDesPrevisions && m.depPrevu !== null && m.depPrevu > 0 && (
                                    <span className="text-[8px] font-bold tracking-tight leading-none mt-0.5" style={{ color: `${userTheme.color_depenses}66` }}>
                                      prévu
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_depenses}e6`, fontSize: isCompact ? 'min(1.95vh, 2.7cqw)' : 'min(1.5vh, 2.7cqw)' }}>
                                  {m.depReel > 0 ? `-${m.depReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : <span className="text-[var(--text-main)]/10">—</span>}
                                </span>
                              )}
                            </div>

                            <div className="col-span-2 flex flex-col items-center justify-center min-h-0">
                              {estMoisEnCours ? (
                                <>
                                  <span 
                                    className="inline-block rounded-full font-black text-center leading-none" 
                                    style={{ 
                                      backgroundColor: m.epargneReel >= 0 ? `${userTheme.color_epargne}1a` : `${userTheme.color_depenses}1a`, 
                                      color: m.epargneReel >= 0 ? userTheme.color_epargne : userTheme.color_depenses,
                                      fontSize: isCompact ? 'min(1.35vh, 2.2cqw)' : 'min(1.1vh, 2.2cqw)',
                                      padding: isCompact ? '0.2vh 0.7vw' : '0.15vh 0.5vw'
                                    }}
                                  >
                                    {m.epargneReel > 0 ? '+' : ''}{m.epargneReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                                  </span>
                                  {aDesPrevisions && m.epargnePrevu !== null && (
                                    <span className="text-[9px] font-mono leading-none mt-1 font-bold" style={{ color: `${(m.epargnePrevu >= 0 ? userTheme.color_epargne : userTheme.color_depenses)}99` }}>
                                      prévu {m.epargnePrevu > 0 ? '+' : ''}{m.epargnePrevu.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                                    </span>
                                  )}
                                </>
                              ) : estFutur ? (
                                <span 
                                  className="inline-block rounded-full font-black text-center leading-none border border-dashed" 
                                  style={{ 
                                    backgroundColor: m.epargnePrevu >= 0 ? `${userTheme.color_epargne}0d` : `${userTheme.color_depenses}0d`, 
                                    color: m.epargnePrevu >= 0 ? `${userTheme.color_epargne}b3` : `${userTheme.color_depenses}b3`,
                                    borderColor: m.epargnePrevu >= 0 ? `${userTheme.color_epargne}33` : `${userTheme.color_depenses}33`,
                                    fontSize: isCompact ? 'min(1.35vh, 2.2cqw)' : 'min(1.1vh, 2.2cqw)',
                                    padding: isCompact ? '0.2vh 0.7vw' : '0.15vh 0.5vw'
                                  }}
                                >
                                  {aDesPrevisions && m.epargnePrevu !== null ? `${m.epargnePrevu > 0 ? '+' : ''}${m.epargnePrevu.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                </span>
                              ) : (
                                <span 
                                  className="inline-block rounded-full font-black text-center leading-none" 
                                  style={{ 
                                    backgroundColor: m.epargneReel >= 0 ? `${userTheme.color_epargne}1a` : `${userTheme.color_depenses}1a`, 
                                    color: m.epargneReel >= 0 ? userTheme.color_epargne : userTheme.color_depenses,
                                    fontSize: isCompact ? 'min(1.35vh, 2.2cqw)' : 'min(1.1vh, 2.2cqw)',
                                    padding: isCompact ? '0.2vh 0.7vw' : '0.15vh 0.5vw'
                                  }}
                                >
                                  {m.hasRealData ? `${m.epargneReel > 0 ? '+' : ''}${m.epargneReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                </span>
                              )}
                            </div>

                            <div className="col-span-3 text-right flex flex-col justify-center items-end min-h-0">
                              {estMoisEnCours ? (
                                <>
                                  <span className="font-black tracking-tighter leading-none" style={{ color: userTheme.color_patrimoine, fontSize: isCompact ? 'min(2.15vh, 3.4cqw)' : 'min(1.7vh, 3.4cqw)' }}>
                                    {m.soldeTotalReel !== null ? `${m.soldeTotalReel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                  </span>
                                  {aDesPrevisions && m.soldeProjete !== null && (
                                    <span className="text-[10px] font-black tracking-tight leading-none mt-1" style={{ color: `${userTheme.color_patrimoine}b3` }} title="Solde projeté fin de mois">
                                      prévu {m.soldeProjete.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                                    </span>
                                  )}
                                </>
                              ) : estFutur ? (
                                <div className="flex flex-col justify-center items-end">
                                  <span className="font-black tracking-tighter leading-none" style={{ color: `${userTheme.color_patrimoine}cc`, fontSize: isCompact ? 'min(2.15vh, 3.4cqw)' : 'min(1.7vh, 3.4cqw)' }}>
                                    {aDesPrevisions && m.soldeProjete !== null ? `${m.soldeProjete.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : '—'}
                                  </span>
                                  {aDesPrevisions && m.soldeProjete !== null && (
                                    <span className="text-[8px] font-bold tracking-tight leading-none mt-0.5" style={{ color: `${userTheme.color_patrimoine}66` }}>
                                      estimé
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="font-black tracking-tighter leading-none" style={{ color: userTheme.color_patrimoine, fontSize: isCompact ? 'min(2.15vh, 3.4cqw)' : 'min(1.7vh, 3.4cqw)' }}>
                                  {m.soldeTotal !== null ? `${m.soldeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` : <span className="text-[var(--text-main)]/10">—</span>}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {annualTab === 'chart' && (
                  <div className="h-full w-full animate-in fade-in duration-500">
                    <RepartitionDepenses data={statsAnnuellesCategories} currentYear={filters.annee} comptes={comptes} filters={filters} toutesLesTransactions={toutesLesTransactions} />
                  </div>
                )}

                {annualTab === 'calendar' && (
                  <CalendarSection 
                    toutesLesTransactions={toutesLesTransactions}
                    comptesDuProfil={comptesDuProfil}
                    filters={filters}
                    moisListe={moisListe}
                  />
                )}

                {annualTab === 'wrapped' && (
                  <WrappedSection 
                    toutesLesTransactions={toutesLesTransactions}
                    comptesDuProfil={comptesDuProfil}
                    filters={filters}
                    moisListe={moisListe}
                    user={user}
                    objectifAnnuelGlobal={objectifAnnuelGlobal}
                    epargneReelleCumulee={epargneReelleCumulee}
                  />
                )}
              </div>
            </div>

            {/* SYNTHÈSE TOTAUX (BAS DE COLONNE 2) */}
            <div className="mt-3 p-3 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] backdrop-blur-[var(--glass-blur)] shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Totaux</span>
                  
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTotalTab('annuel')}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !estPeriode ? 'bg-[var(--glass-bg)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                      }`}
                    >
                      Annuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalTab('periode')}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        estPeriode ? 'bg-[var(--glass-bg)] text-[var(--text-main)] shadow-md' : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                      }`}
                    >
                      Période
                    </button>
                  </div>

                  {estPeriode && (
                    <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-24 text-[9px]">
                        <CustomSelect value={moisDebut} onChange={(val) => setMoisDebut(val)} icon={Calendar} options={moisListe} />
                      </div>
                      <span className="text-[8px] font-black text-[var(--text-main)]/20 uppercase">à</span>
                      <div className="w-24 text-[9px]">
                        <CustomSelect value={moisFin} onChange={(val) => setMoisFin(val)} icon={Calendar} options={moisListe} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-[var(--text-main)]/20 uppercase mb-0.5 truncate">{estPeriode ? 'Revenus Période' : 'Total Revenus'}</p>
                  <p className="text-base font-black tracking-tighter leading-none" style={{ color: userTheme.color_revenus }}>
                    {donneesAffichees.revenus.toLocaleString('fr-FR')}€
                  </p>
                </div>

                <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                  <p className="text-[7px] font-black text-[var(--text-main)]/20 uppercase mb-0.5 truncate">{estPeriode ? 'Dépenses Période' : 'Total Dépenses'}</p>
                  <p className="text-base font-black tracking-tighter leading-none" style={{ color: userTheme.color_depenses }}>
                    -{donneesAffichees.depenses.toLocaleString('fr-FR')}€
                  </p>
                </div>

                <div className="relative overflow-hidden bg-[var(--glass-bg)] p-2 rounded-xl border border-white/10 group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  <p className="text-[7px] font-black text-[var(--text-main)]/20 uppercase mb-0.5 italic truncate">{estPeriode ? 'Épargne Période' : 'Net Épargné'}</p>
                  <p className="text-base font-black tracking-tighter leading-none" style={{ color: userTheme.color_epargne }}>
                    {donneesAffichees.epargne.toLocaleString('fr-FR')}€
                  </p>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-[var(--text-main)]/20 leading-none">
                  <span>Consommé</span>
                  <span className="text-emerald-400 font-black">Épargné ({donneesAffichees.tauxEffort}%)</span>
                </div>
                <div className="h-1 w-full bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                  <div className="h-full bg-rose-500/50 transition-all duration-500" style={{ width: `${100 - donneesAffichees.tauxEffort}%` }} />
                  <div className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_#10b981]" style={{ width: `${donneesAffichees.tauxEffort}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* --- COLONNE 3 : GRAPHES & GESTION ÉPARGNE & PROJETS --- */}
          <div className="col-span-12 lg:col-span-4 flex flex-col h-[700px] lg:h-full min-h-0">
            <div onWheel={handleWheelRightTab} className="flex bg-slate-900/50 p-1.5 rounded-[var(--radius)] mb-2 border border-white/5 backdrop-blur-[var(--glass-blur)] w-fit self-center shadow-inner select-none">
              <button 
                type="button"
                onClick={() => setActiveRightTab('graphs')}
                className={`px-3.5 py-2 whitespace-nowrap rounded-[calc(var(--radius)*0.75)] text-[10px] font-black uppercase tracking-[0.06em] transition-all duration-300 cursor-pointer ${
                  activeRightTab === 'graphs' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                }`}
              >
                Analytique
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('epargneProjets')}
                className={`px-3.5 py-2 whitespace-nowrap rounded-[calc(var(--radius)*0.75)] text-[10px] font-black uppercase tracking-[0.06em] transition-all duration-300 cursor-pointer ${
                  activeRightTab === 'epargneProjets' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                }`}
              >
                Épargne & Projets
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('valeurNette')}
                className={`px-3.5 py-2 whitespace-nowrap rounded-[calc(var(--radius)*0.75)] text-[10px] font-black uppercase tracking-[0.06em] transition-all duration-300 cursor-pointer ${
                  activeRightTab === 'valeurNette' ? 'bg-white text-slate-900 shadow-xl scale-105' : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                }`}
              >
                Placements & crédits
              </button>
            </div>

            {activeRightTab === 'valeurNette' ? (
              <ValeurNetteResume patrimoine={patrimoine} profil={filters.profil} recapAnnuelStats={recapAnnuelStats} soldeGlobal={soldeGlobal}
                valeurNette={valeurNette} actif={patrimoineActif} ouvrirPatrimoine={ouvrirPatrimoine} couleur={userTheme.color_patrimoine || '#37b58f'} />
            ) : activeRightTab === 'graphs' ? (
              <div className="flex-1 flex flex-col min-h-0 gap-3">
                {/* JAUGE D'OBJECTIF D'ÉPARGNE */}
                <div className="bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-3.5 shadow-2xl backdrop-blur-[var(--glass-blur)] shrink-0 select-none">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center border shrink-0"
                        style={{ 
                          backgroundColor: `${jaugeColor}1a`, 
                          borderColor: `${jaugeColor}33`,
                          boxShadow: `0 0 12px ${jaugeColor}20` 
                        }}
                      >
                        <Trophy size={16} style={{ color: jaugeColor }} />
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-[var(--text-main)]/40 text-[9px] font-black uppercase tracking-[0.1em] leading-tight">
                          Objectif d'épargne {filters.annee}
                        </h4>
                        
                        {objectifAnnuelGlobal > 0 ? (
                          <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[var(--text-main)] font-black text-base md:text-lg leading-tight">
                              {Math.floor(epargneReelleCumulee).toLocaleString('fr-FR')} €
                            </span>
                            {epargneProjeteeTotale !== epargneReelleCumulee && (
                              <span className="text-xs font-black tracking-tight" style={{ color: jaugeColor }} title="Total projeté avec prévisions">
                                (prévu {Math.floor(epargneProjeteeTotale).toLocaleString('fr-FR')} €)
                              </span>
                            )}
                            <span className="text-[var(--text-main)]/30 text-[10px] font-bold">
                              / {objectifAnnuelGlobal.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                        ) : (
                          <p className="text-[var(--text-main)]/20 font-black text-xs uppercase mt-1">Non défini</p>
                        )}
                      </div>
                    </div>

                    {objectifAnnuelGlobal > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div 
                          className="text-[10px] font-black px-2 py-1 rounded-lg border"
                          style={{ backgroundColor: `${jaugeColor}1a`, borderColor: `${jaugeColor}40`, color: jaugeColor }}
                        >
                          {pctReel}%
                        </div>
                        {pctProjete !== pctReel && (
                          <div 
                            className="text-[10px] font-black px-2 py-1 rounded-lg border flex items-center gap-1 shadow-sm"
                            style={{ backgroundColor: `${jaugeColor}20`, borderColor: `${jaugeColor}60`, color: jaugeColor }}
                          >
                            <span className="text-[8px] opacity-70">➔</span>
                            <span>{pctProjete}% prévu</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {objectifAnnuelGlobal > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="relative h-2.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        {pctReel > 0 && (
                          <div 
                            className="absolute left-0 top-0 h-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${Math.min(pctReel, 100)}%`,
                              background: `linear-gradient(90deg, ${jaugeColor}90, ${jaugeColor})`,
                              boxShadow: `0 0 12px ${jaugeColor}50`
                            }}
                          />
                        )}
                        {pctProjete > pctReel && (
                          <div 
                            className="absolute top-0 h-full transition-all duration-1000 ease-out"
                            style={{ 
                              left: `${Math.min(pctReel, 100)}%`,
                              width: `${Math.max(0, Math.min(pctProjete - pctReel, 100 - pctReel))}%`,
                              borderRight: `1px solid ${jaugeColor}`,
                              background: `repeating-linear-gradient(-45deg, ${jaugeColor}cc 0, ${jaugeColor}cc 3px, transparent 3px, transparent 7px)`,
                              boxShadow: `0 0 10px ${jaugeColor}30`
                            }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[7.5px] font-black uppercase text-white/30 tracking-wider px-0.5">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: jaugeColor }} />
                            Réel actuel ({pctReel}%)
                          </span>
                          {pctProjete > pctReel && (
                            <span className="flex items-center gap-1" style={{ color: jaugeColor }}>
                              <span className="w-2 h-1 border border-dashed rounded-sm" style={{ borderColor: jaugeColor }} />
                              Relais prévisions (+{pctProjete - pctReel}%)
                            </span>
                          )}
                        </div>
                        <span>Objectif : 100%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* GRAPHIQUE 1 : TENDANCES GLOBALES */}
                <div className="flex-1 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10 p-4 flex flex-col shadow-2xl backdrop-blur-[var(--glass-blur)] min-h-0">
                  <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                    <h3 className="text-[var(--text-main)] font-bold text-sm">{vueAnalytique === 'annees' ? 'Récap par année' : 'Évolution Patrimoine'}</h3>
                    {selecteurVueAnalytique}
                  </div>

                  {vueAnalytique === 'annees' ? (
                    <RecapAnnees comptes={comptes} transactions={toutesLesTransactions} profil={filters.profil} userTheme={userTheme} />
                  ) : (
                  <>
                  <div className="flex-1 w-full min-h-[200px] min-w-0 pb-2">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={recapAnnuelStats} margin={{ top: 10, right: 0, left: -30, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorRevProj" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                          </linearGradient>

                          <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorDepProj" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.15}/>
                            <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                          </linearGradient>

                          <linearGradient id="colorEp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorEpProj" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-main) 3%, transparent)" vertical={false} />
                        <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{ fill: 'color-mix(in srgb, var(--text-main) 30%, transparent)', fontSize: 11 }} dy={10} tickFormatter={(v) => v ? `${v.substring(0, 3)}.` : ''} />
                        <YAxis tick={{ fill: 'color-mix(in srgb, var(--text-main) 50%, transparent)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(val) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k€` : `${val}€`} />
                        
                        {/* 🟢 TOOLTIP INTELLIGENT SANS DOUBLONS INUTILES */}
                        <Tooltip 
                          cursor={{ stroke: 'color-mix(in srgb, var(--text-main) 10%, transparent)', strokeWidth: 2 }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;

                            const fEuro = (v) => new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', currency: 'EUR', minimumFractionDigits: 2 
                            }).format(v);

                            const getEntry = (key) => payload.find(p => p.dataKey === key);

                            const metrics = [
                              { key: 'revenus', label: 'Revenus', color: userTheme.color_revenus || '#10b981' },
                              { key: 'depenses', label: 'Dépenses', color: userTheme.color_depenses || '#f43f5e' },
                              { key: 'epargne', label: 'Épargne', color: userTheme.color_epargne || '#ffffff' }
                            ];

                            return (
                              <div className="bg-[var(--surface)]/95 backdrop-blur-[var(--glass-blur)] border border-white/10 p-3 rounded-2xl shadow-2xl space-y-2 min-w-[210px] select-none">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/5 pb-1.5">
                                  {label}
                                </p>

                                <div className="space-y-1.5">
                                  {metrics.map(m => {
                                    const real = getEntry(m.key);
                                    const proj = getEntry(`${m.key}Projete`);

                                    const hasReal = real && real.value !== null && real.value !== undefined;
                                    const hasProj = proj && proj.value !== null && proj.value !== undefined;

                                    if (!hasReal && !hasProj) return null;

                                    const realVal = hasReal ? Number(real.value) : 0;
                                    const projVal = hasProj ? Number(proj.value) : 0;
                                    const areSame = hasReal && hasProj && Math.abs(realVal - projVal) < 0.01;

                                    // CAS 1 : Même valeur -> 1 seule ligne propre (évite les doublons du screen)
                                    if (areSame) {
                                      return (
                                        <div key={m.key} className="flex items-center justify-between gap-4 text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                            <span className="text-white/70 font-bold uppercase text-[11px]">{m.label}</span>
                                          </div>
                                          <span className="font-mono font-black" style={{ color: m.color }}>
                                            {fEuro(realVal)}
                                          </span>
                                        </div>
                                      );
                                    }

                                    // CAS 2 : Valeurs différentes (ex: mois en cours) ou seulement l'une des deux
                                    return (
                                      <React.Fragment key={m.key}>
                                        {hasReal && (
                                          <div className="flex items-center justify-between gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                              <span className="text-white/70 font-bold uppercase text-[11px]">
                                                {m.label} {hasProj ? '(Réel)' : ''}
                                              </span>
                                            </div>
                                            <span className="font-mono font-black" style={{ color: m.color }}>
                                              {fEuro(realVal)}
                                            </span>
                                          </div>
                                        )}

                                        {hasProj && (
                                          <div className="flex items-center justify-between gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-1 border border-dashed rounded-sm" style={{ borderColor: m.color }} />
                                              <span className="text-white/50 font-bold uppercase text-[11px]">
                                                {m.label} (Prévu)
                                              </span>
                                            </div>
                                            <span className="font-mono font-black opacity-80" style={{ color: m.color }}>
                                              {fEuro(projVal)}
                                            </span>
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }}
                        />

                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          content={() => (
                            <div className="flex justify-end gap-6 mb-4">
                              {[
                                { key: 'revenus', label: 'Revenus', color: userTheme.color_revenus || "#10b981" },
                                { key: 'depenses', label: 'Dépenses', color: userTheme.color_depenses || "#f43f5e" },
                                { key: 'epargne', label: 'Épargne', color: userTheme.color_epargne || "#ffffff" }
                              ].map((item) => (
                                <div 
                                  key={`item-${item.key}`} 
                                  className="flex items-center gap-2 cursor-pointer select-none transition-opacity"
                                  style={{ opacity: visibleAnnuel[item.key] !== false ? 1 : 0.3 }}
                                  onClick={() => setVisibleAnnuel(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">{item.label}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        />

                        <Area type="monotone" dataKey="revenus" name="revenus" hide={!visibleAnnuel.revenus} stroke={userTheme.color_revenus || "#10b981"} strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" connectNulls={false} dot={{ r: 3, fill: userTheme.color_revenus || '#10b981', strokeWidth: 1, stroke: 'var(--text-main)' }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="revenusProjete" name="revenusProjete" legendType="none" hide={!visibleAnnuel.revenus} stroke={userTheme.color_revenus || "#10b981"} strokeDasharray="4 4" strokeWidth={2} fillOpacity={1} fill="url(#colorRevProj)" connectNulls={false} dot={{ r: 2.5, fill: userTheme.color_revenus || '#10b981' }} isAnimationActive={false} />

                        <Area type="monotone" dataKey="depenses" name="depenses" hide={!visibleAnnuel.depenses} stroke={userTheme.color_depenses || "#f43f5e"} strokeWidth={3} fillOpacity={1} fill="url(#colorDep)" connectNulls={false} dot={{ r: 3, fill: userTheme.color_depenses || '#f43f5e', strokeWidth: 1, stroke: 'var(--text-main)' }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="depensesProjete" name="depensesProjete" legendType="none" hide={!visibleAnnuel.depenses} stroke={userTheme.color_depenses || "#f43f5e"} strokeDasharray="4 4" strokeWidth={2} fillOpacity={1} fill="url(#colorDepProj)" connectNulls={false} dot={{ r: 2.5, fill: userTheme.color_depenses || '#f43f5e' }} isAnimationActive={false} />

                        <Area type="monotone" dataKey="epargne" name="epargne" hide={!visibleAnnuel.epargne} stroke={userTheme.color_epargne || "#ffffff"} strokeWidth={2} fillOpacity={1} fill="url(#colorEp)" connectNulls={false} dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff', strokeWidth: 1, stroke: 'var(--text-main)' }} isAnimationActive={false} />
                        <Area type="monotone" dataKey="epargneProjete" name="epargneProjete" legendType="none" hide={!visibleAnnuel.epargne} stroke={userTheme.color_epargne || "#ffffff"} strokeDasharray="4 4" strokeWidth={2} fillOpacity={1} fill="url(#colorEpProj)" connectNulls={false} dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff' }} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* GRAPHIQUE 2 : DÉTAIL DES COMPTES */}
                  <div className="flex-1 w-full min-h-[200px] min-w-0 pb-4">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <AreaChart data={recapAnnuelStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-main) 3%, transparent)" vertical={false} />
                        <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{fill: 'color-mix(in srgb, var(--text-main) 30%, transparent)', fontSize: 11}} tickFormatter={(v) => v ? `${v.substring(0, 3)}.` : ''} />
                        <YAxis tick={{ fill: 'color-mix(in srgb, var(--text-main) 50%, transparent)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} tickFormatter={(val) => Math.abs(val) >= 1000 ? `${(val / 1000).toFixed(0)}k€` : `${val}€`} />
                        
                        <defs>
                          {comptesDuProfil?.map((compte, index) => (
                            <React.Fragment key={`grad-${index}`}>
                              <linearGradient id={`colorGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.4}/>
                                <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id={`colorGradProj-${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.2}/>
                                <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                              </linearGradient>
                            </React.Fragment>
                          ))}
                        </defs>

                        <Tooltip 
                          itemSorter={(item) => -item.value}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const seen = new Set();
                              const filteredList = payload.filter(entry => {
                                const baseKey = entry.dataKey.replace('PROJ_', '').replace('soldeProjete', 'soldeTotal');
                                if (seen.has(baseKey)) return false;
                                seen.add(baseKey);
                                return true;
                              });

                              return (
                                <div className="bg-slate-900/95 backdrop-blur-[var(--glass-blur)] p-4 rounded-xl border border-white/10 shadow-2xl">
                                  <p className="text-[var(--text-main)]/50 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
                                  <div className="flex flex-col gap-2">
                                    {filteredList.map((entry, index) => {
                                      const isProj = entry.dataKey.startsWith('PROJ_') || entry.dataKey === 'soldeProjete';
                                      const cleanName = entry.name.replace('PROJ_', '').replace(/\s*\([Pp]révu\)/g, '').trim();

                                      return (
                                        <div key={index} className="flex items-center justify-between gap-8">
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[var(--text-main)]/70 text-xs uppercase font-medium">
                                              {cleanName} {isProj ? '(Prévu)' : ''}
                                            </span>
                                          </div>
                                          <span className="text-[var(--text-main)] font-bold text-xs font-mono">
                                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(entry.value)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />

                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          content={() => (
                            <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 mb-4">
                              {comptesDuProfil?.map((compte, index) => (
                                <div 
                                  key={`item-${index}`} 
                                  className="flex items-center gap-2 cursor-pointer select-none transition-opacity"
                                  style={{ opacity: !hiddenComptes[compte.compte] ? 1 : 0.3 }}
                                  onClick={() => setHiddenComptes(prev => ({ ...prev, [compte.compte]: !prev[compte.compte] }))}
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: compte.couleur || '#64748b' }} />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                                    {compte.compte}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        />

                        {comptesDuProfil
                          ?.filter(c => c && c.compte)
                          .sort((a, b) => (b.soldePeriode || 0) - (a.soldePeriode || 0)) 
                          .map((compte, index) => {
                            const nomCle = compte.compte.trim().toUpperCase();
                            const color = compte.couleur || '#64748b';
                            const isHidden = !!hiddenComptes[compte.compte];

                            return (
                              <React.Fragment key={`area-compte-${index}`}>
                                <Area type="monotone" dataKey={nomCle} name={compte.compte} hide={isHidden} stroke={color} fill={`url(#colorGrad-${index})`} fillOpacity={1} strokeWidth={2} connectNulls={false} dot={{ r: 3, fill: color, strokeWidth: 1, stroke: 'var(--text-main)' }} isAnimationActive={false} />
                                <Area type="monotone" dataKey={`PROJ_${nomCle}`} name={compte.compte} legendType="none" hide={isHidden} stroke={color} strokeDasharray="4 4" fill={`url(#colorGradProj-${index})`} fillOpacity={1} strokeWidth={2} connectNulls={false} dot={{ r: 2.5, fill: color }} isAnimationActive={false} />
                              </React.Fragment>
                            );
                          })}

                        <Area type="monotone" dataKey="soldeTotal" stroke="var(--text-main)" strokeWidth={3} fill="transparent" name="PATRIMOINE TOTAL" hide={!!hiddenComptes["PATRIMOINE TOTAL"]} dot={{ r: 3, fill: 'var(--text-main)', strokeWidth: 1, stroke: 'var(--text-main)' }} connectNulls={false} isAnimationActive={false} />
                        <Area type="monotone" dataKey="soldeProjete" stroke="#38bdf8" strokeDasharray="4 4" strokeWidth={2.5} fill="transparent" name="PATRIMOINE TOTAL (Prévu)" legendType="none" hide={!!hiddenComptes["PATRIMOINE TOTAL"]} dot={{ r: 3, fill: '#38bdf8' }} connectNulls={false} isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-500">
                <GestionEpargneProjet
                  soldeGlobal={soldeGlobal}
                  allocations={allocations}
                  setAllocations={setAllocations}
                  projets={projets}
                  setProjets={setProjets}
                  transactions={toutesLesTransactions}
                  recapAnnuelStats={recapAnnuelStats}
                  filters={filters}
                  api={api}
                  comptesDuProfil={comptesDuProfil}
                />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* =========================================================================
          2. AFFICHAGE MOBILE (100% IDENTIQUE AU DESIGN D'ORIGINE)
          ========================================================================= */}
      <div className="flex lg:hidden flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-28 px-3 pt-1">

        {/* EN-TÊTE MOBILE */}
        <div className="flex items-center justify-between mb-2 mt-1 px-1">
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">Dashboard</h1>
            <p className="text-[var(--text-main)]/40 text-[8px] font-bold uppercase tracking-wider mt-0.5">Récaps, prévisions & graphiques</p>
          </div>
        </div>
        
        {/* FILTRES D'AFFICHAGE */}
        <div className="bg-[var(--glass-bg)] border border-white/10 p-2.5 rounded-xl mb-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* Profils scrollables */}
            <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-1 bg-black/30 p-0.5 rounded-lg min-w-0">
              {(() => {
                const groupes = [...new Set((comptes || []).map(c => c.groupe).filter(Boolean))].sort();
                const liste = groupes.length > 0 ? groupes : [user ? user.charAt(0).toUpperCase() + user.slice(1) : 'Personnel'];

                return liste.map(p => {
                  const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFilters({...filters, profil: p})}
                      className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        isSelected ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40 hover:text-white/70'
                      }`}
                    >
                      {p}
                    </button>
                  );
                });
              })()}
            </div>

            {/* Années */}
            <div className="flex bg-black/30 p-0.5 rounded-lg shrink-0">
              {[...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
                .sort((a, b) => parseInt(a) - parseInt(b))
                .map(year => (
                  <button
                    key={year}
                    type="button"
                    onClick={() => setFilters({...filters, annee: year.toString()})}
                    className={`px-2 py-0.5 rounded-sm text-[8px] font-black transition-all ${
                      filters.annee?.toString() === year.toString() ? 'bg-emerald-500 text-white' : 'text-white/40'
                    }`}
                  >
                    {year}
                  </button>
                ))}
            </div>
          </div>

          {/* Mois */}
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5 select-none">
            {moisListe.map(m => {
              const hasData = availablePeriods.some(p => 
                p.mois === m.v && p.annee.toString() === filters.annee?.toString()
              );
              if (!hasData) return null;
              return (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => setFilters({...filters, mois: m.v})}
                  className={`px-2.5 py-1 rounded-md text-[8px] font-black shrink-0 transition-all border ${
                    filters.mois === m.v 
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
                      : 'bg-black/10 border-transparent text-white/30'
                  }`}
                >
                  {m.l.substring(0, 3).toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* BARRE D'ONGLETS MOBILE */}
        <div className="flex border-b border-white/5 mb-3 select-none shrink-0">
          <button 
            type="button"
            onClick={() => setMobileHub('flux')}
            className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mobileHub === 'flux' 
                ? 'border-[var(--secondary)] text-[var(--secondary)]' 
                : 'border-transparent text-white/40'
            }`}
          >
            Flux & Comptes
          </button>
          <button 
            type="button"
            onClick={() => setMobileHub('annual')}
            className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mobileHub === 'annual' 
                ? 'border-[var(--secondary)] text-[var(--secondary)]' 
                : 'border-transparent text-white/40'
            }`}
          >
            Bilan Annuel
          </button>
          <button 
            type="button"
            onClick={() => setMobileHub('graphs')}
            className={`flex-1 py-2 text-center text-[9px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              mobileHub === 'graphs' 
                ? 'border-[var(--secondary)] text-[var(--secondary)]' 
                : 'border-transparent text-white/40'
            }`}
          >
            Graphes & Épargne
          </button>
        </div>

        {/* SECTION MOBILE 1 : FLUX & COMPTES */}
        {mobileHub === 'flux' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* CARTE PATRIMOINE */}
            <div 
              {...(patrimoineActif ? { role: 'button', tabIndex: 0, onClick: ouvrirPatrimoine } : {})}
              className={`rounded-xl p-3 text-white shadow-lg flex items-center justify-between transition-all ${patrimoineActif ? 'cursor-pointer' : ''}`}
              style={{ 
                background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
              }}
            >
              <div>
                <p className="text-white/60 text-[7px] font-black uppercase tracking-widest leading-none mb-1">{patrimoineActif ? 'Total net' : 'Patrimoine'}</p>
                <h2 className="text-lg font-black tracking-tighter leading-none">
                  {(patrimoineActif ? valeurNette : soldeGlobal).toLocaleString('fr-FR', { minimumFractionDigits: patrimoineActif ? 0 : 2, maximumFractionDigits: patrimoineActif ? 0 : 2 })} €
                </h2>
                {patrimoineActif && (
                  <p className="text-[9px] font-bold text-white/75 mt-1">comptes + placements − crédits</p>
                )}
              </div>
              <span className="text-[8.5px] uppercase font-black tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                {filters.profil}
              </span>
            </div>

            {/* COMPTES BANCAIRES */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[8.5px] font-black uppercase text-white/40 tracking-widest">
                  Mes Comptes ({soldesTries.length})
                </span>
                <button 
                  type="button"
                  onClick={() => setIsSortingAccounts(!isSortingAccounts)}
                  className={`px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    isSortingAccounts 
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                      : 'bg-white/5 border-white/10 text-white/50'
                  }`}
                >
                  {isSortingAccounts ? 'Valider ✓' : 'Réorganiser ⇅'}
                </button>
              </div>

              {isSortingAccounts ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={soldesTries.map(c => c.compte)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-1.5 p-1.5 bg-black/20 rounded-xl border border-white/5">
                      {soldesTries.map(c => (
                        <div key={c.compte} className="w-full">
                          <SortableAccountCard c={c} isSorting={true} />
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="flex gap-2 pb-1.5 overflow-x-auto no-scrollbar select-none">
                  {soldesTries.map(c => (
                    <div key={c.compte} className="min-w-[140px] shrink-0">
                      <SortableAccountCard c={c} isSorting={false} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* JOURNAL DES FLUX */}
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/5">
                <span className="text-[9px] font-black uppercase tracking-wider text-white/70">Flux mensuel</span>
                
                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5 gap-0.5">
                  {Object.keys(TAB_CONFIG).map((tab) => {
                    const config = TAB_CONFIG[tab];
                    const IconComponent = config.icon;
                    const isActive = tabActive === tab;

                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setTabActive(tab);
                          setSearchTerm('');
                        }}
                        title={config.label}
                        aria-label={config.label}
                        className={`p-1 rounded-sm transition-all cursor-pointer ${
                          isActive ? 'bg-[var(--glass-bg)] text-white border border-white/5' : 'text-white/30'
                        }`}
                      >
                        <IconComponent size={11} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RECHERCHE */}
              <div className={`relative ${tabActive === 'abonnements' ? 'hidden' : ''}`}>
                <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Filtrer les flux..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-7 py-1.5 text-[10.5px] font-medium text-white placeholder:text-white/20 focus:outline-none"
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 cursor-pointer">
                    <X size={11} />
                  </button>
                )}
              </div>

              <div className="space-y-1 max-h-96 overflow-y-auto pr-0.5 custom-scrollbar">
                {(() => {
                  const rawTransactions = [...(financeData?.journal?.[tabActive === 'Catégories' ? 'depenses' : tabActive] || [])];
                  
                  const filteredTransactions = rawTransactions.filter(t => {
                    if (!searchTerm.trim()) return true;
                    const term = searchTerm.toLowerCase().trim();
                    const nom = (t.nom || t.libelle || t.description || '').toLowerCase();
                    const category = (t.categorie || t.category || '').toLowerCase();
                    return nom.includes(term) || category.includes(term);
                  });

                  if (tabActive === 'Catégories') {
                    return (
                      <div className="h-96 w-full pb-2 animate-in fade-in duration-200">
                        <AnalyseCategories
                          statsCategories={statsCategories}
                          hiddenCategories={hiddenCategories}
                          toggleCategory={toggleCategory}
                          budgetGauges={budgetGauges}
                        />
                      </div>
                    );
                  }

                  if (tabActive === 'Variations') {
                    return (
                      <VariationsView 
                        statsCategories={statsCategories} 
                        userTheme={userTheme}
                        prevMonthLabel={financeData?.periodeComparee?.mois || "M-1"}
                      />
                    );
                  }

                  if (tabActive === 'abonnements') {
                    return <VueAbonnements transactions={toutesLesTransactions} comptesDuProfil={comptesDuProfil} profil={filters.profil} user={user} rechargerPrevisions={loadPrevisions} />;
                  }

                  if (tabActive === 'flash') {
                    return (
                      <FlashInsightsView 
                        statsCategories={statsCategories} 
                        transactions={financeData?.journal?.depenses || []} 
                        user={user}
                        filters={filters}
                      />
                    );
                  }

                  return filteredTransactions.length > 0 ? (
                    filteredTransactions
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((t, i) => (
                        <div 
                          key={t.id || i} 
                          onClick={() => updateCell && setEditingTransaction(t)}
                          className="active:bg-white/5 rounded-lg transition-all cursor-pointer"
                        >
                          <TransactionCard 
                            t={t} 
                            color={
                              tabActive === 'revenus' ? (userTheme?.color_revenus || '#10b981') : 
                              tabActive === 'depenses' ? (userTheme?.color_depenses || '#f43f5e') : 
                              'var(--primary)'
                            }
                            bg={
                              tabActive === 'revenus' ? `${userTheme?.color_revenus || '#10b981'}15` : 
                              tabActive === 'depenses' ? `${userTheme?.color_depenses || '#f43f5e'}15` : 
                              'color-mix(in srgb, var(--primary) 10%, transparent)'
                            }
                          />
                        </div>
                      ))
                  ) : (
                    <p className="text-[9px] text-center text-white/30 uppercase font-bold py-4">Aucun flux trouvé</p>
                  );
                })()}
              </div>
            </div>

            {/* OBJECTIFS BUDGÉTAIRES */}
            <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-xl space-y-2">
              <span className="text-[8.5px] font-black uppercase text-white/40 tracking-widest block">
                Suivi des Budgets
              </span>

              {budgetGauges.length > 0 ? (
                <div className="relative w-full">
                  <div 
                    ref={carouselRef}
                    onScroll={handleScroll}
                    className="flex flex-row gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide snap-x snap-mandatory scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {budgetGauges.map((bg, i) => {
                      const radius = 24;
                      const circumference = Math.PI * radius;
                      const strokeDashoffset = circumference - (Math.min(bg.pourcentage, 100) / 100) * circumference;

                      return (
                        <div 
                          key={i} 
                          className="flex flex-col items-center min-w-[72px] max-w-[72px] shrink-0 snap-start bg-black/25 p-2 rounded-xl border border-white/5"
                        >
                          <div className="relative w-[64px] h-[32px] flex items-center justify-center">
                            <svg width="64" height="32" viewBox="0 0 64 32" className="absolute top-0 left-0">
                              <path d="M 8,32 A 24,24 0 0 1 56,32" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" />
                              <path
                                d="M 8,32 A 24,24 0 0 1 56,32"
                                fill="none"
                                stroke={bg.depasse ? '#fb7185' : '#34d399'}
                                strokeWidth="4"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className="transition-all duration-700 ease-out"
                              />
                            </svg>

                            <div className="absolute bottom-[1px] left-1/2 -translate-x-1/2 flex items-center justify-center">
                              <CategoryIcon name={bg.nom} size={9} />
                            </div>
                          </div>

                          <div className="text-center mt-2 w-full">
                            <p className="text-[7.5px] font-black text-white/70 uppercase tracking-tight truncate w-full leading-none">
                              {getCleanCategoryName(bg.nom)}
                            </p>
                            <p className={`text-[9px] font-black mt-0.5 ${bg.depasse ? 'text-rose-400' : 'text-[#34d399]'} leading-none`}>
                              {bg.pourcentage}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[9px] text-white/20 uppercase font-black text-center py-3">Aucun budget défini</p>
              )}
            </div>

          </div>
        )}

        {/* SECTION MOBILE 2 : BILAN ANNUEL */}
        {mobileHub === 'annual' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3 flex flex-col gap-2.5">
              
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Bilan de l'année</span>
                    <span className="text-[10px] font-black text-emerald-400">{filters.annee}</span>
                  </div>
                  {soldePremierJanvier !== undefined && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[7.5px] font-bold text-white/30 uppercase">Solde 1er janv. :</span>
                      <span className="text-[9.5px] font-black" style={{ color: userTheme.color_patrimoine }}>
                        {Math.round(soldePremierJanvier).toLocaleString('fr-FR')}€
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('list')}
                    className={`p-1 rounded-sm cursor-pointer ${annualTab === 'list' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                  >
                    <List size={11} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('chart')}
                    title="Répartition des dépenses"
                    className={`p-1 rounded-sm cursor-pointer ${annualTab === 'chart' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                  >
                    <PieChartIcon size={11} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('calendar')}
                    className={`p-1 rounded-sm cursor-pointer ${annualTab === 'calendar' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                  >
                    <CalendarDays size={11} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAnnualTab('wrapped')}
                    className={`p-1 rounded-sm cursor-pointer ${annualTab === 'wrapped' ? 'bg-[var(--glass-bg)] text-white' : 'text-white/30'}`}
                  >
                    <Sparkles size={11} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {annualTab === 'list' && (
                  <div className="space-y-1.5 overflow-y-auto max-h-[420px] pr-0.5 custom-scrollbar">
                    {recapAnnuelStats.map((m, i) => {
                      const estMoisEnCours = m.isMoisEnCours;
                      const estFutur = m.isFutur;
                      const aDesPrevisions = m.hasPrevisions;

                      return (
                        <div 
                          key={i} 
                          className={`p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
                            estMoisEnCours
                              ? 'bg-white/[0.04] border-white/20 shadow-md'
                              : estFutur
                                ? 'bg-white/[0.01] border-white/5 border-dashed opacity-75'
                                : 'bg-black/20 border-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-center pb-1 border-b border-white/[0.04]">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-black uppercase ${estMoisEnCours ? 'text-white font-extrabold' : 'text-white/70'}`}>
                                {m.nom}
                              </span>

                              {estMoisEnCours && (
                                <span className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded-sm bg-secondary-500/20 text-secondary-300 border border-secondary-500/30">
                                  En cours
                                </span>
                              )}

                              {estFutur && aDesPrevisions && (
                                <span 
                                  className="text-[7px] font-black uppercase px-1.5 py-0.2 rounded-sm border"
                                  style={{
                                    backgroundColor: `${userTheme.color_patrimoine || '#37b58f'}1a`,
                                    borderColor: `${userTheme.color_patrimoine || '#37b58f'}33`,
                                    color: userTheme.color_patrimoine || '#37b58f'
                                  }}
                                >
                                  Prévu
                                </span>
                              )}
                            </div>

                            <div className="flex flex-col items-end leading-none">
                              <span className="text-[11px] font-black tracking-tight" style={{ color: userTheme.color_patrimoine }}>
                                {m.soldeTotal !== null 
                                  ? `${m.soldeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` 
                                  : (m.soldeProjete !== null ? `${m.soldeProjete.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €` : '—')}
                              </span>
                              {aDesPrevisions && m.soldeProjete !== null && estMoisEnCours && (
                                <span className="text-[7.5px] font-bold mt-0.5 opacity-60" style={{ color: userTheme.color_patrimoine }}>
                                  prévu {m.soldeProjete.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-1 text-center">
                            <div>
                              <p className="text-[6.5px] font-bold text-white/30 uppercase">Revenus</p>
                              <p className="text-[9.5px] font-mono font-black mt-0.5" style={{ color: userTheme.color_revenus || '#10b981' }}>
                                {m.revReel > 0 
                                  ? `+${Math.round(m.revReel)}€` 
                                  : (m.revPrevu > 0 ? `+${Math.round(m.revPrevu)}€` : '—')}
                              </p>
                              {estMoisEnCours && aDesPrevisions && m.revPrevu !== null && (
                                <span className="text-[7px] font-bold opacity-60 block mt-0.5" style={{ color: userTheme.color_revenus }}>
                                  prévu {Math.round(m.revPrevu)}€
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="text-[6.5px] font-bold text-white/30 uppercase">Dépenses</p>
                              <p className="text-[9.5px] font-mono font-black mt-0.5" style={{ color: userTheme.color_depenses || '#f43f5e' }}>
                                {m.depReel > 0 
                                  ? `-${Math.round(m.depReel)}€` 
                                  : (m.depPrevu > 0 ? `-${Math.round(m.depPrevu)}€` : '—')}
                              </p>
                              {estMoisEnCours && aDesPrevisions && m.depPrevu !== null && (
                                <span className="text-[7px] font-bold opacity-60 block mt-0.5" style={{ color: userTheme.color_depenses }}>
                                  prévu -{Math.round(m.depPrevu)}€
                                </span>
                              )}
                            </div>

                            <div>
                              <p className="text-[6.5px] font-bold text-white/30 uppercase">Épargne</p>
                              <span 
                                className="inline-block px-1.5 py-0.2 rounded-sm text-[8.5px] font-mono font-black mt-0.5"
                                style={{ 
                                  backgroundColor: ((m.epargneReel ?? m.epargnePrevu) >= 0) ? `${userTheme.color_epargne || '#ffffff'}15` : `${userTheme.color_depenses || '#f43f5e'}15`,
                                  color: ((m.epargneReel ?? m.epargnePrevu) >= 0) ? (userTheme.color_epargne || '#ffffff') : (userTheme.color_depenses || '#f43f5e') 
                                }}
                              >
                                {(m.epargneReel !== null && m.hasRealData) 
                                  ? `${m.epargneReel > 0 ? '+' : ''}${Math.round(m.epargneReel)}€` 
                                  : (m.epargnePrevu !== null ? `${m.epargnePrevu > 0 ? '+' : ''}${Math.round(m.epargnePrevu)}€` : '—')}
                              </span>
                              {estMoisEnCours && aDesPrevisions && m.epargnePrevu !== null && (
                                <span className="text-[7px] font-bold opacity-60 block mt-0.5 text-white/40">
                                  prévu {m.epargnePrevu > 0 ? '+' : ''}{Math.round(m.epargnePrevu)}€
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {annualTab === 'chart' && (
                  <div className="h-80 w-full">
                    <RepartitionDepenses data={statsAnnuellesCategories} currentYear={filters.annee} comptes={comptes} filters={filters} toutesLesTransactions={toutesLesTransactions} />
                  </div>
                )}

                {annualTab === 'calendar' && (
                  <CalendarSection 
                    toutesLesTransactions={toutesLesTransactions}
                    comptesDuProfil={comptesDuProfil}
                    filters={filters}
                    moisListe={moisListe}
                  />
                )}

                {annualTab === 'wrapped' && (
                  <WrappedSection 
                    toutesLesTransactions={toutesLesTransactions}
                    comptesDuProfil={comptesDuProfil}
                    filters={filters}
                    moisListe={moisListe}
                    user={user}
                    objectifAnnuelGlobal={objectifAnnuelGlobal}
                    epargneReelleCumulee={epargneReelleCumulee}
                  />
                )}
              </div>
            </div>

            {/* SYNTHÈSE TOTAUX PÉRIODE MOBILE */}
            <div className="p-3 bg-[var(--glass-bg)] border border-white/10 rounded-xl backdrop-blur-[var(--glass-blur)] shadow-xl space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Totaux</span>
                  
                  <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setTotalTab('annuel')}
                      className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        !estPeriode ? 'bg-[var(--glass-bg)] text-white shadow-md' : 'text-white/30'
                      }`}
                    >
                      Annuel
                    </button>
                    <button
                      type="button"
                      onClick={() => setTotalTab('periode')}
                      className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        estPeriode ? 'bg-[var(--glass-bg)] text-white shadow-md' : 'text-white/30'
                      }`}
                    >
                      Période
                    </button>
                  </div>
                </div>

                {estPeriode && (
                  <div className="flex items-center gap-1">
                    <div className="w-20 text-[8px]">
                      <CustomSelect 
                        value={moisDebut}
                        onChange={(val) => setMoisDebut(val)}
                        icon={Calendar} 
                        options={moisListe}
                      />
                    </div>
                    <span className="text-[7.5px] font-black text-white/20 uppercase">à</span>
                    <div className="w-20 text-[8px]">
                      <CustomSelect 
                        value={moisFin}
                        onChange={(val) => setMoisFin(val)}
                        icon={Calendar} 
                        options={moisListe}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[6.5px] font-black text-white/30 uppercase mb-0.5 truncate">
                    {estPeriode ? 'Revenus Période' : 'Total Revenus'}
                  </p>
                  <p className="text-xs font-black tracking-tight" style={{ color: userTheme.color_revenus || '#10b981' }}>
                    {donneesAffichees.revenus.toLocaleString('fr-FR')}€
                  </p>
                </div>

                <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[6.5px] font-black text-white/30 uppercase mb-0.5 truncate">
                    {estPeriode ? 'Dépenses Période' : 'Total Dépenses'}
                  </p>
                  <p className="text-xs font-black tracking-tight" style={{ color: userTheme.color_depenses || '#f43f5e' }}>
                    -{donneesAffichees.depenses.toLocaleString('fr-FR')}€
                  </p>
                </div>

                <div className="bg-black/20 p-2 rounded-xl border border-white/5 text-center">
                  <p className="text-[6.5px] font-black text-white/30 uppercase mb-0.5 truncate">
                    {estPeriode ? 'Épargne Période' : 'Net Épargné'}
                  </p>
                  <p className="text-xs font-black tracking-tight" style={{ color: userTheme.color_epargne || '#ffffff' }}>
                    {donneesAffichees.epargne.toLocaleString('fr-FR')}€
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[7px] font-black uppercase text-white/30 leading-none">
                  <span>Consommé</span>
                  <span className="text-emerald-400 font-black">Épargné ({donneesAffichees.tauxEffort}%)</span>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                  <div 
                    className="h-full bg-rose-500/50 transition-all duration-500" 
                    style={{ width: `${100 - donneesAffichees.tauxEffort}%` }}
                  />
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_#10b981]" 
                    style={{ width: `${donneesAffichees.tauxEffort}%` }}
                  />
                </div>
              </div>

            </div>

          </div>
        )}

        {/* SECTION MOBILE 3 : GRAPHES & ÉPARGNE */}
        {mobileHub === 'graphs' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5 w-fit mx-auto select-none">
              <button 
                type="button"
                onClick={() => setActiveRightTab('graphs')}
                className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                  activeRightTab === 'graphs' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
                }`}
              >
                Analytique
              </button>
              <button 
                type="button"
                onClick={() => setActiveRightTab('epargneProjets')}
                className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                  activeRightTab === 'epargneProjets' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
                }`}
              >
                Épargne & Projets
              </button>
              <button
                type="button"
                onClick={() => setActiveRightTab('valeurNette')}
                className={`px-3 py-1 rounded-lg text-[8.5px] font-black uppercase transition-all cursor-pointer ${
                  activeRightTab === 'valeurNette' ? 'bg-white text-slate-900 shadow-md' : 'text-white/40'
                }`}
              >
                Placements & crédits
              </button>
            </div>

            {activeRightTab === 'valeurNette' ? (
              <ValeurNetteResume patrimoine={patrimoine} profil={filters.profil} recapAnnuelStats={recapAnnuelStats} soldeGlobal={soldeGlobal}
                valeurNette={valeurNette} actif={patrimoineActif} ouvrirPatrimoine={ouvrirPatrimoine} couleur={userTheme.color_patrimoine || '#37b58f'} />
            ) : activeRightTab === 'graphs' ? (
              <div className="space-y-3">
                {/* JAUGE D'OBJECTIF D'ÉPARGNE MOBILE */}
                <div className="bg-[var(--glass-bg)] border border-white/10 p-3.5 rounded-xl shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                        style={{ 
                          backgroundColor: `${jaugeColor}1a`, 
                          borderColor: `${jaugeColor}33`,
                          boxShadow: `0 0 12px ${jaugeColor}20` 
                        }}
                      >
                        <Trophy size={16} style={{ color: jaugeColor }} />
                      </div>
                      
                      <div className="flex flex-col min-w-0">
                        <h4 className="text-[var(--text-main)]/40 text-[8px] font-black uppercase tracking-[0.1em] leading-tight">
                          Objectif d'épargne {filters.annee}
                        </h4>
                        
                        {objectifAnnuelGlobal > 0 ? (
                          <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[var(--text-main)] font-black text-sm leading-tight">
                              {Math.floor(savingsData.reel).toLocaleString('fr-FR')} €
                            </span>
                            
                            {savingsData.projete !== savingsData.reel && (
                              <span className="text-[9.5px] font-black tracking-tight" style={{ color: jaugeColor }} title="Total projeté avec prévisions">
                                (prévu {Math.floor(savingsData.projete).toLocaleString('fr-FR')} €)
                              </span>
                            )}
                            
                            <span className="text-[var(--text-main)]/30 text-[8.5px] font-bold">
                              / {objectifAnnuelGlobal.toLocaleString('fr-FR')} €
                            </span>
                          </div>
                        ) : (
                          <p className="text-[var(--text-main)]/20 font-black text-xs uppercase mt-0.5">Non défini</p>
                        )}
                      </div>
                    </div>

                    {objectifAnnuelGlobal > 0 && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div 
                          className="text-[8.5px] font-black px-1.5 py-0.5 rounded-lg border"
                          style={{
                            backgroundColor: `${jaugeColor}1a`,
                            borderColor: `${jaugeColor}40`,
                            color: jaugeColor
                          }}
                        >
                          {savingsData.pctR}%
                        </div>

                        {savingsData.pctP !== savingsData.pctR && (
                          <div 
                            className="text-[8.5px] font-black px-1.5 py-0.5 rounded-lg border flex items-center gap-0.5 shadow-sm"
                            style={{
                              backgroundColor: `${jaugeColor}20`,
                              borderColor: `${jaugeColor}60`,
                              color: jaugeColor
                            }}
                          >
                            <span className="text-[7px] opacity-70">➔</span>
                            <span>{savingsData.pctP}% prévu</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {objectifAnnuelGlobal > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="relative h-2.5 w-full bg-black/50 rounded-full overflow-hidden border border-white/10 shadow-inner">
                        {savingsData.pctR > 0 && (
                          <div 
                            className="absolute left-0 top-0 h-full transition-all duration-1000 ease-out"
                            style={{ 
                              width: `${Math.min(savingsData.pctR, 100)}%`,
                              background: `linear-gradient(90deg, ${jaugeColor}90, ${jaugeColor})`,
                              boxShadow: `0 0 10px ${jaugeColor}50`
                            }}
                          />
                        )}

                        {savingsData.pctP > savingsData.pctR && (
                          <div 
                            className="absolute top-0 h-full transition-all duration-1000 ease-out"
                            style={{ 
                              left: `${Math.min(savingsData.pctR, 100)}%`,
                              width: `${Math.max(0, Math.min(savingsData.pctP - savingsData.pctR, 100 - savingsData.pctR))}%`,
                              borderRight: `1px solid ${jaugeColor}`,
                              background: `repeating-linear-gradient(
                                -45deg,
                                ${jaugeColor}cc 0,
                                ${jaugeColor}cc 3px,
                                transparent 3px,
                                transparent 7px
                              )`,
                              boxShadow: `0 0 10px ${jaugeColor}30`
                            }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[7.5px] font-black uppercase text-white/30 tracking-wider px-0.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: jaugeColor }} />
                            Réel ({savingsData.pctR}%)
                          </span>
                          {savingsData.pctP > savingsData.pctR && (
                            <span className="flex items-center gap-1" style={{ color: jaugeColor }}>
                              <span className="w-2 h-1 border border-dashed rounded-sm" style={{ borderColor: jaugeColor }} />
                              Prévisions (+{savingsData.pctP - savingsData.pctR}%)
                            </span>
                          )}
                        </div>
                        <span>Obj. 100%</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">{selecteurVueAnalytique}</div>

                {vueAnalytique === 'annees' ? (
                  <RecapAnnees comptes={comptes} transactions={toutesLesTransactions} profil={filters.profil} userTheme={userTheme} mobile />
                ) : (
                <>
                {/* GRAPHIQUE 1 : TENDANCE GLOBALE DES FLUX MOBILE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3">
                <h3 className="text-[10px] font-black uppercase text-white/60 mb-2">Tendance Globale des Flux</h3>
                
                <div className="h-52 w-full pb-2">
                  <ResponsiveContainer width="100%" height="110%">
                    <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRevProjMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                        </linearGradient>

                        <linearGradient id="colorDepMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDepProjMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.15}/>
                          <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                        </linearGradient>

                        <linearGradient id="colorEpMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEpProjMob" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.1}/>
                          <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-main) 3%, transparent)" vertical={false} />
                      
                      <XAxis 
                        dataKey="nom" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'color-mix(in srgb, var(--text-main) 30%, transparent)', fontSize: 11 }}
                        dy={10}
                        tickFormatter={(value) => value ? `${value.substring(0, 3)}.` : ''}
                      />

                      <YAxis 
                        tick={{ fill: 'color-mix(in srgb, var(--text-main) 50%, transparent)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(value) => {
                          if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                          if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                          return `${value}€`;
                        }}
                      />
                      
                      {/* 🟢 TOOLTIP INTELLIGENT SANS DOUBLONS INUTILES */}
                        <Tooltip 
                          cursor={{ stroke: 'color-mix(in srgb, var(--text-main) 10%, transparent)', strokeWidth: 2 }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload || !payload.length) return null;

                            const fEuro = (v) => new Intl.NumberFormat('fr-FR', { 
                              style: 'currency', currency: 'EUR', minimumFractionDigits: 2 
                            }).format(v);

                            const getEntry = (key) => payload.find(p => p.dataKey === key);

                            const metrics = [
                              { key: 'revenus', label: 'Revenus', color: userTheme.color_revenus || '#10b981' },
                              { key: 'depenses', label: 'Dépenses', color: userTheme.color_depenses || '#f43f5e' },
                              { key: 'epargne', label: 'Épargne', color: userTheme.color_epargne || '#ffffff' }
                            ];

                            return (
                              <div className="bg-[var(--surface)]/95 backdrop-blur-[var(--glass-blur)] border border-white/10 p-3 rounded-2xl shadow-2xl space-y-2 min-w-[210px] select-none">
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 border-b border-white/5 pb-1.5">
                                  {label}
                                </p>

                                <div className="space-y-1.5">
                                  {metrics.map(m => {
                                    const real = getEntry(m.key);
                                    const proj = getEntry(`${m.key}Projete`);

                                    const hasReal = real && real.value !== null && real.value !== undefined;
                                    const hasProj = proj && proj.value !== null && proj.value !== undefined;

                                    if (!hasReal && !hasProj) return null;

                                    const realVal = hasReal ? Number(real.value) : 0;
                                    const projVal = hasProj ? Number(proj.value) : 0;
                                    const areSame = hasReal && hasProj && Math.abs(realVal - projVal) < 0.01;

                                    // CAS 1 : Même valeur -> 1 seule ligne propre (évite les doublons du screen)
                                    if (areSame) {
                                      return (
                                        <div key={m.key} className="flex items-center justify-between gap-4 text-xs">
                                          <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                            <span className="text-white/70 font-bold uppercase text-[11px]">{m.label}</span>
                                          </div>
                                          <span className="font-mono font-black" style={{ color: m.color }}>
                                            {fEuro(realVal)}
                                          </span>
                                        </div>
                                      );
                                    }

                                    // CAS 2 : Valeurs différentes (ex: mois en cours) ou seulement l'une des deux
                                    return (
                                      <React.Fragment key={m.key}>
                                        {hasReal && (
                                          <div className="flex items-center justify-between gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                                              <span className="text-white/70 font-bold uppercase text-[11px]">
                                                {m.label} {hasProj ? '(Réel)' : ''}
                                              </span>
                                            </div>
                                            <span className="font-mono font-black" style={{ color: m.color }}>
                                              {fEuro(realVal)}
                                            </span>
                                          </div>
                                        )}

                                        {hasProj && (
                                          <div className="flex items-center justify-between gap-4 text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <span className="w-2 h-1 border border-dashed rounded-sm" style={{ borderColor: m.color }} />
                                              <span className="text-white/50 font-bold uppercase text-[11px]">
                                                {m.label} (Prévu)
                                              </span>
                                            </div>
                                            <span className="font-mono font-black opacity-80" style={{ color: m.color }}>
                                              {fEuro(projVal)}
                                            </span>
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }}
                        />

                      {/* Légende interactive mobile */}
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        content={() => (
                          <div className="flex justify-end gap-4 mb-3">
                            {[
                              { key: 'revenus', label: 'Revenus', color: userTheme.color_revenus || "#10b981" },
                              { key: 'depenses', label: 'Dépenses', color: userTheme.color_depenses || "#f43f5e" },
                              { key: 'epargne', label: 'Épargne', color: userTheme.color_epargne || "#ffffff" }
                            ].map((item) => {
                              const isVisible = visibleAnnuel[item.key] !== false;
                              return (
                                <div 
                                  key={`item-mob-${item.key}`} 
                                  className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity duration-200"
                                  style={{ opacity: isVisible ? 1 : 0.3 }}
                                  onClick={() => setVisibleAnnuel(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full shrink-0" 
                                    style={{ backgroundColor: item.color }} 
                                  />
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-main)]/50">
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />

                      <Area 
                        type="monotone" 
                        dataKey="revenus" 
                        name="revenus"
                        hide={!visibleAnnuel.revenus}
                        stroke={userTheme.color_revenus || "#10b981"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevMob)"
                        connectNulls={false}
                        dot={{ r: 3, fill: userTheme.color_revenus || '#10b981', strokeWidth: 1, stroke: 'var(--text-main)' }}
                        isAnimationActive={false}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenusProjete" 
                        name="revenusProjete"
                        legendType="none"
                        hide={!visibleAnnuel.revenus}
                        stroke={userTheme.color_revenus || "#10b981"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevProjMob)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_revenus || '#10b981' }}
                        isAnimationActive={false}
                      />

                      <Area 
                        type="monotone" 
                        dataKey="depenses" 
                        name="depenses"
                        hide={!visibleAnnuel.depenses}
                        stroke={userTheme.color_depenses || "#f43f5e"} 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorDepMob)"
                        connectNulls={false}
                        dot={{ r: 3, fill: userTheme.color_depenses || '#f43f5e', strokeWidth: 1, stroke: 'var(--text-main)' }}
                        isAnimationActive={false}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="depensesProjete" 
                        name="depensesProjete"
                        legendType="none"
                        hide={!visibleAnnuel.depenses}
                        stroke={userTheme.color_depenses || "#f43f5e"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorDepProjMob)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_depenses || '#f43f5e' }}
                        isAnimationActive={false}
                      />

                      <Area 
                        type="monotone" 
                        dataKey="epargne" 
                        name="epargne"
                        hide={!visibleAnnuel.epargne}
                        stroke={userTheme.color_epargne || "#ffffff"} 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorEpMob)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff', strokeWidth: 1, stroke: 'var(--text-main)' }}
                        isAnimationActive={false}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="epargneProjete" 
                        name="epargneProjete"
                        legendType="none"
                        hide={!visibleAnnuel.epargne}
                        stroke={userTheme.color_epargne || "#ffffff"} 
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorEpProjMob)"
                        connectNulls={false}
                        dot={{ r: 2.5, fill: userTheme.color_epargne || '#ffffff' }}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* GRAPHIQUE 2 : ÉVOLUTION DÉTAILLÉE DES COMPTES & PATRIMOINE MOBILE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-3">
                <h3 className="text-[10px] font-black uppercase text-white/60 mb-2">Évolution des Comptes & Patrimoine</h3>
                
                <div className="h-52 w-full pb-2">
                  <ResponsiveContainer width="100%" height="120%">
                    <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-main) 3%, transparent)" vertical={false} />
                      
                      <XAxis 
                        dataKey="nom" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: 'color-mix(in srgb, var(--text-main) 30%, transparent)', fontSize: 11}} 
                        tickFormatter={(value) => value ? `${value.substring(0, 3)}.` : ''} 
                      />
                      
                      <YAxis 
                        tick={{ fill: 'color-mix(in srgb, var(--text-main) 50%, transparent)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        tickFormatter={(value) => {
                          if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                          if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                          return `${value}€`;
                        }}
                      />
                      
                      {/* Dégradés personnalisés par compte */}
                      <defs>
                        {comptesDuProfil?.map((compte, index) => (
                          <React.Fragment key={`grad-mob-${index}`}>
                            <linearGradient id={`colorGradMob-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.4}/>
                              <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id={`colorGradProjMob-${index}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.2}/>
                              <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                            </linearGradient>
                          </React.Fragment>
                        ))}
                      </defs>

                      <Tooltip 
                        itemSorter={(item) => -item.value}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const seen = new Set();
                            const filteredList = payload.filter(entry => {
                              const baseName = entry.name.replace('PROJ_', '').replace(' (Prévu)', '');
                              if (seen.has(baseName)) return false;
                              seen.add(baseName);
                              return true;
                            });

                            return (
                              <div className="bg-slate-900/95 backdrop-blur-[var(--glass-blur)] p-3 rounded-xl border border-white/10 shadow-2xl">
                                <p className="text-[var(--text-main)]/50 text-[9px] font-black uppercase tracking-widest mb-2">{label}</p>
                                <div className="flex flex-col gap-1.5">
                                  {filteredList.map((entry, index) => {
                                    const isProj = entry.dataKey.startsWith('PROJ_') || entry.dataKey === 'soldeProjete';
                                    const displayName = entry.name.replace('PROJ_', '');
                                    return (
                                      <div key={index} className="flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-1.5">
                                          <div 
                                            className="w-2 h-2 rounded-full shrink-0" 
                                            style={{ backgroundColor: entry.color }} 
                                          />
                                          <span className="text-[var(--text-main)]/70 text-[11px] uppercase font-medium">
                                            {displayName} {isProj ? '(Prévu)' : ''}
                                          </span>
                                        </div>
                                        <span className="text-[var(--text-main)] font-bold text-[11px] font-mono">
                                          {new Intl.NumberFormat('fr-FR', { 
                                            style: 'currency', 
                                            currency: 'EUR', 
                                            maximumFractionDigits: 2 
                                          }).format(entry.value)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      
                      {/* Légende interactive des comptes sur mobile */}
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        content={() => (
                          <div className="flex flex-wrap justify-end gap-x-4 gap-y-1.5 mb-3">
                            {comptesDuProfil?.map((compte, index) => {
                              const isHidden = !!hiddenComptes[compte.compte];
                              return (
                                <div 
                                  key={`item-acc-${index}`} 
                                  className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity duration-200"
                                  style={{ opacity: isHidden ? 0.3 : 1 }}
                                  onClick={() => setHiddenComptes(prev => ({ ...prev, [compte.compte]: !prev[compte.compte] }))}
                                >
                                  <div 
                                    className="w-2 h-2 rounded-full shrink-0" 
                                    style={{ backgroundColor: compte.couleur || '#64748b' }} 
                                  />
                                  <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-main)]/50">
                                    {compte.compte}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      />

                      {comptesDuProfil
                        ?.filter(c => c && c.compte)
                        .sort((a, b) => (b.soldePeriode || 0) - (a.soldePeriode || 0)) 
                        .map((compte, index) => {
                          const nomCle = compte.compte.trim().toUpperCase();
                          const color = compte.couleur || '#64748b';
                          const isHidden = !!hiddenComptes[compte.compte];

                          return (
                            <React.Fragment key={`area-compte-mob-${index}`}>
                              <Area
                                type="monotone"
                                dataKey={nomCle}
                                name={compte.compte}
                                hide={isHidden}
                                stroke={color}
                                fill={`url(#colorGradMob-${index})`}
                                fillOpacity={1}
                                strokeWidth={2}
                                connectNulls={false}
                                dot={{ r: 3, fill: color, strokeWidth: 1, stroke: 'var(--text-main)' }}
                                isAnimationActive={false}
                              />
                              <Area
                                type="monotone"
                                dataKey={`PROJ_${nomCle}`}
                                name={`${compte.compte} (Prévu)`}
                                legendType="none"
                                hide={isHidden}
                                stroke={color}
                                strokeDasharray="4 4"
                                fill={`url(#colorGradProjMob-${index})`}
                                fillOpacity={1}
                                strokeWidth={2}
                                connectNulls={false}
                                dot={{ r: 2.5, fill: color }}
                                isAnimationActive={false}
                              />
                            </React.Fragment>
                          );
                        })}

                      <Area
                        type="monotone"
                        dataKey="soldeTotal"
                        stroke="var(--text-main)"
                        strokeWidth={3}
                        fill="transparent"
                        name="PATRIMOINE TOTAL"
                        hide={!!hiddenComptes["PATRIMOINE TOTAL"]}
                        dot={{ r: 3, fill: 'var(--text-main)', strokeWidth: 1, stroke: 'var(--text-main)' }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />

                      <Area
                        type="monotone"
                        dataKey="soldeProjete"
                        stroke="#38bdf8"
                        strokeDasharray="4 4"
                        strokeWidth={2.5}
                        fill="transparent"
                        name="PATRIMOINE TOTAL (Prévu)"
                        legendType="none"
                        hide={!!hiddenComptes["PATRIMOINE TOTAL"]}
                        dot={{ r: 3, fill: '#38bdf8' }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
                </>
                )}

              </div>
            ) : (
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-xl p-2">
                <GestionEpargneProjet
                  soldeGlobal={soldeGlobal}
                  allocations={allocations}
                  setAllocations={setAllocations}
                  projets={projets}
                  setProjets={setProjets}
                  transactions={toutesLesTransactions} 
                  recapAnnuelStats={recapAnnuelStats}
                  filters={filters}
                  api={api}
                  comptesDuProfil={comptesDuProfil}
                />
              </div>
            )}
          </div>
        )}

        {/* MODALE D'ÉDITION MOBILE DE TRANSACTION */}
        {editingTransaction && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 bg-black/80 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-200">
            <div 
              className="w-full bg-[var(--surface)] border border-white/10 rounded-2xl p-5 max-h-[85vh] overflow-y-auto space-y-3 animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div>
                  <h4 className="text-[11px] font-black uppercase text-[var(--secondary)] tracking-widest">Éditer la transaction</h4>
                  <p className="text-[8px] text-white/30 uppercase font-black">Modification express</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setEditingTransaction(null)} 
                  className="p-1 bg-white/5 rounded-lg text-white/40 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                  <input 
                    type="text"
                    value={editingTransaction.nom || editingTransaction.libelle || ''}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, nom: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                    <input 
                      type="number"
                      value={editingTransaction.montant}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, montant: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Compte</label>
                    <select 
                      value={editingTransaction.compte}
                      onChange={(e) => setEditingTransaction({ ...editingTransaction, compte: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                    >
                      {(comptes || []).map(c => (
                        <option key={c.compte} value={c.compte}>{c.compte}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[8px] uppercase font-black text-white/40 block mb-1">Catégorie</label>
                  <select 
                    value={editingTransaction.categorie || "Autre"}
                    onChange={(e) => setEditingTransaction({ ...editingTransaction, categorie: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white outline-none"
                  >
                    {categoriesVisibles?.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    )) || (
                      <option value={editingTransaction.categorie}>{editingTransaction.categorie}</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-2.5 bg-white/5 text-white/70 text-[9px] font-black uppercase tracking-widest rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={handleSaveMobileTx}
                  className="flex-1 py-2.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}