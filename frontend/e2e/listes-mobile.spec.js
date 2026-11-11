// Sur téléphone, Gérer et le Prévisionnel reprennent les lignes de l'ordinateur, en deux étages.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
const PREVISION = { id: 51, date: '2026-11-20', nom: '[PRÉVI] Courses de la semaine', montant: -95, categorie: 'Courses', compte: 'Compte courant', mois: 'Novembre', annee: 2026, actif: true };

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const modifications = page.modifications = [];
  await page.setViewportSize({ width: 390, height: 844 });
  await brancherApi(page);
  await page.route(/api\.kleea\.test\/api\/categories\//, (route) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ all: ['Salaire', 'Courses', 'Logement', 'Sorties', 'Loisirs'] }) }));
  await page.route(/api\.kleea\.test\/previsions\//, (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (requete.method() === 'PUT') modifications.push({ type: 'prevision', ...requete.postDataJSON() });
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(/\/ALL\//.test(requete.url()) ? [PREVISION] : []) });
  });
  await page.route(/api\.kleea\.test\/transactions\/\d+$/, (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    modifications.push({ type: 'operation', id: Number(requete.url().split('/').pop()), ...requete.postDataJSON() });
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
  });
  await ouvrirSession(page);
  await page.goto('/');
  return erreurs;
}

// Sur mobile, la navigation du bas n'a que des icônes : Prévisionnel est le deuxième bouton, Gérer le troisième.
const onglet = (page, rang) => page.locator('div.md\\:hidden.fixed.bottom-0 button').nth(rang).click({ timeout: 30_000 });

test('Gérer sur téléphone : lignes compactes, réglages dans un panneau', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 2);
  const liste = page.getByRole('region', { name: 'Opérations' }).locator('visible=true');
  await expect(liste.getByText('Mercredi 4 novembre')).toBeVisible();
  // L'icône sélectionne.
  await liste.getByRole('checkbox', { name: 'Sélectionner Boulangerie' }).click();
  await expect(liste.getByRole('checkbox', { name: 'Sélectionner Boulangerie' })).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: 'test-results/gerer-mobile.png' });
  // La ligne ouvre le panneau des réglages.
  await liste.getByRole('button', { name: 'Modifier Boulangerie' }).click();
  const panneau = page.getByRole('dialog', { name: 'Boulangerie' });
  await panneau.getByRole('textbox', { name: 'Catégorie de l’opération' }).click();
  await page.getByRole('listbox').getByText('Sorties', { exact: true }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ type: 'operation', id: 2, categorie: 'Sorties' });
  await page.screenshot({ path: 'test-results/gerer-mobile-panneau.png' });
  // « Montant et compte » ouvre la fenêtre complète.
  await panneau.getByRole('button', { name: 'Montant et compte' }).click();
  await expect(page.getByRole('dialog', { name: 'Boulangerie' })).toHaveCount(0);
  await expect(page.getByText('Montant').locator('visible=true').first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Prévisionnel sur téléphone : lignes compactes, réglages dans un panneau', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 1);
  const liste = page.getByRole('region', { name: 'Prévisions du mois' }).locator('visible=true');
  await expect(liste.getByText('Vendredi 20 novembre')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/previsionnel-mobile.png' });
  await liste.getByRole('button', { name: 'Modifier Courses de la semaine' }).click();
  const panneau = page.getByRole('dialog', { name: 'Courses de la semaine' });
  const montant = panneau.getByRole('spinbutton', { name: 'Montant prévu' });
  await montant.fill('-110');
  await montant.press('Enter');
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ type: 'prevision', montant: -110 });
  await page.screenshot({ path: 'test-results/previsionnel-mobile-panneau.png' });
  await page.keyboard.press('Escape');
  await expect(panneau).toHaveCount(0);
  expect(erreurs).toEqual([]);
});
