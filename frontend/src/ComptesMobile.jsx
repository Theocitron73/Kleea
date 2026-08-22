import React, { useState } from 'react';
import { Pencil, Trash2, Wand2, Plus, X, Wallet, CreditCard } from 'lucide-react';
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
  } = props;

  // États locaux de navigation mobile
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Gère l'affichage de la modale de création

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

      {/* 💡 BOUTON D'OUVERTURE DE LA MODALE DE CRÉATION */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="w-full py-3.5 bg-[var(--primary)] hover:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-98 transition-all shrink-0 mb-4"
      >
        <Plus size={14} strokeWidth={3} />
        <span>Créer un nouveau compte</span>
      </button>

      {/* 💡 LA FENÊTRE MODALE DE CRÉATION - ENTIÈREMENT CENTRÉE ET EXTÉRIEURE (overflow-visible) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Calque de fond cliquable pour fermer la modale */}
          <div className="absolute inset-0" onClick={() => setIsCreateModalOpen(false)} />

          {/* Conteneur de la Modale */}
          <div 
            /* 💡 CHANGEMENTS : 
               - border et rounded-3xl pour fermer et arrondir la carte sur ses 4 coins
               - overflow-visible pour laisser le SketchPicker s'afficher en dehors sans être coupé 
               - zoom-in-95 pour une transition d'apparition centrée plus naturelle */
            className="relative w-full max-w-md bg-[#121214] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-visible"
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
                setIsCreateModalOpen(false); // Referme automatiquement la modale après l'ajout !
              }} 
              className="space-y-4"
            >
              {/* 1. SELECTION DU TYPE DE COMPTE */}
              <CustomSelect 
                value={selectedType}
                options={typeOptions}
                onChange={(type) => {
                  setSelectedType(type);
                  if (type) {
                    setCompteName(`${type} `);
                  } else {
                    setCompteName("");
                  }
                }}
                icon={CreditCard}
                className="p-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer"
              />

              {/* 2. NOM DU COMPTE (PREFIX LOCKED) */}
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation du compte</label>
                <input 
                  type="text" 
                  name="compteName"
                  placeholder="Ex: Populaire, Épargne..." 
                  value={compteName}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (selectedType) {
                      const prefix = `${selectedType} `;
                      if (!val.startsWith(prefix)) {
                        val = prefix;
                      }
                    }
                    setCompteName(val);
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none" 
                  required 
                />
              </div>

              {/* 3. GROUPE & SOLDE INITIAL */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Groupe</label>
                  <input 
                    type="text" 
                    name="compteGroupe"
                    placeholder="Ex: PERSO, COMMUN..." 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none" 
                    required 
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Solde de départ</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="compteSolde"
                    placeholder="0.00" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none" 
                  />
                </div>
              </div>

              {/* 4. TAUX D'INTÉRÊTS & TEINTE CARTE */}
              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Taux d'intérêts %</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0" 
                    max="100" 
                    name="compteTaux"
                    placeholder="Ex: 3.00%" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none" 
                  />
                </div>

                {/* Teinte de la carte */}
                <div className="flex items-center gap-2 bg-black/35 border border-white/10 rounded-xl p-2 h-[38px] justify-between relative">
                  <span className="text-[8px] font-black text-white/40 uppercase">Teinte carte</span>
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

              {/* 5. BOUTON ACTION */}
              <button 
                type="submit" 
                className="w-full py-3.5 bg-gradient-to-r from-[var(--primary)] to-indigo-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest active:scale-98 transition-all mt-2 shadow-lg shadow-[var(--primary)]/10"
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
            {comptes.sort((a, b) => a.compte.localeCompare(b.compte)).map((c, i) => (
              <div 
                key={c.compte} 
                /* 💡 AJOUT CLÉ : z-50 lorsque le picker est actif pour surélever la carte au-dessus des autres */
                className={`relative p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col gap-3.5 backdrop-blur-md transition-all duration-300 ${
                  showPicker === i ? 'z-50' : 'z-10'
                }`}
                style={{ 
                  backgroundColor: `${c.couleur}60`,
                }}
              >
                {/* LIGNE 1 : INFOS ET ACTIONS COULEURS / SUPPRESSION */}
                <div className="flex justify-between items-start relative">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="text-xs font-black text-white uppercase truncate tracking-tight mb-1">{c.compte}</h3>
                    
                    {/* Input d'édition rapide du groupe */}
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

                {/* LIGNE 2 : PARAMÈTRES (SOLDE, OBJECTIF, INTERÊTS) */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  
                  {/* SOLDE INITIAL */}
                  <div className="bg-black/40 p-1.5 rounded-xl border border-white/5 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[7px] font-black text-white/40 uppercase">Solde init.</p>
                      
                      {/* Bouton assistant de solde mis en relief néon tactile */}
                      <button 
                        onClick={() => openCalculateurAssistant(c)} 
                        className="p-1 rounded-lg bg-[var(--primary)]/55 border border-[var(--primary)] text-[var(--text-main)] hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                        title="Ajuster selon un solde à date"
                      >
                        <Wand2 size={11} strokeWidth={2.5} />
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
                  
                  {/* OBJECTIF */}
                  <div className="bg-white/5 p-1.5 rounded-xl border border-white/5 flex flex-col justify-between">
                    <p className="text-[7px] font-black text-white/40 uppercase mb-1">Objectif</p>
                    <div className="flex items-center justify-center">
                      <input 
                        type="number"
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

                </div>
              </div>
            ))}
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