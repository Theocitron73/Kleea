// Met à jour la part d'une personne : le montant de la dépense devient la somme des parts.
export function appliquerMontantIndividuel(depense, nom, valeur) {
  const details = { ...(depense.details_montants || {}), [nom]: parseFloat(String(valeur).replace(',', '.')) || 0 };
  const totalCentimes = Object.values(details).reduce((total, part) => total + Math.round(part * 100), 0);
  return { ...depense, details_montants: details, montant: totalCentimes / 100 };
}
