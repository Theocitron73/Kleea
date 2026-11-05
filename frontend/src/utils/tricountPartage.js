const enCentimes = (valeur) => Math.round((parseFloat(valeur) || 0) * 100);

/** Somme des parts d'une dépense, en centimes pour éviter les erreurs d'arrondi. */
export function totalDesPartsCentimes(details) {
  return Object.values(details || {}).reduce((total, part) => total + enCentimes(part), 0);
}

// Met à jour la part d'une personne : le montant de la dépense devient la somme des parts.
export function appliquerMontantIndividuel(depense, nom, valeur) {
  const details = { ...(depense.details_montants || {}), [nom]: parseFloat(String(valeur).replace(',', '.')) || 0 };
  return { ...depense, details_montants: details, montant: totalDesPartsCentimes(details) / 100 };
}

/** Partage un montant à parts égales : les centimes restants vont aux premiers membres, et la somme reste exacte. */
export function repartirEquitablement(montant, membres) {
  const total = enCentimes(montant);
  const nombre = membres.length || 1;
  const base = Math.floor(total / nombre);
  const reste = total - base * nombre;
  return Object.fromEntries(membres.map((m, i) => [m, (base + (i < reste ? 1 : 0)) / 100]));
}

/** Prépare une dépense de l'API pour la fenêtre de modification. */
export function preparerEdition(depense, membres) {
  const details = Object.fromEntries(membres.map((m) => [m, 0]));
  const pourQui = (depense.pour_qui || '').trim();

  if (pourQui.includes(':')) {
    pourQui.split(',').forEach((segment) => {
      const [nom, montant] = segment.split(':');
      if (nom && montant) details[nom.trim()] = parseFloat(montant) || 0;
    });
  } else {
    const beneficiaires = !pourQui || pourQui === 'Tous'
      ? membres
      : pourQui.split(',').map((nom) => nom.trim()).filter((nom) => membres.includes(nom));
    Object.assign(details, repartirEquitablement(depense.montant, beneficiaires));
  }

  return {
    ...depense,
    date: String(depense.date || '').split('T')[0],
    libellé: depense.libelle || depense.libellé || '',
    payé_par: depense.paye_par || depense.payé_par || '',
    montant: parseFloat(depense.montant) || 0,
    details_montants: details,
  };
}
