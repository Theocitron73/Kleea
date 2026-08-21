import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import DatePicker from 'react-datepicker';
import { 
  Plus, Edit2, Trash2, CheckCircle, AlertCircle, Smile, FileText, ArrowUpRight, ArrowDownRight, Minus, X
} from 'lucide-react';

export default function SharedTricount() {
  const { token } = useParams();
  
  const [groupeNom, setGroupeNom] = useState("");
  const [owner, setOwner] = useState("");
  const [groupData, setGroupData] = useState({ transactions: [], transferts: [] });
  const [emojisChaine, setEmojisChaine] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [newTransaction, setNewTransaction] = useState({
    libelle: "", montant: 0, paye_par: "", date: new Date().toISOString().split('T')[0], details_montants: {}
  });
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);
  
  const [notification, setNotification] = useState({ show: false, message: "", type: "error" });
  
  // 💡 NOUVEL ÉTAT LOCAL : Gère la navigation par onglets sur mobile
  const [mobileTab, setMobileTab] = useState('bilan'); // 'bilan' | 'ajouter' | 'historique'

  const showToast = (message, type = "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchSharedData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/get-shared-tricount/${token}`);
      if (!response.ok) throw new Error("Données introuvables.");
      const data = await response.json();
      setGroupeNom(data.groupe);
      setOwner(data.utilisateur);
      setGroupData(data);
      setEmojisChaine(data.emojis);
    } catch (err) {
      console.error(err);
      showToast("Lien de partage introuvable ou expiré.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSharedData(); }, [token]);

  const participantsDuGroupe = useMemo(() => {
    const nomsUniques = new Set();
    if (groupData.transactions && groupData.transactions.length > 0) {
      groupData.transactions.forEach(t => {
        if (t.payé_par) nomsUniques.add(t.payé_par.trim());
        if (t.pour_qui) {
          t.pour_qui.split(',').forEach(s => {
            const nom = s.split(':')[0].trim();
            if (nom) nomsUniques.add(nom);
          });
        }
      });
    }
    return Array.from(nomsUniques)
      .filter(m => {
        const n = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return n !== "" && n !== "systeme" && n !== "undefined";
      })
      .sort((a, b) => a.localeCompare(b));
  }, [groupData.transactions]);

  // Initialiser le payeur par défaut sur la première personne du groupe
  useEffect(() => {
    if (participantsDuGroupe.length > 0 && !newTransaction.paye_par) {
      setNewTransaction(prev => ({ ...prev, paye_par: participantsDuGroupe[0] }));
    }
  }, [participantsDuGroupe]);

  const handleCreateTransaction = async () => {
    if (!newTransaction.libelle || newTransaction.libelle.trim() === "") {
      showToast("Veuillez donner un libellé à cette dépense.", "error");
      return;
    }
    const montantGlobal = parseFloat(newTransaction.montant);
    if (!montantGlobal || montantGlobal <= 0) {
      showToast("Le montant doit être supérieur à 0€.", "error");
      return;
    }
    const selectionnes = Object.keys(newTransaction.details_montants || {});
    if (selectionnes.length === 0) {
      showToast("Sélectionnez au moins une personne bénéficiaire.", "error");
      return;
    }
    const totalReparti = Object.values(newTransaction.details_montants).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
    if (Math.abs(montantGlobal - totalReparti) > 0.01) {
      showToast("Déséquilibre dans la répartition des parts.", "error");
      return;
    }

    try {
      const parts = Object.entries(newTransaction.details_montants || {})
        .filter(([_, m]) => m > 0)
        .map(([nom, m]) => `${nom.trim()}:${m}`)
        .join(',');

      await fetch(`${import.meta.env.VITE_API_URL}/save-shared-transaction/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: newTransaction.date,
          libelle: newTransaction.libelle,
          montant: montantGlobal,
          paye_par: newTransaction.paye_par,
          pour_qui: parts,
          emoji: getEmojiForMember(newTransaction.paye_par)
        })
      });

      setNewTransaction({
        libelle: "", montant: 0, paye_par: participantsDuGroupe[0] || "", date: new Date().toISOString().split('T')[0], details_montants: {}
      });
      showToast("Dépense enregistrée !", "success");
      fetchSharedData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTransaction = async () => {
    try {
      const chainePourQui = Object.entries(editingTransaction.details_montants || {})
        .filter(([_, m]) => m > 0)
        .map(([nom, m]) => `${nom}:${m}`)
        .join(',');

      await fetch(`${import.meta.env.VITE_API_URL}/update-shared-transaction/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTransaction.id,
          date: editingTransaction.date,
          libelle: editingTransaction.libellé || editingTransaction.libelle,
          paye_par: editingTransaction.payé_par || editingTransaction.paye_par,
          pour_qui: chainePourQui || "Tous",
          montant: parseFloat(editingTransaction.montant)
        })
      });
      setEditingTransaction(null);
      fetchSharedData();
    } catch (err) {
      console.error(err);
    }
  };

  const executeDelete = async (id) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/delete-shared-transaction/${token}/${id}`, { method: 'DELETE' });
      fetchSharedData();
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const getEmojiForMember = (nom) => {
    if (!emojisChaine) return null;
    const match = emojisChaine.split(',').find(item => item.startsWith(`${nom}:`));
    return match ? match.split(':')[1] : null;
  };

  const handleSetEmoji = async (nom, emoji) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/update-member-emoji`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: owner,
          group_name: groupeNom,
          member_name: nom,
          new_emoji: emoji
        })
      });
      if (response.ok) {
        fetchSharedData();
        showToast("Emoji enregistré !", "success");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = async (sujet = null) => {
    let url = `${import.meta.env.VITE_API_URL}/download-shared-pdf/${token}`;
    if (sujet) url += `?sujet=${encodeURIComponent(sujet)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const dUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = dUrl;
      link.download = sujet ? `Bilan_${sujet}.pdf` : `Bilan_Global_${groupeNom}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(dUrl);
    } catch (err) {
      alert("Erreur lors de la génération du PDF.");
    }
  };

  const totalReparti = Object.values(newTransaction.details_montants || {}).reduce((acc, curr) => acc + curr, 0);
  const resteARepartir = (parseFloat(newTransaction.montant) || 0) - totalReparti;
  const estEquilibre = Math.abs(resteARepartir) < 0.01;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#152C48] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
      </div>
    );
  }

  // Blocs de contenus factorisés pour éviter les duplications entre PC et mobile
  const renderDépenseForm = () => (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl space-y-4">
      <h3 className="text-xs font-black uppercase text-white/40 tracking-wider">Nouvelle dépense</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
            <input 
              type="text"
              placeholder="Courses, taxi..."
              value={newTransaction.libelle}
              onChange={(e) => setNewTransaction({...newTransaction, libelle: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold outline-none"
            />
          </div>
          <div>
            <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Date</label>
            <div className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs outline-none">
              <DatePicker
                selected={newTransaction.date ? new Date(newTransaction.date) : null}
                onChange={(date) => {
                  if (date) {
                    setNewTransaction({ ...newTransaction, date: date.toISOString().split('T')[0] });
                  }
                }}
                dateFormat="dd/MM/yyyy"
                className="bg-transparent border-none outline-none text-xs font-bold w-full cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant Total (€)</label>
          <input 
            type="number"
            step="0.01"
            value={newTransaction.montant}
            onChange={(e) => setNewTransaction({...newTransaction, montant: parseFloat(e.target.value) || 0})}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-mono font-bold outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Payé par</label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-black/25 rounded-xl border border-white/5">
            {participantsDuGroupe.map(p => (
              <button
                key={p}
                onClick={() => setNewTransaction({...newTransaction, paye_par: p})}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                  newTransaction.paye_par === p ? 'bg-indigo-600 text-white' : 'text-white/40'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
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
                <div key={p} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      const newDetails = { ...newTransaction.details_montants };
                      if (isSelected) delete newDetails[p];
                      else newDetails[p] = 0;
                      setNewTransaction({ ...newTransaction, details_montants: newDetails });
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                      isSelected ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-black/20 border-transparent opacity-40'
                    }`}
                  >
                    <span>{p}</span>
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/10'}`}>
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
                      className="w-full bg-black/30 border border-white/5 rounded-lg py-1 px-2 text-right text-xs font-mono outline-none"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className={`p-3 rounded-xl border text-center ${estEquilibre ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20 animate-pulse'}`}>
            <span className="text-[8px] font-black uppercase text-white/30 block mb-1">Reste à répartir</span>
            <span className={`text-xs font-mono font-black ${estEquilibre ? 'text-emerald-400' : 'text-rose-500'}`}>
              {resteARepartir.toFixed(2)} €
            </span>
          </div>
        </div>

        <button 
          onClick={handleCreateTransaction}
          className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-emerald-500 active:scale-95 transition-all"
        >
          Enregistrer la dépense
        </button>
      </div>
    </div>
  );

  const renderBilanSection = () => (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl space-y-4">
      <h3 className="text-xs font-black uppercase text-white/40 tracking-wider">Bilan des remboursements</h3>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        {groupData.transferts && groupData.transferts.length > 0 ? (
          participantsDuGroupe.map(nom => {
            const donne = groupData.transferts.filter(t => t.de === nom);
            const recoit = groupData.transferts.filter(t => t.a === nom);
            const solde = recoit.reduce((a, b) => a + b.montant, 0) - donne.reduce((a, b) => a + b.montant, 0);

            return (
              <div key={nom} className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getEmojiForMember(nom) || "👤"}</span>
                    <span className="text-xs font-black uppercase">{nom}</span>
                  </div>
                  <span className={`text-xs font-mono font-black ${solde >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {solde > 0 ? '+' : ''}{solde.toFixed(2)}€
                  </span>
                </div>

                <div className="space-y-1 text-[9px] font-bold">
                  {recoit.map((t, idx) => (
                    <div key={idx} className="flex justify-between text-emerald-400 p-1 bg-emerald-500/5 rounded">
                      <span>Reçoit de {t.de}</span>
                      <span>{t.montant.toFixed(2)}€</span>
                    </div>
                  ))}
                  {donne.map((t, idx) => (
                    <div key={idx} className="flex justify-between text-rose-400 p-1 bg-rose-500/5 rounded">
                      <span>Donne à {t.a}</span>
                      <span>{t.montant.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handleDownloadPDF(nom)}
                  className="w-full py-1.5 bg-white/5 text-[8px] font-black uppercase rounded hover:bg-white/10"
                >
                  Bilan PDF Personnel
                </button>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-white/30 text-center py-8 font-black uppercase">Aucun transfert à effectuer</p>
        )}
      </div>
    </div>
  );

  const renderHistoriqueSection = () => (
    <div className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl flex flex-col gap-4">
      <h3 className="text-xs font-black uppercase text-white/40 tracking-wider">Historique</h3>
      <div className="flex-1 overflow-y-auto max-h-[60vh] space-y-2 pr-1">
        {groupData.transactions && groupData.transactions.length > 0 ? (
          groupData.transactions.map((t, i) => (
            /* 💡 CORRECTION : Classe 'relative' rajoutée pour ancrer l'overlay de suppression sur mobile */
            <div key={t.id || i} className="p-3 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center relative overflow-hidden">
              <div>
                <span className="text-[8px] text-white/30 font-bold block">{new Date(t.date).toLocaleDateString('fr-FR')}</span>
                <span className="text-xs font-black text-white">{t.libellé}</span>
                <span className="text-[8px] text-indigo-400 font-black uppercase block mt-1">Payé par {t.payé_par}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-black text-white">{t.montant.toFixed(2)}€</span>
                <button 
                  onClick={() => setDeletingId(t.id)}
                  className="text-white/20 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {deletingId === t.id && (
                <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-sm rounded-xl flex items-center justify-between px-4 animate-in fade-in duration-200">
                  <span className="text-[9px] font-black uppercase text-rose-400">Supprimer définitivement ?</span>
                  <div className="flex gap-2">
                    <button onClick={() => setDeletingId(null)} className="text-[8px] uppercase text-white/40">Annuler</button>
                    <button onClick={() => executeDelete(t.id)} className="px-3 py-1 bg-rose-500 text-white text-[8px] font-black rounded uppercase">Confirmer</button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-xs text-white/20 text-center py-12 uppercase font-black">Aucune dépense enregistrée</p>
        )}
      </div>

      <button 
        onClick={() => handleDownloadPDF()}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:brightness-110"
      >
        Bilan Complet (PDF)
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#152C48] text-white p-4 md:p-8">
      
      {/* TOAST SYSTEM */}
      {notification.show && (
        <div className="fixed top-6 right-6 z-[9999] bg-slate-900/95 border border-white/10 p-4 rounded-xl shadow-2xl">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${notification.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {notification.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            </div>
            <p className="text-xs font-bold">{notification.message}</p>
          </div>
        </div>
      )}

      {/* HEADER COMPACT */}
      <div className="max-w-7xl mx-auto mb-6 p-4 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 flex justify-between items-center">
        <div>
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-indigo-400">Tricount Partagé</span>
          <h2 className="text-xl font-black uppercase mt-1">{groupeNom}</h2>
        </div>
        <div className="text-right">
          <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Créé par</span>
          <p className="text-xs font-bold text-white/80">{owner}</p>
        </div>
      </div>

      {/* =========================================================================
          SÉLECTEUR D'ONGLETS MOBILE (UNIQUEMENT SUR MOBILE)
          ========================================================================= */}
      <div className="flex lg:hidden border-b border-white/5 mb-4 select-none">
        <button 
          onClick={() => setMobileTab('bilan')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileTab === 'bilan' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40'
          }`}
        >
          Bilan
        </button>
        <button 
          onClick={() => setMobileTab('ajouter')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileTab === 'ajouter' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40'
          }`}
        >
          Créer Dépense
        </button>
        <button 
          onClick={() => setMobileTab('historique')}
          className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition-all border-b-2 ${
            mobileTab === 'historique' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-white/40'
          }`}
        >
          Historique ({groupData.transactions?.length || 0})
        </button>
      </div>

      {/* =========================================================================
          VERSION DESKTOP (PC & Écrans larges)
          ========================================================================= */}
      <div className="hidden lg:grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderDépenseForm()}
        {renderBilanSection()}
        {renderHistoriqueSection()}
      </div>

      {/* =========================================================================
          VERSION MOBILE COMMUTÉE (Smartphones)
          ========================================================================= */}
      <div className="block lg:hidden">
        {mobileTab === 'bilan' && renderBilanSection()}
        {mobileTab === 'ajouter' && renderDépenseForm()}
        {mobileTab === 'historique' && renderHistoriqueSection()}
      </div>

      {/* MODALE DE MODIFICATION COMMUNE (PC & MOBILE) */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Modifier la dépense</h3>
              <button onClick={() => setEditingTransaction(null)} className="p-1 text-white/40"><X size={16} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Désignation</label>
                  <input 
                    type="text"
                    value={editingTransaction.libellé}
                    onChange={(e) => setEditingTransaction({...editingTransaction, libellé: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
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

              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Montant (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editingTransaction.montant}
                  onChange={(e) => setEditingTransaction({...editingTransaction, montant: parseFloat(e.target.value) || 0})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-white outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] uppercase font-black text-white/40 block mb-1">Payé par</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-black/25 rounded-xl border border-white/5">
                  {participantsDuGroupe.map(p => (
                    <button
                      key={p}
                      onClick={() => setEditingTransaction({...editingTransaction, payé_par: p})}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                        editingTransaction.payé_par === p ? 'bg-indigo-600 text-white' : 'text-white/40'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
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

            <div className="flex gap-2 pt-3">
              <button 
                onClick={() => setEditingTransaction(null)}
                className="flex-1 py-3 bg-white/5 text-white/70 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Annuler
              </button>
              <button 
                onClick={handleUpdateTransaction}
                className="flex-1 py-3 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg"
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