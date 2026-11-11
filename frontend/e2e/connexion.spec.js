// Page de connexion : connexion, inscription et mot de passe oublié, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi } from './api-simulee.js';

test('« Créer un compte » de l’accueil ouvre directement l’inscription', async ({ page }) => {
  await brancherApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Créer un compte' }).first().click({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Créer votre compte' })).toBeVisible();
  await expect(page.getByLabel('Prénom')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer un compte', pressed: true })).toBeVisible();
  // Le sélecteur ramène à la connexion, et « Oublié ? » au formulaire de récupération.
  await page.getByRole('button', { name: 'Se connecter', pressed: false }).click();
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
  await expect(page.getByLabel('Prénom')).toHaveCount(0);
  await page.waitForTimeout(300); // Le fond du sélecteur glisse vers « Se connecter »
  await page.screenshot({ path: '../.cap/connexion-nouvelle-ordinateur.png' });
  await page.getByRole('button', { name: 'Oublié ?' }).click();
  await expect(page.getByRole('heading', { name: 'Mot de passe oublié' })).toBeVisible();
  await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  await page.getByRole('button', { name: 'Retour à la connexion' }).click();
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
  // « Accueil » ramène à la page d'accueil.
  await page.getByRole('button', { name: 'Accueil' }).click();
  await expect(page.getByRole('heading', { name: /Votre solde de fin de mois/ })).toBeVisible();
});

test('sur téléphone, le formulaire est seul et rien ne déborde', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await brancherApi(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Se connecter' }).first().click({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Présentation de Kleea' })).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: '../.cap/connexion-nouvelle-mobile.png' });
});
