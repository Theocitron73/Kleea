import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// 1. Intercepteur de REQUÊTE : Injecte le Token dans TOUTES les requêtes sortantes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Intercepteur de RÉPONSE : Déconnexion propre sans boucle infinie
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🟢 On n'efface PAS le token si l'erreur 401 vient de la tentative de connexion /login
    const isLoginRequest = error.config?.url?.includes('/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      console.warn("Session expirée ou token invalide -> Déconnexion");
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;