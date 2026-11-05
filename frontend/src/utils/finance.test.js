import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  anneeTransaction,
  appliquerMouvement,
  calculerSoldes,
  creerLecteurMouvements,
  estTransfertInterne,
  indexMois,
  nettoyerMois,
  recapParAnnee,
  totauxRevenusDepenses,
  trouverCompteCible,
} from './finance.js';

const cas = JSON.parse(readFileSync(new URL('../../../backend/tests/fixtures/calculs_finances.json', import.meta.url), 'utf8'));

test('cas partagés : détection des virements', () => {
  cas.transferts.forEach(({ nom, categorie, attendu }) => {
    assert.equal(estTransfertInterne(nom, categorie), attendu, `${nom} / ${categorie}`);
  });
});

test('cas partagés : compte destinataire', () => {
  cas.comptes_cibles.cas.forEach(({ texte, source, attendu }) => {
    assert.equal(trouverCompteCible(texte, source, cas.comptes_cibles.comptes), attendu, `${texte} depuis ${source}`);
  });
});

test('cas partagés : soldes, revenus et dépenses', () => {
  const { annee, mois, comptes, transactions, attendu } = cas.soldes;
  const { soldes } = calculerSoldes({ comptes, transactions, annee, moisIndex: mois - 1 });
  assert.deepEqual(soldes, attendu.soldes);

  const duMois = (compte) => transactions.filter(
    (t) => t.compte.toUpperCase() === compte && Number(t.annee) === annee && indexMois(t.mois) === mois - 1,
  );
  Object.keys(attendu.soldes).forEach((compte) => {
    const { revenus, depenses } = totauxRevenusDepenses(duMois(compte));
    assert.equal(revenus, attendu.revenus_du_mois[compte], `revenus ${compte}`);
    assert.equal(depenses, attendu.depenses_du_mois[compte], `dépenses ${compte}`);
  });
});

test('solde au 1er janvier : mouvements des années passées, virements compris', () => {
  const { annee, mois, comptes, transactions } = cas.soldes;
  const { soldesAu1erJanvier } = calculerSoldes({ comptes, transactions, annee, moisIndex: mois - 1 });
  assert.deepEqual(soldesAu1erJanvier, { 'CCP TEST': 1100, 'LEP TEST': 100, 'LIVRET TEST': 500, 'CCP AUTRE': 100 });
});

const COMPTES = [{ compte: 'CCP', groupe: 'T', solde: 1000 }, { compte: 'LEP', groupe: 'T', solde: 0, taux: 4.8 }];
const virement = (montant, mois = 'Janvier', date = '2026-01-10') => ({ compte: 'CCP', montant: -montant, categorie: 'Virement : CCP vers LEP', mois, annee: 2026, date });
const depot = (montant, mois = 'Janvier', date = '2026-01-10') => ({ compte: 'LEP', montant, categorie: 'Virement : CCP vers LEP', mois, annee: 2026, date });

test('virement sans miroir : le compte destinataire est crédité', () => {
  const { soldes } = calculerSoldes({ comptes: COMPTES, transactions: [virement(100)], annee: 2026, moisIndex: 0 });
  assert.deepEqual(soldes, { CCP: 900, LEP: 100 });
});

test('virement avec miroir : pas de double crédit', () => {
  const { soldes } = calculerSoldes({ comptes: COMPTES, transactions: [virement(100), depot(100)], annee: 2026, moisIndex: 0 });
  assert.deepEqual(soldes, { CCP: 900, LEP: 100 });
});

test('le miroir doit être du même mois', () => {
  const transactions = [virement(100), depot(100, 'Février', '2026-02-10')];
  assert.equal(calculerSoldes({ comptes: COMPTES, transactions, annee: 2026, moisIndex: 1 }).soldes.LEP, 200);
});

test('intérêts : un virement avec miroir ne compte pas deux fois', () => {
  const sans = calculerSoldes({ comptes: COMPTES, transactions: [virement(2400)], annee: 2026, moisIndex: 11 }).interets.LEP;
  const avec = calculerSoldes({ comptes: COMPTES, transactions: [virement(2400), depot(2400)], annee: 2026, moisIndex: 11 }).interets.LEP;
  // Dépôt le 10 janvier : valeur à partir de la 2e quinzaine, soit 23 quinzaines à 4,8 %.
  assert.equal(sans, Math.round(2400 * (0.048 / 24) * 23 * 100) / 100);
  assert.equal(avec, sans);
});

test('intérêts : solde reporté, quinzaines et compte non rémunéré', () => {
  const comptes = [{ compte: 'LEP', groupe: 'T', solde: 1000, taux: 2.4 }, { compte: 'CCP', groupe: 'T', solde: 1000 }];
  const { interets } = calculerSoldes({ comptes, transactions: [], annee: 2026, moisIndex: 11 });
  assert.deepEqual(interets, { LEP: 24, CCP: 0 });
  const retrait = [{ compte: 'LEP', montant: -1000, nom: 'Retrait', categorie: 'Autre', mois: 'Janvier', annee: 2026, date: '2026-01-05' }];
  assert.equal(calculerSoldes({ comptes, transactions: retrait, annee: 2026, moisIndex: 11 }).interets.LEP, 0);
});

test('le lecteur ne crédite rien hors virement ou sans compte identifié', () => {
  const lire = creerLecteurMouvements(COMPTES, []);
  assert.deepEqual(lire({ compte: ' ccp ', montant: '-5', nom: 'Achat', categorie: 'Courses' }), { source: 'CCP', montant: -5, cible: null, credit: 0 });
  assert.equal(lire({ compte: 'CCP', montant: -5, categorie: 'Virement : vers inconnu' }).credit, 0);
});

test('appliquer un mouvement ignore les comptes inconnus', () => {
  const soldes = { A: 1 };
  appliquerMouvement(soldes, { source: 'X', montant: 5, cible: 'Y', credit: 5 });
  assert.deepEqual(soldes, { A: 1 });
});

test('mois et années', () => {
  assert.equal(nettoyerMois(' Août '), 'aout');
  assert.equal(nettoyerMois(null), '');
  assert.deepEqual(['Janvier', 'Février', 'Aout', 'Août', 'Décembre', 'x', ''].map(indexMois), [0, 1, 7, 7, 11, -1, -1]);
  assert.equal(anneeTransaction({ annee: 2026 }), '2026');
  assert.equal(anneeTransaction({ date: '2025-03-01T10:00:00' }), '2025');
  assert.equal(anneeTransaction({}), '');
});

test('totaux : un virement n\'est ni un revenu ni une dépense', () => {
  assert.deepEqual(totauxRevenusDepenses([
    { montant: 100, categorie: 'Salaire' },
    { montant: -30, categorie: 'Divers' },
    { montant: -999, categorie: 'Virement : A vers B' },
  ]), { revenus: 100, depenses: 30, epargne: 70 });
});

const COMPTES_RECAP = [
  { compte: 'CCP Perso', groupe: 'Perso', solde: 1000 },
  { compte: 'Livret Perso', groupe: 'Perso', solde: 500 },
  { compte: 'CCP Commun', groupe: 'Commun', solde: 200 },
];
const TX_RECAP = [
  { annee: 2025, mois: 'Mars', compte: 'CCP Perso', nom: 'Salaire', categorie: 'Salaire', montant: 2000 },
  { annee: 2025, mois: 'Mars', compte: 'CCP Perso', nom: 'Courses', categorie: 'Courses', montant: -500 },
  { annee: 2025, mois: 'Avril', compte: 'CCP Perso', nom: 'Virement vers Livret Perso', categorie: 'Virement', montant: -300 },
  { annee: 2027, mois: 'Janvier', compte: 'CCP Perso', nom: 'Salaire', categorie: 'Salaire', montant: 1000 },
  { annee: 2027, mois: 'Janvier', compte: 'CCP Commun', nom: 'Loyer', categorie: 'Logement', montant: -700 },
];

test('recap par année : une ligne par année, même sans transaction, et virements exclus des flux', () => {
  const recap = recapParAnnee({ comptes: COMPTES_RECAP, transactions: TX_RECAP, anneeCourante: 2027 });
  assert.deepEqual(recap.map((r) => r.annee), [2025, 2026, 2027]);
  assert.equal(recap[0].revenus, 2000);
  assert.equal(recap[0].depenses, 500);
  assert.equal(recap[0].epargne, 1500);
  assert.equal(recap[0].tauxEpargne, 75);
  assert.equal(recap[0].soldeDebut, 1700);
  assert.equal(recap[0].soldeFin, 3200);
  assert.equal(recap[1].transactions, 0);
  assert.equal(recap[1].tauxEpargne, null);
  assert.equal(recap[1].soldeFin, 3200);
  assert.equal(recap[2].soldeFin, 3500);
  assert.deepEqual(recap.map((r) => r.enCours), [false, false, true]);
});

test("recap par année : continue jusqu'à l'année en cours et s'adapte au profil", () => {
  const recap = recapParAnnee({ comptes: COMPTES_RECAP, transactions: TX_RECAP, anneeCourante: 2028 });
  assert.equal(recap.at(-1).annee, 2028);
  assert.equal(recap.at(-1).enCours, true);

  const commun = recapParAnnee({ comptes: COMPTES_RECAP, transactions: TX_RECAP, profil: 'Commun', anneeCourante: 2027 });
  assert.deepEqual(commun.map((r) => r.annee), [2027]);
  assert.equal(commun[0].soldeDebut, 200);
  assert.equal(commun[0].depenses, 700);
  assert.equal(commun[0].soldeFin, -500);
});

test("recap par année : sans transaction, seule l'année en cours apparaît", () => {
  const recap = recapParAnnee({ comptes: COMPTES_RECAP, transactions: [], anneeCourante: 2026 });
  assert.equal(recap.length, 1);
  assert.equal(recap[0].soldeDebut, 1700);
  assert.equal(recap[0].soldeFin, 1700);
});

test('recap par année : le solde de fin correspond au solde du 1er janvier suivant', () => {
  const recap = recapParAnnee({ comptes: COMPTES_RECAP, transactions: TX_RECAP, anneeCourante: 2027 });
  recap.forEach(({ annee, soldeFin }) => {
    const { soldesAu1erJanvier } = calculerSoldes({ comptes: COMPTES_RECAP, transactions: TX_RECAP, annee: annee + 1, moisIndex: -1 });
    const total = Object.values(soldesAu1erJanvier).reduce((a, b) => a + b, 0);
    assert.equal(soldeFin, total, String(annee));
  });
});
