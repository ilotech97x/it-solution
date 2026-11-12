/* NEXORA — gestion d'entreprise (ERP) : dépenses et fournisseurs, stock, trésorerie, abonnements, relances, employés et absences, rapports.
   TVA, stock, soldes, prévision et résultat sont calculés par la base (erp.sql) ; cet écran ne fait qu'afficher et saisir. */
'use strict';
const CATS_DEP = { marchandises: '📦 Marchandises', sous_traitance: '🤝 Sous-traitance', loyer: '🏢 Loyer', energie: '⚡ Énergie, eau', telecom: '📶 Téléphone, internet',
  carburant: '⛽ Carburant', deplacement: '✈️ Déplacements', assurance: '🛡️ Assurances', honoraires: '⚖️ Honoraires', materiel: '🖥️ Matériel', fournitures: '📎 Fournitures',
  publicite: '📣 Publicité', banque: '🏦 Frais bancaires', salaires: '👥 Salaires et charges', impots: '🧾 Impôts et taxes', entretien: '🔧 Entretien, réparations', autre: '• Autre' };
const ST_DEP = { a_payer: ['att', 'À payer'], payee: ['ok', 'Payée'] };
const FREQ = { mensuel: 'Chaque mois', trimestriel: 'Chaque trimestre', semestriel: 'Chaque semestre', annuel: 'Chaque année' };
const CONTRATS = { cdi: 'CDI', cdd: 'CDD', apprentissage: 'Apprentissage', stage: 'Stage', interim: 'Intérim', independant: 'Indépendant', autre: 'Autre' };
const ABSENCES = { conges: '🌴 Congés payés', maladie: '🤒 Maladie', rtt: '⏸️ RTT', sans_solde: 'Sans solde', formation: '🎓 Formation', evenement_familial: '👪 Événement familial', autre: 'Autre' };
const ST_ABS = { demande: ['att', 'À valider'], validee: ['ok', 'Validée'], refusee: ['ko', 'Refusée'] };
const OPERATIONS = { apport: 'Apport en capital', emprunt: 'Emprunt reçu', remboursement: 'Remboursement d’emprunt', frais_bancaires: 'Frais bancaires', virement_interne: 'Virement entre comptes', subvention: 'Subvention', autre: 'Autre' };
const opts = (o, v) => Object.entries(o).map(([k, t]) => `<option value="${k}" ${k === v ? 'selected' : ''}>${esc(t)}</option>`).join('');
const refuse = (droit, texte) => peut(droit) ? false : (vue(vide('Accès réservé', texte, '<a class="btn" href="#/">Tableau de bord</a>')), true);
const nul = v => (v ?? '') === '' ? null : v;
// numéro international pour WhatsApp, selon l'indicatif des mobiles d'outre-mer (sinon France hexagonale)
const numeroWa = t => { const d = String(t).replace(/[^0-9]/g, '').replace(/^00/, ''); if (!d.startsWith('0')) return d;
  const ind = { '0690': '590', '0691': '590', '0694': '594', '0696': '596', '0697': '596', '0692': '262', '0693': '262', '0639': '262' }[d.slice(0, 4)] || '33';
  return ind + d.slice(1); };

// ---------------------------------------------------------------- dépenses
NX.pages.depenses = async () => {
  const [l, fours, comptes] = await Promise.all([q(sb.from('nx_depenses').select('*, nx_fournisseurs(nom)').eq('org_id', ORG.id).order('date_depense', { ascending: false }).limit(500)),
    q(sb.from('nx_fournisseurs').select('id, nom').eq('org_id', ORG.id).eq('actif', true).order('nom')), peut('tresorerie') ? q(sb.from('nx_comptes').select('id, nom').eq('org_id', ORG.id).eq('actif', true)) : []]);
  const auj = aujourdhui(), aPayer = l.filter(d => d.statut === 'a_payer'), retard = aPayer.filter(d => d.echeance && d.echeance < auj);
  const dessiner = () => {
    const t = ($('#rech')?.value || '').toLowerCase(), s = $('#stat').value, c = $('#cat').value, m = $('#mois').value;
    const v = l.filter(d => (!s || d.statut === s) && (!c || d.categorie === c) && (!m || d.date_depense.startsWith(m)) && (!t || [d.libelle, d.numero_piece, d.nx_fournisseurs?.nom].join(' ').toLowerCase().includes(t)));
    $('#liste').innerHTML = tableau(['Date', 'Dépense', 'Catégorie', '#HT', '#TVA', '#TTC', 'Statut', ''], v.map(d => `<tr><td>${date(d.date_depense)}</td>
      <td><b>${esc(d.libelle)}</b><br><span class="muted petit">${esc(d.nx_fournisseurs?.nom || 'Sans fournisseur')}${d.numero_piece ? ' · n° ' + esc(d.numero_piece) : ''}${d.justificatif ? ` · <a href="${esc(d.justificatif)}" target="_blank" rel="noopener">justificatif</a>` : ''}</span></td>
      <td class="petit">${esc(CATS_DEP[d.categorie])}</td><td class="num">${montant(d.montant_ht)}</td><td class="num">${montant(d.montant_tva)}${Number(d.octroi_mer) ? `<br><span class="muted petit">+ octroi ${montant(d.octroi_mer)}</span>` : ''}</td><td class="num"><b>${montant(d.montant_ttc)}</b></td>
      <td>${tag(ST_DEP[d.statut])}${d.statut === 'a_payer' && d.echeance ? `<br><span class="petit" style="${d.echeance < auj ? 'color:var(--ko)' : ''}">échéance ${date(d.echeance)}</span>` : ''}</td>
      <td class="num">${peut('achats') ? `${d.statut === 'a_payer' ? `<button class="btn btn-s" data-payer="${d.id}">Payée</button>` : ''}<button class="btn btn-s" data-modif="${d.id}">Modifier</button>` : ''}</td></tr>`),
      l.length ? vide('Aucun résultat', 'Modifiez la recherche ou les filtres.') : vide('Aucune dépense enregistrée', 'Saisissez vos factures fournisseurs, frais et charges : vous suivez ce qui reste à payer, votre TVA déductible et votre vrai résultat.', peut('achats') ? '<button class="btn btn-p" data-nouveau>+ Ajouter une dépense</button>' : ''));
    $('#tot').textContent = `${v.length} dépense${v.length > 1 ? 's' : ''} · ${montant(v.reduce((x, d) => x + Number(d.montant_ttc), 0))} TTC`;
  };
  const mois = [...new Set(l.map(d => d.date_depense.slice(0, 7)))];
  vue(entete('Dépenses et achats', `À payer : <b>${montant(aPayer.reduce((x, d) => x + Number(d.montant_ttc), 0))}</b>${retard.length ? ` · <span style="color:var(--ko)">${retard.length} en retard</span>` : ''}`,
      `<button class="btn" id="csv">Exporter (CSV)</button>${peut('achats') ? '<button class="btn btn-p" data-nouveau>+ Dépense</button>' : ''}`)
    + `<div class="filtres"><input id="rech" type="search" placeholder="Libellé, fournisseur, n° de pièce…" aria-label="Recherche"><select id="stat" aria-label="Statut"><option value="">Toutes</option>${opts({ a_payer: 'À payer', payee: 'Payées' })}</select>
      <select id="cat" aria-label="Catégorie"><option value="">Toutes catégories</option>${opts(CATS_DEP)}</select><select id="mois" aria-label="Mois"><option value="">Toute période</option>${mois.map(m => `<option value="${m}">${new Date(m + '-15').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</option>`).join('')}</select></div>
      <p class="muted petit" id="tot"></p><div id="liste"></div>`);
  ['rech', 'stat', 'cat', 'mois'].forEach(i => { $('#' + i).oninput = dessiner; }); dessiner();
  const form = async (d = { categorie: 'autre', taux_tva: ORG.franchise_tva ? 0 : ORG.taux_tva_defaut, date_depense: auj, statut: 'a_payer', octroi_mer: 0 }) => {
    const r = await modale(d.id ? 'Modifier la dépense' : 'Nouvelle dépense', `<div class="g2"><label>Libellé<input name="libelle" required maxlength="200" value="${esc(d.libelle || '')}" placeholder="Ex. Facture électricité d’octobre"></label>
        <label>Fournisseur<select name="fournisseur_id"><option value="">— Aucun —</option>${fours.map(f => `<option value="${f.id}" ${f.id === d.fournisseur_id ? 'selected' : ''}>${esc(f.nom)}</option>`).join('')}</select></label></div>
      <div class="g3"><label>Catégorie<select name="categorie">${opts(CATS_DEP, d.categorie)}</select></label><label>Date<input name="date_depense" type="date" required value="${d.date_depense}"></label><label>N° de facture fournisseur<input name="numero_piece" maxlength="60" value="${esc(d.numero_piece || '')}"></label></div>
      <div class="g3"><label>Montant HT (€)<input name="montant_ht" type="number" step="0.01" min="0" required value="${d.montant_ht ?? ''}"></label><label>TVA (%)<input name="taux_tva" type="number" min="0" max="100" step="0.1" value="${d.taux_tva}" ${ORG.franchise_tva ? 'disabled' : ''}></label>
        <label>Octroi de mer (€) <span class="muted petit">import</span><input name="octroi_mer" type="number" step="0.01" min="0" value="${d.octroi_mer || 0}"></label></div>
      <div class="g3"><label>Échéance<input name="echeance" type="date" value="${d.echeance || ''}"></label><label>Statut<select name="statut">${opts({ a_payer: 'À payer', payee: 'Déjà payée' }, d.statut)}</select></label>
        <label>Moyen de paiement<select name="moyen"><option value="">—</option>${opts(MOYENS, d.moyen)}</select></label></div>
      ${comptes.length ? `<label>Compte débité<select name="compte_id"><option value="">Automatique (banque, ou caisse pour les espèces)</option>${comptes.map(c => `<option value="${c.id}" ${c.id === d.compte_id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select></label>` : ''}
      <label>Lien du justificatif <span class="muted petit">(facture en PDF sur votre Drive, par exemple)</span><input name="justificatif" type="url" maxlength="500" placeholder="https://…" value="${esc(d.justificatif || '')}"></label>
      <label>Notes<input name="notes" maxlength="2000" value="${esc(d.notes || '')}"></label>`, { large: true });
    if (!r) return;
    const v = { libelle: r.libelle.trim(), fournisseur_id: nul(r.fournisseur_id), categorie: r.categorie, date_depense: r.date_depense, numero_piece: nul(r.numero_piece.trim()), montant_ht: Number(r.montant_ht),
      taux_tva: ORG.franchise_tva ? 0 : Number(r.taux_tva || 0), octroi_mer: Number(r.octroi_mer || 0), echeance: nul(r.echeance), statut: r.statut, moyen: nul(r.moyen), compte_id: nul(r.compte_id),
      justificatif: nul(r.justificatif?.trim()), notes: r.notes.trim() };
    try { if (d.id) await q(sb.from('nx_depenses').update(v).eq('id', d.id)); else await q(sb.from('nx_depenses').insert({ org_id: ORG.id, ...v })); toast('Dépense enregistrée.'); NX.pages.depenses(); } catch (err) { toast(erreur(err), true); }
  };
  $('#csv').onclick = () => telechargerCsv('depenses.csv', ['Date', 'Libellé', 'Fournisseur', 'N° pièce', 'Catégorie', 'HT', 'Taux TVA', 'TVA', 'Octroi de mer', 'TTC', 'Statut', 'Payée le', 'Moyen'],
    l.map(d => [d.date_depense, d.libelle, d.nx_fournisseurs?.nom, d.numero_piece, CATS_DEP[d.categorie], d.montant_ht, d.taux_tva, d.montant_tva, d.octroi_mer, d.montant_ttc, ST_DEP[d.statut][1], d.date_paiement, d.moyen]));
  $('#page').onclick = async e => {
    if (e.target.closest('[data-nouveau]')) return form();
    const m = e.target.closest('[data-modif]'); if (m) return form(l.find(d => d.id === m.dataset.modif));
    const p = e.target.closest('[data-payer]');
    if (p) {
      const r = await modale('Marquer comme payée', `<div class="g2"><label>Date du paiement<input name="date_paiement" type="date" required value="${auj}" max="${auj}"></label><label>Moyen<select name="moyen">${opts(MOYENS, 'virement')}</select></label></div>
        ${comptes.length ? `<label>Compte débité<select name="compte_id"><option value="">Automatique</option>${comptes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}</select></label>` : ''}`, { valider: 'Payée' });
      if (!r) return;
      try { await q(sb.from('nx_depenses').update({ statut: 'payee', date_paiement: r.date_paiement, moyen: r.moyen, compte_id: nul(r.compte_id) }).eq('id', p.dataset.payer)); toast('Dépense payée.'); NX.pages.depenses(); } catch (err) { toast(erreur(err), true); }
    }
  };
};

// ---------------------------------------------------------------- fournisseurs
NX.pages.fournisseurs = async () => {
  const [l, deps] = await Promise.all([q(sb.from('nx_fournisseurs').select('*').eq('org_id', ORG.id).order('nom')),
    q(sb.from('nx_depenses').select('fournisseur_id, montant_ttc, statut, date_depense').eq('org_id', ORG.id).not('fournisseur_id', 'is', null))]);
  const an = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const stat = id => deps.filter(d => d.fournisseur_id === id).reduce((x, d) => [x[0] + (d.date_depense >= an ? Number(d.montant_ttc) : 0), x[1] + (d.statut === 'a_payer' ? Number(d.montant_ttc) : 0)], [0, 0]);
  vue(entete('Fournisseurs', `${l.filter(f => f.actif).length} fournisseurs actifs`, peut('achats') ? '<button class="btn btn-p" data-nouveau>+ Fournisseur</button>' : '')
    + tableau(['Fournisseur', 'Contact', 'Ville', '#Achats 12 mois', '#À payer', ''], l.map(f => { const [a, p] = stat(f.id); return `<tr style="${f.actif ? '' : 'opacity:.55'}"><td><b>${esc(f.nom)}</b>${f.categorie ? `<br><span class="muted petit">${esc(f.categorie)}</span>` : ''}</td>
      <td class="petit">${esc(f.email || '')}<br>${esc(f.telephone || '')}</td><td>${esc(f.ville || '')}</td><td class="num">${a ? montant(a) : '—'}</td><td class="num">${p ? `<b>${montant(p)}</b>` : '—'}</td>
      <td class="num">${peut('achats') ? `<button class="btn btn-s" data-modif="${f.id}">Modifier</button>` : ''}</td></tr>`; }),
      vide('Aucun fournisseur', 'Enregistrez vos fournisseurs : grossistes, énergie, téléphonie, comptable… pour rattacher vos dépenses et votre stock.', peut('achats') ? '<button class="btn btn-p" data-nouveau>+ Ajouter un fournisseur</button>' : '')));
  const form = async (f = { actif: true }) => {
    const r = await modale(f.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur', `<div class="g2"><label>Nom<input name="nom" required maxlength="120" value="${esc(f.nom || '')}"></label><label>Catégorie<input name="categorie" maxlength="60" value="${esc(f.categorie || '')}" placeholder="Matériel, énergie…"></label></div>
      <div class="g3"><label>Email<input name="email" type="email" maxlength="120" value="${esc(f.email || '')}"></label><label>Téléphone<input name="telephone" maxlength="30" value="${esc(f.telephone || '')}"></label><label>Ville<input name="ville" maxlength="80" value="${esc(f.ville || '')}"></label></div>
      <div class="g3"><label>SIRET<input name="siret" maxlength="17" pattern="[0-9 ]{9,17}" value="${esc(f.siret || '')}"></label><label>TVA intracom.<input name="tva_intra" maxlength="20" value="${esc(f.tva_intra || '')}"></label><label>IBAN<input name="iban" maxlength="40" value="${esc(f.iban || '')}"></label></div>
      <label>Adresse<input name="adresse" maxlength="200" value="${esc(f.adresse || '')}"></label><label>Notes<input name="notes" maxlength="2000" value="${esc(f.notes || '')}"></label>
      <label class="case"><input type="checkbox" name="actif" ${f.actif ? 'checked' : ''}> Fournisseur actif</label>`, { large: true });
    if (!r) return;
    const v = { nom: r.nom.trim(), categorie: nul(r.categorie.trim()), email: nul(r.email.trim()), telephone: nul(r.telephone.trim()), ville: nul(r.ville.trim()), siret: nul(r.siret.trim()),
      tva_intra: nul(r.tva_intra.trim()), iban: nul(r.iban.trim()), adresse: nul(r.adresse.trim()), notes: r.notes.trim(), actif: !!r.actif };
    try { if (f.id) await q(sb.from('nx_fournisseurs').update(v).eq('id', f.id)); else await q(sb.from('nx_fournisseurs').insert({ org_id: ORG.id, ...v })); toast('Fournisseur enregistré.'); NX.pages.fournisseurs(); } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = e => { if (e.target.closest('[data-nouveau]')) return form(); const m = e.target.closest('[data-modif]'); if (m) form(l.find(f => f.id === m.dataset.modif)); };
};

// ---------------------------------------------------------------- stock
NX.pages.stock = async () => {
  const tous = await q(sb.from('nx_produits').select('*').eq('org_id', ORG.id).eq('actif', true).order('nom'));
  const l = tous.filter(p => p.stock_gere), bas = l.filter(p => Number(p.stock) <= Number(p.seuil_alerte || 0));
  const valeur = l.reduce((x, p) => x + Math.max(0, Number(p.stock)) * Number(p.prix_achat_ht || 0), 0);
  vue(entete('Stock et inventaire', 'Les ventes validées sortent du stock automatiquement ; les avoirs le remettent.', peut('stock') ? '<button class="btn btn-p" id="suivre">+ Suivre un article</button>' : '')
    + `<div class="kpis"><div class="kpi"><span>Articles suivis</span><b>${l.length}</b><small>${tous.length - l.length} autres prestations ou produits</small></div>
      <div class="kpi"><span>Valeur du stock (prix d’achat)</span><b>${montant(valeur)}</b><small>quantité × dernier prix d’achat HT</small></div>
      <div class="kpi"><span>À réapprovisionner</span><b style="${bas.length ? 'color:var(--ko)' : ''}">${bas.length}</b><small>${bas.length ? esc(bas.slice(0, 3).map(p => p.nom).join(', ')) : 'aucun article sous le seuil'}</small></div></div>`
    + tableau(['Article', '#En stock', '#Seuil', '#Prix d’achat', '#Valeur', ''], l.map(p => `<tr><td><b>${esc(p.nom)}</b>${p.reference ? `<br><span class="muted petit mono">${esc(p.reference)}</span>` : ''}</td>
      <td class="num"><b style="${Number(p.stock) <= Number(p.seuil_alerte || 0) ? 'color:var(--ko)' : ''}">${nombre(p.stock)}</b> <span class="muted petit">${esc(p.unite)}</span></td><td class="num">${p.seuil_alerte != null ? nombre(p.seuil_alerte) : '—'}</td>
      <td class="num">${p.prix_achat_ht != null ? montant(p.prix_achat_ht) : '—'}</td><td class="num">${montant(Math.max(0, Number(p.stock)) * Number(p.prix_achat_ht || 0))}</td>
      <td class="num">${peut('stock') ? `<button class="btn btn-s" data-mvt="entree" data-p="${p.id}">+ Entrée</button><button class="btn btn-s" data-mvt="sortie" data-p="${p.id}">− Sortie</button><button class="btn btn-s" data-mvt="inventaire" data-p="${p.id}">Inventaire</button>` : ''}<button class="btn btn-s" data-histo="${p.id}">Historique</button></td></tr>`),
      vide('Aucun article suivi en stock', 'Activez le suivi pour vos produits (matériel, pièces, marchandises) : NEXORA décompte les ventes et vous prévient avant la rupture.', peut('stock') ? '<button class="btn btn-p" id="suivre2">+ Suivre un article</button>' : '')));
  $('#page').onclick = async e => {
    if (e.target.id === 'suivre' || e.target.id === 'suivre2') {
      const libres = tous.filter(p => !p.stock_gere);
      if (!libres.length) return toast('Ajoutez d’abord le produit dans le Catalogue.', true);
      const r = await modale('Suivre un article en stock', `<label>Produit du catalogue<select name="p">${libres.map(p => `<option value="${p.id}">${esc(p.nom)}</option>`).join('')}</select></label>
        <div class="g3"><label>Quantité en stock aujourd’hui<input name="qte" type="number" min="0" step="any" required value="0"></label><label>Seuil d’alerte<input name="seuil" type="number" min="0" step="any" value="1"></label><label>Prix d’achat HT (€)<input name="prix" type="number" min="0" step="0.01"></label></div>`, { valider: 'Suivre' });
      if (!r) return;
      try {
        await q(sb.from('nx_produits').update({ type: 'bien', stock_gere: true, seuil_alerte: Number(r.seuil || 0), prix_achat_ht: r.prix === '' ? null : Number(r.prix) }).eq('id', r.p));
        if (Number(r.qte) > 0) await q(sb.rpc('nx_mouvement_stock', { pid: r.p, type_m: 'inventaire', qte: Number(r.qte), prix: null, motif_m: 'Stock de départ' }));
        toast('Article suivi.'); NX.pages.stock();
      } catch (err) { toast(erreur(err), true); }
    }
    const m = e.target.closest('[data-mvt]');
    if (m) {
      const p = l.find(x => x.id === m.dataset.p), t = m.dataset.mvt;
      const r = await modale(`${{ entree: 'Entrée en stock', sortie: 'Sortie de stock', inventaire: 'Inventaire' }[t]} · ${p.nom}`, `<p class="muted" style="margin:0">En stock : <b>${nombre(p.stock)} ${esc(p.unite)}</b></p>
        <div class="g2"><label>${t === 'inventaire' ? 'Quantité comptée' : 'Quantité'}<input name="qte" type="number" min="0" step="any" required></label>${t === 'entree' ? `<label>Prix d’achat HT unitaire (€)<input name="prix" type="number" min="0" step="0.01" value="${p.prix_achat_ht ?? ''}"></label>` : ''}</div>
        <label>Motif<input name="motif" maxlength="200" placeholder="${{ entree: 'Réception de commande, n° de bon…', sortie: 'Casse, usage interne, échantillon…', inventaire: 'Inventaire de fin de mois' }[t]}"></label>`);
      if (!r) return;
      try { const n = await q(sb.rpc('nx_mouvement_stock', { pid: p.id, type_m: t, qte: Number(r.qte), prix: r.prix ? Number(r.prix) : null, motif_m: r.motif || null })); toast(`Stock : ${nombre(n)} ${p.unite}`); NX.pages.stock(); } catch (err) { toast(erreur(err), true); }
    }
    const h = e.target.closest('[data-histo]');
    if (h) {
      const mv = await q(sb.from('nx_mouvements_stock').select('*').eq('produit_id', h.dataset.histo).order('created_at', { ascending: false }).limit(40));
      await modale('Historique du stock', mv.length ? `<table class="tab"><tbody>${mv.map(x => `<tr><td class="petit">${dateHeure(x.created_at)}</td><td>${esc({ entree: 'Entrée', sortie: 'Sortie', inventaire: 'Inventaire', vente: 'Vente', avoir: 'Avoir' }[x.type])}${x.motif ? `<br><span class="muted petit">${esc(x.motif)}</span>` : ''}</td>
        <td class="num"><b style="color:${x.quantite > 0 ? 'var(--ok)' : 'var(--ko)'}">${x.quantite > 0 ? '+' : ''}${nombre(x.quantite)}</b></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Aucun mouvement.</p>', { valider: 'Fermer' });
    }
  };
};

// ---------------------------------------------------------------- trésorerie
NX.pages.tresorerie = async () => {
  if (refuse('tresorerie', 'La trésorerie est réservée aux propriétaires, administrateurs et comptables.')) return;
  const t = await q(sb.rpc('nx_tresorerie', { org: ORG.id }));
  let solde = Number(t.total); const proj = t.prevision.map(s => { solde += Number(s.entrees) - Number(s.sorties); return { ...s, solde }; });
  const max = Math.max(1, ...proj.map(s => Math.abs(s.solde))), mini = Math.min(...proj.map(s => s.solde));
  vue(entete('Trésorerie', 'Soldes de vos comptes et prévision sur 12 semaines (factures à encaisser, dépenses à payer, salaires).',
      `<button class="btn" id="nvOp">+ Opération</button><button class="btn btn-p" id="nvCpt">+ Compte</button>`)
    + `<div class="kpis"><div class="kpi"><span>Solde de tous les comptes</span><b style="${t.total < 0 ? 'color:var(--ko)' : ''}">${montant(t.total)}</b><small>${t.comptes.length} compte${t.comptes.length > 1 ? 's' : ''}</small></div>
      <div class="kpi"><span>À encaisser (clients)</span><b>${montant(t.a_encaisser)}</b><small><a href="#/relances">Relancer les retards →</a></small></div>
      <div class="kpi"><span>À payer (fournisseurs)</span><b>${montant(t.a_payer)}</b><small><a href="#/depenses">Voir les dépenses →</a></small></div>
      <div class="kpi"><span>Solde prévu dans 12 semaines</span><b style="${proj.at(-1).solde < 0 ? 'color:var(--ko)' : ''}">${montant(proj.at(-1).solde)}</b><small class="${mini < 0 ? 'baisse' : ''}">${mini < 0 ? '⚠️ passage dans le rouge prévu' : 'jamais dans le rouge'}</small></div></div>
    ${t.comptes.length ? `<div class="grille-cptes">${t.comptes.map(c => `<div class="carte"><span class="muted petit">${{ banque: '🏦 Banque', caisse: '💶 Caisse', autre: 'Compte' }[c.type]}</span><h2 style="margin:4px 0">${esc(c.nom)}</h2><b style="font-size:22px;${c.solde < 0 ? 'color:var(--ko)' : ''}">${montant(c.solde)}</b></div>`).join('')}</div>`
      : `<div class="carte" style="margin-bottom:16px">${vide('Ajoutez votre compte bancaire', 'Indiquez le solde d’aujourd’hui : NEXORA suit ensuite les paiements clients, les dépenses payées et vos opérations.', '<button class="btn btn-p" id="nvCpt2">+ Compte bancaire</button>')}</div>`}
    <div class="deux" style="margin-top:16px"><div class="carte"><h2>Solde prévu, semaine par semaine</h2><div class="graph" role="img" aria-label="Solde prévu sur 12 semaines">
        ${proj.map(s => `<div title="Semaine du ${date(s.debut)} : ${montant(s.solde)} (entrées ${montant(s.entrees)}, sorties ${montant(s.sorties)})"><i style="height:${Math.max(2, Math.abs(s.solde) / max * 100)}%;${s.solde < 0 ? 'background:var(--ko)' : ''}"></i><small>${new Date(s.debut + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}</small></div>`).join('')}</div>
        <p class="muted petit">Les factures en retard sont comptées la première semaine. Les salaires viennent du coût mensuel des employés.</p></div>
      <div class="carte"><h2>Derniers mouvements</h2>${t.derniers.length ? t.derniers.map(x => `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--ligne)"><span>${esc(x.lib || '')}<br><span class="muted petit">${date(x.d)}</span></span>
        <b style="color:${x.m > 0 ? 'var(--ok)' : 'var(--ko)'}">${x.m > 0 ? '+' : ''}${montant(x.m)}</b></div>`).join('') : '<p class="muted">Aucun mouvement pour l’instant.</p>'}</div></div>`);
  const nvCompte = async () => {
    const r = await modale('Nouveau compte', `<div class="g2"><label>Nom<input name="nom" required maxlength="60" placeholder="Compte pro Crédit Agricole"></label><label>Type<select name="type">${opts({ banque: 'Banque', caisse: 'Caisse (espèces)', autre: 'Autre' })}</select></label></div>
      <div class="g2"><label>Solde à cette date (€)<input name="solde_initial" type="number" step="0.01" required value="0"></label><label>Date du solde<input name="date_initiale" type="date" required value="${aujourdhui()}"></label></div><label>IBAN<input name="iban" maxlength="40"></label>`);
    if (!r) return;
    try { await q(sb.from('nx_comptes').insert({ org_id: ORG.id, nom: r.nom.trim(), type: r.type, solde_initial: Number(r.solde_initial), date_initiale: r.date_initiale, iban: nul(r.iban.trim()) })); toast('Compte ajouté.'); NX.pages.tresorerie(); } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = async e => {
    if (['nvCpt', 'nvCpt2'].includes(e.target.id)) return nvCompte();
    if (e.target.id === 'nvOp') {
      if (!t.comptes.length) return toast('Ajoutez d’abord un compte.', true);
      const r = await modale('Opération de trésorerie', `<div class="g2"><label>Compte<select name="compte_id">${t.comptes.map(c => `<option value="${c.id}">${esc(c.nom)}</option>`).join('')}</select></label><label>Type<select name="categorie">${opts(OPERATIONS)}</select></label></div>
        <div class="g3"><label>Sens<select name="sens"><option value="1">Entrée d’argent</option><option value="-1">Sortie d’argent</option></select></label><label>Montant (€)<input name="montant" type="number" min="0.01" step="0.01" required></label><label>Date<input name="date_op" type="date" required value="${aujourdhui()}"></label></div>
        <label>Libellé<input name="libelle" required maxlength="160"></label>`);
      if (!r) return;
      try { await q(sb.from('nx_operations').insert({ org_id: ORG.id, compte_id: r.compte_id, categorie: r.categorie, montant: Number(r.sens) * Number(r.montant), date_op: r.date_op, libelle: r.libelle.trim() })); toast('Opération enregistrée.'); NX.pages.tresorerie(); } catch (err) { toast(erreur(err), true); }
    }
  };
};

// ---------------------------------------------------------------- abonnements (factures récurrentes)
NX.pages.abonnements = async () => {
  const [l, clients] = await Promise.all([q(sb.from('nx_abonnements').select('*, nx_clients(nom)').eq('org_id', ORG.id).order('prochaine')), q(sb.from('nx_clients').select('id, nom').eq('org_id', ORG.id).neq('statut', 'inactif').order('nom'))]);
  const auj = aujourdhui(), dus = l.filter(a => a.actif && a.prochaine <= auj && (!a.fin || a.prochaine <= a.fin));
  const ht = a => a.lignes.reduce((x, li) => x + Number(li.quantite || 1) * Number(li.prix_ht || 0), 0);
  vue(entete('Abonnements', 'Contrats de maintenance, locations, forfaits : les factures sont préparées en brouillon à chaque échéance, vous n’avez plus qu’à les valider.',
      `${peut('facturation') && dus.length ? `<button class="btn" id="generer">Préparer les factures dues (${dus.length})</button>` : ''}${peut('facturation') ? '<button class="btn btn-p" data-nouveau>+ Abonnement</button>' : ''}`)
    + tableau(['Client', 'Objet', '#Montant HT', 'Rythme', 'Prochaine facture', ''], l.map(a => `<tr style="${a.actif ? '' : 'opacity:.55'}"><td><b>${esc(a.nx_clients?.nom || '')}</b></td><td>${esc(a.objet)}<br><span class="muted petit">${a.nb_generees} facture${a.nb_generees > 1 ? 's' : ''} préparée${a.nb_generees > 1 ? 's' : ''}</span></td>
      <td class="num">${montant(ht(a))}</td><td>${esc(FREQ[a.frequence])}</td><td>${a.actif ? `<span style="${a.prochaine <= auj ? 'color:var(--ko);font-weight:700' : ''}">${date(a.prochaine)}</span>` : tag(['', 'Arrêté'])}${a.fin ? `<br><span class="muted petit">jusqu’au ${date(a.fin)}</span>` : ''}</td>
      <td class="num">${peut('facturation') ? `<button class="btn btn-s" data-modif="${a.id}">Modifier</button>` : ''}</td></tr>`),
      vide('Aucun abonnement', 'Créez un abonnement pour chaque client facturé régulièrement : plus d’oubli de facture, et un chiffre d’affaires prévisible.', peut('facturation') ? '<button class="btn btn-p" data-nouveau>+ Créer un abonnement</button>' : '')));
  const form = async (a = { frequence: 'mensuel', prochaine: auj, actif: true, lignes: [{ designation: '', quantite: 1, unite: 'mois', prix_ht: '', taux_tva: ORG.franchise_tva ? 0 : ORG.taux_tva_defaut }] }) => {
    if (!clients.length) return toast('Ajoutez d’abord un client.', true);
    const lignes = [...a.lignes, ...Array(Math.max(0, 3 - a.lignes.length)).fill({ designation: '', quantite: 1, unite: 'unité', prix_ht: '', taux_tva: ORG.franchise_tva ? 0 : ORG.taux_tva_defaut })];
    const r = await modale(a.id ? 'Modifier l’abonnement' : 'Nouvel abonnement', `<div class="g2"><label>Client<select name="client_id">${clients.map(c => `<option value="${c.id}" ${c.id === a.client_id ? 'selected' : ''}>${esc(c.nom)}</option>`).join('')}</select></label>
        <label>Objet de la facture<input name="objet" required maxlength="200" value="${esc(a.objet || '')}" placeholder="Contrat de maintenance"></label></div>
      <div class="g3"><label>Rythme<select name="frequence">${opts(FREQ, a.frequence)}</select></label><label>Prochaine facture le<input name="prochaine" type="date" required value="${a.prochaine}"></label><label>Fin <span class="muted petit">(facultatif)</span><input name="fin" type="date" value="${a.fin || ''}"></label></div>
      <b>Lignes facturées à chaque échéance</b>${lignes.map((li, i) => `<div class="g4"><label>Désignation<input name="d${i}" maxlength="500" value="${esc(li.designation)}"></label><label>Quantité<input name="q${i}" type="number" step="any" min="0" value="${li.quantite}"></label>
        <label>Prix HT (€)<input name="p${i}" type="number" step="0.01" value="${li.prix_ht}"></label><label>TVA (%)<input name="t${i}" type="number" min="0" max="100" step="0.1" value="${li.taux_tva}" ${ORG.franchise_tva ? 'disabled' : ''}></label></div>`).join('')}
      <label class="case"><input type="checkbox" name="actif" ${a.actif ? 'checked' : ''}> Abonnement en cours</label>`, { large: true });
    if (!r) return;
    const li = lignes.map((_, i) => ({ designation: (r['d' + i] || '').trim(), quantite: Number(r['q' + i] || 1), unite: lignes[i].unite || 'unité', prix_ht: Number(r['p' + i] || 0), taux_tva: ORG.franchise_tva ? 0 : Number(r['t' + i] || 0) })).filter(x => x.designation);
    if (!li.length) return toast('Ajoutez au moins une ligne.', true);
    const v = { client_id: r.client_id, objet: r.objet.trim(), frequence: r.frequence, prochaine: r.prochaine, fin: nul(r.fin), lignes: li, actif: !!r.actif };
    try { if (a.id) await q(sb.from('nx_abonnements').update(v).eq('id', a.id)); else await q(sb.from('nx_abonnements').insert({ org_id: ORG.id, ...v })); toast('Abonnement enregistré.'); NX.pages.abonnements(); } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = async e => {
    if (e.target.closest('[data-nouveau]')) return form();
    const m = e.target.closest('[data-modif]'); if (m) return form(l.find(a => a.id === m.dataset.modif));
    if (e.target.id === 'generer') { try { const n = await q(sb.rpc('nx_generer_abonnements', { org: ORG.id })); toast(`${n} facture${n > 1 ? 's' : ''} préparée${n > 1 ? 's' : ''} en brouillon.`); aller('#/factures?filtre=brouillon'); } catch (err) { toast(erreur(err), true); } }
  };
};

// ---------------------------------------------------------------- relances des factures en retard
NX.pages.relances = async () => {
  const auj = aujourdhui();
  const [l, rel] = await Promise.all([q(sb.from('nx_factures').select('id, numero, total_ttc, paye, echeance, date_emission, client_id, client_snap, nx_clients(telephone, email)').eq('org_id', ORG.id).eq('type', 'facture').in('statut', ['validee', 'partielle']).lt('echeance', auj).order('echeance')),
    q(sb.from('nx_relances').select('facture_id, date_relance, moyen').eq('org_id', ORG.id).order('date_relance', { ascending: false }))]);
  const relDe = id => rel.filter(r => r.facture_id === id), jours = d => Math.round((new Date(auj) - new Date(d)) / 864e5);
  // texte de relance gradué : rappel amical, puis ferme, puis mise en demeure
  const texte = (f, n) => { const reste = montant(f.total_ttc - f.paye);
    return [`Bonjour,\n\nSauf erreur de notre part, la facture ${f.numero} du ${date(f.date_emission)} (reste dû : ${reste}) arrivait à échéance le ${date(f.echeance)}. Pourriez-vous nous indiquer la date de règlement prévue ?${ORG.iban ? `\n\nIBAN : ${ORG.iban}` : ''}\n\nMerci et bonne journée,\n${ORG.nom}`,
      `Bonjour,\n\nNous n’avons pas reçu le règlement de la facture ${f.numero} (reste dû : ${reste}), échue depuis ${jours(f.echeance)} jours. Merci de procéder au paiement sous 8 jours.${ORG.iban ? `\n\nIBAN : ${ORG.iban}` : ''}\n\nCordialement,\n${ORG.nom}`,
      `Madame, Monsieur,\n\nMalgré nos relances, la facture ${f.numero} (reste dû : ${reste}) demeure impayée. Nous vous mettons en demeure de la régler sous 8 jours. À défaut, des pénalités de retard au taux légal et l’indemnité forfaitaire de 40 € (clients professionnels) seront appliquées, et le recouvrement sera engagé.\n\n${ORG.nom}`][Math.min(n, 2)]; };
  vue(entete('Relances', `${l.length} facture${l.length > 1 ? 's' : ''} en retard · ${montant(l.reduce((x, f) => x + Number(f.total_ttc - f.paye), 0))} à récupérer`)
    + (l.length ? `<div class="tab-boite"><table class="tab"><thead><tr><th>Facture</th><th>Client</th><th class="num">Retard</th><th class="num">Reste dû</th><th>Relances</th><th></th></tr></thead><tbody>${l.map(f => { const r = relDe(f.id), tel = f.nx_clients?.telephone, mail = f.client_snap?.email || f.nx_clients?.email, t = texte(f, r.length);
      return `<tr><td><a href="#/factures/${f.id}"><b>${esc(f.numero)}</b></a><br><span class="muted petit">échue le ${date(f.echeance)}</span></td><td>${esc(f.client_snap?.nom || '')}</td><td class="num" style="color:var(--ko)"><b>${jours(f.echeance)} j</b></td><td class="num"><b>${montant(f.total_ttc - f.paye)}</b></td>
        <td class="petit">${r.length ? `${r.length} · dernière le ${date(r[0].date_relance)}` : '<span class="muted">aucune</span>'}<br><span class="muted">${['1re : rappel amical', '2e : relance ferme', 'mise en demeure'][Math.min(r.length, 2)]}</span></td>
        <td class="num">${mail ? `<a class="btn btn-s" href="mailto:${esc(mail)}?subject=${encodeURIComponent('Facture ' + f.numero)}&body=${encodeURIComponent(t)}" data-noter="${f.id}" data-moyen="email">✉️ Email</a>` : ''}
          ${tel ? `<a class="btn btn-s" target="_blank" rel="noopener" href="https://wa.me/${numeroWa(tel)}?text=${encodeURIComponent(t)}" data-noter="${f.id}" data-moyen="whatsapp">💬 WhatsApp</a>` : ''}
          ${peut('facturation') ? `<button class="btn btn-s" data-noter="${f.id}" data-moyen="telephone">📞 Appel noté</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="muted petit">Email et WhatsApp s’ouvrent avec un message prêt, adapté au nombre de relances déjà faites ; la relance est notée dans l’historique.</p>`
      : `<div class="carte">${vide('Aucune facture en retard 👍', 'Toutes vos factures échues sont réglées.')}</div>`));
  $('#page').onclick = async e => {
    const b = e.target.closest('[data-noter]'); if (!b || !peut('facturation')) return;
    try { await q(sb.from('nx_relances').insert({ org_id: ORG.id, facture_id: b.dataset.noter, moyen: b.dataset.moyen })); toast('Relance notée.'); if (b.tagName === 'BUTTON') NX.pages.relances(); else setTimeout(() => NX.pages.relances(), 800); } catch (err) { toast(erreur(err), true); }
  };
};

// ---------------------------------------------------------------- employés et absences
// Avec equipe_devis.sql : accès « Mon espace » donné depuis la fiche, durée du contrat et report de congés, décisions motivées, lien vers le planning.
NX.pages.employes = async onglet => {
  if (refuse('rh', 'La gestion des employés est réservée aux propriétaires et administrateurs.')) return;
  const [l, abs] = await Promise.all([q(sb.from('nx_employes').select('*').eq('org_id', ORG.id).order('nom')), q(sb.from('nx_absences').select(`*, nx_employes(prenom, nom${EQ ? ', user_id' : ''})`).eq('org_id', ORG.id).order('debut', { ascending: false }).limit(200))]);
  const auj = aujourdhui(), an = auj.slice(0, 4), actifs = l.filter(x => x.actif);
  const pris = id => abs.filter(a => a.employe_id === id && a.type === 'conges' && a.statut === 'validee' && a.debut.startsWith(an)).reduce((x, a) => x + Number(a.jours), 0);
  const absents = abs.filter(a => a.statut === 'validee' && a.debut <= auj && a.fin >= auj), aValider = abs.filter(a => a.statut === 'demande');
  const droitAn = x => Number(x.conges_annuels) + Number(x.conges_report || 0);
  const parEmploye = a => a.demande_par && a.demande_par === a.nx_employes?.user_id;
  vue(entete('Employés et absences', `${actifs.length} personne${actifs.length > 1 ? 's' : ''} · masse salariale ${montant(actifs.reduce((x, e) => x + Number(e.cout_mensuel || 0), 0))} / mois`,
      `${EQ ? '<a class="btn" href="#/planning">📅 Planning</a>' : ''}<button class="btn" id="nvAbs">+ Absence</button><button class="btn btn-p" id="nvEmp">+ Employé</button>`)
    + `<div class="onglets"><a href="#/employes" class="${onglet !== 'absences' ? 'on' : ''}">Équipe</a><a href="#/employes/absences" class="${onglet === 'absences' ? 'on' : ''}">Absences${aValider.length ? ` (${aValider.length} à valider)` : ''}</a></div>
    ${absents.length ? `<p>🌴 Absent${absents.length > 1 ? 's' : ''} aujourd’hui : <b>${absents.map(a => esc(a.nx_employes.prenom + ' ' + a.nx_employes.nom)).join(', ')}</b></p>` : ''}`
    + (onglet === 'absences'
      ? tableau(['Personne', 'Type', 'Du', 'Au', '#Jours ouvrés', 'Statut', ''], abs.map(a => `<tr><td><b>${esc(a.nx_employes.prenom)} ${esc(a.nx_employes.nom)}</b>${parEmploye(a) ? `<br><span class="muted petit">demandé le ${date(a.created_at)} depuis son espace</span>` : ''}${a.commentaire ? `<br><span class="muted petit">${esc(a.commentaire)}</span>` : ''}</td><td>${esc(ABSENCES[a.type])}</td><td>${date(a.debut)}</td><td>${date(a.fin)}</td>
          <td class="num">${nombre(a.jours)}</td><td>${tag(ST_ABS[a.statut])}${a.reponse ? `<br><span class="muted petit">${esc(a.reponse)}</span>` : ''}</td><td class="num">${a.statut === 'demande' ? `<button class="btn btn-s btn-p" data-abs="${a.id}" data-st="validee">Valider</button><button class="btn btn-s" data-abs="${a.id}" data-st="refusee">Refuser</button>` : ''}</td></tr>`),
        vide('Aucune absence', 'Notez les congés, arrêts maladie et formations : vous voyez qui est absent et le solde de congés de chacun.'))
        + (EQ ? '<p class="muted petit">Les jours ouvrés (lundi à vendredi) ne comptent ni les week-ends ni les jours fériés. Une absence validée retire les créneaux de ces jours-là du planning.</p>' : '')
      : tableau(['Personne', 'Contrat', 'Entrée', '#Coût mensuel', '#Congés pris ' + an, ...(EQ ? ['Mon espace'] : []), ''], l.map(x => `<tr style="${x.actif ? '' : 'opacity:.55'}"><td><b>${esc(x.prenom)} ${esc(x.nom)}</b><br><span class="muted petit">${esc(x.poste || '')}${x.telephone ? ' · ' + esc(x.telephone) : ''}</span></td>
          <td>${esc(CONTRATS[x.contrat])}${EQ ? `<br><span class="muted petit">${nombre(x.heures_hebdo)} h / semaine</span>` : ''}${x.date_sortie ? `<br><span class="muted petit">sortie le ${date(x.date_sortie)}</span>` : ''}</td><td>${date(x.date_entree)}</td><td class="num">${x.cout_mensuel != null ? montant(x.cout_mensuel) : '—'}</td>
          <td class="num">${nombre(pris(x.id))} / ${nombre(droitAn(x))} j</td>${EQ ? `<td>${x.user_id ? tag(['ok', 'Compte relié']) : x.actif ? `<button class="btn btn-s" data-acces="${x.id}">Donner l’accès</button>` : '—'}</td>` : ''}
          <td class="num"><button class="btn btn-s" data-modif="${x.id}">Modifier</button></td></tr>`),
        vide('Aucun employé', 'Ajoutez votre équipe : contrats, dates, coût mensuel (utilisé pour la prévision de trésorerie) et congés.', '<button class="btn btn-p" id="nvEmp2">+ Ajouter un employé</button>'))
        + (EQ ? '<p class="muted petit">« Donner l’accès » : l’employé reçoit un lien pour créer son compte. Il voit seulement son planning, son solde de congés et ses demandes, rien d’autre de l’entreprise.</p>' : '')));
  const formEmp = async (x = { contrat: 'cdi', actif: true, conges_annuels: 25, heures_hebdo: 35, conges_report: 0 }) => {
    const r = await modale(x.id ? 'Modifier' : 'Nouvel employé', `<div class="g3"><label>Prénom<input name="prenom" required maxlength="60" value="${esc(x.prenom || '')}"></label><label>Nom<input name="nom" required maxlength="80" value="${esc(x.nom || '')}"></label><label>Poste<input name="poste" maxlength="80" value="${esc(x.poste || '')}"></label></div>
      <div class="g3"><label>Contrat<select name="contrat">${opts(CONTRATS, x.contrat)}</select></label><label>Date d’entrée<input name="date_entree" type="date" value="${x.date_entree || ''}"></label><label>Date de sortie<input name="date_sortie" type="date" value="${x.date_sortie || ''}"></label></div>
      <div class="g3"><label>Coût mensuel employeur (€)<input name="cout_mensuel" type="number" min="0" step="0.01" value="${x.cout_mensuel ?? ''}"></label><label>Congés par an (jours ouvrés)<input name="conges_annuels" type="number" min="0" max="60" step="0.5" value="${x.conges_annuels}"></label><label>Téléphone<input name="telephone" maxlength="30" value="${esc(x.telephone || '')}"></label></div>
      ${EQ ? `<div class="g2"><label>Heures par semaine (contrat)<input name="heures_hebdo" type="number" min="0" max="60" step="0.5" value="${x.heures_hebdo ?? 35}"></label>
        <label>Report ou ajustement de congés (jours)<input name="conges_report" type="number" min="-60" max="120" step="0.5" value="${x.conges_report ?? 0}"><span class="petit muted">Jours restants de l’an dernier, ou correction : ajoutés au droit de l’année.</span></label></div>` : ''}
      <label>Email<input name="email" type="email" maxlength="120" value="${esc(x.email || '')}"></label><label>Notes <span class="muted">(visibles par les responsables seulement)</span><input name="notes" maxlength="2000" value="${esc(x.notes || '')}"></label>
      <label class="case"><input type="checkbox" name="actif" ${x.actif ? 'checked' : ''}> Dans l’équipe</label>`, { large: true });
    if (!r) return;
    const v = { prenom: r.prenom.trim(), nom: r.nom.trim(), poste: nul(r.poste.trim()), contrat: r.contrat, date_entree: nul(r.date_entree), date_sortie: nul(r.date_sortie), cout_mensuel: r.cout_mensuel === '' ? null : Number(r.cout_mensuel),
      conges_annuels: Number(r.conges_annuels || 0), telephone: nul(r.telephone.trim()), email: nul(r.email.trim()), notes: r.notes.trim(), actif: !!r.actif,
      ...(EQ ? { heures_hebdo: Number(r.heures_hebdo || 0), conges_report: Number(r.conges_report || 0) } : {}) };
    try { if (x.id) await q(sb.from('nx_employes').update(v).eq('id', x.id)); else await q(sb.from('nx_employes').insert({ org_id: ORG.id, ...v })); toast('Enregistré.'); NX.pages.employes(onglet); } catch (err) { toast(erreur(err), true); }
  };
  // accès « Mon espace » : invitation par email, ou fiche reliée à un compte qui fait déjà partie de l'équipe
  const donnerAcces = async x => {
    const membres = await q(sb.rpc('nx_equipe', { org: ORG.id })).catch(() => []);
    const libres = membres.filter(m => !l.some(e => e.user_id === m.user_id));
    const r = await modale(`Accès de ${x.prenom} à « Mon espace »`, `<p style="margin:0">${esc(x.prenom)} verra son planning, son solde de congés et pourra demander ses congés. Rien d’autre de l’entreprise (clients, devis, factures…).</p>
      <label>Email de ${esc(x.prenom)}<input name="email" type="email" maxlength="120" value="${esc(x.email || '')}"></label>
      ${libres.length ? `<label>ou relier un compte qui fait déjà partie de l’équipe<select name="membre"><option value="">—</option>${libres.map(m => `<option value="${m.user_id}">${esc(`${m.prenom || ''} ${m.nom || ''}`.trim() || m.email)} (${esc(ROLES[m.role] || m.role)})</option>`).join('')}</select></label>` : ''}`, { valider: 'Donner l’accès' });
    if (!r) return;
    try {
      if (r.membre) { await q(sb.rpc('nx_lier_employe', { eid: x.id, membre: r.membre })); toast(`Fiche de ${x.prenom} reliée à son compte.`); return NX.pages.employes(onglet); }
      if (!r.email?.trim()) return toast('Indiquez l’email de la personne.', true);
      const res = await q(sb.rpc('nx_inviter_employe', { eid: x.id, adresse: r.email.trim() }));
      if (res.relie) { toast(`${x.prenom} faisait déjà partie de l’équipe : sa fiche est reliée.`); return NX.pages.employes(onglet); }
      const lien = `${location.origin}${location.pathname}#/invitation/${res.jeton}`;
      await navigator.clipboard?.writeText(lien).catch(() => {});
      await modale('Lien à envoyer', `<p>Envoyez ce lien à <b>${esc(x.prenom)}</b> (valable 14 jours). Il crée son compte avec l’adresse <b>${esc(r.email.trim())}</b> et arrive directement dans son espace.</p><input readonly value="${esc(lien)}" aria-label="Lien d’invitation">
        <div class="actions"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${x.telephone ? numeroWa(x.telephone) : ''}?text=${encodeURIComponent(`Bonjour ${x.prenom}, voici ton accès à ton planning et à tes congés chez ${ORG.nom} (NEXORA) : ${lien}`)}">Envoyer par WhatsApp</a>
        <a class="btn" href="mailto:${esc(r.email.trim())}?subject=${encodeURIComponent('Votre planning et vos congés — ' + ORG.nom)}&body=${encodeURIComponent(`Bonjour ${x.prenom},\n\nVoici votre accès à votre planning et à vos congés chez ${ORG.nom} :\n${lien}\n\nÀ bientôt`)}">Envoyer par email</a></div>`, { valider: 'Fermer' });
      NX.pages.employes(onglet);
    } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = async e => {
    if (['nvEmp', 'nvEmp2'].includes(e.target.id)) return formEmp();
    const m = e.target.closest('[data-modif]'); if (m) return formEmp(l.find(x => x.id === m.dataset.modif));
    const ac = e.target.closest('[data-acces]'); if (ac) return donnerAcces(l.find(x => x.id === ac.dataset.acces));
    if (e.target.id === 'nvAbs') {
      if (!actifs.length) return toast('Ajoutez d’abord un employé.', true);
      const r = await modale('Nouvelle absence', `<div class="g2"><label>Personne<select name="employe_id">${actifs.map(x => `<option value="${x.id}">${esc(x.prenom)} ${esc(x.nom)}</option>`).join('')}</select></label><label>Type<select name="type">${opts(ABSENCES, 'conges')}</select></label></div>
        <div class="g3"><label>Du<input name="debut" type="date" required value="${auj}"></label><label>Au<input name="fin" type="date" required value="${auj}"></label><label>Statut<select name="statut">${opts({ validee: 'Validée', demande: 'À valider' }, 'validee')}</select></label></div>
        <label>Commentaire<input name="commentaire" maxlength="500"></label>`);
      if (!r) return;
      try { await q(sb.from('nx_absences').insert({ org_id: ORG.id, employe_id: r.employe_id, type: r.type, debut: r.debut, fin: r.fin, statut: r.statut, commentaire: nul(r.commentaire.trim()) })); toast('Absence enregistrée.'); aller('#/employes/absences'); } catch (err) { toast(erreur(err), true); }
    }
    const a = e.target.closest('[data-abs]');
    if (a) {
      try {
        if (!EQ) { await q(sb.from('nx_absences').update({ statut: a.dataset.st }).eq('id', a.dataset.abs)); toast(a.dataset.st === 'validee' ? 'Absence validée.' : 'Absence refusée.'); return NX.pages.employes('absences'); }
        let motif = null;
        if (a.dataset.st === 'refusee') {
          const r = await modale('Refuser la demande', '<label>Motif <span class="muted">(facultatif, transmis à l’employé)</span><textarea name="motif" maxlength="300" placeholder="Ex. Période de forte activité : proposez une autre date"></textarea></label>', { valider: 'Refuser' });
          if (!r) return; motif = r.motif || null;
        }
        const res = await q(sb.rpc('nx_traiter_absence', { aid: a.dataset.abs, decision: a.dataset.st, reponse_c: motif }));
        toast(a.dataset.st === 'validee' ? `Absence validée${res.creneaux_retires ? ` : ${res.creneaux_retires} créneau${res.creneaux_retires > 1 ? 'x' : ''} retiré${res.creneaux_retires > 1 ? 's' : ''} du planning` : ''}.` : 'Demande refusée.');
        NX.pages.employes('absences');
      } catch (err) { toast(erreur(err), true); }
    }
  };
};

// ---------------------------------------------------------------- rapports : résultat, TVA, exports comptables
NX.pages.rapports = async () => {
  if (refuse('tresorerie', 'Les rapports sont réservés aux propriétaires, administrateurs et comptables.')) return;
  const p = param(), auj = aujourdhui(), [a, m] = auj.split('-').map(Number), pad = n => String(n).padStart(2, '0');
  const fin = (y, mo) => new Date(Date.UTC(y, mo, 0)).toISOString().slice(0, 10);
  const PERIODES = { mois: ['Ce mois', `${a}-${pad(m)}-01`, auj], mois_prec: ['Mois dernier', `${m === 1 ? a - 1 : a}-${pad(m === 1 ? 12 : m - 1)}-01`, fin(m === 1 ? a - 1 : a, m === 1 ? 12 : m - 1)],
    trimestre: ['Ce trimestre', `${a}-${pad(Math.floor((m - 1) / 3) * 3 + 1)}-01`, auj], annee: ['Cette année', `${a}-01-01`, auj], annee_prec: ['Année dernière', `${a - 1}-01-01`, `${a - 1}-12-31`] };
  const per = PERIODES[p.p] ? p.p : 'annee', [, du, au] = PERIODES[per];
  const r = await q(sb.rpc('nx_rapport', { org: ORG.id, du, au }));
  const max = Math.max(1, ...r.par_mois.flatMap(x => [Number(x.ventes), Number(x.achats)]));
  vue(entete('Rapports et TVA', `Du ${date(du)} au ${date(au)}`, `<button class="btn" id="jv">Journal des ventes (CSV)</button><button class="btn" id="ja">Journal des achats (CSV)</button>`)
    + `<div class="puces-p">${Object.entries(PERIODES).map(([k, [t]]) => `<a href="#/rapports?p=${k}" class="${k === per ? 'on' : ''}">${t}</a>`).join('')}</div>
    <div class="kpis"><div class="kpi"><span>Ventes HT</span><b>${montant(r.ventes_ht)}</b><small>factures validées, avoirs déduits</small></div>
      <div class="kpi"><span>Dépenses HT</span><b>${montant(Number(r.achats_ht) + Number(r.octroi_mer))}</b><small>${Number(r.octroi_mer) ? `dont ${montant(r.octroi_mer)} d’octroi de mer` : 'achats, frais et charges'}</small></div>
      <div class="kpi"><span>Résultat estimé</span><b style="color:${r.resultat < 0 ? 'var(--ko)' : 'var(--ok)'}">${montant(r.resultat)}</b><small>ventes − dépenses, avant impôts</small></div>
      <div class="kpi"><span>TVA à reverser</span><b>${montant(r.tva_a_payer)}</b><small>collectée ${montant(r.tva_collectee)} − déductible ${montant(r.tva_deductible)}</small></div>
      <div class="kpi"><span>Encaissé / décaissé</span><b>${montant(Number(r.encaisse) - Number(r.decaisse))}</b><small>+${montant(r.encaisse)} / −${montant(r.decaisse)}</small></div></div>
    <div class="deux"><div class="carte"><h2>Ventes et dépenses par mois</h2><div class="graph g-double" role="img" aria-label="Ventes et dépenses par mois">${r.par_mois.map(x => `<div title="${x.mois} : ventes ${montant(x.ventes)}, dépenses ${montant(x.achats)}">
        <span><i style="height:${Math.max(1, Number(x.ventes) / max * 100)}%"></i><i class="b" style="height:${Math.max(1, Number(x.achats) / max * 100)}%"></i></span><small>${new Date(x.mois + '-15').toLocaleDateString('fr-FR', { month: 'short' })}</small></div>`).join('')}</div>
        <p class="petit"><span class="pastille"></span> ventes &nbsp; <span class="pastille b"></span> dépenses</p></div>
      <div class="carte"><h2>Dépenses par catégorie</h2>${r.par_categorie.length ? r.par_categorie.map(c => `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px"><span>${esc(CATS_DEP[c.categorie])} <span class="muted petit">(${c.nb})</span></span><b>${montant(c.ht)}</b></div>
        <div class="barre"><i style="width:${Number(c.ht) / Number(r.par_categorie[0].ht) * 100}%"></i></div></div>`).join('') : '<p class="muted">Aucune dépense sur la période.</p>'}</div></div>
    <p class="muted petit" style="margin-top:14px">Chiffres calculés sur les dates de facture (TVA sur les débits). Pour les prestations de services, la TVA est due à l’encaissement : faites valider vos déclarations par votre expert-comptable.</p>`);
  $('#jv').onclick = async () => { const l = await q(sb.from('nx_factures').select('date_emission, numero, type, total_ht, total_tva, total_ttc, client_snap').eq('org_id', ORG.id).neq('statut', 'brouillon').gte('date_emission', du).lte('date_emission', au).order('numero'));
    telechargerCsv(`journal-ventes-${du}-${au}.csv`, ['Date', 'Numéro', 'Type', 'Client', 'HT', 'TVA', 'TTC'], l.map(f => [f.date_emission, f.numero, f.type, f.client_snap?.nom, f.total_ht, f.total_tva, f.total_ttc])); };
  $('#ja').onclick = async () => { const l = await q(sb.from('nx_depenses').select('date_depense, numero_piece, libelle, categorie, montant_ht, montant_tva, octroi_mer, montant_ttc, nx_fournisseurs(nom)').eq('org_id', ORG.id).gte('date_depense', du).lte('date_depense', au).order('date_depense'));
    telechargerCsv(`journal-achats-${du}-${au}.csv`, ['Date', 'Pièce', 'Fournisseur', 'Libellé', 'Catégorie', 'HT', 'TVA', 'Octroi de mer', 'TTC'], l.map(d => [d.date_depense, d.numero_piece, d.nx_fournisseurs?.nom, d.libelle, CATS_DEP[d.categorie], d.montant_ht, d.montant_tva, d.octroi_mer, d.montant_ttc])); };
};
