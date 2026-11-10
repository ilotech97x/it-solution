/* Woulib — recherche universelle (#/recherche), chargée à la première ouverture.
   1. La phrase est comprise dans le navigateur, par des règles simples (sans IA) : « pizza », « épicerie », « aller au Lamentin »,
      « envoyer un colis », « taxi »… donnent d'abord des actions (AUDIT-RESTRUCTURATION.md, partie 4.3).
   2. La base cherche ensuite les restaurants, les plats et les commerces, sans tenir compte des accents ni des petites fautes
      (recherche_woulib, woulib/recherche.sql). Sans cette fonction, la recherche se fait comme avant, par le nom. */
'use strict';

const norm = t => sansAccent(t).replace(/[-'’.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
const MOTS_CUISINE = { pizza: 'pizza pizzas pizzeria', sushi: 'sushi sushis japonais maki', creole: 'creole colombo accras bokit dombre fricassee', burger: 'burger burgers hamburger',
  snack: 'snack sandwich wrap panini', asiatique: 'asiatique chinois thai vietnamien nem nems wok', grillades: 'grillade grillades barbecue bbq boucane', poisson: 'poisson poissons langouste lambi crevettes',
  vegetarien: 'vegetarien vegan vegetalien salade', boulangerie: 'boulangerie pain croissant viennoiserie patisserie', dessert: 'dessert desserts gateau crepe crepes', traiteur: 'traiteur buffet' };
const MOTS_RAYON = { frais: 'boisson boissons eau soda sodas jus', epicerie: 'epicerie courses depannage', apero: 'apero aperitif chips cacahuetes', glace: 'glace glaces glacon glacons',
  alcool: 'biere bieres rhum vin alcool', maison: 'lessive piles papier' };
const contientMot = (t, liste) => liste.split(' ').some(m => (' ' + t + ' ').includes(' ' + m + ' '));
// une commune du territoire, écrite avec ou sans article (« au Lamentin », « Lamentin », « le lamentin »)
const PREP = '(?:jusqu au|jusqu a|direction|vers|pour|aux|au|en|a)';
function trouverCommune(t, terr) {
  const sansArticle = x => x.replace(/^(le|la|les|l)\s+/, '');
  const cible = sansArticle(norm(t).replace(new RegExp('^' + PREP + '\\s+'), ''));
  if (cible.length < 3) return null;
  return (TERRITOIRES[terr]?.villes || []).find(c => { const n = norm(c); return n === cible || sansArticle(n) === cible; }) || null;
}
// « au Lamentin », « aux Trois-Îlets », « à Fort-de-France »
const aCommune = c => /^Le /.test(c) ? 'au ' + c.slice(3) : /^Les /.test(c) ? 'aux ' + c.slice(4) : 'à ' + c;
// ce que la phrase demande : une liste d'actions [lien, icône, titre, détail, en avant ?]
function comprendre(texte, terr) {
  const t = norm(texte), A = [], ajout = (...a) => { if (!A.some(x => x[0] === a[0])) A.push(a); };
  if (!t) return A;
  // « aller au Lamentin », « taxi pour Fort-de-France » : destination libre ; « vers le Marin » : seulement si c'est une commune
  const verbe = t.match(new RegExp('^(?:aller|me rendre|je vais|y aller|trajet|course|taxi|vtc)\\s+(?:' + PREP + '\\s+)?(.{3,})$')), prep = t.match(new RegExp('^' + PREP + '\\s+(.{3,})$'));
  const commune = trouverCommune(verbe ? verbe[1] : prep ? prep[1] : t, terr);
  if ((verbe || (prep && commune)) && universOuvert('move', terr)) {
    const vers = commune || (verbe || prep)[1];
    ajout(`#/bouger?vers=${encodeURIComponent(vers)}`, ICO.bouger, commune ? `Aller ${aCommune(commune)}` : `Aller à « ${vers} »`, 'Covoiturage · Entraide · Taxi/VTC', true);
  } else if (commune) {
    if (universOuvert('move', terr)) ajout(`#/bouger?vers=${encodeURIComponent(commune)}`, ICO.bouger, `Aller ${aCommune(commune)}`, 'Covoiturage · Entraide · Taxi/VTC', true);
    if (universOuvert('food', terr)) ajout(`#/manger?commune=${encodeURIComponent(commune)}`, ICO.manger, `Manger ${aCommune(commune)}`, 'Restaurants et commerces qui y sont ou y livrent');
  }
  if (/\b(colis|paquet|enveloppe|coursier|document)/.test(t) || /^envoyer\b/.test(t)) ajout('#/express', ICO.colis, 'Envoyer un colis', 'Un livreur vérifié le récupère et le remet', true);
  if (/\b(covoit|covoiturage)/.test(t) || /proposer un trajet/.test(t)) ajout('#/bouger?mode=covoiturage', ICO.gens, /proposer/.test(t) ? 'Proposer un trajet' : 'Covoiturage', 'Pas encore ouvert : être prévenu');
  if (/\b(lift|autostop|auto stop|entraide|coup de main)\b/.test(t)) ajout('#/bouger?mode=stop', ICO.bouclier, 'Je cherche un stop', 'Pas encore ouvert : être prévenu');
  if (/\b(taxi|taxis|vtc|chauffeur|aeroport)\b/.test(t)) ajout('#/bouger', ICO.taxi, 'Taxi ou VTC', 'Chauffeurs professionnels vérifiés, prix estimé', true);
  if (/\b(gps|itineraire|guidage|bouchon|bouchons|accident|route)\b/.test(t)) ajout('#/gps', ICO.gps, 'GPS et alertes route', 'Itinéraire, guidage à la voix, alertes');
  Object.entries(MOTS_CUISINE).forEach(([k, m]) => { if (contientMot(t, m)) ajout(`#/manger?cuisine=${k}`, ICO.manger, `Manger : ${CUISINES[k][1].toLowerCase()}`, 'Les restaurants de cette cuisine', true); });
  if (BOUTIQUES) Object.entries(MOTS_RAYON).forEach(([k, m]) => { if (contientMot(t, m)) ajout(`#/commerce?rayon=${k}`, ICO.commerce, `Commerces : ${RAYONS_FILTRE.find(x => x[0] === k)[1].toLowerCase()}`, 'Retrait ou livraison', true); });
  if (/\b(restaurant|restaurants|resto|manger|faim|repas|dejeuner|diner|livraison)\b/.test(t)) ajout('#/manger', ICO.manger, 'Commander à manger', 'Livré ou à emporter');
  if (/\b(anniversaire|mariage|bapteme|communion|fete|organiser)\b/.test(t)) ajout('#/projets', ICO.calendrier, 'Organiser un événement', 'La liste, le budget, les prestataires');
  const ext = c => (REGISTRE || REPLI).find(u => u.code === c && u.statut === 'externe' && u.lien);
  if (/\b(concert|evenement|evenements|billet|billets|festival|soiree)\b/.test(t) && ext('events')) ajout(ext('events').lien, ICO.billet, 'Événements et billets', 'Sur EventPass, avec le même compte');
  if (/\b(logement|villa|gite|location|appartement|hotel|sejour)\b/.test(t) && ext('living')) ajout(ext('living').lien, ICO.maison, 'Logements et services', 'Sur Kaz An Nou, avec le même compte');
  return A;
}
const RECENTES = 'wlRecherches';
const lireRecentes = () => { try { return JSON.parse(localStorage.getItem(RECENTES)) || []; } catch (e) { return []; } };
const garderRecente = t => { t = t.trim().slice(0, 60); if (t.length < 2) return; try { localStorage.setItem(RECENTES, JSON.stringify([t, ...lireRecentes().filter(x => x !== t)].slice(0, 5))); } catch (e) { /* stockage indisponible */ } };
// la base répond-elle avec recherche_woulib ? (sinon : par le nom, sensible aux accents)
async function chercherEnBase(texte, terr) {
  const r = await q(sb.rpc('recherche_woulib', { texte, terr })).catch(() => null);
  if (r) return r;
  const motif = texte.replace(/[%_,()*\\]/g, ' ').trim(); if (motif.length < 2) return { restaurants: [], plats: [] };
  const [restos, plats] = await Promise.all([q(sb.from('restaurants').select('*').in('statut', ['publie', 'pause']).eq('territoire', terr).ilike('nom', `%${motif}%`).limit(20)).catch(() => []),
    q(sb.from('plats').select('id, nom, prix, photo, restaurant_id, restaurants!inner(nom, territoire, statut, genre)').ilike('nom', `%${motif}%`).eq('dispo', true).eq('restaurants.territoire', terr).limit(20)).catch(() => [])]);
  return { restaurants: restos, plats: plats.filter(p => ['publie', 'pause'].includes(p.restaurants?.statut)).map(p => ({ ...p, restaurant_nom: p.restaurants?.nom, genre: p.restaurants?.genre })) };
}

APP.pages.recherche = async () => {
  await chargerRegistre();
  const terr = territoireActif(), depart = param().q || '';
  vue(`<div class="wrap page-recherche"><h1 class="cache-visuel">Rechercher dans Woulib</h1>
    <form class="rch-champ" id="fRecherche" role="search"><label for="q" class="cache-visuel">Rechercher dans Woulib</label>${ICO.recherche}
      <input id="q" name="q" type="search" value="${esc(depart)}" placeholder="Pizza, épicerie, aller au Lamentin…" autocomplete="off" enterkeyhint="search" maxlength="80">
      <button type="button" class="rch-effacer" id="effacer" aria-label="Effacer la recherche" ${depart ? '' : 'hidden'}>${ICO.croix}</button></form>
    <p class="cache-visuel" id="annonce" aria-live="polite"></p><div id="resultats"></div></div>`);
  const champ = $('#q'), zone = $('#resultats');
  // la teinte du domaine : Manger, Commerces, Bouger, Colis
  const teinte = h => /^#\/commerce/.test(h) ? 't-com' : /^#\/(bouger|gps)/.test(h) ? 't-move' : /^#\/manger/.test(h) ? 't-food' : /^#\/(express|projets)/.test(h) ? 't-colis' : '';
  const lien = ([h, i, t, d, avant]) => `<a class="action-r ${avant ? 'avant' : ''}" href="${esc(h)}" data-garder><span class="ico-t ${teinte(h)}">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span>${ICO.droite}</a>`;
  const ligneResto = x => { const e = etatOuverture(x); return `<a class="ligne-r" href="#/resto/${x.id}" data-garder><span class="cr-img mini ${estBoutique(x) ? 't-com' : 't-food'}">${x.photo ? `<img src="${esc(photo(x.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">${CUISINES[x.cuisine]?.[0] || '🍽️'}</span>`}</span>
    <span><b>${esc(x.nom)}</b><small class="${e.ouvert ? 'ok' : ''}">${esc(etatTexte(x, e))}</small></span><small class="muted">${esc(x.commune)}</small></a>`; };
  const lignePlat = p => `<a class="ligne-r" href="#/resto/${p.restaurant_id}?plat=${p.id}" data-garder><span class="cr-img mini t-food">${p.photo ? `<img src="${esc(photo(p.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">🍽️</span>`}</span>
    <span><b>${esc(p.nom)}</b><small>${esc(p.restaurant_nom || '')}</small></span><b class="prix">${eur(p.prix)}</b></a>`;
  const section = (t, h) => h ? `<section class="res-s" aria-label="${t}"><h2>${t}</h2>${h}</section>` : '';
  const accueilRecherche = () => {
    const rec = lireRecentes();
    zone.innerHTML = `${rec.length ? section('Recherches récentes', `<div class="puces">${rec.map(x => `<button type="button" data-essai="${esc(x)}">${ICO.horloge}${esc(x)}</button>`).join('')}</div>`) : ''}
      ${section('Raccourcis', `<div class="liste-g">${[['#/manger', ICO.manger, 'Commander à manger', 'Restaurants livrés ou à emporter'], ...BOUTIQUES ? [['#/commerce', ICO.commerce, 'Commerces', 'Boissons, épicerie, dépannage']] : [],
        ['#/bouger', ICO.bouger, 'Se déplacer', 'Taxi et VTC vérifiés'], ...universOuvert('express', terr) ? [['#/express', ICO.colis, 'Envoyer un colis', 'Un livreur vérifié']] : []].map(lien).join('')}</div>`)}
      <p class="muted essais">Essayez : ${['pizza', 'épicerie', 'envoyer un colis', 'aller au Lamentin'].map(x => `<button type="button" class="lien" data-essai="${x}">${x}</button>`).join(' · ')}</p>`;
    $('#annonce').textContent = '';
  };
  let tour = 0;
  const lancer = async texte => {
    const n = ++tour, t = texte.trim();
    $('#effacer').hidden = !t;
    try { history.replaceState(history.state, '', '#/recherche' + (t ? '?q=' + encodeURIComponent(t) : '')); pageEnCours = location.hash; } catch (e) { /* facultatif */ }
    if (!t) return accueilRecherche();
    const actions = comprendre(t, terr);
    zone.innerHTML = section('Actions', actions.length ? `<div class="actions-r">${actions.map(lien).join('')}</div>` : '') + '<div class="chargement" aria-hidden="true"></div>';
    const r = t.length >= 2 ? await chercherEnBase(t, terr) : { restaurants: [], plats: [] };
    if (n !== tour || !$('#resultats')) return;   // une frappe plus récente a pris la main
    const restos = (r.restaurants || []).filter(x => !estBoutique(x)), coms = (r.restaurants || []).filter(estBoutique), plats = (r.plats || []).filter(p => p.genre !== 'boutique');
    const rien = !actions.length && !restos.length && !coms.length && !plats.length;
    zone.innerHTML = rien ? `<div class="vide-etat"><span class="ico">${ICO.recherche}</span><h3>Aucun résultat pour « ${esc(t)} »</h3><p class="muted">Essayez « pizza », « épicerie » ou « aller à… ».</p></div>`
      : section('Actions', actions.length ? `<div class="actions-r">${actions.map(lien).join('')}</div>` : '')
        + section(`Restaurants${restos.length ? ' (' + restos.length + ')' : ''}`, restos.length ? `<div class="liste-g">${restos.slice(0, 8).map(ligneResto).join('')}</div>` : '')
        + section('Plats', plats.length ? `<div class="liste-g">${plats.slice(0, 8).map(lignePlat).join('')}</div>` : '')
        + section('Commerces', coms.length ? `<div class="liste-g">${coms.slice(0, 6).map(ligneResto).join('')}</div>` : '')
        + (restos.length || plats.length ? `<p><a class="btn btn-sec" href="#/manger?q=${encodeURIComponent(t)}" data-garder>Voir tous les restaurants pour « ${esc(t)} »</a></p>` : '');
    $('#annonce').textContent = rien ? 'Aucun résultat' : [actions.length && `${actions.length} action${actions.length > 1 ? 's' : ''}`, restos.length && `${restos.length} restaurant${restos.length > 1 ? 's' : ''}`,
      plats.length && `${plats.length} plat${plats.length > 1 ? 's' : ''}`, coms.length && `${coms.length} commerce${coms.length > 1 ? 's' : ''}`].filter(Boolean).join(', ');
  };
  let minuterieR = null;
  champ.addEventListener('input', () => { clearTimeout(minuterieR); minuterieR = setTimeout(() => lancer(champ.value), 250); });
  $('#fRecherche').addEventListener('submit', e => { e.preventDefault(); clearTimeout(minuterieR); garderRecente(champ.value); const a = zone.querySelector('.action-r.avant, .action-r'); if (a && champ.value.trim()) aller(a.getAttribute('href')); else lancer(champ.value); });
  $('#effacer').addEventListener('click', () => { champ.value = ''; lancer(''); champ.focus(); });
  zone.addEventListener('click', e => {
    const s = e.target.closest('[data-essai]'); if (s) { champ.value = s.dataset.essai; lancer(champ.value); return; }
    if (e.target.closest('[data-garder]')) garderRecente(champ.value);
  });
  await lancer(depart);
  if (!depart) champ.focus();
};
