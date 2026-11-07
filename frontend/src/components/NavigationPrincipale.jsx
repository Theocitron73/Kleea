import { useState } from 'react';
import { LogOut, ChevronRight, Search } from 'lucide-react';
import CentreAlertes from './CentreAlertes';
import RechercheGlobale from './RechercheGlobale';

// Navigation entre les pages, sur ordinateur et sur mobile.
function NavigationPrincipale({ CURRENT_VERSION, activeTab, handleLogout, handleWheelNavTabs, setActiveTab, user, visibleMenuItems, centreAlertes, recherche }) {
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  return (
    <nav>
      <CentreAlertes {...centreAlertes} ouvrirPage={setActiveTab} variante="mobile" />
      <button type="button" aria-label="Rechercher" title="Rechercher (Ctrl + K)" onClick={() => setRechercheOuverte(true)} className="md:hidden fixed top-3 right-[3.75rem] z-[60] w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900/80 backdrop-blur-[var(--glass-blur)] border border-white/10 text-[var(--text-main)]/70 cursor-pointer">
        <Search size={18} aria-hidden="true" />
      </button>
      <RechercheGlobale ouverte={rechercheOuverte} setOuverte={setRechercheOuverte} {...recherche} />

      {/* --- VERSION DESKTOP (Haut) --- */}
      <div 
        onWheel={handleWheelNavTabs}
        className="hidden md:flex sticky top-4 z-50 max-w-fit mx-auto items-center gap-2 p-1.5 bg-slate-900/50 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl mb-8 cursor-ns-resize select-none"
        title="Molette de la souris : changer de page"
      >
        
        {/* LOGO-STYLE VERSION DE L'APP */}
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--glass-bg)] rounded-xl border border-white/5 mr-1">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] font-black text-[var(--text-main)] tracking-tighter uppercase">
              Kleea <span className="text-[var(--secondary)]">v.{CURRENT_VERSION}</span>
            </span>
            <span className="text-[6px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">
              Stable Build
            </span>
          </div>
        </div>

        <div className="w-px h-4 bg-[var(--glass-bg)] mx-1" />

        {/* Navigation Items (Vos onglets) */}
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 cursor-pointer ${
                isActive 
                ? 'bg-white text-slate-900 shadow-lg' 
                : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)] hover:bg-[var(--glass-bg)]'
              }`}
            >
              <Icon size={18} weight={isActive ? "fill" : "bold"} />
              <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
            </button>
          );
        })}
        
        <div className="w-px h-4 bg-[var(--glass-bg)] mx-2" />
        
        <button type="button" aria-label="Rechercher" title="Rechercher (Ctrl + K)" onClick={() => setRechercheOuverte(true)} className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-[var(--text-main)]/70 hover:text-[var(--text-main)] transition-colors cursor-pointer">
          <Search size={18} aria-hidden="true" />
        </button>
        <CentreAlertes {...centreAlertes} ouvrirPage={setActiveTab} />

        {/* --- BADGE UTILISATEUR CONNECTÉ --- */}
        <button
          onClick={() => setActiveTab('profile')} 
          className={`group flex items-center gap-2.5 px-3 py-1.5 border rounded-xl ml-1 transition-all duration-300 cursor-pointer ${
            activeTab === 'profile'
            ? 'bg-white/15 border-[var(--primary)] shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_20%,transparent)]'
            : 'bg-[var(--glass-bg)] border-white/5 hover:bg-white/10 hover:border-white/15'
          }`}
          title="Accéder à mon profil et aux réglages"
        >
          {/* Avatar initial */}
          <div className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_30%,transparent)] shrink-0">
            {user.substring(0, 1).toUpperCase()}
          </div>

          {/* Pseudo + Indication de la page */}
          <div className="flex flex-col items-start leading-none">
            <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-[0.1em]">
              {user}
            </span>
            <span className="text-[6.5px] font-black text-[var(--secondary)]/70 group-hover:text-[var(--secondary)] uppercase tracking-[0.15em] mt-1 transition-colors">
              Mon Profil
            </span>
          </div>

          {/* Petit chevron discret qui s'anime au survol */}
          <ChevronRight 
            size={11} 
            className={`ml-0.5 text-[var(--text-main)]/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--secondary)] ${
              activeTab === 'profile' ? 'text-[var(--secondary)]' : ''
            }`} 
          />
        </button>

        <button 
          onClick={handleLogout} 
          className="p-2 ml-1 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
          title="Déconnexion"
        >
          <LogOut size={18} />
        </button>
      </div>

     {/* --- VERSION MOBILE (Tab Bar en bas avec bouton Profil) --- */}
      {/* 💡 px-3 au lieu de px-6 pour libérer de l'espace de chaque côté de l'écran */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-3 pb-6 pt-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
        
        {/* 💡 max-w-lg et p-1.5 pour aérer la répartition horizontale des icônes */}
        <div className="max-w-lg mx-auto flex items-center justify-around p-1.5 bg-slate-900/80 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[calc(var(--radius)*1.167)] shadow-2xl pointer-events-auto">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              /* 💡 w-11 h-11 au lieu de w-12 h-12 pour éliminer l'effet compressé sur les petits écrans */
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative flex flex-col items-center justify-center w-11 h-11 transition-all"
              >
                {/* Indicateur actif (la petite bulle) */}
                {isActive && (
                  <div className="absolute inset-0 bg-white rounded-2xl animate-in zoom-in duration-300" />
                )}
                
                <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-slate-900 scale-105' : 'text-[var(--text-main)]/40'}`}>
                  {/* 💡 Taille d'icône légèrement ajustée à 21px pour garder un ratio élégant */}
                  <Icon size={21} />
                </div>

                {/* Point indicateur sous l'icône non-active */}
                {!isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--glass-bg)]" />
                )}
              </button>
            );
          })}

          {/* Bouton Profil Tactile */}
          <button 
            onClick={() => setActiveTab('profile')}
            className="relative flex flex-col items-center justify-center w-11 h-11 transition-all cursor-pointer"
          >
            {activeTab === 'profile' && (
              <div className="absolute inset-0 bg-white rounded-2xl animate-in zoom-in duration-300" />
            )}
            
            <div className={`relative z-10 transition-transform duration-300 ${activeTab === 'profile' ? 'scale-105' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black transition-all ${
                activeTab === 'profile'
                  ? 'bg-slate-950 text-white shadow-none'
                  : 'bg-[var(--primary)] text-white shadow-[0_0_8px_color-mix(in_srgb,var(--primary)_20%,transparent)]'
              }`}>
                {user?.charAt(0).toUpperCase()}
              </div>
            </div>
          </button>

          {/* Bouton logout mini pour mobile */}
          <button 
            onClick={handleLogout}
            className="w-11 h-11 flex items-center justify-center text-rose-500/50 hover:text-rose-500 active:scale-95 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      
    </nav>
  );
}

export default NavigationPrincipale;
