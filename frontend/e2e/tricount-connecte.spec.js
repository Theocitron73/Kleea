// Modification d'une dépense depuis la page Tricount du compte connecté, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
const DEPENSES = [
  { id: 7, date: '2026-11-02T00:00:00', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:10,Theo:20', montant: 30, emoji: null },
];

async function ouvrir(page, statutMaj = 200) {
  const envois = [];
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
    [/^\/get-groups\//, [{ nom: 'Vacances' }]],
    [/^\/get-tricount\//, { transactions: DEPENSES, transferts: [] }],
    [/^\/get-members\//, []],
    [/^\/get-share-token\//, { token: null }],
    [/^\/powens\/connexion-active/, { connecte: false }],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    // Sans transaction, la fenêtre d'accueil d'un nouveau compte recouvrirait la page.
    [/^\/transactions\//, [{ id: 1, date: '2026-11-02', nom: 'Achat', montant: -5, categorie: 'Courses', compte: 'Compte', mois: 'Novembre', annee: 2026 }]],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/api\/streamdeck\/token/, { active: false }],
    [/^\/note\//, { texte: '' }],
    [/^\/get-theme\//, null],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    const chemin = new URL(requete.url()).pathname;
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (requete.method() === 'PUT') {
      envois.push({ chemin, corps: requete.postDataJSON() });
      return route.fulfill({ status: statutMaj, headers: ENTETES, contentType: 'application/json', body: '{}' });
    }
    const trouve = reponses.find(([motif]) => motif.test(chemin));
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : []) });
  });
  await ouvrirSession(page);
  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: /^Tricount$/i }).first().click({ timeout: 30_000 });
  await page.getByTitle('Modifier la dépense').first().click({ timeout: 15_000 });
  const fenetre = page.locator('.fixed.inset-0').filter({ hasText: 'Enregistrer' });
  await expect(fenetre).toBeVisible();
  return { envois, erreurs, fenetre };
}

test('une part modifiée est enregistrée avec le nouveau total', async ({ page }) => {
  const { envois, erreurs, fenetre } = await ouvrir(page);
  const parts = fenetre.locator('input[type="number"]');
  await expect(parts.nth(0)).toHaveValue('30');
  await expect(parts.nth(2)).toHaveValue('20');
  await parts.nth(2).fill('25.5');
  await expect(parts.nth(0)).toHaveValue('35.5');
  await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(fenetre).toBeHidden();
  expect(envois).toHaveLength(1);
  expect(envois[0].chemin).toBe('/update-transaction');
  expect(envois[0].corps).toMatchObject({ id: 7, date: '2026-11-02', pour_qui: 'Aude:10,Theo:25.5', montant: 35.5 });
  expect(erreurs).toEqual([]);
});

test('un montant différent de la somme des parts n’est pas enregistré', async ({ page }) => {
  const { envois, fenetre } = await ouvrir(page);
  await fenetre.locator('input[type="number"]').first().fill('50');
  await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('body')).toContainText('répartition');
  await expect(fenetre).toBeVisible();
  expect(envois).toEqual([]);
});
