/* Outils gratuits : QR code, mot de passe, onduleur. Tout reste dans le navigateur. */
(function () {
  const $ = id => document.getElementById(id);

  // QR code
  $('qrBtn').addEventListener('click', () => {
    const t = $('qrTexte').value.trim();
    const box = $('qrRendu');
    box.innerHTML = '';
    if (!t || !window.QRCode) { box.textContent = t ? 'Outil indisponible pour le moment.' : 'Tapez une adresse ou un texte.'; return; }
    new QRCode(box, { text: t, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
    setTimeout(() => {
      const c = box.querySelector('canvas');
      if (c) { $('qrDl').href = c.toDataURL('image/png'); $('qrDl').hidden = false; }
    }, 100);
  });

  // mot de passe (tirage cryptographique, sans caractères ambigus)
  const genere = () => {
    const n = Math.min(64, Math.max(12, Number($('mdpLong').value) || 16));
    let car = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    if ($('mdpSym').checked) car += '!#$%&*+-=?@_';
    const v = new Uint32Array(n);
    crypto.getRandomValues(v);
    $('mdpRes').textContent = Array.from(v, x => car[x % car.length]).join('');
  };
  $('mdpBtn').addEventListener('click', genere);
  $('mdpCopie').addEventListener('click', () => {
    const t = $('mdpRes').textContent;
    if (t && t !== '—' && navigator.clipboard) navigator.clipboard.writeText(t).then(() => { $('mdpCopie').textContent = 'Copié ✓'; setTimeout(() => { $('mdpCopie').textContent = 'Copier'; }, 1500); });
  });
  genere();

  // onduleur : puissance totale -> puissance conseillée (VA), avec marge
  const APPAREILS = [['Box internet', 15], ['Starlink (antenne et routeur)', 75], ['Ordinateur portable', 65], ['Ordinateur de bureau et écran', 250],
    ['Imprimante (veille)', 10], ['Caisse enregistreuse', 80], ['Petit serveur ou NAS', 60], ['Caméras et enregistreur', 40], ['Télévision', 100]];
  $('ondListe').innerHTML = APPAREILS.map(([n, w], i) => `<label class="ond-item"><input type="checkbox" data-w="${w}" ${i < 2 ? "checked" : ""}><span>${n} <span class="muted">≈ ${w} W</span></span></label>`).join('');
  const calcule = () => {
    const w = [...document.querySelectorAll('#ondListe input:checked')].reduce((t, c) => t + Number(c.dataset.w), 0);
    if (!w) { $('ondRes').textContent = 'Cochez au moins un appareil.'; return; }
    const va = Math.ceil(w / 0.6 * 1.25 / 100) * 100;   // facteur de puissance ≈ 0,6 et 25 % de marge
    $('ondRes').innerHTML = `Consommation ≈ <b>${w} W</b> → un onduleur d’au moins <b>${Math.max(600, va)} VA</b>. Pour plus d’autonomie, prenez une taille au-dessus.`;
  };
  $('ondListe').addEventListener('change', calcule);
  calcule();
})();
