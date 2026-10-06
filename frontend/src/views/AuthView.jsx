import React, { useState } from 'react';
import { 
  User, Mail, Lock, Eye, EyeOff, BookOpen, 
  ShieldAlert, UserX, WifiOff 
} from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../axios';
import GuideView from '../GuideView';

export default function AuthView({ onLoginSuccess, userTheme }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showPublicGuide, setShowPublicGuide] = useState(false);

  // 1. Connexion avec gestion des erreurs et icônes Lucide
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', { 
        nom: loginName,
        password: loginPassword 
      });
      
      const token = res.data.access_token;
      const username = res.data.user.toLowerCase();

      localStorage.setItem('token', token);
      localStorage.setItem('user', username);
      onLoginSuccess(token, username);
    } catch (err) {
      if (err.response && err.response.status === 403) {
        const messageDetail = err.response.data?.detail || "Trop d'échecs. Votre adresse IP a été suspendue temporairement.";
        toast.error(messageDetail, {
          duration: 8000,
          icon: (
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
              <ShieldAlert size={16} strokeWidth={2.5} />
            </div>
          )
        });
      } else if (err.response && err.response.status === 401) {
        const messageDetail = err.response.data?.detail || "Mot de passe incorrect.";
        toast.error(messageDetail, {
          duration: 5000,
          icon: (
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)] mr-2.5">
              <Lock size={15} strokeWidth={2.5} />
            </div>
          )
        });
      } else if (err.response && err.response.status === 404) {
        toast.error("Identifiant ou adresse e-mail inconnu.", {
          duration: 4000,
          icon: (
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
              <UserX size={16} strokeWidth={2.5} />
            </div>
          )
        });
      } else if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Impossible de joindre le serveur Kleea.", {
          icon: (
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)] mr-2.5">
              <WifiOff size={15} strokeWidth={2.5} />
            </div>
          )
        });
      }
    }
  };

  // 2. Inscription
  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/register`, { 
        nom: loginName, 
        email: loginEmail,
        password: loginPassword,
        first_name: firstName, 
        last_name: lastName
      });

      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }
      
      const usernameClean = (res.data?.user || loginName).toLowerCase();
      localStorage.setItem('user', usernameClean);
      toast.success("Compte créé ! Bienvenue chez Kleea.");
      onLoginSuccess(res.data?.access_token, usernameClean);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'inscription.");
    }
  };

  // 3. Demande de réinitialisation
  const handleResetRequest = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/forgot-password`, { email: resetEmail });
      toast.success("Si cet email existe, un lien vous a été envoyé.");
      setIsForgotPassword(false);
    } catch (err) {
      toast.error("Erreur lors de la demande.");
    }
  };

  // Mode Guide Public
  if (showPublicGuide) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between mb-6 p-4 bg-[var(--glass-bg)] border border-white/10 rounded-2xl relative z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="text-xl">📖</span>
            <div>
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Accès Public</span>
              <h3 className="text-sm font-black uppercase mt-1">Guide d'utilisation</h3>
            </div>
          </div>
          <button 
            onClick={() => setShowPublicGuide(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all shadow-lg active:scale-95 cursor-pointer"
          >
            Retour à la connexion
          </button>
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto relative z-10 overflow-hidden">
          <GuideView userTheme={userTheme} setActiveTab={() => setShowPublicGuide(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full" />
      <div className="absolute w-[500px] h-[600px] bg-[var(--primary)]/30 blur-[100px] rounded-full z-0" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <form 
          onSubmit={isForgotPassword ? handleResetRequest : (isRegistering ? handleRegister : handleLogin)} 
          className="bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] p-10 rounded-[3rem] border border-white/20 shadow-2xl w-full"
          style={{ 
            boxShadow: `0 0 40px -10px var(--primary), inset 0 0 20px -10px var(--primary)` 
          }}
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full mb-4">
              <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">
                {isForgotPassword ? "Récupération" : (isRegistering ? "Nouveau Membre" : "Accès Sécurisé")}
              </span>
            </div>
            <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              <span className="text-[var(--primary)]">Kleea</span>
            </h2>
            <p className="text-[10px] font-bold text-[var(--text-main)]/20 uppercase tracking-widest mt-2">
              {isForgotPassword ? "Réinitialisation du coffre" : (isRegistering ? "Créez votre coffre privé" : "Gestion de patrimoine privé")}
            </p>
          </div>

          <div className="space-y-4">
            {isForgotPassword ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">E-mail de récupération</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      type="email"
                      className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="votre@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {isRegistering && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Prénom</label>
                      <input 
                        className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={isRegistering}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Nom</label>
                      <input 
                        className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={isRegistering}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Identifiant</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="Pseudo ou Adresse e-mail"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {isRegistering && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">E-mail</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                      <input 
                        type="email"
                        className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="theo@exemple.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">Mot de passe</label>
                    {!isRegistering && (
                      <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[8px] font-black text-[var(--primary)] uppercase tracking-[0.1em] hover:brightness-150 transition-all cursor-pointer"
                      >
                        Mot de passe Oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-[var(--glass-bg)] border border-white/5 p-4 pl-12 pr-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-[var(--glass-bg)] transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 hover:text-[var(--text-main)] transition-colors p-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          <button 
            type="submit" 
            className="w-full mt-10 bg-white text-black p-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[var(--primary)] hover:text-[var(--text-main)] transition-all duration-500 shadow-xl active:scale-95 cursor-pointer"
          >
            {isForgotPassword ? "Envoyer le lien" : (isRegistering ? "Créer mon compte" : "Se connecter")}
          </button>
        </form>

        <button 
          onClick={() => {
            if (isForgotPassword) setIsForgotPassword(false);
            else setIsRegistering(!isRegistering);
          }}
          className="w-full mt-6 text-[10px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] hover:text-[var(--primary)] transition-colors cursor-pointer"
        >
          {isForgotPassword ? "Retour à la connexion" : (isRegistering ? "Déjà un compte ? Se connecter" : "Nouveau ici ? Créer un compte")}
        </button>

        <button 
          type="button"
          onClick={() => setShowPublicGuide(true)}
          className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] hover:brightness-125 transition-all cursor-pointer"
        >
          <BookOpen size={12} />
          <span>Consulter le Guide d'utilisation</span>
        </button>
      </div>
    </div>
  );
}