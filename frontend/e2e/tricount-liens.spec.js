// Protection des liens de partage : messages de refus côté participant, gestion et historique côté propriétaire.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const json = (route, corps, status = 200) => route.fulfill({ status, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
const DEPENSE = { id: 7, date: '2026-11-02T00:00:00', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:10,Theo:20', montant: 30, emoji: null };
const PARTAGE = { groupe: 'Vacances', utilisateur: 'proprietaire', emojis: '', transferts: [], transactions: [DEPENSE], expire_le: '2026-12-01T12:00:00+00:00' };

test.describe('participant', () => {
  for (const [nom, status, code, attendu] of [
    ['expiré', 410, 'lien_expire', 'Ce lien a expiré'],
    ['révoqué', 410, 'lien_revoque', 'Ce lien n’est plus actif'],
    ['inconnu', 404, 'lien_introuvable', 'Lien introuvable'],
  ]) {
    test(`un lien ${nom} affiche un message clair, sans le Tricount`, async ({ page }) => {
      await page.route('http://api.kleea.test/**', (route) => json(route, { detail: { code, message: 'x' } }, status));
      await page.goto('/shared-tricount/jeton');
      await expect(page.getByRole('alert')).toContainText(attendu);
      await expect(page.getByText('Nouvelle dépense')).toHaveCount(0);
    });
  }

  test('un lien coupé pendant la consultation affiche le même message', async ({ page }) => {
    await page.route('http://api.kleea.test/**', (route) => {
      const methode = route.request().method();
      if (methode === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
      if (methode === 'DELETE') return json(route, { detail: { code: 'lien_revoque', message: 'x' } }, 410);
      return json(route, PARTAGE);
    });
    await page.goto('/shared-tricount/jeton');
    await page.locator('button:has(svg.lucide-trash-2)').first().click({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Confirmer' }).first().click();
    await expect(page.getByRole('alert')).toContainText('Ce lien n’est plus actif');
  });

  test('le nom saisi accompagne la suppression, et l’échéance est annoncée', async ({ page }) => {
    const envois = [];
    await page.route('http://api.kleea.test/**', (route) => {
      const requete = route.request();
      if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
      if (requete.method() === 'DELETE') { envois.push(requete.postDataJSON()); return json(route, {}); }
      return json(route, PARTAGE);
    });
    await page.goto('/shared-tricount/jeton');
    await expect(page.getByText('Ce lien expire le 01/12/2026')).toBeVisible({ timeout: 30_000 });
    await page.getByLabel('Votre nom (facultatif)').fill('Zoé');
    await page.locator('button:has(svg.lucide-trash-2)').first().click();
    await page.getByRole('button', { name: 'Confirmer' }).first().click();
    await expect(page.getByText('Dépense supprimée')).toBeVisible();
    expect(envois).toEqual([{ auteur: 'Zoé' }]);
  });
});

test.describe('propriétaire', () => {
  const HISTORIQUE = [{
    id: 1, action: 'modification', depense_id: 7, auteur: 'Zoé', date: '2026-11-05T10:00:00+00:00',
    ancienne_valeur: { date: '2026-11-02', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:30', montant: 30 },
    nouvelle_valeur: { date: '2026-11-02', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:35', montant: 35 },
  }];

  async function ouvrir(page, lienDeDepart) {
    const envois = [];
    let lien = lienDeDepart;
    const reponses = [
      [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
      [/^\/get-groups\//, [{ nom: 'Vacances' }]],
      [/^\/get-tricount\//, { transactions: [DEPENSE], transferts: [] }],
      [/^\/share-history\//, { historique: HISTORIQUE }],
      [/^\/powens\/connexion-active/, { connecte: false }],
      [/^\/transactions\/stats\/count\//, { count: 1 }],
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
      if (/^\/get-share-token\//.test(chemin)) return json(route, lien);
      const gestion = chemin.match(/^\/(share-group|regenerate-share|revoke-share)\//);
      if (gestion && requete.method() === 'POST') {
        envois.push({ route: gestion[1], corps: requete.postDataJSON() });
        lien = gestion[1] === 'revoke-share'
          ? { token: null, expire_le: null, statut: null }
          : { token: gestion[1] === 'share-group' && lien.token ? lien.token : 'nouveau-jeton', expire_le: '2027-02-01T12:00:00+00:00', statut: 'actif' };
        return json(route, lien);
      }
      const trouve = reponses.find(([motif]) => motif.test(chemin));
      return json(route, trouve ? trouve[1] : []);
    });
    await ouvrirSession(page);
    await page.goto('/');
    await page.locator('nav').getByRole('button', { name: /^Tricount$/i }).first().click({ timeout: 30_000 });
    await page.getByTitle('Partager ce Tricount').click({ timeout: 15_000 });
    const fenetre = page.getByRole('dialog', { name: 'Partager ce Tricount' });
    await expect(fenetre).toBeVisible();
    return { envois, fenetre };
  }

  test('créer un lien avec la durée choisie', async ({ page }) => {
    const { envois, fenetre } = await ouvrir(page, { token: null, expire_le: null, statut: null });
    await expect(fenetre).toContainText('pas de lien actif');
    await fenetre.getByRole('button', { name: '90 jours' }).click();
    await fenetre.getByRole('button', { name: 'Créer le lien et le copier' }).click();
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveValue(/\/shared-tricount\/nouveau-jeton$/);
    await expect(fenetre).toContainText('expire le 01/02/2027');
    expect(envois).toEqual([{ route: 'share-group', corps: { duree_jours: 90 } }]);
  });

  test('un lien déjà partagé est annoncé sans date limite, puis reçoit une durée', async ({ page }) => {
    const { envois, fenetre } = await ouvrir(page, { token: 'ancien', expire_le: null, statut: 'actif' });
    await expect(fenetre).toContainText('Sans date limite');
    await fenetre.getByRole('button', { name: '7 jours' }).click();
    await fenetre.getByRole('button', { name: 'Appliquer cette durée' }).click();
    await expect(fenetre).toContainText('expire le');
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveValue(/\/shared-tricount\/ancien$/);
    expect(envois).toEqual([{ route: 'share-group', corps: { duree_jours: 7 } }]);
  });

  test('révoquer demande confirmation et coupe le lien', async ({ page }) => {
    const { envois, fenetre } = await ouvrir(page, { token: 'actuel', expire_le: '2026-12-01T12:00:00+00:00', statut: 'actif' });
    await fenetre.getByRole('button', { name: 'Révoquer le lien' }).click();
    expect(envois).toEqual([]);
    await fenetre.getByRole('button', { name: 'Confirmer la révocation' }).click();
    await expect(fenetre).toContainText('pas de lien actif');
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveCount(0);
    expect(envois.map((e) => e.route)).toEqual(['revoke-share']);
  });

  test('remplacer le lien change son adresse', async ({ page }) => {
    const { envois, fenetre } = await ouvrir(page, { token: 'actuel', expire_le: '2026-12-01T12:00:00+00:00', statut: 'actif' });
    await fenetre.getByRole('button', { name: 'Générer un nouveau lien' }).click();
    await fenetre.getByRole('button', { name: 'Confirmer le remplacement' }).click();
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveValue(/nouveau-jeton$/);
    expect(envois).toEqual([{ route: 'regenerate-share', corps: { duree_jours: 30 } }]);
  });

  test('un lien expiré n’est plus proposé à la copie', async ({ page }) => {
    const { fenetre } = await ouvrir(page, { token: 'vieux', expire_le: '2026-10-01T12:00:00+00:00', statut: 'expire' });
    await expect(fenetre).toContainText('a expiré le 01/10/2026');
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveCount(0);
    await fenetre.getByRole('button', { name: 'Générer un nouveau lien' }).click();
    await expect(fenetre.getByLabel('Adresse du lien de partage')).toHaveValue(/nouveau-jeton$/);
  });

  test('l’historique montre qui a changé quoi', async ({ page }) => {
    const { fenetre } = await ouvrir(page, { token: 'actuel', expire_le: null, statut: 'actif' });
    await expect(fenetre).toContainText('Modification · Zoé');
    await expect(fenetre).toContainText('30.00 €');
    await expect(fenetre).toContainText('35.00 €');
    await expect(fenetre).toContainText('Aude:35');
  });
});
