import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, CreditCard, Search, Tag } from 'lucide-react';
import { rechercher } from '../utils/rechercheGlobale';

const euros = (valeur) => `${(parseFloat(valeur) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const date = (valeur) => (valeur ? new Date(`${String(valeur).slice(0, 10)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Fenêtre de recherche, ouverte par la loupe de la navigation ou par Ctrl + K depuis n'importe quelle page. */
export default function RechercheGlobale({ ouverte, setOuverte, transactions, comptes, ouvrirResultat }) {
  const [requete, setRequete] = useState('');
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const raccourci = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOuverte(true);
      }
    };
    window.addEventListener('keydown', raccourci);
    return () => window.removeEventListener('keydown', raccourci);
  }, [setOuverte]);

  const resultats = useMemo(() => rechercher(requete, { transactions, comptes }), [requete, transactions, comptes]);
  const groupes = useMemo(() => [
    { titre: 'Opérations', lignes: resultats.operations.map((t) => ({
      cle: `operation-${t.id}`, Icone: ArrowLeftRight, nom: t.nom, detail: `${t.compte} · ${date(t.date)} · ${t.categorie}`, droite: euros(t.montant),
      cible: { type: 'operation', nom: t.nom, compte: t.compte, mois: t.mois, annee: t.annee },
    })) },
    { titre: 'Catégories', lignes: resultats.categories.map((c) => ({
      cle: `categorie-${c.categorie}`, Icone: Tag, nom: c.categorie, detail: `${c.nombre} opération${c.nombre > 1 ? 's' : ''} · dernière en ${c.mois} ${c.annee}`,
      cible: { type: 'categorie', nom: c.categorie, compte: c.compte, mois: c.mois, annee: c.annee },
    })) },
    { titre: 'Comptes', lignes: resultats.comptes.map((c) => ({
      cle: `compte-${c.compte}`, Icone: CreditCard, nom: c.compte, detail: c.groupe ? `Groupe ${c.groupe}` : 'Compte',
      cible: { type: 'compte' },
    })) },
  ].filter((g) => g.lignes.length), [resultats]);
  const lignes = groupes.flatMap((g) => g.lignes);

  const fermer = () => {
    setOuverte(false);
    setRequete('');
    setActif(0);
  };
  const choisir = (ligne) => {
    ouvrirResultat(ligne.cible);
    fermer();
  };
  const clavier = (e) => {
    if (e.key === 'Escape') fermer();
    else if (e.key === 'Enter' && lignes[actif]) choisir(lignes[actif]);
    else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && lignes.length) {
      e.preventDefault();
      const pas = e.key === 'ArrowDown' ? 1 : -1;
      setActif((a) => (a + pas + lignes.length) % lignes.length);
    }
  };

  if (!ouverte) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-[var(--glass-blur)] flex justify-center items-start px-3" onClick={fermer}>
      <section role="dialog" aria-label="Recherche" style={{ marginTop: '12vh' }} onClick={(e) => e.stopPropagation()} className="w-full max-w-xl max-h-[75vh] flex flex-col bg-[var(--surface)] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search size={17} className="shrink-0 text-[var(--text-main)]/50" aria-hidden="true" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="recherche-resultats"
            aria-activedescendant={lignes[actif]?.cle}
            aria-label="Rechercher une opération, une catégorie ou un compte"
            placeholder="Opération, catégorie ou compte"
            className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-[var(--text-main)] placeholder:text-[var(--text-main)]/30"
            value={requete}
            onChange={(e) => { setRequete(e.target.value); setActif(0); }}
            onKeyDown={clavier}
          />
          <button type="button" onClick={fermer} className="shrink-0 text-[9px] font-black uppercase text-[var(--text-main)]/50 border border-white/15 rounded-md px-1.5 py-1 cursor-pointer bg-transparent">Échap</button>
        </div>

        <div id="recherche-resultats" role="listbox" aria-label="Résultats" className="overflow-y-auto custom-scrollbar p-2">
          {groupes.map((groupe) => (
            <div key={groupe.titre} role="group" aria-label={groupe.titre} className="mb-1">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/40 px-2 pt-2 pb-1.5">{groupe.titre}</h3>
              {groupe.lignes.map((ligne) => {
                const { Icone } = ligne;
                const estActive = lignes[actif]?.cle === ligne.cle;
                return (
                  <button
                    key={ligne.cle}
                    id={ligne.cle}
                    type="button"
                    role="option"
                    aria-selected={estActive}
                    tabIndex={-1}
                    onClick={() => choisir(ligne)}
                    onMouseEnter={() => setActif(lignes.indexOf(ligne))}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left cursor-pointer border ${estActive ? 'bg-[var(--primary)]/20 border-[var(--primary)]/40' : 'bg-transparent border-transparent'}`}
                  >
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center text-[var(--text-main)]/70"><Icone size={15} aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[var(--text-main)]">{ligne.nom}</span>
                      <span className="block truncate text-[10px] font-semibold text-[var(--text-main)]/50">{ligne.detail}</span>
                    </span>
                    {ligne.droite && <span className="shrink-0 text-xs font-black text-[var(--text-main)]">{ligne.droite}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {!lignes.length && (
            <p className="text-xs font-semibold text-center text-[var(--text-main)]/50 p-5">
              {requete.trim().length < 2 ? 'Saisissez au moins 2 lettres.' : `Aucun résultat pour « ${requete.trim()} ».`}
            </p>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
