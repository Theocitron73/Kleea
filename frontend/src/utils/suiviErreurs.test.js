import assert from 'node:assert/strict';
import { test } from 'node:test';

import { demarrerSuiviErreurs, nettoyerEvenement, signalerErreur } from './suiviErreurs.js';

test('sans DSN, le suivi reste inactif et ne fait rien', async () => {
  assert.equal(await demarrerSuiviErreurs(''), false);
  assert.equal(await demarrerSuiviErreurs(undefined), false);
  assert.doesNotThrow(() => signalerErreur(new Error('test')));
});

test('rien d\'identifiant ne part', () => {
  const evenement = nettoyerEvenement({
    user: { email: 'theo@exemple.fr' },
    breadcrumbs: [{ data: { url: '/transactions/theo' } }],
    extra: { solde: 1234 },
    request: {
      url: 'https://kleea.fr/?code=secret&state=jeton#ancre',
      headers: { Authorization: 'Bearer secret' },
      cookies: 'session=secret',
      query_string: 'code=secret',
    },
    exception: {
      values: [{
        type: 'TypeError',
        stacktrace: { frames: [{ filename: 'https://kleea.fr/app.js?v=1', vars: { montant: 12 } }] },
      }],
    },
  });
  assert.deepEqual(evenement, {
    request: { url: 'https://kleea.fr/' },
    exception: { values: [{ type: 'TypeError', stacktrace: { frames: [{ filename: 'https://kleea.fr/app.js' }] } }] },
  });
});

test('un événement minimal reste valide', () => {
  assert.deepEqual(nettoyerEvenement({ message: 'x' }), { message: 'x' });
});
