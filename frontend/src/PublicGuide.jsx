import React from 'react';
import { Link } from 'react-router-dom';
import GuideView from './GuideView';

export default function PublicGuide() {
  // Thème de secours standard pour la version publique
  const fallbackTheme = { color_patrimoine: "#6366f1" };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col justify-between relative overflow-hidden">
      {/* EFFETS DE FOND STYLISÉS */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full pointer-events-none" />
      
      {/* EN-TÊTE DU MODE PUBLIC */}
      <div className="max-w-7xl w-full mx-auto flex items-center justify-between mb-6 p-4 bg-[var(--glass-bg)] border border-white/10 rounded-2xl relative z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="text-xl">📖</span>
          <div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Accès Public</span>
            <h3 className="text-sm font-black uppercase mt-1">Guide d'utilisation</h3>
          </div>
        </div>
        
        {/* Redirection native vers l'accueil (Connexion) */}
        <Link 
          to="/"
          className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer no-underline"
        >
          Retour à la connexion
        </Link>
      </div>

      {/* ZONE DE LECTURE DU GUIDE */}
      <div className="flex-1 max-w-7xl w-full mx-auto relative z-10 overflow-hidden">
        <GuideView userTheme={fallbackTheme} setActiveTab={() => {}} />
      </div>
    </div>
  );
}