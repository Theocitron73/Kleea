import axios from 'axios';

const api = axios.create({
  // Vite expose les variables via import.meta.env
  baseURL: import.meta.env.VITE_API_URL,
});

export default api;