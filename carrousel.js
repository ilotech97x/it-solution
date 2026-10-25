/* Carrousel accessible : défilement par glisser (scroll-snap), flèches, points, lecture automatique
   (pause au survol, au focus et si l'utilisateur préfère moins d'animations). */
(function () {
  document.querySelectorAll('[data-carrousel]').forEach(car => {
    const piste = car.querySelector('.car-piste');
    const cartes = [...piste.children];
    const points = car.querySelector('.car-points');
    const pas = () => (cartes[0] ? cartes[0].getBoundingClientRect().width + parseFloat(getComputedStyle(piste).columnGap || 16) : 300);
    const index = () => Math.round(piste.scrollLeft / pas());
    points.innerHTML = cartes.map((c, i) => `<button type="button" aria-label="Image ${i + 1} sur ${cartes.length}"></button>`).join('');
    const majPoints = () => [...points.children].forEach((b, i) => b.setAttribute('aria-current', i === index() ? 'true' : 'false'));
    const aller = i => { const n = (i + cartes.length) % cartes.length; piste.scrollTo({ left: n * pas(), behavior: 'smooth' }); };
    car.querySelector('.prec').addEventListener('click', () => aller(index() - 1));
    car.querySelector('.suiv').addEventListener('click', () => aller(index() + 1));
    [...points.children].forEach((b, i) => b.addEventListener('click', () => aller(i)));
    piste.addEventListener('scroll', () => { clearTimeout(piste._t); piste._t = setTimeout(majPoints, 80); }, { passive: true });
    piste.addEventListener('keydown', ev => { if (ev.key === 'ArrowRight') { ev.preventDefault(); aller(index() + 1); } if (ev.key === 'ArrowLeft') { ev.preventDefault(); aller(index() - 1); } });
    majPoints();
    // lecture automatique
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let pause = false;
    ['mouseenter', 'focusin', 'touchstart'].forEach(t => car.addEventListener(t, () => { pause = true; }, { passive: true }));
    ['mouseleave', 'focusout'].forEach(t => car.addEventListener(t, () => { pause = false; }));
    setInterval(() => {
      if (pause || document.hidden) return;
      const fin = piste.scrollLeft + piste.clientWidth >= piste.scrollWidth - 4;
      aller(fin ? 0 : index() + 1);
    }, 4500);
  });
})();
