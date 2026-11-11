import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Date de la construction du site, affichée en bas du profil comme date de dernière mise à jour.
  define: { 'import.meta.env.VITE_DATE_MISE_A_JOUR': JSON.stringify(new Date().toISOString()) },
  plugins: [
    react(),
    VitePWA({
      // La nouvelle version attend que la page soit cachée pour s'appliquer : voir src/utils/miseAJour.js.
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo_isa.png'],
      manifest: {
        name: 'Kleea - Gestion Financière',
        short_name: 'Kleea',
        description: 'Gestion de patrimoine privé, budgets, prévisions et comptes partagés.',
        theme_color: '#152c48',
        background_color: '#0a0a0a',
        display: 'standalone',
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
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // La page elle-même n'est pas mise en cache d'avance : prise sur le réseau, elle annonce toujours la dernière version
        // dès l'ouverture du site. Le cache ne sert qu'hors ligne. Les fichiers JS et CSS, nommés par leur contenu, restent en cache.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null,
        runtimeCaching: [{
          urlPattern: ({ request }) => request.mode === 'navigate',
          handler: 'NetworkFirst',
          options: { cacheName: 'pages', networkTimeoutSeconds: 4 },
        }],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true, // Supprime les vieux bundles JS une fois la nouvelle version active
      }
    })
  ],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@dnd-kit')) return 'vendor-dnd';
            return 'vendor-libs';
          }
        }
      }
    }
  }
});