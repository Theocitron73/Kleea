import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 🟢 1. Augmente la limite de taille autorisée à 5 Mo
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ],
  // 🟢 2. Découpage en sous-fichiers légers (évite les fichiers de +3 Mo)
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