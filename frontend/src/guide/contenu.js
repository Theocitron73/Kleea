import {
  ChartCandlestick, FileUp, Gamepad2, HelpCircle, LayoutDashboard, PiggyBank, Settings2, UserCog, Users2, Wallet,
} from 'lucide-react';

// Contenu du guide. Chaque libellé entre guillemets correspond à un texte réellement affiché dans l'application.

export const PREMIERS_PAS = [
  {
    id: 'mode',
    titre: "Choisir votre mode d'import",
    duree: '1 min',
    pourquoi: "C'est la première décision : elle détermine comment vos opérations arrivent dans Kleea. Vous pourrez en changer à tout moment.",
    etapes: [
      "À votre première connexion, la fenêtre « Bienvenue sur Kleea » vous propose deux modes.",
      "« Synchronisation Automatique » : vos banques sont reliées et les opérations arrivent sans action de votre part.",
      "« Mode Manuel » : vous décidez quand importer, par fichier CSV ou depuis vos banques reliées.",
    ],
    conseil: "Pour changer plus tard : « Profil » puis « Mode d'importation Global ».",
    page: 'profile',
    pageLibelle: 'Ouvrir mon profil',
  },
  {
    id: 'comptes',
    titre: 'Créer vos comptes',
    duree: '3 min',
    pourquoi: "Kleea a besoin d'un compte par compte réel (courant, Livret A…) pour y ranger les opérations et calculer vos soldes, même si votre banque est connectée.",
    etapes: [
      "Ouvrez la page « Comptes ».",
      "Choisissez le type, donnez un nom et un groupe (« Perso », « Commun »…). Le groupe sert de profil de filtre dans toute l'application.",
      "Indiquez le solde initial si vous le connaissez, sinon laissez 0 : vous l'ajusterez à l'étape 5.",
      "Pour un livret, renseignez le taux d'intérêt. Cliquez sur « Créer ».",
    ],
    page: 'comptes',
    pageLibelle: 'Ouvrir Comptes',
  },
  {
    id: 'banque',
    titre: 'Connecter une banque ou préparer un fichier',
    duree: '5 min',
    pourquoi: 'Choisissez ce qui vous convient : la connexion évite les téléchargements, le fichier ne demande aucune connexion.',
    etapes: [
      "Avec connexion : page « Importer », bouton « Connecter un compte », puis suivez les écrans sécurisés de Powens. Vous revenez ensuite sur la page « Comptes ».",
      "Sur chaque carte de compte, choisissez le compte bancaire correspondant dans « Liaison bancaire ».",
      "Avec fichier : téléchargez un CSV, OFX, QIF ou QFX depuis le site de votre banque. Le bouton « Guide Export CSV » de la page « Importer » indique où le trouver pour les principales banques.",
    ],
    page: 'importer',
    pageLibelle: 'Ouvrir Importer',
  },
  {
    id: 'import',
    titre: 'Importer vos premières opérations',
    duree: '3 min',
    pourquoi: "Kleea vous montre tout avant d'enregistrer : rien n'entre sans votre validation en mode manuel.",
    etapes: [
      "Page « Importer » : choisissez le « Compte de destination », puis déposez votre fichier. Pour une banque reliée, utilisez « Synchroniser ».",
      "Vérifiez l'aperçu : les lignes « Nouveau » seront ajoutées, celles marquées « Déjà importé (Ignoré) » ne le seront pas.",
      "Corrigez une catégorie si besoin, puis cliquez sur « Importer ».",
    ],
    conseil: "En mode automatique, cette étape se fait toute seule à l'ouverture de Kleea.",
    page: 'importer',
    pageLibelle: 'Ouvrir Importer',
  },
  {
    id: 'solde',
    titre: 'Caler vos soldes sur la réalité',
    duree: '2 min',
    pourquoi: "Vos opérations ne remontent pas forcément jusqu'à l'ouverture du compte. Cette étape aligne Kleea sur votre banque.",
    etapes: [
      "Page « Comptes », sur la carte du compte : cliquez sur « Ajuster » à côté de « Solde initial ».",
      "Saisissez le solde affiché aujourd'hui par votre banque.",
      "Kleea en déduit le solde initial à partir des opérations déjà importées.",
    ],
    page: 'comptes',
    pageLibelle: 'Ouvrir Comptes',
  },
  {
    id: 'virements',
    titre: 'Vérifier les virements entre vos comptes',
    duree: '2 min',
    pourquoi: "Un virement de votre compte courant vers votre livret n'est ni une dépense ni un revenu. S'il est mal classé, vos bilans seront faussés.",
    etapes: [
      "Page « Gérer », cherchez un virement interne.",
      "Donnez-lui une catégorie de virement, de la forme « Virement : CCP vers Livret A » : elle sera comptée comme un transfert.",
      "Astuce : renseignez l'IBAN de vos livrets non connectés sur leur carte de compte, pour que Kleea reconnaisse ces virements tout seul.",
    ],
    page: 'gerer',
    pageLibelle: 'Ouvrir Gérer',
  },
  {
    id: 'apprentissage',
    titre: 'Apprendre à Kleea à classer',
    duree: '3 min',
    pourquoi: 'Quelques minutes ici vous évitent de reclasser les mêmes opérations chaque mois.',
    etapes: [
      "Page « Gérer » : activez l'interrupteur « Apprentissage ».",
      "Changez la catégorie d'une opération : Kleea la mémorise et reclasse aussi les opérations portant le même libellé.",
      "Pour des règles plus larges, ajoutez des mots-clés dans l'onglet « Intelligence » de la page « Importer ».",
    ],
    conseil: "L'apprentissage est désactivé par défaut : pensez à l'activer avant de reclasser.",
    page: 'gerer',
    pageLibelle: 'Ouvrir Gérer',
  },
  {
    id: 'lire',
    titre: 'Lire votre dashboard et préparer la suite',
    duree: '5 min',
    pourquoi: "Vos données sont prêtes : c'est ici que Kleea devient utile au quotidien.",
    etapes: [
      "Page « Dashboard » : choisissez le profil, le mois et l'année en haut de page.",
      "Consultez le « Flux mensuel », le « Bilan Annuel » et l'« Analytique ».",
      "Ajoutez vos dépenses à venir dans « Prévisionnel » et fixez vos limites dans « Gérer » pour suivre vos budgets.",
    ],
    page: 'dashboard',
    pageLibelle: 'Ouvrir le Dashboard',
  },
];

export const CHAPITRES = [
  {
    id: 'comptes',
    titre: 'Comptes',
    sousTitre: 'Le socle de vos données',
    icone: Wallet,
    page: 'comptes',
    intro: "Chaque compte Kleea représente un compte réel. Il porte le solde initial, la couleur utilisée sur les graphiques, le taux d'intérêt, l'objectif et la liaison bancaire.",
    sections: [
      {
        titre: 'Créer un compte',
        etapes: [
          "Dans le formulaire « Nouveau Compte », choisissez le type : il préremplit le début du nom.",
          "Renseignez le nom, le groupe, le solde initial et, pour un livret, le taux d'intérêt.",
          "Choisissez une teinte et, si besoin, liez le compte dans « -- Liste Powens -- » ou collez son IBAN.",
          "Cliquez sur « Créer ».",
        ],
      },
      {
        titre: 'Régler un compte existant',
        points: [
          { l: 'Groupe', d: "Modifiable sur la carte. Le groupe sert de profil de filtre sur le Dashboard, dans Gérer et dans le Prévisionnel." },
          { l: 'Ajuster', d: "Calcule le solde initial à partir du solde réel que vous saisissez et des opérations déjà importées." },
          { l: 'Objectif', d: "Montant cible du compte, utilisé pour votre objectif d'épargne sur le Dashboard." },
          { l: 'Intérêt %', d: "Sert à estimer les intérêts gagnés, affichés sur la carte du compte au Dashboard." },
          { l: 'Couleur', d: "Représente le compte sur les cartes et les graphiques." },
        ],
      },
      {
        titre: 'Liaison bancaire',
        points: [
          { l: 'Compte connecté', d: "Choisissez le compte dans « Lier un compte Powens connecté » : ses opérations arriveront sur ce compte Kleea. « Délier » retire l'association." },
          { l: 'IBAN manuel', d: "Pour un livret non connecté, collez son IBAN ou son numéro. Kleea reconnaît alors les virements vers ce compte. « Retirer » supprime l'IBAN." },
        ],
        conseil: "Les IBAN sont chiffrés avant d'être enregistrés.",
      },
    ],
  },
  {
    id: 'importer',
    titre: 'Importer',
    sousTitre: 'Fichiers, banques et mots-clés',
    icone: FileUp,
    page: 'importer',
    intro: "Deux façons de faire entrer vos opérations : un fichier téléchargé depuis votre banque, ou la connexion bancaire Powens. Les deux passent par la détection des doublons.",
    sections: [
      {
        titre: 'Importer un fichier',
        etapes: [
          "Téléchargez un fichier CSV, OFX, QIF ou QFX depuis votre banque.",
          "Choisissez le « Compte de destination » et déposez le fichier.",
          "Contrôlez l'aperçu : onglets « Revenus », « Dépenses » et « Transferts », catégories proposées et doublons.",
          "Cliquez sur « Importer ».",
        ],
        points: [
          { l: 'Guide Export CSV', d: "Indique le chemin d'export pour La Banque Postale, BoursoBank, Revolut, Banque Populaire, Crédit Agricole, BNP / LCL et Société Générale." },
          { l: 'Déjà importé (Ignoré)', d: "Cette ligne existe déjà dans Kleea : elle ne sera pas ajoutée." },
          { l: 'Doublon', d: "Plusieurs lignes semblent identiques : vérifiez-les avant d'importer." },
        ],
      },
      {
        titre: 'Connecter une banque avec Powens',
        etapes: [
          "Cliquez sur « Connecter un compte » puis suivez les écrans de Powens, le service de connexion bancaire.",
          "De retour dans Kleea, sur la page « Comptes », associez chaque compte bancaire à un compte Kleea.",
          "En mode manuel, revenez sur « Importer » et utilisez « Synchroniser » : choisissez le compte et la période à importer.",
        ],
        points: [
          { l: 'Nouvelles / À jour', d: "Indique si des opérations attendent d'être importées pour ce compte." },
          { l: 'Actualisation', d: "Le bouton d'actualisation demande à vos banques leurs opérations les plus récentes." },
          { l: 'Connexion à renouveler', d: "Les banques redemandent régulièrement une authentification. Kleea affiche alors une fenêtre pour reconnecter la banque." },
        ],
      },
      {
        titre: 'Mode automatique',
        texte: "Vos opérations sont importées à l'ouverture de Kleea et une fois par jour en arrière-plan. Il suffit que le compte soit lié et que la banque n'attende pas de nouvelle authentification. Le choix du mode se fait dans « Profil ».",
      },
      {
        titre: 'Mots-clés et classement automatique',
        texte: "L'onglet « Intelligence » contient le lexique : les mots-clés qui attribuent une catégorie aux opérations à l'import.",
        etapes: [
          "Choisissez la catégorie dans « Cible d'apprentissage ».",
          "Ajoutez un mot-clé dans « Nouvel apprentissage ». Vous pouvez aussi le prendre directement dans un libellé de l'aperçu.",
          "Limitez-le au besoin aux « Crédits » ou aux « Débits ».",
        ],
      },
    ],
  },
  {
    id: 'gerer',
    titre: 'Gérer',
    sousTitre: 'Historique, catégories et budgets',
    icone: Settings2,
    page: 'gerer',
    intro: "Le centre de contrôle au quotidien : retrouver, corriger, classer et diviser vos opérations, organiser vos catégories et fixer vos budgets.",
    sections: [
      {
        titre: 'Retrouver et corriger une opération',
        points: [
          { l: 'Filtres et recherche', d: "Filtrez par profil, compte, mois et année, ou cherchez un libellé." },
          { l: 'Modifier', d: "Sur ordinateur, modifiez directement dans le tableau. Sur mobile, touchez l'opération pour ouvrir « Éditer la transaction »." },
          { l: 'Mois affecté', d: "Rattachez une opération à un autre mois : pratique pour un salaire reçu le 30 mais destiné au mois suivant." },
          { l: 'Prévision et enveloppe', d: "Reliez une opération à une prévision pour la marquer comme réalisée, ou à une enveloppe d'épargne pour suivre ce qu'elle consomme." },
          { l: 'Sélection multiple', d: "Cochez plusieurs lignes : une barre apparaît en bas de l'écran pour les supprimer." },
          { l: 'Exporter', d: "Téléchargez vos opérations en Excel (avec bilan et catégories) ou en CSV, pour la période et le profil de votre choix." },
        ],
      },
      {
        titre: 'Ajouter une opération à la main',
        texte: "« Nouvelle Transaction » sert aux dépenses absentes de vos relevés, comme un paiement en espèces. Renseignez le libellé, le montant, la date et la catégorie.",
      },
      {
        titre: 'Diviser une opération',
        texte: "Un même paiement peut couvrir plusieurs catégories, par exemple des courses et un cadeau.",
        etapes: [
          "Cliquez sur « Diviser cette transaction ».",
          "Ajoutez une ligne par sous-catégorie. « Équilibrer » ajuste la dernière ligne pour que le total reste juste.",
          "Pour revenir en arrière, utilisez « Annuler la division » : l'opération d'origine est restaurée.",
        ],
      },
      {
        titre: 'Catégories',
        points: [
          { l: 'Créer', d: "Donnez un nom, une icône et une couleur." },
          { l: 'Ranger', d: "« Gérer mes catégories » permet de les classer par groupe." },
          { l: 'Masquer', d: "Masquez une catégorie que vous n'utilisez pas : elle disparaît des listes sans être supprimée." },
        ],
      },
      {
        titre: 'Apprentissage',
        texte: "Avec l'interrupteur « Apprentissage » activé, changer la catégorie d'une opération mémorise ce libellé et reclasse les opérations identiques. Retrouvez ces règles dans la « Base Mémoire », d'où vous pouvez les supprimer.",
        attention: "L'interrupteur est désactivé par défaut. Une fois activé, il agit sur toutes les opérations au même libellé.",
      },
      {
        titre: 'Virements entre vos comptes',
        texte: "Une opération est comptée comme un transfert, et non comme une dépense, si sa catégorie commence par « Virement : », par exemple « Virement : CCP vers Livret A ». C'est aussi le cas si son libellé ou sa catégorie contient « 🔄 », « TRANSFERT » ou « VERS ».",
      },
      {
        titre: 'Budgets',
        etapes: [
          "Dans « Objectifs Budget », choisissez le compte, le mois et la catégorie.",
          "Indiquez le montant limite et cliquez sur « Fixer le budget ».",
          "Suivez votre consommation dans « Suivi Budgets » et sur le Dashboard.",
        ],
        conseil: "Chaque budget vaut pour un mois : vous pouvez ainsi l'adapter à vos imprévus.",
      },
    ],
  },
  {
    id: 'dashboard',
    titre: 'Dashboard',
    sousTitre: 'Comprendre vos finances',
    icone: LayoutDashboard,
    page: 'dashboard',
    intro: "La vue d'ensemble de votre patrimoine et de vos flux. Tout se règle avec les filtres de profil, de mois et d'année en haut de page ; la molette de la souris les fait aussi défiler.",
    sections: [
      {
        titre: 'Vos comptes et votre patrimoine',
        texte: "Les cartes affichent le solde de chaque compte pour la période choisie, et le solde prévu pour un mois à venir. Faites-les glisser pour changer leur ordre.",
      },
      {
        titre: 'Flux mensuel',
        points: [
          { l: 'Revenus, Dépenses, Transferts', d: "Le détail des opérations du mois, avec recherche." },
          { l: 'Catégories', d: "La répartition de vos dépenses par catégorie." },
          { l: 'Variations', d: "Ce qui a changé par rapport à une autre période." },
          { l: 'Insights', d: "Une opportunité d'économie, des indicateurs de vos habitudes et un assistant à qui poser vos questions." },
        ],
        attention: "Les analyses par IA et l'assistant passent par un service externe : les données utiles à la réponse lui sont transmises.",
      },
      {
        titre: 'Abonnements',
        texte: "L'onglet Abonnements du « Flux mensuel » repère vos dépenses récurrentes dans tout l'historique du profil choisi : abonnements, assurances, loyer par virement, factures régulières. Il affiche leur coût par mois et par an.",
        points: [
          { l: 'Détection', d: "Il faut au moins trois prélèvements réguliers d'un montant proche, ou deux pour un abonnement semestriel ou annuel. Les courses, trop irrégulières, sont écartées." },
          { l: 'Signaux', d: "Kleea indique le prochain prélèvement attendu, les hausses de prix, les abonnements récents et ceux qui semblent arrêtés." },
          { l: 'Ajouter aux prévisions', d: "Le bouton en forme de calendrier crée les prévisions des échéances restantes de l'année, sans doubler celles qui existent déjà." },
          { l: 'Ignorer', d: "La croix retire une ligne qui n'est pas une dépense récurrente. Ce choix est enregistré sur votre compte, et vous pouvez la réafficher depuis le bas de la liste." },
        ],
        conseil: "Quand le prélèvement réel arrive, reliez-le à sa prévision dans la page Gérer : le même montant n'est ainsi pas compté deux fois.",
      },
      {
        titre: 'Bilan Annuel',
        points: [
          { l: 'Tableau', d: "Pour chaque mois : revenus, dépenses, épargne et cumul, avec les mois à venir estimés grâce au Prévisionnel." },
          { l: 'Activité des dépenses', d: "Un calendrier de l'intensité de vos dépenses, jour après jour." },
          { l: 'Rétrospective (Wrapped)', d: "Les faits marquants de votre année : jour le plus coûteux, top des catégories, mois le plus calme…" },
        ],
      },
      {
        titre: 'Analytique',
        points: [
          { l: 'Mois', d: "La tendance des flux et l'évolution de vos comptes et de votre patrimoine au fil de l'année." },
          { l: 'Années', d: "Un récapitulatif année après année. Une nouvelle année s'ajoute d'elle-même dès qu'elle commence." },
        ],
      },
      {
        titre: 'Suivi des budgets',
        texte: "Les « Objectifs Budgétaires » montrent ce qui est consommé pour chaque limite fixée ce mois-ci.",
      },
    ],
  },
  {
    id: 'previsionnel',
    titre: 'Prévisionnel',
    sousTitre: 'Anticiper vos soldes',
    icone: ChartCandlestick,
    page: 'previsionnel',
    intro: "Saisissez ce qui va arriver (salaire, loyer, abonnements) pour connaître vos soldes de fin de mois et votre épargne de fin d'année, et être prévenu d'un découvert.",
    sections: [
      {
        titre: 'Ajouter une prévision',
        etapes: [
          "Dans « Nouvelle Prévision », indiquez la date, le libellé, le montant, la catégorie et le compte.",
          "Utilisez un montant négatif pour une dépense et positif pour un revenu.",
          "Cliquez sur « Ajouter ». Le « Solde Final Estimé » se met à jour.",
        ],
      },
      {
        titre: 'Répéter vos prévisions',
        points: [
          { l: 'Reconduire le mois', d: "Copie les prévisions du mois, ou seulement celles que vous avez cochées (« Reconduire la sélection »), vers le mois suivant." },
          { l: "Propager sur l'année", d: "Copie les prévisions cochées sur tous les mois restants de l'année." },
        ],
      },
      {
        titre: 'Simuler des scénarios',
        points: [
          { l: 'Désactiver une prévision', d: "L'icône en forme d'œil la retire des calculs sans la supprimer." },
          { l: 'Exclure un mois', d: "Dans « Projections », retirez un mois du calcul annuel pour en voir l'effet, puis utilisez « Réactiver tout »." },
          { l: 'Alerte de découvert', d: "Kleea signale les mois où le solde estimé passe sous zéro ou où les dépenses dépassent les revenus." },
        ],
      },
      {
        titre: 'Relier le prévu au réel',
        texte: "Quand l'opération réelle arrive, reliez-la à sa prévision dans la page « Gérer », colonne « Prévision ». Vous comparez ainsi le prévu et le réalisé, sans compter deux fois le même montant.",
      },
    ],
  },
  {
    id: 'epargne',
    titre: 'Épargne & Projets',
    sousTitre: 'Donner un but à votre épargne',
    icone: PiggyBank,
    page: 'dashboard',
    intro: "Depuis le panneau « Gestion Épargne & Projets » du Dashboard, répartissez votre épargne en enveloppes et vérifiez si vos projets sont réalisables.",
    sections: [
      {
        titre: 'Enveloppes',
        texte: "Une enveloppe réserve une partie de votre épargne pour un usage, par exemple « Urgence » ou « Vacances ». L'argent ne bouge pas de votre compte : c'est une réservation.",
        etapes: [
          "Dans « Nouvelle Enveloppe », indiquez un nom et un montant, puis cliquez sur « Allouer l'épargne ».",
          "Rattachez vos opérations à l'enveloppe depuis la page « Gérer » : son « Solde Restant » se met à jour.",
          "Surveillez le montant « Libre », c'est-à-dire ce qui n'est pas encore réservé.",
        ],
      },
      {
        titre: 'Projets futurs',
        etapes: [
          "Dans « Nouveau Projet Futur », saisissez le nom, le « Coût Cible », votre « Capacité / mois » et ce qui est « Déjà mis de côté ».",
          "Indiquez le mois de début et l'échéance visée, puis cliquez sur « Ajouter le projet ».",
          "Faites glisser vos projets pour changer leur ordre : le premier de la liste est financé en priorité.",
        ],
        points: [
          { l: 'Mode capacité stricte', d: "Limite strictement le prélèvement mensuel au montant que vous avez fixé." },
          { l: 'Faisable avant échéance', d: "Indique que votre rythme d'épargne permet d'atteindre le coût cible à temps." },
        ],
      },
    ],
  },
  {
    id: 'tricount',
    titre: 'Tricount',
    sousTitre: 'Partager des frais',
    icone: Users2,
    page: 'tricount',
    intro: "Pour une colocation, des vacances ou une sortie. Ce module est indépendant : il n'affecte ni vos soldes ni vos statistiques.",
    sections: [
      {
        titre: 'Démarrer un groupe',
        etapes: [
          "Cliquez sur « Nouveau » et nommez le groupe.",
          "Ajoutez les membres et choisissez leur émoji si vous le souhaitez.",
          "Dans « Nouvelle dépense », indiquez la désignation, la date, le montant et « Payé par ».",
          "Dans « Pour qui ? », cochez les personnes et saisissez leur part, ou utilisez « Répartir équitablement ».",
          "Cliquez sur « Enregistrer la dépense ». Le total des parts doit être égal au montant.",
        ],
      },
      {
        titre: 'Suivre et rembourser',
        points: [
          { l: 'Bilan des remboursements', d: "Indique qui donne à qui, avec un minimum de virements." },
          { l: 'Modifier une dépense', d: "Le crayon de l'historique ouvre la dépense. Le montant reste égal à la somme des parts." },
          { l: 'PDF', d: "« Bilan Complet (PDF) » pour tout le groupe, « Générer PDF Individuel » pour une personne." },
        ],
      },
      {
        titre: 'Partager avec vos proches',
        texte: "« Partager » ouvre la gestion du lien du groupe. Vos proches n'ont pas besoin de compte : ils voient le bilan et peuvent ajouter, modifier ou supprimer des dépenses.",
        points: [
          { l: 'Durée du lien', d: "Choisissez 7 jours, 30 jours, 90 jours ou 1 an. Passé ce délai, le lien ne s'ouvre plus et il faut en générer un nouveau. « Appliquer cette durée » change la limite du lien actif, à compter d'aujourd'hui." },
          { l: 'Liens déjà partagés', d: "Un lien créé avant l'arrivée des durées reste valable sans date limite, tant que vous ne lui choisissez pas de durée et que vous ne le révoquez pas." },
          { l: 'Révoquer ou remplacer', d: "« Révoquer le lien » le coupe aussitôt. « Générer un nouveau lien » le remplace : l'ancienne adresse cesse de fonctionner, et vos proches voient un message qui l'explique." },
          { l: 'Historique des modifications', d: "Dans la même fenêtre, retrouvez chaque ajout, modification ou suppression faite par le lien : quand, ancienne et nouvelle valeur, et le nom du participant s'il l'a saisi. Ni adresse IP ni lien n'y sont gardés, et vos propres changements n'y figurent pas." },
        ],
        attention: "Toute personne ayant un lien actif peut modifier les dépenses du groupe, et le nom saisi n'est pas vérifié. Ne le partagez qu'avec les personnes concernées.",
      },
    ],
  },
  {
    id: 'outils',
    titre: 'Profil & outils',
    sousTitre: 'Réglages, widgets et sécurité',
    icone: UserCog,
    page: 'profile',
    intro: "Votre profil regroupe vos informations, votre mode d'import, vos banques et vos accès. Les widgets restent à portée de main sur toutes les pages.",
    sections: [
      {
        titre: 'Mon profil',
        points: [
          { l: 'Détails Personnels', d: "Modifiez votre nom et votre adresse e-mail." },
          { l: "Mode d'importation Global", d: "Passez de « Automatique » à « Manuel »." },
          { l: 'Mot de passe', d: "« Mettre à jour le mot de passe »." },
        ],
      },
      {
        titre: 'Appareils connectés',
        texte: "La carte « Appareils connectés » liste les navigateurs où votre compte est ouvert, avec leur dernière activité. Celui que vous utilisez porte la mention « Cet appareil ».",
        points: [
          { l: 'Un seul appareil', d: "« Déconnecter » le coupe immédiatement : à sa prochaine action, il revient à l'écran de connexion." },
          { l: 'Tous les autres', d: "« Tout déconnecter » demande une confirmation, puis coupe tous vos autres appareils. Celui que vous utilisez reste connecté." },
          { l: 'Connexion plus ancienne', d: "Une connexion ouverte avant l'arrivée de cette carte n'y figure pas et ne peut pas être coupée à distance. Elle prend fin d'elle-même sous 7 jours." },
        ],
        conseil: "Téléphone perdu ou doute sur un appareil ? Utilisez « Tout déconnecter », puis changez votre mot de passe : changer de mot de passe ne déconnecte pas à lui seul les autres appareils.",
      },
      {
        titre: 'Déconnecter vos banques',
        texte: "« Tout déconnecter » révoque l'accès de Kleea à vos banques et supprime vos connexions chez Powens. Vos opérations déjà importées restent en place.",
        attention: "Cette action efface aussi les liaisons entre vos comptes bancaires et vos comptes Kleea. Après une reconnexion, il faudra les refaire sur la page « Comptes ».",
      },
      {
        titre: 'Sauvegarder vos données',
        texte: "« Télécharger ma sauvegarde » crée un fichier avec vos comptes, opérations, budgets, prévisions, catégories, projets, enveloppes, groupes Tricount et réglages. Vous pourrez le réimporter plus tard.",
        attention: "Vos opérations et vos IBAN sont lisibles dans ce fichier : gardez-le en lieu sûr et ne le partagez pas.",
        points: [
          { l: 'Pour restaurer', d: "« Importer une sauvegarde », choisissez le fichier, vérifiez le résumé de ce qui sera ajouté, puis « Confirmer l'import »." },
          { l: 'Rien n\'est écrasé', d: "L'import ajoute seulement ce qui manque. Ce qui existe reste tel quel, mais une ligne effacée depuis la sauvegarde revient." },
          { l: 'Un seul compte', d: "Une sauvegarde ne s'importe que dans le compte qui l'a créée. Après une suppression, recréez un compte avec le même identifiant." },
          { l: 'À refaire ensuite', d: "Votre mot de passe, vos connexions bancaires, votre jeton Stream Deck et vos liens de partage Tricount ne sont jamais sauvegardés. Votre nom et votre e-mail restent ceux du compte connecté." },
        ],
      },
      {
        titre: 'Supprimer mon compte',
        attention: "« Supprimer mon compte » efface définitivement votre compte et vos données. L'action est irréversible et vous demande d'écrire « delete » pour confirmer.",
        conseil: "Téléchargez d'abord votre sauvegarde : c'est le seul moyen de retrouver vos données ensuite.",
      },
      {
        titre: 'Alertes',
        texte: "La cloche de la navigation signale ce qui demande votre attention, quels que soient le mois et le profil affichés. Son nombre devient rouge dès qu'une alerte est importante.",
        points: [
          { l: 'Banque', d: "Une connexion à renouveler, ou qui expire dans moins de 7 jours." },
          { l: 'Synchronisation', d: "En mode automatique : une dernière synchronisation en échec, ou aucun succès depuis plus de 3 jours." },
          { l: 'Découvert', d: "Un compte dont le solde estimé passe sous zéro d'ici la fin de l'année, d'après vos prévisions à venir." },
          { l: 'Budget', d: "Une catégorie à 80 % de sa limite du mois, ou qui la dépasse." },
          { l: 'Masquer', d: "La croix retire une alerte sur tous vos appareils. Elle revient si la situation change, par exemple le mois suivant ou lors d'une nouvelle panne." },
        ],
        conseil: "Les alertes s'affichent dans l'application : aucun e-mail n'est envoyé pour le moment.",
      },
      {
        titre: 'Widgets',
        texte: "Le bouton rond en bas à droite ouvre le menu des widgets.",
        points: [
          { l: 'Bloc-notes', d: "Un pense-bête enregistré automatiquement." },
          { l: 'Simulateur Prorata', d: "Partage des dépenses communes selon les salaires de chacun." },
          { l: 'Couleurs Graphiques', d: "Choisissez les couleurs de vos revenus, dépenses et autres courbes." },
        ],
      },
      {
        titre: 'Navigation',
        texte: "Sur ordinateur, la molette de la souris fait défiler les pages du menu, les onglets et les filtres de période quand vous la survolez.",
      },
    ],
  },
  {
    id: 'streamdeck',
    titre: 'Stream Deck',
    sousTitre: 'Vos chiffres sur vos touches',
    icone: Gamepad2,
    page: 'profile',
    intro: "Le plugin Kleea pour Elgato Stream Deck affiche sur une touche un solde, votre patrimoine, les dépenses, revenus et bilan du mois, ou le nombre d'opérations à importer.",
    sections: [
      {
        titre: 'Installer le plugin',
        etapes: [
          "Dans « Profil », carte « Stream Deck », générez un jeton et copiez-le : il ne sera plus jamais affiché.",
          "Copiez aussi l'« URL du serveur » affichée sur cette carte.",
          "Installez le plugin Kleea (Stream Deck 7.1 ou plus récent).",
          "Glissez l'action « Kleea > Vue financière » sur une touche, puis renseignez l'URL et le jeton.",
        ],
      },
      {
        titre: 'Utiliser les touches',
        points: [
          { l: 'Un appui', d: "Force la mise à jour des chiffres affichés." },
          { l: 'Touche Powens', d: "Fait comme le bouton « Actualiser » de la page Importer. En mode automatique, les opérations sont importées ; en mode manuel, l'import reste à faire dans Kleea." },
          { l: 'Limite', d: "Les actualisations bancaires sont limitées à 6 par période de 10 minutes." },
        ],
      },
      {
        titre: 'Sécurité du jeton',
        texte: "Le jeton permet seulement de lire ces chiffres et de demander une actualisation bancaire. Si vous le perdez ou si vous changez d'appareil, utilisez « Regénérer ». « Révoquer » coupe immédiatement l'accès.",
      },
    ],
  },
  {
    id: 'questions',
    titre: 'Questions fréquentes',
    sousTitre: 'Quand quelque chose coince',
    icone: HelpCircle,
    intro: 'Les situations les plus courantes et comment les résoudre.',
    sections: [
      {
        titre: 'Mon solde ne correspond pas à celui de ma banque',
        texte: "Vérifiez que toutes les opérations récentes sont importées, puis utilisez « Ajuster » sur la carte du compte, page « Comptes », en saisissant le solde actuel de votre banque.",
      },
      {
        titre: 'Un virement vers mon livret compte comme une dépense',
        texte: "Donnez-lui une catégorie commençant par « Virement : », par exemple « Virement : CCP vers Livret A », et renseignez l'IBAN du livret sur sa carte de compte pour les prochains imports.",
      },
      {
        titre: 'Mes opérations ne se synchronisent plus',
        texte: "Votre banque demande probablement une nouvelle authentification. Suivez la fenêtre de reconnexion si elle s'affiche, ou cliquez sur « Reconnecter » à côté de la banque, dans « Profil ». Vérifiez aussi que le compte est toujours lié, page « Comptes ».",
      },
      {
        titre: 'Mes opérations sont mal classées',
        texte: "Activez « Apprentissage » dans « Gérer » avant de corriger la catégorie, ou ajoutez un mot-clé dans l'onglet « Intelligence » de la page « Importer ».",
      },
      {
        titre: "J'ai importé deux fois le même relevé",
        texte: "Kleea écarte les opérations déjà présentes, signalées par « Déjà importé (Ignoré) ». Si des doublons sont tout de même enregistrés, cochez-les dans « Gérer » et supprimez-les.",
      },
      {
        titre: 'Une dépense concerne plusieurs catégories',
        texte: "Dans « Gérer », utilisez « Diviser cette transaction » pour la répartir. La division peut être annulée à tout moment.",
      },
      {
        titre: 'Mes données sont-elles en sécurité ?',
        texte: "Les IBAN et les jetons bancaires sont chiffrés. La connexion à vos banques passe par Powens : Kleea ne reçoit pas vos identifiants bancaires, saisis directement sur ses écrans. Vous pouvez révoquer cet accès à tout moment dans « Profil ».",
      },
    ],
  },
];

/** Tout le texte d'un chapitre, en minuscules et sans accents, pour la recherche. */
export function normaliser(texte) {
  return String(texte || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function texteSection(s) {
  return [s.titre, s.texte, s.conseil, s.attention, ...(s.etapes || []), ...(s.points || []).flatMap((p) => [p.l, p.d])].join(' ');
}

/** Sections qui contiennent tous les mots recherchés, chapitre par chapitre. */
export function rechercher(requete, chapitres = CHAPITRES, premiersPas = PREMIERS_PAS) {
  const mots = normaliser(requete).split(/\s+/).filter(Boolean);
  if (!mots.length) return [];
  const contient = (texte) => {
    const t = normaliser(texte);
    return mots.every((m) => t.includes(m));
  };
  const resultats = premiersPas
    .filter((e) => contient([e.titre, e.pourquoi, e.conseil, ...e.etapes].join(' ')))
    .map((e) => ({ chapitreId: 'premiers-pas', chapitre: 'Premiers pas', section: e.titre, ancre: e.id }));
  for (const c of chapitres) {
    for (const s of c.sections) {
      if (contient(`${c.titre} ${c.sousTitre} ${texteSection(s)}`)) {
        resultats.push({ chapitreId: c.id, chapitre: c.titre, section: s.titre, ancre: s.titre });
      }
    }
  }
  return resultats;
}
