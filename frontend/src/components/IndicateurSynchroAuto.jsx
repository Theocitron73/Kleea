// Indicateur affiché pendant la synchronisation automatique au démarrage.
function IndicateurSynchroAuto({  }) {
  return (
    <div className="fixed top-[calc(var(--barre-haut,0px)+0.5rem)] md:top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
      <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-[var(--glass-blur)] border border-indigo-500/30 text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
        {/* Animation spinner et point pulsant */}
        <div className="relative flex items-center justify-center">
          <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-secondary-300 flex items-center gap-1.5 leading-none">
            <span>Synchronisation automatique</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          </span>
          <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-none mt-1">
            Actualisation des comptes et Transactions...
          </span>
        </div>
      </div>
    </div>
  );
}

export default IndicateurSynchroAuto;
