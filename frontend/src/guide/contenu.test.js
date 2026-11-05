import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Les icônes ne servent pas ici : on charge le contenu sans React, en remplaçant lucide-react.
const source = readFileSync(new URL('./contenu.js', import.meta.url), 'utf8')
  .replace(/import \{[^}]*\} from 'lucide-react';/s, "const icone = () => null; const [ChartCandlestick, FileUp, Gamepad2, HelpCircle, LayoutDashboard, PiggyBank, Settings2, UserCog, Users2, Wallet] = Array(10).fill(icone);");
const { CHAPITRES, PREMIERS_PAS, normaliser, rechercher } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const SRC = fileURLToPath(new URL('..', import.meta.url));
const PAGES = ['dashboard', 'previsionnel', 'gerer', 'importer', 'comptes', 'tricount', 'profile'];

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return nom === 'guide' ? [] : fichiers(chemin);
    return /\.jsx?$/.test(nom) && !/\.test\./.test(nom) && nom !== 'GuideView.jsx' ? [chemin] : [];
  });
}

const sans = (t) => normaliser(t).replace(/\s+/g, ' ');

test('chaque libellé cité entre guillemets existe dans l’application', () => {
  const code = sans(fichiers(SRC).map((f) => readFileSync(f, 'utf8')).join('\n'));
  // Exemples, valeurs à écrire ou motifs : ils ne sont pas des libellés d'écran.
  const horsLibelles = new Set(['perso', 'commun', 'virement : ccp vers livret a', 'virement :', 'urgence', 'vacances', '🔄', 'transfert', 'vers', 'delete', 'kleea > vue financiere', 'virement', 'doublon', 'budget']);
  const manquants = new Set();
  const textes = [...PREMIERS_PAS.flatMap((e) => [e.pourquoi, e.conseil, ...e.etapes]), ...CHAPITRES.flatMap((c) => [c.intro, ...c.sections.flatMap((s) => [s.texte, s.conseil, s.attention, ...(s.etapes || []), ...(s.points || []).map((p) => p.d)])])];
  for (const texte of textes.filter(Boolean)) {
    for (const [, libelle] of texte.matchAll(/«\s*([^»]+?)\s*»/g)) {
      const v = sans(libelle);
      if (!horsLibelles.has(v) && !code.includes(v)) manquants.add(libelle);
    }
  }
  assert.deepEqual([...manquants], []);
});

test('les boutons du guide mènent vers des pages qui existent', () => {
  for (const e of PREMIERS_PAS) assert.ok(PAGES.includes(e.page), e.id);
  for (const c of CHAPITRES) if (c.page) assert.ok(PAGES.includes(c.page), c.id);
});

test('les sections ont un titre unique dans leur chapitre et un contenu', () => {
  for (const c of CHAPITRES) {
    const titres = c.sections.map((s) => s.titre);
    assert.equal(new Set(titres).size, titres.length, c.id);
    for (const s of c.sections) assert.ok(s.texte || s.etapes || s.points || s.attention, s.titre);
  }
});

test('toutes les pages de l’application ont un chapitre', () => {
  const couvertes = new Set(CHAPITRES.map((c) => c.page));
  for (const page of PAGES) assert.ok(couvertes.has(page), page);
});

test('le guide ne parle pas des pages réservées aux administrateurs', () => {
  const texte = normaliser(JSON.stringify({ PREMIERS_PAS, CHAPITRES }));
  for (const mot of ['administrateur', 'demenagement', 'conges', 'structure du menu', 'studio de design']) {
    assert.ok(!texte.includes(mot), mot);
  }
});

test('la recherche ignore les accents et la casse, et combine les mots', () => {
  assert.ok(rechercher('PREVISION').length > 0);
  assert.ok(rechercher('virement livret').some((r) => r.section === 'Virements entre vos comptes' || r.chapitreId === 'questions'));
  assert.deepEqual(rechercher('mot-introuvable-xyz'), []);
  assert.deepEqual(rechercher('   '), []);
});

test('la recherche renvoie vers les premiers pas', () => {
  assert.ok(rechercher('Bienvenue sur Kleea').some((r) => r.chapitreId === 'premiers-pas'));
});
