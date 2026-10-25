/* =====================================================================
   ÊTRE TROUVÉ : les particuliers ne se démarchent pas, ils doivent nous trouver.
   Liste des endroits où ils cherchent + textes prêts à copier (générés depuis data.js, donc toujours à jour).
   ===================================================================== */
const services = SERVICES.filter(s => CATEGORIES.some(c => !c.bientot && c.services.includes(s.id)));
const prix = s => s.base ? `dès ${eur(s.base)}${s.mensuel ? '/mois' : ''}` : 'gratuit';
const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const horaires = [1, 2, 3, 4, 5, 6].map(j => `${jours[j]} : ${HORAIRES[j] ? HORAIRES[j][0] + ' h – ' + HORAIRES[j][1] + ' h' : 'fermé'}`).join('\n') + '\ndimanche : fermé';
const ag = Object.values(AGENCES);

const TEXTES = {
  gDescription: `IloTech, c'est le dépannage et l'installation informatique en Martinique, avec deux agences, à Ducos et au Robert. Nous intervenons chez vous, en agence ou à distance : ordinateur lent ou en panne, virus, récupération de fichiers, Wi-Fi qui ne capte pas, caméras et domotique, sites web, applications et stratégie marketing, maintenance et cybersécurité pour les entreprises et drone. Devis gratuit, prix annoncés à l'avance (dépannage dès ${eur(SERVICES.find(s => s.id === 'repair').base)}). Prenez rendez-vous en ligne ou écrivez-nous sur WhatsApp.`,
  gServices: services.map(s => `${s.nom} — ${prix(s)}\n${s.desc}`).join('\n\n'),
  gHoraires: horaires,
  gZone: COMMUNES.map(c => c[0]).join(', '),
  fbBio: `Dépannage et installation informatique en Martinique · Agences Ducos et Le Robert · Chez vous, en agence ou à distance · Devis gratuit · Rendez-vous en ligne : ${SITE}`,
  fbPost: `Votre ordinateur rame, le Wi-Fi ne passe pas dans les chambres, ou vous voulez des caméras pour surveiller la maison ? 🖥️📶📹\n\nIloTech, c'est un informaticien près de chez vous, à Ducos et au Robert. On se déplace dans toute la Martinique, on peut aussi intervenir à distance.\n\n✅ Devis gratuit\n✅ Prix annoncé avant l'intervention\n\n📅 Rendez-vous en ligne : ${SITE}\n💬 WhatsApp : ${ag.map(a => `${a.nom} ${a.tel}`).join(' · ')}`,
  groupe: `Bonjour à tous 👋 IloTech, informatique en Martinique (Ducos et Le Robert). Si vous avez un souci d'ordinateur, de Wi-Fi, de téléphone à transférer ou besoin de caméras, je peux vous aider, à domicile ou à distance. Devis gratuit et prix annoncé à l'avance. Rendez-vous en ligne : ${SITE}?src=facebook ou WhatsApp ${ag[0].tel}. Merci aux admins d'accepter ce message 🙏`,
  lbcTitre1: 'Dépannage informatique à domicile – Martinique',
  lbcTexte1: `Ordinateur lent, en panne, virus, fichiers perdus, imprimante, Wi-Fi ? Je me déplace chez vous partout en Martinique (ou à distance).\n\n${services.filter(s => ['repair', 'boost', 'antivirus', 'recup', 'install', 'printer', 'network', 'cours'].includes(s.id)).map(s => `• ${s.nom} : ${prix(s)}`).join('\n')}\n\nDevis gratuit, prix annoncé avant de commencer.\nAgences à Ducos et au Robert. Rendez-vous en ligne : ${SITE}?src=leboncoin\nIloTech – entreprise déclarée (SIRET ${ENTREPRISE.siret}).`,
  lbcTitre2: 'Installation caméras, Wi-Fi et alarme – Martinique',
  lbcTexte2: `Installation et réglage chez vous :\n\n${services.filter(s => ['camera', 'alarme', 'network', 'domotique'].includes(s.id)).map(s => `• ${s.nom} : ${prix(s)}`).join('\n')}\n\nFormules à prix fixe : ${PACKS.filter(p => ['wifi', 'video'].includes(p.id)).map(p => `« ${p.nom} » ${eur(p.prix)}`).join(', ')}.\nDevis gratuit, déplacement dans toute la Martinique. Rendez-vous en ligne : ${SITE}?src=leboncoin\nIloTech – entreprise déclarée (SIRET ${ENTREPRISE.siret}).`,
  lbcTitre3: 'Création de site internet et visibilité Google – Martinique',
  lbcTexte3: `Vous lancez ou développez votre activité ? Nous créons votre site (vitrine, réservation, boutique), votre fiche Google Maps et votre visibilité sur les réseaux.\n\n${services.filter(s => ['siteweb', 'appmobile', 'marketing', 'reseaux', 'devsurmesure'].includes(s.id)).map(s => `• ${s.nom} : ${s.desc.toLowerCase()}`).join('\n')}\n\nPremier échange gratuit, proposition claire avant de commencer. Agences à Ducos et au Robert.\nPrésentation : ${SITE}plaquette.html\nIloTech – entreprise déclarée (SIRET ${ENTREPRISE.siret}).`,
  lbcTitre4: 'Réparation téléphone et tablette – Martinique',
  lbcTexte4: `Écran cassé, batterie fatiguée, téléphone tombé dans l’eau, nouveau téléphone à installer ?\n\n${svc('mobile').options.map(o => '• ' + o[1]).join('\n')}\n\nDevis gratuit, prix annoncé avant la réparation. Agences à Ducos et au Robert.\nRendez-vous en ligne : ${SITE}?cat=mobile\nIloTech – entreprise déclarée (SIRET ${ENTREPRISE.siret}).`,
  lbcTitre5: 'Photos et vidéos par drone – Martinique',
  lbcTexte5: `Images aériennes pour votre maison, votre location, votre commerce ou un événement, et inspection de toiture sans y monter.\n\n• Photos aériennes HD et vidéo montée\n• Observation de toiture ou de bâtiment\n• Impression d’un fichier existant ou adaptation simple\n\nSous réserve de faisabilité (météo, zone de vol autorisée). Devis gratuit : ${SITE}?pole=crea\nIloTech – entreprise déclarée (SIRET ${ENTREPRISE.siret}).`,
  lbcTitre6: 'Installation Starlink – internet par satellite – Martinique',
  lbcTexte6: `Internet trop lent ou coupures chez vous ? Starlink fonctionne partout en Martinique, même dans les mornes et le Nord.\n\nNous installons votre Starlink proprement :\n${svc('starlink').compris.map(x => '• ' + x).join('\n')}\n\nInstallation ${prix(svc('starlink'))} · Formule « ${PACKS.find(p => p.id === 'starlink').nom} » : ${eur(PACKS.find(p => p.id === 'starlink').prix)}\nAide à la commande offerte. Devis gratuit.\n\nAgences Ducos et Le Robert : ${ag.map(a => a.tel).join(' / ')}\nInfos : ${SITE}installation-starlink-martinique.html?src=leboncoin`,
  fbStarlink: `🛰️ NOUVEAU : installation Starlink en Martinique !\n\nInternet lent, coupures, maison dans les hauteurs ? Starlink apporte l'internet rapide partout sur l'île. On pose l'antenne au bon endroit (sans obstacle, bien fixée contre le vent), on passe le câble proprement et on règle le Wi-Fi dans toute la maison.\n\n✅ Installation ${prix(svc('starlink'))}\n✅ Aide à la commande offerte\n✅ Devis gratuit\n\n👉 ${SITE}installation-starlink-martinique.html?src=facebook\n📞 ${ag.map(a => a.nom + ' ' + a.tel).join(' · ')}`,
  malt: `Informaticien et développeur web en Martinique (IloTech, Ducos et Le Robert). Sites vitrines et boutiques, applications, automatisation (Excel, Google Sheets, API), réseaux d’entreprise, Microsoft 365 et cybersécurité. Interventions sur place en Martinique ou à distance. Présentation : ${SITE}plaquette.html`,
  linkedin: `IloTech accompagne les entreprises de Martinique dans leur informatique : maintenance, réseau et Wi-Fi professionnel, emails à votre nom et Microsoft 365, cybersécurité, sites web, applications et marketing. Deux agences, à Ducos et au Robert. Présentation : ${SITE}plaquette.html`,
  nap: `IloTech\n${ag.map(a => `Agence ${a.nom} — ${a.tel}${a.nom === 'Le Robert' ? '\n' + ENTREPRISE.adresse : '\nAdresse : à compléter'}`).join('\n')}\nSite : ${SITE}`,
  avis: `Bonjour, merci encore pour votre confiance ! Si vous êtes satisfait de notre intervention, pourriez-vous nous laisser un petit avis Google ? Ça nous aide beaucoup à nous faire connaître : [collez ici votre lien « Demander des avis »]\nMerci 🙏 — IloTech`
};

const ETAPES = [
  { id: 'google', titre: 'Fiche Google (Google Maps) — une par agence', prio: 'Le plus important',
    pourquoi: 'Quand quelqu’un tape « dépannage informatique Ducos » ou « réparateur PC près de moi », Google affiche d’abord les fiches de la carte. C’est gratuit et c’est là que viennent la plupart des clients locaux.',
    etapes: ['Ouvrez le lien ci-dessous avec votre compte Gmail, puis « Ajouter votre entreprise ».',
      'Nom : « IloTech » seulement (sans mots-clés : Google suspend les fiches qui en ajoutent).',
      'Catégorie principale : « Service de réparation d’ordinateurs ». Ajoutez aussi « Service d’assistance informatique », « Concepteur de sites Web » et « Installateur de systèmes de sécurité ».',
      'Choisissez « Je me déplace chez mes clients » et collez la zone desservie, puis les horaires, le téléphone de l’agence et le site.',
      'Google envoie un code de validation (appel, SMS, courrier ou vidéo). Recommencez pour la 2e agence.',
      'Une fois validée : collez la description, les services, ajoutez le logo et des photos d’interventions.',
      'Demandez un avis à vos derniers clients (texte ci-dessous). Envoyez-moi le lien « Demander des avis » : je l’ajoute sur le site.'],
    lien: ['https://business.google.com/create', 'Créer la fiche Google'],
    textes: [['Description (750 caractères max.)', 'gDescription'], ['Services et prix', 'gServices'], ['Horaires', 'gHoraires'], ['Zone desservie', 'gZone'], ['Message pour demander un avis', 'avis']] },
  { id: 'facebook', titre: 'Page Facebook + groupes de la Martinique', prio: 'Très utile',
    pourquoi: 'Beaucoup de Martiniquais demandent « quelqu’un connaît un bon informaticien ? » dans les groupes Facebook de leur commune. Une page IloTech et des réponses à ces messages amènent des clients.',
    etapes: ['Créez la page « IloTech » (catégorie : Service de réparation d’ordinateurs) avec le logo et le texte « À propos ».',
      'Publiez le premier message ci-dessous et épinglez-le.',
      'Rejoignez les groupes de petites annonces et d’entraide de vos communes. Lisez leurs règles : souvent, la publicité n’est permise qu’un jour précis.',
      'Une fois par semaine au plus, publiez le message pour les groupes. Surtout, répondez aux personnes qui cherchent un informaticien.',
      'Reliez la page à votre outil de publication automatique IloTech, pour qu’elle reçoive aussi les vidéos.'],
    lien: ['https://www.facebook.com/pages/create', 'Créer la page Facebook'],
    textes: [['Texte « À propos »', 'fbBio'], ['Premier message (à épingler)', 'fbPost'], ['Message pour les groupes', 'groupe'], ['Publication Starlink (nouveau)', 'fbStarlink']] },
  { id: 'leboncoin', titre: 'Annonces Leboncoin (rubrique Services)', prio: 'Utile pour les particuliers',
    pourquoi: 'En Martinique, beaucoup de gens cherchent un dépanneur sur Leboncoin. Une annonce bien écrite, avec des prix clairs, rassure.',
    etapes: ['Créez un compte professionnel : Leboncoin exige que les entreprises s’identifient comme pros.',
      'Déposez les annonces ci-dessous (commencez par Starlink, très recherché), avec le logo et une photo d’intervention.',
      'Remontez-les régulièrement, et répondez vite : la rapidité fait la différence.'],
    lien: ['https://www.leboncoin.fr/deposer-une-annonce', 'Déposer une annonce'],
    textes: [['Annonce 1 : titre', 'lbcTitre1'], ['Annonce 1 : texte', 'lbcTexte1'], ['Annonce 2 : titre', 'lbcTitre2'], ['Annonce 2 : texte', 'lbcTexte2'],
      ['Annonce 3 : titre', 'lbcTitre3'], ['Annonce 3 : texte', 'lbcTexte3'], ['Annonce 4 : titre', 'lbcTitre4'], ['Annonce 4 : texte', 'lbcTexte4'],
      ['Annonce 5 : titre', 'lbcTitre5'], ['Annonce 5 : texte', 'lbcTexte5'], ['Annonce 6 (Starlink) : titre', 'lbcTitre6'], ['Annonce 6 (Starlink) : texte', 'lbcTexte6']] },
  { id: 'pros', titre: 'Plateformes pour les entreprises : Malt, Codeur.com, LinkedIn', prio: 'Pôles Web et Entreprises',
    pourquoi: 'Des entreprises y publient chaque jour des projets de site, d’application ou d’automatisation, et cherchent un prestataire. LinkedIn rassure les décideurs et sert de vitrine pour la prospection.',
    etapes: ['Malt : créez un profil freelance (gratuit), avec le texte ci-dessous, vos compétences (site web, application, automatisation, réseau) et votre zone Martinique et à distance.',
      'Codeur.com : inscrivez-vous comme prestataire et répondez aux projets « site internet », « application » et « automatisation » (quelques réponses offertes par mois).',
      'LinkedIn : créez la page entreprise « IloTech » avec le logo et le texte ci-dessous, et liez-la à votre profil personnel.',
      'Partout, ajoutez le lien de la plaquette : c’est votre présentation professionnelle, sans prix.'],
    lien: ['https://www.malt.fr', 'Malt'], lien2: ['https://www.codeur.com', 'Codeur.com'], lien3: ['https://www.linkedin.com/company/setup/new/', 'Page LinkedIn'],
    textes: [['Profil Malt / Codeur', 'malt'], ['Page LinkedIn', 'linkedin']] },
  { id: 'annuaires', titre: 'Annuaires : Pages Jaunes, Bing, Apple Plans', prio: 'Rapide',
    pourquoi: 'Ces annuaires renforcent votre position sur Google et vous rendent visible sur les iPhone (Plans) et sur Bing. Ils reprennent les mêmes informations que la fiche Google.',
    etapes: ['Pages Jaunes : sur pagesjaunes.fr, cherchez « IloTech ». Si vous n’apparaissez pas, utilisez l’inscription gratuite des professionnels.',
      'Bing Places : importez directement votre fiche Google (un clic).',
      'Apple Business Connect : ajoutez IloTech pour apparaître dans Plans sur iPhone.',
      'Partout, mettez exactement le même nom, la même adresse et le même téléphone (bloc ci-dessous).'],
    lien: ['https://www.bingplaces.com', 'Bing Places'], lien2: ['https://businessconnect.apple.com', 'Apple Business Connect'], lien3: ['https://www.pagesjaunes.fr', 'Pages Jaunes'],
    textes: [['Coordonnées identiques partout', 'nap']] },
  { id: 'reseaux', titre: 'Instagram, TikTok, YouTube : le lien vers le site', prio: 'Déjà en place',
    pourquoi: 'Vos vidéos IloTech sont publiées automatiquement. Chaque personne intéressée doit pouvoir prendre rendez-vous en un clic.',
    etapes: [`Mettez ce lien dans la bio d’Instagram (ilo.tech.97), de TikTok (ilo.tech) et de YouTube : ${SITE}`,
      'Dans la bio, précisez « Dépannage & installation informatique · Martinique · Ducos / Le Robert ».'],
    textes: [['Bio courte', 'fbBio']] },
  { id: 'searchconsole', titre: 'Inscrire le site sur Google', prio: '5 minutes',
    pourquoi: 'Pour que le site et sa page « Services et tarifs » apparaissent dans les résultats de recherche Google.',
    etapes: ['Ouvrez Google Search Console, puis « Ajouter une propriété » de type « Préfixe de l’URL ». Collez l’adresse du site.',
      'Choisissez la validation par « Balise HTML », copiez le code et envoyez-le-moi : je l’ajoute au site.',
      `Une fois validé, ajoutez le plan du site : ${SITE}sitemap.xml`],
    lien: ['https://search.google.com/search-console', 'Google Search Console'] },
  { id: 'flyers', titre: 'Flyers et cartes : boîtes aux lettres, commerces, salles d’attente', prio: 'Autorisé chez les particuliers',
    pourquoi: 'C’est le seul démarchage permis chez les particuliers sans leur accord : un flyer dans la boîte aux lettres (sauf « Stop pub »), en caisse chez un commerçant partenaire, dans une salle d’attente ou sur un tableau d’affichage.',
    etapes: ['Ouvrez la page des flyers et choisissez « Particuliers » ou « Professionnels ». Pour les entreprises, la plaquette (plaquette.html) s’imprime aussi en PDF.',
      'Imprimez-la : vous obtenez 4 flyers par feuille A4, avec un QR code qui mène à la prise de rendez-vous.',
      'Laissez-en une pile chez des commerçants partenaires (magasins de téléphonie, papeteries, superettes), dans les mairies et au tableau des résidences.'],
    lien: ['flyer.html', 'Ouvrir les flyers à imprimer'] },
  { id: 'partenaires', titre: 'Bouche-à-oreille et partenaires', prio: 'Le plus rentable',
    pourquoi: 'Un client content en amène d’autres. Les partenaires vous envoient des clients qui ont déjà besoin de vous.',
    etapes: ['Après chaque intervention : demandez un avis Google et laissez 2 flyers (« pour un proche »).',
      'Proposez un geste à un client qui vous recommande quelqu’un (par exemple 10 € de remise sur sa prochaine intervention).',
      'Partenaires possibles : boutiques de téléphonie et d’électroménager (ils ne réparent pas les PC), agences immobilières (nouveaux arrivants à équiper), syndics et gestionnaires de résidences, clubs du 3e âge, auto-écoles et organismes de formation.',
      'Dans l’outil Prospection, ajoutez ces partenaires comme prospects pour suivre vos échanges.'],
    lien: ['prospection.html', 'Ouvrir la prospection'] }
];

let fait = {};
try { fait = JSON.parse(localStorage.getItem('itVisibilite') || '{}'); } catch (e) {}
function cocher(id, v) { fait[id] = v; try { localStorage.setItem('itVisibilite', JSON.stringify(fait)); } catch (e) {} render(); }
async function copier(cle, btn) {
  try { await navigator.clipboard.writeText(TEXTES[cle]); btn.textContent = '✓ Copié'; setTimeout(() => { btn.textContent = 'Copier'; }, 1800); }
  catch (e) { const t = btn.closest('.v-texte').querySelector('textarea'); t.select(); document.execCommand('copy'); btn.textContent = '✓ Copié'; }
}
function render() {
  const n = ETAPES.filter(e => fait[e.id]).length;
  $('v').innerHTML = `<h1>Être trouvé par les clients</h1>
    <p class="lead">Les <b>particuliers</b> ne peuvent pas être démarchés par email, SMS ou téléphone sans leur accord : il faut qu’ils vous trouvent. Voici les endroits où ils cherchent, par ordre d’importance, avec les textes prêts à copier. Les prix viennent du site : ils sont toujours à jour. Pour les <b>entreprises</b>, utilisez l’outil <a href="prospection.html">Prospection</a>.</p>
    <div class="v-progres"><span style="width:${Math.round(n / ETAPES.length * 100)}%"></span></div><p class="muted">${n} / ${ETAPES.length} étapes faites</p>
    ${ETAPES.map((e, i) => `<section class="v-etape ${fait[e.id] ? 'fait' : ''}">
      <header><label class="v-check"><input type="checkbox" ${fait[e.id] ? 'checked' : ''} onchange="cocher('${e.id}',this.checked)"><span>${i + 1}. ${esc(e.titre)}</span></label><em>${esc(e.prio)}</em></header>
      <p>${esc(e.pourquoi)}</p>
      <ol>${e.etapes.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <div class="actions left">${[e.lien, e.lien2, e.lien3].filter(Boolean).map(([u, l], k) => `<a class="btn ${k ? '' : 'btn-primary'}" href="${u}" ${/^https/.test(u) ? 'target="_blank" rel="noopener"' : ''}>${esc(l)}</a>`).join('')}</div>
      ${(e.textes || []).map(([titre, cle]) => `<div class="v-texte"><div class="v-texte-tete"><b>${esc(titre)}</b><span class="muted small">${TEXTES[cle].length} caractères</span><button type="button" class="btn btn-sm" onclick="copier('${cle}',this)">Copier</button></div><textarea readonly rows="${Math.min(12, TEXTES[cle].split('\n').length + 1)}">${esc(TEXTES[cle])}</textarea></div>`).join('')}
    </section>`).join('')}`;
}
render();
