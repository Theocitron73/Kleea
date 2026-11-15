import api from '../axios';

// Cache en mémoire (jamais écrit sur disque) pour que la page Tricount s'affiche
// instantanément : rempli au démarrage de l'appli, puis rafraîchi à chaque visite.
const groupesParUtilisateur = new Map();
const detailsParGroupe = new Map();

const cleDetails = (userId, groupe) => `${userId}::${groupe}`;

export const lireGroupesEnCache = (userId) => groupesParUtilisateur.get(userId);
export const lireDetailsEnCache = (userId, groupe) => detailsParGroupe.get(cleDetails(userId, groupe));

export async function chargerGroupes(userId) {
  const res = await api.get(`/get-groups/${userId}`);
  const groupes = res.data || [];
  groupesParUtilisateur.set(userId, groupes);
  return groupes;
}

export async function chargerDetails(userId, groupe) {
  const res = await api.get(`/get-tricount/${userId}/${encodeURIComponent(groupe)}`);
  const details = res.data || { transactions: [], transferts: [] };
  detailsParGroupe.set(cleDetails(userId, groupe), details);
  return details;
}

// Appelé à la connexion : précharge la liste des groupes et le premier groupe.
export async function prechargerTricount(userId) {
  if (!userId) return;
  try {
    const groupes = await chargerGroupes(userId);
    if (groupes[0]) await chargerDetails(userId, groupes[0].nom);
  } catch {
    // Silencieux : la page refera l'appel à l'ouverture.
  }
}

export function viderCacheTricount() {
  groupesParUtilisateur.clear();
  detailsParGroupe.clear();
}
