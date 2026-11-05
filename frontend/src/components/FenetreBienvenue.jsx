import { FileUp, Sparkles, Zap } from 'lucide-react';

// Accueil d'un nouveau compte sans transaction.
function FenetreBienvenue({ handleChooseMode }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[var(--glass-blur)]">
      <div className="bg-[var(--surface)] border border-white/10 rounded-[calc(var(--radius)*1.667)] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
        
        {/* Icône d'en-tête */}
        <div className="w-16 h-16 bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_color-mix(in_srgb,var(--secondary)_15%,transparent)]">
          <Sparkles size={28} className="animate-pulse" />
        </div>

        <div>
          <h2 className="text-xl font-black uppercase tracking-wider text-white">Bienvenue sur Kleea</h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Configurez votre espace de gestion</p>
        </div>
        
        <p className="text-xs text-white/60 leading-relaxed">
          Comment souhaitez-vous gérer l'arrivée de vos transactions ? Vous pourrez modifier ce choix à tout moment dans votre profil.
        </p>

        <div className="grid grid-cols-1 gap-3 pt-1">
          
          {/* OPTION 1 : SYNCHRONISATION AUTOMATIQUE */}
          <button
            type="button"
            onClick={() => handleChooseMode('auto')}
            className="p-4 bg-[var(--primary)] hover:opacity-95 text-white rounded-2xl flex flex-col items-center gap-1.5 transition-all group cursor-pointer shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]"
          >
            <span className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
              <Zap size={14} className="shrink-0 fill-current text-amber-300" />
              <span>Synchronisation Automatique</span>
            </span>
            <span className="text-[10px] opacity-80 text-center leading-relaxed font-medium">
              Connexion bancaire avec mise à jour continue en arrière-plan (zéro action requise)
            </span>
          </button>

          {/* OPTION 2 : MODE MANUEL (CONTRÔLE TOTAL) */}
          <button
            type="button"
            onClick={() => handleChooseMode('manual')}
            className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] group"
          >
            <span className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-white/90">
              <FileUp size={14} className="shrink-0 text-white/60 group-hover:text-white transition-colors" />
              <span>Mode Manuel (Contrôle total)</span>
            </span>
            <span className="text-[10px] text-white/50 group-hover:text-white/70 text-center leading-relaxed font-medium transition-colors">
              Vous décidez vous-même quand importer vos transactions : par <strong className="text-white">fichiers CSV</strong> ou en reliant <strong className="text-white">vos comptes bancaires réels</strong>
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}

export default FenetreBienvenue;
