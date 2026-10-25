/* =====================================================================
   OUTILS COMMUNS à toutes les pages (chargé juste après data.js)
   ===================================================================== */
const $ = id => document.getElementById(id);
// sécurité : le site refuse de s'afficher dans le cadre (iframe) d'un autre site
try { if (window.top !== window.self && !/^file:/.test(location.protocol)) window.top.location = window.location.href; } catch (e) { document.documentElement.style.display = 'none'; }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SITE = CONFIG.siteUrl;

// prix : « 35 € », « 9,90 € »
const eur = n => {
  const v = Math.round((Number(n) || 0) * 100) / 100;
  return (Number.isInteger(v) ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' €';
};

// services et packs
const svc = id => SERVICES.find(s => s.id === id);
const pack = id => PACKS.find(p => p.id === id);
const optOf = (sid, oid) => svc(sid).options.find(o => o[0] === oid);
// valeur « à la carte » d'un ensemble { service: [options] } (sert au « au lieu de » des packs)
const itemsValue = items => Object.entries(items).reduce((t, [sid, opts]) => t + svc(sid).base + opts.reduce((u, o) => u + optOf(sid, o)[2], 0), 0);

// téléphone : 0696 12 34 56 -> 596696123456 (WhatsApp, appel)
const digits = tel => String(tel || '').replace(/\D/g, '');
const intl = tel => { let d = digits(tel); if (d.startsWith('00')) d = d.slice(2); return d.startsWith('596') ? d : '596' + d.replace(/^0/, ''); };
const waUrl = (tel, text) => 'https://wa.me/' + (digits(tel) ? intl(tel) : '') + (text ? '?text=' + encodeURIComponent(text) : '');
const telUrl = tel => 'tel:+' + intl(tel);

// dates au format AAAA-MM-JJ (heure locale)
const iso = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
const parseISO = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
const todayISO = () => iso(new Date());
const addDays = (s, n) => { const dt = parseISO(s); dt.setDate(dt.getDate() + n); return iso(dt); };

// Bandeau horizontal d'une carte de service : fond à sa couleur, pictogramme entier à gauche, badge à droite (SVG)
function bandeau({ id, icon, badge, couleur }) {
  const g = 'bd-' + id;
  const points = [0, 1, 2, 3].flatMap(x => [0, 1].map(y => `<circle cx="${250 + x * 10}" cy="${16 + y * 10}" r="1.6"/>`)).join('');
  return `<svg class="bandeau" viewBox="0 0 320 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${couleur}" stop-opacity=".95"/><stop offset="1" stop-color="${couleur}" stop-opacity=".2"/></linearGradient></defs>
    <rect width="320" height="90" fill="#0b1324"/><rect width="320" height="90" fill="url(#${g})" opacity=".75"/>
    <circle cx="300" cy="-6" r="56" fill="#fff" opacity=".08"/><circle cx="150" cy="104" r="44" fill="#fff" opacity=".06"/>
    <g fill="#fff" opacity=".35">${points}</g>
    <g transform="translate(26 15) scale(2.5)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ''}</g>
    ${badge ? `<circle cx="112" cy="62" r="17" fill="#fff"/><g transform="translate(102.5 52.5) scale(.8)" fill="none" stroke="${couleur}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[badge] || ''}</g>` : ''}
  </svg>`;
}

// Illustration d'une catégorie ou d'un pôle : fond à sa couleur, grand pictogramme, badge (SVG, aucun fichier image)
function illustration({ id, icon, badge, couleur }, cls = '') {
  const g = 'il-' + id + cls.replace(/\W/g, '');
  const points = [0, 1, 2].flatMap(x => [0, 1, 2].map(y => `<circle cx="${16 + x * 9}" cy="${16 + y * 9}" r="1.6"/>`)).join('');
  return `<svg class="illu ${cls}" viewBox="0 0 160 110"${/bande/.test(cls) ? ' preserveAspectRatio="xMidYMid slice"' : ''} aria-hidden="true" focusable="false">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${couleur}" stop-opacity=".95"/><stop offset="1" stop-color="${couleur}" stop-opacity=".25"/></linearGradient></defs>
    <rect width="160" height="110" rx="16" fill="#0b1324"/><rect width="160" height="110" rx="16" fill="url(#${g})" opacity=".7"/>
    <circle cx="138" cy="16" r="36" fill="#fff" opacity=".08"/><circle cx="14" cy="104" r="30" fill="#fff" opacity=".07"/>
    <g fill="#fff" opacity=".35">${points}</g>
    <ellipse cx="80" cy="92" rx="36" ry="5" fill="#000" opacity=".22"/>
    <g transform="translate(50 22) scale(2.5)" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ''}</g>
    ${badge ? `<circle cx="120" cy="76" r="18" fill="#fff"/><g transform="translate(110 66) scale(.84)" fill="none" stroke="${couleur}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[badge] || ''}</g>` : ''}
  </svg>`;
}

// ---------- Statistiques de visite anonymes (sans cookie, sans nom ni adresse IP) -> onglet « Visites » du tableau Google
function stat(e, detail) {
  try {
    if (!CONFIG.endpoint || location.protocol === 'file:' || /gestion|prospection|visibilite/.test(location.pathname)) return;
    const q = new URLSearchParams(location.search);
    const ref = document.referrer && !document.referrer.includes(location.host) ? new URL(document.referrer).hostname.replace(/^www\./, '') : '';
    const page = (location.pathname.split('/').pop() || 'index').replace('.html', '') || 'index';
    navigator.sendBeacon(CONFIG.endpoint, JSON.stringify({ action: 'stat', e, d: String(detail || '').slice(0, 60), p: page,
      a: innerWidth <= 900 ? 'mobile' : 'ordinateur', s: (q.get('src') || q.get('utm_source') || ref || 'direct').slice(0, 40) }));
  } catch (x) {}
}
// thème clair / sombre : le bouton est ajouté dans l'en-tête de chaque page publique
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('itTheme', t); } catch (e) {}
  const b = $('themeBtn');
  if (!b) return;
  const clair = t === 'light';
  b.setAttribute('aria-pressed', clair);
  b.title = b.ariaLabel = clair ? 'Passer en mode sombre' : 'Passer en mode clair';
  b.innerHTML = `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${clair ? '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'}</svg>`;
}
try {
  const zone = document.querySelector('.top .top-actions');
  if (zone && !document.body.classList.contains('gestion-page')) {
    zone.insertAdjacentHTML('afterbegin', '<button type="button" class="btn btn-head btn-theme" id="themeBtn" onclick="setTheme(document.documentElement.dataset.theme === \'light\' ? \'dark\' : \'light\')"></button>');
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  }
} catch (e) {}

(() => {
  try { if (!sessionStorage.getItem('itVisite')) { sessionStorage.setItem('itVisite', '1'); stat('visite'); } } catch (x) {}
  stat('vue');
  // clics WhatsApp et téléphone, sur toutes les pages
  document.addEventListener('click', ev => {
    const a = ev.target.closest && ev.target.closest('a[href]');
    if (!a) return;
    if (/wa\.me/.test(a.href)) stat('whatsapp', a.textContent.trim().slice(0, 30));
    else if (/^tel:/.test(a.href)) stat('appel', a.href.slice(4));
  });
})();
