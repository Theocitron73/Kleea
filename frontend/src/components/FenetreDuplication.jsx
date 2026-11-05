import { Copy } from 'lucide-react';

// Confirmation avant de dupliquer des prévisions.
function FenetreDuplication({ duplicateModal, handleConfirmDuplicate, setDuplicateModal }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay flou */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
        onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })}
      />
      
      {/* Contenu du Modal */}
      <div className="relative bg-[var(--surface)] border border-white/10 p-8 rounded-[calc(var(--radius)*1.333)] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          {/* Badge Icône Émeraude */}
          <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4 animate-pulse">
            {/* Remplace Copy par RefreshCw ou l'icône de ton choix si nécessaire */}
            <Copy size={32} />
          </div>
          
          <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-tighter mb-2精确">
            Dupliquer les prévisions ?
          </h3>
          
          <p className="text-[var(--text-main)]/40 text-xs leading-relaxed mb-8">
            Êtes-vous sûr de vouloir copier les <span className="text-emerald-400 font-black">{duplicateModal.count}</span> prévisions {duplicateModal.isSelection ? 'sélectionnées' : 'de ce mois'} vers le mois prochain ? 
            <br />
            <span className="opacity-60 text-[10px]">Les montants, catégories et comptes associés seront conservés à l'identique.</span>
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })}
              className="py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-[var(--text-main)] transition-all cursor-pointer"
            >
              Annuler
            </button>
            
            <button 
              onClick={handleConfirmDuplicate}
              className="py-3 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
            >
              Dupliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FenetreDuplication;
