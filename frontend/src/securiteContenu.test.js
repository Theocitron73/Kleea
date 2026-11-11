// La politique de sécurité du site (vercel.json) : elle ne doit pas s'affaiblir sans qu'un test le signale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const racine = new URL('../', import.meta.url);
const config = JSON.parse(readFileSync(new URL('vercel.json', racine), 'utf8'));
const entetes = Object.fromEntries(config.headers.flatMap((r) => r.headers).map((h) => [h.key, h.value]));
const csp = Object.fromEntries(entetes['Content-Security-Policy'].split(';').map((d) => d.trim().split(/\s+/)).map(([nom, ...v]) => [nom, v]));

test('les scripts ne viennent que du site, sans script en ligne ni eval', () => {
  assert.deepEqual(csp['script-src'], ["'self'"]);
  assert.deepEqual(csp['object-src'], ["'none'"]);
  assert.deepEqual(csp['frame-ancestors'], ["'none'"]);
  assert.deepEqual(csp['base-uri'], ["'self'"]);
});

test('index.html n’a aucun script en ligne, que la CSP bloquerait', () => {
  const html = readFileSync(new URL('index.html', racine), 'utf8');
  for (const balise of html.match(/<script\b[^>]*>/g)) assert.match(balise, /\ssrc="/, balise);
});

test('l’API de production et le suivi des erreurs restent joignables', () => {
  for (const origine of ['https://kleea.onrender.com', 'https://*.sentry.io']) assert.ok(csp['connect-src'].includes(origine), origine);
});

test('les autres en-têtes de sécurité sont là', () => {
  assert.equal(entetes['X-Content-Type-Options'], 'nosniff');
  assert.ok(entetes['Referrer-Policy']);
});
