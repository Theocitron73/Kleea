import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

// 1. Intercepteur de REQUÊTE : Injecte le Token s'il existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. Intercepteur de RÉPONSE : Déconnexion propre SANS BOUCLE INFINIE
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      // 🟢 CONDITION CLÉ : On ne recharge QUE si l'utilisateur avait un token enregistré
      // Si le token est déjà absent, on NE RECHARGE PAS (évite la boucle infinie)
      const hadToken = localStorage.getItem('token');
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (hadToken) {
        console.warn("Session expirée -> Redirection connexion");
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export default api;