import React, { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import { Palette, Check, Trash2, Plus, Sparkles, SlidersHorizontal, Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import api from '../axios';

export default function ThemeStudioDesktop({
  user,
  updateThemeLive,
  handleSaveThemeSQL,
  hiddenPages,
  setHiddenPages,
  activeTab,
  setActiveTab,
  userTheme,
  setUserTheme
}) {
  const [activePicker, setActivePicker] = useState(null);
  const [pickingColor, setPickingColor] = useState(null);

  // État de la bibliothèque de thèmes
  const [presets, setPresets] = useState([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [newThemeName, setNewThemeName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Charger les thèmes enregistrés
  const fetchPresets = async () => {
    try {
      const res = await api.get('/api/themes/presets');
      if (res.data) setPresets(res.data);
    } catch (err) {
      console.error("Erreur chargement presets thèmes:", err);
    } finally {
      setLoadingPresets(false);
    }
  };

  useEffect(() => {
    fetchPresets();
  }, []);

  // Appliquer un thème de la bibliothèque en 1 clic
const handleApplyPreset = async (preset) => {
    // 1. Modifie uniquement les variables CSS du site
    document.documentElement.style.setProperty('--bg-site', preset.bg_site);
    document.documentElement.style.setProperty('--primary', preset.primary_color);
    document.documentElement.style.setProperty('--text-main', preset.text_main);
    document.documentElement.style.setProperty('--radius', preset.radius);
    document.documentElement.style.setProperty('--glass-blur', preset.glass_blur);
    document.documentElement.style.setProperty('--glass-bg', preset.glass_bg);

    // 2. Persistance en base
    try {
      await api.post(`/api/themes/presets/${preset.id}/apply`);
      setPresets(prev => prev.map(p => ({ ...p, is_active: p.id === preset.id })));
      toast.success(`Thème « ${preset.nom} » activé ! ✨`);
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde du thème actif.");
    }
  };

  // Enregistrer le thème actuel sous un nouveau nom
const handleCreatePreset = async (e) => {
    e.preventDefault();
    const cleanNom = newThemeName.trim();
    if (!cleanNom) {
      toast.warning("Veuillez saisir un nom pour ce thème.");
      return;
    }

    setSavingPreset(true);
    const styles = getComputedStyle(document.documentElement);
    
    // 🟢 Uniquement l'habillage du site
    const payload = {
      nom: cleanNom,
      bg_site: styles.getPropertyValue('--bg-site').trim() || '#152c48',
      primary_color: styles.getPropertyValue('--primary').trim() || '#4f46e5',
      text_main: styles.getPropertyValue('--text-main').trim() || '#ffffff',
      radius: styles.getPropertyValue('--radius').trim() || '1.5rem',
      glass_blur: styles.getPropertyValue('--glass-blur').trim() || '12px',
      glass_bg: styles.getPropertyValue('--glass-bg').trim() || 'rgba(255, 255, 255, 0.03)'
    };

    try {
      await api.post('/api/themes/presets', payload);
      toast.success(`Thème « ${cleanNom} » sauvegardé ! 💾`);
      setNewThemeName('');
      fetchPresets();
    } catch (err) {
      toast.error("Erreur lors de la sauvegarde du thème.");
    } finally {
      setSavingPreset(false);
    }
  };

  // Supprimer un thème personnalisé
  const handleDeletePreset = async (presetId, presetNom) => {
    if (!window.confirm(`Supprimer définitivement le thème « ${presetNom} » de votre bibliothèque ?`)) return;
    try {
      await api.delete(`/api/themes/presets/${presetId}`);
      setPresets(prev => prev.filter(p => p.id !== presetId));
      toast.success("Thème supprimé.");
    } catch (err) {
      toast.error("Impossible de supprimer ce thème.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 select-none pb-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* ==========================================================
            COLONNE GAUCHE (7 cols) : BIBLIOTHÈQUE + ÉDITION FINE
            ========================================================== */}
        <div className="lg:col-span-7 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            
            {/* Header du Studio */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1 bg-[var(--primary)] rounded-full shadow-[0_0_10px_var(--primary)]" />
                <div>
                  <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">
                    Studio de Design & Thèmes
                  </h2>
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">
                    Bibliothèque de presets et personnalisation
                  </p>
                </div>
              </div>
            </div>

            {/* 🌟 SECTION 1 : BIBLIOTHÈQUE DE THÈMES (CHOIX EN 1 CLIC) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-1.5">
                  <Bookmark size={13} />
                  <span>Bibliothèque de thèmes enregistrés</span>
                </span>
                <span className="text-[8px] font-mono text-white/30 uppercase font-bold">
                  {presets.length} thème(s)
                </span>
              </div>

              {/* Grille des thèmes enregistrés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
                {presets.map((preset) => {
                  const isActive = Boolean(preset.is_active);

                  return (
                    <div 
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`group p-3 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 ${
                        isActive
                          ? 'bg-white/[0.06] border-[var(--primary)] shadow-[0_0_20px_rgba(var(--primary-rgb),0.15)] ring-1 ring-[var(--primary)]/50'
                          : 'bg-black/30 border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Ligne Haut : Nom + Pastilles de couleur */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {/* Pastille visuelle aperçu */}
                          <div 
                            className="w-5 h-5 rounded-lg border border-white/30 shrink-0 shadow-sm"
                            style={{ backgroundColor: preset.bg_site }}
                          >
                            <div 
                              className="w-2.5 h-2.5 rounded-full m-auto mt-1 border border-white/40"
                              style={{ backgroundColor: preset.primary_color }}
                            />
                          </div>
                          
                          <span className={`text-[10.5px] font-bold truncate uppercase ${
                            isActive ? 'text-white' : 'text-white/70 group-hover:text-white'
                          }`}>
                            {preset.nom}
                          </span>
                        </div>

                        {/* Actions à droite */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[7px] font-black uppercase tracking-wider flex items-center gap-0.5">
                              <Check size={9} strokeWidth={3} /> Actif
                            </span>
                          )}

                          {/* Bouton supprimer */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(preset.id, preset.nom);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-all cursor-pointer"
                            title="Supprimer ce thème"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Ligne Bas : Indicateurs des teintes */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 text-[7px] font-mono text-white/30">
                        <span>Arrondi: {preset.radius}</span>
                        <span>•</span>
                        <span>Flou: {preset.glass_blur}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulaire : Sauvegarder la configuration actuelle comme nouveau thème */}
              <form onSubmit={handleCreatePreset} className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Enregistrer le thème actuel sous le nom..."
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 focus:border-[var(--primary)]/60 text-xs text-white rounded-xl px-3 py-2 outline-none font-medium placeholder:text-white/20"
                />
                <button
                  type="submit"
                  disabled={savingPreset || !newThemeName.trim()}
                  className="px-4 py-2 bg-[var(--primary)] hover:brightness-110 disabled:opacity-40 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-[var(--primary)]/20 cursor-pointer"
                >
                  <Plus size={13} strokeWidth={3} />
                  <span>Sauvegarder</span>
                </button>
              </form>
            </div>

            <div className="border-t border-white/5 my-2" />

            {/* 🛠️ SECTION 2 : PERSONNALISATION FINE DES COULEURS & SLIDERS */}
            <div className="space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--primary)] flex items-center gap-1.5 pl-1">
                <SlidersHorizontal size={13} />
                <span>Ajustements fins des couleurs & structure</span>
              </span>

              {/* Nuancier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'bg', label: 'Arrière-plan site', var: '--bg-site', alpha: false },
                  { id: 'primary', label: 'Accent Primaire', var: '--primary', alpha: false },
                  { id: 'text', label: 'Texte Principal', var: '--text-main', alpha: false },
                  { id: 'glassBg', label: 'Fond des blocs (Glass)', var: '--glass-bg', alpha: true }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] border border-white/5 rounded-xl">
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-[var(--text-main)]/60">{item.label}</span>
                    <div className="relative">
                      <button 
                        type="button"
                        onClick={() => setActivePicker(activePicker === item.id ? null : item.id)}
                        className="w-8 h-4 rounded-full border border-white/20 shadow-inner cursor-pointer transition-transform hover:scale-110"
                        style={{ backgroundColor: `var(${item.var})` }}
                      />
                      {activePicker === item.id && (
                        <div className="absolute z-50 top-6 right-0 shadow-2xl animate-in zoom-in-95 duration-200">
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

              {/* Sliders Arrondi & Flou */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between mb-2">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-white/55">Arrondi des cartes</label>
                    <span className="text-[9.5px] font-mono font-bold text-[var(--primary)]">
                      {getComputedStyle(document.documentElement).getPropertyValue('--radius')}
                    </span>
                  </div>
                  <input 
                    type="range" min="0" max="3" step="0.1" 
                    defaultValue={parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 1.5}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                    onChange={(e) => updateThemeLive('--radius', `${e.target.value}rem`)} 
                  />
                </div>

                <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col justify-between">
                  <div className="flex justify-between mb-2">
                    <label className="text-[8.5px] font-black uppercase tracking-wider text-white/55">Intensité du flou</label>
                    <span className="text-[9.5px] font-mono font-bold text-[var(--primary)]">
                      {getComputedStyle(document.documentElement).getPropertyValue('--glass-blur') || '12px'}
                    </span>
                  </div>
                  <input 
                    type="range" min="0" max="40" step="1" 
                    defaultValue={parseInt(getComputedStyle(document.documentElement).getPropertyValue('--glass-blur')) || 12}
                    className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                    onChange={(e) => updateThemeLive('--glass-blur', `${e.target.value}px`)} 
                  />
                </div>
              </div>
            </div>

          </div>

          <button 
            type="button"
            onClick={handleSaveThemeSQL}
            className="w-full mt-4 py-3 bg-[var(--primary)] text-[var(--text-main)] rounded-2xl font-black text-[9.5px] uppercase tracking-[0.25em] hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[var(--primary)]/20 cursor-pointer"
          >
            Sauvegarder les modifications courantes
          </button>
        </div>

        {/* ==========================================================
            COLONNE DROITE (5 cols) : STRUCTURE DU MENU
            ========================================================== */}
        <div className="lg:col-span-5 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl flex flex-col justify-between">
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
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

            <p className="text-[9px] text-[var(--text-main)]/40 font-black uppercase tracking-wider mb-2 leading-relaxed italic">
              Cochez ou décochez les pages pour les masquer instantanément sur ordinateur et mobile.
            </p>

            <div className="space-y-2 flex-1 overflow-y-auto pr-1 max-h-[500px] lg:max-h-none custom-scrollbar">
              {[
                { id: 'dashboard', label: 'Tableau de bord', desc: 'Vue générale, flux et budgets' },
                { id: 'gerer', label: 'Historique & Gestion', desc: 'Tableau d\'historique et saisie' },
                { id: 'importer', label: 'Importer', desc: 'Liaison Powens et formats bancaires' },
                { id: 'previsionnel', label: 'Prévisionnel', desc: 'Anticipation et projections' },
                { id: 'comptes', label: 'Comptes', desc: 'Soldes initiaux et intérêts' },
                { id: 'tricount', label: 'Tricount', desc: 'Frais partagés et bilans' },
                { id: 'Guide', label: 'Guide', desc: 'Documentation de l\'application' },
                { id: 'demenagement', label: 'Déménagement', desc: 'Simulateur budgétaire' },
              ].map((page) => {
                const isPageActive = !hiddenPages.includes(page.id);

                return (
                  <div 
                    key={page.id} 
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
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