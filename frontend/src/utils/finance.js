// Règles de calcul communes : virements internes, soldes et intérêts.
// Le plugin Stream Deck en a un équivalent côté serveur (`calculer_vues_streamdeck` dans backend/main.py) :
// backend/tests/fixtures/calculs_finances.json vérifie que les deux donnent les mêmes résultats.

const MOIS_PREFIXES = ['janv', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aou', 'sep', 'oct', 'nov', 'dec'];

const nombre = (valeur) => parseFloat(valeur) || 0;
const cleCompte = (nom) => String(nom ?? '').trim().toUpperCase();

/** Nom de mois en minuscules et sans accent. */
export function nettoyerMois(mois) {
  if (!mois) return '';
  return mois.toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Index de 0 à 11 d'un nom de mois français, ou -1. */
export function indexMois(mois) {
  const nom = nettoyerMois(mois);
  return nom ? MOIS_PREFIXES.findIndex((prefixe) => nom.startsWith(prefixe)) : -1;
}

/** Année d'une transaction, en texte : la colonne `annee`, sinon celle de la date. */
export function anneeTransaction(t) {
  return (t?.annee || (t?.date ? new Date(t.date).getFullYear() : ''))?.toString().trim();
}

// « VERS » en mot entier : ni « Divers », ni « Versailles », ni « Versement ».
const MOT_VERS = /(^|[^\p{L}\p{N}_])VERS($|[^\p{L}\p{N}_])/u;

/** Un virement entre comptes n'est ni un revenu ni une dépense. */
export function estTransfertInterne(nom = '', categorie = '') {
  const texte = `${nom || ''} ${categorie || ''}`.toUpperCase();
  return (
    texte.includes('🔄') ||
    MOT_VERS.test(texte) ||
    texte.includes('TRANSFERT') ||
    String(categorie || '').trim().toUpperCase().startsWith('VIREMENT :')
  );
}

const MOTS_IGNORES = new Set(['CCP', 'VERS', 'VIREMENT', 'EPARGNE', 'THEO', 'AUDE', 'DE', 'COMPTE', 'BANQUE', 'DU']);
const TYPES_LIVRETS = ['LIVRET A', 'LEP', 'LDDS', 'PEL', 'PEA', 'LIVRET'];

/** Compte destinataire d'un virement : un compte du même profil cité dans le libellé. */
export function trouverCompteCible(texte, compteSource, comptes) {
  if (!compteSource || !comptes?.length) return null;
  const source = cleCompte(compteSource);
  const contenu = String(texte || '').toUpperCase();
  const groupeSource = comptes.find((c) => cleCompte(c.compte) === source)?.groupe?.trim().toUpperCase();

  const candidats = comptes.filter((c) => {
    if (cleCompte(c.compte) === source) return false;
    return !(groupeSource && c.groupe && c.groupe.trim().toUpperCase() !== groupeSource);
  });

  for (const c of candidats) {
    const nom = cleCompte(c.compte);
    if (contenu.includes(nom)) return nom;
    const mots = nom.split(/[\s_-]+/).filter((m) => m.length >= 3 && !MOTS_IGNORES.has(m));
    if (mots.some((m) => contenu.includes(m))) return nom;
  }

  for (const type of TYPES_LIVRETS) {
    if (contenu.includes(type)) {
      const compte = candidats.find((c) => cleCompte(c.compte).includes(type));
      if (compte) return cleCompte(compte.compte);
    }
  }
  return null;
}

const cleMiroir = (annee, mois, compte) => `${annee}|${mois}|${compte}`;

/**
 * Prépare la lecture des transactions. La fonction renvoyée donne, pour une transaction, le compte source,
 * son montant et le compte à créditer. `credit` n'existe que si l'écriture miroir manque en base :
 * sinon le compte destinataire serait crédité deux fois.
 */
export function creerLecteurMouvements(comptes, transactions) {
  const miroirs = new Map();
  (transactions || []).forEach((t) => {
    const cle = cleMiroir(anneeTransaction(t), nettoyerMois(t.mois), cleCompte(t.compte));
    if (!miroirs.has(cle)) miroirs.set(cle, []);
    miroirs.get(cle).push(nombre(t.montant));
  });

  return (t) => {
    const montant = nombre(t.montant);
    const source = cleCompte(t.compte);
    const mouvement = { source, montant, cible: null, credit: 0 };
    if (!estTransfertInterne(t.nom, t.categorie)) return mouvement;

    const cible = trouverCompteCible(`${t.nom || ''} ${t.categorie || ''}`, source, comptes);
    if (!cible) return mouvement;

    mouvement.cible = cible;
    const existants = miroirs.get(cleMiroir(anneeTransaction(t), nettoyerMois(t.mois), cible)) || [];
    if (!existants.some((m) => Math.abs(m + montant) < 0.1)) mouvement.credit = -montant;
    return mouvement;
  };
}

/** Applique une transaction à des soldes, en créditant le compte destinataire d'un virement si besoin. */
export function appliquerMouvement(soldes, { source, montant, cible, credit }) {
  if (Object.prototype.hasOwnProperty.call(soldes, source)) soldes[source] += montant;
  if (credit && cible && Object.prototype.hasOwnProperty.call(soldes, cible)) soldes[cible] += credit;
}

const soldesDeDepart = (comptes) =>
  Object.fromEntries((comptes || []).map((c) => [cleCompte(c.compte), nombre(c.solde)]));

function jourTransaction(t) {
  if (!t.date) return 15;
  const date = String(t.date).split('T')[0].split(' ')[0];
  const parties = date.split(date.includes('-') ? '-' : '/');
  if (parties.length < 3) return 15;
  return parties[0].length === 4 ? parseInt(parties[2], 10) : parseInt(parties[0], 10);
}

/** Quinzaine à partir de laquelle un mouvement compte : un dépôt après, un retrait dès la quinzaine en cours. */
function quinzaineEffective(montant, mois, jour) {
  if (montant > 0) return jour <= 15 ? mois * 2 + 1 : (mois + 1) * 2;
  return jour <= 15 ? mois * 2 : mois * 2 + 1;
}

/**
 * Soldes à la fin du mois demandé, soldes au 1er janvier et intérêts de l'année (règle des quinzaines).
 * Les clés sont les noms de comptes en majuscules. `moisIndex` va de 0 à 11.
 */
export function calculerSoldes({ comptes, transactions, annee, moisIndex }) {
  const lire = creerLecteurMouvements(comptes, transactions);
  const soldes = soldesDeDepart(comptes);
  const soldesAu1erJanvier = soldesDeDepart(comptes);
  const taux = Object.fromEntries((comptes || []).map((c) => [cleCompte(c.compte), nombre(c.taux)]));
  const quinzaines = Object.fromEntries(Object.keys(soldes).map((nom) => [nom, Array(24).fill(0)]));

  const enregistrer = (compte, montant, mois, jour) => {
    if (!(taux[compte] > 0)) return;
    const quinzaine = quinzaineEffective(montant, mois, jour);
    if (quinzaine >= 0 && quinzaine < 24) quinzaines[compte][quinzaine] += montant;
  };

  (transactions || []).forEach((t) => {
    const anneeT = parseInt(anneeTransaction(t) || 0, 10);
    const moisT = indexMois(t.mois);
    if (anneeT > annee || (anneeT === annee && moisT > moisIndex)) return;

    const mouvement = lire(t);
    appliquerMouvement(soldes, mouvement);
    if (anneeT < annee) {
      appliquerMouvement(soldesAu1erJanvier, mouvement);
    } else {
      const jour = jourTransaction(t);
      enregistrer(mouvement.source, mouvement.montant, moisT, jour);
      if (mouvement.credit) enregistrer(mouvement.cible, mouvement.credit, moisT, jour);
    }
  });

  const interets = {};
  Object.keys(soldes).forEach((nom) => {
    if (!(taux[nom] > 0)) {
      interets[nom] = 0;
      return;
    }
    const tauxQuinzaine = taux[nom] / 100 / 24;
    let solde = soldesAu1erJanvier[nom];
    let total = 0;
    quinzaines[nom].forEach((mouvement) => {
      solde += mouvement;
      if (solde > 0) total += solde * tauxQuinzaine;
    });
    interets[nom] = Math.round(total * 100) / 100;
  });

  return { soldes, soldesAu1erJanvier, interets };
}

/** Revenus et dépenses d'une liste de transactions, hors virements internes. */
export function totauxRevenusDepenses(transactions) {
  let revenus = 0;
  let depenses = 0;
  (transactions || []).forEach((t) => {
    if (estTransfertInterne(t.nom, t.categorie)) return;
    const montant = nombre(t.montant);
    if (montant > 0) revenus += montant;
    else depenses -= montant;
  });
  return { revenus, depenses, epargne: revenus - depenses };
}

const arrondi = (valeur) => Math.round(valeur * 100) / 100;

/**
 * Récap année par année, de la première année avec des transactions jusqu'à l'année en cours.
 * Uniquement du réel : l'année en cours s'arrête aux transactions déjà enregistrées, sans les prévisions.
 * Un virement vers un compte du profil peut venir d'un autre profil : tous les comptes sont donc suivis.
 */
export function recapParAnnee({ comptes, transactions, profil = 'Tous', anneeCourante }) {
  const tous = profil === 'Tous';
  const groupe = String(profil).toLowerCase().trim();
  const nomsProfil = (comptes || [])
    .filter((c) => tous || String(c.groupe || '').toLowerCase().trim() === groupe)
    .map((c) => cleCompte(c.compte));
  const estDuProfil = (t) => tous || nomsProfil.includes(cleCompte(t.compte));

  const parAnnee = new Map();
  (transactions || []).forEach((t) => {
    const annee = parseInt(anneeTransaction(t) || 0, 10) || 0;
    if (!parAnnee.has(annee)) parAnnee.set(annee, []);
    parAnnee.get(annee).push(t);
  });

  const anneesDuProfil = [...parAnnee.keys()].filter((a) => a > 0 && parAnnee.get(a).some(estDuProfil));
  const premiere = anneesDuProfil.length ? Math.min(...anneesDuProfil) : anneeCourante;
  const derniere = Math.max(anneeCourante, ...anneesDuProfil);

  const lire = creerLecteurMouvements(comptes, transactions);
  const soldes = soldesDeDepart(comptes);
  const appliquer = (liste) => liste.forEach((t) => appliquerMouvement(soldes, lire(t)));
  const soldeProfil = () => nomsProfil.reduce((total, nom) => total + (soldes[nom] || 0), 0);

  [...parAnnee.keys()].filter((a) => a < premiere).forEach((a) => appliquer(parAnnee.get(a)));

  const recap = [];
  for (let annee = premiere; annee <= derniere; annee += 1) {
    const soldeDebut = soldeProfil();
    const liste = parAnnee.get(annee) || [];
    appliquer(liste);
    const duProfil = liste.filter((t) => estDuProfil(t) && indexMois(t.mois) >= 0);
    const { revenus, depenses, epargne } = totauxRevenusDepenses(duProfil);
    const soldeFin = soldeProfil();
    recap.push({
      annee,
      enCours: annee === anneeCourante,
      transactions: duProfil.length,
      revenus: arrondi(revenus),
      depenses: arrondi(depenses),
      epargne: arrondi(epargne),
      tauxEpargne: revenus > 0 ? Math.round((epargne / revenus) * 100) : null,
      soldeDebut: arrondi(soldeDebut),
      soldeFin: arrondi(soldeFin),
    });
  }
  return recap;
}
