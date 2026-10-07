import React, { useState } from 'react';
import { 
  Upload, Wallet, Building2, RefreshCw, Plus, Download, Check, 
  Brain, X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Tag, CreditCard
} from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from './categoryIcons'; // 👈 Adaptez le chemin ('./categoryIcons' ou '../categoryIcons') selon l'emplacement

export default function ImportMobile(props) {
  const {
    selectedCompte, setSelectedCompte, comptes,
    powensData, syncCountByAccount, handleAssociateAccount,
    isSyncingPowens, handleConnectNewBank,
    isManualSyncing, setIsManualSyncing, isSyncingData, isCheckingSync, handleSyncPowens, hasPendingSync,
    onDragOver, onDragLeave, onDrop, isDragging, setFileName, handleFileUpload,
    transactionsCalculees, setTempTransactions, confirmBatchImport,
    categoriesPourIntelligence, intelSelectedCat, setIntelSelectedCat, activeCategoryData,
    handleRemoveKeyword, handleAddKeyword, signType, setSignType,
    CustomSelect, categoriesVisibles,
    handleForceRefreshPowens
  } = props;

  const [mobileSubTab, setMobileSubTab] = useState('sources');
  const [powensPanelOpen, setPowensPanelOpen] = useState(false);

  const isExecutingSync = isManualSyncing || isSyncingData || isCheckingSync;
  const nouvellesLignes = transactionsCalculees ? transactionsCalculees.filter(t => !t.isAlreadyImported) : [];

  // Helper virements internes
  const isInternalTransfer = (cat) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c.includes("vers") || c.includes("transfert") || c.startsWith("🔄") || c.startsWith("virement :");
  };

  // Liste des comptes avec transactions en attente
  const unsyncedAccounts = Object.entries(syncCountByAccount || {}).filter(
    ([_, data]) => {
      const count = typeof data === 'object' ? data?.count : Number(data);
      return count > 0;
    }
  );

  // Déclencheur de synchronisation sécurisé sans argument d'événement
  const handleClickSync = async () => {
    if (isExecutingSync) return;
    if (typeof setIsManualSyncing === 'function') setIsManualSyncing(true);
    try {
      if (handleSyncPowens) {
        await handleSyncPowens();
      }
    } finally {
      if (typeof setIsManualSyncing === 'function') setIsManualSyncing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2 select-none">
      
      {/* 1. EN-TÊTE MOBILE */}
      <div className="mb-4 mt-2">
        <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Upload size={18} className="text-[var(--primary)]" /> Importer & Entraîner
        </h1>
        <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">
          Validation des flux & Intelligence
        </p>
      </div>

      {/* 2. ONGLETS MOBILES */}
      <div className="flex border-b border-white/5 mb-4 select-none">
        <button 
          type="button"
          onClick={() => setMobileSubTab('sources')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            mobileSubTab === 'sources' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Sources & Synchro
        </button>
        
        <button 
          type="button"
          onClick={() => setMobileSubTab('previsu')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 relative cursor-pointer ${
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
          type="button"
          onClick={() => setMobileSubTab('intel')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
            mobileSubTab === 'intel' 
              ? 'border-[var(--primary)] text-[var(--primary)]' 
              : 'border-transparent text-white/40'
          }`}
        >
          Intelligence
        </button>
      </div>

      {/* =========================================================================
          SECTION 1 : SOURCES DE SYNCHRONISATION
          ========================================================================= */}
      {mobileSubTab === 'sources' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Sélecteur de compte cible */}
          <CustomSelect 
            label="Compte de destination"
            value={selectedCompte}
            options={comptes.map(c => ({ v: c.compte, l: c.compte }))}
            onChange={(val) => setSelectedCompte(val)}
            icon={Wallet}
            className="p-2.5 rounded-xl text-[10px]"
          />

          {/* ACCORDÉON DES COMPTES POWENS CONNECTÉS */}
          {powensData?.connections && powensData.connections.length > 0 && (
            <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-2.5 pr-3">
                <button
                  type="button"
                  onClick={() => setPowensPanelOpen(!powensPanelOpen)}
                  className="flex-1 flex items-center justify-between text-[10px] uppercase font-black text-white/70 pr-2 cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Building2 size={13} className="text-[var(--primary)] shrink-0" />
                    <span className="truncate">Associer vos comptes ({powensData?.accounts_count || 0})</span>
                  </span>
                  <span className={`text-[9px] transition-transform ${powensPanelOpen ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {handleForceRefreshPowens && (
                  <button
                    type="button"
                    onClick={handleForceRefreshPowens}
                    disabled={isCheckingSync}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-[var(--primary)] border border-white/5 shrink-0 transition-all cursor-pointer"
                    title="Actualiser les comptes Powens"
                  >
                    <RefreshCw size={12} className={isCheckingSync ? 'animate-spin' : ''} />
                  </button>
                )}
              </div>
              
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
                        
                        <div className="space-y-2.5">
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

                                <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] uppercase tracking-wider text-white/40 font-bold shrink-0">Statut :</span>
                                    {!isAssociated ? (
                                      <span className="text-[7px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-black uppercase">Non lié</span>
                                    ) : isDesynced ? (
                                      <span className="text-[7px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-black uppercase animate-pulse">Nouvelles transactions</span>
                                    ) : (
                                      <span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black uppercase">Synchronisé</span>
                                    )}
                                  </div>

                                  <CustomSelect 
                                    value={associatedLocalAccount ? associatedLocalAccount.compte : ""}
                                    options={[
                                      { v: "", l: "-- Non lié --" },
                                      ...comptes.map(c => ({ v: c.compte, l: c.compte }))
                                    ]}
                                    onChange={(val) => handleAssociateAccount?.(acc.name, val)}
                                    icon={Wallet}
                                    className="p-2 py-1 rounded-lg text-[9px]"
                                  />
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

          {/* ACTIONS D'IMPORTATION */}
          <div className="space-y-3">
            
            {/* ACTION 1 : NOUVELLE BANQUE */}
            <div 
              onClick={!isSyncingPowens ? handleConnectNewBank : undefined}
              className="p-4 bg-[var(--glass-bg)] border border-white/10 active:bg-white/5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer"
            >
              <div className="p-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] rounded-xl shrink-0">
                <Plus size={16} />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Ajouter une banque</h4>
                <p className="text-[8px] text-white/30 uppercase font-black">Connexion API via Powens</p>
              </div>
            </div>

            {/* 🟢 ACTION 2 : SYNCHRONISER AVEC LES NOMS DE COMPTES & COMPTEURS DE TRANSACTIONS */}
            <div 
              onClick={handleClickSync}
              className={`
                relative rounded-2xl p-4 flex flex-col gap-2.5 border transition-all duration-300 cursor-pointer overflow-hidden
                ${hasPendingSync 
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10' 
                  : isExecutingSync 
                    ? 'bg-[var(--primary)]/10 border-[var(--primary)] cursor-wait' 
                    : 'bg-[var(--glass-bg)] border-white/10 active:bg-white/5'}
              `}
            >
              {/* Pastille clignotante si transactions en attente */}
              {hasPendingSync && !isExecutingSync && (
                <span className="absolute top-3.5 right-3.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-lg" />
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl transition-all duration-300 shrink-0 ${
                  isExecutingSync 
                    ? 'bg-[var(--primary)] text-black animate-spin' 
                    : hasPendingSync 
                      ? 'bg-[var(--primary)] text-black' 
                      : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]'
                }`}>
                  {isExecutingSync ? <RefreshCw size={16} /> : <Download size={16} />}
                </div>

                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-white leading-tight">
                    Synchroniser
                  </h4>
                  <p className={`text-[8.5px] font-black uppercase truncate mt-0.5 ${
                    isExecutingSync 
                      ? 'text-[var(--primary)] animate-pulse' 
                      : hasPendingSync 
                        ? 'text-rose-400 animate-pulse' 
                        : 'text-emerald-400/80 font-bold'
                  }`}>
                    {isExecutingSync 
                      ? 'Actualisation en cours...' 
                      : hasPendingSync 
                        ? 'Nouvelles transactions prêtes' 
                        : 'Données Powens à jour'}
                  </p>
                </div>
              </div>

              {/* 🟢 BADGES AVEC LE NOM DES COMPTES ET LE NOMBRE DE TRANSACTIONS NOUVELLES */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-white/5">
                {isExecutingSync ? (
                  <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-wider animate-pulse">
                    Synchronisation API en direct...
                  </span>
                ) : hasPendingSync && unsyncedAccounts.length > 0 ? (
                  unsyncedAccounts.map(([accName, data]) => {
                    const count = typeof data === 'object' ? data.count : data;
                    return (
                      <span 
                        key={accName} 
                        className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-200 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm"
                      >
                        <span className="text-white font-black">{accName}</span>
                        <span className="text-rose-200 font-black bg-rose-500/30 px-1 py-0.2 rounded text-[7px]">
                          +{count} Nouvelles
                        </span>
                      </span>
                    );
                  })
                ) : hasPendingSync ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[8px] font-black uppercase tracking-wider">
                    Nouvelles transactions
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span>Tous les comptes sont à jour</span>
                  </span>
                )}
              </div>
            </div>

            {/* 🟢 ACTION 3 : GLISSER-DÉPOSER / SÉLECTION MULTI-FORMATS (CSV, OFX, QIF) */}
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => document.getElementById('fileInputMobile')?.click()}
              className={`
                relative rounded-2xl p-4 flex items-center gap-3 border transition-all duration-300 cursor-pointer overflow-hidden min-h-[80px] select-none
                ${isDragging 
                  ? 'bg-indigo-500/20 border-indigo-400 scale-[1.02] shadow-[0_0_25px_rgba(99,102,241,0.3)]' 
                  : transactionsCalculees?.length > 0 
                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                    : 'bg-[var(--glass-bg)] border-white/10 active:bg-white/5'}
              `}
            >
              <input 
                type="file" 
                id="fileInputMobile" 
                className="hidden" 
                accept=".csv,.ofx,.qif,.qfx" 
                onChange={(e) => { 
                  const file = e.target.files?.[0]; 
                  if (file) { 
                    if (setFileName) setFileName(file.name); 
                    handleFileUpload(file); 
                  } 
                }} 
              />
              
              <div className={`pointer-events-none p-3 rounded-xl transition-all duration-300 shrink-0 ${
                transactionsCalculees?.length > 0 && !isDragging 
                  ? 'bg-emerald-500 text-black' 
                  : isDragging
                    ? 'bg-indigo-500 text-white animate-bounce'
                    : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]'
              }`}>
                {transactionsCalculees?.length > 0 && !isDragging ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <Upload size={16} />
                )}
              </div>

              <div className="pointer-events-none flex flex-col min-w-0 flex-1">
                <h4 className={`text-[10.5px] font-black uppercase tracking-wider ${
                  isDragging 
                    ? 'text-indigo-300' 
                    : transactionsCalculees?.length > 0 
                      ? 'text-emerald-400' 
                      : 'text-white'
                }`}>
                  {isDragging ? 'Déposez votre fichier ici !' : 'Glisser-Déposer ou Cliquer'}
                </h4>
                <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest truncate mt-0.5">
                  {transactionsCalculees?.length > 0 
                    ? 'Fichier chargé • Prêt à valider' 
                    : 'Fichiers CSV, OFX ou QIF'}
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 2 : PRÉVISUALISATION DU LOT
          ========================================================================= */}
      {mobileSubTab === 'previsu' && (
        <div className="space-y-4 animate-in fade-in duration-200">
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
                    {transactionsCalculees.filter(t => t.montant > 0 && !isInternalTransfer(t.categorie)).reduce((acc, t) => acc + t.montant, 0).toFixed(0)}€
                  </p>
                </div>
                <div className="p-2 bg-black/20 rounded-xl">
                  <p className="text-[8px] font-bold text-white/30 uppercase">Dépenses</p>
                  <p className="text-xs font-mono font-black text-rose-400">
                    {transactionsCalculees.filter(t => t.montant < 0 && !isInternalTransfer(t.categorie)).reduce((acc, t) => acc + t.montant, 0).toFixed(0)}€
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => { setTempTransactions([]); setFileName(""); }}
                  className="flex-1 py-2.5 bg-white/5 text-white/50 rounded-xl text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={confirmBatchImport}
                  disabled={nouvellesLignes.length === 0}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer shadow-lg shadow-[var(--primary)]/20"
                >
                  Valider ({nouvellesLignes.length})
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {transactionsCalculees && transactionsCalculees.length > 0 ? (
              transactionsCalculees.map((t, idx) => {
                const isTransfert = isInternalTransfer(t.categorie);
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
                        {isImported ? (
                          <span className="text-[6.5px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-black uppercase">Importé</span>
                        ) : (
                          <span className="text-[6.5px] bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded font-black uppercase">Nouveau</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-white/30">{t.date}</span>
                        <div className="flex items-center gap-1">
                          <CategoryIcon name={t.categorie} size={11} />
                          <span className="text-[8px] font-black uppercase text-white/80 truncate max-w-[110px]">
                            {getCleanCategoryName(t.categorie)}
                          </span>
                        </div>
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SECTION 3 : INTELLIGENCE (LEXIQUE & APPRENTISSAGE)
          ========================================================================= */}
      {mobileSubTab === 'intel' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <CustomSelect 
            label="Cible d'apprentissage"
            value={intelSelectedCat}
            options={categoriesPourIntelligence.map(cat => ({ v: cat, l: cat }))}
            onChange={(val) => setIntelSelectedCat(val)}
            icon={Search}
            className="p-2.5 rounded-xl text-[10px]"
          />

          <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-3xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <CategoryIcon name={intelSelectedCat} size={16} />
                <div className="min-w-0">
                  <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-widest block leading-none">
                    Lexique en cours
                  </span>
                  <h4 className="text-xs font-bold text-white mt-1 truncate max-w-[160px] leading-tight">
                    {getCleanCategoryName(intelSelectedCat)}
                  </h4>
                </div>
              </div>
              <span className="text-[10px] font-black bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-1 rounded-xl">
                {activeCategoryData?.mots_cles?.length || 0}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
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
                        {sign === "positive" && <span className="text-emerald-400 font-black">↗</span>}
                        {sign === "negative" && <span className="text-rose-400 font-black">↙</span>}
                        {sign === "both" && <span className="text-white/20">⇅</span>}
                      </span>
                      <button 
                        type="button"
                        onClick={() => handleRemoveKeyword(intelSelectedCat, keyword)} 
                        className="text-white/30 hover:text-rose-400 cursor-pointer"
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

            <div className="space-y-2 border-t border-white/5 pt-3">
              <span className="text-[8px] font-black text-white/30 uppercase block">Signe des flux cibles :</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button 
                  type="button"
                  onClick={() => setSignType("both")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all cursor-pointer ${
                    signType === "both" 
                      ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Tous
                </button>
                <button 
                  type="button"
                  onClick={() => setSignType("positive")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all cursor-pointer ${
                    signType === "positive" 
                      ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Crédits
                </button>
                <button 
                  type="button"
                  onClick={() => setSignType("negative")}
                  className={`py-2 px-2 rounded-xl text-[8px] font-black uppercase border transition-all cursor-pointer ${
                    signType === "negative" 
                      ? "bg-rose-500/10 border-rose-500/50 text-rose-400" 
                      : "bg-transparent border-white/10 text-white/40"
                  }`}
                >
                  Débits
                </button>
              </div>
            </div>

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