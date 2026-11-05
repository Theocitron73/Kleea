import { Sparkles, Scissors, Scale, RotateCcw } from 'lucide-react';

// Notes de la version en cours.
function NotesDeVersion({ CURRENT_VERSION, handleClosePatchModal }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-200 select-none">
      
      <div className="w-full max-w-lg bg-[var(--surface)] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* 1. EN-TÊTE OFFICIEL DE LA MISE À JOUR */}
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-500/15 border border-secondary-500/30 flex items-center justify-center text-secondary-400 shadow-[0_0_15px_color-mix(in_srgb,var(--secondary)_20%,transparent)] shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest bg-secondary-500/10 px-2 py-0.5 rounded-sm border border-secondary-500/20">
                  Notes de version
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">v{CURRENT_VERSION}</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                Nouveautés & Améliorations
              </h3>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 mb-6 text-left">
          
          {/* 2. EXPLICATION DU CONTEXTE (POURQUOI CETTE MISE À JOUR ?) */}
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase text-white/90 tracking-wider">
              Suivi budgétaire multi-catégories
            </h4>
            <p className="text-[11px] text-white/60 leading-relaxed font-medium">
              Dans la vie quotidienne, un seul paiement en magasin regroupe souvent des achats de nature différente. Pour vous offrir une comptabilité ultra-précise, Kleea vous permet désormais de <strong>diviser une dépense unique en plusieurs sous-catégories</strong>.
            </p>
          </div>

          {/* 3. EXEMPLE CONCRET D'APPLICATION */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <div className="flex justify-between items-center text-[8px] font-black uppercase text-amber-300 tracking-wider">
              <span>Exemple d'application</span>
              <span className="text-white/40 font-mono">Paiement réel : 90,00 €</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-bold">
              <span className="text-white/80">Carrefour (90 €)</span>
              <span className="text-secondary-400 font-black">➔</span>
              <div className="flex gap-1.5 text-[9px] font-mono shrink-0">
                <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-sm border border-emerald-500/20">60€ Alimentation</span>
                <span className="text-secondary-300 bg-secondary-500/20 px-2 py-0.5 rounded-sm border border-secondary-500/30">30€ Maison</span>
              </div>
            </div>
            
            <p className="text-[9px] text-white/40 italic">
              Vos soldes bancaires restent parfaitement exacts, tandis que vos graphiques et limites de budget reflètent la réalité de vos achats.
            </p>
          </div>

          {/* 4. CE QUI CHANGE POUR VOUS (CHANGELOG) */}
          <div className="space-y-1.5 text-[10px] text-white/70">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <Scissors size={13} className="text-secondary-400 shrink-0" />
              <span><strong>Outil Ciseaux :</strong> Accessible directement sur chaque ligne dans l'onglet <strong>Gérer</strong>.</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <Scale size={13} className="text-emerald-400 shrink-0" />
              <span><strong>Équilibrage automatique :</strong> Ajuste automatiquement le reste à répartir au centime près.</span>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <RotateCcw size={13} className="text-rose-400 shrink-0" />
              <span><strong>Annulation en 1 clic :</strong> Cliquez sur le badge violet <strong>[Divisée]</strong> pour refusionner l'écriture originale.</span>
            </div>
          </div>

        </div>

        {/* 5. BOUTON DE FERMETURE */}
        <button
          type="button"
          onClick={handleClosePatchModal}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
        >
          Découvrir la mise à jour ! 🚀
        </button>

      </div>
    </div>
  );
}

export default NotesDeVersion;
