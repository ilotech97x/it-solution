// Bouton clair/sombre ajouté par outils.js (son onclick en ligne est bloqué par la CSP) : géré ici par un écouteur délégué.
(() => {
  document.addEventListener('click', ev => {
    const b = ev.target.closest && ev.target.closest('#themeBtn');
    if (b && typeof setTheme === 'function') setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light');
  });
})();
