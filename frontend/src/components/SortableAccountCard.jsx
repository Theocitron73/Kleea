import { Wallet, Users2, CreditCard, BadgeEuro } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableAccountCard = ({ c, isSorting }) => {
  const montantFinal = c.soldeFinalEstime !== undefined ? c.soldeFinalEstime : c.soldePeriode;
  const isEstimated = c.soldeFinalEstime !== undefined;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: c.compte });

  const containerStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    touchAction: isSorting ? 'none' : 'auto', 
  };

  // Sécurise la valeur des intérêts
  const interets = c.interetsGagnesPériode !== undefined ? c.interetsGagnesPériode : 0;

  return (
    <div 
      ref={setNodeRef}
      style={containerStyle}
      {...attributes}
      {...listeners}
      className="flex-1 min-w-[145px] md:min-w-[160px] h-24 md:h-28 outline-none select-none" 
    >
      {/* LA CARTE VISUELLE COMPLÈTE */}
      <div 
        className={`
          w-full h-full p-2.5 md:p-3 rounded-2xl md:rounded-[var(--radius)] 
          flex flex-col justify-between
          relative overflow-hidden group 
          cursor-grab active:cursor-grabbing shadow-xl
          will-change-transform
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          backdrop-blur-[var(--glass-blur)] border
          
          /* Bordures selon état */
          ${isEstimated 
            ? 'border-white/40 saturate-[0.9]' 
            : 'border-white/10 hover:border-white/30'
          }
          
          /* 🌟 ANIMATIONS DRAG & DROP VS HOVER */
          ${isDragging 
            ? 'scale-105 rotate-2 shadow-2xl opacity-60 brightness-125 ring-2 ring-white/20' 
            : 'hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.35)]'
          }
        `}
        style={{
          background: isEstimated
            ? `linear-gradient(135deg, ${c.couleur}88 0%, ${c.couleur}44 100%)`
            : `linear-gradient(135deg, ${c.couleur}aa 0%, ${c.couleur}66 100%)`,
        }}
      >
        {/* 1. Motif de fond vitreux */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-20" />
        
        {/* 2. 🌟 Cercle de lumière dynamique au survol restauré */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[var(--glass-bg)] rounded-full blur-2xl group-hover:bg-white/20 group-hover:scale-150 transition-all duration-700 pointer-events-none" />

        {/* 3. Header de la carte */}
        <div className="flex justify-between items-start relative z-10 w-full">
          <div className="flex flex-col items-start leading-none min-w-0 pr-1">
            <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.15em] leading-none italic truncate max-w-[90px] md:max-w-none ${isEstimated ? 'text-white/80' : 'text-white/40'}`}>
              {c.groupe || 'Compte'}
            </span>
            <h4 className="text-white font-black text-[11px] md:text-xs tracking-tight truncate max-w-[100px] md:max-w-[115px] uppercase mt-1">
              {c.compte}
            </h4>
          </div>
          
          {/* 🌟 Icône qui s'anime au survol (agrandissement + rotation) */}
          <div className={`w-7 h-7 md:w-9 md:h-9 rounded-xl backdrop-blur-[var(--glass-blur)] border flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shrink-0 ${isEstimated ? 'bg-white/30 border-white/40' : 'bg-[var(--glass-bg)] border-white/20'}`}>
            {(() => {
              const g = (c.compte || "").toString().toLowerCase().trim();
              if (g.includes('ccp')) return <CreditCard size={15} className="text-white" />;
              if (g.includes('livret') || g.includes('lep') || c.taux > 0) return <BadgeEuro size={15} className="text-white" />;
              if (g.includes('commun') || g.includes('users')) return <Users2 size={15} className="text-white" />;
              return <Wallet size={15} className="text-white" />;
            })()}
          </div>
        </div>
        
        {/* 4. Zone des chiffres : Solde à gauche & Intérêts à droite */}
        <div className="relative z-10 flex items-end justify-between w-full mt-auto gap-2 pt-1">
          
          {/* GAUCHE : LE SOLDE */}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="text-[8.5px] md:text-[10px] font-black uppercase tracking-wider text-white/40 leading-none mb-1">
              {isEstimated ? 'Solde prévu' : 'Solde'}
            </span>
            <h3 className="text-base md:text-xl font-black text-white tracking-tighter leading-none truncate w-full">
              {montantFinal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              <span className="text-[10px] ml-0.5 font-bold text-white/60">€</span>
            </h3>
          </div>

          {/* 🌟 DROITE : AFFICHAGE DES INTÉRÊTS RESTAURÉ */}
          {c.taux > 0 && (
            <div className="flex flex-col items-end shrink-0 max-w-[50%] text-right">
              {/* Badge du Taux */}
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[8px] md:text-[9.5px] font-black uppercase tracking-wider text-white/40 leading-none">
                  Intérêts
                </span>
                <span className="text-[8px] md:text-[9.5px] font-black tracking-wider bg-white/20 text-white border border-white/30 px-1 py-0.2 rounded-sm leading-none shadow-[0_0_8px_rgba(52,211,153,0.15)]">
                  {c.taux.toFixed(1)}%
                </span>
              </div>
              
              {/* Montant des Intérêts */}
              <h3 className="text-[11.5px] md:text-[13px] font-black text-white-300 tracking-tighter leading-none truncate w-full">
                +{interets.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                <span className="text-[9px] ml-0.5 font-bold text-white-300/70">€</span>
              </h3>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SortableAccountCard;
