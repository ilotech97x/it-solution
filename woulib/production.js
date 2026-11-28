/* Woulib « prête pour la production » : moyens de paiement, acceptation des conditions, espace livreur, carte en direct, covoiturage.
   Tout reste caché tant que production.sql n'est pas installé (PROD_V1, testé dans chargerRegistre d'app.js). Montants, statuts et gains : calculés en SQL.
   Fichier entouré d'une IIFE : tous les JS d'une appli partagent la même portée globale ; seuls les noms exposés à la fin sont globaux. */
(() => {
'use strict';
const actif = () => typeof PROD_V1 !== 'undefined' && PROD_V1;
const MODES_P = { especes: ['💶', 'Espèces'], carte_livreur: ['💳', 'Carte au livreur'], virement: ['🏦', 'Virement'], en_ligne: ['🔒', 'Payé en ligne'] };
const enLigneOuvert = (u, terr) => reglage(u, terr, 'paiement_en_ligne') === true;   // interrupteur de l'administration, contrôlé aussi par la base

// ---------------------------------------------------------------- choix du moyen de paiement + acceptation des CGV (dans les formulaires de commande)
// opt : { virement, emporter } ; la carte au livreur disparaît si data-mode="emporter" (food.js change l'attribut)
function htmlPaiement(u, terr, opt = {}) {
  if (!actif()) return '';
  const lieu = u === 'move' ? 'à bord' : 'à la remise', pro = u === 'move' ? 'chauffeur' : 'livreur';
  const o = [['especes', '💶', 'Espèces', opt.emporter ? 'À régler sur place' : `À régler ${lieu}`, ''],
    ['carte_livreur', '💳', `Carte bancaire au ${pro}`, `Terminal de paiement SumUp du ${pro}`, 'pai-liv'],
    ...opt.virement ? [['virement', '🏦', 'Virement', 'Le commerçant vous donne ses coordonnées ; préparé à réception', '']] : [],
    ...enLigneOuvert(u, terr) ? [['en_ligne', '🔒', 'Payer en ligne maintenant', 'Carte bancaire sécurisée (Stripe)', '']] : []];
  return `<fieldset class="pai" data-mode="${opt.emporter ? 'emporter' : 'livraison'}"><legend>Paiement</legend>
    ${o.map(([k, i, t, s, c], n) => `<label class="pai-o ${c}"><input type="radio" name="paiement" value="${k}" ${n === 0 ? 'checked' : ''}><span class="pai-i" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(s)}</small></span></label>`).join('')}
    </fieldset>${htmlCgv(u === 'food')}`;
}
const htmlCgv = repas => `<label class="pai-cgv"><input type="checkbox" name="cgv" required><span>J’ai lu et j’accepte les <a href="cgv.html" target="_blank" rel="noopener">conditions de vente</a>${repas ? ' (repas : pas de droit de rétractation, art. L221-28)' : ''}.</span></label>`;

// après la création de la commande / de la course / du colis : enregistre le moyen choisi et l'acceptation (horodatée en SQL) ; renvoie true si on part payer en ligne
async function appliquerPaiement(type, id, d) {
  if (!actif()) return false;
  await q(sb.rpc('woulib_choisir_paiement', { typ: type, oid: id, mode_p: d.paiement || 'especes', cgv_ok: !!d.cgv }));
  return d.paiement === 'en_ligne' ? payerEnLigne(type, id) : false;
}
async function payerEnLigne(type, id) {
  try {
    const { data, error } = await sb.functions.invoke('woulib-paiement', { body: { type, id } });
    if (error || !data?.url || !/^https:\/\/checkout\.stripe\.com\//.test(data.url)) throw error || new Error('pas d’adresse de paiement');
    location.href = data.url; return true;
  } catch (e) { toast('Le paiement en ligne n’a pas pu démarrer. Vous pourrez le relancer depuis votre commande.', true); return false; }
}
// phrase d'état d'un paiement (commande, colis ou course : mêmes colonnes)
function libellePaiement(o, remise) {
  const m = MODES_P[o.paiement] || MODES_P.especes;
  if (o.paiement_statut === 'paye') return `✓ Payé · ${m[1].toLowerCase()}`;
  return { especes: `💶 Espèces ${remise || 'à la remise'}`, carte_livreur: '💳 Carte bancaire au livreur, à la remise', virement: '🏦 Virement : en attente de réception par le commerçant', en_ligne: '🔒 Paiement en ligne : à régler' }[o.paiement] || m[1];
}
const puceP = o => `<span class="pai-puce ${o.paiement_statut === 'paye' ? 'ok' : 'due'}">${esc(libellePaiement(o))}</span>`;
// bouton « Payer maintenant » (suivi du client) quand le paiement en ligne n'est pas encore passé
const boutonPayer = (type, o) => actif() && o.paiement === 'en_ligne' && o.paiement_statut !== 'paye' && !['annulee', 'refusee', 'annule', 'expiree'].includes(o.statut)
  ? `<div class="panneau pai-payer"><b>🔒 Paiement en ligne en attente</b><button class="btn btn-p" data-payer="${type}:${o.id}">Payer ${eur(o.total ?? o.prix ?? o.prix_estime)} maintenant</button></div>` : '';
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-payer]'); if (!b) return; const [type, id] = b.dataset.payer.split(':'); b.disabled = true;
  if (!await payerEnLigne(type, id)) b.disabled = false;
});
addEventListener('hashchange', () => { if (/[?&]paiement=ok/.test(location.hash)) toast('Merci ! Votre paiement est en cours de confirmation.'); });

// ---------------------------------------------------------------- encaissement par le livreur / chauffeur
const itineraires = (lat, lng, adr) => {
  const g = lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}` : adr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adr)}` : null;
  const w = lat != null ? `https://waze.com/ul?ll=${lat},${lng}&navigate=yes` : adr ? `https://waze.com/ul?q=${encodeURIComponent(adr)}&navigate=yes` : null;
  return (g ? `<a class="btn btn-s" href="${g}" target="_blank" rel="noopener">🧭 Google Maps</a>` : '') + (w ? `<a class="btn btn-s" href="${w}" target="_blank" rel="noopener">Waze</a>` : '');
};
const htmlEncaissement = (it, typ) => {
  const du = Number(it.a_encaisser) > 0;
  return `<div class="enc ${du ? 'due' : 'ok'}" data-typ="${typ}" data-id="${it.id}"><div><b>${du ? `À encaisser : ${eur(it.a_encaisser)}` : it.paiement_statut === 'paye' ? '✓ Encaissé / payé' : 'Rien à encaisser'}</b>
    <small>${esc(libellePaiement(it))}${it.paiement === 'virement' || it.paiement === 'en_ligne' ? ' : le client a déjà réglé, ne demandez rien' : ''}</small></div>
    ${du && ['recuperee', 'livree'].includes(it.statut) ? `<div class="actions"><button class="btn btn-s btn-ok" data-enc="especes">💶 Espèces reçues</button><button class="btn btn-s btn-ok" data-enc="carte_livreur">💳 Carte payée</button></div>` : du ? '<small>Vous pourrez confirmer l’encaissement après avoir récupéré la commande.</small>' : ''}</div>`;
};
async function infoMission(id) {
  const t = await q(sb.rpc('livreur_tableau')).catch(() => null);
  return t ? [...t.acceptees, ...t.en_cours, ...t.terminees].find(x => x.id === id) : null;
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-enc]'); if (!b) return; const z = b.closest('.enc'); b.disabled = true;
  try {
    const m = await q(sb.rpc('confirmer_encaissement', { typ: z.dataset.typ, oid: z.dataset.id, mode_reel: b.dataset.enc }));
    toast(Number(m) > 0 ? `✅ ${eur(m)} encaissés, c’est noté.` : 'Déjà enregistré.');
    const it = await infoMission(z.dataset.id); if (it) z.outerHTML = htmlEncaissement(it, z.dataset.typ);
  } catch (err) { toast(erreur(err), true); b.disabled = false; }
});
// bloc de la page de mission (livraison de repas) : récupère les infos de paiement avec le tableau
async function blocMission(id, typ) {
  if (!actif()) return '';
  const it = await infoMission(id); return it ? htmlEncaissement(it, typ || 'livraison') : '';
}

// ---------------------------------------------------------------- partage de la position (accord obligatoire)
async function blocPartage() {
  if (!actif() || !moi) return '';
  const r = await q(sb.from('partage_position').select('accepte').maybeSingle()).catch(() => null);
  return `<label class="partage-p"><input type="checkbox" id="partagePos" ${r?.accepte ? 'checked' : ''}><span><b>Apparaître sur la carte</b><small>Quand vous êtes en ligne, un point approximatif (environ 500 m, sans nom) s’affiche pour le public. Retirable à tout moment. <a href="conditions-livreurs.html" target="_blank" rel="noopener">En savoir plus</a></small></span></label>`;
}
document.addEventListener('change', async ev => {
  if (ev.target.id !== 'partagePos') return; const c = ev.target;
  try { await q(sb.rpc('regler_partage', { accepte_p: c.checked })); toast(c.checked ? 'Vous apparaîtrez sur la carte quand vous êtes en ligne.' : 'Votre position n’est plus partagée.'); }
  catch (err) { c.checked = !c.checked; toast(erreur(err), true); }
});

// ---------------------------------------------------------------- carte en direct (Mobility et Delivery) : seulement les personnes en ligne ayant accepté, point arrondi, masqué après 2 min
const LIVE = { livreur: ['🛵', 'Livreur en ligne'], vtc: ['🚗', 'Chauffeur VTC'], taxi: ['🚕', 'Taxi'], covoiturage: ['🚙', 'Covoiturage'] };
function carteLive(L, carte, terr, opt = {}) {
  if (!actif() || !L || !carte) return () => {};
  const roles = opt.roles || ['livreur', 'vtc', 'taxi', 'covoiturage'], calque = L.layerGroup().addTo(carte);
  const mk = (h, cls, titre) => L.divIcon({ className: 'mk ' + cls, html: `<span title="${esc(titre)}">${h}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] });
  let arrete = false;
  const rafraichir = async () => {
    if (arrete || !document.body.contains(carte.getContainer())) { arrete = true; clearInterval(t); return; }
    if (document.hidden) return;
    const [pos, stops] = await Promise.all([q(sb.from('carte_live').select('role, lat, lng').eq('territoire', terr).in('role', roles).limit(300)).catch(() => null),
      opt.stops ? q(sb.from('carte_stops').select('*').eq('territoire', terr).limit(80)).catch(() => []) : []]);
    if (arrete) return; calque.clearLayers();
    const n = {}; (pos || []).forEach(p => { n[p.role] = (n[p.role] || 0) + 1; L.marker([p.lat, p.lng], { icon: mk(LIVE[p.role][0], 'mk-live mk-' + p.role, LIVE[p.role][1]), keyboard: false }).bindTooltip(LIVE[p.role][1] + ' (position approximative)').addTo(calque); });
    (stops || []).forEach(s => s.arrets.forEach((a, i) => L.marker([a.lat, a.lng], { icon: mk('🚏', 'mk-live mk-stop', 'Arrêt de covoiturage'), keyboard: false })
      .bindPopup(`<div class="pop-cv"><b>${esc(s.depart_txt)} → ${esc(s.arrivee_txt)}</b><br>🕒 ${esc(jourHeure(s.heure))} · ${s.places} place${s.places > 1 ? 's' : ''} · ${eur(s.participation)} / pers. (partage de frais)<br>
        Arrêts : ${s.arrets.map((x, j) => (j === i ? '<b>' : '') + esc(x.nom) + (j === i ? '</b>' : '')).join(' → ')}<br>
        <input type="tel" data-cv-tel placeholder="Votre téléphone" autocomplete="tel"><button class="btn btn-s btn-p" data-cv-place="${s.id}">Demander une place</button></div>`).addTo(calque)));
    if (opt.legende && $(opt.legende)) {
      const court = { livreur: 'livreur en ligne', vtc: 'VTC', taxi: 'taxi', covoiturage: 'covoit.' };
      const l = roles.filter(r => LIVE[r]).map(r => `<span title="${esc(LIVE[r][1])}">${LIVE[r][0]} ${n[r] || 0} ${court[r]}${r === 'livreur' && (n[r] || 0) > 1 ? 's' : ''}</span>`);
      if (opt.stops) l.push(`<span>🚏 ${(stops || []).length} arrêt${(stops || []).length > 1 ? 's' : ''} de covoiturage</span>`);
      $(opt.legende).innerHTML = l.join('');
      $(opt.legende).title = 'Positions approximatives, actualisées toutes les 15 secondes';
    }
  };
  const t = setInterval(rafraichir, 15000); rafraichir();
  return () => { arrete = true; clearInterval(t); calque.remove(); };
}
document.addEventListener('click', async ev => {
  const b = ev.target.closest('[data-cv-place]'); if (!b) return;
  if (!exigeCompte()) return; const tel = b.parentElement.querySelector('[data-cv-tel]')?.value.trim() || '';
  if (!/^[0-9 +().-]{6,20}$/.test(tel)) return toast('Indiquez votre numéro de téléphone.', true);
  b.disabled = true;
  try { await q(sb.rpc('covoiturage_demander', { cid: b.dataset.cvPlace, tel })); toast('🚙 Demande envoyée : le conducteur vous appellera.'); }
  catch (err) { toast(erreur(err), true); b.disabled = false; }
});

// ---------------------------------------------------------------- espace livreur : tout voir au même endroit
const ST_M = { acceptee: ['ok', 'Vers le retrait'], au_restaurant: ['ok', 'Sur place'], recuperee: ['ok', 'En livraison'], livree: ['gris', 'Terminée'], echec: ['ko', 'Non livrée'], annulee: ['ko', 'Annulée'] };
let ongletLv = 'dispo', minLv = null;
const lienMission = m => (m.type === 'colis' ? '#/colis/' : '#/livraison/') + m.id;
const etape = (lettre, titre, p) => `<div class="lv-etape"><i aria-hidden="true">${lettre}</i><div><b>${esc(titre)}</b>${p.nom ? ` · ${esc(p.nom)}` : ''}<div class="petit">${esc([p.adresse, p.commune].filter(Boolean).join(', ') || 'Adresse non précisée')}${p.note ? `<br>📝 ${esc(p.note)}` : ''}</div>
  <div class="actions">${itineraires(p.lat, p.lng, [p.adresse, p.commune].filter(Boolean).join(', '))}${p.telephone ? `<a class="btn btn-s" href="tel:${esc(p.telephone)}">📞 ${esc(p.telephone)}</a>` : ''}</div></div></div>`;
function carteMission(m, avecEncaisser) {
  return `<article class="lv-c"><header><span class="lv-type">${m.type === 'colis' ? '📦 Colis' : '🍱 Repas'}</span>${tag(ST_M[m.statut] || ['gris', m.statut])}<b class="lv-gain">+ ${eur(m.gain)}</b></header>
    <h3>${esc(m.titre)}${m.articles > 1 ? ` <small>· ${m.articles} articles</small>` : ''}</h3>${m.distance_km != null ? `<p class="muted petit" style="margin:0 0 6px">Trajet ${String(m.distance_km).replace('.', ',')} km</p>` : ''}
    ${htmlEncaissement(m, m.type === 'colis' ? 'colis' : 'livraison')}${etape('A', 'Retrait', m.de)}${m.vers ? etape('B', 'Livraison', m.vers) : ''}
    <div class="actions"><a class="btn btn-p" href="${lienMission(m)}">Ouvrir la mission</a></div></article>`;
}
const carteDispo = m => `<article class="lv-c"><header><span class="lv-type">${m.type === 'colis' ? '📦 Colis' : '🍱 Repas'}</span><b class="lv-gain">+ ${eur(m.gain)}</b></header>
  <h3>${esc(m.titre)}</h3><p class="petit" style="margin:0">${esc(m.de_commune || '')} → ${esc(m.vers_commune || '?')}</p>
  <p class="muted petit" style="margin:2px 0 8px">${m.jusqu != null ? `à ${m.jusqu} km de vous · ` : ''}${m.distance_km != null ? `trajet ${String(m.distance_km).replace('.', ',')} km · ` : ''}${m.articles || 1} article(s)</p>
  <div class="enc ${Number(m.a_encaisser) > 0 ? 'due' : 'ok'}"><div><b>${Number(m.a_encaisser) > 0 ? `À encaisser : ${eur(m.a_encaisser)}` : 'Rien à encaisser'}</b><small>${esc(libellePaiement({ paiement: m.paiement, paiement_statut: 'a_encaisser' }))}</small></div></div>
  <div class="actions"><button class="btn btn-p" data-lv-prendre="${m.type}:${m.id}">Accepter</button></div></article>`;
const vide = (i, t, s) => `<div class="vide-etat"><div class="ico">${i}</div><h3>${t}</h3><p class="muted">${s}</p></div>`;

APP.pages.livreur = async () => {
  if (!moi) return vue(`<section class="hero"><div class="wrap"><div class="press">🛵 Livreurs</div><h1>Votre espace livreur</h1><p>Connectez-vous pour voir vos missions.</p><div class="actions"><a class="btn btn-p" href="#/connexion?retour=%23%2Flivreur">Connexion</a></div></div></section>`);
  await chargerRegistre(); if (!actif()) return rediriger('#/chauffeur');
  const dessiner = async () => {
    let t; try { t = await q(sb.rpc('livreur_tableau')); } catch (e) { return rediriger('#/chauffeur'); }
    const part = await blocPartage();
    partagerPosition(t.en_ligne || t.acceptees.length > 0 || t.en_cours.length > 0);
    const onglets = [['dispo', 'À prendre', t.disponibles.length], ['acceptees', 'Acceptées', t.acceptees.length], ['cours', 'En cours', t.en_cours.length], ['fin', 'Terminées', t.terminees.length]];
    const liste = { dispo: t.disponibles.length ? t.disponibles.map(carteDispo).join('') : (t.en_ligne ? vide('🛵', 'Aucune mission pour l’instant', 'Vous serez prévenu dès qu’un restaurant ou un client en publie une près de vous.') : vide('⚪', 'Vous êtes hors ligne', 'Passez en ligne pour recevoir des missions.')),
      acceptees: t.acceptees.length ? t.acceptees.map(m => carteMission(m)).join('') : vide('📋', 'Rien d’accepté', 'Les missions que vous acceptez apparaissent ici.'),
      cours: t.en_cours.length ? t.en_cours.map(m => carteMission(m)).join('') : vide('🚀', 'Aucune livraison en cours', 'Une fois la commande récupérée, elle passe ici.'),
      fin: t.terminees.length ? t.terminees.map(m => `<div class="lv-fin"><div><b>${esc(m.titre)}</b><small>${esc(m.type === 'colis' ? 'Colis' : 'Repas')} · ${esc(jourHeure(m.fin_at || m.maj_at))} · ${esc(libellePaiement(m))}</small></div><b>${m.statut === 'livree' ? '+ ' + eur(m.gain) : tag(ST_M[m.statut])}</b></div>`).join('') : vide('🏁', 'Pas encore de mission terminée', 'Vos 30 derniers jours s’afficheront ici.') }[ongletLv];
    vue(`<div class="wrap lv-p"><div class="lv-tete"><div><h1>Espace livreur</h1><small class="muted">${esc(t.territoire)}</small></div>
      <button class="lv-onoff ${t.en_ligne ? 'on' : ''}" id="lvOnOff" aria-pressed="${t.en_ligne}"><span class="pt"></span>${t.en_ligne ? 'En ligne' : 'Hors ligne'}</button></div>
      ${part}
      <div class="lv-gains"><div><small>Aujourd’hui</small><b>${eur(t.gains.jour)}</b><span>${t.gains.nb_jour} livraison${t.gains.nb_jour > 1 ? 's' : ''}</span></div><div><small>7 derniers jours</small><b>${eur(t.gains.semaine)}</b><span>${t.gains.nb_semaine} livraison${t.gains.nb_semaine > 1 ? 's' : ''}</span></div></div>
      ${t.a_reverser?.length ? `<div class="panneau lv-rev"><b>💶 À remettre aux restaurants</b>${t.a_reverser.map(x => `<div><span>${esc(x.nom)}</span><b>${eur(x.montant)}</b></div>`).join('')}</div>` : ''}
      <div class="lv-onglets" role="tablist">${onglets.map(([k, n, c]) => `<button role="tab" aria-selected="${k === ongletLv}" data-lv-onglet="${k}">${n}${c ? `<i>${c}</i>` : ''}</button>`).join('')}</div>
      <div class="lv-liste">${liste}</div>
      <p class="muted petit">Gains calculés par Woulib (frais de livraison, colis). <a href="#/chauffeur">Espace chauffeur complet</a> · <a href="conditions-livreurs.html" target="_blank" rel="noopener">Conditions livreurs</a></p></div>`);
  };
  await dessiner();
  $('#app').onclick = async ev => {
    const o = ev.target.closest('[data-lv-onglet]'), p = ev.target.closest('[data-lv-prendre]'), s = ev.target.closest('#lvOnOff');
    try {
      if (o) { ongletLv = o.dataset.lvOnglet; return dessiner(); }
      if (s) { s.disabled = true; await q(sb.from('chauffeurs').update({ disponible: s.getAttribute('aria-pressed') !== 'true' }).eq('id', moi.id)); return dessiner(); }
      if (p) {
        p.disabled = true; const [type, id] = p.dataset.lvPrendre.split(':');
        if (type === 'colis') { await q(sb.rpc('accepter_colis', { cid: id })); toast('📦 Colis accepté !'); return aller('#/colis/' + id); }
        const lid = await q(sb.rpc('accepter_livraison', { lid: id })); toast('🛵 Livraison acceptée !'); return aller('#/livraison/' + lid);
      }
    } catch (err) { toast(erreur(err), true); dessiner().catch(() => {}); }
  };
  clearInterval(minLv); minLv = setInterval(() => { if (location.hash.startsWith('#/livreur') && !document.hidden && !enSaisie()) dessiner().catch(() => {}); else if (!location.hash.startsWith('#/livreur')) clearInterval(minLv); }, 10000);
};

// ---------------------------------------------------------------- proposer un covoiturage (partage de frais, arrêts affichés sur la carte)
APP.pages.covoiturage = async () => {
  if (!exigeCompte()) return;
  await chargerRegistre(); if (!actif()) return rediriger('#/bouger');
  const terr = terrPrefere() || 'Martinique';
  const dessiner = async () => {
    const mes = await q(sb.from('covoiturages').select('*').eq('conducteur_id', moi.id).in('statut', ['ouvert', 'complet']).gt('heure', new Date(Date.now() - 3 * 36e5).toISOString()).order('heure'));
    const part = await blocPartage();
    vue(`<div class="wrap" style="padding-top:22px;max-width:640px"><a href="#/bouger" class="petit">← Mobility</a><h1>Proposer un covoiturage</h1>
      <p class="muted">Vous faites déjà le trajet : partagez les frais avec des voisins (jamais de bénéfice : participation plafonnée à 30 € par personne). Vos arrêts s’affichent sur la carte de Mobility.</p>
      <form class="f" id="fCv"><label>Arrêts, du départ à l’arrivée <span class="aide">(un par ligne, 2 à 6)</span><textarea name="arrets" required rows="4" placeholder="Parking du Carrefour, Le Lamentin&#10;Gare routière, Fort-de-France"></textarea></label>
        <div class="ligne2"><label>Départ<input name="heure" type="datetime-local" required></label><label>Places<input name="places" type="number" min="1" max="8" value="3" required></label></div>
        <label>Participation par personne (€) <span class="aide">(partage des frais d’essence et de péage)</span><input name="participation" type="number" min="0" max="30" step="0.5" value="3" required></label>
        <label class="pai-cgv"><input type="checkbox" name="frais" required><span>Je confirme que je partage seulement les frais du trajet que je fais de toute façon, sans bénéfice, et que mon véhicule est assuré. <a href="conditions-livreurs.html" target="_blank" rel="noopener">Conditions</a></span></label>
        <button class="btn btn-p">Publier mon covoiturage</button></form>
      <h2 style="margin-top:24px">Mes covoiturages à venir</h2>
      ${mes.length ? mes.map(v => `<div class="panneau" style="margin-bottom:8px"><b>${esc(v.depart_txt)} → ${esc(v.arrivee_txt)}</b><div class="muted petit">${esc(jourHeure(v.heure))} · ${v.places} place(s) · ${eur(v.participation)} · ${v.arrets.length} arrêts</div>
        <div class="actions" style="margin-top:6px"><button class="btn btn-s" data-cv-suivre="1">📍 Partager ma position maintenant</button><button class="btn btn-s btn-ko" data-cv-annuler="${v.id}">Annuler</button></div></div>`).join('') : '<p class="muted">Aucun pour l’instant.</p>'}
      ${mes.length ? part : ''}</div>`);
    $('#fCv').addEventListener('submit', async e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
      try {
        const noms = d.arrets.split('\n').map(x => x.trim()).filter(Boolean); if (noms.length < 2 || noms.length > 6) throw new Error('Indiquez de 2 à 6 arrêts, un par ligne.');
        const arrets = []; for (const nom of noms) { const r = (await geocoder(nom, terr))[0]; if (!r) throw new Error(`Lieu introuvable : « ${nom} ». Ajoutez la commune.`); arrets.push({ nom: nom.slice(0, 80), lat: r.lat, lng: r.lng }); }
        await q(sb.from('covoiturages').insert({ territoire: terr, depart_txt: noms[0].slice(0, 120), arrivee_txt: noms[noms.length - 1].slice(0, 120), arrets, heure: new Date(d.heure).toISOString(), places: +d.places, participation: +d.participation }));
        toast('🚙 Covoiturage publié : ses arrêts sont sur la carte.'); dessiner();
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    });
    $('#app').onclick = async ev => {
      const a = ev.target.closest('[data-cv-annuler]'), s = ev.target.closest('[data-cv-suivre]');
      try {
        if (a && confirm('Annuler ce covoiturage ?')) { await q(sb.from('covoiturages').update({ statut: 'annule' }).eq('id', a.dataset.cvAnnuler)); dessiner(); }
        if (s) {
          if (!navigator.geolocation) return toast('Position indisponible sur cet appareil.', true);
          const r = await q(sb.from('partage_position').select('accepte').maybeSingle()).catch(() => null); if (!r?.accepte) return toast('Cochez d’abord « Apparaître sur la carte ».', true);
          let dernier = 0; navigator.geolocation.watchPosition(p => { if (Date.now() - dernier < 15000) return; dernier = Date.now(); sb.rpc('partager_position_covoiturage', { plat: p.coords.latitude, plng: p.coords.longitude }).then(() => {}); }, () => toast('Autorisez la localisation.', true), { enableHighAccuracy: true, maximumAge: 10000 });
          toast('📍 Votre position est partagée tant que cette page reste ouverte.'); s.disabled = true;
        }
      } catch (err) { toast(erreur(err), true); }
    };
  };
  await dessiner();
};

// ---------------------------------------------------------------- acceptation des conditions livreurs / commerçants (appelée après l'inscription)
const accepterDocument = (doc, obj, id) => actif() ? q(sb.rpc('accepter_document', { doc, obj: obj || null, obj_id: id || null })).catch(() => {}) : Promise.resolve();
const htmlCondPro = doc => `<label class="pai-cgv"><input type="checkbox" name="cond_pro" required><span>J’ai lu et j’accepte les <a href="${doc === 'livreurs' ? 'conditions-livreurs.html' : 'conditions-commercants.html'}" target="_blank" rel="noopener">conditions ${doc === 'livreurs' ? 'des livreurs et chauffeurs' : 'des commerçants et restaurants'}</a>.</span></label>`;

Object.assign(window, { htmlEncaissement, htmlPaiement, htmlCgv, appliquerPaiement, payerEnLigne, libellePaiement, puceP, boutonPayer, blocMission, blocPartage, carteLive, accepterDocument, htmlCondPro, itineraires });
})();
