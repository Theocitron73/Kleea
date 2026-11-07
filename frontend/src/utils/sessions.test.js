import test from 'node:test';
import assert from 'node:assert/strict';
import { activiteLisible, deconnexionEnAttente, estMobile, lireMessageDeconnexion, noterDeconnexion } from './sessions.js';

const MAINTENANT = new Date('2026-11-06T12:00:00Z');

test('la dernière activité se lit simplement', () => {
  assert.equal(activiteLisible('2026-11-06T11:59:40Z', MAINTENANT), "À l'instant");
  assert.equal(activiteLisible('2026-11-06T11:48:00Z', MAINTENANT), 'Il y a 12 min');
  assert.equal(activiteLisible('2026-11-06T09:00:00Z', MAINTENANT), 'Il y a 3 h');
  assert.equal(activiteLisible('2026-11-01T09:00:00Z', MAINTENANT), 'Le 01/11/2026');
});

test('une date à venir ou invalide ne produit pas de texte absurde', () => {
  assert.equal(activiteLisible('2026-11-06T12:05:00Z', MAINTENANT), "À l'instant");
  assert.equal(activiteLisible(null, MAINTENANT), 'Activité inconnue');
  assert.equal(activiteLisible('nimporte quoi', MAINTENANT), 'Activité inconnue');
});

test('les téléphones et tablettes sont reconnus à leur nom', () => {
  assert.ok(estMobile('Safari sur iPhone'));
  assert.ok(estMobile('Chrome sur Android'));
  assert.ok(!estMobile('Chrome sur Windows'));
  assert.ok(!estMobile(undefined));
});

function avecStockage(stockage, corps) {
  const avant = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { value: stockage, configurable: true });
  try {
    corps();
  } finally {
    if (avant) Object.defineProperty(globalThis, 'sessionStorage', avant);
    else delete globalThis.sessionStorage;
  }
}

test('le message de déconnexion ne s’affiche qu’une fois', () => {
  const valeurs = new Map();
  avecStockage({
    getItem: (c) => valeurs.get(c) ?? null,
    setItem: (c, v) => valeurs.set(c, v),
    removeItem: (c) => valeurs.delete(c),
  }, () => {
    assert.equal(deconnexionEnAttente(), false);
    noterDeconnexion('Cette session a été déconnectée. Veuillez vous reconnecter.');
    assert.equal(deconnexionEnAttente(), true);
    assert.match(lireMessageDeconnexion(), /déconnectée/);
    assert.equal(lireMessageDeconnexion(), null);
    assert.equal(deconnexionEnAttente(), false);
  });
});

test('une session simplement expirée ne laisse pas ce message', () => {
  const valeurs = new Map();
  avecStockage({ getItem: (c) => valeurs.get(c) ?? null, setItem: (c, v) => valeurs.set(c, v), removeItem: (c) => valeurs.delete(c) }, () => {
    noterDeconnexion('Session expirée, veuillez vous reconnecter');
    noterDeconnexion(undefined);
    assert.equal(lireMessageDeconnexion(), null);
  });
});

test('un stockage bloqué n’empêche pas le retour à la connexion', () => {
  const panne = () => { throw new Error('bloqué'); };
  avecStockage({ getItem: panne, setItem: panne, removeItem: panne }, () => {
    assert.doesNotThrow(() => noterDeconnexion('Cette session a été déconnectée.'));
    assert.equal(deconnexionEnAttente(), false);
    assert.equal(lireMessageDeconnexion(), null);
  });
});
