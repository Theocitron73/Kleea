import test from 'node:test';
import assert from 'node:assert/strict';
import { rechercher } from './rechercheGlobale.js';

const op = (id, nom, date, categorie = 'Divers', compte = 'CCP', mois = 'Novembre') => ({ id, nom, date, categorie, compte, mois, annee: Number(date.slice(0, 4)), montant: -10 });
const TRANSACTIONS = [
  op(1, 'NETFLIX COM', '2026-10-05', 'Abonnements', 'CCP', 'Octobre'),
  op(2, 'NETFLIX COM', '2026-11-05', 'Abonnements'),
  op(3, 'Café Crème', '2026-11-01', 'Sorties'),
  op(4, 'Loyer', '2025-12-02', 'Logement', 'CCP', 'Décembre'),
];
const COMPTES = [{ compte: 'Compte courant' }, { compte: 'Livret Été' }];
const chercher = (q) => rechercher(q, { transactions: TRANSACTIONS, comptes: COMPTES });

test('une requête trop courte ne renvoie rien', () => {
  assert.deepEqual(chercher('n'), { operations: [], categories: [], comptes: [] });
  assert.deepEqual(chercher('  '), { operations: [], categories: [], comptes: [] });
});

test('la casse et les accents sont ignorés, dans les deux sens', () => {
  assert.deepEqual(chercher('cafe creme').operations.map((t) => t.id), [3]);
  assert.deepEqual(chercher('CAFÉ').operations.map((t) => t.id), [3]);
  assert.deepEqual(chercher('ete').comptes.map((c) => c.compte), ['Livret Été']);
});

test('les opérations les plus récentes passent en premier, sans modifier la liste d’origine', () => {
  assert.deepEqual(chercher('netflix').operations.map((t) => t.id), [2, 1]);
  assert.equal(TRANSACTIONS[0].id, 1);
});

test('le nombre d’opérations affichées est limité', () => {
  const beaucoup = Array.from({ length: 20 }, (_, i) => op(i, 'Achat', '2026-01-01'));
  assert.equal(rechercher('achat', { transactions: beaucoup }).operations.length, 8);
});

test('une catégorie apparaît une fois, avec son total et sa période la plus récente', () => {
  assert.deepEqual(chercher('abonn').categories, [{ categorie: 'Abonnements', compte: 'CCP', mois: 'Novembre', annee: '2026', nombre: 2 }]);
});

test('une opération sans champ année garde celle de sa date', () => {
  const { annee: _annee, ...sansAnnee } = op(9, 'Achat', '2024-03-01');
  assert.equal(rechercher('achat', { transactions: [sansAnnee] }).operations[0].annee, '2024');
});

test('des champs manquants ne cassent pas la recherche', () => {
  assert.deepEqual(rechercher('xx', { transactions: [{ id: 1 }], comptes: [{}] }), { operations: [], categories: [], comptes: [] });
  assert.deepEqual(rechercher('xx', {}), { operations: [], categories: [], comptes: [] });
});
