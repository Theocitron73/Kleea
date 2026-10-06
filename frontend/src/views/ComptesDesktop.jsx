import React from 'react';
import { 
  Plus, CreditCard, Building2, Pencil, Trash2, Wand2, Wallet, 
  Sparkles, ShieldCheck, Lock, FileUp, Landmark 
} from 'lucide-react';
import { SketchPicker } from 'react-color';

export default function ComptesDesktop({
  comptes, setComptes, handleAddCompte,
  selectedType, setSelectedType, typeOptions,
  compteName, setCompteName,
  newCompteColor, setNewCompteColor,
  showAddPicker, setShowAddPicker,
  showPicker, setShowPicker,
  handleBlurUpdate, openDeleteModal, openCalculateurAssistant, handleColorChange,
  CustomSelect,
  importMode, powensData, handleAssociateAccount,
  creationPowensName, setCreationPowensName,
  handleConnectNewBank
}) {
  return (
    <div className="hidden lg:flex h-[calc(100vh-140px)] flex-col gap-4 animate-in fade-in duration-500 overflow-hidden">
      
      {/* TITRE & COMPTEUR */}
      <div className="flex items-center gap-3 px-2">
        <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter">Mes Comptes</h2>
        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-[var(--radius)] uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          {comptes.length} actifs
        </span>
      </div>

      {/* FORMULAIRE CONFIGURATION COMPTE */}
      <div className="z-[900] bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] p-3 rounded-[var(--radius)] border border-white/10 shadow-lg">
        <form onSubmit={handleAddCompte} className="flex flex-wrap lg:flex-nowrap items-center gap-2.5">
          
          <div className="flex flex-col border-r border-white/10 pr-3 shrink-0 select-none">
            <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tighter">Nouveau</span>
            <span className="text-[7.5px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest leading-none">Compte</span>
          </div>

          <div className="w-36 shrink-0">
            <CustomSelect 
              value={selectedType}
              options={typeOptions}
              onChange={(type) => setSelectedType(type)}
              icon={CreditCard}
              className="h-[38px] p-2 px-3 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer bg-black/30 border-white/10"
            />
          </div>

          <div className="flex-[1.4] min-w-[160px]">
            <div className="flex items-center w-full h-[38px] bg-black/30 px-3 rounded-xl border border-white/10 focus-within:border-white/30 transition-colors">
              {selectedType && (
                <span className="text-[10px] font-black text-[var(--primary)] uppercase mr-1.5 shrink-0 select-none">
                  {selectedType} -
                </span>
              )}
              <input 
                type="text" 
                name="compteName"
                placeholder={selectedType ? "EX: COURANT, PRINCIPAL..." : "NOM DU COMPTE..."} 
                value={compteName}
                onChange={(e) => setCompteName(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-bold uppercase tracking-wider placeholder:text-white/45" 
                required 
              />
            </div>
          </div>

          <div className="flex-1 min-w-[110px]">
            <input 
              type="text" 
              name="compteGroupe"
              placeholder="GROUPE (PERSO, COMMUN...)" 
              className="w-full h-[38px] bg-black/30 px-3 rounded-xl border border-white/10 outline-none focus:border-white/20 text-[var(--text-main)] text-[10px] font-bold uppercase tracking-wider placeholder:text-[var(--text-main)]/20" 
              required 
            />
          </div>

          {(() => {
            const isAutoCCP = importMode === 'auto' && selectedType === 'CCP';
            return (
              <div className="w-26 shrink-0">
                <div 
                  className={`flex items-center rounded-xl border px-2.5 h-[38px] transition-all ${
                    isAutoCCP 
                      ? 'bg-white/[0.03] border-white/5 opacity-40 cursor-not-allowed select-none' 
                      : 'bg-black/30 border-white/10 focus-within:border-white/20'
                  }`}
                  title={isAutoCCP ? "En mode auto, le solde de départ d'un CCP est calculé automatiquement via Powens" : ""}
                >
                  <input 
                    type="number" 
                    step="0.01" 
                    name="compteSolde"
                    disabled={isAutoCCP}
                    placeholder={isAutoCCP ? "Auto" : "Solde Initial"} 
                    className={`w-full bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-mono font-bold text-right ${
                      isAutoCCP ? 'cursor-not-allowed placeholder:text-white/40' : ''
                    }`} 
                  />
                  <span className="text-[9px] font-bold text-white/30 ml-1 select-none">€</span>
                </div>
              </div>
            );
          })()}

          {selectedType !== "CCP" && (
            <div className="w-20 shrink-0 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center bg-black/30 rounded-xl border border-white/10 px-2.5 h-[38px] focus-within:border-white/20">
                <input 
                  type="number" 
                  step="0.01" 
                  min="0" 
                  max="100" 
                  name="compteTaux"
                  placeholder="Intérêts" 
                  className="w-full bg-transparent border-none outline-none text-[var(--text-main)] text-[10px] font-mono font-bold text-right placeholder:text-[var(--text-main)]/20" 
                />
                <span className="text-[9px] font-bold text-white/30 ml-1 select-none">%</span>
              </div>
            </div>
          )}

          {(importMode === 'auto' || (powensData?.accounts && powensData.accounts.length > 0) || Boolean(localStorage.getItem('powens_user_token'))) && (
            <div className="flex-[1.2] min-w-[170px]">
              <div className="flex items-center gap-1.5 bg-black/30 rounded-xl border border-white/10 px-2.5 h-[38px] focus-within:border-[var(--primary)]/50 transition-colors">
                <Building2 size={12} className="text-[var(--primary)] shrink-0 opacity-60" />
                <input 
                  type="text" 
                  name="creationPowensInput"
                  placeholder="IBAN/N° Compte OU POWENS..." 
                  value={creationPowensName}
                  onChange={(e) => setCreationPowensName(e.target.value.toUpperCase())}
                  className="w-full bg-transparent border-none outline-none text-[var(--text-main)] text-[9.5px] font-mono font-bold uppercase placeholder:text-[var(--text-main)]/20 truncate" 
                />
                {powensData?.accounts?.length > 0 && (
                  <div className="shrink-0">
                    <CustomSelect 
                      value=""
                      options={[
                        { v: "", l: "-- Liste Powens --" },
                        ...powensData.accounts.map(acc => ({
                          v: acc.name,
                          l: `${acc.name} (${acc.balance}€)`
                        }))
                      ]}
                      onChange={(val) => {
                        if (val) setCreationPowensName(val);
                      }}
                      className="p-1 px-2 text-[8px] font-bold bg-white/5 border-white/5 cursor-pointer rounded-lg hover:bg-white/10"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-center gap-0.5 px-2 border-l border-white/10 shrink-0 select-none">
            <button
              type="button"
              onClick={() => setShowAddPicker(!showAddPicker)}
              className="p-0.5 bg-black/40 rounded-lg border border-white/20 hover:scale-110 active:scale-95 transition-transform relative cursor-pointer"
              title="Choisir la couleur"
            >
              <div className="w-6 h-6 rounded-md shadow-inner" style={{ backgroundColor: newCompteColor }} />
            </button>
            <span className="text-[6.5px] font-black text-[var(--text-main)]/30 uppercase">Teinte</span>
          </div>
          
          <button 
            type="submit" 
            className="h-[38px] px-5 bg-white text-black rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-lg active:scale-95 shrink-0 cursor-pointer"
          >
            Créer
          </button>

          {showAddPicker && (
            <div className="absolute z-[1001] top-full mt-2 right-10 shadow-2xl animate-in zoom-in-95">
              <div className="fixed inset-0 cursor-default" onClick={() => setShowAddPicker(false)} />
              <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                <SketchPicker color={newCompteColor} onChange={(color) => setNewCompteColor(color.hex)} disableAlpha />
              </div>
            </div>
          )}
        </form>
      </div>

      {/* GRILLE DE CARTES COMPTES */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
        {comptes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {comptes.sort((a, b) => a.compte.localeCompare(b.compte)).map((c, i) => {
              const isCCP = (c.compte || "").toUpperCase().includes("CCP");

              return (
                <div 
                  key={c.compte} 
                  className={`relative group p-5 rounded-[var(--radius)] border border-white/20 transition-all duration-300 flex flex-col justify-between gap-3 shadow-lg hover:border-white/40 ${showPicker === i ? 'z-50' : 'z-10'}`}
                  style={{ 
                    backgroundColor: `${c.couleur}80`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div className="flex justify-between items-start relative">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-[var(--text-main)] uppercase truncate tracking-tight mb-1">{c.compte}</h3>
                      <div className="flex items-center gap-2 bg-black/40 w-fit px-3 py-1.5 rounded-[var(--radius)] border border-white/10 hover:border-[var(--primary)]/50 transition-colors cursor-text">
                        <Pencil size={10} className="text-[var(--primary)]" />
                        <input 
                          className="bg-transparent text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest outline-none w-28"
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

                    <div className="flex gap-4 items-start">
                      <div className="flex flex-col items-center gap-1.5">
                        <button 
                          onClick={() => setShowPicker(showPicker === i ? null : i)}
                          className="w-7 h-7 rounded-[var(--radius)] border-2 border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-110 transition-transform active:scale-90 cursor-pointer"
                          style={{ backgroundColor: c.couleur }}
                        />
                        <span className="text-[7px] font-black text-[var(--text-main)]/50 uppercase tracking-widest">Couleur</span>
                      </div>

                      <button 
                        onClick={() => openDeleteModal(c.compte)} 
                        className="p-2.5 rounded-[var(--radius)] bg-rose-500/20 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-[var(--text-main)] transition-all duration-300 shadow-xl border border-rose-500/40 cursor-pointer"
                        title="Supprimer le compte"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className={`grid gap-2 ${isCCP ? "grid-cols-1" : "grid-cols-3"}`}>
                    <div className="bg-black/40 backdrop-blur-[var(--glass-blur)] p-2 rounded-[var(--radius)] border border-white/5 shadow-inner relative flex flex-col justify-between">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-[8px] font-black text-[var(--text-main)]/40 uppercase tracking-tighter">Solde initial</p>
                        <button 
                          onClick={() => openCalculateurAssistant(c)} 
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--primary)]/40 border border-[var(--primary)] text-[var(--text-main)] hover:scale-105 active:scale-95 transition-all text-[8px] font-black uppercase tracking-wider cursor-pointer"
                          title="Ajuster le solde de départ"
                        >
                          <Wand2 size={10} strokeWidth={3} />
                          <span>Ajuster</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-0.5">
                        <input 
                          type="text"
                          className="bg-transparent text-xs font-black text-[var(--text-main)] outline-none w-full"
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
                        <span className="text-[10px] font-bold text-[var(--text-main)]/20">€</span>
                      </div>
                    </div>

                    {!isCCP && (
                      <>
                        <div className="bg-[var(--glass-bg)] p-2 rounded-[var(--radius)] border border-white/5 shadow-inner flex flex-col justify-between">
                          <p className="text-[8px] font-black text-[var(--text-main)]/40 uppercase mb-1 tracking-tighter">Objectif d'épargne</p>
                          <div className="flex items-center gap-0.5">
                            <input 
                              type="number"
                              className="bg-transparent text-xs font-black text-[var(--text-main)]/70 outline-none w-full"
                              value={c.objectif}
                              onChange={(e) => {
                                const newComptes = [...comptes];
                                newComptes[i].objectif = parseFloat(e.target.value) || 0;
                                setComptes(newComptes);
                              }}
                              onBlur={() => handleBlurUpdate(c)}
                            />
                            <span className="text-[10px] font-bold text-[var(--text-main)]/20">€</span>
                          </div>
                        </div>

                        <div className="bg-black/20 p-2 rounded-[var(--radius)] border border-emerald-500/10 shadow-inner flex flex-col justify-between">
                          <p className="text-[8px] font-black text-[var(--text-main)]/50 uppercase mb-1 tracking-tighter">Taux intérêts</p>
                          <div className="flex items-center gap-0.5">
                            <input 
                              type="number"
                              step="0.05"
                              min="0"
                              max="100"
                              placeholder="0.00"
                              className="bg-transparent text-xs font-black text-[var(--text-main)] outline-none w-full"
                              value={c.taux || ""}
                              onChange={(e) => {
                                const newComptes = [...comptes];
                                newComptes[i].taux = parseFloat(e.target.value) || 0;
                                setComptes(newComptes);
                              }}
                              onBlur={() => handleBlurUpdate(c)}
                            />
                            <span className="text-[10px] font-black text-[var(--text-main)]/40">%</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {(importMode === 'auto' || (powensData?.accounts && powensData.accounts.length > 0) || Boolean(c.powens_name)) && (
                    <div className="pt-2.5 border-t border-white/10 flex flex-col gap-1.5 relative z-20">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1">
                          <Building2 size={10} className="text-[var(--primary)]" /> Liaison bancaire
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
                                  <span className="text-[10px] font-black text-emerald-300 uppercase truncate">
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
                                  <span className="text-[9.5px] font-mono font-bold text-indigo-200 truncate uppercase">
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
                                  { v: "", l: "🏦 Lier un compte Powens connecté..." },
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
                              placeholder="Coller l'IBAN/N° compte (ex: FR49...)"
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

                  {showPicker === i && (
                    <div className="absolute z-[1000] top-12 right-0 animate-in zoom-in-95 fade-in duration-200">
                      <div className="fixed inset-0 cursor-default" onClick={() => setShowPicker(null)} />
                      <div className="relative border border-white/20 rounded-[var(--radius)] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]">
                        <SketchPicker color={c.couleur} onChange={(color) => handleColorChange(i, color)} disableAlpha />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          importMode === 'auto' ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center p-8 bg-indigo-500/[0.03] border border-indigo-500/20 rounded-[var(--radius)] backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-5">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-32 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                <Sparkles size={28} className="text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-white font-black text-base uppercase tracking-widest">
                  Configuration de vos comptes virtuels Kleea
                </h3>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">
                  Synchronisation bancaire, bilans annuels et projections d'épargne
                </p>
              </div>

              <div className="w-full text-left p-4 rounded-2xl bg-black/40 border border-white/10 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-indigo-300 shrink-0 mt-0.5">
                  <Wallet size={15} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-black uppercase text-white/90 tracking-wider">
                    Pourquoi créer un compte virtuel ?
                  </h4>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    Même si votre banque réelle est connectée, Kleea a besoin d’un <strong className="text-white">compte virtuel local</strong> (ex : <i>« CCP »</i> ou <i>« Livret A »</i>) pour stocker vos écritures, calculer vos bilans mensuels, simuler les intérêts et projeter vos objectifs d’épargne.
                  </p>
                </div>
              </div>

              <div className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-indigo-500/5 to-transparent border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 size={16} className="text-indigo-400 shrink-0" />
                    <h4 className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">
                      1. Lier un compte déjà connecté (Compte Courant / CCP)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[8px] font-black uppercase tracking-widest">
                    En 1 clic
                  </span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Avant toute chose, si votre banque est connectée, il vous suffit de <strong className="text-white underline decoration-indigo-400 decoration-2">sélectionner votre compte dans le menu déroulant tout à droite du formulaire du haut</strong> (le sélecteur <i>« -- Liste Powens -- »</i>).
                </p>
                <p className="text-[10px] text-indigo-200/70 font-medium">
                  👉 Le compte virtuel sera automatiquement associé et vos transactions seront synchronisées en direct.
                </p>
              </div>

              <div className="w-full text-left p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                    <h4 className="text-[11px] font-black uppercase text-emerald-300 tracking-wider">
                      2. Pour vos livrets d'épargne non connectés (Livret A, LEP, LDDS...)
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[8px] font-black uppercase tracking-widest">
                    Zéro mot-clé
                  </span>
                </div>
                <p className="text-[11px] text-white/80 leading-relaxed">
                  Si votre livret n'est pas synchronisé directement, <strong className="text-emerald-300">collez simplement son IBAN ou numéro de compte à la main</strong> dans le champ texte du formulaire.
                </p>
                <p className="text-[10px] text-white/70 leading-relaxed">
                  Grâce à cet IBAN, Kleea reconnaîtra automatiquement tous les virements émis depuis votre compte courant pour les classer en <strong className="text-white">transferts internes</strong>.
                </p>
                <div className="flex items-start gap-2 pt-2 border-t border-emerald-500/20">
                  <Lock size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-emerald-200/70 font-medium leading-normal">
                    <strong className="text-emerald-300">Confidentialité totale :</strong> Vos IBANs sont chiffrés de bout en bout (clé cryptographique <i>Fernet</i>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[9.5px] font-black text-indigo-300 uppercase tracking-widest bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-xl">
                <Plus size={12} strokeWidth={3} /> Utilisez le formulaire ci-dessus pour ajouter votre premier compte !
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center text-center p-8 bg-white/[0.02] border border-white/10 rounded-[var(--radius)] backdrop-blur-xl relative overflow-hidden shadow-2xl space-y-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[var(--primary)]/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="relative w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-lg">
                <Wallet size={28} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="text-white font-black text-base uppercase tracking-widest">
                  Pourquoi devez-vous créer vos comptes Kleea ?
                </h3>
                <p className="text-[10px] text-white/40 uppercase font-bold tracking-wider mt-1">
                  Le socle indispensable pour analyser vos finances et projeter votre épargne
                </p>
              </div>

              <p className="text-[11px] text-white/70 leading-relaxed max-w-lg text-left bg-black/30 p-4 rounded-2xl border border-white/5">
                Kleea fonctionne avec des <strong className="text-white">comptes virtuels</strong> (ex: <i>« Compte Courant »</i>, <i>« Livret A »</i>). Ils sont indispensables pour rattacher vos transactions, calculer vos bilans mensuels et simuler l'évolution de votre patrimoine dans le temps.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex flex-col justify-between space-y-2">
                  <div className="flex items-center gap-2">
                    <FileUp size={15} className="text-white/60" />
                    <h4 className="text-[10px] font-black uppercase text-white/90 tracking-wider">
                      Option 1 : 100% Fichiers CSV
                    </h4>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    Créez vos comptes avec le formulaire du haut, puis téléchargez depuis le site de votre banque vos fichiers CSV et importez-les dans l'onglet <i>Importer</i>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex flex-col justify-between space-y-2">
                  <div className="flex items-center gap-2">
                    <Landmark size={15} className="text-[var(--primary)]" />
                    <h4 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-wider">
                      Option 2 : Zéro téléchargement
                    </h4>
                  </div>
                  <p className="text-[10px] text-white/70 leading-relaxed">
                    Connectez votre banque en direct pour récupérer vos transactions automatiquement sans jamais avoir à manipuler de fichiers CSV.
                  </p>
                  <button
                    type="button"
                    onClick={handleConnectNewBank}
                    className="w-full py-2 bg-[var(--primary)] hover:brightness-110 text-black font-black uppercase text-[9px] tracking-wider rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                  >
                    <Plus size={12} strokeWidth={3} />
                    <span>Connecter mes comptes bancaires</span>
                  </button>
                </div>
              </div>

              <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest pt-2">
                👉 Utilisez le formulaire ci-dessus pour ajouter votre premier compte
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}