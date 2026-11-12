import { useState } from 'react';
import { LogOut, ChevronRight, Search } from 'lucide-react';
import BarresMobile from './BarresMobile';
import CentreAlertes from './CentreAlertes';
import RechercheGlobale from './RechercheGlobale';

// Navigation entre les pages, sur ordinateur et sur mobile.
function NavigationPrincipale({ CURRENT_VERSION, activeTab, handleLogout, handleWheelNavTabs, setActiveTab, user, visibleMenuItems, centreAlertes, recherche }) {
  const [rechercheOuverte, setRechercheOuverte] = useState(false);

  return (
    <nav>
      {/* Barre du haut sur téléphone : rien ne flotte plus par-dessus les en-têtes des pages. */}
      <div className="barre-haut-mobile md:hidden fixed top-0 inset-x-0 z-[90] flex items-center justify-between gap-2 px-4 bg-slate-950/85 backdrop-blur-[var(--glass-blur)] border-b border-white/5">
        <button type="button" onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2 min-w-0 cursor-pointer" aria-label="Kleea, retour au dashboard">
          <img src="/Kleea_2.png" alt="" className="w-7 h-7 rounded-lg shrink-0" />
          <span className="text-base font-black tracking-tight text-[var(--text-main)]">Kleea</span>
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Rechercher" title="Rechercher (Ctrl + K)" onClick={() => setRechercheOuverte(true)} className="w-11 h-11 flex items-center justify-center rounded-xl text-[var(--text-main)]/75 active:bg-white/10 cursor-pointer">
            <Search size={20} aria-hidden="true" />
          </button>
          <CentreAlertes {...centreAlertes} ouvrirPage={setActiveTab} variante="mobile" />
        </div>
      </div>
      <div className="barre-haut-mobile-place md:hidden" aria-hidden="true" />
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

      {/* --- VERSION MOBILE : barre du haut, onglets en bas, panneau « Plus » pour le reste --- */}
      <BarresMobile activeTab={activeTab} handleLogout={handleLogout} setActiveTab={setActiveTab} user={user} visibleMenuItems={visibleMenuItems} />
    </nav>
  );
}

export default NavigationPrincipale;
