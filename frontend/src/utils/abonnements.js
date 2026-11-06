import { estTransfertInterne } from './finance.js';

// Détection des abonnements et dépenses récurrentes, à partir des seules transactions.

const JOUR = 86_400_000;

export const FREQUENCES = [
  { id: 'hebdomadaire', libelle: 'Chaque semaine', jours: 7, min: 6, max: 8, parMois: 365.25 / 12 / 7, occurrences: 4 },
  { id: 'mensuel', libelle: 'Chaque mois', jours: 30.44, min: 25, max: 36, parMois: 1, occurrences: 3 },
  { id: 'bimestriel', libelle: 'Tous les 2 mois', jours: 61, min: 55, max: 67, parMois: 1 / 2, occurrences: 3 },
  { id: 'trimestriel', libelle: 'Chaque trimestre', jours: 91.3, min: 84, max: 98, parMois: 1 / 3, occurrences: 3 },
  { id: 'semestriel', libelle: 'Chaque semestre', jours: 182.6, min: 172, max: 193, parMois: 1 / 6, occurrences: 2 },
  { id: 'annuel', libelle: 'Chaque année', jours: 365.25, min: 350, max: 380, parMois: 1 / 12, occurrences: 2 },
];

// Le début du libellé décrit le moyen de paiement, pas le marchand.
const PREFIXES = /^(?:(?:ACHAT|PAIEMENT|PAIEMT|FACTURE)(?: CB| CARTE)?|CARTE|CB|PRLV(?: SEPA)?|PRELEVEMENT(?: SEPA)?(?: DE)?|PREL(?: DE)?|SEPA|VIREMENT(?: INSTANTANE| PERMANENT| SEPA)*(?: POUR| A| DE)?|VIR(?: INST| SEPA)?(?: POUR| A| DE)?|PERMANENT(?: POUR)?|INSTANTANE(?: A)?|HELP)\s+/;
// À partir de ces mots, le libellé ne contient plus que des références.
const FIN_DE_NOM = /\b(?:REF|REFERENCE|CARTE|NUMERO|NO|PRLVT|PRLV|SEPA|MANDAT|CONTRAT|COMPTE|VOTRE|ENVOY|IDENT|EUR)\b.*$/;
const MOTS_VIDES = new Set(['SA', 'SAS', 'SARL', 'SASU', 'EURL', 'FR', 'FRA', 'COM', 'CO', 'IE', 'WWW', 'THE', 'LE', 'LA', 'LES', 'DE', 'DU', 'DES', 'ET']);

/** Le nom du marchand, quelle que soit la forme du libellé (CSV ou banque connectée). */
export function nomMarchand(libelle) {
  let texte = String(libelle || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (let prefixe = PREFIXES.exec(texte); prefixe; prefixe = PREFIXES.exec(texte)) {
    texte = texte.slice(prefixe[0].length);
  }
  texte = texte.replace(FIN_DE_NOM, '').trim();
  return texte.split(' ').filter((mot) => mot.length > 1 && !/\d/.test(mot) && !MOTS_VIDES.has(mot)).slice(0, 3).join(' ');
}

const mediane = (valeurs) => {
  const tries = [...valeurs].sort((a, b) => a - b);
  const milieu = Math.floor(tries.length / 2);
  return tries.length % 2 ? tries[milieu] : (tries[milieu - 1] + tries[milieu]) / 2;
};
const arrondi = (valeur) => Math.round(valeur * 100) / 100;

function versDate(valeur) {
  const texte = String(valeur || '').slice(0, 10);
  const date = new Date(`${texte}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Regroupe les montants proches : deux forfaits d'un même opérateur restent séparés. */
function grouperParMontant(lignes) {
  const groupes = [];
  for (const ligne of [...lignes].sort((a, b) => a.montant - b.montant)) {
    const groupe = groupes.find((g) => {
      const reference = mediane(g.map((l) => l.montant));
      return Math.abs(ligne.montant - reference) <= Math.max(reference * 0.15, 0.5);
    });
    if (groupe) groupe.push(ligne);
    else groupes.push([ligne]);
  }
  return groupes;
}

function frequenceDe(lignes) {
  const dates = lignes.map((l) => l.date.getTime());
  const ecarts = dates.slice(1).map((d, i) => (d - dates[i]) / JOUR);
  if (!ecarts.length) return null;
  const typique = mediane(ecarts);
  const frequence = FREQUENCES.find((f) => typique >= f.min && typique <= f.max);
  if (!frequence || lignes.length < frequence.occurrences) return null;
  // Un mois manquant (relevé non importé) est toléré, pas une date irrégulière.
  const reguliers = ecarts.filter((e) => e >= frequence.min && e <= frequence.max * 2.2 && (e <= frequence.max || e >= frequence.min * 2)).length;
  const dansLaCadence = ecarts.filter((e) => e >= frequence.min && e <= frequence.max).length;
  if (reguliers / ecarts.length < 0.8 || dansLaCadence / ecarts.length < 0.6) return null;
  return frequence;
}

function dernierChangementDePrix(lignes) {
  for (let i = lignes.length - 1; i > 0; i -= 1) {
    const avant = lignes[i - 1].montant;
    const apres = lignes[i].montant;
    // Sous ce seuil, ce sont des variations de change, pas une hausse de prix.
    if (Math.abs(apres - avant) >= 0.5 && Math.abs(apres - avant) / avant >= 0.03) {
      return { ancien: arrondi(avant), nouveau: arrondi(apres), date: lignes[i].date.toISOString().slice(0, 10) };
    }
  }
  return null;
}

function construire(cle, lignes, frequence, variable, aujourdhui) {
  const derniere = lignes[lignes.length - 1];
  const montant = variable ? mediane(lignes.map((l) => l.montant)) : derniere.montant;
  const prochaine = new Date(derniere.date.getTime() + frequence.jours * JOUR);
  const actif = (aujourdhui.getTime() - derniere.date.getTime()) / JOUR <= frequence.max * 1.5 + 5;
  const nouveau = (aujourdhui.getTime() - lignes[0].date.getTime()) / JOUR <= 90;
  const coutMensuel = montant * frequence.parMois;
  return {
    // Le premier montant, et non le dernier : une hausse de prix ne doit pas faire réapparaître une ligne ignorée.
    id: `${cle}|${variable ? 'variable' : Math.round(lignes[0].montant)}`,
    cle,
    nom: derniere.nomAffiche,
    categorie: derniere.categorie,
    compte: derniere.compte,
    frequence: frequence.id,
    frequenceLibelle: frequence.libelle,
    montant: arrondi(montant),
    variable,
    coutMensuel: arrondi(coutMensuel),
    coutAnnuel: arrondi(coutMensuel * 12),
    occurrences: lignes.length,
    premiere: lignes[0].date.toISOString().slice(0, 10),
    derniere: derniere.date.toISOString().slice(0, 10),
    prochaine: actif ? prochaine.toISOString().slice(0, 10) : null,
    actif,
    nouveau: actif && nouveau,
    changementPrix: variable ? null : dernierChangementDePrix(lignes),
  };
}

/**
 * Renvoie les dépenses récurrentes détectées, les plus coûteuses d'abord.
 * Les courses reviennent aussi chaque mois, mais ni leur montant ni leur date ne sont réguliers : elles sont écartées.
 */
export function detecterAbonnements(transactions, { aujourdhui = new Date(), comptes = null } = {}) {
  const parMarchand = new Map();
  const vus = new Set();
  for (const t of transactions || []) {
    const montant = parseFloat(t.montant);
    const date = versDate(t.date);
    if (!(montant < 0) || !date || estTransfertInterne(t.nom, t.categorie)) continue;
    if (comptes && !comptes.includes(t.compte)) continue;
    const nom = nomMarchand(t.nom);
    if (!nom) continue;
    // Une même opération peut exister en double après un passage du CSV à la banque connectée.
    const empreinte = `${nom}|${String(t.date).slice(0, 10)}|${montant}`;
    if (vus.has(empreinte)) continue;
    vus.add(empreinte);
    const cle = nom.split(' ')[0];
    if (!parMarchand.has(cle)) parMarchand.set(cle, []);
    parMarchand.get(cle).push({ date, montant: Math.abs(montant), nomAffiche: nom, categorie: t.categorie, compte: t.compte });
  }

  const resultats = [];
  for (const [cle, lignes] of parMarchand) {
    const reconnues = new Set();
    for (const groupe of grouperParMontant(lignes)) {
      const parDate = [...groupe].sort((a, b) => a.date - b.date);
      const frequence = frequenceDe(parDate);
      if (frequence) {
        resultats.push(construire(cle, parDate, frequence, false, aujourdhui));
        parDate.forEach((l) => reconnues.add(l));
      }
    }
    // Montant variable mais date très régulière : électricité, eau… Jamais moins de 4 occurrences.
    if (!reconnues.size && lignes.length >= 4) {
      const parDate = [...lignes].sort((a, b) => a.date - b.date);
      const frequence = frequenceDe(parDate);
      if (frequence && frequence.id !== 'hebdomadaire') resultats.push(construire(cle, parDate, frequence, true, aujourdhui));
    }
  }
  return resultats.sort((a, b) => Number(b.actif) - Number(a.actif) || b.coutMensuel - a.coutMensuel);
}

const MOIS_PAR_FREQUENCE = { mensuel: 1, bimestriel: 2, trimestriel: 3, semestriel: 6, annuel: 12 };

// jour : le jour du prélèvement d'origine, pour qu'un passage par un mois court ne le décale pas durablement.
function ajouterPeriode(date, frequence, jour) {
  const suivante = new Date(date);
  if (frequence.id === 'hebdomadaire') {
    suivante.setDate(suivante.getDate() + 7);
    return suivante;
  }
  suivante.setDate(1);
  suivante.setMonth(suivante.getMonth() + MOIS_PAR_FREQUENCE[frequence.id]);
  const dernierJour = new Date(suivante.getFullYear(), suivante.getMonth() + 1, 0).getDate();
  suivante.setDate(Math.min(jour, dernierJour));
  return suivante;
}

const enIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Prévisions à créer pour un abonnement : ses échéances d'aujourd'hui à la fin de l'année, ou la suivante s'il n'y en a plus cette année.
 * Une échéance est écartée si le même marchand a déjà une prévision de montant proche ce mois-là.
 */
export function previsionsAAjouter(abonnement, previsionsExistantes = [], { aujourdhui = new Date() } = {}) {
  const frequence = FREQUENCES.find((f) => f.id === abonnement.frequence);
  if (!frequence || !abonnement.actif) return [];
  let date = new Date(`${abonnement.derniere}T12:00:00`);
  const jour = date.getDate();
  while (date < aujourdhui) date = ajouterPeriode(date, frequence, jour);
  const echeances = [date];
  for (date = ajouterPeriode(date, frequence, jour); date.getFullYear() === aujourdhui.getFullYear(); date = ajouterPeriode(date, frequence, jour)) {
    echeances.push(date);
  }
  const dejaPrevue = (echeance) => previsionsExistantes.some((p) => {
    const datePrevue = versDate(p.date);
    const montant = Math.abs(parseFloat(p.montant));
    const nom = nomMarchand(String(p.nom || '').replace(/^\[PR[ÉE]VI\]\s*/i, ''));
    return datePrevue && nom.split(' ')[0] === abonnement.cle
      && datePrevue.getFullYear() === echeance.getFullYear() && datePrevue.getMonth() === echeance.getMonth()
      && Math.abs(montant - abonnement.montant) <= Math.max(abonnement.montant * 0.15, 0.5);
  });
  return echeances.filter((e) => !dejaPrevue(e)).map((e) => {
    const mois = e.toLocaleDateString('fr-FR', { month: 'long' });
    return {
      nom: abonnement.nom.length <= 4 ? abonnement.nom : abonnement.nom.charAt(0) + abonnement.nom.slice(1).toLowerCase(),
      montant: -abonnement.montant,
      categorie: abonnement.categorie,
      compte: abonnement.compte,
      date: enIso(e),
      mois: mois.charAt(0).toUpperCase() + mois.slice(1),
      annee: e.getFullYear(),
      actif: true,
    };
  });
}

/** Totaux des dépenses récurrentes actives. */
export function totauxAbonnements(abonnements) {
  const actifs = abonnements.filter((a) => a.actif);
  const mensuel = actifs.reduce((total, a) => total + a.coutMensuel, 0);
  return { nombre: actifs.length, mensuel: arrondi(mensuel), annuel: arrondi(mensuel * 12) };
}
