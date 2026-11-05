import api from '../axios';
import { toast } from 'sonner';

// Chargement et sauvegarde du thème.
export default function useThemeUtilisateur({ setUserTheme, user }) {
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
        if (resTheme.data.secondary_color) {
          document.documentElement.style.setProperty('--secondary', resTheme.data.secondary_color);
        } else {
          document.documentElement.style.removeProperty('--secondary');
        }
        document.documentElement.style.setProperty('--text-main', resTheme.data.text_main);
        document.documentElement.style.setProperty('--radius', resTheme.data.radius);
        document.documentElement.style.setProperty('--glass-blur', resTheme.data.glass_blur || '12px');
        document.documentElement.style.setProperty('--glass-bg', resTheme.data.glass_bg || 'color-mix(in srgb, var(--text-main) 3%, transparent)');

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
      // Lue sur le style en ligne : sans choix explicite, la secondaire reste dérivée de la primaire.
      secondary_color: document.documentElement.style.getPropertyValue('--secondary').trim() || null,
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

  return { fetchUserTheme, handleSaveThemeSQL, updateThemeLive };
}
