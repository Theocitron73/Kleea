// Le jeton de connexion ne reste plus dans le navigateur : une session d'avant le cookie HttpOnly y passe au chargement.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

test('une session d’avant le cookie passe dans le cookie, puis le jeton quitte le navigateur', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const conversions = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && r.url().endsWith('/api/sessions/cookie')) conversions.push(r.headers().authorization);
  });
  await brancherApi(page);
  await ouvrirSession(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('deja')) localStorage.setItem('token', 'ancien-jeton');
    sessionStorage.setItem('deja', '1');
  });
  await page.goto('/');
  await expect.poll(() => conversions, { timeout: 30_000 }).toEqual(['Bearer ancien-jeton']);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  // Rechargée, la page reste connectée sans jeton : seul le cookie porte la session.
  await page.reload();
  await expect(page.locator('nav').getByRole('button', { name: /^Comptes$/i }).first()).toBeVisible({ timeout: 30_000 });
  expect(conversions).toHaveLength(1);
  expect(erreurs).toEqual([]);
});
