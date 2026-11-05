// src/components/ToastProvider.jsx
import { Toaster as SonnerToaster } from 'sonner';
import { Check, X, AlertTriangle, Sparkles, Loader2 } from 'lucide-react';

export default function ToastProvider() {
  return (
    <SonnerToaster
      position="bottom-center"
      theme="dark"
      closeButton
      duration={5000}
      offset={36}
      // 🌟 ICÔNES PERSONNALISÉES AVEC LOADER VIOLET
      icons={{
        loading: (
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_15px_color-mix(in_srgb,var(--secondary)_30%,transparent)] mr-2.5">
            <Loader2 size={15} className="animate-spin" />
          </div>
        ),
        success: (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] mr-2.5">
            <Check size={15} strokeWidth={3} />
          </div>
        ),
        error: (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
            <X size={15} strokeWidth={3} />
          </div>
        ),
        warning: (
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)] mr-2.5">
            <AlertTriangle size={15} strokeWidth={2.5} />
          </div>
        ),
        info: (
          <div className="w-8 h-8 rounded-xl bg-secondary-500/20 border border-secondary-400/40 flex items-center justify-center text-secondary-300 shrink-0 shadow-[0_0_15px_color-mix(in_srgb,var(--secondary)_30%,transparent)] mr-2.5">
            <Sparkles size={15} strokeWidth={2.5} />
          </div>
        ),
      }}
      toastOptions={{
        style: {
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          borderRadius: 'var(--radius)',
          padding: '25px 25px',
          gap: '14px',
        },
        classNames: {
          toast: 'group flex items-center select-none font-sans min-w-[420px] max-w-md',
          title: 'text-[11px] font-black uppercase tracking-wider text-white leading-snug pl-1',
          description: 'text-[9.5px] font-bold text-white/70 uppercase tracking-widest mt-0.5 pl-1',
          closeButton: 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 rounded-xl transition-all',

          // 🟣 1. NOUVEAU FOND VIOLET NÉON POUR LE CHARGEMENT
          loading: `
            !bg-[var(--surface)]
            !border-purple-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_color-mix(in_srgb,var(--secondary)_25%,transparent)]
          `,

          // 🟢 2. Succès
          success: `
            !bg-[var(--surface)]
            !border-emerald-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.25)]
          `,

          // 🔴 3. Erreur
          error: `
            !bg-[var(--surface)]
            !border-rose-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(244,63,94,0.25)]
          `,

          // 🟡 4. Avertissement
          warning: `
            !bg-[var(--surface)]
            !border-amber-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.25)]
          `,

          // 🔵 5. Information
          info: `
            !bg-[var(--surface)]
            !border-indigo-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_color-mix(in_srgb,var(--primary)_25%,transparent)]
          `,
        },
      }}
    />
  );
}