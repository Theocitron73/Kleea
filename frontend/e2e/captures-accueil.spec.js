// Captures des écrans pour la page d'accueil, avec des données fictives.
// Ne tourne que sur demande : CAPTURES=1 npx playwright test e2e/captures-accueil.spec.js
// Les images vont dans public/apercu/, à refaire quand l'interface change.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { ouvrirSession } from './api-simulee.js';

test.skip(!process.env.CAPTURES, 'Captures de la page d’accueil : CAPTURES=1 pour les refaire.');

const U = 'testeur';
const DOSSIER = path.join(import.meta.dirname, '..', 'public', 'apercu');
const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Douze mois d'opérations, de décembre 2025 au 18 novembre 2026.
const TRANSACTIONS = [];
let id = 1;
const op = (a, m, j, nom, montant, categorie, compte = 'Compte courant') => {
  const date = `${a}-${String(m + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
  TRANSACTIONS.push({ id: id++, date, nom, montant, categorie, compte, mois: MOIS[m], annee: a, utilisateur: U, enveloppe: null, prevision_id: null, split_id: null });
};
for (let k = 0; k < 12; k += 1) {
  const a = k === 0 ? 2025 : 2026;
  const m = (11 + k) % 12;
  const enCours = a === 2026 && m === 10;
  const v = (k * 7) % 5; // petites variations d'un mois à l'autre
  op(a, m, 1, 'VIR SALAIRE ACME SAS', 2850, 'Salaire');
  op(a, m, 3, 'PRLV LOYER FONCIA', -850, 'Logement');
  op(a, m, 4, 'VIR LIVRET A', -300, 'Virement interne');
  op(a, m, 4, 'VIR LIVRET A', 300, 'Virement interne', 'Livret A');
  op(a, m, 2, 'VIR LDDS', -1000, 'Virement interne');
  op(a, m, 2, 'VIR LDDS', 1000, 'Virement interne', 'LDDS');
  op(a, m, 5, 'NETFLIX.COM', -13.49, 'Abonnements');
  op(a, m, 8, 'SPOTIFY', -11.12, 'Abonnements');
  op(a, m, 10, 'FREE MOBILE', -19.99, 'Téléphone & Internet');
  op(a, m, 6, 'CARREFOUR MARKET', -(62.4 + v * 8.3), 'Courses');
  op(a, m, 13, 'BIOCOOP', -(38.9 + v * 4.1), 'Courses');
  op(a, m, 14, 'TOTAL ENERGIES', -(54 + v * 3.5), 'Transport');
  if (!enCours) {
    op(a, m, 12, 'PRLV EDF', -78, 'Énergie');
    op(a, m, 20, 'LECLERC', -(88.2 + v * 6.4), 'Courses');
    op(a, m, 22, 'LE PETIT BISTROT', -(32 + v * 9), 'Sorties');
    op(a, m, 24, 'SNCF CONNECT', -(29 + v * 12), 'Transport');
    op(a, m, 27, 'PHARMACIE CENTRALE', -(12.5 + v * 2), 'Santé');
  }
  if (m === 6 || m === 7) op(a, m, 18, 'AIRBNB', -420, 'Vacances');
  if (m === 11) op(a, m, 15, 'FNAC', -189, 'Cadeaux');
}
op(2026, 10, 16, 'LA CANTINE', -46.8, 'Sorties');
op(2026, 10, 17, 'DECATHLON', -64.99, 'Loisirs');

const COMPTE = (compte, solde, couleur, taux = 0, objectif = 0) => ({ compte, groupe: 'Personnel', solde, objectif, couleur, taux, powens_name: compte === 'Compte courant' ? 'FR76 3000 4000 0500 0012 3456 789' : null, Compte: compte, Groupe: 'Personnel', Solde: solde, Couleur: couleur, Taux: taux, Objectif: objectif, Type: taux ? 'Livret' : 'CCP' });
const COMPTES = [COMPTE('Compte courant', 620, '#4f46e5'), COMPTE('Livret A', 4800, '#10b981', 2.4, 12000), COMPTE('LDDS', 1500, '#f59e0b', 2.4)];
const CATEGORIES = ['Salaire', 'Logement', 'Courses', 'Transport', 'Sorties', 'Abonnements', 'Énergie', 'Téléphone & Internet', 'Santé', 'Loisirs', 'Vacances', 'Cadeaux', 'Virement interne']
  .map((nom) => ({ nom, utilisateur: U, icone: 'tag', couleur: '#818cf8', groupe: 'Général' }));
const BUDGETS = [['Courses', 320], ['Sorties', 120], ['Transport', 150]].map(([nom, somme], i) => ({ id: i + 1, nom, somme, mois: 'Novembre', annee: 2026, compte: 'tous', utilisateur: U, type: 'Categorie' }));
const PREVI = (i, date, nom, montant, categorie) => ({ id: 100 + i, date, nom: `[PRÉVI] ${nom}`, montant, compte: 'Compte courant', categorie, mois: MOIS[Number(date.slice(5, 7)) - 1], annee: Number(date.slice(0, 4)), actif: true, utilisateur: U });
const PREVISIONS = [
  PREVI(1, '2026-11-25', 'Assurance auto', -48, 'Transport'),
  PREVI(2, '2026-11-28', 'Prime de fin d’année', 900, 'Salaire'),
  PREVI(8, '2026-11-20', 'Courses de la semaine', -95, 'Courses'),
  PREVI(9, '2026-11-22', 'Anniversaire de Léa', -60, 'Cadeaux'),
  PREVI(10, '2026-11-26', 'Révision vélo', -85, 'Transport'),
  PREVI(11, '2026-11-30', 'Remboursement mutuelle', 42, 'Santé'),
  PREVI(3, '2026-12-01', 'Salaire', 2850, 'Salaire'),
  PREVI(4, '2026-12-03', 'Loyer', -850, 'Logement'),
  PREVI(5, '2026-12-15', 'Cadeaux de Noël', -350, 'Cadeaux'),
  PREVI(6, '2027-01-01', 'Salaire', 2850, 'Salaire'),
  PREVI(7, '2027-01-03', 'Loyer', -850, 'Logement'),
];
const PROJETS = [
  { id: 1, cle: 1, nom: 'Voyage au Japon', cout: 4500, date: '2027-09-01', capa: 250, apport_epargne: 1800, date_debut: '2026-03-01', utiliser_capa_stricte: false, ordre: 1, profil: 'Personnel', utilisateur: U },
  { id: 2, nom: 'Apport appartement', cout: 25000, date: '2029-06-01', capa: 400, apport_epargne: 6200, date_debut: '2025-09-01', utiliser_capa_stricte: false, ordre: 2, profil: 'Personnel', utilisateur: U },
  { id: 3, nom: 'Vélo électrique', cout: 1600, date: '2027-03-01', capa: 120, apport_epargne: 900, date_debut: '2026-06-01', utiliser_capa_stricte: false, ordre: 3, profil: 'Personnel', utilisateur: U },
];
const DEPENSES_TRICOUNT = [
  { id: 1, date: '2026-08-02T00:00:00', libelle: 'Location voiture', paye_par: 'Alice', pour_qui: 'Alice:160,Théo:160,Thomas:160', montant: 480, emoji: null },
  { id: 2, date: '2026-08-03T00:00:00', libelle: 'Courses Bónus', paye_par: 'Théo', pour_qui: 'Alice:31.4,Théo:31.4,Thomas:31.4', montant: 94.2, emoji: null },
  { id: 3, date: '2026-08-04T00:00:00', libelle: 'Blue Lagoon', paye_par: 'Thomas', pour_qui: 'Alice:75,Théo:75,Thomas:75', montant: 225, emoji: null },
  { id: 4, date: '2026-08-05T00:00:00', libelle: 'Restaurant à Vík', paye_par: 'Alice', pour_qui: 'Alice:42,Théo:42,Thomas:42', montant: 126, emoji: null },
];

const REPONSES = [
  [/^\/profile\//, { username: U, email: 'camille@exemple.fr', name: 'Camille', import_mode: 'auto', role: 'user' }],
  [/^\/transactions\/stats\/count\//, { count: TRANSACTIONS.length }],
  [/^\/transactions\//, TRANSACTIONS],
  [/^\/config-comptes\//, COMPTES],
  [/^\/api\/categories\//, CATEGORIES],
  [/^\/dashboard\/periodes\//, [...new Set(TRANSACTIONS.map((t) => `${t.mois}|${t.annee}`))].map((s) => ({ mois: s.split('|')[0], annee: Number(s.split('|')[1]) }))],
  [/^\/get-budgets\//, BUDGETS],
  [/^\/previsions\//, PREVISIONS],
  [/^\/get-projets\//, PROJETS],
  [/^\/get-allocations\//, []],
  [/^\/get-groups\//, [{ nom: 'Voyage en Islande' }]],
  [/^\/get-tricount\//, { transactions: DEPENSES_TRICOUNT, transferts: [{ de: 'Théo', a: 'Alice', montant: 214.2 }, { de: 'Thomas', a: 'Alice', montant: 83.4 }] }],
  [/^\/get-members\//, []],
  [/^\/get-share-token\//, { token: null }],
  [/^\/powens\/connexion-active/, { connecte: true }],
  [/^\/powens\/connections-and-accounts/, { connections_count: 1, connections: [{ id: 5, connector_name: 'BoursoBank', days_left: 74, accounts: [] }], accounts_count: 1, accounts: [] }],
  [/^\/powens\/check-sync\//, { has_pending: true, accounts: { 'Compte courant': { count: 3, amount: -71.6, earliest_date: '2026-11-17' } } }],
  [/^\/api\/alertes\/etat/, { synchro: { dernier_succes: '2026-11-18T05:00:00Z', dernier_echec: null, code_erreur: null }, masquees: [] }],
  [/^\/api\/abonnements\/ignores/, []],
  [/^\/api\/streamdeck\/token/, { active: false }],
  [/^\/api\/sessions$/, { disponible: true, session_suivie: false, sessions: [] }],
  [/^\/api\/double-auth$/, { disponible: false }],
  [/^\/note\//, { texte: '' }],
  [/^\/get-theme\//, null],
  [/^\/get-user-theme\//, {}],
];

async function demarrer(page) {
  page.on('console', async (m) => {
    if (m.type() !== 'error') return;
    const morceaux = await Promise.all(m.args().map((x) => x.evaluate((v) => (v instanceof Error ? `${v.message} ${v.stack}` : String(v)).slice(0, 500)).catch(() => '?')));
    console.log('ERREUR PAGE', JSON.stringify(morceaux));
  });
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const chemin = new URL(requete.url()).pathname;
    if (requete.method() === 'POST' && /erreur/i.test(chemin)) console.log('ERREUR PAGE', requete.postData()?.slice(0, 1500));
    const trouve = requete.method() === 'GET' ? REPONSES.find(([motif]) => motif.test(chemin)) : null;
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : requete.method() === 'GET' ? [] : { status: 'success' }) });
  });
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00+01:00'));
  await ouvrirSession(page);
  await page.addInitScript(() => localStorage.setItem('powens_connecte', 'true'));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Alertes :/ }).locator('visible=true').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(1500);
}

const photo = async (page, nom) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(DOSSIER, `${nom}.jpg`), type: "jpeg", quality: 82 });
};

for (const [format, taille] of [['ordinateur', { width: 1680, height: 1050 }], ['mobile', { width: 390, height: 844 }]]) {
  test(`captures ${format}`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize(taille);
    const p = (nom) => photo(page, `${nom}-${format}`);
    await demarrer(page);
    await page.locator('button[title="Dépenses"]:visible').first().click({ timeout: 5_000 }).catch(() => {});
    await p('tableau-de-bord');

    await page.locator('button[title="Abonnements"]:visible').first().click();
    await p('abonnements');

    if (format === 'mobile') await page.getByRole('button', { name: /Graphes/ }).locator('visible=true').first().click();
    await page.getByText(/^(Gestion )?Épargne & Projets$/).locator('visible=true').first().click();
    await page.getByRole('button', { name: /^Projets/ }).locator('visible=true').first().click({ timeout: 5_000 }).catch(() => {});
    await p('projets');

    await page.getByRole('button', { name: /^Alertes :/ }).locator('visible=true').first().click();
    await p('alertes');
    await page.keyboard.press('Escape');

    await page.keyboard.press('Control+k');
    await page.keyboard.type('carref');
    await p('recherche');
    await page.keyboard.press('Escape');

    for (const [nom, fichier] of [['Prévisionnel', 'previsionnel'], ['Gérer', 'gerer'], ['Importer', 'importer'], ['Comptes', 'comptes'], ['Tricount', 'tricount']]) {
      await page.getByRole('button', { name: nom, exact: true }).locator('visible=true').first().click();
      await p(fichier);
    }
  });
}
