// src/components/ExportModal.jsx
import React, { useState, useMemo } from 'react';
import { Download, FileSpreadsheet, FileText, X, Check, Calendar, User, Wallet, Filter } from 'lucide-react';
import { exportToExcel, exportToCsv } from '../utils/exportUtils';
import { toast } from 'sonner';

export default function ExportModal({ 
  isOpen, 
  onClose, 
  toutesLesTransactions = [], 
  comptes = [], 
  filters = {}, 
  recapAnnuelStats = [], 
  statsAnnuellesCategories = [] 
}) {
  const [format, setFormat] = useState('xlsx'); // 'xlsx' | 'csv'
  const [periodeType, setPeriodeType] = useState('annee'); // 'mois' | 'annee' | 'tout'
  const [profilCible, setProfilCible] = useState(filters?.profil || 'Tous');

  // Filtrage des transactions pour l'export
  const transactionsAExporter = useMemo(() => {
    return (toutesLesTransactions || []).filter(t => {
      // 1. Filtre Profil
      if (profilCible !== 'Tous') {
        const cInfo = comptes.find(c => (c.compte || "").trim().toUpperCase() === (t.compte || "").trim().toUpperCase());
        const groupeT = cInfo ? cInfo.groupe : null;
        if (groupeT?.toLowerCase().trim() !== profilCible.toLowerCase().trim()) return false;
      }

      // 2. Filtre Période
      if (periodeType === 'mois') {
        const matchMois = (t.mois || "").toLowerCase().trim() === (filters?.mois || "").toLowerCase().trim();
        const matchAnnee = (t.annee || "").toString().trim() === (filters?.annee || "").toString().trim();
        return matchMois && matchAnnee;
      }

      if (periodeType === 'annee') {
        return (t.annee || "").toString().trim() === (filters?.annee || "").toString().trim();
      }

      return true; // 'tout' -> historique complet
    }).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [toutesLesTransactions, comptes, profilCible, periodeType, filters]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    if (transactionsAExporter.length === 0) {
      toast.warning("Aucune transaction à exporter pour ces critères.");
      return;
    }

    const baseName = `Kleea_${profilCible}_${periodeType === 'mois' ? `${filters.mois}_${filters.annee}` : periodeType === 'annee' ? filters.annee : 'Historique_Complet'}`;

    if (format === 'xlsx') {
      exportToExcel({
        transactions: transactionsAExporter,
        recapMois: recapAnnuelStats,
        statsAnnuelles: statsAnnuellesCategories,
        filename: baseName
      });
      toast.success("Classeur Excel (.xlsx) téléchargé avec succès ! 📊");
    } else {
      exportToCsv({
        transactions: transactionsAExporter,
        filename: baseName
      });
      toast.success("Fichier CSV (.csv) téléchargé avec succès ! 📄");
    }

    onClose();
  };

  const groupesDisponibles = ['Tous', ...new Set(comptes.map(c => c.groupe).filter(Boolean))];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* EN-TÊTE */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <Download size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Export Comptable</h3>
              <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
                Grand livre & synthèses financières
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-colors cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* 1. CHOIX DU FORMAT */}
        <div className="space-y-1.5">
          <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40">1. Format de fichier</label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Option Excel */}
            <button
              type="button"
              onClick={() => setFormat('xlsx')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                format === 'xlsx'
                  ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-black/30 border-white/5 text-white/40 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileSpreadsheet size={16} className={format === 'xlsx' ? 'text-emerald-400' : 'opacity-40'} />
                {format === 'xlsx' && <Check size={12} className="text-emerald-400" />}
              </div>
              <span className="text-xs font-black uppercase tracking-tight">Excel (.xlsx)</span>
              <span className="text-[7.5px] opacity-60">Multi-onglets (Bilan + Catégories)</span>
            </button>

            {/* Option CSV */}
            <button
              type="button"
              onClick={() => setFormat('csv')}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                format === 'csv'
                  ? 'bg-indigo-500/15 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : 'bg-black/30 border-white/5 text-white/40 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText size={16} className={format === 'csv' ? 'text-indigo-400' : 'opacity-40'} />
                {format === 'csv' && <Check size={12} className="text-indigo-400" />}
              </div>
              <span className="text-xs font-black uppercase tracking-tight">CSV Universel</span>
              <span className="text-[7.5px] opacity-60">UTF-8 avec séparateurs point-virgule</span>
            </button>
          </div>
        </div>

        {/* 2. CHOIX DE LA PÉRIODE */}
        <div className="space-y-1.5">
          <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40">2. Période à exporter</label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/40 border border-white/5 rounded-2xl">
            {[
              { id: 'mois', label: `${filters?.mois || 'Mois'}` },
              { id: 'annee', label: `Année ${filters?.annee || ''}` },
              { id: 'tout', label: 'Historique Total' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriodeType(p.id)}
                className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer truncate text-center ${
                  periodeType === p.id 
                    ? 'bg-white text-slate-950 shadow-md font-bold' 
                    : 'text-white/40 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. CHOIX DU PROFIL */}
        <div className="space-y-1.5">
          <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40">3. Profil budgétaire</label>
          <div className="flex flex-wrap gap-1.5">
            {groupesDisponibles.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfilCible(p)}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                  profilCible.toLowerCase() === p.toLowerCase()
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-black/30 border-white/5 text-white/40 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* RÉSUMÉ AVANT TÉLÉCHARGEMENT */}
        <div className="p-3 bg-black/30 rounded-2xl border border-white/5 flex items-center justify-between text-xs">
          <span className="text-[9px] font-bold text-white/40 uppercase">Transactions sélectionnées :</span>
          <span className="font-mono font-black text-emerald-400">
            {transactionsAExporter.length} ligne{transactionsAExporter.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* BOUTONS D'ACTION */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer"
          >
            Annuler
          </button>
          
          <button
            type="button"
            onClick={handleExecuteExport}
            className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download size={14} strokeWidth={3} />
            <span>Télécharger l'export</span>
          </button>
        </div>

      </div>
    </div>
  );
}