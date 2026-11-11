// Compte commun, côté propriétaire puis côté personne invitée, avec une API simulée.
import { test, expect } from '@playwright/test';
import { ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function ouvrir(page, { partages = [], comptes, transactions, previsions = [], budgets = [], url = '/' } = {}) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const serveur = page.serveur = { partages, envois: [] };
  const reponses = [
    [/^\/profile\//, { username: 'testeur', email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'user' }],
    [/^\/config-comptes\//, comptes || [{ compte: 'Compte joint', groupe: 'Testeur', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }, { compte: 'CCP', groupe: 'Testeur', solde: 100, objectif: 0, couleur: '#10b981', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    [/^\/previsions\//, previsions],
    [/^\/get-budgets\//, budgets],
    [/^\/transactions\//, transactions || [{ id: 1, date: '2026-11-02', nom: 'Achat', montant: -5, categorie: 'Courses', compte: 'CCP', mois: 'Novembre', annee: 2026 }]],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/powens\/connexion-active/, { connecte: false }],
    [/^\/get-theme\//, null],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const chemin = new URL(requete.url()).pathname;
    const json = (corps) => route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
    if (chemin.startsWith('/api/partages')) {
      if (requete.method() !== 'GET') serveur.envois.push({ methode: requete.method(), chemin, corps: requete.postDataJSON?.() ?? null });
      if (chemin === '/api/partages' && requete.method() === 'GET') return json(serveur.partages);
      if (chemin === '/api/partages' && requete.method() === 'POST') {
        serveur.partages = [{ id: 4, etat: 'invite', role: 'proprietaire', avec: requete.postDataJSON().email, comptes: requete.postDataJSON().comptes }];
        return json({ status: 'success', id: 4 });
      }
      if (chemin === '/api/partages/accepter') return json({ status: 'success', proprietaire: 'theo' });
      if (chemin.endsWith('/synchroniser')) { serveur.journal = [{ action: 'synchro_fin', auteur: 'theo', detail: '', cree_le: '2026-11-10 18:00' }]; return json({ status: 'success' }); }
      if (chemin.endsWith('/journal')) return json(serveur.journal || []);
      if (requete.method() === 'DELETE') { serveur.partages = []; return json({ status: 'success', copiees: 3 }); }
      return json([]);
    }
    if (/^\/transactions\/[^/]+$/.test(chemin)) serveur.chargements = (serveur.chargements || 0) + 1;
    const trouve = reponses.find(([motif]) => motif.test(chemin));
    return json(trouve ? trouve[1] : []);
  });
  await ouvrirSession(page);
  await page.goto(url);
  return erreurs;
}

const profil = (page) => page.getByTitle('Accéder à mon profil et aux réglages').click({ timeout: 30_000 });

test('le propriétaire invite une personne sur un compte choisi', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await profil(page);
  const carte = page.getByRole('region', { name: 'Comptes partagés' });
  await carte.getByLabel('Adresse e-mail de la personne invitée').fill('aude@kleea.test');
  await carte.getByText('Compte joint', { exact: true }).click();
  await carte.getByRole('button', { name: 'Inviter' }).click();
  await expect.poll(() => page.serveur.envois[0]).toMatchObject({ methode: 'POST', chemin: '/api/partages', corps: { email: 'aude@kleea.test', comptes: ['Compte joint'] } });
  await expect(carte).toContainText('Partagé avec aude@kleea.test');
  await expect(carte).toContainText('invitation envoyée');
  await carte.screenshot({ path: 'test-results/compte-commun-invitation.png' });
  expect(erreurs).toEqual([]);
});

test('le lien de l’e-mail fait accepter le partage, une fois connecté', async ({ page }) => {
  await ouvrir(page, { url: '/?partage=JETON-DE-TEST-123' });
  await expect.poll(() => page.serveur.envois[0]).toMatchObject({ chemin: '/api/partages/accepter', corps: { jeton: 'JETON-DE-TEST-123' } });
  await expect(page.getByText(/Partage accepté/)).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
});

test('la personne invitée voit le compte partagé à part, en lecture seule, et peut arrêter', async ({ page }) => {
  const comptes = [
    { compte: 'CCP', groupe: 'Testeur', solde: 100, objectif: 0, couleur: '#10b981', taux: 0, powens_name: null },
    { compte: 'Compte joint · theo', groupe: 'Commun · theo', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null, partage: 'theo' },
  ];
  const erreurs = await ouvrir(page, { comptes, partages: [{ id: 4, etat: 'actif', role: 'invite', avec: 'theo', comptes: ['Compte joint · theo'] }] });
  await page.locator('nav').getByRole('button', { name: /^Comptes$/i }).first().click({ timeout: 30_000 });
  await expect(page.getByText('Partagé par theo · profil « Commun · theo »')).toBeVisible();

  await profil(page);
  const carte = page.getByRole('region', { name: 'Comptes partagés' });
  await expect(carte).toContainText('theo partage avec vous');
  // Pas de formulaire d'invitation pour un compte qui n'est pas le sien.
  await expect(carte.getByText('Compte joint · theo', { exact: true })).toHaveCount(0);
  await carte.getByRole('button', { name: 'Arrêter le partage' }).click();
  await expect(carte).toContainText('Vous garderez une copie de ces comptes');
  await carte.getByRole('button', { name: 'Confirmer l’arrêt' }).click();
  await expect.poll(() => page.serveur.envois.at(-1)).toMatchObject({ methode: 'DELETE', chemin: '/api/partages/4' });
  await expect(carte).not.toContainText('theo partage avec vous');
  expect(erreurs).toEqual([]);
});

test('la page Importer explique d’où viennent les opérations partagées et demande une synchronisation', async ({ page }) => {
  const erreurs = await ouvrir(page, { partages: [{ id: 4, etat: 'actif', role: 'invite', avec: 'theo', comptes: ['Compte Commun · theo'] }] });
  await page.locator('nav').getByRole('button', { name: /^Importer$/i }).first().click({ timeout: 30_000 });
  const bloc = page.getByRole('region', { name: 'Comptes partagés avec vous' });
  await expect(bloc).toContainText('Compte Commun · theo est synchronisé par theo');
  await bloc.getByRole('button', { name: 'Demander une synchronisation' }).click();
  await expect.poll(() => page.serveur.envois.at(-1)).toMatchObject({ methode: 'POST', chemin: '/api/partages/4/synchroniser' });
  await expect(page.getByText(/Synchronisation demandée/)).toBeVisible();
  // La fin de l'import, notée par le serveur, est annoncée et recharge les opérations.
  const chargements = () => page.serveur.chargements;
  await expect(page.getByText('Import terminé : les opérations de Compte Commun · theo sont à jour.')).toBeVisible({ timeout: 15_000 });
  await expect.poll(chargements).toBeGreaterThan(1);
  await page.screenshot({ path: 'test-results/synchro-partagee.png' });
  expect(erreurs).toEqual([]);
});

test('dans Gérer, une opération du compte partagé se relie aux prévisions partagées', async ({ page }) => {
  // Seul le compte partagé : son profil « Commun · theo » est celui affiché.
  const comptes = [
    { compte: 'Compte Commun · theo', groupe: 'Commun · theo', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null, partage: 'theo' },
  ];
  const transactions = [{ id: 7, date: '2026-11-03', nom: 'Loyer', montant: -800, categorie: 'Logement', compte: 'Compte Commun · theo', mois: 'Novembre', annee: 2026, prevision_id: null, partage: 'theo' }];
  const previsions = [{ id: 295, date: '2026-11-01', nom: 'Loyer prévu', montant: -800, categorie: 'Logement', compte: 'Compte Commun · theo', mois: 'Novembre', annee: 2026, actif: true, partage: 'theo', regle_id: null }];
  const erreurs = await ouvrir(page, { comptes, transactions, previsions, partages: [{ id: 4, etat: 'actif', role: 'invite', avec: 'theo', comptes: ['Compte Commun · theo'] }] });
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click({ timeout: 30_000 });
  await page.getByRole('region', { name: 'Opérations' }).getByRole('textbox', { name: 'Prévision reliée' }).click();
  await expect(page.getByRole('listbox').getByText(/Loyer prévu/)).toBeVisible();
  await page.screenshot({ path: 'test-results/gerer-prevision-partagee.png' });
  expect(erreurs).toEqual([]);
});

test('dans Gérer, la personne invitée voit les objectifs budgétaires du compte partagé', async ({ page }) => {
  const comptes = [{ compte: 'Compte Commun · theo', groupe: 'Commun · theo', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null, partage: 'theo' }];
  const transactions = [{ id: 7, date: '2026-11-03', nom: 'Auchan', montant: -60, categorie: 'Courses', compte: 'Compte Commun · theo', mois: 'Novembre', annee: 2026, partage: 'theo' }];
  const budgets = [{ id: 3, utilisateur: 'theo', nom: 'Courses', somme: 300, mois: 'Novembre', annee: 2026, compte: 'Compte Commun · theo', type: 'Categorie', partage: 'theo' }];
  const erreurs = await ouvrir(page, { comptes, transactions, budgets, partages: [{ id: 4, etat: 'actif', role: 'invite', avec: 'theo', comptes: ['Compte Commun · theo'] }] });
  await page.getByRole('button', { name: 'Gérer' }).locator('visible=true').first().click({ timeout: 30_000 });
  const suivi = page.getByRole('button', { name: /Suivi Budgets/ });
  await expect(suivi).toContainText('1 objectifs au total');
  await suivi.click();
  await expect(page.getByText(/300/).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/gerer-objectif-partage.png' });
  expect(erreurs).toEqual([]);
});
