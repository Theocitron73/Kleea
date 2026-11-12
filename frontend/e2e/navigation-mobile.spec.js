// Navigation sur téléphone : barre du haut, quatre onglets libellés et un panneau « Plus » pour le reste.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const barre = (page) => page.locator('.barre-onglets-mobile');
const plus = (page) => page.getByRole('dialog', { name: 'Plus' });

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await brancherApi(page);
  await ouvrirSession(page);
  await page.goto('/');
  await expect(barre(page).getByRole('button', { name: 'Dashboard' })).toBeVisible({ timeout: 30_000 });
  return erreurs;
}

const largeurDePage = (page) => page.evaluate(() => document.documentElement.scrollWidth);

test('les onglets ont un libellé et la page ne déborde pas', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await expect(barre(page).getByRole('button')).toHaveText(['Dashboard', 'Prévisionnel', 'Gérer', 'Comptes', 'Plus']);
  for (const nom of ['Prévisionnel', 'Gérer', 'Comptes', 'Dashboard']) {
    await barre(page).getByRole('button', { name: nom }).click();
    await expect(barre(page).getByRole('button', { name: nom })).toHaveAttribute('aria-current', 'page');
    expect(await largeurDePage(page), nom).toBeLessThanOrEqual(390);
  }
  // La déconnexion n'est plus à portée d'un appui accidentel dans la barre.
  await expect(barre(page).getByRole('button', { name: /déconnexion/i })).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('« Plus » ouvre les autres pages, le profil et les widgets', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await barre(page).getByRole('button', { name: 'Plus' }).click();
  await expect(plus(page).getByRole('button', { name: 'Déconnexion' })).toBeVisible();

  await plus(page).getByRole('button', { name: 'Importer' }).click();
  await expect(plus(page)).toHaveCount(0);
  await expect(barre(page).getByRole('button', { name: 'Plus' })).toHaveAttribute('aria-current', 'page');
  expect(await largeurDePage(page)).toBeLessThanOrEqual(390);

  await barre(page).getByRole('button', { name: 'Plus' }).click();
  await plus(page).getByRole('button', { name: /Mon profil/ }).click();
  await expect(page.getByRole('heading', { name: 'Ma sauvegarde' })).toBeVisible();

  await barre(page).getByRole('button', { name: 'Plus' }).click();
  await plus(page).getByRole('button', { name: 'Simulateur Prorata' }).click();
  const fenetre = page.locator('.fenetre-widget');
  await expect(fenetre).toBeVisible();
  const cadre = await fenetre.boundingBox();
  expect(cadre.x).toBeGreaterThanOrEqual(0);
  expect(cadre.x + cadre.width).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'Fermer le widget' }).click();
  await expect(fenetre).toHaveCount(0);

  await barre(page).getByRole('button', { name: 'Plus' }).click();
  await page.keyboard.press('Escape');
  await expect(plus(page)).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
