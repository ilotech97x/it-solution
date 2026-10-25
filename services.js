/* Page « Services et tarifs » : organisée par pôle, générée à partir de data.js (mêmes prix que le formulaire) */
(function () {
  const where = { site: 'chez vous', atelier: 'en agence', distance: 'à distance' };
  const prix = s => s.base ? 'dès ' + eur(s.base) + (s.mensuel ? '/mois' : '') : 'Gratuit';

  const block = (s, c) => `
    <section class="svc-block" id="${s.id}" style="--t:${c.couleur}">
      <h3>${ico(s.icon)} ${esc(s.nom)} <span class="mono">${prix(s)}</span></h3>
      <p class="muted">${esc(s.desc)} — ${s.modes.map(m => where[m]).join(', ')}.${s.note ? ` ${esc(s.note)}` : ''}</p>
      ${s.compris ? `<div class="svc-compris"><div><b>Compris</b><ul>${s.compris.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${s.pasCompris ? `<div class="non"><b>Pas compris</b><ul>${s.pasCompris.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}</div>` : ''}
      <table class="price-table"><tbody>${s.options.map(o => `<tr><td>${esc(o[1])}</td><td class="mono">${o[2] ? '+' + eur(o[2]) + (s.mensuel ? '/mois' : '') : esc(o[3] || 'Gratuit')}</td></tr>`).join('')}</tbody></table>
    </section>`;

  const poles = UNIVERS.map(u => ({ ...u, cats: CATEGORIES.filter(c => c.univers === u.id && !c.bientot) }));

  // 1. Les pôles en un coup d'œil
  let h = `<h2>Nos pôles</h2><div class="poles">${poles.map(u => `
    <a class="pole" href="#pole-${u.id}" style="--t:${u.couleur}">
      ${scene(u, 'grand')}<b>${esc(u.nom)}</b><span>${esc(u.desc)}</span>
      <small>${u.cats.map(c => esc(c.nom)).join(' · ')}</small><em>Découvrir →</em></a>`).join('')}</div>`;
  if (BIENTOT.length) h += `<p class="bientot"><span class="soon">Bientôt</span> ${BIENTOT.map(esc).join(' · ')}</p>`;

  // 2. Le détail de chaque pôle
  h += poles.map(u => `
    <section class="pole-section" id="pole-${u.id}" style="--t:${u.couleur}">
      <h2 class="pole-titre">${ico(u.icon)} ${esc(u.nom)}</h2>
      <p>${esc(u.desc)}</p>
      <div class="actions left"><a class="btn btn-primary" href="index.html?pole=${u.id}">Rendez-vous ou devis : ${esc(u.nom)}</a></div>
      ${u.cats.map(c => `<h3 class="cat-title" style="--t:${c.couleur}">${illustration(c, 'mini')} ${esc(c.nom)}</h3>
        <div class="cat-scene" style="--t:${c.couleur}">${visuel(c)}<div><p class="cat-accroche">${esc(c.accroche)}</p>
          <ul class="cat-inclus">${c.services.map(id => `<li>${ico(svc(id).icon)} <b>${esc(svc(id).nom)}</b> <span>${esc(svc(id).desc)}</span></li>`).join('')}</ul>
          ${typeof PAGES_SEO !== 'undefined' && PAGES_SEO[c.id] ? `<a class="cat-plus" href="${PAGES_SEO[c.id].url}">En savoir plus : ${esc(PAGES_SEO[c.id].titre)} →</a>` : ''}</div></div>
        <div class="svc-list">${c.services.map(id => block(svc(id), c)).join('')}</div>`).join('')}
    </section>`).join('');

  // 3. Questions fréquentes (aussi lues par Google : données structurées FAQPage)
  const z = ZONES, d = DELAIS;
  const faq = [
    ['Intervenez-vous partout en Martinique ?', `Oui. Nos agences de Ducos et du Robert couvrent toute l’île. Le déplacement est offert dans les communes d’agence, puis coûte ${eur(z.centre.prix)} (Centre), ${eur(z.sud.prix)} (Sud) ou ${eur(z.nord.prix)} (Nord), et il est offert dès ${eur(CONFIG.deplacementOffertDes)} de prestation.`],
    ['Combien coûte un dépannage ?', `Un dépannage d’ordinateur commence à ${eur(svc('repair').base)}, diagnostic compris. Le prix est confirmé avant de réparer, et les pièces éventuelles sont annoncées avant. En agence ou à distance, il n’y a pas de frais de déplacement.`],
    ['Puis-je payer en plusieurs fois ?', `Oui : à partir de ${eur(CONFIG.paiement3fois)} (site internet, application, installation de caméras ou de réseau), vous pouvez payer en 3 fois sans frais.`],
    ['Je ne sais pas par où commencer pour mon site ou ma sécurité.', `Commencez petit : un contrôle sécurité express à ${eur(svc('cyberexpress').base)}, ou un site d’une page à ${eur(svc('siteweb').base)} qui pourra grandir ensuite. Pour une application, une maquette à tester sur votre téléphone, déduite si vous continuez.`],
    ['Le devis est-il gratuit ?', 'Oui, le devis est gratuit et sans engagement. Le prix est confirmé avant toute intervention : vous savez tout avant de dire oui.'],
    ['En combien de temps intervenez-vous ?', `Sous 3 jours en temps normal. Une intervention sous 24 à 48 h coûte ${eur(d.rapide.prix)} de plus, et le jour même ${eur(d.urgence.prix)} de plus, selon disponibilité.`],
    ['Puis-je déposer mon matériel en agence ?', 'Oui, sans frais de déplacement, à Ducos ou au Robert. Vous pouvez aussi être dépanné à distance quand c’est possible.'],
    ['Travaillez-vous avec les entreprises ?', 'Oui : maintenance du parc, réseau et Wi-Fi professionnel, emails à votre nom (Microsoft 365), cybersécurité, caisse, sites web et marketing.'],
    ['Mes données restent-elles confidentielles ?', 'Oui. Nous n’accédons qu’à ce qui est nécessaire à l’intervention, et vos fichiers ne sont ni copiés ni conservés sans votre accord.'],
    ['Comment suivre ma réparation ?', 'Avec la référence reçue après votre demande, sur la page « Suivre ma demande » du site, ou en écrivant à votre agence sur WhatsApp.']
  ];
  h += `<h2>Questions fréquentes</h2><div class="faq">${faq.map(([q, r]) => `<details><summary>${esc(q)}</summary><p>${esc(r)}</p></details>`).join('')}</div>`;
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, r]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: r } })) });
  document.head.appendChild(ld);

  // 4. Packs, zones, agences
  h += `<h2>Nos formules à prix fixe</h2><table class="price-table packs-table"><thead><tr><th>Formule</th><th>Contenu</th><th>Prix</th></tr></thead><tbody>` +
    PACKS.map(p => `<tr><td><b>${esc(p.nom)}</b><br><span class="muted">${esc(p.pour)}</span></td><td>${esc(p.inclus.join(', '))}</td><td class="mono"><s>${eur(itemsValue(p.items))}</s> <b>${eur(p.prix)}</b></td></tr>`).join('') +
    `</tbody></table>`;

  h += `<h2>Zones d'intervention et déplacement</h2>
    <p>Déplacement offert dès ${CONFIG.deplacementOffertDes} € de prestation. Gratuit en agence et à distance.</p>
    <table class="price-table"><thead><tr><th>Zone</th><th>Communes</th><th>Déplacement</th></tr></thead><tbody>` +
    Object.entries(ZONES).map(([k, z]) => `<tr><td><b>${esc(z.nom)}</b></td><td>${COMMUNES.filter(c => c[1] === k).map(c => esc(c[0])).join(', ')}</td><td class="mono">${z.prix ? eur(z.prix) : 'Offert'}</td></tr>`).join('') +
    `</tbody></table>`;

  h += `<h2>Nos agences</h2><div class="grid g2 agencies">` + Object.values(AGENCES).map(a => `
    <div class="agency"><b>${ico('pin')} ${esc(a.nom)}</b><span class="muted">${esc(a.detail)}</span><span class="mono tel">${esc(a.tel)}</span>
    <div class="agency-actions"><a class="btn btn-wa" href="${waUrl(a.tel)}" target="_blank" rel="noopener">${ico('chat')} WhatsApp</a>
    <a class="btn" href="${telUrl(a.tel)}">${ico('phone')} Appeler</a></div></div>`).join('') + `</div>
    <p class="muted small">Prix indicatifs${CONFIG.mentionPrix ? ' (' + esc(CONFIG.mentionPrix) + ')' : ''}, confirmés après diagnostic avant toute intervention. <a href="mentions-legales.html">Mentions légales</a> · <a href="confidentialite.html">Confidentialité</a></p>`;

  document.getElementById('services-content').innerHTML = h;
})();
