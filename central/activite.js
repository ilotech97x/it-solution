/* ILO Central — « Activité » (27/11/2026) : tous les devis, factures, paiements, rendez-vous, demandes, commandes, réservations et billets de
   l'écosystème dans un seul fil, en lecture seule, réservé à l'administrateur. Base : commun/central_activite.sql (central_activite : tout est
   calculé et filtré en SQL ; ici on affiche). Si la fonction n'est pas encore en base, l'entrée du menu reste cachée (sonder) et l'adresse
   #/activite montre le message d'installation. Chargé après control.js : en partage la portée (page, vue, esc, q, sb…) ; tout est dans une IIFE. */
window.ACTIVITE = (() => {
  const CLE = 'ctlActiviteFiltres', PAS = 30, AUTO_MS = 60000, FUSEAU = 'America/Martinique';
  // type de la base → [étiquette, famille de filtre, icône SVG (tracé 24×24)]
  const TYPES = {
    devis_signe: ['Devis signé', 'devis', 'M5 13l4 4L19 7'], devis_envoye: ['Devis envoyé', 'devis', 'M4 6h16v12H4zM4 7l8 6 8-6'],
    facture: ['Facture', 'factures', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6'], avoir: ['Avoir', 'factures', 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 10h6'],
    paiement: ['Paiement', 'paiements', 'M3 7h18v10H3zM3 11h18M7 15h3'], rdv: ['Rendez-vous', 'rdv', 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4'],
    demande: ['Demande', 'demandes', 'M4 5h16v11H9l-5 4z'], commande: ['Commande', 'commandes', 'M5 7h14l-1 12H6zM9 7a3 3 0 0 1 6 0'],
    reservation: ['Réservation', 'reservations', 'M3 11l9-7 9 7v9H3zM10 20v-6h4v6'], billet: ['Billet', 'billets', 'M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z']
  };
  const FAMILLES = [['', 'Tout'], ['devis', 'Devis'], ['factures', 'Factures'], ['paiements', 'Paiements'], ['rdv', 'Rendez-vous'], ['demandes', 'Demandes'],
    ['commandes', 'Commandes'], ['reservations', 'Réservations'], ['billets', 'Billets']];
  const STATUTS = [['', 'Tous les statuts'], ['envoye', 'Devis en attente'], ['signe', 'Devis signés'], ['retard', 'Factures en retard'], ['payee', 'Factures payées'],
    ['a_verifier', 'Paiements à vérifier'], ['recu', 'Paiements encaissés'], ['prevu', 'Rendez-vous prévus'], ['nouvelle', 'Nouvelles demandes'], ['demande', 'Réservations à traiter']];
  const JOURS = [7, 30, 90, 365];
  let dispo = null;   // null : pas encore sondé ; true / false : la fonction est (ou non) en base
  let dernApplis = '', etat = { jours: 30, famille: '', appli: '', statut: '' }, lignes = [], total = 0, derniere = null, minuteur = null, enCours = false;
  try { Object.assign(etat, JSON.parse(sessionStorage.getItem(CLE) || '{}')); } catch (e) { /* stockage indisponible : filtres par défaut */ }
  const sauver = () => { try { sessionStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* sans importance */ } };

  const aeur = n => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number(n || 0) % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const aJour = d => new Date(d).toLocaleDateString('fr-CA', { timeZone: FUSEAU });
  const aTitreJour = d => {
    const j = aJour(d), auj = aJour(Date.now()), dem = aJour(Date.now() + 864e5), hier = aJour(Date.now() - 864e5);
    const t = fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }, FUSEAU);
    return j === auj ? 'Aujourd’hui' : j === dem ? 'Demain' : j === hier ? 'Hier' : t.charAt(0).toUpperCase() + t.slice(1);
  };
  const aHeure = d => fmt(d, { hour: '2-digit', minute: '2-digit' }, FUSEAU);
  // l'erreur « fonction absente » : 42883 (Postgres) ou PGRST202 (PostgREST) ; tout autre échec n'est pas une absence
  const absente = e => /42883|PGRST202|Could not find the function|does not exist/i.test((e?.code || '') + ' ' + (e?.message || ''));

  // écran d'origine de chaque ligne : gestion privée d'ILO Central (entreprise retenue par data-nxorg), assistant, ou l'appli concernée
  const lien = x => {
    const id = encodeURIComponent(x.ref_id || '');
    switch (x.cible) {
      case 'nx_devis': return `./gestion/#/devis/${id}`;
      case 'nx_facture': return `./gestion/#/factures/${id}`;
      case 'assistant': return '#/assistant';
      case 'woulib': return '../woulib/';
      case 'tropik': return '../tropik/';
      case 'eventpass': return `../pass/#/evenement/${id}`;
      case 'kaz': return `https://immo.ilo-tech.com/#/logement/${id}`;
      default: return '#/activite';
    }
  };
  const ligne = x => {
    const t = TYPES[x.type] || [x.type, '', 'M5 12h14'], neg = x.type === 'avoir';
    const titre = [x.ref, x.libelle].filter(Boolean).map(esc).join(' · ');
    const meta = [x.client, x.entreprise && x.entreprise !== x.appli ? x.entreprise : null, x.appli].filter(Boolean).map(esc).join(' · ');
    const externe = /^https?:/.test(lien(x));
    return `<a class="act-ligne act-${esc(x.ton)}" href="${esc(lien(x))}"${x.org_id ? ` data-nxorg="${esc(x.org_id)}"` : ''}${externe ? ' rel="noopener"' : ''} data-type="${esc(x.type)}">
      <span class="act-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${t[2]}"/></svg></span>
      <span class="act-corps"><b>${esc(t[0])}${titre ? ` <span class="act-ref">${titre}</span>` : ''}</b><small>${meta} · ${esc(aHeure(x.quand))}</small></span>
      <span class="act-droite">${x.montant != null ? `<b class="act-montant${neg ? ' neg' : ''}">${esc(aeur(x.montant))}</b>` : ''}<span class="tag ${esc(x.ton)}">${esc(x.statut_lib)}</span></span></a>`;
  };
  const listeHtml = () => {
    if (!lignes.length) return `<div class="vide-etat"><h3>Rien sur cette période</h3><p class="muted">Aucun devis, facture, rendez-vous ni commande ne correspond à ces filtres. Élargissez la période ou choisissez « Tout ».</p></div>`;
    let jour = '', h = '';
    for (const x of lignes) {
      const j = aJour(x.quand);
      if (j !== jour) { if (jour) h += '</div>'; jour = j; h += `<h3 class="act-jour">${esc(aTitreJour(x.quand))}</h3><div class="liste-g act-groupe">`; }
      h += ligne(x);
    }
    return h + '</div>' + (lignes.length < total ? `<div class="actions act-suite"><button type="button" class="btn" id="actPlus">Voir plus (${nbFr(total - lignes.length)} restants)</button></div>` : '');
  };
  const carteKpi = (titre, v, s, ton = '') => `<div class="ctl-kpi act-kpi ${ton}"><span>${titre}</span><b>${v}</b><small>${s}</small></div>`;
  const kpisHtml = t => `<div class="ctl-kpis act-kpis" id="actKpis">
      ${carteKpi('CA facturé', aeur(t.ca_facture), 'factures moins avoirs, entreprises internes')}${carteKpi('Encaissé', aeur(t.encaisse), 'paiements reçus')}
      ${carteKpi('Devis en attente', nbFr(t.devis_attente_nb), `${aeur(t.devis_attente_montant)} à transformer`, t.devis_attente_nb ? 'att' : '')}
      ${carteKpi('Devis signés', nbFr(t.devis_signes_nb), `${aeur(t.devis_signes_montant)} confirmés`)}
      ${carteKpi('Rendez-vous à venir', nbFr(t.rdv_a_venir), 'prévus dans l’agenda')}${carteKpi('Ventes des applis', aeur(t.ventes_applis), 'commandes, réservations, billets')}</div>`;
  const filtresHtml = applis => `<div class="act-filtres" id="actFiltres">
      <div class="puces" role="group" aria-label="Période">${JOURS.map(j => `<button type="button" data-jours="${j}" aria-pressed="${etat.jours === j}">${j === 365 ? '1 an' : j + ' jours'}</button>`).join('')}</div>
      <div class="puces" role="group" aria-label="Type">${FAMILLES.map(([k, t]) => `<button type="button" data-famille="${k}" aria-pressed="${etat.famille === k}">${t}</button>`).join('')}</div>
      <div class="puces" role="group" aria-label="Entreprise ou appli"><button type="button" data-appli="" aria-pressed="${etat.appli === ''}">Toutes les applis</button>
        ${applis.map(a => `<button type="button" data-appli="${esc(a)}" aria-pressed="${etat.appli === a}">${esc(a)}</button>`).join('')}</div>
      <label class="act-statut">Statut<select id="actStatut">${STATUTS.map(([k, t]) => `<option value="${k}"${etat.statut === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>`;

  const types = () => etat.famille ? Object.keys(TYPES).filter(k => TYPES[k][1] === etat.famille) : null;
  const appeler = (decalage, limite) => {
    const j = new Date(Date.now() - (etat.jours - 1) * 864e5).toLocaleDateString('fr-CA', { timeZone: FUSEAU });
    return q(sb.rpc('central_activite', { p_depuis: j, p_jusqu: null, p_types: types(), p_appli: etat.appli || null, p_statut: etat.statut || null, p_limite: limite, p_decalage: decalage }));
  };
  // recharge ce qui est affiché (au moins une page, au plus tout ce qui était déjà chargé) sans toucher à la page : filtres et défilement restent
  const charger = async (garder = false) => {
    const voulu = garder ? Math.max(PAS, lignes.length) : PAS;
    let r = await appeler(0, Math.min(voulu, 100)), l = r.lignes;
    while (l.length < voulu && l.length < r.total) { const s = await appeler(l.length, Math.min(voulu - l.length, 100)); if (!s.lignes.length) break; l = l.concat(s.lignes); }
    lignes = l; total = r.total; derniere = Date.now();
    return r;
  };
  const majEcran = r => {
    const k = $('#actKpis'); if (k) k.outerHTML = kpisHtml(r.totaux);
    const f = $('#actFiltres'), ap = JSON.stringify([r.applis || [], etat]); if (f && ap !== dernApplis) { dernApplis = ap; f.outerHTML = filtresHtml(r.applis || []); }
    const l = $('#actListe'); if (l) l.innerHTML = listeHtml();
    const c = $('#actCompte'); if (c) c.textContent = `${nbFr(lignes.length)} sur ${nbFr(total)} · mis à jour à ${aHeure(derniere)}`;
    const b = $('#actActualiser'); if (b) b.disabled = false;
  };
  const actualiser = async (garder, signal) => {
    if (enCours || !$('#actListe')) return;
    enCours = true; const b = $('#actActualiser'); if (b) b.disabled = true;
    try { majEcran(await charger(garder)); }
    catch (e) { if (!signal) toast(absente(e) ? 'L’activité n’est pas encore installée dans la base.' : erreur(e), true); if (b) b.disabled = false; }
    finally { enCours = false; }
  };
  const armer = () => {
    clearInterval(minuteur);
    minuteur = setInterval(() => { if (!$('#actListe')) return clearInterval(minuteur); if (!document.hidden) actualiser(true, true); }, AUTO_MS);
  };

  // l'entrée du menu n'existe que si la base a la fonction (sondé à la connexion, par control.js)
  const sonder = async () => {
    try { await q(sb.rpc('central_activite_version')); dispo = true; } catch (e) { dispo = false; }
    return dispo;
  };

  APP.pages.activite = async () => {
    if (!garde('activite')) return;
    attente();
    let r;
    try { r = await charger(false); }
    catch (e) {
      if (absente(e)) { dispo = false; return vue(page('Activité', INSTALLER)); }
      return vue(page('Activité', `<div class="vide-etat"><h3>Impossible de charger l’activité</h3><p class="muted">${esc(erreur(e))}</p><button type="button" class="btn btn-p" id="actReessayer">Réessayer</button></div>`));
    }
    dispo = true;
    vue(page('Activité', `<p class="muted act-intro">Tout ce qui se vend et se décide dans l’écosystème, au même endroit : devis, factures, paiements, rendez-vous, demandes, commandes, réservations et billets.</p>
      ${kpisHtml(r.totaux)}${filtresHtml(r.applis || [])}
      <section class="ctl-carte act-carte"><div class="act-haut"><h2>Fil d’activité</h2><span class="petit muted" id="actCompte"></span>
        <button type="button" class="btn btn-s" id="actActualiser">Actualiser</button></div><div id="actListe"></div></section>
      <p class="petit muted">CA facturé et encaissé : entreprises internes de l’écosystème (gestion d’ILO Central). Les ventes des applis sont le volume des places de marché, pas votre chiffre d’affaires.</p>`));
    dernApplis = JSON.stringify([r.applis || [], etat]); majEcran(r); nav(); armer();
    const rafraichir = async () => { lignes = []; total = 0; await actualiser(false); };
    $('#app').onclick = async e => {
      const t = e.target, b = t.closest('button');
      if (t.closest('#actReessayer')) return rendre();
      if (!b) return;
      if (b.id === 'actActualiser') return actualiser(true);
      if (b.id === 'actPlus') {
        b.disabled = true;
        try { const s = await appeler(lignes.length, PAS); lignes = lignes.concat(s.lignes); total = s.total; majEcran({ ...r, totaux: s.totaux, applis: s.applis }); r = { ...r, totaux: s.totaux, applis: s.applis }; }
        catch (er) { toast(erreur(er), true); b.disabled = false; }
        return;
      }
      if (b.dataset.jours) etat.jours = Number(b.dataset.jours);
      else if (b.dataset.famille !== undefined) etat.famille = b.dataset.famille;
      else if (b.dataset.appli !== undefined) etat.appli = b.dataset.appli;
      else return;
      sauver(); await rafraichir();
    };
    $('#app').onchange = async e => { if (e.target.id !== 'actStatut') return; etat.statut = e.target.value; sauver(); lignes = []; total = 0; await actualiser(false); };
  };

  return { sonder, get dispo() { return dispo; } };
})();
