import { useEffect, useState } from 'react';
import { Calculator, ChevronRight, LayoutGrid, LogOut, Palette, StickyNote, X } from 'lucide-react';

// Les quatre pages les plus utilisées restent sous le pouce ; les autres passent dans « Plus ».
const PRINCIPALES = ['dashboard', 'previsionnel', 'gerer', 'comptes'];
const WIDGETS = [
  { id: 'notepad', label: 'Bloc-notes', icon: StickyNote },
  { id: 'prorata', label: 'Simulateur Prorata', icon: Calculator },
  { id: 'theme', label: 'Couleurs Graphiques', icon: Palette },
];

/** Ouvre un widget de UnifiedWidgets : sur téléphone, il n'a pas de bouton flottant. */
const ouvrirWidget = (id) => window.dispatchEvent(new CustomEvent('kleea:widget', { detail: id }));

export default function BarresMobile({ activeTab, handleLogout, setActiveTab, user, visibleMenuItems }) {
  const [plusOuvert, setPlusOuvert] = useState(false);
  const principales = PRINCIPALES.map((id) => visibleMenuItems.find((item) => item.id === id)).filter(Boolean);
  const autres = visibleMenuItems.filter((item) => !principales.includes(item));
  const plusActif = !principales.some((item) => item.id === activeTab);

  useEffect(() => {
    if (!plusOuvert) return undefined;
    const fermer = (e) => { if (e.key === 'Escape') setPlusOuvert(false); };
    window.addEventListener('keydown', fermer);
    return () => window.removeEventListener('keydown', fermer);
  }, [plusOuvert]);

  const aller = (id) => {
    setActiveTab(id);
    setPlusOuvert(false);
    window.scrollTo({ top: 0 });
  };

  const onglet = (actif) => `relative flex-1 min-w-0 h-14 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
    actif ? 'text-[var(--text-main)]' : 'text-[var(--text-main)]/45 active:text-[var(--text-main)]/70'
  }`;

  return (
    <>
      <div className="barre-onglets-mobile md:hidden fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-[var(--glass-blur)] border-t border-white/10">
        <div className="flex items-stretch max-w-lg mx-auto px-1">
          {principales.map((item) => {
            const Icon = item.icon;
            const actif = activeTab === item.id;
            return (
              <button key={item.id} type="button" onClick={() => aller(item.id)} aria-current={actif ? 'page' : undefined} className={onglet(actif)}>
                {actif && <span aria-hidden="true" className="absolute top-0 w-8 h-0.5 rounded-full bg-[var(--primary)]" />}
                <Icon size={22} strokeWidth={actif ? 2.4 : 2} aria-hidden="true" />
                <span className="text-[11px] font-semibold leading-none truncate max-w-full px-0.5">{item.label}</span>
              </button>
            );
          })}
          <button type="button" onClick={() => setPlusOuvert(true)} aria-expanded={plusOuvert} aria-current={plusActif ? 'page' : undefined} className={onglet(plusActif)}>
            {plusActif && <span aria-hidden="true" className="absolute top-0 w-8 h-0.5 rounded-full bg-[var(--primary)]" />}
            <LayoutGrid size={22} strokeWidth={plusActif ? 2.4 : 2} aria-hidden="true" />
            <span className="text-[11px] font-semibold leading-none">Plus</span>
          </button>
        </div>
      </div>

      {plusOuvert && (
        <div className="md:hidden fixed inset-0 z-[1100] flex flex-col justify-end">
          <button type="button" aria-label="Fermer" onClick={() => setPlusOuvert(false)} className="absolute inset-0 bg-black/60 cursor-default animate-in fade-in duration-200" />
          <div role="dialog" aria-modal="true" aria-label="Plus" className="panneau-plus-mobile relative max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--surface)] border-t border-white/10 px-4 pt-3 animate-in slide-in-from-bottom-6 duration-200">
            <div aria-hidden="true" className="mx-auto mb-3 w-10 h-1 rounded-full bg-white/20" />
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Plus</h2>
              <button type="button" onClick={() => setPlusOuvert(false)} aria-label="Fermer le panneau" className="w-10 h-10 -mr-2 flex items-center justify-center rounded-xl text-[var(--text-main)]/60 active:bg-white/10 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <button type="button" onClick={() => aller('profile')} className={`w-full flex items-center gap-3 p-3 rounded-2xl border cursor-pointer text-left ${activeTab === 'profile' ? 'bg-white/10 border-[var(--primary)]/50' : 'bg-white/5 border-white/5 active:bg-white/10'}`}>
              <span className="w-10 h-10 rounded-xl bg-[var(--primary)] flex items-center justify-center text-base font-black text-white shrink-0">
                {user?.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-semibold text-[var(--text-main)] truncate">{user}</span>
                <span className="block text-[13px] text-[var(--text-main)]/55">Mon profil et réglages</span>
              </span>
              <ChevronRight size={18} className="text-[var(--text-main)]/30 shrink-0" aria-hidden="true" />
            </button>

            {autres.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-[13px] font-semibold text-[var(--text-main)]/50">Pages</h3>
                <div className="grid grid-cols-3 gap-2">
                  {autres.map((item) => {
                    const Icon = item.icon;
                    const actif = activeTab === item.id;
                    return (
                      <button key={item.id} type="button" onClick={() => aller(item.id)} aria-current={actif ? 'page' : undefined} className={`flex flex-col items-center justify-center gap-2 h-20 rounded-2xl border cursor-pointer ${actif ? 'bg-white/10 border-[var(--primary)]/50 text-[var(--text-main)]' : 'bg-white/5 border-white/5 text-[var(--text-main)]/80 active:bg-white/10'}`}>
                        <Icon size={22} aria-hidden="true" />
                        <span className="text-[12px] font-semibold leading-tight text-center px-1">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <h3 className="mt-5 mb-2 text-[13px] font-semibold text-[var(--text-main)]/50">Outils</h3>
            <div className="rounded-2xl bg-white/5 border border-white/5 divide-y divide-white/5 overflow-hidden">
              {WIDGETS.map(({ id, label, icon }) => { const Icone = icon; return (
                <button key={id} type="button" onClick={() => { setPlusOuvert(false); ouvrirWidget(id); }} className="w-full flex items-center gap-3 px-3 h-12 text-left text-[15px] text-[var(--text-main)]/85 active:bg-white/10 cursor-pointer">
                  <Icone size={18} className="text-[var(--text-main)]/50 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight size={16} className="text-[var(--text-main)]/25" aria-hidden="true" />
                </button>
              ); })}
            </div>

            <button type="button" onClick={handleLogout} className="mt-5 mb-2 w-full h-12 flex items-center justify-center gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[15px] font-semibold text-rose-400 active:bg-rose-500/20 cursor-pointer">
              <LogOut size={18} aria-hidden="true" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </>
  );
}
