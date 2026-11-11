// API simulée : des données inventées, stables, pour parcourir l'application sans serveur ni base.
export const UTILISATEUR = 'testeur';

const transaction = (id, date, nom, montant, categorie, compte, mois, annee = 2026) => ({
  id, date, nom, montant, categorie, compte, mois, annee, utilisateur: UTILISATEUR, enveloppe: null, prevision_id: null, split_id: null,
});

const TRANSACTIONS = [
  transaction(1, '2026-11-02', 'Salaire', 2500, 'Salaire', 'Compte courant', 'Novembre'),
  transaction(2, '2026-11-03', 'Boulangerie', -12.5, 'Courses', 'Compte courant', 'Novembre'),
  transaction(3, '2026-11-04', 'Loyer', -800, 'Logement', 'Compte courant', 'Novembre'),
  transaction(4, '2026-11-04', 'Virement livret', -300, 'Virement interne', 'Compte courant', 'Novembre'),
  transaction(5, '2026-11-04', 'Virement livret', 300, 'Virement interne', 'Livret A', 'Novembre'),
  transaction(6, '2026-10-02', 'Salaire', 2500, 'Salaire', 'Compte courant', 'Octobre'),
  transaction(7, '2026-10-12', 'Restaurant', -45, 'Sorties', 'Compte courant', 'Octobre'),
  transaction(8, '2025-12-15', 'Cadeaux', -150, 'Loisirs', 'Compte courant', 'Décembre', 2025),
];

const COMPTES = [
  { Compte: 'Compte courant', Groupe: 'Testeur', Solde: 1500, Objectif: 0, Couleur: '#4f46e5', Taux: 0, Type: 'CCP', compte: 'Compte courant', groupe: 'Testeur', solde: 1500, objectif: 0, couleur: '#4f46e5', taux: 0, powens_name: null },
  { Compte: 'Livret A', Groupe: 'Testeur', Solde: 5000, Objectif: 10000, Couleur: '#10b981', Taux: 1.5, Type: 'Livret', compte: 'Livret A', groupe: 'Testeur', solde: 5000, objectif: 10000, couleur: '#10b981', taux: 1.5, powens_name: null },
];

const CATEGORIES = ['Salaire', 'Courses', 'Logement', 'Sorties', 'Loisirs', 'Virement interne'].map((nom) => ({
  nom, utilisateur: UTILISATEUR, icone: 'tag', couleur: '#818cf8', groupe: 'Général',
}));

const REPONSES = [
  [/^\/profile\//, { username: UTILISATEUR, email: 'testeur@kleea.test', name: 'Testeur', import_mode: 'manual', role: 'admin' }],
  [/^\/transactions\/stats\/count\//, { count: TRANSACTIONS.length }],
  [/^\/transactions\//, TRANSACTIONS],
  [/^\/config-comptes\//, COMPTES],
  [/^\/api\/categories\//, CATEGORIES],
  [/^\/dashboard\/periodes\//, [{ mois: 'Novembre', annee: 2026 }, { mois: 'Octobre', annee: 2026 }, { mois: 'Décembre', annee: 2025 }]],
  [/^\/get-groups\//, []],
  [/^\/powens\/connexion-active/, { connecte: false }],
  [/^\/powens\/connections-and-accounts/, { connections_count: 0, connections: [], accounts_count: 0, accounts: [] }],
  [/^\/powens\/accounts/, { accounts: [] }],
  [/^\/powens\/check-sync\//, { nouvelles: 0, count: 0 }],
  [/^\/api\/streamdeck\/token/, { active: false, created_at: null }],
  [/^\/api\/sessions$/, { disponible: true, session_suivie: false, sessions: [] }],
  [/^\/note\//, { texte: '' }],
  [/^\/api\/notes-demenagement\//, { contenu: '' }],
  [/^\/get-user-theme\//, {}],
  [/^\/get-theme\//, null],
];

/** Sert toutes les requêtes vers l'API simulée, et note celles qui partent. */
export async function brancherApi(page) {
  const appels = [];
  await page.route('http://api.kleea.test/**', (route) => {
    const requete = route.request();
    const url = new URL(requete.url());
    const entetes = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (requete.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: entetes });
    appels.push(`${requete.method()} ${url.pathname}`);
    const trouve = REPONSES.find(([motif]) => motif.test(url.pathname));
    return route.fulfill({ status: 200, headers: entetes, contentType: 'application/json', body: JSON.stringify(trouve ? trouve[1] : []) });
  });
  return appels;
}

/** Ouvre la session du compte de test avant le chargement de la page. */
export async function ouvrirSession(page) {
  await page.addInitScript((utilisateur) => {
    localStorage.setItem('user', utilisateur);
    localStorage.setItem('token', 'jeton-de-test');
    localStorage.setItem(`onboarding_done_${utilisateur}`, 'true');
    // Les notes de version ne doivent pas recouvrir l'écran pendant le parcours.
    localStorage.setItem(`patch_view_count_v4.5_${utilisateur}`, '99');
  }, UTILISATEUR);
}
