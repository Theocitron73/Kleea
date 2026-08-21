import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import DatePicker from 'react-datepicker';
import { 
  Plus, Edit2, Trash2, CheckCircle, AlertCircle, Smile, FileText, ArrowUpRight, ArrowDownRight, Minus, Share2, Users, Calendar, Tag, X, Wand2
} from 'lucide-react';

export default function TricountMobile(props) {
  const {
    userId, groupes, activeTab, setactiveTab, groupData,
    isModalOpen, setIsModalOpen, newGroupName, setNewGroupName, handleCreateGroup,
    isDeleteModalOpen, setIsDeleteModalOpen, groupToDelete, setGroupToDelete, handleDeleteGroup,
    isEditModalOpen, setIsEditModalOpen, groupToEdit, setGroupToEdit, handleRenameGroup,
    handleDownloadPDF,
    editingTransaction, setEditingTransaction, handleUpdateTransaction,
    deletingId, setDeletingId, executeDelete,
    participantsDuGroupe, updateMontantIndividuel,
    newTransaction, setNewTransaction,
    notification, showToast, handleCreateTransaction,
    totalReparti, resteARepartir, estEquilibre,
    handleAjouterMembreLocal, handleSupprimerMembreLocal,
    activeEmojiPicker, setActiveEmojiPicker, handleSetEmoji, getEmojiForMember,
    shareToken, handleShareGroup
  } = props;

  // Navigation interne mobile
  const [mobileSection, setMobileSection] = useState('bilan'); // 'bilan' | 'ajouter' | 'membres'

  // État local d'édition d'une transaction sur mobile
  const handleOpenEditMobile = (t) => {
    const membres = participantsDuGroupe;
    const montantsInitialises = {};
    membres.forEach(m => montantsInitialises[m] = 0);

    if (t.pour_qui && t.pour_qui.includes(':')) {
      t.pour_qui.split(',').forEach(segment => {
        const [nom, montant] = segment.split(':');
        if (nom && montant) montantsInitialises[nom.trim()] = parseFloat(montant);
      });
    } else {
      const beneficiaires = (t.pour_qui === 'Tous' || !t.pour_qui)
        ? membres 
        : t.pour_qui.split(', ').map(p => p.trim());
      const partEgale = parseFloat((t.montant / (beneficiaires.length || 1)).toFixed(2));
      beneficiaires.forEach(nom => {
        if (membres.includes(nom)) montantsInitialises[nom] = partEgale;
      });
    }

    setEditingTransaction({
      ...t,
      date: t.date.split('T')[0],
      details_montants: montantsInitialises
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-site)] text-[var(--text-main)] pb-24 px-4 pt-2 animate-in fade-in duration-300">
      
      {/* HEADER COMPACT */}
      <div className="flex justify-between items-center mb-4 mt-2 bg-[var(--glass-bg)] border border-white/10 p-3 rounded-2xl shrink-0">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Tricount</h2>
          <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-1">
            {groupes.length} Groupes
          </p>
        </div>
        <div className="flex gap-2">
          {groupes.length > 0 && (
            <button 
              onClick={handleShareGroup}
              className="bg-indigo-600 active:scale-95 text-white p-2.5 rounded-xl flex items-center justify-center transition-all"
              title="Partager ce Tricount"
            >
              <Share2 size={16} />
            </button>
          )}
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[var(--primary)] active:scale-95 text-white p-2.5 rounded-xl flex items-center justify-center transition-all"
          >
            <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* TABS DE GROUPES COMPACTS (SWIPE HORIZONTAL) */}
      <div className="flex gap-2 p-1.5 overflow-x-auto mb-4 shrink-0 no-scrollbar bg-black/20 rounded-2xl border border-white/5 select-none">
        {groupes.map((grp, index) => (
          <button
            key={index}
            onClick={() => setactiveTab(index)}
            className={`py-2 px-5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${
              activeTab === index 
              ? "bg-[var(--glass-bg)] text-[var(--text-main)] border border-white/10 shadow-lg" 
              : "text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60"
            }`}
          >
            {grp.nom}
          </button>
        ))}
      </div>

      {groupes.length > 0 ? (
        <div className="flex flex-col flex-1 min-h-0">
          
          {/* SÉLECTEUR D'ONGLETS SÉCTION TACTILE */}
          <div className="flex border-b border-white/5 mb-4 select-none shrink-0">
            <button 
              onClick={() => setMobileSection('bilan')}
              className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                mobileSection === 'bilan' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Remboursements & Journal
            </button>
            <button 
              onClick={() => setMobileSection('ajouter')}
              className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                mobileSection === 'ajouter' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Ajouter Dépense
            </button>
            <button 
              onClick={() => setMobileSection('membres')}
              className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
                mobileSection === 'membres' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Membres ({participantsDuGroupe.length})
            </button>
          </div>

          {/* =========================================================================
              SOUS-ONGLET 1 : REMBOURSEMENTS & JOURNAL
              ========================================================================= */}
          {mobileSection === 'bilan' && (
            <div className="space-y-4 animate-in fade-in duration-200 flex-1">
              
              {/* BILAN DES REMBOURSEMENTS */}
              <div className="space-y-2">
                {groupData.transferts && groupData.transferts.length > 0 ? (
                  participantsDuGroupe.map((nom) => {
                    const donne = groupData.transferts.filter(t => t.de === nom);
                    const recoit = groupData.transferts.filter(t => t.a === nom);
                    const solde = recoit.reduce((a, b) => a + b.montant, 0) - donne.reduce((a, b) => a + b.montant, 0);

                    return (
                      <div key={`bilan-${nom}`} className="p-3 bg-[var(--glass-bg)] border border-white/5 rounded-2xl">
                        <div className="flex justify-between items-center pb-2 border-b border-white/[0.03] mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{getEmojiForMember(nom) || "👤"}</span>
                            <span className="text-xs font-black uppercase">{nom}</span>
                          </div>
                          <span className={`text-xs font-mono font-black ${solde >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {solde > 0 ? '+' : ''}{solde.toFixed(1)}€
                          </span>
                        </div>

                        {/* Listes micro-remboursements */}
                        <div className="space-y-1 text-[9px] font-bold">
                          {recoit.map((t, idx) => (
                            <div key={idx} className="flex justify-between text-emerald-400 p-1 bg-emerald-500/5 rounded">
                              <span>Reçoit de {t.de}</span>
                              <span>{t.montant.toFixed(1)}€</span>
                            </div>
                          ))}
                          {donne.map((t, idx) => (
                            <div key={idx} className="flex justify-between text-rose-400 p-1 bg-rose-500/5 rounded">
                              <span>Donne à {t.a}</span>
                              <span>{t.montant.toFixed(1)}€</span>
                            </div>
                          ))}
                        </div>

                        <button 
                          onClick={() => handleDownloadPDF(nom)}
                          className="w-full py-1.5 mt-2 bg-white/5 text-[8px] font-black uppercase rounded-lg border border-white/5"
                        >
                          Générer PDF Personnel
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                    <span className="text-xl">✨</span>
                    <p className="text-[9px] text-white/30 uppercase font-black mt-2">Comptes équilibrés ! Tout le monde est à jour</p>
                  </div>
                )}
              </div>

              {/* HISTORIQUE DES TRANSACTIONS */}
              <div className="bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Historique des flux</span>
                  
                  {/* Actions du Groupe (Renommer, Supprimer) */}
                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      onClick={() => {
                        setGroupToEdit({ oldName: groupes[activeTab].nom, newName: groupes[activeTab].nom });
                        setIsEditModalOpen(true);
                      }}
                      className="p-2 bg-white/5 rounded-lg text-white/40 border border-white/5"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => {
                        setGroupToDelete(groupes[activeTab].nom);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {groupData.transactions?.filter(t => t.montant > 0).length > 0 ? (
                    groupData.transactions.filter(t => t.montant > 0).map((t, idx) => (
                      <div 
                        key={t.id || idx}
                        onClick={() => handleOpenEditMobile(t)}
                        className="p-3 bg-black/20 active:bg-white/5 rounded-xl border border-white/5 flex items-center justify-between relative overflow-hidden"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-[8px] text-white/30 font-bold uppercase">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs font-bold text-white truncate">{t.libellé}</p>
                          <span className="text-[8px] text-indigo-400 font-black uppercase tracking-wider block mt-0.5">
                            {getEmojiForMember(t.payé_par) || "👤"} Par {t.payé_par}
                          </span>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-3">
                          <span className="text-xs font-mono font-black text-white">{t.montant} €</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); // Évite d'ouvrir l'éditeur
                              setDeletingId(t.id);
                            }}
                            className="p-1 rounded-lg text-white/20 active:text-rose-500"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Écran de confirmation de suppression imbriqué */}
                        {deletingId === t.id && (
                          <div 
                            className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm flex items-center justify-between px-4 animate-in fade-in duration-150"
                            onClick={(e) => e.stopPropagation()} // Bloque l'édition
                          >
                            <span className="text-[8px] font-black uppercase text-rose-400">Supprimer définitivement ?</span>
                            <div className="flex gap-2">
                              <button onClick={() => setDeletingId(null)} className="text-[8px] uppercase text-white/40">Non</button>
                              <button onClick={() => executeDelete(t.id)} className="px-2.5 py-1 bg-rose-500 text-white text-[8px] font-black rounded uppercase">Oui</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-[9px] text-white/20 uppercase font-black text-center py-6">Aucune dépense enregistrée</p>
                  )}
                </div>

                <button 
                  onClick={() => handleDownloadPDF()}
                  className="w-full py-2.5 bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-widest rounded-xl mt-2"
                >
                  Télécharger Bilan Global (PDF)
                </button>
              </div>

            </div>
          )}

          {/* =========================================================================
              SOUS-ONGLET 2 : NOUVELLE DEPENSE
              ========================================================================= */}
          {mobileSection === 'ajouter' && (
            <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl space-y-4 animate-in fade-in duration-200">
              <h3 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">
                Nouvelle dépense
              </h3>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Libellé</label>
                    <input 
                      type="text"
                      placeholder="Ex: Resto, Taxi..."
                      value={newTransaction.libelle}
                      onChange={(e) => setNewTransaction({...newTransaction, libelle: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date</label>
                    <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[38px] flex items-center justify-center">
                      <DatePicker
                        selected={newTransaction.date ? new Date(newTransaction.date) : null}
                        onChange={(date) => {
                          if (date) {
                            setNewTransaction({ ...newTransaction, date: date.toISOString().split('T')[0] });
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant Global (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newTransaction.montant}
                    onChange={(e) => setNewTransaction({...newTransaction, montant: parseFloat(e.target.value) || 0})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>

                {/* Qui paye */}
                <div>
                  <label className="text-[9px] uppercase font-black text-[var(--primary)] block mb-1.5">Payé par</label>
                  <div className="flex flex-wrap gap-1.5 p-2 bg-black/25 rounded-xl border border-white/5">
                    {participantsDuGroupe.map(p => (
                      <button
                        key={p}
                        onClick={() => setNewTransaction({...newTransaction, paye_par: p})}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                          newTransaction.paye_par === p ? 'bg-[var(--primary)] text-white' : 'text-white/40'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pour qui */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[9px] uppercase font-black text-emerald-400">Pour qui ?</label>
                    <button 
                      onClick={() => {
                        const selectionnes = Object.keys(newTransaction.details_montants);
                        if (selectionnes.length === 0) return;
                        const part = parseFloat((newTransaction.montant / selectionnes.length).toFixed(2));
                        const reset = {};
                        selectionnes.forEach(m => reset[m] = part);
                        setNewTransaction({ ...newTransaction, details_montants: reset });
                      }}
                      className="text-[8px] font-black uppercase text-white/20"
                    >
                      Répartir équitablement
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {participantsDuGroupe.map(p => {
                      const isSelected = newTransaction.details_montants && newTransaction.details_montants.hasOwnProperty(p);
                      return (
                        <div key={p} className="space-y-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const newDetails = { ...newTransaction.details_montants };
                              if (isSelected) delete newDetails[p];
                              else newDetails[p] = 0;
                              setNewTransaction({ ...newTransaction, details_montants: newDetails });
                            }}
                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
                              isSelected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-black/20 border-transparent opacity-40'
                            }`}
                          >
                            <span>{p}</span>
                            <span className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/10'}`}>
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </span>
                          </button>

                          {isSelected && (
                            <input 
                              type="number"
                              step="0.01"
                              value={newTransaction.details_montants[p] || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setNewTransaction({
                                  ...newTransaction, 
                                  details_montants: { ...newTransaction.details_montants, [p]: val }
                                });
                              }}
                              placeholder="0.00"
                              className="w-full bg-black/40 border border-white/10 rounded-xl py-1.5 px-3 text-right text-xs font-mono font-bold text-white outline-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reliquat */}
                  <div className={`p-3 rounded-xl border text-center ${estEquilibre ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 animate-pulse'}`}>
                    <span className="text-[8px] font-black uppercase text-white/30 block mb-1">Reste à répartir</span>
                    <span className={`text-xs font-mono font-black ${estEquilibre ? 'text-emerald-400' : 'text-rose-500'}`}>
                      {resteARepartir.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleCreateTransaction}
                  className="w-full py-3.5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-500 active:scale-98 transition-all"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              SOUS-ONGLET 3 : MEMBRES & GESTION
              ========================================================================= */}
          {mobileSection === 'membres' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* AJOUTER MEMBRE */}
              <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-2xl space-y-3">
                <label className="text-[9px] uppercase font-black text-[var(--primary)] block">Nouveau Membre</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    id="input-nouveau-membre-mobile"
                    placeholder="Prénom..."
                    className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  />
                  <button 
                    onClick={() => {
                      const input = document.getElementById('input-nouveau-membre-mobile');
                      handleAjouterMembreLocal(input.value);
                      input.value = "";
                    }}
                    className="bg-[var(--primary)] text-white px-4 py-2 rounded-xl text-xs font-black uppercase"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {/* LISTE DES MEMBRES ACTUELS */}
              <div className="bg-[var(--glass-bg)] border border-white/10 p-4 rounded-3xl space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                  Membres de la session ({participantsDuGroupe.length})
                </label>

                <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                  {participantsDuGroupe.map(membre => (
                    <div 
                      key={`manage-mobile-${membre}`} 
                      className="p-2.5 bg-black/20 border border-white/5 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        
                        {/* Avatar avec déclencheur Emoji de dnd-kit */}
                        <div className="relative">
                          <button 
                            onClick={() => setActiveEmojiPicker(activeEmojiPicker === membre ? null : membre)}
                            className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-lg active:scale-95 transition-all"
                          >
                            <span>{getEmojiForMember(membre) || membre.substring(0, 1).toUpperCase()}</span>
                          </button>

                          {/* PORTAL POUR PICKER EMOJI MOBILE */}
                          {activeEmojiPicker === membre && createPortal(
                            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveEmojiPicker(null)} />
                              <div className="relative shadow-2xl animate-in zoom-in duration-200">
                                <EmojiPicker 
                                  onEmojiClick={(emojiData) => {
                                    handleSetEmoji(membre, emojiData.emoji);
                                    setActiveEmojiPicker(null);
                                  }}
                                  theme={Theme.DARK}
                                  emojiStyle="native"
                                  width={300}
                                  height={380}
                                  previewConfig={{ showPreview: false }}
                                />
                              </div>
                            </div>,
                            document.body
                          )}
                        </div>

                        <span className="text-xs font-black uppercase text-white/80">{membre}</span>
                      </div>

                      <button 
                        onClick={() => handleSupprimerMembreLocal(membre)}
                        className="p-2 text-rose-500/50 hover:text-rose-400 active:scale-95 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-[var(--glass-bg)] border border-white/10 rounded-2xl text-center">
          <span className="text-2xl mb-2">📂</span>
          <p className="text-[10px] text-white/40 uppercase font-black">Aucun groupe actif</p>
        </div>
      )}

      {/* =========================================================================
          MODALE MOBILE DE MODIFICATION DE TRANSACTION (TACTILE ADAPTÉ)
          ========================================================================= */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full bg-[#121214] border-t border-white/10 rounded-t-[2rem] p-6 max-h-[85vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom-6 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest">Éditer la dépense</h4>
                <p className="text-[9px] text-white/30 uppercase font-black">Modification à la volée</p>
              </div>
              <button 
                onClick={() => setEditingTransaction(null)} 
                className="p-1.5 bg-white/5 rounded-xl text-white/40"
              >
                <X size={16} />
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                <input 
                  type="text"
                  value={editingTransaction.libellé}
                  onChange={(e) => setEditingTransaction({...editingTransaction, libellé: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingTransaction.montant}
                    onChange={(e) => setEditingTransaction({...editingTransaction, montant: parseFloat(e.target.value) || 0})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date</label>
                  <div className="bg-black/40 border border-white/10 rounded-xl px-2 py-2 h-[34px] flex items-center justify-center">
                    <DatePicker
                      selected={editingTransaction.date ? new Date(editingTransaction.date) : null}
                      onChange={(date) => {
                        if (date) {
                          setEditingTransaction({ ...editingTransaction, date: date.toISOString().split('T')[0] });
                        }
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-center text-xs font-bold text-white w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Payé par */}
              <div>
                <label className="text-[9px] uppercase font-black text-[var(--primary)] block mb-1.5">Payé par</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-black/25 rounded-xl border border-white/5">
                  {participantsDuGroupe.map(p => (
                    <button
                      key={p}
                      onClick={() => setEditingTransaction({...editingTransaction, payé_par: p})}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                        editingTransaction.payé_par === p ? 'bg-[var(--primary)] text-white' : 'text-white/40'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Répartition */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[9px] uppercase font-black text-emerald-400">Répartition des frais</label>
                  <button 
                    onClick={() => {
                      const membres = participantsDuGroupe;
                      const part = parseFloat((editingTransaction.montant / membres.length).toFixed(2));
                      const reset = {};
                      membres.forEach(m => reset[m] = part);
                      setEditingTransaction({
                        ...editingTransaction, 
                        details_montants: reset, 
                        pour_qui: 'Tous'
                      });
                    }}
                    className="text-[8px] font-black uppercase text-emerald-400"
                  >
                    Réinitialiser (Équitable)
                  </button>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {participantsDuGroupe.map(personne => (
                    <div key={personne} className="flex items-center justify-between p-2 bg-black/20 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-white/80">{personne}</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          step="0.01"
                          value={editingTransaction.details_montants?.[personne] ?? ""} 
                          onChange={(e) => updateMontantIndividuel(personne, e.target.value)}
                          className="w-20 bg-black/40 border border-white/10 rounded-lg py-1 px-2.5 text-right text-xs font-mono font-bold text-white outline-none"
                        />
                        <span className="text-[9px] text-white/30">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Validation */}
            <div className="flex gap-2 pt-3">
              <button 
                onClick={() => setEditingTransaction(null)}
                className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateTransaction}
                className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/10"
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