// Mentions légales et politique de confidentialité : accessibles depuis le pied de la page d'accueil et l'inscription.
import { test, expect } from '@playwright/test';
import { brancherApi } from './api-simulee.js';

test('le pied de page mène aux mentions légales et à la politique de confidentialité', async ({ page }) => {
  await brancherApi(page);
  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Mentions légales' }).click({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Mentions légales', level: 1 })).toBeVisible();
  await expect(page.getByText('Théo Lebarbier', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/Vercel Inc\./)).toBeVisible();
  await page.screenshot({ path: '../.cap/mentions-legales.png', fullPage: true });
  await page.getByRole('link', { name: 'politique de confidentialité' }).click();
  await expect(page.getByRole('heading', { name: 'Politique de confidentialité', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vos droits' })).toBeVisible();
  await page.screenshot({ path: '../.cap/confidentialite.png', fullPage: true });
  await page.getByRole('link', { name: 'Accueil' }).click();
  await expect(page.getByRole('heading', { name: /Votre solde de fin de mois/ })).toBeVisible();
});

test('l’inscription renvoie vers la politique de confidentialité', async ({ page }) => {
  await brancherApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un compte' }).first().click({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: 'politique de confidentialité' })).toHaveAttribute('href', '/confidentialite');
});
