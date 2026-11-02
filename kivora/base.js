/* Base commune des applications IloTech (Kivora, Woulib) : connexion, outils, notifications, carte.
   Même compte et même base Supabase que Kaz An Nou et EventPass. Chaque appli définit APP (nom, pages, menu). */
'use strict';
if (window.top !== window.self) { try { window.top.location = window.location.href; } catch (e) { document.documentElement.style.display = 'none'; } }

const CFG = window.KAZ_CONFIG || {};
const PRET = !!(CFG.url && CFG.cle && window.supabase);
const sb = PRET ? window.supabase.createClient(CFG.url, CFG.cle, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;
const WA = '596696482678';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = n => (Math.round(Number(n) * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: Number(n) % 1 ? 2 : 0 }) + ' €';
const fmt = (d, o, fuseau) => new Date(d).toLocaleString('fr-FR', { timeZone: fuseau || Intl.DateTimeFormat().resolvedOptions().timeZone, ...o });
const heure = d => fmt(d, { hour: '2-digit', minute: '2-digit' });
const jourHeure = d => fmt(d, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const tag = ([c, t]) => `<span class="tag ${c}">${esc(t)}</span>`;
const photo = p => !p ? '' : /^https:\/\//.test(p) ? p : PRET ? sb.storage.from('photos').getPublicUrl(p).data.publicUrl : '';
const wa = (tel, txt) => `https://wa.me/${telInternational(tel || WA) || WA}?text=${encodeURIComponent(txt)}`;
const param = () => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
const aller = h => { if (location.hash === h) rendre(); else location.hash = h; };
const vue = h => { $('#app').innerHTML = h; };
const attente = () => vue('<div class="chargement">Chargement…</div>');
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
// adresse → coordonnées (OpenStreetMap), en restant dans le territoire choisi
async function geocoder(texte, territoire) {
  const t = territoire === 'Autre pays' ? '' : (territoire || '').replace('Hexagone et Corse', 'France');
  const r = await (await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=' + encodeURIComponent([texte, t].filter(Boolean).join(', ')))).json();
  return r.map(x => ({ nom: x.display_name, lat: Number(x.lat), lng: Number(x.lon) }));
}
// carte Leaflet hébergée sur le site (nom différent de « leaflet », que la bibliothèque crée elle-même)
function chargerCarte() {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((ok, ko) => {
    const c = document.createElement('link'); c.rel = 'stylesheet'; c.href = 'lib/leaflet/leaflet.css'; document.head.appendChild(c);
    const s = document.createElement('script'); s.src = 'lib/leaflet/leaflet.js'; s.onload = () => ok(window.L); s.onerror = ko; document.head.appendChild(s);
  });
}
function fondCarte(L, el, centre, zoom) {
  const m = L.map(el, { scrollWheelZoom: false }).setView(centre, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(m);
  return m;
}
const CENTRES = { Martinique: [14.64, -61.02, 10], Guadeloupe: [16.2, -61.55, 10], Guyane: [4.93, -52.32, 10], 'Saint-Martin': [18.07, -63.06, 12], 'Saint-Barthélemy': [17.9, -62.83, 13],
  'La Réunion': [-21.13, 55.53, 10], Mayotte: [-12.82, 45.15, 11], 'Hexagone et Corse': [46.6, 2.4, 5] };
// territoire choisi par le visiteur, retenu sur cet appareil
function terrPrefere(v) { try { if (v !== undefined) localStorage.setItem('ilTerritoire', v); return localStorage.getItem('ilTerritoire') ?? ''; } catch (e) { return v ?? ''; } }

// ---------------------------------------------------------------- session et compte (commun à toutes les applis)
let moi = null, profil = null, contact = null, nbNotifs = 0;
async function chargerMoi() {
  moi = null; profil = null; contact = null; nbNotifs = 0; if (!PRET) return;
  moi = (await sb.auth.getSession()).data.session?.user || null;
  if (!moi) return;
  const [p, c, n] = await Promise.all([q(sb.from('profiles').select('*').eq('id', moi.id).maybeSingle()), q(sb.from('contacts').select('*').eq('id', moi.id).maybeSingle()).catch(() => null),
    q(sb.from('notifs').select('id').eq('lu', false)).catch(() => [])]);
  profil = p; contact = c; nbNotifs = n.length;
  if (APP.apresConnexion) await APP.apresConnexion();
}
const exigeCompte = () => { if (moi) return true; aller('#/connexion?retour=' + encodeURIComponent(location.hash)); return false; };

function pageConnexion() {
  if (moi) return aller(APP.accueilConnecte);
  vue(`<div class="wrap"><div class="carte-f"><h1>Connexion</h1><p class="muted">Un seul compte pour ${esc(APP.nom)}, EventPass et Kaz An Nou.</p>
    <form class="f" id="fCo"><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label><button class="btn btn-p">Se connecter</button></form>
    <p><button class="lien" id="oubli">Mot de passe oublié ?</button></p><p class="muted">Pas de compte ? <a href="#/inscription">Créer un compte</a></p></div></div>`);
  $('#fCo').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try { await q(sb.auth.signInWithPassword({ email: d.email.trim(), password: d.mdp })); await chargerMoi(); toast('Bienvenue ' + (profil?.prenom || '') + ' !'); aller(decodeURIComponent(param().retour || '') || APP.accueilConnecte); }
    catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#oubli').addEventListener('click', async () => {
    const email = $('#fCo').email.value.trim(); if (!email) return toast('Écrivez d’abord votre email.', true);
    try { await q(sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://immo.ilo-tech.com/?nouveau-mdp=1' })); toast('Si un compte existe, un email est envoyé.'); } catch (err) { toast(erreur(err), true); }
  });
}
function pageInscription() {
  if (moi) return aller(APP.accueilConnecte);
  vue(`<div class="wrap"><div class="carte-f"><h1>Créer un compte</h1><p class="muted">Un seul compte pour ${esc(APP.nom)}, EventPass et Kaz An Nou.</p>
    <form class="f" id="fIns"><div class="ligne2"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name"></label><label>Nom<input name="nom" maxlength="60" autocomplete="family-name"></label></div>
      <label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Téléphone <span class="aide">(pour ${esc(APP.pourTel)})</span><input type="tel" name="telephone" pattern="[0-9 +]{6,20}" required autocomplete="tel"></label>
      <label>Mot de passe <span class="aide">(8 caractères minimum)</span><input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> J’accepte les <a href="cgu.html" target="_blank">conditions</a> et la <a href="https://ilo-tech.com/confidentialite.html" target="_blank">confidentialité</a>.</label>
      <button class="btn btn-p">Créer mon compte</button></form></div></div>`);
  $('#fIns').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try {
      const r = await q(sb.auth.signUp({ email: d.email.trim(), password: d.mdp, options: { data: { prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim() } } }));
      if (r.session) { await chargerMoi(); toast('Compte créé, bienvenue !'); aller(decodeURIComponent(param().retour || '') || APP.accueilConnecte); }
      else vue('<div class="wrap"><div class="carte-f"><h1>Vérifiez vos emails 📩</h1><p>Cliquez sur le lien reçu pour activer votre compte, puis connectez-vous.</p></div></div>');
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
}
async function pageNotifs() {
  if (!exigeCompte()) return;
  const n = await q(sb.from('notifs').select('*').order('created_at', { ascending: false }).limit(50));
  vue(`<div class="wrap" style="padding-top:22px;max-width:760px"><h1>Notifications</h1>
    ${n.length ? n.map(x => `<a class="ligne-l" style="grid-template-columns:40px 1fr;text-decoration:none;color:inherit;${x.lu ? 'opacity:.6' : ''}" href="${esc(x.lien && x.lien.startsWith('#/') ? x.lien : '#/')}"><span style="font-size:26px">${x.lu ? '📭' : '📬'}</span>
      <div>${esc(x.texte)}<div class="muted petit">${esc(jourHeure(x.created_at))}</div></div></a>`).join('') : '<div class="vide-etat"><div class="ico">🔔</div><h3>Aucune notification</h3></div>'}</div>`);
  const nonLues = n.filter(x => !x.lu).map(x => x.id);
  if (nonLues.length) { await sb.from('notifs').update({ lu: true }).in('id', nonLues); nbNotifs = 0; nav(); }
}
function nav() {
  const h = location.hash || '#/', on = p => (p === '#/' ? h === '#/' || h.startsWith('#/?') : h.startsWith(p)) ? 'on' : '';
  const b = n => n ? `<span class="badge">${n}</span>` : '';
  $('#nav').innerHTML = APP.menu().map(([href, t]) => `<a href="${href}" class="${on(href)}">${t}</a>`).join('') +
    (moi ? `<a class="cloche" href="#/notifs" aria-label="Notifications">🔔${b(nbNotifs)}</a><a href="#/deconnexion">Déconnexion</a>` : `<a href="#/connexion" class="${on('#/connexion')}">Connexion</a><a class="btn btn-p btn-s" href="#/inscription">Commencer</a>`);
  $('#bas').innerHTML = APP.menuBas().map(([href, i, t, n]) => `<a href="${href}" class="${on(href)}"><span>${i}</span>${t}${b(n)}</a>`).join('');
}
async function rendre() {
  const h = (location.hash || '#/').split('?')[0], parts = h.split('/').slice(1);
  if (APP.quitter) APP.quitter(h);
  nav(); window.scrollTo(0, 0); document.title = APP.titre;
  try {
    if (!PRET) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Ouverture très bientôt</h3></div>');
    if (parts[0] === 'connexion') return pageConnexion();
    if (parts[0] === 'inscription') return pageInscription();
    if (parts[0] === 'notifs') return await pageNotifs();
    if (parts[0] === 'deconnexion') { await sb.auth.signOut(); await chargerMoi(); toast('À bientôt !'); return aller('#/'); }
    const page = APP.pages[parts[0] || ''];
    if (page) return await page(...parts.slice(1));
    vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Page introuvable</h3><a href="#/">Accueil</a></div>');
  } catch (e) { vue(`<div class="wrap"><div class="vide-etat" style="margin-top:30px"><h3>Oups</h3><p>${esc(erreur(e))}</p><a href="#/">Accueil</a></div></div>`); }
}
function demarrer() {
  window.addEventListener('hashchange', rendre);
  (async () => {
    if (PRET) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { moi = null; profil = null; nav(); } }); await chargerMoi().catch(() => {}); }
    rendre();
  })();
}
