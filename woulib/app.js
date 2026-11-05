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
let REGISTRE = null, BASE_V2 = false, BOUTIQUES = false;   // BOUTIQUES : la base a reçu boutique.sql
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

const APP = {
  nom: 'Woulib', titre: 'Woulib — repas livrés, VTC, taxis et GPS', accueilConnecte: '#/', apresInscription: '#/bienvenue', pourTel: 'que le restaurant, le chauffeur ou le livreur puisse vous joindre',
  menu: () => [['#/manger', '🍛 Food'], ['#/move', '🚗 Move'], ['#/gps', '🧭 GPS'], ...(moi ? [['#/activite', '🧾 Activité'], ['#/compte', 'Mon compte']] : [['#/pros', 'Professionnels']]), ...(profil?.role === 'admin' ? [['#/admin', 'Admin']] : [])],
  menuBas: () => [['#/', '🏠', 'Accueil'], ['#/manger', '🍛', 'Manger'], ['#/move', '🚗', 'Trajets'], ['#/activite', '🧾', 'Activité'], [moi ? '#/compte' : '#/connexion', '🙂', moi ? 'Compte' : 'Connexion']],
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
    <h2>Mes activités</h2><div class="menu-g">${[['#/activite', '🧾', 'Tout ce qui est en cours', 'Commandes, trajets, colis, en un seul endroit'], ['#/commandes', '🍛', 'Mes commandes', ''], ['#/courses', '🚗', 'Mes trajets', ''], ['#/colis', '📦', 'Mes colis', ''], ['#/projets', '🗂️', 'Mes projets', 'Anniversaire, mariage, séjour…']].map(ligne).join('')}</div>
    <h2>Gagner avec Woulib</h2><div class="menu-g">${[['#/pro', '👩‍🍳', 'Mon restaurant ou ma boutique', 'Carte, articles, stock, commandes en direct'], ['#/chauffeur', '🧑‍✈️', 'Espace chauffeur et livreur', 'Courses, livraisons, colis, gains'], ['#/pros', '💼', 'Toutes les façons de gagner', '']].map(ligne).join('')}</div>
    <h2>Réglages</h2><div class="menu-g">${[['https://immo.ilo-tech.com/#/compte/profil', '🙂', 'Modifier mon profil', ''], ['#/notifs', '🔔', 'Notifications', ''], ['cgu.html', '📄', 'Conditions', ''], [wa(WA, 'Bonjour, j’ai une question sur Woulib.'), '💬', 'Aide sur WhatsApp', '']].map(ligne).join('')}
      ${profil?.role === 'admin' ? ligne(['#/admin', '🛡️', 'Administration', '']) : ''}<a class="menu-l ko" href="#/deconnexion"><span>🚪</span><div><b>Se déconnecter</b></div><i>›</i></a></div></div>`);
};

// activité : tout ce qui est en cours puis l'historique, toutes les applis de Woulib mélangées (comme l'onglet « Activité » d'une appli)
APP.pages.activite = async () => {
  if (!exigeCompte()) return;
  attente(); await chargerRegistre();
  const [cmd, crs, cls] = await Promise.all([
    q(sb.from('commandes').select('id, statut, total, created_at, mode, restaurants(*)').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(30)).catch(() => []),
    q(sb.from('courses').select('id, statut, prix_estime, created_at, depart_txt, arrivee_txt').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(30)).catch(() => []),
    BASE_V2 ? q(sb.rpc('mes_colis')).catch(() => []) : []]);
  const ACT_CMD = ['envoyee', 'acceptee', 'en_preparation', 'prete', 'en_livraison'], ACT_CRS = ['demande', 'acceptee', 'en_route', 'arrivee', 'a_bord'], ACT_COLIS = ['recherche', 'acceptee', 'recupere'];
  const l = [...cmd.map(c => ({ ico: c.restaurants?.genre === 'boutique' ? '🛒' : '🍛', titre: c.restaurants?.nom || 'Commande', sous: `${eur(c.total)} · ${c.mode === 'livraison' ? '🛵 livraison' : '🛍️ à retirer'}`, st: ST_CMD[c.statut], quand: c.created_at, lien: '#/suivi/' + c.id, actif: ACT_CMD.includes(c.statut) })),
    ...crs.map(c => ({ ico: '🚗', titre: `${c.depart_txt} → ${c.arrivee_txt}`, sous: eur(c.prix_estime), st: ST_COURSE[c.statut], quand: c.created_at, lien: '#/course/' + c.id, actif: ACT_CRS.includes(c.statut) })),
    ...cls.map(c => ({ ico: '📦', titre: c.role === 'livreur' ? `Colis à livrer · ${c.depot_txt}` : `Colis pour ${c.depot_nom}`, sous: eur(c.prix), st: ST_COLIS[c.statut], quand: c.created_at, lien: '#/colis/' + c.id, actif: ACT_COLIS.includes(c.statut) }))]
    .sort((a, b) => b.quand.localeCompare(a.quand));
  const carte = x => `<a class="act ${x.actif ? 'actif' : ''}" href="${x.lien}"><span>${x.ico}</span><div><b>${esc(x.titre)}</b><small>${esc(jourHeure(x.quand))} · ${esc(x.sous)}</small></div>${x.st ? tag(x.st) : ''}</a>`;
  const enCours = l.filter(x => x.actif), passe = l.filter(x => !x.actif);
  vue(`<div class="wrap activite"><h1>Activité</h1>
    ${enCours.length ? `<h2>En cours</h2><div class="acts">${enCours.map(carte).join('')}</div>` : ''}
    ${passe.length ? `<h2>Historique</h2><div class="acts">${passe.map(carte).join('')}</div>` : ''}
    ${l.length ? '' : `<div class="vide-etat"><div class="ico">🧾</div><h3>Rien pour l’instant</h3><p class="muted">Vos commandes, vos trajets et vos colis apparaîtront ici.</p><a class="btn btn-p" href="#/">Découvrir Woulib</a></div>`}
    <p class="muted petit" style="margin-top:18px"><a href="#/projets">🗂️ Mes projets</a> · <a href="#/notifs">🔔 Notifications</a></p></div>`);
};

// ---------------------------------------------------------------- administration : chaque univers a son onglet ; les modérateurs ne voient que le leur
const ongletsAdmin = actif => `<h1>Administration</h1><div class="puces">${[['resto', '#/admin', '🍛 Food : restaurants', 'food'], ['woulib', '#/admin/woulib', '🚗 Move : chauffeurs et tarifs', 'move'], ...(BASE_V2 ? [['univers', '#/admin/univers', '🧩 Univers et territoires', null]] : [])]
  .concat(BASE_V2 && profil?.role === 'admin' ? [['commissions', '#/admin/commissions', '💶 Commissions', null]] : [])
  .filter(([, , , u]) => profil?.role === 'admin' || (u && mesModerations.includes(u))).map(([k, h, t]) => `<a href="${h}" class="${actif === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
let mesModerations = [];
APP.pages.admin = async sous => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  mesModerations = (await q(sb.from('moderateurs_univers').select('univers').eq('user_id', moi.id)).catch(() => [])).map(x => x.univers);
  if (sous === 'univers') return adminUnivers();
  if (sous === 'commissions') return adminCommissions();
  if (sous === 'woulib' || (profil?.role !== 'admin' && !mesModerations.includes('food') && mesModerations.includes('move'))) return adminWoulib();
  return adminResto();
};
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
