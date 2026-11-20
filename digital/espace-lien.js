// Bouton « Espace client » de la page Digital : montré seulement quand la base a les fonctions de l'espace (commun/marketing2.sql installé).
// Appel anonyme : la fonction existe mais refuse l'anonyme (401/403) ; si elle n'existe pas (404/400), le bouton reste caché.
(() => {
  const c = window.KAZ_CONFIG, b = document.getElementById('espaceClient');
  if (!c || !b) return;
  fetch(c.url + '/rest/v1/rpc/mk_espace', { method: 'POST', headers: { apikey: c.cle, 'Content-Type': 'application/json' }, body: '{}' })
    .then(r => { if (r.status === 401 || r.status === 403) b.style.display = ''; }).catch(() => {});
})();
