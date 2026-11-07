import { anneeTransaction } from './finance.js';

const LONGUEUR_MINIMALE = 2;
const MAX_OPERATIONS = 8;

const normaliser = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Résultats groupés, sans tenir compte des accents ni de la casse. Les plus récents d'abord. */
export function rechercher(requete, { transactions = [], comptes = [] }) {
  const cherche = normaliser(requete);
  if (cherche.length < LONGUEUR_MINIMALE) return { operations: [], categories: [], comptes: [] };

  const recentes = [...transactions].sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
  const lignes = recentes.map((t) => ({ ...t, annee: anneeTransaction(t) }));

  const categories = new Map();
  for (const t of lignes) {
    if (!normaliser(t.categorie).includes(cherche)) continue;
    const trouvee = categories.get(t.categorie);
    // La première rencontrée est la plus récente : c'est la période qu'on ouvrira.
    if (trouvee) trouvee.nombre += 1;
    else categories.set(t.categorie, { categorie: t.categorie, compte: t.compte, mois: t.mois, annee: t.annee, nombre: 1 });
  }

  return {
    operations: lignes.filter((t) => normaliser(t.nom).includes(cherche)).slice(0, MAX_OPERATIONS),
    categories: [...categories.values()],
    comptes: comptes.filter((c) => normaliser(c.compte).includes(cherche)),
  };
}
