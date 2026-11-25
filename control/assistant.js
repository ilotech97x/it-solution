/* Control Panel — module « Assistant » (24/11/2026) : suivi des demandes des clients (WhatsApp, formulaire, Gmail, espace client NEXORA)
   traitées par l'assistant, validation des devis et factures qu'il prépare (ok / modifier / refuser), journal du jour, réglages.
   Base : commun/assistant.sql (as_suivi, as_decider_ui, as_reglages_lire, as_reglages_enregistrer). Aucun prix ni total n'est calculé ici :
   tout vient de la base. Caché (message d'installation) tant que ces fonctions ne sont pas installées. */
(() => {
  const COLONNES = [['nouvelles', 'Nouvelles'], ['a_valider', 'À valider'], ['devis_envoyes', 'Devis envoyés'], ['rdv', 'Rendez-vous'], ['factures', 'Factures à encaisser']];
  const CANAL = { whatsapp: 'WhatsApp', formulaire: 'Formulaire', gmail: 'Gmail', nexora: 'Espace client', proprietaire: 'Vous' };
  const TYPE = { devis: 'Devis', facture: 'Facture', reponse: 'Réponse', remise: 'Remise' };
  const JOURS = [['lun', 'Lundi'], ['mar', 'Mardi'], ['mer', 'Mercredi'], ['jeu', 'Jeudi'], ['ven', 'Vendredi'], ['sam', 'Samedi'], ['dim', 'Dimanche']];
  const AUTO = [['questions', 'Répondre aux questions simples'], ['rdv', 'Prendre les rendez-vous'], ['rappels', 'Rappeler les rendez-vous la veille'], ['relances', 'Relancer les factures impayées (J+7, J+14)']];
  const EUR2 = n => Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const param = k => new URLSearchParams((location.hash.split('?')[1] || '')).get(k);
  const lienPage = (vue, org) => '#/assistant' + (vue || org ? '?' + [vue ? 'vue=' + vue : '', org ? 'org=' + org : ''].filter(Boolean).join('&') : '');

  const entete = (s, vueCourante, org) => {
    const orgs = s.orgs || [];
    const marque = orgs.length > 1 ? `<label class="petit">Marque <select id="asOrg" aria-label="Filtrer par marque"><option value="">Toutes</option>${orgs.map(o => `<option value="${o.id}"${o.id === org ? ' selected' : ''}>${esc(o.nom)}</option>`).join('')}</select></label>` : '';
    return `<div class="as-barre">${marque}
      <div class="seg" role="group" aria-label="Vue"><a href="${lienPage('', org)}" aria-pressed="${vueCourante === 'suivi'}">Suivi</a><a href="${lienPage('reglages', org)}" aria-pressed="${vueCourante === 'reglages'}">Réglages</a></div>
      ${vueCourante === 'suivi' ? `<a class="btn btn-p btn-s" id="asAValider" href="#asCol-a_valider" aria-label="${s.a_valider_total} à valider">${nbFr(s.a_valider_total)} à valider</a>` : ''}</div>`;
  };

  const carteDemande = d => {
    const a = d.action;
    const lignes = a ? (a.lignes || []).map(l => `<li>${esc(l.designation)} × ${nbFr(l.quantite)} <span>${EUR2(l.prix_ttc)}</span></li>`).join('') : '';
    const actions = a ? `<div class="as-action"><b>${esc(TYPE[a.type] || a.type)}${a.numero ? ' ' + esc(a.numero) : ''}</b>${lignes ? `<ul>${lignes}</ul>` : ''}${a.texte ? `<p class="petit">${esc(a.texte)}</p>` : ''}${a.pourcent ? `<p class="petit">Remise de ${esc(a.pourcent)} %</p>` : ''}
      ${a.total_ttc != null ? `<p class="as-total">Total TTC <b>${EUR2(a.total_ttc)}</b></p>` : ''}
      <div class="actions"><button class="btn btn-p btn-s" data-dec="ok" data-act="${a.id}">OK, envoyer</button><button class="btn btn-sec btn-s" data-dec="modifier" data-act="${a.id}">Modifier</button><button class="btn btn-s" data-dec="refuser" data-act="${a.id}">Refuser</button></div></div>` : '';
    const rdv = d.rdv ? `<p class="petit">Rendez-vous le ${esc(fmt(d.rdv.debut, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }, 'America/Martinique'))} (${nbFr(d.rdv.duree_min)} min)</p>` : '';
    return `<article class="as-carte${d.statut === 'reclamation' ? ' as-recl' : ''}" data-demande="${d.id}"><header><b>${esc(d.client_nom || 'Client')}</b>${d.statut === 'reclamation' ? ' <span class="tag ko">Réclamation</span>' : ''}</header>
      <p class="petit"><span class="tag gris">${esc(CANAL[d.canal] || d.canal)}</span>${d.commune ? ' ' + esc(d.commune) : ''} · ${esc(ilYa(d.maj_at))}</p>
      <p>${esc(d.resume || '')}</p>${rdv}${actions}</article>`;
  };
  const carteFacture = f => `<article class="as-carte"><header><b>${esc(f.client_nom)}</b> <span class="tag ${f.retard_jours > 0 ? 'att' : 'gris'}">${f.retard_jours > 0 ? 'En retard de ' + nbFr(f.retard_jours) + ' j' : 'À échéance le ' + esc(jourCourt(f.echeance))}</span></header>
    <p class="petit">${esc(f.numero)}${f.org_nom ? ' · ' + esc(f.org_nom) : ''}</p><p>Reste à payer <b>${EUR2(f.reste)}</b></p></article>`;

  const suivi = async org => {
    let s;
    try { s = await q(sb.rpc('as_suivi', { p_org: org || null })); }
    catch (e) { return vue(page('Assistant', INSTALLER)); }
    const col = ([k, t]) => {
      const l = s[k] || [];
      return `<section class="as-col" id="asCol-${k}" aria-label="${t}"><h2>${t} <span class="tag gris">${nbFr(l.length)}</span></h2>${l.length ? l.map(k === 'factures' ? carteFacture : carteDemande).join('') : '<p class="muted petit">Rien ici.</p>'}</section>`;
    };
    const journal = s.journal || [];
    vue(page('Assistant', `${entete(s, 'suivi', org)}
      ${(s.orgs || []).length ? `<div class="as-cols">${COLONNES.map(col).join('')}</div>
      ${carte('Ce que l’assistant a fait aujourd’hui', journal.length ? journal.map(j => `<div class="ctl-j"><b>${esc(fmt(j.le, { hour: '2-digit', minute: '2-digit' }, 'America/Martinique'))}</b> · ${esc(j.texte)}</div>`).join('') : '<p class="muted">Rien pour l’instant.</p>', 'as-journal')}`
      : '<div class="bandeau att"><span>Aucune entreprise NEXORA où vous pouvez suivre l’assistant. Rattachez votre compte à votre entreprise dans NEXORA.</span></div>'}
      <p class="petit muted">Les devis, factures et remises préparés par l’assistant ne partent chez le client qu’après votre « OK » (ici ou sur WhatsApp).</p>`));
    $('#app').onchange = e => { if (e.target.id === 'asOrg') aller(lienPage('', e.target.value)); };
    $('#app').onclick = async e => {
      const b = e.target.closest('[data-dec]'); if (!b) return;
      const dec = b.dataset.dec; let note = null;
      if (dec === 'modifier') { note = prompt('Que faut-il changer ? (l’assistant reprendra la demande)'); if (note === null) return; }
      if (dec === 'refuser' && !confirm('Refuser cette proposition ? Rien ne sera envoyé au client.')) return;
      b.disabled = true;
      try {
        const r = await q(sb.rpc('as_decider_ui', { p_action: b.dataset.act, p_decision: dec, p_note: note }));
        toast(dec === 'ok' ? (r.envois ? 'Validé : le client reçoit le lien de son espace client.' : 'Validé.') : dec === 'refuser' ? 'Refusé : rien n’est envoyé au client.' : 'Noté : la demande repasse en cours.');
        APP.pages.assistant();
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    };
  };

  const reglages = async org => {
    let s;
    try { s = await q(sb.rpc('as_suivi', { p_org: org || null })); } catch (e) { return vue(page('Assistant', INSTALLER)); }
    const orgs = s.orgs || [];
    const cible = org || (orgs[0] && orgs[0].id);
    if (!cible) return vue(page('Assistant', `${entete(s, 'reglages', org)}<div class="bandeau att"><span>Aucune entreprise NEXORA rattachée à votre compte.</span></div>`));
    const r = await q(sb.rpc('as_reglages_lire', { p_org: cible }));
    const h = r.horaires || {}, fs = r.fait_seul || {}, cx = r.canaux || {};
    vue(page('Assistant', `${entete(s, 'reglages', org)}
      <form id="asReglages" class="ctl-carte" data-org="${cible}" autocomplete="off">
        <h2>Réglages de l’assistant${orgs.length > 1 ? ' · ' + esc((orgs.find(o => o.id === cible) || {}).nom || '') : ''}</h2>
        <label>Votre numéro WhatsApp (avec l’indicatif, ex. 596696123456)<input name="proprietaire_wa" inputmode="numeric" value="${esc(r.proprietaire_wa || '')}" placeholder="596696123456"></label>
        <label>Votre e-mail<input name="proprietaire_email" type="email" value="${esc(r.proprietaire_email || '')}"></label>
        <fieldset><legend>Horaires de rendez-vous (vide = fermé)</legend>${JOURS.map(([k, t]) => `<label class="as-jour">${t}<input name="h_${k}" value="${esc(h[k] || '')}" placeholder="08:00-17:00" pattern="([01][0-9]|2[0-3]):[0-5][0-9]-([01][0-9]|2[0-3]):[0-5][0-9]"></label>`).join('')}</fieldset>
        <label>Durée d’un rendez-vous (minutes)<input name="rdv_duree_min" type="number" min="15" max="480" step="5" value="${esc(r.rdv_duree_min)}"></label>
        <fieldset><legend>Ce que l’assistant fait seul</legend>${AUTO.map(([k, t]) => `<label class="as-case"><input type="checkbox" name="a_${k}"${fs[k] !== false ? ' checked' : ''}> ${t}</label>`).join('')}
          <p class="petit muted">Devis, factures et remises : toujours validés par vous. Réclamations : l’assistant ne répond pas, il vous prévient.</p></fieldset>
        <label>Relances de paiement (jours de retard, séparés par des virgules ; la dernière vous prévient)<input name="relances" value="${esc((r.relances || []).join(', '))}" placeholder="7, 14, 30"></label>
        <label>Ton des messages<select name="ton">${[['vous_chaleureux', 'Vouvoiement chaleureux'], ['vous_formel', 'Vouvoiement formel'], ['tutoiement', 'Tutoiement']].map(([k, t]) => `<option value="${k}"${r.ton === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <fieldset><legend>Canaux actifs</legend>${[['whatsapp', 'WhatsApp'], ['formulaire', 'Formulaire du site'], ['gmail', 'Gmail'], ['nexora', 'Espace client NEXORA']].map(([k, t]) => `<label class="as-case"><input type="checkbox" name="c_${k}"${cx[k] !== false ? ' checked' : ''}> ${t}</label>`).join('')}</fieldset>
        <div class="actions"><button class="btn btn-p" type="submit">Enregistrer</button></div>
      </form>`));
    $('#app').onchange = e => { if (e.target.id === 'asOrg') aller(lienPage('reglages', e.target.value)); };
    $('#app').onclick = null;
    $('#app').onsubmit = async ev => {
      const f = ev.target; if (f.id !== 'asReglages') return;
      ev.preventDefault(); const b = f.querySelector('button[type=submit]'); b.disabled = true;
      const el = f.elements, horaires = {}, fait_seul = {}, canaux = {};
      JOURS.forEach(([k]) => { const x = el['h_' + k].value.trim(); if (x) horaires[k] = x; });
      AUTO.forEach(([k]) => { fait_seul[k] = el['a_' + k].checked; });
      ['whatsapp', 'formulaire', 'gmail', 'nexora'].forEach(k => { canaux[k] = el['c_' + k].checked; });
      const relances = el.relances.value.split(/[,;\s]+/).filter(Boolean).map(Number);
      if (!relances.length || relances.some(n => !Number.isInteger(n) || n < 1 || n > 365)) { el.relances.setAttribute('aria-invalid', 'true'); el.relances.focus(); b.disabled = false; return toast('Relances : des nombres de jours, par exemple 7, 14, 30.', true); }
      try {
        await q(sb.rpc('as_reglages_enregistrer', { p_org: f.dataset.org, p_donnees: { proprietaire_wa: el.proprietaire_wa.value, proprietaire_email: el.proprietaire_email.value, horaires, fait_seul, canaux, relances,
          ton: el.ton.value, rdv_duree_min: Number(el.rdv_duree_min.value) } }));
        toast('Réglages enregistrés.'); APP.pages.assistant();
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    };
  };

  APP.pages.assistant = async () => {
    if (!garde('assistant')) return;
    attente();
    const org = param('org') || '';
    return param('vue') === 'reglages' ? reglages(org) : suivi(org);
  };
})();
