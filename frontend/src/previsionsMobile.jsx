import React, { useState } from 'react';
import { 
  Calendar, Tag, Wallet, Plus, Eye, EyeOff, TrendingUp, PieChart as PieChartIcon, X, Check, Copy, User, Search
} from 'lucide-react';
import DatePicker from 'react-datepicker';

export default function PrevisionsMobile(props) {
  const {
    filters, setFilters, comptes, moisListe, availablePeriods,
    soldeGlobalProjete, soldesPrevisionnels, userTheme,
    newPrevi, setNewPrevi, handleAddPrevision, handleTryDuplicate, selectedIds2,
    previsionsFiltrees, updatePrevision, toggleSelect2, toggleAll2,
    categoriesVisibles, optionsComptes, chartDataPrevisions, PrevisionsChartView,
    moisDisponibles, excludedMonths, setExcludedMonths, recapPrevisionsStats,
    objectifAnnuelGlobal, statsEpargnePrevisionnelle, pourcentageAnnuel,
    SortableAccountCard,
    // Récupération de votre composant CustomSelect pour la saisie et modification
    CustomSelect
  } = props;

  // États de navigation mobile
  const [mobileSubTab, setMobileSubTab] = useState('flux'); // 'flux' | 'projections'
  const [editingTx, setEditingTx] = useState(null); // Gère l'édition tactile d'une prévision
  const [showAddForm, setShowAddForm] = useState(false); // Permet de plier/déplier le formulaire d'ajout

  const handleOpenEdit = (prev) => {
    setEditingTx({ 
      ...prev,
      nomPropre: prev.nom.replace('[PRÉVI] ', '') 
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    await updatePrevision(editingTx.id, 'nom', `[PRÉVI] ${editingTx.nomPropre}`);
    await updatePrevision(editingTx.id, 'montant', parseFloat(editingTx.montant));
    await updatePrevision(editingTx.id, 'categorie', editingTx.categorie);
    await updatePrevision(editingTx.id, 'compte', editingTx.compte);
    await updatePrevision(editingTx.id, 'date', editingTx.date);
    setEditingTx(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
      
      {/* 1. EN-TÊTE MOBILE COMPACT */}
      <div className="flex items-center justify-between mb-3 mt-2 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight">Prévisions</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">Anticipation budgétaire</p>
        </div>

        {/* Solde final estimé global */}
        <div 
          className="px-3 py-1.5 rounded-xl text-right text-white shadow-md shrink-0"
          style={{ backgroundColor: userTheme.color_patrimoine || '#37b58f' }}
        >
          <p className="text-[7px] opacity-70 uppercase font-black leading-none mb-0.5">Solde Estimé</p>
          <p className="text-xs font-mono font-black">{soldeGlobalProjete.toLocaleString('fr-FR', { minimumFractionDigits: 0 })} €</p>
        </div>
      </div>

      {/* 2. 💡 RESTAURATION DES FILTRES DE PÉRIODE MOBILES COMPACTS ET HORIZONTAUX D'ORIGINE */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl mb-4 space-y-2 shrink-0">
        
        {/* Filtre Profil & Année */}
        <div className="flex justify-between items-center gap-2">
          {/* Groupes */}
          <div className="flex bg-black/30 p-0.5 rounded-lg">
            {['Tous', ...new Set(comptes.map(c => c.groupe))].map(p => (
              <button
                key={p}
                onClick={() => setFilters({...filters, profil: p})}
                className={`px-2.5 py-1 rounded text-[9px] font-black uppercase transition-all ${
                  filters.profil === p ? 'bg-white text-slate-900 shadow-sm' : 'text-white/40'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Années */}
          <div className="flex bg-black/30 p-0.5 rounded-lg">
            {[...new Set(availablePeriods.map(p => p.annee))].map(year => (
              <button
                key={year}
                onClick={() => setFilters({...filters, annee: year})}
                className={`px-2.5 py-1 rounded text-[9px] font-black transition-all ${
                  filters.annee === year ? 'bg-emerald-500 text-white shadow-sm' : 'text-white/40'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Swipe horizontal des Mois */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 select-none">
          {moisListe.map(m => (
            <button
              key={m.v}
              onClick={() => setFilters({...filters, mois: m.v})}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black shrink-0 transition-all border ${
                filters.mois === m.v 
                  ? 'bg-[var(--primary)] border-[var(--primary)] text-white' 
                  : 'bg-black/10 border-transparent text-white/30'
              }`}
            >
              {m.l.substring(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* 3. LISTE HORIZONTALE DES COMPTES COMPACTS */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 shrink-0 select-none">
        {soldesPrevisionnels && soldesPrevisionnels.map(c => (
          <div key={c.compte} className="min-w-[160px] shrink-0">
            {SortableAccountCard ? (
              <SortableAccountCard c={c} isSorting={false} />
            ) : (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <span className="text-[8px] font-black uppercase text-white/40 block">{c.compte}</span>
                <span className="text-xs font-mono font-black text-white block mt-1">{c.soldeProjete} €</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 4. SÉLECTION DES SOUS-ONGLETS */}
      <div className="flex border-b border-white/5 mb-4 select-none shrink-0">
        <button 
          onClick={() => setMobileSubTab('flux')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileSubTab === 'flux' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Flux Prévus ({previsionsFiltrees.length})
        </button>
        <button 
          onClick={() => setMobileSubTab('projections')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileSubTab === 'projections' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Recap Projections
        </button>
      </div>

      {/* =========================================================================
          ONGLET 1 : LES FLUX PRÉVUS (SAISIE EXPRESS + FICHE DE MODIFICATION)
          ========================================================================= */}
      {mobileSubTab === 'flux' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* BOUTON RECONDUIRE RAPIDEMENT */}
          {previsionsFiltrees.length > 0 && (
            <button
              onClick={handleTryDuplicate}
              className="w-full py-2.5 bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Copy size={12} />
              <span>
                {selectedIds2.length > 0 
                  ? `Reconduire la sélection (${selectedIds2.length})` 
                  : 'Reconduire le mois complet'}
              </span>
            </button>
          )}
          {/* ACCORDION FORMULAIRE D'AJOUT RAPIDE AVEC CUSTOM SELECTS */}
          {/* 💡 CORRECTION : Remplacement de 'overflow-hidden' par 'overflow-visible' 
             pour libérer l'affichage des listes CustomSelect à l'ouverture */}
          <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl overflow-visible relative">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full flex items-center justify-between p-3.5 text-[10px] uppercase font-black text-white/70"
            >
              <span className="flex items-center gap-2">
                <Plus size={14} className="text-[var(--primary)]" />
                <span>Nouvelle Prévision Rapide</span>
              </span>
              <span>{showAddForm ? '▲' : '▼'}</span>
            </button>

            {showAddForm && (
              /* 💡 On s'assure d'avoir 'overflow-visible' ou aucune restriction ici également */
              <div className="p-4 border-t border-white/5 space-y-3.5 bg-black/20 overflow-visible">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Libellé</label>
                  <input 
                    type="text"
                    placeholder="Ex: Prime, Loyer..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                    value={newPrevi.nom}
                    onChange={e => setNewPrevi({...newPrevi, nom: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant</label>
                    <input 
                      type="number"
                      placeholder="0.00"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                      value={newPrevi.montant}
                      onChange={e => setNewPrevi({...newPrevi, montant: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[38px] flex items-center justify-center relative">
                      <Calendar size={12} className="text-[var(--primary)] absolute left-3" />
                      <DatePicker
                        selected={newPrevi.date ? new Date(newPrevi.date) : null} 
                        onChange={(date) => setNewPrevi({ ...newPrevi, date: date })}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer pl-4"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  {/* CustomSelect Catégorie */}
                  <CustomSelect 
                    label="Catégorie"
                    value={newPrevi.categorie}
                    options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                    onChange={(val) => setNewPrevi({...newPrevi, categorie: val})}
                    icon={Tag}
                    className="p-2.5 rounded-xl text-[10px]"
                  />

                  {/* CustomSelect Compte */}
                  <CustomSelect 
                    label="Compte associé"
                    value={newPrevi.compte}
                    options={optionsComptes}
                    onChange={(val) => setNewPrevi({...newPrevi, compte: val})}
                    icon={Wallet}
                    className="p-2.5 rounded-xl text-[10px]"
                  />
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    handleAddPrevision();
                    setShowAddForm(false);
                  }}
                  className="w-full bg-[var(--primary)] text-white text-[10px] font-black py-2.5 rounded-xl uppercase tracking-widest mt-1"
                >
                  Ajouter au calendrier
                </button>
              </div>
            )}
          </div>

          {/* LISTE DES TRANSACTIONS PRÉVUES (FICHE INTERACTIVE) */}
          <div className="space-y-2">
            {previsionsFiltrees.length > 0 ? (
              previsionsFiltrees.map((prev) => {
                const isSelected = selectedIds2.includes(prev.id);
                const isActif = !(prev.actif === false || prev.actif === 0 || prev.actif === "0" || prev.actif === "false");
                const isTransfert = (prev.categorie?.includes("🔄") || (prev.nom && /\bVERS\b/.test(prev.nom.toUpperCase())));

                return (
                  <div 
                    key={prev.id}
                    onClick={() => handleOpenEdit(prev)}
                    className={`p-3 bg-[var(--glass-bg)] border border-white/5 rounded-2xl flex items-center justify-between transition-all active:bg-white/5 ${
                      !isActif ? 'opacity-35 saturate-50' : ''
                    } ${isSelected ? 'border-[var(--primary)]/50 bg-[var(--primary)]/5' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      
                      {/* Checkbox tactiles */}
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect2(prev.id)}
                        onClick={(e) => e.stopPropagation()} 
                        className="w-4.5 h-4.5 border-white/20 bg-[var(--glass-bg)] text-emerald-500 cursor-pointer rounded shrink-0 relative z-10"
                      />

                      <div className="min-w-0">
                        <p className={`text-xs font-bold text-white truncate pr-2 ${!isActif ? 'line-through text-white/50' : ''}`}>
                          {prev.nom.replace('[PRÉVI] ', '')}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded font-mono uppercase">
                            {prev.compte}
                          </span>
                          <span className="text-[8px] bg-[var(--primary)]/10 text-[var(--primary)]/80 px-1.5 py-0.5 rounded font-black max-w-[90px] truncate">
                            {prev.categorie}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2 flex items-center gap-3">
                      <div>
                        <span className="text-xs font-mono font-black" style={{ 
                          color: isTransfert 
                            ? '#a78bfa' 
                            : prev.montant > 0 
                              ? userTheme.color_revenus 
                              : userTheme.color_depenses 
                        }}>
                          {prev.montant > 0 ? '+' : ''}{prev.montant.toFixed(0)} €
                        </span>
                        <p className="text-[8px] text-white/30 font-bold uppercase mt-1">
                          {prev.date ? new Date(prev.date).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'}) : 'À définir'}
                        </p>
                      </div>

                      {/* Bouton Œil */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePrevision(prev.id, 'actif', !isActif);
                        }}
                        className={`p-1.5 rounded-lg border transition-all ${
                          isActif 
                            ? 'text-white/20 border-white/5 hover:text-white' 
                            : 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                        }`}
                      >
                        {isActif ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center bg-black/20 rounded-2xl border border-white/5">
                <span className="text-xl opacity-30">📅</span>
                <p className="text-[10px] text-white/40 uppercase font-black mt-2">Aucune prévision ce mois-ci</p>
              </div>
            )}
          </div>

          {/* VISUALISATION DE LA TENDANCE */}
          {chartDataPrevisions && chartDataPrevisions.length > 0 && (
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PieChartIcon size={14} className="text-white/40" />
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest">Analyse Mensuelle Prévue</h3>
              </div>
              <div className="h-44 w-full">
                <PrevisionsChartView 
                  data={chartDataPrevisions} 
                  themeColor={userTheme.color_depenses} 
                />
              </div>
            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          ONGLET 2 : RECAP PROJECTIONS ANNUELLES
          ========================================================================= */}
      {mobileSubTab === 'projections' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* SÉLECTEUR DE MOIS À EXCLURE */}
          {moisDisponibles.length > 0 && (
            <div className="bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">Masquer des prévisions</span>
                {excludedMonths.length > 0 && (
                  <button 
                    onClick={() => setExcludedMonths([])}
                    className="text-[9px] font-black text-rose-500/50 uppercase"
                  >
                    Tout réactiver
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1">
                {moisDisponibles.map(m => {
                  const isVisible = !excludedMonths.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => setExcludedMonths(prev => 
                        prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                      )}
                      className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                        isVisible 
                          ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20' 
                          : 'bg-black/30 border border-white/5 text-white/20'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* LISTE ANNUELLE PROJETÉE */}
          <div className="space-y-2">
            {recapPrevisionsStats.map((m, i) => {
              const estInteractif = m.type === 'projeté' || m.type === 'mixte';
              
              return (
                <div 
                  key={i} 
                  className={`p-3 bg-[var(--glass-bg)] border rounded-2xl flex flex-col gap-2 transition-all ${
                    estInteractif ? 'border-white/5 opacity-100' : 'border-transparent opacity-40'
                  } ${m.isMasque ? 'grayscale opacity-20' : ''}`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-white/[0.03]">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-white">{m.nom}</span>
                      <span className="text-[7px] uppercase font-bold text-white/20 italic">{m.type}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-black text-emerald-400">
                        {m.soldeTotal?.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div>
                      <p className="text-[7px] font-bold text-white/30 uppercase">Revenus</p>
                      <p className="text-[10px] font-mono font-black text-emerald-500/80 mt-0.5">
                        {m.revenus > 0 ? `+${Math.round(m.revenus)}€` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7px] font-bold text-white/30 uppercase">Dépenses</p>
                      <p className="text-[10px] font-mono font-black text-rose-500/80 mt-0.5">
                        {m.depenses > 0 ? `-${Math.round(m.depenses)}€` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[7px] font-bold text-white/30 uppercase">Épargne</p>
                      <span 
                        className="inline-block px-1.5 py-0.5 rounded text-[9px] font-black mt-0.5"
                        style={{ 
                          backgroundColor: `${userTheme.color_epargne}10`,
                          color: userTheme.color_epargne,
                        }}
                      >
                        {m.epargne !== 0 ? `${m.epargne > 0 ? '+' : ''}${Math.round(m.epargne)}€` : '0€'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* OBJECTIF FIN D'ANNÉE */}
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[8px] font-black text-emerald-500/40 uppercase italic tracking-widest">
                  Projection fin {filters.annee}
                </span>
                <p className="text-lg font-black text-white tracking-tighter mt-0.5">
                  {recapPrevisionsStats && recapPrevisionsStats.length > 0 
                    ? `${recapPrevisionsStats[recapPrevisionsStats.length - 1].soldeTotal?.toLocaleString('fr-FR', { minimumFractionDigits: 0 })}€`
                    : "0€"
                  }
                </p>
              </div>
              
              <div className="h-7 w-7 rounded-full bg-[var(--glass-bg)] border border-white/5 flex items-center justify-center text-[9px] font-black text-white/40 italic">
                {recapPrevisionsStats && recapPrevisionsStats[0]?.soldeTotal !== 0
                  ? `${Math.round(((recapPrevisionsStats[recapPrevisionsStats.length - 1]?.soldeTotal / recapPrevisionsStats[0]?.soldeTotal) - 1) * 100)}%`
                  : "0%"
                }
              </div>
            </div>

            <div className="h-[1px] w-full bg-white/5" />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white/40 text-[8px] font-black uppercase tracking-wider">
                    Projection Épargne Annuelle
                  </h4>
                  {objectifAnnuelGlobal > 0 ? (
                    <p className="text-white font-black text-xs mt-0.5">
                      {Math.floor(statsEpargnePrevisionnelle.montant).toLocaleString('fr-FR')} € 
                      <span className="text-white/20 text-[9px] font-medium ml-1">
                        / {objectifAnnuelGlobal.toLocaleString('fr-FR')} €
                      </span>
                    </p>
                  ) : (
                    <p className="text-white/20 font-black text-[9px] uppercase mt-0.5">Objectif non défini</p>
                  )}
                </div>
                
                {objectifAnnuelGlobal > 0 && (
                  <span className="text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    {statsEpargnePrevisionnelle.pourcentage}%
                  </span>
                )}
              </div>

              {/* Jauge */}
              {objectifAnnuelGlobal > 0 && (
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 mt-1">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${Math.min(pourcentageAnnuel, 100)}%`,
                      background: `linear-gradient(90deg, ${userTheme.color_epargne || '#ffffff'}90, ${userTheme.color_epargne || '#f1c40f'})`,
                    }}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          MODALE DE MODIFICATION COMPLÈTE DE TRANSACTION AVEC CUSTOM SELECTS
          ========================================================================= */}
      {editingTx && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* Calque de fond cliquable pour fermer */}
          <div className="absolute inset-0" onClick={() => setEditingTx(null)} />

          {/* Conteneur de la Modale - Entièrement centré, arrondi aux 4 coins et "overflow-visible" */}
          <div 
            /* 💡 CHANGEMENTS : 
               - rounded-3xl et border pour arrondir les 4 coins et fermer la carte
               - overflow-visible pour empêcher le rognage des CustomSelect
               - zoom-in-95 pour une transition d'apparition centrée plus naturelle */
            className="w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 overflow-visible space-y-4 animate-in fade-in zoom-in-95 duration-200 relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest">Éditer la prévision</h4>
                <p className="text-[9px] text-white/30 uppercase font-black">Changements appliqués instantanément</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingTx(null)} 
                className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inputs de modification avec CustomSelect */}
            <div className="space-y-4">
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTx.nomPropre}
                  onChange={(e) => setEditingTx({ ...editingTx, nomPropre: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    value={editingTx.montant}
                    onChange={(e) => setEditingTx({ ...editingTx, montant: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[var(--primary)]/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date estimée</label>
                  <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[34px] flex items-center justify-center relative">
                    <Calendar size={12} className="text-[var(--primary)] absolute left-3" />
                    <DatePicker
                      selected={editingTx.date ? new Date(editingTx.date) : null}
                      onChange={(date) => setEditingTx({ ...editingTx, date: date.toISOString().split('T')[0] })}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer pl-4"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                {/* CustomSelect Catégorie */}
                <CustomSelect 
                  label="Catégorie"
                  value={editingTx.categorie}
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => setEditingTx({ ...editingTx, categorie: val })}
                  icon={Tag}
                  className="p-2.5 rounded-xl text-[10px]"
                />

                {/* CustomSelect Compte */}
                <CustomSelect 
                  label="Compte"
                  value={editingTx.compte}
                  options={optionsComptes}
                  onChange={(val) => setEditingTx({ ...editingTx, compte: val })}
                  icon={Wallet}
                  className="p-2.5 rounded-xl text-[10px]"
                />
              </div>
            </div>

            {/* Validation */}
            <div className="flex gap-2 pt-3">
              <button 
                type="button"
                onClick={() => setEditingTx(null)}
                className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={handleSaveEdit}
                className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                Sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}