import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function StreamDeckTokenCard() {
  const [status, setStatus] = useState(null);
  const [newToken, setNewToken] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // null | 'regenerate' | 'revoke'

  useEffect(() => {
    api.get('/api/streamdeck/token')
      .then(res => setStatus(res.data))
      .catch(() => setStatus({ error: true }));
  }, []);

  const generate = async () => {
    setBusy(true);
    try {
      const res = await api.post('/api/streamdeck/token');
      setNewToken(res.data.token);
      setStatus({ active: true, created_at: res.data.created_at });
    } catch {
      toast.error('Impossible de générer le jeton.');
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const revoke = async () => {
    setBusy(true);
    try {
      await api.delete('/api/streamdeck/token');
      setNewToken(null);
      setStatus({ active: false, created_at: null });
      toast.success('Jeton révoqué : le Stream Deck n’a plus accès à vos données.');
    } catch {
      toast.error('Impossible de révoquer le jeton.');
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  };

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copié dans le presse-papiers.');
    } catch {
      toast.error('Copie impossible : sélectionnez le texte manuellement.');
    }
  };

  const secondaryButton = 'bg-white/5 hover:bg-white/10 text-white/70 font-bold text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition border border-white/5 cursor-pointer disabled:opacity-40';
  const primaryButton = 'bg-[var(--primary)] text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md transition cursor-pointer disabled:opacity-40';

  return (
    <div className="bg-white/5 backdrop-blur-[var(--glass-blur)] p-4 rounded-2xl border border-white/5 space-y-3">
      <div>
        <h4 className="text-[9px] font-black text-white/40 uppercase tracking-[0.22em] mb-1">Stream Deck</h4>
        <p className="text-[10px] font-semibold text-white/50 leading-relaxed">
          Affichez vos soldes, le bilan du mois et les transactions à importer sur vos touches. Ce jeton permet de lire ces chiffres et de demander une actualisation bancaire, comme le bouton Actualiser de la page Importer.
        </p>
      </div>

      {status === null && <p className="text-[10px] font-semibold text-white/30">Chargement…</p>}
      {status?.error && <p className="text-[10px] font-semibold text-rose-400">Statut du jeton indisponible.</p>}

      {newToken && (
        <div className="bg-black/40 border border-[var(--primary)]/40 rounded-xl p-3 space-y-2">
          <p className="text-[10px] font-bold text-white">
            Copiez ce jeton maintenant : il ne sera plus jamais affiché.
          </p>
          <code className="block text-[10px] text-white/80 break-all select-all">{newToken}</code>
          <button type="button" onClick={() => copy(newToken)} className={primaryButton}>Copier le jeton</button>
        </div>
      )}

      {status && !status.error && (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-wider">URL du serveur (à saisir dans le plugin)</span>
            <button type="button" onClick={() => copy(API_URL)} className={secondaryButton}>Copier</button>
          </div>
          <code className="block text-[10px] text-white/60 break-all">{API_URL}</code>

          <p className="text-[10px] font-semibold text-white/60">
            {status.active
              ? `Jeton actif depuis le ${new Date(status.created_at).toLocaleDateString('fr-FR')}.`
              : 'Aucun jeton actif.'}
          </p>

          {confirming ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-rose-300">
                {confirming === 'regenerate'
                  ? 'L’ancien jeton cessera de fonctionner : il faudra saisir le nouveau dans le plugin.'
                  : 'Le Stream Deck n’aura plus accès à vos données.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={confirming === 'regenerate' ? generate : revoke}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-40"
                >
                  Confirmer
                </button>
                <button type="button" disabled={busy} onClick={() => setConfirming(null)} className={secondaryButton}>
                  Annuler
                </button>
              </div>
            </div>
          ) : status.active ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => setConfirming('regenerate')} className={secondaryButton}>Regénérer</button>
              <button type="button" disabled={busy} onClick={() => setConfirming('revoke')} className={secondaryButton}>Révoquer</button>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={generate} className={primaryButton}>
              {busy ? 'Génération…' : 'Générer un jeton'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
