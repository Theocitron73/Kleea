// Calculs de l'épargne : enveloppes réservées et financement des projets.
// Sans React ni réseau, pour pouvoir être testés directement (npm test).

const MOIS_PREFIXES = ['janv', 'fev', 'mars', 'avr', 'mai', 'juin', 'juil', 'aou', 'sep', 'oct', 'nov', 'dec'];

const sansAccents = (texte) => String(texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const nombre = (valeur) => parseFloat(valeur) || 0;
const nomNormalise = (nom) => String(nom ?? '').trim().toLowerCase();

/** Index de 0 à 11 d'un nom de mois français, ou -1. */
export function indexMois(nomMois) {
  const nom = sansAccents(nomMois);
  return nom ? MOIS_PREFIXES.findIndex((prefixe) => nom.startsWith(prefixe)) : -1;
}

const cleMois = (annee, index) => `${annee}-${String(index + 1).padStart(2, '0')}`;

/** Mois suivant au format AAAA-MM. */
function moisSuivant(cle) {
  const [annee, mois] = cle.split('-').map(Number);
  return mois === 12 ? cleMois(annee + 1, 0) : cleMois(annee, mois);
}

/** Mois visé par les filtres, au format AAAA-MM. Le mois courant sert de repli. */
export function moisCibleDepuisFiltres(filters, aujourdhui = new Date()) {
  const annee = filters?.annee || aujourdhui.getFullYear();
  const valeur = filters?.mois;
  let index = aujourdhui.getMonth();
  if (typeof valeur === 'number') {
    index = valeur;
  } else if (typeof valeur === 'string' && valeur.trim()) {
    const numero = parseInt(valeur, 10);
    const trouve = Number.isNaN(numero) ? indexMois(valeur) : numero - 1;
    if (trouve >= 0 && trouve <= 11) index = trouve;
  }
  return cleMois(annee, index);
}

const estTransfertInterne = (t) => {
  const texte = `${t.nom || ''} ${t.categorie || ''}`.toUpperCase();
  return texte.includes('🔄') || /\bVERS\b/.test(texte) || texte.includes('TRANSFERT');
};

/** Comptes du profil, en clés comparables. `null` : aucun filtre à appliquer. */
export function nomsDesComptes(comptes) {
  const noms = (comptes || []).map((c) => nomNormalise(c?.compte)).filter(Boolean);
  return noms.length > 0 ? new Set(noms) : null;
}

const estDansLesComptes = (t, comptes) => !comptes || comptes.has(nomNormalise(t.compte));

function moisDeTransaction(t) {
  const date = String(t.date || '');
  const annee = parseInt(t.annee, 10) || parseInt(date.slice(0, 4), 10);
  const index = t.mois ? indexMois(t.mois) : parseInt(date.slice(5, 7), 10) - 1;
  return annee && index >= 0 ? cleMois(annee, index) : null;
}

/**
 * Épargne (revenus moins dépenses, hors virements internes) de chaque mois, toutes années confondues.
 * L'année affichée reprend le récapitulatif du tableau de bord, qui intègre aussi les prévisions.
 */
export function epargneParMois({ transactions, comptes, recapAnnuel, annee }) {
  const parMois = {};
  (transactions || []).forEach((t) => {
    if (!t || estTransfertInterne(t) || !estDansLesComptes(t, comptes)) return;
    const cle = moisDeTransaction(t);
    if (cle) parMois[cle] = (parMois[cle] || 0) + nombre(t.montant);
  });
  (recapAnnuel || []).forEach((stat, position) => {
    const index = indexMois(stat?.nom || stat?.mois);
    parMois[cleMois(annee, index >= 0 ? index : position)] = nombre(stat?.epargne);
  });
  return parMois;
}

/** Une ligne de la table `projets`, avec des types fiables. */
export function normaliserProjet(ligne, position = 0) {
  return {
    id: ligne.id ?? null,
    cle: String(ligne.id ?? ligne.nom ?? position),
    nom: ligne.nom || 'Projet sans nom',
    cout: nombre(ligne.cout),
    capa: nombre(ligne.capa),
    apport: nombre(ligne.apport_epargne),
    date: ligne.date || null,
    date_debut: ligne.date_debut || null,
    moisDebut: ligne.date_debut ? String(ligne.date_debut).slice(0, 7) : null,
    utiliser_capa_stricte: Boolean(ligne.utiliser_capa_stricte),
  };
}

/**
 * Simule le financement mois par mois. Chaque euro d'un mois ne sert qu'une fois, et l'ordre des
 * projets donne la priorité. Un projet ne reçoit que l'épargne des mois à partir de son début ;
 * en capacité stricte, il reçoit au plus sa capacité par mois.
 * `disponible` plafonne le total : on ne peut pas avoir financé plus que ce qui existe.
 */
export function calculerVentilation({ projets, epargne, moisCible, disponible }) {
  const plafondTotal = Math.max(0, nombre(disponible));
  const suivis = (projets || []).map((projet) => ({
    projet,
    debut: projet.moisDebut || moisCible,
    cumul: Math.min(projet.apport, projet.cout),
    ceMois: 0,
  }));
  const actifs = suivis.filter((s) => s.debut <= moisCible);

  if (actifs.length > 0) {
    let mois = actifs.reduce((plusAncien, s) => (s.debut < plusAncien ? s.debut : plusAncien), moisCible);
    for (; mois <= moisCible; mois = moisSuivant(mois)) {
      let restant = Math.max(0, nombre(epargne?.[mois]));
      if (mois === moisCible) restant = Math.min(restant, plafondTotal);

      for (const suivi of actifs) {
        if (suivi.debut > mois || restant <= 0) continue;
        const besoin = Math.max(0, suivi.projet.cout - suivi.cumul);
        const strict = suivi.projet.utiliser_capa_stricte && suivi.projet.capa > 0;
        const pris = Math.min(besoin, restant, strict ? suivi.projet.capa : Infinity);
        suivi.cumul += pris;
        restant -= pris;
        if (mois === moisCible) suivi.ceMois = pris;
      }
    }
  }

  const repartition = {};
  const cumuls = {};
  let reste = plafondTotal;
  let partProjets = 0;
  suivis.forEach(({ projet, cumul, ceMois }) => {
    const finance = Math.min(cumul, reste);
    reste -= finance;
    const ajout = Math.min(ceMois, finance);
    cumuls[projet.cle] = finance;
    repartition[projet.cle] = ajout;
    partProjets += ajout;
  });

  const epargneDuMois = Math.min(Math.max(0, nombre(epargne?.[moisCible])), plafondTotal);
  return {
    repartitionProjets: repartition,
    cumulProjets: cumuls,
    partProjets,
    partEnveloppes: Math.max(0, epargneDuMois - partProjets),
  };
}

/** Date estimée de fin de financement, à partir d'aujourd'hui ou du début du projet s'il est à venir. */
export function estimerFinancement({ besoinRestant, mensuel, moisDebut, echeance, aujourdhui = new Date() }) {
  if (besoinRestant <= 0) return { dateFin: null, faisable: true };
  if (!(mensuel > 0)) return { dateFin: null, faisable: false };

  let depart = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
  if (moisDebut) {
    const [annee, mois] = moisDebut.split('-').map(Number);
    const debut = new Date(annee, mois - 1, 1);
    if (debut > depart) depart = debut;
  }
  const dateFin = new Date(depart.getFullYear(), depart.getMonth() + Math.ceil(besoinRestant / mensuel), 1);
  const limite = echeance ? new Date(echeance) : null;
  const faisable = !limite || Number.isNaN(limite.getTime()) || dateFin <= limite;
  return { dateFin, faisable };
}

/** Montant réservé par enveloppe. La ligne la plus récente fait foi pour un même nom. */
export function montantsParEnveloppe(allocations) {
  const montants = {};
  (allocations || []).forEach((a) => {
    const cle = nomNormalise(a?.projet);
    if (cle && montants[cle] === undefined) montants[cle] = nombre(a.montant_alloue);
  });
  return montants;
}

/** Dépenses nettes par enveloppe : un remboursement réduit le montant dépensé. */
export function depensesParEnveloppe(transactions, comptes) {
  const depenses = {};
  (transactions || []).forEach((t) => {
    if (!t?.enveloppe || !estDansLesComptes(t, comptes)) return;
    const cle = nomNormalise(t.enveloppe);
    depenses[cle] ??= { montant: 0, count: 0 };
    depenses[cle].montant -= nombre(t.montant);
    depenses[cle].count += 1;
  });
  return depenses;
}

/** Ce qui reste réservé, en ne comptant que les enveloppes qui existent encore. */
export function reserveNette(montants, depenses) {
  const total = Object.entries(montants).reduce(
    (somme, [cle, montant]) => somme + montant - (depenses[cle]?.montant || 0),
    0,
  );
  return Math.max(0, total);
}
