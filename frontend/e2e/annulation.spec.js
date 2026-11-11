// Bouton « Annuler » après une suppression ou un import, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function ouvrirGerer(page) {
  const suppressions = [];
  await brancherApi(page);
  await page.route('http://api.kleea.test/transactions/batch', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    suppressions.push(requete.postDataJSON());
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ status: 'success', deleted_count: 1 }) });
  });
  await ouvrirSession(page);
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click({ timeout: 30_000 });
  return suppressions;
}

async function supprimerLaPremiere(page) {
  await page.getByRole('region', { name: 'Opérations' }).locator('input[type="checkbox"]').locator('visible=true').nth(1).check();
  await page.getByRole('button', { name: /supprimer/i }).locator('visible=true').first().click();
}

test('annuler une suppression rend la transaction et n’appelle jamais le serveur', async ({ page }) => {
  const suppressions = await ouvrirGerer(page);
  const lignes = page.getByRole('region', { name: 'Opérations' }).locator('input[type="checkbox"]').locator('visible=true');
  const avant = await lignes.count();
  await supprimerLaPremiere(page);
  await expect(lignes).toHaveCount(avant - 1);
  await page.screenshot({ path: 'test-results/annulation.png' });
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(lignes).toHaveCount(avant);
  await page.clock.runFor(10_000);
  expect(suppressions).toEqual([]);
});

test('sans annulation, la suppression part à la fin du délai', async ({ page }) => {
  const suppressions = await ouvrirGerer(page);
  await supprimerLaPremiere(page);
  expect(suppressions).toEqual([]);
  await page.clock.runFor(8_100);
  await expect.poll(() => suppressions.length).toBe(1);
});
