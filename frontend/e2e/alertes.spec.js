// Centre d'alertes, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
const TRANSACTIONS = [
  { id: 1, date: '2026-11-02', nom: 'Supermarché', montant: -120, categorie: 'Courses', compte: 'CCP', mois: 'Novembre', annee: 2026 },
  { id: 2, date: '2026-11-03', nom: 'Remboursement', montant: 50, categorie: 'Courses', compte: 'CCP', mois: 'Novembre', annee: 2026 },
];

async function ouvrir(page, { importMode = 'auto', connexions = [], sansBudget = false, aImporter = {} } = {}) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const BUDGET_COURSES = { nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous', id: 1, utilisateur: UTILISATEUR, type: 'Categorie' };
  const serveur = page.serveur = { masquees: [], budgets: sansBudget ? [] : [BUDGET_COURSES] };
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: importMode, role: 'admin' }],
    [/^\/config-comptes\//, [{ compte: 'CCP', groupe: 'Testeur', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    [/^\/transactions\//, TRANSACTIONS],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/powens\/check-sync\//, { has_pending: Object.keys(aImporter).length > 0, accounts: aImporter }],
    [/^\/powens\/connexion-active/, { connecte: connexions.length > 0 }],
    [/^\/powens\/connections-and-accounts/, { connections_count: connexions.length, connections: connexions, accounts_count: 0, accounts: [] }],
    [/^\/previsions\//, [{ id: 9, date: '2026-12-10', nom: '[PRÉVI] Loyer', montant: -800, compte: 'CCP', categorie: 'Logement', mois: 'Décembre', annee: 2026, actif: true }]],
    [/^\/api\/streamdeck\/token/, { active: false }],
    [/^\/note\//, { texte: '' }],
    [/^\/get-theme\//, null],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    const url = new URL(requete.url());
    const json = (corps) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (url.pathname === '/api/alertes/etat') {
      return json({ synchro: { dernier_succes: '2026-11-01T05:00:00Z', dernier_echec: '2026-11-05T05:00:00Z', code_erreur: 'HTTP 502' }, masquees: serveur.masquees });
    }
    if (url.pathname === '/api/alertes/masquees') {
      if (requete.method() === 'POST') serveur.masquees.push(requete.postDataJSON().id);
      else serveur.masquees = [];
      return json({ status: 'success' });
    }
    if (url.pathname.startsWith('/get-budgets/')) {
      // Comme le vrai backend : le mois de l'adresse doit être écrit exactement comme en base.
      const mois = decodeURIComponent(url.pathname.split('/')[3] || '');
      return json(serveur.budgets.filter((b) => !mois || b.mois === mois));
    }
    if (url.pathname === '/save-budget') {
      serveur.budgets = [BUDGET_COURSES];
      return json({ status: 'success' });
    }
    const trouve = reponses.find(([motif]) => motif.test(url.pathname));
    return json(trouve ? trouve[1] : []);
  });
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+01:00'));
  await ouvrirSession(page);
  await page.addInitScript(() => localStorage.setItem('powens_connecte', 'true'));
  await page.goto('/');
  return erreurs;
}

const cloche = (page) => page.getByRole('button', { name: /^Alertes :/ }).locator('visible=true').first();
const panneau = (page) => page.getByRole('dialog', { name: 'Alertes' });

test('les alertes en cours sont listées, les plus graves d’abord', async ({ page }) => {
  const erreurs = await ouvrir(page, { connexions: [{ id: 5, connector_name: 'Bourso', needs_reconnect: true, days_left: 0, accounts: [] }] });
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 4 en cours', { timeout: 30_000 });
  // Une banque expirée ouvre aussi la fenêtre de reconnexion : « Plus tard » laisse l'alerte dans la cloche.
  await page.getByRole('button', { name: 'Plus tard' }).click();
  await cloche(page).click();
  const titres = panneau(page).getByRole('heading', { level: 3 });
  await expect(titres).toHaveText(['Bourso à reconnecter', 'Dernière synchronisation en échec', 'Budget Courses dépassé', 'Découvert prévu sur CCP']);
  await page.screenshot({ path: 'test-results/alertes-ordinateur.png' });
  expect(erreurs).toEqual([]);
});

test('une alerte mène à la bonne page', async ({ page }) => {
  await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  await cloche(page).click();
  const article = panneau(page).getByRole('article').filter({ hasText: 'Découvert prévu' });
  await article.getByRole('button', { name: 'Voir' }).click();
  await expect(panneau(page)).toBeHidden();
  await expect(page.getByText('Solde Final Estimé').first()).toBeVisible();
});

test('une alerte masquée reste masquée après rechargement et peut revenir', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 3 en cours', { timeout: 30_000 });
  await cloche(page).click();
  await panneau(page).getByRole('button', { name: 'Masquer : Budget Courses dépassé' }).click();
  await expect(panneau(page).getByText('Budget Courses dépassé')).toHaveCount(0);
  expect(page.serveur.masquees).toEqual(['budget:Courses:2026-11:depasse']);

  await page.reload();
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 2 en cours', { timeout: 30_000 });
  await cloche(page).click();
  await panneau(page).getByRole('button', { name: 'Réafficher 1 alerte masquée' }).click();
  await expect(panneau(page).getByText('Budget Courses dépassé')).toBeVisible();
  expect(page.serveur.masquees).toEqual([]);
  expect(erreurs).toEqual([]);
});

test('en mode manuel, une panne de synchronisation n’alerte pas', async ({ page }) => {
  await ouvrir(page, { importMode: 'manual' });
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 2 en cours', { timeout: 30_000 });
  await cloche(page).click();
  await expect(panneau(page).getByText('Dernière synchronisation en échec')).toHaveCount(0);
});

test('un budget ajouté déclenche son alerte sans changer de page', async ({ page }) => {
  await ouvrir(page, { sansBudget: true });
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 2 en cours', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click();
  await page.getByRole('button', { name: 'Fixer le budget' }).locator('visible=true').first().click();
  await expect(cloche(page)).toHaveAccessibleName('Alertes : 3 en cours');
  await cloche(page).click();
  await expect(panneau(page).getByText('Budget Courses dépassé')).toBeVisible();
});

test('la fenêtre de suivi compte un budget sur tous les comptes, sans les remboursements', async ({ page }) => {
  await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click();
  await page.getByRole('button', { name: /Suivi Budgets/ }).locator('visible=true').first().click();
  await expect(page.getByText('120€/100€').locator('visible=true').first()).toBeVisible();
});

test('la liste mobile des budgets compte un budget sur tous les comptes, sans les remboursements', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  // Sur mobile, les boutons de la navigation n'ont qu'une icône : Gérer est le troisième.
  await page.locator('div.md\\:hidden.fixed.bottom-0 button').nth(2).click();
  await page.getByRole('button', { name: /^Budgets \(/ }).locator('visible=true').first().click();
  await expect(page.getByText('120€/100€').locator('visible=true').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/budgets-mobile.png' });
});

test('des transactions à importer sont signalées et mènent à la page Importer', async ({ page }) => {
  await ouvrir(page, { connexions: [{ id: 5, connector_name: 'Bourso', days_left: 90, accounts: [] }], aImporter: { CCP: { count: 3 } } });
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  await cloche(page).click();
  const article = panneau(page).getByRole('article').filter({ hasText: '3 transactions à importer' });
  await expect(article.getByText('Sur CCP.')).toBeVisible();
  await article.getByRole('button', { name: 'Importer', exact: true }).click();
  await expect(panneau(page)).toBeHidden();
  await expect(page.getByText('Compte de destination').first()).toBeVisible();
});

test('sur grand écran, le panneau reste accroché à la cloche', async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1000 });
  await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  await cloche(page).click();
  await page.waitForTimeout(250); // fin de l'animation d'ouverture
  const cadreCloche = await cloche(page).boundingBox();
  const cadrePanneau = await panneau(page).boundingBox();
  expect(Math.abs((cadrePanneau.x + cadrePanneau.width) - (cadreCloche.x + cadreCloche.width))).toBeLessThan(2);
  expect(cadrePanneau.y).toBeGreaterThanOrEqual(cadreCloche.y + cadreCloche.height);
  await page.screenshot({ path: 'test-results/alertes-grand-ecran.png', clip: { x: 1400, y: 0, width: 1000, height: 500 } });
});

test('la cloche fonctionne sur mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  const erreurs = await ouvrir(page);
  await expect(cloche(page)).toHaveAccessibleName(/en cours/, { timeout: 30_000 });
  // Elle flotte en haut à droite, sans prendre de place dans la page.
  const position = await cloche(page).evaluate((el) => ({ css: getComputedStyle(el).position, droite: el.getBoundingClientRect().right }));
  expect(position.css).toBe('fixed');
  expect(position.droite).toBeGreaterThan(370);
  await cloche(page).click();
  await expect(panneau(page).getByText('Découvert prévu sur CCP')).toBeVisible();
  await page.screenshot({ path: 'test-results/alertes-mobile.png' });
  await page.keyboard.press('Escape');
  await expect(panneau(page)).toBeHidden();
  expect(erreurs).toEqual([]);
});
