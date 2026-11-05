import { Trash2 } from 'lucide-react';

// Confirmation avant de supprimer la sélection.
function FenetreSuppressionSelection({ catToDelete, confirmDeletecat, setShowDeleteConfirm }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay flouté */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
        onClick={() => setShowDeleteConfirm(false)}
      />
      
      {/* Boîte de dialogue */}
      <div className="relative bg-[var(--surface)] border border-white/10 p-8 rounded-[calc(var(--radius)*1.333)] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
            <Trash2 size={28} className="text-rose-500" />
          </div>
          
          <h3 className="text-[var(--text-main)] text-xl font-black mb-2">Supprimer ?</h3>
          <p className="text-[var(--text-main)]/40 text-sm leading-relaxed mb-8">
            Voulez-vous vraiment supprimer la catégorie <span className="text-[var(--text-main)] font-bold">"{catToDelete}"</span> ? Cette action est irréversible.
          </p>
          
          <div className="flex gap-3 w-full">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-6 py-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] text-xs font-black uppercase transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={confirmDeletecat} // <--- Appel de la fonction de suppression réelle
              className="flex-1 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-xs font-black uppercase transition-all"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FenetreSuppressionSelection;
