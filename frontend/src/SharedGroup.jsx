import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
const { token } = useParams();

const SharedGroup = () => {
  const { token } = useParams(); // Récupère le token de l'URL
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Charger les données du groupe via le token
  useEffect(() => {
    fetch(`https://ton-api.com/get-shared-tricount/${token}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => console.error("Erreur:", err));
  }, [token]);

  // 2. Fonction pour ajouter une dépense (version simplifiée)
  const handleAddExpense = async (newExpense) => {
    const payload = {
      ...newExpense,
      utilisateur: data.proprietaire, // On utilise le proprio récupéré
      groupe: data.nom_groupe,       // On utilise le nom du groupe récupéré
      token_partage: token           // ON INCLUT LE TOKEN !
    };

    const res = await fetch('https://ton-api.com/save-tricount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
        // Rafraîchir les données après l'ajout
    }
  };

  if (loading) return <div>Chargement du groupe...</div>;

  return (
    <div className="min-h-screen bg-[#020617] text-[var(--text-main)] p-4 lg:p-10">
      {/* --- HEADER --- */}
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">{data.nom_groupe}</h1>
          <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">
            Invité par {data.proprietaire}
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-full px-4 py-2 flex items-center gap-2">
           <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
           <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Lien de partage actif</span>
        </div>
      </div>

      
{/* --- GRID PRINCIPALE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-0">



          {/* --- COLONNE 3 : MEMBRES --- */}
          <div className="xl:col-span-1 space-y-6">
            <div className="flex items-center gap-3 px-2 mb-4">
              <div className="h-2 w-2 bg-[var(--primary)] rounded-[var(--radius)]" />
              <h4 className="text-[10px] font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Gestion du Groupe</h4>
            </div>

            <div className="bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl sticky top-6">
              <div className="space-y-6">
                
                {/* Ajouter un membre */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Nouveau membre</label>
                  <div className="relative">
                    <input 
                      type="text"
                      id="input-nouveau-membre"
                      placeholder="Prénom du membre..."
                      className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 pr-12 text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]/10"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAjouterMembreLocal(e.target.value);
                          e.target.value = "";
                        }
                      }}
                    />
                    <button 
                      onClick={() => {
                        const input = document.getElementById('input-nouveau-membre');
                        handleAjouterMembreLocal(input.value);
                        input.value = "";
                      }}
                      className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--primary)] hover:bg-[var(--primary)]/70 text-[var(--text-main)] rounded-[var(--radius)] transition-all"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>

                <hr className="border-white/5" />

                {/* Liste des membres actuels */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">
                      Membres ({participantsDuGroupe.length})
                    </label>
                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                      {participantsDuGroupe.map(membre => (
                        <div key={`manage-${membre}`} className="group flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-[var(--radius)] hover:border-[var(--primary)]/30 transition-all">
                          <div className="flex items-center gap-3">
                            
                            {/* L'Avatar avec Emoji cliquable mis en avant */}
                            <div className="relative">
                              <div 
                                onClick={() => setActiveEmojiPicker(activeEmojiPicker === membre ? null : membre)}
                                className={`w-11 h-11 rounded-[var(--radius)] border-2 flex items-center justify-center text-xl shadow-lg cursor-pointer transition-all duration-300 relative overflow-hidden ${
                                  activeEmojiPicker === membre 
                                  ? 'bg-[var(--primary)] border-[var(--primary)] scale-105 shadow-[var(--primary)]/20' 
                                  : 'bg-gradient-to-tr from-white/10 to-white/5 border-white/10 hover:border-[var(--primary)]/50 hover:scale-110'
                                }`}
                              >
                                {/* Overlay au survol pour indiquer l'édition */}
                                <div className="absolute inset-0 bg-[var(--primary)]/0 group-hover:bg-[var(--primary)]/20 flex items-center justify-center transition-colors">
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Smile size={12} className="text-[var(--text-main)]" />
                                  </span>
                                </div>

                                <span className="relative z-10 filter drop-shadow-md">
                                  {getEmojiForMember(membre) || membre.substring(0, 1).toUpperCase()}
                                </span>
                              </div>

                              {/* Badge d'édition permanent pour la "discoverability" */}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--primary)] rounded-[var(--radius)] border-2 border-[#0f172a] flex items-center justify-center shadow-lg pointer-events-none">
                                <Edit2 size={8} className="text-[var(--text-main)]" strokeWidth={4} />
                              </div>
                              
                              {/* LE PICKER (Portal) */}
                              {activeEmojiPicker === membre && createPortal(
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                                  <div 
                                    className="absolute inset-0 bg-black/60 backdrop-blur-md" 
                                    onClick={() => setActiveEmojiPicker(null)} 
                                  />
                                  <div className="relative shadow-2xl animate-in zoom-in duration-200">
                                    <EmojiPicker 
                                      onEmojiClick={(emojiData) => {
                                        handleSetEmoji(membre, emojiData.emoji);
                                        setActiveEmojiPicker(null);
                                      }}
                                      theme={Theme.DARK}
                                      emojiStyle="native"
                                      width={320}
                                      height={400}
                                      previewConfig={{ showPreview: false }}
                                    />
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>

                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-[var(--text-main)]/80">{membre}</span>
                             
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => handleSupprimerMembreLocal(membre)} 
                            className="opacity-0 group-hover:opacity-100 p-2 text-rose-500/50 hover:text-rose-500 hover:bg-rose-500/10 rounded-[var(--radius)] transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

              </div>
              {/* Petit message si la liste est vide */}
            {(!participantsDuGroupe || participantsDuGroupe.length === 0) && (
              <p className="text-[10px] text-center text-[var(--text-main)]/10 py-4 italic">
                Aucun membre pour le moment
              </p>
            )}
            </div>

          
          </div>


        {/* --- COLONNE 1 : AJOUTER --- */}
        <div className="xl:col-span-1 space-y-6">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="h-2 w-2 bg-emerald-500 rounded-[var(--radius)] animate-pulse" />
            <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Nouvelle dépense</h4>
          </div>
          
          <div className="bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-6 shadow-2xl sticky top-6 max-h-[85vh] overflow-y-auto scrollbar-hide">
            <div className="space-y-6">
              
              {/* --- LIGNE : DÉSIGNATION & DATE --- */}
                <div className="grid grid-cols-2 gap-4">
                  
                  {/* Libellé */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">
                      Désignation
                    </label>
                    <input 
                      type="text"
                      value={newTransaction.libelle}
                      onChange={(e) => setNewTransaction({...newTransaction, libelle: e.target.value})}
                      placeholder="Pizza..."
                      className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] text-sm outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-main)]/10"
                    />
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">
                      Date
                    </label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus-within:border-[var(--primary)] transition-all">
                      <DatePicker
                        selected={newTransaction.date ? new Date(newTransaction.date) : null}
                        onChange={(date) => {
                          if (date) {
                            const isoDate = date.toISOString().split('T')[0];
                            setNewTransaction({ ...newTransaction, date: isoDate });
                          }
                        }}
                        dateFormat="dd/MM/yyyy"
                        className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-bold w-full cursor-pointer"
                        calendarClassName="custom-calendar-dark"
                        popperPlacement="bottom-end" // "bottom-end" pour éviter que le calendrier sorte de l'écran à gauche
                        portalId="root-portal"
                      />
                    </div>
                  </div>

                </div>

              {/* Montant Global */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Montant Total (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={newTransaction.montant}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setNewTransaction({...newTransaction, montant: val});
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] text-sm font-mono outline-none focus:border-[var(--primary)] transition-all"
                />
              </div>

              {/* Payé par (Boutons) */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Payé par</label>
                <div className="flex flex-wrap gap-2">
                  {participantsDuGroupe.map(p => (
                    <button
                      key={`payeur-${p}`}
                      onClick={() => setNewTransaction({...newTransaction, paye_par: p})}
                      className={`px-3 py-2 rounded-[var(--radius)] text-[9px] font-black uppercase transition-all ${
                        newTransaction.paye_par === p 
                        ? 'bg-[var(--primary)] text-[var(--text-main)]' 
                        : 'bg-white/5 text-[var(--text-main)]/40 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pour qui (Sélection multiple) */}
              <div className="space-y-3">
                <div className="flex justify-between items-center ml-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Pour qui ?</label>
                  <button 
                    onClick={() => {
                      // 1. On récupère la liste des gens déjà sélectionnés (ceux qui ont une clé dans l'objet)
                      const selectionnes = Object.keys(newTransaction.details_montants);
                      
                      if (selectionnes.length === 0) {
                        alert("Sélectionnez d'abord les participants en cliquant sur leurs noms.");
                        return;
                      }

                      // 2. Calcul de la part (Montant total / nombre de sélectionnés)
                      const part = parseFloat((newTransaction.montant / selectionnes.length).toFixed(2));
                      
                      // 3. On crée le nouvel objet de répartition
                      const reset = {};
                      selectionnes.forEach(m => reset[m] = part);
                      
                      setNewTransaction({
                        ...newTransaction, 
                        details_montants: reset
                      });
                    }}
                    className="text-[8px] font-bold text-[var(--text-main)]/20 hover:text-emerald-400 uppercase transition-colors"
                  >
                    Répartir entre la sélection
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {participantsDuGroupe.map(p => {
                    // On vérifie si details_montants existe AVANT d'appeler hasOwnProperty
                    const isSelected = newTransaction.details_montants && newTransaction.details_montants.hasOwnProperty(p);
                    return (
                      <div key={`part-${p}`} className="space-y-2">
                        <button
                          onClick={() => {
                            const newDetails = { ...newTransaction.details_montants };
                            if (isSelected) {
                              delete newDetails[p];
                            } else {
                              newDetails[p] = 0;
                            }
                            setNewTransaction({...newTransaction, details_montants: newDetails});
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-[var(--radius)] border transition-all ${
                            isSelected ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-transparent opacity-40'
                          }`}
                        >
                          <span className="text-xs font-bold uppercase">{p}</span>
                          <div className={`w-4 h-4 rounded-[var(--radius)] border-2 flex items-center justify-center ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-white/20'}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-[var(--radius)]" />}
                          </div>
                        </button>

                        {/* Input de montant individuel qui n'apparaît que si sélectionné */}
                        {isSelected && (
                          <div className="flex items-center gap-2 pl-4">
                            <div className="h-px flex-1 bg-white/10" />
                            <input 
                              type="number"
                              step="0.01"
                              value={newTransaction.details_montants[p] || ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setNewTransaction({
                                  ...newTransaction, 
                                  details_montants: { ...newTransaction.details_montants, [p]: val }
                                });
                              }}
                              placeholder="0.00"
                              className="w-20 bg-white/5 border border-white/10 rounded-[var(--radius)] py-1 px-2 text-right text-xs text-[var(--text-main)] font-mono outline-none focus:border-emerald-500"
                            />
                            <span className="text-[10px] text-[var(--text-main)]/20">€</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                  {/* Indicateur de reliquat */}
                  <div className={`mt-4 p-4 rounded-[var(--radius)] border transition-all duration-500 ${
                    estEquilibre 
                    ? 'bg-emerald-500/10 border-emerald-500/20' 
                    : 'bg-rose-500/10 border-rose-500/20 animate-pulse'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                        {resteARepartir > 0 ? "Reste à répartir" : resteARepartir < 0 ? "Trop réparti" : "Répartition correcte"}
                      </span>
                      <span className={`text-sm font-mono font-black ${estEquilibre ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {resteARepartir.toFixed(2)} €
                      </span>
                    </div>
                    
                    {/* Petite barre de progression visuelle */}
                    {!estEquilibre && (
                      <div className="w-full h-1 bg-white/5 rounded-[var(--radius)] mt-2 overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${resteARepartir > 0 ? 'bg-rose-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(Math.abs((totalReparti / newTransaction.montant) * 100), 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                </div>

                <button 
                  onClick={handleCreateTransaction}
                  className="w-full py-5 bg-white text-black hover:bg-emerald-500 hover:text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-500 shadow-xl"
                >
                  Enregistrer la dépense
                </button>
              </div>
            </div>
          </div>
          
          {/* --- SECTION BILAN (COL 2) --- */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center gap-3 px-2 mb-4">
                <div className="h-2 w-2 bg-[var(--primary)] rounded-[var(--radius)] animate-pulse" />
                <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">
                  Bilan des remboursements
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const membresExistants = participantsDuGroupe && participantsDuGroupe.length > 0;
                  const transfertsExistants = groupData.transferts && groupData.transferts.length > 0;

                  // --- CAS 1 : AUCUN MEMBRE ---
                  if (!membresExistants) {
                    return (
                      <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02] animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 text-3xl group-hover:scale-110 transition-transform duration-500">
                          👥
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
                          Groupe vide
                        </h5>
                        <p className="text-[11px] font-bold text-indigo-400/50 uppercase tracking-widest text-center px-8">
                          Ajoute des membres dans la colonne de gauche <br/> pour commencer les calculs.
                        </p>
                      </div>
                    );
                  }

                  // --- CAS 2 : MEMBRES MAIS AUCUNE DÉPENSE ---
                  if (!transfertsExistants) {
                    return (
                      <div className="col-span-full py-24 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02] animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-6 text-3xl">
                          ✨
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-2">
                          Comptes équilibrés
                        </h5>
                        <p className="text-[11px] font-bold text-emerald-400/50 uppercase tracking-widest text-center px-8 leading-relaxed">
                          Tout le monde est à jour ! <br/> 
                          Les remboursements apparaîtront dès la première dépense.
                        </p>
                      </div>
                    );
                  }

                  // --- CAS 3 : AFFICHAGE DU BILAN ---
                  const bilanParPersonne = {};
                  groupData.transferts.forEach(t => {
                    const emetteur = t.de.trim();
                    const recepteur = t.a.trim();
                    if (!bilanParPersonne[emetteur]) bilanParPersonne[emetteur] = { donne: [], recoit: [], solde: 0 };
                    if (!bilanParPersonne[recepteur]) bilanParPersonne[recepteur] = { donne: [], recoit: [], solde: 0 };
                    
                    bilanParPersonne[emetteur].donne.push(t);
                    bilanParPersonne[emetteur].solde -= t.montant;
                    bilanParPersonne[recepteur].recoit.push(t);
                    bilanParPersonne[recepteur].solde += t.montant;
                  });

                  return Object.keys(bilanParPersonne).map((nom) => (
                    <div 
                      key={`bilan-${nom}`} 
                      className="group bg-white/5 border border-white/10 rounded-[var(--radius)] p-6 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-500 animate-in slide-in-from-bottom-2"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          {/* L'Avatar dynamique */}
                          <div className="w-12 h-12 rounded-[var(--radius)] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <span className="filter drop-shadow-md">
                              {getEmojiForMember(nom) || nom.substring(0, 1).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="block font-black text-[var(--text-main)] uppercase tracking-tighter text-lg leading-none">
                              {nom}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest">
                              Membre actif
                            </span>
                          </div>
                        </div>
                        
                        <div className={`text-xl font-black tracking-tighter ${bilanParPersonne[nom].solde >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {bilanParPersonne[nom].solde > 0 ? "+" : ""}
                          {bilanParPersonne[nom].solde.toFixed(2)}€
                        </div>
                      </div>

                      <div className="space-y-2 mb-6 min-h-[50px]">
                        {/* Liste de ce qu'on reçoit */}
                        {bilanParPersonne[nom].recoit.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]/70 bg-emerald-500/5 p-3 rounded-[var(--radius)] border border-emerald-500/10">
                            <span className="uppercase tracking-widest text-emerald-400 font-black">Reçoit de {t.de}</span>
                            <span className="text-[var(--text-main)] font-black">{t.montant.toFixed(2)}€</span>
                          </div>
                        ))}
                        
                        {/* Liste de ce qu'on donne */}
                        {bilanParPersonne[nom].donne.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] font-bold text-[var(--text-main)]/70 bg-rose-500/5 p-3 rounded-[var(--radius)] border border-rose-500/10">
                            <span className="uppercase tracking-widest text-rose-400 font-black">Donne à {t.a}</span>
                            <span className="text-[var(--text-main)] font-black">{t.montant.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={() => handleDownloadPDF(nom)} 
                        className="w-full py-3 rounded-[var(--radius)] bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-all border border-white/5"
                      >
                        Générer PDF Individuel
                      </button>
                    </div>
                  ));
                })()}
              </div>
            </div>

          {/* --- SECTION HISTORIQUE (COL 1) --- */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2 mb-4">
              <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">Historique</h4>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setGroupToEdit({ oldName: groupes[activeTab].nom, newName: groupes[activeTab].nom });
                    setIsEditModalOpen(true);
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-[var(--radius)] border border-white/5 transition-all text-[var(--text-main)]/60 hover:text-[var(--primary)]"
                >
                  <Edit2 size={14}/>
                </button>
                <button 
                  onClick={() => {
                    setGroupToDelete(groupes[activeTab].nom);
                    setIsDeleteModalOpen(true);
                  }} 
                  className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-[var(--radius)] border border-rose-500/10 transition-all"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
              {/* --- CONDITION : SI AUCUNE DÉPENSE --- */}
              {groupData.transactions.filter(t => t.montant > 0).length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02] animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-2xl opacity-20">
                    💸
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
                    Aucune transaction
                  </p>
                  <p className="text-[11px] font-bold text-[var(--primary)]/40 mt-1 uppercase text-center px-4">
                    Le journal des dépenses est vide
                  </p>
                </div>
              ) : (
                /* --- LISTE DES TRANSACTIONS --- */
                groupData.transactions.filter(t => t.montant > 0).map((t, i) => (
                  <div 
                    key={t.id || i} 
                    className="group relative overflow-hidden min-h-[85px] flex items-center p-4 bg-white/[0.02] hover:bg-white/5 transition-all border-b border-white/5 first:rounded-[var(--radius)]"
                  >
                    {/* --- CONTENU NORMAL --- */}
                    <div className={`flex items-center justify-between w-full transition-all duration-300 ${deletingId === t.id ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                      <div>
                        <p className="text-[10px] text-[var(--text-main)]/20 font-bold uppercase">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                        <p className="text-sm font-bold text-[var(--text-main)]/80">{t.libellé}</p>
                        
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[12px] filter drop-shadow-sm">
                            {getEmojiForMember(t.payé_par) || "👤"}
                          </span>
                          <p className="text-[9px] text-[var(--primary)] font-black uppercase tracking-widest">
                            Par {t.payé_par}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span className="font-black text-sm text-[var(--text-main)]/90">{t.montant}€</span>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button 
                            onClick={() => {
                              const membres = participantsDuGroupe;
                              const montantsInitialises = {};
                              membres.forEach(m => montantsInitialises[m] = 0);

                              if (t.pour_qui && t.pour_qui.includes(':')) {
                                t.pour_qui.split(',').forEach(segment => {
                                  const [nom, montant] = segment.split(':');
                                  if (nom && montant) montantsInitialises[nom.trim()] = parseFloat(montant);
                                });
                              } else {
                                const beneficiaires = (t.pour_qui === 'Tous' || !t.pour_qui)
                                  ? membres 
                                  : t.pour_qui.split(', ').map(p => p.trim());
                                const partEgale = parseFloat((t.montant / (beneficiaires.length || 1)).toFixed(2));
                                beneficiaires.forEach(nom => {
                                  if (membres.includes(nom)) montantsInitialises[nom] = partEgale;
                                });
                              }

                              setEditingTransaction({
                                ...t,
                                date: t.date.split('T')[0],
                                details_montants: montantsInitialises
                              });
                            }}
                            className="p-2 text-[var(--text-main)]/40 hover:text-[var(--primary)] transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => setDeletingId(t.id)} 
                            className="p-2 text-[var(--text-main)]/40 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* --- OVERLAY DE CONFIRMATION (S'affiche par-dessus) --- */}
                    {deletingId === t.id && (
                      <div className="absolute inset-0 bg-rose-500/10 backdrop-blur-md flex items-center justify-between px-6 animate-in slide-in-from-right duration-300">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-rose-500 text-[var(--text-main)] rounded-[var(--radius)] flex items-center justify-center shadow-lg shadow-rose-500/40">
                            <Trash2 size={14} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">Supprimer ?</span>
                            <span className="text-[8px] text-rose-500/60 font-bold uppercase">Cette action est définitive</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setDeletingId(null)}
                            className="px-4 py-2 text-[10px] font-black uppercase text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors"
                          >
                            Annuler
                          </button>
                          <button 
                            onClick={() => executeDelete(t.id)}
                            className="px-5 py-2 bg-rose-500 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest rounded-[var(--radius)] shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all"
                          >
                            Confirmer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <button 
              onClick={() => handleDownloadPDF()} 
              className="w-full py-5 bg-[var(--primary)] hover:bg-[var(--primary)]/50 text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_20px_40px_rgba(99,102,241,0.2)] transition-all"
            >
              Bilan Complet (PDF)
            </button>
          </div>
        </div>
      


    </div>
  );
};