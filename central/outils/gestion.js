/* =====================================================================
   GESTION DES RENDEZ-VOUS — lit et modifie le Google Sheet via le script Google
   (CONFIG.endpoint dans data.js, code secret = REGLAGES.CLE_GESTION dans le script)
   ===================================================================== */
const frDay = s => parseISO(s).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const frLong = s => parseISO(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const mondayOf = s => { const d = parseISO(s); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return iso(d); };

const STATUTS = ['Nouveau', 'Confirmé', 'En diagnostic', 'En réparation', 'Prêt à récupérer', 'Terminé', 'Devis envoyé', 'Devis accepté', 'Annulé'];
const CLASSE = { 'Nouveau': 'new', 'Confirmé': 'ok', 'En diagnostic': 'work', 'En réparation': 'work', 'Prêt à récupérer': 'ready', 'Terminé': 'done', 'Devis envoyé': 'quote', 'Devis accepté': 'quote', 'Annulé': 'off' };
const SLOTS = { matin: 'Matin', aprem: 'Après-midi', samedi: 'Samedi matin' };

let cle = '';
try { cle = localStorage.getItem('itGestionCle') || ''; } catch (e) {}
let demandes = [], vue = 'traiter', semaine = mondayOf(todayISO()), filtreAgence = '', recherche = '', chargement = false, erreur = '';

/* ---------- Appels au script Google ---------- */
async function api(op, payload = {}) {
  const res = await fetch(CONFIG.endpoint, { method: 'POST', body: JSON.stringify({ action: 'gestion', op, cle, ...payload }) });
  const j = await res.json();
  if (!j.ok) throw new Error(j.reason || 'erreur');
  return j;
}
async function charger() {
  chargement = true; erreur = ''; render();
  try { demandes = (await api('liste')).demandes || []; }
  catch (e) {
    if (e.message === 'bloque') erreur = 'Trop d’essais : accès bloqué 15 minutes.';
    else if (e.message === 'cle') { erreur = 'Code incorrect.'; cle = ''; try { localStorage.removeItem('itGestionCle'); } catch (x) {} }
    else erreur = 'Impossible de joindre le script Google. Vérifiez votre connexion et l’adresse CONFIG.endpoint.';
  }
  chargement = false; render();
}
async function action(op, payload, message) {
  try { await api(op, payload); toast(message); $('fiche').close(); await charger(); }
  catch (e) { toast('Erreur : ' + (e.message === 'cle' ? 'code incorrect' : 'action non enregistrée'), true); }
}

/* ---------- Actions ---------- */
function login(ev) {
  ev.preventDefault();
  cle = $('cle').value.trim();
  try { localStorage.setItem('itGestionCle', cle); } catch (e) {}
  charger();
}
function logout() { cle = ''; demandes = []; try { localStorage.removeItem('itGestionCle'); } catch (e) {} render(); }
function setVue(v) { vue = v; render(); }
function setSemaine(n) { semaine = n === 0 ? mondayOf(todayISO()) : addDays(semaine, 7 * n); render(); }
const confirmer = ref => action('statut', { ref, statut: 'Confirmé', notifier: true }, 'Rendez-vous confirmé, client prévenu par email.');
function changerStatut(ref) {
  const statut = $('fStatut').value;
  if (statut === 'Annulé' && !confirm('Annuler ce rendez-vous ? Le créneau sera libéré.')) return;
  action('statut', { ref, statut, notifier: $('fNotif').checked }, `Statut : ${statut}.`);
}
function planifier(ref) {
  const date = $('fDate').value, creneau = $('fCreneau').value, agence = $('fAgence').value;
  if (!date) return toast('Choisissez une date.', true);
  if (parseISO(date).getDay() === 6 && creneau !== 'samedi') return toast('Le samedi, seul le créneau « Samedi matin » est possible.', true);
  if (parseISO(date).getDay() !== 6 && creneau === 'samedi') return toast('« Samedi matin » uniquement un samedi.', true);
  action('planifier', { ref, date, creneau, agence, notifier: $('fNotif').checked }, 'Rendez-vous placé dans le planning.');
}
function ajouter(ev) {
  ev.preventDefault();
  const f = ev.target, v = n => f.elements[n].value.trim();
  const payload = { nom: v('nom'), tel: v('tel'), email: v('email'), agence: v('agence'), date: v('date'), creneau: v('creneau'),
                    services: v('services'), lieu: v('lieu'), desc: v('desc'), notifier: f.elements.notifier.checked };
  if (!payload.nom || digits(payload.tel).length < 10) return toast('Nom et téléphone obligatoires.', true);
  action('ajouter', payload, 'Rendez-vous ajouté.').then(() => { vue = 'planning'; if (payload.date) semaine = mondayOf(payload.date); render(); });
}

/* ---------- Rendu ---------- */
const filtres = list => list.filter(d =>
  (!filtreAgence || d.agence === filtreAgence) &&
  (!recherche || [d.ref, d.nom, d.tel, d.services, d.lieu, d.email].join(' ').toLowerCase().includes(recherche.toLowerCase())));
const badge = s => `<span class="g-badge g-${CLASSE[s] || 'new'}">${esc(s || '—')}</span>`;
const quand = d => d.date ? `${frDay(d.date)} · ${SLOTS[d.creneau] || d.creneauLabel || ''}` : (d.demande === 'Devis' ? 'Devis (sans date)' : 'À placer');

function carte(d) {
  return `<article class="g-card g-ag-${esc(d.agence || 'ducos')}" data-clic="ouvrir" data-a="${esc(d.ref)}" tabindex="0" data-keydown="ouvrirEntree" data-a="${esc(d.ref)}">
    <div class="g-card-top">${badge(d.statut)}<span class="mono g-ref">${esc(d.ref)}</span></div>
    <b>${esc(d.nom)}</b><span class="g-when">${esc(quand(d))} · ${esc(d.agenceNom || '')}</span>
    <span class="g-svc">${esc(d.services || '')}</span>
    <div class="g-card-act" data-clic="stop">
      ${d.statut === 'Nouveau' && d.date ? `<button class="btn btn-primary btn-sm" data-clic="confirmer" data-a="${esc(d.ref)}">✓ Confirmer</button>` : ''}
      ${!d.date ? `<button class="btn btn-primary btn-sm" data-clic="ouvrir" data-a="${esc(d.ref)}">Placer</button>` : ''}
      <a class="btn btn-sm" href="tel:+${intl(d.tel)}">Appeler</a>
      <a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="https://wa.me/${intl(d.tel)}">WhatsApp</a>
    </div></article>`;
}

/* ---------- Statistiques du site (30 derniers jours) ---------- */
let stats = null;
const EVTS = { visite: 'Visites', vue: 'Pages vues', pole: 'Pôles ouverts', service: 'Services choisis', pack: 'Formules choisies', symptome: 'Problèmes décrits',
  etape: 'Réservations commencées', demande: 'Demandes envoyées', whatsapp: 'Clics WhatsApp', appel: 'Clics téléphone', aide: 'Aide ouverte' };
async function chargerStats() {
  try { stats = await api('stats'); } catch (e) { stats = { erreur: true }; }
  render();
}
function vueStats() {
  if (!stats) { chargerStats(); return '<p class="muted">Chargement des statistiques…</p>'; }
  if (stats.erreur) return '<p class="notice">Statistiques indisponibles : le moteur Google doit être à jour (nouvelle version du script).</p>';
  const t = stats.total || {}, nb = k => t[k] || 0;
  const taux = nb('visite') ? Math.round(nb('demande') / nb('visite') * 1000) / 10 : 0;
  const nomOf = id => (typeof svc === 'function' && svc(id)?.nom) || (PACKS.find(p => p.id === id)?.nom) || id;
  const tableau = (titre, rows, fmt = x => esc(x)) => `<div class="g-stat-bloc"><h3>${titre}</h3>${rows.length
    ? `<table class="admin-table">${rows.map(([k, v]) => `<tr><td>${fmt(k)}</td><td class="mono">${v}</td></tr>`).join('')}</table>` : '<p class="muted">Pas encore de données.</p>'}</div>`;
  const cols = ['visite', 'vue', 'etape', 'demande', 'whatsapp', 'appel'];
  return `<h2>Statistiques du site — 30 derniers jours</h2>
    <div class="g-stats g-stats-big">
      <span><b>${nb('visite')}</b> visites</span><span><b>${nb('vue')}</b> pages vues</span><span><b>${nb('demande')}</b> demandes envoyées</span>
      <span><b>${taux} %</b> des visites deviennent une demande</span><span><b>${nb('whatsapp')}</b> clics WhatsApp</span><span><b>${nb('appel')}</b> appels</span></div>
    <div class="actions left"><button type="button" class="btn btn-sm" data-clic="exporterStats">Télécharger (CSV / Excel)</button>
      <button type="button" class="btn btn-sm" data-clic="statsNul">↻ Actualiser</button>
      <span class="muted small">Le détail de chaque visite est dans l’onglet « Visites » du tableau Google, et les calculs dans l’onglet « Statistiques ».</span></div>
    <div class="g-stat-grid">
      ${tableau('Services les plus choisis', stats.services, nomOf)}
      ${tableau('D’où viennent les visiteurs', stats.sources)}
      ${tableau('Formules choisies', stats.packs, nomOf)}
      ${tableau('Appareils', stats.appareils)}
      ${tableau('Pages vues', stats.pages)}
    </div>
    <h3>Jour par jour</h3>
    <div class="tablewrap"><table class="admin-table"><thead><tr><th>Jour</th>${cols.map(c => `<th>${EVTS[c]}</th>`).join('')}</tr></thead><tbody>
      ${stats.jours.map(j => `<tr><td>${frDay(j.jour)}</td>${cols.map(c => `<td class="mono">${j[c] || 0}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length + 1}" class="muted">Pas encore de visites enregistrées.</td></tr>`}
    </tbody></table></div>`;
}
function exporterStats() {
  const cols = Object.keys(EVTS);
  const rows = [['Jour', ...cols.map(c => EVTS[c])], ...stats.jours.map(j => [j.jour, ...cols.map(c => j[c] || 0)])];
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `statistiques-ilotech-${todayISO()}.csv`;
  a.click();
}

function vueTraiter() {
  const list = filtres(demandes).filter(d => d.statut === 'Nouveau' || (!d.date && !['Annulé', 'Terminé'].includes(d.statut)));
  list.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
  const encours = filtres(demandes).filter(d => ['En diagnostic', 'En réparation', 'Prêt à récupérer'].includes(d.statut));
  return `<h2>À confirmer ou à placer (${list.length})</h2>
    ${list.length ? `<div class="g-cards">${list.map(carte).join('')}</div>` : '<p class="muted">Rien à traiter. 👍</p>'}
    <h2>En atelier (${encours.length})</h2>
    ${encours.length ? `<div class="g-cards">${encours.map(carte).join('')}</div>` : '<p class="muted">Aucun matériel en cours.</p>'}`;
}

function vuePlanning() {
  const jours = [0, 1, 2, 3, 4, 5].map(i => addDays(semaine, i));
  const rows = [['matin', 'Matin'], ['aprem', 'Après-midi']];
  const actifs = filtres(demandes).filter(d => d.date && d.statut !== 'Annulé');
  const cell = (jour, slot) => actifs.filter(d => d.date === jour && (d.creneau === slot || (slot === 'matin' && d.creneau === 'samedi')))
    .map(d => `<button class="g-chip g-ag-${esc(d.agence || 'ducos')} g-c-${CLASSE[d.statut] || 'new'}" data-clic="ouvrir" data-a="${esc(d.ref)}" title="${esc(d.services)}">
      <b>${esc(d.nom)}</b><small>${esc(d.statut)} · ${esc(d.agenceNom || '')}</small></button>`).join('');
  return `<div class="g-week-head">
      <button class="btn btn-sm" data-clic="setSemaine" data-a="-1">‹ Semaine précédente</button>
      <b>Semaine du ${frLong(semaine)}</b>
      <button class="btn btn-sm" data-clic="setSemaine" data-a="0">Cette semaine</button>
      <button class="btn btn-sm" data-clic="setSemaine" data-a="1">Semaine suivante ›</button>
      <span class="g-legend"><i class="g-dot g-ag-ducos"></i>Ducos <i class="g-dot g-ag-robert"></i>Le Robert</span></div>
    <div class="g-week">
      <div></div>${jours.map(j => `<div class="g-day ${j === todayISO() ? 'today' : ''}">${esc(frDay(j))}</div>`).join('')}
      ${rows.map(([k, l]) => `<div class="g-slot">${l}</div>${jours.map(j => `<div class="g-cell">${parseISO(j).getDay() === 6 && k === 'aprem' ? '<span class="muted small">fermé</span>' : cell(j, k)}</div>`).join('')}`).join('')}
    </div>`;
}

function vueToutes() {
  const list = filtres(demandes);
  return `<h2>Toutes les demandes (${list.length})</h2>
    <div class="tablewrap"><table class="admin-table g-table"><thead><tr><th>Statut</th><th>Rendez-vous</th><th>Client</th><th>Services</th><th>Agence</th><th>Estimation</th><th>Reçue</th></tr></thead><tbody>
    ${list.map(d => `<tr data-clic="ouvrir" data-a="${esc(d.ref)}"><td>${badge(d.statut)}</td><td>${esc(quand(d))}</td><td><b>${esc(d.nom)}</b><br><span class="muted">${esc(d.tel)}</span></td>
      <td>${esc(d.services)}</td><td>${esc(d.agenceNom)}</td><td class="mono">${d.min ? eur(d.min) + (d.max && d.max != d.min ? ' – ' + eur(d.max) : '') : '—'}</td>
      <td class="muted">${d.recue ? new Date(d.recue).toLocaleDateString('fr-FR') : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">Aucune demande.</td></tr>'}
    </tbody></table></div>`;
}

function vueAjouter() {
  const options = (o, sel) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  return `<h2>Ajouter un rendez-vous (pris par téléphone ou en agence)</h2>
    <form class="form g-form" data-submit="ajouter">
      <div class="field"><label>Nom du client *</label><input name="nom" required></div>
      <div class="field"><label>Téléphone *</label><input name="tel" type="tel" required placeholder="0696 00 00 00"></div>
      <div class="field"><label>Email <span class="muted">(pour la confirmation)</span></label><input name="email" type="email"></div>
      <div class="field"><label>Agence</label><select name="agence">${options(Object.fromEntries(Object.entries(AGENCES).map(([k, a]) => [k, a.nom])))}</select></div>
      <div class="field"><label>Date</label><input name="date" type="date" min="${todayISO()}"></div>
      <div class="field"><label>Créneau</label><select name="creneau">${options(SLOTS)}</select></div>
      <div class="field full"><label>Prestation</label><input name="services" placeholder="Ex : Dépannage PC — Windows ne démarre plus"></div>
      <div class="field full"><label>Lieu</label><input name="lieu" placeholder="Chez le client — commune, adresse / En agence / À distance"></div>
      <div class="field full"><label>Notes</label><textarea name="desc"></textarea></div>
      <label class="check full"><input type="checkbox" name="notifier" checked><span>Envoyer la confirmation au client par email</span></label>
      <div class="full"><button class="btn btn-primary" type="submit">Ajouter au planning</button></div>
    </form>`;
}

function ouvrir(ref) {
  const d = demandes.find(x => x.ref === ref);
  if (!d) return;
  const options = (o, sel) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  $('fiche').innerHTML = `<div class="dialog-head"><h2 id="ficheTitre">${esc(d.nom)} ${badge(d.statut)}</h2><button class="btn" data-clic="fermerFiche">Fermer</button></div>
    <p class="mono muted">${esc(d.ref)} · ${esc(d.demande)} · reçue le ${d.recue ? new Date(d.recue).toLocaleString('fr-FR') : '—'}</p>
    <div class="g-info">
      <div><span>Rendez-vous</span><b>${esc(d.date ? `${frLong(d.date)}, ${SLOTS[d.creneau] || d.creneauLabel}` : 'Pas encore placé')}</b></div>
      <div><span>Agence</span><b>${esc(d.agenceNom)}</b></div>
      <div><span>Téléphone</span><b><a href="tel:+${intl(d.tel)}">${esc(d.tel)}</a></b></div>
      <div><span>Email</span><b>${d.email ? `<a href="mailto:${esc(d.email)}">${esc(d.email)}</a>` : '—'}</b></div>
      <div class="full"><span>Prestations</span><b>${esc(d.services)}</b>${d.options ? `<small>${esc(d.options)}</small>` : ''}</div>
      <div class="full"><span>Lieu</span><b>${esc(d.lieu || '—')}</b></div>
      ${d.appareil ? `<div><span>Appareil</span><b>${esc(d.appareil)}</b></div>` : ''}
      ${d.min ? `<div><span>Estimation</span><b class="mono">${eur(d.min)}${d.max && d.max != d.min ? ' – ' + eur(d.max) : ''}</b></div>` : ''}
      ${d.etudiant ? `<div><span>Étudiant</span><b>${esc(d.etudiant)}</b></div>` : ''}
      ${d.desc ? `<div class="full"><span>Description du client</span><b class="g-desc">${esc(d.desc)}</b></div>` : ''}
      ${d.photo ? `<div class="full"><span>Photo</span><b><a href="${esc(d.photo)}" target="_blank" rel="noopener">Voir la photo</a></b></div>` : ''}
    </div>
    <div class="g-actions">
      <section><h3>Changer le statut</h3>
        <select id="fStatut">${STATUTS.map(s => `<option ${s === d.statut ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <button class="btn btn-primary" data-clic="changerStatut" data-a="${esc(d.ref)}">Enregistrer</button></section>
      <section><h3>${d.date ? 'Déplacer' : 'Placer'} le rendez-vous</h3>
        <div class="g-row"><input id="fDate" type="date" value="${esc(d.date || '')}">
        <select id="fCreneau">${options(SLOTS, d.creneau || 'matin')}</select>
        <select id="fAgence">${options(Object.fromEntries(Object.entries(AGENCES).map(([k, a]) => [k, a.nom])), d.agence)}</select></div>
        <button class="btn btn-primary" data-clic="planifier" data-a="${esc(d.ref)}">${d.date ? 'Déplacer' : 'Placer dans le planning'}</button></section>
    </div>
    <label class="check"><input type="checkbox" id="fNotif" checked><span>Prévenir le client par email</span></label>
    <div class="actions left">
      <a class="btn" href="tel:+${intl(d.tel)}">Appeler</a>
      <a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${intl(d.tel)}?text=${encodeURIComponent(`Bonjour ${d.nom}, IloTech au sujet de votre demande ${d.ref} :`)}">WhatsApp</a>
      ${d.statut !== 'Annulé' ? `<button class="btn g-danger" data-clic="annulerRdv" data-a="${esc(d.ref)}">Annuler le rendez-vous</button>` : ''}
    </div>`;
  $('fiche').showModal();
}

function render() {
  $('logout').hidden = !cle;
  if (!CONFIG.endpoint) {
    $('g').innerHTML = `<div class="doc"><h1>Gestion des rendez-vous</h1><p class="notice">La réception Google n'est pas encore activée. Installez le moteur Google (README.txt, partie « INSTALLER LE MOTEUR GOOGLE ») puis renseignez son adresse dans <code>CONFIG.endpoint</code> (data.js).</p></div>`;
    return;
  }
  if (!cle) {
    $('g').innerHTML = `<form class="doc g-login" data-submit="login"><h1>Gestion des rendez-vous</h1>
      <p class="muted">Entrez le code de gestion (réglage CLE_GESTION du script Google).</p>
      ${erreur ? `<p class="notice">${esc(erreur)}</p>` : ''}
      <div class="g-row"><input id="cle" type="password" autocomplete="current-password" required placeholder="Code de gestion"><button class="btn btn-primary">Entrer</button></div></form>`;
    return;
  }
  const actifs = demandes.filter(d => d.statut !== 'Annulé');
  const n = {
    traiter: demandes.filter(d => d.statut === 'Nouveau' || (!d.date && !['Annulé', 'Terminé'].includes(d.statut))).length,
    jour: actifs.filter(d => d.date === todayISO()).length,
    semaine: actifs.filter(d => d.date >= mondayOf(todayISO()) && d.date <= addDays(mondayOf(todayISO()), 6)).length
  };
  const tabs = [['traiter', `À traiter <em>${n.traiter}</em>`], ['planning', 'Planning'], ['toutes', 'Toutes les demandes'], ['ajouter', '+ RDV téléphone'], ['stats', 'Statistiques']];
  $('g').innerHTML = `
    <div class="g-bar">
      <div class="g-stats"><span><b>${n.traiter}</b> à traiter</span><span><b>${n.jour}</b> aujourd'hui</span><span><b>${n.semaine}</b> cette semaine</span></div>
      <div class="g-filters">
        <select data-change="filtreAgenceG" aria-label="Agence"><option value="">Toutes les agences</option>${Object.entries(AGENCES).map(([k, a]) => `<option value="${k}" ${filtreAgence === k ? 'selected' : ''}>${esc(a.nom)}</option>`).join('')}</select>
        <input type="search" placeholder="Rechercher (nom, téléphone, réf.)" value="${esc(recherche)}" data-input="rechercheG" aria-label="Rechercher">
        <button class="btn btn-sm" data-clic="charger" ${chargement ? 'disabled' : ''}>${chargement ? 'Chargement…' : '↻ Actualiser'}</button>
      </div>
    </div>
    ${erreur ? `<p class="notice">${esc(erreur)}</p>` : ''}
    <nav class="g-tabs">${tabs.map(([k, l]) => `<button class="${vue === k ? 'on' : ''}" data-clic="setVue" data-a="${k}">${l}</button>`).join('')}</nav>
    <section class="g-view">${{ traiter: vueTraiter, planning: vuePlanning, toutes: vueToutes, ajouter: vueAjouter, stats: vueStats }[vue]()}</section>`;
  const s = document.querySelector('.g-filters input[type=search]');
  if (s && document.activeElement === document.body && recherche) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
}

function toast(msg, bad) {
  const t = document.createElement('div');
  t.className = 'g-toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

render();
if (cle && CONFIG.endpoint) charger();
setInterval(() => { if (cle && CONFIG.endpoint && !document.querySelector('dialog[open]')) charger(); }, 120000);

/* ---------- Actions de la page (écouteurs délégués : la CSP interdit les gestionnaires en ligne) ---------- */
(() => {
  const ACTIONS = {
    clic: {
      ouvrir: (e, v, a) => ouvrir(a), planifier: (e, v, a) => planifier(a), confirmer: (e, v, a) => confirmer(a), changerStatut: (e, v, a) => changerStatut(a),
      annulerRdv: (e, v, a) => { $('fStatut').value = 'Annulé'; changerStatut(a); },
      setVue: (e, v, a) => setVue(a), setSemaine: (e, v, a) => setSemaine(+a),
      statsNul: () => { stats = null; render(); },
      exporterStats: () => exporterStats(), charger: () => charger(), fermerFiche: () => $('fiche').close(),
      stop: () => 'stop',
    },
    change: { filtreAgenceG: e => { filtreAgence = e.value; render(); } },
    input: { rechercheG: e => { recherche = e.value; clearTimeout(window._t); window._t = setTimeout(render, 250); } },
    submit: { login: (e, v) => login(v), ajouter: (e, v) => ajouter(v) },
    keydown: { ouvrirEntree: (e, v, a) => { if (v.key === 'Enter') ouvrir(a); } },
  };
  ['clic:click', 'change:change', 'input:input', 'submit:submit', 'keydown:keydown'].forEach(s => {
    const [nom, evt] = s.split(':');
    document.addEventListener(evt, ev => {
      for (let el = ev.target.closest ? ev.target.closest('[data-' + nom + ']') : null; el; el = el.parentElement && el.parentElement.closest('[data-' + nom + ']')) {
        const f = ACTIONS[nom][el.dataset[nom]];
        if (f && f(el, ev, el.dataset.a) === 'stop') break;
      }
    });
  });
})();
