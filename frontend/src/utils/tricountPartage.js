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

export const DUREES_LIEN = [
  { jours: 7, libelle: '7 jours' },
  { jours: 30, libelle: '30 jours' },
  { jours: 90, libelle: '90 jours' },
  { jours: 365, libelle: '1 an' },
];
export const DUREE_LIEN_PAR_DEFAUT = 30;

const REFUS_DU_LIEN = {
  lien_expire: {
    titre: 'Ce lien a expiré',
    message: 'Sa durée de validité est dépassée. Demandez un nouveau lien à la personne qui a créé ce Tricount.',
  },
  lien_revoque: {
    titre: 'Ce lien n’est plus actif',
    message: 'La personne qui a créé ce Tricount l’a révoqué ou remplacé. Demandez-lui le nouveau lien.',
  },
  lien_introuvable: {
    titre: 'Lien introuvable',
    message: 'Vérifiez l’adresse reçue. Le groupe a peut-être été supprimé : la personne qui l’a créé pourra vous renseigner.',
  },
};

/** Traduit le refus d'une route partagée en message. Renvoie null s'il s'agit d'une autre erreur. */
export function refusDuLien(statut, corps) {
  if (statut !== 404 && statut !== 410) return null;
  const code = corps?.detail?.code;
  return { code, ...(REFUS_DU_LIEN[code] || REFUS_DU_LIEN.lien_introuvable) };
}

const formaterJour = (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });

export function formaterExpiration(expireLe) {
  return expireLe ? `Ce lien expire le ${formaterJour(expireLe)}.` : '';
}

/** Décrit au propriétaire l'état du lien de son groupe. */
export function descriptionDuLien(lien) {
  if (!lien?.token) return 'Ce groupe n’a pas de lien actif.';
  if (lien.statut === 'expire') return `Ce lien a expiré le ${formaterJour(lien.expire_le)}. Il ne fonctionne plus.`;
  if (!lien.expire_le) return 'Sans date limite : ce lien a été créé avant l’arrivée des durées. Il reste valable tant que vous ne choisissez pas de durée et que vous ne le révoquez pas.';
  return formaterExpiration(lien.expire_le);
}

/** Ajoute le nom du participant au corps d'une requête, seulement s'il en a saisi un. */
export function avecAuteur(corps, auteur) {
  const nom = (auteur || '').trim();
  return nom ? { ...corps, auteur: nom } : corps;
}

export const LIBELLES_ACTION = { ajout: 'Ajout', modification: 'Modification', suppression: 'Suppression' };

const CHAMPS_HISTORIQUE = [
  ['libelle', 'Désignation'],
  ['montant', 'Montant'],
  ['date', 'Date'],
  ['paye_par', 'Payé par'],
  ['pour_qui', 'Répartition'],
];

const formaterChamp = (champ, valeur) => {
  if (valeur === null || valeur === undefined || valeur === '') return '—';
  if (champ === 'montant') return `${Number(valeur).toFixed(2)} €`;
  if (champ === 'date') return new Date(`${valeur}T00:00:00`).toLocaleDateString('fr-FR');
  return String(valeur);
};

/** Les lignes à afficher pour une entrée : les champs changés, ou tous pour un ajout et une suppression. */
export function lignesHistorique(entree) {
  const avant = entree.ancienne_valeur || {};
  const apres = entree.nouvelle_valeur || {};
  return CHAMPS_HISTORIQUE
    .filter(([champ]) => avant[champ] !== apres[champ])
    .map(([champ, libelle]) => ({
      champ,
      libelle,
      avant: entree.ancienne_valeur ? formaterChamp(champ, avant[champ]) : null,
      apres: entree.nouvelle_valeur ? formaterChamp(champ, apres[champ]) : null,
    }));
}
