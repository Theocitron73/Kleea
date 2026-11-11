// L'analyse par catégorie du Flux mensuel : barres classées, objectif budgétaire, masquage et retour.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession, UTILISATEUR } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };

test('les dépenses du mois forment un graphique en barres, avec l’objectif budgétaire sur la barre', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await brancherApi(page);
  await page.route(/api\.kleea\.test\/get-budgets\//, (route) => route.fulfill({
    status: 200, headers: ENTETES, contentType: 'application/json',
    body: JSON.stringify([{ id: 1, nom: 'Courses', somme: 10, mois: 'Novembre', annee: 2026, compte: 'tous', utilisateur: UTILISATEUR, type: 'Categorie' }]),
  }));
  await ouvrirSession(page);
  await page.goto('/');
  await page.locator('button[title="Catégories"]:visible').first().click({ timeout: 30_000 });

  const graphique = page.getByRole('img', { name: /^Dépenses du mois par catégorie/ }).locator('visible=true');
  await expect(graphique).toHaveAttribute('aria-label', /Logement 800 €.*Courses 13 €/);
  const barres = graphique.locator('.recharts-bar-rectangle');
  await expect(barres).toHaveCount(3);
  // Courses : 12,50 € pour un objectif de 10 €, avec son repère.
  await expect(graphique).toContainText('13 € / 10 €');
  await expect(graphique.locator('title', { hasText: 'Objectif : 10 €' })).toHaveCount(1);
  await page.screenshot({ path: 'test-results/analyse-categories.png' });

  await barres.nth(2).locator('rect').first().click();
  await expect(barres).toHaveCount(2);
  const masquees = page.getByLabel('Catégories masquées').locator('visible=true');
  await masquees.getByRole('button', { name: /Courses/ }).click();
  await expect(barres).toHaveCount(3);
  expect(erreurs).toEqual([]);
});
