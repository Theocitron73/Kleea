import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculerSoldesPrevisionnels } from './calculsPrevisions.js';
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
