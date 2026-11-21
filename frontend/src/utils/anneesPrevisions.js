/**
 * Années proposées sur la page Prévisions : celles qui ont des opérations, celles qui ont
 * déjà des prévisions (ex. janvier de l'année suivante après une reconduction de décembre)
 * et l'année en cours. Triées, sans doublon, en texte.
 */
export function anneesPrevisions(periodesTransactions = [], periodesPrevisions = [], anneeCourante = new Date().getFullYear()) {
  const annees = [...periodesTransactions, ...periodesPrevisions]
    .map((p) => p?.annee)
    .filter((a) => a !== null && a !== undefined && a !== '')
    .map(String);
  return [...new Set([...annees, String(anneeCourante)])].sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
}
