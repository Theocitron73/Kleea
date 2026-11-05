import { useState, useEffect } from 'react';
import { SketchPicker } from 'react-color';
import { Settings2, Palette, X, StickyNote, Calculator } from 'lucide-react';
import api from '../axios';

function UnifiedWidgets({ user, userTheme, setUserTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeWidget, setActiveWidget] = useState(null); // null | 'notepad' | 'prorata' | 'theme'

  // --- ÉTATS & LOGIQUE BLOC-NOTES ---
  const [note, setNote] = useState("");
  useEffect(() => {
    if (user && activeWidget === 'notepad') {
      api.get(`/note/${user}`).then(res => setNote(res.data.texte));
    }
  }, [user, activeWidget]);

  const handleSaveNote = () => {
    api.post(`/note`, { utilisateur: user, texte: note });
  };

  // --- ÉTATS & LOGIQUE PRORATA ---
  const [salaires, setSalaires] = useState({ perso: 1800, partenaire: 1400 });
  const [depenses, setDepenses] = useState(1600);

  const totalSalaires = Number(salaires.perso) + Number(salaires.partenaire);
  const partPerso = totalSalaires > 0 ? (salaires.perso / totalSalaires) * 100 : 0;
  const aPayerPerso = (depenses * (partPerso / 100)).toFixed(2);
  const aPayerPartenaire = (depenses - aPayerPerso).toFixed(2);

  // --- ÉTATS & LOGIQUE NUANCIER THEME ---
  const [activeThemeKey, setActiveThemeKey] = useState(null);
  const handleColorChange = async (key, hex) => {
    setUserTheme(prev => ({ ...prev, [key]: hex }));
    try {
      await api.post('/save-user-theme', {
        user: user,
        element: key,
        couleur: hex
      });
    } catch (err) {
      console.error("Erreur sauvegarde couleur", err);
    }
  };

  const themeLabels = {
    color_revenus: "Revenus",
    color_depenses: "Dépenses",
    color_epargne: "Épargne",
    color_jauge: "Jauge Objectif",
    color_patrimoine: "Carte Solde"
  };

  // Gérer la fermeture globale
  const handleToggleMenu = () => {
    const nextState = !isMenuOpen;
    setIsMenuOpen(nextState);
    if (!nextState) {
      setActiveWidget(null);
      setActiveThemeKey(null);
    }
  };

  return (
        <div className="fixed bottom-24 lg:bottom-6 right-6 z-[1001] flex flex-col items-end gap-3 select-none">
      
      {/* =========================================================================
          LES FENÊTRES ACTIVES DES WIDGETS (S'OUVRENT À GAUCHE DU BARREAU DE BOUTONS)
          ========================================================================= */}
      
      {/* 📝 FENÊTRE 1 : BLOC-NOTES */}
      {activeWidget === 'notepad' && (
        <div className="absolute right-20 bottom-16 w-72 md:w-80 bg-white/95 backdrop-blur-[var(--glass-blur)] rounded-3xl shadow-2xl border border-white/20 p-4 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Bloc-notes</h4>
            <span className="text-[10px] text-emerald-500 font-bold">Auto-save activé</span>
          </div>
          <textarea
            className="w-full h-48 bg-transparent border-none focus:ring-0 text-slate-700 text-sm resize-none font-medium leading-relaxed outline-none"
            placeholder="Note vos trucs importants ici..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSaveNote}
          />
        </div>
      )}

      {/* 🧮 FENÊTRE 2 : PRORATA SIMULATEUR */}
      {activeWidget === 'prorata' && (
        <div className="absolute right-20 bottom-16 w-80 bg-[var(--surface)]/95 backdrop-blur-[var(--glass-blur)] text-[var(--text-main)] rounded-3xl border border-white/10 shadow-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Simulateur Prorata</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Mon Salaire</label>
                <input 
                  type="number" 
                  value={salaires.perso} 
                  onChange={(e) => setSalaires({...salaires, perso: e.target.value})}
                  className="w-full bg-[var(--glass-bg)] border border-white/5 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-[var(--primary)]" 
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Son Salaire</label>
                <input 
                  type="number" 
                  value={salaires.partenaire} 
                  onChange={(e) => setSalaires({...salaires, partenaire: e.target.value})}
                  className="w-full bg-[var(--glass-bg)] border border-white/5 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-[var(--primary)]" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Dépenses Communes</label>
              <input 
                type="number" 
                value={depenses} 
                onChange={(e) => setDepenses(e.target.value)}
                className="w-full bg-[var(--secondary)]/10 border border-[var(--secondary)]/30 rounded-xl text-xs font-black text-secondary-300 p-2.5 outline-none" 
              />
            </div>

            <hr className="border-white/5 my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Ma part ({partPerso.toFixed(0)}%)</span>
                <span className="font-mono font-black text-white">{aPayerPerso} €</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Sa part ({(100 - partPerso).toFixed(0)}%)</span>
                <span className="font-mono font-black text-white">{aPayerPartenaire} €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 FENÊTRE 3 : PERSONNALISATEUR DE DESIGN */}
      {activeWidget === 'theme' && (
        <div className="absolute right-20 bottom-16 w-72 bg-[var(--surface)]/95 backdrop-blur-[var(--glass-blur)] rounded-3xl shadow-2xl border border-white/10 p-5 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] text-white/40">Couleurs Graphiques</h4>
            <Palette size={12} className="text-white/20" />
          </div>

          <div className="space-y-2">
            {Object.keys(userTheme).filter(key => themeLabels[key]).map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => setActiveThemeKey(activeThemeKey === key ? null : key)}
                  className="w-full flex items-center justify-between bg-[var(--glass-bg)] hover:bg-white/[0.04] p-2.5 rounded-xl border border-white/5 transition-all"
                >
                  <span className="text-[10px] font-bold text-white/70">{themeLabels[key]}</span>
                  <div 
                    className="w-5.5 h-5.5 rounded-lg border border-white/20 shadow-md" 
                    style={{ backgroundColor: userTheme[key] }} 
                  />
                </button>

                {activeThemeKey === key && (
                  <div className="absolute right-full mr-3 bottom-0 z-[1002] animate-in zoom-in-95 duration-200">
                    <div className="fixed inset-0" onClick={() => setActiveThemeKey(null)} />
                    <SketchPicker
                      color={userTheme[key]}
                      onChangeComplete={(color) => handleColorChange(key, color.hex)}
                      disableAlpha={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* =========================================================================
          LE COLLIMATEUR DE BOUTONS FLOTTANTS (MENU VERTICAL COMMUTABLE)
          ========================================================================= */}
      
      {/* SOUS-BOUTONS DE SELECTION */}
      {isMenuOpen && (
        <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
          
          {/* BOUTON 1 : NOTE BLOC (Notepad) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'notepad' ? null : 'notepad')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'notepad' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_color-mix(in_srgb,var(--text-main)_40%,transparent)] scale-105' 
                : 'bg-[var(--primary)] text-white hover:scale-105 border border-white/5'
            }`}
            title="Bloc-notes"
          >
            <StickyNote size={18} />
          </button>

          {/* BOUTON 2 : CALCULATEUR DE PRORATA (Prorata) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'prorata' ? null : 'prorata')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'prorata' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_color-mix(in_srgb,var(--text-main)_40%,transparent)] scale-105' 
                : 'bg-indigo-600 text-white hover:scale-105 border border-white/5'
            }`}
            title="Calculateur Prorata"
          >
            <Calculator size={18} />
          </button>

          {/* BOUTON 3 : COLOR DESIGNER (Theme) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'theme' ? null : 'theme')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'theme' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_color-mix(in_srgb,var(--text-main)_40%,transparent)] scale-105' 
                : 'bg-slate-800 text-white hover:scale-105 border border-white/10'
            }`}
            title="Teintes Graphiques"
          >
            <Settings2 size={18} />
          </button>

        </div>
      )}

      {/* BOUTON MAÎTRE : DÉCLENCHEUR DU CARROUSEL */}
      <button
        onClick={handleToggleMenu}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300 pointer-events-auto ${
          isMenuOpen 
            ? 'bg-slate-900 text-white border-white/10 rotate-90 scale-95' 
            : 'bg-[var(--primary)] text-white border-transparent hover:scale-110'
        }`}
        title="Menu Widgets"
      >
        {isMenuOpen ? <X size={22} /> : <Settings2 size={22} />}
      </button>

    </div>
  );
}

export default UnifiedWidgets;
