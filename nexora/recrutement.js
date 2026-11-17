/* NEXORA — Recrutement : page entreprise publique, offres d'emploi et candidatures à étapes, publiées sur Travay (/emploi/).
   Réservé au droit « recrutement » (propriétaire, administrateur). Toutes les règles (loi, H/F, SIRET, étapes, isolation) sont dans la base : recrutement.sql.
   Tout est dans une fonction : aucun nom global en plus de NX.pages.recrutement. */
'use strict';
(() => {
  const CONTRATS = { CDI: 'CDI', CDD: 'CDD', interim: 'Intérim', alternance: 'Alternance', stage: 'Stage', saisonnier: 'Saisonnier', freelance: 'Freelance' };
  const SECTEURS = { commerce: 'Commerce', restauration: 'Restauration', batiment: 'Bâtiment', sante: 'Santé et social', numerique: 'Numérique', transport: 'Transport et logistique', tourisme: 'Tourisme et hôtellerie',
    services: 'Services', education: 'Éducation', agriculture: 'Agriculture et pêche', industrie: 'Industrie', administration: 'Administration', autre: 'Autre' };
  const TERRITOIRES_E = ['Martinique', 'Guadeloupe', 'Guyane', 'Saint-Martin', 'Saint-Barthélemy', 'La Réunion', 'Mayotte', 'Hexagone et Corse', 'Autre pays'];
  const ST_OFFRE = { brouillon: ['', 'Brouillon'], publiee: ['ok', 'En ligne'], pause: ['att', 'En pause'], pourvue: ['info', 'Pourvue'], archivee: ['', 'Archivée'] };
  const ETAPES = [['nouvelle', 'Nouvelles'], ['a_rencontrer', 'À rencontrer'], ['entretien', 'Entretien'], ['retenue', 'Retenues'], ['non_retenue', 'Non retenues']];
  const SUITE = { nouvelle: ['a_rencontrer', 'À rencontrer'], a_rencontrer: ['entretien', 'Entretien'], entretien: ['retenue', 'Retenir'] };
  const TAILLES = ['1-9', '10-49', '50-249', '250+'];
  const opts = (liste, cur) => Object.entries(liste).map(([k, t]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const optsT = cur => `<option value="">—</option>` + TERRITOIRES_E.map(t => `<option ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const lienPublic = p => `../emploi/#/entreprise/${p}`;

  // la loi, en direct : la même règle que la base (emp_controle_texte), affichée sous les champs libres
  function brancherLoi(f) {
    if (!f) return;
    const hint = document.createElement('p'); hint.className = 'petit loi-hint'; hint.hidden = true; hint.setAttribute('role', 'alert');
    const ref = f.querySelector('.actions'); ref.parentNode.insertBefore(hint, ref); let t = null;
    f.addEventListener('input', () => { clearTimeout(t); t = setTimeout(async () => {
      const txt = $$('input[type=text],textarea', f).map(x => x.value).join(' . '), c = await sb.rpc('emp_controle_texte', { texte: txt }).then(r => r.data, () => null);
      hint.hidden = !c; hint.textContent = c ? `⚠️ Critère interdit : ${c}. Le Code du travail (L1132-1 et L5321-2) interdit toute mention d’âge, de sexe, de situation familiale, d’origine, de santé ou d’apparence.` : '';
    }, 400); });
  }
  const dateFr = d => d ? date(d) : '—';

  NX.pages.recrutement = async (sous, id) => {
    if (!REC || !peut('recrutement')) return vue(vide('Recrutement indisponible', 'Ce module est réservé aux propriétaires et administrateurs, et arrive avec la prochaine mise à jour.'));
    const org = ORG.id;
    const [page, offres, cands] = await Promise.all([q(sb.from('nx_recrut_pages').select('*').eq('org_id', org).maybeSingle()),
      q(sb.from('nx_offres').select('*').eq('org_id', org).order('created_at', { ascending: false })), q(sb.from('nx_candidatures').select('*').eq('org_id', org).order('created_at', { ascending: false }))]);
    if (ORG?.id !== org) return;
    const onglet = sous === 'candidatures' ? 'candidatures' : sous === 'page' ? 'page' : 'offres';
    const nbNouv = cands.filter(c => c.statut === 'nouvelle').length;
    const tete = entete('Recrutement', 'Vos offres sont publiées gratuitement sur Travay, le site d’emploi du groupe.',
      page?.statut === 'publiee' ? `<a class="btn" href="${lienPublic(page.slug)}" target="_blank" rel="noopener">Voir ma page publique</a>` : '')
      + `<div class="onglets" role="tablist"><a href="#/recrutement" class="${onglet === 'offres' ? 'on' : ''}">Offres (${offres.filter(o => o.statut !== 'archivee').length})</a>
        <a href="#/recrutement/candidatures" class="${onglet === 'candidatures' ? 'on' : ''}">Candidatures${nbNouv ? ` (${nbNouv} nouvelle${nbNouv > 1 ? 's' : ''})` : ''}</a><a href="#/recrutement/page" class="${onglet === 'page' ? 'on' : ''}">Page de l’entreprise</a></div>`;
    if (onglet === 'page') return pagePage(tete, page);
    if (onglet === 'candidatures') return pageCands(tete, offres, cands);
    return pageOffres(tete, page, offres, cands);
  };

  // ---------------------------------------------------------------- offres
  function pageOffres(tete, page, offres, cands) {
    const nb = o => cands.filter(c => c.offre_id === o.id).length;
    vue(tete + (!page ? `<div class="carte"><b>Étape 1 : créez la page de votre entreprise.</b><p class="muted">Les candidats la voient avec vos offres : présentation, secteur, commune, avantages. Aucune donnée financière n’y figure.</p><a class="btn btn-p" href="#/recrutement/page">Créer la page</a></div>`
      : `<div class="actions" style="margin-bottom:12px"><button class="btn btn-p" id="nouvelle">+ Nouvelle offre</button></div>`)
      + (page && !offres.length ? vide('Aucune offre', 'Créez votre première offre : elle est publiée gratuitement, après vérification automatique de la loi (pas de critère discriminant, mention H/F ajoutée).') : '')
      + (offres.length ? tableau(['Offre', 'Contrat', 'Lieu', 'Statut', '#Candidatures', ''], offres.map(o => `<tr><td><b>${esc(o.intitule)}</b>${o.masquee ? ` <span class="tag ko" title="${esc(o.motif_masquage || '')}">Retirée par la modération</span>` : ''}<br><span class="petit muted">${o.publiee_at ? 'Publiée le ' + dateFr(o.publiee_at) : 'Créée le ' + dateFr(o.created_at)}${o.date_limite ? ' · limite le ' + dateFr(o.date_limite) : ''}</span></td>
        <td>${esc(CONTRATS[o.contrat])}</td><td>${esc(o.commune || '—')}</td><td>${tag(ST_OFFRE[o.statut])}</td><td class="num"><a href="#/recrutement/candidatures?offre=${o.id}">${nb(o)}</a></td>
        <td class="actions" style="justify-content:flex-end">${boutonsOffre(o)}</td></tr>`)) : ''));
    const n = $('#nouvelle'); if (n) n.onclick = () => formOffre(null, page);
    $('#page').onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return; const o = offres.find(x => x.id === b.dataset.id), act = b.dataset.act;
      try {
        if (act === 'modifier') return await formOffre(o, page);
        if (act === 'supprimer') { if (!await confirmer('Supprimer ce brouillon ?', 'Cette action est définitive.', 'Supprimer')) return; await q(sb.from('nx_offres').delete().eq('id', o.id)); }
        else { const st = { publier: 'publiee', reprendre: 'publiee', pause: 'pause', pourvue: 'pourvue', archiver: 'archivee' }[act];
          if (act === 'pourvue' && !await confirmer('Poste pourvu ?', 'L’offre disparaît du site ; les candidatures restent visibles ici.', 'Poste pourvu')) return;
          await q(sb.from('nx_offres').update({ statut: st }).eq('id', o.id)); toast(act === 'publier' ? 'Offre publiée sur Travay.' : 'Offre mise à jour.'); }
        rendre();
      } catch (err) { toast(erreur(err), true); }
    };
  }
  const boutonsOffre = o => {
    const b = (act, t, cl = '') => `<button class="btn btn-s ${cl}" data-act="${act}" data-id="${o.id}">${t}</button>`;
    if (o.statut === 'brouillon') return b('publier', 'Publier', 'btn-p') + b('modifier', 'Modifier') + b('supprimer', 'Supprimer');
    if (o.statut === 'publiee') return b('modifier', 'Modifier') + b('pause', 'Pause') + b('pourvue', 'Pourvue') + b('archiver', 'Archiver');
    if (o.statut === 'pause') return b('reprendre', 'Reprendre', 'btn-p') + b('modifier', 'Modifier') + b('archiver', 'Archiver');
    if (o.statut === 'pourvue') return b('archiver', 'Archiver');
    return '';
  };
  async function formOffre(o, page, saisie) {
    const v = saisie || o || { contrat: 'CDI', temps: 'plein', teletravail: 'non', salaire_periode: 'mois', territoire: page?.territoire, commune: page?.commune || '' };
    const p = modale(o ? 'Modifier l’offre' : 'Nouvelle offre', `<label>Intitulé du poste <span class="muted">(« H/F » est ajouté automatiquement)</span><input type="text" name="intitule" required maxlength="120" value="${esc((v.intitule || '').replace(/ \(H\/F\)$/, ''))}"></label>
      <div class="g3"><label>Contrat<select name="contrat">${opts(CONTRATS, v.contrat)}</select></label><label>Temps<select name="temps"><option value="plein" ${v.temps === 'plein' ? 'selected' : ''}>Temps plein</option><option value="partiel" ${v.temps === 'partiel' ? 'selected' : ''}>Temps partiel</option></select></label>
        <label>Télétravail<select name="teletravail">${opts({ non: 'Non', partiel: 'Partiel', total: 'Total' }, v.teletravail)}</select></label></div>
      <div class="g2"><label>Commune<input type="text" name="commune" required maxlength="80" value="${esc(v.commune || '')}"></label><label>Territoire<select name="territoire" required>${optsT(v.territoire)}</select></label></div>
      <label class="case"><input type="checkbox" name="selon_profil" ${v.salaire_selon_profil ? 'checked' : ''}> Salaire « selon profil »</label>
      <div class="g3"><label>Salaire brut minimum (€)<input type="number" name="salaire_min" min="0" step="0.01" value="${v.salaire_min ?? ''}"></label><label>Maximum (€)<input type="number" name="salaire_max" min="0" step="0.01" value="${v.salaire_max ?? ''}"></label>
        <label>Par<select name="salaire_periode">${opts({ heure: 'heure', mois: 'mois', an: 'an' }, v.salaire_periode)}</select></label></div>
      <label>Missions<textarea name="missions" rows="4" maxlength="4000" required>${esc(v.missions || '')}</textarea></label>
      <label>Profil recherché <span class="muted">(compétences, diplômes, expérience)</span><textarea name="profil" rows="3" maxlength="3000">${esc(v.profil || '')}</textarea></label>
      <label class="case"><input type="checkbox" name="debutant" ${v.debutant_accepte ? 'checked' : ''}> Débutant accepté</label>
      <div class="g2"><label>Début du poste<input type="date" name="date_debut" value="${v.date_debut || ''}"></label><label>Date limite de candidature<input type="date" name="date_limite" value="${v.date_limite || ''}"></label></div>
      <p class="petit muted">Publication gratuite. L’annonce ne doit contenir aucun critère d’âge, de sexe, de situation familiale, d’origine, de santé ou d’apparence : la base la refuse sinon.</p>`, { valider: 'Enregistrer le brouillon', large: true });
    brancherLoi($('.modale form')); const d = await p; if (!d) return;
    const ligne = { org_id: ORG.id, intitule: d.intitule.trim(), contrat: d.contrat, temps: d.temps, teletravail: d.teletravail, commune: d.commune.trim(), territoire: d.territoire || null,
      salaire_selon_profil: !!d.selon_profil, salaire_min: d.salaire_min === '' ? null : Number(d.salaire_min), salaire_max: d.salaire_max === '' ? null : Number(d.salaire_max), salaire_periode: d.salaire_periode,
      missions: d.missions.trim(), profil: d.profil.trim(), debutant_accepte: !!d.debutant, date_debut: d.date_debut || null, date_limite: d.date_limite || null };
    try { await q(o ? sb.from('nx_offres').update(ligne).eq('id', o.id) : sb.from('nx_offres').insert(ligne)); toast('Offre enregistrée. Cliquez sur « Publier » pour la mettre en ligne.'); rendre(); }
    catch (err) { toast(erreur(err), true); return formOffre(o, page, ligne); }   // le formulaire se rouvre avec ce qui a été saisi
  }

  // ---------------------------------------------------------------- candidatures
  function pageCands(tete, offres, cands) {
    const filtre = param().offre || '', l = filtre ? cands.filter(c => c.offre_id === filtre) : cands, titre = id => (offres.find(o => o.id === id) || {}).intitule || '—';
    const carte = c => { const s = SUITE[c.statut];
      return `<div class="opp" style="cursor:default"><b>${esc(c.nom)}</b><span class="petit muted">${esc(titre(c.offre_id))} · ${dateFr(c.created_at)}</span>
        <p class="petit" style="margin:6px 0;white-space:pre-line">${esc(c.message.length > 220 ? c.message.slice(0, 220) + '…' : c.message)}</p>
        <p class="petit" style="margin:0">📞 <a href="tel:${esc(c.telephone.replace(/[^0-9+]/g, ''))}">${esc(c.telephone)}</a>${c.email ? ` · ✉️ <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}</p>
        ${c.cv_chemin ? `<button class="btn btn-s" data-cv="${esc(c.cv_chemin)}">📄 CV (PDF)</button>` : ''}${c.cv_url ? ` <a class="btn btn-s" href="${esc(c.cv_url)}" target="_blank" rel="noopener noreferrer">🔗 Lien du CV</a>` : ''}
        ${c.motif ? `<p class="petit muted" style="margin:6px 0 0">Motif : ${esc(c.motif)}</p>` : ''}${c.statut === 'retiree' ? '<span class="tag">Retirée par le candidat</span>' : ''}
        ${s ? `<div class="actions" style="margin-top:8px"><button class="btn btn-s btn-p" data-pas="${s[0]}" data-id="${c.id}">${s[1]}</button><button class="btn btn-s" data-pas="non_retenue" data-id="${c.id}">Non retenu</button></div>` : ''}</div>`; };
    vue(tete + `<div class="actions" style="margin-bottom:12px"><label class="petit">Offre <select id="filtreOffre"><option value="">Toutes les offres</option>${offres.map(o => `<option value="${o.id}" ${o.id === filtre ? 'selected' : ''}>${esc(o.intitule)}</option>`).join('')}</select></label></div>`
      + (l.length ? `<div class="kanban" style="grid-template-columns:repeat(5,minmax(200px,1fr))">${ETAPES.map(([k, t]) => { const x = l.filter(c => c.statut === k || (k === 'non_retenue' && c.statut === 'retiree'));
        return `<div class="col"><h3><span>${t}</span><span class="muted">${x.length}</span></h3>${x.map(carte).join('') || '<p class="petit muted" style="margin:4px">—</p>'}</div>`; }).join('')}</div>`
        : vide('Aucune candidature', 'Les candidatures reçues sur Travay arrivent ici, avec une notification.')));
    $('#filtreOffre').onchange = e => aller('#/recrutement/candidatures' + (e.target.value ? '?offre=' + e.target.value : ''));
    $('#page').onclick = async e => {
      const cv = e.target.closest('[data-cv]'), pas = e.target.closest('[data-pas]');
      try {
        if (cv) { const r = await q(sb.storage.from('cv').createSignedUrl(cv.dataset.cv, 120)); return void window.open(r.signedUrl, '_blank', 'noopener'); }
        if (!pas) return; const c = cands.find(x => x.id === pas.dataset.id), nv = pas.dataset.pas, refus = nv === 'non_retenue';
        const d = await modale(refus ? 'Candidature non retenue' : 'Faire avancer la candidature', `<p style="margin:0">${esc(c.nom)} · ${esc(titre(c.offre_id))}</p>
          ${refus ? '<label>Motif de la décision <span class="muted">(le candidat le reçoit)</span><input type="text" name="motif" required minlength="5" maxlength="300" placeholder="Ex. un autre profil correspondait mieux au poste"></label>' : ''}
          <label>Message au candidat ${refus ? '' : '<span class="muted">(facultatif)</span>'}<textarea name="message" rows="3" maxlength="1000" placeholder="${refus ? 'Merci pour votre candidature…' : 'Ex. Passez nous voir mardi à 10 h.'}"></textarea></label>
          <p class="petit muted">Le motif et le message ne doivent contenir aucun critère discriminant (âge, sexe, origine, santé…).</p>`, { valider: refus ? 'Confirmer le refus' : 'Valider' });
        if (!d) return; await q(sb.rpc('nx_candidature_statut', { cid: c.id, nouveau: nv, motif_s: d.motif || null, message_s: d.message || null })); toast('Le candidat est prévenu.'); rendre();
      } catch (err) { toast(erreur(err), true); }
    };
  }

  // ---------------------------------------------------------------- page de l'entreprise
  const reduireLogo = async f => {
    if (!/^image\//.test(f.type)) throw new Error('Choisissez une image (JPEG, PNG ou WebP).');
    const img = await createImageBitmap(f), k = Math.min(1, 480 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return new Promise(r => c.toBlob(r, 'image/jpeg', .88));
  };
  function pagePage(tete, p) {
    const v = p || { secteur: 'autre', taille: '1-9', valeurs: [], avantages: [], statut: 'brouillon', territoire: '', commune: ORG.ville || '' }, siretOk = ORG.siret && ORG.siret.replace(/\D/g, '').length === 14;
    const etat = { brouillon: ['', 'Non publiée'], publiee: ['ok', 'En ligne'], suspendue: ['ko', 'Suspendue par la modération'] }[v.statut];
    vue(tete + `<form class="grille" id="fPage"><div class="carte f"><h2>Page publique de ${esc(ORG.nom)} ${p ? tag(etat) : ''}</h2>
      ${v.motif_suspension ? `<p class="petit"><b>Motif de la suspension :</b> ${esc(v.motif_suspension)}</p>` : ''}
      <p class="petit ${siretOk ? 'muted' : ''}">${siretOk ? `Entreprise identifiée : SIRET ${esc(ORG.siret)} (affiché sur la page et les offres).` : '⚠️ Le SIRET (14 chiffres) est obligatoire pour publier : <a href="#/reglages">renseignez-le dans Réglages</a>.'}</p>
      <label>Présentation <span class="muted">(activité, équipe, projets : 30 caractères au moins)</span><textarea name="presentation" rows="5" maxlength="3000" required>${esc(v.presentation || '')}</textarea></label>
      <div class="g3"><label>Secteur<select name="secteur">${opts(SECTEURS, v.secteur)}</select></label><label>Taille de l’équipe<select name="taille">${TAILLES.map(t => `<option ${t === v.taille ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
        <label>Site web <span class="muted">(https://…)</span><input name="site_web" type="url" pattern="https://.+" maxlength="200" value="${esc(v.site_web || '')}"></label></div>
      <div class="g2"><label>Territoire<select name="territoire" required>${optsT(v.territoire)}</select></label><label>Commune<input type="text" name="commune" required maxlength="80" value="${esc(v.commune || '')}"></label></div>
      <label>Valeurs <span class="muted">(une par ligne, 8 au plus)</span><textarea name="valeurs" rows="3">${esc((v.valeurs || []).join('\n'))}</textarea></label>
      <label>Avantages <span class="muted">(une par ligne : tickets restaurant, mutuelle, horaires…)</span><textarea name="avantages" rows="3">${esc((v.avantages || []).join('\n'))}</textarea></label>
      <label>Logo <span class="muted">(image, facultatif)</span><input type="file" name="logo" accept="image/jpeg,image/png,image/webp"></label>
      <p class="petit muted">Aucune donnée financière n’est publiée : ni chiffre d’affaires, ni IBAN, ni coordonnées de contact. Les candidats vous écrivent par Travay.</p>
      <div class="actions"><button class="btn btn-p">${p ? 'Enregistrer' : 'Créer la page'}</button>${p && v.statut === 'brouillon' ? '<button type="button" class="btn" id="enLigne">Mettre la page en ligne</button>' : ''}${p && v.statut === 'publiee' ? '<button type="button" class="btn" id="horsLigne">Mettre hors ligne</button>' : ''}</div></div></form>`);
    brancherLoi($('#fPage'));
    const lignes = t => t.split('\n').map(x => x.trim()).filter(Boolean);
    $('#fPage').onsubmit = async e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = $('#fPage .btn-p'); b.disabled = true;
      try {
        const ligne = { org_id: ORG.id, presentation: d.presentation.trim(), secteur: d.secteur, taille: d.taille, territoire: d.territoire, commune: d.commune.trim(), site_web: d.site_web || null, valeurs: lignes(d.valeurs), avantages: lignes(d.avantages) };
        const f = $('#fPage [name=logo]').files[0];
        if (f) { const chemin = `${moi.id}/${Date.now()}-logo.jpg`; await q(sb.storage.from('photos').upload(chemin, await reduireLogo(f), { contentType: 'image/jpeg' })); ligne.logo = chemin; }
        await q(p ? sb.from('nx_recrut_pages').update(ligne).eq('org_id', ORG.id) : sb.from('nx_recrut_pages').insert(ligne)); toast('Page enregistrée.'); rendre();
      } catch (err) { toast(erreur(err), true); b.disabled = false; }
    };
    const bascule = st => async () => { try { await q(sb.from('nx_recrut_pages').update({ statut: st }).eq('org_id', ORG.id)); toast(st === 'publiee' ? 'Page en ligne.' : 'Page hors ligne.'); rendre(); } catch (err) { toast(erreur(err), true); } };
    if ($('#enLigne')) $('#enLigne').onclick = bascule('publiee'); if ($('#horsLigne')) $('#horsLigne').onclick = bascule('brouillon');
  }
})();
