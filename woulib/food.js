/* Woulib Food : restaurants, livraison, à emporter, précommande. APP et registre des univers : app.js ; base commune : commun/base.js.
   Prix, totaux et étapes de commande contrôlés par la base (food.sql). */
'use strict';
// Maquette validée (23/11) : icônes au trait à la place des emoji des catégories et des vignettes ; une photo qui ne charge pas retombe sur le fond et
// l'icône de la cuisine (écouteur « error » en capture sur le document : la CSP interdit onerror en ligne) ; largeur et hauteur toujours écrites.
// IIFE : tous les fichiers JS partagent la même portée globale, seul UIF en sort.
const UIF = (() => {
  const D = {
    bol: 'M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-2 1-3M13 7c0-1.5 1-2 1-3', crepe: 'M4 8c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3zM4 8v3c0 2 3.6 3 8 3s8-1 8-3V8M4 14v2c0 2 3.6 3 8 3s8-1 8-3v-2',
    pizza: 'M12 21 4 6c5-3 11-3 16 0zM9 9h.01M14 11h.01M12 15h.01', burger: 'M4 11a8 6 0 0 1 16 0zM3 15h18M4 18c0 1.5 1 2 2 2h12c1 0 2-.5 2-2v-1H4z',
    poulet: 'M14 4a6 6 0 0 1 6 6c0 3-2 5-5 5l-3-1-6 6-2-2 6-6-1-3c0-3 2-5 5-5z', poisson: 'M3 12c3-5 9-6 14-3l4-2v10l-4-2c-5 3-11 2-14-3zM16 11h.01',
    cup: 'M6 7h12l-1.5 13h-9zM5 7h14M12 7l2-4h3', cake: 'M4 14h16v6H4zM6 14v-3h12v3M12 11V7M12 5v.5', glace: 'M8 11a4 4 0 1 1 8 0zM8 11l4 10 4-10',
    salade: 'M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19l8-8', sushi: 'M4 10h16v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM4 10c0-2 3.6-3 8-3s8 1 8 3M9 13h6',
    accras: 'M10 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM15 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', bokit: 'M3 12c0-3 4-5 9-5s9 2 9 5zM3 15h18M5 15l1 4h12l1-4',
    frites: 'M6 9h12l-1 12H7zM8 9V4M12 9V3M16 9V4', sac: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2', filtre: 'M4 6h16M7 12h10M10 18h4', etoile: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    moto: 'M8 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM22 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM8 17h8M10 6h4l4 11M5 14l2-8', pin: 'M12 21s-7-6-7-11a7 7 0 1 1 14 0c0 5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', bas: 'M6 9l6 6 6-6', maison: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6', couvert: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 7h3v11', panier: 'M3 4h2l2.5 11h10L20 7H6M9 20h.01M17 20h.01', fruits: 'M12 8c-4-2-8 0-8 6s4 8 8 6c4 2 8 0 8-6s-4-8-8-6zM12 8c0-2 1-4 3-5'
  };
  const ic = (k, t = 24) => `<svg viewBox="0 0 24 24" width="${t}" height="${t}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${D[k] || D.bol}"/></svg>`;
  // une icône par cuisine et par rayon de la carte
  const CUISINE = { creole: 'bol', snack: 'bokit', burger: 'burger', pizza: 'pizza', asiatique: 'bol', sushi: 'sushi', grillades: 'poulet', poisson: 'poisson', vegetarien: 'salade',
    boulangerie: 'bokit', dessert: 'cake', traiteur: 'bol', boissons: 'cup', epicerie: 'sac', autre: 'bol' };
  const RAYON = { menu: 'bol', entree: 'salade', plat: 'bol', accompagnement: 'frites', dessert: 'cake', boisson: 'cup', frais: 'cup', alcool: 'cup', apero: 'frites', glace: 'glace', epicerie: 'sac', maison: 'sac', autre: 'sac' };
  const ph = k => `<span class="ph" aria-hidden="true">${ic(k, 32)}</span>`;
  // la photo (avec ses dimensions) ou, sans photo, l'icône ; prio : image principale de la page (chargée tout de suite, en priorité)
  const img = (src, k, w, h, prio) => src ? `<img src="${esc(photo(src))}" alt="" width="${w}" height="${h}" ${prio ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>` : ph(k);
  document.addEventListener('error', e => {
    const i = e.target, w = i?.tagName === 'IMG' && i.closest('[data-ic]'); if (!w) return;
    i.hidden = true; if (!w.querySelector('.ph')) w.insertAdjacentHTML('beforeend', ph(w.dataset.ic));
  }, true);
  return { ic, ph, img, cuisine: c => CUISINE[c] || 'bol', rayon: c => RAYON[c] || 'sac' };
})();
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
// alcool (boutique.sql, contrôlé par la base) : licence déclarée par le vendeur ; vendu dans la plage horaire du territoire (8 h - 22 h par défaut),
// à toute heure d'ouverture avec un permis de vente de nuit. alcoolV2 : la base a reçu ces règles (sinon l'écran reste comme avant)
const alcoolV2 = () => reglage('food', null, 'heure_debut_alcool') != null;
const plageAlcool = terr => [Number(reglage('food', terr, 'heure_debut_alcool') ?? 8), Number(reglage('food', terr, 'heure_fin_alcool') ?? 22)];
const hNum = h => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;   // 8 → « 08:00 »
const textePlage = terr => { const [d, f] = plageAlcool(terr); return `de ${hFr(hNum(d))} à ${hFr(hNum(f))}`; };
// « HH:MM » (heure du territoire) dans la plage ? même calcul que vente_alcool_ok() ; sans heure : maintenant
const alcoolPermisA = (terr, hm = utcVersLocal(new Date().toISOString(), fuseauDe(terr)).split('T')[1]) => {
  const [d, f] = plageAlcool(terr), x = Number(hm.slice(0, 2)) + Number(hm.slice(3, 5)) / 60;
  return d === f ? false : d < f ? x >= d && x < f : x >= d || x < f;
};
// Food en trois parties (food2.sql) : Plats maison | Restaurants | Courses. La partie d'une fiche : « rubrique » si la base l'a, sinon déduite du genre.
// food2Pret : la base a woulib_food_version() >= 2 (sinon « Plats maison » reste caché et Food est comme avant).
const rubDe = r => r?.rubrique || (estBoutique(r) ? 'courses' : 'restaurant');
const estMaison = r => r?.rubrique === 'maison';
let food2V = null;
const food2Pret = () => food2V || (food2V = Promise.resolve().then(() => q(sb.rpc('woulib_food_version'))).then(v => Number(v) >= 2, () => false));
const RUBS = [['maison', 'Plats maison', 'maison'], ['restaurant', 'Restaurants', 'couvert'], ['courses', 'Courses', 'panier']];
const sansLicence = r => alcoolV2() && 'licence_alcool' in r && !r.licence_alcool;   // ses articles 18+ ne sont pas en vente
// une vignette d'article : on l'ajoute d'un geste (+), le compteur apparaît ensuite ; le stock limite la quantité
const finArticle = p => !p.dispo || p.stock === 0;
const carteArticle = (p, n, ok) => `<div class="article ${finArticle(p) ? 'fini' : ''}" id="p-${p.id}">
  <div class="art-img t-com" data-ic="${UIF.rayon(p.categorie)}">${UIF.img(p.photo, UIF.rayon(p.categorie), 300, 225)}${p.majeur ? '<em class="art-18" title="Réservé aux majeurs">18+</em>' : ''}</div>
  <b>${esc(p.nom)}</b>${p.description ? `<small>${esc(p.description)}</small>` : ''}${p.allergenes?.length ? `<small class="allerg">${esc(texteAllergenes(p))}</small>` : ''}
  <div class="art-bas"><span class="prix">${eur(p.prix)}</span>${finArticle(p) ? '<span class="tag gris">Épuisé</span>' : ok ? `<div class="qte ${n ? '' : 'zero'}" data-plat="${p.id}"><button type="button" data-d="-1" aria-label="Retirer un ${esc(p.nom)}">−</button><output>${n}</output><button type="button" data-d="1" aria-label="Ajouter ${esc(p.nom)}">+</button></div>` : ''}</div>
  ${!finArticle(p) && p.stock != null && p.stock <= 5 ? `<small class="art-stock">Plus que ${p.stock}</small>` : ''}</div>`;
const maxArticle = p => Math.min(20, p.stock ?? 20);
// vitrine de l'accueil (20/11) : boissons fraîches, crêpes et douceurs, à grignoter, en grandes photos ; uniquement de vrais plats publiés
const VITRINE = [['boisson', 'Boissons fraîches', p => p.categorie === 'boisson'],
  ['douceur', 'Crêpes et douceurs', p => p.categorie === 'dessert' || /cr[eê]pe|galette|gaufre/i.test(p.nom)],
  ['grignoter', 'À grignoter', p => ['entree', 'accompagnement'].includes(p.categorie) && !/cr[eê]pe|galette/i.test(p.nom)]];
async function afficherVitrine(restos) {
  const el = $('#vitrineAcc'); if (!el || !restos.length) return;
  const ouverts = restos;   // déjà filtrés : ouverts maintenant
  const l = await memo('acc-vitrine:' + ouverts.map(r => r.id).join(','), () => q(sb.from('plats').select('*').in('restaurant_id', ouverts.map(r => r.id))
    .in('categorie', ['boisson', 'dessert', 'entree', 'accompagnement', 'plat']).eq('dispo', true).not('photo', 'is', null).order('ordre').limit(80)), 30000);
  const rayons = VITRINE.map(([k, t, f]) => [k, t, l.filter(p => p.stock !== 0 && f(p)).slice(0, 10)]).filter(([, , x]) => x.length);
  if (!rayons.length || !$('#vitrineAcc')) return;
  const resto = id => restos.find(r => r.id === id);
  el.innerHTML = `<div class="titre-s"><h2>La vitrine</h2><a class="petit" href="credits-photos.html">Crédits photos</a></div>
    ${rayons.map(([k, t, x]) => `<h3 class="vit-t">${UIF.ic({ boisson: 'cup', douceur: 'crepe', grignoter: 'accras' }[k], 20)}${t}</h3><div class="defile vit-defile">${x.map(p => `<a class="vit-c" href="#/resto/${p.restaurant_id}?plat=${p.id}">
      <span class="vit-img ph-w" data-ic="${UIF.rayon(p.categorie)}"><img src="${esc(photo(p.photo))}" alt="${esc(p.nom)}" loading="lazy" decoding="async" width="400" height="400"></span>
      <span class="vit-txt"><b>${esc(p.nom)}</b>${p.description ? `<small>${esc(p.description)}</small>` : ''}<span class="art-bas"><span class="prix">${eur(p.prix)}</span><i class="plus-c" aria-hidden="true">+</i></span>
      <small class="vit-resto">${esc(resto(p.restaurant_id)?.nom || '')} · ${resto(p.restaurant_id)?.delai_min || 30} min</small></span></a>`).join('')}</div>`).join('')}`;
  el.hidden = false;
}
// accueil : des plats des restaurants ouverts ; un geste ouvre la carte du restaurant sur ce plat
async function afficherPlatsAccueil(restos) {
  const el = $('#platsAcc'); if (!el || !restos.length) return;
  const l = await memo('acc-plats:' + restos.map(r => r.id).join(','), () => q(sb.from('plats').select('*').in('restaurant_id', restos.map(r => r.id)).in('categorie', ['plat', 'menu']).eq('dispo', true).limit(60)), 30000);
  const jour = new Date().getDate();   // l'ordre change chaque jour, ceux qui ont une photo d'abord
  const choix = l.filter(p => p.stock !== 0).sort((a, b) => (!!b.photo - !!a.photo) || ((a.id.charCodeAt(0) + jour) % 7) - ((b.id.charCodeAt(0) + jour) % 7)).slice(0, 12);
  if (!choix.length || !$('#platsAcc')) return;
  const resto = id => restos.find(r => r.id === id);
  el.innerHTML = `<div class="titre-s"><h2>Plats du moment</h2><a href="#/manger">Tout voir</a></div>
    <div class="defile plats-defile">${choix.map(p => `<a class="plat-c" href="#/resto/${p.restaurant_id}?plat=${p.id}"><div class="art-img t-food" data-ic="${UIF.cuisine(resto(p.restaurant_id)?.cuisine)}">${UIF.img(p.photo, UIF.cuisine(resto(p.restaurant_id)?.cuisine), 340, 255)}</div>
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
    .filter(p => p.stock !== 0 && !p.options?.length && !(p.majeur && sansLicence(b)));
  const el = $('#boutiqueAcc'); if (!arts.length || !el) return;
  const cart = lirePanier(b.id), nb = k => cart[k]?.n || 0;
  el.innerHTML = `<div class="titre-s"><h2>Boissons et dépannage</h2><a href="#/resto/${b.id}">Tout voir</a></div>
    <p class="muted petit" style="margin:-4px 0 10px">${esc(b.nom)} · ${b.delai_min} min${b.livraison ? ` · livraison ${Number(b.frais_livraison) ? eur(b.frais_livraison) : 'offerte'}` : ''}${b.emporter ? ' · retrait sur place' : ''}</p>
    <div class="defile rayon-defile">${arts.map(p => carteArticle(p, nb(p.id), true)).join('')}</div>
    ${arts.some(p => p.majeur) ? `<p class="petit muted" style="margin:6px 0 0">${MODERATION}${alcoolV2() && !b.permis_nuit ? ` Alcool vendu ${textePlage(b.territoire)}.` : ''}</p>` : ''}<button type="button" class="barre-vite" id="barreVite" hidden></button>`;
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
// Food en trois parties : rayons rapides de Courses, plats du jour des cuisiniers, produits trouvés, panier flottant (ajout en un geste, sans quitter la liste)
const RAYONS_RAPIDES = [['Tout', 'panier', {}], ['Fruits et légumes', 'fruits', { q: 'fruits' }], ['Boissons', 'cup', { rayon: 'frais' }], ['Épicerie', 'sac', { rayon: 'epicerie' }], ['Apéro', 'frites', { rayon: 'apero' }],
  ['Glaces', 'glace', { rayon: 'glace' }], ['Plats préparés', 'bol', { rayon: 'plat' }], ['Dépannage', 'sac', { rayon: 'maison' }]];
const panierEnCours = () => { try { const id = localStorage.getItem('kvPanierDernier'); if (!id) return null; const n = Object.values(lirePanier(id)).reduce((t, x) => t + (x.n > 0 ? x.n : 0), 0); return n ? { id, n } : null; } catch (e) { return null; } };
function afficherPanierFlottant() {
  const c = panierEnCours(); let b = $('#barreFlot');
  if (!c) { b?.remove(); return; }
  if (!b) { const hote = $('.page-manger'); if (!hote) return; b = document.createElement('button'); b.type = 'button'; b.id = 'barreFlot'; b.className = 'barre-vite'; b.addEventListener('click', () => aller(`#/resto/${b.dataset.r}?panier=1`)); hote.append(b); }
  b.dataset.r = c.id; b.innerHTML = `<span>${c.n} article${c.n > 1 ? 's' : ''}</span><b>Voir mon panier</b>`;
}
// « + » d'une carte : l'article entre dans le panier de sa boutique ; avec un choix à faire (options) ou un article 18+, la fiche s'ouvre sur lui
function ajoutRapide(e, liste) {
  const b = e.target.closest('[data-ajout]'); if (!b) return;
  const p = liste.find(x => x.id === b.dataset.ajout); if (!p) return;
  if (p.options?.length || p.majeur) return aller(`#/resto/${p.restaurant_id}?plat=${p.id}`);
  const cart = lirePanier(p.restaurant_id), c = cart[p.id] || { p: p.id, n: 0, o: [] };
  if (c.n + 1 > maxArticle(p)) return toast(p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum', true);
  c.n++; cart[p.id] = c; panier.ecrire(p.restaurant_id, cart); toast('Ajouté au panier'); afficherPanierFlottant();
}
const carteMini = p => { const k = UIF.rayon(p.categorie || 'plat'); return `<div class="prod-c"><a class="prod-a" href="#/resto/${p.restaurant_id}?plat=${p.id}"><span class="prod-i" data-ic="${k}">${UIF.img(p.photo, k, 160, 160)}</span>
  <span class="prod-t"><b>${esc(p.nom)}</b><small>${esc(p.resto || '')}${p.delai_min ? ' · ' + p.delai_min + ' min' : ''}</small><span class="prix">${eur(p.prix)}</span></span></a>
  <button type="button" class="plus-c" data-ajout="${p.id}" aria-label="Ajouter ${esc(p.nom)} au panier">+</button></div>`; };
async function afficherProduits(rub, terr, mot) {
  const l = await q(sb.rpc('food_chercher', { terr, mot, rub })).catch(() => []), el = $('#produits'); if (!el) return;
  el.innerHTML = l.length ? `<h2>${rub === 'courses' ? 'Produits' : 'Plats'} · ${l.length}</h2><div class="prod-g">${l.map(carteMini).join('')}</div>` : '';
  el.onclick = e => ajoutRapide(e, l);
}
// vitrine de « Plats maison » : les plats du jour des cuisiniers ouverts, avec la quantité qui reste et l'heure de retrait
async function afficherJours(terr) {
  const l = await memo('jours:' + terr, () => q(sb.rpc('food_plats_du_jour', { terr })), 20000), el = $('#joursM'); if (!el) return;
  if (!l.length) { el.innerHTML = `<section class="section"><div class="vide-mini"><b>Pas de plat du jour pour l’instant</b><small>Les cuisiniers publient leur plat du matin : revenez vers 10 h.</small></div></section>`; return; }
  el.innerHTML = `<section class="section"><div class="titre-s"><h2>Les plats du jour</h2></div><div class="defile plats-defile">${l.map(p => `<div class="jour-c"><a href="#/resto/${p.restaurant_id}?plat=${p.id}"><span class="art-img t-food" data-ic="bol">${UIF.img(p.photo, 'bol', 340, 255)}${p.stock != null ? `<em class="jour-stock">Plus que ${p.stock}</em>` : ''}</span>
    <b>${esc(p.nom)}</b><small>${esc(p.cuisinier || p.resto)} · ${esc(p.commune)} · ${p.delai_min} min</small>${p.retrait_info ? `<small class="jour-retrait">${esc(p.retrait_info)}</small>` : ''}</a>
    <span class="art-bas"><span class="prix">${eur(p.prix)}</span><button type="button" class="plus-c" data-ajout="${p.id}" aria-label="Ajouter ${esc(p.nom)} au panier">+</button></span></div>`).join('')}</div></section>`;
  el.onclick = e => ajoutRapide(e, l);
}
const ETAPES = [['envoyee', '📨', 'Envoyée'], ['acceptee', '👍', 'Acceptée'], ['en_preparation', '👩‍🍳', 'En cuisine'], ['prete', '🛍️', 'Prête'], ['en_livraison', '🛵', 'En route'], ['livree', '🎉', 'Livrée']];
const ST_CMD = { envoyee: ['att', 'Envoyée'], acceptee: ['ok', 'Acceptée'], refusee: ['ko', 'Refusée'], en_preparation: ['ok', 'En cuisine'], prete: ['ok', 'Prête'], en_livraison: ['ok', 'En route'],
  livree: ['gris', 'Livrée'], retiree: ['gris', 'Retirée'], annulee: ['ko', 'Annulée'] };
const ST_RESTO = { brouillon: ['gris', 'Brouillon'], en_attente: ['att', 'En validation'], publie: ['ok', 'En ligne'], refuse: ['ko', 'Refusé'], pause: ['gris', 'En pause'] };
let suivi = null;   // minuterie de rafraîchissement (suivi de commande, tableau du restaurateur)

// panier : gardé sur l'appareil, un par restaurant
const panier = { lire: r => { try { return JSON.parse(localStorage.getItem('kvPanier-' + r)) || {}; } catch (e) { return {}; } }, ecrire: (r, p) => { try { localStorage.setItem('kvPanier-' + r, JSON.stringify(p)); if (Object.keys(p).length) localStorage.setItem('kvPanierDernier', r); } catch (e) { /* stockage indisponible */ } } };
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
const ENVIE_IC = { 'crêpe': 'crepe', bokit: 'bokit', pizza: 'pizza', burger: 'burger', frite: 'frites', poulet: 'poulet', poisson: 'poisson', accras: 'accras', colombo: 'bol', sushi: 'sushi', salade: 'salade', glace: 'glace', dessert: 'cake', jus: 'cup' };
// Food (restaurants) et Commerce (boutiques) : deux rubriques de la barre du bas, la même page qui sait laquelle elle montre.
// Maquette validée (23/11) : adresse en haut, une recherche, des catégories en icônes, la mise en avant, puis « Ouverts près de vous » en cartes pleine largeur ;
// les filtres restent, repliés dans un bouton. Les requêtes partent ensemble (pas de chaîne au démarrage) ; le tri par genre et par filtre se fait ici.
const pageMarche = async marche => {
  const p = param(), terr = territoireActif();
  const pR = Promise.resolve().then(() => q(sb.from('restaurants').select('*').in('statut', ['publie', 'pause']).eq('territoire', terr).order('ouvert', { ascending: false }).order('created_at', { ascending: false }).limit(80)));
  const pN = Promise.resolve().then(() => q(sb.from('notes_resto').select('*').limit(300))).catch(() => []); pR.catch(() => {});
  // Food s'affiche tout de suite (squelettes) : le registre arrive en parallèle, l'écran n'attend pas (sauf pour Commerce et les parties « maison » / « courses », qui en dépendent)
  const veutRub = marche === 'food' && ['maison', 'courses'].includes(p.rub);
  let v2 = false;
  if (marche === 'commerce' || veutRub) { [, v2] = await Promise.all([chargerRegistre(), food2Pret()]); if (!universOuvert('food')) return universFerme('food'); }
  const rub = marche === 'commerce' ? 'courses' : veutRub && (p.rub === 'maison' ? v2 : BOUTIQUES) ? p.rub : 'restaurant';
  const com = BOUTIQUES && rub === 'courses', maison = rub === 'maison', mot = maison ? 'cuisinier' : com ? 'commerce' : 'restaurant';
  const lienF = ch => (marche === 'commerce' ? '#/commerce' : '#/manger') + ((u => u.toString() ? '?' + u : '')(new URLSearchParams(Object.entries({ ...p, ...ch }).filter(([k, v]) => v && k !== 'vue'))));
  const puce = (ch, t, on) => `<a href="${lienF(ch)}" class="${on ? 'on' : ''}" ${on ? 'aria-current="true"' : ''}>${t}</a>`;
  const nbFiltres = [p.ouvert, p.mode, p.commune, p.cuisine, p.rayon].filter(Boolean).length;
  vue(`<div class="wrap page-manger ${com ? 'page-commerce' : ''} ${maison ? 'page-maison' : ''}"><h1 class="sr-seul">${marche === 'commerce' ? 'Commerce' : 'Food'}</h1>
    <button type="button" class="adr-haut" id="adrHaut" aria-label="Changer de territoire, actuellement ${esc(terr)}">${UIF.ic('pin', 20)}<b>${esc(terr)}</b>${UIF.ic('bas', 18)}<span>· ${p.mode === 'emporter' ? 'À emporter' : 'Livraison'}</span></button>
    ${marche === 'commerce' ? '' : blocInstallation()}<div id="enCours"></div>
    ${marche === 'commerce' ? '' : '<nav class="rubs" id="rubs" aria-label="Les trois parties de Food"></nav>'}
    ${rub === 'restaurant' ? `<a class="rch-lien" href="#/recherche${p.q ? '?q=' + encodeURIComponent(p.q) : ''}">${ICO.recherche}<span>${p.q ? esc(p.q) : com ? 'Un produit, une boutique, un rayon…' : 'Un plat, un restaurant, une cuisine…'}</span></a>`
      : `<form class="rch-form" id="rchForm" role="search" autocomplete="off">${ICO.recherche}<input type="search" name="q" value="${esc(p.q || '')}" maxlength="60" placeholder="${maison ? 'Un plat, un cuisinier…' : 'Un produit : banane, riz, jus…'}" aria-label="Rechercher"></form>`}
    ${rub === 'courses' && marche !== 'commerce' ? `<nav class="envies defile" aria-label="Rayons">${RAYONS_RAPIDES.map(([t, ic, ch]) => `<a href="${lienF({ ...ch, q: ch.q || '', rayon: ch.rayon || '' })}" ${(ch.rayon && p.rayon === ch.rayon) || (ch.q && p.q === ch.q) ? 'aria-current="true"' : ''}><span class="ev-i" aria-hidden="true">${UIF.ic(ic)}</span><span>${t}</span></a>`).join('')}</nav>` : ''}
    ${maison ? '<div id="joursM"></div>' : ''}
    ${rub !== 'restaurant' ? '' : `<nav class="envies defile" aria-label="Envie de…">${ENVIES.map(([, t, m]) => `<a href="#/manger?q=${encodeURIComponent(m)}" ${sansAccent(p.q) === sansAccent(m) ? 'aria-current="true"' : ''}><span class="ev-i" aria-hidden="true">${UIF.ic(ENVIE_IC[m])}</span><span>${t}</span></a>`).join('')}</nav>`}
    <details class="filtres-d" ${nbFiltres ? 'open' : ''}><summary class="btn btn-sec btn-s">${UIF.ic('filtre', 18)}Filtres${nbFiltres ? ` · ${nbFiltres}` : ''}</summary>
      <div class="puces" role="group" aria-label="Filtres">${puce({ ouvert: p.ouvert ? '' : '1' }, 'Ouvert maintenant', !!p.ouvert)}${puce({ mode: p.mode === 'livraison' ? '' : 'livraison' }, 'Livraison', p.mode === 'livraison')}${puce({ mode: p.mode === 'emporter' ? '' : 'emporter' }, 'À emporter', p.mode === 'emporter')}
        ${p.commune ? puce({ commune: '' }, `${esc(p.commune)} ✕`, true) : ''}</div>
      ${com ? `<div class="puces puces-v" role="group" aria-label="Rayons">${RAYONS_FILTRE.map(([k, t]) => puce({ rayon: p.rayon === k ? '' : k }, `${esc(t)}`, p.rayon === k)).join('')}</div>`
        : `<div class="puces" role="group" aria-label="Cuisines">${cuisinesVisibles().filter(([k]) => !TYPES_BOUTIQUE.includes(k)).map(([k, [, t]]) => puce({ cuisine: p.cuisine === k ? '' : k }, esc(t), p.cuisine === k)).join('')}</div>`}</details>
    <div id="encore"></div><div id="favsM"></div><div id="vedette"></div>
    <div id="produits"></div>
    <h2 id="titreListe">${p.q ? `Résultats pour « ${esc(p.q)} »` : maison ? 'Cuisiniers près de vous' : com ? (marche === 'commerce' ? 'Commerces' : 'Supérettes et épiceries') : 'Restaurants'}</h2>
    <div id="liste" class="liste-restos" aria-busy="true">${'<span class="sq-carte" aria-hidden="true"><span class="sq-img"></span><span class="sq-l"></span><span class="sq-l c"></span></span>'.repeat(3)}</div>
    ${com ? `<p class="petit muted" style="margin-top:12px">Alcool : vente réservée aux 18 ans et plus, âge vérifié à la remise.</p>` : ''}
    ${rub !== 'restaurant' || p.q ? '' : '<section class="section vitrine" id="vitrineAcc" hidden></section><section class="section" id="platsAcc" hidden></section>'}${com && !p.q && !p.rayon ? '<section class="section" id="boutiqueAcc" hidden></section>' : ''}
    <section class="section"><a class="banniere-pro" href="${maison ? '#/pro/maison/nouveau' : com ? '#/pro/boutique/nouveau' : '#/pro/resto/nouveau'}"><span class="ico-l">${com ? ICO.commerce : ICO.manger}</span><span><b>${maison ? 'Vous cuisinez pour les autres ?' : com ? 'Vous avez un commerce ?' : 'Vous avez un restaurant ?'}</b>
      <small>Inscription gratuite : votre ${maison ? 'plat du jour' : com ? 'boutique' : 'carte'} en ligne, les commandes en direct, vos clients vous paient directement.</small></span>${ICO.droite}</a></section></div>`);
  const yRest = aRestaurer;   // retour en arrière : la position est reprise une fois la liste affichée (le squelette est plus court)
  $('#adrHaut').addEventListener('click', choisirTerritoire);
  if (marche !== 'commerce' && !veutRub) { [, v2] = await Promise.all([chargerRegistre(), food2Pret()]); if (!universOuvert('food')) return universFerme('food'); }
  if (marche !== 'commerce') {   // les trois parties : seulement celles que la base sait faire (« Plats maison » = food2.sql, « Courses » = boutique.sql)
    const dispo = RUBS.filter(([k]) => k === 'restaurant' || (k === 'maison' ? v2 : BOUTIQUES)); const el = $('#rubs');
    if (dispo.length > 1 && el) el.innerHTML = dispo.map(([k, t, ic]) => `<a href="${k === 'restaurant' ? '#/manger' : '#/manger?rub=' + k}" class="${k === rub ? 'on' : ''}" ${k === rub ? 'aria-current="page"' : ''}>${UIF.ic(ic, 26)}<span>${t}</span></a>`).join('');
    else if (el) el.remove();
    $('#rchForm')?.addEventListener('submit', e => { e.preventDefault(); const m = e.target.q.value.trim(); aller(`#/manger?rub=${rub}${m ? '&q=' + encodeURIComponent(m) : ''}`); });
  }
  let l = await pR;
  l = l.filter(x => rubDe(x) === rub);
  const infos = v2 ? await q(sb.rpc('food_accueil', { terr, rub })).then(r => Object.fromEntries(r.map(x => [x.restaurant_id, x])), () => ({})) : {};
  if (p.cuisine && !com) l = l.filter(x => x.cuisine === p.cuisine);
  if (['livraison', 'emporter'].includes(p.mode)) l = l.filter(x => x[p.mode] === true);
  if (p.commune) { const c = sansAccent(p.commune); l = l.filter(x => sansAccent(x.commune) === c || (x.communes_livrees || []).some(v => sansAccent(v) === c)); }
  if (p.rayon && com && l.length) {   // commerces qui ont au moins un article disponible dans ce rayon
    const ids = new Set((await q(sb.from('plats').select('restaurant_id').in('restaurant_id', l.map(x => x.id)).eq('categorie', p.rayon).eq('dispo', true).limit(500)).catch(() => [])).map(x => x.restaurant_id));
    l = l.filter(x => ids.has(x.id));
  }
  if (p.q && v2 && rub !== 'restaurant') afficherProduits(rub, terr, p.q);   // les produits ou plats qui correspondent, en plus des fiches
  if (p.q) {   // recherche dans le nom, la présentation, la ville… et les plats de la carte (sans tenir compte des accents)
    const m = sansAccent(p.q), motif = p.q.replace(/[%_,()*\\]/g, ' ').trim();
    const parPlat = new Set(motif ? (await q(sb.from('plats').select('restaurant_id').ilike('nom', `%${motif}%`).limit(300)).catch(() => [])).map(x => x.restaurant_id) : []);
    l = l.filter(x => parPlat.has(x.id) || sansAccent(x.nom + ' ' + x.description + ' ' + x.commune).includes(m));
  }
  if (p.ouvert) l = l.filter(x => etatOuverture(x).ouvert);
  l.sort((a, b) => etatOuverture(b).ouvert - etatOuverture(a).ouvert);
  const notes = Object.fromEntries((await pN).filter(x => l.some(y => y.id === x.restaurant_id)).map(x => [x.restaurant_id, x]));
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
  const ouv = l.filter(x => etatOuverture(x).ouvert), fer = l.filter(x => !etatOuverture(x).ouvert);
  // mise en avant : un vrai restaurant ouvert, avec sa photo (jamais une offre inventée)
  const vedette = rub === 'restaurant' && !p.q && !p.cuisine && !p.commune && (ouv.find(x => x.photo) || ouv[0]);
  if (vedette && $('#vedette')) {
    const k = UIF.cuisine(vedette.cuisine);
    $('#vedette').innerHTML = `<a class="banniere-v" href="#/resto/${vedette.id}"><span class="bv-img ph-w t-food" data-ic="${k}">${UIF.img(vedette.photo, k, 640, 360, true)}</span>
      <span class="bv-txt"><em>À la une</em><b>${esc(vedette.nom)}</b><small>${esc(CUISINES[vedette.cuisine]?.[1] || '')} · ${vedette.delai_min} min${vedette.livraison ? ` · livraison ${Number(vedette.frais_livraison) ? eur(vedette.frais_livraison) : 'offerte'}` : ' · à emporter'}</small></span></a>`;
  }
  const filtre = p.q || p.cuisine || p.mode || p.rayon || p.ouvert || p.commune;
  if (!p.q && ouv.length) $('#titreListe').textContent = maison ? 'Cuisiniers ouverts près de vous' : com && marche !== 'commerce' ? 'Supérettes ouvertes près de vous' : 'Ouverts près de vous';
  $('#liste').removeAttribute('aria-busy');
  $('#liste').className = l.length ? 'liste-restos' : '';
  $('#liste').innerHTML = l.length ? ouv.map((x, i) => carteResto(x, notes[x.id], i === 0 && !vedette, infos[x.id])).join('') + (fer.length && ouv.length ? '<h2 class="sep-l">Pas ouverts maintenant</h2>' : '') + fer.map((x, i) => carteResto(x, notes[x.id], !ouv.length && !vedette && i === 0, infos[x.id])).join('')
    : `<div class="vide-etat"><span class="ico">${com ? ICO.commerce : ICO.manger}</span><h3>${filtre ? `Aucun ${mot} pour ces filtres` : maison ? `Les premiers cuisiniers arrivent en ${esc(terr)}` : com ? `Pas encore de commerce en ${esc(terr)}` : `Les premiers restaurants arrivent en ${esc(terr)}`}</h3>
    <p class="muted">${filtre ? 'Essayez sans filtre, ou un autre mot.' : 'Nous vérifions chaque professionnel avant sa mise en ligne.'}</p>${filtre ? `<a class="btn btn-p" href="${marche === 'commerce' ? '#/commerce' : rub === 'restaurant' ? '#/manger' : '#/manger?rub=' + rub}">Tout afficher</a>` : `<a class="btn btn-p" href="${maison ? '#/pro/maison/nouveau' : '#/pros'}">${maison ? 'Proposer mes plats' : `Inscrire mon ${com ? 'commerce' : 'restaurant'}`}</a>`}</div>`;
  if (yRest) scrollTo(0, yRest);
  if (maison && !p.q && v2) afficherJours(terr).catch(() => {});
  if (marche !== 'commerce' && !(com && !p.q && !p.rayon)) afficherPanierFlottant();
  if (rub === 'restaurant' && !p.q) { Promise.allSettled([afficherVitrine(ouv), afficherPlatsAccueil(ouv)]).then(() => { if (yRest && scrollY < yRest - 5 && location.hash.startsWith('#/manger')) scrollTo(0, yRest); }); }   // retour en arrière : la page s'allonge quand la vitrine arrive   // plats des restaurants ouverts, en vitrine
  if (com && !p.q && !p.rayon) afficherBoutiqueAccueil(terr).catch(() => {});   // la boutique ouverte la plus proche, en vitrine
  afficherEnCours('commandes').catch(() => {});
};
APP.pages.manger = () => {   // anciennes adresses « #/manger?vue=commerces… » : la rubrique Commerce, sans étape dans l'historique
  const p = param(); if (p.vue !== 'commerces') return pageMarche('food');
  const u = new URLSearchParams(Object.entries(p).filter(([k, v]) => v && k !== 'vue')); rediriger('#/commerce' + (u.toString() ? '?' + u : ''));
};
APP.pages.commerce = () => pageMarche('commerce');
// heure écrite à la française : « 22 h », « 11 h 30 », « minuit »
const hFr = t => t === '24:00' || t === '00:00' ? 'minuit' : t.replace(/^0?(\d{1,2}):(\d{2})$/, (_, h, m) => `${h} h${m === '00' ? '' : ' ' + m}`);
// carte d'un restaurant ou d'un commerce dans une liste (maquette 23/11) : photo 16:9 avec le badge « délai · frais » dessus, nom et note, puis « Ouvert · cuisine · ville »
const etatTexte = (x, e = etatOuverture(x)) => e.ouvert ? `Ouvert${e.texte ? ' · ' + e.texte : ''}` : e.auto && e.texte ? `${e.texte[0].toUpperCase() + e.texte.slice(1)} · précommande possible` : 'Fermé pour le moment';
const badgeLivraison = x => `${x.delai_min} min · ${x.livraison ? (Number(x.frais_livraison) ? eur(x.frais_livraison) : 'Livraison offerte') : 'À emporter'}`;
const carteResto = (x, n, prio, info) => { const e = etatOuverture(x), bq = estBoutique(x), k = bq ? 'sac' : UIF.cuisine(x.cuisine); return `<a class="carte-resto" href="#/resto/${x.id}"><span class="cr-img ph-w ${bq ? 't-com' : 't-food'}" data-ic="${k}">${UIF.img(x.photo, k, 640, 360, prio)}<span class="cr-badge">${esc(badgeLivraison(x))}</span></span>
  <span class="cr-corps"><span class="cr-l1"><b>${esc(x.nom)}</b>${n ? `<span class="cr-note">★ ${String(n.moyenne).replace('.', ',')} <span>(${n.nombre})</span></span>` : Date.now() - new Date(x.created_at) < 30 * 864e5 ? '<span class="etiquette">Nouveau</span>' : ''}</span>
    <span class="cr-l2"><span class="cr-etat ${e.ouvert ? 'ok' : e.auto && e.texte ? 'att' : 'gris'}">${esc(etatTexte(x, e))}</span><span class="cr-infos"> · ${esc(CUISINES[x.cuisine]?.[1] || '')} · ${esc(x.commune)}</span></span>
    ${estMaison(x) ? `<span class="cr-l3">${x.cuisinier ? 'Cuisiné par ' + esc(x.cuisinier) : 'Fait maison'}${info?.plat_du_jour ? ' · Plat du jour : ' + esc(info.plat_du_jour) : ''}</span>` : info?.a_partir_de ? `<span class="cr-l3">À partir de ${eur(info.a_partir_de)}${info.nb_plats ? ' · ' + info.nb_plats + (rubDe(x) === 'courses' ? ' produit' : ' plat') + (info.nb_plats > 1 ? 's' : '') : ''}</span>` : ''}</span></a>`; };

// ---------------------------------------------------------------- restaurant : carte et panier
APP.pages.resto = async id => {
  attente(); await chargerRegistre();
  const r = await memo('resto:' + id, () => q(sb.from('restaurants').select('*').eq('id', id).maybeSingle()), 20000);
  if (!r) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h1>Restaurant introuvable</h1><a href="#/manger">Tous les restaurants</a></div>');
  const [tous, n] = await memo('resto-carte:' + id, () => Promise.all([q(sb.from('plats').select('*').eq('restaurant_id', id).order('ordre').order('created_at')), q(sb.from('notes_resto').select('*').eq('restaurant_id', id))]), 20000);
  const plats = sansLicence(r) ? tous.filter(p => !p.majeur) : tous;   // sans licence déclarée, l'alcool n'est pas en vente (la base le refuse aussi)
  const bq = estBoutique(r), CATS = bq ? CATS_BOUTIQUE : CATS_PLAT;
  const platDe = k => plats.find(p => p.id === k), aOptions = p => p.options?.length > 0;
  let cart = lirePanier(id);
  Object.keys(cart).forEach(k => { const p = platDe(cart[k].p); if (!p || finArticle(p) || !(cart[k].n > 0) || cart[k].o.some(([g, c]) => !p.options?.[g]?.choix?.[c])) delete cart[k]; else cart[k].n = Math.min(cart[k].n, maxArticle(p)); });
  let mode = r.livraison ? 'livraison' : 'emporter', tip = 0;
  // fermé à cette heure mais interrupteur allumé et horaires remplis : on peut programmer pour ses heures d'ouverture
  const etat = etatOuverture(r), programmable = !etat.ouvert && etat.auto, commandable = etat.ouvert || programmable;
  const nbPlat = k => Object.values(cart).filter(x => x.p === k).reduce((t, x) => t + x.n, 0);
  const jour = bq ? [] : plats.filter(p => p.plat_du_jour && !finArticle(p));   // « plat du jour » d'un cuisinier : en tête de la carte, une seule fois
  const parCat0 = [...Object.keys(CATS), ...Object.keys(LIB_CAT).filter(k => !CATS[k])].map(c => [c, plats.filter(p => p.categorie === c && !jour.includes(p))]).filter(([, l]) => l.length);
  const parCat = jour.length ? [['jour', jour], ...parCat0] : parCat0;
  const horairesSem = r.horaires_sem && Object.keys(r.horaires_sem).length;
  document.title = `${r.nom} — Woulib`;
  const nomCat = c => c === 'jour' ? 'Plat du jour' : (CATS[c] || LIB_CAT[c] || '').replace(/^\S+\s/, '');   // l'emoji du rayon reste dans l'administration
  const note = n[0];
  const icR = bq ? 'sac' : UIF.cuisine(r.cuisine);
  // « ★ note · délai · frais · Ouvert » (maquette 23/11), puis le minimum et le retrait
  const infos = [note && ['', `★ ${String(note.moyenne).replace('.', ',')} · ${note.nombre} avis vérifié${note.nombre > 1 ? 's' : ''}`], ['', `${r.delai_min} min`],
    r.livraison && ['', `Livraison ${Number(r.frais_livraison) ? eur(r.frais_livraison) : 'offerte'}`],
    etat.ouvert ? ['ok', `Ouvert${etat.ferme ? ' jusqu’à ' + hFr(etat.ferme) : ''}`] : ['gris', programmable && etat.texte ? `Fermé · ${etat.texte}` : 'Fermé pour le moment'],
    r.retrait_info && ['', r.retrait_info], Number(r.minimum) > 0 && ['', `Minimum ${eur(r.minimum)}`], r.emporter && ['', r.livraison ? 'Retrait possible' : 'À emporter seulement']].filter(Boolean);
  const iEtat = infos.findIndex(x => x[0] === 'ok' || /^Fermé/.test(x[1]));   // première rangée : jusqu'à l'état d'ouverture ; seconde : minimum et retrait
  // un plat : nom, description, allergènes, prix, stock ; la photo à droite avec le bouton +, le compteur apparaît ensuite
  const ligneP = p => { const nb = nbPlat(p.id), al = texteAllergenes(p).replace(/^⚠️ /, ''), kp = UIF.rayon(p.categorie); return `<div class="plat-l ${p.dispo ? '' : 'fini'}" id="p-${p.id}">
    <div class="pl-t"><b>${esc(p.nom)}</b>${p.description ? `<span class="pl-d">${esc(p.description)}</span>` : ''}${al ? `<span class="pl-a">${al.startsWith('Allergènes') ? `<b>Allergènes :</b>${esc(al.slice(12))}` : esc(al)}</span>` : ''}
      <span class="pl-p"><b>${eur(p.prix)}</b>${aOptions(p) ? '<span class="muted petit">au choix</span>' : ''}${!p.dispo ? '<span class="tag gris">Épuisé</span>' : p.stock != null && p.stock > 0 && p.stock <= 5 ? `<span class="tag att">Plus que ${p.stock}</span>` : ''}</span>
      <small class="art-err" id="e-${p.id}" role="alert" hidden></small></div>
    <div class="pl-img ${p.photo ? '' : 'sans'}" data-ic="${kp}">${UIF.img(p.photo, kp, 152, 152)}
      ${!p.dispo || !commandable ? '' : aOptions(p) ? `<div class="qte ${nb ? '' : 'zero'}" data-opt="${p.id}"><output>${nb || ''}</output><button type="button" data-choisir="${p.id}" aria-label="Choisir ${esc(p.nom)}">+</button></div>`
        : `<div class="qte ${nb ? '' : 'zero'}" data-plat="${p.id}"><button type="button" data-d="-1" aria-label="Retirer un ${esc(p.nom)}">−</button><output>${nb}</output><button type="button" data-d="1" aria-label="Ajouter ${esc(p.nom)}">+</button></div>`}</div></div>`; };
  vue(`<div class="wrap page-resto"><div class="fiche fiche-d">
    <div class="resto-c"><div class="resto-hero ph-w ${bq ? 't-com' : 't-food'}" data-ic="${icR}">${UIF.img(r.photo, icR, 800, 450, true)}
        <button type="button" class="rond retour-flottant" id="retourResto" aria-label="Retour">${ICO.retour}</button>
        <button type="button" class="rond" id="fav" aria-pressed="false" aria-label="Ajouter aux favoris">${ICO.coeur}</button></div>
      <div class="resto-tete"><h1>${esc(r.nom)}</h1><p class="muted">${estMaison(r) ? `Cuisiné par <b>${esc(r.cuisinier || r.nom)}</b> · ` : ''}${esc(CUISINES[r.cuisine]?.[1] || '')} · ${esc(r.commune)}${r.adresse ? ', ' + esc(r.adresse) : ''}</p></div>
      <div class="puces-info">${infos.slice(0, iEtat + 1).map(([c, t]) => `<span class="pi ${c}">${c === 'ok' ? ICO.coche : ''}${esc(t)}</span>`).join('')}</div>${infos.length > iEtat + 1 ? `<div class="puces-info pi-2">${infos.slice(iEtat + 1).map(([c, t]) => `<span class="pi ${c}">${esc(t)}</span>`).join('')}</div>` : ''}
      ${!horairesSem && r.horaires ? `<p class="muted petit">Horaires : ${esc(r.horaires)}</p>` : ''}
      ${r.description ? `<p class="resto-desc">${esc(r.description)}</p>` : ''}
      ${horairesSem ? `<details class="horaires-d"><summary>Horaires de la semaine</summary><div>${SEMAINE.map(j => `<span>${JOURS[j]}</span><b>${r.horaires_sem[j]?.length ? esc(r.horaires_sem[j].map(([a, b]) => `${hFr(a)} – ${hFr(b)}`).join(', ')) : 'Fermé'}</b>`).join('')}</div></details>` : ''}
      ${parCat.length > 1 ? `<nav class="onglets-cat onglets-s" aria-label="${bq ? 'Rayons' : 'Catégories de la carte'}">${parCat.map(([c], i) => `<button type="button" data-saut="${c}" class="${i ? '' : 'on'}">${esc(nomCat(c))}</button>`).join('')}</nav>` : ''}
      ${parCat.length ? parCat.map(([c, l]) => `<h2 class="cat-t" id="cat-${c}">${esc(nomCat(c))}</h2>${bq ? `<div class="rayon">${l.map(p => carteArticle(p, nbPlat(p.id), commandable)).join('')}</div>` : `<div class="plats-l">${l.map(ligneP).join('')}</div>`}`).join('')
        : `<div class="vide-etat"><p>${bq ? 'Les articles arrivent bientôt.' : 'La carte arrive bientôt.'}</p></div>`}
      ${bq && plats.some(p => p.majeur) ? `<p class="petit muted">${MODERATION}${alcoolV2() ? (r.permis_nuit ? ' Permis de vente de nuit déclaré : alcool vendu pendant les heures d’ouverture.' : ` Alcool vendu ${textePlage(r.territoire)}.`)
        + (r.licence_alcool ? ` Licence n° ${esc(r.licence_alcool)}, déclarée par le vendeur.` : '') : ''}</p>` : ''}
      <p class="petit" style="margin-top:22px"><button type="button" class="lien" data-signaler="restaurant" data-id="${r.id}" data-univers="food" data-nom="${bq ? 'ce commerce' : 'ce restaurant'}">Signaler ${bq ? 'ce commerce' : 'ce restaurant'}</button></p>
    </div>
    <aside id="panneauCmd" aria-label="Mon panier"><div class="panier colle" id="panier"><div class="panier-t"><h2>Mon panier</h2>
      <button type="button" class="btn btn-s fermer-panier" data-fermer-panier>Retour à la carte</button></div><div id="lignes"></div>
      ${r.livraison && r.emporter ? `<div class="seg" role="group" aria-label="Livraison ou retrait"><button type="button" data-mode="livraison">Livraison</button><button type="button" data-mode="emporter">À emporter</button></div>` : `<p class="petit muted">${r.livraison ? 'Livraison uniquement' : 'À emporter uniquement'}</p>`}
      <form class="f" id="fCmd"><div id="adresse" class="carte-adr"></div>
        <label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
        ${programmable ? `<p class="petit" style="margin:0"><b>⏰ Fermé en ce moment${etat.texte ? ' (' + esc(etat.texte) + ')' : ''}</b> : programmez votre commande.</p>` : ''}
        <details class="plus-options ligne-depl" ${programmable ? 'open' : ''}><summary>Pourboire, code promo, message, programmer</summary><div id="pourboire"></div>
          <label>Quand ?<select name="quand">${programmable ? '' : '<option value="">Dès que possible</option>'}<option value="plus">Programmer pour plus tard</option></select></label><div id="heureCmd"></div>
          <div style="display:flex;gap:6px;align-items:flex-end"><label style="flex:1">Code promo<input name="code" maxlength="20" autocomplete="off" style="text-transform:uppercase"></label><button type="button" class="btn btn-s" id="appliquer">Appliquer</button></div>
          <label>Un mot pour le restaurant<input name="note" maxlength="500" placeholder="Sans piment, code du portail…"></label></details>
        <div id="alcoolHeure" role="status"></div><div id="totaux"></div>
        <p class="muted petit" style="margin:0">Allergènes : voir chaque ${bq ? 'article' : 'plat'} ; une question ? Contactez ${bq ? 'la boutique' : 'le restaurant'} avant de commander.</p><p class="muted petit" style="margin:0">${bq ? 'Paiement à la livraison ou au retrait (espèces ou carte, selon la boutique).' : 'Paiement au restaurant ou au livreur (espèces ou carte, selon le restaurant).'}</p>
        <p class="muted petit" style="margin:0">${bq ? 'Repas, glaces, produits frais et autres denrées périssables : pas de droit de rétractation (art. L221-28 du Code de la consommation). Autres articles : 14 jours, auprès de la boutique.' : 'Repas : pas de droit de rétractation (art. L221-28 du Code de la consommation).'} <a href="cgu.html" target="_blank" rel="noopener">Conditions</a></p>
        <div class="pied-cmd"><p class="recap" id="recap"></p><p class="art-err" id="erreurCmd" role="alert" hidden></p><button class="btn btn-p" id="commander" ${commandable ? '' : 'disabled'}>${commandable ? (programmable ? 'Programmer ma commande' : 'Commander') : 'Restaurant fermé'}</button></div></form></div></aside></div>
    <button type="button" class="barre-panier" id="barrePanier" hidden></button><div class="voile-panier" id="voilePanier"></div></div>`);
  const majAdresse = () => {
    $('#adresse').innerHTML = mode === 'livraison' ? `<span class="carte-adr-t">${ICO.pin}<b>Livraison à</b></span><label>Adresse de livraison<input name="adresse" required maxlength="300" autocomplete="street-address"></label>
      <label>Ville<input name="commune" required maxlength="60" list="villesK" value="${esc(r.communes_livrees.length === 1 ? r.communes_livrees[0] : r.commune)}"></label>
      <datalist id="villesK">${(r.communes_livrees.length ? r.communes_livrees : TERRITOIRES[r.territoire]?.villes || []).map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      ${r.communes_livrees.length ? `<p class="petit muted" style="margin:0">Livre à : ${esc(r.communes_livrees.join(', '))}</p>` : ''}` : `<span class="carte-adr-t">${ICO.pin}<b>À récupérer</b></span><p class="petit" style="margin:0"><b>${esc(r.adresse || r.commune)}</b></p>`;
    document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === mode));
  };
  let remise = 0, codeOk = null;
  const lignesPanier = () => Object.entries(cart).map(([k, v]) => { const p = platDe(v.p); return p && v.n > 0 ? { k, p, n: v.n, pu: Number(p.prix) + supplement(p, v.o), lib: libelleOptions(p, v.o) } : null; }).filter(Boolean);
  const sousTotal = () => lignesPanier().reduce((t, x) => t + x.pu * x.n, 0);
  // message d'erreur sous l'article concerné (et non en pilule en haut de l'écran)
  const erreurSous = (idEl, msg) => { const e = document.getElementById(idEl) || $('#erreurCmd'); if (!e) return toast(msg, true); e.textContent = msg; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => { e.hidden = true; }, 6000); e.scrollIntoView({ block: 'nearest' }); };
  const majCompteurs = () => document.querySelectorAll('.qte[data-plat],.qte[data-opt]').forEach(qt => { const k = qt.dataset.plat || qt.dataset.opt; qt.querySelector('output').textContent = nbPlat(k) || (qt.dataset.plat ? 0 : ''); qt.classList.toggle('zero', !nbPlat(k)); });
  const majPanier = () => {
    const l = lignesPanier(), st = sousTotal(), frais = mode === 'livraison' ? Number(r.frais_livraison) : 0, pb = mode === 'livraison' ? tip : 0;
    if (codeOk && remise > st) remise = st;
    // alcool dans le panier : le client confirme sa majorité (case sur la ligne du premier article 18+, gardée cochée d'un rafraîchissement à l'autre) ; le vendeur contrôle une pièce d'identité à la remise
    const coche = !!$('#majeur input')?.checked, premier18 = l.findIndex(x => x.p.majeur), majeur = premier18 >= 0;
    $('#lignes').innerHTML = l.length ? l.map((x, i) => `<div class="ligne-panier"><span class="lp-t"><b>${esc(x.p.nom)}</b>${x.lib ? `<small>${esc(x.lib)}</small>` : ''}<span class="lp-p">${eur(x.pu * x.n)}</span></span>
      <span class="ln-d"><button type="button" data-l="${esc(x.k)}" data-d="-1" aria-label="Retirer un ${esc(x.p.nom)}">−</button><output>${x.n}</output><button type="button" data-l="${esc(x.k)}" data-d="1" aria-label="Ajouter un ${esc(x.p.nom)}">+</button></span>
      <small class="art-err" id="el-${esc(x.k)}" role="alert" hidden></small>${i === premier18 ? `<span id="majeur" class="majeur-l"><label class="majeur-ok"><input type="checkbox" name="majeur" form="fCmd" required ${coche ? 'checked' : ''}> <span><b>J’ai 18 ans ou plus</b><small>Une pièce d’identité vous sera demandée à la remise.</small></span></label></span>` : ''}</div>`).join('') : `<p class="muted">Ajoutez des ${bq ? 'articles' : 'plats'} avec le bouton +.</p>`;
    // alcool hors de la plage horaire du territoire, sans permis de vente de nuit : la base refusera la commande, on le dit avant
    const hCmd = $('#fCmd')?.heure?.value || '', maintenantOk = alcoolPermisA(r.territoire);
    const horsPlage = majeur && alcoolV2() && !r.permis_nuit && (!maintenantOk || (hCmd && !alcoolPermisA(r.territoire, hCmd.split('T')[1])));
    $('#alcoolHeure').innerHTML = horsPlage ? `<div class="bandeau att"><span aria-hidden="true">🌙</span><span><b>Alcool vendu ${textePlage(r.territoire)} seulement ici</b> (pas de permis de vente de nuit).
      ${maintenantOk ? 'Choisissez une heure de remise dans cette plage, ou retirez les articles 18+.' : 'Retirez les articles 18+ pour commander maintenant.'}</span></div>` : '';
    $('#pourboire').innerHTML = BASE_V2 && l.length && mode === 'livraison' ? `<div class="pourboire"><span class="petit"><b>Pourboire pour le livreur</b> <span class="aide">(facultatif, 100 % pour lui)</span></span>
      <div class="actions">${[0, 1, 2, 3, 5].map(v => `<button type="button" class="btn btn-s ${tip === v ? 'btn-p' : ''}" data-tip="${v}">${v ? eur(v) : 'Non merci'}</button>`).join('')}</div></div>` : '';
    $('#totaux').innerHTML = l.length ? `<div class="muted petit">Sous-total ${eur(st)}${remise ? ` · code ${esc(codeOk)} −${eur(remise)}` : ''}${mode === 'livraison' ? ` · livraison ${frais ? eur(frais) : 'offerte'}` : ''}${pb ? ` · pourboire ${eur(pb)}` : ''}</div><div class="total-p">Total ${eur(st - remise + frais + pb)}</div>
      ${st < r.minimum ? `<p class="petit" style="color:var(--rouge);margin:0">Minimum de commande : ${eur(r.minimum)}</p>` : ''}` : '';
    panier.ecrire(id, cart);
    const nb = l.reduce((t, x) => t + x.n, 0);   // barre du bas (téléphone) : le panier en un coup d'œil
    $('#barrePanier').hidden = !nb || $('#panneauCmd').classList.contains('ouvert');
    $('#barrePanier').innerHTML = `<span>Voir le panier · ${nb} article${nb > 1 ? 's' : ''}</span><b>${eur(st - remise + frais + pb)}</b>`;
    // pied fixe de la feuille : le récapitulatif, puis « Commander · total » (même calcul que la ligne ci-dessus ; la base recalcule tout à l'envoi)
    $('#recap').textContent = l.length ? `${nb} article${nb > 1 ? 's' : ''} · ${mode === 'livraison' ? `livraison ${frais ? eur(frais) : 'offerte'}` : 'à emporter'}` : '';
    if (commandable) $('#commander').textContent = `${programmable ? 'Programmer ma commande' : 'Commander'}${l.length ? ' · ' + eur(st - remise + frais + pb) : ''}`;
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
  // la rubrique éclairée dans la barre collée suit le défilement (l'écouteur se retire quand on quitte la fiche)
  if (parCat.length > 1) {
    const suit = () => {
      const hs = parCat.map(([c]) => $('#cat-' + c)); if (!hs[0]) return removeEventListener('scroll', suit);
      let i = 0; hs.forEach((h, k) => { if (h.getBoundingClientRect().top <= 140) i = k; });
      const bs = [...document.querySelectorAll('[data-saut]')];
      if (!bs[i].classList.contains('on')) { bs.forEach((x, k) => x.classList.toggle('on', k === i)); bs[i].scrollIntoView({ block: 'nearest', inline: 'center' }); }
    };
    addEventListener('scroll', suit, { passive: true });
  }
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
    if (c.n + Number(b.dataset.d) > maxArticle(p)) return erreurSous('e-' + k, p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum');
    c.n = Math.max(0, c.n + Number(b.dataset.d));
    if (c.n) cart[k] = c; else delete cart[k];
    majCompteurs(); majPanier();
  }));
  document.querySelectorAll('[data-choisir]').forEach(b => b.addEventListener('click', () => choisir(platDe(b.dataset.choisir))));
  $('#panier').addEventListener('click', ev => {
    const l = ev.target.closest('[data-l]'), t = ev.target.closest('[data-tip]');
    if (l && cart[l.dataset.l]) { const c = cart[l.dataset.l], p = platDe(c.p); if (c.n + Number(l.dataset.d) > maxArticle(p)) return erreurSous('el-' + l.dataset.l, p.stock != null ? `Plus que ${p.stock} en stock` : '20 au maximum'); c.n = Math.max(0, c.n + Number(l.dataset.d)); if (!c.n) delete cart[l.dataset.l]; majCompteurs(); majPanier(); }
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
  $('#fCmd').addEventListener('change', e => { if (['heure', 'quand'].includes(e.target.name)) majPanier(); });   // heure de remise et plage de vente de l'alcool
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
        lat_cmd: pos?.lat ?? null, lng_cmd: pos?.lng ?? null, heure_cmd: d.heure ? localVersUTC(d.heure, fuseauR) : null, code_cmd: codeOk, ...(BASE_V2 ? { pourboire_cmd: mode === 'livraison' && tip ? tip : null } : {}), ...(alcoolV2() ? { majeur_cmd: !!d.majeur } : {}) }));
      cart = {}; panier.ecrire(id, cart); oublier('resto'); oublier('acc-'); toast(`Commande envoyée à ${r.nom}. ${bq ? 'La boutique' : 'Le restaurant'} doit l’accepter : vous serez prévenu ici.`); aller('#/suivi/' + c.id);
    } catch (err) {
      const msg = erreur(err).replace(/^[A-Z_]{4,}\s+/, ''), x = lignesPanier().find(y => msg.includes(y.p.nom));   // l'erreur va sous l'article cité, sinon juste au-dessus du bouton
      erreurSous(x ? 'el-' + x.k : 'erreurCmd', msg); b.disabled = false; if (/stock|épuisé|PAUSE/i.test(err.message || '')) oublier('resto'); }
  });
};

// ---------------------------------------------------------------- suivi et historique (client)
APP.pages.suivi = async id => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  let L = null;
  const dessiner = async () => {
    const c = await q(sb.from('commandes').select('*, restaurants(*), commande_lignes(*)').eq('id', id).maybeSingle());
    if (!c) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h1>Commande introuvable</h1></div>');
    const lv = c.mode === 'livraison' ? await q(sb.rpc('suivi_livraison', { cmd: id })).catch(() => null) : null;
    const lvActive = lv && ['acceptee', 'au_restaurant', 'recuperee'].includes(lv.statut);
    const etapes = ETAPES.filter(e => c.mode === 'livraison' || !['en_livraison'].includes(e[0])).map(e => e[0] === 'livree' && c.mode === 'emporter' ? ['retiree', '🎉', 'Retirée'] : e[0] === 'en_preparation' && estBoutique(c.restaurants) ? ['en_preparation', '📦', 'Préparation'] : e);
    const pos = etapes.findIndex(e => e[0] === c.statut), fini = ['refusee', 'annulee'].includes(c.statut);
    const avis = ['livree', 'retiree'].includes(c.statut) ? await q(sb.from('avis_resto').select('id').eq('commande_id', id)) : [];
    // maquette 23/11 : carte en haut pleine largeur, l'information principale en grand (arrivée si la base la donne, sinon l'étape en cours), frise de 4 étapes, livreur, code
    const liv = c.mode === 'livraison', prete = ['prete', 'en_livraison'].includes(c.statut);
    const FRISE = [['envoyee', 'Envoyée'], ['en_cuisine', 'En cuisine'], [liv ? 'en_route' : 'prete', liv ? 'En route' : 'Prête'], ['fin', liv ? 'Livrée' : 'Retirée']];
    const iF = { envoyee: 0, acceptee: 1, en_preparation: 1, prete: 2, en_livraison: 2, livree: 3, retiree: 3 }[c.statut] ?? 0;
    const GRAND = { envoyee: 'Commande envoyée', acceptee: 'Commande acceptée', en_preparation: 'En cuisine', prete: liv ? 'Prête, un livreur arrive' : 'Prête à retirer', en_livraison: 'En route vers vous', livree: 'Livrée', retiree: 'Retirée' };
    // « Arrive dans N min » seulement si une heure existe : heure programmée, ou délai annoncé par le restaurant moins le temps écoulé (rien d'inventé, sinon l'étape)
    const minPrevues = c.pour_heure ? null : ['acceptee', 'en_preparation', 'prete', 'en_livraison'].includes(c.statut) && c.restaurants?.delai_min ? Math.ceil(Number(c.restaurants.delai_min) - (Date.now() - new Date(c.created_at)) / 6e4) : null;
    const grand = fini ? '' : c.pour_heure && !['livree', 'retiree'].includes(c.statut) ? `Prévue ${esc(jourHeure(c.pour_heure))}` : minPrevues > 0 ? `${liv ? 'Arrive' : 'Prête'} dans ${minPrevues} min` : GRAND[c.statut] || '';
    const tel = lv?.livreur?.telephone;
    vue(`<div class="suivi-p">
      ${lv && !fini && lv.statut !== 'livree' ? '<div id="carteLv" class="suivi-carte" role="img" aria-label="Carte de la livraison"></div>' : ''}
      <div class="wrap suivi-corps"><a href="#/activite?f=repas" class="petit">← Mon activité</a>
        <span class="px">Commande ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(jourHeure(c.created_at))}</span><h1>${esc(c.restaurants?.nom || '')}</h1>
        ${fini ? `<div class="verdict ko"><big>${c.statut === 'refusee' ? '😕' : '❌'}</big>Commande ${c.statut === 'refusee' ? 'refusée par le restaurant' : 'annulée'}</div>`
          : `<p class="suivi-grand" aria-live="polite">${grand}</p>${minPrevues > 0 ? `<p class="muted petit" style="margin:-6px 0 10px">Délai annoncé par ${esc(c.restaurants?.nom || 'le restaurant')} : ${c.restaurants.delai_min} min.</p>` : ''}
            <ol class="frise" aria-label="Étapes de la commande">${FRISE.map(([, t], i) => `<li class="${i < iF || (i === iF && iF === 3) ? 'faite' : i === iF ? 'actuelle' : ''}" ${i === iF ? 'aria-current="step"' : ''}><span class="f-pt">${i < iF || (i === iF && iF === 3) ? '✓' : ''}</span><span class="f-t">${t}</span></li>`).join('')}</ol>`}
        ${lv && !fini && lv.statut !== 'livree' ? `<div class="livreur-c">
          ${lv.livreur ? `<span class="liv-av" aria-hidden="true">${esc((lv.livreur.prenom || 'L')[0].toUpperCase())}</span><div class="liv-t"><b>${esc(lv.livreur.prenom || 'Votre livreur')}</b><small>${esc(lv.livreur.vehicule)}${lv.livreur.couleur ? ' ' + esc(lv.livreur.couleur) : ''} · ${{ acceptee: 'part chercher votre commande', au_restaurant: 'est au restaurant', recuperee: 'est en route vers vous' }[lv.statut] || ''}${lvActive && lv.livreur.lat == null ? ' · position pas encore partagée' : ''}</small></div>
            ${tel ? `<div class="liv-b"><a class="btn btn-sec btn-s" href="tel:${esc(tel)}">Appeler</a><a class="btn btn-sec btn-s" href="${wa(tel, 'Bonjour, je suis le client de la commande ' + c.id.slice(0, 6).toUpperCase() + ' sur Woulib.')}" target="_blank" rel="noopener">Message</a></div>` : ''}`
            : '<div class="liv-t"><b>Nous cherchons un livreur près du restaurant…</b></div>'}</div>
          ${lv.code ? `<div class="code-c"><span>Code à donner au livreur à la remise</span><b class="code-remise">${esc(lv.code)}</b></div>` : ''}` : ''}
        <div class="panneau suivi-recap"><h2 class="px" style="margin:0 0 4px">Votre commande</h2>${c.commande_lignes.map(l => `<div class="ligne-panier"><span class="lp-t"><b>${l.quantite} × ${esc(l.nom)}</b>${l.options ? `<small>${esc(l.options)}</small>` : ''}<span class="lp-p">${eur(l.prix * l.quantite)}</span></span></div>`).join('')}
          ${Number(c.remise) ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Code ${esc(c.code_promo)}</span><span>−${eur(c.remise)}</span></div>` : ''}
          ${c.frais > 0 ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Livraison</span><span>${eur(c.frais)}</span></div>` : ''}
          ${Number(c.pourboire) ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Pourboire du livreur</span><span>${eur(c.pourboire)}</span></div>` : ''}
          ${c.pour_heure ? `<p class="petit"><b>Programmée pour ${esc(jourHeure(c.pour_heure))}</b></p>` : ''}${c.majeur ? '<p class="petit"><b>Pièce d’identité demandée à la remise.</b></p>' : ''}<div class="total-p">Total ${eur(c.total)}</div>
          <p class="muted petit">${liv ? `Livraison : ${esc(c.adresse)}, ${esc(c.commune)}` : `À retirer : ${esc(c.restaurants?.adresse || c.restaurants?.commune || '')}`} · ${lv ? `paiement au livreur à la livraison (${eur(c.total)})` : 'paiement sur place'}</p></div>
        <div class="actions">${c.restaurants?.telephone ? `<a class="btn btn-sec btn-wa" href="${wa(c.restaurants.telephone, 'Bonjour, à propos de ma commande ' + c.id.slice(0, 6).toUpperCase() + ' sur Woulib.')}" target="_blank" rel="noopener">WhatsApp au restaurant</a>` : ''}
          ${c.statut === 'envoyee' ? '<button class="btn btn-s btn-ko" id="annuler">Annuler</button>' : ''}
          <a class="btn btn-s" href="#/assistance?sujet=commande&id=${c.id}">Un problème ?</a><button type="button" class="btn btn-s" data-signaler="commande" data-id="${c.id}" data-univers="food" data-nom="cette commande">Signaler</button></div>
      ${['livree', 'retiree'].includes(c.statut) && !avis.length ? `<form class="f panneau" id="fAvis" style="margin-top:18px"><h2 style="margin:0">C’était bon ?</h2><label>Note<select name="note">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</option>`).join('')}</select></label>
        <label>Votre avis<textarea name="texte" maxlength="1000" style="min-height:80px"></textarea></label><button class="btn btn-p">Publier mon avis</button></form>` : ''}</div></div>`);
    $('#annuler')?.addEventListener('click', async () => { if (!confirm('Annuler la commande ?')) return; try { await q(sb.rpc('changer_commande', { cmd: id, nouveau: 'annulee' })); dessiner(); } catch (err) { toast(erreur(err), true); } });
    $('#fAvis')?.addEventListener('submit', async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), bA = e.target.querySelector('button'); if (bA?.disabled) return; if (bA) bA.disabled = true; try { await q(sb.from('avis_resto').insert({ commande_id: id, note: +d.note, texte: d.texte.trim() })); toast('Merci pour votre avis !'); dessiner(); } catch (err) { if (bA) bA.disabled = false; toast(erreur(err), true); } });
    if ($('#carteLv')) {   // carte : restaurant, domicile, livreur
      try {
        L = L || await chargerCarte();
        const pts = [[lv.retrait, 'bol', 'Restaurant'], [lv.depot, 'pin', 'Chez vous'], [lvActive && lv.livreur?.lat != null ? [lv.livreur.lat, lv.livreur.lng] : null, 'moto', 'Livreur']]
          .filter(([p]) => p && p[0] != null).map(([p, e, t]) => L.marker(p, { icon: L.divIcon({ html: `<span class="mk-s">${UIF.ic(e, 20)}</span>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] }) }).bindTooltip(t));
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
