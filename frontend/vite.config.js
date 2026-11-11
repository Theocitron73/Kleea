import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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