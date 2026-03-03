import { useState, useEffect,useMemo,useRef,forwardRef} from 'react'


import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, CartesianGrid, Legend, Cell,LabelList
} from 'recharts';
import { SketchPicker } from 'react-color'; // À mettre en haut de ton fichier
import { LayoutDashboard, ChartCandlestick, Settings2, FileUp, Wallet, Users2,Palette,Pencil,LogOut,Menu,X,Trash2,StickyNote,Calculator,TrendingUp,CreditCard,BadgeEuro,Rocket,Edit3,GripVertical,ChevronDown,ShoppingCart,Filter,Search, Plus,ArrowUpDown,User,
  Calendar,Check,Tag,Brain,Database,List,Eye,EyeOff,ArrowRight,TrendingDown,Target,Activity,ChevronRight,Save,Calendar1,Upload,MousePointerClick,Sparkles,HelpCircle,Banknote,Lock,Mail,Edit2,PieChart,Loader,AlertCircle,CheckCircle,Smile,
} from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy,verticalListSortingStrategy, } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from  "react-datepicker";
import fr from 'date-fns/locale/fr';
registerLocale('fr', fr); // Pour avoir le calendrier en français
import EmojiPicker, { Theme } from 'emoji-picker-react'; // À ajouter en haut de ton fichier
import { createPortal } from 'react-dom';
import api from './api';







const TricountManager = ({ userId }) => {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [groupData, setGroupData] = useState({ transactions: [], transferts: [] });

  // --- ÉTATS POUR LES MODALS ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  const fetchGroupes = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/get-groups/${userId}`);
      const data = await response.json();
      setGroupes(data);
    } catch (err) {
      console.error("Erreur SQL:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailsGroupe = async () => {
    if (groupes.length > 0 && groupes[activeTab]) {
      const groupName = groupes[activeTab].nom;
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/get-tricount/${userId}/${groupName}`);
        const data = await response.json();
        setGroupData(data);
      } catch (err) {
        console.error("Erreur détails groupe:", err);
      }
    }
  };

  useEffect(() => { fetchGroupes(); }, []);
  useEffect(() => { fetchDetailsGroupe(); }, [activeTab, groupes]);

// --- ACTIONS ---
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    const nouvelleTransactionVide = {
      date: new Date().toISOString().split('T')[0],
      libelle: "Création du groupe",
      montant: 0,
      paye_par: "systeme", // Changé de userId à "systeme"
      pour_qui: "systeme", // Changé de userId à "systeme"
      utilisateur: userId, // On garde userId ici pour savoir à qui appartient le groupe
      groupe: newGroupName.trim()
    };

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/save-tricount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouvelleTransactionVide)
      });
      
      setNewGroupName("");
      setIsModalOpen(false);
      fetchGroupes(); // Rafraîchit la liste des groupes
    } catch (err) {
      console.error("Erreur lors de la création du groupe:", err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/delete-group/${userId}/${groupToDelete}`, { method: 'DELETE' });
      await fetchGroupes();
      setActiveTab(0);
      setIsDeleteModalOpen(false);
    } catch (err) { console.error(err); }
  };


  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState({ oldName: "", newName: "" });

  // --- FONCTION DE RENOMMAGE ---
  const handleRenameGroup = async () => {
    if (!groupToEdit.newName.trim() || groupToEdit.newName === groupToEdit.oldName) {
        setIsEditModalOpen(false);
        return;
    }

    try {
      // On envoie la demande au backend (Assure-tu d'avoir cette route côté FastAPI)
      // Sinon, on peut le faire en mettant à jour les transactions du groupe
      await fetch(`${import.meta.env.VITE_API_URL}/rename-group`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          oldName: groupToEdit.oldName,
          newName: groupToEdit.newName.trim()
        })
      });

      await fetchGroupes();
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Erreur renommage:", err);
    }
  };


const handleDownloadPDF = async (sujet = null) => {
  // 1. Sécurité : vérifier qu'un groupe est bien sélectionné
  if (!groupes || groupes.length === 0 || !groupes[activeTab]) {
    console.error("Aucun groupe sélectionné pour le PDF");
    return;
  }

  const groupName = groupes[activeTab].nom;
  
  // 2. Construction de l'URL (le '?' gère le cas optionnel du sujet)
  let url = `${import.meta.env.VITE_API_URL}/download-pdf/${userId}/${groupName}`;
  if (sujet) {
    url += `?sujet=${encodeURIComponent(sujet)}`;
  }

  try {
    const response = await fetch(url);
    
    if (!response.ok) throw new Error("Erreur serveur lors de la génération du PDF");

    // 3. Récupération du flux binaire (Blob)
    const blob = await response.blob();
    
    // 4. Création d'un lien temporaire pour forcer le téléchargement
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Nom du fichier personnalisé
    link.download = sujet ? `Bilan_${sujet}_${groupName}.pdf` : `Bilan_Global_${groupName}.pdf`;
    
    document.body.appendChild(link);
    link.click();
    
    // 5. Nettoyage
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

  } catch (err) {
    console.error("Erreur lors du téléchargement du PDF :", err);
    alert("Impossible de générer le PDF. Vérifiez que le serveur backend est lancé.");
  }
};



const [transactions, setTransactions] = useState([]); // <--- Vérifie bien ce nom !
const [editingTransaction, setEditingTransaction] = useState(null);

const handleUpdateTransaction = async () => {
  try {
    // 1. On transforme l'objet {Théo: 10, Clémence: 20} 
    // en chaîne "Théo:10,Clémence:20" pour le SQL
    const chainePourQui = Object.entries(editingTransaction.details_montants || {})
      .filter(([_, montant]) => montant > 0) // On ne garde que ceux qui ont un montant > 0
      .map(([nom, montant]) => `${nom}:${montant}`)
      .join(',');

    // 2. On envoie le tout au serveur
    await fetch(`${import.meta.env.VITE_API_URL}/update-transaction`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingTransaction.id,
        date: editingTransaction.date,
        libelle: editingTransaction.libellé || editingTransaction.libelle,
        paye_par: editingTransaction.payé_par || editingTransaction.paye_par,
        // On remplace le simple nom par la chaîne détaillée
        pour_qui: chainePourQui || "Tous", 
        montant: parseFloat(editingTransaction.montant)
      })
    });

    setEditingTransaction(null);
    fetchDetailsGroupe();
  } catch (err) {
    console.error("Erreur update:", err);
  }
};


const [deletingId, setDeletingId] = useState(null);

const executeDelete = async (id) => {
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/delete-transaction/${id}`, { method: 'DELETE' });
    fetchDetailsGroupe();
    setDeletingId(null);
  } catch (err) {
    console.error("Erreur delete:", err);
    setDeletingId(null);
  }
};


const participantsDuGroupe = useMemo(() => {
  const nomsUniques = new Set();

  // 1. Membres officiels (votre logique actuelle)
  if (groupes && groupes[activeTab] && groupes[activeTab].membres) {
    const membresRaw = groupes[activeTab].membres;
    let listeOfficielle = [];
    if (typeof membresRaw === 'string') {
      listeOfficielle = membresRaw.split(',').map(m => m.trim());
    } else if (Array.isArray(membresRaw)) {
      listeOfficielle = membresRaw;
    }
    listeOfficielle.forEach(m => { if(m) nomsUniques.add(m) });
  } 

  // 2. Scan complet des transactions (Payeurs + Bénéficiaires)
  if (groupData.transactions && groupData.transactions.length > 0) {
    groupData.transactions.forEach(t => {
      // On ajoute le payeur
      if (t.payé_par) nomsUniques.add(t.payé_par.trim());
      
      // --- AJOUT ICI : Scan du champ pour_qui ---
      if (t.pour_qui) {
        // On sépare par virgule (Theo:10,Marie:5)
        const segments = t.pour_qui.split(',');
        segments.forEach(segment => {
          // On prend ce qu'il y a avant le ":" (ou le segment entier si pas de ":")
          const nom = segment.split(':')[0].trim();
          if (nom) nomsUniques.add(nom);
        });
      }
    });
  }

  // 3. Filtrage et tri (votre logique actuelle)
  return Array.from(nomsUniques)
    .filter(m => {
      const nomNettoye = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); 
      return nomNettoye !== "" && nomNettoye !== "systeme" && nomNettoye !== "undefined";
    })
    .sort((a, b) => a.localeCompare(b));

}, [groupes, activeTab, groupData.transactions]);


const updateMontantIndividuel = (nom, valeur) => {
  // 1. On nettoie la valeur (on accepte les points et virgules)
  const numValeur = parseFloat(valeur.replace(',', '.')) || 0;
  
  // 2. On crée une copie propre des montants
  const nouveauxMontants = { ...(editingTransaction.details_montants || {}) };
  nouveauxMontants[nom] = numValeur;
  
  // 3. Calcul du nouveau total
  const nouveauTotal = Object.values(nouveauxMontants).reduce((a, b) => a + b, 0);
  
  // 4. Déterminer la chaîne "pour_qui"
  const actifs = Object.keys(nouveauxMontants).filter(k => nouveauxMontants[k] > 0);
  let pourQuiTexte = "Tous";
  if (actifs.length !== participantsDuGroupe.length) {
    pourQuiTexte = actifs.join(', ');
  }

  // 5. MISE À JOUR DE L'ÉTAT
  setEditingTransaction(prev => ({
    ...prev,
    details_montants: nouveauxMontants,
    montant: parseFloat(nouveauTotal.toFixed(2)),
    pour_qui: pourQuiTexte
  }));
};

const [newTransaction, setNewTransaction] = useState({
  libelle: "",
  montant: 0,
  paye_par: userId, // ou le premier participant
  date: new Date().toISOString().split('T')[0],
  details_montants: {} // <--- IMPORTANT : Ne pas oublier ça !
});

const [notification, setNotification] = useState({ show: false, message: "", type: "error" });
const showToast = (message, type = "error") => {
  setNotification({ show: true, message, type });
  setTimeout(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, 3000); // Disparaît après 3 secondes
};

const handleCreateTransaction = async () => {
  const emojiPayeur = getEmojiForMember(newTransaction.paye_par) || "👤";
// 1. Vérification du Libellé
  if (!newTransaction.libelle || newTransaction.libelle.trim() === "") {
    showToast("Veuillez donner un nom à cette dépense (ex: Pizza).", "error");
    return;
  }

  // 2. Vérification du Montant Global
  const montantGlobal = parseFloat(newTransaction.montant);
  if (!montantGlobal || montantGlobal <= 0) {
    showToast("Le montant doit être supérieur à 0€.", "error");
    return;
  }

  // 3. Vérification des Participants (doit y en avoir au moins un)
  const selectionnes = Object.keys(newTransaction.details_montants || {});
  if (selectionnes.length === 0) {
    showToast("Sélectionnez au moins une personne qui profite de cette dépense.", "error");
    return;
  }

  // 4. Vérification de l'équilibre (Somme des parts == Montant Global)
  const totalReparti = Object.values(newTransaction.details_montants).reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
  const ecart = Math.abs(montantGlobal - totalReparti);

  if (ecart > 0.01) {
    showToast(`Déséquilibre de ${ecart.toFixed(2)}€. Ajustez les parts individuelles.`, "error");
    return;
  }
  try {
    // 1. On transforme l'objet {Aude: 10, Marc: 5} en chaîne "Aude:10,Marc:5"
    // On utilise les montants saisis manuellement dans le formulaire
    const parts = Object.entries(newTransaction.details_montants || {})
      .filter(([_, montant]) => montant > 0) // On ne garde que ceux qui participent vraiment
      .map(([nom, montant]) => `${nom.trim()}:${montant}`)
      .join(',');

    // 2. Si aucune part n'est saisie (formulaire vide), on peut mettre "Tous" 
    // ou bloquer l'envoi
    if (!parts && newTransaction.montant > 0) {
      alert("Veuillez sélectionner au moins un participant pour cette dépense.");
      return;
    }

    const payload = {
      ...newTransaction,
      
      date: newTransaction.date,
      libelle: newTransaction.libelle,
      montant: parseFloat(newTransaction.montant),
      paye_par: newTransaction.paye_par,
      pour_qui: parts, // <--- C'est ici qu'on envoie tes montants personnalisés !
      utilisateur: userId,
      groupe: groupes[activeTab].nom,
      emoji: emojiPayeur // On ajoute l'emoji ici !
    };

    const response = await fetch(`${import.meta.env.VITE_API_URL}/save-tricount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      // Reset du formulaire avec l'objet vide pour éviter l'erreur hasOwnProperty au prochain coup
      setNewTransaction({
        libelle: "",
        montant: 0,
        paye_par: userId,
        date: new Date().toISOString().split('T')[0],
        details_montants: {} 
      });
      showToast("Dépense enregistrée avec succès !", "success");
      fetchDetailsGroupe();
    }
  } catch (err) {
    console.error("Erreur lors de la création :", err);
  }
};

// On calcule la somme actuelle des parts
const totalReparti = Object.values(newTransaction.details_montants || {}).reduce((acc, curr) => acc + curr, 0);
// On calcule l'écart
const resteARepartir = (parseFloat(newTransaction.montant) || 0) - totalReparti;
// On définit une couleur selon l'état (Proche de 0 = Vert, sinon Rouge/Orange)
const estEquilibre = Math.abs(resteARepartir) < 0.01;




const handleAjouterMembreLocal = (nom) => {
  const nomNettoye = nom.trim();
  if (!nomNettoye) return;

  // 1. On crée une copie profonde de tout le tableau des groupes
  const copieGroupes = JSON.parse(JSON.stringify(groupes));
  
  // 2. On récupère le groupe sur lequel on travaille
  const groupeActuel = copieGroupes[activeTab];

  if (!groupeActuel) return;

  // 3. On prépare la liste des membres proprement
  let listeMembres = [];
  if (groupeActuel.membres && typeof groupeActuel.membres === 'string') {
    listeMembres = groupeActuel.membres.split(',').filter(m => m.trim() !== "");
  }

  // 4. On vérifie si le nom existe déjà
  if (listeMembres.includes(nomNettoye)) {
    showToast("Ce membre existe déjà", "error");
    return;
  }

  // 5. ON AJOUTE (on ne remplace pas, on push dans la copie)
  listeMembres.push(nomNettoye);
  
  // 6. On remet la liste sous forme de chaîne dans notre COPIE
  groupeActuel.membres = listeMembres.join(',');

  // 7. On met à jour l'état avec le tableau complet modifié
  setGroupes(copieGroupes);
  
  showToast(`${nomNettoye} ajouté à la session`, "success");
};

const handleSupprimerMembreLocal = (nom) => {
  setGroupes(prevGroupes => {
    return prevGroupes.map((groupe, index) => {
      if (index !== activeTab) return groupe;

      const nouvelleListe = (groupe.membres || "")
        .split(',')
        .filter(m => m !== nom && m.trim() !== "");

      return {
        ...groupe,
        membres: nouvelleListe.join(',')
      };
    });
  });
  
  showToast(`${nom} retiré`, "success");
};

const [activeEmojiPicker, setActiveEmojiPicker] = useState(null); // Stockera le nom du membre
const handleSetEmoji = async (nom, emoji) => {
  // 1. Mise à jour immédiate de l'interface (Local)
  setGroupes(prevGroupes => {
    return prevGroupes.map((groupe, index) => {
      if (index !== activeTab) return groupe;

      const emojiMap = {};
      if (groupe.emojis) {
        groupe.emojis.split(',').forEach(item => {
          const [n, e] = item.split(':');
          if (n && e) emojiMap[n] = e;
        });
      }
      emojiMap[nom] = emoji;
      const nouvelleChaine = Object.entries(emojiMap)
        .map(([n, e]) => `${n}:${e}`)
        .join(',');

      return { ...groupe, emojis: nouvelleChaine };
    });
  });

  // 2. Mise à jour de la base de données (Synchro)
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/update-member-emoji`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userId,           // Ton utilisateur connecté
        group_name: groupes[activeTab].nom,
        member_name: nom,             // Le membre qui change d'emoji
        new_emoji: emoji
      })
    });

    if (response.ok) {
        // Optionnel : recharger les données pour être sûr que l'historique est à jour
        fetchDetailsGroupe(groupes[activeTab].nom); 
        showToast(`Emoji mis à jour pour ${nom}`, "success");
    }
  } catch (error) {
    console.error("Erreur synchro emoji:", error);
    showToast("Erreur de sauvegarde de l'emoji", "error");
  }
};

const getEmojiForMember = (nom) => {
  const groupeActuel = groupes[activeTab];
  if (!groupeActuel || !groupeActuel.emojis) return null;
  
  const match = groupeActuel.emojis.split(',').find(item => item.startsWith(`${nom}:`));
  return match ? match.split(':')[1] : null;
};





  if (loading) return <div className="flex justify-center p-10"></div>;

  return (
    <div className="p-2 w-full mx-auto min-h-screen bg-transparent text-[var(--text-main)] relative">


      {/* --- SYSTÈME DE NOTIFICATION DESIGN --- */}
        <div className={`fixed top-6 right-6 z-[200] transition-all duration-500 transform ${notification.show ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0 pointer-events-none'}`}>
          <div className={`relative overflow-hidden backdrop-blur-xl border p-5 rounded-[var(--radius)] shadow-2xl min-w-[320px] ${
            notification.type === 'error' 
            ? 'bg-rose-500/10 border-rose-500/20' 
            : 'bg-emerald-500/10 border-emerald-500/20'
          }`}>
            {/* Barre de progression d'expiration */}
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-[3000ms] ease-linear ${
              notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'
            }`} style={{ width: notification.show ? '100%' : '0%' }} />

            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-[var(--radius)] flex items-center justify-center ${
                notification.type === 'error' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Système</h4>
                <p className="text-sm font-bold text-[var(--text-main)]/90 leading-tight">{notification.message}</p>
              </div>
            </div>
          </div>
        </div>


      {editingTransaction && (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setEditingTransaction(null)} />
        
        <div className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 text-[var(--text-main)]">Modifier la dépense</h3>
          
          <div className="space-y-6">
            {/* Libellé */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Libellé</label>
              <input 
                type="text"
                value={editingTransaction.libellé}
                onChange={(e) => setEditingTransaction({...editingTransaction, libellé: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                placeholder="Ex: Restaurant, Courses..."
              />
            </div>
            
            {/* Montant & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">Montant (€)</label>
                <input 
                  type="number"
                  step="0.01" // <--- ICI AUSSI
                  value={editingTransaction.montant}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEditingTransaction({...editingTransaction, montant: val});
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus:border-[var(--primary)] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 ml-2">
                  Date
                </label>
                <div className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 text-[var(--text-main)] outline-none focus-within:border-[var(--primary)] transition-all">
                  <DatePicker
                    // Conversion de la string ISO en objet Date pour l'affichage
                    selected={editingTransaction.date ? new Date(editingTransaction.date) : null}
                    
                    // Conversion de l'objet Date en string ISO pour l'état React
                    onChange={(date) => {
                      if (date) {
                        // On garde uniquement la partie YYYY-MM-DD
                        const isoDate = date.toISOString().split('T')[0];
                        setEditingTransaction({ ...editingTransaction, date: isoDate });
                      }
                    }}
                    
                    dateFormat="dd/MM/yyyy"
                    // On utilise bg-transparent car le parent a déjà le style rounded-2xl
                    className="bg-transparent border-none outline-none text-[var(--text-main)] text-sm font-bold w-full cursor-pointer"
                    calendarClassName="custom-calendar-dark"
                    popperPlacement="bottom-start"
                    portalId="root-portal"
                  />
                </div>
              </div>
            </div>

            {/* --- PAYÉ PAR (Sélection Unique) --- */}
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--primary)] ml-2">Payé par</label>
              <div className="flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-[var(--radius)]">
                {participantsDuGroupe.map(personne => (
                  <button
                    key={personne}
                    onClick={() => setEditingTransaction({...editingTransaction, payé_par: personne})}
                    className={`px-4 py-2 rounded-[var(--radius)] text-[10px] font-black uppercase transition-all ${
                      editingTransaction.payé_par === personne 
                      ? 'bg-[var(--primary)] text-[var(--text-main)] shadow-lg' 
                      : 'bg-white/5 text-[var(--text-main)]/40 hover:bg-white/10'
                    }`}
                  >
                    {personne}
                  </button>
                ))}
              </div>
            </div>

            {/* Remplace la section "Pour qui" par ce bloc */}
            <div className="space-y-4">
              <div className="flex justify-between items-center ml-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Répartition des frais
                </label>
                <button 
                  onClick={() => {
                    const membres = participantsDuGroupe;
                    const part = parseFloat((editingTransaction.montant / membres.length).toFixed(2));
                    const reset = {};
                    membres.forEach(m => reset[m] = part);
                    
                    setEditingTransaction({
                      ...editingTransaction, 
                      details_montants: reset, 
                      pour_qui: 'Tous'
                    });
                  }}
                  className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-[var(--radius)] hover:bg-emerald-500/20"
                >
                  Réinitialiser (Équitable)
                </button>
              </div>

              <div className="space-y-2 bg-white/5 p-4 rounded-[var(--radius)] border border-white/10">
                {participantsDuGroupe.map(personne => (
                  <div key={personne} className="flex items-center gap-4 p-2">
                    <div className="flex-1">
                      <span className="text-sm font-bold text-[var(--text-main)]/80">{personne}</span>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number" // Tu peux garder number ou utiliser text avec inputMode="decimal"
                        step="0.01"    // <--- C'EST CETTE LIGNE QUI DÉBLOQUE LA VIRGULE
                        inputMode="decimal" 
                        value={editingTransaction.details_montants?.[personne] ?? ""} 
                        onChange={(e) => updateMontantIndividuel(personne, e.target.value)}
                        placeholder="0.00"
                        className="w-24 bg-white/5 border border-white/10 rounded-[var(--radius)] py-2 px-3 text-right text-[var(--text-main)] font-mono text-sm outline-none focus:border-emerald-500 transition-all"
                      />
                      <span className="ml-2 text-[10px] text-[var(--text-main)]/30">€</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Récapitulatif dynamique */}
              <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-[var(--radius)] flex justify-between items-center">
                <div className="text-[10px] font-black uppercase text-[var(--primary)] tracking-tighter">Total de la dépense</div>
                <div className="text-xl font-black text-[var(--text-main)]">{Number(editingTransaction.montant || 0).toFixed(2)}€</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-4 mt-10">
            <button 
              onClick={() => setEditingTransaction(null)} 
              className="py-4 rounded-[var(--radius)] bg-white/5 font-black uppercase text-[10px] tracking-widest text-[var(--text-main)]/60 hover:bg-white/10 transition-all"
            >
              Annuler
            </button>
            <button 
              onClick={handleUpdateTransaction} 
              className="py-4 rounded-[var(--radius)] bg-[var(--primary)] font-black uppercase text-[10px] tracking-widest text-[var(--text-main)] shadow-xl shadow-[var(--primary)]/20 hover:bg-[var(--primary)] transition-all"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    )}


      {/* --- MODAL EDIT (RENOMMER) --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-8 shadow-2xl">
            <div className="w-12 h-12 bg-[var(--primary)]/10 text-[var(--primary)] rounded-[var(--radius)] flex items-center justify-center mb-6">
              <Edit2 size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-1">Modifier le nom</h3>
            <p className="text-[var(--text-main)]/40 text-[10px] font-bold uppercase tracking-widest mb-8 text-[var(--primary)]">Ancien nom : {groupToEdit.oldName}</p>
            
            <input 
              autoFocus
              value={groupToEdit.newName}
              onChange={(e) => setGroupToEdit({...groupToEdit, newName: e.target.value})}
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 mb-8 text-[var(--text-main)] font-black uppercase tracking-widest focus:border-[var(--primary)] outline-none transition-all"
            />

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsEditModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-white/5 text-[10px] font-black uppercase tracking-widest">Annuler</button>
              <button onClick={handleRenameGroup} className="py-4 rounded-[var(--radius)] bg-[var(--primary)] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--primary)]/20">Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- MODAL CRÉATION DE GROUPE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-8 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--primary)] to-purple-500" />
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Nouveau Groupe</h3>
            <p className="text-[var(--text-main)]/40 text-[10px] font-bold uppercase tracking-widest mb-8">Définissez le nom de votre projet</p>
            
            <input 
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="NOM DU GROUPE..."
              className="w-full bg-white/5 border border-white/10 rounded-[var(--radius)] p-4 mb-8 text-[var(--text-main)] font-bold uppercase tracking-widest placeholder:text-[var(--text-main)]/10 focus:outline-none focus:border-[var(--primary)] transition-colors"
            />

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10">Annuler</button>
              <button onClick={handleCreateGroup} className="py-4 rounded-[var(--radius)] bg-[var(--primary)] shadow-[0_10px_20px_rgba(99,102,241,0.3)] text-[10px] font-black uppercase tracking-widest">Confirmer</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL SUPPRESSION (Look login.jsx) --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-[#0f172a] border border-rose-500/20 rounded-[var(--radius)] p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-[var(--radius)] flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Supprimer le groupe ?</h3>
            <p className="text-[var(--text-main)]/40 text-xs mb-8 font-medium italic">"{groupToDelete}" sera définitivement effacé.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsDeleteModalOpen(false)} className="py-4 rounded-[var(--radius)] bg-white/5 text-[10px] font-black uppercase tracking-widest">Garder</button>
              <button onClick={handleDeleteGroup} className="py-4 rounded-[var(--radius)] bg-rose-500 text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(244,63,94,0.3)]">Supprimer</button>
            </div>
          </div>
        </div>
      )}



      {/* --- HEADER COMPACT --- */}
        <div className="flex justify-between items-center mb-2 p-2 rounded-[var(--radius)] bg-white/5 border border-white/10">
          <div>
            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Tricount</h2>
            <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-1">
              {groupes.length} Groupes
            </p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-[var(--primary)] hover:bg-[var(--primary)] text-[var(--text-main)] p-3 rounded-[var(--radius)] flex items-center gap-2 transition-all font-black uppercase text-[9px] tracking-widest"
          >
            <Plus size={14} strokeWidth={4} /> Nouveau
          </button>
        </div>

      {/* --- TABS MINIMALISTES --- */}
        <div className="flex gap-2 p-1.5 overflow-x-auto mb-6 scrollbar-hide bg-black/20 rounded-[var(--radius)] border border-white/5">
          {groupes.map((grp, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`py-2 px-5 text-[9px] font-black uppercase tracking-widest rounded-[var(--radius)] transition-all whitespace-nowrap ${
                activeTab === index 
                ? "bg-white/10 text-[var(--text-main)] border border-white/10 shadow-lg" 
                : "text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60"
              }`}
            >
              {grp.nom}
            </button>
          ))}
        </div>

    {groupes.length > 0 ? (
      <div className="space-y-10">
        
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
            <div className="lg:col-span-2 flex flex-col h-[calc(90vh-180px)] space-y-6">
              <div className="flex items-center gap-3 px-2 mb-4 shrink-0">
                <div className="h-2 w-2 bg-[var(--primary)] rounded-[var(--radius)] animate-pulse" />
                <h4 className="text-xs font-black text-[var(--text-main)]/60 uppercase tracking-[0.3em]">
                  Bilan des remboursements
                </h4>
              </div>

            <div className="flex-1 min-h-0 pr-2 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(() => {
                  const membresExistants = participantsDuGroupe && participantsDuGroupe.length > 0;
                  const transfertsExistants = groupData.transferts && groupData.transferts.length > 0;

                  // --- CAS 1 : AUCUN MEMBRE ---
                  if (!membresExistants) {
                    return (
                      <div className="col-span-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02] animate-in fade-in zoom-in duration-500">
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
                      <div className="col-span-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02] animate-in fade-in zoom-in duration-500">
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
                      className="group bg-white/5 border border-white/10 rounded-[var(--radius)] p-6 hover:bg-white/[0.08] hover:border-indigo-500/30 transition-all duration-500 animate-in slide-in-from-bottom-2 flex flex-col"
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

                      <div className="space-y-2 mb-6 flex-1">
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
          </div>
          {/* --- SECTION HISTORIQUE (COL 1) --- */}
          
          <div className="flex flex-col h-[calc(90vh-180px)] space-y-6">
           <div className="flex items-center justify-between px-2 mb-4 shrink-0">
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

            <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2 scrollbar-hide border-b border-white/5">
              {/* --- CONDITION : SI AUCUNE DÉPENSE --- */}
              {groupData.transactions.filter(t => t.montant > 0).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.02]">
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
    ) : (
      /* --- ÉTAT VIDE STYLE LOGIN --- */
      <div className="flex flex-col items-center justify-center p-20 bg-white/5 rounded-[var(--radius)] border border-white/10">
        <div className="w-20 h-20 bg-[var(--primary)]/20 text-[var(--primary)] rounded-[var(--radius)] flex items-center justify-center mb-6 shadow-inner">
          <Plus size={40} strokeWidth={3} />
        </div>
        <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter mb-2">Aucun groupe actif</h3>
        <p className="text-[var(--text-main)]/30 text-[10px] font-bold uppercase tracking-widest">Initialisez un projet pour commencer</p>
      </div>
    )}
  </div>
);
};




const HelpPopover = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);

const bankGuides = [
  { 
    id: 'lbp', 
    name: 'La Banque Postale', 
    guide: 'Menu latéral gauche > OPÉRATIONS > "Téléchargement d\'opérations" > Choisir le compte > Format CSV.' 
  },
  { 
    id: 'bourso', 
    name: 'BoursoBank', 
    guide: 'Cliquer sur le compte > Filtrer la période > Bouton "Exporter en Format CSV" (situé tout en bas sous la liste des mouvements).' 
  },
  { 
    id: 'revolut', 
    name: 'Revolut', 
    guide: 'Accueil > Cliquer sur "..." (Plus) > Relevés > Relevé de transactions > Choisir Excel (CSV) > Générer.' 
  },
  { 
    id: 'bp', 
    name: 'Banque Populaire', 
    guide: 'Menu "Documents" (haut) > "Vos écritures et opérations" (gauche) > Sélectionner CSV (Excel) > Choisir les dates.' 
  },
  { 
    id: 'ca', 
    name: 'Crédit Agricole', 
    guide: 'Menu "Documents" > "Télécharger l\'historique des opérations" > Sélectionner le compte > Format CSV.' 
  },
  { 
    id: 'bnplcl', 
    name: 'BNP / LCL', 
    guide: 'Rubrique "Comptes & Contrats" > "Télécharger vos relevés d\'opération" > Choisir le format CSV (si proposé) ou Export.' 
  },
  { 
    id: 'sg', 
    name: 'Société Générale', 
    guide: 'Sélectionner le compte > Onglet "Autres" > "Export" > Choisir le format CSV et la période.' 
  }
];

  return (
    <div className="relative"> {/* Le parent reste en relative */}
      
      {/* BOUTON D'APPEL */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[52px] px-4 rounded-2xl flex items-center gap-3 transition-all duration-300 border ${
          isOpen ? 'bg-white/10 border-[var(--primary)]/50' : 'bg-white/[0.02] border-white/10'
        }`}
      >
        <div className="p-1.5 bg-white/5 rounded-lg">
          <HelpCircle size={16} className={isOpen ? 'text-[var(--primary)]' : 'text-[var(--text-main)]/40'} />
        </div>
        <div className="flex flex-col items-start hidden md:flex">
          <span className="text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-widest text-left">Guide Export CSV</span>
          <span className="text-[8px] text-[var(--text-main)]/10 font-bold uppercase text-left">Aide banques</span>
        </div>
      </button>

      {/* LE POPOVER ORIENTÉ VERS LE BAS */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => {setIsOpen(false); setSelectedBank(null);}} />
          
          {/* CHANGEMENT ICI : top-[110%] au lieu de bottom */}
          <div className="absolute right-0 top-[110%] mt-2 w-72 bg-[#161618] border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-5 border-b border-white/5 bg-white/[0.02]">
              <h4 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Exporter mon CSV</h4>
              <p className="text-[8px] text-[var(--text-main)]/20 uppercase font-bold mt-1">Sélectionnez votre banque</p>
            </div>

            <div className="p-2 max-h-[350px] overflow-y-auto custom-scrollbar">
              {!selectedBank ? (
                <div className="space-y-1">
                  {bankGuides.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => setSelectedBank(bank)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group/item text-left"
                    >
                      <span className="text-[10px] font-bold text-[var(--text-main)]/60 group-hover/item:text-[var(--primary)] uppercase">{bank.name}</span>
                      <ChevronRight size={14} className="text-[var(--text-main)]/10 group-hover/item:text-[var(--primary)]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2 animate-in slide-in-from-right-2 duration-300">
                  <button 
                    onClick={() => setSelectedBank(null)}
                    className="text-[8px] font-black text-[var(--primary)] uppercase mb-4 flex items-center gap-2 hover:opacity-70"
                  >
                    ← Retour
                  </button>
                  <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/10 p-4 rounded-2xl">
                    <span className="text-[9px] font-black text-[var(--primary)] uppercase block mb-2">{selectedBank.name}</span>
                    <p className="text-[11px] text-[var(--text-main)]/80 font-medium leading-relaxed uppercase tracking-tight">
                      {selectedBank.guide}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};




const CustomBadgeDate = forwardRef(({ value, onClick, t }, ref) => {
  // Logique d'extraction identique
  let displayDay = '??';
  let displayMonth = '??';
  let displayYear = '202X';

  if (t.date) {
    const dateSeule = t.date.includes('T') ? t.date.split('T')[0] : t.date;
    const parties = dateSeule.split(dateSeule.includes('-') ? '-' : '/');
    displayDay = dateSeule.includes('-') ? parties[2] : parties[0];
    displayMonth = parties[1];
    displayYear = parties[0]; // L'année est le premier index en format YYYY-MM-DD
  } else if (t.année) {
    displayYear = t.année;
  }

  const moisNoms = { 
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', '05': 'MAI', '06': 'JUIN', 
    '07': 'JUIL', '08': 'AOUT', '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DEC' 
  };

  return (
    <div className="flex items-center ref={ref}">
      {/* LE BADGE VISUEL COMPACT */}
      <div 
        className="relative w-[54px] h-[54px] flex flex-col items-center justify-center bg-white/[0.03] border border-white/10 rounded-xl transition-all duration-300 shadow-lg"
      >
        {/* L'ANNÉE intégrée en haut */}
        <span className="text-[7px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em] mb-0.5">
          {displayYear}
        </span>

        {/* LE JOUR */}
        <span className="text-sm font-black text-[var(--text-main)] leading-none">
          {displayDay}
        </span>

        {/* LE MOIS */}
        <span className="text-[8px] font-bold text-[var(--primary)]/60 uppercase tracking-widest mt-1">
          {moisNoms[displayMonth] || displayMonth}
        </span>
      </div>
    </div>
  );
});




const CustomSelect = ({ label, value, options, onChange, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Fermer si on clique en dehors et reset la recherche
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

  // 1. Filtrer les options selon la recherche
  const filteredOptions = options.filter(opt =>
    opt.l.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Trouver le label correspondant à la valeur actuelle
  const currentLabel = options.find(opt => opt.v === value)?.l || value;

  return (
    <div className="space-y-1.5 relative" ref={dropdownRef}>
      {label && (
        <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] ml-1">
          {label}
        </label>
      )}
      
      {/* ZONE DE SAISIE / BOUTON */}
      <div
        className={`w-full flex items-center justify-between bg-white/5 border ${
          isOpen ? 'border-[var(--primary)]/50 bg-white/10' : 'border-white/10'
        } p-3.5 rounded-2xl transition-all outline-none cursor-text`}
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center gap-3 w-full">
          {Icon && <Icon size={14} className="text-[var(--primary)] shrink-0" />}
          
          <input
            type="text"
            className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full placeholder:text-[var(--text-main)]/20"
            // Si c'est ouvert, on montre ce qu'on tape, sinon on montre la valeur sélectionnée
            value={isOpen ? searchTerm : currentLabel}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder="Rechercher..."
          />
        </div>
        <ChevronDown 
          size={14} 
          className={`text-[var(--text-main)]/20 transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* MENU DÉROULANT */}
      {isOpen && (
        <div className="absolute top-[110%] left-0 w-full z-[100] bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <div
                  key={opt.v}
                  onClick={() => {
                    onChange(opt.v);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                  className={`px-4 py-3 text-xs font-bold cursor-pointer transition-colors ${
                    value === opt.v 
                    ? 'bg-indigo-600 text-[var(--text-main)]' 
                    : 'text-[var(--text-main)]/60 hover:bg-white/5 hover:text-[var(--text-main)]'
                  }`}
                >
                  {opt.l}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-xs text-[var(--text-main)]/20 italic text-center">
                Aucune catégorie trouvée
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};





function SortableItem({ id, children, disabled }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 'auto',
    position: 'relative',
    touchAction: 'none', // Important pour le drag sur mobile
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className={`group relative border transition-all rounded-[24px] ${
        isDragging ? 'shadow-2xl scale-[1.02] rotate-1' : ''
      }`}>
        
        {/* LA POIGNÉE CENTRÉE EN HAUT */}
        {!disabled && (
          <div 
            {...listeners} 
            className="absolute top-0 left-1/2 -translate-x-1/2  w-12 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-full cursor-grab active:cursor-grabbing z-50 transition-colors backdrop-blur-sm"
          >
            {/* Petit motif de points pour suggérer le drag */}
            <div className="flex gap-0.5">
              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 bg-white/40 rounded-full" />)}
            </div>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}


{/* --- FONCTION DE RENDU DU GRAPHE (A placer avant le return du composant) --- */}
                  // --- SOUS-COMPOSANT POUR LE GRAPHIQUE ---
const CategoriesView = ({ statsCategories, chartData, hiddenCategories, toggleCategory }) => (
  <div className="h-full w-full flex flex-row gap-4"> {/* Changement ici : flex-row */}
    {statsCategories.length > 0 ? (
      <>
        {/* PARTIE GRAPHIQUE (Gauche) */}
        <div className="flex-[2] min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 15, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBarHoriz" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity={0}/>
                  <stop offset="100%" stopColor="#fb7185" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <XAxis type="number" hide />
              <YAxis 
                dataKey="name" 
                type="category" 
                axisLine={false}
                tickLine={false}
                width={120}
                // On tronque le nom directement dans le tickFormatter
                tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 'bold' }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                contentStyle={{ backgroundColor: '#ffffff', border: 'none', borderRadius: '12px' }} 
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="url(#colorBarHoriz)" />
                ))}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  offset={8} 
                  formatter={(val) => `${Math.round(val)}€`} 
                  style={{ fill: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900' }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PARTIE LÉGENDE (Droite) */}
        <div className="flex-1 min-w-[120px] overflow-y-auto custom-scrollbar border-l border-white/5 pl-4">
          <p className="text-[9px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em] mb-3">
            Légende
          </p>
          <div className="flex flex-col gap-1">
            {statsCategories.map((item, i) => {
              const isHidden = hiddenCategories.includes(item.name);
              return (
                <button 
                  key={i} 
                  onClick={() => toggleCategory(item.name)} 
                  className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    isHidden ? 'opacity-30' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isHidden ? 'bg-white/20' : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]'
                    }`} />
                    <span className="text-[9px] font-bold uppercase text-[var(--text-main)]/70 truncate max-w-[100px]">
                      {item.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </>
    ) : (
      <div className="h-full w-full flex items-center justify-center text-[var(--text-main)]/10 text-[10px] uppercase font-black">
        Aucune donnée
      </div>
    )}
  </div>
);



const PrevisionsChartView = ({ data, themeColor }) => {
  if (data.length === 0) return (
    <div className="h-full w-full flex items-center justify-center text-[var(--text-main)]/10 text-[10px] uppercase font-black italic">
      Aucune dépense prévisionnelle
    </div>
  );

  return (
    <div className="h-full w-full flex flex-row gap-6 p-4">
      {/* PARTIE GRAPHIQUE */}
      <div className="flex-[2] min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 35, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPrevi" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={themeColor} stopOpacity={0}/>
                <stop offset="100%" stopColor={themeColor} stopOpacity={0.9}/>
              </linearGradient>
            </defs>
            <XAxis type="number" hide />
            <YAxis 
              dataKey="name" 
              type="category" 
              axisLine={false}
              tickLine={false}
              width={90}
             
              tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
              contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(val) => [`${val.toLocaleString()} €`, 'Montant']}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="url(#colorPrevi)" />
              ))}
              <LabelList 
                dataKey="value" 
                position="right" 
                formatter={(val) => `${Math.round(val)}€`} 
                style={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'black', fontStyle: 'italic' }} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};



const SortableAccountCard = ({ c }) => {
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
  };

  return (
    <div 
      ref={setNodeRef}
      style={containerStyle}
      {...attributes}
      {...listeners}
      className="flex-1 min-w-[160px] h-32 outline-none" 
    >
      {/* LA CARTE VISUELLE */}
      <div 
        className={`
          w-full h-full p-5 rounded-[var(--radius)] 
          flex flex-col justify-between
          relative overflow-hidden group 
          cursor-grab active:cursor-grabbing shadow-lg
          will-change-transform
          transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          
          /* Bordures et Effets selon l'état */
          ${isEstimated 
            ? 'border-[1.5px] border-white/40 saturate-[0.85] brightness-110 animate-pulse-subtle' 
            : 'border border-white/20 saturate-100'
          }
          
          /* Animation Drag vs Hover */
          ${isDragging 
            ? 'scale-105 rotate-2 shadow-2xl opacity-40 brightness-125 ring-2 ring-white/30' 
            : 'hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]'
          }
        `}
        style={{
          background: isEstimated
            ? `linear-gradient(135deg, ${c.couleur}dd 0%, ${c.couleur}aa 100%)`
            : `linear-gradient(135deg, ${c.couleur} 0%, ${c.couleur}dd 100%)`,
        }}
      >
        {/* 1. Motif de fond vitreux (plus prononcé si estimé) */}
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/30 to-transparent pointer-events-none ${isEstimated ? 'opacity-40' : 'opacity-20'}`} />
        
        {/* Overlay de texture pour le côté "holographique" des prévisions */}
        {isEstimated && (
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        )}
        
        {/* 2. Cercle de lumière dynamique au survol */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/30 group-hover:scale-150 transition-all duration-700" />

        {/* 3. Header de la carte */}
        <div className="flex justify-between items-start relative z-10">
          <div className="flex flex-col">
            <span className={`text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1 italic ${isEstimated ? 'text-[var(--text-main)]/60' : 'text-[var(--text-main)]/40'}`}>
              {c.groupe || 'Compte'}
            </span>
            <h4 className="text-[var(--text-main)] font-bold text-xs tracking-tight truncate max-w-[100px] uppercase">
              {c.compte}
            </h4>
          </div>
          
          <div className={`w-10 h-10 rounded-2xl backdrop-blur-lg border flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ${isEstimated ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'}`}>
            {(() => {
              const g = (c.compte || "").toString().toLowerCase().trim();
              if (g.includes('ccp')) return <CreditCard size={18} className="text-[var(--text-main)]/80" />;
              if (g.includes('livret')|| g.includes('lep')) return <BadgeEuro size={18} className="text-[var(--text-main)]/80" />;
              if (g.includes('commun') || g.includes('users')) return <Users2 size={18} className="text-[var(--text-main)]/80" />;
              return <Wallet size={18} className="text-[var(--text-main)]/80" />;
            })()}
          </div>
        </div>
        
        {/* 4. Solde et Tendance */}
        <div className="relative z-10 mt-auto">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black uppercase italic tracking-tighter ${isEstimated ? 'text-[var(--text-main)]/80' : 'text-[var(--text-main)]/60'}`}>
              {isEstimated ? 'Solde estimé' : 'Solde'}
            </span>
            <div className={`h-[1px] flex-1 ${isEstimated ? 'bg-white/40' : 'bg-white/20'}`} />
          </div>
          
          <div className="flex items-baseline justify-between mt-1">
            <h3 className="text-xl font-black text-[var(--text-main)] tracking-tighter">
              {montantFinal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
              <span className="text-[10px] ml-1 font-bold text-[var(--text-main)]/70">€</span>
            </h3>
            
            <div className={`
              flex items-center justify-center w-6 h-6 rounded-full backdrop-blur-md
              ${montantFinal >= 0 ? 'bg-emerald-400/20 text-emerald-300' : 'bg-rose-400/20 text-rose-300'}
              ${isEstimated ? 'ring-1 ring-white/20' : ''}
            `}>
               <TrendingUp size={12} className={montantFinal >= 0 ? '' : 'rotate-180'} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransactionCard = ({ t, color, bg }) => {
  let day = '??';
  let month = '??';

  if (t.date) {
    // 1. On tente de parser la date avec l'objet Date natif (le plus sûr)
    const dateObj = new Date(t.date);

    // Si la date est valide (n'est pas "Invalid Date")
    if (!isNaN(dateObj.getTime())) {
      day = dateObj.getDate().toString().padStart(2, '0');
      month = (dateObj.getMonth() + 1).toString().padStart(2, '0'); 
    } 
    // 2. Fallback manuel si l'objet Date échoue (format spécifique)
    else {
      const dateStr = t.date.toString();
      if (dateStr.includes('-')) {
        const parties = dateStr.split(' ')[0].split('-'); // Gère "YYYY-MM-DD HH:mm"
        // Si format YYYY-MM-DD
        if (parties[0].length === 4) {
          day = parties[2];
          month = parties[1];
        } else { // Si format DD-MM-YYYY
          day = parties[0];
          month = parties[1];
        }
      } else if (dateStr.includes('/')) {
        const parties = dateStr.split('/');
        day = parties[0];
        month = parties[1];
      }
    }
  }

  const moisNoms = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'AVR', 
    '05': 'MAI', '06': 'JUIN', '07': 'JUIL', '08': 'AOUT', 
    '09': 'SEPT', '10': 'OCT', '11': 'NOV', '12': 'DEC'
  };

  return (
    <div className={`px-3 py-1.5 rounded-xl ${bg} border border-white/5 group hover:bg-white/10 transition-all flex items-center gap-3`}>
      <div className="flex flex-col items-center justify-center min-w-[34px] h-9 bg-black/30 rounded-lg border border-white/5 shadow-inner">
         <span className={`text-[11px] font-black leading-none ${color}`}>
           {day}
         </span>
         <span className="text-[7px] font-bold text-[var(--text-main)]/40 uppercase tracking-tighter mt-0.5">
           {moisNoms[month] || month}
         </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <p className="text-[var(--text-main)]/90 font-bold text-[11px] truncate leading-tight">
            {t.nom || 'Sans libellé'}
          </p>
          <span className={`font-black text-[12px] whitespace-nowrap tracking-tighter ${color}`}>
            {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase tracking-widest truncate">
            {t.compte}
          </span>
          <span className="text-[8px] text-[var(--text-main)]/70 font-medium italic">
            {t.categorie}
          </span>
        </div>
      </div>
    </div>
  );
};




const ThemeCustomizer = ({ user, userTheme, setUserTheme }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeKey, setActiveKey] = useState(null); // Pour savoir quelle couleur on modifie

  const handleColorChange = async (key, hex) => {
    // 1. Mise à jour instantanée de l'UI
    setUserTheme(prev => ({ ...prev, [key]: hex }));

    // 2. Sauvegarde en BDD
    try {
      await api.post('/save-user-theme', {
        user: user,
        element: key,
        couleur: hex
      });
    } catch (err) {
      console.error("Erreur sauvegarde couleur", err);
    }
  };

  const labels = {
    color_revenus: "Revenus",
    color_depenses: "Dépenses",
    color_epargne: "Épargne",
    color_jauge: "Jauge Objectif",
    color_patrimoine: "Carte Solde"
  };

  return (
    <div className="fixed bottom-22 right-6 z-[1004] flex flex-col items-end">
      {/* Fenêtre de personnalisation */}
      {isOpen && (
        <div className="mb-4 w-72 bg-slate-900/95 backdrop-blur-2xl rounded-[var(--radius)] shadow-2xl border border-white/10 p-5 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-center mb-5">
            <h4 className="font-black text-[10px] uppercase tracking-[0.2em] text-[var(--text-main)]/40">Couleurs Graphiques</h4>
            <Palette size={14} className="text-[var(--text-main)]/20" />
          </div>

          <div className="space-y-3">
            {Object.keys(userTheme).filter(key => labels[key]).map((key) => (
              <div key={key} className="relative">
                <button
                  onClick={() => setActiveKey(activeKey === key ? null : key)}
                  className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 p-3 rounded-2xl border border-white/5 transition-all"
                >
                  <span className="text-xs font-bold text-[var(--text-main)]/70">{labels[key]}</span>
                  <div 
                    className="w-6 h-6 rounded-lg border border-white/20 shadow-lg" 
                    style={{ backgroundColor: userTheme[key] }} 
                  />
                </button>

                {activeKey === key && (
                  <div className="absolute right-full mr-4 bottom-0 z-[1001]">
                    <div className="fixed inset-0" onClick={() => setActiveKey(null)} />
                    <SketchPicker
                      color={userTheme[key]}
                      onChangeComplete={(color) => handleColorChange(key, color.hex)}
                      disableAlpha={true}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bouton Flottant (à gauche de la note) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
          isOpen ? 'bg-white text-slate-900 rotate-180' : 'bg-slate-800 text-[var(--text-main)] hover:scale-110 border border-white/10'
        }`}
      >
        {isOpen ? <X size={24} /> : <Settings2 size={24} />}
      </button>
    </div>
  );
};








const NotePad = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");

  // Charger la note au montage
  useEffect(() => {
    if (user) {
      api.get(`/note/${user}`).then(res => setNote(res.data.texte));
    }
  }, [user]);

  const handleSave = () => {
    api.post(`/note`, { utilisateur: user, texte: note });
  };

  return (
    <div className="fixed bottom-54 right-6 z-[1001] flex flex-col items-end">
      {/* Fenêtre de la note */}
      {isOpen && (
        <div className="mb-4 w-72 md:w-80 bg-white/90 backdrop-blur-xl rounded-[24px] shadow-2xl border border-white/20 p-4 animate-in slide-in-from-bottom-5 duration-300">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Bloc-notes</h4>
            <span className="text-[10px] text-emerald-500 font-bold">Auto-save activé</span>
          </div>
          <textarea
            className="w-full h-48 bg-transparent border-none focus:ring-0 text-slate-700 text-sm resize-none font-medium leading-relaxed"
            placeholder="Note tes trucs importants ici..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSave}
          />
        </div>
      )}

      {/* Bouton Flottant */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
          isOpen ? 'bg-slate-800 rotate-90' : 'bg-[var(--primary)] hover:scale-110'
        }`}
      >
        {isOpen ? <X className="text-[var(--text-main)]" /> : <StickyNote className="text-[var(--text-main)]" />}
      </button>
    </div>
  );
};

const ProrataCalc = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [salaires, setSalaires] = useState({ perso: 2000, partenaire: 2000 });
  const [depenses, setDepenses] = useState(1500);

  const totalSalaires = Number(salaires.perso) + Number(salaires.partenaire);
  const partPerso = totalSalaires > 0 ? (salaires.perso / totalSalaires) * 100 : 0;
  const aPayerPerso = (depenses * (partPerso / 100)).toFixed(2);
  const aPayerPartenaire = (depenses - aPayerPerso).toFixed(2);

  return (
    <div className="fixed bottom-38 right-6 z-[1003] flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 bg-slate-900 text-[var(--text-main)] rounded-[var(--radius)] shadow-2xl p-6 animate-in slide-in-from-bottom-5 duration-300">
          <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6">Simulateur Prorata</h4>
          
          <div className="space-y-4">
            {/* Inputs Salaires */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mon Salaire</label>
                <input type="number" value={salaires.perso} onChange={(e) => setSalaires({...salaires, perso: e.target.value})}
                  className="w-full bg-white/10 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Son Salaire</label>
                <input type="number" value={salaires.partenaire} onChange={(e) => setSalaires({...salaires, partenaire: e.target.value})}
                  className="w-full bg-white/10 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-[var(--primary)]" />
              </div>
            </div>

            {/* Input Dépenses Totale */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total Dépenses Communes</label>
              <input type="number" value={depenses} onChange={(e) => setDepenses(e.target.value)}
                className="w-full bg-[var(--primary)]/20 border-none rounded-xl text-sm font-black text-indigo-300 focus:ring-2 focus:ring-[var(--primary)]" />
            </div>

            <hr className="border-white/10 my-4" />

            {/* Résultats */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Ma part ({partPerso.toFixed(0)}%)</span>
                <span className="text-lg font-black text-[var(--text-main)]">{aPayerPerso} €</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-400">Sa part ({(100 - partPerso).toFixed(0)}%)</span>
                <span className="text-lg font-black text-[var(--text-main)]">{aPayerPartenaire} €</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300 ${
          isOpen ? 'bg-white text-slate-900 rotate-45' : 'bg-indigo-600 text-[var(--text-main)] hover:scale-110'
        }`}>
        <Calculator size={24} />
      </button>
    </div>
  );
};









function FinanceApp() {


  
// Liste des mois pour le select
const moisListe = [
  { v: "Janvier", l: "Janvier" }, 
  { v: "Février", l: "Février" },
  { v: "Mars", l: "Mars" },
  { v: "Avril", l: "Avril" },
  { v: "Mai", l: "Mai" },
  { v: "Juin", l: "Juin" },
  { v: "Juillet", l: "Juillet" },
  { v: "Aout", l: "Aout" },
  { v: "Septembre", l: "Septembre" },
  { v: "Octobre", l: "Octobre" },
  { v: "Novembre", l: "Novembre" },
  { v: "Décembre", l: "Décembre" }
];



  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeRightTab, setActiveRightTab] = useState('graphs'); // 'graphs' ou 'projects'
  const [itemToDelete, setItemToDelete] = useState(null); // Stocke le nom du projet à supprimer
  const [projets, setProjets] = useState([]);
  const [form2, setForm2] = useState({ nom: '', cout: '', capa: '', date: '2026-06-01' });
  const [user, setUser] = useState(localStorage.getItem('user'))
  const [loginName, setLoginName] = useState('')
  const [selectedCompte, setSelectedCompte] = useState('tous');
  const [form, setForm] = useState({ nom: '', montant: '', categorie: 'Alimentation' })
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activePicker, setActivePicker] = useState(null); // 'bg', 'primary', 'text' ou null
  const [showPicker, setShowPicker] = useState(null); // Pour savoir quel picker est ouvert
  const handleColorChange = (index, color) => {
  const newComptes = [...comptes]; newComptes[index].couleur = color.hex; setComptes(newComptes);};
  const [newCompteColor, setNewCompteColor] = useState("#6366f1"); // Couleur par défaut
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [tabActive, setTabActive] = useState('revenus');
  const [comptes, setComptes] = useState([]);
  const [filters, setFilters] = useState({
    profil: 'Tous',
    annee: new Date().getFullYear().toString(),
    // On met le nom du mois actuel en toute lettre pour matcher la base
    mois: moisListe[new Date().getMonth()].v 
  });
  const [deleteModal, setDeleteModal] = useState({ show: false, accountName: null });
  const [toutesLesTransactions, setToutesLesTransactions] = useState([]);
  const [editForm, setEditForm] = useState({});
  const [editingId, setEditingId] = useState(null); // Stocke le nom ou l'ID du projet en cours d'édition*
  const [availablePeriods, setAvailablePeriods] = useState([]);
  const [ordreComptes, setOrdreComptes] = useState(() => {
  const saved = localStorage.getItem('ordre_comptes_favoris');
  return saved ? JSON.parse(saved) : [];
});
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const toggleCategory = (name) => {
    setHiddenCategories(prev => 
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

const [editingIndex, setEditingIndex] = useState(null);
const loadProjets = async () => {
  try {
    // On utilise filters.profil pour être raccord avec le reste de ton app
    const res = await api.get(`/get-projets/${filters.profil}`);
    setProjets(res.data);
  } catch (err) {
    console.error("Erreur lors du chargement des projets:", err);
  }
};


const [toutesLesCategories, setToutesLesCategories] = useState([]);
const [categoriesPerso, setCategoriesPerso] = useState([]);
const [masquees, setMasquees] = useState([]); // <-- Nouvel état à ajouter

useEffect(() => {
  const chargerDonnees = async () => {
    try {
      // On lance les deux requêtes en parallèle
      const [resCats, resMasquees] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/categories/${user}`),
        fetch(`${import.meta.env.VITE_API_URL}/api/categories_masquees/${user}`)
      ]);

      const dataCats = await resCats.json();
      const dataMasquees = await resMasquees.json();

      // On dispatch tout d'un coup
      setToutesLesCategories(dataCats.all || []);
      setCategoriesPerso(dataCats.perso || []);
      setMasquees(dataMasquees || []); // On stocke les noms masqués
      
    } catch (err) {
      console.error("Erreur lors du chargement des catégories:", err);
    }
  };

  if (user) chargerDonnees();
}, [user]);


const categories_defaut = [
  "💰 Salaire", "🏥 Remboursements", "🤝 Virements Reçus", "👫 Compte Commun",
  "📱 Abonnements", "🛒 Alimentation", "🛍️ Shopping", "👕 Habillement", 
  "⚖️ Impôts", "🏦 Frais Bancaires", "🏠 Assurance Habitation", "🎮 Jeux vidéos",
  "🩺 Mutuelle", "💊 Pharmacie", "👨‍⚕️ Médecin/Santé", "🔑 Loyer", 
  "🔨 Bricolage", "🚌 Transports", "⛽ Carburant", "🚗 Auto", 
  "💸 Virements envoyé", "🏧 Retraits", "🌐 Web/Énergie", 
  "🔄 Virement : Livret A vers CCP", "🔄 Virement : CCP vers Livret A", "❓ Autre"
];


const handleAdd = async (e) => {
  if (e) e.preventDefault();
  
  // Vérification de sécurité
  if (!form2.nom || !form2.cout) {
    return alert("Le nom et le coût sont obligatoires !");
  }

  try {
    // On prépare l'objet exactement comme ton SQL l'attend
    const projetData = {
      nom: form2.nom,
      cout: parseFloat(form2.cout),
      capa: parseFloat(form2.capa || 0),
      date: form2.date,
      utilisateur: user, // On envoie directement 'user' qui contient le nom (ex: "Alex")
      profil: filters.profil
    };

    console.log("Envoi des données :", projetData); // Petit check dans la console F12

    const res = await api.post(`/save-projet`, projetData);

    if (res.status === 200 || res.status === 201) {
      // Reset du formulaire
      setForm2({ nom: '', cout: '', capa: '', date: '2026-06-01' });
      
      // On recharge la liste immédiatement
      loadProjets();
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout:", err);
    alert("Erreur lors de l'enregistrement du projet.");
  }
};



const handleDelete = async (nomProjet) => {
  // On retire le window.confirm d'ici car la confirmation 
  // est maintenant gérée par l'overlay visuel dans le composant
  try {
    await api.delete(`/delete-projet/${nomProjet}/${filters.profil}`);
    
    // On ferme l'overlay de confirmation
    setItemToDelete(null); 
    
    // On recharge la liste après suppression
    loadProjets();
  } catch (err) {
    console.error("Erreur lors de la suppression:", err);
    // Optionnel : on peut afficher une alerte ici si le serveur ne répond pas
    setItemToDelete(null);
  }
};

const [tempProjet, setTempProjet] = useState({});
const handleUpdate = async (p, oldName) => {
  try {
    await api.post(`/update-projet?old_name=${encodeURIComponent(oldName)}`, {
      nom: p.nom,
      cout: parseFloat(p.cout),
      capa: parseFloat(p.capa || 0),
      date: p.date,
      utilisateur: user,
      profil: filters.profil
    });
    
    setEditingIndex(null); // On ferme par l'index
    setEditingId(null);
    loadProjets();
  } catch (err) {
    console.error("Erreur:", err);
  }
};

useEffect(() => {
  // Charge les projets dès que l'utilisateur bascule sur l'onglet Projets
  // OU change de profil ( filters.profil )
  if (activeRightTab === 'projects') {
    loadProjets();
  }
}, [activeRightTab, filters.profil]);

const [userTheme, setUserTheme] = useState({
  color_revenus: "#10b981",
  color_depenses: "#f43f5e",
  color_epargne: "#ffffff",
  color_jauge: "#f1c40f",
  color_patrimoine: "#37b58f"
});


  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  const openDeleteModal = (name) => {
  setDeleteModal({ show: true, accountName: name });
  };

  const confirmDelete = async () => {
    if (!deleteModal.accountName) return;

    try {
      // ON AJOUTE L'UTILISATEUR À L'URL POUR CORRESPONDRE AU BACKEND
      // URL attendue : /config-comptes/{nom}/{utilisateur}
      const url = `/config-comptes/${encodeURIComponent(deleteModal.accountName)}/${encodeURIComponent(user)}`;
      
      await api.delete(url);
      
      // Rafraîchir la liste après suppression
      fetchComptes();
      
      // Fermer la modal
      setDeleteModal({ show: false, accountName: null });
      
    } catch (err) {
      console.error("Erreur détaillée:", err.response?.data);
      alert("Erreur lors de la suppression. Vérifie les logs console.");
    }
  };
  
  

  const updateThemeLive = (variable, value) => {
    document.documentElement.style.setProperty(variable, value);
    // Optionnel: on met aussi à jour le localStorage en bonus
    const currentTheme = JSON.parse(localStorage.getItem('mycash-theme')) || {};
    currentTheme[variable] = value;
    localStorage.setItem('mycash-theme', JSON.stringify(currentTheme));
  };

const fetchUserTheme = async (username) => {
  try {
    // 1. Charge le thème du site (Variables CSS)
    const resTheme = await api.get(`/get-theme/${username}`);
    if (resTheme.data) {

      
      document.documentElement.style.setProperty('--bg-site', resTheme.data.bg_site);
      document.documentElement.style.setProperty('--primary', resTheme.data.primary_color);
      document.documentElement.style.setProperty('--text-main', resTheme.data.text_main);
      document.documentElement.style.setProperty('--radius', resTheme.data.radius);
    }

    // 2. Charge les couleurs des graphiques (Table 'theme')
    const resColors = await api.get(`/get-user-theme/${username}`);
    
    if (resColors.data && Object.keys(resColors.data).length > 0) {
      // On met à jour l'état pour que userTheme.color_revenus etc. soient définis
      setUserTheme(prev => ({ ...prev, ...resColors.data }));
    }
  } catch (err) {
    console.error("Erreur chargement thème SQL", err);
  }
};

// ✅ Correct : On initialise avec l'objet attendu
const [notification2, setNotification2] = useState({ show: false, message: '', type: 'success' });

  const handleSaveThemeSQL = async () => {
  const styles = getComputedStyle(document.documentElement);
  const themeData = {
    utilisateur: user,
    bg_site: styles.getPropertyValue('--bg-site').trim() || '#f8fafc',
    primary_color: styles.getPropertyValue('--primary').trim() || '#4f46e5',
    text_main: styles.getPropertyValue('--text-main').trim() || '#0f172a',
    radius: styles.getPropertyValue('--radius').trim() || '1.5rem',
  };

  try {
    await api.post(`/save-theme`, themeData);
    showNotify("Configuration propagée avec succès ! 🚀", 'success');
  } catch (err) {
    console.error(err);
    showNotify("Échec de la synchronisation cloud.", 'error');
  }
};

// Fonction utilitaire pour auto-fermer la notification
const showNotify = (msg, type) => {
  setNotification2({ show: true, message: msg, type });
  setTimeout(() => setNotification2({ ...notification, show: false }), 4000);
};


  // Ajoute la fonction pour récupérer les données de la table configuration
  const fetchComptes = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/config-comptes/${user}`);
      setComptes(res.data);
    } catch (err) {
      console.error("Erreur chargement comptes", err);
    }
  };



  const handleAddCompte = async (e) => {
    e.preventDefault();
    
    const nouveauCompte = {
      compte: e.target[0].value,
      groupe: e.target[1].value,
      solde: parseFloat(e.target[2].value) || 0,
      objectif: parseFloat(e.target[3].value) || 0,
      couleur: newCompteColor, // <-- On utilise le state ici
      utilisateur: user
    };

    try {
      await api.post(`/config-comptes`, nouveauCompte);
      e.target.reset(); 
      setNewCompteColor("#6366f1"); // On remet la couleur par défaut après l'ajout
      setShowAddPicker(false);
      fetchComptes();   
    } catch (err) {
      alert("Erreur lors de l'ajout");
    }
  };




  // Fonction pour mettre à jour un compte au moment où on finit de taper
  const handleBlurUpdate = async (compteModifie) => {
    try {
      // On nettoie le nom pour l'URL au cas où
      const compteName = compteModifie.compte.trim(); 
      await api.put(`/config-comptes/${compteName}`, compteModifie);
      fetchComptes(); // Optionnel : rafraîchir pour être sûr d'avoir les données du serveur
    } catch (err) {
      console.error("Erreur de sauvegarde automatique", err);
    }
  };



const fetchTransactions = async () => {
  try {
    const res = await api.get(`/transactions/${user}`);
    // Plus besoin de map complexe, on prend directement les données
    setToutesLesTransactions(res.data);
  } catch (err) {
    console.error("Erreur fetch:", err);
  }
};



const [isRegistering, setIsRegistering] = useState(false);
const [showPassword, setShowPassword] = useState(false);
const [loginPassword, setLoginPassword] = useState(''); // Ajoute cette ligne
const [loginEmail, setLoginEmail] = useState('');
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [isForgotPassword, setIsForgotPassword] = useState(false);
const [resetEmail, setResetEmail] = useState('');

const [toast, setToast] = useState({ show: false, message: '', type: '' });

// Fonction utilitaire pour afficher l'alerte
const showAlert = (message, type = 'error') => {
  setToast({ show: true, message, type });
  // Disparition automatique après 4 secondes
  setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
};




const handleLogin = async (e) => {
    e.preventDefault()
    try {
      // On envoie maintenant le nom ET le mot de passe au serveur
      const res = await api.post(`/login`, { 
        nom: loginName,
        password: loginPassword // Assure-toi que l'état loginPassword est bien lié à l'input
      })
      
      // On récupère le nom depuis la réponse du serveur
      const usernameClean = res.data.user.toLowerCase() 
      
      // Stockage propre
      localStorage.setItem('user', usernameClean)
      setUser(usernameClean)
    } catch (err) {
      // Gestion d'erreur plus précise
      if (err.response && err.response.status === 401) {
        showAlert("Mot de passe incorrect.")
      } else if (err.response && err.response.status === 404) {
        showAlert("Utilisateur inconnu.")
      } else {
        showAlert("Erreur de connexion au serveur.")
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    // Optionnel : réinitialiser les champs pour la prochaine connexion
    setLoginName('')
    setLoginPassword('')
  }



const handleRegister = async (e) => {
  e.preventDefault();
  try {
    const res = await api.post(`/register`, { 
      nom: loginName, 
      email: loginEmail, // Ajout de l'email ici
      password: loginPassword,
      first_name: firstName, 
      last_name: lastName
    });

    showAlert("Compte créé ! Bienvenue chez Kleea.");
    const usernameClean = loginName.toLowerCase();
    localStorage.setItem('user', usernameClean);
    setUser(usernameClean);
  } catch (err) {
    showAlert(err.response?.data?.detail || "Erreur lors de l'inscription.");
  }
};

const handleResetRequest = async (e) => {
  e.preventDefault();
  try {
    await api.post(`forgot-password`, { email: resetEmail });
    showAlert("Si cet email existe, un lien a été envoyé.", "success");
    setIsForgotPassword(false);
  } catch (err) {
    showAlert("Erreur lors de la demande.");
  }
};


const deleteTransaction = async (id) => {
  if (window.confirm("Supprimer cette transaction ?")) {
    try {
      await api.delete(`/transactions/${id}`);
      // Mise à jour locale immédiate sans refetch
      setToutesLesTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert("Erreur de suppression");
      fetchTransactions(); // En cas d'erreur, on resynchronise
    }
  }
};


useEffect(() => {
  const fetchPeriods = async () => {
    try {
      const res = await api.get(`/dashboard/periodes/${user}`);
      setAvailablePeriods(res.data);
      // Suppression du setFilters d'ici pour éviter les doublons de logique
    } catch (err) {
      console.error("Erreur périodes:", err);
    }
  };

  if (user) {
    fetchPeriods();
  }
}, [user, toutesLesTransactions]);

const initialSelectionDone = useRef(false);

// 1. Reset du verrou au changement d'utilisateur
useEffect(() => {
  // 1. On autorise à nouveau la sélection automatique
  initialSelectionDone.current = false;

  // 2. IMPORTANT : On vide les données de l'ancien utilisateur 
  // pour éviter que le useEffect d'initialisation ne tourne avec les mauvaises infos
  setAvailablePeriods([]);
  setComptes([]);

  // 3. On remet les filtres à un état neutre
  setFilters({
    profil: '',
    annee: new Date().getFullYear().toString(),
    mois: moisListe[new Date().getMonth()].v 
  });
  
  console.log("Cleaning data for new user...");
}, [user]);


// 2. Initialisation intelligente
useEffect(() => {
  // On attend d'avoir les périodes ET les comptes
  if (availablePeriods.length > 0 && comptes.length > 0 && !initialSelectionDone.current) {
    
    // --- TRI CHRONOLOGIQUE DES PÉRIODES ---
    const periodesTriees = [...availablePeriods].sort((a, b) => {
      // Conversion forcée en nombre pour la comparaison
      const yearA = parseInt(a.annee);
      const yearB = parseInt(b.annee);
      
      if (yearB !== yearA) {
        return yearB - yearA; // Tri décroissant (2024 avant 2023)
      }
      
      // Si même année, on compare l'index des mois
      const indexA = moisListe.findIndex(m => m.v === a.mois);
      const indexB = moisListe.findIndex(m => m.v === b.mois);
      return indexB - indexA;
    });

    const dernierePeriode = periodesTriees[0];

    // --- EXTRACTION DU PROFIL ---
    const groupesUniques = [...new Set(comptes.map(c => c.groupe).filter(Boolean))].sort();
    
    if (groupesUniques.length > 0) {
      const premierProfil = groupesUniques[0];

      console.log("🎯 Initialisation auto :", {
        profil: premierProfil,
        mois: dernierePeriode.mois,
        annee: dernierePeriode.annee
      });

      setFilters({
        profil: premierProfil,
        annee: dernierePeriode.annee.toString(),
        mois: dernierePeriode.mois
      });

      initialSelectionDone.current = true;
    }
  }
}, [availablePeriods, comptes, user]); // user ajouté en dépendance pour plus de sécurité


useEffect(() => {
  // Si on n'a pas encore de données ou d'année sélectionnée, on ne fait rien
  if (availablePeriods.length === 0 || !filters.annee) return;

  // 1. On regarde quels mois sont dispos pour l'année choisie
  const moisDisposPourAnnee = availablePeriods.filter(
    p => p.annee.toString() === filters.annee.toString()
  );

  // 2. On vérifie si le mois actuellement sélectionné existe dans cette année
  const moisToujoursValide = moisDisposPourAnnee.some(p => p.mois === filters.mois);

  // 3. Si le mois n'est plus valide, on force le mois le plus récent de cette année
  if (!moisToujoursValide && moisDisposPourAnnee.length > 0) {
    const moisTries = [...moisDisposPourAnnee].sort((a, b) => {
      const indexA = moisListe.findIndex(m => m.v === a.mois);
      const indexB = moisListe.findIndex(m => m.v === b.mois);
      return indexB - indexA; // Décroissant pour avoir le plus récent en [0]
    });

    setFilters(prev => ({
      ...prev,
      mois: moisTries[0].mois
    }));
  }
}, [filters.annee, availablePeriods]); // Se déclenche quand l'année change

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'previsionnel', label: 'Prévisionnel', icon: ChartCandlestick },
    { id: 'gerer', label: 'Gérer', icon: Settings2 },
    { id: 'importer', label: 'Importer', icon: FileUp },
    { id: 'comptes', label: 'Comptes', icon: Wallet },
    { id: 'tricount', label: 'Tricount', icon: Users2 },
    { id: 'theme', label: 'Thème', icon: Palette },
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (item.id === 'theme') {
      return user?.toLowerCase() === 'theo';
    }
    return true;
  });






const comptesDuProfil = useMemo(() => {
  if (!comptes) return [];
  
  return comptes.filter(c => {
    // Si "Tous", on garde tout
    if (filters.profil === 'Tous') return true;
    
    // Sinon on compare le groupe (sécurisé)
    const groupeCompte = c.groupe?.toLowerCase().trim() || "";
    const groupeFiltre = filters.profil?.toLowerCase().trim() || "";
    return groupeCompte === groupeFiltre;
  });
}, [comptes, filters.profil]);






const financeData = useMemo(() => {
  // On crée une liste des noms de comptes en MAJUSCULES pour la comparaison
  const nomsComptesProfilMaj = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  const transactionsSecurisees = (toutesLesTransactions || []).map((t, index) => ({
    ...t,
    // Si t.id n'existe pas, on en crée un basé sur l'index (stable pour ce rendu)
    id: t.id || `tr-${index}` 
  }));

  // On utilise maintenant 'transactionsSecurisees' au lieu de 'toutesLesTransactions'
  const base = transactionsSecurisees.filter(t => {
    const nomCompteTransac = (t.compte || "").trim().toUpperCase();
    const categorie = (t.categorie || "").toLowerCase();
    
    const matchSource = filters.profil === 'Tous' || nomsComptesProfilMaj.includes(nomCompteTransac);
    
    const matchCible = filters.profil !== 'Tous' && 
                        categorie.includes("vers") && 
                        nomsComptesProfilMaj.some(nomC => categorie.toUpperCase().includes(nomC));

    const matchMois = t.mois?.toString().toLowerCase().trim() === filters.mois.toLowerCase().trim();
    const matchAnnee = t.année?.toString().trim() === filters.annee.toString().trim();

    return (matchSource || matchCible) && matchMois && matchAnnee;
  });

  // ... (reste de la fonction estUnTransfert, revenusList, depensesList inchangé)
  
  const estUnTransfert = (t) => {
    const cat = (t.categorie || "").toLowerCase();
    const lib = (t.nom || "").toLowerCase();
    return cat.includes('vers') || cat.includes('transfert') || lib.includes('🔄');
  };

  const revenusList = base.filter(t => parseFloat(t.montant) > 0 && !estUnTransfert(t));
  const depensesList = base.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t));
  const transfertsList = base.filter(t => estUnTransfert(t));

  return {
    journal: { revenus: revenusList, depenses: depensesList, transferts: transfertsList },
    stats: { 
      totalRev: revenusList.reduce((acc, t) => acc + parseFloat(t.montant), 0),
      totalDep: depensesList.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0),
      solde: revenusList.reduce((acc, t) => acc + parseFloat(t.montant), 0) - 
             depensesList.reduce((acc, t) => acc + Math.abs(parseFloat(t.montant)), 0),
      nb: base.length 
    }
  };
}, [toutesLesTransactions, comptesDuProfil, filters.mois, filters.annee, filters.profil]); 
// Note : j'ai ajouté comptesDuProfil en dépendance, c'est plus propre




const soldesParCompte = useMemo(() => {
  // 1. On prépare la config des comptes pour un accès rapide (comme ton config_comptes)
  const configMap = {};
  comptes.forEach(c => {
    configMap[c.compte.trim().toUpperCase()] = {
      soldeInitial: parseFloat(c.solde) || 0,
      groupe: c.groupe?.trim().toUpperCase(),
      original: c
    };
  });

  // 2. Initialisation des soldes courants (Point Zéro)
  let soldesCourants = {};
  Object.keys(configMap).forEach(nom => {
    soldesCourants[nom] = configMap[nom].soldeInitial;
  });

  // 3. On définit l'ordre chronologique pour le calcul
  const indexMoisSelectionne = moisListe.findIndex(m => m.v.toLowerCase() === filters.mois.toLowerCase());
  const anneeFiltre = parseInt(filters.annee);

  // 4. On parcourt TOUTES les transactions (Historique complet)
  // Note : Il est important que toutesLesTransactions soit trié par date si possible
  (toutesLesTransactions || []).forEach(t => {
    const anneeT = parseInt(t.année);
    const indexMoisT = moisListe.findIndex(m => m.v.toLowerCase() === String(t.mois).toLowerCase().trim());
    
    // On ne traite que ce qui est avant ou égal à la date sélectionnée
    if (anneeT > anneeFiltre || (anneeT === anneeFiltre && indexMoisT > indexMoisSelectionne)) return;

    const montant = parseFloat(t.montant) || 0;
    const compteSrc = (t.compte || "").trim().toUpperCase();
    const cat = (t.categorie || "").toUpperCase();
    const nomTrans = (t.nom || "").toUpperCase();
    const texteIntegral = `${nomTrans} ${cat}`;

    // A. Impact sur le compte émetteur (Réel)
    if (soldesCourants.hasOwnProperty(compteSrc)) {
      soldesCourants[compteSrc] += montant;
    }

    // B. Simulation de la contrepartie (Virements Internes)
    if (cat.includes("🔄") || cat.includes("VERS") || nomTrans.includes("VERS")) {
      const groupeSource = configMap[compteSrc]?.groupe;
      if (!groupeSource) return;

      let meilleurMatch = null;

      // C. Recherche de la destination dans le même groupe
      for (const [nomDest, cfgDest] of Object.entries(configMap)) {
        if (nomDest === compteSrc) continue; // Pas vers soi-même
        if (cfgDest.groupe !== groupeSource) continue; // Même profil uniquement

        const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE"];
        const motsCompte = nomDest.split(" ").filter(m => m.length >= 3 && !motsAIgnorer.includes(m));

        // D. Stratégie de match (Nom complet ou mots clés)
        const matchNomComplet = texteIntegral.includes(nomDest);
        const matchMotsCles = motsCompte.length > 0 && motsCompte.some(m => texteIntegral.includes(m));

        if (matchNomComplet || matchMotsCles) {
          meilleurMatch = nomDest;
          break;
        }
      }

      // E. Application du mouvement virtuel
      if (meilleurMatch) {
        // Anti-doublon : on vérifie si une transaction inverse existe déjà dans la base
        const dejaPresent = toutesLesTransactions.some(t2 => 
          t2.année === t.année && 
          t2.mois === t.mois && 
          t2.compte?.trim().toUpperCase() === meilleurMatch && 
          Math.abs(parseFloat(t2.montant) - (-montant)) < 0.1
        );

        if (!dejaPresent) {
          soldesCourants[meilleurMatch] -= montant; // On soustrait un montant négatif = addition
        }
      }
    }
  });

  // 5. On retourne les comptes filtrés pour l'affichage des cartes
  return comptes
    .filter(c => filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim())
    .map(c => ({
      ...c,
      soldePeriode: soldesCourants[c.compte.trim().toUpperCase()] || 0
    }));
}, [comptes, toutesLesTransactions, filters]);

const soldeGlobal = useMemo(() => 
  soldesParCompte.reduce((acc, c) => acc + c.soldePeriode, 0)
, [soldesParCompte]);




// --- 1. Ajouter cet effet pour charger l'ordre au démarrage ---

// --- 2. Trier soldesParCompte selon cet ordre ---
const soldesTries = useMemo(() => {
  if (!ordreComptes || ordreComptes.length === 0) return soldesParCompte;

  // On trie : les comptes présents dans l'ordre sauvegardé arrivent en premier
  return [...soldesParCompte].sort((a, b) => {
    const indexA = ordreComptes.indexOf(a.compte);
    const indexB = ordreComptes.indexOf(b.compte);
    
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
}, [soldesParCompte, ordreComptes]);


const statsCategories = useMemo(() => {
  const depenses = financeData.journal.depenses || [];
  const recap = {};

  depenses.forEach(t => {
    const cat = t.categorie || "Autre";
    const montant = Math.abs(parseFloat(t.montant) || 0);
    recap[cat] = (recap[cat] || 0) + montant;
  });

  // Transformer en tableau et trier par montant décroissant
  return Object.entries(recap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}, [financeData.journal.depenses]);


  const chartData = statsCategories.filter(item => !hiddenCategories.includes(item.name));



const [showAddProject, setShowAddProject] = useState(false);
// --- 3. La fonction handleDragEnd mise à jour ---
const handleDragEnd = (event) => {
  const { active, over } = event;
  
  if (active.id !== over.id) {
    const oldIndex = soldesTries.findIndex(c => c.compte === active.id);
    const newIndex = soldesTries.findIndex(c => c.compte === over.id);
    
    const nouvelOrdre = arrayMove(soldesTries, oldIndex, newIndex).map(c => c.compte);
    
    // Sauvegarde locale
    setOrdreComptes(nouvelOrdre);
    localStorage.setItem('ordre_comptes_favoris', JSON.stringify(nouvelOrdre));
  }
};


const handleDragEnd2 = (event) => {
  const { active, over } = event;
  if (active.id !== over.id) {
    const oldIndex = projets.findIndex((i) => i.nom === active.id);
    const newIndex = projets.findIndex((i) => i.nom === over.id);
    
    // On met à jour l'état local
    const newOrder = arrayMove(projets, oldIndex, newIndex);
    setProjets(newOrder);
    
    // OPTIONNEL : Sauvegarder l'ordre en BDD si tu as une colonne "position"
    // saveNewOrder(newOrder); 
  }
};

const recapAnnuelStats = useMemo(() => {
  const anneeFiltre = parseInt(filters.annee);
  
  // 1. DÉTERMINER LE DERNIER MOIS RÉELLEMENT CONTENU DANS LES DONNÉES
  // Cela remplace la détection basée sur la date système qui créait les chutes à zéro.
  const dernierMoisDonneesIdx = (() => {
    const transactionsAnnee = (toutesLesTransactions || []).filter(
      t => t.année?.toString().trim() === filters.annee.toString().trim()
    );
    if (transactionsAnnee.length === 0) return -1;

    const indices = transactionsAnnee.map(t => 
      moisListe.findIndex(m => m.v.toLowerCase() === String(t.mois).toLowerCase().trim())
    );
    return Math.max(...indices);
  })();

  // 2. PRÉPARATION DE LA CONFIGURATION DES COMPTES
  const configMap = {};
  comptes.forEach(c => {
    configMap[c.compte.trim().toUpperCase()] = {
      soldeInitial: parseFloat(c.solde) || 0,
      groupe: c.groupe?.trim().toUpperCase()
    };
  });

  const comptesDuProfil = comptes.filter(c => 
    filters.profil === 'Tous' || c.groupe?.toLowerCase().trim() === filters.profil.toLowerCase().trim()
  );
  const nomsComptesProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());

  // 3. CALCUL MOIS PAR MOIS
  return moisListe.map((moisObj, indexMoisCible) => {
    const nomMoisCible = moisObj.v.toLowerCase().trim();
    
    // Initialisation des soldes avec les valeurs de base
    let soldesCourantsMois = {};
    Object.keys(configMap).forEach(nom => {
      soldesCourantsMois[nom] = configMap[nom].soldeInitial;
    });

    // Parcours de toutes les transactions pour calculer le solde progressif
    (toutesLesTransactions || []).forEach(t => {
      const anneeT = parseInt(t.année);
      const indexMoisT = moisListe.findIndex(m => m.v.toLowerCase() === String(t.mois).toLowerCase().trim());
      
      // On ne prend que ce qui est antérieur ou égal au mois cible
      if (anneeT > anneeFiltre || (anneeT === anneeFiltre && indexMoisT > indexMoisCible)) return;

      const montant = parseFloat(t.montant) || 0;
      const compteSrc = (t.compte || "").trim().toUpperCase();
      const cat = (t.categorie || "").toUpperCase();
      const nomTrans = (t.nom || "").toUpperCase();
      const texteIntegral = `${nomTrans} ${cat}`;

      if (soldesCourantsMois.hasOwnProperty(compteSrc)) {
        soldesCourantsMois[compteSrc] += montant;
      }

      // GESTION DES TRANSFERTS INTERNES (Logique miroir)
      if (cat.includes("🔄") || cat.includes("VERS") || nomTrans.includes("VERS")) {
        const groupeSource = configMap[compteSrc]?.groupe;
        if (!groupeSource) return;

        let meilleurMatch = null;
        const nomsCandidats = Object.keys(configMap)
          .filter(nom => nom !== compteSrc && configMap[nom].groupe === groupeSource)
          .sort((a, b) => b.length - a.length);

        for (const nomDest of nomsCandidats) {
          const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE"];
          const motsCompte = nomDest.split(" ").filter(m => m.length >= 3 && !motsAIgnorer.includes(m));

          const matchNomExact = texteIntegral.includes(nomDest);
          const matchMotCle = motsCompte.length > 0 && motsCompte.every(m => texteIntegral.includes(m));

          if (matchNomExact || matchMotCle) {
            meilleurMatch = nomDest;
            break;
          }
        }

        if (meilleurMatch) {
          const dejaPresent = toutesLesTransactions.some(t2 => 
            t2.année === t.année && t2.mois === t.mois && 
            t2.compte?.trim().toUpperCase() === meilleurMatch && 
            Math.abs(parseFloat(t2.montant) - (-montant)) < 0.1
          );

          if (!dejaPresent) {
            soldesCourantsMois[meilleurMatch] -= montant; 
          }
        }
      }
    });

    // 4. CALCUL DES TOTAUX DU MOIS CIBLE
    const soldeTotalFinMois = nomsComptesProfil.reduce((acc, nom) => acc + (soldesCourantsMois[nom] || 0), 0);

    const transactionsDuMois = (toutesLesTransactions || []).filter(t => 
      t.année?.toString().trim() === filters.annee.toString().trim() && 
      t.mois?.toString().toLowerCase().trim() === nomMoisCible &&
      nomsComptesProfil.includes(t.compte?.trim().toUpperCase())
    );

    const estUnTransfert = (t) => {
      const c = (t.categorie || "").toLowerCase();
      const l = (t.nom || "").toLowerCase();
      return c.includes('vers') || c.includes('transfert') || l.includes('🔄');
    };

    const rev = transactionsDuMois.filter(t => parseFloat(t.montant) > 0 && !estUnTransfert(t))
      .reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0);
    const dep = transactionsDuMois.filter(t => parseFloat(t.montant) < 0 && !estUnTransfert(t))
      .reduce((acc, t) => acc + Math.abs(parseFloat(t.montant) || 0), 0);

    const epargneCalculée = rev - dep;

    // 5. VALIDATION SI LE MOIS DOIT ÊTRE AFFICHÉ
    // Si l'index du mois est supérieur au dernier mois où on a trouvé des data, on renvoie null
    const estSansDonnees = indexMoisCible > dernierMoisDonneesIdx;

    const detailComptes = {};
    nomsComptesProfil.forEach(nom => {
      detailComptes[nom] = estSansDonnees ? null : soldesCourantsMois[nom];
    });

    return {
      nom: moisObj.l,
      revenus: estSansDonnees ? null : rev,
      depenses: estSansDonnees ? null : dep,
      epargne: estSansDonnees ? null : epargneCalculée,
      soldeTotal: estSansDonnees ? null : soldeTotalFinMois,
      ...detailComptes 
    };
  });
}, [toutesLesTransactions, comptes, filters.annee, filters.profil, moisListe]);


const totauxAnnuels = recapAnnuelStats.reduce((acc, m) => ({
  revenus: acc.revenus + (Number(m.revenus) || 0),
  depenses: acc.depenses + (Number(m.depenses) || 0),
  epargne: acc.epargne + (Number(m.epargne) || 0)
}), { revenus: 0, depenses: 0, epargne: 0 });

const tauxEpargneMoyen = totauxAnnuels.revenus > 0 
  ? Math.round((totauxAnnuels.epargne / totauxAnnuels.revenus) * 100) 
  : 0;

const epargneCumuleeAnnuelle = useMemo(() => {
  return recapAnnuelStats
    ?.filter(m => m.epargne !== null) // On ne prend que les mois passés ou en cours
    .reduce((acc, m) => acc + (m.epargne || 0), 0) || 0;
}, [recapAnnuelStats]);

// L'objectif global (somme des objectifs de tes comptes)
// Note : Si ton objectif dans "Comptes" est mensuel, multiplie le par 12 ici
// pour comparer l'épargne annuelle à un objectif annuel.
const objectifAnnuelGlobal = comptesDuProfil?.reduce((acc, c) => acc + (parseFloat(c.objectif) || 0), 0) || 0;

const pourcentageAnnuel = objectifAnnuelGlobal > 0 
  ? Math.min(Math.round((epargneCumuleeAnnuelle / objectifAnnuelGlobal) * 100), 100) 
  : 0;


// 1. On crée l'espace de stockage local
const [budgets, setBudgets] = useState([]);
const [formBudget, setFormBudget] = useState({ nom: '', somme: '' });
const [showBudgetDetails, setShowBudgetDetails] = useState(false);
// 2. On crée la fonction qui va chercher les données chez Python
// 2. Fonction modifiée pour accepter un mode "tout"
const loadBudgets = async (fetchAll = false) => {
  try {
    const url = fetchAll 
      ? `/get-budgets/${user}` 
      : `/get-budgets/${user}/${filters.mois}`;
      
    const res = await api.get(url);
    
    // On ne met à jour que si on a reçu des données valides
    if (Array.isArray(res.data)) {
        setBudgets(res.data);
    }
  } catch (err) {
    console.error("Erreur chargement :", err);
  }
};



const handleAddBudget = async (e) => {
  if (e) e.preventDefault();
  
  const budgetData = {
    utilisateur: String(user || "theo"), 
    mois: String(formBudget.mois || filters.mois), 
    compte: String(formBudget.compte || "tous"),
    type: "Categorie",
    nom: String(formBudget.nom),
    somme: parseFloat(formBudget.somme) || 0
  };

  try {
    const res = await api.post(`/save-budget`, budgetData);
    if (res.status === 200) {
      setFormBudget({ ...formBudget, nom: '', somme: '' });
      
      // ✅ LA CORRECTION ICI : 
      // On recharge selon l'onglet actif pour garder la cohérence
      const fetchAll = activeTab === 'gerer';
      await loadBudgets(fetchAll); 
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout :", err.response?.data);
  }
};

const [budgetToDelete, setBudgetToDelete] = useState(null);
const confirmDelete2 = (budgetObj) => {
  setBudgetToDelete(budgetObj); // On stocke l'objet {nom, mois, compte...}
};

const executeDeleteBudget = async () => {
  if (!budgetToDelete) return;
  
  try {
    // On utilise les données précises de l'objet à supprimer
    const { nom, mois } = budgetToDelete; 
    await api.delete(`/delete-budget/${encodeURIComponent(nom)}/${user}/${mois}`);
    
    loadBudgets(activeTab === 'gerer'); // Recharge avec le bon mode
    setBudgetToDelete(null); 
  } catch (err) {
    console.error("Erreur suppression budget:", err);
  }
};


const [editingBudget, setEditingBudget] = useState(null); // Stockera l'objet budget complet
const handleUpdateBudget = async (updatedBudget, oldName) => {
  try {
    // 1. Mise à jour optimiste ultra-précise
    const updatedLocalBudgets = budgets.map(b => {
      // On vérifie TOUS les critères pour éviter de toucher au budget du voisin (autre compte)
      const isTarget = 
        b.nom === oldName && 
        b.compte === updatedBudget.compte && 
        b.mois === updatedBudget.mois;
      
      if (isTarget) {
        return { ...b, nom: updatedBudget.nom, somme: parseFloat(updatedBudget.somme) };
      }
      return b;
    });

    setBudgets(updatedLocalBudgets);
    setEditingBudget(null);

    // 2. Envoi au serveur
    const payload = {
      utilisateur: user,
      mois: updatedBudget.mois,
      compte: updatedBudget.compte,
      type: "Categorie",
      nom: updatedBudget.nom,
      somme: parseFloat(updatedBudget.somme)
    };

    const url = `/update-budget?old_name=${encodeURIComponent(oldName)}`;
    await api.post(url, payload);

    // 3. Rechargement propre depuis le serveur (le Python filtrera correctement maintenant)
    await loadBudgets(true); 

  } catch (err) {
    console.error("Erreur:", err);
    loadBudgets(true); // Annule l'optimisme en cas d'erreur
  }
};


const budgetGauges = useMemo(() => {
  // 1. On décide quelle source de données utiliser
  // Si on est sur 'gerer', on prend tout (data), sinon on prend le filtré (statsCategories)
  const isGererPage = activeTab === 'gerer';

  // 2. On regroupe les budgets (on ne filtre par profil que si on n'est pas sur 'gerer')
  const budgetsAAfficher = budgets.filter(b => {
    if (isGererPage || filters.profil === 'Tous') return true;
    const nomsComptesDuProfil = comptesDuProfil.map(c => c.compte.trim().toUpperCase());
    return nomsComptesDuProfil.includes(b.compte?.trim().toUpperCase());
  });

  const categoriesRegroupees = budgetsAAfficher.reduce((acc, b) => {
    const nomCat = b.nom;
    if (!acc[nomCat]) acc[nomCat] = { nom: nomCat, limite: 0, comptes: [] };
    acc[nomCat].limite += b.somme;
    if (!acc[nomCat].comptes.includes(b.compte)) acc[nomCat].comptes.push(b.compte);
    return acc;
  }, {});

  // 3. Calcul du réel adapté au contexte
  return Object.values(categoriesRegroupees).map(bg => {
    let reel = 0;

    if (isGererPage) {
      // MODE GÉRER : On recalcule à la main sur la source brute pour ignorer les filtres UI
      reel = toutesLesTransactions.filter(t => 
        t.categorie === bg.nom && 
        bg.comptes.includes(t.compte) &&
        t.mois === filters.mois
      ).reduce((acc, t) => acc + Math.abs(t.montant), 0);
    } else {
      // MODE DASHBOARD : On utilise les stats déjà filtrées par l'interface
      reel = statsCategories.find(s => s.name === bg.nom)?.value || 0;
    }

    const pourcentage = bg.limite > 0 ? (reel / bg.limite) * 100 : 0;

    return {
      nom: bg.nom,
      limite: bg.limite,
      reel: reel,
      pourcentage: Math.round(pourcentage),
      rotation: Math.min(pourcentage * 180 / 100, 180),
      depasse: reel > bg.limite
    };
  });
  // On ajoute data et activeTab dans les dépendances
}, [budgets, toutesLesTransactions, statsCategories, filters.mois, filters.profil, activeTab, comptesDuProfil]);

useEffect(() => {
  if (user) {
    if (activeTab === 'gerer') {
      loadBudgets(true); // Charge tous les mois pour la page gérer
    } else if (filters.mois) {
      loadBudgets(false); // Charge seulement le mois du dashboard
    }
  }
}, [user, filters.mois, activeTab]); // On ajoute activeTab ici



const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

const handleSort = (key) => {
  setSortConfig(prev => ({
    key,
    direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
  }));
};

// On récupère toutes les transactions filtrées par ton useMemo financeData
// On fusionne revenus, dépenses et transferts pour le tableau de gestion

const dateInputRef = useRef(null);
const transactionsAAfficher = useMemo(() => {
  let data = [
    ...(financeData.journal.revenus || []),
    ...(financeData.journal.depenses || []),
    ...(financeData.journal.transferts || [])
  ];

  

  // Filtre compte (inchangé)
  if (selectedCompte !== 'tous') {
    data = data.filter(t => t.compte?.trim().toUpperCase() === selectedCompte.trim().toUpperCase());
  }

  // TRI CORRIGÉ
  return [...data].sort((a, b) => {
    let aVal, bVal;

    if (sortConfig.key === 'jour') {
      // Si on demande de trier par "jour", on trie en fait par la "date" complète
      // Le format ISO YYYY-MM-DD permet un tri alphabétique parfait
      aVal = a.date || "";
      bVal = b.date || "";
    } else if (sortConfig.key === 'montant') {
      aVal = parseFloat(a.montant) || 0;
      bVal = parseFloat(b.montant) || 0;
    } else {
      aVal = (a[sortConfig.key] || "").toString().toLowerCase();
      bVal = (b[sortConfig.key] || "").toString().toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });
}, [financeData, sortConfig, selectedCompte]);

// 1. Filtrage des données
const filteredData = projets.filter(item => {
  const matchProfil = filters.profil === 'Tous' || item.profil === filters.profil;
  const matchMois = item.mois === filters.mois;
  const matchAnnee = item.annee === filters.annee;
  // Ajoute ici le filtre par compte si tu as ajouté cette colonne
  return matchProfil && matchMois && matchAnnee;
});

// 2. Tri des données filtrées
const sortedData = [...filteredData].sort((a, b) => {
  if (a[sortConfig.key] < b[sortConfig.key]) {
    return sortConfig.direction === 'asc' ? -1 : 1;
  }
  if (a[sortConfig.key] > b[sortConfig.key]) {
    return sortConfig.direction === 'asc' ? 1 : -1;
  }
  return 0;
});




const [lastLearned, setLastLearned] = useState(null);

// Fonction pour afficher la notif et la faire disparaître après 4s
const showLearningNotif = (transaction, categorie) => {
  setLastLearned({ transaction, categorie });
  setTimeout(() => setLastLearned(null), 4000);
};

const updateCell = async (id, field, value) => {
  const transactionActive = toutesLesTransactions.find(t => t.id == id);

  if (!transactionActive) {
    console.error("Transaction non trouvée pour l'ID:", id);
    return;
  }

 // On reconstruit l'objet en utilisant 'transactionActive'
  const updatedData = {
    nom: transactionActive.nom,
    montant: transactionActive.montant,
    categorie: transactionActive.categorie,
    utilisateur: user,
    mois: transactionActive.mois,
    compte: transactionActive.compte,
    // Attention ici : utilise le nom exact de ta colonne SQL (probablement 'année')
    annee: parseInt(transactionActive.annee || transactionActive.année || 2026),
    // On applique le changement
    [field]: field === 'montant' ? parseFloat(value) : value 
  };

  try {
    // 1. Sauvegarde SQL
    await api.put(`/transactions/${id}`, updatedData);
    
    // 2. LOGIQUE D'APPRENTISSAGE
    if (field === 'categorie' && isApprendreActive) {
      console.log("🧠 Apprentissage activé pour :", transactionActive.nom);
      
      await api.post(`/memoire`, {
        nom: transactionActive.nom,
        categorie: value,
        utilisateur: user
      });

      showLearningNotif(transactionActive.nom, value);

      // Mise à jour locale (toutes les lignes de même nom)
      setToutesLesTransactions(prev => 
        prev.map(t => t.nom === transactionActive.nom ? { ...t, categorie: value } : t)
      );

    } else {
      // 3. Mise à jour simple
      setToutesLesTransactions(prev => 
        prev.map(t => t.id == id ? { ...t, ...updatedData } : t)
      );
    }

  } catch (err) {
    console.error("Erreur de validation Pydantic :", err.response?.data);
    alert("Erreur de sauvegarde. Le backend attendait 'annee' sans accent.");
    fetchTransactions();
  }
};





const [selectedIds, setSelectedIds] = useState([]);

// A mettre dans ton composant parent
const toggleAll = () => {
  // On compare la longueur actuelle avec le nombre de transactions affichées
  if (selectedIds.length === transactionsAAfficher.length) {
    // Si tout est sélectionné -> on vide tout
    setSelectedIds([]);
  } else {
    // SINON -> on récupère TOUS les IDs proprement dans un tableau
    const allIds = transactionsAAfficher.map(t => t.id);
    setSelectedIds(allIds);
  }
};

const toggleSelect = (id) => {
  setSelectedIds(prev => {
    if (prev.includes(id)) {
      return prev.filter(item => item !== id);
    } else {
      // On ajoute l'ID au tableau existant
      return [...prev, id];
    }
  });
};


const handleDeleteSelected = async () => {
  // Sécurité : on sort si rien n'est sélectionné
  if (selectedIds.length === 0) return;

  try {
    // Envoi de la liste d'IDs au backend
    const res = await api.delete(`/transactions/batch`, { 
      data: selectedIds 
    });

    if (res.data.status === "success") {
      // 1. Mise à jour instantanée du tableau local (UX fluide)
      setToutesLesTransactions(prev => 
        prev.filter(t => !selectedIds.includes(t.id))
      );
      
      // 2. Reset de la sélection pour la prochaine fois
      setSelectedIds([]);
      
      console.log(`Suppression réussie : ${res.data.deleted_count} éléments.`);
    }
  } catch (err) {
    console.error("Erreur lors de la suppression :", err);
    // Ici tu peux appeler ta propre notif d'erreur si tu en as une
  }
};




const [isApprendreActive, setIsApprendreActive] = useState(false);
const sorted = (arr) => [...arr].sort((a, b) => a.localeCompare(b));


const addCategory = async (fullName) => {
  if (!fullName) return;

  try {
    // 1. Appel au backend
    await api.post(`/api/categories`, {
      nom: fullName,
      utilisateur: user
    });

    // 2. MISE À JOUR INSTANTANÉE DE L'INTERFACE
    // On ajoute la nouvelle catégorie aux deux listes pour que 
    // ça apparaisse dans le tableau ET dans la colonne de droite
    setCategoriesPerso(prev => sorted([...prev, fullName]));
    setToutesLesCategories(prev => sorted([...prev, fullName]));
    
    // On réinitialise l'icône par défaut pour la prochaine fois
    setNewIcon("🏷️");

  } catch (err) {
    console.error("Erreur ajout catégorie:", err);
    alert("Impossible d'ajouter la catégorie.");
  }
};

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [catToDelete, setCatToDelete] = useState(null);

// Cette fonction est appelée par le clic sur la croix (X) dans ta liste
const removeCategory = (catName) => {
  // On stocke le nom de la catégorie à supprimer
  setCatToDelete(catName);
  // On affiche la modale design à la place du window.confirm
  setShowDeleteConfirm(true);
};

// Cette fonction est appelée par le bouton "Supprimer" de ta Modale
const confirmDeletecat = async () => {
  if (!catToDelete) return;

  try {
    // Encodage pour les emojis et espaces
    const encodedName = encodeURIComponent(catToDelete);
    
    const response = await api.delete(
      `/api/categories/${user}/${encodedName}`
    );

    if (response.data.status === "success" || response.data.status === "deleted") {
      // MISE À JOUR LOCALE INSTANTANÉE
      setCategoriesPerso(prev => prev.filter(c => c !== catToDelete));
      setToutesLesCategories(prev => prev.filter(c => c !== catToDelete));
      
      // On ferme la modale et on reset l'état
      setShowDeleteConfirm(false);
      setCatToDelete(null);
    }
  } catch (err) {
    console.error("Erreur réseau lors de la suppression:", err);
    alert("Erreur lors de la suppression");
    setShowDeleteConfirm(false);
  }
};


// --- 2. Ta logique de calcul (Dérivée) ---
// Cette ligne doit être déclarée à chaque rendu, juste avant le "return"
const categoriesVisibles = toutesLesCategories.filter(cat => !masquees.includes(cat));

// --- 3. Ta fonction d'action ---
const toggleVisibility = async (catName) => {
  let nouvelleListe;
  if (masquees.includes(catName)) {
    nouvelleListe = masquees.filter(c => c !== catName);
  } else {
    nouvelleListe = [...masquees, catName];
  }
  
  setMasquees(nouvelleListe); 
  

  await fetch(`${import.meta.env.VITE_API_URL}/api/categories_masquees/${user}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nouvelleListe)
  });
};


const [showEmojiPicker, setShowEmojiPicker] = useState(false);
const [newIcon, setNewIcon] = useState("🏷️");

const onEmojiClick = (emojiData) => {
  setNewIcon(emojiData.emoji); // Récupère l'emoji choisi
  setShowEmojiPicker(false);   // Ferme le picker
};

const [showListPopover, setShowListPopover] = useState(false);
const [selectedDate, setSelectedDate] = useState(new Date());

// 1. On définit l'état initial (vide pour le compte)
const [newTx, setNewTx] = useState({
  categorie: '❓ Autre',
  compte: ''
});

// 2. On synchronise le compte dès que le profil change
useEffect(() => {
  // On filtre les comptes qui appartiennent au profil sélectionné
  // (Adapte 'c.groupe' selon le nom de ta clé dans ton objet compte)
  const comptesFiltrés = soldesTries.filter(s => 
    filters.profil === 'Tous' || s.groupe === filters.profil
  );

  if (comptesFiltrés.length > 0) {
    setNewTx(prev => ({
      ...prev,
      compte: comptesFiltrés[0].compte // On prend le premier de la liste filtrée
    }));
  }
}, [filters.profil, soldesTries]); 
// ^ Se déclenche si on change de profil OU si les données arrivent de l'API

const submitQuickTransaction = async () => {
  const elNom = document.getElementById('quick-nom');
  const elMontant = document.getElementById('quick-montant');

  if (!elNom?.value || !elMontant?.value) return alert("Nom et montant requis");

  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const day = String(selectedDate.getDate()).padStart(2, '0');
  const dateFormatted = `${year}-${month}-${day}`;

  const fullTransaction = {
    nom: elNom.value,
    montant: parseFloat(elMontant.value),
    categorie: newTx.categorie,
    compte: newTx.compte,
    utilisateur: user,
    mois: moisListe[selectedDate.getMonth()].v,
    annee: year, // Pour le backend
    date: dateFormatted 
  };

  try {
    const res = await api.post(`/transactions`, fullTransaction);
    
    if (res.data && res.data.status === "success") {
      // ON CRÉE UN OBJET COMPATIBLE AVEC TON TABLEAU REACT
      const newTransactionForTable = {
        ...res.data,
        année: year, // On ajoute la clé avec accent pour l'affichage immédiat
        annee: year  // On garde sans accent pour la cohérence
      };

      // Ajout en haut de la liste
      setToutesLesTransactions(prev => [newTransactionForTable, ...prev]);
      
      // Reset des champs
      elNom.value = '';
      elMontant.value = '';
      
    } else if (res.data.status === "ignored") {
      alert("Doublon détecté : cette transaction existe déjà.");
    }
  } catch (err) {
    console.error("Erreur lors de l'ajout :", err.response?.data?.detail || err.message);
    alert("Erreur lors de l'enregistrement.");
  }
};



const transactionsFiltrées = useMemo(() => {
  return toutesLesTransactions.filter(t => {
    
    // 1. On trouve à quel groupe appartient le compte de cette transaction
    // On cherche dans ta liste 'comptes' l'objet qui a le même nom que t.compte
    const compteInfo = comptes.find(c => c.compte === t.compte);
    const groupeTransaction = compteInfo ? compteInfo.groupe : null;

    // 2. FILTRE PROFIL
    // Maintenant on compare le groupe trouvé avec le filtre sélectionné
    const matchProfil = filters.profil === 'Tous' || 
                        groupeTransaction === filters.profil;
    
    // 3. FILTRE COMPTE
    const matchCompte = selectedCompte === 'tous' || 
                        t.compte === selectedCompte;
    
    // 4. FILTRE MOIS
    const matchMois = filters.mois === 'Tous' || 
                      t.mois === filters.mois;
    
    // 5. FILTRE ANNÉE (Note: ton log dit 'annee' sans accent, vérifie bien l'orthographe)
    const matchAnnee = filters.annee === 'Tous' || 
                       t.année?.toString() === filters.annee.toString() ||
                       t.annee?.toString() === filters.annee.toString();

    return matchProfil && matchCompte && matchMois && matchAnnee;
  });
}, [toutesLesTransactions, filters, selectedCompte, comptes]); 
// Ajoute bien 'comptes' dans les dépendances ici !

const statsFiltrées = useMemo(() => {
  return transactionsFiltrées.reduce((acc, t) => {
    const cat = String(t.categorie || "");
    
    // Détection des transferts :
    // 1. On cherche l'emoji 🔄 (peu importe ce qu'il y a après)
    // 2. On cherche le mot "Virement" ou "Transfert"
    // 3. On garde ton exception pour le Compte Commun 👫
    const estUnTransfert = 
      cat.includes("🔄") || 
      cat.toLowerCase().includes("VERS") ||
      cat.toLowerCase().includes("transfert");

    if (estUnTransfert) {
      return acc; // On ignore cette transaction dans le calcul des revenus/dépenses
    }

    const val = parseFloat(t.montant);
    if (!isNaN(val)) {
      if (val > 0) acc.revenus += val;
      else acc.depenses += Math.abs(val);
      
      acc.solde = acc.revenus - acc.depenses;
    }
    
    return acc;
  }, { revenus: 0, depenses: 0, solde: 0 });
}, [transactionsFiltrées]);




const [tempTransactions, setTempTransactions] = useState([]);
const handleFileUpload = async (file) => {
  if (!file) return;

  // Vérification de sécurité avant l'envoi
  if (!user || (!user.nom && typeof user !== 'string')) {
    alert("Erreur : Vous devez être connecté pour importer un fichier.");
    return;
  }

  const formData = new FormData();
  formData.append('file', file);

  // On extrait le nom proprement (si user est un objet, on prend user.nom, sinon user)
  const nomUtilisateur = typeof user === 'object' ? user.nom : user;

  try {
    const response = await api.post(
      `/import-csv?utilisateur=${nomUtilisateur}&compte=${selectedCompte}`, 
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    
    setTempTransactions(response.data);
  } catch (error) {
    console.error("Détails erreur :", error.response?.data?.detail);
    alert(error.response?.data?.detail || "Erreur lors de l'envoi");
  }
};



useEffect(() => {
  // On ne déclenche le switch automatique QUE si on est sur l'onglet importer
  if (activeTab === 'importer' && selectedCompte === 'tous' && comptes.length > 0) {
    setSelectedCompte(comptes[0].compte);
  }
}, [comptes, activeTab]); // On ajoute activeTab ici pour réagir au changement d'onglet


const [isDragging, setIsDragging] = useState(false);

const onDragOver = (e) => {
  e.preventDefault();
  setIsDragging(true);
};

const onDragLeave = () => {
  setIsDragging(false);
};

const onDrop = (e) => {
  e.preventDefault();
  setIsDragging(false);
  
  const file = e.dataTransfer.files[0];
  if (!file) return;

  // On vérifie l'extension .csv ou le type mime
  const isCSV = file.name.toLowerCase().endsWith('.csv') || 
                file.type === "text/csv" || 
                file.type === "application/vnd.ms-excel";

  if (isCSV) {
    handleFileUpload(file);
  } else {
    alert("Veuillez déposer un fichier CSV valide (.csv)");
  }
};


const [notification, setNotification] = useState(null);
const confirmBatchImport = async () => {
  try {
    // 1. Envoi au backend (qui attend 'annee' sans accent)
    const response = await api.post(`/transactions/batch`, tempTransactions);
    
    // 2. Préparation des transactions pour l'affichage immédiat
    // On s'assure que chaque transaction possède les deux clés (accent et sans accent)
    const transactionsWithCorrectKeys = tempTransactions.map(t => ({
      ...t,
      année: t.année || t.annee, // Force la présence de 'année' pour ton tableau
      annee: t.annee || t.année  // Garde 'annee' pour la cohérence backend
    }));

    // 3. Mise à jour de l'interface SANS refresh
    setToutesLesTransactions(prev => [...transactionsWithCorrectKeys, ...prev]);

    setNotification({
      message: `Importation réussie : ${response.data.added} transactions enregistrées`,
      type: 'success'
    });

    setTempTransactions([]);
    
    // Optionnel : fetchTransactions() peut rester en sécurité, 
    // mais l'affichage est déjà géré par la ligne au-dessus.
    fetchTransactions(); 

    setTimeout(() => setNotification(null), 7000);

  } catch (error) {
    console.error("Erreur batch :", error);
    setNotification({
      message: "Erreur lors de l'enregistrement groupé",
      type: 'error'
    });
    setTimeout(() => setNotification(null), 7000);
  }
};


// 1. L'état
const [categoriesConfig, setCategoriesConfig] = useState([]);

// 2. Définition de la fonction de chargement (ACCESSIBLE PARTOUT)
const fetchCategoriesConfig = async () => {
  try {
    const res = await api.get(`/config-categories`);
    console.log("Données reçues de l'API :", res.data);
    setCategoriesConfig(res.data);
  } catch (err) {
    console.error("Erreur API Intelligence :", err);
  }
};

// 3. Appel unique au montage
useEffect(() => {
  fetchCategoriesConfig();
}, []);



const handleAddKeyword = async (catName, newKeyword) => {
  const cleanKeyword = newKeyword.trim().toLowerCase();
  if (!cleanKeyword) return;

  // On cherche si on a déjà des mots clés pour cette catégorie
  const targetCat = categoriesConfig.find(c => c.categorie === catName);
  
  // Si targetCat existe, on prend ses mots clés, sinon tableau vide
  const existingKeywords = targetCat ? (targetCat.mots_cles || []) : [];
  
  // On évite les doublons locaux
  if (existingKeywords.includes(cleanKeyword)) return;
  
  const updatedKeywords = [...existingKeywords, cleanKeyword];

  try {
    await api.put(`/config-categories/update`, {
      categorie: catName,
      keywords: updatedKeywords
    });
    
    // TRÈS IMPORTANT : Recharger la config pour que l'UI se mette à jour
    await fetchCategoriesConfig(); 
    
    setNotification({ message: `Intelligence apprise : ${catName}`, type: "success" });
  } catch (e) {
    console.error(e);
    setNotification({ message: "Erreur de mémorisation", type: "error" });
  }
};

const handleRemoveKeyword = async (catName, keywordToRemove) => {
  const targetCat = categoriesConfig.find(c => c.categorie === catName);
  const updatedKeywords = targetCat.mots_cles.filter(k => k !== keywordToRemove);

  try {
    await api.put(`/config-categories/update`, {
      categorie: catName,
      keywords: updatedKeywords
    });
    fetchCategoriesConfig();
  } catch (e) { console.error(e); }
};




// État pour la catégorie sélectionnée dans l'intelligence
const [intelSelectedCat, setIntelSelectedCat] = useState("");

const categoriesPourIntelligence = useMemo(() => {
  // 1. On part de toutes les catégories de l'app (Défaut + Perso)
  // 2. On filtre pour ne garder que les VISIBLES
  const visibles = toutesLesCategories.filter(cat => !masquees.includes(cat));
  
  // 3. On ajoute les catégories détectées dans l'import CSV actuel
  const fromImports = tempTransactions ? tempTransactions.map(t => t.categorie) : [];
  
  // Fusion unique et tri
  return [...new Set([...visibles, ...fromImports])].sort();
}, [toutesLesCategories, masquees, tempTransactions]);

// On cherche la data (mots-clés) dans la config SQL
const activeCategoryData = categoriesConfig.find(c => c.categorie === intelSelectedCat);



useEffect(() => {
  // Si on a des catégories et qu'aucune n'est encore sélectionnée
  if (categoriesPourIntelligence.length > 0 && !intelSelectedCat) {
    setIntelSelectedCat(categoriesPourIntelligence[0]);
  }
}, [categoriesPourIntelligence, intelSelectedCat]);





const [allPrevisions, setallPrevisions] = useState([]);

// On stocke TOUTES les prévisions de l'année ici
const [allPrevisionsAnnee, setallPrevisionsAnnee] = useState([]);

const loadPrevisions = async () => {
  if (!user) return;
  try {
    // 1. On utilise la route 'previsions' (pas get-budgets)
    // 2. On passe 'ALL' pour avoir toute l'année d'un coup
    // 3. On passe l'année dynamiquement
    const url = `/previsions/${user}/ALL/${filters.annee}`;
    
    console.log("Tentative de récupération :", url);
    
    const res = await api.get(url);
    
    if (res.data) {
      console.log("Données reçues :", res.data.length, "lignes");
      setallPrevisionsAnnee(res.data);
    }
  } catch (err) {
    console.error("Erreur lors du chargement des prévisions :", err);
  }
};

// ⚠️ IMPORTANT : Retire filters.mois des dépendances ici !
// On ne veut recharger l'API QUE si l'année ou l'user change.
useEffect(() => {
  loadPrevisions();
}, [user, filters.annee]);



const previsionsFiltrees = useMemo(() => {
  // 1. Si on n'a pas encore de données, on renvoie un tableau vide
  if (!allPrevisionsAnnee || allPrevisionsAnnee.length === 0) return [];

  // 2. Filtrage par MOIS
  const dataDuMois = allPrevisionsAnnee.filter(p => {
    // On compare en mettant tout en minuscule pour éviter les erreurs "Janvier" vs "janvier"
    const moisPrevision = String(p.mois || "").toLowerCase().trim();
    const moisSelectionne = String(filters.mois || "").toLowerCase().trim();
    return moisPrevision === moisSelectionne;
  });

  // 3. Filtrage par PROFIL (Perso / Pro / Tous)
  if (filters.profil === 'Tous') return dataDuMois;

  return dataDuMois.filter(prev => {
    // On cherche à quel groupe appartient le compte de cette prévision
    const nomCompte = String(prev.compte || "").trim().toUpperCase();
    const infoCompte = comptes?.find(c => 
      String(c?.compte || "").trim().toUpperCase() === nomCompte
    );
    return infoCompte?.groupe === filters.profil;
  });
}, [allPrevisionsAnnee, filters.mois, filters.profil, comptes]);



// État pour les mois masqués (ex: ["Août 2024"])
const [excludedMonths, setExcludedMonths] = useState([]);


// On crée une version "Année" sans le filtre du mois sélectionné
const previsionsActivesPourRecap = useMemo(() => {
  // On filtre TOUTE l'année uniquement par profil et mois exclus (les petits boutons "Masquer")
  return allPrevisionsAnnee.filter(p => {
    // Filtre profil
    if (filters.profil !== 'Tous') {
        const nomSQL = String(p.compte || "").trim().toUpperCase();
        const compteAssocie = comptes?.find(c => String(c?.compte || "").trim().toUpperCase() === nomSQL);
        if (compteAssocie?.groupe !== filters.profil) return false;
    }

    // Filtre mois exclus (tes boutons "Masquer/Activer")
    const d = new Date(p.date);
    const moisP = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    const moisFormate = moisP.charAt(0).toUpperCase() + moisP.slice(1);
    return !excludedMonths.includes(moisFormate);
  });
}, [allPrevisionsAnnee, filters.profil, excludedMonths, comptes]);

const soldesPrevisionnels = useMemo(() => {
  const impactPrevisions = {};
  soldesTries.forEach(c => { impactPrevisions[c.compte.trim().toUpperCase()] = 0; });

  // CHANGEMENT ICI : On utilise previsionsActivesPourRecap
  previsionsActivesPourRecap.forEach(p => {
    const montant = parseFloat(p.montant) || 0;
    const compteSrc = (p.compte || "").trim().toUpperCase();
    const cat = (p.categorie || "").toUpperCase();
    const nomTrans = (p.nom || "").toUpperCase();
    const texteIntegral = `${nomTrans} ${cat}`;

    if (impactPrevisions.hasOwnProperty(compteSrc)) {
      impactPrevisions[compteSrc] += montant;
    }

    if (cat.includes("🔄") || cat.includes("VERS") || nomTrans.includes("VERS")) {
      const groupeSource = comptes.find(c => c.compte.trim().toUpperCase() === compteSrc)?.groupe;
      let meilleurMatch = null;
      for (const c of comptes) {
        const nomDest = c.compte.trim().toUpperCase();
        if (nomDest === compteSrc) continue;
        if (c.groupe !== groupeSource) continue;

        const motsAIgnorer = ["CCP", "VERS", "VIREMENT", "EPARGNE", "THEO", "AUDE"];
        const motsCompte = nomDest.split(" ").filter(m => m.length >= 3 && !motsAIgnorer.includes(m));

        if (texteIntegral.includes(nomDest) || (motsCompte.length > 0 && motsCompte.some(m => texteIntegral.includes(m)))) {
          meilleurMatch = nomDest;
          break;
        }
      }
      if (meilleurMatch && impactPrevisions.hasOwnProperty(meilleurMatch)) {
        impactPrevisions[meilleurMatch] -= montant;
      }
    }
  });

  return soldesTries.map(c => ({
    ...c,
    soldeFinalEstime: c.soldePeriode + (impactPrevisions[c.compte.trim().toUpperCase()] || 0)
  }));
  // CHANGEMENT ICI : previsionsActivesPourRecap en dépendance
}, [soldesTries, previsionsActivesPourRecap, comptes]);

const soldeGlobalProjete = useMemo(() => 
  soldesPrevisionnels.reduce((acc, c) => acc + c.soldeFinalEstime, 0)
, [soldesPrevisionnels]);





const [newPrevi, setNewPrevi] = useState({
  date: new Date().toISOString().split('T')[0],
  nom: '',
  montant: '',
  categorie: '',
  compte: comptes[0]?.compte || '' // On prend le premier compte de ta liste
});

const optionsComptes = useMemo(() => 
  comptes.map(c => ({ v: c.compte, l: c.compte })),
  [comptes]
);

const handleAddPrevision = async () => {
  if (!newPrevi.nom || !newPrevi.montant) return;

  // On crée un objet Date à partir de la sélection pour extraire les infos SQL
  const dateObj = new Date(newPrevi.date);
  const nomMoisLong = dateObj.toLocaleDateString('fr-FR', { month: 'long' });
  // On met la première lettre en majuscule (ex: "février" -> "Février")
  const moisFormate = nomMoisLong.charAt(0).toUpperCase() + nomMoisLong.slice(1);

  const payload = {
    ...newPrevi,
    utilisateur: user,
    mois: moisFormate,
    annee: dateObj.getFullYear()
  };

  try {
    await api.post(`/previsions`, payload);
    setNewPrevi({ ...newPrevi, nom: '', montant: '' }); // On garde la date et le compte
    loadPrevisions();
  } catch (err) {
    console.error("Erreur:", err);
  }
};


const updatePrevision = async (id, field, value) => {

  if (!id) {
    console.error("Impossible de modifier : l'ID de la prévision est introuvable.");
    return;
  }
  try {
    let finalValue = value;
    let extraData = {};

    // Si on modifie la DATE
    if (field === 'date') {
      const d = new Date(value);
      // Format YYYY-MM-DD pour la base de données
      finalValue = d.toISOString().split('T')[0]; 
      
      const nomMois = d.toLocaleDateString('fr-FR', { month: 'long' });
      extraData.mois = nomMois.charAt(0).toUpperCase() + nomMois.slice(1);
      extraData.annee = d.getFullYear(); // On envoie 'annee' (le backend gérera l'accent)
    }

    // On prépare le payload final
    const payload = { [field]: finalValue, ...extraData };

    // Envoi à l'API
    await api.put(`/previsions/${id}`, payload);
    
    loadPrevisions();
  } catch (err) {
    // Si l'erreur persiste, regarde l'onglet "Network" -> "Response" dans ton navigateur
    console.error("Erreur update prévision:", err);
  }
};



const [selectedIds2, setSelectedIds2] = useState([]);

// Sélectionner / Désélectionner tout
const toggleAll2 = () => {
  if (selectedIds2.length === previsionsFiltrees.length) {
    setSelectedIds2([]);
  } else {
    setSelectedIds2(previsionsFiltrees.map(p => p.id));
  }
};

// Sélectionner / Désélectionner une ligne
const toggleSelect2 = (id) => {
  setSelectedIds2(prev => 
    prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
  );
};

// Suppression groupée
const handleDeleteSelected2 = async () => {


  try {
    // On peut soit faire une boucle, soit créer une route backend DELETE avec un body [ids]
    await Promise.all(selectedIds2.map(id => 
      api.delete(`/previsions/${id}`)
    ));
    
    setSelectedIds2([]);
    loadPrevisions(); // Rafraîchir le tableau et les soldes
  } catch (err) {
    console.error("Erreur suppression groupée:", err);
  }
};



const recapPrevisionsStats = useMemo(() => {
  const maintenant = new Date();
  const moisActuelIdx = maintenant.getMonth();
  const anneeActuelle = maintenant.getFullYear();
  const anneeFiltre = parseInt(filters.annee);

  const moisPassesEtPresent = recapAnnuelStats.filter(m => m.soldeTotal !== null);
  const dernierStatsReel = moisPassesEtPresent[moisPassesEtPresent.length - 1];
  
  let cumulMobile = dernierStatsReel ? dernierStatsReel.soldeTotal : 0;

  // Fonction utilitaire pour détecter un transfert dans les prévisions
  const estUnTransfertPrevi = (p) => {
    const cat = (p.categorie || "").toLowerCase();
    const nom = (p.nom || "").toLowerCase();
    return cat.includes('🔄') || cat.includes('vers') || cat.includes('transfert') || nom.includes('vers');
  };

  return moisListe.map((moisObj, indexMois) => {
    const estFutur = (anneeFiltre > anneeActuelle) || (anneeFiltre === anneeActuelle && indexMois > moisActuelIdx);
    const estMoisEnCours = (anneeFiltre === anneeActuelle && indexMois === moisActuelIdx);

    if (!estFutur && !estMoisEnCours) {
      return { ...recapAnnuelStats[indexMois], type: 'réel' };
    }

    // CHANGEMENT ICI : On vérifie si le mois est exclu
    const nomMoisComplet = `${moisObj.l} ${anneeFiltre}`;
    const estMasque = excludedMonths.includes(nomMoisComplet);

    // On utilise previsionsActivesPourRecap pour filtrer les données du mois
    const previsionsDuMois = previsionsActivesPourRecap.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === indexMois && d.getFullYear() === anneeFiltre;
    });

    const rev = previsionsDuMois
      .filter(p => p.montant > 0 && !estUnTransfertPrevi(p))
      .reduce((acc, p) => acc + (parseFloat(p.montant) || 0), 0);
      
    const dep = previsionsDuMois
      .filter(p => p.montant < 0 && !estUnTransfertPrevi(p))
      .reduce((acc, p) => acc + Math.abs(parseFloat(p.montant) || 0), 0);

    const balanceMois = rev - dep;

    // Le cumul ne bouge que si le mois n'est pas masqué
    if ((estFutur || estMoisEnCours) && !estMasque) {
      cumulMobile += balanceMois;
    }

    return {
      nom: moisObj.l,
      revenus: estMasque ? 0 : rev, // On affiche 0 si masqué
      depenses: estMasque ? 0 : dep,
      epargne: estMasque ? 0 : balanceMois,
      soldeTotal: cumulMobile, // Le cumul reste à jour avec les mois actifs uniquement
      type: 'projeté',
      isMasque: estMasque // Petit flag utile pour griser la ligne dans le JSX
    };
  });
  // CHANGEMENT ICI : previsionsActivesPourRecap en dépendance
}, [recapAnnuelStats, previsionsActivesPourRecap, filters.annee, moisListe, excludedMonths]);



const moisDisponibles = useMemo(() => {
  // On prend TOUTE l'année pour générer les boutons de masquage
  const mois = allPrevisionsAnnee.map(p => { 
    const d = new Date(p.date);
    const m = d.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  });
  return [...new Set(mois)].sort((a, b) => new Date(a) - new Date(b));
}, [allPrevisionsAnnee]); // <--- Dépend de l'année complète


const chartDataPrevisions = useMemo(() => {
  const aggregat = {};
  
  // Utilise 'previsionsFiltrees' (qui contient le mois et le profil sélectionnés)
  // au lieu de 'previsionsActivesPourRecap'
  const depensesSeules = previsionsFiltrees.filter(p => 
    p.montant < 0 && 
    !(p.categorie?.includes("🔄") || p.nom?.toUpperCase().includes("VERS"))
  );

  depensesSeules.forEach(p => {
    const cat = p.categorie || "Sans catégorie";
    aggregat[cat] = (aggregat[cat] || 0) + Math.abs(p.montant);
  });

  return Object.keys(aggregat)
    .map(name => ({ name, value: aggregat[name] }))
    .sort((a, b) => b.value - a.value); 
    
}, [previsionsFiltrees]); // <--- On observe les changements du tableau de gauche


const [moisAvecPrevisions, setMoisAvecPrevisions] = useState([]);

// On charge une fois la liste des périodes existantes en base prévisions
const loadAvailablePreviPeriods = async () => {
  try {
    // Il te faudrait une route dédiée ou charger TOUTES les prévisions 
    // (sans filtre mois/annee) juste pour extraire les dates
    const res = await api.get(`/previsions/${user}`);
    setMoisAvecPrevisions(res.data); // Format attendu : [{mois: 3, annee: 2024}, ...]
  } catch (err) {
    console.error(err);
  }
};

useEffect(() => {
  loadAvailablePreviPeriods();
}, [user]);


// --- 1. Tes States (Assure-toi que l'ordre est respecté) ---
const [allocations, setAllocations] = useState([]);
const [montantAiguillage, setMontantAiguillage] = useState("");

// On calcule la somme de TOUTES les allocations récupérées du SQL
const sommeAllocations = useMemo(() => {
    return allocations.reduce((acc, curr) => {
        // On s'assure que montant_alloue est bien traité comme un nombre
        return acc + (parseFloat(curr.montant_alloue) || 0);
    }, 0);
}, [allocations]); // Le calcul se relance dès que la liste 'allocations' change

// Le reste à ventiler se met à jour tout seul
const resteAVentiler = soldeGlobal - sommeAllocations;

// --- 3. Tes Fonctions ---
const fetchAllocations = async () => {
    if (!filters.profil) return;
    try {
        const response = await api.get(`/get-allocations/${filters.profil}`);
        // C'est ce setAllocations qui va déclencher la mise à jour du solde global
        setAllocations(response.data);
    } catch (error) {
        console.error("Erreur lors de la récupération des allocations:", error);
    }
};



const handleSaveAllocation = async (nomEnveloppe, montant) => {
  const userName = typeof user === 'string' ? user : (user?.username || user?.nom);

  // Vérification simple
  if (!nomEnveloppe || !montant) {
    alert("Données manquantes (nom ou montant).");
    return;
  }

  const data = {
    utilisateur: String(userName),
    profil: String(filters.profil),
    projet: String(nomEnveloppe),
    montant_alloue: parseFloat(montant)
  };

  try {
    const res = await api.post(`/save-allocation`, data);
    if (res.data.status === "success") {
      // On reset tout après le succès
      setMontantAiguillage("");
      setNewProjet({ nom: '', cout: '' });
      setShowAddProjet(false);
      fetchAllocations(); // Pour mettre à jour ton solde total
    }
  } catch (error) {
    console.error("Erreur SQL Save Allocation:", error.response?.data);
  }
};


const [showAddProjet, setShowAddProjet] = useState(false);
const [newProjet, setNewProjet] = useState({ nom: '', cout: '' });


const listeAffichage = useMemo(() => {
  // 1. On récupère les noms des projets existants
  const nomsExistants = projets.map(p => String(p.nom).toLowerCase());
  
  // 2. On cherche dans les allocations s'il y a des nouveaux noms (enveloppes créées à la volée)
  const nouvellesEnveloppes = [];
  allocations.forEach(a => {
    if (!nomsExistants.includes(String(a.projet).toLowerCase())) {
      // Si ce nom n'est pas encore dans la liste, on simule un objet "projet"
      const existeDeja = nouvellesEnveloppes.find(e => e.nom.toLowerCase() === a.projet.toLowerCase());
      if (!existeDeja) {
        nouvellesEnveloppes.push({
          id: a.projet, // On utilise le nom comme ID temporaire
          nom: a.projet,
          cout: 0 // Par défaut, ou tu peux essayer de récupérer une valeur
        });
      }
    }
  });

  return [...projets, ...nouvellesEnveloppes];
}, [projets, allocations]);



useEffect(() => {
  if (filters.profil) {
    fetchAllocations();
    // fetchProjets(); // Assure-toi que ta fonction fetchProjets est aussi appelée ici
  }
}, [filters.profil]);


const [deleteModal3, setDeleteModal3] = useState({ show: false, projetNom: null });


const [pickingColor, setPickingColor] = useState(null);



const [note, setNote] = useState(""); // Initialise avec une chaîne vide



const handleInput = (e) => {
  const element = e.target;
  // On réinitialise la hauteur pour calculer le scrollHeight réel
  element.style.height = "auto";
  // On applique la nouvelle hauteur basée sur le contenu
  element.style.height = `${element.scrollHeight}px`;
};



useEffect(() => {
  if (user) {
    fetchTransactions();
    fetchComptes(); // <--- N'oublie pas d'appeler la fonction ici
    fetchUserTheme(user); // <--- Charge le thème SQL ici
    api.get(`/note/${user}`).then(res => setNote(res.data.texte));
  }
}, [user]);



// 4. LE RENDU (UI)
if (!user) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* EFFETS DE FOND */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[100px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--primary)]/10 blur-[120px] rounded-full" />
      <div className="absolute w-[500px] h-[600px] bg-[var(--primary)]/30 blur-[100px] rounded-full z-0" />

      <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <form 
          onSubmit={isForgotPassword ? handleResetRequest : (isRegistering ? handleRegister : handleLogin)} 
          className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/20 shadow-2xl w-full"
          style={{ 
            boxShadow: `0 0 40px -10px var(--primary), inset 0 0 20px -10px var(--primary)` 
          }}
        >
          {/* HEADER DYNAMIQUE */}
          <div className="text-center mb-10">
            <div className="inline-block px-4 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-full mb-4">
              <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.3em]">
                {isForgotPassword ? "Récupération" : (isRegistering ? "Nouveau Membre" : "Accès Sécurisé")}
              </span>
            </div>
            <h2 className="text-4xl font-black text-[var(--text-main)] tracking-tighter uppercase">
              <span className="text-[var(--primary)]">Kleea</span>
            </h2>
            <p className="text-[10px] font-bold text-[var(--text-main)]/20 uppercase tracking-widest mt-2">
              {isForgotPassword ? "Réinitialisation du coffre" : (isRegistering ? "Créez votre coffre privé" : "Gestion de patrimoine privé")}
            </p>
          </div>

          <div className="space-y-4">
            
            {/* VUE RÉINITIALISATION MOT DE PASSE */}
            {isForgotPassword ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">E-mail de récupération</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      type="email"
                      className="w-full bg-white/5 border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="votre@email.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* VUE CONNEXION / INSCRIPTION */
              <>
                {/* BLOC PRÉNOM & NOM (Uniquement Inscription) */}
                {isRegistering && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Prénom</label>
                      <input 
                        className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="Jean"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required={isRegistering}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Nom</label>
                      <input 
                        className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="Dupont"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required={isRegistering}
                      />
                    </div>
                  </div>
                )}

                {/* CHAMP UTILISATEUR / IDENTIFIANT */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Identifiant</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      className="w-full bg-white/5 border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="Pseudo"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* CHAMP EMAIL (Uniquement pour inscription) */}
                {isRegistering && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">E-mail</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                      <input 
                        type="email"
                        className="w-full bg-white/5 border border-white/5 p-4 pl-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                        placeholder="theo@exemple.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* CHAMP MOT DE PASSE */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-4">
                    <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">Mot de passe</label>
                    {!isRegistering && (
                      <button 
                        type="button" 
                        onClick={() => setIsForgotPassword(true)}
                        className="text-[8px] font-black text-[var(--primary)] uppercase tracking-[0.1em] hover:brightness-150 transition-all"
                      >
                        Mot de passe Oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 group-focus-within:text-[var(--primary)] transition-colors" size={16} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full bg-white/5 border border-white/5 p-4 pl-12 pr-12 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/20 hover:text-[var(--text-main)] transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* CONFIRMATION (Uniquement pour inscription) */}
                {isRegistering && (
                  <div className="space-y-2 animate-in slide-in-from-top-2">
                    <label className="text-[9px] font-black text-[var(--text-main)]/30 uppercase ml-4 tracking-[0.2em]">Confirmer</label>
                    <input 
                      type="password"
                      className="w-full bg-white/5 border border-white/5 p-4 rounded-2xl text-[var(--text-main)] text-sm font-bold outline-none focus:border-[var(--primary)]/40 focus:bg-white/10 transition-all placeholder:text-[var(--text-main)]/10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* BOUTON PRINCIPAL */}
          <button 
            type="submit" 
            className="w-full mt-10 bg-white text-black p-5 rounded-2xl font-black uppercase text-xs tracking-[0.3em] hover:bg-[var(--primary)] hover:text-[var(--text-main)] transition-all duration-500 shadow-xl active:scale-95"
          >
            {isForgotPassword ? "Envoyer le lien" : (isRegistering ? "Créer mon compte" : "Se connecter")}
          </button>
        </form>

        {/* LIEN DE BASCULE HORS DU FORMULAIRE */}
        <button 
          onClick={() => {
            if (isForgotPassword) {
              setIsForgotPassword(false);
            } else {
              setIsRegistering(!isRegistering);
            }
          }}
          className="w-full mt-6 text-[10px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em] hover:text-[var(--primary)] transition-colors"
        >
          {isForgotPassword ? "Retour à la connexion" : (isRegistering ? "Déjà un compte ? Se connecter" : "Nouveau ici ? Créer un compte")}
        </button>
      </div>

    {/* COMPOSANT TOAST PERSONNALISÉ */}
    {toast.show && (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
        <div className={`
          px-6 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3
          ${toast.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/20 text-red-400'}
        `}>
          {/* Petit indicateur visuel */}
          <div className={`w-2 h-2 rounded-full animate-pulse ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          
          <p className="text-[11px] font-black uppercase tracking-[0.15em]">
            {toast.message}
          </p>

          <button 
            onClick={() => setToast({ ...toast, show: false })}
            className="ml-2 hover:opacity-50 transition-opacity"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    )}



    </div>
  )
}




  return (
    <div 
  className="min-h-screen p-4 md:p-8 text-[var(--text-main)] transition-colors duration-500"
  style={{
    /* On mélange 20% de ta couleur avec 80% de noir pour créer un "noir coloré" */
    background: `radial-gradient(
      circle at 50% -10%, 
      var(--bg-site) 50%, 
      color-mix(in srgb, var(--bg-site), black 50%) 100%
    )`,
    backgroundAttachment: 'fixed'
  }}
>
      {/* max-w-full permet d'occuper 100% de la largeur disponible, peu importe l'écran */}
      <div className="max-w-full mx-auto">
      
      {/* NAVIGATION GLOBALE */}
          <nav>
            {/* --- VERSION DESKTOP (Haut) --- */}
<div className="hidden md:flex sticky top-4 z-50 max-w-fit mx-auto items-center gap-2 p-1.5 bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl mb-8">
  
  {/* --- VERSION DE L'APP (LOGO-STYLE) --- */}
  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/5 mr-1">
    <div className="flex flex-col items-start leading-none">
      <span className="text-[10px] font-black text-[var(--text-main)] tracking-tighter uppercase">
        Kleea <span className="text-[var(--primary)]">v.3.0</span>
      </span>
      <span className="text-[6px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">
        Stable Build
      </span>
    </div>
  </div>

  <div className="w-px h-4 bg-white/10 mx-1" />

  {/* Navigation Items */}
  {visibleMenuItems.map((item) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 ${
          isActive 
          ? 'bg-white text-slate-900 shadow-lg' 
          : 'text-[var(--text-main)]/50 hover:text-[var(--text-main)] hover:bg-white/5'
        }`}
      >
        <Icon size={18} weight={isActive ? "fill" : "bold"} />
        <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
      </button>
    );
  })}
  
  <div className="w-px h-4 bg-white/10 mx-2" />
  
  {/* --- BADGE UTILISATEUR CONNECTÉ --- */}
  <div className="flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl ml-1">
    <div className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center text-[10px] font-black text-white shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]">
      {user.substring(0, 1).toUpperCase()}
    </div>
    <div className="flex flex-col items-start leading-none">
      <span className="text-[9px] font-black text-[var(--text-main)] uppercase tracking-[0.1em]">
        {user}
      </span>
    </div>
  </div>

  <button 
    onClick={handleLogout} 
    className="p-2 ml-1 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
    title="Déconnexion"
  >
    <LogOut size={18} />
  </button>
</div>

            {/* --- VERSION MOBILE (Tab Bar en bas) --- */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[100] px-6 pb-8 pt-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none">
              <div className="max-w-md mx-auto flex items-center justify-around p-2 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[32px] shadow-2xl pointer-events-auto">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className="relative flex flex-col items-center justify-center w-12 h-12 transition-all"
                    >
                      {/* Indicateur actif (la petite bulle) */}
                      {isActive && (
                        <div className="absolute inset-0 bg-white rounded-2xl animate-in zoom-in duration-300" />
                      )}
                      
                      <div className={`relative z-10 transition-transform duration-300 ${isActive ? 'text-slate-900 scale-110' : 'text-[var(--text-main)]/40'}`}>
                        <Icon size={24} />
                      </div>

                      {/* Point indicateur sous l'icône non-active */}
                      {!isActive && (
                        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white/10" />
                      )}
                    </button>
                  );
                })}

                {/* Bouton profil/logout mini pour mobile */}
                <button 
                  onClick={handleLogout}
                  className="w-12 h-12 flex items-center justify-center text-rose-500/50"
                >
                  <LogOut size={22} />
                </button>
              </div>
            </div>

            {/* HEADER MOBILE (Pour le nom d'utilisateur en haut) */}
            <div className="md:hidden flex items-center justify-between mb-6 px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[var(--text-main)]/30 uppercase tracking-[0.2em]">Dashboard</span>
                <span className="text-lg font-black text-[var(--text-main)] capitalize">{user}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-purple-600 flex items-center justify-center border border-white/20 shadow-lg">
                <span className="text-[var(--text-main)] font-black text-xs">{user?.charAt(0).toUpperCase()}</span>
              </div>
            </div>
          </nav>


        <main>


        {activeTab === 'dashboard' && (
        <div className="h-auto overflow-visible lg:h-[calc(99vh-100px)] lg:overflow-hidden flex flex-col animate-in fade-in duration-500 px-4 md:px-8">
          
          {/* 1. LA BARRE DE FILTRES (On la ferme bien à la fin) */}
          <div className="shrink-0 flex flex-wrap items-center gap-4 mb-4 p-3 bg-white/5 backdrop-blur-xl rounded-[var(--radius)] border border-white/10">
           {/* SECTION PROFIL */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
              {['Tous', ...new Set(comptes.map(c => c.groupe).filter(Boolean))].map(p => {
                // On vérifie si c'est sélectionné de manière insensible à la casse pour le test
                const isSelected = filters.profil?.toLowerCase() === p?.toLowerCase();

                return (
                  <button
                    key={p}
                    onClick={() => setFilters({...filters, profil: p})}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      isSelected 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block w-px h-6 bg-white/10" />

            {/* SECTION MOIS */}
            <div className="flex items-center gap-1 no-scrollbar">
              {moisListe.map(m => {
                const hasData = availablePeriods.some(p => 
                  p.mois === m.v && p.annee.toString() === filters.annee?.toString()
                );
                if (!hasData) return null;
                return (
                  <button
                    key={m.v}
                    onClick={() => setFilters({...filters, mois: m.v})}
                    className={`min-w-[38px] py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                      filters.mois === m.v 
                      ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-main)]' 
                      : 'bg-transparent border-transparent text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                    }`}
                  >
                    {m.l.substring(0, 3).toUpperCase()}
                  </button>
                );
              })}
            </div>

            <div className="hidden md:block w-px h-6 bg-white/10" />

            {/* SECTION ANNÉE */}
            <div className="flex items-center gap-1">
              {[...new Set(availablePeriods.map(p => p.annee))]
                .sort((a, b) => parseInt(a) - parseInt(b)) // Garde le tri croissant pour l'affichage (gauche à droite)
                .map(year => (
                  <button
                    key={year}
                    // On enregistre en string ici aussi
                    onClick={() => setFilters({...filters, annee: year.toString()})}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
                      // Comparaison sécurisée : on transforme les deux en String pour le test
                      filters.annee?.toString() === year.toString() 
                      ? 'bg-emerald-500 text-[var(--text-main)] shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                      : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
                    }`}
                  >
                    {year}
                  </button>
              ))}
            </div>
          </div> {/* <--- ON FERME LA BARRE DE FILTRES ICI */}




      {/* SECTION CARTES ALIGNÉES */}
        <div className="shrink-0 grid grid-cols-12 gap-4 mb-6 items-stretch"> {/* items-stretch est important ici */}
          
          {/* COLONNE GAUCHE : RECAP FILTRES + SOLDE TOTAL */}
          <div className="col-span-12 md:col-span-2 flex flex-col gap-2 h-full">
            
            {/* MINI RECAP FILTRES */}
            <div className="shrink-0 flex flex-col gap-1 px-3 py-2 bg-white/5 rounded-[var(--radius)] border border-white/10 backdrop-blur-md">
              <div className="flex justify-between items-center">
                <span className="text-[9px] text-[var(--text-main)]/30 uppercase font-black tracking-tighter italic">
                  {filters.profil}
                </span>
                <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
              </div>
              <p className="text-[10px] text-[var(--text-main)] font-black truncate">
                {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
              </p>
            </div>

            {/* CARTE SOLDE TOTAL (Celle-ci va maintenant s'ajuster) */}
            <div 
              className="flex-1 rounded-[var(--radius)] p-4 text-[var(--text-main)] shadow-xl flex flex-col justify-center transition-all duration-500"
              style={{ 
                background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
                border: `1px solid ${(userTheme.color_patrimoine || '#37b58f')}33`,
                boxShadow: `0 8px 20px -5px rgba(0, 0, 0, 0.3)`
              }}
            >
              <p className="text-[var(--text-main)]/60 text-[8px] font-black uppercase tracking-widest mb-0.5">Total</p>
              <h2 className="text-xl font-black tracking-tighter leading-none truncate">
                {soldeGlobal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
              </h2>
            </div>
          </div>

          {/* COLONNE DROITE : CONTENEUR DES COMPTES */}
          <div className="col-span-12 md:col-span-10 min-w-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={soldesTries.map(c => c.compte)} strategy={horizontalListSortingStrategy}>
                {/* On s'assure que le container flex fait bien toute la hauteur */}
                <div className="flex gap-3 h-full pb-2 overflow-x-auto md:overflow-x-visible no-scrollbar cursor-grab active:cursor-grabbing">
                  {soldesTries.map(c => (
                    <div key={c.compte} className="min-w-[160px] md:min-w-0 md:flex-1 h-full">
                      <SortableAccountCard c={c} />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

                                
            {/* --- LE CONTENEUR GRILLE PRINCIPAL --- */}
              <div className="flex-1 grid grid-cols-12 gap-4 min-h-0 mb-4 h-auto lg:h-full">
                
                {/* --- COLONNE 1 : LE JOURNAL --- */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col h-[400px] lg:h-full min-h-0 gap-4">

                    {/* CONTENEUR PRINCIPAL */}
                    <div className="flex flex-col flex-1 min-h-0 bg-white/5 rounded-[var(--radius)] border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden min-[2000px]:p-4">

                      {/* --- PARTIE 1 : TRANSACTIONS (Scrollable) --- */}
                      <div className="flex flex-col min-[2000px]:flex-[1.5] min-h-[450px] overflow-hidden">
                        
                        {/* HEADER DU FLUX */}
                        <div className="p-4 shrink-0 border-b border-white/5">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-3">
                              <h3 className="text-2xl font-black bg-white bg-clip-text text-transparent tracking-tight uppercase">
                                Flux mensuel
                              </h3>
                              <div className="border-l border-white/10 pl-3 flex flex-col">
                                <span className="text-emerald-500 text-[10px] font-black tracking-[0.2em]">
                                  {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 h-1 w-12 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                          </div>
                        </div>

                        {/* TABS DE NAVIGATION */}
                        <div className="px-4 pt-4">
                          <div className="flex bg-black/40 p-1 rounded-2xl mb-4">
                            {['revenus', 'depenses', 'transferts', 'Catégories'].map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setTabActive(tab)}
                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                  tabActive === tab ? 'bg-white/10 text-[var(--text-main)] shadow-lg' : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]/60'
                                } ${tab === 'Catégories' ? 'min-[2000px]:hidden' : 'block'}`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* RÉSUMÉ RAPIDE (TOTAL) */}
                          {tabActive !== 'Catégories' && (
                            <div className="flex justify-between items-end px-1 pb-1">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-[var(--text-main)]/40 text-[10px] uppercase font-black tracking-wider">
                                    Total {tabActive}
                                  </span>
                                  <span className="flex items-center justify-center bg-white/5 border border-white/5 px-2 py-0.5 rounded-full text-[9px] font-bold text-[var(--text-main)] backdrop-blur-sm">
                                    {(financeData.journal[tabActive] || []).length} transactions
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end">
                                <span className={`text-2xl font-black leading-none ${
                                  tabActive === 'revenus' ? 'text-emerald-400' : 
                                  tabActive === 'depenses' ? 'text-rose-400' : 
                                  'text-[var(--primary)]'
                                }`}>
                                  <span className="text-sm mr-0.5 opacity-70">
                                    {tabActive === 'revenus' ? '+' : tabActive === 'depenses' ? '-' : ''}
                                  </span>
                                  {Math.abs(
                                    (financeData.journal[tabActive] || []).reduce((acc, t) => acc + (parseFloat(t.montant) || 0), 0)
                                  ).toLocaleString()}
                                  <span className="text-xs ml-1 opacity-50">€</span>
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ZONE SCROLLABLE (LISTE OU MESSAGE VIDE) */}
                        <div className="flex-1 overflow-y-auto min-h-0 p-3 custom-scrollbar">
                          {tabActive === 'Catégories' && (
                            <div className="h-full min-[2000px]:hidden">
                              <CategoriesView 
                                statsCategories={statsCategories}
                                chartData={chartData}
                                hiddenCategories={hiddenCategories}
                                toggleCategory={toggleCategory}
                              />
                            </div>
                          )}

                          <div className={`${tabActive === 'Catégories' ? 'hidden min-[2000px]:block' : 'block'} space-y-1.5 h-full`}>
                            {(() => {
                              const currentTransactions = [...(financeData.journal[tabActive === 'Catégories' ? 'depenses' : tabActive] || [])];
                              
                              if (currentTransactions.length > 0) {
                                return currentTransactions
                                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                                  .map((t, i) => (
                                    <TransactionCard 
                                      key={i} 
                                      t={t} 
                                      color={tabActive === 'revenus' ? 'text-emerald-400' : tabActive === 'depenses' ? 'text-rose-400' : 'text-[var(--primary)]'}
                                      bg={tabActive === 'revenus' ? 'bg-emerald-400/5' : tabActive === 'depenses' ? 'bg-rose-400/5' : 'bg-[var(--primary)]/5'}
                                    />
                                  ));
                              } 
                              
                              // État vide si aucune transaction
                              if (tabActive !== 'Catégories') {
                                return (
                                  <div className="h-full flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4">
                                      <span className="text-2xl opacity-20">📑</span>
                                    </div>
                                    <h4 className="text-[var(--text-main)] font-black text-[10px] uppercase tracking-[0.2em] opacity-40">
                                      Aucun flux détecté
                                    </h4>
                                    <p className="text-[var(--text-main)]/20 text-[9px] font-bold uppercase tracking-widest mt-2 max-w-[200px]">
                                      Il n'y a aucune transaction enregistrée ici pour ce mois.
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* --- PARTIE 2 : GRAPHE (Seulement visible > 2000px) --- */}
                      <div className="hidden min-[2000px]:flex basis-[300px] max-h-[350px] bg-white/5 rounded-[var(--radius)] border border-white/5 p-3 my-4 flex-col overflow-hidden shrink-0">
                        <h3 className="text-[var(--text-main)]/30 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                          Analyse par Catégorie
                        </h3>
                        <div className="flex-1 min-h-0">
                          <CategoriesView 
                            statsCategories={statsCategories}
                            chartData={chartData}
                            hiddenCategories={hiddenCategories}
                            toggleCategory={toggleCategory}
                          />
                        </div>
                      </div>

                      {/* --- PARTIE 3 : OBJECTIFS BUDGÉTAIRES --- */}
                      <div className="shrink-0 p-2 bg-white/[0.02] border-t border-white/5 min-[2000px]:bg-transparent min-[2000px]:border-none">
                        <h3 className="text-[var(--text-main)]/30 font-black text-[9px] uppercase tracking-[0.2em] mb-1">
                          Objectifs Budgétaires
                        </h3>

                        {budgetGauges.length > 0 ? (
                          /* GRILLE DES JAUGES SI DES OBJECTIFS EXISTENT */
                          <div className="grid grid-cols-5 gap-y-10 gap-x-2">
                            {budgetGauges.map((bg, i) => {
                              const radius = 30;
                              const circumference = Math.PI * radius;
                              const strokeDashoffset = circumference - (Math.min(bg.pourcentage, 100) / 100) * circumference;

                              return (
                                <div key={i} className="flex flex-col items-center">
                                  <div className="relative w-20 h-10">
                                    <svg width="80" height="40" viewBox="0 0 80 40" className="absolute top-0 left-1/2 -translate-x-1/2">
                                      <path d="M 10,40 A 30,30 0 0 1 70,40" fill="none" stroke="currentColor" strokeWidth="6" className="text-[var(--text-main)]/5" />
                                      <path
                                        d="M 10,40 A 30,30 0 0 1 70,40"
                                        fill="none"
                                        stroke={bg.depasse ? '#fb7185' : '#34d399'}
                                        strokeWidth="6"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out"
                                        style={{ filter: `drop-shadow(0 0 3px ${bg.depasse ? '#fb7185' : '#34d399'}60)` }}
                                      />
                                    </svg>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm mb-[-2px]">
                                      {bg.nom.split(' ')[0]}
                                    </div>
                                    <div className="absolute -bottom-4 left-1 right-1 flex justify-between">
                                      <span className="text-[8px] font-black text-[var(--text-main)]/90">{Math.round(bg.reel)}€</span>
                                      <span className="text-[8px] font-black text-[var(--text-main)]/20">{bg.limite}€</span>
                                    </div>
                                  </div>

                                  <div className="text-center mt-7">
                                    <p className="text-[9px] font-black text-[var(--text-main)]/40 uppercase tracking-tighter truncate w-16 leading-none">
                                      {bg.nom.split(' ').slice(1).join(' ')}
                                    </p>
                                    <p className={`text-[11px] font-black mt-1 ${bg.depasse ? 'text-rose-400' : 'text-[#34d399]'}`}>
                                      {bg.pourcentage}%
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* MESSAGE SI AUCUN OBJECTIF DÉFINI */
                          <div className="py-6 px-4 flex items-center justify-between bg-white/[0.01] border border-dashed border-white/5 rounded-2xl mt-2">
                            <div className="flex items-center gap-3">
                              <span className="text-lg opacity-30">🎯</span>
                              <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest leading-tight">
                                Aucune limite de budget définie ce mois-ci <br/> pour vos catégories.
                              </p>
                            </div>
                            <button 
                              onClick={() => setActiveTab('gerer')}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-[var(--primary)] text-[8px] font-black uppercase tracking-widest transition-all border border-white/5"
                            >
                              Limites →
                            </button>
                          </div>
                        )}
                        </div>
      
                  </div>
                </div>
                  

                {/* COLONNE 2 : RECAP ANNUEL */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-[500px] lg:h-full min-h-0">
                  <div className="bg-white/5 rounded-[var(--radius)] border border-white/10 flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-md">
                    <div className="p-4 shrink-0 border-b border-white/10 flex items-center justify-between">
                        <div className="flex flex-col">
                          {/* Titre avec dégradé et année en retrait vertical */}
                          <div className="flex items-baseline gap-3">
                            <h3 className="text-2xl font-black bg-white bg-clip-text text-transparent tracking-tight uppercase">
                              Bilan Annuel
                            </h3>
                            
                            {/* Séparateur vertical et infos temporelles */}
                            <div className="border-l border-white/10 pl-3 flex flex-col">
                              <span className="text-emerald-500 text-[10px] font-black tracking-[0.2em]">
                                {filters.annee}
                              </span>
                            </div>
                          </div>

                          {/* La barre décorative émeraude */}
                          <div className="mt-2 h-1 w-12 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                        </div>
                      </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
                      {/* EN-TÊTE DISCRET */}
                      <div className="grid grid-cols-5 px-6 mb-2">
                        {['Mois', 'Revenus', 'Dépenses', 'Épargne', 'Cumul'].map((h) => (
                          <span key={h} className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/20 last:text-right">
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {recapAnnuelStats.map((m, i) => (
                          <div 
                            key={i} 
                            className="grid grid-cols-5 items-center px-4 py-4 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-2xl transition-all duration-200 group"
                          >
                            {/* MOIS */}
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]/40 group-hover:text-[var(--text-main)]/80 transition-colors">
                                {m.nom}
                              </span>
                            </div>

                            {/* REVENUS */}
                            <div 
                              className="text-[13px] xs:text-sm sm:text-base md:text-lg font-black tracking-tighter whitespace-nowrap"
                              style={{ color: `${userTheme.color_revenus}e6` }} // e6 = 90% opacité
                            >
                              {m.revenus !== null && m.revenus > 0 
                                ? `${m.revenus.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€` 
                                : '—'}
                            </div>

                            {/* DÉPENSES */}
                            <div 
                              className="text-[13px] xs:text-sm sm:text-base md:text-lg font-black tracking-tighter whitespace-nowrap"
                              style={{ color: `${userTheme.color_depenses}e6` }}
                            >
                              {m.depenses > 0 
                                ? `-${m.depenses.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€` 
                                : <span className="text-[var(--text-main)]/5">—</span>}
                            </div>

                            {/* ÉPARGNE */}
                            <div>
                              <span 
                                className="inline-block px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black whitespace-nowrap"
                                style={{ 
                                  backgroundColor: m.epargne >= 0 ? `${userTheme.color_epargne}1a` : `${userTheme.color_depenses}1a`, // 1a = 10% opacité fond
                                  color: m.epargne >= 0 ? userTheme.color_epargne : userTheme.color_depenses 
                                }}
                              >
                                {m.epargne !== null 
                                  ? `${m.epargne > 0 ? '+' : ''}${m.epargne.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`
                                  : '—'
                                }
                              </span>
                            </div>

                            {/* SOLDE TOTAL (CUMUL / PATRIMOINE) */}
                            <div className="text-right col-span-1">
                              <div className="flex flex-col items-end">
                                <div 
                                  className="text-sm xs:text-base sm:text-xl md:text-2xl font-black tracking-tighter leading-none whitespace-nowrap"
                                  style={{ color: userTheme.color_patrimoine }}
                                >
                                  {m.soldeTotal !== null 
                                    ? `${m.soldeTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`
                                    : <span className="text-[var(--text-main)]/10">—</span>
                                  }
                                </div>
                                
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* CARTE DE SYNTHÈSE ANNUELLE SÉPARÉE */}
                    <div className="mt-4 p-5 bg-white/[0.03] border border-white/10 rounded-[var(--radius)] backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]/30">Totaux Annuel</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-[var(--text-main)]/20 uppercase">Taux d'effort :</span>
                          <span className="text-xs font-black text-emerald-400">{tauxEpargneMoyen}%</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {/* REVENUS CUMULÉS */}
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <p className="text-[8px] font-black text-[var(--text-main)]/20 uppercase mb-1">Total Revenus</p>
                          <p className="text-lg font-black tracking-tighter" style={{ color: userTheme.color_revenus }}>
                            {totauxAnnuels.revenus.toLocaleString('fr-FR')}€
                          </p>
                        </div>

                        {/* DÉPENSES CUMULÉES */}
                        <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                          <p className="text-[8px] font-black text-[var(--text-main)]/20 uppercase mb-1">Total Dépenses</p>
                          <p className="text-lg font-black tracking-tighter" style={{ color: userTheme.color_depenses }}>
                            -{totauxAnnuels.depenses.toLocaleString('fr-FR')}€
                          </p>
                        </div>

                        {/* ÉPARGNE CUMULÉE */}
                        <div className="relative overflow-hidden bg-white/5 p-3 rounded-2xl border border-white/10 group">
                          {/* Petit effet de brillance au survol */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                          
                          <p className="text-[8px] font-black text-[var(--text-main)]/20 uppercase mb-1 italic">Net Épargné</p>
                          <p className="text-xl font-black tracking-tighter"style={{ color: userTheme.color_epargne }}>
                            {totauxAnnuels.epargne.toLocaleString('fr-FR')}€
                          </p>
                        </div>
                      </div>

                      {/* BARRE DE PROGRESSION VISUELLE (Ratio Revenus / Épargne) */}
                      <div className="mt-4 space-y-1.5">
                        <div className="flex justify-between text-[8px] font-black uppercase text-[var(--text-main)]/20">
                          <span>Consommé</span>
                          <span>Épargné ({tauxEpargneMoyen}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex border border-white/5">
                          <div 
                            className="h-full bg-rose-500/50 transition-all duration-1000" 
                            style={{ width: `${100 - tauxEpargneMoyen}%` }}
                          />
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10px_#10b981]" 
                            style={{ width: `${tauxEpargneMoyen}%` }}
                          />
                        </div>
                      </div>
                    </div>


                </div>





                {/* COLONNE 3 : GRAPHES & BUDGETS */}
                <div className="col-span-12 lg:col-span-4 flex flex-col h-[700px] lg:h-full min-h-0">

                  {/* SWITCHER DE SOUS-ONGLETS */}
                    <div className="flex bg-slate-900/50 p-1.5 rounded-[24px] mb-2 border border-white/5 backdrop-blur-md w-fit self-center shadow-inner">
                      <button 
                        onClick={() => setActiveRightTab('graphs')}
                        className={`px-6 py-2 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                          activeRightTab === 'graphs' 
                          ? 'bg-white text-slate-900 shadow-xl scale-105' 
                          : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                        }`}
                      >
                        Analytique
                      </button>
                      <button 
                        onClick={() => setActiveRightTab('projects')}
                        className={`px-6 py-2 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                          activeRightTab === 'projects' 
                          ? 'bg-white text-slate-900 shadow-xl scale-105' 
                          : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                        }`}
                      >
                        Projets
                      </button>

                    <button 
                        onClick={() => setActiveRightTab('Répartition')}
                        className={`px-6 py-2 rounded-[18px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${
                          activeRightTab === 'Répartition' 
                          ? 'bg-white text-slate-900 shadow-xl scale-105' 
                          : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]/60'
                        }`}
                      >
                        Répartition
                      </button>

                    </div>

                    {/* BLOC JAUGE ÉPARGNE ANNUELLE CUMULÉE */}
                   
                      {/* CONTENU DYNAMIQUE */}
                  {(() => {
                    switch (activeRightTab) {
                      case 'graphs':
                        return (
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="bg-white/5 rounded-[var(--radius)] border border-white/10 p-4 shadow-2xl backdrop-blur-md mb-3">
                        {/* EN-TÊTE : Toujours présent, mais contenu variable */}
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 flex items-center justify-center border border-amber-500/20">
                              <span className="text-xl">🏆</span>
                            </div>
                            <div>
                              <h4 className="text-[var(--text-main)]/40 text-[10px] font-black uppercase tracking-[0.2em] leading-tight">
                                Objectif Épargne Annuel {filters.annee}
                              </h4>
                              
                              {/* On n'affiche les chiffres que si l'objectif est défini */}
                              {objectifAnnuelGlobal > 0 ? (
                                <p className="text-[var(--text-main)] font-black text-xl leading-tight">
                                  {Math.floor(epargneCumuleeAnnuelle).toLocaleString('fr-FR')} € 
                                  <span className="text-[var(--text-main)]/20 text-xs font-medium ml-2 uppercase">
                                    / {objectifAnnuelGlobal.toLocaleString('fr-FR')} €
                                  </span>
                                </p>
                              ) : (
                                <p className="text-[var(--text-main)]/20 font-black text-sm uppercase tracking-widest leading-tight mt-1">
                                  Non défini
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Badge de pourcentage : Uniquement si objectif > 0 */}
                          {objectifAnnuelGlobal > 0 && (
                            <div className={`text-xs font-black px-3 py-1.5 rounded-xl border ${
                              pourcentageAnnuel >= 100 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {pourcentageAnnuel}%
                            </div>
                          )}
                        </div>

                        {/* SECTION BASSE : Jauge OU Message d'aide */}
                        {objectifAnnuelGlobal > 0 ? (
                          <>
                            <div className="relative h-4 w-full bg-black/40 rounded-full overflow-hidden p-[3px] border border-white/5 shadow-inner">
                              <div 
                                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                style={{ 
                                  width: `${Math.min(pourcentageAnnuel, 100)}%`,
                                  background: `linear-gradient(90deg, ${userTheme.color_jauge || '#f1c40f'}90, ${userTheme.color_jauge || '#f1c40f'})`,
                                  boxShadow: `0 0 15px ${(userTheme.color_jauge || '#f1c40f')}44`
                                }}
                              >
                                <div className="absolute inset-0 bg-white/20 w-full h-[1px] top-0 rounded-full" />
                              </div>
                            </div>

                            <div className="flex justify-between mt-3 px-1">
                              <span className="text-[9px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest">
                                {pourcentageAnnuel < 100 
                                  ? `Épargne totale accumulée sur l'année ${filters.annee}`
                                  : 'Félicitations, objectif annuel atteint !'}
                              </span>
                              <span className="text-[9px] font-bold text-[var(--text-main)]/50 uppercase italic">
                                {filters.profil}
                              </span>
                            </div>
                          </>
                        ) : (
                          /* État vide : Message plus visuel pour remplacer la jauge */
                          <div className="mt-2 py-1 px-2 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 flex items-center justify-between">
                            <p className="text-[var(--text-main)]/40 text-[10px] font-medium leading-tight">
                              Définissez un montant d'épargne pour suivre votre progression.
                            </p>
                            <button 
                              onClick={() => setActiveTab('comptes')}
                              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[var(--primary)] text-[9px] font-black uppercase tracking-widest transition-all border border-white/5"
                            >
                              Configurer →
                            </button>
                          </div>
                        )}
                      </div>
                      {/* Évolution */}
                      <div className="flex-1 bg-white/5 rounded-[var(--radius)] border border-white/10 p-4 flex flex-col shadow-2xl backdrop-blur-md min-h-0">
                        <h3 className="text-[var(--text-main)] font-bold text-sm mb-4 shrink-0">Évolution Patrimoine</h3>
                        {/* SECTION GRAPHIQUE ANNUEL */}
                          
                            
                            
                            <div className="h-full w-full pb-8">
                              <ResponsiveContainer width="100%" height="110%">
                                <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                                  <defs>
                                    {/* Gradient Revenus */}
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor={userTheme.color_revenus || "#10b981"} stopOpacity={0}/>
                                    </linearGradient>

                                    {/* Gradient Dépenses */}
                                    <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0.3}/>
                                      <stop offset="95%" stopColor={userTheme.color_depenses || "#f43f5e"} stopOpacity={0}/>
                                    </linearGradient>

                                    {/* Gradient Épargne */}
                                    <linearGradient id="colorEp" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0.2}/>
                                      <stop offset="95%" stopColor={userTheme.color_epargne || "#ffffff"} stopOpacity={0}/>
                                    </linearGradient>
                                  </defs>

                                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                  
                                  <XAxis 
                                    dataKey="nom" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 11}}
                                    dy={10}
                                  />

                                  <YAxis 
                                  hide={false} // On l'affiche enfin !
                                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} // Texte gris clair discret
                                  axisLine={false} // On cache la ligne verticale pour un look moderne
                                  tickLine={false} // On cache les petits tirets
                                  width={60} // On laisse un peu de place pour les chiffres
                                  tickFormatter={(value) => {
                                    // Formate les chiffres : 1000 -> 1k, 1000000 -> 1M
                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                                    return `${value}€`;
                                  }}
                                />
                                  
                                  <Tooltip 
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                                    contentStyle={{ 
                                      backgroundColor: '#0f172a', 
                                      border: '1px solid rgba(255,255,255,0.1)', 
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                                      padding: '12px'
                                    }}
                                    // FORMATAGE : [Valeur, Nom]
                                    formatter={(value, name) => {
                                      const formattedValue = new Intl.NumberFormat('fr-FR', { 
                                        style: 'currency', 
                                        currency: 'EUR',
                                        minimumFractionDigits: 2 
                                      }).format(value);

                                      // On transforme les noms internes en noms propres pour l'affichage
                                      const labelMap = {
                                        revenus: 'Revenus',
                                        depenses: 'Dépenses',
                                        epargne: 'Épargne'
                                      };

                                      return [formattedValue, labelMap[name] || name];
                                    }}
                                    itemStyle={{ 
                                      fontSize: '12px', 
                                      fontWeight: '900', 
                                      textTransform: 'uppercase',
                                      padding: '2px 0'
                                    }}
                                    labelStyle={{ 
                                      color: 'rgba(255,255,255,0.5)', 
                                      fontWeight: 'bold', 
                                      marginBottom: '8px',
                                      fontSize: '10px',
                                      textTransform: 'uppercase'
                                    }}
                                  />

                                  <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconType="circle"
                                    iconSize={8}
                                    content={({ payload }) => (
                                      <div className="flex justify-end gap-6 mb-4">
                                        {payload.map((entry, index) => (
                                          <div key={`item-${index}`} className="flex items-center gap-2">
                                            <div 
                                              className="w-2 h-2 rounded-full" 
                                              style={{ backgroundColor: entry.color }} 
                                            />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                                              {entry.value === 'revenus' ? 'Revenus' : entry.value === 'depenses' ? 'Dépenses' : 'Épargne'}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  />

                                  {/* REVENUS */}
                                    <Area 
                                      type="monotone" 
                                      dataKey="revenus" 
                                      stroke={userTheme.color_revenus || "#10b981"} 
                                      strokeWidth={4}
                                      fillOpacity={1} 
                                      fill="url(#colorRev)"
                                      connectNulls={true}
                                      dot={{ r: 4, fill: userTheme.color_revenus || '#10b981', strokeWidth: 1, stroke: '#ffffff' }}
                                      activeDot={{ r: 6, strokeWidth: 0 }}
                                    />

                                    {/* DÉPENSES */}
                                    <Area 
                                      type="monotone" 
                                      dataKey="depenses" 
                                      stroke={userTheme.color_depenses || "#f43f5e"} 
                                      strokeWidth={4}
                                      fillOpacity={1} 
                                      fill="url(#colorDep)"
                                      connectNulls={true}
                                      dot={{ r: 4, fill: userTheme.color_depenses || '#f43f5e', strokeWidth: 1, stroke: '#ffffff' }}
                                      activeDot={{ r: 6, strokeWidth: 0 }}
                                    />

                                    {/* ÉPARGNE */}
                                    <Area 
                                      type="monotone" 
                                      dataKey="epargne" 
                                      stroke={userTheme.color_epargne || "#ffffff"} 
                                      strokeWidth={2}
                                      fillOpacity={1} 
                                      fill="url(#colorEp)"
                                      connectNulls={true}
                                      dot={{ r: 3, fill: userTheme.color_epargne || '#ffffff', strokeWidth: 1, stroke: '#ffffff' }}
                                      activeDot={{ r: 5, strokeWidth: 0 }}
                                    />
                                                            </AreaChart>
                              </ResponsiveContainer>
                            </div>
                        

                          {/* SECTION PATRIMOINE DÉTAILLÉ */}
                            
                            
                              
                              <div className="h-full w-full pb-12">
                                <ResponsiveContainer width="100%" height="120%">
                                  <AreaChart data={recapAnnuelStats} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="nom" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.3)', fontSize: 11}} />
                                    <YAxis 
                                      hide={false} // On l'affiche enfin !
                                      tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} // Texte gris clair discret
                                      axisLine={false} // On cache la ligne verticale pour un look moderne
                                      tickLine={false} // On cache les petits tirets
                                      width={60} // On laisse un peu de place pour les chiffres
                                      tickFormatter={(value) => {
                                        // Formate les chiffres : 1000 -> 1k, 1000000 -> 1M
                                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M€`;
                                        if (value >= 1000) return `${(value / 1000).toFixed(0)}k€`;
                                        return `${value}€`;
                                      }}
                                    />
                                    
                                    <defs>
                                      {comptesDuProfil?.map((compte, index) => (
                                        <linearGradient 
                                          key={`grad-${index}`} 
                                          id={`colorGrad-${index}`} // ID unique qu'on utilisera dans le fill
                                          x1="0" y1="0" x2="0" y2="1"
                                        >
                                          <stop offset="5%" stopColor={compte.couleur || '#64748b'} stopOpacity={0.4}/>
                                          <stop offset="95%" stopColor={compte.couleur || '#64748b'} stopOpacity={0}/>
                                        </linearGradient>
                                      ))}
                                    </defs>


                                    <Tooltip 
                                      // On garde le tri par valeur
                                      itemSorter={(item) => -item.value}
                                      content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-xl border-none shadow-2xl">
                                              <p className="text-[var(--text-main)]/50 text-[10px] font-black uppercase tracking-widest mb-3">{label}</p>
                                              <div className="flex flex-col gap-2">
                                                {payload.map((entry, index) => (
                                                  <div key={index} className="flex items-center justify-between gap-8">
                                                    <div className="flex items-center gap-2">
                                                      {/* Pastille avec la couleur dynamique du compte */}
                                                      <div 
                                                        className="w-2 h-2 rounded-full" 
                                                        style={{ backgroundColor: entry.color }} 
                                                      />
                                                      <span className="text-[var(--text-main)]/70 text-xs uppercase font-medium">
                                                        {entry.name}
                                                      </span>
                                                    </div>
                                                    <span className="text-[var(--text-main)] font-bold text-xs">
                                                      {new Intl.NumberFormat('fr-FR', { 
                                                        style: 'currency', 
                                                        currency: 'EUR', 
                                                        maximumFractionDigits: 2 
                                                      }).format(entry.value)}
                                                    </span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    
                                    <Legend 
                                      verticalAlign="top" 
                                      align="right" 
                                      content={({ payload }) => (
                                        <div className="flex flex-wrap justify-end gap-x-6 gap-y-2 mb-4">
                                          {payload.map((entry, index) => (
                                            <div key={`item-${index}`} className="flex items-center gap-2">
                                              <div 
                                                className="w-2 h-2 rounded-full" 
                                                style={{ backgroundColor: entry.color }} 
                                              />
                                              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40">
                                                {/* Ici, on affiche la valeur dynamique (le nom du compte ou "Total") */}
                                                {entry.value}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    />
                                                                    {/* 1. LES COUCHES (COMPTES) */}
                                    {comptesDuProfil
                                      ?.filter(c => c && c.compte)
                                      // TRÈS IMPORTANT : On trie du plus gros au plus petit solde.
                                      // Ainsi, les "petites" surfaces sont dessinées en dernier, PAR-DESSUS les grosses.
                                      .sort((a, b) => (b.soldePeriode || 0) - (a.soldePeriode || 0)) 
                                      .map((compte, index) => {
                                        const nomCleData = compte.compte.trim().toUpperCase();
                                        const maCouleurBdd = compte.couleur || '#64748b';
                                        
                                        return (
                                          <Area
                                            key={`area-compte-${index}`}
                                            type="monotone"
                                            dataKey={nomCleData}
                                            name={compte.compte}
                                            stroke={maCouleurBdd}
                                            // ON UTILISE L'ID DU GRADIENT DÉFINI PLUS HAUT
                                            fill={`url(#colorGrad-${index})`} 
                                            fillOpacity={1} // On met 1 car l'opacité est déjà gérée dans le gradient
                                            strokeWidth={2}
                                            connectNulls={true}
                                            dot={{ r: 3, fill: maCouleurBdd, strokeWidth: 1, stroke: '#ffffff' }}
                                            isAnimationActive={false}
                                          />
                                        );
                                    })}

                                    {/* 2. LA LIGNE DU SOLDE GLOBAL */}
                                    <Area
                                      type="monotone"
                                      dataKey="soldeTotal"
                                      stroke="#ffffff"
                                      strokeWidth={3}
                                      fill="transparent" // Pas de couleur pour celle-ci, juste la ligne de tendance
                                      name="PATRIMOINE TOTAL"
                                      dot={{ r: 3, fill: '#ffffff', strokeWidth: 1, stroke: '#ffffff' }}
                                      isAnimationActive={false}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                      );

                      case 'projects':
                        return (
                          /* CONTENU DE L'ONGLET PROJETS */
                            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="bg-white/5 rounded-[var(--radius)] border border-white/10 p-6 flex flex-col h-full shadow-2xl backdrop-blur-md overflow-hidden">
                                  
                                  <div className="flex items-center justify-between mb-6 shrink-0">
                                    <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-xs">Mes Envies & Projets 🚀</h3>
                                    <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-1 rounded-lg border border-emerald-500/20 font-bold">
                                      {projets.length} ACTIFS
                                    </span>
                                  </div>

                               {/* SECTION AJOUT DE PROJET DISCRÈTE */}
                                  <div className="mb-6 shrink-0">
                                    {!showAddProject ? (
                                      /* BOUTON DISCRET */
                                      <button 
                                        onClick={() => setShowAddProject(true)}
                                        className="w-full py-3 border-2 border-dashed border-white/10 rounded-[24px] flex items-center justify-center gap-3 text-[var(--text-main)]/40 hover:text-[var(--text-main)] hover:border-white/20 hover:bg-white/5 transition-all group"
                                      >
                                        <div className="p-1 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                          <Plus size={16} />
                                        </div>
                                        <span className="text-[11px] font-black uppercase tracking-widest">Ajouter un nouveau projet</span>
                                      </button>
                                    ) : (
                                      /* LE FORMULAIRE (Affiché au clic) */
                                      <div className="grid grid-cols-2 gap-x-3 gap-y-4 bg-white/5 p-5 rounded-[2rem] border border-white/10 animate-in zoom-in-95 duration-200">
                                        <div className="col-span-2 flex justify-between items-center mb-1">
                                          <h3 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-[0.2em]">Nouveau Projet</h3>
                                          <button 
                                            onClick={() => setShowAddProject(false)}
                                            className="p-1 text-[var(--text-main)]/20 hover:text-[var(--text-main)] transition-colors"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>

                                        <input 
                                          className="col-span-2 bg-transparent border-b border-white/10 text-[var(--text-main)] text-sm p-1 focus:outline-none focus:border-white/40 transition-colors" 
                                          placeholder="Nom du projet (ex: Voyage Japon)" 
                                          value={form2.nom} 
                                          onChange={e => setForm2({...form2, nom: e.target.value})} 
                                        />
                                        
                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold ml-1">Coût Total (€)</label>
                                          <input 
                                            className="bg-transparent border-b border-white/10 text-[var(--text-main)] text-sm p-1 focus:outline-none" 
                                            type="number" 
                                            placeholder="0"
                                            value={form2.cout} 
                                            onChange={e => setForm2({...form2, cout: e.target.value})} 
                                          />
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold ml-1">Épargne / mois (€)</label>
                                          <input 
                                            className="bg-transparent border-b border-white/10 text-[var(--text-main)] text-sm p-1 focus:outline-none focus:border-emerald-500/50" 
                                            type="number" 
                                            placeholder="0"
                                            value={form2.capa} 
                                            onChange={e => setForm2({...form2, capa: e.target.value})} 
                                          />
                                        </div>

                                        <div className="col-span-2 flex flex-col gap-1">
                                          <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold ml-1">Échéance souhaitée</label>
                                          <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[var(--primary)]/50 transition-all">
                                            <Calendar size={14} className="text-[var(--text-main)]/40" />
                                            <DatePicker
                                              selected={form2.date ? new Date(form2.date) : null}
                                              onChange={(date) => setForm2({ ...form2, date: date })}
                                              dateFormat="dd/MM/yyyy"
                                              className="bg-transparent border-none outline-none text-[var(--text-main)] text-[11px] font-bold w-full cursor-pointer"
                                              calendarClassName="custom-calendar-dark"
                                              popperPlacement="bottom-start"
                                              portalId="root-portal" 
                                            />
                                          </div>
                                        </div>

                                        <button 
                                          onClick={() => {
                                            handleAdd(); // Ta fonction d'ajout
                                            setShowAddProject(false); // On referme après l'ajout
                                          }} 
                                          className="col-span-2 mt-2 py-3 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase hover:bg-[var(--primary)] hover:text-[var(--text-main)] transition-all shadow-lg active:scale-95"
                                        >
                                          Lancer le projet 🚀
                                        </button>
                                      </div>
                                    )}
                                  </div>

                              {/* --- LISTE DES PROJETS --- */}
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd2}>
                                    <SortableContext items={projets.map(p => p.nom)} strategy={verticalListSortingStrategy}>
                                      {projets.map((p, idx) => {
                                        const isEditing = editingIndex === idx;
                                        const isConfirmingDelete = itemToDelete === p.nom;

                                        return (
                                          <SortableItem key={p.nom} id={p.nom} disabled={isEditing}>
                                            <div className={`group relative border transition-all p-4 rounded-[24px] ${
                                              isEditing ? 'bg-white/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'
                                            }`}>
                                              
                                              {/* OVERLAY DE CONFIRMATION DE SUPPRESSION */}
                                              {isConfirmingDelete && (
                                                <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm rounded-[24px] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                                                  <p className="text-[10px] font-black uppercase text-[var(--text-main)] mb-3 tracking-widest text-center">
                                                    Supprimer {p.nom} ?
                                                  </p>
                                                  <div className="flex gap-2 w-full">
                                                    <button 
                                                      onClick={() => setItemToDelete(null)}
                                                      className="flex-1 py-2 bg-white/10 text-[var(--text-main)] text-[9px] font-bold uppercase rounded-lg hover:bg-white/20"
                                                    >
                                                      Non
                                                    </button>
                                                    <button 
                                                      onClick={() => { handleDelete(p.nom); setItemToDelete(null); }}
                                                      className="flex-1 py-2 bg-rose-500 text-[var(--text-main)] text-[9px] font-black uppercase rounded-lg hover:bg-rose-600 shadow-lg shadow-rose-500/20"
                                                    >
                                                      Supprimer
                                                    </button>
                                                  </div>
                                                </div>
                                              )}

                                              {isEditing ? (
                                                /* MODE ÉDITION CORRIGÉ */
                                                <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                      <label className="text-[9px] uppercase font-black text-[var(--text-main)]/30 ml-1">Nom du projet</label>
                                                      <input 
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-blue-500/50"
                                                        value={tempProjet.nom || ''}
                                                        onChange={(e) => setTempProjet({...tempProjet, nom: e.target.value})}
                                                      />
                                                    </div>
                                                    <div className="space-y-1">
                                                      <label className="text-[9px] uppercase font-black text-[var(--text-main)]/30 ml-1">Coût total (€)</label>
                                                      <input 
                                                        type="number"
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-blue-500/50"
                                                        value={tempProjet.cout || ''}
                                                        onChange={(e) => setTempProjet({...tempProjet, cout: e.target.value})}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-2">
                                                   <div className="space-y-1">
                                                      <label className="text-[9px] uppercase font-black text-[var(--text-main)]/30 ml-1">Échéance</label>
                                                      
                                                      {/* Le conteneur qui simule l'apparence de tes autres inputs */}
                                                      <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-xl px-3 py-2 focus-within:border-blue-500/50 transition-all">
                                                        <Calendar size={14} className="text-[var(--text-main)]/40" />
                                                        
                                                        <DatePicker
                                                          selected={tempProjet.date ? new Date(tempProjet.date) : null} // Protection format date
                                                          onChange={(date) => setTempProjet({ ...tempProjet, date: date })}
                                                          dateFormat="dd/MM/yyyy"
                                                          // Style de l'input invisible car le parent gère le look
                                                          className="bg-transparent border-none outline-none text-[var(--text-main)] text-xs font-bold w-full cursor-pointer"
                                                          calendarClassName="custom-calendar-dark"
                                                          popperPlacement="bottom-start"
                                                          popperModifiers={[
                                                            {
                                                              name: "preventOverflow",
                                                              options: {
                                                                boundary: "viewport",
                                                              },
                                                            },
                                                          ]}
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                      <label className="text-[9px] uppercase font-black text-[var(--text-main)]/30 ml-1">Épargne / Mois (€)</label>
                                                      <input 
                                                        type="number"
                                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-blue-500/50"
                                                        value={tempProjet.capa || ''}
                                                        onChange={(e) => setTempProjet({...tempProjet, capa: e.target.value})}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div className="flex gap-2 pt-2">
                                                    <button 
                                                      onClick={() => setEditingIndex(null)}
                                                      className="flex-1 py-2 bg-white/5 text-[var(--text-main)]/50 text-[10px] font-bold uppercase rounded-xl hover:bg-white/10 transition-all"
                                                    > Annuler </button>
                                                    <button 
                                                      onClick={() => handleUpdate(tempProjet, p.nom)}
                                                      className="flex-1 py-2 bg-blue-600 text-[var(--text-main)] text-[10px] font-black uppercase rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                                                    >
                                                      <Save size={12} /> Sauvegarder
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                /* MODE AFFICHAGE */
                                                (() => {
                                                  const epargneConsommeeParPrecedents = projets.slice(0, idx).reduce((acc, current) => acc + Number(current.cout), 0);
                                                  const epargneDisponiblePourCeProjet = Math.max(0, epargneCumuleeAnnuelle - epargneConsommeeParPrecedents);
                                                  const epargneAttribuee = Math.min(p.cout, epargneDisponiblePourCeProjet);
                                                  const resteAEpargner = Math.max(0, p.cout - epargneAttribuee);
                                                  const moisNecessaires = p.capa > 0 ? Math.ceil(resteAEpargner / p.capa) : (resteAEpargner > 0 ? Infinity : 0);
                                                  const dateFinReelle = new Date();
                                                  dateFinReelle.setMonth(dateFinReelle.getMonth() + (moisNecessaires === Infinity ? 0 : moisNecessaires));
                                                  const dateEcheance = new Date(p.date);
                                                  const estFaisable = moisNecessaires === Infinity ? false : dateFinReelle <= dateEcheance;
                                                  const pourcentageProjet = Math.round((epargneAttribuee / p.cout) * 100) || 0;

                                                  return (
                                                    <>
                                                      <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-[var(--text-main)] font-bold text-sm">{p.nom}</h4>
                                                            <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-[var(--text-main)]/40 border border-white/10 font-bold uppercase">
                                                              {Number(p.capa).toLocaleString()}€/mois
                                                            </span>
                                                          </div>
                                                          <div className="flex items-center gap-2">
                                                            <p className="text-[10px] text-[var(--text-main)]/40 font-medium italic">
                                                              Échéance : {dateEcheance.toLocaleDateString('fr-FR')}
                                                            </p>
                                                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                                                              estFaisable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                            }`}>
                                                              {estFaisable ? '✓ Faisable' : '✕ Hors délai'}
                                                            </span>
                                                          </div>
                                                        </div>
                                                        
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <button 
                                                            onClick={() => { 
                                                              setEditingIndex(idx); 
                                                              setEditingId(p.nom);
                                                              // CETTE LIGNE PRÉ-REMPLIT LE FORMULAIRE :
                                                              setTempProjet({
                                                                nom: p.nom,
                                                                cout: p.cout,
                                                                date: p.date,
                                                                capa: p.capa
                                                              });
                                                            }} 
                                                            className="p-1.5 text-[var(--text-main)]/20 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                                                          >
                                                            <Edit3 size={14} />
                                                          </button>
                                                          <button 
                                                            onClick={() => setItemToDelete(p.nom)} // Déclenche la confirmation stylisée
                                                            className="p-1.5 text-[var(--text-main)]/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                          >
                                                            <Trash2 size={14} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                      
                                                      {/* JAUGE (Inchangée) */}
                                                      <div className="relative w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                                                        <div 
                                                          className="h-full transition-all duration-1000 ease-out" 
                                                          style={{ 
                                                            width: `${pourcentageProjet}%`,
                                                            background: estFaisable 
                                                              ? `linear-gradient(90deg, ${userTheme.color_jauge || '#10b981'}99, ${userTheme.color_jauge || '#10b981'})` 
                                                              : `linear-gradient(90deg, #f43f5e99, #f43f5e)`,
                                                            boxShadow: `0 0 10px ${estFaisable ? (userTheme.color_jauge || '#10b981') : '#f43f5e'}33`
                                                          }} 
                                                        />
                                                      </div>

                                                      {/* FOOTER INFOS MIS À JOUR */}
                                                      <div className="mt-3 p-2.5 bg-black/20 rounded-xl border border-white/5 space-y-2">
                                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                                                          <span className="text-[var(--text-main)]/40">Objectif : {Number(p.cout).toLocaleString()} €</span>
                                                          <span style={{ color: estFaisable ? (userTheme.color_jauge || '#10b981') : '#f43f5e' }}>{pourcentageProjet}%</span>
                                                        </div>
                                                        
                                                        <div className="flex justify-between items-end border-t border-white/5 pt-2">
                                                          <div className="space-y-0.5">
                                                            <p className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold tracking-tighter">Achat estimé :</p>
                                                            <p className={`text-xs font-black ${estFaisable ? 'text-[var(--text-main)]' : 'text-rose-400'}`}>
                                                              {moisNecessaires === Infinity ? "Capa. insuffisante" : dateFinReelle.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                                                            </p>
                                                          </div>
                                                          <div className="text-right">
                                                            <p className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold tracking-tighter text-right">Progression :</p>
                                                            <p className="text-xs font-black text-[var(--text-main)]">
                                                              {epargneAttribuee.toLocaleString()} <span className="text-[var(--text-main)]/30 text-[9px] font-medium">/ {Number(p.cout).toLocaleString()} €</span>
                                                            </p>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </>
                                                  );
                                                })()
                                              )}
                                            </div>
                                          </SortableItem>
                                        );
                                      })}
                                    </SortableContext>
                                  </DndContext>
                                </div>
                              </div>
                            </div>
                            );
                            

                          case 'Répartition':
            return (
            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="bg-white/5 rounded-[var(--radius)] border border-white/10 p-6 flex flex-col h-full shadow-2xl backdrop-blur-md">
                
                {/* HEADER : SOLDE DISPONIBLE */}
                <div className="mb-6 p-4 bg-black/20 rounded-[var(--radius)] border border-white/5">
                  <h4 className="text-[var(--text-main)]/40 text-[10px] font-black uppercase tracking-widest mb-1">Total à Répartir</h4>
                  <div className="flex justify-between items-end">
                    <p className="text-2xl font-black text-[var(--text-main)]">{soldeGlobal.toLocaleString('fr-FR')} €</p>
                    <div className="text-right">
                      <span className="text-[9px] text-[var(--text-main)]/30 uppercase font-bold block">Reste libre</span>
                      <span className={`text-sm font-black ${resteAVentiler < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                        {resteAVentiler.toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 h-2 w-full bg-white/5 rounded-[var(--radius)] overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, (sommeAllocations / soldeGlobal) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* --- NOUVEAU BOUTON STYLE DASHED --- */}
                {!showAddProjet ? (
                  <button 
                    onClick={() => setShowAddProjet(true)}
                    className="w-full py-4 mb-6 border-2 border-dashed border-white/10 rounded-[var(--radius)] flex items-center justify-center gap-3 text-[var(--text-main)]/40 hover:text-[var(--text-main)] hover:border-white/20 hover:bg-white/5 transition-all group"
                  >
                    <div className="p-1.5 bg-white/5 rounded-[var(--radius)] group-hover:scale-110 transition-transform">
                      <Plus size={16} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">Ajouter une nouvelle enveloppe</span>
                  </button>
                ) : (
                  /* FORMULAIRE NOUVELLE ENVELOPPE */
                  <div className="mb-6 p-5 bg-black/40 border border-white/10 rounded-[24px] animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Configuration</span>
                      <button onClick={() => setShowAddProjet(false)} className="text-[var(--text-main)]/20 hover:text-[var(--text-main)]">
                        <X size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        placeholder="Nom (ex: Vacances)"
                        className="bg-black/20 border border-white/10 rounded-[var(--radius)] p-3 text-xs text-[var(--text-main)] outline-none focus:border-emerald-500"
                        value={newProjet.nom}
                        onChange={e => setNewProjet({...newProjet, nom: e.target.value})}
                      />
                      <input 
                        type="number"
                        placeholder="Montant (€)"
                        className="bg-black/20 border border-white/10 rounded-[var(--radius)] p-3 text-xs text-[var(--text-main)] outline-none focus:border-emerald-500"
                        value={newProjet.cout}
                        onChange={e => setNewProjet({...newProjet, cout: e.target.value})}
                      />
                    </div>
                    <button 
                      onClick={() => handleSaveAllocation(newProjet.nom, newProjet.cout)}
                      className="w-full mt-4 py-3 bg-emerald-500 text-[var(--text-main)] rounded-[var(--radius)] font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-all"
                    >
                      Confirmer la création
                    </button>
                  </div>
                )}

                {/* LISTE DES PROJETS */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {listeAffichage.map((projet) => {
            // On calcule le total actuel pour l'afficher
            const totalAlloue = allocations
              .filter(a => String(a.projet) === String(projet.nom))
              .reduce((sum, curr) => sum + (parseFloat(curr.montant_alloue) || 0), 0);

            return (
              <div key={projet.id} className="group p-4 bg-white/5 border border-white/10 rounded-[var(--radius)] mb-4 hover:border-white/20 transition-all">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-[var(--text-main)]/40 uppercase font-black tracking-widest">Enveloppe</span>
                    <h5 className="text-[var(--text-main)] font-bold text-sm">{projet.nom}</h5>
                  </div>
                  
                  {/* BOUTON SUPPRIMER L'ENTIÈRETE */}
                  <button 
                    onClick={() => setDeleteModal3({ show: true, projetNom: projet.nom })}
                    className="p-2 text-[var(--text-main)]/10 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-[var(--text-main)]/40">Montant alloué</span>
                      <span className="text-emerald-400 font-bold">{totalAlloue.toLocaleString()} €</span>
                    </div>
                    {/* BARRE DE PROGRESSION (Optionnelle si tu n'as pas d'objectif fixe) */}
                    <div className="h-1.5 w-full bg-white/5 rounded-[var(--radius)] overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* INPUT DE MODIFICATION DIRECTE */}
                  <div className="w-32">
                    <input 
                      type="number"
                      defaultValue={totalAlloue}
                      onBlur={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (val !== totalAlloue) {
                          await api.put(`/update-enveloppe-montant?projet=${projet.nom}&profil=${filters.profil}&nouveau_montant=${val}`);
                          fetchAllocations();
                        }
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-[var(--radius)] px-3 py-2 text-right text-sm text-emerald-400 font-bold outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  </div>
);

                            
                         default:
                          return null;
                      }
                    })()}
                          



        </div>
             
      </div>

    </div>

)}


   {activeTab === 'previsionnel' && (
  <div className="h-auto overflow-visible lg:h-[calc(98vh-100px)] lg:overflow-hidden flex flex-col animate-in fade-in duration-500 px-4 md:px-8">
    
    {/* 1. LA BARRE DE FILTRES */}
    <div className="shrink-0 flex flex-wrap items-center gap-4 mb-4 p-3 bg-white/5 backdrop-blur-xl rounded-[var(--radius)] border border-white/10">
      {/* SECTION PROFIL */}
      <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl">
        {['Tous', ...new Set(comptes.map(c => c.groupe))].map(p => (
          <button
            key={p}
            onClick={() => setFilters({...filters, profil: p})}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              filters.profil === p 
              ? 'bg-white text-slate-900 shadow-sm' 
              : 'text-[var(--text-main)]/40 hover:text-[var(--text-main)]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="hidden md:block w-px h-6 bg-white/10" />

      {/* SECTION MOIS */}
      <div className="flex items-center gap-1 no-scrollbar">
        {moisListe.map(m => (
          <button
            key={m.v}
            onClick={() => setFilters({...filters, mois: m.v})} // <--- Déclenche le useMemo de previsionsFiltrees
            className={`min-w-[38px] py-1.5 rounded-lg text-[10px] font-black transition-all border ${
              filters.mois === m.v 
              ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-main)]' 
              : 'bg-transparent border-transparent text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
            }`}
          >
            {m.l.substring(0, 3).toUpperCase()}
          </button>
        ))}
      </div>

      <div className="hidden md:block w-px h-6 bg-white/10" />

      {/* SECTION ANNÉE */}
      <div className="flex items-center gap-1">
        {[...new Set(availablePeriods.map(p => p.annee))].map(year => (
          <button
            key={year}
            onClick={() => setFilters({...filters, annee: year})}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${
              filters.annee === year 
              ? 'bg-emerald-500 text-[var(--text-main)]' 
              : 'text-[var(--text-main)]/30 hover:text-[var(--text-main)]'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>

    {/* 2. SECTION CARTES ALIGNÉES */}
    <div className="shrink-0 grid grid-cols-12 gap-4 mb-6 items-stretch">
      
      {/* COLONNE GAUCHE : RECAP FILTRES + SOLDE TOTAL */}
      <div className="col-span-12 md:col-span-2 flex flex-col gap-2 h-full">
        <div className="shrink-0 flex flex-col gap-1 px-3 py-2 bg-white/5 rounded-[var(--radius)] border border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-center">
            <span className="text-[9px] text-[var(--text-main)]/30 uppercase font-black tracking-tighter italic">
              {filters.profil}
            </span>
            <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          </div>
          <p className="text-[10px] text-[var(--text-main)] font-black truncate">
            {moisListe.find(m => m.v === filters.mois)?.l} {filters.annee}
          </p>
        </div>

        <div 
          className="flex-1 rounded-[var(--radius)] p-4 text-[var(--text-main)] shadow-xl flex flex-col justify-center transition-all duration-500"
          style={{ 
            background: `linear-gradient(135deg, ${userTheme.color_patrimoine || '#37b58f'} 0%, ${(userTheme.color_patrimoine || '#37b58f')}aa 100%)`,
            border: `1px solid ${(userTheme.color_patrimoine || '#37b58f')}33`,
            boxShadow: `0 8px 20px -5px rgba(0, 0, 0, 0.3)`
          }}
        >
          <p className="text-[var(--text-main)]/60 text-[8px] font-black uppercase tracking-widest mb-0.5">Solde Final Estimé</p>
          <h2 className="text-xl font-black tracking-tighter leading-none truncate">
        {soldeGlobalProjete.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
      </h2>
        </div>
      </div>

      {/* COLONNE DROITE : CONTENEUR DES COMPTES */}
      <div className="col-span-12 md:col-span-10 min-w-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* On garde soldesTries pour l'ordre du DnD, mais on affiche les données de comptesAvecSoldePrevu */}
          <SortableContext items={soldesPrevisionnels.map(c => c.compte)} strategy={horizontalListSortingStrategy}>
        <div className="flex gap-3 h-full pb-2 no-scrollbar cursor-grab active:cursor-grabbing">
          {soldesPrevisionnels.map(c => (
        <div key={c.compte} className="min-w-[160px] md:min-w-0 md:flex-1 h-full">
          {/* Ici on envoie l'objet 'c' complet qui contient le solde projeté */}
          <SortableAccountCard c={c} />
        </div>
      ))}
        </div>
      </SortableContext>
        </DndContext>
      </div>
          </div>
          
      {/* CONTENEUR PRINCIPAL : Divisé en 2 colonnes */}
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0 overflow-hidden p-2">

        {/* ================= COLONNE GAUCHE (75%) : ACTIONS & MODIFS ================= */}
        <div className="flex-[3] flex flex-col min-w-0 h-full">

          
          
          {/* 1. FORMULAIRE D'AJOUT */}
            <div className="grid grid-cols-12 gap-3 mb-6 p-4 bg-white/5 rounded-[var(--radius)] border border-white/10 backdrop-blur-md relative z-30 shadow-xl">

              {/* 1. Titre Stylisé - AJOUT DE col-span-12 ICI */}
              <div className="col-span-12 flex items-center justify-between mb-2 pb-3 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20">
                    <Plus size={14} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-[var(--text-main)] font-bold text-[13px] tracking-wide">Nouvelle Prévision</h3>
                    <p className="text-[9px] text-[var(--text-main)]/30 uppercase tracking-widest font-medium">Saisie express</p>
                  </div>
                </div>
                
                <div className="px-3 py-1 bg-[var(--primary)]/5 rounded-full border border-[var(--primary)]/10 text-[9px] text-[var(--bg-primary)]-300/50 font-bold tracking-widest italic uppercase">
                  ⚡ Auto-save Ready
                </div>
              </div>
                
            {/* DATE */}
            <div className="col-span-6 md:col-span-2">
              <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-black mb-1 block italic">Date</label>
              <div className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-[var(--radius)] px-3 py-2 h-[38px] focus-within:border-emerald-500/50 transition-all">
                <Calendar size={14} className="text-[var(--text-main)]/40" />
                <DatePicker
                  selected={newPrevi.date ? new Date(newPrevi.date) : null} 
                  onChange={(date) => setNewPrevi({ ...newPrevi, date: date })}
                  dateFormat="dd/MM/yyyy"
                  className="bg-transparent border-none outline-none text-[var(--text-main)] text-[11px] font-bold w-full cursor-pointer"
                />
              </div>
            </div>

            {/* NOM */}
            <div className="col-span-6 md:col-span-2">
              <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-black mb-1 block italic">Libellé</label>
              <input 
                type="text"
                placeholder="Ex: Salaire..."
                className="w-full h-[38px] bg-black/20 border border-white/10 rounded-[var(--radius)] px-4 py-2 text-[11px] text-[var(--text-main)] outline-none focus:border-emerald-500/50 transition-all font-bold"
                value={newPrevi.nom}
                onChange={e => setNewPrevi({...newPrevi, nom: e.target.value})}
              />
            </div>

            {/* MONTANT */}
            <div className="col-span-4 md:col-span-2">
              <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-black mb-1 block italic">Montant</label>
              <input 
                type="number"
                placeholder="0.00"
                className="w-full h-[38px] bg-black/20 border border-white/10 rounded-[var(--radius)] px-4 py-2 text-[11px] text-[var(--text-main)] outline-none focus:border-emerald-500/50 transition-all font-bold text-right"
                value={newPrevi.montant}
                onChange={e => setNewPrevi({...newPrevi, montant: e.target.value})}
              />
            </div>

            {/* CATÉGORIE */}
            <div className="col-span-4 md:col-span-2">
              <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-black mb-1 block italic">Catégorie</label>
              <CustomSelect 
                value={newPrevi.categorie}
                icon={Tag}
                options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                onChange={(val) => setNewPrevi({...newPrevi, categorie: val})}
              />
            </div>

            {/* COMPTE */}
            <div className="col-span-4 md:col-span-2">
              <label className="text-[9px] text-[var(--text-main)]/30 uppercase font-black mb-1 block italic">Compte</label>
              <CustomSelect 
                value={newPrevi.compte}
                icon={Wallet}
                options={optionsComptes}
                onChange={(val) => setNewPrevi({...newPrevi, compte: val})}
              />
            </div>

            {/* BOUTON AJOUTER */}
            <div className="col-span-12 md:col-span-2 flex items-end">
              <button 
                onClick={handleAddPrevision}
                className="w-full h-[38px] bg-[var(--primary)] transition-all hover:brightness-110 hover:saturate-200 text-[var(--text-main)] font-black text-[10px] uppercase rounded-[var(--radius)] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Ajouter</span>
                <div className="w-4 h-4 rounded-[var(--radius)] bg-white/20 flex items-center justify-center">+</div>
              </button>
            </div>
          </div>

        {/* 2. CONTENEUR DOUBLE : TABLEAU (GAUCHE) + GRAPHIQUE (DROITE) */}
        <div className="flex flex-row gap-6 flex-1 min-h-0">
          
          <div className="flex-[3] flex flex-col min-h-0 relative group">
            {/* Effet de lueur diffuse derrière le tableau */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/5 to-fuchsia-500/5 rounded-[var(--radius)] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>

            <div className="relative h-full flex flex-col bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[var(--radius)] shadow-2xl">
              
              {/* ZONE DE SCROLL INTERNE */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                <table className="w-full text-left border-separate border-spacing-y-2 relative z-10 table-fixed">
                  <thead className="sticky top-0 z-20 bg-[var(--bg-site)]">
                    <tr className="text-[9px] text-[var(--text-main)]/30 uppercase font-black italic">
                      <th className="px-4 py-3 w-12 text-center backdrop-blur-md bg-black/20">
                        <input 
                          type="checkbox"
                          checked={previsionsFiltrees.length > 0 && selectedIds2.length === previsionsFiltrees.length}
                          onChange={toggleAll2}
                          className="w-4 h-4 border-white/20 bg-white/5 text-emerald-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 w-[25%] backdrop-blur-md bg-black/20">Libellé</th>
                      <th className="px-4 py-3 w-[18%] backdrop-blur-md bg-black/20">Catégorie</th>
                      <th className="px-4 py-3 w-[18%] backdrop-blur-md bg-black/20">Compte</th>
                      <th className="px-4 py-3 w-[18%] text-right backdrop-blur-md bg-black/20">Montant</th>
                      <th className="px-4 py-3 w-[21%] text-right backdrop-blur-md bg-black/20">Date</th>
                    </tr>
                  </thead>

                  <tbody className="before:content-[''] before:block before:h-2">
                    {previsionsFiltrees.length > 0 ? (
                      previsionsFiltrees.map((prev) => {
                        const isSelected = selectedIds2.includes(prev.id);
                        const isTransfert = (prev.categorie?.includes("🔄") || (prev.nom && /\bVERS\b/.test(prev.nom.toUpperCase())));
                        
                        return (
                          <tr 
                            key={prev.id} 
                            className={`
                              group transition-all duration-300
                              ${isSelected 
                                ? 'bg-emerald-500/15 shadow-[inset_3px_0_0_0_#10b981]' 
                                : 'bg-white/[0.03] hover:bg-white/[0.08]'
                              }
                            `}
                          >
                            <td className="p-3 border-y border-l border-white/5 text-center">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect2(prev.id)}
                                className="w-4 h-4 border-white/20 bg-white/10 text-emerald-500 cursor-pointer"
                              />
                            </td>
                            
                            <td className="px-2 py-2 border-y border-white/5">
                              <input 
                                className="bg-white/[0.05] border border-white/10 focus:border-emerald-500/40 rounded-[var(--radius)] px-3 py-2 text-[11px] text-[var(--text-main)] font-black uppercase w-full outline-none transition-all"
                                defaultValue={prev.nom.replace('[PRÉVI] ', '')}
                                onBlur={(e) => updatePrevision(prev.id, 'nom', `[PRÉVI] ${e.target.value}`)}
                              />
                            </td>

                            <td className="px-2 py-2 border-y border-white/5 overflow-visible">
                              <CustomSelect value={prev.categorie} options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))} icon={Tag} onChange={(val) => updatePrevision(prev.id, 'categorie', val)} />
                            </td>

                            <td className="px-2 py-2 border-y border-white/5 overflow-visible">
                              <CustomSelect value={prev.compte} options={optionsComptes} icon={Wallet} onChange={(val) => updatePrevision(prev.id, 'compte', val)} />
                            </td>

                            <td className="px-2 py-2 border-y border-white/5">
                              <div className="flex items-center bg-white/[0.05] border border-white/10 rounded-[var(--radius)] px-3 py-2 transition-all duration-300 group-hover:bg-white/[0.08] group-hover:border-white/20">
                                <input 
                                  type="number"
                                  className="bg-transparent border-none outline-none text-right font-black w-full text-[13px] transition-all duration-300 group-hover:brightness-125 group-hover:saturate-150"
                                  style={{ 
                                    color: isTransfert 
                                      ? '#6d00fc' 
                                      : prev.montant > 0 
                                        ? `${userTheme.color_revenus}e6` 
                                        : `${userTheme.color_depenses}e6` 
                                  }}
                                  defaultValue={prev.montant}
                                  onBlur={(e) => updatePrevision(prev.id, 'montant', parseFloat(e.target.value))}
                                />
                                <span className="ml-1 text-[9px] font-bold opacity-20 italic" style={{ color: isTransfert ? '#6d00fc' : prev.montant > 0 ? userTheme.color_revenus : userTheme.color_depenses }}>€</span>
                              </div>
                            </td>

                            <td className="px-4 py-2 rounded-[var(--radius)] border-y border-r border-white/5 text-right relative overflow-visible group-focus-within:z-50">
                              <div className="inline-flex items-center gap-2 bg-white/[0.05] border border-white/10 rounded-[var(--radius)] px-3 py-2 focus-within:border-emerald-500/50 transition-all">
                                <Calendar size={12} className="text-[var(--text-main)]/30" />
                                <DatePicker
                                  selected={prev.date ? new Date(prev.date) : null}
                                  onChange={(date) => updatePrevision(prev.id, 'date', date)}
                                  dateFormat="dd/MM/yyyy"
                                  portalId="root" 
                                  className="bg-transparent border-none outline-none text-[10px] font-black text-[var(--text-main)] w-20 text-right cursor-pointer"
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      /* --- ÉTAT VIDE : SI AUCUNE PRÉVISION --- */
                      <tr>
                        <td colSpan="6" className="py-24">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-[var(--primary)]/20 blur-2xl rounded-full"></div>
                                <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
                                  <Calendar size={28} className="text-[var(--primary)]/40" />
                                </div>
                            </div>
                            <h3 className="text-[var(--text-main)] font-black text-[10px] uppercase tracking-[0.3em] opacity-50">
                              Calendrier de prévisions vide
                            </h3>
                            <p className="text-[var(--text-main)]/30 text-[9px] font-bold uppercase tracking-widest mt-3 leading-relaxed italic">
                              Aucun mouvement programmé pour cette période. 
                              <br/>Ajouter des prévisions pour anticiper vos dépenses.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* --- SOUS-BLOC GRAPHIQUE (35%) --- */}
          <div className="flex-1 flex flex-col bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[var(--radius)] shadow-2xl p-4 min-w-[300px]">
            <div className="flex items-center gap-2 mb-4 px-2">
              <PieChart size={14} className="text-[var(--text-main)]/40" />
              <h3 className="text-[10px] font-black text-[var(--text-main)]/40 uppercase tracking-widest italic">Analyse Prévue</h3>
            </div>
            
            <div className="flex-1">
              <PrevisionsChartView 
                data={chartDataPrevisions} 
                themeColor={userTheme.color_depenses} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= COLONNE DROITE (25% ou flexible) : RÉCAP ANNUEL PROJETÉ ================= */}
      <div className="flex-[1.2] min-w-[380px] flex flex-col bg-white/5 rounded-[var(--radius)] border border-white/10 backdrop-blur-2xl p-4 shadow-2xl relative overflow-hidden h-full">
      

        {/* SÉLECTEUR DE MOIS DYNAMIQUE */}
         {moisDisponibles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 p-3 bg-white/[0.02] rounded-2xl border border-white/5 backdrop-blur-md">
            <div className="w-full px-2 mb-2 flex justify-between items-center">
              <span className="text-[8px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em]">Masquer/Activer les prévisions</span>
              {excludedMonths.length > 0 && (
                <button 
                  onClick={() => setExcludedMonths([])}
                  className="text-[9px] font-black text-rose-500/50 hover:text-rose-500 uppercase transition-colors cursor-pointer"
                >
                  Tout réactiver
                </button>
              )}
            </div>
            
            {moisDisponibles.map(m => {
              const isVisible = !excludedMonths.includes(m);
              return (
                <button
                  key={m}
                  onClick={() => setExcludedMonths(prev => 
                    prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
                  )}
                  // On ajoute cursor-pointer, hover:scale, et des ombres dynamiques
                  className={`
                    relative px-3 py-1.5 rounded-xl text-[10px] font-black uppercase 
                    transition-all duration-200 cursor-pointer select-none
                    border active:scale-95
                    ${isVisible 
                      ? 'bg-white/10 border-white/20 text-[var(--text-main)] shadow-lg' 
                      : 'bg-black/20 border-white/5 text-[var(--text-main)]/20 opacity-40 hover:opacity-100'
                    }
                    hover:before:absolute hover:before:inset-0 hover:before:bg-white/5 hover:before:rounded-xl
                  `}
                  style={{
                    borderColor: isVisible ? `${userTheme.color_epargne}60` : '',
                    boxShadow: isVisible ? `0 4px 12px ${userTheme.color_epargne}30` : '',
                    // Au survol, on booste la luminosité via le style si besoin
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* Petit point indicateur d'état */}
                    <div 
                      className={`w-1.5 h-1.5 rounded-full transition-all ${isVisible ? 'scale-100' : 'scale-50 opacity-0'}`}
                      style={{ backgroundColor: userTheme.color_epargne }}
                    />
                    {m}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        
        {/* EN-TÊTE DU RÉCAP */}
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-[var(--radius)]">
              <TrendingUp size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-[0.2em] italic leading-none">Projections</h3>
              <p className="text-[8px] text-[var(--text-main)]/20 font-bold uppercase tracking-widest mt-1 italic">Année {filters.annee}</p>
            </div>
          </div>
        </div>

        {/* TABLEAU RÉCAPITULATIF PROJETÉ */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-0">
          
          {/* EN-TÊTE DES COLONNES */}
          <div className="grid grid-cols-5 px-4 mb-3">
            {['Mois', 'Revenus', 'Dépenses', 'Épargne', 'Cumul'].map((h) => (
              <span key={h} className="text-[8px] font-black uppercase tracking-widest text-[var(--text-main)]/20 last:text-right">
                {h}
              </span>
            ))}
          </div>

          {/* LISTE DES MOIS */}
          <div className="space-y-2">
          {/* Dans ton map du tableau de droite */}
            {recapPrevisionsStats.map((m, i) => {
              const isProjected = m.type === 'projeté';
              
              return (
                <div 
                  key={i} 
                  className={`
                    grid grid-cols-5 items-center px-4 py-4 rounded-[var(--radius)] border 
                    transition-all duration-300 group backdrop-blur-sm
                    ${isProjected 
                      ? 'bg-white/[0.03] border-white/5 shadow-inner hover:bg-white/[0.06] hover:border-white/10' 
                      : 'bg-white/[0.01] border-white/[0.02] opacity-50 hover:opacity-80'
                    }
                  `}
                >
                  {/* 1. MOIS & TYPE */}
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-tighter text-[var(--text-main)]/40 group-hover:text-[var(--text-main)]/60 transition-colors">
                      {m.nom}
                    </span>
                    <span className="text-[7px] uppercase font-bold text-[var(--text-main)]/10 italic group-hover:text-[var(--text-main)]/20">
                      {m.type}
                    </span>
                  </div>

                  {/* 2. REVENUS PROJETÉS (Dynamique) */}
                  <div 
                    className="text-[13px] font-black tracking-tighter transition-all duration-300 group-hover:brightness-125 group-hover:saturate-150"
                    style={{ color: m.revenus > 0 ? `${userTheme.color_revenus}e6` : 'rgba(255,255,255,0.1)' }}
                  >
                    {m.revenus > 0 ? `${m.revenus.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€` : '—'}
                  </div>

                  {/* 3. DÉPENSES PROJETÉES (Dynamique) */}
                  <div 
                    className="text-[13px] font-black tracking-tighter transition-all duration-300 group-hover:brightness-125 group-hover:saturate-150"
                    style={{ color: m.depenses > 0 ? `${userTheme.color_depenses}e6` : 'rgba(255,255,255,0.1)' }}
                  >
                    {m.depenses > 0 ? `-${m.depenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€` : '—'}
                  </div>

                  {/* 4. ÉPARGNE / BALANCE (Badge Dynamique) */}
                  <div>
                    <span 
                      className="inline-block px-2 py-0.5 rounded-lg text-[13px] font-black transition-all duration-300 group-hover:scale-110 group-hover:brightness-110"
                      style={{ 
                        // Fond à 15% d'opacité, texte plein, et bordure à 20% d'opacité
                        backgroundColor: `${userTheme.color_epargne}15`,
                        color: userTheme.color_epargne,
                        border: `1px solid ${userTheme.color_epargne}20`
                      }}
                    >
                      {m.epargne !== 0 ? `${m.epargne > 0 ? '+' : ''}${Math.round(m.epargne)}€` : '0€'}
                    </span>
                  </div>

                  {/* 5. SOLDE TOTAL (CUMUL) */}
                  <div className="text-right">
                    <div 
                      className={`text-[15px] font-black tracking-tighter transition-all duration-500 ${isProjected ? '' : 'text-[var(--text-main)]/20'}`}
                      style={{ 
                        color: isProjected ? userTheme.color_revenus : undefined,
                        textShadow: isProjected ? `0 0 15px ${userTheme.color_patrimoine}30` : 'none'
                      }}
                    >
                      {m.soldeTotal?.toLocaleString('fr-FR')}
                      <span className="text-[10px] ml-0.5 opacity-50">€</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      {/* TOTAL FINAL EN BAS - PROJECTION FIN D'ANNÉE */}
      <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-[var(--radius)]">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-500/40 uppercase italic tracking-widest">
              Résultat projeté fin {filters.annee}
            </span>
            <span className="text-xl font-black text-[var(--text-main)] tracking-tighter">
              {/* On va chercher le dernier mois du tableau de prévisions */}
              {recapPrevisionsStats && recapPrevisionsStats.length > 0 
                ? `${recapPrevisionsStats[recapPrevisionsStats.length - 1].soldeTotal?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€`
                : "0.00€"
              }
            </span>
          </div>
          
          {/* Petit badge indicateur de tendance */}
          <div className="h-6 w-6 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-black text-[var(--text-main)]/40 italic">
            {Math.round(((recapPrevisionsStats[11]?.soldeTotal / recapPrevisionsStats[0]?.soldeTotal) - 1) * 100)}%
          </div>
        </div>
      </div>
      </div>
      </div>
        </div>
      )}



  {activeTab === 'gerer' && (
  <div className="animate-in fade-in duration-500 h-[calc(100vh-120px)] overflow-hidden flex flex-col px-4">

     {/* ZONE DE NOTIFICATION GLOBALE (Portée par le body) */}
      {lastLearned && (
        <div className="fixed top-6 right-6 z-[9999] w-80 animate-in fade-in slide-in-from-right-8 duration-300">
          <div className="bg-[#121212] border border-white/10 rounded-[1.5rem] p-4 shadow-2xl shadow-[var(--primary)]/20 backdrop-blur-xl relative overflow-hidden group">
            
            {/* Barre de progression de disparition (optionnelle mais sexy) */}
            <div className="absolute bottom-0 left-0 h-[2px] bg-[var(--primary)] animate-[shimmer_4s_linear_forwards]" style={{ width: '100%' }} />

            <div className="flex items-start gap-4">
              {/* Icône avec effet de halo */}
              <div className="relative shrink-0">
                <div className="absolute inset-0 bg-[var(--primary)]/20 blur-lg rounded-full" />
                <div className="relative bg-[var(--primary)]/20 p-2.5 rounded-xl border border-[var(--primary)]/40">
                  <Brain size={16} className="text-[var(--primary)]" />
                </div>
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--primary)]">
                    Mémoire mise à jour
                  </span>
                  <button onClick={() => setLastLearned(null)} className="text-[var(--text-main)]/20 hover:text-[var(--text-main)] transition-colors">
                    <X size={12} />
                  </button>
                </div>
                
                <p className="text-[12px] text-[var(--text-main)] font-bold truncate pr-2">
                  {lastLearned.transaction}
                </p>
                
                <div className="flex items-center gap-2 mt-1">
                  <div className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                    <span className="text-[15px] text-[var(--text-main)]/40 font-medium italic">
                      Cible : <span className="text-[var(--text-main)]/70 font-bold not-italic">{lastLearned.categorie}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    
    {/* HEADER */}
    <div className="mb-6 px-2 shrink-0">
      <h1 className="text-2xl font-black text-[var(--text-main)] tracking-tight">Historique & Gestion</h1>
      <p className="text-[var(--text-main)]/40 text-[11px] font-bold uppercase tracking-widest italic">Contrôle total de vos flux financiers</p>
    </div>

      {/* LA GRILLE PRINCIPALE */}
      {/* Change grid-cols-17 en grid-cols-1 pour mobile, et lg:grid-cols-17 pour PC */}
        <div className="grid grid-cols-1 lg:grid-cols-17 gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">

        {/* 3. BARRE DE GESTION LEXIQUE (Droite) */}
      <div className="col-span-1 lg:col-span-4 flex flex-col gap-4 order-2 lg:order-1">
        <div className="z-[1000] bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[var(--radius)] shrink-0">
    
    {/* HEADER AVEC BOUTON LISTE FLOTTANT */}
    <div className="flex items-center justify-between mb-6 relative">
      <div>
        <h3 className="text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
          Catégories Personnalisées
        </h3>
        <p className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase">Ajouter une categorie</p>
      </div>

      
    </div>

    {/* BLOC D'AJOUT (Toujours visible car c'est l'action principale) */}
    <div className="bg-black/40 border border-white/5 rounded-[1.5rem] p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <button 
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl text-2xl hover:bg-white/10 transition-all flex items-center justify-center"
          >
            {newIcon}
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-14 left-0 z-50">
              <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative">
                <EmojiPicker 
                  onEmojiClick={onEmojiClick}
                  theme={Theme.DARK}
                  emojiStyle="native"
                  width={280}
                  height={350}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </div>
          )}
        </div>

        <input 
          type="text" 
          id="catInput"
          placeholder="Nouvel intitulé..." 
          className="flex-1 bg-transparent text-[var(--text-main)] text-sm font-medium outline-none placeholder:text-[var(--text-main)]/10"
          onKeyDown={(e) => {
            if(e.key === 'Enter' && e.target.value.trim()) {
              addCategory(`${newIcon} ${e.target.value.trim()}`);
              e.target.value = '';
            }
          }}
        />
      </div>

      <button 
        onClick={() => {
          const input = document.getElementById('catInput');
          if(input.value.trim()) {
            addCategory(`${newIcon} ${input.value.trim()}`);
            input.value = '';
          }
        }}
        className="w-full bg-[var(--primary)] hover:bg-indigo-600 text-[var(--text-main)] text-[10px] font-black py-3 rounded-xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
      >
        <Plus size={14} /> Créer
      </button>
    </div>

      {/* BARRE D'OUTILS LEXIQUE (Sous le bloc d'ajout) */}
      <div className="mt-4 px-1 flex items-center  justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-4">
          {/* INDICATEUR ET BOUTON GESTION */}
          <button 
            onClick={() => setShowListPopover(!showListPopover)}
            className="flex items-center gap-2 group transition-all"
          >
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center z-10 group-hover:bg-[var(--primary)]/20 transition-colors">
                <Settings2 size={11} className="text-[var(--primary)]" />
              </div>
              
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/40 group-hover:text-[var(--text-main)] transition-colors">
              Gérer mes catégories
            </span>
          </button>
        </div>

        {/* COMPTEURS EMPILÉS */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-[var(--text-main)]/40 uppercase ">Visibles</span>
            <span className="text-[10px] font-bold text-emerald-500/60 leading-none">
              {toutesLesCategories.length - masquees.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-[var(--text-main)]/40 uppercase">Personnelles</span>
            <span className="text-[10px] font-bold text-[var(--primary)]/60 leading-none">
              {categoriesPerso.length}
            </span>
          </div>
        </div>
      </div>

      {/* LE POPOVER (Positionné par rapport à cette barre) */}
      {showListPopover && (
        <>
          {/* 1. L'OVERLAY : Placé en "fixed" pour couvrir TOUT l'écran, peu importe les parents */}
          <div 
            className="fixed inset-0 bg-black/5 z-[1000]" 
            onClick={() => setShowListPopover(false)} 
          />

          {/* 2. LE CONTENEUR DU MENU : Lui aussi en fixed ou absolute très haut en z-index */}
          <div className="relative">
            <div 
              className="absolute left-0 right-0 top-2 z-[1000] bg-[#121212] border border-white/10 rounded-[1.5rem] shadow-2xl p-4 animate-in slide-in-from-top-2 duration-200"
              onClick={(e) => e.stopPropagation()} // Empêche la fermeture quand on clique dedans
            >
              {/* HEADER DU POPOVER */}
              <div className="flex items-center justify-between mb-4 px-2">
                <h4 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">Configuration</h4>
                <button onClick={() => setShowListPopover(false)} className="text-[var(--text-main)]/20 hover:text-[var(--text-main)]">
                  <X size={14} />
                </button>
              </div>

              {/* LISTE TRIÉE */}
              <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {[...toutesLesCategories]
                  .sort((a, b) => {
                    const aEstPerso = categoriesPerso.includes(a);
                    const bEstPerso = categoriesPerso.includes(b);
                    if (aEstPerso && !bEstPerso) return -1;
                    if (!aEstPerso && bEstPerso) return 1;
                    return a.localeCompare(b);
                  })
                  .map(cat => {
                    const estMasquee = masquees.includes(cat);
                    const estPerso = categoriesPerso.includes(cat);
                    
                    return (
                      <div key={cat} className={`group flex items-center justify-between p-2 rounded-xl transition-all ${estMasquee ? 'bg-black/20 opacity-40' : 'bg-white/[0.03] hover:bg-white/[0.06]'}`}>
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold ${estMasquee ? 'text-[var(--text-main)]/20' : 'text-[var(--text-main)]/60'}`}>
                            {cat}
                          </span>
                          {estPerso ? (
                              <span className="text-[7px] bg-[var(--primary)]/10 text-[var(--primary)]/80 px-1.5 py-0.5 rounded-md uppercase font-black tracking-tighter border border-[var(--primary)]/20">Perso</span>
                          ) : (
                              <span className="text-[7px] bg-white/5 text-[var(--text-main)]/60 px-1.5 py-0.5 rounded-md uppercase font-black tracking-tighter border border-white/5">Défaut</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => toggleVisibility(cat)}
                            className={`p-1.5 rounded-lg ${estMasquee ? 'text-rose-500' : 'text-[var(--text-main)]/20 hover:text-emerald-400'}`}
                          >
                            {estMasquee ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          {estPerso && (
                            <button onClick={() => removeCategory(cat)} className="p-1.5 rounded-lg text-[var(--text-main)]/20 hover:text-rose-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* BOUTON RESET */}
              {masquees.length > 0 && (
                <button 
                  onClick={() => {
                    setMasquees([]);
                    // ... ton fetch reset ...
                  }}
                  className="w-full mt-4 py-2 text-[9px] font-black uppercase text-[var(--text-main)]/20 hover:text-[var(--text-main)] border-t border-white/5"
                >
                  Réinitialiser la visibilité
                </button>
              )}
            </div>
          </div>
        </>
      )}

        </div>

      {/* 4. BLOC GESTION DES BUDGETS (Sous le Lexique) */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[var(--radius)] flex flex-col">
          
          {/* HEADER BUDGET */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-[var(--text-main)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <Target size={14} className="text-[var(--primary)]" /> Objectifs Budget
              </h3>
              <p className="text-[9px] text-[var(--text-main)]/20 font-bold uppercase tracking-tighter">Définir vos limites par catégorie</p>
            </div>
            <div className="px-2 py-1 bg-[var(--primary)]/10 rounded-md border border-[var(--primary)]/20">
              <span className="text-[10px] font-mono font-bold text-[var(--primary)]">
                {budgets.length}
              </span>
            </div>
          </div>

        {/* FORMULAIRE D'AJOUT RAPIDE AVEC COMPTE ET MOIS */}
        <div className="bg-black/40 border border-white/5 rounded-2xl p-3 space-y-2">
          
          {/* 1. Ligne Compte & Mois */}
          <div className="grid grid-cols-2 gap-2">
            <CustomSelect 
              label="Compte associé"
              value={formBudget.compte || 'tous'}
              icon={Search}
              options={[
                { v: 'tous', l: 'Tous les comptes' },
                ...soldesTries.map(s => ({ v: s.compte, l: s.compte }))
              ]}
              onChange={(val) => setFormBudget({...formBudget, compte: val})}
            />
            
            <CustomSelect 
              label="Mois du budget"
              value={formBudget.mois || filters.mois} // Par défaut le mois du filtre
              icon={Calendar}
              options={moisListe}
              onChange={(val) => setFormBudget({...formBudget, mois: val})}
            />
          </div>

        <div className="grid grid-cols-12 gap-2 items-end"> {/* items-end aligne les blocs par le bas */}
            {/* 2. Sélection de la Catégorie (8 colonnes) */}
            <div className="col-span-8">
              <CustomSelect 
                label="Catégorie"
                value={formBudget.nom}
                icon={Tag}
                options={toutesLesCategories
                  .filter(c => !masquees.includes(c))
                  .map(cat => ({ v: cat, l: cat }))
                }
                onChange={(val) => setFormBudget({...formBudget, nom: val})}
              />
            </div>

            {/* 3. Champ Somme - On utilise h-full pour qu'il s'adapte ou une hauteur fixe si nécessaire */}
            <div className="col-span-4 bg-white/5 rounded-xl border border-white/10 px-3 flex items-center h-[38px] mb-[1px]"> 
              {/* mb-[1px] est une petite astuce si ton CustomSelect a une bordure qui décale l'alignement */}
              <div className="flex flex-col w-full">
                <label className="block text-[6px] uppercase font-black text-[var(--text-main)]/20 leading-none mb-1">Budget</label>
                <div className="flex items-center">
                  <input 
                    type="number"
                    placeholder="0"
                    value={formBudget.somme}
                    onChange={(e) => setFormBudget({...formBudget, somme: e.target.value})}
                    className="w-full bg-transparent text-[var(--text-main)] text-[11px] font-mono font-bold outline-none placeholder:text-[var(--text-main)]/10"
                  />
                  <span className="text-[9px] font-bold text-[var(--text-main)]/20 ml-1">€</span>
                </div>
              </div>
            </div>
        </div>

          <button 
            onClick={handleAddBudget}
            className="w-full mt-1 py-2.5 bg-[var(--primary)] hover:bg-indigo-600 text-[var(--text-main)] text-[9px] font-black uppercase tracking-[0.2em] rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--primary)]/20 active:scale-[0.98]"
          >
            <Plus size={14} strokeWidth={3} /> Fixer le budget
          </button>
        </div>
       {/* RÉCAPITULATIF DES BUDGETS (CORRIGÉ) */}
        <div className="relative mt-2">
          <button 
            onClick={() => setShowBudgetDetails(!showBudgetDetails)}
            className="w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg group-hover:bg-[var(--primary)]/20 transition-colors">
                <Activity size={14} className="text-[var(--primary)]" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest">Suivi Budgets</p>
                <p className="text-[9px] text-[var(--text-main)]/40 font-bold uppercase">
                  {budgets.length} objectifs en cours
                </p>
              </div>
            </div>
            <ChevronRight size={14} className={`text-[var(--text-main)]/20 transition-transform ${showBudgetDetails ? 'rotate-90' : ''}`} />
          </button>

          {showBudgetDetails && (
            <>
              <div className="fixed inset-0 z-[90]" onClick={() => { setShowBudgetDetails(false); setEditingBudget(null); }} />
              <div className="absolute bottom-full mb-3 left-0 right-0 z-[91] bg-[#121214] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 animate-in fade-in zoom-in-95 duration-200 origin-bottom">
                
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                  <h4 className="text-[10px] font-black uppercase text-[var(--primary)] tracking-widest">Détails des budgets</h4>
                  <button onClick={() => { setShowBudgetDetails(false); setEditingBudget(null); }} className="text-[var(--text-main)]/20 hover:text-[var(--text-main)] transition-colors">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-5 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {budgets.length === 0 ? (
                    <p className="text-[10px] text-center py-6 text-[var(--text-main)]/20 font-bold uppercase italic">Aucun budget défini</p>
                  ) : (
                    [...budgets]
                      .sort((a, b) => b.mois.localeCompare(a.mois))
                      .map((b) => {
                        const depenseReelle = toutesLesTransactions
                          .filter(t => 
                            t.categorie === b.nom && 
                            t.compte === b.compte && 
                            t.mois === b.mois 
                          )
                          .reduce((acc, t) => acc + Math.abs(t.montant), 0);

                        const pourcentage = Math.min((depenseReelle / b.somme) * 100, 100);
                        const estDepasse = depenseReelle > b.somme;

                        // --- CLÉ UNIQUE IDENTIQUE POUR LA VÉRIFICATION ET LE CLIC ---
                        const uniqueKey = b.id || `${b.nom}-${b.compte}-${b.mois}`;
                        const isEditing = editingBudget && editingBudget.id_ref === uniqueKey;

                        return (
                          <div key={uniqueKey} className="group relative">
                            {isEditing ? (
                              /* --- VUE ÉDITION --- */
                              <div className="bg-white/5 p-3 rounded-xl border border-[var(--primary)]/30 animate-in zoom-in-95 duration-200">
                                <div className="flex flex-col gap-2">
                                  <input 
                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                                    value={editingBudget.nom}
                                    onChange={e => setEditingBudget({...editingBudget, nom: e.target.value})}
                                    autoFocus
                                  />
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="number"
                                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                                      value={editingBudget.somme}
                                      onChange={e => setEditingBudget({...editingBudget, somme: e.target.value})}
                                    />
                                    <button 
                                      onClick={() => handleUpdateBudget(editingBudget, b.nom)}
                                      className="p-2 bg-[var(--primary)] text-[var(--text-main)] rounded-lg hover:scale-105 transition-all"
                                    >
                                      <Check size={12} />
                                    </button>
                                    <button 
                                      onClick={() => setEditingBudget(null)}
                                      className="p-2 bg-white/5 text-[var(--text-main)]/50 rounded-lg hover:bg-white/10"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* --- VUE AFFICHAGE --- */
                              <div className="group/item py-1">
                                <div className="flex justify-between items-start mb-1">
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-[var(--text-main)]/90 leading-tight">{b.nom}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[7px] px-1.2 py-0.2 bg-white/5 rounded text-[var(--text-main)]/30 font-bold uppercase tracking-tighter border border-white/5">
                                        {b.compte}
                                      </span>
                                      <span className="text-[7px] text-[var(--primary)]/50 font-black uppercase tracking-tighter">
                                        {b.mois}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-mono font-bold ${estDepasse ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      {depenseReelle.toFixed(0)}€<span className="text-[var(--text-main)]/20 mx-0.5">/</span>{b.somme}€
                                    </span>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => setEditingBudget({...b, id_ref: uniqueKey})}
                                        className="p-1 text-[var(--text-main)]/20 hover:text-blue-400 transition-colors"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                      <button 
                                        onClick={() => confirmDelete2(b)} // On passe 'b' (l'objet) et pas juste 'b.nom'
                                        className="p-1 text-[var(--text-main)]/20 hover:text-rose-500 transition-colors"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                  <div 
                                    className={`absolute left-0 top-0 h-full transition-all duration-1000 ${estDepasse ? 'bg-rose-500' : 'bg-[var(--primary)]'}`}
                                    style={{ width: `${pourcentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        </div>

              </div>







                
              
                    {/* 1. BARRE LATÉRALE DE FILTRES */}
                    <div className="col-span-1 lg:col-span-3 order-1 lg:order-0">
                      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-[var(--radius)] flex flex-col shadow-2xl overflow-hidden">
                  
                  {/* --- BLOC HAUT : FILTRES --- */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Filter size={14} className="text-[var(--primary)]" />
                              <h3 className="text-[var(--text-main)] text-xs font-black uppercase tracking-widest">Filtrer</h3>
                            </div>
                    
                    <div className="space-y-3">
                      <CustomSelect 
                        label="Profil cible"
                        value={filters.profil}
                        icon={User}
                        options={['Tous', ...new Set(comptes.map(c => c.groupe))].map(p => ({ v: p, l: p }))}
                        onChange={(val) => setFilters({...filters, profil: val})}
                      />

                      <CustomSelect 
                        label="Compte bancaire"
                        value={selectedCompte}
                        icon={Search}
                        options={[
                          { v: 'tous', l: 'Tous les comptes' },
                          ...soldesTries.map(s => ({ v: s.compte, l: s.compte }))
                        ]}
                        onChange={(val) => setSelectedCompte(val)}
                      />

                      {/* Mois et Année côte à côte pour optimiser l'espace vertical */}
                    
                        <CustomSelect 
                          label="Mois"
                          value={filters.mois}
                          icon={Calendar}
                          options={moisListe}
                          onChange={(val) => setFilters({...filters, mois: val})}
                        />

                        <CustomSelect 
                          label="Année"
                          value={filters.annee}
                          icon={Calendar1}
                          options={[...new Set(availablePeriods.map(p => p.annee))]
                            .sort((a, b) => b - a)
                            .map(year => ({ v: year, l: year.toString() }))
                          }
                          onChange={(val) => setFilters({...filters, annee: val})}
                        />
                      
                    </div>
                  </div>

                  {/* PREMIER RESSORT : Absorbe le vide sur les écrans > 1080p */}


                  {/* --- BLOC MILIEU : QUICK STATUS --- */}
                  <div className="py-4 border-y border-white/5">
                      <div className="flex items-center justify-between mb-3 px-1">
                        <p className="text-[9px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.2em]">Résumé Mensuel</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${statsFiltrées.solde >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {statsFiltrées.solde >= 0 ? 'Excédent' : 'Déficit'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase">Entrées</span>
                          </div>
                          <p className="text-[14px] font-mono font-black text-emerald-400 truncate">
                            {statsFiltrées.revenus.toLocaleString('fr-FR')}€
                          </p>
                        </div>

                        <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/5">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-1 h-1 rounded-full bg-rose-500" />
                            <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase">Sorties</span>
                          </div>
                          <p className="text-[14px] font-mono font-black text-rose-400 truncate">
                            {statsFiltrées.depenses.toLocaleString('fr-FR')}€
                          </p>
                        </div>
                      </div>

                      {/* Barre de progression visuelle */}
                      <div className="mt-4 px-1">
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-700"
                            style={{ width: `${(statsFiltrées.revenus / (statsFiltrées.revenus + statsFiltrées.depenses || 1)) * 100}%` }}
                          />
                          <div 
                            className="h-full bg-rose-500/30 transition-all duration-700"
                            style={{ width: `${(statsFiltrées.depenses / (statsFiltrées.revenus + statsFiltrées.depenses || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                  </div>

                  {/* DEUXIÈME RESSORT : Maintient l'équidistance en 4K */}
                  

                  {/* --- BLOC BAS : MÉMOIRE --- */}
                  <div className="pt-4">
                    <div className="flex items-center gap-2 mb-1"> {/* Réduit le mb-3 en mb-1 pour coller au texte */}
                      <Database size={12} className="text-[var(--primary)]/50" />
                      <span className="text-[10px] font-black text-[var(--text-main)]/20 uppercase tracking-[0.15em]">Apprentissage</span>
                    </div>

                    {/* TEXTE EXPLICATIF RÉINSÉRÉ */}
                    <p className="text-[9px] text-[var(--text-main)]/50 leading-relaxed mb-3">
                      Mémorise tes habitudes pour catégoriser automatiquement tes prochaines transactions que tu importera un CSV.
                    </p>

                    <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-2xl border border-white/10 hover:bg-white/5 transition-all group">
                      <div className="p-2 bg-[var(--primary)]/10 rounded-xl group-hover:scale-110 transition-transform">
                        <Brain size={18} className="text-[var(--primary)]" />
                      </div>
                      <div className="flex flex-col flex-1">
                        <span className="text-[11px] font-black text-[var(--text-main)] uppercase leading-none">Apprentissage</span>
                        <span className="text-[9px] text-[var(--text-main)]/30 font-bold uppercase mt-1">
                          {isApprendreActive ? "Activé" : "Désactivé"}
                        </span>
                      </div>
                      
                      <button 
                        onClick={() => setIsApprendreActive(!isApprendreActive)}
                        className={`w-10 h-5 rounded-full transition-all relative ${isApprendreActive ? 'bg-[var(--primary)] shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'bg-white/10'}`}
                      >
                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all duration-300 ${isApprendreActive ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
              </div>
                </div>
              </div>



            {/* 2. ZONE DE DROITE */}
            <div className="col-span-12 lg:col-span-10 flex flex-col h-full min-h-0">
              {/* h-[calc(100vh-120px)] : On prend toute la hauteur moins la marge du haut/header */}

             <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-[var(--radius)] shrink-0">

              {/* 1. Titre Stylisé (Maintenant à l'intérieur) */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--primary)]/10 rounded-lg border border-[var(--primary)]/20">
                      <Plus size={14} className="text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="text-[var(--text-main)] font-bold text-[13px] tracking-wide">Nouvelle Transaction</h3>
                      <p className="text-[9px] text-[var(--text-main)]/30 uppercase tracking-widest font-medium">Saisie express</p>
                    </div>
                  </div>
                  
                  <div className="px-3 py-1 bg-[var(--primary)]/5 rounded-full border border-[var(--primary)]/10 text-[9px] text-indigo-300/50 font-bold tracking-widest italic uppercase">
                    ⚡ Auto-save Ready
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
              
                  {/* 1. NOM & MONTANT */}
                  <div className="flex-[2] min-w-[200px] flex items-center gap-2 px-4 py-2 bg-black/20 rounded-2xl border border-white/5">
                    <input 
                      type="text" 
                      id="quick-nom"
                      placeholder="Libellé..." 
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-bold w-full placeholder:text-[var(--text-main)]/10"
                    />
                    <div className="w-[1px] h-4 bg-white/10 mx-2" />
                    <input 
                      type="number" 
                      id="quick-montant"
                      placeholder="0.00" 
                      className="bg-transparent border-none outline-none text-[var(--text-main)] text-[13px] font-mono font-bold w-20 text-right placeholder:text-[var(--text-main)]/10"
                    />
                    <span className="text-[var(--text-main)]/20 font-bold text-xs">€</span>
                  </div>

                  {/* 2. COMPTE (Réutilise ton style) */}
                  <div className="w-40">
                    <CustomSelect 
                      value={newTx.compte}
                      icon={CreditCard}
                      options={soldesTries.map(s => ({ v: s.compte, l: s.compte }))}
                      onChange={(val) => setNewTx({...newTx, compte: val})}
                    />
                  </div>

                  {/* 3. CATÉGORIE */}
                  <div className="w-48">
                    <CustomSelect 
                      value={newTx.categorie}
                      icon={Tag}
                      options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                      onChange={(val) => setNewTx({...newTx, categorie: val})}
                    />
                  </div>

                  {/* 4. DATE PICKER STYLISÉ */}
                <div className="w-40 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/5 hover:border-[var(--primary)]/30 transition-all relative">
                  <Calendar size={14} className="text-[var(--primary)]" />
                  <DatePicker
                    selected={selectedDate}
                    onChange={(date) => setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="bg-transparent border-none outline-none text-[var(--text-main)] text-[12px] font-bold w-full cursor-pointer"
                    calendarClassName="custom-calendar-dark" // On pourra le styliser en CSS
                  />
                </div>

                  {/* BOUTON VALIDER */}
                  <button 
                    onClick={submitQuickTransaction}
                    className="ml-auto bg-[var(--primary)] hover:bg-indigo-600 text-[var(--text-main)] p-3 rounded-2xl transition-all shadow-lg shadow-[var(--primary)]/20 active:scale-95 group"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
            </div>
                              
              <div className="bg-white/5 border border-white/10 rounded-[var(--radius)] flex flex-col flex-1 min-h-0 overflow-hidden">

            {/* RAPPEL DES FILTRES (Affichage uniquement) */}
            <div className="px-4 py-3 shrink-0 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              
              {/* BLOC GAUCHE : Indicateur + Filtres */}
              <div className="flex items-center">
                {/* Indicateur de contexte : on utilise une bordure droite simple */}
                <div className="flex items-center gap-2 border-r border-white/10 pr-6 mr-6">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/30">Vue active</span>
                </div>

                {/* Filtres : on utilise gap-0 pour maîtriser l'espace via les paddings des enfants */}
                <div className="flex items-center divide-x divide-white/10">
                  {/* Filtre Profil */}
                  <div className="flex items-center gap-2 pr-6"> {/* Padding à droite seulement pour le premier */}
                    <User size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-bold text-indigo-100/60 uppercase tracking-tight">
                      {filters.profil}
                    </span>
                  </div>

                  {/* Filtre Compte */}
                  <div className="flex items-center gap-2 px-6"> {/* Padding gauche ET droite pour centrer la barre */}
                    <Search size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-bold text-indigo-100/60 uppercase tracking-tight">
                      {selectedCompte === 'tous' ? 'Tous les comptes' : selectedCompte}
                    </span>
                  </div>

                  {/* Filtre Période */}
                  <div className="flex items-center gap-2 pl-6"> {/* Padding à gauche seulement pour le dernier */}
                    <Calendar size={10} className="text-[var(--text-main)]/20" />
                    <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-tighter">
                      {filters.mois} {filters.annee}
                    </span>
                  </div>
                </div>
              </div>

              {/* BLOC DROITE : Compteur */}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                <span className="text-[9px] font-black text-[var(--primary)]">{transactionsAAfficher.length}</span>
                <span className="text-[9px] font-medium text-[var(--text-main)]/30 uppercase tracking-widest">Résultats</span>
              </div>
            </div>



                
                
{/* Conteneur de scroll interne */}
<div className="flex-1 overflow-auto custom-scrollbar">
  <table className="w-full text-left border-separate border-spacing-0">
    <thead>
      <tr className="bg-[var(--bg-site)] sticky top-0 z-40 border-b border-white/10 shadow-sm">
        <th className="p-4 w-12 border-b border-white/10">
          <div className="flex items-center justify-center">
            <input 
              type="checkbox"
              checked={transactionsAAfficher.length > 0 && selectedIds.length === transactionsAAfficher.length}
              onChange={toggleAll}
              ref={(el) => {
                if (el) {
                  el.indeterminate = selectedIds.length > 0 && selectedIds.length < transactionsAAfficher.length;
                }
              }}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--primary)] focus:ring-[var(--primary)]/50 cursor-pointer"
            />
          </div>
        </th>

        <th className="p-4 w-20 cursor-pointer hover:bg-white/5" onClick={() => handleSort('jour')}>
          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-main)]/40 uppercase">
            Date {sortConfig.key === 'jour' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
          </div>
        </th>
        
        <th className="p-4 w-[300px] cursor-pointer hover:bg-white/5" onClick={() => handleSort('nom')}>
          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-main)]/40 uppercase">
            Transaction {sortConfig.key === 'nom' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
          </div>
        </th>

        <th className="p-4 w-32 cursor-pointer hover:bg-white/5 text-right" onClick={() => handleSort('montant')}>
          <div className="flex items-center justify-end gap-2 text-[10px] font-black text-[var(--text-main)]/40 uppercase">
            Montant {sortConfig.key === 'montant' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
          </div>
        </th>

        <th className="p-4 hidden md:table-cell w-44 cursor-pointer hover:bg-white/5" onClick={() => handleSort('categorie')}>
          <div className="flex items-center gap-2 text-[10px] font-black text-[var(--text-main)]/40 uppercase">
            Catégorie {sortConfig.key === 'categorie' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : <ArrowUpDown size={12} />}
          </div>
        </th>
        <th className="p-4 w-32 text-[10px] font-black text-[var(--text-main)]/40 uppercase">Mois Affecté</th>
      </tr>
    </thead>

    <tbody 
      key={`${sortConfig.key}-${sortConfig.direction}`} 
      className="divide-y divide-white/5"
    >
      {transactionsAAfficher.length > 0 ? (
        transactionsAAfficher.map((t) => {
          const isSelected = selectedIds.includes(t.id);
          return (
            <tr 
              key={t.id} 
              className={`group transition-all duration-300 ${
                isSelected 
                  ? 'bg-[var(--primary)]/10 shadow-[inset_3px_0_0_0_#6366f1]' 
                  : 'hover:bg-white/[0.03]'
              }`}
            >
              <td className="p-4 w-12 border-b border-white/[0.05]">
                <div className="flex items-center justify-center">
                  <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(t.id)}
                    className={`w-4 h-4 rounded border-white/20 bg-white/5 text-[var(--primary)] transition-all cursor-pointer ${
                      isSelected ? 'scale-110 shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'scale-100'
                    }`}
                  />
                </div>
              </td>

              <td className="p-4 border-b border-white/[0.05]">
                <div className="pointer-events-none">
                  <CustomBadgeDate t={t} />
                </div>
              </td>

              <td className="p-4 pr-0 group/name border-b border-white/[0.05] max-w-[300px]">
                <div className={`flex flex-col border-l-4 transition-all pl-3 py-1 ${
                  (t.categorie && t.categorie.includes("🔄 Virement")) 
                    ? "border-[var(--primary)]/50 group-hover/name:border-[var(--primary)]" 
                    : parseFloat(t.montant) > 0 
                      ? "border-emerald-500/50 group-hover/name:border-emerald-400" 
                      : "border-rose-500/50 group-hover/name:border-rose-400"
                }`}>
                  <div className="flex items-start gap-2">
                    <textarea
                      rows="1"
                      defaultValue={t.nom}
                      onBlur={(e) => updateCell(t.id, 'nom', e.target.value)}
                      onInput={handleInput}
                      ref={(el) => {
                        if (el) {
                          el.style.height = "auto";
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.target.blur();
                        }
                      }}
                      className="bg-white/[0.03] border border-white/5 text-[13px] leading-tight font-bold text-[var(--text-main)] outline-none w-full resize-none overflow-hidden py-1.5 px-2 rounded-lg transition-all hover:bg-white/[0.07] hover:border-white/10 focus:bg-[var(--primary)]/10 focus:border-[var(--primary)]/30 focus:ring-1 focus:ring-[var(--primary)]/20"
                      placeholder="Modifier le libellé..."
                    />
                    <div className="mt-2 shrink-0">
                      <Pencil size={12} className="text-[var(--text-main)]/10 group-hover/name:text-[var(--text-main)]/40 transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 ml-1">
                    <span className="text-[9px] text-[var(--text-main)]/20 uppercase font-black tracking-tighter">{t.compte}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest ${
                      (t.categorie && t.categorie.includes("🔄 Virement"))
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]/70"
                        : parseFloat(t.montant) > 0 ? "bg-emerald-500/10 text-emerald-400/70" : "bg-rose-500/10 text-rose-400/70"
                    }`}>
                      {(t.categorie && t.categorie.includes("🔄 Virement")) ? "Transfert" : parseFloat(t.montant) > 0 ? "Revenu" : "Dépense"}
                    </span>
                  </div>
                </div>
              </td>

              <td className="p-4 pl-0 text-right border-b border-white/[0.05] w-32">
                <span className={`text-[13px] font-black tabular-nums transition-colors ${
                  (t.categorie && t.categorie.includes("🔄 Virement")) ? 'text-[var(--primary)]' : parseFloat(t.montant) < 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {parseFloat(t.montant) > 0 && !(t.categorie && t.categorie.includes("🔄 Virement")) ? '+' : ''}
                  {parseFloat(t.montant).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </span>
              </td>

              <td className="p-4 hidden md:table-cell group/cat border-b border-white/[0.05] w-70">
                <CustomSelect 
                  value={t.categorie || "❓ Autre"}
                  icon={Tag} 
                  options={categoriesVisibles.map(cat => ({ v: cat, l: cat }))}
                  onChange={(val) => updateCell(t.id, 'categorie', val)}
                />
              </td>

              <td className="p-4 group/month border-b border-white/[0.05] w-40">
                <CustomSelect 
                  value={t.mois || "À définir"}
                  icon={Calendar} 
                  options={moisListe}
                  onChange={(val) => updateCell(t.id, 'mois', val)}
                />
              </td>
            </tr>
          );
        })
      ) : (
        /* --- ÉTAT VIDE : SI AUCUNE TRANSACTION --- */
        <tr>
          <td colSpan="6" className="py-20">
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-4 shadow-inner">
                <span className="text-2xl opacity-20">📂</span>
              </div>
              <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-[0.2em] opacity-40">
                Journal vide pour {selectedCompte === 'tous' ? 'Tous les comptes' : selectedCompte}, {filters.mois} {filters.annee} 
              </h3>
              <p className="text-[var(--text-main)]/20 text-[10px] font-bold uppercase tracking-widest mt-2  leading-relaxed">
                Aucune transaction ne correspond à vos filtres actuels.
                Ajouter des transactions manuellement ou importer un fichier .CSV
              </p>
            </div>
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
                </div>
              </div>
                  
    </div>
  </div>
)}



       



        


{activeTab === 'importer' && (
  <div className="max-w-full mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-20 px-6">
    
    <div className="flex flex-col lg:flex-row gap-8 items-stretch">
      
      {/* COLONNE GAUCHE : IMPORTATION & RÉCAPITULATIF */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Header Section */}
        <div className="flex items-center gap-3 px-2 shrink-0">
           <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
             <Upload size={16} className="text-[var(--primary)]" />
           </div>
           <div>
             <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-[12px]">Gestion des flux</h3>
             <p className="text-[8px] text-[var(--text-main)]/20 font-bold uppercase tracking-tighter">Importation et validation</p>
           </div>
        </div>

      
        {/* 1. Zone de configuration & Aide */}
        <div className="flex items-end gap-3 shrink-0 max-w-2xl">
          
          {/* LE SÉLECTEUR (Prend le reste de l'espace disponible) */}
          <div className="flex-1 min-w-[200px]">
            <CustomSelect 
              label="Compte de destination"
              value={selectedCompte} 
              icon={Wallet} 
              options={comptes.map(c => ({ v: c.compte, l: c.compte }))} 
              onChange={(val) => setSelectedCompte(val)} 
            />
          </div>

          <HelpPopover />
        </div>

        {/* 2. Zone de Drag & Drop (Compacte) */}
        <div 
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => document.getElementById('csvInput').click()}
          className={`
            border-2 border-dashed rounded-[2rem] p-4 flex items-center justify-center gap-6
            transition-all duration-500 cursor-pointer relative overflow-hidden min-h-[80px] shrink-0
            ${isDragging 
              ? 'border-[var(--primary)] bg-[var(--primary)]/10 scale-[1.005]' 
              : 'border-white/5 bg-white/[0.01] backdrop-blur-sm hover:border-[var(--primary)]/30 hover:bg-white/[0.03]'}
          `}
        >
          <input type="file" id="csvInput" className="hidden" accept=".csv" onChange={(e) => handleFileUpload(e.target.files[0])} />
          
          {/* Icône réduite et sans marge basse (mb-0) car alignement horizontal */}
          <div className={`p-3 rounded-xl transition-all duration-500 shrink-0 ${isDragging ? 'bg-[var(--primary)] scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' : 'bg-white/5 border border-white/10'}`}>
            <Upload size={18} className={isDragging ? 'text-black' : 'text-[var(--primary)]'} />
          </div>
          
          <div className="flex flex-col">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]">
              {isDragging ? "Relâcher" : "Glisser le fichier CSV"}
            </h3>
            {!isDragging && (
              <p className="text-[8px] text-[var(--text-main)]/20 font-bold uppercase tracking-widest mt-0.5">
                Ou cliquer pour parcourir
              </p>
            )}
          </div>

          {/* Petit indicateur de succès si un fichier est déjà chargé */}
          {tempTransactions?.length > 0 && !isDragging && (
            <div className="ml-auto bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-lg">
              <span className="text-emerald-500 text-[8px] font-black uppercase">CSV Chargé</span>
            </div>
          )}
        </div>

        {/* 3. RÉCAPITULATIF & TABLEAU (Conditionnel) */}
          {tempTransactions && tempTransactions.length > 0 && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-top-2 duration-500 min-h-0">
              
              {/* MINI STATS BAR & ACTIONS */}
              <div className="flex flex-wrap items-center justify-between gap-4 px-2">
                {/* Groupement des stats à gauche */}
                <div className="flex items-center gap-2">
                  {[
                    { label: "Revenus", val: tempTransactions.filter(t => t.montant > 0 && !t.categorie.startsWith('🔄')).reduce((acc, t) => acc + t.montant, 0), color: "text-emerald-400" },
                    { label: "Dépenses", val: tempTransactions.filter(t => t.montant < 0 && !t.categorie.startsWith('🔄')).reduce((acc, t) => acc + t.montant, 0), color: "text-rose-400" },
                    { label: "Transferts", val: tempTransactions.filter(t => t.categorie.startsWith('🔄')).reduce((acc, t) => acc + Math.abs(t.montant), 0), color: "text-violet-400" }
                  ].map((stat, idx) => (
                    <div key={idx} className="bg-white/[0.03] border border-white/5 px-3 py-2 rounded-xl flex items-center gap-2">
                      <span className="text-[7px] font-black uppercase text-[var(--text-main)]/20 tracking-tighter">{stat.label}</span>
                      <span className={`text-[10px] font-black ${stat.color}`}>
                        {stat.val.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                      </span>
                    </div>
                  ))}
                </div>

                {/* Groupement des actions à droite */}
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setTempTransactions([])} 
                    className="px-4 py-2.5 text-[9px] font-black text-[var(--text-main)]/20 hover:text-rose-500 hover:bg-rose-500/5 rounded-xl uppercase tracking-widest transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={confirmBatchImport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-[var(--text-main)] font-black uppercase text-[9px] rounded-xl hover:scale-105 transition-all shadow-lg shadow-[var(--primary)]/10"
                  >
                    <Check size={12} strokeWidth={4} /> Importer {tempTransactions.length} lignes
                  </button>
                </div>
              </div>

              {/* TABLEAU AVEC HAUTEUR AJUSTÉE */}
              <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0f0f10] z-10 shadow-md">
                      <tr className="border-b border-white/5 text-[9px] text-[var(--text-main)]/40 uppercase font-black bg-white/[0.02]">
                        <th className="p-4">Date</th>
                        <th className="p-4">Désignation</th>
                        <th className="p-4">Catégorie</th>
                        <th className="p-4 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {tempTransactions.map((t, i) => {
                        const isTransfert = t.categorie.startsWith('🔄');
                        return (
                          <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="p-4 text-[10px] text-[var(--text-main)]/30 font-bold">{t.date}</td>
                            <td className="p-4">
                              <div className="text-[10px] text-[var(--text-main)]/80 font-black uppercase truncate max-w-[250px] group-hover:text-[var(--text-main)]">
                                {t.nom}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border ${
                                isTransfert 
                                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' 
                                  : 'bg-white/5 text-[var(--primary)] border-white/5'
                              }`}>
                                {t.categorie}
                              </span>
                            </td>
                            <td className={`p-4 text-right font-black text-[11px] ${
                              isTransfert ? 'text-violet-400' : t.montant < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {t.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}€
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* COLONNE DROITE : INTELLIGENCE (Largeur fixe) */}
        <div className="w-full lg:w-150 flex flex-col gap-4 shrink-0">
          <div className="flex flex-col gap-1 px-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <Brain size={16} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-[var(--text-main)] font-black uppercase tracking-widest text-[12px]">Intelligence</h3>
            </div>
            {/* TEXTE EXPLICATIF AJOUTÉ ICI */}
            <p className="text-[12px] text-[var(--text-main)]/30 font-medium leading-relaxed mt-1 italic">
              Configuration des mots-clés pour la catégorisation automatique
              (ils sont pour tous les utilisateurs du site)
            </p>
          </div>

          <div className="px-1">
            <CustomSelect 
              label="Cible d'apprentissage"
              value={intelSelectedCat}
              icon={Search}
              options={categoriesPourIntelligence.map(cat => ({ v: cat, l: cat }))}
              onChange={(val) => setIntelSelectedCat(val)}
            />
          </div>

        <div className="flex-1 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 flex flex-col transition-all shadow-2xl relative overflow-hidden group min-h-[500px]">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col h-full animate-in fade-in duration-500 relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em]">Lexique</span>
                <span className="text-[11px] text-[var(--text-main)]/60 font-bold uppercase truncate pr-4">{intelSelectedCat}</span>
              </div>
              <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <span className="text-[12px] font-black text-[var(--primary)]">
                  {activeCategoryData?.mots_cles?.length || 0}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
              <div className="flex flex-wrap gap-2.5">
                {activeCategoryData?.mots_cles?.map((keyword, kIdx) => (
                  <div key={kIdx} className="group flex items-center gap-3 px-4 py-2 bg-white/[0.05] border border-white/10 rounded-2xl text-[10px] font-bold text-[var(--text-main)]/70 uppercase hover:bg-[var(--primary)] hover:text-black transition-all">
                    {keyword.replace(/"/g, '')}
                    <button onClick={() => handleRemoveKeyword(intelSelectedCat, keyword)} className="opacity-40 hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto relative">
              <input 
                type="text"
                placeholder="Nouvel apprentissage..."
                className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-[1.5rem] px-6 py-5 text-[11px] text-[var(--text-main)] font-black uppercase focus:outline-none focus:border-[var(--primary)]/50 transition-all placeholder:text-[var(--text-main)]/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAddKeyword(intelSelectedCat, e.target.value);
                    e.target.value = '';
                  }
                }}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-[var(--primary)]/10 rounded-xl">
                <Plus size={16} className="text-[var(--primary)]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}





{activeTab === 'comptes' && (
  <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in duration-500 overflow-hidden">
    
    {/* TITRE & COMPTEUR */}
    <div className="flex items-center gap-3 px-2">
      <h2 className="text-xl font-black text-[var(--text-main)] tracking-tighter">Mes Comptes</h2>
      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-[var(--radius)] uppercase tracking-widest border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
        {comptes.length} actifs
      </span>
    </div>

    {/* FORMULAIRE : RÉINTÉGRATION DU GROUPE + INDICATEUR COULEUR */}
    <div className="z-[900] bg-white/5 backdrop-blur-xl p-3 rounded-[var(--radius)] border border-white/10 shadow-lg">
      <form onSubmit={handleAddCompte} className="flex items-center gap-4">
        <div className="flex flex-col border-r border-white/10 pr-4">
          <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tighter">Nouveau</span>
          <span className="text-[8px] font-bold text-[var(--text-main)]/30 uppercase tracking-widest leading-none">Compte</span>
        </div>

        <input type="text" placeholder="NOM DU COMPTE" className="flex-[1.5] bg-white/5 p-2.5 rounded-[var(--radius)] border border-white/5 outline-none focus:border-white/20 text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest placeholder:text-[var(--text-main)]/20" required />
        <input type="text" placeholder="GROUPE (PERSO, COMMUN...)" className="flex-1 bg-white/5 p-2.5 rounded-[var(--radius)] border border-white/5 outline-none focus:border-white/20 text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest placeholder:text-[var(--text-main)]/20" required />
        <input type="number" step="0.01" placeholder="SOLDE" className="w-20 bg-white/5 p-2.5 rounded-[var(--radius)] border border-white/5 outline-none text-[var(--text-main)] text-[10px] font-bold" />
        
        <div className="flex flex-col items-center gap-1 px-2 border-l border-white/10">
          <button
            type="button"
            onClick={() => setShowAddPicker(!showAddPicker)}
            className="p-0.5 bg-white/10 rounded-lg border border-white/20 hover:scale-110 transition-transform relative"
          >
            <div className="w-7 h-7 rounded-md shadow-inner" style={{ backgroundColor: newCompteColor }} />
          </button>
          <span className="text-[7px] font-black text-[var(--text-main)]/30 uppercase">Teinte</span>
        </div>
        
        <button type="submit" className="px-6 py-2.5 bg-white text-black rounded-[var(--radius)] font-black uppercase text-[10px] tracking-widest hover:bg-emerald-500 hover:text-[var(--text-main)] transition-all shadow-lg active:scale-95">
          Créer
        </button>

        {showAddPicker && (
          <div className="absolute z-[1001] top-full mt-2 right-10 shadow-2xl animate-in zoom-in-95">
            <div className="fixed inset-0" onClick={() => setShowAddPicker(false)} />
            <div className="relative border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
              <SketchPicker color={newCompteColor} onChange={(color) => setNewCompteColor(color.hex)} disableAlpha />
            </div>
          </div>
        )}
      </form>
    </div>

    {/* GRILLE DE CARTES OU MESSAGE VIDE */}
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
      {comptes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {comptes.sort((a, b) => a.compte.localeCompare(b.compte)).map((c, i) => (
            <div 
              key={c.compte} 
              className={`relative group p-5 rounded-[var(--radius)] border border-white/20 transition-all duration-300 flex flex-col gap-4 shadow-lg hover:border-white/40 ${showPicker === i ? 'z-50' : 'z-10'}`}
              style={{ 
                backgroundColor: `${c.couleur}80`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* LIGNE 1 : INFOS ET ACTIONS */}
              <div className="flex justify-between items-start relative">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-black text-[var(--text-main)] uppercase truncate tracking-tight mb-1">{c.compte}</h3>
                  <div className="flex items-center gap-2 bg-black/40 w-fit px-3 py-1.5 rounded-[var(--radius)] border border-white/10 hover:border-[var(--primary)]/50 transition-colors cursor-text">
                    <Pencil size={10} className="text-[var(--primary)]" />
                    <input 
                      className="bg-transparent text-[10px] font-black text-[var(--text-main)] uppercase tracking-widest outline-none w-28"
                      value={c.groupe}
                      onChange={(e) => {
                        const newComptes = [...comptes];
                        newComptes[i].groupe = e.target.value;
                        setComptes(newComptes);
                      }}
                      onBlur={() => handleBlurUpdate(c)}
                    />
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="flex flex-col items-center gap-1.5">
                    <button 
                      onClick={() => setShowPicker(showPicker === i ? null : i)}
                      className="w-7 h-7 rounded-[var(--radius)] border-2 border-white/80 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-110 transition-transform active:scale-90"
                      style={{ backgroundColor: c.couleur }}
                    />
                    <span className="text-[7px] font-black text-[var(--text-main)]/50 uppercase tracking-widest">Couleur</span>
                  </div>

                  <button 
                    onClick={() => openDeleteModal(c.compte)} 
                    className="p-2.5 rounded-[var(--radius)] bg-rose-500/20 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-[var(--text-main)] transition-all duration-300 shadow-xl border border-rose-500/40"
                    title="Supprimer le compte"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* LIGNE 2 : DATA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-black/40 backdrop-blur-md p-3 rounded-[var(--radius)] border border-white/5 shadow-inner">
                  <p className="text-[8px] font-black text-[var(--text-main)]/40 uppercase mb-1 tracking-tighter">Solde initial</p>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      className="bg-transparent text-sm font-black text-[var(--text-main)] outline-none w-full"
                      value={c.solde}
                      onChange={(e) => {
                        const newComptes = [...comptes];
                        newComptes[i].solde = parseFloat(e.target.value) || 0;
                        setComptes(newComptes);
                      }}
                      onBlur={() => handleBlurUpdate(c)}
                    />
                    <span className="text-xs font-bold text-[var(--text-main)]/20">€</span>
                  </div>
                </div>
                
                <div className="bg-white/10 p-3 rounded-[var(--radius)] border border-white/5 shadow-inner">
                  <p className="text-[8px] font-black text-[var(--text-main)]/40 uppercase mb-1 tracking-tighter">Objectif d'épargne</p>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      className="bg-transparent text-sm font-black text-[var(--text-main)]/70 outline-none w-full"
                      value={c.objectif}
                      onChange={(e) => {
                        const newComptes = [...comptes];
                        newComptes[i].objectif = parseFloat(e.target.value) || 0;
                        setComptes(newComptes);
                      }}
                      onBlur={() => handleBlurUpdate(c)}
                    />
                    <span className="text-xs font-bold text-[var(--text-main)]/20">€</span>
                  </div>
                </div>
              </div>

              {showPicker === i && (
                <div className="absolute z-[1000] top-12 right-0 animate-in zoom-in-95 fade-in duration-200">
                  <div className="fixed inset-0 cursor-default" onClick={() => setShowPicker(null)} />
                  <div className="relative border border-white/20 rounded-[var(--radius)] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]">
                    <SketchPicker 
                      color={c.couleur} 
                      onChange={(color) => handleColorChange(i, color)} 
                      disableAlpha 
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* --- ÉTAT VIDE : SI AUCUN COMPTE --- */
        <div className="h-full flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-white/5 rounded-[var(--radius)] bg-white/[0.01]">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[var(--primary)]/10 blur-3xl rounded-full"></div>
            <div className="relative w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/10 flex items-center justify-center shadow-2xl">
              <Wallet size={32} className="text-[var(--primary)]/80" />
            </div>
          </div>
          <h3 className="text-[var(--text-main)] font-black text-xs uppercase tracking-[0.3em] opacity-40">
            Aucun compte configuré
          </h3>
          <p className="text-[var(--text-main)]/20 text-[10px] font-bold uppercase tracking-[0.2em] mt-3 max-w-[320px] leading-relaxed">
            Pour commencer à analyser vos finances, créez votre premier compte à l'aide du formulaire ci-dessus.
          </p>
          <div className="mt-8 flex gap-2 items-center text-[var(--text-main)]/10">
             <div className="h-[1px] w-8 bg-current"></div>
             <span className="text-[8px] font-black uppercase tracking-[0.4em]">En attente de data</span>
             <div className="h-[1px] w-8 bg-current"></div>
          </div>
        </div>
      )}
    </div>

    <style>{`
      .custom-scrollbar::-webkit-scrollbar { width: 3px; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
    `}</style>
  </div>
)}


{activeTab === 'theme' && user === 'theo' && (
  <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
    <div className="bg-[#0f172a] border border-white/10 rounded-[var(--radius)] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      
      {/* HEADER HARMONISÉ */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-10 w-1 bg-[var(--primary)] rounded-full shadow-[0_0_15px_var(--primary)]" />
        <div>
          <h2 className="text-3xl font-black text-[var(--text-main)] uppercase tracking-tighter">
            Studio de Design <span className="text-[var(--primary)]">3.0</span>
          </h2>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--text-main)]/30">
            Configuration de l'identité visuelle
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        
        {/* SECTION COULEURS */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Couleurs</h3>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          
          <div className="space-y-4">
            {[
              { id: 'bg', label: 'Arrière-plan site', var: '--bg-site' },
              { id: 'primary', label: 'Accent Primaire', var: '--primary' },
              { id: 'text', label: 'Texte Principal', var: '--text-main' }
            ].map((item) => (
              <div key={item.id} className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-[var(--radius)] hover:bg-white/[0.05] transition-all">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/60">{item.label}</span>
                <div className="relative">
                  <button 
                    onClick={() => setActivePicker(activePicker === item.id ? null : item.id)}
                    className="w-12 h-6 rounded-full border border-white/20 shadow-inner cursor-pointer transition-transform hover:scale-110"
                    style={{ backgroundColor: `var(${item.var})` }}
                  />
                  {activePicker === item.id && (
                    <div className="absolute z-50 top-10 right-0 shadow-2xl animate-in zoom-in-95 duration-200">
                      <div className="fixed inset-0" onClick={() => setActivePicker(null)} />
                      <SketchPicker 
                        // 1. On utilise une couleur provenant de l'état ou du style calculé au montage
                        color={pickingColor?.id === item.id 
                          ? pickingColor.hex 
                          : getComputedStyle(document.documentElement).getPropertyValue(item.var).trim()
                        }
                        onChange={(color) => {
                          // 2. Mise à jour de l'état local pour que le "petit rond" bouge immédiatement
                          setPickingColor({ id: item.id, hex: color.hex });
                          
                          // 3. Mise à jour du CSS Live (votre fonction existante)
                          updateThemeLive(item.var, color.hex);
                        }}
                        disableAlpha={true}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION STYLE */}
        <div className="space-y-8">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--primary)]">Structure</h3>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          
          <div className="space-y-6">
            <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[var(--radius)]">
              <div className="flex justify-between mb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)]/60">Arrondi des cartes</label>
                <span className="text-xs font-mono font-black text-[var(--primary)]">
                  {getComputedStyle(document.documentElement).getPropertyValue('--radius')}
                </span>
              </div>
              <input 
                type="range" min="0" max="3" step="0.1" 
                defaultValue={parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius')) || 1.5}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                onChange={(e) => updateThemeLive('--radius', `${e.target.value}rem`)} 
              />
            </div>

            {/* APERÇU AMÉLIORÉ */}
            <div className="relative overflow-hidden p-6 bg-[var(--bg-site)] rounded-[var(--radius)] border border-white/10 shadow-inner group">
              <div className="absolute top-0 right-0 p-2 opacity-10 font-black text-[40px] italic pointer-events-none">PREVIEW</div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-main)]/20 mb-4">Aperçu du rendu</p>
              <div className="space-y-3">
                <button className="w-full py-3 bg-[var(--primary)] text-[var(--text-main)] rounded-[var(--radius)] text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-[var(--primary)]/20">
                  Bouton Principal
                </button>
                <div className="p-4 bg-white/5 rounded-[var(--radius)] border border-white/5">
                   <div className="h-1 w-8 bg-[var(--primary)] mb-2 rounded-full" />
                   <div className="h-2 w-full bg-white/10 rounded-full mb-1" />
                   <div className="h-2 w-2/3 bg-white/5 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleSaveThemeSQL}
        className="w-full mt-12 py-5 bg-[var(--primary)] text-[var(--text-main)] rounded-[var(--radius)] font-black text-[11px] uppercase tracking-[0.4em] hover:brightness-125 transition-all shadow-[0_20px_40px_rgba(var(--primary-rgb),0.3)] active:scale-[0.98]"
      >
        Propager le nouveau thème
      </button>
    </div>
  </div>
)}
       
      </main>

      </div>



{activeTab === 'tricount' && (
  <div className="w-full"> 
    {/* px-8 permet de garder une petite marge de sécurité sur les côtés pour que ça ne colle pas aux bords de l'écran */}
    <TricountManager userId={user} />
  </div>
)}
      
    

      {/* --- C'EST ICI QU'ON LE POSE --- */}
      

      <NotePad user={user} />
      <ProrataCalc />
      <ThemeCustomizer 
        user={user} 
        userTheme={userTheme} 
        setUserTheme={setUserTheme} 
      />
     

      {deleteModal.show && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
          {/* Overlay flou */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setDeleteModal({ show: false, accountName: null })} />
          
          {/* Contenu de la Modal */}
          <div className="relative bg-white rounded-[var(--radius)] p-8 max-w-sm w-full shadow-2xl scale-in-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} className="text-rose-500" />
            </div>
            
            <h3 className="text-xl font-black text-slate-800 text-center mb-2">Supprimer le compte ?</h3>
            <p className="text-slate-500 text-center text-sm mb-8">
              Tu es sur le point de supprimer <span className="font-bold text-slate-700">"{deleteModal.accountName}"</span>. Cette action effacera toutes les données liées.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeleteModal({ show: false, accountName: null })}
                className="py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                className="py-3 bg-rose-500 text-[var(--text-main)] rounded-2xl font-bold shadow-lg shadow-rose-100 hover:bg-rose-600 active:scale-95 transition-all"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}



      {/* BARRE D'ACTION FLOTTANTE */}
        {selectedIds.length > 0 && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10">
            <div className="bg-[#121212]/90 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6">
              
              {/* Compteur */}
              <div className="flex items-center gap-3 border-r border-white/10 pr-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--primary)] blur-sm opacity-50"></div>
                  <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--primary)] text-[10px] font-black text-[var(--text-main)]">
                    {selectedIds.length}
                  </span>
                </div>
                <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.2em]">Sélectionnés</span>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-lg shadow-rose-500/10"
                >
                  <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
                  Supprimer la sélection
                </button>
                
                <button 
                  onClick={() => setSelectedIds([])}
                  className="px-4 py-2.5 text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}



        {/* MODALE DE CONFIRMATION CUSTOM */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              {/* Overlay flouté */}
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={() => setShowDeleteConfirm(false)}
              />
              
              {/* Boîte de dialogue */}
              <div className="relative bg-[#1a1a1a] border border-white/10 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
                    <Trash2 size={28} className="text-rose-500" />
                  </div>
                  
                  <h3 className="text-[var(--text-main)] text-xl font-black mb-2">Supprimer ?</h3>
                  <p className="text-[var(--text-main)]/40 text-sm leading-relaxed mb-8">
                    Voulez-vous vraiment supprimer la catégorie <span className="text-[var(--text-main)] font-bold">"{catToDelete}"</span> ? Cette action est irréversible.
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[var(--text-main)] text-xs font-black uppercase transition-all"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={confirmDeletecat} // <--- Appel de la fonction de suppression réelle
                      className="flex-1 px-6 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-xs font-black uppercase transition-all"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}



          {/* MODALE DE CONFIRMATION DE SUPPRESSION */}
{budgetToDelete && (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
    {/* Overlay sombre et flou */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => setBudgetToDelete(null)}
    />
    
    {/* Contenu de la modale */}
    <div className="relative bg-[#1a1a1c] border border-white/10 p-6 rounded-[2rem] shadow-2xl max-w-xs w-full animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center">
          <Trash2 size={24} className="text-rose-500" />
        </div>
        
        <div>
          <h3 className="text-[var(--text-main)] text-sm font-black uppercase tracking-widest">Supprimer le budget ?</h3>
          <p className="text-[10px] text-[var(--text-main)]/40 font-bold uppercase mt-2 px-4">
            Voulez-vous vraiment retirer le budget <span className="text-rose-400">"{budgetToDelete?.nom}"</span> ?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full mt-2">
          <button 
            onClick={() => setBudgetToDelete(null)}
            className="py-3 bg-white/5 hover:bg-white/10 text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={executeDeleteBudget}
            className="py-3 bg-rose-500 hover:bg-rose-600 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-500/20"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
)}


{/* Notification Flash (Toast) */}
{notification && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 duration-300">
    <div className={`
      flex items-center gap-3 px-6 py-4 rounded-[1.5rem] shadow-2xl border backdrop-blur-xl
      ${notification.type === 'success' 
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}
    `}>
      <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
        {notification.type === 'success' ? <Check size={18} /> : <X size={18} />}
      </div>
      
      <div className="flex flex-col">
        <span className="text-[11px] font-black uppercase tracking-widest">
          {notification.type === 'success' ? 'Système à jour' : 'Échec opération'}
        </span>
        <span className="text-[10px] font-bold opacity-80 uppercase">
          {notification.message}
        </span>
      </div>

      <button 
        onClick={() => setNotification(null)}
        className="ml-4 hover:rotate-90 transition-transform opacity-40 hover:opacity-100"
      >
        <X size={14} />
      </button>
    </div>
  </div>
)}



{selectedIds2.length > 0 && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ease-out animate-in fade-in slide-in-from-bottom-10">
    <div className="bg-[#121212]/90 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center gap-6">
      
      {/* Compteur */}
      <div className="flex items-center gap-3 border-r border-white/10 pr-6">
        <div className="relative">
          <div className="absolute inset-0 bg-emerald-500 blur-sm opacity-50"></div>
          <span className="relative flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-[var(--text-main)]">
            {selectedIds2.length}
          </span>
        </div>
        <span className="text-[10px] font-black text-[var(--text-main)]/70 uppercase tracking-[0.2em]">Prévisions</span>
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center gap-3">
        <button 
          onClick={handleDeleteSelected2}
          className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-[var(--text-main)] rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-lg shadow-rose-500/10"
        >
          <Trash2 size={14} className="group-hover:rotate-12 transition-transform" />
          Supprimer
        </button>
        
        <button 
          onClick={() => setSelectedIds2([])}
          className="px-4 py-2.5 text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}



{/* --- MODAL DE CONFIRMATION PERSONNALISÉ --- */}
{deleteModal3.show && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    {/* Overlay flou */}
    <div 
      className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={() => setDeleteModal3({ show: false, projetNom: null })}
    />
    
    {/* Contenu du Modal */}
    <div className="relative bg-[#0A0A0A] border border-white/10 p-8 rounded-[32px] w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="p-4 bg-rose-500/10 rounded-full text-rose-500 mb-4">
          <Trash2 size={32} />
        </div>
        
        <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-tighter mb-2">
          Supprimer l'enveloppe ?
        </h3>
        
        <p className="text-[var(--text-main)]/40 text-xs leading-relaxed mb-8">
          Êtes-vous sûr de vouloir supprimer <span className="text-[var(--text-main)] font-bold">"{deleteModal3.projetNom}"</span> ? 
          Cette action est irréversible et libérera les fonds dans votre solde global.
        </p>

        <div className="grid grid-cols-2 gap-3 w-full">
          <button 
            onClick={() => setDeleteModal3({ show: false, projetNom: null })}
            className="py-3 rounded-xl bg-white/5 text-[var(--text-main)]/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
          >
            Annuler
          </button>
          <button 
            onClick={async () => {
              await api.delete(`/delete-enveloppe/${deleteModal3.projetNom}?profil=${filters.profil}`);
              fetchAllocations();
              setDeleteModal3({ show: false, projetNom: null });
            }}
            className="py-3 rounded-xl bg-rose-500 text-[var(--text-main)] text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  </div>
)}


{/* ALERTE PERSONNALISÉE (TOAST) */}
{notification2.show && (
  <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-bottom-10 fade-in duration-500">
    <div className={`
      flex items-center gap-4 px-6 py-4 rounded-[var(--radius)] border shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[320px]
      ${notification2.type === 'success' 
        ? 'bg-[#0f172a] border-emerald-500/50' 
        : 'bg-[#0f172a] border-rose-500/50'}
    `}>
      {/* Icône dynamique */}
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl ${
        notification2.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
      }`}>
        {notification2.type === 'success' ? '✓' : '✕'}
      </div>

      <div className="flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-main)]/40 mb-1">
          Système Kleea
        </p>
        <p className="text-xs font-bold text-[var(--text-main)] tracking-wide">
          {notification2.message}
        </p>
      </div>

      {/* Barre de progression éphémère */}
      <div className="absolute bottom-0 left-0 h-1 bg-current opacity-20 transition-all duration-[4000ms] ease-linear"
           style={{ width: '0%', animation: 'progress 4s linear' }} />
    </div>
  </div>
)}



<style jsx>{`
  @keyframes progress {
    from { width: 100%; }
    to { width: 0%; }
  }
`}</style>


    </div>  

  );
}

export default FinanceApp;