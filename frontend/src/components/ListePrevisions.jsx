import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Check, ChevronRight, Eye, EyeOff, Pencil, Repeat, Tag, Wallet } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';
import CustomSelect from './CustomSelect';
import FeuilleMobile, { Reglage } from './FeuilleMobile';
import { estTransfertInterne } from '../utils/finance';

const nomPropre = (p) => String(p.nom || '').replace(/^\[PRÉVI\]\s*/i, '');
const estActive = (p) => !(p.actif === false || p.actif === 0 || p.actif === '0' || p.actif === 'false');
const euros = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Un libellé long passe sur plusieurs lignes : le champ prend la hauteur de son texte.
const ajusterHauteur = (champ) => {
  if (!champ) return;
  champ.style.height = 'auto';
  champ.style.height = `${champ.scrollHeight}px`;
};

function libelleJour(date) {
  const d = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Sans date';
  const texte = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

/** Les prévisions du mois, regroupées par jour, modifiables depuis la ligne comme les opérations de Gérer. */
export default function ListePrevisions({
  previsions = [], selectedIds = [], toggleSelect, toggleAll, updatePrevision, categoriesVisibles = [],
  optionsComptes = [], toutesLesTransactions = [], previsionsTracking = {}, userTheme = {}, mobile = false,
}) {
  // Sur téléphone, la prévision dont le panneau de réglages est ouvert.
  const [ouverte, setOuverte] = useState(null);

  const suivi = (p) => {
    if (previsionsTracking?.[p.id]) return previsionsTracking[p.id];
    const liees = (toutesLesTransactions || []).filter((t) => t.prevision_id === p.id);
    return { consomme: liees.reduce((s, t) => s + Math.abs(parseFloat(t.montant) || 0), 0), nbTransactions: liees.length };
  };

  const ligne = (p, enFeuille = false) => {
    const choisie = selectedIds.includes(p.id);
    const active = estActive(p);
    const transfert = estTransfertInterne(p.nom, p.categorie);
    const montant = parseFloat(p.montant) || 0;
    const revenu = montant >= 0;
    const nature = transfert ? 'Virement interne' : revenu ? 'Revenu' : 'Dépense';
    const couleur = transfert ? 'var(--secondary)' : revenu ? (userTheme.color_revenus || '#10b981') : (userTheme.color_depenses || '#f43f5e');
    const { consomme = 0, nbTransactions = 0 } = suivi(p);
    const prevu = Math.abs(montant);
    const ecart = prevu - consomme;
    const pct = prevu > 0 ? Math.min(100, Math.round((consomme / prevu) * 100)) : 0;
    const etat = Math.abs(ecart) < 0.5 ? (revenu ? 'Perçu' : 'Réglé') : ecart < 0 ? `+${Math.round(-ecart)} €` : `${revenu ? 'Attendu' : 'Reste'} ${Math.round(ecart)} €`;
    const SELECT = 'px-2.5 h-8 rounded-xl';

    const libelle = (
      <textarea
        key={`${p.id}-${p.nom}`}
        rows={1}
        defaultValue={nomPropre(p)}
        aria-label="Libellé de la prévision"
        ref={ajusterHauteur}
        onInput={(e) => ajusterHauteur(e.currentTarget)}
        onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== nomPropre(p)) updatePrevision(p.id, 'nom', `[PRÉVI] ${v}`); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
          if (e.key === 'Escape') { e.currentTarget.value = nomPropre(p); ajusterHauteur(e.currentTarget); e.currentTarget.blur(); }
        }}
        placeholder="Modifier le libellé..."
        className={`w-full min-w-0 flex-1 resize-none overflow-hidden break-words leading-snug bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/15 focus:border-[var(--primary)]/60 focus:bg-black/50 rounded-lg px-2 py-1 text-[13px] font-semibold text-[var(--text-main)] outline-none transition-colors cursor-text ${active ? '' : 'line-through'}`}
      />
    );
    const selCategorie = (
      <CustomSelect flottant ariaLabel="Catégorie de la prévision" value={p.categorie} icon={Tag}
        options={categoriesVisibles.map((c) => ({ v: c, l: c }))} onChange={(v) => updatePrevision(p.id, 'categorie', v)} className={SELECT} />
    );
    const selCompte = (
      <CustomSelect flottant ariaLabel="Compte de la prévision" value={p.compte} icon={Wallet}
        options={optionsComptes} onChange={(v) => updatePrevision(p.id, 'compte', v)} className={SELECT} />
    );
    const champMontant = (
      <label className="flex items-center h-8 px-2.5 rounded-lg bg-black/20 border border-white/5 hover:border-white/15 focus-within:border-[var(--primary)]/60 transition-colors">
        <input
          key={`${p.id}-${p.montant}`}
          type="number"
          step="0.01"
          aria-label="Montant prévu"
          defaultValue={p.montant}
          onBlur={(e) => { const v = parseFloat(e.target.value); if (!Number.isNaN(v) && v !== montant) updatePrevision(p.id, 'montant', v); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="w-full bg-transparent outline-none text-right text-[14px] font-semibold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          style={{ color: couleur }}
        />
        <span className="ml-1 text-[11px] opacity-40">€</span>
      </label>
    );
    const barreSuivi = nbTransactions > 0 && (
      <div className="h-1 mt-0.5 rounded-full bg-black/40 overflow-hidden">
        <div className={`h-full rounded-full ${ecart < -0.5 && !revenu ? 'bg-rose-400' : 'bg-emerald-400'}`} style={{ width: `${ecart < -0.5 ? 100 : pct}%` }} />
      </div>
    );
    const suiviDetail = nbTransactions > 0 && (
      <div className="mt-1 px-0.5" title={`${nbTransactions} opération${nbTransactions > 1 ? 's reliées' : ' reliée'}`}>
        <div className="flex justify-between text-[10px] text-[var(--text-main)]/55 tabular-nums">
          <span>{Math.round(consomme)} €</span>
          <span className={ecart < -0.5 ? (revenu ? 'text-emerald-400' : 'text-rose-400') : Math.abs(ecart) < 0.5 ? 'text-emerald-400' : ''}>{etat}</span>
        </div>
        {barreSuivi}
      </div>
    );
    const champDate = (
      <label className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/10 focus-within:bg-[var(--primary)]/25 transition-colors cursor-pointer">
        <Calendar size={12} className="shrink-0 opacity-70" />
        <DatePicker
          selected={p.date ? new Date(p.date) : null}
          onChange={(date) => updatePrevision(p.id, 'date', date)}
          dateFormat="dd/MM/yyyy"
          portalId="root"
          className="w-full bg-transparent outline-none text-[12px] font-semibold text-[var(--text-main)] cursor-pointer"
        />
      </label>
    );

    // Sur téléphone, le panneau ouvert reprend tous les réglages de la ligne, en pleine largeur.
    if (enFeuille) {
      return (
        <FeuilleMobile titre={nomPropre(p)} onFermer={() => setOuverte(null)}>
          <div className="space-y-3">
            <Reglage nom="Libellé">{libelle}</Reglage>
            <div className="grid grid-cols-2 gap-2">
              <Reglage nom="Montant prévu">{champMontant}{suiviDetail}</Reglage>
              <Reglage nom="Date">{champDate}</Reglage>
            </div>
            <Reglage nom="Catégorie">{selCategorie}</Reglage>
            <Reglage nom="Compte">{selCompte}</Reglage>
            <button type="button" onClick={() => updatePrevision(p.id, 'actif', !active)}
              className={`w-full h-10 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-semibold cursor-pointer ${active ? 'bg-white/[0.06] text-[var(--text-main)]/80' : 'bg-rose-500/15 text-rose-300'}`}>
              {active ? <><EyeOff size={14} /> Ne plus compter cette prévision</> : <><Eye size={14} /> Compter de nouveau cette prévision</>}
            </button>
          </div>
        </FeuilleMobile>
      );
    }

    // Sur téléphone, une ligne compacte comme dans une appli bancaire : l'icône sélectionne, le reste ouvre les réglages.
    if (mobile) {
      return (
        <div key={p.id} className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-colors ${choisie ? 'bg-[var(--primary)]/15' : 'active:bg-white/[0.06]'} ${active ? '' : 'opacity-45'}`}>
          <button type="button" role="checkbox" aria-checked={choisie} aria-label={`Sélectionner ${nomPropre(p)}`} onClick={() => toggleSelect(p.id)} className="shrink-0 cursor-pointer">
            {choisie ? (
              <span className="w-10 h-10 rounded-[28%] flex items-center justify-center bg-[var(--primary)] text-white"><Check size={18} /></span>
            ) : (
              <CategoryIcon name={p.categorie || 'Autre'} size={18} className="w-10 h-10" />
            )}
          </button>
          <button type="button" onClick={() => setOuverte(p.id)} aria-label={`Modifier ${nomPropre(p)}`} className="flex-1 min-w-0 flex items-center gap-2 text-left cursor-pointer">
            <span className="flex-1 min-w-0">
              <span className={`flex items-center gap-1 text-[14px] font-semibold text-[var(--text-main)] ${active ? '' : 'line-through'}`}>
                <span className="truncate">{nomPropre(p)}</span>
                {p.regle_id && <Repeat size={11} className="shrink-0 text-[var(--secondary)]/80" aria-label="Répétée chaque mois" />}
              </span>
              <span className="block text-[12px] text-[var(--text-main)]/50 truncate">
                {active ? [getCleanCategoryName(p.categorie || 'Autre'), p.compte, nbTransactions > 0 && etat].filter(Boolean).join(' · ') : 'Non comptée'}
              </span>
              {barreSuivi}
            </span>
            <span className="shrink-0 text-[14px] font-semibold tabular-nums" style={{ color: couleur }}>{euros(montant)}</span>
            <ChevronRight size={16} className="shrink-0 text-[var(--text-main)]/25" aria-hidden="true" />
          </button>
        </div>
      );
    }

    return (
      <div key={p.id} className={`group flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${choisie ? 'bg-[var(--primary)]/15' : 'hover:bg-white/[0.04]'} ${active ? '' : 'opacity-40 hover:opacity-80'}`}>
        <input type="checkbox" aria-label={`Sélectionner ${nomPropre(p)}`} checked={choisie} onChange={() => toggleSelect(p.id)}
          className="w-4 h-4 shrink-0 rounded-[5px] accent-[var(--primary)] cursor-pointer" />
        <span title={nature} className="w-1 self-stretch shrink-0 rounded-full opacity-70" style={{ background: couleur }}>
          <span className="sr-only">{nature}</span>
        </span>

        <div className="flex items-start gap-1.5 flex-1 min-w-[160px]">
          {libelle}
          <span className="flex flex-col items-center gap-1 mt-1.5 shrink-0">
            <Pencil size={11} aria-hidden="true" className="text-[var(--text-main)]/25 group-hover:text-[var(--text-main)]/60 transition-colors" />
            {p.regle_id && <span title="Répétée chaque mois : voir l’onglet Récurrentes" aria-label="Répétée chaque mois" className="text-[var(--secondary)]/80"><Repeat size={11} aria-hidden="true" /></span>}
          </span>
        </div>

        <div className="w-36 shrink-0">{selCategorie}</div>
        <div className="w-32 shrink-0">{selCompte}</div>
        <div className="w-32 shrink-0">{champMontant}{suiviDetail}</div>
        <div className="w-[118px] shrink-0">{champDate}</div>

        <button type="button" onClick={() => updatePrevision(p.id, 'actif', !active)}
          title={active ? 'Ne plus compter cette prévision' : 'Compter de nouveau cette prévision'}
          aria-label={active ? 'Ne plus compter cette prévision' : 'Compter de nouveau cette prévision'}
          className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg cursor-pointer transition-colors ${active ? 'text-[var(--text-main)]/40 hover:text-[var(--text-main)] hover:bg-white/10' : 'text-rose-300 bg-rose-500/15'}`}>
          {active ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
    );
  };

  // Une ligne d'en-tête par jour, dans l'ordre de la liste.
  const jours = [];
  for (const p of previsions) {
    const date = String(p.date || '').slice(0, 10);
    if (!jours.length || jours.at(-1).date !== date) jours.push({ date, previsions: [] });
    jours.at(-1).previsions.push(p);
  }

  return (
    <section aria-label="Prévisions du mois" className="flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-3 pb-1">
        <input type="checkbox" aria-label="Tout sélectionner" checked={previsions.length > 0 && selectedIds.length === previsions.length} onChange={toggleAll}
          className="w-4 h-4 rounded-[5px] accent-[var(--primary)] cursor-pointer" />
        <span className="text-[12px] text-[var(--text-main)]/55">{previsions.length} prévision{previsions.length > 1 ? 's' : ''}</span>
      </div>
      <div className={mobile ? 'pb-4' : 'px-2 pb-4'}>
        {jours.map((j) => {
          const total = j.previsions.filter(estActive).reduce((s, p) => s + (parseFloat(p.montant) || 0), 0);
          return (
            <div key={j.date}>
              <div className="flex justify-between items-baseline px-3 pt-4 pb-1.5 text-[12px]">
                <span className="font-semibold text-[var(--text-main)]/80">{libelleJour(j.date)}</span>
                <span className="tabular-nums text-[var(--text-main)]/45">{euros(total)}</span>
              </div>
              {j.previsions.map((p) => ligne(p))}
            </div>
          );
        })}
      </div>
      {mobile && ouverte != null && previsions.some((p) => p.id === ouverte) && ligne(previsions.find((p) => p.id === ouverte), true)}
    </section>
  );
}
