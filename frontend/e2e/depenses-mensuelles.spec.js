// L'onglet « Par mois » du Bilan annuel : un tableau des dépenses, une ligne par catégorie et une colonne par mois.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

async function ouvrir(page, largeur, hauteur) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.setViewportSize({ width: largeur, height: hauteur });
  await brancherApi(page);
  await ouvrirSession(page);
  await page.goto('/');
  return erreurs;
}

test('le tableau croise catégories et mois, avec les totaux', async ({ page }) => {
  const erreurs = await ouvrir(page, 1920, 1080);
  await page.locator('button[title="Dépenses par mois et par catégorie"]:visible').first().click({ timeout: 30_000 });

  const tableau = page.getByRole('table', { name: 'Dépenses par catégorie et par mois' }).locator('visible=true');
  // Janvier → novembre, dernier mois avec des dépenses dans les données de test, plus la colonne Total.
  await expect(tableau.locator('thead th')).toHaveCount(1 + 11 + 1);
  await expect(tableau.locator('tbody tr').first()).toContainText('Logement');
  await expect(tableau.locator('tfoot')).toContainText('1 158');
  await page.screenshot({ path: 'test-results/depenses-mensuelles.png' });
  expect(erreurs).toEqual([]);
});

test('sur téléphone, le tableau défile sans élargir la page', async ({ page }) => {
  const erreurs = await ouvrir(page, 390, 844);
  await page.locator('.onglets-mobile button', { hasText: 'Bilan annuel' }).click({ timeout: 30_000 });
  await page.getByRole('button', { name: /Par mois/ }).or(page.getByRole('tab', { name: /Par mois/ })).first().click();
  await expect(page.getByRole('table', { name: 'Dépenses par catégorie et par mois' }).locator('visible=true')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/depenses-mensuelles-mobile.png' });
  expect(erreurs).toEqual([]);
});

test('une année pleine, à gros montants, ne défile jamais en largeur : les mois qui ne tiennent pas passent derrière des flèches', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const noms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const categories = ['Loyer', 'Alimentation', 'Carburant', 'Electricité', 'Virement Envoyé', 'Abonnements', 'Assurance Habitation', 'Animaux', 'Shopping', 'Assurance voiture', 'Autre', 'Auto', 'Cotisations bancaires', 'Péage'];
  // Décembre n'est pas encore passé : ses opérations sont datées de novembre, mais rangées en décembre.
  let id = 0;
  const operations = noms.flatMap((mois, m) => categories.map((categorie, c) => ({
    id: ++id, date: `2026-${String(Math.min(m + 1, 11)).padStart(2, '0')}-10`, nom: categorie, montant: -(c === 0 ? 1780 : 300 + c * 37), categorie,
    compte: 'Compte courant', mois, annee: 2026, utilisateur: 'testeur', enveloppe: null, prevision_id: null, split_id: null,
  })));
  for (const largeur of [1920, 1440]) {
    await page.setViewportSize({ width: largeur, height: 1000 });
    await brancherApi(page);
    await page.route(/api\.kleea\.test\/transactions\/testeur$/, (route) => route.fulfill({
      status: 200, contentType: 'application/json', body: JSON.stringify(operations),
      headers: { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true' },
    }));
    await ouvrirSession(page);
    await page.goto('/');
    await page.locator('button[title="Dépenses par mois et par catégorie"]:visible').first().click({ timeout: 30_000 });
    const tableau = page.locator('.depenses-mensuelles:visible');
    await expect(tableau.locator('tbody tr')).toHaveCount(14);
    // Jamais de défilement en largeur : à 1920 les 12 mois tiennent, plus étroit les flèches mènent aux autres.
    const { client, defile } = await tableau.evaluate((e) => ({ client: e.clientWidth, defile: e.scrollWidth }));
    expect(defile, `largeur ${largeur}`).toBeLessThanOrEqual(client);
    if (largeur >= 1920) {
      await expect(tableau.locator('thead th')).toHaveCount(1 + 12 + 1);
    } else {
      await expect(tableau.locator('thead th').last()).toHaveText('Total');
      await expect(tableau.locator('thead th').nth(-2)).toHaveText('Déc.');
      await tableau.getByRole('button', { name: 'Mois précédents' }).click();
      await expect(tableau.locator('thead th').nth(-2)).toHaveText('Nov.');
    }
    await page.screenshot({ path: `test-results/depenses-mensuelles-${largeur}.png` });
  }
  expect(erreurs).toEqual([]);
});
