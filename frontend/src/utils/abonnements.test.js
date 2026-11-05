import test from 'node:test';
import assert from 'node:assert/strict';
import { detecterAbonnements, nomMarchand, totauxAbonnements } from './abonnements.js';

const AUJOURDHUI = new Date('2026-11-05T12:00:00');
const tx = (date, nom, montant, categorie = 'Divers', compte = 'CCP') => ({ date, nom, montant: -montant, categorie, compte });
const mensuel = (nom, montant, mois = [6, 7, 8, 9, 10], jour = 5) => mois.map((m) => tx(`2026-${String(m).padStart(2, '0')}-${String(jour).padStart(2, '0')}`, nom, montant));
const detecter = (t, options) => detecterAbonnements(t, { aujourdhui: AUJOURDHUI, ...options });

test('le marchand est le même, quelle que soit la forme du libellé', () => {
  assert.equal(nomMarchand('ACHAT CB NETFLIX COM 05/02/26 EUR CARTE NUMERO 123'), 'NETFLIX');
  assert.equal(nomMarchand('NETFLIX COM'), 'NETFLIX');
  assert.equal(nomMarchand('PRELEVEMENT DE SFR REF : 0034 1-H3QM2HVR SFR Prlvt SEPA'), 'SFR');
  assert.equal(nomMarchand('SFR REF : 003480864132 1-H3QM2HVR SFR Prlvt SEPA 1-H3QM2HVR'), 'SFR');
  assert.equal(nomMarchand('PREL DE ORANGE SA 165330970655351227533110599550 Votre abonnement'), 'ORANGE');
  assert.equal(nomMarchand('ACHAT CB HELP TWITCH TV CARTE NUMERO 1'), 'TWITCH TV');
  assert.equal(nomMarchand('VIREMENT PERMANENT POUR JASON MOLINER COMPTE FR76 REF'), 'JASON MOLINER');
  assert.equal(nomMarchand('PERMANENT POUR JASON MOLINER COMPTE FR76 REF'), 'JASON MOLINER');
  assert.equal(nomMarchand('Électricité de France'), 'ELECTRICITE FRANCE');
  assert.equal(nomMarchand(''), '');
});

test('un abonnement mensuel à montant fixe est détecté, avec ses coûts', () => {
  const [a, ...autres] = detecter(mensuel('NETFLIX COM', 14.99));
  assert.deepEqual(autres, []);
  assert.equal(a.nom, 'NETFLIX');
  assert.equal(a.frequence, 'mensuel');
  assert.equal(a.montant, 14.99);
  assert.equal(a.coutMensuel, 14.99);
  assert.equal(a.coutAnnuel, 179.88);
  assert.equal(a.actif, true);
  assert.equal(a.occurrences, 5);
});

test('un changement de libellé ne coupe pas la série', () => {
  const t = [...mensuel('ACHAT CB NETFLIX COM CARTE NUMERO 1', 14.99, [2, 3, 4, 5, 6]), ...mensuel('NETFLIX COM', 14.99, [7, 8, 9, 10])];
  const resultat = detecter(t);
  assert.equal(resultat.length, 1);
  assert.equal(resultat[0].occurrences, 9);
});

test('deux forfaits chez un même opérateur restent séparés', () => {
  const t = [...mensuel('SEPA ORANGE SA-ORAN Votre abonnement mobile', 15.99, undefined, 15), ...mensuel('ORANGE SA REF : 1653 Votre abonnement', 33.99, undefined, 28)];
  assert.deepEqual(detecter(t).map((a) => a.montant).sort(), [15.99, 33.99]);
});

test('les courses, trop irrégulières, sont écartées', () => {
  const dates = ['2026-06-02', '2026-06-09', '2026-06-20', '2026-07-01', '2026-07-03', '2026-07-22', '2026-08-11', '2026-08-30', '2026-09-04', '2026-09-27', '2026-10-13'];
  const montants = [14.05, 1.66, 55.03, 22, 8.4, 31.2, 4.9, 17.3, 41, 12.5, 26];
  assert.deepEqual(detecter(dates.map((d, i) => tx(d, 'INTERMARCHE', montants[i], 'Courses'))), []);
});

test('un achat fréquent à prix fixe mais sans rythme est écarté', () => {
  const t = ['2026-02-10', '2026-03-02', '2026-04-29', '2026-05-07', '2026-07-13'].map((d) => tx(d, 'ADOPT AVIGNON', 11.95));
  assert.deepEqual(detecter(t), []);
});

test('deux occurrences mensuelles ne suffisent pas', () => {
  assert.deepEqual(detecter(mensuel('ESSAI', 9.99, [9, 10])), []);
});

test('un abonnement trimestriel est détecté et ramené au mois', () => {
  const t = ['2026-01-05', '2026-04-06', '2026-07-06', '2026-10-05'].map((d) => tx(d, 'COTISATION TRIMESTRIELLE', 21.3));
  const [a] = detecter(t);
  assert.equal(a.frequence, 'trimestriel');
  assert.equal(a.coutMensuel, 7.1);
  assert.equal(a.coutAnnuel, 85.2);
});

test('un abonnement annuel demande deux occurrences', () => {
  assert.deepEqual(detecter([tx('2026-02-01', 'AMAZON PRIME', 69.9)]), []);
  const [a] = detecter([tx('2025-02-01', 'AMAZON PRIME', 69.9), tx('2026-02-01', 'AMAZON PRIME', 69.9)]);
  assert.equal(a.frequence, 'annuel');
  assert.equal(a.coutMensuel, 5.83);
});

test('un abonnement qui ne prélève plus est signalé comme arrêté', () => {
  const [a] = detecter(mensuel('SOUNDLY PRO MONTHLY', 17.34, [1, 2, 3, 4, 5, 6, 7], 21));
  assert.equal(a.actif, false);
  assert.equal(a.prochaine, null);
});

test('la prochaine échéance est estimée pour un abonnement actif', () => {
  const [a] = detecter(mensuel('NETFLIX COM', 14.99));
  assert.equal(a.prochaine.slice(0, 7), '2026-11');
});

test('une hausse de prix est repérée, pas une variation de change', () => {
  const hausse = [...mensuel('HBOMAX', 9.99, [6, 7, 8]), ...mensuel('HBOMAX', 10.99, [9, 10])];
  assert.deepEqual(detecter(hausse)[0].changementPrix, { ancien: 9.99, nouveau: 10.99, date: '2026-09-05' });
  const change = [17.1, 17.34, 17.69, 17.2, 17.5].map((m, i) => tx(`2026-${String(i + 6).padStart(2, '0')}-21`, 'SOUNDLY', m));
  assert.equal(detecter(change)[0].changementPrix, null);
});

test('un montant variable à date régulière est gardé comme tel', () => {
  const t = [['2026-02-05', 74], ['2026-03-05', 92.36], ['2026-04-05', 386.41], ['2026-05-05', 110], ['2026-06-05', 81]].map(([d, m]) => tx(d, 'PRELEVEMENT DE ENGIE S A REF MANDAT', m));
  const [a] = detecter(t);
  assert.equal(a.variable, true);
  assert.equal(a.montant, 92.36);
  assert.equal(a.changementPrix, null);
});

test('un loyer par virement permanent compte, un virement interne non', () => {
  const loyer = mensuel('VIREMENT PERMANENT POUR JASON MOLINER COMPTE FR REF', 780);
  assert.equal(detecter(loyer)[0].montant, 780);
  const interne = mensuel('Virement vers livret', 100).map((t) => ({ ...t, categorie: 'Virement : CCP vers Livret A' }));
  assert.deepEqual(detecter(interne), []);
});

test('les revenus réguliers ne sont pas des abonnements', () => {
  const salaire = mensuel('SALAIRE', 2500).map((t) => ({ ...t, montant: 2500 }));
  assert.deepEqual(detecter(salaire), []);
});

test('une opération en double n’est comptée qu’une fois', () => {
  const t = [...mensuel('NETFLIX COM', 14.99), ...mensuel('ACHAT CB NETFLIX COM CARTE NUMERO 1', 14.99)];
  assert.equal(detecter(t)[0].occurrences, 5);
});

test('le filtre de comptes limite la détection', () => {
  assert.deepEqual(detecter(mensuel('NETFLIX COM', 14.99), { comptes: ['Autre'] }), []);
  assert.equal(detecter(mensuel('NETFLIX COM', 14.99), { comptes: ['CCP'] }).length, 1);
});

test('les données invalides sont ignorées sans erreur', () => {
  assert.deepEqual(detecter([{ nom: 'X' }, { date: 'pas une date', nom: 'Y', montant: -3 }, null].filter(Boolean)), []);
  assert.deepEqual(detecter(undefined), []);
});

test('les totaux ne comptent que les abonnements actifs', () => {
  const liste = detecter([...mensuel('NETFLIX COM', 14.99), ...mensuel('SOUNDLY', 17.34, [1, 2, 3, 4, 5], 21)]);
  assert.deepEqual(totauxAbonnements(liste), { nombre: 1, mensuel: 14.99, annuel: 179.88 });
});
