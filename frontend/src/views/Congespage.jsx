import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, Download, Plus, Trash2, CheckCircle2, 
  AlertCircle, Building2, User, Briefcase, ChevronLeft, ChevronRight,
  FileText, ArrowRight, ShieldCheck, Sun, Umbrella, Calculator, Award, X
} from 'lucide-react';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import fr from 'date-fns/locale/fr';
import { toast } from 'sonner';
import api from '../axios';

try {
  registerLocale('fr', fr);
} catch (e) {
  // Locale déjà enregistrée
}

// =========================================================================
// 🟢 CALCULATEUR DE JOURS FÉRIÉS FRANÇAIS & DÉCOMPTE (SANS DIMANCHES NI FÉRIÉS)
// =========================================================================
export const getFrenchHolidays = (year) => {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month, day);

  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  const ascension = new Date(easter);
  ascension.setDate(easter.getDate() + 39);

  const pentecostMonday = new Date(easter);
  pentecostMonday.setDate(easter.getDate() + 50);

  const pad = (n) => String(n).padStart(2, '0');
  const format = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  return [
    `${year}-01-01`, // Jour de l'an
    format(easterMonday), // Lundi de Pâques
    `${year}-05-01`, // Fête du travail
    `${year}-05-08`, // Victoire 1945
    format(ascension), // Ascension
    format(pentecostMonday), // Lundi de Pentecôte
    `${year}-07-14`, // Fête nationale
    `${year}-08-15`, // Assomption
    `${year}-11-01`, // Toussaint
    `${year}-11-11`, // Armistice 1918
    `${year}-12-25`, // Noël
  ];
};

export const calculateLeaveDays = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (start > end) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const holidays = getFrenchHolidays(year);
    const pad = (n) => String(n).padStart(2, '0');
    const iso = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
    const dayOfWeek = current.getDay(); // 0 = Dimanche

    if (dayOfWeek !== 0 && !holidays.includes(iso)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const toISODateString = (d) => {
  if (!d || isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function CongesPage({ user }) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Modale de confirmation de suppression
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    congeId: null,
    congeInfo: null
  });

  // Profil Salarié
  const [profile, setProfile] = useState({
    nom: 'LEBARBIER',
    prenom: 'Théo',
    societe: 'ISA Group',
    poste: 'Salarié',
    date_embauche: '2026-09-01',
    jours_acquis_annuel: 30, // 30 jours ouvrables (2.5 j/mois)
    mode_calcul: 'auto'
  });

  const [conges, setConges] = useState([]);
  const [loading, setLoading] = useState(true);

  // Formulaire de saisie
  const [form, setForm] = useState({
    type: 'CP', // 'CP', 'SANS_SOLDE', 'RECUP'
    date_debut: '',
    date_fin: '',
    motif: '',
    anticipe: false
  });

  // Charger les données
  const fetchCongesData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/conges/${user}`);
      if (res.data) {
        setConges(res.data.conges || []);
        if (res.data.profile) {
          setProfile(prev => ({ ...prev, ...res.data.profile }));
        }
      }
    } catch (err) {
      console.error('Erreur chargement congés:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCongesData();
  }, [user]);

  // Calcul du prorata d'acquisition
  const statsAcquisition = useMemo(() => {
    const baseAnnuelle = parseFloat(profile.jours_acquis_annuel) || 30;
    const acquisitionParMois = baseAnnuelle / 12; // 2.5 j/mois

    if (!profile.date_embauche || profile.mode_calcul === 'manuel') {
      return {
        acquisCumul: baseAnnuelle,
        acquisADate: baseAnnuelle,
        moisTravaillesAnnee: 12,
        estEmbaucheRecente: false
      };
    }

    const embauche = new Date(profile.date_embauche);
    const anneeEmbauche = embauche.getFullYear();

    if (anneeEmbauche > selectedYear) {
      return { acquisCumul: 0, acquisADate: 0, moisTravaillesAnnee: 0, estEmbaucheRecente: true };
    }

    let moisTravaillesDansAnnee = 12;
    if (anneeEmbauche === selectedYear) {
      const moisEmbauche = embauche.getMonth();
      moisTravaillesDansAnnee = 12 - moisEmbauche;
    }

    const totalAcquisPrevuAnnee = Math.round((moisTravaillesDansAnnee * acquisitionParMois) * 100) / 100;

    let moisADate = 12;
    if (selectedYear === currentYear) {
      const moisActuel = today.getMonth();
      if (anneeEmbauche === currentYear) {
        moisADate = Math.max(0, moisActuel - embauche.getMonth() + 1);
      } else {
        moisADate = moisActuel + 1;
      }
    } else if (selectedYear > currentYear) {
      moisADate = 0;
    }

    const acquisReelADate = Math.min(totalAcquisPrevuAnnee, Math.round((moisADate * acquisitionParMois) * 100) / 100);

    return {
      acquisCumul: totalAcquisPrevuAnnee,
      acquisADate: acquisReelADate,
      moisTravaillesAnnee: moisTravaillesDansAnnee,
      estEmbaucheRecente: anneeEmbauche === selectedYear
    };
  }, [profile.date_embauche, profile.jours_acquis_annuel, profile.mode_calcul, selectedYear, currentYear]);

  // Nombre de jours calculé sur le formulaire
  const nbJoursCalcules = useMemo(() => {
    return calculateLeaveDays(form.date_debut, form.date_fin);
  }, [form.date_debut, form.date_fin]);

  // Totaux de congés posés et solde
  const { totalPrisCP, totalSansSolde, totalRecupPris, joursRestantsCP } = useMemo(() => {
    const listAnnee = conges.filter(c => {
      const anneeC = new Date(c.date_debut).getFullYear();
      if (profile.date_embauche && new Date(c.date_debut) < new Date(profile.date_embauche)) {
        return false;
      }
      return anneeC === selectedYear;
    });

    const prisCP = listAnnee.filter(c => c.type === 'CP').reduce((acc, c) => acc + (parseFloat(c.nb_jours) || 0), 0);
    const sansSolde = listAnnee.filter(c => c.type === 'SANS_SOLDE').reduce((acc, c) => acc + (parseFloat(c.nb_jours) || 0), 0);
    const recup = listAnnee.filter(c => c.type === 'RECUP').reduce((acc, c) => acc + (parseFloat(c.nb_jours) || 0), 0);

    const solde = Math.round((statsAcquisition.acquisCumul - prisCP) * 100) / 100;

    return {
      totalPrisCP: prisCP,
      totalSansSolde: sansSolde,
      totalRecupPris: recup,
      joursRestantsCP: solde
    };
  }, [conges, selectedYear, statsAcquisition.acquisCumul, profile.date_embauche]);

  // Sauvegarder les paramètres du profil
  const handleSaveProfile = async () => {
    try {
      await api.put('/api/conges/config', {
        utilisateur: user,
        ...profile
      });
      toast.success('Paramètres et date d\'embauche enregistrés !');
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde du profil.');
    }
  };

  // Ajouter une nouvelle demande
  const handleAddConge = async (e) => {
    e.preventDefault();
    if (!form.date_debut || !form.date_fin) {
      toast.error('Veuillez sélectionner les dates de début et de fin.');
      return;
    }

    if (profile.date_embauche && new Date(form.date_debut) < new Date(profile.date_embauche)) {
      const parts = profile.date_embauche.split('-');
      const dFr = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : profile.date_embauche;
      toast.error(`La date de début ne peut pas être antérieure à votre date d'embauche (${dFr}).`);
      return;
    }

    if (nbJoursCalcules <= 0) {
      toast.error('La période ne contient aucun jour ouvrable décomptable (hors dimanches et fériés).');
      return;
    }

    try {
      const payload = {
        utilisateur: user,
        type: form.type,
        date_debut: form.date_debut,
        date_fin: form.date_fin,
        nb_jours: nbJoursCalcules,
        motif: form.motif,
        anticipe: form.anticipe,
        jours_restants_apres: form.type === 'CP' ? joursRestantsCP - nbJoursCalcules : null
      };

      const res = await api.post('/api/conges', payload);
      toast.success('Demande de congé enregistrée !');
      setForm({ type: 'CP', date_debut: '', date_fin: '', motif: '', anticipe: false });
      fetchCongesData();

      if (res.data?.id) {
        handleDownloadPdf(res.data.id);
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement de la demande.");
    }
  };

  // Modale de suppression
  const openDeleteModal = (c) => {
    setDeleteModal({
      show: true,
      congeId: c.id,
      congeInfo: c
    });
  };

  const confirmDeleteConge = async () => {
    if (!deleteModal.congeId) return;
    try {
      await api.delete(`/api/conges/${deleteModal.congeId}`);
      setConges(prev => prev.filter(c => c.id !== deleteModal.congeId));
      toast.success('Demande de congé supprimée avec succès.');
      setDeleteModal({ show: false, congeId: null, congeInfo: null });
    } catch (err) {
      toast.error('Erreur lors de la suppression.');
    }
  };

  // Télécharger le PDF ISA Group
  const handleDownloadPdf = async (congeId) => {
    try {
      const res = await api.get(`/api/conges/pdf/${congeId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Demande_Conges_ISA_${user}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF ISA Group téléchargé avec succès !');
    } catch (err) {
      toast.error('Erreur lors de la génération du PDF.');
    }
  };

  // Filtrage des congés par année
  const congesAffiches = useMemo(() => {
    return conges.filter(c => {
      const d = new Date(c.date_debut);
      return d.getFullYear() === selectedYear;
    });
  }, [conges, selectedYear]);

  const bookedDatesMap = useMemo(() => {
    const map = {};
    conges.forEach(c => {
      const start = new Date(c.date_debut);
      const end = new Date(c.date_fin);
      const curr = new Date(start);
      while (curr <= end) {
        const pad = (n) => String(n).padStart(2, '0');
        const iso = `${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`;
        map[iso] = c.type;
        curr.setDate(curr.getDate() + 1);
      }
    });
    return map;
  }, [conges]);

  const holidaysOfYear = useMemo(() => getFrenchHolidays(selectedYear), [selectedYear]);

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 select-none pb-32">
      
      {/* =========================================================================
          1. EN-TÊTE SUPÉRIEURE ÉPURÉE (SÉLECTEUR D'ANNÉE UNIQUE)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] rounded-3xl border border-white/10 shadow-xl">
        
        {/* Titre & Badge */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Umbrella size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Gestion des Congés</h2>
              <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ISA Group PDF
              </span>
            </div>
            <p className="text-[9px] text-white/40 uppercase font-bold tracking-widest mt-0.5">
              Décompte sans dimanches ni fériés • Embauche le {new Date(profile.date_embauche || '2026-09-01').toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>

        {/* Sélecteur d'année */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
          <button 
            type="button"
            onClick={() => setSelectedYear(y => y - 1)}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-black text-emerald-400 uppercase px-3 font-mono tracking-wider">
            {selectedYear}
          </span>
          <button 
            type="button"
            onClick={() => setSelectedYear(y => y + 1)}
            className="p-1.5 hover:bg-white/10 rounded-xl text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

      </div>

      {/* 2. LES COMPTEURS DE SOLDES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* CARTE 1 : SOLDE DISPONIBLE AUJOURD'HUI */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-300">Solde Disponible à ce jour</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-white font-mono tracking-tight">
              {Math.max(0, statsAcquisition.acquisADate - totalPrisCP)} <span className="text-xs text-white/40 font-bold uppercase">jours</span>
            </h3>
            <p className="text-[9px] text-emerald-300/70 font-bold uppercase mt-1">
              Acquis à ce jour ({new Date(profile.date_embauche || '2026-09-01').toLocaleDateString('fr-FR')})
            </p>
          </div>
        </div>

        {/* CARTE 2 : DROIT TOTAL ANNUEL PRORATISÉ */}
        <div className="p-5 rounded-3xl bg-[var(--glass-bg)] border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Droit Total Année {selectedYear}</span>
            <Calculator size={16} className="text-indigo-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-indigo-300 font-mono tracking-tight">
              {statsAcquisition.acquisCumul} <span className="text-xs text-white/40 font-bold uppercase">jours</span>
            </h3>
            <p className="text-[9px] text-white/30 font-bold uppercase mt-1">
              Proratisé sur l'année complète
            </p>
          </div>
        </div>

        {/* CARTE 3 : JOURS CP POSÉS */}
        <div className="p-5 rounded-3xl bg-[var(--glass-bg)] border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Jours CP Posés ({selectedYear})</span>
            <Calendar size={16} className="text-indigo-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-indigo-400 font-mono tracking-tight">
              {totalPrisCP} <span className="text-xs text-white/40 font-bold uppercase">jours</span>
            </h3>
            <p className="text-[9px] text-white/30 font-bold uppercase mt-1">
              Hors dimanches et fériés
            </p>
          </div>
        </div>

        {/* CARTE 4 : RÉCUPÉRATIONS & SANS SOLDE */}
        <div className="p-5 rounded-3xl bg-[var(--glass-bg)] border border-white/10 shadow-xl flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Récups & Sans Solde</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-300 font-mono">{totalRecupPris}j <span className="text-[9px] text-white/30 font-bold uppercase">récup</span></span>
              <span className="text-white/20">•</span>
              <span className="text-2xl font-black text-rose-400 font-mono">{totalSansSolde}j <span className="text-[9px] text-white/30 font-bold uppercase">sans solde</span></span>
            </div>
            <p className="text-[9px] text-white/30 font-bold uppercase mt-1">
              Absences spécifiques
            </p>
          </div>
        </div>

      </div>

      {/* 3. FORMULAIRE DE DEMANDE AVEC DATEPICKER & CONFIGURATION PROFIL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* FORMULAIRE DE DEMANDE (8 colonnes) */}
        <div className="lg:col-span-8 bg-[var(--glass-bg)] border border-white/10 p-6 rounded-3xl shadow-xl backdrop-blur-xl space-y-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-indigo-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Poser un nouveau congé</h3>
            </div>
            <span className="text-[8px] font-black uppercase tracking-widest px-2.5 py-1 bg-indigo-500/10 text-indigo-300 rounded-lg border border-indigo-500/20">
              Génère le PDF ISA
            </span>
          </div>

          <form onSubmit={handleAddConge} className="space-y-4">
            {/* Choix du type de congé */}
            <div className="space-y-1.5">
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Type de congé</label>
              <div className="grid grid-cols-3 gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl">
                {[
                  { id: 'CP', label: 'Congés Payés' },
                  { id: 'RECUP', label: 'Récupération' },
                  { id: 'SANS_SOLDE', label: 'Sans Solde' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.id })}
                    className={`py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                      form.type === t.id 
                        ? 'bg-indigo-600 text-white shadow-lg' 
                        : 'text-white/40 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DATES DE DÉBUT ET DE FIN AVEC DATEPICKER */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* DATE DÉBUT */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Du (au matin)</label>
                <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-2xl px-3.5 py-3 focus-within:border-indigo-500 transition-colors w-full cursor-pointer">
                  <Calendar size={15} className="text-indigo-400 shrink-0" />
                  <DatePicker
                    selected={form.date_debut ? new Date(form.date_debut) : null}
                    onChange={(date) => setForm({ ...form, date_debut: toISODateString(date) })}
                    minDate={profile.date_embauche ? new Date(profile.date_embauche) : undefined}
                    dateFormat="dd/MM/yyyy"
                    locale="fr"
                    placeholderText="JJ/MM/AAAA"
                    className="bg-transparent border-none outline-none text-xs font-mono font-bold text-white w-full cursor-pointer"
                  />
                </div>
              </div>

              {/* DATE FIN */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-white/40">Au (inclus)</label>
                <div className="flex items-center gap-2.5 bg-black/40 border border-white/10 rounded-2xl px-3.5 py-3 focus-within:border-indigo-500 transition-colors w-full cursor-pointer">
                  <Calendar size={15} className="text-indigo-400 shrink-0" />
                  <DatePicker
                    selected={form.date_fin ? new Date(form.date_fin) : null}
                    onChange={(date) => setForm({ ...form, date_fin: toISODateString(date) })}
                    minDate={form.date_debut ? new Date(form.date_debut) : (profile.date_embauche ? new Date(profile.date_embauche) : undefined)}
                    dateFormat="dd/MM/yyyy"
                    locale="fr"
                    placeholderText="JJ/MM/AAAA"
                    className="bg-transparent border-none outline-none text-xs font-mono font-bold text-white w-full cursor-pointer"
                  />
                </div>
              </div>

            </div>

            {/* Récapitulatif calcul automatique */}
            <div className="flex items-center justify-between p-3.5 bg-black/30 border border-white/5 rounded-2xl text-[10px] font-bold">
              <span className="text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-indigo-400" />
                Nombre de jours décomptés :
              </span>
              <span className="text-sm font-black text-emerald-400 font-mono">
                {nbJoursCalcules} jour{nbJoursCalcules > 1 ? 's' : ''} décompté{nbJoursCalcules > 1 ? 's' : ''}
              </span>
            </div>

            {/* Option Récupération Motif */}
            {form.type === 'RECUP' && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[8px] font-black uppercase tracking-widest text-amber-300">
                  Motif obligatoire de la récupération
                </label>
                <textarea 
                  rows="2"
                  placeholder="Précisez la date et les heures supplémentaires récupérées..."
                  value={form.motif}
                  onChange={(e) => setForm({ ...form, motif: e.target.value })}
                  className="w-full bg-black/40 border border-amber-500/30 rounded-2xl p-3 text-xs text-white outline-none focus:border-amber-400"
                  required
                />
              </div>
            )}

            {/* Option Congés par anticipation */}
            {form.type === 'CP' && (
              <label className="flex items-center gap-2 text-[10px] font-bold text-white/60 cursor-pointer pt-1">
                <input 
                  type="checkbox"
                  checked={form.anticipe}
                  onChange={(e) => setForm({ ...form, anticipe: e.target.checked })}
                  className="w-4 h-4 rounded bg-black/40 border-white/20 text-indigo-500"
                />
                <span>Congés par anticipation</span>
              </label>
            )}

            {/* Bouton de soumission */}
            <button
              type="submit"
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileText size={15} />
              <span>Valider & Générer le PDF ISA Group</span>
            </button>
          </form>
        </div>

        {/* CONFIGURATION SALARIÉ & DATE D'EMBAUCHE (4 colonnes) */}
        <div className="lg:col-span-4 bg-[var(--glass-bg)] border border-white/10 p-6 rounded-3xl shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <User size={16} className="text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">Profil & Embauche</h3>
          </div>

          <div className="space-y-3">
            
            {/* DATE D'EMBAUCHE AVEC DATEPICKER */}
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-1">
              <label className="text-[8.5px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Award size={12} /> Date d'embauche
              </label>
              
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 focus-within:border-emerald-400">
                <Calendar size={13} className="text-emerald-400 shrink-0" />
                <DatePicker
                  selected={profile.date_embauche ? new Date(profile.date_embauche) : null}
                  onChange={(date) => setProfile({ ...profile, date_embauche: toISODateString(date) })}
                  dateFormat="dd/MM/yyyy"
                  locale="fr"
                  className="bg-transparent border-none outline-none text-xs font-mono font-bold text-white w-full cursor-pointer"
                />
              </div>

              <p className="text-[7.5px] text-emerald-200/60 font-bold uppercase">
                Base du calcul des congés acquis
              </p>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Nom & Prénom</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  value={profile.nom} 
                  onChange={e => setProfile({ ...profile, nom: e.target.value.toUpperCase() })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white uppercase outline-none"
                  placeholder="NOM"
                />
                <input 
                  type="text" 
                  value={profile.prenom} 
                  onChange={e => setProfile({ ...profile, prenom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  placeholder="Prénom"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">Société & Poste</label>
              <div className="space-y-2">
                <input 
                  type="text" 
                  value={profile.societe} 
                  onChange={e => setProfile({ ...profile, societe: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  placeholder="Société (ex: ISA Group)"
                />
                <input 
                  type="text" 
                  value={profile.poste} 
                  onChange={e => setProfile({ ...profile, poste: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none"
                  placeholder="Poste occupé"
                />
              </div>
            </div>

            <div>
              <label className="text-[8px] font-black uppercase tracking-widest text-white/40 block mb-1">
                Base annuelle de CP (ex: 30 jours)
              </label>
              <input 
                type="number" 
                value={profile.jours_acquis_annuel} 
                onChange={e => setProfile({ ...profile, jours_acquis_annuel: parseFloat(e.target.value) || 0 })}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 font-mono outline-none"
              />
            </div>
          </div>

          <button 
            type="button"
            onClick={handleSaveProfile}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer"
          >
            Enregistrer le profil
          </button>
        </div>
      </div>

      {/* 4. VUE CALENDRIER ANNUEL */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-6 rounded-3xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Calendrier Annuel des Congés ({selectedYear})
            </h3>
          </div>

          <div className="flex items-center gap-3 text-[8px] font-black uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block" /> Congés Payés</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block" /> Récupération</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" /> Sans Solde</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500/40 border border-indigo-400 inline-block" /> Férié</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
          {moisNoms.map((nomMois, moisIdx) => {
            const premierJour = new Date(selectedYear, moisIdx, 1);
            const dernierJour = new Date(selectedYear, moisIdx + 1, 0);
            const totalJours = dernierJour.getDate();
            const decalageDepart = (premierJour.getDay() + 6) % 7;

            return (
              <div key={nomMois} className="bg-black/30 border border-white/5 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase text-white tracking-wider">{nomMois}</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                  {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((j, i) => (
                    <span key={i} className={`text-[7px] font-black uppercase ${i === 6 ? 'text-rose-400/60' : 'text-white/20'}`}>
                      {j}
                    </span>
                  ))}

                  {Array.from({ length: decalageDepart }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-5" />
                  ))}

                  {Array.from({ length: totalJours }).map((_, jourIdx) => {
                    const jourNum = jourIdx + 1;
                    const pad = (n) => String(n).padStart(2, '0');
                    const iso = `${selectedYear}-${pad(moisIdx + 1)}-${pad(jourNum)}`;
                    const dateObj = new Date(selectedYear, moisIdx, jourNum);
                    const isSunday = dateObj.getDay() === 0;
                    const isHoliday = holidaysOfYear.includes(iso);
                    const bookedType = bookedDatesMap[iso];
                    const isAvantEmbauche = profile.date_embauche && dateObj < new Date(profile.date_embauche);

                    return (
                      <div 
                        key={iso}
                        title={isAvantEmbauche ? 'Avant date d\'embauche' : isHoliday ? 'Jour férié' : bookedType ? `Congé ${bookedType}` : undefined}
                        className={`h-5 rounded flex items-center justify-center text-[8px] font-mono font-black transition-all ${
                          bookedType === 'CP' ? 'bg-emerald-500 text-black shadow-sm' :
                          bookedType === 'RECUP' ? 'bg-amber-500 text-black shadow-sm' :
                          bookedType === 'SANS_SOLDE' ? 'bg-rose-500 text-white shadow-sm' :
                          isHoliday ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50' :
                          isAvantEmbauche ? 'bg-white/[0.01] text-white/10' :
                          isSunday ? 'bg-white/[0.02] text-white/20' :
                          'bg-white/[0.04] text-white/70 hover:bg-white/10'
                        }`}
                      >
                        {jourNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. HISTORIQUE COMPLET DES DEMANDES DE L'ANNÉE & TÉLÉCHARGEMENT */}
      <div className="bg-[var(--glass-bg)] border border-white/10 p-6 rounded-3xl shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Historique des demandes ({selectedYear})
            </h3>
          </div>
          <span className="text-[9px] font-mono text-white/40 font-bold">
            {congesAffiches.length} demande(s)
          </span>
        </div>

        {congesAffiches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[9px] font-black uppercase text-white/30">
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Période</th>
                  <th className="py-3 px-3 text-center">Jours décomptés</th>
                  <th className="py-3 px-3">Motif / Anticipation</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {congesAffiches.map(c => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                        c.type === 'CP' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        c.type === 'RECUP' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {c.type === 'CP' ? 'Congés Payés' : c.type === 'RECUP' ? 'Récupération' : 'Sans Solde'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-white/90">
                      {new Date(c.date_debut).toLocaleDateString('fr-FR')} → {new Date(c.date_fin).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-400">
                      {c.nb_jours} j
                    </td>
                    <td className="py-3 px-3 text-[10px] text-white/60">
                      {c.motif ? c.motif : c.anticipe ? 'Congés par anticipation' : '—'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(c.id)}
                        className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-xl border border-indigo-500/30 transition-all inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                        title="Télécharger le PDF ISA Group rempli"
                      >
                        <Download size={12} /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => openDeleteModal(c)}
                        className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all inline-flex items-center cursor-pointer"
                        title="Supprimer la demande"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-8 text-xs font-bold uppercase text-white/20">
            Aucun congé enregistré pour {selectedYear}.
          </p>
        )}
      </div>

      {/* =========================================================================
          6. MODALE DE CONFIRMATION DE SUPPRESSION (DESIGN SOMBRE GLASSMORPHISM)
          ========================================================================= */}
      {deleteModal.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={() => setDeleteModal({ show: false, congeId: null, congeInfo: null })}
          />
          
          <div className="relative bg-[#121214] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl z-10 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/10">
              <Trash2 size={24} />
            </div>

            <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
              Supprimer cette demande ?
            </h3>
            
            <p className="text-xs text-white/60 leading-relaxed mb-6">
              Voulez-vous vraiment annuler votre congé du <strong className="text-white">{new Date(deleteModal.congeInfo?.date_debut).toLocaleDateString('fr-FR')}</strong> au <strong className="text-white">{new Date(deleteModal.congeInfo?.date_fin).toLocaleDateString('fr-FR')}</strong> (<span className="text-emerald-400 font-bold">{deleteModal.congeInfo?.nb_jours} jours</span>) ?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDeleteModal({ show: false, congeId: null, congeInfo: null })}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Annuler
              </button>
              
              <button
                type="button"
                onClick={confirmDeleteConge}
                className="py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/25 transition-all cursor-pointer active:scale-95"
              >
                Supprimer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}