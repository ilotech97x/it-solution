/* Base commune des applications IloTech (Woulib) : connexion, outils, notifications, carte.
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
// une page qui répond après qu'on l'a quittée n'écrase pas la suivante ; le premier affichage libère la transition de page
const vue = h => { if (pageEnCours !== null && location.hash !== pageEnCours) return; $('#app').innerHTML = h; if (aRestaurer) window.scrollTo(0, aRestaurer); if (premierRendu) { const f = premierRendu; premierRendu = null; f(); } };
// en attendant les données : la forme de la page (blocs gris qui miroitent), pas un texte « Chargement… »
const attente = () => vue(`<div class="wrap squelette" aria-busy="true" aria-label="Chargement"><i class="sq sq-t"></i><i class="sq sq-l"></i><div class="sq-g">${'<i class="sq sq-c"></i>'.repeat(4)}</div><i class="sq sq-l"></i><i class="sq sq-l court"></i></div>`);
// petite mémoire des lectures : revenir sur une page est instantané ; la base reste la référence (commande, stock… revérifiés par le serveur)
const memoire = new Map();
function memo(cle, f, ms = 30000) {
  const m = memoire.get(cle); if (m && Date.now() - m.t < ms) return m.p;
  const p = f().catch(e => { memoire.delete(cle); throw e; }); memoire.set(cle, { t: Date.now(), p }); return p;
}
const oublier = debut => { for (const k of [...memoire.keys()]) if (k.startsWith(debut)) memoire.delete(k); };
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
  moi = null; profil = null; contact = null; nbNotifs = 0; memoire.clear(); if (!PRET) return;
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
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> <span>J’accepte les <a href="cgu.html" target="_blank">conditions</a> et la <a href="https://ilo-tech.com/confidentialite.html" target="_blank">confidentialité</a>.</span></label>
      <button class="btn btn-p">Créer mon compte</button></form></div></div>`);
  $('#fIns').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try {
      const r = await q(sb.auth.signUp({ email: d.email.trim(), password: d.mdp, options: { data: { prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim() } } }));
      if (r.session) { await chargerMoi(); toast('Compte créé, bienvenue !'); aller(decodeURIComponent(param().retour || '') || APP.apresInscription || APP.accueilConnecte); }
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
  const c = $('#clocheApp'); if (c) { c.hidden = !moi; c.innerHTML = (APP.icones?.().cloche || '🔔') + b(nbNotifs); }
  const r = $('#retourApp'); if (r && APP.icones && !r.querySelector('svg')) r.innerHTML = APP.icones().retour;
  $('#nav').innerHTML = APP.menu().map(([href, t]) => `<a href="${href}" class="${on(href)}">${t}</a>`).join('') +
    (moi ? `<a class="cloche" href="#/notifs" aria-label="Notifications">🔔${b(nbNotifs)}</a><a href="#/deconnexion">Déconnexion</a>` : `<a href="#/connexion" class="${on('#/connexion')}">Connexion</a><a class="btn btn-p btn-s" href="#/inscription">Commencer</a>`);
  $('#bas').innerHTML = APP.menuBas().map(([href, i, t, n]) => `<a href="${href}" class="${on(href)}"><span>${i}</span>${t}${b(n)}</a>`).join('');
}
// ---------------------------------------------------------------- navigation façon appli
// Chaque entrée de l'historique porte son rang : en avançant, la page arrive de la droite ; en revenant, elle repart vers la droite
// et l'on retrouve l'endroit où l'on était ; entre onglets du bas, simple fondu. Les pages restent des fonctions qui appellent vue().
let rang = 0, pageEnCours = null, premierRendu = null, aRestaurer = null, recul = false;
const defilements = {};
const onglets = () => APP.menuBas().map(([h]) => h.split('?')[0]);
const estOnglet = h => onglets().includes(h);
function sensNavigation(prec, h) {
  const st = history.state;
  let s = 'avant';
  if (st && typeof st.rang === 'number') { s = st.rang < rang ? 'retour' : st.rang === rang ? 'meme' : 'avant'; rang = st.rang; }
  else { rang += 1; try { history.replaceState({ rang }, ''); } catch (e) { /* historique indisponible */ } }
  recul = s === 'retour';   // en revenant (même vers un onglet), on retrouve l'endroit de la page
  if (prec === h) return 'meme';
  if (estOnglet(h) && (s === 'avant' || estOnglet(prec))) return 'onglet';
  return s;
}
// barre du haut sur téléphone : retour (pages intérieures), titre de la page qui apparaît quand son grand titre passe sous la barre
let guetteTitre = null;
function barreApp(h) {
  const racine = estOnglet(h);
  document.body.dataset.racine = racine ? 'oui' : 'non';
  const r = $('#retourApp'); if (r) r.hidden = racine;
  $('.haut')?.classList.remove('titre-on');
}
function titreBarre() {
  const t = $('#titreApp'), h1 = $('#app h1'); if (!t) return;
  t.textContent = h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : '';
  guetteTitre?.disconnect(); guetteTitre = null;
  if (h1 && 'IntersectionObserver' in window) {
    guetteTitre = new IntersectionObserver(([e]) => $('.haut')?.classList.toggle('titre-on', !e.isIntersecting && e.boundingClientRect.top < 80), { rootMargin: '-60px 0px 0px 0px' });
    guetteTitre.observe(h1);
  }
}
const chargerScript = src => new Promise((ok, ko) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
// ancienne adresse remplacée par une autre : sans laisser d'étape dans l'historique (le retour ne ramène pas ici)
const rediriger = h => location.replace(h);
function revenir() { if ((history.state?.rang || 1) > 1) history.back(); else aller(APP.parent ? APP.parent(location.hash) : '#/'); }
async function rendre() {
  const brut = location.hash || '#/', h = brut.split('?')[0], parts = h.split('/').slice(1);
  const prec = pageEnCours === null ? null : (pageEnCours || '#/').split('?')[0];
  defilements[rang] = scrollY;
  const sens = sensNavigation(prec, h);
  pageEnCours = location.hash;
  const executer = async () => {
    if (APP.quitter) APP.quitter(h);
    aRestaurer = recul ? defilements[rang] || null : null;
    nav(); barreApp(h); window.scrollTo(0, 0); document.title = APP.titre;
    await afficherPage(h, parts);
    if (aRestaurer) window.scrollTo(0, aRestaurer);
    aRestaurer = null; titreBarre();
  };
  const anime = prec !== null && sens !== 'meme' && document.startViewTransition && !document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!anime) return executer();
  // la page glisse dès qu'elle a quelque chose à montrer (au plus tard 150 ms : sa forme en attendant les données)
  document.documentElement.dataset.sens = sens;
  let pret; const affichee = new Promise(r => { pret = r; }); premierRendu = pret;
  const t = document.startViewTransition(() => { const p = executer(); return Promise.race([affichee, p, new Promise(r => setTimeout(r, 150)).then(() => { if (premierRendu === pret) attente(); })]); });
  const fin = () => { if (document.documentElement.dataset.sens === sens) delete document.documentElement.dataset.sens; };
  t.ready.catch(() => {}); t.updateCallbackDone.catch(() => {}); t.finished.then(fin, fin);
}
async function afficherPage(h, parts) {
  try {
    if (!PRET) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Ouverture très bientôt</h3></div>');
    if (parts[0] === 'connexion') return pageConnexion();
    if (parts[0] === 'inscription') return pageInscription();
    if (parts[0] === 'notifs') return await pageNotifs();
    if (parts[0] === 'deconnexion') { await sb.auth.signOut(); await chargerMoi(); toast('À bientôt !'); return aller('#/'); }
    let page = APP.pages[parts[0] || ''];
    // module chargé seulement quand on l'ouvre (GPS, projets…) : l'appli démarre plus vite
    if (!page && APP.differes?.[parts[0]]) { await chargerScript(APP.differes[parts[0]]); page = APP.pages[parts[0]]; }
    if (page) return await page(...parts.slice(1));
    vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Page introuvable</h3><a href="#/">Accueil</a></div>');
  } catch (e) { vue(`<div class="wrap"><div class="vide-etat" style="margin-top:30px"><h3>Oups</h3><p>${esc(erreur(e))}</p><a href="#/">Accueil</a></div></div>`); }
}
function demarrer() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', rendre);
  $('#retourApp')?.addEventListener('click', revenir);
  gestes();
  (async () => {
    if (PRET) { sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { moi = null; profil = null; nav(); } }); await chargerMoi().catch(() => {}); }
    rendre();
  })();
}

// ---------------------------------------------------------------- gestes et toucher
// appli installée : glisser depuis le bord gauche pour revenir, tirer vers le bas en haut d'un onglet pour rafraîchir
// (dans le navigateur, ces gestes existent déjà). Petite vibration au toucher des boutons d'ajout et des onglets (Android).
const installee = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
function gestes() {
  let g = null;
  const indic = (cls, txt) => { let e = $('.' + cls); if (!e) { e = document.createElement('div'); e.className = cls; e.setAttribute('aria-hidden', 'true'); e.textContent = txt; document.body.appendChild(e); } return e; };
  addEventListener('touchstart', e => {
    g = null; if (!installee() || e.touches.length > 1 || document.body.classList.contains('sans-defil') || e.target.closest('.leaflet-container, .gps, dialog, input, textarea, select')) return;
    const t = e.touches[0];
    if (t.clientX < 24 && (history.state?.rang || 1) > 1) g = { type: 'retour', x: t.clientX, y: t.clientY, d: 0 };
    else if (scrollY <= 0 && estOnglet((location.hash || '#/').split('?')[0])) g = { type: 'maj', x: t.clientX, y: t.clientY, d: 0 };
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (!g) return; const t = e.touches[0], dx = t.clientX - g.x, dy = t.clientY - g.y;
    if (g.type === 'retour') { if (Math.abs(dy) > 60) { g = null; $('.geste-retour')?.remove(); return; } g.d = dx; const el = indic('geste-retour', '‹'); el.style.transform = `translate(${Math.min(dx, 90) - 50}px, ${t.clientY - 24}px)`; el.classList.toggle('pret', dx > 80); }
    else { if (scrollY > 0 || dy < 0 || Math.abs(dx) > Math.abs(dy)) { g = null; $('.geste-maj')?.remove(); return; } g.d = dy; const el = indic('geste-maj', '↻'); el.style.transform = `translateY(${Math.min(dy, 110) - 50}px) rotate(${dy * 3}deg)`; el.classList.toggle('pret', dy > 80); }
  }, { passive: true });
  addEventListener('touchend', () => {
    if (!g) return; const fait = g.d > 80, type = g.type; g = null;
    $('.geste-retour')?.remove();
    if (type === 'maj') { const el = $('.geste-maj'); if (fait && el) { el.classList.add('tourne'); oublier(''); Promise.resolve(rendre()).finally(() => setTimeout(() => el.remove(), 300)); } else el?.remove(); }
    else if (fait) history.back();
  });
  document.addEventListener('click', e => { if (e.target.closest('.bas a, .qte button, .seg button, [data-vibre]')) try { navigator.vibrate?.(8); } catch (x) { /* facultatif */ } }, true);
}
// proposer d'installer l'appli (Android : bouton ; iPhone : la marche à suivre) ; jamais si elle l'est déjà ou si on l'a refusé
let invitationInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); invitationInstall = e; document.querySelectorAll('[data-installer]').forEach(b => { b.hidden = false; }); });
function blocInstallation() {
  let refuse = false; try { refuse = localStorage.getItem('ilInstallNon') === '1'; } catch (e) { /* stockage indisponible */ }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (installee() || refuse || !matchMedia('(max-width: 900px)').matches) return '';
  return `<div class="installer" id="blocInstall"><span>📲</span><div><b>Installez ${esc(APP.nom)}</b><small>${ios ? 'Touchez <b>Partager</b> ⬆️ puis <b>« Sur l’écran d’accueil »</b>.' : 'Plein écran, une icône sur votre téléphone.'}</small></div>
    ${ios ? '' : `<button class="btn btn-s btn-p" data-installer ${invitationInstall ? '' : 'hidden'}>Installer</button>`}<button class="fermer-i" data-install-non aria-label="Plus tard">✕</button></div>`;
}
document.addEventListener('click', async e => {
  if (e.target.closest('[data-install-non]')) { try { localStorage.setItem('ilInstallNon', '1'); } catch (x) { /* stockage indisponible */ } $('#blocInstall')?.remove(); }
  if (e.target.closest('[data-installer]') && invitationInstall) { invitationInstall.prompt(); const r = await invitationInstall.userChoice.catch(() => null); invitationInstall = null; if (r?.outcome === 'accepted') $('#blocInstall')?.remove(); }
});
