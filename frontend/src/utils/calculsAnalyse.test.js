import test from 'node:test';
import assert from 'node:assert/strict';
import { calculerStatsAnnuellesCategories } from './calculsAnalyse.js';

const comptes = [{ compte: 'CCP', groupe: 'Perso' }];
const op = (date, montant, categorie) => ({ date, montant, categorie, compte: 'CCP', nom: categorie, annee: Number(date.slice(0, 4)) });
const operations = [
  op('2026-03-02', -100, 'Courses'),
  op('2026-11-20', -50, 'Courses'),
  op('2025-03-02', -400, 'Courses'),
  op('2025-06-01', -30, 'Loisirs'),
  op('2026-04-01', 2000, 'Salaire'),
];

test('la répartition d’une année ne compte que les dépenses de cette année', () => {
  const stats = calculerStatsAnnuellesCategories({ comptes, filters: { annee: 2026, profil: 'Perso' }, toutesLesTransactions: operations });
  assert.deepEqual(stats.map(({ name, value }) => [name, value]), [['Courses', 150]]);
});

test('arrêtée à une date, l’année précédente se compare à date égale', () => {
  const stats = calculerStatsAnnuellesCategories({ comptes, filters: { annee: 2025, profil: 'Perso' }, toutesLesTransactions: operations, jusqua: { mois: 4, jour: 15 } });
  assert.deepEqual(stats.map(({ name, value }) => [name, value]), [['Courses', 400]]);
});
