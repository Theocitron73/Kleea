import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anneesPrevisions, moisPourAnnee } from './anneesPrevisions.js';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((v) => ({ v }));
const LE_22_NOVEMBRE_2026 = new Date(2026, 10, 22);

test("changer d'année place le mois sur le dernier mois avec des données, pas sur celui d'avant", () => {
  const previsions = [{ mois: 'Janvier', annee: 2027 }, { mois: 'Mars', annee: 2027 }, { mois: 'Décembre', annee: 2026 }];
  assert.equal(moisPourAnnee('2027', MOIS, [], previsions, LE_22_NOVEMBRE_2026), 'Mars');
  // Accents ignorés : « Août » en base, « Aout » dans la liste
  assert.equal(moisPourAnnee('2025', MOIS, [{ mois: 'Août', annee: 2025 }], [], LE_22_NOVEMBRE_2026), 'Aout');
});

test("l'année en cours revient au mois en cours, une année vide à janvier", () => {
  assert.equal(moisPourAnnee('2026', MOIS, [], [{ mois: 'Décembre', annee: 2026 }], LE_22_NOVEMBRE_2026), 'Novembre');
  assert.equal(moisPourAnnee('2028', MOIS, [], [], LE_22_NOVEMBRE_2026), 'Janvier');
});

test("une prévision reconduite en janvier de l'année suivante fait apparaître cette année", () => {
  const transactions = [{ mois: 'Novembre', annee: 2026 }, { mois: 'Décembre', annee: 2026 }];
  const previsions = [{ mois: 'Décembre', annee: 2026 }, { mois: 'Janvier', annee: 2027 }];
  assert.deepEqual(anneesPrevisions(transactions, previsions, 2026), ['2026', '2027']);
});

test("l'année en cours est toujours proposée, sans doublon et dans l'ordre", () => {
  assert.deepEqual(anneesPrevisions([{ annee: 2025 }, { annee: '2025' }], [], 2026), ['2025', '2026']);
  assert.deepEqual(anneesPrevisions(undefined, undefined, 2026), ['2026']);
});
