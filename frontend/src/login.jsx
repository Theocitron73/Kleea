import { useState, useEffect,useMemo,useRef,forwardRef,useCallback} from 'react'
import React from 'react'; // <-- Ajoute cette ligne tout en haut du fichier

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Legend, Cell,LabelList,PieChart, 
  Pie,
} from 'recharts';
import { SketchPicker } from 'react-color'; // À mettre en haut de ton fichier
import { LayoutDashboard, ChartCandlestick, Settings2, FileUp, Wallet, Users2,Palette,Pencil,LogOut,Menu,X,Trash2,StickyNote,Calculator,TrendingUp,CreditCard,BadgeEuro,Rocket,Edit3,GripVertical,ChevronDown,ShoppingCart,Filter,Search, Plus,ArrowUpDown,User,
  Calendar,Check,Tag,Brain,Database,List,Eye,EyeOff,ArrowRight,TrendingDown,Target,Activity,ChevronRight,Save,Calendar1,Upload,MousePointerClick,Sparkles,HelpCircle,Banknote,Lock,Mail,Edit2,Loader,AlertCircle,CheckCircle,Smile,PieChart as PieChartIcon,
  FileText, Layout, UploadCloud, BarChart3, CalendarDays, Wand2, Copy, Archive, MoreHorizontal,AlertTriangle,ArrowUpRight,ArrowDownRight,Lightbulb,Terminal,Flame,Grid,RefreshCw,ArrowUpCircle,ArrowDownCircle,Zap,BarChartHorizontal,Minus,Ticket,HeartPulse,Cpu,Plane,Gift,
  Truck,Layers,Landmark,ChevronLeft, ArrowRightLeft,ArrowDownLeft,Download,Clock,Building2,ShieldCheck,SlidersHorizontal,Unlock,Link,BookOpen,Trophy,WalletCards,WifiOff,UserX,ShieldAlert,Scissors,Scale,RotateCcw 
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,verticalListSortingStrategy, } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import fr from 'date-fns/locale/fr';
registerLocale('fr', fr); // Pour avoir le calendrier en français
import EmojiPicker, { Theme } from 'emoji-picker-react'; // À ajouter en haut de ton fichier
import { createPortal } from 'react-dom';
import api from './axios';
import ReactMarkdown from 'react-markdown';
import GererMobile from './GererMobile';
import ImportMobile from './ImportMobile';
import PrevisionsMobile from './previsionsMobile';
import DashboardMobile from './DashboardMobile';
import ComptesMobile from './ComptesMobile';
import TricountMobile from './TricountMobile';
import GuideView from './GuideView';
import { Link as RouterLink } from 'react-router-dom';
import { CategoryIcon, getCleanCategoryName, LucideIconPicker, setGlobalCustomIconsMap,getCategoryIconInfo,getCategoryGroup } from './categoryIcons'; // Fonction pour générer des variations HSL à partir d'un HEX (percent: 0 à 100)
import CustomSelect from './components/CustomSelect';
import ProfileTab from './views/ProfileTab';
import TricountManager from './views/TricountManager';
import DemenagementPage from './views/DemenagementPage';
import GestionEpargneProjet from './views/GestionEpargneProjet';
import CongesPage from './views/Congespage';
import AuthView from './views/AuthView';
import ComptesDesktop from './views/ComptesDesktop';
import ThemeStudioDesktop from './views/ThemeStudioDesktop';
import ImportDesktop from './views/ImportDesktop';
import GererDesktop from './views/GererDesktop';
import PrevisionsDesktop, { PrevisionsChartView } from './views/PrevisionsDesktop';
import DashboardDesktop, { AnnualCategoriesChart, generateGradientStep, TransactionCard, CategoriesView, VariationsView, FlashInsightsView, CalendarSection, WrappedSection} from './views/DashboardDesktop';
import { toast } from 'sonner'
import { toLocalDateString, getTodayLocalDateString } from './utils/dateUtils';
import { useVirtualizer } from '@tanstack/react-virtual';
import ExportModal from './components/ExportModal';










const HelpPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

const bankGuides = [
  { 
    id: 'lbp', 
    name: 'La Banque Postale', 
    guide: 'Menu latéral gauche > OPÉRATIONS > "Téléchargement d\'opérations" > Choisir le compte > Format CSV.' 
  },
  { 
    id: 'bourso', 
    name: 'BoursoBank', 
    guide: 'Cliquer sur le compte > Filtrer la période > Bouton "Exporter en Format CSV" (situé tout en bas sous la liste des mouvements).' 
  },
  { 
    id: 'revolut', 
    name: 'Revolut', 
    guide: 'Accueil > Cliquer sur "..." (Plus) > Relevés > Relevé de transactions > Choisir Excel (CSV) > Générer.' 
  },
  { 
    id: 'bp', 
    name: 'Banque Populaire', 
    guide: 'Menu "Documents" (haut) > "Vos écritures et opérations" (gauche) > Sélectionner CSV (Excel) > Choisir les dates.' 
  },
  { 
    id: 'ca', 
    name: 'Crédit Agricole', 
    guide: 'Menu "Documents" > "Télécharger l\'historique des opérations" > Sélectionner le compte > Format CSV.' 
  },
  { 
    id: 'bnplcl', 
    name: 'BNP / LCL', 
    guide: 'Rubrique "Comptes & Contrats" > "Télécharger vos relevés d\'opération" > Choisir le format CSV (si proposé) ou Export.' 
  },
  { 
    id: 'sg', 
    name: 'Société Générale', 
    guide: 'Sélectionner le compte > Onglet "Autres" > "Export" > Choisir le format CSV et la période.' 
  }
];

  return (
    <div className="relative"> {/* Le parent reste en relative */}
      
      {/* BOUTON D'APPEL */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[52px] px-4 rounded-2xl flex items-center gap-3 transition-all duration-300 border ${
          isOpen ? 'bg-[var(--glass-bg)] border-[var(--primary)]/50' : 'bg-white/[0.02] border-white/10'
        }`}
      >
        <div className="p-1.5 bg-[var(--glass-bg)] rounded-lg">
          <HelpCircle size={16} className={isOpen ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/40'} />
        </div>
        <div className="flex flex-col items-start hidden md:flex">
          <span className="text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-widest text-left">Guide Export CSV</span>
          <span className="text-[8px] text-[var(--text-main)]/10 font-bold uppercase text-left">Aide banques</span>
        </div>
      </button>

      {/* LE POPOVER ORIENTÉ VERS LE BAS */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => {setIsOpen(false); setSelectedBank(null);}} />
          
          {/* CHANGEMENT ICI : top-[110%] au lieu de bottom */}
          <div className="absolute right-0 top-[110%] mt-2 w-72 bg-[#161618] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
              <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Exporter mon CSV</h4>
              <p className="text-[8px] text-[var(--text-main)]/20 uppercase font-bold mt-1">Sélectionnez votre banque</p>
            </div>

            <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {!selectedBank ? (
                <div className="space-y-1">
                  {bankGuides.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => setSelectedBank(bank)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group/item text-left"
                    >
                      <span className="text-[10px] font-bold text-[var(--text-main)]/60 group-hover/item:text-[var(--primary)] uppercase">{bank.name}</span>
                      <ChevronRight size={14} className="text-[var(--text-main)]/10 group-hover/item:text-[var(--primary)]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2 animate-in slide-in-from-right-2 duration-300">
                  <button 
                    onClick={() => setSelectedBank(null)}
                    className="text-[8px] font-black text-[var(--primary)] uppercase mb-4 flex items-center gap-2 hover:opacity-70"
                  >
                    ← Retour
                  </button>
                  <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-[var(--primary)] uppercase block mb-2">{selectedBank.name}</span>
                    <p className="text-[11px] text-[var(--text-main)]/80 font-medium leading-relaxed uppercase tracking-tight">
                      {selectedBank.guide}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};




const CustomBadgeDate = forwardRef(({ value, onClick, t }, ref) => {
  // Logique d'extraction identique
  let displayDay = '??';
  let displayMonth = '??';
  let displayYear = '202X';

  if (t.date) {
    const dateSeule = t.date.includes('T') ? t.date.split('T')[0] : t.date;
    const parties = dateSeule.split(dateSeule.includes('-') ? '-' : '/');
    displayDay = dateSeule.includes('-') ? parties[2] : parties[0];
    displayMonth = parties[1];
    displayYear = parties[0]; // L'année est le premier index en format YYYY-MM-DD
  } else if (t.annee) {
    displayYear = t.annee;
  }

  const moisNoms = { 
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', '05': 'MAI', '06': 'JUIN', 
    '07': 'JUIL', '08': 'AOUT', '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DEC' 
  };

  return (
    <div className="flex items-center ref={ref}">
      {/* LE BADGE VISUEL COMPACT */}
      <div 
        className="relative w-[54px] h-[54px] flex flex-col items-center justify-center bg-[var(--glass-bg)] border border-white/10 rounded-xl transition-all duration-300 shadow-lg"
      >
        {/* L'ANNÉE intégrée en haut */}
        <span className="text-[7px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em] mb-0.5">
          {displayYear}
        </span>

        {/* LE JOUR */}
        <span className="text-sm font-black text-[var(--text-main)] leading-none">
          {displayDay}
        </span>

        {/* LE MOIS */}
        <span className="text-[8px] font-bold text-[var(--primary)]/60 uppercase tracking-widest mt-1">
          {moisNoms[displayMonth] || displayMonth}
        </span>
      </div>
    </div>
  );
});








function SortableItem({ id, children, disabled }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative',
    touchAction: 'none', // Important pour le drag sur mobile
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`group relative border-white/70 transition-all rounded-[var(--radius)] ${
        isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : ''
      }`}>
        
        {/* LA POIGNÉE CENTRÉE EN HAUT */}
        {!disabled && (
          <div 
            {...listeners} 
            className="absolute top-1 left-1/2 -translate-x-1/2  w-12 h-6 flex items-center justify-center bg-[var(--glass-bg)] hover:bg-white/20 border border-white/10 rounded-full cursor-grab active:cursor-grabbing z-50 transition-colors backdrop-blur-[var(--glass-blur)]"
          >
            {/* Petit motif de points pour suggérer le drag */}
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white/40 rounded-full" />)}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}




const SortableAccountCard = ({ c, isSorting }) => {
  const montantFinal = c.soldeFinalEstime !== undefined ? c.soldeFinalEstime : c.soldePeriode;
  const isEstimated = c.soldeFinalEstime !== undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: c.compte });

  const containerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    touchAction: isSorting ? 'none' : 'auto', 
  };

  // Sécurise la valeur des intérêts
  const interets = c.interetsGagnesPériode !== undefined ? c.interetsGagnesPériode : 0;

  return (
    <div 
      ref={setNodeRef}
      style={containerStyle}
      {...attributes}
      {...listeners}
      className="flex-1 min-w-[145px] md:min-w-[160px] h-24 md:h-28 outline-none select-none" 
    >
      {/* LA CARTE VISUELLE COMPLÈTE */}
      <div 
        className={`
          w-full h-full p-2.5 md:p-3 rounded-2xl md:rounded-[var(--radius)] 
          flex flex-col justify-between
          relative overflow-hidden group 
          cursor-grab active:cursor-grabbing shadow-xl
          will-change-transform
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          backdrop-blur-[var(--glass-blur)] border
          
          /* Bordures selon état */
          ${isEstimated 
            ? 'border-white/40 saturate-[0.9]' 
            : 'border-white/10 hover:border-white/30'
          }
          
          /* 🌟 ANIMATIONS DRAG & DROP VS HOVER */
          ${isDragging 
            ? 'scale-105 rotate-2 shadow-2xl opacity-60 brightness-125 ring-2 ring-white/20' 
            : 'hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]'
          }
        `}
        style={{
          background: isEstimated
            ? `linear-gradient(135deg, ${c.couleur}88 0%, ${c.couleur}44 100%)`
            : `linear-gradient(135deg, ${c.couleur}aa 0%, ${c.couleur}66 100%)`,
        }}
      >
        {/* 1. Motif de fond vitreux */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-20" />
        
        {/* 2. 🌟 Cercle de lumière dynamique au survol restauré */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[var(--glass-bg)] rounded-full blur-2xl group-hover:bg-white/20 group-hover:scale-150 transition-all duration-700 pointer-events-none" />

        {/* 3. Header de la carte */}
        <div className="flex justify-between items-start relative z-10 w-full">
          <div className="flex flex-col items-start leading-none min-w-0 pr-1">
            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] leading-none italic truncate max-w-[90px] md:max-w-none ${isEstimated ? 'text-white/80' : 'text-white/40'}`}>
              {c.groupe || 'Compte'}
            </span>
            <h4 className="text-white font-black text-[11px] md:text-xs tracking-tight truncate max-w-[100px] md:max-w-[115px] uppercase mt-1">
              {c.compte}
            </h4>
          </div>
          
          {/* 🌟 Icône qui s'anime au survol (agrandissement + rotation) */}
          <div className={`w-7 h-7 md:w-9 md:h-9 rounded-xl backdrop-blur-[var(--glass-blur)] border flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shrink-0 ${isEstimated ? 'bg-white/30 border-white/40' : 'bg-[var(--glass-bg)] border-white/20'}`}>
            {(() => {
              const g = (c.compte || "").toString().toLowerCase().trim();
              if (g.includes('ccp')) return <CreditCard size={15} className="text-white" />;
              if (g.includes('livret') || g.includes('lep') || c.taux > 0) return <BadgeEuro size={15} className="text-white" />;
              if (g.includes('commun') || g.includes('users')) return <Users2 size={15} className="text-white" />;
              return <Wallet size={15} className="text-white" />;
            })()}
          </div>
        </div>
        
        {/* 4. Zone des chiffres : Solde à gauche & Intérêts à droite */}
        <div className="relative z-10 flex items-end justify-between w-full mt-auto gap-2 pt-1">
          
          {/* GAUCHE : LE SOLDE */}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[8.5px] md:text-[10px] font-black uppercase tracking-wider text-white/40 leading-none mb-1">
              {isEstimated ? 'Solde prévu' : 'Solde'}
            </span>
            <h3 className="text-base md:text-xl font-black text-white tracking-tighter leading-none truncate w-full">
              {montantFinal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              <span className="text-[10px] ml-0.5 font-bold text-white/60">€</span>
            </h3>
          </div>

          {/* 🌟 DROITE : AFFICHAGE DES INTÉRÊTS RESTAURÉ */}
          {c.taux > 0 && (
            <div className="flex flex-col items-end shrink-0 max-w-[50%] text-right">
              {/* Badge du Taux */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] md:text-[9.5px] font-black uppercase tracking-wider text-white/40 leading-none">
                  Intérêts
                </span>
                <span className="text-[8px] md:text-[9.5px] font-black tracking-wider bg-white/20 text-white border border-white/30 px-1 py-0.2 rounded leading-none shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                  {c.taux.toFixed(1)}%
                </span>
              </div>
              
              {/* Montant des Intérêts */}
              <h3 className="text-[11.5px] md:text-[13px] font-black text-white-300 tracking-tighter leading-none truncate w-full">
                +{interets.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                <span className="text-[9px] ml-0.5 font-bold text-white-300/70">€</span>
              </h3>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};







export function UnifiedWidgets({ user, userTheme, setUserTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeWidget, setActiveWidget] = useState(null); // null | 'notepad' | 'prorata' | 'theme'

  // --- ÉTATS & LOGIQUE BLOC-NOTES ---
  const [note, setNote] = useState("");
  useEffect(() => {
    if (user && activeWidget === 'notepad') {
      api.get(`/note/${user}`).then(res => setNote(res.data.texte));
    }
  }, [user, activeWidget]);

  const handleSaveNote = () => {
    api.post(`/note`, { utilisateur: user, texte: note });
  };

  // --- ÉTATS & LOGIQUE PRORATA ---
  const [salaires, setSalaires] = useState({ perso: 1800, partenaire: 1400 });
  const [depenses, setDepenses] = useState(1600);

  const totalSalaires = Number(salaires.perso) + Number(salaires.partenaire);
  const partPerso = totalSalaires > 0 ? (salaires.perso / totalSalaires) * 100 : 0;
  const aPayerPerso = (depenses * (partPerso / 100)).toFixed(2);
  const aPayerPartenaire = (depenses - aPayerPerso).toFixed(2);

  // --- ÉTATS & LOGIQUE NUANCIER THEME ---
  const [activeThemeKey, setActiveThemeKey] = useState(null);
  const handleColorChange = async (key, hex) => {
    setUserTheme(prev => ({ ...prev, [key]: hex }));
    try {
      await api.post('/save-user-theme', {
        user: user,
        element: key,
        couleur: hex
      });
    } catch (err) {
      console.error("Erreur sauvegarde couleur", err);
    }
  };

  const themeLabels = {
    color_revenus: "Revenus",
    color_depenses: "Dépenses",
    color_epargne: "Épargne",
    color_jauge: "Jauge Objectif",
    color_patrimoine: "Carte Solde"
  };

  // Gérer la fermeture globale
  const handleToggleMenu = () => {
    const nextState = !isMenuOpen;
    setIsMenuOpen(nextState);
    if (!nextState) {
      setActiveWidget(null);
      setActiveThemeKey(null);
    }
  };

  return (
        <div className="fixed bottom-24 lg:bottom-6 right-6 z-[1001] flex flex-col items-end gap-3 select-none">
      
      {/* =========================================================================
          LES FENÊTRES ACTIVES DES WIDGETS (S'OUVRENT À GAUCHE DU BARREAU DE BOUTONS)
          ========================================================================= */}
      
      {/* 📝 FENÊTRE 1 : BLOC-NOTES */}
      {activeWidget === 'notepad' && (
        <div className="absolute right-20 bottom-16 w-72 md:w-80 bg-white/95 backdrop-blur-[var(--glass-blur)] rounded-3xl shadow-2xl border border-white/20 p-4 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Bloc-notes</h4>
            <span className="text-[10px] text-emerald-500 font-bold">Auto-save activé</span>
          </div>
          <textarea
            className="w-full h-48 bg-transparent border-none focus:ring-0 text-slate-700 text-sm resize-none font-medium leading-relaxed outline-none"
            placeholder="Note vos trucs importants ici..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSaveNote}
          />
        </div>
      )}

      {/* 🧮 FENÊTRE 2 : PRORATA SIMULATEUR */}
      {activeWidget === 'prorata' && (
        <div className="absolute right-20 bottom-16 w-80 bg-[#0f172a]/95 backdrop-blur-[var(--glass-blur)] text-[var(--text-main)] rounded-3xl border border-white/10 shadow-2xl p-5 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Simulateur Prorata</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Mon Salaire</label>
                <input 
                  type="number" 
                  value={salaires.perso} 
                  onChange={(e) => setSalaires({...salaires, perso: e.target.value})}
                  className="w-full bg-[var(--glass-bg)] border border-white/5 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-[var(--primary)]" 
                />
              </div>
              <div>
                <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Son Salaire</label>
                <input 
                  type="number" 
                  value={salaires.partenaire} 
                  onChange={(e) => setSalaires({...salaires, partenaire: e.target.value})}
                  className="w-full bg-[var(--glass-bg)] border border-white/5 rounded-xl text-xs font-bold text-white p-2.5 outline-none focus:border-[var(--primary)]" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-black text-slate-500 uppercase mb-1">Dépenses Communes</label>
              <input 
                type="number" 
                value={depenses} 
                onChange={(e) => setDepenses(e.target.value)}
                className="w-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl text-xs font-black text-indigo-300 p-2.5 outline-none" 
              />
            </div>

            <hr className="border-white/5 my-2" />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Ma part ({partPerso.toFixed(0)}%)</span>
                <span className="font-mono font-black text-white">{aPayerPerso} €</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-400">Sa part ({(100 - partPerso).toFixed(0)}%)</span>
                <span className="font-mono font-black text-white">{aPayerPartenaire} €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 FENÊTRE 3 : PERSONNALISATEUR DE DESIGN */}
      {activeWidget === 'theme' && (
        <div className="absolute right-20 bottom-16 w-72 bg-[#0f172a]/95 backdrop-blur-[var(--glass-blur)] rounded-3xl shadow-2xl border border-white/10 p-5 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-black text-[9px] uppercase tracking-[0.2em] text-white/40">Couleurs Graphiques</h4>
            <Palette size={12} className="text-white/20" />
          </div>

          <div className="space-y-2">
            {Object.keys(userTheme).filter(key => themeLabels[key]).map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => setActiveThemeKey(activeThemeKey === key ? null : key)}
                  className="w-full flex items-center justify-between bg-[var(--glass-bg)] hover:bg-white/[0.04] p-2.5 rounded-xl border border-white/5 transition-all"
                >
                  <span className="text-[10px] font-bold text-white/70">{themeLabels[key]}</span>
                  <div 
                    className="w-5.5 h-5.5 rounded-lg border border-white/20 shadow-md" 
                    style={{ backgroundColor: userTheme[key] }} 
                  />
                </button>

                {activeThemeKey === key && (
                  <div className="absolute right-full mr-3 bottom-0 z-[1002] animate-in zoom-in-95 duration-200">
                    <div className="fixed inset-0" onClick={() => setActiveThemeKey(null)} />
                    <SketchPicker
                      color={userTheme[key]}
                      onChangeComplete={(color) => handleColorChange(key, color.hex)}
                      disableAlpha={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* =========================================================================
          LE COLLIMATEUR DE BOUTONS FLOTTANTS (MENU VERTICAL COMMUTABLE)
          ========================================================================= */}
      
      {/* SOUS-BOUTONS DE SELECTION */}
      {isMenuOpen && (
        <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-auto">
          
          {/* BOUTON 1 : NOTE BLOC (Notepad) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'notepad' ? null : 'notepad')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'notepad' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-105' 
                : 'bg-[var(--primary)] text-white hover:scale-105 border border-white/5'
            }`}
            title="Bloc-notes"
          >
            <StickyNote size={18} />
          </button>

          {/* BOUTON 2 : CALCULATEUR DE PRORATA (Prorata) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'prorata' ? null : 'prorata')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'prorata' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-105' 
                : 'bg-indigo-600 text-white hover:scale-105 border border-white/5'
            }`}
            title="Calculateur Prorata"
          >
            <Calculator size={18} />
          </button>

          {/* BOUTON 3 : COLOR DESIGNER (Theme) */}
          <button
            onClick={() => setActiveWidget(activeWidget === 'theme' ? null : 'theme')}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all ${
              activeWidget === 'theme' 
                ? 'bg-white text-slate-900 shadow-[0_0_12px_rgba(255,255,255,0.4)] scale-105' 
                : 'bg-slate-800 text-white hover:scale-105 border border-white/10'
            }`}
            title="Teintes Graphiques"
          >
            <Settings2 size={18} />
          </button>

        </div>
      )}

      {/* BOUTON MAÎTRE : DÉCLENCHEUR DU CARROUSEL */}
      <button
        onClick={handleToggleMenu}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-300 pointer-events-auto ${
          isMenuOpen 
            ? 'bg-slate-900 text-white border-white/10 rotate-90 scale-95' 
            : 'bg-[var(--primary)] text-white border-transparent hover:scale-110'
        }`}
        title="Menu Widgets"
      >
        {isMenuOpen ? <X size={22} /> : <Settings2 size={22} />}
      </button>

    </div>
  );
}









const GridTile = React.memo(({ jour, index, totalJours }) => {
  const couleursIntensite = [
    'bg-white/[0.03] border-white/5', 
    'bg-rose-950/40 border-rose-900/20 text-rose-300', 
    'bg-rose-800/50 border-rose-700/30 text-rose-200', 
    'bg-rose-600/70 border-rose-500/40 text-rose-100', 
    'bg-rose-500 border-rose-400 text-white font-bold' 
  ];

  const estAuDebut = index < 14; 
  const estALaFin = index >= (totalJours - 14); 

  let classeXTooltip = "left-1/2 -translate-x-1/2"; 
  let classeXFleche = "left-1/2 -translate-x-1/2";
  
  if (estAuDebut) {
    classeXTooltip = "left-0 translate-x-0";
    classeXFleche = "left-1.5 translate-x-0";
  } else if (estALaFin) {
    classeXTooltip = "right-0 translate-x-0 left-auto";
    classeXFleche = "right-1.5 translate-x-0 left-auto";
  }

  const indexJourSemaine = index % 7;
  const estEnBas = indexJourSemaine >= 4; 

  const classeYTooltip = estEnBas ? "bottom-full mb-2 flex-col-reverse" : "top-full mt-2 flex-col";
  const classeYFleche = estEnBas ? "border-r border-b -mb-1" : "border-l border-t -mt-1";

  return (
    <div
      className={`w-3.5 h-3.5 rounded-sm border transition-all duration-150 relative group/tile ${couleursIntensite[jour.niveauIntensite]}`}
    >
      <div className={`absolute hidden group-hover/tile:flex items-center pointer-events-none z-50 animate-in fade-in duration-150 ${classeYTooltip} ${classeXTooltip}`}>
        <div className="bg-neutral-900/95 border border-white/10 text-white rounded-xl px-2.5 py-2 text-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[130px] isolate">
          <p className="text-[8px] font-black text-white/40 uppercase tracking-wider">{jour.affichage}</p>
          <p className="text-xs font-black tracking-tight text-rose-400 mt-0.5 whitespace-nowrap">
            {jour.montant > 0 ? `${jour.montant.toLocaleString('fr-FR')} €` : '0,00 €'}
          </p>
        </div>
        <div className={`w-1.5 h-1.5 bg-neutral-900 border-white/10 rotate-45 z-50 ${classeYFleche} ${classeXFleche}`} />
      </div>
    </div>
  );
});

// 3. N'oublie pas de lui donner son displayName pour les outils de dev si nécessaire
GridTile.displayName = 'GridTile';













 const MAP_ICONES = {
  fastfood: <Flame size={14} />,
  shopping: <ShoppingCart size={14} />,
  car: <Terminal size={14} />, 
  home: <Lightbulb size={14} />,
  sub: <Sparkles size={14} />,
  salary: <ShoppingCart size={14} />, 
  star: <Sparkles size={14} />,
  alert: <AlertTriangle size={14} />,
  health: <HeartPulse size={14} />,
  leisure: <Ticket size={14} />,
  crypto: <Wallet size={14} />,
  tech: <Cpu size={14} />,
  travel: <Plane size={14} />,
  gift: <Gift size={14} />
};

const MAP_COULEURS = {
  rose: { bg: "bg-rose-500/[0.03] border-rose-500/10", text: "text-rose-400" },
  amber: { bg: "bg-amber-500/[0.03] border-amber-500/10", text: "text-amber-400" },
  emerald: { bg: "bg-emerald-500/[0.03] border-emerald-500/10", text: "text-emerald-400" },
  indigo: { bg: "bg-indigo-500/[0.02] border-indigo-500/20", text: "text-indigo-400" },
  cyan: { bg: "bg-cyan-500/[0.03] border-cyan-500/10", text: "text-cyan-400" },
  violet: { bg: "bg-violet-500/[0.03] border-violet-500/10", text: "text-violet-400" },
  blue: { bg: "bg-blue-500/[0.03] border-blue-500/10", text: "text-blue-400" },
  orange: { bg: "bg-orange-500/[0.03] border-orange-500/10", text: "text-orange-400" },
  red: { bg: "bg-red-500/[0.03] border-red-500/10", text: "text-red-400" },
  fuchsia: { bg: "bg-fuchsia-500/[0.03] border-fuchsia-500/10", text: "text-fuchsia-400" },
};



// Moteur de calcul éphémère pour les statistiques créées sur-mesure
const calculerMontantStatPerso = (config, transactions) => {
  const transactionsFiltrees = transactions.filter(t => {
    const montant = parseFloat(t.montant) || 0;
    if (config.flux_type === "depenses" && montant > 0) return false;
    if (config.flux_type === "revenus" && montant < 0) return false;

    const resultatsRegles = config.regles.map(r => {
      let valeurChamp = "";

      if (r.champ === "categorie") {
        valeurChamp = (t.categorie || "").toLowerCase();
      } else if (r.champ === "nom") {
        valeurChamp = (t.nom || "").toLowerCase();
      } else if (r.champ === "jour") {
        if (!t.date) return false;
        const dateObj = new Date(t.date);
        valeurChamp = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
      } else if (r.champ === "montant") {
        const valeurAbsolue = Math.abs(montant);
        const seuilCible = parseFloat(r.valeur);
        if (r.condition === "GREATER_THAN") return valeurAbsolue > seuilCible;
        if (r.condition === "LESS_THAN") return valeurAbsolue < seuilCible;
      }

      const valeurCible = (r.valeur || "").toLowerCase();
      
      if (r.condition === "EQUALS") return valeurChamp === valeurCible;
      if (r.condition === "CONTAINS") return valeurChamp.includes(valeurCible);
      return false;
    });

    return config.operateur === "OR" 
      ? resultatsRegles.some(res => res === true)
      : resultatsRegles.every(res => res === true);
  });

  return transactionsFiltrees.reduce((sum, t) => sum + Math.abs(parseFloat(t.montant) || 0), 0);
};







export function ImportPowensModal({ 
  userToken, 
  utilisateur, 
  comptes = [], 
  toutesLesTransactions = [], 
  syncCountByAccount = {}, // 👈 Vérification du nombre réel en attente
  onClose, 
  onSuccess 
}) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [modeDate, setModeDate] = useState('smart');

  const now = new Date();
  const todayStr = toLocalDateString(now);
  const [dateDebut, setDateDebut] = useState(todayStr);
  const [dateFin, setDateFin] = useState(todayStr);

// 🟢 CALCUL DU DÉBUT DE PÉRIODE BASÉ SUR LA 1ÈRE TRANSACTION NON IMPORTÉE
  const calculateSmartStartDate = (accId, fetchedAccounts) => {
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfCurrentMonthStr = firstOfCurrentMonth.toISOString().split('T')[0];

    // 1. Trouver le compte Kleea local
    const accountObj = fetchedAccounts.find(a => String(a.id) === String(accId));
    const powensAccName = accountObj ? accountObj.name : "";

    const associatedLocal = comptes.find(
      c => (c.powens_name || "").trim().toUpperCase() === (powensAccName || "").trim().toUpperCase()
    );
    const targetCompteName = associatedLocal ? associatedLocal.compte : powensAccName;

    // 2. Vérifier les données d'attente de ce compte
    const pendingData = syncCountByAccount?.[targetCompteName] || syncCountByAccount?.[powensAccName];
    const pendingCount = typeof pendingData === 'object' ? pendingData?.count : Number(pendingData || 0);
    const earliestPendingDate = typeof pendingData === 'object' ? pendingData?.earliest_date : null;

    // Si le compte est déjà à jour (0 en attente) -> 1er du mois en cours
    if (!pendingCount || pendingCount === 0) {
      return firstOfCurrentMonthStr;
    }

    // 🟢 Si la plus ancienne transaction non importée est dans le mois en cours (ex: 01/10)
    // -> On commence strictement au 1er du mois en cours (Septembre ne sera pas affiché !)
    if (earliestPendingDate && earliestPendingDate >= firstOfCurrentMonthStr) {
      return firstOfCurrentMonthStr;
    }

    // 🟢 Si et seulement si des transactions manquent dans le mois précédent (ex: 28/09)
    // -> On commence à cette date précise de septembre
    if (earliestPendingDate && earliestPendingDate < firstOfCurrentMonthStr) {
      return earliestPendingDate;
    }

    return firstOfCurrentMonthStr;
  };

  const smartButtonLabel = useMemo(() => {
    if (!dateDebut) return "Mois en cours";
    const firstOfCurrentMonthStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    if (dateDebut < firstOfCurrentMonthStr) {
      const prevDate = new Date(dateDebut);
      const nomMoisPrecedent = prevDate.toLocaleDateString('fr-FR', { month: 'long' });
      const moisMaj = nomMoisPrecedent.charAt(0).toUpperCase() + nomMoisPrecedent.slice(1);
      return `Mois en cours + ${moisMaj}`;
    }

    return "Mois en cours";
  }, [dateDebut, now]);

  useEffect(() => {
    async function fetchAccounts() {
      if (!userToken) return;
      try {
        setLoading(true);
        const res = await api.get(`/powens/accounts?user_token=${encodeURIComponent(userToken)}`);
        const fetchedAccounts = res.data || [];
        setAccounts(fetchedAccounts);

        if (fetchedAccounts.length > 0) {
          const firstId = String(fetchedAccounts[0].id);
          setSelectedAccount(firstId);
          
          const smartStart = calculateSmartStartDate(firstId, fetchedAccounts);
          setDateDebut(smartStart);
          setDateFin(todayStr);
        }
      } catch (err) {
        console.error("Erreur chargement comptes:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccounts();
  }, [userToken]);

  const handleAccountChange = (newAccId) => {
    setSelectedAccount(newAccId);
    if (modeDate === 'smart') {
      const smartStart = calculateSmartStartDate(newAccId, accounts);
      setDateDebut(smartStart);
      setDateFin(todayStr);
    }
  };

  const handleModeChange = (mode) => {
    setModeDate(mode);
    if (mode === 'smart') {
      const smartStart = calculateSmartStartDate(selectedAccount, accounts);
      setDateDebut(smartStart);
      setDateFin(todayStr);
    }
  };

  const accountOptions = accounts.map((acc) => ({
    v: String(acc.id),
    l: `${acc.bank_name ? `[${acc.bank_name}] ` : ''}${acc.name} ${acc.balance !== undefined ? `(${acc.balance}€)` : ''}`
  }));

  const handleImport = async () => {
    if (!selectedAccount) return;
    setImporting(true);
    try {
      const accountObj = accounts.find(a => String(a.id) === String(selectedAccount));
      const accountName = accountObj ? accountObj.name : "Powens";

      const associatedLocalAccount = comptes.find(
        (c) => (c.powens_name || "").trim().toUpperCase() === (accountName || "").trim().toUpperCase()
      );
      const targetLocalAccountName = associatedLocalAccount ? associatedLocalAccount.compte : accountName;

      const res = await api.get(
        `/import-powens?utilisateur=${encodeURIComponent(utilisateur)}&user_token=${encodeURIComponent(userToken)}&account_id=${selectedAccount}&compte_nom=${encodeURIComponent(accountName)}&date_debut=${dateDebut}&date_fin=${dateFin}`
      );

      onSuccess(res.data, targetLocalAccountName);
      onClose();
    } catch (err) {
      console.error("Erreur import Powens:", err);
      toast.error("Erreur lors de l'importation");
    } finally {
      setImporting(false);
    }
  };

  const formatDateApercu = (dStr) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dStr;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#0f0f10] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl relative space-y-6">
        
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[var(--primary)]/10 rounded-2xl text-[var(--primary)] border border-[var(--primary)]/20">
              <Landmark size={20} />
            </div>
            <div>
              <h3 className="text-[13px] font-black uppercase tracking-widest text-[var(--text-main)]">
                Comptes Powens
              </h3>
              <p className="text-[9px] text-[var(--text-main)]/30 font-bold uppercase tracking-wider">
                Compte et période d'import
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-main)]/30 hover:text-rose-500 p-2 text-xs font-black uppercase transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <RefreshCw size={24} className="text-[var(--primary)] animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
              Chargement des comptes bancaires...
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-center text-xs text-rose-400 py-4 font-bold">
            Aucun compte trouvé sur cette connexion bancaire.
          </p>
        ) : (
          <div className="space-y-5">
            
            {/* Sélection du compte */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                Compte à importer
              </label>
              
              <CustomSelect 
                value={selectedAccount}
                onChange={handleAccountChange}
                options={accountOptions}
                icon={Landmark}
              />
            </div>

            {/* Sélecteur de mode de période */}
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                Période des transactions
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
                
                <button
                  type="button"
                  onClick={() => handleModeChange('smart')}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[8.5px] font-black uppercase tracking-tight transition-all cursor-pointer leading-tight text-center ${
                    modeDate === 'smart'
                      ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20'
                      : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  <Clock size={11} className="shrink-0" />
                  <span className="truncate">
                    {smartButtonLabel}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleModeChange('custom_date')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[8.5px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    modeDate === 'custom_date'
                      ? 'bg-[var(--primary)] text-black shadow-lg shadow-[var(--primary)]/20'
                      : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                  }`}
                >
                  <Calendar size={11} /> Personnalisé
                </button>
              </div>

              {/* Indicateur visuel des dates */}
              {modeDate === 'smart' && (
                <p className="text-[8px] text-emerald-400/80 font-bold uppercase tracking-wider px-1 pt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Du {formatDateApercu(dateDebut)} au {formatDateApercu(dateFin)}
                </p>
              )}
            </div>

            {/* Dates personnalisées */}
            {modeDate === 'custom_date' && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">Du</label>
                  <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[var(--primary)] transition-all">
                    <DatePicker
                      selected={dateDebut ? new Date(dateDebut) : null}
                      onChange={(date) => setDateDebut(toLocalDateString(date))}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full cursor-pointer"
                      calendarClassName="custom-calendar-dark"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40">Au</label>
                  <div className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[var(--primary)] transition-all">
                    <DatePicker
                      selected={dateFin ? new Date(dateFin) : null}
                      onChange={(date) => setDateFin(toLocalDateString(date))}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full cursor-pointer"
                      calendarClassName="custom-calendar-dark"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={onClose} 
                className="px-4 py-2.5 text-[9px] font-black text-[var(--text-main)]/30 hover:text-rose-500 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button 
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-black font-black uppercase text-[10px] rounded-xl hover:scale-105 transition-all shadow-xl shadow-[var(--primary)]/20 disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <RefreshCw size={12} className="animate-spin" /> Récupération...
                  </>
                ) : (
                  <>
                    <Check size={12} strokeWidth={3} /> Importer ce compte
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}





function FinanceApp() {



const [showExportModal, setShowExportModal] = useState(false);
  
// Liste des mois pour le select
const moisListe = [
  { v: "Janvier", l: "Janvier" }, 
  { v: "Février", l: "Février" },
  { v: "Mars", l: "Mars" },
  { v: "Avril", l: "Avril" },
  { v: "Mai", l: "Mai" },
  { v: "Juin", l: "Juin" },
  { v: "Juillet", l: "Juillet" },
  { v: "Aout", l: "Aout" },
  { v: "Septembre", l: "Septembre" },
  { v: "Octobre", l: "Octobre" },
  { v: "Novembre", l: "Novembre" },
  { v: "Décembre", l: "Décembre" }
];



  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRightTab, setActiveRightTab] = useState('graphs'); // 'graphs' ou 'projects'
  const [itemToDelete, setItemToDelete] = useState(null); // Stocke le nom du projet à supprimer
  const [projets, setProjets] = useState([]);
  const [form2, setForm2] = useState({ nom: '', cout: '', capa: '', date: '2026-06-01' });
  const [user, setUser] = useState(localStorage.getItem('user'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || 'user'); // 👈 Nouvel état
  const [loginName, setLoginName] = useState('')
  const [comptes, setComptes] = useState([]);

  // 🟢 Helper pour trouver le compte par défaut (CCP en priorité, sinon 1er compte)
  const getCompteDefaut = (nomProfil, listeComptes) => {
    if (!listeComptes || listeComptes.length === 0) return 'tous';

    // 1. On cible les comptes du profil concerné
    const comptesCibles = (nomProfil && nomProfil !== 'Tous')
      ? listeComptes.filter(c => c.groupe?.trim().toLowerCase() === nomProfil?.trim().toLowerCase())
      : listeComptes;

    const listeAAnalyser = comptesCibles.length > 0 ? comptesCibles : listeComptes;

    // 2. On cherche le CCP en priorité
    const compteCCP = listeAAnalyser.find(c => c.compte?.trim().toUpperCase().includes('CCP'));
    if (compteCCP) return compteCCP.compte;

    // 3. Sinon, le premier compte de la liste
    return listeAAnalyser[0]?.compte || 'tous';
  };

  const [selectedCompte, setSelectedCompte] = useState(''); // 👈 Ne démarre plus sur 'tous'
  const [importCompte, setImportCompte] = useState('');
  const initialCompteDefini = useRef(false);

  // 🟢 Applique le CCP ou le 1er compte par défaut dès que les comptes sont chargés
  useEffect(() => {
    if (comptes.length > 0 && !initialCompteDefini.current) {
      const profilActuel = filtersByPage['gerer']?.profil || filters.profil;
      const compteInitial = getCompteDefaut(profilActuel, comptes);
      if (compteInitial) {
        setSelectedCompte(compteInitial);
        initialCompteDefini.current = true;
      }
    }
  }, [comptes]);

  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'Alimentation' })
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'bg', 'primary', 'text' ou null
  const [showPicker, setShowPicker] = useState(null); // Pour savoir quel picker est ouvert
  const handleColorChange = (index, color) => {
  const newComptes = [...comptes]; newComptes[index].couleur = color.hex; setComptes(newComptes);};
  const [newCompteColor, setNewCompteColor] = useState("#6366f1"); // Couleur par défaut
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [tabActive, setTabActive] = useState('revenus');

  // 💡 Dans la déclaration de ton useState (au tout début)
// =========================================================================
// 🟢 GESTIONNAIRE DE FILTRES INDÉPENDANTS PAR PAGE
// =========================================================================
const getPageKey = (tab) => {
  if (tab === 'previsions' || tab === 'previsionnel') return 'previsionnel';
  if (tab === 'gerer' || tab === 'transactions') return 'gerer';
  if (tab === 'dashboard') return 'dashboard';
  return 'default';
};

const getDefaultPeriod = () => ({
  profil: 'Tous',
  annee: new Date().getFullYear().toString(),
  mois: moisListe[new Date().getMonth()]?.v || 'Janvier'
});

const [filtersByPage, setFiltersByPage] = useState(() => {
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const saved = localStorage.getItem(`filters_v3_${savedUser.toLowerCase()}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          dashboard: parsed.dashboard || getDefaultPeriod(),
          previsionnel: parsed.previsionnel || parsed.previsions || getDefaultPeriod(),
          gerer: parsed.gerer || parsed.transactions || getDefaultPeriod(),
          default: parsed.default || getDefaultPeriod()
        };
      } catch (e) {
        console.error(e);
      }
    }
  }

  const def = getDefaultPeriod();
  return {
    dashboard: { ...def },
    previsionnel: { ...def },
    gerer: { ...def },
    default: { ...def }
  };
});

const currentKey = getPageKey(activeTab);
const filters = filtersByPage[currentKey] || filtersByPage['dashboard'] || getDefaultPeriod();

const setFilters = (newFiltersOrFn) => {
  setFiltersByPage(prev => {
    const targetKey = getPageKey(activeTab);
    const currentFilters = prev[targetKey] || prev['default'] || getDefaultPeriod();

    const updated = typeof newFiltersOrFn === 'function' 
      ? newFiltersOrFn(currentFilters) 
      : { ...currentFilters, ...newFiltersOrFn };

    const nextState = {
      ...prev,
      [targetKey]: updated
    };

    if (user) {
      const u = typeof user === 'string' ? user.toLowerCase() : user?.nom?.toLowerCase();
      if (u) {
        localStorage.setItem(`filters_v3_${u}`, JSON.stringify(nextState));
      }
    }

    return nextState;
  });
};

  const [deleteModal, setDeleteModal] = useState({ show: false, accountName: null });
  const [toutesLesTransactions, setToutesLesTransactions] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [editingId, setEditingId] = useState(null); // Stocke le nom ou l'ID du projet en cours d'édition*
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [ordreComptes, setOrdreComptes] = useState(() => {
  const saved = localStorage.getItem('ordre_comptes_favoris');
  return saved ? JSON.parse(saved) : [];
});
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const toggleCategory = (name) => {
    setHiddenCategories(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

const [editingIndex, setEditingIndex] = useState(null);



const [toutesLesCategories, setToutesLesCategories] = useState([]);
const [categoriesPerso, setCategoriesPerso] = useState([]);
const [masquees, setMasquees] = useState([]); // <-- Nouvel état à ajouter
/*
useEffect(() => {
  const chargerDonnees = async () => {
    try {
      // Axios combine l'appel et le .json()
      const [resCats, resMasquees] = await Promise.all([
        api.get(`/api/categories/${user}`),
        api.get(`/api/categories_masquees/${user}`)
      ]);

      // Avec Axios, les données sont dans .data
      setToutesLesCategories(resCats.data.all || []);
      setCategoriesPerso(resCats.data.perso || []);
      setMasquees(resMasquees.data || []);
      
    } catch (err) {
      console.error("Erreur lors du chargement des catégories:", err);
      // Fallback : au moins afficher les catégories par défaut si l'API crash
      setToutesLesCategories(CATEGORIES_DEFAUT_FRONT); 
    }
  };

  if (user) chargerDonnees();
}, [user]);
*/


const [userTheme, setUserTheme] = useState({
  color_revenus: "#10b981",
  color_depenses: "#f43f5e",
  color_epargne: "#ffffff",
  color_jauge: "#f1c40f",
  color_patrimoine: "#37b58f"
});


  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  const openDeleteModal = (name) => {
  setDeleteModal({ show: true, accountName: name });
};

const confirmDelete = async () => {
  if (!deleteModal.accountName) return;

  try {
    // ON AJOUTE L'UTILISATEUR À L'URL POUR CORRESPONDRE AU BACKEND
    const url = `/config-comptes/${encodeURIComponent(deleteModal.accountName)}/${encodeURIComponent(user)}`;
    
    await api.delete(url);
    
    // Rafraîchir la liste après suppression
    fetchComptes();
    
    // 💡 AJOUT : Supprime instantanément de l'affichage les virements associés au compte effacé
    fetchCategories();
    
    // Fermer la modal
    setDeleteModal({ show: false, accountName: null });
    
  } catch (err) {
    console.error("Erreur détaillée:", err.response?.data);
    toast.error("Erreur lors de la suppression. Vérifie les logs console.");
  }
};
  
  

  const updateThemeLive = (variable, value) => {
    document.documentElement.style.setProperty(variable, value);
    // Optionnel: on met aussi à jour le localStorage en bonus
    const currentTheme = JSON.parse(localStorage.getItem('mycash-theme')) || {};
    currentTheme[variable] = value;
    localStorage.setItem('mycash-theme', JSON.stringify(currentTheme));
  };

const fetchUserTheme = async (username) => {
  try {
    const resTheme = await api.get(`/get-theme/${username}`);
    if (resTheme.data) {
      document.documentElement.style.setProperty('--bg-site', resTheme.data.bg_site);
      document.documentElement.style.setProperty('--primary', resTheme.data.primary_color);
      document.documentElement.style.setProperty('--text-main', resTheme.data.text_main);
      document.documentElement.style.setProperty('--radius', resTheme.data.radius);
      document.documentElement.style.setProperty('--glass-blur', resTheme.data.glass_blur || '12px');
      document.documentElement.style.setProperty('--glass-bg', resTheme.data.glass_bg || 'rgba(255, 255, 255, 0.03)');

      // 🟢 METTRE EN CACHE POUR UN CHARGEMENT INSTANTANÉ AU PROCHAIN RAFRAÎCHISSEMENT
      localStorage.setItem('kleea-theme-cache', JSON.stringify(resTheme.data));
    }

    const resColors = await api.get(`/get-user-theme/${username}`);
    if (resColors.data && Object.keys(resColors.data).length > 0) {
      setUserTheme(prev => ({ ...prev, ...resColors.data }));
    }
  } catch (err) {
    console.error("Erreur chargement thème SQL", err);
  }
};




  const handleSaveThemeSQL = async () => {
  const styles = getComputedStyle(document.documentElement);
  const themeData = {
    utilisateur: user,
    bg_site: styles.getPropertyValue('--bg-site').trim() || '#152c48',
    primary_color: styles.getPropertyValue('--primary').trim() || '#4f46e5',
    text_main: styles.getPropertyValue('--text-main').trim() || '#0f172a',
    radius: styles.getPropertyValue('--radius').trim() || '1.5rem',
    glass_blur: getComputedStyle(document.documentElement).getPropertyValue('--glass-blur').trim()|| '#f8fafc',
    glass_bg: getComputedStyle(document.documentElement).getPropertyValue('--glass-bg').trim()|| '#f8fafc',
  };

  try {
    await api.post(`/save-theme`, themeData);
    toast.success("Configuration propagée avec succès ! 🚀");
  } catch (err) {
    console.error(err);
    toast.error("Échec de la synchronisation cloud.");
  }
};


const fetchComptes = async () => {
  if (!user) {
    setLoading(false);
    return;
  }
  try {
    const res = await api.get(`/config-comptes/${user}`);
    setComptes(res.data || []);
  } catch (err) {
    console.error("Erreur chargement comptes", err);
  } finally {
    setLoading(false);
  }
};


const [selectedType, setSelectedType] = useState("");
const [compteName, setCompteName] = useState("");
const [creationPowensName, setCreationPowensName] = useState("");

const typeOptions = [
  { v: "CCP", l: "CCP" },
  { v: "LIVRET A", l: "LIVRET A" },
  { v: "LEP", l: "LEP" },
  { v: "LDDS", l: "LDDS" },
  { v: "PEL", l: "PEL" },
  { v: "PEA", l: "PEA" },
  { v: "ASSURANCE VIE", l: "ASSURANCE VIE" },
  { v: "PRET", l: "PRET" }
];

const handleAddCompte = async (e) => {
  e.preventDefault();
  
  let nomSaisi = compteName.trim().toUpperCase();
  if (!nomSaisi) {
    toast.warning("Veuillez saisir un nom pour votre compte !");
    return;
  }

  const finalCompteName = selectedType ? `${selectedType} - ${nomSaisi}` : nomSaisi;

  const nouveauCompte = {
    compte: finalCompteName,
    groupe: e.target.elements["compteGroupe"].value.trim().toUpperCase(),
    solde: parseFloat(e.target.elements["compteSolde"]?.value) || 0,
    taux: e.target.elements["compteTaux"] ? (parseFloat(e.target.elements["compteTaux"].value) || 0) : 0,
    objectif: 0,
    couleur: newCompteColor,
    utilisateur: user,
    powens_name: creationPowensName || null 
  };

  try {
    await api.post(`/config-comptes`, nouveauCompte);
    e.target.reset(); 
    setCompteName(""); 
    setSelectedType(""); 
    setNewCompteColor("#6366f1"); 
    setCreationPowensName(""); 
    setShowAddPicker(false);
    
    // 🟢 EN MODE AUTO : Réconciliation immédiate des virements + recalibrage des soldes
    if (importMode === 'auto') {
      try {
        await api.post(`/powens/sync-user/${user}`);
        await api.post(`/powens/reconcile-and-recalculate/${user}`);
        await fetchTransactions();
        await fetchComptes();

        setCelebrationModal({
          show: true,
          accountName: finalCompteName,
          count: toutesLesTransactions.length
        });
      } catch (syncErr) {
        console.error("Échec du recalibrage automatique:", syncErr);
      }
    } else {
      await fetchComptes();   
      await fetchCategories(); 
    }
  } catch (err) {
    toast.error("Erreur lors de l'ajout du compte.");
  }
};


  // Fonction pour mettre à jour un compte au moment où on finit de taper
  const handleBlurUpdate = async (compteModifie) => {
    try {
      // On nettoie le nom pour l'URL au cas où
      const compteName = compteModifie.compte.trim(); 
      await api.put(`/config-comptes/${compteName}`, compteModifie);
      fetchComptes(); // Optionnel : rafraîchir pour être sûr d'avoir les données du serveur
    } catch (err) {
      console.error("Erreur de sauvegarde automatique", err);
    }
  };



// 🟢 NE ROUVRE PAS LA MODALE SI ON REVIENT DE POWENS OU SI UNE BANQUE EST DÉJÀ LIÉE
const fetchTransactions = async () => {
  try {
    const res = await api.get(`/transactions/${user}`);
    const transactionsList = res.data || [];
    setToutesLesTransactions(transactionsList);

    // Vérifications contextuelles
    const urlParams = new URLSearchParams(window.location.search);
    const isReturningFromPowens = urlParams.has('code') || urlParams.has('connection_id');
    const hasPowensToken = Boolean(localStorage.getItem("powens_user_token"));
    const hasPassedOnboarding = localStorage.getItem(`onboarding_done_${user}`) === 'true';

    // 🟢 La modale ne s'ouvre QUE pour un premier accès réel (pas au retour de Powens)
    if (
      transactionsList.length === 0 &&
      !onboardingDismissed &&
      !isReturningFromPowens &&
      !hasPowensToken &&
      !hasPassedOnboarding
    ) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  } catch (err) {
    console.error("Erreur fetch:", err);
  }
};



const [isRegistering, setIsRegistering] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [loginPassword, setLoginPassword] = useState(''); // Ajoute cette ligne
const [loginEmail, setLoginEmail] = useState('');
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [isForgotPassword, setIsForgotPassword] = useState(false);
const [resetEmail, setResetEmail] = useState('');







const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post('/login', { 
      nom: loginName,
      password: loginPassword 
    });
    
    localStorage.setItem('token', res.data.access_token);
    localStorage.setItem('user', res.data.user.toLowerCase());
    setUser(res.data.user.toLowerCase());
  } catch (err) {
    // 🛡️ 1. IP bloquée / Pare-feu déclenché (403)
    if (err.response && err.response.status === 403) {
      const messageDetail = err.response.data?.detail || "Trop d'échecs. Votre adresse IP a été suspendue temporairement.";
      toast.error(messageDetail, {
        duration: 8000,
        icon: (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
            <ShieldAlert size={16} strokeWidth={2.5} />
          </div>
        )
      });
    } 
    // 🔒 2. Mot de passe incorrect avec décompte (401)
    else if (err.response && err.response.status === 401) {
      const messageDetail = err.response.data?.detail || "Mot de passe incorrect.";
      toast.error(messageDetail, {
        duration: 5000,
        icon: (
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)] mr-2.5">
            <Lock size={15} strokeWidth={2.5} />
          </div>
        )
      });
    } 
    // 👤 3. Utilisateur ou e-mail introuvable (404)
    else if (err.response && err.response.status === 404) {
      toast.error("Identifiant ou adresse e-mail inconnu.", {
        duration: 4000,
        icon: (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
            <UserX size={16} strokeWidth={2.5} />
          </div>
        )
      });
    } 
    // ⚠️ 4. Autre message d'erreur envoyé par FastAPI
    else if (err.response?.data?.detail) {
      toast.error(err.response.data.detail);
    } 
    // 📡 5. Panne réseau / Serveur inaccessible
    else {
      toast.error("Impossible de joindre le serveur Kleea.", {
        icon: (
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
            <WifiOff size={15} strokeWidth={2.5} />
          </div>
        )
      });
    }
  }
};

const handleLogout = () => {
  // 1. Nettoyage impératif des clés résiduelles dans le navigateur
  localStorage.removeItem('user');
  localStorage.removeItem('powens_user_token'); // 👈 Évite de transmettre le jeton au prochain utilisateur
  localStorage.removeItem('token');

  // 2. Réinitialisation des états pour la session suivante
  setUser(null);
  setImportMode('manual'); // 👈 Réinitialise impérativement à 'manual'
  setComptes([]);
  setPowensData({ connections_count: 0, connections: [], accounts_count: 0, accounts: [] }); // 👈 Vide les banques connectées
  setShowOnboarding(false);
  setOnboardingDismissed(false);
  setLoading(true);
  setLoginName('');
  setLoginPassword('');
};



const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post(`/register`, { 
      nom: loginName, 
      email: loginEmail,
      password: loginPassword,
      first_name: firstName, 
      last_name: lastName
    });

    // 🟢 ENREGISTRER LE TOKEN D'ACCÈS IMMÉDIATEMENT
    if (res.data?.access_token) {
      localStorage.setItem('token', res.data.access_token);
    }
    
    const usernameClean = (res.data?.user || loginName).toLowerCase();
    localStorage.setItem('user', usernameClean);
    setUser(usernameClean);

    toast.success("Compte créé ! Bienvenue chez Kleea.");
  } catch (err) {
    toast.error(err.response?.data?.detail || "Erreur lors de l'inscription.");
  }
};

const handleResetRequest = async (e) => {
  e.preventDefault();
  try {
    await api.post(`forgot-password`, { email: resetEmail });
    toast.success("Si cet email existe, un lien a été envoyé.");
    setIsForgotPassword(false);
  } catch (err) {
    toast.error("Erreur lors de la demande.");
  }
};


const deleteTransaction = async (id) => {
  if (window.confirm("Supprimer cette transaction ?")) {
    try {
      await api.delete(`/transactions/${id}`);
      // Mise à jour locale immédiate sans refetch
      setToutesLesTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      toast.error("Erreur de suppression de la transaction.");
      fetchTransactions(); // En cas d'erreur, on resynchronise
    }
  }
};


useEffect(() => {
  const fetchPeriods = async () => {
    try {
      const res = await api.get(`/dashboard/periodes/${user}`);
      setAvailablePeriods(res.data);
      // Suppression du setFilters d'ici pour éviter les doublons de logique
    } catch (err) {
      console.error("Erreur périodes:", err);
    }
  };

  if (user) {
    fetchPeriods();
  }
}, [user, toutesLesTransactions]);

// --- 1. CHARGEMENT AU CHANGEMENT D'UTILISATEUR ---
useEffect(() => {
  if (!user) return;
  const u = typeof user === 'string' ? user.toLowerCase() : user?.nom?.toLowerCase();
  const saved = localStorage.getItem(`filters_v3_${u}`);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setFiltersByPage({
        dashboard: parsed.dashboard || getDefaultPeriod(),
        previsionnel: parsed.previsionnel || parsed.previsions || getDefaultPeriod(),
        gerer: parsed.gerer || parsed.transactions || getDefaultPeriod(),
        default: parsed.default || getDefaultPeriod()
      });
      return;
    } catch (e) {
      console.error(e);
    }
  }

  const def = getDefaultPeriod();
  setFiltersByPage({
    dashboard: { ...def },
    previsionnel: { ...def },
    gerer: { ...def },
    default: { ...def }
  });
}, [user]);

// --- 2. INITIALISATION DOUCE (PRÉVISIONNEL = MOIS/ANNÉE EN COURS) ---
useEffect(() => {
  if (comptes.length === 0) return;

  const targetKey = getPageKey(activeTab);
  const currentF = filtersByPage[targetKey];

  // Si la page a déjà ses filtres enregistrés, ON NE TOUCHE À RIEN
  if (currentF && currentF.profil && currentF.profil !== '' && currentF.annee && currentF.mois) {
    return;
  }

  const groupesUniques = [...new Set(comptes.map(c => c.groupe).filter(Boolean))].sort();
  const profilInitial = groupesUniques.length > 0 ? groupesUniques[0] : 'Tous';

  const now = new Date();
  const moisEnCours = moisListe[now.getMonth()]?.v || 'Janvier';
  const anneeEnCours = now.getFullYear().toString();

  // 🟢 SPÉCIFIQUE AU PRÉVISIONNEL : Mois et Année actuels par défaut
  if (targetKey === 'previsionnel') {
    setFilters({
      profil: profilInitial,
      annee: anneeEnCours,
      mois: moisEnCours
    });
    return;
  }

  // Pour les autres pages (Dashboard, Gérer), on prend la dernière période des transactions
  if (availablePeriods.length > 0) {
    const periodesTriees = [...availablePeriods].sort((a, b) => {
      const yearA = parseInt(a.annee);
      const yearB = parseInt(b.annee);
      if (yearB !== yearA) return yearB - yearA;
      const indexA = moisListe.findIndex(m => m.v === a.mois);
      const indexB = moisListe.findIndex(m => m.v === b.mois);
      return indexB - indexA;
    });
    const dernierePeriode = periodesTriees[0];

    if (dernierePeriode) {
      setFilters({
        profil: profilInitial,
        annee: dernierePeriode.annee.toString(),
        mois: dernierePeriode.mois
      });
    }
  }
}, [availablePeriods, comptes, activeTab]);



const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'previsionnel', label: 'Prévisionnel', icon: ChartCandlestick },
  { id: 'gerer', label: 'Gérer', icon: Settings2 },
  { id: 'importer', label: 'Importer', icon: FileUp },
  { id: 'comptes', label: 'Comptes', icon: Wallet },
  { id: 'tricount', label: 'Tricount', icon: Users2 },
  { id: 'theme', label: 'Thème', icon: Palette },
  { id: 'Guide', label: 'Guide', icon: FileText },
  { id: 'demenagement', label: 'Déménagement', icon: Truck },
  { id: 'conges', label: 'Congés', icon: CalendarDays }, // 👈 Ajout ici
];

const [hiddenPages, setHiddenPages] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem('hidden_menu_pages') || '[]');
  } catch (e) {
    return [];
  }
});

const visibleMenuItems = menuItems.filter(item => {
  if (hiddenPages.includes(item.id)) {
    return false;
  }

  // 🟢 Pages réservées exclusivement aux administrateurs (Thème, Déménagement, Congés)
  if (item.id === 'theme' || item.id === 'demenagement' || item.id === 'conges') {
    return userRole === 'admin'; // 👈 Fini 'theo', vérifie le vrai rôle !
  }
  
  return true;
});





// 🟢 PARADE : Liste des groupes sans "Tous" avec secours automatique
const groupesDisponibles = useMemo(() => {
  const list = [...new Set(comptes.map(c => c.groupe).filter(Boolean))].sort();
  if (list.length > 0) return list;
  // S'il n'y a encore aucun groupe en base :
  return [user ? user.charAt(0).toUpperCase() + user.slice(1) : 'Personnel'];
}, [comptes, user]);

// 🟢 Redirection automatique si le cache contenait encore 'Tous'
useEffect(() => {
  if (comptes.length > 0 && (filters.profil === 'Tous' || !filters.profil)) {
    setFilters(f => ({ ...f, profil: groupesDisponibles[0] }));
  }
}, [comptes, filters.profil, groupesDisponibles]);

// 🟢 Comptes du profil avec secours si aucun groupe n'est encore configuré
const comptesDuProfil = useMemo(() => {
  if (!comptes || comptes.length === 0) return [];
  
  const aDesGroupes = comptes.some(c => Boolean(c.groupe?.trim()));
  // S'il n'y a aucun groupe défini sur aucun compte, on affiche tout pour ne pas bloquer l'écran
  if (!aDesGroupes) return comptes;

  return comptes.filter(c => {
    const groupeCompte = c.groupe?.toLowerCase().trim() || "";
    const groupeFiltre = filters.profil?.toLowerCase().trim() || "";
    return groupeCompte === groupeFiltre;
  });
}, [comptes, filters.profil]);




const cleanMonth = (m) => {
  if (!m) return "";
  return m.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

const getTxYear = (t) => {
  return (t?.annee || (t?.date ? new Date(t.date).getFullYear() : ""))?.toString().trim();
};

const financeData = useMemo(() => {
  // 1. Préparation des constantes de filtrage
  const nomsComptesProfilMaj = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
  
  // On sécurise les transactions avec des IDs si manquants
  const transactionsSecurisees = (toutesLesTransactions || []).map((t, index) => ({
    ...t,
    id: t.id || `tr-${index}` 
  }));

  // 2. Logique pour déterminer le mois précédent
  const moisFr = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "décembre"];
  const moisIndex = moisFr.indexOf(filters.mois.toLowerCase().trim());
  
  let moisPrecedentLabel = filters.mois;
  let anneePrecedenteLabel = filters.annee;

  if (moisIndex !== -1) {
    // Si on est en Janvier (index 0), le mois précédent est Décembre (index 11) de l'année n-1
    const dateRef = new Date(parseInt(filters.annee), moisIndex);
    dateRef.setMonth(dateRef.getMonth() - 1);
    
    moisPrecedentLabel = moisFr[dateRef.getMonth()];
    anneePrecedenteLabel = dateRef.getFullYear().toString();
  }

  // 3. Fonction de filtrage réutilisable (Source, Cible, Transferts)
  const estUnTransfert = (t) => {
    const cat = (t.categorie || "").toLowerCase();
    const lib = (t.nom || "").toLowerCase();
    return cat.includes('vers') || cat.includes('transfert') || lib.includes('🔄');
  };


  const filtrerParPeriode = (mois, annee) => {
    return transactionsSecurisees.filter(t => {
      const nomCompteTransac = (t.compte || "").trim().toUpperCase();
      const categorie = (t.categorie || "").toLowerCase();
      
      const matchSource = filters.profil === 'Tous' || nomsComptesProfilMaj.includes(nomCompteTransac);
      const matchCible = filters.profil !== 'Tous' && 
                        categorie.includes("vers") && 
                        nomsComptesProfilMaj.some(nomC => categorie.toUpperCase().includes(nomC));

      // 🟢 Normalisation des dates et mois
      const matchMois = cleanMonth(t.mois) === cleanMonth(mois);
      const matchAnnee = getTxYear(t) === annee.toString().trim();

      return (matchSource || matchCible) && matchMois && matchAnnee;
    });
  };

  // 4. Extraction des deux jeux de données
  const baseActuelle = filtrerParPeriode(filters.mois, filters.annee.toString());
  const basePrecedente = filtrerParPeriode(moisPrecedentLabel, anneePrecedenteLabel);

  // Séparation Revenus / Dépenses / Transferts (Mois Actuel)
  const revenusList = baseActuelle.filter(t => parseFloat(t.montant) > 0 && !estUnTransfert(t));
  const depensesList = baseActuelle.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t));
  const transfertsList = baseActuelle.filter(t => estUnTransfert(t));

  // Séparation Dépenses (Mois Précédent) pour l'analyse comparative
  const depensesMoisPrecedent = basePrecedente.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t));

  // 5. Calcul des totaux (Mois Actuel)
  const totalRev = revenusList.reduce((acc, t) => acc + parseFloat(t.montant), 0);
  const totalDep = depensesList.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0);

  return {
    journal: { 
      revenus: revenusList, 
      depenses: depensesList, 
      transferts: transfertsList,
      depensesMoisPrecedent: depensesMoisPrecedent // Crucial pour statsCategories
    },
    stats: { 
      totalRev,
      totalDep,
      solde: totalRev - totalDep,
      nb: baseActuelle.length 
    },
    periodeComparee: {
      mois: moisPrecedentLabel,
      annee: anneePrecedenteLabel
    }
  };
}, [toutesLesTransactions, comptesDuProfil, filters.mois, filters.annee, filters.profil]);




// 🟢 CALCUL ROBUSTE DES SOLDES ET DES INTÉRÊTS PAR QUINZAINE (AVEC RÉCONCILIATION VIREMENTS ET HISTORIQUE)
const soldesParCompte = useMemo(() => {
  const anneeFiltre = parseInt(filters.annee) || new Date().getFullYear();
  const indexMoisSelectionne = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(filters.mois));

  // 1. Initialiser la configuration des comptes
  const configMap = {};
  comptes.forEach(c => {
    configMap[c.compte.trim().toUpperCase()] = {
      soldeInitial: parseFloat(c.solde) || 0,
      groupe: c.groupe?.trim().toUpperCase(),
      taux: parseFloat(c.taux) || 0,
      original: c
    };
  });

  // Soldes au fil de l'eau
  let soldesCourants = {};
  Object.keys(configMap).forEach(nom => {
    soldesCourants[nom] = configMap[nom].soldeInitial;
  });

  // Mouvements par quinzaine (0 à 23) pour l'année sélectionnée
  const mouvementsParQuinzaine = {};
  Object.keys(configMap).forEach(nom => {
    mouvementsParQuinzaine[nom] = Array(24).fill(0);
  });

  // 2. Trier les transactions par ordre chronologique
  const transactionsTriees = [...(toutesLesTransactions || [])].sort((a, b) => {
    const yearA = parseInt(getTxYear(a) || 0);
    const yearB = parseInt(getTxYear(b) || 0);
    if (yearA !== yearB) return yearA - yearB;
    const idxA = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(a.mois));
    const idxB = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(b.mois));
    if (idxA !== idxB) return idxA - idxB;
    return 0;
  });

  // Fonction helper pour détecter le compte destinataire d'un virement
  const identifierCompteCible = (texte, compteSource) => {
    const groupeSource = configMap[compteSource]?.groupe;
    if (!groupeSource) return null;

    for (const [nomDest, cfgDest] of Object.entries(configMap)) {
      if (nomDest === compteSource) continue;
      if (cfgDest.groupe !== groupeSource) continue;

      const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE"];
      const motsCompte = nomDest.split(" ").filter(m => m.length >= 3 && !motsAIgnorer.includes(m));

      const matchNomComplet = texte.includes(nomDest);
      const matchMotsCles = motsCompte.length > 0 && motsCompte.some(m => texte.includes(m));

      if (matchNomComplet || matchMotsCles) {
        return nomDest;
      }
    }
    return null;
  };

  // 3. Parcourir toutes les transactions
  transactionsTriees.forEach(t => {
    const anneeT = parseInt(getTxYear(t) || 0);
    const moisIndexT = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(t.mois));
    
    // Ignorer ce qui est dans le futur par rapport au filtre sélectionné
    if (anneeT > anneeFiltre || (anneeT === anneeFiltre && moisIndexT > indexMoisSelectionne)) {
      return;
    }

    const montant = parseFloat(t.montant) || 0;
    const compteSrc = (t.compte || "").trim().toUpperCase();
    const cat = (t.categorie || "").toUpperCase();
    const nomTrans = (t.nom || "").toUpperCase();
    const texteIntegral = `${nomTrans} ${cat}`;

    // A. Mise à jour du compte émetteur
    if (soldesCourants.hasOwnProperty(compteSrc)) {
      soldesCourants[compteSrc] += montant;
    }

    // B. Détection et réconciliation du virement interne vers le compte destinataire (ex: LEP)
    let compteCibleVirement = null;
    if (cat.includes("🔄") || cat.includes("VERS") || nomTrans.includes("VERS")) {
      compteCibleVirement = identifierCompteCible(texteIntegral, compteSrc);

      if (compteCibleVirement) {
        const dejaEnBase = toutesLesTransactions.some(t2 => 
          getTxYear(t2) === getTxYear(t) && 
          cleanMonth(t2.mois) === cleanMonth(t.mois) && 
          t2.compte?.trim().toUpperCase() === compteCibleVirement && 
          Math.abs(parseFloat(t2.montant) - (-montant)) < 0.1
        );

        // Si l'écriture miroir n'est pas en base, on crédite virtuellement le compte cible
        if (!dejaEnBase) {
          soldesCourants[compteCibleVirement] -= montant; // Si montant = -2000, alors -(-2000) = +2000
        }
      }
    }

    // C. Enregistrement des dates de valeur pour la règle des quinzaines (année en cours uniquement)
    if (anneeT === anneeFiltre) {
      // Extraire le jour exact
      let jourT = 15;
      if (t.date) {
        const dateSeule = t.date.split('T')[0].split(' ')[0];
        const parties = dateSeule.split(dateSeule.includes('-') ? '-' : '/');
        if (parties.length >= 3) {
          jourT = parties[0].length === 4 ? parseInt(parties[2]) : parseInt(parties[0]);
        }
      }

      // 1. Calcul pour le compte source (si rémunéré)
      if (configMap[compteSrc] && configMap[compteSrc].taux > 0) {
        const qEffetSrc = montant > 0
          ? (jourT <= 15 ? moisIndexT * 2 + 1 : (moisIndexT + 1) * 2)
          : (jourT <= 15 ? moisIndexT * 2 : moisIndexT * 2 + 1);

        if (qEffetSrc < 24) {
          mouvementsParQuinzaine[compteSrc][qEffetSrc] += montant;
        }
      }

      // 2. Calcul pour le compte cible du virement (ex: le LEP qui reçoit les 2000€)
      if (compteCibleVirement && configMap[compteCibleVirement] && configMap[compteCibleVirement].taux > 0) {
        const montantRecu = -montant; // Dépôt positif sur le livret
        const qEffetDest = montantRecu > 0
          ? (jourT <= 15 ? moisIndexT * 2 + 1 : (moisIndexT + 1) * 2)
          : (jourT <= 15 ? moisIndexT * 2 : moisIndexT * 2 + 1);

        if (qEffetDest < 24) {
          mouvementsParQuinzaine[compteCibleVirement][qEffetDest] += montantRecu;
        }
      }
    }
  });

  // 4. Calcul du solde de départ au 1er janvier de l'année sélectionnée
  // (Prend en compte le solde initial + tous les mouvements des années passées)
  const soldeAu1erJanvier = {};
  Object.keys(configMap).forEach(nom => {
    soldeAu1erJanvier[nom] = configMap[nom].soldeInitial;
  });

  transactionsTriees.forEach(t => {
    const anneeT = parseInt(getTxYear(t) || 0);
    if (anneeT < anneeFiltre) {
      const montant = parseFloat(t.montant) || 0;
      const compteSrc = (t.compte || "").trim().toUpperCase();
      if (soldeAu1erJanvier.hasOwnProperty(compteSrc)) {
        soldeAu1erJanvier[compteSrc] += montant;
      }
      const cat = (t.categorie || "").toUpperCase();
      const nomTrans = (t.nom || "").toUpperCase();
      if (cat.includes("🔄") || cat.includes("VERS") || nomTrans.includes("VERS")) {
        const cible = identifierCompteCible(`${nomTrans} ${cat}`, compteSrc);
        if (cible && soldeAu1erJanvier.hasOwnProperty(cible)) {
          soldeAu1erJanvier[cible] -= montant;
        }
      }
    }
  });

  // 5. Calcul annuel des 24 quinzaines pour chaque livret rémunéré
  const interetsEstimes = {};

  Object.keys(configMap).forEach(nom => {
    const taux = configMap[nom].taux;
    if (taux <= 0) {
      interetsEstimes[nom] = 0;
      return;
    }

    const tauxParQuinzaine = (taux / 100) / 24;
    let soldeValorise = soldeAu1erJanvier[nom] || 0;
    let totalInterets = 0;

    // Simulation des 24 quinzaines de l'année
    for (let q = 0; q < 24; q++) {
      soldeValorise += mouvementsParQuinzaine[nom][q];
      if (soldeValorise > 0) {
        totalInterets += soldeValorise * tauxParQuinzaine;
      }
    }

    interetsEstimes[nom] = Math.round(totalInterets * 100) / 100;
  });

  // 6. Rendu final des comptes avec solde réel et intérêts conformes
  return comptes
    .filter(c => filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim())
    .map(c => {
      const nomNettoye = c.compte.trim().toUpperCase();
      return {
        ...c,
        soldePeriode: soldesCourants[nomNettoye] || 0,
        interetsGagnesPériode: interetsEstimes[nomNettoye] || 0
      };
    });
}, [comptes, toutesLesTransactions, filters]);


const soldeGlobal = useMemo(() => 
  soldesParCompte.reduce((acc, c) => acc + c.soldePeriode, 0)
, [soldesParCompte]);




// --- 1. Ajouter cet effet pour charger l'ordre au démarrage ---

// --- 2. Trier soldesParCompte selon cet ordre ---
const soldesTries = useMemo(() => {
  if (!ordreComptes || ordreComptes.length === 0) return soldesParCompte;

  // On trie : les comptes présents dans l'ordre sauvegardé arrivent en premier
  return [...soldesParCompte].sort((a, b) => {
    const indexA = ordreComptes.indexOf(a.compte);
    const indexB = ordreComptes.indexOf(b.compte);
    
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}, [soldesParCompte, ordreComptes]);


const statsCategories = useMemo(() => {
  const depensesActuelles = financeData.journal.depenses || [];
  const depensesPrecedentes = financeData.journal.depensesMoisPrecedent || [];

  const recapActuel = {};
  depensesActuelles.forEach(t => {
    const cat = t.categorie || "Autre";
    recapActuel[cat] = (recapActuel[cat] || 0) + Math.abs(parseFloat(t.montant) || 0);
  });

  const recapPrecedent = {};
  depensesPrecedentes.forEach(t => {
    const cat = t.categorie || "Autre";
    recapPrecedent[cat] = (recapPrecedent[cat] || 0) + Math.abs(parseFloat(t.montant) || 0);
  });

  return Object.entries(recapActuel)
    .map(([name, value]) => {
      const valeurMoisPrecedent = recapPrecedent[name] || 0;
      let evolution = null;
      let diffEuro = 0;

      if (valeurMoisPrecedent > 0) {
        evolution = Math.round(((value - valeurMoisPrecedent) / valeurMoisPrecedent) * 100);
        diffEuro = value - valeurMoisPrecedent; // Différence brute en €
      }

      return { 
        name, 
        value, 
        evolution, 
        diffEuro, 
        isNew: valeurMoisPrecedent === 0 
      };
    })
    .sort((a, b) => b.value - a.value);
}, [financeData.journal.depenses, financeData.journal.depensesMoisPrecedent]);


  const chartData = statsCategories.filter(item => !hiddenCategories.includes(item.name));



const [showAddProject, setShowAddProject] = useState(false);
// --- 3. La fonction handleDragEnd mise à jour ---
const handleDragEnd = (event) => {
  const { active, over } = event;
  
  if (active.id !== over.id) {
    const oldIndex = soldesTries.findIndex(c => c.compte === active.id);
    const newIndex = soldesTries.findIndex(c => c.compte === over.id);
    
    const nouvelOrdre = arrayMove(soldesTries, oldIndex, newIndex).map(c => c.compte);
    
    // Sauvegarde locale
    setOrdreComptes(nouvelOrdre);
    localStorage.setItem('ordre_comptes_favoris', JSON.stringify(nouvelOrdre));
  }
};


const handleDragEnd2 = (event) => {
  const { active, over } = event;
  if (active.id !== over.id) {
    const oldIndex = projets.findIndex((i) => i.nom === active.id);
    const newIndex = projets.findIndex((i) => i.nom === over.id);
    
    // On met à jour l'état local
    const newOrder = arrayMove(projets, oldIndex, newIndex);
    setProjets(newOrder);
    
    // OPTIONNEL : Sauvegarder l'ordre en BDD si tu as une colonne "position"
    // saveNewOrder(newOrder); 
  }
};



// On stocke TOUTES les prévisions de l'année ici
const [allPrevisionsAnnee, setallPrevisionsAnnee] = useState([]);


const recapAnnuelStats = useMemo(() => {
  const anneeFiltre = parseInt(filters.annee);
  const maintenant = new Date();
  const moisActuelIdx = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();

  let dernierMoisClotureIdx = -1;
  if (anneeFiltre < anneeActuelle) dernierMoisClotureIdx = 11;
  else if (anneeFiltre === anneeActuelle) dernierMoisClotureIdx = moisActuelIdx - 1; // Août (M-1)

  const configMap = {};
  (comptes || []).forEach(c => {
    configMap[c.compte.trim().toUpperCase()] = {
      soldeInitial: parseFloat(c.solde) || 0,
      groupe: c.groupe?.trim().toUpperCase(),
      taux: parseFloat(c.taux) || 0
    };
  });

  const comptesDuProfil = (comptes || []).filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  const estTransfertInterne = (nom, cat) => {
    const txt = `${nom} ${cat}`.toUpperCase();
    return txt.includes('🔄') || /\bVERS\b/.test(txt) || txt.includes('TRANSFERT');
  };

  const identifierCompteCible = (texte, compteSource) => {
    const groupeSource = configMap[compteSource]?.groupe;
    if (!groupeSource) return null;
    for (const [nomDest, cfgDest] of Object.entries(configMap)) {
      if (nomDest === compteSource) continue;
      if (cfgDest.groupe !== groupeSource) continue;
      const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE"];
      const motsCompte = nomDest.split(" ").filter(m => m.length >= 3 && !motsAIgnorer.includes(m));
      if (texte.includes(nomDest) || (motsCompte.length > 0 && motsCompte.some(m => texte.includes(m)))) {
        return nomDest;
      }
    }
    return null;
  };

  // --- 1. DÉTECTION DES PRÉVISIONS ACTIVES ---
  let premierMoisAvecPreviIdx = 999;
  let dernierMoisAvecPreviIdx = -1;

  (allPrevisionsAnnee || []).forEach(p => {
    if (p.actif === false || p.actif === 0 || p.actif === "0") return;

    let pMonthIdx = -1;
    let pYear = 0;
    if (p.date) {
      const parts = String(p.date).split('T')[0].split('-');
      pYear = parseInt(parts[0], 10);
      pMonthIdx = parseInt(parts[1], 10) - 1;
    } else {
      pYear = parseInt(p.annee || 0, 10);
      pMonthIdx = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(p.mois));
    }

    if (pYear === anneeFiltre && pMonthIdx >= 0) {
      if (filters.profil !== 'Tous') {
        const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
        if (compteAssocie?.groupe?.toLowerCase().trim() !== filters.profil.toLowerCase().trim()) return;
      }
      if (pMonthIdx < premierMoisAvecPreviIdx) premierMoisAvecPreviIdx = pMonthIdx;
      if (pMonthIdx > dernierMoisAvecPreviIdx) dernierMoisAvecPreviIdx = pMonthIdx;
    }
  });

  const hasAnyPrevisionInYear = dernierMoisAvecPreviIdx >= 0;

  // --- 2. HISTORIQUE RÉEL ---
  let soldesCourantsMois = {};
  Object.keys(configMap).forEach(nom => {
    soldesCourantsMois[nom] = configMap[nom].soldeInitial;
  });

  const reelParMois = [];
  moisListe.forEach((moisObj, idx) => {
    const nomMois = cleanMonth(moisObj.v);

    const txDuMois = (toutesLesTransactions || []).filter(t => 
      getTxYear(t) === filters.annee.toString().trim() && 
      cleanMonth(t.mois) === nomMois &&
      (filters.profil === 'Tous' || nomsComptesProfil.includes(t.compte?.trim().toUpperCase()))
    );

    (toutesLesTransactions || []).forEach(t => {
      const anneeT = parseInt(getTxYear(t) || 0);
      const indexMoisT = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(t.mois));
      if (anneeT === anneeFiltre && indexMoisT === idx) {
        const montant = parseFloat(t.montant) || 0;
        const compteSrc = (t.compte || "").trim().toUpperCase();
        const cat = (t.categorie || "").toUpperCase();
        const nomTrans = (t.nom || "").toUpperCase();

        if (soldesCourantsMois.hasOwnProperty(compteSrc)) {
          soldesCourantsMois[compteSrc] += montant;
        }
        if (estTransfertInterne(nomTrans, cat)) {
          const cible = identifierCompteCible(`${nomTrans} ${cat}`, compteSrc);
          if (cible && soldesCourantsMois.hasOwnProperty(cible)) {
            const dejaEnBase = (toutesLesTransactions || []).some(t2 => 
              getTxYear(t2) === getTxYear(t) && 
              cleanMonth(t2.mois) === cleanMonth(t.mois) && 
              t2.compte?.trim().toUpperCase() === cible && 
              Math.abs(parseFloat(t2.montant) - (-montant)) < 0.1
            );
            if (!dejaEnBase) soldesCourantsMois[cible] -= montant;
          }
        }
      }
    });

    const rev = txDuMois.filter(t => parseFloat(t.montant) > 0 && !estTransfertInterne(t.nom || "", t.categorie || ""))
      .reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);
    const dep = txDuMois.filter(t => parseFloat(t.montant) < 0 && !estTransfertInterne(t.nom || "", t.categorie || ""))
      .reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);

    const soldeTotal = nomsComptesProfil.reduce((acc, nom) => acc + (soldesCourantsMois[nom] || 0), 0);

    reelParMois.push({
      hasRealData: txDuMois.length > 0,
      rev,
      dep,
      epargne: rev - dep,
      soldeTotal,
      soldesComptes: { ...soldesCourantsMois }
    });
  });

  // --- 3. CUMUL DE PROJECTION PAR COMPTE ET TOTAL ---
  let soldesProjetesParCompte = {};
  let soldeTotalProjete = 0;

  const pointDeJonctionIdx = hasAnyPrevisionInYear 
    ? Math.max(0, Math.min(premierMoisAvecPreviIdx - 1, dernierMoisClotureIdx))
    : -1;

  return moisListe.map((moisObj, indexMoisCible) => {
    const isPasseCloture = (anneeFiltre < anneeActuelle) || (anneeFiltre === anneeActuelle && indexMoisCible < moisActuelIdx);
    const isMoisEnCours = (anneeFiltre === anneeActuelle && indexMoisCible === moisActuelIdx);
    const isFutur = (anneeFiltre > anneeActuelle) || (anneeFiltre === anneeActuelle && indexMoisCible > moisActuelIdx);

    const reel = reelParMois[indexMoisCible];

    const previsionsDuMois = (allPrevisionsAnnee || []).filter(p => {
      if (p.actif === false || p.actif === 0 || p.actif === "0") return false;
      const dateParts = String(p.date).split('T')[0].split('-');
      const pMonthIdx = parseInt(dateParts[1], 10) - 1;
      const pYear = parseInt(dateParts[0], 10);
      if (pMonthIdx !== indexMoisCible || pYear !== anneeFiltre) return false;

      if (filters.profil !== 'Tous') {
        const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
        return compteAssocie?.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim();
      }
      return true;
    });

    const hasPrevisionsCeMois = previsionsDuMois.length > 0;

    let revPrevu = 0;
    let depPrevu = 0;
    let revResteAVenir = 0;
    let depResteAVenir = 0;
    const impactResteParCompte = {};
    const impactFuturParCompte = {};
    nomsComptesProfil.forEach(nom => {
      impactResteParCompte[nom] = 0;
      impactFuturParCompte[nom] = 0;
    });

    previsionsDuMois.forEach(p => {
      const cat = (p.categorie || "").toLowerCase();
      const nom = (p.nom || "").toLowerCase();
      const compteSrc = (p.compte || "").trim().toUpperCase();
      const montantBrut = parseFloat(p.montant) || 0;
      const montantAbs = Math.abs(montantBrut);
      const isTransfert = estTransfertInterne(nom, cat);

      if (!isTransfert) {
        if (montantBrut > 0) revPrevu += montantBrut;
        else depPrevu += montantAbs;
      }

      if (isMoisEnCours) {
        const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
        const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
        const reste = Math.max(0, montantAbs - montantConsomme);

        if (!isTransfert) {
          if (montantBrut > 0) revResteAVenir += reste;
          else depResteAVenir += reste;
        }

        const impactReste = montantBrut >= 0 ? reste : -reste;
        if (impactResteParCompte.hasOwnProperty(compteSrc)) {
          impactResteParCompte[compteSrc] += impactReste;
        }
        if (isTransfert) {
          const cible = identifierCompteCible(`${nom} ${cat}`, compteSrc);
          if (cible && impactResteParCompte.hasOwnProperty(cible)) {
            impactResteParCompte[cible] -= impactReste;
          }
        }
      }

      if (isFutur) {
        if (impactFuturParCompte.hasOwnProperty(compteSrc)) {
          impactFuturParCompte[compteSrc] += montantBrut;
        }
        if (isTransfert) {
          const cible = identifierCompteCible(`${nom} ${cat}`, compteSrc);
          if (cible && impactFuturParCompte.hasOwnProperty(cible)) {
            impactFuturParCompte[cible] -= montantBrut;
          }
        }
      }
    });

    // Progression du cumul projeté
    if (isPasseCloture) {
      nomsComptesProfil.forEach(nom => {
        soldesProjetesParCompte[nom] = reel.soldesComptes[nom];
      });
      soldeTotalProjete = reel.soldeTotal;
    } else if (isMoisEnCours) {
      nomsComptesProfil.forEach(nom => {
        soldesProjetesParCompte[nom] = (reel.soldesComptes[nom] || 0) + impactResteParCompte[nom];
      });
      soldeTotalProjete = reel.soldeTotal + (revResteAVenir - depResteAVenir);
    } else if (isFutur && hasPrevisionsCeMois) {
      nomsComptesProfil.forEach(nom => {
        soldesProjetesParCompte[nom] = (soldesProjetesParCompte[nom] || 0) + impactFuturParCompte[nom];
      });
      soldeTotalProjete += (revPrevu - depPrevu);
    }

    // 🌟 CONTINUITÉ GARANTIE : La ligne pointillée commence à la jonction (Août) et continue sur Sep/Oct
    const estPointDeJonction = hasAnyPrevisionInYear && (indexMoisCible === pointDeJonctionIdx);
    const estDansLaPlagePrevisions = hasAnyPrevisionInYear && 
      (indexMoisCible >= premierMoisAvecPreviIdx && indexMoisCible <= dernierMoisAvecPreviIdx);
    
    const tracerPointilleCeMois = estPointDeJonction || estDansLaPlagePrevisions;

    // La ligne pleine réelle s'arrête au dernier mois clôturé (Août)
    const tracerLignePleine = isPasseCloture || (!hasAnyPrevisionInYear && reel.hasRealData);

    const revMoisEnCoursEstime = reel.rev + revResteAVenir;
    const depMoisEnCoursEstime = reel.dep + depResteAVenir;
    const epargneMoisEnCoursEstime = revMoisEnCoursEstime - depMoisEnCoursEstime;

    const detailComptesReel = {};
    const detailComptesProjete = {};
    nomsComptesProfil.forEach(nom => {
      detailComptesReel[nom] = tracerLignePleine ? reel.soldesComptes[nom] : null;
      detailComptesProjete[`PROJ_${nom}`] = tracerPointilleCeMois ? soldesProjetesParCompte[nom] : null;
    });

    return {
      nom: moisObj.l,
      isMoisEnCours,
      isPasseCloture,
      isFutur,
      hasPrevisions: hasPrevisionsCeMois,
      hasRealData: reel.hasRealData,

      // Données pour le tableau
      revReel: reel.rev,
      depReel: reel.dep,
      epargneReel: reel.epargne,
      soldeTotalReel: reel.soldeTotal,

      revPrevu: hasPrevisionsCeMois ? (isMoisEnCours ? revMoisEnCoursEstime : revPrevu) : null,
      depPrevu: hasPrevisionsCeMois ? (isMoisEnCours ? depMoisEnCoursEstime : depPrevu) : null,
      epargnePrevu: hasPrevisionsCeMois ? (isMoisEnCours ? epargneMoisEnCoursEstime : (revPrevu - depPrevu)) : null,
      soldeProjete: tracerPointilleCeMois ? soldeTotalProjete : null,

      // Données de courbes graphiques
      revenus: tracerLignePleine ? reel.rev : null,
      depenses: tracerLignePleine ? reel.dep : null,
      epargne: tracerLignePleine ? reel.epargne : null,

      // 🌟 VALEURS D'ATTACHE : À Août (jonction), la projection prend exactement la valeur réelle d'Août
      revenusProjete: tracerPointilleCeMois 
        ? (estPointDeJonction ? reel.rev : (isMoisEnCours ? revMoisEnCoursEstime : revPrevu)) 
        : null,
      depensesProjete: tracerPointilleCeMois 
        ? (estPointDeJonction ? reel.dep : (isMoisEnCours ? depMoisEnCoursEstime : depPrevu)) 
        : null,
      epargneProjete: tracerPointilleCeMois 
        ? (estPointDeJonction ? reel.epargne : (isMoisEnCours ? epargneMoisEnCoursEstime : (revPrevu - depPrevu))) 
        : null,

      soldeTotal: tracerLignePleine ? reel.soldeTotal : null,

      ...detailComptesReel,
      ...detailComptesProjete
    };
  });
}, [toutesLesTransactions, comptes, filters.annee, filters.profil, moisListe, allPrevisionsAnnee]);


// CALCUL DU SOLDE AU 1ER JANVIER DE L'ANNÉE SÉLECTIONNÉE
const soldePremierJanvier = useMemo(() => {
  const anneeFiltre = parseInt(filters.annee);

  // 1. Définition des comptes appartenant au profil sélectionné
  const comptesDuProfil = comptes.filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  // 2. Initialisation avec les soldes de base des comptes du profil
  let soldes = {};
  comptesDuProfil.forEach(c => {
    soldes[c.compte.trim().toUpperCase()] = parseFloat(c.solde) || 0;
  });

  // 3. Application de toutes les transactions des années PRÉCÉDENTES (strictement < anneeFiltre)
  (toutesLesTransactions || []).forEach(t => {
    const anneeT = parseInt(t.annee);
    const compteSrc = (t.compte || "").trim().toUpperCase();

    // On ne prend que les années passées
    if (anneeT < anneeFiltre && nomsComptesProfil.includes(compteSrc)) {
      const montant = parseFloat(t.montant) || 0;
      if (soldes.hasOwnProperty(compteSrc)) {
        soldes[compteSrc] += montant;
      }
    }
  });

  // 4. Somme des soldes de tous les comptes du profil au 01/01
  return Object.values(soldes).reduce((acc, val) => acc + val, 0);
}, [toutesLesTransactions, comptes, filters.annee, filters.profil]);


// 🟢 1. CALCUL UNIFIÉ DES TOTAUX ANNUELS (Intègre le Réel + Prévisions futures)
const totauxAnnuels = useMemo(() => {
  return (recapAnnuelStats || []).reduce((acc, m) => {
    let rev = 0;
    let dep = 0;

    if (m.isPasseCloture) {
      // Mois passés : données réelles
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    } else if (m.isMoisEnCours) {
      // Mois en cours : prend le prévisionnel ajusté s'il existe (réel + reste à venir), sinon le réel
      rev = m.revPrevu !== null ? m.revPrevu : (m.revReel || 0);
      dep = m.depPrevu !== null ? m.depPrevu : (m.depReel || 0);
    } else if (m.isFutur) {
      // Mois futurs : prend les prévisions s'il y en a, sinon 0
      rev = m.revPrevu !== null ? m.revPrevu : 0;
      dep = m.depPrevu !== null ? m.depPrevu : 0;
    } else {
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    }

    const ep = rev - dep;

    return {
      revenus: acc.revenus + rev,
      depenses: acc.depenses + dep,
      epargne: acc.epargne + ep
    };
  }, { revenus: 0, depenses: 0, epargne: 0 });
}, [recapAnnuelStats]);

const tauxEpargneMoyen = useMemo(() => {
  return totauxAnnuels.revenus > 0 
    ? Math.max(0, Math.round((totauxAnnuels.epargne / totauxAnnuels.revenus) * 100))
    : 0;
}, [totauxAnnuels]);

const epargneCumuleeAnnuelle = useMemo(() => {
  return recapAnnuelStats
    ?.filter(m => m.epargne !== null) // On ne prend que les mois passés ou en cours
    .reduce((acc, m) => acc + (m.epargne || 0), 0) || 0;
}, [recapAnnuelStats]);

// L'objectif global (somme des objectifs de tes comptes)
// Note : Si ton objectif dans "Comptes" est mensuel, multiplie le par 12 ici
// pour comparer l'épargne annuelle à un objectif annuel.
const objectifAnnuelGlobal = comptesDuProfil?.reduce((acc, c) => acc + (parseFloat(c.objectif) || 0), 0) || 0;

const pourcentageAnnuel = objectifAnnuelGlobal > 0 
  ? Math.min(Math.round((epargneCumuleeAnnuelle / objectifAnnuelGlobal) * 100), 100) 
  : 0;


// 1. On crée l'espace de stockage local
const [budgets, setBudgets] = useState([]);
const [formBudget, setFormBudget] = useState({ nom: '', somme: '' });
const [showBudgetDetails, setShowBudgetDetails] = useState(false);

// 🛠️ AJOUT : État pour stocker l'année sélectionnée (par défaut l'année en cours)
const [selectedBudgetYear, setSelectedBudgetYear] = useState(new Date().getFullYear()); 


// Extraction et tri des années uniques (ex: [2026, 2025])
const anneesUniques = [...new Set(budgets.map(b => b.annee || new Date().getFullYear()))].sort((a, b) => b - a);

// Formatage pour ton CustomSelect { v: valeur, l: label }
const optionsAnnees = anneesUniques.map(annee => ({
  v: annee,
  l: annee.toString()
}));

// 2. Fonction de chargement mise à jour
const loadBudgets = async (fetchAll = false) => {
  try {
    const url = fetchAll 
      ? `/get-budgets/${user}` 
      : `/get-budgets/${user}/${filters.mois}`;
      
    const res = await api.get(url);
    
    if (Array.isArray(res.data)) {
        setBudgets(res.data);
    }
  } catch (err) {
    console.error("Erreur chargement :", err);
  }
};


const handleAddBudget = async (e) => {
  if (e) e.preventDefault();
  
  const budgetData = {
    utilisateur: String(user || "theo"), 
    mois: String(formBudget.mois || filters.mois), 
    // Optionnel : tu peux ajouter l'année ici ou laisser Python s'en occuper
    // annee: new Date().getFullYear(), 
    compte: String(formBudget.compte || "tous"),
    type: "Categorie",
    nom: String(formBudget.nom),
    somme: parseFloat(formBudget.somme) || 0
  };

  try {
    const res = await api.post(`/save-budget`, budgetData);
    if (res.status === 200) {
      setFormBudget({ ...formBudget, nom: '', somme: '' });
      const fetchAll = activeTab === 'gerer';
      await loadBudgets(fetchAll); 
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout :", err.response?.data);
  }
};


const [budgetToDelete, setBudgetToDelete] = useState(null);
const confirmDelete2 = (budgetObj) => {
  setBudgetToDelete(budgetObj); // On stocke l'objet {nom, mois, compte...}
};

const executeDeleteBudget = async () => {
  if (!budgetToDelete) return;
  
  try {
    // 🛠️ AJOUT : On récupère aussi l'année de l'objet à supprimer
    const { nom, mois, annee } = budgetToDelete; 
    await api.delete(`/delete-budget/${encodeURIComponent(nom)}/${user}/${mois}/${annee}`);
    
    loadBudgets(activeTab === 'gerer');
    setBudgetToDelete(null); 
  } catch (err) {
    console.error("Erreur suppression budget:", err);
  }
};


const [editingBudget, setEditingBudget] = useState(null); // Stockera l'objet budget complet
const handleUpdateBudget = async (updatedBudget, oldName) => {
  try {
    const updatedLocalBudgets = budgets.map(b => {
      // 🛠️ AJOUT : Prise en compte de l'année dans la vérification optimiste
      const isTarget = 
        b.nom === oldName && 
        b.compte === updatedBudget.compte && 
        b.mois === updatedBudget.mois &&
        b.annee === updatedBudget.annee;
      
      if (isTarget) {
        return { ...b, nom: updatedBudget.nom, somme: parseFloat(updatedBudget.somme) };
      }
      return b;
    });

    setBudgets(updatedLocalBudgets);
    setEditingBudget(null);

    const payload = {
      utilisateur: user,
      mois: updatedBudget.mois,
      annee: updatedBudget.annee, // 🛠️ Transmission de l'année au serveur
      compte: updatedBudget.compte,
      type: "Categorie",
      nom: updatedBudget.nom,
      somme: parseFloat(updatedBudget.somme)
    };

    const url = `/update-budget?old_name=${encodeURIComponent(oldName)}`;
    await api.post(url, payload);
    await loadBudgets(true); 

  } catch (err) {
    console.error("Erreur:", err);
    loadBudgets(true);
  }
};


const budgetGauges = useMemo(() => {
  // 1. On décide quelle source de données utiliser
  // Si on est sur 'gerer', on prend tout (data), sinon on prend le filtré (statsCategories)
  const isGererPage = activeTab === 'gerer';

  // 2. On regroupe les budgets (on ne filtre par profil que si on n'est pas sur 'gerer')
  const budgetsAAfficher = budgets.filter(b => {
    if (isGererPage || filters.profil === 'Tous') return true;
    const nomsComptesDuProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
    return nomsComptesDuProfil.includes(b.compte?.trim().toUpperCase());
  });

  const categoriesRegroupees = budgetsAAfficher.reduce((acc, b) => {
    const nomCat = b.nom;
    if (!acc[nomCat]) acc[nomCat] = { nom: nomCat, limite: 0, comptes: [] };
    acc[nomCat].limite += b.somme;
    if (!acc[nomCat].comptes.includes(b.compte)) acc[nomCat].comptes.push(b.compte);
    return acc;
  }, {});

  // 3. Calcul du réel adapté au contexte
  return Object.values(categoriesRegroupees).map(bg => {
    let reel = 0;

    if (isGererPage) {
      // MODE GÉRER : On recalcule à la main sur la source brute pour ignorer les filtres UI
      reel = toutesLesTransactions.filter(t => 
        t.categorie === bg.nom && 
        bg.comptes.includes(t.compte) &&
        t.mois === filters.mois
      ).reduce((acc, t) => acc + Math.abs(t.montant), 0);
    } else {
      // MODE DASHBOARD : On utilise les stats déjà filtrées par l'interface
      reel = statsCategories.find(s => s.name === bg.nom)?.value || 0;
    }

    const pourcentage = bg.limite > 0 ? (reel / bg.limite) * 100 : 0;

    return {
      nom: bg.nom,
      limite: bg.limite,
      reel: reel,
      pourcentage: Math.round(pourcentage),
      rotation: Math.min(pourcentage * 180 / 100, 180),
      depasse: reel > bg.limite
    };
  });
  // On ajoute data et activeTab dans les dépendances
}, [budgets, toutesLesTransactions, statsCategories, filters.mois, filters.profil, activeTab, comptesDuProfil]);

useEffect(() => {
  if (user) {
    if (activeTab === 'gerer') {
      loadBudgets(true); // Charge tous les mois pour la page gérer
    } else if (filters.mois) {
      loadBudgets(false); // Charge seulement le mois du dashboard
    }
  }
}, [user, filters.mois, activeTab]); // On ajoute activeTab ici



const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

const handleSort = (key) => {
  setSortConfig(prev => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  }));
};

// On récupère toutes les transactions filtrées par ton useMemo financeData
// On fusionne revenus, dépenses et transferts pour le tableau de gestion

const dateInputRef = useRef(null);
const transactionsAAfficher = useMemo(() => {
  let data = [
    ...(financeData.journal.revenus || []),
    ...(financeData.journal.depenses || []),
    ...(financeData.journal.transferts || [])
  ];

  

  // Filtre compte (inchangé)
  if (selectedCompte && selectedCompte !== 'tous') {
    data = data.filter(t => t.compte?.trim().toUpperCase() === selectedCompte.trim().toUpperCase());
  }

  // TRI CORRIGÉ
  return [...data].sort((a, b) => {
    let aVal, bVal;

    if (sortConfig.key === 'jour') {
      // Si on demande de trier par "jour", on trie en fait par la "date" complète
      // Le format ISO YYYY-MM-DD permet un tri alphabétique parfait
      aVal = a.date || "";
      bVal = b.date || "";
    } else if (sortConfig.key === 'montant') {
      aVal = parseFloat(a.montant) || 0;
      bVal = parseFloat(b.montant) || 0;
    } else {
      aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      bVal = (b[sortConfig.key] || "").toString().toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
}, [financeData, sortConfig, selectedCompte]);

// 1. Filtrage des données
const filteredData = projets.filter(item => {
  const matchProfil = filters.profil === 'Tous' || item.profil === filters.profil;
  const matchMois = item.mois === filters.mois;
  const matchAnnee = item.annee === filters.annee;
  // Ajoute ici le filtre par compte si tu as ajouté cette colonne
  return matchProfil && matchMois && matchAnnee;
});

// 2. Tri des données filtrées
const sortedData = [...filteredData].sort((a, b) => {
  if (a[sortConfig.key] < b[sortConfig.key]) {
    return sortConfig.direction === 'asc' ? -1 : 1;
  }
  if (a[sortConfig.key] > b[sortConfig.key]) {
    return sortConfig.direction === 'asc' ? 1 : -1;
  }
  return 0;
});



const updateCell = async (id, field, value) => {
  const transactionActive = toutesLesTransactions.find(t => t.id == id);

  if (!transactionActive) {
    console.error("Transaction non trouvée pour l'ID:", id);
    return;
  }

  // --- 1. FONCTION DE NETTOYAGE INTERNE ---
  const nettoyerPourMemoire = (texte) => {
    if (!texte) return "";
    return texte
      .toLowerCase()
      .replace(/\d{2}[\.\/]\d{2}[\.\/]\d{2,4}/g, '') // Enlève les dates (08.03.26)
      .replace(/carte no \d+/gi, '')                 // Enlève "CARTE NO 132"
      .replace(/carte numero \d+/gi, '')             // Enlève "CARTE NUMERO 132"
      .replace(/\s+/g, ' ')                          // Transforme les espaces multiples en un seul
      .trim();
  };

  // --- 2. PRÉPARATION ET SÉCURISATION DES DONNÉES ---
  const nomUtilisateur = typeof user === 'object' ? user.nom : user;

  let parsedValue = value;
  if (field === 'montant') parsedValue = parseFloat(value) || 0;
  if (field === 'prevision_id') parsedValue = value ? parseInt(value) : null;
  if (field === 'enveloppe') parsedValue = value || null;

  // Sécurisation de l'année
  let anneeTx = parseInt(transactionActive.annee);
  if (isNaN(anneeTx) && transactionActive.date) {
    anneeTx = new Date(transactionActive.date).getFullYear();
  }
  if (isNaN(anneeTx)) {
    anneeTx = parseInt(filters.annee) || new Date().getFullYear();
  }

  const updatedData = {
    nom: transactionActive.nom || "",
    montant: parseFloat(transactionActive.montant) || 0,
    categorie: transactionActive.categorie || "Autre",
    utilisateur: nomUtilisateur,
    mois: transactionActive.mois || filters.mois,
    compte: transactionActive.compte || "",
    enveloppe: transactionActive.enveloppe || null,
    prevision_id: transactionActive.prevision_id || null,
    annee: anneeTx,
    date: transactionActive.date || null,
    
    // Application de la valeur modifiée
    [field]: parsedValue 
  };

  try {
    // --- 3. SAUVEGARDE EN BASE DE DONNÉES ---
    await api.put(`/transactions/${id}`, updatedData);
    
    // 🟢 4. MISE À JOUR IMMÉDIATE DU STATE REACT (Résout le blocage de l'interface)
    setToutesLesTransactions(prev => 
      prev.map(t => {
        if (t.id == id) {
          return { ...t, [field]: parsedValue };
        }
        // Si apprentissage actif et qu'on modifie la catégorie, on propage aux libellés identiques
        if (field === 'categorie' && isApprendreActive && t.nom === transactionActive.nom) {
          return { ...t, categorie: parsedValue };
        }
        return t;
      })
    );

    // --- 5. LOGIQUE D'APPRENTISSAGE ---
    if (field === 'categorie' && isApprendreActive) {
      const nomPropre = nettoyerPourMemoire(transactionActive.nom);
      
      await api.post(`/memoire`, {
        nom: nomPropre,
        categorie: value,
        utilisateur: nomUtilisateur
      });

      toast.success(`Mémoire apprise : ${nomPropre}`, {
        icon: (
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)] mr-2.5">
            <CategoryIcon name={value} size={16} />
          </div>
        ),
        description: `Catégorie associée : ${value}`
      });

      if (typeof fetchMemoire === 'function') {
        await fetchMemoire();
      }
    }

  } catch (err) {
    console.error("Erreur de sauvegarde :", err.response?.data || err);
    toast.error("Erreur lors de la mise à jour de la transaction.");
    fetchTransactions();
  }
};





const [selectedIds, setSelectedIds] = useState([]);

// A mettre dans ton composant parent
const toggleAll = () => {
  // On compare la longueur actuelle avec le nombre de transactions affichées
  if (selectedIds.length === transactionsAAfficher.length) {
    // Si tout est sélectionné -> on vide tout
    setSelectedIds([]);
  } else {
    // SINON -> on récupère TOUS les IDs proprement dans un tableau
    const allIds = transactionsAAfficher.map(t => t.id);
    setSelectedIds(allIds);
  }
};

const toggleSelect = (id) => {
  setSelectedIds(prev => {
    if (prev.includes(id)) {
      return prev.filter(item => item !== id);
    } else {
      // On ajoute l'ID au tableau existant
      return [...prev, id];
    }
  });
};


const handleDeleteSelected = async () => {
  // Sécurité : on sort si rien n'est sélectionné
  if (selectedIds.length === 0) return;

  try {
    // Envoi de la liste d'IDs au backend
    const res = await api.delete(`/transactions/batch`, { 
      data: selectedIds 
    });

    if (res.data.status === "success") {
      // 1. Mise à jour instantanée du tableau local (UX fluide)
      setToutesLesTransactions(prev => 
        prev.filter(t => !selectedIds.includes(t.id))
      );
      
      // 2. Reset de la sélection pour la prochaine fois
      setSelectedIds([]);
      
     // console.log(`Suppression réussie : ${res.data.deleted_count} éléments.`);
    }
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    // Ici tu peux appeler ta propre notif d'erreur si tu en as une
  }
};




const [isApprendreActive, setIsApprendreActive] = useState(false);
const sorted = (arr) => [...arr].sort((a, b) => a.localeCompare(b));


const fetchCategories = async () => {
  if (!user) return;

  // 1. Chargement garanti des catégories, icônes, couleurs et groupes
  try {
    const resCats = await api.get(`/api/categories/${user}`);
    if (resCats.data) {
      setToutesLesCategories(resCats.data.all || []);
      setCategoriesPerso(resCats.data.perso || []);
      setGlobalCustomIconsMap(
        resCats.data.icons_map || {}, 
        resCats.data.colors_map || {}, 
        resCats.data.groups_map || {}
      );
    }
  } catch (err) {
    console.error("Erreur chargement catégories:", err);
  }

  // 2. Chargement des masquages isolément
  try {
    const resMasquees = await api.get(`/api/categories_masquees/${user}`);
    if (resMasquees.data) {
      setMasquees(resMasquees.data || []);
    }
  } catch (err) {
    console.error("Erreur chargement masquées:", err);
  }
};

// Effet de chargement au montage
useEffect(() => {
  if (user) {
    fetchCategories();
  }
}, [user]);


const addCategory = async (name, iconName = 'Tag', colorHex = '#818cf8') => {
  const cleanName = getCleanCategoryName(name);
  if (!cleanName) return;

  try {
    await api.post(`/api/categories`, {
      nom: cleanName,
      icone: iconName,
      couleur: colorHex, // 👈 Bien envoyé à l'API
      utilisateur: user
    });

    await fetchCategories(); 
  } catch (err) {
    console.error("Erreur ajout catégorie:", err);
    toast.error("Impossible d'ajouter la catégorie.");
  }
};

const handleUpdateCategory = async (name, iconName, colorHex) => {
  try {
    await api.put(`/api/categories`, {
      nom: name,
      icone: iconName,
      couleur: colorHex, // 👈 Bien envoyé à l'API
      utilisateur: user
    });

    await fetchCategories();
    setEditingCat(null);
  } catch (err) {
    console.error("Erreur modification catégorie:", err);
    toast.error("Impossible de modifier la catégorie.");
  }
};

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [catToDelete, setCatToDelete] = useState(null);

const removeCategory = (catName) => {
  setCatToDelete(catName);
  setShowDeleteConfirm(true);
};

const confirmDeletecat = async () => {
  if (!catToDelete) return;

  try {
    const encodedName = encodeURIComponent(catToDelete);
    const response = await api.delete(`/api/categories/${user}/${encodedName}`);

    if (response.data.status === "success" || response.data.status === "deleted") {
      setCategoriesPerso(prev => prev.filter(c => c !== catToDelete));
      setToutesLesCategories(prev => prev.filter(c => c !== catToDelete));
      setShowDeleteConfirm(false);
      setCatToDelete(null);
    }
  } catch (err) {
    console.error("Erreur réseau lors de la suppression:", err);
    toast.error("Erreur lors de la suppression");
    setShowDeleteConfirm(false);
  }
};


// --- 2. Ta logique de calcul (Dérivée) ---
// Cette ligne doit être déclarée à chaque rendu, juste avant le "return"
const categoriesVisibles = toutesLesCategories.filter(cat => !masquees.includes(cat));

const toggleVisibility = async (catName) => {
  const nouvelleListe = masquees.includes(catName)
    ? masquees.filter(c => c !== catName)
    : [...masquees, catName];
  
  setMasquees(nouvelleListe); 

  try {
    await api.post(`/api/categories_masquees/${user}`, nouvelleListe);
  } catch (err) {
    console.error("Erreur lors de la sauvegarde SQL:", err);
  }
};


const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [newIcon, setNewIcon] = useState("🏷️");

const onEmojiClick = (emojiData) => {
  setNewIcon(emojiData.emoji); // Récupère l'emoji choisi
  setShowEmojiPicker(false);   // Ferme le picker
};


const [showListPopover, setShowListPopover] = useState(false);
const [categorySearch, setCategorySearch] = useState('');
const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
const [newGroupName, setNewGroupName] = useState('');
const [showAddGroupInput, setShowAddGroupInput] = useState(false);


// 🟢 Plus de localStorage : les groupes viennent de la BDD et des groupes par défaut
const DEFAULT_STARTER_GROUPS = [
  'Logement',
  'Vie courante',
  'Transports',
  'Santé',
  'Loisirs',
  'Revenus',
  'Général'
];

const [userManagedGroups, setUserManagedGroups] = useState(DEFAULT_STARTER_GROUPS);

// Ajout d'un groupe en mémoire (sera persisté en BDD dès qu'une catégorie y sera assignée)
const handleAddNewGroup = () => {
  const clean = newGroupName.trim();
  if (clean && !userManagedGroups.some(g => g.toLowerCase() === clean.toLowerCase())) {
    setUserManagedGroups(prev => [...prev, clean]);
    setSelectedGroupFilter(clean);
    setNewGroupName('');
    setShowAddGroupInput(false);
  }
};

// 🟢 INDISPENSABLE : Sauvegarde le nouveau groupe de la catégorie dans la BDD
const handleAssignGroup = async (catName, targetGroup) => {
  if (!targetGroup) return;
  try {
    await api.put('/api/categories/assign-group', {
      nom: catName,
      groupe: targetGroup,
      utilisateur: user
    });
    // Rafraîchit immédiatement les catégories depuis PostgreSQL
    await fetchCategories();
  } catch (err) {
    console.error("Erreur lors de l'assignation du groupe :", err);
  }
};

// 🟢 Suppression instantanée en 1 clic (sans confirmation)
const handleDeleteGroup = async (groupName) => {
  if (!groupName || groupName.toLowerCase() === 'général' || groupName.toLowerCase() === 'general') {
    return; // Sécurité : protège le groupe par défaut 'Général'
  }

  try {
    // 1. Réassigne en BDD les catégories de ce groupe vers "Général"
    await api.put('/api/categories/delete-group', {
      groupe: groupName,
      utilisateur: user,
      fallback_groupe: 'Général'
    });

    // 2. Retire le groupe de la liste
    setUserManagedGroups(prev => prev.filter(g => g.toLowerCase() !== groupName.toLowerCase()));
    
    // 3. Si le filtre actif était ce groupe, on repasse sur 'all'
    if (selectedGroupFilter.toLowerCase() === groupName.toLowerCase()) {
      setSelectedGroupFilter('all');
    }

    // 4. Rafraîchit les catégories
    await fetchCategories();
  } catch (err) {
    console.error("Erreur lors de la suppression du groupe :", err);
  }
};


const [selectedDate, setSelectedDate] = useState(new Date()); // 👈 RAJOUTEZ CETTE LIGNE
// 1. On définit l'état initial (vide pour le compte)
const [newTx, setNewTx] = useState({
  categorie: 'Autre',
  compte: ''
});

// 2. On synchronise le compte dès que le profil change
useEffect(() => {
  // On filtre les comptes qui appartiennent au profil sélectionné
  // (Adapte 'c.groupe' selon le nom de ta clé dans ton objet compte)
  const comptesFiltrés = soldesTries.filter(s => 
    filters.profil === 'Tous' || s.groupe === filters.profil
  );

  if (comptesFiltrés.length > 0) {
    setNewTx(prev => ({
      ...prev,
      compte: comptesFiltrés[0].compte // On prend le premier de la liste filtrée
    }));
  }
}, [filters.profil, soldesTries]); 
// ^ Se déclenche si on change de profil OU si les données arrivent de l'API

const submitQuickTransaction = async () => {
  const elNom = document.getElementById('quick-nom');
  const elMontant = document.getElementById('quick-montant');

  if (!elNom?.value || !elMontant?.value) return toast.warning("Le libellé et le montant sont obligatoires.");

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');
  const dateFormatted = `${year}-${month}-${day}`;

  const fullTransaction = {
    nom: elNom.value,
    montant: parseFloat(elMontant.value),
    categorie: newTx.categorie,
    compte: newTx.compte,
    utilisateur: user,
    mois: moisListe[selectedDate.getMonth()].v,
    annee: year, // Pour le backend
    date: dateFormatted 
  };

  try {
    const res = await api.post(`/transactions`, fullTransaction);
    
    if (res.data && res.data.status === "success") {
      // ON CRÉE UN OBJET COMPATIBLE AVEC TON TABLEAU REACT
      const newTransactionForTable = {
        ...res.data,
        année: year, // On ajoute la clé avec accent pour l'affichage immédiat
        annee: year  // On garde sans accent pour la cohérence
      };

      // Ajout en haut de la liste
      setToutesLesTransactions(prev => [newTransactionForTable, ...prev]);
      
      // Reset des champs
      elNom.value = '';
      elMontant.value = '';
      
    } else if (res.data.status === "ignored") {
      toast.warning("Doublon détecté : cette transaction existe déjà.");
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout :", err.response?.data?.detail || err.message);
    toast.error("Erreur lors de l'enregistrement.");
  }
};



const transactionsFiltrées = useMemo(() => {
  return (toutesLesTransactions || []).filter(t => {
    const compteInfo = comptes.find(c => (c.compte || "").trim().toUpperCase() === (t.compte || "").trim().toUpperCase());
    const groupeTransaction = compteInfo ? compteInfo.groupe : null;

    // 1. FILTRE PROFIL
    const matchProfil = filters.profil === 'Tous' || 
      (groupeTransaction && groupeTransaction.toLowerCase().trim() === filters.profil.toLowerCase().trim());
    
    // 2. FILTRE COMPTE
    const matchCompte = !selectedCompte || selectedCompte === 'tous' || 
      (t.compte && t.compte.trim().toUpperCase() === selectedCompte.trim().toUpperCase());
    
    // 3. FILTRE MOIS (insensible à la casse et aux accents : Février == Fevrier)
    const matchMois = filters.mois === 'Tous' || 
      cleanMonth(t.mois) === cleanMonth(filters.mois);
    
    // 4. FILTRE ANNÉE (accepte année et annee)
    const matchAnnee = filters.annee === 'Tous' || 
      getTxYear(t) === filters.annee.toString().trim();

    return matchProfil && matchCompte && matchMois && matchAnnee;
  });
}, [toutesLesTransactions, filters, selectedCompte, comptes]);
// Ajoute bien 'comptes' dans les dépendances ici !

const statsFiltrées = useMemo(() => {
  return transactionsFiltrées.reduce((acc, t) => {
    const cat = String(t.categorie || "").toLowerCase().trim();
    const nom = String(t.nom || "").toLowerCase().trim();
    
    // 💡 Détection universelle des transferts internes (avec ou sans émoji) :
    // 1. Catégories de virements internes : "Virement : CCP vers Livret A", "vers", "transfert"
    // 2. Ancien symbole 🔄 au cas où
    // 3. On ne bloque PAS "Virements Reçus" ni "Virements envoyé" qui sont de vraies entrées/sorties externes
    const estUnTransfert = 
      cat.includes("vers") || 
      cat.includes("transfert") || 
      cat.includes("🔄") ||
      nom.includes("🔄");

    if (estUnTransfert) {
      return acc; // On ignore ce virement interne pour ne pas fausser les totaux
    }

    const val = parseFloat(t.montant);
    if (!isNaN(val)) {
      if (val > 0) acc.revenus += val;
      else acc.depenses += Math.abs(val);
      
      acc.solde = acc.revenus - acc.depenses;
    }
    
    return acc;
  }, { revenus: 0, depenses: 0, solde: 0 });
}, [transactionsFiltrées]);





const [elementsAppris, setElementsAppris] = useState([]);

const fetchMemoire = async () => {
  try {
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;
    if (!nomUtilisateur) return;

    const response = await api.get(`/memoire/${nomUtilisateur.toLowerCase()}`);
    
    // Le backend envoie déjà [{"nom":...}, {"nom":...}]
    // On le stocke directement dans l'état
    setElementsAppris(response.data); 
  } catch (error) {
    console.error("Erreur fetch mémoire:", error);
  }
};


const handleDeleteMemory = async (itemNom) => {
  try {
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;
    if (!nomUtilisateur) return;

    // Encodage du nom pour gérer les caractères spéciaux ou espaces dans l'URL
    const encodedNom = encodeURIComponent(itemNom.toLowerCase());
    
    // Appel à l'API DELETE
    await api.delete(`/memoire/${nomUtilisateur.toLowerCase()}/${encodedNom}`);

    // Mise à jour locale de l'état pour que l'UI réagisse instantanément
    setElementsAppris(prev => prev.filter(item => item.nom.toLowerCase() !== itemNom.toLowerCase()));

  } catch (error) {
    console.error("Erreur lors de la suppression de l'élément mémoire :", error);
    toast.error("Impossible de supprimer cet élément de la mémoire.");
  }
};

const [tempTransactions, setTempTransactions] = useState([]);




useEffect(() => {
  if (comptes.length > 0 && !importCompte) {
    setImportCompte(comptes[0].compte);
  }
}, [comptes, importCompte]);


const [isDragging, setIsDragging] = useState(false);

const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    // 🟢 Accepte désormais .csv, .ofx, .qif et .qfx
    const validExtensions = ['.csv', '.ofx', '.qif', '.qfx'];
    const isSupported = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isSupported) {
      handleFileUpload(file);
    } else {
      toast.error("Format non supporté : déposez un fichier .csv, .ofx ou .qif");
    }
  };






// 1. L'état (Inchangé)
const [categoriesConfig, setCategoriesConfig] = useState([]);
const [memoireRegles, setMemoireRegles] = useState([]);
const [signType, setSignType] = useState("both");



// 2. Définition de la fonction de chargement mise à jour
// 🟢 Sécurisé contre la déconnexion (si user est null)
const fetchCategoriesConfig = async () => {
  if (!user) return; // 👈 INDISPENSABLE : s'arrête immédiatement si déconnecté
  try {
    const nomUtilisateur = (typeof user === 'object' && user !== null) ? user.nom : user;
    if (!nomUtilisateur) return;

    const res = await api.get(`/config-categories?utilisateur=${nomUtilisateur}`);
    setCategoriesConfig(res.data);
  } catch (err) {
    console.error("Erreur API Intelligence :", err);
  }
};

// 3. Appel au montage OU quand l'utilisateur change
useEffect(() => {
  fetchCategoriesConfig();
}, [user]); // Ajoutez 'user' ici pour recharger si la session change



const handleAddKeyword = async (catName, newKeyword) => {
  const cleanBase = newKeyword.trim().toLowerCase();
  if (!cleanBase) return;

  const cleanKeyword = `${cleanBase}:${signType}`;
  const nomUtilisateur = typeof user === 'object' ? user.nom : user;

  const targetClean = getCleanCategoryName(catName).trim().toLowerCase();
  const targetCat = (categoriesConfig || []).find(c => {
    if (!c || !c.categorie) return false;
    return getCleanCategoryName(c.categorie).trim().toLowerCase() === targetClean;
  });

  const existingKeywords = targetCat ? (targetCat.mots_cles || []) : [];
  if (existingKeywords.includes(cleanKeyword)) return;

  const updatedKeywords = [...existingKeywords, cleanKeyword];

  try {
    await api.put(`/config-categories/update`, {
      categorie: catName,
      keywords: updatedKeywords,
      utilisateur: nomUtilisateur
    });
    
    await fetchCategoriesConfig(); 
    setSignType("both");
    toast.success(`Intelligence apprise : ${catName}`);
  } catch (e) {
    console.error(e);
    toast.error("Erreur de mémorisation");
  }
};

const handleRemoveKeyword = async (catName, keywordToRemove) => {
  const nomUtilisateur = typeof user === 'object' ? user.nom : user;
  const targetClean = getCleanCategoryName(catName).trim().toLowerCase();
  const targetCat = (categoriesConfig || []).find(c => {
    if (!c || !c.categorie) return false;
    return getCleanCategoryName(c.categorie).trim().toLowerCase() === targetClean;
  });
  
  if (!targetCat) return;

  const updatedKeywords = (targetCat.mots_cles || []).filter(k => k !== keywordToRemove);

  try {
    await api.put(`/config-categories/update`, {
      categorie: catName,
      keywords: updatedKeywords,
      utilisateur: nomUtilisateur
    });
    await fetchCategoriesConfig();
  } catch (e) { 
    console.error(e); 
  }
};




// État pour la catégorie sélectionnée dans l'intelligence
const [intelSelectedCat, setIntelSelectedCat] = useState("");

const categoriesPourIntelligence = useMemo(() => {
  const visibles = toutesLesCategories.filter(cat => !masquees.includes(cat));
  const fromImports = tempTransactions ? tempTransactions.map(t => t.categorie) : [];
  const fromConfig = categoriesConfig ? categoriesConfig.map(c => c.categorie) : [];
  
  return [...new Set([...visibles, ...fromConfig, ...fromImports])]
    .filter(Boolean)
    .sort((a, b) => getCleanCategoryName(a).localeCompare(getCleanCategoryName(b)));
}, [toutesLesCategories, masquees, tempTransactions, categoriesConfig]);

// On cherche la data (mots-clés) dans la config SQL
// 💡 Recherche flexible (insensible à la casse et tolérante aux émojis)
const activeCategoryData = useMemo(() => {
  if (!intelSelectedCat || !categoriesConfig || categoriesConfig.length === 0) return null;

  const targetClean = getCleanCategoryName(intelSelectedCat).trim().toLowerCase();

  return categoriesConfig.find(c => {
    if (!c || !c.categorie) return false;
    if (c.categorie === intelSelectedCat) return true;
    const cClean = getCleanCategoryName(c.categorie).trim().toLowerCase();
    return cClean === targetClean || cClean.includes(targetClean) || targetClean.includes(cClean);
  }) || null;
}, [categoriesConfig, intelSelectedCat]);



useEffect(() => {
  // Si on a des catégories et qu'aucune n'est encore sélectionnée
  if (categoriesPourIntelligence.length > 0 && !intelSelectedCat) {
    setIntelSelectedCat(categoriesPourIntelligence[0]);
  }
}, [categoriesPourIntelligence, intelSelectedCat]);






// =========================================================================
// 🟢 1. FONCTION DE MATCHING AVEC FRONTIÈRE DE MOTS ET MULTI-MOTS
// =========================================================================
const matchesKeywordBoundary = (keyword, text) => {
  if (!keyword || !text) return false;
  // Nettoyage strict des guillemets et apostrophes résiduels
  const kwClean = String(keyword).trim().toLowerCase().replace(/["']/g, '');
  const txtClean = String(text).toLowerCase();

  // 1. Correspondance exacte de l'expression entière
  const escaped = kwClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexExact = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, 'iu');
  if (regexExact.test(txtClean)) return true;

  // 2. Si l'expression contient plusieurs mots (ex: "Jean Dupont"), vérifier que TOUS les mots sont présents
  const words = kwClean.split(/\s+/).filter(w => w.length >= 2);
  if (words.length > 1) {
    const allWordsPresent = words.every(word => {
      const escWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rWord = new RegExp(`(?<![\\p{L}\\p{N}_])${escWord}(?![\\p{L}\\p{N}_])`, 'iu');
      return rWord.test(txtClean);
    });
    if (allWordsPresent) return true;
  }

  return false;
};

// =========================================================================
// 🟢 2. MOTEUR D'INTELLIGENCE DYNAMIQUE (RÉÉVALUATION COMPLÈTE EN DIRECT)
// =========================================================================
const appliquerIntelligence = (transactions, config) => {
  if (!transactions || transactions.length === 0) return [];
  if (!config || config.length === 0) return transactions;

  // 1. Extraire et nettoyer TOUS les mots-clés de TOUTES les catégories
  const allRules = [];
  config.forEach(cat => {
    (cat.mots_cles || []).forEach(rawKw => {
      const cleanKw = String(rawKw).replace(/^["']|["']$/g, '').trim();
      if (!cleanKw) return;
      const parts = cleanKw.split(':');
      const kw = parts[0].replace(/["']/g, '').trim().toLowerCase();
      const sign = parts[1] ? parts[1].trim().toLowerCase() : 'both';
      if (kw) {
        allRules.push({
          keyword: kw,
          sign: sign,
          categorie: cat.categorie
        });
      }
    });
  });

  // 2. Trier du mot-clé le plus long au plus court (les plus précis ont priorité)
  allRules.sort((a, b) => b.keyword.length - a.keyword.length);

  // 3. Détecteur de transferts internes (pour ne pas écraser les virements déjà reconnus)
  const isInternalTransfer = (cat) => {
    if (!cat) return false;
    const c = String(cat).toLowerCase();
    return c.includes("vers") || c.includes("transfert") || c.startsWith("🔄") || c.startsWith("virement :");
  };

  return transactions.map(t => {
    // Si c'est déjà un virement interne, on le préserve
    if (isInternalTransfer(t.categorie)) {
      return t;
    }

    const nomNettoye = (t.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
    const montant = parseFloat(t.montant) || 0;

    let nouvelleCategorie = "Autre";

    for (const rule of allRules) {
      if (matchesKeywordBoundary(rule.keyword, nomNettoye)) {
        const matchPositif = (rule.sign === "positive" && montant > 0);
        const matchNegatif = (rule.sign === "negative" && montant < 0);
        const matchDeux = (rule.sign === "both" || rule.sign === "all");

        if (matchPositif || matchNegatif || matchDeux) {
          nouvelleCategorie = rule.categorie;
          break;
        }
      }
    }

    return { ...t, categorie: nouvelleCategorie };
  });
};

// =========================================================================
// 🟢 3. CALCUL DES TRANSACTIONS EN TEMPS RÉEL (RÉACTIF AUX MODIFS DE MOTS-CLÉS)
// =========================================================================
const transactionsCalculees = useMemo(() => {
  if (!tempTransactions || tempTransactions.length === 0) return [];
  
  // A. Appliquer l'intelligence des mots-clés
  let tx = appliquerIntelligence(tempTransactions, categoriesConfig);
  
  // B. Appliquer la mémoire (éléments appris manuellement, prioritaires sur les mots-clés)
  tx = tx.map(t => {
    if (t.categorie && (t.categorie.includes("vers") || t.categorie.startsWith("Virement :"))) {
      return t;
    }

    const libelleCsvNettoye = (t.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
    
    const match = (elementsAppris || []).find(item => {
      const nomApprisNettoye = (item.nom || "").toLowerCase().replace(/\s+/g, ' ').trim();
      return libelleCsvNettoye.includes(nomApprisNettoye);
    });

    if (match) {
      return { ...t, categorie: match.categorie };
    }
    return t;
  });
  
  return tx.map(t => ({ ...t, compte: importCompte || comptes[0]?.compte }));
}, [tempTransactions, categoriesConfig, elementsAppris, importCompte, comptes]);

const [fileName, setFileName] = useState("");

// 🟢 PARSING CSV AVEC NUMÉROTATION DES DOUBLONS (#2, #3...) ET DÉTECTION
const handleFileUpload = async (file) => {
  if (!file) return;
  setFileName(file.name);
  
  const formData = new FormData();
  formData.append('file', file);
  const nomUtilisateur = typeof user === 'object' ? user.nom : user;

  try {
    const response = await api.post(
      `/import-csv?utilisateur=${nomUtilisateur}`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    const lignesBrutes = response.data;
    const trackerOccurrences = {};
    let nbDoublonsDetectes = 0;

    // Répertoire des transactions existantes en BDD pour comparer
    const existingDbSet = new Set(
      (toutesLesTransactions || []).map(t => 
        `${t.date}_${roundNum(t.montant)}_${t.nom.trim().toUpperCase()}`
      )
    );

    function roundNum(val) {
      return Number(parseFloat(val) || 0).toFixed(2);
    }

    const lignesTraitees = lignesBrutes.map((t) => {
      const baseNom = t.nom.trim();
      const cleGroupe = `${t.date}_${roundNum(t.montant)}_${baseNom.toUpperCase()}`;
      
      const occurrence = (trackerOccurrences[cleGroupe] || 0) + 1;
      trackerOccurrences[cleGroupe] = occurrence;

      let nomAjuste = baseNom;
      let isDuplicate = false;

      if (occurrence > 1) {
        nomAjuste = `${baseNom} #${occurrence}`;
        isDuplicate = true;
        nbDoublonsDetectes++;
      } else if (existingDbSet.has(cleGroupe)) {
        // Déjà existant en base de données
        isDuplicate = true;
        nbDoublonsDetectes++;
      }

      return {
        ...t,
        nom: nomAjuste,
        isPotentialDuplicate: isDuplicate,
        duplicateIndex: occurrence
      };
    });

    setTempTransactions(lignesTraitees);

    if (nbDoublonsDetectes > 0) {
      toast.info( 
        `ℹ️ ${nbDoublonsDetectes} transaction(s) similaire(s) détectée(s) et indexée(s) (#2, #3...). Vérifiez le tableau avant import.` 
         );
      
    }

  } catch (error) {
    console.error("Erreur import:", error);
    toast.error("Erreur lors de l'analyse du CSV");
    setFileName("");
  }
};

// 🟢 ENVOI EXCLUSIF DES NOUVELLES TRANSACTIONS
const confirmBatchImport = async () => {
  try {
    // On filtre pour ne pas renvoyer celles qui sont déjà en base
    const nouvellesLignes = transactionsCalculees.filter(t => !t.isAlreadyImported);

    if (nouvellesLignes.length === 0) {
      toast.warning("Aucune nouvelle transaction à importer.");
      return;
    }

    const response = await api.post(`/transactions/batch`, nouvellesLignes);
    
    if (response.data.status === "success") {
       setTempTransactions([]);
       setFileName("");
       
       toast.success(
         `${response.data.added} nouvelle(s) transaction(s) importée(s) avec succès ! ⚡`
       
       );

       

       await fetchTransactions(); 
       await fetchComptes();
       await checkNewTransactions(); 
    }
  } catch (error) {
    console.error("Erreur import:", error);
    toast.error("Erreur lors de l'insertion des écritures");
  }
};


// 1. État pour afficher/masquer la modale de sélection
const [showPowensModal, setShowPowensModal] = useState(false);
const [isSyncingPowens, setIsSyncingPowens] = useState(false);
// En haut de votre composant FinanceApp / Login :
const [isManualSyncing, setIsManualSyncing] = useState(false);
// Remplace ou ajoute cet état en haut de ton composant
const [isSyncingData, setIsSyncingData] = useState(false);
const [isOpen, setIsOpen] = useState(false);
// 2. État pour stocker la liste des connexions et comptes
const [powensData, setPowensData] = useState({
  connections_count: 0,
  connections: [],
  accounts_count: 0,
  accounts: []
});

const fetchPowensConnections = useCallback(async () => {
  try {
    const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
    if (!nomUtilisateur) return;

    let userToken = null;

    // 1. Récupération stricte depuis la BDD pour CET utilisateur
    try {
      const resToken = await api.get(`/powens/recuperer-token?utilisateur=${encodeURIComponent(nomUtilisateur)}`);
      userToken = resToken.data?.user_token;
    } catch (e) {
      console.error("Erreur vérification token BDD:", e);
    }

    // 2. S'il n'a pas de jeton en BDD, on vide le localStorage résiduel et on arrête là
    if (!userToken) {
      localStorage.removeItem("powens_user_token");
      setPowensData({ connections_count: 0, connections: [], accounts_count: 0, accounts: [] });
      return;
    }

    // 3. S'il a bien un jeton personnel, on met à jour son localStorage
    localStorage.setItem("powens_user_token", userToken);

    // 4. Récupération des connexions et comptes
    const res = await api.get(`/powens/connections-and-accounts?user_token=${encodeURIComponent(userToken)}`);
    if (res.data) {
      setPowensData(res.data);
    }
  } catch (err) {
    console.error("Erreur chargement banques/comptes Powens:", err);
  }
}, [user]);



// 🟢 VERSION SÉCURISÉE CONTRE LE DÉCALAGE ASYNCHRONE :
useEffect(() => {
  const handlePowensCallback = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const powensCode = urlParams.get('code');
    const connectionId = urlParams.get('connection_id');

    if (!powensCode && !connectionId) return;

    // 🟢 Bloque immédiatement et définitivement la modale d'onboarding au retour de Powens
    setShowOnboarding(false);
    setOnboardingDismissed(true);
    const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
    if (nomUtilisateur) {
      localStorage.setItem(`onboarding_done_${nomUtilisateur}`, 'true');
    }

    const existingToken = localStorage.getItem('powens_user_token');

    // 🟢 Récupération immédiate et prioritaire du mode d'import réel en BDD
    let actualImportMode = 'manual';
    try {
      const profileRes = await api.get(`/profile/${nomUtilisateur}`);
      if (profileRes.data?.import_mode) {
        actualImportMode = profileRes.data.import_mode;
        setImportMode(actualImportMode); // Synchronise l'état local
      }
    } catch (e) {
      console.error("Erreur de pré-chargement du profil pour Powens:", e);
    }

    // CAS 1 : L'utilisateur a DÉJÀ un token (Ajout d'une autre banque)
    if (existingToken && (powensCode || connectionId)) {
      toast.success("Nouvel établissement connecté avec succès !");
      
      window.history.replaceState({}, document.title, window.location.pathname);
      await fetchPowensConnections();

      setActiveTab('comptes'); // 🟢 Redirige vers la configuration des comptes

      if (actualImportMode !== 'auto') {
        setShowPowensModal(true);
      } else {
        // Mode automatique : exécution en arrière-plan et mise à jour
        try {
          setIsManualSyncing(true);
          await api.post(`/powens/sync-user/${nomUtilisateur}`);
          await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
          fetchTransactions();
          fetchComptes();
        } catch (err) {
          console.error("Erreur de synchronisation automatique initiale :", err);
        } finally {
          setIsManualSyncing(false);
        }
      }
      return;
    }

    // CAS 2 : Tout PREMIER ajout de banque
    if (powensCode && !existingToken) {
      try {
        const redirectUri = window.location.origin + window.location.pathname;
        const res = await api.get(
          `/powens/callback?code=${encodeURIComponent(powensCode)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(nomUtilisateur || '')}`
        );

        if (res.data?.access_token) {
          const newToken = res.data.access_token;
          localStorage.setItem('powens_user_token', newToken);

          if (nomUtilisateur) {
            await api.post('/powens/sauvegarder-token', {
              utilisateur: nomUtilisateur,
              user_token: newToken
            });
          }

          toast.success("Compte bancaire connecté avec succès !");
         
          window.history.replaceState({}, document.title, window.location.pathname);

          await fetchPowensConnections();

          setActiveTab('comptes'); // 🟢 Redirige vers la configuration des comptes

          if (actualImportMode !== 'auto') {
            setShowPowensModal(true);
          } else {
            try {
              setIsManualSyncing(true);
              await api.post(`/powens/sync-user/${nomUtilisateur}`);
              await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
              fetchTransactions();
              fetchComptes();
            } catch (err) {
              console.error("Erreur de synchronisation automatique initiale :", err);
            } finally {
              setIsManualSyncing(false);
            }
          }
        }
      } catch (err) {
        console.error("Erreur lors de l'échange du token Powens:", err);
      }
    }
  };

  handlePowensCallback();
}, [fetchPowensConnections, user]);

// 🟢 2. CHARGEMENT AUTOMATIQUE AU CHANGEMENT D'ONGLET
useEffect(() => {
  if (activeTab === 'importer') {
    fetchPowensConnections();
    fetchCategoriesConfig();
  }
}, [activeTab, fetchPowensConnections]);

// 🟢 Ajout d'un paramètre optionnel 'overrideMode'
const handleSyncPowens = async (overrideMode = null) => {
  const activeMode = overrideMode || importMode; // Utilise le mode forcé s'il est fourni, sinon l'état
  const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
  const token = localStorage.getItem('powens_user_token');

  if (!token) {
    setIsSyncingPowens(true);
    try {
      const redirectUri = window.location.origin + window.location.pathname;
      const resUrl = await api.get(
        `/powens/connect-url?utilisateur=${encodeURIComponent(nomUtilisateur)}&redirect_url=${encodeURIComponent(redirectUri)}`
      );
      
      if (resUrl.data?.url) {
        window.location.href = resUrl.data.url;
        return;
      }
    } catch (error) {
      toast.error("Erreur lors de la génération de l'URL bancaire.");
      
    } finally {
      setIsSyncingPowens(false);
    }
  } else {
    await fetchPowensConnections();
    
    if (activeMode === 'auto') {
      setIsManualSyncing(true);
      try {
        await api.post(`/powens/sync-user/${nomUtilisateur}`);
        await api.post(`/powens/recalculate-balances/${nomUtilisateur}`);
        await fetchTransactions();
        await fetchComptes();
        await checkNewTransactions();
        toast.success("Comptes synchronisés avec succès ! ⚡");
       
      } catch (err) {
        console.error("Erreur de synchro silencieuse :", err);
      } finally {
        setIsManualSyncing(false);
      }
    } else {
      setShowPowensModal(true);
    }
  }
};

// 🟢 VERSION CORRIGÉE : N'INDEXE COMME "DÉJÀ IMPORTÉ" QUE CE QUI EST RÉELLEMENT EN BDD
const handlePowensImportSuccess = (transactions, accountName) => {
  if (!transactions || transactions.length === 0) {
    toast.warning(`Aucune transaction trouvée pour le compte ${accountName}.`);
    return;
  }

  const normalize = (str) => (str || "").trim().toUpperCase().replace(/\s+/g, ' ');
  const roundNum = (val) => Number(parseFloat(val) || 0).toFixed(2);

  // 1. Répertoire des transactions déjà enregistrées en base de données avec leur libellé exact
  const existingDbKeys = new Set(
    (toutesLesTransactions || []).map(t => 
      `${t.date}_${roundNum(t.montant)}_${normalize(t.nom)}`
    )
  );

  // 2. Compteur d'occurrences pour le lot entrant
  const batchOccurrences = {};

  const transactionsMarquees = transactions.map(t => {
    const baseNom = (t.nom || t.libelle || "Transaction").trim();
    const dateStr = t.date ? String(t.date).trim() : "";
    const montantStr = roundNum(t.montant);

    // Clé de groupe pour compter les répétitions au sein de ce même import
    const groupKey = `${dateStr}_${montantStr}_${normalize(baseNom)}`;
    const occurence = (batchOccurrences[groupKey] || 0) + 1;
    batchOccurrences[groupKey] = occurence;

    // Si c'est une 2e ou 3e écriture identique dans le lot, on ajoute le suffixe #2, #3
    let nomFinal = baseNom;
    if (occurence > 1 && !/#\d+$/.test(nomFinal)) {
      nomFinal = `${baseNom} #${occurence}`;
    }

    // 🟢 VÉRIFICATION STRICTE EN BDD : Est-ce que CE nom (avec son # si doublon) est déjà en base ?
    const exactKey = `${dateStr}_${montantStr}_${normalize(nomFinal)}`;
    const alreadyInDb = existingDbKeys.has(exactKey);

    return {
      ...t,
      nom: nomFinal,
      isAlreadyImported: alreadyInDb, // 🟢 Ne vaut true QUE si réellement présent en base de données
      isPotentialDuplicate: occurence > 1 || alreadyInDb,
      duplicateIndex: occurence
    };
  });

  const nbNouvelles = transactionsMarquees.filter(t => !t.isAlreadyImported).length;
  const nbDejaImportees = transactionsMarquees.length - nbNouvelles;

  setFileName(`Import Powens (${accountName})`);
  setTempTransactions(transactionsMarquees);

  toast.success(
   `${transactionsMarquees.length} transactions analysées (${nbNouvelles} nouvelle(s) à importer, ${nbDejaImportees} déjà en base).`
     
  );

  fetchPowensConnections();
  checkNewTransactions()
};


const handleConnectNewBank = async () => {
  setIsSyncingPowens(true);
  try {
    const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
    const redirectUri = window.location.origin + window.location.pathname;
    
    // Récupérer le token existant
    const existingToken = localStorage.getItem('powens_user_token') || '';

    // Transmettre le token existant pour AJOUTER la banque au compte actuel
    const resUrl = await api.get(
      `/powens/connect-url?utilisateur=${encodeURIComponent(nomUtilisateur)}&redirect_url=${encodeURIComponent(redirectUri)}&user_token=${encodeURIComponent(existingToken)}`
    );
    
    const url = resUrl.data?.url || resUrl.data?.redirect_url;

    if (url) {
      window.location.href = url;
    } else {
      toast.error("URL de connexion Powens introuvable.");
    }
  } catch (err) {
    console.error("Erreur génération lien Powens:", err);
    toast.error({ message: "Erreur lors de la génération de l'URL bancaire.", type: "error" });

  } finally {
    setIsSyncingPowens(false);
  }
};


// Remplacez ou ajoutez ces états en haut de votre composant
const [hasPendingSync, setHasPendingSync] = useState(false);
const [syncCountByAccount, setSyncCountByAccount] = useState({});
const [isCheckingSync, setIsCheckingSync] = useState(false);
const [loading, setLoading] = useState(true);
// 🟢 APPEL DIRECT DU STATUT DE SYNCHRONISATION
const checkNewTransactions = useCallback(async () => {
  if (!user) return;
  const token = localStorage.getItem("powens_user_token");
  if (!token) return;

  setIsCheckingSync(true);
  try {
    const res = await api.get(`/powens/check-sync/${user}`);
    if (res.data) {
      setHasPendingSync(Boolean(res.data.has_pending));
      setSyncCountByAccount(res.data.accounts || {});
    }
  } catch (err) {
    console.error("Erreur check-sync:", err);
  } finally {
    setIsCheckingSync(false);
  }
}, [user]);

// Déclencheur automatique lors de changements de transactions ou de comptes
useEffect(() => {
  if (user && !loading) {
    checkNewTransactions();
  }
}, [user, loading, checkNewTransactions]);


const handleAssociateAccount = async (powensAccountName, targetCompte) => {
  try {
    const targetCompteName = targetCompte || "";
    const localCompteObj = targetCompteName
      ? comptes?.find((c) => c.compte === targetCompteName)
      : comptes?.find((c) => (c.powens_name || "").trim().toUpperCase() === powensAccountName.trim().toUpperCase());

    if (!localCompteObj) return;

    const newPowensName = targetCompteName ? powensAccountName : null;

    const updatedCompte = {
      compte: localCompteObj.compte,
      groupe: localCompteObj.groupe || "Général",
      solde: parseFloat(localCompteObj.solde || 0),
      objectif: parseFloat(localCompteObj.objectif || 0),
      couleur: localCompteObj.couleur || "#000000",
      utilisateur: (localCompteObj.utilisateur || user || "defaut").toLowerCase(),
      taux: parseFloat(localCompteObj.taux || 0),
      powens_name: newPowensName
    };

    await api.put(
      `/config-comptes/${encodeURIComponent(localCompteObj.compte)}`,
      updatedCompte
    );

    // 🟢 EN MODE AUTO : Recalibrage rétroactif complet dès la liaison
    if (importMode === 'auto') {
      try {
        await api.post(`/powens/sync-user/${user}`);
        await api.post(`/powens/reconcile-and-recalculate/${user}`);
        await fetchTransactions();
        await fetchComptes();

        setCelebrationModal({
          show: true,
          accountName: localCompteObj.compte,
          count: 0
        });
      } catch (syncErr) {
        console.error("Échec recalibrage:", syncErr);
      }
    } else {
      fetchComptes();
    }

    setTimeout(() => {
      checkNewTransactions();
    }, 100);

  } catch (err) {
    console.error("Erreur lors de l'association:", err);
  }
};

const [allPrevisions, setallPrevisions] = useState([]);


const loadPrevisions = async () => {
  if (!user) return;
  try {
    // 1. On utilise la route 'previsions' (pas get-budgets)
    // 2. On passe 'ALL' pour avoir toute l'année d'un coup
    // 3. On passe l'année dynamiquement
    const url = `/previsions/${user}/ALL/${filters.annee}`;
    
    //console.log("Tentative de récupération :", url);
    
    const res = await api.get(url);
    
    if (res.data) {
      //console.log("Données reçues :", res.data.length, "lignes");
      setallPrevisionsAnnee(res.data);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des prévisions :", err);
  }
};

// ⚠️ IMPORTANT : Retire filters.mois des dépendances ici !
// On ne veut recharger l'API QUE si l'année ou l'user change.
useEffect(() => {
  loadPrevisions();
}, [user, filters.annee]);



const previsionsFiltrees = useMemo(() => {
  if (!allPrevisionsAnnee || allPrevisionsAnnee.length === 0) return [];

  // Normalisation insensible aux accents pour éviter le bug Février / Fevrier
  const moisSelectionneClean = cleanMonth(filters.mois);

  const dataDuMois = allPrevisionsAnnee.filter(p => {
    const moisPrevisionClean = cleanMonth(p.mois);
    return moisPrevisionClean === moisSelectionneClean;
  });

  let resultatFinal = dataDuMois;
  if (filters.profil !== 'Tous') {
    resultatFinal = dataDuMois.filter(prev => {
      const nomCompte = String(prev.compte || "").trim().toUpperCase();
      const infoCompte = comptes?.find(c => 
        String(c?.compte || "").trim().toUpperCase() === nomCompte
      );
      return infoCompte?.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim();
    });
  }

  return [...resultatFinal].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    return String(a.id).localeCompare(String(b.id));
  });
}, [allPrevisionsAnnee, filters.mois, filters.profil, comptes]);



// État pour les mois masqués (ex: ["Août 2024"])
const [excludedMonths, setExcludedMonths] = useState([]);


// On crée une version "Année" sans le filtre du mois sélectionné
const previsionsActivesPourRecap = useMemo(() => {
  if (!allPrevisionsAnnee || allPrevisionsAnnee.length === 0) return [];

  return allPrevisionsAnnee.filter(p => {
    // 1. SÉCURITÉ DE L'ŒIL : Si l'œil est fermé, on jette la ligne immédiatement des calculs annuels
    if (p.actif === false || p.actif === 0 || p.actif === "0" || p.actif === "false") return false;

    // Filtre profil
    if (filters.profil !== 'Tous') {
        const nomSQL = String(p.compte || "").trim().toUpperCase();
        const compteAssocie = comptes?.find(c => String(c?.compte || "").trim().toUpperCase() === nomSQL);
        if (compteAssocie?.groupe !== filters.profil) return false;
    }

    // Filtre mois exclus (tes boutons "Masquer/Activer")
    const d = new Date(p.date);
    const moisP = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const moisFormate = moisP.charAt(0).toUpperCase() + moisP.slice(1);
    return !excludedMonths.includes(moisFormate);
  });
}, [allPrevisionsAnnee, filters.profil, excludedMonths, comptes]);


// 🟢 Helper 1 : Détection infaillible des transferts internes
const estTransfertInterne = (nom = "", cat = "") => {
  const txt = `${nom || ""} ${cat || ""}`.toUpperCase();
  return (
    txt.includes("🔄") ||
    txt.includes("VERS") ||
    txt.includes("TRANSFERT") ||
    txt.startsWith("VIREMENT :") ||
    /\bVERS\b/.test(txt)
  );
};

// 🟢 Helper 2 : Identification intelligente du compte destinataire
const trouverCompteDestinataire = (texte, compteSource, listeComptes) => {
  if (!compteSource || !listeComptes || listeComptes.length === 0) return null;
  const srcUpper = compteSource.trim().toUpperCase();
  const txtUpper = (texte || "").toUpperCase();

  const compteSrcObj = listeComptes.find(c => c.compte?.trim().toUpperCase() === srcUpper);
  const groupeSrc = compteSrcObj?.groupe?.trim().toUpperCase();

  // On cherche parmi les comptes du même profil
  const comptesCibles = listeComptes.filter(c => {
    const nomC = c.compte?.trim().toUpperCase();
    if (nomC === srcUpper) return false;
    if (groupeSrc && c.groupe && c.groupe.trim().toUpperCase() !== groupeSrc) return false;
    return true;
  });

  const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE", "DE", "COMPTE", "BANQUE", "DU"];

  for (const c of comptesCibles) {
    const nomDest = c.compte.trim().toUpperCase();
    if (txtUpper.includes(nomDest)) return nomDest;

    // Match par mot-clé (ex: "LIVRET", "LEP", "LDDS", "PEL", "PEA")
    const motsCompte = nomDest.split(/[\s-_]+/).filter(m => m.length >= 3 && !motsAIgnorer.includes(m));
    if (motsCompte.length > 0 && motsCompte.some(m => txtUpper.includes(m))) {
      return nomDest;
    }
  }

  // Fallback direct sur les types de livrets
  const typesLivrets = ["LIVRET A", "LEP", "LDDS", "PEL", "PEA", "LIVRET"];
  for (const t of typesLivrets) {
    if (txtUpper.includes(t)) {
      const match = comptesCibles.find(c => c.compte.trim().toUpperCase().includes(t));
      if (match) return match.compte.trim().toUpperCase();
    }
  }

  return null;
};


const soldesPrevisionnels = useMemo(() => {
  const anneeFiltre = parseInt(filters.annee) || new Date().getFullYear();
  const maintenant = new Date();
  const moisActuelIdx = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();
  const indexMoisSelectionne = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(filters.mois));

  // 1. Initialisation des impacts par compte
  const impactPrevisions = {};
  soldesTries.forEach(c => { 
    impactPrevisions[c.compte.trim().toUpperCase()] = 0; 
  });

  // 2. Cumul intelligent : du mois en cours jusqu'au mois sélectionné
  (allPrevisionsAnnee || []).forEach(p => {
    if (p.actif === false || p.actif === 0 || p.actif === "0" || p.actif === "false") return;

    let pMonthIdx = -1;
    let pYear = 0;
    if (p.date) {
      const dateParts = String(p.date).split('T')[0].split('-');
      pYear = parseInt(dateParts[0], 10);
      pMonthIdx = parseInt(dateParts[1], 10) - 1;
    } else {
      pYear = parseInt(p.annee || 0, 10);
      pMonthIdx = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(p.mois));
    }

    if (pYear !== anneeFiltre) return;

    // 🟢 Condition de cumul chronologique :
    // - Si on regarde un mois futur (ex: Octobre), on prend le reste de Septembre + tout Octobre
    // - On ignore les mois au-delà du mois sélectionné (Novembre, Décembre)
    const isMoisEnCours = (anneeFiltre === anneeActuelle && pMonthIdx === moisActuelIdx);
    const isMoisDansLaPlage = (pMonthIdx >= moisActuelIdx && pMonthIdx <= indexMoisSelectionne);

    if (!isMoisDansLaPlage && !(anneeFiltre < anneeActuelle && pMonthIdx === indexMoisSelectionne)) {
      return;
    }

    const compteSrc = (p.compte || "").trim().toUpperCase();
    const montantBrut = parseFloat(p.montant) || 0;
    const montantAbs = Math.abs(montantBrut);

    let montantImpact = montantBrut;

    // Pour le mois en cours (Septembre), on n'ajoute que le reste non encore passé en banque
    if (isMoisEnCours) {
      const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
      const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
      const resteAVenir = Math.max(0, montantAbs - montantConsomme);
      montantImpact = montantBrut >= 0 ? resteAVenir : -resteAVenir;
    }

    // A. Impact sur le compte émetteur
    if (impactPrevisions.hasOwnProperty(compteSrc)) {
      impactPrevisions[compteSrc] += montantImpact;
    }

    // B. Impact sur le compte destinataire (en cas de virement interne vers livret/épargne)
    if (estTransfertInterne(p.nom || "", p.categorie || "")) {
      const texteComplet = `${p.nom || ""} ${p.categorie || ""}`;
      const compteCible = trouverCompteDestinataire(texteComplet, compteSrc, comptes);
      
      if (compteCible && impactPrevisions.hasOwnProperty(compteCible)) {
        impactPrevisions[compteCible] -= montantImpact;
      }
    }
  });

  // 3. Calcul final par compte
  return soldesTries.map(c => ({
    ...c,
    soldeFinalEstime: c.soldePeriode + (impactPrevisions[c.compte.trim().toUpperCase()] || 0)
  }));
}, [soldesTries, allPrevisionsAnnee, comptes, toutesLesTransactions, filters.annee, filters.mois]);

const soldeGlobalProjete = useMemo(() => 
  soldesPrevisionnels.reduce((acc, c) => acc + c.soldeFinalEstime, 0)
, [soldesPrevisionnels]);





const [newPrevi, setNewPrevi] = useState({
  date: getTodayLocalDateString(),
  nom: '',
  montant: '',
  categorie: '',
  compte: comptes[0]?.compte || '' // On prend le premier compte de ta liste
});

const optionsComptes = useMemo(() => 
  comptes.map(c => ({ v: c.compte, l: c.compte })),
  [comptes]
);

const handleAddPrevision = async () => {
  if (!newPrevi.nom || !newPrevi.montant) return;

  // On crée un objet Date à partir de la sélection pour extraire les infos SQL
  const dateObj = new Date(newPrevi.date);
  const nomMoisLong = dateObj.toLocaleDateString('fr-FR', { month: 'long' });
  // On met la première lettre en majuscule (ex: "février" -> "Février")
  const moisFormate = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);

  const payload = {
    ...newPrevi,
    utilisateur: user,
    mois: moisFormate,
    annee: dateObj.getFullYear()
  };

  try {
    await api.post(`/previsions`, payload);
    setNewPrevi({ ...newPrevi, nom: '', montant: '' }); // On garde la date et le compte
    loadPrevisions();
  } catch (err) {
    console.error("Erreur:", err);
  }
};


const updatePrevision = async (id, field, value) => {
  if (!id) {
    console.error("Impossible de modifier : l'ID de la prévision est introuvable.");
    return;
  }
  try {
    let finalValue = value;
    let extraData = {};

    if (field === 'date' && value) {
      const yyyy = value.getFullYear();
      const mm = String(value.getMonth() + 1).padStart(2, '0');
      const dd = String(value.getDate()).padStart(2, '0');
      finalValue = `${yyyy}-${mm}-${dd}`; 
      
      const nomMois = value.toLocaleDateString('fr-FR', { month: 'long' });
      let moisFormate = nomMois.charAt(0).toUpperCase() + nomMois.slice(1);
      moisFormate = moisFormate.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      extraData.mois = moisFormate;
      extraData.annee = parseInt(yyyy, 10);
    }

    const payload = { [field]: finalValue, ...extraData };

    // Envoi à l'API
    await api.put(`/previsions/${id}`, payload);
    
    // 💡 FORCE LE RECHARGEMENT IMMÉDIAT de la liste
    // (Puisque le backend gère la conversion, loadPrevisions() va récupérer la nouvelle valeur propre)
    await loadPrevisions();

  } catch (err) {
    console.error("Erreur update prévision:", err);
  }
};



const [selectedIds2, setSelectedIds2] = useState([]);

// Sélectionner / Désélectionner tout
const toggleAll2 = () => {
  if (selectedIds2.length === previsionsFiltrees.length) {
    setSelectedIds2([]);
  } else {
    setSelectedIds2(previsionsFiltrees.map(p => p.id));
  }
};

// Sélectionner / Désélectionner une ligne
const toggleSelect2 = (id) => {
  setSelectedIds2(prev => 
    prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
  );
};

// Suppression groupée
const handleDeleteSelected2 = async () => {


  try {
    // On peut soit faire une boucle, soit créer une route backend DELETE avec un body [ids]
    await Promise.all(selectedIds2.map(id => 
      api.delete(`/previsions/${id}`)
    ));
    
    setSelectedIds2([]);
    loadPrevisions(); // Rafraîchir le tableau et les soldes
  } catch (err) {
    console.error("Erreur suppression groupée:", err);
  }
};



const recapPrevisionsStats = useMemo(() => {
  const maintenant = new Date();
  const moisActuelIdx = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();
  const anneeFiltre = parseInt(filters.annee);

  let cumulMobile = 0;

  const estTransfertInterne = (nom, cat) => {
    const txt = `${nom} ${cat}`.toUpperCase();
    return txt.includes('🔄') || /\bVERS\b/.test(txt) || txt.includes('TRANSFERT');
  };

  return moisListe.map((moisObj, indexMois) => {
    const estFutur = (anneeFiltre > anneeActuelle) || (anneeFiltre === anneeActuelle && indexMois > moisActuelIdx);
    const estMoisEnCours = (anneeFiltre === anneeActuelle && indexMois === moisActuelIdx);
    const estPasse = !estFutur && !estMoisEnCours;

    const nomMoisComplet = `${moisObj.l} ${anneeFiltre}`;
    const estMasque = excludedMonths.includes(nomMoisComplet);

    // Données réelles du mois
    const statsReelles = recapAnnuelStats[indexMois] || { revenus: 0, depenses: 0, epargne: 0, soldeTotal: 0 };
    const revReel = statsReelles.revReel !== undefined ? statsReelles.revReel : (statsReelles.revenus || 0);
    const depReel = statsReelles.depReel !== undefined ? statsReelles.depReel : (statsReelles.depenses || 0);

    if (estPasse) {
      cumulMobile = (statsReelles.soldeTotalReel !== undefined ? statsReelles.soldeTotalReel : statsReelles.soldeTotal) ?? cumulMobile;
      return { 
        ...statsReelles, 
        revenus: revReel, 
        depenses: depReel, 
        epargne: revReel - depReel, 
        soldeTotal: cumulMobile, 
        type: 'réel' 
      };
    }

    // Prévisions pour ce mois
    const previsionsDuMois = (allPrevisionsAnnee || []).filter(p => {
      if (p.actif === false || p.actif === 0 || p.actif === "0") return false;
      
      let pMonthIdx = -1;
      let pYear = 0;
      if (p.date) {
        const parts = String(p.date).split('T')[0].split('-');
        pYear = parseInt(parts[0], 10);
        pMonthIdx = parseInt(parts[1], 10) - 1;
      } else {
        pYear = parseInt(p.annee || 0, 10);
        pMonthIdx = moisListe.findIndex(m => cleanMonth(m.v) === cleanMonth(p.mois));
      }

      if (pMonthIdx !== indexMois || pYear !== anneeFiltre) return false;

      if (filters.profil !== 'Tous') {
        const compteAssocie = (comptes || []).find(c => c.compte?.trim().toUpperCase() === p.compte?.trim().toUpperCase());
        if (compteAssocie?.groupe?.toLowerCase().trim() !== filters.profil.toLowerCase().trim()) return false;
      }
      return true;
    });

    let revReste = 0;
    let depReste = 0;
    let totalConsommeDepensesLiees = 0;
    let totalConsommeRevenusLies = 0;

    if (!estMasque) {
      previsionsDuMois.forEach(p => {
        if (estTransfertInterne(p.nom || "", p.categorie || "")) return;

        const montantPrevuAbs = Math.abs(parseFloat(p.montant) || 0);
        const liees = (toutesLesTransactions || []).filter(t => t.prevision_id === p.id);
        const montantConsomme = liees.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);
        const resteAVenir = Math.max(0, montantPrevuAbs - montantConsomme);

        if (parseFloat(p.montant) > 0) {
          revReste += resteAVenir;
          totalConsommeRevenusLies += montantConsomme;
        } else {
          depReste += resteAVenir;
          totalConsommeDepensesLiees += montantConsomme;
        }
      });
    }

    // 🌟 FORMULE EXACTE DU LIVE :
  
    const totalRev = estMoisEnCours 
      ? Math.max(revReel, totalConsommeRevenusLies) + revReste
      : (estFutur ? (previsionsDuMois.length > 0 ? revReste + totalConsommeRevenusLies : 0) : revReel);

    const totalDep = estMoisEnCours
      ? Math.max(depReel, totalConsommeDepensesLiees) + depReste
      : (estFutur ? (previsionsDuMois.length > 0 ? depReste + totalConsommeDepensesLiees : 0) : depReel);

    const balanceMois = totalRev - totalDep;
    cumulMobile += balanceMois;

    return {
      nom: moisObj.l,
      revenus: totalRev,
      depenses: totalDep,
      epargne: balanceMois,
      soldeTotal: cumulMobile,
      type: estMoisEnCours ? 'mixte' : 'projeté',
      isMasque: estMasque
    };
  });
}, [recapAnnuelStats, allPrevisionsAnnee, filters.annee, filters.profil, moisListe, excludedMonths, toutesLesTransactions, comptes]);



const moisDisponibles = useMemo(() => {
  // On prend TOUTE l'année pour générer les boutons de masquage
  const mois = allPrevisionsAnnee.map(p => { 
    const d = new Date(p.date);
    const m = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  });
  return [...new Set(mois)].sort((a, b) => new Date(a) - new Date(b));
}, [allPrevisionsAnnee]); // <--- Dépend de l'année complète


const chartDataPrevisions = useMemo(() => {
  const aggregat = {};
  
  const previsionsVisiblesDuMois = previsionsFiltrees.filter(p => 
    !(p.actif === false || p.actif === 0 || p.actif === "0" || p.actif === "false")
  );

  // 🟢 On exclut les transferts internes des dépenses pures
  const depensesSeules = previsionsVisiblesDuMois.filter(p => 
    parseFloat(p.montant) < 0 && 
    !estTransfertInterne(p.nom, p.categorie)
  );

  depensesSeules.forEach(p => {
    const cat = p.categorie || "Sans catégorie";
    aggregat[cat] = (aggregat[cat] || 0) + Math.abs(parseFloat(p.montant));
  });

  return Object.keys(aggregat)
    .map(name => ({ name, value: aggregat[name] }))
    .sort((a, b) => b.value - a.value); 
    
}, [previsionsFiltrees]);


const [moisAvecPrevisions, setMoisAvecPrevisions] = useState([]);

// On charge une fois la liste des périodes existantes en base prévisions
const loadAvailablePreviPeriods = async () => {
  if (!user) return; // 👈 Sécurité anti-déconnexion
  try {
    const nomUtilisateur = (typeof user === 'object' && user !== null) ? user.nom : user;
    const res = await api.get(`/previsions/${nomUtilisateur}`);
    setMoisAvecPrevisions(res.data || []);
  } catch (err) {
    console.error(err);
  }
};


const [duplicateModal, setDuplicateModal] = useState({
  show: false,
  count: 0,
  isSelection: false
});

// 1. Déclencheur révisé pour la reconduction mensuelle classique (mois suivant)
const handleTryDuplicate = () => {
  setDuplicateType('month');
  setDuplicateModal({ 
    show: true, 
    count: selectedIds2.length, 
    isSelection: selectedIds2.length > 0 
  });
};

const handleConfirmDuplicate = async () => {
  const aCopier = selectedIds2.length > 0 
    ? previsionsFiltrees.filter(p => selectedIds2.includes(p.id))
    : previsionsFiltrees;

  try {
    const requetes = aCopier.map(prev => {
      // 1. On découpe la chaîne "YYYY-MM-DD" originale (ex: "2026-06-15")
      const [anneeBrute, moisBrut] = prev.date.split('-').map(Number);
      
      // 2. On calcule l'année et le mois suivants (Rappel : en JS, Janvier = 0, Décembre = 11)
      let anneeCible = anneeBrute;
      let moisCibleJS = (moisBrut - 1) + 1; // On passe au mois d'après

      if (moisCibleJS > 11) {
        moisCibleJS = 0;   // Reset à Janvier
        anneeCible += 1;   // Année suivante
      }

      // 3. On crée un objet Date calé au 1er du mois à midi pour le formatage du nom du mois
      const nouvelleDate = new Date(anneeCible, moisCibleJS, 1, 12, 0, 0);

      // 4. On assemble la date finale textuellement : TOUJOURS LE 01
      const mmFormate = String(nouvelleDate.getMonth() + 1).padStart(2, '0');
      const dateFormatee = `${anneeCible}-${mmFormate}-01`; 

      // 5. On récupère le nom du mois en français ("Juillet", etc.)
      const nomMoisLong = nouvelleDate.toLocaleDateString('fr-FR', { month: 'long' });
      const moisFormate = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);

      // 6. On s'assure que les types envoyés correspondent bien à ce qu'attend FastAPI
      const anneeStrict = parseInt(anneeCible, 10);
      const montantStrict = Number(prev.montant);

      // 🧼 NETTOYAGE DU NOM : On retire "[PRÉVI]" ou "[PREVI]" (insensible à la casse, avec ou sans espace après)
      let nomNettoye = prev.nom;
      if (nomNettoye) {
        nomNettoye = nomNettoye.replace(/^\[PRÉVI\]\s*|^\[PREVI\]\s*/i, '');
      }

      return api.post(`/previsions`, {
        nom: nomNettoye,        // Le nom tout propre, débarrassé du tag [PRÉVI]
        montant: montantStrict,
        categorie: prev.categorie,
        compte: prev.compte,
        date: dateFormatee,     // Sera toujours sous la forme "YYYY-MM-01"
        mois: moisFormate,       // Le nom propre du mois suivant
        annee: anneeStrict,     // L'année en nombre entier
        utilisateur: user
      });
    });

    await Promise.all(requetes);
    
    // Nettoyage et rafraîchissement
    setSelectedIds2([]);
    setDuplicateModal({ show: false, count: 0, isSelection: false });
    loadPrevisions();
    
    toast.success(`${aCopier.length} prévisions dupliquées avec succès !`);
    

  } catch (err) {
    console.error("Erreur duplication :", err);
    setDuplicateModal({ show: false, count: 0, isSelection: false });
    toast.error( "Erreur lors de la duplication.");
  }
};


const statsEpargnePrevisionnelle = useMemo(() => {
  if (!recapPrevisionsStats || recapPrevisionsStats.length === 0) {
    return { montant: 0, pourcentage: 0 };
  }

  // 🟢 Somme exacte des 12 mois de la colonne "Épargne" du tableau de projection
  const cumulEpargneAnnuel = recapPrevisionsStats.reduce((sum, m) => {
    return sum + (parseFloat(m.epargne) || 0);
  }, 0);

  const pourcentage = objectifAnnuelGlobal > 0 
    ? Math.max(0, Math.round((cumulEpargneAnnuel / objectifAnnuelGlobal) * 100))
    : 0;

  return {
    montant: cumulEpargneAnnuel,
    pourcentage: pourcentage
  };
}, [recapPrevisionsStats, objectifAnnuelGlobal]);


const { epargneReelleCumulee, epargneProjeteeTotale, pctReel, pctProjete } = useMemo(() => {
  let reelCumul = 0;
  let projeteTotal = 0;

  (recapAnnuelStats || []).forEach(m => {
    // Réel accumulé jusqu'à aujourd'hui
    if (m.hasRealData || m.isPasseCloture) {
      reelCumul += (m.epargneReel || 0);
    }
    // Projection totale sur l'année
    if (m.isPasseCloture) {
      projeteTotal += (m.epargneReel || 0);
    } else if (m.hasPrevisions) {
      projeteTotal += (m.epargnePrevu || 0);
    } else if (m.hasRealData) {
      projeteTotal += (m.epargneReel || 0);
    }
  });

  const obj = objectifAnnuelGlobal || 0;
  const pReel = obj > 0 ? Math.max(0, Math.round((reelCumul / obj) * 100)) : 0;
  const pProjete = obj > 0 ? Math.max(0, Math.round((projeteTotal / obj) * 100)) : 0;

  return {
    epargneReelleCumulee: reelCumul,
    epargneProjeteeTotale: projeteTotal,
    pctReel: pReel,
    pctProjete: pProjete
  };
}, [recapAnnuelStats, objectifAnnuelGlobal]);


useEffect(() => {
  loadAvailablePreviPeriods();
}, [user]);


// --- 1. Tes States (Assure-toi que l'ordre est respecté) ---
const [allocations, setAllocations] = useState([]);
const [montantAiguillage, setMontantAiguillage] = useState("");

// On calcule la somme de TOUTES les allocations récupérées du SQL
const sommeAllocations = useMemo(() => {
    return allocations.reduce((acc, curr) => {
        // On s'assure que montant_alloue est bien traité comme un nombre
        return acc + (parseFloat(curr.montant_alloue) || 0);
    }, 0);
}, [allocations]); // Le calcul se relance dès que la liste 'allocations' change

// Le reste à ventiler se met à jour tout seul
const resteAVentiler = soldeGlobal - sommeAllocations;

// --- 3. Tes Fonctions ---
const fetchAllocations = async () => {
    if (!filters.profil) return;
    try {
        const response = await api.get(`/get-allocations/${filters.profil}`);
        // C'est ce setAllocations qui va déclencher la mise à jour du solde global
        setAllocations(response.data);
    } catch (error) {
        console.error("Erreur lors de la récupération des allocations:", error);
    }
};



const handleSaveAllocation = async (nomEnveloppe, montant) => {
  const userName = typeof user === 'string' ? user : (user?.username || user?.nom);

  // Vérification simple
  if (!nomEnveloppe || !montant) {
    toast.error("Données manquantes (nom ou montant).");
    return;
  }

  const data = {
    utilisateur: String(userName),
    profil: String(filters.profil),
    projet: String(nomEnveloppe),
    montant_alloue: parseFloat(montant)
  };

  try {
    const res = await api.post(`/save-allocation`, data);
    if (res.data.status === "success") {
      // On reset tout après le succès
      setMontantAiguillage("");
      setNewProjet({ nom: '', cout: '' });
      setShowAddProjet(false);
      fetchAllocations(); // Pour mettre à jour ton solde total
    }
  } catch (error) {
    console.error("Erreur SQL Save Allocation:", error.response?.data);
  }
};


const [showAddProjet, setShowAddProjet] = useState(false);
const [newProjet, setNewProjet] = useState({ nom: '', cout: '' });





useEffect(() => {
  if (filters.profil) {
    fetchAllocations();
    // fetchProjets(); // Assure-toi que ta fonction fetchProjets est aussi appelée ici
  }
}, [filters.profil]);


const [deleteModal3, setDeleteModal3] = useState({ show: false, projetNom: null });


const [pickingColor, setPickingColor] = useState(null);



const [note, setNote] = useState(""); // Initialise avec une chaîne vide



const handleInput = (e) => {
  const element = e.target;
  // On réinitialise la hauteur pour calculer le scrollHeight réel
  element.style.height = "auto";
  // On applique la nouvelle hauteur basée sur le contenu
  element.style.height = `${element.scrollHeight}px`;
};

const [showLearningList, setShowLearningList] = useState(false);



const [searchTerm, setSearchTerm] = useState("");

// Ensuite, filtre tes transactions avant l'affichage
const transactionsFiltrees = transactionsAAfficher.filter(t => 
  t.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
  t.categorie?.toLowerCase().includes(searchTerm.toLowerCase())
);

const [annualTab, setAnnualTab] = useState('list'); // 'list' sera la vue par défaut
const statsAnnuellesCategories = useMemo(() => {
  const recap = {};
  let totalAnnuel = 0;

  // 1. IDENTIFIER LES COMPTES APPARTENANT AU PROFIL (Comme dans ton tableau)
  const comptesDuProfil = comptes.filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  // 2. FILTRER LES TRANSACTIONS PAR ANNÉE ET PAR COMPTES DU PROFIL
  const transAnnee = (toutesLesTransactions || []).filter(t => {
    const matchAnnee =filters.annee.toString().trim();
    // La transaction appartient au profil si son compte est dans la liste nomsComptesProfil
    const matchCompteProfil = nomsComptesProfil.includes(t.compte?.trim().toUpperCase());
    
    return matchAnnee && matchCompteProfil;
  });

  // 3. CALCULER LA RÉPARTITION
  transAnnee.forEach(t => {
    const montant = parseFloat(t.montant) || 0;
    const cat = t.categorie || "Autre";
    const lib = (t.nom || "").toLowerCase();
    
    // Logique d'exclusion des transferts (identique à ton tableau)
    const estTransfert = 
      cat.toLowerCase().includes('vers') || 
      cat.toLowerCase().includes('transfert') || 
      lib.includes('🔄');

    // On ne prend que les dépenses (montant < 0)
    if (montant < 0 && !estTransfert) {
      const absMontant = Math.abs(montant);
      recap[cat] = (recap[cat] || 0) + absMontant;
      totalAnnuel += absMontant;
    }
  });

  // 4. FORMATAGE POUR RECHARTS
  return Object.entries(recap)
    .map(([name, value]) => ({
      name,
      value,
      percent: totalAnnuel > 0 ? Math.round((value / totalAnnuel) * 100) : 0
    }))
    .sort((a, b) => b.value - a.value);

}, [toutesLesTransactions, comptes, filters.annee, filters.profil]); 
// On dépend bien de 'comptes' aussi car c'est lui qui définit le profil !

// 🟢 Référence du conteneur de défilement du tableau
  const tableContainerRef = useRef(null);

  // 🟢 Virtualiseur de lignes de transactions Desktop
  const rowVirtualizer = useVirtualizer({
    count: transactionsFiltrees.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 54, // Hauteur moyenne d'une ligne en pixels
    overscan: 10,           // Pré-rend 10 lignes en avance pour un scroll 100% fluide
  });

const recalculerSoldeInitialHisto = (soldeSaisi, moisSaisi, anneeSaisi, transactionsDuCompte) => {
  let soldeRemonte = soldeSaisi;

  // On trie les transactions pour ne traiter que celles qui sont AVANT ou PENDANT le mois saisi
  // (Parce qu'on veut "annuler" leur effet pour remonter dans le passé)
  transactionsDuCompte.forEach(t => {
    const anneeT = parseInt(t.annee);
    const indexMoisT = moisListe.findIndex(m => m.v.toLowerCase() === t.mois.toLowerCase());
    const indexMoisSaisi = moisListe.findIndex(m => m.v.toLowerCase() === moisSaisi.toLowerCase());

    // Si la transaction est dans le futur par rapport à la saisie, on s'en fiche
    if (anneeT > anneeSaisi || (anneeT === anneeSaisi && indexMoisT >= indexMoisSaisi)) {
      // Note: On inclut le mois saisi car le solde "à date" est souvent le solde FIN de mois
      // ou le solde INSTANTANÉ. Si c'est le solde au 1er du mois, on retire le mois en cours.
      
      // Ici, on part du principe que c'est le solde AU MOMENT de la saisie (donc on soustrait l'impact passé)
      soldeRemonte -= parseFloat(t.montant);
    }
  });

  return soldeRemonte;
};

const [assistantData, setAssistantData] = useState({ open: false, compte: null, valeur: "" });
const openCalculateurAssistant = (compte) => {
  setAssistantData({ open: true, compte: compte, valeur: "" });
};
const confirmerCalculAssistant = async () => {
  const { compte, valeur } = assistantData;
  const montantSaisi = parseFloat(valeur.replace(',', '.'));

  if (isNaN(montantSaisi)) {
    toast.error( "Veuillez saisir un montant valide");
    return;
  }

  const totalTransactions = (toutesLesTransactions || [])
    .filter(t => t.compte?.trim().toUpperCase() === compte.compte.trim().toUpperCase())
    .reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);

  const nouveauSoldeInitial = Math.round((montantSaisi - totalTransactions) * 100) / 100;

  try {
    const nouveauxComptes = comptes.map(c => 
      c.compte === compte.compte ? { ...c, solde: nouveauSoldeInitial } : c
    );
    
    setComptes(nouveauxComptes);
    await handleBlurUpdate({ ...compte, solde: nouveauSoldeInitial });

    toast.success(`Solde initial ajusté : ${nouveauSoldeInitial.toLocaleString('fr-FR')}€`);
    
    // Fermer la modale
    setAssistantData({ open: false, compte: null, valeur: "" });
    
    
  } catch (err) {
    toast.error("Erreur lors de la sauvegarde");
  }
};


// État pour afficher ou masquer le popup flash
const [showPatchModal, setShowPatchModal] = useState(false);

// Version du patch actuel (le compteur se reset tout seul si tu changes cette valeur !)
const CURRENT_VERSION = "4.3"; 

useEffect(() => {
  if (!user) return;

  // En incluant CURRENT_VERSION dans la clé, on crée un compteur unique par mise à jour
  const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
  const viewCount = parseInt(localStorage.getItem(patchKey)) || 0;

  // On l'affiche tant qu'on n'a pas atteint la limite (ici, 2 fois)
  if (viewCount < 1) {
    const timer = setTimeout(() => {
      setShowPatchModal(true);
    }, 1500);

    return () => clearTimeout(timer);
  }
}, [user, CURRENT_VERSION]); // Ajout de CURRENT_VERSION dans les dépendances par sécurité

const handleClosePatchModal = () => {
  setShowPatchModal(false);

  // On incrémente sur la clé qui contient la version actuelle
  const patchKey = `patch_view_count_v${CURRENT_VERSION}_${user}`;
  const currentCount = parseInt(localStorage.getItem(patchKey)) || 0;
  localStorage.setItem(patchKey, currentCount + 1);
};


const [activeDropdownId, setActiveDropdownId] = useState(null);
const [activePrevisionDropdownId, setActivePrevisionDropdownId] = useState(null);
const [dropdownPosition, setDropdownPosition] = useState('bottom'); // 'bottom' ou 'top'

// Variable de verrouillage
const isSyncing = useRef(false);

// =========================================================================
// 🟢 SYNCHRONISATION SAINE AU CLIC (ZÉRO BOUCLE INFINIE)
// =========================================================================
const handleProfilChange = (nouveauProfil) => {
  setFilters(f => ({ ...f, profil: nouveauProfil }));

  if (nouveauProfil === 'Tous') {
    setSelectedCompte('tous');
  } else {
    // Sélectionne automatiquement le CCP ou 1er compte du nouveau profil
    setSelectedCompte(getCompteDefaut(nouveauProfil, comptes));
  }
};


const handleCompteChange = (nouveauCompte) => {
  setSelectedCompte(nouveauCompte);

  // Si on choisit un compte précis, on aligne le profil sur son groupe automatiquement
  if (nouveauCompte !== 'tous') {
    const compteTrouve = comptes.find(c => c.compte?.trim().toUpperCase() === nouveauCompte?.trim().toUpperCase());
    if (compteTrouve && compteTrouve.groupe) {
      setFilters(f => ({ ...f, profil: compteTrouve.groupe }));
    }
  }
};



// 1. États locaux pour la période (on stocke les valeurs "v" de moisListe, ex: "01", "02"...)
const [moisDebut, setMoisDebut] = useState("Janvier");
const [moisFin, setMoisFin] = useState(filters.mois || "12"); 

// 2. État pour l'onglet actif ('annuel' ou 'periode')
const [totalTab, setTotalTab] = useState('annuel');
// 3. Calcul automatique basé sur ton tableau recapAnnuelStats
// 🟢 2. CALCUL DE L'ONGLET "PÉRIODE" (Ex: De Janvier à Septembre ou Octobre)
const donneesPeriodeDirecte = useMemo(() => {
  const libelleDebut = moisListe.find(m => m.v === moisDebut)?.l?.toLowerCase();
  const libelleFin = moisListe.find(m => m.v === moisFin)?.l?.toLowerCase();

  const listeNomsMois = moisListe.map(m => m.l?.toLowerCase());
  const idxDebut = listeNomsMois.indexOf(libelleDebut);
  const idxFin = listeNomsMois.indexOf(libelleFin);

  const idxMin = Math.min(idxDebut, idxFin);
  const idxMax = Math.max(idxDebut, idxFin);

  const moisSelectionnes = (recapAnnuelStats || []).filter(m => {
    const currentIdx = listeNomsMois.indexOf(m.nom?.toLowerCase());
    return currentIdx >= idxMin && currentIdx <= idxMax;
  });

  let revenus = 0;
  let depenses = 0;
  let epargne = 0;

  moisSelectionnes.forEach(m => {
    let rev = 0;
    let dep = 0;

    if (m.isPasseCloture) {
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    } else if (m.isMoisEnCours) {
      rev = m.revPrevu !== null ? m.revPrevu : (m.revReel || 0);
      dep = m.depPrevu !== null ? m.depPrevu : (m.depReel || 0);
    } else if (m.isFutur) {
      rev = m.revPrevu !== null ? m.revPrevu : 0;
      dep = m.depPrevu !== null ? m.depPrevu : 0;
    } else {
      rev = m.revReel || 0;
      dep = m.depReel || 0;
    }

    revenus += rev;
    depenses += dep;
    epargne += (rev - dep);
  });

  const tauxEffort = revenus > 0 ? Math.max(0, Math.round((epargne / revenus) * 100)) : 0;

  return {
    revenus,
    depenses,
    epargne,
    tauxEffort
  };
}, [recapAnnuelStats, moisDebut, moisFin, moisListe]);

const estPeriode = totalTab === 'periode';
const donneesAffichees = estPeriode ? donneesPeriodeDirecte : {
  revenus: totauxAnnuels.revenus,
  depenses: totauxAnnuels.depenses,
  epargne: totauxAnnuels.epargne,
  tauxEffort: tauxEpargneMoyen
};


const TAB_CONFIG = {
  revenus: { icon: ArrowUpCircle, label: 'Revenus', className: '' },
  depenses: { icon: ArrowDownCircle, label: 'Dépenses', className: '' },
  transferts: { icon: RefreshCw, label: 'Transferts', className: '' },
  // ✅ Désormais synchronisé sur ton point de rupture exact (2000px)
  Catégories: { icon: BarChartHorizontal, label: 'Catégories', className: 'min-[2000px]:hidden' }, 
  Variations: { icon: TrendingUp, label: 'Variations', className: '' },
  flash: { icon: Zap, label: 'Insights', className: '' }
};



useEffect(() => {
  // 1. On crée le media query calqué sur ton point de rupture de 2000px
  const mediaQuery = window.matchMedia('(min-width: 2000px)');

  // 2. La fonction qui vérifie si on doit réinitialiser l'onglet
  const handleScreenChange = (e) => {
    // Si l'écran est grand ET que l'onglet actif est 'Catégories' (qui va disparaître)
    if (e.matches && tabActive === 'Catégories') {
      setTabActive('revenus'); // On bascule sur le 1er onglet par défaut
    }
  };

  // 3. On exécute la vérification au montage initial
  handleScreenChange(mediaQuery);

  // 4. On écoute les changements de taille d'écran (resize / changement de moniteur)
  mediaQuery.addEventListener('change', handleScreenChange);

  // Clean-up à la destruction du composant
  return () => mediaQuery.removeEventListener('change', handleScreenChange);
}, [tabActive]); // On re-déclenche si tabActive change pour garder la logique synchrone



const carouselRef = useRef(null);
const [activeIndex, setActiveIndex] = useState(0);
const [isOverflowing, setIsOverflowing] = useState(false); // <-- Pour savoir si ça déborde
const [totalDots, setTotalDots] = useState(1);
const itemsPerPage = 5;

// Détecte si le contenu déborde réellement de l'écran
useEffect(() => {
  const container = carouselRef.current;
  if (!container || budgetGauges.length === 0) return;

  const checkOverflow = () => {
    const hasOverflow = container.scrollWidth > container.clientWidth;
    setIsOverflowing(hasOverflow);
    
    if (hasOverflow) {
      setTotalDots(Math.ceil(budgetGauges.length / itemsPerPage));
    } else {
      setTotalDots(1);
      setActiveIndex(0);
    }
  };

  // On vérifie tout de suite
  checkOverflow();

  // On écoute les changements de taille de l'écran (ex: passage de mobile à desktop)
  const resizeObserver = new ResizeObserver(() => checkOverflow());
  resizeObserver.observe(container);

  return () => resizeObserver.disconnect();
}, [budgetGauges]);

const handleScroll = (e) => {
  if (!isOverflowing) return;
  const container = e.target;
  const scrollLeft = container.scrollLeft;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  if (maxScrollLeft <= 0) return;

  const percentage = scrollLeft / maxScrollLeft;
  const index = Math.min(Math.round(percentage * (totalDots - 1)), totalDots - 1);
  setActiveIndex(index);
};

const navigateCarousel = (direction) => {
  if (!carouselRef.current) return;
  const container = carouselRef.current;
  const scrollAmount = container.clientWidth * 0.8; 
  
  container.scrollBy({
    left: direction === 'next' ? scrollAmount : -scrollAmount,
    behavior: 'smooth'
  });
};

const scrollToPage = (pageIndex) => {
  if (!carouselRef.current || totalDots <= 1) return;
  const container = carouselRef.current;
  const maxScrollLeft = container.scrollWidth - container.clientWidth;
  const targetScroll = (pageIndex / (totalDots - 1)) * maxScrollLeft;
  
  container.scrollTo({ left: targetScroll, behavior: 'smooth' });
  setActiveIndex(pageIndex);
};


const [selectedBudgetMonth, setSelectedBudgetMonth] = useState('');

// 💡 Tri chronologique strict des mois (Janvier -> Décembre)
const listeMoisDisponibles = useMemo(() => {
  const getMonthIndex = (monthStr) => {
    if (!monthStr) return 999;
    const clean = monthStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const order = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
    const idx = order.indexOf(clean);
    return idx === -1 ? 999 : idx;
  };

  const anneeCible = selectedBudgetYear || new Date().getFullYear();
  const budgetsDeLAnnee = budgets.filter(b => (b.annee || new Date().getFullYear()) === anneeCible);
  const source = budgetsDeLAnnee.length > 0 ? budgetsDeLAnnee : budgets;

  return Array.from(new Set(source.map(b => b.mois).filter(Boolean)))
    .sort((a, b) => getMonthIndex(a) - getMonthIndex(b));
}, [budgets, selectedBudgetYear]);

// Sélectionne automatiquement le mois actif ou le premier mois chronologique
useEffect(() => {
  if (listeMoisDisponibles.length > 0) {
    if (!selectedBudgetMonth || !listeMoisDisponibles.includes(selectedBudgetMonth)) {
      if (filters?.mois && listeMoisDisponibles.includes(filters.mois)) {
        setSelectedBudgetMonth(filters.mois);
      } else {
        setSelectedBudgetMonth(listeMoisDisponibles[0]);
      }
    }
  }
}, [listeMoisDisponibles, selectedBudgetMonth, filters?.mois]);

// 🟢 Détection insensible à la casse pour autoriser le défilement sur les pages longues
const isPageScrollable = [
  'demenagement', 
  'guide', 
  'tricount', 
  'profile', 
  'conges'
].includes(activeTab?.toLowerCase());


// État pour le premier graphique (Annuel)
const [visibleAnnuel, setVisibleAnnuel] = useState({
  revenus: true,
  depenses: true,
  epargne: true
});

const [showPublicGuide, setShowPublicGuide] = useState(false);

// 💡 AJOUT : Détection de l'écran de PC standard 1080p pour le mode compact
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkScreenSize = () => {
        const width = window.innerWidth;
        // Compact uniquement sur écran de bureau classique 1080p (entre 1024px et 1999px)
        setIsCompact(width >= 1024 && width < 2000);
      };
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
      return () => window.removeEventListener('resize', checkScreenSize);
    }
  }, []);



const [showDuplicateModal, setShowDuplicateConfirm] = useState(false);
const [duplicateType, setDuplicateType] = useState('month'); // 'month' | 'year'


// 2. Déclencheur pour la propagation sur l'année complète (mois restants)
const handleTryPropagateYear = () => {
  if (selectedIds2.length === 0) {
    toast.info("Sélectionnez au moins une prévision à propager.");
    return;
  }
  setDuplicateType('year');
  setDuplicateModal({ 
    show: true, 
    count: selectedIds2.length, 
    isSelection: true 
  });
};

// 3. Fonction d'exécution de la propagation annuelle (avec loadPrevisions() de recharge !)
const confirmPropagateToYear = async () => {
  try {
    const nomUtilisateur = typeof user === 'object' ? user.nom : user;

    const response = await api.post(`/api/previsions/propagate-year`, {
      ids: selectedIds2,
      utilisateur: nomUtilisateur,
      mois_actuel: filters.mois,
      annee: filters.annee.toString()
    });

    if (response.data.status === "success") {
      setSelectedIds2([]); // Vider les cases cochées
      
      // 💡 CORRECTION : Appel de votre vraie fonction de rafraîchissement
      await loadPrevisions(); 
      
      // Utilisation de votre système de toasts d'origine
      toast.success(`${response.data.inserted_count} prévisions propagées sur l'année avec succès !`);
     
    }
  } catch (err) {
    console.error("Erreur de propagation :", err);
    toast.error("Impossible de propager les prévisions sur l'année.");
    
  }
};



// Ajoutez cet état dans votre composant principal `FinanceApp`
const [showOnboarding, setShowOnboarding] = useState(false);

const [onboardingDismissed, setOnboardingDismissed] = useState(false);

// Effet pour détecter si l'utilisateur n'a aucun compte configuré
useEffect(() => {
  if (user && comptes.length === 0 && !loading && !onboardingDismissed) {
    setShowOnboarding(true);
  }
}, [comptes, loading, user, onboardingDismissed]); // 🟢 Ajout de onboardingDismissed dans les dépendances

const handleChooseMode = async (mode) => {
  try {
    const usernameClean = typeof user === 'object' ? user.nom : user;
    
    // 🟢 encodeURIComponent pour gérer proprement les pseudos avec espaces (ex: "test 2")
    await api.put(`/profile/${encodeURIComponent(usernameClean)}/import-mode`, { import_mode: mode });
    setImportMode(mode); 
    
    setOnboardingDismissed(true);
    setShowOnboarding(false);
    
    if (mode === 'auto') {
      const token = localStorage.getItem('powens_user_token');
      if (token) {
        setActiveTab('comptes'); 
      }
      handleSyncPowens(mode); 
    } else {
      setActiveTab('comptes'); 
    }
  } catch (err) {
    console.error("Erreur mode onboarding:", err);
  }
};


const [importMode, setImportMode] = useState('manual');

// Ajoutez cet effet de synchronisation dans FinanceApp
useEffect(() => {
  if (user) {
    api.get(`/profile/${user}`).then(res => {
      if (res.data?.import_mode) {
        setImportMode(res.data.import_mode);
      }
    });
  }
}, [user]);


// 🟢 SYNCHRONISATION EN ARRIÈRE-PLAN PLANIFIÉE (TOUTES LES 6 HEURES)
const performBackgroundSyncIfNeeded = useCallback(async (forcedMode = null) => {
  const activeMode = forcedMode || importMode;
  if (!user || activeMode !== 'auto') return;

  const token = localStorage.getItem('powens_user_token');
  if (!token) return;

  const now = Date.now();
  const lastSyncStr = localStorage.getItem(`last_powens_sync_time_${user}`);
  const sixHoursInMs = 6 * 60 * 60 * 1000;

  if (!lastSyncStr || (now - parseInt(lastSyncStr, 10)) > sixHoursInMs || forcedMode) {
    // 🟢 1. Active l'indicateur visuel au démarrage
    setIsAutoSyncingOnLoad(true);

    try {
      await api.post(`/powens/sync-user/${user}`);
      await api.post(`/powens/recalculate-balances/${user}`);
      localStorage.setItem(`last_powens_sync_time_${user}`, now.toString());
      
      await fetchTransactions();
      await fetchComptes();
      await fetchPowensConnections();
    } catch (err) {
      console.error("Erreur lors de la synchronisation d'arrière-plan:", err);
    } finally {
      // 🟢 2. Masque l'indicateur avec un léger délai pour confirmer la fin
      setTimeout(() => {
        setIsAutoSyncingOnLoad(false);
      }, 1500);
    }
  }
}, [user, importMode, fetchTransactions, fetchComptes, fetchPowensConnections]);
/*
// Effet pour surveiller et déclencher le cycle de vérification
useEffect(() => {
  if (user && importMode === 'auto') {
    // Vérification immédiate lors de l'ouverture du site
    performBackgroundSyncIfNeeded();

    // Vérification récurrente toutes les 30 minutes pendant que l'onglet reste ouvert
    const interval = setInterval(() => {
      performBackgroundSyncIfNeeded();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }
}, [user, importMode, performBackgroundSyncIfNeeded]);
*/
// État pour le deuxième graphique (Détaillé)
// On stocke ici les noms des comptes masqués sous forme de tableau ou d'objet
const [hiddenComptes, setHiddenComptes] = useState({});

const [isAutoSyncingOnLoad, setIsAutoSyncingOnLoad] = useState(false);


const previsionsTracking = useMemo(() => {
  const map = {};

  (allPrevisionsAnnee || []).forEach(p => {
    const prevMontantAbs = Math.abs(parseFloat(p.montant) || 0);
    map[p.id] = {
      prev: p,
      prevMontant: prevMontantAbs,
      consomme: 0,
      nbTransactions: 0,
      transactions: []
    };
  });

  (toutesLesTransactions || []).forEach(t => {
    if (t.prevision_id && map[t.prevision_id]) {
      const montantTx = Math.abs(parseFloat(t.montant) || 0);
      map[t.prevision_id].consomme += montantTx;
      map[t.prevision_id].nbTransactions += 1;
      map[t.prevision_id].transactions.push(t);
    }
  });

  Object.keys(map).forEach(id => {
    const item = map[id];
    // 🟢 Arrondi strict à 2 décimales pour éliminer les micro-décimales parasites
    item.consomme = Math.round(item.consomme * 100) / 100;
    item.restant = Math.round((item.prevMontant - item.consomme) * 100) / 100;
    
    // 🟢 Nouveaux états précis
    item.isComplet = Math.abs(item.restant) < 0.01;      // Exactement 0€ d'écart
    item.depasse = item.restant < -0.01;                  // Dépassé UNIQUEMENT si strictement supérieur au montant
    item.pct = item.prevMontant > 0 
      ? Math.min(100, Math.round((item.consomme / item.prevMontant) * 100)) 
      : 0;
  });

  return map;
}, [allPrevisionsAnnee, toutesLesTransactions]);


const [celebrationModal, setCelebrationModal] = useState({
  show: false,
  accountName: '',
  count: 0
});

// 1. États pour la création
const [selectedIconName, setSelectedIconName] = useState('Tag');
const [selectedCatColor, setSelectedCatColor] = useState('#818cf8');
const [showIconPicker, setShowIconPicker] = useState(false);
const [showCatColorPicker, setShowCatColorPicker] = useState(false);

// 2. États pour la modification d'une catégorie existante
const [editingCat, setEditingCat] = useState(null); // { nom: "Courses", icone: "ShoppingCart", couleur: "#818cf8" }
const [showEditIconPicker, setShowEditIconPicker] = useState(false);
const [showEditColorPicker, setShowEditColorPicker] = useState(false);


const [isRefreshingPowens, setIsRefreshingPowens] = useState(false);

const handleForceRefreshPowens = async () => {
  if (isRefreshingPowens) return;
  setIsRefreshingPowens(true);

  // 1. On démarre le toast de chargement infini et on récupère son identifiant
  const toastId = toast.loading("Interrogation de votre banque en direct... ⏳", {
    description: "Connexion sécurisée aux serveurs bancaires"
  });

  try {
    // 🟢 1. Déclenche la connexion réelle de Powens auprès de vos serveurs bancaires
    await api.post(`/powens/refresh-bank-sync/${user}`);

    // 🟢 2. Si vous êtes en mode automatique, on importe les nouvelles transactions immédiatement
    if (importMode === 'auto') {
      await api.post(`/powens/sync-user/${user}`);
      await api.post(`/powens/recalculate-balances/${user}`);
      await fetchTransactions();
    }

    // 🟢 3. Rafraîchissement des soldes et du détecteur de nouvelles écritures
    await Promise.all([
      fetchPowensConnections(),
      checkNewTransactions(),
      fetchComptes()
    ]);

    // 2. Le toast de chargement se transforme instantanément en succès ✨
    toast.success("Banque interrogée et données synchronisées ! ⚡", {
      id: toastId, // 👈 C'est cet id qui remplace le message en cours
      description: "Vos soldes et transactions sont à jour"
    });

  } catch (err) {
    console.error("Erreur lors de l'actualisation manuelle :", err);
    
    // 3. En cas d'échec, il se transforme en erreur ❌
    toast.error("Impossible d'interroger la banque pour le moment.", {
      id: toastId, // 👈 Remplace le message en cours
      description: "Veuillez réessayer dans quelques instants"
    });

  } finally {
    setIsRefreshingPowens(false);
  }
};

// =========================================================================
// 🟢 NAVIGATION FLUIDE À LA MOLETTE DE LA SOURIS (WHEEL NAVIGATION)
// =========================================================================
const lastWheelTime = useRef(0);

// Anti-rebond (160ms) pour garantir un défilement précis de 1 par 1
const canWheelTrigger = () => {
  const now = Date.now();
  if (now - lastWheelTime.current < 160) return false;
  lastWheelTime.current = now;
  return true;
};

// 1. Défilement des Mois
const handleWheelMois = (e, isPrevi = false) => {
  if (!canWheelTrigger()) return;

  const liste = isPrevi 
    ? moisListe 
    : moisListe.filter(m => availablePeriods.some(p => p.mois === m.v && p.annee.toString() === filters.annee?.toString()));

  if (liste.length <= 1) return;

  const currentIndex = liste.findIndex(m => m.v.toLowerCase() === filters.mois?.toLowerCase());
  if (currentIndex === -1) return;

  if (e.deltaY > 0) {
    // Molette vers le bas -> Mois suivant
    if (currentIndex < liste.length - 1) {
      setFilters({ mois: liste[currentIndex + 1].v });
    }
  } else if (e.deltaY < 0) {
    // Molette vers le haut -> Mois précédent
    if (currentIndex > 0) {
      setFilters({ mois: liste[currentIndex - 1].v });
    }
  }
};

// 2. Défilement des Années
const handleWheelAnnee = (e, isPrevi = false) => {
  if (!canWheelTrigger()) return;

  const rawYears = isPrevi
    ? [...new Set([...availablePeriods.map(p => p.annee.toString()), new Date().getFullYear().toString()])]
    : [...new Set(availablePeriods.map(p => p.annee.toString()))];

  const sortedYears = rawYears.sort((a, b) => parseInt(a) - parseInt(b));
  if (sortedYears.length <= 1) return;

  const currentIndex = sortedYears.findIndex(y => y === filters.annee?.toString());
  if (currentIndex === -1) return;

  if (e.deltaY > 0 && currentIndex < sortedYears.length - 1) {
    setFilters({ annee: sortedYears[currentIndex + 1] });
  } else if (e.deltaY < 0 && currentIndex > 0) {
    setFilters({ annee: sortedYears[currentIndex - 1] });
  }
};

// 3. Défilement des Profils
const handleWheelProfil = (e) => {
  if (!canWheelTrigger() || groupesDisponibles.length <= 1) return;

  const currentIndex = groupesDisponibles.findIndex(p => p.toLowerCase() === filters.profil?.toLowerCase());
  if (currentIndex === -1) return;

  if (e.deltaY > 0 && currentIndex < groupesDisponibles.length - 1) {
    setFilters({ profil: groupesDisponibles[currentIndex + 1] });
  } else if (e.deltaY < 0 && currentIndex > 0) {
    setFilters({ profil: groupesDisponibles[currentIndex - 1] });
  }
};

 const handleWheelNavTabs = (e) => {
    if (!canWheelTrigger() || !visibleMenuItems || visibleMenuItems.length <= 1) return;
    e.preventDefault();

    const currentIndex = visibleMenuItems.findIndex(item => item.id === activeTab);
    if (currentIndex === -1) return;

    if (e.deltaY > 0) {
      if (currentIndex < visibleMenuItems.length - 1) {
        setActiveTab(visibleMenuItems[currentIndex + 1].id);
      }
    } else if (e.deltaY < 0) {
      if (currentIndex > 0) {
        setActiveTab(visibleMenuItems[currentIndex - 1].id);
      }
    }
  };


// 🟢 1. Molette sur les onglets du Flux mensuel (Revenus, Dépenses, Transferts, Catégories, Variations, Insights)
const handleWheelTabActive = (e) => {
  if (!canWheelTrigger()) return;
  e.preventDefault();

  const tabKeys = Object.keys(TAB_CONFIG).filter(tab => {
    if (tab === 'Catégories' && window.innerWidth >= 2000) return false;
    return true;
  });

  const currentIndex = tabKeys.indexOf(tabActive);
  if (currentIndex === -1) return;

  if (e.deltaY > 0 && currentIndex < tabKeys.length - 1) {
    setTabActive(tabKeys[currentIndex + 1]);
    setSearchTerm('');
  } else if (e.deltaY < 0 && currentIndex > 0) {
    setTabActive(tabKeys[currentIndex - 1]);
    setSearchTerm('');
  }
};

// 🟢 2. Molette sur les onglets du Bilan Annuel (Liste, Graphique, Calendrier, Wrapped)
const handleWheelAnnualTab = (e) => {
  if (!canWheelTrigger()) return;
  e.preventDefault();

  const tabs = ['list', 'chart', 'calendar', 'wrapped'];
  const currentIndex = tabs.indexOf(annualTab);
  if (currentIndex === -1) return;

  if (e.deltaY > 0 && currentIndex < tabs.length - 1) {
    setAnnualTab(tabs[currentIndex + 1]);
  } else if (e.deltaY < 0 && currentIndex > 0) {
    setAnnualTab(tabs[currentIndex - 1]);
  }
};

// 🟢 3. Molette sur le sélecteur de droite (Analytique vs Épargne & Projets)
const handleWheelRightTab = (e) => {
  if (!canWheelTrigger()) return;
  e.preventDefault();

  const tabs = ['graphs', 'epargneProjets'];
  const currentIndex = tabs.indexOf(activeRightTab);
  if (currentIndex === -1) return;

  if (e.deltaY > 0 && currentIndex < tabs.length - 1) {
    setActiveRightTab(tabs[currentIndex + 1]);
  } else if (e.deltaY < 0 && currentIndex > 0) {
    setActiveRightTab(tabs[currentIndex - 1]);
  }
};


// 🟢 CHARGEMENT SÉCURISÉ AU DÉMARRAGE DE L'APPLICATION
useEffect(() => {
  if (user) {
    fetchTransactions();
    fetchComptes();
    fetchUserTheme(user);
    fetchPowensConnections();
    api.get(`/note/${user}`).then(res => setNote(res.data.texte));
    
    // 🟢 Récupération officielle du profil (mode d'import + rôle)
    api.get(`/profile/${user}`).then(res => {
      // 1. Mise à jour du rôle utilisateur (admin / user)
      if (res.data?.role) {
        const roleCharge = res.data.role.toLowerCase();
        setUserRole(roleCharge);
        localStorage.setItem('role', roleCharge);
      }

      // 2. Gestion du mode d'import
      const modeBDD = res.data?.import_mode || 'manual';
      setImportMode(modeBDD);

      if (modeBDD === 'auto') {
        performBackgroundSyncIfNeeded('auto');
      }
    }).catch(err => console.error("Erreur profil:", err));
  }
}, [user, fetchPowensConnections]);




if (!user) {
    return (
      <AuthView 
        onLoginSuccess={(token, loggedUser, role) => {
          setUser(loggedUser);
          setUserRole(role || 'user');
        }} 
        userTheme={userTheme} 
      />
    );
  }


  return (
    <div 
  className={`p-4 md:p-8 text-[var(--text-main)] transition-colors duration-500 ${
      isPageScrollable 
        ? 'min-h-screen overflow-y-auto' 
        : 'h-screen lg:overflow-hidden'
    }`}
  style={{
    /* On mélange 20% de ta couleur avec 80% de noir pour créer un "noir coloré" */
    background: `radial-gradient(
      circle at 50% -10%, 
      var(--bg-site) 50%, 
      color-mix(in srgb, var(--bg-site), black 50%) 100%
    )`,
    backgroundAttachment: 'fixed'
  }}
>
      {/* max-w-full permet d'occuper 100% de la largeur disponible, peu importe l'écran */}
      <div className="max-w-full mx-auto">
      
      {/* NAVIGATION GLOBALE */}
          <nav>
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
                    Kleea <span className="text-[var(--primary)]">v.{CURRENT_VERSION}</span>
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
              
              {/* --- BADGE UTILISATEUR CONNECTÉ --- */}
              <button
                onClick={() => setActiveTab('profile')} 
                className={`group flex items-center gap-2.5 px-3 py-1.5 border rounded-xl ml-1 transition-all duration-300 cursor-pointer ${
                  activeTab === 'profile'
                  ? 'bg-white/15 border-[var(--primary)] shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]'
                  : 'bg-[var(--glass-bg)] border-white/5 hover:bg-white/10 hover:border-white/15'
                }`}
                title="Accéder à mon profil et aux réglages"
              >
                {/* Avatar initial */}
                <div className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)] shrink-0">
                  {user.substring(0, 1).toUpperCase()}
                </div>

                {/* Pseudo + Indication de la page */}
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-[0.1em]">
                    {user}
                  </span>
                  <span className="text-[6.5px] font-black text-[var(--primary)]/70 group-hover:text-[var(--primary)] uppercase tracking-[0.15em] mt-1 transition-colors">
                    Mon Profil
                  </span>
                </div>

                {/* Petit chevron discret qui s'anime au survol */}
                <ChevronRight 
                  size={11} 
                  className={`ml-0.5 text-[var(--text-main)]/20 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--primary)] ${
                    activeTab === 'profile' ? 'text-[var(--primary)]' : ''
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
              <div className="max-w-lg mx-auto flex items-center justify-around p-1.5 bg-slate-900/80 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[28px] shadow-2xl pointer-events-auto">
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
                        : 'bg-[var(--primary)] text-white shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]'
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


        <main>


{activeTab === 'dashboard' && (
  <>
    <DashboardDesktop 
      filters={filters}
      setFilters={setFilters}
      moisListe={moisListe}
      availablePeriods={availablePeriods}
      groupesDisponibles={groupesDisponibles}
      handleWheelProfil={handleWheelProfil}
      handleWheelMois={handleWheelMois}
      handleWheelAnnee={handleWheelAnnee}
      handleWheelTabActive={handleWheelTabActive}
      handleWheelAnnualTab={handleWheelAnnualTab}
      handleWheelRightTab={handleWheelRightTab}
      userTheme={userTheme}
      soldeGlobal={soldeGlobal}
      soldesTries={soldesTries}
      sensors={sensors}
      handleDragEnd={handleDragEnd}
      SortableAccountCard={SortableAccountCard}
      TAB_CONFIG={TAB_CONFIG}
      tabActive={tabActive}
      setTabActive={setTabActive}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      financeData={financeData}
      statsCategories={statsCategories}
      chartData={chartData}
      hiddenCategories={hiddenCategories}
      toggleCategory={toggleCategory}
      user={user}
      budgetGauges={budgetGauges}
      carouselRef={carouselRef}
      handleScroll={handleScroll}
      totalDots={totalDots}
      activeIndex={activeIndex}
      navigateCarousel={navigateCarousel}
      scrollToPage={scrollToPage}
      setActiveTab={setActiveTab}
      annualTab={annualTab}
      setAnnualTab={setAnnualTab}
      soldePremierJanvier={soldePremierJanvier}
      recapAnnuelStats={recapAnnuelStats}
      statsAnnuellesCategories={statsAnnuellesCategories}
      toutesLesTransactions={toutesLesTransactions}
      comptesDuProfil={comptesDuProfil}
      isCompact={isCompact}
      totalTab={totalTab}
      setTotalTab={setTotalTab}
      estPeriode={estPeriode}
      moisDebut={moisDebut}
      setMoisDebut={setMoisDebut}
      moisFin={moisFin}
      setMoisFin={setMoisFin}
      donneesAffichees={donneesAffichees}
      activeRightTab={activeRightTab}
      setActiveRightTab={setActiveRightTab}
      objectifAnnuelGlobal={objectifAnnuelGlobal}
      epargneReelleCumulee={epargneReelleCumulee}
      epargneProjeteeTotale={epargneProjeteeTotale}
      pctReel={pctReel}
      pctProjete={pctProjete}
      visibleAnnuel={visibleAnnuel}
      setVisibleAnnuel={setVisibleAnnuel}
      comptes={comptes}
      hiddenComptes={hiddenComptes}
      setHiddenComptes={setHiddenComptes}
      allocations={allocations}
      setAllocations={setAllocations}
      projets={projets}
      setProjets={setProjets}
      epargneCumuleeAnnuelle={epargneCumuleeAnnuelle}
      api={api}
      fetchAllocations={fetchAllocations}
      CustomSelect={CustomSelect}
    />

    {/* Version Mobile existante inchangée */}
    <div className="block lg:hidden">
      <DashboardMobile 
        filters={filters}
        setFilters={setFilters}
        comptes={comptes}
        moisListe={moisListe}
        availablePeriods={availablePeriods}
        userTheme={userTheme}
        soldeGlobal={soldeGlobal}
        soldesTries={soldesTries}
        sensors={sensors}
        handleDragEnd={handleDragEnd}
        tabActive={tabActive}
        setTabActive={setTabActive}
        TAB_CONFIG={TAB_CONFIG}
        financeData={financeData}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statsCategories={statsCategories}
        chartData={chartData}
        hiddenCategories={hiddenCategories}
        toggleCategory={toggleCategory}
        CategoriesView={CategoriesView}
        VariationsView={VariationsView}
        FlashInsightsView={FlashInsightsView}
        TransactionCard={TransactionCard}
        budgetGauges={budgetGauges}
        activeIndex={activeIndex}
        totalDots={totalDots}
        navigateCarousel={navigateCarousel}
        carouselRef={carouselRef}
        handleScroll={handleScroll}
        scrollToPage={scrollToPage}
        soldePremierJanvier={soldePremierJanvier}
        annualTab={annualTab}
        setAnnualTab={setAnnualTab}
        recapAnnuelStats={recapAnnuelStats}
        statsAnnuellesCategories={statsAnnuellesCategories}
        CalendarSection={CalendarSection}
        WrappedSection={WrappedSection}
        toutesLesTransactions={toutesLesTransactions}
        comptesDuProfil={comptesDuProfil}
        totalTab={totalTab}
        setTotalTab={setTotalTab}
        estPeriode={estPeriode}
        moisDebut={moisDebut}
        setMoisDebut={setMoisDebut}
        moisFin={moisFin}
        setMoisFin={setMoisFin}
        donneesAffichees={donneesAffichees}
        activeRightTab={activeRightTab}
        setActiveRightTab={setActiveRightTab}
        objectifAnnuelGlobal={objectifAnnuelGlobal}
        epargneCumuleeAnnuelle={epargneCumuleeAnnuelle}
        pourcentageAnnuel={pourcentageAnnuel}
        visibleAnnuel={visibleAnnuel}
        setVisibleAnnuel={setVisibleAnnuel}
        hiddenComptes={hiddenComptes}
        setHiddenComptes={setHiddenComptes}
        GestionEpargneProjet={GestionEpargneProjet}
        allocations={allocations}
        setAllocations={setAllocations}
        projets={projets}
        setProjets={setProjets}
        user={user}
        api={api}
        fetchAllocations={fetchAllocations}
        categoriesVisibles={categoriesVisibles}
        updateCell={updateCell}
        SortableAccountCard={SortableAccountCard}
        AnnualCategoriesChart={AnnualCategoriesChart}
        generateGradientStep={generateGradientStep}
      />
    </div>
  </>
)}


{activeTab === 'previsionnel' && (
  <>
    <PrevisionsDesktop 
      filters={filters}
      setFilters={setFilters}
      groupesDisponibles={groupesDisponibles}
      handleWheelProfil={handleWheelProfil}
      handleWheelMois={handleWheelMois}
      handleWheelAnnee={handleWheelAnnee}
      moisListe={moisListe}
      availablePeriods={availablePeriods}
      soldeGlobalProjete={soldeGlobalProjete}
      soldesPrevisionnels={soldesPrevisionnels}
      userTheme={userTheme}
      sensors={sensors}
      handleDragEnd={handleDragEnd}
      SortableAccountCard={SortableAccountCard}
      newPrevi={newPrevi}
      setNewPrevi={setNewPrevi}
      handleAddPrevision={handleAddPrevision}
      selectedIds2={selectedIds2}
      handleTryPropagateYear={handleTryPropagateYear}
      handleTryDuplicate={handleTryDuplicate}
      previsionsFiltrees={previsionsFiltrees}
      toggleAll2={toggleAll2}
      toggleSelect2={toggleSelect2}
      updatePrevision={updatePrevision}
      categoriesVisibles={categoriesVisibles}
      optionsComptes={optionsComptes}
      toutesLesTransactions={toutesLesTransactions}
      previsionsTracking={previsionsTracking}
      chartDataPrevisions={chartDataPrevisions}
      moisDisponibles={moisDisponibles}
      excludedMonths={excludedMonths}
      setExcludedMonths={setExcludedMonths}
      recapPrevisionsStats={recapPrevisionsStats}
      objectifAnnuelGlobal={objectifAnnuelGlobal}
      statsEpargnePrevisionnelle={statsEpargnePrevisionnelle}
      CustomSelect={CustomSelect}
      isCompact={isCompact}
    />

    {/* Version Mobile existante inchangée */}
    <div className="block lg:hidden">
      <PrevisionsMobile 
        user={user}
        filters={filters}
        setFilters={setFilters}
        comptes={comptes}
        moisListe={moisListe}
        availablePeriods={availablePeriods}
        soldeGlobalProjete={soldeGlobalProjete}
        soldesPrevisionnels={soldesPrevisionnels}
        userTheme={userTheme}
        newPrevi={newPrevi}
        setNewPrevi={setNewPrevi}
        handleAddPrevision={handleAddPrevision}
        handleTryDuplicate={handleTryDuplicate}
        selectedIds2={selectedIds2}
        previsionsFiltrees={previsionsFiltrees}
        updatePrevision={updatePrevision}
        toggleSelect2={toggleSelect2}
        toggleAll2={toggleAll2}
        categoriesVisibles={categoriesVisibles}
        optionsComptes={optionsComptes}
        chartDataPrevisions={chartDataPrevisions}
        PrevisionsChartView={PrevisionsChartView}
        moisDisponibles={moisDisponibles}
        excludedMonths={excludedMonths}
        setExcludedMonths={setExcludedMonths}
        recapPrevisionsStats={recapPrevisionsStats}
        objectifAnnuelGlobal={objectifAnnuelGlobal}
        statsEpargnePrevisionnelle={statsEpargnePrevisionnelle}
        pourcentageAnnuel={pourcentageAnnuel}
        CustomSelect={CustomSelect}
        SortableAccountCard={SortableAccountCard}
        toutesLesTransactions={toutesLesTransactions}
      />
    </div>
  </>
)}



 {activeTab === 'gerer' && (
  <>
    <GererDesktop 
      filters={filters}
      setFilters={setFilters}
      fetchTransactions={fetchTransactions}
      comptes={comptes}
      soldesTries={soldesTries}
      handleProfilChange={handleProfilChange}
      handleCompteChange={handleCompteChange}
      selectedCompte={selectedCompte}
      moisListe={moisListe}
      availablePeriods={availablePeriods}
      statsFiltrées={statsFiltrées}
      isApprendreActive={isApprendreActive}
      setIsApprendreActive={setIsApprendreActive}
      showLearningList={showLearningList}
      setShowLearningList={setShowLearningList}
      elementsAppris={elementsAppris}
      fetchMemoire={fetchMemoire}
      handleDeleteMemory={handleDeleteMemory}
      newTx={newTx}
      setNewTx={setNewTx}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      submitQuickTransaction={submitQuickTransaction}
      setShowExportModal={setShowExportModal}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      transactionsFiltrees={transactionsFiltrees}
      selectedIds={selectedIds}
      toggleAll={toggleAll}
      toggleSelect={toggleSelect}
      handleSort={handleSort}
      sortConfig={sortConfig}
      updateCell={updateCell}
      categoriesVisibles={categoriesVisibles}
      toutesLesCategories={toutesLesCategories}
      categoriesPerso={categoriesPerso}
      masquees={masquees}
      setMasquees={setMasquees}
      addCategory={addCategory}
      handleUpdateCategory={handleUpdateCategory}
      removeCategory={removeCategory}
      toggleVisibility={toggleVisibility}
      allPrevisionsAnnee={allPrevisionsAnnee}
      allocations={allocations}
      budgets={budgets}
      formBudget={formBudget}
      setFormBudget={setFormBudget}
      handleAddBudget={handleAddBudget}
      showBudgetDetails={showBudgetDetails}
      setShowBudgetDetails={setShowBudgetDetails}
      selectedBudgetYear={selectedBudgetYear}
      setSelectedBudgetYear={setSelectedBudgetYear}
      optionsAnnees={optionsAnnees}
      listeMoisDisponibles={listeMoisDisponibles}
      selectedBudgetMonth={selectedBudgetMonth}
      setSelectedBudgetMonth={setSelectedBudgetMonth}
      editingBudget={editingBudget}
      setEditingBudget={setEditingBudget}
      handleUpdateBudget={handleUpdateBudget}
      confirmDelete2={confirmDelete2}
      CustomSelect={CustomSelect}
      toutesLesTransactions={toutesLesTransactions}
      userManagedGroups={userManagedGroups}
      setUserManagedGroups={setUserManagedGroups}
      handleAssignGroup={handleAssignGroup}
      handleDeleteGroup={handleDeleteGroup}
    />

    {/* Version Mobile existante inchangée */}
    <div className="block lg:hidden">
      <GererMobile    
        toutesLesCategories={toutesLesCategories}
        masquees={masquees}
        setMasquees={setMasquees}
        categoriesPerso={categoriesPerso}
        categoriesVisibles={categoriesVisibles}
        addCategory={addCategory}
        handleUpdateCategory={handleUpdateCategory}
        removeCategory={removeCategory}
        toggleVisibility={toggleVisibility}
        budgets={budgets}
        formBudget={formBudget}
        setFormBudget={setFormBudget}
        handleAddBudget={handleAddBudget}
        showBudgetDetails={showBudgetDetails}
        setShowBudgetDetails={setShowBudgetDetails}
        selectedBudgetYear={selectedBudgetYear}
        setSelectedBudgetYear={setSelectedBudgetYear}
        optionsAnnees={optionsAnnees}
        listeMoisDisponibles={listeMoisDisponibles}
        selectedBudgetMonth={selectedBudgetMonth}
        setSelectedBudgetMonth={setSelectedBudgetMonth}
        editingBudget={editingBudget}
        setEditingBudget={setEditingBudget}
        handleUpdateBudget={handleUpdateBudget}
        confirmDelete2={confirmDelete2}
        filters={filters}
        comptes={comptes}
        setFilters={setFilters}
        selectedCompte={selectedCompte}
        setSelectedCompte={setSelectedCompte}
        handleProfilChange={handleProfilChange}
        handleCompteChange={handleCompteChange}
        availablePeriods={availablePeriods}
        moisListe={moisListe}
        statsFiltrées={statsFiltrées}
        isApprendreActive={isApprendreActive}
        setIsApprendreActive={setIsApprendreActive}
        showLearningList={showLearningList}
        setShowLearningList={setShowLearningList}
        fetchMemoire={fetchMemoire}
        elementsAppris={elementsAppris}
        handleDeleteMemory={handleDeleteMemory}
        newTx={newTx}
        setNewTx={setNewTx}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        submitQuickTransaction={submitQuickTransaction}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        transactionsFiltrees={transactionsFiltrees}
        transactionsAAfficher={transactionsAAfficher}
        selectedIds={selectedIds}
        toggleAll={toggleAll}
        toggleSelect={toggleSelect}
        updateCell={updateCell}
        allocations={allocations}
        activeTab={activeTab}
        soldesTries={soldesTries}
        allPrevisionsAnnee={allPrevisionsAnnee}
        toutesLesTransactions={toutesLesTransactions}
        CustomSelect={CustomSelect}
        user={user}
        api={api}
        fetchCategories={fetchCategories}
      />
    </div>
  </>
)}



{activeTab === 'importer' && (
  <>
    <ImportDesktop 
      importCompte={importCompte}
      setImportCompte={setImportCompte}
      comptes={comptes}
      powensData={powensData}
      syncCountByAccount={syncCountByAccount}
      handleAssociateAccount={handleAssociateAccount}
      isRefreshingPowens={isRefreshingPowens}
      isCheckingSync={isCheckingSync}
      handleForceRefreshPowens={handleForceRefreshPowens}
      isSyncingPowens={isSyncingPowens}
      handleConnectNewBank={handleConnectNewBank}
      isManualSyncing={isManualSyncing}
      setIsManualSyncing={setIsManualSyncing}
      isSyncingData={isSyncingData}
      handleSyncPowens={handleSyncPowens}
      hasPendingSync={hasPendingSync}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      isDragging={isDragging}
      setFileName={setFileName}
      handleFileUpload={handleFileUpload}
      transactionsCalculees={transactionsCalculees}
      setTempTransactions={setTempTransactions}
      confirmBatchImport={confirmBatchImport}
      intelSelectedCat={intelSelectedCat}
      setIntelSelectedCat={setIntelSelectedCat}
      categoriesPourIntelligence={categoriesPourIntelligence}
      activeCategoryData={activeCategoryData}
      handleRemoveKeyword={handleRemoveKeyword}
      handleAddKeyword={handleAddKeyword}
      signType={signType}
      setSignType={setSignType}
      CustomSelect={CustomSelect}
    />

    {/* Version Mobile existante inchangée */}
    <div className="block lg:hidden">
      <ImportMobile 
        selectedCompte={selectedCompte}
        setSelectedCompte={setSelectedCompte}
        comptes={comptes}
        powensData={powensData}
        syncCountByAccount={syncCountByAccount}
        handleAssociateAccount={handleAssociateAccount}
        isSyncingPowens={isSyncingPowens}
        handleConnectNewBank={handleConnectNewBank}
        isManualSyncing={isManualSyncing}
        isSyncingData={isSyncingData}
        isCheckingSync={isCheckingSync}
        handleSyncPowens={handleSyncPowens}
        hasPendingSync={hasPendingSync}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        setFileName={setFileName}
        handleFileUpload={handleFileUpload}
        transactionsCalculees={transactionsCalculees}
        setTempTransactions={setTempTransactions}
        confirmBatchImport={confirmBatchImport}
        categoriesPourIntelligence={categoriesPourIntelligence}
        intelSelectedCat={intelSelectedCat}
        setIntelSelectedCat={setIntelSelectedCat}
        activeCategoryData={activeCategoryData}
        handleRemoveKeyword={handleRemoveKeyword}
        handleAddKeyword={handleAddKeyword}
        signType={signType}
        setSignType={setSignType}
        soldesTries={soldesTries}
        CustomSelect={CustomSelect} 
        categoriesVisibles={categoriesVisibles}
      />
    </div>
  </>
)}



        







{activeTab === 'comptes' && (
  <>
    <ComptesDesktop 
      comptes={comptes}
      setComptes={setComptes}
      handleAddCompte={handleAddCompte}
      selectedType={selectedType}
      setSelectedType={setSelectedType}
      typeOptions={typeOptions}
      compteName={compteName}
      setCompteName={setCompteName}
      newCompteColor={newCompteColor}
      setNewCompteColor={setNewCompteColor}
      showAddPicker={showAddPicker}
      setShowAddPicker={setShowAddPicker}
      showPicker={showPicker}
      setShowPicker={setShowPicker}
      handleBlurUpdate={handleBlurUpdate}
      openDeleteModal={openDeleteModal}
      openCalculateurAssistant={openCalculateurAssistant}
      handleColorChange={handleColorChange}
      CustomSelect={CustomSelect}
      importMode={importMode}
      powensData={powensData}
      handleAssociateAccount={handleAssociateAccount}
      creationPowensName={creationPowensName}
      setCreationPowensName={setCreationPowensName}
      handleConnectNewBank={handleConnectNewBank}
    />

    {/* Version Mobile existante inchangée */}
    <div className="block lg:hidden">
      <ComptesMobile 
        comptes={comptes}
        setComptes={setComptes}
        handleAddCompte={handleAddCompte}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        typeOptions={typeOptions}
        compteName={compteName}
        setCompteName={setCompteName}
        newCompteColor={newCompteColor}
        setNewCompteColor={setNewCompteColor}
        showAddPicker={showAddPicker}
        setShowAddPicker={setShowAddPicker}
        showPicker={showPicker}
        setShowPicker={setShowPicker}
        handleBlurUpdate={handleBlurUpdate}
        openDeleteModal={openDeleteModal}
        openCalculateurAssistant={openCalculateurAssistant}
        handleColorChange={handleColorChange}
        CustomSelect={CustomSelect}
        importMode={importMode}
        powensData={powensData}
        handleAssociateAccount={handleAssociateAccount}
      />
    </div>
  </>
)}


{activeTab === 'theme' && userRole === 'admin' && (
  <ThemeStudioDesktop 
    user={user}
    updateThemeLive={updateThemeLive}
    handleSaveThemeSQL={handleSaveThemeSQL}
    hiddenPages={hiddenPages}
    setHiddenPages={setHiddenPages}
    activeTab={activeTab}
    setActiveTab={setActiveTab}
  />
)}
       


{activeTab === 'Guide' && (
  <div className="w-full">
    {/* 💡 On passe l'état de changement d'onglet pour lier le bouton du bas */}
    <GuideView userTheme={userTheme} setActiveTab={setActiveTab} />
  </div>
)}





{activeTab === 'demenagement' && userRole === 'admin' && (
  <DemenagementPage 
    user={user} 
    toutesLesCategories={toutesLesCategories} 
    comptes={comptes}
  />
)}



{activeTab === 'profile' && (
  <ProfileTab 
    user={user}
    powensData={powensData}
    comptes={comptes}
    syncCountByAccount={syncCountByAccount}
    handleAssociateAccount={handleAssociateAccount}
    setActiveTab={setActiveTab}
    // 🟢 AJOUT DES PROPS DE SYNCHRONISATION :
    importMode={importMode}
    setImportMode={setImportMode}
    onAutoSync={performBackgroundSyncIfNeeded}

    fetchPowensConnections={fetchPowensConnections}
    fetchComptes={fetchComptes}
    handleConnectNewBank={handleConnectNewBank}
  />
)}



      </main>

      </div>


      {/* MODALE D'EXPORTATION COMPTABLE */}
        <ExportModal 
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          toutesLesTransactions={toutesLesTransactions}
          comptes={comptes}
          filters={filters}
          recapAnnuelStats={recapAnnuelStats}
          statsAnnuellesCategories={statsAnnuellesCategories}
        />

{activeTab === 'conges' && userRole === 'admin' && (
  <CongesPage user={user} />
)}

{activeTab === 'tricount' && (
  <div className="w-full"> 
    {/* 💡 Nous laissons le composant se charger sur tous les écrans. 
        C'est lui qui choisira en interne d'afficher la version PC ou Mobile. */}
    <TricountManager userId={user} />
  </div>
)}
    


      {/* 💡 Appel unique du menu de widgets centralisé */}
      <UnifiedWidgets 
        user={user} 
        userTheme={userTheme} 
        setUserTheme={setUserTheme} 
      />

      {/* 🟢 INDICATEUR DE SYNCHRONISATION AUTOMATIQUE EN COURS AU DÉMARRAGE */}
      {isAutoSyncingOnLoad && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-indigo-500/30 text-white shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
            {/* Animation spinner et point pulsant */}
            <div className="relative flex items-center justify-center">
              <span className="w-3.5 h-3.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            </div>

            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 leading-none">
                <span>Synchronisation automatique</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              </span>
              <span className="text-[8px] font-bold text-white/50 uppercase tracking-widest leading-none mt-1">
                Actualisation des comptes et Transactions...
              </span>
            </div>
          </div>
        </div>
      )}
     

      {deleteModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Overlay flou */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[var(--glass-blur)]" onClick={() => setDeleteModal({ show: false, accountName: null })} />
          
          {/* Contenu de la Modal */}
          <div className="relative bg-white rounded-[var(--radius)] p-8 max-w-sm w-full shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} className="text-rose-500" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer le compte ?</h3>
            <p className="text-slate-500 text-center text-sm mb-8">
              Tu es sur le point de supprimer <span className="font-bold text-slate-700">"{deleteModal.accountName}"</span>. Cette action effacera toutes les données liées.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteModal({ show: false, accountName: null })}
                className="py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                className="py-3 bg-rose-500 text-[var(--text-main)] rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}



      {/* BARRE D'ACTION FLOTTANTE */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10">
            <div className="bg-[#121212]/90 backdrop-blur-[var(--glass-blur)] border border-white/10 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6">
              
              {/* Compteur */}
              <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--primary)] blur-sm opacity-50"></div>
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)] text-[10px] font-black text-[var(--text-main)]">
                    {selectedIds.length}
                  </span>
                </div>
                <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.2em]">Sélectionnés</span>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-lg shadow-rose-500/10"
                >
                  <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                  Supprimer la sélection
                </button>
                
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2.5 text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}



        {/* MODALE DE CONFIRMATION CUSTOM */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Overlay flouté */}
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
                onClick={() => setShowDeleteConfirm(false)}
              />
              
              {/* Boîte de dialogue */}
              <div className="relative bg-[#1a1a1a] border border-white/10 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
                    <Trash2 size={28} className="text-rose-500" />
                  </div>
                  
                  <h3 className="text-[var(--text-main)] text-xl font-black mb-2">Supprimer ?</h3>
                  <p className="text-[var(--text-main)]/40 text-sm leading-relaxed mb-8">
                    Voulez-vous vraiment supprimer la catégorie <span className="text-[var(--text-main)] font-bold">"{catToDelete}"</span> ? Cette action est irréversible.
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-6 py-3 rounded-xl bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] text-[var(--text-main)] text-xs font-black uppercase transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={confirmDeletecat} // <--- Appel de la fonction de suppression réelle
                      className="flex-1 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-xs font-black uppercase transition-all"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
{budgetToDelete && (
  <div className="fixed inset-0 z-[20000] flex items-center justify-center p-4">
    {/* Overlay sombre et flou */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
      onClick={() => setBudgetToDelete(null)}
    />
    
    {/* Contenu de la modale */}
    <div className="relative bg-[#1a1a1c] border border-white/10 p-6 rounded-[2rem] shadow-2xl max-w-xs w-full animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
          <Trash2 size={24} className="text-rose-500" />
        </div>
        
        <div>
          <h3 className="text-[var(--text-main)] text-sm font-black uppercase tracking-widest">Supprimer le budget ?</h3>
          <p className="text-[10px] text-[var(--text-main)]/40 font-bold uppercase mt-2 px-4">
            Voulez-vous vraiment retirer le budget <span className="text-rose-400">"{budgetToDelete?.nom}"</span> ?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <button 
            onClick={() => setBudgetToDelete(null)}
            className="py-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={executeDeleteBudget}
            className="py-3 bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
)}


{selectedIds2.length > 0 && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10">
    <div className="bg-[#121212]/90 backdrop-blur-[var(--glass-blur)] border border-white/10 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6">
      
      {/* Compteur */}
      <div className="flex items-center gap-3 border-r border-white/10 pr-6">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-sm opacity-50"></div>
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-[var(--text-main)]">
            {selectedIds2.length}
          </span>
        </div>
        <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.2em]">Prévisions</span>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleDeleteSelected2}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-lg shadow-rose-500/10"
        >
          <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
          Supprimer
        </button>
        
        <button 
          onClick={() => setSelectedIds2([])}
          className="px-4 py-2.5 text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}



{/* --- MODAL DE CONFIRMATION PERSONNALISÉ --- */}
{deleteModal3.show && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay flou */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
      onClick={() => setDeleteModal3({ show: false, projetNom: null })}
    />
    
    {/* Contenu du Modal */}
    <div className="relative bg-[#0A0A0A] border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <Trash2 size={32} />
        </div>
        
        <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-tighter mb-2">
          Supprimer l'enveloppe ?
        </h3>
        
        <p className="text-[var(--text-main)]/40 text-xs leading-relaxed mb-8">
          Êtes-vous sûr de vouloir supprimer <span className="text-[var(--text-main)] font-bold">"{deleteModal3.projetNom}"</span> ? 
          Cette action est irréversible et libérera les fonds dans votre solde global.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button 
            onClick={() => setDeleteModal3({ show: false, projetNom: null })}
            className="py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest hover:bg-[var(--glass-bg)] transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={async () => {
              await api.delete(`/delete-enveloppe/${deleteModal3.projetNom}?profil=${filters.profil}`);
              fetchAllocations();
              setDeleteModal3({ show: false, projetNom: null });
            }}
            className="py-3 rounded-xl bg-rose-500 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
)}



{assistantData.open && (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
    {/* Overlay flouté */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[var(--glass-blur)]" onClick={() => setAssistantData({ ...assistantData, open: false })} />
    
    {/* Fenêtre Modale */}
    <div className="relative w-full max-w-md bg-[#1a1a1c]/90 border border-white/20 rounded-[2rem] p-8 shadow-2xl backdrop-blur-[var(--glass-blur)] animate-in zoom-in-95 duration-200">
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
)}



{/* --- MODAL DE CONFIRMATION DE DUPLICATION PERSONNALISÉ --- */}
{duplicateModal.show && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay flou */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-300"
      onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })}
    />
    
    {/* Contenu du Modal */}
    <div className="relative bg-[#0A0A0A] border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center">
        {/* Badge Icône Émeraude */}
        <div className="p-4 bg-emerald-500/10 rounded-full text-emerald-400 mb-4 animate-pulse">
          {/* Remplace Copy par RefreshCw ou l'icône de ton choix si nécessaire */}
          <Copy size={32} />
        </div>
        
        <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-tighter mb-2精确">
          Dupliquer les prévisions ?
        </h3>
        
        <p className="text-[var(--text-main)]/40 text-xs leading-relaxed mb-8">
          Êtes-vous sûr de vouloir copier les <span className="text-emerald-400 font-black">{duplicateModal.count}</span> prévisions {duplicateModal.isSelection ? 'sélectionnées' : 'de ce mois'} vers le mois prochain ? 
          <br />
          <span className="opacity-60 text-[10px]">Les montants, catégories et comptes associés seront conservés à l'identique.</span>
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button 
            onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })}
            className="py-3 rounded-xl bg-[var(--glass-bg)] text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 hover:text-[var(--text-main)] transition-all cursor-pointer"
          >
            Annuler
          </button>
          
          <button 
            onClick={handleConfirmDuplicate}
            className="py-3 rounded-xl bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all cursor-pointer"
          >
            Dupliquer
          </button>
        </div>
      </div>
    </div>
  </div>
)}




{/* =========================================================================
    🎉 NOTES DE PATCH OFFICIELLES v4.3 : DIVISION DE TRANSACTIONS
    ========================================================================= */}
{showPatchModal && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
    
    <div className="w-full max-w-lg bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
      
      {/* 1. EN-TÊTE OFFICIEL DE LA MISE À JOUR */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                Notes de version
              </span>
              <span className="text-[9px] font-mono text-white/30 font-bold">v{CURRENT_VERSION}</span>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
              Nouveautés & Améliorations
            </h3>
          </div>
        </div>
      </div>

      <div className="space-y-3.5 mb-6 text-left">
        
        {/* 2. EXPLICATION DU CONTEXTE (POURQUOI CETTE MISE À JOUR ?) */}
        <div className="space-y-1">
          <h4 className="text-[11px] font-black uppercase text-white/90 tracking-wider">
            Suivi budgétaire multi-catégories
          </h4>
          <p className="text-[11px] text-white/60 leading-relaxed font-medium">
            Dans la vie quotidienne, un seul paiement en magasin regroupe souvent des achats de nature différente. Pour vous offrir une comptabilité ultra-précise, Kleea vous permet désormais de <strong>diviser une dépense unique en plusieurs sous-catégories</strong>.
          </p>
        </div>

        {/* 3. EXEMPLE CONCRET D'APPLICATION */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2">
          <div className="flex justify-between items-center text-[8px] font-black uppercase text-amber-300 tracking-wider">
            <span>Exemple d'application</span>
            <span className="text-white/40 font-mono">Paiement réel : 90,00 €</span>
          </div>

          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10.5px] font-bold">
            <span className="text-white/80">Carrefour (90 €)</span>
            <span className="text-indigo-400 font-black">➔</span>
            <div className="flex gap-1.5 text-[9px] font-mono shrink-0">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">60€ Alimentation</span>
              <span className="text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">30€ Maison</span>
            </div>
          </div>
          
          <p className="text-[9px] text-white/40 italic">
            Vos soldes bancaires restent parfaitement exacts, tandis que vos graphiques et limites de budget reflètent la réalité de vos achats.
          </p>
        </div>

        {/* 4. CE QUI CHANGE POUR VOUS (CHANGELOG) */}
        <div className="space-y-1.5 text-[10px] text-white/70">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Scissors size={13} className="text-indigo-400 shrink-0" />
            <span><strong>Outil Ciseaux :</strong> Accessible directement sur chaque ligne dans l'onglet <strong>Gérer</strong>.</span>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <Scale size={13} className="text-emerald-400 shrink-0" />
            <span><strong>Équilibrage automatique :</strong> Ajuste automatiquement le reste à répartir au centime près.</span>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
            <RotateCcw size={13} className="text-rose-400 shrink-0" />
            <span><strong>Annulation en 1 clic :</strong> Cliquez sur le badge violet <strong>[Divisée]</strong> pour refusionner l'écriture originale.</span>
          </div>
        </div>

      </div>

      {/* 5. BOUTON DE FERMETURE */}
      <button
        type="button"
        onClick={handleClosePatchModal}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
      >
        Découvrir la mise à jour ! 🚀
      </button>

    </div>
  </div>
)}

{/* MODALE SELECTION COMPTE POWENS */}
{showPowensModal && (
  <ImportPowensModal
    userToken={localStorage.getItem('powens_user_token')}
    utilisateur={typeof user === 'object' ? user.nom : user}
    comptes={comptes}
    toutesLesTransactions={toutesLesTransactions}
    syncCountByAccount={syncCountByAccount} // 👈 Indispensable pour savoir si le compte est à jour
    onClose={() => setShowPowensModal(false)}
    onSuccess={(importedData, targetAccountName) => {
      if (targetAccountName) {
        setImportCompte(targetAccountName);
      }
      handlePowensImportSuccess(importedData, targetAccountName);
    }}
  />
)}



{/* =========================================================================
          💡 MODALE UNIFIÉE DE CONFIRMATION (RECONDUCTION MENSUELLE VS ANNUELLE)
          ========================================================================= */}
      {duplicateModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Calque de fond cliquable pour fermer */}
          <div className="absolute inset-0" onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} />

          {/* Conteneur de la Modale - Entièrement centré et overflow-visible */}
          <div className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-visible">
            {/* En-tête de la modale */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest leading-none">
                  {duplicateType === 'year' ? 'Propagation Annuelle' : 'Reconduire le mois'}
                </h4>
                <p className="text-[9px] text-white/30 uppercase font-bold mt-1">
                  {duplicateType === 'year' ? 'Duplication sur les mois restants' : 'Duplication vers le mois suivant'}
                </p>
              </div>
              <button 
                onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} 
                className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Corps de texte dynamique selon l'action demandée */}
            <div className="space-y-3 mb-6 text-xs text-white/60 leading-relaxed select-none">
              {duplicateType === 'year' ? (
                <p>
                  Voulez-vous propager ces <strong className="text-white">{selectedIds2.length} prévisions sélectionnées</strong> sur l'intégralité des mois restants de l'année <strong className="text-emerald-400">{filters.annee}</strong> (jusqu'à Décembre) ?
                </p>
              ) : (
                <p>
                  Voulez-vous reconduire {selectedIds2.length > 0 ? `les ${selectedIds2.length} prévisions sélectionnées` : "l'intégralité des prévisions de ce mois"} vers le mois suivant ?
                </p>
              )}
              <p className="text-[10px] text-white/30 italic">
                Cette action va cloner et adapter automatiquement les dates d'échéance des mouvements correspondants.
              </p>
            </div>

            {/* Actions de validation */}
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} 
                className="py-2.5 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60"
              >
                Annuler
              </button>
              <button 
                onClick={() => {
                  if (duplicateType === 'year') {
                    confirmPropagateToYear(); // ⚡ Appelle la propagation sur le reste de l'année
                  } else {
                    handleConfirmDuplicate(); // 💡 Appelle votre vraie fonction d'origine
                  }
                  setDuplicateModal({ show: false, count: 0, isSelection: false });
                }} 
                className="py-2.5 rounded-xl bg-[var(--primary)] text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--primary)]/15 cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}


{showOnboarding && toutesLesTransactions.length === 0 && (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <div className="bg-[#111113] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
      
      {/* Icône d'en-tête */}
      <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 rounded-full flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        <Sparkles size={28} className="animate-pulse" />
      </div>

      <div>
        <h2 className="text-xl font-black uppercase tracking-wider text-white">Bienvenue sur Kleea</h2>
        <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Configurez votre espace de gestion</p>
      </div>
      
      <p className="text-xs text-white/60 leading-relaxed">
        Comment souhaitez-vous gérer l'arrivée de vos transactions ? Vous pourrez modifier ce choix à tout moment dans votre profil.
      </p>

      <div className="grid grid-cols-1 gap-3 pt-1">
        
        {/* OPTION 1 : SYNCHRONISATION AUTOMATIQUE */}
        <button
          type="button"
          onClick={() => handleChooseMode('auto')}
          className="p-4 bg-[var(--primary)] hover:opacity-95 text-white rounded-2xl flex flex-col items-center gap-1.5 transition-all group cursor-pointer shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]"
        >
          <span className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
            <Zap size={14} className="shrink-0 fill-current text-amber-300" />
            <span>Synchronisation Automatique</span>
          </span>
          <span className="text-[10px] opacity-80 text-center leading-relaxed font-medium">
            Connexion bancaire avec mise à jour continue en arrière-plan (zéro action requise)
          </span>
        </button>

        {/* OPTION 2 : MODE MANUEL (CONTRÔLE TOTAL) */}
        <button
          type="button"
          onClick={() => handleChooseMode('manual')}
          className="p-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl flex flex-col items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] group"
        >
          <span className="text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-white/90">
            <FileUp size={14} className="shrink-0 text-white/60 group-hover:text-white transition-colors" />
            <span>Mode Manuel (Contrôle total)</span>
          </span>
          <span className="text-[10px] text-white/50 group-hover:text-white/70 text-center leading-relaxed font-medium transition-colors">
            Vous décidez vous-même quand importer vos transactions : par <strong className="text-white">fichiers CSV</strong> ou en reliant <strong className="text-white">vos comptes bancaires réels</strong>
          </span>
        </button>

      </div>
    </div>
  </div>
)}

{/* MODALE DE MODIFICATION D'UNE CATÉGORIE (ICÔNE & COULEUR) */}
{editingCat && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setEditingCat(null)} />
    
    <div className="relative w-full max-w-sm bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-5">
        <div>
          <h4 className="text-xs font-black uppercase text-indigo-400 tracking-widest">
            Personnaliser la catégorie
          </h4>
          <p className="text-[10px] text-white/60 font-bold uppercase mt-0.5">
            {editingCat.nom}
          </p>
        </div>
        <button onClick={() => setEditingCat(null)} className="text-white/40 hover:text-white p-1">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        {/* Prévisualisation */}
        {/* Prévisualisation dans la modale d'édition */}
          <div className="flex items-center justify-center p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
            <CategoryIcon 
              name={editingCat.icone} 
              size={36} 
              color={editingCat.couleur} // 👈 Applique immédiatement la couleur choisie dans le SketchPicker
            />
          </div>

        {/* Sélection Icône & Couleur */}
        <div className="grid grid-cols-2 gap-3">
          {/* Bouton Choix d'icône */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowEditIconPicker(!showEditIconPicker)}
              className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Tag size={14} />
              <span>Changer d'icône</span>
            </button>

            {showEditIconPicker && (
              <LucideIconPicker 
                selectedIcon={editingCat.icone}
                onSelectIcon={(icon) => {
                  setEditingCat({ ...editingCat, icone: icon });
                  setShowEditIconPicker(false);
                }}
                onClose={() => setShowEditIconPicker(false)}
              />
            )}
          </div>

          {/* Bouton Choix de couleur */}
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowEditColorPicker(!showEditColorPicker)}
              className="w-full py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <div className="w-3.5 h-3.5 rounded-full border border-white/40" style={{ backgroundColor: editingCat.couleur }} />
              <span>Couleur</span>
            </button>

            {showEditColorPicker && (
              <div className="absolute z-[120] bottom-full mb-2 right-0 animate-in zoom-in-95 duration-150">
                <div className="fixed inset-0" onClick={() => setShowEditColorPicker(false)} />
                <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                  <SketchPicker 
                    color={editingCat.couleur} 
                    onChange={(c) => setEditingCat({ ...editingCat, couleur: c.hex })} 
                    disableAlpha 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bouton Valider */}
        <button 
          onClick={() => handleUpdateCategory(editingCat.nom, editingCat.icone, editingCat.couleur)}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer mt-2"
        >
          Enregistrer les modifications
        </button>
      </div>
    </div>
  </div>
)}

{/* =========================================================================
    🎉 MODALE DE CÉLÉBRATION : PREMIER IMPORT AUTOMATIQUE RÉUSSI
    ========================================================================= */}
{celebrationModal.show && (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
    <div 
      className="absolute inset-0" 
      onClick={() => setCelebrationModal({ show: false, accountName: '', count: 0 })} 
    />

    <div className="relative w-full max-w-md bg-[#0e131f] border border-emerald-500/30 rounded-3xl p-8 shadow-[0_20px_70px_rgba(16,185,129,0.25)] z-10 animate-in zoom-in-95 duration-300 text-center overflow-hidden">
      
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
          <span className="text-[10px] font-black text-indigo-300 uppercase mt-0.5">Auto-classés</span>
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
)}

<style dangerouslySetInnerHTML={{__html: `
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
`}} />


    </div>  

  );
}

export default FinanceApp;