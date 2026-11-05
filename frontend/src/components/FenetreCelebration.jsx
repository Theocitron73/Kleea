// Félicitations après le premier import automatique.
function FenetreCelebration({ celebrationModal, setActiveTab, setCelebrationModal }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={() => setCelebrationModal({ show: false, accountName: '', count: 0 })} 
      />

      <div className="relative w-full max-w-md bg-[var(--surface)] border border-emerald-500/30 rounded-3xl p-8 shadow-[0_20px_70px_rgba(16,185,129,0.25)] z-10 animate-in zoom-in-95 duration-300 text-center overflow-hidden">
        
        {/* Effets de halo néon */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/20 blur-[50px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/20 blur-[50px] rounded-full pointer-events-none" />

        {/* Icône festive */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto mb-5 shadow-[0_0_25px_rgba(52,211,153,0.3)]">
          <span className="text-3xl animate-bounce">⚡</span>
        </div>

        {/* Titres */}
        <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 inline-block mb-3">
          Synchronisation Réussie
        </span>
        
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
          Compte lié avec succès !
        </h3>

        <p className="text-xs text-white/70 leading-relaxed mb-6">
          Votre compte <strong className="text-emerald-400">"{celebrationModal.accountName}"</strong> est désormais Connecté. Toutes vos Transactions sont importées et votre solde initial est automatiquement calibré !
        </p>

        {/* 3 points forts clés */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 mb-6 text-left">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold uppercase text-white/30 tracking-wider">Statut</span>
            <span className="text-[10px] font-black text-emerald-400 uppercase mt-0.5">En direct</span>
          </div>
          <div className="flex flex-col border-x border-white/5 px-2">
            <span className="text-[8px] font-bold uppercase text-white/30 tracking-wider">Solde initial</span>
            <span className="text-[10px] font-black text-white uppercase mt-0.5">Calibré ⚖️</span>
          </div>
          <div className="flex flex-col pl-1">
            <span className="text-[8px] font-bold uppercase text-white/30 tracking-wider">Virements</span>
            <span className="text-[10px] font-black text-secondary-300 uppercase mt-0.5">Auto-classés</span>
          </div>
        </div>

        {/* Bouton d'action */}
        <button
          onClick={() => {
            setCelebrationModal({ show: false, accountName: '', count: 0 });
            setActiveTab('dashboard'); // Redirige directement vers le tableau de bord pour admirer le résultat
          }}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
        >
          Voir mon tableau de bord 🚀
        </button>

      </div>
    </div>
  );
}

export default FenetreCelebration;
