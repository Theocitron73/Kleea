import { ShieldAlert } from 'lucide-react';

// Connexion bancaire à renouveler.
function FenetreReauthentification({ handleConnectNewBank, scaExpiredConnection, setScaExpiredConnection }) {
  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300 select-none">
      <div 
        className="relative w-full max-w-md bg-[var(--surface)] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-[0_20px_70px_rgba(244,63,94,0.2)] text-center space-y-5 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.25)]">
          <ShieldAlert size={28} className="animate-pulse" />
        </div>

        <div className="space-y-1">
          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[8px] font-black uppercase tracking-widest border border-rose-500/30 inline-block mb-1">
            Sécurité bancaire DSP2
          </span>
          <h3 className="text-base font-black text-white uppercase tracking-tight">
            Reconnexion requise : {scaExpiredConnection.connector_name}
          </h3>
          <p className="text-xs text-white/60 leading-relaxed font-medium pt-1">
            La réglementation européenne exige de renouveler l'authentification de votre compte tous les 180 jours. La synchronisation automatique est suspendue jusqu'à la validation.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(`sca_dismissed_${scaExpiredConnection.id}`, 'true');
              setScaExpiredConnection(null);
            }}
            className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white text-[9.5px] font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            Plus tard
          </button>
          
          <button
            type="button"
            onClick={() => handleConnectNewBank(scaExpiredConnection.id)}
            className="py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-lg shadow-rose-500/30 transition-all active:scale-95 cursor-pointer"
          >
            Reconnecter ma banque
          </button>
        </div>
      </div>
    </div>
  );
}

export default FenetreReauthentification;
