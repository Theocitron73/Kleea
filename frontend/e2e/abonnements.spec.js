// Onglet Abonnements du Dashboard, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const mois = ['Juin', 'Juillet', 'Août', 'Septembre', 'Octobre'];
const serie = (nom, montant, categorie, jour = '05') => mois.map((m, i) => ({
  id: `${nom}-${i}`, date: `2026-${String(i + 6).padStart(2, '0')}-${jour}`, nom, montant: -montant, categorie, compte: 'CCP', mois: m, annee: 2026,
}));
const TRANSACTIONS = [
  ...serie('NETFLIX COM', 14.99, 'Abonnements'),
  ...serie('PRLV SEPA EDF REF 1', 80, 'Énergie', '12'),
  ...[3, 4, 5].map((m) => ({ id: `s${m}`, date: `2026-0${m}-21`, nom: 'SOUNDLY PRO', montant: -17.34, categorie: 'Abonnements', compte: 'CCP', mois: 'Mars', annee: 2026 })),
  ...['2026-06-02', '2026-06-09', '2026-07-20', '2026-08-03', '2026-09-27'].map((date, i) => ({ id: `c${i}`, date, nom: 'INTERMARCHE', montant: -(10 + i * 9), categorie: 'Courses', compte: 'CCP', mois: 'Juin', annee: 2026 })),
];

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
    [/^\/config-comptes\//, [{ compte: 'CCP', groupe: 'Testeur', solde: 1000, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: TRANSACTIONS.length }],
    [/^\/transactions\//, TRANSACTIONS],
    [/^\/dashboard\/periodes\//, [{ mois: 'Octobre', annee: 2026 }]],
    [/^\/powens\/connexion-active/, { connecte: false }],
    [/^\/api\/streamdeck\/token/, { active: false }],
    [/^\/note\//, { texte: '' }],
    [/^\/get-theme\//, { bg_site: '#0f172a', primary_color: '#4f46e5', text_main: '#ffffff', radius: '1rem', glass_blur: '10px', glass_bg: 'rgba(255,255,255,0.05)' }],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const trouve = reponses.find(([motif]) => motif.test(new URL(requete.url()).pathname));
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : []) });
  });
  await ouvrirSession(page);
  await page.clock.setFixedTime(new Date('2026-11-05T10:00:00+01:00'));
  await page.goto('/');
  await page.locator('button[title="Abonnements"]:visible').first().click({ timeout: 30_000 });
  return erreurs;
}

test('l’onglet liste les abonnements et écarte les courses', async ({ page }) => {
  const erreurs = await ouvrir(page);
  const enCours = page.getByRole('list', { name: 'Dépenses récurrentes en cours' });
  await expect(enCours.getByText('Netflix')).toBeVisible();
  await expect(enCours.getByText('EDF')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Dépenses récurrentes arrêtées' }).getByText('Soundly pro')).toBeVisible();
  await expect(page.getByText('Intermarche')).toHaveCount(0);
  await expect(page.getByText('94,99 €').first()).toBeVisible();
  expect(erreurs).toEqual([]);
  await page.screenshot({ path: 'test-results/abo-pc.png' });
});

test('ignorer une ligne est mémorisé et réversible', async ({ page }) => {
  const erreurs = await ouvrir(page);
  const enCours = page.getByRole('list', { name: 'Dépenses récurrentes en cours' });
  await page.getByRole('button', { name: 'Ignorer Netflix' }).click();
  await expect(enCours.getByText('Netflix')).toHaveCount(0);
  await expect(page.getByText('80,00 €').first()).toBeVisible();

  await page.reload();
  await page.locator('button[title="Abonnements"]:visible').first().click({ timeout: 30_000 });
  await expect(page.getByRole('list', { name: 'Dépenses récurrentes en cours' }).getByText('Netflix')).toHaveCount(0);

  await page.getByRole('button', { name: '1 ignorée' }).click();
  await page.getByRole('button', { name: 'Réafficher Netflix' }).click();
  await expect(page.getByRole('list', { name: 'Dépenses récurrentes en cours' }).getByText('Netflix')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('l’onglet fonctionne sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const erreurs = await ouvrir(page);
  await expect(page.getByRole('list', { name: 'Dépenses récurrentes en cours' }).getByText('Netflix').first()).toBeVisible();
  expect(erreurs).toEqual([]);
  await page.screenshot({ path: 'test-results/abo-mobile.png' });
});
