import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, Smile, AlertCircle, CheckCircle } from 'lucide-react';
import DatePicker from "react-datepicker";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { createPortal } from 'react-dom';
import api from '../axios'; // 🟢 Requêtes Axios compatibles localhost et production
import TricountMobile from '../TricountMobile';

export default function TricountManager({ userId }) {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [groupData, setGroupData] = useState({ transactions: [], transferts: [] });

  // --- MODALES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [shareToken, setShareToken] = useState(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState({ oldName: "", newName: "" });

  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [newTransaction, setNewTransaction] = useState({
    libelle: "",
    montant: 0,
    paye_par: userId,
    date: new Date().toISOString().split('T')[0],
    details_montants: {}
  });

  const [notification, setNotification] = useState({ show: false, message: "", type: "error" });
  const [activeEmojiPicker, setActiveEmojiPicker] = useState(null);

  const showToast = (message, type = "error") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // --- PARTAGE DE GROUPE ---
  const handleShareGroup = async () => {
    if (!groupes[activeTab]) return;
    const groupName = groupes[activeTab].nom;
    try {
      const res = await api.post(`/share-group/${userId}/${encodeURIComponent(groupName)}`);
      setShareToken(res.data.token);
      const shareUrl = `${window.location.origin}/shared-tricount/${res.data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      showToast("Lien de partage copié dans le presse-papiers !", "success");
    } catch (err) {
      showToast("Erreur lors de la génération du lien", "error");
    }
  };

  useEffect(() => {
    const checkExistingToken = async () => {
      if (groupes.length > 0 && groupes[activeTab]) {
        const groupName = groupes[activeTab].nom;
        try {
          const res = await api.get(`/get-share-token/${userId}/${encodeURIComponent(groupName)}`);
          setShareToken(res.data.token);
        } catch (err) {}
      }
    };
    checkExistingToken();
  }, [activeTab, groupes, userId]);

  const fetchGroupes = async () => {
    try {
      const res = await api.get(`/get-groups/${userId}`);
      setGroupes(res.data || []);
    } catch (err) {
      console.error("Erreur récupération groupes:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailsGroupe = async () => {
    if (groupes.length > 0 && groupes[activeTab]) {
      const groupName = groupes[activeTab].nom;
      try {
        const res = await api.get(`/get-tricount/${userId}/${encodeURIComponent(groupName)}`);
        setGroupData(res.data || { transactions: [], transferts: [] });
      } catch (err) {
        console.error("Erreur détails groupe:", err);
      }
    }
  };

  useEffect(() => { 
    if (userId) fetchGroupes(); 
  }, [userId]);

  useEffect(() => { 
    fetchDetailsGroupe(); 
  }, [activeTab, groupes]);

  // --- ACTIONS GROUPES ---
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const nouvelleTransactionVide = {
      date: new Date().toISOString().split('T')[0],
      libelle: "Création du groupe",
      montant: 0,
      paye_par: "systeme",
      pour_qui: "systeme",
      utilisateur: userId,
      groupe: newGroupName.trim()
    };

    try {
      await api.post(`/save-tricount`, nouvelleTransactionVide);
      setNewGroupName("");
      setIsModalOpen(false);
      fetchGroupes();
      showToast("Groupe créé avec succès !", "success");
    } catch (err) {
      showToast("Erreur création groupe", "error");
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await api.delete(`/delete-group/${userId}/${encodeURIComponent(groupToDelete)}`);
      await fetchGroupes();
      setActiveTab(0);
      setIsDeleteModalOpen(false);
      showToast("Groupe supprimé", "success");
    } catch (err) {
      showToast("Erreur suppression groupe", "error");
    }
  };

  const handleRenameGroup = async () => {
    if (!groupToEdit.newName.trim() || groupToEdit.newName === groupToEdit.oldName) {
      setIsEditModalOpen(false);
      return;
    }
    try {
      await api.put(`/rename-group`, {
        userId: userId,
        oldName: groupToEdit.oldName,
        newName: groupToEdit.newName.trim()
      });
      await fetchGroupes();
      setIsEditModalOpen(false);
      showToast("Groupe renommé", "success");
    } catch (err) {
      showToast("Erreur renommage", "error");
    }
  };

  const handleDownloadPDF = async (sujet = null) => {
    if (!groupes || groupes.length === 0 || !groupes[activeTab]) return;
    const groupName = groupes[activeTab].nom;
    const baseUrl = api.defaults.baseURL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
    let url = `${baseUrl}/download-pdf/${userId}/${encodeURIComponent(groupName)}`;
    if (sujet) url += `?sujet=${encodeURIComponent(sujet)}`;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = sujet ? `Bilan_${sujet}_${groupName}.pdf` : `Bilan_Global_${groupName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      showToast("Impossible de générer le PDF", "error");
    }
  };

  // --- PARTICIPANTS ET CALCULS DE RÉPARTITION ---
  const participantsDuGroupe = useMemo(() => {
    const nomsUniques = new Set();
    if (groupes && groupes[activeTab] && groupes[activeTab].membres) {
      const membresRaw = groupes[activeTab].membres;
      let listeOfficielle = [];
      if (typeof membresRaw === 'string') {
        listeOfficielle = membresRaw.split(',').map(m => m.trim());
      } else if (Array.isArray(membresRaw)) {
        listeOfficielle = membresRaw;
      }
      listeOfficielle.forEach(m => { if(m) nomsUniques.add(m); });
    } 

    if (groupData.transactions && groupData.transactions.length > 0) {
      groupData.transactions.forEach(t => {
        const payeur = (t.payé_par || t.paye_par || "").trim();
        if (payeur) nomsUniques.add(payeur);
        if (t.pour_qui) {
          t.pour_qui.split(',').forEach(segment => {
            const nom = segment.split(':')[0].trim();
            if (nom) nomsUniques.add(nom);
          });
        }
      });
    }

    return Array.from(nomsUniques)
      .filter(m => {
        const nomNettoye = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
        return nomNettoye !== "" && nomNettoye !== "systeme" && nomNettoye !== "undefined";
      })
      .sort((a, b) => a.localeCompare(b));
  }, [groupes, activeTab, groupData.transactions]);

  const updateMontantIndividuel = (nom, valeur) => {
    const numValeur = parseFloat(valeur.replace(',', '.')) || 0;
    const nouveauxMontants = { ...(editingTransaction.details_montants || {}) };
    nouveauxMontants[nom] = numValeur;
    const nouveauTotal = Object.values(nouveauxMontants).reduce((a, b) => a + b, 0);
    const actifs = Object.keys(nouveauxMontants).filter(k => nouveauxMontants[k] > 0);
    let pourQuiTexte = "Tous";
    if (actifs.length !== participantsDuGroupe.length) {
      pourQuiTexte = actifs.join(', ');
    }

    setEditingTransaction(prev => ({
      ...prev,
      details_montants: nouveauxMontants,
      montant: parseFloat(nouveauTotal.toFixed(2)),
      pour_qui: pourQuiTexte
    }));
  };

  const handleUpdateTransaction = async () => {
    try {
      const chainePourQui = Object.entries(editingTransaction.details_montants || {})
        .filter(([_, montant]) => montant > 0)
        .map(([nom, montant]) => `${nom}:${montant}`)
        .join(',');

      await api.put(`/update-transaction`, {
        id: editingTransaction.id,
        date: editingTransaction.date,
        libelle: editingTransaction.libellé || editingTransaction.libelle,
        paye_par: editingTransaction.payé_par || editingTransaction.paye_par,
        pour_qui: chainePourQui || "Tous", 
        montant: parseFloat(editingTransaction.montant)
      });

      setEditingTransaction(null);
      fetchDetailsGroupe();
      showToast("Dépense mise à jour", "success");
    } catch (err) {
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/delete-transaction/${id}`);
      fetchDetailsGroupe();
      setDeletingId(null);
      showToast("Dépense supprimée", "success");
    } catch (err) {
      setDeletingId(null);
    }
  };

  const handleAjouterMembreLocal = (nom) => {
    const nomNettoye = nom.trim();
    if (!nomNettoye) return;
    const copieGroupes = JSON.parse(JSON.stringify(groupes));
    const groupeActuel = copieGroupes[activeTab];
    if (!groupeActuel) return;

    let listeMembres = [];
    if (groupeActuel.membres && typeof groupeActuel.membres === 'string') {
      listeMembres = groupeActuel.membres.split(',').filter(m => m.trim() !== "");
    }
    if (listeMembres.includes(nomNettoye)) {
      showToast("Ce membre existe déjà", "error");
      return;
    }

    listeMembres.push(nomNettoye);
    groupeActuel.membres = listeMembres.join(',');
    setGroupes(copieGroupes);
    showToast(`${nomNettoye} ajouté`, "success");
  };

  const handleSupprimerMembreLocal = (nom) => {
    setGroupes(prevGroupes => {
      return prevGroupes.map((groupe, index) => {
        if (index !== activeTab) return groupe;
        const nouvelleListe = (groupe.membres || "")
          .split(',')
          .filter(m => m !== nom && m.trim() !== "");
        return { ...groupe, membres: nouvelleListe.join(',') };
      });
    });
    showToast(`${nom} retiré`, "success");
  };

  const handleSetEmoji = async (nom, emoji) => {
    setGroupes(prevGroupes => {
      return prevGroupes.map((groupe, index) => {
        if (index !== activeTab) return groupe;
        const emojiMap = {};
        if (groupe.emojis) {
          groupe.emojis.split(',').forEach(item => {
            const [n, e] = item.split(':');
            if (n && e) emojiMap[n] = e;
          });
        }
        emojiMap[nom] = emoji;
        return {
          ...groupe,
          emojis: Object.entries(emojiMap).map(([n, e]) => `${n}:${e}`).join(',')
        };
      });
    });

    try {
      await api.put(`/update-member-emoji`, {
        username: userId,
        group_name: groupes[activeTab].nom,
        member_name: nom,
        new_emoji: emoji
      });
      showToast(`Emoji mis à jour pour ${nom}`, "success");
    } catch (error) {
      showToast("Erreur sauvegarde emoji", "error");
    }
  };

  const getEmojiForMember = (nom) => {
    const groupeActuel = groupes[activeTab];
    if (!groupeActuel || !groupeActuel.emojis) return null;
    const match = groupeActuel.emojis.split(',').find(item => item.startsWith(`${nom}:`));
    return match ? match.split(':')[1] : null;
  };

  const totalReparti = Object.values(newTransaction.details_montants || {}).reduce((acc, curr) => acc + curr, 0);
  const resteARepartir = (parseFloat(newTransaction.montant) || 0) - totalReparti;
  const estEquilibre = Math.abs(resteARepartir) < 0.01;

  const handleCreateTransaction = async () => {
    const emojiPayeur = getEmojiForMember(newTransaction.paye_par) || "👤";
    if (!newTransaction.libelle || newTransaction.libelle.trim() === "") {
      showToast("Veuillez donner un nom à cette dépense", "error");
      return;
    }
    const montantGlobal = parseFloat(newTransaction.montant);
    if (!montantGlobal || montantGlobal <= 0) {
      showToast("Le montant doit être supérieur à 0€", "error");
      return;
    }
    const selectionnes = Object.keys(newTransaction.details_montants || {});
    if (selectionnes.length === 0) {
      showToast("Sélectionnez au moins une personne", "error");
      return;
    }
    const ecart = Math.abs(montantGlobal - totalReparti);
    if (ecart > 0.01) {
      showToast(`Déséquilibre de ${ecart.toFixed(2)}€. Ajustez les parts.`, "error");
      return;
    }

    try {
      const parts = Object.entries(newTransaction.details_montants || {})
        .filter(([_, montant]) => montant > 0)
        .map(([nom, montant]) => `${nom.trim()}:${montant}`)
        .join(',');

      const payload = {
        date: newTransaction.date,
        libelle: newTransaction.libelle,
        montant: montantGlobal,
        paye_par: newTransaction.paye_par,
        pour_qui: parts,
        utilisateur: userId,
        groupe: groupes[activeTab].nom,
        emoji: emojiPayeur
      };

      await api.post(`/save-tricount`, payload);

      setNewTransaction({
        libelle: "",
        montant: 0,
        paye_par: userId,
        date: new Date().toISOString().split('T')[0],
        details_montants: {} 
      });
      showToast("Dépense enregistrée !", "success");
      fetchDetailsGroupe();
    } catch (err) {
      showToast("Erreur lors de l'enregistrement", "error");
    }
  };

  if (loading) return <div className="flex justify-center p-10"></div>;

  return (
    <>
      {/* ==========================================================
          1. VERSION DESKTOP
          ========================================================== */}
      <div className="hidden lg:block p-2 w-full mx-auto min-h-screen bg-transparent text-[var(--text-main)] relative animate-in fade-in duration-300">
        
        {/* Toast Notification */}
        <div className={`fixed top-6 right-6 z-[200] transition-all duration-500 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className={`relative overflow-hidden backdrop-blur-[var(--glass-blur)] border p-5 rounded-[var(--radius)] shadow-2xl min-w-[320px] ${
            notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-[var(--radius)] flex items-center justify-center ${
                notification.type === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Système</h4>
                <p className="text-sm font-bold text-[var(--text-main)]/90 leading-tight">{notification.message}</p>
              </div>
            </div>
          </div>
        </div>

        {/* MODALE ÉDITION TRANSACTION */}
        {editingTransaction && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-[var(--glass-blur)]" onClick={() => setEditingTransaction(null)} />
            <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-[var(--text-main)]">Modifier la dépense</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Libellé</label>
                  <input 
                    type="text"
                    value={editingTransaction.libellé || editingTransaction.libelle || ""}
                    onChange={(e) => setEditingTransaction({...editingTransaction, libellé: e.target.value, libelle: e.target.value})}
                    className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Montant (€)</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingTransaction.montant}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setEditingTransaction({...editingTransaction, montant: val});
                      }}
                      className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Date</label>
                    <div className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)]">
                      <DatePicker
                        selected={editingTransaction.date ? new Date(editingTransaction.date) : null}
                        onChange={(date) => {
                          if (date) setEditingTransaction({ ...editingTransaction, date: date.toISOString().split('T')[0] });
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-[var(--text-main)] text-sm font-bold w-full cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Payé par</label>
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)]">
                    {participantsDuGroupe.map(personne => (
                      <button
                        key={personne}
                        onClick={() => setEditingTransaction({...editingTransaction, payé_par: personne, paye_par: personne})}
                        className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase transition-all ${
                          (editingTransaction.payé_par || editingTransaction.paye_par) === personne 
                          ? 'bg-[var(--primary)] text-[var(--text-main)] shadow-lg' 
                          : 'bg-[var(--glass-bg)] text-[var(--text-main)]/40 hover:bg-[var(--glass-bg)]'
                        }`}
                      >
                        {personne}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center ml-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Répartition des frais</label>
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
                      className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-[var(--radius)] hover:bg-emerald-500/20"
                    >
                      Réinitialiser (Équitable)
                    </button>
                  </div>

                  <div className="space-y-2 bg-[var(--glass-bg)] p-4 rounded-[var(--radius)] border border-white/10">
                    {participantsDuGroupe.map(personne => (
                      <div key={personne} className="flex items-center gap-4 p-2">
                        <div className="flex-1">
                          <span className="text-sm font-bold text-[var(--text-main)]/80">{personne}</span>
                        </div>
                        <div className="relative">
                          <input 
                            type="number"
                            step="0.01"
                            inputMode="decimal" 
                            value={editingTransaction.details_montants?.[personne] ?? ""} 
                            onChange={(e) => updateMontantIndividuel(personne, e.target.value)}
                            placeholder="0.00"
                            className="w-24 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] py-2 px-3 text-right text-[var(--text-main)] font-mono text-sm outline-none focus:border-emerald-500"
                          />
                          <span className="ml-2 text-[10px] text-[var(--text-main)]/30">€</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[var(--radius)] flex justify-between items-center">
                    <div className="text-[10px] font-black uppercase text-[var(--primary)] tracking-tighter">Total de la dépense</div>
                    <div className="text-xl font-black text-[var(--text-main)]">{Number(editingTransaction.montant || 0).toFixed(2)}€</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button onClick={() => setEditingTransaction(null)} className="py-4 rounded-[var(--radius)] bg-[var(--glass-bg)] font-black uppercase text-[10px]">Annuler</button>
                <button onClick={handleUpdateTransaction} className="py-4 rounded-[var(--radius)] bg-[var(--primary)] font-black uppercase text-[10px] text-[var(--text-main)] shadow-xl">Enregistrer</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE RENOMMER */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)]" onClick={() => setIsEditModalOpen(false)} />
            <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-8 shadow-2xl">
              <div className="w-12 h-12 bg-[var(--primary)]/10 text-[var(--primary)] rounded-[var(--radius)] flex items-center justify-center mb-6">
                <Edit2 size={24} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Modifier le nom</h3>
              <p className="text-[var(--text-main)]/40 text-[10px] font-bold uppercase tracking-widest mb-8 text-[var(--primary)]">Ancien nom : {groupToEdit.oldName}</p>
              <input 
                autoFocus
                value={groupToEdit.newName}
                onChange={(e) => setGroupToEdit({...groupToEdit, newName: e.target.value})}
                className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 mb-8 text-[var(--text-main)] font-black uppercase tracking-widest focus:border-[var(--primary)] outline-none"
              />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsEditModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-[var(--glass-bg)] text-[10px] font-black uppercase">Annuler</button>
                <button onClick={handleRenameGroup} className="py-4 rounded-[var(--radius)] bg-[var(--primary)] text-[10px] font-black uppercase">Sauvegarder</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CRÉATION GROUPE */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)]" onClick={() => setIsModalOpen(false)} />
            <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-8 shadow-2xl overflow-hidden">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Nouveau Groupe</h3>
              <p className="text-[var(--text-main)]/40 text-[10px] font-bold uppercase tracking-widest mb-8">Définissez le nom de votre projet</p>
              <input 
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="NOM DU GROUPE..."
                className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 mb-8 text-[var(--text-main)] font-bold uppercase tracking-widest outline-none focus:border-[var(--primary)]"
              />
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-[var(--glass-bg)] text-[10px] font-black uppercase">Annuler</button>
                <button onClick={handleCreateGroup} className="py-4 rounded-[var(--radius)] bg-[var(--primary)] text-[10px] font-black uppercase">Confirmer</button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE SUPPRESSION */}
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)]" onClick={() => setIsDeleteModalOpen(false)} />
            <div className="relative w-full max-w-sm bg-[#0f172a] border border-rose-500/20 rounded-[var(--radius)] p-8 shadow-2xl text-center">
              <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-[var(--radius)] flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Supprimer le groupe ?</h3>
              <p className="text-[var(--text-main)]/40 text-xs mb-8 italic">"{groupToDelete}" sera définitivement effacé.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsDeleteModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-[var(--glass-bg)] text-[10px] font-black uppercase">Garder</button>
                <button onClick={handleDeleteGroup} className="py-4 rounded-[var(--radius)] bg-rose-500 text-[10px] font-black uppercase">Supprimer</button>
              </div>
            </div>
          </div>
        )}

        {/* HEADER COMPACT */}
        <div className="flex justify-between items-center mb-2 p-2 rounded-[var(--radius)] bg-[var(--glass-bg)] border border-white/10">
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Tricount</h2>
            <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-1">{groupes.length} Groupes</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleShareGroup} className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-[var(--radius)] flex items-center gap-2 font-black uppercase text-[9px]">
              🔗 Partager
            </button>
            <button onClick={() => setIsModalOpen(true)} className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-[var(--text-main)] p-3 rounded-[var(--radius)] flex items-center gap-2 font-black uppercase text-[9px]">
              <Plus size={14} strokeWidth={4} /> Nouveau
            </button>
          </div>
        </div>

        {/* ONGLETS GROUPES */}
        <div className="flex gap-2 p-1.5 overflow-x-auto mb-6 scrollbar-hide bg-black/20 rounded-[var(--radius)] border border-white/5">
          {groupes.map((grp, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-2 px-5 text-[9px] font-black uppercase tracking-widest rounded-[var(--radius)] transition-all whitespace-nowrap ${
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
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">

              {/* --- COLONNE 1 : GESTION DU GROUPE (MEMBRES) --- */}
              <div className="xl:col-span-1 space-y-6">
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="h-2 w-2 bg-[var(--primary)] rounded-[var(--radius)]" />
                  <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Gestion du Groupe</h4>
                </div>

                <div className="bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl sticky top-6">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Nouveau membre</label>
                      <div className="relative">
                        <input 
                          type="text"
                          id="input-nouveau-membre"
                          placeholder="Prénom du membre..."
                          className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 pr-12 text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]/10"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleAjouterMembreLocal(e.target.value);
                              e.target.value = "";
                            }
                          }}
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById('input-nouveau-membre');
                            handleAjouterMembreLocal(input.value);
                            input.value = "";
                          }}
                          className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--primary)] hover:bg-[var(--primary)]/70 text-[var(--text-main)] rounded-[var(--radius)] transition-all cursor-pointer"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    <hr className="border-white/5" />

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">
                        Membres ({participantsDuGroupe.length})
                      </label>
                      <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                        {participantsDuGroupe.map(membre => (
                          <div key={`manage-${membre}`} className="group flex items-center justify-between p-3 bg-[var(--glass-bg)] border border-white/5 rounded-[var(--radius)] hover:border-[var(--primary)]/30 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div 
                                  onClick={() => setActiveEmojiPicker(activeEmojiPicker === membre ? null : membre)}
                                  className={`w-11 h-11 rounded-[var(--radius)] border-2 flex items-center justify-center text-xl shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden ${
                                    activeEmojiPicker === membre 
                                    ? 'bg-[var(--primary)] border-[var(--primary)] scale-105 shadow-[var(--primary)]/20' 
                                    : 'bg-gradient-to-tr from-white/10 to-white/5 border-white/10 hover:border-[var(--primary)]/50 hover:scale-110'
                                  }`}
                                >
                                  <div className="absolute inset-0 bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/20 flex items-center justify-center transition-colors">
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Smile size={12} className="text-[var(--text-main)]" />
                                    </span>
                                  </div>
                                  <span className="relative z-10 filter drop-shadow-md">
                                    {getEmojiForMember(membre) || membre.substring(0, 1).toUpperCase()}
                                  </span>
                                </div>

                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--primary)] rounded-[var(--radius)] border-2 border-[#0f172a] flex items-center justify-center shadow-lg pointer-events-none">
                                  <Edit2 size={8} className="text-[var(--text-main)]" strokeWidth={4} />
                                </div>
                                
                                {activeEmojiPicker === membre && createPortal(
                                  <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[var(--glass-blur)]" onClick={() => setActiveEmojiPicker(null)} />
                                    <div className="relative shadow-2xl animate-in zoom-in duration-200">
                                      <EmojiPicker 
                                        onEmojiClick={(emojiData) => {
                                          handleSetEmoji(membre, emojiData.emoji);
                                          setActiveEmojiPicker(null);
                                        }}
                                        theme={Theme.DARK}
                                        emojiStyle="native"
                                        width={320}
                                        height={400}
                                        previewConfig={{ showPreview: false }}
                                      />
                                    </div>
                                  </div>,
                                  document.body
                                )}
                              </div>

                              <span className="text-sm font-bold text-[var(--text-main)]/80">{membre}</span>
                            </div>
                            
                            <button 
                              onClick={() => handleSupprimerMembreLocal(membre)} 
                              className="opacity-0 group-hover:opacity-100 p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-[var(--radius)] transition-all cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {(!participantsDuGroupe || participantsDuGroupe.length === 0) && (
                    <p className="text-[10px] text-center text-[var(--text-main)]/10 py-4 italic">
                      Aucun membre pour le moment
                    </p>
                  )}
                </div>
              </div>

              {/* --- COLONNE 2 : NOUVELLE DÉPENSE (AVEC RÉPARTITION INDIVIDUELLE) --- */}
              <div className="xl:col-span-1 space-y-6">
                <div className="flex items-center gap-3 px-2 mb-4">
                  <div className="h-2 w-2 bg-emerald-500 rounded-[var(--radius)] animate-pulse" />
                  <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Nouvelle dépense</h4>
                </div>
                
                <div className="bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl sticky top-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Désignation</label>
                        <input 
                          type="text"
                          value={newTransaction.libelle}
                          onChange={(e) => setNewTransaction({...newTransaction, libelle: e.target.value})}
                          placeholder="Pizza..."
                          className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]/10"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Date</label>
                        <div className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)]">
                          <DatePicker
                            selected={newTransaction.date ? new Date(newTransaction.date) : null}
                            onChange={(date) => {
                              if (date) setNewTransaction({ ...newTransaction, date: date.toISOString().split('T')[0] });
                            }}
                            dateFormat="dd/MM/yyyy"
                            className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-bold w-full cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Montant Total (€)</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={newTransaction.montant}
                        onChange={(e) => setNewTransaction({...newTransaction, montant: parseFloat(e.target.value) || 0})}
                        className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] text-sm font-mono outline-none focus:border-[var(--primary)]"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Payé par</label>
                      <div className="flex flex-wrap gap-2">
                        {participantsDuGroupe.map(p => (
                          <button
                            key={`payeur-${p}`}
                            onClick={() => setNewTransaction({...newTransaction, paye_par: p})}
                            className={`px-3 py-2 rounded-[var(--radius)] text-[9px] font-black uppercase transition-all cursor-pointer ${
                              newTransaction.paye_par === p 
                              ? 'bg-[var(--primary)] text-[var(--text-main)]' 
                              : 'bg-[var(--glass-bg)] text-[var(--text-main)]/40 hover:bg-[var(--glass-bg)]'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pour qui ? Répartition détaillée */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center ml-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pour qui ?</label>
                        <button 
                          onClick={() => {
                            const selectionnes = Object.keys(newTransaction.details_montants);
                            if (selectionnes.length === 0) {
                              alert("Sélectionnez d'abord les participants.");
                              return;
                            }
                            const part = parseFloat((newTransaction.montant / selectionnes.length).toFixed(2));
                            const reset = {};
                            selectionnes.forEach(m => reset[m] = part);
                            setNewTransaction({ ...newTransaction, details_montants: reset });
                          }}
                          className="text-[8px] font-bold text-[var(--text-main)]/20 hover:text-emerald-400 uppercase transition-colors cursor-pointer"
                        >
                          Répartir entre la sélection
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        {participantsDuGroupe.map(p => {
                          const isSelected = newTransaction.details_montants && newTransaction.details_montants.hasOwnProperty(p);
                          return (
                            <div key={`part-${p}`} className="space-y-2">
                              <button
                                onClick={() => {
                                  const newDetails = { ...newTransaction.details_montants };
                                  if (isSelected) {
                                    delete newDetails[p];
                                  } else {
                                    newDetails[p] = 0;
                                  }
                                  setNewTransaction({...newTransaction, details_montants: newDetails});
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-[var(--radius)] border transition-all cursor-pointer ${
                                  isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[var(--glass-bg)] border-transparent opacity-40'
                                }`}
                              >
                                <span className="text-xs font-bold uppercase">{p}</span>
                                <div className={`w-4 h-4 rounded-[var(--radius)] border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`}>
                                  {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-[var(--radius)]" />}
                                </div>
                              </button>

                              {isSelected && (
                                <div className="flex items-center gap-2 pl-4">
                                  <div className="h-px flex-1 bg-[var(--glass-bg)]" />
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
                                    className="w-20 bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] py-1 px-2 text-right text-xs text-[var(--text-main)] font-mono outline-none focus:border-emerald-500"
                                  />
                                  <span className="text-[10px] text-[var(--text-main)]/20">€</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Indicateur de reliquat */}
                      <div className={`mt-4 p-4 rounded-[var(--radius)] border transition-all duration-500 ${
                        estEquilibre 
                        ? 'bg-emerald-500/10 border-emerald-500/20' 
                        : 'bg-rose-500/10 border-rose-500/20 animate-pulse'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                            {resteARepartir > 0 ? "Reste à répartir" : resteARepartir < 0 ? "Trop réparti" : "Répartition correcte"}
                          </span>
                          <span className={`text-sm font-mono font-black ${estEquilibre ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {resteARepartir.toFixed(2)} €
                          </span>
                        </div>
                        {!estEquilibre && (
                          <div className="w-full h-1 bg-[var(--glass-bg)] rounded-[var(--radius)] mt-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${resteARepartir > 0 ? 'bg-rose-500' : 'bg-orange-500'}`}
                              style={{ width: `${Math.min(Math.abs((totalReparti / newTransaction.montant) * 100), 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={handleCreateTransaction}
                      className="w-full py-5 bg-white text-black hover:bg-emerald-500 hover:text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl cursor-pointer"
                    >
                      Enregistrer la dépense
                    </button>
                  </div>
                </div>
              </div>
              
              {/* --- COLONNE 3 : BILAN DES REMBOURSEMENTS --- */}
              <div className="lg:col-span-2 flex flex-col h-[calc(90vh-180px)] space-y-6">
                <div className="flex items-center gap-3 px-2 mb-4 shrink-0">
                  <div className="h-2 w-2 bg-[var(--primary)] rounded-[var(--radius)] animate-pulse" />
                  <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">
                    Bilan des remboursements
                  </h4>
                </div>

                <div className="flex-1 min-h-0 pr-2 scrollbar-hide overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const membresExistants = participantsDuGroupe && participantsDuGroupe.length > 0;
                      const transfertsExistants = groupData.transferts && groupData.transferts.length > 0;

                      if (!membresExistants) {
                        return (
                          <div className="col-span-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02]">
                            <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 text-3xl">👥</div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Groupe vide</h5>
                            <p className="text-[11px] font-bold text-indigo-400/50 uppercase tracking-widest text-center px-8">Ajoutez des membres dans la colonne de gauche pour commencer.</p>
                          </div>
                        );
                      }

                      if (!transfertsExistants) {
                        return (
                          <div className="col-span-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02]">
                            <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 text-3xl">✨</div>
                            <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">Comptes équilibrés</h5>
                            <p className="text-[11px] font-bold text-emerald-400/50 uppercase tracking-widest text-center px-8">Tout le monde est à jour !</p>
                          </div>
                        );
                      }

                      const bilanParPersonne = {};
                      groupData.transferts.forEach(t => {
                        const emetteur = t.de.trim();
                        const recepteur = t.a.trim();
                        if (!bilanParPersonne[emetteur]) bilanParPersonne[emetteur] = { donne: [], recoit: [], solde: 0 };
                        if (!bilanParPersonne[recepteur]) bilanParPersonne[recepteur] = { donne: [], recoit: [], solde: 0 };
                        
                        bilanParPersonne[emetteur].donne.push(t);
                        bilanParPersonne[emetteur].solde -= t.montant;
                        bilanParPersonne[recepteur].recoit.push(t);
                        bilanParPersonne[recepteur].solde += t.montant;
                      });

                      return Object.keys(bilanParPersonne).map((nom) => (
                        <div 
                          key={`bilan-${nom}`} 
                          className="group bg-[var(--glass-bg)] border border-white/10 rounded-[var(--radius)] p-6 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-500 flex flex-col"
                        >
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-[var(--radius)] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl">
                                <span className="filter drop-shadow-md">{getEmojiForMember(nom) || nom.substring(0, 1).toUpperCase()}</span>
                              </div>
                              <div>
                                <span className="block font-black text-[var(--text-main)] uppercase tracking-tighter text-lg leading-none">{nom}</span>
                                <span className="text-[10px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest">Membre actif</span>
                              </div>
                            </div>
                            
                            <div className={`text-xl font-black tracking-tighter ${bilanParPersonne[nom].solde >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {bilanParPersonne[nom].solde > 0 ? "+" : ""}
                              {bilanParPersonne[nom].solde.toFixed(2)}€
                            </div>
                          </div>

                          <div className="space-y-2 mb-6 flex-1">
                            {bilanParPersonne[nom].recoit.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]/70 bg-emerald-500/5 p-3 rounded-[var(--radius)] border border-emerald-500/10">
                                <span className="uppercase tracking-widest text-emerald-400 font-black">Reçoit de {t.de}</span>
                                <span className="text-[var(--text-main)] font-black">{t.montant.toFixed(2)}€</span>
                              </div>
                            ))}
                            
                            {bilanParPersonne[nom].donne.map((t, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]/70 bg-rose-500/5 p-3 rounded-[var(--radius)] border border-rose-500/10">
                                <span className="uppercase tracking-widest text-rose-400 font-black">Donne à {t.a}</span>
                                <span className="text-[var(--text-main)] font-black">{t.montant.toFixed(2)}€</span>
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={() => handleDownloadPDF(nom)} 
                            className="w-full py-3 rounded-[var(--radius)] bg-[var(--glass-bg)] hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-all border border-white/5 cursor-pointer"
                          >
                            Générer PDF Individuel
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* --- COLONNE 4 : HISTORIQUE DES DÉPENSES --- */}
              <div className="flex flex-col h-[calc(90vh-180px)] space-y-6">
                <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                  <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Historique</h4>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setGroupToEdit({ oldName: groupes[activeTab].nom, newName: groupes[activeTab].nom });
                        setIsEditModalOpen(true);
                      }}
                      className="p-3 bg-[var(--glass-bg)] hover:bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/5 transition-all text-[var(--text-main)]/60 hover:text-[var(--primary)] cursor-pointer"
                    >
                      <Edit2 size={14}/>
                    </button>
                    <button 
                      onClick={() => {
                        setGroupToDelete(groupes[activeTab].nom);
                        setIsDeleteModalOpen(true);
                      }} 
                      className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-[var(--radius)] border border-rose-500/10 transition-all cursor-pointer"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2 scrollbar-hide border-b border-white/5">
                  {groupData.transactions.filter(t => t.montant > 0).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02]">
                      <div className="w-16 h-16 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mb-4 text-2xl opacity-20">💸</div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Aucune transaction</p>
                      <p className="text-[11px] font-bold text-[var(--primary)]/40 mt-1 uppercase text-center px-4">Le journal des dépenses est vide</p>
                    </div>
                  ) : (
                    groupData.transactions.filter(t => t.montant > 0).map((t, i) => (
                      <div 
                        key={t.id || i} 
                        className="group relative overflow-hidden min-h-[85px] flex items-center p-4 bg-white/[0.02] hover:bg-[var(--glass-bg)] transition-all border-b border-white/5 first:rounded-[var(--radius)]"
                      >
                        <div className={`flex items-center justify-between w-full transition-all duration-300 ${deletingId === t.id ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                          <div>
                            <p className="text-[10px] text-[var(--text-main)]/20 font-bold uppercase">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                            <p className="text-sm font-bold text-[var(--text-main)]/80">{t.libellé || t.libelle}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[12px] filter drop-shadow-sm">{getEmojiForMember(t.payé_par || t.paye_par) || "👤"}</span>
                              <p className="text-[9px] text-[var(--primary)] font-black uppercase tracking-widest">Par {t.payé_par || t.paye_par}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <span className="font-black text-sm text-[var(--text-main)]/90">{t.montant}€</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
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
                                }}
                                className="p-2 text-[var(--text-main)]/40 hover:text-[var(--primary)] cursor-pointer"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => setDeletingId(t.id)} 
                                className="p-2 text-[var(--text-main)]/40 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Confirmation suppression en ligne */}
                        {deletingId === t.id && (
                          <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-[var(--glass-blur)] flex items-center justify-between px-6 animate-in slide-in-from-right duration-300">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-rose-500 text-[var(--text-main)] rounded-[var(--radius)] flex items-center justify-center">
                                <Trash2 size={14} />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Supprimer ?</span>
                                <span className="text-[8px] text-rose-500/60 font-bold uppercase">Cette action est définitive</span>
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setDeletingId(null)}
                                className="px-4 py-2 text-[10px] font-black uppercase text-[var(--text-main)]/40 hover:text-[var(--text-main)] cursor-pointer"
                              >
                                Annuler
                              </button>
                              <button 
                                onClick={() => executeDelete(t.id)}
                                className="px-5 py-2 bg-rose-500 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest rounded-[var(--radius)] hover:bg-rose-600 cursor-pointer"
                              >
                                Confirmer
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <button 
                  onClick={() => handleDownloadPDF()} 
                  className="w-full py-5 bg-[var(--primary)] hover:bg-[var(--primary)]/50 text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-[0.3em] transition-all cursor-pointer shadow-xl"
                >
                  Bilan Complet (PDF)
                </button>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 bg-[var(--glass-bg)] rounded-[var(--radius)] border border-white/10">
            <div className="w-20 h-20 bg-[var(--primary)]/20 text-[var(--primary)] rounded-[var(--radius)] flex items-center justify-center mb-6 shadow-inner">
              <Plus size={40} strokeWidth={3} />
            </div>
            <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter mb-2">Aucun groupe actif</h3>
            <p className="text-[var(--text-main)]/30 text-[10px] font-bold uppercase tracking-widest">Initialisez un projet pour commencer</p>
          </div>
        )}
      </div>

      {/* ==========================================================
          2. VERSION MOBILE
          ========================================================== */}
      <div className="block lg:hidden">
        <TricountMobile 
          userId={userId}
          groupes={groupes}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          groupData={groupData}
          isModalOpen={isModalOpen}
          setIsModalOpen={setIsModalOpen}
          newGroupName={newGroupName}
          setNewGroupName={setNewGroupName}
          handleCreateGroup={handleCreateGroup}
          isDeleteModalOpen={isDeleteModalOpen}
          setIsDeleteModalOpen={setIsDeleteModalOpen}
          groupToDelete={groupToDelete}
          setGroupToDelete={setGroupToDelete}
          handleDeleteGroup={handleDeleteGroup}
          isEditModalOpen={isEditModalOpen}
          setIsEditModalOpen={setIsEditModalOpen}
          groupToEdit={groupToEdit}
          setGroupToEdit={setGroupToEdit}
          handleRenameGroup={handleRenameGroup}
          handleDownloadPDF={handleDownloadPDF}
          editingTransaction={editingTransaction}
          setEditingTransaction={setEditingTransaction}
          handleUpdateTransaction={handleUpdateTransaction}
          deletingId={deletingId}
          setDeletingId={setDeletingId}
          executeDelete={executeDelete}
          participantsDuGroupe={participantsDuGroupe}
          updateMontantIndividuel={updateMontantIndividuel}
          newTransaction={newTransaction}
          setNewTransaction={setNewTransaction}
          notification={notification}
          showToast={showToast}
          handleCreateTransaction={handleCreateTransaction}
          totalReparti={totalReparti}
          resteARepartir={resteARepartir}
          estEquilibre={estEquilibre}
          handleAjouterMembreLocal={handleAjouterMembreLocal}
          handleSupprimerMembreLocal={handleSupprimerMembreLocal}
          activeEmojiPicker={activeEmojiPicker}
          setActiveEmojiPicker={setActiveEmojiPicker}
          handleSetEmoji={handleSetEmoji}
          getEmojiForMember={getEmojiForMember}
          shareToken={shareToken}
          handleShareGroup={handleShareGroup}
        />
      </div>
    </>
  );
}