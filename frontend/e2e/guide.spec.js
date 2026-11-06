// Page Guide : parcours des premiers pas, chapitres, recherche et version publique.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

function surveiller(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  return erreurs;
}

async function ouvrirGuide(page) {
  await page.addInitScript(() => localStorage.setItem('hidden_menu_pages', '[]'));
  await ouvrirSession(page);
  await brancherApi(page);
  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: /^Guide$/i }).first().click({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Bien démarrer avec Kleea' })).toBeVisible();
}

test('la progression des premiers pas se coche et reste enregistrée', async ({ page }) => {
  const erreurs = surveiller(page);
  await ouvrirGuide(page);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Marquer comme fait' }).first().click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.reload();
  await page.locator('nav').getByRole('button', { name: /^Guide$/i }).first().click({ timeout: 30_000 });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  await page.getByRole('button', { name: 'Étape terminée' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  expect(erreurs).toEqual([]);
});

test('un bouton d’étape ouvre la page concernée', async ({ page }) => {
  await ouvrirGuide(page);
  await page.getByRole('button', { name: 'Ouvrir Comptes' }).first().click();
  await expect(page.getByText('Mes Comptes')).toBeVisible();
});

test('tous les chapitres s’ouvrent sans erreur', async ({ page }) => {
  const erreurs = surveiller(page);
  await ouvrirGuide(page);
  const sommaire = page.getByRole('navigation', { name: 'Sommaire du guide' });
  const chapitres = ['Comptes', 'Importer', 'Gérer', 'Dashboard', 'Prévisionnel', 'Épargne & Projets', 'Tricount', 'Profil & outils', 'Stream Deck', 'Questions fréquentes'];
  for (const titre of chapitres) {
    await sommaire.getByRole('button', { name: titre, exact: true }).click();
    await expect(page.getByRole('heading', { name: titre, level: 2 })).toBeVisible();
  }
  expect(erreurs).toEqual([]);
});

test('la recherche trouve une section et y mène', async ({ page }) => {
  await ouvrirGuide(page);
  await page.getByRole('searchbox', { name: 'Rechercher dans le guide' }).fill('diviser');
  await page.getByRole('button', { name: /Gérer.*Diviser une opération/ }).click();
  await expect(page.getByRole('heading', { name: 'Diviser une opération' })).toBeInViewport();
  await page.getByRole('searchbox', { name: 'Rechercher dans le guide' }).fill('mot-introuvable-xyz');
  await expect(page.getByRole('heading', { name: 'Aucun résultat' })).toBeVisible();
});

test('le guide public fonctionne sans compte et sans lien vers l’application', async ({ page }) => {
  const erreurs = surveiller(page);
  await brancherApi(page);
  await page.goto('/guide');
  await expect(page.getByRole('heading', { name: 'Bien démarrer avec Kleea' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /^Ouvrir/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Marquer comme fait' }).first().click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(erreurs).toEqual([]);
});

test('sur mobile, le guide reste lisible sans défilement horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await brancherApi(page);
  await page.goto('/guide');
  await expect(page.getByRole('heading', { name: 'Bien démarrer avec Kleea' })).toBeVisible({ timeout: 30_000 });
  const debordement = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(debordement).toBeLessThanOrEqual(0);
});
