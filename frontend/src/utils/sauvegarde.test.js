import test from 'node:test';
import assert from 'node:assert/strict';
import { dateSauvegarde, lignesApercu, messageErreurSauvegarde, nomFichierSauvegarde } from './sauvegarde.js';

test('le nom du fichier est sûr et daté', () => {
  assert.equal(nomFichierSauvegarde('Théo B', new Date('2026-11-06T10:00:00Z')), 'kleea-sauvegarde-th_o_b-2026-11-06.json');
  assert.equal(nomFichierSauvegarde(null, new Date('2026-11-06T10:00:00Z')), 'kleea-sauvegarde-compte-2026-11-06.json');
});

test('le message du serveur est repris tel quel', () => {
  const detail = 'Cette sauvegarde appartient au compte « aude »';
  assert.equal(messageErreurSauvegarde({ response: { data: { detail } } }), detail);
});

test('sans message du serveur, une erreur reste compréhensible', () => {
  assert.match(messageErreurSauvegarde({ code: 'ECONNABORTED' }), /trop de temps/);
  assert.match(messageErreurSauvegarde({}), /n'a pas pu lire/);
  assert.match(messageErreurSauvegarde({ response: { data: { detail: [{ loc: [] }] } } }), /n'a pas pu lire/);
});

test('le résumé annonce les ajouts et ce qui est déjà présent', () => {
  const lignes = lignesApercu({
    tables: [
      { table: 'transactions', libelle: 'Opérations', a_ajouter: 1200, deja_presents: 3 },
      { table: 'notes', libelle: 'Bloc-notes', a_ajouter: 0, deja_presents: 1 },
      { table: 'budgets', libelle: 'Budgets', a_ajouter: 1, deja_presents: 0 },
    ],
  });
  assert.equal(lignes[0].detail.replace(/\s/g, ' '), '1 200 à ajouter, 3 déjà présents');
  assert.equal(lignes[0].ajout, true);
  assert.equal(lignes[1].detail, '1 déjà présent');
  assert.equal(lignes[1].ajout, false);
  assert.equal(lignes[2].detail, '1 à ajouter');
  assert.deepEqual(lignesApercu(null), []);
});

test('une date absente ou illisible ne s’affiche pas', () => {
  assert.equal(dateSauvegarde({ exporte_le: '2026-11-06T10:00:00+00:00' }), '06/11/2026');
  assert.equal(dateSauvegarde({ exporte_le: 'hier' }), null);
  assert.equal(dateSauvegarde({}), null);
});
