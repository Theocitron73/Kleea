import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Layers, Calculator, User, Wallet, Landmark, Tag, 
  Plus, Calendar, Trash2, FileText 
} from 'lucide-react';
import api from '../axios';
import CustomSelect from '../components/CustomSelect';

export default function DemenagementPage({ user, toutesLesCategories = [], comptes = [] }) {
  // --- 1. ÉTATS (STATES) ---
  const [notesHtml, setNotesHtml] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [lignes, setLignes] = useState([]);
  const [scenarios, setScenarios] = useState(['Scénario de base']);
  const [currentScenario, setCurrentScenario] = useState('Scénario de base');
  const [nouveauScenarioNom, setNouveauScenarioNom] = useState('');

  // Salaires
  const [salaireLui, setSalaireLui] = useState('');
  const [salaireElle, setSalaireElle] = useState('');

  // Dépenses personnelles
  const [depensePersoLui, setDepensePersoLui] = useState('');
  const [depensePersoElle, setDepensePersoElle] = useState('');

  // Ajout rapide et objectif global
  const [categorieSelect, setCategorieSelect] = useState(toutesLesCategories[0] || 'Logement');
  const [montantInitial, setMontantInitial] = useState('');
  const [montantCommunForfaitaire, setMontantCommunForfaitaire] = useState('');
  const [frequenceInitiale, setFrequenceInitiale] = useState('mensuel');

  const saveTimeoutRef = useRef(null);
  const editorRef = useRef(null);

  const diviseursFrequence = {
    'mensuel': 1,
    'trimestriel': 3,
    'semestriel': 6,
    'annuel': 12
  };

  const getLigneId = (ligne) => ligne?.id || ligne?._id;

  // --- 2. EFFETS (CHARGEMENT INITIAL) ---
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await api.get(`/api/notes-demenagement/${user}`);
        if (res.data) {
          setNotesHtml(res.data.contenu || "");
          if (editorRef.current) {
            editorRef.current.innerHTML = res.data.contenu || "";
          }
        }
      } catch (err) {
        console.error("Erreur chargement notes :", err);
      }
    };
    if (user) fetchNotes();
  }, [user]);

  useEffect(() => {
    const triggerSave = () => handleInput();
    window.addEventListener('editor-update', triggerSave);
    return () => window.removeEventListener('editor-update', triggerSave);
  }, [notesHtml]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await api.get(`/api/simulation-demenagement/${user}`);
        const data = res.data;
        if (Array.isArray(data) && data.length > 0) {
          setLignes(data);
          const uniqueScenarios = [...new Set(data.map(l => l.scenario))];
          setScenarios(uniqueScenarios);
          setCurrentScenario(uniqueScenarios[0]);
        }
      } catch (err) {
        console.error("Erreur chargement simulations :", err);
      }
    };
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    const currentData = lignes.filter(l => l.scenario === currentScenario);
    const salLui = currentData.find(l => l.titre === "Salaire Lui");
    const salElle = currentData.find(l => l.titre === "Salaire Elle");
    const persLui = currentData.find(l => l.titre === "Dépenses Perso (Lui)");
    const persElle = currentData.find(l => l.titre === "Dépenses Perso (Elle)");
    const mntGlobal = currentData.find(l => l.titre === "Objectif Compte Commun");

    setSalaireLui(salLui ? salLui.montant.toString() : '');
    setSalaireElle(salElle ? salElle.montant.toString() : '');
    setDepensePersoLui(persLui ? persLui.montant.toString() : '');
    setDepensePersoElle(persElle ? persElle.montant.toString() : '');
    setMontantCommunForfaitaire(mntGlobal ? mntGlobal.montant.toString() : '');
  }, [currentScenario, lignes]);

  // --- 3. FONCTIONS LOGIQUES DU BLOC-NOTES ---
  const handleInput = () => {
    if (!editorRef.current) return;
    const currentHtml = editorRef.current.innerHTML;
    setNotesHtml(currentHtml);
    setIsSaving(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.post('/api/notes-demenagement', { utilisateur: user, contenu: currentHtml });
      } catch (err) {
        console.error("Erreur sauvegarde notes :", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };

  const insererCheckbox = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const containerId = `group-${Date.now()}`;
    const checkboxHtml = `
      <div id="${containerId}" class="flex items-start gap-2 my-1.5 group/cb relative" contenteditable="false">
        <input type="checkbox" class="accent-indigo-500 cursor-pointer mt-0.5" />
        <span class="text-xs text-white/80 outline-none flex-1 font-medium" contenteditable="true" placeholder="Nouvelle tâche..."></span>
        <button 
          type="button" 
          class="text-white/20 hover:text-rose-400 opacity-0 group-hover/cb:opacity-100 transition-opacity px-1 text-[10px] font-bold cursor-pointer select-none"
          onclick="document.getElementById('${containerId}').remove(); window.dispatchEvent(new Event('editor-update'));"
          title="Supprimer la tâche"
        >✕</button>
      </div>
    `;

    document.execCommand('insertHTML', false, checkboxHtml);
    setTimeout(() => {
      const container = document.getElementById(containerId);
      const newLabel = container?.querySelector('span[contenteditable="true"]');
      if (newLabel) newLabel.focus();
    }, 10);
    handleInput();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      if (e.target.hasAttribute('placeholder') && e.target.textContent === '') {
        e.preventDefault();
        const parentGroup = e.target.closest('[id^="group-"]');
        if (parentGroup) {
          parentGroup.remove();
          handleInput();
        }
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const parentGroup = e.target.closest('[id^="group-"]');

      if (parentGroup) {
        const br = document.createElement('br');
        parentGroup.parentNode.insertBefore(br, parentGroup.nextSibling);
        const range = document.createRange();
        const selection = window.getSelection();
        range.setStartAfter(br);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        handleInput();
      } else {
        document.execCommand('insertLineBreak', false, null);
        handleInput();
      }
    }
  };

  const handleEditorClick = (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const label = e.target.nextElementSibling;
      if (e.target.checked) {
        e.target.setAttribute('checked', 'checked');
        if (label) label.classList.add('line-through', 'text-white/30');
      } else {
        e.target.removeAttribute('checked');
        if (label) label.classList.remove('line-through', 'text-white/30');
      }
      handleInput();
    }
  };

  // --- 4. INTERACTIONS DONNÉES / CALCULS ---
  const upsertLigne = async (titre, fluxType, cat, mnt, freq = 'mensuel') => {
    const existante = lignes.find(l => l.scenario === currentScenario && l.titre === titre);
    const parsedMontant = parseFloat(mnt) || 0;

    const nouvelleLigne = {
      utilisateur: user,
      scenario: currentScenario,
      titre,
      flux_type: fluxType,
      categorie: cat,
      montant: parsedMontant,
      frequence: freq,
      cible: fluxType === 'revenus' ? 'perso' : 'compte_commun'
    };

    if (titre === "Salaire Lui") setSalaireLui(mnt.toString());
    if (titre === "Salaire Elle") setSalaireElle(mnt.toString());
    if (titre === "Dépenses Perso (Lui)") setDepensePersoLui(mnt.toString());
    if (titre === "Dépenses Perso (Elle)") setDepensePersoElle(mnt.toString());
    if (titre === "Objectif Compte Commun") setMontantCommunForfaitaire(mnt.toString());

    try {
      if (existante) {
        const idCle = getLigneId(existante);
        await api.post('/api/simulation-demenagement', { ...nouvelleLigne, id: idCle });
        setLignes(prev => prev.map(l => getLigneId(l) === idCle ? { ...l, montant: parsedMontant, frequence: freq } : l));
      } else {
        const res = await api.post('/api/simulation-demenagement', nouvelleLigne);
        const nouvelId = res.data.id || res.data._id;
        setLignes(prev => [...prev, { id: nouvelId, _id: nouvelId, ...nouvelleLigne }]);
      }
    } catch (err) {
      console.error("Erreur upsert simulation :", err);
    }
  };

  const handleSupprimerLigne = async (ligne) => {
    const idCle = getLigneId(ligne);
    if (!idCle) return;
    try {
      await api.delete(`/api/simulation-demenagement/${idCle}`);
      setLignes(prev => prev.filter(l => getLigneId(l) !== idCle));
    } catch (err) {
      console.error("Erreur suppression ligne :", err);
    }
  };

  const handleAjouterCategorie = (e) => {
    e.preventDefault();
    if (!categorieSelect) return;
    const existe = lignes.some(l => l.scenario === currentScenario && l.titre === categorieSelect && l.flux_type === 'depenses');
    if (existe) return;

    upsertLigne(categorieSelect, 'depenses', categorieSelect, montantInitial || 0, frequenceInitiale);
    setMontantInitial('');
    setFrequenceInitiale('mensuel');
  };

  const handleCreerScenario = (e) => {
    e.preventDefault();
    if (!nouveauScenarioNom.trim() || scenarios.includes(nouveauScenarioNom.trim())) return;
    setScenarios(prev => [...prev, nouveauScenarioNom.trim()]);
    setCurrentScenario(nouveauScenarioNom.trim());
    setNouveauScenarioNom('');
  };

  const handleSupprimerScenario = async (scenarioASupprimer) => {
    if (scenarios.length <= 1) {
      alert("Impossible de supprimer le dernier scénario restant.");
      return;
    }
    try {
      await api.delete(`/api/simulation-demenagement/${user}/${encodeURIComponent(scenarioASupprimer)}`);
      const nouveauxScenarios = scenarios.filter(sc => sc !== scenarioASupprimer);
      setScenarios(nouveauxScenarios);
      setLignes(prev => prev.filter(l => l.scenario !== scenarioASupprimer));
      setCurrentScenario(nouveauxScenarios[0]);
    } catch (err) {
      console.error("Erreur suppression scénario :", err);
    }
  };

  const calculs = useMemo(() => {
    const duScenario = lignes.filter(l => l.scenario === currentScenario);
    
    const mntLui = parseFloat(salaireLui) || 0;
    const mntElle = parseFloat(salaireElle) || 0;
    const totalSalaires = mntLui + mntElle;

    const pLui = parseFloat(depensePersoLui) || 0;
    const pElle = parseFloat(depensePersoElle) || 0;

    const prorataLui = totalSalaires > 0 ? (mntLui / totalSalaires) : 0.5;
    const prorataElle = totalSalaires > 0 ? (mntElle / totalSalaires) : 0.5;

    const getMontantMensuelLisse = (ligne) => {
      const mnt = parseFloat(ligne.montant) || 0;
      const freq = (ligne.frequence || 'mensuel').toLowerCase().trim();
      const diviseur = diviseursFrequence[freq] || 1;
      return mnt / diviseur;
    };

    const totalCategories = duScenario
      .filter(l => l.flux_type === 'depenses' && !["Objectif Compte Commun", "Dépenses Perso (Lui)", "Dépenses Perso (Elle)"].includes(l.titre))
      .reduce((sum, l) => sum + getMontantMensuelLisse(l), 0);

    const alimentationCompte = parseFloat(montantCommunForfaitaire) > 0 
      ? parseFloat(montantCommunForfaitaire) 
      : totalCategories;

    const partLui = alimentationCompte * prorataLui;
    const partElle = alimentationCompte * prorataElle;
    const soldeRestantCommun = alimentationCompte - totalCategories;

    const resteLui = mntLui - partLui - pLui;
    const resteElle = mntElle - partElle - pElle;

    return {
      duScenario: duScenario.filter(l => l.flux_type === 'depenses' && !["Objectif Compte Commun", "Dépenses Perso (Lui)", "Dépenses Perso (Elle)"].includes(l.titre)),
      getMontantMensuelLisse,
      totalSalaires,
      prorataLui: prorataLui * 100,
      prorataElle: prorataElle * 100,
      charges: alimentationCompte,
      totalCategories,
      soldeRestantCommun,
      partLui,
      partElle,
      resteLui,
      resteElle,
      estForfaitaire: parseFloat(montantCommunForfaitaire) > 0
    };
  }, [lignes, currentScenario, salaireLui, salaireElle, depensePersoLui, depensePersoElle, montantCommunForfaitaire]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-screen text-white bg-[var(--main-bg)]">
      
      {/* COLONNE DE GAUCHE : Contenu principal */}
      <div className="flex-1 flex flex-col gap-6">
        
        {/* EN-TÊTE ET SCÉNARIOS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" /> Simulateur Prorata & Dépenses
            </h1>
          </div>
          <form onSubmit={handleCreerScenario} className="flex gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-xl">
            <input 
              type="text" 
              placeholder="Nouveau scénario..." 
              value={nouveauScenarioNom}
              onChange={(e) => setNouveauScenarioNom(e.target.value)}
              className="bg-transparent outline-none text-xs px-3 py-1.5 w-40 placeholder-white/20"
            />
            <button type="submit" className="bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-3 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer">
              + Ajouter
            </button>
          </form>
        </div>

        {/* ONGLETS SCÉNARIOS */}
        <div className="flex flex-wrap gap-1 border-b border-white/5">
          {scenarios.map(sc => {
            const isCurrent = currentScenario === sc;
            return (
              <div 
                key={sc} 
                className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                  isCurrent ? 'border-indigo-500 text-white bg-white/[0.02]' : 'border-transparent text-white/40'
                }`}
              >
                <button
                  onClick={() => setCurrentScenario(sc)}
                  className="hover:text-white/80 transition-colors outline-none cursor-pointer"
                >
                  {sc}
                </button>
                
                {isCurrent && scenarios.length > 1 && (
                  <button
                    onClick={() => handleSupprimerScenario(sc)}
                    className="text-white/30 hover:text-rose-400 ml-1 transition-colors p-0.5 rounded cursor-pointer"
                    title={`Supprimer le scénario ${sc}`}
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* CALCULS REVENUS & PRORATA */}
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 flex flex-col gap-5">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Calculator size={16} className="text-emerald-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-white/80">Nos Revenus Mensuels & Prorata</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-4">
              {/* SALAIRES */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase">Salaire Lui (€)</label>
                  <input 
                    type="number" 
                    value={salaireLui}
                    onChange={(e) => setSalaireLui(e.target.value)}
                    onBlur={(e) => upsertLigne("Salaire Lui", "revenus", "Salaire", e.target.value)}
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-white/40 uppercase">Salaire Elle (€)</label>
                  <input 
                    type="number" 
                    value={salaireElle}
                    onChange={(e) => setSalaireElle(e.target.value)}
                    onBlur={(e) => upsertLigne("Salaire Elle", "revenus", "Salaire", e.target.value)} 
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-sm text-white outline-none focus:border-emerald-500/50"
                  />
                </div>
              </div>

              {/* DÉPENSES PERSOS */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-amber-500/80 uppercase flex items-center gap-1">
                    <User size={10} /> Dépenses Perso Lui (€)
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ex: 400" 
                    value={depensePersoLui}
                    onChange={(e) => setDepensePersoLui(e.target.value)}
                    onBlur={(e) => upsertLigne("Dépenses Perso (Lui)", "depenses", "Perso", e.target.value)}
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500/40"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-amber-500/80 uppercase flex items-center gap-1">
                    <User size={10} /> Dépenses Perso Elle (€)
                  </label>
                  <input 
                    type="number" 
                    placeholder="Ex: 350" 
                    value={depensePersoElle}
                    onChange={(e) => setDepensePersoElle(e.target.value)}
                    onBlur={(e) => upsertLigne("Dépenses Perso (Elle)", "depenses", "Perso", e.target.value)}
                    className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none focus:border-amber-500/40"
                  />
                </div>
              </div>
            </div>

            {/* PARTICIPATION COMPTE JOINT */}
            <div className="grid grid-cols-2 gap-3 bg-white/[0.01] p-3 rounded-xl border border-white/5 text-xs h-fit my-auto">
              <div className="border-r border-white/5 pr-2">
                <p className="font-black text-indigo-400 uppercase text-[9px] mb-1">Participation Joint Lui ({calculs.prorataLui.toFixed(0)}%)</p>
                <p className="text-base font-black">{calculs.partLui.toFixed(2)}€</p>
              </div>
              <div className="pl-1">
                <p className="font-black text-pink-400 uppercase text-[9px] mb-1">Participation Joint Elle ({calculs.prorataElle.toFixed(0)}%)</p>
                <p className="text-base font-black">{calculs.partElle.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          {/* 🟢 CIBLE COMPTE COMMUN (RÉINTÉGRÉE À 100%) */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-indigo-400" />
                  <span className="text-xs font-black uppercase tracking-wide text-white/80">Montant Cible du Compte Commun (Mensualisé)</span>
                </div>
                <p className="text-[10px] text-white/40">
                  {calculs.estForfaitaire 
                    ? "💡 Mode forfaitaire activé (l'argent versé dépasse ou diffère du total des charges)." 
                    : "💡 Mode automatique basé sur la somme lissée par mois de vos charges ci-dessous."}
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <input 
                  type="number" 
                  placeholder="Fixer un total arbitraire..." 
                  value={montantCommunForfaitaire}
                  onChange={(e) => setMontantCommunForfaitaire(e.target.value)}
                  onBlur={(e) => upsertLigne("Objectif Compte Commun", "depenses", "Budget", e.target.value)}
                  className="h-9 bg-black/50 border border-white/10 rounded-xl px-3 text-xs font-black text-indigo-400 placeholder-indigo-400/20 outline-none w-48 focus:border-indigo-500"
                />
                <div className="text-right shrink-0 border-l border-white/10 pl-3">
                  <p className="text-lg font-black text-indigo-400">{calculs.charges.toFixed(2)} €</p>
                  <p className="text-[9px] text-white/30 uppercase font-bold tracking-wider">Versé sur le compte / mois</p>
                </div>
              </div>
            </div>

            {/* INDICATEUR DE SOLDE DU COMPTE COMMUN */}
            <div className="flex justify-between items-center bg-black/30 border border-white/5 rounded-lg px-3 py-1.5 text-[11px]">
              <span className="text-white/40 font-medium flex items-center gap-1.5">
                <Landmark size={12} className="text-white/30" /> Total des charges lissées : <strong className="text-white/70">{calculs.totalCategories.toFixed(2)} € / mois</strong>
              </span>
              <span className={`font-black ${calculs.soldeRestantCommun >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {calculs.soldeRestantCommun >= 0 
                  ? `Reste sur le compte (Surplus) : +${calculs.soldeRestantCommun.toFixed(2)} €`
                  : `Manque à gagner sur le compte : ${calculs.soldeRestantCommun.toFixed(2)} €`
                }
              </span>
            </div>
          </div>

          {/* RESTES À VIVRE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
            <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Reste à vivre net (Lui)</span>
                <p className="text-[9px] text-emerald-400/60 font-medium">Après compte joint et dépenses persos</p>
              </div>
              <div className="text-right">
                <span className={`text-base font-black ${calculs.resteLui >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {calculs.resteLui.toFixed(2)} €
                </span>
              </div>
            </div>

            <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl p-3 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Reste à vivre net (Elle)</span>
                <p className="text-[9px] text-emerald-400/60 font-medium">Après compte joint et dépenses persos</p>
              </div>
              <div className="text-right">
                <span className={`text-base font-black ${calculs.resteElle >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {calculs.resteElle.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 🟢 BARRE EXPRESS D'AJOUT (RÉINTÉGRÉE À 100%) */}
        <form onSubmit={handleAjouterCategorie} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px] flex flex-col gap-1">
            <label className="text-[10px] font-black text-white/40 uppercase">Sélectionner une catégorie à ajouter</label>
            <CustomSelect 
              value={categorieSelect} 
              options={toutesLesCategories.map(cat => ({ v: cat, l: cat }))} 
              icon={Tag} 
              onChange={(val) => setCategorieSelect(val)} 
            />
          </div>
          
          <div className="w-32 flex flex-col gap-1">
            <label className="text-[10px] font-black text-white/40 uppercase">Montant (€)</label>
            <input 
              type="number" 
              placeholder="0.00" 
              value={montantInitial} 
              onChange={(e) => setMontantInitial(e.target.value)} 
              className="h-9 bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-white outline-none"
            />
          </div>

          <div className="w-36 flex flex-col gap-1">
            <label className="text-[10px] font-black text-white/40 uppercase">Fréquence</label>
            <CustomSelect 
              value={frequenceInitiale} 
              options={[
                { v: "mensuel", l: "Mensuel" },
                { v: "trimestriel", l: "Trimestriel" },
                { v: "semestriel", l: "Semestriel" },
                { v: "annuel", l: "Annuel" }
              ]} 
              icon={Calendar} 
              onChange={(val) => setFrequenceInitiale(val)} 
            />
          </div>

          <button type="submit" className="h-9 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase text-[10px] tracking-wider px-5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer">
            <Plus size={14} /> Ajouter la catégorie
          </button>
        </form>

        {/* 🟢 LISTE DÉTAILLÉE DES CHARGES DU COMPTE COMMUN (RÉINTÉGRÉE À 100%) */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/40 px-1">
            Détails des frais du compte commun (valeurs brutes vs lissées)
          </p>
          
          <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {calculs.duScenario.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-white/5 rounded-xl text-white/20 text-xs font-bold uppercase">
                Aucune catégorie de frais pour le moment. Utilisez la barre ci-dessus pour en ajouter.
              </div>
            ) : (
              calculs.duScenario.map(l => {
                const currentId = getLigneId(l);
                const { getMontantMensuelLisse } = calculs;
                const brawnValue = l.montant ?? '';

                return (
                  <div key={currentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors gap-3">
                    <div className="flex items-center gap-2.5">
                      <Tag size={13} className="text-white/30" />
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase tracking-wide text-white/80">{l.titre}</span>
                        {l.frequence && l.frequence !== 'mensuel' && (
                          <span className="text-[10px] text-indigo-400 font-medium">
                            Soit {getMontantMensuelLisse(l).toFixed(2)} € / mois
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 ml-auto sm:ml-0">
                      <div className="flex items-center bg-black/40 border border-white/10 rounded-lg px-2 h-7 focus-within:border-indigo-500/50">
                        <input 
                          type="number" 
                          className="bg-transparent text-right text-xs font-black text-white outline-none w-16"
                          value={brawnValue}
                          placeholder="0"
                          onChange={(e) => {
                            const val = e.target.value;
                            setLignes(prev => prev.map(item => getLigneId(item) === currentId ? { ...item, montant: val } : item));
                          }}
                          onBlur={(e) => upsertLigne(l.titre, 'depenses', l.categorie, e.target.value, l.frequence || 'mensuel')}
                        />
                        <span className="text-[10px] font-bold text-white/30 ml-1">€</span>
                      </div>

                      <CustomSelect 
                        value={l.frequence || 'mensuel'} 
                        options={[
                          { v: "mensuel", l: "par mois" },
                          { v: "trimestriel", l: "par trimestre" },
                          { v: "semestriel", l: "par semestre" },
                          { v: "annuel", l: "par an" }
                        ]} 
                        icon={Calendar} 
                        onChange={(newFreq) => {
                          setLignes(prev => prev.map(item => getLigneId(item) === currentId ? { ...item, frequence: newFreq } : item));
                          upsertLigne(l.titre, 'depenses', l.categorie, l.montant, newFreq);
                        }} 
                      />

                      <button 
                        onClick={() => handleSupprimerLigne(l)} 
                        className="text-white/20 hover:text-rose-400 p-1 rounded-lg transition-colors ml-1 cursor-pointer"
                        title="Enlever cette catégorie"
                      >
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* COLONNE DE DROITE : BLOC-NOTES & TÂCHES (RÉINTÉGRÉ À 100%) */}
      <div className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col">
        <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-5 sticky top-6 flex flex-col h-[400px] lg:h-[600px] gap-3">
          
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-white/80">Bloc-Notes & Tâches</h2>
            </div>
            
            <button 
              type="button"
              onClick={insererCheckbox}
              className="flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white px-2 py-1 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer"
              title="Ajouter une case à cocher"
            >
              <Plus size={10} /> checkbox
            </button>
          </div>
          
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onClick={handleEditorClick}
            onKeyDown={handleKeyDown}
            placeholder="Écris tes remarques ici... Clique sur '+ checkbox' pour insérer des listes de tâches directement dans ton texte."
            className="flex-1 w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white/80 outline-none overflow-y-auto focus:border-indigo-500/50 leading-relaxed font-medium editor-placeholder custom-scrollbar"
            style={{ minHeight: '100px' }}
          />
          
          <div className="text-[9px] uppercase font-bold tracking-wider text-right transition-colors">
            {isSaving ? (
              <span className="text-amber-400 animate-pulse">Sauvegarde en cours...</span>
            ) : (
              <span className="text-white/30">Sauvegarde automatique</span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}