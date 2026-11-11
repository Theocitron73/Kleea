import { useState } from 'react';
import { Calendar, Tag, Trash2 } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const BOUTON = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold transition-colors cursor-pointer';
const ELEMENT = 'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium text-left text-[var(--text-main)]/85 hover:bg-white/5 cursor-pointer';

// Barre flottante des transactions sélectionnées : catégorie, mois ou suppression pour toutes à la fois.
function BarreActionsTransactions({ handleDeleteSelected, selectedIds, setSelectedIds, updateCell, categoriesVisibles = [] }) {
  const [menu, setMenu] = useState(null);
  const [occupe, setOccupe] = useState(false);

  const appliquer = async (champ, valeur) => {
    setMenu(null);
    setOccupe(true);
    try {
      for (const id of selectedIds) await updateCell(id, champ, valeur);
      setSelectedIds([]);
    } finally {
      setOccupe(false);
    }
  };

  const liste = (elements) => (
    <div role="menu" className="absolute bottom-full mb-2 left-0 w-56 max-h-72 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl bg-[var(--surface)] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
      {elements}
    </div>
  );

  return (
    <div role="toolbar" aria-label="Actions sur la sélection" className="fixed bottom-24 inset-x-3 md:inset-x-auto md:bottom-10 md:left-1/2 md:-translate-x-1/2 z-[1050] animate-in fade-in slide-in-from-bottom-10">
      <div className="bg-[var(--surface)]/90 backdrop-blur-[var(--glass-blur)] border border-white/10 pl-3 md:pl-5 pr-2 py-2 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-wrap md:flex-nowrap justify-center items-center gap-1">
        <span className="text-[13px] font-semibold text-[var(--text-main)] mr-3 tabular-nums">
          {selectedIds.length} {selectedIds.length > 1 ? 'sélectionnées' : 'sélectionnée'}
        </span>

        {updateCell && (
          <>
            <div className="relative">
              <button type="button" disabled={occupe} onClick={() => setMenu(menu === 'categorie' ? null : 'categorie')} className={`${BOUTON} text-[var(--text-main)] hover:bg-white/10`}>
                <Tag size={14} /> Catégorie
              </button>
              {menu === 'categorie' && liste(categoriesVisibles.map((c) => (
                <button key={c} type="button" onClick={() => appliquer('categorie', c)} className={ELEMENT}>
                  <CategoryIcon name={c} size={12} /> <span className="truncate">{getCleanCategoryName(c)}</span>
                </button>
              )))}
            </div>
            <div className="relative">
              <button type="button" disabled={occupe} onClick={() => setMenu(menu === 'mois' ? null : 'mois')} className={`${BOUTON} text-[var(--text-main)] hover:bg-white/10`}>
                <Calendar size={14} /> Mois
              </button>
              {menu === 'mois' && liste(MOIS.map((m) => (
                <button key={m} type="button" onClick={() => appliquer('mois', m)} className={ELEMENT}>
                  <Calendar size={13} className="opacity-60" /> {m === 'Aout' ? 'Août' : m}
                </button>
              )))}
            </div>
          </>
        )}

        <button type="button" onClick={handleDeleteSelected} className={`${BOUTON} text-rose-400 hover:bg-rose-500/15`}>
          <Trash2 size={14} /> Supprimer la sélection
        </button>
        <button type="button" onClick={() => setSelectedIds([])} className={`${BOUTON} text-[var(--text-main)]/50 hover:text-[var(--text-main)]`}>
          Annuler
        </button>
      </div>
    </div>
  );
}

export default BarreActionsTransactions;
