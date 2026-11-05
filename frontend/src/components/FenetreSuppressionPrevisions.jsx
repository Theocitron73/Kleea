import { Trash2 } from 'lucide-react';
import api from '../axios';

// Confirmation avant de supprimer des prévisions.
function FenetreSuppressionPrevisions({ deleteModal3, fetchAllocations, filters, setDeleteModal3 }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay flou */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
        onClick={() => setDeleteModal3({ show: false, projetNom: null })}
      />
      
      {/* Contenu du Modal */}
      <div className="relative bg-[var(--surface)] border border-white/10 p-8 rounded-[calc(var(--radius)*1.333)] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 mb-4">
            <Trash2 size={32} />
          </div>
          
          <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-tighter mb-2">
            Supprimer l'enveloppe ?
          </h3>
          
          <p className="text-[var(--text-main)]/40 text-xs leading-relaxed mb-8">
            Êtes-vous sûr de vouloir supprimer <span className="text-[var(--text-main)] font-bold">"{deleteModal3.projetNom}"</span> ? 
            Cette action est irréversible et libérera les fonds dans votre solde global.
          </p>

          <div className="grid grid-cols-2 gap-3 w-full">
            <button 
              onClick={() => setDeleteModal3({ show: false, projetNom: null })}
              className="py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--glass-bg)] transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={async () => {
                await api.delete(`/delete-enveloppe/${deleteModal3.projetNom}?profil=${filters.profil}`);
                fetchAllocations();
                setDeleteModal3({ show: false, projetNom: null });
              }}
              className="py-3 rounded-xl bg-rose-500 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FenetreSuppressionPrevisions;
