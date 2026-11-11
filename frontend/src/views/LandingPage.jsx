import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EDITEUR } from '../legal/editeur';
import { ArrowRight, Building2, Tags, CalendarClock, Users2, ShieldCheck, LayoutDashboard, ListChecks, ChartLine, Wallet, Repeat, Target, Download, Bell, Search, Landmark, PartyPopper, Smartphone, LayoutGrid, Lock, KeyRound, ScrollText, MonitorSmartphone, DatabaseBackup, Trash2, ChevronDown, Check } from 'lucide-react';

// Teintes tirées du thème du site (voir .page-accueil dans index.css). L'accent reste --primary.
const PAGE = 'bg-[var(--acc-page)]';
const CARTE = 'bg-[var(--acc-carte)] border border-[var(--acc-t1)]/[0.08]';
const LIGNE = 'bg-[var(--acc-ligne)]';
const T1 = 'text-[var(--acc-t1)]';
const T2 = 'text-[var(--acc-t2)]';
const T3 = 'text-[var(--acc-t3)]';
const POS = 'text-[#4cc38a]';
const NEG = 'text-[#e5484d]';
const CHIFFRE = 'font-mono tabular-nums';
const TRANSITION = 'transition-[color,background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]';
const BOUTON_PRINCIPAL = `inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[10px] bg-[var(--acc-t1)] text-[var(--acc-page)] text-sm font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] hover:bg-white active:scale-[0.98] cursor-pointer ${TRANSITION}`;
const BOUTON_SECONDAIRE = `inline-flex items-center justify-center h-12 px-5 rounded-[10px] ${LIGNE} border border-[var(--acc-t1)]/[0.08] ${T1} text-sm font-medium hover:bg-[var(--acc-survol)] active:scale-[0.98] cursor-pointer ${TRANSITION}`;

/** Le badge date du relevé, repris de l'application. */
function BadgeDate({ mois, jour }) {
  return (
    <span className={`w-10 h-10 shrink-0 rounded-lg ${LIGNE} border border-[var(--acc-t1)]/[0.08] flex flex-col items-center justify-center leading-none ${CHIFFRE}`}>
      <span className={`text-[11px] ${T3}`}>{mois}</span>
      <span className={`text-sm font-medium ${T1} mt-0.5`}>{jour}</span>
    </span>
  );
}

// Solde total mois par mois : réel jusqu'en octobre, prévu ensuite.
const SOLDES = [
  ['Janv.', 36200], ['Févr.', 37400], ['Mars', 38100], ['Avr.', 39900], ['Mai', 41200], ['Juin', 42050],
  ['Juil.', 43600], ['Août', 45130], ['Sept.', 46680], ['Oct.', 48590], ['Nov.', 50200], ['Déc.', 52400], ['Janv.', 53850],
];
const AUJOURDHUI = 9;

function CourbeSolde() {
  const L = 520, H = 200, BAS = 34000, HAUT = 56000;
  const points = SOLDES.map(([, v], i) => [16 + (i * (L - 32)) / (SOLDES.length - 1), H - 24 - ((v - BAS) / (HAUT - BAS)) * (H - 40)]);
  const trace = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [xA, yA] = points[AUJOURDHUI];
  const [xF, yF] = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="w-full h-auto" role="img" aria-label="Solde total : 36 200 € en janvier, 48 590 € aujourd'hui, 53 850 € prévus en janvier 2027">
      {[40000, 45000, 50000, 55000].map((v) => {
        const y = H - 24 - ((v - BAS) / (HAUT - BAS)) * (H - 40);
        return (
          <g key={v}>
            <line x1="16" x2={L - 16} y1={y} y2={y} stroke="var(--acc-t1)" strokeOpacity="0.06" />
            <text x={L - 16} y={y - 4} textAnchor="end" fontSize="11" fill="var(--acc-t3)" fontFamily="ui-monospace, monospace">{v / 1000} k€</text>
          </g>
        );
      })}
      <path d={trace(points.slice(0, AUJOURDHUI + 1))} fill="none" stroke="var(--acc-t1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <path d={trace(points.slice(AUJOURDHUI))} fill="none" stroke="var(--primary)" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />
      <line x1={xA} x2={xA} y1="12" y2={H - 24} stroke="var(--acc-t1)" strokeOpacity="0.16" />
      <circle cx={xA} cy={yA} r="4.5" fill="var(--acc-page)" stroke="var(--acc-t1)" strokeWidth="2" />
      <circle cx={xF} cy={yF} r="4.5" fill="var(--acc-page)" stroke="var(--primary)" strokeWidth="2" />
      {SOLDES.map(([m], i) => (i % 3 === 0 || i === AUJOURDHUI) && (
        <text key={i} x={points[i][0]} y={H - 6} textAnchor="middle" fontSize="11" fill={i === AUJOURDHUI ? 'var(--acc-t1)' : 'var(--acc-t3)'} fontFamily="ui-monospace, monospace">
          {i === AUJOURDHUI ? "Aujourd'hui" : m}
        </text>
      ))}
    </svg>
  );
}

function ApercuHero({ compact = false }) {
  return (
    <div className={`rounded-2xl ${CARTE} p-5 sm:p-6 space-y-5 shadow-[0_24px_64px_rgba(0,0,0,0.45)]`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${T2}`}>Solde total</p>
          <p className={`text-3xl font-medium ${T1} ${CHIFFRE} mt-1`}>48 590 €</p>
          <p className={`text-xs ${T3} mt-1`}><span className={POS}>+12 390 €</span> depuis janvier</p>
        </div>
        <div className="text-right">
          <p className={`text-sm ${T2}`}>Prévu en janvier 2027</p>
          <p className={`text-xl font-medium text-[color-mix(in_srgb,var(--primary)_55%,var(--acc-t1))] ${CHIFFRE} mt-1`}>53 850 €</p>
        </div>
      </div>
      <CourbeSolde />
      {!compact && <div className="space-y-2">
        {[
          { mois: 'NOV', jour: '05', nom: 'Loyer', detail: 'Prévu, chaque mois', montant: '−850,00 €' },
          { mois: 'NOV', jour: '28', nom: 'Salaire', detail: 'Prévu, chaque mois', montant: '+3 200,00 €', positif: true },
        ].map((l) => (
          <div key={l.nom} className={`flex items-center gap-3 rounded-[10px] ${LIGNE} px-3 py-2`}>
            <BadgeDate mois={l.mois} jour={l.jour} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${T1}`}>{l.nom}</p>
              <p className={`text-xs ${T3}`}>{l.detail}</p>
            </div>
            <span className={`text-sm ${CHIFFRE} ${l.positif ? POS : T1}`}>{l.montant}</span>
          </div>
        ))}
      </div>}
    </div>
  );
}

// Captures de l'application avec des données fictives (e2e/captures-accueil.spec.js les refait).
const PAGES = [
  { id: 'tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard, texte: 'Le mois en cours, le bilan de l’année, vos budgets et l’évolution de votre patrimoine, sur un seul écran.' },
  { id: 'abonnements', label: 'Abonnements', icon: Repeat, texte: 'Les dépenses qui reviennent chaque mois sont repérées seules, avec les hausses de prix.' },
  { id: 'projets', label: 'Projets', icon: Target, texte: 'Chaque projet d’épargne a son coût, son échéance et l’effort mensuel qu’il demande.' },
  { id: 'previsionnel', label: 'Prévisionnel', icon: ChartLine, texte: 'Les dépenses et revenus attendus, et le solde prévu mois par mois jusqu’à la fin de l’année.' },
  { id: 'gerer', label: 'Historique et budgets', icon: ListChecks, texte: 'Toutes vos opérations, filtrées et recatégorisées en un clic, avec vos budgets à côté.' },
  { id: 'importer', label: 'Import', icon: Download, texte: 'Synchronisation bancaire ou fichier CSV : Kleea signale les opérations à importer.' },
  { id: 'comptes', label: 'Comptes', icon: Wallet, texte: 'Comptes courants et livrets, avec leur taux, leur objectif et leur banque, et les comptes partagés avec un proche.' },
  { id: 'tricount', label: 'Tricount', icon: Users2, texte: 'Les dépenses d’un voyage entre amis, et qui doit combien à qui.' },
  { id: 'alertes', label: 'Alertes', icon: Bell, texte: 'Un budget dépassé, un découvert prévu ou des opérations à importer : la cloche vous prévient.' },
  { id: 'recherche', label: 'Recherche', icon: Search, texte: 'Ctrl + K retrouve une opération, une catégorie ou un compte, quel que soit le mois.' },
];

const FONCTIONS = [
  { icon: Building2, titre: 'Vos banques, synchronisées', texte: 'BoursoBank, La Banque Postale, BNP, Revolut et les autres banques prises en charge par Powens : les opérations arrivent seules. Sans connexion, un fichier CSV, OFX ou QIF suffit.' },
  { icon: Tags, titre: 'Des catégories qui s’apprennent', texte: 'Recatégorisez une opération une fois : Kleea s’en souvient et classe les suivantes seul au prochain import.' },
  { icon: CalendarClock, titre: 'Le solde de fin de mois, à l’avance', texte: 'Vos charges fixes et revenus attendus, répétés chaque mois si vous le voulez : Kleea calcule le solde prévu mois par mois.' },
  { icon: Bell, titre: 'Des alertes avant le problème', texte: 'Budget dépensé trop vite, solde qui passera sous zéro le 27, banque à reconnecter : la cloche prévient en cours de mois.' },
  { icon: Landmark, titre: 'Placements et crédits', texte: 'PEA, assurance vie, crypto, immobilier : leur courbe et leur performance hors versements. Pour les crédits, l’échéancier et les remboursements anticipés.' },
  { icon: Users2, titre: 'Un compte commun, à deux', texte: 'Partagez les comptes de votre choix avec un proche, chacun depuis son propre compte Kleea. Vos autres comptes restent privés. Pour un voyage, un Tricount se partage par lien.' },
  { icon: PartyPopper, titre: 'Le bilan de l’année', texte: 'Le Wrapped de vos finances : le mois le plus sage, les catégories qui ont pesé, la comparaison avec l’an dernier, en image à garder.' },
  { icon: Smartphone, titre: 'Sur ordinateur et téléphone', texte: 'Le même Kleea partout, installable comme une application sur votre téléphone. Et un plugin Stream Deck pour voir votre solde d’un coup d’œil.' },
];

const ETAPES = [
  { titre: 'Créez votre compte', texte: 'Un identifiant, une adresse e-mail et un mot de passe. Rien d’autre.' },
  { titre: 'Ajoutez vos opérations', texte: 'Connectez votre banque en quelques écrans, ou importez le fichier téléchargé depuis son site.' },
  { titre: 'Laissez Kleea travailler', texte: 'Il classe, prévoit votre solde et vous prévient avant un découvert ou un budget dépassé.' },
];

const REPERES = ['Synchronisation bancaire', 'Compte commun à deux', 'Double authentification', 'Sans publicité'];

const SECURITE = [
  { icon: Lock, titre: 'Chiffré sur le serveur', texte: 'Vos IBAN et vos accès bancaires sont chiffrés. Kleea ne voit jamais vos identifiants de banque : la connexion passe par Powens.' },
  { icon: KeyRound, titre: 'Double authentification', texte: 'Par une application d’authentification ou par e-mail, à activer depuis votre profil.' },
  { icon: ScrollText, titre: 'Journal et alertes', texte: 'Chaque connexion et chaque changement sensible sont notés, et un e-mail vous prévient d’un nouvel appareil.' },
  { icon: MonitorSmartphone, titre: 'Vos appareils, sous contrôle', texte: 'Voyez où votre compte est ouvert et déconnectez un appareil à distance.' },
  { icon: DatabaseBackup, titre: 'Votre sauvegarde', texte: 'Téléchargez toutes vos données dans un fichier que vous pourrez réimporter.' },
  { icon: Trash2, titre: 'Partir pour de bon', texte: 'Supprimer votre compte efface vraiment toutes vos données, et l’accès à votre banque est révoqué.' },
];

const QUESTIONS = [
  { q: 'Quelles banques sont prises en charge ?', r: 'Celles que propose Powens, le service de connexion bancaire agréé que Kleea utilise : BoursoBank, La Banque Postale, BNP Paribas, Revolut et bien d’autres. Pour une banque absente, importez le fichier CSV, OFX, QIF ou QFX téléchargé depuis son site.' },
  { q: 'Kleea connaît-il mes identifiants bancaires ?', r: 'Non. Vous les saisissez dans les écrans de Powens, jamais dans Kleea. Kleea ne garde qu’un accès en lecture, chiffré, que vous pouvez couper à tout moment.' },
  { q: 'Puis-je l’utiliser sans connecter ma banque ?', r: 'Oui. Le mode manuel fonctionne avec des fichiers d’export, et vous pouvez aussi saisir vos opérations à la main.' },
  { q: 'Comment partager un compte avec mon conjoint ?', r: 'Depuis votre profil, invitez l’autre personne par e-mail et choisissez les comptes à partager. Chacun garde son propre compte Kleea ; à l’arrêt du partage, l’autre personne garde une copie.' },
  { q: 'Et si je veux partir ?', r: 'Téléchargez votre sauvegarde, puis supprimez votre compte depuis le profil : toutes vos données sont effacées et l’accès à votre banque est révoqué.' },
];

export default function LandingPage({ onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('tableau-de-bord');
  const page = PAGES.find((p) => p.id === activeTab);

  return (
    <div className={`page-accueil relative isolate min-h-screen ${PAGE} ${T1} selection:bg-[var(--primary)] selection:text-white overflow-x-hidden font-sans`}>
      {/* Halo de la couleur du site derrière le haut de page, sur toute la largeur. */}
      <div aria-hidden="true" className="pointer-events-none absolute -z-10 inset-x-0 top-0 h-[1100px] bg-[radial-gradient(55%_60%_at_72%_38%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent_70%),radial-gradient(40%_45%_at_12%_8%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent_70%)]" />

      <nav className="fixed top-0 inset-x-0 z-50 bg-[var(--acc-page)]/85 backdrop-blur-md border-b border-[var(--acc-t1)]/[0.08]">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2.5">
            <img src="/Kleea_2.png" alt="" width="28" height="28" className="w-7 h-7 rounded-lg" />
            <span className={`text-base font-medium ${T1}`}>Kleea</span>
          </a>
          <div className={`hidden md:flex items-center gap-8 text-sm ${T2}`}>
            <a href="#showcase" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>L’application</a>
            <a href="#features" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Fonctionnalités</a>
            <a href="#security" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Sécurité</a>
            <a href="#faq" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Questions</a>
            <a href="/guide" target="_blank" rel="noopener noreferrer" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Guide</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button onClick={() => onOpenAuth('login')} className={`text-sm ${T2} hover:text-[var(--acc-t1)] cursor-pointer ${TRANSITION}`}>
              Se connecter
            </button>
            <button onClick={() => onOpenAuth('register')} className={`h-9 px-4 rounded-lg bg-[var(--acc-t1)] text-[var(--acc-page)] text-sm font-medium hover:bg-white active:scale-[0.98] cursor-pointer ${TRANSITION}`}>
              Créer un compte
            </button>
          </div>
        </div>
      </nav>

      <section className="relative max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-20 lg:min-h-[100svh] grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Tailles en px : sur les écrans de portable, le site réduit la taille de base du texte (rem). */}
        <div className="relative lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-[44px] leading-[1.04] sm:text-[60px] xl:text-[68px] 2xl:text-[84px] font-semibold tracking-[-0.035em]" style={{ textWrap: 'balance' }}>
            Votre solde de fin de mois, <span className="text-[color-mix(in_srgb,var(--primary)_55%,var(--acc-t1))]">connu dès le début</span>
          </h1>
          <p className={`text-[18px] sm:text-[19px] 2xl:text-[22px] leading-[1.6] ${T2} max-w-[36rem] 2xl:max-w-[42rem]`}>
            Kleea réunit vos comptes bancaires, prévoit votre solde mois par mois et suit votre épargne pour vos projets. Sans publicité.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={() => onOpenAuth('register')} className={BOUTON_PRINCIPAL}>
              Créer un compte <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <a href="#showcase" className={BOUTON_SECONDAIRE}>Voir l’application</a>
          </div>
          <ul className={`flex flex-wrap gap-x-5 gap-y-2 pt-2 text-sm ${T2}`}>
            {REPERES.map((r) => (
              <li key={r} className="flex items-center gap-1.5"><Check size={14} strokeWidth={2} className={POS} />{r}</li>
            ))}
          </ul>
        </div>
        <div className="relative lg:col-span-7 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
          {/* Sur téléphone, la carte du solde seule ; plus large, la vraie application derrière elle. */}
          <div className="sm:hidden"><ApercuHero /></div>
          <div className="hidden sm:block relative pb-24 [perspective:1800px]">
            <figure className="rounded-2xl border border-[var(--acc-t1)]/[0.1] overflow-hidden shadow-[0_40px_120px_rgba(0,0,0,0.55)] [transform:rotateY(-9deg)_rotateX(3deg)] origin-left">
              <img src="/apercu/tableau-de-bord-ordinateur.jpg" alt="Le tableau de bord de Kleea, avec des données d’exemple" width="1680" height="1050" className="block w-full h-auto" />
            </figure>
            <div className="absolute left-0 -bottom-2 w-[62%] lg:-left-10"><ApercuHero compact /></div>
            <div className={`absolute -top-5 right-4 flex items-center gap-3 rounded-xl ${CARTE} px-4 py-3 shadow-[0_18px_40px_rgba(0,0,0,0.45)]`}>
              <span className="w-8 h-8 rounded-lg bg-amber-400/15 text-amber-300 flex items-center justify-center"><Bell size={16} strokeWidth={1.75} /></span>
              <div>
                <p className={`text-[13px] font-medium ${T1}`}>Budget Courses : 55 % dépensé au 12</p>
                <p className={`text-[12px] ${T3}`}>À ce rythme, 412 € fin novembre pour 300 € prévus</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] max-w-2xl mb-10" style={{ textWrap: 'balance' }}>Prêt en trois étapes</h2>
        <ol className="grid md:grid-cols-3 gap-4">
          {ETAPES.map(({ titre, texte }, i) => (
            <li key={titre} className={`rounded-2xl ${CARTE} p-6 space-y-3`}>
              <span className={`w-8 h-8 rounded-full bg-[var(--primary)]/20 text-[color-mix(in_srgb,var(--primary)_55%,var(--acc-t1))] flex items-center justify-center text-sm font-medium ${CHIFFRE}`}>{i + 1}</span>
              <h3 className="text-lg font-medium">{titre}</h3>
              <p className={`text-base leading-7 ${T2}`}>{texte}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="showcase" className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <div className="max-w-2xl space-y-3 mb-8">
          <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em]" style={{ textWrap: 'balance' }}>Les écrans de l’application</h2>
          <p className={`text-base ${T2}`}>Choisissez une page pour la voir telle qu’elle s’affiche.</p>
        </div>

        <div role="tablist" aria-label="Pages de l’application" className={`flex gap-1 p-1 rounded-xl ${CARTE} mb-4 w-fit max-w-full overflow-x-auto [scrollbar-width:none]`}>
          {PAGES.map(({ id, label, icon }) => {
            const Icone = icon;
            const actif = activeTab === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={actif}
                onClick={(e) => { setActiveTab(id); e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }}
                className={`shrink-0 whitespace-nowrap flex items-center gap-2 h-9 px-3 rounded-lg text-sm cursor-pointer ${TRANSITION} ${actif ? `${LIGNE} ${T1} shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]` : `${T3} hover:text-[var(--acc-t1)]`}`}
              >
                <Icone size={16} strokeWidth={1.5} />
                {label}
              </button>
            );
          })}
        </div>

        <p className={`text-base ${T2} mb-4 min-h-12 sm:min-h-0`}>{page.texte}</p>

        <figure className="rounded-2xl border border-[var(--acc-t1)]/[0.08] overflow-hidden bg-[var(--acc-profond)] max-w-sm mx-auto md:max-w-none">
          <picture key={page.id} className="block animate-in fade-in duration-300">
            <source media="(max-width: 767px)" srcSet={`/apercu/${page.id}-mobile.jpg`} />
            <img
              src={`/apercu/${page.id}-ordinateur.jpg`}
              alt={`Page ${page.label} de Kleea, avec des données d’exemple`}
              width="1680"
              height="1050"
              loading="lazy"
              className="block w-full h-auto"
            />
          </picture>
          <figcaption className={`px-4 py-3 text-xs ${T3} border-t border-[var(--acc-t1)]/[0.08]`}>Capture de l’application, avec des données d’exemple</figcaption>
        </figure>
      </section>

      <section id="features" className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] max-w-2xl mb-12" style={{ textWrap: 'balance' }}>
          Ce que Kleea fait pour vous
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FONCTIONS.map(({ icon, titre, texte }) => {
            const Icone = icon;
            return (
              <div key={titre} className={`rounded-2xl ${CARTE} p-6 space-y-3`}>
                <span className={`w-10 h-10 rounded-xl ${LIGNE} flex items-center justify-center`}>
                  <Icone size={18} strokeWidth={1.5} className="text-[color-mix(in_srgb,var(--primary)_55%,var(--acc-t1))]" />
                </span>
                <h3 className="text-base font-medium">{titre}</h3>
                <p className={`text-sm leading-6 ${T2}`}>{texte}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="security" className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <div className="max-w-2xl space-y-3 mb-10">
          <p className={`flex items-center gap-2 text-sm ${T2}`}>
            <ShieldCheck size={16} strokeWidth={1.5} className={T3} /> Sécurité
          </p>
          <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em]" style={{ textWrap: 'balance' }}>Vos données restent les vôtres</h2>
          <p className={`text-base leading-7 ${T2}`}>Kleea n’affiche aucune publicité et ne revend aucune donnée. Ce que vous y mettez est protégé, et vous pouvez tout reprendre.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
          {SECURITE.map(({ icon, titre, texte }) => {
            const Icone = icon;
            return (
              <div key={titre} className="flex gap-4">
                <Icone size={18} strokeWidth={1.5} className={`${T3} shrink-0 mt-1`} />
                <div className="space-y-1.5">
                  <h3 className="text-base font-medium">{titre}</h3>
                  <p className={`text-sm leading-6 ${T2}`}>{texte}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="faq" className="scroll-mt-16 max-w-3xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <h2 className="text-3xl sm:text-4xl font-medium tracking-[-0.02em] mb-8">Questions fréquentes</h2>
        <div className="space-y-2">
          {QUESTIONS.map(({ q, r }) => (
            <details key={q} className={`group rounded-xl ${CARTE} px-5`}>
              <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none text-base font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={18} strokeWidth={1.5} className={`${T3} shrink-0 transition-transform group-open:rotate-180`} />
              </summary>
              <p className={`pb-5 text-base leading-7 ${T2}`}>{r}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-8 pb-24">
        <div className={`rounded-2xl ${CARTE} p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
          <div className="space-y-2 max-w-xl">
            <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.02em]">Votre fin de mois, sans surprise</h2>
            <p className={`text-base ${T2}`}>Créez votre compte et connectez votre banque : votre solde prévu s’affiche dans la foulée.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button onClick={() => onOpenAuth('register')} className={BOUTON_PRINCIPAL}>
              Créer un compte <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <button onClick={() => onOpenAuth('login')} className={BOUTON_SECONDAIRE}>Se connecter</button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--acc-t1)]/[0.08]">
        <div className={`max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${T3}`}>
          <p>© {new Date().getFullYear()} Kleea · {EDITEUR.nom}</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#showcase" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>L’application</a>
            <a href="#features" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Fonctionnalités</a>
            <a href="#security" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Sécurité</a>
            <a href="#faq" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Questions</a>
            <a href="/guide" target="_blank" rel="noopener noreferrer" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Guide</a>
            <Link to="/mentions-legales" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Mentions légales</Link>
            <Link to="/confidentialite" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
