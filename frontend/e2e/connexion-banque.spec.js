// Retour de Powens après une connexion, et liste de liaison de la page Comptes.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const COMPTE = (nom, couleur) => ({ compte: nom, groupe: 'Testeur', solde: 100, objectif: 0, couleur, taux: 0, powens_name: null });
const COMPTES = ['Compte A', 'Compte B', 'Compte C', 'Compte D', 'Compte E', 'Compte F'].map((n) => COMPTE(n, '#4f46e5'));
const POWENS = [1, 2, 3, 4, 5].map((id) => ({ id, name: `Compte bancaire ${id}`, bank_name: 'Banque Test', balance: 12, iban: null }));

async function brancher(page, mode) {
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: mode, role: 'admin' }],
    [/^\/config-comptes\//, COMPTES],
    [/^\/powens\/connexion-active/, { connecte: true }],
    [/^\/powens\/connections-and-accounts/, { connections_count: 1, connections: [{ id: 9, state: null, bank_name: 'Banque Test', accounts: POWENS }], accounts_count: 1, accounts: POWENS }],
    [/^\/powens\/accounts/, { accounts: POWENS }],
    [/^\/powens\/check-sync\//, { count: 0, accounts: {} }],
    [/^\/powens\/callback/, { status: 'success' }],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    [/^\/transactions\//, [{ id: 1, date: '2026-11-02', nom: 'Achat', montant: -5, categorie: 'Courses', compte: 'Compte A', mois: 'Novembre', annee: 2026 }]],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/api\/streamdeck\/token/, { active: false }],
    [/^\/note\//, { texte: '' }],
    [/^\/get-user-theme\//, {}],
    [/^\/get-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const trouve = reponses.find(([motif]) => motif.test(new URL(requete.url()).pathname));
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : []) });
  });
}

for (const [cas, avecJeton] of [['une première banque', false], ['une banque supplémentaire', true]]) {
  test(`connecter ${cas} n’ouvre pas la fenêtre d’import`, async ({ page }) => {
    await ouvrirSession(page);
    await brancher(page, 'manual');
    if (avecJeton) await page.addInitScript(() => localStorage.setItem('powens_connecte', 'true'));
    else await page.addInitScript(() => localStorage.removeItem('powens_connecte'));
    await page.goto('/?code=code-de-test&state=etat-de-test');
    await expect(page.getByText('Mes Comptes')).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: 'Comptes Powens' })).toHaveCount(0);
    expect(new URL(page.url()).search).toBe('');
  });
}

test('la liste de liaison Powens d’une carte passe au-dessus des cartes suivantes', async ({ page }) => {
  await ouvrirSession(page);
  await brancher(page, 'manual');
  await page.addInitScript(() => localStorage.setItem('powens_connecte', 'true'));
  await page.goto('/');
  await page.locator('nav').getByRole('button', { name: /^Comptes$/i }).first().click({ timeout: 30_000 });
  // Les deux premiers champs de ce type appartiennent au formulaire de création, au-dessus des cartes.
  const carte = page.locator('input[placeholder="Sélectionner..."]').nth(2);
  await expect(carte).toHaveValue(/Lier un compte Powens/);
  await carte.click();
  const derniere = page.getByText('[Banque Test] Compte bancaire 5 (12€)');
  await expect(derniere).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/liste.png' });
  // L'élément réellement au premier plan, au centre de l'option, doit être l'option elle-même.
  const devant = await derniere.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const haut = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return el === haut || el.contains(haut) || haut?.contains(el);
  });
  expect(devant).toBe(true);
  await derniere.click();
  await expect(derniere).toHaveCount(0);
});
