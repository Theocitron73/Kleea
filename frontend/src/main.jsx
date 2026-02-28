import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// 1. Importe App au lieu de FinanceApp
import App from './App.jsx' 

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* 2. Appelle App ici, c'est lui qui gérera l'aiguillage entre Login et Reset */}
    <App />
  </StrictMode>,
)