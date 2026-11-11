// Placements & crédits : onglets de la page Comptes, carte du tableau de bord, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const CREDIT = {
  id: 1, type: 'immobilier', nom: 'Crédit immo', montant: 200000, taux: 3.5, duree_mois: 240, debut: '2021-04-05', libelle_lien: 'PRLV CREDIT', profil: null,
  anticipes: [], capital_restant: 156703.29, mensualite: 1159.92, fin: '2041-03-05', interets_restants: 42802.85, rembourse_pct: 21.6, echeances_payees: 68,
  echeances: [{ date: '2026-09-05', vue: true }, { date: '2026-10-05', vue: true }, { date: '2026-11-05', vue: false }],
  anticipes_detectes: [{ operation_id: 42, date: '2026-06-20', montant: 10000 }],
};

async function ouvrir(page, { avecPatrimoine = false, comptes = null } = {}) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const serveur = page.serveur = {
    biens: avecPatrimoine ? [{ id: 1, type: 'immobilier', nom: 'Appartement', valeur: 245000, valeur_saisie: 245000, date_valeur: '2026-07-01', decote: null, libelle_lien: null, profil: null, versements: 0 }] : [],
    dettes: avecPatrimoine ? [CREDIT] : [],
    envois: [],
  };
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
    [/^\/config-comptes\//, comptes || [{ compte: 'CCP', groupe: 'Testeur', solde: 1500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: 1 }],
    [/^\/transactions\//, [{ id: 1, date: '2026-11-02', nom: 'Achat', montant: -5, categorie: 'Courses', compte: 'CCP', mois: 'Novembre', annee: 2026 }]],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
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
    const chemin = url.pathname;
    if (requete.method() !== 'GET' && /^\/api\/(biens|dettes|regles)/.test(chemin)) {
      serveur.envois.push({ methode: requete.method(), chemin, corps: requete.postDataJSON?.() ?? null });
      if (chemin === '/api/biens') serveur.biens.push({ id: 9, ...requete.postDataJSON(), valeur_saisie: requete.postDataJSON().valeur, date_valeur: '2026-11-18', versements: 0 });
      if (chemin === '/api/dettes') serveur.dettes.push({ ...CREDIT, ...requete.postDataJSON(), id: 9, anticipes_detectes: [] });
      if (chemin.endsWith('/anticipes') || chemin.includes('/ignorer/')) serveur.dettes = serveur.dettes.map((d) => ({ ...d, anticipes_detectes: [] }));
      return json({ status: 'success', id: 9 });
    }
    if (chemin === '/api/patrimoine') {
      const historique = Array.from({ length: 11 }, (_, i) => ({ mois: `2026-${String(i + 1).padStart(2, '0')}`, biens: 245000, dettes: 165000 - i * 800 }));
      return json({ biens: serveur.biens, dettes: serveur.dettes, total_biens: 0, total_dettes: 0, cryptos: { bitcoin: 'Bitcoin', ethereum: 'Ethereum' }, historique });
    }
    if (chemin === '/api/dettes/banque') {
      return json([{ powens_compte_id: '77', nom: 'PRET AUTO', type: 'auto', montant: 15000, taux: 4.2, duree_mois: 60, debut: '2024-03-10', fin: '2029-02-10', mensualite: 277.6, capital_restant: 8900, complet: true, deja_ajoute: false }]);
    }
    if (chemin.endsWith('/simulation')) {
      return json({ interets_economises: 6192.95, mois_gagnes: 13, avant: { fin: '2041-03-05', mensualite: 1159.92 }, apres: { fin: '2040-02-05', mensualite: 1159.92 } });
    }
    const trouve = reponses.find(([motif]) => motif.test(chemin));
    return json(trouve ? trouve[1] : []);
  });
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00+01:00'));
  await ouvrirSession(page);
  await page.goto('/');
  return erreurs;
}

const onglet = (page, nom) => page.locator('nav').getByRole('button', { name: new RegExp(`^${nom}$`, 'i') }).first().click({ timeout: 30_000 });
const ongletComptes = (page, nom) => page.getByRole('tab', { name: new RegExp(`^${nom}`) }).click();

test('ajouter un bien et un crédit, puis suivre le crédit', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Placements');
  await expect(page.getByText('Aucun placement ni bien pour l’instant')).toBeVisible();

  await page.getByLabel('Nom du bien').fill('Appartement Nantes');
  await page.getByLabel('Valeur du bien').fill('245000');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  expect(page.serveur.envois[0]).toMatchObject({ methode: 'POST', chemin: '/api/biens', corps: { type: 'immobilier', nom: 'Appartement Nantes', valeur: 245000 } });
  await expect(page.getByRole('list', { name: 'Placements et biens' }).getByText('Appartement Nantes')).toBeVisible();

  await ongletComptes(page, 'Crédits');
  await page.getByLabel('Nom du crédit').fill('Crédit immo');
  await page.getByLabel('Montant emprunté').fill('200000');
  await page.getByLabel('Taux annuel').fill('3,5');
  await page.getByLabel('Durée en années').fill('20');
  await page.getByLabel('Date de la première échéance').fill('2021-04-05');
  await page.locator('form').filter({ hasText: 'Ajouter un crédit' }).getByRole('button', { name: 'Ajouter' }).click();
  expect(page.serveur.envois.at(-1)).toMatchObject({ chemin: '/api/dettes', corps: { nom: 'Crédit immo', montant: 200000, taux: 3.5, duree_mois: 240, debut: '2021-04-05' } });
  const carte = page.getByRole('list', { name: 'Crédits' }).getByRole('listitem').first();
  await expect(carte.getByText('156 703 €')).toBeVisible();
  await expect(carte.getByText('fin en mars 2041')).toBeVisible();
  await expect(page.getByText(/Total net/).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/valeur-nette-dettes.png' });
  expect(erreurs).toEqual([]);
});

test('un remboursement anticipé détecté se confirme, se simule, et la mensualité part au Prévisionnel', async ({ page }) => {
  const erreurs = await ouvrir(page, { avecPatrimoine: true });
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Crédits');
  await expect(page.getByRole('tab', { name: /^Crédits/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /^Comptes bancaires/ })).toHaveAttribute('aria-selected', 'false');
  const alerte = page.getByRole('alert').filter({ hasText: 'remboursement anticipé ?' });
  await expect(alerte).toContainText('10 000,00 €');
  await page.screenshot({ path: 'test-results/valeur-nette-anticipe.png' });
  await alerte.getByRole('button', { name: /raccourcit le crédit/ }).click();
  expect(page.serveur.envois.at(-1)).toMatchObject({ methode: 'POST', chemin: '/api/dettes/1/anticipes', corps: { montant: 10000, date: '2026-06-20', effet: 'duree', operation_id: 42 } });
  await expect(alerte).toHaveCount(0);

  await page.getByLabel('Montant à rembourser par anticipation').fill('10000');
  await page.getByRole('button', { name: 'Simuler' }).click();
  await expect(page.getByRole('status')).toContainText('13 mois de moins');

  await page.getByRole('button', { name: /Ajouter la mensualité au Prévisionnel/ }).click();
  await expect.poll(() => page.serveur.envois.at(-1)).toMatchObject({ chemin: '/api/regles', corps: { type: 'prevision', nom: 'Crédit immo', montant: -1159.92, jour: 5, debut: '2026-11-01', fin: '2041-03-01' } });
  expect(erreurs).toEqual([]);
});

test('le tableau de bord montre le total net et ouvre les placements', async ({ page }) => {
  const erreurs = await ouvrir(page, { avecPatrimoine: true });
  const carte = page.getByRole('button', { name: /Total net/ }).locator('visible=true').first();
  await expect(carte).toContainText('comptes + placements − crédits');
  await expect(page.getByText('Flux mensuel').first()).toBeVisible();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/valeur-nette-dashboard.png' });
  await carte.click();
  await expect(page.getByRole('tab', { name: /^Placements/ })).toHaveAttribute('aria-selected', 'true');
  expect(erreurs).toEqual([]);
});

test('modifier le taux et la durée d’un crédit', async ({ page }) => {
  const erreurs = await ouvrir(page, { avecPatrimoine: true });
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Crédits');
  await page.getByRole('button', { name: 'Modifier Crédit immo' }).click();
  const formulaire = page.getByRole('form', { name: 'Modifier Crédit immo' });
  await formulaire.getByLabel('Taux (%)').fill('2,9');
  await formulaire.getByLabel('Durée (ans)').fill('25');
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click();
  expect(page.serveur.envois.at(-1)).toMatchObject({ methode: 'PUT', chemin: '/api/dettes/1', corps: { montant: 200000, taux: 2.9, duree_mois: 300, debut: '2021-04-05' } });
  await expect(formulaire).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('un crédit trouvé chez la banque s’ajoute en un clic', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Crédits');
  const banque = page.getByRole('region', { name: 'Crédits trouvés chez votre banque' });
  await expect(banque).toContainText('PRET AUTO');
  await banque.getByRole('button', { name: 'Ajouter' }).click();
  expect(page.serveur.envois.at(-1)).toMatchObject({ chemin: '/api/dettes', corps: { nom: 'PRET AUTO', type: 'auto', montant: 15000, taux: 4.2, duree_mois: 60, powens_compte_id: '77' } });
  await expect(banque).toHaveCount(0);
  expect(erreurs).toEqual([]);
});

test('une crypto s’ajoute par sa quantité', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Placements');
  const type = page.locator('div.w-52', { has: page.getByText('Type', { exact: true }) }).locator('input').first();
  await type.click();
  await page.getByText('Crypto', { exact: true }).locator('visible=true').last().click();
  await page.getByLabel('Nom du bien').fill('Bitcoin');
  await page.getByLabel('Quantité détenue').fill('0,05');
  await page.getByRole('button', { name: 'Ajouter' }).click();
  expect(page.serveur.envois.at(-1)).toMatchObject({ chemin: '/api/biens', corps: { type: 'crypto', nom: 'Bitcoin', crypto_id: 'bitcoin', quantite: 0.05, valeur: null } });
  expect(erreurs).toEqual([]);
});

test('l’onglet Placements & crédits du tableau de bord récapitule tout', async ({ page }) => {
  const erreurs = await ouvrir(page, { avecPatrimoine: true });
  await page.getByRole('button', { name: 'Placements & crédits', exact: true }).locator('visible=true').first().click({ timeout: 30_000 });
  const resume = page.getByRole('region', { name: 'Placements & crédits' }).locator('visible=true');
  await expect(resume).toContainText('Crédits');
  await expect(page.getByRole('region', { name: 'Liste des crédits' }).locator('visible=true')).toContainText('Crédit immo');
  await expect(page.getByText(/points? à vérifier sur vos crédits/).locator('visible=true')).toBeVisible();
  await expect(resume.locator('.recharts-area-curve')).toHaveCount(1);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-results/valeur-nette-onglet.png' });
  await resume.getByRole('button', { name: /Gérer/ }).click();
  await expect(page.getByRole('tab', { name: /^Placements/ })).toHaveAttribute('aria-selected', 'true');
  expect(erreurs).toEqual([]);
});

test('un ancien compte PEA devient un placement, un ancien prêt un crédit', async ({ page }) => {
  const compte = (nom, solde) => ({ compte: nom, groupe: 'Testeur', solde, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null });
  const erreurs = await ouvrir(page, { comptes: [compte('CCP', 1500), compte('PEA - Bourso', 18000), compte('PRET - Auto', -9000)] });
  await onglet(page, 'Comptes');
  await expect(page.getByRole('button', { name: 'Transformer en placement' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Transformer en placement' }).click();
  await expect.poll(() => page.serveur.envois.at(-1)).toMatchObject({ chemin: '/api/biens', corps: { type: 'placement', nom: 'Bourso', valeur: 18000, profil: 'Testeur' } });
  await expect(page.getByRole('tab', { name: /^Placements/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Supprimer l’ancien compte' })).toBeVisible();

  await ongletComptes(page, 'Comptes bancaires');
  await page.getByRole('button', { name: 'Transformer en crédit' }).click();
  await expect(page.getByRole('tab', { name: /^Crédits/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('Nom du crédit')).toHaveValue('Auto');
  expect(erreurs).toEqual([]);
});

test('la page Comptes montre les placements de tous les profils', async ({ page }) => {
  const compte = (nom, groupe) => ({ compte: nom, groupe, solde: 1000, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null });
  const erreurs = await ouvrir(page, { comptes: [compte('Commun CCP', 'Commun'), compte('CCP', 'Testeur')] });
  page.serveur.biens.push({ id: 5, type: 'placement', nom: 'PEA Testeur', valeur: 18000, valeur_saisie: 18000, date_valeur: '2026-11-09', decote: null, libelle_lien: null, profil: 'Testeur', versements: 0 });
  page.serveur.biens.push({ id: 6, type: 'placement', nom: 'Assurance vie commune', valeur: 9000, valeur_saisie: 9000, date_valeur: '2026-11-09', decote: null, libelle_lien: null, profil: 'Commun', versements: 0 });
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Placements');
  const liste = page.getByRole('list', { name: 'Placements et biens' });
  await expect(liste.getByText('PEA Testeur')).toBeVisible();
  await expect(liste.getByText('Assurance vie commune')).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Placements/ })).toContainText('2');
  expect(erreurs).toEqual([]);
});

test('la liste du type passe au-dessus des placements déjà présents', async ({ page }) => {
  await ouvrir(page, { avecPatrimoine: true });
  await onglet(page, 'Comptes');
  await ongletComptes(page, 'Placements');
  const type = page.locator('div.w-52', { has: page.getByText('Type', { exact: true }) }).locator('input').first();
  await type.click();
  const option = page.getByText('Véhicule', { exact: true }).locator('visible=true').last();
  await expect(option).toBeVisible();
  await page.screenshot({ path: 'test-results/liste-type.png' });
  // L'option est cliquable : rien ne la recouvre.
  const centre = await option.boundingBox();
  const dessus = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.textContent?.trim(), { x: centre.x + centre.width / 2, y: centre.y + centre.height / 2 });
  expect(dessus).toBe('Véhicule');
  await option.click();
  await expect(page.getByLabel('Perte de valeur par an')).toBeVisible();
});
