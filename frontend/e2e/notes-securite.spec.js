// Bloc-notes du déménagement : le HTML stocké est réinjecté via innerHTML, donc assaini (DOMPurify).
// Une note piégée ne doit exécuter aucun script, mais garder sa structure légitime (cases, texte).
import { test, expect } from '@playwright/test';
import { brancherApi, ouvrirSession } from './api-simulee.js';

const PIEGE = [
  '<div>Déménageur<img src=x onerror="window.__xss=1"></div>',
  '<div><input type="checkbox" checked /><span>Rendre les clés</span></div>',
  '<a href="javascript:window.__xss=2">lien</a>',
  '<script>window.__xss=3</script>',
].join('');

test('une note piégée est neutralisée mais garde sa structure', async ({ page }) => {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  await brancherApi(page);
  // La note stockée côté serveur contient la charge : elle arrive par le chemin innerHTML.
  await page.route(/\/api\/notes-demenagement\//, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ contenu: PIEGE }) }),
  );
  await ouvrirSession(page);
  await page.goto('/');
  await page.getByRole('button', { name: /Déménagement/i }).first().click();

  const editeur = page.locator('[contenteditable][placeholder^="Écrivez vos remarques"]');
  await expect(editeur).toBeVisible({ timeout: 30_000 });
  await expect(editeur).toContainText('Rendre les clés');
  await page.waitForTimeout(400);

  // Aucun gestionnaire inline n'a pu s'exécuter, aucune URL javascript: ne subsiste.
  expect(await page.evaluate(() => window.__xss)).toBeUndefined();
  await expect(editeur.locator('script')).toHaveCount(0);
  expect(await editeur.evaluate((el) => el.innerHTML)).not.toContain('onerror');
  expect(await editeur.evaluate((el) => el.innerHTML.toLowerCase())).not.toContain('javascript:');
  // La structure utile reste : la case à cochée et son libellé.
  await expect(editeur.locator('input[type="checkbox"]')).toHaveCount(1);
  expect(erreurs).toEqual([]);
});
