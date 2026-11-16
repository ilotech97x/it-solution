/* IloTech comme une appli : enregistre le service worker (sw.js) et propose « Installer l'appli » dans la barre du haut
   quand le navigateur le permet (Android, ordinateur). Sur iPhone : Partager › Sur l'écran d'accueil (pas de bouton possible). */
(() => {
  if (!('serviceWorker' in navigator) || location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { /* site utilisable sans */ }); });
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
