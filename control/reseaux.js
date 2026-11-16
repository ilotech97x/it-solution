/* Control Panel — module « Réseaux » (16/11/2026) : tableau de bord privé des publications d'IloTech.
   Lecture seule des fichiers publics du robot de publication (dépôt GitHub ilotech-videos) : réserve, calendrier,
   état du robot, journal. Aucune donnée personnelle, aucune clé : tout ce qui est lu ici est déjà public. */
const RS_DEPOT = 'https://raw.githubusercontent.com/LeEr1-web/ilotech-videos/main/';
const RS_RESEAUX = { '6aca4de46a5c39ccb6721c49': 'YouTube', '6ac8472a6a5c39ccb65aad3d': 'TikTok', '6ac823306a5c39ccb65921b2': 'Instagram' };
const rsLire = async (nom, json = true) => {
  const r = await fetch(RS_DEPOT + nom + '?t=' + Math.floor(Date.now() / 6e4), { cache: 'no-store' });
  if (!r.ok) throw new Error(nom + ' : ' + r.status);
  return json ? r.json() : r.text();
};
const rsHeure = d => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Martinique' });
const rsJour = d => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Martinique' });
const rsType = c => c?.kind === 'images' ? 'Carrousel' : 'Vidéo';
const rsCanaux = p => Object.keys(p.canaux || {}).map(k => (RS_RESEAUX[k.split(':')[0]] || 'autre') + (k.endsWith(':story') ? ' (story)' : ''));

APP.pages.reseaux = async () => {
  if (!garde('reseaux')) return;
  attente();
  let cat, etat, cloud, journal;
  try {
    [cat, etat, cloud, journal] = await Promise.all([rsLire('catalogue.json'), rsLire('etat.json'), rsLire('cloud.json').catch(() => ({})), rsLire('journal.txt', false).catch(() => '')]);
  } catch (e) {
    return vue(page('Réseaux', '<div class="bandeau att"><span><b>Les fichiers du robot de publication sont injoignables.</b> Vérifiez la connexion, puis rechargez la page.</span></div>'));
  }
  const parId = Object.fromEntries((cat.contenus || []).map(c => [c.id, c]));
  const posts = Object.entries(etat.posts || {}).map(([id, p]) => ({ id, ...p, c: parId[id] })).sort((a, b) => new Date(a.date) - new Date(b.date));
  const now = Date.now();
  const avenir = posts.filter(p => new Date(p.date) > now), passes = posts.filter(p => new Date(p.date) <= now).reverse();
  const reserve = (cat.contenus || []).filter(c => !etat.posts?.[c.id]);
  const dernier = posts.length ? posts[posts.length - 1].date : null;
  const vuRobot = cloud.dernier_passage ? new Date(cloud.dernier_passage) : null;
  const robotOk = vuRobot && now - vuRobot < 14 * 36e5 && cloud.ok;
  const alertes = [];
  if (!robotOk) alertes.push(`Le robot de publication n’est pas passé normalement${vuRobot ? ' depuis ' + ilYa(vuRobot) : ''}${cloud.message && cloud.message !== 'ok' ? ' : ' + cloud.message : ''}.`);
  if (!avenir.length) alertes.push(`Aucun post programmé${dernier ? ' depuis le ' + jourCourt(dernier) : ''}. Allumez le PC (tâche de 7 h et 19 h) ou lancez une nouvelle fournée.`);
  else if (reserve.length < 9) alertes.push(`Plus que ${reserve.length} contenu(s) en réserve : prévoir une nouvelle fournée.`);
  const kpi = (a, b, c) => `<div class="ctl-kpi"><span>${a}</span><b>${b}</b><small>${c}</small></div>`;
  const ligne = (p, quand) => `<div class="ctl-ligne"><span><b>${esc(p.c?.titre || p.titre || p.id)}</b><small>${quand} · ${rsType(p.c || p)}${p.canaux ? ' · ' + esc(rsCanaux(p).join(', ')) : ''}</small></span>
    ${(p.c || p).fichiers?.length ? `<span class="actions"><a class="btn btn-s" target="_blank" rel="noopener" href="${esc(RS_DEPOT + (p.c || p).fichiers[0])}">Voir</a></span>` : ''}</div>`;
  const jours = {};
  avenir.slice(0, 40).forEach(p => (jours[rsJour(p.date)] = jours[rsJour(p.date)] || []).push(p));
  const lignesJ = (journal || '').trim().split('\n').filter(Boolean).slice(-12).reverse();
  vue(page('Réseaux', `${alertes.map(a => `<div class="bandeau att"><span>${esc(a)}</span></div>`).join('')}
    <div class="ctl-kpis">${kpi('Programmés', nbFr(avenir.length), dernier && avenir.length ? 'jusqu’au ' + jourCourt(dernier) : 'rien à venir')}
      ${kpi('En réserve', nbFr(reserve.length), 'prêts, pas encore programmés')}
      ${kpi('Publiés', nbFr(passes.length), 'depuis le début')}
      ${kpi('Robot', robotOk ? 'OK' : 'À vérifier', vuRobot ? 'passé ' + ilYa(vuRobot) : 'jamais passé')}</div>
    ${carte('Calendrier', Object.keys(jours).length ? Object.entries(jours).map(([j, l]) => `<h3 class="petit">${esc(j)}</h3>${l.map(p => ligne(p, rsHeure(p.date))).join('')}`).join('') : '<p class="muted">Rien de programmé.</p>')}
    ${carte('Réserve (ordre de passage)', reserve.length ? reserve.slice(0, 30).map(c => ligne(c, 'en attente')).join('') : '<p class="muted">Réserve vide : la fabrique doit produire de nouveaux contenus.</p>')}
    ${carte('Derniers publiés', passes.length ? passes.slice(0, 10).map(p => ligne(p, jourCourt(p.date) + ' ' + rsHeure(p.date))).join('') : '<p class="muted">Rien encore.</p>')}
    ${carte('Journal du robot', lignesJ.length ? lignesJ.map(l => `<div class="ctl-j${/ERREUR|ATTENTION/.test(l) ? ' ko' : ''}">${esc(l)}</div>`).join('') : '<p class="muted">Journal vide.</p>')}
    <p class="petit muted">Publication : Buffer, programmé par le robot GitHub à 6 h 30 et 18 h 30 (le PC peut être éteint) ; le PC met les nouveaux contenus en ligne à 7 h et 19 h.
      Postiz, sur le PC, complète les réseaux que Buffer ne couvre pas. Statistiques par post : à venir.</p>`));
};
