import { Trash2 } from 'lucide-react';

// Barre flottante des prévisions sélectionnées.
function BarreActionsPrevisions({ handleDeleteSelected2, selectedIds2, setSelectedIds2 }) {
  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10">
      <div className="bg-[var(--surface)]/90 backdrop-blur-[var(--glass-blur)] border border-white/10 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6">
        
        {/* Compteur */}
        <div className="flex items-center gap-3 border-r border-white/10 pr-6">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500 blur-sm opacity-50"></div>
            <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-[var(--text-main)]">
              {selectedIds2.length}
            </span>
          </div>
          <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.2em]">Prévisions</span>
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDeleteSelected2}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-lg shadow-rose-500/10"
          >
            <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
            Supprimer
          </button>
          
          <button 
            onClick={() => setSelectedIds2([])}
            className="px-4 py-2.5 text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors text-[10px] font-black uppercase tracking-widest"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

export default BarreActionsPrevisions;
