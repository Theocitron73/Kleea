// Recherche globale, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const fenetre = (page) => page.getByRole('dialog', { name: 'Recherche' });
const champ = (page) => page.getByRole('combobox', { name: /Rechercher une opération/ });

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await brancherApi(page);
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Rechercher' }).locator('visible=true').first().waitFor({ timeout: 30_000 });
  return erreurs;
}

test('Ctrl + K ouvre la recherche et Échap la ferme', async ({ page }) => {
  await ouvrir(page);
  await page.keyboard.press('Control+k');
  await expect(champ(page)).toBeFocused();
  await expect(fenetre(page).getByText('Saisissez au moins 2 lettres.')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(fenetre(page)).toBeHidden();
});

test('une opération d’un autre mois s’ouvre dans Gérer, à la bonne période', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await page.getByRole('button', { name: 'Rechercher' }).locator('visible=true').first().click();
  await champ(page).fill('RESTAU');
  await expect(fenetre(page).getByRole('option')).toHaveCount(1);
  // Pas collée au haut de l'écran : une règle CSS globale écrase le padding de ces fenêtres.
  expect((await fenetre(page).boundingBox()).y).toBeGreaterThan(80);
  await page.screenshot({ path: 'test-results/recherche-globale.png' });
  await page.keyboard.press('Enter');
  await expect(fenetre(page)).toBeHidden();
  await expect(page.getByText('Historique & Gestion')).toBeVisible();
  await expect(page.locator('input[value="Restaurant"]').locator('visible=true').or(page.getByText('Restaurant').locator('visible=true')).first()).toBeVisible();
  await expect(page.getByText('Boulangerie')).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('les flèches choisissent le résultat, et une catégorie filtre Gérer', async ({ page }) => {
  await ouvrir(page);
  await page.keyboard.press('Control+k');
  await champ(page).fill('cou');
  const options = fenetre(page).getByRole('option');
  await expect(options).toHaveText([/Courses/, /Compte courant/]);
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Historique & Gestion')).toBeVisible();
  await expect(page.getByText('Loyer')).toHaveCount(0);
});

test('un compte mène à la page Comptes', async ({ page }) => {
  await ouvrir(page);
  await page.keyboard.press('Control+k');
  await champ(page).fill('livret a');
  await fenetre(page).getByRole('option', { name: /Livret A/ }).click();
  await expect(page.getByRole('heading', { name: 'Mes Comptes' })).toBeVisible();
});

test('une recherche sans résultat le dit', async ({ page }) => {
  await ouvrir(page);
  await page.keyboard.press('Control+k');
  await champ(page).fill('zzzz');
  await expect(fenetre(page).getByText('Aucun résultat pour « zzzz ».')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(fenetre(page)).toBeVisible();
});

test('la recherche fonctionne sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await ouvrir(page);
  await page.getByRole('button', { name: 'Rechercher' }).locator('visible=true').first().click();
  await champ(page).fill('loyer');
  await expect(fenetre(page).getByRole('option', { name: /Loyer/ })).toBeVisible();
  await page.screenshot({ path: 'test-results/recherche-globale-mobile.png' });
});

test('avec plusieurs profils, le résultat s’ouvre sur le profil de son compte', async ({ page }) => {
  await brancherApi(page);
  // « Commun » passe en premier : c'est le profil que l'app choisit quand aucun n'est précisé.
  await page.route(/api\.kleea\.test\/config-comptes\//, (route) => route.fulfill({
    status: 200,
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    contentType: 'application/json',
    body: JSON.stringify([
      { compte: 'Compte courant', groupe: 'Testeur', solde: 1500, objectif: 0, couleur: '#4f46e5', taux: 0 },
      { compte: 'Livret A', groupe: 'Commun', solde: 5000, objectif: 0, couleur: '#10b981', taux: 1.5 },
    ]),
  }));
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Rechercher' }).locator('visible=true').first().waitFor({ timeout: 30_000 });
  const lignes = page.getByRole('region', { name: 'Opérations' }).locator('input[type="checkbox"]').locator('visible=true');

  await page.keyboard.press('Control+k');
  await champ(page).fill('restau');
  await fenetre(page).getByRole('option', { name: /Restaurant/ }).click();
  await expect(page.getByText('Historique & Gestion')).toBeVisible();
  await expect(lignes).toHaveCount(2); // La case « tout sélectionner » et l'opération.

  await page.keyboard.press('Control+k');
  await champ(page).fill('sorties');
  await fenetre(page).getByRole('option', { name: /Sorties/ }).click();
  await expect(lignes).toHaveCount(2);
});
