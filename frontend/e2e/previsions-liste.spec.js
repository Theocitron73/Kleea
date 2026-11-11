// La liste des prévisions du Prévisionnel : regroupée par jour, modifiable depuis la ligne, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
const PREVI = (id, date, nom, montant, categorie, extra = {}) => ({ id, date, nom: `[PRÉVI] ${nom}`, montant, categorie, compte: 'Compte courant', mois: 'Novembre', annee: 2026, actif: true, ...extra });
const PREVISIONS = [
  PREVI(51, '2026-11-20', 'Courses de la semaine', -95, 'Courses'),
  PREVI(52, '2026-11-20', 'Abonnement salle de sport avec engagement de douze mois et frais d’inscription', -35, 'Loisirs'),
  PREVI(53, '2026-11-28', 'Prime de fin d’année', 900, 'Salaire', { regle_id: 4 }),
];

async function ouvrir(page, previsions = PREVISIONS) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const modifications = page.modifications = [];
  await brancherApi(page);
  await page.route(/api\.kleea\.test\/api\/categories\//, (route) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ all: ['Salaire', 'Courses', 'Logement', 'Sorties', 'Loisirs'] }) }));
  await page.route(/api\.kleea\.test\/previsions\//, (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (requete.method() === 'PUT') {
      modifications.push({ id: Number(requete.url().split('/').pop()), ...requete.postDataJSON() });
      return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify({ status: 'success' }) });
    }
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(/\/ALL\//.test(requete.url()) ? previsions : []) });
  });
  await ouvrirSession(page);
  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: /^Prévisionnel$/i }).first().click({ timeout: 30_000 });
  return erreurs;
}

const liste = (page) => page.getByRole('region', { name: 'Prévisions du mois' }).locator('visible=true');
const ligne = (page, debut) => liste(page).locator('div.group').filter({ has: page.getByLabel(new RegExp(`^Sélectionner ${debut}`)) });

test('les prévisions sont regroupées par jour, avec leur nature et leur répétition', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await expect(liste(page).getByText('Vendredi 20 novembre')).toBeVisible();
  await expect(liste(page).getByText('Samedi 28 novembre')).toBeVisible();
  await expect(ligne(page, 'Prime').getByTitle('Revenu')).toBeAttached();
  await expect(ligne(page, 'Prime').getByLabel('Répétée chaque mois')).toBeVisible();
  const long = ligne(page, 'Abonnement').getByRole('textbox', { name: 'Libellé de la prévision' });
  const court = ligne(page, 'Courses').getByRole('textbox', { name: 'Libellé de la prévision' });
  expect((await long.boundingBox()).height).toBeGreaterThan((await court.boundingBox()).height + 10);
  await page.screenshot({ path: 'test-results/previsions-liste.png' });
  expect(erreurs).toEqual([]);
});

test('la catégorie, le compte et le montant se changent depuis la ligne', async ({ page }) => {
  await ouvrir(page);
  await ligne(page, 'Courses').getByRole('textbox', { name: 'Catégorie de la prévision' }).click();
  await page.getByRole('listbox').getByText('Sorties', { exact: true }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 51, categorie: 'Sorties' });

  await ligne(page, 'Courses').getByRole('textbox', { name: 'Compte de la prévision' }).click();
  await page.getByRole('listbox').getByText('Livret A', { exact: true }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 51, compte: 'Livret A' });

  const montant = ligne(page, 'Courses').getByRole('spinbutton', { name: 'Montant prévu' });
  await montant.fill('-120');
  await montant.press('Enter');
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 51, montant: -120 });
});

test('une prévision se met de côté sans être supprimée', async ({ page }) => {
  await ouvrir(page);
  await ligne(page, 'Courses').getByRole('button', { name: 'Ne plus compter cette prévision' }).click();
  await expect.poll(() => page.modifications.at(-1)).toMatchObject({ id: 51, actif: false });
});

test('en 1920 × 1080, le menu des catégories reste entier, même ouvert vers le haut', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const nombreuses = Array.from({ length: 12 }, (_, i) => PREVI(60 + i, '2026-11-01', `Prévision ${i + 1}`, -10 - i, i % 2 ? 'Courses' : 'Loisirs'));
  await ouvrir(page, nombreuses);
  const derniere = ligne(page, 'Prévision 12');
  await derniere.scrollIntoViewIfNeeded();
  await derniere.getByRole('textbox', { name: 'Catégorie de la prévision' }).click();
  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  // Chaque choix du menu est réellement visible : rien ne le recouvre ni ne le coupe.
  for (const choix of await menu.locator('div.cursor-pointer').all()) {
    const visible = await choix.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      return r.top >= 0 && r.bottom <= window.innerHeight && el.contains(document.elementFromPoint(x, y));
    });
    if (await choix.isVisible()) expect(visible).toBe(true);
  }
  await page.screenshot({ path: 'test-results/previsions-menu-1080p.png' });
});

test('le graphique des dépenses prévues est en barres, et une catégorie se masque puis revient', async ({ page }) => {
  await ouvrir(page);
  const graphique = page.getByRole('img', { name: /^Dépenses prévues par catégorie/ }).locator('visible=true');
  // La prime, un revenu, n'y figure pas.
  await expect(graphique).toHaveAttribute('aria-label', 'Dépenses prévues par catégorie : Courses 95 €, Loisirs 35 €');
  const barres = graphique.locator('.recharts-bar-rectangle');
  await expect(barres).toHaveCount(2);
  await expect(graphique).toContainText('73 %');
  await barres.nth(1).locator('rect').first().click();
  await expect(barres).toHaveCount(1);
  await page.getByLabel('Catégories masquées').locator('visible=true').getByRole('button', { name: /Loisirs/ }).click();
  await expect(barres).toHaveCount(2);
});
