import { Trash2 } from 'lucide-react';

// Confirmation avant de supprimer un budget.
function FenetreSuppressionBudget({ budgetToDelete, executeDeleteBudget, setBudgetToDelete }) {
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
      {/* Overlay sombre et flou */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
        onClick={() => setBudgetToDelete(null)}
      />
      
      {/* Contenu de la modale */}
      <div className="relative bg-[var(--surface)] border border-white/10 p-6 rounded-[calc(var(--radius)*1.333)] shadow-2xl max-w-xs w-full animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
            <Trash2 size={24} className="text-rose-500" />
          </div>
          
          <div>
            <h3 className="text-[var(--text-main)] text-sm font-black uppercase tracking-widest">Supprimer le budget ?</h3>
            <p className="text-[10px] text-[var(--text-main)]/40 font-bold uppercase mt-2 px-4">
              Voulez-vous vraiment retirer le budget <span className="text-rose-400">"{budgetToDelete?.nom}"</span> ?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button 
              onClick={() => setBudgetToDelete(null)}
              className="py-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={executeDeleteBudget}
              className="py-3 bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FenetreSuppressionBudget;
