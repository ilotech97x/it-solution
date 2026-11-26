/* ILO Central — tableau de bord enrichi, « Mes entreprises » (une par marque), Abonnés NEXORA, Connexions et robots (25/11/2026).
   Base : commun/central.sql (central_tableau, central_abonnes, central_creer_source, central_regenerer_jeton, central_activer_source) et NEXORA
   (nx_tableau : les totaux sont calculés en SQL, ici on les affiche). Chargé après control.js : en partage la portée (page, carte, esc, nbFr…).
   Tout est réservé à l'administrateur. Le jeton d'une source n'est montré qu'une fois : il n'est gardé nulle part. */
window.CENTRAL = (() => {
  const ST_ABO = { active: ['ok', 'Active'], annulee: ['att', 'Annulée'], expiree: ['ko', 'Expirée'], aucune: ['gris', 'Aucune'] };
  const TYPES_SRC = { appli: 'Appli', robot: 'Robot' };
  const GESTION = './gestion/';   // gestion PRIVÉE d'ILO Central (même moteur que NEXORA, instance séparée) ; jamais ../nexora/ (NEXORA public)
  const ceTag = (st, t) => `<span class="tag ${st[0]}">${esc(st[1])}</span>`;
  const ceInstaller = t => page(t, INSTALLER);
  const ceJour0 = () => new Date().toLocaleDateString('fr-CA', { timeZone: 'America/Martinique' });

  // ------------------------------------------------------------ données du tableau de bord (chaque lecture échoue sans casser les autres)
  const charger = async () => {
    const [tab, suivi, mesures, hub, abonnes, entreprise] = await Promise.all([
      q(sb.rpc('central_tableau', { p_jours: 7 })).catch(() => null),
      q(sb.rpc('as_suivi', { p_org: null })).catch(() => null),
      q(sb.rpc('mesures_resume', { jours: 7 })).catch(() => null),
      q(sb.rpc('mk_etat_hub')).catch(() => null),
      q(sb.rpc('central_abonnes')).catch(() => null),
      mesEntreprises()]);
    return { tab, suivi, mesures, hub, abonnes, entreprise };
  };
  // une entreprise NEXORA par marque (central_entreprises) : chiffres calculés en SQL (central_mes_entreprises), pour celles dont on est membre
  const MARQUES = ['IloTech', 'Woulib', 'EventPass', 'Kaz An Nou', 'NEXORA', 'Sousou', 'Tropik', 'Travay'];
  const mesEntreprises = async () => {
    const [mes, liste] = await Promise.all([q(sb.rpc('central_mes_entreprises')).catch(() => null), q(sb.rpc('central_entreprises_liste')).catch(() => null)]);
    const reliees = new Set((liste || []).map(x => x.marque));
    return { mes: mes || [], installe: mes !== null && liste !== null, manquantes: liste === null ? [] : MARQUES.filter(m => !reliees.has(m)) };
  };

  // ------------------------------------------------------------ cartes
  const kpis = (d, nbAValider) => {
    const kpi = (titre, v, s, lien) => `<a class="ctl-kpi ce-kpi" href="${lien}"><span>${titre}</span><b>${v}</b><small>${s}</small></a>`;
    const visites = d.mesures ? nbFr(d.mesures.series.reduce((t, x) => t + Number(x.vues || 0), 0)) : '—';
    const auj = ceJour0(), pub = d.hub ? nbFr((d.hub.prochaines || []).filter(p => p.quand && new Date(p.quand).toLocaleDateString('fr-CA', { timeZone: 'America/Martinique' }) === auj).length) : '—';
    const dem = d.suivi ? nbFr((d.suivi.nouvelles || []).length + Number(d.suivi.a_valider_total || 0)) : '—';
    return `<div class="ctl-kpis" id="ceKpis">${kpi('À valider', nbFr(nbAValider), 'partenaires en attente', '#/partenaires')}${kpi('Demandes clients', dem, 'nouvelles ou à valider', '#/assistant')}
      ${kpi('Visites', visites, '7 derniers jours, toutes applis', '#/audience')}${kpi('Publications du jour', pub, 'prévues dans le hub', '#/reseaux')}</div>`;
  };
  const aFaire = (d, nbAValider) => {
    const l = [];
    if (nbAValider) l.push(['att', `${nbFr(nbAValider)} partenaire${nbAValider > 1 ? 's' : ''} à valider`, 'Examiner', '#/partenaires']);
    const nbDem = d.suivi ? Number(d.suivi.a_valider_total || 0) : 0, nbNouv = d.suivi ? (d.suivi.nouvelles || []).length : 0;
    if (nbDem) l.push(['att', `${nbFr(nbDem)} devis ou facture${nbDem > 1 ? 's' : ''} préparé${nbDem > 1 ? 's' : ''} par l’assistant à valider`, 'Valider', '#/assistant']);
    if (nbNouv) l.push(['info', `${nbFr(nbNouv)} nouvelle${nbNouv > 1 ? 's' : ''} demande${nbNouv > 1 ? 's' : ''} de client`, 'Ouvrir', '#/assistant']);
    for (const a of (d.tab?.derniers || []).filter(x => x.type === 'alerte').slice(0, 4))
      l.push(['ko', `Alerte ${esc(a.cle)}${a.valeur != null ? ' : ' + nbFr(a.valeur) : ''} <span class="muted">(${esc(a.source)}, ${esc(ilYa(a.cree_le))})</span>`, 'Voir', '#/connexions']);
    return carte('À faire aujourd’hui', l.length ? `<div class="ctl-liste">${l.map(([ton, txt, bt, h]) => `<div class="ctl-ligne"><span><span class="tag ${ton}" aria-hidden="true">●</span> ${txt}</span><a class="btn btn-s" href="${h}">${bt}</a></div>`).join('')}</div>`
      : '<p class="muted">Rien d’urgent : aucune validation, aucune demande, aucune alerte.</p>', 'ce-afaire');
  };
  const lienNx = (h, t, org) => `<a class="btn btn-s" href="${GESTION}${h}" data-nxorg="${esc(org)}">${t}</a>`;
  const boutonCreer = e => e.manquantes.length ? `<div class="actions"><button type="button" class="btn btn-p btn-s" id="ceCreerEntreprises">Créer les entreprises de l’écosystème</button></div>
      <p class="petit muted">Manquantes : ${esc(e.manquantes.join(', '))}. Vous en devenez le propriétaire dans la gestion d’ILO Central.</p>` : '';
  const videEntreprises = e => `<div class="vide-etat"><h3>Aucune entreprise reliée à votre compte</h3><p class="muted">${e.installe ? 'Chaque marque de l’écosystème a sa propre entreprise dans la gestion d’ILO Central, avec ses devis et ses factures.' : 'La base ILO Central n’est pas encore à jour pour cette partie.'}</p>${boutonCreer(e)}</div>`;
  const chiffresEntreprise = x => `<div class="ctl-kpis ce-mini">
      <div class="ctl-kpi"><span>Devis envoyés</span><b>${nbFr(x.devis_envoyes)}</b><small>en attente de réponse</small></div>
      <div class="ctl-kpi"><span>Factures impayées</span><b>${eurC(x.factures_impayees)}</b><small>reste à encaisser</small></div>
      <div class="ctl-kpi"><span>Encaissé ce mois</span><b>${eurC(x.encaisse_mois)}</b><small>paiements reçus</small></div></div>`;
  const carteMarque = x => `<section class="ctl-carte ce-marque" data-marque="${esc(x.marque)}"><h2>${esc(x.nom)} <span class="tag gris">${esc(x.marque)}</span></h2>${chiffresEntreprise(x)}
      <div class="actions">${lienNx('#/devis', 'Devis', x.org_id)}${lienNx('#/factures', 'Factures', x.org_id)}${lienNx('#/clients', 'Clients', x.org_id)}<a class="btn btn-p btn-s" href="${GESTION}" data-nxorg="${esc(x.org_id)}">Ouvrir la gestion</a></div></section>`;
  const carteEntreprise = e => carte(`Mes entreprises${e.mes.length ? ' · ' + nbFr(e.mes.length) : ''}`, e.mes.length ? `<div class="ctl-liste">${e.mes.slice(0, 3).map(x => `<div class="ctl-ligne"><span><b>${esc(x.nom)}</b>
        <small>${nbFr(x.devis_envoyes)} devis envoyé${x.devis_envoyes > 1 ? 's' : ''} · ${eurC(x.factures_impayees)} impayés · ${eurC(x.encaisse_mois)} encaissé ce mois</small></span><a class="btn btn-s" href="${GESTION}#/" data-nxorg="${esc(x.org_id)}">Ouvrir</a></div>`).join('')}</div>
      <p class="petit"><a href="#/entreprises">${e.mes.length > 3 ? `Voir les ${nbFr(e.mes.length)} entreprises` : 'Voir le détail'}</a></p>${boutonCreer(e)}` : videEntreprises(e), 'ce-entreprise');
  const carteAbonnes = ab => {
    if (!ab) return carte('Abonnés NEXORA', '<p class="muted">Pas encore disponible : la base ILO Central n’est pas installée.</p>');
    const n = k => ab.filter(x => x.etat === k).length;
    return carte('Abonnés NEXORA', ab.length ? `<p><b>${nbFr(n('active'))}</b> abonné${n('active') > 1 ? 's' : ''} actif${n('active') > 1 ? 's' : ''} sur ${nbFr(ab.length)} entreprise${ab.length > 1 ? 's' : ''}
        ${n('annulee') ? ` · ${nbFr(n('annulee'))} annulé${n('annulee') > 1 ? 's' : ''}` : ''}${n('expiree') ? ` · ${nbFr(n('expiree'))} expiré${n('expiree') > 1 ? 's' : ''}` : ''}</p><a class="btn btn-s" href="#/abonnes">Voir les abonnés</a>`
      : '<p class="muted">Aucun abonné pour l’instant.</p><a class="btn btn-s" href="#/abonnes">Voir les abonnés</a>', 'ce-abonnes');
  };

  // ------------------------------------------------------------ Mes entreprises : une carte par marque (la gestion privée, ./gestion/, reste l'outil de travail)
  APP.pages.entreprises = async () => {
    if (!garde('entreprises')) return;
    attente();
    const e = await mesEntreprises();
    vue(page('Mes entreprises', `<p class="muted">Chaque marque de l’écosystème a son entreprise privée, gérée dans ILO Central (clients, devis, factures, stock, trésorerie…). Ces entreprises n’apparaissent pas dans NEXORA public. Les totaux sont calculés par la base.</p>
      ${e.mes.length ? `<div class="ce-marques">${e.mes.map(carteMarque).join('')}</div>${boutonCreer(e)}` : videEntreprises(e)}`));
  };
  // « Ouvrir la gestion » : la gestion retient l'entreprise choisie dans localStorage (nxOrg, même origine) ; création des entreprises manquantes
  document.addEventListener('click', async ev => {
    const a = ev.target.closest?.('a[data-nxorg]');
    if (a) { try { localStorage.setItem('nxOrg', a.dataset.nxorg); } catch (er) { /* stockage indisponible : NEXORA ouvrira sa première entreprise interne */ } return; }
    const b = ev.target.closest?.('#ceCreerEntreprises'); if (!b) return;
    b.disabled = true;
    try { const r = await q(sb.rpc('central_creer_entreprises')); const n = (r || []).filter(x => x.cree).length; toast(n ? `${n} entreprise${n > 1 ? 's' : ''} créée${n > 1 ? 's' : ''}.` : 'Toutes les entreprises existent déjà.'); rendre(); }
    catch (err) { toast(erreur(err), true); b.disabled = false; }
  });

  // ------------------------------------------------------------ Abonnés NEXORA
  APP.pages.abonnes = async () => {
    if (!garde('abonnes')) return;
    attente();
    const l = await q(sb.rpc('central_abonnes')).catch(() => null);
    if (l === null) return vue(ceInstaller('Abonnés NEXORA'));
    vue(page('Abonnés NEXORA', `<p class="muted">Les entreprises qui utilisent NEXORA, leur formule et l’état de leur abonnement.</p>
      ${l.length ? `<div class="tableau"><table class="t ctl-t" id="ceAbonnes"><thead><tr><th scope="col">Entreprise</th><th scope="col">Formule</th><th scope="col">État</th><th scope="col">Échéance</th><th scope="col" class="num">Membres</th></tr></thead>
        <tbody>${l.map(x => `<tr><th scope="row">${esc(x.nom)}</th><td>${esc(x.formule || '—')}</td><td>${ceTag(ST_ABO[x.etat] || ['gris', x.etat || '—'])}</td><td>${x.echeance ? esc(jourCourt(x.echeance)) : '—'}</td><td class="num">${nbFr(x.membres)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vide-etat"><h3>Aucun abonné NEXORA pour l’instant</h3><p class="muted">Dès qu’une entreprise s’inscrit dans NEXORA, elle apparaît ici avec sa formule.</p></div>'}
      <p class="petit muted ce-prive">Seulement la formule et l’état : leurs données de gestion restent privées.</p>`));
  };

  // ------------------------------------------------------------ Connexions et robots
  const exemple = () => `fetch('${CFG.url}/rest/v1/rpc/central_envoyer', {
  method: 'POST',
  headers: { 'apikey': 'CLE_PUBLIQUE_SUPABASE', 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_jeton: 'JETON_DE_LA_SOURCE', p_type: 'stat', p_cle: 'visites', p_valeur: 12, p_donnees: {} })
})`;
  const boiteJeton = j => j ? `<div class="ctl-carte ce-jeton" id="ceJeton" role="alert"><h2>Jeton de « ${esc(j.code)} »</h2>
      <p><b>Copiez-le maintenant : il ne sera plus jamais affiché.</b> Il se met dans le robot ou l’appli, jamais dans Git. En cas de perte, régénérez-le (l’ancien cesse de marcher).</p>
      <div class="ce-jeton-l"><code id="ceJetonTexte">${esc(j.jeton)}</code><button type="button" class="btn btn-p btn-s" id="ceCopier">Copier</button></div></div>` : '';
  const ecran = async jeton => {
    attente();
    const jours = Number(param().jours) || 7;
    const [tab, reg] = await Promise.all([q(sb.rpc('central_tableau', { p_jours: jours })).catch(() => null), q(sb.from('applications').select('code,nom').order('ordre')).catch(() => [])]);
    if (tab === null) return vue(ceInstaller('Connexions et robots'));
    const appNom = c => esc(reg.find(a => a.code === c)?.nom || c || '—');
    const src = tab.sources;
    vue(page('Connexions et robots', `<p class="muted">Les applis et les robots qui envoient leurs chiffres et leurs alertes à ILO Central. Chaque source a son jeton, qui ne donne que le droit d’envoyer.</p>
      ${boiteJeton(jeton)}
      ${carte('Sources', src.length ? `<div class="tableau"><table class="t ctl-t" id="ceSources"><thead><tr><th scope="col">Source</th><th scope="col">Type</th><th scope="col">Appli</th><th scope="col">Dernier envoi</th><th scope="col" class="num">Relevés</th><th scope="col">État</th><th scope="col"><span class="cache-visuel">Actions</span></th></tr></thead>
        <tbody>${src.map(s => `<tr data-code="${esc(s.code)}"><th scope="row">${esc(s.nom)}<small class="muted ctl-bloc mono">${esc(s.code)}</small></th><td>${esc(TYPES_SRC[s.type] || s.type)}</td><td>${s.app_code ? appNom(s.app_code) : '—'}</td>
          <td>${s.dernier_envoi ? esc(ilYa(s.dernier_envoi)) : '<span class="muted">jamais</span>'}</td><td class="num">${nbFr(s.nb_releves)}</td><td>${ceTag(s.actif ? ['ok', 'Actif'] : ['ko', 'Coupé'])}</td>
          <td class="ce-actions"><button type="button" class="btn btn-s" data-regenerer="${esc(s.code)}">Régénérer le jeton</button><button type="button" class="btn btn-s ${s.actif ? 'btn-ko' : 'btn-ok'}" data-actif="${s.actif ? '0' : '1'}" data-source="${esc(s.code)}">${s.actif ? 'Couper' : 'Réactiver'}</button></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vide-etat"><h3>Aucune source pour l’instant</h3><p class="muted">Créez une source ci-dessous pour une appli ou un robot : vous recevrez son jeton.</p></div>')}
      ${carte('Créer une source', `<form class="f ce-form" id="ceCreer"><div class="ctl-grille-f">
          <label>Code <span class="aide">(a-z, 0-9, - et _)</span><input name="code" required minlength="2" maxlength="40" pattern="[a-z0-9_\\-]{2,40}" autocomplete="off" placeholder="robot-hub"></label>
          <label>Nom<input name="nom" required minlength="2" maxlength="80" autocomplete="off" placeholder="Hub marketing"></label>
          <label>Type<select name="type"><option value="robot">Robot</option><option value="appli">Appli</option></select></label>
          <label>Appli du registre<select name="app"><option value="">Aucune</option>${reg.map(a => `<option value="${esc(a.code)}">${esc(a.nom)}</option>`).join('')}</select></label></div>
        <button class="btn btn-p">Créer et afficher le jeton</button></form>`)}
      ${carte(`Chiffres reçus · ${jours === 365 ? '1 an' : jours + ' derniers jours'}`, tab.stats.length ? `<div class="tableau"><table class="t ctl-t" id="ceStats"><thead><tr><th scope="col">Source</th><th scope="col">Mesure</th><th scope="col" class="num">Total</th><th scope="col" class="num">Jours</th><th scope="col">Dernier jour</th></tr></thead>
        <tbody>${tab.stats.map(x => `<tr><th scope="row">${esc(x.source)}</th><td>${esc(x.cle)}</td><td class="num">${nbFr(x.total)}</td><td class="num">${nbFr(x.jours)}</td><td>${x.dernier_jour ? esc(jourCourt(x.dernier_jour)) : '—'}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Aucun chiffre reçu sur la période.</p>')}
      ${carte('Dernières alertes et derniers suivis', tab.derniers.length ? `<div class="ctl-liste" id="ceDerniers">${tab.derniers.map(x => `<div class="ctl-ligne"><span><span class="tag ${x.type === 'alerte' ? 'ko' : 'info'}">${x.type === 'alerte' ? 'Alerte' : 'Suivi'}</span> <b>${esc(x.cle)}</b>${x.valeur != null ? ' : ' + nbFr(x.valeur) : ''}
        <small>${esc(x.source)} · ${esc(ilYa(x.cree_le))}</small></span></div>`).join('')}</div>` : '<p class="muted">Aucune alerte ni aucun suivi reçu.</p>')}
      ${carte('Comment un robot envoie', `<p class="petit muted">Un envoi = une requête POST avec le jeton de la source. La clé publique de Supabase (celle de l’appli) va dans « apikey » ; ne mettez jamais la clé secrète dans un robot. Types : stat, client, suivi, alerte, journal. Pour plusieurs relevés d’un coup : <span class="mono">central_envoyer_lot</span>.</p>
        <pre class="ce-code" tabindex="0"><code>${esc(exemple())}</code></pre>`)}`, periodes(jours, '#/connexions')));
    $('#app').onsubmit = async e => {
      const fo = e.target.closest('#ceCreer'); if (!fo) return;
      e.preventDefault(); const b = fo.querySelector('button'); b.disabled = true;
      try {
        const code = fo.code.value.trim(), j = await q(sb.rpc('central_creer_source', { p_code: code, p_nom: fo.nom.value.trim(), p_type: fo.type.value, p_app: fo.app.value || null }));
        toast('Source créée : copiez son jeton.'); await ecran({ code, jeton: j }); $('#ceJeton')?.scrollIntoView({ block: 'center' });
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    };
    $('#app').onclick = async e => {
      const t = e.target;
      try {
        if (t.closest('#ceCopier')) {
          const x = $('#ceJetonTexte').textContent;
          try { await navigator.clipboard.writeText(x); toast('Jeton copié.'); }
          catch (er) { const r = document.createRange(); r.selectNodeContents($('#ceJetonTexte')); getSelection().removeAllRanges(); getSelection().addRange(r); toast('Sélectionné : faites Copier (Ctrl+C).'); }
          return;
        }
        const g = t.closest('[data-regenerer]');
        if (g && confirm(`Régénérer le jeton de « ${g.dataset.regenerer} » ? L’ancien cessera de fonctionner tout de suite : il faudra mettre le nouveau dans le robot.`)) {
          const j = await q(sb.rpc('central_regenerer_jeton', { p_code: g.dataset.regenerer })); toast('Nouveau jeton créé.'); await ecran({ code: g.dataset.regenerer, jeton: j }); $('#ceJeton')?.scrollIntoView({ block: 'center' });
        }
        const a = t.closest('[data-source]');
        if (a && (a.dataset.actif === '1' || confirm(`Couper « ${a.dataset.source} » ? Ses envois seront refusés jusqu’à sa réactivation.`))) {
          await q(sb.rpc('central_activer_source', { p_code: a.dataset.source, p_actif: a.dataset.actif === '1' })); toast(a.dataset.actif === '1' ? 'Source réactivée.' : 'Source coupée.'); ecran(null);
        }
      } catch (err) { toast(erreur(err), true); }
    };
  };
  APP.pages.connexions = () => garde('connexions') && ecran(null);

  return { charger, kpis, aFaire, carteEntreprise, carteAbonnes };
})();
