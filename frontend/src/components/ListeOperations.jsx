import { useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowDown, ArrowUp, Calendar, Link2, Pencil, RotateCcw, Scissors, Tag, WalletCards } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import CustomSelect from './CustomSelect';
import { estTransfertInterne } from '../utils/finance';

// Valeurs de mois telles que l'application les enregistre.
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const moisDeLaDate = (date) => (/^\d{4}-\d{2}/.test(date || '') ? MOIS[Number(date.slice(5, 7)) - 1] : null);
const euros = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const aClasser = (t) => !t.categorie || sansAccent(t.categorie) === 'autre';
const nomPrevision = (p) => getCleanCategoryName(p.nom.replace(/^\[PRÉVI\]\s*/i, ''));

// Un libellé long passe sur plusieurs lignes : le champ prend la hauteur de son texte.
const ajusterHauteur = (champ) => {
  if (!champ) return;
  champ.style.height = 'auto';
  champ.style.height = `${champ.scrollHeight}px`;
};

function libelleJour(date) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return date || 'Sans date';
  const texte = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

const TRIS = [['date', 'Date'], ['nom', 'Libellé'], ['montant', 'Montant'], ['categorie', 'Catégorie']];
const FILTRES = [['tout', 'Tout'], ['depenses', 'Dépenses'], ['revenus', 'Revenus'], ['aclasser', 'À classer']];

const PASTILLE = 'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors';

/** Les opérations de Gérer, regroupées par jour. Catégorie, prévision, mois, enveloppe et division se règlent depuis la ligne. */
export default function ListeOperations({
  transactions = [], selectedIds = [], toggleSelect, toggleAll, updateCell, categoriesVisibles = [],
  allPrevisionsAnnee = [], comptes = [], filters = {}, allocations = [], onDiviser, onAnnulerDivision,
  sortConfig = { key: 'date', direction: 'desc' }, onTrier,
}) {
  const [filtre, setFiltre] = useState('tout');
  const conteneur = useRef(null);

  const visibles = useMemo(() => transactions.filter((t) => {
    const transfert = estTransfertInterne(t.nom, t.categorie);
    const montant = parseFloat(t.montant) || 0;
    if (filtre === 'depenses') return montant < 0 && !transfert;
    if (filtre === 'revenus') return montant > 0 && !transfert;
    if (filtre === 'aclasser') return aClasser(t);
    return true;
  }), [transactions, filtre]);

  const nbAClasser = useMemo(() => transactions.filter(aClasser).length, [transactions]);
  const triParDate = ['date', 'jour'].includes(sortConfig.key);

  // Triées par date, les opérations ont une ligne d'en-tête par jour ; triées autrement, elles se suivent sans regroupement.
  const elements = useMemo(() => {
    const liste = [];
    for (const t of visibles) {
      if (!triParDate) { liste.push({ type: 'op', t }); continue; }
      const dernier = liste.findLast((e) => e.type === 'jour');
      if (!dernier || dernier.date !== t.date) liste.push({ type: 'jour', date: t.date, total: 0 });
      liste.findLast((e) => e.type === 'jour').total += parseFloat(t.montant) || 0;
      liste.push({ type: 'op', t });
    }
    return liste;
  }, [visibles, triParDate]);

  const virtualiseur = useVirtualizer({
    count: elements.length,
    getScrollElement: () => conteneur.current,
    estimateSize: (i) => (elements[i]?.type === 'jour' ? 40 : 64),
    overscan: 10,
  });

  const groupeDuCompte = (nom) => (comptes || []).find((c) => sansAccent(c.compte) === sansAccent(nom))?.groupe;

  const previsionsPour = (t) => {
    const positive = (parseFloat(t.montant) || 0) >= 0;
    const groupe = groupeDuCompte(t.compte) || (filters?.profil !== 'Tous' ? filters?.profil : null);
    return (allPrevisionsAnnee || []).filter((p) => (
      sansAccent(p.mois) === sansAccent(t.mois)
      && parseInt(p.annee || 0, 10) === parseInt(t.annee || 0, 10)
      && (!groupe || sansAccent(groupeDuCompte(p.compte)) === sansAccent(groupe))
      && ((parseFloat(p.montant) || 0) >= 0) === positive
    ));
  };

  const ligne = (t) => {
    const choisie = selectedIds.includes(t.id);
    const transfert = estTransfertInterne(t.nom, t.categorie);
    const montant = parseFloat(t.montant) || 0;
    const prevision = (allPrevisionsAnnee || []).find((p) => p.id === t.prevision_id);
    const moisDecale = moisDeLaDate(t.date) && sansAccent(moisDeLaDate(t.date)) !== sansAccent(t.mois);
    const nature = transfert ? 'Virement interne' : montant > 0 ? 'Revenu' : 'Dépense';
    // Chaque réglage a sa colonne, de largeur fixe, avec la liste déroulante commune à tout le site.
    const SELECT = 'px-2.5 h-8 rounded-xl';
    const previsions = previsionsPour(t);
    if (prevision && !previsions.some((p) => p.id === prevision.id)) previsions.unshift(prevision);
    const projets = [...new Set(allocations.map((a) => a.projet))];

    return (
      <div className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${choisie ? 'bg-[var(--primary)]/15' : 'hover:bg-white/[0.04]'}`}>
        <input type="checkbox" aria-label={`Sélectionner ${t.nom}`} checked={choisie} onChange={() => toggleSelect(t.id)}
          className="w-4 h-4 shrink-0 rounded-[5px] accent-[var(--primary)] cursor-pointer" />

        <span title={nature} className={`w-1 self-stretch shrink-0 rounded-full ${transfert ? 'bg-[var(--secondary)]/70' : montant > 0 ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`}>
          <span className="sr-only">{nature}</span>
        </span>

        <div className="flex-1 min-w-[180px]">
          <div className="flex items-start gap-1.5">
            <textarea
              key={`${t.id}-${t.nom}`}
              rows={1}
              defaultValue={t.nom}
              aria-label="Libellé de l’opération"
              ref={ajusterHauteur}
              onInput={(e) => ajusterHauteur(e.currentTarget)}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.nom) updateCell(t.id, 'nom', v); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
                if (e.key === 'Escape') { e.currentTarget.value = t.nom; ajusterHauteur(e.currentTarget); e.currentTarget.blur(); }
              }}
              placeholder="Modifier le libellé..."
              className="min-w-0 flex-1 resize-none overflow-hidden break-words leading-snug bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/15 focus:border-[var(--primary)]/60 focus:bg-black/50 rounded-lg px-2 py-1 text-[13px] font-semibold text-[var(--text-main)] outline-none transition-colors cursor-text"
            />
            <Pencil size={11} aria-hidden="true" className="shrink-0 mt-2 text-[var(--text-main)]/25 group-hover:text-[var(--text-main)]/60 transition-colors" />
          </div>
          <p className="mt-0.5 px-2 text-[11px] text-[var(--text-main)]/45 truncate">{t.compte}</p>
        </div>

        <div className="w-40 shrink-0" title="Catégorie">
          <CustomSelect flottant ariaLabel="Catégorie de l’opération" value={t.categorie || 'Autre'} icon={Tag}
            options={categoriesVisibles.map((c) => ({ v: c, l: c }))} onChange={(v) => updateCell(t.id, 'categorie', v)}
            className={`${SELECT} ${aClasser(t) ? '!border-amber-400/50' : ''}`} />
        </div>
        <div className="w-36 shrink-0" title={transfert ? 'Un virement entre vos comptes ne se relie pas à une prévision' : 'Prévision reliée'}>
          {!transfert && (
            <CustomSelect flottant ariaLabel="Prévision reliée" value={t.prevision_id ?? ''} icon={Link2}
              options={[{ v: '', l: 'Aucune' }, ...previsions.map((p) => ({ v: p.id, l: `${nomPrevision(p)} (${Math.round(Math.abs(parseFloat(p.montant) || 0))} €)` }))]}
              onChange={(v) => updateCell(t.id, 'prevision_id', v === '' ? null : v)}
              className={`${SELECT} ${prevision ? '!border-emerald-400/45' : ''}`} />
          )}
        </div>
        <div className="w-32 shrink-0" title={moisDecale ? `Compté en ${t.mois}` : 'Mois affecté'}>
          <CustomSelect flottant ariaLabel="Mois affecté" value={t.mois} icon={Calendar}
            options={MOIS.map((m) => ({ v: m, l: m === 'Aout' ? 'Août' : m }))} onChange={(v) => updateCell(t.id, 'mois', v)}
            className={`${SELECT} ${moisDecale ? '!border-[var(--primary)]/70' : ''}`} />
        </div>
        <div className="w-32 shrink-0" title="Enveloppe">
          <CustomSelect flottant ariaLabel="Enveloppe" value={t.enveloppe || ''} icon={WalletCards}
            options={[{ v: '', l: 'Aucune' }, ...projets.map((n) => ({ v: n, l: n }))]}
            onChange={(v) => updateCell(t.id, 'enveloppe', v)}
            className={`${SELECT} ${t.enveloppe ? '!border-[var(--secondary)]/50' : ''}`} />
        </div>
        {t.split_id ? (
          <button type="button" title="Annuler la division" aria-label="Annuler la division" onClick={() => onAnnulerDivision(t)} className={`${PASTILLE} w-9 justify-center shrink-0 bg-[var(--secondary)]/15 text-[var(--secondary)] hover:text-rose-300`}>
            <RotateCcw size={13} />
          </button>
        ) : (
          <button type="button" title="Diviser cette opération" aria-label="Diviser" onClick={() => onDiviser(t)} className={`${PASTILLE} w-9 justify-center shrink-0 border border-dashed border-white/15 text-[var(--text-main)]/45 hover:text-[var(--text-main)]/80 hover:border-white/30`}>
            <Scissors size={13} />
          </button>
        )}

        <span className={`w-24 shrink-0 text-right text-[15px] font-semibold tabular-nums ${transfert ? 'text-[var(--secondary)]' : montant > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {euros(montant)}
        </span>
      </div>
    );
  };

  return (
    <section aria-label="Opérations" className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-4 px-5 pt-3 pb-1 shrink-0">
        <input type="checkbox" aria-label="Tout sélectionner" checked={transactions.length > 0 && selectedIds.length === transactions.length} onChange={toggleAll}
          className="w-4 h-4 rounded-[5px] accent-[var(--primary)] cursor-pointer" />
        <div role="group" aria-label="Trier les opérations" className="flex items-center gap-0.5 text-[12px]">
          <span className="mr-1.5 text-[var(--text-main)]/45">Trier par</span>
          {TRIS.map(([cle, texte]) => {
            const actif = sortConfig.key === cle || (cle === 'date' && triParDate);
            const Fleche = sortConfig.direction === 'asc' ? ArrowUp : ArrowDown;
            return (
              <button key={cle} type="button" aria-pressed={actif} onClick={() => onTrier?.(cle)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-[7px] cursor-pointer transition-colors ${actif ? 'bg-white/10 text-[var(--text-main)]' : 'text-[var(--text-main)]/60 hover:text-[var(--text-main)]'}`}>
                {texte}{actif && <Fleche size={12} aria-label={sortConfig.direction === 'asc' ? 'croissant' : 'décroissant'} />}
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Filtrer les opérations" className="ml-auto flex gap-0.5 p-[3px] rounded-[10px] bg-white/[0.04] text-[12px]">
          {FILTRES.map(([cle, texte]) => (
            <button key={cle} type="button" aria-pressed={filtre === cle} onClick={() => setFiltre(cle)}
              className={`px-3 py-1 rounded-[7px] cursor-pointer transition-colors ${filtre === cle ? 'bg-white/10 text-[var(--text-main)]' : 'text-[var(--text-main)]/60 hover:text-[var(--text-main)]'}`}>
              {texte}{cle === 'aclasser' && nbAClasser > 0 && <b className="ml-1 font-semibold text-amber-300">{nbAClasser}</b>}
            </button>
          ))}
        </div>
      </div>

      <div ref={conteneur} className="flex-1 overflow-auto custom-scrollbar px-2 pb-24">
        {elements.length === 0 ? (
          <div className="py-16 text-center">
            <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-[0.2em] opacity-40">Aucune transaction trouvée</h3>
          </div>
        ) : (
          <div style={{ height: virtualiseur.getTotalSize(), position: 'relative' }}>
            {virtualiseur.getVirtualItems().map((v) => {
              const e = elements[v.index];
              return (
                <div key={e.type === 'jour' ? `j-${e.date}-${v.index}` : e.t.id} data-index={v.index} ref={virtualiseur.measureElement}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${v.start}px)` }}>
                  {e.type === 'jour' ? (
                    <div className="flex justify-between items-baseline px-3 pt-4 pb-1.5 text-[12px]">
                      <span className="font-semibold text-[var(--text-main)]/80">{libelleJour(e.date)}</span>
                      <span className="tabular-nums text-[var(--text-main)]/45">{euros(e.total)}</span>
                    </div>
                  ) : ligne(e.t)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
