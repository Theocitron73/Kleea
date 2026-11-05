import { SketchPicker } from 'react-color';
import { X, Tag } from 'lucide-react';
import { CategoryIcon, LucideIconPicker } from '../categoryIcons';

// Modification de l'icône et de la couleur d'une catégorie.
function FenetreModifCategorie({ editingCat, handleUpdateCategory, setEditingCat, setShowEditColorPicker, setShowEditIconPicker, showEditColorPicker, showEditIconPicker }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[var(--glass-blur)]" onClick={() => setEditingCat(null)} />
      
      <div className="relative w-full max-w-sm bg-[var(--surface)] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-5">
          <div>
            <h4 className="text-xs font-black uppercase text-secondary-400 tracking-widest">
              Personnaliser la catégorie
            </h4>
            <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">
              {editingCat.nom}
            </p>
          </div>
          <button onClick={() => setEditingCat(null)} className="text-white/40 hover:text-white p-1">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Prévisualisation */}
          {/* Prévisualisation dans la modale d'édition */}
            <div className="flex items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
              <CategoryIcon 
                name={editingCat.icone} 
                size={36} 
                color={editingCat.couleur} // 👈 Applique immédiatement la couleur choisie dans le SketchPicker
              />
            </div>

          {/* Sélection Icône & Couleur */}
          <div className="grid grid-cols-2 gap-3">
            {/* Bouton Choix d'icône */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowEditIconPicker(!showEditIconPicker)}
                className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Tag size={14} />
                <span>Changer d'icône</span>
              </button>

              {showEditIconPicker && (
                <LucideIconPicker 
                  selectedIcon={editingCat.icone}
                  onSelectIcon={(icon) => {
                    setEditingCat({ ...editingCat, icone: icon });
                    setShowEditIconPicker(false);
                  }}
                  onClose={() => setShowEditIconPicker(false)}
                />
              )}
            </div>

            {/* Bouton Choix de couleur */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setShowEditColorPicker(!showEditColorPicker)}
                className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor: editingCat.couleur }} />
                <span>Couleur</span>
              </button>

              {showEditColorPicker && (
                <div className="absolute z-[120] bottom-full mb-2 right-0 animate-in zoom-in-95 duration-150">
                  <div className="fixed inset-0" onClick={() => setShowEditColorPicker(false)} />
                  <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                    <SketchPicker 
                      color={editingCat.couleur} 
                      onChange={(c) => setEditingCat({ ...editingCat, couleur: c.hex })} 
                      disableAlpha 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bouton Valider */}
          <button 
            onClick={() => handleUpdateCategory(editingCat.nom, editingCat.icone, editingCat.couleur)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer mt-2"
          >
            Enregistrer les modifications
          </button>
        </div>
      </div>
    </div>
  );
}

export default FenetreModifCategorie;
