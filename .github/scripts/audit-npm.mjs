// Fait échouer la CI sur une faille npm grave ou critique, sauf celles listées ci-dessous avec leur raison.
// À lancer depuis le dossier du projet npm : node ../.github/scripts/audit-npm.mjs
import { execSync } from 'node:child_process';

// Paquet -> pourquoi la faille ne touche pas Kleea. À retirer dès qu'un correctif utilisable existe.
const EXCEPTIONS = {
  xlsx: 'Kleea n’écrit que des fichiers Excel (export) ; les failles concernent la lecture de fichiers. Aucun correctif publié sur npm.',
  zod: 'Plugin Stream Deck : ne valide que les messages du logiciel Stream Deck sur le même ordinateur. Correctif seulement en zod 4, que @elgato/utils n’accepte pas encore.',
  '@elgato/utils': 'Même faille que zod, qu’il embarque.',
  '@elgato/streamdeck': 'Même faille que zod, via @elgato/utils.',
};
const GRAVES = new Set(['high', 'critical']);

let sortie;
try {
  sortie = execSync('npm audit --json', { encoding: 'utf8' });
} catch (erreur) {
  sortie = erreur.stdout; // npm audit sort en erreur dès qu'il trouve une faille : le rapport est quand même là.
}
const rapport = JSON.parse(sortie);
if (rapport.error) {
  console.error(`npm audit n'a pas pu tourner : ${rapport.error.summary || JSON.stringify(rapport.error)}`);
  process.exit(1);
}

const failles = Object.values(rapport.vulnerabilities || {});
const bloquantes = failles.filter((f) => GRAVES.has(f.severity) && !EXCEPTIONS[f.name]);
for (const f of failles) {
  const titres = f.via.filter((v) => typeof v === 'object').map((v) => v.title);
  const statut = !GRAVES.has(f.severity) ? 'signalée' : EXCEPTIONS[f.name] ? `acceptée : ${EXCEPTIONS[f.name]}` : 'BLOQUANTE';
  console.log(`${f.severity.padEnd(8)} ${f.name} — ${statut}${titres.length ? ` (${titres.join(' ; ')})` : ''}`);
}

if (bloquantes.length) {
  console.error(`\n${bloquantes.length} faille(s) grave(s) sans exception : mettre à jour (npm audit fix) ou justifier dans .github/scripts/audit-npm.mjs.`);
  process.exit(1);
}
console.log(`\nAucune faille grave non justifiée (${failles.length} signalée(s) en tout).`);
