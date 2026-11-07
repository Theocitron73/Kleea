import test from 'node:test';
import assert from 'node:assert/strict';
import { appliquerMontantIndividuel, avecAuteur, descriptionDuLien, formaterExpiration, lignesHistorique, preparerEdition, refusDuLien, repartirEquitablement, totalDesPartsCentimes } from './tricountPartage.js';

const depense = { id: 1, libelle: 'Courses', montant: 30, details_montants: { Aude: 10, Theo: 20 } };
const MEMBRES = ['Aude', 'Theo', 'Zoe'];

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

test('le partage égal garde une somme exacte', () => {
  assert.deepEqual(repartirEquitablement(10, MEMBRES), { Aude: 3.34, Theo: 3.33, Zoe: 3.33 });
  const sept = repartirEquitablement(100, ['a', 'b', 'c', 'd', 'e', 'f', 'g']);
  assert.equal(totalDesPartsCentimes(sept), 10000);
});

test('l’édition lit le format de l’API', () => {
  const edition = preparerEdition({ id: 3, libelle: 'Train', paye_par: 'Aude', montant: '30', date: '2026-11-02T00:00:00', pour_qui: 'Aude:10,Theo:20' }, MEMBRES);
  assert.equal(edition.libellé, 'Train');
  assert.equal(edition.payé_par, 'Aude');
  assert.equal(edition.date, '2026-11-02');
  assert.equal(edition.montant, 30);
  assert.deepEqual(edition.details_montants, { Aude: 10, Theo: 20, Zoe: 0 });
});

test('« Tous » partage entre tous les membres', () => {
  assert.deepEqual(preparerEdition({ montant: 9, pour_qui: 'Tous' }, MEMBRES).details_montants, { Aude: 3, Theo: 3, Zoe: 3 });
  assert.deepEqual(preparerEdition({ montant: 9 }, MEMBRES).details_montants, { Aude: 3, Theo: 3, Zoe: 3 });
});

test('une liste de noms partage entre ces seules personnes', () => {
  assert.deepEqual(preparerEdition({ montant: 10, pour_qui: 'Aude, Zoe' }, MEMBRES).details_montants, { Aude: 5, Theo: 0, Zoe: 5 });
});

test('un lien expiré, révoqué ou inconnu a son propre message', () => {
  assert.match(refusDuLien(410, { detail: { code: 'lien_expire' } }).titre, /expiré/);
  assert.match(refusDuLien(410, { detail: { code: 'lien_revoque' } }).titre, /plus actif/);
  assert.match(refusDuLien(404, { detail: { code: 'lien_introuvable' } }).titre, /introuvable/);
});

test('un refus sans code lisible reste compréhensible', () => {
  assert.match(refusDuLien(404, null).titre, /introuvable/);
  assert.match(refusDuLien(410, { detail: 'texte' }).titre, /introuvable/);
});

test('les autres erreurs ne sont pas des refus du lien', () => {
  for (const statut of [200, 403, 422, 500]) assert.equal(refusDuLien(statut, {}), null);
});

test('le propriétaire lit l’état de son lien', () => {
  assert.match(descriptionDuLien({ token: null }), /pas de lien actif/);
  assert.match(descriptionDuLien(null), /pas de lien actif/);
  assert.match(descriptionDuLien({ token: 'x', statut: 'actif', expire_le: null }), /Sans date limite/);
  assert.match(descriptionDuLien({ token: 'x', statut: 'actif', expire_le: '2026-12-01T12:00:00+00:00' }), /expire le 01\/12\/2026/);
  assert.match(descriptionDuLien({ token: 'x', statut: 'expire', expire_le: '2026-10-01T12:00:00+00:00' }), /a expiré le 01\/10\/2026/);
});

test('un lien sans date limite n’affiche pas d’expiration', () => {
  assert.equal(formaterExpiration(null), '');
});

test('le nom n’est envoyé que s’il est saisi', () => {
  assert.deepEqual(avecAuteur({ id: 1 }, '  Zoé '), { id: 1, auteur: 'Zoé' });
  assert.deepEqual(avecAuteur({ id: 1 }, '   '), { id: 1 });
  assert.deepEqual(avecAuteur({ id: 1 }, undefined), { id: 1 });
});

const VALEUR = { date: '2026-11-02', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:30', montant: 30 };

test('une modification ne montre que les champs changés', () => {
  const lignes = lignesHistorique({ ancienne_valeur: VALEUR, nouvelle_valeur: { ...VALEUR, montant: 35.5, libelle: 'Train' } });
  assert.deepEqual(lignes.map((l) => [l.libelle, l.avant, l.apres]), [['Désignation', 'Courses', 'Train'], ['Montant', '30.00 €', '35.50 €']]);
});

test('un ajout n’a que des nouvelles valeurs, une suppression que des anciennes', () => {
  const ajout = lignesHistorique({ ancienne_valeur: null, nouvelle_valeur: VALEUR });
  assert.equal(ajout.length, 5);
  assert.ok(ajout.every((l) => l.avant === null && l.apres));
  assert.ok(ajout.some((l) => l.apres === '02/11/2026'));
  const suppression = lignesHistorique({ ancienne_valeur: VALEUR, nouvelle_valeur: null });
  assert.equal(suppression.length, 5);
  assert.ok(suppression.every((l) => l.apres === null && l.avant));
});
