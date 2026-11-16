/* Boutique IloTech (boutique.html) : rayons, recherche, filtres, fiches produit, comparateur, favoris, panier gardé sur l'appareil,
   commande par WhatsApp ou email. Tout le code est dans une fonction : aucune variable globale (les fichiers du site partagent la même portée).
   Prix : seulement ceux de data.js (références ref: [service, option]), les mêmes que sur les devis. Rien n'est payé en ligne :
   IloTech confirme le prix du jour et la disponibilité, le client paie à la remise.
   Mobilité électrique : sur commande, prix sur demande tant que le fournisseur et les tarifs ne sont pas fixés (A-FAIRE.txt).
   Disponibilité : champ dispo par produit : 'commande' (défaut), 'demande' (mobilité), 'stock' (prévu pour plus tard, pas utilisé).
   Photos : champ facultatif photo (chemin d'image) qui remplace l'illustration dessinée. */
(() => {
  'use strict';

  // ---------- catalogue ----------
  // rayons (vis : produit montré sur la tuile), sous-rayons [id, nom]
  const CATS = [
    { id: 'mobilite', nom: 'Mobilité électrique', vis: 'velo', c: '#16a34a', sr: [['velos', 'Vélos à assistance électrique'], ['trottinettes', 'Trottinettes'], ['motos', 'Motos et scooters'], ['access', 'Casques et accessoires']] },
    { id: 'starlink', nom: 'Starlink et internet', vis: 'antenne', c: '#2b8cff', sr: [['kits', 'Kits Starlink'], ['access', 'Supports, câbles et fixations']] },
    { id: 'wifi', nom: 'Wi-Fi et réseau', vis: 'mesh', c: '#0891b2', sr: [['mesh', 'Wi-Fi mesh']] },
    { id: 'securite', nom: 'Caméras et alarme', vis: 'camera', c: '#e11d48', sr: [['cameras', 'Kits caméras'], ['enregistreurs', 'Enregistreurs'], ['alarmes', 'Alarmes']] },
    { id: 'energie', nom: 'Énergie et coupures', vis: 'ups', c: '#f59e0b', sr: [['onduleurs', 'Onduleurs'], ['batteries', 'Batteries nomades'], ['suivi', 'Suivi de l’énergie']] },
    { id: 'ordi', nom: 'Ordinateurs reconditionnés', vis: 'laptop', c: '#7c3aed', sr: [['portables', 'PC portables'], ['fixes', 'PC fixes'], ['stockage', 'Stockage et sauvegarde']] },
    { id: 'maison', nom: 'Maison connectée et TV', vis: 'box', c: '#0ea5e9', sr: [['domotique', 'Domotique'], ['tv', 'TV et supports']] },
    { id: 'pro', nom: 'Commerce et bureau', vis: 'caisse', c: '#64748b', sr: [['caisse', 'Caisses enregistreuses']] },
  ];

  // ref : [service, option] de data.js → prix et libellé du devis ; prix null = prix sur demande
  // pose : [service, option] de data.js, seulement quand une option de pose existe pour ce matériel
  // regle : clé de REGLES (ce que la loi demande), montrée sur la fiche
  // car : caractéristiques [libellé, valeur] tirées des libellés, notes et points de data.js ; les trois premières sont montrées sur la carte
  const PRODUITS = [
    { id: 'vae-ville', cat: 'mobilite', sr: 'velos', vis: 'velo', nom: 'Vélo à assistance électrique de ville', desc: 'Pour les trajets du quotidien, même dans les côtes.', points: ['Assistance jusqu’à 25 km/h', 'Moteur 250 W, batterie amovible', 'Sans permis ni immatriculation'], regle: 'vae', recond: false,
      car: [['Vitesse max', '25 km/h (assistance)'], ['Moteur', '250 W'], ['Immatriculation', 'Non'], ['Batterie', 'Amovible'], ['Usage', 'Trajets du quotidien'], ['Permis', 'Aucun']], assoc: ['access-mob', 'vtt-ae'] },
    { id: 'vtt-ae', cat: 'mobilite', sr: 'velos', vis: 'velo', nom: 'VTT à assistance électrique', desc: 'Pour les mornes, les traces et les chemins de terre.', points: ['Assistance jusqu’à 25 km/h', 'Suspensions, pneus tout-terrain', 'Sans permis ni immatriculation'], regle: 'vae',
      car: [['Vitesse max', '25 km/h (assistance)'], ['Suspensions', 'Oui'], ['Pneus', 'Tout-terrain'], ['Immatriculation', 'Non'], ['Usage', 'Mornes, traces et chemins de terre'], ['Permis', 'Aucun']], assoc: ['access-mob', 'vae-ville'] },
    { id: 'cargo-ae', cat: 'mobilite', sr: 'velos', vis: 'cargo', nom: 'Vélo cargo électrique', desc: 'Courses, enfants ou petites livraisons, sans voiture.', points: ['Caisse ou porte-bagages renforcé', 'Assistance jusqu’à 25 km/h', 'Idéal pour les commerces de proximité'], regle: 'vae',
      car: [['Vitesse max', '25 km/h (assistance)'], ['Chargement', 'Caisse ou porte-bagages renforcé'], ['Immatriculation', 'Non'], ['Usage', 'Courses, enfants, petites livraisons'], ['Permis', 'Aucun']], assoc: ['access-mob', 'vae-ville'] },
    { id: 'trottinette', cat: 'mobilite', sr: 'trottinettes', vis: 'trottinette', nom: 'Trottinette électrique', desc: 'Pliable, pour la ville et le dernier kilomètre.', points: ['Vitesse bridée à 25 km/h', 'Pliable, se range partout', 'Autonomie selon le modèle'], regle: 'edpm',
      car: [['Vitesse max', '25 km/h (bridée)'], ['Pliable', 'Oui'], ['Autonomie', 'Selon le modèle'], ['Âge minimum', '14 ans'], ['Assurance', 'Responsabilité civile obligatoire']], assoc: ['access-mob', 'vae-ville'] },
    { id: 'moto-tt', cat: 'mobilite', sr: 'motos', vis: 'moto', nom: 'Moto électrique légère tout-terrain', desc: 'Type Sur-Ron Light Bee X ou Talaria : légère, silencieuse, très coupleuse.', points: ['Marque et modèle au choix', 'Silencieuse, sans essence', 'Usage hors route uniquement'], regle: 'tt',
      car: [['Marque et modèle', 'Au choix'], ['Motorisation', 'Électrique, silencieuse, sans essence'], ['Usage', 'Hors route uniquement'], ['Homologation', 'Non homologuée'], ['Assurance', 'Obligatoire, même hors route']], assoc: ['access-mob', 'moto-route'] },
    { id: 'moto-route', cat: 'mobilite', sr: 'motos', vis: 'moto', nom: 'Moto électrique légère homologuée route', desc: 'Version homologuée (catégorie L1e, 45 km/h) des motos électriques légères.', points: ['Carte grise et plaque', 'Circule sur route', 'Recharge sur une prise normale'], regle: 'l1e',
      car: [['Vitesse max', '45 km/h'], ['Catégorie', 'L1e'], ['Immatriculation', 'Carte grise et plaque'], ['Recharge', 'Prise normale'], ['Usage', 'Sur route']], assoc: ['access-mob', 'scooter'] },
    { id: 'scooter', cat: 'mobilite', sr: 'motos', vis: 'scooter', nom: 'Scooter électrique', desc: 'L’équivalent d’un 50 cm³, sans bruit et sans plein d’essence.', points: ['45 km/h, catégorie L1e', 'Coffre sous la selle', 'Recharge sur une prise normale'], regle: 'l1e',
      car: [['Vitesse max', '45 km/h'], ['Catégorie', 'L1e'], ['Immatriculation', 'Carte grise et plaque'], ['Coffre', 'Sous la selle'], ['Recharge', 'Prise normale']], assoc: ['access-mob', 'moto-route'] },
    { id: 'access-mob', cat: 'mobilite', sr: 'access', vis: 'casque', nom: 'Casques, antivols, chargeurs et batteries', desc: 'Pour votre vélo, trottinette ou moto électrique, selon le modèle.', points: ['Casques aux normes', 'Antivols en U et chaînes', 'Batteries et chargeurs compatibles'],
      car: [['Casques', 'Aux normes'], ['Antivols', 'En U et chaînes'], ['Batteries et chargeurs', 'Compatibles, selon le modèle']], assoc: ['vae-ville', 'trottinette', 'scooter'] },
    { id: 'kitstd', cat: 'starlink', sr: 'kits', vis: 'antenne', ref: ['starlink', 'kitstd'], pose: ['starlink', 'pose'], nom: 'Kit Starlink Standard', desc: 'Antenne et routeur Wi-Fi : internet par satellite partout en Martinique.', points: ['Antenne + routeur Wi-Fi', 'Abonnement payé à Starlink', 'Pose sur toit possible'], svc: 'starlink',
      car: [['Contenu', 'Antenne + routeur Wi-Fi'], ['Connexion', 'Par satellite'], ['Abonnement', 'Payé à Starlink, à votre nom'], ['Pose', 'Sur toit possible']], assoc: ['sl-support', 'sl-mat', 'sl-cable', 'sl-fix', 'mesh2'] },
    { id: 'kitmini', cat: 'starlink', sr: 'kits', vis: 'antenne', ref: ['starlink', 'kitmini'], pose: ['starlink', 'mini'], nom: 'Kit Starlink Mini', desc: 'Compact : bateau, véhicule, petit logement.', points: ['Routeur intégré', 'Se branche en USB-C', 'Abonnement payé à Starlink'], svc: 'starlink',
      car: [['Contenu', 'Routeur intégré'], ['Connexion', 'Par satellite'], ['Abonnement', 'Payé à Starlink, à votre nom'], ['Alimentation', 'USB-C'], ['Usage', 'Bateau, véhicule, petit logement']], assoc: ['station', 'ups600'] },
    { id: 'sl-support', cat: 'starlink', sr: 'access', vis: 'mat', ref: ['starlink', 'support'], pose: ['starlink', 'toit'], nom: 'Support pivotant Starlink', desc: 'Pour orienter et fixer l’antenne solidement.', points: ['Fixation murale ou toiture', 'Résiste au vent'], svc: 'starlink',
      car: [['Fixation', 'Murale ou toiture'], ['Tenue', 'Résiste au vent'], ['Pour', 'Antenne Starlink']], assoc: ['kitstd', 'sl-fix', 'sl-cable'] },
    { id: 'sl-mat', cat: 'starlink', sr: 'access', vis: 'mat', ref: ['starlink', 'mat'], nom: 'Mât ou support mural', desc: 'Acier galvanisé, pour l’air salin.', points: ['Acier galvanisé', 'Dégage l’antenne des obstacles'], svc: 'starlink',
      car: [['Matière', 'Acier galvanisé'], ['Fixation', 'Mât ou support mural'], ['Rôle', 'Dégage l’antenne des obstacles']], assoc: ['kitstd', 'sl-fix', 'sl-cable'] },
    { id: 'sl-cable', cat: 'starlink', sr: 'access', vis: 'cable', ref: ['starlink', 'cable45'], nom: 'Câble Starlink 45 m', desc: 'Quand l’antenne est loin de la maison.', points: ['45 mètres', 'Compatible kit Standard'], svc: 'starlink',
      car: [['Longueur', '45 m'], ['Compatibilité', 'Kit Standard']], assoc: ['kitstd', 'sl-fix', 'sl-support'] },
    { id: 'sl-fix', cat: 'starlink', sr: 'access', vis: 'cable', ref: ['starlink', 'fixations'], nom: 'Lot de fixation et traversée murale', desc: 'Pour passer le câble proprement et sans infiltration.', points: ['Passe-câble étanche', 'Visserie inox'], svc: 'starlink',
      car: [['Passe-câble', 'Étanche'], ['Visserie', 'Inox']], assoc: ['kitstd', 'sl-cable', 'sl-support'] },
    { id: 'mesh2', cat: 'wifi', sr: 'mesh', vis: 'mesh', ref: ['network', 'mesh2'], pose: ['network', 'mesh'], nom: '2 bornes Wi-Fi mesh', desc: 'Le Wi-Fi partout dans une maison de plain-pied.', points: ['Un seul nom de réseau', 'Couvre jusqu’à environ 200 m²'], svc: 'network',
      car: [['Bornes', '2'], ['Réseau', 'Un seul nom de réseau'], ['Couverture', 'Jusqu’à environ 200 m²'], ['Logement', 'De plain-pied']], assoc: ['ups600', 'kitstd'] },
    { id: 'mesh3', cat: 'wifi', sr: 'mesh', vis: 'mesh', ref: ['network', 'mesh3'], pose: ['network', 'mesh'], nom: '3 bornes Wi-Fi mesh', desc: 'Grande maison ou étage : plus de zones blanches.', points: ['Un seul nom de réseau', 'Pour les maisons à étage'], svc: 'network',
      car: [['Bornes', '3'], ['Réseau', 'Un seul nom de réseau'], ['Logement', 'Grande maison ou étage']], assoc: ['ups600', 'kitstd'] },
    { id: 'kit2', cat: 'securite', sr: 'cameras', vis: 'camera', ref: ['camera', 'kit2'], pose: ['camera', 'cam2'], nom: 'Kit 2 caméras Wi-Fi', desc: 'Vision de nuit, alertes et vidéo sur votre téléphone.', points: ['Vision de nuit', 'Application mobile', 'Alerte de mouvement'], svc: 'camera',
      car: [['Caméras', '2'], ['Connexion', 'Wi-Fi'], ['Vision de nuit', 'Oui'], ['Application mobile', 'Oui'], ['Alerte de mouvement', 'Oui']], assoc: ['nvr', 'kitalarme', 'ups600'] },
    { id: 'kit4', cat: 'securite', sr: 'cameras', vis: 'camera', ref: ['camera', 'kit4'], pose: ['camera', 'cam4'], nom: 'Kit 4 caméras + enregistreur', desc: 'La maison ou le commerce surveillé de tous les côtés.', points: ['Enregistrement continu', 'Vision de nuit', 'Accès à distance'], svc: 'camera',
      car: [['Caméras', '4'], ['Enregistreur', 'Inclus'], ['Vision de nuit', 'Oui'], ['Accès à distance', 'Oui'], ['Enregistrement continu', 'Oui']], assoc: ['kitalarme', 'ups600'] },
    { id: 'kit8', cat: 'securite', sr: 'cameras', vis: 'camera', ref: ['camera', 'kit8'], pose: ['camera', 'cam8'], nom: 'Kit 8 caméras + enregistreur', desc: 'Pour les grands terrains, entrepôts et commerces.', points: ['8 caméras', 'Enregistreur avec disque', 'Accès à distance'], svc: 'camera',
      car: [['Caméras', '8'], ['Enregistreur', 'Inclus, avec disque'], ['Accès à distance', 'Oui']], assoc: ['kitalarme', 'ups1500'] },
    { id: 'nvr', cat: 'securite', sr: 'enregistreurs', vis: 'nvr', ref: ['camera', 'nvr'], nom: 'Enregistreur vidéo avec disque', desc: 'Garde les images de vos caméras, même sans internet.', points: ['Disque inclus', 'Compatible caméras IP'], svc: 'camera',
      car: [['Disque', 'Inclus'], ['Compatibilité', 'Caméras IP'], ['Internet', 'Enregistre même sans internet']], assoc: ['kit2', 'kit4', 'ups600'] },
    { id: 'kitalarme', cat: 'securite', sr: 'alarmes', vis: 'alarme', ref: ['alarme', 'kitalarme'], pose: ['alarme', 'alarm'], nom: 'Kit alarme connectée', desc: 'Centrale, sirène, 2 détecteurs et badges.', points: ['Alerte sur le téléphone', 'Sirène', 'Badges pour la famille'], svc: 'alarme',
      car: [['Contenu', 'Centrale, sirène, 2 détecteurs, badges'], ['Alerte', 'Sur le téléphone'], ['Sirène', 'Oui'], ['Badges', 'Pour la famille']], assoc: ['kit2', 'kit4', 'ups600'] },
    { id: 'ups600', cat: 'energie', sr: 'onduleurs', vis: 'ups', ref: ['ups', 'ups600'], nom: 'Onduleur 600 VA', desc: 'PC, box et TV protégés des coupures et des surtensions.', points: ['Quelques minutes d’autonomie', 'Protège des surtensions'], svc: 'ups',
      car: [['Puissance', '600 VA'], ['Autonomie', 'Quelques minutes'], ['Protège', 'PC, box et TV'], ['Surtensions', 'Protégé']], assoc: ['mesh2', 'kit2', 'p1'] },
    { id: 'ups1500', cat: 'energie', sr: 'onduleurs', vis: 'ups', ref: ['ups', 'ups1500'], nom: 'Onduleur 1500 VA', desc: 'Pour un serveur, une caisse ou un poste de travail complet.', points: ['Plus d’autonomie', 'Arrêt propre des appareils'], svc: 'ups',
      car: [['Puissance', '1500 VA'], ['Autonomie', 'Plus longue'], ['Protège', 'Serveur, caisse ou poste de travail complet'], ['Arrêt', 'Propre des appareils']], assoc: ['kitcaisse', 'kit8', 'nas2'] },
    { id: 'station', cat: 'energie', sr: 'batteries', vis: 'station', nom: 'Batterie nomade (station d’énergie)', desc: 'Pour tenir pendant une coupure ou un cyclone : box, téléphone, lampe, petit frigo selon le modèle.', points: ['Prises 230 V et USB', 'Rechargeable au panneau solaire selon le modèle'], dispo: 'demande',
      car: [['Prises', '230 V et USB'], ['Recharge', 'Au panneau solaire, selon le modèle'], ['Usage', 'Coupure ou cyclone']], assoc: ['kitmini', 'ups600'] },
    { id: 'compteur', cat: 'energie', sr: 'suivi', vis: 'compteur', ref: ['energie', 'compteur'], nom: 'Compteur électrique connecté', desc: 'Voyez ce que consomment la clim et le chauffe-eau.', points: ['Suivi sur le téléphone', 'Pose par un électricien partenaire si besoin'], svc: 'energie',
      car: [['Suivi', 'Sur le téléphone'], ['Mesure', 'Consommation en temps réel'], ['Pose', 'Par un électricien partenaire si besoin']], assoc: ['kitdomo', 'ups600'] },
    { id: 'p1', cat: 'ordi', sr: 'portables', vis: 'laptop', ref: ['reconditionne', 'p1'], nom: 'PC portable bureautique reconditionné', desc: 'Pour internet, les mails, les papiers et l’école.', points: ['8 Go de mémoire, SSD', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true,
      car: [['Type', 'PC portable'], ['Mémoire', '8 Go'], ['Stockage', 'SSD'], ['État', 'Reconditionné, vérifié et nettoyé'], ['Usage', 'Internet, mails, papiers, école']], assoc: ['ups600', 'p2'] },
    { id: 'p2', cat: 'ordi', sr: 'portables', vis: 'laptop', ref: ['reconditionne', 'p2'], nom: 'PC portable performant reconditionné', desc: 'Pour le travail, plusieurs logiciels ouverts, la photo.', points: ['16 Go, SSD, i5 ou i7', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true,
      car: [['Type', 'PC portable'], ['Mémoire', '16 Go'], ['Stockage', 'SSD'], ['Processeur', 'i5 ou i7'], ['État', 'Reconditionné, vérifié et nettoyé']], assoc: ['ups600', 'nas2', 'p1'] },
    { id: 'p3', cat: 'ordi', sr: 'fixes', vis: 'pcfixe', ref: ['reconditionne', 'p3'], nom: 'PC fixe reconditionné + écran 22 pouces', desc: 'Un poste complet pour la maison ou le bureau.', points: ['Écran 22 pouces', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true,
      car: [['Type', 'PC fixe + écran'], ['Écran', '22 pouces'], ['État', 'Reconditionné, vérifié et nettoyé']], assoc: ['ups600', 'nas2'] },
    { id: 'nas2', cat: 'ordi', sr: 'stockage', vis: 'nas', ref: ['sauvegarde', 'nas2'], pose: ['sauvegarde', 'nas'], nom: 'NAS 2 baies + 2 disques de 4 To', desc: 'Vos photos et dossiers copiés en double, à la maison ou au bureau.', points: ['Copie en double (RAID 1)', 'Accès depuis le téléphone'], svc: 'sauvegarde',
      car: [['Baies', '2'], ['Disques', '2 × 4 To'], ['Copie', 'En double (RAID 1)'], ['Accès', 'Depuis le téléphone']], assoc: ['ups1500', 'p2'] },
    { id: 'kitdomo', cat: 'maison', sr: 'domotique', vis: 'box', ref: ['domotique', 'kitdomo'], nom: 'Pack maison connectée', desc: 'Une box et 4 prises connectées pour commencer.', points: ['Programmation de la clim et du chauffe-eau', 'Commande depuis le téléphone'], svc: 'domotique',
      car: [['Contenu', 'Une box et 4 prises connectées'], ['Programmation', 'Clim et chauffe-eau'], ['Commande', 'Depuis le téléphone']], assoc: ['compteur', 'support-tv'] },
    { id: 'support-tv', cat: 'maison', sr: 'tv', vis: 'tvsupport', ref: ['multimedia', 'support'], pose: ['multimedia', 'mural'], nom: 'Support mural TV', desc: 'Jusqu’à 65 pouces.', points: ['Jusqu’à 65 pouces', 'Inclinable'], svc: 'multimedia',
      car: [['Taille de TV', 'Jusqu’à 65 pouces'], ['Inclinable', 'Oui'], ['Fixation', 'Murale']], assoc: ['kitdomo'] },
    { id: 'kitcaisse', cat: 'pro', sr: 'caisse', vis: 'caisse', ref: ['pos', 'kitcaisse'], nom: 'Kit caisse enregistreuse', desc: 'Écran tactile, imprimante ticket, tiroir-caisse et lecteur.', points: ['Prêt pour la facturation électronique', 'Pose et formation possibles'], svc: 'pos',
      car: [['Contenu', 'Écran tactile, imprimante ticket, tiroir-caisse, lecteur'], ['Facturation électronique', 'Prêt'], ['Pose et formation', 'Possibles'], ['Logiciel de caisse', 'Abonnement chez l’éditeur, non inclus']], assoc: ['ups1500', 'kit4'] },
  ];

  // produits de « La sélection IloTech » : une liste choisie par l'équipe, sans chiffre de vente
  const SELECTION = ['kitstd', 'kit2', 'ups600', 'mesh2', 'p2', 'vae-ville', 'kitalarme', 'station'];

  // ce que la loi demande pour utiliser chaque engin (Code de la route, Code des assurances), montré sur la fiche
  const REGLES = {
    vae: 'Vélo au sens du Code de la route : assistance seulement quand vous pédalez, coupée à 25 km/h, moteur de 250 W au plus. Ni permis, ni immatriculation, ni assurance obligatoire (une responsabilité civile reste conseillée). Casque obligatoire pour les moins de 12 ans.',
    edpm: 'Engin de déplacement personnel motorisé : 25 km/h au plus, dès 14 ans, une seule personne, interdit sur les trottoirs. Assurance responsabilité civile obligatoire. Casque et gilet conseillés, obligatoires hors agglomération la nuit pour le gilet.',
    tt: 'Version tout-terrain, non homologuée : interdite sur la voie publique, réservée aux terrains privés avec l’accord du propriétaire et aux circuits. Assurance obligatoire, même hors route. Casque et protections fortement conseillés.',
    l1e: 'Cyclomoteur électrique (catégorie L1e, 45 km/h) : carte grise, plaque, assurance et casque homologué obligatoires ; permis AM (ancien BSR) ou permis B selon votre âge.',
  };

  // disponibilité : texte et style de la pastille
  const DISPOS = {
    stock: ['En stock à Ducos / Le Robert', 'ok'],
    commande: ['Sur commande · délai confirmé sous 24 h', 'cmd'],
    demande: ['Sur commande · prix et délai sur demande', 'dem'],
  };
  const dispoDe = p => (DISPOS[p.dispo] ? p.dispo : p.cat === 'mobilite' ? 'demande' : 'commande');

  // ---------- outils ----------
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const parId = id => PRODUITS.find(p => p.id === id);
  const catDe = id => CATS.find(c => c.id === id);
  const srNom = p => { const c = catDe(p.cat), s = c && c.sr.find(x => x[0] === p.sr); return s ? s[1] : ''; };
  const calme = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lire = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? def : v; } catch (e) { return def; } };
  const ecrire = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navigation privée : l'état vit le temps de la page */ } };
  const tab = (k) => { const v = lire(k, []); return Array.isArray(v) ? v.filter(id => parId(id)) : []; };

  // état gardé sur l'appareil : panier (clé itPanier, id → quantité), pose par article, favoris, comparateur, vus récemment
  const lirePanier = () => { const v = lire('itPanier', {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
  let panier = lirePanier();
  let poses = lire('itPose', {}); if (!poses || typeof poses !== 'object' || Array.isArray(poses)) poses = {};
  let favoris = tab('itFavoris'), comparer = tab('itComparer'), recents = tab('itRecents');
  const garder = () => { ecrire('itPanier', panier); ecrire('itPose', poses); };

  // prix : seulement ceux de data.js
  const opt = ref => { const s = ref && SERVICES.find(x => x.id === ref[0]); const o = s && s.options.find(x => x[0] === ref[1]); return s && o ? { s, o } : null; };
  const prixDe = p => { const r = opt(p.ref); return r && r.o[2] > 0 ? r.o[2] : null; };
  // pose : prix de base du service (prise en charge) + prix de l'option, comme sur un devis ; le déplacement suit la zone, en plus
  const poseDe = p => { const r = opt(p.pose); return r ? { svc: r.s.id, base: r.s.base, prix: r.o[2], libelle: r.o[1] } : null; };
  const poseTotalProduit = p => { const q = poseDe(p); return q ? q.base + q.prix : 0; };
  const refDe = p => 'IT-' + p.id.toUpperCase();

  function lignes() { return Object.entries(panier).map(([id, n]) => ({ p: parId(id), n })).filter(x => x.p && n_ok(x.n)); }
  const n_ok = n => Number.isFinite(n) && n > 0;
  function totaux() {
    const L = lignes(); let materiel = 0, surDemande = 0, nb = 0; const parSvc = {};
    L.forEach(({ p, n }) => {
      nb += n; const px = prixDe(p); if (px) materiel += px * n; else surDemande += n;
      const q = poses[p.id] && poseDe(p);
      if (q) { const g = parSvc[q.svc] || (parSvc[q.svc] = { base: q.base, somme: 0 }); g.somme += q.prix * n; }
    });
    const pose = Object.values(parSvc).reduce((t, g) => t + g.base + g.somme, 0);
    return { L, nb, materiel, pose, surDemande, total: materiel + pose };
  }

  // ---------- pictogrammes de l'interface (24 × 24, au trait) ----------
  const UI = {
    coeur: '<path d="M12 20.5s-8-4.7-8-10.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8 2.9c0 5.9-8 10.6-8 10.6z"/>',
    balance: '<path d="M12 4v16M6 20h12M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0z"/>',
    panier: '<path d="M3 4h2.5l2 11h10l2-8H7"/><circle cx="9" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    loupe: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    croix: '<path d="M6 6l12 12M18 6L6 18"/>',
    coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    camion: '<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
    cle: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    bouclier: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5L15.5 10"/>',
    main: '<path d="M3 12h4l3 3h4a2 2 0 0 0 0-4h-3l3-3h6M3 8v8h3"/>',
    partage: '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8l6.6-3.6M8.2 13.2l6.6 3.6"/>',
    filtre: '<path d="M4 5h16l-6 7.5V19l-4-2v-4.5z"/>',
    grille: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    liste: '<path d="M4 6h16M4 12h16M4 18h16"/><path d="M2 6h.01M2 12h.01M2 18h.01"/>',
    flecheD: '<path d="M9 5l7 7-7 7"/>',
    lien: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  };
  const ic = (k, cls = '') => `<svg class="b-ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${UI[k] || ''}</svg>`;

  // ---------- visuels : un dessin SVG par type de produit (vue 3/4 ou de face, dégradé de la couleur du rayon, ombre portée) ----------
  // jetons : url(#B) corps clair, url(#A) couleur du rayon, url(#K) corps sombre, {c} couleur du rayon en aplat
  const cyl = (cx, y, h, r) => `<path d="M${cx - r} ${y}v${h}a${r} ${r * .34} 0 0 0 ${2 * r} 0v${-h}z" fill="url(#B)"/><ellipse cx="${cx}" cy="${y}" rx="${r}" ry="${r * .34}" fill="#fff"/><ellipse cx="${cx}" cy="${y}" rx="${r * .5}" ry="${r * .17}" fill="url(#A)" opacity=".5"/><path d="M${cx - r} ${y + h * .6}a${r} ${r * .34} 0 0 0 ${2 * r} 0v7a${r} ${r * .34} 0 0 1 ${-2 * r} 0z" fill="url(#A)"/>`;
  const roue = (cx, cy, r, w = 5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#1f2937" stroke-width="${w}"/><circle cx="${cx}" cy="${cy}" r="${r - w}" fill="none" stroke="#c3ccd9" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${r * .22}" fill="#8e9aae"/>`;
  const cam = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k}) rotate(-8)"><path d="M40 56v14" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/><rect x="26" y="68" width="30" height="8" rx="3" fill="#1f2937"/><rect x="0" y="22" width="84" height="38" rx="12" fill="url(#B)"/><rect x="0" y="22" width="84" height="11" rx="5.5" fill="#fff" opacity=".6"/><rect x="62" y="26" width="26" height="30" rx="9" fill="#1f2937"/><circle cx="75" cy="41" r="9.5" fill="#0b1220"/><circle cx="75" cy="41" r="5" fill="url(#A)"/><circle cx="72" cy="38" r="1.8" fill="#fff"/><path d="M-3 20h56v7H-3z" fill="#cbd3e0"/></g>`;
  const velo = (extra = '') => `${roue(48, 100, 26)}${roue(150, 100, 26)}<path d="M48 100l40-38h44M96 100l-8-38M96 100l36-38M132 62l18 38M88 62l-40 38" fill="none" stroke="{c}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M104 92l20-24" stroke="#1f2937" stroke-width="9" stroke-linecap="round"/><path d="M78 56h20M126 52l6 10M122 50h16" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><circle cx="96" cy="100" r="7" fill="#1f2937"/><circle cx="48" cy="100" r="8" fill="url(#A)"/>${extra}`;
  const VIS = {
    antenne: { w: 60, d: `<rect x="72" y="127" width="56" height="7" rx="3.5" fill="#1f2937"/><path d="M93 127l3-28h8l3 28z" fill="#4b5563"/><path d="M48 44l82-16 24 50-82 16z" fill="url(#B)"/><path d="M48 44l24 50v8L48 52z" fill="#a3aec0"/><path d="M72 94l82-16v8l-82 16z" fill="#8e9aae"/><path d="M63 50l62-12 17 36-62 12z" fill="none" stroke="#cdd5e1" stroke-width="1.6"/><circle cx="102" cy="62" r="7" fill="url(#A)"/>` },
    mesh: { w: 66, d: `${cyl(70, 44, 70, 25)}${cyl(138, 62, 52, 19)}<path d="M96 24a16 16 0 0 1 24 0M89 16a26 26 0 0 1 38 0" stroke="{c}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="108" cy="32" r="3.2" fill="{c}"/>` },
    camera: { w: 66, d: `${cam(22, 30, .8)}${cam(70, 60, 1.05)}` },
    nvr: { w: 72, d: `<path d="M30 70l30-16h120l-30 16z" fill="#e9edf4"/><rect x="30" y="70" width="120" height="40" rx="3" fill="url(#B)"/><path d="M150 70l30-16v40l-30 16z" fill="#8e9aae"/><rect x="40" y="80" width="68" height="7" rx="3.5" fill="#1f2937"/><rect x="40" y="93" width="48" height="4" rx="2" fill="#c3ccd9"/><circle cx="126" cy="85" r="3.4" fill="{c}"/><circle cx="137" cy="85" r="3.4" fill="#22c55e"/><rect x="40" y="110" width="14" height="5" rx="2" fill="#4b5563"/><rect x="126" y="110" width="14" height="5" rx="2" fill="#4b5563"/>` },
    nas: { w: 52, d: `<path d="M62 30l16-10h56l-16 10z" fill="#e9edf4"/><rect x="62" y="30" width="56" height="92" rx="5" fill="url(#B)"/><path d="M118 30l16-10v92l-16 10z" fill="#8e9aae"/><rect x="70" y="40" width="40" height="26" rx="3" fill="#1f2937"/><rect x="70" y="72" width="40" height="26" rx="3" fill="#1f2937"/><rect x="74" y="55" width="14" height="3" rx="1.5" fill="{c}"/><rect x="74" y="87" width="14" height="3" rx="1.5" fill="{c}"/><circle cx="98" cy="109" r="3.2" fill="#22c55e"/><circle cx="108" cy="109" r="3.2" fill="{c}"/>` },
    alarme: { w: 62, d: `<rect x="46" y="30" width="66" height="96" rx="11" fill="url(#B)"/><path d="M112 40l12-6v86l-12 6z" fill="#8e9aae"/><rect x="56" y="40" width="46" height="22" rx="4" fill="#1f2937"/><circle cx="79" cy="51" r="5" fill="url(#A)"/><g fill="#c3ccd9"><circle cx="62" cy="78" r="4.4"/><circle cx="79" cy="78" r="4.4"/><circle cx="96" cy="78" r="4.4"/><circle cx="62" cy="94" r="4.4"/><circle cx="79" cy="94" r="4.4"/><circle cx="96" cy="94" r="4.4"/></g><rect x="62" y="107" width="34" height="7" rx="3.5" fill="url(#A)"/><rect x="134" y="84" width="38" height="42" rx="7" fill="url(#B)"/><circle cx="153" cy="101" r="9" fill="#fff" stroke="#c3ccd9" stroke-width="2"/><circle cx="153" cy="101" r="3.4" fill="{c}"/><path d="M146 76l7-8 7 8" stroke="{c}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
    ups: { w: 54, d: `<path d="M54 36l22-10h72l-22 10z" fill="#5b6575"/><rect x="54" y="36" width="72" height="92" rx="7" fill="url(#K)"/><path d="M126 36l22-10v92l-22 10z" fill="#0b1220"/><rect x="64" y="46" width="52" height="20" rx="3" fill="#0b1220"/><rect x="69" y="51" width="26" height="4" rx="2" fill="{c}"/><rect x="69" y="58" width="16" height="3" rx="1.5" fill="#22c55e"/><circle cx="106" cy="86" r="7" fill="url(#A)"/><g stroke="#2a3342" stroke-width="2.5" stroke-linecap="round"><path d="M64 98h40M64 106h40M64 114h40"/></g>` },
    station: { w: 68, d: `<path d="M64 46V34a8 8 0 0 1 8-8h56a8 8 0 0 1 8 8v12" fill="none" stroke="#1f2937" stroke-width="7" stroke-linecap="round"/><rect x="34" y="44" width="132" height="82" rx="14" fill="url(#B)"/><path d="M34 84h132v28a14 14 0 0 1-14 14H48a14 14 0 0 1-14-14z" fill="url(#A)"/><rect x="46" y="54" width="46" height="20" rx="4" fill="#1f2937"/><rect x="51" y="60" width="26" height="7" rx="2" fill="#22c55e"/><circle cx="62" cy="104" r="7.5" fill="#0b1220"/><circle cx="88" cy="104" r="7.5" fill="#0b1220"/><rect x="112" y="98" width="14" height="8" rx="2.5" fill="#0b1220"/><rect x="132" y="98" width="14" height="8" rx="2.5" fill="#0b1220"/><path d="M132 54l-9 13h9l-7 12" stroke="{c}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
    compteur: { w: 52, d: `<rect x="54" y="22" width="92" height="106" rx="11" fill="url(#B)"/><rect x="62" y="30" width="76" height="90" rx="7" fill="#e9edf4"/><circle cx="100" cy="66" r="27" fill="#1f2937"/><circle cx="100" cy="66" r="21" fill="#0b1220"/><path d="M104 48l-10 20h9l-6 16" stroke="{c}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="78" y="100" width="44" height="10" rx="3" fill="#1f2937"/><circle cx="84" cy="105" r="2" fill="#22c55e"/><circle cx="92" cy="105" r="2" fill="{c}"/>` },
    laptop: { w: 72, d: `<path d="M56 26h88l8 66H48z" fill="url(#B)"/><path d="M61 31h78l6.5 56H54.5z" fill="#0b1220"/><path d="M61 31h78l6.5 56H54.5z" fill="url(#A)" opacity=".85"/><path d="M61 31h46L86 87H54.5z" fill="#fff" opacity=".16"/><circle cx="100" cy="59" r="9" fill="#fff" opacity=".55"/><path d="M48 92h104l24 26H24z" fill="#e9edf4"/><path d="M24 118h152v3a5 5 0 0 1-5 5H29a5 5 0 0 1-5-5z" fill="#8e9aae"/><g stroke="#b7c0cf" stroke-width="2.2" stroke-linecap="round"><path d="M62 99h76M56 105h88"/></g><path d="M88 111h24l2 4H86z" fill="#c3ccd9"/>` },
    pcfixe: { w: 74, d: `<rect x="20" y="22" width="112" height="70" rx="6" fill="#1f2937"/><rect x="25" y="27" width="102" height="58" rx="2" fill="url(#A)"/><path d="M25 27h62L58 85H25z" fill="#fff" opacity=".18"/><path d="M69 92h14l3 20H66z" fill="#c3ccd9"/><rect x="52" y="112" width="48" height="6" rx="3" fill="#a3aec0"/><rect x="142" y="38" width="42" height="84" rx="6" fill="url(#B)"/><path d="M184 44l4-3v80l-4 3z" fill="#8e9aae"/><rect x="150" y="48" width="26" height="5" rx="2" fill="#1f2937"/><rect x="150" y="59" width="26" height="3" rx="1.5" fill="#b7c0cf"/><circle cx="163" cy="103" r="6" fill="url(#A)"/>` },
    velo: { w: 78, d: velo() },
    cargo: { w: 82, d: velo(`<rect x="12" y="62" width="52" height="26" rx="4" fill="url(#A)"/><rect x="12" y="62" width="52" height="7" rx="3" fill="#fff" opacity=".35"/>`) },
    trottinette: { w: 72, d: `<path d="M30 110a16 16 0 0 1 32 0z" fill="url(#A)"/><rect x="40" y="104" width="112" height="10" rx="5" fill="#1f2937"/><rect x="48" y="104" width="60" height="3" rx="1.5" fill="url(#A)"/><path d="M150 108L136 38" stroke="#b7c0cf" stroke-width="7" stroke-linecap="round"/><path d="M150 108l6 8" stroke="#8e9aae" stroke-width="6" stroke-linecap="round"/><rect x="118" y="28" width="36" height="8" rx="4" fill="#1f2937"/><rect x="128" y="20" width="16" height="9" rx="3" fill="url(#A)"/>${roue(46, 116, 13, 6)}${roue(158, 114, 15, 6)}<circle cx="138" cy="52" r="4" fill="{c}"/>` },
    moto: { w: 80, d: `${roue(46, 104, 25, 7)}${roue(154, 104, 25, 7)}<path d="M46 104L90 96" stroke="#8e9aae" stroke-width="7" stroke-linecap="round"/><path d="M154 104L136 54" stroke="#b7c0cf" stroke-width="8" stroke-linecap="round"/><path d="M66 70l52-8 12 30-34 14-38-8z" fill="url(#A)"/><path d="M66 70l52-8 3 8-52 8z" fill="#fff" opacity=".28"/><path d="M50 62h46l-5 8H46z" fill="#1f2937"/><path d="M126 50h18" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><path d="M138 70a28 28 0 0 1 28 12" stroke="{c}" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="92" cy="94" r="9" fill="#1f2937"/><circle cx="92" cy="94" r="3.4" fill="#c3ccd9"/>` },
    scooter: { w: 78, d: `<path d="M26 94c0-17 12-30 32-30h30l-5 30z" fill="url(#A)"/><path d="M34 62h58l-4 8H32z" fill="#1f2937"/><rect x="84" y="100" width="52" height="9" rx="4" fill="#8e9aae"/><path d="M128 104l12-62h12l-4 66z" fill="url(#A)"/><path d="M132 40h26" stroke="#1f2937" stroke-width="5" stroke-linecap="round"/><circle cx="154" cy="52" r="6.5" fill="#fde68a"/>${roue(56, 112, 16, 7)}${roue(150, 112, 16, 7)}<path d="M62 92c6-8 18-8 26 0" stroke="#fff" stroke-width="4" opacity=".35" fill="none" stroke-linecap="round"/>` },
    casque: { w: 62, d: `<path d="M38 94C38 50 68 28 106 28s58 24 58 56v20a9 9 0 0 1-9 9H47a9 9 0 0 1-9-9z" fill="url(#A)"/><path d="M96 62h68v28H112c-9 0-16-9-16-28z" fill="#0b1220" opacity=".92"/><path d="M110 68h36" stroke="#fff" stroke-width="3" opacity=".4" stroke-linecap="round"/><path d="M50 64c20-24 62-28 88-12" stroke="#fff" stroke-width="6" fill="none" opacity=".5" stroke-linecap="round"/><path d="M60 112h60" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/><g stroke="#fff" stroke-width="2.4" opacity=".6" stroke-linecap="round"><path d="M72 48l10-4M84 44l10-3"/></g>` },
    cable: { w: 64, d: `<path d="M40 100C18 62 76 24 118 48s64 56 14 66-72-24-48-44" fill="none" stroke="#1f2937" stroke-width="9" stroke-linecap="round"/><path d="M40 100C18 62 76 24 118 48" fill="none" stroke="#fff" stroke-width="2" opacity=".25" stroke-linecap="round"/><rect x="26" y="98" width="28" height="18" rx="4" fill="url(#B)" transform="rotate(-24 40 107)"/><rect x="22" y="104" width="10" height="7" rx="2" fill="{c}" transform="rotate(-24 40 107)"/><rect x="136" y="100" width="28" height="18" rx="4" fill="url(#B)" transform="rotate(14 150 109)"/><rect x="162" y="104" width="10" height="7" rx="2" fill="{c}" transform="rotate(14 150 109)"/>` },
    mat: { w: 46, d: `<ellipse cx="102" cy="124" rx="36" ry="9" fill="#a3aec0"/><ellipse cx="102" cy="121" rx="36" ry="9" fill="url(#B)"/><g fill="#8e9aae"><circle cx="80" cy="122" r="2.2"/><circle cx="124" cy="122" r="2.2"/></g><rect x="94" y="20" width="16" height="102" rx="4" fill="url(#B)"/><rect x="94" y="20" width="5" height="102" rx="2.5" fill="#fff" opacity=".6"/><rect x="91" y="38" width="22" height="9" rx="2.5" fill="url(#A)"/><rect x="91" y="72" width="22" height="9" rx="2.5" fill="url(#A)"/><path d="M110 112l24-26" stroke="#8e9aae" stroke-width="5" stroke-linecap="round"/><ellipse cx="102" cy="20" rx="8" ry="3" fill="#fff"/>` },
    caisse: { w: 72, d: `<path d="M34 100l16-12h118l-16 12z" fill="#e9edf4"/><rect x="34" y="100" width="116" height="26" rx="3" fill="url(#B)"/><path d="M150 100l16-12v26l-16 12z" fill="#8e9aae"/><rect x="78" y="110" width="30" height="5" rx="2.5" fill="#1f2937"/><rect x="60" y="24" width="68" height="52" rx="6" fill="#1f2937"/><rect x="65" y="29" width="58" height="40" rx="2" fill="url(#A)"/><path d="M65 29h34L84 69H65z" fill="#fff" opacity=".2"/><path d="M88 76h12l4 12H84z" fill="#c3ccd9"/><rect x="138" y="70" width="34" height="16" rx="3" fill="url(#B)"/><rect x="146" y="52" width="18" height="22" rx="1.5" fill="#fff" stroke="#c3ccd9"/><path d="M149 58h12M149 63h12M149 68h8" stroke="#a3aec0" stroke-width="1.6"/>` },
    box: { w: 70, d: `<path d="M34 62l12-14h64l-8 14z" fill="#e9edf4"/><rect x="34" y="62" width="76" height="52" rx="9" fill="url(#B)"/><rect x="46" y="80" width="38" height="6" rx="3" fill="url(#A)"/><circle cx="98" cy="83" r="4.2" fill="#22c55e"/><path d="M52 96h46" stroke="#c3ccd9" stroke-width="3" stroke-linecap="round"/><rect x="128" y="64" width="40" height="52" rx="10" fill="url(#B)"/><rect x="141" y="54" width="5" height="12" rx="1.5" fill="#8e9aae"/><rect x="151" y="54" width="5" height="12" rx="1.5" fill="#8e9aae"/><circle cx="148" cy="92" r="11" fill="none" stroke="{c}" stroke-width="4"/><path d="M148 83v8" stroke="{c}" stroke-width="4" stroke-linecap="round"/><path d="M110 92h18" stroke="#8e9aae" stroke-width="3" stroke-dasharray="3 4"/>` },
    tvsupport: { w: 62, d: `<rect x="34" y="22" width="132" height="76" rx="5" fill="#1f2937"/><rect x="39" y="27" width="122" height="66" rx="2" fill="url(#A)" opacity=".85"/><path d="M39 27h72L84 93H39z" fill="#fff" opacity=".16"/><rect x="62" y="104" width="76" height="8" rx="3" fill="url(#B)" stroke="#a3aec0"/><path d="M82 112v10M118 112v10" stroke="#a3aec0" stroke-width="6" stroke-linecap="round"/><rect x="70" y="120" width="60" height="7" rx="3" fill="url(#B)" stroke="#a3aec0"/><circle cx="74" cy="108" r="2" fill="{c}"/><circle cx="126" cy="108" r="2" fill="{c}"/>` },
  };
  const melange = (h, t) => { const n = parseInt(h.slice(1), 16), f = s => Math.round(((n >> s) & 255) * (1 - t) + 255 * t); return '#' + [16, 8, 0].map(s => f(s).toString(16).padStart(2, '0')).join(''); };
  let uid = 0;
  // photo (facultative) : remplace l'illustration quand le propriétaire fournit une vraie photo
  function visuel(p, c) {
    if (p.photo) return `<img class="b-photo" src="${esc(p.photo)}" alt="${esc(p.nom)}" loading="lazy" decoding="async">`;
    const k = ++uid, v = VIS[p.vis] || VIS.box;
    const corps = v.d.replaceAll('url(#B)', `url(#B${k})`).replaceAll('url(#A)', `url(#A${k})`).replaceAll('url(#K)', `url(#K${k})`).replaceAll('{c}', c);
    return `<svg class="b-svg" viewBox="0 0 200 150" aria-hidden="true" focusable="false"><defs>
      <linearGradient id="B${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c3ccdb"/></linearGradient>
      <linearGradient id="A${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${melange(c, .35)}"/><stop offset="1" stop-color="${c}"/></linearGradient>
      <linearGradient id="K${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>
      <ellipse cx="100" cy="134" rx="${v.w || 62}" ry="6.5" fill="#0b1220" opacity=".24"/>${corps}</svg>`;
  }
  const blocVis = (p, grand) => `<div class="b-vis${grand ? ' b-vis-g' : ''}">${visuel(p, catDe(p.cat).c)}${p.photo ? '' : '<span class="b-illu">Illustration</span>'}</div>`;

  // ---------- recherche ----------
  PRODUITS.forEach(p => { p.index = norm([p.nom, p.desc, ...p.points, catDe(p.cat).nom, srNom(p), ...p.car.map(x => x.join(' '))].join(' ')); });
  const mots = q => norm(q).split(/\s+/).filter(Boolean);
  function chercher(q) {
    const m = mots(q); if (!m.length) return [];
    return PRODUITS.map((p, i) => ({ p, i, s: m.every(x => p.index.includes(x)) ? m.reduce((t, x) => t + (norm(p.nom).includes(x) ? 3 : 0) + (norm(p.nom).startsWith(x) ? 1 : 0), 1) : 0 }))
      .filter(x => x.s).sort((a, b) => b.s - a.s || a.i - b.i).map(x => x.p);
  }
  const rayonsCorrespondants = q => { const m = mots(q); return m.length ? CATS.filter(c => m.every(x => norm(c.nom + ' ' + c.sr.map(s => s[1]).join(' ')).includes(x))) : []; };

  // ---------- pièces d'interface ----------
  const prixHtml = (p, grand) => { const px = prixDe(p); return px ? `<div class="b-prix${grand ? ' b-prix-g' : ''}"><strong>${eur(px)}</strong><small>prix indicatif TTC</small></div>` : `<div class="b-prix${grand ? ' b-prix-g' : ''}"><strong class="b-sd">Prix sur demande</strong><small>selon la marque et le modèle</small></div>`; };
  const dispoHtml = p => { const d = DISPOS[dispoDe(p)]; return `<span class="b-dispo b-d-${d[1]}">${esc(d[0])}</span>`; };
  const coeurBtn = p => { const f = favoris.includes(p.id); return `<button type="button" class="b-coeur" data-fav="${p.id}" aria-pressed="${f}" aria-label="${f ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${esc(p.nom)}">${ic('coeur')}</button>`; };
  const cmpCase = p => `<label class="b-cmp"><input type="checkbox" data-cmp="${p.id}"${comparer.includes(p.id) ? ' checked' : ''}><span>Comparer</span><span class="sr-only"> : ${esc(p.nom)}</span></label>`;

  function carte(p) {
    const c = catDe(p.cat), n = panier[p.id] || 0;
    return `<article class="b-carte" id="p-${p.id}" style="--bc:${c.c}">
      <a class="b-carte-vis" href="#/produit/${p.id}" tabindex="-1" aria-hidden="true">${blocVis(p)}</a>${coeurBtn(p)}
      <div class="b-corps">
        <p class="b-sr">${esc(srNom(p))}${p.recond ? ' · <b>Reconditionné</b>' : ''}</p>
        <h3><a href="#/produit/${p.id}">${esc(p.nom)}</a></h3>
        <ul class="b-car">${p.car.slice(0, 3).map(([k, v]) => `<li><span>${esc(k)}</span>${esc(v)}</li>`).join('')}</ul>
        <div class="b-bas">${prixHtml(p)}${dispoHtml(p)}
          <div class="b-act"><button type="button" class="btn btn-primary b-ajout" data-add="${p.id}" aria-label="Ajouter au panier : ${esc(p.nom)}">Ajouter</button>${cmpCase(p)}</div>
          ${n ? `<p class="b-dans">${ic('coche')} ${n} au panier</p>` : ''}</div>
      </div></article>`;
  }

  // ---------- routes ----------
  const main = () => $('#bMain');
  const titreSite = ' | Boutique IloTech';
  const FIL = (liens) => `<nav class="b-fil" aria-label="Fil d’Ariane"><ol>${liens.map(([t, h], i) => `<li>${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}</li>`).join('')}</ol></nav>`;
  let L = { cle: '', tri: 'pert', vue: lire('itVue', 'grille') === 'liste' ? 'liste' : 'grille', sr: new Set(), min: '', max: '', dispo: new Set(), car: {} };
  let contexte = null;

  function aller(h) { if (location.hash === h) route(); else location.hash = h; }

  function route(premiere) {
    let h = location.hash.slice(1);
    if (h && !h.startsWith('/')) { // ancien lien : boutique.html#mobilite
      h = catDe(h) ? '/rayon/' + h : '/'; history.replaceState(null, '', '#' + h);
    }
    const [chemin, qs] = h.split('?'); const seg = chemin.split('/').filter(Boolean).map(decodeURIComponent); const q = new URLSearchParams(qs || '');
    fermerTout();
    let titre = 'Boutique IloTech : matériel informatique, Starlink, caméras, mobilité électrique | Martinique', html;
    if (seg[0] === 'rayon' && catDe(seg[1])) { const c = catDe(seg[1]); [html, titre] = [pageListe({ type: 'rayon', cat: c, sr: q.get('sr') }), c.nom + titreSite]; }
    else if (seg[0] === 'recherche') { const t = (q.get('q') || '').trim(); [html, titre] = [pageListe({ type: 'recherche', q: t }), 'Recherche : ' + (t || 'tous les produits') + titreSite]; }
    else if (seg[0] === 'produit' && parId(seg[1])) { const p = parId(seg[1]); [html, titre] = [pageProduit(p), p.nom + titreSite]; }
    else if (seg[0] === 'comparer') [html, titre] = [pageComparer(), 'Comparateur' + titreSite];
    else if (seg[0] === 'panier') [html, titre] = [pagePanier(), 'Panier' + titreSite];
    else if (seg[0] === 'favoris') [html, titre] = [pageFavoris(), 'Favoris' + titreSite];
    else if (!seg.length) html = pageAccueil();
    else html = pageIntrouvable();
    main().innerHTML = html; document.title = titre; majEntete();
    const apres = $('#bMain [data-liste]'); if (apres) majResultats();
    if (!premiere) { scrollTo({ top: 0, behavior: 'auto' }); const t = $('#bMain h1'); if (t) { t.tabIndex = -1; t.focus({ preventScroll: true }); } }
  }

  const pageIntrouvable = () => `<div class="b-vide"><h1>Page introuvable</h1><p>Ce produit ou ce rayon n’existe pas (ou plus).</p><a class="btn btn-primary" href="#/">Retour à la boutique</a></div>`;

  // ----- accueil -----
  function pageAccueil() {
    const vus = recents.map(parId).filter(Boolean).slice(0, 6);
    const mobi = PRODUITS.filter(p => p.cat === 'mobilite');
    return `<section class="b-hero" aria-labelledby="bTitre"><div><p class="b-sur">Boutique IloTech · Martinique</p>
        <h1 id="bTitre">Le bon matériel, <em>choisi pour la Martinique</em>.</h1>
        <p class="b-chapo">Vélos, trottinettes et motos électriques sur commande, et le matériel que nos techniciens installent chaque jour, choisi pour la chaleur, l’humidité et l’air salin.</p></div></section>
      <ul class="b-avantages" aria-label="Nos engagements">
        <li>${ic('main')}<span><b>Retrait gratuit</b>à Ducos ou au Robert</span></li>
        <li>${ic('cle')}<span><b>Pose par nos techniciens</b>quand une pose existe pour le matériel</span></li>
        <li>${ic('bouclier')}<span><b>Garantie légale 2 ans</b>sur le neuf</span></li>
        <li>${ic('camion')}<span><b>Paiement à la remise</b>rien n’est payé en ligne</span></li></ul>
      <section class="b-bloc" aria-labelledby="bRay"><h2 id="bRay">Les rayons</h2>
        <div class="b-tuiles">${CATS.map(c => { const prods = PRODUITS.filter(p => p.cat === c.id); return `<a class="b-tuile" href="#/rayon/${c.id}" style="--bc:${c.c}">${blocVis({ vis: c.vis, cat: c.id, nom: c.nom })}<span class="b-tuile-t"><b>${esc(c.nom)}</b><small>${prods.length} produit${prods.length > 1 ? 's' : ''}</small></span></a>`; }).join('')}</div></section>
      <section class="b-bloc" aria-labelledby="bSel"><h2 id="bSel">La sélection IloTech</h2><p class="b-sous">Une liste choisie par nos techniciens pour la Martinique.</p>
        <div class="b-grille b-grille-acc">${SELECTION.map(parId).filter(Boolean).map(carte).join('')}</div></section>
      <section class="b-mobi" aria-labelledby="bMob" style="--bc:#16a34a"><div class="b-mobi-txt"><p class="b-sur">Sur commande</p><h2 id="bMob">Mobilité électrique</h2>
          <p>Vélos à assistance, trottinettes, motos légères type Sur-Ron ou Talaria, scooters : marque et modèle au choix, prix et délai sur demande. Nous vous indiquons la catégorie exacte et ce que dit la loi avant la commande.</p>
          <a class="btn btn-primary" href="#/rayon/mobilite">Voir la mobilité électrique</a></div>
        <div class="b-mobi-vis">${['vae-ville', 'trottinette', 'moto-tt', 'scooter'].map(parId).map(p => `<a href="#/produit/${p.id}" aria-label="${esc(p.nom)}">${blocVis(p)}</a>`).join('')}</div></section>
      ${vus.length ? `<section class="b-bloc" aria-labelledby="bVus"><h2 id="bVus">Vus récemment</h2><p class="b-sous">Gardés sur cet appareil seulement.</p><div class="b-grille b-grille-acc">${vus.map(carte).join('')}</div></section>` : ''}
      <section class="b-bloc b-infos" aria-labelledby="bInfosT"><h2 id="bInfosT">Comment ça marche</h2><ol class="b-etapes">
        <li><b>Vous choisissez</b><span>Ajoutez les articles au panier, ou demandez un modèle précis.</span></li>
        <li><b>Nous confirmons</b><span>Prix du jour, disponibilité et délai, par WhatsApp ou email, sous 24 h ouvrées.</span></li>
        <li><b>Vous récupérez</b><span>Retrait à Ducos ou au Robert, livraison, ou pose par un technicien.</span></li>
        <li><b>Vous payez à la remise</b><span>Rien n’est payé en ligne. Les moyens de paiement vous sont indiqués à la confirmation.</span></li></ol></section>
      ${NOTE}`;
  }
  const NOTE = '<p class="b-note">Prix indicatifs TTC, les mêmes que sur nos devis : le prix du jour vous est confirmé avant toute commande. Mobilité électrique et articles marqués « sur commande » : prix et délai sur demande. Les illustrations ne sont pas des photos du produit livré.</p>';

  // ----- liste -----
  function portee() {
    const c = contexte; if (!c) return [];
    return c.type === 'rayon' ? PRODUITS.filter(p => p.cat === c.cat.id) : chercher(c.q);
  }
  function facettes(base) {
    const m = new Map();
    base.forEach(p => p.car.forEach(([k, v]) => { const g = m.get(k) || m.set(k, { k, n: 0, vals: new Map() }).get(k); g.n++; g.vals.set(v, (g.vals.get(v) || 0) + 1); }));
    return [...m.values()].filter(g => g.n >= 2 && (g.vals.size >= 2 || g.n < base.length)).sort((a, b) => b.n - a.n).slice(0, 5)
      .map(g => ({ k: g.k, vals: [...g.vals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]) }));
  }
  function appliquer(base) {
    let l = base.filter(p => {
      if (L.sr.size && !L.sr.has(p.sr)) return false;
      const px = prixDe(p), mn = parseFloat(L.min), mx = parseFloat(L.max);
      if ((Number.isFinite(mn) || Number.isFinite(mx)) && (px == null || (Number.isFinite(mn) && px < mn) || (Number.isFinite(mx) && px > mx))) return false;
      if (L.dispo.size && !L.dispo.has(dispoDe(p))) return false;
      return Object.entries(L.car).every(([k, set]) => !set.size || p.car.some(([kk, v]) => kk === k && set.has(v)));
    });
    if (L.tri === 'asc' || L.tri === 'desc') { const f = L.tri === 'asc' ? 1 : -1; l = [...l].sort((a, b) => { const x = prixDe(a), y = prixDe(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (x - y) * f; }); }
    else if (L.tri === 'nom') l = [...l].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    return l;
  }
  const nbFiltres = () => L.sr.size + (L.min !== '' ? 1 : 0) + (L.max !== '' ? 1 : 0) + L.dispo.size + Object.values(L.car).reduce((t, s) => t + s.size, 0);

  function pageListe(c) {
    contexte = c;
    const cle = c.type === 'rayon' ? 'r:' + c.cat.id : 's:' + c.q;
    if (L.cle !== cle) { L = { cle, tri: 'pert', vue: L.vue, sr: new Set(), min: '', max: '', dispo: new Set(), car: {} }; if (c.sr) L.sr.add(c.sr); }
    else if (c.sr && !L.sr.has(c.sr)) { L.sr = new Set([c.sr]); }
    const base = portee(), couleur = c.type === 'rayon' ? c.cat.c : '#2b8cff';
    const titre = c.type === 'rayon' ? c.cat.nom : c.q ? `Recherche : « ${c.q} »` : 'Tous les produits';
    const fil = c.type === 'rayon' ? [['Boutique', '#/'], [c.cat.nom]] : [['Boutique', '#/'], ['Recherche']];
    const sousRayons = c.type === 'rayon' ? c.cat.sr.filter(s => base.some(p => p.sr === s[0])) : [...new Set(base.map(p => p.cat))].map(id => [id, catDe(id).nom]);
    const fac = facettes(base), dispos = [...new Set(base.map(dispoDe))];
    const groupe = (t, inner) => `<fieldset class="b-fg"><legend>${esc(t)}</legend>${inner}</fieldset>`;
    const cases = (nom, val, texte, coche) => `<label class="b-fcase"><input type="checkbox" data-f="${nom}" value="${esc(val)}"${coche ? ' checked' : ''}><span>${esc(texte)}</span></label>`;
    const rayonsLiens = c.type === 'recherche' && rayonsCorrespondants(c.q).length ? `<p class="b-rayons-trouves">Rayons : ${rayonsCorrespondants(c.q).map(r => `<a href="#/rayon/${r.id}">${esc(r.nom)}</a>`).join(', ')}</p>` : '';
    return `<div data-liste style="--bc:${couleur}">${FIL(fil)}
      <div class="b-liste-tete"><h1>${esc(titre)}</h1><p class="b-nb" id="bNb" aria-live="polite"></p></div>${rayonsLiens}
      <div class="b-outils-liste">
        <button type="button" class="btn b-filtrer" data-filtres="ouvrir" aria-controls="bFiltres" aria-expanded="false">${ic('filtre')}<span id="bFiltrerT">Filtrer</span></button>
        <label class="b-tri"><span>Trier par</span><select id="bTri" data-tri>${[['pert', 'Pertinence'], ['asc', 'Prix croissant'], ['desc', 'Prix décroissant'], ['nom', 'Nom']].map(([v, t]) => `<option value="${v}"${L.tri === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <div class="b-vues" role="group" aria-label="Affichage"><button type="button" data-vue="grille" aria-pressed="${L.vue === 'grille'}" aria-label="Affichage en grille">${ic('grille')}</button><button type="button" data-vue="liste" aria-pressed="${L.vue === 'liste'}" aria-label="Affichage en liste">${ic('liste')}</button></div></div>
      <div class="b-corpsliste">
        <div class="b-voile" data-filtres="fermer"></div>
        <aside class="b-filtres" id="bFiltres" aria-label="Filtres" tabindex="-1">
          <div class="b-filtres-tete"><h2>Filtres</h2><button type="button" class="b-x" data-filtres="fermer" aria-label="Fermer les filtres">${ic('croix')}</button></div>
          ${sousRayons.length > 1 ? groupe(c.type === 'rayon' ? 'Sous-rayons' : 'Rayons', sousRayons.map(([id, nom]) => cases(c.type === 'rayon' ? 'sr' : 'sr-cat', id, nom, c.type === 'rayon' && L.sr.has(id))).join('')) : ''}
          ${groupe('Prix (€)', `<div class="b-prixf"><label>Minimum<input type="number" inputmode="decimal" min="0" step="1" data-prix="min" value="${esc(L.min)}" placeholder="0"></label><label>Maximum<input type="number" inputmode="decimal" min="0" step="1" data-prix="max" value="${esc(L.max)}" placeholder="Sans limite"></label></div><p class="b-aide">Les articles « prix sur demande » sont masqués quand un prix est choisi.</p>`)}
          ${dispos.length ? groupe('Disponibilité', dispos.map(d => cases('dispo', d, DISPOS[d][0], L.dispo.has(d))).join('')) : ''}
          ${fac.map(g => groupe(g.k, g.vals.map(v => cases('car:' + g.k, v, v, (L.car[g.k] || new Set()).has(v))).join(''))).join('')}
          <div class="b-filtres-pied"><button type="button" class="btn" data-f-raz>Tout effacer</button><button type="button" class="btn btn-primary" data-filtres="fermer" id="bVoirRes">Voir les résultats</button></div>
        </aside>
        <div class="b-res"><div id="bRes" class="b-grille b-vue-${L.vue}" aria-live="polite"></div></div></div>
      ${c.type === 'rayon' && c.cat.id === 'mobilite' ? `<section class="b-loi" aria-labelledby="bLoi"><h2 id="bLoi">Mobilité électrique : ce que dit la loi</h2><ul>${Object.entries(REGLES).map(([k, t]) => `<li>${esc(t)}</li>`).join('')}</ul><p>Nous vous indiquons la catégorie exacte de chaque modèle avant la commande.</p></section>` : ''}
      ${NOTE}</div>`;
  }

  function majResultats() {
    const res = $('#bRes'); if (!res) return;
    const base = portee(), l = appliquer(base), c = contexte;
    $('#bNb').textContent = l.length + (l.length > 1 ? ' produits' : ' produit');
    res.className = 'b-grille b-vue-' + L.vue;
    res.innerHTML = l.length ? l.map(carte).join('') : `<div class="b-vide"><p><b>${base.length ? 'Aucun produit ne correspond à ces filtres.' : `Aucun article ne correspond à « ${esc(c.q || '')} ».`}</b></p>
      <p>${base.length ? 'Essayez d’élargir le prix ou de retirer un filtre.' : 'Demandez-nous : nous trouvons souvent le matériel sur commande.'}</p>
      ${base.length ? '<button type="button" class="btn btn-primary" data-f-raz>Effacer les filtres</button>' : `<a class="btn btn-primary" href="${waUrl(CONFIG.whatsapp || AGENCES.ducos.tel, 'Bonjour IloTech, je cherche : ' + (c.q || ''))}" target="_blank" rel="noopener">Demander sur WhatsApp</a>`}</div>`;
    const n = nbFiltres(); $('#bFiltrerT').textContent = 'Filtrer' + (n ? ' (' + n + ')' : '');
    $('#bVoirRes').textContent = 'Voir ' + l.length + (l.length > 1 ? ' produits' : ' produit');
  }

  // ----- fiche produit -----
  function pageProduit(p) {
    recents = [p.id, ...recents.filter(id => id !== p.id)].slice(0, 8); ecrire('itRecents', recents);
    const c = catDe(p.cat), pose = poseDe(p), px = prixDe(p), lien = (CONFIG.siteUrl || '') + 'boutique.html#/produit/' + p.id;
    const assoc = [...new Set([...(p.assoc || []), ...PRODUITS.filter(x => x.cat === p.cat).map(x => x.id)])].filter(id => id !== p.id).map(parId).filter(Boolean).slice(0, 4);
    const garantie = p.recond ? 'Garantie légale de conformité d’au moins 1 an sur le reconditionné, en plus de la garantie du fabricant ou du reconditionneur.' : 'Garantie légale de conformité de 2 ans sur le neuf (articles L.217-3 et suivants du Code de la consommation), en plus de la garantie du fabricant.';
    return `<div style="--bc:${c.c}">${FIL([['Boutique', '#/'], [c.nom, '#/rayon/' + c.id], [srNom(p), '#/rayon/' + c.id + '?sr=' + p.sr], [p.nom]])}
      <article class="b-fiche" aria-labelledby="bFicheT">
        <div class="b-fiche-vis">${blocVis(p, true)}</div>
        <div class="b-fiche-info">
          <p class="b-ref">Référence <span class="mono">${refDe(p)}</span></p>
          <h1 id="bFicheT">${esc(p.nom)}</h1><p class="b-accroche">${esc(p.desc)}</p>
          ${prixHtml(p, true)}${dispoHtml(p)}
          <div class="b-achat">
            <div class="b-qte" role="group" aria-label="Quantité"><button type="button" data-qm aria-label="Diminuer la quantité">−</button><input id="bQte" type="number" inputmode="numeric" min="1" max="20" value="1" aria-label="Quantité"><button type="button" data-qp aria-label="Augmenter la quantité">+</button></div>
            <button type="button" class="btn btn-primary b-ajout-g" data-add="${p.id}" data-qte>Ajouter au panier</button>
          </div>
          <div class="b-achat2">${coeurBtn(p).replace('class="b-coeur"', 'class="b-coeur b-coeur-f"')}${cmpCase(p)}</div>
          ${pose ? `<label class="b-posebox"><input type="checkbox" data-pose="${p.id}"${poses[p.id] ? ' checked' : ''}><span><b>Pose par un technicien IloTech (+${eur(poseTotalProduit(p))})</b><small>${esc(pose.libelle)}, prise en charge comprise · déplacement selon votre commune (offert dans les communes de nos agences) · prix confirmé avant la commande</small></span></label>` : ''}
          <ul class="b-rassure">
            <li>${ic('main')}<span><b>Retrait gratuit</b> à Ducos ou au Robert</span></li>
            <li>${ic('camion')}<span><b>Livraison</b> en Martinique, modalités confirmées avec le prix</span></li>
            <li>${ic('bouclier')}<span><b>Garantie légale</b> ${p.recond ? 'd’au moins 1 an' : 'de 2 ans'}</span></li></ul>
          <div class="b-partage"><span>Partager</span><button type="button" class="btn" data-copier="${esc(lien)}">${ic('lien')}Copier le lien</button><a class="btn" href="${waUrl('', p.nom + ' : ' + lien)}" target="_blank" rel="noopener">${ic('partage')}WhatsApp</a></div>
        </div></article>
      <div class="b-sections">
        <section aria-labelledby="bsD"><h2 id="bsD">Description</h2><p>${esc(p.desc)}</p><ul class="b-pts">${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${p.svc ? `<p><a href="index.html?svc=${encodeURIComponent(p.svc)}">Voir la prestation de pose et d’installation →</a></p>` : ''}</section>
        <section aria-labelledby="bsC"><h2 id="bsC">Caractéristiques</h2><table class="b-tableau"><tbody>${p.car.map(([k, v]) => `<tr><th scope="row">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table></section>
        <section aria-labelledby="bsL"><h2 id="bsL">Livraison et retrait</h2><p>Retrait gratuit à Ducos ou au Robert. Livraison en Martinique, ou livraison avec pose par un technicien : les modalités vous sont confirmées avec le prix. Nous confirmons le prix, la disponibilité et le délai par WhatsApp ou email, sous 24 h ouvrées. ${p.dispo === 'stock' ? '' : 'Article sur commande : le délai exact dépend du fournisseur.'}</p></section>
        <section aria-labelledby="bsG"><h2 id="bsG">Garanties et retours</h2><ul><li>${garantie}</li><li>Rétractation de 14 jours pour une commande passée à distance (site, WhatsApp, téléphone), à compter de la remise de l’article : voir nos <a href="cgv.html#boutique">conditions générales de vente</a>.</li>
          <li>Éco-participation incluse dans le prix des appareils électriques et électroniques, détaillée sur la facture.</li><li>Reprise gratuite de votre ancien appareil du même type à l’achat d’un neuf, et des batteries usagées, pour qu’ils soient recyclés.</li>
          <li>Paiement à la remise, au retrait ou à la livraison. ${dispoDe(p) === 'stock' ? '' : 'Les articles « sur commande » peuvent demander un acompte, indiqué avant la commande.'}</li></ul></section>
        ${p.regle ? `<section class="b-regle" aria-labelledby="bsR"><h2 id="bsR">Ce que dit la loi</h2><p>${esc(REGLES[p.regle])}</p></section>` : ''}
      </div>
      ${assoc.length ? `<section class="b-bloc" aria-labelledby="bAssoc"><h2 id="bAssoc">Souvent pris avec</h2><div class="b-grille b-grille-acc">${assoc.map(carte).join('')}</div></section>` : ''}${NOTE}</div>`;
  }

  // ----- comparateur -----
  function pageComparer() {
    const ps = comparer.map(parId).filter(Boolean);
    if (!ps.length) return `${FIL([['Boutique', '#/'], ['Comparateur']])}<div class="b-vide"><h1>Comparateur</h1><p>Cochez « Comparer » sur 2 à 4 produits pour voir leurs caractéristiques côte à côte.</p><a class="btn btn-primary" href="#/">Voir les rayons</a></div>`;
    const labels = [...new Set(ps.flatMap(p => p.car.map(x => x[0])))];
    const val = (p, k) => { const x = p.car.find(y => y[0] === k); return x ? x[1] : null; };
    const diff = k => new Set(ps.map(p => val(p, k))).size > 1;
    return `${FIL([['Boutique', '#/'], ['Comparateur']])}<div class="b-liste-tete"><h1>Comparateur</h1><p class="b-nb">${ps.length} produit${ps.length > 1 ? 's' : ''} sur 4 au plus</p></div>
      <p class="b-aide">Les lignes qui diffèrent d’un produit à l’autre sont surlignées.</p>
      <table class="b-compare" style="--n:${ps.length}"><caption class="sr-only">Comparaison des caractéristiques</caption>
        <thead><tr><th scope="col" class="b-c-vide"><span class="sr-only">Produit</span></th>${ps.map(p => `<th scope="col" style="--bc:${catDe(p.cat).c}"><div class="b-c-tete">${blocVis(p)}<a href="#/produit/${p.id}">${esc(p.nom)}</a><button type="button" class="b-retirer" data-cmp-retirer="${p.id}" aria-label="Retirer du comparateur : ${esc(p.nom)}">${ic('croix')}Retirer</button></div></th>`).join('')}</tr></thead>
        <tbody><tr><th scope="row">Prix</th>${ps.map(p => `<td data-l="Prix">${prixDe(p) ? `<b class="mono">${eur(prixDe(p))}</b>` : 'Prix sur demande'}</td>`).join('')}</tr>
        <tr><th scope="row">Disponibilité</th>${ps.map(p => `<td data-l="Disponibilité">${esc(DISPOS[dispoDe(p)][0])}</td>`).join('')}</tr>
        ${labels.map(k => `<tr class="${diff(k) ? 'b-diff' : ''}"><th scope="row">${esc(k)}</th>${ps.map(p => `<td data-l="${esc(k)}">${val(p, k) == null ? '<span class="b-nd">—</span>' : esc(val(p, k))}</td>`).join('')}</tr>`).join('')}
        <tr><th scope="row"><span class="sr-only">Panier</span></th>${ps.map(p => `<td><button type="button" class="btn btn-primary" data-add="${p.id}" aria-label="Ajouter au panier : ${esc(p.nom)}">Ajouter</button></td>`).join('')}</tr></tbody></table>${NOTE}`;
  }

  // ----- favoris -----
  function pageFavoris() {
    const ps = favoris.map(parId).filter(Boolean);
    return `${FIL([['Boutique', '#/'], ['Favoris']])}<div class="b-liste-tete"><h1>Favoris</h1><p class="b-nb">${ps.length} produit${ps.length > 1 ? 's' : ''} · gardés sur cet appareil</p></div>
      ${ps.length ? `<div class="b-grille b-vue-${L.vue}">${ps.map(carte).join('')}</div>` : '<div class="b-vide"><p><b>Aucun favori pour l’instant.</b></p><p>Touchez le cœur d’un produit pour le retrouver ici.</p><a class="btn btn-primary" href="#/">Voir les rayons</a></div>'}`;
  }

  // ----- panier -----
  const formEtat = { mode: 'ducos', nom: '', commune: '', note: '' };
  const MODES = { ducos: 'Retrait à Ducos', robert: 'Retrait au Robert', livraison: 'Livraison en Martinique', pose: 'Livraison avec la pose par un technicien' };
  function pagePanier() {
    const t = totaux();
    // prix de pose affiché par ligne : la prise en charge (base) n'est comptée qu'une fois par service, comme dans le total
    const vusSvc = new Set();
    const poseLigne = (p, n) => { const q = poseDe(p); if (!q) return 0; const b = poses[p.id] && !vusSvc.has(q.svc) ? q.base : 0; if (poses[p.id]) vusSvc.add(q.svc); return b + q.prix * n; };
    if (!t.L.length) return `${FIL([['Boutique', '#/'], ['Panier']])}<div class="b-vide"><h1>Votre panier</h1><p>Votre panier est vide.</p><a class="btn btn-primary" href="#/">Voir les rayons</a></div>`;
    return `${FIL([['Boutique', '#/'], ['Panier']])}<h1>Votre panier</h1>
      <div class="b-panier-page"><section aria-label="Articles"><ul class="b-lignes" id="bLignes">${t.L.map(({ p, n }) => {
        const px = prixDe(p), pose = poseDe(p);
        return `<li style="--bc:${catDe(p.cat).c}">${blocVis(p)}<div class="b-l-corps"><a class="b-l-nom" href="#/produit/${p.id}">${esc(p.nom)}</a><span class="b-l-ref mono">${refDe(p)}</span>
          ${pose ? `<label class="b-l-pose"><input type="checkbox" data-pose="${p.id}"${poses[p.id] ? ' checked' : ''}><span>Pose par un technicien (+${eur(poses[p.id] ? poseLigne(p, n) : pose.base + pose.prix * n)}${n > 1 ? ' pour ' + n : ''}, déplacement selon la commune)</span></label>` : ''}
          <div class="b-l-bas"><span class="b-qte" role="group" aria-label="Quantité : ${esc(p.nom)}"><button type="button" data-moins="${p.id}" aria-label="Retirer un : ${esc(p.nom)}">−</button><span aria-live="polite">${n}</span><button type="button" data-plus="${p.id}" aria-label="Ajouter un : ${esc(p.nom)}">+</button></span>
          <button type="button" class="b-retirer" data-retirer="${p.id}" aria-label="Retirer du panier : ${esc(p.nom)}">${ic('croix')}Retirer</button></div></div>
          <span class="b-l-prix mono">${px ? eur(px * n) : 'sur demande'}</span></li>`; }).join('')}</ul></section>
        <aside class="b-recap" aria-label="Récapitulatif et commande">
          <h2>Récapitulatif</h2>
          <dl class="b-totaux"><div><dt>Matériel</dt><dd class="mono">${t.materiel ? eur(t.materiel) : '—'}</dd></div>
            ${t.pose ? `<div><dt>Pose par nos techniciens</dt><dd class="mono">${eur(t.pose)}</dd></div>` : ''}
            ${t.surDemande ? `<div><dt>Articles sur demande</dt><dd>${t.surDemande} article${t.surDemande > 1 ? 's' : ''}</dd></div>` : ''}
            <div class="b-tot"><dt>Total indicatif</dt><dd class="mono">${t.total ? eur(t.total) : 'Prix sur demande'}</dd></div></dl>
          ${t.surDemande ? '<p class="b-aide">Les articles « prix sur demande » ne sont pas dans le total : nous vous donnons le prix avec la confirmation.</p>' : ''}
          <form id="bForm" class="b-form" novalidate>
            <fieldset><legend>Comment voulez-vous le récupérer ?</legend>${Object.entries(MODES).map(([v, tx]) => `<label><input type="radio" name="mode" value="${v}"${formEtat.mode === v ? ' checked' : ''}> ${tx}</label>`).join('')}</fieldset>
            <label>Votre prénom et nom <span class="b-fac">(facultatif)</span><input name="nom" maxlength="80" autocomplete="name" value="${esc(formEtat.nom)}"></label>
            <label>Votre commune <span class="b-fac">(pour la livraison)</span><input name="commune" maxlength="60" autocomplete="address-level2" value="${esc(formEtat.commune)}"></label>
            <label>Une précision ? <span class="b-fac">(modèle, couleur, taille…)</span><textarea name="note" maxlength="400" rows="2">${esc(formEtat.note)}</textarea></label>
            <p class="b-form-note"><b>Rien n’est payé en ligne.</b> Nous vous confirmons le prix et la disponibilité, puis vous payez à la remise. <a href="cgv.html#boutique">Conditions générales de vente</a></p>
            <div class="b-form-act"><button type="button" class="btn btn-primary b-wa" data-envoi="wa">Envoyer ma commande sur WhatsApp</button><button type="button" class="btn" data-envoi="mail">Par email</button></div>
          </form></aside></div>`;
  }

  function message() {
    const d = formEtat, t = totaux();
    const corps = t.L.flatMap(({ p, n }) => [`- ${n} × ${p.nom}${prixDe(p) ? ` (${eur(prixDe(p) * n)})` : ' (prix à me donner)'}`, ...(poses[p.id] && poseDe(p) ? ['  + Pose par un technicien : ' + poseDe(p).libelle] : [])]);
    return ['Bonjour IloTech, je voudrais commander :', ...corps,
      t.pose ? `Pose : ${eur(t.pose)}` : '', t.total ? `Total indicatif : ${eur(t.total)}` : '', `Mode : ${MODES[d.mode] || MODES.ducos}`, d.commune ? `Commune : ${d.commune}` : '', d.nom ? `Nom : ${d.nom}` : '',
      d.note ? `Précision : ${d.note}` : '', 'Merci de me confirmer le prix et la disponibilité.'].filter(Boolean).join('\n');
  }

  // ---------- en-tête, suggestions, méga-menu, mini-panier ----------
  function majEntete() {
    const t = totaux();
    const mets = (k, n) => $$(`[data-n="${k}"]`).forEach(e => { e.textContent = n; e.hidden = !n; });
    mets('fav', favoris.length); mets('cmp', comparer.length); mets('pan', t.nb);
    const tot = $('#bTotalEntete'); if (tot) tot.textContent = t.nb ? (t.total ? eur(t.total) : 'sur demande') + (t.total && t.surDemande ? ' +' : '') : '';
    $('#bPanierLien').setAttribute('aria-label', 'Panier : ' + t.nb + (t.nb > 1 ? ' articles' : ' article') + (t.total ? ', ' + eur(t.total) : ''));
    $('#bFavLien').setAttribute('aria-label', 'Favoris : ' + favoris.length);
    $('#bCmpLien').setAttribute('aria-label', 'Comparateur : ' + comparer.length + ' sur 4');
  }
  function fermerTout() { fermerSug(); fermerMega(); fermerFiltres(); fermerMini(); }
  function annoncer(t) { const z = $('#bAnnonce'); z.textContent = ''; setTimeout(() => { z.textContent = t; }, 30); }

  const sug = { actif: -1, items: [] };
  function majSug() {
    const inp = $('#bCherche'), q = inp.value.trim(), ul = $('#bSug');
    if (!q) return fermerSug();
    const rs = rayonsCorrespondants(q).slice(0, 3), ps = chercher(q).slice(0, 6);
    sug.items = [...rs.map(r => ({ href: '#/rayon/' + r.id, html: `<span class="b-sug-t">${esc(r.nom)}</span><span class="b-sug-k">Rayon</span>` })),
      ...ps.map(p => ({ href: '#/produit/' + p.id, html: `<span class="b-sug-t">${esc(p.nom)}</span><span class="b-sug-k">${prixDe(p) ? eur(prixDe(p)) : 'Prix sur demande'}</span>` })),
      { href: '#/recherche?q=' + encodeURIComponent(q), html: `<span class="b-sug-t">Voir tous les résultats pour « ${esc(q)} »</span>` }];
    sug.actif = -1;
    ul.innerHTML = sug.items.map((s, i) => `<li role="option" id="bSug${i}" data-href="${esc(s.href)}" aria-selected="false">${s.html}</li>`).join('');
    ul.hidden = false; inp.setAttribute('aria-expanded', 'true'); inp.removeAttribute('aria-activedescendant');
  }
  function fermerSug() { const u = $('#bSug'); if (!u || u.hidden) return; u.hidden = true; const i = $('#bCherche'); i.setAttribute('aria-expanded', 'false'); i.removeAttribute('aria-activedescendant'); }
  function activerSug(i) {
    const n = sug.items.length; if (!n) return; sug.actif = (i + n) % n;
    $$('#bSug li').forEach((li, k) => li.setAttribute('aria-selected', String(k === sug.actif)));
    $('#bCherche').setAttribute('aria-activedescendant', 'bSug' + sug.actif);
    $('#bSug' + sug.actif).scrollIntoView({ block: 'nearest' });
  }

  function construireMega() {
    $('#bMega').innerHTML = `<div class="b-mega-in">${CATS.map(c => `<div class="b-mega-col" style="--bc:${c.c}"><a class="b-mega-t" href="#/rayon/${c.id}">${esc(c.nom)}</a><ul>${c.sr.map(([id, nom]) => `<li><a href="#/rayon/${c.id}?sr=${id}">${esc(nom)}</a></li>`).join('')}</ul></div>`).join('')}</div>`;
  }
  function ouvrirMega() { $('#bMega').hidden = false; $('#bRayonsBtn').setAttribute('aria-expanded', 'true'); const a = $('#bMega a'); if (a) a.focus(); }
  function fermerMega(rendre) { const m = $('#bMega'); if (!m || m.hidden) return; m.hidden = true; const b = $('#bRayonsBtn'); b.setAttribute('aria-expanded', 'false'); if (rendre) b.focus(); }

  let derniereFocus = null;
  function ouvrirFiltres() { const f = $('#bFiltres'); if (!f) return; derniereFocus = document.activeElement; document.body.classList.add('b-filtres-ouverts'); $$('[data-filtres="ouvrir"]').forEach(b => b.setAttribute('aria-expanded', 'true')); f.focus(); }
  function fermerFiltres(rendre) { if (!document.body.classList.contains('b-filtres-ouverts')) return; document.body.classList.remove('b-filtres-ouverts'); $$('[data-filtres="ouvrir"]').forEach(b => b.setAttribute('aria-expanded', 'false')); if (rendre && derniereFocus && derniereFocus.focus) derniereFocus.focus(); }

  let minuteur = 0;
  function ouvrirMini(p) {
    const t = totaux(), m = $('#bMini'), n = panier[p.id] || 0;
    $('#bMiniCorps').innerHTML = `<div class="b-mini-art" style="--bc:${catDe(p.cat).c}">${blocVis(p)}<div><p class="b-mini-ok">${ic('coche')} Ajouté au panier</p><b>${esc(p.nom)}</b><span>${n} dans le panier</span></div></div>
      <p class="b-mini-tot"><span>${t.nb} article${t.nb > 1 ? 's' : ''}</span><strong class="mono">${t.total ? eur(t.total) : 'Prix sur demande'}</strong></p>${t.surDemande && t.total ? `<p class="b-aide">+ ${t.surDemande} article${t.surDemande > 1 ? 's' : ''} au prix sur demande</p>` : ''}`;
    if (!m.open) { m.show(); if (!calme()) m.animate([{ transform: 'translateX(110%)', opacity: .4 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 240, easing: 'ease-out' }); }
    clearTimeout(minuteur); minuteur = setTimeout(() => { if (!m.matches(':hover') && !m.contains(document.activeElement)) fermerMini(); }, 7000);
  }
  function fermerMini() { const m = $('#bMini'); if (m && m.open) { clearTimeout(minuteur); m.close(); } }

  // retour visuel à l'ajout : une pastille qui vole vers l'icône du panier, puis l'icône qui gonfle (Web Animations, sans bibliothèque)
  function voler(depuis, couleur) {
    if (calme() || !depuis) return;
    const a = depuis.getBoundingClientRect(), b = $('#bPanierLien').getBoundingClientRect();
    const d = document.createElement('div'); d.className = 'b-vol'; d.style.background = couleur; d.setAttribute('aria-hidden', 'true'); document.body.appendChild(d);
    const x0 = a.left + a.width / 2 - 9, y0 = a.top + a.height / 2 - 9, x1 = b.left + b.width / 2 - 9, y1 = b.top + b.height / 2 - 9;
    d.animate([{ transform: `translate(${x0}px,${y0}px) scale(1)`, opacity: 1 }, { transform: `translate(${x1}px,${y1}px) scale(.4)`, opacity: .2 }], { duration: 520, easing: 'cubic-bezier(.5,0,.3,1)' }).onfinish = () => {
      d.remove(); $('#bPanierLien').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
    };
  }

  // ---------- actions ----------
  function changer(id, delta, depuis) {
    const p = parId(id); if (!p) return;
    const n = Math.max(0, Math.min(20, (panier[id] || 0) + delta));
    if (n) panier[id] = n; else { delete panier[id]; delete poses[id]; }
    garder(); majEntete();
    const idFoc = depuis && depuis.dataset ? depuis.dataset.add : null;
    if (delta > 0) { annoncer(p.nom + ' ajouté au panier'); voler(depuis, catDe(p.cat).c); if (!location.hash.startsWith('#/panier')) ouvrirMini(p); }
    reRendreSiBesoin();
    if (idFoc) { const b = $(`#bMain [data-add="${idFoc}"]`); if (b) b.focus({ preventScroll: true }); }
  }
  // met à jour la page courante sans la recharger quand elle montre l'état du panier, des favoris ou du comparateur
  function reRendreSiBesoin() {
    const h = location.hash;
    if (h.startsWith('#/panier') || h.startsWith('#/comparer') || h.startsWith('#/favoris')) {
      const foc = document.activeElement, sel = foc && foc.dataset ? Object.entries(foc.dataset).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}="${v}"]`)[0] : null;
      const y = scrollY; main().innerHTML = h.startsWith('#/panier') ? pagePanier() : h.startsWith('#/comparer') ? pageComparer() : pageFavoris(); scrollTo(0, y);
      if (sel) { const e = $('#bMain ' + sel); if (e) e.focus(); } else if (foc && foc.id) { const e = document.getElementById(foc.id); if (e) e.focus(); }
    } else if ($('#bRes')) majResultats();
    else if (h.startsWith('#/produit') || h === '' || h === '#/' || h === '#') { $$('#bMain .b-carte').forEach(el => { const p = parId(el.id.slice(2)); if (p) el.outerHTML = carte(p); }); }
  }
  function basculer(tableau, id, max) {
    const i = tableau.indexOf(id); if (i >= 0) tableau.splice(i, 1); else { if (max && tableau.length >= max) return false; tableau.push(id); }
    return true;
  }
  function copier(texte, bouton) {
    const fin = () => { annoncer('Lien copié'); const t = bouton.lastChild; if (t && t.nodeType === 3) { const old = t.textContent; t.textContent = 'Lien copié'; setTimeout(() => { t.textContent = old; }, 1800); } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(fin, () => window.prompt('Copiez le lien :', texte));
    else window.prompt('Copiez le lien :', texte);
  }

  function initialiser() {
    construireMega();
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-add],[data-fav],[data-plus],[data-moins],[data-retirer],[data-cmp-retirer],[data-envoi],[data-copier],[data-vue],[data-filtres],[data-f-raz],[data-qm],[data-qp],[data-fermer-mini],[data-href]');
      const dansMega = e.target.closest('#bMega, #bRayonsBtn'), dansRech = e.target.closest('.b-recherche');
      if (!dansMega) fermerMega(); if (!dansRech) fermerSug();
      if (e.target.closest('#bRayonsBtn')) { if ($('#bMega').hidden) ouvrirMega(); else fermerMega(true); return; }
      if (e.target.closest('#bMega a')) { fermerMega(); return; }
      if (!t) return;
      const d = t.dataset;
      if (d.href) { aller(d.href); fermerSug(); }
      else if (d.add) { const q = d.qte !== undefined ? Math.max(1, Math.min(20, parseInt($('#bQte').value, 10) || 1)) : 1; changer(d.add, q, t); }
      else if (d.fav) { basculer(favoris, d.fav); ecrire('itFavoris', favoris); majEntete(); annoncer(favoris.includes(d.fav) ? 'Ajouté aux favoris' : 'Retiré des favoris'); if (location.hash.startsWith('#/favoris')) reRendreSiBesoin(); else $$(`[data-fav="${d.fav}"]`).forEach(b => { const p = parId(d.fav), f = favoris.includes(d.fav); b.setAttribute('aria-pressed', String(f)); b.setAttribute('aria-label', (f ? 'Retirer des favoris' : 'Ajouter aux favoris') + ' : ' + p.nom); if (f && !calme()) b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }, { transform: 'scale(1)' }], { duration: 280 }); }); }
      else if (d.plus) changer(d.plus, 1, t);
      else if (d.moins) changer(d.moins, -1);
      else if (d.retirer) { delete panier[d.retirer]; delete poses[d.retirer]; garder(); majEntete(); reRendreSiBesoin(); annoncer('Article retiré du panier'); }
      else if (d.cmpRetirer) { basculer(comparer, d.cmpRetirer); ecrire('itComparer', comparer); majEntete(); reRendreSiBesoin(); }
      else if (d.copier !== undefined) copier(d.copier, t);
      else if (d.vue) { L.vue = d.vue; ecrire('itVue', d.vue); $$('[data-vue]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.vue === L.vue))); majResultats(); }
      else if (d.filtres === 'ouvrir') ouvrirFiltres(); else if (d.filtres === 'fermer') fermerFiltres(true);
      else if (d.fRaz !== undefined) { L = { ...L, sr: new Set(), min: '', max: '', dispo: new Set(), car: {} }; const c = { ...contexte, sr: null }; contexte = c; main().innerHTML = pageListe(c); majResultats(); }
      else if (d.qm !== undefined || d.qp !== undefined) { const i = $('#bQte'); i.value = Math.max(1, Math.min(20, (parseInt(i.value, 10) || 1) + (d.qp !== undefined ? 1 : -1))); }
      else if (d.fermerMini !== undefined) fermerMini();
      else if (d.envoi) {
        if (!lignes().length) return annoncer('Votre panier est vide');
        const txt = message();
        if (d.envoi === 'wa') window.open(waUrl(CONFIG.whatsapp || AGENCES.ducos.tel, txt), '_blank', 'noopener');
        else location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Commande boutique IloTech') + '&body=' + encodeURIComponent(txt);
      }
    });
    document.addEventListener('change', e => {
      const t = e.target;
      if (t.matches('[data-cmp]')) {
        if (!basculer(comparer, t.dataset.cmp, 4)) { t.checked = false; annoncer('Le comparateur est limité à 4 produits'); const m = t.closest('.b-cmp'); if (m && !calme()) m.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 }); return; }
        ecrire('itComparer', comparer); majEntete(); $$(`[data-cmp="${t.dataset.cmp}"]`).forEach(c => { c.checked = comparer.includes(t.dataset.cmp); });
      } else if (t.matches('[data-pose]')) {
        const id = t.dataset.pose; if (t.checked) poses[id] = true; else delete poses[id]; garder(); majEntete(); if (location.hash.startsWith('#/panier')) reRendreSiBesoin();
      } else if (t.matches('[data-tri]')) { L.tri = t.value; majResultats(); }
      else if (t.matches('[data-f]')) {
        const k = t.dataset.f, v = t.value, set = k === 'sr' ? L.sr : k === 'dispo' ? L.dispo : k.startsWith('car:') ? (L.car[k.slice(4)] || (L.car[k.slice(4)] = new Set())) : null;
        if (k === 'sr-cat') { const r = catDe(v); if (r) aller('#/rayon/' + v); return; }
        if (set) { t.checked ? set.add(v) : set.delete(v); majResultats(); }
      } else if (t.matches('[data-prix]')) { L[t.dataset.prix] = t.value; majResultats(); }
      else if (t.closest('#bForm') && t.name === 'mode') formEtat.mode = t.value;
    });
    document.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'bCherche') majSug();
      else if (t.matches('[data-prix]')) { L[t.dataset.prix] = t.value; majResultats(); }
      else if (t.closest('#bForm') && t.name && t.name !== 'mode') formEtat[t.name] = t.value;
    });
    $('#bRecherche').addEventListener('submit', e => {
      e.preventDefault(); const q = $('#bCherche').value.trim();
      if (sug.actif >= 0 && sug.items[sug.actif]) aller(sug.items[sug.actif].href); else if (q) aller('#/recherche?q=' + encodeURIComponent(q));
      fermerSug();
    });
    document.addEventListener('keydown', e => {
      if (e.target.id === 'bCherche') {
        if (e.key === 'ArrowDown') { e.preventDefault(); if ($('#bSug').hidden) majSug(); activerSug(sug.actif + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); activerSug(sug.actif - 1); }
      }
      if (e.target.closest && e.target.closest('#bMega')) {
        const liens = $$('#bMega a'), i = liens.indexOf(document.activeElement);
        const aller_ = k => { e.preventDefault(); liens[(k + liens.length) % liens.length].focus(); };
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') aller_(i + 1); else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') aller_(i - 1);
        else if (e.key === 'Home') aller_(0); else if (e.key === 'End') aller_(liens.length - 1);
      }
      if (e.key === 'Escape') {
        if (!$('#bSug').hidden) { fermerSug(); $('#bCherche').focus(); }
        else if (!$('#bMega').hidden) fermerMega(true);
        else if (document.body.classList.contains('b-filtres-ouverts')) fermerFiltres(true);
        else if ($('#bMini').open) fermerMini();
      }
    });
    $('#bSug').addEventListener('mousedown', e => e.preventDefault());
    $('#bSug').addEventListener('click', e => { const li = e.target.closest('li[data-href]'); if (li) { aller(li.dataset.href); fermerSug(); } });
    $('#bMini').addEventListener('close', () => clearTimeout(minuteur));
    window.addEventListener('hashchange', () => route());
    window.addEventListener('storage', e => {
      if (['itPanier', 'itPose', 'itFavoris', 'itComparer'].includes(e.key)) { panier = lirePanier(); poses = lire('itPose', {}) || {}; favoris = tab('itFavoris'); comparer = tab('itComparer'); majEntete(); reRendreSiBesoin(); }
    });
    route(true);
  }

  document.addEventListener('DOMContentLoaded', initialiser);
})();
