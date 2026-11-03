/* Woulib Move : VTC, taxis, transferts (chauffeurs professionnels vérifiés) et espace des livreurs. APP et registre : app.js ; base commune : commun/base.js.
   Prix estimé, attribution des courses et étapes contrôlés par la base (move.sql). Paiement direct au chauffeur. */
'use strict';
const CATS = { eco: ['🚗', 'Éco', '4 places'], berline: ['🚘', 'Berline', '4 places, confort'], van: ['🚐', 'Van', '5 à 8 places'], pmr: ['♿', 'Accessible', 'fauteuil roulant'] };
const ETAPES_C = [['demande', '🔎', 'Recherche'], ['acceptee', '👍', 'Acceptée'], ['en_route', '🚗', 'En route'], ['arrivee', '📍', 'Arrivé'], ['a_bord', '🛣️', 'À bord'], ['terminee', '🏁', 'Terminée']];
const ST_COURSE = { demande: ['att', 'Recherche'], acceptee: ['ok', 'Acceptée'], en_route: ['ok', 'En route'], arrivee: ['ok', 'Chauffeur arrivé'], a_bord: ['ok', 'À bord'],
  terminee: ['gris', 'Terminée'], annulee: ['ko', 'Annulée'], expiree: ['gris', 'Expirée'] };
const ST_CH = { demande: ['att', 'En vérification'], valide: ['ok', 'Validé'], refuse: ['ko', 'Refusé'], suspendu: ['ko', 'Suspendu'] };
const ACTIVES = ['acceptee', 'en_route', 'arrivee', 'a_bord'];
// raccourcis aéroports (coordonnées de l'aérogare)
const AEROPORTS = { Martinique: ['Aéroport Aimé Césaire, Le Lamentin', 14.591, -60.9966], Guadeloupe: ['Aéroport Pôle Caraïbes, Les Abymes', 16.2653, -61.5272],
  Guyane: ['Aéroport Félix Éboué, Matoury', 4.8198, -52.3604], 'Saint-Martin': ['Aéroport de Grand-Case', 18.1006, -63.0475], 'Saint-Barthélemy': ['Aéroport Rémy de Haenen, Saint-Jean', 17.9044, -62.8436],
  'La Réunion': ['Aéroport Roland Garros, Sainte-Marie', -20.8871, 55.5103], Mayotte: ['Aéroport de Dzaoudzi-Pamandzi', -12.8047, 45.2811] };
let minuterie = null, suiviGps = null;


// ---------------------------------------------------------------- réserver
declarerUnivers('move', { routes: /^#\/(move|woulib|course|courses|chauffeur|livraison|partage|admin\/woulib|gps)\b/, zone: 'move', accueil: '#/move', appel: 'Réserver un trajet' });

APP.pages.move = async () => {
  await chargerRegistre(); if (!universOuvert('move')) return universFerme('move');
  let terr = terrPrefere() || profil?.territoire || 'Martinique'; if (!TERRITOIRES[terr] || terr === 'Autre pays') terr = 'Martinique';
  const pts = { depart: null, arrivee: null };
  let cat = 'eco', carte = null, calques = null, L = null, estim = {};
  const telConnu = !!contact?.telephone;
  vue(`<div class="wrap page-move"><h1 class="titre-move">🚗 Où allez-vous ?</h1>
    <div class="fiche fiche-d"><div><div id="carte" class="carte-move"></div></div>
      <aside><form class="f panier colle" id="fRes">
        ${['depart', 'arrivee'].map(k => `<div><label>${k === 'depart' ? '🟢 Départ' : '🏁 Arrivée'}<div style="display:flex;gap:6px"><input id="${k}" placeholder="${k === 'depart' ? 'Adresse, lieu, hôtel…' : 'Où allez-vous ?'}" autocomplete="off" maxlength="200" style="flex:1">
          <button type="button" class="btn btn-s" data-chercher="${k}" aria-label="Chercher">🔎</button></div></label><div id="res-${k}" class="petit"></div>
          <div class="puces" style="margin:6px 0 0">${k === 'depart' ? '<a href="#" data-mapos="1">📍 Ma position</a>' : ''}<a href="#" data-aero="${k}">✈️ Aéroport</a><span class="favs puces" data-pour="${k}" style="display:contents"></span></div></div>`).join('')}
        <div class="types" id="cats">${Object.entries(CATS).map(([k, [i, t, d]]) => `<button type="button" class="type" data-cat="${k}" style="text-align:left;cursor:pointer"><span><b>${i} ${t}</b><div class="muted petit">${d}</div></span><span class="prix" id="px-${k}">—</span></button>`).join('')}</div>
        <label>Quand ?<select name="quand"><option value="">Maintenant</option><option value="plus">Plus tard</option></select></label><div id="heure"></div>
        ${telConnu ? '' : `<label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" autocomplete="tel"></label>`}
        <details class="plus-options"><summary>👥 Passagers, bagages, message${telConnu ? ', téléphone' : ''}, territoire</summary>
          <div class="ligne2"><label>Passagers<input name="passagers" type="number" min="1" max="8" value="1"></label><label>Bagages<input name="bagages" type="number" min="0" max="10" value="0"></label></div>
          <label>Un mot pour le chauffeur<input name="note" maxlength="300" placeholder="Siège enfant, n° de vol, portail bleu…"></label>
          ${telConnu ? `<label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact.telephone)}" autocomplete="tel"></label>` : ''}
          <label>Territoire<select name="territoire" id="terr">${optsTerritoires(terr).replace(/<option[^>]*>Autre pays<\/option>/, '')}</select></label></details>
        <div id="total"></div><button class="btn btn-p" id="reserver">Réserver</button>
        <p class="muted petit" style="margin:0">Chauffeurs VTC et taxis vérifiés. Prix estimé selon la distance, réglé directement au chauffeur (péages, longue attente ou détour en plus).</p></form></aside></div></div>`);

  const majTotal = () => {
    Object.keys(CATS).forEach(k => { $('#px-' + k).textContent = estim[k] ? eur(estim[k].prix) : '—'; document.querySelector(`[data-cat="${k}"]`).style.borderColor = k === cat ? 'var(--rose)' : ''; });
    $('#total').innerHTML = estim[cat] ? `<div style="font:700 26px var(--titres)">${eur(estim[cat].prix)} <span class="muted petit" style="font:600 14px var(--texte)">· ${estim[cat].distance_km} km environ</span></div>` : '';
  };
  const estimer = async () => {
    estim = {}; majTotal();
    if (!pts.depart || !pts.arrivee) return;
    await Promise.all(Object.keys(CATS).map(async k => {
      try { const r = await q(sb.rpc('estimer_course', { terr, cat: k, dlat: pts.depart.lat, dlng: pts.depart.lng, alat: pts.arrivee.lat, alng: pts.arrivee.lng })); estim[k] = r[0]; }
      catch (err) { if (k === cat) toast(erreur(err), true); }
    }));
    majTotal();
  };
  const dessinerCarte = () => {
    if (!L) return;
    calques.clearLayers();
    const m = ['depart', 'arrivee'].filter(k => pts[k]).map(k => L.circleMarker([pts[k].lat, pts[k].lng], { radius: 11, color: '#fff', weight: 3, fillColor: k === 'depart' ? '#2BB673' : '#0B2545', fillOpacity: 1 }).bindTooltip(k === 'depart' ? 'Départ' : 'Arrivée').addTo(calques));
    if (pts.depart && pts.arrivee) { L.polyline([[pts.depart.lat, pts.depart.lng], [pts.arrivee.lat, pts.arrivee.lng]], { color: '#2563EB', weight: 4, dashArray: '8 8' }).addTo(calques); carte.fitBounds(L.featureGroup(m).getBounds().pad(0.3)); }
    else if (m.length) carte.setView(m[0].getLatLng(), 14);
    else { const c = CENTRES[terr] || CENTRES.Martinique; carte.setView([c[0], c[1]], c[2]); }
  };
  // adresses favorites (maison, travail…) gardées sur cet appareil
  const lireFav = () => { try { return JSON.parse(localStorage.getItem('kvAdresses')) || []; } catch (e) { return []; } };
  const ecrireFav = l => { try { localStorage.setItem('kvAdresses', JSON.stringify(l.slice(0, 8))); } catch (e) { /* stockage indisponible */ } };
  const majFav = () => { document.querySelectorAll('.favs').forEach(z => { z.innerHTML = lireFav().filter(f => f.terr === terr).map((f, i) => `<a href="#" data-fav="${i}" data-pour="${z.dataset.pour}">${esc(f.icone)} ${esc(f.titre)}</a>`).join(''); }); };
  const choisir = (k, p) => { pts[k] = p; $('#' + k).value = p.nom.split(',').slice(0, 3).join(','); $('#res-' + k).innerHTML = `<button type="button" class="lien petit" data-enreg="${k}">☆ Enregistrer ce lieu</button>`; dessinerCarte(); estimer(); };
  const chercher = async k => {
    const t = $('#' + k).value.trim(); if (t.length < 3) return toast('Écrivez au moins 3 lettres.', true);
    $('#res-' + k).textContent = 'Recherche…';
    try {
      const l = await geocoder(t, terr);
      $('#res-' + k).innerHTML = l.length ? l.map((x, i) => `<button type="button" class="lien" data-res="${k}" data-i="${i}" style="display:block;text-align:left;margin:4px 0">📍 ${esc(x.nom)}</button>`).join('') : 'Aucun lieu trouvé : précisez la ville.';
      $('#res-' + k).onclick = ev => { const b = ev.target.closest('[data-res]'); if (b) choisir(k, l[b.dataset.i]); };
    } catch (err) { $('#res-' + k).textContent = 'Recherche indisponible, réessayez.'; }
  };
  ['depart', 'arrivee'].forEach(k => $('#' + k).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); chercher(k); } }));
  $('#fRes').addEventListener('click', ev => {
    const c = ev.target.closest('[data-chercher]'), a = ev.target.closest('[data-aero]'), g = ev.target.closest('[data-mapos]'), ct = ev.target.closest('[data-cat]');
    if (c) chercher(c.dataset.chercher);
    if (a) { ev.preventDefault(); const x = AEROPORTS[terr]; if (!x) return toast('Pas d’aéroport enregistré pour ce territoire.', true); choisir(a.dataset.aero, { nom: x[0], lat: x[1], lng: x[2] }); }
    if (g) {
      ev.preventDefault(); if (!navigator.geolocation) return toast('Localisation indisponible sur cet appareil.', true);
      toast('Localisation…');
      navigator.geolocation.getCurrentPosition(p => choisir('depart', { nom: 'Ma position', lat: p.coords.latitude, lng: p.coords.longitude }), () => toast('Autorisez la localisation ou écrivez l’adresse.', true), { enableHighAccuracy: true, timeout: 12000 });
    }
    if (ct) { cat = ct.dataset.cat; majTotal(); }
    const fv = ev.target.closest('[data-fav]'), en = ev.target.closest('[data-enreg]');
    if (fv) { ev.preventDefault(); const f = lireFav().filter(x => x.terr === terr)[fv.dataset.fav]; if (f) choisir(fv.dataset.pour, { nom: f.nom, lat: f.lat, lng: f.lng }); }
    if (en) {
      const p = pts[en.dataset.enreg]; if (!p) return;
      const titre = prompt('Nom de ce lieu (ex. Maison, Travail, Maman) :', ''); if (!titre) return;
      const icone = /maison|chez/i.test(titre) ? '🏠' : /travail|bureau|boulot/i.test(titre) ? '💼' : '⭐';
      ecrireFav([{ titre: titre.slice(0, 20), icone, nom: p.nom, lat: p.lat, lng: p.lng, terr }, ...lireFav().filter(x => x.titre !== titre.slice(0, 20))]); majFav(); toast('Lieu enregistré sur cet appareil.');
    }
  });
  majFav();
  $('#terr').addEventListener('change', e => { terr = e.target.value; terrPrefere(terr); pts.depart = pts.arrivee = null; $('#depart').value = $('#arrivee').value = ''; dessinerCarte(); estimer(); majFav(); });
  $('#fRes').quand.addEventListener('change', e => {
    $('#heure').innerHTML = e.target.value ? `<label>Date et heure <span class="aide">(heure de ${esc(terr)})</span><input name="heure" type="datetime-local" required min="${utcVersLocal(new Date().toISOString(), fuseauDe(terr))}"></label>` : '';
  });
  $('#fRes').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!exigeCompte()) return;
    if (!pts.depart || !pts.arrivee) return toast('Choisissez le départ et l’arrivée (bouton 🔎).', true);
    const d = Object.fromEntries(new FormData(ev.target)), b = $('#reserver'); b.disabled = true;
    try {
      const c = await q(sb.rpc('demander_course', { terr, cat, depart: $('#depart').value.trim().slice(0, 200), dlat: pts.depart.lat, dlng: pts.depart.lng, arrivee: $('#arrivee').value.trim().slice(0, 200), alat: pts.arrivee.lat, alng: pts.arrivee.lng,
        nb_passagers: +d.passagers || 1, nb_bagages: +d.bagages || 0, telephone_cl: d.telephone.trim(), heure_souhaitee: d.heure ? localVersUTC(d.heure, fuseauDe(terr)) : null, note_cl: d.note || null }));
      toast('🚗 Demande envoyée aux chauffeurs !'); aller('#/course/' + c.id);
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  let dest = null; try { dest = sessionStorage.getItem('wlDest'); sessionStorage.removeItem('wlDest'); } catch (e) { /* facultatif */ }
  if (dest) { $('#arrivee').value = dest; chercher('arrivee'); }   // destination tapée sur l'accueil
  try { L = await chargerCarte(); const c = CENTRES[terr] || CENTRES.Martinique; carte = fondCarte(L, $('#carte'), [c[0], c[1]], c[2]); calques = L.layerGroup().addTo(carte); }
  catch (e) { $('#carte').innerHTML = '<p class="muted" style="padding:20px">Carte indisponible.</p>'; }
};

// ---------------------------------------------------------------- suivi d'une course (client et chauffeur)
APP.pages.course = async id => {
  if (!exigeCompte()) return;
  let L = null, carte = null, calques = null, cadre = false, avisFait = null, sos = false;   // sos : panneau d'urgence ouvert (gardé au rafraîchissement)
  const dessiner = async () => {
    const [r] = await q(sb.rpc('detail_course', { cid: id }));
    const c = r.course, ch = r.chauffeur, client = c.client_id === moi.id;
    const fini = ['annulee', 'expiree'].includes(c.statut), pos = ETAPES_C.findIndex(e => e[0] === c.statut);
    if (client && c.statut === 'terminee' && avisFait === null) avisFait = (await q(sb.from('avis_course').select('id').eq('course_id', id))).length > 0;
    if (!$('#carteC')) {
      vue(`<div class="wrap" style="padding-top:22px;max-width:900px"><a href="${client ? '#/courses' : '#/chauffeur'}" class="petit">← ${client ? 'Mes courses' : 'Espace chauffeur'}</a>
        <div class="fiche fiche-2"><div id="carteC" style="height:420px;border-radius:24px;border:2px solid var(--ligne);background:var(--rose-doux)"></div><div id="infos"></div></div></div>`);
      try { L = await chargerCarte(); carte = fondCarte(L, $('#carteC'), [c.depart_lat, c.depart_lng], 13); calques = L.layerGroup().addTo(carte); } catch (e) { /* carte facultative */ }
    }
    $('#infos').innerHTML = `<div class="panneau"><span class="px">Course ${esc(c.id.slice(0, 6).toUpperCase())}${c.heure ? ' · prévue ' + esc(jourHeure(c.heure)) : ''}</span>
      <h1 style="margin:6px 0;font-size:26px">${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</h1>
      ${fini ? `<div class="verdict ko"><big>${c.statut === 'annulee' ? '❌' : '⌛'}</big>Course ${c.statut === 'annulee' ? 'annulée' : 'expirée : aucun chauffeur disponible'}</div>`
        : `<div class="quetes" style="margin:12px 0">${ETAPES_C.map((e, i) => `<div class="quete ${i < pos || c.statut === 'terminee' ? 'faite' : i === pos ? 'actuelle' : ''}"><span class="q-coche">${i <= pos ? '✓' : ''}</span><span class="q-ico">${e[1]}</span><span class="q-titre">${e[2]}</span></div>`).join('')}</div>`}
      <div style="font:700 24px var(--titres)">${eur(c.prix_estime)} <span class="muted petit" style="font:600 14px var(--texte)">estimé · ${c.distance_km} km · ${CATS[c.categorie][0]} ${CATS[c.categorie][1]} · ${c.passagers} pers.</span></div>
      ${c.note ? `<p class="petit">📝 ${esc(c.note)}</p>` : ''}
      ${ch ? `<div class="ligne-l" style="grid-template-columns:48px 1fr;margin-top:12px"><span style="font-size:34px">🧑‍✈️</span><div><b>${esc(ch.prenom || 'Votre chauffeur')}</b>${ch.note ? ` · ⭐ ${ch.note}` : ''} <span class="tag">${ch.type === 'taxi' ? 'Taxi' : 'VTC'}</span>
        <div class="muted petit">${esc(ch.vehicule)}${ch.couleur ? ' · ' + esc(ch.couleur) : ''} · <b>${esc(ch.immatriculation)}</b></div></div></div>` : !fini && c.statut === 'demande' ? '<p class="muted">🔎 Nous prévenons les chauffeurs disponibles près de vous…</p>' : ''}
      <div class="actions">${!client && c.telephone ? `<a class="btn btn-s btn-wa" href="${wa(c.telephone, 'Bonjour, votre chauffeur Woulib ici.')}" target="_blank" rel="noopener">WhatsApp au client</a><a class="btn btn-s" href="tel:${esc(c.telephone)}">📞 Appeler</a>` : ''}
        ${client && ch?.telephone && ACTIVES.includes(c.statut) ? `<a class="btn btn-s btn-wa" href="${wa(ch.telephone, 'Bonjour, votre client Woulib ici.')}" target="_blank" rel="noopener">WhatsApp au chauffeur</a><a class="btn btn-s" href="tel:${esc(ch.telephone)}">📞 Appeler</a>` : ''}
        ${!client ? boutonsChauffeur(c) : ''}
        ${!client && ACTIVES.includes(c.statut) ? (c.statut === 'a_bord' ? `<a class="btn btn-s btn-j" href="${lienGps(c.arrivee_lat, c.arrivee_lng, c.arrivee_txt)}">🧭 GPS vers l’arrivée</a>` : `<a class="btn btn-s btn-j" href="${lienGps(c.depart_lat, c.depart_lng, c.depart_txt)}">🧭 GPS vers le client</a>`) : ''}
        ${client && ['demande', 'acceptee', 'en_route'].includes(c.statut) ? '<button class="btn btn-s btn-ko" data-av="annulee">Annuler</button>' : ''}</div>
      ${client && !fini && c.statut !== 'terminee' ? `<div class="actions" style="margin-top:10px"><button class="btn btn-s btn-j" id="partager">📤 Partager mon trajet</button><button class="btn btn-s btn-ko" id="sos">🆘 Urgence</button></div>
        <div id="sosZone">${sos ? panneauSos() : ''}</div>` : ''}</div>
      ${client && c.statut === 'terminee' && !avisFait ? `<form class="f panneau" id="fAvis" style="margin-top:16px"><h2 style="margin:0">Comment s’est passé le trajet ?</h2><label>Note<select name="note">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'⭐'.repeat(n)}</option>`).join('')}</select></label>
        <label>Votre avis<textarea name="texte" maxlength="1000" style="min-height:70px"></textarea></label><button class="btn btn-p">Envoyer</button></form>` : ''}`;
    $('#fAvis')?.addEventListener('submit', async e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); try { await q(sb.from('avis_course').insert({ course_id: id, note: +d.note, texte: d.texte.trim() })); avisFait = true; toast('Merci !'); dessiner(); } catch (err) { toast(erreur(err), true); } });
    if (L && carte) {
      calques.clearLayers();
      const m = [L.circleMarker([c.depart_lat, c.depart_lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#2BB673', fillOpacity: 1 }).bindTooltip('Départ'),
        L.circleMarker([c.arrivee_lat, c.arrivee_lng], { radius: 10, color: '#fff', weight: 3, fillColor: '#0B2545', fillOpacity: 1 }).bindTooltip('Arrivée')];
      if (ch?.lat != null) m.push(L.marker([ch.lat, ch.lng], { icon: L.divIcon({ html: '<span style="font-size:30px">🚗</span>', className: '', iconSize: [34, 34], iconAnchor: [17, 17] }) }).bindTooltip('Chauffeur'));
      m.forEach(x => x.addTo(calques));
      if (!cadre) { carte.fitBounds(L.featureGroup(m).getBounds().pad(0.25)); cadre = true; }
    }
    if (fini || c.statut === 'terminee') { clearInterval(minuterie); minuterie = null; }
  };
  await dessiner();
  const lienPartage = async () => { const j = await q(sb.rpc('partager_course', { cid: id })); return `${location.origin}${location.pathname}#/partage/${j}`; };
  $('#app').onclick = async ev => {
    if (ev.target.id === 'partager') {
      try { const u = await lienPartage(), txt = 'Suis mon trajet Woulib en direct : ' + u;
        if (navigator.share) await navigator.share({ title: 'Mon trajet Woulib', text: txt }).catch(() => {}); else { await navigator.clipboard?.writeText(u).catch(() => {}); window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener'); }
      } catch (err) { toast(erreur(err), true); } return;
    }
    if (ev.target.id === 'sos') {
      sos = true; $('#sosZone').innerHTML = panneauSos(); return;
    }
    const b = ev.target.closest('[data-av]'); if (!b) return;
    if (['annulee', 'demande'].includes(b.dataset.av) && !confirm(b.dataset.av === 'demande' ? 'Vous désister de cette course ?' : 'Annuler la course ?')) return;
    b.disabled = true;
    try { await q(sb.rpc('avancer_course', { cid: id, nouveau: b.dataset.av })); if (b.dataset.av === 'demande') return aller('#/chauffeur'); await dessiner(); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash.startsWith('#/course/') && !document.hidden) dessiner().catch(() => {}); }, 8000);
};
const panneauSos = () => `<div class="panneau" style="margin-top:10px;border-color:var(--rouge)"><b>🆘 En cas de danger, appelez les secours :</b><div class="actions" style="margin-top:8px">
  <a class="btn btn-ko" href="tel:17">📞 Police 17</a><a class="btn btn-ko" href="tel:112">📞 Urgence 112</a><a class="btn btn-ko" href="tel:15">📞 SAMU 15</a></div>
  <p class="petit" style="margin:8px 0 0">Envoyez aussi votre trajet en direct à un proche :</p><button class="btn btn-s btn-j" id="partager">📤 Partager mon trajet</button></div>`;
const boutonsChauffeur = c => ({ acceptee: [['en_route', '🚗 Je pars', 'btn-p'], ['demande', 'Me désister', 'btn-ko']], en_route: [['arrivee', '📍 Je suis arrivé', 'btn-p'], ['demande', 'Me désister', 'btn-ko']],
  arrivee: [['a_bord', '🛣️ Client à bord', 'btn-ok'], ['annulee', 'Client absent', 'btn-ko']], a_bord: [['terminee', '🏁 Terminer la course', 'btn-ok']] }[c.statut] || [])
  .map(([s, t, cl]) => `<button class="btn btn-s ${cl}" data-av="${s}">${t}</button>`).join('');

APP.pages.courses = async () => {
  if (!exigeCompte()) return;
  const l = await q(sb.from('courses').select('*').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(50));
  vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><h1>Mes courses</h1>
    ${l.length ? l.map(c => `<a class="ligne-l" style="grid-template-columns:48px 1fr auto;text-decoration:none;color:inherit" href="#/course/${c.id}"><span style="font-size:32px">${CATS[c.categorie][0]}</span>
      <div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b> ${tag(ST_COURSE[c.statut])}<div class="muted petit">${esc(jourHeure(c.heure || c.created_at))} · ${eur(c.prix_estime)} · ${c.distance_km} km</div></div><span>›</span></a>`).join('')
      : '<div class="vide-etat"><div class="ico">🚗</div><h3>Aucune course pour l’instant</h3><a class="btn btn-p" href="#/move">Réserver un chauffeur</a></div>'}</div>`);
};

// ---------------------------------------------------------------- espace chauffeur
function partagerPosition(actif) {
  if (!actif) { if (suiviGps !== null) { navigator.geolocation.clearWatch(suiviGps); suiviGps = null; } return; }
  if (suiviGps !== null || !navigator.geolocation) return;
  let dernier = 0;
  suiviGps = navigator.geolocation.watchPosition(p => { if (Date.now() - dernier < 15000) return; dernier = Date.now(); sb.rpc('maj_position', { plat: p.coords.latitude, plng: p.coords.longitude }).then(() => {}); },
    () => toast('Autorisez la localisation pour que vos clients vous voient arriver.', true), { enableHighAccuracy: true, maximumAge: 10000 });
}
APP.pages.chauffeur = async sous => {
  if (!moi) return vue(`<section class="hero"><div class="wrap"><div class="press">🧑‍✈️ Chauffeurs et livreurs</div><h1>Des courses et des livraisons, <em>vous gardez l’essentiel</em>.</h1>
    <p>VTC ou taxi avec carte professionnelle, ou livreur à scooter, à vélo ou en voiture : recevez des missions près de vous, acceptez celles qui vous arrangent. Le client vous paie directement ; Woulib prend seulement 10 % (les pourboires restent à 100 % pour vous).</p>
    <div class="actions"><a class="btn btn-p" href="#/inscription?retour=%23%2Fchauffeur">Devenir chauffeur ou livreur</a><a class="btn" href="#/connexion?retour=%23%2Fchauffeur">J’ai déjà un compte</a></div></div></section>`);
  const ch = await q(sb.from('chauffeurs').select('*').eq('id', moi.id).maybeSingle());
  if (!ch || sous === 'profil') return formChauffeur(ch);
  const livreur = ch.type === 'livreur';
  if (ch.statut !== 'valide') {
    return vue(`<div class="wrap"><div class="carte-f"><h1>Espace ${livreur ? 'livreur' : 'chauffeur'}</h1>${tag(ST_CH[ch.statut])}
      <p>${ch.statut === 'demande' ? `Nous vérifions ${livreur ? 'votre identité, votre statut (SIRET) et votre assurance' : 'votre carte professionnelle et votre véhicule'}. Vous recevrez une notification dès la validation (généralement sous 48 h). Nous pouvons vous demander vos documents sur WhatsApp.` : 'Votre compte n’est pas actif. Contactez-nous sur WhatsApp pour en savoir plus.'}</p>
      <div class="actions"><a class="btn" href="#/chauffeur/profil">Modifier mes informations</a><a class="btn btn-wa" href="${wa(WA, 'Bonjour, à propos de mon compte Woulib.')}" target="_blank" rel="noopener">WhatsApp IloTech</a></div></div></div>`);
  }
  const dessiner = async () => {
    const [moiCh, enCours, dispo, lvDispo, mesLv, gains] = await Promise.all([q(sb.from('chauffeurs').select('disponible, livraisons').eq('id', moi.id).single()),
      livreur ? [] : q(sb.from('courses').select('*').eq('chauffeur_id', moi.id).in('statut', ACTIVES).order('created_at')), livreur ? [] : q(sb.rpc('courses_disponibles')),
      ch.livraisons ? q(sb.rpc('livraisons_disponibles')) : [], ch.livraisons ? q(sb.rpc('mes_livraisons')) : [], q(sb.rpc('mes_gains')).catch(() => null)]);
    const cm = await blocCommission();
    const lvActives = mesLv.filter(x => ['acceptee', 'au_restaurant', 'recuperee'].includes(x.statut));
    partagerPosition(moiCh.disponible || enCours.length > 0 || lvActives.length > 0);
    vue(`<div class="wrap" style="padding-top:22px;max-width:900px"><div class="titre-s"><h1>Espace ${livreur ? 'livreur' : 'chauffeur'}</h1><a class="btn btn-s" href="#/chauffeur/profil">${livreur ? 'Mes infos' : 'Mon véhicule'}</a></div>
      <div class="panneau" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b style="font-size:20px">${moiCh.disponible ? '🟢 Disponible' : '⚪ Hors service'}</b>
        <div class="muted petit">${esc(ch.vehicule)}${ch.immatriculation ? ' · ' + esc(ch.immatriculation) : ''}${livreur ? ' · livreur' : ` · ${CATS[ch.categorie][0]} ${CATS[ch.categorie][1]}`}${ch.livraisons && !livreur ? ' · accepte les livraisons' : ''} · ${esc(ch.territoire)}</div></div>
        <button class="btn ${moiCh.disponible ? 'btn-ko' : 'btn-ok'}" id="dispo">${moiCh.disponible ? 'Passer hors service' : 'Je suis disponible'}</button></div>
      ${gains ? `<div class="grille" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin:14px 0">${[['Aujourd’hui', gains.jour], ['7 jours', gains.semaine], ['30 jours', gains.mois]].map(([t, v]) => `<div class="panneau" style="padding:12px;text-align:center"><div class="muted petit">${t}</div><b style="font:700 24px var(--titres)">${eur(v)}</b></div>`).join('')}</div>
        <p class="muted petit" style="margin-top:-6px">${gains.nb_livraisons} livraison(s) et ${gains.nb_courses} course(s) sur 30 jours. Montants indicatifs : frais de livraison et prix estimés des courses.</p>
      ${cm}
        ${gains.a_reverser.length ? `<div class="panneau" style="padding:12px;border-color:var(--jaune)"><b>💶 À remettre aux restaurants</b>${gains.a_reverser.map(x => `<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px"><span>${esc(x.nom)}${x.telephone ? ` · <a href="tel:${esc(x.telephone)}">${esc(x.telephone)}</a>` : ''}</span><b>${eur(x.montant)}</b></div>`).join('')}
          <p class="muted petit" style="margin:6px 0 0">Le prix des repas encaissé chez les clients appartient aux restaurants. Le restaurant confirme la réception dans son espace.</p></div>` : ''}` : ''}
      ${lvActives.length ? `<h2>🛵 Ma livraison en cours</h2>${lvActives.map(x => `<a class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto;text-decoration:none;color:inherit" href="#/livraison/${x.id}"><div><b>${esc(x.restaurant)} → ${esc(x.depot_commune || '')}</b> ${tag(ST_LV[x.statut])}
        <div class="muted petit">${eur(x.a_encaisser)} à encaisser · ${eur(x.gain)} pour vous</div></div><span class="btn btn-s btn-p">Ouvrir</span></a>`).join('')}` : ''}
      ${enCours.length ? `<h2>🚗 Mes courses acceptées</h2>${enCours.map(c => `<a class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto;text-decoration:none;color:inherit" href="#/course/${c.id}"><div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b> ${tag(ST_COURSE[c.statut])}
        <div class="muted petit">${c.heure ? '🗓️ ' + esc(jourHeure(c.heure)) + ' · ' : ''}${eur(c.prix_estime)} · ${c.distance_km} km · ${esc(c.client_nom)}</div></div><span class="btn btn-s btn-p">Ouvrir</span></a>`).join('')}` : ''}
      ${ch.livraisons ? `<h2>🛵 Livraisons à prendre (${lvDispo.length})</h2><p class="muted petit">Les plus proches de vous en premier. L’adresse exacte du client s’affiche après acceptation.</p>
        ${lvDispo.length ? lvDispo.map(x => `<div class="ligne-l" style="grid-template-columns:48px 1fr auto"><span style="font-size:32px">🍱</span><div><b>${esc(x.restaurant)}</b> (${esc(x.retrait_commune)}) → ${esc(x.depot_commune || '?')}
          <div class="muted petit">${x.jusqu_au_resto != null ? `à ${x.jusqu_au_resto} km de vous · ` : ''}${x.distance_km != null ? `trajet ${x.distance_km} km · ` : ''}${x.articles || '?'} article(s) · ${eur(x.a_encaisser)} à encaisser</div></div>
          <div style="text-align:right"><div class="prix">${eur(x.gain)}</div><button class="btn btn-s btn-ok" data-livrer="${x.id}">Accepter</button></div></div>`).join('')
          : `<div class="vide-etat"><div class="ico">🛵</div><h3>Pas de livraison pour l’instant</h3><p class="muted">${moiCh.disponible ? 'Vous serez notifié dès qu’un restaurant en a une près de vous.' : 'Passez disponible pour recevoir les livraisons.'}</p></div>`}` : ''}
      ${livreur ? '' : `<h2>🔔 Courses près de vous (${dispo.length})</h2><p class="muted petit">Mise à jour toutes les 10 secondes. Le premier chauffeur qui accepte obtient la course.</p>
      ${dispo.length ? dispo.map(c => `<div class="ligne-l" style="grid-template-columns:48px 1fr auto"><span style="font-size:32px">${CATS[c.categorie][0]}</span><div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b>
        <div class="muted petit">${c.heure ? '🗓️ ' + esc(jourHeure(c.heure)) : '⚡ Maintenant'} · ${c.distance_km} km · ${c.passagers} pers.${c.bagages ? ` · ${c.bagages} bagage(s)` : ''}</div></div>
        <div style="text-align:right"><div class="prix">${eur(c.prix_estime)}</div><button class="btn btn-s btn-ok" data-accepter="${c.id}">Accepter</button></div></div>`).join('')
        : `<div class="vide-etat"><div class="ico">😴</div><h3>Pas de demande pour l’instant</h3><p class="muted">${moiCh.disponible ? 'Vous serez notifié dès qu’un client réserve.' : 'Passez disponible pour recevoir les demandes.'}</p></div>`}`}</div>`);
    $('#dispo').onclick = async () => { try { await q(sb.from('chauffeurs').update({ disponible: !moiCh.disponible }).eq('id', moi.id)); await dessiner(); } catch (err) { toast(erreur(err), true); } };
  };
  await dessiner();
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-accepter],[data-livrer]'); if (!b) return; b.disabled = true;
    try {
      if (b.dataset.livrer) { const lid = await q(sb.rpc('accepter_livraison', { lid: b.dataset.livrer })); toast('🛵 Livraison acceptée : direction le restaurant !'); return aller('#/livraison/' + lid); }
      const c = await q(sb.rpc('accepter_course', { cid: b.dataset.accepter })); toast('👍 Course acceptée !'); aller('#/course/' + c.id);
    } catch (err) { toast(erreur(err), true); dessiner(); }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash === '#/chauffeur' && !document.hidden) dessiner().catch(() => {}); }, 10000);
};

// ---------------------------------------------------------------- mission de livraison (livreur)
const ST_LV = { recherche: ['att', 'Recherche'], acceptee: ['ok', 'Vers le restaurant'], au_restaurant: ['ok', 'Au restaurant'], recuperee: ['ok', 'En livraison'], livree: ['gris', 'Livrée'], annulee: ['ko', 'Annulée'], echec: ['ko', 'Non livrée'] };
APP.pages.livraison = async id => {
  if (!exigeCompte()) return;
  let L = null;
  const dessiner = async () => {
    const d = await q(sb.rpc('detail_livraison', { lid: id }));
    const fini = ['livree', 'annulee', 'echec'].includes(d.statut), r = d.restaurant, c = d.client;
    partagerPosition(!fini);
    const etapes = [['acceptee', '🛵', 'Vers le restaurant'], ['au_restaurant', '🍽️', 'Au restaurant'], ['recuperee', '📦', 'Commande récupérée'], ['livree', '🎉', 'Livrée']], pos = etapes.findIndex(e => e[0] === d.statut);
    const gps = (lat, lng) => lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : null;
    const adrC = [c.adresse, c.commune].filter(Boolean).join(', '), adrR = [r.adresse, r.commune].filter(Boolean).join(', ');
    vue(`<div class="wrap" style="padding-top:22px;max-width:900px"><a href="#/chauffeur" class="petit">← Espace livreur</a>
      <div class="fiche fiche-2"><div id="carteM" style="height:380px;border-radius:24px;border:2px solid var(--ligne);background:var(--rose-doux)"></div>
      <div class="panneau"><span class="px">Commande ${esc(d.commande)}</span><h1 style="margin:6px 0;font-size:24px">${esc(r.nom)} → ${esc(c.commune || c.nom)}</h1>
        ${fini ? `<div class="verdict ${d.statut === 'livree' ? '' : 'ko'}"><big>${d.statut === 'livree' ? '🎉' : '❌'}</big>${d.statut === 'livree' ? 'Livraison terminée, merci !' : d.statut === 'echec' ? 'Livraison non effectuée' : 'Livraison annulée'}</div>`
          : `<div class="quetes" style="margin:12px 0">${etapes.map((e, i) => `<div class="quete ${i < pos ? 'faite' : i === pos ? 'actuelle' : ''}"><span class="q-coche">${i <= pos ? '✓' : ''}</span><span class="q-ico">${e[1]}</span><span class="q-titre">${e[2]}</span></div>`).join('')}</div>`}
        <div style="font:700 22px var(--titres)">${eur(d.gain)} pour vous</div>
        <p class="petit">💶 À encaisser chez le client : <b>${eur(d.a_encaisser)}</b> (dont ${eur(d.part_restaurant)} à remettre au restaurant)</p>
        <div class="panneau" style="padding:10px;margin:10px 0"><b>🍽️ Retrait</b> · ${esc(r.nom)}<div class="petit">${esc(adrR)}</div>
          <div class="actions" style="margin-top:6px">${gps(r.lat, r.lng) ? `<a class="btn btn-s btn-j" href="${lienGps(r.lat, r.lng, r.nom)}">🧭 GPS Woulib</a><a class="btn btn-s" href="${gps(r.lat, r.lng)}" target="_blank" rel="noopener">Google Maps</a>` : ''}${r.telephone ? `<a class="btn btn-s" href="tel:${esc(r.telephone)}">📞 Restaurant</a>` : ''}</div></div>
        ${!fini ? `<div class="panneau" style="padding:10px;margin:10px 0"><b>🏠 Client</b> · ${esc(c.nom)}<div class="petit">${esc(adrC)}${c.note ? `<br>📝 ${esc(c.note)}` : ''}</div>
          <div class="actions" style="margin-top:6px">${gps(c.lat, c.lng) ? `<a class="btn btn-s btn-j" href="${lienGps(c.lat, c.lng, c.nom)}">🧭 GPS Woulib</a><a class="btn btn-s" href="${gps(c.lat, c.lng)}" target="_blank" rel="noopener">Google Maps</a>` : adrC ? `<a class="btn btn-s" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adrC)}" target="_blank" rel="noopener">🧭 Itinéraire</a>` : ''}
            ${c.telephone ? `<a class="btn btn-s" href="tel:${esc(c.telephone)}">📞 Client</a><a class="btn btn-s btn-wa" href="${wa(c.telephone, 'Bonjour, votre livreur Woulib ici.')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</div></div>
          <p class="petit"><b>Articles :</b> ${(d.articles || []).map(a => `${a.quantite} × ${esc(a.nom)}`).join(', ')}</p>` : ''}
        <div class="actions">${{ acceptee: '<button class="btn btn-p" data-lv="au_restaurant">🍽️ Je suis au restaurant</button><button class="btn btn-s btn-ko" data-lv="recherche">Me désister</button>',
          au_restaurant: `<button class="btn btn-p" data-lv="recuperee">📦 J’ai la commande</button><button class="btn btn-s btn-ko" data-lv="recherche">Me désister</button>${d.commande_statut === 'acceptee' ? '<p class="muted petit" style="width:100%">Le restaurant n’a pas encore lancé la préparation.</p>' : ''}`,
          recuperee: `<form id="fCode" class="f" style="width:100%"><label>Code de remise donné par le client<input name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4 chiffres" style="font:700 26px var(--titres);letter-spacing:.3em;text-align:center"></label>
            <button class="btn btn-p">🎉 Remettre la commande</button>${d.essais ? `<p class="petit" style="color:var(--rouge);margin:0">${d.essais} essai(s) incorrect(s) sur 5</p>` : ''}</form><button class="btn btn-s btn-ko" data-lv="echec">Client absent ou injoignable</button>` }[d.statut] || ''}</div></div></div></div>`);
    $('#fCode')?.addEventListener('submit', async e => {
      e.preventDefault(); const code = new FormData(e.target).get('code');
      try { const r2 = await q(sb.rpc('avancer_livraison', { lid: id, nouveau: 'livree', code_saisi: code })); if (r2 === 'code_incorrect') toast('Code incorrect : demandez au client le code affiché dans son appli.', true); else toast('🎉 Livraison terminée !'); dessiner(); }
      catch (err) { toast(erreur(err), true); }
    });
    try {   // carte : restaurant, client, moi
      L = L || await chargerCarte();
      const pts = [[r.lat, r.lng, '🍽️', 'Restaurant'], ...(fini ? [] : [[c.lat, c.lng, '🏠', 'Client']])].filter(p => p[0] != null)
        .map(([a, b, e, t]) => L.marker([a, b], { icon: L.divIcon({ html: `<span style="font-size:28px">${e}</span>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }) }).bindTooltip(t));
      const carte = fondCarte(L, $('#carteM'), pts[0]?.getLatLng() || (CENTRES[ch_territoire()] || CENTRES.Martinique).slice(0, 2), 13);
      pts.forEach(m => m.addTo(carte)); if (pts.length > 1) carte.fitBounds(L.featureGroup(pts).getBounds().pad(0.3));
    } catch (e) { /* carte facultative */ }
    if (fini) { clearInterval(minuterie); minuterie = null; }
  };
  const ch_territoire = () => terrPrefere() || 'Martinique';
  await dessiner();
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-lv]'); if (!b) return;
    if (['recherche', 'echec'].includes(b.dataset.lv) && !confirm(b.dataset.lv === 'recherche' ? 'Vous désister de cette livraison ?' : 'Confirmer que le client est absent ou injoignable ? La commande sera annulée.')) return;
    b.disabled = true;
    try { await q(sb.rpc('avancer_livraison', { lid: id, nouveau: b.dataset.lv })); if (b.dataset.lv === 'recherche') return aller('#/chauffeur'); dessiner(); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash.startsWith('#/livraison/') && !document.hidden) dessiner().catch(() => {}); }, 15000);
};

function formChauffeur(ch) {
  const x = ch || { type: 'vtc', numero_carte: '', siret: '', vehicule: '', immatriculation: '', couleur: '', places: 4, categorie: 'berline', livraisons: false, territoire: profil?.territoire && TERRITOIRES[profil.territoire] ? profil.territoire : terrPrefere() || 'Martinique' };
  vue(`<div class="wrap" style="padding:22px 20px;max-width:760px"><a href="#/chauffeur" class="petit">← Espace ${x.type === 'livreur' ? 'livreur' : 'chauffeur'}</a><h1>${ch ? 'Mes informations' : 'Devenir chauffeur ou livreur'}</h1>
    ${ch?.statut === 'valide' ? '<p class="petit" style="color:var(--rouge)">Changer de statut, de carte, de plaque, de catégorie ou de territoire relance la vérification de votre compte.</p>' : ''}
    <form class="f" id="fCh"><div class="ligne2"><label>Je suis<select name="type"><option value="vtc" ${x.type === 'vtc' ? 'selected' : ''}>Chauffeur VTC</option><option value="taxi" ${x.type === 'taxi' ? 'selected' : ''}>Taxi</option>
        <option value="livreur" ${x.type === 'livreur' ? 'selected' : ''}>Livreur (scooter, vélo, voiture)</option></select></label><label>Territoire<select name="territoire">${optsTerritoires(x.territoire)}</select></label></div>
      <p class="muted petit" id="aideType" style="margin:0"></p>
      <div class="ligne2"><label class="pro">N° carte professionnelle / licence<input name="numero_carte" minlength="4" maxlength="40" value="${esc(x.numero_carte || '')}"></label><label>SIRET<input name="siret" pattern="[0-9 ]{9,17}" maxlength="17" value="${esc(x.siret || '')}"></label></div>
      <div class="ligne3"><label>Véhicule<input name="vehicule" required minlength="2" maxlength="60" placeholder="Toyota Corolla, scooter 125, vélo…" value="${esc(x.vehicule)}"></label><label>Immatriculation<input name="immatriculation" minlength="4" maxlength="15" value="${esc(x.immatriculation || '')}"></label><label>Couleur<input name="couleur" maxlength="30" value="${esc(x.couleur || '')}"></label></div>
      <div class="ligne2 pro"><label>Catégorie<select name="categorie">${Object.entries(CATS).map(([k, [i, t, d]]) => `<option value="${k}" ${k === x.categorie ? 'selected' : ''}>${i} ${t} (${d})</option>`).join('')}</select></label><label>Places passagers<input name="places" type="number" min="1" max="8" value="${x.places}"></label></div>
      <label class="pro" style="display:flex;gap:8px;font-weight:600"><input type="checkbox" name="livraisons" ${x.livraisons ? 'checked' : ''} style="width:auto"> J’accepte aussi des livraisons de repas entre deux courses</label>
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> <span id="certif"></span> J’accepte les <a href="cgu.html" target="_blank">conditions</a>.</label>
      <button class="btn btn-p">${ch ? 'Enregistrer' : 'Envoyer ma demande'}</button></form></div>`);
  const f = $('#fCh');
  const maj = () => {
    const lv = f.type.value === 'livreur';
    document.querySelectorAll('#fCh .pro').forEach(e => { e.style.display = lv ? 'none' : ''; });
    f.numero_carte.required = !lv; f.immatriculation.required = !lv; f.siret.required = lv;
    $('#aideType').textContent = lv ? 'Livreur indépendant : statut déclaré (SIRET, par exemple micro-entreprise), assurance adaptée à la livraison. Pas de carte VTC nécessaire.' : 'Réservé aux chauffeurs professionnels : carte VTC ou licence de taxi, assurance transport de personnes à jour.';
    $('#certif').textContent = lv ? 'Je certifie avoir un statut déclaré et une assurance couvrant la livraison.' : 'Je certifie détenir une carte professionnelle valide et une assurance pour le transport de personnes.';
  };
  f.type.addEventListener('change', maj); maj();
  f.addEventListener('submit', async ev => {
    ev.preventDefault(); const d = Object.fromEntries(new FormData(f)), lv = d.type === 'livreur';
    const l = { type: d.type, numero_carte: lv ? null : d.numero_carte.trim(), siret: d.siret.trim() || null, territoire: d.territoire, vehicule: d.vehicule.trim(), immatriculation: d.immatriculation.trim().toUpperCase() || null,
      couleur: d.couleur.trim() || null, categorie: lv ? 'eco' : d.categorie, places: lv ? 1 : +d.places, livraisons: lv || !!d.livraisons };
    try { if (ch) await q(sb.from('chauffeurs').update(l).eq('id', moi.id)); else await q(sb.from('chauffeurs').insert(l)); toast(ch ? 'Enregistré.' : 'Demande envoyée, nous vous recontactons.'); aller('#/chauffeur'); }
    catch (err) { toast(erreur(err), true); }
  });
}

// ---------------------------------------------------------------- administration
async function adminWoulib() {
  if (!exigeCompte()) return;
  if (profil?.role !== 'admin' && !mesModerations.includes('move')) return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  const [chs, tarifs] = await Promise.all([q(sb.from('chauffeurs').select('*').order('created_at', { ascending: false }).limit(100)), q(sb.from('tarifs_move').select('*').order('territoire').order('categorie'))]);
  const ids = [...new Set(chs.map(x => x.id))];
  const [pr, ct] = ids.length ? await Promise.all([q(sb.from('profiles').select('id, prenom, nom').in('id', ids)), q(sb.from('contacts').select('*').in('id', ids))]) : [[], []];
  const terrA = param().t || 'Martinique';
  vue(`<div class="wrap" style="padding-top:22px">${ongletsAdmin('woulib')}<h2>Chauffeurs (${chs.length})</h2>
    ${chs.map(x => { const p = pr.find(y => y.id === x.id), c = ct.find(y => y.id === x.id); return `<div class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto"><div><b>${esc(p?.prenom)} ${esc(p?.nom)}</b> ${tag(ST_CH[x.statut])} <span class="tag">${x.type.toUpperCase()}</span>
      <div class="muted petit">${x.numero_carte ? 'Carte ' + esc(x.numero_carte) : 'Livreur'}${x.livraisons && x.type !== 'livreur' ? ' · livre aussi' : ''}${x.siret ? ' · SIRET ' + esc(x.siret) : ''} · ${esc(x.vehicule)} ${esc(x.couleur || '')} · ${esc(x.immatriculation || '')} · ${x.type === 'livreur' ? 'livraisons' : CATS[x.categorie][1]} · ${esc(x.territoire)}</div>
      <div class="petit">${esc(c?.email || '')} ${c?.telephone ? `· <a href="${wa(c.telephone, 'Bonjour, ici Woulib (IloTech) pour la vérification de votre compte chauffeur.')}" target="_blank" rel="noopener">${esc(c.telephone)}</a>` : ''}</div></div>
      <div class="actions">${x.statut !== 'valide' ? `<button class="btn btn-s btn-ok" data-ch="${x.id}" data-v="valide">Valider</button>` : `<button class="btn btn-s btn-ko" data-ch="${x.id}" data-v="suspendu">Suspendre</button>`}${x.statut === 'demande' ? `<button class="btn btn-s btn-ko" data-ch="${x.id}" data-v="refuse">Refuser</button>` : ''}</div></div>`; }).join('') || '<p class="muted">Aucun chauffeur inscrit.</p>'}
    <h2 style="margin-top:26px">Tarifs</h2><p class="muted petit">Prix = prise en charge + km × prix au km, jamais moins que le minimum. Distance = vol d’oiseau × 1,35.</p>
    <div class="puces">${NOMS_TERRITOIRES.map(t => `<a href="#/admin/woulib?t=${encodeURIComponent(t)}" class="${t === terrA ? 'on' : ''}">${esc(t)}</a>`).join('')}</div>
    <form class="f" id="fT">${tarifs.filter(t => t.territoire === terrA).map(t => `<div class="ligne3" data-cat="${t.categorie}"><b style="align-self:center">${CATS[t.categorie][0]} ${CATS[t.categorie][1]}</b>
      <label>Prise en charge (€)<input name="p" type="number" step="0.1" min="0" value="${t.prise_en_charge}"></label><label>Prix / km (€)<input name="k" type="number" step="0.01" min="0" value="${t.prix_km}"></label><label>Minimum (€)<input name="m" type="number" step="0.5" min="0" value="${t.minimum}"></label></div>`).join('')}
      <button class="btn btn-p">Enregistrer les tarifs ${esc(terrA)}</button></form></div>`);
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-ch]'); if (!b) return;
    try { await q(sb.from('chauffeurs').update({ statut: b.dataset.v }).eq('id', b.dataset.ch)); toast('C’est fait.'); adminWoulib(); } catch (err) { toast(erreur(err), true); }
  };
  $('#fT').addEventListener('submit', async ev => {
    ev.preventDefault();
    try {
      for (const r of ev.target.querySelectorAll('[data-cat]')) {
        await q(sb.from('tarifs_move').update({ prise_en_charge: +r.querySelector('[name=p]').value, prix_km: +r.querySelector('[name=k]').value, minimum: +r.querySelector('[name=m]').value }).eq('territoire', terrA).eq('categorie', r.dataset.cat));
      }
      toast('Tarifs enregistrés.');
    } catch (err) { toast(erreur(err), true); }
  });
};


// ---------------------------------------------------------------- suivi partagé (sans compte) : un proche suit le trajet en direct
APP.pages.partage = async jeton => {
  let L = null;
  const dessiner = async () => {
    const c = await q(sb.rpc('course_partagee', { jeton }));
    const ch = c.chauffeur, fini = ['terminee', 'annulee', 'expiree'].includes(c.statut);
    vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><div class="panneau"><span class="px">Trajet partagé par ${esc(c.passager || 'un passager')}</span>
      <h1 style="margin:6px 0;font-size:24px">${esc(c.depart)} → ${esc(c.arrivee)}</h1><p><b>${{ demande: '🔎 Recherche d’un chauffeur', acceptee: '👍 Chauffeur trouvé', en_route: '🚗 Le chauffeur arrive', arrivee: '📍 Chauffeur sur place', a_bord: '🛣️ En route vers la destination', terminee: '🏁 Arrivé à destination', annulee: '❌ Course annulée', expiree: '⌛ Course expirée' }[c.statut]}</b>
        <span class="muted petit"> · mis à jour ${esc(heure(c.maj_at))}</span></p>
      ${ch ? `<p>🧑‍✈️ ${esc(ch.prenom || 'Chauffeur')} · ${esc(ch.vehicule)}${ch.couleur ? ' ' + esc(ch.couleur) : ''} · <b>${esc(ch.immatriculation || '')}</b></p>` : ''}
      <div id="carteP" style="height:360px;border-radius:20px;background:var(--rose-doux)"></div>
      <p class="muted petit">Lien valable pendant le trajet et 1 heure après. Woulib ne montre ni téléphone ni adresse exacte du passager.</p></div></div>`);
    try {
      L = L || await chargerCarte();
      const pts = [[c.depart_pos, '🟢', 'Départ'], [c.arrivee_pos, '🏁', 'Arrivée'], [ch?.lat != null ? [ch.lat, ch.lng] : null, '🚗', 'Chauffeur']].filter(([p]) => p && p[0] != null)
        .map(([p, e, t]) => L.marker(p, { icon: L.divIcon({ html: `<span style="font-size:28px">${e}</span>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }) }).bindTooltip(t));
      const carte = fondCarte(L, $('#carteP'), pts[0].getLatLng(), 12); pts.forEach(m => m.addTo(carte)); carte.fitBounds(L.featureGroup(pts).getBounds().pad(0.25));
    } catch (e) { /* carte facultative */ }
    if (fini) { clearInterval(minuterie); minuterie = null; }
  };
  try { await dessiner(); } catch (err) { return vue(`<div class="wrap vide-etat" style="margin-top:30px"><h3>${esc(erreur(err))}</h3><a class="btn" href="#/">Découvrir Woulib</a></div>`); }
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash.startsWith('#/partage/') && !document.hidden) dessiner().catch(() => {}); }, 10000);
};

APP.pages.woulib = APP.pages.move;   // anciens liens #/woulib
