import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Trash2, Edit2, Smile, AlertCircle, CheckCircle, 
  Share2, Users, Calendar, X, FileText 
} from 'lucide-react';
import DatePicker from "react-datepicker";
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { createPortal } from 'react-dom';
import api from '../axios';
import { toLocalDateString, getTodayLocalDateString } from "../utils/dateUtils";

// 🟢 Helper de conversion en centimes entiers (anti-erreur d'arrondi 0.1 + 0.2)
const toCents = (val) => Math.round((parseFloat(val) || 0) * 100);

export default function TricountManager({ userId }) {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [groupData, setGroupData] = useState({ transactions: [], transferts: [] });

  // Navigation interne spécifique au mode mobile
  const [mobileSection, setMobileSection] = useState('bilan'); // 'bilan' | 'ajouter' | 'membres'

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
    date: getTodayLocalDateString(),
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

  // --- PARTICIPANTS DU GROUPE ---
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

  // Calculs précis en centimes
  const montantGlobalCents = toCents(newTransaction.montant);
  const totalRepartiCents = Object.values(newTransaction.details_montants || {}).reduce(
    (acc, curr) => acc + toCents(curr), 
    0
  );
  const totalReparti = totalRepartiCents / 100;
  const resteARepartirCents = montantGlobalCents - totalRepartiCents;
  const resteARepartir = resteARepartirCents / 100;
  const estEquilibre = resteARepartirCents === 0;

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

    if (!estEquilibre) {
      showToast(`Déséquilibre de ${Math.abs(resteARepartir).toFixed(2)}€. Ajustez les parts.`, "error");
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

  // Helper de structure pour le bilan des remboursements
  const bilanParPersonne = useMemo(() => {
    const map = {};
    (groupData.transferts || []).forEach(t => {
      const emetteur = t.de.trim();
      const recepteur = t.a.trim();
      if (!map[emetteur]) map[emetteur] = { donne: [], recoit: [], solde: 0 };
      if (!map[recepteur]) map[recepteur] = { donne: [], recoit: [], solde: 0 };
      
      map[emetteur].donne.push(t);
      map[emetteur].solde -= t.montant;
      map[recepteur].recoit.push(t);
      map[recepteur].solde += t.montant;
    });
    return map;
  }, [groupData.transferts]);

  return (
    <div className="p-2 sm:p-4 w-full mx-auto min-h-screen bg-transparent text-[var(--text-main)] relative animate-in fade-in duration-300 pb-28 lg:pb-6 select-none">
      
      {/* Toast Notification */}
      <div className={`fixed top-6 right-6 z-[200] transition-all duration-500 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
        <div className={`relative overflow-hidden backdrop-blur-[var(--glass-blur)] border p-4 sm:p-5 rounded-[var(--radius)] shadow-2xl min-w-[280px] sm:min-w-[320px] ${
          notification.type === 'error' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              notification.type === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            </div>
            <div>
              <h4 className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Système</h4>
              <p className="text-xs font-bold text-[var(--text-main)]/90 leading-tight">{notification.message}</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          1. HEADER COMPACT (UNIFIÉ PC / MOBILE)
          ========================================================================= */}
      <div className="flex justify-between items-center mb-3 p-3 rounded-2xl bg-[var(--glass-bg)] border border-white/10 shrink-0">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Tricount</h2>
          <p className="text-[var(--text-main)]/30 text-[8.5px] sm:text-[9px] font-bold uppercase tracking-widest mt-0.5">
            {groupes.length} Groupe{groupes.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {groupes.length > 0 && (
            <button 
              type="button"
              onClick={handleShareGroup} 
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white px-3 py-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 font-black uppercase text-[9px] transition-all cursor-pointer shadow-md"
              title="Partager ce Tricount"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Partager</span>
            </button>
          )}
          <button 
            type="button"
            onClick={() => setIsModalOpen(true)} 
            className="bg-[var(--primary)] hover:brightness-110 active:scale-95 text-white px-3 py-2 sm:p-3 rounded-xl flex items-center gap-1.5 sm:gap-2 font-black uppercase text-[9px] transition-all cursor-pointer shadow-md"
          >
            <Plus size={13} strokeWidth={3} />
            <span>Nouveau</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. SÉLECTEUR DE GROUPES (SWIPE HORIZONTAL)
          ========================================================================= */}
      <div className="flex gap-1.5 sm:gap-2 p-1.5 overflow-x-auto mb-4 no-scrollbar bg-black/20 rounded-2xl border border-white/5 select-none shrink-0">
        {groupes.map((grp, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setActiveTab(index)}
            className={`py-2 px-4 sm:px-5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              activeTab === index 
              ? "bg-[var(--glass-bg)] text-[var(--text-main)] border border-white/10 shadow-lg" 
              : "text-[var(--text-main)]/30 hover:text-[var(--text-main)]/70"
            }`}
          >
            {grp.nom}
          </button>
        ))}
      </div>

      {groupes.length > 0 ? (
        <div className="space-y-4 lg:space-y-6">

          {/* SÉLECTEUR D'ONGLETS MOBILE (UNIQUEMENT VISIBLE SUR SMARTPHONE : lg:hidden) */}
          <div className="flex lg:hidden border-b border-white/5 mb-3 select-none shrink-0">
            <button 
              type="button"
              onClick={() => setMobileSection('bilan')}
              className={`flex-1 py-2.5 text-center text-[9.5px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                mobileSection === 'bilan' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Remboursements & Journal
            </button>
            <button 
              type="button"
              onClick={() => setMobileSection('ajouter')}
              className={`flex-1 py-2.5 text-center text-[9.5px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                mobileSection === 'ajouter' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Ajouter Dépense
            </button>
            <button 
              type="button"
              onClick={() => setMobileSection('membres')}
              className={`flex-1 py-2.5 text-center text-[9.5px] font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
                mobileSection === 'membres' 
                  ? 'border-[var(--primary)] text-[var(--primary)]' 
                  : 'border-transparent text-white/40'
              }`}
            >
              Membres ({participantsDuGroupe.length})
            </button>
          </div>

          {/* =========================================================================
              3. GRILLE CENTRALE UNIFIÉE (4 COLONNES CÔTE-À-CÔTE SUR PC / ONGLETS SUR MOBILE)
              ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0 items-start">

            {/* --- COLONNE 1 : GESTION DU GROUPE (MEMBRES) --- */}
            <div className={`${mobileSection === 'membres' ? 'block' : 'hidden'} lg:block xl:col-span-1 space-y-4 sm:space-y-6`}>
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 bg-[var(--primary)] rounded-full" />
                <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.25em]">Membres du Groupe</h4>
              </div>

              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5">
                {/* Ajout de membre */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--primary)] ml-1">Nouveau membre</label>
                  <div className="relative">
                    <input 
                      type="text"
                      id="input-nouveau-membre"
                      placeholder="Prénom du membre..."
                      className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-2xl p-3 sm:p-3.5 pr-11 text-[var(--text-main)] text-xs sm:text-sm font-bold outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]/20"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAjouterMembreLocal(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('input-nouveau-membre');
                        handleAjouterMembreLocal(input.value);
                        input.value = "";
                      }}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[var(--primary)] hover:brightness-110 active:scale-95 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <hr className="border-white/5" />

                {/* Liste des membres */}
                <div className="space-y-2.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-1">
                    Participants ({participantsDuGroupe.length})
                  </label>
                  
                  <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1 custom-scrollbar">
                    {participantsDuGroupe.map(membre => (
                      <div key={`manage-${membre}`} className="group flex items-center justify-between p-2.5 bg-[var(--glass-bg)] border border-white/5 rounded-2xl hover:border-[var(--primary)]/30 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0 pr-1">
                          <div className="relative shrink-0">
                            <div 
                              onClick={() => setActiveEmojiPicker(activeEmojiPicker === membre ? null : membre)}
                              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center text-lg shadow-sm cursor-pointer transition-all ${
                                activeEmojiPicker === membre 
                                  ? 'bg-[var(--primary)] border-[var(--primary)] scale-105' 
                                  : 'bg-white/5 border-white/10 hover:border-[var(--primary)]/50'
                              }`}
                            >
                              <span className="drop-shadow-sm">
                                {getEmojiForMember(membre) || membre.substring(0, 1).toUpperCase()}
                              </span>
                            </div>

                            {activeEmojiPicker === membre && createPortal(
                              <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActiveEmojiPicker(null)} />
                                <div className="relative shadow-2xl animate-in zoom-in-95 duration-200">
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

                          <span className="text-xs font-bold text-white/90 truncate">{membre}</span>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => handleSupprimerMembreLocal(membre)} 
                          className="opacity-80 lg:opacity-0 group-hover:opacity-100 p-1.5 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Retirer ce membre"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {participantsDuGroupe.length === 0 && (
                    <p className="text-[10px] text-center text-white/20 py-4 italic">
                      Aucun membre pour le moment
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* --- COLONNE 2 : NOUVELLE DÉPENSE --- */}
            <div className={`${mobileSection === 'ajouter' ? 'block' : 'hidden'} lg:block xl:col-span-1 space-y-4 sm:space-y-6`}>
              <div className="flex items-center gap-2 px-1">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.25em]">Nouvelle dépense</h4>
              </div>
              
              <div className="bg-[#0f172a] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Désignation</label>
                    <input 
                      type="text"
                      value={newTransaction.libelle}
                      onChange={(e) => setNewTransaction({...newTransaction, libelle: e.target.value})}
                      placeholder="Pizza, courses..."
                      className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--primary)] transition-all placeholder:text-white/20"
                    />
                  </div>

                  <div>
                    <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Date</label>
                    <div className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-xl px-2.5 py-1.5 text-white">
                      <DatePicker
                        selected={newTransaction.date ? new Date(newTransaction.date) : null}
                        onChange={(date) => {
                          if (date) setNewTransaction({ ...newTransaction, date: date.toISOString().split('T')[0] });
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-xs font-bold w-full cursor-pointer text-center"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Montant Total (€)</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={newTransaction.montant}
                    onChange={(e) => setNewTransaction({...newTransaction, montant: parseFloat(e.target.value) || 0})}
                    className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-[var(--primary)] block">Payé par</label>
                  <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/25 rounded-2xl border border-white/5">
                    {participantsDuGroupe.map(p => (
                      <button
                        key={`payeur-${p}`}
                        type="button"
                        onClick={() => setNewTransaction({...newTransaction, paye_par: p})}
                        className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all cursor-pointer ${
                          newTransaction.paye_par === p 
                            ? 'bg-[var(--primary)] text-white shadow-sm' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Répartition individuelle */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8.5px] font-black uppercase tracking-widest text-emerald-400">Pour qui ?</label>
                    <button 
                      type="button"
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
                      className="text-[8px] font-bold text-white/30 hover:text-emerald-400 uppercase transition-colors cursor-pointer"
                    >
                      Répartir équitablement
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {participantsDuGroupe.map(p => {
                      const isSelected = newTransaction.details_montants && newTransaction.details_montants.hasOwnProperty(p);
                      return (
                        <div key={`part-${p}`} className="space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              const newDetails = { ...newTransaction.details_montants };
                              if (isSelected) delete newDetails[p];
                              else newDetails[p] = 0;
                              setNewTransaction({...newTransaction, details_montants: newDetails});
                            }}
                            className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer text-left ${
                              isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-black/20 border-transparent opacity-40'
                            }`}
                          >
                            <span className="text-[10.5px] font-bold uppercase truncate pr-1">{p}</span>
                            <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`}>
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </span>
                          </button>

                          {isSelected && (
                            <div className="flex items-center gap-1 pl-1">
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
                                className="w-full bg-[var(--glass-bg)] border border-white/10 rounded-lg py-1 px-2 text-right text-xs text-white font-mono outline-none focus:border-emerald-500"
                              />
                              <span className="text-[9px] text-white/30">€</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Reliquat et Équilibre */}
                  <div className={`p-3 rounded-2xl border transition-all ${
                    estEquilibre 
                      ? 'bg-emerald-500/10 border-emerald-500/20' 
                      : 'bg-rose-500/10 border-rose-500/20 animate-pulse'
                  }`}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[8.5px] font-black uppercase tracking-wider text-white/40">
                        {resteARepartir > 0 ? "Reste à répartir" : resteARepartir < 0 ? "Trop réparti" : "✓ Répartition équilibrée"}
                      </span>
                      <span className={`font-mono font-black ${estEquilibre ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {resteARepartir.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleCreateTransaction}
                  className="w-full py-3.5 bg-white text-black hover:bg-emerald-500 hover:text-white rounded-2xl font-black text-[9.5px] uppercase tracking-[0.2em] transition-all shadow-xl cursor-pointer active:scale-95"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </div>
            
            {/* --- COLONNE 3 : BILAN DES REMBOURSEMENTS --- */}
            <div className={`${mobileSection === 'bilan' ? 'flex' : 'hidden'} lg:flex lg:col-span-2 flex-col lg:h-[calc(90vh-180px)] space-y-4 sm:space-y-6`}>
              <div className="flex items-center gap-2 px-1 shrink-0">
                <div className="h-2 w-2 bg-[var(--primary)] rounded-full animate-pulse" />
                <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.25em]">
                  Bilan des remboursements
                </h4>
              </div>

              <div className="flex-1 min-h-0 pr-1 custom-scrollbar overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const membresExistants = participantsDuGroupe && participantsDuGroupe.length > 0;
                    const transfertsExistants = groupData.transferts && groupData.transferts.length > 0;

                    if (!membresExistants) {
                      return (
                        <div className="col-span-full h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                          <div className="w-16 h-16 bg-indigo-500/5 rounded-full flex items-center justify-center mb-3 text-2xl">👥</div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Groupe vide</h5>
                          <p className="text-[10px] font-bold text-indigo-400/50 uppercase tracking-wider text-center px-6">Ajoutez des membres pour commencer.</p>
                        </div>
                      );
                    }

                    if (!transfertsExistants) {
                      return (
                        <div className="col-span-full h-full min-h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                          <div className="w-16 h-16 bg-emerald-500/5 rounded-full flex items-center justify-center mb-3 text-2xl">✨</div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Comptes équilibrés</h5>
                          <p className="text-[10px] font-bold text-emerald-400/50 uppercase tracking-wider text-center px-6">Tout le monde est à jour !</p>
                        </div>
                      );
                    }

                    return Object.keys(bilanParPersonne).map((nom) => (
                      <div 
                        key={`bilan-${nom}`} 
                        className="bg-[var(--glass-bg)] border border-white/10 rounded-3xl p-5 hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-4 shadow-xl"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-lg">
                                <span className="drop-shadow-sm">{getEmojiForMember(nom) || nom.substring(0, 1).toUpperCase()}</span>
                              </div>
                              <div>
                                <span className="block font-black text-white uppercase tracking-tight text-sm leading-none">{nom}</span>
                                <span className="text-[8.5px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Membre actif</span>
                              </div>
                            </div>
                            
                            <div className={`text-base font-black font-mono tracking-tight ${bilanParPersonne[nom].solde >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {bilanParPersonne[nom].solde > 0 ? "+" : ""}
                              {bilanParPersonne[nom].solde.toFixed(2)}€
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[9.5px] font-bold">
                            {bilanParPersonne[nom].recoit.map((t, idx) => (
                              <div key={idx} className="flex justify-between text-emerald-400 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                <span className="uppercase tracking-wider">Reçoit de {t.de}</span>
                                <span className="font-mono font-black">{t.montant.toFixed(2)}€</span>
                              </div>
                            ))}
                            
                            {bilanParPersonne[nom].donne.map((t, idx) => (
                              <div key={idx} className="flex justify-between text-rose-400 p-2 rounded-xl bg-rose-500/5 border border-rose-500/10">
                                <span className="uppercase tracking-wider">Donne à {t.a}</span>
                                <span className="font-mono font-black">{t.montant.toFixed(2)}€</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button 
                          type="button"
                          onClick={() => handleDownloadPDF(nom)} 
                          className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[8.5px] font-black uppercase tracking-wider text-white/50 hover:text-white transition-all border border-white/5 cursor-pointer mt-1"
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
            <div className={`${mobileSection === 'bilan' ? 'flex' : 'hidden'} lg:flex flex-col lg:h-[calc(90vh-180px)] space-y-4 sm:space-y-6`}>
              <div className="flex items-center justify-between px-1 shrink-0">
                <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.25em]">Historique</h4>
                <div className="flex gap-1.5">
                  <button 
                    type="button"
                    onClick={() => {
                      setGroupToEdit({ oldName: groupes[activeTab].nom, newName: groupes[activeTab].nom });
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 bg-[var(--glass-bg)] hover:bg-white/10 rounded-xl border border-white/10 transition-all text-white/60 hover:text-[var(--primary)] cursor-pointer"
                    title="Renommer ce groupe"
                  >
                    <Edit2 size={13}/>
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setGroupToDelete(groupes[activeTab].nom);
                      setIsDeleteModalOpen(true);
                    }} 
                    className="p-2 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                    title="Supprimer ce groupe"
                  >
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {groupData.transactions.filter(t => t.montant > 0).length === 0 ? (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.02]">
                    <div className="w-14 h-14 bg-[var(--glass-bg)] rounded-full flex items-center justify-center mb-3 text-xl opacity-20">💸</div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">Aucune transaction</p>
                  </div>
                ) : (
                  groupData.transactions.filter(t => t.montant > 0).map((t, i) => (
                    <div 
                      key={t.id || i} 
                      className="group relative overflow-hidden p-3 bg-white/[0.02] hover:bg-white/[0.04] transition-all border border-white/5 rounded-2xl"
                    >
                      <div className={`flex items-center justify-between w-full transition-all duration-300 ${deletingId === t.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="min-w-0 pr-2">
                          <span className="text-[8px] text-white/30 font-bold uppercase block">
                            {new Date(t.date).toLocaleDateString('fr-FR')}
                          </span>
                          <span className="text-xs font-bold text-white/90 block truncate mt-0.5">
                            {t.libellé || t.libelle || "Sans nom"}
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-xs">{getEmojiForMember(t.payé_par || t.paye_par) || "👤"}</span>
                            <span className="text-[8.5px] text-[var(--primary)] font-black uppercase tracking-wider">
                              Par {t.payé_par || t.paye_par}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono font-black text-xs text-white">
                            {parseFloat(t.montant).toFixed(2)} €
                          </span>
                          <div className="flex gap-1 opacity-80 lg:opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              type="button"
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
                              className="p-1.5 text-white/40 hover:text-[var(--primary)] cursor-pointer"
                              title="Modifier la dépense"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDeletingId(t.id)} 
                              className="p-1.5 text-white/40 hover:text-rose-400 cursor-pointer"
                              title="Supprimer la dépense"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Confirmation suppression en ligne */}
                      {deletingId === t.id && (
                        <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-md flex items-center justify-between px-4 animate-in fade-in duration-200">
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-400">
                            Supprimer définitivement ?
                          </span>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setDeletingId(null)} 
                              className="px-2.5 py-1 text-[8.5px] font-black uppercase text-white/40 hover:text-white cursor-pointer"
                            >
                              Non
                            </button>
                            <button 
                              type="button"
                              onClick={() => executeDelete(t.id)} 
                              className="px-3 py-1 bg-rose-500 text-white text-[8.5px] font-black uppercase tracking-wider rounded-lg hover:bg-rose-600 transition-all cursor-pointer"
                            >
                              Oui
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <button 
                type="button"
                onClick={() => handleDownloadPDF()} 
                className="w-full py-3.5 bg-[var(--primary)] hover:brightness-110 text-white rounded-2xl font-black text-[9px] uppercase tracking-[0.2em] transition-all cursor-pointer shadow-xl active:scale-95 shrink-0"
              >
                Bilan Complet (PDF)
              </button>
            </div>

          </div>
        </div>
      ) : !loading ? (
        <div className="flex flex-col items-center justify-center p-16 sm:p-20 bg-[var(--glass-bg)] rounded-3xl border border-white/10 text-center">
          <div className="w-16 h-16 bg-[var(--primary)]/20 text-[var(--primary)] rounded-2xl flex items-center justify-center mb-4">
            <Plus size={32} strokeWidth={3} />
          </div>
          <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight mb-1">Aucun groupe actif</h3>
          <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest">Créez votre premier groupe pour partager des frais</p>
        </div>
      ) : null}

      {/* =========================================================================
          4. MODALES PARTAGÉES (ÉCRITES UNE SEULE FOIS POUR LES DEUX MONDES)
          ========================================================================= */}

      {/* MODALE ÉDITION TRANSACTION */}
      {editingTransaction && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setEditingTransaction(null)} />
          <div 
            className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[85vh] overflow-y-auto custom-scrollbar space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h3 className="text-sm font-black uppercase tracking-wider text-[var(--primary)]">Modifier la dépense</h3>
              <button onClick={() => setEditingTransaction(null)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Libellé</label>
                  <input 
                    type="text"
                    value={editingTransaction.libellé || editingTransaction.libelle || ""}
                    onChange={(e) => setEditingTransaction({...editingTransaction, libellé: e.target.value, libelle: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Date</label>
                  <div className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-white">
                    <DatePicker
                      selected={editingTransaction.date ? new Date(editingTransaction.date) : null}
                      onChange={(date) => {
                        if (date) setEditingTransaction({ ...editingTransaction, date: toLocalDateString(date) });
                      }}
                      dateFormat="dd/MM/yyyy"
                      className="bg-transparent border-none outline-none text-xs font-bold w-full cursor-pointer text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[8.5px] font-black uppercase tracking-widest text-white/40 block mb-1">Montant Total (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editingTransaction.montant}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditingTransaction({...editingTransaction, montant: val});
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[8.5px] font-black uppercase tracking-widest text-[var(--primary)] block">Payé par</label>
                <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/20 rounded-xl border border-white/5">
                  {participantsDuGroupe.map(personne => (
                    <button
                      key={personne}
                      type="button"
                      onClick={() => setEditingTransaction({...editingTransaction, payé_par: personne, paye_par: personne})}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                        (editingTransaction.payé_par || editingTransaction.paye_par) === personne 
                          ? 'bg-[var(--primary)] text-white shadow-sm' 
                          : 'text-white/40 hover:text-white'
                      }`}
                    >
                      {personne}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[8.5px] font-black uppercase tracking-widest text-emerald-400">Répartition des frais</label>
                  <button 
                    type="button"
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
                    className="text-[8px] font-bold text-emerald-400/80 hover:text-emerald-300 uppercase cursor-pointer"
                  >
                    Réinitialiser (Équitable)
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {participantsDuGroupe.map(personne => (
                    <div key={personne} className="flex items-center justify-between p-2 bg-black/30 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-white/80">{personne}</span>
                      <div className="flex items-center gap-1.5">
                        <input 
                          type="number"
                          step="0.01"
                          value={editingTransaction.details_montants?.[personne] ?? ""} 
                          onChange={(e) => updateMontantIndividuel(personne, e.target.value)}
                          placeholder="0.00"
                          className="w-20 bg-black/50 border border-white/10 rounded-lg py-1 px-2.5 text-right text-xs text-white font-mono outline-none focus:border-emerald-500"
                        />
                        <span className="text-[9px] text-white/30">€</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setEditingTransaction(null)} 
                className="py-2.5 rounded-xl bg-white/5 text-white/60 text-[9px] font-black uppercase tracking-wider hover:bg-white/10 transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={handleUpdateTransaction} 
                className="py-2.5 rounded-xl bg-[var(--primary)] text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CRÉATION GROUPE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
          <div 
            className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest leading-none">Nouveau Groupe</h4>
                <p className="text-[9px] text-white/30 uppercase font-bold mt-1">Définissez le nom de votre projet</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <input 
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="NOM DU GROUPE..."
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-[var(--primary)] placeholder:text-white/20"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup();
              }}
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setIsModalOpen(false)} className="py-2.5 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/60 hover:bg-white/10 cursor-pointer">Annuler</button>
              <button onClick={handleCreateGroup} className="py-2.5 rounded-xl bg-[var(--primary)] text-[9px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE RENOMMER GROUPE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsEditModalOpen(false)} />
          <div 
            className="relative w-full max-w-sm bg-[#0f172a] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl z-10 animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div>
                <h4 className="text-xs font-black uppercase text-[var(--primary)] tracking-widest leading-none">Modifier le nom</h4>
                <p className="text-[9px] text-white/30 uppercase font-bold mt-1">Ancien nom : {groupToEdit.oldName}</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1 text-white/40 hover:text-white cursor-pointer"><X size={16} /></button>
            </div>

            <input 
              autoFocus
              value={groupToEdit.newName}
              onChange={(e) => setGroupToEdit({...groupToEdit, newName: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-bold uppercase tracking-wider text-white outline-none focus:border-[var(--primary)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameGroup();
              }}
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setIsEditModalOpen(false)} className="py-2.5 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/60 hover:bg-white/10 cursor-pointer">Annuler</button>
              <button onClick={handleRenameGroup} className="py-2.5 rounded-xl bg-[var(--primary)] text-[9px] font-black uppercase tracking-wider text-white shadow-lg active:scale-95 cursor-pointer">Sauvegarder</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION GROUPE */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setIsDeleteModalOpen(false)} />
          <div 
            className="relative w-full max-w-sm bg-[#0f172a] border border-rose-500/20 rounded-3xl p-6 sm:p-8 shadow-2xl z-10 text-center animate-in zoom-in-95 duration-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <Trash2 size={24} />
            </div>

            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-white">Supprimer le groupe ?</h3>
              <p className="text-[10px] text-white/40 mt-1 italic">"{groupToDelete}" sera définitivement effacé.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="py-2.5 rounded-xl bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/60 hover:bg-white/10 cursor-pointer">Garder</button>
              <button onClick={handleDeleteGroup} className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 cursor-pointer">Supprimer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}