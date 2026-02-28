import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");
    
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
            return;
        }

        try {
            await axios.post('http://127.0.0.1:8000/reset-password-confirm', {
                token: token,
                new_password: newPassword
            });
            setMessage({ type: 'success', text: 'Mot de passe mis à jour ! Redirection...' });
            setTimeout(() => navigate('/'), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Lien invalide ou expiré.' });
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* EFFETS DE FOND (Identiques au Login) */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full" />

            <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
                <form 
                    onSubmit={handleSubmit}
                    className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/20 shadow-2xl w-full"
                    style={{ boxShadow: `0 0 40px -10px var(--primary), inset 0 0 20px -10px var(--primary)` }}
                >
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                            Nouveau <span className="text-[var(--primary)]">Code</span>
                        </h2>
                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2">
                            Sécurisez à nouveau votre coffre
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase ml-4 tracking-[0.2em]">Nouveau mot de passe</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                <input 
                                    type="password"
                                    className="w-full bg-white/5 border border-white/5 p-4 pl-12 rounded-2xl text-white text-sm font-bold outline-none focus:border-[var(--primary)]/40 transition-all"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/30 uppercase ml-4 tracking-[0.2em]">Confirmer</label>
                            <input 
                                type="password"
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-white text-sm font-bold outline-none focus:border-[var(--primary)]/40 transition-all"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="w-full mt-10 bg-white text-black p-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[var(--primary)] hover:text-white transition-all duration-500">
                        Réinitialiser
                    </button>

                    {message.text && (
                        <p className={`mt-6 text-[10px] font-black uppercase text-center tracking-widest ${message.type === 'error' ? 'text-red-500' : 'text-[var(--primary)]'}`}>
                            {message.text}
                        </p>
                    )}
                </form>

                <button onClick={() => navigate('/')} className="w-full mt-6 flex items-center justify-center gap-2 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] hover:text-white transition-colors">
                    <ArrowLeft size={12} /> Retour au login
                </button>
            </div>
        </div>
    );
};

export default ResetPassword;