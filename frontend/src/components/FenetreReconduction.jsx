import { useState } from 'react';
import { Calendar, CalendarRange, X } from 'lucide-react';
import CustomSelect from './CustomSelect';

const NOMS_MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const sansAccent = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Reconduction mensuelle (vers le mois ou l'année choisis) ou annuelle.
function FenetreReconduction({ confirmPropagateToYear, duplicateType, filters, handleConfirmDuplicate, selectedIds2, setDuplicateModal }) {
  const anneeSource = Number(filters.annee);
  const moisSource = NOMS_MOIS.findIndex(m => sansAccent(m) === sansAccent(filters.mois));
  // Par défaut : le mois suivant
  const [moisCible, setMoisCible] = useState(moisSource === 11 ? 0 : moisSource + 1);
  const [anneeCible, setAnneeCible] = useState(moisSource === 11 ? anneeSource + 1 : anneeSource);
  const annees = [anneeSource - 1, anneeSource, anneeSource + 1, anneeSource + 2];
  const memeMois = moisCible !== 'tous' && Number(moisCible) === moisSource && Number(anneeCible) === anneeSource;
  const libelleCible = moisCible === 'tous' ? `tous les mois de ${anneeCible}` : `${NOMS_MOIS[moisCible]} ${anneeCible}`;
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-[var(--glass-blur)] animate-in fade-in duration-200">
      {/* Calque de fond cliquable pour fermer */}
      <div className="absolute inset-0" onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} />

      {/* Conteneur de la Modale - Entièrement centré et overflow-visible */}
      <div className="relative w-full max-w-md bg-[var(--surface)] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 overflow-visible">
        {/* En-tête de la modale */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-4">
          <div>
            <h4 className="text-xs font-black uppercase text-[var(--secondary)] tracking-widest leading-none">
              {duplicateType === 'year' ? 'Propagation Annuelle' : 'Reconduire le mois'}
            </h4>
            <p className="text-[9px] text-white/30 uppercase font-bold mt-1">
              {duplicateType === 'year' ? 'Duplication sur les mois restants' : 'Duplication vers le mois ou l’année choisis'}
            </p>
          </div>
          <button 
            onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} 
            className="p-1.5 bg-white/5 rounded-xl text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Corps de texte dynamique selon l'action demandée */}
        <div className="space-y-3 mb-6 text-xs text-white/60 leading-relaxed select-none">
          {duplicateType === 'year' ? (
            <p>
              Voulez-vous propager ces <strong className="text-white">{selectedIds2.length} prévisions sélectionnées</strong> sur l'intégralité des mois restants de l'année <strong className="text-emerald-400">{filters.annee}</strong> (jusqu'à Décembre) ?
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <CustomSelect label="Vers le mois" ariaLabel="Mois cible" icon={Calendar} value={moisCible} onChange={setMoisCible}
                  options={[...NOMS_MOIS.map((m, i) => ({ v: i, l: m })), { v: 'tous', l: 'Toute l’année' }]} />
                <CustomSelect label="Année" ariaLabel="Année cible" icon={CalendarRange} value={anneeCible} onChange={setAnneeCible}
                  options={annees.map(a => ({ v: a, l: String(a) }))} />
              </div>
              <p>
                Voulez-vous reconduire {selectedIds2.length > 0 ? `les ${selectedIds2.length} prévisions sélectionnées` : "l'intégralité des prévisions de ce mois"} vers <strong className="text-white">{libelleCible}</strong> ?
              </p>
              {memeMois && <p className="text-amber-400">Choisissez un autre mois que celui affiché.</p>}
            </>
          )}
          <p className="text-[10px] text-white/30 italic">
            Cette action va cloner et adapter automatiquement les dates d'échéance des mouvements correspondants.
          </p>
        </div>

        {/* Actions de validation */}
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setDuplicateModal({ show: false, count: 0, isSelection: false })} 
            className="py-2.5 rounded-xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60"
          >
            Annuler
          </button>
          <button
            disabled={duplicateType !== 'year' && memeMois}
            onClick={() => {
              if (duplicateType === 'year') {
                confirmPropagateToYear(); // ⚡ Appelle la propagation sur le reste de l'année
              } else {
                handleConfirmDuplicate({ mois: moisCible, annee: anneeCible });
              }
              setDuplicateModal({ show: false, count: 0, isSelection: false });
            }}
            className="py-2.5 rounded-xl bg-[var(--primary)] text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--primary)]/15 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

export default FenetreReconduction;
