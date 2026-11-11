import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx' 
import ToastProvider from './components/ToastProvider.jsx'
import ErreurApplication from './components/ErreurApplication.jsx'
import { demarrerSuiviErreurs } from './utils/suiviErreurs'

demarrerSuiviErreurs();

// Nouvelle version : téléchargée en silence, appliquée quand la page passe en arrière-plan.
import { registerSW } from 'virtual:pwa-register';
import { appliquerQuandCachee } from './utils/miseAJour';

const mettreAJour = registerSW({
  immediate: true,
  onNeedRefresh() {
    appliquerQuandCachee(() => mettreAJour(true));
  },
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
    <ErreurApplication>
      <App />
    </ErreurApplication>
    <ToastProvider />
  </StrictMode>,
)