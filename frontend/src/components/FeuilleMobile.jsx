import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/** Panneau qui monte du bas de l'écran, au-dessus de la navigation : les réglages d'une ligne sur téléphone. */
export default function FeuilleMobile({ titre, onFermer, children }) {
  useEffect(() => {
    const touche = (e) => { if (e.key === 'Escape') onFermer(); };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [onFermer]);

  return createPortal(
    <div className="fixed inset-0 z-[1100] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 animate-in fade-in duration-150" onClick={onFermer} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={titre}
        className="relative max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[var(--surface)] px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom duration-200">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" aria-hidden="true" />
        <div className="flex items-start gap-2 mb-3">
          <h2 className="flex-1 min-w-0 text-[15px] font-semibold text-[var(--text-main)] break-words">{titre}</h2>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="p-1.5 -mr-1 rounded-full bg-white/[0.06] text-[var(--text-main)]/60 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Une ligne du panneau : son nom à gauche, le réglage en pleine largeur dessous. */
export function Reglage({ nom, children }) {
  return (
    <div className="space-y-1">
      <span className="block text-[11px] text-[var(--text-main)]/50">{nom}</span>
      {children}
    </div>
  );
}
