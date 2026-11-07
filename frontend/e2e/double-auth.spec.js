// Double authentification par e-mail : connexion en deux étapes et carte du profil, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession, UTILISATEUR } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

async function simuler(page, reponses) {
  await page.route(/http:\/\/api\.kleea\.test\/(login|api\/double-auth)/, (route) => {
    const requete = route.request();
    const chemin = new URL(requete.url()).pathname;
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    const [status, corps] = reponses[chemin](requete.method() === 'GET' ? null : requete.postDataJSON());
    return route.fulfill({ status, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
  });
}

async function saisirMotDePasse(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Se connecter' }).first().click();
  await page.getByPlaceholder('Pseudo ou Adresse e-mail').fill(UTILISATEUR);
  await page.getByPlaceholder('••••••••').fill('motdepasse1');
  await page.getByRole('button', { name: 'Se connecter' }).click();
}

test('un compte qui l’a activée passe par le code reçu avant d’être connecté', async ({ page }) => {
  const recus = [];
  let renvois = 0;
  await brancherApi(page);
  await simuler(page, {
    '/login': () => [200, { double_auth_requise: true, jeton_double_auth: 'etape', email_masque: 't***@kleea.test' }],
    '/login/double-auth/renvoyer': () => {
      renvois += 1;
      return [200, { email_masque: 't***@kleea.test' }];
    },
    '/login/double-auth': (corps) => {
      recus.push(corps);
      return corps.code === '123456'
        ? [200, { access_token: 'session', user: UTILISATEUR, role: 'user' }]
        : [401, { detail: 'Code incorrect ou expiré.' }];
    },
  });
  await saisirMotDePasse(page);

  const champ = page.getByLabel('Code de vérification');
  await expect(champ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('t***@kleea.test')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

  await page.getByRole('button', { name: 'Renvoyer un code' }).click();
  await expect.poll(() => renvois).toBe(1);

  await champ.fill('000000');
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.getByText('Code incorrect ou expiré.')).toBeVisible();
  await expect(champ).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();

  await champ.fill('123456');
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(champ).toBeHidden({ timeout: 30_000 });
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBe('session');
  expect(recus[1]).toEqual({ jeton: 'etape', code: '123456' });
});

test('un compte sans double authentification se connecte comme avant', async ({ page }) => {
  await brancherApi(page);
  await simuler(page, { '/login': () => [200, { access_token: 'session', user: UTILISATEUR, role: 'user' }] });
  await saisirMotDePasse(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('token')), { timeout: 30_000 }).toBe('session');
  await expect(page.getByLabel('Code de vérification')).toHaveCount(0);
});

async function ouvrirProfil(page, reponses) {
  await brancherApi(page);
  await simuler(page, reponses);
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByTitle('Accéder à mon profil et aux réglages').click({ timeout: 30_000 });
}

test('activer depuis le profil demande le mot de passe puis le code reçu', async ({ page }) => {
  let active = false;
  await ouvrirProfil(page, {
    '/api/double-auth': () => [200, { disponible: true, active }],
    '/api/double-auth/preparer': (corps) => (corps.password === 'motdepasse1'
      ? [200, { email_masque: 't***@kleea.test' }]
      : [400, { detail: 'Mot de passe incorrect.' }]),
    '/api/double-auth/activer': () => {
      active = true;
      return [200, { status: 'success' }];
    },
  });
  const carte = page.getByRole('region', { name: 'Double authentification' });
  await expect(carte.getByText('Facultative.')).toBeVisible({ timeout: 30_000 });

  await carte.getByRole('button', { name: 'Activer' }).click();
  await carte.getByLabel('Votre mot de passe').fill('faux');
  await carte.getByRole('button', { name: 'Recevoir un code' }).click();
  await expect(page.getByText('Mot de passe incorrect.')).toBeVisible();

  await carte.getByLabel('Votre mot de passe').fill('motdepasse1');
  await carte.getByRole('button', { name: 'Recevoir un code' }).click();
  await expect(carte.getByText('t***@kleea.test')).toBeVisible();
  await carte.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/double-auth-code.png' });
  await carte.getByLabel('Code reçu par e-mail').fill('123456');
  await carte.getByRole('button', { name: "Confirmer l'activation" }).click();

  await expect(carte.getByText('Activée : un code vous est envoyé')).toBeVisible();
  await expect(carte.getByRole('button', { name: 'Désactiver' })).toBeVisible();
});

test('désactiver demande le mot de passe', async ({ page }) => {
  const recus = [];
  await ouvrirProfil(page, {
    '/api/double-auth': () => [200, { disponible: true, active: true }],
    '/api/double-auth/desactiver': (corps) => {
      recus.push(corps);
      return [200, { status: 'success' }];
    },
  });
  const carte = page.getByRole('region', { name: 'Double authentification' });
  await carte.getByRole('button', { name: 'Désactiver' }).click({ timeout: 30_000 });
  await carte.getByLabel('Votre mot de passe').fill('motdepasse1');
  await carte.getByRole('button', { name: 'Confirmer la désactivation' }).click();
  await expect(carte.getByRole('button', { name: 'Activer' })).toBeVisible();
  expect(recus).toEqual([{ password: 'motdepasse1' }]);
});

test('sans la migration, la carte reste cachée', async ({ page }) => {
  await ouvrirProfil(page, { '/api/double-auth': () => [200, { disponible: false, active: false }] });
  await expect(page.getByRole('region', { name: 'Appareils connectés' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('region', { name: 'Double authentification' })).toHaveCount(0);
});
