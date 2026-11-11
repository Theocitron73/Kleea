// Le Wrapped du Bilan annuel : ses cartes se rangent en pages quand le panneau ne peut pas toutes les montrer.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

async function ouvrirWrapped(page, largeur, hauteur) {
  await page.setViewportSize({ width: largeur, height: hauteur });
  await brancherApi(page);
  await ouvrirSession(page);
  await page.goto('/');
  await page.locator('button[title="Rétrospective annuelle (Wrapped)"]:visible').first().click({ timeout: 30_000 });
  return page.getByText(/Financial Wrapped/).locator('visible=true').first().locator('xpath=ancestor::div[contains(@class,"p-6")][1]');
}

test('sur un écran 1366 × 768, un slider fait défiler les cartes sans barre de défilement', async ({ page }) => {
  const panneau = await ouvrirWrapped(page, 1366, 768);
  const pages = page.getByRole('group', { name: 'Pages du Wrapped' });
  await expect(pages).toBeVisible();
  const total = await pages.getByRole('button', { name: /^Page \d+$/ }).count();
  expect(total).toBeGreaterThan(1);
  await expect(panneau.getByLabel(`Page 1 sur ${total}`)).toBeVisible();
  await expect(pages.getByRole('button', { name: 'Cartes précédentes' })).toBeDisabled();

  await pages.getByRole('button', { name: 'Cartes suivantes' }).click();
  await expect(panneau.getByLabel(`Page 2 sur ${total}`)).toBeVisible();
  await pages.getByRole('button', { name: `Page ${total}` }).click();
  await expect(pages.getByRole('button', { name: 'Cartes suivantes' })).toBeDisabled();

  // Rien ne déborde du panneau.
  expect(await panneau.evaluate((e) => e.scrollHeight <= e.clientHeight + 1)).toBe(true);
  await page.screenshot({ path: 'test-results/wrapped-1366.png' });
});

test('sur un écran 4K, toutes les cartes tiennent et le slider disparaît', async ({ page }) => {
  await ouvrirWrapped(page, 3840, 2160);
  await expect(page.getByText('Jours de pure discipline').locator('visible=true')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Pages du Wrapped' })).toHaveCount(0);
});

test('la molette change de page, une page par cran', async ({ page }) => {
  const panneau = await ouvrirWrapped(page, 1366, 768);
  const total = await page.getByRole('group', { name: 'Pages du Wrapped' }).getByRole('button', { name: /^Page \d+$/ }).count();
  await panneau.getByLabel(`Page 1 sur ${total}`).hover();
  await page.mouse.wheel(0, 120);
  await expect(panneau.getByLabel(`Page 2 sur ${total}`)).toBeVisible();
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, -120);
  await expect(panneau.getByLabel(`Page 1 sur ${total}`)).toBeVisible();
});

test('les nouvelles cartes sont là, et le résumé se télécharge en image', async ({ page }) => {
  await ouvrirWrapped(page, 3840, 2160);
  for (const titre of ['Votre premier poste, en jours de travail', 'Plus longue série sans dépense', 'Objectifs budgétaires tenus', 'L’épargne de l’année']) {
    await expect(page.getByText(titre).locator('visible=true')).toBeVisible();
  }
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger' }).locator('visible=true').first().click();
  expect((await telechargement).suggestedFilename()).toBe('kleea-wrapped-2026.png');
});
