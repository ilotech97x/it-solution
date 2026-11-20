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

// Hub marketing (PC, Desktop\DigitaleEntertainment) : son état déposé toutes les 5 min dans mk_etat, et les comptes clients de
// l'espace client (commun/marketing2.sql). Affichage seulement : la validation reste dans le hub ou chez le client. Caché sans la base.
const rsHub = async () => {
  let h, comptes;
  try { [h, comptes] = await Promise.all([q(sb.rpc('mk_etat_hub')), q(sb.rpc('mk_admin_comptes'))]); } catch (e) { return ''; }
  const age = h.age_minutes, allume = age != null && age < 15, r = h.resume || {}, wa = r.whatsapp || {};
  const kpi = (a, b, c) => `<div class="ctl-kpi"><span>${a}</span><b>${b}</b><small>${c}</small></div>`;
  const prochaines = (h.prochaines || []).map(p => `<div class="ctl-ligne"><span><b>${esc(p.titre || 'Sans titre')}</b><small>${esc(p.compte || '—')} · ${esc((p.reseaux || []).join(', ') || '—')} · ${p.quand ? esc(jourCourt(p.quand) + ' ' + rsHeure(p.quand)) : 'date à fixer'}${p.statut === 'chez_client' ? ' · chez le client' : ''}</small></span></div>`).join('');
  const lignesC = comptes.map(c => `<div class="ctl-ligne"><span><b>${esc(c.nom || c.id)}</b><small>${esc(c.id)} · ${c.membres.length ? esc(c.membres.map(m => m.email).join(', ')) : 'aucun membre'} · ${nbFr(c.a_valider)} à valider${c.actif ? '' : ' · inactif'}</small></span></div>`).join('');
  return `${carte('Hub marketing', `<p><span class="tag ${allume ? 'ok' : 'att'}">${age == null ? 'Hub jamais vu' : allume ? 'PC allumé · vu ' + esc(ilYa(new Date(h.vu_le))) : 'Hub éteint depuis ' + esc(ilYa(new Date(h.vu_le)))}</span></p>
      <div class="ctl-kpis">${kpi('À valider par vous', nbFr(r.a_valider ?? h.a_valider), 'dans le hub')}${kpi('Chez les clients', nbFr(h.chez_clients), 'en attente de leur accord')}
        ${kpi('Envoyées sur 7 jours', nbFr(r.envoyees_7j ?? h.envoyees_7j), nbFr(r.erreurs_7j || 0) + ' échec(s)')}${kpi('Robot WhatsApp', esc({ connecte: 'Connecté', authentifie: 'Connecté', arrete: 'Arrêté', qr: 'QR à scanner', demarrage: 'Démarrage', deconnecte: 'Déconnecté', echec: 'Échec' }[wa.statut] || wa.statut || '—'), wa.plafond ? `${nbFr(wa.envois_jour || 0)} message(s) sur ${nbFr(wa.plafond)} aujourd’hui` : '')}</div>
      ${prochaines ? '<h3 class="petit">Prochaines publications</h3>' + prochaines : ''}
      <p class="petit muted">La validation se fait dans le hub (sur le PC) ou par le client dans son espace (ilo-tech.com/digital/espace/).</p>`)}
    ${carte('Comptes clients de l’espace en ligne', `${lignesC || '<p class="muted">Aucun compte client.</p>'}
      <form class="f" id="rsCompte"><div class="ligne-f"><input name="id" placeholder="identifiant (ex. ti-pen), le même que dans le hub" pattern="[a-z0-9-]{2,40}" required aria-label="Identifiant du compte">
        <input name="nom" placeholder="Nom de l’entreprise" required aria-label="Nom de l’entreprise"><button class="btn btn-s">Créer ou renommer</button></div></form>
      <form class="f" id="rsMembre"><div class="ligne-f"><select name="compte" aria-label="Compte">${comptes.map(c => `<option value="${esc(c.id)}">${esc(c.nom || c.id)}</option>`).join('')}</select>
        <input name="email" type="email" placeholder="e-mail du client (il doit avoir créé son compte)" required aria-label="E-mail du client"><button class="btn btn-s">Relier</button></div></form>`)}`;
};

APP.pages.reseaux = async () => {
  if (!garde('reseaux')) return;
  attente();
  let cat, etat, cloud, journal, hub;
  try {
    [cat, etat, cloud, journal, hub] = await Promise.all([rsLire('catalogue.json'), rsLire('etat.json'), rsLire('cloud.json').catch(() => ({})), rsLire('journal.txt', false).catch(() => ''), rsHub()]);
  } catch (e) {
    return vue(page('Réseaux', (await rsHub()) + '<div class="bandeau att"><span><b>Les fichiers du robot de publication sont injoignables.</b> Vérifiez la connexion, puis rechargez la page.</span></div>'));
  }
  $('#app').onsubmit = async ev => {
    const f = ev.target; if (!['rsCompte', 'rsMembre'].includes(f.id)) return;
    ev.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
    try {
      if (f.id === 'rsCompte') await q(sb.rpc('mk_admin_compte', { id: f.elements.id.value.trim(), nom: f.elements.nom.value.trim(), actif: true }));
      else await q(sb.rpc('mk_admin_membre', { compte: f.elements.compte.value, email: f.elements.email.value.trim(), ajouter: true }));
      toast('Enregistré.'); APP.pages.reseaux();
    } catch (e) { toast(erreur(e), true); b.disabled = false; }
  };
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
  vue(page('Réseaux', `${hub}${alertes.map(a => `<div class="bandeau att"><span>${esc(a)}</span></div>`).join('')}
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
