/* Tropik v2 : l'interface vivante. Barre du haut immersive, suggestions de recherche, mode sombre, héros animé (GSAP hébergé, jamais de CDN), apparition des sections,
   comptes à rebours des enchères, vue 360°. Tout s'arrête avec prefers-reduced-motion. Dernier fichier chargé : il démarre l'application. */
'use strict';
(() => {
  const TK = APP.tk, rpc = TK.rpc;
  const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const g = () => window.gsap;

  // ---------------------------------------------------------------- menu du haut (ordinateur) et rayons
  APP.menu = () => [['#/', 'Accueil'], ['#/encheres', 'Enchères'], ['#/recherche?mode=location', 'Location'], ['#/atelier', 'Atelier'], ['#/roue', '🎡 Roue'], ['#/fidelite', 'Fidélité'], ['#/favoris', '♥'], ['#/panier', 'Panier' + (APP.nbPanier() ? ' (' + APP.nbPanier() + ')' : '')], [moi ? '#/compte' : '#/inscription', moi ? 'Mon compte' : 'Créer un compte']];
  const chips = [['#/encheres', '🔨 Enchères', 'hot'], ['#/recherche?mode=location', '📅 Location'], ['#/recherche?promo=1&tri=promos', '⚡ Promos'], ['#/roue', '🎡 Roue gratuite'], ['#/atelier', '🧵 Sur mesure']];
  let rayonsFaits = false;
  APP.apresNav = async () => {
    const z = $('#rayonsH'); if (!z) return;
    if (!rayonsFaits) { rayonsFaits = true; let rs = []; try { rs = TK.familles(await TK.rayons()); } catch (e) { /* la base n'est pas installée */ }
      z.innerHTML = chips.map(([h, t, c]) => `<a href="${h}" class="${c || ''}">${t}</a>`).join('') + rs.map(r => `<a href="#/recherche?rayon=${r.code}">${esc(r.icone)} ${esc(r.nom)}</a>`).join(''); }
    const t = $('#themeT'); if (t) t.setAttribute('aria-label', document.documentElement.dataset.theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre');
  };
  const q0 = APP.quitter; let minuteurs = [];
  APP.quitter = h => { if (q0) q0(h); minuteurs.forEach(clearInterval); minuteurs = []; cacherSugg(); document.body.dataset.page = h.split('?')[0].split('/')[1] || 'accueil'; $('#haut') && $('#haut').classList.remove('cache'); };

  // ---------------------------------------------------------------- mode clair / sombre
  const theme = t => { document.documentElement.dataset.theme = t; try { localStorage.setItem('tropik-theme', t); } catch (e) { /* navigation privée */ } const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0B1020' : '#FAF7F2'; };
  try { const t = localStorage.getItem('tropik-theme'); if (t) theme(t); else if (matchMedia('(prefers-color-scheme: dark)').matches) theme('dark'); } catch (e) { /* ignoré */ }
  document.addEventListener('click', e => { if (e.target.closest('#themeT')) { theme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); APP.apresNav(); } });

  // ---------------------------------------------------------------- barre immersive : cachée en descendant, de retour en remontant
  let dernier = scrollY, ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, h = $('#haut'); ticking = false; if (!h) return;
      h.classList.toggle('ombre', y > 8);
      if (y > dernier + 6 && y > 90 && !document.activeElement.closest?.('#haut')) h.classList.add('cache'); else if (y < dernier - 4 || y < 60) h.classList.remove('cache');
      dernier = y;
    });
  }, { passive: true });

  // ---------------------------------------------------------------- recherche du haut avec suggestions
  const sugg = $('#sugg'), champ = document.querySelector('#fRechHaut input');
  const cacherSugg = () => { if (sugg) { sugg.hidden = true; sugg.innerHTML = ''; } };
  let tm = null;
  champ && champ.addEventListener('input', () => {
    clearTimeout(tm); const v = champ.value.trim(); if (v.length < 2) return cacherSugg();
    tm = setTimeout(async () => {
      try { const r = await rpc('tk_catalogue', { f: { q: v, limite: 5 } }); if (champ.value.trim() !== v) return;
        sugg.innerHTML = r.produits.length ? r.produits.map(p => `<a href="#/p/${p.id}" role="option"><span>${esc(p.titre)}</span><small>${esc(p.marque || '')}</small></a>`).join('') + `<a href="#/recherche?q=${encodeURIComponent(v)}"><b>Voir tous les résultats (${r.total})</b></a>` : r.suggestion ? `<a href="#/recherche?q=${encodeURIComponent(r.suggestion)}">Vous cherchiez « ${esc(r.suggestion)} » ?</a>` : '<a href="#/recherche">Aucun résultat : voir le catalogue</a>';
        sugg.hidden = false; } catch (e) { cacherSugg(); }
    }, 220);
  });
  document.addEventListener('click', e => { if (!e.target.closest('#fRechHaut')) cacherSugg(); else if (e.target.closest('#sugg a')) setTimeout(cacherSugg, 50); });
  $('#fRechHaut') && $('#fRechHaut').addEventListener('submit', e => { e.preventDefault(); const v = champ.value.trim(); cacherSugg(); champ.blur(); location.hash = '#/recherche' + (v ? '?q=' + encodeURIComponent(v) : ''); });
  addEventListener('keydown', e => { if (e.key === 'Escape') cacherSugg(); });

  // ---------------------------------------------------------------- héros animé
  const hero = () => {
    const h = $('#heroS'); if (!h) return; const sl = [...h.querySelectorAll('.hs')], pts = [...h.querySelectorAll('.hs-pts button')]; let k = 0, t = null, pause = false;
    const aller_ = n => {
      const nv = (n + sl.length) % sl.length; if (nv === k && sl[k].classList.contains('on')) return; const a = sl[k], b = sl[nv]; k = nv;
      pts.forEach((p, i) => p.setAttribute('aria-current', String(i === k))); sl.forEach(s => s.setAttribute('aria-hidden', String(s !== b)));
      if (g() && !reduit()) {
        b.classList.add('on'); g().fromTo(b, { opacity: 0 }, { opacity: 1, duration: .7, ease: 'power2.out' }); g().fromTo(b.querySelector('.fond'), { scale: 1.12 }, { scale: 1, duration: 1.6, ease: 'power2.out' });
        g().fromTo(b.querySelectorAll('.etiq,h1,h2,p,.btn'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .09, ease: 'power3.out', delay: .1 });
        g().to(a, { opacity: 0, duration: .6, onComplete: () => a.classList.remove('on') });
      } else { a.classList.remove('on'); b.classList.add('on'); }
    };
    const lancer = () => { clearInterval(t); if (!reduit()) t = setInterval(() => { if (!pause && !document.hidden) aller_(k + 1); }, 6500); minuteurs.push(t); };
    h.addEventListener('click', e => { const b = e.target.closest('[data-x]'); if (!b) return; if (b.dataset.x === 'hero-prec') aller_(k - 1); else if (b.dataset.x === 'hero-suiv') aller_(k + 1); else if (b.dataset.x === 'hero-va') aller_(Number(b.dataset.k)); else return; lancer(); });
    h.addEventListener('mouseenter', () => { pause = true; }); h.addEventListener('mouseleave', () => { pause = false; }); h.addEventListener('focusin', () => { pause = true; }); h.addEventListener('focusout', () => { pause = false; });
    let x0 = null; h.addEventListener('pointerdown', e => { x0 = e.clientX; }); h.addEventListener('pointerup', e => { if (x0 != null && Math.abs(e.clientX - x0) > 50) { aller_(k + (e.clientX < x0 ? 1 : -1)); lancer(); } x0 = null; });
    if (g() && !reduit()) g().from(sl[0].querySelectorAll('.etiq,h1,p,.btn'), { y: 26, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out' });
    lancer();
  };
  // apparition douce des sections et des cartes au défilement
  const reveler = () => {
    const l = [...document.querySelectorAll('.en-vue:not(.vu)')]; if (!l.length) return;
    if (reduit() || !('IntersectionObserver' in window)) { l.forEach(x => { x.classList.add('vu'); x.style.opacity = 1; x.style.transform = 'none'; }); return; }
    const o = new IntersectionObserver(es => es.forEach(en => { if (!en.isIntersecting) return; o.unobserve(en.target); en.target.classList.add('vu'); if (g()) g().to(en.target, { opacity: 1, y: 0, duration: .7, ease: 'power3.out' }); else { en.target.style.opacity = 1; en.target.style.transform = 'none'; } }), { rootMargin: '0px 0px -8% 0px' });
    l.forEach(x => o.observe(x));
  };
  // comptes à rebours (cartes et fiche d'enchère)
  const dur = ms => { const s = Math.max(0, Math.floor(ms / 1000)), j = Math.floor(s / 86400), hh = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return j ? `${j} j ${hh} h` : hh ? `${hh} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(ss).padStart(2, '0')} s`; };
  const tic = () => document.querySelectorAll('[data-fin]').forEach(e => {
    const fin = new Date(e.dataset.fin).getTime(), debut = new Date(e.dataset.debut || 0).getTime(), n = Date.now(), cible = e.tagName === 'B' ? e : e.querySelector('b');
    cible.textContent = n < debut ? 'Début dans ' + dur(debut - n) : n >= fin ? 'Terminée' : (fin - n < 120000 ? '⚡ ' : '') + 'Fin dans ' + dur(fin - n);
  });
  setInterval(tic, 1000);
  setInterval(() => TK.rafraichirEnchere && TK.rafraichirEnchere(), 8000);
  TK.bump = sel => { const e = document.querySelector(sel); if (e && g() && !reduit()) g().fromTo(e, { scale: 1.18 }, { scale: 1, duration: .5, ease: 'elastic.out(1,.4)' }); };
  // vue 360° : glisser (souris ou doigt), curseur ou flèches ; zoom par double clic
  TK.v360 = (el, imgs) => {
    let i = 0, x0 = null, i0 = 0, zoom = false; const n = imgs.length, r = el.querySelector('input[type=range]');
    imgs.forEach(u => { const im = new Image(); im.src = (typeof photo === 'function' ? photo(u) : u); });
    const montre = k => { i = (k % n + n) % n; el.style.backgroundImage = `url('${photo(imgs[i])}')`; if (r) r.value = i; };
    montre(0);
    el.addEventListener('pointerdown', e => { if (e.target === r) return; x0 = e.clientX; i0 = i; el.setPointerCapture && el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (x0 == null) return; montre(i0 - Math.round((e.clientX - x0) / (el.clientWidth / n * 1.4))); });
    el.addEventListener('pointerup', () => { x0 = null; }); el.addEventListener('pointercancel', () => { x0 = null; });
    el.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') montre(i - 1); else if (e.key === 'ArrowRight') montre(i + 1); });
    el.addEventListener('dblclick', () => { zoom = !zoom; el.style.backgroundSize = zoom ? '230%' : 'contain'; });
    r && r.addEventListener('input', () => montre(Number(r.value)));
  };
  TK.apresVue = nom => { reveler(); tic(); if (nom === 'accueil') hero(); if (g() && !reduit()) { const c = document.querySelectorAll('.prod-g .prod-c:not(.vu)'); if (c.length) { c.forEach(x => x.classList.add('vu')); g().from(c, { y: 20, opacity: 0, duration: .55, stagger: .04, ease: 'power2.out', clearProps: 'all' }); } } };
  document.addEventListener('click', e => { const c = e.target.closest('.coeur'); if (c) TK.bump && setTimeout(() => TK.bump('.coeur[aria-pressed=true]'), 0); });

  demarrer();
})();
