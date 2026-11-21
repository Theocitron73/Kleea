import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anneesPrevisions } from './anneesPrevisions.js';

test("une prévision reconduite en janvier de l'année suivante fait apparaître cette année", () => {
  const transactions = [{ mois: 'Novembre', annee: 2026 }, { mois: 'Décembre', annee: 2026 }];
  const previsions = [{ mois: 'Décembre', annee: 2026 }, { mois: 'Janvier', annee: 2027 }];
  assert.deepEqual(anneesPrevisions(transactions, previsions, 2026), ['2026', '2027']);
});

test("l'année en cours est toujours proposée, sans doublon et dans l'ordre", () => {
  assert.deepEqual(anneesPrevisions([{ annee: 2025 }, { annee: '2025' }], [], 2026), ['2025', '2026']);
  assert.deepEqual(anneesPrevisions(undefined, undefined, 2026), ['2026']);
});
