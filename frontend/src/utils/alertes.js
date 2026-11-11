import { anneeTransaction, budgetSurTousLesComptes, calculerSoldes, indexMois, montantDepense } from './finance.js';

// Calcul des alertes. Elles dépendent de la date du jour, jamais du mois ou du profil affichés à l'écran.

const JOUR = 86_400_000;
const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const SEUIL_BUDGET_PROCHE = 80;
// Rythme : à partir du 5 du mois, un budget déjà entamé de 40 % et qui, à ce train, dépasserait sa limite.
export const JOUR_MIN_RYTHME = 5;
export const SEUIL_RYTHME = 40;
export const JOURS_AVANT_EXPIRATION = 7;
// Le cron passe une fois par jour : au-delà de trois jours sans succès, ce n'est plus un simple retard.
export const JOURS_SANS_SYNCHRO = 3;

const euros = (valeur) => `${Math.abs(valeur).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const cle = (nom) => String(nom || '').trim().toUpperCase();
const moisIso = (annee, mois) => `${annee}-${String(mois + 1).padStart(2, '0')}`;

function alertesBanques(connexions) {
  const alertes = [];
  for (const c of connexions || []) {
    const nom = c.connector_name || 'Une banque';
    if (c.needs_reconnect || (c.days_left !== null && c.days_left !== undefined && c.days_left <= 0)) {
      alertes.push({
        id: `banque:${c.id}:expiree`,
        type: 'banque',
        gravite: 'critique',
        titre: `${nom} à reconnecter`,
        detail: "Ses opérations n'arrivent plus tant que l'accès n'est pas renouvelé.",
        page: 'profile',
        action: 'Reconnecter',
      });
    } else if (c.days_left !== null && c.days_left !== undefined && c.days_left <= JOURS_AVANT_EXPIRATION) {
      alertes.push({
        id: `banque:${c.id}:bientot`,
        type: 'banque',
        gravite: 'attention',
        titre: `${nom} expire bientôt`,
        detail: `L'accès est à renouveler d'ici ${c.days_left} jour${c.days_left > 1 ? 's' : ''}.`,
        page: 'profile',
        action: 'Prolonger',
      });
    }
  }
  return alertes;
}

function alertesImport(connexions, aImporter) {
  if (!connexions?.length) return [];
  // Le serveur renvoie un nombre ou un objet { count } selon les cas, comme le gère déjà la page Importer.
  const comptes = Object.entries(aImporter || {})
    .map(([compte, valeur]) => [compte, Number(typeof valeur === 'object' ? valeur?.count : valeur) || 0])
    .filter(([, nombre]) => nombre > 0);
  const total = comptes.reduce((somme, [, nombre]) => somme + nombre, 0);
  if (!total) return [];
  const pluriel = total > 1;
  return [{
    // Le nombre fait partie de l'identifiant : masquée, l'alerte revient si d'autres opérations arrivent.
    id: `import:${total}`,
    type: 'import',
    gravite: 'attention',
    titre: `${total} transaction${pluriel ? 's' : ''} à importer`,
    detail: comptes.length === 1 ? `Sur ${comptes[0][0]}.` : `Sur ${comptes.length} comptes.`,
    page: 'importer',
    action: 'Importer',
  }];
}

function alertesSynchro(synchro, { modeAuto, aujourdhui }) {
  if (!modeAuto || !synchro) return [];
  const temps = (valeur) => (valeur ? new Date(valeur).getTime() : 0);
  const succes = temps(synchro.dernier_succes);
  const echec = temps(synchro.dernier_echec);
  if (echec > succes) {
    return [{
      // Le jour fait partie de l'identifiant : une panne qui revient un autre jour s'affiche de nouveau.
      id: `synchro:echec:${new Date(echec).toISOString().slice(0, 10)}`,
      type: 'synchro',
      gravite: 'critique',
      titre: 'Dernière synchronisation en échec',
      detail: 'Vos soldes et vos opérations récentes peuvent être incomplets.',
      page: 'importer',
      action: 'Vérifier',
    }];
  }
  if (succes && (aujourdhui.getTime() - succes) / JOUR > JOURS_SANS_SYNCHRO) {
    return [{
      id: `synchro:ancienne:${new Date(succes).toISOString().slice(0, 10)}`,
      type: 'synchro',
      gravite: 'attention',
      titre: 'Pas de synchronisation récente',
      detail: `Dernier succès il y a ${Math.floor((aujourdhui.getTime() - succes) / JOUR)} jours.`,
      page: 'importer',
      action: 'Vérifier',
    }];
  }
  return [];
}

function alertesBudgets(budgets, transactions, aujourdhui) {
  const mois = aujourdhui.getMonth();
  const annee = aujourdhui.getFullYear();
  const jour = aujourdhui.getDate();
  const joursDuMois = new Date(annee, mois + 1, 0).getDate();
  const ecoule = jour / joursDuMois;
  const groupes = new Map();
  for (const b of budgets || []) {
    if (indexMois(b.mois) !== mois || Number(b.annee ?? annee) !== annee || !b.nom) continue;
    if (!groupes.has(b.nom)) groupes.set(b.nom, { limite: 0, comptes: new Set(), tous: false });
    const groupe = groupes.get(b.nom);
    groupe.limite += Number(b.somme) || 0;
    if (budgetSurTousLesComptes(b.compte)) groupe.tous = true;
    else groupe.comptes.add(cle(b.compte));
  }
  const alertes = [];
  for (const [nom, groupe] of groupes) {
    if (groupe.limite <= 0) continue;
    const reel = (transactions || []).reduce((total, t) => {
      const bonMois = indexMois(t.mois) === mois && parseInt(anneeTransaction(t) || 0, 10) === annee;
      return bonMois && t.categorie === nom && (groupe.tous || groupe.comptes.has(cle(t.compte))) ? total + montantDepense(t) : total;
    }, 0);
    const pourcentage = Math.round((reel / groupe.limite) * 100);
    if (reel > groupe.limite) {
      alertes.push({
        id: `budget:${nom}:${moisIso(annee, mois)}:depasse`,
        type: 'budget',
        gravite: 'critique',
        titre: `Budget ${nom} dépassé`,
        detail: `${euros(reel)} dépensés pour une limite de ${euros(groupe.limite)}.`,
        page: 'gerer',
        action: 'Voir',
      });
    } else if (pourcentage >= SEUIL_BUDGET_PROCHE) {
      alertes.push({
        id: `budget:${nom}:${moisIso(annee, mois)}:proche`,
        type: 'budget',
        gravite: 'attention',
        titre: `Budget ${nom} à ${pourcentage} % au ${jour} ${NOMS_MOIS[mois]}`,
        detail: `Il reste ${euros(groupe.limite - reel)} sur ${euros(groupe.limite)}.`,
        page: 'gerer',
        action: 'Voir',
      });
    } else if (jour >= JOUR_MIN_RYTHME && pourcentage >= SEUIL_RYTHME && reel / ecoule > groupe.limite * 1.05) {
      // Le rythme du mois, prolongé jusqu'à la fin : la limite serait dépassée.
      alertes.push({
        id: `budget:${nom}:${moisIso(annee, mois)}:rythme`,
        type: 'budget',
        gravite: 'attention',
        titre: `Budget ${nom} : ${pourcentage} % dépensé au ${jour} ${NOMS_MOIS[mois]}`,
        detail: `À ce rythme, ${euros(reel / ecoule)} fin ${NOMS_MOIS[mois]} pour ${euros(groupe.limite)} prévus.`,
        page: 'gerer',
        action: 'Voir',
      });
    }
  }
  return alertes;
}

function alertesDecouvert(comptes, transactions, previsions, aujourdhui) {
  const annee = aujourdhui.getFullYear();
  const debutDuJour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate());
  const consomme = new Map();
  for (const t of transactions || []) {
    if (t.prevision_id) consomme.set(t.prevision_id, (consomme.get(t.prevision_id) || 0) + Math.abs(parseFloat(t.montant) || 0));
  }
  // Par compte et par mois, ce qui reste à venir. Une prévision à date passée est supposée réglée.
  // Pour le mois en cours, on garde aussi le jour : le solde peut passer sous zéro avant la fin du mois.
  const mouvements = new Map();
  const ceMois = new Map();
  for (const p of previsions || []) {
    const date = new Date(`${String(p.date || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime()) || date < debutDuJour || date.getFullYear() !== annee) continue;
    if (p.actif === false || p.actif === 0) continue;
    const montant = parseFloat(p.montant) || 0;
    const reste = Math.max(0, Math.abs(montant) - (consomme.get(p.id) || 0));
    if (!reste || !p.compte) continue;
    const compte = cle(p.compte);
    if (!mouvements.has(compte)) mouvements.set(compte, new Array(12).fill(0));
    mouvements.get(compte)[date.getMonth()] += montant < 0 ? -reste : reste;
    if (date.getMonth() === aujourdhui.getMonth()) {
      if (!ceMois.has(compte)) ceMois.set(compte, []);
      ceMois.get(compte).push({ jour: date.getDate(), montant: montant < 0 ? -reste : reste });
    }
  }
  if (!mouvements.size) return [];

  const { soldes } = calculerSoldes({ comptes, transactions, annee, moisIndex: 11 });
  const alertes = [];
  for (const [compte, parMois] of mouvements) {
    if (soldes[compte] === undefined) continue;
    let solde = soldes[compte];
    const nomDuCompte = (comptes || []).find((c) => cle(c.compte) === compte)?.compte || compte;
    const m0 = aujourdhui.getMonth();
    // Jour par jour sur le mois en cours ; à jour égal, les rentrées passent avant les sorties.
    const jours = (ceMois.get(compte) || []).sort((a, b) => a.jour - b.jour || b.montant - a.montant);
    let courant = soldes[compte];
    let sousZero = null;
    let plusBas = 0;
    let remonte = null;
    for (const { jour, montant } of jours) {
      courant += montant;
      if (courant < 0 && sousZero === null) sousZero = jour;
      if (sousZero !== null) plusBas = Math.min(plusBas, courant);
      if (sousZero !== null && remonte === null && courant >= 0) remonte = jour;
    }
    if (sousZero !== null && courant >= 0) {
      // Le compte remonte avant la fin du mois, mais passe quand même dans le rouge.
      alertes.push({
        id: `decouvert:${compte}:${moisIso(annee, m0)}`,
        type: 'decouvert',
        gravite: 'attention',
        titre: `Solde de ${nomDuCompte} sous zéro le ${sousZero} ${NOMS_MOIS[m0]}`,
        detail: `Jusqu'à -${euros(plusBas)} avant de remonter le ${remonte} ${NOMS_MOIS[m0]}.`,
        page: 'previsionnel',
        action: 'Voir',
      });
      continue;
    }
    for (let m = aujourdhui.getMonth(); m < 12; m += 1) {
      solde += parMois[m];
      if (solde < 0) {
        const nom = (comptes || []).find((c) => cle(c.compte) === compte)?.compte || compte;
        alertes.push({
          id: `decouvert:${compte}:${moisIso(annee, m)}`,
          type: 'decouvert',
          gravite: m === aujourdhui.getMonth() ? 'critique' : 'attention',
          titre: `Découvert prévu sur ${nom}`,
          detail: m === m0 && sousZero !== null
            ? `Sous zéro dès le ${sousZero} ${NOMS_MOIS[m]}, -${euros(solde)} estimés fin ${NOMS_MOIS[m]}.`
            : `Solde estimé à -${euros(solde)} fin ${NOMS_MOIS[m]}.`,
          page: 'previsionnel',
          action: 'Voir',
        });
        break;
      }
    }
  }
  return alertes;
}

/** Toutes les alertes en cours, les plus graves d'abord. */
export function calculerAlertes({ connexions, aImporter, synchro, modeAuto = false, budgets, previsions, comptes, transactions, aujourdhui = new Date() }) {
  const liste = [
    ...alertesBanques(connexions),
    ...alertesImport(connexions, aImporter),
    ...alertesSynchro(synchro, { modeAuto, aujourdhui }),
    ...alertesDecouvert(comptes, transactions, previsions, aujourdhui),
    ...alertesBudgets(budgets, transactions, aujourdhui),
  ];
  return liste.sort((a, b) => Number(b.gravite === 'critique') - Number(a.gravite === 'critique'));
}
