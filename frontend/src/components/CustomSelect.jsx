import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Tag } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName, getCategoryGroup } from '../categoryIcons';

// `flottant` : la liste s'affiche par-dessus la page, pour ne pas être coupée par une zone qui défile (lignes de tableau).
export default function CustomSelect({ label, value, options = [], onChange, icon: Icon, isCategory = false, className = "", flottant = false, ariaLabel }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const listeRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (listeRef.current?.contains(event.target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // En mode flottant : la liste se place sous le champ (ou au-dessus s'il manque de place), et se ferme si la page défile.
  useEffect(() => {
    if (!flottant || !isOpen) return undefined;
    const placer = () => {
      const r = dropdownRef.current?.getBoundingClientRect();
      if (!r) return;
      const enHaut = window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom;
      setPosition({ left: Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8), width: Math.max(r.width, 200), ...(enHaut ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
    };
    placer();
    const fermer = (e) => { if (!listeRef.current?.contains(e.target)) { setIsOpen(false); setSearchTerm(""); } };
    window.addEventListener('scroll', fermer, true);
    window.addEventListener('resize', placer);
    return () => { window.removeEventListener('scroll', fermer, true); window.removeEventListener('resize', placer); };
  }, [flottant, isOpen]);

  const filteredOptions = (options || []).filter(opt =>
    (opt.l || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // `court` : ce que montre le champ fermé, quand le libellé de la liste est plus long (« Carburant » plutôt que « Carburant (60 €) »).
  const choix = options?.find(opt => opt.v === value);
  const currentLabel = choix?.court ?? choix?.l ?? value;
  const isCategorySelect = isCategory || Icon === Tag;

  const groupedOptions = useMemo(() => {
    if (!isCategorySelect) return null;

    const groups = {};
    filteredOptions.forEach(opt => {
      const grp = (typeof getCategoryGroup === 'function' ? getCategoryGroup(opt.l || opt.v) : null) || "Général";
      if (!groups[grp]) groups[grp] = [];
      groups[grp].push(opt);
    });

    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
      if (a.toLowerCase() === 'général' || a.toLowerCase() === 'general') return 1;
      if (b.toLowerCase() === 'général' || b.toLowerCase() === 'general') return -1;
      return a.localeCompare(b);
    });

    return { groups, sortedGroupNames };
  }, [filteredOptions, isCategorySelect]);

  const choisir = (opt) => {
    onChange(opt.v);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Une ligne de la liste : icône, libellé, et une coche sur le choix actuel.
  const option = (opt) => {
    const choisie = value === opt.v;
    return (
      <div key={opt.v} role="option" aria-selected={choisie} onClick={() => choisir(opt)}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] font-medium cursor-pointer transition-colors ${
          choisie ? 'bg-white/10 text-[var(--text-main)]' : 'text-[var(--text-main)]/80 hover:bg-white/5 hover:text-[var(--text-main)]'
        }`}>
        {isCategorySelect
          ? <CategoryIcon name={opt.l} size={12} className="shrink-0" />
          : Icon && <Icon size={13} className="shrink-0 opacity-60" />}
        <span className="truncate flex-1">{isCategorySelect ? getCleanCategoryName(opt.l) : opt.l}</span>
        {choisie && <Check size={13} className="shrink-0 text-emerald-400" />}
      </div>
    );
  };

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-[70]' : 'z-10'}`} ref={dropdownRef} data-liste-ouverte={isOpen || undefined}>
      {label && (
        <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}

      <div
        className={`w-full flex items-center gap-1.5 border border-transparent font-semibold text-[var(--text-main)] transition-colors outline-none cursor-pointer ${
          isOpen ? 'bg-[var(--primary)]/30' : 'bg-white/[0.06] hover:bg-white/10'
        } ${className || 'h-11 px-3 rounded-xl'}`}
        onClick={() => setIsOpen(true)}
      >
        {isCategorySelect ? (
          <CategoryIcon name={currentLabel} size={14} showBg={false} className="shrink-0" />
        ) : (
          Icon && <Icon size={13} className="shrink-0 opacity-70" />
        )}
        <input
          type="text"
          readOnly={isMobile}
          className="bg-transparent border-none outline-none text-[12px] font-semibold w-full min-w-0 placeholder:text-[var(--text-main)]/35 cursor-pointer truncate"
          value={isOpen && !isMobile ? searchTerm : getCleanCategoryName(currentLabel)}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          aria-label={ariaLabel}
          placeholder={isOpen ? "Rechercher..." : "Sélectionner..."}
        />
        <ChevronDown size={12} className={`shrink-0 opacity-50 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (!flottant || position) && (() => { const liste = (
        <div ref={listeRef} role="listbox"
          style={flottant ? { position: 'fixed', ...position } : undefined}
          className={`${flottant ? 'z-[1200]' : 'absolute top-[110%] left-0 w-full min-w-[200px] z-[100]'} max-h-72 overflow-y-auto custom-scrollbar p-1.5 rounded-2xl bg-[var(--surface)] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] animate-in fade-in zoom-in-95 duration-150`}>
          {filteredOptions.length > 0 ? (
            isCategorySelect && groupedOptions && groupedOptions.sortedGroupNames.length > 0 ? (
              groupedOptions.sortedGroupNames.map(grpName => (
                <div key={grpName}>
                  {groupedOptions.sortedGroupNames.length > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[10px] font-semibold text-[var(--text-main)]/40 select-none">
                      <span>{grpName}</span>
                      <span className="tabular-nums opacity-70">{groupedOptions.groups[grpName].length}</span>
                    </div>
                  )}
                  {groupedOptions.groups[grpName].map(option)}
                </div>
              ))
            ) : (
              filteredOptions.map(option)
            )
          ) : (
            <p className="px-2 py-1.5 text-[11px] text-[var(--text-main)]/45">Aucune option trouvée</p>
          )}
        </div>
      ); return flottant ? createPortal(liste, document.body) : liste; })()}
    </div>
  );
}
