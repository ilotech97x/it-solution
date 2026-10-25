ILOTECH — SITE, RENDEZ-VOUS ET PROSPECTION (Ducos · Le Robert, Martinique)
Guide unique : tout est ici.

══════════════════════════════════════════════════════════════
1. LES PAGES
══════════════════════════════════════════════════════════════
Pour les clients
  Accueil (services, rendez-vous, devis)  https://ilo-tech.com/
  Services et tarifs                      https://ilo-tech.com/services.html
  Fiche tarifs (PDF)                      https://ilo-tech.com/fiche-tarifs.html
  Suivre ma demande                       https://ilo-tech.com/#suivi
  Mentions légales / Confidentialité      mentions-legales.html · confidentialite.html

Pour vous (non référencées sur Google)
  Rendez-vous (planning, confirmer…)      https://ilo-tech.com/gestion.html
  Prospection (entreprises)               https://ilo-tech.com/prospection.html
  Être trouvé (particuliers)              https://ilo-tech.com/visibilite.html
  Flyers à imprimer                       https://ilo-tech.com/flyer.html
  Plaquette (présentation, sans prix)     https://ilo-tech.com/plaquette.html

══════════════════════════════════════════════════════════════
2. INSTALLER LE MOTEUR GOOGLE (15 minutes, une seule fois)
══════════════════════════════════════════════════════════════
Le site est une vitrine : il ne peut pas envoyer d'emails ni garder des données communes.
Le « moteur » est un script gratuit sur votre compte Google qui le fait à sa place :
  - chaque demande arrive dans un tableau Google + dans un agenda + par email
  - la page Rendez-vous (gestion.html) fonctionne
  - les créneaux complets sont grisés, le client peut suivre sa demande, rappels la veille à 18 h
  - Prospection : prospects partagés entre Ducos et Le Robert, analyse des sites, envoi des emails

ÉTAPE 1 — Créer le tableau
  1. Ouvrez https://sheets.google.com avec labicheerwan81@gmail.com
  2. Cliquez « Feuille de calcul vierge ». Nommez-la « IloTech — Demandes » (en haut à gauche).

ÉTAPE 2 — Coller le script
  1. Dans le tableau : menu Extensions > Apps Script. Un éditeur s'ouvre.
  2. Effacez tout le code présent (Ctrl+A puis Suppr).
  3. Ouvrez le fichier google-apps-script.gs (dans ce dossier), copiez TOUT (Ctrl+A, Ctrl+C),
     collez dans l'éditeur (Ctrl+V).
     Il est déjà réglé : votre email, l'adresse du site et le code de l'espace pro (CLE_GESTION).
  4. Cliquez l'icône disquette (Enregistrer). Nommez le projet « IloTech ».

ÉTAPE 3 — Lancer l'installation
  1. En haut de l'éditeur, dans la liste des fonctions, choisissez « installer », puis ▶ Exécuter.
  2. Google demande l'autorisation : « Examiner les autorisations » > votre compte >
     « Paramètres avancés » > « Accéder à IloTech (non sécurisé) » > « Autoriser ».
     (C'est normal : c'est votre propre script, Google affiche ce message pour tous les scripts perso.)
  3. En bas, le journal affiche « Installation terminée ». Le tableau a maintenant les onglets
     « Demandes » et « Prospects », et l'agenda « IloTech — Interventions » est créé.

ÉTAPE 4 — Publier le moteur
  1. Bouton bleu « Déployer » (en haut à droite) > « Nouveau déploiement ».
  2. Roue dentée à côté de « Sélectionner le type » > « Application Web ».
  3. Description : IloTech. Exécuter en tant que : « Moi ». Qui a accès : « Tout le monde ».
  4. « Déployer » (réautorisez si demandé), puis COPIEZ « l'URL de l'application Web »
     (elle commence par https://script.google.com/macros/s/ et finit par /exec).

ÉTAPE 5 — Brancher le site
  Envoyez cette adresse à Claude, ou faites-le vous-même :
  dans data.js, ligne endpoint: '', collez l'adresse entre les apostrophes, puis publiez (partie 5).

ÉTAPE 6 — Se connecter aux pages pro
  Ouvrez gestion.html, entrez le code de l'espace pro (CLE_GESTION, en haut du script).
  Le même code sert à la Prospection (onglet Réglages). Ne le donnez qu'à l'équipe.

Votre tableau : « IloTech — Demandes » sur le compte ilotech.contact@gmail.com (sheets.google.com)
(bouton « Tableau Google » sur la page Rendez-vous ; le script : Extensions > Apps Script)

Partager le planning avec l'autre agence : https://calendar.google.com > à gauche,
« IloTech — Interventions » > ⋮ > Paramètres et partage > Partager avec des personnes.

SI VOUS MODIFIEZ LE SCRIPT PLUS TARD
  Collez la nouvelle version, enregistrez, puis Déployer > Gérer les déploiements > crayon ✎ >
  Version : « Nouvelle version » > Déployer. L'adresse /exec reste la même.

RÉCEPTION PAR EMAIL SANS LE MOTEUR (déjà activée)
  data.js contient emailReception: 'labicheerwan81@gmail.com' (service gratuit FormSubmit).
  À la toute première demande, FormSubmit envoie un email « Activate Form » : cliquez dessus
  (regardez dans les spams). Faites une demande test depuis le site pour le déclencher.
  Tant que rien n'est activé, le client est invité à envoyer sa demande par WhatsApp.

══════════════════════════════════════════════════════════════
3. AU QUOTIDIEN
══════════════════════════════════════════════════════════════
RENDEZ-VOUS (gestion.html)
  « À traiter » : nouvelles demandes, bouton Confirmer (le client reçoit un email).
  « Planning » : la semaine (bleu = Ducos, orange = Le Robert). Cliquez pour déplacer, changer
  le statut (Diagnostic, Réparation, Prêt à récupérer, Terminé…) ou annuler.
  « + RDV téléphone » : ajoutez un rendez-vous pris par téléphone.

STATISTIQUES (anonymes, sans cookie : pas de bandeau à afficher)
  Page Rendez-vous > onglet « Statistiques » : visites, pages vues, demandes, taux de demande,
  clics WhatsApp / téléphone, services et formules choisis, provenance, appareils, jour par jour,
  bouton « Télécharger (CSV / Excel) ».
  Dans le tableau Google : onglet « Visites » (une ligne par événement) et onglet « Statistiques »
  (calculs automatiques). Provenance marquée : QR des flyers (flyer, flyer-pro), plaquette,
  emails (email, email-auto), Leboncoin, Facebook ; ajoutez ?src=nom à un lien pour le suivre.

PROSPECTION AUTOMATIQUE (moteur Google, chaque jour ouvré à 9 h)
  Cherche des entreprises (OpenStreetMap), trouve leur email sur leur site, vérifie que l'adresse
  existe, envoie un email personnalisé SANS PRIX avec le lien de la plaquette, relance sans réponse
  (J+4 puis J+7, 3 messages au maximum), s'arrête dès qu'une entreprise répond ou écrit STOP
  (lecture de votre Gmail), et vous envoie un bilan par email.
  3 MODES, à choisir sur la page Prospection > Aujourd'hui > « Pilotage de la prospection » :
    - Automatique : cherche, écrit et relance tout seul chaque jour ouvré à 9 h
    - Validation  : cherche et prépare les emails, mais n'envoie rien : liste « À valider » avec
                    « Voir l'email », « Envoyer », « Écarter », « Tout envoyer »
    - Arrêt       : rien d'automatique (les commandes manuelles restent disponibles)
  Réglage du nombre d'emails par jour et bouton « Lancer maintenant » au même endroit.
  ENVOI À PLUSIEURS ENTREPRISES : onglet « Mes prospects » (ou la liste « À valider ») : cochez une ou
  plusieurs entreprises (filtres + « Avec email seulement » + « Tout sélectionner »), puis « Envoyer l'email ».
  Tout est visible : page Prospection > onglet « Emails envoyés », et onglets « Prospects » /
  « Emails envoyés » du tableau. Réglages en haut du script : AUTO_PROSPECTION (true/false),
  AUTO_PAR_JOUR (15), SIGNATURE. Bouton « Lancer maintenant » dans Prospection > Réglages.

PROSPECTION (prospection.html) — entreprises uniquement
  « Aujourd'hui » : relances du jour + 10 prospects à contacter (le message est déjà écrit).
  Première fois : « Trouver automatiquement mes 30 meilleurs prospects ».
  Ouvrez une fiche : score expliqué, offre conseillée, meilleur moment pour appeler,
  boutons WhatsApp / SMS / Email / Appeler, script d'appel. Après un envoi, la relance se programme
  toute seule (J+3, puis J+10). Avec le moteur : « Envoyer les emails du jour » et « Analyser son site ».
  Sources gratuites : nouvelles entreprises (BODACC), OpenStreetMap, annuaire officiel.
  Règles : professionnels uniquement, 25 emails par jour, « Ne plus contacter » respecté.

ÊTRE TROUVÉ (visibilite.html) — particuliers
  La loi interdit de démarcher les particuliers par email, SMS ou téléphone sans leur accord :
  ils doivent vous trouver. Suivez la liste (fiche Google Maps d'abord) : textes prêts à copier.
  Flyers (flyer.html) : 4 par page A4, version particuliers ou pros, avec QR code.

══════════════════════════════════════════════════════════════
4. MODIFIER LES PRIX OU LES PRESTATIONS : un seul fichier, data.js
══════════════════════════════════════════════════════════════
  Le site, la page Services, la fiche tarifs, les flyers, la prospection et les textes
  « Être trouvé » lisent tous data.js : une modification se reporte partout.
  - CONFIG      : email, moteur Google (endpoint), adresse du site, déplacement offert, places par créneau…
  - SERVICES    : chaque prestation = un prix « dès » + des options
  - PACKS       : formules à prix fixe (le « au lieu de » est calculé tout seul)
  - UNIVERS     : les 5 pôles (Informatique, Maison connectée, Web, IA & marketing, Entreprises, Drone & immobilier)
  - CATEGORIES  : les onglets de chaque pôle et leur couleur ; BIENTOT : la ligne « Bientôt »
    Lien direct vers un pôle : index.html?pole=web (ou ?cat=drone pour un onglet)
  - SYMPTOMES   : « Dites-nous ce qui ne va pas »
  - VITRINES    : la présentation de chaque onglet (« Ce que vous obtenez », puces)
  - PHOTOS_CAT  : la photo de chaque onglet (img/photos/), affichée dans la 1re carte de service
  - CARROUSEL   : les diapositives « IloTech en images » de l'accueil (photo + texte + prix, automatique)
  - ZONES, COMMUNES, HORAIRES, AGENCES, DELAIS, CRENEAUX
  - Rendez-vous : CONFIG.placesParCreneau (3 clients le matin, 3 l'après-midi, par agence ; même
    valeur que CAPACITE dans le script Google) et CONFIG.delaiMinJours (1 = pas de rendez-vous le jour même).
  ⚠ Les pages Google (installation-starlink-martinique.html, depannage-informatique-martinique.html…)
    sont écrites à l'avance pour être bien lues par Google. Après un changement de prix ou de texte :
    node generer-pages.js   (le contenu de ces pages est dans ce fichier ; il met aussi sitemap.xml à jour)

══════════════════════════════════════════════════════════════
5. PUBLIER UNE MODIFICATION
══════════════════════════════════════════════════════════════
  Le site est hébergé gratuitement sur GitHub Pages (dépôt ilotech97x/it-solution, domaine ilo-tech.com).
  - Le plus simple : demandez à Claude, il modifie et publie.
  - Sur github.com : ouvrez le dépôt > data.js > crayon ✎ > modifiez > « Commit changes ».
  - Depuis ce dossier : git add -A && git commit -m "Mise à jour" && git push
  En ligne en 1 à 2 minutes. Ensuite Ctrl+F5 pour voir la nouvelle version.
  ⚠ google-apps-script.gs n'est JAMAIS mis en ligne (il contient le code de l'espace pro).

══════════════════════════════════════════════════════════════
6. LES FICHIERS
══════════════════════════════════════════════════════════════
  data.js                  réglages, prix, prestations (le seul fichier à modifier)
  outils.js                petits outils communs (prix, dates, téléphone)
  index.html  app.js  style.css          site client. L'accueil, de haut en bas :
                                         1. l'outil de rendez-vous (tient sur un écran sur PC)
                                         2. « IloTech en images » : carrousel construit par app.js depuis CARROUSEL
                                         3. « Nos autres sites » (Studio, Immobilier, Conseils), engagements, pied de page
  services.html  services.js             page Services et tarifs
  scenes.js                              illustrations (un exemple concret par catégorie)
  generer-pages.js  *-martinique.html  pages-seo.js   pages Google, une par service (générées)
  conseils.html  guide-*.html  404.html  sitemap.xml   aussi générés par generer-pages.js (ne pas modifier à la main)
  outils-gratuits.html  outils-gratuits.js   outils gratuits (QR code, mot de passe, onduleur)
  img/photos/<nom>.jpg                   photos générées par IA (« Illustration ») ; dimensions.json : leurs tailles
  CONFIG.reseaux / CONFIG.partenaires (data.js)   réseaux sociaux et partenaires affichés sur le site
  fiche-tarifs.html .js .css             fiche tarifs imprimable
  gestion.html  gestion.js  gestion.css  page Rendez-vous
  prospection.html .js .css              prospection
  visibilite.html  visibilite.js         être trouvé ; flyer.html : flyers
  osm-martinique.json      copie de secours des commerces (OpenStreetMap)
  img/                     logo et icônes ; sitemap.xml : plan du site pour Google
  google-apps-script.gs    le moteur Google (reste sur votre PC)
  A-FAIRE.txt  GOOGLE-BUSINESS.txt  PROMPTS-IMAGES.txt   notes personnelles (jamais publiées)

  Les autres sites (dossiers voisins, créés par ..\sites\construire.py — ne pas modifier leur index.html à la main) :
  ..gence-marketing   IloTech Studio      https://ilotech97x.github.io/agence-marketing/
  ..\immobilier         IloTech Immobilier  https://ilotech97x.github.io/immobilier/
  Numéro de version (?v=82) : il est lu dans index.html ; l'augmenter partout force les navigateurs à recharger.
