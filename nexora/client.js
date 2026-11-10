/* NEXORA — espace client, sans compte (#/client) : le client ouvre son devis ou sa facture avec la référence et le code d'accès imprimés
   sur le document, le signe au doigt ou à la souris, suit ses paiements, choisit de régler en plusieurs fois et déclare un paiement,
   que l'entreprise confirme ensuite. Règles, droits et preuves : espace_client.sql ; cette page ne fait qu'afficher et envoyer. */
'use strict';
const ST_ESPACE = { envoye: ['att', 'En attente de votre réponse'], accepte: ['ok', 'Accepté'], refuse: ['ko', 'Refusé'], expire: ['', 'Expiré'],
  validee: ['att', 'À régler'], partielle: ['att', 'En partie réglée'], payee: ['ok', 'Réglée'], annulee: ['', 'Annulée'] };
const ETAT_ECH = { payee: ['ok', 'Payée'], partielle: ['att', 'En partie payée'], a_payer: ['att', 'À régler aujourd’hui'], en_retard: ['ko', 'En retard'], a_venir: ['', 'À venir'] };
const DECL_C = { a_verifier: ['att', 'À vérifier par l’entreprise'], confirme: ['ok', 'Reçu'], refuse: ['ko', 'Non reçu'] };
const MOYEN_C = { virement: 'Virement', carte: 'Carte bancaire', cheque: 'Chèque', especes: 'Espèces', autre: 'Autre' };
// même découpage que la base : centimes sur la première échéance, puis une échéance par mois
const decouper = (reste, nb) => { const part = Math.floor(reste * 100 / nb) / 100; return Array.from({ length: nb }, (_, i) => i ? part : Math.round((reste - part * (nb - 1)) * 100) / 100); };
const dansMois = n => { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };

NX.publiques.client = async () => {
  const p = param();
  let ref = (p.ref || '').trim(), code = (p.code || '').trim(), doc = null, trace = false;
  const page = h => pub(`${hautPublic()}<main class="espace-client" id="cli">${h}</main>`);
  const formulaire = (msg = '') => {
    page(`<div class="carte-auth"><div class="carte"><h1>Espace client</h1>
      <p class="muted">Ouvrez votre devis ou votre facture : la référence et le code d’accès sont écrits sur le document. Pas de compte à créer.</p>
      <form class="f" id="fCli"><label>Référence<input name="ref" required maxlength="40" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="F-2026-0001" value="${esc(ref)}"></label>
        <label>Code d’accès<input name="code" required maxlength="20" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" value="${esc(code)}"></label>
        ${msg ? `<p class="tag ko" role="alert">${esc(msg)}</p>` : ''}<button class="btn btn-p">Ouvrir le document</button></form>
      <p class="petit muted">Gardez ce code pour vous : il donne accès au document.</p></div></div>`);
    $('#fCli').addEventListener('submit', e => { e.preventDefault(); ref = e.target.ref.value.trim(); code = e.target.code.value.trim(); ouvrir(); });
  };
  const ouvrir = async () => {
    if (!ref || !code) return formulaire();
    try { doc = await q(sb.rpc('nx_portail', { ref, code })); } catch (e) { return formulaire(erreur(e)); }
    if (!doc) return formulaire('Référence ou code d’accès incorrect.');
    try { history.replaceState(history.state, '', `#/client?ref=${encodeURIComponent(doc.numero)}&code=${encodeURIComponent(code)}`); } catch (e) { /* facultatif */ }
    afficher();
  };
  const envoyer = async (fn, args, ok) => {
    try { const r = await q(sb.rpc(fn, { ref, code, ...args })); if (!r) return formulaire('Référence ou code d’accès incorrect.'); doc = r; toast(ok); afficher(); } catch (e) { toast(erreur(e), true); }
  };

  function afficher() {
    const d = doc, o = d.org, fac = d.type === 'facture', dev = o.devise || 'EUR', m = n => montant(n, dev);
    const st = ST_ESPACE[d.statut] || ['', d.statut];
    const suivi = [[fac ? 'Facture émise' : 'Devis envoyé', d.emise_le || d.date, true], ['Consulté', d.vu_le, true],
      d.signature ? [d.signature.decision === 'refuse' ? 'Refusé' : 'Signé « bon pour accord »', d.signature.le, true] : [fac ? 'Signature (facultative)' : 'Votre réponse', null, false],
      ...(fac ? [[d.echeances.length ? `Paiement en ${d.echeances.length} fois` : 'Paiement', null, d.paye > 0 || d.echeances.length > 0], ['Réglée', null, d.statut === 'payee']] : [])];
    const lignes = d.lignes.map(l => `<tr><td>${esc(l.designation)}</td><td class="num">${nombre(l.quantite)} ${esc(l.unite)}</td><td class="num">${m(l.prix_ht)}</td>
      ${o.franchise_tva ? '' : `<td class="num">${nombre(l.taux_tva)} %</td>`}<td class="num">${m(Math.round(l.quantite * l.prix_ht * (1 - l.remise_pct / 100) * 100) / 100)}</td></tr>`).join('');
    const reste = Number(d.reste || 0), prochaine = (d.echeances || []).find(e => e.etat !== 'payee');
    page(`<div class="ec-tete carte"><div><p class="muted petit">${esc(o.nom)}${o.ville ? ' · ' + esc(o.ville) : ''}</p><h1>${fac ? 'Facture' : 'Devis'} <span class="mono">${esc(d.numero)}</span></h1>
        <p>${esc(d.objet || '')}</p><p>${tag(st)} <span class="muted petit">${fac ? `Émise le ${date(d.date)}${d.echeance ? ` · échéance ${date(d.echeance)}` : ''}` : `Du ${date(d.date)}${d.validite ? ` · valable jusqu’au ${date(d.validite)}` : ''}`}</span></p></div>
        <div class="ec-total"><span class="muted petit">${fac && d.statut !== 'payee' ? 'Reste à payer' : 'Total TTC'}</span><b>${m(fac && d.statut !== 'payee' ? reste : d.total_ttc)}</b>
          <button class="btn btn-s no-print" id="ecImprimer" type="button">Imprimer / PDF</button></div></div>
      <ol class="ec-suivi carte" aria-label="Suivi">${suivi.map(([t, quand, fait]) => `<li class="${fait ? 'fait' : ''}"><b>${esc(t)}</b>${quand ? `<span class="muted petit">${dateHeure(quand)}</span>` : ''}</li>`).join('')}</ol>
      ${!fac && d.facture ? `<div class="carte"><p>✓ Votre facture est prête : <a href="#/client?ref=${encodeURIComponent(d.facture.numero)}&code=${encodeURIComponent(d.facture.code)}" id="versFacture"><b class="mono">${esc(d.facture.numero)}</b> — l’ouvrir</a></p></div>` : ''}
      <div class="carte"><h2>Détail</h2><div class="tab-boite"><table class="tab"><thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">Prix HT</th>${o.franchise_tva ? '' : '<th class="num">TVA</th>'}<th class="num">Total HT</th></tr></thead><tbody>${lignes}</tbody></table></div>
        <div class="totaux"><div><span>Total HT</span><b>${m(d.total_ht)}</b></div>${o.franchise_tva ? '' : `<div><span>TVA</span><span>${m(d.total_tva)}</span></div>`}<div class="ttc"><span>Total TTC</span><span>${m(d.total_ttc)}</span></div>
          ${fac && Number(d.paye) ? `<div><span>Déjà réglé</span><span>${m(d.paye)}</span></div><div><b>Reste à payer</b><b>${m(reste)}</b></div>` : ''}</div>
        ${o.franchise_tva ? '<p class="petit muted">TVA non applicable, art. 293 B du CGI.</p>' : ''}${d.conditions ? `<p class="petit muted" style="white-space:pre-line">${esc(d.conditions)}</p>` : ''}</div>
      ${blocSignature(d)}
      ${fac ? blocPaiement(d, m, reste, prochaine) : ''}
      <p class="petit muted ec-pied">${esc(o.nom)}${o.siret ? ` · SIRET ${esc(o.siret)}` : ''}${o.telephone ? ` · ${esc(o.telephone)}` : ''}${o.email ? ` · ${esc(o.email)}` : ''}</p>`);
    brancher(d);
  }

  function blocSignature(d) {
    if (d.signature) {
      const s = d.signature;
      return `<div class="carte"><h2>${s.decision === 'refuse' ? 'Votre réponse' : 'Signature'}</h2>
        ${s.decision === 'refuse' ? `<p>Devis refusé par <b>${esc(s.nom)}</b> le ${dateHeure(s.le)}.</p>`
          : `<div class="ec-sig"><img src="${esc(s.image)}" alt="Signature de ${esc(s.nom)}"><p>Bon pour accord, signé par <b>${esc(s.nom)}</b> le ${dateHeure(s.le)}.</p></div>`}
        <p class="petit muted">Empreinte du document signé : <span class="mono">${esc(s.empreinte.slice(0, 16))}…</span></p></div>`;
    }
    if (!d.peut_signer) return '';
    const fac = d.type === 'facture';
    return `<div class="carte"><h2>${fac ? 'Signer la facture (bon pour accord)' : 'Accepter et signer le devis'}</h2>
      <p class="muted petit">${fac ? 'Votre signature confirme que vous êtes d’accord avec cette facture. Elle ne change rien au montant.' : 'En signant, vous acceptez ce devis tel qu’il est affiché ci-dessus (« bon pour accord »).'}</p>
      <form class="f" id="fSig"><label>Nom et prénom<input name="nom" required minlength="2" maxlength="120" autocomplete="name"></label>
        <div class="ec-pad"><canvas id="pad" aria-label="Cadre de signature : signez avec le doigt ou la souris"></canvas><span class="muted petit" id="padAide">Signez ici avec le doigt ou la souris</span></div>
        <label class="case"><input type="checkbox" name="accord" required> ${fac ? 'Je confirme cette facture' : 'J’ai lu ce devis et je l’accepte'} (bon pour accord)</label>
        <div class="actions"><button class="btn btn-p" id="signer">Signer</button><button class="btn" type="button" id="effacer">Effacer</button>
          ${fac ? '' : '<button class="btn btn-ko" type="button" id="refuser">Refuser ce devis</button>'}</div></form></div>`;
  }

  function blocPaiement(d, m, reste, prochaine) {
    if (!['validee', 'partielle', 'payee'].includes(d.statut)) return '';
    const o = d.org, choix = [2, 3, 4].filter(n => n <= d.echeancier_max);
    const ech = d.echeances.length ? `<h3>Votre paiement en ${d.echeances.length} fois</h3><ul class="ec-ech">${d.echeances.map(e => `<li><span>${e.rang}. ${date(e.date)}</span><b>${m(e.montant)}</b>${tag(ETAT_ECH[e.etat] || ['', e.etat])}</li>`).join('')}</ul>`
      : d.peut_echelonner ? `<details class="ec-plus"><summary><b>Régler en ${choix.join(', ').replace(/, (\d)$/, ' ou $1')} fois, sans frais</b></summary>
          <p class="petit muted">Première échéance aujourd’hui, puis une par mois. Aucun frais, aucun intérêt.</p>
          ${choix.map(n => `<div class="ec-option"><div><b>${n} fois</b><span class="petit muted">${decouper(reste, n).map((x, i) => `${m(x)} le ${date(dansMois(i))}`).join(' · ')}</span></div>
            <button class="btn btn-s" type="button" data-fois="${n}">Choisir</button></div>`).join('')}</details>` : '';
    const comment = d.statut === 'payee' ? '' : `<h3>Comment payer</h3><div class="ec-moyens">
      ${o.lien_paiement ? `<a class="btn btn-p" href="${esc(o.lien_paiement)}" target="_blank" rel="noopener noreferrer">Payer par carte</a>` : ''}
      ${o.iban ? `<div class="ec-rib"><b>Virement</b><span>IBAN <span class="mono">${esc(o.iban)}</span>${o.bic ? ` · BIC <span class="mono">${esc(o.bic)}</span>` : ''}</span><span>Libellé : <span class="mono">${esc(d.numero)}</span></span></div>` : ''}
      <p class="petit muted">Chèque ou espèces : auprès de ${esc(o.nom)}${o.telephone ? ` (${esc(o.telephone)})` : ''}.</p></div>
      ${d.peut_declarer ? `<details class="ec-plus"><summary><b>J’ai payé : prévenir l’entreprise</b></summary>
        <form class="f" id="fDecl"><div class="g2"><label>Montant (€)<input name="montant" type="number" step="0.01" min="0.01" max="${reste}" required value="${(prochaine && prochaine.etat !== 'partielle' ? Math.min(prochaine.montant, reste) : reste).toFixed(2)}"></label>
          <label>Moyen<select name="moyen">${Object.entries(MOYEN_C).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></label></div>
          <label>Référence <span class="muted">(facultatif)</span><input name="ref_c" maxlength="80" placeholder="Libellé du virement, n° de chèque…"></label>
          <label>Message <span class="muted">(facultatif)</span><input name="message" maxlength="500"></label>
          <button class="btn btn-p">Envoyer</button><p class="petit muted">L’entreprise vérifie la réception, puis le paiement apparaît ici.</p></form></details>` : ''}`;
    const decl = d.declarations.length ? `<h3>Paiements signalés</h3><ul class="ec-ech">${d.declarations.map(x => `<li><span>${dateHeure(x.le)} · ${MOYEN_C[x.moyen] || x.moyen}</span><b>${m(x.montant)}</b>${tag(DECL_C[x.statut])}</li>`).join('')}</ul>` : '';
    const recus = d.paiements.length ? `<h3>Paiements reçus</h3><ul class="ec-ech">${d.paiements.map(x => `<li><span>${date(x.date)} · ${MOYEN_C[x.moyen] || x.moyen}</span><b>${m(x.montant)}</b>${tag(['ok', 'Reçu'])}</li>`).join('')}</ul>` : '';
    return `<div class="carte"><h2>Paiement</h2>${d.statut === 'payee' ? '<p>✓ Cette facture est entièrement réglée. Merci !</p>' : `<p>Reste à payer : <b>${m(reste)}</b></p>`}${ech}${comment}${decl}${recus}</div>`;
  }

  function brancher(d) {
    $('#ecImprimer').onclick = () => window.print();
    const v = $('#versFacture'); if (v) v.onclick = e => { e.preventDefault(); ref = d.facture.numero; code = d.facture.code; ouvrir(); };
    $$('[data-fois]').forEach(b => { b.onclick = async () => {
      if (await confirmer(`Payer en ${b.dataset.fois} fois`, 'Votre échéancier sera enregistré et l’entreprise en sera informée. La première échéance est à régler aujourd’hui.', 'Confirmer'))
        envoyer('nx_portail_echeancier', { nb: Number(b.dataset.fois) }, 'Échéancier enregistré.');
    }; });
    const fd = $('#fDecl');
    if (fd) fd.addEventListener('submit', e => { e.preventDefault(); const x = Object.fromEntries(new FormData(fd));
      envoyer('nx_portail_declarer', { somme: Number(x.montant), moyen_c: x.moyen, ref_c: x.ref_c || null, message_c: x.message || null }, 'Merci, l’entreprise est prévenue.'); });
    const pad = $('#pad'); if (!pad) return;
    // cadre de signature : tracé au doigt, au stylet ou à la souris ; exporté en PNG
    const ctx = pad.getContext('2d'), r = Math.min(window.devicePixelRatio || 1, 2);
    const taille = () => { const w = pad.parentElement.clientWidth; pad.width = w * r; pad.height = 180 * r; pad.style.height = '180px'; ctx.scale(r, r); ctx.lineWidth = 2.4; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#0B1220'; trace = false; };
    taille();
    let en = false, dernier = null;
    const point = e => { const b = pad.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    pad.addEventListener('pointerdown', e => { en = true; dernier = point(e); pad.setPointerCapture(e.pointerId); e.preventDefault(); });
    pad.addEventListener('pointermove', e => { if (!en) return; const p2 = point(e); ctx.beginPath(); ctx.moveTo(...dernier); ctx.lineTo(...p2); ctx.stroke(); dernier = p2; trace = true; $('#padAide').hidden = true; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => pad.addEventListener(t, () => { en = false; }));
    $('#effacer').onclick = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height); taille(); $('#padAide').hidden = false; };
    $('#fSig').addEventListener('submit', e => {
      e.preventDefault(); if (!e.target.reportValidity()) return;
      if (!trace) return toast('Signez dans le cadre avant de valider.', true);
      envoyer('nx_portail_signer', { nom_signataire: e.target.nom.value.trim(), image_png: pad.toDataURL('image/png'), decision_c: 'accepte', motif_c: null },
        d.type === 'facture' ? 'Facture signée. Merci !' : 'Devis accepté et signé. Merci !');
    });
    const rf = $('#refuser');
    if (rf) rf.onclick = async () => {
      const nom = $('#fSig').nom.value.trim(); if (nom.length < 2) { $('#fSig').nom.focus(); return toast('Écrivez d’abord votre nom.', true); }
      const x = await modale('Refuser ce devis', '<label>Pourquoi ? <span class="muted">(facultatif, aide l’entreprise à vous refaire une proposition)</span><textarea name="motif" maxlength="500"></textarea></label>', { valider: 'Refuser le devis' });
      if (x) envoyer('nx_portail_signer', { nom_signataire: nom, image_png: null, decision_c: 'refuse', motif_c: x.motif || null }, 'Réponse envoyée.');
    };
  }

  ouvrir();
};
