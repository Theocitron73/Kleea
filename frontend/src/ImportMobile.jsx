import React, { useState } from 'react';
import { 
  Upload, Wallet, Building2, RefreshCw, Plus, Download, Check, 
  Brain, X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search 
} from 'lucide-react';

export default function ImportMobile(props) {
  const {
    selectedCompte, setSelectedCompte, comptes,
    powensData, syncCountByAccount, handleAssociateAccount,
    isSyncingPowens, handleConnectNewBank,
    isManualSyncing, isSyncingData, isCheckingSync, handleSyncPowens, hasPendingSync,
    onDragOver, onDragLeave, onDrop, setFileName, handleFileUpload,
    transactionsCalculees, setTempTransactions, confirmBatchImport,
    categoriesPourIntelligence, intelSelectedCat, setIntelSelectedCat, activeCategoryData,
    handleRemoveKeyword, handleAddKeyword, signType, setSignType
  } = props;

  // États locaux de navigation mobile
  const [mobileSubTab, setMobileSubTab] = useState('sources'); // 'sources' | 'previsu' | 'intel'
  const [powensPanelOpen, setPowensPanelOpen] = useState(false);

  const isExecutingSync = isManualSyncing || isSyncingData || isCheckingSync;
  const nouvellesLignes = transactionsCalculees ? transactionsCalculees.filter(t => !t.isAlreadyImported) : [];

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
      
      {/* 1. EN-TÊTE MOBILE */}
      <div className="mb-4 mt-2">
        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Upload size={18} className="text-[var(--primary)]" /> Importer & Entraîner
        </h1>
        <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">
          Validation des flux & Intelligence
        </p>
      </div>

      {/* 2. BARRE D'ONGLETS COMMUTABLES SUR MOBILE */}
      <div className="flex border-b border-white/5 mb-4 select-none">
        <button 
          onClick={() => setMobileSubTab('sources')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileSubTab === 'sources' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Sources & Synchro
        </button>
        <button 
          onClick={() => setMobileSubTab('previsu')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 relative ${
            mobileSubTab === 'previsu' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Prévisualiser
          {transactionsCalculees && transactionsCalculees.length > 0 && (
            <span className="absolute -top-1 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center animate-pulse">
              {transactionsCalculees.length}
            </span>
          )}
        </button>
        <button 
          onClick={() => setMobileSubTab('intel')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileSubTab === 'intel' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Intelligence
        </button>
      </div>

      {/* =========================================================================
          SECTION 1 : SOURCES & SYNCHRONISATION
          ========================================================================= */}
      {mobileSubTab === 'sources' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* SÉLECTEUR DE COMPTE CIBLE */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Compte de destination</label>
            <select 
              value={selectedCompte} 
              onChange={(e) => setSelectedCompte(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
            >
              {comptes.map(c => (
                <option key={c.compte} value={c.compte}>{c.compte}</option>
              ))}
            </select>
          </div>

          {/* ACCORDION DE SYNCHRONISATION DES COMPTES REELS */}
          {powensData?.connections && powensData.connections.length > 0 && (
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setPowensPanelOpen(!powensPanelOpen)}
                className="w-full flex items-center justify-between p-4 text-[10px] uppercase font-black text-white/70"
              >
                <span className="flex items-center gap-2">
                  <Building2 size={14} className="text-[var(--primary)]" />
                  <span>Associer vos comptes bancaires réels</span>
                </span>
                <span>{powensPanelOpen ? '▲' : '▼'}</span>
              </button>
              
              {powensPanelOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3 bg-black/25">
                  {powensData.connections.map((conn) => {
                    const connAccounts = powensData.accounts?.filter(
                      (acc) => acc.connection_id === conn.id || acc.bank_name === conn.connector_name
                    ) || [];

                    if (connAccounts.length === 0) return null;

                    return (
                      <div key={conn.id} className="space-y-2">
                        <p className="text-[8px] font-black uppercase text-[var(--primary)]">{conn.connector_name}</p>
                        
                        <div className="space-y-2">
                          {connAccounts.map((acc) => {
                            const associatedLocalAccount = comptes?.find(
                              (c) => (c.powens_name || "").trim().toUpperCase() === (acc.name || "").trim().toUpperCase()
                            );
                            const isAssociated = Boolean(associatedLocalAccount);
                            const isDesynced = Boolean(
                              syncCountByAccount[associatedLocalAccount?.compte] || syncCountByAccount[acc.name]
                            );

                            return (
                              <div key={acc.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold">
                                  <span className="text-white truncate max-w-[150px]">{acc.name}</span>
                                  <span className="font-mono text-[10px]">
                                    {acc.balance !== null ? `${acc.balance.toFixed(0)} ${acc.currency}` : "—"}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  {/* Badge de liaison */}
                                  {!isAssociated ? (
                                    <span className="text-[7px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase">Non lié</span>
                                  ) : isDesynced ? (
                                    <span className="text-[7px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-black uppercase animate-pulse">Flux en attente</span>
                                  ) : (
                                    <span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">Lié</span>
                                  )}

                                  {/* Sélecteur d'association */}
                                  <select 
                                    value={associatedLocalAccount ? associatedLocalAccount.compte : ""}
                                    onChange={(e) => handleAssociateAccount?.(acc.name, e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded-lg text-[10px] px-2 py-1 font-bold text-white outline-none w-32"
                                  >
                                    <option value="">-- Non lié --</option>
                                    {comptes.map(c => (
                                      <option key={c.compte} value={c.compte}>{c.compte}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ACTIONS RAPIDES : 3 BLOCS DE SAISIE */}
          <div className="space-y-3">
            
            {/* ACTION 1 : NOUVEAU COMPTE */}
            <div 
              onClick={!isSyncingPowens ? handleConnectNewBank : undefined}
              className="p-4 bg-[var(--glass-bg)] border border-white/10 active:bg-white/5 rounded-2xl flex items-center gap-3 transition-all"
            >
              <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] rounded-xl shrink-0">
                <Plus size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Ajouter une banque</h4>
                <p className="text-[8px] text-white/30 uppercase font-black">Liaison API via Powens</p>
              </div>
            </div>

            {/* ACTION 2 : SYNCHRONISATION */}
            <div 
              onClick={isExecutingSync ? undefined : handleSyncPowens}
              className={`p-4 border rounded-2xl flex items-center gap-3 transition-all ${
                hasPendingSync 
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/5' 
                  : 'bg-[var(--glass-bg)] border-white/10 active:bg-white/5'
              }`}
            >
              <div className={`p-3 rounded-xl shrink-0 ${isExecutingSync ? 'bg-[var(--primary)] text-black animate-spin' : 'bg-[var(--primary)]/10 text-[var(--primary)]'}`}>
                <RefreshCw size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Lancer la Synchronisation</h4>
                <p className="text-[8px] font-black uppercase truncate mt-0.5 text-indigo-400">
                  {isExecutingSync ? 'Synchronisation API en cours...' : hasPendingSync ? 'Nouvelles données prêtes' : 'Données Powens à jour'}
                </p>
              </div>
            </div>

            {/* ACTION 3 : GLISSER/LIRE CSV */}
            <div 
              onClick={() => document.getElementById('csvInputMobile').click()}
              className="p-4 bg-[var(--glass-bg)] border border-white/10 active:bg-white/5 rounded-2xl flex items-center gap-3 transition-all"
            >
              <input 
                type="file" 
                id="csvInputMobile" 
                className="hidden" 
                accept=".csv" 
                onChange={(e) => { 
                  const file = e.target.files[0]; 
                  if (file) { 
                    setFileName(file.name); 
                    handleFileUpload(file); 
                  } 
                }} 
              />
              <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] rounded-xl shrink-0">
                <Upload size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Importer un fichier CSV</h4>
                <p className="text-[8px] text-white/30 uppercase font-black">Traitement et catégorisation</p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2 : PREVISUALISATION (FICHE PAR FICHE / TACTILE UNIQUE)
          ========================================================================= */}
      {mobileSubTab === 'previsu' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* STATISTIQUES COMPACTES */}
          {transactionsCalculees && transactionsCalculees.length > 0 && (
            <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-[9px] font-black uppercase text-white/40">Cible : {selectedCompte}</span>
                <span className="text-[9px] font-black uppercase text-emerald-400">{transactionsCalculees.length} Lignes</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-black/20 rounded-xl">
                  <p className="text-[8px] font-bold text-white/30 uppercase">Revenus</p>
                  <p className="text-xs font-mono font-black text-emerald-400">
                    {transactionsCalculees.filter(t => t.montant > 0 && !t.categorie.startsWith('🔄')).reduce((acc, t) => acc + t.montant, 0).toFixed(0)}€
                  </p>
                </div>
                <div className="p-2 bg-black/20 rounded-xl">
                  <p className="text-[8px] font-bold text-white/30 uppercase">Dépenses</p>
                  <p className="text-xs font-mono font-black text-rose-400">
                    {transactionsCalculees.filter(t => t.montant < 0 && !t.categorie.startsWith('🔄')).reduce((acc, t) => acc + t.montant, 0).toFixed(0)}€
                  </p>
                </div>
              </div>

              {/* Bouton pour valider l'importation global */}
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => { setTempTransactions([]); setFileName(""); }}
                  className="flex-1 py-2.5 bg-white/5 text-white/50 rounded-xl text-[10px] font-black uppercase tracking-wider"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmBatchImport}
                  disabled={nouvellesLignes.length === 0}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40"
                >
                  Valider ({nouvellesLignes.length})
                </button>
              </div>
            </div>
          )}

          {/* LISTE DES TRANSACTIONS PRÉVISUALISÉES */}
          <div className="space-y-2">
            {transactionsCalculees && transactionsCalculees.length > 0 ? (
              transactionsCalculees.map((t, idx) => {
                const isTransfert = t.categorie.startsWith('🔄');
                const isImported = t.isAlreadyImported;

                return (
                  <div 
                    key={idx} 
                    className={`p-3 bg-[var(--glass-bg)] border border-white/5 rounded-xl flex items-center justify-between transition-all ${
                      isImported ? 'opacity-40 bg-white/[0.01]' : 'border-rose-500/10'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-white truncate max-w-[170px]">{t.nom}</p>
                        
                        {/* Status badge */}
                        {isImported ? (
                          <span className="text-[6px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Importé</span>
                        ) : (
                          <span className="text-[6px] bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded font-black uppercase">Nouveau</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-white/30">{t.date}</span>
                        <span className="text-[8px] font-black text-[var(--primary)] uppercase">
                          {t.categorie}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-mono font-black ${
                        isImported ? 'text-white/20' : isTransfert ? 'text-violet-400' : t.montant < 0 ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {t.montant > 0 ? '+' : ''}{t.montant.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center">
                <span className="text-2xl opacity-20">📂</span>
                <p className="text-[10px] text-white/40 uppercase font-black mt-2">Aucune transaction en prévisualisation</p>
                <p className="text-[9px] text-white/20 uppercase font-black max-w-[200px] mx-auto mt-1 leading-relaxed">
                  Utilisez l'onglet "Sources & Synchro" pour charger des données de transactions.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* =========================================================================
          SECTION 3 : INTELLIGENCE (ENTRAÎNER LE LEXIQUE)
          ========================================================================= */}
      {mobileSubTab === 'intel' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* CIBLE D'APPRENTISSAGE */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl">
            <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Cible d'apprentissage</label>
            <select 
              value={intelSelectedCat} 
              onChange={(e) => setIntelSelectedCat(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
            >
              {categoriesPourIntelligence.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* CADRE INTELLIGENCE / MOTS CLES */}
          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-3xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div>
                <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-widest">Lexique en cours</span>
                <h4 className="text-xs font-bold text-white mt-0.5 truncate max-w-[180px]">{intelSelectedCat}</h4>
              </div>
              <span className="text-[10px] font-black bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-xl">
                {activeCategoryData?.mots_cles?.length || 0}
              </span>
            </div>

            {/* MOTS-CLÉS DE LA CATÉGORIE CIBLE */}
            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
              {activeCategoryData?.mots_cles && activeCategoryData.mots_cles.length > 0 ? (
                activeCategoryData.mots_cles.map((keyword, kIdx) => {
                  const [keywordText, rawSign] = keyword.split(':');
                  const sign = rawSign || 'both';

                  return (
                    <div 
                      key={kIdx} 
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-white/10 rounded-xl text-[9px] font-bold uppercase text-white/70"
                    >
                      <span className="flex items-center gap-1">
                        {keywordText.replace(/"/g, '')}
                        {sign === "positive" && <span className="text-emerald-400">↗</span>}
                        {sign === "negative" && <span className="text-rose-400">↙</span>}
                        {sign === "both" && <span className="text-white/20">⇅</span>}
                      </span>
                      <button 
                        onClick={() => handleRemoveKeyword(intelSelectedCat, keyword)} 
                        className="text-white/30 hover:text-rose-400"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-[9px] text-white/20 uppercase font-black py-4 w-full text-center">Aucun mot-clé enregistré</p>
              )}
            </div>

            {/* SELECTION DU TYPE DE SIGNE */}
            <div className="space-y-2 border-t border-white/5 pt-3">
              <span className="text-[8px] font-black text-white/30 uppercase block">Signe des flux cibles :</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  onClick={() => setSignType("both")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all ${
                    signType === "both" 
                      ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Tous
                </button>
                <button 
                  onClick={() => setSignType("positive")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all ${
                    signType === "positive" 
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Crédits
                </button>
                <button 
                  onClick={() => setSignType("negative")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all ${
                    signType === "negative" 
                      ? "bg-rose-500/10 border-rose-500/50 text-rose-400" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Débits
                </button>
              </div>
            </div>

            {/* AJOUTER NOUVEL APPRENTISSAGE */}
            <div className="pt-2">
              <input 
                type="text"
                placeholder="Nouveau mot-clé..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-xs font-black uppercase text-white outline-none focus:border-[var(--primary)]/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAddKeyword(intelSelectedCat, e.target.value);
                    e.target.value = '';
                  }
                }}
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}