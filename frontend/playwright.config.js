import { defineConfig } from '@playwright/test';

// Aucun navigateur à télécharger : Edge en local, et en CI le Google Chrome déjà installé sur les machines Ubuntu de GitHub
// (installer Chromium y passait par apt, qui bloquait parfois plus de 10 minutes).
const canal = process.env.CI ? 'chrome' : 'msedge';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    channel: canal,
    viewport: { width: 1440, height: 900 },
    timezoneId: 'Europe/Paris',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // L'application vise ainsi une adresse que les tests simulent : aucune requête ne part vers un vrai serveur.
    env: { VITE_API_URL: 'http://api.kleea.test' },
  },
});
