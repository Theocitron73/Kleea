// Appareils connectés dans le profil, avec une API simulée.
import { test, expect } from '@playwright/test';
import { UTILISATEUR, ouvrirSession } from './api-simulee.js';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const SESSIONS = [
  { id: 'ici', appareil: 'Chrome sur Windows', cree_le: '2026-11-05T09:00:00Z', derniere_activite: '2026-11-06T09:00:00Z', actuelle: true },
  { id: 'tel', appareil: 'Safari sur iPhone', cree_le: '2026-11-04T09:00:00Z', derniere_activite: '2026-11-06T08:45:00Z', actuelle: false },
  { id: 'pc', appareil: 'Firefox sur Linux', cree_le: '2026-11-03T09:00:00Z', derniere_activite: '2026-11-05T08:00:00Z', actuelle: false },
];

/** `serveur.revoquee = true` fait répondre 401 à toutes les requêtes suivantes, comme pour une session coupée ailleurs. */
async function ouvrir(page, { disponible = true, suivie = true, sessionUneFois = false } = {}) {
  const serveur = { sessions: [...SESSIONS], appels: [], revoquee: false };
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    const url = new URL(requete.url());
    const json = (corps, status = 200) => route.fulfill({ status, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(corps) });
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (serveur.revoquee) return json({ detail: 'Cette session a été déconnectée. Veuillez vous reconnecter.' }, 401);
    if (url.pathname.startsWith('/api/sessions')) serveur.appels.push(`${requete.method()} ${url.pathname}`);
    if (url.pathname === '/api/sessions') return json({ disponible, session_suivie: suivie, sessions: disponible ? serveur.sessions : [] });
    if (url.pathname === '/api/sessions/revoquer-autres') {
      serveur.sessions = serveur.sessions.filter((s) => s.actuelle);
      return json({ status: 'success', revoquees: 2 });
    }
    if (url.pathname === '/api/sessions/deconnexion') return json({ status: 'success' });
    if (requete.method() === 'DELETE' && url.pathname.startsWith('/api/sessions/')) {
      serveur.sessions = serveur.sessions.filter((s) => !url.pathname.endsWith(`/${s.id}`));
      return json({ status: 'success' });
    }
    if (url.pathname.startsWith('/profile/')) return json({ username: UTILISATEUR, email: 't@kleea.test', name: 'Testeur', import_mode: 'manual', role: 'user' });
    // Sans compte, la fenêtre d'accueil recouvrirait la navigation.
    if (url.pathname.startsWith('/config-comptes/')) return json([{ compte: 'CCP', groupe: 'Testeur', solde: 500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null }]);
    if (url.pathname.startsWith('/transactions/stats/count/')) return json({ count: 0 });
    if (url.pathname.startsWith('/powens/connexion-active')) return json({ connecte: false });
    if (url.pathname.startsWith('/powens/connections-and-accounts')) return json({ connections_count: 0, connections: [], accounts_count: 0, accounts: [] });
    if (url.pathname.startsWith('/api/streamdeck/token')) return json({ active: false, created_at: null });
    if (url.pathname.startsWith('/note/')) return json({ texte: '' });
    if (url.pathname.startsWith('/get-theme/')) return json(null);
    if (url.pathname.startsWith('/get-user-theme/')) return json({});
    return json([]);
  });
  await page.clock.setFixedTime(new Date('2026-11-06T10:00:00+01:00'));
  await ouvrirSession(page);
  // ouvrirSession repose la session à chaque chargement : après une purge, la page bouclerait.
  if (sessionUneFois) {
    await page.addInitScript(() => {
      if (sessionStorage.getItem('e2e_deja_ouvert')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      sessionStorage.setItem('e2e_deja_ouvert', '1');
    });
  }
  await page.goto('/');
  await page.getByTitle('Accéder à mon profil et aux réglages').click();
  return serveur;
}

const carte = (page) => page.getByRole('region', { name: 'Appareils connectés' });

test('la session actuelle est signalée et ne propose pas de se couper elle-même', async ({ page }) => {
  await ouvrir(page);
  const liste = carte(page).getByRole('listitem');
  await expect(liste).toHaveCount(3);
  await expect(liste.first()).toContainText('Chrome sur Windows');
  await expect(liste.first()).toContainText('Cet appareil');
  await expect(liste.first().getByRole('button')).toHaveCount(0);
  await expect(liste.nth(1)).toContainText('Il y a 15 min');
});

test('déconnecter un appareil le retire de la liste', async ({ page }) => {
  const serveur = await ouvrir(page);
  const ligne = carte(page).getByRole('listitem').filter({ hasText: 'Safari sur iPhone' });
  await ligne.getByRole('button', { name: 'Déconnecter' }).click();
  await expect(carte(page).getByRole('listitem')).toHaveCount(2);
  expect(serveur.appels).toContain('DELETE /api/sessions/tel');
});

test('« Tout déconnecter » demande une confirmation', async ({ page }) => {
  const serveur = await ouvrir(page);
  await carte(page).getByRole('button', { name: 'Tout déconnecter' }).click();
  expect(serveur.appels).not.toContain('POST /api/sessions/revoquer-autres');
  await expect(carte(page)).toContainText('Déconnecter vos 2 autres appareils');

  await carte(page).getByRole('button', { name: 'Annuler' }).click();
  expect(serveur.appels).not.toContain('POST /api/sessions/revoquer-autres');

  await carte(page).getByRole('button', { name: 'Tout déconnecter' }).click();
  await carte(page).getByRole('button', { name: 'Confirmer' }).click();
  await expect(carte(page).getByRole('listitem')).toHaveCount(1);
  expect(serveur.appels).toContain('POST /api/sessions/revoquer-autres');
  await expect(carte(page).getByRole('button', { name: 'Tout déconnecter' })).toHaveCount(0);
});

test('une session révoquée revient à l’écran de connexion, avec le motif', async ({ page }) => {
  const serveur = await ouvrir(page, { sessionUneFois: true });
  const ligne = carte(page).getByRole('listitem').filter({ hasText: 'Safari sur iPhone' });
  await expect(ligne).toBeVisible();
  serveur.revoquee = true;
  await ligne.getByRole('button', { name: 'Déconnecter' }).click();
  await expect(page.getByPlaceholder('Pseudo ou Adresse e-mail')).toBeVisible();
  await expect(page.getByText('Cette session a été déconnectée')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});

test('sans la table des sessions, le profil reste utilisable', async ({ page }) => {
  await ouvrir(page, { disponible: false, suivie: false });
  await expect(carte(page)).toContainText("n'est pas disponible pour le moment");
  await expect(page.getByText('Stream Deck').first()).toBeVisible();
});

test('une connexion ancienne est expliquée', async ({ page }) => {
  await ouvrir(page, { suivie: false });
  await expect(carte(page)).toContainText('sa connexion date d\'avant cette fonction');
});

test('le bouton de déconnexion prévient le serveur', async ({ page }) => {
  const serveur = await ouvrir(page);
  await page.getByTitle('Déconnexion').click();
  await expect.poll(() => serveur.appels).toContain('POST /api/sessions/deconnexion');
});
