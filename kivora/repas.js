/* Kivora, partie « Manger » : restaurants, livraison, à emporter. APP et accueil : app.js ; base commune : commun/base.js.
   Prix, totaux et étapes de commande contrôlés par la base (kivora.sql). */
'use strict';
const CUISINES = { creole: ['🍛', 'Créole'], snack: ['🌯', 'Snack'], burger: ['🍔', 'Burgers'], pizza: ['🍕', 'Pizzas'], asiatique: ['🥡', 'Asiatique'], sushi: ['🍣', 'Sushis'],
  grillades: ['🍖', 'Grillades'], poisson: ['🐟', 'Poissons'], vegetarien: ['🥗', 'Végétarien'], boulangerie: ['🥖', 'Boulangerie'], dessert: ['🍨', 'Desserts'], traiteur: ['🍱', 'Traiteur'], autre: ['🍽️', 'Autre'] };
const CATS_PLAT = { menu: '🍱 Menus', entree: '🥗 Entrées', plat: '🍛 Plats', accompagnement: '🍚 Accompagnements', dessert: '🍰 Desserts', boisson: '🥤 Boissons' };
const ETAPES = [['envoyee', '📨', 'Envoyée'], ['acceptee', '👍', 'Acceptée'], ['en_preparation', '👩‍🍳', 'En cuisine'], ['prete', '🛍️', 'Prête'], ['en_livraison', '🛵', 'En route'], ['livree', '🎉', 'Livrée']];
const ST_CMD = { envoyee: ['att', 'Envoyée'], acceptee: ['ok', 'Acceptée'], refusee: ['ko', 'Refusée'], en_preparation: ['ok', 'En cuisine'], prete: ['ok', 'Prête'], en_livraison: ['ok', 'En route'],
  livree: ['gris', 'Livrée'], retiree: ['gris', 'Retirée'], annulee: ['ko', 'Annulée'] };
const ST_RESTO = { brouillon: ['gris', 'Brouillon'], en_attente: ['att', 'En validation'], publie: ['ok', 'En ligne'], refuse: ['ko', 'Refusé'], pause: ['gris', 'En pause'] };
let suivi = null;   // minuterie de rafraîchissement (suivi de commande, tableau du restaurateur)

// panier : gardé sur l'appareil, un par restaurant
const panier = { lire: r => { try { return JSON.parse(localStorage.getItem('kvPanier-' + r)) || {}; } catch (e) { return {}; } }, ecrire: (r, p) => { try { localStorage.setItem('kvPanier-' + r, JSON.stringify(p)); } catch (e) { /* stockage indisponible */ } } };


// ---------------------------------------------------------------- accueil : restaurants
APP.pages.manger = async () => {
  const p = param(), terr = p.territoire ?? terrPrefere();
  vue(`<section class="hero"><div class="wrap">
    <div class="press"><span class="clignote">🍽️</span> On mange quoi ce soir ?</div>
    <h1>Les bons petits plats d’ici, <em>livrés ou à emporter</em>.</h1>
    <p>Restaurants, snacks, traiteurs et boulangeries de votre île : commandez en quelques clics, suivez votre commande en direct, payez à la livraison ou au comptoir.</p>
    <form class="recherche" id="fRech"><input name="q" placeholder="Restaurant, plat, quartier…" value="${esc(p.q || '')}" aria-label="Recherche">
      <select name="territoire" aria-label="Territoire">${optsTerritoires(terr, 'Tous les territoires')}</select>
      <select name="mode" aria-label="Mode"><option value="">Livraison ou à emporter</option><option value="livraison" ${p.mode === 'livraison' ? 'selected' : ''}>🛵 Livraison</option><option value="emporter" ${p.mode === 'emporter' ? 'selected' : ''}>🛍️ À emporter</option></select>
      <button class="btn btn-p">Rechercher</button></form></div></section>
    <div class="wrap"><div class="puces">${[['', '✨', 'Tout'], ...Object.entries(CUISINES).map(([k, [i, t]]) => [k, i, t])].map(([k, i, t]) => `<a href="#/manger?${new URLSearchParams({ ...p, cuisine: k })}" class="${(p.cuisine || '') === k ? 'on' : ''}">${i} ${esc(t)}</a>`).join('')}</div>
      <section class="section"><div id="liste" class="chargement">Chargement…</div></section>
      <section class="section"><div class="vide-etat appel-pro">
        <div><h2>Vous avez un restaurant ?</h2><p class="muted" style="margin:0">Inscription gratuite pour démarrer : votre carte en ligne, les commandes en direct sur votre téléphone, vos clients vous paient directement.</p></div>
        <a class="btn btn-p" href="#/pro">Inscrire mon restaurant</a></div></section></div>`);
  $('#fRech').addEventListener('submit', e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); terrPrefere(d.territoire); const u = new URLSearchParams(); Object.entries({ ...d, cuisine: p.cuisine || '' }).forEach(([k, v]) => (v || k === 'territoire') && u.set(k, v)); aller('#/manger?' + u); });
  let r = sb.from('restaurants').select('*').in('statut', ['publie', 'pause']).order('ouvert', { ascending: false }).order('created_at', { ascending: false }).limit(80);
  if (terr) r = r.eq('territoire', terr);
  if (p.cuisine) r = r.eq('cuisine', p.cuisine);
  if (p.mode) r = r.eq(p.mode, true);
  let l = await q(r);
  if (p.q) { const m = p.q.toLowerCase(); l = l.filter(x => (x.nom + ' ' + x.description + ' ' + x.commune).toLowerCase().includes(m)); }
  const notes = l.length ? Object.fromEntries((await q(sb.from('notes_resto').select('*').in('restaurant_id', l.map(x => x.id)))).map(x => [x.restaurant_id, x])) : {};
  $('#liste').className = l.length ? 'grille' : '';
  $('#liste').innerHTML = l.length ? l.map(x => carteResto(x, notes[x.id])).join('') : `<div class="vide-etat"><div class="ico">🍽️</div><h3>${p.q || p.cuisine || p.mode ? 'Aucun restaurant pour cette recherche' : 'Les premiers restaurants arrivent'}</h3>
    <p class="muted">Nous vérifions chaque restaurant avant sa mise en ligne. Vous êtes restaurateur ? Rejoignez Kivora gratuitement.</p><a class="btn btn-p" href="#/pro">Inscrire mon restaurant</a></div>`;
};
const carteResto = (x, n) => `<a class="ev" href="#/resto/${x.id}"><div class="aff" style="aspect-ratio:16/10">${x.photo ? `<img src="${esc(photo(x.photo))}" alt="${esc(x.nom)}" loading="lazy">` : `<span class="vide">${CUISINES[x.cuisine]?.[0] || '🍽️'}</span>`}
  <span class="date" style="transform:none"><small>${x.ouvert ? '🟢 Ouvert' : '⚪ Fermé'}</small></span></div>
  <div class="corps"><span class="tag">${CUISINES[x.cuisine]?.[0] || ''} ${esc(CUISINES[x.cuisine]?.[1] || '')}</span>${n ? ` <span class="tag">⭐ ${n.moyenne} (${n.nombre})</span>` : ''}
    <h3>${esc(x.nom)}</h3><div class="muted petit">📍 ${esc(x.commune)} · ⏱️ ${x.delai_min} min${x.livraison ? ` · 🛵 ${x.frais_livraison > 0 ? eur(x.frais_livraison) : 'livraison offerte'}` : ''}${x.emporter ? ' · 🛍️ à emporter' : ''}</div></div></a>`;

// ---------------------------------------------------------------- restaurant : carte et panier
APP.pages.resto = async id => {
  attente();
  const r = await q(sb.from('restaurants').select('*').eq('id', id).maybeSingle());
  if (!r) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Restaurant introuvable</h3><a href="#/manger">Tous les restaurants</a></div>');
  const [plats, n] = await Promise.all([q(sb.from('plats').select('*').eq('restaurant_id', id).order('ordre').order('created_at')), q(sb.from('notes_resto').select('*').eq('restaurant_id', id))]);
  let cart = panier.lire(id); Object.keys(cart).forEach(k => { if (!plats.some(p => p.id === k && p.dispo)) delete cart[k]; });
  let mode = r.livraison ? 'livraison' : 'emporter';
  const parCat = Object.keys(CATS_PLAT).map(c => [c, plats.filter(p => p.categorie === c)]).filter(([, l]) => l.length);
  document.title = `${r.nom} — Kivora`;
  vue(`<div class="wrap"><div class="fiche fiche-d">
    <div><div class="affiche" style="aspect-ratio:16/7;transform:none">${r.photo ? `<img src="${esc(photo(r.photo))}" alt="${esc(r.nom)}">` : `<span style="position:absolute;inset:0;display:grid;place-items:center;font-size:80px">${CUISINES[r.cuisine]?.[0]}</span>`}</div>
      <h1 style="margin-top:18px">${esc(r.nom)}</h1>
      <div class="actions" style="margin-bottom:10px">${r.ouvert ? tag(['ok', '🟢 Prend les commandes']) : tag(['gris', '⚪ Fermé pour le moment'])}<span class="tag">${CUISINES[r.cuisine]?.[0]} ${esc(CUISINES[r.cuisine]?.[1])}</span>${n[0] ? `<span class="tag">⭐ ${n[0].moyenne} · ${n[0].nombre} avis</span>` : ''}<span class="tag">⏱️ ${r.delai_min} min</span></div>
      <p class="muted">📍 ${esc(r.commune)}${r.adresse ? ', ' + esc(r.adresse) : ''}${r.horaires ? ` · 🕒 ${esc(r.horaires)}` : ''}</p>
      ${r.description ? `<p style="white-space:pre-line">${esc(r.description)}</p>` : ''}
      ${parCat.length ? parCat.map(([c, l]) => `<h2 style="margin-top:22px">${CATS_PLAT[c]}</h2><div class="types">${l.map(p => `<div class="type" style="${p.dispo ? '' : 'opacity:.5'}">
        <div style="display:flex;gap:12px;align-items:center">${p.photo ? `<img src="${esc(photo(p.photo))}" alt="" style="width:64px;height:64px;border-radius:14px;object-fit:cover">` : ''}<div><b>${esc(p.nom)}</b>${p.description ? `<div class="muted petit">${esc(p.description)}</div>` : ''}<span class="prix">${eur(p.prix)}</span>${p.dispo ? '' : ' <span class="tag gris">Épuisé</span>'}</div></div>
        ${p.dispo && r.ouvert ? `<div class="qte" data-plat="${p.id}"><button type="button" data-d="-1" aria-label="Moins">−</button><output>${cart[p.id] || 0}</output><button type="button" data-d="1" aria-label="Plus">+</button></div>` : ''}</div>`).join('')}</div>`).join('')
        : '<div class="vide-etat"><p>La carte arrive bientôt.</p></div>'}
    </div>
    <aside><div class="panier colle" id="panier"><h2 style="margin:0">🧺 Mon panier</h2><div id="lignes"></div>
      ${r.livraison && r.emporter ? `<div class="actions"><button type="button" class="btn btn-s" data-mode="livraison">🛵 Livraison</button><button type="button" class="btn btn-s" data-mode="emporter">🛍️ À emporter</button></div>` : `<p class="petit muted">${r.livraison ? '🛵 Livraison uniquement' : '🛍️ À emporter uniquement'}</p>`}
      <form class="f" id="fCmd"><div id="adresse"></div>
        <label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
        <label>Un mot pour le restaurant <span class="aide">(facultatif)</span><input name="note" maxlength="500" placeholder="Sans piment, code du portail…"></label>
        <div id="totaux"></div><button class="btn btn-p" id="commander" ${r.ouvert ? '' : 'disabled'}>${r.ouvert ? 'Commander' : 'Restaurant fermé'}</button>
        <p class="muted petit" style="margin:0">Paiement au restaurant ou au livreur (espèces ou carte, selon le restaurant).</p></form></div></aside></div></div>`);
  const majAdresse = () => {
    $('#adresse').innerHTML = mode === 'livraison' ? `<label>Adresse de livraison<input name="adresse" required maxlength="300" autocomplete="street-address"></label>
      <label>Ville<input name="commune" required maxlength="60" list="villesK" value="${esc(r.communes_livrees.length === 1 ? r.communes_livrees[0] : r.commune)}"></label>
      <datalist id="villesK">${(r.communes_livrees.length ? r.communes_livrees : TERRITOIRES[r.territoire]?.villes || []).map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      ${r.communes_livrees.length ? `<p class="petit muted" style="margin:0">Livre à : ${esc(r.communes_livrees.join(', '))}</p>` : ''}` : `<p class="petit">🛍️ À récupérer : <b>${esc(r.adresse || r.commune)}</b></p>`;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('btn-p', b.dataset.mode === mode));
  };
  const majPanier = () => {
    const l = Object.entries(cart).filter(([, n]) => n > 0).map(([id, n]) => ({ p: plats.find(x => x.id === id), n })).filter(x => x.p);
    const st = l.reduce((s, x) => s + x.p.prix * x.n, 0), frais = mode === 'livraison' ? Number(r.frais_livraison) : 0;
    $('#lignes').innerHTML = l.length ? l.map(x => `<div style="display:flex;justify-content:space-between;gap:8px"><span>${x.n} × ${esc(x.p.nom)}</span><b>${eur(x.p.prix * x.n)}</b></div>`).join('') : '<p class="muted">Ajoutez des plats avec le bouton +.</p>';
    $('#totaux').innerHTML = l.length ? `<div class="muted petit">Sous-total ${eur(st)}${mode === 'livraison' ? ` · livraison ${frais ? eur(frais) : 'offerte'}` : ''}</div><div style="font:700 24px var(--titres)">Total ${eur(st + frais)}</div>
      ${st < r.minimum ? `<p class="petit" style="color:var(--rouge);margin:0">Minimum de commande : ${eur(r.minimum)}</p>` : ''}` : '';
    panier.ecrire(id, cart);
  };
  document.querySelectorAll('.qte').forEach(qt => qt.addEventListener('click', ev => {
    const b = ev.target.closest('[data-d]'); if (!b) return;
    const k = qt.dataset.plat; cart[k] = Math.max(0, Math.min(20, (cart[k] || 0) + Number(b.dataset.d))); qt.querySelector('output').textContent = cart[k]; majPanier();
  }));
  document.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; majAdresse(); majPanier(); }));
  majAdresse(); majPanier();
  $('#fCmd').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!exigeCompte()) return;
    const d = Object.fromEntries(new FormData(ev.target)), lignes = Object.entries(cart).filter(([, n]) => n > 0).map(([plat, quantite]) => ({ plat, quantite }));
    if (!lignes.length) return toast('Votre panier est vide.', true);
    const b = $('#commander'); b.disabled = true;
    try {
      // position de l'adresse pour guider le livreur (facultative : la commande part même si la recherche échoue)
      const pos = mode === 'livraison' ? (await geocoder(`${d.adresse}, ${d.commune}`, r.territoire).catch(() => []))[0] : null;
      const c = await q(sb.rpc('passer_commande', { resto: id, mode_cmd: mode, lignes, adresse_cmd: d.adresse || null, commune_cmd: d.commune || null, telephone_cmd: d.telephone.trim(), note_cmd: d.note || null,
        lat_cmd: pos?.lat ?? null, lng_cmd: pos?.lng ?? null }));
      cart = {}; panier.ecrire(id, cart); toast('🎉 Commande envoyée !'); aller('#/suivi/' + c.id);
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
};

// ---------------------------------------------------------------- suivi et historique (client)
APP.pages.suivi = async id => {
  if (!exigeCompte()) return;
  let L = null;
  const dessiner = async () => {
    const c = await q(sb.from('commandes').select('*, restaurants(nom, telephone, adresse, commune), commande_lignes(nom, prix, quantite)').eq('id', id).maybeSingle());
    if (!c) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Commande introuvable</h3></div>');
    const lv = c.mode === 'livraison' ? await q(sb.rpc('suivi_livraison', { cmd: id })).catch(() => null) : null;
    const lvActive = lv && ['acceptee', 'au_restaurant', 'recuperee'].includes(lv.statut);
    const etapes = ETAPES.filter(e => c.mode === 'livraison' || !['en_livraison'].includes(e[0])).map(e => e[0] === 'livree' && c.mode === 'emporter' ? ['retiree', '🎉', 'Retirée'] : e);
    const pos = etapes.findIndex(e => e[0] === c.statut), fini = ['refusee', 'annulee'].includes(c.statut);
    const avis = ['livree', 'retiree'].includes(c.statut) ? await q(sb.from('avis_resto').select('id').eq('commande_id', id)) : [];
    vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><a href="#/commandes" class="petit">← Mes commandes</a>
      <div class="panneau" style="margin-top:10px"><span class="px">Commande ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(jourHeure(c.created_at))}</span><h1 style="margin:6px 0">${esc(c.restaurants?.nom || '')}</h1>
        ${fini ? `<div class="verdict ko"><big>${c.statut === 'refusee' ? '😕' : '❌'}</big>Commande ${c.statut === 'refusee' ? 'refusée par le restaurant' : 'annulée'}</div>`
          : `<div class="quetes" style="margin:14px 0">${etapes.map((e, i) => `<div class="quete ${i < pos || c.statut === e[0] && ['livree', 'retiree'].includes(e[0]) ? 'faite' : i === pos ? 'actuelle' : ''}"><span class="q-coche">${i <= pos ? '✓' : ''}</span><span class="q-ico">${e[1]}</span><span class="q-titre">${e[2]}</span></div>`).join('')}</div>`}
        <div>${c.commande_lignes.map(l => `<div style="display:flex;justify-content:space-between"><span>${l.quantite} × ${esc(l.nom)}</span><b>${eur(l.prix * l.quantite)}</b></div>`).join('')}
          ${c.frais > 0 ? `<div class="muted" style="display:flex;justify-content:space-between"><span>Livraison</span><span>${eur(c.frais)}</span></div>` : ''}<div style="font:700 22px var(--titres);margin-top:6px">Total ${eur(c.total)}</div>
          <p class="muted petit">${c.mode === 'livraison' ? `🛵 Livraison : ${esc(c.adresse)}, ${esc(c.commune)}` : `🛍️ À retirer : ${esc(c.restaurants?.adresse || c.restaurants?.commune || '')}`} · ${lv ? `paiement au livreur à la livraison (${eur(c.total)})` : 'paiement sur place'}</p></div>
        ${lv && !fini && lv.statut !== 'livree' ? `<div class="panneau" style="margin:12px 0;padding:14px;border-color:var(--ciel)">
          ${lv.livreur ? `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b>🛵 ${esc(lv.livreur.prenom || 'Votre livreur')}</b> · ${esc(lv.livreur.vehicule)}${lv.livreur.couleur ? ' ' + esc(lv.livreur.couleur) : ''}
              <div class="muted petit">${{ acceptee: 'part chercher votre commande', au_restaurant: 'est au restaurant', recuperee: 'est en route vers vous' }[lv.statut] || ''}${lvActive && lv.livreur.lat == null ? ' · position pas encore partagée' : ''}</div></div>
              ${lv.livreur.telephone ? `<a class="btn btn-s" href="tel:${esc(lv.livreur.telephone)}">📞 Appeler</a>` : ''}</div>`
            : '<b>🔎 Nous cherchons un livreur près du restaurant…</b>'}
          ${lv.code ? `<div style="margin-top:10px;display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span class="petit">Code à donner au livreur à la remise :</span><b class="code-remise">${esc(lv.code)}</b></div>` : ''}
          <div id="carteLv" style="height:260px;border-radius:18px;margin-top:12px;background:var(--rose-doux)"></div></div>` : ''}
        <div class="actions">${c.restaurants?.telephone ? `<a class="btn btn-s btn-wa" href="${wa(c.restaurants.telephone, 'Bonjour, à propos de ma commande ' + c.id.slice(0, 6).toUpperCase() + ' sur Kivora.')}" target="_blank" rel="noopener">WhatsApp au restaurant</a>` : ''}
          ${c.statut === 'envoyee' ? '<button class="btn btn-s btn-ko" id="annuler">Annuler</button>' : ''}</div></div>
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
  clearInterval(suivi); suivi = setInterval(() => { if (location.hash.startsWith('#/suivi/') && !document.hidden) dessiner().catch(() => {}); }, 10000);
};
APP.pages.commandes = async () => {
  if (!exigeCompte()) return;
  const l = await q(sb.from('commandes').select('*, restaurants(nom, photo)').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(50));
  vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><h1>Mes commandes</h1>
    ${l.length ? l.map(c => `<a class="ligne-l" style="text-decoration:none;color:inherit" href="#/suivi/${c.id}">${c.restaurants?.photo ? `<img class="mini" src="${esc(photo(c.restaurants.photo))}" alt="">` : '<div class="mini" style="display:grid;place-items:center;font-size:30px">🍽️</div>'}
      <div><b>${esc(c.restaurants?.nom || '')}</b> ${tag(ST_CMD[c.statut])}<div class="muted petit">${esc(jourHeure(c.created_at))} · ${eur(c.total)} · ${c.mode === 'livraison' ? '🛵' : '🛍️'}</div></div><span>›</span></a>`).join('')
      : '<div class="vide-etat"><div class="ico">🧾</div><h3>Aucune commande pour l’instant</h3><a class="btn btn-p" href="#/manger">Choisir un restaurant</a></div>'}</div>`);
};

// ---------------------------------------------------------------- espace restaurateur
APP.pages.pro = async (sous, id) => {
  if (!exigeCompte()) return;
  if (sous === 'resto') return formResto(id === 'nouveau' ? null : id);
  if (sous === 'menu') return pageMenu(id);
  if (sous === 'commandes') return pageCommandesPro();
  const l = await q(sb.from('restaurants').select('*').eq('owner', moi.id).order('created_at'));
  const dus = l.some(x => x.livreurs_kivora) ? await q(sb.rpc('a_recevoir_livreurs')).catch(() => []) : [];
  vue(`<div class="wrap" style="padding-top:22px">${dus.length ? `<div class="panneau" style="margin-bottom:16px;border-color:var(--jaune)"><h2 style="margin:0 0 8px">💶 À recevoir des livreurs</h2>
      ${dus.map(x => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 0"><span><b>${esc(x.livreur)}</b> · ${x.nb} livraison${x.nb > 1 ? 's' : ''}${x.telephone ? ` · <a href="tel:${esc(x.telephone)}">${esc(x.telephone)}</a>` : ''}</span>
        <span class="actions"><b>${eur(x.montant)}</b><button class="btn btn-s btn-ok" data-recu="${x.livreur_id}" data-montant="${x.montant}">J’ai reçu ${eur(x.montant)}</button></span></div>`).join('')}</div>` : ''}<div class="titre-s"><h1>Espace restaurateur</h1><div class="actions">${l.some(x => x.statut === 'publie') ? '<a class="btn btn-j" href="#/pro/commandes">🧾 Commandes en direct</a>' : ''}${l.length < 3 ? '<a class="btn btn-p" href="#/pro/resto/nouveau">+ Ajouter un restaurant</a>' : ''}</div></div>
    ${l.length ? l.map(x => `<div class="ligne-l">${x.photo ? `<img class="mini" src="${esc(photo(x.photo))}" alt="">` : `<div class="mini" style="display:grid;place-items:center;font-size:30px">${CUISINES[x.cuisine]?.[0]}</div>`}
      <div><b>${esc(x.nom)}</b> ${tag(ST_RESTO[x.statut])}<div class="muted petit">${esc(x.commune)} · ${x.livraison ? '🛵' : ''}${x.emporter ? '🛍️' : ''}</div>${x.statut === 'refuse' && x.motif_refus ? `<div class="petit" style="color:var(--rouge)">Motif : ${esc(x.motif_refus)}</div>` : ''}
        ${x.statut === 'publie' ? `<label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-weight:800"><input type="checkbox" data-ouvert="${x.id}" ${x.ouvert ? 'checked' : ''} style="width:22px;height:22px"> ${x.ouvert ? '🟢 Je prends les commandes' : '⚪ Fermé (cochez pour ouvrir)'}</label>` : ''}</div>
      <div class="actions"><a class="btn btn-s" href="#/pro/menu/${x.id}">🍛 Ma carte</a><a class="btn btn-s" href="#/pro/resto/${x.id}">Modifier</a>
        ${['brouillon', 'refuse'].includes(x.statut) ? `<button class="btn btn-s btn-p" data-envoi="${x.id}">Envoyer en validation</button>` : ''}
        ${x.statut === 'publie' ? `<button class="btn btn-s" data-pause="${x.id}">Pause</button>` : x.statut === 'pause' ? `<button class="btn btn-s btn-ok" data-reprise="${x.id}">Reprendre</button>` : ''}<a class="btn btn-s" href="#/resto/${x.id}">Voir</a></div></div>`).join('')
      : '<div class="vide-etat"><div class="ico">👩‍🍳</div><h3>Inscrivez votre restaurant</h3><p class="muted">Gratuit pour démarrer. Nous le vérifions (SIRET, hygiène) avant sa mise en ligne.</p><a class="btn btn-p" href="#/pro/resto/nouveau">Inscrire mon restaurant</a></div>'}</div>`);
  $('#app').onchange = async ev => { const o = ev.target.closest('[data-ouvert]'); if (!o) return; try { await q(sb.from('restaurants').update({ ouvert: o.checked }).eq('id', o.dataset.ouvert)); toast(o.checked ? '🟢 Vous prenez les commandes' : 'Fermé aux commandes'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); } };
  $('#app').onclick = async ev => {
    const rc = ev.target.closest('[data-recu]');
    if (rc) { if (!confirm(`Confirmer avoir reçu ${eur(rc.dataset.montant)} de ce livreur ?`)) return; try { await q(sb.rpc('confirmer_reversement', { livreur: rc.dataset.recu })); toast('Merci, c’est noté.'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); } return; }
    const b = ev.target.closest('[data-envoi],[data-pause],[data-reprise]'); if (!b) return;
    const [rid, st] = b.dataset.envoi ? [b.dataset.envoi, 'en_attente'] : b.dataset.pause ? [b.dataset.pause, 'pause'] : [b.dataset.reprise, 'publie'];
    try { await q(sb.from('restaurants').update({ statut: st }).eq('id', rid)); toast('C’est fait.'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); }
  };
};
async function formResto(id) {
  const r = id ? await q(sb.from('restaurants').select('*').eq('id', id).single()) : { nom: '', description: '', cuisine: 'creole', territoire: profil?.territoire || terrPrefere() || 'Martinique', commune: profil?.commune || '', adresse: '', telephone: contact?.telephone || '', horaires: '', livraison: true, frais_livraison: 3, minimum: 10, communes_livrees: [], emporter: true, delai_min: 30, photo: null, statut: 'brouillon' };
  let ph = r.photo;
  vue(`<div class="wrap" style="padding:22px 20px;max-width:780px"><a href="#/pro" class="petit">← Espace restaurateur</a><h1>${id ? 'Modifier le restaurant' : 'Inscrire mon restaurant'}</h1>
    <form class="f" id="fR"><div class="ligne2"><label>Nom<input name="nom" required minlength="2" maxlength="80" value="${esc(r.nom)}"></label><label>Cuisine<select name="cuisine">${Object.entries(CUISINES).map(([k, [i, t]]) => `<option value="${k}" ${k === r.cuisine ? 'selected' : ''}>${i} ${esc(t)}</option>`).join('')}</select></label></div>
      <label>Présentation<textarea name="description" maxlength="1500" placeholder="Votre histoire, vos spécialités, vos produits…">${esc(r.description)}</textarea></label>
      <div class="ligne3"><label>Territoire<select name="territoire" data-villes="villesR">${optsTerritoires(r.territoire)}</select></label><label>Ville<input name="commune" required maxlength="60" list="villesR" value="${esc(r.commune)}">${listeVilles('villesR', r.territoire)}</label><label>Adresse<input name="adresse" maxlength="200" value="${esc(r.adresse || '')}"></label></div>
      <div class="ligne2"><label>Téléphone du restaurant<input name="telephone" type="tel" pattern="[0-9 +]{6,20}" value="${esc(r.telephone || '')}"></label><label>Horaires<input name="horaires" maxlength="200" value="${esc(r.horaires || '')}" placeholder="Lun–Sam 11 h–14 h, 18 h–22 h"></label></div>
      <div class="ligne3"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="livraison" ${r.livraison ? 'checked' : ''} style="width:auto"> 🛵 Je livre</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="emporter" ${r.emporter ? 'checked' : ''} style="width:auto"> 🛍️ À emporter</label><label>Délai moyen (min)<input name="delai_min" type="number" min="5" max="240" value="${r.delai_min}"></label></div>
      <div class="ligne3"><label>Frais de livraison (€)<input name="frais_livraison" type="number" min="0" max="100" step="0.5" value="${r.frais_livraison}"></label><label>Commande minimum (€)<input name="minimum" type="number" min="0" max="500" value="${r.minimum}"></label>
        <label>Villes livrées <span class="aide">(virgules ; vide = toutes)</span><input name="villes" maxlength="400" value="${esc(r.communes_livrees.join(', '))}"></label></div>
      <div class="panneau" style="padding:14px"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:800"><input type="checkbox" name="livreurs_kivora" ${r.livreurs_kivora ? 'checked' : ''} style="width:auto;margin-top:4px">
        <span>🛵 Mes livraisons sont faites par les livreurs Kivora<br><span class="aide" style="font-weight:600">Pas de livreur à embaucher : dès que vous acceptez une commande, les livreurs vérifiés les plus proches sont prévenus. Le client paie le livreur à la livraison ;
        les frais de livraison (2 € minimum) reviennent au livreur, qui vous remet le prix du repas. Kivora tient le compte de ce qu’il vous doit, et vous confirmez la réception.</span></span></label></div>
      <div><b>Photo</b><div id="apercu" style="max-width:240px;margin:8px 0"></div><input type="file" id="ph" accept="image/*"></div>
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> Mon activité est déclarée (SIRET) et respecte les règles d’hygiène ; les prix affichés sont les vrais prix.</label>
      <div class="actions"><button class="btn btn-p" value="en_attente">${id && r.statut === 'publie' ? 'Enregistrer' : 'Enregistrer et envoyer en validation'}</button>${!id || r.statut !== 'publie' ? '<button class="btn" value="brouillon">Brouillon</button>' : ''}</div></form></div>`);
  const ap = () => { $('#apercu').innerHTML = ph ? `<img src="${esc(photo(ph))}" alt="" style="border-radius:16px">` : ''; }; ap();
  brancherVilles(document.querySelector('#fR [name=territoire]'), 'villesR');
  $('#ph').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; toast('Envoi de la photo…'); try { ph = await envoyerPhoto(f); ap(); } catch (err) { toast(erreur(err), true); } });
  $('#fR').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, d = Object.fromEntries(new FormData(f)), envoi = ev.submitter?.value || 'en_attente';
    if (!d.livraison && !d.emporter) return toast('Choisissez livraison, à emporter ou les deux.', true);
    if (d.livreurs_kivora && d.livraison && (+d.frais_livraison || 0) < 2) return toast('Avec les livreurs Kivora, les frais de livraison doivent être d’au moins 2 € (ils paient le livreur).', true);
    const l = { nom: d.nom.trim(), cuisine: d.cuisine, description: d.description.trim(), territoire: d.territoire, commune: d.commune.trim(), adresse: d.adresse.trim() || null, telephone: d.telephone.trim() || null,
      horaires: d.horaires.trim() || null, livraison: !!d.livraison, emporter: !!d.emporter, delai_min: +d.delai_min, frais_livraison: +d.frais_livraison || 0, minimum: +d.minimum || 0,
      communes_livrees: d.villes.split(',').map(x => x.trim()).filter(Boolean).slice(0, 40), photo: ph, livreurs_kivora: !!(d.livreurs_kivora && d.livraison) };
    // position du restaurant (pour envoyer les livreurs les plus proches), recalculée si l'adresse change
    if (r.lat == null || l.adresse !== r.adresse || l.commune !== r.commune) {
      const pos = (await geocoder([l.adresse, l.commune].filter(Boolean).join(', '), l.territoire).catch(() => []))[0];
      if (pos) { l.lat = pos.lat; l.lng = pos.lng; }
    }
    if (!(id && r.statut === 'publie')) l.statut = envoi;
    try { if (id) await q(sb.from('restaurants').update(l).eq('id', id)); else { const n = await q(sb.from('restaurants').insert(l).select('id').single()); toast('Restaurant créé : ajoutez votre carte !'); return aller('#/pro/menu/' + n.id); } toast('Enregistré.'); aller('#/pro'); }
    catch (err) { toast(erreur(err), true); }
  });
}
async function pageMenu(rid) {
  const [r, plats] = await Promise.all([q(sb.from('restaurants').select('nom').eq('id', rid).single()), q(sb.from('plats').select('*').eq('restaurant_id', rid).order('ordre').order('created_at'))]);
  vue(`<div class="wrap" style="padding:22px 20px;max-width:860px"><a href="#/pro" class="petit">← Espace restaurateur</a><h1>La carte · ${esc(r.nom)}</h1>
    ${plats.length ? plats.map(p => `<div class="ligne-l">${p.photo ? `<img class="mini" style="height:72px" src="${esc(photo(p.photo))}" alt="">` : `<div class="mini" style="height:72px;display:grid;place-items:center;font-size:28px">${CATS_PLAT[p.categorie].split(' ')[0]}</div>`}
      <div><b>${esc(p.nom)}</b> · <span class="prix">${eur(p.prix)}</span> ${p.dispo ? '' : tag(['gris', 'Épuisé'])}<div class="muted petit">${esc(CATS_PLAT[p.categorie])}${p.description ? ' · ' + esc(p.description) : ''}</div></div>
      <div class="actions"><button class="btn btn-s ${p.dispo ? '' : 'btn-ok'}" data-dispo="${p.id}" data-v="${!p.dispo}">${p.dispo ? 'Épuisé' : 'Disponible'}</button><button class="btn btn-s btn-ko" data-suppr="${p.id}">×</button></div></div>`).join('') : '<p class="muted">Aucun plat pour l’instant.</p>'}
    <form class="f panneau" id="fP" style="margin-top:16px"><h2 style="margin:0">Ajouter un plat</h2>
      <div class="ligne3"><label>Nom<input name="nom" required minlength="2" maxlength="80" placeholder="Colombo de poulet"></label><label>Prix (€)<input name="prix" type="number" min="0.5" max="500" step="0.5" required></label><label>Catégorie<select name="categorie">${Object.entries(CATS_PLAT).map(([k, t]) => `<option value="${k}" ${k === 'plat' ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label>Description <span class="aide">(facultatif)</span><input name="description" maxlength="400" placeholder="Riz, légumes pays, sauce chien"></label>
      <label>Photo <span class="aide">(facultatif)</span><input type="file" name="fichier" accept="image/*"></label><button class="btn btn-p">+ Ajouter à la carte</button></form></div>`);
  $('#fP').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, d = Object.fromEntries(new FormData(f)); const b = f.querySelector('button'); b.disabled = true;
    try { const ph = f.fichier.files[0] ? await envoyerPhoto(f.fichier.files[0]) : null; await q(sb.from('plats').insert({ restaurant_id: rid, nom: d.nom.trim(), prix: +d.prix, categorie: d.categorie, description: d.description.trim() || null, photo: ph, ordre: plats.length })); toast('Plat ajouté.'); pageMenu(rid); }
    catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#app').onclick = async ev => {
    const d = ev.target.closest('[data-dispo]'), s = ev.target.closest('[data-suppr]');
    try {
      if (d) { await q(sb.from('plats').update({ dispo: d.dataset.v === 'true' }).eq('id', d.dataset.dispo)); pageMenu(rid); }
      if (s && confirm('Retirer ce plat de la carte ?')) { await q(sb.from('plats').delete().eq('id', s.dataset.suppr)); pageMenu(rid); }
    } catch (err) { toast(erreur(err), true); }
  };
}
const SUIVANT = { envoyee: [['acceptee', '👍 Accepter', 'btn-ok'], ['refusee', 'Refuser', 'btn-ko']], acceptee: [['en_preparation', '👩‍🍳 En cuisine', 'btn-p'], ['annulee', 'Annuler', 'btn-ko']], en_preparation: [['prete', '✅ Prête', 'btn-ok']],
  prete_livraison: [['en_livraison', '🛵 Partie en livraison', 'btn-p']], prete_emporter: [['retiree', '🛍️ Retirée par le client', 'btn-ok']], en_livraison: [['livree', '🎉 Livrée', 'btn-ok']] };
async function pageCommandesPro() {
  let connues = null;
  const dessiner = async () => {
    const mes = await q(sb.from('restaurants').select('id, nom').eq('owner', moi.id));
    const [l, lvs] = mes.length ? await Promise.all([q(sb.from('commandes').select('*, commande_lignes(nom, quantite, note)').in('restaurant_id', mes.map(x => x.id)).gte('created_at', new Date(Date.now() - 36 * 36e5).toISOString()).order('created_at', { ascending: false })),
      q(sb.rpc('livraisons_resto')).catch(() => [])]) : [[], []];
    const lvDe = c => lvs.find(x => x.commande_id === c.id && !['annulee', 'echec'].includes(x.statut));
    const infoLv = v => !v ? '' : v.livreur ? `<div class="petit" style="margin:6px 0">🛵 <b>${esc(v.livreur)}</b> (${esc(v.vehicule)}) · ${{ acceptee: 'en route vers vous', au_restaurant: 'est au restaurant', recuperee: 'en livraison', livree: 'livrée' }[v.statut] || ''}${v.telephone ? ` · <a href="tel:${esc(v.telephone)}">${esc(v.telephone)}</a>` : ''}</div>`
      : '<div class="petit" style="margin:6px 0">🔎 Recherche d’un livreur Kivora…</div>';
    if (connues && l.some(c => !connues.has(c.id))) { toast('🔔 Nouvelle commande !'); try { navigator.vibrate?.([120, 80, 120]); } catch (e) { /* facultatif */ } }
    connues = new Set(l.map(c => c.id));
    const col = (titre, filtre) => { const x = l.filter(filtre); return `<div><h2>${titre} (${x.length})</h2>${x.map(c => `<div class="panneau" style="margin-bottom:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(c.client_nom)}</b>${tag(ST_CMD[c.statut])}</div>
      <div class="muted petit">${esc(heure(c.created_at))} · ${c.mode === 'livraison' ? `🛵 ${esc(c.adresse)}, ${esc(c.commune)}` : '🛍️ À emporter'} · <a href="${wa(c.telephone, 'Bonjour, ici le restaurant pour votre commande ' + c.id.slice(0, 6).toUpperCase() + ' (Kivora).')}" target="_blank" rel="noopener">${esc(c.telephone)}</a></div>
      <ul style="margin:8px 0;padding-left:18px">${c.commande_lignes.map(x => `<li><b>${x.quantite} ×</b> ${esc(x.nom)}${x.note ? ` <i>(${esc(x.note)})</i>` : ''}</li>`).join('')}</ul>${c.note ? `<p class="petit">📝 ${esc(c.note)}</p>` : ''}${infoLv(lvDe(c))}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>${eur(c.total)}</b><div class="actions">${(lvDe(c) && ['prete', 'en_livraison'].includes(c.statut) ? [] : SUIVANT[c.statut === 'prete' ? 'prete_' + c.mode : c.statut] || []).map(([s, t, cl]) => `<button class="btn btn-s ${cl}" data-cmd="${c.id}" data-st="${s}">${t}</button>`).join('')}</div></div></div>`).join('') || '<p class="muted">—</p>'}</div>`; };
    vue(`<div class="wrap" style="padding-top:22px"><a href="#/pro" class="petit">← Espace restaurateur</a><h1>Commandes en direct</h1><p class="muted">Mise à jour automatique toutes les 10 secondes. Gardez cette page ouverte pendant le service.</p>
      <div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr));align-items:start">${col('🆕 Nouvelles', c => c.statut === 'envoyee')}${col('👩‍🍳 En cours', c => ['acceptee', 'en_preparation', 'prete', 'en_livraison'].includes(c.statut))}${col('✅ Terminées', c => ['livree', 'retiree', 'refusee', 'annulee'].includes(c.statut))}</div></div>`);
  };
  await dessiner();
  $('#app').onclick = async ev => { const b = ev.target.closest('[data-cmd]'); if (!b) return; if (['refusee', 'annulee'].includes(b.dataset.st) && !confirm('Confirmer ?')) return; b.disabled = true; try { await q(sb.rpc('changer_commande', { cmd: b.dataset.cmd, nouveau: b.dataset.st })); await dessiner(); } catch (err) { toast(erreur(err), true); b.disabled = false; } };
  clearInterval(suivi); suivi = setInterval(() => { if (location.hash.startsWith('#/pro/commandes') && !document.hidden) dessiner().catch(() => {}); }, 10000);
}

// ---------------------------------------------------------------- administration
async function adminResto() {
  if (!exigeCompte()) return;
  if (profil?.role !== 'admin') return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  const l = await q(sb.from('restaurants').select('*').eq('statut', 'en_attente').order('created_at'));
  const ct = l.length ? await q(sb.from('contacts').select('*').in('id', [...new Set(l.map(x => x.owner))])) : [];
  vue(`<div class="wrap" style="padding-top:22px">${ongletsAdmin('resto')}<h2>Restaurants à valider (${l.length})</h2>
    ${l.map(x => { const c = ct.find(y => y.id === x.owner); return `<div class="ligne-l">${x.photo ? `<img class="mini" src="${esc(photo(x.photo))}" alt="">` : '<div class="mini"></div>'}<div><b><a href="#/resto/${x.id}">${esc(x.nom)}</a></b> · ${esc(CUISINES[x.cuisine]?.[1])}
      <div class="muted petit">${esc(x.commune)}, ${esc(x.territoire)} · ${esc(c?.email || '')} ${c?.telephone ? '· ' + esc(c.telephone) : ''}</div><div class="petit">${esc(x.description.slice(0, 200))}</div></div>
      <div class="actions"><button class="btn btn-s btn-ok" data-r="${x.id}" data-v="publie">Publier</button><button class="btn btn-s btn-ko" data-r="${x.id}" data-v="refuse">Refuser</button></div></div>`; }).join('') || '<p class="muted">Aucun.</p>'}</div>`);
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-r]'); if (!b) return;
    const motif = b.dataset.v === 'refuse' ? prompt('Motif du refus :', '') : null; if (b.dataset.v === 'refuse' && motif === null) return;
    try { await q(sb.from('restaurants').update({ statut: b.dataset.v, motif_refus: motif }).eq('id', b.dataset.r)); toast('C’est fait.'); adminResto(); } catch (err) { toast(erreur(err), true); }
  };
};

