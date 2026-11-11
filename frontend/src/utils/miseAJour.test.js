import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appliquerQuandCachee } from './miseAJour.js';

function faussePage(visibilityState) {
  const ecouteurs = new Set();
  return {
    visibilityState,
    addEventListener: (_, f) => ecouteurs.add(f),
    removeEventListener: (_, f) => ecouteurs.delete(f),
    changer(etat) { this.visibilityState = etat; [...ecouteurs].forEach((f) => f()); },
    ecouteurs,
  };
}

test('page à l’écran : la mise à jour attend qu’elle soit cachée', () => {
  const page = faussePage('visible');
  let appels = 0;
  appliquerQuandCachee(() => { appels += 1; }, page);
  assert.equal(appels, 0);
  page.changer('visible');
  assert.equal(appels, 0);
  page.changer('hidden');
  assert.equal(appels, 1);
  page.changer('visible');
  page.changer('hidden');
  assert.equal(appels, 1);
  assert.equal(page.ecouteurs.size, 0);
});

test('page déjà en arrière-plan : la mise à jour s’applique tout de suite', () => {
  const page = faussePage('hidden');
  let appels = 0;
  appliquerQuandCachee(() => { appels += 1; }, page);
  assert.equal(appels, 1);
});
