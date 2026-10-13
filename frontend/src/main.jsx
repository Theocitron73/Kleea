import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx' 
import ToastProvider from './components/ToastProvider.jsx'

// 🟢 ENREGISTREMENT ET ACTUALISATION AUTOMATIQUE DU SERVICE WORKER
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(swScriptUrl, registration) {
    if (registration) {
      // 1. Vérifie s'il y a un nouveau build toutes les minutes si l'onglet reste ouvert
      setInterval(() => {
        registration.update();
      }, 60 * 1000);

      // 2. Vérifie dès que vous revenez sur l'onglet (focus)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update();
        }
      });
    }
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <ToastProvider />
  </StrictMode>,
)