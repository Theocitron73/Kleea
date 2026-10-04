import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 20000, // Évite de bloquer l'interface indéfiniment si le serveur dort (Neon/Render)
});

// 1. Intercepteur de REQUÊTE : Injecte le Token Bearer
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Intercepteur de RÉPONSE : Déconnexion propre, purge totale et gestion du pare-feu
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const currentPath = window.location.pathname;

    // A. Gestion du 401 (Session expirée ou Token invalide)
    const isLoginOrAuth = requestUrl.includes('/login') || requestUrl.includes('/register') || requestUrl.includes('/forgot-password');
    const isPublicPage = currentPath.startsWith('/shared-tricount') || currentPath.startsWith('/reset-password') || currentPath.startsWith('/guide');

    if (status === 401 && !isLoginOrAuth) {
      const hadToken = localStorage.getItem('token');

      // Purge STRICTE de toutes les données sensibles de session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('powens_user_token'); // 👈 Évite les fuites inter-comptes

      // On ne redirige que si l'utilisateur était connecté ET qu'il n'est pas sur une page publique
      if (hadToken && !isPublicPage) {
        console.warn("🔒 Session Kleea expirée. Redirection sécurisée vers la connexion...");
        window.location.href = '/';
      }
    }

    // B. Gestion du 403 (Pare-feu / Honeypot / Accès interdit)
    if (status === 403) {
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('bloquée')) {
        console.error("🚫 [SÉCURITÉ] Pare-feu Kleea déclenché : IP bloquée.");
      }
    }

    return Promise.reject(error);
  }
);

export default api;