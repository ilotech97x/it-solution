/* NEXORA — CRM : clients et prospects, fiche client à 360°, contacts, pipeline, activités et rappels. */
'use strict';
const ST_CLIENT = { prospect: ['info', 'Prospect'], client: ['ok', 'Client'], inactif: ['', 'Inactif'] };
const ETAPES_OPP = [['nouveau', 'Nouveau', 10], ['qualifie', 'Qualifié', 30], ['proposition', 'Proposition', 50], ['negociation', 'Négociation', 70], ['gagne', 'Gagné', 100], ['perdu', 'Perdu', 0]];
const TYPES_ACT = { note: ['📝', 'Note'], appel: ['📞', 'Appel'], email: ['✉️', 'Email'], rdv: ['📅', 'Rendez-vous'], tache: ['✅', 'Tâche'] };

const champsClient = (c = {}) => `<div class="g2"><label>Type<select name="type"><option value="entreprise" ${c.type !== 'particulier' ? 'selected' : ''}>Entreprise</option><option value="particulier" ${c.type === 'particulier' ? 'selected' : ''}>Particulier</option></select></label>
    <label>Statut<select name="statut">${Object.entries(ST_CLIENT).map(([k, [, t]]) => `<option value="${k}" ${(c.statut || 'prospect') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
  <label>Nom ou raison sociale<input name="nom" required maxlength="120" value="${esc(c.nom || '')}"></label>
  <div class="g2"><label>Email<input name="email" type="email" maxlength="120" value="${esc(c.email || '')}"></label><label>Téléphone<input name="telephone" maxlength="30" value="${esc(c.telephone || '')}"></label></div>
  <label>Adresse<input name="adresse" maxlength="200" value="${esc(c.adresse || '')}"></label>
  <div class="g3"><label>Code postal<input name="code_postal" maxlength="12" value="${esc(c.code_postal || '')}"></label><label>Ville<input name="ville" maxlength="80" value="${esc(c.ville || '')}"></label><label>Pays<input name="pays" maxlength="60" value="${esc(c.pays || 'France')}"></label></div>
  <div class="g3"><label>SIRET<input name="siret" pattern="[0-9 ]{9,17}" value="${esc(c.siret || '')}"></label><label>N° TVA intracom.<input name="tva_intra" maxlength="20" value="${esc(c.tva_intra || '')}"></label>
    <label>Origine<input name="source" maxlength="60" list="sources" value="${esc(c.source || '')}"><datalist id="sources"><option>Recommandation<option>Site internet<option>Réseaux sociaux<option>Salon<option>Prospection<option>WhatsApp</datalist></label></div>
  <label>Étiquettes <span class="muted">(séparées par des virgules)</span><input name="etiquettes" maxlength="300" value="${esc((c.etiquettes || []).join(', '))}"></label>`;
const lireClient = d => ({ type: d.type, statut: d.statut, nom: d.nom.trim(), email: d.email.trim() || null, telephone: d.telephone.trim() || null, adresse: d.adresse.trim() || null, code_postal: d.code_postal.trim() || null,
  ville: d.ville.trim() || null, pays: d.pays.trim() || 'France', siret: d.siret.trim() || null, tva_intra: d.tva_intra.trim() || null, source: d.source.trim() || null,
  etiquettes: d.etiquettes.split(',').map(x => x.trim()).filter(Boolean).slice(0, 20) });
async function nouveauClient(retour = true) {
  const d = await modale('Nouveau client', champsClient());
  if (!d) return null;
  try { const c = await q(sb.from('nx_clients').insert({ org_id: ORG.id, ...lireClient(d) }).select('id').single()); toast('Client créé.'); if (retour) aller('#/clients/' + c.id); return c.id; }
  catch (err) { toast(erreur(err), true); return null; }
}

NX.pages.clients = async id => {
  if (id) return ficheClient(id);
  const p = param();
  if (p.nouveau && peut('crm')) { history.replaceState(null, '', '#/clients'); if (await nouveauClient()) return; }
  let l = await q(sb.from('nx_clients').select('*').eq('org_id', ORG.id).order('nom'));
  const ca = Object.fromEntries((await q(sb.from('nx_factures').select('client_id, total_ht, total_ttc, paye, statut, type').eq('org_id', ORG.id).neq('statut', 'brouillon')))
    .reduce((m, f) => { const x = m.get(f.client_id) || [0, 0]; x[0] += Number(f.total_ht); if (f.type === 'facture' && ['validee', 'partielle'].includes(f.statut)) x[1] += f.total_ttc - f.paye; m.set(f.client_id, x); return m; }, new Map()));
  const dessiner = () => {
    const t = ($('#rech')?.value || '').toLowerCase(), s = $('#stat')?.value || '';
    const v = l.filter(c => (!s || c.statut === s) && (!t || [c.nom, c.email, c.ville, c.telephone, ...(c.etiquettes || [])].join(' ').toLowerCase().includes(t)));
    $('#liste').innerHTML = tableau(['Nom', 'Statut', 'Ville', 'Contact', '#CA HT', '#Reste dû'], v.map(c => `<tr class="clic" data-href="#/clients/${c.id}"><td><b>${esc(c.nom)}</b>${(c.etiquettes || []).map(e => ` <span class="tag violet">${esc(e)}</span>`).join('')}
      <br><span class="muted petit">${c.type === 'particulier' ? 'Particulier' : 'Entreprise'}${c.source ? ' · ' + esc(c.source) : ''}</span></td><td>${tag(ST_CLIENT[c.statut])}</td><td>${esc(c.ville || '')}</td>
      <td class="petit">${esc(c.email || '')}<br>${esc(c.telephone || '')}</td><td class="num">${ca[c.id] ? montant(ca[c.id][0]) : '—'}</td><td class="num">${ca[c.id]?.[1] ? `<b>${montant(ca[c.id][1])}</b>` : '—'}</td></tr>`),
      l.length ? vide('Aucun résultat', 'Modifiez la recherche ou le filtre.') : vide('Aucun client pour l’instant', 'Ajoutez vos clients et prospects pour suivre vos échanges, devis et factures.', peut('crm') ? '<button class="btn btn-p" data-nouveau>+ Ajouter un client</button>' : ''));
  };
  vue(entete('Clients et prospects', `${l.filter(c => c.statut === 'client').length} clients · ${l.filter(c => c.statut === 'prospect').length} prospects`,
      `<button class="btn" id="csv">Exporter (CSV)</button>${peut('crm') ? '<button class="btn btn-p" data-nouveau>+ Nouveau client</button>' : ''}`)
    + `<div class="filtres"><input id="rech" type="search" placeholder="Nom, ville, email, étiquette…" aria-label="Recherche"><select id="stat" aria-label="Statut"><option value="">Tous</option>${Object.entries(ST_CLIENT).map(([k, [, t]]) => `<option value="${k}">${t}s</option>`).join('')}</select></div><div id="liste"></div>`);
  $('#rech').oninput = dessiner; $('#stat').onchange = dessiner; dessiner();
  $('#csv').onclick = () => telechargerCsv('clients.csv', ['Nom', 'Type', 'Statut', 'Email', 'Téléphone', 'Adresse', 'Code postal', 'Ville', 'Pays', 'SIRET', 'Origine'],
    l.map(c => [c.nom, c.type, c.statut, c.email, c.telephone, c.adresse, c.code_postal, c.ville, c.pays, c.siret, c.source]));
  $('#page').onclick = async e => { if (e.target.closest('[data-nouveau]')) return nouveauClient(); const r = e.target.closest('[data-href]'); if (r) aller(r.dataset.href); };
};
function telechargerCsv(nom, entetes, lignes) {
  const c = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob(['﻿' + [entetes, ...lignes].map(l => l.map(c).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function ficheClient(id, onglet = 'activites') {
  const c = await q(sb.from('nx_clients').select('*').eq('id', id).eq('org_id', ORG.id).maybeSingle());
  if (!c) return vue(vide('Client introuvable', '', '<a class="btn" href="#/clients">Tous les clients</a>'));
  const [contacts, opps, acts, devis, factures] = await Promise.all([q(sb.from('nx_contacts').select('*').eq('client_id', id).order('created_at')),
    q(sb.from('nx_opportunites').select('*').eq('client_id', id).order('created_at', { ascending: false })), q(sb.from('nx_activites').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(100)),
    q(sb.from('nx_devis').select('id, numero, objet, statut, total_ht, total_ttc, date_emission').eq('client_id', id).order('created_at', { ascending: false })),
    q(sb.from('nx_factures').select('id, numero, type, objet, statut, total_ttc, paye, date_emission, echeance').eq('client_id', id).order('created_at', { ascending: false }))]);
  const vendu = factures.filter(f => f.statut !== 'brouillon').reduce((s, f) => s + Number(f.total_ttc), 0);
  const du = factures.filter(f => f.type === 'facture' && ['validee', 'partielle'].includes(f.statut)).reduce((s, f) => s + (f.total_ttc - f.paye), 0);
  const ong = { activites: `Historique (${acts.length})`, contacts: `Contacts (${contacts.length})`, opps: `Opportunités (${opps.length})`, devis: `Devis (${devis.length})`, factures: `Factures (${factures.length})` };
  const corps = {
    activites: () => `${peut('crm') ? `<form class="carte f" id="fAct" style="margin-bottom:14px;padding:14px"><div class="g3"><label>Type<select name="type">${Object.entries(TYPES_ACT).map(([k, [i, t]]) => `<option value="${k}">${i} ${t}</option>`).join('')}</select></label>
        <label style="grid-column:span 2">Titre<input name="titre" required maxlength="160" placeholder="Ex. Appel de suivi, rendez-vous sur place…"></label></div>
        <div class="g2"><label>Détails<textarea name="contenu" maxlength="4000" style="min-height:60px"></textarea></label><label>Échéance ou date du rendez-vous <span class="muted">(facultatif)</span><input name="echeance" type="datetime-local"></label></div>
        <div><button class="btn btn-p btn-s">Ajouter</button></div></form>` : ''}
      <div class="fil">${acts.length ? acts.map(a => `<div class="ev"><span class="pastille">${TYPES_ACT[a.type][0]}</span><div><b>${esc(a.titre)}</b> ${a.fait ? tag(['ok', 'Fait']) : a.echeance ? tag([new Date(a.echeance) < new Date() ? 'ko' : 'att', dateHeure(a.echeance)]) : ''}
        ${a.contenu ? `<div class="petit" style="white-space:pre-line">${esc(a.contenu)}</div>` : ''}<div class="muted petit">${dateHeure(a.created_at)}</div></div>
        ${peut('crm') ? `<div class="actions">${!a.fait && a.type !== 'note' ? `<button class="btn btn-s btn-ok" data-fait="${a.id}">Fait</button>` : ''}<button class="btn btn-s btn-ko" data-suppr-act="${a.id}" aria-label="Supprimer">×</button></div>` : '<span></span>'}</div>`).join('') : '<p class="muted">Aucun échange enregistré.</p>'}</div>`,
    contacts: () => `${contacts.length ? `<div class="tab-boite"><table class="tab">${contacts.map(k => `<tr><td><b>${esc(k.prenom)} ${esc(k.nom)}</b><br><span class="muted petit">${esc(k.fonction || '')}</span></td><td class="petit">${k.email ? `<a href="mailto:${esc(k.email)}">${esc(k.email)}</a>` : ''}<br>${esc(k.telephone || '')}</td>
        <td class="num">${peut('crm') ? `<button class="btn btn-s btn-ko" data-suppr-contact="${k.id}" aria-label="Supprimer">×</button>` : ''}</td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun contact.</p>'}
      ${peut('crm') ? '<p><button class="btn" id="nvContact">+ Ajouter un contact</button></p>' : ''}`,
    opps: () => `${opps.length ? `<div class="tab-boite"><table class="tab">${opps.map(o => `<tr><td><b>${esc(o.titre)}</b><br><span class="muted petit">${o.echeance ? 'échéance ' + date(o.echeance) : ''}</span></td><td>${tag([o.etape === 'gagne' ? 'ok' : o.etape === 'perdu' ? 'ko' : 'info', ETAPES_OPP.find(e => e[0] === o.etape)[1]])}</td>
        <td class="num">${montant(o.montant)}<br><span class="muted petit">${o.probabilite} %</span></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucune opportunité.</p>'}${peut('crm') ? '<p><button class="btn" id="nvOpp">+ Nouvelle opportunité</button></p>' : ''}`,
    devis: () => `${devis.length ? `<div class="tab-boite"><table class="tab">${devis.map(d => `<tr class="clic" data-href="#/devis/${d.id}"><td><b>${esc(d.numero)}</b><br><span class="muted petit">${esc(d.objet)}</span></td><td>${tag(ST_DEVIS[d.statut])}</td><td class="petit">${date(d.date_emission)}</td><td class="num">${montant(d.total_ttc)}</td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun devis.</p>'}
      ${peut('ventes') ? `<p><a class="btn" href="#/devis/nouveau?client=${id}">+ Nouveau devis</a></p>` : ''}`,
    factures: () => `${factures.length ? `<div class="tab-boite"><table class="tab">${factures.map(f => `<tr class="clic" data-href="#/factures/${f.id}"><td><b>${esc(f.numero || 'Brouillon')}</b><br><span class="muted petit">${f.type === 'avoir' ? 'Avoir · ' : ''}${esc(f.objet)}</span></td><td>${tagFacture(f)}</td><td class="petit">${date(f.date_emission)}</td><td class="num">${montant(f.total_ttc)}</td></tr>`).join('')}</table></div>` : '<p class="muted">Aucune facture.</p>'}
      ${peut('facturation') ? `<p><a class="btn" href="#/factures/nouvelle?client=${id}">+ Nouvelle facture</a></p>` : ''}`
  };
  vue(`<p class="petit"><a href="#/clients">← Clients</a></p>` + entete(esc(c.nom), `${tag(ST_CLIENT[c.statut])} ${c.type === 'particulier' ? 'Particulier' : 'Entreprise'}${c.ville ? ' · ' + esc(c.ville) : ''}`,
      `${c.email ? (COMM ? `<button class="btn" data-ecrire="${c.id}">✉️ Écrire</button>` : `<a class="btn" href="mailto:${esc(c.email)}">✉️ Email</a>`) : ''}${COMM && c.email && peut('crm') ? `<button class="btn btn-s" data-opposition="${c.id}" data-etat="${c.opposition_email ? 'oui' : 'non'}">${c.opposition_email ? '🚫 Désinscrit · réactiver' : 'Ne veut plus d’emails'}</button>` : ''}${c.telephone ? `<a class="btn" href="tel:${esc(c.telephone)}">📞 Appeler</a>` : ''}${peut('crm') ? '<button class="btn" id="modif">Modifier</button>' : ''}`)
    + `<div class="fiche"><div class="grille"><div class="kpis" style="grid-template-columns:1fr 1fr;margin:0"><div class="kpi"><span>Facturé TTC</span><b style="font-size:20px">${montant(vendu)}</b></div><div class="kpi"><span>Reste dû</span><b style="font-size:20px;${du > 0 ? 'color:var(--ko)' : ''}">${montant(du)}</b></div></div>
        <div class="carte"><h2>Coordonnées</h2><dl class="dl"><dt>Email</dt><dd>${esc(c.email || '—')}</dd><dt>Téléphone</dt><dd>${esc(c.telephone || '—')}</dd><dt>Adresse</dt><dd>${esc([c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' '), c.pays].filter(Boolean).join(', ') || '—')}</dd>
          <dt>SIRET</dt><dd>${esc(c.siret || '—')}</dd><dt>TVA intra.</dt><dd>${esc(c.tva_intra || '—')}</dd><dt>Origine</dt><dd>${esc(c.source || '—')}</dd><dt>Client depuis</dt><dd>${date(c.created_at)}</dd></dl>
          ${(c.etiquettes || []).length ? `<p>${c.etiquettes.map(e => `<span class="tag violet">${esc(e)}</span>`).join(' ')}</p>` : ''}</div>
        <div class="carte"><h2>Notes internes</h2><textarea id="notes" ${peut('crm') ? '' : 'disabled'} placeholder="Visibles par votre équipe uniquement">${esc(c.notes)}</textarea>${peut('crm') ? '<p style="margin:8px 0 0"><button class="btn btn-s" id="sNotes">Enregistrer les notes</button></p>' : ''}</div>
        ${peut('crm') ? '<p class="petit"><button class="lien" id="supprC" style="color:var(--ko)">Supprimer ce client</button></p>' : ''}</div>
      <div class="carte"><div class="onglets" role="tablist">${Object.entries(ong).map(([k, t]) => `<button role="tab" data-ong="${k}" class="${k === onglet ? 'on' : ''}">${t}</button>`).join('')}</div><div id="ongCorps">${corps[onglet]()}</div></div></div>`);
  const page = $('#page');
  page.onclick = async e => {
    const b = e.target;
    if (b.closest('[data-ong]')) return ficheClient(id, b.closest('[data-ong]').dataset.ong);
    const r = b.closest('[data-href]'); if (r && !b.closest('a,button')) return aller(r.dataset.href);
    try {
      if (b.id === 'modif') { const d = await modale('Modifier le client', champsClient(c)); if (d) { await q(sb.from('nx_clients').update(lireClient(d)).eq('id', id)); toast('Enregistré.'); ficheClient(id, onglet); } }
      if (b.id === 'sNotes') { await q(sb.from('nx_clients').update({ notes: $('#notes').value }).eq('id', id)); toast('Notes enregistrées.'); }
      if (b.id === 'supprC' && await confirmer('Supprimer le client', `Supprimer « ${esc(c.nom)} », ses contacts, opportunités et activités ? Impossible s’il a des devis ou des factures.`, 'Supprimer')) { await q(sb.from('nx_clients').delete().eq('id', id)); toast('Client supprimé.'); aller('#/clients'); }
      if (b.id === 'nvContact') { const d = await modale('Nouveau contact', `<div class="g2"><label>Prénom<input name="prenom" maxlength="60"></label><label>Nom<input name="nom" required maxlength="80"></label></div><label>Fonction<input name="fonction" maxlength="80"></label>
          <div class="g2"><label>Email<input name="email" type="email" maxlength="120"></label><label>Téléphone<input name="telephone" maxlength="30"></label></div>`);
        if (d) { await q(sb.from('nx_contacts').insert({ org_id: ORG.id, client_id: id, prenom: d.prenom.trim(), nom: d.nom.trim(), fonction: d.fonction.trim() || null, email: d.email.trim() || null, telephone: d.telephone.trim() || null })); ficheClient(id, 'contacts'); } }
      if (b.dataset.supprContact && await confirmer('Supprimer le contact', 'Ce contact sera supprimé.')) { await q(sb.from('nx_contacts').delete().eq('id', b.dataset.supprContact)); ficheClient(id, 'contacts'); }
      if (b.id === 'nvOpp') { const o = await formOpp({ client_id: id }); if (o) ficheClient(id, 'opps'); }
      if (b.dataset.fait) { await q(sb.from('nx_activites').update({ fait: true }).eq('id', b.dataset.fait)); ficheClient(id, 'activites'); }
      if (b.dataset.supprAct && await confirmer('Supprimer', 'Supprimer cette entrée de l’historique ?')) { await q(sb.from('nx_activites').delete().eq('id', b.dataset.supprAct)); ficheClient(id, 'activites'); }
    } catch (err) { toast(erreur(err), true); }
  };
  $('#fAct')?.addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try { await q(sb.from('nx_activites').insert({ org_id: ORG.id, client_id: id, type: d.type, titre: d.titre.trim(), contenu: d.contenu.trim(), echeance: d.echeance ? new Date(d.echeance).toISOString() : null, fait: d.type === 'note' }));
      toast('Ajouté.'); ficheClient(id, 'activites'); } catch (err) { toast(erreur(err), true); }
  });
}

async function formOpp(o = {}) {
  const clients = o.client_id ? [] : await q(sb.from('nx_clients').select('id, nom').eq('org_id', ORG.id).neq('statut', 'inactif').order('nom'));
  if (!o.client_id && !clients.length) { toast('Créez d’abord un client ou un prospect.', true); return null; }
  const d = await modale(o.id ? 'Modifier l’opportunité' : 'Nouvelle opportunité', `${o.client_id ? '' : `<label>Client ou prospect<select name="client_id" required>${clients.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}</select></label>`}
    <label>Titre<input name="titre" required minlength="2" maxlength="160" value="${esc(o.titre || '')}" placeholder="Ex. Équipement informatique des bureaux"></label>
    <div class="g3"><label>Montant estimé (€ HT)<input name="montant" type="number" min="0" step="0.01" value="${o.montant ?? ''}"></label><label>Étape<select name="etape">${ETAPES_OPP.map(([k, t]) => `<option value="${k}" ${(o.etape || 'nouveau') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Échéance<input name="echeance" type="date" value="${o.echeance || ''}"></label></div>`);
  if (!d) return null;
  const v = { titre: d.titre.trim(), montant: Number(d.montant || 0), etape: d.etape, probabilite: ETAPES_OPP.find(e => e[0] === d.etape)[2], echeance: d.echeance || null };
  try {
    if (o.id) return await q(sb.from('nx_opportunites').update(v).eq('id', o.id).select().single());
    return await q(sb.from('nx_opportunites').insert({ org_id: ORG.id, client_id: o.client_id || d.client_id, responsable: moi.id, ...v }).select().single());
  } catch (err) { toast(erreur(err), true); return null; }
}

NX.pages.pipeline = async () => {
  const l = await q(sb.from('nx_opportunites').select('*, nx_clients(nom)').eq('org_id', ORG.id).order('created_at', { ascending: false }));
  const ouvert = l.filter(o => !['gagne', 'perdu'].includes(o.etape));
  vue(entete('Pipeline commercial', `${ouvert.length} opportunités en cours · ${montant(ouvert.reduce((s, o) => s + Number(o.montant), 0))} · pondéré ${montant(ouvert.reduce((s, o) => s + o.montant * o.probabilite / 100, 0))}`,
      peut('crm') ? '<button class="btn btn-p" id="nvOpp">+ Opportunité</button>' : '')
    + (l.length ? `<div class="kanban">${ETAPES_OPP.map(([k, t]) => { const x = l.filter(o => o.etape === k); return `<div class="col" data-col="${k}"><h3><span>${t}</span><span class="muted">${x.length} · ${montant(x.reduce((s, o) => s + Number(o.montant), 0))}</span></h3>
        ${x.map(o => `<div class="opp" draggable="${peut('crm')}" data-opp="${o.id}"><b>${esc(o.titre)}</b><a class="petit" href="#/clients/${o.client_id}">${esc(o.nx_clients?.nom || '')}</a>
          <div style="display:flex;justify-content:space-between;margin-top:4px"><b>${montant(o.montant)}</b><span class="muted petit">${o.echeance ? date(o.echeance) : ''}</span></div>
          ${peut('crm') ? `<select data-etape="${o.id}" aria-label="Changer d’étape">${ETAPES_OPP.map(([e, te]) => `<option value="${e}" ${e === k ? 'selected' : ''}>${te}</option>`).join('')}</select>` : ''}</div>`).join('')}</div>`; }).join('')}</div>`
      : `<div class="carte">${vide('Aucune opportunité', 'Suivez vos affaires en cours, de la première prise de contact à la signature.', peut('crm') ? '<button class="btn btn-p" id="nvOpp2">+ Créer une opportunité</button>' : '')}</div>`));
  const changer = async (id, etape) => {
    try { await q(sb.from('nx_opportunites').update({ etape, probabilite: ETAPES_OPP.find(e => e[0] === etape)[2] }).eq('id', id)); NX.pages.pipeline(); } catch (err) { toast(erreur(err), true); }
  };
  const page = $('#page');
  page.onclick = async e => { if (e.target.id === 'nvOpp' || e.target.id === 'nvOpp2') { if (await formOpp()) NX.pages.pipeline(); } };
  page.onchange = e => { const s = e.target.closest('[data-etape]'); if (s) changer(s.dataset.etape, s.value); };
  page.ondragstart = e => { const o = e.target.closest('[data-opp]'); if (o) e.dataTransfer.setData('text/plain', o.dataset.opp); };
  page.ondragover = e => { const c = e.target.closest('[data-col]'); if (c) { e.preventDefault(); c.classList.add('survol'); } };
  page.ondragleave = e => e.target.closest?.('[data-col]')?.classList.remove('survol');
  page.ondrop = e => { const c = e.target.closest('[data-col]'); if (!c) return; e.preventDefault(); c.classList.remove('survol'); const id = e.dataTransfer.getData('text/plain'); if (id) changer(id, c.dataset.col); };
};

NX.pages.activites = async () => {
  const p = param(), filtre = p.f || 'afaire';
  let r = sb.from('nx_activites').select('*, nx_clients(nom)').eq('org_id', ORG.id);
  r = filtre === 'afaire' ? r.eq('fait', false).neq('type', 'note').order('echeance', { ascending: true, nullsFirst: false }) : r.order('created_at', { ascending: false });
  const l = await q(r.limit(200));
  vue(entete('Activités et rappels', 'Appels, rendez-vous, tâches et notes de toute l’équipe')
    + `<div class="puces" style="margin-bottom:14px"><a href="#/activites?f=afaire" class="${filtre === 'afaire' ? 'on' : ''}">À faire</a><a href="#/activites?f=tout" class="${filtre === 'tout' ? 'on' : ''}">Tout l’historique</a></div>`
    + tableau(['', 'Activité', 'Client', 'Échéance', ''], l.map(a => { const retard = !a.fait && a.echeance && new Date(a.echeance) < new Date(); return `<tr><td style="width:40px;font-size:18px">${TYPES_ACT[a.type][0]}</td>
        <td><b>${esc(a.titre)}</b>${a.contenu ? `<br><span class="muted petit">${esc(a.contenu.slice(0, 140))}</span>` : ''}</td><td><a href="#/clients/${a.client_id}">${esc(a.nx_clients?.nom || '')}</a></td>
        <td class="petit nowrap" style="${retard ? 'color:var(--ko);font-weight:600' : ''}">${a.echeance ? dateHeure(a.echeance) : '—'}</td>
        <td class="num">${a.fait ? tag(['ok', 'Fait']) : peut('crm') ? `<button class="btn btn-s btn-ok" data-fait="${a.id}">Marquer fait</button>` : ''}</td></tr>`; }),
      vide(filtre === 'afaire' ? 'Rien à faire 🎉' : 'Aucune activité', 'Ajoutez des appels, rendez-vous et tâches depuis la fiche d’un client.')));
  $('#page').onclick = async e => { const b = e.target.closest('[data-fait]'); if (!b) return; try { await q(sb.from('nx_activites').update({ fait: true }).eq('id', b.dataset.fait)); NX.pages.activites(); } catch (err) { toast(erreur(err), true); } };
};
