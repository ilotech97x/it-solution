/* ILO CONTROL — l'administration centrale de l'écosystème IloTech (ilo-tech.com/control/, non référencée par les moteurs).
   Même compte et même base que les applis (commun/base.js). L'administrateur voit tout ; un modérateur voit la file de validation,
   la modération et l'assistance de son univers. Base : commun/controle.sql (journal, suspension, file unique, utilisateurs, chiffres,
   purge), commun/pilotage.sql (tableau de bord), commissions, signalements, assistance, suppressions.
   Jamais de données des entreprises NEXORA, de messages privés ni de positions GPS en direct. Maquette : « ILO CONTROL : vue générale ». */
'use strict';

const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ICO = { retour: svg('M15 6l-6 6 6 6'), cloche: svg('M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4') };
// code de la page, titre, ouvert aux modérateurs
const MODULES = [['', 'Vue générale', true], ['applications', 'Applications'], ['utilisateurs', 'Utilisateurs'], ['partenaires', 'Partenaires', true], ['moderation', 'Modération', true],
  ['finances', 'Finances'], ['commissions', 'Commissions'], ['territoires', 'Territoires'], ['securite', 'Sécurité'], ['assistance', 'Assistance', true], ['configuration', 'Configuration']];
let mesModerations = [], compteurs = {}, auth2 = null;   // auth2 : niveau de connexion (aal1, aal2) et suivant
const estAdmin = () => profil?.role === 'admin';
const visibles = () => MODULES.filter(([, , m]) => estAdmin() || (m && mesModerations.length > 0));

const APP = {
  nom: 'ILO CONTROL', titre: 'ILO CONTROL', accueilConnecte: '#/', sansInscription: true,
  texteConnexion: 'Administration de l’écosystème IloTech : réservée à l’administrateur et aux modérateurs.',
  menu: () => [],
  menuBas: () => (moi ? visibles() : []).map(([k, t]) => ['#/' + k, '', t, compteurs[k] || 0]),
  enteteRail: () => '<a class="rail-logo" href="#/">ILO CONTROL</a>',
  apresNav: () => {
    if (!moi) return;
    $('#bas').insertAdjacentHTML('beforeend', `<div class="rail-pied"><span>Connecté : ${estAdmin() ? 'administrateur' : 'modérateur (' + esc(mesModerations.join(', ')) + ')'}${auth2 ? ` · double authentification ${auth2.currentLevel === 'aal2' ? 'active' : 'à activer'}` : ''}</span>
      <span><a href="../woulib/">Woulib</a> · <a href="../pass/">EventPass</a> · <a href="https://immo.ilo-tech.com/">Kaz An Nou</a> · <a href="../nexora/">NEXORA</a></span><a href="#/deconnexion">Se déconnecter</a></div>`);
  },
  icones: () => ICO,
  apresConnexion: async () => {
    mesModerations = (await q(sb.from('moderateurs_univers').select('univers').eq('user_id', moi.id)).catch(() => [])).map(x => x.univers);
    try { auth2 = (await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data || null; } catch (e) { auth2 = null; }
  },
  quitter: () => { const a = $('#app'); if (a) a.oninput = a.onsubmit = a.onclick = a.onchange = a.onpointermove = a.onpointerdown = a.onpointerleave = null; },
  pages: {}
};

// ---------------------------------------------------------------- outils d'affichage
const APPLI_U = { food: 'Woulib', move: 'Woulib', express: 'Woulib', events: 'EventPass', living: 'Kaz An Nou', services: 'Kaz An Nou' };
const LIEN_FICHE = { restaurant: id => '../woulib/#/resto/' + id, evenement: id => '../pass/#/evenement/' + id, logement: id => 'https://immo.ilo-tech.com/#/logement/' + id, prestation: id => 'https://immo.ilo-tech.com/#/prestation/' + id };
const MOTIFS = { arnaque: 'Arnaque ou prix trompeur', faux: 'Fausse information ou faux profil', danger: 'Danger ou conduite à risque', harcelement: 'Insulte, harcèlement ou menace',
  illegal: 'Vente ou contenu illégal', choquant: 'Contenu choquant', droits: 'Photo ou texte copié sans droit', autre: 'Autre chose' };
const SUJETS = { commande: 'Une commande', course: 'Une course', colis: 'Un colis', compte: 'Mon compte', donnees: 'Mes données personnelles', pro: 'Mon espace pro', autre: 'Autre chose' };
const ST_AIDE = { ouverte: ['att', 'En attente'], repondue: ['ok', 'Répondu'], close: ['gris', 'Close'] };
const ST_SIGNAL = { ouvert: ['att', 'Nouveau'], en_cours: ['info', 'En examen'], traite: ['ok', 'Mesure prise'], rejete: ['gris', 'Sans suite'] };
const ST_CH = { demande: ['att', 'En vérification'], valide: ['ok', 'Validé'], refuse: ['ko', 'Refusé'], suspendu: ['ko', 'Suspendu'] };
const ROLES = { admin: 'administrateur', moderateur: 'modérateur', systeme: 'système' };
const eurC = n => n == null ? '—' : Math.round(Number(n)).toLocaleString('fr-FR') + ' €';
const nbFr = n => Number(n || 0).toLocaleString('fr-FR');
const ilYa = d => { const m = (Date.now() - new Date(d)) / 6e4; return m < 60 ? `il y a ${Math.max(1, Math.round(m))} min` : m < 1440 ? `il y a ${Math.round(m / 60)} h` : m < 2880 ? 'hier' : `il y a ${Math.round(m / 1440)} j`; };
const jourCourt = d => d ? fmt(d, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const page = (titre, corps, droite = '') => `<div class="ctl-page"><header class="ctl-tete"><h1>${titre}</h1>${droite}</header>${corps}</div>`;
const carte = (titre, corps, cls = '') => `<section class="ctl-carte ${cls}"><h2>${titre}</h2>${corps}</section>`;
const periodes = (j, base) => `<div class="seg ctl-periodes" role="group" aria-label="Période">${[7, 30, 90, 365].map(x => `<a href="${base}?jours=${x}" aria-pressed="${x === j}">${x === 365 ? '1 an' : x + ' j'}</a>`).join('')}</div>`;
const INSTALLER = '<div class="bandeau att"><span><b>La base n’est pas encore à jour.</b> Collez <b>sites\\INSTALLER-SUPABASE.sql</b> dans Supabase › SQL Editor › Run, puis rechargez la page.</span></div>';
const ligneJournal = (x, noms = {}) => `<div class="ctl-j"><b>${esc(jourHeure(x.created_at))}</b> · ${esc(noms[x.acteur] || ROLES[x.role] || x.role)} · ${esc(x.action)}${x.details?.motif ? ` <span class="muted">(motif : ${esc(x.details.motif)})</span>` : ''}</div>`;
const tableApps = l => `<div class="tableau"><table class="t ctl-t"><thead><tr><th scope="col">Application</th><th scope="col">Activité</th><th scope="col" class="num">Volume</th><th scope="col" class="num">Commission</th></tr></thead>
  <tbody>${l.map(x => `<tr><th scope="row">${esc(x.app)}</th><td>${esc(x.activite)}</td><td class="num">${eurC(x.volume)}</td><td class="num">${eurC(x.commission)}</td></tr>`).join('')}</tbody></table></div>`;
// table centrale d'activité (commun/activite.sql) : toutes les applis, Sousou compris, sans donnée personnelle
const tableActivite = m => `<div class="tableau"><table class="t ctl-t"><thead><tr><th scope="col">Application</th><th scope="col" class="num">Opérations</th><th scope="col" class="num">Volume réel</th><th scope="col" class="num">Commission</th></tr></thead>
  <tbody>${m.apps.map(x => `<tr><th scope="row">${esc(x.nom || x.app)}${x.demo ? ` <span class="tag gris">dont ${nbFr(x.demo)} en démonstration</span>` : ''}</th><td class="num">${nbFr(x.operations)}</td><td class="num">${eurC(x.volume)}</td><td class="num">${eurC(x.commission)}</td></tr>`).join('')
    || '<tr><td colspan="4" class="muted">Aucune opération sur la période.</td></tr>'}</tbody>
  <tfoot><tr><th scope="row">Total</th><td class="num">${nbFr(m.total.operations)}</td><td class="num">${eurC(m.total.volume)}</td><td class="num">${eurC(m.total.commission)}</td></tr></tfoot></table></div>`;
// registre des applications (table `applications`), regroupé par marque : Woulib = 5 services, une adresse
const ETATS_APP = { en_ligne: ['En ligne', 'ok'], en_test: ['En test', 'att'], en_projet: ['En projet', 'gris'], en_pause: ['En pause', 'ko'] };
const listeApplications = registre => {
  const marques = [];
  for (const a of registre) {
    let m = marques.find(x => x.marque === a.marque);
    if (!m) marques.push(m = { marque: a.marque, services: [], etat: a.etat, adresse: a.adresse });
    m.services.push(a.nom);
    if (a.etat === 'en_ligne') m.etat = 'en_ligne';
    m.adresse = m.adresse || a.adresse;
  }
  return `<div class="ctl-liste">${marques.map(m => { const [libelle, ton] = ETATS_APP[m.etat] || [m.etat, 'gris'];
    return `<div class="ctl-ligne"><span><b>${esc(m.marque)}</b>${m.services.length > 1 ? `<small>${esc(m.services.join(' · '))}</small>` : ''}</span>
      <span><span class="tag ${ton}">${esc(libelle)}</span>${m.adresse ? ` <a class="btn btn-s" href="${esc(m.adresse)}" target="_blank" rel="noopener">Ouvrir</a>` : ''}</span></div>`; }).join('')}</div>`;
};
const majCompteurs = c => { Object.assign(compteurs, c); nav(); };

// accès : connecté, administrateur ou modérateur, double authentification si le compte l'a activée
function garde(code) {
  if (!moi) { aller('#/connexion?retour=' + encodeURIComponent(location.hash || '#/')); return false; }
  if (!estAdmin() && !mesModerations.length) {
    vue(page('Accès réservé', '<div class="vide-etat"><h3>ILO CONTROL est réservé à l’administration</h3><p class="muted">Il sert à l’administrateur et aux modérateurs de l’écosystème IloTech.</p><a class="btn btn-p" href="../woulib/">Aller sur Woulib</a></div>'));
    return false;
  }
  if (auth2 && auth2.nextLevel === 'aal2' && auth2.currentLevel !== 'aal2') { codeDouble(); return false; }
  const m = MODULES.find(([k]) => k === code);
  if (m && !m[2] && !estAdmin()) { vue(page(m[1], '<div class="vide-etat"><h3>Réservé à l’administrateur</h3><p class="muted">Un modérateur voit la file de validation, la modération et l’assistance de son univers.</p><a class="btn btn-p" href="#/partenaires">Partenaires</a></div>')); return false; }
  return true;
}
// connexion en deux étapes : le code de l'application d'authentification
async function codeDouble() {
  vue(page('Double authentification', `<form class="f ctl-carte" id="fMfa" style="max-width:420px"><p class="muted" style="margin:0">Ouvrez votre application d’authentification et tapez le code à 6 chiffres affiché pour ILO CONTROL.</p>
    <label>Code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="btn btn-p">Valider</button></form>`));
  $('#fMfa').addEventListener('submit', async e => {
    e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true;
    try {
      const f = (await sb.auth.mfa.listFactors()).data?.totp?.find(x => x.status === 'verified'); if (!f) throw new Error('Aucune application d’authentification enregistrée.');
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: f.id, code: e.target.code.value.trim() }); if (error) throw error;
      auth2 = (await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data; toast('Connexion confirmée.'); rendre();
    } catch (err) { toast(/invalid|code/i.test(err.message || '') ? 'Code incorrect ou expiré : réessayez.' : erreur(err), true); b.disabled = false; }
  });
}

// petite courbe d'une série (une seule échelle) : aire légère, trait de 2 px, total, survol = jour et valeur
function courbe(series, cle, titre, format, couleur) {
  const v = series.map(x => Number(x[cle]) || 0), max = Math.max(1, ...v), L = 600, H = 150, h = 120, pas = v.length > 1 ? L / (v.length - 1) : L;
  const pts = v.map((y, i) => [Math.round(i * pas * 10) / 10, Math.round((h - y / max * (h - 12)) * 10) / 10]);
  const ligne = pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '), total = v.reduce((t, x) => t + x, 0);
  const jour = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `<figure class="courbe" style="--c:${couleur}" data-valeurs="${esc(JSON.stringify(series.map((x, i) => [jour(x.d), format(v[i])])))}">
    <figcaption><b>${esc(titre)}</b><span>${format(total)} sur la période</span></figcaption>
    <div class="courbe-zone"><svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(titre)} : ${format(total)} au total, ${format(v.at(-1) || 0)} le dernier jour">
      <line x1="0" y1="${h}" x2="${L}" y2="${h}" class="axe"/><path d="${ligne} L ${L} ${h} L 0 ${h} Z" class="aire"/><path d="${ligne}" class="trait"/><line class="repere" x1="0" y1="0" x2="0" y2="${h}" hidden/></svg>
      <span class="max">${format(max)}</span><span class="pt" hidden></span><div class="bulle" hidden></div></div>
    <div class="axe-x"><span>${jour(series[0].d)}</span><span>${jour(series.at(-1).d)}</span></div></figure>`;
}
function brancherCourbes() {
  const survol = e => {
    const fig = e.target.closest('.courbe'); if (!fig) return;
    const zone = fig.querySelector('.courbe-zone'), r = zone.getBoundingClientRect(), val = JSON.parse(fig.dataset.valeurs), n = val.length;
    const i = Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left) / r.width * (n - 1)))), x = n > 1 ? i / (n - 1) : 0, svgEl = zone.querySelector('svg');
    const p = svgEl.querySelector('.trait').getAttribute('d').split(/[ML]/).filter(Boolean)[i].trim().split(' ');
    const rep = svgEl.querySelector('.repere'); rep.hidden = false; rep.setAttribute('x1', p[0]); rep.setAttribute('x2', p[0]);
    const pt = zone.querySelector('.pt'); pt.hidden = false; pt.style.left = x * 100 + '%'; pt.style.top = (Number(p[1]) / 150 * 100) + '%';
    const b = zone.querySelector('.bulle'); b.hidden = false; b.textContent = `${val[i][0]} : ${val[i][1]}`; b.style.left = Math.min(Math.max(x * 100, 12), 88) + '%';
  };
  $('#app').onpointermove = survol; $('#app').onpointerdown = survol;
  $('#app').onpointerleave = () => document.querySelectorAll('.courbe .repere,.courbe .pt,.courbe .bulle').forEach(el => { el.hidden = true; });
}

// ---------------------------------------------------------------- Vue générale
APP.pages[''] = async () => {
  if (!garde('')) return;
  attente();
  const jours = Number(param().jours) || 30, admin = estAdmin();
  if (admin) sb.rpc('purger_donnees').then(() => {}, () => {});   // durées de conservation : au plus une fois par jour, décidé par la base
  const [t, apps, file, sig, aide, journal, eco] = await Promise.all([
    admin ? q(sb.rpc('tableau_de_bord', { jours })).catch(() => null) : null,
    admin ? q(sb.rpc('controle_apps', { jours })).catch(() => null) : null,
    q(sb.rpc('file_validation')).catch(() => null),
    q(sb.from('signalements').select('*').in('statut', ['ouvert', 'en_cours']).order('created_at', { ascending: false }).limit(50)).catch(() => []),
    q(sb.from('assistance').select('id').eq('statut', 'ouverte').limit(200)).catch(() => []),
    admin ? q(sb.from('journal_admin').select('*').order('created_at', { ascending: false }).limit(8)).catch(() => []) : [],
    admin ? q(sb.rpc('metriques_ecosysteme', { jours })).catch(() => null) : null]);
  majCompteurs({ partenaires: file?.length || 0, moderation: sig.length, assistance: aide.length });
  const periode = jours === 365 ? '12 derniers mois' : jours + ' derniers jours';
  const kpi = (titre, v, s) => `<div class="ctl-kpi"><span>${titre}</span><b>${v}</b><small>${s}</small></div>`;
  vue(page('Vue générale', `${file === null ? INSTALLER : ''}
    ${t ? `<div class="ctl-kpis">${kpi('Volume d’affaires', eurC(t.volume), 'commandes, courses, colis, billets, séjours')}${kpi('Commissions', eurC(t.commissions.periode), `dont ${eurC(t.commissions.dues)} à encaisser`)}
      ${kpi('Nouveaux comptes', nbFr(t.comptes.periode), `${nbFr(t.comptes.total)} comptes en tout`)}${kpi('Demandes des clients', nbFr(t.activite), 'toutes applis confondues')}</div>` : ''}
    <div class="ctl-2">${carte(`À valider · ${file?.length || 0}`, file?.length ? `<div class="ctl-liste">${file.slice(0, 6).map(x => `<div class="ctl-ligne"><span><b>${esc(x.nom)}</b><small>${esc(x.genre)} · ${esc(APPLI_U[x.univers] || '')} · ${ilYa(x.depuis)}</small></span>
        <a class="btn btn-p btn-s" href="#/partenaires?type=${x.type}">Examiner</a></div>`).join('')}</div>` : '<p class="muted">Rien à valider.</p>')}
      ${carte(`Signalements ouverts · ${sig.length}`, (sig.length ? `<div class="ctl-liste">${sig.slice(0, 5).map(x => `<div class="ctl-ligne"><span><b>${esc(MOTIFS[x.motif] || x.motif)}</b><small>${esc(x.univers)} · ${esc(x.objet_type)} · ${ilYa(x.created_at)}</small></span>
        <a class="btn btn-s" href="#/moderation">Traiter</a></div>`).join('')}</div>` : '<p class="muted">Aucun signalement ouvert.</p>') + '<p class="petit muted">Chaque décision est motivée et envoyée à la personne concernée (règlement européen sur les services numériques).</p>')}</div>
    ${eco ? carte(`Toutes les applis · ${periode}`, tableActivite(eco) + '<p class="petit muted">Une seule table réunit l’activité de toutes les applis, Sousou compris (branché le 9 novembre, encore en test), sans nom ni adresse. L’argent de démonstration (paiements simulés de Sousou) n’entre jamais dans le volume. NEXORA : des nombres seulement.</p>')
      : apps ? carte(`Par application · ${periode}`, tableApps(apps) + '<p class="petit muted">NEXORA : des nombres seulement. ILO CONTROL ne lit aucune donnée des entreprises.</p>') : ''}
    ${t || eco ? `<div class="courbes">${t ? courbe(t.series, 'volume', 'Volume d’affaires par jour', eurC, '#0E7490') + courbe(t.series, 'activite', 'Demandes des clients par jour', nbFr, '#0E7490') + courbe(t.series, 'comptes', 'Nouveaux comptes par jour', nbFr, '#0E7490') : ''}${eco?.serie?.length ? courbe(eco.serie.map(x => ({ d: x.jour, operations: x.operations })), 'operations', 'Opérations, toutes applis', nbFr, '#0E7490') : ''}</div>` : ''}
    ${journal.length ? carte('Journal de l’administration', `<div class="ctl-journal">${journal.map(x => ligneJournal(x)).join('')}</div><p class="petit"><a href="#/securite">Tout le journal</a></p>`) : ''}`,
    admin ? periodes(jours, '#/') : ''));
  brancherCourbes();
};

// ---------------------------------------------------------------- Partenaires : une seule file pour valider tous les pros
const TYPES_P = [['', 'Tout'], ['restaurant', 'Restaurants et commerces'], ['chauffeur', 'Chauffeurs et livreurs'], ['evenement', 'Événements'], ['logement', 'Logements'], ['prestation', 'Prestations'], ['role', 'Hôtes et prestataires']];
const cartePartenaire = x => `<article class="ctl-carte ctl-part" id="p-${esc(x.id)}">${x.photo ? `<img src="${esc(photo(x.photo))}" alt="" loading="lazy">` : ''}
  <div class="ctl-part-c"><div class="ctl-part-t"><b>${esc(x.nom)}</b><span class="tag">${esc(x.genre)}</span><span class="muted petit">${esc(APPLI_U[x.univers] || '')} · ${esc([x.commune, x.territoire].filter(Boolean).join(', '))} · ${ilYa(x.depuis)}</span></div>
    ${x.details ? `<p class="petit">${esc(x.details)}</p>` : ''}${x.carte ? `<p class="petit">Carte professionnelle : <b>${esc(x.carte)}</b></p>` : ''}
    <p class="petit">${esc(x.email || '')}${x.telephone ? ` · <a href="${wa(x.telephone, 'Bonjour, ici IloTech pour la vérification de votre compte.')}" target="_blank" rel="noopener">${esc(x.telephone)} (WhatsApp)</a>` : ''}${LIEN_FICHE[x.type] ? ` · <a href="${LIEN_FICHE[x.type](x.id)}" target="_blank" rel="noopener">Voir la fiche</a>` : ''}</p>
    <form class="f ctl-decision" data-type="${x.type}" data-id="${esc(x.id)}"><label>Motif en cas de refus <span class="aide">(envoyé au pro)</span><input name="motif" maxlength="500" placeholder="Photos floues, carte professionnelle expirée…"></label>
      <div class="actions"><button class="btn btn-ok" value="valider">Valider</button><button class="btn btn-ko" value="refuser">Refuser</button></div></form></div></article>`;
APP.pages.partenaires = async () => {
  if (!garde('partenaires')) return;
  attente();
  const f = param().type || '', voitChauffeurs = estAdmin() || mesModerations.includes('move');
  const [l, chs] = await Promise.all([q(sb.rpc('file_validation_contacts')).catch(() => null),
    voitChauffeurs ? q(sb.from('chauffeurs').select('*').neq('statut', 'demande').order('created_at', { ascending: false }).limit(200)).catch(() => []) : []]);
  if (l === null) return vue(page('Partenaires', INSTALLER));
  majCompteurs({ partenaires: l.length });
  const ids = chs.map(x => x.id);
  const [pr, ct] = ids.length ? await Promise.all([q(sb.from('profiles').select('id, prenom, nom').in('id', ids)).catch(() => []), q(sb.from('contacts').select('*').in('id', ids)).catch(() => [])]) : [[], []];
  const n = k => l.filter(x => !k || x.type === k).length, liste = l.filter(x => !f || x.type === f);
  vue(page('Partenaires', `<p class="muted">Une seule file pour Woulib, EventPass et Kaz An Nou. Appelez le pro au moindre doute ; un refus est toujours motivé, et le motif lui est envoyé.</p>
    <div class="puces" role="group" aria-label="Type">${TYPES_P.filter(([k]) => !k || n(k) || k === f).map(([k, t]) => `<a href="#/partenaires${k ? '?type=' + k : ''}" class="${f === k ? 'on' : ''}" ${f === k ? 'aria-current="true"' : ''}>${t} (${n(k)})</a>`).join('')}</div>
    ${liste.length ? `<div class="ctl-file">${liste.map(cartePartenaire).join('')}</div>` : '<div class="vide-etat"><h3>Rien à valider</h3><p class="muted">Les nouvelles demandes apparaîtront ici.</p></div>'}
    ${chs.length && (!f || f === 'chauffeur') ? carte(`Chauffeurs et livreurs déjà vérifiés (${chs.length})`, `<div class="ctl-liste">${chs.map(x => { const p = pr.find(y => y.id === x.id), c = ct.find(y => y.id === x.id);
      return `<div class="ctl-ligne"><span><b>${esc(p ? `${p.prenom} ${p.nom}` : '')}</b> ${tag(ST_CH[x.statut])} <span class="tag">${esc(x.type.toUpperCase())}</span>
        <small>${x.numero_carte ? 'Carte ' + esc(x.numero_carte) + ' · ' : ''}${esc(x.vehicule)} ${esc(x.couleur || '')} ${x.immatriculation ? '· ' + esc(x.immatriculation) : ''} · ${esc(x.territoire)}${c?.telephone ? ' · ' + esc(c.telephone) : ''}</small></span>
        <span class="actions">${x.statut === 'valide' ? `<button type="button" class="btn btn-s btn-ko" data-ch="${x.id}" data-v="suspendu">Suspendre</button>` : `<button type="button" class="btn btn-s btn-ok" data-ch="${x.id}" data-v="valide">Valider</button>`}</span></div>`; }).join('')}</div>`) : ''}`));
  $('#app').onsubmit = async e => {
    const fo = e.target.closest('form.ctl-decision'); if (!fo) return;
    e.preventDefault(); const decision = e.submitter?.value || 'valider', motif = fo.motif.value.trim();
    if (decision === 'refuser' && motif.length < 5) { fo.motif.setAttribute('aria-invalid', 'true'); fo.motif.focus(); return toast('Écrivez le motif du refus : il est envoyé au pro.', true); }
    fo.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try { await q(sb.rpc('decider_partenaire', { type_p: fo.dataset.type, cible: fo.dataset.id, decision, motif: motif || null })); toast(decision === 'valider' ? 'Validé : le pro est prévenu.' : 'Refusé : le motif est envoyé au pro.'); APP.pages.partenaires(); }
    catch (err) { toast(erreur(err), true); fo.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  };
  $('#app').onclick = async e => {
    const b = e.target.closest('[data-ch]'); if (!b) return;
    if (b.dataset.v === 'suspendu' && !confirm('Suspendre ce chauffeur ? Il ne recevra plus de courses ni de livraisons.')) return;
    try { await q(sb.from('chauffeurs').update({ statut: b.dataset.v }).eq('id', b.dataset.ch)); toast('C’est fait.'); APP.pages.partenaires(); } catch (err) { toast(erreur(err), true); }
  };
};

// ---------------------------------------------------------------- Modération (signalements) et Assistance
async function pageSuivi(sous) {
  attente();
  const table = sous === 'moderation' ? 'signalements' : 'assistance';
  const l = await q(sb.from(table).select('*').order('created_at', { ascending: false }).limit(200)).catch(() => null);
  if (l === null) return vue(page(sous === 'moderation' ? 'Modération' : 'Assistance', INSTALLER));
  const ouverts = x => ['ouvert', 'en_cours', 'ouverte'].includes(x.statut), tri = [...l.filter(ouverts), ...l.filter(x => !ouverts(x))];
  majCompteurs(sous === 'moderation' ? { moderation: l.filter(ouverts).length } : { assistance: l.filter(x => x.statut === 'ouverte').length });
  const ids = [...new Set(l.map(x => x.auteur).filter(Boolean))];
  const noms = ids.length ? Object.fromEntries((await q(sb.from('profiles').select('id, prenom, nom').in('id', ids)).catch(() => [])).map(p => [p.id, `${p.prenom} ${p.nom}`.trim()])) : {};
  const qui = id => esc(noms[id] || 'un utilisateur'), objet = (t, id) => `${esc(t)}${id ? ' ' + esc(String(id).slice(0, 6).toUpperCase()) : ''}`;
  const signal = x => `<article class="ctl-carte aide-l"><div class="aide-t"><b>${esc(MOTIFS[x.motif] || x.motif)}</b>${tag(ST_SIGNAL[x.statut])}</div>
      <p class="muted petit">${esc(x.univers)} · ${objet(x.objet_type, x.objet_id)} · par ${qui(x.auteur)} · ${esc(jourHeure(x.created_at))}</p>
      ${x.details ? `<p style="white-space:pre-line">${esc(x.details)}</p>` : ''}${x.decision ? `<div class="reponse"><b>Décision</b><p>${esc(x.decision)}</p></div>` : ''}
      ${ouverts(x) ? `<form class="f" data-signal="${x.id}"><label>Décision motivée <span class="aide">(envoyée à la personne qui a signalé)</span><textarea name="motivation" maxlength="1000" style="min-height:64px"></textarea></label>
        <div class="actions">${x.statut === 'ouvert' ? '<button class="btn btn-s" value="en_cours">Je m’en occupe</button>' : ''}<button class="btn btn-s btn-p" value="traite">Mesure prise</button><button class="btn btn-s" value="rejete">Sans suite</button></div></form>` : ''}</article>`;
  const aide = x => `<article class="ctl-carte aide-l"><div class="aide-t"><b>${esc(SUJETS[x.sujet] || x.sujet)}</b>${tag(ST_AIDE[x.statut])}</div>
      <p class="muted petit">${esc(x.appli)} · ${x.objet_id ? objet(x.sujet, x.objet_id) + ' · ' : ''}par ${qui(x.auteur)} · ${esc(jourHeure(x.created_at))}</p>
      <p style="white-space:pre-line">${esc(x.message)}</p>${x.reponse ? `<div class="reponse"><b>Réponse</b><p style="white-space:pre-line">${esc(x.reponse)}</p></div>` : ''}
      ${x.statut !== 'close' ? `<form class="f" data-aide="${x.id}"><label>Réponse<textarea name="reponse" required maxlength="2000" style="min-height:64px"></textarea></label>
        <div class="actions"><button class="btn btn-s btn-p" value="repondre">Répondre</button><button class="btn btn-s" value="clore">Répondre et clore</button></div></form>` : ''}</article>`;
  vue(page(sous === 'moderation' ? 'Modération' : 'Assistance', `<p class="muted">${sous === 'moderation' ? 'Signalements envoyés depuis les applis. Chaque décision est motivée et envoyée à la personne qui a signalé (DSA). À traiter vite, surtout en cas de danger.'
    : 'Demandes d’aide envoyées depuis les applis. La réponse arrive dans les notifications de la personne.'}</p>
    ${tri.length ? `<div class="ctl-file">${tri.map(sous === 'moderation' ? signal : aide).join('')}</div>` : '<div class="vide-etat"><h3>Rien à traiter</h3></div>'}`));
  $('#app').onsubmit = async e => {
    const fo = e.target.closest('form[data-signal], form[data-aide]'); if (!fo) return;
    e.preventDefault(); const choix = e.submitter?.value, d = Object.fromEntries(new FormData(fo));
    fo.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      if (fo.dataset.signal) await q(sb.rpc('traiter_signalement', { sid: fo.dataset.signal, nouveau: choix, motivation: (d.motivation || '').trim() || null }));
      else await q(sb.rpc('repondre_aide', { aid: fo.dataset.aide, texte: (d.reponse || '').trim(), cloturer: choix === 'clore' }));
      toast('Enregistré.'); pageSuivi(sous);
    } catch (err) { toast(erreur(err), true); fo.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  };
}
APP.pages.moderation = () => garde('moderation') && pageSuivi('moderation');
APP.pages.assistance = () => garde('assistance') && pageSuivi('assistance');

// ---------------------------------------------------------------- Utilisateurs : lecture limitée, suspension
const LIB_ACT = { commandes: 'commande(s)', courses: 'course(s)', colis: 'colis', billets: 'billet(s)', sejours: 'séjour(s)', restaurants: 'restaurant(s) ou commerce(s)', chauffeur: 'chauffeur',
  logements: 'logement(s)', evenements: 'événement(s)', prestations: 'prestation(s)', nexora: 'entreprise(s) NEXORA' };
APP.pages.utilisateurs = async () => {
  if (!garde('utilisateurs')) return;
  attente();
  const cherche = param().q || '';
  const l = await q(sb.rpc('controle_utilisateurs', { q: cherche })).catch(() => null);
  if (l === null) return vue(page('Utilisateurs', INSTALLER));
  const act = a => Object.entries(a || {}).map(([k, v]) => k === 'chauffeur' ? esc(v) : `${esc(v)} ${LIB_ACT[k] || k}`).join(' · ') || '—';
  vue(page('Utilisateurs', `<form class="ctl-recherche" id="fU" role="search"><label for="qU" class="cache-visuel">Nom, email ou téléphone</label>
      <input id="qU" name="q" class="champ" value="${esc(cherche)}" placeholder="Nom, email ou téléphone"><button class="btn btn-p">Chercher</button></form>
    <p class="muted petit">${cherche ? `${l.length} résultat${l.length > 1 ? 's' : ''} pour « ${esc(cherche)} »` : 'Les 50 derniers comptes'}. Lecture limitée : identité, contact, dates et nombres ; jamais le contenu des commandes ni des messages.</p>
    ${l.length ? `<div class="tableau"><table class="t ctl-t"><thead><tr><th scope="col">Personne</th><th scope="col">Contact</th><th scope="col">Inscrit</th><th scope="col">Dernière connexion</th><th scope="col">Activité</th><th scope="col"><span class="cache-visuel">Actions</span></th></tr></thead>
      <tbody>${l.map(x => `<tr><th scope="row">${esc(x.prenom)} ${esc(x.nom)}${x.role !== 'client' ? ` <span class="tag">${esc(x.role)}</span>` : ''}${x.moderation ? ` <span class="tag info">modère ${esc(x.moderation)}</span>` : ''}${x.suspendu ? ` <span class="tag ko">suspendu</span>` : ''}
        <small class="muted ctl-bloc">${esc(x.territoire || '')}</small></th><td>${esc(x.email || '')}<small class="muted ctl-bloc">${esc(x.telephone || '')}</small></td><td>${jourCourt(x.inscrit)}</td><td>${jourCourt(x.derniere_connexion)}</td>
        <td class="petit">${act(x.activite)}${x.suspendu ? `<small class="ctl-bloc" style="color:var(--erreur)">Motif : ${esc(x.suspendu)}</small>` : ''}</td>
        <td>${x.role === 'admin' || x.id === moi.id ? '' : x.suspendu ? `<button type="button" class="btn btn-s" data-retablir="${x.id}">Rétablir</button>` : `<button type="button" class="btn btn-s btn-ko" data-suspendre="${x.id}" data-nom="${esc(x.prenom)}">Suspendre</button>`}</td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vide-etat"><h3>Aucun compte trouvé</h3><p class="muted">Essayez le prénom, une partie de l’email ou du téléphone.</p></div>'}`));
  $('#fU').addEventListener('submit', e => { e.preventDefault(); aller('#/utilisateurs' + (e.target.q.value.trim() ? '?q=' + encodeURIComponent(e.target.q.value.trim()) : '')); });
  $('#app').onclick = async e => {
    const s = e.target.closest('[data-suspendre]'), r = e.target.closest('[data-retablir]');
    try {
      if (s) {
        const motif = prompt(`Motif de la suspension de ${s.dataset.nom} (envoyé à la personne) :`, ''); if (motif === null) return;
        const res = await q(sb.rpc('suspendre_compte', { cible: s.dataset.suspendre, motif_s: motif.trim() }));
        toast(res.connexion_bloquee ? 'Compte suspendu, connexion bloquée.' : 'Compte suspendu. Bloquez aussi sa connexion : Supabase › Authentication › Users › Ban user.'); APP.pages.utilisateurs();
      }
      if (r && confirm('Rétablir ce compte ? Ses offres pro restent en pause, à rouvrir par le pro.')) { await q(sb.rpc('retablir_compte', { cible: r.dataset.retablir })); toast('Compte rétabli.'); APP.pages.utilisateurs(); }
    } catch (err) { toast(erreur(err).replace(/^[A-Z_]{4,}\s+/, ''), true); }
  };
};

// ---------------------------------------------------------------- Finances et Commissions
APP.pages.finances = async () => {
  if (!garde('finances')) return;
  attente();
  const jours = Number(param().jours) || 30;
  const [apps, rev] = await Promise.all([q(sb.rpc('controle_apps', { jours })).catch(() => null), q(sb.rpc('reversements_en_attente')).catch(() => [])]);
  if (apps === null) return vue(page('Finances', INSTALLER));
  const tot = k => apps.reduce((t, x) => t + Number(x[k] || 0), 0);
  vue(page('Finances', `<div class="ctl-kpis">${[['Volume d’affaires', eurC(tot('volume')), 'ventes réalisées'], ['Commissions', eurC(tot('commission')), 'inscrites sur la période'],
      ['Reversements en attente', eurC((rev || []).reduce((t, x) => t + Number(x.montant), 0)), 'encaissés par des livreurs pour des restaurants']].map(([a, b, c]) => `<div class="ctl-kpi"><span>${a}</span><b>${b}</b><small>${c}</small></div>`).join('')}</div>
    ${carte('Par application', tableApps(apps))}
    ${carte('Livreurs : argent à remettre aux restaurants', rev?.length ? `<div class="tableau"><table class="t ctl-t"><thead><tr><th scope="col">Livreur</th><th scope="col">Restaurant</th><th scope="col" class="num">Livraisons</th><th scope="col" class="num">Montant</th><th scope="col">Depuis</th></tr></thead>
      <tbody>${rev.map(x => `<tr><th scope="row">${esc(x.livreur)}</th><td>${esc(x.restaurant)}</td><td class="num">${nbFr(x.nb)}</td><td class="num">${eur(x.montant)}</td><td>${ilYa(x.depuis)}</td></tr>`).join('')}</tbody></table></div>
      <p class="petit muted">Le restaurant confirme la réception dans son espace ; la ligne disparaît alors.</p>` : '<p class="muted">Rien en attente.</p>')}`, periodes(jours, '#/finances')));
};
APP.pages.commissions = async () => {
  if (!garde('commissions')) return;
  attente();
  const l = await q(sb.rpc('commissions_a_regler')).catch(err => { toast(erreur(err), true); return []; });
  vue(page('Commissions', `<p class="muted">Ce que chaque pro doit à la plateforme. Un relevé part sur WhatsApp ; « Réglé » enregistre le paiement, prévient le pro et laisse une ligne au journal.</p>
    ${carte(`À régler par les pros · ${eur(l.reduce((t, x) => t + Number(x.montant), 0))}`, l.length ? `<div class="ctl-liste">${l.map(x => `<div class="ctl-ligne"><span><b>${esc(x.prenom)} ${esc(x.nom)}</b>
      <small>${x.nb} vente${x.nb > 1 ? 's' : ''} · ${esc(x.univers.join(', '))} · ${esc(x.email || '')}${x.telephone ? ' · ' + esc(x.telephone) : ''}</small></span>
      <span class="actions"><b class="ctl-montant">${eur(x.montant)}</b>${x.telephone ? `<a class="btn btn-s btn-wa" target="_blank" rel="noopener" href="${wa(x.telephone, `Bonjour ${x.prenom}, voici votre relevé IloTech : ${eur(x.montant)} de commission pour ${x.nb} vente(s). Merci !`)}">Relevé WhatsApp</a>` : ''}
      <button type="button" class="btn btn-s btn-ok" data-regle="${x.pro_id}" data-montant="${x.montant}">Réglé</button></span></div>`).join('')}</div>` : '<p class="muted">Rien à régler pour l’instant.</p>')}`));
  $('#app').onclick = async e => {
    const b = e.target.closest('[data-regle]'); if (!b || !confirm(`Confirmer le règlement de ${eur(b.dataset.montant)} ?`)) return;
    try { await q(sb.rpc('regler_commissions', { pro: b.dataset.regle })); toast('Règlement enregistré, le pro est prévenu.'); APP.pages.commissions(); } catch (err) { toast(erreur(err), true); }
  };
};

// ---------------------------------------------------------------- Applications, Territoires, Configuration (registre des univers)
let registreC = null;
const chargerUnivers = async () => (registreC = await q(sb.from('univers').select('*').order('ordre')));
APP.pages.applications = async () => {
  if (!garde('applications')) return;
  attente();
  const [reg, mods, registre] = await Promise.all([chargerUnivers(), q(sb.from('moderateurs_univers').select('user_id, univers')).catch(() => []),
    q(sb.from('applications').select('code,nom,marque,adresse,etat').order('ordre')).catch(() => [])]);
  const noms = mods.length ? await q(sb.from('contacts').select('id, email').in('id', mods.map(m => m.user_id))).catch(() => []) : [];
  vue(page('Applications', `${registre.length ? carte('Applications de l’écosystème', listeApplications(registre) + '<p class="petit muted">Registre des applications, dans la base : une nouvelle appli y est ajoutée en une ligne, puis apparaît ici et dans les chiffres de la vue générale.</p>') : ''}
    <h2>Univers</h2><p class="muted">Chaque univers de l’écosystème : ouvert, bientôt (les personnes inscrites à l’alerte sont prévenues à l’ouverture), tenu par une autre appli, ou masqué. Les modérateurs ne voient que leur univers.</p>
    <div class="ctl-file">${reg.map(u => `<article class="ctl-carte" data-u="${u.code}"><div class="ctl-ligne"><span><b>${esc(u.icone)} ${esc(u.nom)}</b><small>${esc(u.description)}</small></span>
      <label class="ctl-statut"><span class="cache-visuel">Statut de ${esc(u.nom)}</span><select data-statut class="champ">${[['actif', 'Ouvert'], ['bientot', 'Bientôt'], ['externe', 'Autre appli'], ['masque', 'Masqué']].map(([k, t]) => `<option value="${k}" ${u.statut === k ? 'selected' : ''} ${k === 'externe' && !u.lien ? 'disabled' : ''}>${t}</option>`).join('')}</select></label></div>
      <p class="petit"><b>Modérateurs :</b> ${mods.filter(m => m.univers === u.code).map(m => `${esc(noms.find(n => n.id === m.user_id)?.email || m.user_id.slice(0, 8))} <button type="button" class="lien" data-retirer="${m.user_id}">retirer</button>`).join(', ') || 'aucun'}
        <button type="button" class="btn btn-s" data-mod>Nommer</button></p></article>`).join('')}</div>`));
  $('#app').onchange = async e => {
    const bloc = e.target.closest('[data-u]'); if (!bloc || !e.target.matches('[data-statut]')) return;
    if (['covoiturage', 'entraide'].includes(bloc.dataset.u) && e.target.value === 'actif' && !confirm('Ouvrir ce mode avant l’avis juridique ? Il n’est pas encore construit.')) return APP.pages.applications();
    try { await q(sb.from('univers').update({ statut: e.target.value }).eq('code', bloc.dataset.u)); toast('Enregistré.'); } catch (err) { toast(erreur(err), true); }
    APP.pages.applications();
  };
  $('#app').onclick = async e => {
    const bloc = e.target.closest('[data-u]'); if (!bloc) return; const code = bloc.dataset.u;
    try {
      if (e.target.closest('[data-mod]')) { const m = prompt('Email du compte à nommer modérateur :'); if (!m) return; await q(sb.rpc('ajouter_moderateur', { email_m: m.trim(), u: code })); toast('Modérateur nommé.'); APP.pages.applications(); }
      const r = e.target.closest('[data-retirer]');
      if (r && confirm('Retirer ce modérateur ?')) { await q(sb.from('moderateurs_univers').delete().eq('user_id', r.dataset.retirer).eq('univers', code)); toast('Modérateur retiré.'); APP.pages.applications(); }
    } catch (err) { toast(erreur(err), true); }
  };
};
APP.pages.territoires = async () => {
  if (!garde('territoires')) return;
  attente();
  const [reg, ut] = await Promise.all([chargerUnivers(), q(sb.from('univers_territoires').select('univers, territoire, actif'))]);
  const terrs = NOMS_TERRITOIRES.filter(t => t !== 'Autre pays'), actifs = reg.filter(u => u.statut === 'actif');
  const ouvert = (u, t) => !ut.some(x => x.univers === u && x.territoire === t && !x.actif);
  vue(page('Territoires', `<p class="muted">Un univers ouvert l’est partout, sauf là où vous le fermez. Décochez une case pour fermer un univers sur un territoire.</p>
    ${actifs.length ? `<div class="tableau"><table class="t ctl-t ctl-matrice"><thead><tr><th scope="col">Univers</th>${terrs.map(t => `<th scope="col">${esc(t)}</th>`).join('')}</tr></thead>
      <tbody>${actifs.map(u => `<tr data-u="${u.code}"><th scope="row">${esc(u.icone)} ${esc(u.nom)}</th>${terrs.map(t => `<td><label><span class="cache-visuel">${esc(u.nom)} en ${esc(t)}</span><input type="checkbox" data-terr="${esc(t)}" ${ouvert(u.code, t) ? 'checked' : ''}></label></td>`).join('')}</tr>`).join('')}</tbody></table></div>`
      : '<p class="muted">Aucun univers ouvert.</p>'}`));
  $('#app').onchange = async e => {
    const c = e.target.closest('[data-terr]'); if (!c) return; const u = c.closest('[data-u]').dataset.u;
    try { await q(sb.from('univers_territoires').upsert({ univers: u, territoire: c.dataset.terr, actif: c.checked })); toast(c.checked ? `Ouvert en ${c.dataset.terr}.` : `Fermé en ${c.dataset.terr}.`); }
    catch (err) { toast(erreur(err), true); c.checked = !c.checked; }
  };
};
const CATS_T = { eco: 'Éco', berline: 'Berline', van: 'Van', pmr: 'Accessible' };
APP.pages.configuration = async () => {
  if (!garde('configuration')) return;
  attente();
  const terrA = param().t || 'Martinique';
  const [reg, tarifs] = await Promise.all([chargerUnivers(), q(sb.from('tarifs_move').select('*').order('territoire').order('categorie')).catch(() => [])]);
  const avecReglages = reg.filter(u => Object.keys(u.parametres || {}).length);
  vue(page('Configuration', `<p class="muted">Taux de commission et réglages de chaque univers (réglables aussi par territoire dans la base), tarifs des taxis et VTC. Chaque changement laisse une ligne au journal.</p>
    ${avecReglages.map(u => carte(`${esc(u.icone)} ${esc(u.nom)}`, `<form class="f ctl-reglages" data-u="${u.code}"><div class="ctl-grille-f">${Object.entries(u.parametres).map(([k, v]) => `<label>${esc(k.replace(/_/g, ' '))}<input name="${esc(k)}" type="number" step="any" value="${esc(v)}"></label>`).join('')}</div>
      <button class="btn btn-p btn-s">Enregistrer</button></form>`)).join('')}
    ${carte('Tarifs des taxis et VTC', `<p class="muted petit">Prix = prise en charge + km × prix au km, jamais moins que le minimum. Distance = vol d’oiseau × 1,35.</p>
      <div class="puces">${NOMS_TERRITOIRES.filter(t => tarifs.some(x => x.territoire === t)).map(t => `<a href="#/configuration?t=${encodeURIComponent(t)}" class="${t === terrA ? 'on' : ''}">${esc(t)}</a>`).join('')}</div>
      <form class="f" id="fT">${tarifs.filter(t => t.territoire === terrA).map(t => `<div class="ctl-grille-f" data-cat="${t.categorie}"><b>${CATS_T[t.categorie] || t.categorie}</b>
        <label>Prise en charge (€)<input name="p" type="number" step="0.1" min="0" value="${t.prise_en_charge}"></label><label>Prix / km (€)<input name="k" type="number" step="0.01" min="0" value="${t.prix_km}"></label><label>Minimum (€)<input name="m" type="number" step="0.5" min="0" value="${t.minimum}"></label></div>`).join('')}
        <button class="btn btn-p">Enregistrer les tarifs : ${esc(terrA)}</button></form>`)}`));
  $('#app').onsubmit = async e => {
    e.preventDefault(); const fo = e.target;
    try {
      if (fo.matches('.ctl-reglages')) {
        const u = registreC.find(x => x.code === fo.dataset.u), p = { ...u.parametres };
        new FormData(fo).forEach((v, k) => { if (v !== '' && !isNaN(Number(v))) p[k] = Number(v); });
        await q(sb.from('univers').update({ parametres: p }).eq('code', u.code)); toast('Réglages enregistrés.');
      } else if (fo.id === 'fT') {
        for (const r of fo.querySelectorAll('[data-cat]')) await q(sb.from('tarifs_move').update({ prise_en_charge: +r.querySelector('[name=p]').value, prix_km: +r.querySelector('[name=k]').value, minimum: +r.querySelector('[name=m]').value }).eq('territoire', terrA).eq('categorie', r.dataset.cat));
        toast('Tarifs enregistrés.');
      }
    } catch (err) { toast(erreur(err), true); }
  };
};

// ---------------------------------------------------------------- Sécurité : équipe, comptes suspendus et supprimés, purge, journal, double authentification
APP.pages.securite = async () => {
  if (!garde('securite')) return;
  attente();
  const [eq, journal, sup, facteurs] = await Promise.all([q(sb.rpc('equipe')).catch(() => null), q(sb.from('journal_admin').select('*').order('created_at', { ascending: false }).limit(200)).catch(() => []),
    q(sb.from('suppressions').select('*').order('demandee_at', { ascending: false }).limit(100)).catch(() => []), sb.auth.mfa.listFactors().then(r => r.data, () => null)]);
  if (eq === null) return vue(page('Sécurité', INSTALLER));
  const noms = Object.fromEntries([...eq.admins, ...eq.moderateurs].map(x => [x.id, x.nom || x.email]));
  const verifie = facteurs?.totp?.find(f => f.status === 'verified'), dp = eq.derniere_purge;
  const LIB_P = { notifications: 'notifications', assistance: 'demandes d’assistance', signalements: 'signalements', alertes_route: 'alertes route', journal: 'lignes de journal' };
  vue(page('Sécurité', `<div class="ctl-2">
    ${carte('Double authentification', verifie ? `<p><span class="tag ok">Active</span> Votre compte demande un code à chaque connexion à ILO CONTROL.</p>`
      : `<p class="muted">Protégez le compte administrateur : à la connexion, un code à 6 chiffres de votre téléphone (Google Authenticator, Microsoft Authenticator…) sera demandé en plus du mot de passe.</p>
         <button type="button" class="btn btn-p" id="activer2">Activer la double authentification</button><div id="zone2"></div>`)}
    ${carte('Purge des données', `<p class="muted petit">Selon les durées de la politique de confidentialité : notifications après 1 an, assistance 1 an après la réponse, signalements 3 ans après la décision, journal après 5 ans. Lancée au plus une fois par jour, à l’ouverture d’ILO CONTROL.</p>
      ${dp ? `<p>Dernière : <b>${esc(jourHeure(dp.fait_le))}</b> · ${Object.entries(dp.details).filter(([k]) => LIB_P[k]).map(([k, v]) => `${nbFr(v)} ${LIB_P[k]}`).join(', ')}${Number(dp.details.comptes_inactifs) ? ` · <b>${nbFr(dp.details.comptes_inactifs)} compte(s) sans connexion depuis 3 ans</b> à prévenir puis anonymiser` : ''}</p>` : '<p>Pas encore lancée.</p>'}
      <button type="button" class="btn btn-s" id="purger">Lancer la purge maintenant</button>`)}</div>
    <div class="ctl-2">${carte(`Administrateurs · ${eq.admins.length}`, `<div class="ctl-liste">${eq.admins.map(x => `<div class="ctl-ligne"><span><b>${esc(x.nom || '—')}</b><small>${esc(x.email || '')}</small></span></div>`).join('')}</div>
      <p class="petit muted">Le rôle d’administrateur se donne seulement dans Supabase, à la demande du propriétaire.</p>`)}
      ${carte(`Modérateurs · ${eq.moderateurs.length}`, eq.moderateurs.length ? `<div class="ctl-liste">${eq.moderateurs.map(x => `<div class="ctl-ligne"><span><b>${esc(x.nom || '—')}</b><small>${esc(x.email || '')}</small></span><span class="tag info">${esc(x.univers)}</span></div>`).join('')}</div>`
        : '<p class="muted">Aucun. On les nomme dans Applications.</p>')}</div>
    ${carte(`Comptes suspendus · ${eq.suspendus.length}`, eq.suspendus.length ? `<div class="ctl-liste">${eq.suspendus.map(x => `<div class="ctl-ligne"><span><b>${esc(x.nom || '—')}</b><small>${esc(x.email || '')} · depuis ${esc(jourCourt(x.depuis))} · ${esc(x.motif)}${x.details?.connexion_bloquee === false ? ' · connexion à bloquer dans Supabase' : ''}</small></span>
      <button type="button" class="btn btn-s" data-retablir="${x.id}">Rétablir</button></div>`).join('')}</div>` : '<p class="muted">Aucun. On suspend un compte depuis Utilisateurs.</p>')}
    ${carte(`Comptes supprimés · ${sup.length}`, `<p class="petit muted">Anonymisés à la demande de leur titulaire. Ne supprimez jamais un utilisateur dans Supabase : la cascade effacerait aussi son historique.</p>
      ${sup.length ? `<div class="ctl-liste">${sup.map(x => `<div class="ctl-ligne"><span><b>Compte ${esc(x.user_id.slice(0, 8))}</b><small>Demandée ${esc(jourHeure(x.demandee_at))}${x.faite_at ? ' · faite ' + esc(jourHeure(x.faite_at)) : ''}${x.motif ? ' · ' + esc(x.motif) : ''}</small></span>
        ${x.statut === 'a_finaliser' ? `<button type="button" class="btn btn-s btn-p" data-finaliser="${x.user_id}">Effacer ses identifiants</button>` : tag(['ok', 'Faite'])}</div>`).join('')}</div>` : '<p class="muted">Aucun.</p>'}`)}
    ${carte('Journal de l’administration', journal.length ? `<div class="ctl-journal">${journal.map(x => ligneJournal(x, noms)).join('')}</div>` : '<p class="muted">Vide pour l’instant.</p>')}`));
  $('#app').onclick = async e => {
    const t = e.target;
    try {
      if (t.closest('#purger')) { const r = await q(sb.rpc('purger_donnees', { forcer: true })); toast(`Purge faite : ${nbFr(r.notifications)} notifications, ${nbFr(r.assistance)} demandes, ${nbFr(r.signalements)} signalements.`); APP.pages.securite(); }
      const r = t.closest('[data-retablir]'); if (r && confirm('Rétablir ce compte ?')) { await q(sb.rpc('retablir_compte', { cible: r.dataset.retablir })); toast('Compte rétabli.'); APP.pages.securite(); }
      const f = t.closest('[data-finaliser]'); if (f) { f.disabled = true; await q(sb.rpc('finaliser_suppression', { cible: f.dataset.finaliser })); toast('Identifiants effacés.'); APP.pages.securite(); }
      if (t.closest('#activer2')) activerDouble();
    } catch (err) { toast(erreur(err), true); }
  };
};
// enregistrer une application d'authentification : QR code, puis un premier code pour confirmer
async function activerDouble() {
  const z = $('#zone2'); if (!z) return;
  try {
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ILO CONTROL ' + new Date().toISOString().slice(0, 10) }); if (error) throw error;
    z.innerHTML = `<div class="ctl-qr"><img src="${esc(data.totp.qr_code)}" alt="QR code à scanner avec votre application d’authentification" width="180" height="180">
      <p class="petit">Scannez ce QR code avec votre application, ou tapez la clé : <code>${esc(data.totp.secret)}</code></p>
      <form class="f" id="fCode2"><label>Code affiché<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label><button class="btn btn-p">Confirmer</button></form></div>`;
    $('#fCode2').addEventListener('submit', async e => {
      e.preventDefault();
      const r = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: e.target.code.value.trim() });
      if (r.error) return toast('Code incorrect : réessayez avec le code affiché maintenant.', true);
      auth2 = (await sb.auth.mfa.getAuthenticatorAssuranceLevel()).data; toast('Double authentification activée.'); APP.pages.securite();
    });
  } catch (err) { z.innerHTML = `<p class="petit" style="color:var(--erreur)">Impossible pour l’instant : ${esc(erreur(err))}. Vérifiez dans Supabase › Authentication que la double authentification (TOTP) est permise.</p>`; }
}

document.addEventListener('DOMContentLoaded', demarrer);
