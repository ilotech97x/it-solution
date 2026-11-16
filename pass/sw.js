/* EventPass — service worker : l'appli s'installe sur l'écran d'accueil et s'ouvre même sans réseau (les billets gardés sur l'appareil
   par pass.js s'affichent alors avec leurs QR codes). Toujours la version en ligne d'abord, la copie locale seulement hors connexion.
   Seuls les fichiers du site sont gardés : jamais les données (Supabase), ni les cartes. CACHE à monter à chaque publication. */
const CACHE = 'eventpass-v2';
const COQUILLE = ['./', 'pass.css', 'pass.js', 'territoires.js', 'config.js', 'mesure.js', 'lib/supabase.js', 'lib/qrcode.js', 'img/logo.svg', 'fonts/fredoka.woff2', 'fonts/nunito.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(COQUILLE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(l => Promise.all(l.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  e.respondWith(fetch(r).then(rep => {
    if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(r, copie)); }
    return rep;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
