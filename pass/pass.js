/* EventPass — billetterie et sorties, aux Antilles et partout ailleurs (IloTech). Même compte que Kaz An Nou.
   Données : Supabase ; règles de sécurité et fonctions de réservation côté base (eventpass.sql). */
'use strict';
if (window.top !== window.self) { try { window.top.location = window.location.href; } catch (e) { document.documentElement.style.display = 'none'; } }

const CFG = window.KAZ_CONFIG || {};
const PRET = !!(CFG.url && CFG.cle && window.supabase);
const sb = PRET ? window.supabase.createClient(CFG.url, CFG.cle, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;
const WA = '596696482678';   // territoires, fuseaux et indicatifs : commun/territoires.js

const CATS = { concert: ['🎤', 'Concerts'], soiree: ['🪩', 'Soirées'], festival: ['🎪', 'Festivals'], sport: ['🏃', 'Sport'], culture: ['🎭', 'Culture'],
  famille: ['👨‍👩‍👧', 'En famille'], atelier: ['🎨', 'Ateliers'], sortie: ['⛵', 'Sorties et excursions'], pro: ['💼', 'Pro et conférences'] };
const ST_BILLET = { reserve: ['att', 'À payer à l’entrée'], paye: ['ok', 'Valide'], utilise: ['gris', 'Utilisé'], annule: ['ko', 'Annulé'] };
const ST_EV = { brouillon: ['gris', 'Brouillon'], en_attente: ['att', 'En validation'], publie: ['ok', 'En ligne'], refuse: ['ko', 'Refusé'], annule: ['ko', 'Annulé'] };

// ---------------------------------------------------------------- outils
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => Number(n) === 0 ? 'Gratuit' : (Math.round(Number(n) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: Number(n) % 1 ? 2 : 0 }) + ' €';
const fmt = (d, o, fuseau = 'America/Martinique') => new Date(d).toLocaleString('fr-FR', { timeZone: fuseau || 'America/Martinique', ...o });
const quand = (d, fuseau) => fmt(d, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }, fuseau)
  + (fuseau && fuseau !== Intl.DateTimeFormat().resolvedOptions().timeZone ? ' (heure locale)' : '');
const jourMois = (d, fuseau) => ({ j: fmt(d, { day: 'numeric' }, fuseau), m: fmt(d, { month: 'short' }, fuseau).replace('.', '') });
const tag = ([c, t]) => `<span class="tag ${c}">${esc(t)}</span>`;
const photo = p => !p ? '' : /^https:\/\//.test(p) ? p : PRET ? sb.storage.from('photos').getPublicUrl(p).data.publicUrl : '';
const wa = (tel, txt) => `https://wa.me/${telInternational(tel || WA) || WA}?text=${encodeURIComponent(txt)}`;
const lieuEv = e => `${esc(e.lieu)}, ${esc(e.commune)}${e.territoire && e.territoire !== 'Autre pays' ? ' · ' + esc(e.territoire) : ''}`;
const optsCats = v => Object.entries(CATS).map(([k, [i, t]]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${i} ${esc(t)}</option>`).join('');
const param = () => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
const aller = h => { if (location.hash === h) rendre(); else location.hash = h; };
const vue = h => { $('#app').innerHTML = h; };
// territoire choisi par le visiteur, retenu sur cet appareil ('' = tous)
function terrPrefere(v) { try { if (v !== undefined) localStorage.setItem('evpTerritoire', v); return localStorage.getItem('evpTerritoire') ?? ''; } catch (e) { return v ?? ''; } }
function toast(m, ko = false) { const t = document.createElement('div'); t.className = 'toast' + (ko ? ' ko' : ''); t.textContent = m; t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(() => t.remove(), ko ? 6000 : 3500); }
function erreur(e) {
  const m = String(e?.message || e || '');
  if (/row-level security|permission denied/i.test(m)) return 'Action non autorisée pour votre compte.';
  if (/Invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet email.';
  if (/Password should be/i.test(m)) return 'Mot de passe trop court (8 caractères minimum).';
  if (/rate limit|too many/i.test(m)) return 'Trop d’essais, réessayez dans quelques minutes.';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Connexion impossible. Vérifiez votre internet.';
  return m || 'Une erreur est survenue.';
}
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
async function reduire(f) {
  if (!/^image\//.test(f.type)) throw new Error('Choisissez une image (JPEG, PNG ou WebP).');
  const img = await createImageBitmap(f), k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return new Promise(r => c.toBlob(r, 'image/jpeg', .85));
}
async function envoyerPhoto(f) {
  const chemin = `${moi.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  await q(sb.storage.from('photos').upload(chemin, await reduire(f), { contentType: 'image/jpeg' })); return chemin;
}
const qrSvg = code => { const qr = window.qrcode(0, 'M'); qr.addData(code); qr.make(); return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); };

// ---------------------------------------------------------------- session
let moi = null, profil = null;
async function chargerMoi() {
  moi = null; profil = null; if (!PRET) return;
  moi = (await sb.auth.getSession()).data.session?.user || null;
  if (moi) profil = await q(sb.from('profiles').select('*').eq('id', moi.id).maybeSingle());
}
const estOrga = () => profil && (profil.orga === 'valide' || profil.role === 'admin');
const exigeCompte = () => { if (moi) return true; aller('#/connexion?retour=' + encodeURIComponent(location.hash)); return false; };

function nav() {
  const h = location.hash || '#/', on = p => h.startsWith(p) ? 'on' : '';
  $('#nav').innerHTML = `<a href="#/" class="${h === '#/' ? 'on' : ''}">Événements</a>
    ${moi ? `<a href="#/billets" class="${on('#/billets')}">Mes billets</a><a href="#/orga" class="${on('#/orga')}">${estOrga() ? 'Espace organisateur' : 'Organiser'}</a>${profil?.role === 'admin' ? `<a href="#/admin" class="${on('#/admin')}">Admin</a>` : ''}<a href="#/deconnexion">Déconnexion</a>`
      : `<a href="#/orga">Organiser</a><a href="#/connexion" class="${on('#/connexion')}">Connexion</a><a class="btn btn-p btn-s" href="#/inscription">Créer un compte</a>`}`;
  $('#bas').innerHTML = `<a href="#/" class="${h === '#/' ? 'on' : ''}"><span>🎉</span>Sortir</a><a href="#/billets" class="${on('#/billets')}"><span>🎟️</span>Billets</a>
    <a href="#/orga" class="${on('#/orga')}"><span>📣</span>Organiser</a><a href="${moi ? '#/compte' : '#/connexion'}" class="${on('#/compte') || on('#/connexion')}"><span>👤</span>${moi ? 'Compte' : 'Connexion'}</a>`;
}

// ---------------------------------------------------------------- accueil
const carteEv = (e, prix) => {
  const d = jourMois(e.debut, e.fuseau);
  return `<a class="ev" href="#/evenement/${e.id}"><div class="aff">${e.affiche ? `<img src="${esc(photo(e.affiche))}" alt="Affiche : ${esc(e.titre)}" loading="lazy">` : `<span class="vide">${CATS[e.categorie]?.[0] || '🎉'}</span>`}
    <span class="date"><b>${esc(d.j)}</b><small>${esc(d.m)}</small></span></div>
    <div class="corps"><span class="tag">${CATS[e.categorie]?.[0] || ''} ${esc(CATS[e.categorie]?.[1] || '')}</span>${e.statut === 'annule' ? ' ' + tag(ST_EV.annule) : ''}
      <h3>${esc(e.titre)}</h3><div class="muted petit">${esc(fmt(e.debut, { weekday: 'short', hour: '2-digit', minute: '2-digit' }, e.fuseau))} · ${lieuEv(e)}</div>
      ${prix ? `<div class="prix">${prix.max === 0 ? 'Gratuit' : 'Dès ' + eur(prix.minPayant) + (prix.min === 0 ? ' · gratuit possible' : '')}</div>` : ''}</div></a>`;
};
async function prixMini(ids) {
  if (!ids.length) return {};
  const t = await q(sb.from('billets_types').select('evenement_id, prix').in('evenement_id', ids));
  const m = {};
  t.forEach(x => { const p = Number(x.prix), o = m[x.evenement_id] || (m[x.evenement_id] = { min: Infinity, max: 0, minPayant: Infinity }); o.min = Math.min(o.min, p); o.max = Math.max(o.max, p); if (p > 0) o.minPayant = Math.min(o.minPayant, p); });
  return m;
}
const videEv = () => `<div class="vide-etat"><div class="ico">🎟️</div><h3>Les premiers événements arrivent</h3>
  <p class="muted">Concerts, soirées, festivals, sorties en mer : les organisateurs publient bientôt ici, aux Antilles, en Guyane, à La Réunion, dans l’Hexagone et ailleurs. Vous organisez un événement ? Vendez vos billets gratuitement.</p>
  <a class="btn btn-p" href="#/orga">Publier mon événement</a></div>`;

async function pageAccueil() {
  const p = param();
  vue(`<section class="hero"><div class="wrap">
    <h1>Sortir près de chez vous, <em>billets en poche</em>.</h1>
    <p>Concerts, soirées, festivals, sorties en catamaran, en Martinique, en Guadeloupe, en Guyane, à La Réunion, dans l’Hexagone et ailleurs : réservez en 2 clics, recevez votre billet avec QR code sur votre téléphone.</p>
    <form class="recherche" id="fRech"><input name="q" placeholder="Artiste, soirée, lieu…" value="${esc(p.q || '')}" aria-label="Recherche">
      <select name="territoire" aria-label="Territoire">${optsTerritoires(p.territoire ?? terrPrefere(), 'Tous les territoires')}</select>
      <select name="quand" aria-label="Quand">${[['', 'Toutes les dates'], ['soir', 'Ce soir'], ['we', 'Ce week-end'], ['7', 'Les 7 prochains jours'], ['30', 'Ce mois-ci']].map(([k, t]) => `<option value="${k}" ${k === (p.quand || '') ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <button class="btn btn-p">Rechercher</button></form></div></section>
    <div class="wrap"><div class="puces">${[['', '✨', 'Tout'], ...Object.entries(CATS).map(([k, [i, t]]) => [k, i, t])].map(([k, i, t]) => `<a href="#/?${new URLSearchParams({ ...p, cat: k })}" class="${(p.cat || '') === k ? 'on' : ''}">${i} ${esc(t)}</a>`).join('')}</div>
      <section class="section"><div id="liste" class="chargement">Chargement…</div></section>
      <section class="section"><div class="vide-etat" style="text-align:left;display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center">
        <div><h2>Vous organisez des événements ?</h2><p class="muted" style="margin:0">Billetterie gratuite pour démarrer : billets QR code, paiement à l’entrée, contrôle avec votre téléphone, liste des participants.</p></div>
        <a class="btn btn-p" href="#/orga">Devenir organisateur</a></div></section></div>`);
  $('#fRech').addEventListener('submit', e => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); terrPrefere(d.territoire); const u = new URLSearchParams(); Object.entries({ ...d, cat: p.cat || '' }).forEach(([k, v]) => (v || k === 'territoire') && u.set(k, v)); aller('#/?' + u); });
  if (!PRET) return ($('#liste').innerHTML = videEv());
  try {
    let r = sb.from('evenements').select('*').in('statut', ['publie', 'annule']).gte('debut', new Date(Date.now() - 6 * 36e5).toISOString()).order('debut').limit(60);
    if (p.cat) r = r.eq('categorie', p.cat);
    const terr = p.territoire ?? terrPrefere();
    if (terr) r = r.eq('territoire', terr);
    const fin = (() => {
      const n = new Date(), fz = fuseauDe(terr), [jj] = utcVersLocal(n.toISOString(), fz).split('T');
      const jsem = new Date(jj + 'T12:00:00Z').getUTCDay(), finJour = k => { const x = new Date(jj + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return localVersUTC(x.toISOString().slice(0, 10) + 'T06:00', fz); };
      if (p.quand === 'soir') return finJour(1);
      if (p.quand === 'we') return finJour(((7 - jsem) % 7) + 1);
      if (p.quand) return new Date(n.getTime() + Number(p.quand) * 864e5).toISOString();
      return null;
    })();
    if (fin) r = r.lte('debut', fin);
    let ev = await q(r);
    if (p.q) { const m = p.q.toLowerCase(); ev = ev.filter(e => (e.titre + ' ' + e.lieu + ' ' + e.commune + ' ' + e.description).toLowerCase().includes(m)); }
    const pm = await prixMini(ev.map(e => e.id));
    $('#liste').className = ev.length ? 'grille' : '';
    $('#liste').innerHTML = ev.length ? ev.map(e => carteEv(e, pm[e.id])).join('') : (p.q || p.cat || p.quand || (p.territoire ?? terrPrefere()) ? '<div class="vide-etat"><div class="ico">🔎</div><h3>Aucun événement pour cette recherche</h3><a href="#/">Tout voir</a></div>' : videEv());
  } catch (e) { $('#liste').innerHTML = `<p>${esc(erreur(e))}</p>`; }
}

// ---------------------------------------------------------------- fiche événement + réservation
async function pageEvenement(id) {
  vue('<div class="chargement">Chargement…</div>');
  const e = await q(sb.from('evenements').select('*').eq('id', id).maybeSingle());
  if (!e) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Événement introuvable</h3><a href="#/">Tous les événements</a></div>');
  const [types, rest, orga] = await Promise.all([
    q(sb.from('billets_types').select('*').eq('evenement_id', id).order('ordre').order('prix')),
    q(sb.rpc('places_restantes', { evt: id })),
    q(sb.from('profiles').select('prenom, orga_nom, avatar').eq('id', e.orga_id).maybeSingle())]);
  const restant = Object.fromEntries(rest.map(r => [r.type_id, r.restantes]));
  const fini = new Date(e.fin || e.debut) < new Date(), ferme = fini || e.statut !== 'publie';
  const choix = {};
  document.title = `${e.titre} — ${fmt(e.debut, { day: 'numeric', month: 'long' }, e.fuseau)} · ${e.commune} | EventPass`;
  const carte = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.lieu, e.adresse, e.commune, e.territoire === 'Autre pays' ? '' : e.territoire].filter(Boolean).join(', '))}`;
  vue(`<div class="wrap"><div class="fiche">
    <div class="affiche">${e.affiche ? `<img src="${esc(photo(e.affiche))}" alt="Affiche : ${esc(e.titre)}">` : `<span style="position:absolute;inset:0;display:grid;place-items:center;font-size:90px">${CATS[e.categorie]?.[0] || '🎉'}</span>`}</div>
    <div><span class="tag">${CATS[e.categorie]?.[0]} ${esc(CATS[e.categorie]?.[1])}</span> ${e.statut !== 'publie' ? tag(ST_EV[e.statut]) : ''}
      <h1 style="font-size:clamp(28px,4vw,44px);margin-top:10px">${esc(e.titre)}</h1>
      <div class="infos"><div><span>📅</span><span>${esc(quand(e.debut, e.fuseau))}${e.fin ? ` → ${esc(fmt(e.fin, { hour: '2-digit', minute: '2-digit' }, e.fuseau))}` : ''}</span></div>
        <div><span>📍</span><span>${lieuEv(e)}${e.adresse ? `<br><span class="muted petit">${esc(e.adresse)}</span>` : ''}<br><a class="petit" href="${carte}" target="_blank" rel="noopener">Itinéraire ↗</a></span></div>
        <div><span>📣</span><span>Organisé par <b>${esc(orga?.orga_nom || orga?.prenom || 'un organisateur')}</b> <span class="tag ok">✓ Vérifié</span></span></div>
        ${e.age_min ? `<div><span>🔞</span><span>À partir de ${e.age_min} ans</span></div>` : ''}</div>
      <div class="actions" style="margin-bottom:18px"><button class="btn btn-s" id="partager">↗ Partager</button><button class="btn btn-s" id="ics">📅 Ajouter à mon agenda</button></div>
      <h2 style="font-size:22px">Billets</h2>
      ${e.statut === 'annule' ? '<div class="vide-etat">Cet événement est annulé.</div>' : fini ? '<div class="vide-etat">Cet événement est terminé.</div>' : ''}
      <div class="types">${types.map(t => { const r = restant[t.id] ?? 0, venteFinie = t.vente_fin && new Date(t.vente_fin) < new Date(); return `<div class="type">
        <div><b>${esc(t.nom)}</b><span class="prix">${eur(t.prix)}</span>${t.description ? `<div class="muted petit">${esc(t.description)}</div>` : ''}
          <div class="petit ${r <= 10 ? '' : 'muted'}">${r <= 0 ? 'Complet' : venteFinie ? 'Vente terminée' : r <= 10 ? `Plus que ${r} place${r > 1 ? 's' : ''} !` : `${r} places`}${Number(t.prix) > 0 ? ' · paiement à l’entrée' : ''}</div></div>
        ${ferme || r <= 0 || venteFinie ? '' : `<div class="qte" data-type="${t.id}" data-max="${Math.min(r, t.max_commande)}"><button type="button" data-d="-1" aria-label="Moins">−</button><output>0</output><button type="button" data-d="1" aria-label="Plus">+</button></div>`}</div>`; }).join('') || '<p class="muted">Les billets ne sont pas encore en vente.</p>'}</div>
      <div class="panier" id="panier" hidden><div><b id="resume"></b></div>
        <label class="f" style="display:grid;gap:4px;font-size:14px">Nom sur les billets<input id="titulaire" maxlength="80" value="${esc(profil ? (profil.prenom + ' ' + profil.nom).trim() : '')}" autocomplete="name"></label>
        <button class="btn btn-p" id="reserver">Réserver mes billets</button>
        <p class="muted petit" style="margin:0">Aucun paiement en ligne : les billets payants se règlent à l’entrée. Billet avec QR code dans « Mes billets ».</p></div>
      <h2 style="font-size:22px;margin-top:26px">À propos</h2><p style="white-space:pre-line">${esc(e.description) || '<span class="muted">—</span>'}</p></div></div></div>`);
  const maj = () => {
    const n = Object.values(choix).reduce((a, b) => a + b, 0);
    const total = types.reduce((s, t) => s + (choix[t.id] || 0) * Number(t.prix), 0);
    $('#panier').hidden = !n; $('#resume').textContent = `${n} billet${n > 1 ? 's' : ''} · ${total ? eur(total) + ' à régler à l’entrée' : 'gratuit'}`;
  };
  document.querySelectorAll('.qte').forEach(qt => qt.addEventListener('click', ev => {
    const b = ev.target.closest('[data-d]'); if (!b) return;
    const id = qt.dataset.type, max = Number(qt.dataset.max);
    choix[id] = Math.max(0, Math.min(max, (choix[id] || 0) + Number(b.dataset.d))); qt.querySelector('output').textContent = choix[id]; maj();
  }));
  $('#reserver')?.addEventListener('click', async ev => {
    if (!exigeCompte()) return;
    const nom = $('#titulaire').value.trim(); if (!nom) return toast('Indiquez le nom sur les billets.', true);
    ev.target.disabled = true;
    try {
      for (const [type_billet, nombre] of Object.entries(choix)) if (nombre) await q(sb.rpc('reserver_billets', { type_billet, nombre, nom_titulaire: nom }));
      toast('C’est réservé ! Vos billets sont prêts.'); aller('#/billets');
    } catch (err) { toast(erreur(err), true); ev.target.disabled = false; }
  });
  $('#partager').addEventListener('click', async () => {
    const u = location.href;
    try { if (navigator.share) await navigator.share({ title: e.titre, text: `${e.titre} · ${quand(e.debut, e.fuseau)}`, url: u }); else { await navigator.clipboard.writeText(u); toast('Lien copié !'); } } catch (x) { /* partage annulé */ }
  });
  $('#ics').addEventListener('click', () => telechargerIcs(e));
}
function telechargerIcs(e) {
  const f = d => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const net = s => String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//IloTech//EventPass//FR', 'BEGIN:VEVENT', `UID:${e.id}@pass.ilo-tech.com`, `DTSTAMP:${f(Date.now())}`, `DTSTART:${f(e.debut)}`,
    `DTEND:${f(e.fin || new Date(new Date(e.debut).getTime() + 4 * 36e5))}`, `SUMMARY:${net(e.titre)}`, `LOCATION:${net(e.lieu + ', ' + e.commune)}`, `URL:${location.origin + location.pathname}#/evenement/${e.id}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'evenement.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------------------------------------------------------- mes billets
async function pageBillets() {
  if (!PRET || !exigeCompte()) return;
  vue('<div class="chargement">Chargement…</div>');
  const b = await q(sb.from('billets').select('*, billets_types(nom), evenements(id, titre, debut, lieu, commune, territoire, fuseau, statut)').eq('acheteur', moi.id).order('created_at', { ascending: false }));
  const parEv = {}; b.forEach(x => { (parEv[x.evenement_id] = parEv[x.evenement_id] || { e: x.evenements, l: [] }).l.push(x); });
  const groupes = Object.values(parEv).sort((a, c) => new Date(a.e.debut) - new Date(c.e.debut));
  const avenir = groupes.filter(g => new Date(g.e.debut) > new Date(Date.now() - 12 * 36e5)), passes = groupes.filter(g => !avenir.includes(g));
  const bloc = g => `<h2 style="font-size:20px;margin-top:22px"><a href="#/evenement/${g.e.id}">${esc(g.e.titre)}</a></h2><p class="muted" style="margin-top:-6px">${esc(quand(g.e.debut, g.e.fuseau))} · ${lieuEv(g.e)}${g.e.statut === 'annule' ? ' · <b style="color:var(--ko)">Événement annulé</b>' : ''}</p>
    ${g.l.map(x => `<div class="billet ${x.statut}"><div class="qr" data-plein="${esc(x.code)}" title="Agrandir">${x.statut === 'annule' ? '' : qrSvg(x.code)}</div>
      <div><h3>${esc(x.billets_types?.nom || 'Billet')} · ${eur(x.prix)}</h3><div class="muted">${esc(x.titulaire)}</div><div class="code">${esc(x.code)}</div>
        <div style="margin:6px 0">${tag(ST_BILLET[x.statut])}</div>
        <div class="actions">${x.statut !== 'annule' && x.statut !== 'utilise' ? `<button class="btn btn-s" data-plein="${esc(x.code)}" style="background:#14121f;color:#fff">Agrandir pour l’entrée</button><button class="btn btn-s btn-ko" data-annuler="${x.id}" style="background:#fff">Annuler</button>` : ''}</div></div></div>`).join('')}`;
  vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><h1>Mes billets</h1>
    ${b.length ? avenir.map(bloc).join('') + (passes.length ? '<h2 style="margin-top:34px" class="muted">Événements passés</h2>' + passes.map(bloc).join('') : '') : '<div class="vide-etat"><div class="ico">🎟️</div><h3>Aucun billet pour l’instant</h3><a class="btn btn-p" href="#/">Trouver une sortie</a></div>'}
    <p class="muted petit">Montrez le QR code à l’entrée, écran à fond. Pas de réseau sur place ? Faites une capture d’écran avant de partir.</p></div>`);
  $('#app').onclick = async ev => {
    const p = ev.target.closest('[data-plein]'), a = ev.target.closest('[data-annuler]');
    if (p) { const d = document.createElement('div'); d.className = 'plein'; d.innerHTML = `<div><div class="qr">${qrSvg(p.dataset.plein)}</div><p style="font:800 28px monospace;letter-spacing:3px">${esc(p.dataset.plein)}</p><p>Touchez pour fermer</p></div>`; d.onclick = () => d.remove(); document.body.appendChild(d); }
    if (a && confirm('Annuler ce billet ? La place sera remise en vente.')) { try { await q(sb.rpc('annuler_billet', { billet: a.dataset.annuler })); toast('Billet annulé.'); pageBillets(); } catch (err) { toast(erreur(err), true); } }
  };
}

// ---------------------------------------------------------------- comptes (même compte que Kaz An Nou)
function pageConnexion() {
  if (moi) return aller('#/billets');
  vue(`<div class="wrap"><div class="carte-f"><h1>Connexion</h1><p class="muted">Même compte que Kaz An Nou.</p>
    <form class="f" id="fCo"><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label><button class="btn btn-p">Se connecter</button></form>
    <p><button class="lien" id="oubli">Mot de passe oublié ?</button></p><p class="muted">Pas de compte ? <a href="#/inscription">Créer un compte</a></p></div></div>`);
  $('#fCo').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try { await q(sb.auth.signInWithPassword({ email: d.email.trim(), password: d.mdp })); await chargerMoi(); toast('Bienvenue ' + (profil?.prenom || '') + ' !'); aller(decodeURIComponent(param().retour || '') || '#/billets'); }
    catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#oubli').addEventListener('click', async () => {
    const email = $('#fCo').email.value.trim(); if (!email) return toast('Écrivez d’abord votre email.', true);
    try { await q(sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://immo.ilo-tech.com/?nouveau-mdp=1' })); toast('Si un compte existe, un email est envoyé.'); } catch (err) { toast(erreur(err), true); }
  });
}
function pageInscription() {
  if (moi) return aller('#/billets');
  vue(`<div class="wrap"><div class="carte-f"><h1>Créer un compte</h1><p class="muted">Un seul compte pour EventPass et Kaz An Nou.</p>
    <form class="f" id="fIns"><div class="ligne2"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name"></label><label>Nom<input name="nom" maxlength="60" autocomplete="family-name"></label></div>
      <label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Téléphone <span class="aide">(seulement pour l’organisateur de vos événements)</span><input type="tel" name="telephone" pattern="[0-9 +]{6,20}" autocomplete="tel"></label>
      <label>Mot de passe <span class="aide">(8 caractères minimum)</span><input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>
      <label style="display:flex;gap:8px;font-weight:400"><input type="checkbox" required style="width:auto"> J’accepte les <a href="cgu.html" target="_blank">conditions</a> et la <a href="https://ilo-tech.com/confidentialite.html" target="_blank">confidentialité</a>.</label>
      <button class="btn btn-p">Créer mon compte</button></form></div></div>`);
  $('#fIns').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try {
      const r = await q(sb.auth.signUp({ email: d.email.trim(), password: d.mdp, options: { data: { prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim() } } }));
      if (r.session) { await chargerMoi(); toast('Compte créé, bienvenue !'); aller(decodeURIComponent(param().retour || '') || '#/'); }
      else vue('<div class="wrap"><div class="carte-f"><h1>Vérifiez vos emails 📩</h1><p>Cliquez sur le lien reçu pour activer votre compte, puis connectez-vous.</p></div></div>');
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
}
async function pageCompte() {
  if (!exigeCompte()) return;
  vue(`<div class="wrap"><div class="carte-f"><h1>Mon compte</h1><p>${esc(profil?.prenom)} ${esc(profil?.nom)}<br><span class="muted">${esc(moi.email)}</span></p>
    <div class="actions"><a class="btn" href="#/billets">Mes billets</a><a class="btn" href="#/orga">Espace organisateur</a><a class="btn" href="https://immo.ilo-tech.com/#/compte">Mon profil (Kaz An Nou)</a><a class="btn btn-ko" href="#/deconnexion">Se déconnecter</a></div></div></div>`);
}

// ---------------------------------------------------------------- espace organisateur
async function pageOrga(sous, id) {
  if (!PRET || !exigeCompte()) return;
  await chargerMoi(); nav();
  if (!estOrga()) return pageDevenirOrga();
  if (sous === 'evenement') return formEvenement(id === 'nouveau' ? null : id);
  if (sous === 'participants') return pageParticipants(id);
  if (sous === 'controle') return pageControle(id);
  vue('<div class="chargement">Chargement…</div>');
  const ev = await q(sb.from('evenements').select('*').eq('orga_id', moi.id).order('debut', { ascending: false }));
  const stats = {};
  if (ev.length) {
    const [types, bil] = await Promise.all([q(sb.from('billets_types').select('evenement_id, quantite').in('evenement_id', ev.map(e => e.id))), q(sb.from('billets').select('evenement_id, statut, prix').in('evenement_id', ev.map(e => e.id)))]);
    ev.forEach(e => { const b = bil.filter(x => x.evenement_id === e.id && x.statut !== 'annule'); stats[e.id] = { places: types.filter(t => t.evenement_id === e.id).reduce((s, t) => s + t.quantite, 0), vendus: b.length, entres: b.filter(x => x.statut === 'utilise').length, aEncaisser: b.filter(x => x.statut === 'reserve').reduce((s, x) => s + Number(x.prix), 0) }; });
  }
  vue(`<div class="wrap" style="padding-top:22px"><div class="titre-s"><h1>Espace organisateur</h1><a class="btn btn-p" href="#/orga/evenement/nouveau">+ Nouvel événement</a></div>
    ${ev.length ? ev.map(e => { const s = stats[e.id]; return `<div class="ligne-l">${e.affiche ? `<img class="mini" src="${esc(photo(e.affiche))}" alt="">` : '<div class="mini"></div>'}
      <div><b>${esc(e.titre)}</b> ${tag(ST_EV[e.statut])}<div class="muted petit">${esc(quand(e.debut, e.fuseau))} · ${lieuEv(e)}</div>
        <div class="petit">🎟️ ${s.vendus} / ${s.places} réservés · ✅ ${s.entres} entrés${s.aEncaisser ? ` · 💶 ${eur(s.aEncaisser)} à encaisser` : ''}</div>
        ${e.statut === 'refuse' && e.motif_refus ? `<div class="petit" style="color:#fca5a5">Motif : ${esc(e.motif_refus)}</div>` : ''}</div>
      <div class="actions"><a class="btn btn-s" href="#/orga/evenement/${e.id}">Modifier</a><a class="btn btn-s" href="#/orga/participants/${e.id}">Participants</a><a class="btn btn-s btn-p" href="#/orga/controle/${e.id}">Contrôle entrée</a><a class="btn btn-s" href="#/evenement/${e.id}">Voir</a></div></div>`; }).join('')
      : '<div class="vide-etat"><div class="ico">📣</div><h3>Créez votre premier événement</h3><p class="muted">Affiche, date, lieu, types de billets : 5 minutes. Nous le vérifions puis il est en ligne.</p><a class="btn btn-p" href="#/orga/evenement/nouveau">Créer un événement</a></div>'}</div>`);
}
function pageDevenirOrga() {
  const enCours = profil?.orga === 'demande';
  vue(`<div class="wrap"><div class="carte-f" style="max-width:640px"><h1>Vendez vos billets avec EventPass</h1>
    <p class="muted">Gratuit pour démarrer. Billets avec QR code, paiement à l’entrée, contrôle avec votre téléphone, liste des participants. Chaque organisateur est vérifié avant sa première publication.</p>
    ${enCours ? '<div class="vide-etat" style="text-align:left">⏳ Votre demande est en cours de vérification. Réponse sous 48 h.</div>' : profil?.orga === 'refuse' ? '<div class="vide-etat" style="text-align:left">Votre demande n’a pas été acceptée. Écrivez-nous pour en parler.</div>' : `
    <form class="f" id="fOrga"><label>Nom de l’organisateur (association, collectif, entreprise)<input name="orga_nom" required maxlength="80" value="${esc(profil?.orga_nom || '')}"></label>
      <label>SIRET ou numéro RNA (association) <span class="aide">(facultatif mais accélère la vérification)</span><input name="siret" maxlength="20" value="${esc(profil?.siret || '')}"></label>
      <label>Vos événements en quelques lignes<textarea name="bio" maxlength="1500" required>${esc(profil?.bio || '')}</textarea></label>
      <label style="display:flex;gap:8px;font-weight:400"><input type="checkbox" required style="width:auto"> Je m’engage à publier des événements réels, déclarés, et à respecter les participants (<a href="cgu.html" target="_blank">conditions</a>).</label>
      <button class="btn btn-p">Envoyer ma demande</button></form>`}</div></div>`);
  $('#fOrga')?.addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    const siret = d.siret.replace(/\s/g, '');
    try { await q(sb.from('profiles').update({ orga: 'demande', orga_nom: d.orga_nom.trim(), bio: d.bio.trim(), ...(/^[0-9]{9,14}$/.test(siret) ? { siret } : {}) }).eq('id', moi.id)); await chargerMoi(); toast('Demande envoyée !'); pageDevenirOrga(); }
    catch (err) { toast(erreur(err), true); }
  });
}
async function formEvenement(id) {
  const e = id ? await q(sb.from('evenements').select('*').eq('id', id).single()) : { titre: '', categorie: 'soiree', debut: null, fin: null, lieu: '', territoire: profil?.territoire || terrPrefere() || 'Martinique', commune: '', adresse: '', age_min: 0, description: '', affiche: null, statut: 'brouillon' };
  let types = id ? await q(sb.from('billets_types').select('*').eq('evenement_id', id).order('ordre')) : [{ nom: 'Prévente', prix: 10, quantite: 100, max_commande: 6 }];
  let affiche = e.affiche;
  const supprimes = [];   // types retirés à effacer à l'enregistrement
  const ligneType = (t, i) => `<div class="ltype" data-i="${i}"><label>Nom<input name="nom" value="${esc(t.nom)}" required maxlength="60"></label><label>Prix €<input name="prix" type="number" min="0" max="5000" step="0.5" value="${t.prix}"></label>
    <label>Places<input name="quantite" type="number" min="1" max="50000" value="${t.quantite}"></label><label>Max / pers.<input name="max_commande" type="number" min="1" max="20" value="${t.max_commande}"></label>
    <button type="button" class="btn btn-s btn-ko" data-suppr="${i}" aria-label="Retirer">×</button></div>`;
  vue(`<div class="wrap" style="padding:22px 20px;max-width:820px"><a href="#/orga" class="petit">← Espace organisateur</a><h1>${id ? 'Modifier l’événement' : 'Nouvel événement'}</h1>
    <form class="f" id="fEv">
      <label>Titre<input name="titre" required minlength="3" maxlength="120" value="${esc(e.titre)}" placeholder="ex. Soirée zouk au bord de l’eau"></label>
      <div class="ligne2"><label>Catégorie<select name="categorie">${optsCats(e.categorie)}</select></label><label>Âge minimum<input type="number" name="age_min" min="0" max="21" value="${e.age_min}"></label></div>
      <div class="ligne2"><label>Début <span class="aide">(heure locale du lieu)</span><input type="datetime-local" name="debut" required value="${utcVersLocal(e.debut, e.fuseau || fuseauDe(e.territoire))}"></label><label>Fin <span class="aide">(facultatif)</span><input type="datetime-local" name="fin" value="${utcVersLocal(e.fin, e.fuseau || fuseauDe(e.territoire))}"></label></div>
      <div class="ligne3"><label>Lieu<input name="lieu" required maxlength="120" value="${esc(e.lieu)}" placeholder="ex. Plage de l’Anse Mitan"></label></div>
      <div class="ligne3"><label>Territoire<select name="territoire" required data-villes="villesE">${optsTerritoires(e.territoire)}</select></label><label>Ville<input name="commune" required maxlength="60" list="villesE" value="${esc(e.commune)}">${listeVilles('villesE', e.territoire)}</label><label>Adresse <span class="aide">(facultatif)</span><input name="adresse" maxlength="200" value="${esc(e.adresse || '')}"></label></div>
      <label>Description<textarea name="description" maxlength="6000" placeholder="Programme, artistes, dress code, parking, navettes…">${esc(e.description)}</textarea></label>
      <div><b>Affiche</b> <span class="aide">(format portrait conseillé)</span><div id="affApercu" style="max-width:200px;margin:8px 0"></div><input type="file" id="affFichier" accept="image/*"></div>
      <div><b>Billets</b> <span class="aide">(prix 0 = gratuit ; ajoutez par ex. « VIP » ou « Navette aller-retour depuis Fort-de-France »)</span><div class="lignes-types" id="types" style="margin-top:8px"></div>
        <button type="button" class="btn btn-s" id="ajType" style="margin-top:8px">+ Ajouter un type de billet</button></div>
      <div class="actions"><button class="btn btn-p" value="en_attente">${id && e.statut === 'publie' ? 'Enregistrer' : 'Enregistrer et envoyer en validation'}</button>${!id || e.statut !== 'publie' ? '<button class="btn" value="brouillon">Garder en brouillon</button>' : ''}
        ${id && e.statut === 'publie' ? '<button type="button" class="btn btn-ko" id="annulerEv">Annuler l’événement</button>' : ''}</div>
      <p class="muted petit">Changer le titre, la description ou l’affiche d’un événement en ligne le renvoie en validation (sous 48 h).</p></form></div>`);
  const dessinerAff = () => { $('#affApercu').innerHTML = affiche ? `<img src="${esc(photo(affiche))}" alt="Affiche" style="border-radius:12px">` : ''; };
  const lireTypes = () => [...document.querySelectorAll('.ltype')].map(l => { const i = Number(l.dataset.i); const g = n => l.querySelector(`[name=${n}]`).value; return { ...types[i], nom: g('nom').trim(), prix: Number(g('prix')) || 0, quantite: Number(g('quantite')), max_commande: Number(g('max_commande')) }; });
  const dessinerTypes = () => { $('#types').innerHTML = types.map(ligneType).join(''); };
  dessinerAff(); dessinerTypes(); brancherVilles(document.querySelector('#fEv [name=territoire]'), 'villesE');
  $('#ajType').addEventListener('click', () => { types = lireTypes(); types.push({ nom: 'VIP', prix: 25, quantite: 50, max_commande: 4 }); dessinerTypes(); });
  $('#types').addEventListener('click', ev => { const b = ev.target.closest('[data-suppr]'); if (!b) return; types = lireTypes(); const t = types.splice(Number(b.dataset.suppr), 1)[0]; if (t.id) supprimes.push(t.id); dessinerTypes(); });
  $('#affFichier').addEventListener('change', async ev => { const f = ev.target.files[0]; if (!f) return; toast('Envoi de l’affiche…'); try { affiche = await envoyerPhoto(f); dessinerAff(); } catch (err) { toast(erreur(err), true); } });
  $('#annulerEv')?.addEventListener('click', async () => { if (!confirm('Annuler l’événement ? Les participants le verront dans leurs billets.')) return; try { await q(sb.from('evenements').update({ statut: 'annule' }).eq('id', id)); toast('Événement annulé.'); aller('#/orga'); } catch (err) { toast(erreur(err), true); } });
  $('#fEv').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, d = Object.fromEntries(new FormData(f)), envoi = ev.submitter?.value || 'en_attente';
    const lt = lireTypes(), fz = fuseauDe(d.territoire);
    if (!lt.length) return toast('Ajoutez au moins un type de billet.', true);
    if (d.fin && d.fin <= d.debut) return toast('La fin doit être après le début.', true);
    const ligne = { titre: d.titre.trim(), categorie: d.categorie, age_min: Number(d.age_min) || 0, debut: localVersUTC(d.debut, fz), fin: localVersUTC(d.fin, fz), fuseau: fz, territoire: d.territoire, lieu: d.lieu.trim(), commune: d.commune.trim(), adresse: d.adresse.trim() || null, description: d.description.trim(), affiche };
    if (!(id && e.statut === 'publie')) ligne.statut = envoi;
    try {
      const evId = id ? (await q(sb.from('evenements').update(ligne).eq('id', id).select('id').single())).id : (await q(sb.from('evenements').insert(ligne).select('id').single())).id;
      for (const s of supprimes) await q(sb.from('billets_types').delete().eq('id', s));
      for (const [i, t] of lt.entries()) {
        const l = { evenement_id: evId, nom: t.nom, prix: t.prix, quantite: t.quantite, max_commande: t.max_commande, ordre: i };
        if (t.id) await q(sb.from('billets_types').update(l).eq('id', t.id)); else await q(sb.from('billets_types').insert(l));
      }
      toast(envoi === 'brouillon' ? 'Brouillon enregistré.' : 'Enregistré ! Vérification sous 48 h.'); aller('#/orga');
    } catch (err) { toast(erreur(err), true); }
  });
}
async function pageParticipants(id) {
  vue('<div class="chargement">Chargement…</div>');
  const [e, p] = await Promise.all([q(sb.from('evenements').select('titre, debut, fuseau, lieu, commune, territoire').eq('id', id).single()), q(sb.rpc('participants', { evt: id }))]);
  const actifs = p.filter(x => x.statut !== 'annule');
  vue(`<div class="wrap" style="padding-top:22px"><a href="#/orga" class="petit">← Espace organisateur</a><h1>${esc(e.titre)}</h1><p class="muted">${esc(quand(e.debut, e.fuseau))} · ${lieuEv(e)}</p>
    <div class="stat"><div><b>${actifs.length}</b>billets</div><div><b>${actifs.filter(x => x.statut === 'utilise').length}</b>entrés</div><div><b>${eur(actifs.filter(x => x.statut === 'reserve').reduce((s, x) => s + Number(x.prix), 0)).replace('Gratuit', '0 €')}</b>à encaisser</div><div><b>${eur(actifs.filter(x => x.statut !== 'reserve').reduce((s, x) => s + Number(x.prix), 0)).replace('Gratuit', '0 €')}</b>encaissés</div></div>
    <div class="actions" style="margin-bottom:14px"><a class="btn btn-p" href="#/orga/controle/${id}">📷 Contrôle à l’entrée</a><button class="btn" id="csv">⬇ Exporter (CSV)</button></div>
    <div class="tableau"><table class="t"><thead><tr><th>Code</th><th>Titulaire</th><th>Billet</th><th>Prix</th><th>Statut</th><th>Acheteur</th><th></th></tr></thead><tbody>
      ${p.map(x => `<tr><td style="font-family:monospace">${esc(x.code)}</td><td>${esc(x.titulaire)}</td><td>${esc(x.type_nom)}</td><td>${eur(x.prix)}</td><td>${tag(ST_BILLET[x.statut])}</td>
        <td>${esc(x.acheteur_nom)}${x.telephone ? `<br><a class="petit" href="${wa(x.telephone, `Bonjour, à propos de « ${e.titre} » (EventPass).`)}" target="_blank" rel="noopener">${esc(x.telephone)}</a>` : ''}</td>
        <td>${x.statut === 'reserve' ? `<button class="btn btn-s btn-ok" data-st="paye" data-b="${x.id}">Payé</button>` : ''}${['reserve', 'paye'].includes(x.statut) ? ` <button class="btn btn-s btn-ko" data-st="annule" data-b="${x.id}">Annuler</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucun billet pour l’instant.</td></tr>'}</tbody></table></div></div>`);
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-st]'); if (!b) return;
    if (b.dataset.st === 'annule' && !confirm('Annuler ce billet ?')) return;
    try { await q(sb.rpc('orga_billet', { billet: b.dataset.b, nouveau: b.dataset.st })); pageParticipants(id); } catch (err) { toast(erreur(err), true); }
  };
  $('#csv').addEventListener('click', () => {
    const c = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lignes = [['Code', 'Titulaire', 'Billet', 'Prix', 'Statut', 'Acheteur', 'Téléphone', 'Réservé le'], ...p.map(x => [x.code, x.titulaire, x.type_nom, x.prix, ST_BILLET[x.statut][1], x.acheteur_nom, x.telephone, fmt(x.created_at, {}, e.fuseau)])];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lignes.map(l => l.map(c).join(';')).join('\r\n')], { type: 'text/csv' })); a.download = 'participants.csv'; a.click();
  });
}
let flux = null;
async function pageControle(id) {
  const e = await q(sb.from('evenements').select('titre, fuseau').eq('id', id).single());
  const peutScanner = 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
  let entres = 0;
  vue(`<div class="wrap" style="padding-top:20px"><a href="#/orga/participants/${id}" class="petit">← Participants</a><h1 style="font-size:24px">Contrôle · ${esc(e.titre)}</h1>
    <div class="scan">${peutScanner ? '<video id="cam" playsinline muted></video>' : '<p class="muted">La caméra n’est pas disponible sur ce navigateur : tapez le code du billet (Chrome sur Android permet de scanner).</p>'}
      <form id="fCode" class="recherche" style="grid-template-columns:1fr auto"><input name="code" placeholder="Code du billet (10 caractères)" autocomplete="off" autocapitalize="characters" required><button class="btn btn-p">Valider</button></form>
      <div id="verdict"></div><p class="muted petit" id="compteur"></p></div></div>`);
  let dernier = '', occupe = false;
  const valider = async code => {
    code = String(code || '').trim().toUpperCase(); if (!code || occupe || code === dernier) return; occupe = true; dernier = code; setTimeout(() => { if (dernier === code) dernier = ''; }, 4000);
    try {
      const [r] = await q(sb.rpc('valider_billet', { evt: id, code_billet: code }));
      const v = { ok: ['ok', '✅', 'Entrée validée'], a_payer: ['att', '💶', `À encaisser : ${eur(r.prix)}`], deja: ['ko', '⛔', 'Déjà utilisé'], annule: ['ko', '⛔', 'Billet annulé'], inconnu: ['ko', '❓', 'Billet inconnu pour cet événement'] }[r.resultat];
      if (['ok', 'a_payer'].includes(r.resultat)) entres++;
      $('#verdict').innerHTML = `<div class="verdict ${v[0]}"><big>${v[1]}</big>${esc(v[2])}${r.titulaire ? `<div style="font-size:16px;font-weight:600;margin-top:6px">${esc(r.titulaire)} · ${esc(r.type_nom)}${r.resultat === 'deja' ? ` · entré à ${esc(fmt(r.utilise_le, { hour: '2-digit', minute: '2-digit' }, e.fuseau))}` : ''}</div>` : ''}</div>`;
      $('#compteur').textContent = `${entres} entrée${entres > 1 ? 's' : ''} validée${entres > 1 ? 's' : ''} sur cet appareil`;
      try { navigator.vibrate?.(v[0] === 'ok' ? 80 : [80, 60, 80]); } catch (x) { /* vibration facultative */ }
    } catch (err) { toast(erreur(err), true); }
    occupe = false;
  };
  $('#fCode').addEventListener('submit', ev => { ev.preventDefault(); dernier = ''; valider(ev.target.code.value); ev.target.reset(); });
  if (peutScanner) {
    try {
      flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = $('#cam'); v.srcObject = flux; await v.play();
      const det = new window.BarcodeDetector({ formats: ['qr_code'] });
      const boucle = async () => { if (!document.body.contains(v)) { flux.getTracks().forEach(t => t.stop()); return; } try { const r = await det.detect(v); if (r[0]) await valider(r[0].rawValue); } catch (x) { /* image pas prête */ } setTimeout(boucle, 350); };
      boucle();
    } catch (err) { toast('Caméra refusée : tapez les codes à la main.', true); }
  }
}

// ---------------------------------------------------------------- administration
async function pageAdmin() {
  if (!exigeCompte()) return; await chargerMoi();
  if (profil?.role !== 'admin') return vue('<div class="wrap"><p>Réservé à l’administration.</p></div>');
  const [orgas, evs] = await Promise.all([q(sb.from('profiles').select('*').eq('orga', 'demande')), q(sb.from('evenements').select('*').eq('statut', 'en_attente').order('debut'))]);
  const ids = [...new Set([...orgas.map(o => o.id), ...evs.map(e => e.orga_id)])];
  const ct = ids.length ? await q(sb.from('contacts').select('*').in('id', ids)) : [];
  const contact = id => { const c = ct.find(x => x.id === id); return c ? `${esc(c.email || '')}${c.telephone ? ' · ' + esc(c.telephone) : ''}` : ''; };
  vue(`<div class="wrap" style="padding-top:22px"><h1>Administration EventPass</h1>
    <h2 style="font-size:20px">Organisateurs à valider (${orgas.length})</h2>
    ${orgas.map(o => `<div class="ligne-l"><div class="mini" style="display:grid;place-items:center;font-size:30px">📣</div><div><b>${esc(o.orga_nom || '')}</b> — ${esc(o.prenom)} ${esc(o.nom)}<div class="muted petit">${contact(o.id)}${o.siret ? ' · SIRET/RNA ' + esc(o.siret) : ''}</div><div class="petit">${esc(o.bio || '')}</div></div>
      <div class="actions"><button class="btn btn-s btn-ok" data-orga="${o.id}" data-v="valide">Valider</button><button class="btn btn-s btn-ko" data-orga="${o.id}" data-v="refuse">Refuser</button></div></div>`).join('') || '<p class="muted">Aucun.</p>'}
    <h2 style="font-size:20px;margin-top:24px">Événements à valider (${evs.length})</h2>
    ${evs.map(e => `<div class="ligne-l">${e.affiche ? `<img class="mini" src="${esc(photo(e.affiche))}" alt="">` : '<div class="mini"></div>'}<div><b><a href="#/evenement/${e.id}">${esc(e.titre)}</a></b><div class="muted petit">${esc(quand(e.debut, e.fuseau))} · ${lieuEv(e)} · ${contact(e.orga_id)}</div><div class="petit">${esc(e.description.slice(0, 240))}</div></div>
      <div class="actions"><button class="btn btn-s btn-ok" data-ev="${e.id}" data-v="publie">Publier</button><button class="btn btn-s btn-ko" data-ev="${e.id}" data-v="refuse">Refuser</button></div></div>`).join('') || '<p class="muted">Aucun.</p>'}</div>`);
  $('#app').onclick = async ev => {
    const b = ev.target.closest('[data-v]'); if (!b) return;
    try {
      if (b.dataset.orga) await q(sb.from('profiles').update({ orga: b.dataset.v }).eq('id', b.dataset.orga));
      else { const motif = b.dataset.v === 'refuse' ? prompt('Motif du refus (visible par l’organisateur) :', '') : null; if (b.dataset.v === 'refuse' && motif === null) return; await q(sb.from('evenements').update({ statut: b.dataset.v, motif_refus: motif }).eq('id', b.dataset.ev)); }
      toast('C’est fait.'); pageAdmin();
    } catch (err) { toast(erreur(err), true); }
  };
}

// ---------------------------------------------------------------- routeur
async function rendre() {
  const h = (location.hash || '#/').split('?')[0], [, a, b, c] = h.split('/');
  if (flux && !h.startsWith('#/orga/controle')) { flux.getTracks().forEach(t => t.stop()); flux = null; }
  nav(); window.scrollTo(0, 0); document.title = 'EventPass — sorties, concerts et soirées, aux Antilles et ailleurs';
  try {
    if (!a) return await pageAccueil();
    if (!PRET) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Ouverture très bientôt</h3></div>');
    if (a === 'evenement' && b) return await pageEvenement(b);
    if (a === 'billets') return await pageBillets();
    if (a === 'orga') return await pageOrga(b, c);
    if (a === 'admin') return await pageAdmin();
    if (a === 'connexion') return pageConnexion();
    if (a === 'inscription') return pageInscription();
    if (a === 'compte') return await pageCompte();
    if (a === 'deconnexion') { await sb.auth.signOut(); await chargerMoi(); toast('À bientôt !'); return aller('#/'); }
    vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Page introuvable</h3><a href="#/">Accueil</a></div>');
  } catch (e) { vue(`<div class="wrap"><p>${esc(erreur(e))}</p></div>`); }
}
(async () => {
  window.addEventListener('hashchange', rendre);
  if (PRET) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { moi = null; profil = null; nav(); } }); await chargerMoi().catch(() => {}); }
  rendre();
})();
