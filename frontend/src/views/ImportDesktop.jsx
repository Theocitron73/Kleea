import React, { useState } from 'react';
import { 
  Upload, Wallet, Building2, RefreshCw, Plus, Download, Check, 
  Brain, X, ArrowUpRight, ArrowDownLeft, ArrowRightLeft, HelpCircle, 
  ChevronRight, Landmark, ArrowRightLeft as ArrowRightLeftIcon 
} from 'lucide-react';
import { CategoryIcon, getCleanCategoryName } from '../categoryIcons';

// Guide d'export CSV par banque
function HelpPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

  const bankGuides = [
    { id: 'lbp', name: 'La Banque Postale', guide: 'Menu latéral gauche > OPÉRATIONS > "Téléchargement d\'opérations" > Choisir le compte > Format CSV.' },
    { id: 'bourso', name: 'BoursoBank', guide: 'Cliquer sur le compte > Filtrer la période > Bouton "Exporter en Format CSV" (tout en bas sous la liste).' },
    { id: 'revolut', name: 'Revolut', guide: 'Accueil > Cliquer sur "..." (Plus) > Relevés > Relevé de transactions > Choisir Excel (CSV) > Générer.' },
    { id: 'bp', name: 'Banque Populaire', guide: 'Menu "Documents" > "Vos écritures et opérations" > Sélectionner CSV (Excel) > Choisir les dates.' },
    { id: 'ca', name: 'Crédit Agricole', guide: 'Menu "Documents" > "Télécharger l\'historique des opérations" > Sélectionner le compte > Format CSV.' },
    { id: 'bnplcl', name: 'BNP / LCL', guide: 'Rubrique "Comptes & Contrats" > "Télécharger vos relevés d\'opération" > Choisir le format CSV.' },
    { id: 'sg', name: 'Société Générale', guide: 'Sélectionner le compte > Onglet "Autres" > "Export" > Choisir le format CSV et la période.' }
  ];

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[52px] px-4 rounded-2xl flex items-center gap-3 transition-all duration-300 border cursor-pointer ${
          isOpen ? 'bg-[var(--glass-bg)] border-[var(--primary)]/50' : 'bg-white/[0.02] border-white/10'
        }`}
      >
        <div className="p-1.5 bg-[var(--glass-bg)] rounded-lg">
          <HelpCircle size={16} className={isOpen ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/40'} />
        </div>
        <div className="flex flex-col items-start hidden md:flex">
          <span className="text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-widest text-left">Guide Export CSV</span>
          <span className="text-[8px] text-[var(--text-main)]/10 font-bold uppercase text-left">Aide banques</span>
        </div>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSelectedBank(null); }} />
          <div className="absolute right-0 top-[110%] mt-2 w-72 bg-[#161618] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
              <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Exporter mon CSV</h4>
              <p className="text-[8px] text-[var(--text-main)]/20 uppercase font-bold mt-1">Sélectionnez votre banque</p>
            </div>

            <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {!selectedBank ? (
                <div className="space-y-1">
                  {bankGuides.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => setSelectedBank(bank)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[var(--glass-bg)] transition-colors group/item text-left cursor-pointer"
                    >
                      <span className="text-[10px] font-bold text-[var(--text-main)]/60 group-hover/item:text-[var(--primary)] uppercase">{bank.name}</span>
                      <ChevronRight size={14} className="text-[var(--text-main)]/10 group-hover/item:text-[var(--primary)]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2 animate-in slide-in-from-right-2 duration-300">
                  <button 
                    onClick={() => setSelectedBank(null)}
                    className="text-[8px] font-black text-[var(--primary)] uppercase mb-4 flex items-center gap-2 hover:opacity-70 cursor-pointer"
                  >
                    ← Retour
                  </button>
                  <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-[var(--primary)] uppercase block mb-2">{selectedBank.name}</span>
                    <p className="text-[11px] text-[var(--text-main)]/80 font-medium leading-relaxed uppercase tracking-tight">
                      {selectedBank.guide}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ImportDesktop({
  importCompte,
  setImportCompte,
  comptes,
  powensData,
  syncCountByAccount,
  handleAssociateAccount,
  isRefreshingPowens,
  isCheckingSync,
  handleForceRefreshPowens,
  isSyncingPowens,
  handleConnectNewBank,
  isManualSyncing,
  setIsManualSyncing,
  isSyncingData,
  handleSyncPowens,
  hasPendingSync,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging,
  setFileName,
  handleFileUpload,
  transactionsCalculees,
  setTempTransactions,
  confirmBatchImport,
  intelSelectedCat,
  setIntelSelectedCat,
  categoriesPourIntelligence,
  activeCategoryData,
  handleRemoveKeyword,
  handleAddKeyword,
  signType,
  setSignType,
  CustomSelect
}) {
  const [isOpen, setIsOpen] = useState(false);

  const isInternalTransfer = (cat) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c.includes("vers") || c.includes("transfert") || c.startsWith("🔄") || c.startsWith("virement :");
  };

  const unsyncedAccounts = Object.entries(syncCountByAccount || {}).filter(([_, data]) => {
    const count = typeof data === 'object' ? data?.count : Number(data);
    return count > 0;
  });

  const isExecuting = isManualSyncing || isSyncingData || isCheckingSync;

  return (
    <div className="hidden lg:flex flex-col animate-in fade-in duration-500 h-[calc(100vh-120px)] px-4">
      <div className="flex flex-col lg:flex-row gap-8 items-stretch">
        
        {/* COLONNE GAUCHE : IMPORTATION & RÉCAPITULATIF */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Header Section */}
          <div className="flex items-center gap-3 px-2 shrink-0">
            <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
              <Upload size={16} className="text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-[12px]">
                Gestion des flux
              </h3>
              <p className="text-[8px] text-[var(--text-main)]/20 font-bold uppercase tracking-tighter">
                Importation et validation
              </p>
            </div>
          </div>

          {/* 1. Zone de configuration & Sélecteur */}
          <div className="flex flex-col gap-3 shrink-0 max-w-2xl">
            <div className="flex items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <CustomSelect 
                  label="Compte de destination"
                  value={importCompte || comptes[0]?.compte} 
                  icon={Wallet} 
                  options={comptes.map(c => ({ v: c.compte, l: c.compte }))} 
                  onChange={(val) => setImportCompte(val)} 
                />
              </div>
              <HelpPopover />
            </div>

            {/* Association Powens pliable */}
            {powensData?.connections && powensData.connections.length > 0 && (
              <div className="relative z-50 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex-1 flex items-center justify-between bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-2xl p-3 text-[10px] uppercase font-bold text-[var(--text-main)]/50 hover:text-[var(--text-main)] transition-all select-none cursor-pointer"
                  >
                    <span className="flex items-center gap-2 truncate pr-2">
                      <Building2 size={12} className="text-[var(--primary)] shrink-0" />
                      <span className="truncate">
                        Association de vos comptes en banque réels & ceux sur Kleea ({powensData?.accounts_count || 0})
                      </span>
                    </span>
                    <span className={`text-[8px] opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleForceRefreshPowens}
                    disabled={isRefreshingPowens || isCheckingSync}
                    className={`p-3 rounded-2xl border flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 ${
                      isRefreshingPowens || isCheckingSync
                        ? 'bg-[var(--primary)]/15 border-[var(--primary)]/30 text-[var(--primary)] cursor-wait'
                        : 'bg-white/[0.02] border-white/5 hover:border-white/15 hover:bg-white/[0.05] text-[var(--text-main)]/60 hover:text-white'
                    }`}
                    title="Forcer la vérification et l'actualisation des comptes Powens"
                  >
                    <RefreshCw 
                      size={12} 
                      className={`shrink-0 text-[var(--primary)] ${
                        (isRefreshingPowens || isCheckingSync) ? 'animate-spin' : ''
                      }`} 
                    />
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                      {isRefreshingPowens || isCheckingSync ? 'Actualisation...' : 'Actualiser'}
                    </span>
                  </button>
                </div>

                {isOpen && (
                  <div className="absolute top-full mt-2 w-full bg-[#18181a] border border-white/10 rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar">
                      {powensData.connections.map((conn) => {
                        const connAccounts = powensData.accounts?.filter(
                          (acc) => acc.connection_id === conn.id || acc.bank_name === conn.connector_name
                        ) || [];

                        if (connAccounts.length === 0) return null;

                        return (
                          <div key={conn.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-[9px] font-black text-[var(--primary)] uppercase px-1 border-b border-white/5 pb-1">
                              <span>{conn.connector_name}</span>
                              <span className="text-[7px] text-[var(--text-main)]/30">ID: {conn.id}</span>
                            </div>
                            
                            <div className="space-y-1">
                              {connAccounts.map((acc) => {
                                const associatedLocalAccount = comptes?.find(
                                  (c) => (c.powens_name || "").trim().toUpperCase() === (acc.name || "").trim().toUpperCase()
                                );
                                const isAssociated = Boolean(associatedLocalAccount);
                                const siteAccountName = associatedLocalAccount ? associatedLocalAccount.compte : acc.name;
                                const isDesynced = Boolean(
                                  syncCountByAccount[siteAccountName] || syncCountByAccount[acc.name]
                                );

                                const selectOptions = [
                                  { v: "", l: "-- Aucun --" },
                                  ...(comptes?.map((c) => ({ v: c.compte, l: c.compte })) || [])
                                ];

                                return (
                                  <div key={acc.id} className="flex flex-col gap-1.5 py-2 px-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <div className="flex items-center gap-2 truncate pr-2">
                                        <span className="text-[var(--text-main)] font-semibold truncate">{acc.name}</span>
                                        {!isAssociated ? (
                                          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400/80 border border-amber-500/20 text-[7px] font-black uppercase tracking-wider shrink-0">
                                            Non lié
                                          </span>
                                        ) : isDesynced ? (
                                          <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[7px] font-black uppercase tracking-wider animate-pulse shrink-0 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-rose-400 animate-ping" />
                                            Nouvelles Transactions
                                          </span>
                                        ) : (
                                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[7px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400" />
                                            Synchronisé
                                          </span>
                                        )}
                                      </div>

                                      <span className="font-bold text-[var(--text-main)] shrink-0">
                                        {acc.balance !== null && acc.balance !== undefined 
                                          ? `${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${acc.currency}` 
                                          : "—"}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                                      <span className="text-[8px] uppercase tracking-wider text-[var(--text-main)]/40 font-bold shrink-0">
                                        Lié à :
                                      </span>
                                      <div className="w-full">
                                        <CustomSelect
                                          value={associatedLocalAccount ? associatedLocalAccount.compte : ""}
                                          options={selectOptions}
                                          onChange={(selectedVal) => handleAssociateAccount?.(acc.name, selectedVal)}
                                          className="px-2 py-1 rounded-lg text-[5px]"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. BLOC D'IMPORTATION : 3 BOUTONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
            {/* ACTION 1 : NOUVELLE BANQUE */}
            <div 
              onClick={!isSyncingPowens ? handleConnectNewBank : undefined}
              title="Ajouter une banque via Powens"
              className={`
                rounded-[2rem] p-4 flex items-center gap-3 border transition-all duration-500 cursor-pointer overflow-hidden min-h-[80px]
                ${isSyncingPowens 
                  ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_0_25px_rgba(var(--primary-rgb),0.15)]' 
                  : 'bg-white/[0.01] backdrop-blur-[var(--glass-blur)] border-white/10 hover:bg-[var(--glass-bg)] hover:border-[var(--primary)]/40'}
              `}
            >
              <div className={`p-3 rounded-xl transition-all duration-500 shrink-0 ${isSyncingPowens ? 'bg-[var(--primary)] text-black animate-spin' : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]'}`}>
                {isSyncingPowens ? <RefreshCw size={18} /> : <Plus size={18} />}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text-main)]">Connecter un compte</h3>
                <p className="text-[8px] text-[var(--text-main)]/30 font-bold uppercase tracking-widest truncate">Nouvelle banque</p>
              </div>
            </div>

            {/* ACTION 2 : SYNCHRONISER (LAYOUT GAUCHE / DROITE EXACT D'ORIGINE) */}
            {(() => {
              const unsyncedAccounts = Object.entries(syncCountByAccount || {}).filter(
                ([_, data]) => {
                  const count = typeof data === 'object' ? data?.count : Number(data);
                  return count > 0;
                }
              );

              const isExecuting = isManualSyncing || isSyncingData || isCheckingSync;

              const handleClick = async () => {
                if (isExecuting) return;
                if (setIsManualSyncing) setIsManualSyncing(true);
                try {
                  if (handleSyncPowens) {
                    await handleSyncPowens(); // 👈 Appel sans argument (évite d'injecter l'événement React)
                  }
                } finally {
                  if (setIsManualSyncing) setIsManualSyncing(false);
                }
              };

              return (
                <div 
                  onClick={handleClick}
                  className={`
                    relative rounded-[2rem] p-4 flex items-center gap-3 border transition-all duration-500 cursor-pointer overflow-hidden min-h-[85px]
                    ${hasPendingSync 
                      ? 'bg-[var(--primary)]/10 border-[var(--primary)] shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' 
                      : isExecuting 
                        ? 'bg-[var(--primary)]/10 border-[var(--primary)] cursor-wait' 
                        : 'bg-white/[0.01] backdrop-blur-[var(--glass-blur)] border-white/10 hover:bg-[var(--glass-bg)] hover:border-[var(--primary)]/40'}
                  `}
                >
                  {/* Pastille clignotante */}
                  {hasPendingSync && !isExecuting && (
                    <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-lg" />
                    </span>
                  )}

                  {/* Icône animée */}
                  <div className={`p-3 rounded-xl transition-all duration-500 shrink-0 ${
                    isExecuting 
                      ? 'bg-[var(--primary)] text-black animate-spin' 
                      : hasPendingSync 
                        ? 'bg-[var(--primary)] text-black' 
                        : 'bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)]'
                  }`}>
                    {isExecuting ? <RefreshCw size={18} /> : <Download size={18} />}
                  </div>

                  {/* Conteneur gauche / droite */}
                  <div className="flex items-center justify-between gap-3 min-w-0 flex-1 pr-1">
                    <div className="flex flex-col shrink-0">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--text-main)] leading-tight">
                        Synchroniser
                      </h3>
                      
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${
                        isExecuting 
                          ? 'text-[var(--primary)] font-black animate-pulse'
                          : hasPendingSync 
                            ? 'text-rose-400 font-black animate-pulse' 
                            : 'text-emerald-400/80 font-bold'
                      }`}>
                        {isExecuting 
                          ? 'En cours...' 
                          : hasPendingSync 
                            ? 'Nouvelles Transactions' 
                            : 'Données Powens'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0 pl-3 flex-1">
                      {isExecuting ? (
                        <span className="text-[8px] font-black text-[var(--primary)] uppercase tracking-wider animate-pulse">
                          Actualisation...
                        </span>
                      ) : hasPendingSync && unsyncedAccounts.length > 0 ? (
                        unsyncedAccounts.map(([accName, data]) => {
                          const count = typeof data === 'object' ? data.count : data;
                          return (
                            <span 
                              key={accName} 
                              className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/30 text-rose-200 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-sm"
                              title={`${accName} : ${count} nouvelle(s) transaction(s) en attente`}
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
                          Nouvelles Transactions
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                          <span className="whitespace-nowrap">À jour</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ACTION 3 : GLISSER-DÉPOSER UN FICHIER (CSV, OFX, QIF) */}
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => document.getElementById('fileInputDesktop')?.click()}
              className={`
                relative rounded-[2rem] p-4 flex items-center gap-3 border transition-all duration-300 cursor-pointer overflow-hidden min-h-[80px] select-none
                ${isDragging 
                  ? 'bg-indigo-500/20 border-indigo-400 scale-[1.02] shadow-[0_0_30px_rgba(99,102,241,0.3)]' 
                  : transactionsCalculees?.length > 0 
                    ? 'bg-emerald-500/5 border-emerald-500/30' 
                    : 'bg-white/[0.01] backdrop-blur-[var(--glass-blur)] border-white/10 hover:bg-[var(--glass-bg)] hover:border-white/20'}
              `}
            >
              <input 
                type="file" 
                id="fileInputDesktop" 
                className="hidden" 
                accept=".csv,.ofx,.qif,.qfx" 
                onChange={(e) => { 
                  const file = e.target.files?.[0]; 
                  if (file) handleFileUpload(file); 
                }} 
              />
              
              {/* Icône dynamique */}
              <div className={`pointer-events-none p-3 rounded-xl transition-all duration-300 shrink-0 ${
                transactionsCalculees?.length > 0 && !isDragging 
                  ? 'bg-emerald-500 text-black' 
                  : isDragging
                    ? 'bg-indigo-500 text-white animate-bounce'
                    : 'bg-[var(--glass-bg)] border border-white/10 text-[var(--primary)]'
              }`}>
                {transactionsCalculees?.length > 0 && !isDragging ? (
                  <Check size={18} strokeWidth={3} />
                ) : (
                  <Upload size={18} />
                )}
              </div>

              {/* Textes explicites Drag & Drop */}
              <div className="pointer-events-none flex flex-col min-w-0">
                <h3 className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                  isDragging
                    ? 'text-indigo-300'
                    : transactionsCalculees?.length > 0 
                      ? 'text-emerald-400' 
                      : 'text-[var(--text-main)]'
                }`}>
                  {isDragging ? 'Déposez votre fichier ici !' : 'Glisser-Déposer ou Cliquer'}
                </h3>
                
                <p className="text-[8px] text-[var(--text-main)]/40 font-bold uppercase tracking-widest truncate">
                  {transactionsCalculees?.length > 0 
                    ? 'Fichier chargé • Prêt pour validation' 
                    : 'Fichiers CSV, OFX ou QIF'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. RÉCAPITULATIF & TABLEAU DE PRÉVISUALISATION */}
          {transactionsCalculees && transactionsCalculees.length > 0 && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 duration-500 min-h-0 relative">
              <div className="absolute -inset-4 bg-[var(--primary)]/20 blur-[80px] rounded-full pointer-events-none z-0" />

              <div className="flex flex-wrap items-center justify-between gap-4 px-2 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/20 px-3 py-2 rounded-xl flex items-center gap-2 backdrop-blur-[var(--glass-blur)]">
                    <Wallet size={10} className="text-[var(--primary)]" />
                    <span className="text-[7px] font-black uppercase text-[var(--text-main)]/40 tracking-tighter">Vers le compte</span>
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase">
                      {importCompte || comptes[0]?.compte}
                    </span>
                  </div>

                  <div className="w-[1px] h-6 bg-[var(--glass-bg)] mx-1" />

                  {[
                    { 
                      label: "Revenus", 
                      val: transactionsCalculees.filter(t => t.montant > 0 && !isInternalTransfer(t.categorie)).reduce((acc, t) => acc + t.montant, 0), 
                      color: "text-emerald-400" 
                    },
                    { 
                      label: "Dépenses", 
                      val: transactionsCalculees.filter(t => t.montant < 0 && !isInternalTransfer(t.categorie)).reduce((acc, t) => acc + t.montant, 0), 
                      color: "text-rose-400" 
                    },
                    { 
                      label: "Transferts", 
                      val: transactionsCalculees.filter(t => isInternalTransfer(t.categorie)).reduce((acc, t) => acc + Math.abs(t.montant), 0), 
                      color: "text-violet-400" 
                    }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-[var(--glass-bg)] border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2 backdrop-blur-[var(--glass-blur)]">
                      <span className="text-[7px] font-black uppercase text-[var(--text-main)]/20 tracking-tighter">{stat.label}</span>
                      <span className={`text-[10px] font-black ${stat.color}`}>
                        {stat.val.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => { setTempTransactions([]); setFileName(""); }} 
                    className="px-4 py-2.5 text-[9px] font-black text-[var(--text-main)]/20 hover:text-rose-500 transition-all uppercase tracking-widest cursor-pointer"
                  >
                    Annuler
                  </button>
                  
                  {(() => {
                    const nouvellesLignes = transactionsCalculees.filter(t => !t.isAlreadyImported);
                    return (
                      <button 
                        onClick={confirmBatchImport}
                        disabled={nouvellesLignes.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-[var(--text-main)] font-black uppercase text-[9px] rounded-xl hover:scale-105 transition-all shadow-xl shadow-[var(--primary)]/20 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Check size={12} strokeWidth={4} /> Importer {nouvellesLignes.length} nouvelles lignes
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* TABLEAU DE PRÉVISUALISATION */}
              <div className="relative z-10 bg-[#0f0f10]/60 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="max-h-[420px] min-[2000px]:max-h-[750px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0f0f10] z-10 shadow-md">
                      <tr className="border-b border-white/5 text-[9px] text-[var(--text-main)]/80 uppercase font-black bg-white/[0.02]">
                        <th className="p-4">Date</th>
                        <th className="p-4">Désignation</th>
                        <th className="p-4">Catégorie</th>
                        <th className="p-4 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {transactionsCalculees.map((t, i) => {
                        const isTransfert = isInternalTransfer(t.categorie);
                        const isImported = t.isAlreadyImported;

                        return (
                          <tr 
                            key={i} 
                            className={`transition-all group ${
                              isImported 
                                ? 'bg-[var(--primary)]/[0.15] opacity-40 select-none' 
                                : isTransfert
                                  ? 'bg-violet-500/[0.08] hover:bg-violet-500/[0.15]' 
                                  : 'bg-rose-500/[0.08] hover:bg-rose-500/[0.15]'
                            }`}
                          >
                            <td className={`p-4 text-[10px] font-bold ${
                              isTransfert ? 'text-violet-300' : 'text-[var(--text-main)]'
                            }`}>
                              {t.date}
                            </td>
                            
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className={`text-[10px] font-black uppercase max-w-[460px] ${
                                  isTransfert ? 'text-violet-200' : 'text-[var(--text-main)]'
                                }`}>
                                  {t.nom}
                                </div>

                                {t.isPotentialDuplicate && (
                                  <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                                    Doublon #{t.duplicateIndex || 2}
                                  </span>
                                )}

                                {isImported ? (
                                  <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                    Déjà importé
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-300 border border-rose-500/20 shrink-0 flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                                    Nouveau
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <CategoryIcon name={t.categorie} size={14} />
                                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${
                                  isImported
                                    ? 'bg-white/5 text-[var(--text-main)]/30 border-white/5'
                                    : isTransfert 
                                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]' 
                                      : 'bg-[var(--glass-bg)] text-white border-white/10 group-hover:border-white/20'
                                }`}>
                                  {getCleanCategoryName(t.categorie)}
                                </span>
                              </div>
                            </td>

                            <td className={`p-4 text-right font-black text-[11px] ${
                              isImported
                                ? 'text-[var(--text-main)]/20'
                                : isTransfert 
                                  ? 'text-violet-300 font-extrabold' 
                                  : t.montant < 0 
                                    ? 'text-rose-400' 
                                    : 'text-emerald-400'
                            }`}>
                              {t.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : PANNEAU INTELLIGENCE */}
        <div className="w-full lg:w-150 flex flex-col gap-4 shrink-0">
          <div className="flex flex-col gap-1 px-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <Brain size={16} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-[12px]">Intelligence</h3>
            </div>
            <p className="text-[12px] text-[var(--text-main)]/30 font-medium leading-relaxed mt-1 italic">
              Configuration des mots-clés pour la catégorisation automatique.
            </p>
          </div>

          <div className="px-1">
            <CustomSelect 
              label="Cible d'apprentissage"
              value={intelSelectedCat}
              icon={Landmark}
              options={categoriesPourIntelligence.map(cat => ({ v: cat, l: cat }))}
              onChange={(val) => setIntelSelectedCat(val)}
            />
          </div>

          <div className="flex-1 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[3rem] p-8 flex flex-col transition-all shadow-2xl relative overflow-hidden group min-h-[480px]">
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col h-full animate-in fade-in duration-500 relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">Lexique</span>
                  <span className="text-[11px] text-[var(--text-main)]/60 font-bold uppercase truncate pr-4">{intelSelectedCat}</span>
                </div>
                <div className="bg-[var(--glass-bg)] border border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-[12px] font-black text-[var(--primary)]">
                    {activeCategoryData?.mots_cles?.length || 0}
                  </span>
                </div>
              </div>

              {/* LISTE DES MOTS-CLÉS */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
                <div className="flex flex-wrap gap-2.5">
                  {activeCategoryData?.mots_cles?.map((keyword, kIdx) => {
                    const [keywordText, rawSign] = keyword.split(':');
                    const sign = rawSign || 'both';

                    return (
                      <div 
                        key={kIdx} 
                        className="group flex items-center gap-3 px-4 py-2 bg-white/[0.05] border border-white/10 rounded-2xl text-[10px] font-bold text-[var(--text-main)]/70 uppercase hover:bg-[var(--primary)] hover:text-black transition-all"
                      >
                        <span className="flex items-center gap-2">
                          {keywordText.replace(/"/g, '')}
                          {sign === "positive" && <ArrowUpRight size={12} className="text-emerald-500 stroke-[3px]" title="Crédits uniquement" />}
                          {sign === "negative" && <ArrowDownLeft size={12} className="text-rose-500 stroke-[3px]" title="Débits uniquement" />}
                          {sign === "both" && <ArrowRightLeft size={11} className="text-[var(--text-main)]/40 stroke-[3px]" title="Tous montants" />}
                        </span>
                        <button 
                          onClick={() => handleRemoveKeyword(intelSelectedCat, keyword)} 
                          className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AJOUT DE MOT-CLÉ */}
              <div className="mt-auto flex flex-col gap-4 relative">
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.15em] pl-1">
                    Filtrer l'apprentissage sur :
                  </span>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setSignType("both")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        signType === "both" 
                          ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)]" 
                          : "bg-transparent border-white/10 text-[var(--text-main)]/40 hover:text-[var(--text-main)]"
                      }`}
                    >
                      <ArrowRightLeft size={11} className="stroke-[2.5px]" />
                      Tous montants
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSignType("positive")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        signType === "positive" 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" 
                          : "bg-transparent border-white/10 text-[var(--text-main)]/40 hover:text-[var(--text-main)]"
                      }`}
                    >
                      <ArrowUpRight size={11} className="stroke-[2.5px]" />
                      Positifs
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSignType("negative")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        signType === "negative" 
                          ? "bg-rose-500/10 border-rose-500/50 text-rose-400" 
                          : "bg-transparent border-white/10 text-[var(--text-main)]/40 hover:text-[var(--text-main)]"
                      }`}
                    >
                      <ArrowDownLeft size={11} className="stroke-[2.5px]" />
                      Négatifs
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Nouvel apprentissage..."
                    className="w-full bg-black/40 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-[1.5rem] pl-6 pr-14 py-5 text-[11px] text-[var(--text-main)] font-black uppercase focus:outline-none focus:border-[var(--primary)]/50 transition-all placeholder:text-[var(--text-main)]/10"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleAddKeyword(intelSelectedCat, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)]/10 rounded-xl pointer-events-none">
                    <Plus size={16} className="text-[var(--primary)]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}