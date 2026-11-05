import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Clock, ExternalLink, Lightbulb, Rocket, Search, X } from 'lucide-react';
import { CHAPITRES, PREMIERS_PAS, rechercher } from './guide/contenu';

const CLE_PROGRESSION = 'kleea_guide_premiers_pas';
const ID_PREMIERS_PAS = 'premiers-pas';

function lireProgression() {
  try {
    const valeur = JSON.parse(localStorage.getItem(CLE_PROGRESSION) || '[]');
    return Array.isArray(valeur) ? valeur : [];
  } catch {
    return [];
  }
}

function enregistrerProgression(valeur) {
  try {
    localStorage.setItem(CLE_PROGRESSION, JSON.stringify(valeur));
  } catch {
    // Sans stockage disponible, la progression vaut seulement pour cette visite.
  }
}

function BoutonPage({ page, libelle, pagesDisponibles, ouvrirPage }) {
  if (!page || !ouvrirPage || !pagesDisponibles?.includes(page)) return null;
  return (
    <button
      type="button"
      onClick={() => ouvrirPage(page)}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer"
    >
      {libelle}
      <ExternalLink size={11} />
    </button>
  );
}

function Encadre({ type, children }) {
  const attention = type === 'attention';
  const Icone = attention ? AlertTriangle : Lightbulb;
  return (
    <div className={`flex gap-2.5 p-3 rounded-xl border text-[12px] leading-relaxed ${attention ? 'bg-amber-500/10 border-amber-500/25' : 'bg-[var(--primary)]/10 border-[var(--primary)]/25'}`}>
      <Icone size={14} className={`shrink-0 mt-0.5 ${attention ? 'text-amber-400' : 'text-[var(--secondary)]'}`} />
      <p className="text-[var(--text-main)]/85">{children}</p>
    </div>
  );
}

function Etapes({ etapes }) {
  return (
    <ol className="space-y-2.5">
      {etapes.map((etape, i) => (
        <li key={etape} className="flex gap-3 text-[13px] leading-relaxed text-[var(--text-main)]/80">
          <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-[var(--text-main)] text-[10px] font-black flex items-center justify-center mt-0.5">{i + 1}</span>
          <span>{etape}</span>
        </li>
      ))}
    </ol>
  );
}

function Section({ section }) {
  return (
    <section id={`guide-${section.titre}`} className="scroll-mt-4 bg-white/[0.02] border border-white/5 rounded-[var(--radius)] p-5 space-y-3">
      <h3 className="text-sm font-black text-[var(--text-main)]">{section.titre}</h3>
      {section.texte && <p className="text-[13px] leading-relaxed text-[var(--text-main)]/70">{section.texte}</p>}
      {section.etapes && <Etapes etapes={section.etapes} />}
      {section.points && (
        <dl className="space-y-2.5">
          {section.points.map((p) => (
            <div key={p.l} className="text-[13px] leading-relaxed">
              <dt className="inline font-bold text-[var(--text-main)]">{p.l} : </dt>
              <dd className="inline text-[var(--text-main)]/70">{p.d}</dd>
            </div>
          ))}
        </dl>
      )}
      {section.conseil && <Encadre type="conseil">{section.conseil}</Encadre>}
      {section.attention && <Encadre type="attention">{section.attention}</Encadre>}
    </section>
  );
}

function PremiersPas({ faites, basculer, pagesDisponibles, ouvrirPage }) {
  const total = PREMIERS_PAS.length;
  const nombre = PREMIERS_PAS.filter((e) => faites.includes(e.id)).length;
  const prochaine = PREMIERS_PAS.find((e) => !faites.includes(e.id));
  return (
    <div className="space-y-5">
      <header className="p-6 rounded-[var(--radius)] border border-white/10 bg-white/[0.03] space-y-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)]">Bien démarrer avec Kleea</h2>
          <p className="text-[13px] leading-relaxed text-[var(--text-main)]/70 mt-2 max-w-2xl">
            Suivez ces {total} étapes dans l'ordre : comptez une vingtaine de minutes pour passer d'un compte vide à un suivi complet de vos finances.
          </p>
        </div>
        <div>
          <div className="flex justify-between text-[11px] font-bold text-[var(--text-main)]/70 mb-1.5">
            <span>{nombre === total ? 'Tout est prêt, bravo !' : prochaine ? `Prochaine étape : ${prochaine.titre}` : ''}</span>
            <span>{nombre} / {total}</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={nombre} aria-label="Progression des premiers pas">
            <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-500" style={{ width: `${(nombre / total) * 100}%` }} />
          </div>
        </div>
      </header>

      {PREMIERS_PAS.map((etape, i) => {
        const faite = faites.includes(etape.id);
        return (
          <section key={etape.id} id={`guide-${etape.id}`} className={`scroll-mt-4 rounded-[var(--radius)] border p-5 space-y-3 transition-colors ${faite ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/5'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--secondary)] flex items-center gap-2">
                  Étape {i + 1}
                  <span className="inline-flex items-center gap-1 text-[var(--text-main)]/50 font-bold normal-case tracking-normal"><Clock size={10} /> {etape.duree}</span>
                </p>
                <h3 className="text-base font-black text-[var(--text-main)] mt-0.5">{etape.titre}</h3>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--text-main)]/70">{etape.pourquoi}</p>
            <Etapes etapes={etape.etapes} />
            {etape.conseil && <Encadre type="conseil">{etape.conseil}</Encadre>}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <BoutonPage page={etape.page} libelle={etape.pageLibelle} pagesDisponibles={pagesDisponibles} ouvrirPage={ouvrirPage} />
              <button
                type="button"
                aria-pressed={faite}
                onClick={() => basculer(etape.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${faite ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-white/5 border-white/10 text-[var(--text-main)]/70 hover:bg-white/10'}`}
              >
                <Check size={11} /> {faite ? 'Étape terminée' : 'Marquer comme fait'}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Chapitre({ chapitre, pagesDisponibles, ouvrirPage }) {
  const Icone = chapitre.icone;
  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-[var(--primary)]/15 border border-[var(--primary)]/25 flex items-center justify-center shrink-0">
            <Icone size={20} className="text-[var(--secondary)]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black tracking-tight text-[var(--text-main)]">{chapitre.titre}</h2>
            <p className="text-[11px] font-bold text-[var(--text-main)]/50">{chapitre.sousTitre}</p>
          </div>
        </div>
        <BoutonPage page={chapitre.page} libelle={`Ouvrir ${chapitre.titre}`} pagesDisponibles={pagesDisponibles} ouvrirPage={ouvrirPage} />
      </header>
      {chapitre.reserve && <Encadre type="conseil">Cette page est réservée aux comptes administrateurs.</Encadre>}
      <p className="text-[13px] leading-relaxed text-[var(--text-main)]/75">{chapitre.intro}</p>
      {chapitre.sections.map((s) => <Section key={s.titre} section={s} />)}
    </div>
  );
}

/**
 * ouvrirPage et pagesDisponibles ne sont fournis qu'à une personne connectée :
 * sur le guide public, les boutons menant vers l'application restent masqués.
 */
export default function GuideView({ ouvrirPage, pagesDisponibles }) {
  const [recherche, setRecherche] = useState('');
  const [actif, setActif] = useState(ID_PREMIERS_PAS);
  const [faites, setFaites] = useState(lireProgression);
  const [ancreCible, setAncreCible] = useState(null);
  const zoneLecture = useRef(null);

  const entrees = useMemo(() => [
    { id: ID_PREMIERS_PAS, titre: 'Premiers pas', icone: Rocket },
    ...CHAPITRES,
  ], []);
  const resultats = useMemo(() => rechercher(recherche), [recherche]);
  const indexActif = entrees.findIndex((e) => e.id === actif);
  const precedent = entrees[indexActif - 1];
  const suivant = entrees[indexActif + 1];
  const chapitreActif = CHAPITRES.find((c) => c.id === actif);

  // Une nouvelle lecture commence en haut du chapitre, ou directement sur la section choisie dans les résultats.
  useEffect(() => {
    if (ancreCible) {
      document.getElementById(`guide-${ancreCible}`)?.scrollIntoView({ block: 'start' });
      setAncreCible(null);
    } else {
      zoneLecture.current?.scrollTo({ top: 0 });
    }
  }, [actif, ancreCible]);

  const basculer = (id) => {
    setFaites((valeur) => {
      const nouvelle = valeur.includes(id) ? valeur.filter((x) => x !== id) : [...valeur, id];
      enregistrerProgression(nouvelle);
      return nouvelle;
    });
  };

  const choisir = (id) => {
    setRecherche('');
    setActif(id);
  };

  const ouvrirResultat = (resultat) => {
    setRecherche('');
    setActif(resultat.chapitreId);
    setAncreCible(resultat.ancre);
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-4 lg:gap-6 animate-in fade-in duration-500 px-1 py-1 min-w-0">
      {/* SOMMAIRE */}
      <nav aria-label="Sommaire du guide" className="w-full lg:w-64 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl p-3 lg:p-4 flex flex-col gap-3 shrink-0 shadow-xl h-fit min-w-0">
        <div className="hidden lg:flex items-center gap-2 pb-2 border-b border-white/5">
          <BookOpen size={15} className="text-[var(--secondary)]" />
          <h2 className="text-[10px] font-black uppercase text-[var(--text-main)]/60 tracking-[0.2em]">Sommaire</h2>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-main)]/40" />
          <input
            type="search"
            aria-label="Rechercher dans le guide"
            placeholder="Rechercher une aide..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-8 py-2 text-xs font-bold text-[var(--text-main)] outline-none placeholder:text-[var(--text-main)]/30 focus:border-[var(--primary)]/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {recherche && (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setRecherche('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--text-main)]/50 cursor-pointer">
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar select-none">
          {entrees.map((e) => {
            const Icone = e.icone;
            const courant = !recherche && actif === e.id;
            return (
              <button
                key={e.id}
                type="button"
                aria-current={courant ? 'page' : undefined}
                onClick={() => choisir(e.id)}
                className={`lg:w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between gap-2 shrink-0 cursor-pointer ${courant ? 'bg-white text-slate-900 shadow-md' : 'text-[var(--text-main)]/60 hover:bg-white/5'}`}
              >
                <span className="flex items-center gap-2 whitespace-nowrap">
                  <Icone size={13} className={courant ? 'text-slate-900' : 'text-[var(--secondary)]'} />
                  {e.titre}
                </span>
                <ChevronRight size={11} className="hidden lg:block opacity-40" />
              </button>
            );
          })}
        </div>
      </nav>

      {/* LECTURE */}
      <main ref={zoneLecture} className="flex-1 min-w-0 overflow-y-auto pr-1 custom-scrollbar max-h-[calc(100vh-290px)] lg:max-h-[calc(100vh-170px)] pb-12">
        {recherche.trim() ? (
          <div className="space-y-3">
            <h2 className="text-lg font-black text-[var(--text-main)]" aria-live="polite">
              {resultats.length === 0 ? 'Aucun résultat' : `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`}
            </h2>
            {resultats.length === 0 && <p className="text-[13px] text-[var(--text-main)]/60">Essayez un autre mot, par exemple « virement », « doublon » ou « budget ».</p>}
            {resultats.map((r) => (
              <button
                key={`${r.chapitreId}-${r.ancre}`}
                type="button"
                onClick={() => ouvrirResultat(r)}
                className="w-full text-left p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--secondary)]">{r.chapitre}</p>
                <p className="text-[13px] font-bold text-[var(--text-main)] mt-0.5">{r.section}</p>
              </button>
            ))}
          </div>
        ) : (
          <>
            {actif === ID_PREMIERS_PAS
              ? <PremiersPas faites={faites} basculer={basculer} pagesDisponibles={pagesDisponibles} ouvrirPage={ouvrirPage} />
              : <Chapitre chapitre={chapitreActif} pagesDisponibles={pagesDisponibles} ouvrirPage={ouvrirPage} />}

            <div className="flex justify-between gap-3 pt-6">
              {precedent ? (
                <button type="button" onClick={() => choisir(precedent.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-[var(--text-main)]/70 hover:bg-white/10 cursor-pointer">
                  <ArrowLeft size={12} /> {precedent.titre}
                </button>
              ) : <span />}
              {suivant && (
                <button type="button" onClick={() => choisir(suivant.id)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-[var(--text-main)]/70 hover:bg-white/10 cursor-pointer">
                  {suivant.titre} <ArrowRight size={12} />
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
