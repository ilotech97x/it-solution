/* Woulib Food : restaurants, livraison, à emporter, précommande. APP et registre des univers : app.js ; base commune : commun/base.js.
   Prix, totaux et étapes de commande contrôlés par la base (food.sql). */
'use strict';
const CUISINES = { creole: ['🍛', 'Créole'], snack: ['🌯', 'Snack'], burger: ['🍔', 'Burgers'], pizza: ['🍕', 'Pizzas'], asiatique: ['🥡', 'Asiatique'], sushi: ['🍣', 'Sushis'],
  grillades: ['🍖', 'Grillades'], poisson: ['🐟', 'Poissons'], vegetarien: ['🥗', 'Végétarien'], boulangerie: ['🥖', 'Boulangerie'], dessert: ['🍨', 'Desserts'], traiteur: ['🍱', 'Traiteur'], boissons: ['🥤', 'Boissons'], epicerie: ['🧺', 'Épicerie'], autre: ['🍽️', 'Autre'] };
const CATS_PLAT = { menu: '🍱 Menus', entree: '🥗 Entrées', plat: '🍛 Plats', accompagnement: '🍚 Accompagnements', dessert: '🍰 Desserts', boisson: '🥤 Boissons' };
// boutique (boissons, apéro, dépannage : boutique.sql) : des rayons au lieu d'une carte ; l'alcool est toujours 18+
const CATS_BOUTIQUE = { frais: '🥤 Boissons fraîches', plat: '🍱 Plats et snacks préparés', alcool: '🍺 Bières et alcools', apero: '🥜 Apéro et snacks', glace: '🧊 Glaces et glaçons', epicerie: '🧺 Épicerie', maison: '🧻 Maison et dépannage', autre: '✨ Autres' };
const LIB_CAT = { ...CATS_BOUTIQUE, ...CATS_PLAT };
// les 14 allergènes majeurs (règlement INCO) : affichés avant la commande ; null = pas encore renseigné, [] = aucun
const ALLERGENES = { gluten: 'Gluten', crustaces: 'Crustacés', oeufs: 'Œufs', poissons: 'Poissons', arachides: 'Arachides', soja: 'Soja', lait: 'Lait', fruits_coque: 'Fruits à coque',
  celeri: 'Céleri', moutarde: 'Moutarde', sesame: 'Sésame', sulfites: 'Sulfites', lupin: 'Lupin', mollusques: 'Mollusques' };
const texteAllergenes = p => !Array.isArray(p.allergenes) ? '' : p.allergenes.length ? '⚠️ Allergènes : ' + p.allergenes.map(a => ALLERGENES[a] || a).join(', ') : 'Sans les 14 allergènes majeurs';
const TYPES_BOUTIQUE = ['boissons', 'epicerie', 'autre'];
const estBoutique = r => r?.genre === 'boutique';
const cuisinesVisibles = () => Object.entries(CUISINES).filter(([k]) => BOUTIQUES || !TYPES_BOUTIQUE.slice(0, 2).includes(k));
const MODERATION = 'L’abus d’alcool est dangereux pour la santé, à consommer avec modération. Vente d’alcool interdite aux mineurs.';
// une vignette d'article : on l'ajoute d'un geste (+), le compteur apparaît ensuite ; le stock limite la quantité
const finArticle = p => !p.dispo || p.stock === 0;
const carteArticle = (p, n, ok) => `<div class="article ${finArticle(p) ? 'fini' : ''}" id="p-${p.id}">
  <div class="art-img t-com">${p.photo ? `<img src="${esc(photo(p.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">${(LIB_CAT[p.categorie] || '🛒').split(' ')[0]}</span>`}${p.majeur ? '<em class="art-18" title="Réservé aux majeurs">18+</em>' : ''}</div>
  <b>${esc(p.nom)}</b>${p.description ? `<small>${esc(p.description)}</small>` : ''}${p.allergenes?.length ? `<small class="allerg">${esc(texteAllergenes(p))}</small>` : ''}
  <div class="art-bas"><span class="prix">${eur(p.prix)}</span>${finArticle(p) ? '<span class="tag gris">Épuisé</span>' : ok ? `<div class="qte ${n ? '' : 'zero'}" data-plat="${p.id}"><button type="button" data-d="-1" aria-label="Retirer un ${esc(p.nom)}">−</button><output>${n}</output><button type="button" data-d="1" aria-label="Ajouter ${esc(p.nom)}">+</button></div>` : ''}</div>
  ${!finArticle(p) && p.stock != null && p.stock <= 5 ? `<small class="art-stock">Plus que ${p.stock}</small>` : ''}</div>`;
const maxArticle = p => Math.min(20, p.stock ?? 20);
// accueil : des plats des restaurants ouverts ; un geste ouvre la carte du restaurant sur ce plat
async function afficherPlatsAccueil(restos) {
  const el = $('#platsAcc'); if (!el || !restos.length) return;
  const l = await memo('acc-plats:' + restos.map(r => r.id).join(','), () => q(sb.from('plats').select('*').in('restaurant_id', restos.map(r => r.id)).in('categorie', ['plat', 'menu']).eq('dispo', true).limit(60)), 30000);
  const jour = new Date().getDate();   // l'ordre change chaque jour, ceux qui ont une photo d'abord
  const choix = l.filter(p => p.stock !== 0).sort((a, b) => (!!b.photo - !!a.photo) || ((a.id.charCodeAt(0) + jour) % 7) - ((b.id.charCodeAt(0) + jour) % 7)).slice(0, 12);
  if (!choix.length || !$('#platsAcc')) return;
  const resto = id => restos.find(r => r.id === id);
  el.innerHTML = `<div class="titre-s"><h2>Plats du moment</h2><a href="#/manger">Tout voir</a></div>
    <div class="defile plats-defile">${choix.map(p => `<a class="plat-c" href="#/resto/${p.restaurant_id}?plat=${p.id}"><div class="art-img t-food">${p.photo ? `<img src="${esc(photo(p.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">${CUISINES[resto(p.restaurant_id)?.cuisine]?.[0] || '🍛'}</span>`}</div>
      <b>${esc(p.nom)}</b><small>${esc(resto(p.restaurant_id)?.nom || '')} · ${resto(p.restaurant_id)?.delai_min || 30} min</small><span class="art-bas"><span class="prix">${eur(p.prix)}</span><i class="plus-c" aria-hidden="true">+</i></span></a>`).join('')}</div>`;
  el.hidden = false;
}
// accueil : les articles de la boutique ouverte la plus proche, à ajouter au panier sans quitter l'accueil
async function afficherBoutiqueAccueil(terr) {
  if (!BOUTIQUES) return;
  let r = sb.from('restaurants').select('*').eq('genre', 'boutique').eq('statut', 'publie').eq('ouvert', true).limit(10);
  if (terr) r = r.eq('territoire', terr);
  const b = (await memo('acc-boutiques:' + terr, () => q(r))).find(x => etatOuverture(x).ouvert);
  if (!b || !$('#boutiqueAcc')) return;
  const arts = (await memo('acc-articles:' + b.id, () => q(sb.from('plats').select('*').eq('restaurant_id', b.id).eq('dispo', true).order('ordre').order('created_at').limit(16)), 15000))
    .filter(p => p.stock !== 0 && !p.options?.length);
  const el = $('#boutiqueAcc'); if (!arts.length || !el) return;
  const cart = lirePanier(b.id), nb = k => cart[k]?.n || 0;
  el.innerHTML = `<div class="titre-s"><h2>Boissons et dépannage</h2><a href="#/resto/${b.id}">Tout voir</a></div>
    <p class="muted petit" style="margin:-4px 0 10px">${esc(b.nom)} · ${b.delai_min} min${b.livraison ? ` · livraison ${Number(b.frais_livraison) ? eur(b.frais_livraison) : 'offerte'}` : ''}${b.emporter ? ' · retrait sur place' : ''}</p>
    <div class="defile rayon-defile">${arts.map(p => carteArticle(p, nb(p.id), true)).join('')}</div>
    ${arts.some(p => p.majeur) ? `<p class="petit muted" style="margin:6px 0 0">${MODERATION}</p>` : ''}<button type="button" class="barre-vite" id="barreVite" hidden></button>`;
  el.hidden = false;
  const maj = () => { const n = Object.values(cart).reduce((t, x) => t + x.n, 0); $('#barreVite').hidden = !n; $('#barreVite').innerHTML = `<span>${n} article${n > 1 ? 's' : ''}</span><b>Valider mon panier</b>`; };
  el.addEventListener('click', e => {
    if (e.target.closest('#barreVite')) return aller(`#/resto/${b.id}?panier=1`);
    const bt = e.target.closest('.qte[data-plat] [data-d]'); if (!bt) return;
    const qt = bt.closest('.qte'), p = arts.find(x => x.id === qt.dataset.plat), c = cart[p.id] || { p: p.id, n: 0, o: [] };
    const voulu = c.n + Number(bt.dataset.d); if (voulu > maxArticle(p)) return toast(p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum', true);
    c.n = Math.max(0, voulu); if (c.n) cart[p.id] = c; else delete cart[p.id];
    panier.ecrire(b.id, cart); qt.querySelector('output').textContent = c.n; qt.classList.toggle('zero', !c.n); maj();
    if (c.n === 1 && bt.dataset.d === '1') toast('Ajouté au panier');
  });
  maj();
}
const ETAPES = [['envoyee', '📨', 'Envoyée'], ['acceptee', '👍', 'Acceptée'], ['en_preparation', '👩‍🍳', 'En cuisine'], ['prete', '🛍️', 'Prête'], ['en_livraison', '🛵', 'En route'], ['livree', '🎉', 'Livrée']];
const ST_CMD = { envoyee: ['att', 'Envoyée'], acceptee: ['ok', 'Acceptée'], refusee: ['ko', 'Refusée'], en_preparation: ['ok', 'En cuisine'], prete: ['ok', 'Prête'], en_livraison: ['ok', 'En route'],
  livree: ['gris', 'Livrée'], retiree: ['gris', 'Retirée'], annulee: ['ko', 'Annulée'] };
const ST_RESTO = { brouillon: ['gris', 'Brouillon'], en_attente: ['att', 'En validation'], publie: ['ok', 'En ligne'], refuse: ['ko', 'Refusé'], pause: ['gris', 'En pause'] };
let suivi = null;   // minuterie de rafraîchissement (suivi de commande, tableau du restaurateur)

// panier : gardé sur l'appareil, un par restaurant
const panier = { lire: r => { try { return JSON.parse(localStorage.getItem('kvPanier-' + r)) || {}; } catch (e) { return {}; } }, ecrire: (r, p) => { try { localStorage.setItem('kvPanier-' + r, JSON.stringify(p)); } catch (e) { /* stockage indisponible */ } } };
// une ligne de panier : { p: plat, n: quantité, o: [[groupe, choix], …] } ; l'ancien format { plat: quantité } est relu tel quel
const lirePanier = r => { const c = panier.lire(r); Object.keys(c).forEach(k => { if (typeof c[k] === 'number') c[k] = { p: k, n: c[k], o: [] }; }); return c; };
const supplement = (p, o) => o.reduce((t, [g, c]) => t + Number(p.options?.[g]?.choix?.[c]?.prix || 0), 0);
const libelleOptions = (p, o) => o.map(([g, c]) => p.options?.[g]?.choix?.[c]?.nom).filter(Boolean).join(', ');
const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const SEMAINE = [1, 2, 3, 4, 5, 6, 0];
const texteCreneaux = l => (l || []).map(([a, b]) => `${a}-${b}`).join(', ');

// ouvert ou fermé selon les horaires de la semaine (heure du territoire) ; sans horaires, c'est l'interrupteur du restaurateur qui décide
function etatOuverture(r, t = new Date()) {
  // « Je ferme 30 min » : fermé jusqu'à l'heure dite ; on peut programmer pour après (espace_pro.sql)
  if (r.ouvert && r.pause_jusqu_a && new Date(r.pause_jusqu_a) > t) return { ouvert: false, auto: true, texte: `rouvre à ${hFr(utcVersLocal(r.pause_jusqu_a, fuseauDe(r.territoire)).split('T')[1].slice(0, 5))}`, pause: true };
  const h = r.horaires_sem;
  if (!h || !Object.keys(h).length) return { ouvert: !!r.ouvert, auto: false, texte: '' };
  if (!r.ouvert) return { ouvert: false, auto: false, texte: '' };
  const [jour, hm] = utcVersLocal(t.toISOString(), fuseauDe(r.territoire)).split('T'), dow = new Date(jour + 'T12:00:00Z').getUTCDay(), auj = h[dow] || [];
  const en = auj.find(([a, b]) => hm >= a && hm < b);
  if (en) return { ouvert: true, auto: true, texte: `ferme à ${hFr(en[1])}`, ferme: en[1] };
  const apres = auj.find(([a]) => a > hm);
  if (apres) return { ouvert: false, auto: true, texte: `ouvre à ${hFr(apres[0])}` };
  for (let i = 1; i <= 7; i++) { const d = (dow + i) % 7; if (h[d]?.length) return { ouvert: false, auto: true, texte: `ouvre ${i === 1 ? 'demain' : JOURS[d].toLowerCase()} à ${hFr(h[d][0][0])}` }; }
  return { ouvert: false, auto: true, texte: '' };
}

declarerUnivers('food', { routes: /^#\/(manger|commerce|resto|suivi|commandes|pro)\b/, zone: 'food', accueil: '#/manger', appel: 'Commander un repas' });

// ---------------------------------------------------------------- Manger : Restaurants | Commerces, des filtres, la liste
// rayons d'un commerce qu'on peut filtrer (catégories de ses articles)
const RAYON_ICO = { frais: '🥤', epicerie: '🛒', apero: '🍟', glace: '🧊', plat: '🍱', alcool: '🍺', maison: '🧻' };   // vitrine de Commerce : un pictogramme par rayon
const RAYONS_FILTRE = [['frais', 'Boissons'], ['epicerie', 'Épicerie'], ['apero', 'Apéro'], ['glace', 'Glaces'], ['plat', 'Plats préparés'], ['alcool', 'Bières et alcools'], ['maison', 'Dépannage']];
// vitrine de Food : des envies, chacune ouvre la recherche (restaurants et plats qui en proposent, jamais une offre inventée)
const ENVIES = [['🥞', 'Crêpes', 'crêpe'], ['🥪', 'Bokits', 'bokit'], ['🍕', 'Pizzas', 'pizza'], ['🍔', 'Burgers', 'burger'], ['🍟', 'Chips et frites', 'frite'],
  ['🍗', 'Poulet', 'poulet'], ['🐟', 'Poisson', 'poisson'], ['🧆', 'Accras', 'accras'], ['🍛', 'Colombo', 'colombo'], ['🍣', 'Sushis', 'sushi'], ['🥗', 'Salades', 'salade'],
  ['🍦', 'Glaces', 'glace'], ['🍰', 'Desserts', 'dessert'], ['🥤', 'Jus locaux', 'jus']];
const sansAccent = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Food (restaurants) et Commerce (boutiques) : deux rubriques de la barre du bas, la même page qui sait laquelle elle montre
const pageMarche = async marche => {
  await chargerRegistre(); if (!universOuvert('food')) return universFerme('food');
  const p = param(), terr = territoireActif(), com = BOUTIQUES && marche === 'commerce';
  const lienF = ch => (com ? '#/commerce' : '#/manger') + ((u => u.toString() ? '?' + u : '')(new URLSearchParams(Object.entries({ ...p, ...ch }).filter(([k, v]) => v && k !== 'vue'))));
  const puce = (ch, t, on) => `<a href="${lienF(ch)}" class="${on ? 'on' : ''}" ${on ? 'aria-current="true"' : ''}>${t}</a>`;
  vue(`<div class="wrap page-manger ${com ? 'page-commerce' : ''}"><h1>${com ? 'Commerce' : 'Food'}</h1>
    <a class="rch-lien" href="#/recherche${p.q ? '?q=' + encodeURIComponent(p.q) : ''}">${ICO.recherche}<span>${p.q ? esc(p.q) : com ? 'Un produit, une boutique, un rayon…' : 'Un plat, un restaurant, une cuisine…'}</span></a>
    ${com ? '' : `<nav class="envies defile" aria-label="Envie de…">${ENVIES.map(([e, t, m]) => `<a href="#/manger?q=${encodeURIComponent(m)}" ${sansAccent(p.q) === sansAccent(m) ? 'aria-current="true"' : ''}><span aria-hidden="true">${e}</span>${t}</a>`).join('')}</nav>`}
    <div class="puces" role="group" aria-label="Filtres">${puce({ ouvert: p.ouvert ? '' : '1' }, 'Ouvert maintenant', !!p.ouvert)}${puce({ mode: p.mode === 'livraison' ? '' : 'livraison' }, 'Livraison', p.mode === 'livraison')}${puce({ mode: p.mode === 'emporter' ? '' : 'emporter' }, 'À emporter', p.mode === 'emporter')}
      ${p.commune ? puce({ commune: '' }, `${esc(p.commune)} ✕`, true) : ''}</div>
    ${com ? `<div class="puces puces-v" role="group" aria-label="Rayons">${RAYONS_FILTRE.map(([k, t]) => puce({ rayon: p.rayon === k ? '' : k }, `${RAYON_ICO[k] || ''} ${t}`, p.rayon === k)).join('')}</div>`
      : `<div class="puces" role="group" aria-label="Cuisines">${cuisinesVisibles().filter(([k]) => !TYPES_BOUTIQUE.includes(k)).map(([k, [i, t]]) => puce({ cuisine: p.cuisine === k ? '' : k }, `${i} ${esc(t)}`, p.cuisine === k)).join('')}</div>`}
    <div id="encore"></div><div id="favsM"></div>
    ${com || p.q ? '' : '<section class="section" id="platsAcc" hidden></section>'}
    <h2 id="titreListe">${p.q ? `Résultats pour « ${esc(p.q)} »` : com ? 'Commerces' : 'Restaurants'}</h2>
    <div id="liste" class="chargement">Chargement…</div>
    ${com ? `<p class="petit muted" style="margin-top:12px">Alcool : vente réservée aux 18 ans et plus, âge vérifié à la remise.</p>` : ''}
    <section class="section"><a class="banniere-pro" href="${com ? '#/pro/boutique/nouveau' : '#/pro/resto/nouveau'}"><span class="ico-l">${com ? ICO.commerce : ICO.manger}</span><span><b>${com ? 'Vous avez un commerce ?' : 'Vous avez un restaurant ?'}</b>
      <small>Inscription gratuite : votre ${com ? 'boutique' : 'carte'} en ligne, les commandes en direct, vos clients vous paient directement.</small></span>${ICO.droite}</a></section></div>`);
  let r = sb.from('restaurants').select('*').in('statut', ['publie', 'pause']).eq('territoire', terr).order('ouvert', { ascending: false }).order('created_at', { ascending: false }).limit(80);
  if (BOUTIQUES) r = r.eq('genre', com ? 'boutique' : 'restaurant');
  if (p.cuisine && !com) r = r.eq('cuisine', p.cuisine);
  if (p.mode) r = r.eq(p.mode, true);
  let l = await q(r);
  if (p.commune) { const c = sansAccent(p.commune); l = l.filter(x => sansAccent(x.commune) === c || (x.communes_livrees || []).some(v => sansAccent(v) === c)); }
  if (p.rayon && com && l.length) {   // commerces qui ont au moins un article disponible dans ce rayon
    const ids = new Set((await q(sb.from('plats').select('restaurant_id').in('restaurant_id', l.map(x => x.id)).eq('categorie', p.rayon).eq('dispo', true).limit(500)).catch(() => [])).map(x => x.restaurant_id));
    l = l.filter(x => ids.has(x.id));
  }
  if (p.q) {   // recherche dans le nom, la présentation, la ville… et les plats de la carte (sans tenir compte des accents)
    const m = sansAccent(p.q), motif = p.q.replace(/[%_,()*\\]/g, ' ').trim();
    const parPlat = new Set(motif ? (await q(sb.from('plats').select('restaurant_id').ilike('nom', `%${motif}%`).limit(300)).catch(() => [])).map(x => x.restaurant_id) : []);
    l = l.filter(x => parPlat.has(x.id) || sansAccent(x.nom + ' ' + x.description + ' ' + x.commune).includes(m));
  }
  if (p.ouvert) l = l.filter(x => etatOuverture(x).ouvert);
  l.sort((a, b) => etatOuverture(b).ouvert - etatOuverture(a).ouvert);
  const notes = l.length ? Object.fromEntries((await q(sb.from('notes_resto').select('*').in('restaurant_id', l.map(x => x.id))).catch(() => [])).map(x => [x.restaurant_id, x])) : {};
  if (!$('#liste')) return;
  // commander à nouveau (dernière commande reçue) et favoris : seulement sans filtre, avec un compte
  if (moi && !p.q && !p.cuisine && !p.rayon && !p.commune) {
    const [der, favs] = await Promise.all([q(sb.from('commandes').select('id, restaurant_id, total, restaurants(nom, genre), commande_lignes(nom, quantite)').eq('client_id', moi.id).in('statut', ['livree', 'retiree']).order('created_at', { ascending: false }).limit(5)).catch(() => []),
      q(sb.from('favoris_resto').select('restaurant_id')).catch(() => [])]);
    const d = der.find(x => estBoutique(x.restaurants) === com);
    if (d && $('#encore')) $('#encore').innerHTML = `<div class="encore"><span><b>Commander à nouveau</b><small>${esc(d.commande_lignes.slice(0, 2).map(x => (x.quantite > 1 ? x.quantite + ' × ' : '') + x.nom).join(', '))} · ${esc(d.restaurants?.nom || '')} · ${eur(d.total)}</small></span>
      <button type="button" class="btn btn-n btn-s" data-encore="${d.id}" data-resto="${d.restaurant_id}">Recommander</button></div>`;
    const f = favs.map(x => x.restaurant_id), mesFavs = l.filter(x => f.includes(x.id));
    if (mesFavs.length && $('#favsM')) $('#favsM').innerHTML = `<section class="section"><h2>Mes favoris</h2><div class="defile rangee">${mesFavs.map(x => carteRangee(x, notes[x.id])).join('')}</div></section>`;
    $('#app').onclick = e => { const b = e.target.closest('[data-encore]'); if (b) recommander(b.dataset.encore, b.dataset.resto); };
  }
  $('#liste').className = l.length ? 'liste-restos' : '';
  const filtre = p.q || p.cuisine || p.mode || p.rayon || p.ouvert || p.commune;
  $('#liste').innerHTML = l.length ? l.map(x => carteResto(x, notes[x.id])).join('') : `<div class="vide-etat"><span class="ico">${com ? ICO.commerce : ICO.manger}</span><h3>${filtre ? (com ? 'Aucun commerce pour ces filtres' : 'Aucun restaurant pour ces filtres') : com ? `Pas encore de commerce en ${esc(terr)}` : `Les premiers restaurants arrivent en ${esc(terr)}`}</h3>
    <p class="muted">${filtre ? 'Essayez sans filtre, ou un autre mot.' : 'Nous vérifions chaque professionnel avant sa mise en ligne.'}</p>${filtre ? `<a class="btn btn-p" href="${com ? '#/commerce' : '#/manger'}">Tout afficher</a>` : `<a class="btn btn-p" href="#/pros">Inscrire mon ${com ? 'commerce' : 'restaurant'}</a>`}</div>`;
  if (!com && !p.q) afficherPlatsAccueil(l.filter(x => etatOuverture(x).ouvert)).catch(() => {});   // plats des restaurants ouverts, en vitrine
};
APP.pages.manger = () => {   // anciennes adresses « #/manger?vue=commerces… » : la rubrique Commerce, sans étape dans l'historique
  const p = param(); if (p.vue !== 'commerces') return pageMarche('food');
  const u = new URLSearchParams(Object.entries(p).filter(([k, v]) => v && k !== 'vue')); rediriger('#/commerce' + (u.toString() ? '?' + u : ''));
};
APP.pages.commerce = () => pageMarche('commerce');
// heure écrite à la française : « 22 h », « 11 h 30 », « minuit »
const hFr = t => t === '24:00' || t === '00:00' ? 'minuit' : t.replace(/^0?(\d{1,2}):(\d{2})$/, (_, h, m) => `${h} h${m === '00' ? '' : ' ' + m}`);
// carte d'un restaurant ou d'un commerce dans une liste : photo, nom, ouvert ou fermé (avec l'heure), délai et frais, note des avis vérifiés
const etatTexte = (x, e = etatOuverture(x)) => e.ouvert ? `Ouvert${e.texte ? ' · ' + e.texte : ''}` : e.auto && e.texte ? `${e.texte[0].toUpperCase() + e.texte.slice(1)} · précommande possible` : 'Fermé pour le moment';
const carteResto = (x, n) => { const e = etatOuverture(x), bq = estBoutique(x); return `<a class="carte-resto" href="#/resto/${x.id}"><span class="cr-img ${bq ? 't-com' : 't-food'}">${x.photo ? `<img src="${esc(photo(x.photo))}" alt="" loading="lazy">` : `<span aria-hidden="true">${CUISINES[x.cuisine]?.[0] || '🍽️'}</span>`}</span>
  <span class="cr-corps"><b>${esc(x.nom)}</b><span class="cr-etat ${e.ouvert ? 'ok' : e.auto && e.texte ? 'att' : 'gris'}">${esc(etatTexte(x, e))}</span>
    <span class="cr-infos">${esc(CUISINES[x.cuisine]?.[1] || '')} · ${esc(x.commune)} · ${x.delai_min} min${x.livraison ? ` · livraison ${Number(x.frais_livraison) ? eur(x.frais_livraison) : 'offerte'}` : ' · à emporter seulement'}</span>
    ${n ? `<span class="cr-note">★ ${String(n.moyenne).replace('.', ',')} <span>(${n.nombre} avis vérifié${n.nombre > 1 ? 's' : ''})</span></span>` : Date.now() - new Date(x.created_at) < 30 * 864e5 ? '<span class="etiquette">Nouveau</span>' : ''}</span></a>`; };

// ---------------------------------------------------------------- restaurant : carte et panier
APP.pages.resto = async id => {
  attente(); await chargerRegistre();
  const r = await memo('resto:' + id, () => q(sb.from('restaurants').select('*').eq('id', id).maybeSingle()), 20000);
  if (!r) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Restaurant introuvable</h3><a href="#/manger">Tous les restaurants</a></div>');
  const [plats, n] = await memo('resto-carte:' + id, () => Promise.all([q(sb.from('plats').select('*').eq('restaurant_id', id).order('ordre').order('created_at')), q(sb.from('notes_resto').select('*').eq('restaurant_id', id))]), 20000);
  const bq = estBoutique(r), CATS = bq ? CATS_BOUTIQUE : CATS_PLAT;
  const platDe = k => plats.find(p => p.id === k), aOptions = p => p.options?.length > 0;
  let cart = lirePanier(id);
  Object.keys(cart).forEach(k => { const p = platDe(cart[k].p); if (!p || finArticle(p) || !(cart[k].n > 0) || cart[k].o.some(([g, c]) => !p.options?.[g]?.choix?.[c])) delete cart[k]; else cart[k].n = Math.min(cart[k].n, maxArticle(p)); });
  let mode = r.livraison ? 'livraison' : 'emporter', tip = 0;
  // fermé à cette heure mais interrupteur allumé et horaires remplis : on peut programmer pour ses heures d'ouverture
  const etat = etatOuverture(r), programmable = !etat.ouvert && etat.auto, commandable = etat.ouvert || programmable;
  const nbPlat = k => Object.values(cart).filter(x => x.p === k).reduce((t, x) => t + x.n, 0);
  const parCat = [...Object.keys(CATS), ...Object.keys(LIB_CAT).filter(k => !CATS[k])].map(c => [c, plats.filter(p => p.categorie === c)]).filter(([, l]) => l.length);
  const horairesSem = r.horaires_sem && Object.keys(r.horaires_sem).length;
  document.title = `${r.nom} — Woulib`;
  const nomCat = c => (CATS[c] || LIB_CAT[c] || '').replace(/^\S+\s/, '');   // l'emoji du rayon reste dans l'administration
  const note = n[0];
  const infos = [etat.ouvert ? ['ok', `Ouvert${etat.ferme ? ' jusqu’à ' + hFr(etat.ferme) : ''}`] : ['gris', programmable && etat.texte ? `Fermé · ${etat.texte}` : 'Fermé pour le moment'],
    r.livraison && ['', `Livraison ${Number(r.frais_livraison) ? eur(r.frais_livraison) : 'offerte'}`], Number(r.minimum) > 0 && ['', `Minimum ${eur(r.minimum)}`],
    r.emporter && ['', r.livraison ? 'Retrait possible' : 'À emporter seulement'], ['', `${r.delai_min} min`],
    note && ['', `★ ${String(note.moyenne).replace('.', ',')} · ${note.nombre} avis vérifié${note.nombre > 1 ? 's' : ''}`]].filter(Boolean);
  // un plat : nom, description, allergènes, prix, stock ; la photo à droite avec le bouton +, le compteur apparaît ensuite
  const ligneP = p => { const nb = nbPlat(p.id), al = texteAllergenes(p).replace(/^⚠️ /, ''); return `<div class="plat-l ${p.dispo ? '' : 'fini'}" id="p-${p.id}">
    <div class="pl-t"><b>${esc(p.nom)}</b>${p.description ? `<span class="pl-d">${esc(p.description)}</span>` : ''}${al ? `<span class="pl-a">${al.startsWith('Allergènes') ? `<b>Allergènes :</b>${esc(al.slice(12))}` : esc(al)}</span>` : ''}
      <span class="pl-p"><b>${eur(p.prix)}</b>${aOptions(p) ? '<span class="muted petit">au choix</span>' : ''}${!p.dispo ? '<span class="tag gris">Épuisé</span>' : p.stock != null && p.stock > 0 && p.stock <= 5 ? `<span class="tag att">Plus que ${p.stock}</span>` : ''}</span></div>
    <div class="pl-img ${p.photo ? '' : 'sans'}">${p.photo ? `<img src="${esc(photo(p.photo))}" alt="" loading="lazy">` : ''}
      ${!p.dispo || !commandable ? '' : aOptions(p) ? `<div class="qte ${nb ? '' : 'zero'}" data-opt="${p.id}"><output>${nb || ''}</output><button type="button" data-choisir="${p.id}" aria-label="Choisir ${esc(p.nom)}">+</button></div>`
        : `<div class="qte ${nb ? '' : 'zero'}" data-plat="${p.id}"><button type="button" data-d="-1" aria-label="Retirer un ${esc(p.nom)}">−</button><output>${nb}</output><button type="button" data-d="1" aria-label="Ajouter ${esc(p.nom)}">+</button></div>`}</div></div>`; };
  vue(`<div class="wrap page-resto"><div class="fiche fiche-d">
    <div class="resto-c"><div class="resto-hero ${bq ? 't-com' : 't-food'}">${r.photo ? `<img src="${esc(photo(r.photo))}" alt="">` : `<span class="sans-photo" aria-hidden="true">${CUISINES[r.cuisine]?.[0] || '🍽️'}</span>`}
        <button type="button" class="rond retour-flottant" id="retourResto" aria-label="Retour">${ICO.retour}</button>
        <button type="button" class="rond" id="fav" aria-pressed="false" aria-label="Ajouter aux favoris">${ICO.coeur}</button></div>
      <div class="resto-tete"><h1>${esc(r.nom)}</h1><p class="muted">${esc(CUISINES[r.cuisine]?.[1] || '')} · ${esc(r.commune)}${r.adresse ? ', ' + esc(r.adresse) : ''}</p></div>
      <div class="puces-info">${infos.map(([c, t]) => `<span class="pi ${c}">${c === 'ok' ? ICO.coche : ''}${esc(t)}</span>`).join('')}</div>
      ${!horairesSem && r.horaires ? `<p class="muted petit">Horaires : ${esc(r.horaires)}</p>` : ''}
      ${r.description ? `<p class="resto-desc">${esc(r.description)}</p>` : ''}
      ${horairesSem ? `<details class="horaires-d"><summary>Horaires de la semaine</summary><div>${SEMAINE.map(j => `<span>${JOURS[j]}</span><b>${r.horaires_sem[j]?.length ? esc(r.horaires_sem[j].map(([a, b]) => `${hFr(a)} – ${hFr(b)}`).join(', ')) : 'Fermé'}</b>`).join('')}</div></details>` : ''}
      ${parCat.length > 1 ? `<nav class="onglets-cat onglets-s" aria-label="${bq ? 'Rayons' : 'Catégories de la carte'}">${parCat.map(([c], i) => `<button type="button" data-saut="${c}" class="${i ? '' : 'on'}">${esc(nomCat(c))}</button>`).join('')}</nav>` : ''}
      ${parCat.length ? parCat.map(([c, l]) => `<h2 class="cat-t" id="cat-${c}">${esc(nomCat(c))}</h2>${bq ? `<div class="rayon">${l.map(p => carteArticle(p, nbPlat(p.id), commandable)).join('')}</div>` : `<div class="plats-l">${l.map(ligneP).join('')}</div>`}`).join('')
        : `<div class="vide-etat"><p>${bq ? 'Les articles arrivent bientôt.' : 'La carte arrive bientôt.'}</p></div>`}
      ${bq && plats.some(p => p.majeur) ? `<p class="petit muted">${MODERATION}</p>` : ''}
      <p class="petit" style="margin-top:22px"><button type="button" class="lien" data-signaler="restaurant" data-id="${r.id}" data-univers="food" data-nom="${bq ? 'ce commerce' : 'ce restaurant'}">Signaler ${bq ? 'ce commerce' : 'ce restaurant'}</button></p>
    </div>
    <aside id="panneauCmd" aria-label="Mon panier"><div class="panier colle" id="panier"><div class="panier-t"><h2>Mon panier</h2>
      <button type="button" class="btn btn-s fermer-panier" data-fermer-panier>Retour à la carte</button></div><div id="lignes"></div>
      ${r.livraison && r.emporter ? `<div class="seg" role="group" aria-label="Livraison ou retrait"><button type="button" data-mode="livraison">Livraison</button><button type="button" data-mode="emporter">À emporter</button></div>` : `<p class="petit muted">${r.livraison ? 'Livraison uniquement' : 'À emporter uniquement'}</p>`}
      <form class="f" id="fCmd"><div id="adresse"></div>
        <label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
        ${programmable ? `<p class="petit" style="margin:0"><b>⏰ Fermé en ce moment${etat.texte ? ' (' + esc(etat.texte) + ')' : ''}</b> : programmez votre commande.</p>` : ''}
        <details class="plus-options" ${programmable ? 'open' : ''}><summary>Programmer, code promo, message</summary>
          <label>Quand ?<select name="quand">${programmable ? '' : '<option value="">Dès que possible</option>'}<option value="plus">Programmer pour plus tard</option></select></label><div id="heureCmd"></div>
          <div style="display:flex;gap:6px;align-items:flex-end"><label style="flex:1">Code promo<input name="code" maxlength="20" autocomplete="off" style="text-transform:uppercase"></label><button type="button" class="btn btn-s" id="appliquer">Appliquer</button></div>
          <label>Un mot pour le restaurant<input name="note" maxlength="500" placeholder="Sans piment, code du portail…"></label></details>
        <div id="majeur"></div><div id="pourboire"></div><div id="totaux"></div><button class="btn btn-p" id="commander" ${commandable ? '' : 'disabled'}>${commandable ? (programmable ? 'Programmer ma commande' : 'Commander') : 'Restaurant fermé'}</button>
        <p class="muted petit" style="margin:0">Allergènes : voir chaque ${bq ? 'article' : 'plat'} ; une question ? Contactez ${bq ? 'la boutique' : 'le restaurant'} avant de commander.</p><p class="muted petit" style="margin:0">${bq ? 'Paiement à la livraison ou au retrait (espèces ou carte, selon la boutique).' : 'Paiement au restaurant ou au livreur (espèces ou carte, selon le restaurant).'}</p></form></div></aside></div>
    <button type="button" class="barre-panier" id="barrePanier" hidden></button><div class="voile-panier" id="voilePanier"></div></div>`);
  const majAdresse = () => {
    $('#adresse').innerHTML = mode === 'livraison' ? `<label>Adresse de livraison<input name="adresse" required maxlength="300" autocomplete="street-address"></label>
      <label>Ville<input name="commune" required maxlength="60" list="villesK" value="${esc(r.communes_livrees.length === 1 ? r.communes_livrees[0] : r.commune)}"></label>
      <datalist id="villesK">${(r.communes_livrees.length ? r.communes_livrees : TERRITOIRES[r.territoire]?.villes || []).map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      ${r.communes_livrees.length ? `<p class="petit muted" style="margin:0">Livre à : ${esc(r.communes_livrees.join(', '))}</p>` : ''}` : `<p class="petit">À récupérer : <b>${esc(r.adresse || r.commune)}</b></p>`;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  };
  let remise = 0, codeOk = null;
  const lignesPanier = () => Object.entries(cart).map(([k, v]) => { const p = platDe(v.p); return p && v.n > 0 ? { k, p, n: v.n, pu: Number(p.prix) + supplement(p, v.o), lib: libelleOptions(p, v.o) } : null; }).filter(Boolean);
  const sousTotal = () => lignesPanier().reduce((t, x) => t + x.pu * x.n, 0);
  const majCompteurs = () => document.querySelectorAll('.qte[data-plat],.qte[data-opt]').forEach(qt => { const k = qt.dataset.plat || qt.dataset.opt; qt.querySelector('output').textContent = nbPlat(k) || (qt.dataset.plat ? 0 : ''); qt.classList.toggle('zero', !nbPlat(k)); });
  const majPanier = () => {
    const l = lignesPanier(), st = sousTotal(), frais = mode === 'livraison' ? Number(r.frais_livraison) : 0, pb = mode === 'livraison' ? tip : 0;
    if (codeOk && remise > st) remise = st;
    $('#lignes').innerHTML = l.length ? l.map(x => `<div class="ligne-panier"><span>${x.n} × ${esc(x.p.nom)}${x.lib ? `<small>${esc(x.lib)}</small>` : ''}</span>
      <span class="ln-d"><b>${eur(x.pu * x.n)}</b><button type="button" data-l="${esc(x.k)}" data-d="-1" aria-label="Retirer un ${esc(x.p.nom)}">−</button><button type="button" data-l="${esc(x.k)}" data-d="1" aria-label="Ajouter un ${esc(x.p.nom)}">+</button></span></div>`).join('') : `<p class="muted">Ajoutez des ${bq ? 'articles' : 'plats'} avec le bouton +.</p>`;
    // alcool dans le panier : le client confirme sa majorité ; le vendeur contrôle une pièce d'identité à la remise
    const majeur = l.some(x => x.p.majeur);
    if (majeur !== !!$('#majeur').childElementCount) $('#majeur').innerHTML = majeur ? `<label class="majeur-ok"><input type="checkbox" name="majeur" required> <span><b>J’ai 18 ans ou plus</b><small>Une pièce d’identité vous sera demandée à la remise.</small></span></label>` : '';
    $('#pourboire').innerHTML = BASE_V2 && l.length && mode === 'livraison' ? `<div class="pourboire"><span class="petit"><b>Pourboire pour le livreur</b> <span class="aide">(facultatif, 100 % pour lui)</span></span>
      <div class="actions">${[0, 1, 2, 3, 5].map(v => `<button type="button" class="btn btn-s ${tip === v ? 'btn-p' : ''}" data-tip="${v}">${v ? eur(v) : 'Non merci'}</button>`).join('')}</div></div>` : '';
    $('#totaux').innerHTML = l.length ? `<div class="muted petit">Sous-total ${eur(st)}${remise ? ` · code ${esc(codeOk)} −${eur(remise)}` : ''}${mode === 'livraison' ? ` · livraison ${frais ? eur(frais) : 'offerte'}` : ''}${pb ? ` · pourboire ${eur(pb)}` : ''}</div><div class="total-p">Total ${eur(st - remise + frais + pb)}</div>
      ${st < r.minimum ? `<p class="petit" style="color:var(--rouge);margin:0">Minimum de commande : ${eur(r.minimum)}</p>` : ''}` : '';
    panier.ecrire(id, cart);
    const nb = l.reduce((t, x) => t + x.n, 0);   // barre du bas (téléphone) : le panier en un coup d'œil
    $('#barrePanier').hidden = !nb || $('#panneauCmd').classList.contains('ouvert');
    $('#barrePanier').innerHTML = `<span>Voir le panier · ${nb} article${nb > 1 ? 's' : ''}</span><b>${eur(st - remise + frais + pb)}</b>`;
  };
  const panneau = ouvrir => { $('#panneauCmd').classList.toggle('ouvert', ouvrir); document.body.classList.toggle('sans-defil', ouvrir); majPanier(); if (ouvrir) $('#panneauCmd').scrollTop = 0; };
  $('#barrePanier').addEventListener('click', () => panneau(true));
  $('#panneauCmd').addEventListener('click', e => { if (e.target.closest('[data-fermer-panier]')) panneau(false); });
  $('#voilePanier').addEventListener('click', () => panneau(false));
  $('#retourResto').addEventListener('click', revenir);
  document.querySelectorAll('[data-saut]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-saut]').forEach(x => x.classList.toggle('on', x === b));
    const h = $('#cat-' + b.dataset.saut); window.scrollTo({ top: h.getBoundingClientRect().top + scrollY - 120, behavior: 'smooth' });
  }));
  // plat avec choix (accompagnement, sauce, suppléments) : petite fenêtre
  const choisir = p => {
    const d = document.createElement('dialog'); d.className = 'dlg-options';
    d.innerHTML = `<form method="dialog" class="f" id="fOpt"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h2 style="margin:0">${esc(p.nom)}</h2><button type="button" class="btn btn-s" data-fermer aria-label="Fermer">✕</button></div>
      ${p.description ? `<p class="muted petit" style="margin:0">${esc(p.description)}</p>` : ''}${texteAllergenes(p) ? `<p class="allerg" style="margin:0">${esc(texteAllergenes(p))}</p>` : ''}
      ${p.options.map((g, gi) => `<fieldset class="opt-g"><legend><b>${esc(g.nom)}</b> <span class="aide">${g.min > 0 ? (g.max === 1 ? '· obligatoire' : `· au moins ${g.min}`) : '· facultatif'}${g.max > 1 ? ` · jusqu’à ${g.max}` : ''}</span></legend>
        ${g.choix.map((c, ci) => `<label class="opt-c"><input type="${g.min >= 1 && g.max === 1 ? 'radio' : 'checkbox'}" name="g${gi}" value="${ci}"><span>${esc(c.nom)}</span>${Number(c.prix) ? `<b>+${eur(c.prix)}</b>` : ''}</label>`).join('')}</fieldset>`).join('')}
      <div class="opt-bas"><div class="qte"><button type="button" data-q="-1" aria-label="Moins">−</button><output>1</output><button type="button" data-q="1" aria-label="Plus">+</button></div><button class="btn btn-p" id="ajOpt">Ajouter</button></div></form>`;
    document.body.append(d); d.showModal();
    let nq = 1;
    const lus = () => [...d.querySelectorAll('input:checked')].map(i => [+i.name.slice(1), +i.value]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const maj = () => { d.querySelector('output').textContent = nq; d.querySelector('#ajOpt').textContent = `Ajouter · ${eur((Number(p.prix) + supplement(p, lus())) * nq)}`; };
    d.addEventListener('change', e => {
      const i = e.target, g = p.options[+i.name.slice(1)];
      if (i.type === 'checkbox' && d.querySelectorAll(`[name="${i.name}"]:checked`).length > g.max) { i.checked = false; toast(`${g.max} choix au maximum pour « ${g.nom} »`, true); }
      maj();
    });
    d.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) { nq = Math.max(1, Math.min(20, nq + Number(b.dataset.q))); maj(); } if (e.target.closest('[data-fermer]') || e.target === d) d.close(); });
    d.querySelector('#fOpt').addEventListener('submit', e => {
      const o = lus(), manque = p.options.find((g, gi) => o.filter(x => x[0] === gi).length < g.min);
      d.querySelectorAll('.opt-g').forEach((f, gi) => f.classList.toggle('manque', p.options[gi] === manque));
      if (manque) { e.preventDefault(); d.querySelector('.opt-g.manque').scrollIntoView({ block: 'center', behavior: 'smooth' }); return toast(`Choisissez « ${manque.nom} »`, true); }
      const k = p.id + '|' + o.map(x => x.join('.')).join(',');
      cart[k] = { p: p.id, n: Math.min(20, (cart[k]?.n || 0) + nq), o }; majPanier(); majCompteurs(); toast('Ajouté au panier');
    });
    d.addEventListener('close', () => d.remove());
    maj();
  };
  document.querySelectorAll('.qte[data-plat]').forEach(qt => qt.addEventListener('click', ev => {
    const b = ev.target.closest('[data-d]'); if (!b) return;
    const k = qt.dataset.plat, c = cart[k] || { p: k, n: 0, o: [] }, p = platDe(k);
    if (c.n + Number(b.dataset.d) > maxArticle(p)) return toast(p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum', true);
    c.n = Math.max(0, c.n + Number(b.dataset.d));
    if (c.n) cart[k] = c; else delete cart[k];
    majCompteurs(); majPanier();
  }));
  document.querySelectorAll('[data-choisir]').forEach(b => b.addEventListener('click', () => choisir(platDe(b.dataset.choisir))));
  $('#panier').addEventListener('click', ev => {
    const l = ev.target.closest('[data-l]'), t = ev.target.closest('[data-tip]');
    if (l && cart[l.dataset.l]) { const c = cart[l.dataset.l], p = platDe(c.p); if (c.n + Number(l.dataset.d) > maxArticle(p)) return toast(p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum', true); c.n = Math.max(0, c.n + Number(l.dataset.d)); if (!c.n) delete cart[l.dataset.l]; majCompteurs(); majPanier(); }
    if (t) { tip = Number(t.dataset.tip); majPanier(); }
  });
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; majAdresse(); majPanier(); }));
  majAdresse(); majPanier();
  if (param().panier && Object.keys(cart).length && matchMedia('(max-width: 900px)').matches) panneau(true);   // arrivé depuis « Valider mon panier »
  const vise = param().plat && $('#p-' + param().plat);   // arrivé depuis « Plats du moment » : le plat est montré, son choix ouvert s'il en a
  if (vise) { vise.scrollIntoView({ block: 'center' }); vise.classList.add('eclaire'); const pv = platDe(param().plat); if (pv && aOptions(pv) && commandable && !finArticle(pv)) choisir(pv); }
  const fuseauR = fuseauDe(r.territoire);
  const champHeure = () => {
    const des = Math.max(Date.now() + 25 * 6e4, etat.pause ? new Date(r.pause_jusqu_a).getTime() + 6e4 : 0);   // pendant une pause : après sa fin
    $('#heureCmd').innerHTML = $('#fCmd').quand.value ? `<label>Pour le <span class="aide">(heure de ${esc(r.territoire)}${horairesSem ? ', pendant les heures d’ouverture' : ''}${etat.pause ? `, après ${esc(etat.texte.replace('rouvre à ', ''))}` : ''})</span><input name="heure" type="datetime-local" required min="${utcVersLocal(new Date(des).toISOString(), fuseauR)}" max="${utcVersLocal(new Date(Date.now() + 7 * 864e5).toISOString(), fuseauR)}"></label>` : '';
  };
  $('#fCmd').quand.addEventListener('change', champHeure); champHeure();
  $('#appliquer').addEventListener('click', async () => {
    const code = $('#fCmd').code.value.trim(); if (!code) { remise = 0; codeOk = null; return majPanier(); }
    if (!exigeCompte()) return;
    try { remise = Number(await q(sb.rpc('remise_code', { resto: id, code_saisi: code, sous_total: sousTotal() }))); codeOk = code.toUpperCase(); toast(`🏷️ Code appliqué : −${eur(remise)}`); }
    catch (err) { remise = 0; codeOk = null; toast(erreur(err), true); }
    majPanier();
  });
  if (moi) {
    let fav = (await q(sb.from('favoris_resto').select('restaurant_id').eq('restaurant_id', id)).catch(() => [])).length > 0;
    const majFav = () => { $('#fav').setAttribute('aria-pressed', fav); $('#fav').setAttribute('aria-label', fav ? 'Retirer des favoris' : 'Ajouter aux favoris'); };
    majFav();
    $('#fav').onclick = async () => { try { if (fav) await q(sb.from('favoris_resto').delete().eq('restaurant_id', id)); else await q(sb.from('favoris_resto').insert({ restaurant_id: id })); fav = !fav; majFav(); } catch (err) { toast(erreur(err), true); } };
  } else $('#fav').onclick = () => exigeCompte();
  $('#fCmd').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!exigeCompte()) return;
    const d = Object.fromEntries(new FormData(ev.target)), lignes = Object.values(cart).filter(x => x.n > 0).map(x => ({ plat: x.p, quantite: x.n, options: x.o }));
    if (!lignes.length) return toast('Votre panier est vide.', true);
    const b = $('#commander'); b.disabled = true;
    try {
      // position de l'adresse pour guider le livreur (facultative : la commande part même si la recherche échoue)
      const pos = mode === 'livraison' ? (await geocoder(`${d.adresse}, ${d.commune}`, r.territoire).catch(() => []))[0] : null;
      const c = await q(sb.rpc('passer_commande', { resto: id, mode_cmd: mode, lignes, adresse_cmd: d.adresse || null, commune_cmd: d.commune || null, telephone_cmd: d.telephone.trim(), note_cmd: d.note || null,
        lat_cmd: pos?.lat ?? null, lng_cmd: pos?.lng ?? null, heure_cmd: d.heure ? localVersUTC(d.heure, fuseauR) : null, code_cmd: codeOk, ...(BASE_V2 ? { pourboire_cmd: mode === 'livraison' && tip ? tip : null } : {}) }));
      cart = {}; panier.ecrire(id, cart); oublier('resto'); oublier('acc-'); toast(`Commande envoyée à ${r.nom}. ${bq ? 'La boutique' : 'Le restaurant'} doit l’accepter : vous serez prévenu ici.`); aller('#/suivi/' + c.id);
    } catch (err) { toast(erreur(err).replace(/^[A-Z_]{4,}\s+/, ''), true); b.disabled = false; if (/stock|épuisé|PAUSE/i.test(err.message || '')) oublier('resto'); }
  });
};

// ---------------------------------------------------------------- suivi et historique (client)
APP.pages.suivi = async id => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  let L = null;
  const dessiner = async () => {
    const c = await q(sb.from('commandes').select('*, restaurants(*), commande_lignes(*)').eq('id', id).maybeSingle());
    if (!c) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Commande introuvable</h3></div>');
    const lv = c.mode === 'livraison' ? await q(sb.rpc('suivi_livraison', { cmd: id })).catch(() => null) : null;
    const lvActive = lv && ['acceptee', 'au_restaurant', 'recuperee'].includes(lv.statut);
    const etapes = ETAPES.filter(e => c.mode === 'livraison' || !['en_livraison'].includes(e[0])).map(e => e[0] === 'livree' && c.mode === 'emporter' ? ['retiree', '🎉', 'Retirée'] : e[0] === 'en_preparation' && estBoutique(c.restaurants) ? ['en_preparation', '📦', 'Préparation'] : e);
    const pos = etapes.findIndex(e => e[0] === c.statut), fini = ['refusee', 'annulee'].includes(c.statut);
    const avis = ['livree', 'retiree'].includes(c.statut) ? await q(sb.from('avis_resto').select('id').eq('commande_id', id)) : [];
    vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><a href="#/activite?f=repas" class="petit">← Mon activité</a>
      <div class="panneau" style="margin-top:10px"><span class="px">Commande ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(jourHeure(c.created_at))}</span><h1 style="margin:6px 0">${esc(c.restaurants?.nom || '')}</h1>
        ${fini ? `<div class="verdict ko"><big>${c.statut === 'refusee' ? '😕' : '❌'}</big>Commande ${c.statut === 'refusee' ? 'refusée par le restaurant' : 'annulée'}</div>`
          : `<div class="quetes" style="margin:14px 0">${etapes.map((e, i) => `<div class="quete ${i < pos || c.statut === e[0] && ['livree', 'retiree'].includes(e[0]) ? 'faite' : i === pos ? 'actuelle' : ''}"><span class="q-coche">${i <= pos ? '✓' : ''}</span><span class="q-ico">${e[1]}</span><span class="q-titre">${e[2]}</span></div>`).join('')}</div>`}
        <div>${c.commande_lignes.map(l => `<div class="ligne-panier"><span>${l.quantite} × ${esc(l.nom)}${l.options ? `<small>${esc(l.options)}</small>` : ''}</span><b>${eur(l.prix * l.quantite)}</b></div>`).join('')}
          ${Number(c.remise) ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Code ${esc(c.code_promo)}</span><span>−${eur(c.remise)}</span></div>` : ''}
          ${c.frais > 0 ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Livraison</span><span>${eur(c.frais)}</span></div>` : ''}
          ${Number(c.pourboire) ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Pourboire du livreur 💛</span><span>${eur(c.pourboire)}</span></div>` : ''}
          ${c.pour_heure ? `<p class="petit"><b>⏰ Programmée pour ${esc(jourHeure(c.pour_heure))}</b></p>` : ''}${c.majeur ? '<p class="petit"><b>🔞 Pièce d’identité demandée à la remise.</b></p>' : ''}<div style="font:700 22px var(--titres);margin-top:6px">Total ${eur(c.total)}</div>
          <p class="muted petit">${c.mode === 'livraison' ? `🛵 Livraison : ${esc(c.adresse)}, ${esc(c.commune)}` : `🛍️ À retirer : ${esc(c.restaurants?.adresse || c.restaurants?.commune || '')}`} · ${lv ? `paiement au livreur à la livraison (${eur(c.total)})` : 'paiement sur place'}</p></div>
        ${lv && !fini && lv.statut !== 'livree' ? `<div class="panneau" style="margin:12px 0;padding:14px;border-color:var(--ciel)">
          ${lv.livreur ? `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>🛵 ${esc(lv.livreur.prenom || 'Votre livreur')}</b> · ${esc(lv.livreur.vehicule)}${lv.livreur.couleur ? ' ' + esc(lv.livreur.couleur) : ''}
              <div class="muted petit">${{ acceptee: 'part chercher votre commande', au_restaurant: 'est au restaurant', recuperee: 'est en route vers vous' }[lv.statut] || ''}${lvActive && lv.livreur.lat == null ? ' · position pas encore partagée' : ''}</div></div>
              ${lv.livreur.telephone ? `<a class="btn btn-s" href="tel:${esc(lv.livreur.telephone)}">📞 Appeler</a>` : ''}</div>`
            : '<b>🔎 Nous cherchons un livreur près du restaurant…</b>'}
          ${lv.code ? `<div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="petit">Code à donner au livreur à la remise :</span><b class="code-remise">${esc(lv.code)}</b></div>` : ''}
          <div id="carteLv" style="height:260px;border-radius:18px;margin-top:12px;background:var(--rose-doux)"></div></div>` : ''}
        <div class="actions">${c.restaurants?.telephone ? `<a class="btn btn-s btn-wa" href="${wa(c.restaurants.telephone, 'Bonjour, à propos de ma commande ' + c.id.slice(0, 6).toUpperCase() + ' sur Woulib.')}" target="_blank" rel="noopener">WhatsApp au restaurant</a>` : ''}
          ${c.statut === 'envoyee' ? '<button class="btn btn-s btn-ko" id="annuler">Annuler</button>' : ''}
          <a class="btn btn-s" href="#/assistance?sujet=commande&id=${c.id}">Un problème ?</a><button type="button" class="btn btn-s" data-signaler="commande" data-id="${c.id}" data-univers="food" data-nom="cette commande">🚩 Signaler</button></div></div>
      ${['livree', 'retiree'].includes(c.statut) && !avis.length ? `<form class="f panneau" id="fAvis" style="margin-top:18px"><h2 style="margin:0">C’était bon ? 😋</h2><label>Note<select name="note">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'⭐'.repeat(n)}</option>`).join('')}</select></label>
        <label>Votre avis<textarea name="texte" maxlength="1000" style="min-height:80px"></textarea></label><button class="btn btn-p">Publier mon avis</button></form>` : ''}</div>`);
    $('#annuler')?.addEventListener('click', async () => { if (!confirm('Annuler la commande ?')) return; try { await q(sb.rpc('changer_commande', { cmd: id, nouveau: 'annulee' })); dessiner(); } catch (err) { toast(erreur(err), true); } });
    $('#fAvis')?.addEventListener('submit', async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); try { await q(sb.from('avis_resto').insert({ commande_id: id, note: +d.note, texte: d.texte.trim() })); toast('Merci pour votre avis !'); dessiner(); } catch (err) { toast(erreur(err), true); } });
    if ($('#carteLv')) {   // carte : restaurant, domicile, livreur
      try {
        L = L || await chargerCarte();
        const pts = [[lv.retrait, '🍽️', 'Restaurant'], [lv.depot, '🏠', 'Chez vous'], [lvActive && lv.livreur?.lat != null ? [lv.livreur.lat, lv.livreur.lng] : null, '🛵', 'Livreur']]
          .filter(([p]) => p && p[0] != null).map(([p, e, t]) => L.marker(p, { icon: L.divIcon({ html: `<span style="font-size:28px">${e}</span>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }) }).bindTooltip(t));
        if (pts.length) { const carte = fondCarte(L, $('#carteLv'), pts[0].getLatLng(), 13); pts.forEach(m => m.addTo(carte)); if (pts.length > 1) carte.fitBounds(L.featureGroup(pts).getBounds().pad(0.3)); }
        else $('#carteLv').remove();
      } catch (e) { $('#carteLv')?.remove(); }
    }
    if (fini || ['livree', 'retiree'].includes(c.statut)) { clearInterval(suivi); suivi = null; }
  };
  await dessiner();
  clearInterval(suivi); suivi = setInterval(() => { if (location.hash.startsWith('#/suivi/') && !document.hidden && !enSaisie()) dessiner().catch(() => {}); }, 10000);
};
APP.pages.commandes = () => rediriger('#/activite?f=repas');   // les commandes vivent dans l'onglet Activité
// remettre dans le panier les plats d'une commande passée (ceux qui sont encore à la carte)
async function recommander(cmd, resto) {
  try {
    const [lignes, plats] = await Promise.all([q(sb.from('commande_lignes').select('plat_id, quantite').eq('commande_id', cmd)), q(sb.from('plats').select('*').eq('restaurant_id', resto))]);
    const cart = {}; let manquants = 0, aChoisir = 0;
    lignes.forEach(x => {
      const p = plats.find(y => y.id === x.plat_id && y.dispo && y.stock !== 0);
      if (!p) manquants++; else if (p.options?.some(g => g.min > 0)) aChoisir++;
      else cart[p.id] = { p: p.id, n: Math.min(maxArticle(p), (cart[p.id]?.n || 0) + x.quantite), o: [] };
    });
    panier.ecrire(resto, cart);
    toast([manquants && `${manquants} article(s) plus disponible(s)`, aChoisir && `${aChoisir} plat(s) à rechoisir (accompagnement)`].filter(Boolean).join(' · ') || '🔁 Votre panier est prêt'); aller(`#/resto/${resto}?panier=1`);
  } catch (err) { toast(erreur(err), true); }
}
