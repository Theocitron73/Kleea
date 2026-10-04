import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Met à jour automatiquement le cache dès qu'une nouvelle version est déployée
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo_isa.png'],
      manifest: {
        name: 'Kleea - Gestion Financière',
        short_name: 'Kleea',
        description: 'Gestion de patrimoine privé, budgets, prévisions et comptes partagés.',
        theme_color: '#152c48', // Couleur de la barre d'état système
        background_color: '#0a0a0a', // Couleur du fond de démarrage (Splash Screen)
        display: 'standalone', // Supprime la barre d'URL du navigateur
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Permet aux icônes Android de s'adapter aux formes rondes/carrées
          }
        ]
      },
      workbox: {
        // Met en cache les fichiers statiques de base pour un chargement immédiat
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ]
});