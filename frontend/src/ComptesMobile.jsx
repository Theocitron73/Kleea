import React, { useState } from 'react';
import { Pencil, Trash2, Wand2, Plus, X, Wallet, CreditCard, Building2 } from 'lucide-react';
import { SketchPicker } from 'react-color';

export default function ComptesMobile(props) {
  const {
    comptes, setComptes, handleAddCompte,
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
  } = props;

  // États locaux de navigation mobile
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [localCreationPowensName, setLocalCreationPowensName] = useState("");

  const creationPowensName = propCreationPowensName !== undefined ? propCreationPowensName : localCreationPowensName;
  const setCreationPowensName = propSetCreationPowensName || setLocalCreationPowensName;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2">
      
      {/* HEADER & COMPTEUR MOBILE */}
      <div className="flex items-center justify-between mb-4 mt-2 shrink-0">
        <div>
          <h1 className="text-xl font-black tracking-tight">Mes Comptes</h1>
          <p className="text-[var(--text-main)]/40 text-[9px] font-bold uppercase tracking-wider">Configuration des soldes</p>
        </div>
        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-xl uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          {comptes.length} actifs
        </span>
      </div>

      {/* BOUTON D'OUVERTURE DE LA MODALE DE CRÉATION */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-98 transition-all shrink-0 mb-4"
      >
        <Plus size={14} strokeWidth={3} />
        <span>Créer un nouveau compte</span>
      </button>

      {/* MODALE DE CRÉATION DE COMPTE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsCreateModalOpen(false)} />

          <div 
            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-visible max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest leading-none">Nouveau compte</h4>
                <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider mt-1">Saisie des informations de départ</p>
              </div>
              <button 
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Formulaire de création */}
            <form 
              onSubmit={(e) => {
                handleAddCompte(e);
                setIsCreateModalOpen(false);
              }} 
              className="space-y-3.5"
            >
              {/* 1. SÉLECTION DU TYPE DE COMPTE */}
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Type de compte</label>
                <CustomSelect 
                  value={selectedType}
                  options={typeOptions}
                  onChange={(type) => {
                    setSelectedType(type);
                    if (type) {
                      setCompteName("");
                    }
                  }}
                  icon={CreditCard}
                  className="p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer bg-black/40 border-white/10"
                />
              </div>

              {/* 2. DÉSIGNATION DU COMPTE */}
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
                    placeholder={selectedType ? "Ex: COURANT, PRINCIPAL..." : "NOM DU COMPTE..."} 
                    value={compteName}
                    onChange={(e) => setCompteName(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-xs font-bold text-white uppercase placeholder:text-white/30" 
                    required 
                  />
                </div>
              </div>

              {/* 3. GROUPE & SOLDE INITIAL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Groupe</label>
                  <input 
                    type="text" 
                    name="compteGroupe"
                    placeholder="Ex: PERSO, COMMUN..." 
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

              {/* 4. TAUX D'INTÉRÊTS & TEINTE CARTE */}
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

                {/* Teinte de la carte */}
                <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2 h-[38px] justify-between relative">
                  <span className="text-[8px] font-black text-white/40 uppercase pl-1">Teinte carte</span>
                  <button
                    type="button"
                    onClick={() => setShowAddPicker(!showAddPicker)}
                    className="p-0.5 bg-white/10 rounded-lg border border-white/20 active:scale-95 transition-transform"
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

              {/* 5. LIAISON COMPTE RÉEL / POWENS EN MODE AUTO */}
              {importMode === 'auto' && (
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

              {/* BOUTON ACTION */}
              <button 
                type="submit" 
                className="w-full py-3.5 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-98 transition-all mt-3 shadow-lg"
              >
                Confirmer et Créer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GRILLE DES COMPTES EXISTANTS */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar pb-24">
        {comptes.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {comptes.sort((a, b) => a.compte.localeCompare(b.compte)).map((c, i) => {
              // 🟢 Détection des CCP
              const isCCP = (c.compte || "").toUpperCase().includes("CCP");

              return (
                <div 
                  key={c.compte} 
                  className="relative p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-3.5 backdrop-blur-md transition-all duration-300 focus-within:z-40"
                  style={{ 
                    backgroundColor: `${c.couleur}60`,
                    zIndex: showPicker === i ? 100 : (comptes.length - i) * 5
                  }}
                >
                  {/* LIGNE 1 : INFOS ET ACTIONS */}
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
                      {/* Bouton de teinte */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowPicker(showPicker === i ? null : i)}
                          className="w-6 h-6 rounded-lg border border-white/50 shadow-md active:scale-90 transition-all"
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

                      {/* Bouton Supprimer */}
                      <button 
                        onClick={() => openDeleteModal(c.compte)} 
                        className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 active:scale-95"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* LIGNE 2 : MÉTRIQUES (1 COLONNE POUR CCP, 3 COLONNES POUR LES AUTRES) */}
                  <div className={`grid gap-2 text-center ${isCCP ? 'grid-cols-1' : 'grid-cols-3'}`}>
                    
                    {/* SOLDE INITIAL (Prend toute la largeur si c'est un CCP) */}
                    <div className="bg-black/40 p-2 rounded-xl border border-white/5 flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[7.5px] font-black text-white/40 uppercase">Solde initial</p>
                        
                        <button 
                          onClick={() => openCalculateurAssistant(c)} 
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--primary)]/40 border border-[var(--primary)] text-[var(--text-main)] hover:scale-105 active:scale-95 transition-all text-[8px] font-black uppercase tracking-wider cursor-pointer"
                          title="Ajuster selon un solde à date"
                        >
                          <Wand2 size={10} strokeWidth={2.5} />
                          <span>Ajuster</span>
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
                    
                    {/* OBJECTIF & INTÉRÊT (MASQUÉS POUR LES CCP) */}
                    {!isCCP && (
                      <>
                        {/* OBJECTIF */}
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

                        {/* RENDEMENT D'INTÉRÊT */}
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

                  {/* LIGNE 3 : LIAISON COMPTE RÉEL / IBAN EN MODE AUTO */}
                  {importMode === 'auto' && (
                    <div className="pt-2 border-t border-white/10 flex flex-col gap-1.5 relative z-20">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                          <Building2 size={10} className="text-[var(--primary)]" /> Liaison pour synchronisation
                        </span>
                      </div>

                      {(() => {
                        // 1. Est-il lié à un compte Powens connecté ?
                        const isLinkedToPowens = (powensData?.accounts || []).some(
                          acc => acc.name.trim().toUpperCase() === (c.powens_name || "").trim().toUpperCase()
                        );

                        // 2. Est-il lié via un IBAN manuel ?
                        const isManualIban = !isLinkedToPowens && Boolean(c.powens_name);

                        // CAS 1 : Compte connecté via Powens
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

                        // CAS 2 : Compte avec IBAN manuel enregistré
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

                        // CAS 3 : Non lié -> Choix Powens ou IBAN
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
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
              <Wallet size={20} className="text-white/40" />
            </div>
            <h3 className="text-white/40 font-black text-[10px] uppercase tracking-widest">Aucun compte</h3>
          </div>
        )}
      </div>

    </div>
  );
}