/* IloTech comme une appli : enregistre le service worker (sw.js) et propose « Installer l'appli » dans la barre du haut
   quand le navigateur le permet (Android, ordinateur). Sur iPhone : Partager › Sur l'écran d'accueil (pas de bouton possible). */
(() => {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  // service worker enregistré dès l'affichage (script en defer), puis il range les fichiers déjà chargés (coquille, servie par le cache HTTP)
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(() => navigator.serviceWorker.ready).then(reg => {
    const envoyer = () => {
      const urls = performance.getEntriesByType('resource').map(e => e.name).filter(n => n.indexOf(location.origin) === 0);
      if (reg.active && urls.length) reg.active.postMessage({ type: 'coquille', urls });
    };
    if (document.readyState === 'complete') setTimeout(envoyer, 1500); else window.addEventListener('load', () => setTimeout(envoyer, 1500));
    setTimeout(envoyer, 8000);
  }).catch(() => { /* site utilisable sans */ });
  const bandeau = hors => {   // message clair hors connexion (position fixe : ne décale rien)
    let b = document.getElementById('hors-ligne-ilo');
    if (!hors) { if (b) b.hidden = true; return; }
    if (!b) {
      b = document.createElement('div'); b.id = 'hors-ligne-ilo'; b.setAttribute('role', 'status');
      b.textContent = 'Hors connexion : les pages déjà visitées restent lisibles, le reste reviendra avec le réseau.';
      b.style.cssText = 'position:fixed;left:0;right:0;bottom:16px;margin:0 auto;width:max-content;max-width:calc(100% - 24px);z-index:9998;padding:10px 16px;border-radius:12px;background:#1f2937;color:#fff;font:600 14px/1.35 system-ui,sans-serif;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.3);pointer-events:none';
      document.body.appendChild(b);
    }
    b.hidden = false;
  };
  window.addEventListener('offline', () => bandeau(true)); window.addEventListener('online', () => bandeau(false));
  if (navigator.onLine === false) bandeau(true);
  let invite = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault(); invite = e;
    const barre = document.querySelector('.tn-in');
    if (!barre || barre.querySelector('.tn-inst')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tn-inst'; b.textContent = 'Installer l’appli'; b.title = 'Installer IloTech sur cet appareil';
    b.style.cssText = 'flex:none;align-self:center;min-height:34px;padding:4px 12px;border-radius:10px;border:1px solid #2b8cff;background:transparent;color:#9fd0ff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer';
    b.addEventListener('click', async () => { if (!invite) return; invite.prompt(); try { await invite.userChoice; } catch (x) { /* fenêtre fermée */ } invite = null; b.remove(); });
    barre.appendChild(b);
  });
  window.addEventListener('appinstalled', () => { document.querySelector('.tn-inst')?.remove(); });
})();
