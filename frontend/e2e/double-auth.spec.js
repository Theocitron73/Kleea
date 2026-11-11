// Double authentification par e-mail ou par application : connexion en deux étapes et carte du profil, avec une API simulée.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession, UTILISATEUR } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': 'http://127.0.0.1:5199', 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS' };

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
  await page.getByLabel('Identifiant').fill(UTILISATEUR);
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse1');
  await page.getByLabel('Mot de passe', { exact: true }).press('Enter');
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
  // Connecté, sans que le jeton soit rangé dans le navigateur : il reste dans le cookie HttpOnly de l'API.
  expect(await page.evaluate(() => [localStorage.getItem('user'), localStorage.getItem('token')])).toEqual([UTILISATEUR, null]);
  expect(recus[1]).toEqual({ jeton: 'etape', code: '123456' });
});

test('un compte sans double authentification se connecte comme avant', async ({ page }) => {
  await brancherApi(page);
  await simuler(page, { '/login': () => [200, { access_token: 'session', user: UTILISATEUR, role: 'user' }] });
  await saisirMotDePasse(page);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('user')), { timeout: 30_000 }).toBe(UTILISATEUR);
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
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
      ? [200, { methode: corps.methode, email_masque: 't***@kleea.test' }]
      : [400, { detail: 'Mot de passe incorrect.' }]),
    '/api/double-auth/activer': () => {
      active = true;
      return [200, { status: 'success' }];
    },
  });
  const carte = page.getByRole('region', { name: 'Double authentification' });
  await expect(carte.getByText('Facultative.')).toBeVisible({ timeout: 30_000 });

  await carte.getByRole('button', { name: 'Activer' }).click();
  await carte.getByLabel('Par e-mail').check();
  await carte.getByLabel('Votre mot de passe').fill('faux');
  await carte.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByText('Mot de passe incorrect.')).toBeVisible();

  await carte.getByLabel('Votre mot de passe').fill('motdepasse1');
  await carte.getByRole('button', { name: 'Continuer' }).click();
  await expect(carte.getByText('t***@kleea.test')).toBeVisible();
  await carte.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/double-auth-code.png' });
  await carte.getByLabel('Code reçu par e-mail').fill('123456');
  await carte.getByRole('button', { name: "Confirmer l'activation" }).click();

  await expect(carte.getByText('Activée : un code vous est envoyé')).toBeVisible();
  await expect(carte.getByRole('button', { name: 'Désactiver' })).toBeVisible();
});

test('activer avec une application montre la clé et le lien, sans e-mail', async ({ page }) => {
  let active = false;
  const preparations = [];
  await ouvrirProfil(page, {
    '/api/double-auth': () => [200, { disponible: true, active, methode: active ? 'application' : null }],
    '/api/double-auth/preparer': (corps) => {
      preparations.push(corps.methode);
      return [200, { methode: 'application', secret: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', adresse: 'otpauth://totp/Kleea:testeur?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Kleea' }];
    },
    '/api/double-auth/activer': () => {
      active = true;
      return [200, { status: 'success' }];
    },
  });
  const carte = page.getByRole('region', { name: 'Double authentification' });
  await carte.getByRole('button', { name: 'Activer' }).click({ timeout: 30_000 });
  // L'application est proposée en premier.
  await expect(carte.getByLabel('Application d’authentification')).toBeChecked();
  await carte.getByLabel('Votre mot de passe').fill('motdepasse1');
  await carte.getByRole('button', { name: 'Continuer' }).click();
  await expect(carte.getByLabel('Clé de l’application d’authentification')).toHaveText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP');
  await expect(carte.getByRole('img', { name: 'QR code à scanner avec votre application d’authentification' })).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(carte.getByRole('link', { name: 'Ouvrir dans l’application d’authentification' })).toHaveAttribute('href', /^otpauth:\/\/totp\/Kleea:testeur\?secret=/);
  await carte.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/double-auth-application.png' });
  await carte.getByLabel('Code de l’application').fill('123456');
  await carte.getByRole('button', { name: "Confirmer l'activation" }).click();
  await expect(carte.getByText('Activée : chaque connexion demande le code affiché par votre application')).toBeVisible();
  expect(preparations).toEqual(['application']);
});

test('à la connexion, le code vient de l’application : aucun renvoi par e-mail', async ({ page }) => {
  await brancherApi(page);
  await simuler(page, {
    '/login': () => [200, { status: 'double_auth', double_auth_requise: true, methode: 'application', jeton_double_auth: 'etape', email_masque: null }],
    '/login/double-auth': (corps) => [200, { access_token: 'session', user: UTILISATEUR, role: 'user', ...corps }],
  });
  await saisirMotDePasse(page);
  await expect(page.getByText('Saisissez le code à 6 chiffres affiché par votre application d’authentification.')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Renvoyer un code' })).toHaveCount(0);
  await page.getByLabel('Code de vérification').fill('123456');
  await page.getByRole('button', { name: 'Vérifier' }).click();
  await expect(page.getByLabel('Code de vérification')).toBeHidden({ timeout: 30_000 });
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
