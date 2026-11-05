// Modification d'une dépense depuis le lien de partage, sans compte, avec une API simulée.
import { test, expect } from '@playwright/test';

const ENTETES = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const DONNEES = {
  groupe: 'Vacances',
  utilisateur: 'proprietaire',
  emojis: '',
  transferts: [],
  transactions: [
    { id: 7, date: '2026-11-02T00:00:00', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:10,Theo:20', montant: 30, emoji: null },
  ],
};

async function ouvrir(page, statutMaj = 200) {
  const envois = [];
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: ENTETES });
    if (requete.method() === 'PUT') {
      envois.push({ url: new URL(requete.url()).pathname, corps: requete.postDataJSON() });
      return route.fulfill({ status: statutMaj, headers: ENTETES, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({ status: 200, headers: ENTETES, contentType: 'application/json', body: JSON.stringify(DONNEES) });
  });
  await page.goto('/shared-tricount/jeton-de-test');
  await page.getByRole('button', { name: 'Modifier la dépense' }).first().click({ timeout: 30_000 });
  const fenetre = page.locator('.fixed.inset-0').filter({ hasText: 'Répartition des frais' });
  await expect(fenetre).toBeVisible();
  return { envois, erreurs, fenetre };
}

test('une part modifiée est enregistrée, et le total suit', async ({ page }) => {
  const { envois, erreurs, fenetre } = await ouvrir(page);
  await expect(fenetre.getByRole('textbox').first()).toHaveValue('Courses');
  const parts = fenetre.locator('input[type="number"]');
  await expect(parts.nth(0)).toHaveValue('30');
  await expect(parts.nth(2)).toHaveValue('20');
  await parts.nth(2).fill('25.5');
  await expect(parts.nth(0)).toHaveValue('35.5');
  await fenetre.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect(fenetre).toBeHidden();
  expect(envois).toEqual([{
    url: '/update-shared-transaction/jeton-de-test',
    corps: { id: 7, date: '2026-11-02', libelle: 'Courses', paye_par: 'Aude', pour_qui: 'Aude:10,Theo:25.5', montant: 35.5 },
  }]);
  expect(erreurs).toEqual([]);
});

test('un montant différent de la somme des parts n’est pas enregistré', async ({ page }) => {
  const { envois, fenetre } = await ouvrir(page);
  await fenetre.locator('input[type="number"]').first().fill('50');
  await fenetre.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect(page.locator('body')).toContainText('répartition');
  await expect(fenetre).toBeVisible();
  expect(envois).toEqual([]);
});

test('un refus du serveur est signalé et garde la fenêtre ouverte', async ({ page }) => {
  const { fenetre } = await ouvrir(page, 403);
  await fenetre.getByRole('button', { name: 'Sauvegarder' }).click();
  await expect(page.locator('body')).toContainText('Erreur lors de la modification');
  await expect(fenetre).toBeVisible();
});
