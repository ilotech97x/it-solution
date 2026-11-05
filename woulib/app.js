/* Woulib — l'appli du quotidien, en univers : Food (food.js), Move (move.js), GPS (gps.js)… un seul compte.
   Ce fichier : APP, registre des univers, accueil, espace pro, compte, administration. Base commune : commun/base.js.
   Ajouter un univers : sa ligne dans univers.sql, son fichier .sql (règles, statuts, droits), son fichier .js qui appelle
   declarerUnivers(), ses tests. Voir docs/ARCHITECTURE.md. */
'use strict';

// univers déclarés par leur fichier .js : code → { routes, zone, accueil, pro }
const MODULES = {};
function declarerUnivers(code, m) { MODULES[code] = m; }
// registre lu dans la base (statut, ouverture par territoire) ; repli si la base ne répond pas.
// BASE_V2 : la base a reçu univers.sql, move.sql et food.sql à jour (sinon les fonctions qui en dépendent restent masquées)
let REGISTRE = null, BASE_V2 = false, BOUTIQUES = false, PILOTAGE = false;   // BOUTIQUES : boutique.sql installé ; PILOTAGE : commun/pilotage.sql
const REPLI = [['food', '🍛', 'Woulib Food', 'actif'], ['move', '🚗', 'Woulib Move', 'actif'], ['express', '📦', 'Woulib Express', 'actif'], ['market', '🛍️', 'Woulib Market', 'bientot'],
  ['daily', '🧺', 'Woulib Daily', 'bientot'], ['services', '🔧', 'Woulib Services', 'externe', 'https://immo.ilo-tech.com/#/services'], ['experiences', '🌴', 'Woulib Experiences', 'externe', '../pass/#/?genre=experience'], ['events', '🎟️', 'Woulib Events', 'externe', '../pass/'],
  ['rental', '🚙', 'Woulib Rental', 'bientot'], ['living', '🏡', 'Woulib Living', 'externe', 'https://immo.ilo-tech.com/'], ['ai', '🤖', 'Woulib AI', 'bientot']]
  .map(([code, icone, nom, statut, lien], i) => ({ code, icone, nom, statut, lien, description: '', ordre: i, fermes: [] }));
async function chargerRegistre() {
  if (REGISTRE) return REGISTRE;
  try {
    const [u, t] = await Promise.all([q(sb.from('univers').select('*').order('ordre')), q(sb.from('univers_territoires').select('univers, territoire, actif'))]);
    REGISTRE = u.map(x => ({ ...x, fermes: t.filter(y => y.univers === x.code && !y.actif).map(y => y.territoire) })); BASE_V2 = true;
    BOUTIQUES = await q(sb.from('restaurants').select('genre').limit(1)).then(() => true, () => false);
    if (profil?.role === 'admin') PILOTAGE = await q(sb.rpc('tableau_de_bord', { jours: 7 })).then(() => true, e => !/function|fonction|does not exist|404/i.test(e.message || ''));
  } catch (e) { REGISTRE = REPLI; }
  return REGISTRE;
}
const univers = code => (REGISTRE || REPLI).find(u => u.code === code);
// ouvert pour ce territoire ? (sans territoire choisi : ouvert s'il est actif quelque part)
const universOuvert = (code, terr) => { const u = univers(code); return !!u && u.statut === 'actif' && !(terr && u.fermes.includes(terr)); };
// page d'un univers fermé (pas encore lancé, ou pas sur ce territoire)
function universFerme(code, terr) {
  const u = univers(code);
  vue(`<div class="wrap vide-etat" style="margin-top:30px"><div class="ico">${u?.icone || '✨'}</div><h3>${esc(u?.nom || 'Cet univers')} n’est pas encore ouvert${terr ? ' en ' + esc(terr) : ''}</h3>
    <p class="muted">Demandez à être prévenu depuis l’accueil : vous recevrez une alerte à l’ouverture.</p><a class="btn btn-p" href="#/">Retour à l’accueil</a></div>`);
}

// icônes de l'interface (navigation) : un seul dessin au trait, la couleur suit le texte. Tracés Lucide (lucide.dev, licence ISC).
const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICO = {
  accueil: svg('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  manger: svg('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>'),
  trajets: svg('<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>'),
  activite: svg('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8"/><path d="M8 12h8"/><path d="M8 16h5"/>'),
  compte: svg('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
  cloche: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  retour: svg('<path d="m15 18-6-6 6-6"/>')
};
const APP = {
  nom: 'Woulib', titre: 'Woulib — repas livrés, VTC, taxis et GPS', accueilConnecte: '#/', apresInscription: '#/bienvenue', pourTel: 'que le restaurant, le chauffeur ou le livreur puisse vous joindre',
  menu: () => [['#/manger', '🍛 Food'], ['#/move', '🚗 Move'], ['#/gps', '🧭 GPS'], ...(moi ? [['#/activite', '🧾 Activité'], ['#/compte', 'Mon compte']] : [['#/pros', 'Professionnels']]), ...(profil?.role === 'admin' ? [['#/admin', 'Admin']] : [])],
  menuBas: () => [['#/', ICO.accueil, 'Accueil'], ['#/manger', ICO.manger, 'Manger'], ['#/move', ICO.trajets, 'Trajets'], ['#/activite', ICO.activite, 'Activité'], [moi ? '#/compte' : '#/connexion', ICO.compte, moi ? 'Compte' : 'Connexion']],
  icones: () => ICO,
  differes: { gps: 'gps.js?v=4', projets: 'projets.js?v=2', projet: 'projets.js?v=2' },   // chargés à la première ouverture
  // bouton retour d'une page ouverte directement (lien partagé) : l'accueil de son univers
  parent: h => Object.values(MODULES).find(m => m.routes.test(h.split('?')[0]))?.accueil || '#/',
  // à chaque changement de page : arrêter les rafraîchissements, couper le GPS hors des pages qui guident, couleurs de l'univers visité
  quitter: h => {
    clearInterval(suivi); suivi = null; clearInterval(minuterie); minuterie = null;
    document.body.classList.remove('sans-defil');
    const a = document.getElementById('app'); if (a) a.oninput = a.onsubmit = a.onclick = a.onchange = null;   // réactions propres à une page
    if (h !== '#/chauffeur' && !h.startsWith('#/livraison/') && suiviGps !== null) { navigator.geolocation.clearWatch(suiviGps); suiviGps = null; }
    if (!h.startsWith('#/gps') && typeof arreterGuidage === 'function') arreterGuidage();
    const m = Object.values(MODULES).find(x => x.routes.test(h));
    document.body.dataset.zone = m?.zone || 'accueil';
    document.body.dataset.page = h.split('?')[0].split('/')[1] || 'accueil';   // téléphone : pied de page seulement sur l'accueil
  },
  pages: {}
};

// commission de la plateforme vue par le pro : ce qu'il doit, ses ventes du mois, le détail (commun/commissions.sql)
const SOURCES_CM = { commande: '🍛 Repas', course: '🚗 Course', livraison: '🛵 Livraison', reservation: '🏡 Séjour', prestation: '🔧 Prestation', billet: '🎟️ Billet' };
async function blocCommission() {
  await chargerRegistre();
  if (!BASE_V2) return '';
  const c = await q(sb.rpc('mes_commissions')).catch(() => null);
  if (!c || !c.lignes.length) return '';
  return `<details class="panneau commission"><summary><b>💶 Commission Woulib</b> · à régler : <b>${eur(c.due)}</b> <span class="muted petit">· ventes du mois ${eur(c.ventes_mois)}</span></summary>
    <p class="petit muted">Vos clients vous paient directement ; la commission de la plateforme est réglée une fois par mois (relevé envoyé sur WhatsApp ou par email).</p>
    ${c.lignes.map(x => `<div class="ligne-panier"><span>${SOURCES_CM[x.source] || x.source} · ${esc(jourHeure(x.created_at))}<small>${eur(x.base)} × ${Number(x.taux)} %</small></span><b style="${x.statut === 'annulee' ? 'text-decoration:line-through;opacity:.5' : ''}">${eur(x.montant)}${x.statut === 'payee' ? ' ✓' : ''}</b></div>`).join('')}</details>`;
}

// taux de commission affichés aux pros (réglés dans l'administration ; repli : taux de départ)
const tauxPro = code => Number(univers(code)?.parametres?.commission_pct ?? { food: 10, move: 10, living: 8, events: 5 }[code] ?? 0);
const POURQUOI = [['💸', 'Plus juste pour les pros', 'Commission de 5 à 10 %, quand les grandes plateformes prennent souvent 25 à 30 %.'],
  ['🤝', 'Vous payez directement', 'Espèces ou carte, au restaurant, au chauffeur ou au livreur. Personne ne garde votre argent.'],
  ['🌴', 'D’ici, pour ici', 'Restaurants, chauffeurs et livreurs de votre île, vérifiés un par un.'],
  ['🛡️', 'Sécurité', 'Code de remise à la livraison, trajet partagé en direct avec un proche, bouton d’urgence.']];

// accueil : une recherche, quatre grandes actions, ce qui est en cours, les cuisines, les restaurants ouverts
APP.pages[''] = async () => {
  const reg = await chargerRegistre(), terr = terrPrefere();
  const bientot = reg.filter(u => !(u.statut === 'actif' && MODULES[u.code]) && u.statut !== 'masque');
  const ouvert = c => universOuvert(c);
  vue(`<section class="accueil"><div class="wrap">
    <div class="acc-tete"><div><h1>${moi && profil?.prenom ? `Bonjour ${esc(profil.prenom)} 👋` : 'Woulib, <em>tout le quotidien</em>'}</h1><p class="muted">Qu’est-ce qu’on fait aujourd’hui ?</p></div>
      <a class="chip-terr" href="#/manger" title="Territoire">📍 ${esc(terr || 'Martinique')}</a></div>
    ${blocInstallation()}
    <form class="recherche-unique" id="fCherche"><div class="seg"><button type="button" class="on" data-seg="manger">🍛 Manger</button><button type="button" data-seg="trajet">🚗 Trajet</button></div>
      <div class="rch"><span aria-hidden="true">🔎</span><input name="q" placeholder="Un plat, un restaurant, une envie…" aria-label="Rechercher" autocomplete="off"><button class="btn btn-p">Go</button></div></form>
    <div class="grandes">
      ${ouvert('food') ? '<a class="grande g-food" href="#/manger"><span>🍛</span><b>Manger</b><small>Livré ou à emporter</small></a>' : ''}
      ${ouvert('move') ? '<a class="grande g-move" href="#/move"><span>🚗</span><b>Se déplacer</b><small>VTC et taxis</small></a>' : ''}
      ${ouvert('express') ? '<a class="grande g-express" href="#/express"><span>📦</span><b>Envoyer un colis</b><small>Livré par un livreur vérifié</small></a>' : ''}
      <a class="grande g-projet" href="#/projets"><span>🗂️</span><b>Organiser</b><small>Anniversaire, mariage, séjour…</small></a>
      <a class="grande g-gps" href="#/gps"><span>🧭</span><b>GPS</b><small>Alertes route</small></a>
      <a class="grande g-pro" href="#/pros"><span>💼</span><b>Gagner avec Woulib</b><small>Resto, chauffeur, livreur…</small></a></div>
    <div id="enCours"></div>
    <section class="section" id="boutiqueAcc" hidden></section>
    ${ouvert('food') ? `<section class="section"><h2>Envie de…</h2><div class="defile cuisines">${cuisinesVisibles().filter(([k]) => k !== 'autre').map(([k, [i, t]]) => `<a class="cuisine" href="#/manger?cuisine=${k}"><span>${i}</span>${esc(t)}</a>`).join('')}</div></section>` : ''}
    <section class="section" id="platsAcc" hidden></section>
    <section class="section" id="restosAccueil" hidden><div class="titre-s"><h2>Ouverts maintenant</h2><a href="#/manger">Tout voir →</a></div><div class="defile" id="restosListe"></div></section>
    <section class="section"><h2>Pourquoi Woulib ?</h2><div class="pourquoi">${POURQUOI.map(([i, t, d]) => `<div><span>${i}</span><b>${t}</b><small>${d}</small></div>`).join('')}</div></section>
    <section class="section"><h2>Tout l’écosystème</h2><div class="defile" id="univers">${bientot.map(u => u.statut === 'externe'
        ? `<a class="pastille-u" href="${esc(u.lien)}"><span>${u.icone}</span><b>${esc(u.nom.replace('Woulib ', ''))}</b><small>Ouvert</small></a>`
        : `<button class="pastille-u" data-alerte="${u.code}" title="${esc(u.description)}"><span>${u.icone}</span><b>${esc(u.nom.replace('Woulib ', ''))}</b><small>🔔 Me prévenir</small></button>`).join('')}</div></section></div></section>`);
  let seg = 'manger';
  $('#fCherche').addEventListener('click', e => { const b = e.target.closest('[data-seg]'); if (!b) return; seg = b.dataset.seg;
    document.querySelectorAll('[data-seg]').forEach(x => x.classList.toggle('on', x === b)); $('#fCherche').q.placeholder = seg === 'manger' ? 'Un plat, un restaurant, une envie…' : 'Où allez-vous ?'; $('#fCherche').q.focus(); });
  $('#fCherche').addEventListener('submit', e => { e.preventDefault(); const t = e.target.q.value.trim();
    if (seg === 'trajet') { try { sessionStorage.setItem('wlDest', t); } catch (x) { /* facultatif */ } return aller('#/move'); }
    aller('#/manger' + (t ? '?' + new URLSearchParams({ q: t }) : '')); });
  $('#univers').onclick = async e => {
    const b = e.target.closest('[data-alerte]'); if (!b || !exigeCompte()) return;
    try { await q(sb.from('alertes_univers').insert({ univers: b.dataset.alerte })); b.querySelector('small').textContent = '✓ Prévenu'; b.disabled = true; toast('C’est noté : nous vous préviendrons à l’ouverture.'); } catch (err) { toast(erreur(err), true); }
  };
  // ce qui est en cours : commande ou course, avec une barre d'avancement
  if (moi) {
    const [cmd, crs, deja] = await Promise.all([
      q(sb.from('commandes').select('id, statut, restaurants(nom)').eq('client_id', moi.id).in('statut', ['envoyee', 'acceptee', 'en_preparation', 'prete', 'en_livraison']).order('created_at', { ascending: false }).limit(1)).catch(() => []),
      q(sb.from('courses').select('id, statut, arrivee_txt').eq('client_id', moi.id).in('statut', ['demande', 'acceptee', 'en_route', 'arrivee', 'a_bord']).order('created_at', { ascending: false }).limit(1)).catch(() => []),
      q(sb.from('alertes_univers').select('univers')).catch(() => [])]);
    const pas = (l, st) => Math.max(1, l.findIndex(e => e[0] === st) + 1) / l.length * 100;
    $('#enCours').innerHTML = [...cmd.map(c => `<a class="en-cours" href="#/suivi/${c.id}"><span>🛵</span><div><b>${esc(c.restaurants?.nom || 'Votre commande')}</b><small>${esc(ST_CMD[c.statut]?.[1] || '')}</small><i class="prog"><i style="width:${pas(ETAPES, c.statut)}%"></i></i></div><em>Suivre →</em></a>`),
      ...crs.map(c => `<a class="en-cours g-move" href="#/course/${c.id}"><span>🚗</span><div><b>Vers ${esc(c.arrivee_txt)}</b><small>${esc(ST_COURSE[c.statut]?.[1] || '')}</small><i class="prog"><i style="width:${pas(ETAPES_C, c.statut)}%"></i></i></div><em>Suivre →</em></a>`)].join('');
    deja.forEach(a => { const b = document.querySelector(`[data-alerte="${a.univers}"]`); if (b) { b.querySelector('small').textContent = '✓ Prévenu'; b.disabled = true; } });
  }
  if (ouvert('food')) {
    const boutique = afficherBoutiqueAccueil(terr).catch(() => {});
    let r = sb.from('restaurants').select('*').eq('statut', 'publie').eq('ouvert', true).order('created_at', { ascending: false }).limit(20);
    if (terr) r = r.eq('territoire', terr);
    const l = (await memo('acc-restos:' + terr, () => q(r)).catch(() => [])).filter(x => etatOuverture(x).ouvert).slice(0, 10);
    await boutique;
    if (l.length && $('#restosListe')) { $('#restosListe').innerHTML = l.map(x => carteResto(x)).join(''); $('#restosAccueil').hidden = false; }
    await afficherPlatsAccueil(l.filter(x => !estBoutique(x))).catch(() => {});
  }
};

// juste après l'inscription : choisir ce qu'on vient faire (chacun peut proposer ses services, vérifié avant publication)
const PROFILS = () => [['🛍️', 'Commander et me déplacer', 'Repas, VTC, taxis, GPS. C’est gratuit.', '#/', null],
  ['👩‍🍳', 'J’ai un restaurant, un snack, un traiteur', 'Votre carte en ligne, des livreurs sans en embaucher.', '#/pro/resto/nouveau', `Commission ${tauxPro('food')} % sur les repas`],
  ...!BOUTIQUES ? [] : [['🛒', 'Je vends des boissons, de l’épicerie, du dépannage', 'Votre boutique en ligne : les clients remplissent leur panier, vous livrez ou ils passent prendre.', '#/pro/boutique/nouveau', `Commission ${tauxPro('food')} % sur les ventes`]],
  ['🚗', 'Je suis chauffeur VTC ou taxi', 'Des courses près de chez vous, payées directement par le client.', '#/chauffeur', `Commission ${tauxPro('move')} % sur les courses`],
  ['🛵', 'Je veux livrer (scooter, vélo, voiture)', 'Les frais de livraison et 100 % des pourboires pour vous.', '#/chauffeur', 'Commission 10 % sur les frais de livraison, 0 % sur les pourboires'],
  ['🔧', 'Je propose mes services', 'Ménage, jardin, bricolage, informatique, conciergerie…', 'https://immo.ilo-tech.com/#/compte/partenaire', `Commission ${tauxPro('living')} % sur les prestations`],
  ['🏡', 'Je loue un logement', 'Villa, gîte, appartement : vos réservations, vos règles.', 'https://immo.ilo-tech.com/#/compte/logements', `Commission ${tauxPro('living')} % sur les séjours`],
  ['🎟️', 'J’organise des événements', 'Billets QR code, contrôle à l’entrée, liste des participants.', '../pass/#/orga', `Commission ${tauxPro('events')} % sur les billets payants, 0 % sur les gratuits`]];
const cartesProfils = l => `<div class="profils">${l.map(([i, t, d, h, c]) => `<a class="profil-c" href="${h}"><span>${i}</span><div><b>${t}</b><small>${d}</small>${c ? `<em>${c} · inscription gratuite</em>` : ''}</div><i>›</i></a>`).join('')}</div>`;
APP.pages.bienvenue = async () => {
  await chargerRegistre();
  vue(`<div class="wrap bienvenue"><h1>Bienvenue${profil?.prenom ? ' ' + esc(profil.prenom) : ''} ! 🎉</h1><p class="muted">Que voulez-vous faire avec Woulib ? Tout se fait avec le même compte, et vous pourrez en faire plusieurs.</p>${cartesProfils(PROFILS())}</div>`);
};
APP.pages.pros = async () => {
  await chargerRegistre();
  vue(`<div class="wrap bienvenue"><h1>Gagnez avec Woulib</h1><p class="muted">Inscription gratuite. Vos clients vous paient directement ; Woulib prend seulement une petite commission sur ce que vous vendez, réglée une fois par mois. Chaque pro est vérifié avant sa mise en ligne.</p>
    ${cartesProfils(PROFILS().slice(1))}
    <section class="section"><h2>Pourquoi les pros choisissent Woulib</h2><div class="pourquoi">${[['💸', 'Une commission juste', 'De 5 à 10 % selon l’activité, contre souvent 25 à 30 % sur les grandes plateformes. Pas d’abonnement, pas de frais d’inscription.'],
      ['💶', 'Votre argent tout de suite', 'Le client vous paie directement. Vous réglez la commission une fois par mois.'],
      ['📱', 'Tout depuis le téléphone', 'Commandes et courses en direct, carte, horaires, codes promo, chiffres du mois.'],
      ['🏝️', 'Local et proche', 'Une équipe en Martinique, joignable sur WhatsApp.']].map(([i, t, d]) => `<div><span>${i}</span><b>${t}</b><small>${d}</small></div>`).join('')}</div></section></div>`);
};

APP.pages.compte = async () => {
  if (!exigeCompte()) return;
  const ligne = ([h, i, t, d]) => `<a class="menu-l" href="${h}"><span>${i}</span><div><b>${t}</b>${d ? `<small>${d}</small>` : ''}</div><i>›</i></a>`;
  vue(`<div class="wrap compte-app"><div class="moi-c"><span class="avatar">${esc((profil?.prenom || moi.email || '?')[0].toUpperCase())}</span><div><h1>${esc(profil?.prenom || '')} ${esc(profil?.nom || '')}</h1><span class="muted">${esc(moi.email)}</span></div></div>
    ${blocInstallation()}
    <h2>Mes activités</h2><div class="menu-g">${[['#/activite', '🧾', 'Tout ce qui est en cours', 'Commandes, trajets, colis, en un seul endroit'], ['#/activite?f=repas', '🍛', 'Mes commandes', ''], ['#/activite?f=trajets', '🚗', 'Mes trajets', ''], ['#/activite?f=colis', '📦', 'Mes colis', ''], ['#/projets', '🗂️', 'Mes projets', 'Anniversaire, mariage, séjour…']].map(ligne).join('')}</div>
    <h2>Gagner avec Woulib</h2><div class="menu-g">${[['#/pro', '👩‍🍳', 'Mon restaurant ou ma boutique', 'Carte, articles, stock, commandes en direct'], ['#/chauffeur', '🧑‍✈️', 'Espace chauffeur et livreur', 'Courses, livraisons, colis, gains'], ['#/pros', '💼', 'Toutes les façons de gagner', '']].map(ligne).join('')}</div>
    <h2>Réglages</h2><div class="menu-g">${[['https://immo.ilo-tech.com/#/compte/profil', '🙂', 'Modifier mon profil', ''], ['#/notifs', '🔔', 'Notifications', ''], ['cgu.html', '📄', 'Conditions', ''], [wa(WA, 'Bonjour, j’ai une question sur Woulib.'), '💬', 'Aide sur WhatsApp', '']].map(ligne).join('')}
      ${profil?.role === 'admin' ? ligne(['#/admin', '🛡️', 'Administration', '']) : ''}<a class="menu-l ko" href="#/deconnexion"><span>🚪</span><div><b>Se déconnecter</b></div><i>›</i></a></div></div>`);
};

// activité : tout ce qui est en cours puis l'historique, toutes les applis de Woulib mélangées (comme l'onglet « Activité » d'une appli)
APP.pages.activite = async () => {
  if (!exigeCompte()) return;
  attente(); await chargerRegistre();
  const [cmd, crs, cls] = await Promise.all([
    q(sb.from('commandes').select('id, statut, total, created_at, mode, restaurant_id, restaurants(*)').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(30)).catch(() => []),
    q(sb.from('courses').select('id, statut, prix_estime, created_at, depart_txt, arrivee_txt').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(30)).catch(() => []),
    BASE_V2 ? q(sb.rpc('mes_colis')).catch(() => []) : []]);
  const ACT_CMD = ['envoyee', 'acceptee', 'en_preparation', 'prete', 'en_livraison'], ACT_CRS = ['demande', 'acceptee', 'en_route', 'arrivee', 'a_bord'], ACT_COLIS = ['recherche', 'acceptee', 'recupere'];
  const f = param().f || '';
  const l = [...cmd.map(c => ({ type: 'repas', ico: c.restaurants?.genre === 'boutique' ? '🛒' : '🍛', titre: c.restaurants?.nom || 'Commande', sous: `${eur(c.total)} · ${c.mode === 'livraison' ? '🛵 livraison' : '🛍️ à retirer'}`, st: ST_CMD[c.statut], quand: c.created_at, lien: '#/suivi/' + c.id, actif: ACT_CMD.includes(c.statut),
      encore: ['livree', 'retiree'].includes(c.statut) ? [c.id, c.restaurant_id] : null })),
    ...crs.map(c => ({ type: 'trajets', ico: '🚗', titre: `${c.depart_txt} → ${c.arrivee_txt}`, sous: eur(c.prix_estime), st: ST_COURSE[c.statut], quand: c.created_at, lien: '#/course/' + c.id, actif: ACT_CRS.includes(c.statut) })),
    ...cls.map(c => ({ type: 'colis', ico: '📦', titre: c.role === 'livreur' ? `Colis à livrer · ${c.depot_txt}` : `Colis pour ${c.depot_nom}`, sous: eur(c.prix), st: ST_COLIS[c.statut], quand: c.created_at, lien: '#/colis/' + c.id, actif: ACT_COLIS.includes(c.statut) }))]
    .filter(x => !f || x.type === f).sort((a, b) => b.quand.localeCompare(a.quand));
  const carte = x => `<div class="act-l"><a class="act ${x.actif ? 'actif' : ''}" href="${x.lien}"><span>${x.ico}</span><div><b>${esc(x.titre)}</b><small>${esc(jourHeure(x.quand))} · ${esc(x.sous)}</small></div>${x.st ? tag(x.st) : ''}</a>
    ${x.encore ? `<button class="btn btn-s" data-encore="${x.encore[0]}" data-resto="${x.encore[1]}" aria-label="Recommander">🔁</button>` : ''}</div>`;
  const enCours = l.filter(x => x.actif), passe = l.filter(x => !x.actif);
  const FILTRES = [['', 'Tout'], ['repas', '🍛 Repas'], ['trajets', '🚗 Trajets'], ['colis', '📦 Colis']];
  vue(`<div class="wrap activite"><h1>Activité</h1><div class="puces">${FILTRES.map(([k, t]) => `<a href="#/activite${k ? '?f=' + k : ''}" class="${f === k ? 'on' : ''}">${t}</a>`).join('')}</div>
    ${enCours.length ? `<h2>En cours</h2><div class="acts">${enCours.map(carte).join('')}</div>` : ''}
    ${passe.length ? `<h2>Historique</h2><div class="acts">${passe.map(carte).join('')}</div>` : ''}
    ${l.length ? '' : `<div class="vide-etat"><div class="ico">🧾</div><h3>Rien pour l’instant</h3><p class="muted">Vos commandes, vos trajets et vos colis apparaîtront ici.</p>
      <a class="btn btn-p" href="${{ trajets: '#/move', colis: '#/express' }[f] || '#/manger'}">${{ trajets: 'Réserver un trajet', colis: 'Envoyer un colis' }[f] || 'Commander à manger'}</a></div>`}
    <p class="muted petit" style="margin-top:18px"><a href="#/projets">🗂️ Mes projets</a> · <a href="#/notifs">🔔 Notifications</a></p></div>`);
  $('#app').onclick = e => { const b = e.target.closest('[data-encore]'); if (b) recommander(b.dataset.encore, b.dataset.resto); };
};

// ---------------------------------------------------------------- administration : chaque univers a son onglet ; les modérateurs ne voient que le leur
const ongletsAdmin = actif => `<h1>Administration</h1><div class="puces">${[...(PILOTAGE && profil?.role === 'admin' ? [['tableau', '#/admin/tableau', '📊 Tableau de bord', null]] : []), ['resto', '#/admin/food', '🍛 Food : restaurants', 'food'], ['woulib', '#/admin/woulib', '🚗 Move : chauffeurs et tarifs', 'move'], ...(BASE_V2 ? [['univers', '#/admin/univers', '🧩 Univers et territoires', null]] : [])]
  .concat(BASE_V2 && profil?.role === 'admin' ? [['commissions', '#/admin/commissions', '💶 Commissions', null]] : [])
  .filter(([, , , u]) => profil?.role === 'admin' || (u && mesModerations.includes(u))).map(([k, h, t]) => `<a href="${h}" class="${actif === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
let mesModerations = [];
APP.pages.admin = async sous => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  mesModerations = (await q(sb.from('moderateurs_univers').select('univers').eq('user_id', moi.id)).catch(() => [])).map(x => x.univers);
  if (sous === 'univers') return adminUnivers();
  if (profil?.role === 'admin' && PILOTAGE && (sous === 'tableau' || !sous)) return adminTableau();
  if (sous === 'commissions') return adminCommissions();
  if (sous === 'woulib' || (profil?.role !== 'admin' && !mesModerations.includes('food') && mesModerations.includes('move'))) return adminWoulib();
  return adminResto();
};
// ---------------------------------------------------------------- tableau de bord : chiffres de tout l'écosystème (commun/pilotage.sql)
// petite courbe d'une série (un seul tracé, une seule échelle) : aire légère, trait de 2 px, dernière valeur écrite, survol = jour et valeur
function courbe(series, cle, titre, format, couleur) {
  const v = series.map(x => Number(x[cle]) || 0), max = Math.max(1, ...v), L = 600, H = 150, h = 120, pas = v.length > 1 ? L / (v.length - 1) : L;
  const pts = v.map((y, i) => [Math.round(i * pas * 10) / 10, Math.round((h - y / max * (h - 12)) * 10) / 10]);
  const ligne = pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '), total = v.reduce((t, x) => t + x, 0);
  const jour = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `<figure class="courbe" style="--c:${couleur}" data-valeurs="${esc(JSON.stringify(series.map((x, i) => [jour(x.d), format(v[i])])))}" data-pas="${pas}" data-l="${L}">
    <figcaption><b>${esc(titre)}</b><span>${format(total)} sur la période</span></figcaption>
    <div class="courbe-zone"><svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(titre)} : ${format(total)} au total, ${format(v.at(-1) || 0)} le dernier jour">
      <line x1="0" y1="${h}" x2="${L}" y2="${h}" class="axe"/><path d="${ligne} L ${L} ${h} L 0 ${h} Z" class="aire"/><path d="${ligne}" class="trait"/>
      <line class="repere" x1="0" y1="0" x2="0" y2="${h}" hidden/></svg>
      <span class="max">${format(max)}</span><span class="pt" hidden></span><div class="bulle" hidden></div></div>
    <div class="axe-x"><span>${jour(series[0].d)}</span><span>${jour(series.at(-1).d)}</span></div></figure>`;
}
const eurRond = n => Math.round(Number(n)).toLocaleString('fr-FR') + ' €', nbFr = n => Number(n).toLocaleString('fr-FR');
async function adminTableau() {
  const jours = Number(param().jours) || 30;
  attente();
  const t = await q(sb.rpc('tableau_de_bord', { jours }));
  const tuile = (titre, valeur, sous) => `<div class="kpi-t"><span>${titre}</span><b>${valeur}</b>${sous ? `<small>${sous}</small>` : ''}</div>`;
  const app = (ico, nom, lien, lignes) => `<a class="app-t" href="${lien}"><b>${ico} ${nom}</b>${lignes.map(([k, v]) => `<span><em>${v}</em> ${k}</span>`).join('')}</a>`;
  const av = t.a_valider, nbValider = Object.values(av).reduce((s, x) => s + Number(x), 0), V = t.volume_apps || {};
  vue(`<div class="wrap tableau" style="padding-top:22px">${ongletsAdmin('tableau')}
    <div class="puces">${[7, 30, 90, 365].map(j => `<a href="#/admin/tableau?jours=${j}" class="${j === jours ? 'on' : ''}">${j === 365 ? '1 an' : j + ' jours'}</a>`).join('')}</div>
    <div class="kpis-t">${tuile('Volume d’affaires', eurRond(t.volume), 'ventes réalisées, toutes applis')}${tuile('Commissions', eurRond(t.commissions.periode), `${eurRond(t.commissions.dues)} à encaisser auprès des pros`)}
      ${tuile('Nouveaux comptes', nbFr(t.comptes.periode), `${nbFr(t.comptes.total)} comptes en tout`)}${tuile('Demandes des clients', nbFr(t.activite), 'commandes, trajets, colis, billets, séjours, prestations')}</div>
    ${nbValider ? `<div class="a-valider"><b>⏳ À valider (${nbValider})</b>${[['restaurants', 'restaurant(s) et boutique(s)', '#/admin/food'], ['chauffeurs', 'chauffeur(s) ou livreur(s)', '#/admin/woulib'], ['evenements', 'événement(s)', '../pass/#/admin'], ['logements', 'logement(s)', 'https://immo.ilo-tech.com/#/admin'], ['prestations', 'prestation(s)', 'https://immo.ilo-tech.com/#/admin']]
      .filter(([k]) => Number(av[k])).map(([k, t, h]) => `<a class="btn btn-s" href="${h}">${av[k]} ${t}</a>`).join('')}</div>` : ''}
    <div class="courbes">${courbe(t.series, 'volume', 'Volume d’affaires par jour', eurRond, '#C9401F')}${courbe(t.series, 'activite', 'Demandes des clients par jour', nbFr, '#2563EB')}${courbe(t.series, 'comptes', 'Nouveaux comptes par jour', nbFr, '#2563EB')}</div>
    <h2>Par appli</h2><div class="apps-t">
      ${app('🍛', 'Woulib Food', '#/admin/food', [['commandes', nbFr(t.food.commandes)], ['de ventes', eurRond(V.food || 0)], ['panier moyen', eurRond(t.food.panier_moyen)], ['annulées ou refusées', nbFr(t.food.annulees)], ['restaurants · ' + t.food.boutiques + ' boutique(s)', nbFr(t.food.restaurants)]])}
      ${app('🚗', 'Woulib Move', '#/admin/woulib', [['courses', nbFr(t.move.courses)], ['terminées', nbFr(t.move.terminees)], ['de ventes', eurRond(V.move || 0)], ['chauffeurs · ' + t.move.livreurs + ' livreur(s)', nbFr(t.move.chauffeurs)], ['livraisons faites', nbFr(t.move.livraisons)]])}
      ${app('📦', 'Woulib Express', '#/admin/univers', [['colis', nbFr(t.express.colis)], ['livrés', nbFr(t.express.livres)], ['de ventes', eurRond(V.express || 0)], ['projets créés', nbFr(t.projets)]])}
      ${app('🎟️', 'EventPass', '../pass/', [['événements à venir', nbFr(t.eventpass.a_venir)], ['billets', nbFr(t.eventpass.billets)], ['entrées contrôlées', nbFr(t.eventpass.utilises)], ['de billets payés', eurRond(V.eventpass || 0)]])}
      ${app('🏡', 'Kaz An Nou', 'https://immo.ilo-tech.com/', [['logements en ligne', nbFr(t.kaz.logements)], ['réservations', nbFr(t.kaz.reservations)], ['acceptées', nbFr(t.kaz.acceptees)], ['de séjours', eurRond(V.kaz || 0)], ['prestations · ' + t.kaz.faites + ' faites', nbFr(t.kaz.prestations)]])}
      ${app('📊', 'NEXORA', '../nexora/', [['entreprises', nbFr(t.nexora.entreprises)], ['nouvelles', nbFr(t.nexora.nouvelles)], ['factures émises', nbFr(t.nexora.factures)]])}
      ${app('🛠️', 'IloTech (dépannage, devis)', 'https://ilo-tech.com/gestion.html', [['demandes, devis et clients', 'Espace de gestion'], ['', '<a href="https://ilo-tech.com/prospection.html">Prospection</a> · <a href="https://ilo-tech.com/visibilite.html">Visibilité</a>']])}</div>
    ${t.territoires.length ? `<h2>Repas par territoire</h2><div class="tab-t"><table><thead><tr><th>Territoire</th><th class="num">Commandes</th><th class="num">Ventes</th></tr></thead><tbody>${t.territoires.map(x => `<tr><td>${esc(x.territoire)}</td><td class="num">${nbFr(x.commandes)}</td><td class="num">${eurRond(x.ventes)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    <details class="tab-t"><summary>Voir les chiffres jour par jour</summary><table><thead><tr><th>Jour</th><th class="num">Volume d’affaires</th><th class="num">Demandes</th><th class="num">Nouveaux comptes</th></tr></thead>
      <tbody>${t.series.slice().reverse().map(x => `<tr><td>${esc(new Date(x.d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }))}</td><td class="num">${eurRond(x.volume)}</td><td class="num">${nbFr(x.activite)}</td><td class="num">${nbFr(x.comptes)}</td></tr>`).join('')}</tbody></table></details>
    <p class="muted petit">Volume d’affaires : repas livrés ou retirés, courses terminées, colis livrés, billets payés, séjours acceptés, prestations faites. Les visites des sites se suivent dans Google Search Console (A-FAIRE).</p></div>`);
  // survol ou toucher d'une courbe : repère vertical, point et bulle « jour : valeur »
  const survol = e => {
    const fig = e.target.closest('.courbe'); if (!fig) return;
    const zone = fig.querySelector('.courbe-zone'), r = zone.getBoundingClientRect(), val = JSON.parse(fig.dataset.valeurs), n = val.length;
    const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1))));
    const x = n > 1 ? i / (n - 1) : 0, svgEl = zone.querySelector('svg'), trait = svgEl.querySelector('.trait').getAttribute('d').split(/[ML]/).filter(Boolean)[i].trim().split(' ');
    const rep = svgEl.querySelector('.repere'); rep.hidden = false; rep.setAttribute('x1', trait[0]); rep.setAttribute('x2', trait[0]);
    const pt = zone.querySelector('.pt'); pt.hidden = false; pt.style.left = x * 100 + '%'; pt.style.top = (Number(trait[1]) / 150 * 100) + '%';
    const b = zone.querySelector('.bulle'); b.hidden = false; b.textContent = `${val[i][0]} : ${val[i][1]}`; b.style.left = Math.min(Math.max(x * 100, 12), 88) + '%';
  };
  $('#app').onpointermove = survol; $('#app').onpointerdown = survol;
  $('#app').onpointerleave = () => document.querySelectorAll('.courbe .repere,.courbe .pt,.courbe .bulle').forEach(el => { el.hidden = true; });
}

// ce que chaque pro doit à la plateforme ; « Réglé » quand il a payé (il est prévenu)
async function adminCommissions() {
  if (profil?.role !== 'admin') return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  const l = await q(sb.rpc('commissions_a_regler'));
  vue(`<div class="wrap" style="padding-top:22px">${ongletsAdmin('commissions')}<h2>À régler par les pros (${eur(l.reduce((t, x) => t + Number(x.montant), 0))})</h2>
    ${l.map(x => `<div class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto"><div><b>${esc(x.prenom)} ${esc(x.nom)}</b> · ${x.univers.map(u => esc(univers(u)?.nom || u)).join(', ')}
      <div class="muted petit">${x.nb} vente${x.nb > 1 ? 's' : ''} · ${esc(x.email || '')}${x.telephone ? ' · ' + esc(x.telephone) : ''}</div></div>
      <div class="actions"><b style="font-size:18px">${eur(x.montant)}</b>${x.telephone ? `<a class="btn btn-s btn-wa" target="_blank" rel="noopener" href="${wa(x.telephone, `Bonjour ${x.prenom}, voici votre relevé Woulib : ${eur(x.montant)} de commission pour ${x.nb} vente(s). Merci !`)}">Relevé WhatsApp</a>` : ''}
        <button class="btn btn-s btn-ok" data-regle="${x.pro_id}" data-montant="${x.montant}">Réglé</button></div></div>`).join('') || '<p class="muted">Rien à régler pour l’instant.</p>'}</div>`);
  $('#app').onclick = async e => {
    const b = e.target.closest('[data-regle]'); if (!b || !confirm(`Confirmer le règlement de ${eur(b.dataset.montant)} ?`)) return;
    try { await q(sb.rpc('regler_commissions', { pro: b.dataset.regle })); toast('Règlement enregistré, le pro est prévenu.'); adminCommissions(); } catch (err) { toast(erreur(err), true); }
  };
}
async function adminUnivers() {
  if (profil?.role !== 'admin') return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  REGISTRE = null; const reg = await chargerRegistre();
  const mods = await q(sb.from('moderateurs_univers').select('user_id, univers')).catch(() => []);
  const noms = mods.length ? await q(sb.from('contacts').select('id, email').in('id', mods.map(m => m.user_id))).catch(() => []) : [];
  vue(`<div class="wrap" style="padding-top:22px">${ongletsAdmin('univers')}
    <p class="muted">Ouvrez un univers quand il est prêt (les personnes inscrites à l’alerte sont prévenues), fermez-le sur un territoire, réglez ses paramètres, nommez ses modérateurs.</p>
    ${reg.map(u => `<div class="panneau" style="margin-bottom:14px;padding:16px" data-u="${u.code}"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
      <b style="font-size:18px">${u.icone} ${esc(u.nom)}</b><select data-statut aria-label="Statut de ${esc(u.nom)}">${[['actif', 'Ouvert'], ['bientot', 'Bientôt'], ['externe', 'Autre appli'], ['masque', 'Masqué']].map(([k, t]) => `<option value="${k}" ${u.statut === k ? 'selected' : ''} ${k === 'externe' && !u.lien ? 'disabled' : ''}>${t}</option>`).join('')}</select></div>
      <div class="muted petit">${esc(u.description)}${MODULES[u.code] ? '' : u.statut === 'externe' ? '' : ' · écrans pas encore construits : laissez « Bientôt »'}</div>
      ${u.statut === 'actif' ? `<details style="margin-top:8px"><summary class="petit"><b>Territoires</b> (${u.fermes.length ? 'fermé : ' + esc(u.fermes.join(', ')) : 'ouvert partout'})</summary><div class="actions" style="margin-top:8px">
        ${NOMS_TERRITOIRES.map(t => `<label class="petit" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-terr="${esc(t)}" ${u.fermes.includes(t) ? '' : 'checked'} style="width:auto"> ${esc(t)}</label>`).join('')}</div></details>` : ''}
      ${Object.keys(u.parametres || {}).length ? `<details style="margin-top:8px"><summary class="petit"><b>Réglages</b></summary><div class="ligne3" style="margin-top:8px">${Object.entries(u.parametres).map(([k, v]) => `<label class="petit">${esc(k.replace(/_/g, ' '))}<input data-param="${esc(k)}" type="number" value="${esc(v)}"></label>`).join('')}</div></details>` : ''}
      <div class="petit" style="margin-top:8px"><b>Modérateurs :</b> ${mods.filter(m => m.univers === u.code).map(m => `${esc(noms.find(n => n.id === m.user_id)?.email || m.user_id.slice(0, 8))} <button class="lien" data-retirer="${m.user_id}">retirer</button>`).join(', ') || 'aucun'}
        <button class="btn btn-s" data-mod>+ Nommer</button></div></div>`).join('')}</div>`);
  const maj = async (code, champs) => { try { await q(sb.from('univers').update(champs).eq('code', code)); toast('Enregistré.'); } catch (err) { toast(erreur(err), true); } adminUnivers(); };
  $('#app').onchange = async e => {
    const bloc = e.target.closest('[data-u]'); if (!bloc) return; const code = bloc.dataset.u, u = reg.find(x => x.code === code);
    if (e.target.matches('[data-statut]')) {
      if (e.target.value === 'actif' && !MODULES[code] && !confirm('Les écrans de cet univers ne sont pas encore construits. L’ouvrir quand même ?')) return adminUnivers();
      return maj(code, { statut: e.target.value });
    }
    if (e.target.matches('[data-param]')) return maj(code, { parametres: { ...u.parametres, [e.target.dataset.param]: Number(e.target.value) } });
    if (e.target.matches('[data-terr]')) {
      try { await q(sb.from('univers_territoires').upsert({ univers: code, territoire: e.target.dataset.terr, actif: e.target.checked })); toast(e.target.checked ? 'Ouvert sur ce territoire.' : 'Fermé sur ce territoire.'); } catch (err) { toast(erreur(err), true); }
      REGISTRE = null; adminUnivers();
    }
  };
  $('#app').onclick = async e => {
    const bloc = e.target.closest('[data-u]'); if (!bloc) return; const code = bloc.dataset.u;
    if (e.target.closest('[data-mod]')) { const m = prompt('Email du compte à nommer modérateur :'); if (!m) return; try { await q(sb.rpc('ajouter_moderateur', { email_m: m, u: code })); toast('Modérateur nommé.'); adminUnivers(); } catch (err) { toast(erreur(err), true); } }
    const r = e.target.closest('[data-retirer]');
    if (r && confirm('Retirer ce modérateur ?')) { try { await q(sb.from('moderateurs_univers').delete().eq('user_id', r.dataset.retirer).eq('univers', code)); adminUnivers(); } catch (err) { toast(erreur(err), true); } }
  };
}

// les pages des univers sont déclarées par food.js, move.js et gps.js, chargés après ce fichier
document.addEventListener('DOMContentLoaded', demarrer);
// appli installable (écran d'accueil) et utilisable hors connexion pour l'affichage
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
