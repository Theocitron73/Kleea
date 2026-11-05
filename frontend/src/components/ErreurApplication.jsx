import React from 'react';
import { signalerErreur } from '../utils/suiviErreurs';

/** Une erreur d'affichage ne doit pas laisser une page blanche. */
export default class ErreurApplication extends React.Component {
  constructor(props) {
    super(props);
    this.state = { enErreur: false };
  }

  static getDerivedStateFromError() {
    return { enErreur: true };
  }

  componentDidCatch(erreur) {
    signalerErreur(erreur);
  }

  render() {
    if (!this.state.enErreur) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-[var(--text-main)]">
        <div role="alert" className="max-w-sm w-full text-center space-y-4 p-8 bg-[var(--surface)] border border-white/10 rounded-[var(--radius)] shadow-2xl">
          <h1 className="text-lg font-black">Une erreur est survenue</h1>
          <p className="text-sm text-white/60">L'affichage a rencontré un problème. Vos données ne sont pas perdues.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-[var(--primary)] text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}
