import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerRecapPrevisions, calculerSoldesPrevisionnels } from './calculsPrevisions.js';
import { nettoyerMois } from './finance.js';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((v) => ({ v, l: v }));
const LE_22_NOVEMBRE_2026 = new Date(2026, 10, 22);
const COMPTES = [{ compte: 'LEP', groupe: 'Perso' }];
const SOLDES = [{ compte: 'LEP', soldePeriode: 5000 }];
const RETRAIT_DECEMBRE = { id: 1, date: '2026-12-05', nom: 'Retrait LEP', montant: -1000, categorie: 'Divers', compte: 'LEP', mois: 'Décembre', annee: 2026, actif: true };

const soldeLep = (filters, previsions) => calculerSoldesPrevisionnels({
  allPrevisionsAnnee: previsions, cleanMonth: nettoyerMois, comptes: COMPTES, filters, moisListe: MOIS,
  soldesTries: SOLDES, toutesLesTransactions: [], maintenant: LE_22_NOVEMBRE_2026,
})[0].soldeFinalEstime;

test('un retrait prévu en décembre compte encore dans le solde prévu de janvier suivant', () => {
  assert.equal(soldeLep({ annee: '2026', mois: 'Décembre' }, [RETRAIT_DECEMBRE]), 4000);
  assert.equal(soldeLep({ annee: '2027', mois: 'Janvier' }, [RETRAIT_DECEMBRE]), 4000);
});

test("les prévisions de l'année suivante s'ajoutent jusqu'au mois affiché, pas au-delà", () => {
  const fevrier = { ...RETRAIT_DECEMBRE, id: 2, date: '2027-02-05', mois: 'Février', annee: 2027, montant: -200 };
  assert.equal(soldeLep({ annee: '2027', mois: 'Janvier' }, [RETRAIT_DECEMBRE, fevrier]), 4000);
  assert.equal(soldeLep({ annee: '2027', mois: 'Mars' }, [RETRAIT_DECEMBRE, fevrier]), 3800);
});

// Tableau récap : solde réel de 5 000 € aujourd'hui (novembre 2026), aucun mouvement réel ensuite.
const recapReel = (solde) => Array.from({ length: 12 }, () => ({ revReel: 0, depReel: 0, soldeTotalReel: solde }));
const cumuls = (annee, previsions, precedentes = []) => calculerRecapPrevisions({
  allPrevisionsAnnee: previsions, previsionsAnneesPrecedentes: precedentes, cleanMonth: nettoyerMois, comptes: COMPTES,
  excludedMonths: [], filters: { annee, profil: 'Tous' }, moisListe: MOIS, recapAnnuelStats: recapReel(5000),
  toutesLesTransactions: [], maintenant: LE_22_NOVEMBRE_2026,
}).map((m) => m.soldeTotal);

test("le cumul du récap part du solde réel du jour et retire le retrait prévu en décembre", () => {
  const c = cumuls('2026', [RETRAIT_DECEMBRE]);
  assert.equal(c[10], 5000); // novembre, mois en cours
  assert.equal(c[11], 4000); // décembre
});

test("l'année suivante, le cumul repart du solde prévu fin décembre, pas de zéro", () => {
  const janvier = { ...RETRAIT_DECEMBRE, id: 3, date: '2027-01-10', mois: 'Janvier', annee: 2027, montant: 200 };
  const c = cumuls('2027', [janvier], [RETRAIT_DECEMBRE]);
  assert.equal(c[0], 4200);
  assert.equal(c[11], 4200);
});
