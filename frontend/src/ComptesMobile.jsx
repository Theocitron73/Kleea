import React, { useState } from 'react';
import { 
  Pencil, Trash2, Wand2, Plus, X, Wallet, CreditCard, Building2, 
  Sparkles, ShieldCheck, Lock, FileUp, Landmark 
} from 'lucide-react';
import { SketchPicker } from 'react-color';

export default function ComptesMobile(props) {
  const {
    comptes = [], setComptes, handleAddCompte,
    selectedType, setSelectedType, typeOptions,
    compteName, setCompteName,
    newCompteColor, setNewCompteColor,
    showAddPicker, setShowAddPicker,
    showPicker, setShowPicker,
    handleBlurUpdate, openDeleteModal, openCalculateurAssistant, handleColorChange,
    CustomSelect,
    importMode, powensData, handleAssociateAccount,
    creationPowensName: propCreationPowensName,
    setCreationPowensName: propSetCreationPowensName,
    handleConnectNewBank
  } = props;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [localCreationPowensName, setLocalCreationPowensName] = useState("");

  const creationPowensName = propCreationPowensName !== undefined ? propCreationPowensName : localCreationPowensName;
  const setCreationPowensName = propSetCreationPowensName || setLocalCreationPowensName;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2 select-none">
      
      {/* 1. EN-TÊTE & COMPTEUR MOBILE */}
      <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight">Mes Comptes</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">
            Configuration des soldes
          </p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-xl uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          {comptes.length} actifs
        </span>
      </div>

      {/* 2. BOUTON D'OUVERTURE DE LA MODALE DE CRÉATION */}
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all shrink-0 mb-4 cursor-pointer"
      >
        <Plus size={14} strokeWidth={3} />
        <span>Créer un nouveau compte</span>
      </button>

      {/* =========================================================================
          3. MODALE MOBILE DE CRÉATION DE COMPTE (AVEC TOUTES LES OPTIONS DESKTOP)
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsCreateModalOpen(false)} />

          <div 
            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header de la modale */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest leading-none">
                  Nouveau compte
                </h4>
                <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mt-1">
                  Saisie des informations de départ
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                handleAddCompte(e);
                setIsCreateModalOpen(false);
              }} 
              className="space-y-3.5"
            >
              {/* Type de compte */}
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Type de compte</label>
                <CustomSelect 
                  value={selectedType}
                  options={typeOptions}
                  onChange={(type) => {
                    setSelectedType(type);
                    if (type) setCompteName("");
                  }}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer bg-black/40 border-white/10"
                />
              </div>

              {/* Désignation */}
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation du compte</label>
                <div className="flex items-center w-full h-[38px] bg-black/40 px-3 rounded-xl border border-white/10 focus-within:border-white/30 transition-colors">
                  {selectedType && (
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase mr-1.5 shrink-0 select-none">
                      {selectedType} -
                    </span>
                  )}
                  <input 
                    type="text" 
                    name="compteName"
                    placeholder={selectedType ? "Ex: PRINCIPAL, COURANT..." : "NOM DU COMPTE..."} 
                    value={compteName}
                    onChange={(e) => setCompteName(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-white uppercase placeholder:text-white/30" 
                    required 
                  />
                </div>
              </div>

              {/* Groupe & Solde */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Groupe</label>
                  <input 
                    type="text" 
                    name="compteGroupe"
                    placeholder="PERSO, COMMUN..." 
                    className="w-full h-[38px] bg-black/40 border border-white/10 rounded-xl px-3 text-xs font-bold text-white uppercase outline-none placeholder:text-white/30" 
                    required 
                  />
                </div>

                {(() => {
                  const isAutoCCP = importMode === 'auto' && selectedType === 'CCP';
                  return (
                    <div>
                      <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Solde de départ</label>
                      <div className={`flex items-center rounded-xl border px-3 h-[38px] transition-all ${
                        isAutoCCP 
                          ? 'bg-white/[0.03] border-white/5 opacity-40 cursor-not-allowed select-none' 
                          : 'bg-black/40 border-white/10 focus-within:border-white/20'
                      }`}>
                        <input 
                          type="number" 
                          step="0.01" 
                          name="compteSolde"
                          disabled={isAutoCCP}
                          placeholder={isAutoCCP ? "Auto" : "0.00"} 
                          className="w-full bg-transparent border-none outline-none text-xs font-mono font-bold text-right text-white" 
                        />
                        <span className="text-[9px] font-bold text-white/30 ml-1 select-none">€</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Taux d'intérêt & Teinte */}
              <div className={`grid gap-3 items-end ${selectedType !== 'CCP' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {selectedType !== 'CCP' && (
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Taux d'intérêts %</label>
                    <div className="flex items-center bg-black/40 rounded-xl border border-white/10 px-3 h-[38px]">
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        max="100" 
                        name="compteTaux"
                        placeholder="Ex: 3.00" 
                        className="w-full bg-transparent border-none outline-none text-xs font-mono font-bold text-right text-white placeholder:text-white/30" 
                      />
                      <span className="text-[9px] font-bold text-white/30 ml-1 select-none">%</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 h-[38px] justify-between relative">
                  <span className="text-[8px] font-black text-white/40 uppercase pl-1">Teinte carte</span>
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(!showAddPicker)}
                    className="p-0.5 bg-white/10 rounded-lg border border-white/20 active:scale-95 transition-transform cursor-pointer"
                  >
                    <div className="w-8 h-5 rounded shadow-inner" style={{ backgroundColor: newCompteColor }} />
                  </button>

                  {showAddPicker && (
                    <div className="absolute z-[10001] bottom-full mb-2 right-0 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                      <div className="fixed inset-0" onClick={() => setShowAddPicker(false)} />
                      <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                        <SketchPicker color={newCompteColor} onChange={(color) => setNewCompteColor(color.hex)} disableAlpha />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Liaison Compte Réel / Powens / IBAN */}
              {(importMode === 'auto' || (powensData?.accounts && powensData.accounts.length > 0) || Boolean(localStorage.getItem('powens_user_token'))) && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[9px] uppercase font-black text-white/40 block">
                    Liaison Compte Réel / Powens (Optionnel)
                  </label>
                  
                  {powensData?.accounts?.length > 0 && (
                    <CustomSelect
                      value=""
                      options={[
                        { v: "", l: "🏦 Lier un compte Powens..." },
                        ...powensData.accounts.map(acc => ({
                          v: acc.name,
                          l: `${acc.bank_name ? `[${acc.bank_name}] ` : ''}${acc.name} (${acc.balance}€)`
                        }))
                      ]}
                      onChange={(val) => {
                        if (val) setCreationPowensName(val);
                      }}
                      icon={Building2}
                      className="p-2 rounded-xl text-[9px] font-bold bg-black/40 border-white/10"
                    />
                  )}

                  <input
                    type="text"
                    name="creationPowensInput"
                    placeholder="Ou coller un IBAN (ex: FR49...)"
                    value={creationPowensName}
                    onChange={(e) => setCreationPowensName(e.target.value.toUpperCase())}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white uppercase outline-none placeholder:text-white/30"
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all mt-3 shadow-lg cursor-pointer"
              >
                Confirmer et Créer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. LISTE DES COMPTES OU GUIDES COMPLETS (EXACT DUPLICATA DU DESKTOP)
          ========================================================================= */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-12">
        {comptes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {comptes.sort((a, b) => a.compte.localeCompare(b.compte)).map((c, i) => {
              const isCCP = (c.compte || "").toUpperCase().includes("CCP");

              return (
                <div 
                  key={c.compte} 
                  className="relative p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-3.5 backdrop-blur-md transition-all duration-300"
                  style={{ 
                    backgroundColor: `${c.couleur}80`,
                    zIndex: showPicker === i ? 100 : 10
                  }}
                >
                  {/* Ligne 1 : Nom, Groupe, Teinte, Suppression */}
                  <div className="flex justify-between items-start relative">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="text-xs font-black text-white uppercase truncate tracking-tight mb-1">{c.compte}</h3>
                      
                      <div className="flex items-center gap-1.5 bg-black/40 w-fit px-2.5 py-1 rounded-lg border border-white/10">
                        <Pencil size={8} className="text-[var(--primary)]" />
                        <input 
                          className="bg-transparent text-[8px] font-black text-white uppercase tracking-wider outline-none w-24"
                          value={c.groupe}
                          onChange={(e) => {
                            const newComptes = [...comptes];
                            newComptes[i].groupe = e.target.value;
                            setComptes(newComptes);
                          }}
                          onBlur={() => handleBlurUpdate(c)}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 items-center shrink-0">
                      <div className="relative">
                        <button 
                          type="button"
                          onClick={() => setShowPicker(showPicker === i ? null : i)}
                          className="w-6 h-6 rounded-lg border border-white/50 shadow-md active:scale-90 transition-all cursor-pointer"
                          style={{ backgroundColor: c.couleur }}
                        />
                        {showPicker === i && (
                          <div className="absolute z-[1000] right-0 mt-2 animate-in zoom-in-95 fade-in duration-200">
                            <div className="fixed inset-0" onClick={() => setShowPicker(null)} />
                            <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                              <SketchPicker color={c.couleur} onChange={(color) => handleColorChange(i, color)} disableAlpha />
                            </div>
                          </div>
                        )}
                      </div>

                      <button 
                        type="button"
                        onClick={() => openDeleteModal(c.compte)} 
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 active:scale-95 cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2 : Métriques (1 colonne si CCP, 3 colonnes sinon) */}
                  <div className={`grid gap-2 text-center ${isCCP ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    
                    {/* Solde Initial */}
                    {/* 🟢 NOUVEAU SOLDE INITIAL : AJUSTEMENT DESIGN INTELLIGENT */}
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1 gap-1">
                        <span className="text-[7.5px] font-black text-white/40 uppercase tracking-wider truncate">
                          Solde initial
                        </span>
                        
                        {/* Bouton adaptatif : icône seule en 3 colonnes, icône + texte en pleine largeur */}
                        <button 
                          type="button"
                          onClick={() => openCalculateurAssistant(c)} 
                          className={`flex items-center gap-1 rounded-md transition-all active:scale-95 cursor-pointer shrink-0 ${
                            isCCP 
                              ? 'px-2 py-0.5 bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 hover:text-white' 
                              : 'p-1 bg-white/5 hover:bg-white/10 border border-white/10 text-indigo-300 hover:text-white'
                          }`}
                          title="Ajuster avec l'assistant de solde"
                        >
                          <Wand2 size={isCCP ? 9 : 10} className="text-indigo-400 shrink-0" />
                          {isCCP && (
                            <span className="text-[7.5px] font-bold uppercase tracking-wider">
                              Ajuster
                            </span>
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-center">
                        <input 
                          type="text"
                          className="bg-transparent text-xs font-mono font-black text-white outline-none w-full text-center"
                          value={c.solde}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (/^[0-9.,-]*$/.test(val) || val === "") {
                              const newComptes = [...comptes];
                              newComptes[i].solde = val;
                              setComptes(newComptes);
                            }
                          }}
                          onBlur={() => {
                            let finalValue = c.solde;
                            if (typeof finalValue === 'string') finalValue = finalValue.replace(',', '.').trim();
                            const numericValue = parseFloat(finalValue);
                            const newComptes = [...comptes];
                            if (!isNaN(numericValue)) {
                              const roundedValue = Math.round(numericValue * 100) / 100;
                              newComptes[i].solde = roundedValue;
                              setComptes(newComptes);
                              handleBlurUpdate({ ...c, solde: roundedValue });
                            } else {
                              newComptes[i].solde = 0;
                              setComptes(newComptes);
                              handleBlurUpdate({ ...c, solde: 0 });
                            }
                          }}
                        />
                        <span className="text-[9px] font-bold text-white/20 shrink-0">€</span>
                      </div>
                    </div>
                    
                    {/* Objectif & Intérêts (masqués si CCP) */}
                    {!isCCP && (
                      <>
                        <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <p className="text-[7px] font-black text-white/40 uppercase mb-1">Objectif</p>
                          <div className="flex items-center justify-center">
                            <input 
                              type="text"
                              className="bg-transparent text-xs font-mono font-black text-white/70 outline-none w-full text-center"
                              value={c.objectif}
                              onChange={(e) => {
                                const newComptes = [...comptes];
                                newComptes[i].objectif = parseFloat(e.target.value) || 0;
                                setComptes(newComptes);
                              }}
                              onBlur={() => handleBlurUpdate(c)}
                            />
                            <span className="text-[9px] font-bold text-white/20 shrink-0">€</span>
                          </div>
                        </div>

                        <div className="bg-black/20 p-1.5 rounded-xl border border-white/5 flex flex-col justify-between">
                          <p className="text-[7px] font-black text-white/40 uppercase mb-1">Intérêt %</p>
                          <div className="flex items-center justify-center">
                            <input 
                              type="number"
                              step="0.05"
                              min="0"
                              max="100"
                              className="bg-transparent text-xs font-mono font-black text-white outline-none w-full text-center"
                              value={c.taux || ""}
                              onChange={(e) => {
                                const newComptes = [...comptes];
                                newComptes[i].taux = parseFloat(e.target.value) || 0;
                                setComptes(newComptes);
                              }}
                              onBlur={() => handleBlurUpdate(c)}
                            />
                            <span className="text-[9px] font-bold text-white/20 shrink-0">%</span>
                          </div>
                        </div>
                      </>
                    )}

                  </div>

                  {/* Ligne 3 : Liaison bancaire / Powens / IBAN */}
                  {(importMode === 'auto' || (powensData?.accounts && powensData.accounts.length > 0) || Boolean(c.powens_name)) && (
                    <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 relative z-20">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                          <Building2 size={10} className="text-[var(--primary)]" /> Liaison pour synchronisation
                        </span>
                      </div>

                      {(() => {
                        const isLinkedToPowens = (powensData?.accounts || []).some(
                          acc => acc.name.trim().toUpperCase() === (c.powens_name || "").trim().toUpperCase()
                        );
                        const isManualIban = !isLinkedToPowens && Boolean(c.powens_name);

                        if (isLinkedToPowens) {
                          return (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 shadow-[0_0_8px_#34d399]" />
                                <div className="flex flex-col truncate">
                                  <span className="text-[9.5px] font-black text-emerald-300 uppercase truncate">
                                    {c.powens_name}
                                  </span>
                                  <span className="text-[7px] text-emerald-400/60 font-bold uppercase tracking-wider">
                                    Banque connectée
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAssociateAccount("", c.compte)}
                                className="px-2 py-1 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-white/40 text-[8px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer"
                              >
                                Délier
                              </button>
                            </div>
                          );
                        }

                        if (isManualIban) {
                          return (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                              <div className="flex items-center gap-2 truncate pr-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 shadow-[0_0_8px_#818cf8]" />
                                <div className="flex flex-col truncate">
                                  <span className="text-[9px] font-mono font-bold text-indigo-200 truncate uppercase">
                                    {c.powens_name}
                                  </span>
                                  <span className="text-[7px] text-indigo-400/60 font-bold uppercase tracking-wider">
                                    IBAN manuel enregistré
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...c, powens_name: null };
                                  handleBlurUpdate(updated);
                                }}
                                className="px-2 py-1 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 text-white/40 text-[8px] font-bold uppercase rounded-lg transition-all shrink-0 cursor-pointer"
                              >
                                Retirer
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="flex flex-col gap-1.5 pt-0.5">
                            {powensData?.accounts?.length > 0 && (
                              <CustomSelect
                                value=""
                                options={[
                                  { v: "", l: "🏦 Lier un compte Powens..." },
                                  ...powensData.accounts.map(acc => ({
                                    v: acc.name,
                                    l: `${acc.bank_name ? `[${acc.bank_name}] ` : ''}${acc.name} (${acc.balance}€)`
                                  }))
                                ]}
                                onChange={(selectedValue) => {
                                  if (selectedValue) handleAssociateAccount(selectedValue, c.compte);
                                }}
                                icon={Building2}
                                className="p-1.5 px-2.5 rounded-lg text-[8.5px] bg-black/40 border-white/5 cursor-pointer hover:border-[var(--primary)]/40 transition-colors"
                              />
                            )}

                            {powensData?.accounts?.length > 0 && (
                              <div className="flex items-center gap-2 px-1 my-0.5">
                                <div className="h-px flex-1 bg-white/5" />
                                <span className="text-[7px] font-black uppercase text-white/20 tracking-widest">OU</span>
                                <div className="h-px flex-1 bg-white/5" />
                              </div>
                            )}

                            <input
                              type="text"
                              placeholder="Coller l'IBAN si compte non connecté (ex: FR49...)"
                              defaultValue=""
                              onBlur={(e) => {
                                const val = e.target.value.trim().toUpperCase();
                                if (val) {
                                  const updated = { ...c, powens_name: val };
                                  handleBlurUpdate(updated);
                                }
                              }}
                              className="w-full bg-black/40 border border-white/5 focus:border-[var(--primary)]/50 rounded-lg px-2.5 py-1.5 text-[8.5px] font-mono text-white placeholder:text-white/20 outline-none transition-all uppercase"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        ) : (
          /* =========================================================================
              5. GUIDES EXPLICATIFS COMPLETS (EXACT DUPLICATA DU DESKTOP POUR MOBILE)
              ========================================================================= */
          importMode === 'auto' ? (
            <div className="flex flex-col items-center justify-center text-center p-5 bg-indigo-500/[0.03] border border-indigo-500/20 rounded-2xl backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Sparkles size={24} className="text-indigo-400 animate-pulse" />
              </div>

              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">
                  Configuration de vos comptes virtuels
                </h3>
                <p className="text-[8.5px] text-white/40 uppercase font-bold tracking-wider mt-0.5">
                  Synchronisation bancaire & bilans annuels
                </p>
              </div>

              {/* Pourquoi un compte miroir ? */}
              <div className="w-full text-left p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1">
                <h4 className="text-[9px] font-black uppercase text-white/90 tracking-wider">
                  Pourquoi créer un compte virtuel ?
                </h4>
                <p className="text-[10px] text-white/70 leading-relaxed">
                  Même si votre banque réelle est connectée, Kleea a besoin d’un <strong className="text-white">compte virtuel local</strong> (ex : <i>« CCP »</i> ou <i>« Livret A »</i>) pour stocker vos écritures et calculer vos bilans.
                </p>
              </div>

              {/* Étape 1 : CCP */}
              <div className="w-full text-left p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border border-indigo-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">
                    1. Lier votre compte courant (CCP)
                  </h4>
                  <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[7px] font-black uppercase">
                    1 clic
                  </span>
                </div>
                <p className="text-[10px] text-white/80 leading-relaxed">
                  Sélectionnez simplement votre compte bancaire dans la liste déroulante Powens lors de la création du compte.
                </p>
              </div>

              {/* Étape 2 : Livrets IBAN */}
              <div className="w-full text-left p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                    2. Pour vos livrets d'épargne (Livret A, LEP...)
                  </h4>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[7px] font-black uppercase">
                    IBAN chiffré
                  </span>
                </div>
                <p className="text-[10px] text-white/80 leading-relaxed">
                  Collez simplement l'IBAN ou numéro de compte de votre livret : Kleea classera automatiquement les virements en <strong className="text-white">transferts internes</strong>.
                </p>
                <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-500/20 text-[8px] text-emerald-200/70">
                  <Lock size={10} className="text-emerald-400 shrink-0" />
                  <span>Chiffrement Fernet de bout en bout.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-3 bg-[var(--primary)] text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 cursor-pointer"
              >
                Créer mon premier compte
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-5 bg-white/[0.02] border border-white/10 rounded-2xl backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Wallet size={24} className="text-[var(--primary)]" />
              </div>

              <div>
                <h3 className="text-white font-black text-sm uppercase tracking-wider">
                  Pourquoi créer vos comptes Kleea ?
                </h3>
                <p className="text-[8.5px] text-white/40 uppercase font-bold tracking-wider mt-0.5">
                  Le socle pour analyser vos finances et projeter votre épargne
                </p>
              </div>

              <p className="text-[10px] text-white/70 leading-relaxed text-left bg-black/30 p-3.5 rounded-xl border border-white/5">
                Kleea fonctionne avec des <strong className="text-white">comptes virtuels</strong> (ex: <i>« Compte Courant »</i>, <i>« Livret A »</i>) nécessaires pour rattacher vos opérations et calculer vos bilans.
              </p>

              <div className="grid grid-cols-1 gap-2.5 w-full text-left">
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-1">
                  <h4 className="text-[9px] font-black uppercase text-white/90 tracking-wider">
                    Option 1 : 100% Fichiers CSV
                  </h4>
                  <p className="text-[9.5px] text-white/50 leading-relaxed">
                    Créez vos comptes, puis téléchargez vos fichiers CSV depuis votre banque pour les importer dans l'onglet <i>Importer</i>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 space-y-1">
                  <h4 className="text-[9px] font-black uppercase text-[var(--primary)] tracking-wider">
                    Option 2 : Zéro téléchargement
                  </h4>
                  <p className="text-[9.5px] text-white/70 leading-relaxed">
                    Connectez votre banque en direct pour récupérer vos transactions automatiquement sans jamais manipuler de fichiers CSV.
                  </p>
                  
                  {handleConnectNewBank && (
                    <button
                      type="button"
                      onClick={handleConnectNewBank}
                      className="w-full py-2 bg-[var(--primary)] text-black font-black uppercase text-[8.5px] tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus size={12} strokeWidth={3} />
                      <span>Connecter mes comptes bancaires</span>
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full py-3 bg-white text-black font-black text-[9px] uppercase tracking-widest rounded-xl shadow-lg active:scale-95 cursor-pointer"
              >
                Créer mon premier compte
              </button>
            </div>
          )
        )}
      </div>

    </div>
  );
}