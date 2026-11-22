/**
 * Années proposées sur la page Prévisions : celles qui ont des opérations, celles qui ont
 * déjà des prévisions (ex. janvier de l'année suivante après une reconduction de décembre)
 * et l'année en cours. Triées, sans doublon, en texte.
 */
const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Mois à afficher quand on choisit une année sur la page Prévisions : le mois en cours pour l'année
 * en cours, sinon le dernier mois de l'année qui a des opérations ou des prévisions (Janvier à défaut).
 * `moisListe` : [{ v: 'Janvier' }, …] dans l'ordre. Renvoie la valeur `v` du mois.
 */
export function moisPourAnnee(annee, moisListe, periodesTransactions = [], periodesPrevisions = [], maintenant = new Date()) {
  if (String(annee) === String(maintenant.getFullYear())) return moisListe[maintenant.getMonth()]?.v;
  const indices = [...periodesTransactions, ...periodesPrevisions]
    .filter((p) => String(p?.annee) === String(annee))
    .map((p) => moisListe.findIndex((m) => sansAccent(m.v) === sansAccent(p.mois)))
    .filter((i) => i >= 0);
  return moisListe[indices.length ? Math.max(...indices) : 0]?.v;
}

export function anneesPrevisions(periodesTransactions = [], periodesPrevisions = [], anneeCourante = new Date().getFullYear()) {
  const annees = [...periodesTransactions, ...periodesPrevisions]
    .map((p) => p?.annee)
    .filter((a) => a !== null && a !== undefined && a !== '')
    .map(String);
  return [...new Set([...annees, String(anneeCourante)])].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}
