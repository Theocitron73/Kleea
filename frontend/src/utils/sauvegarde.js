// Même limite que le serveur : un fichier trop gros est refusé avant d'être envoyé.
export const TAILLE_MAX_SAUVEGARDE = 20 * 1024 * 1024;

export function nomFichierSauvegarde(utilisateur, date = new Date()) {
  const nom = String(utilisateur || 'compte').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return `kleea-sauvegarde-${nom}-${date.toISOString().slice(0, 10)}.json`;
}

/** Le serveur explique lui-même pourquoi il refuse un fichier ; sans réponse, on le dit simplement. */
export function messageErreurSauvegarde(erreur) {
  const detail = erreur?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (erreur?.code === 'ECONNABORTED') return "Le serveur a mis trop de temps à répondre. Rien n'a été modifié : réessayez dans un instant.";
  return "Le serveur n'a pas pu lire ce fichier. Réessayez dans un instant.";
}

/** Une phrase par rubrique du fichier : ce que l'import va ajouter, puis ce qui est déjà là. */
export function lignesApercu(apercu) {
  return (apercu?.tables || []).map((t) => ({
    table: t.table,
    libelle: t.libelle,
    ajout: t.a_ajouter > 0,
    detail: [
      t.a_ajouter > 0 ? `${t.a_ajouter.toLocaleString('fr-FR')} à ajouter` : null,
      t.deja_presents > 0 ? `${t.deja_presents.toLocaleString('fr-FR')} déjà présent${t.deja_presents > 1 ? 's' : ''}` : null,
    ].filter(Boolean).join(', '),
  }));
}

export function dateSauvegarde(apercu) {
  const date = apercu?.exporte_le ? new Date(apercu.exporte_le) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('fr-FR') : null;
}
