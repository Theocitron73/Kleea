// Sauvegarde personnelle dans la page Profil, avec une API simulée.
import { Buffer } from 'node:buffer';
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession, UTILISATEUR } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };
const FICHIER = { name: 'sauvegarde.json', mimeType: 'application/json', buffer: Buffer.from('{"format":"kleea-sauvegarde"}') };
const RESUME = {
  exporte_le: '2026-11-01T10:00:00+00:00',
  total_a_ajouter: 120,
  total_deja_presents: 2,
  tables: [
    { table: 'transactions', libelle: 'Opérations', dans_fichier: 120, a_ajouter: 120, deja_presents: 0 },
    { table: 'notes', libelle: 'Bloc-notes', dans_fichier: 2, a_ajouter: 0, deja_presents: 2 },
  ],
};

async function ouvrirProfil(page, serveur) {
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+01:00'));
  await ouvrirSession(page);
  await brancherApi(page);
  await page.route('http://api.kleea.test/api/sauvegarde/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const chemin = new URL(requete.url()).pathname;
    serveur.appels.push(chemin);
    const reponse = serveur.reponses[chemin];
    return route.fulfill({ status: reponse.status || 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(reponse.corps) });
  });
  await page.goto('/');
  await expect(page.locator('body')).toContainText('Analytique', { timeout: 30_000 });
  await page.getByRole('button', { name: new RegExp(UTILISATEUR, 'i') }).first().click();
  await expect(page.getByRole('heading', { name: 'Ma sauvegarde' })).toBeVisible({ timeout: 30_000 });
}

const choisirFichier = (page) => page.getByLabel('Fichier de sauvegarde à importer').setInputFiles(FICHIER);

test('télécharger sa sauvegarde', async ({ page }) => {
  const serveur = { appels: [], reponses: { '/api/sauvegarde/export': { corps: { format: 'kleea-sauvegarde' } } } };
  await ouvrirProfil(page, serveur);
  const telechargement = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger ma sauvegarde' }).click();
  expect((await telechargement).suggestedFilename()).toBe(`kleea-sauvegarde-${UTILISATEUR}-2026-11-06.json`);
});

test('importer : le résumé passe avant la confirmation', async ({ page }) => {
  const serveur = {
    appels: [],
    reponses: {
      '/api/sauvegarde/apercu': { corps: RESUME },
      '/api/sauvegarde/import': { corps: { status: 'success', ...RESUME } },
    },
  };
  await ouvrirProfil(page, serveur);
  await choisirFichier(page);

  await expect(page.getByText('Sauvegarde du 01/11/2026')).toBeVisible();
  await expect(page.getByText(/120 à ajouter/)).toBeVisible();
  await expect(page.getByText(/2 déjà présents/)).toBeVisible();
  expect(serveur.appels).toEqual(['/api/sauvegarde/apercu']);

  await page.getByRole('button', { name: "Confirmer l'import" }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Import terminé : 120 éléments ajoutés.' })).toBeVisible();
  expect(serveur.appels).toEqual(['/api/sauvegarde/apercu', '/api/sauvegarde/import']);
  await expect(page.getByRole('button', { name: "Recharger l'application" })).toBeVisible();
});

test('importer : annuler n’envoie rien', async ({ page }) => {
  const serveur = { appels: [], reponses: { '/api/sauvegarde/apercu': { corps: RESUME } } };
  await ouvrirProfil(page, serveur);
  await choisirFichier(page);
  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByRole('button', { name: "Confirmer l'import" })).toHaveCount(0);
  expect(serveur.appels).toEqual(['/api/sauvegarde/apercu']);
});

test('importer : le refus du serveur s’affiche et rien ne peut être confirmé', async ({ page }) => {
  const detail = 'Cette sauvegarde appartient au compte « aude » : elle ne peut pas être importée dans le compte « testeur ».';
  const serveur = { appels: [], reponses: { '/api/sauvegarde/apercu': { status: 409, corps: { detail } } } };
  await ouvrirProfil(page, serveur);
  await choisirFichier(page);
  await expect(page.getByRole('alert').filter({ hasText: detail })).toBeVisible();
  await expect(page.getByRole('button', { name: "Confirmer l'import" })).toHaveCount(0);
});

test('importer : rien à ajouter, rien à confirmer', async ({ page }) => {
  const resume = { ...RESUME, total_a_ajouter: 0, tables: [RESUME.tables[1]] };
  const serveur = { appels: [], reponses: { '/api/sauvegarde/apercu': { corps: resume } } };
  await ouvrirProfil(page, serveur);
  await choisirFichier(page);
  await expect(page.getByText(/Rien à ajouter/)).toBeVisible();
  await expect(page.getByRole('button', { name: "Confirmer l'import" })).toHaveCount(0);
  await page.getByRole('button', { name: 'Fermer' }).last().click();
  await expect(page.getByText(/Rien à ajouter/)).toHaveCount(0);
});
