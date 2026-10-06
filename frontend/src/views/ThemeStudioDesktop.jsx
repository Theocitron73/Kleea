import React, { useState } from 'react';
import { SketchPicker } from 'react-color';

export default function ThemeStudioDesktop({
  user,
  updateThemeLive,
  handleSaveThemeSQL,
  hiddenPages,
  setHiddenPages,
  activeTab,
  setActiveTab
}) {
  const [activePicker, setActivePicker] = useState(null);
  const [pickingColor, setPickingColor] = useState(null);

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* BLOC 1 : STUDIO DE DESIGN */}
        <div className="lg:col-span-7 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="h-6 w-1 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
              <div>
                <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">
                  Studio de Design <span className="text-[var(--primary)]">3.0</span>
                </h2>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">
                  Configuration de l'identité visuelle
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] pl-1">Couleurs</span>
                <div className="space-y-2">
                  {[
                    { id: 'bg', label: 'Arrière-plan site', var: '--bg-site', alpha: false },
                    { id: 'primary', label: 'Accent Primaire', var: '--primary', alpha: false },
                    { id: 'text', label: 'Texte Principal', var: '--text-main', alpha: false },
                    { id: 'glassBg', label: 'Couleur des blocs (Glass)', var: '--glass-bg', alpha: true }
                  ].map((item) => (
                    <div key={item.id} className="group flex items-center justify-between p-3 bg-white/[0.01] border border-white/5 rounded-xl hover:bg-white/[0.03] transition-all">
                      <span className="text-[9px] font-black uppercase tracking-wider text-[var(--text-main)]/60">{item.label}</span>
                      <div className="relative">
                        <button 
                          onClick={() => setActivePicker(activePicker === item.id ? null : item.id)}
                          className="w-10 h-5 rounded-full border border-white/20 shadow-inner cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: `var(${item.var})` }}
                        />
                        {activePicker === item.id && (
                          <div className="absolute z-50 top-8 right-0 shadow-2xl animate-in zoom-in-95 duration-200">
                            <div className="fixed inset-0" onClick={() => setActivePicker(null)} />
                            <SketchPicker 
                              color={pickingColor?.id === item.id 
                                ? pickingColor.hexOrRgb 
                                : getComputedStyle(document.documentElement).getPropertyValue(item.var).trim()
                              }
                              onChange={(color) => {
                                const colorVal = item.alpha 
                                  ? `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${color.rgb.a})`
                                  : color.hex;
                                setPickingColor({ id: item.id, hexOrRgb: colorVal });
                                updateThemeLive(item.var, colorVal);
                              }}
                              disableAlpha={!item.alpha}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] pl-1">Structure & Courbe</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between mb-2">
                      <label className="text-[9px] font-black uppercase tracking-wider text-white/55">Arrondi des cartes</label>
                      <span className="text-[10px] font-mono font-bold text-[var(--primary)]">
                        {getComputedStyle(document.documentElement).getPropertyValue('--radius')}
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="3" step="0.1" 
                      defaultValue={parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 1.5}
                      className="w-full h-1.5 bg-[var(--glass-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                      onChange={(e) => updateThemeLive('--radius', `${e.target.value}rem`)} 
                    />
                  </div>

                  <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                    <div className="flex justify-between mb-2">
                      <label className="text-[9px] font-black uppercase tracking-wider text-white/55">Intensité du flou</label>
                      <span className="text-[10px] font-mono font-bold text-[var(--primary)]">
                        {getComputedStyle(document.documentElement).getPropertyValue('--glass-blur') || '12px'}
                      </span>
                    </div>
                    <input 
                      type="range" min="0" max="40" step="1" 
                      defaultValue={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--glass-blur')) || 12}
                      className="w-full h-1.5 bg-[var(--glass-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                      onChange={(e) => updateThemeLive('--glass-blur', `${e.target.value}px`)} 
                    />
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden p-4 bg-[var(--bg-site)] rounded-2xl border border-white/10 shadow-inner group">
                <div className="absolute top-0 right-0 p-1 opacity-5 font-black text-[28px] italic pointer-events-none select-none">PREVIEW</div>
                <div className="flex items-center gap-3">
                  <button className="flex-1 py-3 bg-[var(--primary)] text-[var(--text-main)] rounded-[var(--radius)] text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[var(--primary)]/10">
                    Bouton de Test
                  </button>
                  <div 
                    className="flex-[1.5] p-3 rounded-[var(--radius)] border border-white/10 shadow-xl"
                    style={{
                      backgroundColor: 'var(--glass-bg)',
                      backdropFilter: 'blur(var(--glass-blur))',
                      WebkitBackdropFilter: 'blur(var(--glass-blur))'
                    }}
                  >
                    <div className="h-1 w-6 bg-[var(--primary)] mb-1.5 rounded-full" />
                    <div className="h-1.5 w-full bg-[var(--text-main)]/20 rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button 
            onClick={handleSaveThemeSQL}
            className="w-full mt-6 py-4 bg-[var(--primary)] text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-[0.3em] hover:brightness-110 hover:saturate-150 transition-all shadow-[0_15px_30px_rgba(var(--primary-rgb),0.2)] active:scale-[0.98] cursor-pointer"
          >
            Propager le thème
          </button>
        </div>

        {/* BLOC 2 : STRUCTURE DU MENU */}
        <div className="lg:col-span-5 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-6">
              <div className="h-6 w-1 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
              <div>
                <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">
                  Structure du Menu
                </h2>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">
                  Activer ou désactiver des sections
                </p>
              </div>
            </div>

            <p className="text-[9px] text-[var(--text-main)]/40 font-black uppercase tracking-wider mb-4 leading-relaxed italic">
              Coche ou décoche les pages pour les masquer instantanément sur les versions ordinateur et mobile.
            </p>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1 max-h-[500px] lg:max-h-none">
              {[
                { id: 'dashboard', label: 'Tableau de bord', desc: 'Vue générale, flux et budgets' },
                { id: 'gerer', label: 'Historique & Gestion', desc: 'Tableau d\'historique et saisie' },
                { id: 'importer', label: 'Importer', desc: 'Liaison Powens et imports CSV' },
                { id: 'previsionnel', label: 'Prévisionnel', desc: 'Anticipation et projections' },
                { id: 'comptes', label: 'Comptes', desc: 'Soldes initiaux et intérêts' },
                { id: 'tricount', label: 'Tricount', desc: 'Frais partagés et bilans' },
                { id: 'Guide', label: 'Guide', desc: 'Tuto utilisation du site' },
                { id: 'demenagement', label: 'Déménagement', desc: 'Mon déménagement' },
              ].map((page) => {
                const isPageActive = !hiddenPages.includes(page.id);

                return (
                  <div 
                    key={page.id} 
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      isPageActive 
                        ? 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]' 
                        : 'bg-black/35 border-transparent opacity-30 select-none'
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/80">
                        {page.label}
                      </span>
                      <span className="text-[7.5px] font-bold text-[var(--text-main)]/20 uppercase tracking-tighter truncate mt-0.5">
                        {page.desc}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = hiddenPages.includes(page.id)
                          ? hiddenPages.filter(id => id !== page.id)
                          : [...hiddenPages, page.id];
                        setHiddenPages(updated);
                        localStorage.setItem('hidden_menu_pages', JSON.stringify(updated));
                        if (updated.includes(activeTab)) {
                          setActiveTab('dashboard');
                        }
                      }}
                      className={`w-9 h-4.5 rounded-full transition-all relative flex-shrink-0 cursor-pointer ${
                        isPageActive 
                          ? 'bg-[var(--primary)] shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                          : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <div 
                        className={`absolute top-[2px] w-2.5 h-2.5 bg-white rounded-full transition-all duration-300 ${
                          isPageActive ? 'left-5.5' : 'left-1'
                        }`} 
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}