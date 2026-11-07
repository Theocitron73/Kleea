import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Bell, Building2, CheckCircle2, Download, RefreshCw, Target, TrendingDown, X } from 'lucide-react';

const ICONES = { import: Download, banque: Building2, synchro: RefreshCw, decouvert: TrendingDown, budget: Target };

/** Cloche et liste des alertes. `variante` adapte la cloche à la navigation d'ordinateur ou de mobile. */
export default function CentreAlertes({ alertes = [], nombreMasquees = 0, masquer, toutReafficher, ouvrirPage, variante = 'ordinateur' }) {
  const [ouvert, setOuvert] = useState(false);
  const [ancre, setAncre] = useState({ top: 0, right: 12 });
  const bouton = useRef(null);
  const critiques = alertes.filter((a) => a.gravite === 'critique').length;

  // Le panneau suit la cloche : la navigation n'occupe pas toujours toute la largeur de l'écran.
  const placer = useCallback(() => {
    const cadre = bouton.current?.getBoundingClientRect();
    if (!cadre) return;
    setAncre({ top: cadre.bottom + 8, right: Math.max(12, document.documentElement.clientWidth - cadre.right) });
  }, []);

  useEffect(() => {
    if (!ouvert) return undefined;
    const fermer = (e) => { if (e.key === 'Escape') setOuvert(false); };
    window.addEventListener('keydown', fermer);
    window.addEventListener('resize', placer);
    return () => {
      window.removeEventListener('keydown', fermer);
      window.removeEventListener('resize', placer);
    };
  }, [ouvert, placer]);

  const libelle = alertes.length ? `Alertes : ${alertes.length} en cours` : 'Alertes : rien à signaler';
  const styleBouton = variante === 'mobile'
    ? 'md:hidden fixed top-3 right-3 z-[60] w-10 h-10 rounded-xl bg-slate-900/80 backdrop-blur-[var(--glass-blur)] border border-white/10'
    : 'relative w-9 h-9 rounded-xl hover:bg-white/10';

  return (
    <>
      <button ref={bouton} type="button" aria-label={libelle} title={libelle} aria-expanded={ouvert} onClick={() => { placer(); setOuvert(!ouvert); }} className={`shrink-0 flex items-center justify-center text-[var(--text-main)]/70 hover:text-[var(--text-main)] transition-colors cursor-pointer ${styleBouton}`}>
        <Bell size={18} />
        {alertes.length > 0 && (
          <span aria-hidden="true" className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-black text-white flex items-center justify-center ${critiques ? 'bg-rose-500' : 'bg-amber-500'}`}>
            {alertes.length}
          </span>
        )}
      </button>

      {ouvert && createPortal(
        <div className="fixed inset-0 z-[10000]" onClick={() => setOuvert(false)}>
          <section
            role="dialog"
            aria-label="Alertes"
            onClick={(e) => e.stopPropagation()}
            style={{ top: ancre.top, right: ancre.right, maxHeight: `calc(100dvh - ${ancre.top + 12}px)` }}
            className="absolute w-[calc(100vw-1.5rem)] max-w-sm flex flex-col bg-[var(--surface)] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <h2 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">Alertes</h2>
              <button type="button" aria-label="Fermer les alertes" onClick={() => setOuvert(false)} className="p-1 text-[var(--text-main)]/50 hover:text-[var(--text-main)] cursor-pointer">
                <X size={14} />
              </button>
            </header>

            <div className="overflow-y-auto custom-scrollbar p-2 space-y-1.5">
              {alertes.length === 0 && (
                <div className="flex flex-col items-center text-center gap-2 p-6">
                  <CheckCircle2 size={22} className="text-emerald-400" />
                  <p className="text-xs font-bold text-[var(--text-main)]/80">Rien à signaler</p>
                </div>
              )}
              {alertes.map((a) => {
                const Icone = ICONES[a.type] || AlertTriangle;
                const critique = a.gravite === 'critique';
                return (
                  <article key={a.id} className={`flex gap-2.5 p-2.5 rounded-xl border ${critique ? 'bg-rose-500/10 border-rose-500/25' : 'bg-amber-500/10 border-amber-500/25'}`}>
                    <Icone size={15} className={`shrink-0 mt-0.5 ${critique ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-[var(--text-main)]">{a.titre}</h3>
                      <p className="text-[11px] leading-snug text-[var(--text-main)]/70 mt-0.5">{a.detail}</p>
                      <button
                        type="button"
                        onClick={() => { setOuvert(false); ouvrirPage(a.page); }}
                        className="mt-1.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[9.5px] font-black uppercase tracking-wider text-[var(--text-main)] cursor-pointer"
                      >
                        {a.action}
                      </button>
                    </div>
                    <button type="button" aria-label={`Masquer : ${a.titre}`} title="Masquer cette alerte" onClick={() => masquer(a.id)} className="p-1 self-start shrink-0 text-[var(--text-main)]/40 hover:text-[var(--text-main)] cursor-pointer">
                      <X size={12} />
                    </button>
                  </article>
                );
              })}
            </div>

            {nombreMasquees > 0 && (
              <footer className="px-4 py-2.5 border-t border-white/5">
                <button type="button" onClick={toutReafficher} className="text-[10.5px] font-bold text-[var(--text-main)]/60 hover:text-[var(--text-main)] cursor-pointer">
                  Réafficher {nombreMasquees} alerte{nombreMasquees > 1 ? 's' : ''} masquée{nombreMasquees > 1 ? 's' : ''}
                </button>
              </footer>
            )}
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
