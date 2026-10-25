/* =====================================================================
   CONFIGURATION — modifiez ici les contacts, la réception, les prix, packs et services
   ===================================================================== */
const CONFIG = {
  siteUrl: 'https://ilo-tech.com/',   // adresse du site (liens dans les messages, flyers, QR codes)
  // ① Réception par EMAIL (le plus simple) : votre adresse. Chaque demande vous est envoyée par email
  //    via le service gratuit FormSubmit. La 1re fois, FormSubmit vous envoie un email d'activation à valider.
  //    Ensuite, vous pouvez remplacer l'adresse par l'alias secret fourni par FormSubmit (voir README.txt).
  emailReception: 'ilotech.contact@gmail.com',
  emailCopie: 'nolan.bourt@gmail.com',   // reçoit aussi une copie de chaque demande (plusieurs : séparées par des virgules)
  // ② Réception GOOGLE (tableau + planning + rappels + suivi de réparation) : URL du script (README.txt, « INSTALLER LE MOTEUR GOOGLE »).
  //    Les deux peuvent fonctionner ensemble. Si aucun n'est rempli, les demandes partent par WhatsApp.
  endpoint: 'https://script.google.com/macros/s/AKfycbx6NsIGVdNgkN7TdYYP6R_Y6Ds2gr9fXp8PZOz-lIF632DDhaFFuZICs7cDB9VawkrJ/exec',   // moteur sur ilotech.contact@gmail.com
  email: 'ilotech.contact@gmail.com', // adresse de contact affichée aux clients
  avisGoogleUrl: '',
  // réseaux sociaux d'IloTech : affichés en bas des pages et déclarés à Google (laisser vide pour masquer)
  reseaux: {
    instagram: 'https://www.instagram.com/ilo.tech.97/',
    tiktok: 'https://www.tiktok.com/@ilo.tech',
    youtube: 'https://www.youtube.com/@Ilo_Tech',
    facebook: '',
    linkedin: ''
  },
  // partenaires et clients qui acceptent d'être cités (logo dans img/partenaires/) : { nom, url, logo }
  partenaires: [],// lien « Laisser un avis » de votre fiche Google Business (affiché s'il est rempli)
  mentionPrix: 'TVA non applicable, art. 293 B du CGI',  // franchise en base de TVA (micro-entreprise) — affiché sur les devis et tarifs
  agenceDistance: 'ducos',   // agence qui traite les interventions à distance
  deplacementOffertDes: 200, // déplacement offert à partir de ce montant de prestation (€)
  margeHaute: 1.3,           // fourchette haute = prix de base × margeHaute (hors packs, qui ont un prix fixe)
  validiteDevis: 30,         // jours
  paiement3fois: 500,        // paiement en 3 fois sans frais à partir de ce montant (sites, applications, installations)
  placesParCreneau: 3,       // clients max par agence le matin, et autant l'après-midi (même valeur que CAPACITE dans le script Google)
  delaiMinJours: 1           // pas de rendez-vous le jour même : premier jour réservable = demain
};

// Identité légale (mentions sur les devis et pages légales)
const ENTREPRISE = {
  nomCommercial: 'IloTech',
  exploitant: 'Erwan Labiche, Entrepreneur individuel (EI)',
  siret: '104 702 436 00015',
  adresse: 'Route de Duchesne, 97231 Le Robert, Martinique'
};

// Horaires d'ouverture (jour : [ouverture, fermeture]) — 0 = dimanche
const HORAIRES = { 1: [8, 17], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: [8, 17], 6: [8, 12] };

const AGENCES = {
  ducos:  { nom: 'Ducos',     de: 'de Ducos',  detail: 'Sud et Centre',      tel: '0696 77 99 02' },
  robert: { nom: 'Le Robert', de: 'du Robert', detail: 'Atlantique et Nord', tel: '0696 48 26 78' }
};

// Frais de déplacement par zone (aller-retour, par intervention)
const ZONES = {
  agence: { nom: "Commune d'agence", prix: 0,  delai: 'Intervention la plus rapide' },
  centre: { nom: 'Centre',           prix: 10, delai: 'Sous 24 à 48 h' },
  sud:    { nom: 'Sud',              prix: 20, delai: 'Sous 48 h' },
  nord:   { nom: 'Nord',             prix: 25, delai: 'Sous 48 à 72 h' }
};

// [commune, zone, agence la plus proche]
const COMMUNES = [
  ['Ducos', 'agence', 'ducos'], ['Le Robert', 'agence', 'robert'],
  ['Fort-de-France', 'centre', 'ducos'], ['Le Lamentin', 'centre', 'ducos'], ['Schœlcher', 'centre', 'ducos'],
  ['Saint-Joseph', 'centre', 'robert'], ['Le François', 'centre', 'robert'], ['Rivière-Salée', 'centre', 'ducos'],
  ['Saint-Esprit', 'centre', 'ducos'],
  ['Les Trois-Îlets', 'sud', 'ducos'], ["Les Anses-d'Arlet", 'sud', 'ducos'], ['Le Diamant', 'sud', 'ducos'],
  ['Sainte-Luce', 'sud', 'ducos'], ['Rivière-Pilote', 'sud', 'ducos'], ['Le Marin', 'sud', 'ducos'],
  ['Sainte-Anne', 'sud', 'ducos'], ['Le Vauclin', 'sud', 'robert'],
  ['La Trinité', 'nord', 'robert'], ['Le Gros-Morne', 'nord', 'robert'], ['Sainte-Marie', 'nord', 'robert'],
  ['Le Marigot', 'nord', 'robert'], ['Le Lorrain', 'nord', 'robert'], ['Basse-Pointe', 'nord', 'robert'],
  ['Ajoupa-Bouillon', 'nord', 'robert'], ['Macouba', 'nord', 'robert'], ["Grand'Rivière", 'nord', 'robert'],
  ['Le Morne-Rouge', 'nord', 'robert'], ['Saint-Pierre', 'nord', 'ducos'], ['Le Prêcheur', 'nord', 'ducos'],
  ['Le Carbet', 'nord', 'ducos'], ['Bellefontaine', 'nord', 'ducos'], ['Case-Pilote', 'nord', 'ducos'],
  ['Le Morne-Vert', 'nord', 'ducos'], ['Fonds-Saint-Denis', 'nord', 'ducos']
];

// modes : où le service peut être réalisé (site = chez le client, atelier = dépôt en agence, distance = télé-assistance)
// appareil : true = on demande la marque / le modèle
// note : message affiché à l'étape « Détails »
const SERVICES = [
  // --- Ordinateur : pannes, lenteur, réparations matérielles
  { id: 'repair', icon: 'monitor', nom: 'Dépannage PC', desc: 'Ne démarre plus, plantages', base: 35, modes: ['site', 'atelier', 'distance'], appareil: true,
    compris: ['Diagnostic de la panne', 'Prix confirmé avant de réparer', 'Vos fichiers préservés'], pasCompris: ['Pièces à remplacer (prix annoncé avant)'],
    options: [['boot', 'Windows ne démarre plus', 35], ['bsod', 'Écran bleu, plantages', 35], ['screen', 'Écran noir au démarrage', 40], ['slow', 'PC très lent', 20], ['reinstall', 'Réinstallation de Windows', 45]] },
  { id: 'boost', icon: 'zap', nom: 'Accélérer Windows', desc: 'Nettoyage et optimisation', base: 39, modes: ['site', 'atelier', 'distance'], appareil: true,
    options: [['startup', 'Démarrage rapide', 15], ['clean', 'Nettoyage Windows', 20], ['drivers', 'Pilotes / mises à jour', 15], ['bloat', 'Logiciels inutiles retirés', 15], ['gaming', 'Optimisation jeux', 30]] },
  { id: 'hwfixe', icon: 'tower', nom: 'Réparation PC fixe', desc: 'Pièces, montage, upgrade', base: 35, modes: ['atelier', 'site'], appareil: true,
    options: [['psu', 'Alimentation en panne (hors pièce)', 35], ['gpu', 'Pose ou changement carte graphique', 30], ['ram', 'Ajout de mémoire (RAM)', 20],
      ['fan', 'Surchauffe, ventilateurs, bruit', 30]] },
  { id: 'hwportable', icon: 'laptop', nom: 'Réparation PC portable', desc: 'Écran, clavier, batterie', base: 35, modes: ['atelier', 'site'], appareil: true,
    options: [['screen', 'Écran cassé (hors pièce)', 59], ['keyboard', 'Clavier (hors pièce)', 39], ['battery', 'Batterie (hors pièce)', 29],
      ['charge', 'Prise de charge', 49], ['hinge', 'Charnière cassée', 49], ['fan', 'Surchauffe, ventilateur', 30]] },
  // --- Sécurité
  { id: 'antivirus', icon: 'shield', nom: 'Antivirus & virus', desc: 'Suppression et protection', base: 29, modes: ['site', 'atelier', 'distance'], appareil: true,
    options: [['virus', 'Suppression de virus et pubs', 40], ['install', 'Installation d’un antivirus', 15], ['scan', 'Analyse complète du PC', 15],
      ['browser', 'Navigateur nettoyé (pop-ups, faux messages)', 15], ['ransom', 'Rançongiciel : diagnostic', 59]] },
  { id: 'comptes', icon: 'lock', nom: 'Comptes & arnaques', desc: 'Piratage, mots de passe', base: 29, modes: ['site', 'atelier', 'distance'],
    note: 'Nous sécurisons vos comptes et appareils. En cas de fraude bancaire, prévenez aussi votre banque et déposez plainte.',
    options: [['hack', 'Compte piraté (email, Facebook…)', 35], ['pass', 'Gestionnaire de mots de passe', 15], ['2fa', 'Double authentification', 15],
      ['parent', 'Contrôle parental', 20], ['scam', 'Aide après une arnaque en ligne', 25]] },
  // --- Données
  { id: 'sauvegarde', icon: 'cloud', nom: 'Sauvegarde', desc: 'Automatique, en ligne, NAS', base: 29, modes: ['site', 'atelier', 'distance'], appareil: true,
    options: [['auto', 'Sauvegarde automatique du PC', 30], ['cloud', 'Sauvegarde en ligne (cloud)', 25], ['nas', 'Disque réseau (NAS) à la maison', 69], ['check', 'Vérification d’une sauvegarde existante', 15]] },
  { id: 'recup', icon: 'database', nom: 'Récupération de données', desc: 'Fichiers effacés, disque en panne', base: 35, modes: ['atelier', 'site'], appareil: true,
    options: [['deleted', 'Fichiers effacés par erreur', 40], ['disk', 'Disque endommagé ou muet', 79], ['usb', 'Clé USB ou carte mémoire', 29], ['pcdead', 'PC en panne : sauver les fichiers', 40]] },
  { id: 'stockage', icon: 'drive', nom: 'Stockage & transfert', desc: 'SSD, disque, transfert', base: 25, modes: ['atelier', 'site'], appareil: true,
    options: [['ssd', 'Passage au SSD (hors pièce)', 35], ['upgrade', 'Agrandir le stockage (hors pièce)', 29], ['transfer', 'Transfert vers un nouveau PC ou disque', 29], ['clone', 'Copie complète du disque (clonage)', 39]] },
  { id: 'recyclage', icon: 'recycle', nom: 'Reprise & recyclage', desc: 'Effacement sécurisé, recyclage', base: 0, modes: ['atelier', 'site'], appareil: true,
    options: [['wipe', 'Effacement sécurisé des données', 19], ['recycle', 'Récupération pour recyclage', 0, 'Gratuit']] },
  // --- Installation
  { id: 'install', icon: 'laptop', nom: 'PC neuf & logiciels', desc: 'Mise en service, Office', base: 35, modes: ['site', 'atelier', 'distance'], appareil: true,
    options: [['newpc', 'Mise en service PC neuf', 35], ['transfer', 'Transfert depuis l’ancien PC', 35], ['office', 'Office / messagerie', 25], ['soft', 'Installation de logiciels', 15]] },
  { id: 'printer', icon: 'printer', nom: 'Imprimante & scanner', desc: 'Installation et dépannage', base: 29, modes: ['site', 'distance'], appareil: true,
    options: [['wifi', 'Connexion Wi-Fi / réseau', 15], ['scan', 'Scanner et numérisation', 15], ['multi', 'Partage sur plusieurs PC', 20], ['panne', 'Dépannage (bourrage, pilote, erreur)', 25]] },
  { id: 'ups', icon: 'battery', nom: 'Onduleur', desc: 'Protection contre les coupures', base: 29, modes: ['site'], appareil: true,
    note: 'Matériel non inclus : nous vous conseillons le modèle adapté (sur devis).',
    options: [['auto', 'Arrêt automatique du PC', 15], ['box', 'Protection box et TV', 10], ['battery', 'Changement de batterie (hors pièce)', 19], ['pro', 'Onduleur pour serveur ou caisse', 35]] },
  // --- Consoles
  { id: 'console', icon: 'gamepad', nom: 'Entretien console', desc: 'Nettoyage, stockage, réparation', base: 29, modes: ['atelier', 'site'], appareil: true,
    options: [['clean', 'Nettoyage complet + pâte thermique', 35], ['storage', 'Changer / agrandir le stockage', 25], ['update', 'Mises à jour et configuration', 15],
      ['manette', 'Manette qui dérive', 25], ['hdmi', 'Réparation port HDMI', 59]] },
  { id: 'emulation', icon: 'joystick', nom: 'Émulation & rétro', desc: 'Émulateurs, console rétro', base: 29, modes: ['atelier', 'site'], appareil: true,
    note: 'Nous installons uniquement des émulateurs légaux. Les jeux doivent provenir de copies que vous possédez.',
    options: [['emu', 'Installation d’émulateurs', 25], ['retro', 'Console rétro sur Raspberry Pi (hors matériel)', 45], ['handheld', 'Steam Deck / console portable PC', 25]] },
  { id: 'gamer', icon: 'tower', nom: 'PC gamer sur mesure', desc: 'Conseil, montage, optimisation', base: 39, modes: ['atelier', 'site'],
    note: 'Pièces non incluses : nous vous conseillons une configuration adaptée à votre budget.',
    options: [['build', 'Montage complet (pièces fournies)', 69], ['windows', 'Windows et pilotes installés', 25], ['tuning', 'Optimisation jeux et tests', 25],
      ['cable', 'Gestion des câbles et RGB', 19], ['upgrade', 'Mise à niveau d’un PC existant', 35]] },
  // --- Caméras
  { id: 'camera', icon: 'camera', nom: 'Vidéosurveillance', desc: 'Caméras et accès mobile', base: 120, modes: ['site'],
    options: [['cam2', '2 caméras', 180], ['cam4', '4 caméras', 340], ['cam6', '6 caméras', 490], ['cam8', '8 caméras', 640], ['night', 'Vision de nuit', 49], ['remote', 'Accès smartphone', 49], ['nvr', 'Enregistreur + stockage', 190], ['solaire', 'Caméra solaire 4G (sans prise ni Wi-Fi)', 149]] },
  { id: 'alarme', icon: 'bell', nom: 'Alarme & accès', desc: 'Alarme, visiophone, serrure', base: 39, modes: ['site'],
    note: 'Matériel non inclus : nous vous conseillons des équipements fiables et compatibles (sur devis).',
    options: [['alarm', 'Alarme connectée', 69], ['visio', 'Visiophone / sonnette vidéo', 45], ['lock', 'Serrure connectée', 45],
      ['portail', 'Portail ou garage connecté', 55], ['detect', 'Détecteurs (fumée, ouverture)', 19]] },
  // --- Domotique
  { id: 'domotique', icon: 'home', nom: 'Domotique', desc: 'Maison connectée, automatismes', base: 39, modes: ['site'],
    note: 'Matériel non inclus : nous vous conseillons des équipements compatibles entre eux (sur devis).',
    options: [['hub', 'Box domotique / assistant vocal', 29], ['light', 'Éclairage connecté (par pièce)', 19], ['plug', 'Prises connectées et programmation', 15],
      ['clim', 'Clim et volets pilotés au téléphone', 35], ['scenes', 'Scénarios automatiques (départ, nuit)', 25], ['energy', 'Suivi de la consommation électrique', 29]] },
  // --- TV & multimédia
  { id: 'multimedia', icon: 'tv', nom: 'TV, box & multimédia', desc: 'Installation et réglages', base: 29, modes: ['site'],
    options: [['tv', 'Installation et réglage TV connectée', 25], ['box', 'Box internet / TV et chaînes', 20], ['son', 'Barre de son / home cinéma', 35],
      ['proj', 'Vidéoprojecteur', 35], ['cast', 'Afficher le téléphone sur la TV', 15], ['mural', 'Fixation murale de la TV (hors support)', 39]] },
  // --- Wi-Fi
  { id: 'starlink', icon: 'satellite', nom: 'Installation Starlink', desc: 'Internet par satellite, partout en Martinique', base: 119, modes: ['site'],
    note: 'Le kit et l’abonnement se commandent chez Starlink (nous vous aidons à le faire). Nous posons l’antenne au meilleur endroit, sans obstacle, et réglons le Wi-Fi de toute la maison.',
    compris: ['Repérage de l’emplacement sans obstacle (arbres, mornes, toits)', 'Pose de l’antenne et passage propre du câble', 'Activation et réglage du Wi-Fi', 'Test de débit devant vous'],
    pasCompris: ['Kit Starlink et abonnement (achetés chez Starlink)', 'Pose en hauteur au-delà d’un étage (sur devis)'],
    options: [['commande', 'Aide à la commande et à l’activation', 0, 'Offert'], ['toit', 'Fixation sur le toit, un mât ou un pignon', 69], ['cable', 'Câble long ou passage en gaine (jusqu’à 30 m)', 39],
      ['mesh', 'Wi-Fi dans toute la maison (bornes mesh)', 79], ['secours', 'Secours automatique : box et Starlink ensemble', 59], ['onduleur', 'Internet maintenu pendant les coupures (onduleur)', 59],
      ['mini', 'Starlink Mini : réglage bateau, véhicule ou chantier', 29]] },
  { id: 'network', icon: 'wifi', nom: 'Internet et Wi-Fi', desc: 'Réseau maison ou bureau', base: 49, modes: ['site'],
    options: [['audit', 'Diagnostic Wi-Fi', 35], ['wifi', 'Amélioration Wi-Fi', 49], ['mesh', 'Wi-Fi dans toute la maison', 99], ['router', 'Configuration box / routeur', 35], ['cabling', 'Câblage', 99], ['pro', 'Réseau professionnel', 199]] },
  // --- Aide & suivi
  { id: 'cours', icon: 'users', nom: 'Cours & accompagnement', desc: 'Débutants, seniors, à domicile', base: 35, modes: ['site', 'atelier', 'distance'],
    note: 'Séance d’1 h à votre rythme. Cochez les sujets qui vous intéressent.',
    options: [['mail', 'Emails, WhatsApp, appels vidéo', 0, 'Inclus'], ['banque', 'Banque et démarches en ligne', 0, 'Inclus'], ['photos', 'Photos : ranger et partager', 0, 'Inclus'],
      ['arnaques', 'Repérer les arnaques', 0, 'Inclus'], ['ia', 'Découvrir l’intelligence artificielle (ChatGPT…) sans risque', 0, 'Inclus'], ['h2', 'Séance de 2 h au lieu d’1 h', 25], ['carnet', 'Carnet de 5 séances', 99]] },
  { id: 'abonnement', icon: 'repeat', nom: 'Abonnement entretien', desc: 'Suivi mensuel de votre PC', base: 9.9, mensuel: true, modes: ['distance', 'site'],
    note: 'Inclus chaque mois : contrôle de votre PC à distance, suivi de vos sauvegardes et tarif réduit sur les dépannages.',
    options: [['pc2', 'Ordinateur supplémentaire', 4.9], ['visite', 'Visite annuelle à domicile', 5], ['prio', 'Intervention prioritaire', 3]] },
  // --- Mobile & tablette
  { id: 'mobile', icon: 'smartphone', nom: 'Smartphone & tablette', desc: 'Réparation, transfert, réglages', base: 25, modes: ['atelier', 'site'], appareil: true,
    note: 'Pièces (écran, batterie) en supplément : prix confirmé avant la réparation selon le modèle.',
    options: [['screen', 'Écran cassé (hors pièce)', 45], ['battery', 'Batterie qui ne tient plus (hors pièce)', 25], ['eau', 'Tombé dans l’eau : diagnostic', 25],
      ['transfer', 'Transfert vers un nouveau téléphone', 20], ['backup', 'Sauvegarde des photos et contacts', 15], ['setup', 'Configuration et applications', 15],
      ['parent', 'Contrôle parental', 15]] },
  // --- Web & apps (pro et particuliers)
  { id: 'siteweb', icon: 'globe', nom: 'Développement web', desc: 'Page unique, site vitrine ou boutique', base: 390, modes: ['distance', 'site', 'atelier'],
    note: 'Le prix de base est un site d’une page. Le site vous appartient (accès remis), avec 3 mois de maintenance offerts. Paiement en 3 fois sans frais dès 500 €.',
    compris: ['Site d’une page adapté au téléphone', 'Textes et photos mis en forme', 'Formulaire de contact et bouton WhatsApp', 'Mise en ligne et 2 séries de retouches'],
    pasCompris: ['Hébergement et nom de domaine (option, ou maintenance)', 'Rédaction complète des textes', 'Photos professionnelles (voir drone)'],
    options: [['pages', 'Site vitrine complet (jusqu’à 5 pages)', 300], ['resa', 'Prise de rendez-vous en ligne', 290], ['shop', 'Boutique en ligne (jusqu’à 30 produits, paiement par carte)', 790],
      ['seo', 'Référencement local (Google)', 120], ['domain', 'Nom de domaine + email pro (1 an)', 49], ['logo', 'Logo simple', 90]] },
  { id: 'appmobile', icon: 'smartphone', nom: 'Application mobile', desc: 'Espaces clients, outils métier', base: 1290, modes: ['distance', 'site', 'atelier'],
    note: 'Pour décider sans risque : une maquette cliquable à tester sur votre téléphone (290 €), déduite si vous commandez l’application. Paiement en 3 fois sans frais.',
    compris: ['Application web installable sur téléphone', 'Jusqu’à 5 écrans', 'Code et accès remis', 'Mise en ligne et prise en main'],
    pasCompris: ['Frais Apple et Google (si publication sur les Stores)', 'Hébergement (quelques euros par mois)', 'Nouvelles fonctions après livraison (sur devis)'],
    options: [['client', 'Espace client (compte, historique)', 490], ['rdv', 'Réservation / rendez-vous', 390], ['notif', 'Notifications', 190],
      ['admin', 'Interface de gestion', 490], ['stores', 'Publication App Store / Google Play', 190]] },
  { id: 'maintweb', icon: 'repeat', nom: 'Maintenance de site', desc: 'Mises à jour, sauvegardes, modifs', base: 29, mensuel: true, modes: ['distance'],
    note: 'Prix par mois, sans engagement. Pour un site fait ailleurs, une première sauvegarde et un bilan sont faits avant tout.',
    compris: ['Mises à jour du site', 'Sauvegarde chaque semaine, restauration testée', 'Surveillance : alerte si le site tombe', 'Petit rapport chaque mois'],
    pasCompris: ['Nouvelles pages ou fonctions (option ou devis)', 'Hébergement (option)'],
    options: [['heberg', 'Hébergement, nom de domaine et cadenas https', 15], ['secu', 'Surveillance sécurité renforcée', 10], ['modifs', '1 h de modifications par mois', 25], ['stats', 'Rapport de visites mensuel', 5]] },
  { id: 'sitepirate', icon: 'alert', nom: 'Site piraté ou en panne', desc: 'Remise en ligne rapide', base: 149, modes: ['distance'],
    note: 'Votre site ne s’affiche plus, affiche une erreur ou a été piraté : il est remis en ligne, avec un rapport de ce qui s’est passé. Prix fixe annoncé avant.',
    compris: ['Diagnostic de la panne', 'Remise en ligne du site', 'Rapport simple : la cause et quoi faire'],
    pasCompris: ['Refonte du site (voir Développement web)'],
    options: [['nettoyage', 'Nettoyage du piratage et faille fermée', 100], ['lent', 'Site trop lent (images, cache)', 49], ['sauvegarde', 'Mise en place d’une sauvegarde automatique', 39]] },
  // --- Cybersécurité (pros)
  { id: 'cyberexpress', icon: 'search', nom: 'Contrôle sécurité express', desc: 'Votre site et vos emails vérifiés', base: 79, modes: ['distance'],
    note: 'Un premier contrôle, à distance et sans rien toucher : vous savez en quelques jours ce qui va bien et ce qui est à corriger. Déduit si vous commandez l’audit dans le mois.',
    compris: ['Cadenas https et en-têtes de sécurité', 'Logiciels et extensions à jour', 'Emails protégés contre l’usurpation (SPF, DMARC)', 'Rapport court avec les priorités'],
    pasCompris: ['Tests à la main des comptes et formulaires (voir l’audit)', 'Corrections (sur devis)'],
    options: [['site2', 'Site web supplémentaire', 39], ['appel', 'Explication du rapport au téléphone (20 min)', 0, 'Offert']] },
  { id: 'cyber', icon: 'lock', nom: 'Audit cybersécurité', desc: 'Vérifications autorisées, corrections', base: 290, modes: ['distance', 'site'],
    note: 'Uniquement sur vos propres systèmes ou avec autorisation écrite. Rapport clair : constats expliqués et corrections ciblées.',
    compris: ['Accord écrit sur ce qui est vérifié', 'Vérifications à la main (comptes, formulaires, sauvegardes)', 'Rapport classé par priorité', 'Contre-vérification après vos corrections'],
    pasCompris: ['Attaques destructives : rien n’est supprimé ni bloqué', 'Certification officielle'],
    options: [['site', 'Vérification d’un site web supplémentaire', 150], ['email', 'Sécurité des emails (SPF, DMARC)', 90], ['acces', 'Revue des accès et mots de passe', 120],
      ['fix', 'Corrections ciblées (par heure)', 59], ['form', 'Sensibilisation de l’équipe (1 h)', 99]] },
  // --- Drone & impression 3D
  { id: 'drone', icon: 'drone', nom: 'Drone', desc: 'Photos, vidéos, toitures vues du ciel', base: 149, modes: ['site'],
    note: 'Forfait : 30 minutes sur place et une dizaine de photos retouchées, livrées sous 48 h. Selon la météo et les zones de vol autorisées.',
    compris: ['30 min de vol sur place', 'Une dizaine de photos HD retouchées', 'Livraison en ligne sous 48 h'],
    pasCompris: ['Zones interdites de vol (aéroport, sites protégés)', 'Montage long (sur devis)'],
    options: [['photo', 'Photos aériennes', 0, 'Inclus'], ['video', 'Clip vidéo 4K monté (30 à 45 s)', 120], ['inspect', 'Inspection de toiture avec rapport photo', 60], ['chantier', 'Suivi de chantier (passage suivant)', 99]] },
  { id: 'impression3d', icon: 'box', nom: 'Impression 3D', desc: 'Objets, supports, pièces simples', base: 25, modes: ['atelier', 'distance'],
    note: 'Prix de base : un objet jusqu’à 10 cm d’après un fichier existant, à retirer en agence. Plus grand, ou plusieurs pièces : prix annoncé avant d’imprimer.',
    compris: ['Objet jusqu’à 10 cm', 'Matière et couleur au choix (PLA ou PETG)', 'Retrait en agence'],
    pasCompris: ['Création du modèle 3D au-delà de 15 min (49 € de l’heure)'],
    options: [['fichier', 'Impression d’un fichier existant', 0, 'Inclus'], ['adapt', 'Adaptation simple d’un modèle', 25], ['piece', 'Pièce de remplacement (mesure et modèle)', 35], ['serie', 'Petite série (5 pièces ou plus)', 0, 'Sur devis']] },
  // --- Immobilier
  { id: 'immobilier', icon: 'home', nom: 'Pack immobilier', desc: 'Photos, vidéo et drone pour vendre ou louer', base: 199, modes: ['site'],
    note: 'Pour agences, propriétaires et locations saisonnières : des images qui donnent envie de visiter, prêtes pour les annonces et les réseaux.',
    compris: ['15 photos intérieures retouchées', 'Photos aériennes par drone (selon la zone de vol)', 'Livraison en ligne sous 48 h', 'Formats prêts pour les annonces et les réseaux'],
    pasCompris: ['Visite virtuelle 360° (sur devis)', 'Home staging et ménage avant les photos'],
    options: [['video', 'Vidéo de visite montée (60 à 90 s)', 149], ['page', 'Page web dédiée au bien (lien à partager)', 149], ['reseaux', 'Publication et publicité sur les réseaux (hors budget)', 99],
      ['serrure', 'Location saisonnière : serrure connectée posée et réglée', 89], ['wifi', 'Location saisonnière : Wi-Fi ou Starlink pour les voyageurs', 79], ['guide', 'Livret d’accueil numérique avec QR code', 59]] },
  // --- Programmation
  { id: 'devsurmesure', icon: 'code', nom: 'Programmation sur mesure', desc: 'Automatisation, outils, logiciels', base: 190, modes: ['distance', 'site', 'atelier'],
    note: 'Devis après un premier échange gratuit : nous partons de votre besoin réel, et le programme vous appartient.',
    options: [['excel', 'Automatisation Excel / Google Sheets', 90], ['script', 'Script ou petit outil sur mesure', 190], ['logiciel', 'Logiciel métier (gestion, stocks, planning)', 890],
      ['api', 'Connexion entre vos outils (API)', 290]] },
  // --- Intelligence artificielle
  { id: 'iapro', icon: 'sparkles', nom: 'Intelligence artificielle', desc: 'Formation, assistants et automatisations', base: 149, modes: ['distance', 'site', 'atelier'],
    note: 'On part de vos tâches réelles : ce qui prend du temps, ce qui se répète. L’IA fait le travail, vous gardez le contrôle, et vos données restent protégées.',
    compris: ['Bilan des tâches où l’IA fait gagner du temps', 'Formation de 2 h avec vos vrais exemples', 'Règles simples pour protéger vos données et celles de vos clients'],
    pasCompris: ['Abonnements aux outils d’IA (ChatGPT, Copilot, Gemini…), si vous en prenez'],
    options: [['assistant', 'Assistant IA qui répond à vos clients (site ou WhatsApp)', 390], ['auto', 'Automatisation avec l’IA (emails, devis, tri de documents)', 290],
      ['contenu', 'Textes et visuels pour vos réseaux, avec l’IA', 149], ['outils', 'Mise en place de ChatGPT, Copilot ou Gemini pour l’équipe', 99],
      ['charte', 'Charte d’utilisation de l’IA et protection des données', 149], ['flux', 'Outils reliés entre eux : formulaires, devis, factures, agenda, WhatsApp', 290], ['suivi', 'Séance de suivi (1 h) un mois après', 59]] },
  // --- Marketing
  { id: 'marketing', icon: 'megaphone', nom: 'Stratégie marketing', desc: 'Être visible, trouver des clients', base: 149, modes: ['distance', 'site', 'atelier'],
    note: 'On commence par un bilan de votre visibilité (Google, réseaux, site), puis un plan simple avec les actions qui rapportent le plus.',
    options: [['google', 'Fiche Google Maps optimisée', 79], ['pub', 'Campagne de publicité Facebook / Instagram', 99], ['contenu', '4 visuels ou vidéos courtes', 149],
      ['emailing', 'Emailing / newsletter clients', 89], ['form', 'Formation réseaux sociaux (2 h)', 69]] },
  { id: 'reseaux', icon: 'trending', nom: 'Agence réseaux sociaux', desc: 'Tous vos réseaux, publiés automatiquement', base: 149, mensuel: true, modes: ['distance'],
    note: 'Prix par mois, sans engagement : nous préparons vos contenus, les programmons sur tous vos réseaux et comptes, et vous envoyons un bilan chaque mois.',
    compris: ['Instagram, Facebook, TikTok, LinkedIn, YouTube Shorts et fiche Google', 'Calendrier de publication programmé à l’avance (Buffer)', 'Publications chaque semaine, même quand vous êtes occupé', 'Bilan mensuel : vues, abonnés, messages reçus'],
    pasCompris: ['Budget de publicité payé aux réseaux sociaux'],
    options: [['comptes', 'Compte ou marque supplémentaire', 79], ['videos', '4 vidéos courtes par mois', 99], ['pubs', 'Gestion de vos publicités', 49], ['avis', 'Réponses aux avis Google', 29], ['messages', 'Réponses aux messages et commentaires', 59]] },
  { id: 'contenuia', icon: 'sparkles', nom: 'Contenus vidéo créés avec l’IA', desc: 'Vidéos courtes, carrousels, voix et sous-titres', base: 199, mensuel: true, modes: ['distance'],
    note: 'Prix par mois : une production régulière de vidéos courtes et de visuels, créés avec l’intelligence artificielle et vérifiés par un humain, puis publiés tout seuls.',
    compris: ['8 vidéos courtes par mois (Reels, TikTok, Shorts) avec voix et sous-titres', '8 visuels ou carrousels', 'Idées de sujets adaptées à votre activité', 'Publication automatique sur vos réseaux'],
    pasCompris: ['Tournage sur place (option drone ou vidéo)', 'Budget de publicité'],
    options: [['plus', '8 vidéos de plus par mois', 149], ['mascotte', 'Mascotte ou avatar à votre image (création amortie sur 6 mois)', 49], ['langues', 'Versions en créole ou en anglais', 49]] },
  // --- Entreprises
  { id: 'reseaupro', icon: 'network', nom: 'Réseau d’entreprise', desc: 'Câblage, Wi-Fi pro, serveur', base: 79, modes: ['site'],
    note: 'Matériel (switch, bornes, NAS) conseillé et chiffré séparément.',
    options: [['cablage', 'Câblage RJ45 (par prise)', 39], ['baie', 'Baie de brassage et switch', 149], ['wifipro', 'Wi-Fi professionnel multi-bornes', 149],
      ['vpn', 'Accès à distance / télétravail (VPN)', 99], ['nas', 'Serveur de fichiers partagé (NAS)', 129], ['invite', 'Wi-Fi invités séparé', 49]] },
  { id: 'cloudpro', icon: 'mail', nom: 'Emails pro & Microsoft 365', desc: 'Adresses à votre nom, cloud', base: 49, modes: ['distance', 'site'],
    note: 'Abonnements Microsoft 365 ou Google Workspace non inclus (à partir de quelques euros par utilisateur et par mois).',
    options: [['domaine', 'Adresses email à votre nom (domaine)', 49], ['m365', 'Mise en place Microsoft 365 ou Google Workspace', 79], ['migration', 'Transfert des anciens emails', 59],
      ['partage', 'Agendas et fichiers partagés', 39], ['postes', 'Configuration des ordinateurs et téléphones (par poste)', 15]] },
  { id: 'pos', icon: 'receipt', nom: 'Caisse enregistreuse', desc: 'Pour commerces', base: 149, modes: ['site'],
    options: [['touch', 'Écran tactile', 190], ['drawer', 'Tiroir-caisse', 79], ['scanner', 'Lecteur code-barres', 59], ['printer', 'Imprimante ticket', 79], ['stock', 'Gestion des stocks', 49], ['tpe', 'Liaison terminal CB', 39]] },
  { id: 'maintenance', icon: 'tools', nom: 'Maintenance informatique', desc: 'Assistance et entretien du parc', base: 49, modes: ['site', 'distance'], appareil: true,
    compris: ['Assistance par téléphone et à distance', 'Mises à jour et antivirus suivis', 'Un interlocuteur qui connaît votre parc'], pasCompris: ['Matériel et licences'],
    options: [['pc', 'Entretien des postes', 30], ['security', 'Antivirus des postes', 25], ['server', 'Serveur', 89], ['check', 'Bilan de santé du parc', 19]] }
];

// Onglets « À la carte » : un onglet = un type de besoin, chaque service n'est qu'à un seul endroit
// couleur : thème de la catégorie (onglet, cartes, sélection ; un pack qui mélange plusieurs catégories prend un dégradé)
// bientot : true = onglet affiché mais pas encore disponible
// Univers : regroupent les onglets (ligne du titre « À la carte »)
const UNIVERS = [
  { id: 'info',   nom: 'Informatique',     icon: 'monitor',   badge: 'tools',    couleur: '#2b8cff', desc: 'Dépannage, installation, sécurité, fichiers et cours, chez vous, en agence ou à distance.' },
  { id: 'maison', nom: 'Maison connectée', icon: 'home',      badge: 'wifi',     couleur: '#22c55e', desc: 'Caméras, alarme, domotique et Wi-Fi dans toute la maison.' },
  { id: 'web',    nom: 'Web, IA & marketing',  icon: 'globe',     badge: 'trending', couleur: '#6366f1', desc: 'Sites web, intelligence artificielle, boutiques en ligne, applications et stratégie pour trouver des clients.' },
  { id: 'pro',    nom: 'Entreprises',      icon: 'briefcase', badge: 'shield',   couleur: '#8b5cf6', desc: 'Maintenance informatique, cybersécurité et caisse pour les commerces et les bureaux.' },
  { id: 'crea',   nom: 'Drone & immobilier',       icon: 'drone',     badge: 'camera',   couleur: '#38bdf8', desc: 'Photos et vidéos aériennes, inspection de toiture, et tout pour vendre ou louer un bien.' }
];

// accroche : la phrase qui parle au client ; badge : petit pictogramme de l'illustration
const CATEGORIES = [
  { id: 'ordi',      univers: 'info',   nom: 'Ordinateur',    icon: 'monitor',    badge: 'tools',      couleur: '#2b8cff', services: ['repair', 'boost', 'hwfixe', 'hwportable'],
    accroche: 'Votre ordinateur rame, plante ou ne démarre plus ? On le remet en forme.' },
  { id: 'securite',  univers: 'info',   nom: 'Sécurité',      icon: 'shield',     badge: 'lock',       couleur: '#ef4444', services: ['antivirus', 'comptes'],
    accroche: 'Virus, publicités, compte piraté ? On sécurise tout, sans jargon.' },
  { id: 'donnees',   univers: 'info',   nom: 'Fichiers',      icon: 'database',   badge: 'cloud',      couleur: '#14b8a6', services: ['sauvegarde', 'recup', 'stockage', 'recyclage'],
    accroche: 'Vos photos et documents sont précieux : on les sauve et on les protège.' },
  { id: 'install',   univers: 'info',   nom: 'Installation',  icon: 'printer',    badge: 'zap',        couleur: '#a78bfa', services: ['install', 'printer', 'ups'],
    accroche: 'Nouveau PC, imprimante, onduleur : on installe, vous profitez.' },
  { id: 'mobile',    univers: 'info',   nom: 'Mobile & tablette', icon: 'smartphone', badge: 'tools',  couleur: '#c084fc', services: ['mobile'],
    accroche: 'Téléphone ou tablette cassé, lent ou tout neuf ? On s’en occupe.' },
  { id: 'gaming',    univers: 'info',   nom: 'Gaming',        icon: 'gamepad',    badge: 'zap',        couleur: '#e040fb', services: ['console', 'emulation', 'gamer'],
    accroche: 'Console qui chauffe, PC gamer à monter, jeux rétro : on règle tout.' },
  { id: 'aide',      univers: 'info',   nom: 'Aide & suivi',  icon: 'users',      badge: 'chat',       couleur: '#f59e0b', services: ['cours', 'abonnement'],
    accroche: 'Apprenez à votre rythme, avec quelqu’un de patient, chez vous.' },
  { id: 'starlink',  univers: 'maison', nom: 'Starlink',      icon: 'satellite',  badge: 'wifi',       couleur: '#94a3b8', services: ['starlink'], nouveau: true,
    accroche: 'Internet rapide partout, même dans les mornes : on installe votre Starlink.' },
  { id: 'camera',    univers: 'maison', nom: 'Caméras',       icon: 'camera',     badge: 'shield',     couleur: '#fb923c', services: ['camera', 'alarme'],
    accroche: 'Surveillez votre maison depuis votre téléphone, de jour comme de nuit.' },
  { id: 'domo',      univers: 'maison', nom: 'Domotique',     icon: 'home',       badge: 'smartphone', couleur: '#22c55e', services: ['domotique'],
    accroche: 'Pilotez lumières, clim et volets depuis votre téléphone.' },
  { id: 'wifi',      univers: 'maison', nom: 'Wi-Fi',         icon: 'wifi',       badge: 'home',       couleur: '#22d3ee', services: ['network'],
    accroche: 'Le Wi-Fi partout dans la maison, sans coupure.' },
  { id: 'multimedia', univers: 'maison', nom: 'TV & multimédia', icon: 'tv',      badge: 'zap',        couleur: '#f472b6', services: ['multimedia'],
    accroche: 'Votre TV, votre box et votre son bien installés, sans prise de tête.' },
  { id: 'web',       univers: 'web',    nom: 'Site web',      icon: 'globe',      badge: 'search',     couleur: '#6366f1', services: ['siteweb', 'maintweb', 'sitepirate'],
    accroche: 'Un site qui présente votre activité et vous apporte des demandes.' },
  { id: 'appli',     univers: 'web',    nom: 'Application',   icon: 'smartphone', badge: 'users',      couleur: '#ec4899', services: ['appmobile'],
    accroche: 'Une application à votre nom, pensée pour vos clients.' },
  { id: 'prog',      univers: 'web',    nom: 'Programmation', icon: 'code',       badge: 'zap',        couleur: '#0ea5e9', services: ['devsurmesure'],
    accroche: 'Gagnez du temps : on automatise vos tâches répétitives.' },
  { id: 'ia',        univers: 'web',    nom: 'IA',            icon: 'sparkles',   badge: 'zap',        couleur: '#a855f7', services: ['iapro'], nouveau: true,
    accroche: 'L’intelligence artificielle au service de votre activité : formation, assistants, automatisations.' },
  { id: 'marketing', univers: 'web',    nom: 'Marketing',     icon: 'megaphone',  badge: 'trending',   couleur: '#84cc16', services: ['marketing', 'reseaux', 'contenuia'],
    accroche: 'Votre agence marketing : réseaux sociaux, vidéos créées avec l’IA, publicité et visibilité Google.' },
  { id: 'pro',       univers: 'pro',    nom: 'Maintenance',   icon: 'tools',      badge: 'shield',     couleur: '#8b5cf6', services: ['maintenance'],
    accroche: 'Une informatique qui tourne, pour vous concentrer sur votre métier.' },
  { id: 'reseau',    univers: 'pro',    nom: 'Réseau',        icon: 'network',    badge: 'wifi',       couleur: '#06b6d4', services: ['reseaupro'],
    accroche: 'Un réseau rapide et fiable pour toute l’équipe.' },
  { id: 'cloud',     univers: 'pro',    nom: 'Emails & cloud', icon: 'mail',      badge: 'cloud',      couleur: '#3b82f6', services: ['cloudpro'],
    accroche: 'Des emails à votre nom et des fichiers partagés, partout.' },
  { id: 'cyber',     univers: 'pro',    nom: 'Cybersécurité', icon: 'lock',       badge: 'search',     couleur: '#f43f5e', services: ['cyberexpress', 'cyber'],
    accroche: 'Vérifiez vos accès et vos sites avant qu’un pirate ne le fasse.' },
  { id: 'caisse',    univers: 'pro',    nom: 'Caisse',        icon: 'receipt',    badge: 'zap',        couleur: '#facc15', services: ['pos'],
    accroche: 'Une caisse simple, rapide et fiable pour votre commerce.' },
  { id: 'drone',     univers: 'crea',   nom: 'Drone',         icon: 'drone',      badge: 'camera',     couleur: '#38bdf8', services: ['drone'],
    accroche: 'Votre maison, votre commerce ou votre événement vus du ciel.' },
  { id: 'immo',      univers: 'crea',   nom: 'Immobilier',    icon: 'home',       badge: 'camera',     couleur: '#f97316', services: ['immobilier'], nouveau: true,
    accroche: 'Vendre ou louer plus vite : photos, vidéo, drone et annonce prêts à publier.' },
  { id: 'print3d',   univers: 'crea',   bientot: true,   nom: 'Impression 3D', icon: 'box',        badge: 'tools',      couleur: '#10b981', services: ['impression3d'],
    accroche: 'Un objet, un support, une pièce : on l’imprime en 3D.' }
];

// Annoncés sous les onglets (« Bientôt ») — retirez une ligne quand le service est lancé.
// photos (illustrations) par onglet : img/photos/<nom>.jpg — affichées à la place du dessin quand elles existent
const PHOTOS_CAT = { starlink: 'starlink-carre', ordi: 'reparation', camera: 'camera', ia: 'ia', drone: 'drone', marketing: 'reseaux', aide: 'seniors', immo: 'drone' };

// Vitrines (page Services) : « ce que vous obtenez » (icône, texte) et 3 pastilles d'exemple par onglet
// carrousel de l'accueil : [catégorie, titre affiché] ; photo = PHOTOS_CAT, texte = accroche + VITRINES
const CARROUSEL = [['starlink', 'Installation Starlink'], ['ordi', 'Dépannage et réparation'], ['camera', 'Caméras de surveillance'],
  ['ia', 'Intelligence artificielle'], ['immo', 'Drone et immobilier'], ['marketing', 'Réseaux sociaux et marketing'], ['aide', 'Cours et accompagnement']];

const VITRINES = {
  ordi:      { obtenez: [['search', 'Diagnostic de la panne'], ['doc', 'Prix annoncé avant'], ['database', 'Fichiers préservés'], ['pin', 'Chez vous, en agence ou à distance']], puces: ['Démarrage en 14 s', 'Écran remplacé', 'PC silencieux'] },
  securite:  { obtenez: [['shield', 'Virus supprimés'], ['lock', 'Comptes récupérés'], ['phone', 'Double sécurité activée'], ['help', 'Conseils anti-arnaques']], puces: ['12 virus supprimés', 'Compte récupéré', 'Navigateur sain'] },
  donnees:   { obtenez: [['search', 'Diagnostic du support'], ['database', 'Fichiers récupérés'], ['cloud', 'Sauvegarde automatique'], ['repeat', 'Restauration testée']], puces: ['1 284 photos sauvées', 'Sauvegarde chaque nuit', 'Copie en ligne'] },
  install:   { obtenez: [['laptop', 'PC prêt à l’emploi'], ['drive', 'Fichiers transférés'], ['printer', 'Imprimante connectée'], ['battery', 'Protection des coupures']], puces: ['Office installé', 'Imprimante OK', 'Onduleur posé'] },
  mobile:    { obtenez: [['smartphone', 'Écran et batterie'], ['repeat', 'Transfert complet'], ['chat', 'WhatsApp sauvegardé'], ['users', 'Réglages simples']], puces: ['Stockage libéré', 'Photos transférées', 'Texte agrandi'] },
  gaming:    { obtenez: [['gamepad', 'Console nettoyée'], ['monitor', 'PC gamer sur mesure'], ['zap', 'Jeux optimisés'], ['joystick', 'Rétro-gaming']], puces: ['144 images/s', 'Console silencieuse', 'Budget respecté'] },
  aide:      { obtenez: [['users', 'Cours à votre rythme'], ['home', 'À domicile ou à distance'], ['doc', 'Fiche mémo laissée'], ['shield', 'Repérer les arnaques']], puces: ['Appels vidéo', 'Démarches en ligne', 'Découverte de l’IA'] },
  starlink:  { obtenez: [['search', 'Emplacement sans obstacle'], ['tools', 'Fixation anti-vent'], ['wifi', 'Wi-Fi dans toute la maison'], ['zap', 'Test de débit devant vous']], puces: ['En ligne partout', 'Même dans les mornes', 'Secours de la box'] },
  camera:    { obtenez: [['camera', 'Caméras installées'], ['smartphone', 'Vue sur le téléphone'], ['bell', 'Alerte en cas de mouvement'], ['database', 'Enregistrement']], puces: ['Vision de nuit', 'Alerte portail', 'Caméra solaire 4G'] },
  domo:      { obtenez: [['home', 'Maison connectée'], ['smartphone', 'Tout sur une application'], ['zap', 'Clim et lumières programmées'], ['lock', 'Serrure et portail']], puces: ['Clim à distance', 'Volets programmés', 'Économies'] },
  wifi:      { obtenez: [['search', 'Signal mesuré partout'], ['wifi', 'Bornes Wi-Fi mesh'], ['network', 'Box bien réglée'], ['home', 'Un seul réseau']], puces: ['Wi-Fi à l’étage', 'Jusqu’à la terrasse', 'Télétravail OK'] },
  multimedia:{ obtenez: [['tv', 'TV installée'], ['remote', 'Box et chaînes'], ['smartphone', 'Téléphone sur la TV'], ['tools', 'Câbles rangés']], puces: ['Une télécommande', 'Son puissant', 'Netflix prêt'] },
  web:       { obtenez: [['globe', 'Site adapté au téléphone'], ['search', 'Visible sur Google'], ['chat', 'Bouton WhatsApp'], ['lock', 'Le site vous appartient']], puces: ['Commande en ligne', 'Prise de rendez-vous', 'Paiement en 3 fois'] },
  appli:     { obtenez: [['smartphone', 'Parcours en quelques écrans'], ['users', 'Espace client'], ['calendar', 'Réservation'], ['doc', 'Code remis']], puces: ['Maquette à tester', 'Installable sur mobile', 'Rappels automatiques'] },
  prog:      { obtenez: [['code', 'Outil sur mesure'], ['repeat', 'Tâches automatisées'], ['network', 'Outils reliés'], ['doc', 'Programme à vous']], puces: ['3 h gagnées / semaine', 'Export Excel', 'Factures triées'] },
  ia:        { obtenez: [['sparkles', 'Formation avec vos exemples'], ['chat', 'Assistant pour vos clients'], ['repeat', 'Automatisations'], ['lock', 'Données protégées']], puces: ['Réponses 7 j/7', 'Devis préparés', 'Emails triés'] },
  marketing: { obtenez: [['instagram', 'Tous vos réseaux'], ['sparkles', 'Vidéos créées avec l’IA'], ['calendar', 'Publication automatique'], ['trending', 'Bilan mensuel']], puces: ['Reels et stories', 'Plusieurs comptes', 'Fiche Google'] },
  pro:       { obtenez: [['tools', 'Postes suivis'], ['cloud', 'Sauvegardes vérifiées'], ['shield', 'Antivirus'], ['phone', 'Assistance rapide']], puces: ['8/8 postes à jour', 'Sauvegarde 02:00', 'Rapport mensuel'] },
  reseau:    { obtenez: [['network', 'Câblage propre'], ['wifi', 'Wi-Fi pro'], ['lock', 'Accès sécurisés'], ['drive', 'Fichiers partagés']], puces: ['Wi-Fi invités', 'Télétravail (VPN)', 'Baie rangée'] },
  cloud:     { obtenez: [['mail', 'Emails à votre nom'], ['cloud', 'Microsoft 365 / Google'], ['calendar', 'Agendas partagés'], ['smartphone', 'Sur tous les appareils']], puces: ['contact@votre-nom', 'Anciens emails repris', 'Fichiers partagés'] },
  cyber:     { obtenez: [['search', 'Contrôle express'], ['doc', 'Rapport clair'], ['shield', 'Corrections ciblées'], ['repeat', 'Contre-vérification']], puces: ['4/5 vérifiés', 'Emails protégés', 'Priorités claires'] },
  caisse:    { obtenez: [['receipt', 'Caisse tactile'], ['printer', 'Tickets imprimés'], ['store', 'Stock suivi'], ['battery', 'Pas d’arrêt aux coupures']], puces: ['Paiement CB relié', 'Équipe formée', 'Ventes du jour'] },
  drone:     { obtenez: [['drone', '30 min de vol'], ['camera', 'Photos HD retouchées'], ['home', 'Toiture vue de près'], ['zap', 'Livré sous 48 h']], puces: ['Vue mer', 'Inspection toiture', 'Clip 4K'] },
  immo:      { obtenez: [['camera', 'Photos intérieures'], ['drone', 'Vue aérienne du bien'], ['globe', 'Page du bien à partager'], ['lock', 'Location saisonnière équipée']], puces: ['Annonce prête', 'Visite en vidéo', 'Serrure connectée'] },
};
const BIENTOT = ['Vente d’accessoires', 'Impression 3D'];

// Type d'appareil demandé à l'étape « Situation » (pré-rempli selon les services choisis)
const APPAREILS = { fixe: 'PC fixe', portable: 'PC portable', aio: 'PC tout-en-un', mac: 'Mac', console: 'Console de jeux', autre: 'Autre' };

// Packs : une solution complète à un besoin précis, à PRIX FIXE.
//   nom    : ce que le client veut obtenir, avec ses mots
//   pour   : à qui il s'adresse (Ordinateur, Maison, Commerce)
//   inclus : 3 lignes simples affichées au client
//   items  : services + options correspondants (sert au calcul « au lieu de »)
//   univers: le pôle où la formule est proposée
const PACKS = [
  // Informatique
  { id: 'boost',   univers: 'info', icon: 'zap',      pour: 'Ordinateur', populaire: true, nom: 'Rendre mon PC rapide', prix: 59,
    inclus: ['Nettoyage de Windows', 'Démarrage plus rapide', 'Mises à jour et pilotes'], items: { boost: ['startup', 'clean', 'drivers', 'bloat'] } },
  { id: 'virus',   univers: 'info', icon: 'shield',   pour: 'Sécurité', nom: 'Supprimer un virus', prix: 49,
    inclus: ['Virus et pubs supprimés', 'Antivirus installé', 'Analyse complète du PC'], items: { antivirus: ['virus', 'install', 'scan'] } },
  { id: 'donnees', univers: 'info', icon: 'database', pour: 'Fichiers', nom: 'Récupérer mes fichiers', prix: 89,
    inclus: ['Diagnostic du disque', 'Photos et fichiers sauvés', 'Copiés sur clé ou disque'], items: { recup: ['disk', 'deleted'] } },
  { id: 'backup',  univers: 'info', icon: 'cloud',    pour: 'Fichiers', nom: 'Sauvegarder mes données', prix: 59,
    inclus: ['Sauvegarde automatique', 'Copie en ligne (cloud)', 'Restauration expliquée'], items: { sauvegarde: ['auto', 'cloud'] } },
  { id: 'newpc',   univers: 'info', icon: 'laptop',   pour: 'Installation', nom: 'Installer mon nouveau PC', prix: 89,
    inclus: ['PC prêt à l’emploi', 'Fichiers transférés', 'Office, mails, imprimante'], items: { install: ['newpc', 'transfer', 'office'], printer: [] } },
  { id: 'phone',   univers: 'info', icon: 'smartphone', pour: 'Mobile', nom: 'Mon téléphone comme neuf', prix: 39,
    inclus: ['Transfert de l’ancien téléphone', 'Photos et contacts sauvegardés', 'Applications réglées'], items: { mobile: ['transfer', 'backup', 'setup'] } },
  // Maison connectée
  { id: 'wifi',    univers: 'maison', icon: 'wifi',   pour: 'Maison', nom: 'Wi-Fi partout chez moi', prix: 149,
    inclus: ['Signal mesuré partout', 'Wi-Fi dans chaque pièce', 'Box et appareils réglés'], items: { network: ['audit', 'mesh', 'router'] } },
  { id: 'video',   univers: 'maison', icon: 'camera', pour: 'Maison', nom: 'Surveiller ma maison', prix: 349,
    inclus: ['2 caméras installées', 'Vision de nuit', 'Vue sur smartphone'], items: { camera: ['cam2', 'night', 'remote'] } },
  { id: 'starlink', univers: 'maison', icon: 'satellite', pour: 'Starlink', populaire: true, nom: 'Starlink installé, Wi-Fi partout', prix: 229,
    inclus: ['Antenne posée sur le toit', 'Wi-Fi dans toute la maison', 'Test de débit devant vous'], items: { starlink: ['commande', 'toit', 'mesh'] } },
  { id: 'tv',      univers: 'maison', icon: 'tv',     pour: 'Maison', nom: 'Ma TV et ma box bien installées', prix: 59,
    inclus: ['TV connectée réglée', 'Box et chaînes', 'Téléphone affiché sur la TV'], items: { multimedia: ['tv', 'box', 'cast'] } },
  // Web & marketing
  { id: 'lancer',  univers: 'web', icon: 'globe',     pour: 'Entreprise', nom: 'Lancer mon activité en ligne', prix: 890,
    inclus: ['Site vitrine 5 pages à votre nom', 'Fiche Google Maps optimisée', 'Référencement local'], items: { siteweb: ['pages', 'domain', 'seo'], marketing: ['google'] } },
  { id: 'ia',      univers: 'web', icon: 'sparkles',  pour: 'IA', nom: 'Gagner du temps avec l’IA', prix: 349,
    inclus: ['Formation de l’équipe (2 h)', 'Une tâche automatisée avec l’IA', 'Règles pour protéger vos données'], items: { iapro: ['auto', 'charte'] } },
  { id: 'clients', univers: 'web', icon: 'megaphone', pour: 'Entreprise', nom: 'Trouver plus de clients', prix: 299,
    inclus: ['Bilan et plan d’action', 'Fiche Google optimisée', 'Publicité + 4 visuels'], items: { marketing: ['google', 'pub', 'contenu'] } },
  // Entreprises
  { id: 'shop',    univers: 'pro', icon: 'receipt',   pour: 'Commerce', nom: 'Équiper mon commerce', prix: 590,
    inclus: ['Caisse + tiroir-caisse', 'Lecteur et tickets', 'Terminal CB relié'], items: { pos: ['touch', 'drawer', 'scanner', 'printer', 'tpe'], network: ['router'] } },
  { id: 'bureau',  univers: 'pro', icon: 'briefcase', pour: 'Bureau', nom: 'Équiper mon bureau', prix: 349,
    inclus: ['Réseau et Wi-Fi pro', 'Emails à votre nom', 'Microsoft 365 ou Google'], items: { reseaupro: ['cablage', 'wifipro'], cloudpro: ['domaine', 'm365'] } },
  { id: 'secupro', univers: 'pro', icon: 'shield',    pour: 'Entreprise', nom: 'Protéger mon entreprise', prix: 390,
    inclus: ['Audit des accès et emails', 'Sauvegarde automatique', 'Rapport clair'], items: { cyber: ['email', 'acces'], sauvegarde: ['auto', 'cloud'] } },
  // Drone & 3D
  { id: 'vendre',  univers: 'crea', icon: 'home', pour: 'Immobilier', nom: 'Vendre mon bien', prix: 399,
    inclus: ['15 photos + vue drone', 'Vidéo de visite', 'Page web du bien'], items: { immobilier: ['video', 'page'] } },
  { id: 'saison',  univers: 'crea', icon: 'lock', pour: 'Immobilier', nom: 'Louer en saisonnier', prix: 349,
    inclus: ['Photos + vue drone', 'Serrure connectée et Wi-Fi', 'Livret d’accueil QR code'], items: { immobilier: ['serrure', 'wifi', 'guide'] } },
  { id: 'aerien',  univers: 'crea', icon: 'drone',    pour: 'Drone', nom: 'Vue aérienne de mon bien', prix: 229,
    inclus: ['Photos aériennes HD', 'Vidéo montée', 'Idéal location, vente, commerce'], items: { drone: ['photo', 'video'] } }
];

// « Décrire mon problème » : chaque situation sélectionne un pack, ou des services / options
const SYMPTOMES = [
  { id: 'lent',    label: 'Mon ordinateur est lent',                  pack: 'boost' },
  { id: 'boot',    label: 'Mon PC ne démarre plus',                   items: { repair: ['boot'] } },
  { id: 'chauffe', label: 'Mon PC chauffe ou fait du bruit',          items: { hwfixe: ['fan'] } },
  { id: 'ecran',   label: "L'écran de mon portable est cassé",        items: { hwportable: ['screen'] } },
  { id: 'virus',   label: "J'ai un virus ou des pubs partout",        pack: 'virus' },
  { id: 'pirate',  label: 'Mon compte a été piraté',                  items: { comptes: ['hack', '2fa'] } },
  { id: 'data',    label: "J'ai perdu des fichiers",                  pack: 'donnees' },
  { id: 'save',    label: 'Je veux sauvegarder mes données',          pack: 'backup' },
  { id: 'plein',   label: 'Mon disque est plein',                     items: { stockage: ['upgrade'] } },
  { id: 'newpc',   label: "J'ai acheté un nouveau PC",                pack: 'newpc' },
  { id: 'print',   label: 'Mon imprimante ne marche pas',             items: { printer: ['panne'] } },
  { id: 'courant', label: 'Les coupures de courant abîment mon matériel', items: { ups: ['auto'] } },
  { id: 'emu',     label: 'Je veux jouer à mes anciens jeux',         items: { emulation: ['emu'] } },
  { id: 'consol',  label: 'Ma console chauffe ou rame',               items: { console: ['clean', 'storage'] } },
  { id: 'starlink', label: 'Je veux Starlink (internet par satellite)', pack: 'starlink' },
  { id: 'lenteur', label: 'Internet est lent ou coupe souvent chez moi', items: { network: ['audit'] } },
  { id: 'wifi',    label: 'Le Wi-Fi ne capte pas partout',            pack: 'wifi' },
  { id: 'ia',      label: 'Je veux apprendre à utiliser l’IA (ChatGPT)', items: { cours: ['ia'] } },
  { id: 'iapro',   label: 'Je veux utiliser l’IA dans mon entreprise', pack: 'ia' },
  { id: 'chatbot', label: 'Je veux un assistant qui répond à mes clients', items: { iapro: ['assistant'] } },
  { id: 'immo',    label: 'Je vends ou je loue un bien (photos, vidéo, annonce)', items: { immobilier: [] } },
  { id: 'posts',   label: 'Je veux publier sur tous mes réseaux sans y passer du temps', items: { reseaux: [], contenuia: [] } },
  { id: 'cam4g',   label: 'Je veux une caméra sans Wi-Fi (terrain, chantier)', items: { camera: ['solaire'] } },
  { id: 'net',     label: "Je n'ai plus internet",                    items: { network: ['router'] } },
  { id: 'surv',    label: 'Je veux surveiller ma maison',             pack: 'video' },
  { id: 'alarme',  label: 'Je veux une alarme ou un visiophone',      items: { alarme: ['alarm'] } },
  { id: 'domo',    label: 'Je veux piloter ma maison au téléphone',   items: { domotique: ['hub', 'plug'] } },
  { id: 'shop',    label: "J'ouvre ou j'équipe un commerce",          pack: 'shop' },
  { id: 'site',    label: 'Je veux un site web pour mon activité',    items: { siteweb: [] } },
  { id: 'appli',   label: 'Je veux une application pour mes clients', items: { appmobile: [] } },
  { id: 'audit',   label: 'Je veux vérifier la sécurité de mon site', items: { cyberexpress: [] } },
  { id: 'pirate2', label: 'Mon site est piraté ou ne s’affiche plus', items: { sitepirate: [] } },
  { id: 'clients', label: 'Je veux plus de clients / être plus visible', items: { marketing: ['google'] } },
  { id: 'reseau',  label: 'Je n’ai pas le temps de gérer mes réseaux',  items: { reseaux: [] } },
  { id: 'droneph', label: 'Je veux des photos ou vidéos par drone',     items: { drone: ['photo'] } },
  { id: 'tel',     label: 'L’écran de mon téléphone est cassé',      items: { mobile: ['screen'] } },
  { id: 'newtel',  label: 'J’ai un nouveau téléphone à installer',   pack: 'phone' },
  { id: 'tv',      label: 'Ma TV ou ma box ne marche pas bien',       items: { multimedia: ['box'] } },
  { id: 'mails',   label: 'Je veux des emails à mon nom (entreprise)', items: { cloudpro: ['domaine'] } },
  { id: 'cable',   label: 'Je veux câbler ou équiper mon bureau',     pack: 'bureau' },
  { id: 'auto',    label: 'Je veux automatiser une tâche répétitive', items: { devsurmesure: ['excel'] } },
  { id: 'gamer',   label: 'Je veux un PC pour jouer',                 items: { gamer: ['build', 'windows'] } },
  { id: 'aide',    label: "J'ai besoin d'aide pour utiliser mon PC",  items: { cours: [] } },
  { id: 'vieux',   label: 'Je veux me débarrasser de mon ancien PC',  items: { recyclage: ['wipe', 'recycle'] } }
];

const MODES = {
  site:     { icon: 'car',    label: 'Chez vous',  desc: 'Un technicien se déplace' },
  atelier:  { icon: 'store',  label: 'En agence',  desc: 'Vous déposez le matériel — gratuit' },
  distance: { icon: 'remote', label: 'À distance', desc: 'Par internet — gratuit' }
};

// Le délai est calculé à partir de la date choisie
const DELAIS = {
  standard: { label: 'Standard',          desc: '3 jours ou plus',     prix: 0 },
  rapide:   { label: 'Rapide',            desc: 'Sous 24 à 48 h',      prix: 15 },
  urgence:  { label: 'Urgence jour même', desc: 'Par téléphone uniquement', prix: 35 }
};

// h : heures de début et de fin (utilisées pour le planning) — samedi uniquement le samedi
const CRENEAUX = {
  matin:  { label: 'Matin',        heures: '8 h – 12 h',  h: [8, 12],  prix: 0 },
  aprem:  { label: 'Après-midi',   heures: '13 h – 17 h', h: [13, 17], prix: 0 },
  samedi: { label: 'Samedi matin', heures: '8 h – 12 h',  h: [8, 12],  prix: 10 }
};

const TYPES = { individual: 'Un particulier', company: 'Une entreprise', commerce: 'Un commerce', liberal: 'Une profession libérale', asso: 'Une association / collectivité' };
const CONTACT_PREF = { appel: 'Un appel', whatsapp: 'WhatsApp', email: 'Email' };
const CONTRAT_PRO = 'contrat de maintenance mensuel (à partir de 49 €/mois par poste)';

const MESSAGES_WA = [
  ['Renseignement', "Bonjour IloTech, j'aimerais un renseignement."],
  ['Devis', 'Bonjour IloTech, je voudrais un devis pour : '],
  ['Suivi réparation', 'Bonjour IloTech, je viens aux nouvelles de ma réparation (référence : ).'],
  ['Urgent', "Bonjour IloTech, j'ai un problème urgent : "],
  ['Professionnel', 'Bonjour IloTech, je suis un professionnel et je souhaite parler de la maintenance de mon parc informatique.']
];

/* Icônes (trait simple) */
const ICONS = {
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>',
  camera: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m16 10 6-3v10l-6-3"/>',
  receipt: '<path d="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  car: '<path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11M3 11h18v6H3zM6 17v2M18 17v2"/><circle cx="7" cy="14" r=".8"/><circle cx="17" cy="14" r=".8"/>',
  store: '<path d="M3 9l2-5h14l2 5M4 9v11h16V9M9 20v-6h6v6M3 9h18"/>',
  remote: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M8 10h8M13 7l3 3-3 3"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
  facebook: '<path d="M14 8h2.5V4.5H14A3.5 3.5 0 0 0 10.5 8v2.5H8V14h2.5v6.5H14V14h2.5l.5-3.5h-3V8.5a.5.5 0 0 1 .5-.5z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.5v.01M12 17v-3.5a2.5 2.5 0 0 1 5 0V17M12 10.5V17"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  satellite: '<path d="M4 10a9 9 0 0 0 10 10z"/><path d="M9 15l4-4"/><circle cx="13.5" cy="10.5" r="1.2"/><path d="M15 3a6 6 0 0 1 6 6M15 6.5a2.5 2.5 0 0 1 2.5 2.5"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17v.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12.5 3.5 3.5 0 0 0 6 19z"/>',
  drive: '<rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 13 8 4h8l2 9M17 17h.01"/>',
  tools: '<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19l-3 1 1-3 7.7-7.7z"/><path d="M5 3 3 5l4 4 2-2z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6 6 0 0 1 3.5 5.5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  recycle: '<path d="M7 19H4.8a1.8 1.8 0 0 1-1.6-2.7L7.3 9"/><path d="M11 19h8.2a1.8 1.8 0 0 0 1.6-2.7l-1.2-2"/><path d="m14 16-3 3 3 3"/><path d="M8.3 13.6 7.3 9l-4.6 1"/><path d="m9.3 5.7 1-1.8a1.8 1.8 0 0 1 3.1 0l4 6.8"/><path d="m13.4 9.5 4.6 1 1-4.6"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M2 13h20"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  trending: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  tv: '<rect x="2" y="7" width="20" height="13" rx="2"/><path d="m17 2-5 5-5-5"/>',
  network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-2h14v2"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
  drone: '<circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  battery: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><path d="m12 9-2.5 3.5h4L11 16"/>',
  tower: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 6h4M10 10h4"/><circle cx="12" cy="16" r="1.2"/>',
  joystick: '<path d="M12 4v8"/><circle cx="12" cy="4" r="2"/><path d="M5 20h14l-1.5-6h-11z"/><path d="M9 14h6"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 10.5v4M5 12.5h4M15.5 12h.01M18 14.5h.01"/>'
};
const ico = name => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// Statuts de suivi (doivent correspondre à la colonne « Statut » du tableau Google)
const SUIVI = {
  'Nouveau':          'Demande reçue. Un technicien va vous contacter pour confirmer.',
  'Confirmé':         'Rendez-vous confirmé. À bientôt !',
  'En diagnostic':    'Votre matériel est en cours de diagnostic.',
  'En réparation':    'La réparation est en cours.',
  'Prêt à récupérer': 'C’est prêt ! Vous pouvez venir récupérer votre matériel.',
  'Terminé':          'Intervention terminée. Merci de votre confiance.',
  'Devis envoyé':     'Votre devis vous a été envoyé.',
  'Devis accepté':    'Devis accepté : nous planifions l’intervention.',
  'Annulé':           'Cette demande a été annulée.'
};
