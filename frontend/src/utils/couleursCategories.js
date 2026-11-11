import { getCategoryIconInfo } from '../categoryIcons';

// Couleurs de secours, seulement pour une catégorie sans couleur valide (palette catégorielle validée, mode sombre).
const SECOURS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const GRIS_AUTRES = '#6b7280';

// Toute couleur CSS (#abc, #aabbccdd, rgb(), nom…) ramenée à « #rrggbb ».
let pinceau = null;
export function normaliserCouleur(couleur) {
  const texte = String(couleur || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(texte)) return texte;
  if (/^#[0-9a-f]{8}$/.test(texte)) return texte.slice(0, 7);
  if (/^#[0-9a-f]{3,4}$/.test(texte)) return `#${texte[1]}${texte[1]}${texte[2]}${texte[2]}${texte[3]}${texte[3]}`;
  if (!texte || typeof document === 'undefined') return null;
  pinceau = pinceau || document.createElement('canvas').getContext('2d');
  if (!pinceau) return null;
  pinceau.fillStyle = '#000001';
  pinceau.fillStyle = texte;
  const resultat = String(pinceau.fillStyle);
  if (resultat === '#000001') return null;
  if (/^#[0-9a-f]{6}$/.test(resultat)) return resultat;
  const rgb = resultat.match(/\d+(\.\d+)?/g);
  return rgb && rgb.length >= 3 ? `#${rgb.slice(0, 3).map((n) => Math.round(Number(n)).toString(16).padStart(2, '0')).join('')}` : null;
}

/**
 * La couleur de chaque catégorie : celle de son icône, celle que la personne a choisie.
 * Deux catégories peuvent donc partager une couleur ; leur nom, toujours écrit, les distingue.
 */
export function couleursParCategorie(noms) {
  const resultat = {};
  let secours = 0;
  for (const nom of [...noms].sort((a, b) => a.localeCompare(b, 'fr'))) {
    resultat[nom] = normaliserCouleur(getCategoryIconInfo(nom)?.hex) || SECOURS[secours++ % SECOURS.length];
  }
  return resultat;
}
