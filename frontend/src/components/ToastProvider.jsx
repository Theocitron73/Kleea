// src/components/ToastProvider.jsx
import React from 'react';
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
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)] mr-2.5">
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
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)] mr-2.5">
            <Sparkles size={15} strokeWidth={2.5} />
          </div>
        ),
      }}
      toastOptions={{
        style: {
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '22px',
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
            !bg-gradient-to-r !from-[#1a0826]/95 !via-[#260c38]/95 !to-[#12051c]/95
            !border-purple-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(168,85,247,0.25)]
          `,

          // 🟢 2. Succès
          success: `
            !bg-gradient-to-r !from-[#042017]/95 !via-[#072a1e]/95 !to-[#0b1b17]/95
            !border-emerald-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.25)]
          `,

          // 🔴 3. Erreur
          error: `
            !bg-gradient-to-r !from-[#280711]/95 !via-[#330c18]/95 !to-[#1a080e]/95
            !border-rose-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(244,63,94,0.25)]
          `,

          // 🟡 4. Avertissement
          warning: `
            !bg-gradient-to-r !from-[#261603]/95 !via-[#331e05]/95 !to-[#1a1104]/95
            !border-amber-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.25)]
          `,

          // 🔵 5. Information
          info: `
            !bg-gradient-to-r !from-[#0c102e]/95 !via-[#111742]/95 !to-[#0a0d22]/95
            !border-indigo-500/40
            !shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(99,102,241,0.25)]
          `,
        },
      }}
    />
  );
}