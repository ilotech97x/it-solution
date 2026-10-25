/* Génère les pages « service » optimisées pour Google (une page par besoin : Starlink, dépannage, caméras…).
   Le contenu est en HTML statique (lisible par Google sans JavaScript) ; les prix viennent de data.js.
   À relancer après un changement de prix ou de texte :   node generer-pages.js
   Écrit les fichiers *-martinique.html et met à jour sitemap.xml. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const dir = __dirname;

// data.js, outils.js et scenes.js chargés comme dans le navigateur
const ctx = { console, Date, Math, JSON, URLSearchParams, encodeURIComponent,
  document: { addEventListener() {}, referrer: '' }, location: { protocol: 'file:', search: '', pathname: '', host: '' },
  sessionStorage: { getItem: () => '1', setItem() {} }, navigator: {}, innerWidth: 1366 };
ctx.window = ctx;
vm.createContext(ctx);
['data.js', 'outils.js', 'scenes.js'].forEach(f => vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f }));
const { CONFIG, SERVICES, CATEGORIES, COMMUNES, ZONES, AGENCES, HORAIRES, ENTREPRISE } = vm.runInContext('({ CONFIG, SERVICES, CATEGORIES, COMMUNES, ZONES, AGENCES, HORAIRES, ENTREPRISE })', ctx);
const { esc, eur, svc, ico, scene, waUrl, bandeau } = vm.runInContext('({ esc, eur, svc, ico, scene, waUrl, bandeau })', ctx);
const SITE = CONFIG.siteUrl.replace(/\/?$/, '/');
const RESEAUX = Object.entries(CONFIG.reseaux || {}).filter(([, u]) => u);
const SAMEAS = RESEAUX.map(([, u]) => u);
const reseauxHtml = () => RESEAUX.length ? `<p class="reseaux">Suivez-nous : ${RESEAUX.map(([k, u]) => `<a href="${u}" target="_blank" rel="noopener me" aria-label="IloTech sur ${k}">${ico(k)}<span>${({ instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", facebook: "Facebook", linkedin: "LinkedIn" })[k] || k}</span></a>`).join('')}</p>` : '';
const V = (fs.readFileSync(path.join(dir, 'index.html'), 'utf8').match(/style\.css\?v=(\d+)/) || [])[1] || '1';

/* ---------- Contenu de chaque page ---------- */
const PAGES = [
  { slug: 'installation-starlink-martinique', cat: 'starlink', scene: 'starlink', services: ['starlink', 'network', 'ups'], nouveau: true,
    titre: 'Installation Starlink en Martinique dès 119 € | IloTech',
    desc: 'Installation Starlink en Martinique : pose de l’antenne sur le toit, câble, Wi-Fi dans toute la maison et secours pendant les coupures. Dès 119 €, devis gratuit. Ducos, Le Robert, toute l’île.',
    h1: 'Installation Starlink en Martinique',
    accroche: 'Internet rapide partout, même dans les mornes, au bout d’une trace ou sur un bateau : on installe votre Starlink proprement et on règle le Wi-Fi de toute la maison.',
    intro: [
      'Starlink est l’internet par satellite de SpaceX. Il fonctionne en Martinique, y compris là où la fibre et l’ADSL n’arrivent pas bien : quartiers des hauteurs, Nord Atlantique, Nord Caraïbe, maisons isolées, gîtes, chantiers ou bateaux.',
      'Le kit se pose « soi-même » en théorie. En pratique, tout se joue sur l’emplacement : la moindre branche, un morne ou un pignon devant l’antenne provoque des coupures. Nous repérons le meilleur endroit avec l’application, fixons l’antenne solidement (le vent et la saison cyclonique ne pardonnent pas), passons le câble proprement et réglons le Wi-Fi pour qu’il couvre toute la maison.'
    ],
    exemple: { titre: 'Exemple : une maison au Morne-Rouge', avant: ['ADSL à 2 Mb/s, coupures le soir', 'Antenne Starlink posée au sol, derrière un manguier', 'Wi-Fi qui ne passe pas à l’étage'], apres: ['Antenne fixée sur le pignon, 0 % d’obstacles', 'Bornes Wi-Fi : tout l’étage couvert', 'Box gardée en secours automatique'] },
    pourquoi: ['Repérage du ciel avec l’application avant de percer', 'Fixation adaptée au vent et aux cyclones', 'Câble passé proprement, sans trou inutile', 'Wi-Fi réglé dans toutes les pièces', 'Aide à la commande et à l’activation, offerte'],
    faq: [
      ['Starlink fonctionne-t-il en Martinique ?', 'Oui. Starlink est disponible en Martinique. Le débit dépend surtout de l’emplacement de l’antenne : il lui faut un grand morceau de ciel dégagé, c’est ce que nous vérifions avant la pose.'],
      ['Combien coûte l’installation ?', 'La pose commence à {starlink}. La formule « Starlink installé, Wi-Fi partout » (fixation sur le toit et bornes Wi-Fi) est à prix fixe. Le kit et l’abonnement s’achètent directement chez Starlink : nous vous aidons à les commander.'],
      ['Que se passe-t-il pendant une coupure de courant ?', 'Sans électricité, l’antenne s’arrête comme une box. Avec un onduleur adapté, internet reste allumé pendant les coupures courtes : nous le dimensionnons pour votre installation.'],
      ['Peut-on garder sa box internet ?', 'Oui. Nous pouvons relier la box et Starlink : si l’un tombe, l’autre prend le relais automatiquement.'],
      ['Et sur un bateau ou un chantier ?', 'Le Starlink Mini se règle pour un bateau, un véhicule ou un chantier. Nous vous montrons comment l’orienter et l’alimenter.']
    ] },
  { slug: 'depannage-informatique-martinique', cat: 'ordi', scene: 'ordi', services: ['repair', 'boost', 'hwfixe'],
    titre: 'Dépannage informatique en Martinique dès 35 € | IloTech',
    desc: 'Dépannage informatique en Martinique : PC lent, qui ne démarre plus, écran bleu, virus. Chez vous, en agence à Ducos et au Robert, ou à distance. Dès 35 €, prix annoncé avant.',
    h1: 'Dépannage informatique en Martinique',
    accroche: 'Votre ordinateur rame, plante ou ne démarre plus ? On le remet en forme, chez vous, en agence ou à distance, avec le prix annoncé avant.',
    intro: [
      'Un ordinateur qui met deux minutes à démarrer, un écran bleu, Windows qui refuse de s’ouvrir, un ventilateur qui hurle : ce sont les pannes que nous réglons tous les jours, pour les particuliers comme pour les professionnels.',
      'Nous commençons toujours par un diagnostic, puis nous vous annonçons le prix avant de réparer. Vos fichiers sont préservés. Selon la panne, nous intervenons chez vous, dans nos agences de Ducos et du Robert, ou à distance en quelques minutes.'
    ],
    exemple: { titre: 'Exemple : le PC portable de Mme L., au Lamentin', avant: ['Démarrage en 1 min 40', 'Fenêtres de publicité partout', 'Ventilateur bruyant'], apres: ['Démarrage en 14 s', 'Logiciels inutiles et pubs retirés', 'Nettoyage interne : PC silencieux'] },
    pourquoi: ['Diagnostic et prix annoncé avant toute réparation', 'Dès 35 €, parmi les tarifs les plus bas de l’île', 'Chez vous, en agence ou à distance', 'Vos fichiers préservés'],
    faq: [
      ['Combien coûte un dépannage d’ordinateur ?', 'Un dépannage commence à {repair}, diagnostic compris. Le prix exact est confirmé avant de réparer. En agence ou à distance, il n’y a pas de frais de déplacement.'],
      ['Intervenez-vous à domicile ?', 'Oui, dans toute la Martinique. Le déplacement est offert dans les communes d’agence et à partir d’un certain montant ; sinon il dépend de la zone (Centre, Sud, Nord).'],
      ['Mes fichiers vont-ils être effacés ?', 'Non. Nous préservons vos documents et vos photos. Si une réinstallation est nécessaire, nous les sauvegardons avant.'],
      ['Pouvez-vous intervenir à distance ?', 'Oui, pour la plupart des problèmes logiciels (lenteur, logiciels, imprimante, emails) : vous nous donnez l’accès temporairement et nous réglons tout en direct.']
    ] },
  { slug: 'reparation-ordinateur-portable-martinique', cat: 'ordi', scene: 'install', services: ['hwportable', 'hwfixe', 'stockage'],
    titre: 'Réparation d’ordinateur portable en Martinique | IloTech',
    desc: 'Réparation de PC portable et fixe en Martinique : écran cassé, batterie, clavier, charnière, prise de charge, surchauffe, disque SSD. Devis gratuit, agences à Ducos et au Robert.',
    h1: 'Réparation d’ordinateur portable et fixe',
    accroche: 'Écran cassé, batterie à plat, charnière qui lâche, prise de charge qui ne charge plus : on répare plutôt que de racheter.',
    intro: [
      'Un portable tombé, une batterie qui ne tient plus que vingt minutes, un clavier noyé de café, une charnière fendue : la plupart de ces pannes se réparent pour bien moins cher qu’un ordinateur neuf.',
      'Nous recevons votre ordinateur dans nos agences de Ducos et du Robert, commandons la pièce adaptée à votre modèle et vous annonçons le prix total avant. Un passage au SSD redonne souvent une seconde jeunesse à un ordinateur de plus de cinq ans.'
    ],
    exemple: { titre: 'Exemple : un portable étudiant à Schœlcher', avant: ['Écran fissuré après une chute', 'Disque dur lent', 'Batterie : 25 minutes'], apres: ['Écran neuf posé', 'SSD : démarrage en 12 s', 'Batterie neuve : une journée de cours'] },
    pourquoi: ['Pièce adaptée à votre modèle, prix annoncé avant', 'Réparer coûte souvent 3 à 5 fois moins qu’acheter', 'Passage au SSD et ajout de mémoire', 'Recyclage de l’ancien matériel'],
    faq: [
      ['Combien coûte le changement d’un écran de portable ?', 'La main d’œuvre est indiquée dans le tableau ci-dessous ; la pièce dépend du modèle. Nous vous donnons le prix total avant de commander.'],
      ['Mon ordinateur vaut-il la peine d’être réparé ?', 'Nous vous le disons franchement après le diagnostic : si la réparation coûte presque le prix d’un neuf, nous vous conseillons plutôt un remplacement et transférons vos fichiers.'],
      ['Combien de temps dure une réparation ?', 'Quelques heures pour un SSD ou de la mémoire. Pour un écran ou une batterie, cela dépend du délai de livraison de la pièce, annoncé à l’avance.']
    ] },
  { slug: 'virus-arnaque-compte-pirate-martinique', cat: 'securite', scene: 'securite', services: ['antivirus', 'comptes'],
    titre: 'Virus, arnaque, compte piraté : aide en Martinique | IloTech',
    desc: 'Suppression de virus, publicités, faux messages et récupération de compte piraté (Facebook, Gmail, WhatsApp) en Martinique. Sécurisation sans jargon, dès 29 €.',
    h1: 'Virus, arnaques et comptes piratés',
    accroche: 'Fenêtres qui s’ouvrent toutes seules, faux message de la banque, compte Facebook volé ? On nettoie, on récupère et on sécurise, sans jargon.',
    intro: [
      'Les arnaques par SMS, email ou faux appels se multiplient en Martinique comme ailleurs : faux colis, faux conseiller bancaire, faux support Microsoft. Un clic de trop suffit pour installer un logiciel espion ou se faire voler un compte.',
      'Nous supprimons les virus et les publicités, récupérons vos comptes (Facebook, Instagram, Gmail, WhatsApp), changeons les mots de passe et activons la double sécurité. Et nous vous apprenons à repérer les pièges la prochaine fois.'
    ],
    exemple: { titre: 'Exemple : un compte Facebook volé au François', avant: ['Le pirate publie des arnaques au nom du client', 'Mot de passe et email changés', 'Le client ne peut plus se connecter'], apres: ['Compte récupéré', 'Double sécurité activée', 'Amis prévenus, publications supprimées'] },
    pourquoi: ['Explications simples, sans jargon', 'Récupération de comptes réseaux sociaux et emails', 'Antivirus fiable installé', 'Conseils pour ne plus se faire avoir'],
    faq: [
      ['On m’a piraté mon compte Facebook, que faire ?', 'Ne payez jamais quelqu’un qui promet de le récupérer contre de l’argent sur internet. Contactez-nous : nous suivons la procédure officielle de récupération et sécurisons ensuite le compte.'],
      ['J’ai donné mes codes bancaires, que faire ?', 'Appelez tout de suite votre banque pour faire opposition, puis déposez plainte. Nous vérifions ensuite votre ordinateur et votre téléphone, et sécurisons vos comptes.'],
      ['Combien coûte la suppression d’un virus ?', 'La formule « Supprimer un virus » est à prix fixe, antivirus compris. Les tarifs détaillés sont ci-dessous.']
    ] },
  { slug: 'recuperation-donnees-sauvegarde-martinique', cat: 'donnees', scene: 'donnees', services: ['recup', 'sauvegarde', 'stockage'],
    titre: 'Récupération de données et sauvegarde en Martinique | IloTech',
    desc: 'Récupération de photos et fichiers perdus (disque dur, clé USB, carte SD, téléphone) et mise en place de sauvegardes automatiques en Martinique. Diagnostic et devis gratuits.',
    h1: 'Récupération de données et sauvegarde',
    accroche: 'Photos effacées, disque dur qui ne s’ouvre plus, clé USB illisible : on tente de tout récupérer, puis on met en place une sauvegarde pour ne plus jamais perdre.',
    intro: [
      'Une coupure de courant pendant une copie, un disque tombé, une carte SD corrompue, un dossier effacé par erreur : la perte de fichiers arrive vite, surtout avec les coupures fréquentes sur l’île.',
      'Nous diagnostiquons le support, récupérons ce qui peut l’être et vous remettons vos fichiers sur une clé ou un disque neuf. Ensuite, nous mettons en place une sauvegarde automatique (disque et cloud) pour que cela n’arrive plus.'
    ],
    exemple: { titre: 'Exemple : les photos de famille d’un couple de Sainte-Luce', avant: ['Disque externe qui ne s’ouvre plus', '15 ans de photos dessus', 'Aucune autre copie'], apres: ['1 284 photos récupérées', 'Copie sur un disque neuf', 'Sauvegarde automatique chaque nuit'] },
    pourquoi: ['Diagnostic avant toute intervention', 'Fichiers remis sur clé ou disque', 'Sauvegarde automatique et cloud', 'Confidentialité de vos fichiers'],
    faq: [
      ['Peut-on récupérer des photos effacées ?', 'Souvent oui, surtout si le support n’a pas été réutilisé depuis. Arrêtez d’utiliser la carte ou le disque et apportez-le nous.'],
      ['Mon disque fait un bruit de clic, que faire ?', 'Débranchez-le tout de suite : chaque essai peut aggraver la panne. Nous évaluons ce qui est récupérable.'],
      ['Comment ne plus perdre mes fichiers ?', 'Avec une sauvegarde automatique : une copie sur un disque à la maison et une copie en ligne. Nous l’installons et vous montrons comment restaurer un fichier.']
    ] },
  { slug: 'reparation-telephone-tablette-martinique', cat: 'mobile', scene: 'mobile', services: ['mobile'],
    titre: 'Réparation téléphone et tablette en Martinique | IloTech',
    desc: 'Téléphone et tablette en Martinique : écran cassé, batterie, stockage plein, transfert vers un nouveau téléphone, photos et WhatsApp sauvegardés. Agences à Ducos et au Robert.',
    h1: 'Téléphone et tablette : réparation et réglages',
    accroche: 'Écran cassé, batterie qui ne tient plus, stockage plein, nouveau téléphone à installer : on s’occupe de tout, photos et WhatsApp compris.',
    intro: [
      'Votre téléphone est votre agenda, votre banque et vos souvenirs. Quand il lâche, tout s’arrête. Nous changeons les écrans et les batteries, libérons de la place, et transférons tout vers un nouveau téléphone : contacts, photos, WhatsApp, applications.',
      'Idéal aussi pour les parents et grands-parents : nous réglons le téléphone pour qu’il soit simple à utiliser, avec les applications utiles et le texte plus grand.'
    ],
    exemple: { titre: 'Exemple : un nouveau téléphone pour une grand-mère du Robert', avant: ['Ancien téléphone plein à 92 %', 'Peur de perdre les photos', 'Nouveau téléphone encore dans sa boîte'], apres: ['Tout transféré : photos, contacts, WhatsApp', 'Texte agrandi, applications utiles', 'Ancien téléphone vidé en sécurité'] },
    pourquoi: ['Transfert complet, WhatsApp compris', 'Réglages simples pour les seniors', 'Écran et batterie remplacés', 'Données protégées'],
    faq: [
      ['Pouvez-vous transférer WhatsApp vers un nouveau téléphone ?', 'Oui, y compris d’un Android vers un iPhone (et inversement) dans la plupart des cas, avec vos discussions et photos.'],
      ['Mon téléphone est plein, que faire ?', 'Nous trions et sauvegardons vos photos et vidéos, supprimons ce qui est inutile et réglons une sauvegarde automatique.'],
      ['Combien coûte un changement d’écran ?', 'La main d’œuvre est indiquée ci-dessous ; la pièce dépend du modèle. Le prix total est annoncé avant.']
    ] },
  { slug: 'installation-wifi-internet-martinique', cat: 'wifi', scene: 'wifi', services: ['network', 'starlink'],
    titre: 'Installation Wi-Fi et internet en Martinique | IloTech',
    desc: 'Wi-Fi qui ne capte pas à l’étage ou sur la terrasse ? Diagnostic, bornes Wi-Fi mesh, box et câblage en Martinique. Formule Wi-Fi partout à prix fixe. Ducos, Le Robert et toute l’île.',
    h1: 'Wi-Fi et internet partout dans la maison',
    accroche: 'Le Wi-Fi ne passe pas dans les chambres, sur la terrasse ou à l’étage ? On mesure, on installe les bonnes bornes et tout le monde capte.',
    intro: [
      'Les maisons martiniquaises en béton, sur plusieurs niveaux, arrêtent les ondes Wi-Fi. Résultat : la box est au salon et le signal disparaît dès la chambre ou la terrasse.',
      'Nous mesurons le signal pièce par pièce, choisissons l’emplacement de la box et ajoutons si besoin des bornes Wi-Fi « mesh » qui se relaient pour couvrir toute la maison avec un seul réseau. Et là où internet est trop faible, nous installons Starlink.'
    ],
    exemple: { titre: 'Exemple : une maison sur deux niveaux à Rivière-Salée', avant: ['Wi-Fi seulement au salon', 'Télétravail impossible dans le bureau', 'Terrasse sans réseau'], apres: ['3 bornes mesh, un seul réseau', 'Bureau à pleine vitesse', 'Wi-Fi jusqu’à la terrasse'] },
    pourquoi: ['Mesure du signal dans chaque pièce', 'Matériel conseillé selon votre maison', 'Un seul réseau Wi-Fi partout', 'Formule « Wi-Fi partout » à prix fixe'],
    faq: [
      ['Pourquoi mon Wi-Fi ne passe pas à l’étage ?', 'Le béton et les dalles bloquent le Wi-Fi. Une borne relais (mesh) placée au bon endroit règle le problème bien mieux qu’un simple répéteur.'],
      ['Internet est lent chez moi, est-ce le Wi-Fi ou la ligne ?', 'Nous mesurons les deux. Si la ligne elle-même est faible (zone mal desservie), Starlink peut être la solution.'],
      ['Faut-il changer de box ?', 'Rarement. Nous réglons d’abord la vôtre ; nous ne conseillons du matériel que s’il est vraiment utile.']
    ] },
  { slug: 'installation-camera-surveillance-martinique', cat: 'camera', scene: 'camera', services: ['camera', 'alarme'],
    titre: 'Installation de caméras de surveillance en Martinique | IloTech',
    desc: 'Installation de caméras de surveillance en Martinique : vision de nuit, alerte sur téléphone, enregistrement, caméras solaires 4G sans Wi-Fi. Maison, commerce, terrain. Devis gratuit.',
    h1: 'Installation de caméras de surveillance',
    accroche: 'Surveillez votre maison, votre commerce ou votre terrain depuis votre téléphone, de jour comme de nuit, avec une alerte dès qu’il y a du mouvement.',
    intro: [
      'Nous installons des caméras fiables pour les maisons, commerces, bureaux et terrains : vision de nuit, détection de mouvement avec alerte sur le téléphone, enregistrement sur plusieurs jours.',
      'Pas de Wi-Fi ni de prise sur place (terrain, chantier, jardin éloigné) ? Les caméras solaires 4G fonctionnent en autonomie. Nous vous conseillons du matériel adapté au climat (chaleur, humidité, sel) et réglons l’application sur votre téléphone.'
    ],
    exemple: { titre: 'Exemple : une maison avec portail à Saint-Joseph', avant: ['Passages la nuit près du portail', 'Aucune image en cas de souci', 'Propriétaires souvent absents'], apres: ['4 caméras avec vision de nuit', 'Alerte « Mouvement au portail » sur le téléphone', '30 jours d’enregistrement'] },
    pourquoi: ['Matériel adapté au climat tropical', 'Application réglée sur votre téléphone', 'Caméras solaires 4G pour les lieux sans courant', 'Formule « Surveiller ma maison » à prix fixe'],
    faq: [
      ['Puis-je voir mes caméras depuis mon téléphone ?', 'Oui, partout dans le monde, avec une alerte en cas de mouvement. Nous installons et réglons l’application avec vous.'],
      ['Ai-je le droit de filmer ?', 'Chez vous, oui, mais pas la voie publique ni chez les voisins. Pour un commerce, un panneau d’information est obligatoire. Nous orientons les caméras dans les règles.'],
      ['Et sans Wi-Fi sur place ?', 'Les caméras solaires 4G fonctionnent avec une carte SIM et un panneau solaire : idéal pour un terrain, un chantier ou un jardin.']
    ] },
  { slug: 'domotique-maison-connectee-martinique', cat: 'domo', scene: 'domo', services: ['domotique', 'alarme'],
    titre: 'Domotique et maison connectée en Martinique | IloTech',
    desc: 'Domotique en Martinique : lumières, climatisation, volets, prises et arrosage pilotés depuis le téléphone, à distance ou automatiquement. Installation et réglage, devis gratuit.',
    h1: 'Domotique : votre maison pilotée du téléphone',
    accroche: 'Allumer la clim avant de rentrer, fermer les volets à distance, couper une prise oubliée : votre maison se pilote du téléphone.',
    intro: [
      'La domotique, c’est rendre la maison plus pratique et plus économe : clim programmée, lumières qui s’allument au coucher du soleil, arrosage automatique, prises qui coupent les appareils en veille.',
      'Nous choisissons des équipements compatibles entre eux, les installons et réglons une seule application simple pour tout piloter, même quand vous êtes loin.'
    ],
    exemple: { titre: 'Exemple : une villa en location au Diamant', avant: ['Clim oubliée allumée entre deux locations', 'Arrosage à la main', 'Aucune vue sur la maison à distance'], apres: ['Clim pilotée et programmée', 'Arrosage automatique le soir', 'Tout dans une seule application'] },
    pourquoi: ['Équipements compatibles entre eux', 'Une seule application simple', 'Économies d’électricité', 'Idéal pour les locations saisonnières'],
    faq: [
      ['Faut-il refaire l’électricité ?', 'Non, dans la plupart des cas : prises, interrupteurs et modules connectés se posent sur l’installation existante.'],
      ['La domotique fonctionne-t-elle sans internet ?', 'Les automatismes locaux oui ; le pilotage à distance demande internet (box ou Starlink).']
    ] },
  { slug: 'onduleur-coupure-courant-martinique', cat: 'install', pasDeLienCat: true, scene: 'onduleur', services: ['ups', 'starlink', 'sauvegarde'],
    titre: 'Onduleur contre les coupures de courant en Martinique | IloTech',
    desc: 'Coupures de courant et micro-coupures en Martinique : un onduleur protège ordinateur, box, caisse et serveur, garde internet allumé et évite les pannes. Conseil et installation.',
    h1: 'Coupures de courant : protégez votre matériel',
    accroche: 'Une coupure, l’ordinateur s’éteint, le fichier est perdu, la box redémarre… Un onduleur garde tout allumé et protège vos appareils.',
    intro: [
      'Les coupures et micro-coupures de courant sont fréquentes en Martinique, surtout pendant la saison des pluies. Chaque coupure brutale peut abîmer un disque, corrompre un fichier ou griller une alimentation.',
      'Un onduleur prend le relais pendant quelques minutes : l’ordinateur s’éteint proprement, la box et Starlink restent allumés, la caisse du commerce continue d’encaisser. Nous choisissons le modèle adapté à vos appareils et réglons l’arrêt automatique.'
    ],
    exemple: { titre: 'Exemple : un cabinet à Fort-de-France', avant: ['Coupures plusieurs fois par mois', 'Un disque abîmé l’an dernier', 'Internet coupé à chaque fois'], apres: ['Onduleur : 18 min d’autonomie', 'Arrêt automatique et propre du PC', 'Box internet toujours allumée'] },
    pourquoi: ['Modèle adapté à vos appareils', 'Arrêt automatique réglé', 'Protection de la box, de Starlink et de la caisse', 'Changement de batterie d’onduleur'],
    faq: [
      ['Combien de temps tient un onduleur ?', 'De quelques minutes à une demi-heure selon le modèle et les appareils branchés : assez pour finir son travail ou passer une micro-coupure sans rien sentir.'],
      ['Un onduleur protège-t-il de la foudre ?', 'Il protège des surtensions courantes. Pour les orages violents, débrancher reste la meilleure protection ; nous vous conseillons aussi des protections adaptées.']
    ] },
  { slug: 'cours-informatique-seniors-martinique', cat: 'aide', scene: 'aide', services: ['cours', 'abonnement'],
    titre: 'Cours d’informatique seniors en Martinique | IloTech',
    desc: 'Cours d’informatique à domicile en Martinique pour seniors et débutants : WhatsApp, appels vidéo, photos, banque en ligne, démarches, arnaques et intelligence artificielle. Dès 35 € l’heure.',
    h1: 'Cours d’informatique pour seniors et débutants',
    accroche: 'Envoyer une photo, faire un appel vidéo avec les petits-enfants, ses démarches en ligne sans stress : on vous apprend pas à pas, à votre rythme.',
    intro: [
      'Nos cours sont faits pour ceux qui n’ont pas grandi avec un ordinateur ou un smartphone. Pas de jargon, pas de précipitation : on part de ce que vous voulez faire, et on répète autant qu’il faut.',
      'Chez vous, en agence ou à distance : WhatsApp et appels vidéo, photos, emails, banque et démarches en ligne (impôts, CAF, Ameli), repérer les arnaques, et même découvrir l’intelligence artificielle sans risque.'
    ],
    exemple: { titre: 'Exemple : Monsieur R., 78 ans, au Gros-Morne', avant: ['Ne savait pas envoyer une photo', 'Peur des arnaques par SMS', 'Démarches faites par ses enfants'], apres: ['Appels vidéo avec ses petits-enfants', 'Repère les faux messages', 'Fait ses démarches seul, avec une fiche mémo'] },
    pourquoi: ['Patience et explications simples', 'À domicile, en agence ou à distance', 'Fiche mémo laissée après chaque séance', 'Carnet de séances à prix réduit'],
    faq: [
      ['Je n’y connais rien, est-ce pour moi ?', 'Oui, c’est exactement pour vous. On commence par le plus simple et on avance à votre rythme.'],
      ['Les cours se font-ils à domicile ?', 'Oui, partout en Martinique, ou en agence à Ducos et au Robert, ou à distance une fois les bases acquises.'],
      ['Peut-on offrir des cours ?', 'Oui, un carnet de séances est un beau cadeau pour un parent ou un grand-parent.']
    ] },
  { slug: 'intelligence-artificielle-ia-martinique', cat: 'ia', scene: 'ia', services: ['iapro', 'cours'], distance: true, nouveau: true,
    titre: 'Intelligence artificielle : formation et IA en Martinique | IloTech',
    desc: 'Découvrir et utiliser l’intelligence artificielle (ChatGPT…) en Martinique : formation pour particuliers et équipes, assistant IA pour répondre à vos clients, automatisations. Sans risque pour vos données.',
    h1: 'Intelligence artificielle : apprendre et l’utiliser',
    accroche: 'Rédiger un email, résumer un document, répondre plus vite à vos clients : l’IA fait gagner des heures. On vous apprend à vous en servir, sans risque.',
    intro: [
      'ChatGPT et les autres assistants d’intelligence artificielle sont devenus des outils du quotidien. Encore faut-il savoir quoi leur demander, vérifier ce qu’ils répondent et ne pas leur confier de données sensibles.',
      'Pour les particuliers, nous proposons une découverte simple pendant nos cours. Pour les entreprises, nous formons les équipes, créons des assistants qui répondent à vos clients et automatisons les tâches répétitives (devis, factures, tableaux).'
    ],
    exemple: { titre: 'Exemple : un artisan du Lamentin', avant: ['2 h par semaine à rédiger devis et emails', 'Messages clients en retard', 'Peur de « faire une bêtise » avec l’IA'], apres: ['Emails préparés en quelques secondes', 'Réponses aux clients plus rapides', 'Règles simples pour protéger ses données'] },
    pourquoi: ['Formation concrète, avec vos vrais exemples', 'Règles de confidentialité expliquées', 'Assistants et automatisations sur mesure', 'Pour particuliers et entreprises'],
    faq: [
      ['L’IA est-elle dangereuse pour mes données ?', 'Elle peut l’être si l’on y colle des informations confidentielles. Nous vous montrons les bons réglages et ce qu’il ne faut jamais partager.'],
      ['Faut-il payer un abonnement ?', 'Les versions gratuites suffisent pour commencer. Nous vous disons si une version payante vaut le coup pour votre usage.'],
      ['Pouvez-vous créer un assistant pour mon entreprise ?', 'Oui : un assistant qui répond aux questions fréquentes de vos clients, sur votre site ou WhatsApp, avec vos informations.']
    ] },
  { slug: 'creation-site-internet-martinique', distance: true, cat: 'web', scene: 'web', services: ['siteweb', 'maintweb', 'sitepirate'],
    titre: 'Création de site internet en Martinique dès 390 € | IloTech',
    desc: 'Création de site internet en Martinique : site vitrine, prise de rendez-vous, boutique en ligne, référencement Google local. Dès 390 €, paiement en 3 fois, le site vous appartient.',
    h1: 'Création de site internet en Martinique',
    accroche: 'Un site clair, rapide sur téléphone, bien placé sur Google, qui vous apporte des demandes : vitrine, prise de rendez-vous ou boutique en ligne.',
    intro: [
      'Vos clients vous cherchent d’abord sur Google et sur leur téléphone. Un site simple, rapide et rassurant, avec vos services, vos prix, vos photos et un bouton WhatsApp, transforme ces recherches en appels.',
      'Nous créons des pages uniques, des sites vitrines, des sites avec prise de rendez-vous et des boutiques en ligne avec paiement par carte. Le site vous appartient, vous avez les accès, et nous pouvons l’entretenir ensuite. Votre site actuel est piraté ou en panne ? Nous le remettons en ligne.'
    ],
    exemple: { titre: 'Exemple : un snack à bokits du François', avant: ['Seulement une page Facebook', 'Commandes par téléphone aux heures de pointe', 'Introuvable sur Google'], apres: ['Site avec la carte et les prix', 'Commande en ligne, retrait à l’heure choisie', 'Fiche Google et site reliés'] },
    pourquoi: ['Site rapide et adapté au téléphone', 'Référencement local : visible en Martinique', 'Le site et les accès vous appartiennent', 'Paiement en 3 fois sans frais', '3 mois de maintenance offerts'],
    faq: [
      ['Combien coûte un site internet en Martinique ?', 'Un site d’une page commence à {siteweb}, un site vitrine de 5 pages et une boutique en ligne sont détaillés ci-dessous. Le devis est gratuit et le prix fixé avant de commencer.'],
      ['Combien de temps pour créer un site ?', 'Une à deux semaines pour un site vitrine, selon la rapidité à réunir textes et photos. Plus pour une boutique.'],
      ['Le site sera-t-il bien placé sur Google ?', 'Nous appliquons les bonnes pratiques (vitesse, textes, fiche Google reliée). Le référencement local, en option, renforce la visibilité sur votre commune.'],
      ['Mon site a été piraté, pouvez-vous m’aider ?', 'Oui : remise en ligne, nettoyage du piratage et rapport de ce qui s’est passé, à prix fixe annoncé avant.']
    ] },
  { slug: 'application-mobile-martinique', distance: true, cat: 'appli', scene: 'appli', services: ['appmobile', 'devsurmesure'],
    titre: 'Création d’application mobile en Martinique | IloTech',
    desc: 'Application mobile et web sur mesure en Martinique : réservation, espace client, outil de terrain, notifications. Maquette à tester avant de décider, code remis, paiement en 3 fois.',
    h1: 'Création d’application mobile et web',
    accroche: 'Réserver, suivre une commande, gérer une équipe sur le terrain : une application pensée pour vos clients et votre métier.',
    intro: [
      'Une application utile fait une chose simple très bien : prendre un rendez-vous, suivre une intervention, consulter un espace client, remplir un rapport sur le terrain.',
      'Pour décider sans risque, nous commençons par une maquette cliquable à tester sur votre téléphone, déduite si vous commandez l’application. Le code et les accès vous sont remis. Nous pouvons aussi automatiser vos tâches répétitives et relier vos outils entre eux.'
    ],
    exemple: { titre: 'Exemple : un club de plongée aux Trois-Îlets', avant: ['Réservations par téléphone et cahier', 'Oublis et doubles réservations', 'Aucun rappel aux clients'], apres: ['Réservation en ligne des sorties', 'Rappel automatique la veille', 'Planning partagé pour les moniteurs'] },
    pourquoi: ['Maquette à tester avant de décider', 'Code et accès remis', 'Application installable, sans passer par les Stores si besoin', 'Paiement en 3 fois sans frais'],
    faq: [
      ['Combien coûte une application ?', 'Une première application utile commence à {appmobile}. Le prix dépend du nombre d’écrans et des fonctions ; il est fixé après la maquette.'],
      ['Faut-il publier sur l’App Store et Google Play ?', 'Pas forcément : une application web s’installe sur le téléphone sans passer par les Stores. Si vous voulez y être, nous préparons la publication.'],
      ['Puis-je faire évoluer l’application ensuite ?', 'Oui : le code vous appartient, et nous chiffrons chaque nouvelle fonction avant.']
    ] },
  { slug: 'marketing-digital-reseaux-sociaux-martinique', distance: true, cat: 'marketing', scene: 'marketing', services: ['marketing', 'reseaux', 'contenuia'],
    titre: 'Marketing digital et réseaux sociaux en Martinique | IloTech',
    desc: 'Être visible et trouver des clients en Martinique : fiche Google Maps optimisée, avis, publicité Facebook et Instagram, vidéos courtes, gestion des réseaux sociaux. Bilan et plan d’action.',
    h1: 'Marketing digital et réseaux sociaux',
    accroche: 'Apparaître quand on vous cherche, récolter des avis, publier régulièrement : on vous rend visible et on vous amène des clients.',
    intro: [
      'En Martinique, la plupart des clients trouvent un commerce ou un artisan sur Google Maps, Facebook ou Instagram. Une fiche Google complète avec de bons avis rapporte souvent plus qu’une publicité.',
      'Nous commençons par un bilan de votre visibilité, puis un plan simple : fiche Google optimisée, demandes d’avis, publications et vidéos courtes, publicités ciblées sur votre zone. Ou nous gérons vos réseaux chaque mois, avec un bilan clair.'
    ],
    exemple: { titre: 'Exemple : un restaurant de Sainte-Anne', avant: ['Fiche Google incomplète, 9 avis', 'Publications irrégulières', 'Clients surtout de passage'], apres: ['126 avis, note 4,8', 'Une vidéo courte par semaine', '+38 % de visites sur la fiche'] },
    pourquoi: ['Bilan de visibilité pour commencer', 'Actions qui rapportent en priorité', 'Vidéos et visuels adaptés à la Martinique', 'Bilan mensuel clair'],
    faq: [
      ['Par quoi commencer pour avoir plus de clients ?', 'Par votre fiche Google Maps : informations complètes, photos et avis. C’est souvent le meilleur rapport effort / résultat.'],
      ['Gérez-vous les réseaux sociaux au mois ?', 'Oui : nous préparons et publions vos contenus et vous envoyons un bilan chaque mois.']
    ] },
  { slug: 'maintenance-informatique-entreprise-martinique', cat: 'pro', scene: 'pro', services: ['maintenance', 'reseaupro', 'cloudpro'],
    titre: 'Maintenance informatique pour entreprises en Martinique | IloTech',
    desc: 'Maintenance informatique pour TPE, commerces, cabinets et associations en Martinique : assistance, mises à jour, antivirus, sauvegardes, réseau et Wi-Fi pro, emails à votre nom, Microsoft 365.',
    h1: 'Maintenance informatique pour les entreprises',
    accroche: 'Une informatique qui marche, des sauvegardes vérifiées et un interlocuteur qui connaît votre parc : vous vous concentrez sur votre métier.',
    intro: [
      'Dans une petite entreprise, une panne d’ordinateur ou de réseau bloque tout : plus de caisse, plus de factures, plus d’emails. La maintenance évite ces arrêts et vous donne quelqu’un à appeler.',
      'Nous suivons vos postes (mises à jour, antivirus, sauvegardes), installons le réseau et le Wi-Fi professionnel, mettons en place des emails à votre nom avec Microsoft 365 ou Google Workspace, et intervenons vite en cas de souci.'
    ],
    exemple: { titre: 'Exemple : un cabinet de 8 postes à Ducos', avant: ['Mises à jour jamais faites', 'Aucune sauvegarde testée', 'Emails en @gmail.com'], apres: ['8 postes à jour, antivirus suivi', 'Sauvegarde chaque nuit, vérifiée', 'Emails contact@cabinet.mq'] },
    pourquoi: ['Un interlocuteur qui connaît votre parc', 'Sauvegardes vérifiées', 'Réseau et Wi-Fi professionnels', 'Rapport mensuel'],
    faq: [
      ['Quelle est la différence avec un dépannage ?', 'Le dépannage répare une panne. La maintenance évite les pannes et vous garantit un suivi régulier.'],
      ['Intervenez-vous pour les associations ?', 'Oui, ainsi que pour les cabinets, commerces, artisans et collectivités.'],
      ['Pouvez-vous avoir des emails à notre nom ?', 'Oui : contact@votre-entreprise, sur ordinateur et téléphone, avec agendas et fichiers partagés.']
    ] },
  { slug: 'cybersecurite-entreprise-martinique', distance: true, cat: 'cyber', scene: 'cyber', services: ['cyberexpress', 'cyber'],
    titre: 'Cybersécurité entreprise en Martinique dès 79 € | IloTech',
    desc: 'Cybersécurité en Martinique : contrôle sécurité express dès 79 €, audit de site et de messagerie, mots de passe, sauvegardes, sensibilisation de l’équipe. Rapport clair et priorités.',
    h1: 'Cybersécurité pour les entreprises',
    accroche: 'Savoir ce qui va bien et ce qui est à corriger, en langage clair : site, emails, accès, sauvegardes.',
    intro: [
      'Les petites entreprises sont aujourd’hui les premières cibles : faux virements, emails usurpés, sites piratés, rançongiciels. Le plus souvent, quelques réglages simples suffisent à bloquer la majorité des attaques.',
      'Commencez par le contrôle express : nous vérifions votre site et vos emails à distance, sans rien toucher, et vous remettons un rapport court avec les priorités. L’audit va plus loin, avec votre accord écrit : comptes, formulaires, sauvegardes, accès, et une contre-vérification après correction.'
    ],
    exemple: { titre: 'Exemple : une agence de voyage de Fort-de-France', avant: ['Emails de l’agence imités par des escrocs', 'Mots de passe partagés', 'Site jamais mis à jour'], apres: ['Emails protégés (SPF, DMARC)', 'Double sécurité sur les comptes', 'Rapport : 4 points sur 5 vérifiés'] },
    pourquoi: ['Contrôle express pour commencer petit', 'Toujours avec votre accord écrit', 'Rapport compréhensible, priorités claires', 'Contre-vérification après correction'],
    faq: [
      ['Par où commencer ?', 'Par le contrôle sécurité express ({cyberexpress}) : il montre en quelques jours les points faibles les plus urgents, et il est déduit si vous commandez l’audit.'],
      ['Un audit garantit-il qu’on ne sera jamais piraté ?', 'Non, aucun audit ne le garantit. Il décrit ce qui a été vérifié à une date donnée et réduit fortement les risques.'],
      ['Que faire si nous sommes déjà piratés ?', 'Contactez-nous tout de suite : nous isolons le problème, remettons en ligne et expliquons ce qui s’est passé.']
    ] },
  { slug: 'caisse-enregistreuse-martinique', cat: 'caisse', scene: 'caisse', services: ['pos', 'ups'],
    titre: 'Caisse enregistreuse en Martinique | IloTech',
    desc: 'Installation de caisse enregistreuse en Martinique pour commerces, snacks et restaurants : écran tactile, tiroir-caisse, imprimante ticket, terminal CB, gestion des stocks. Formule à prix fixe.',
    h1: 'Caisse enregistreuse pour commerces et restaurants',
    accroche: 'Encaisser vite, imprimer les tickets, suivre le stock et les ventes : une caisse simple, installée et réglée pour votre commerce.',
    intro: [
      'Une caisse bien réglée fait gagner du temps à chaque client et évite les erreurs de fin de journée. Nous installons l’écran tactile, le tiroir, l’imprimante de tickets, le lecteur de codes-barres et la liaison avec le terminal de carte bancaire.',
      'Nous paramétrons vos produits et vos prix, formons votre équipe et conseillons un onduleur pour continuer d’encaisser pendant les coupures de courant.'
    ],
    exemple: { titre: 'Exemple : un restaurant créole au Marin', avant: ['Tickets écrits à la main', 'Erreurs de caisse le soir', 'Aucun suivi des plats vendus'], apres: ['Caisse tactile, tickets imprimés', 'Paiement par carte relié', 'Ventes et stock suivis chaque jour'] },
    pourquoi: ['Matériel installé et réglé', 'Produits et prix paramétrés', 'Équipe formée', 'Formule « Équiper mon commerce » à prix fixe'],
    faq: [
      ['La caisse fonctionne-t-elle pendant une coupure ?', 'Avec un onduleur, oui, le temps des coupures courtes. Nous le conseillons à tous les commerces.'],
      ['Pouvez-vous relier le terminal de carte bancaire ?', 'Oui, selon le modèle de votre terminal et de votre logiciel de caisse.']
    ] },
  { slug: 'drone-photo-video-martinique', cat: 'drone', scene: 'drone', services: ['drone'],
    titre: 'Photo et vidéo par drone en Martinique dès 149 € | IloTech',
    desc: 'Photos et vidéos aériennes par drone en Martinique : immobilier, location saisonnière, commerce, inspection de toiture, suivi de chantier. Forfait 30 min sur place, photos sous 48 h.',
    h1: 'Photo et vidéo par drone',
    accroche: 'Montrer une villa, un terrain, un commerce ou une toiture vus du ciel : des images qui font la différence, livrées sous 48 h.',
    intro: [
      'Une photo aérienne montre en un coup d’œil ce qu’aucune photo au sol ne montre : la vue mer, le terrain, l’accès, la piscine, l’environnement. Idéal pour une vente, une location saisonnière ou un commerce.',
      'Le drone sert aussi à inspecter une toiture sans y monter (tôles, gouttières, après un coup de vent) et à suivre un chantier avec les mêmes vues à chaque passage. Forfait : 30 minutes sur place et une dizaine de photos retouchées, sous réserve de météo et de zone de vol autorisée.'
    ],
    exemple: { titre: 'Exemple : un gîte aux Anses-d’Arlet', avant: ['Annonce avec photos au téléphone', 'La vue mer ne se voyait pas', 'Peu de réservations hors saison'], apres: ['10 photos aériennes retouchées', 'Clip vidéo de 40 s pour les réseaux', 'Annonce plus attractive'] },
    pourquoi: ['Forfait clair : 30 min et 10 photos', 'Photos livrées sous 48 h', 'Inspection de toiture sans échafaudage', 'Zones de vol vérifiées avant'],
    faq: [
      ['Peut-on voler partout en Martinique ?', 'Non : les abords de l’aéroport, certains sites protégés et les zones habitées ont des règles. Nous vérifions la zone avant de confirmer.'],
      ['Combien coûte une séance drone ?', 'Le forfait photo commence à {drone}. Vidéo, inspection de toiture et suivi de chantier sont en option.']
    ] },
  { slug: 'pc-gamer-console-martinique', cat: 'gaming', scene: 'gaming', services: ['gamer', 'console', 'emulation'],
    titre: 'PC gamer et entretien console en Martinique | IloTech',
    desc: 'PC gamer monté sur mesure en Martinique, nettoyage et entretien de console (PS5, Xbox, Switch) contre la chaleur et la poussière, émulation rétro. Conseil selon votre budget.',
    h1: 'PC gamer et consoles',
    accroche: 'Un PC gamer monté pour vos jeux et votre budget, une console qui ne chauffe plus, vos vieux jeux qui revivent.',
    intro: [
      'Avec la chaleur et l’humidité, les consoles et les PC de jeu s’encrassent vite : ventilateur bruyant, surchauffe, ralentissements. Un nettoyage et une pâte thermique neuve changent tout.',
      'Nous montons aussi des PC gamer sur mesure, en choisissant les bons composants pour vos jeux et votre budget, Windows installé et optimisé. Et pour les nostalgiques, nous préparons des machines d’émulation rétro.'
    ],
    exemple: { titre: 'Exemple : un joueur de Saint-Esprit', avant: ['PS5 bruyante qui chauffe', 'PC qui rame sur les jeux récents', 'Budget serré'], apres: ['Console nettoyée et silencieuse', 'PC monté : 144 images par seconde', 'Composants choisis au meilleur prix'] },
    pourquoi: ['Composants choisis selon votre budget', 'Montage soigné et testé', 'Nettoyage adapté au climat', 'Conseils sans vendre l’inutile'],
    faq: [
      ['Pourquoi ma console chauffe-t-elle ?', 'La poussière et l’humidité bouchent les ventilations. Un nettoyage complet règle le problème dans la plupart des cas.'],
      ['Pouvez-vous monter un PC avec mes pièces ?', 'Oui, avec vos composants ou ceux que nous vous conseillons.']
    ] },
  { slug: 'installation-tv-box-martinique', cat: 'multimedia', scene: 'multimedia', services: ['multimedia'],
    titre: 'Installation TV, box et barre de son en Martinique | IloTech',
    desc: 'Installation et réglage de TV connectée, box, chaînes, Netflix, barre de son, fixation murale et affichage du téléphone sur la TV en Martinique. Formule à prix fixe.',
    h1: 'Installation TV, box et son',
    accroche: 'TV fixée au mur, chaînes et applications réglées, son qui claque, téléphone affiché sur la TV : on installe tout et on vous montre.',
    intro: [
      'Une nouvelle TV, une box, une barre de son : chacun a sa télécommande, ses câbles et ses réglages. Nous installons et relions le tout pour que ce soit simple à utiliser au quotidien.',
      'Fixation murale, chaînes, applications (Netflix, YouTube, replay), connexion internet, son et affichage du téléphone sur la TV : vous repartez avec une installation propre et les explications.'
    ],
    exemple: { titre: 'Exemple : un salon à La Trinité', avant: ['3 télécommandes', 'Son trop faible', 'Applications jamais réglées'], apres: ['Une télécommande pour tout', 'Barre de son reliée', 'Netflix et replay prêts'] },
    pourquoi: ['Installation propre, câbles rangés', 'Tout relié et expliqué', 'Formule à prix fixe', 'Idéal pour offrir à un parent'],
    faq: [
      ['Pouvez-vous fixer la TV au mur ?', 'Oui, avec un support adapté à la taille et au mur (béton, cloison).'],
      ['Peut-on afficher son téléphone sur la TV ?', 'Oui, sans fil dans la plupart des cas : nous le réglons et vous montrons comment faire.']
    ] },
  { slug: 'assistant-ia-chatbot-entreprise-martinique', cat: 'ia', scene: 'ia', services: ['iapro', 'devsurmesure'], distance: true,
    titre: 'Assistant IA et chatbot pour entreprises — Martinique | IloTech',
    desc: 'Un assistant d’intelligence artificielle qui répond à vos clients sur votre site ou WhatsApp, prépare vos devis et trie vos emails. Pour les entreprises de Martinique et des Antilles.',
    h1: 'Assistant IA et chatbot pour votre entreprise',
    accroche: 'Répondre aux clients le soir et le week-end, préparer les devis, trier les emails : un assistant IA travaille pour vous, avec vos informations et vos règles.',
    intro: [
      'Les mêmes questions reviennent tous les jours : horaires, prix, disponibilités, délais. Un assistant IA bien préparé y répond tout de suite, sur votre site ou sur WhatsApp, et vous transmet les vraies demandes.',
      'Nous le construisons à partir de vos informations (services, tarifs, conditions), avec des règles claires : ce qu’il peut dire, ce qu’il doit vous laisser, et ce qu’il ne doit jamais faire. Nous automatisons aussi les tâches répétitives : brouillons de devis, réponses types, tri des emails, résumés de documents.'
    ],
    exemple: { titre: 'Exemple : une location de voitures au Lamentin', avant: ['Messages WhatsApp sans réponse le soir', 'Mêmes questions 30 fois par jour', 'Devis préparés à la main'], apres: ['Réponses immédiates, 7 jours sur 7', 'Demandes complètes transmises à l’équipe', 'Brouillons de devis en un clic'] },
    pourquoi: ['Construit avec vos informations, pas un robot générique', 'Règles claires et données protégées', 'Vous gardez la main sur chaque réponse importante', 'Formation de l’équipe incluse'],
    faq: [
      ['Un chatbot peut-il dire des bêtises à mes clients ?', 'Il peut se tromper s’il est mal préparé. Nous le limitons à vos informations, lui fixons des règles et il vous passe la main dès qu’une question sort de son domaine.'],
      ['Mes données sont-elles protégées ?', 'Nous choisissons des outils et des réglages qui n’utilisent pas vos données pour entraîner l’IA, et nous rédigeons avec vous une charte d’utilisation.'],
      ['Combien coûte un assistant IA ?', 'L’accompagnement commence à {iapro} ; l’assistant pour vos clients est une option détaillée ci-dessous. Les abonnements aux outils d’IA éventuels sont à part.']
    ] },
  { slug: 'starlink-gite-entreprise-bateau-martinique', cat: 'starlink', scene: 'starlink', services: ['starlink', 'network'], nouveau: true,
    titre: 'Starlink pour gîte, entreprise et bateau en Martinique | IloTech',
    desc: 'Starlink pour gîtes et locations saisonnières, entreprises, chantiers et bateaux en Martinique : installation, Wi-Fi pour les clients, secours internet et Starlink Mini.',
    h1: 'Starlink pour gîtes, entreprises et bateaux',
    accroche: 'Des voyageurs qui veulent du Wi-Fi, une entreprise qui ne peut pas être coupée, un chantier ou un bateau : Starlink apporte internet là où il manque.',
    intro: [
      'Pour un gîte ou une villa en location, un Wi-Fi lent coûte des avis et des réservations. Starlink, bien installé et relié à des bornes Wi-Fi, donne une connexion fiable dans tous les logements, avec un réseau séparé pour les voyageurs.',
      'Pour une entreprise, Starlink sert de connexion principale dans les zones mal desservies, ou de secours automatique quand la fibre tombe : la caisse, le téléphone et les emails continuent de fonctionner. Sur un chantier ou un bateau, le Starlink Mini se déplace avec vous.'
    ],
    exemple: { titre: 'Exemple : trois bungalows au Prêcheur', avant: ['ADSL lent, voyageurs mécontents', 'Avis « Wi-Fi inutilisable »', 'Propriétaire sans connexion pour gérer'], apres: ['Starlink sur le toit, bornes dans chaque bungalow', 'Réseau Wi-Fi séparé pour les voyageurs', '« Wi-Fi excellent » dans les avis'] },
    pourquoi: ['Wi-Fi voyageurs séparé de votre réseau', 'Secours automatique avec la box', 'Starlink Mini pour bateau et chantier', 'Fixation adaptée au vent et aux cyclones'],
    faq: [
      ['Peut-on partager Starlink entre plusieurs logements ?', 'Oui, avec des bornes Wi-Fi reliées entre elles. Nous créons un réseau séparé pour les voyageurs.'],
      ['Starlink fonctionne-t-il en mer autour de la Martinique ?', 'Il existe des offres prévues pour la mer et pour les déplacements. Vérifiez les conditions sur starlink.com selon votre usage ; nous réglons l’installation à bord.'],
      ['Peut-on utiliser Starlink en secours de la fibre ?', 'Oui : un routeur bascule automatiquement sur Starlink quand la fibre tombe, puis revient sur la fibre.']
    ] },
  { slug: 'agence-reseaux-sociaux-contenu-ia-martinique', cat: 'marketing', scene: 'marketing', services: ['reseaux', 'contenuia', 'marketing'], distance: true, nouveau: true,
    titre: 'Agence réseaux sociaux et contenus IA en Martinique | IloTech',
    desc: 'Agence réseaux sociaux en Martinique : vidéos courtes créées avec l’IA, publication automatique sur Instagram, Facebook, TikTok, LinkedIn et YouTube, plusieurs comptes, bilan mensuel.',
    h1: 'Agence réseaux sociaux et contenus créés avec l’IA',
    accroche: 'Être présent tous les jours sur Instagram, TikTok, Facebook, LinkedIn et YouTube, sans y passer vos soirées : on crée, on programme, on publie, sur tous vos comptes.',
    intro: [
      'Les réseaux sociaux demandent de la régularité : une publication de temps en temps ne suffit pas. Entre le travail, les clients et la famille, c’est souvent ce qui passe à la trappe.',
      'Nous produisons vos contenus (vidéos courtes avec voix et sous-titres, carrousels, visuels) avec l’aide de l’intelligence artificielle, toujours relus par un humain, puis nous les programmons à l’avance sur tous vos réseaux et tous vos comptes. Vous recevez chaque mois un bilan clair : vues, abonnés, messages reçus.'
    ],
    exemple: { titre: 'Exemple : le système que nous utilisons pour IloTech', avant: ['Publier prenait des heures chaque semaine', 'Des semaines sans rien poster', 'Pas de vidéos'], apres: ['Plusieurs publications par jour, programmées à l’avance', 'Vidéos courtes avec voix et sous-titres', 'Instagram, TikTok, YouTube et Facebook alimentés en même temps'] },
    pourquoi: ['Tous vos réseaux et comptes au même endroit', 'Contenus créés avec l’IA et vérifiés par un humain', 'Publication automatique, même quand vous êtes occupé', 'Bilan mensuel compréhensible', 'Sans engagement'],
    faq: [
      ['Sur quels réseaux publiez-vous ?', 'Instagram, Facebook, TikTok, LinkedIn, YouTube Shorts et votre fiche Google, selon ce qui convient à votre activité.'],
      ['Gérez-vous plusieurs comptes ou plusieurs marques ?', 'Oui : chaque compte ou marque supplémentaire est une option, avec son propre calendrier de publication.'],
      ['Les contenus faits avec l’IA sont-ils de bonne qualité ?', 'L’IA nous aide à produire plus et plus vite, mais chaque contenu est relu, corrigé et adapté à votre ton avant d’être publié. Les faits sont vérifiés.'],
      ['Combien ça coûte ?', 'L’agence réseaux sociaux commence à {reseaux} et les contenus vidéo créés avec l’IA à {contenuia}, sans engagement. Le budget de publicité éventuel est à part.']
    ] },
  { slug: 'automatisation-entreprise-ia-martinique', cat: 'ia', scene: 'prog', services: ['iapro', 'devsurmesure'], distance: true,
    titre: 'Automatisation et IA pour entreprises en Martinique | IloTech',
    desc: 'Automatiser les tâches répétitives de votre entreprise avec l’IA : devis, factures, emails, formulaires, agenda, WhatsApp et tableaux reliés entre eux. Martinique et Antilles.',
    h1: 'Automatiser votre entreprise avec l’IA',
    accroche: 'Devis recopiés, factures relancées à la main, emails triés un par un : on relie vos outils entre eux et l’IA fait le travail répétitif.',
    intro: [
      'Dans une petite entreprise, une grande partie de la semaine part dans des tâches qui se répètent : recopier une demande dans un tableau, préparer un devis, relancer une facture, envoyer un rappel de rendez-vous, classer des documents.',
      'Nous relions vos outils (formulaires, tableaux, agenda, emails, WhatsApp, logiciel de facturation) et ajoutons l’IA là où elle est utile : lire une demande, rédiger un brouillon, résumer un document. Vous validez, le reste se fait tout seul.'
    ],
    exemple: { titre: 'Exemple : un artisan du bâtiment au François', avant: ['Demandes notées sur papier', 'Devis tapés le soir', 'Factures relancées à la main'], apres: ['Demandes rangées toutes seules dans un tableau', 'Brouillon de devis prêt en un clic', 'Relances de factures automatiques'] },
    pourquoi: ['On part de vos tâches réelles', 'Vos outils actuels gardés et reliés', 'Vous gardez la validation finale', 'Formation de l’équipe incluse'],
    faq: [
      ['Faut-il changer de logiciel ?', 'Rarement : nous relions d’abord ce que vous utilisez déjà (tableur, agenda, emails, logiciel de facturation).'],
      ['Que se passe-t-il si une automatisation tombe en panne ?', 'Vous êtes prévenu, et nous intervenons. Chaque automatisation est documentée et peut être arrêtée à tout moment.'],
      ['Combien coûte une automatisation ?', 'L’accompagnement IA commence à {iapro} ; chaque automatisation est chiffrée avant, selon sa complexité.']
    ] },
  { slug: 'photo-video-immobilier-martinique', cat: 'immo', scene: 'immo', services: ['immobilier', 'drone', 'domotique'], nouveau: true,
    titre: 'Photo, vidéo et drone pour l’immobilier en Martinique | IloTech',
    desc: 'Photos immobilières, vidéo de visite, vue drone et page web du bien en Martinique, pour agences, propriétaires et locations saisonnières. Serrure connectée, Wi-Fi et livret d’accueil pour les gîtes.',
    h1: 'Photo, vidéo et drone pour l’immobilier',
    accroche: 'Vendre ou louer plus vite : des photos qui donnent envie, une vue du ciel, une vidéo de visite et une annonce prête à publier.',
    intro: [
      'Sur une annonce, ce sont les premières photos qui décident d’une visite. Des pièces lumineuses et bien cadrées, la vue mer depuis le ciel, l’accès et le terrain : l’acheteur ou le voyageur comprend le bien en quelques secondes.',
      'Nous réalisons les photos intérieures, les vues aériennes par drone et une courte vidéo de visite, puis une page web dédiée au bien à partager sur les réseaux et par WhatsApp. Pour les locations saisonnières, nous équipons aussi le logement : serrure connectée, Wi-Fi ou Starlink pour les voyageurs, livret d’accueil numérique.'
    ],
    exemple: { titre: 'Exemple : une villa en location au Diamant', avant: ['Photos prises au téléphone, sombres', 'La vue mer ne se voyait pas', 'Remise des clés compliquée'], apres: ['15 photos lumineuses + vue drone', 'Vidéo de visite de 60 s', 'Serrure connectée et livret d’accueil'] },
    pourquoi: ['Photos, drone et vidéo par la même équipe', 'Livré sous 48 h, prêt pour les annonces', 'Page web du bien à partager', 'Équipement des locations saisonnières'],
    faq: [
      ['Pour qui est le pack immobilier ?', 'Agences immobilières, propriétaires qui vendent seuls, et loueurs de gîtes, villas et appartements saisonniers.'],
      ['Peut-on faire voler le drone partout ?', 'Non : certaines zones sont interdites ou réglementées (aéroport, sites protégés). Nous vérifions avant de confirmer la séance.'],
      ['Combien coûte le pack immobilier ?', 'Le pack commence à {immobilier} pour les photos intérieures et la vue aérienne ; vidéo, page web du bien et équipement des locations sont en option.']
    ] }
];

/* ---------- Guides (articles de conseil : attirent les recherches « comment… », « que faire si… ») ---------- */
const GUIDES = [
  { slug: 'guide-ia-entreprise-martinique', scene: 'ia', couleur: '#a855f7', service: 'intelligence-artificielle-ia-martinique', cat: 'ia',
    titre: 'L’IA pour les petites entreprises : par où commencer | IloTech',
    desc: 'Intelligence artificielle pour les TPE, commerces et artisans de Martinique : à quoi elle sert vraiment, par où commencer, quels outils, et comment protéger vos données.',
    h1: 'L’IA pour les petites entreprises : par où commencer',
    chapo: 'ChatGPT, Copilot, Gemini… L’intelligence artificielle peut faire gagner des heures à une petite entreprise, à condition de bien choisir les tâches et de protéger ses données.',
    sections: [
      ['À quoi l’IA sert vraiment dans une petite entreprise', ['Rédiger un email ou une réponse à un avis, résumer un long document, préparer un devis à partir de notes, traduire un message pour un client étranger, créer un visuel ou une publication pour les réseaux sociaux, transformer un tableau en résumé clair.', 'L’IA ne remplace pas votre savoir-faire : elle prépare des brouillons que vous relisez et validez.']],
      ['Par où commencer', ['Listez les tâches répétitives de la semaine : celles qui prennent du temps et se ressemblent toujours. Commencez par une seule, mesurez le temps gagné, puis passez à la suivante. Une formation courte avec vos propres exemples évite des semaines de tâtonnements.']],
      ['Quels outils choisir', ['Les assistants généralistes (ChatGPT, Copilot, Gemini) couvrent la plupart des besoins. Si vous utilisez déjà Microsoft 365 ou Google Workspace, l’IA intégrée peut être la plus simple à adopter. Les versions gratuites suffisent pour tester ; les versions professionnelles apportent plus de confidentialité.']],
      ['Protéger vos données et celles de vos clients', ['Ne copiez jamais dans une IA des informations sensibles (coordonnées bancaires, données de santé, mots de passe) sans un outil et des réglages adaptés. Rédigez une petite charte pour l’équipe : ce qu’on peut faire, ce qu’on ne fait pas, et qui valide.']],
      ['Vérifier ce que l’IA répond', ['L’IA peut se tromper avec beaucoup d’assurance : chiffres, dates, références juridiques. Relisez toujours avant d’envoyer, surtout ce qui engage l’entreprise.']]
    ],
    faq: [
      ['L’IA est-elle utile pour un artisan ou un petit commerce ?', 'Oui : réponses aux clients, devis, publications et emails sont les gains les plus rapides, souvent plusieurs heures par semaine.'],
      ['Faut-il des compétences techniques ?', 'Non. Il faut surtout savoir bien formuler sa demande, ce qui s’apprend en une séance.'],
      ['Combien coûte l’IA ?', 'Beaucoup d’outils ont une version gratuite. Les versions professionnelles coûtent quelques dizaines d’euros par mois et par personne selon l’outil.']
    ] },
  { slug: 'guide-starlink-martinique', scene: 'starlink', couleur: '#94a3b8', service: 'installation-starlink-martinique', cat: 'starlink',
    titre: 'Starlink en Martinique : le guide avant d’installer | IloTech',
    desc: 'Starlink en Martinique : comment ça marche, pour qui, comment choisir l’emplacement, résister aux cyclones, garder internet pendant les coupures et avoir du Wi-Fi partout.',
    h1: 'Starlink en Martinique : le guide complet avant d’installer',
    chapo: 'Internet lent dans les hauteurs, coupures de box, maison isolée, gîte ou bateau : Starlink est devenu une vraie solution en Martinique. Voici ce qu’il faut savoir pour qu’il marche vraiment bien.',
    sections: [
      ['Comment fonctionne Starlink ?', ['Starlink est un internet par satellite. Une antenne posée chez vous communique avec des milliers de petits satellites qui tournent assez près de la Terre, ce qui donne un internet bien plus rapide et réactif que les anciens satellites.', 'L’antenne est reliée à un routeur Wi-Fi fourni dans le kit. Il suffit d’une prise électrique : pas de ligne téléphonique, pas de fibre, pas de travaux de raccordement.']],
      ['Pour qui c’est intéressant en Martinique ?', ['Starlink a surtout du sens là où la fibre et l’ADSL sont faibles ou absents : quartiers des mornes, Nord Atlantique et Nord Caraïbe, maisons au bout d’une trace, exploitations agricoles, gîtes et locations saisonnières, chantiers, et bateaux avec le Starlink Mini.', 'Si la fibre est disponible et fonctionne bien chez vous, elle reste souvent le meilleur choix au quotidien. Starlink peut alors servir de secours quand la box tombe en panne.']],
      ['Le kit et l’abonnement', ['Le kit et l’abonnement s’achètent directement chez Starlink, sur starlink.com ou dans l’application. Les prix et les offres changent régulièrement : vérifiez-les au moment de commander.', 'Choisissez l’offre selon votre usage : maison, déplacements ou bateau. Nous pouvons vous aider à commander et à activer le service, gratuitement, lors de l’installation.']],
      ['Le point le plus important : l’emplacement de l’antenne', ['L’antenne a besoin d’une grande portion de ciel dégagé. Un arbre, un morne, un pignon ou un poteau devant elle provoquent des micro-coupures, surtout pendant les appels vidéo.', 'Avant de percer quoi que ce soit, l’application Starlink permet de « scanner » le ciel avec le téléphone. Sur un toit, un pignon ou un mât, on gagne souvent beaucoup par rapport à une antenne posée au sol dans le jardin.']],
      ['Vent et saison cyclonique', ['Une antenne mal fixée bouge, se dérègle ou s’envole. Il faut une fixation solide, adaptée au support (béton, bois, tôle), et un câble attaché pour ne pas battre au vent.', 'En cas d’alerte cyclonique, le plus prudent est de démonter l’antenne et de la ranger à l’intérieur avec le routeur, puis de la remettre en place après le passage. Nous vous montrons comment faire en quelques minutes.']],
      ['Coupures de courant : garder internet', ['Sans électricité, Starlink s’arrête comme n’importe quelle box. Un onduleur bien choisi permet de passer les coupures courtes sans perdre la connexion, et protège le matériel contre les surtensions.', 'Le bon modèle dépend de ce qu’on y branche (antenne, routeur, ordinateur) et du temps d’autonomie voulu : c’est ce que nous dimensionnons avec vous.']],
      ['Du Wi-Fi dans toute la maison', ['Le routeur Starlink couvre bien une pièce ou deux, mais les maisons en béton sur plusieurs niveaux arrêtent les ondes. Des bornes Wi-Fi « mesh » se relaient pour couvrir toute la maison avec un seul réseau, jusqu’à la terrasse.']]
    ],
    faq: [
      ['Starlink est-il disponible en Martinique ?', 'Oui, Starlink est disponible en Martinique. Les offres et les prix se consultent sur starlink.com.'],
      ['Peut-on installer Starlink soi-même ?', 'Oui, le kit est prévu pour. Mais un mauvais emplacement ou une fixation fragile causent la plupart des problèmes : coupures, débit faible, antenne abîmée par le vent. Une installation soignée évite ces soucis.'],
      ['Starlink fonctionne-t-il quand il pleut ?', 'Oui. Une très forte averse peut ralentir le débit quelques instants, mais la connexion reste en général utilisable.'],
      ['Peut-on garder sa box internet avec Starlink ?', 'Oui : on peut relier les deux, pour que l’un prenne le relais si l’autre tombe.']
    ] },
  { slug: 'guide-coupures-courant-martinique', scene: 'onduleur', couleur: '#f59e0b', service: 'onduleur-coupure-courant-martinique', cat: 'install',
    titre: 'Coupures de courant : protéger son matériel en Martinique | IloTech',
    desc: 'Coupures et micro-coupures de courant en Martinique : comment protéger ordinateur, box, Starlink, TV et caisse. Onduleur, parafoudre, sauvegardes et bons réflexes.',
    h1: 'Coupures de courant : comment protéger son matériel',
    chapo: 'Une coupure brutale peut abîmer un disque, corrompre un fichier ou griller une alimentation. Quelques équipements et de bons réflexes évitent presque tous ces dégâts.',
    sections: [
      ['Pourquoi les coupures abîment le matériel', ['Quand le courant revient, il arrive souvent avec un pic de tension. Les alimentations d’ordinateur, de box et de TV le supportent mal, surtout quand cela se répète. Un ordinateur éteint brutalement en pleine écriture peut aussi perdre ou abîmer des fichiers.']],
      ['L’onduleur : la protection la plus efficace', ['Un onduleur est une batterie placée entre la prise et vos appareils. Pendant une coupure, il prend le relais quelques minutes : l’ordinateur s’éteint proprement, la box ou Starlink restent allumés, la caisse du commerce continue d’encaisser.', 'Il en existe plusieurs sortes. Pour un poste à la maison, un modèle simple suffit souvent ; pour un serveur, une caisse ou un équipement sensible, on choisit un modèle qui filtre mieux le courant. Le bon choix dépend de la puissance des appareils et de l’autonomie voulue.']],
      ['Parafoudre et multiprise protégée', ['Un parafoudre protège contre les surtensions, par exemple pendant les orages. Une multiprise « parafoudre » est un minimum pour la TV, la box et l’ordinateur. Pendant un orage violent, débrancher reste la meilleure protection.']],
      ['Les bons réflexes', ['Enregistrez souvent votre travail et activez l’enregistrement automatique. Mettez en place une sauvegarde automatique de vos photos et documents, sur un disque et en ligne. Après une coupure, attendez quelques minutes que le courant se stabilise avant de tout rallumer.']],
      ['Pour les commerces et les bureaux', ['Caisse, serveur, box et terminal de paiement doivent passer les coupures sans s’arrêter. Un onduleur adapté et une sauvegarde vérifiée chaque nuit évitent une journée perdue.']]
    ],
    faq: [
      ['Combien de temps tient un onduleur ?', 'De quelques minutes à une demi-heure selon le modèle et ce qui est branché : de quoi éteindre proprement ou passer une micro-coupure sans rien sentir.'],
      ['La batterie d’un onduleur s’use-t-elle ?', 'Oui, elle se change en général au bout de quelques années. Un onduleur qui ne tient plus que quelques secondes a besoin d’une batterie neuve.'],
      ['Un onduleur protège-t-il de la foudre ?', 'Il protège des surtensions courantes, pas d’un coup de foudre direct. En cas d’orage violent, débranchez.']
    ] },
  { slug: 'guide-arnaques-sms-martinique', scene: 'securite', couleur: '#ef4444', service: 'virus-arnaque-compte-pirate-martinique', cat: 'securite',
    titre: 'Arnaques par SMS et faux appels : les reconnaître | IloTech',
    desc: 'Faux colis, faux conseiller bancaire, faux Ameli, faux support Microsoft : comment reconnaître les arnaques par SMS, email et téléphone, et que faire si vous vous êtes fait avoir.',
    h1: 'Arnaques par SMS, email et téléphone : les reconnaître et réagir',
    chapo: 'Les arnaques se multiplient en Martinique comme partout : faux colis, faux conseiller bancaire, faux remboursement. Voici comment les repérer, et quoi faire tout de suite si vous avez cliqué.',
    sections: [
      ['Les arnaques les plus fréquentes', ['Le faux colis : un SMS annonce un colis bloqué et demande de payer quelques euros de frais. Le faux conseiller bancaire : il appelle, connaît parfois votre nom, et vous demande de valider une opération « pour la bloquer ». Le faux remboursement (Ameli, impôts, CAF) : un lien pour « recevoir » de l’argent. Le faux support informatique : une fenêtre bloque l’écran et affiche un numéro à appeler.']],
      ['Les signes qui doivent alerter', ['L’urgence (« votre compte sera bloqué aujourd’hui »), un lien raccourci ou une adresse bizarre, des fautes, une demande de code reçu par SMS, ou de valider une opération dans l’application bancaire. Votre banque ne vous demandera jamais un code de validation au téléphone.']],
      ['Les bons réflexes', ['Ne cliquez pas sur le lien : allez vous-même sur le site ou l’application officielle. Raccrochez et rappelez votre banque avec le numéro au dos de votre carte. Transférez les SMS frauduleux au 33700, le service officiel de signalement.']],
      ['Si vous avez donné vos informations', ['Carte bancaire : faites opposition tout de suite et prévenez votre banque. Signalez les paiements frauduleux sur la plateforme officielle Perceval (service-public.fr) et déposez plainte. Mots de passe : changez-les, en commençant par l’email, et activez la double sécurité. Pour être guidé, le site officiel cybermalveillance.gouv.fr propose une assistance gratuite.']],
      ['Protéger son téléphone et son ordinateur', ['Mettez à jour vos appareils, installez un antivirus fiable sur l’ordinateur, activez la double sécurité sur l’email et les réseaux sociaux. Si un proche âgé est concerné, quelques minutes d’explication valent toutes les protections.']]
    ],
    faq: [
      ['J’ai cliqué sur un lien mais je n’ai rien rempli, est-ce grave ?', 'Souvent non. Fermez la page, ne saisissez rien, et faites une analyse antivirus. Si vous avez téléchargé un fichier ou installé une application, faites vérifier l’appareil.'],
      ['Un « technicien Microsoft » a pris la main sur mon ordinateur, que faire ?', 'Débranchez internet, n’allumez pas votre banque en ligne, et faites vérifier l’ordinateur : il a pu installer un logiciel espion. Changez ensuite vos mots de passe depuis un autre appareil.'],
      ['Comment récupérer un compte Facebook piraté ?', 'Utilisez la procédure officielle de récupération de Facebook, jamais un « service » trouvé sur internet qui demande de l’argent. Nous pouvons vous accompagner.']
    ] }
];

/* ---------- Gabarit ---------- */
const prixDe = s => s.base ? 'dès ' + eur(s.base) + (s.mensuel ? '/mois' : '') : 'Gratuit';
const remplir = t => t.replace(/\{(\w+)\}/g, (m, id) => svc(id) ? prixDe(svc(id)) : m);
const catDe = id => CATEGORIES.find(c => c.id === id);
const lien = p => p.slug + '.html';
// photos réalistes (illustrations) : img/photos/<nom>.jpg, affichées seulement si le fichier existe
const PHOTOS = {"installation-starlink-martinique": "starlink", "starlink-gite-entreprise-bateau-martinique": "starlink", "guide-starlink-martinique": "starlink", "depannage-informatique-martinique": "reparation", "reparation-ordinateur-portable-martinique": "reparation", "installation-camera-surveillance-martinique": "camera", "intelligence-artificielle-ia-martinique": "ia", "assistant-ia-chatbot-entreprise-martinique": "ia", "guide-ia-entreprise-martinique": "ia", "automatisation-entreprise-ia-martinique": "ia", "drone-photo-video-martinique": "drone", "photo-video-immobilier-martinique": "drone", "agence-reseaux-sociaux-contenu-ia-martinique": "studio", "marketing-digital-reseaux-sociaux-martinique": "reseaux", "cours-informatique-seniors-martinique": "seniors"};
const ALT_PHOTOS = {"starlink": "Installation d’une antenne Starlink sur un toit en Martinique", "reparation": "Technicien qui répare un ordinateur portable en atelier", "camera": "Caméra de surveillance installée sur une maison créole", "ia": "Commerçante qui utilise un assistant d’intelligence artificielle", "drone": "Vue aérienne d’une baie de Martinique prise par drone", "reseaux": "Création de vidéos courtes pour les réseaux sociaux", "seniors": "Cours de tablette à domicile pour une personne âgée", "studio": "Studio de création de contenus pour les réseaux sociaux"};
const DIMS = fs.existsSync(path.join(dir, 'img/photos/dimensions.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'img/photos/dimensions.json'), 'utf8')) : {};
const photoDe = slug => { const n = PHOTOS[slug]; return n && fs.existsSync(path.join(dir, 'img/photos', n + '.jpg')) ? n : ''; };
const petite = slug => { const n = photoDe(slug); return !!n && (DIMS[n] || [1600])[0] < 800; };
const photoHtml = slug => {
  const n = photoDe(slug); if (!n) return '';
  const [w, h] = DIMS[n] || [1600, 900];
  return `<figure class="seo-photo${w < 800 ? ' petite' : ''}"><img src="img/photos/${n}.jpg" alt="${esc(ALT_PHOTOS[n])}" width="${w}" height="${h}" loading="lazy" decoding="async"><figcaption>Illustration</figcaption></figure>`;
};
const ogImage = slug => photoDe(slug) && fs.existsSync(path.join(dir, 'img/photos', photoDe(slug) + '-og.jpg')) ? SITE + 'img/photos/' + photoDe(slug) + '-og.jpg' : SITE + 'img/og-ilotech.jpg';
const jours = { 1: 'Mo', 2: 'Tu', 3: 'We', 4: 'Th', 5: 'Fr', 6: 'Sa', 0: 'Su' };
const horaires = Object.entries(HORAIRES).map(([j, [a, b]]) => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: 'https://schema.org/' + ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][j], opens: String(a).padStart(2, '0') + ':00', closes: String(b).padStart(2, '0') + ':00' }));
const agences = Object.entries(AGENCES).map(([k, a]) => ({ '@type': 'LocalBusiness', '@id': SITE + '#agence-' + k, name: 'IloTech — ' + a.nom, telephone: '+596' + a.tel.replace(/\D/g, '').slice(1), url: SITE,
  image: SITE + 'img/og-ilotech.jpg', priceRange: '€', sameAs: SAMEAS, address: { '@type': 'PostalAddress', addressLocality: a.nom, addressRegion: 'Martinique', postalCode: k === 'ducos' ? '97224' : '97231', addressCountry: 'FR' }, openingHoursSpecification: horaires, areaServed: { '@type': 'AdministrativeArea', name: 'Martinique' } }));

function tarifs(ids) {
  return ids.map(svc).filter(Boolean).map(s => `
    <section class="svc-block carte-bloc" style="--t:${(CATEGORIES.find(c => c.services.includes(s.id)) || {}).couleur || '#2b8cff'}">
      <div class="svc-media">${(c => bandeau({ id: 'b-' + s.id, icon: s.icon, badge: c.badge || 'zap', couleur: c.couleur || '#2b8cff' }))(CATEGORIES.find(c => c.services.includes(s.id)) || {})}<span class="svc-prix mono">${prixDe(s)}</span></div>
      <h3>${ico(s.icon)} ${esc(s.nom)}</h3>
      <p class="muted">${esc(s.desc)}.${s.note ? ' ' + esc(s.note) : ''}</p>
      ${s.compris ? `<div class="svc-compris"><div><b>Compris</b><ul>${s.compris.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${s.pasCompris ? `<div class="non"><b>Pas compris</b><ul>${s.pasCompris.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
      <table class="price-table"><tbody>${s.options.map(o => `<tr><td>${esc(o[1])}</td><td class="mono">${o[2] ? '+' + eur(o[2]) + (s.mensuel ? '/mois' : '') : esc(o[3] || 'Inclus')}</td></tr>`).join('')}</tbody></table>
    </section>`).join('');
}

function page(p) {
  const c = catDe(p.cat), coul = c.couleur, url = SITE + lien(p);
  const s0 = svc(p.services[0]);
  const autres = PAGES.filter(x => x !== p).sort((a, b) => (catDe(b.cat).univers === c.univers) - (catDe(a.cat).univers === c.univers)).slice(0, 8);
  const zones = Object.entries(ZONES).map(([k, z]) => `<li><b>${esc(z.nom)}</b> (${z.prix ? 'déplacement ' + eur(z.prix) : 'déplacement offert'}) : ${COMMUNES.filter(x => x[1] === k).map(x => esc(x[0])).join(', ')}</li>`).join('');
  const faq = p.faq.map(([q, r]) => [q, remplir(r)]);
  const wa = waUrl(AGENCES.ducos.tel, `Bonjour IloTech, je suis intéressé(e) par : ${p.h1}.`);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Service', name: p.h1, serviceType: p.h1, description: p.desc, url,
      provider: { '@type': 'LocalBusiness', name: 'IloTech', url: SITE, sameAs: SAMEAS, telephone: '+596' + AGENCES.ducos.tel.replace(/\D/g, '').slice(1) },
      areaServed: [{ '@type': 'AdministrativeArea', name: 'Martinique' }, ...(p.distance ? ['Guadeloupe', 'Guyane', 'Saint-Martin', 'Saint-Barthélemy'].map(n => ({ '@type': 'AdministrativeArea', name: n })) : []), ...COMMUNES.map(x => ({ '@type': 'City', name: x[0] }))],
      offers: p.services.map(svc).filter(Boolean).map(s => ({ '@type': 'Offer', name: s.nom, priceCurrency: 'EUR', price: s.base, priceSpecification: { '@type': 'PriceSpecification', minPrice: s.base, priceCurrency: 'EUR' }, availability: 'https://schema.org/InStock' })) },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'IloTech', item: SITE }, { '@type': 'ListItem', position: 2, name: 'Services', item: SITE + 'services.html' }, { '@type': 'ListItem', position: 3, name: p.h1, item: url }] },
    ...agences.map(a => ({ '@context': 'https://schema.org', ...a }))
  ];
  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://script.google.com https://script.googleusercontent.com https://formsubmit.co; form-action 'self' https://formsubmit.co; object-src 'none'; base-uri 'self'; upgrade-insecure-requests">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(p.titre)}</title>
  <meta name="description" content="${esc(p.desc)}">
  <link rel="canonical" href="${url}">
  <meta name="robots" content="index,follow,max-image-preview:large">
  <meta name="theme-color" content="#05070d">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="IloTech">
  <meta property="og:title" content="${esc(p.h1)} — IloTech Martinique">
  <meta property="og:description" content="${esc(p.accroche)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImage(p.slug)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="img/favicon.png">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  <script>try{if(localStorage.getItem('itTheme')==='light')document.documentElement.dataset.theme='light'}catch(e){}</script>
  <link rel="stylesheet" href="style.css?v=${V}">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="page-doc page-seo">
  <header class="top">
    <a class="brand" href="index.html" aria-label="IloTech — accueil">
      <img class="logo" src="img/logo-ilo.png" alt="IloTech" width="64" height="38">
      <span class="brand-text"><b>Ilo<span>Tech</span> <em class="it">IT</em></b><span class="mono">Ducos · Le Robert — Martinique</span></span>
    </a>
    <a class="studio-badge" href="https://ilotech97x.github.io/agence-marketing/" title="IloTech Studio : notre agence marketing et IA"><img src="img/studio-logo.svg" alt="" width="28" height="28"><span><b>IloTech Studio</b><small>Agence marketing &amp; IA</small></span></a>
    <div class="top-actions"><a class="btn btn-head" href="index.html?cat=${p.cat}">Prendre rendez-vous</a></div>
  </header>

  <main class="doc doc-wide" style="--t:${coul}">
    <nav class="fil" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> › <a href="services.html">Services</a> › <span>${esc(p.h1)}</span></nav>
    <section class="seo-hero">
      <div>
        ${p.nouveau ? '<span class="neuf-tag">Nouveau</span>' : ''}
        <h1>${esc(p.h1)}</h1>
        <p class="lead">${esc(p.accroche)}</p>
        <p class="seo-prix">${esc(s0.nom)} <b>${prixDe(s0)}</b> · Devis gratuit · Prix annoncé avant</p>
        <div class="actions left">
          <a class="btn btn-primary" href="index.html?cat=${p.cat}">${ico('calendar')} Prendre rendez-vous en ligne</a>
          <a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">${ico('chat')} WhatsApp</a>
          <a class="btn" href="tel:+596${AGENCES.ducos.tel.replace(/\D/g, '').slice(1)}">${ico('phone')} ${esc(AGENCES.ducos.tel)}</a>
        </div>
      </div>
      <figure class="seo-scene">${scene({ id: p.scene, nom: p.h1, couleur: coul })}<figcaption>Exemple : ce que vous obtenez</figcaption></figure>
    </section>

    ${petite(p.slug) ? photoHtml(p.slug) : ''}
    ${p.intro.map(x => `<p class="seo-texte">${esc(x)}</p>`).join('\n    ')}
    ${petite(p.slug) ? '' : photoHtml(p.slug)}

    <section class="seo-exemple" aria-labelledby="ex-titre">
      <h2 id="ex-titre">${esc(p.exemple.titre)}</h2>
      <div class="avant-apres">
        <div class="avant"><b>Avant</b><ul>${p.exemple.avant.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
        <div class="fleche" aria-hidden="true">→</div>
        <div class="apres"><b>Après IloTech</b><ul>${p.exemple.apres.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      </div>
    </section>

    ${p.cat === 'immo' ? '<p class="seo-guide">Formules, exemples et prix détaillés sur notre site dédié : <a href="https://ilotech97x.github.io/immobilier/">IloTech Immobilier →</a></p>' : ''}
    <h2>Pourquoi choisir IloTech</h2>
    <ul class="seo-atouts">${p.pourquoi.map(x => `<li>${esc(x)}</li>`).join('')}</ul>

    <h2>Tarifs</h2>
    <p class="muted">Prix de départ, ${esc(CONFIG.mentionPrix)}. Le prix exact est confirmé avant toute intervention.${CONFIG.paiement3fois ? ` Paiement en 3 fois sans frais dès ${eur(CONFIG.paiement3fois)}.` : ''}</p>
    <div class="svc-list">${tarifs(p.services)}</div>

    <h2>Comment ça se passe</h2>
    <ol class="seo-etapes">
      <li><b>Vous nous expliquez</b> votre besoin en ligne, par WhatsApp ou par téléphone.</li>
      <li><b>Devis gratuit</b> : le prix est annoncé avant, sans surprise.</li>
      <li><b>Rendez-vous</b> à partir du lendemain, chez vous, en agence ou à distance.</li>
      <li><b>Intervention et suivi</b> : on vous explique tout, et on reste joignable.</li>
    </ol>

    <h2>Questions fréquentes</h2>
    <div class="faq">${faq.map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('')}</div>

    <h2>Où intervenons-nous en Martinique ?</h2>
    ${p.distance ? '<p><b>À distance dans toutes les Antilles</b> : ce service se fait aussi entièrement à distance, pour les entreprises de Guadeloupe, de Guyane, de Saint-Martin et de Saint-Barthélemy (échanges en visio, WhatsApp et email).</p>' : ''}
    <p>Nos agences de <b>Ducos</b> (${esc(AGENCES.ducos.tel)}) et du <b>Robert</b> (${esc(AGENCES.robert.tel)}) couvrent toute l’île. Déplacement offert dès ${eur(CONFIG.deplacementOffertDes)} de prestation, gratuit en agence et à distance.</p>
    <ul class="seo-zones">${zones}</ul>

    <section class="seo-cta" style="--t:${coul}">
      <h2>${esc(p.h1)} : parlons-en</h2>
      <p>Réponse rapide sur WhatsApp aux heures d’ouverture. Devis gratuit et sans engagement.</p>
      <div class="actions left"><a class="btn btn-primary" href="index.html?cat=${p.cat}">Prendre rendez-vous</a><a class="btn btn-wa" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a></div>
    </section>

    <h2>Nos autres services</h2>
    <ul class="seo-liens">${autres.map(x => `<li><a href="${lien(x)}">${esc(x.h1)}</a></li>`).join('')}<li><a href="services.html">Tous nos services et tarifs</a></li></ul>
  </main>
  <footer class="seo-pied">${reseauxHtml()}<p>IloTech — ${esc(ENTREPRISE.nomCommercial)}, entreprise individuelle · SIRET ${esc(ENTREPRISE.siret)} · <a href="mentions-legales.html">Mentions légales</a> · <a href="confidentialite.html">Confidentialité</a></p></footer>
  <script src="data.js?v=${V}"></script>
  <script src="outils.js?v=${V}"></script>
</body>
</html>
`;
}

/* ---------- Gabarit commun (en-tête et pied) ---------- */
const enTete = (titre, desc, url, ld, ogTitre, ogDesc, robots = 'index,follow,max-image-preview:large') => `<!doctype html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://script.google.com https://script.googleusercontent.com https://formsubmit.co; form-action 'self' https://formsubmit.co; object-src 'none'; base-uri 'self'; upgrade-insecure-requests">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(titre)}</title>
  <meta name="description" content="${esc(desc)}">
  ${url ? `<link rel="canonical" href="${url}">` : ''}
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#05070d">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:site_name" content="IloTech">
  <meta property="og:title" content="${esc(ogTitre)}">
  <meta property="og:description" content="${esc(ogDesc)}">
  ${url ? `<meta property="og:url" content="${url}">` : ''}
  <meta property="og:image" content="${SITE}img/og-ilotech.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" type="image/png" href="img/favicon.png">
  <link rel="apple-touch-icon" href="img/apple-touch-icon.png">
  <script>try{if(localStorage.getItem('itTheme')==='light')document.documentElement.dataset.theme='light'}catch(e){}</script>
  <link rel="stylesheet" href="style.css?v=${V}">
${ld.map(o => `  <script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}
</head>
<body class="page-doc page-seo">
  <header class="top">
    <a class="brand" href="index.html" aria-label="IloTech — accueil">
      <img class="logo" src="img/logo-ilo.png" alt="IloTech" width="64" height="38">
      <span class="brand-text"><b>Ilo<span>Tech</span> <em class="it">IT</em></b><span class="mono">Ducos · Le Robert — Martinique</span></span>
    </a>
    <a class="studio-badge" href="https://ilotech97x.github.io/agence-marketing/" title="IloTech Studio : notre agence marketing et IA"><img src="img/studio-logo.svg" alt="" width="28" height="28"><span><b>IloTech Studio</b><small>Agence marketing &amp; IA</small></span></a>
    <div class="top-actions"><a class="btn btn-head" href="conseils.html">Conseils</a><a class="btn btn-head" href="index.html">Prendre rendez-vous</a></div>
  </header>
`;
const pied = () => `  <footer class="seo-pied">${reseauxHtml()}<p>IloTech — entreprise individuelle · SIRET ${esc(ENTREPRISE.siret)} · <a href="services.html">Services et tarifs</a> · <a href="conseils.html">Conseils</a> · <a href="outils-gratuits.html">Outils gratuits</a> · <a href="https://ilotech97x.github.io/agence-marketing/">IloTech Studio, agence marketing</a> · <a href="https://ilotech97x.github.io/immobilier/">IloTech Immobilier</a> · <a href="mentions-legales.html">Mentions légales</a> · <a href="confidentialite.html">Confidentialité</a></p></footer>
  <script src="data.js?v=${V}"></script>
  <script src="outils.js?v=${V}"></script>
</body>
</html>
`;
const fil = (titre, parent = ['services.html', 'Services']) => `<nav class="fil" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> › <a href="${parent[0]}">${parent[1]}</a> › <span>${esc(titre)}</span></nav>`;
const filLd = (titre, url, parent = ['services.html', 'Services']) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'IloTech', item: SITE }, { '@type': 'ListItem', position: 2, name: parent[1], item: SITE + parent[0] }, { '@type': 'ListItem', position: 3, name: titre, item: url }] });

function guide(g) {
  const url = SITE + g.slug + '.html', srv = PAGES.find(p => p.slug === g.service);
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: g.h1, description: g.desc, inLanguage: 'fr-FR', mainEntityOfPage: url, image: SITE + 'img/og-ilotech.jpg',
      datePublished: '2026-10-24', dateModified: new Date().toISOString().slice(0, 10),
      author: { '@type': 'Organization', name: 'IloTech', url: SITE }, publisher: { '@type': 'Organization', name: 'IloTech', logo: { '@type': 'ImageObject', url: SITE + 'img/logo-ilo.png' } } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) },
    filLd(g.h1, url, ['conseils.html', 'Conseils'])
  ];
  return enTete(g.titre, g.desc, url, ld, g.h1, g.chapo) + `
  <main class="doc doc-wide" style="--t:${g.couleur}">
    ${fil(g.h1, ['conseils.html', 'Conseils'])}
    <article class="guide">
      <section class="seo-hero">
        <div><span class="neuf-tag guide-tag">Guide pratique</span><h1>${esc(g.h1)}</h1><p class="lead">${esc(g.chapo)}</p>
          ${srv ? `<div class="actions left"><a class="btn btn-primary" href="${srv.slug}.html">${esc(srv.h1)}</a><a class="btn" href="index.html?cat=${g.cat}">Prendre rendez-vous</a></div>` : ''}</div>
        <figure class="seo-scene">${scene({ id: g.scene, nom: g.h1, couleur: g.couleur })}</figure>
      </section>
      <nav class="sommaire" aria-label="Sommaire"><b>Sommaire</b><ol>${g.sections.map(([t], i) => `<li><a href="#s${i + 1}">${esc(t)}</a></li>`).join('')}<li><a href="#faq">Questions fréquentes</a></li></ol></nav>
      ${photoHtml(g.slug)}
      ${g.sections.map(([t, ps], i) => `<section id="s${i + 1}"><h2>${esc(t)}</h2>${ps.map(x => `<p class="seo-texte">${esc(x)}</p>`).join('')}</section>`).join('\n      ')}
      <h2 id="faq">Questions fréquentes</h2>
      <div class="faq">${g.faq.map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('')}</div>
      ${srv ? `<section class="seo-cta" style="--t:${g.couleur}"><h2>Besoin d’un coup de main ?</h2><p>${esc(srv.accroche)}</p>
        <div class="actions left"><a class="btn btn-primary" href="${srv.slug}.html">${esc(srv.h1)}</a><a class="btn btn-wa" href="${esc(waUrl(AGENCES.ducos.tel, `Bonjour IloTech, j’ai lu votre guide « ${g.h1} ».`))}" target="_blank" rel="noopener">WhatsApp</a></div></section>` : ''}
    </article>
    <h2>Autres conseils</h2>
    <ul class="seo-liens">${GUIDES.filter(x => x !== g).map(x => `<li><a href="${x.slug}.html">${esc(x.h1)}</a></li>`).join('')}<li><a href="services.html">Tous nos services</a></li></ul>
  </main>
` + pied();
}

PAGES.forEach(p => {
  if (!catDe(p.cat)) throw new Error('catégorie inconnue : ' + p.cat);
  p.services.forEach(id => { if (!svc(id)) throw new Error('service inconnu : ' + id); });
  let h = page(p);
  const gs = GUIDES.filter(g => g.service === p.slug);
  if (gs.length) h = h.replace('<h2>Nos autres services</h2>', `<p class="seo-guide">À lire aussi : ${gs.map(g => `<a href="${g.slug}.html">${esc(g.h1)}</a>`).join(' · ')}</p>\n    <h2>Nos autres services</h2>`);
  fs.writeFileSync(path.join(dir, lien(p)), h);
});
GUIDES.forEach(g => fs.writeFileSync(path.join(dir, g.slug + '.html'), guide(g)));

// page « Conseils » : liste des guides
fs.writeFileSync(path.join(dir, 'conseils.html'), enTete('Conseils informatique, Starlink et sécurité en Martinique | IloTech',
  'Guides pratiques IloTech : Starlink en Martinique, coupures de courant, arnaques par SMS. Des conseils simples pour vos appareils, votre internet et votre sécurité.',
  SITE + 'conseils.html', [filLd('Conseils', SITE + 'conseils.html')], 'Conseils IloTech', 'Guides pratiques : Starlink, coupures de courant, arnaques.') + `
  <main class="doc doc-wide">
    ${fil('Conseils')}
    <h1>Conseils et guides pratiques</h1>
    <p class="lead">Des explications simples pour bien choisir, bien installer et rester en sécurité, pensées pour la Martinique.</p>
    <div class="guides">${GUIDES.map(g => `<a class="guide-carte" href="${g.slug}.html" style="--t:${g.couleur}">${scene({ id: g.scene, nom: g.h1, couleur: g.couleur })}<b>${esc(g.h1)}</b><span>${esc(g.chapo)}</span></a>`).join('')}</div>
    <h2>Nos services</h2>
    <ul class="seo-liens">${PAGES.map(p => `<li><a href="${lien(p)}">${esc(p.h1)}</a></li>`).join('')}</ul>
  </main>
` + pied());


// page « Outils gratuits » (comme un écosystème : des outils utiles qui font venir des visiteurs)
fs.writeFileSync(path.join(dir, 'outils-gratuits.html'), enTete('Outils gratuits : QR code, mot de passe, onduleur | IloTech',
  'Outils gratuits IloTech : créer un QR code, générer un mot de passe solide, calculer l’onduleur qu’il vous faut contre les coupures de courant. Tout fonctionne dans votre navigateur.',
  SITE + 'outils-gratuits.html', [filLd('Outils gratuits', SITE + 'outils-gratuits.html', ['conseils.html', 'Conseils']),
    { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Outils gratuits IloTech', itemListElement: ['Générateur de QR code', 'Générateur de mot de passe', 'Calculateur d’onduleur'].map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n, url: SITE + 'outils-gratuits.html#o' + (i + 1) })) }],
  'Outils gratuits IloTech', 'QR code, mot de passe, onduleur : des outils simples et gratuits.')
  .replace("script-src 'self' 'unsafe-inline'", "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com") + `
  <main class="doc doc-wide">
    ${fil('Outils gratuits', ['conseils.html', 'Conseils'])}
    <h1>Outils gratuits</h1>
    <p class="lead">Des outils simples pour le quotidien. Tout se passe dans votre navigateur : rien n’est envoyé ni enregistré chez nous.</p>
    <section class="outil" id="o1"><h2>${ico('grid')} Générateur de QR code</h2>
      <p class="muted">Pour votre carte de visite, votre vitrine, un menu ou le Wi-Fi des invités.</p>
      <div class="outil-ligne"><label>Adresse ou texte<input id="qrTexte" value="https://ilo-tech.com" maxlength="500"></label><button type="button" class="btn btn-primary" id="qrBtn">Créer le QR code</button></div>
      <div id="qrRendu" class="qr-rendu" aria-live="polite"></div><a id="qrDl" class="btn" hidden download="qr-code.png">Télécharger l’image</a></section>
    <section class="outil" id="o2"><h2>${ico('lock')} Générateur de mot de passe</h2>
      <p class="muted">Un mot de passe différent et solide pour chaque compte : c’est la meilleure protection contre le piratage.</p>
      <div class="outil-ligne"><label>Longueur <input id="mdpLong" type="number" min="12" max="64" value="16"></label>
        <label class="p-check"><input id="mdpSym" type="checkbox" checked> Symboles</label><button type="button" class="btn btn-primary" id="mdpBtn">Générer</button></div>
      <p class="mdp"><code id="mdpRes">—</code> <button type="button" class="btn btn-sm" id="mdpCopie">Copier</button></p></section>
    <section class="outil" id="o3"><h2>${ico('battery')} Quel onduleur me faut-il ?</h2>
      <p class="muted">Cochez ce que vous voulez garder allumé pendant une coupure de courant.</p>
      <div id="ondListe" class="ond-liste"></div>
      <p class="ond-res" id="ondRes" aria-live="polite"></p>
      <p class="muted small">Estimation indicative. <a href="onduleur-coupure-courant-martinique.html">Nous choisissons et installons le bon modèle</a>.</p></section>
    <h2>Besoin d’aide ?</h2>
    <ul class="seo-liens"><li><a href="guide-arnaques-sms-martinique.html">Reconnaître les arnaques</a></li><li><a href="guide-coupures-courant-martinique.html">Protéger son matériel des coupures</a></li><li><a href="installation-starlink-martinique.html">Installation Starlink</a></li><li><a href="services.html">Tous nos services</a></li></ul>
  </main>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" integrity="sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
  <script src="outils-gratuits.js?v=${V}"></script>
` + pied());

// page d'erreur (adresse inconnue) : liens absolus, car elle s'affiche à n'importe quelle adresse
fs.writeFileSync(path.join(dir, '404.html'), enTete('Page introuvable | IloTech', 'Cette page n’existe pas ou a été déplacée.', '', [], 'IloTech', 'Page introuvable', 'noindex')
  .replace(/href="(?!https?:|#|tel:|\/)([^"]+)"/g, 'href="/$1"').replace(/src="(?!https?:|\/)([^"]+)"/g, 'src="/$1"') + `
  <main class="doc doc-wide">
    <h1>Oups, cette page n’existe pas</h1>
    <p class="lead">Elle a peut-être été déplacée. Voici où trouver ce que vous cherchez :</p>
    <div class="actions left"><a class="btn btn-primary" href="/">Prendre rendez-vous</a><a class="btn" href="/services.html">Nos services et tarifs</a><a class="btn" href="/conseils.html">Conseils</a></div>
    <h2>Nos services</h2>
    <ul class="seo-liens">${PAGES.map(p => `<li><a href="/${lien(p)}">${esc(p.h1)}</a></li>`).join('')}</ul>
  </main>
</body>
</html>
`);

// page Services : liens en HTML simple vers chaque page (lisibles par Google sans JavaScript)
const svcHtml = path.join(dir, 'services.html');
let sh = fs.readFileSync(svcHtml, 'utf8');
const bloc = `<!-- PAGES (généré par generer-pages.js) -->
    <nav class="seo-index" aria-label="Tous nos services en détail"><h2>Tous nos services en détail</h2>
      <ul class="seo-liens">${PAGES.map(p => `<li><a href="${lien(p)}">${esc(p.h1)}</a></li>`).join('')}<li><a href="conseils.html">Conseils et guides</a></li><li><a href="outils-gratuits.html">Outils gratuits</a></li></ul></nav>
    <!-- /PAGES -->`;
sh = /<!-- PAGES[\s\S]*?<!-- \/PAGES -->/.test(sh) ? sh.replace(/<!-- PAGES[\s\S]*?<!-- \/PAGES -->/, bloc) : sh.replace('  </main>', '    ' + bloc + '\n  </main>');
fs.writeFileSync(svcHtml, sh);

// sitemap : pages principales, pages service, guides
const jour = new Date().toISOString().slice(0, 10);
const urls = [['', '1.0', 'weekly'], ['services.html', '0.9', 'weekly'], ...PAGES.map(p => [lien(p), p.nouveau ? '0.9' : '0.8', 'monthly']),
  ['conseils.html', '0.7', 'monthly'], ['outils-gratuits.html', '0.6', 'monthly'], ...GUIDES.map(g => [g.slug + '.html', '0.7', 'monthly']), ['plaquette.html', '0.6', 'monthly'], ['fiche-tarifs.html', '0.5', 'monthly']];
fs.writeFileSync(path.join(dir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, pr, f]) => `  <url><loc>${SITE}${u}</loc><lastmod>${jour}</lastmod><changefreq>${f}</changefreq><priority>${pr}</priority></url>`).join('\n')}
</urlset>
`);
// liste des pages pour les liens de la page Services
fs.writeFileSync(path.join(dir, 'pages-seo.js'), `// Généré par generer-pages.js : catégorie -> page dédiée (liens « En savoir plus »)\nconst PAGES_SEO = ${JSON.stringify(Object.fromEntries(PAGES.filter(p => !p.pasDeLienCat).map(p => [p.cat, { url: lien(p), titre: p.h1 }]).reverse()))};\n`);
console.log(`${PAGES.length} pages service, ${GUIDES.length} guides, conseils.html, 404.html, sitemap.xml (${urls.length} adresses)`);
