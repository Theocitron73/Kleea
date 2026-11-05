import { useState } from 'react';
import { LayoutDashboard, ChartCandlestick, Settings2, FileUp, Wallet, Users2, Palette, FileText, CalendarDays, Truck } from 'lucide-react';

// Pages du menu selon le rôle et les pages masquées.
export default function useMenuNavigation({ userRole }) {
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
    } catch  {
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

  return { hiddenPages, setHiddenPages, visibleMenuItems };
}
