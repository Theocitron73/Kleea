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
const ICON_CATEGORIES = [
  {
    id: 'people',
    label: 'Famille, Couple & Social',
    icon: Users,
    icons: [
      'Users', 'UsersRound', 'User', 'UserRound', 'UserPlus', 'UserCheck', 'UserMinus', 'UserX', 'UserCog',
      'Heart', 'HeartHandshake', 'Handshake', 'HandHeart', 'Baby', 'PersonStanding',
      'Smile', 'SmilePlus', 'Laugh', 'PartyPopper', 'Sparkles', 'Gift', 'Cake', 'CakeSlice',
      'Contact', 'ContactRound', 'MessagesSquare', 'MessageCircle', 'MessageSquare', 'Speech',
      'Camera', 'Share2', 'IdCard', 'BellRing'
    ]
  },
  {
    id: 'transport',
    label: 'Transports & Véhicules',
    icon: Car,
    icons: [
      'Car', 'CarFront', 'CarTaxiFront', 'Truck', 'Bus', 'BusFront', 
      'Train', 'TrainFront', 'TrainTrack', 'TramFront', 'TrainFrontTunnel',
      'Bike', 'Plane', 'PlaneTakeoff', 'PlaneLanding', 'Ship', 'Sailboat', 'Anchor',
      'Fuel', 'Gauge', 'CircleParking', 'CircleParkingOff', 'Milestone', 'Navigation', 'Navigation2', 
      'Compass', 'MapPin', 'MapPinned', 'Map', 'Route', 'Rocket', 'CableCar', 
      'Ticket', 'Tickets', 'Footprints', 'Luggage'
    ]
  },
  {
    id: 'food',
    label: 'Alimentation & Sorties',
    icon: Utensils,
    icons: [
      'Utensils', 'UtensilsCrossed', 'Pizza', 'Coffee', 'Wine', 'Beer', 'Martini', 'GlassWater',
      'CupSoda', 'Cake', 'CakeSlice', 'Cookie', 'Donut', 'Croissant', 'Sandwich',
      'Apple', 'Banana', 'Carrot', 'Citrus', 'Cherry', 'Grape', 'Salad', 'Soup',
      'Fish', 'Egg', 'EggFried', 'Beef', 'Drumstick', 'Popcorn', 'Candy', 'CandyCane',
      'IceCream', 'IceCreamCone', 'Milk', 'Nut', 'ChefHat',
      'ShoppingBag', 'ShoppingCart', 'ShoppingBasket', 'Store'
    ]
  },
  {
    id: 'home',
    label: 'Logement, Maison & Énergie',
    icon: Home,
    icons: [
      'Home', 'Building', 'Building2', 'Castle', 'Warehouse', 'DoorClosed', 'DoorOpen', 'Key', 'KeyRound',
      'Armchair', 'Bed', 'BedDouble', 'BedSingle', 'Bath', 'ShowerHead', 'Couch', 'Sofa',
      'Lamp', 'LampDesk', 'LampCeiling', 'LampFloor', 'Tv', 'WashingMachine', 'Refrigerator', 'Fan', 'Heater', 'AirVent', 'Blinds',
      'Droplets', 'Droplet', 'Flame', 'Zap', 'Plug', 'Plug2', 'PlugZap',
      'Wrench', 'Hammer', 'Paintbrush', 'PaintBucket', 'Construction',
      'Boxes', 'Trash2', 'ShieldCheck', 'Fence'
    ]
  },
  {
    id: 'shopping',
    label: 'Shopping, Mode & Cadeaux',
    icon: ShoppingBag,
    icons: [
      'ShoppingBag', 'ShoppingCart', 'ShoppingBasket', 'Store', 'Tag', 'Tags',
      'Shirt', 'Watch', 'Glasses', 'Gem', 'Crown', 'Gift', 'Package', 'PackagePlus', 'PackageCheck', 'PackageOpen', 'Box',
      'Footprints', 'Luggage', 'Sparkles', 'Scissors', 'Barcode', 
      'Receipt', 'ReceiptEuro', 'ReceiptText', 'Percent', 'BadgePercent', 'BadgePlus'
    ]
  },
  {
    id: 'finance',
    label: 'Finance, Banque & Travail',
    icon: Briefcase,
    icons: [
      'Briefcase', 'BriefcaseBusiness', 'Wallet', 'WalletCards', 'Landmark', 'Banknote', 
      'Coins', 'PiggyBank', 'CreditCard', 'Receipt', 'ReceiptEuro', 'ReceiptText', 
      'Scale', 'TrendingUp', 'TrendingDown', 'ChartLine', 'ChartBar', 'ChartPie', 'ChartCandlestick',
      'Percent', 'BadgePercent', 'Calculator', 'FileText', 'FileSpreadsheet',
      'DollarSign', 'Euro', 'PoundSterling', 'HandCoins', 
      'ArrowRightLeft', 'ArrowDownLeft', 'ArrowUpRight', 'Send', 'Vault', 'Shield', 'ShieldCheck', 'CircleDollarSign'
    ]
  },
  {
    id: 'leisure',
    label: 'Loisirs, Sport & Culture',
    icon: Gamepad2,
    icons: [
      'Gamepad2', 'Gamepad', 'Film', 'Clapperboard', 'Video', 'Camera',
      'Music', 'Music2', 'Music3', 'Music4', 'Headphones', 'Mic', 'Mic2', 'Guitar', 'Piano', 'Radio', 'CassetteTape', 'Disc', 'Disc3',
      'Trophy', 'Medal', 'Award', 'Dumbbell', 
      'Dice1', 'Dice2', 'Dice3', 'Dice4', 'Dice5', 'Dice6', 'Dices', 
      'Palette', 'PartyPopper', 'Theater', 'Tv2', 'Ticket', 'Tickets', 
      'Tent', 'Mountain', 'MountainSnow', 'FerrisWheel', 'RollerCoaster', 'Crosshair'
    ]
  },
  {
    id: 'tech',
    label: 'Tech, Médias & Réseaux',
    icon: Smartphone,
    icons: [
      'Smartphone', 'SmartphoneCharging', 'SmartphoneNfc', 'Tablet', 'Laptop', 'Monitor', 'MonitorSmartphone', 'MonitorSpeaker',
      'Wifi', 'Cpu', 'HardDrive', 'HardDriveDownload', 'HardDriveUpload', 'BatteryCharging', 'Battery', 'BatteryFull', 'BatteryLow',
      'Server', 'Bluetooth', 'Cloud', 'CloudDownload', 'CloudUpload', 'QrCode', 'Printer', 
      'Bot', 'Code', 'Terminal', 'Radio', 'Tv', 'Keyboard', 'Mouse', 'Webcam', 'Speaker', 'Headset', 'RadioTower'
    ]
  },
  {
    id: 'health',
    label: 'Santé, Soins & Bien-être',
    icon: HeartPulse,
    icons: [
      'Stethoscope', 'HeartPulse', 'Heart', 'Pill', 'Pills', 'Activity', 'Eye', 'Glasses', 
      'ShieldAlert', 'Cross', 'Syringe', 'Bandage', 'Thermometer', 'Accessibility', 
      'Smile', 'HeartHandshake', 'Hospital', 'Ambulance', 'Dna', 'Brain', 'Bone'
    ]
  },
  {
    id: 'education',
    label: 'Études & Enfants',
    icon: BookOpen,
    icons: [
      'GraduationCap', 'School', 'Book', 'BookOpen', 'BookOpenText', 'BookUser', 'BookMarked', 'BookCopy',
      'Library', 'Backpack', 'Pencil', 'PencilLine', 'PencilRuler', 'PenTool', 'Pen', 'Eraser', 'Ruler', 'Compass', 'Atom'
    ]
  },
  {
    id: 'nature',
    label: 'Animaux & Nature',
    icon: PawPrint,
    icons: [
      'PawPrint', 'Dog', 'Cat', 'Bird', 'Fish', 'Bone', 'Bug', 'Snail',
      'TreePine', 'Trees', 'TreeDeciduous', 'Flower2', 'Flower', 'Leaf', 'Sprout',
      'Sun', 'SunMedium', 'Moon', 'CloudRain', 'CloudSun', 'CloudSnow', 'CloudLightning', 'Wind',
      'Mountain', 'MountainSnow', 'Tent'
    ]
  },
  {
    id: 'symbols',
    label: 'Général & Symboles',
    icon: Sparkles,
    icons: [
      'Star', 'StarHalf', 'CircleDot', 'CheckCircle2', 'Check', 'AlertCircle', 'AlertTriangle', 'HelpCircle', 
      'Info', 'Lock', 'Unlock', 'Bell', 'Bookmark', 'MessageSquare', 'Send', 'Share2', 
      'Compass', 'Pin', 'Folder', 'FolderPlus', 'FolderOpen', 'Lightbulb', 'Award', 'Target',
      'Clock', 'Calendar', 'CalendarDays', 'CalendarCheck', 'History', 'Search', 'Filter', 'SlidersHorizontal', 'ShieldCheck'
    ]
  }
];
// =========================================================================
// 2. MÉMOIRE GLOBALE RÉSISTANTE AU RECHARGEMENT VITE (HMR)
// =========================================================================
if (typeof window !== 'undefined') {
  window.__KLEEA_ICONS_MAP__ = window.__KLEEA_ICONS_MAP__ || {};
  window.__KLEEA_COLORS_MAP__ = window.__KLEEA_COLORS_MAP__ || {};
  window.__KLEEA_GROUPS_MAP__ = window.__KLEEA_GROUPS_MAP__ || {};
}

let globalCustomIconsMap = (typeof window !== 'undefined' && window.__KLEEA_ICONS_MAP__) || {};
let globalCustomColorsMap = (typeof window !== 'undefined' && window.__KLEEA_COLORS_MAP__) || {};
let globalCustomGroupsMap = (typeof window !== 'undefined' && window.__KLEEA_GROUPS_MAP__) || {};

export const setGlobalCustomIconsMap = (iconsMap = {}, colorsMap = {}, groupsMap = {}) => {
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

  const normalizedGroups = {};
  if (groupsMap && typeof groupsMap === 'object') {
    Object.entries(groupsMap).forEach(([key, grp]) => {
      if (key) {
        normalizedGroups[key] = grp;
        normalizedGroups[key.trim().toLowerCase()] = grp;
        normalizedGroups[getCleanCategoryName(key).toLowerCase()] = grp;
      }
    });
  }
  globalCustomGroupsMap = normalizedGroups;

  // 🟢 Sauvegarde persistante dans window pour résister aux modifications de code
  if (typeof window !== 'undefined') {
    window.__KLEEA_ICONS_MAP__ = normalizedIcons;
    window.__KLEEA_COLORS_MAP__ = normalizedColors;
    window.__KLEEA_GROUPS_MAP__ = normalizedGroups;
  }
};

// 🟢 Récupère le groupe sur-mesure défini par l'utilisateur (ou "Général")
export const getCategoryGroup = (name) => {
  if (!name) return 'Général';
  const clean = getCleanCategoryName(name).trim();
  return globalCustomGroupsMap[clean] || 
         globalCustomGroupsMap[clean.toLowerCase()] || 
         globalCustomGroupsMap[name] || 
         'Général';
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

// =========================================================================
// CALCULATEUR DE FOND DÉSATURÉ (HUE IDENTIQUE, SATURATION RÉDUITE)
// =========================================================================
export const getDesaturatedColor = (colorInput, saturationMultiplier = 0.80, alpha = 0.20) => {
  if (!colorInput || typeof colorInput !== 'string') {
    return {
      bg: 'rgba(148, 163, 184, 0.18)',
      border: 'rgba(148, 163, 184, 0.28)',
    };
  }

  let str = colorInput.trim();
  let r = 0, g = 0, b = 0;

  // 1. Déjà HSL / HSLA
  if (str.startsWith('hsl')) {
    const match = str.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%/);
    if (match) {
      const h = parseFloat(match[1]);
      const s = parseFloat(match[2]) * saturationMultiplier;
      const l = parseFloat(match[3]);
      return {
        bg: `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${alpha})`,
        border: `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.min(Math.round(l) + 12, 85)}%, ${alpha + 0.12})`,
      };
    }
  }

  // 2. Déjà RGB / RGBA
  if (str.startsWith('rgb')) {
    const match = str.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (match) {
      r = parseFloat(match[1]) / 255;
      g = parseFloat(match[2]) / 255;
      b = parseFloat(match[3]) / 255;
    }
  } else {
    // 3. HEX (#fff ou #ffffff)
    let c = str.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length === 6) {
      r = parseInt(c.substring(0, 2), 16) / 255;
      g = parseInt(c.substring(2, 4), 16) / 255;
      b = parseInt(c.substring(4, 6), 16) / 255;
    } else {
      return {
        bg: 'rgba(148, 163, 184, 0.18)',
        border: 'rgba(148, 163, 184, 0.28)',
      };
    }
  }

  // Conversion RGB -> HSL pour ajuster précisément la saturation
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hue = Math.round(h * 360);
  const desatS = Math.round(s * 100 * saturationMultiplier); // Saturation réduite de ~55%
  const light = Math.round(l * 100);

  return {
    bg: `hsla(${hue}, ${desatS}%, ${light}%, ${alpha})`,
    border: `hsla(${hue}, ${desatS}%, ${Math.min(light + 10, 80)}%, ${alpha + 0.12})`,
  };
};

// =========================================================================
// COMPOSANT CATEGORY ICON AVEC CARRÉ ARRONDI INTÉGRÉ
// =========================================================================
export const CategoryIcon = ({ 
  name, 
  size = 14, 
  className = "", 
  color: propColor, 
  style = {},
  showBg = true,
  bgRadius = "rounded-[28%]" // Courbe iOS / squircle élégante
}) => {
  const { icon: IconComponent, hex } = getCategoryIconInfo(name);
  const FinalIcon = IconComponent || HelpCircle;
  const effectiveColor = propColor || style?.color || hex;

  // Si on désactive explicitement le fond (showBg={false})
  if (!showBg) {
    return (
      <FinalIcon 
        size={size} 
        color={effectiveColor} 
        className={`shrink-0 ${className}`} 
        style={{ ...style, color: effectiveColor }} 
      />
    );
  }

  // Taille proportionnelle du carré en fonction de la taille de l'icône
  const padding = Math.max(3, Math.round(size * 0.28));
  const boxSize = size + (padding * 2);
  const { bg, border } = getDesaturatedColor(effectiveColor);

  return (
    <span 
      className={`inline-flex items-center justify-center shrink-0 ${bgRadius} border transition-all duration-200 select-none ${className}`}
      style={{
        width: `${boxSize}px`,
        height: `${boxSize}px`,
        minWidth: `${boxSize}px`,
        minHeight: `${boxSize}px`,
        backgroundColor: bg,
        borderColor: border,
        boxShadow: `0 2px 6px -2px ${bg}`,
        ...style,
      }}
    >
      <FinalIcon 
        size={size} 
        color={effectiveColor} 
        style={{ color: effectiveColor }} 
      />
    </span>
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