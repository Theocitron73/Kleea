// La répartition des dépenses du Bilan annuel : anneau, liste classée, survol relié, comparaison et masquage.
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await brancherApi(page);
  await ouvrirSession(page);
  await page.goto('/');
  await page.locator('button[title="Répartition des dépenses"]:visible').first().click({ timeout: 30_000 });
  return erreurs;
}

test('la liste classe les dépenses de l’année seule, et le survol les relie à l’anneau', async ({ page }) => {
  const erreurs = await ouvrir(page);
  const liste = page.getByRole('list', { name: 'Dépenses par catégorie' }).locator('visible=true');
  // Les dépenses de 2026 seulement : les cadeaux de décembre 2025 n'y sont pas. (« Virement interne » est une
  // catégorie des données de test, que l'app ne reconnaît pas comme un virement entre comptes.)
  await expect(liste.getByRole('listitem')).toHaveCount(4);
  await expect(liste.getByRole('listitem').first()).toContainText('Logement');
  await expect(liste).not.toContainText('Loisirs');
  await expect(page.getByText('1 158 €').locator('visible=true').first()).toBeVisible();

  await liste.getByRole('button', { name: /Logement/ }).hover();
  await expect(page.getByText('69 % des dépenses').locator('visible=true')).toBeVisible();

  await liste.getByRole('button', { name: /Courses/ }).click();
  await expect(liste.getByRole('button', { name: /Courses/ })).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.move(0, 0);
  await expect(page.getByText('1 145 €').locator('visible=true').first()).toBeVisible();
  await page.screenshot({ path: 'test-results/repartition.png' });
  expect(erreurs).toEqual([]);
});
