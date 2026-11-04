import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculerVentilation,
  depensesParEnveloppe,
  epargneParMois,
  estimerFinancement,
  indexMois,
  moisCibleDepuisFiltres,
  montantsParEnveloppe,
  nomsDesComptes,
  normaliserProjet,
  reserveNette,
} from './epargneProjet.js';

const projet = (id, champs) => normaliserProjet({ id, nom: `P${id}`, cout: 1000, capa: 0, date_debut: '2026-01-01', ...champs });
const ventiler = (projets, epargne, moisCible, disponible = 1_000_000) =>
  calculerVentilation({ projets, epargne, moisCible, disponible });

test('un projet garde sa progression en changeant d\'année', () => {
  const p = projet(1, { cout: 5000, date_debut: '2025-11-01' });
  const { cumulProjets } = ventiler([p], { '2025-11': 100, '2025-12': 200, '2026-01': 300, '2026-02': 400 }, '2026-02');
  assert.equal(cumulProjets['1'], 1000);
});

test('un projet qui commence plus tard dans l\'année n\'est pas relancé par l\'année suivante', () => {
  const p = projet(1, { cout: 5000, date_debut: '2025-11-01' });
  const { cumulProjets } = ventiler([p], { '2025-11': 100, '2026-10': 50, '2026-11': 70 }, '2026-11');
  assert.equal(cumulProjets['1'], 220);
});

test('deux projets stricts ne comptent pas deux fois la même épargne', () => {
  const projets = [
    projet(1, { capa: 100, utiliser_capa_stricte: true }),
    projet(2, { capa: 100, utiliser_capa_stricte: true }),
  ];
  const epargne = Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`2026-${String(i + 1).padStart(2, '0')}`, 100]));
  const { cumulProjets } = ventiler(projets, epargne, '2026-10');
  assert.equal(cumulProjets['1'] + cumulProjets['2'], 1000);
  assert.deepEqual([cumulProjets['1'], cumulProjets['2']], [1000, 0]);
});

test('la capacité stricte plafonne le mois et le reste va au projet suivant', () => {
  const projets = [
    projet(1, { capa: 100, utiliser_capa_stricte: true }),
    projet(2),
  ];
  const { cumulProjets, repartitionProjets } = ventiler(projets, { '2026-01': 300, '2026-02': 300 }, '2026-02');
  assert.deepEqual([cumulProjets['1'], cumulProjets['2']], [200, 400]);
  assert.deepEqual([repartitionProjets['1'], repartitionProjets['2']], [100, 200]);
});

test('l\'ordre décide de la priorité', () => {
  const a = projet(1, { cout: 150 });
  const b = projet(2, { cout: 500 });
  const epargne = { '2026-01': 200 };
  assert.deepEqual(ventiler([a, b], epargne, '2026-01').cumulProjets, { 1: 150, 2: 50 });
  assert.deepEqual(ventiler([b, a], epargne, '2026-01').cumulProjets, { 2: 200, 1: 0 });
});

test('un projet ne reçoit pas l\'épargne d\'avant son début', () => {
  const p = projet(1, { date_debut: '2026-03-01' });
  assert.equal(ventiler([p], { '2026-01': 500, '2026-02': 500, '2026-03': 100 }, '2026-03').cumulProjets['1'], 100);
});

test('un projet à venir ne compte que son apport', () => {
  const p = projet(1, { date_debut: '2027-01-01', apport_epargne: 300 });
  const { cumulProjets, repartitionProjets } = ventiler([p], { '2026-11': 500 }, '2026-11');
  assert.deepEqual([cumulProjets['1'], repartitionProjets['1']], [300, 0]);
});

test('l\'apport est lu dans la bonne colonne et s\'ajoute à l\'épargne', () => {
  const p = projet(1, { apport_epargne: 300 });
  assert.equal(p.apport, 300);
  assert.equal(ventiler([p], { '2026-01': 100 }, '2026-01').cumulProjets['1'], 400);
});

test('un projet est plafonné à son coût', () => {
  const p = projet(1, { cout: 250, apport_epargne: 100 });
  assert.equal(ventiler([p], { '2026-01': 900 }, '2026-01').cumulProjets['1'], 250);
});

test('le total financé ne dépasse jamais le disponible, le prioritaire passe d\'abord', () => {
  const projets = [projet(1), projet(2)];
  const { cumulProjets } = ventiler(projets, { '2026-01': 900 }, '2026-01', 300);
  assert.deepEqual([cumulProjets['1'], cumulProjets['2']], [300, 0]);
  assert.equal(ventiler(projets, { '2026-01': 900 }, '2026-01', -50).cumulProjets['1'], 0);
});

test('un mois négatif ne retire rien, et le reste du mois va aux enveloppes', () => {
  const p = projet(1, { cout: 100 });
  const resultat = ventiler([p], { '2026-01': -500, '2026-02': 300 }, '2026-02');
  assert.equal(resultat.cumulProjets['1'], 100);
  assert.equal(resultat.partEnveloppes, 200);
  assert.deepEqual(ventiler([], {}, '2026-02'), { repartitionProjets: {}, cumulProjets: {}, partProjets: 0, partEnveloppes: 0 });
});

test('l\'épargne mensuelle couvre plusieurs années et ignore virements et autres profils', () => {
  const transactions = [
    { compte: 'CCP T', montant: 1000, mois: 'Décembre', annee: 2025 },
    { compte: 'ccp t ', montant: -400, mois: 'Décembre', annee: 2025 },
    { compte: 'CCP T', montant: -50, mois: 'Décembre', annee: 2025, nom: 'Virement vers LEP' },
    { compte: 'CCP T', montant: -50, mois: 'Décembre', annee: 2025, categorie: '🔄 Epargne' },
    { compte: 'CCP A', montant: 999, mois: 'Décembre', annee: 2025 },
    { compte: 'CCP T', montant: 7, mois: 'Aout', annee: 2024 },
    { compte: 'CCP T', montant: 9, date: '2025-03-14' },
  ];
  const comptes = nomsDesComptes([{ compte: 'CCP T' }]);
  const parMois = epargneParMois({ transactions, comptes, recapAnnuel: [], annee: 2026 });
  assert.deepEqual(parMois, { '2025-12': 600, '2024-08': 7, '2025-03': 9 });
});

test('l\'année affichée reprend le récapitulatif du tableau de bord', () => {
  const parMois = epargneParMois({
    transactions: [{ compte: 'X', montant: 1, mois: 'Janvier', annee: 2026 }],
    comptes: null,
    recapAnnuel: [{ nom: 'Janvier', epargne: 500 }, { nom: 'Février', epargne: '-20' }],
    annee: 2026,
  });
  assert.deepEqual(parMois, { '2026-01': 500, '2026-02': -20 });
});

test('un remboursement réduit le dépensé, et les profils ne se mélangent pas', () => {
  const transactions = [
    { enveloppe: 'Vacances', montant: -200, compte: 'CCP T' },
    { enveloppe: 'vacances ', montant: 50, compte: 'CCP T' },
    { enveloppe: 'Vacances', montant: -999, compte: 'CCP A' },
    { montant: -5, compte: 'CCP T' },
  ];
  assert.deepEqual(depensesParEnveloppe(transactions, nomsDesComptes([{ compte: 'CCP T' }])), {
    vacances: { montant: 150, count: 2 },
  });
  assert.equal(depensesParEnveloppe(transactions, null).vacances.montant, 1149);
});

test('enveloppes : la ligne la plus récente fait foi, sans double compte selon la casse', () => {
  const montants = montantsParEnveloppe([
    { projet: 'Vacances', montant_alloue: 500 },
    { projet: 'vacances', montant_alloue: 900 },
    { projet: 'Urgence', montant_alloue: '100' },
  ]);
  assert.deepEqual(montants, { vacances: 500, urgence: 100 });
});

test('la réserve ignore les dépenses d\'enveloppes supprimées', () => {
  const montants = { vacances: 500 };
  const depenses = { vacances: { montant: 100, count: 1 }, supprimee: { montant: 9000, count: 3 } };
  assert.equal(reserveNette(montants, depenses), 400);
  assert.equal(reserveNette({ a: 10 }, { a: { montant: 50, count: 1 } }), 0);
});

test('la date de fin part d\'aujourd\'hui, pas du début du projet', () => {
  const aujourdhui = new Date(2026, 10, 15);
  const ancien = estimerFinancement({ besoinRestant: 300, mensuel: 100, moisDebut: '2024-01', echeance: '2026-12-01', aujourdhui });
  assert.deepEqual([ancien.dateFin.getFullYear(), ancien.dateFin.getMonth()], [2027, 1]);
  assert.equal(ancien.faisable, false);
  const avenir = estimerFinancement({ besoinRestant: 300, mensuel: 100, moisDebut: '2027-06', echeance: '2028-01-01', aujourdhui });
  assert.deepEqual([avenir.dateFin.getFullYear(), avenir.dateFin.getMonth(), avenir.faisable], [2027, 8, true]);
});

test('estimation : déjà financé, ou sans capacité', () => {
  assert.equal(estimerFinancement({ besoinRestant: 0, mensuel: 0 }).faisable, true);
  assert.deepEqual(estimerFinancement({ besoinRestant: 10, mensuel: 0 }), { dateFin: null, faisable: false });
});

test('noms de mois et filtres', () => {
  assert.equal(indexMois('Août'), 7);
  assert.equal(indexMois('Aout'), 7);
  assert.equal(indexMois('Décembre'), 11);
  assert.equal(indexMois('inconnu'), -1);
  const aujourdhui = new Date(2026, 10, 4);
  assert.equal(moisCibleDepuisFiltres({ annee: 2025, mois: 'Février' }, aujourdhui), '2025-02');
  assert.equal(moisCibleDepuisFiltres({ annee: '2025', mois: '3' }, aujourdhui), '2025-03');
  assert.equal(moisCibleDepuisFiltres({}, aujourdhui), '2026-11');
  assert.equal(moisCibleDepuisFiltres({ annee: 2026, mois: 'n\'importe quoi' }, aujourdhui), '2026-11');
});
