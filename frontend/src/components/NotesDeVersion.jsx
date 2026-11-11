import { useState } from 'react';
import {
  Sparkles, Bell, Repeat, Search, Undo2, ShieldCheck, Smartphone, Share2, DatabaseBackup, BookOpen,
  Landmark, Users, ListChecks, BarChart3, Target, PartyPopper, MousePointerClick,
} from 'lucide-react';

// Les notes de chaque version, de la plus récente à la plus ancienne. Les anciennes restent consultables.
const VERSIONS = [
  {
    version: '4.5',
    nouveautes: [
      { Icone: Landmark, couleur: 'text-emerald-400', titre: 'Placements & crédits', texte: 'suivez PEA, assurance vie, crypto, biens et crédits dans la page Comptes : courbe et performance de chaque placement hors versements, échéancier, remboursements anticipés et total net au tableau de bord.' },
      { Icone: Users, couleur: 'text-secondary-400', titre: 'Compte commun', texte: 'partagez des comptes avec une autre personne Kleea : opérations, prévisions et objectifs communs, chacun depuis son propre compte.' },
      { Icone: ListChecks, couleur: 'text-secondary-400', titre: 'Gérer et Prévisionnel', texte: 'des listes regroupées par jour, plus lisibles, avec tri, filtres et modifications en lot, aussi sur téléphone.' },
      { Icone: Bell, couleur: 'text-amber-400', titre: 'Alertes en cours de mois', texte: 'la cloche prévient plus tôt : un budget dépensé trop vite, ou le jour où un solde passera sous zéro.' },
      { Icone: MousePointerClick, couleur: 'text-secondary-400', titre: 'Listes déroulantes', texte: 'un nouveau style, le même partout sur le site, avec les catégories rangées par groupe.' },
      { Icone: BarChart3, couleur: 'text-amber-400', titre: 'Graphiques', texte: 'répartition annuelle en anneau, analyses par catégorie en barres aux couleurs de vos catégories, avec vos objectifs budgétaires.' },
      { Icone: PartyPopper, couleur: 'text-rose-400', titre: 'Wrapped', texte: 'de nouvelles cartes, la comparaison avec l\'an dernier, des pages à faire défiler et une image à télécharger.' },
      { Icone: Target, couleur: 'text-emerald-400', titre: 'Objectifs des projets', texte: 'votre rythme d\'épargne réel, la date d\'atteinte de chaque projet et l\'effort pour tenir l\'échéance.' },
    ],
    corrections: [
      'La répartition annuelle des dépenses ne compte plus que l\'année choisie.',
      'Le « mois le plus sage » du Wrapped ne désigne plus un mois à venir.',
      'L\'activité des dépenses tient en entier, sans défilement.',
      'Les listes déroulantes ne sont plus coupées en bas des tableaux.',
    ],
  },
  {
    version: '4.4',
    nouveautes: [
      { Icone: Bell, couleur: 'text-amber-400', titre: 'Alertes', texte: 'la cloche signale un budget presque atteint, un découvert prévu, une banque à reconnecter ou des transactions à importer.' },
      { Icone: Repeat, couleur: 'text-secondary-400', titre: 'Abonnements', texte: 'Kleea repère vos paiements récurrents et leur coût, et les ajoute à vos prévisions en un clic.' },
      { Icone: Search, couleur: 'text-secondary-400', titre: 'Recherche globale', texte: 'la loupe ou Ctrl + K retrouve une opération, une catégorie ou un compte depuis n\'importe quelle page.' },
      { Icone: Undo2, couleur: 'text-emerald-400', titre: 'Annuler', texte: 'quelques secondes pour revenir sur une suppression ou un import.' },
      { Icone: ShieldCheck, couleur: 'text-emerald-400', titre: 'Double authentification', texte: 'facultative, par code reçu par e-mail, à activer depuis votre profil.' },
      { Icone: Smartphone, couleur: 'text-emerald-400', titre: 'Appareils connectés', texte: 'voyez où votre compte est ouvert et déconnectez un appareil à distance.' },
      { Icone: DatabaseBackup, couleur: 'text-emerald-400', titre: 'Ma sauvegarde', texte: 'téléchargez toutes vos données dans un fichier que vous pourrez réimporter.' },
      { Icone: Share2, couleur: 'text-rose-400', titre: 'Liens Tricount', texte: 'choisissez leur durée, révoquez-les et consultez l\'historique des modifications.' },
      { Icone: BookOpen, couleur: 'text-secondary-400', titre: 'Guide', texte: 'un vrai tutoriel, avec les premiers pas et toutes les fonctions.' },
    ],
    corrections: [
      'Les remboursements ne comptent plus comme des dépenses dans le suivi des budgets.',
      'Les budgets sur tous les comptes sont correctement suivis.',
      'Les titres des cartes du tableau de bord restent sur une ligne et alignés.',
    ],
  },
];

// Notes de version : la version en cours s'ouvre, les précédentes restent dans leurs onglets.
function NotesDeVersion({ CURRENT_VERSION, handleClosePatchModal }) {
  const [choisie, setChoisie] = useState(VERSIONS.some((v) => v.version === CURRENT_VERSION) ? CURRENT_VERSION : VERSIONS[0].version);
  const notes = VERSIONS.find((v) => v.version === choisie) || VERSIONS[0];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-200 select-none">

      <div className="w-full max-w-lg bg-[var(--surface)] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">

        {/* 1. EN-TÊTE OFFICIEL DE LA MISE À JOUR */}
        <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-secondary-500/15 border border-secondary-500/30 flex items-center justify-center text-secondary-400 shadow-[0_0_15px_color-mix(in_srgb,var(--secondary)_20%,transparent)] shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-secondary-400 uppercase tracking-widest bg-secondary-500/10 px-2 py-0.5 rounded-sm border border-secondary-500/20">
                  Notes de version
                </span>
                <span className="text-[9px] font-mono text-white/30 font-bold">v{CURRENT_VERSION}</span>
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight mt-0.5">
                Nouveautés & Améliorations
              </h3>
            </div>
          </div>

          <div role="tablist" aria-label="Versions" className="flex gap-0.5 p-[3px] rounded-[10px] bg-white/[0.05] shrink-0">
            {VERSIONS.map((v) => (
              <button key={v.version} type="button" role="tab" aria-selected={choisie === v.version} onClick={() => setChoisie(v.version)}
                className={`px-2.5 py-1 rounded-[7px] text-[11px] font-bold tabular-nums cursor-pointer transition-colors ${choisie === v.version ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80'}`}>
                v{v.version}
              </button>
            ))}
          </div>
        </div>

        <div role="tabpanel" aria-label={`Version ${notes.version}`} className="max-h-[55vh] overflow-y-auto custom-scrollbar pr-1 space-y-3.5 mb-6 text-left">
          <div className="space-y-1.5 text-[10px] text-white/70">
            <h4 className="text-[11px] font-black uppercase text-white/90 tracking-wider">Nouveautés</h4>
            {notes.nouveautes.map((note) => (
              <div key={note.titre} className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] border border-white/5">
                <note.Icone size={13} className={`${note.couleur} shrink-0`} aria-hidden="true" />
                <span><strong>{note.titre} :</strong> {note.texte}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-[10px] text-white/60 leading-relaxed">
            <h4 className="text-[11px] font-black uppercase text-white/90 tracking-wider">Corrections</h4>
            <ul className="list-disc pl-4 space-y-0.5">
              {notes.corrections.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>

        {/* 5. BOUTON DE FERMETURE */}
        <button
          type="button"
          onClick={handleClosePatchModal}
          className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
        >
          Découvrir la mise à jour ! 🚀
        </button>

      </div>
    </div>
  );
}

export default NotesDeVersion;
