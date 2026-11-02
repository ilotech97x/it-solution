/* NEXORA — accueil public, connexion, invitation, création d'entreprise et tableau de bord. */
'use strict';
const pub = h => { if (!$('#app')) return location.reload(); $('#app').innerHTML = h; };
const hautPublic = () => `<header class="pub-haut"><a class="marque" href="#/"><img src="img/logo.svg" alt="">NEXORA</a>
  <div class="actions"><a class="btn" href="#/connexion">Se connecter</a><a class="btn btn-p" href="#/inscription">Commencer</a></div></header>`;
const MODULES = [['👥', 'CRM', 'Clients, prospects, contacts, pipeline commercial, activités et rappels, fiche client à 360°.', 'Disponible'],
  ['🧾', 'Devis et factures', 'Devis, factures, avoirs, paiements partiels, relances visuelles, PDF, numérotation sans trou.', 'Disponible'],
  ['📊', 'Tableau de bord', 'Chiffre d’affaires, encaissements, impayés et retards, pipeline, meilleurs clients, calculés en direct.', 'Disponible'],
  ['🏢', 'Multi-entreprises', 'Plusieurs sociétés par compte, équipe, rôles et droits, journal d’activité, export complet.', 'Disponible'],
  ['📦', 'Stock et achats', 'Produits, entrepôts, mouvements, fournisseurs, bons de commande.', 'Prochaine étape'],
  ['🏦', 'Finance et projets', 'Dépenses, trésorerie, budgets, projets, temps passé, rentabilité.', 'Prévu'],
  ['🤖', 'NEXORA Intelligence', 'Un assistant qui analyse vos chiffres et prépare devis et relances, avec votre validation.', 'Prévu'],
  ['📄', 'Facture électronique', 'Factur-X et raccordement à une plateforme agréée pour la réforme 2026-2027.', 'Prévu']];

NX.publiques[''] = async () => {
  pub(`${hautPublic()}<section class="hero-nx"><div class="in"><div><span class="sur">The Business Operating System</span>
      <h1>Toute l’entreprise. <em>Un seul espace.</em></h1>
      <p>Clients, devis, factures, paiements et tableau de bord, reliés entre eux et partagés avec votre équipe. Pensé pour les indépendants, les TPE et les PME, aux Antilles et partout ailleurs.</p>
      <div class="actions" style="margin-top:22px"><a class="btn btn-a" href="#/inscription">Créer mon espace</a><a class="btn" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.25)" href="#/connexion">J’ai déjà un compte</a></div>
      <p class="petit" style="margin-top:14px;color:#8FA0BA">Gratuit pendant la phase pilote. Essayez avec une entreprise de démonstration en un clic.</p></div>
    <div class="apercu" aria-hidden="true"><div class="l"><span>Chiffre d’affaires du mois</span><b>exemple</b></div><div class="l"><span>Devis envoyés</span><span class="tag info">en attente</span></div>
      <div class="l"><span>Facture F-2026-0042</span><span class="tag ok">payée</span></div><div class="l"><span>Facture F-2026-0041</span><span class="tag att">partielle</span></div><div class="l"><span>Relancer l’Hôtel…</span><span class="tag ko">en retard</span></div></div></div></section>
    <section class="sect"><span class="sur">Modules</span><h2 style="font-size:28px">Un socle solide, puis module par module</h2><p class="muted" style="max-width:720px">Chaque module n’est annoncé « disponible » que lorsqu’il fonctionne vraiment et qu’il est testé.</p>
      <div class="modules">${MODULES.map(([i, t, d, s]) => `<div class="module"><b>${i} ${t} ${tag([s === 'Disponible' ? 'ok' : s === 'Prochaine étape' ? 'info' : '', s])}</b><span class="muted">${d}</span></div>`).join('')}</div></section>
    <section class="sect" style="padding-top:0"><div class="carte" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
      <div><h3>🔒 Vos données isolées</h3><p class="muted">Chaque entreprise a ses propres données, protégées dans la base elle-même. Même IloTech n’y a pas accès.</p></div>
      <div><h3>🧾 Factures conformes à la loi</h3><p class="muted">Numérotation continue et chronologique, facture validée non modifiable, corrections par avoir, mentions obligatoires.</p></div>
      <div><h3>📤 Vos données vous appartiennent</h3><p class="muted">Export complet à tout moment, sans frais.</p></div></div></section>
    <footer class="pied-nx">NEXORA est un service d’IloTech (Martinique) · <a href="https://ilo-tech.com/mentions-legales.html">Mentions légales</a> · <a href="https://ilo-tech.com/confidentialite.html">Confidentialité</a> · <a href="cgu.html">Conditions</a></footer>`);
};

function formAuth(id, titre, champs, bouton, bas) {
  pub(`${hautPublic()}<div class="carte-auth"><div class="carte"><h1>${titre}</h1><p class="muted">Un seul compte IloTech pour NEXORA, Kivora, EventPass et Kaz An Nou.</p>
    <form class="f" id="${id}">${champs}<button class="btn btn-p">${bouton}</button></form>${bas}</div></div>`);
}
const apresConnexion = async () => {
  await chargerSession();
  const j = sessionStorage.getItem('nxInvitation'); if (j) { sessionStorage.removeItem('nxInvitation'); return aller('#/invitation/' + j); }
  aller(ORG ? '#/' : '#/bienvenue');
};
NX.publiques.connexion = async () => {
  formAuth('fCo', 'Connexion', '<label>Email<input type="email" name="email" required autocomplete="email"></label><label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label>',
    'Se connecter', '<p class="petit"><button class="lien" id="oubli">Mot de passe oublié ?</button> · <a href="#/inscription">Créer un compte</a></p>');
  $('#fCo').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = $('button', e.target); b.disabled = true;
    try { await q(sb.auth.signInWithPassword({ email: d.email.trim(), password: d.mdp })); location.hash = '#/'; await apresConnexion(); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#oubli').onclick = async () => {
    const email = $('#fCo').email.value.trim(); if (!email) return toast('Écrivez d’abord votre email.', true);
    try { await q(sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://immo.ilo-tech.com/?nouveau-mdp=1' })); toast('Si un compte existe, un email est envoyé.'); } catch (err) { toast(erreur(err), true); }
  };
};
NX.publiques.inscription = async () => {
  formAuth('fIns', 'Créer mon compte', `<div class="g2"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name"></label><label>Nom<input name="nom" maxlength="60" autocomplete="family-name"></label></div>
    <label>Email professionnel<input type="email" name="email" required autocomplete="email"></label><label>Téléphone<input type="tel" name="telephone" required pattern="[0-9 +]{6,20}" autocomplete="tel"></label>
    <label>Mot de passe <span class="muted">(8 caractères minimum)</span><input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>
    <label class="case"><input type="checkbox" required> J’accepte les <a href="cgu.html" target="_blank">conditions</a> et la <a href="https://ilo-tech.com/confidentialite.html" target="_blank">politique de confidentialité</a>.</label>`,
    'Créer mon compte', '<p class="petit">Déjà inscrit ? <a href="#/connexion">Se connecter</a></p>');
  $('#fIns').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = $('button', e.target); b.disabled = true;
    try {
      const r = await q(sb.auth.signUp({ email: d.email.trim(), password: d.mdp, options: { data: { prenom: d.prenom.trim(), nom: d.nom.trim(), telephone: d.telephone.trim() } } }));
      if (r.session) { location.hash = '#/'; await apresConnexion(); }
      else pub(`${hautPublic()}<div class="carte-auth"><div class="carte"><h1>Vérifiez vos emails</h1><p>Cliquez sur le lien reçu pour activer votre compte, puis connectez-vous.</p></div></div>`);
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
};
NX.publiques.invitation = async jeton => {
  if (!moi) { sessionStorage.setItem('nxInvitation', jeton); toast('Connectez-vous ou créez votre compte avec l’adresse invitée.'); return aller('#/connexion'); }
  try { const org = await q(sb.rpc('nx_accepter_invitation', { j: jeton })); await rechargerOrgs(org); toast('Bienvenue dans l’équipe !'); aller('#/'); }
  catch (err) { if (!$('#app')) document.body.innerHTML = '<div id="app"></div>'; pub(`<div class="carte-auth"><div class="carte"><h1>Invitation</h1><p>${esc(erreur(err))}</p><a class="btn" href="#/">Continuer</a></div></div>`); }
};

// création de la première entreprise (ou d'une de plus), ou démonstration
const TERR_TVA = { Martinique: [8.5, 'America/Martinique'], Guadeloupe: [8.5, 'America/Guadeloupe'], 'La Réunion': [8.5, 'Indian/Reunion'], Guyane: [0, 'America/Cayenne'],
  Mayotte: [0, 'Indian/Mayotte'], 'Hexagone et Corse': [20, 'Europe/Paris'], 'Saint-Martin': [0, 'America/Marigot'], 'Saint-Barthélemy': [0, 'America/St_Barthelemy'] };
NX.publiques.bienvenue = async () => {
  if (!$('#app')) document.body.innerHTML = '<div id="app"></div>';
  const aDemo = ORGS.some(o => o.demo);
  pub(`<header class="pub-haut"><a class="marque" href="#/"><img src="img/logo.svg" alt="">NEXORA</a>${ORGS.length ? '<a class="btn" href="#/">← Retour</a>' : '<button class="btn" id="deco2">Se déconnecter</button>'}</header>
    <div class="sect" style="max-width:900px;padding-top:20px"><h1>Bienvenue${profil?.prenom ? ' ' + esc(profil.prenom) : ''} 👋</h1><p class="muted">Créez votre entreprise en 30 secondes. Vous pourrez compléter les informations (SIRET, adresse, logo) ensuite.</p>
    <div class="deux" style="margin-top:18px"><form class="carte f" id="fOrg"><h2>Mon entreprise</h2>
      <label>Nom de l’entreprise<input name="nom" required minlength="2" maxlength="120" placeholder="Ex. Atelier Martin SARL"></label>
      <label>Où exercez-vous ?<select name="terr">${Object.keys(TERR_TVA).map(t => `<option>${t}</option>`).join('')}<option value="autre">Autre pays</option></select></label>
      <label class="case"><input type="checkbox" name="franchise"> Je suis en franchise de TVA (micro-entreprise, art. 293 B du CGI)</label>
      <label>Taux de TVA habituel (%)<input name="taux" type="number" min="0" max="30" step="0.1" value="8.5"></label>
      <p class="petit muted" style="margin:0">Proposé selon le territoire : 8,5 % en Martinique, Guadeloupe et à La Réunion, 20 % dans l’Hexagone, TVA non applicable en Guyane et à Mayotte. Vérifiez avec votre expert-comptable.</p>
      <button class="btn btn-p">Créer mon entreprise</button></form>
    <div class="carte"><h2>Juste regarder ?</h2><p class="muted">Explorez NEXORA avec une entreprise fictive déjà remplie : clients, devis, factures, paiements et tableau de bord.</p>
      ${aDemo ? '<p class="petit">Vous avez déjà une entreprise de démonstration : choisissez-la dans la liste en haut de l’application.</p>' : '<button class="btn btn-a" id="demo">Essayer la démonstration</button>'}</div></div></div>`);
  $('#deco2')?.addEventListener('click', async () => { await sb.auth.signOut(); location.hash = '#/'; location.reload(); });
  const f = $('#fOrg');
  f.terr.onchange = () => { const t = TERR_TVA[f.terr.value]; if (t) f.taux.value = t[0]; };
  f.franchise.onchange = () => { f.taux.disabled = f.franchise.checked; };
  f.addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(f)), b = $('button', f); b.disabled = true;
    const t = TERR_TVA[d.terr];
    try {
      const id = await q(sb.rpc('nx_creer_organisation', { nom_org: d.nom.trim(), pays_org: d.terr === 'Hexagone et Corse' || t ? 'France' : 'Autre', taux: d.franchise ? 0 : Number(d.taux || 0),
        franchise: !!d.franchise, fuseau_org: t ? t[1] : Intl.DateTimeFormat().resolvedOptions().timeZone }));
      await rechargerOrgs(id); toast('Entreprise créée !'); aller('#/reglages?premiere=1');
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#demo')?.addEventListener('click', async e => {
    e.target.disabled = true; e.target.textContent = 'Préparation…';
    try { const id = await q(sb.rpc('nx_creer_demo')); await rechargerOrgs(id); aller('#/'); } catch (err) { toast(erreur(err), true); e.target.disabled = false; }
  });
};

// ---------------------------------------------------------------- tableau de bord
NX.pages[''] = async () => {
  vue(entete(`Bonjour ${esc(profil?.prenom || '')}`, esc(ORG.nom) + ' · ' + esc(ROLES[ROLE])) + '<div class="chargement">Calcul des indicateurs…</div>');
  const [t, retard, taches] = await Promise.all([q(sb.rpc('nx_tableau', { org: ORG.id })),
    q(sb.from('nx_factures').select('id, numero, total_ttc, paye, echeance, client_snap').eq('org_id', ORG.id).eq('type', 'facture').in('statut', ['validee', 'partielle']).lt('echeance', aujourdhui()).order('echeance').limit(6)),
    q(sb.from('nx_activites').select('id, titre, type, echeance, client_id, nx_clients(nom)').eq('org_id', ORG.id).eq('fait', false).order('echeance', { ascending: true, nullsFirst: false }).limit(6))]);
  const evol = t.ca_mois_prec > 0 ? Math.round((t.ca_mois - t.ca_mois_prec) / t.ca_mois_prec * 100) : null;
  const max = Math.max(1, ...t.mois.map(m => Number(m.ht)));
  const nomMois = m => new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'short' });
  const rien = !t.mois.some(m => Number(m.ht)) && !t.nb_clients && !t.nb_prospects;
  vue(entete(`Bonjour ${esc(profil?.prenom || '')}`, esc(ORG.nom) + ' · ' + esc(ROLES[ROLE]),
      `${peut('crm') ? '<a class="btn" href="#/clients?nouveau=1">+ Client</a>' : ''}${peut('ventes') ? '<a class="btn" href="#/devis/nouveau">+ Devis</a>' : ''}${peut('facturation') ? '<a class="btn btn-p" href="#/factures/nouvelle">+ Facture</a>' : ''}`)
    + (rien ? `<div class="carte" style="margin-bottom:16px"><h2>Pour bien démarrer</h2><ol class="muted" style="margin:0;padding-left:20px;line-height:2">
        <li><a href="#/reglages">Complétez votre entreprise</a> (SIRET, adresse, IBAN) : ces informations apparaissent sur vos factures.</li><li><a href="#/catalogue">Ajoutez vos prestations et produits</a>.</li>
        <li><a href="#/clients?nouveau=1">Créez votre premier client</a>, puis un devis ou une facture.</li><li><a href="#/equipe">Invitez votre équipe</a> si vous n’êtes pas seul.</li></ol></div>` : '')
    + `<div class="kpis">
      <div class="kpi"><span>Chiffre d’affaires du mois (HT)</span><b>${montant(t.ca_mois)}</b><small class="${evol == null ? '' : evol >= 0 ? 'hausse' : 'baisse'}">${evol == null ? 'factures validées, avoirs déduits' : (evol >= 0 ? '▲ ' : '▼ ') + Math.abs(evol) + ' % vs mois précédent'}</small></div>
      <div class="kpi"><span>Encaissé ce mois</span><b>${montant(t.encaisse_mois)}</b><small>paiements enregistrés</small></div>
      <div class="kpi"><span>Reste à encaisser</span><b>${montant(t.impayes)}</b><small class="${t.nb_retard ? 'baisse' : ''}">${t.nb_retard ? `dont ${montant(t.en_retard)} en retard (${t.nb_retard})` : 'aucune facture en retard'}</small></div>
      <div class="kpi"><span>Devis en attente</span><b>${montant(t.devis_ouverts)}</b><small>${t.nb_devis_ouverts} devis · ${t.conversion == null ? 'conversion : pas encore de données' : `conversion ${t.conversion} %`}</small></div>
      <div class="kpi"><span>Pipeline pondéré</span><b>${montant(t.pipeline)}</b><small>${t.nb_clients} clients · ${t.nb_prospects} prospects</small></div></div>
    <div class="deux"><div class="carte"><h2>Chiffre d’affaires HT, 12 derniers mois</h2><div class="graph" role="img" aria-label="Chiffre d’affaires des 12 derniers mois">
        ${t.mois.map(m => `<div title="${esc(nomMois(m.mois))} : ${montant(m.ht)}"><i style="height:${Math.max(1, Number(m.ht) / max * 100)}%"></i><small>${nomMois(m.mois)}</small></div>`).join('')}</div></div>
      <div class="carte"><h2>Meilleurs clients (12 mois)</h2>${t.top_clients.length ? t.top_clients.map(c => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><a href="#/clients/${c.id}">${esc(c.nom)}</a><b>${montant(c.ht)}</b></div>
        <div class="barre"><i style="width:${Number(c.ht) / Number(t.top_clients[0].ht) * 100}%"></i></div></div>`).join('') : '<p class="muted">Pas encore de facture validée.</p>'}</div></div>
    <div class="deux" style="margin-top:16px"><div class="carte"><h2>Factures en retard</h2>${retard.length ? `<table class="tab">${retard.map(f => `<tr class="clic" data-href="#/factures/${f.id}"><td><b>${esc(f.numero)}</b><br><span class="muted petit">${esc(f.client_snap?.nom || '')}</span></td>
        <td class="petit" style="color:var(--ko)">échue le ${date(f.echeance)}</td><td class="num"><b>${montant(f.total_ttc - f.paye)}</b></td></tr>`).join('')}</table>` : '<p class="muted">Aucune facture en retard. 👍</p>'}</div>
      <div class="carte"><h2>À faire ${t.a_faire ? tag(['att', t.a_faire + ' en retard ou aujourd’hui']) : ''}</h2>${taches.length ? taches.map(a => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--ligne)">
        <span>${TYPES_ACT[a.type][0]} <a href="#/clients/${a.client_id}">${esc(a.titre)}</a><br><span class="muted petit">${esc(a.nx_clients?.nom || '')}</span></span><span class="petit ${a.echeance && a.echeance < new Date().toISOString() ? '' : 'muted'}" style="${a.echeance && a.echeance < new Date().toISOString() ? 'color:var(--ko)' : ''}">${a.echeance ? dateHeure(a.echeance) : ''}</span></div>`).join('') + '<p><a href="#/activites">Toutes les activités →</a></p>' : '<p class="muted">Rien de prévu.</p>'}</div></div>`);
  $('#page').onclick = e => { const r = e.target.closest('[data-href]'); if (r && !e.target.closest('a')) aller(r.dataset.href); };
};
