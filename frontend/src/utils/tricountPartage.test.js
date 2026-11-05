import test from 'node:test';
import assert from 'node:assert/strict';
import { appliquerMontantIndividuel } from './tricountPartage.js';

const depense = { id: 1, libelle: 'Courses', montant: 30, details_montants: { Aude: 10, Theo: 20 } };

test('la part change et le montant devient la somme des parts', () => {
  const resultat = appliquerMontantIndividuel(depense, 'Theo', '25');
  assert.deepEqual(resultat.details_montants, { Aude: 10, Theo: 25 });
  assert.equal(resultat.montant, 35);
  assert.equal(resultat.libelle, 'Courses');
});

test('la virgule est acceptée et les centimes restent justes', () => {
  const resultat = appliquerMontantIndividuel({ details_montants: { Aude: 0.1 } }, 'Theo', '0,2');
  assert.equal(resultat.details_montants.Theo, 0.2);
  assert.equal(resultat.montant, 0.3);
});

test('une saisie vide ou invalide compte pour zéro', () => {
  assert.equal(appliquerMontantIndividuel(depense, 'Theo', '').montant, 10);
  assert.equal(appliquerMontantIndividuel(depense, 'Theo', 'abc').details_montants.Theo, 0);
});

test('la dépense de départ n’est pas modifiée', () => {
  appliquerMontantIndividuel(depense, 'Theo', '99');
  assert.deepEqual(depense.details_montants, { Aude: 10, Theo: 20 });
});

test('une dépense sans parts accepte une première part', () => {
  assert.deepEqual(appliquerMontantIndividuel({}, 'Aude', '5').details_montants, { Aude: 5 });
});
