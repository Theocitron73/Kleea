import React, { useState, useEffect } from 'react';
import { Building2, AlertTriangle, ArrowRight, Lock, Plus, Zap, FileUp } from 'lucide-react';
import api from '../axios';
import CustomSelect from '../components/CustomSelect';

export default function ProfileTab({ 
  user, powensData, comptes, syncCountByAccount = {}, 
  handleAssociateAccount, setActiveTab, importMode, setImportMode, 
  onAutoSync, showNotify, fetchPowensConnections, fetchComptes, handleConnectNewBank 
}) {
  const [profileData, setProfileData] = useState(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState({ type: '', msg: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const isAdmin = user?.toLowerCase() === 'theo';

  const fetchProfileAndStats = async () => {
    try {
      setError(false);
      const [profileRes, statsRes] = await Promise.all([
        api.get(`/profile/${user}`),
        api.get(`/transactions/stats/count/${user}`)
      ]);

      if (profileRes.data) {
        setProfileData(profileRes.data);
        setEditName(profileRes.data.name || '');
        setEditEmail(profileRes.data.email || '');
      } else {
        setError(true);
      }

      if (statsRes.data) {
        setTransactionCount(statsRes.data.user_transactions_count || 0);
      }
    } catch (err) {
      console.error("Erreur chargement profil:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(true);
      return;
    }
    fetchProfileAndStats();
  }, [user]);

  useEffect(() => {
    if (profileData?.import_mode && typeof setImportMode === 'function') {
      setImportMode(profileData.import_mode);
    }
  }, [profileData]);

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      await api.put(`/profile/${user}/details`, {
        name: editName,
        email: editEmail
      });
      setProfileData(prev => ({ ...prev, name: editName, email: editEmail }));
      setIsEditing(false);
    } catch (err) {
      alert("Impossible de mettre à jour les informations.");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;

    try {
      setPasswordLoading(true);
      setPasswordStatus({ type: '', msg: '' });
      await api.put(`/profile/${user}/password`, { new_password: newPassword });
      setPasswordStatus({ type: 'success', msg: 'Mot de passe mis à jour !' });
      setNewPassword('');
      setTimeout(() => setShowPasswordForm(false), 2000);
    } catch (err) {
      setPasswordStatus({ type: 'error', msg: 'Erreur lors de la modification.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      await api.delete(`/profile/${user}`);
      localStorage.clear(); 
      window.location.reload(); 
    } catch (err) {
      alert("Une erreur est survenue lors de la suppression.");
      setDeleteLoading(false);
    }
  };

  const handleToggleImportMode = async (mode) => {
    try {
      await api.put(`/profile/${user}/import-mode`, { import_mode: mode });
      if (typeof setImportMode === 'function') setImportMode(mode);
      setProfileData(prev => prev ? { ...prev, import_mode: mode } : prev);
      
      if (mode === 'auto') {
        if (typeof showNotify === 'function') showNotify("Mode automatique activé : synchronisation en cours... ⚡", 'success');
        if (typeof onAutoSync === 'function') onAutoSync('auto');
      } else {
        if (typeof showNotify === 'function') showNotify("Mode d'import défini sur : Manuel (CSV) 📂", 'success');
      }
    } catch (err) {
      console.error("Erreur mode import:", err);
    }
  };

  const handleDisconnectPowens = async () => {
    try {
      setDisconnectLoading(true);
      await api.delete(`/powens/disconnect/${user}`);
      localStorage.removeItem("powens_user_token");
      if (typeof fetchComptes === 'function') await fetchComptes();
      if (typeof fetchPowensConnections === 'function') await fetchPowensConnections();
      if (typeof showNotify === 'function') showNotify("Banques déconnectées avec succès.", "success");
      setShowDisconnectConfirm(false);
    } catch (err) {
      alert("Erreur lors de la déconnexion des banques.");
    } finally {
      setDisconnectLoading(false);
    }
  };

  const onConnectBank = async () => {
    if (typeof handleConnectNewBank === 'function') {
      handleConnectNewBank();
      return;
    }
    try {
      setConnectLoading(true);
      const nomUtilisateur = typeof user === 'object' ? user?.nom || user?.email : user;
      const redirectUri = window.location.origin + window.location.pathname;
      const existingToken = localStorage.getItem('powens_user_token') || '';

      const resUrl = await api.get(
        `/powens/connect-url?utilisateur=${encodeURIComponent(nomUtilisateur)}&redirect_url=${encodeURIComponent(redirectUri)}&user_token=${encodeURIComponent(existingToken)}`
      );

      const url = resUrl.data?.url || resUrl.data?.redirect_url;
      if (url) window.location.href = url;
    } catch (err) {
      alert("Erreur lors de la redirection bancaire.");
    } finally {
      setConnectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 border-2 border-t-transparent border-[var(--primary)] rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase text-white/30 tracking-[0.2em]">Chargement du coffre...</p>
      </div>
    );
  }

  const data = error || !profileData ? {
    username: user || "Non défini",
    email: "email@non-configure.fr",
    name: "Utilisateur Kleea"
  } : profileData;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* HEADER */}
      <div 
        className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 relative overflow-hidden"
        style={{ boxShadow: `0 0 30px -15px var(--primary)` }}
      >
        <div className="absolute top-[-20%] right-[-10%] w-[120px] h-[120px] bg-[var(--primary)]/10 blur-[40px] rounded-full" />
        <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-[var(--primary)] flex items-center justify-center text-2xl font-black text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] border border-white/20 shrink-0">
            {((data.name || data.username || "U").substring(0, 1).toUpperCase())}
          </div>
          <div className="text-center sm:text-left leading-tight">
            <h3 className="text-xl font-black text-white tracking-tight uppercase">{data.name}</h3>
            <p className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest mt-0.5">
              {isAdmin ? 'Fondateur Kleea' : 'Membre Kleea Premium'}
            </p>
            <p className="text-[8px] font-semibold text-white/30 uppercase tracking-[0.2em] mt-1">@{data.username}</p>
          </div>
        </div>
      </div>

      {/* DÉTAILS DU COMPTE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Infos personnelles */}
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em]">Détails Personnels</h4>
              {!isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-[8px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 px-2 py-0.5 rounded-md transition uppercase tracking-wider"
                >
                  Modifier
                </button>
              )}
            </div>
            
            {!isEditing ? (
              <div className="space-y-2">
                <div>
                  <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Nom Complet</span>
                  <span className="text-xs font-bold text-white">{data.name}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Identifiant</span>
                  <span className="text-xs font-bold text-white/50">@{data.username}</span>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Adresse E-mail</span>
                  <span className="text-xs font-bold text-white/80 break-all">{data.email}</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveDetails} className="space-y-2">
                <div>
                  <label className="text-[8px] font-bold text-white/30 uppercase block tracking-wider mb-0.5">Nom Complet</label>
                  <input 
                    type="text" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[var(--primary)] transition"
                    required 
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-white/30 uppercase block tracking-wider mb-0.5">Identifiant (Non modifiable)</label>
                  <input 
                    type="text" 
                    value={`@${data.username}`} 
                    disabled 
                    className="w-full bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-xs font-semibold text-white/30 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-white/30 uppercase block tracking-wider mb-0.5">Adresse E-mail</label>
                  <input 
                    type="email" 
                    value={editEmail} 
                    onChange={e => setEditEmail(e.target.value)} 
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[var(--primary)] transition"
                    required 
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button 
                    type="submit" 
                    disabled={editLoading}
                    className="bg-[var(--primary)] text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition"
                  >
                    {editLoading ? 'Enregistrement...' : 'Sauvegarder'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setIsEditing(false); setEditName(data.name); setEditEmail(data.email); }}
                    className="bg-white/5 text-white/70 font-bold text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition border border-white/5"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Sécurité */}
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-3 flex flex-col justify-between">
          <div>
            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em] mb-2">Sécurité du Coffre</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Type de compte</span>
                  <span className="text-[10px] font-black text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded-md inline-block mt-0.5 uppercase">
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Transactions</span>
                  <span className="text-xs font-black text-white bg-white/5 px-2 py-0.5 rounded-md inline-block mt-0.5 border border-white/5 shadow-inner">
                    {transactionCount}
                  </span>
                </div>
              </div>
              
              <div className="pt-1">
                <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Statut du mot de passe</span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-bold text-emerald-400">Sécurisé</span>
                  <button 
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="text-[8px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 px-2 py-0.5 rounded-md transition uppercase tracking-wider"
                  >
                    {showPasswordForm ? 'Annuler' : 'Changer'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[8px] font-bold text-white/20 uppercase block tracking-wider">Version App</span>
            <span className="text-[10px] font-black text-white/60">Kleea v.4.1</span>
          </div>
        </div>

        {/* Mode d'import Global */}
        <div className="md:col-span-2 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em]">Mode d'importation Global</h4>
            <p className="text-[10px] text-white/50 leading-relaxed">Basculez entre l'import automatique Powens et l'import de relevés manuel.</p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 w-fit shrink-0 select-none">
            <button
              type="button"
              onClick={() => handleToggleImportMode('auto')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                importMode === 'auto' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap size={12} className={importMode === 'auto' ? 'text-amber-300 fill-amber-300' : 'opacity-60'} />
              <span>Automatique</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleImportMode('manual')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                importMode === 'manual' ? 'bg-[var(--primary)] text-white shadow-md' : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileUp size={12} className={importMode === 'manual' ? 'text-white' : 'opacity-60'} />
              <span>Manuel</span>
            </button>
          </div>
        </div>
      </div>

      {/* FORMULAIRE CHANGER MOT DE PASSE */}
      {showPasswordForm && (
        <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-300">
          <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em] mb-2">Mettre à jour le mot de passe</h4>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div>
              <label className="text-[8px] font-bold text-white/40 uppercase block tracking-wider mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-[var(--primary)] transition shadow-inner"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${passwordStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {passwordStatus.msg}
              </span>
              <button
                type="submit"
                disabled={passwordLoading}
                className="bg-[var(--primary)] hover:opacity-90 disabled:opacity-50 text-white font-black text-[10px] uppercase tracking-widest px-4 py-1.5 rounded-lg transition"
              >
                {passwordLoading ? 'Chiffrement...' : 'Confirmer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION BANCAIRE / POWENS */}
      <div className="relative z-20 overflow-visible bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 p-4 space-y-3">
        <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-[9px] uppercase font-bold text-[var(--text-main)] select-none">
          <span className="flex items-center gap-2 truncate pr-2">
            <Building2 size={14} className="text-[var(--primary)] shrink-0" />
            <span className="truncate text-[10px] font-black tracking-wider">
              Association de vos comptes en banque réels & ceux sur Kleea ({powensData?.accounts_count || 0})
            </span>
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onConnectBank}
              disabled={connectLoading}
              className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <Plus size={10} strokeWidth={3} />
              <span>{connectLoading ? "Redirection..." : "Connecter une banque"}</span>
            </button>

            {powensData?.connections && powensData.connections.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer active:scale-95"
              >
                Tout déconnecter
              </button>
            )}
          </div>
        </div>

        {showDisconnectConfirm && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-rose-300 tracking-wider">Supprimer définitivement l'accès Powens ?</span>
                <p className="text-[9px] text-white/60 leading-relaxed mt-0.5">
                  Cette action va révoquer votre jeton, délier vos comptes Kleea et <strong>effacer définitivement votre identifiant et toutes vos connexions bancaires chez Powens</strong>.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(false)}
                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-white/60 text-[8px] font-bold uppercase rounded-lg transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDisconnectPowens}
                disabled={disconnectLoading}
                className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-[8px] font-black uppercase tracking-wider rounded-lg transition-all shadow-md shadow-rose-500/20 cursor-pointer disabled:opacity-50"
              >
                {disconnectLoading ? "Suppression en cours..." : "Confirmer la suppression"}
              </button>
            </div>
          </div>
        )}

        {(!powensData?.connections || powensData.connections.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center bg-black/20 rounded-xl border border-dashed border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 text-white/40">
              <Building2 size={18} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider">Aucun compte bancaire synchronisé</p>
              <p className="text-[10px] text-white/40 max-w-xs mx-auto">Connectez votre banque via Powens pour synchroniser vos soldes et opérations automatiquement.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('importer')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[var(--primary)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider transition-all shadow-lg cursor-pointer"
            >
              <span>Synchroniser une banque</span>
              <ArrowRight size={12} />
            </button>
          </div>
        ) : (
          <div className="space-y-3 overflow-visible">
            {powensData.connections.map((conn, connIndex) => {
              const connAccounts = powensData.accounts?.filter(
                (acc) => acc.connection_id === conn.id || acc.bank_name === conn.connector_name
              ) || [];

              if (connAccounts.length === 0) return null;

              return (
                <div 
                  key={conn.id} 
                  style={{ zIndex: 40 - (connIndex * 10) }}
                  className="space-y-2 bg-black/20 p-3 rounded-xl border border-white/5 overflow-visible relative focus-within:z-[100]"
                >
                  <div className="flex items-center justify-between text-[9px] font-black text-[var(--primary)] uppercase px-1 border-b border-white/5 pb-1.5">
                    <span>{conn.connector_name}</span>
                    <span className="text-[8px] text-[var(--text-main)]/30 font-mono">ID: {conn.id}</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-0.5 overflow-visible">
                    {connAccounts.map((acc, index) => {
                      const associatedLocalAccount = comptes?.find(
                        (c) => (c.powens_name || "").trim().toUpperCase() === (acc.name || "").trim().toUpperCase()
                      );

                      const isAssociated = Boolean(associatedLocalAccount);
                      const siteAccountName = associatedLocalAccount ? associatedLocalAccount.compte : acc.name;
                      const isDesynced = Boolean(syncCountByAccount[siteAccountName] || syncCountByAccount[acc.name]);

                      const selectOptions = [
                        { v: "", l: "-- Aucun --" },
                        ...(comptes?.map((c) => ({ v: c.compte, l: c.compte })) || [])
                      ];

                      return (
                        <div 
                          key={acc.id} 
                          style={{ zIndex: 50 - index }}
                          className="relative overflow-visible flex flex-col justify-between gap-1.5 py-2 px-2.5 rounded-lg bg-white/[0.02] border border-white/5 focus-within:z-50"
                        >
                          <div className="flex items-center justify-between text-[9px]">
                            <div className="flex items-center gap-1.5 truncate pr-1">
                              <span className="text-[var(--text-main)] font-semibold truncate">{acc.name}</span>
                              {!isAssociated ? (
                                <span className="px-1 py-0.2 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20 text-[6px] font-black uppercase tracking-wider shrink-0">Non lié</span>
                              ) : isDesynced ? (
                                <span className="px-1 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[6px] font-black uppercase tracking-wider animate-pulse shrink-0">Sync requis</span>
                              ) : (
                                <span className="px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[6px] font-black uppercase tracking-wider shrink-0">Synchro</span>
                              )}
                            </div>
                            <span className="font-bold text-[var(--text-main)] shrink-0 text-[9px]">
                              {acc.balance !== null && acc.balance !== undefined ? `${acc.balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${acc.currency}` : "—"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-white/5">
                            <span className="text-[7px] uppercase tracking-wider text-[var(--text-main)]/40 font-bold shrink-0">Lié à :</span>
                            <div className="w-full">
                              <CustomSelect
                                value={associatedLocalAccount ? associatedLocalAccount.compte : ""}
                                options={selectOptions}
                                onChange={(selectedVal) => handleAssociateAccount?.(acc.name, selectedVal)}
                                className="px-2 py-1 rounded-lg text-[8px]"
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
        )}
      </div>

      {/* ZONE DANGER SUPPRESSION */}
      <div className="bg-rose-500/5 backdrop-blur-md p-4 rounded-2xl border border-rose-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-[9px] font-black text-rose-400 uppercase tracking-[0.22em]">Supprimer mon compte</h4>
            <p className="text-[10px] text-white/40 mt-0.5">Supprimer définitivement le compte Kleea et toutes les données du coffre.</p>
          </div>
          {!showDeleteConfirm && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-[9px] font-bold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-2.5 py-1 rounded-lg transition uppercase tracking-wider shrink-0 ml-2"
            >
              Supprimer
            </button>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="pt-2 border-t border-rose-500/10 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-[10px] font-semibold text-rose-300/80">⚠️ Attention : Action irréversible. Toutes vos données seront purgées.</p>
            <div className="flex flex-col gap-1 max-w-sm">
              <label className="text-[8px] font-black text-white/40 uppercase tracking-wider">
                Veuillez écrire <span className="text-rose-400 select-all font-mono bg-rose-500/10 px-1 py-0.5 rounded">delete</span> :
              </label>
              <input
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Écrivez 'delete' ici"
                disabled={deleteLoading}
                className="bg-slate-950/40 border border-white/10 focus:border-rose-500/40 text-xs text-white rounded-lg px-2.5 py-1.5 outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={deleteLoading || deleteInput !== 'delete'}
                onClick={handleDeleteAccount}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white font-black text-[9px] uppercase tracking-widest px-3 py-1.5 rounded-lg"
              >
                {deleteLoading ? 'Purge...' : 'Oui, détruire mon compte'}
              </button>
              <button
                disabled={deleteLoading}
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                className="bg-white/5 text-white/80 font-bold text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}