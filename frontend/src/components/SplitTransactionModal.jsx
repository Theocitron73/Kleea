import React, { useState, useEffect, useMemo } from 'react';
import { Scissors, Plus, Trash2, X, Check, Tag, WalletCards, ArrowRight, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import CustomSelect from './CustomSelect';

export default function SplitTransactionModal({
  isOpen,
  onClose,
  transaction,
  categoriesVisibles = [],
  allocations = [],
  onSuccess
}) {
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState([]);

  const montantTotalAbs = useMemo(() => {
    return Math.abs(parseFloat(transaction?.montant) || 0);
  }, [transaction]);

  const isDepense = (parseFloat(transaction?.montant) || 0) < 0;

  // Initialisation à l'ouverture
  useEffect(() => {
    if (transaction && isOpen) {
      const demiMontant = Math.round((montantTotalAbs / 2) * 100) / 100;
      const reste = Math.round((montantTotalAbs - demiMontant) * 100) / 100;

      setParts([
        {
          nom: `${transaction.nom || "Dépense"} (Partie 1)`,
          montant: demiMontant.toFixed(2),
          categorie: transaction.categorie || "Alimentation",
          enveloppe: transaction.enveloppe || ""
        },
        {
          nom: `${transaction.nom || "Dépense"} (Partie 2)`,
          montant: reste.toFixed(2),
          categorie: "Autre",
          enveloppe: ""
        }
      ]);
    }
  }, [transaction, isOpen, montantTotalAbs]);

  if (!isOpen || !transaction) return null;

  // Calculs en temps réel
  const totalVentile = parts.reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
  const resteAVentiler = Math.round((montantTotalAbs - totalVentile) * 100) / 100;
  const estEquilibre = Math.abs(resteAVentiler) < 0.009;

  // Ajouter une sous-partie
  const handleAddPart = () => {
    setParts(prev => [
      ...prev,
      {
        nom: `${transaction.nom} (Partie ${prev.length + 1})`,
        montant: resteAVentiler > 0 ? resteAVentiler.toFixed(2) : "0.00",
        categorie: "Autre",
        enveloppe: ""
      }
    ]);
  };

  // Supprimer une sous-partie
  const handleRemovePart = (index) => {
    if (parts.length <= 2) {
      toast.warning("Une ventilation doit comporter au moins 2 sous-parties.");
      return;
    }
    setParts(prev => prev.filter((_, i) => i !== index));
  };

  // Mise à jour d'un champ
  const handleUpdatePart = (index, field, value) => {
    setParts(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // Équilibrer automatiquement sur la dernière ligne
  const handleAutoBalance = () => {
    if (parts.length === 0) return;
    const lastIdx = parts.length - 1;
    const autresLignes = parts.slice(0, lastIdx).reduce((sum, p) => sum + (parseFloat(p.montant) || 0), 0);
    const balance = Math.max(0, Math.round((montantTotalAbs - autresLignes) * 100) / 100);
    handleUpdatePart(lastIdx, 'montant', balance.toFixed(2));
  };

  // Envoi au backend
  // Envoi au backend
  const handleSubmitSplit = async () => {
    if (!estEquilibre) {
      toast.error(`Déséquilibre : il reste ${Math.abs(resteAVentiler).toFixed(2)}€ à ajuster.`);
      return;
    }

    setLoading(true);
    let success = false;

    // 1. Appel API backend
    try {
      const payloadParts = parts.map(p => ({
        nom: p.nom.trim(),
        montant: isDepense ? -Math.abs(parseFloat(p.montant) || 0) : Math.abs(parseFloat(p.montant) || 0),
        categorie: p.categorie,
        enveloppe: p.enveloppe || null
      }));

      await api.post(`/transactions/${transaction.id}/split`, { parts: payloadParts });
      toast.success("Transaction Divisée avec succès ! ✨");
      success = true;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de la Division.");
      setLoading(false);
      return;
    }

    // 2. Rafraîchissement sécurisé de l'interface
    if (success) {
      try {
        if (typeof onSuccess === 'function') await onSuccess();
      } catch (refreshErr) {
        console.error("Erreur rafraîchissement :", refreshErr);
      }
      setLoading(false);
      onClose();
    }
  };

  // Annuler une ventilation existante
  const handleUnsplit = async () => {
    if (!transaction.split_id) return;
    setLoading(true);
    let success = false;

    try {
      await api.post(`/transactions/unsplit/${transaction.split_id}`);
      toast.success("Division annulée : écriture originale restaurée ! 🔄");
      success = true;
    } catch (err) {
      toast.error("Impossible d'annuler la Division.");
      setLoading(false);
      return;
    }

    if (success) {
      try {
        if (typeof onSuccess === 'function') await onSuccess();
      } catch (refreshErr) {
        console.error("Erreur rafraîchissement :", refreshErr);
      }
      setLoading(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-2xl bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Scissors size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Diviser la Transaction (Split)
              </h3>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
                Diviser en plusieurs sous-catégories
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* RÉCAP DE LA TRANSACTION D'ORIGINE */}
        <div className="my-4 p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 truncate pr-2">
            <CategoryIcon name={transaction.categorie} size={15} />
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{transaction.nom}</span>
              <span className="text-[8px] font-mono uppercase text-white/30">{transaction.compte} • {transaction.date}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[8px] font-black uppercase text-white/30 block">Montant à répartir</span>
            <span className={`text-base font-mono font-black ${isDepense ? 'text-rose-400' : 'text-emerald-400'}`}>
              {montantTotalAbs.toFixed(2)} €
            </span>
          </div>
        </div>

        {/* LISTE DES SOUS-PARTIES */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-0">
          {parts.map((part, idx) => (
            <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2.5 relative group">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                  Partie #{idx + 1}
                </span>

                {parts.length > 2 && (
                  <button 
                    type="button"
                    onClick={() => handleRemovePart(idx)}
                    className="p-1 text-white/30 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Supprimer cette part"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                {/* Libellé de la part */}
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-white/40 block">Libellé</label>
                  <input
                    type="text"
                    value={part.nom}
                    onChange={(e) => handleUpdatePart(idx, 'nom', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Montant de la part */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-white/40 block">Montant (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={part.montant}
                    onChange={(e) => handleUpdatePart(idx, 'montant', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white text-right outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Catégorie */}
                <div className="sm:col-span-4 space-y-1">
                  <label className="text-[7.5px] font-black uppercase tracking-wider text-white/40 block">Catégorie</label>
                  <CustomSelect
                    value={part.categorie}
                    options={categoriesVisibles.map(c => ({ v: c, l: c }))}
                    onChange={(val) => handleUpdatePart(idx, 'categorie', val)}
                    icon={Tag}
                    className="p-1.5 px-2 rounded-xl text-[9px] h-8"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Bouton ajouter une ligne */}
          <button
            type="button"
            onClick={handleAddPart}
            className="w-full py-2.5 border border-dashed border-white/10 hover:border-indigo-500/40 rounded-xl text-[9px] font-black uppercase tracking-wider text-white/40 hover:text-indigo-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} strokeWidth={3} />
            <span>Ajouter une sous-catégorie</span>
          </button>
        </div>

        {/* BARRE D'ÉQUILIBRE FINANCIER */}
        <div className="my-3 p-3 rounded-2xl border flex items-center justify-between shrink-0 select-none transition-all duration-300"
          style={{
            backgroundColor: estEquilibre ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            borderColor: estEquilibre ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'
          }}
        >
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${estEquilibre ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}`} />
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-wider ${estEquilibre ? 'text-emerald-300' : 'text-rose-300'}`}>
                {estEquilibre ? "✓ Équilibre parfait" : resteAVentiler > 0 ? "Sous-alloué" : "Trop alloué"}
              </span>
              <span className="text-[8px] text-white/40 font-mono">
                Divisé : {totalVentile.toFixed(2)}€ / {montantTotalAbs.toFixed(2)}€
              </span>
            </div>
          </div>

          {!estEquilibre && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black text-rose-400">
                {resteAVentiler > 0 ? `+${resteAVentiler.toFixed(2)}€ restant` : `${resteAVentiler.toFixed(2)}€ en trop`}
              </span>
              <button
                type="button"
                onClick={handleAutoBalance}
                className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                title="Ajuste la dernière ligne automatiquement"
              >
                Équilibrer
              </button>
            </div>
          )}
        </div>

        {/* ACTIONS DU BAS */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 shrink-0">
          {transaction.split_id ? (
            <button
              type="button"
              onClick={handleUnsplit}
              disabled={loading}
              className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw size={12} />
              <span>Annuler la Division</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              Fermer
            </button>

            <button
              type="button"
              onClick={handleSubmitSplit}
              disabled={!estEquilibre || loading}
              className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} strokeWidth={3} />
              <span>{loading ? "Division..." : "Valider le split"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}