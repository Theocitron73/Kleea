// Prévisions et budgets récurrents, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const serveur = page.serveur = { regles: [], envois: [] };
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
    [/^\/config-comptes\//, [{ compte: 'CCP', groupe: 'Testeur', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    [/^\/transactions\//, [{ id: 1, date: '2026-11-02', nom: 'Achat', montant: -5, categorie: 'Courses', compte: 'CCP', mois: 'Novembre', annee: 2026 }]],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/api\/categories\//, { all: ['Logement', 'Courses'], perso: [] }],
    [/^\/powens\/connexion-active/, { connecte: false }],
    [/^\/api\/streamdeck\/token/, { active: false }],
    [/^\/note\//, { texte: '' }],
    [/^\/get-theme\//, null],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const url = new URL(requete.url());
    const json = (corps) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
    if (url.pathname.startsWith('/api/regles')) {
      const methode = requete.method();
      const id = Number(url.pathname.split('/')[3]);
      if (methode !== 'GET') serveur.envois.push({ methode, id, corps: requete.postDataJSON?.() ?? null });
      if (methode === 'POST') serveur.regles.push({ id: serveur.regles.length + 1, actif: true, fin: null, ...requete.postDataJSON() });
      if (methode === 'PUT') Object.assign(serveur.regles.find((r) => r.id === id), requete.postDataJSON());
      if (methode === 'DELETE') serveur.regles = serveur.regles.filter((r) => r.id !== id);
      return json(methode === 'GET' ? serveur.regles : { status: 'success', id: serveur.regles.length });
    }
    const trouve = reponses.find(([motif]) => motif.test(url.pathname));
    return json(trouve ? trouve[1] : []);
  });
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00+01:00'));
  await ouvrirSession(page);
  await page.goto('/');
  return erreurs;
}

const onglet = (page, nom) => page.locator('nav').getByRole('button', { name: new RegExp(`^${nom}$`, 'i') }).first().click({ timeout: 30_000 });

test('une prévision répétée chaque mois devient une règle qu’on peut mettre en pause, modifier et arrêter', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 'Prévisionnel');
  const ongletRecurrentes = page.getByRole('tab', { name: /Récurrentes/ }).locator('visible=true');
  await ongletRecurrentes.click();
  await expect(page.getByText('Aucune prévision ni budget récurrent').locator('visible=true')).toBeVisible();
  await page.getByRole('tab', { name: /Ce mois-ci/ }).locator('visible=true').click();

  await page.getByPlaceholder('Ex: Salaire...').fill('Loyer');
  await page.locator('input[type="number"][placeholder="0.00"]').locator('visible=true').first().fill('-850');
  await page.getByRole('radio', { name: /Chaque mois/ }).locator('visible=true').first().click();
  await expect(page.getByText('le 18 de chaque mois, jusqu’à').locator('visible=true')).toBeVisible();
  await page.screenshot({ path: 'test-results/regles-formulaire.png' });
  await page.getByRole('button', { name: /^Ajouter/ }).locator('visible=true').first().click();
  expect(page.serveur.envois[0]).toMatchObject({ methode: 'POST', corps: { type: 'prevision', nom: 'Loyer', montant: -850, jour: 18, debut: '2026-11-01', fin: null } });

  await expect(ongletRecurrentes).toContainText('1');
  await ongletRecurrentes.click();
  const liste = page.getByRole('list', { name: 'Prévisions et budgets récurrents' }).locator('visible=true');
  await expect(liste.getByText('le 18 de chaque mois')).toBeVisible();
  await page.screenshot({ path: 'test-results/regles-onglet.png' });

  await liste.getByRole('switch', { name: 'Mettre en pause : Loyer' }).click();
  await expect(liste.getByText('en pause')).toBeVisible();
  expect(page.serveur.envois.at(-1)).toMatchObject({ methode: 'PUT', id: 1, corps: { actif: false } });

  const montant = liste.getByLabel('Montant de Loyer');
  await montant.fill('-870');
  await montant.press('Enter');
  await expect.poll(() => page.serveur.envois.at(-1)).toMatchObject({ methode: 'PUT', corps: { montant: -870 } });

  await liste.getByRole('button', { name: 'Arrêter la règle : Loyer' }).click();
  await expect(page.getByText('Aucune prévision ni budget récurrent').locator('visible=true')).toBeVisible();
  expect(page.serveur.envois.at(-1)).toMatchObject({ methode: 'DELETE', id: 1 });
  expect(erreurs).toEqual([]);
});

test('un budget fixé « chaque mois » devient une règle à partir du mois choisi', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 'Gérer');
  await page.getByRole('radio', { name: /Chaque mois/ }).locator('visible=true').first().click();
  const champ = page.locator('input[type="number"][placeholder="0"]').locator('visible=true').first();
  await champ.fill('320');
  // La catégorie se choisit dans la liste personnalisée du formulaire.
  const formulaire = page.locator('div.col-span-8', { has: page.getByText('Catégorie', { exact: true }) });
  await formulaire.getByPlaceholder('Sélectionner...').locator('visible=true').first().click();
  await formulaire.getByText('Courses', { exact: true }).locator('visible=true').last().click();
  await page.screenshot({ path: 'test-results/regles-budget.png' });
  await page.getByRole('button', { name: /Fixer le budget/ }).locator('visible=true').first().click();
  await expect.poll(() => page.serveur.envois[0]).toMatchObject({ methode: 'POST', corps: { type: 'budget', nom: 'Courses', montant: 320, debut: '2026-11-01' } });
  expect(erreurs).toEqual([]);
});
