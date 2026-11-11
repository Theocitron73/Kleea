import { useState } from 'react';
import { ArrowRight, Building2, Tags, CalendarClock, Users2, ShieldCheck, LayoutDashboard, ListChecks, ChartLine, Wallet, Repeat, Target, Download, Bell, Search } from 'lucide-react';

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

function ApercuHero() {
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
      <div className="space-y-2">
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
      </div>
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
  { icon: Building2, titre: 'Vos banques, synchronisées', texte: 'Connectez BoursoBank, La Banque Postale, BNP, Revolut et les autres banques prises en charge par Powens. Les opérations arrivent seules, ou par import CSV si vous préférez.' },
  { icon: Tags, titre: 'Des catégories qui s’apprennent', texte: 'Quand vous recatégorisez une opération, Kleea s’en souvient. Au prochain import, les dépenses récurrentes sont classées sans intervention.' },
  { icon: CalendarClock, titre: 'Le solde de fin de mois, à l’avance', texte: 'Saisissez vos charges fixes et vos revenus attendus. Kleea calcule votre solde mois par mois et vous prévient avant un découvert.' },
  { icon: Users2, titre: 'Un compte commun, à deux', texte: 'Partagez un compte avec la personne de votre choix. Chacun le suit depuis son propre compte Kleea : mêmes opérations, mêmes prévisions, mêmes budgets, et vos autres comptes restent privés. Pour un voyage entre amis, un Tricount se partage par un simple lien.' },
];

export default function LandingPage({ onOpenAuth }) {
  const [activeTab, setActiveTab] = useState('tableau-de-bord');
  const page = PAGES.find((p) => p.id === activeTab);

  return (
    <div className={`page-accueil min-h-screen ${PAGE} ${T1} selection:bg-[var(--primary)] selection:text-white overflow-x-hidden font-sans`}>

      <nav className="fixed top-0 inset-x-0 z-50 bg-[var(--acc-page)]/85 backdrop-blur-md border-b border-[var(--acc-t1)]/[0.08]">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-8 flex items-center justify-between gap-4">
          <a href="#" className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center text-sm font-semibold text-white">K</span>
            <span className={`text-base font-medium ${T1}`}>Kleea</span>
          </a>
          <div className={`hidden md:flex items-center gap-8 text-sm ${T2}`}>
            <a href="#showcase" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>L’application</a>
            <a href="#features" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Fonctionnalités</a>
            <a href="#security" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Sécurité</a>
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

      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-20 lg:min-h-[100svh] grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        <div className="lg:col-span-5 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-[40px] leading-[1.05] sm:text-6xl sm:leading-[1.04] font-medium tracking-[-0.03em]" style={{ textWrap: 'balance' }}>
            Votre solde de fin de mois, connu dès le début
          </h1>
          <p className={`text-lg leading-7 ${T2} max-w-[36rem]`}>
            Kleea réunit vos comptes bancaires, prévoit votre solde mois par mois et suit votre épargne pour vos projets. Sans publicité.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button onClick={() => onOpenAuth('register')} className={BOUTON_PRINCIPAL}>
              Créer un compte <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <a href="#showcase" className={BOUTON_SECONDAIRE}>Voir l’application</a>
          </div>
        </div>
        <div className="lg:col-span-7 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-75">
          <ApercuHero />
        </div>
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
        <div className="grid sm:grid-cols-2 gap-x-12 gap-y-10">
          {FONCTIONS.map(({ icon, titre, texte }) => {
            const Icone = icon;
            return (
            <div key={titre} className="flex gap-4">
              <Icone size={18} strokeWidth={1.5} className={`${T3} shrink-0 mt-1`} />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">{titre}</h3>
                <p className={`text-base leading-7 ${T2}`}>{texte}</p>
              </div>
            </div>
            );
          })}
        </div>
      </section>

      <section id="security" className="scroll-mt-16 max-w-7xl mx-auto px-4 sm:px-8 py-20 border-t border-[var(--acc-t1)]/[0.08]">
        <div className={`rounded-2xl ${CARTE} p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-8`}>
          <div className="space-y-3 max-w-2xl">
            <p className={`flex items-center gap-2 text-sm ${T2}`}>
              <ShieldCheck size={16} strokeWidth={1.5} className={T3} /> Sécurité
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.02em]">Vos données restent les vôtres</h2>
            <p className={`text-base leading-7 ${T2}`}>
              Vos IBAN et vos accès bancaires sont chiffrés sur le serveur. La double authentification est disponible si vous le souhaitez. Kleea n’affiche aucune publicité et ne revend aucune donnée.
            </p>
          </div>
          <button onClick={() => onOpenAuth('register')} className={`${BOUTON_PRINCIPAL} shrink-0`}>
            Créer un compte
          </button>
        </div>
      </section>

      <footer className="border-t border-[var(--acc-t1)]/[0.08]">
        <div className={`max-w-7xl mx-auto px-4 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm ${T3}`}>
          <p>© {new Date().getFullYear()} Kleea · version 4.4</p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="#showcase" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>L’application</a>
            <a href="#features" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Fonctionnalités</a>
            <a href="#security" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Sécurité</a>
            <a href="/guide" target="_blank" rel="noopener noreferrer" className={`hover:text-[var(--acc-t1)] ${TRANSITION}`}>Guide</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
