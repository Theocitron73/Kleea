// Objectifs reliés aux projets : date d'atteinte au rythme réel, et effort en plus au curseur.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

// Six mois écoulés à 430 € d'épargne chacun : 1 000 € de salaire, 570 € de dépenses.
const TRANSACTIONS = [];
for (let m = 4; m <= 9; m += 1) {
  const date = (j) => `2026-${String(m + 1).padStart(2, '0')}-${j}`;
  TRANSACTIONS.push({ id: m * 2, date: date('01'), nom: 'Salaire', montant: 1000, categorie: 'Salaire', compte: 'CCP', mois: MOIS[m], annee: 2026 });
  TRANSACTIONS.push({ id: m * 2 + 1, date: date('10'), nom: 'Courses', montant: -570, categorie: 'Courses', compte: 'CCP', mois: MOIS[m], annee: 2026 });
}
const PROJETS = [
  { id: 1, nom: 'Voyage au Japon', cout: 4500, apport_epargne: 1800, date: '2027-09-01', capa: 0, date_debut: '2026-11-01', ordre: 1 },
  { id: 2, nom: 'Vélo électrique', cout: 1600, apport_epargne: 900, date: '2027-03-01', capa: 0, date_debut: '2026-11-01', ordre: 2 },
];

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  const reponses = [
    [/^\/profile\//, { username: UTILISATEUR, email: 't@kleea.test', name: 'T', import_mode: 'manual', role: 'admin' }],
    [/^\/config-comptes\//, [{ compte: 'CCP', groupe: 'Testeur', solde: 20000, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]],
    [/^\/transactions\/stats\/count\//, { count: TRANSACTIONS.length }],
    [/^\/transactions\//, TRANSACTIONS],
    [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }]],
    [/^\/get-projets\//, PROJETS],
    [/^\/powens\/connexion-active/, { connecte: false }],
    [/^\/get-theme\//, null],
    [/^\/get-user-theme\//, {}],
  ];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const chemin = new URL(requete.url()).pathname;
    const trouve = reponses.find(([motif]) => motif.test(chemin));
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : []) });
  });
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00+01:00'));
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Épargne & Projets', exact: true }).locator('visible=true').first().click({ timeout: 30_000 });
  await page.getByRole('button', { name: /Projets/ }).filter({ hasText: /^Projets/ }).locator('visible=true').first().click();
  return erreurs;
}

test('chaque projet a sa date d’atteinte au rythme réel, et le curseur la fait avancer', async ({ page }) => {
  const erreurs = await ouvrir(page);
  const rythme = page.getByRole('region', { name: 'Rythme d\'épargne' });
  await expect(rythme).toContainText('430 € / mois');
  // Le curseur reste caché tant qu'on ne demande pas à simuler.
  await expect(rythme.getByLabel('Effort d\'épargne en plus chaque mois')).toHaveCount(0);

  const japon = page.getByRole('status', { name: 'Objectif Voyage au Japon' });
  const velo = page.getByRole('status', { name: 'Objectif Vélo électrique' });
  await expect(japon).toContainText('À votre rythme : atteint en');
  await expect(velo).toContainText('de retard');
  await expect(velo).toContainText('par mois pour tenir l’échéance');
  const avant = await velo.textContent();
  await page.screenshot({ path: 'test-results/objectifs-projets.png' });

  await rythme.getByRole('button', { name: 'Simuler un effort' }).click();
  await rythme.getByLabel('Effort d\'épargne en plus chaque mois').fill('400');
  await expect(rythme).toContainText('+400 €');
  await expect(velo).toContainText('Avec cet effort');
  await expect(velo).not.toHaveText(avant);
  await page.screenshot({ path: 'test-results/objectifs-projets-simulation.png' });

  // Fermer la simulation remet le rythme réel.
  await rythme.getByRole('button', { name: 'Fermer' }).click();
  await expect(velo).toHaveText(avant);
  expect(erreurs).toEqual([]);
});
