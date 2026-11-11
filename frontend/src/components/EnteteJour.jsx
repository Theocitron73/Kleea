// En-tête d'un jour dans les listes de Gérer et du Prévisionnel : le carré de date, le jour de la semaine et le total.
const MOIS_COURTS = ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
const euros = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

export default function EnteteJour({ date, total, nombre, libelle = 'opération' }) {
  const d = new Date(`${String(date).slice(0, 10)}T12:00:00`);
  const valide = !Number.isNaN(d.getTime());
  const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // Le carré donne déjà le jour et le mois : à l'écran, le texte ne reprend que le jour de la semaine.
  const semaine = valide ? majuscule(d.toLocaleDateString('fr-FR', { weekday: 'long' })) : 'Sans date';
  const complete = valide ? majuscule(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })) : 'Sans date';
  return (
    <div className="flex items-center gap-3 px-3 pt-4 pb-1.5">
      <div aria-hidden="true" className="w-11 h-11 shrink-0 flex flex-col items-center justify-center rounded-xl bg-[var(--glass-bg)] border border-white/10 shadow-lg">
        <span className="text-[15px] font-black leading-none text-[var(--text-main)] tabular-nums">{valide ? String(d.getDate()).padStart(2, '0') : '–'}</span>
        <span className="mt-0.5 text-[8px] font-bold tracking-widest text-[var(--secondary)]/70">{valide ? MOIS_COURTS[d.getMonth()] : ''}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[var(--text-main)]/85">
          <span aria-hidden="true">{semaine}</span>
          <span className="sr-only">{complete}</span>
        </p>
        <p className="text-[11px] text-[var(--text-main)]/40">{nombre} {libelle}{nombre > 1 ? 's' : ''}</p>
      </div>
      <span className={`shrink-0 text-[12px] font-semibold tabular-nums ${total > 0 ? 'text-emerald-400/80' : total < 0 ? 'text-rose-400/80' : 'text-[var(--text-main)]/45'}`}>{euros(total)}</span>
    </div>
  );
}
