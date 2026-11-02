/* Kivora, partie « Woulib » : réservation de VTC et taxis (chauffeurs professionnels vérifiés). APP : app.js ; base commune : commun/base.js.
   Prix estimé, attribution des courses et étapes contrôlés par la base (woulib.sql). Paiement direct au chauffeur. */
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
APP.pages.woulib = async () => {
  let terr = terrPrefere() || profil?.territoire || 'Martinique'; if (!TERRITOIRES[terr] || terr === 'Autre pays') terr = 'Martinique';
  const pts = { depart: null, arrivee: null };
  let cat = 'eco', carte = null, calques = null, L = null, estim = {};
  vue(`<section class="hero"><div class="wrap">
    <div class="press"><span class="clignote">🚗</span> Woulib, on y va !</div>
    <h1>Un chauffeur pro, <em>au prix annoncé</em>.</h1>
    <p>VTC et taxis vérifiés par nos soins. Le prix est estimé avant de réserver, vous suivez votre chauffeur sur la carte et vous le payez directement.</p></div></section>
    <div class="wrap"><div class="fiche fiche-d">
      <div><div id="carte" style="height:min(62vh,520px);border-radius:24px;border:2px solid var(--ligne);background:var(--rose-doux)"></div>
        <div class="etapes" style="margin-top:18px"><div class="etape"><b>1. Où allez-vous ?</b><p class="muted petit">Départ, arrivée, et le prix s’affiche.</p></div><div class="etape"><b>2. Un chauffeur accepte</b><p class="muted petit">Vous voyez sa voiture et sa plaque.</p></div><div class="etape"><b>3. Vous le payez</b><p class="muted petit">Espèces ou carte, directement au chauffeur.</p></div></div></div>
      <aside><form class="f panier colle" id="fRes">
        <label>Territoire<select name="territoire" id="terr">${optsTerritoires(terr).replace(/<option[^>]*>Autre pays<\/option>/, '')}</select></label>
        ${['depart', 'arrivee'].map(k => `<div><label>${k === 'depart' ? '🟢 Départ' : '🏁 Arrivée'}<div style="display:flex;gap:6px"><input id="${k}" placeholder="${k === 'depart' ? 'Adresse, lieu, hôtel…' : 'Où allez-vous ?'}" autocomplete="off" maxlength="200" style="flex:1">
          <button type="button" class="btn btn-s" data-chercher="${k}" aria-label="Chercher">🔎</button></div></label><div id="res-${k}" class="petit"></div>
          <div class="puces" style="margin:6px 0 0">${k === 'depart' ? '<a href="#" data-mapos="1">📍 Ma position</a>' : ''}<a href="#" data-aero="${k}">✈️ Aéroport</a></div></div>`).join('')}
        <div class="types" id="cats">${Object.entries(CATS).map(([k, [i, t, d]]) => `<button type="button" class="type" data-cat="${k}" style="text-align:left;cursor:pointer"><span><b>${i} ${t}</b><div class="muted petit">${d}</div></span><span class="prix" id="px-${k}">—</span></button>`).join('')}</div>
        <div class="ligne2"><label>Passagers<input name="passagers" type="number" min="1" max="8" value="1"></label><label>Bagages<input name="bagages" type="number" min="0" max="10" value="0"></label></div>
        <label>Quand ?<select name="quand"><option value="">Maintenant</option><option value="plus">Plus tard</option></select></label><div id="heure"></div>
        <label>Téléphone<input name="telephone" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
        <label>Un mot pour le chauffeur <span class="aide">(facultatif)</span><input name="note" maxlength="300" placeholder="Siège enfant, n° de vol, portail bleu…"></label>
        <div id="total"></div><button class="btn btn-p" id="reserver">Réserver</button>
        <p class="muted petit" style="margin:0">Prix estimé selon la distance, à régler au chauffeur. Péages, attente longue ou détour demandé en plus.</p></form></aside></div></div>`);

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
  const choisir = (k, p) => { pts[k] = p; $('#' + k).value = p.nom.split(',').slice(0, 3).join(','); $('#res-' + k).innerHTML = ''; dessinerCarte(); estimer(); };
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
  });
  $('#terr').addEventListener('change', e => { terr = e.target.value; terrPrefere(terr); pts.depart = pts.arrivee = null; $('#depart').value = $('#arrivee').value = ''; dessinerCarte(); estimer(); });
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
  try { L = await chargerCarte(); const c = CENTRES[terr] || CENTRES.Martinique; carte = fondCarte(L, $('#carte'), [c[0], c[1]], c[2]); calques = L.layerGroup().addTo(carte); }
  catch (e) { $('#carte').innerHTML = '<p class="muted" style="padding:20px">Carte indisponible.</p>'; }
};

// ---------------------------------------------------------------- suivi d'une course (client et chauffeur)
APP.pages.course = async id => {
  if (!exigeCompte()) return;
  let L = null, carte = null, calques = null, cadre = false, avisFait = null;
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
        ${client && ['demande', 'acceptee', 'en_route'].includes(c.statut) ? '<button class="btn btn-s btn-ko" data-av="annulee">Annuler</button>' : ''}</div></div>
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
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-av]'); if (!b) return;
    if (['annulee', 'demande'].includes(b.dataset.av) && !confirm(b.dataset.av === 'demande' ? 'Vous désister de cette course ?' : 'Annuler la course ?')) return;
    b.disabled = true;
    try { await q(sb.rpc('avancer_course', { cid: id, nouveau: b.dataset.av })); if (b.dataset.av === 'demande') return aller('#/chauffeur'); await dessiner(); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash.startsWith('#/course/') && !document.hidden) dessiner().catch(() => {}); }, 8000);
};
const boutonsChauffeur = c => ({ acceptee: [['en_route', '🚗 Je pars', 'btn-p'], ['demande', 'Me désister', 'btn-ko']], en_route: [['arrivee', '📍 Je suis arrivé', 'btn-p'], ['demande', 'Me désister', 'btn-ko']],
  arrivee: [['a_bord', '🛣️ Client à bord', 'btn-ok'], ['annulee', 'Client absent', 'btn-ko']], a_bord: [['terminee', '🏁 Terminer la course', 'btn-ok']] }[c.statut] || [])
  .map(([s, t, cl]) => `<button class="btn btn-s ${cl}" data-av="${s}">${t}</button>`).join('');

APP.pages.courses = async () => {
  if (!exigeCompte()) return;
  const l = await q(sb.from('courses').select('*').eq('client_id', moi.id).order('created_at', { ascending: false }).limit(50));
  vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><h1>Mes courses</h1>
    ${l.length ? l.map(c => `<a class="ligne-l" style="grid-template-columns:48px 1fr auto;text-decoration:none;color:inherit" href="#/course/${c.id}"><span style="font-size:32px">${CATS[c.categorie][0]}</span>
      <div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b> ${tag(ST_COURSE[c.statut])}<div class="muted petit">${esc(jourHeure(c.heure || c.created_at))} · ${eur(c.prix_estime)} · ${c.distance_km} km</div></div><span>›</span></a>`).join('')
      : '<div class="vide-etat"><div class="ico">🚗</div><h3>Aucune course pour l’instant</h3><a class="btn btn-p" href="#/woulib">Réserver un chauffeur</a></div>'}</div>`);
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
  if (!moi) return vue(`<section class="hero"><div class="wrap"><div class="press">🧑‍✈️ Chauffeurs VTC et taxis</div><h1>Des courses en plus, <em>sans commission pour démarrer</em>.</h1>
    <p>Vous êtes VTC ou taxi avec carte professionnelle ? Recevez des demandes près de vous, acceptez celles qui vous arrangent, le client vous paie directement.</p>
    <div class="actions"><a class="btn btn-p" href="#/inscription?retour=%23%2Fchauffeur">Devenir chauffeur Woulib</a><a class="btn" href="#/connexion?retour=%23%2Fchauffeur">J’ai déjà un compte</a></div></div></section>`);
  const ch = await q(sb.from('chauffeurs').select('*').eq('id', moi.id).maybeSingle());
  if (!ch || sous === 'profil') return formChauffeur(ch);
  if (ch.statut !== 'valide') {
    return vue(`<div class="wrap"><div class="carte-f"><h1>Espace chauffeur</h1>${tag(ST_CH[ch.statut])}
      <p>${ch.statut === 'demande' ? 'Nous vérifions votre carte professionnelle et votre véhicule. Vous recevrez une notification dès la validation (généralement sous 48 h). Gardez votre carte, votre permis et l’attestation d’assurance à portée de main : nous pouvons vous les demander sur WhatsApp.' : 'Votre compte chauffeur n’est pas actif. Contactez-nous sur WhatsApp pour en savoir plus.'}</p>
      <div class="actions"><a class="btn" href="#/chauffeur/profil">Modifier mes informations</a><a class="btn btn-wa" href="${wa(WA, 'Bonjour, à propos de mon compte chauffeur Woulib.')}" target="_blank" rel="noopener">WhatsApp IloTech</a></div></div></div>`);
  }
  const dessiner = async () => {
    const [moiCh, enCours, dispo] = await Promise.all([q(sb.from('chauffeurs').select('disponible').eq('id', moi.id).single()),
      q(sb.from('courses').select('*').eq('chauffeur_id', moi.id).in('statut', ACTIVES).order('created_at')), q(sb.rpc('courses_disponibles'))]);
    partagerPosition(moiCh.disponible || enCours.length > 0);
    vue(`<div class="wrap" style="padding-top:22px;max-width:900px"><div class="titre-s"><h1>Espace chauffeur</h1><a class="btn btn-s" href="#/chauffeur/profil">Mon véhicule</a></div>
      <div class="panneau" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><b style="font-size:20px">${moiCh.disponible ? '🟢 Disponible' : '⚪ Hors service'}</b>
        <div class="muted petit">${esc(ch.vehicule)} · ${esc(ch.immatriculation)} · ${CATS[ch.categorie][0]} ${CATS[ch.categorie][1]} · ${esc(ch.territoire)}</div></div>
        <button class="btn ${moiCh.disponible ? 'btn-ko' : 'btn-ok'}" id="dispo">${moiCh.disponible ? 'Passer hors service' : 'Je suis disponible'}</button></div>
      ${enCours.length ? `<h2>🚗 Mes courses acceptées</h2>${enCours.map(c => `<a class="ligne-l" style="grid-template-columns:1fr auto;text-decoration:none;color:inherit" href="#/course/${c.id}"><div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b> ${tag(ST_COURSE[c.statut])}
        <div class="muted petit">${c.heure ? '🗓️ ' + esc(jourHeure(c.heure)) + ' · ' : ''}${eur(c.prix_estime)} · ${c.distance_km} km · ${esc(c.client_nom)}</div></div><span class="btn btn-s btn-p">Ouvrir</span></a>`).join('')}` : ''}
      <h2>🔔 Demandes près de vous (${dispo.length})</h2><p class="muted petit">Mise à jour toutes les 10 secondes. Le premier chauffeur qui accepte obtient la course.</p>
      ${dispo.length ? dispo.map(c => `<div class="ligne-l" style="grid-template-columns:48px 1fr auto"><span style="font-size:32px">${CATS[c.categorie][0]}</span><div><b>${esc(c.depart_txt)} → ${esc(c.arrivee_txt)}</b>
        <div class="muted petit">${c.heure ? '🗓️ ' + esc(jourHeure(c.heure)) : '⚡ Maintenant'} · ${c.distance_km} km · ${c.passagers} pers.${c.bagages ? ` · ${c.bagages} bagage(s)` : ''}</div></div>
        <div style="text-align:right"><div class="prix">${eur(c.prix_estime)}</div><button class="btn btn-s btn-ok" data-accepter="${c.id}">Accepter</button></div></div>`).join('')
        : `<div class="vide-etat"><div class="ico">😴</div><h3>Pas de demande pour l’instant</h3><p class="muted">${moiCh.disponible ? 'Vous serez notifié dès qu’un client réserve.' : 'Passez disponible pour recevoir les demandes.'}</p></div>`}</div>`);
    $('#dispo').onclick = async () => { try { await q(sb.from('chauffeurs').update({ disponible: !moiCh.disponible }).eq('id', moi.id)); await dessiner(); } catch (err) { toast(erreur(err), true); } };
  };
  await dessiner();
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-accepter]'); if (!b) return; b.disabled = true;
    try { const c = await q(sb.rpc('accepter_course', { cid: b.dataset.accepter })); toast('👍 Course acceptée !'); aller('#/course/' + c.id); } catch (err) { toast(erreur(err), true); dessiner(); }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash === '#/chauffeur' && !document.hidden) dessiner().catch(() => {}); }, 10000);
};
function formChauffeur(ch) {
  const x = ch || { type: 'vtc', numero_carte: '', siret: '', vehicule: '', immatriculation: '', couleur: '', places: 4, categorie: 'berline', territoire: profil?.territoire && TERRITOIRES[profil.territoire] ? profil.territoire : terrPrefere() || 'Martinique' };
  vue(`<div class="wrap" style="padding:22px 20px;max-width:760px"><a href="#/chauffeur" class="petit">← Espace chauffeur</a><h1>${ch ? 'Mon véhicule' : 'Devenir chauffeur Woulib'}</h1>
    ${ch?.statut === 'valide' ? '<p class="petit" style="color:var(--rouge)">Changer de carte, de plaque, de catégorie ou de territoire relance la vérification de votre compte.</p>' : '<p class="muted">Réservé aux chauffeurs professionnels : carte VTC ou licence de taxi, assurance transport de personnes à jour.</p>'}
    <form class="f" id="fCh"><div class="ligne2"><label>Je suis<select name="type"><option value="vtc" ${x.type === 'vtc' ? 'selected' : ''}>Chauffeur VTC</option><option value="taxi" ${x.type === 'taxi' ? 'selected' : ''}>Taxi</option></select></label>
      <label>N° carte professionnelle / licence<input name="numero_carte" required minlength="4" maxlength="40" value="${esc(x.numero_carte)}"></label></div>
      <div class="ligne2"><label>SIRET<input name="siret" pattern="[0-9 ]{9,17}" maxlength="17" value="${esc(x.siret || '')}"></label><label>Territoire<select name="territoire">${optsTerritoires(x.territoire)}</select></label></div>
      <div class="ligne3"><label>Véhicule<input name="vehicule" required minlength="2" maxlength="60" placeholder="Toyota Corolla" value="${esc(x.vehicule)}"></label><label>Immatriculation<input name="immatriculation" required minlength="4" maxlength="15" value="${esc(x.immatriculation)}"></label><label>Couleur<input name="couleur" maxlength="30" value="${esc(x.couleur || '')}"></label></div>
      <div class="ligne2"><label>Catégorie<select name="categorie">${Object.entries(CATS).map(([k, [i, t, d]]) => `<option value="${k}" ${k === x.categorie ? 'selected' : ''}>${i} ${t} (${d})</option>`).join('')}</select></label><label>Places passagers<input name="places" type="number" min="1" max="8" value="${x.places}"></label></div>
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> Je certifie détenir une carte professionnelle valide, une assurance pour le transport de personnes, et j’accepte les <a href="cgu.html" target="_blank">conditions chauffeurs</a>.</label>
      <button class="btn btn-p">${ch ? 'Enregistrer' : 'Envoyer ma demande'}</button></form></div>`);
  $('#fCh').addEventListener('submit', async ev => {
    ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target));
    const l = { type: d.type, numero_carte: d.numero_carte.trim(), siret: d.siret.trim() || null, territoire: d.territoire, vehicule: d.vehicule.trim(), immatriculation: d.immatriculation.trim().toUpperCase(), couleur: d.couleur.trim() || null, categorie: d.categorie, places: +d.places };
    try { if (ch) await q(sb.from('chauffeurs').update(l).eq('id', moi.id)); else await q(sb.from('chauffeurs').insert(l)); toast(ch ? 'Enregistré.' : 'Demande envoyée, nous vous recontactons.'); aller('#/chauffeur'); }
    catch (err) { toast(erreur(err), true); }
  });
}

// ---------------------------------------------------------------- administration
async function adminWoulib() {
  if (!exigeCompte()) return;
  if (profil?.role !== 'admin') return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  const [chs, tarifs] = await Promise.all([q(sb.from('chauffeurs').select('*').order('created_at', { ascending: false }).limit(100)), q(sb.from('tarifs_move').select('*').order('territoire').order('categorie'))]);
  const ids = [...new Set(chs.map(x => x.id))];
  const [pr, ct] = ids.length ? await Promise.all([q(sb.from('profiles').select('id, prenom, nom').in('id', ids)), q(sb.from('contacts').select('*').in('id', ids))]) : [[], []];
  const terrA = param().t || 'Martinique';
  vue(`<div class="wrap" style="padding-top:22px">${ongletsAdmin('woulib')}<h2>Chauffeurs (${chs.length})</h2>
    ${chs.map(x => { const p = pr.find(y => y.id === x.id), c = ct.find(y => y.id === x.id); return `<div class="ligne-l" style="grid-template-columns:1fr auto"><div><b>${esc(p?.prenom)} ${esc(p?.nom)}</b> ${tag(ST_CH[x.statut])} <span class="tag">${x.type.toUpperCase()}</span>
      <div class="muted petit">Carte ${esc(x.numero_carte)}${x.siret ? ' · SIRET ' + esc(x.siret) : ''} · ${esc(x.vehicule)} ${esc(x.couleur || '')} · ${esc(x.immatriculation)} · ${CATS[x.categorie][1]} · ${esc(x.territoire)}</div>
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

