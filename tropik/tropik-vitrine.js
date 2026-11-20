/* Tropik v2 : la vitrine (accueil à héros, rayons, recherche à facettes, fiche produit en vente, location, enchère, 360°, personnalisation, boutique, collection).
   Tout ce qui compte (prix, offres, disponibilités, remises) vient de la base (tropik.sql, tropik2.sql) ; ce fichier affiche. Aucun nom global en plus de APP.tk. */
'use strict';
(() => {
  const TK = APP.tk, { rpc, q, IC, rayons, familles, nomRayon, ouverte, prixHtml, etoiles, tagVendeur, pluriel, fond, occupe, jourLong, PUBLICS, COULEURS, TRIS, guideTailles, stockTexte, lirePanier, ecrirePanier, hashDe } = TK;
  const MODES = { vente: 'Vente', location: 'Location', enchere: 'Enchère' };
  const COUL_HEX = { Noir: '#16161F', Blanc: '#FFFFFF', Gris: '#9CA3AF', Beige: '#D8C3A5', Marron: '#7B4B2A', Rouge: '#DC2626', Rose: '#F472B6', Orange: '#F97316', Jaune: '#FACC15', Vert: '#16A34A', Bleu: '#2563EB', Violet: '#7C3AED', Multicolore: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' };
  const pastille = c => `<span class="pt" style="background:${COUL_HEX[c] || '#999'}"></span>`;
  const dec = n => String(n).replace('.', ',');
  const eurj = n => eur(n) + ' / jour';
  const enc = (a, k) => a[k] == null ? '' : a[k];

  // ---------------------------------------------------------------- cartes
  const prixCarte = p => {
    if (p.mode === 'location') return `<span class="px"><b>${eur(p.prix_jour || p.prix)}</b> <small>/ jour</small></span>${p.caution ? `<span class="petit muted">Caution ${eur(p.caution)}</span>` : ''}`;
    if (p.mode === 'enchere' && p.enchere) return `<span class="px"><b>${eur(p.enchere.courant)}</b> <small>${p.enchere.nb ? pluriel(p.enchere.nb, 'offre', 'offres') : 'mise à prix'}</small></span>`;
    return prixHtml(p);
  };
  const badges = p => {
    const b = [];
    if (p.sponsorise) b.push('<span class="bdg spon">Sponsorisé</span>');
    if (p.mode === 'enchere') b.push('<span class="bdg enc">Enchère</span>');
    if (p.mode === 'location') b.push('<span class="bdg loc">Location</span>');
    if (p.barre) b.push(`<span class="bdg promo">−${p.reduction} %</span>`);
    if (p.annonce) b.push('<span class="bdg gris">Annonce</span>');
    if (p.a360) b.push('<span class="bdg">360°</span>');
    if (p.precommande) b.push('<span class="bdg">Précommande</span>');
    if (!p.dispo && p.mode === 'vente') b.push('<span class="bdg gris">Épuisé</span>');
    return b.length ? `<span class="badges">${b.join('')}</span>` : '';
  };
  const carte = p => `<article class="prod-c"><button type="button" class="coeur" data-act="fav" data-id="${p.id}" aria-pressed="${!!p.favori}" aria-label="${p.favori ? 'Retirer des favoris' : 'Ajouter aux favoris'} : ${esc(p.titre)}">${IC.coeur}</button>
    <a class="prod-l" href="#/p/${p.id}"><span class="im-w"><span class="im ${p.photo ? '' : 'vide'}"${fond(p.photo)}>${p.photo ? '' : '👟'}</span>${badges(p)}${p.enchere ? `<span class="chrono" data-fin="${esc(p.enchere.fin)}" data-debut="${esc(p.enchere.debut)}"><span>⏱</span><b>…</b></span>` : ''}</span>
      ${p.marque ? `<span class="marque">${esc(p.marque)}</span>` : ''}<span class="titre">${esc(p.titre)}</span><span class="px-l">${prixCarte(p)}</span>
      <span class="vend">${esc(p.vendeur_nom)} · ${p.vendeur_type === 'professionnel' ? 'Pro' : 'Particulier'}${p.etat === 'occasion' ? ' · Occasion' : ''}${p.commune ? ' · ' + esc(p.commune) : ''}</span>
      ${p.nb_avis ? `<span class="note-m"><b>★ ${dec(p.note)}</b> (${p.nb_avis})</span>` : ''}</a><button type="button" class="apercu-b" data-act="apercu" data-id="${p.id}" aria-label="Aperçu rapide : ${esc(p.titre)}">Aperçu</button></article>`;
  const grille = l => `<div class="prod-g">${l.map(carte).join('')}</div>`;
  const rail = l => `<div class="rail-h">${l.map(carte).join('')}</div>`;
  const squelette = () => '<div class="prod-g">' + '<i class="sq sq-t" style="aspect-ratio:4/5;height:auto"></i>'.repeat(4) + '</div>';
  Object.assign(TK, { carte, grille, squelette, rail, pastille, badges, COUL_HEX, MODES, dec, eurj });

  const section = (id, titre, lien, texte, corps, cls = '') => corps ? `<section class="sect-s en-vue ${cls}" aria-labelledby="${id}"><div class="sect-t"><h2 id="${id}">${titre}</h2>${lien ? `<a href="${lien}">${texte}</a>` : ''}</div>${corps}</section>` : '';

  // ---------------------------------------------------------------- accueil
  const slide = (k, o) => `<div class="hs ${k === 0 ? 'on' : ''}" ${k ? 'aria-hidden="true"' : ''} role="group" aria-roledescription="diapositive" aria-label="${k + 1}"><span class="fond"${o.photo ? fond(o.photo) : ` style="background:${o.fond}"`}></span>
      <span class="etiq">${o.etiq}</span>${k === 0 ? `<h1>${o.titre}</h1>` : `<h2>${o.titre}</h2>`}<p>${o.texte}</p><a class="btn" href="${o.lien}">${o.cta}</a></div>`;
  const heros = a => {
    const ph = l => (l && l[0] && l[0].photo) || null;
    const L = [{ etiq: 'Tropik', titre: 'La boutique des vendeurs des Antilles', texte: 'Chaussures, vêtements et accessoires : à acheter, à louer ou à enchérir, chez des vendeurs identifiés. Paiement à la remise.', cta: 'Découvrir', lien: '#/recherche', photo: ph(a.nouveautes), fond: 'linear-gradient(135deg,#0B1020,#9A3412 70%,#F97316)' }];
    if (a.encheres.length) L.push({ etiq: 'En direct', titre: 'Enchères en cours', texte: `${pluriel(a.encheres.length, 'pièce à enchérir', 'pièces à enchérir')} : la dernière offre dans les 2 dernières minutes repousse la fin.`, cta: 'Voir les enchères', lien: '#/encheres', photo: ph(a.encheres), fond: 'linear-gradient(135deg,#0B1020,#171D3A)' });
    if (a.flash.length) L.push({ etiq: 'Vente flash', titre: 'Prix en baisse, durée limitée', texte: 'Le prix barré est le plus bas des 30 derniers jours : calculé par Tropik, jamais saisi par le vendeur.', cta: 'Profiter des flash', lien: '#/recherche?promo=1&tri=promos', photo: ph(a.flash), fond: 'linear-gradient(135deg,#7C2D12,#F97316)' });
    if (a.locations.length) L.push({ etiq: 'Location', titre: 'Louez pour une soirée, un voyage', texte: 'Choisissez vos dates, la caution est réglée directement avec le vendeur.', cta: 'Voir les locations', lien: '#/recherche?mode=location', photo: ph(a.locations), fond: 'linear-gradient(135deg,#0A5C64,#0E7C86)' });
    L.push({ etiq: 'Gratuit', titre: 'La roue du jour', texte: 'Un tour par jour, sans obligation d’achat : des points à échanger contre des réductions.', cta: 'Tourner la roue', lien: '#/roue', photo: null, fond: 'linear-gradient(135deg,#171D3A,#C2410C)' });
    L.push({ etiq: 'Vendeurs', titre: 'Vendez vos articles ou ouvrez votre boutique', texte: 'Particuliers et professionnels : photos, 360°, enchères, location, personnalisation.', cta: 'Vendre sur Tropik', lien: '#/devenir-vendeur', photo: null, fond: 'linear-gradient(135deg,#0B1020,#0E7C86)' });
    return `<section class="hero-s" id="heroS" aria-roledescription="carrousel" aria-label="À la une">${L.map((o, k) => slide(k, o)).join('')}<button type="button" class="hs-fl hs-g" data-x="hero-prec" aria-label="Diapositive précédente">‹</button><button type="button" class="hs-fl hs-d" data-x="hero-suiv" aria-label="Diapositive suivante">›</button>
      <div class="hs-pts" role="group" aria-label="Choisir la diapositive">${L.map((o, k) => `<button type="button" data-x="hero-va" data-k="${k}" aria-label="Diapositive ${k + 1}" aria-current="${k === 0}"></button>`).join('')}</div></section>`;
  };
  const accueil = ouverte(async i => {
    const [rs, a] = await Promise.all([rayons(), rpc('tk_accueil')]);
    const vide = !a.stats.produits;
    const coll = a.collections.length ? `<div class="rail-h">${a.collections.map(c => `<a class="coll-c" href="#/collection/${c.id}"${fond(c.image)}><b>${esc(c.titre)}</b><span>${esc(c.vendeur_nom)} · ${pluriel(c.nb, 'article', 'articles')}${c.limitee ? ' · édition limitée' : ''}</span></a>`).join('')}</div>` : '';
    const bq = a.boutiques.length ? `<div class="rail-h boutiques-r" style="gap:18px">${a.boutiques.map(b => `<a href="#/boutique/${b.id}" style="width:92px"><span class="lg"${b.logo ? fond(b.logo) : ''}>${b.logo ? '' : '🏪'}</span>${esc(b.nom)}</a>`).join('')}</div>` : '';
    vue(`<div class="wrap tk accueil-t">${heros(a)}
      <div class="bandeau-t" aria-label="Nos engagements"><span>✔ Vendeurs identifiés</span><span>💶 Paiement à la remise</span><span>🏷️ Prix barrés honnêtes</span><span>🎡 Roue gratuite chaque jour</span><span>⭐ Avis d’acheteurs réels</span></div>
      <section class="sect-s" aria-labelledby="hR"><div class="sect-t"><h2 id="hR">Les rayons</h2><a href="#/rayons">Tout voir</a></div>
        <div class="rayons-g">${familles(rs).map(r => `<a class="rayon-c" href="#/recherche?rayon=${r.code}"><span aria-hidden="true">${esc(r.icone)}</span>${esc(r.nom)}</a>`).join('')}</div></section>
      ${a.flash.length ? `<section class="flash-b en-vue" aria-labelledby="hF"><div class="sect-t"><h2 id="hF">⚡ Ventes flash</h2><a href="#/recherche?promo=1&tri=promos">Tout voir</a></div>${rail(a.flash)}</section>` : ''}
      ${section('hE', '🔨 Enchères en cours', '#/recherche?mode=enchere&tri=fin_proche', 'Toutes les enchères', a.encheres.length ? rail(a.encheres) : '')}
      ${section('hN', 'Nouveautés', '#/recherche?tri=recents', 'Tout voir', a.nouveautes.length ? rail(a.nouveautes) : '')}
      ${section('hL', 'À louer', '#/recherche?mode=location', 'Toutes les locations', a.locations.length ? rail(a.locations) : '')}
      ${section('hC', 'Collections', null, '', coll)}
      ${section('hB', 'Boutiques à découvrir', null, '', bq)}
      ${section('hA', 'Annonces de particuliers', '#/recherche', 'Tout voir', a.annonces.length ? rail(a.annonces) : '')}
      ${section('hP', 'Promotions', '#/recherche?promo=1&tri=promos', 'Tout voir', a.promos.length ? `<p class="expl">Le prix barré est toujours le prix le plus bas des 30 derniers jours avant la réduction.</p>${rail(a.promos)}` : '')}
      ${section('hPo', 'Les plus vendus', '#/recherche?tri=populaires', 'Tout voir', a.populaires.length ? rail(a.populaires) : '')}
      ${section('hD', 'Dernières pièces', null, '', a.dernieres.length ? rail(a.dernieres) : '')}
      ${section('hS', 'Mises en avant <small class="muted">(sponsorisé)</small>', null, '', a.sponsorises.length ? `<p class="expl">Ces produits sont étiquetés « Sponsorisé » ; ils ne changent jamais le classement de vos recherches.</p>${rail(a.sponsorises)}` : '')}
      ${vide ? `<div class="vide-etat"><span class="ico" aria-hidden="true">🛍️</span><h3>Les premiers vendeurs arrivent</h3><p>Aucun produit n’est encore en vente : le catalogue se remplit au fur et à mesure que les commerçants et particuliers ouvrent leur boutique, après vérification. Vous avez des chaussures, des vêtements ou des accessoires à vendre ?</p><a class="btn btn-p" href="#/devenir-vendeur">Ouvrir ma boutique</a></div>` : ''}
      <section class="pourquoi en-vue" aria-label="Pourquoi Tropik"><div><i>🌴</i><b>Livraison ou retrait aux Antilles</b><span>Chaque vendeur choisit : retrait chez lui, livraison, ou les deux.</span></div><div><i>🛡️</i><b>Authenticité déclarée</b><span>Produit de marque : le vendeur déclare l’authenticité, la modération agit sur signalement.</span></div>
        <div><i>↩️</i><b>14 jours pour changer d’avis</b><span>Chez les vendeurs professionnels, à partir de la remise.</span></div><div><i>🎁</i><b>Fidélité</b><span>Points à chaque achat, vente et avis ; niveaux et récompenses.</span></div></section>
      <section class="cta-b en-vue"><h2>Vendez sur Tropik</h2><p>Vide-dressing entre particuliers ou boutique de professionnel : annonces, enchères, location, sur-mesure. Commission de ${i.commission_pct} % seulement sur les ventes terminées.</p><a class="btn" href="#/devenir-vendeur">Commencer à vendre</a></section>
      <form class="carte" data-xform="newsletter"><h2>Les nouveautés dans votre boîte</h2><div class="ligne-ds"><input class="champ" type="email" name="email" required maxlength="120" placeholder="Votre e-mail" aria-label="Votre e-mail" style="flex:1;min-height:48px"><button class="btn btn-p">Je m’abonne</button></div><p class="petit muted" style="margin:0">Pas de spam, désabonnement sur simple demande à ilotech.contact@gmail.com.</p></form></div>`);
    TK.apresVue && TK.apresVue('accueil');
  });

  // ---------------------------------------------------------------- rayons
  const pageRayons = ouverte(async () => {
    const rs = await rayons();
    vue(`<div class="wrap tk"><h1>Les rayons</h1><div class="rayons-liste">${familles(rs).map(f => `<section class="rayon-bloc"><h2><a href="#/recherche?rayon=${f.code}"><span aria-hidden="true">${esc(f.icone)}</span> ${esc(f.nom)}</a></h2>
      <div class="sous-r">${rs.filter(s => s.parent === f.code).map(s => `<a href="#/recherche?rayon=${s.code}">${esc(s.nom)}</a>`).join('')}</div></section>`).join('')}</div></div>`);
  });

  // ---------------------------------------------------------------- recherche à facettes (tout est gardé dans l'adresse)
  let filtresOuverts = false;
  const LISTES = ['marque', 'taille', 'pointure', 'couleur', 'mode'];
  const filtresDe = p => {
    const f = {}, l = k => (p[k] || '').split('|').filter(Boolean);
    if (p.q) f.q = p.q; if (p.rayon) f.rayon = p.rayon; if (p.vendeur) f.vendeur = p.vendeur; if (p.etat) f.etat = p.etat; if (p.public) f.public = p.public;
    if (l('marque').length) f.marques = l('marque'); if (l('taille').length) f.tailles = l('taille'); if (l('pointure').length) f.pointures = l('pointure'); if (l('couleur').length) f.couleurs = l('couleur'); if (l('mode').length) f.modes = l('mode');
    if (p.pmin) f.prix_min = Number(p.pmin); if (p.pmax) f.prix_max = Number(p.pmax); if (p.dispo) f.dispo = true; if (p.promo) f.promo = true; if (p.tri) f.tri = p.tri;
    return f;
  };
  const TRIS2 = [...TRIS, ['fin_proche', 'Enchères : fin proche']];
  const pageRecherche = ouverte(async () => {
    const p = param(), rs = await rayons(), f = filtresDe(p), lim = 24;
    const r = await rpc('tk_catalogue', { f: { ...f, limite: lim, decalage: 0 } }), fa = r.facettes, sel = k => (p[k] || '').split('|').filter(Boolean);
    const coches = (k, liste, nom, coul) => liste && liste.length ? `<fieldset><legend>${nom}</legend><div class="f-liste ${coul ? 'coul' : ''}">${liste.map(x => `<label><input type="checkbox" data-xf="${k}" value="${esc(x.v)}" ${sel(k).includes(x.v) ? 'checked' : ''}>${coul ? pastille(x.v) : ''}${esc(MODES[x.v] || x.v)} <i>${x.n}</i></label>`).join('')}</div></fieldset>` : '';
    const radios = (k, liste, nom, noms) => liste && liste.length > 0 ? `<fieldset><legend>${nom}</legend><div class="f-liste"><label><input type="radio" name="r-${k}" data-xfu="${k}" value="" ${!p[k] ? 'checked' : ''}>Tous</label>${liste.map(x => `<label><input type="radio" name="r-${k}" data-xfu="${k}" value="${esc(x.v)}" ${p[k] === x.v ? 'checked' : ''}>${esc(noms[x.v] || x.v)} <i>${x.n}</i></label>`).join('')}</div></fieldset>` : '';
    const actifs = [];
    for (const k of LISTES) for (const v of sel(k)) actifs.push([k, v, MODES[v] || v]);
    for (const [k, t] of [['etat', p.etat === 'occasion' ? 'Occasion' : 'Neuf'], ['public', PUBLICS[p.public]], ['pmin', 'Dès ' + p.pmin + ' €'], ['pmax', 'Jusqu’à ' + p.pmax + ' €'], ['dispo', 'En stock'], ['promo', 'Promotions'], ['vendeur', 'Un vendeur'], ['rayon', nomRayon(rs, p.rayon)], ['q', '« ' + p.q + ' »']]) if (p[k]) actifs.push([k, '', t]);
    const total = r.total, fam = p.rayon ? (rs.find(x => x.code === p.rayon) || {}) : {}, famCode = fam.parent || fam.code || '';
    const seul = sel('mode').length === 1 ? sel('mode')[0] : '';   // Enchères, Location et Promotions : la même page, avec les mêmes filtres
    const titre = p.rayon ? nomRayon(rs, p.rayon) : p.q ? 'Recherche' : seul === 'enchere' ? 'Enchères' : seul === 'location' ? 'Location' : seul === 'vente' ? 'En vente' : p.promo ? 'Promotions' : p.vendeur ? 'Articles de la boutique' : 'Tous les articles';
    const intro = seul === 'enchere' ? `<p class="muted">Le prix de départ, le pas minimum et le gagnant sont décidés par Tropik. Une offre dans les 2 dernières minutes repousse la fin de 2 minutes. Le gagnant reçoit une commande à payer à la remise ou au retrait.${moi ? ' <a href="#/mes-encheres">Mes enchères</a>' : ''}</p>`
      : seul === 'location' ? `<p class="muted">Louez pour quelques jours : choisissez vos dates sur la fiche, le vendeur accepte ou refuse.${moi ? ' <a href="#/locations">Mes locations</a>' : ''}</p>` : '';
    const sous = famCode ? rs.filter(s => s.parent === famCode) : [];
    const cnt = Object.fromEntries((fa.rayons || []).map(x => [x.v, x.n]));
    vue(`<div class="wrap tk rech-t"><h1>${esc(titre)}</h1>${intro}
      <form class="rech" id="fRech" role="search"><input class="champ" name="q" type="search" value="${esc(p.q || '')}" placeholder="Une marque, un article…" aria-label="Rechercher un article" autocomplete="off"><button class="btn btn-p">Chercher</button></form>
      <div class="puces-m" role="group" aria-label="Vente, location ou enchère"><button type="button" data-x="mode-un" data-v="" aria-pressed="${!sel('mode').length}">Tout</button>${['vente', 'location', 'enchere'].map(m => `<button type="button" data-x="mode-un" data-v="${m}" aria-pressed="${sel('mode').length === 1 && sel('mode')[0] === m}">${MODES[m]}${(fa.modes.find(x => x.v === m) || {}).n ? ' (' + fa.modes.find(x => x.v === m).n + ')' : ''}</button>`).join('')}</div>
      ${sous.length ? `<div class="puces-m" role="group" aria-label="Types">${sous.map(s => `<a href="${hashDe({ ...p, rayon: s.code })}" class="${p.rayon === s.code ? 'on' : ''}">${esc(s.nom)}${cnt[s.code] ? ' (' + cnt[s.code] + ')' : ''}</a>`).join('')}</div>` : ''}
      <div class="cat-3"><div class="voile-f" id="voileF" data-x="filtres" hidden></div><form class="filtres ${filtresOuverts ? 'ouvert' : ''}" id="fFiltres" aria-label="Filtres">
        <fieldset><legend>Rayon</legend><select class="champ" data-xfu="rayon" aria-label="Rayon"><option value="">Tous les rayons</option>${familles(rs).map(fm => `<optgroup label="${esc(fm.nom)}"><option value="${fm.code}" ${p.rayon === fm.code ? 'selected' : ''}>Tout : ${esc(fm.nom)}</option>${rs.filter(s => s.parent === fm.code).map(s => `<option value="${s.code}" ${p.rayon === s.code ? 'selected' : ''}>${esc(s.nom)}</option>`).join('')}</optgroup>`).join('')}</select></fieldset>
        ${radios('public', fa.publics, 'Genre', PUBLICS)}
        ${coches('pointure', fa.pointures, 'Pointure')}${coches('taille', fa.tailles, 'Taille')}${coches('couleur', fa.couleurs, 'Couleur', true)}${coches('marque', fa.marques, 'Marque')}
        <fieldset><legend>Prix (€)</legend><div class="f-prix"><input type="number" min="0" inputmode="numeric" placeholder="${fa.prix.min != null ? Math.floor(fa.prix.min) : 'Min'}" data-xfu="pmin" value="${esc(p.pmin || '')}" aria-label="Prix minimum"><input type="number" min="0" inputmode="numeric" placeholder="${fa.prix.max != null ? Math.ceil(fa.prix.max) : 'Max'}" data-xfu="pmax" value="${esc(p.pmax || '')}" aria-label="Prix maximum"></div></fieldset>
        ${radios('etat', fa.etats, 'État', { neuf: 'Neuf', occasion: 'Occasion' })}
        ${fa.vendeurs.length > 1 || p.vendeur ? `<fieldset><legend>Vendeur</legend><select class="champ" data-xfu="vendeur" aria-label="Vendeur"><option value="">Tous les vendeurs</option>${fa.vendeurs.map(v => `<option value="${v.v}" ${p.vendeur === v.v ? 'selected' : ''}>${esc(v.nom)} (${v.n})</option>`).join('')}</select></fieldset>` : ''}
        <fieldset><legend>Disponibilité</legend><div class="f-liste"><label><input type="checkbox" data-xfb="dispo" ${p.dispo ? 'checked' : ''}>En stock</label><label><input type="checkbox" data-xfb="promo" ${p.promo ? 'checked' : ''}>Promotions</label></div></fieldset>
        <button type="button" class="btn btn-sec btn-s" data-x="effacer">Effacer les filtres</button><button type="button" class="btn btn-p btn-plein fermer-f" data-x="filtres">Voir ${pluriel(total, 'résultat', 'résultats')}</button></form>
      <div style="display:grid;gap:12px;min-width:0"><div class="filtres-btn"><button type="button" class="btn btn-sec btn-filtres" data-x="filtres" aria-expanded="${filtresOuverts}">Filtres${actifs.length ? ' (' + actifs.length + ')' : ''}</button>
          ${actifs.length ? `<span class="actifs">${actifs.map(([k, v, t]) => `<button type="button" data-x="retire" data-k="${k}" data-v="${esc(v)}" aria-label="Retirer le filtre ${esc(t)}">${esc(t)} ✕</button>`).join('')}</span>` : ''}</div>
        <div class="tri-l"><b id="nbRes" aria-live="polite">${total ? pluriel(total, 'article', 'articles') : 'Aucun article'}</b><label class="petit">Trier <select data-xfu="tri" aria-label="Trier par">${TRIS2.map(([k, t]) => `<option value="${k}" ${(p.tri || 'pertinence') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
        ${actifs.length ? `<div class="rech-sauv"><button type="button" class="btn btn-sec btn-s" data-x="sauver">🔔 Enregistrer cette recherche avec alerte</button></div>` : ''}
        <p class="expl">${(p.tri || 'pertinence') === 'pertinence' ? 'Classement par pertinence : les articles qui correspondent à votre recherche, puis les plus récents. Aucun vendeur ne paie pour être mieux placé. ' : ''}<a href="#/aide">Comment ça marche</a></p>
        ${r.suggestion ? `<p class="suggest-m">Aucun résultat exact. Vous cherchiez peut-être <a href="${hashDe({ ...p, q: r.suggestion })}">${esc(r.suggestion)}</a> ?</p>` : ''}
        ${total ? `<div id="resultats">${grille(r.produits)}</div>${total > lim ? `<button class="btn btn-sec btn-plein" data-x="plus" data-n="${lim}" data-total="${total}">Voir plus d’articles</button>` : ''}`
          : `<div class="vide-etat"><span class="ico" aria-hidden="true">🔎</span><h3>Aucun article ne correspond</h3><p>${actifs.length ? 'Essayez avec moins de filtres.' : 'Le catalogue se remplit au fur et à mesure que les vendeurs ouvrent leur boutique.'}</p>${actifs.length ? '<button class="btn btn-p" data-x="effacer">Effacer les filtres</button>' : '<a class="btn btn-p" href="#/devenir-vendeur">Vendre sur Tropik</a>'}</div>`}</div></div></div>`);
    const v = $('#voileF'); if (v) v.hidden = !filtresOuverts;
    TK.apresVue && TK.apresVue('recherche');
  });

  // ---------------------------------------------------------------- fiche
  const FX = { p: null, sel: { couleur: null, variante: null }, opts: {}, loc: { d1: null, d2: null, mois: null, occ: null }, vue: 'photo', k: 0 };
  const UN = p => p.mode === 'location' ? 'location' : p.mode === 'enchere' ? 'enchere' : 'vente';
  const pageFiche = ouverte(async (i, id) => {
    await rpc('tk_encheres_cloturer').catch(() => 0);
    const p = await rpc('tk_fiche', { p: id });
    if (!p) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Produit introuvable</h3><p>Il n’est plus en vente ou n’existe pas.</p><a class="btn btn-p" href="#/recherche">Voir le catalogue</a></div></div>');
    const v = p.vendeur, pro = v.type === 'professionnel', moiVend = moi && v.id === moi.id, enVente = p.statut === 'publie';
    const couleurs = [...new Set(p.variantes.map(x => x.couleur))];
    FX.p = p; FX.sel = { couleur: couleurs.find(c => p.variantes.some(x => x.couleur === c && x.stock > 0)) || couleurs[0], variante: null }; FX.opts = {}; FX.loc = { d1: null, d2: null, mois: null, occ: null }; FX.vue = 'photo'; FX.k = 0;
    const photos = p.photos || [];
    const sigForm = moi ? `<details class="plus-options"><summary>Signaler cette annonce</summary><form class="f" data-form="signaler" data-type="produit" data-id="${p.id}"><label>Motif<select name="motif">${TK.MOTIFS_SIG.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
      <label>Précisions<textarea name="details" maxlength="1000" placeholder="Que s’est-il passé ? Un lien, une preuve…"></textarea></label><button class="btn btn-sec">Envoyer le signalement</button></form></details>` : `<p class="petit"><a href="#/connexion?retour=${encodeURIComponent('#/p/' + p.id)}">Connectez-vous</a> pour signaler ce produit.</p>`;
    const onglets = [['photo', 'Photos'], ...(p.photos360 && p.photos360.length ? [['360', 'Vue 360°']] : []), ...(p.video ? [['video', 'Vidéo']] : [])];
    vue(`<div class="wrap tk"><div class="fiche">
      <div class="galerie">${onglets.length > 1 ? `<div class="tabs-m" role="group" aria-label="Type de vue">${onglets.map(([k, t]) => `<button type="button" data-x="vue" data-v="${k}" aria-pressed="${k === 'photo'}">${t}</button>`).join('')}</div>` : ''}
        <div id="zoneG"></div>
        ${photos.length > 1 ? `<div class="vignettes" id="vignG">${photos.map((x, k) => `<button type="button" data-x="img" data-k="${k}" aria-label="Photo ${k + 1}" aria-current="${k === 0}"${fond(x)}></button>`).join('')}</div>` : ''}</div>
      <div class="fiche-infos">
        ${!enVente ? `<div class="avert avert-ko"><b>${esc((TK.STATUT_P[p.statut] || [0, p.statut])[1])}</b> : ce produit n’est pas visible par le public.</div>` : ''}
        <div><div class="badges" style="position:static;flex-direction:row;flex-wrap:wrap;margin-bottom:6px">${[p.sponsorise ? '<span class="bdg spon">Sponsorisé</span>' : '', `<span class="bdg ${p.mode === 'enchere' ? 'enc' : p.mode === 'location' ? 'loc' : ''}">${MODES[p.mode]}</span>`, p.annonce ? '<span class="bdg gris">Annonce de particulier</span>' : '', p.precommande ? `<span class="bdg">Précommande${p.date_dispo ? ' · dispo le ' + esc(jourLong(p.date_dispo)) : ''}</span>` : ''].join('')}</div>
          ${p.marque ? `<span class="marque" style="font-weight:800;text-transform:uppercase;font-size:13px;color:var(--texte-2)">${esc(p.marque)}</span>` : ''}<h1>${esc(p.titre)}</h1>
          <div class="note-m">${p.nb_avis ? `${etoiles(p.note)} <b>${dec(p.note)}</b> · ${pluriel(p.nb_avis, 'avis', 'avis')}` : 'Pas encore d’avis'} · ${esc(p.rayon_nom)} · ${p.etat === 'occasion' ? 'Occasion' : 'Neuf'} · ${esc(PUBLICS[p.public])}</div></div>
        <div id="zonePrix"></div>
        ${p.marque ? `<p class="petit">🛡️ ${p.authentique ? '<b>Authenticité déclarée par le vendeur.</b>' : 'Authenticité non déclarée.'} En cas de doute, utilisez « Signaler ».</p>` : ''}
        <div id="choixV"></div><div id="zoneMode"></div>
        <div class="actions-r"><button type="button" class="btn btn-sec" data-act="fav" data-id="${p.id}" aria-pressed="${!!p.favori}">♥ ${p.favori ? 'Dans mes favoris' : 'Favori'}</button>
          <button type="button" class="btn btn-sec" data-x="suivi" data-id="${p.id}" aria-pressed="${!!p.suivi}">${p.suivi ? '🔔 Prix suivi' : '🔔 Suivre le prix'}</button><button type="button" class="btn btn-sec" data-x="partager">🔗 Partager</button></div>
        ${moiVend ? '<p class="petit muted">C’est votre produit : vous ne pouvez pas l’acheter, le louer ni enchérir.</p>' : ''}
        <section class="carte id-vend"><h3>${p.annonce ? 'Annonce de' : 'Vendu par'} <a href="#/boutique/${v.id}">${esc(v.nom)}</a></h3><div>${tagVendeur(v.type)}</div>
          ${pro ? `<span>SIRET ${esc(v.siret)} · ${esc(v.adresse)}, ${esc(v.commune)}</span><span>Téléphone : ${esc(v.telephone)}</span>` : `<span>${esc(v.commune)} · ${esc(v.territoire)}</span><span class="petit muted">Vente entre particuliers : pas de rétractation de 14 jours ni de garantie légale de conformité.</span>`}
          <span>${v.retrait_ok ? '✔ Retrait chez le vendeur' : ''}${v.retrait_ok && v.livraison_ok ? ' · ' : ''}${v.livraison_ok ? `✔ Livraison ${v.frais ? eur(v.frais) : 'gratuite'}${v.gratuite_des ? ' (offerte dès ' + eur(v.gratuite_des) + ')' : ''}` : ''}</span><span>💶 Paiement à la remise ou au retrait</span>
          <div class="actions-r"><a class="btn btn-sec btn-s" href="#/boutique/${v.id}">Voir la ${p.annonce ? 'page du vendeur' : 'boutique'}${v.nb_avis ? ' · ★ ' + dec(v.note) : ''}</a>${moi && !moiVend ? `<a class="btn btn-sec btn-s" href="#/messages/${v.id}?p=${p.id}">💬 Écrire au vendeur</a>` : ''}</div></section>
        ${p.description ? `<section class="carte"><h3>Description</h3><p style="margin:0;white-space:pre-line">${esc(p.description)}</p></section>` : ''}
        ${guideTailles(p.famille) ? `<details class="plus-options"><summary>Guide des tailles</summary>${guideTailles(p.famille)}<p class="expl">Repères indicatifs : les coupes varient selon les marques, demandez conseil au vendeur.</p></details>` : ''}
        <details class="plus-options"><summary>Retours et droits</summary><div class="avis-l">${pro ? '<p>✔ <b>14 jours pour vous rétracter</b> à compter de la remise ou de l’expédition, sans motif, depuis la page de votre commande.</p><p>✔ Garantie légale de conformité (2 ans en neuf).</p>' : '<p>Vendeur particulier : la vente n’ouvre pas droit à la rétractation de 14 jours ni à la garantie légale de conformité. Vérifiez l’article au retrait.</p>'}
          ${v.politique_retour ? `<p><b>Politique du vendeur :</b> ${esc(v.politique_retour)}</p>` : ''}<p class="petit"><a href="cgu.html#retractation">Conditions générales</a></p></div></details>
        ${sigForm}</div></div>
      <section class="carte"><h2>Avis des acheteurs</h2>${p.avis.length ? `<div class="avis-l">${p.avis.map(a => `<article>${etoiles(a.note)} <b>${esc(a.auteur)}</b> <small class="muted">${esc(jourLong(a.date))}</small>${a.texte ? `<p style="margin:4px 0 0">${esc(a.texte)}</p>` : ''}</article>`).join('')}</div>` : '<p class="muted">Pas encore d’avis. Seuls les acheteurs d’une commande terminée peuvent en laisser.</p>'}</section>
      ${p.similaires.length ? `<section class="sect-s" aria-labelledby="hS"><h2 id="hS">Dans le même rayon</h2>${rail(p.similaires)}</section>` : ''}</div>`);
    zoneG(); zonePrix(); rendreChoix(); zoneMode();
    TK.apresVue && TK.apresVue('fiche');
  });
  // galerie : photos (zoom au clic), vue 360° (glisser pour tourner), vidéo
  const zoneG = () => {
    const p = FX.p, z = $('#zoneG'); if (!z) return; const photos = p.photos || [];
    if (FX.vue === '360') {
      const n = p.photos360.length;
      z.innerHTML = `<div class="v360" id="v360" role="img" aria-label="Vue à 360 degrés : glissez pour tourner" tabindex="0"${fond(p.photos360[0])}><input type="range" min="0" max="${n - 1}" value="0" aria-label="Faire tourner l’article" data-x="r360"><span class="aide-360">↔ Glissez pour tourner</span></div>`;
      TK.v360 && TK.v360($('#v360'), p.photos360);
    } else if (FX.vue === 'video') {
      z.innerHTML = `<video class="grand" style="aspect-ratio:4/5;width:100%;object-fit:cover" src="${esc(p.video)}" controls playsinline preload="metadata"></video>`;
    } else z.innerHTML = `<div class="grand ${photos.length ? '' : 'vide'}" id="grandeImg" data-x="zoom" role="button" tabindex="0" aria-label="Agrandir la photo"${fond(photos[FX.k])}>${photos.length ? '' : '👟'}</div>`;
  };
  const zonePrix = () => {
    const p = FX.p, z = $('#zonePrix'); if (!z) return;
    if (p.mode === 'location') z.innerHTML = `<div class="px"><b>${eur(p.prix_jour)}</b> <span class="muted">par jour</span></div><p class="petit" style="margin:0"><b>Caution : ${eur(p.caution || 0)}</b>, réglée directement avec le vendeur (pas dans l’application). Durée : ${p.location_min_jours} à ${p.location_max_jours} jours.</p>`;
    else if (p.mode === 'enchere') z.innerHTML = '';
    else z.innerHTML = `${prixHtml(p)}${p.barre ? `<p class="expl">${p.jusqu ? 'Jusqu’au ' + esc(jourHeure(p.jusqu)) + '. ' : ''}Prix de référence : le plus bas des 30 jours avant la réduction.</p>` : ''}`;
  };
  const rendreChoix = () => {
    const p = FX.p, z = $('#choixV'); if (!z) return; const sel = FX.sel, tailles = p.variantes.filter(x => x.couleur === sel.couleur), couleurs = [...new Set(p.variantes.map(x => x.couleur))];
    if (p.mode === 'enchere') { z.innerHTML = ''; return; }
    const dernier = p.variantes.reduce((n, x) => n + x.stock, 0);
    z.innerHTML = `<div class="f"><div><b>Couleur : ${esc(sel.couleur)}</b><div class="choix-v" role="group" aria-label="Couleur">${couleurs.map(c => `<button type="button" data-x="coul" data-c="${esc(c)}" aria-pressed="${c === sel.couleur}">${pastille(c)} ${esc(c)}</button>`).join('')}</div></div>
      <div><b>${p.famille === 'chaussures' ? 'Pointure' : 'Taille'}</b><div class="choix-v" role="group" aria-label="Taille">${tailles.map(x => `<button type="button" data-x="taille" data-v="${x.id}" aria-pressed="${x.id === sel.variante}" ${x.stock <= 0 && p.mode === 'vente' ? 'disabled' : ''}>${esc(x.taille)}</button>`).join('')}</div></div>
      ${p.mode === 'vente' ? `<div class="stock-m ${sel.variante ? '' : 'bas'}" id="stockM" aria-live="polite">${sel.variante ? stockTexte(p.variantes.find(x => x.id === sel.variante).stock) : dernier ? 'Choisissez une taille' : '<span class="zero">Épuisé</span>'}</div>` : ''}</div>`;
  };
  const eurN = n => eur(n);
  const zoneMode = () => {
    const p = FX.p, z = $('#zoneMode'); if (!z) return; const enVente = p.statut === 'publie', moiVend = moi && p.vendeur.id === moi.id;
    if (p.mode === 'vente') {
      let h = '';
      if (p.options && p.options.length) {
        const gr = {}; p.options.forEach(o => (gr[o.groupe] = gr[o.groupe] || []).push(o));
        h += `<section class="panneau" id="pPerso"><h3>🎨 Personnaliser${p.delai_perso_jours ? ` <small class="muted">(délai ${p.delai_perso_jours} jours)</small>` : ''}</h3><div class="perso-ap" id="persoAp"${fond(p.photos[0])}><span class="teinte" id="persoT"></span><span class="txt" id="persoTxt"></span></div>
          ${Object.entries(gr).map(([g, l]) => `<div class="opt-g"><b>${esc(g)}</b><div class="choix-v" role="group" aria-label="${esc(g)}">${l.map(o => `<button type="button" data-x="opt" data-o="${o.id}" data-g="${esc(g)}" aria-pressed="false">${o.couleur ? `<span class="pt" style="background:${esc(o.couleur)}"></span>` : ''}${esc(o.libelle)} <small>${o.supplement ? '+' + eur(o.supplement) : 'inclus'}</small></button>`).join('')}</div>
            ${l.some(o => o.texte_libre) ? `<input class="champ" data-x-optx="${esc(g)}" maxlength="30" placeholder="Votre texte (30 caractères)" hidden aria-label="Texte pour ${esc(g)}">` : ''}</div>`).join('')}
          <div class="total-l gros"><span>Prix personnalisé</span><b id="persoPrix">${eur(p.prix)}</b></div><p class="petit muted" style="margin:0">Le prix est calculé par la base à chaque choix. Paiement à la remise.</p>
          <button type="button" class="btn btn-n btn-plein" data-x="perso-cmd" ${!enVente || moiVend ? 'disabled' : ''}>Commander sur mesure</button></section>`;
      }
      z.innerHTML = `${h}<div class="sticky-ach"><button class="btn btn-p" id="ajout" data-x="ajouter" ${!enVente || moiVend ? 'disabled' : ''}>Ajouter au panier</button>${lirePanier().length ? '<a class="btn btn-sec" id="versPanier" href="#/panier">Voir le panier</a>' : ''}</div>`;
    } else if (p.mode === 'location') {
      z.innerHTML = `<section class="panneau loc" id="pLoc"><h3>📅 Choisir les dates</h3><div id="calL" class="cal">Chargement du calendrier…</div><div id="devisL" class="petit" aria-live="polite">Choisissez le premier jour puis le dernier jour.</div>
        <form class="f" data-xform="louer"><div class="ligne2"><label>Votre nom<input name="nom" required minlength="2" maxlength="80" value="${esc(profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '')}"></label><label>Téléphone<input name="tel" type="tel" required pattern="[0-9 +.]{6,20}" value="${esc((contact && contact.telephone) || '')}"></label></div>
          <label>Un mot pour le vendeur <span class="aide">(facultatif)</span><input name="note" maxlength="300"></label><button class="btn btn-p btn-plein" ${!enVente || moiVend ? 'disabled' : ''}>Envoyer la demande de location</button></form>
        <p class="petit muted" style="margin:0">Le vendeur accepte ou refuse. La caution (${eur(p.caution || 0)}) et la location se règlent à la remise, hors de l’application. Retour à la date de fin.</p></section>`;
      chargerCal();
    } else {
      z.innerHTML = '<section class="panneau enc" id="pEnc" aria-live="polite"></section>'; rendreEnchere(p.enchere_vue);
    }
  };
  const chargerCal = async () => {
    const o = await rpc('tk_location_occupation', { p: FX.p.id }).catch(() => null);
    if (!o) return; FX.loc.occ = o; const d = new Date(o.aujourdhui + 'T12:00:00'); FX.loc.mois = new Date(d.getFullYear(), d.getMonth(), 1); calendrier();
  };
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const libre = (iso1) => {
    const v = FX.p.variantes.find(x => x.id === FX.sel.variante) || FX.loc.occ.variantes[0], vv = FX.loc.occ.variantes.find(x => x.id === (FX.sel.variante || (v && v.id)));
    if (!vv) return true; const n = vv.occupe.filter(r => r.debut <= iso1 && r.fin >= iso1).length; return n < vv.stock;
  };
  const calendrier = () => {
    const c = $('#calL'); if (!c || !FX.loc.occ) return; const m = FX.loc.mois, auj = FX.loc.occ.aujourdhui, n = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate(), dec0 = (new Date(m.getFullYear(), m.getMonth(), 1).getDay() + 6) % 7;
    const { d1, d2 } = FX.loc; let h = `<div class="cal-ent"><button type="button" data-x="cal" data-d="-1" aria-label="Mois précédent">‹</button><span>${new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(m)}</span><button type="button" data-x="cal" data-d="1" aria-label="Mois suivant">›</button></div>
      <div class="cal-g">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<b>${x}</b>`).join('')}${'<span></span>'.repeat(dec0)}`;
    for (let j = 1; j <= n; j++) { const dd = iso(new Date(m.getFullYear(), m.getMonth(), j)), ok = dd >= auj && libre(dd), cl = (dd === d1 || dd === d2) ? 'sel' : (d1 && d2 && dd > d1 && dd < d2) ? 'pl' : ''; h += `<button type="button" data-x="jour" data-d="${dd}" class="${cl}" ${ok ? '' : 'disabled'} aria-label="${j} ${esc(new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(m))}${ok ? '' : ' indisponible'}" aria-pressed="${cl === 'sel'}">${j}</button>`; }
    c.innerHTML = h + '</div>';
    if (d1) rpc('tk_location_prix', { p: FX.p.id, d1, d2: d2 || d1 }).then(x => { const e = $('#devisL'); if (e && x) e.innerHTML = `<b>${pluriel(x.jours, 'jour', 'jours')} × ${eur(x.prix_jour)} = ${eur(x.total)}</b> · caution ${eur(x.caution || 0)} (hors application)${d2 ? '' : ' · choisissez le dernier jour'}`; });
  };
  // enchère : prix courant, compte à rebours, offre
  const rendreEnchere = e => {
    const z = $('#pEnc'); if (!z || !e) return; const p = FX.p, moiVend = moi && p.vendeur.id === moi.id, fini = e.phase === 'terminee' || e.phase === 'annulee';
    const lbl = { meilleur: '🏆 Vous avez la meilleure offre', depasse: '⚠️ Vous avez été dépassé', gagnant: '🎉 Vous avez gagné cette enchère' }[e.moi] || '';
    z.innerHTML = `<h3>🔨 ${e.phase === 'programmee' ? 'Enchère à venir' : fini ? 'Enchère terminée' : 'Enchère en cours'}</h3>
      <div><span class="petit muted">${e.nb_offres ? 'Offre actuelle' : 'Mise à prix'}</span><div class="gros-c" id="prixEnc">${eur(e.courant)}</div><span class="petit muted">${pluriel(e.nb_offres, 'offre', 'offres')} · pas minimum ${eur(e.pas_min)}</span></div>
      <div class="ligne-ds"><b id="chronoEnc" data-fin="${esc(e.fin)}" data-debut="${esc(e.debut)}">…</b>${e.prolongations ? `<span class="petit muted">prolongée ${e.prolongations} fois</span>` : ''}</div>
      ${lbl ? `<div class="avert" role="status"><b>${lbl}</b></div>` : ''}
      ${fini ? `<p style="margin:0">${e.phase === 'annulee' ? 'Enchère annulée par le vendeur.' : e.nb_offres ? `Vendu ${eur(e.prix_prix || e.prix_final)}.` : 'Aucune offre : l’article est de nouveau en vente.'}${e.commande_id ? ` <a href="#/commande/${e.commande_id}">Voir ma commande à payer à la remise</a>` : ''}</p>`
        : `<form class="f" data-xform="offre"><label>Votre offre (€) <span class="aide">au moins ${eur(e.min_suivante)}</span><input name="montant" type="number" step="0.01" min="${e.min_suivante}" required value="${e.min_suivante}" inputmode="decimal"></label>
          <div class="ligne2"><label>Votre nom<input name="nom" required minlength="2" maxlength="80" value="${esc(profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '')}"></label><label>Téléphone<input name="tel" type="tel" required pattern="[0-9 +.]{6,20}" value="${esc((contact && contact.telephone) || '')}"></label></div>
          <button class="btn btn-p btn-plein" ${moiVend || e.phase === 'programmee' ? 'disabled' : ''}>Enchérir</button></form>
          <p class="petit muted" style="margin:0">Si vous gagnez, vous recevez une commande à payer à la remise ou au retrait. Une offre dans les 2 dernières minutes repousse la fin de 2 minutes. Nom et téléphone sont transmis au vendeur seulement si vous gagnez.</p>`}
      ${e.historique.length ? `<ul class="hist-o" aria-label="Dernières offres">${e.historique.map(h => `<li><span>${esc(h.enchereur)}</span><b>${eur(h.montant)}</b><span class="muted">${esc(jourHeure(h.date))}</span></li>`).join('')}</ul>` : ''}`;
    FX.enc = e; TK.apresVue && TK.apresVue('enchere');
  };
  // ---------------------------------------------------------------- boutique : bannière, couleur, vedettes, collections
  const pageBoutique = ouverte(async (i, id) => {
    const [v, r] = await Promise.all([rpc('tk_boutique', { v: id }), rpc('tk_catalogue', { f: { vendeur: id, tri: 'recents', limite: 48 } })]);
    if (!v) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Boutique introuvable</h3><a class="btn btn-p" href="#/">Accueil</a></div></div>');
    const pro = v.type === 'professionnel', sty = v.couleur ? `--bq:${esc(v.couleur)};--action:${esc(v.couleur)}` : '';
    vue(`<div class="wrap tk" style="${sty}"><div class="bq-ban"${v.banniere ? fond(v.banniere) : ''}></div>
      <div class="bq-id"><span class="lg"${v.logo ? fond(v.logo) : ''}>${v.logo ? '' : '🏪'}</span><div><h1>${esc(v.nom)}</h1>${tagVendeur(v.type)} <span class="petit muted">${v.nb_ventes ? pluriel(v.nb_ventes, 'vente', 'ventes') + ' · ' : ''}depuis ${esc(jourLong(v.depuis))}</span></div></div>
      <section class="carte"><div class="note-m">${v.nb_avis ? `${etoiles(v.note)} <b>${dec(v.note)}</b> · ${pluriel(v.nb_avis, 'avis', 'avis')}` : 'Pas encore d’avis'}</div>${v.description ? `<p style="margin:0;white-space:pre-line">${esc(v.description)}</p>` : ''}
      <div class="id-vend">${pro ? `<span>SIRET ${esc(v.siret)} · ${esc(v.adresse)}, ${esc(v.commune)}</span><span>Téléphone : ${esc(v.telephone)}</span>` : `<span>${esc(v.commune)} · ${esc(v.territoire)} · vente entre particuliers</span>`}
        <span>${v.retrait_ok ? '✔ Retrait' : ''}${v.retrait_ok && v.livraison_ok ? ' · ' : ''}${v.livraison_ok ? `✔ Livraison ${v.frais ? eur(v.frais) : 'gratuite'}${v.gratuite_des ? ' (offerte dès ' + eur(v.gratuite_des) + ')' : ''}` : ''} · 💶 paiement à la remise</span>
        ${v.politique_retour ? `<span><b>Retours :</b> ${esc(v.politique_retour)}</span>` : ''}${v.instagram ? `<span>Instagram : <a href="https://instagram.com/${esc(v.instagram)}" target="_blank" rel="noopener">@${esc(v.instagram)}</a></span>` : ''}</div>
      <div class="actions-r">${moi && moi.id !== v.id ? `<a class="btn btn-sec btn-s" href="#/messages/${v.id}">💬 Écrire à ${pro ? 'la boutique' : 'ce vendeur'}</a>` : ''}<a class="btn btn-sec btn-s" href="#/atelier?v=${v.id}">🧵 Demande sur mesure</a><button class="btn btn-sec btn-s" data-x="partager">🔗 Partager</button></div>
      ${moi ? `<details class="plus-options"><summary>Signaler cette boutique</summary><form class="f" data-form="signaler" data-type="boutique" data-id="${v.id}"><label>Motif<select name="motif">${TK.MOTIFS_SIG.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
        <label>Précisions<textarea name="details" maxlength="1000"></textarea></label><button class="btn btn-sec">Envoyer le signalement</button></form></details>` : ''}</section>
      ${v.vedettes.length ? `<section class="sect-s"><h2>Coups de cœur</h2>${rail(v.vedettes)}</section>` : ''}
      ${v.collections.length ? `<section class="sect-s"><h2>Collections</h2><div class="rail-h">${v.collections.map(c => `<a class="coll-c" href="#/collection/${c.id}"${fond(c.image)}><b>${esc(c.titre)}</b><span>${pluriel(c.nb, 'article', 'articles')}${c.fin ? ' · jusqu’au ' + esc(jourLong(c.fin)) : ''}</span></a>`).join('')}</div></section>` : ''}
      <section class="sect-s"><h2>${pluriel(r.total, 'article en vente', 'articles en vente')}</h2>${r.total > 1 ? `<p><a class="btn btn-sec btn-filtres" href="#/recherche?vendeur=${v.id}">Filtrer et trier ces articles</a></p>` : ''}${r.total ? grille(r.produits) : '<div class="vide-etat"><span class="ico" aria-hidden="true">🛍️</span><h3>Rien en vente pour l’instant</h3><p>Cette boutique n’a pas encore publié d’article.</p></div>'}</section></div>`);
    TK.apresVue && TK.apresVue('boutique');
  });
  const pageCollection = ouverte(async (i, id) => {
    const c = await rpc('tk_collection_fiche', { c: id });
    if (!c) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Collection introuvable ou terminée</h3><a class="btn btn-p" href="#/">Accueil</a></div></div>');
    vue(`<div class="wrap tk"><section class="hero-s" style="min-height:240px"><div class="hs on" style="position:relative;min-height:240px"><span class="fond"${c.image ? fond(c.image) : ''}></span><span class="etiq">${c.fin ? 'Édition limitée' : 'Collection'}</span><h1>${esc(c.titre)}</h1><p>${esc(c.description || '')} Par <a href="#/boutique/${c.vendeur_id}" style="color:#fff">${esc(c.vendeur_nom)}</a>${c.fin ? ' · jusqu’au ' + esc(jourLong(c.fin)) : ''}.</p></div></section>${c.produits.length ? grille(c.produits) : '<div class="vide-etat"><h3>Plus d’article disponible</h3></div>'}</div>`);
    TK.apresVue && TK.apresVue('collection');
  });

  // ---------------------------------------------------------------- actions
  const majHash = (mut) => { const p = param(); mut(p); const h = hashDe(p); if (location.hash === h) rendre(); else location.hash = h; };
  const jourHeureL = d => jourHeure(d);
  const calcPerso = async () => {
    const p = FX.p; const ch = Object.values(FX.opts).map(o => ({ option: o.id, texte: o.texte || null }));
    document.querySelectorAll('#pPerso [data-x="opt"]').forEach(b => b.setAttribute('aria-pressed', String(!!FX.opts[b.dataset.g] && FX.opts[b.dataset.g].id === b.dataset.o)));
    document.querySelectorAll('#pPerso [data-x-optx]').forEach(i => { const o = FX.opts[i.dataset.xOptx], def = o && p.options.find(x => x.id === o.id); i.hidden = !(def && def.texte_libre); });
    const col = Object.values(FX.opts).map(o => p.options.find(x => x.id === o.id)).find(o => o && o.couleur); $('#persoT').style.background = col ? col.couleur : 'transparent';
    const tx = Object.values(FX.opts).find(o => o.texte); $('#persoTxt').textContent = tx ? tx.texte : '';
    if (!ch.length) { $('#persoPrix').textContent = eur(p.prix); return; }
    try { const r = await rpc('tk_perso_prix', { p: p.id, choix: ch }); $('#persoPrix').textContent = eur(r.total); } catch (e) { $('#persoPrix').textContent = erreur(e); }
  };
  const X = {
    filtres(b) { filtresOuverts = !filtresOuverts; const f = $('#fFiltres'); f.classList.toggle('ouvert', filtresOuverts); $('#voileF').hidden = !filtresOuverts; document.querySelectorAll('.btn-filtres').forEach(x => x.setAttribute('aria-expanded', String(filtresOuverts))); },
    effacer() { const p = param(); vers('', p.q ? { q: p.q } : {}); },
    retire(b) { const p = param(), k = b.dataset.k; if (LISTES.includes(k)) p[k] = (p[k] || '').split('|').filter(x => x && x !== b.dataset.v).join('|'); else delete p[k]; vers('', p); },
    'mode-un'(b) { majHash(p => { if (b.dataset.v) p.mode = b.dataset.v; else delete p.mode; }); },
    async plus(b) {
      const p = filtresDe(param()), n = Number(b.dataset.n), total = Number(b.dataset.total);
      await occupe(b, async () => { const r = await rpc('tk_catalogue', { f: { ...p, limite: 24, decalage: n } }); $('#resultats .prod-g').insertAdjacentHTML('beforeend', r.produits.map(carte).join('')); b.dataset.n = n + r.produits.length; if (n + r.produits.length >= total) b.remove(); TK.apresVue && TK.apresVue('plus'); }).catch(e => toast(erreur(e), true));
    },
    async sauver() {
      if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash));
      const p = param(), nom = (p.q || (p.rayon || 'Ma recherche')).slice(0, 50);
      try { await rpc('tk_recherche_sauver', { nom_r: nom, f: filtresDe(p), alerte_r: true }); toast('Recherche enregistrée : vous serez prévenu des nouveautés.'); } catch (e) { toast(erreur(e), true); }
    },
    img(b) { FX.k = Number(b.dataset.k); FX.vue = 'photo'; zoneG(); document.querySelectorAll('#vignG button').forEach(x => x.setAttribute('aria-current', String(x === b))); document.querySelectorAll('.tabs-m button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === 'photo'))); },
    zoom(b) { b.classList.toggle('zoom'); if (b.classList.contains('zoom')) { b.style.backgroundSize = '240%'; } else b.style.backgroundSize = ''; },
    vue(b) { FX.vue = b.dataset.v; document.querySelectorAll('.tabs-m button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); zoneG(); },
    coul(b) { FX.sel = { couleur: b.dataset.c, variante: null }; rendreChoix(); if (FX.p.mode === 'location') calendrier(); },
    taille(b) { FX.sel.variante = b.dataset.v; rendreChoix(); if (FX.p.mode === 'location') calendrier(); },
    ajouter() {
      if (!FX.sel.variante) { toast('Choisissez une taille.', true); return; }
      const p = FX.p, va = p.variantes.find(x => x.id === FX.sel.variante), l = lirePanier(), x = l.find(y => y.v === FX.sel.variante);
      if ((x ? x.q : 0) + 1 > Math.min(10, va.stock)) { toast('Stock limité : vous avez déjà tout le stock dans votre panier.', true); return; }
      if (x) x.q++; else l.push({ v: FX.sel.variante, q: 1 });
      ecrirePanier(l); toast('Ajouté au panier.'); TK.bump && TK.bump('#bas a[href="#/panier"]');
      const b = $('#ajout'); if (b && !$('#versPanier')) b.insertAdjacentHTML('afterend', '<a class="btn btn-sec" id="versPanier" href="#/panier">Voir le panier</a>');
    },
    opt(b) { const g = b.dataset.g, o = FX.opts[g]; if (o && o.id === b.dataset.o) delete FX.opts[g]; else FX.opts[g] = { id: b.dataset.o, texte: '' }; calcPerso(); },
    async 'perso-cmd'() {
      if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash));
      if (!FX.sel.variante) { toast('Choisissez d’abord la taille et la couleur.', true); return; }
      const ch = Object.values(FX.opts).map(o => ({ option: o.id, texte: o.texte || null })); if (!ch.length) { toast('Choisissez au moins une option.', true); return; }
      sessionStorage.setItem('tk-perso', JSON.stringify({ variante: FX.sel.variante, choix: ch, produit: FX.p.id })); aller('#/commander-sur-mesure');
    },
    'r360'() {},
    cal(b) { const m = FX.loc.mois; FX.loc.mois = new Date(m.getFullYear(), m.getMonth() + Number(b.dataset.d), 1); calendrier(); },
    jour(b) { const d = b.dataset.d, L = FX.loc; if (!L.d1 || L.d2) { L.d1 = d; L.d2 = null; } else if (d < L.d1) { L.d1 = d; } else { const a = new Date(L.d1 + 'T12:00:00'), z = new Date(d + 'T12:00:00'); let ok = true; for (let t = new Date(a); t <= z; t.setDate(t.getDate() + 1)) if (!libre(iso(t))) ok = false; if (!ok) { toast('Une date entre les deux est déjà prise.', true); return; } L.d2 = d; } calendrier(); },
    async suivi(b) { if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash)); try { const a = await rpc('tk_suivi_basculer', { p: b.dataset.id }); b.setAttribute('aria-pressed', String(a)); b.textContent = a ? '🔔 Prix suivi' : '🔔 Suivre le prix'; toast(a ? 'Vous serez prévenu à chaque baisse de prix.' : 'Suivi du prix arrêté.'); } catch (e) { toast(erreur(e), true); } },
    async partager() { try { if (navigator.share) await navigator.share({ title: document.title, url: location.href }); else { await navigator.clipboard.writeText(location.href); toast('Lien copié.'); } } catch (e) { /* annulé */ } }
  };
  const vers = TK.vers;
  document.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (b && X[b.dataset.x]) { if (b.tagName !== 'INPUT') e.preventDefault(); X[b.dataset.x](b, e); } });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-x="zoom"]')) { e.preventDefault(); X.zoom(e.target); } });
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches('[data-xf]')) { const p = param(), k = t.dataset.xf, l = (p[k] || '').split('|').filter(Boolean); p[k] = (t.checked ? [...l, t.value] : l.filter(x => x !== t.value)).join('|'); vers('', p); }
    else if (t.matches('[data-xfu]')) { const p = param(); p[t.dataset.xfu] = t.value; if (t.dataset.xfu === 'tri' && t.value === 'pertinence') delete p.tri; if (t.dataset.xfu === 'rayon') { delete p.taille; delete p.pointure; } vers('', p); }
    else if (t.matches('[data-xfb]')) { const p = param(); p[t.dataset.xfb] = t.checked ? '1' : ''; vers('', p); }
  });
  document.addEventListener('input', e => {
    const t = e.target;
    if (t.matches('[data-x-optx]')) { const o = FX.opts[t.dataset.xOptx]; if (o) { o.texte = t.value; clearTimeout(X.tm); X.tm = setTimeout(calcPerso, 250); $('#persoTxt').textContent = t.value; } }
  });
  document.addEventListener('submit', async e => {
    const f = e.target, k = f.dataset.xform; if (!k) return; e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), btn = e.submitter;
    try {
      if (btn) btn.disabled = true;
      if (k === 'newsletter') { await rpc('tk_newsletter_inscrire', { email_n: d.email }); f.innerHTML = '<p style="margin:0"><b>Merci !</b> Vous êtes inscrit(e).</p>'; }
      else if (k === 'offre') {
        if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash));
        const r = await rpc('tk_enchere_offrir', { e: FX.p.enchere_vue.id, montant_o: Number(d.montant), nom_o: d.nom, tel_o: d.tel }); toast('Offre enregistrée !'); rendreEnchere(r); TK.bump && TK.bump('#prixEnc');
      } else if (k === 'louer') {
        if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash));
        if (!FX.sel.variante) throw new Error('Choisissez d’abord la taille et la couleur.'); if (!FX.loc.d1) throw new Error('Choisissez vos dates.');
        const r = await rpc('tk_location_demander', { va: FX.sel.variante, debut_l: FX.loc.d1, fin_l: FX.loc.d2 || FX.loc.d1, nom_l: d.nom, tel_l: d.tel, note_l: d.note || null });
        toast(`Demande envoyée : ${eur(r.total)} + caution ${eur(r.caution)}.`); aller('#/locations?ok=1');
      }
    } catch (err) { toast(erreur(err), true); } finally { if (btn && btn.isConnected) btn.disabled = false; }
  });
  // rafraîchit l'enchère affichée (offres des autres) toutes les 8 secondes
  TK.rafraichirEnchere = async () => {
    if (!FX.p || FX.p.mode !== 'enchere' || !$('#pEnc') || document.hidden || document.activeElement && document.activeElement.closest && document.activeElement.closest('#pEnc form')) return;
    try { const e = (await rpc('tk_fiche', { p: FX.p.id })).enchere_vue; if (e && FX.enc && (e.courant !== FX.enc.courant || e.phase !== FX.enc.phase || e.fin !== FX.enc.fin)) { rendreEnchere(e); TK.bump && TK.bump('#prixEnc'); } } catch (x) { /* réessaie au prochain tour */ }
  };
  TK.FX = FX; TK.calcPerso = calcPerso; TK.filtresDe = filtresDe;
  Object.assign(APP.pages, { '': accueil, rayons: pageRayons, recherche: pageRecherche, p: pageFiche, boutique: pageBoutique, collection: pageCollection });
})();
