import React, { useState } from 'react';
import { 
  Sparkles, ShieldCheck, ArrowRight, Wallet, Brain, 
  ChartCandlestick, Users2, CheckCircle2, Building2, 
  Zap, Layers, LayoutDashboard, Settings2, FileUp, 
  TrendingUp, Calendar, Tag, Search, ArrowUpRight, ArrowDownRight, 
  Plus, CreditCard, Landmark, Check, Trophy, Trash2, Scale, 
  Truck, ArrowUpCircle, ArrowDownCircle, RefreshCw, BarChartHorizontal,
  Wand2, Pencil, Scissors, MoreHorizontal, CheckCircle, RotateCcw,
  SlidersHorizontal, Award, Lock, ExternalLink
} from 'lucide-react';

export default function LandingPage({ onOpenAuth }) {
  // Onglet sélectionné pour le simulateur de vue
  const [activeTab, setActiveTab] = useState('dashboard');

  // Sous-onglets internes aux simulations
  const [dashboardFluxTab, setDashboardFluxTab] = useState('depenses');
  const [tricountTab, setTricountTab] = useState('bilan');

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white selection:bg-[var(--primary)] selection:text-white relative overflow-x-hidden font-sans select-none">
      
      {/* EFFETS DE FOND LUMINEUX (Halos néons) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-[var(--primary)]/15 blur-[170px] rounded-full pointer-events-none" />
      <div className="absolute top-[35%] left-[-10%] w-[650px] h-[650px] bg-emerald-500/10 blur-[190px] rounded-full pointer-events-none" />
      <div className="absolute top-[75%] right-[-10%] w-[700px] h-[700px] bg-indigo-500/10 blur-[200px] rounded-full pointer-events-none" />

      {/* =========================================================================
          1. NAVIGATION BAR PUBLIQUE
          ========================================================================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0c]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]">
              K
            </div>
            <span className="text-lg font-black tracking-tighter uppercase text-white">
              Kleea <span className="text-[var(--primary)]">Finance</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[11px] font-black uppercase tracking-widest text-white/60">
            <a href="#showcase" className="hover:text-white transition-colors">Visite de l'application</a>
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#security" className="hover:text-white transition-colors">Sécurité</a>
            <a href="/guide" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Guide</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenAuth('login')}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white/70 hover:text-white transition-all cursor-pointer"
            >
              Se connecter
            </button>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-5 py-2.5 bg-white text-black hover:bg-[var(--primary)] hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              Créer un compte
            </button>
          </div>

        </div>
      </nav>

      {/* =========================================================================
          2. SECTION HERO
          ========================================================================= */}
      {/* =========================================================================
          SECTION HERO (TYPOGRAPHIE ÉQUILIBRÉE SANS COUPURES BIZARRES)
          ========================================================================= */}
      <section className="relative pt-36 pb-14 px-6 text-center max-w-5xl mx-auto space-y-6 z-10">
        
        {/* Badge version */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            Version 4.3 • Suivi bancaire, prévisions & gestion de patrimoine
          </span>
        </div>

        {/* 🟢 GRAND TITRE : text-balance + coupure naturelle selon les écrans */}
        <h1 
          className="text-3xl sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase tracking-tight leading-[1.15] text-white max-w-4xl mx-auto"
          style={{ textWrap: 'balance' }}
        >
          Le cockpit complet pour <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent inline-block">
            vos finances & votre épargne
          </span>
        </h1>

        {/* 🟢 SOUS-TITRE : lisible, équilibré, sans uppercase agressif */}
        <p 
          className="text-sm sm:text-base text-white/60 max-w-2xl mx-auto font-normal leading-relaxed"
          style={{ textWrap: 'balance' }}
        >
          Synchronisez vos banques en direct, anticipez vos soldes futurs mois par mois et réalisez vos projets dans une interface épurée, confidentielle et sans publicité.
        </p>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
          <button
            onClick={() => onOpenAuth('register')}
            className="w-full sm:w-auto px-8 py-4 bg-[var(--primary)] hover:brightness-110 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-[var(--primary)]/25 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <span>Ouvrir mon coffre Kleea</span>
            <ArrowRight size={16} />
          </button>
          <a
            href="#showcase"
            className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center cursor-pointer"
          >
            Tester les écrans réels
          </a>
        </div>

        {/* Ticker des points forts */}
        <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-[9px] font-black uppercase tracking-widest text-white/40 border-t border-white/5">
          <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Synchro API Powens & CSV</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Chiffrement AES / Fernet</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Prorata couple & Tricount</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Détection de découverts</span>
        </div>

      </section>

      {/* =========================================================================
          3. SIMULATEUR HAUTE FIDÉLITÉ (COPIE EXACTE DES VRAIES PAGES)
          ========================================================================= */}
      <section id="showcase" className="py-14 px-4 sm:px-6 max-w-7xl mx-auto">
        
        <div className="text-center space-y-2 mb-8">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">
            Aperçu Haute Fidélité
          </span>
          <h2 
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight max-w-3xl mx-auto"
            style={{ textWrap: 'balance' }}
          >
            Explorez l'interface réelle de Kleea
          </h2>
          <p className="text-xs text-white/40 uppercase font-bold tracking-widest max-w-lg mx-auto">
            Sélectionnez une page pour voir exactement à quoi ressemble l'expérience utilisateur.
          </p>
        </div>

        {/* BARRE D'ONGLETS IMITANT LA BARRE DE NAVIGATION PRINCIPALE */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 p-1.5 bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl max-w-fit mx-auto mb-6 select-none shadow-xl">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'gerer', label: 'Historique & Gérer', icon: Settings2 },
            { id: 'previsionnel', label: 'Prévisionnel', icon: ChartCandlestick },
            { id: 'comptes', label: 'Mes Comptes', icon: Wallet },
            { id: 'tricount', label: 'Tricount', icon: Users2 },
          ].map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer text-xs font-black uppercase tracking-wider ${
                  isActive 
                    ? 'bg-white text-slate-900 shadow-md scale-102' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* CADRE VITRÉ REPRODUISANT LE VIEWPORT DE L'APPLICATION */}
        <div className="rounded-[2.5rem] border border-white/15 bg-[#101216] p-4 sm:p-7 shadow-[0_30px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl relative overflow-hidden min-h-[580px]">
          
          {/* HEADER DU SIMULATEUR */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-[10px] font-mono text-white/30 ml-3">kleea.app / app / {activeTab}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                Mode démonstration
              </span>
            </div>
          </div>

          {/* =========================================================================
              VUE 1 : DASHBOARD (REPRODUCTION EXACTE DES 3 COLONNES & CARTES COMPTES)
              ========================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              {/* Mini filtre supérieur */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase bg-white text-slate-950 shadow-sm">Personnel</span>
                  <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase text-white/40">Commun</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-white/40 font-mono">
                  <span>OCTOBRE 2026</span>
                </div>
              </div>

              {/* Ligne des cartes de comptes avec gradient */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Total Patrimoine */}
                <div className="p-3.5 rounded-2xl shadow-xl flex flex-col justify-between bg-gradient-to-br from-[#37b58f] to-[#37b58f]aa border border-emerald-400/20 h-24">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-white/60 tracking-wider">Patrimoine Total</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]" />
                  </div>
                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-white/60 block leading-none mb-1">Total consolidé</span>
                    <h3 className="text-lg font-black text-white font-mono leading-none">48 590,20 €</h3>
                  </div>
                </div>

                {/* Compte Courant */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#4f46e5]aa to-[#4f46e5]55 border border-white/10 flex flex-col justify-between h-24">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-white/60">CCP Principal</span>
                    <CreditCard size={14} className="text-white" />
                  </div>
                  <div>
                    <span className="text-[7.5px] uppercase font-bold text-white/40 block leading-none mb-1">Solde actuel</span>
                    <h3 className="text-lg font-black text-white font-mono leading-none">2 450,00 €</h3>
                  </div>
                </div>

                {/* Livret A avec Intérêts */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#059669]aa to-[#059669]55 border border-white/10 flex flex-col justify-between h-24">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-white/60">Livret A</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[7.5px] px-1 py-0.2 rounded bg-white/20 text-white font-black">3.0%</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-white/40 block leading-none mb-1">Solde</span>
                      <h3 className="text-lg font-black text-white font-mono leading-none">22 140,50 €</h3>
                    </div>
                    <span className="text-[9px] font-black text-emerald-300 font-mono">+332,10€ int.</span>
                  </div>
                </div>

                {/* LEP Rémunéré */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#d97706]aa to-[#d97706]55 border border-white/10 flex flex-col justify-between h-24">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] font-black uppercase text-white/60">LEP Épargne</span>
                    <span className="text-[7.5px] px-1 py-0.2 rounded bg-white/20 text-white font-black">5.0%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-white/40 block leading-none mb-1">Solde</span>
                      <h3 className="text-lg font-black text-white font-mono leading-none">10 000,00 €</h3>
                    </div>
                    <span className="text-[9px] font-black text-amber-300 font-mono">+500,00€ int.</span>
                  </div>
                </div>
              </div>

              {/* Les 3 Colonnes centrales du Dashboard */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                
                {/* COLONNE 1 : FLUX MENSUEL & JAUGES */}
                <div className="lg:col-span-4 p-4 rounded-3xl bg-black/40 border border-white/5 space-y-3.5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                      <div>
                        <h4 className="text-base font-black uppercase text-white leading-none">Flux mensuel</h4>
                        <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider">Octobre 2026</span>
                      </div>
                      
                      <div className="flex gap-1 p-0.5 bg-white/5 rounded-lg border border-white/5">
                        <button 
                          onClick={() => setDashboardFluxTab('revenus')}
                          className={`p-1.5 rounded-md text-[8px] font-black uppercase ${dashboardFluxTab === 'revenus' ? 'bg-white text-black' : 'text-white/40'}`}
                        >
                          <ArrowUpCircle size={12} />
                        </button>
                        <button 
                          onClick={() => setDashboardFluxTab('depenses')}
                          className={`p-1.5 rounded-md text-[8px] font-black uppercase ${dashboardFluxTab === 'depenses' ? 'bg-white text-black' : 'text-white/40'}`}
                        >
                          <ArrowDownCircle size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-[9px] uppercase font-bold text-white/40">Total des flux</span>
                      <span className="text-lg font-mono font-black text-rose-400">- 1 845,20 €</span>
                    </div>

                    {/* Liste des transactions avec date badges */}
                    <div className="space-y-1.5">
                      {[
                        { day: '15', mo: 'OCT', yr: '2026', nom: 'Supermarché Leclerc', cat: 'Alimentation', mnt: '-124,50 €', col: 'text-rose-400' },
                        { day: '14', mo: 'OCT', yr: '2026', nom: 'Station Essence Total', cat: 'Transport', mnt: '-65,00 €', col: 'text-rose-400' },
                        { day: '12', mo: 'OCT', yr: '2026', nom: 'Virement Salaire', cat: 'Salaire', mnt: '+3 200,00 €', col: 'text-emerald-400' },
                      ].map((t, i) => (
                        <div key={i} className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex flex-col items-center justify-center text-[7px] font-mono leading-none">
                              <span className="text-white/40">{t.mo}</span>
                              <span className="text-[10px] font-black text-white">{t.day}</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-white block leading-tight">{t.nom}</span>
                              <span className="text-[8px] uppercase font-bold text-indigo-300">{t.cat}</span>
                            </div>
                          </div>
                          <span className={`text-xs font-mono font-black ${t.col}`}>{t.mnt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Jauges en arc de cercle en bas de la col 1 */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[8px] font-black uppercase text-white/30 tracking-widest block mb-2">Objectifs Budgétaires</span>
                    <div className="flex gap-2">
                      {[
                        { nom: 'Courses', reel: 340, max: 400, pct: 85, color: '#34d399' },
                        { nom: 'Sorties', reel: 180, max: 150, pct: 120, color: '#fb7185' },
                      ].map((bg, i) => (
                        <div key={i} className="flex-1 p-2 bg-white/[0.02] border border-white/5 rounded-xl flex flex-col items-center text-center">
                          <div className="relative w-16 h-8 mb-1">
                            <svg width="64" height="32" viewBox="0 0 64 32">
                              <path d="M 8,32 A 24,24 0 0 1 56,32" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                              <path d="M 8,32 A 24,24 0 0 1 56,32" fill="none" stroke={bg.color} strokeWidth="5" strokeDasharray="75" strokeDashoffset={75 - (Math.min(bg.pct, 100) / 100) * 75} strokeLinecap="round" />
                            </svg>
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] font-mono font-black">{bg.pct}%</span>
                          </div>
                          <span className="text-[8px] font-black uppercase text-white/70">{bg.nom}</span>
                          <span className="text-[7.5px] font-mono text-white/30">{bg.reel}€ / {bg.max}€</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COLONNE 2 : BILAN 12 MOIS */}
                <div className="lg:col-span-4 p-4 rounded-3xl bg-black/40 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/5 mb-2">
                      <div>
                        <h4 className="text-base font-black uppercase text-white leading-none">Bilan Annuel</h4>
                        <span className="text-[8px] font-bold text-white/40 uppercase">Solde 1er janv. : 36 200 €</span>
                      </div>
                      <span className="text-[9px] font-black text-emerald-400 font-mono">2026</span>
                    </div>

                    <div className="grid grid-cols-12 text-[7.5px] font-black uppercase text-white/30 px-2 mb-1">
                      <span className="col-span-3">Mois</span>
                      <span className="col-span-3 text-right">Revenus</span>
                      <span className="col-span-3 text-right">Dépenses</span>
                      <span className="col-span-3 text-right">Épargne</span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { m: 'Août', r: '3 450€', d: '1 920€', ep: '+1 530€' },
                        { m: 'Septembre', r: '3 200€', d: '1 650€', ep: '+1 550€' },
                        { m: 'Octobre', r: '3 200€', d: '1 845€', ep: '+1 355€' },
                        { m: 'Novembre', r: '3 200€', d: '1 400€', ep: '+1 800€' },
                      ].map((row, i) => (
                        <div key={i} className="grid grid-cols-12 items-center px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/5 text-[9px] font-mono">
                          <span className="col-span-3 font-sans font-bold uppercase text-white/80">{row.m}</span>
                          <span className="col-span-3 text-right text-emerald-400">{row.r}</span>
                          <span className="col-span-3 text-right text-rose-400">-{row.d}</span>
                          <span className="col-span-3 text-right font-black text-white">{row.ep}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Synthèse consommation vs épargne en bas de la col 2 */}
                  <div className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase">
                      <span className="text-white/40">Consommé</span>
                      <span className="text-emerald-400">Épargné (32%)</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden flex">
                      <div className="h-full bg-rose-500/50 w-[68%]" />
                      <div className="h-full bg-emerald-500 w-[32%]" />
                    </div>
                  </div>
                </div>

                {/* COLONNE 3 : OBJECTIF ANNUEL & COURBES */}
                <div className="lg:col-span-4 p-4 rounded-3xl bg-black/40 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                      <h4 className="text-base font-black uppercase text-white leading-none">Analytique</h4>
                      <div className="p-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Trophy size={14} />
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-[8px] font-black uppercase text-white/40">Objectif Annuel 2026</span>
                        <span className="text-[10px] font-mono font-black text-amber-400">82%</span>
                      </div>
                      <p className="text-base font-mono font-black text-white leading-none">12 400 € <span className="text-xs text-white/30 font-normal">/ 15 000 €</span></p>
                      <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full w-[82%]" />
                      </div>
                    </div>
                  </div>

                  {/* Faux graphique d'évolution */}
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-white/40">
                      <span>Évolution Patrimoine</span>
                      <div className="flex gap-2">
                        <span className="text-emerald-400">• Rev</span>
                        <span className="text-rose-400">• Dép</span>
                      </div>
                    </div>
                    {/* Visualisation simulée des vagues Recharts */}
                    <div className="h-20 w-full flex items-end gap-1.5 pt-2">
                      {[30, 45, 60, 50, 75, 65, 85, 80, 95].map((val, idx) => (
                        <div key={idx} className="flex-1 bg-gradient-to-t from-indigo-500/10 via-indigo-500/30 to-indigo-400 rounded-t" style={{ height: `${val}%` }} />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================================
              VUE 2 : HISTORIQUE & GÉRER (TABLEAU EXACT AVEC BADGES DATES)
              ========================================================================= */}
          {activeTab === 'gerer' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              {/* Saisie rapide identique au haut de la page Gérer */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 border-r border-white/10 pr-3">
                  <Plus size={14} className="text-[var(--primary)]" />
                  <span className="text-[9px] font-black uppercase text-white/80">Nouvelle opération</span>
                </div>

                <input 
                  type="text" 
                  placeholder="Libellé du mouvement..." 
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white outline-none flex-1 min-w-[160px]"
                  defaultValue="Courses bio samedi"
                />

                <input 
                  type="number" 
                  placeholder="-45.00" 
                  className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white outline-none w-24 text-right"
                  defaultValue="-45.00"
                />

                <span className="px-3 py-1.5 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider cursor-pointer shadow-md">
                  + Ajouter
                </span>
              </div>

              {/* Tableau avec le vrai composant CustomBadgeDate */}
              <div className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[8.5px] font-black uppercase text-white/40 bg-white/[0.02]">
                      <th className="py-2.5 px-3 w-14 text-center">Date</th>
                      <th className="py-2.5 px-3">Transaction</th>
                      <th className="py-2.5 px-3 text-right">Montant</th>
                      <th className="py-2.5 px-3">Catégorie</th>
                      <th className="py-2.5 px-3">Compte</th>
                      <th className="py-2.5 px-3 text-center">Division</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {[
                      { d: '15', m: 'OCT', y: '2026', nom: 'Supermarché Carrefour', mnt: '-84,20 €', cat: 'Alimentation', cpt: 'CCP Principal', col: 'text-rose-400', isSplit: true },
                      { d: '14', m: 'OCT', y: '2026', nom: 'Station Total Énergies', mnt: '-62,00 €', cat: 'Carburant', cpt: 'CCP Principal', col: 'text-rose-400' },
                      { d: '12', m: 'OCT', y: '2026', nom: 'Virement Salaire Société', mnt: '+3 200,00 €', cat: 'Salaire', cpt: 'CCP Principal', col: 'text-emerald-400' },
                      { d: '10', m: 'OCT', y: '2026', nom: 'Abonnement Netflix & Spotify', mnt: '-27,98 €', cat: 'Abonnements', cpt: 'CCP Principal', col: 'text-rose-400' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        {/* CustomBadgeDate */}
                        <td className="py-2.5 px-3">
                          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center text-[7px] font-mono leading-none shadow-sm">
                            <span className="text-white/30">{row.m}</span>
                            <span className="text-xs font-black text-white mt-0.5">{row.d}</span>
                          </div>
                        </td>

                        {/* Nom avec bordure gauche colorée */}
                        <td className="py-2.5 px-3">
                          <div className="border-l-2 border-indigo-400 pl-2">
                            <span className="font-bold text-white text-xs block">{row.nom}</span>
                            <span className="text-[7.5px] font-mono text-white/30 uppercase">{row.cpt}</span>
                          </div>
                        </td>

                        <td className={`py-2.5 px-3 text-right font-mono font-black ${row.col}`}>
                          {row.mnt}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold uppercase text-white/80">
                            {row.cat}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-white/60 font-mono text-[10px]">
                          {row.cpt}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          {row.isSplit ? (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[7px] font-black uppercase flex items-center justify-center gap-1 w-fit mx-auto">
                              <Scissors size={9} /> Divisée
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              VUE 3 : PRÉVISIONNEL (CALENDRIER ET SUIVI DU RÉALISÉ)
              ========================================================================= */}
          {activeTab === 'previsionnel' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider">Anticipation & Machine à voyager dans le temps</h4>
                  <p className="text-[9px] text-white/40 uppercase font-bold">Simulez vos soldes finaux sans toucher à votre historique réel</p>
                </div>
                <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                  Solde estimé fin de mois : 4 150,00 €
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Lignes prévisionnelles avec barres de consommation */}
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5 space-y-3">
                  <span className="text-[8.5px] font-black uppercase tracking-wider text-white/40 block">Dépenses & Revenus attendus</span>
                  
                  <div className="space-y-2">
                    {[
                      { nom: 'Loyer Appartement', mnt: '850,00 €', statut: '100% réglé', pct: 100, ok: true },
                      { nom: 'Facture Électricité', mnt: '110,00 €', statut: 'Attendu : 110€', pct: 0, ok: false },
                      { nom: 'Courses prévues', mnt: '400,00 €', statut: 'Reste : 120€', pct: 70, ok: false },
                    ].map((p, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white uppercase">{p.nom}</span>
                          <span className="font-mono font-black text-white">{p.mnt}</span>
                        </div>
                        <div className="flex justify-between items-center text-[7.5px] uppercase font-bold text-white/40">
                          <span>{p.statut}</span>
                          <span className={p.ok ? 'text-emerald-400' : 'text-amber-400'}>{p.pct}%</span>
                        </div>
                        <div className="h-1 w-full bg-black/50 rounded-full overflow-hidden">
                          <div className={`h-full ${p.ok ? 'bg-emerald-400' : 'bg-indigo-500'}`} style={{ width: `${p.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trajectoire sur 12 mois */}
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5 space-y-3 flex flex-col justify-between">
                  <div>
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-white/40 block mb-2">Trajectoire du patrimoine</span>
                    <div className="space-y-1">
                      {[
                        { m: 'Novembre 2026', solde: '50 200 €', ep: '+1 610 €' },
                        { m: 'Décembre 2026', solde: '52 400 €', ep: '+2 200 €' },
                        { m: 'Janvier 2027', solde: '53 850 €', ep: '+1 450 €' },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-xl bg-white/[0.02] text-xs font-mono">
                          <span className="text-white/70 font-sans font-bold uppercase">{item.m}</span>
                          <div className="text-right">
                            <span className="text-emerald-400 font-black block">{item.solde}</span>
                            <span className="text-[7.5px] text-white/40">{item.ep}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[8px] font-black uppercase text-emerald-300 block">Capacité d'épargne projetée</span>
                    <span className="text-xl font-mono font-black text-white mt-0.5 block">+18 200 € / an</span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================================
              VUE 4 : MES COMPTES (CARTES ET LIAISON POWENS)
              ========================================================================= */}
          {activeTab === 'comptes' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              {/* Formulaire de création de compte supérieur */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center gap-2">
                <span className="text-[8.5px] font-black uppercase text-white/40 border-r border-white/10 pr-2">Nouveau</span>
                <span className="px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[9px] font-bold text-white uppercase">CCP</span>
                <input type="text" placeholder="NOM DU COMPTE..." className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white uppercase font-bold flex-1 min-w-[140px]" defaultValue="Livret Épargne" />
                <input type="text" placeholder="SOLDE INITIAL..." className="bg-black/30 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-white w-28" defaultValue="1500.00 €" />
                <span className="px-3 py-1.5 rounded-xl bg-white text-black font-black uppercase text-[9px] tracking-wider cursor-pointer shadow-md">Créer</span>
              </div>

              {/* Cartes détaillées comme dans ComptesView */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {[
                  { nom: 'CCP Principal', grp: 'Personnel', solde: 2450, col: '#4f46e5', bank: 'BoursoBank • Connectée' },
                  { nom: 'Livret A', grp: 'Épargne', solde: 22140.50, col: '#059669', taux: '3.0%', bank: 'Banque Postale' },
                  { nom: 'LDDS Sécurité', grp: 'Épargne', solde: 12000, col: '#d97706', taux: '3.0%', bank: 'BoursoBank • Connectée' },
                ].map((c, i) => (
                  <div key={i} className="p-4 rounded-3xl border border-white/15 flex flex-col justify-between space-y-4 shadow-xl" style={{ backgroundColor: `${c.col}44` }}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-black uppercase text-white leading-tight">{c.nom}</h4>
                        <span className="text-[8px] font-black uppercase text-white/50 tracking-wider flex items-center gap-1 mt-0.5">
                          <Pencil size={8} /> {c.grp}
                        </span>
                      </div>
                      <div className="w-5 h-5 rounded-md border border-white/40 shadow-inner" style={{ backgroundColor: c.col }} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[7.5px] font-black uppercase text-white/40 block">Solde initial</span>
                        <span className="text-sm font-mono font-black text-white">{c.solde.toLocaleString('fr-FR')} €</span>
                      </div>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--primary)]/30 border border-[var(--primary)] text-[7.5px] font-black uppercase">
                        <Wand2 size={8} /> Ajuster
                      </span>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[8px] font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                        {c.bank}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =========================================================================
              VUE 5 : TRICOUNT (GESTION DES FRAIS DE GROUPE)
              ========================================================================= */}
          {activeTab === 'tricount' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-left">
              
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider">Module Tricount : "Voyage Islande"</h4>
                  <p className="text-[9px] text-white/40 uppercase font-bold">Calcul optimisé des dettes croisées et génération de PDF</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-white/5 text-[9px] font-black uppercase text-white/60">
                  3 Participants
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                {/* Membres */}
                <div className="md:col-span-4 p-4 rounded-3xl bg-black/40 border border-white/5 space-y-2.5">
                  <span className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Participants</span>
                  {[
                    { nom: 'Théo', emoji: '🧔', solde: '-74,20 €', col: 'text-rose-400' },
                    { nom: 'Alice', emoji: '👩', solde: '+194,20 €', col: 'text-emerald-400' },
                    { nom: 'Thomas', emoji: '👦', solde: '-120,00 €', col: 'text-rose-400' },
                  ].map((m, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{m.emoji}</span>
                        <span className="text-xs font-bold text-white uppercase">{m.nom}</span>
                      </div>
                      <span className={`text-xs font-mono font-black ${m.col}`}>{m.solde}</span>
                    </div>
                  ))}
                </div>

                {/* Remboursements optimisés */}
                <div className="md:col-span-8 p-4 rounded-3xl bg-black/40 border border-white/5 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase text-white/40 tracking-wider block">Remboursements à effectuer</span>
                    
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Théo donne à Alice</span>
                      </div>
                      <span className="text-sm font-mono font-black text-emerald-400">74,20 €</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Thomas donne à Alice</span>
                      </div>
                      <span className="text-sm font-mono font-black text-emerald-400">120,00 €</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                    <span className="text-[8px] font-black uppercase tracking-wider text-white/40">Lien public de partage actif pour vos amis</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PIED DE CARTOUCHE DU SIMULATEUR */}
          <div className="pt-5 border-t border-white/5 flex items-center justify-between flex-wrap gap-4 mt-6">
            <span className="text-[9.5px] font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
              <Sparkles size={12} className="text-amber-400" /> Interface réelle sans artifice
            </span>
            <button
              onClick={() => onOpenAuth('register')}
              className="px-6 py-2.5 bg-white text-black hover:bg-[var(--primary)] hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Tester l'application avec vos comptes
            </button>
          </div>

        </div>
      </section>

      {/* =========================================================================
          4. GRILLE DES FONCTIONNALITÉS (BENTO GRID)
          ========================================================================= */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--primary)]">
            Performance & Souveraineté
          </span>
          <h2 
            className="text-3xl sm:text-5xl font-black uppercase tracking-tight max-w-3xl mx-auto"
            style={{ textWrap: 'balance' }}
          >
            Conçu pour ceux qui veulent la maîtrise totale
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-[var(--glass-bg)] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Building2 size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider">Synchronisation Powens</h3>
              <p className="text-xs text-white/50 leading-relaxed font-medium">
                Connectez BoursoBank, La Banque Postale, Revolut, BNP et des centaines d'autres en direct. Vos écritures sont récupérées automatiquement.
              </p>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--glass-bg)] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Brain size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider">Kleea Brain (IA)</h3>
              <p className="text-xs text-white/50 leading-relaxed font-medium">
                L'algorithme apprend de vos recatégorisations. Au prochain import, vos dépenses récurrentes sont associées sans aucune intervention manuelle.
              </p>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--glass-bg)] border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ChartCandlestick size={24} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider">Anticipation Prévisionnelle</h3>
              <p className="text-xs text-white/50 leading-relaxed font-medium">
                Saisissez vos charges fixes et loyers pour connaître à l'avance votre solde à la fin du mois et votre épargne nette cumulée sur 12 mois.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SECTION SÉCURITÉ & FOOTER
          ========================================================================= */}
      <section id="security" className="py-20 px-6 max-w-5xl mx-auto">
        <div className="p-10 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-transparent border border-white/10 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
              <ShieldCheck size={14} /> Chiffrement de bout en bout
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">Vos données restent privées.</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              Vos identifiants et IBAN sont chiffrés avec la technologie cryptographique <strong>Fernet</strong>. Kleea ne revend aucune donnée et n'affiche aucune publicité.
            </p>
          </div>
          <button
            onClick={() => onOpenAuth('register')}
            className="px-6 py-3.5 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            Créer mon compte
          </button>
        </div>
      </section>

      <footer className="border-t border-white/5 py-12 px-6 text-center text-white/30 text-xs uppercase font-bold tracking-widest space-y-4">
        <div className="flex items-center justify-center gap-6">
          <a href="#showcase" className="hover:text-white transition-colors">Visite de l'app</a>
          <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#security" className="hover:text-white transition-colors">Sécurité</a>
          <a href="/guide" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Guide d'aide</a>
        </div>
        <p>© {new Date().getFullYear()} Kleea Finance. Tous droits réservés.</p>
      </footer>

    </div>
  );
}