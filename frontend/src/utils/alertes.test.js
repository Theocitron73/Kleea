import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerAlertes } from './alertes.js';

const AUJOURDHUI = new Date('2026-11-06T12:00:00');
const COMPTES = [{ compte: 'CCP', groupe: 'Perso', solde: 500, taux: 0 }, { compte: 'Livret', groupe: 'Perso', solde: 2000, taux: 1 }];
const alertes = (donnees) => calculerAlertes({ comptes: COMPTES, transactions: [], aujourdhui: AUJOURDHUI, ...donnees });
const types = (liste) => liste.map((a) => a.type);
const prevision = (id, date, montant, compte = 'CCP', actif = true) => ({ id, date, montant, compte, nom: `[PRÉVI] ${id}`, actif });
const depense = (montant, categorie, mois = 'Novembre', annee = 2026, compte = 'CCP') => ({ montant: -montant, categorie, mois, annee, compte, date: '2026-11-02', nom: 'x' });

test('sans donnée, aucune alerte', () => {
  assert.deepEqual(alertes({}), []);
  assert.deepEqual(calculerAlertes({ aujourdhui: AUJOURDHUI }), []);
});

test('une banque expirée est critique, une expiration proche demande attention', () => {
  const liste = alertes({ connexions: [
    { id: 1, connector_name: 'Bourso', needs_reconnect: true, days_left: 30 },
    { id: 2, connector_name: 'Revolut', days_left: 0 },
    { id: 3, connector_name: 'LBP', days_left: 5 },
    { id: 4, connector_name: 'CIC', days_left: 90 },
  ] });
  assert.deepEqual(liste.map((a) => [a.id, a.gravite]), [['banque:1:expiree', 'critique'], ['banque:2:expiree', 'critique'], ['banque:3:bientot', 'attention']]);
  assert.equal(liste[0].page, 'profile');
  assert.equal(liste[0].titre, 'Bourso à reconnecter');
});

test('des transactions à importer alertent seulement si une banque est connectée', () => {
  const connexions = [{ id: 1, connector_name: 'Bourso', days_left: 90 }];
  assert.deepEqual(alertes({ aImporter: { CCP: 3 } }), []);
  assert.deepEqual(alertes({ connexions: [], aImporter: { CCP: 3 } }), []);
  assert.deepEqual(alertes({ connexions, aImporter: {} }), []);
  assert.deepEqual(alertes({ connexions, aImporter: { CCP: 0 } }), []);
  const [une] = alertes({ connexions, aImporter: { CCP: 1, Livret: 0 } });
  assert.deepEqual([une.id, une.titre, une.detail, une.page, une.gravite], ['import:1', '1 transaction à importer', 'Sur CCP.', 'importer', 'attention']);
  const [plusieurs] = alertes({ connexions, aImporter: { CCP: 2, Livret: 3 } });
  assert.deepEqual([plusieurs.id, plusieurs.titre, plusieurs.detail], ['import:5', '5 transactions à importer', 'Sur 2 comptes.']);
});

test('le nombre à importer est lu comme le renvoie le serveur, objet ou nombre', () => {
  const connexions = [{ id: 1, connector_name: 'Bourso', days_left: 90 }];
  const [a] = alertes({ connexions, aImporter: { 'CCP Aude': { count: 18 }, Revolut: { count: 1 }, Vide: { count: 0 }, Texte: '2' } });
  assert.deepEqual([a.id, a.titre, a.detail], ['import:21', '21 transactions à importer', 'Sur 3 comptes.']);
});

test('une synchronisation en échec alerte seulement en mode automatique', () => {
  const synchro = { dernier_succes: '2026-11-04T05:00:00Z', dernier_echec: '2026-11-06T05:00:00Z' };
  assert.deepEqual(alertes({ synchro, modeAuto: false }), []);
  const [a] = alertes({ synchro, modeAuto: true });
  assert.equal(a.id, 'synchro:echec:2026-11-06');
  assert.equal(a.gravite, 'critique');
});

test('un succès plus récent efface un ancien échec', () => {
  assert.deepEqual(alertes({ modeAuto: true, synchro: { dernier_succes: '2026-11-06T05:00:00Z', dernier_echec: '2026-11-01T05:00:00Z' } }), []);
});

test('une panne silencieuse est repérée au bout de trois jours', () => {
  assert.deepEqual(alertes({ modeAuto: true, synchro: { dernier_succes: '2026-11-04T05:00:00Z' } }), []);
  const [a] = alertes({ modeAuto: true, synchro: { dernier_succes: '2026-11-01T05:00:00Z' } });
  assert.equal(a.id, 'synchro:ancienne:2026-11-01');
  assert.equal(a.gravite, 'attention');
});

test('un compte jamais synchronisé ne déclenche rien', () => {
  assert.deepEqual(alertes({ modeAuto: true, synchro: null }), []);
});

test('un budget alerte à 80 %, puis au dépassement', () => {
  const budgets = [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous' }];
  // À 79 %, pas encore d'alerte « proche » (le rythme du mois, lui, peut alerter).
  assert.deepEqual(alertes({ budgets, transactions: [depense(79, 'Courses')] }).filter((a) => !a.id.endsWith(':rythme')), []);
  const [proche] = alertes({ budgets, transactions: [depense(80, 'Courses')] });
  assert.equal(proche.id, 'budget:Courses:2026-11:proche');
  assert.equal(proche.gravite, 'attention');
  const [depasse] = alertes({ budgets, transactions: [depense(120, 'Courses')] });
  assert.equal(depasse.id, 'budget:Courses:2026-11:depasse');
  assert.equal(depasse.gravite, 'critique');
});

test('seuls le mois en cours et les bons comptes comptent pour un budget', () => {
  const budgets = [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'CCP' }];
  assert.deepEqual(alertes({ budgets, transactions: [depense(200, 'Courses', 'Octobre'), depense(200, 'Courses', 'Novembre', 2025), depense(200, 'Courses', 'Novembre', 2026, 'Livret')] }), []);
  assert.deepEqual(alertes({ budgets: [{ ...budgets[0], mois: 'Octobre' }], transactions: [depense(200, 'Courses')] }), []);
});

test('une opération sans champ année compte d’après sa date', () => {
  const budgets = [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous' }];
  const { annee: _annee, ...sansAnnee } = depense(120, 'Courses');
  assert.equal(alertes({ budgets, transactions: [sansAnnee] }).length, 1);
});

test('un remboursement ne compte pas comme une dépense', () => {
  const budgets = [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous' }];
  assert.deepEqual(alertes({ budgets, transactions: [{ ...depense(0, 'Courses'), montant: 500 }] }), []);
});

test('plusieurs budgets d’une même catégorie s’additionnent', () => {
  const budgets = [
    { nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'CCP' },
    { nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'Livret' },
  ];
  assert.deepEqual(alertes({ budgets, transactions: [depense(120, 'Courses')] }).filter((a) => !a.id.endsWith(':rythme')), []);
});

test('un découvert prévu ce mois-ci est critique, plus tard il demande attention', () => {
  const [ceMois] = alertes({ previsions: [prevision(1, '2026-11-20', -600)] });
  assert.equal(ceMois.id, 'decouvert:CCP:2026-11');
  assert.equal(ceMois.gravite, 'critique');
  assert.match(ceMois.detail, /-100,00 €.*novembre/);
  const [plusTard] = alertes({ previsions: [prevision(1, '2026-12-20', -600)] });
  assert.equal(plusTard.id, 'decouvert:CCP:2026-12');
  assert.equal(plusTard.gravite, 'attention');
});

test('un revenu prévu le même jour compense une dépense', () => {
  assert.deepEqual(alertes({ previsions: [prevision(1, '2026-11-20', -600), prevision(2, '2026-11-20', 300)] }), []);
});

test('un passage sous zéro avant un revenu du même mois est signalé avec son jour', () => {
  const [alerte] = alertes({ previsions: [prevision(1, '2026-11-20', -600), prevision(2, '2026-11-25', 300)] });
  assert.equal(alerte.id, 'decouvert:CCP:2026-11');
  assert.equal(alerte.gravite, 'attention');
  assert.equal(alerte.titre, 'Solde de CCP sous zéro le 20 novembre');
  assert.match(alerte.detail, /-100,00 €.*remonter le 25 novembre/);
});

test('un découvert du mois en cours donne le jour où le solde passe sous zéro', () => {
  const [alerte] = alertes({ previsions: [prevision(1, '2026-11-12', -300), prevision(2, '2026-11-27', -400)] });
  assert.equal(alerte.titre, 'Découvert prévu sur CCP');
  assert.match(alerte.detail, /dès le 27 novembre, -200,00 € estimés fin novembre/);
});

test('une prévision désactivée, passée ou déjà réglée ne compte pas', () => {
  assert.deepEqual(alertes({ previsions: [prevision(1, '2026-11-20', -600, 'CCP', false)] }), []);
  assert.deepEqual(alertes({ previsions: [prevision(1, '2026-11-01', -600)] }), []);
  const reglee = { montant: -600, prevision_id: 1, mois: 'Novembre', annee: 2026, compte: 'Autre', date: '2026-11-02', nom: 'x', categorie: 'y' };
  assert.deepEqual(alertes({ previsions: [prevision(1, '2026-11-20', -600)], transactions: [reglee] }), []);
});

test('chaque compte est suivi séparément, avec une seule alerte', () => {
  const liste = alertes({ previsions: [prevision(1, '2026-11-20', -600), prevision(2, '2026-12-20', -600), prevision(3, '2026-11-20', -100, 'Livret')] });
  assert.deepEqual(liste.map((a) => a.id), ['decouvert:CCP:2026-11']);
});

test('les alertes critiques passent en premier', () => {
  const liste = alertes({
    connexions: [{ id: 3, connector_name: 'LBP', days_left: 5 }],
    budgets: [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous' }],
    transactions: [depense(150, 'Courses')],
  });
  assert.deepEqual(types(liste), ['budget', 'banque']);
});

test('le 80 % d’un budget donne le jour du mois', () => {
  const budgets = [{ nom: 'Courses', somme: 100, mois: 'Novembre', annee: 2026, compte: 'tous' }];
  const [proche] = alertes({ budgets, transactions: [depense(80, 'Courses')] });
  assert.equal(proche.titre, 'Budget Courses à 80 % au 6 novembre');
});

test('un budget dépensé trop vite alerte avant les 80 %, d’après le rythme du mois', () => {
  const budgets = [{ nom: 'Courses', somme: 300, mois: 'Novembre', annee: 2026, compte: 'tous' }];
  const le12 = new Date('2026-11-12T12:00:00');
  // 165 € au 12 sur 30 jours : 412,50 € à ce rythme pour 300 € prévus.
  const [rythme] = calculerAlertes({ comptes: COMPTES, budgets, transactions: [depense(165, 'Courses')], aujourdhui: le12 });
  assert.equal(rythme.id, 'budget:Courses:2026-11:rythme');
  assert.equal(rythme.titre, 'Budget Courses : 55 % dépensé au 12 novembre');
  assert.match(rythme.detail, /412,50 € fin novembre pour 300,00 €/);
  // Au même rythme que le mois, ou trop tôt dans le mois : rien.
  assert.deepEqual(calculerAlertes({ comptes: COMPTES, budgets, transactions: [depense(120, 'Courses')], aujourdhui: le12 }), []);
  assert.deepEqual(calculerAlertes({ comptes: COMPTES, budgets, transactions: [depense(165, 'Courses')], aujourdhui: new Date('2026-11-03T12:00:00') }), []);
});
