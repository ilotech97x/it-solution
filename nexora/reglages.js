/* NEXORA — entreprise : réglages, équipe et rôles, invitations, journal d'activité, export des données. */
'use strict';
const DESC_ROLES = { proprietaire: 'Tout, y compris supprimer l’entreprise', admin: 'Tout sauf la suppression ; gère l’équipe', commercial: 'Clients, pipeline, devis',
  comptable: 'Factures, avoirs, paiements, catalogue', lecteur: 'Consultation seulement' };

NX.pages.reglages = async () => {
  const o = ORG, ok = peut('parametres'), dis = ok ? '' : 'disabled';
  vue((param().premiere ? '<div class="carte" style="margin-bottom:16px;border-color:var(--cyan)"><b>🎉 Votre entreprise est créée.</b> Complétez ces informations : elles apparaissent sur vos devis et factures.</div>' : '')
    + entete('Réglages de l’entreprise', ok ? '' : 'Lecture seule : seuls les propriétaires et administrateurs modifient ces réglages.')
    + `<form class="grille" id="fOrg"><div class="carte f"><h2>Identité</h2>
      <div class="g3"><label style="grid-column:span 2">Nom ou raison sociale<input name="nom" required minlength="2" maxlength="120" value="${esc(o.nom)}" ${dis}></label><label>Forme juridique<input name="forme" maxlength="40" list="formes" value="${esc(o.forme || '')}" ${dis}><datalist id="formes"><option>EI<option>Micro-entreprise<option>EURL<option>SARL<option>SAS<option>SASU<option>Association</datalist></label></div>
      <div class="g3"><label>SIRET<input name="siret" pattern="[0-9 ]{9,17}" value="${esc(o.siret || '')}" ${dis}></label><label>N° TVA intracom.<input name="tva_intra" maxlength="20" value="${esc(o.tva_intra || '')}" ${dis}></label><label>IBAN (affiché sur les factures)<input name="iban" maxlength="40" value="${esc(o.iban || '')}" ${dis}></label></div>
      ${PORTAIL ? `<div class="g3"><label>BIC<input name="bic" maxlength="11" pattern="[A-Za-z0-9]{8}([A-Za-z0-9]{3})?" value="${esc(o.bic || '')}" ${dis}></label>
        <label>Lien de paiement par carte <span class="muted">(facultatif)</span><input name="lien_paiement" type="url" pattern="https://.+" maxlength="300" placeholder="https://… (SumUp, Stripe, PayPal)" value="${esc(o.lien_paiement || '')}" ${dis}></label>
        <label>Paiement en plusieurs fois<select name="echeancier_max" ${dis}>${[[1, 'Non proposé'], [2, 'Jusqu’à 2 fois'], [3, 'Jusqu’à 3 fois'], [4, 'Jusqu’à 4 fois']].map(([k, t]) => `<option value="${k}" ${Number(o.echeancier_max ?? 4) === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label style="max-width:360px">Plusieurs fois à partir de (€ TTC)<input name="echeancier_seuil" type="number" min="0" step="1" value="${esc(o.echeancier_seuil ?? 100)}" ${dis}></label>
      <p class="petit muted">Espace client : vos clients signent, suivent et règlent leurs devis et factures en ligne. Paiement en plusieurs fois sans frais, une échéance par mois, 3 mois au plus.</p>` : ''}
      <label>Adresse<input name="adresse" maxlength="200" value="${esc(o.adresse || '')}" ${dis}></label>
      <div class="g3"><label>Code postal<input name="code_postal" maxlength="12" value="${esc(o.code_postal || '')}" ${dis}></label><label>Ville<input name="ville" maxlength="80" value="${esc(o.ville || '')}" ${dis}></label><label>Pays<input name="pays" maxlength="60" value="${esc(o.pays)}" ${dis}></label></div>
      <div class="g2"><label>Email<input name="email" type="email" maxlength="120" value="${esc(o.email || '')}" ${dis}></label><label>Téléphone<input name="telephone" maxlength="30" value="${esc(o.telephone || '')}" ${dis}></label></div></div>
    <div class="carte f"><h2>Facturation</h2>
      <label class="case"><input type="checkbox" name="franchise_tva" ${o.franchise_tva ? 'checked' : ''} ${dis}> Franchise en base de TVA (« TVA non applicable, art. 293 B du CGI »)</label>
      <div class="g4"><label>TVA par défaut (%)<input name="taux_tva_defaut" type="number" min="0" max="100" step="0.1" value="${o.taux_tva_defaut}" ${dis}></label><label>Délai de paiement (jours)<input name="delai_paiement" type="number" min="0" max="120" value="${o.delai_paiement}" ${dis}></label>
        <label>Devise<select name="devise" ${dis}>${['EUR', 'USD', 'XPF', 'CAD', 'GBP', 'CHF'].map(d => `<option ${d === o.devise ? 'selected' : ''}>${d}</option>`).join('')}</select></label><label>Fuseau horaire<input name="fuseau" maxlength="60" value="${esc(o.fuseau)}" ${dis}></label></div>
      <div class="g3"><label>Préfixe des devis<input name="prefixe_devis" pattern="[A-Z0-9]{1,6}" value="${esc(o.prefixe_devis)}" ${dis}></label><label>Préfixe des factures<input name="prefixe_facture" pattern="[A-Z0-9]{1,6}" value="${esc(o.prefixe_facture)}" ${dis}></label><label>Préfixe des avoirs<input name="prefixe_avoir" pattern="[A-Z0-9]{1,6}" value="${esc(o.prefixe_avoir)}" ${dis}></label></div>
      <p class="petit muted" style="margin:0">Numérotation : préfixe-année-numéro (ex. F-2026-0001), continue et sans trou, attribuée à la validation.</p>
      <label>Conditions de paiement et mentions (pied des devis et factures)<textarea name="conditions" maxlength="2000" ${dis}>${esc(o.conditions)}</textarea></label>
      <p class="petit muted" style="margin:0">Pour les clients professionnels, la loi impose d’indiquer les pénalités de retard et l’indemnité forfaitaire de 40 € pour frais de recouvrement. Faites valider vos mentions par votre expert-comptable.</p></div>
    ${ok ? '<div class="actions"><button class="btn btn-p">Enregistrer</button></div>' : ''}</form>
    <div class="carte" style="margin-top:16px"><h2>Vos données</h2><p class="muted">Export complet (clients, devis, factures, paiements, journal) au format JSON, réutilisable ailleurs. Gratuit, à tout moment.</p>
      <div class="actions">${ok ? '<button class="btn" id="export">📤 Exporter toutes les données</button>' : ''}${ROLE !== 'proprietaire' ? `<button class="btn btn-ko" id="quitter">Quitter cette entreprise</button>` : ''}
      ${ROLE === 'proprietaire' ? `<button class="btn btn-ko" id="supprOrg">Supprimer l’entreprise</button>` : ''}</div></div>`);
  $('#fOrg').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target; if (!f.reportValidity()) return;
    const d = Object.fromEntries(new FormData(f)), n = s => (s || '').trim() || null;
    const v = { nom: d.nom.trim(), forme: n(d.forme), siret: n(d.siret), tva_intra: n(d.tva_intra), iban: n(d.iban), adresse: n(d.adresse), code_postal: n(d.code_postal), ville: n(d.ville), pays: d.pays.trim() || 'France',
      email: n(d.email), telephone: n(d.telephone), franchise_tva: !!d.franchise_tva, taux_tva_defaut: d.franchise_tva ? 0 : Number(d.taux_tva_defaut || 0), delai_paiement: Number(d.delai_paiement || 0),
      devise: d.devise, fuseau: d.fuseau.trim() || 'America/Martinique', prefixe_devis: d.prefixe_devis, prefixe_facture: d.prefixe_facture, prefixe_avoir: d.prefixe_avoir, conditions: d.conditions,
      ...(PORTAIL ? { bic: n(d.bic)?.toUpperCase() || null, lien_paiement: n(d.lien_paiement), echeancier_max: Number(d.echeancier_max || 4), echeancier_seuil: Number(d.echeancier_seuil || 0) } : {}) };
    try { await q(sb.from('nx_organisations').update(v).eq('id', ORG.id)); await rechargerOrgs(); toast('Réglages enregistrés.'); coquille(); NX.pages.reglages(); } catch (err) { toast(erreur(err), true); }
  });
  $('#page').onclick = async e => {
    try {
      if (e.target.id === 'export') {
        const data = await q(sb.rpc('nx_exporter', { org: ORG.id }));
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
        a.download = `nexora-${ORG.nom.replace(/[^\w-]+/g, '-')}-${aujourdhui()}.json`; a.click(); toast('Export téléchargé.');
      }
      if (e.target.id === 'quitter' && await confirmer('Quitter l’entreprise', `Vous n’aurez plus accès à « ${esc(ORG.nom)} ».`, 'Quitter')) {
        await q(sb.rpc('nx_retirer_membre', { org: ORG.id, membre: moi.id })); await rechargerOrgs(); aller('#/');
      }
      if (e.target.id === 'supprOrg' && await confirmer('Supprimer l’entreprise', `Toutes les données de « ${esc(ORG.nom)} » seront supprimées définitivement. ${ORG.demo ? '' : 'Impossible si des factures ont été validées (conservation légale de 10 ans) : exportez vos données d’abord.'}`, 'Supprimer définitivement')) {
        await q(sb.rpc('nx_supprimer_organisation', { org: ORG.id })); await rechargerOrgs(null); toast('Entreprise supprimée.'); aller(ORGS.length ? '#/' : '#/bienvenue');
      }
    } catch (err) { toast(erreur(err), true); }
  };
};

NX.pages.equipe = async () => {
  const [membres, invits] = await Promise.all([q(sb.rpc('nx_equipe', { org: ORG.id })), peut('equipe') ? q(sb.from('nx_invitations').select('*').eq('org_id', ORG.id).eq('statut', 'attente').order('created_at', { ascending: false })) : []]);
  const lien = j => `${location.origin}${location.pathname}#/invitation/${j}`;
  vue(entete('Équipe et rôles', `${membres.length} membre${membres.length > 1 ? 's' : ''}`, peut('equipe') ? '<button class="btn btn-p" id="inviter">+ Inviter</button>' : '')
    + tableau(['Membre', 'Email', 'Rôle', 'Depuis', ''], membres.map(m => `<tr><td><b>${esc(m.prenom)} ${esc(m.nom)}</b>${m.user_id === moi.id ? ' <span class="tag info">vous</span>' : ''}</td><td class="petit">${esc(m.email)}</td>
      <td>${peut('equipe') && m.user_id !== moi.id && (ROLE === 'proprietaire' || m.role !== 'proprietaire') ? `<select data-role="${m.user_id}" aria-label="Rôle">${Object.entries(ROLES).filter(([k]) => ROLE === 'proprietaire' || k !== 'proprietaire').map(([k, t]) => `<option value="${k}" ${k === m.role ? 'selected' : ''}>${t}</option>`).join('')}</select>` : tag(['violet', ROLES[m.role]])}</td>
      <td class="petit">${date(m.depuis)}</td><td class="num">${peut('equipe') && m.user_id !== moi.id && (ROLE === 'proprietaire' || m.role !== 'proprietaire') ? `<button class="btn btn-s btn-ko" data-retirer="${m.user_id}">Retirer</button>` : ''}</td></tr>`), '')
    + (invits.length ? `<div class="carte" style="margin-top:16px"><h2>Invitations en attente</h2>${invits.map(i => `<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 0;border-bottom:1px solid var(--ligne)">
        <span><b>${esc(i.email)}</b> · ${ROLES[i.role]} · expire le ${date(i.expire_at)}</span><span class="actions"><button class="btn btn-s" data-copier="${esc(lien(i.jeton))}">Copier le lien</button><button class="btn btn-s btn-ko" data-annuler="${i.id}">Annuler</button></span></div>`).join('')}</div>` : '')
    + `<div class="carte" style="margin-top:16px"><h2>Les rôles</h2><dl class="dl" style="grid-template-columns:140px 1fr">${Object.entries(ROLES).map(([k, t]) => `<dt>${t}</dt><dd>${DESC_ROLES[k]}</dd>`).join('')}</dl></div>`);
  $('#page').onchange = async e => {
    const s = e.target.closest('[data-role]'); if (!s) return;
    try { await q(sb.rpc('nx_changer_role', { org: ORG.id, membre: s.dataset.role, role_m: s.value })); toast('Rôle modifié.'); } catch (err) { toast(erreur(err), true); NX.pages.equipe(); }
  };
  $('#page').onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    try {
      if (b.id === 'inviter') {
        const d = await modale('Inviter un membre', `<label>Email de la personne<input name="email" type="email" required></label><label>Rôle<select name="role">${Object.entries(ROLES).filter(([k]) => ROLE === 'proprietaire' || k !== 'proprietaire').map(([k, t]) => `<option value="${k}" ${k === 'commercial' ? 'selected' : ''}>${t} : ${DESC_ROLES[k]}</option>`).join('')}</select></label>
          <p class="petit muted" style="margin:0">Vous recevrez un lien à lui transmettre (WhatsApp, email). Il devra se connecter ou créer son compte avec cette adresse.</p>`, { valider: 'Créer l’invitation' });
        if (!d) return;
        const j = await q(sb.rpc('nx_inviter', { org: ORG.id, adresse: d.email, role_inv: d.role }));
        await navigator.clipboard?.writeText(lien(j)).catch(() => {});
        await modale('Invitation créée', `<p>Transmettez ce lien à <b>${esc(d.email)}</b> (valable 14 jours) :</p><input readonly value="${esc(lien(j))}">
          <div class="actions"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`Je vous invite à rejoindre ${ORG.nom} sur NEXORA : ${lien(j)}`)}">Envoyer par WhatsApp</a>
          <a class="btn" href="mailto:${esc(d.email)}?subject=${encodeURIComponent('Invitation NEXORA — ' + ORG.nom)}&body=${encodeURIComponent(`Bonjour,\n\nJe vous invite à rejoindre ${ORG.nom} sur NEXORA :\n${lien(j)}\n\nÀ bientôt`)}">Envoyer par email</a></div>`, { valider: 'Fermer' });
        return NX.pages.equipe();
      }
      if (b.dataset.copier) { await navigator.clipboard.writeText(b.dataset.copier); toast('Lien copié.'); }
      if (b.dataset.annuler) { await q(sb.from('nx_invitations').update({ statut: 'annulee' }).eq('id', b.dataset.annuler)); NX.pages.equipe(); }
      if (b.dataset.retirer && await confirmer('Retirer le membre', 'Cette personne n’aura plus accès à l’entreprise.', 'Retirer')) { await q(sb.rpc('nx_retirer_membre', { org: ORG.id, membre: b.dataset.retirer })); NX.pages.equipe(); }
    } catch (err) { toast(erreur(err), true); }
  };
};

const ACTIONS_J = { creation: 'Création', invitation: 'Invitation', arrivee: 'Arrivée dans l’équipe', role: 'Changement de rôle', depart: 'Départ de l’équipe', facturation: 'Devis transformé en facture',
  validation: 'Validation', avoir: 'Avoir créé', paiement: 'Paiement enregistré', annulation_paiement: 'Paiement annulé' };
NX.pages.journal = async () => {
  if (!peut('equipe')) return vue(vide('Réservé', 'Le journal est consultable par les propriétaires et administrateurs.'));
  const [l, membres] = await Promise.all([q(sb.from('nx_journal').select('*').eq('org_id', ORG.id).order('created_at', { ascending: false }).limit(300)), q(sb.rpc('nx_equipe', { org: ORG.id }))]);
  const qui = id => { const m = membres.find(x => x.user_id === id); return m ? `${m.prenom} ${m.nom}`.trim() : 'Ancien membre'; };
  const detail = j => { const d = j.details || {}; return [d.numero, d.montant != null ? montant(d.montant) : '', d.moyen ? MOYENS[d.moyen] : '', d.email, d.role ? ROLES[d.role] : '', d.avant ? `${ROLES[d.avant]} → ${ROLES[d.apres]}` : '', d.total_ttc != null ? montant(d.total_ttc) : ''].filter(Boolean).join(' · '); };
  const lienObjet = j => ['facture', 'avoir'].includes(j.objet) && j.objet_id ? `#/factures/${j.objet_id}` : j.objet === 'devis' && j.objet_id ? `#/devis/${j.objet_id}` : '';
  vue(entete('Journal d’activité', 'Les opérations importantes, enregistrées automatiquement et non modifiables')
    + tableau(['Date', 'Qui', 'Action', 'Détail'], l.map(j => `<tr><td class="petit nowrap">${dateHeure(j.created_at)}</td><td>${esc(qui(j.user_id))}</td><td>${lienObjet(j) ? `<a href="${lienObjet(j)}">` : ''}${esc(ACTIONS_J[j.action] || j.action)} ${esc(j.objet === 'organisation' ? '' : j.objet)}${lienObjet(j) ? '</a>' : ''}</td>
      <td class="petit">${esc(detail(j))}</td></tr>`), vide('Journal vide')));
};
