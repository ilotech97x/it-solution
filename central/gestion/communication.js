/* NEXORA — emails de l'entreprise : modèles, envoi depuis la vraie messagerie (Gmail, Outlook ou l'appli mail), envois groupés, désinscriptions.
   NEXORA prépare le message (destinataires, objet, texte avec les bonnes valeurs) et l'ouvre dans la messagerie de l'entreprise ;
   on relit, on joint le PDF si besoin, on envoie. Chaque email préparé est noté dans l'historique du client. Base : communication.sql. */
'use strict';
const USAGES_MAIL = { libre: 'Libre', devis: 'Devis', facture: 'Facture', relance: 'Relance', prospection: 'Prospection' };
const STOP = '\n\nPour ne plus recevoir nos emails, répondez simplement « STOP ».';
// modèles proposés tant que l'entreprise n'a pas enregistré les siens (elle peut les modifier dans Emails > Modèles)
const MODELES_DEPART = [
  { nom: 'Envoi du devis', usage: 'devis', sujet: 'Devis {numero} — {objet}', corps: 'Bonjour {contact},\n\nVeuillez trouver ci-joint notre devis {numero} pour « {objet} », d’un montant de {montant}, valable jusqu’au {validite}.\n{gains}\nJe reste à votre disposition pour en parler.\n\nBien cordialement,\n{signature}' },
  { nom: 'Relance du devis', usage: 'devis', sujet: 'Votre devis {numero}', corps: 'Bonjour {contact},\n\nAvez-vous pu consulter notre devis {numero} pour « {objet} » ? Je peux l’ajuster ou répondre à vos questions.\n\nBien cordialement,\n{signature}' },
  { nom: 'Relance de facture', usage: 'relance', sujet: 'Facture {numero}', corps: 'Bonjour {contact},\n\nSauf erreur de notre part, la facture {numero} d’un montant de {montant} reste à régler. Merci de nous indiquer la date prévue du règlement.\n\nBien cordialement,\n{signature}' },
  { nom: 'Prise de contact', usage: 'prospection', sujet: '{entreprise} : une proposition pour {client}', corps: 'Bonjour {contact},\n\nJe me permets de vous écrire car nous aidons les entreprises comme {client} à [votre bénéfice principal].\nSeriez-vous disponible 15 minutes cette semaine pour en parler ?\n\nBien cordialement,\n{signature}' + STOP },
  { nom: 'Remerciement', usage: 'libre', sujet: 'Merci {contact}', corps: 'Bonjour {contact},\n\nMerci pour votre confiance. N’hésitez pas à revenir vers nous pour toute question.\n\nBien cordialement,\n{signature}' }];
const OUTILS_MAIL = { gmail: 'Gmail', outlook: 'Outlook', appli: 'Mon application mail' };
const outilMail = v => { try { if (v) localStorage.setItem('nxOutilMail', v); return localStorage.getItem('nxOutilMail') || 'gmail'; } catch (e) { return v || 'gmail'; } };
const signatureMail = () => [[profil?.prenom, profil?.nom].filter(Boolean).join(' '), ORG.nom, ORG.telephone, ORG.email].filter(Boolean).join('\n');
const remplirMail = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => v[k] ?? '').replace(/\n{3,}/g, '\n\n');
async function modelesMail() {
  const l = await q(sb.from('nx_modeles_email').select('*').eq('org_id', ORG.id).order('nom')).catch(() => []);
  return [...l, ...MODELES_DEPART.filter(m => !l.some(x => x.nom === m.nom)).map(m => ({ ...m, id: 'depart:' + m.nom }))];
}
// ouvrir le message dans la messagerie choisie (depuis l'adresse de l'entreprise quand c'est Gmail et qu'elle y est connectée)
function ouvrirMessagerie(outil, { a, cci, sujet, corps }) {
  const e = encodeURIComponent;
  if (outil === 'gmail') window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${e(a)}&bcc=${e(cci)}&su=${e(sujet)}&body=${e(corps)}${ORG.email ? '&authuser=' + e(ORG.email) : ''}`, '_blank', 'noopener');
  else if (outil === 'outlook') window.open(`https://outlook.office.com/mail/deeplink/compose?to=${e(a)}&bcc=${e(cci)}&subject=${e(sujet)}&body=${e(corps)}`, '_blank', 'noopener');
  else location.href = `mailto:${e(a)}?${cci ? 'bcc=' + e(cci) + '&' : ''}subject=${e(sujet)}&body=${e(corps)}`;
}
// écrire : à un client (a + client), ou à plusieurs en copie cachée (destinataires : [{ id, email, nom }])
async function ecrireMail({ a = '', client = null, destinataires = [], usage = 'libre', valeurs = {} }) {
  const modeles = await modelesMail(), val = { entreprise: ORG.nom, signature: signatureMail(), client: client?.nom || '', contact: client?.nom || 'Madame, Monsieur', ...valeurs };
  const choisi = modeles.find(m => m.usage === usage) || modeles[0];
  const attente = modale(destinataires.length ? `Envoi groupé · ${destinataires.length} destinataire${destinataires.length > 1 ? 's' : ''}` : 'Écrire un email', `
    <label>Modèle<select name="modele">${modeles.map(m => `<option value="${esc(m.id)}" ${m === choisi ? 'selected' : ''}>${esc(m.nom)} · ${esc(USAGES_MAIL[m.usage])}</option>`).join('')}</select></label>
    ${destinataires.length ? `<p class="petit muted" style="margin:0">En copie cachée (chacun ne voit que son adresse) : ${destinataires.slice(0, 6).map(d => esc(d.email)).join(', ')}${destinataires.length > 6 ? '…' : ''}</p><input type="hidden" name="a" value="${esc(ORG.email || '')}">`
      : `<label>À<input name="a" type="email" required value="${esc(a)}"></label>`}
    <label>Objet<input name="sujet" required maxlength="200" value="${esc(remplirMail(choisi.sujet, val))}"></label>
    <label>Message<textarea name="corps" rows="11" maxlength="6000">${esc(remplirMail(choisi.corps, val))}</textarea></label>
    <div class="g2"><label>Envoyer avec<select name="outil">${Object.entries(OUTILS_MAIL).map(([k, t]) => `<option value="${k}" ${outilMail() === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <p class="petit muted" style="margin:0;align-self:end">Le message s’ouvre dans votre messagerie${ORG.email ? `, depuis ${esc(ORG.email)}` : ''} : relisez-le, joignez le PDF si besoin, envoyez.</p></div>`,
    { valider: 'Ouvrir le message', large: true });
  const fm = $('.modale form');   // changer de modèle remplit l'objet et le message
  fm?.modele.addEventListener('change', () => { const m = modeles.find(x => x.id === fm.modele.value); if (m) { fm.sujet.value = remplirMail(m.sujet, val); fm.corps.value = remplirMail(m.corps, val); } });
  const d = await attente; if (!d) return false;
  const m = modeles.find(x => x.id === d.modele);
  if (destinataires.length && m?.usage === 'prospection' && !/STOP|désinscri|ne plus recevoir/i.test(d.corps)) { toast('Un email de prospection doit dire comment ne plus en recevoir : ajoutez la phrase « STOP ».', true); return false; }
  outilMail(d.outil);
  ouvrirMessagerie(d.outil, { a: d.a, cci: destinataires.map(x => x.email).join(','), sujet: d.sujet, corps: d.corps });
  const pour = destinataires.length ? destinataires.map(x => x.id) : client?.id ? [client.id] : [];
  if (pour.length) await q(sb.from('nx_activites').insert(pour.map(id => ({ org_id: ORG.id, client_id: id, type: 'email', titre: ('Email : ' + d.sujet).slice(0, 160), contenu: d.corps.slice(0, 4000), fait: true })))).catch(() => {});
  toast(pour.length ? 'Message ouvert dans votre messagerie et noté dans l’historique.' : 'Message ouvert dans votre messagerie.');
  return true;
}

// boutons « Écrire » des fiches et des devis (data-ecrire = id du client ; data-ecrire-devis = id du devis)
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-ecrire],[data-ecrire-devis],[data-opposition]'); if (!b || !ORG) return;
  e.preventDefault();
  try {
    if (b.dataset.opposition) {
      const non = b.dataset.etat !== 'oui';
      await q(sb.from('nx_clients').update({ opposition_email: non }).eq('id', b.dataset.opposition).eq('org_id', ORG.id));
      toast(non ? 'Noté : ce client ne recevra plus d’emails groupés.' : 'Ce client peut de nouveau recevoir vos emails.'); return rendre();
    }
    if (b.dataset.ecrire) { const c = await q(sb.from('nx_clients').select('*').eq('id', b.dataset.ecrire).single()); return ecrireMail({ a: c.email || '', client: c, usage: c.statut === 'prospect' ? 'prospection' : 'libre' }); }
    const d = await q(sb.from('nx_devis').select('*, nx_clients(*)').eq('id', b.dataset.ecrireDevis).single());
    const bil = bilanComparatif(d.comparatif, d.total_ttc);
    ecrireMail({ a: d.nx_clients?.email || '', client: d.nx_clients, usage: 'devis', valeurs: { numero: d.numero || '', objet: d.objet || '', montant: montant(d.total_ttc), validite: d.validite ? date(d.validite) : '',
      gains: bil && bil.economieAn > 0 ? `Avec cette solution, vous économisez environ ${montant(bil.economieAn)} par an, soit ${montant(bil.gain)} sur ${bil.n} an${bil.n > 1 ? 's' : ''} une fois le devis payé.\n` : '' } });
  } catch (err) { toast(erreur(err), true); }
});

// ---------------------------------------------------------------- page Emails : envois groupés, modèles, désinscrits
NX.pages.emails = async () => {
  if (!COMM) return vue(vide('Bientôt disponible', 'Les emails de l’entreprise arrivent avec la prochaine mise à jour de la base.'));
  const [clients, modeles] = await Promise.all([q(sb.from('nx_clients').select('id, nom, email, statut, opposition_email, opposition_at').eq('org_id', ORG.id).order('nom')), q(sb.from('nx_modeles_email').select('*').eq('org_id', ORG.id).order('nom'))]);
  const cible = param().cible || 'prospect';
  const joignables = clients.filter(c => c.email && !c.opposition_email && (cible === 'tous' || c.statut === cible));
  const lots = []; for (let i = 0; i < joignables.length; i += 30) lots.push(joignables.slice(i, i + 30));
  const desinscrits = clients.filter(c => c.opposition_email);
  vue(entete('Emails', 'Préparés par NEXORA, envoyés depuis la messagerie de l’entreprise, notés dans l’historique de chaque client')
    + `<div class="carte"><h2>Envoi groupé</h2><p class="muted petit" style="margin-top:0">Par lots de 30 en copie cachée. Les clients sans email ou désinscrits sont exclus.
        Prospection entre professionnels : le message doit concerner leur métier et dire comment ne plus en recevoir ; vers des particuliers, seulement avec leur accord.</p>
      <div class="puces" style="margin-bottom:12px">${[['prospect', 'Prospects'], ['client', 'Clients'], ['tous', 'Tous']].map(([k, t]) => `<a href="#/emails?cible=${k}" class="${cible === k ? 'on' : ''}">${t}</a>`).join('')}</div>
      ${lots.length ? `<div class="actions">${lots.map((l, i) => `<button class="btn ${i ? '' : 'btn-p'}" data-lot="${i}">✉️ Lot ${i + 1} · ${l.length} destinataire${l.length > 1 ? 's' : ''}</button>`).join('')}</div>` : '<p class="muted">Personne à joindre dans cette catégorie.</p>'}</div>
    <div class="carte" style="margin-top:16px"><div class="titre-l"><h2>Modèles</h2>${peut('crm') ? '<button class="btn btn-s btn-p" id="nvModele">+ Nouveau modèle</button>' : ''}</div>
      <p class="muted petit" style="margin-top:0">Variables remplacées à l’envoi : {client}, {contact}, {entreprise}, {numero}, {objet}, {montant}, {validite}, {gains} (économie du comparatif), {signature}.</p>
      ${tableau(['Nom', 'Usage', 'Objet', ''], [...modeles, ...MODELES_DEPART.filter(m => !modeles.some(x => x.nom === m.nom))].map(m => `<tr><td><b>${esc(m.nom)}</b>${m.id ? '' : ' <span class="muted petit">(modèle de départ)</span>'}</td><td>${esc(USAGES_MAIL[m.usage])}</td><td class="petit">${esc(m.sujet)}</td>
        <td class="num">${peut('crm') ? `<button class="btn btn-s" data-modele="${esc(m.id || 'depart:' + m.nom)}">${m.id ? 'Modifier' : 'Personnaliser'}</button>${m.id ? `<button class="btn btn-s btn-ko" data-suppr-modele="${m.id}" aria-label="Supprimer">×</button>` : ''}` : ''}</td></tr>`), '')}</div>
    <div class="carte" style="margin-top:16px"><h2>Ne veulent plus d’emails (${desinscrits.length})</h2>
      ${desinscrits.length ? tableau(['Client', 'Depuis', ''], desinscrits.map(c => `<tr><td><a href="#/clients/${c.id}">${esc(c.nom)}</a></td><td class="petit">${c.opposition_at ? date(c.opposition_at) : ''}</td><td class="num">${peut('crm') ? `<button class="btn btn-s" data-opposition="${c.id}" data-etat="oui">Réactiver</button>` : ''}</td></tr>`), '')
        : '<p class="muted petit">Personne. Quand un client répond « STOP », ouvrez sa fiche et touchez « Ne veut plus d’emails ».</p>'}</div>`);
  const editer = async (m = { nom: '', usage: 'libre', sujet: '', corps: '' }) => {
    const d = await modale(m.id ? 'Modifier le modèle' : 'Modèle d’email', `<div class="g2"><label>Nom<input name="nom" required minlength="2" maxlength="80" value="${esc(m.nom)}"></label>
      <label>Usage<select name="usage">${Object.entries(USAGES_MAIL).map(([k, t]) => `<option value="${k}" ${m.usage === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label>Objet<input name="sujet" required maxlength="200" value="${esc(m.sujet)}"></label><label>Message<textarea name="corps" required rows="10" maxlength="6000">${esc(m.corps)}</textarea></label>`, { large: true });
    if (!d) return;
    if (d.usage === 'prospection' && !/STOP|désinscri|ne plus recevoir/i.test(d.corps)) return toast('Un modèle de prospection doit dire comment ne plus recevoir vos emails (phrase « STOP »).', true);
    const v = { nom: d.nom.trim(), usage: d.usage, sujet: d.sujet.trim(), corps: d.corps.trim() };
    try { if (m.id) await q(sb.from('nx_modeles_email').update(v).eq('id', m.id)); else await q(sb.from('nx_modeles_email').insert({ org_id: ORG.id, ...v })); toast('Modèle enregistré.'); NX.pages.emails(); } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = async e => {
    const lot = e.target.closest('[data-lot]'); if (lot) return ecrireMail({ destinataires: lots[+lot.dataset.lot], usage: cible === 'prospect' ? 'prospection' : 'libre' });
    if (e.target.id === 'nvModele') return editer();
    const md = e.target.closest('[data-modele]');
    if (md) { const id = md.dataset.modele, m = id.startsWith('depart:') ? MODELES_DEPART.find(x => 'depart:' + x.nom === id) : modeles.find(x => x.id === id); return editer(id.startsWith('depart:') ? { ...m } : m); }
    const sp = e.target.closest('[data-suppr-modele]');
    if (sp && await confirmer('Supprimer le modèle', 'Ce modèle sera supprimé.', 'Supprimer')) { try { await q(sb.from('nx_modeles_email').delete().eq('id', sp.dataset.supprModele)); NX.pages.emails(); } catch (err) { toast(erreur(err), true); } }
  };
};
