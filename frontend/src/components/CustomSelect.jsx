import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Tag, Layers } from 'lucide-react';
import { CategoryIcon, getCleanCategoryName, getCategoryGroup } from '../categoryIcons';

export default function CustomSelect({ label, value, options = [], onChange, icon: Icon, isCategory = false, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = (options || []).filter(opt =>
    (opt.l || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentLabel = options?.find(opt => opt.v === value)?.l || value;
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

  return (
    <div className={`space-y-1.5 relative ${isOpen ? 'z-[70]' : 'z-10'}`} ref={dropdownRef}>
      {label && (
        <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}
      
      <div
        className={`w-full flex items-center justify-between bg-[var(--glass-bg)] border ${
          isOpen ? 'border-[var(--primary)]/50 bg-[var(--glass-bg)]' : 'border-white/10'
        } ${className || 'p-3.5 rounded-2xl'} transition-all outline-none cursor-pointer`}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-2.5 w-full min-w-0">
          {isCategorySelect ? (
            <CategoryIcon name={currentLabel} size={14} className="shrink-0" />
          ) : (
            Icon && <Icon size={12} className="text-[var(--primary)] shrink-0" />
          )}
          
          <input
            type="text"
            readOnly={isMobile}
            className="bg-transparent border-none outline-none text-xs font-bold w-full placeholder:text-[var(--text-main)]/20 cursor-pointer truncate"
            value={isOpen && !isMobile ? searchTerm : getCleanCategoryName(currentLabel)}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={isOpen ? "Rechercher..." : "Sélectionner..."}
          />
        </div>
        <ChevronDown 
          size={12} 
          className={`text-[var(--text-main)]/20 transition-transform duration-300 shrink-0 ml-1.5 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {isOpen && (
        <div className="absolute top-[110%] left-0 w-full min-w-[175px] z-[100] bg-[#0f172a]/95 backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-64 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
            {filteredOptions.length > 0 ? (
              isCategorySelect && groupedOptions && groupedOptions.sortedGroupNames.length > 0 ? (
                groupedOptions.sortedGroupNames.map(grpName => (
                  <div key={grpName} className="space-y-0.5">
                    {groupedOptions.sortedGroupNames.length > 1 && (
                      <div className="px-2.5 pt-2 pb-1 text-[8px] font-black uppercase tracking-wider text-indigo-300/60 flex items-center justify-between border-t first:border-t-0 border-white/5 mt-1 select-none">
                        <span className="flex items-center gap-1.5">
                          <Layers size={9} className="text-indigo-400" />
                          <span>{grpName}</span>
                        </span>
                        <span className="text-[7.5px] font-mono opacity-40">
                          {groupedOptions.groups[grpName].length}
                        </span>
                      </div>
                    )}

                    {groupedOptions.groups[grpName].map(opt => (
                      <div
                        key={opt.v}
                        onClick={() => {
                          onChange(opt.v);
                          setIsOpen(false);
                          setSearchTerm("");
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-colors rounded-xl flex items-center gap-2.5 ${
                          value === opt.v 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-[var(--text-main)]/70 hover:bg-[var(--glass-bg)] hover:text-white'
                        }`}
                      >
                        <CategoryIcon name={opt.l} size={14} className="shrink-0" />
                        <span className="truncate">{getCleanCategoryName(opt.l)}</span>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt.v}
                    onClick={() => {
                      onChange(opt.v);
                      setIsOpen(false);
                      setSearchTerm("");
                    }}
                    className={`px-3 py-2 text-xs font-bold cursor-pointer transition-colors rounded-xl flex items-center gap-2.5 ${
                      value === opt.v 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'text-[var(--text-main)]/70 hover:bg-[var(--glass-bg)] hover:text-white'
                    }`}
                  >
                    {Icon && <Icon size={12} className="text-[var(--primary)] shrink-0" />}
                    <span className="truncate">{opt.l}</span>
                  </div>
                ))
              )
            ) : (
              <div className="px-4 py-3 text-xs text-[var(--text-main)]/20 italic text-center">
                Aucune option trouvée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}