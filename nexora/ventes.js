/* NEXORA — ventes : catalogue (avec marge et stock), devis, factures, avoirs, paiements, impression PDF.
   Les totaux affichés pendant la saisie sont indicatifs : la base recalcule et fait foi (arrondi au centime par ligne, TVA arrondie par taux). */
'use strict';
const ST_DEVIS = { brouillon: ['', 'Brouillon'], envoye: ['info', 'Envoyé'], accepte: ['ok', 'Accepté'], refuse: ['ko', 'Refusé'], expire: ['', 'Expiré'] };
const ST_FACT = { brouillon: ['', 'Brouillon'], validee: ['info', 'À encaisser'], partielle: ['att', 'Partiellement payée'], payee: ['ok', 'Payée'], annulee: ['', 'Annulée par avoir'] };
const MOYENS = { virement: 'Virement', carte: 'Carte bancaire', especes: 'Espèces', cheque: 'Chèque', prelevement: 'Prélèvement', autre: 'Autre' };
const tagFacture = f => f.type === 'avoir' ? tag(f.statut === 'brouillon' ? ST_FACT.brouillon : ['violet', 'Avoir']) :
  (['validee', 'partielle'].includes(f.statut) && f.echeance && f.echeance < aujourdhui() ? tag(['ko', 'En retard']) : tag(ST_FACT[f.statut]));
const arrondi = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
function calculer(lignes) {   // même règle que la base, pour l'affichage pendant la saisie
  const parTaux = {}; let ht = 0;
  lignes.forEach(l => { const h = arrondi(Number(l.quantite) * Number(l.prix_ht) * (1 - Number(l.remise_pct || 0) / 100)); ht += h; parTaux[l.taux_tva] = (parTaux[l.taux_tva] || 0) + h; });
  const tvas = Object.entries(parTaux).map(([t, h]) => [Number(t), arrondi(h * Number(t) / 100)]).filter(([t]) => t > 0);
  const tva = tvas.reduce((s, [, v]) => s + v, 0);
  return { ht: arrondi(ht), tvas, tva: arrondi(tva), ttc: arrondi(ht + tva) };
}

// ---------------------------------------------------------------- catalogue
NX.pages.catalogue = async () => {
  const l = await q(sb.from('nx_produits').select('*').eq('org_id', ORG.id).order('nom'));
  vue(entete('Catalogue', 'Vos prestations et produits, réutilisables dans les devis et factures', peut('catalogue') ? '<button class="btn btn-p" id="nvP">+ Ajouter</button>' : '')
    + tableau(['Référence', 'Désignation', 'Unité', '#Prix HT', '#Marge', '#Stock', '#TVA', ''], l.map(p => `<tr style="${p.actif ? '' : 'opacity:.55'}"><td class="mono petit">${esc(p.reference || '')}</td><td><b>${esc(p.nom)}</b>${p.description ? `<br><span class="muted petit">${esc(p.description)}</span>` : ''}</td>
      <td>${esc(p.unite)}</td><td class="num">${montant(p.prix_ht)}</td><td class="num petit">${p.prix_achat_ht != null && Number(p.prix_ht) > 0 ? Math.round((p.prix_ht - p.prix_achat_ht) / p.prix_ht * 100) + ' %' : '—'}</td>
      <td class="num">${p.stock_gere ? `<a href="#/stock" style="${Number(p.stock) <= Number(p.seuil_alerte || 0) ? 'color:var(--ko);font-weight:700' : ''}">${nombre(p.stock)}</a>` : '—'}</td><td class="num">${ORG.franchise_tva ? '—' : nombre(p.taux_tva) + ' %'}</td><td class="num">${peut('catalogue') ? `<button class="btn btn-s" data-modif="${p.id}">Modifier</button>` : ''}</td></tr>`),
      vide('Catalogue vide', 'Ajoutez vos prestations (main-d’œuvre, forfaits, déplacements) et produits.', peut('catalogue') ? '<button class="btn btn-p" id="nvP2">+ Ajouter une prestation</button>' : '')));
  const form = async (p = { unite: 'unité', taux_tva: ORG.taux_tva_defaut, actif: true, type: 'service' }) => {
    const d = await modale(p.id ? 'Modifier' : 'Nouvelle prestation ou produit', `<div class="g3"><label style="grid-column:span 2">Désignation<input name="nom" required maxlength="160" value="${esc(p.nom || '')}"></label><label>Référence<input name="reference" maxlength="40" value="${esc(p.reference || '')}"></label></div>
      <label>Description<input name="description" maxlength="1000" value="${esc(p.description || '')}"></label>
      <div class="g3"><label>Prix HT (€)<input name="prix_ht" type="number" step="0.01" required value="${p.prix_ht ?? ''}"></label><label>Unité<input name="unite" maxlength="20" list="unites" value="${esc(p.unite)}"><datalist id="unites"><option>unité<option>heure<option>jour<option>forfait<option>mois<option>m²<option>km</datalist></label>
        <label>TVA (%)<input name="taux_tva" type="number" min="0" max="100" step="0.1" value="${p.taux_tva}" ${ORG.franchise_tva ? 'disabled' : ''}></label></div>
      <div class="g3"><label>Type<select name="type"><option value="service" ${p.type !== 'bien' ? 'selected' : ''}>Prestation (service)</option><option value="bien" ${p.type === 'bien' ? 'selected' : ''}>Produit (matériel, marchandise)</option></select></label>
        <label>Prix d’achat HT (€)<input name="prix_achat_ht" type="number" min="0" step="0.01" value="${p.prix_achat_ht ?? ''}"></label><label>Seuil d’alerte stock<input name="seuil_alerte" type="number" min="0" step="any" value="${p.seuil_alerte ?? ''}"></label></div>
      <label class="case"><input type="checkbox" name="stock_gere" ${p.stock_gere ? 'checked' : ''}> Suivre le stock de ce produit (les ventes validées le décomptent)</label>
      <label class="case"><input type="checkbox" name="actif" ${p.actif ? 'checked' : ''}> Proposé dans les devis et factures</label>`);
    if (!d) return;
    const v = { nom: d.nom.trim(), reference: d.reference.trim() || null, description: d.description.trim(), prix_ht: Number(d.prix_ht), unite: d.unite.trim() || 'unité', taux_tva: ORG.franchise_tva ? 0 : Number(d.taux_tva || 0), actif: !!d.actif,
      type: d.type, stock_gere: d.type === 'bien' && !!d.stock_gere, prix_achat_ht: d.prix_achat_ht === '' ? null : Number(d.prix_achat_ht), seuil_alerte: d.seuil_alerte === '' ? null : Number(d.seuil_alerte) };
    try { if (p.id) await q(sb.from('nx_produits').update(v).eq('id', p.id)); else await q(sb.from('nx_produits').insert({ org_id: ORG.id, ...v })); toast('Enregistré.'); NX.pages.catalogue(); } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = e => { if (e.target.id === 'nvP' || e.target.id === 'nvP2') form(); const m = e.target.closest('[data-modif]'); if (m) form(l.find(p => p.id === m.dataset.modif)); };
};

// ---------------------------------------------------------------- listes
NX.pages.devis = async id => {
  if (id === 'nouveau') return nouveauDoc('devis');
  if (id) return editeur('devis', id);
  const f = param().f || '';
  let r = sb.from('nx_devis').select('id, numero, objet, statut, date_emission, validite, total_ttc, nx_clients(nom)').eq('org_id', ORG.id).order('created_at', { ascending: false }).limit(300);
  if (f) r = r.eq('statut', f);
  const l = await q(r);
  vue(entete('Devis', '', peut('ventes') ? '<a class="btn btn-p" href="#/devis/nouveau">+ Nouveau devis</a>' : '')
    + `<div class="puces" style="margin-bottom:14px">${[['', 'Tous'], ...Object.entries(ST_DEVIS).map(([k, [, t]]) => [k, t])].map(([k, t]) => `<a href="#/devis${k ? '?f=' + k : ''}" class="${f === k ? 'on' : ''}">${t}</a>`).join('')}</div>`
    + tableau(['Numéro', 'Client', 'Date', 'Statut', '#Total TTC'], l.map(d => `<tr class="clic" data-href="#/devis/${d.id}"><td><b class="mono">${esc(d.numero)}</b><br><span class="muted petit">${esc(d.objet)}</span></td><td>${esc(d.nx_clients?.nom || '')}</td>
      <td class="petit">${date(d.date_emission)}${d.statut === 'envoye' && d.validite < aujourdhui() ? '<br><span style="color:var(--ko)">validité dépassée</span>' : ''}</td><td>${tag(ST_DEVIS[d.statut])}</td><td class="num">${montant(d.total_ttc)}</td></tr>`),
      vide(f ? 'Aucun devis avec ce statut' : 'Aucun devis', 'Créez un devis, envoyez-le, puis transformez-le en facture en un clic une fois accepté.', peut('ventes') && !f ? '<a class="btn btn-p" href="#/devis/nouveau">+ Créer un devis</a>' : '')));
  $('#page').onclick = e => { const r = e.target.closest('[data-href]'); if (r) aller(r.dataset.href); };
};
NX.pages.factures = async id => {
  if (id === 'nouvelle') return nouveauDoc('facture');
  if (id) return editeur('facture', id);
  const f = param().f || '';
  let r = sb.from('nx_factures').select('id, numero, type, objet, statut, date_emission, echeance, total_ttc, paye, nx_clients(nom)').eq('org_id', ORG.id).order('created_at', { ascending: false }).limit(500);
  if (f === 'brouillon') r = r.eq('statut', 'brouillon');
  if (f === 'encaisser' || f === 'retard') r = r.eq('type', 'facture').in('statut', ['validee', 'partielle']);
  if (f === 'retard') r = r.lt('echeance', aujourdhui());
  if (f === 'payee') r = r.eq('statut', 'payee');
  if (f === 'avoir') r = r.eq('type', 'avoir');
  const l = await q(r);
  const du = l.filter(x => x.type === 'facture' && ['validee', 'partielle'].includes(x.statut)).reduce((s, x) => s + (x.total_ttc - x.paye), 0);
  vue(entete('Factures et avoirs', du ? `Reste à encaisser sur cette liste : <b>${montant(du)}</b>` : '', `<button class="btn" id="csv">Exporter (CSV)</button>${peut('facturation') ? '<a class="btn btn-p" href="#/factures/nouvelle">+ Nouvelle facture</a>' : ''}`)
    + `<div class="puces" style="margin-bottom:14px">${[['', 'Toutes'], ['brouillon', 'Brouillons'], ['encaisser', 'À encaisser'], ['retard', 'En retard'], ['payee', 'Payées'], ['avoir', 'Avoirs']].map(([k, t]) => `<a href="#/factures${k ? '?f=' + k : ''}" class="${f === k ? 'on' : ''}">${t}</a>`).join('')}</div>`
    + tableau(['Numéro', 'Client', 'Date', 'Échéance', 'Statut', '#Total TTC', '#Reste dû'], l.map(x => `<tr class="clic" data-href="#/factures/${x.id}"><td><b class="mono">${esc(x.numero || 'Brouillon')}</b><br><span class="muted petit">${x.type === 'avoir' ? 'Avoir · ' : ''}${esc(x.objet)}</span></td>
      <td>${esc(x.nx_clients?.nom || '')}</td><td class="petit">${date(x.date_emission)}</td><td class="petit">${x.type === 'facture' && x.statut !== 'brouillon' ? date(x.echeance) : '—'}</td><td>${tagFacture(x)}</td>
      <td class="num">${montant(x.total_ttc)}</td><td class="num">${x.type === 'facture' && ['validee', 'partielle'].includes(x.statut) ? `<b>${montant(x.total_ttc - x.paye)}</b>` : '—'}</td></tr>`),
      vide(f ? 'Aucune facture dans cette catégorie' : 'Aucune facture', 'Créez une facture directement, ou depuis un devis accepté.', peut('facturation') && !f ? '<a class="btn btn-p" href="#/factures/nouvelle">+ Créer une facture</a>' : '')));
  $('#csv').onclick = () => telechargerCsv('factures.csv', ['Numéro', 'Type', 'Client', 'Date', 'Échéance', 'Statut', 'Total TTC', 'Payé'],
    l.filter(x => x.numero).map(x => [x.numero, x.type, x.nx_clients?.nom, x.date_emission, x.echeance, x.statut, String(x.total_ttc).replace('.', ','), String(x.paye).replace('.', ',')]));
  $('#page').onclick = e => { const r = e.target.closest('[data-href]'); if (r) aller(r.dataset.href); };
};

async function nouveauDoc(type) {
  if (!peut(type === 'devis' ? 'ventes' : 'facturation')) return vue(vide('Action réservée', `Votre rôle (${esc(ROLES[ROLE])}) ne permet pas de créer ${type === 'devis' ? 'un devis' : 'une facture'}.`));
  const clients = await q(sb.from('nx_clients').select('id, nom').eq('org_id', ORG.id).neq('statut', 'inactif').order('nom'));
  const pre = param().client;
  vue(entete(type === 'devis' ? 'Nouveau devis' : 'Nouvelle facture') + `<form class="carte f" id="fNv" style="max-width:640px">
    <label>Client<div class="actions" style="flex-wrap:nowrap"><select name="client_id" required>${clients.length ? '' : '<option value="">Aucun client : créez-en un</option>'}${clients.map(c => `<option value="${c.id}" ${c.id === pre ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select>
      ${peut('crm') ? '<button type="button" class="btn" id="nvC">+ Nouveau</button>' : ''}</div></label>
    <label>Objet<input name="objet" maxlength="200" placeholder="Ex. Installation du réseau Wi-Fi"></label>
    <div class="g2"><label>Date<input name="date_emission" type="date" value="${aujourdhui()}" ${type === 'facture' ? `max="${aujourdhui()}"` : ''}></label>
      <label>${type === 'devis' ? 'Valable jusqu’au' : 'Échéance'}<input name="fin" type="date" value="${new Date(Date.now() + (type === 'devis' ? 30 : ORG.delai_paiement) * 864e5).toISOString().slice(0, 10)}"></label></div>
    <div class="actions"><button class="btn btn-p">Créer et ajouter les lignes</button><a class="btn" href="#/${type === 'devis' ? 'devis' : 'factures'}">Annuler</a></div></form>`);
  $('#nvC')?.addEventListener('click', async () => { const id = await nouveauClient(false); if (id) { history.replaceState(null, '', location.hash.split('?')[0] + '?client=' + id); nouveauDoc(type); } });
  $('#fNv').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); if (!d.client_id) return toast('Choisissez un client.', true);
    const v = { org_id: ORG.id, client_id: d.client_id, objet: d.objet.trim(), date_emission: d.date_emission, ...(type === 'devis' ? { validite: d.fin || null } : { echeance: d.fin || null }) };
    try { const r = await q(sb.from(type === 'devis' ? 'nx_devis' : 'nx_factures').insert(v).select('id').single()); location.replace(`#/${type === 'devis' ? 'devis' : 'factures'}/${r.id}`); }
    catch (err) { toast(erreur(err), true); }
  });
}

// ---------------------------------------------------------------- éditeur commun devis / facture
async function editeur(type, id) {
  const table = type === 'devis' ? 'nx_devis' : 'nx_factures', tLignes = type === 'devis' ? 'nx_devis_lignes' : 'nx_facture_lignes', cle = type === 'devis' ? 'devis_id' : 'facture_id';
  const doc = await q(sb.from(table).select('*, nx_clients(*)').eq('id', id).eq('org_id', ORG.id).maybeSingle());
  if (!doc) return vue(vide('Document introuvable', '', `<a class="btn" href="#/${type === 'devis' ? 'devis' : 'factures'}">Retour</a>`));
  const [lignes, produits, clients, paiements, origine, avoirs] = await Promise.all([q(sb.from(tLignes).select('*').eq(cle, id).order('ordre').order('id')),
    q(sb.from('nx_produits').select('*').eq('org_id', ORG.id).eq('actif', true).order('nom')), q(sb.from('nx_clients').select('id, nom').eq('org_id', ORG.id).order('nom')),
    type === 'facture' ? q(sb.from('nx_paiements').select('*').eq('facture_id', id).order('date_paiement')) : [],
    doc.origine_id ? q(sb.from('nx_factures').select('id, numero').eq('id', doc.origine_id).maybeSingle()) : null,
    type === 'facture' && doc.type === 'facture' ? q(sb.from('nx_factures').select('id, numero, statut, total_ttc').eq('origine_id', id)) : []]);
  const editable = doc.statut === 'brouillon' && peut(type === 'devis' ? 'ventes' : 'facturation');
  const nomDoc = type === 'devis' ? 'Devis' : doc.type === 'avoir' ? 'Avoir' : 'Facture';
  const statutTag = type === 'devis' ? tag(ST_DEVIS[doc.statut]) : tagFacture(doc);
  const ligneHtml = (l = { designation: '', quantite: 1, unite: 'unité', prix_ht: '', remise_pct: 0, taux_tva: ORG.franchise_tva ? 0 : ORG.taux_tva_defaut }) => `<tr>
    <td><input name="designation" required maxlength="500" list="produitsL" value="${esc(l.designation)}" aria-label="Désignation" placeholder="Désignation ou produit du catalogue"></td>
    <td class="w-q"><input name="quantite" type="number" step="0.001" required value="${l.quantite}" aria-label="Quantité"></td><td class="w-q"><input name="unite" maxlength="20" value="${esc(l.unite)}" aria-label="Unité"></td>
    <td class="w-p"><input name="prix_ht" type="number" step="0.01" required value="${l.prix_ht}" aria-label="Prix unitaire HT"></td><td class="w-r"><input name="remise_pct" type="number" min="0" max="100" step="0.01" value="${l.remise_pct}" aria-label="Remise %"></td>
    <td class="w-t"><input name="taux_tva" type="number" min="0" max="100" step="0.1" value="${l.taux_tva}" aria-label="TVA %" ${ORG.franchise_tva ? 'disabled' : ''}></td>
    <td class="num ligne-ht">${l.prix_ht === '' ? '' : montant(arrondi(l.quantite * l.prix_ht * (1 - l.remise_pct / 100)))}</td><td><button type="button" class="btn btn-s btn-ko" data-moins aria-label="Retirer la ligne">×</button></td></tr>`;
  const totauxHtml = t => `<div class="totaux"><div><span>Total HT</span><b>${montant(t.ht)}</b></div>${ORG.franchise_tva && type !== 'x' ? '<div class="muted petit"><span>TVA non applicable, art. 293 B du CGI</span></div>' : t.tvas.map(([r, v]) => `<div><span>TVA ${nombre(r)} %</span><span>${montant(v)}</span></div>`).join('')}
    <div class="ttc"><span>Total TTC</span><span>${montant(t.ttc)}</span></div>${type === 'facture' && doc.type === 'facture' && doc.statut !== 'brouillon' ? `<div><span>Déjà payé</span><span>${montant(doc.paye)}</span></div><div><b>Reste dû</b><b>${montant(doc.total_ttc - doc.paye)}</b></div>` : ''}</div>`;
  const totServeur = { ht: doc.total_ht, tva: doc.total_tva, ttc: doc.total_ttc, tvas: calculer(lignes).tvas };

  let boutons = `<a class="btn" href="#/imprimer/${type}/${id}">🖨️ Imprimer / PDF</a>`;
  if (type === 'devis') {
    if (doc.statut === 'brouillon' && peut('ventes')) boutons += `<button class="btn" data-st="envoye">Marquer comme envoyé</button><button class="btn btn-ko" id="suppr">Supprimer</button>`;
    if (doc.statut === 'envoye' && (peut('ventes') || peut('facturation'))) boutons += `<button class="btn btn-p" id="facturer">✓ Accepté : créer la facture</button><button class="btn" data-st="refuse">Refusé</button><button class="btn" data-st="brouillon">Modifier</button>`;
    if (['refuse', 'expire'].includes(doc.statut) && peut('ventes')) boutons += `<button class="btn" data-st="brouillon">Repasser en brouillon</button>`;
    if (doc.facture_id) boutons += `<a class="btn btn-p" href="#/factures/${doc.facture_id}">Voir la facture</a>`;
  } else {
    if (doc.statut === 'brouillon' && peut('facturation')) boutons += `<button class="btn btn-p" id="valider">Valider ${doc.type === 'avoir' ? 'l’avoir' : 'la facture'}</button><button class="btn btn-ko" id="suppr">Supprimer le brouillon</button>`;
    if (doc.type === 'facture' && ['validee', 'partielle'].includes(doc.statut) && peut('facturation')) boutons += `<button class="btn btn-p" id="payer">+ Paiement reçu</button>`;
    if (doc.type === 'facture' && ['validee', 'partielle', 'payee'].includes(doc.statut) && peut('facturation')) boutons += `<button class="btn" id="avoir">Créer un avoir</button>`;
    if (doc.type === 'facture' && ['validee', 'partielle'].includes(doc.statut) && doc.nx_clients?.email) boutons += `<a class="btn" href="mailto:${esc(doc.nx_clients.email)}?subject=${encodeURIComponent('Facture ' + doc.numero)}&body=${encodeURIComponent(`Bonjour,\n\nSauf erreur de notre part, la facture ${doc.numero} d’un montant de ${montant(doc.total_ttc - doc.paye)} reste à régler (échéance le ${date(doc.echeance)}).\n\nMerci d’avance,\n${ORG.nom}`)}">✉️ Relancer</a>`;
  }
  vue(`<p class="petit"><a href="#/${type === 'devis' ? 'devis' : 'factures'}">← ${type === 'devis' ? 'Devis' : 'Factures'}</a></p>`
    + entete(`${nomDoc} <span class="mono">${esc(doc.numero || '(brouillon)')}</span>`, `${statutTag} · ${esc(doc.nx_clients?.nom || '')}${origine ? ` · sur la facture <a href="#/factures/${origine.id}">${esc(origine.numero)}</a>` : ''}${doc.devis_id ? ` · <a href="#/devis/${doc.devis_id}">devis d’origine</a>` : ''}`, boutons)
    + (doc.statut !== 'brouillon' && type === 'facture' ? `<div class="carte petit muted" style="margin-bottom:14px">🔒 ${nomDoc} validé${doc.type === 'avoir' ? '' : 'e'} le ${dateHeure(doc.validee_at)} : ${doc.type === 'avoir' ? 'il' : 'elle'} ne peut plus être modifié${doc.type === 'avoir' ? '' : 'e'} ni supprimé${doc.type === 'avoir' ? '' : 'e'}. Pour corriger, faites un avoir.</div>` : '')
    + `<form id="fDoc" class="grille">
      <div class="carte"><div class="g4">
        <label>Client<select name="client_id" ${editable ? '' : 'disabled'}>${clients.map(c => `<option value="${c.id}" ${c.id === doc.client_id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select></label>
        <label style="grid-column:span 2">Objet<input name="objet" maxlength="200" value="${esc(doc.objet)}" ${editable ? '' : 'disabled'}></label>
        <label>Date<input name="date_emission" type="date" value="${doc.date_emission}" ${editable ? '' : 'disabled'}></label></div>
        ${type === 'devis' ? `<div class="g4" style="margin-top:14px"><label>Valable jusqu’au<input name="validite" type="date" value="${doc.validite || ''}" ${editable ? '' : 'disabled'}></label></div>`
          : doc.type === 'facture' ? `<div class="g4" style="margin-top:14px"><label>Échéance<input name="echeance" type="date" value="${doc.echeance || ''}" ${editable ? '' : 'disabled'}></label></div>` : ''}</div>
      <div class="carte" style="overflow-x:auto"><h2>Lignes</h2>
        ${editable ? `<table class="tab doc-lignes" id="lignes"><thead><tr><th>Désignation</th><th>Qté</th><th>Unité</th><th>Prix HT</th><th>Remise %</th><th>TVA %</th><th class="num">Total HT</th><th></th></tr></thead>
          <tbody>${(lignes.length ? lignes : [undefined]).map(l => ligneHtml(l)).join('')}</tbody></table><datalist id="produitsL">${produits.map(p => `<option value="${esc(p.nom)}">${montant(p.prix_ht)} / ${esc(p.unite)}</option>`).join('')}</datalist>
          <p><button type="button" class="btn btn-s" id="plus">+ Ajouter une ligne</button></p>`
        : `<table class="tab"><thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">Prix HT</th><th class="num">Remise</th><th class="num">TVA</th><th class="num">Total HT</th></tr></thead><tbody>${lignes.map(l => `<tr><td>${esc(l.designation)}</td>
          <td class="num">${nombre(l.quantite)} ${esc(l.unite)}</td><td class="num">${montant(l.prix_ht)}</td><td class="num">${Number(l.remise_pct) ? nombre(l.remise_pct) + ' %' : ''}</td><td class="num">${nombre(l.taux_tva)} %</td>
          <td class="num">${montant(arrondi(l.quantite * l.prix_ht * (1 - l.remise_pct / 100)))}</td></tr>`).join('')}</tbody></table>`}
        <div id="totaux">${totauxHtml(totServeur)}</div></div>
      <div class="carte g2"><label>Notes pour le client<textarea name="notes" maxlength="2000" ${editable ? '' : 'disabled'}>${esc(doc.notes)}</textarea></label>
        <label>Conditions (paiement, pénalités)<textarea name="conditions" maxlength="2000" ${editable ? '' : 'disabled'}>${esc(doc.conditions)}</textarea></label></div>
      ${editable ? '<div class="actions"><button class="btn btn-p">Enregistrer</button><span class="muted petit">Les totaux définitifs sont calculés par NEXORA à l’enregistrement.</span></div>' : ''}</form>
    ${type === 'facture' && doc.type === 'facture' && doc.statut !== 'brouillon' ? `<div class="carte" style="margin-top:16px"><h2>Paiements</h2>${paiements.length ? `<table class="tab">${paiements.map(p => `<tr><td>${date(p.date_paiement)}</td><td>${MOYENS[p.moyen]}${p.reference ? ` · <span class="mono petit">${esc(p.reference)}</span>` : ''}</td>
        <td class="num"><b>${montant(p.montant)}</b></td><td class="num">${peut('facturation') ? `<button class="btn btn-s btn-ko" data-annuler-p="${p.id}">Annuler</button>` : ''}</td></tr>`).join('')}</table>` : '<p class="muted">Aucun paiement enregistré.</p>'}
      ${avoirs.length ? `<h3 style="margin-top:14px">Avoirs</h3>${avoirs.map(a => `<p><a href="#/factures/${a.id}">${esc(a.numero || 'Avoir en brouillon')}</a> · ${montant(a.total_ttc)}</p>`).join('')}` : ''}</div>` : ''}`);

  const f = $('#fDoc');
  const lireLignes = () => $$('#lignes tbody tr').map((tr, i) => { const v = n => $(`[name=${n}]`, tr).value; return { ordre: i + 1, designation: v('designation').trim(), quantite: Number(v('quantite')), unite: v('unite').trim() || 'unité', prix_ht: Number(v('prix_ht')), remise_pct: Number(v('remise_pct') || 0), taux_tva: ORG.franchise_tva ? 0 : Number(v('taux_tva') || 0) }; }).filter(l => l.designation);
  const apercu = () => { const l = lireLignes(); $$('#lignes tbody tr').forEach(tr => { const q2 = Number($('[name=quantite]', tr).value), p = $('[name=prix_ht]', tr).value, r = Number($('[name=remise_pct]', tr).value || 0); $('.ligne-ht', tr).textContent = p === '' ? '' : montant(arrondi(q2 * Number(p) * (1 - r / 100))); }); $('#totaux').innerHTML = totauxHtml(calculer(l)); };
  if (editable) {
    $('#lignes').addEventListener('input', e => {
      if (e.target.name === 'designation') { const p = produits.find(x => x.nom === e.target.value); if (p) { const tr = e.target.closest('tr'); $('[name=prix_ht]', tr).value = p.prix_ht; $('[name=unite]', tr).value = p.unite; if (!ORG.franchise_tva) $('[name=taux_tva]', tr).value = p.taux_tva; } }
      apercu();
    });
    $('#lignes').addEventListener('click', e => { if (e.target.closest('[data-moins]')) { e.target.closest('tr').remove(); if (!$$('#lignes tbody tr').length) $('#lignes tbody').insertAdjacentHTML('beforeend', ligneHtml()); apercu(); } });
    $('#plus').onclick = () => { $('#lignes tbody').insertAdjacentHTML('beforeend', ligneHtml()); $$('#lignes tbody tr').at(-1).querySelector('input').focus(); };
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!f.reportValidity()) return;
      const d = Object.fromEntries(new FormData(f)), l = lireLignes();
      if (type === 'devis' && l.some(x => x.quantite <= 0)) return toast('Les quantités d’un devis doivent être positives.', true);
      const b = $('button.btn-p', f); b.disabled = true;
      try {
        await q(sb.from(table).update({ client_id: d.client_id, objet: d.objet.trim(), date_emission: d.date_emission, notes: d.notes, conditions: d.conditions, ...(type === 'devis' ? { validite: d.validite || null } : doc.type === 'facture' ? { echeance: d.echeance || null } : {}) }).eq('id', id));
        await q(sb.from(tLignes).delete().eq(cle, id));
        if (l.length) await q(sb.from(tLignes).insert(l.map(x => ({ ...x, [cle]: id, org_id: ORG.id }))));
        toast('Enregistré.'); editeur(type, id);
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    });
  }
  const page = $('#page');
  page.onclick = async e => {
    const b = e.target.closest('button'); if (!b || b.form === f && b.type === 'submit') return;
    try {
      if (b.dataset.st) { await q(sb.from('nx_devis').update({ statut: b.dataset.st }).eq('id', id)); toast('Statut mis à jour.'); return editeur(type, id); }
      if (b.id === 'facturer') { const fid = await q(sb.rpc('nx_facturer_devis', { did: id })); toast('Facture créée en brouillon : vérifiez-la puis validez-la.'); return aller('#/factures/' + fid); }
      if (b.id === 'suppr' && await confirmer('Supprimer', `Supprimer ce ${type === 'devis' ? 'devis' : 'brouillon'} ?`, 'Supprimer')) { await q(sb.from(table).delete().eq('id', id)); toast('Supprimé.'); return aller(`#/${type === 'devis' ? 'devis' : 'factures'}`); }
      if (b.id === 'valider') {
        if (!await confirmer(`Valider ${doc.type === 'avoir' ? 'l’avoir' : 'la facture'}`, `Un numéro définitif va être attribué. Ensuite, ${doc.type === 'avoir' ? 'l’avoir' : 'la facture'} ne pourra plus être modifié${doc.type === 'avoir' ? '' : 'e'} ni supprimé${doc.type === 'avoir' ? '' : 'e'} (obligation légale). Pensez à enregistrer vos dernières modifications avant.`, 'Valider définitivement')) return;
        const n = await q(sb.rpc('nx_valider_facture', { fid: id })); toast(`${nomDoc} ${n} validé${doc.type === 'avoir' ? '' : 'e'}.`); return editeur(type, id);
      }
      if (b.id === 'payer') {
        const d = await modale('Paiement reçu', `<div class="g2"><label>Montant (€)<input name="montant" type="number" step="0.01" min="0.01" max="${doc.total_ttc - doc.paye}" required value="${(doc.total_ttc - doc.paye).toFixed(2)}"></label>
          <label>Date<input name="date" type="date" required max="${aujourdhui()}" value="${aujourdhui()}"></label></div><div class="g2"><label>Moyen<select name="moyen">${Object.entries(MOYENS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label>
          <label>Référence <span class="muted">(facultatif)</span><input name="ref" maxlength="80" placeholder="N° de chèque, libellé du virement…"></label></div>`);
        if (!d) return;
        await q(sb.rpc('nx_paiement', { fid: id, somme: Number(d.montant), jour: d.date, moyen_p: d.moyen, ref: d.ref || null })); toast('Paiement enregistré.'); return editeur(type, id);
      }
      if (b.dataset.annulerP && await confirmer('Annuler le paiement', 'Ce paiement sera retiré (l’annulation est notée dans le journal).', 'Annuler le paiement')) { await q(sb.rpc('nx_annuler_paiement', { pid: b.dataset.annulerP })); toast('Paiement annulé.'); return editeur(type, id); }
      if (b.id === 'avoir' && await confirmer('Créer un avoir', 'Un avoir en brouillon reprenant toutes les lignes en négatif va être créé. Vous pourrez l’ajuster (avoir partiel) avant de le valider.', 'Créer l’avoir')) {
        const aid = await q(sb.rpc('nx_creer_avoir', { fid: id })); return aller('#/factures/' + aid);
      }
    } catch (err) { toast(erreur(err), true); }
  };
}

// ---------------------------------------------------------------- impression (PDF via le navigateur)
NX.pages.imprimer = async (type, id) => {
  const doc = await q(sb.from(type === 'devis' ? 'nx_devis' : 'nx_factures').select('*, nx_clients(*)').eq('id', id).eq('org_id', ORG.id).maybeSingle());
  if (!doc) return vue(vide('Document introuvable'));
  const lignes = await q(sb.from(type === 'devis' ? 'nx_devis_lignes' : 'nx_facture_lignes').select('*').eq(type === 'devis' ? 'devis_id' : 'facture_id', id).order('ordre').order('id'));
  const origine = doc.origine_id ? await q(sb.from('nx_factures').select('numero, date_emission').eq('id', doc.origine_id).maybeSingle()) : null;
  const o = doc.org_snap || ORG, c = doc.client_snap || doc.nx_clients || {}, t = calculer(lignes), devise = o.devise || ORG.devise;
  const titre = type === 'devis' ? 'DEVIS' : doc.type === 'avoir' ? 'AVOIR' : 'FACTURE', brouillon = doc.statut === 'brouillon' && type === 'facture';
  const adr = x => [x.adresse, [x.code_postal, x.ville].filter(Boolean).join(' '), x.pays && x.pays !== 'France' ? x.pays : ''].filter(Boolean).map(esc).join('<br>');
  document.title = `${titre} ${doc.numero || 'brouillon'} — ${o.nom}`;
  vue(`<div class="actions no-print" style="margin-bottom:14px"><a class="btn" href="#/${type === 'devis' ? 'devis' : 'factures'}/${id}">← Retour</a><button class="btn btn-p" id="imp">🖨️ Imprimer ou enregistrer en PDF</button>
      <span class="muted petit">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ».</span></div>
    <article class="feuille"><div class="tete"><div><b style="font-size:18px">${esc(o.nom)}</b>${o.forme ? ` <span>(${esc(o.forme)})</span>` : ''}<br>${adr(o)}${o.telephone ? '<br>' + esc(o.telephone) : ''}${o.email ? '<br>' + esc(o.email) : ''}</div>
      <div style="text-align:right"><h1>${titre}</h1><b class="mono">${esc(doc.numero || '')}</b>${brouillon ? '<div class="filigrane">BROUILLON — DOCUMENT NON VALABLE</div>' : ''}<br>Date : ${date(doc.date_emission)}
        ${type === 'devis' ? `<br>Valable jusqu’au : ${date(doc.validite)}` : doc.type === 'facture' ? `<br>Échéance : ${date(doc.echeance)}` : ''}${origine ? `<br>Avoir sur la facture ${esc(origine.numero)} du ${date(origine.date_emission)}` : ''}</div></div>
    <div class="parties"><div><b>Émetteur</b><br>${esc(o.nom)}${o.siret ? `<br>SIRET : ${esc(o.siret)}` : ''}${o.tva_intra ? `<br>TVA : ${esc(o.tva_intra)}` : ''}</div>
      <div><b>Client</b><br>${esc(c.nom || '')}<br>${adr(c)}${c.siret ? `<br>SIRET : ${esc(c.siret)}` : ''}${c.tva_intra ? `<br>TVA : ${esc(c.tva_intra)}` : ''}</div></div>
    ${doc.objet ? `<p><b>Objet :</b> ${esc(doc.objet)}</p>` : ''}
    <table><thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">Prix unit. HT</th><th class="num">Remise</th>${o.franchise_tva ? '' : '<th class="num">TVA</th>'}<th class="num">Total HT</th></tr></thead>
      <tbody>${lignes.map(l => `<tr><td>${esc(l.designation)}</td><td class="num">${nombre(l.quantite)} ${esc(l.unite)}</td><td class="num">${montant(l.prix_ht, devise)}</td><td class="num">${Number(l.remise_pct) ? nombre(l.remise_pct) + ' %' : ''}</td>
        ${o.franchise_tva ? '' : `<td class="num">${nombre(l.taux_tva)} %</td>`}<td class="num">${montant(arrondi(l.quantite * l.prix_ht * (1 - l.remise_pct / 100)), devise)}</td></tr>`).join('')}</tbody></table>
    <div class="totaux"><div><span>Total HT</span><b>${montant(doc.total_ht, devise)}</b></div>${o.franchise_tva ? '' : t.tvas.map(([r, v]) => `<div><span>TVA ${nombre(r)} %</span><span>${montant(v, devise)}</span></div>`).join('')}
      <div class="ttc"><span>Total TTC</span><span>${montant(doc.total_ttc, devise)}</span></div>${type === 'facture' && doc.type === 'facture' && Number(doc.paye) ? `<div><span>Déjà réglé</span><span>${montant(doc.paye, devise)}</span></div><div><b>Net à payer</b><b>${montant(doc.total_ttc - doc.paye, devise)}</b></div>` : ''}</div>
    ${type === 'devis' ? '<p style="margin-top:30px">Bon pour accord — date et signature du client :</p><div style="height:70px;border:1px dashed #bbb;border-radius:8px;max-width:320px"></div>' : ''}
    <div class="mentions">${o.franchise_tva ? 'TVA non applicable, art. 293 B du CGI.\n' : ''}${doc.notes ? esc(doc.notes) + '\n' : ''}${esc(doc.conditions)}${o.iban && type === 'facture' && doc.type === 'facture' ? `\nRèglement par virement : IBAN ${esc(o.iban)}` : ''}</div></article>`);
  $('#imp').onclick = () => window.print();
};
