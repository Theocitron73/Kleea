import { useEffect, useState } from 'react';
import {
  User, Mail, Lock, Eye, EyeOff, BookOpen, ShieldCheck, ChevronLeft, RefreshCw, ChartLine, Users2,
  ShieldAlert, UserX, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import api from '../axios';
import GuideView from '../GuideView';
import { lireMessageDeconnexion } from '../utils/sessions';

/** `modeInitial` : « register » quand on arrive par « Créer un compte ». `onRetour` ramène à la page d'accueil. */
export default function AuthView({ onLoginSuccess, modeInitial = 'login', onRetour }) {
  const [isRegistering, setIsRegistering] = useState(modeInitial === 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showPublicGuide, setShowPublicGuide] = useState(false);
  const [jetonDoubleAuth, setJetonDoubleAuth] = useState(null);
  const [codeDoubleAuth, setCodeDoubleAuth] = useState('');
  const [emailDoubleAuth, setEmailDoubleAuth] = useState('');

  // Retour ici après une déconnexion à distance : on dit pourquoi.
  useEffect(() => {
    const message = lireMessageDeconnexion();
    if (message) toast.info(message, { duration: 8000 });
  }, []);

  const terminerConnexion = (data) => {
    const username = data.user.toLowerCase();
    const role = (data.role || 'user').toLowerCase(); // 👈 Récupération du rôle

    // Le jeton reste dans le cookie HttpOnly posé par l'API : il n'est pas rangé ici.
    localStorage.setItem('user', username);
    localStorage.setItem('role', role); // 👈 Sauvegarde locale

    onLoginSuccess(username, role);
  };

  // Deuxième étape, seulement pour les comptes qui ont activé la double authentification.
  const validerCode = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login/double-auth', { jeton: jetonDoubleAuth, code: codeDoubleAuth });
      terminerConnexion(res.data);
    } catch (err) {
      setCodeDoubleAuth('');
      // Jeton de 5 minutes dépassé : seul le mot de passe peut en redonner un.
      if (err.response?.data?.detail?.startsWith('Connexion expirée')) setJetonDoubleAuth(null);
      toast.error(err.response?.data?.detail || 'Impossible de vérifier ce code. Réessayez.');
    }
  };

  const renvoyerCode = async () => {
    try {
      await api.post('/login/double-auth/renvoyer', { jeton: jetonDoubleAuth });
      toast.success('Un nouveau code vient de partir.');
    } catch (err) {
      if (err.response?.data?.detail?.startsWith('Connexion expirée')) setJetonDoubleAuth(null);
      toast.error(err.response?.data?.detail || "Impossible d'envoyer un nouveau code. Réessayez.");
    }
  };

  // 1. Connexion avec gestion des erreurs et icônes Lucide
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/login', {
        nom: loginName,
        password: loginPassword
      });

      if (res.data.double_auth_requise) {
        setJetonDoubleAuth(res.data.jeton_double_auth);
        setEmailDoubleAuth(res.data.methode === 'application' ? null : res.data.email_masque);
        setLoginPassword('');
        return;
      }
      terminerConnexion(res.data);
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

      const usernameClean = (res.data?.user || loginName).toLowerCase();
      localStorage.setItem('user', usernameClean);
      toast.success("Compte créé ! Bienvenue chez Kleea.");
      onLoginSuccess(usernameClean);
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
    } catch  {
      toast.error("Erreur lors de la demande.");
    }
  };

  // Mode Guide Public
  if (showPublicGuide) {
    return (
      <div className="min-h-screen bg-[var(--surface)] text-white p-4 md:p-8 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl w-full mx-auto flex items-center justify-between mb-6 p-4 bg-[var(--glass-bg)] border border-white/10 rounded-2xl relative z-10 backdrop-blur-[var(--glass-blur)]">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-[var(--secondary)]" aria-hidden="true" />
            <h3 className="text-base font-semibold">Guide d'utilisation</h3>
          </div>
          <button
            onClick={() => setShowPublicGuide(false)}
            className="flex items-center gap-2 h-10 px-4 bg-white text-black font-semibold text-sm rounded-xl hover:opacity-90 transition active:scale-95 cursor-pointer"
          >
            Retour à la connexion
          </button>
        </div>

        <div className="flex-1 max-w-7xl w-full mx-auto relative z-10 overflow-hidden">
          <GuideView />
        </div>
      </div>
    );
  }

  const mode = isForgotPassword ? 'oubli' : (isRegistering ? 'inscription' : 'connexion');
  const TITRES = {
    connexion: ['Bon retour', 'Connectez-vous pour retrouver vos comptes.'],
    inscription: ['Créer votre compte', 'Quelques informations, et votre espace est prêt.'],
    oubli: ['Mot de passe oublié', 'Indiquez l’adresse e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.'],
    code: ['Vérification', emailDoubleAuth
      ? `Saisissez le code à 6 chiffres envoyé à ${emailDoubleAuth}. Il est valable 10 minutes.`
      : 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.'],
  };
  const [titre, sousTitre] = TITRES[jetonDoubleAuth ? 'code' : mode];
  const choisirMode = (inscription) => { setIsForgotPassword(false); setIsRegistering(inscription); };

  const formulaire = jetonDoubleAuth ? (
    <form onSubmit={validerCode} className="mt-7 space-y-5">
      <Champ id="code-double-auth" label="Code de vérification">
        <input
          id="code-double-auth"
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          className={`${SAISIE} !pl-4 text-center text-[18px] tracking-[0.4em] tabular-nums`}
          placeholder="123456"
          value={codeDoubleAuth}
          onChange={(e) => setCodeDoubleAuth(e.target.value)}
          required
        />
      </Champ>
      <button type="submit" className={PRINCIPAL}>Vérifier</button>
      <div className="flex flex-wrap justify-between gap-3 text-[14px]">
        <button type="button" onClick={() => { setJetonDoubleAuth(null); setCodeDoubleAuth(''); }} className={LIEN_DISCRET}>Retour à la connexion</button>
        {emailDoubleAuth && <button type="button" onClick={renvoyerCode} className={LIEN}>Renvoyer un code</button>}
      </div>
    </form>
  ) : (
    <>
      {mode !== 'oubli' && (
        <div role="group" aria-label="Connexion ou inscription" className="mt-7 grid grid-cols-2 p-1 rounded-xl bg-white/[0.06]">
          {[[false, 'Se connecter'], [true, 'Créer un compte']].map(([inscription, libelle]) => (
            <button key={libelle} type="button" aria-pressed={isRegistering === inscription} onClick={() => choisirMode(inscription)}
              className={`h-[36px] rounded-[9px] text-[14px] font-semibold transition-colors cursor-pointer ${isRegistering === inscription ? 'bg-white/[0.12] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-main)]/60 hover:text-[var(--text-main)]'}`}>
              {libelle}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={isForgotPassword ? handleResetRequest : (isRegistering ? handleRegister : handleLogin)} className="mt-6 space-y-[18px]">
        {mode === 'oubli' ? (
          <Champ id="email-recuperation" label="Adresse e-mail" icone={Mail}>
            <input id="email-recuperation" type="email" autoComplete="email" className={SAISIE} placeholder="vous@exemple.fr"
              value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
          </Champ>
        ) : (
          <>
            {isRegistering && (
              <div className="grid grid-cols-2 gap-3">
                <Champ id="prenom" label="Prénom">
                  <input id="prenom" autoComplete="given-name" className={`${SAISIE} !pl-4`} placeholder="Jean" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </Champ>
                <Champ id="nom" label="Nom">
                  <input id="nom" autoComplete="family-name" className={`${SAISIE} !pl-4`} placeholder="Dupont" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </Champ>
              </div>
            )}
            <Champ id="identifiant" label="Identifiant" icone={User}>
              <input id="identifiant" autoComplete="username" className={SAISIE} placeholder={isRegistering ? 'Votre pseudo' : 'Pseudo ou adresse e-mail'}
                value={loginName} onChange={(e) => setLoginName(e.target.value)} required />
            </Champ>
            {isRegistering && (
              <Champ id="email" label="Adresse e-mail" icone={Mail}>
                <input id="email" type="email" autoComplete="email" className={SAISIE} placeholder="vous@exemple.fr" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </Champ>
            )}
            <Champ id="mot-de-passe" label="Mot de passe" icone={Lock}
              action={!isRegistering && <button type="button" onClick={() => setIsForgotPassword(true)} className={LIEN}>Oublié ?</button>}>
              <input id="mot-de-passe" type={showPassword ? 'text' : 'password'} autoComplete={isRegistering ? 'new-password' : 'current-password'}
                className={`${SAISIE} pr-12`} placeholder={isRegistering ? 'Au moins 8 caractères' : 'Votre mot de passe'}
                value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-[36px] rounded-lg flex items-center justify-center text-[var(--text-main)]/45 hover:text-[var(--text-main)] transition-colors cursor-pointer">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </Champ>
          </>
        )}
        <button type="submit" className={PRINCIPAL}>
          {mode === 'oubli' ? 'Envoyer le lien' : (isRegistering ? 'Créer mon compte' : 'Se connecter')}
        </button>
        {mode === 'inscription' && (
          <p className="text-[12px] leading-5 text-[var(--text-main)]/50">
            Vos données sont traitées comme décrit dans la <Link to="/confidentialite" className="underline hover:text-[var(--text-main)]">politique de confidentialité</Link>.
          </p>
        )}
        {mode === 'oubli' && (
          <button type="button" onClick={() => setIsForgotPassword(false)} className={`${LIEN_DISCRET} text-[14px]`}>Retour à la connexion</button>
        )}
      </form>
    </>
  );

  return (
    <div className="page-connexion min-h-screen lg:h-screen lg:overflow-hidden bg-[var(--surface)] text-[var(--text-main)] lg:grid lg:grid-cols-[1.15fr_1fr]">
      {onRetour && (
        <button type="button" onClick={onRetour} className="fixed top-5 left-5 z-50 inline-flex items-center gap-1 h-[36px] px-2 rounded-lg text-[14px] font-medium text-[var(--text-main)]/70 hover:text-[var(--text-main)] transition-colors cursor-pointer">
          <ChevronLeft size={18} aria-hidden="true" /> Accueil
        </button>
      )}

      {/* Ce qu'est Kleea : seulement sur grand écran, le formulaire reste seul sur téléphone. */}
      <section aria-label="Présentation de Kleea" className="hidden lg:flex relative flex-col h-screen overflow-hidden pt-24 pl-16 xl:pl-20 bg-[radial-gradient(1100px_650px_at_10%_-10%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_60%)]">
        <div className="flex items-center gap-2.5 mb-10">
          <img src="/Kleea_2.png" alt="" className="w-9 h-[36px] rounded-[10px]" />
          <span className="text-[20px] font-bold tracking-[-0.01em]">Kleea</span>
        </div>
        <h1 className="text-[44px] xl:text-[48px] leading-[1.06] font-bold tracking-[-0.025em] max-w-[34rem]">
          Vos finances,<br /><span className="text-[color-mix(in_srgb,var(--primary)_55%,var(--text-main))]">enfin claires.</span>
        </h1>
        <p className="mt-4 max-w-[30rem] text-[17px] leading-relaxed text-[var(--text-main)]/70">
          Comptes, budgets, prévisions et patrimoine au même endroit, synchronisés avec votre banque.
        </p>
        <ul className="mt-7 space-y-3 text-[15px] text-[var(--text-main)]/70">
          {ATOUTS.map(([icone, texte]) => {
            const Icone = icone;
            return (
              <li key={texte} className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-[9px] flex items-center justify-center bg-[var(--primary)]/15 text-[color-mix(in_srgb,var(--primary)_55%,var(--text-main))] shrink-0"><Icone size={16} aria-hidden="true" /></span>
                {texte}
              </li>
            );
          })}
        </ul>
        {/* Prend toute la place restante sous le texte, sans faire défiler la page : coupée en bas, elle dépasse un peu à droite. */}
        <div className="mt-11 flex-1 min-h-0 w-[115%] rounded-t-2xl border border-b-0 border-white/10 overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <img src="/apercu/tableau-de-bord-ordinateur.jpg" alt="Le tableau de bord de Kleea, avec des données d’exemple" className="block w-full h-full object-cover object-left-top" />
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-[var(--surface)]" />
      </section>

      <main className="min-h-screen lg:h-screen lg:overflow-y-auto flex justify-center items-start lg:items-center px-5 pt-20 pb-10 lg:p-8 lg:border-l lg:border-white/5 lg:bg-black/20">
        <div className="w-full max-w-[380px] animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="lg:hidden flex items-center gap-2.5 mb-7">
            <img src="/Kleea_2.png" alt="" className="w-10 h-10 rounded-[11px]" />
            <span className="text-[20px] font-bold tracking-[-0.01em]">Kleea</span>
          </div>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.02em]">{titre}</h2>
          <p className="mt-2 text-[15px] text-[var(--text-main)]/70">{sousTitre}</p>

          {formulaire}

          <div className="mt-7 pt-5 border-t border-white/[0.07] space-y-3">
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-main)]/50">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" aria-hidden="true" />
              Connexion chiffrée · double authentification disponible
            </p>
            <button type="button" onClick={() => setShowPublicGuide(true)} className={`${LIEN_DISCRET} inline-flex items-center gap-1.5 text-[14px]`}>
              <BookOpen size={16} aria-hidden="true" /> Guide d'utilisation
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const SAISIE = 'w-full h-[48px] pl-11 pr-4 rounded-xl border border-white/10 bg-white/[0.05] text-[15px] text-[var(--text-main)] outline-none transition placeholder:text-[var(--text-main)]/40 focus:border-[color-mix(in_srgb,var(--primary)_60%,white)] focus:bg-white/[0.07] focus:ring-4 focus:ring-[var(--primary)]/25';
const PRINCIPAL = 'w-full h-[50px] rounded-xl bg-[var(--primary)] text-white text-[16px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_24px_color-mix(in_srgb,var(--primary)_35%,transparent)] hover:brightness-110 active:scale-[0.98] transition cursor-pointer';
const LIEN = 'font-medium text-[color-mix(in_srgb,var(--primary)_55%,var(--text-main))] hover:underline cursor-pointer';
const LIEN_DISCRET = 'font-medium text-[var(--text-main)]/65 hover:text-[var(--text-main)] transition-colors cursor-pointer';
const ATOUTS = [
  [RefreshCw, 'Opérations importées automatiquement depuis votre banque'],
  [ChartLine, 'Prévisions et budgets qui se répètent chaque mois'],
  [Users2, 'Un compte commun à deux, chacun avec sa connexion'],
];

/** Un champ du formulaire : son libellé au-dessus, une action à droite (« Oublié ? »), l'icône dans la saisie. */
function Champ({ id, label, icone: Icone, action, children }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-semibold text-[var(--text-main)]/70">{label}</label>
        {action && <span className="text-[13px]">{action}</span>}
      </div>
      <div className="relative mt-1.5">
        {Icone && <Icone size={18} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-main)]/45 pointer-events-none" />}
        {children}
      </div>
    </div>
  );
}
