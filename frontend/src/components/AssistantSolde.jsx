// Assistant de correction du solde.
function AssistantSolde({ assistantData, confirmerCalculAssistant, setAssistantData }) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Overlay flouté */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[var(--glass-blur)]" onClick={() => setAssistantData({ ...assistantData, open: false })} />
      
      {/* Fenêtre Modale */}
      <div className="relative w-full max-w-md bg-[var(--surface)]/90 border border-white/20 rounded-[calc(var(--radius)*1.333)] p-8 shadow-2xl backdrop-blur-[var(--glass-blur)] animate-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h3 className="text-white font-black text-xl uppercase tracking-tighter">Assistant de Solde</h3>
            <p className="text-white/40 text-xs font-medium leading-relaxed">
              Importez quelques transactions, Saisissez le solde actuel de votre compte <span className="text-white">"{assistantData.compte?.compte}"</span> tel qu'il apparaît sur votre banque. L'app calculera le solde initial nécessaire.
            </p>
          </div>

          <div className="relative">
            <input
              autoFocus
              type="text"
              className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-2xl py-4 px-6 text-2xl font-black text-white outline-none focus:border-[var(--primary)] transition-colors"
              placeholder="0,00"
              value={assistantData.valeur}
              onChange={(e) => setAssistantData({ ...assistantData, valeur: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && confirmerCalculAssistant()}
            />
            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 font-black text-xl">€</span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setAssistantData({ open: false, compte: null, valeur: "" })}
              className="flex-1 py-4 rounded-2xl bg-[var(--glass-bg)] text-white/60 font-bold hover:bg-[var(--glass-bg)] transition-all uppercase text-xs tracking-widest"
            >
              Annuler
            </button>
            <button
              onClick={confirmerCalculAssistant}
              className="flex-[2] py-4 rounded-2xl bg-white text-black font-black hover:scale-[1.02] active:scale-95 transition-all uppercase text-xs tracking-widest shadow-xl shadow-white/10"
            >
              Calculer & Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AssistantSolde;
