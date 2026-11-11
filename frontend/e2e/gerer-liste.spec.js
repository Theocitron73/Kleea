// La liste des opérations de Gérer : regroupée par jour, modifiable depuis la ligne, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const PREVISION = { id: 50, date: '2026-11-03', nom: '[PRÉVI] Pain', montant: -15, categorie: 'Courses', compte: 'Compte courant', mois: 'Novembre', annee: 2026, actif: true };

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const modifications = page.modifications = [];
  await brancherApi(page);
  await page.route(/api\.kleea\.test\/api\/categories\//, (route) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ all: ['Salaire', 'Courses', 'Logement', 'Sorties', 'Loisirs', 'Virement interne'] }) }));
  await page.route(/api\.kleea\.test\/previsions\//, (route) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify([PREVISION]) }));
  await page.route(/api\.kleea\.test\/transactions\/\d+$/, (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    modifications.push({ id: Number(requete.url().split('/').pop()), ...requete.postDataJSON() });
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
  });
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click({ timeout: 30_000 });
  return erreurs;
}

const liste = (page) => page.getByRole('region', { name: 'Opérations' });
const ligne = (page, nom) => liste(page).locator('div.group').filter({ has: page.getByLabel(`Sélectionner ${nom}`) });

test('les opérations sont regroupées par jour, avec le total de chaque jour', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await expect(liste(page).getByText('Mercredi 4 novembre')).toBeVisible();
  await expect(liste(page).getByText('Mardi 3 novembre')).toBeVisible();
  await expect(liste(page)).toContainText('−1 100,00 €'); // Loyer et virement du 4.
  expect(erreurs).toEqual([]);
});

test('la catégorie se change en deux clics depuis la ligne', async ({ page }) => {
  await ouvrir(page);
  await ligne(page, 'Boulangerie').getByRole('textbox', { name: 'Catégorie de l’opération' }).click();
  await page.getByRole('listbox').getByText('Sorties', { exact: true }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 2, categorie: 'Sorties' });
});

test('une opération se relie à une prévision du mois depuis sa pastille', async ({ page }) => {
  await ouvrir(page);
  await ligne(page, 'Boulangerie').getByRole('textbox', { name: 'Prévision reliée' }).click();
  await page.getByRole('listbox').getByText(/Pain/).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 2, prevision_id: 50 });
});

test('le filtre Revenus ne garde que les revenus', async ({ page }) => {
  await ouvrir(page);
  await liste(page).getByRole('button', { name: 'Revenus' }).click();
  await expect(page.getByLabel('Sélectionner Salaire')).toBeVisible();
  await expect(page.getByLabel('Sélectionner Boulangerie')).toHaveCount(0);
});

test('la barre de sélection change la catégorie de plusieurs opérations', async ({ page }) => {
  await ouvrir(page);
  await page.getByLabel('Sélectionner Boulangerie').check();
  await page.getByLabel('Sélectionner Loyer').check();
  await expect(page.getByText('2 sélectionnées')).toBeVisible();
  await page.getByRole('toolbar', { name: 'Actions sur la sélection' }).getByRole('button', { name: 'Catégorie' }).click();
  await page.getByRole('menu').getByRole('button', { name: 'Loisirs' }).click();
  await expect.poll(() => page.modifications.map((m) => [m.id, m.categorie]).sort()).toEqual([[2, 'Loisirs'], [3, 'Loisirs']]);
  await page.screenshot({ path: 'test-results/gerer-liste.png' });
});

test('le tri par montant range les opérations sans les regrouper par jour', async ({ page }) => {
  await ouvrir(page);
  await liste(page).getByRole('button', { name: 'Montant' }).click();
  await expect(liste(page).getByRole('button', { name: /Montant/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(liste(page).getByText('Mercredi 4 novembre')).toHaveCount(0);
  const libelles = liste(page).getByRole('textbox', { name: 'Libellé de l’opération' });
  await expect(libelles.first()).toHaveValue('Loyer'); // Croissant : la plus grosse dépense d'abord.
  await liste(page).getByRole('button', { name: /Date/ }).click();
  await expect(liste(page).getByText('Mercredi 4 novembre')).toBeVisible();
});

test('le mois affecté se change depuis sa pastille, et la division reste à portée de clic', async ({ page }) => {
  await ouvrir(page);
  const boulangerie = ligne(page, 'Boulangerie');
  await expect(boulangerie.getByRole('textbox', { name: 'Enveloppe' })).toBeVisible();
  await expect(boulangerie.getByRole('button', { name: 'Diviser' })).toBeVisible();
  await boulangerie.getByRole('textbox', { name: 'Mois affecté' }).click();
  await page.getByRole('listbox').getByText('Décembre', { exact: true }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 2, mois: 'Décembre' });
});

test('un libellé long passe sur deux lignes, Entrée l’enregistre, et chaque ligne dit sa nature', async ({ page }) => {
  await ouvrir(page);
  const boulangerie = ligne(page, 'Boulangerie');
  await expect(boulangerie.getByTitle('Dépense')).toBeAttached();
  await expect(ligne(page, 'Salaire').getByTitle('Revenu')).toBeAttached();
  const champ = boulangerie.getByRole('textbox', { name: 'Libellé de l’opération' });
  const hauteur = (await champ.boundingBox()).height;
  await champ.fill('Boulangerie de la place du marché, pain de campagne, croissants et chocolatines pour toute la famille');
  await expect.poll(async () => (await champ.boundingBox()).height).toBeGreaterThan(hauteur + 10);
  await champ.press('Enter');
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 2, nom: expect.stringContaining('chocolatines') });
});
