import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx' 
// 💡 Importez votre ToastProvider (adaptez le chemin si besoin)
import ToastProvider from './components/ToastProvider.jsx' // ou './components/ToastProvider.jsx' si vous utilisez Sonner

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    {/* 💡 Monté une seule fois pour toute l'application */}
    <ToastProvider />
  </StrictMode>,
)