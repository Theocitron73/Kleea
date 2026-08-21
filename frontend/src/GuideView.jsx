import React, { useState, useMemo } from 'react';
import { 
  BookOpen, LayoutDashboard, Settings2, FileUp, ChartCandlestick, 
  Wallet, Users2, Palette, Search, ChevronRight, X, AlertCircle,
  Database, UploadCloud, Brain, List, Plus, Edit3, Calendar, Trash2, 
  Tag, ArrowUpDown, Target, Calculator, StickyNote
} from 'lucide-react';

export default function GuideView({ userTheme, setActiveTab }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeChapter, setActiveChapter] = useState("all");

  const colorPrimary = userTheme?.color_patrimoine || "#6366f1";

  // Base de données fusionnée des chapitres de documentation
  const chapters = [
    {
      id: "fondations",
      title: "1. Les Fondations",
      subtitle: "Comptes & Imports CSV",
      icon: Database,
      color: "text-blue-400",
      bg: "bg-blue-500/5",
      border: "border-blue-500/20",
      content: [
        {
          type: "card",
          title: "La Page Comptes",
          icon: Wallet,
          list: [
            { label: "Création", desc: "Définissez vos comptes (CCP, Livrets, etc.), leur solde initial et assignez-les à un Groupe/Profil (ex: Perso, Pro, Commun)." },
            { label: "Sélecteur de Type", desc: "Le sélecteur de type pré-remplit et verrouille automatiquement le préfixe dans le nom de votre compte (ex: 'LEP - ') pour qu'il soit impossible à modifier par erreur." },
            { label: "Objectifs d'épargne", desc: "Saisissez une cible financière. Le Dashboard calculera automatiquement votre progression sous forme de jauge." },
            { label: "Personnalisation", desc: "Modifiez la couleur de chaque compte d'un simple clic sur sa pastille colorée. C'est cette couleur qui représentera le compte sur tous les graphiques." }
          ]
        },
        {
          type: "card",
          title: "Le Moteur d'Importation",
          icon: UploadCloud,
          list: [
            { label: "Glisser-Déposer / CSV", desc: "Récupérez le fichier CSV fourni par votre banque et glissez-le dans la zone dédiée de l'onglet d'importation." },
            { label: "Guide des banques", desc: "Un bouton '?' en haut à droite vous explique comment extraire un CSV propre depuis Boursorama, Crédit Agricole, Revolut, etc." },
            { label: "Liaison Bancaire Powens", desc: "Connectez et centralisez vos banques réelles de manière sécurisée en API. Associez vos comptes Powens à vos comptes locaux Kleea pour synchroniser vos soldes en temps réel." },
            { label: "Validation des doublons", desc: "Le système sépare visuellement vos nouvelles transactions de celles déjà importées pour éviter tout doublon dans votre historique." }
          ]
        }
      ]
    },
    {
      id: "controle",
      title: "2. Le Centre de Contrôle",
      subtitle: "Page Gérer & Intelligence",
      icon: Settings2,
      color: "text-purple-400",
      bg: "bg-purple-500/5",
      border: "border-purple-500/20",
      content: [
        {
          type: "card-large",
          title: "Le Tableau d'Édition",
          icon: List,
          desc: "C'est ici que vous gérez vos flux financiers au quotidien. Le tableau et les fiches mobiles sont entièrement interactifs :",
          items: [
            { icon: Plus, title: "Ajout Manuel", desc: "Utilisez le bouton 'Ajouter une transaction' pour saisir instantanément un achat en espèces ou une opération non présente sur votre CSV." },
            { icon: Edit3, title: "Édition Rapide (PC & Mobile)", desc: "Sur ordinateur, cliquez sur une cellule pour modifier. Sur mobile, touchez simplement une carte pour ouvrir un tiroir d'édition (Bottom Sheet) pour modifier montant, date, compte ou catégorie." },
            { icon: Calendar, title: "Changement de mois", desc: "Vous pouvez réaffecter une dépense à un autre mois. Très utile pour une dépense effectuée le 30 du mois que vous souhaitez imputer au budget du mois suivant." },
            { icon: Trash2, title: "Sélection multiple", desc: "Utilisez les cases à cocher à gauche des lignes pour supprimer plusieurs transactions d'un coup via le menu contextuel qui apparaît en bas de l'écran." }
          ]
        },
        {
          type: "brain-card",
          title: "Le Système Kleea Brain & Catégories",
          icon: Brain,
          desc: "L'application apprend de vous. Dans la barre de droite (ou l'onglet Intelligence sur mobile), configurez l'apprentissage par mots-clés :",
          extra: "Dès lors, si vous recatégorisez un libellé (ex: 'Uber') en 'Alimentation', le système mémorisera cette association. Au prochain import CSV, tous les futurs 'Uber' seront automatiquement classés dans la bonne catégorie !"
        },
        {
          type: "rule-box",
          title: "Règle de Transfert Interne",
          icon: ArrowUpDown,
          desc: "Pour que les virements entre vos propres comptes ne soient pas comptés comme des dépenses réelles, respectez strictement ce format avec cet émoji :",
          code: "🔄 Virement : Compte A VERS Compte B"
        },
        {
          type: "card",
          title: "Limites Budgétaires",
          icon: Target,
          list: [
            { label: "Plafonds par catégorie", desc: "Fixez un plafond maximum pour une catégorie donnée sur un mois précis (ex: 200€ de Courses en Février)." },
            { label: "Alertes néon", desc: "Des jauges de progression apparaîtront sur votre Dashboard, virant au rouge si vous dépassez le montant alloué." },
            { label: "Indépendance", desc: "Les limites sont indépendantes par mois pour s'adapter à vos imprévus." }
          ]
        }
      ]
    },
    {
      id: "analyse",
      title: "3. L'Analyse Globale",
      subtitle: "Page Dashboard",
      icon: LayoutDashboard,
      color: "text-orange-400",
      bg: "bg-orange-500/5",
      border: "border-orange-500/20",
      content: [
        {
          type: "grid-3",
          title: "Structure du Dashboard",
          blocks: [
            {
              title: "A. Flux Mensuel",
              desc: "Résume ce qui est entré et sorti sur le mois sélectionné. L'onglet 'Catégories' génère un graphique en barre horizontal de vos dépenses avec flèches d'évolution."
            },
            {
              title: "B. Bilan Annuel",
              desc: "Un tableau mois par mois calculant automatiquement votre Net Épargné et votre Taux d'effort (pourcentage de revenus mis de côté). Comprend un graphique d'analyse par émojis."
            },
            {
              title: "C. Tendances & Enveloppes",
              desc: "Le panneau latéral offre une vue puissante : courbes de patrimoine annuel cumulé, allocation virtuelle en enveloppes (Provision Impôts, Vacances) et calcul de faisabilité de projets."
            }
          ]
        }
      ]
    },
    {
      id: "previsionnel",
      title: "4. Le Prévisionnel",
      subtitle: "La Machine à Voyager dans le Temps",
      icon: ChartCandlestick,
      color: "text-pink-400",
      bg: "bg-pink-500/5",
      border: "border-pink-500/20",
      content: [
        {
          type: "card",
          title: "Anticipez vos soldes futurs",
          icon: Calendar,
          list: [
            { label: "Projections holographiques", desc: "Saisissez vos dépenses et revenus récurrents à venir (loyer, salaires, abonnements). L'application génère des soldes estimés à la fin du mois." },
            { label: "Simulation dynamique", desc: "Dans le tableau annuel, activez ou désactivez temporairement des mois de projection pour voir l'impact immédiat sur votre épargne de fin d'année." },
            { label: "Bouton d'activation Œil", desc: "Désactivez temporairement une ligne de transaction spécifique de vos calculs prévisionnels d'un simple clic pour simuler différents scénarios." }
          ]
        }
      ]
    },
    {
      id: "outils",
      title: "5. Outils Avancés & Tricount",
      subtitle: "Le couteau suisse financier",
      icon: Users2,
      color: "text-amber-500",
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      content: [
        {
          type: "card",
          title: "Module Tricount",
          icon: Users2,
          list: [
            { label: "Indépendance", desc: "Idéal pour les colocations, les vacances ou les sorties. Ce module est totalement séparé de vos statistiques personnelles de patrimoine." },
            { label: "Gestion des membres", desc: "Ajoutez des participants et attribuez-leur un émoji d'avatar dynamique." },
            { label: "Répartitions inégales", desc: "Saisissez une dépense et choisissez de la diviser équitablement ou en parts asymétriques précises pour chaque membre." },
            { label: "Bilan & PDF", desc: "L'algorithme calcule le remboursement de dettes croisées le plus optimisé. Générez le rapport au format PDF global ou individuel." },
            { label: "Lien de partage public", desc: "Copiez un lien sécurisé d'un clic. Vos proches peuvent ajouter ou éditer des dépenses sans posséder de compte sur l'application." }
          ]
        },
        {
          type: "widgets-list",
          title: "Widgets Flottants & Paramètres",
          items: [
            { icon: Calculator, title: "Prorata Calculateur", desc: "Un outil pour calculer la répartition équitable d'une dépense commune (ex: loyer du couple) basée sur les revenus respectifs de chacun." },
            { icon: StickyNote, title: "Bloc-notes Auto-save", desc: "Un pense-bête persistant lié à votre profil pour noter vos investissements ou rappels financiers sans quitter l'écran." },
            { icon: Palette, title: "Studio de Design & Menu", desc: "Personnalisez votre interface. Modifiez les couleurs des revenus/dépenses, l'intensité du flou (Glass) et l'arrondi. Pour Théo, activez ou désactivez dynamiquement l'affichage des pages sur les menus." }
          ]
        }
      ]
    }
  ];

  // Filtrage intelligent selon la recherche et le chapitre sélectionné
  const filteredChapters = useMemo(() => {
    return chapters
      .filter(ch => activeChapter === "all" || ch.id === activeChapter)
      .map(ch => {
        const filteredContent = ch.content.filter(item => {
          const matchTitle = ch.title.toLowerCase().includes(searchTerm.toLowerCase());
          const matchSub = ch.subtitle.toLowerCase().includes(searchTerm.toLowerCase());
          const matchBlockTitle = item.title?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchDesc = item.desc?.toLowerCase().includes(searchTerm.toLowerCase());
          
          let matchInner = false;
          if (item.list) {
            matchInner = item.list.some(l => l.label.toLowerCase().includes(searchTerm.toLowerCase()) || l.desc.toLowerCase().includes(searchTerm.toLowerCase()));
          }
          if (item.items) {
            matchInner = item.items.some(i => i.title.toLowerCase().includes(searchTerm.toLowerCase()) || i.desc.toLowerCase().includes(searchTerm.toLowerCase()));
          }
          if (item.blocks) {
            matchInner = item.blocks.some(b => b.title.toLowerCase().includes(searchTerm.toLowerCase()) || b.desc.toLowerCase().includes(searchTerm.toLowerCase()));
          }

          return matchTitle || matchSub || matchBlockTitle || matchDesc || matchInner;
        });
        return { ...ch, content: filteredContent };
      })
      .filter(ch => ch.content.length > 0);
  }, [searchTerm, activeChapter]);

  return (
    <div className="h-full w-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500 overflow-hidden px-1 py-1">
      
      {/* 1. SOMMAIRE INTERACTIF (Gauche) */}
      <div className="w-full lg:w-64 bg-[var(--glass-bg)] backdrop-blur-[var(--glass-blur)] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shrink-0 shadow-xl h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
          <BookOpen size={16} style={{ color: colorPrimary }} />
          <h3 className="text-[10px] font-black uppercase text-white/50 tracking-[0.2em]">Sommaire</h3>
        </div>

        {/* Barre de recherche */}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input 
            type="text"
            placeholder="Rechercher une aide..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-7 py-2 text-xs font-bold text-white outline-none placeholder:text-white/20"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Boutons Chapitres */}
        <div className="flex flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar flex-row lg:flex-col pb-2 lg:pb-0 select-none">
          <button
            onClick={() => setActiveChapter("all")}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between shrink-0 ${
              activeChapter === "all" ? "bg-white text-slate-900 font-black shadow-md" : "text-white/40 hover:bg-white/5"
            }`}
          >
            <span>📖 Tout afficher</span>
            <ChevronRight size={10} className="hidden lg:block opacity-40" />
          </button>

          {chapters.map(ch => {
            const Icon = ch.icon;
            const isCurrent = activeChapter === ch.id;
            return (
              <button
                key={ch.id}
                onClick={() => setActiveChapter(ch.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between shrink-0 ${
                  isCurrent ? "bg-white text-slate-900 font-black shadow-md" : "text-white/40 hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={12} className={isCurrent ? "text-slate-900" : ch.color} />
                  <span className="truncate">{ch.title.substring(3)}</span>
                </div>
                <ChevronRight size={10} className="hidden lg:block opacity-40" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. ZONE DE LECTURE (Droite) */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-8 max-h-[calc(100vh-230px)] lg:max-h-[calc(100vh-170px)] pb-16">
        
        {/* INTRO HERO (S'affiche uniquement en mode "Tout afficher" et sans recherche en cours) */}
        {activeChapter === "all" && !searchTerm && (
          <div className="relative p-8 md:p-10 rounded-3xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 overflow-hidden text-center flex flex-col items-center animate-in fade-in duration-500">
            <div className="absolute top-[-50%] left-[-10%] w-[50%] h-[150%] bg-[var(--primary)]/10 blur-[100px] rounded-full pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-white mb-4 relative z-10 leading-none">
              Maîtrisez <span className="text-[var(--primary)] italic">Kleea</span>
            </h2>
            <p className="text-white/50 text-xs md:text-sm max-w-2xl font-medium leading-relaxed relative z-10">
              Découvrez comment exploiter chaque module de votre écosystème financier. De l'importation automatisée par l'apprentissage intelligent jusqu'aux projections annuelles et enveloppes virtuelles.
            </p>
          </div>
        )}

        {/* BOUCLE DYNAMIQUE DES CHAPITRES */}
        {filteredChapters.length > 0 ? (
          filteredChapters.map(ch => {
            const Icon = ch.icon;
            return (
              <div key={ch.id} className="space-y-6">
                
                {/* Séparateur/En-tête de chapitre */}
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${ch.bg} ${ch.border}`}>
                    <Icon size={22} className={ch.color} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight text-white">{ch.title}</h3>
                    <p className={`${ch.color}/60 text-[10px] font-black uppercase tracking-widest mt-0.5`}>{ch.subtitle}</p>
                  </div>
                </div>

                {/* Blocs de contenu */}
                <div className="grid grid-cols-1 gap-6">
                  {ch.content.map((block, bIdx) => {
                    const BlockIcon = block.icon;

                    // CAS 1 : CARTE STANDARD DE LISTE (ex: Page Comptes, Importation, Prévisionnel)
                    if (block.type === "card") {
                      return (
                        <div key={bIdx} className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] hover:bg-white/[0.03] transition-all">
                          {BlockIcon && <BlockIcon className={`${ch.color} mb-4`} size={24} />}
                          <h4 className="text-white font-bold text-sm uppercase mb-4">{block.title}</h4>
                          <ul className="space-y-4 text-xs text-white/50 leading-relaxed">
                            {block.list.map((li, lIdx) => (
                              <li key={lIdx}>
                                <strong className="text-white font-black uppercase tracking-wider block mb-0.5">• {li.label} :</strong>
                                <span className="text-[12px]">{li.desc}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    }

                    // CAS 2 : GRAND CONTENEUR DE DETAILS (ex: Tableau d'Édition)
                    if (block.type === "card-large") {
                      return (
                        <div key={bIdx} className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] relative overflow-hidden">
                          {BlockIcon && <BlockIcon className={`${ch.color} mb-4`} size={24} />}
                          <h4 className="text-white font-bold text-sm uppercase mb-3">{block.title}</h4>
                          <p className="text-white/50 text-xs leading-relaxed mb-4">{block.desc}</p>
                          <ul className="space-y-4 text-xs text-white/40">
                            {block.items.map((it, iIdx) => {
                              const ItemIcon = it.icon;
                              return (
                                <li key={iIdx}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <ItemIcon size={12} className={ch.color} />
                                    <strong className="text-white font-black uppercase tracking-tighter">{it.title} :</strong>
                                  </div>
                                  <p className="ml-5 text-[12px] leading-relaxed">{it.desc}</p>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    }

                    // CAS 3 : CARTES SYSTEME INTUITIVES (ex: Kleea Brain)
                    if (block.type === "brain-card") {
                      return (
                        <div key={bIdx} className={`p-6 rounded-[2rem] border ${ch.border} ${ch.bg} shadow-[0_0_30px_rgba(168,85,247,0.02)]`}>
                          {BlockIcon && <BlockIcon className={`${ch.color} mb-4`} size={24} />}
                          <h4 className="text-white font-bold text-sm uppercase mb-3">{block.title}</h4>
                          <p className="text-white/50 text-xs leading-relaxed mb-3">{block.desc}</p>
                          <p className="text-white/60 text-xs font-semibold leading-relaxed">{block.extra}</p>
                        </div>
                      );
                    }

                    // CAS 4 : CARTES DE RÈGLES DE TRANSFERT AVEC CONTEXTE DE CODE
                    if (block.type === "rule-box") {
                      return (
                        <div key={bIdx} className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] flex flex-col justify-between">
                          <div>
                            {BlockIcon && <BlockIcon className="text-white/40 mb-3" size={20} />}
                            <h4 className="text-white font-bold text-sm uppercase mb-2">{block.title}</h4>
                            <p className="text-white/50 text-xs leading-relaxed mb-4">{block.desc}</p>
                          </div>
                          <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-2xl">
                            <code className="text-blue-300 font-mono text-[11px] block bg-black/30 p-2.5 rounded border border-white/5">
                              {block.code}
                            </code>
                          </div>
                        </div>
                      );
                    }

                    // CAS 5 : GRILLE DE BLOCS D'ANALYSES (ex: Dashboard A, B, C)
                    if (block.type === "grid-3") {
                      return (
                        <div key={bIdx} className="space-y-4">
                          <h4 className="text-white font-bold text-sm uppercase px-1">{block.title}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {block.blocks.map((bl, blIdx) => (
                              <div key={blIdx} className="bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                                <h5 className={`${ch.color} font-black text-xs uppercase mb-2 tracking-wider`}>{bl.title}</h5>
                                <p className="text-white/50 text-[11.5px] leading-relaxed">{bl.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    // CAS 6 : GESTION DES WIDGETS AVEC ICONS
                    if (block.type === "widgets-list") {
                      return (
                        <div key={bIdx} className="bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] flex flex-col justify-center">
                          <h4 className="text-white font-bold text-sm uppercase mb-5">{block.title}</h4>
                          <div className="space-y-5">
                            {block.items.map((it, itIdx) => {
                              const WidgetIcon = it.icon;
                              return (
                                <div key={itIdx} className="flex items-start gap-3">
                                  <div className="p-2 bg-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/20 shrink-0 text-[var(--primary)]">
                                    <WidgetIcon size={14} />
                                  </div>
                                  <div>
                                    <strong className="text-white text-xs block uppercase mb-1">{it.title}</strong>
                                    <span className="text-white/40 text-[11.5px] leading-relaxed block">{it.desc}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>

              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/5 rounded-3xl text-center">
            <AlertCircle size={24} className="text-white/20 mb-2" />
            <p className="text-[10px] text-white/40 uppercase font-black">Aucun résultat</p>
            <p className="text-[9px] text-white/20 uppercase font-bold mt-1">Recherchez d'autres mots-clés dans le sommaire.</p>
          </div>
        )}

        {/* BOUTON RETOUR DASHBOARD (Bas du guide) */}
        {activeChapter === "all" && !searchTerm && (
          <div className="pt-10 border-t border-white/5 text-center">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="px-8 py-3 bg-white text-black font-black uppercase text-[10px] tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.15)]"
            >
              Retourner au Dashboard
            </button>
          </div>
        )}

      </div>

    </div>
  );
}