import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  icons, Search, X, Tag, HelpCircle, Utensils, ShoppingBag, Home, 
  Car, Briefcase, Gamepad2, Smartphone, HeartPulse, PawPrint, Sparkles,
  Stethoscope, Milestone, Train, CircleParking, Users2, ArrowDownLeft,
  Send, ArrowRightLeft, HandCoins, Percent, Banknote, Shirt, Scale, 
  Landmark, Zap, Droplets, Film, Scissors, Coins, Pill, Wrench, Bus, 
  Fuel, Wifi, Plane, Gift, Dumbbell, Coffee, Tv, Music, Ticket, 
  PiggyBank, Armchair, Receipt, ShoppingCart, Key,Users,BookOpen 
} from 'lucide-react';

// =========================================================================
// 0. FONCTIONS UTILITAIRES (NETTOYAGE & RÉSOLUTION D'ICÔNES)
// =========================================================================
export const getCleanCategoryName = (name) => {
  if (!name || typeof name !== 'string') return '';
  const emojiRegex = /(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g;
  return name.replace(emojiRegex, '').trim();
};

// 💡 Résolution infaillible d'icônes Lucide (supporte "Pizza", "pizza", "tag", "shopping-bag", etc.)
export const getLucideIcon = (iconName) => {
  // 💡 Remplacement du fallback Tag par HelpCircle
  if (!iconName || typeof iconName !== 'string') return HelpCircle;

  const iconCollection = icons || LucideIcons;

  if (iconCollection[iconName]) return iconCollection[iconName];

  const pascal = iconName
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, c => c.toUpperCase());

  if (iconCollection[pascal]) return iconCollection[pascal];

  const matchedKey = Object.keys(iconCollection).find(k => k.toLowerCase() === iconName.toLowerCase());
  if (matchedKey && iconCollection[matchedKey]) return iconCollection[matchedKey];

  return HelpCircle;
};

// =========================================================================
// 1. LES CATÉGORIES THÉMATIQUES DU SÉLECTEUR (ENRICHIES)
// =========================================================================
export const ICON_CATEGORIES = [
  {
    id: 'people',
    label: 'Famille, Couple & Social',
    icon: Users,
    icons: [
      'Users', 'UsersRound', 'User', 'UserRound', 'UserPlus', 'UserCheck',
      'Heart', 'HeartHandshake', 'Handshake', 'Baby', 'PersonStanding',
      'Smile', 'SmilePlus', 'Contact', 'ContactRound', 'PartyPopper',
      'Sparkles', 'Gift', 'Cake', 'Camera', 'MessagesSquare', 'Share2'
    ]
  },
  {
    id: 'transport',
    label: 'Transports & Véhicules',
    icon: Car,
    icons: [
      'Car', 'CarFront', 'CarTaxiFront', 'Bus', 'BusFront', 
      'Train', 'TrainFront', 'TrainTrack', 'TramFront', 'TrainFrontTunnel',
      'Bike', 'Plane', 'PlaneTakeoff', 'PlaneLanding', 'Ship', 'Sailboat',
      'Fuel', 'CircleParking', 'Milestone', 'Navigation', 'Compass', 
      'MapPin', 'Map', 'Truck', 'Rocket', 'CableCar', 'Ticket', 'Footprints'
    ]
  },
  {
    id: 'food',
    label: 'Alimentation & Sorties',
    icon: Utensils,
    icons: [
      'Utensils', 'UtensilsCrossed', 'Pizza', 'Coffee', 'Wine', 'Beer', 
      'CupSoda', 'Cake', 'Cookie', 'Apple', 'Carrot', 'Soup', 'Fish', 
      'Egg', 'Sandwich', 'Popcorn', 'Candy', 'Cherry', 'Citrus', 'IceCream', 
      'Croissant', 'Beef', 'Salad', 'Martini', 'Grape', 'ChefHat',
      'ShoppingBag', 'ShoppingCart', 'ShoppingBasket'
    ]
  },
  {
    id: 'home',
    label: 'Logement, Maison & Énergie',
    icon: Home,
    icons: [
      'Home', 'Building', 'Building2', 'Armchair', 'Bed', 'Bath', 'Lamp', 
      'Tv', 'WashingMachine', 'DoorClosed', 'Key', 'Droplets', 'Flame', 
      'Zap', 'Plug', 'Wrench', 'Hammer', 'Paintbrush', 'PaintBucket', 
      'Trash2', 'Fan', 'ShieldCheck', 'ShowerHead', 'Couch', 'Sofa', 
      'TreePine', 'Heater', 'Boxes', 'Warehouse'
    ]
  },
  {
    id: 'shopping',
    label: 'Shopping, Mode & Cadeaux',
    icon: ShoppingBag,
    icons: [
      'ShoppingBag', 'ShoppingCart', 'ShoppingBasket', 'Store', 'Tag', 
      'Shirt', 'Watch', 'Glasses', 'Gem', 'Crown', 'Gift', 'Package', 
      'Box', 'Footprints', 'Luggage', 'Sparkles', 'Scissors', 'Barcode', 
      'Receipt', 'Percent', 'BadgePercent'
    ]
  },
  {
    id: 'finance',
    label: 'Finance, Banque & Travail',
    icon: Briefcase,
    icons: [
      'Briefcase', 'Wallet', 'Landmark', 'Banknote', 'Coins', 'PiggyBank', 
      'CreditCard', 'Receipt', 'Scale', 'TrendingUp', 'TrendingDown', 
      'Percent', 'Calculator', 'FileText', 'BadgePercent', 'DollarSign', 
      'Euro', 'HandCoins', 'ArrowRightLeft', 'ArrowDownLeft', 'Send', 
      'Vault', 'Shield'
    ]
  },
  {
    id: 'leisure',
    label: 'Loisirs, Sport & Culture',
    icon: Gamepad2,
    icons: [
      'Gamepad2', 'Gamepad', 'Film', 'Clapperboard', 'Music', 'Headphones', 
      'Mic', 'Camera', 'Video', 'Trophy', 'Medal', 'Dumbbell', 'Dice1', 
      'Dice5', 'Palette', 'PartyPopper', 'Theater', 'Guitar', 'Radio', 
      'Tv2', 'Ticket', 'Tent', 'Mountain', 'FerrisWheel'
    ]
  },
  {
    id: 'tech',
    label: 'Tech, Médias & Réseaux',
    icon: Smartphone,
    icons: [
      'Smartphone', 'Tablet', 'Laptop', 'Monitor', 'Wifi', 'Cpu', 
      'HardDrive', 'BatteryCharging', 'Server', 'Bluetooth', 'Cloud', 
      'QrCode', 'Printer', 'Bot', 'Code', 'Terminal', 'Radio', 'Tv'
    ]
  },
  {
    id: 'health',
    label: 'Santé, Soins & Bien-être',
    icon: HeartPulse,
    icons: [
      'Stethoscope', 'HeartPulse', 'Heart', 'Pill', 'Activity', 'Eye', 
      'Glasses', 'ShieldAlert', 'Cross', 'Baby', 'Syringe', 'Bandage', 
      'Thermometer', 'Accessibility', 'Smile', 'HeartHandshake'
    ]
  },
  {
    id: 'education',
    label: 'Études & Enfants',
    icon: BookOpen,
    icons: [
      'GraduationCap', 'School', 'Book', 'BookOpen', 'BookUser', 
      'Library', 'Backpack', 'Pencil', 'PenTool', 'Baby'
    ]
  },
  {
    id: 'nature',
    label: 'Animaux & Nature',
    icon: PawPrint,
    icons: [
      'PawPrint', 'Dog', 'Cat', 'Bird', 'Fish', 'Bone', 'TreePine', 
      'Trees', 'Flower2', 'Leaf', 'Sun', 'Moon', 'CloudRain', 'Wind', 
      'Mountain', 'Tent'
    ]
  },
  {
    id: 'symbols',
    label: 'Général & Symboles',
    icon: Sparkles,
    icons: [
      'Star', 'CircleDot', 'CheckCircle2', 'AlertCircle', 'HelpCircle', 
      'Info', 'Lock', 'Unlock', 'Bell', 'Bookmark', 'MessageSquare', 
      'Send', 'Share2', 'Compass', 'Pin', 'Folder', 'Lightbulb', 'Award',
      'Clock', 'Calendar', 'History'
    ]
  }
];

// =========================================================================
// 2. STOCKAGE ET RÉSOLUTION DES ICÔNES ET COULEURS DE LA BDD
// =========================================================================
let globalCustomIconsMap = {};
let globalCustomColorsMap = {};

export const setGlobalCustomIconsMap = (iconsMap = {}, colorsMap = {}) => {
  // Normalisation des icônes
  const normalizedIcons = {};
  if (iconsMap && typeof iconsMap === 'object') {
    Object.entries(iconsMap).forEach(([key, iconName]) => {
      if (key) {
        normalizedIcons[key] = iconName;
        normalizedIcons[key.trim().toLowerCase()] = iconName;
        normalizedIcons[getCleanCategoryName(key).toLowerCase()] = iconName;
      }
    });
  }
  globalCustomIconsMap = normalizedIcons;

  // Normalisation des couleurs
  const normalizedColors = {};
  if (colorsMap && typeof colorsMap === 'object') {
    Object.entries(colorsMap).forEach(([key, colorHex]) => {
      if (key) {
        normalizedColors[key] = colorHex;
        normalizedColors[key.trim().toLowerCase()] = colorHex;
        normalizedColors[getCleanCategoryName(key).toLowerCase()] = colorHex;
      }
    });
  }
  globalCustomColorsMap = normalizedColors;
};

// 💡 La couleur de la BDD (customColor) a priorité absolue si elle existe
export const getCategoryIconInfo = (categoryName) => {
  if (!categoryName) return { icon: Tag, iconName: 'Tag', hex: '#94a3b8' };

  const clean = getCleanCategoryName(categoryName).trim();
  const cleanLower = clean.toLowerCase();

  // 1. Recherche BDD
  const iconKey = globalCustomIconsMap[clean] || 
                  globalCustomIconsMap[cleanLower] || 
                  globalCustomIconsMap[categoryName] || 
                  globalCustomIconsMap[categoryName?.toLowerCase()?.trim()];

  const customColor = globalCustomColorsMap[clean] || 
                      globalCustomColorsMap[cleanLower] || 
                      globalCustomColorsMap[categoryName] || 
                      globalCustomColorsMap[categoryName?.toLowerCase()?.trim()];

  // 2. Règles thématiques par mot-clé (gardent leurs vraies couleurs)
  const lower = cleanLower;
  let rule = null;

  if (lower.includes('virement reçu') || lower.includes('virements reçus') || lower.includes('virement recu') || lower.includes('virements recus')) {
    rule = { icon: ArrowDownLeft, iconName: 'ArrowDownLeft', hex: '#34d399' };
  } else if (lower.includes('virement envoyé') || lower.includes('virements envoyés') || lower.includes('virement envoye') || lower.includes('virements envoyes')) {
    rule = { icon: Send, iconName: 'Send', hex: '#fb7185' };
  } else if (lower.includes('compte commun')) {
    rule = { icon: Users2, iconName: 'Users2', hex: '#818cf8' };
  } else if (lower.includes('vers') || lower.includes('transfert interne')) {
    rule = { icon: ArrowRightLeft, iconName: 'ArrowRightLeft', hex: '#a78bfa' };
  } else if (lower.includes('chômage') || lower.includes('chomage')) {
    rule = { icon: HandCoins, iconName: 'HandCoins', hex: '#fbbf24' };
  } else if (lower.includes('cotisation bancaire') || lower.includes('cotisations bancair')) {
    rule = { icon: Percent, iconName: 'Percent', hex: '#f87171' };
  } else if (lower.includes('dépôt d\'espèce') || lower.includes('depot d\'espece') || lower.includes('dépôt') || lower.includes('espece') || lower.includes('retrait')) {
    rule = { icon: Banknote, iconName: 'Banknote', hex: '#34d399' };
  } else if (lower.includes('habillement') || lower.includes('vetement') || lower.includes('habit')) {
    rule = { icon: Shirt, iconName: 'Shirt', hex: '#f472b6' };
  } else if (lower.includes('impôt') || lower.includes('impot') || lower.includes('taxe') || lower.includes('ursaaf') || lower.includes('urssaf')) {
    rule = { icon: Scale, iconName: 'Scale', hex: '#f87171' };
  } else if (lower.includes('médecin') || lower.includes('medecin') || lower.includes('santé') || lower.includes('sante') || lower.includes('docteur')) {
    rule = { icon: Stethoscope, iconName: 'Stethoscope', hex: '#fb7185' };
  } else if (lower.includes('mutuelle')) {
    rule = { icon: HeartPulse, iconName: 'HeartPulse', hex: '#fb7185' };
  } else if (lower.includes('pharmacie')) {
    rule = { icon: Pill, iconName: 'Pill', hex: '#f87171' };
  } else if (lower.includes('péage') || lower.includes('peage')) {
    rule = { icon: Milestone, iconName: 'Milestone', hex: '#22d3ee' };
  } else if (lower.includes('train') || lower.includes('sncf') || lower.includes('ter')) {
    rule = { icon: Train, iconName: 'Train', hex: '#60a5fa' };
  } else if (lower.includes('parking')) {
    rule = { icon: CircleParking, iconName: 'CircleParking', hex: '#60a5fa' };
  } else if (lower.includes('blablacar') || lower.includes('covoiturage')) {
    rule = { icon: Users2, iconName: 'Users2', hex: '#2dd4bf' };
  } else if (lower.includes('auto') || lower.includes('voiture')) {
    rule = { icon: Car, iconName: 'Car', hex: '#60a5fa' };
  } else if (lower.includes('carburant') || lower.includes('essence') || lower.includes('diesel')) {
    rule = { icon: Fuel, iconName: 'Fuel', hex: '#facc15' };
  } else if (lower.includes('frais bancaire')) {
    rule = { icon: Landmark, iconName: 'Landmark', hex: '#94a3b8' };
  } else if (lower.includes('loyer')) {
    rule = { icon: Key, iconName: 'Key', hex: '#60a5fa' };
  } else if (lower.includes('electricité') || lower.includes('electricite') || lower.includes('edf')) {
    rule = { icon: Zap, iconName: 'Zap', hex: '#fcd34d' };
  } else if (lower.includes('eau')) {
    rule = { icon: Droplets, iconName: 'Droplets', hex: '#22d3ee' };
  } else if (lower.includes('assurance') || lower.includes('maison') || lower.includes('charges appart') || lower.includes('logement')) {
    rule = { icon: Home, iconName: 'Home', hex: '#38bdf8' };
  } else if (lower.includes('ameublement')) {
    rule = { icon: Armchair, iconName: 'Armchair', hex: '#38bdf8' };
  } else if (lower.includes('salaire') || lower.includes('paie')) {
    rule = { icon: Briefcase, iconName: 'Briefcase', hex: '#34d399' };
  } else if (lower.includes('prime')) {
    rule = { icon: Coins, iconName: 'Coins', hex: '#34d399' };
  } else if (lower.includes('remboursement')) {
    rule = { icon: Receipt, iconName: 'Receipt', hex: '#2dd4bf' };
  } else if (lower.includes('aliment') || lower.includes('course') || lower.includes('superm')) {
    rule = { icon: ShoppingCart, iconName: 'ShoppingCart', hex: '#fbbf24' };
  } else if (lower.includes('resto') || lower.includes('restaurant') || lower.includes('uber eat') || lower.includes('bar')) {
    rule = { icon: Utensils, iconName: 'Utensils', hex: '#fb923c' };
  } else if (lower.includes('shopping')) {
    rule = { icon: ShoppingBag, iconName: 'ShoppingBag', hex: '#f472b6' };
  } else if (lower.includes('coiffeur')) {
    rule = { icon: Scissors, iconName: 'Scissors', hex: '#fb7185' };
  } else if (lower.includes('cosmétique') || lower.includes('cosmetique')) {
    rule = { icon: Sparkles, iconName: 'Sparkles', hex: '#f472b6' };
  } else if (lower.includes('jeu') || lower.includes('gaming')) {
    rule = { icon: Gamepad2, iconName: 'Gamepad2', hex: '#c084fc' };
  } else if (lower.includes('brico') || lower.includes('location matériel')) {
    rule = { icon: Wrench, iconName: 'Wrench', hex: '#f59e0b' };
  } else if (lower.includes('transport') || lower.includes('bus')) {
    rule = { icon: Bus, iconName: 'Bus', hex: '#22d3ee' };
  } else if (lower.includes('internet') || lower.includes('box')) {
    rule = { icon: Wifi, iconName: 'Wifi', hex: '#38bdf8' };
  } else if (lower.includes('voyage') || lower.includes('vacance')) {
    rule = { icon: Plane, iconName: 'Plane', hex: '#22d3ee' };
  } else if (lower.includes('cadeau') || lower.includes('donation') || lower.includes('don')) {
    rule = { icon: Gift, iconName: 'Gift', hex: '#f472b6' };
  } else if (lower.includes('sport')) {
    rule = { icon: Dumbbell, iconName: 'Dumbbell', hex: '#fbbf24' };
  } else if (lower.includes('concert')) {
    rule = { icon: Music, iconName: 'Music', hex: '#c084fc' };
  } else if (lower.includes('loisir')) {
    rule = { icon: Ticket, iconName: 'Ticket', hex: '#e879f9' };
  } else if (lower.includes('animaux') || lower.includes('chat') || lower.includes('chien')) {
    rule = { icon: PawPrint, iconName: 'PawPrint', hex: '#f59e0b' };
  } else if (lower.includes('epargne') || lower.includes('épargne')) {
    rule = { icon: PiggyBank, iconName: 'PiggyBank', hex: '#34d399' };
  // 💡 Règle explicite pour "Autre" avec le point d'interrogation
  } else if (lower.includes('autre') || lower.includes('inconnu')) {
    rule = { icon: HelpCircle, iconName: 'HelpCircle', hex: '#94a3b8' };
  } else {
    rule = { icon: HelpCircle, iconName: 'HelpCircle', hex: '#94a3b8' };
  }

  // Prévisualisation directe si le nom est un nom d'icône Lucide
  const iconCollection = icons || LucideIcons;
  if (iconCollection && iconCollection[categoryName]) {
    return { 
      icon: iconCollection[categoryName], 
      iconName: categoryName,
      hex: customColor || '#818cf8' 
    };
  }

  // 3. Détermination finale :
  const finalIconName = (iconKey && iconKey.toLowerCase() !== 'tag') ? iconKey : rule.iconName;
  // 💡 PRIORITÉ ABSOLUE : Si customColor est présente en BDD, on l'utilise sans condition !
  const finalHex = customColor || rule.hex || '#818cf8';

  return {
    icon: getLucideIcon(finalIconName),
    iconName: finalIconName,
    hex: finalHex
  };
};

// 💡 Composant appliquant la couleur directement sur le prop 'color' de Lucide
export const CategoryIcon = ({ name, size = 14, className = "", color: propColor, style = {} }) => {
  const { icon: IconComponent, hex } = getCategoryIconInfo(name);
  // 💡 Utilise HelpCircle si aucune icône n'est trouvée
  const FinalIcon = IconComponent || HelpCircle;
  const effectiveColor = propColor || style?.color || hex;

  return (
    <FinalIcon 
      size={size} 
      color={effectiveColor} 
      className={`shrink-0 ${className}`} 
      style={{ ...style, color: effectiveColor }} 
    />
  );
};

// =========================================================================
// 4. LE SÉLECTEUR D'ICÔNES (POPOVER)
// =========================================================================
export function LucideIconPicker({ selectedIcon, onSelectIcon, onClose }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [hoveredIcon, setHoveredIcon] = useState(null);

  const iconCollection = icons || LucideIcons;

  const filteredIcons = useMemo(() => {
    let list = [];
    if (activeCategory === 'all') {
      const set = new Set();
      ICON_CATEGORIES.forEach(c => c.icons.forEach(i => set.add(i)));
      list = Array.from(set);
    } else {
      const cat = ICON_CATEGORIES.find(c => c.id === activeCategory);
      list = cat ? cat.icons : [];
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return list.filter(iconName => iconName.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search]);

  return (
    <>
      <div className="fixed inset-0 z-[100]" onClick={onClose} />

      <div 
        onClick={e => e.stopPropagation()} 
        className="absolute top-14 left-0 z-[101] w-80 bg-[#141417] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-3 backdrop-blur-2xl flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150 select-none text-left"
      >
        <div className="relative flex items-center bg-black/40 rounded-xl border border-white/10 px-2.5 py-1.5 focus-within:border-indigo-500/50 transition-colors">
          <Search size={13} className="text-white/30 shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une icône..."
            className="bg-transparent border-none outline-none text-[11px] font-bold text-white placeholder:text-white/20 w-full pl-2 pr-4"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 border-b border-white/5 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveCategory('all'); setSearch(''); }}
            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap shrink-0 ${
              activeCategory === 'all' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-white/30 hover:text-white hover:bg-white/5'
            }`}
          >
            Tous
          </button>
          {ICON_CATEGORIES.map(cat => {
            const IconCmp = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => { setActiveCategory(cat.id); setSearch(''); }}
                title={cat.label}
                className={`p-1.5 rounded-lg transition-all shrink-0 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-white/30 hover:text-white hover:bg-white/5'
                }`}
              >
                <IconCmp size={13} />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-6 gap-1.5 max-h-52 overflow-y-auto custom-scrollbar p-1">
          {filteredIcons.length > 0 ? (
            filteredIcons.map(iconName => {
              const IconCmp = iconCollection[iconName];
              if (!IconCmp) return null;
              const isCurrent = selectedIcon === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => {
                    onSelectIcon(iconName);
                    onClose();
                  }}
                  onMouseEnter={() => setHoveredIcon(iconName)}
                  onMouseLeave={() => setHoveredIcon(null)}
                  title={iconName}
                  className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent 
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/40 scale-105' 
                      : 'bg-white/[0.02] text-white/50 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95'
                  }`}
                >
                  <IconCmp size={16} />
                </button>
              );
            })
          ) : (
            <div className="col-span-6 py-6 text-center text-white/20 text-[10px] uppercase font-bold">
              Aucune icône trouvée
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[8px] font-mono text-white/30 px-1">
          <span className="truncate">
            {hoveredIcon ? `Nom: ${hoveredIcon}` : `Sélectionné: ${selectedIcon || 'Tag'}`}
          </span>
          <span className="font-bold text-indigo-400">{filteredIcons.length} icônes</span>
        </div>
      </div>
    </>
  );
}