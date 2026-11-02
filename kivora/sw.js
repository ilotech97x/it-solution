// Kivora est devenu Woulib : cet ancien service worker se retire et vide son cache
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(l => Promise.all(l.map(k => caches.delete(k)))).then(() => self.registration.unregister())));
