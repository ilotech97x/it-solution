/* Fiche tarifs : générée à partir de data.js — toute modification de prix ou de prestation s'y reporte automatiquement */
(function () {
  const mois = s => s.mensuel ? '/mois' : '';
  const prixBase = s => s.base ? eur(s.base) + mois(s) : 'Gratuit';
  const prixOpt = (s, o) => o[2] ? '+' + eur(o[2]) + mois(s) : esc(o[3] || 'Gratuit');

  const service = s => `
    <section class="f-svc">
      <h3><span>${ico(s.icon)} ${esc(s.nom)}</span><b class="mono">${s.base ? 'dès ' : ''}${prixBase(s)}</b></h3>
      <p class="f-desc">${esc(s.desc)}</p>
      <table>${s.options.map(o => `<tr><td>${esc(o[1])}</td><td class="mono">${prixOpt(s, o)}</td></tr>`).join('')}</table>
      ${s.note ? `<p class="f-note">${esc(s.note)}</p>` : ''}
    </section>`;

  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  let h = `
    <header class="f-head">
      <div class="f-brand"><img class="devis-logo" src="img/logo-ilo.png" alt=""><div><b>${esc(ENTREPRISE.nomCommercial)}</b><span>Dépannage · installation · sécurité — Martinique</span></div></div>
      <div class="f-meta mono"><b>FICHE TARIFS</b><span>À jour le ${today}</span>
        ${Object.values(AGENCES).map(a => `<span>${esc(a.nom)} · ${esc(a.tel)}</span>`).join('')}</div>
    </header>
    <p class="f-intro">Prix main d'œuvre ; matériel et pièces en supplément sauf mention contraire. Le prix « dès » comprend le diagnostic et la prise en charge ; les options s'ajoutent. Devis gratuit, prix confirmé avant toute intervention${CONFIG.mentionPrix ? ' · ' + esc(CONFIG.mentionPrix) : ''}.</p>`;

  // Packs
  h += `<h2>Packs à prix fixe</h2><div class="f-packs">${PACKS.map(p => `
    <div class="f-pack"><b>${esc(p.nom)}</b><span class="mono">${eur(p.prix)}${remise(p) > 0 ? ` <s>${eur(itemsValue(p.items))}</s> −${remise(p)} %` : ''}</span><small>${esc(p.inclus.join(' · '))}</small></div>`).join('')}</div>`;

  // Services par onglet
  const vus = new Set();
  h += CATEGORIES.filter(c => !c.bientot).map(c => {
    const list = c.services.filter(id => !vus.has(id)); list.forEach(id => vus.add(id));
    return list.length ? `<h2 style="--t:${c.couleur}">${ico(c.icon)} ${esc(c.nom)}</h2><div class="f-grid">${list.map(id => service(svc(id))).join('')}</div>` : '';
  }).join('');

  // Déplacement, délais, conditions
  h += `<h2>Déplacement, délais et remises</h2><div class="f-grid">
    <section class="f-svc"><h3><span>Déplacement</span></h3><table>
      ${Object.entries(ZONES).map(([k, z]) => `<tr><td>${esc(z.nom)}<small>${COMMUNES.filter(c => c[1] === k).map(c => esc(c[0])).join(', ')}</small></td><td class="mono">${z.prix ? eur(z.prix) : 'Offert'}</td></tr>`).join('')}
      <tr><td>En agence ou à distance</td><td class="mono">Gratuit</td></tr></table>
      <p class="f-note">Déplacement offert dès ${eur(CONFIG.deplacementOffertDes)} de prestation.</p></section>
    <section class="f-svc"><h3><span>Délai et créneau</span></h3><table>
      ${Object.values(DELAIS).map(x => `<tr><td>${esc(x.label)}<small>${esc(x.desc)}</small></td><td class="mono">${x.prix ? '+' + eur(x.prix) : 'Inclus'}</td></tr>`).join('')}
      ${Object.values(CRENEAUX).map(x => `<tr><td>${esc(x.label)}<small>${esc(x.heures)}</small></td><td class="mono">${x.prix ? '+' + eur(x.prix) : 'Inclus'}</td></tr>`).join('')}</table></section>
    <section class="f-svc"><h3><span>Remises et conditions</span></h3>
      <p class="f-desc">Devis gratuit et sans engagement, valable ${CONFIG.validiteDevis} jours.</p>
      ${BIENTOT.length ? `<p class="f-desc"><b>Bientôt :</b> ${BIENTOT.map(esc).join(', ')}.</p>` : ''}</section>
  </div>
  <footer class="f-foot">${esc(ENTREPRISE.nomCommercial)} — Entreprise individuelle · SIRET ${esc(ENTREPRISE.siret)} · ${esc(ENTREPRISE.adresse)}</footer>`;

  document.getElementById('fiche').innerHTML = h;
})();
