/* Woulib Express : envoyer un colis, le suivre, et la mission du livreur. Prix, attribution et code de remise contrôlés par la base (express.sql).
   APP et registre : app.js ; carte, recherche d'adresse : commun/base.js ; GPS : gps.js. */
'use strict';
const TAILLES = { enveloppe: ['✉️', 'Enveloppe', 'Documents, clés'], petit: ['📦', 'Petit', 'Tient dans un sac'], moyen: ['🗃️', 'Moyen', 'Carton jusqu’à 10 kg'], grand: ['🛋️', 'Grand', 'Jusqu’à 25 kg'] };
const ETAPES_COLIS = [['recherche', '🔎', 'Recherche'], ['acceptee', '🛵', 'Vers le retrait'], ['recupere', '📦', 'En route'], ['livre', '🎉', 'Livré']];
const ST_COLIS = { recherche: ['att', 'Recherche d’un livreur'], acceptee: ['ok', 'Livreur en route'], recupere: ['ok', 'En livraison'], livre: ['gris', 'Livré'], annule: ['ko', 'Annulé'], echec: ['ko', 'Non remis'] };

declarerUnivers('express', { routes: /^#\/(express|colis)\b/, zone: 'move', accueil: '#/express', appel: 'Envoyer un colis' });

// ---------------------------------------------------------------- envoyer
APP.pages.express = async () => {
  await chargerRegistre(); if (!universOuvert('express')) return universFerme('express');
  let terr = terrPrefere() || profil?.territoire || 'Martinique'; if (!TERRITOIRES[terr] || terr === 'Autre pays') terr = 'Martinique';
  const pts = { retrait: null, depot: null }; let taille = 'petit', estim = {}, L = null, carte = null, calques = null;
  vue(`<div class="wrap page-move"><h1 class="titre-move">Delivery</h1><p class="muted" style="margin:-6px 0 14px">📦 Envoyer un colis : un livreur vérifié le récupère et le livre.</p><div class="fiche fiche-d"><div><div id="carte" class="carte-move"></div></div>
    <aside><form class="f panier colle" id="fColis">
      ${['retrait', 'depot'].map(k => `<div><label>${k === 'retrait' ? '📦 Où récupérer le colis' : '🏁 Où le livrer'}<div style="display:flex;gap:6px"><input id="${k}" placeholder="Adresse, quartier, commerce…" autocomplete="off" maxlength="200" style="flex:1">
        <button type="button" class="btn btn-s" data-chercher="${k}" aria-label="Chercher">🔎</button></div></label><div id="res-${k}" class="petit"></div>
        ${k === 'retrait' ? '<div class="puces" style="margin:6px 0 0"><a href="#" data-mapos="1">📍 Ma position</a></div>' : ''}</div>`).join('')}
      <div class="types tailles">${Object.entries(TAILLES).map(([k, [i, t, d]]) => `<button type="button" class="type" data-taille="${k}"><span><b>${i} ${t}</b><div class="muted petit">${d}</div></span><span class="prix" id="tx-${k}">—</span></button>`).join('')}</div>
      <label>Qu’est-ce que c’est ?<input name="quoi" required minlength="2" maxlength="300" placeholder="Clés, documents, petit carton…"></label>
      <div class="ligne2"><label>Nom du destinataire<input name="nom" required maxlength="80"></label><label>Son téléphone<input name="tel_dest" type="tel" required pattern="[0-9 +]{6,20}"></label></div>
      <label>Votre téléphone<input name="tel" type="tel" required pattern="[0-9 +]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
      <details class="plus-options"><summary>💶 Qui paie, message pour le livreur</summary>
        <label>Qui paie le livreur ?<select name="payeur"><option value="expediteur">Moi, au retrait du colis</option><option value="destinataire">Le destinataire, à la livraison</option></select></label>
        <label>Message pour le livreur<input name="note" maxlength="300" placeholder="Code du portail, étage, fragile…"></label></details>
      <div id="total"></div><button class="btn btn-p" id="envoyer">Envoyer le colis</button>
      <p class="muted petit" style="margin:0">Livreurs vérifiés. Prix selon la distance et la taille, réglé directement au livreur. Interdits : objets illégaux ou dangereux, argent liquide, animaux.</p></form></aside></div></div>`);
  const majPrix = () => {
    Object.keys(TAILLES).forEach(k => { $('#tx-' + k).textContent = estim[k] ? eur(estim[k].prix) : '—'; document.querySelector(`[data-taille="${k}"]`).classList.toggle('on', k === taille); });
    $('#total').innerHTML = estim[taille] ? `<div style="font:700 26px var(--titres)">${eur(estim[taille].prix)} <span class="muted petit" style="font:600 14px var(--texte)">· ${estim[taille].distance_km} km environ</span></div>` : '';
  };
  const estimer = async () => {
    estim = {}; majPrix(); if (!pts.retrait || !pts.depot) return;
    await Promise.all(Object.keys(TAILLES).map(async k => { try { estim[k] = (await q(sb.rpc('estimer_colis', { terr, taille_c: k, dlat: pts.retrait.lat, dlng: pts.retrait.lng, alat: pts.depot.lat, alng: pts.depot.lng })))[0]; } catch (err) { if (k === taille) toast(erreur(err), true); } }));
    majPrix();
  };
  const dessinerCarte = () => {
    if (!L) return; calques.clearLayers();
    const m = ['retrait', 'depot'].filter(k => pts[k]).map(k => L.circleMarker([pts[k].lat, pts[k].lng], { radius: 11, color: '#fff', weight: 3, fillColor: k === 'retrait' ? '#FFB020' : '#0B2545', fillOpacity: 1 }).bindTooltip(k === 'retrait' ? 'Retrait' : 'Livraison').addTo(calques));
    if (pts.retrait && pts.depot) { L.polyline([[pts.retrait.lat, pts.retrait.lng], [pts.depot.lat, pts.depot.lng]], { color: '#2563EB', weight: 4, dashArray: '8 8' }).addTo(calques); carte.fitBounds(L.featureGroup(m).getBounds().pad(0.3)); }
    else if (m.length) carte.setView(m[0].getLatLng(), 14);
  };
  const choisir = (k, p) => { pts[k] = p; $('#' + k).value = p.nom.split(',').slice(0, 3).join(','); $('#res-' + k).innerHTML = ''; dessinerCarte(); estimer(); };
  const chercher = async k => {
    const t = $('#' + k).value.trim(); if (t.length < 3) return toast('Écrivez au moins 3 lettres.', true);
    $('#res-' + k).textContent = 'Recherche…';
    try {
      const l = await geocoder(t, terr);
      $('#res-' + k).innerHTML = l.length ? l.map((x, i) => `<button type="button" class="lien" data-res="${i}" style="display:block;text-align:left;margin:4px 0">📍 ${esc(x.nom)}</button>`).join('') : 'Aucun lieu trouvé : précisez la ville.';
      $('#res-' + k).onclick = ev => { const b = ev.target.closest('[data-res]'); if (b) choisir(k, l[b.dataset.res]); };
    } catch (err) { $('#res-' + k).textContent = 'Recherche indisponible, réessayez.'; }
  };
  ['retrait', 'depot'].forEach(k => $('#' + k).addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); chercher(k); } }));
  $('#fColis').addEventListener('click', ev => {
    const c = ev.target.closest('[data-chercher]'), t = ev.target.closest('[data-taille]'), g = ev.target.closest('[data-mapos]');
    if (c) chercher(c.dataset.chercher);
    if (t) { taille = t.dataset.taille; majPrix(); }
    if (g) { ev.preventDefault(); navigator.geolocation?.getCurrentPosition(p => choisir('retrait', { nom: 'Ma position', lat: p.coords.latitude, lng: p.coords.longitude }), () => toast('Autorisez la localisation ou écrivez l’adresse.', true), { enableHighAccuracy: true, timeout: 12000 }); }
  });
  majPrix();
  $('#fColis').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!exigeCompte()) return;
    if (!pts.retrait || !pts.depot) return toast('Choisissez l’adresse de retrait et de livraison (bouton 🔎).', true);
    const d = Object.fromEntries(new FormData(ev.target)), b = $('#envoyer'); b.disabled = true;
    try {
      const id = await q(sb.rpc('envoyer_colis', { terr, taille_c: taille, quoi: d.quoi, retrait: $('#retrait').value.trim(), dlat: pts.retrait.lat, dlng: pts.retrait.lng, tel_retrait: d.tel.trim(),
        depot: $('#depot').value.trim(), alat: pts.depot.lat, alng: pts.depot.lng, nom_dest: d.nom.trim(), tel_dest: d.tel_dest.trim(), payeur: d.payeur, note_c: d.note || null }));
      toast('📦 Colis envoyé : nous prévenons les livreurs !'); aller('#/colis/' + id);
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  try { L = await chargerCarte(); const c = CENTRES[terr] || CENTRES.Martinique; carte = fondCarte(L, $('#carte'), [c[0], c[1]], c[2]); calques = L.layerGroup().addTo(carte); }
  catch (e) { $('#carte').innerHTML = '<p class="muted" style="padding:20px">Carte indisponible.</p>'; }
};

// ---------------------------------------------------------------- suivre (expéditeur) ou livrer (livreur)
APP.pages.colis = async id => {
  if (!exigeCompte()) return;
  if (!id) return rediriger('#/activite?f=colis');   // la liste des colis vit dans l'onglet Activité
  let L = null, carte = null, calques = null;
  const dessiner = async () => {
    const c = await q(sb.rpc('detail_colis', { cid: id }));
    const pos = ETAPES_COLIS.findIndex(e => e[0] === c.statut), fini = ['livre', 'annule', 'echec'].includes(c.statut), lv = c.livreur;
    if (!$('#carteColis')) vue(`<div class="wrap" style="padding-top:20px;max-width:900px"><a href="#/colis" class="petit">← Mes colis</a>
      <div class="fiche fiche-2"><div id="carteColis" style="height:360px;border-radius:24px;border:2px solid var(--ligne);background:var(--rose-doux)"></div><div id="infosColis"></div></div></div>`);
    $('#infosColis').innerHTML = `<div class="panneau"><span class="px">Colis ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(TAILLES[c.taille][0] + ' ' + TAILLES[c.taille][1])}</span>
      <h1 style="margin:6px 0;font-size:22px">${esc(c.description)}</h1>${tag(ST_COLIS[c.statut])}
      ${['annule', 'echec'].includes(c.statut) ? '' : `<div class="quetes" style="margin:12px 0">${ETAPES_COLIS.map((e, i) => `<div class="quete ${i < pos || c.statut === 'livre' ? 'faite' : i === pos ? 'actuelle' : ''}"><span class="q-coche">${i <= pos ? '✓' : ''}</span><span class="q-ico">${e[1]}</span><span class="q-titre">${e[2]}</span></div>`).join('')}</div>`}
      <p class="petit">📦 ${esc(c.retrait_txt)}<br>🏁 ${esc(c.depot_txt)} · pour <b>${esc(c.depot_nom)}</b></p>
      <div style="font:700 22px var(--titres)">${eur(c.prix)} <span class="muted petit" style="font:600 13px var(--texte)">· ${c.distance_km} km · payé par ${c.paye_par === 'expediteur' ? 'l’expéditeur au retrait' : 'le destinataire à la livraison'}</span></div>
      ${c.client && c.code && !fini ? `<div class="panneau" style="margin:12px 0;padding:12px;border-color:var(--jaune)"><span class="petit">Code à donner au destinataire (il le dit au livreur à la remise) :</span> <b class="code-remise">${esc(c.code)}</b>
        <div class="actions" style="margin-top:8px"><a class="btn btn-s btn-wa" target="_blank" rel="noopener" href="${wa(c.depot_tel, `Bonjour ${c.depot_nom}, un colis Woulib arrive pour vous (${c.description}). Code à donner au livreur : ${c.code}. Suivez-le avec l’expéditeur.`)}">Envoyer le code au destinataire</a></div></div>` : ''}
      ${lv ? `<p><b>🛵 ${esc(lv.prenom || 'Votre livreur')}</b> · ${esc(lv.vehicule || '')}${lv.telephone && c.client ? ` · <a href="tel:${esc(lv.telephone)}">📞 Appeler</a>` : ''}</p>` : c.statut === 'recherche' ? '<p class="muted">🔎 Nous prévenons les livreurs disponibles près du point de retrait…</p>' : ''}
      ${!c.client ? `<div class="actions" style="margin:10px 0">${c.statut === 'acceptee' ? `<a class="btn btn-s btn-j" href="${lienGps(c.retrait_lat, c.retrait_lng, 'Retrait du colis')}">🧭 GPS vers le retrait</a>` : c.statut === 'recupere' ? `<a class="btn btn-s btn-j" href="${lienGps(c.depot_lat, c.depot_lng, c.depot_nom)}">🧭 GPS vers le destinataire</a>` : ''}
          ${c.statut === 'acceptee' ? `<a class="btn btn-s" href="tel:${esc(c.retrait_tel)}">📞 Expéditeur</a>` : ''}${c.statut === 'recupere' ? `<a class="btn btn-s" href="tel:${esc(c.depot_tel)}">📞 Destinataire</a>` : ''}</div>
        ${c.statut === 'acceptee' ? '<div class="actions"><button class="btn btn-p" data-colis="recupere">📦 J’ai récupéré le colis</button><button class="btn btn-s btn-ko" data-colis="recherche">Me désister</button></div>' : ''}
        ${c.statut === 'recupere' ? `<form id="fCodeColis" class="f"><label>Code donné par le destinataire<input name="code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required placeholder="4 chiffres" style="font:700 26px var(--titres);letter-spacing:.3em;text-align:center"></label>
          <div class="actions"><button class="btn btn-p">🎉 Colis remis</button><button type="button" class="btn btn-s btn-ko" data-colis="echec">Personne / refus</button></div></form>` : ''}` : ''}
      ${c.client && ['recherche', 'acceptee'].includes(c.statut) ? '<button class="btn btn-s btn-ko" id="annulerColis">Annuler l’envoi</button>' : ''}
      ${c.client ? `<div class="actions" style="margin-top:10px"><a class="btn btn-s" href="#/assistance?sujet=colis&id=${id}">Un problème ?</a><button type="button" class="btn btn-s" data-signaler="colis" data-id="${id}" data-univers="express" data-nom="ce colis">🚩 Signaler</button></div>` : ''}</div>`;
    $('#annulerColis')?.addEventListener('click', async () => { if (!confirm('Annuler l’envoi du colis ?')) return; try { await q(sb.rpc('annuler_colis', { cid: id })); dessiner(); } catch (err) { toast(erreur(err), true); } });
    $('#fCodeColis')?.addEventListener('submit', async e => { e.preventDefault(); try { const r = await q(sb.rpc('avancer_colis', { cid: id, nouveau: 'livre', code_saisi: e.target.code.value })); toast(r === 'code_faux' ? 'Code incorrect : demandez-le à nouveau.' : '🎉 Colis remis, merci !', r === 'code_faux'); dessiner(); } catch (err) { toast(erreur(err), true); } });
    if (!L) { try { L = await chargerCarte(); carte = fondCarte(L, $('#carteColis'), [c.retrait_lat, c.retrait_lng], 13); calques = L.layerGroup().addTo(carte); } catch (e) { /* carte facultative */ } }
    if (L && carte) {
      calques.clearLayers();
      const m = [[c.retrait_lat, c.retrait_lng, '📦'], [c.depot_lat, c.depot_lng, '🏁'], ...(lv?.lat != null ? [[lv.lat, lv.lng, '🛵']] : [])].map(([a, b, e]) => L.marker([a, b], { icon: L.divIcon({ html: `<span style="font-size:28px">${e}</span>`, className: '', iconSize: [32, 32], iconAnchor: [16, 16] }) }).addTo(calques));
      carte.fitBounds(L.featureGroup(m).getBounds().pad(0.3));
    }
    if (fini) { clearInterval(minuterie); minuterie = null; }
  };
  try { await dessiner(); } catch (err) { return vue(`<div class="wrap vide-etat" style="margin-top:30px"><h3>${esc(erreur(err))}</h3><a class="btn" href="#/colis">Mes colis</a></div>`); }
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-colis]'); if (!b) return;
    if (b.dataset.colis === 'echec' && !confirm('Le colis n’a pas pu être remis ?')) return;
    try { await q(sb.rpc('avancer_colis', { cid: id, nouveau: b.dataset.colis })); if (b.dataset.colis === 'recherche') return aller('#/chauffeur'); dessiner(); } catch (err) { toast(erreur(err), true); }
  };
  clearInterval(minuterie); minuterie = setInterval(() => { if (location.hash.startsWith('#/colis/') && !document.hidden && !enSaisie()) dessiner().catch(() => {}); }, 10000);
};

// pour l'espace livreur (move.js) : colis à prendre et missions en cours
async function blocColisLivreur(ch) {
  await chargerRegistre();
  if (!BASE_V2 || !ch.livraisons) return '';
  const [dispo, miens] = await Promise.all([q(sb.rpc('colis_disponibles')).catch(() => []), q(sb.rpc('mes_colis')).catch(() => [])]);
  const actifs = miens.filter(c => c.role === 'livreur' && ['acceptee', 'recupere'].includes(c.statut));
  return `${actifs.length ? `<h2>📦 Mes colis en cours</h2>${actifs.map(c => `<a class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto;text-decoration:none;color:inherit" href="#/colis/${c.id}"><div><b>Pour ${esc(c.depot_nom)}</b> ${tag(ST_COLIS[c.statut])}<div class="muted petit">${eur(c.prix)}</div></div><span class="btn btn-s btn-p">Ouvrir</span></a>`).join('')}` : ''}
    <h2>📦 Colis à livrer (${dispo.length})</h2>${dispo.length ? dispo.map(c => `<div class="ligne-l" style="grid-template-columns:48px 1fr auto"><span style="font-size:32px">${TAILLES[c.taille][0]}</span>
      <div><b>${esc(c.depart.split(',').slice(0, 2).join(','))} → ${esc(c.arrivee)}</b><div class="muted petit">${esc(c.description)} · ${c.distance_km} km${c.jusqu_au_retrait != null ? ` · retrait à ${c.jusqu_au_retrait} km de vous` : ''}</div></div>
      <div style="text-align:right"><div class="prix">${eur(c.prix)}</div><button class="btn btn-s btn-ok" data-colis-ok="${c.id}">Accepter</button></div></div>`).join('')
      : '<p class="muted petit">Aucun colis pour l’instant : vous serez notifié dès qu’un envoi part près de vous.</p>'}`;
}
