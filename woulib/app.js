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

// icônes de l'interface : un seul dessin au trait (24 px, épaisseur 2), la couleur suit le texte. Mêmes tracés que les maquettes ;
// les emoji restent réservés au contenu (cuisines, rayons, lieux enregistrés).
const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICO = Object.fromEntries(Object.entries({
  accueil: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z', manger: 'M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 1.5-3 4-3 7h3v11',
  bouger: 'M3 11 21 3l-8 18-2-8z', activite: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6', compte: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  cloche: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4', retour: 'M15 6l-6 6 6 6', droite: 'M9 6l6 6-6 6', bas: 'M6 9l6 6 6-6', croix: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14',
  recherche: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', commerce: 'M4 9h16l-1-5H5zM5 9v11h14V9M9 20v-6h6v6', colis: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  horloge: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2', pin: 'M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  coeur: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z', carte: 'M3 6h18v12H3zM3 10h18', bouclier: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4',
  donnees: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3', aide: 'M4 5h16v11H8l-4 4z',
  pro: 'M4 8h16v12H4zM9 8V5h6v3', gens: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6', taxi: 'M5 17h14v-5l-2-5H7l-2 5zM5 17v2M19 17v2M5 12h14',
  gps: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z', calendrier: 'M4 5h16v16H4zM4 10h16M9 3v4M15 3v4', billet: 'M4 6h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4zM14 6v12',
  maison: 'M3 10.5 12 3l9 7.5M5 9v12h14V9M10 21v-6h4v6', drapeau: 'M5 21V4h11l-2 4 2 4H5', etoile: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  coche: 'M5 12l4 4 10-10', document: 'M6 3h9l4 4v14H6zM14 3v5h5', sortie: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', telephone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
  localiser: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', avion: 'M3 13l7-2 4-7h2l-1 7 6 2v2l-6-1-2 5h-2l1-5-7 1z', poubelle: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14',
  partage: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6', info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.5'
}).map(([k, d]) => [k, svg(d)]));
ICO.trajets = ICO.bouger;
// territoire que l'appli montre : celui choisi sur cet appareil, sinon celui du profil, sinon la Martinique
const territoireActif = () => { const t = terrPrefere() || profil?.territoire || 'Martinique'; return TERRITOIRES[t] && t !== 'Autre pays' ? t : 'Martinique'; };
const APP = {
  nom: 'Woulib', titre: 'Woulib — repas livrés, VTC, taxis et GPS', accueilConnecte: '#/', apresInscription: '#/bienvenue', pourTel: 'que le restaurant, le chauffeur ou le livreur puisse vous joindre',
  menu: () => [],
  menuBas: () => [['#/', ICO.accueil, 'Accueil'], ['#/manger', ICO.manger, 'Manger'], ['#/bouger', ICO.bouger, 'Bouger'], ['#/activite', ICO.activite, 'Activité'], [moi ? '#/compte' : '#/connexion', ICO.compte, moi ? 'Compte' : 'Connexion']],
  // ordinateur : le rail latéral porte aussi le logo et l'espace pro (ce ne sont pas des onglets du téléphone)
  enteteRail: () => '<a class="rail-logo" href="#/" aria-label="Woulib, accueil">Woulib</a>',
  menuRail: () => [['#/espace-pro', ICO.pro, 'Espace pro']],
  apresNav: () => {
    const b = $('#terrApp'); if (!b) return;
    const t = territoireActif(); b.innerHTML = `${ICO.pin}<span>${esc(t)}</span>${ICO.bas}`; b.setAttribute('aria-label', `Choisir le territoire, actuellement ${t}`);
  },
  icones: () => ICO,
  differes: { gps: 'gps.js?v=5', projets: 'projets.js?v=3', projet: 'projets.js?v=3', assistance: 'compte.js?v=2', recherche: 'recherche.js?v=1' },   // chargés à la première ouverture
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

// taux de commission affichés aux pros (réglés dans l'administration ; repli : taux de départ). Commerces : taux à part (commissions.sql)
const tauxPro = (code, cle = 'commission_pct') => Number(univers(code)?.parametres?.[cle] ?? ({ commission_commerces_pct: { food: 5 } }[cle] || { food: 10, move: 10, living: 8, events: 5 })[code] ?? 0);
const POURQUOI = [['Plus juste pour les pros', 'Commission de 5 à 10 %, quand les grandes plateformes prennent souvent 25 à 30 %.'],
  ['Vous payez directement', 'Espèces ou carte, au restaurant, au chauffeur ou au livreur. Personne ne garde votre argent.'],
  ['D’ici, pour ici', 'Restaurants, chauffeurs et livreurs de votre île, vérifiés un par un.'],
  ['Sécurité', 'Code de remise à la livraison, trajet partagé en direct avec un proche, bouton d’urgence.']];
// covoiturage et entraide : présentés dans Bouger seulement (ouverture après avis juridique, AUDIT partie 13)
const DANS_BOUGER = ['covoiturage', 'entraide'];
// autres applis et services de l'écosystème : une icône au trait par univers
const ICO_UNIVERS = { events: 'billet', living: 'maison', services: 'pro', experiences: 'etoile', express: 'colis', market: 'commerce', daily: 'commerce', rental: 'taxi', pay: 'carte', ai: 'aide' };
// univers tenus par une autre appli de l'écosystème : un nom clair et l'appli où l'on arrive
const EXTERNES = { events: ['Événements et billets', 'EventPass'], experiences: ['Excursions et activités', 'EventPass'], living: ['Logements', 'Kaz An Nou'], services: ['Services à domicile', 'Kaz An Nou'] };

// territoire : feuille du bas ouverte depuis la barre du haut ; le choix est gardé sur l'appareil
function choisirTerritoire() {
  const d = document.createElement('dialog'), t = territoireActif(); d.className = 'feuille'; d.setAttribute('aria-labelledby', 'tTerr');
  d.innerHTML = `<h2 id="tTerr">Où êtes-vous ?</h2><p class="muted petit">Woulib vous montre les restaurants, les commerces et les chauffeurs de ce territoire.</p>
    <div class="choix-l">${NOMS_TERRITOIRES.filter(x => x !== 'Autre pays').map(x => `<button type="button" data-terr="${esc(x)}" aria-pressed="${x === t}">${ICO.pin}<span>${esc(x)}</span>${x === t ? ICO.coche : ''}</button>`).join('')}</div>
    <button type="button" class="btn btn-plein" data-fermer style="margin-top:14px">Fermer</button>`;
  document.body.append(d); d.showModal();
  d.addEventListener('click', e => {
    const b = e.target.closest('[data-terr]');
    if (b) { terrPrefere(b.dataset.terr); oublier(''); d.close(); toast(`Territoire : ${b.dataset.terr}`); rendre(); }
    else if (e.target.closest('[data-fermer]') || e.target === d) d.close();
  });
  d.addEventListener('close', () => d.remove());
}
document.addEventListener('click', e => { if (e.target.closest('#terrApp')) choisirTerritoire(); });

// une petite carte de restaurant ou de commerce pour les rangées qui défilent (accueil)
const carteRangee = (x, n) => { const e = etatOuverture(x); return `<a class="carte-r" href="#/resto/${x.id}"><span class="cr-img ${estBoutique(x) ? 't-com' : 't-food'}">${x.photo ? `<img src="${esc(photo(x.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">${CUISINES[x.cuisine]?.[0] || '🍽️'}</span>`}</span>
  <span class="cr-corps"><b>${esc(x.nom)}</b><small>${esc(CUISINES[x.cuisine]?.[1] || '')} · ${x.delai_min} min${n ? ` · ★ ${String(n.moyenne).replace('.', ',')}` : ''}</small>${e.ouvert ? '' : `<small class="att">${esc(e.texte ? e.texte[0].toUpperCase() + e.texte.slice(1) : 'Fermé')}</small>`}</span></a>`; };

// accueil : bonjour, une recherche, quatre raccourcis, ce qui est en cours, puis des rangées faites de vraies données
APP.pages[''] = async () => {
  const reg = await chargerRegistre(), terr = territoireActif();
  const ouvert = c => universOuvert(c, terr);
  const bientot = reg.filter(u => u.statut === 'bientot' && !DANS_BOUGER.includes(u.code));
  const externes = reg.filter(u => u.statut === 'externe' && u.lien);
  // 3ᵉ et 4ᵉ raccourcis : Commerces et Colis quand ils sont ouverts, sinon le GPS et « Organiser »
  const avecCom = ouvert('food') && BOUTIQUES, avecColis = ouvert('express');
  const R = [ouvert('food') && ['#/manger', ICO.manger, 'Commander à manger', 't-food'], ouvert('move') && ['#/bouger', ICO.bouger, 'Se déplacer', 't-move'],
    avecCom ? ['#/manger?vue=commerces', ICO.commerce, 'Commerces', 't-com'] : ['#/gps', ICO.gps, 'GPS et alertes route', 't-com'],
    avecColis ? ['#/express', ICO.colis, 'Envoyer un colis', 't-colis'] : ['#/projets', ICO.calendrier, 'Organiser un événement', 't-colis']].filter(Boolean);
  const services = [...(avecCom ? [['#/gps', ICO.gps, 'GPS et alertes route', 'Itinéraire, guidage à la voix, accidents et routes coupées']] : []),
    ...(avecColis ? [['#/projets', ICO.calendrier, 'Organiser un événement', 'Anniversaire, mariage, séjour : la liste et le budget']] : []),
    ...externes.map(u => [u.lien, ICO[ICO_UNIVERS[u.code]] || ICO.droite, EXTERNES[u.code]?.[0] || u.nom.replace('Woulib ', ''), u.description + (EXTERNES[u.code] ? ` · sur ${EXTERNES[u.code][1]}, même compte` : '')])];
  vue(`<div class="wrap accueil">
    <div class="bonjour"><h1>${moi && profil?.prenom ? `Bonjour ${esc(profil.prenom)}` : 'Woulib, tout le quotidien'}</h1><p class="muted">Que voulez-vous faire aujourd’hui ?</p></div>
    <a class="rch-lien" href="#/recherche">${ICO.recherche}<span>Pizza, épicerie, aller au Lamentin…</span></a>
    <nav class="raccourcis" aria-label="Raccourcis">${R.map(([h, i, t, c]) => `<a class="raccourci ${c}" href="${h}">${i}<b>${t}</b></a>`).join('')}</nav>
    ${blocInstallation()}
    <div id="enCours"></div>
    <section class="section" id="restosAccueil" hidden><div class="titre-s"><h2>Restaurants ouverts</h2><a href="#/manger">Tout voir</a></div><div class="defile rangee" id="restosListe"></div></section>
    <section class="section" id="platsAcc" hidden></section>
    <section class="section" id="boutiqueAcc" hidden></section>
    <section class="section" id="commercesAcc" hidden></section>
    ${services.length ? `<section class="section"><h2>Autres services</h2><div class="liste-g">${services.map(([h, i, t, d]) => `<a class="menu-l" href="${esc(h)}"><span class="ico-l">${i}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div>${ICO.droite}</a>`).join('')}</div></section>` : ''}
    <a class="banniere-pro" href="#/pros"><span class="ico-l">${ICO.pro}</span><span><b>Gagner avec Woulib</b><small>Restaurant, commerce, chauffeur, livreur : inscription gratuite</small></span>${ICO.droite}</a>
    ${moi ? '' : `<section class="section"><h2>Pourquoi Woulib ?</h2><div class="pourquoi">${POURQUOI.map(([t, d]) => `<div><b>${t}</b><small>${d}</small></div>`).join('')}</div></section>`}
    ${bientot.length ? `<section class="section"><h2>Bientôt sur Woulib</h2><div class="defile" id="univers">${bientot.map(u => `<button type="button" class="pastille-u" data-alerte="${u.code}" title="${esc(u.description)}"><span class="ico-l">${ICO[ICO_UNIVERS[u.code]] || ICO.etoile}</span><b>${esc(u.nom.replace('Woulib ', ''))}</b><small>Me prévenir</small></button>`).join('')}</div></section>` : ''}</div>`);
  if ($('#univers')) $('#univers').onclick = async e => {
    const b = e.target.closest('[data-alerte]'); if (!b || !exigeCompte()) return;
    try { await q(sb.from('alertes_univers').insert({ univers: b.dataset.alerte })); b.querySelector('small').textContent = '✓ Prévenu'; b.disabled = true; toast('C’est noté : nous vous préviendrons à l’ouverture.'); } catch (err) { toast(erreur(err), true); }
  };
  // ce qui est en cours passe avant tout : commande, achat ou course, avec une barre d'avancement
  if (moi) {
    const [cmd, crs, deja] = await Promise.all([
      q(sb.from('commandes').select('id, statut, restaurants(nom, genre)').eq('client_id', moi.id).in('statut', ['envoyee', 'acceptee', 'en_preparation', 'prete', 'en_livraison']).order('created_at', { ascending: false }).limit(2)).catch(() => []),
      q(sb.from('courses').select('id, statut, arrivee_txt').eq('client_id', moi.id).in('statut', ['demande', 'acceptee', 'en_route', 'arrivee', 'a_bord']).order('created_at', { ascending: false }).limit(1)).catch(() => []),
      q(sb.from('alertes_univers').select('univers')).catch(() => [])]);
    const pas = (l, st) => Math.max(1, l.findIndex(e => e[0] === st) + 1) / l.length * 100;
    const ec = (h, ico, c, t, s, p) => `<a class="en-cours" href="${h}"><span class="ico-t ${c}">${ico}</span><span class="ec-t"><b>${esc(t)}</b><small>${esc(s)}</small><i class="prog"><i style="width:${p}%"></i></i></span><em>Suivre</em></a>`;
    if ($('#enCours')) $('#enCours').innerHTML = [...cmd.map(c => ec('#/suivi/' + c.id, estBoutique(c.restaurants) ? ICO.commerce : ICO.manger, estBoutique(c.restaurants) ? 't-com' : 't-food', c.restaurants?.nom || 'Votre commande', `${estBoutique(c.restaurants) ? 'Achat' : 'Repas'} · ${ST_CMD[c.statut]?.[1] || ''}`, pas(ETAPES, c.statut))),
      ...crs.map(c => ec('#/course/' + c.id, ICO.taxi, 't-move', 'Vers ' + c.arrivee_txt, 'Taxi/VTC · ' + (ST_COURSE[c.statut]?.[1] || ''), pas(ETAPES_C, c.statut)))].join('');
    deja.forEach(a => { const b = document.querySelector(`[data-alerte="${a.univers}"]`); if (b) { b.querySelector('small').textContent = '✓ Prévenu'; b.disabled = true; } });
  }
  if (ouvert('food')) {
    const boutique = afficherBoutiqueAccueil(terr).catch(() => {});
    const r = sb.from('restaurants').select('*').eq('statut', 'publie').eq('ouvert', true).eq('territoire', terr).order('created_at', { ascending: false }).limit(30);
    const tous = (await memo('acc-restos:' + terr, () => q(r)).catch(() => [])).filter(x => etatOuverture(x).ouvert);
    const l = tous.filter(x => !estBoutique(x)).slice(0, 10), com = tous.filter(estBoutique).slice(0, 6);
    const notes = l.length ? Object.fromEntries((await memo('acc-notes:' + terr, () => q(sb.from('notes_resto').select('*').in('restaurant_id', l.map(x => x.id)))).catch(() => [])).map(x => [x.restaurant_id, x])) : {};
    await boutique;
    if (l.length && $('#restosListe')) { $('#restosListe').innerHTML = l.map(x => carteRangee(x, notes[x.id])).join(''); $('#restosAccueil').hidden = false; }
    if (com.length && $('#commercesAcc')) { $('#commercesAcc').innerHTML = `<div class="titre-s"><h2>Commerces ouverts</h2><a href="#/manger?vue=commerces">Tout voir</a></div><div class="pastilles-c">${com.map(x => `<a class="pastille-c" href="#/resto/${x.id}"><i aria-hidden="true"></i>${esc(x.nom)} · ${esc(x.commune)}</a>`).join('')}</div>`; $('#commercesAcc').hidden = false; }
    await afficherPlatsAccueil(l).catch(() => {});
  }
};

// « Espace pro » du rail (ordinateur) : l'espace du compte, ou la page pour le devenir
APP.pages['espace-pro'] = async () => {
  if (!moi) return rediriger('#/pros');
  const [r, ch] = await Promise.all([q(sb.from('restaurants').select('id').eq('owner', moi.id).limit(1)).catch(() => []), q(sb.from('chauffeurs').select('id').eq('id', moi.id)).catch(() => [])]);
  rediriger(r.length ? '#/pro' : ch.length ? '#/chauffeur' : '#/pros');
};

// juste après l'inscription : choisir ce qu'on vient faire (chacun peut proposer ses services, vérifié avant publication)
const PROFILS = () => [[ICO.accueil, 'Commander et me déplacer', 'Repas, courses, VTC, taxis, GPS. C’est gratuit.', '#/', null],
  [ICO.manger, 'J’ai un restaurant, un snack, un traiteur', 'Votre carte en ligne, des livreurs sans en embaucher.', '#/pro/resto/nouveau', `Commission ${tauxPro('food')} % sur les repas`],
  ...!BOUTIQUES ? [] : [[ICO.commerce, 'J’ai un commerce : boissons, épicerie, dépannage', 'Votre boutique en ligne : les clients remplissent leur panier, vous livrez ou ils passent prendre.', '#/pro/boutique/nouveau', `Commission ${tauxPro('food', 'commission_commerces_pct')} % sur les ventes`]],
  [ICO.taxi, 'Je suis chauffeur VTC ou taxi', 'Des courses près de chez vous, payées directement par le client.', '#/chauffeur', `Commission ${tauxPro('move')} % sur les courses`],
  [ICO.colis, 'Je veux livrer (scooter, vélo, voiture)', 'Les frais de livraison et 100 % des pourboires pour vous.', '#/chauffeur', 'Commission 10 % sur les frais de livraison, 0 % sur les pourboires'],
  [ICO.pro, 'Je propose mes services', 'Ménage, jardin, bricolage, informatique, conciergerie…', 'https://immo.ilo-tech.com/#/compte/partenaire', `Commission ${tauxPro('living')} % sur les prestations`],
  [ICO.maison, 'Je loue un logement', 'Villa, gîte, appartement : vos réservations, vos règles.', 'https://immo.ilo-tech.com/#/compte/logements', `Commission ${tauxPro('living')} % sur les séjours`],
  [ICO.billet, 'J’organise des événements', 'Billets QR code, contrôle à l’entrée, liste des participants.', '../pass/#/orga', `Commission ${tauxPro('events')} % sur les billets payants, 0 % sur les gratuits`]];
const cartesProfils = l => `<div class="profils liste-g">${l.map(([i, t, d, h, c]) => `<a class="profil-c" href="${h}"><span class="ico-t">${i}</span><div><b>${t}</b><small>${d}</small>${c ? `<em>${c} · inscription gratuite</em>` : ''}</div>${ICO.droite}</a>`).join('')}</div>`;
APP.pages.bienvenue = async () => {
  await chargerRegistre();
  vue(`<div class="wrap bienvenue"><h1>Bienvenue${profil?.prenom ? ' ' + esc(profil.prenom) : ''} !</h1><p class="muted">Que voulez-vous faire avec Woulib ? Tout se fait avec le même compte, et vous pourrez en faire plusieurs.</p>${cartesProfils(PROFILS())}</div>`);
};
APP.pages.pros = async () => {
  await chargerRegistre();
  vue(`<div class="wrap bienvenue"><h1>Gagnez avec Woulib</h1><p class="muted">Inscription gratuite. Vos clients vous paient directement ; Woulib prend seulement une petite commission sur ce que vous vendez, réglée une fois par mois. Chaque pro est vérifié avant sa mise en ligne.</p>
    ${cartesProfils(PROFILS().slice(1))}
    <section class="section"><h2>Pourquoi les pros choisissent Woulib</h2><div class="pourquoi">${[['Une commission juste', 'De 5 à 10 % selon l’activité, contre souvent 25 à 30 % sur les grandes plateformes. Pas d’abonnement, pas de frais d’inscription.'],
      ['Votre argent tout de suite', 'Le client vous paie directement. Vous réglez la commission une fois par mois.'],
      ['Tout depuis le téléphone', 'Commandes et courses en direct, carte, horaires, codes promo, chiffres du mois.'],
      ['Local et proche', 'Une équipe en Martinique, joignable sur WhatsApp.']].map(([t, d]) => `<div><b>${t}</b><small>${d}</small></div>`).join('')}</div></section></div>`);
};

// profil, sécurité, confidentialité, assistance, signaler : compte.js, chargé à la première ouverture
const chargerCompte = () => chargerScript(APP.differes.assistance);
// compte : qui je suis, puis des groupes courts (maquette « Compte ») ; l'espace pro n'apparaît que si le compte en a un
const emailMasque = e => String(e || '').replace(/^(.)[^@]*(@.*)$/, '$1•••$2');
APP.pages.compte = async sous => {
  if (!exigeCompte()) return;
  if (sous) { await chargerCompte(); return APP.sousCompte(sous); }
  const [mods, resto, ch] = await Promise.all([profil?.role === 'admin' ? [] : q(sb.from('moderateurs_univers').select('univers').eq('user_id', moi.id)).catch(() => []),
    memo('mon-resto:' + moi.id, () => q(sb.from('restaurants').select('id, genre').eq('owner', moi.id).limit(1))).catch(() => []),
    memo('mon-chauffeur:' + moi.id, () => q(sb.from('chauffeurs').select('id, type').eq('id', moi.id))).catch(() => [])]);
  mesModerations = mods.map(x => x.univers);
  const ligne = ([h, i, t, d, c]) => `<a class="menu-l ${c || ''}" href="${esc(h)}"><span class="ico-l">${i}</span><div><b>${t}</b>${d ? `<small>${d}</small>` : ''}</div>${ICO.droite}</a>`;
  const groupe = (t, l) => `<section class="groupe-c" aria-label="${t}"><h2>${t}</h2><div class="menu-g">${l.map(ligne).join('')}</div></section>`;
  const bq = resto[0]?.genre === 'boutique';
  vue(`<div class="wrap compte-app">
    <div class="moi-c"><span class="avatar" aria-hidden="true">${esc((profil?.prenom || moi.email || '?')[0].toUpperCase())}</span><div><h1>${esc(profil?.prenom || '')} ${esc(profil?.nom || '')}</h1><span class="muted petit">${esc(emailMasque(moi.email))} · ${esc(territoireActif())}</span></div>
      <a class="btn btn-s" href="#/compte/profil" aria-label="Modifier mon profil : nom, téléphone, territoire">Modifier</a></div>
    ${blocInstallation()}
    ${groupe('Mon compte', [['#/compte/adresses', ICO.pin, 'Adresses', 'Maison, travail : pour vos courses et vos livraisons'], ['#/compte/favoris', ICO.coeur, 'Favoris', 'Restaurants et commerces'],
      ['#/compte/paiement', ICO.carte, 'Moyens de paiement', 'Pour l’instant : payé au livreur, au chauffeur ou au commerçant'], ['#/activite', ICO.activite, 'Mon activité', 'Commandes, achats, trajets, colis'], ['#/projets', ICO.calendrier, 'Mes projets', 'Anniversaire, mariage, séjour…']])}
    ${groupe('Réglages', [['#/notifs', ICO.cloche, 'Notifications', 'Commandes, trajets, réponses de l’équipe'], ['#/compte/securite', ICO.bouclier, 'Sécurité', 'Mot de passe, appareils connectés'],
      ['#/compte/confidentialite', ICO.donnees, 'Confidentialité', 'Télécharger mes données, supprimer mon compte']])}
    ${groupe('Espace pro', [...resto.length ? [['#/pro', bq ? ICO.commerce : ICO.manger, bq ? 'Ma boutique' : 'Mon restaurant', 'Carte, articles, stock, commandes en direct']] : [],
      ...ch.length ? [['#/chauffeur', ch[0].type === 'livreur' ? ICO.colis : ICO.taxi, 'Espace chauffeur et livreur', 'Courses, livraisons, colis, gains']] : [], ['#/pros', ICO.pro, 'Devenir partenaire', 'Restaurant, commerce, chauffeur, livreur']])}
    ${groupe('Aide', [['#/assistance', ICO.aide, 'Assistance', 'Une question, un problème, mes signalements'], [wa(WA, 'Bonjour, j’ai une question sur Woulib.'), ICO.telephone, 'Aide sur WhatsApp', '0696 48 26 78'],
      ['cgu.html', ICO.document, 'Conditions d’utilisation', ''], ['confidentialite.html', ICO.document, 'Politique de confidentialité', ''],
      ...profil?.role === 'admin' || mesModerations.length ? [['#/admin', ICO.bouclier, 'Administration', '']] : [], ['#/deconnexion', ICO.sortie, 'Se déconnecter', '', 'ko']])}</div>`);
};
// bouton « Signaler » d'un restaurant, d'une commande, d'une course… (data-signaler = type, data-id, data-univers, data-nom)
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-signaler]'); if (!b) return;
  e.preventDefault(); if (!exigeCompte()) return;
  try { await chargerCompte(); APP.signaler(b.dataset); } catch (err) { toast(erreur(err), true); }
});

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
  // chaque domaine garde son icône, sa couleur et ses propres statuts (Activité, maquette)
  const TYPES = { repas: [ICO.manger, 't-food', 'Repas'], achats: [ICO.commerce, 't-com', 'Achat'], colis: [ICO.colis, 't-colis', 'Colis'], trajets: [ICO.taxi, 't-move', 'Taxi/VTC'] };
  const jour = d => fmt(d, { weekday: 'short', day: 'numeric', month: 'short' });
  const l = [...cmd.map(c => { const t = estBoutique(c.restaurants) ? 'achats' : 'repas'; return { type: t, titre: c.restaurants?.nom || 'Commande', sous: `${TYPES[t][2]} · ${jour(c.created_at)} · ${eur(c.total)}${c.mode === 'livraison' ? ' · livraison' : ' · à retirer'}`,
      st: ST_CMD[c.statut], quand: c.created_at, lien: '#/suivi/' + c.id, actif: ACT_CMD.includes(c.statut), encore: ['livree', 'retiree'].includes(c.statut) ? [c.id, c.restaurant_id] : null }; }),
    ...crs.map(c => ({ type: 'trajets', titre: `${c.depart_txt} → ${c.arrivee_txt}`, sous: `Taxi/VTC · ${jour(c.created_at)} · ${eur(c.prix_estime)}`, st: ST_COURSE[c.statut], quand: c.created_at, lien: '#/course/' + c.id, actif: ACT_CRS.includes(c.statut) })),
    ...cls.map(c => ({ type: 'colis', titre: c.role === 'livreur' ? `Colis à livrer · ${c.depot_txt}` : `Colis pour ${c.depot_nom}`, sous: `Colis · ${jour(c.created_at)} · ${eur(c.prix)}`, st: ST_COLIS[c.statut], quand: c.created_at, lien: '#/colis/' + c.id, actif: ACT_COLIS.includes(c.statut) }))]
    .filter(x => !f || x.type === f).sort((a, b) => b.quand.localeCompare(a.quand));
  const ico = x => `<span class="ico-t ${TYPES[x.type][1]}">${TYPES[x.type][0]}</span>`;
  const carte = x => `<div class="act-l"><a class="act actif" href="${x.lien}">${ico(x)}<span class="act-t"><b>${esc(x.titre)}</b><small>${esc(x.sous)}</small>${x.st ? tag(x.st) : ''}</span><em class="act-b">Suivre</em></a></div>`;
  const ligne = x => `<div class="act-l"><a class="act" href="${x.lien}">${ico(x)}<span class="act-t"><b>${esc(x.titre)}</b><small>${esc(x.sous)}</small></span>${x.st ? `<span class="act-st ${x.st[0]}">${esc(x.st[1])}</span>` : ''}</a>
    ${x.encore ? `<button type="button" class="btn btn-s" data-encore="${x.encore[0]}" data-resto="${x.encore[1]}">Recommander</button>` : ''}</div>`;
  const enCours = l.filter(x => x.actif), passe = l.filter(x => !x.actif);
  const FILTRES = [['', 'Tout'], ['repas', 'Repas'], ...BOUTIQUES ? [['achats', 'Achats']] : [], ['colis', 'Colis'], ['trajets', 'Taxi/VTC']];
  vue(`<div class="wrap activite"><h1>Activité</h1><div class="puces" role="group" aria-label="Filtrer">${FILTRES.map(([k, t]) => `<a href="#/activite${k ? '?f=' + k : ''}" class="${f === k ? 'on' : ''}" ${f === k ? 'aria-current="true"' : ''}>${t}</a>`).join('')}</div>
    ${enCours.length ? `<h2>En cours</h2><div class="acts">${enCours.map(carte).join('')}</div>` : ''}
    ${passe.length ? `<h2>Historique</h2><div class="acts histo">${passe.map(ligne).join('')}</div>` : ''}
    ${l.length ? '' : `<div class="vide-etat"><span class="ico">${ICO.activite}</span><h3>Rien ici pour l’instant</h3><p class="muted">${f ? 'Ce que vous ferez dans cette rubrique apparaîtra ici.' : 'Vos commandes, vos achats, vos trajets et vos colis apparaîtront ici.'}</p>
      <a class="btn btn-p" href="${{ trajets: '#/bouger', colis: '#/express', achats: '#/manger?vue=commerces' }[f] || '#/manger'}">${{ trajets: 'Réserver un trajet', colis: 'Envoyer un colis', achats: 'Voir les commerces' }[f] || 'Commander à manger'}</a></div>`}
    <p class="muted petit" style="margin-top:18px"><a href="#/projets">Mes projets</a> · <a href="#/notifs">Notifications</a></p></div>`);
  $('#app').onclick = e => { const b = e.target.closest('[data-encore]'); if (b) recommander(b.dataset.encore, b.dataset.resto); };
};

// ---------------------------------------------------------------- administration : chaque univers a son onglet ; les modérateurs ne voient que le leur
const ongletsAdmin = actif => `<h1>Administration</h1><div class="puces">${[...(PILOTAGE && profil?.role === 'admin' ? [['tableau', '#/admin/tableau', '📊 Tableau de bord', null]] : []), ['resto', '#/admin/food', '🍛 Food : restaurants', 'food'], ['woulib', '#/admin/woulib', '🚗 Move : chauffeurs et tarifs', 'move'], ...(BASE_V2 ? [['univers', '#/admin/univers', '🧩 Univers et territoires', null]] : [])]
  .concat(BASE_V2 && profil?.role === 'admin' ? [['commissions', '#/admin/commissions', '💶 Commissions', null]] : [])
  .concat([['signalements', '#/admin/signalements', '🚩 Signalements', '*'], ['assistance', '#/admin/assistance', '💬 Assistance', '*'], ['suppressions', '#/admin/suppressions', '🗑️ Comptes supprimés', null]])
  .filter(([, , , u]) => profil?.role === 'admin' || (u === '*' ? mesModerations.length > 0 : u && mesModerations.includes(u))).map(([k, h, t]) => `<a href="${h}" class="${actif === k ? 'on' : ''}">${t}</a>`).join('')}</div>`;
let mesModerations = [];
APP.pages.admin = async sous => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  mesModerations = (await q(sb.from('moderateurs_univers').select('univers').eq('user_id', moi.id)).catch(() => [])).map(x => x.univers);
  if (['signalements', 'assistance', 'suppressions'].includes(sous)) { await chargerCompte(); return APP.adminSuivi(sous); }
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
