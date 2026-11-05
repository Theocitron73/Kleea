import { Trash2 } from 'lucide-react';

// Confirmation avant de supprimer un compte.
function FenetreSuppressionCompte({ confirmDelete, deleteModal, setDeleteModal }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
      {/* Overlay flou */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[var(--glass-blur)]" onClick={() => setDeleteModal({ show: false, accountName: null })} />
      
      {/* Contenu de la Modal */}
      <div className="relative bg-white rounded-[var(--radius)] p-8 max-w-sm w-full shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
          <Trash2 size={32} className="text-rose-500" />
        </div>
        
        <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer le compte ?</h3>
        <p className="text-slate-500 text-center text-sm mb-8">
          Tu es sur le point de supprimer <span className="font-bold text-slate-700">"{deleteModal.accountName}"</span>. Cette action effacera toutes les données liées.
        </p>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setDeleteModal({ show: false, accountName: null })}
            className="py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={confirmDelete}
            className="py-3 bg-rose-500 text-[var(--text-main)] rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default FenetreSuppressionCompte;
