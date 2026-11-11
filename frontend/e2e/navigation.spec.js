// Parcourt chaque onglet avec l'API simulée : aucune erreur JavaScript ne doit survenir.
// Avec KLEEA_E2E_INSTANTANE=<dossier>, le texte de chaque écran y est écrit pour comparer deux versions du code.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { brancherApi, ouvrirSession, UTILISATEUR } from './api-simulee.js';

const DOSSIER = process.env.KLEEA_E2E_INSTANTANE;

function surveiller(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon|Download the React DevTools|\[vite\]|Failed to load resource|style property during rerender/.test(m.text())) erreurs.push(`console: ${m.text().slice(0, 300)}`);
  });
  return erreurs;
}

async function photographier(page, nom) {
  await page.waitForTimeout(1200);
  const texte = await page.evaluate(() => document.body.innerText);
  if (DOSSIER) {
    fs.mkdirSync(DOSSIER, { recursive: true });
    fs.writeFileSync(path.join(DOSSIER, `${nom}.txt`), texte);
  }
  return texte;
}

async function demarrer(page) {
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00+01:00'));
  await ouvrirSession(page);
  const appels = await brancherApi(page);
  await page.goto('/');
  await expect(page.locator('body')).toContainText('Analytique', { timeout: 30_000 });
  return appels;
}

const ONGLETS = [
  ['Comptes', 'comptes'],
  ['Prévisionnel', 'previsionnel'],
  ['Tricount', 'tricount'],
  ['Gérer', 'gerer'],
  ['Importer', 'importer'],
  ['Déménagement', 'demenagement'],
  ['Congés', 'conges'],
  ['Thème', 'theme'],
  ['Guide', 'guide'],
];

test('la page d’accueil et la connexion s’affichent sans session', async ({ page }) => {
  const erreurs = surveiller(page);
  await brancherApi(page);
  await page.goto('/');
  const connexion = page.getByRole('button', { name: /se connecter/i }).first();
  await expect(connexion).toBeVisible({ timeout: 30_000 });
  await photographier(page, 'accueil');
  await connexion.click();
  await expect(page.getByPlaceholder('Pseudo ou Adresse e-mail')).toBeVisible();
  await photographier(page, 'connexion');
  expect(erreurs).toEqual([]);
});

test('chaque onglet s’ouvre sans erreur', async ({ page }) => {
  const erreurs = surveiller(page);
  const appels = await demarrer(page);
  await photographier(page, '00-dashboard');
  for (const [libelle, nom] of ONGLETS) {
    const bouton = page.getByRole('button', { name: new RegExp(libelle, 'i') }).first();
    await expect(bouton, `bouton ${libelle}`).toBeVisible();
    await bouton.click();
    await photographier(page, nom);
    expect(erreurs, `erreurs après ${libelle}`).toEqual([]);
  }
  if (DOSSIER) fs.writeFileSync(path.join(DOSSIER, 'appels.txt'), [...new Set(appels)].sort().join('\n'));
});

test('les notes de version s’ouvrent et se ferment', async ({ page }) => {
  const erreurs = surveiller(page);
  await demarrer(page);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((u) => { localStorage.setItem('user', u); }, UTILISATEUR);
  await page.addInitScript(() => localStorage.removeItem(`patch_view_count_v4.5_testeur`));
  await page.reload();
  await expect(page.locator('.fixed.inset-0.z-\\[10000\\]').first()).toBeVisible({ timeout: 15_000 });
  // La 4.5 s'ouvre ; les notes de la 4.4 restent dans leur onglet.
  await expect(page.getByRole('tab', { name: 'v4.5' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toContainText('Compte commun');
  await page.getByRole('tab', { name: 'v4.4' }).click();
  await expect(page.getByRole('tabpanel')).toContainText('Double authentification');
  await page.getByRole('tab', { name: 'v4.5' }).click();
  await page.screenshot({ path: 'test-results/notes-de-version.png' });
  expect(erreurs).toEqual([]);
});

// Les boutons qui détruisent, quittent la page ou ouvrent un service externe ne sont pas essayés.
const A_EVITER = /supprimer|effacer|vider|déconnex|deconnex|réinitialis|recharger|connect|banque|export|télécharg|imprimer|pdf|partag|fermer le compte|^$/i;

for (const [libelle, nom] of [['Dashboard', 'dashboard'], ...ONGLETS]) {
  test(`les boutons de l’onglet ${libelle} répondent sans erreur`, async ({ page }) => {
    test.setTimeout(150_000);
    const erreurs = surveiller(page);
    await demarrer(page);
    const ouvrirOnglet = () => page.locator('nav').getByRole('button', { name: new RegExp(`^${libelle}$`, 'i') }).first().click({ timeout: 5_000 });
    await ouvrirOnglet();
    await page.waitForTimeout(500);
    const compter = () => page.evaluate(() => document.querySelectorAll('button:not(nav button)').length);
    const total = Math.min(await compter(), 40);
    const journal = [];
    for (let i = 0; i < total; i += 1) {
      const bouton = page.locator('button:not(nav button)').nth(i);
      const texte = ((await bouton.innerText({ timeout: 1_000 }).catch(() => '')) || '').trim().replace(/\s+/g, ' ');
      if (A_EVITER.test(texte) || !(await bouton.isVisible().catch(() => false))) continue;
      const essai = await bouton.click({ timeout: 800 }).then(() => true).catch(() => false);
      if (!essai) continue;
      await page.waitForTimeout(150);
      journal.push(`### ${i} ${texte}\n${await page.evaluate(() => document.body.innerText)}`);
      expect(erreurs, `erreurs après « ${texte} » dans ${libelle}`).toEqual([]);
      await page.keyboard.press('Escape');
      if (new URL(page.url()).pathname !== '/') await page.goto('/');
      await ouvrirOnglet().catch(async () => {
        await page.goto('/');
        await expect(page.locator('body')).toContainText('Analytique', { timeout: 30_000 });
        await ouvrirOnglet();
      });
      await page.waitForTimeout(100);
    }
    if (DOSSIER) fs.writeFileSync(path.join(DOSSIER, `boutons-${nom}.txt`), journal.join('\n\n'));
    expect(erreurs).toEqual([]);
  });
}
