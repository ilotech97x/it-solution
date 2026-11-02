/* Kivora — l'appli du quotidien : « Manger » (repas.js) et trajets « Woulib » (woulib.js), un seul compte.
   Ce fichier : APP, accueil, espace pro, compte, onglets d'administration. Base commune : commun/base.js. */
'use strict';
const ZONE_WOULIB = /^#\/(woulib|course|courses|chauffeur|livraison|partage|admin\/woulib)\b/;

const APP = {
  nom: 'Kivora', titre: 'Kivora — repas livrés et chauffeurs Woulib', accueilConnecte: '#/', pourTel: 'que le restaurant ou le chauffeur puisse vous joindre',
  menu: () => [['#/manger', '🍽️ Manger'], ['#/woulib', '🚗 Woulib'], moi ? ['#/compte', 'Mon compte'] : ['#/pros', 'Professionnels'], ...(profil?.role === 'admin' ? [['#/admin', 'Admin']] : [])],
  menuBas: () => [['#/', '🏠', 'Accueil'], ['#/manger', '🍽️', 'Manger'], ['#/woulib', '🚗', 'Woulib'], ['#/notifs', '🔔', 'Alertes', nbNotifs], [moi ? '#/compte' : '#/connexion', '🙂', moi ? 'Compte' : 'Connexion']],
  // à chaque changement de page : arrêter les rafraîchissements, couper le GPS hors de l'espace chauffeur, couleurs de la partie visitée
  quitter: h => {
    clearInterval(suivi); suivi = null; clearInterval(minuterie); minuterie = null;
    if (h !== '#/chauffeur' && !h.startsWith('#/livraison/') && suiviGps !== null) { navigator.geolocation.clearWatch(suiviGps); suiviGps = null; }
    document.body.dataset.zone = ZONE_WOULIB.test(h) ? 'woulib' : 'repas';
  },
  pages: {}
};

const blocPros = () => `<div class="univers">
  <a class="univ" href="#/pro"><span class="u-ico">👩‍🍳</span><b>Restaurateurs</b><span>Votre carte en ligne, les commandes en direct sur votre téléphone, vos clients vous paient directement. Inscription gratuite pour démarrer.</span><em class="btn btn-p">Inscrire mon restaurant</em></a>
  <a class="univ univ-woulib" href="#/chauffeur"><span class="u-ico">🧑‍✈️</span><b>Chauffeurs VTC et taxis</b><span>Recevez des courses près de vous, acceptez celles qui vous arrangent, le client vous paie directement. Carte professionnelle exigée.</span><em class="btn btn-p">Devenir chauffeur Woulib</em></a></div>`;

APP.pages[''] = async () => {
  vue(`<section class="hero"><div class="wrap">
    <div class="press"><span class="clignote">✨</span> Une appli pour le quotidien</div>
    <h1>Manger, se déplacer : <em>tout avec Kivora</em>.</h1>
    <p>Les restaurants d’ici livrés ou à emporter, et des chauffeurs VTC et taxis vérifiés avec Woulib. Un seul compte, et vous payez directement le restaurant ou le chauffeur.</p></div></section>
    <div class="wrap"><div class="univers">
      <a class="univ" href="#/manger"><span class="u-ico">🍽️</span><b>Manger</b><span>Restaurants, snacks, traiteurs et boulangeries : livraison ou à emporter, suivi de la commande en direct.</span><em class="btn btn-p">Commander un repas</em></a>
      <a class="univ univ-woulib" href="#/woulib"><span class="u-ico">🚗</span><b>Woulib</b><span>Un VTC ou un taxi professionnel, au prix estimé avant de réserver. Vous suivez votre chauffeur sur la carte.</span><em class="btn btn-p">Réserver un trajet</em></a></div>
      <section class="section"><h2>Tout l’écosystème Kivora</h2><p class="muted">Déjà ouverts sur nos autres applis, ou en préparation. Demandez à être prévenu de l’ouverture.</p>
        <div class="univers-mini" id="univers">${UNIVERS.map(([k, i, t, d, lien]) => `<div class="umini"><span class="u-ico">${i}</span><div><b>${t}</b> ${lien ? '<span class="tag ok">Ouvert</span>' : '<span class="tag att">Bientôt</span>'}<div class="muted petit">${d}</div></div>
          ${lien ? `<a class="btn btn-s" href="${lien}">Ouvrir</a>` : `<button class="btn btn-s" data-alerte="${k}">🔔 Me prévenir</button>`}</div>`).join('')}</div></section>
      <section class="section"><h2>Vous êtes professionnel ?</h2>${blocPros()}</section></div>`);
  if (moi) {   // univers pour lesquels le visiteur a déjà demandé à être prévenu
    const deja = await q(sb.from('alertes_univers').select('univers')).catch(() => []);
    deja.forEach(a => { const b = document.querySelector(`[data-alerte="${a.univers}"]`); if (b) { b.textContent = '✓ Vous serez prévenu'; b.disabled = true; } });
  }
  $('#univers').onclick = async e => {
    const b = e.target.closest('[data-alerte]'); if (!b || !exigeCompte()) return;
    try { await q(sb.from('alertes_univers').insert({ univers: b.dataset.alerte })); b.textContent = '✓ Vous serez prévenu'; b.disabled = true; toast('C’est noté : nous vous préviendrons à l’ouverture.'); } catch (err) { toast(erreur(err), true); }
  };
};
// univers prévus (dossier « Kivora super-app ») : ouverts ailleurs dans l'écosystème, ou annoncés « bientôt » sans être présentés comme disponibles
const UNIVERS = [['events', '🎟️', 'Events', 'Concerts, soirées, festivals, billets QR code', 'https://ilo-tech.com/pass/'],
  ['living', '🏡', 'Living', 'Villas, gîtes, ménage, accueil, jardin', 'https://immo.ilo-tech.com/'],
  ['express', '📦', 'Express', 'Colis, documents et courses urgentes par coursier'], ['market', '🛍️', 'Market', 'Boutiques et produits locaux livrés'],
  ['services', '🔧', 'Services', 'Dépannage, plomberie, électricité, ménage sur rendez-vous'], ['experiences', '🌴', 'Expériences', 'Excursions, activités et sorties'],
  ['rental', '🚙', 'Rental', 'Location de voitures, scooters et matériel'], ['daily', '🧺', 'Daily', 'Courses du quotidien livrées'], ['ai', '🤖', 'Kivora AI', 'Un assistant qui organise tout pour vous']];
APP.pages.pros = async () => vue(`<div class="wrap" style="padding-top:22px"><h1>Professionnels</h1><p class="muted">Chaque restaurant et chaque chauffeur est vérifié avant sa mise en ligne.</p>${blocPros()}</div>`);

APP.pages.compte = async () => {
  if (!exigeCompte()) return;
  vue(`<div class="wrap"><div class="carte-f"><h1>Mon compte</h1><p>${esc(profil?.prenom)} ${esc(profil?.nom)}<br><span class="muted">${esc(moi.email)}</span></p>
    <div class="actions"><a class="btn" href="#/commandes">🧾 Mes commandes</a><a class="btn" href="#/courses">🚗 Mes courses</a><a class="btn" href="#/pro">👩‍🍳 Espace restaurateur</a><a class="btn" href="#/chauffeur">🧑‍✈️ Espace chauffeur</a>
      <a class="btn" href="https://immo.ilo-tech.com/#/compte/profil">Modifier mon profil</a><a class="btn btn-ko" href="#/deconnexion">Se déconnecter</a></div></div></div>`);
};

const ongletsAdmin = actif => `<h1>Administration</h1><div class="puces"><a href="#/admin" class="${actif === 'resto' ? 'on' : ''}">🍽️ Restaurants</a><a href="#/admin/woulib" class="${actif === 'woulib' ? 'on' : ''}">🚗 Woulib : chauffeurs et tarifs</a></div>`;
APP.pages.admin = sous => sous === 'woulib' ? adminWoulib() : adminResto();

// les pages des deux parties sont déclarées par repas.js et woulib.js, chargés après ce fichier
document.addEventListener('DOMContentLoaded', demarrer);
// appli installable (écran d'accueil) et utilisable hors connexion pour l'affichage
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
