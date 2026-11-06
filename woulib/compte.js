/* Woulib — compte et droits, chargé à la première ouverture : profil, adresses, favoris, paiement, sécurité, confidentialité
   (télécharger mes données, supprimer mon compte), assistance, bouton « Signaler ». Leur suivi : ILO CONTROL (control/control.js).
   Base : commun/compte.sql, commun/signalements.sql, commun/assistance.sql. Tant qu'ils ne sont pas installés,
   les demandes passent par l'email ou WhatsApp. */
'use strict';

const EMAIL_IT = 'ilotech.contact@gmail.com';
// la base a-t-elle reçu compte.sql, signalements.sql et assistance.sql ?
let droitsV = null;
const droitsInstalles = () => droitsV ??= q(sb.rpc('suppression_possible')).then(() => true, () => false);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUJETS = { commande: 'Une commande', course: 'Une course', colis: 'Un colis', compte: 'Mon compte', donnees: 'Mes données personnelles', pro: 'Mon espace pro', autre: 'Autre chose' };
const MOTIFS = [['arnaque', 'Arnaque ou prix trompeur'], ['faux', 'Fausse information ou faux profil'], ['danger', 'Danger ou conduite à risque'],
  ['harcelement', 'Insulte, harcèlement ou menace'], ['illegal', 'Vente ou contenu illégal (alcool à un mineur…)'], ['choquant', 'Contenu choquant'],
  ['droits', 'Photo ou texte copié sans droit'], ['autre', 'Autre chose']];
const ST_AIDE = { ouverte: ['att', 'En attente'], repondue: ['ok', 'Répondu'], close: ['gris', 'Close'] };
const ST_SIGNAL = { ouvert: ['att', 'Envoyé'], en_cours: ['att', 'En examen'], traite: ['ok', 'Traité'], rejete: ['gris', 'Sans suite'] };
const entete = t => `<a class="retour-l" href="#/compte">${ICO.retour}Mon compte</a><h1>${t}</h1>`;
// message d'une fonction de la base, sans son code (COMPTE_PRO, EN_COURS…)
const sansCode = e => erreur(e).replace(/^[A-Z_]{4,}\s+/, '');

APP.sousCompte = sous => ({ profil: pageProfil, securite: pageSecurite, confidentialite: pageConfidentialite, adresses: pageAdresses, favoris: pageFavoris, paiement: pagePaiement }[sous] || (() => aller('#/compte')))();

// ---------------------------------------------------------------- adresses enregistrées (commun/adresses.sql) : dans le compte, privées
// Sans la table dans la base, les lieux restent ceux gardés sur cet appareil (Bouger › « Enregistrer ce lieu »).
async function pageAdresses() {
  const l = await q(sb.from('adresses').select('*').order('created_at')).catch(() => null);
  let locaux = []; try { locaux = JSON.parse(localStorage.getItem('kvAdresses')) || []; } catch (e) { /* stockage indisponible */ }
  const ligne = (a, cle) => `<div class="adr-l"><span class="adr-i" aria-hidden="true">${esc(a.icone || '⭐')}</span><span><b>${esc(a.titre)}</b><small>${esc((a.adresse || a.nom || '').split(',').slice(0, 3).join(','))}</small></span>
    <button type="button" class="btn-icone" ${cle} aria-label="Retirer ${esc(a.titre)}">${ICO.poubelle}</button></div>`;
  vue(`<div class="wrap compte-s">${entete('Adresses')}
    <p class="muted">${l ? 'Vos lieux enregistrés reviennent en un geste dans Bouger, sur tous vos appareils. Ils restent privés : personne d’autre ne les voit.' : 'Vos lieux sont gardés sur cet appareil. Ajoutez-en depuis Bouger : « Enregistrer ce lieu ».'}</p>
    ${l && locaux.length ? `<div class="bandeau info">${ICO.info}<span><b>${locaux.length} lieu${locaux.length > 1 ? 'x sont gardés' : ' est gardé'} sur cet appareil.</b> Ajoutez-${locaux.length > 1 ? 'les' : 'le'} à votre compte pour ${locaux.length > 1 ? 'les' : 'le'} retrouver partout.
      <button type="button" class="btn btn-s btn-sec" id="importer" style="margin-top:8px">Ajouter à mon compte</button></span></div>` : ''}
    <div class="liste-g">${(l || locaux).map((a, i) => ligne(a, l ? `data-suppr="${a.id}"` : `data-local="${i}"`)).join('') || '<p class="muted" style="padding:14px;margin:0">Aucune adresse pour l’instant.</p>'}</div>
    ${l ? `<form class="f panneau" id="fAdr" style="margin-top:16px"><h2>Ajouter une adresse</h2>
      <label>Nom<input name="titre" required maxlength="20" placeholder="Maison, Travail, Maman…"></label>
      <label>Adresse<input name="adresse" required minlength="3" maxlength="200" placeholder="12 rue Schœlcher, Le Lamentin" autocomplete="street-address"></label>
      <button class="btn btn-p">Chercher l’adresse</button><div id="resAdr" aria-live="polite"></div></form>` : ''}</div>`);
  const iconeDe = t => /maison|chez/i.test(t) ? '🏠' : /travail|bureau|boulot/i.test(t) ? '💼' : '⭐';
  $('#app').onclick = async e => {
    const s = e.target.closest('[data-suppr]'), lo = e.target.closest('[data-local]'), ch = e.target.closest('[data-choix]');
    if (s) { try { await q(sb.from('adresses').delete().eq('id', s.dataset.suppr)); toast('Adresse retirée.'); pageAdresses(); } catch (err) { toast(erreur(err), true); } }
    if (lo) { locaux.splice(Number(lo.dataset.local), 1); try { localStorage.setItem('kvAdresses', JSON.stringify(locaux)); } catch (x) { /* stockage indisponible */ } toast('Lieu retiré de cet appareil.'); pageAdresses(); }
    if (e.target.closest('#importer')) {
      try {
        const deja = new Set(l.map(a => a.titre.toLowerCase()));
        const nv = locaux.filter(a => a.titre && !deja.has(a.titre.toLowerCase())).slice(0, Math.max(0, 10 - l.length)).map(a => ({ titre: a.titre.slice(0, 20), icone: a.icone || '⭐', adresse: String(a.nom).slice(0, 300), lat: a.lat, lng: a.lng, territoire: a.terr || null }));
        if (nv.length) await q(sb.from('adresses').insert(nv));
        localStorage.removeItem('kvAdresses'); toast('Lieux ajoutés à votre compte.'); pageAdresses();
      } catch (err) { toast(erreur(err), true); }
    }
    if (ch) {
      const f = $('#fAdr'), x = JSON.parse(ch.dataset.choix), titre = f.titre.value.trim();
      try { await q(sb.from('adresses').insert({ titre, icone: iconeDe(titre), adresse: x.nom.slice(0, 300), lat: x.lat, lng: x.lng, territoire: territoireActif() })); toast('Adresse enregistrée.'); pageAdresses(); }
      catch (err) { toast(/duplicate|unique|23505/i.test(err.message || err.code || '') ? 'Vous avez déjà une adresse avec ce nom.' : sansCode(err), true); }
    }
  };
  $('#fAdr')?.addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); $('#resAdr').textContent = 'Recherche…';
    try {
      const r = await geocoder(d.adresse.trim(), territoireActif());
      $('#resAdr').innerHTML = r.length ? `<p class="petit muted" style="margin:0 0 6px">Touchez la bonne adresse :</p><div class="liste-g">${r.map(x => `<button type="button" class="sugg-l" data-choix="${esc(JSON.stringify(x))}">${ICO.pin}<span>${esc(x.nom)}</span></button>`).join('')}</div>` : 'Aucune adresse trouvée : précisez la commune.';
    } catch (err) { $('#resAdr').textContent = 'Recherche indisponible, réessayez.'; }
  });
}

// ---------------------------------------------------------------- favoris : restaurants et commerces marqués d'un cœur
async function pageFavoris() {
  const f = (await q(sb.from('favoris_resto').select('restaurant_id, created_at, restaurants(*)').order('created_at', { ascending: false })).catch(() => [])).filter(x => x.restaurants);
  vue(`<div class="wrap compte-s">${entete('Favoris')}
    ${f.length ? `<div class="liste-restos">${f.map(x => carteResto(x.restaurants)).join('')}</div><p class="muted petit" style="margin-top:12px">Pour retirer un favori, touchez le cœur sur sa page.</p>`
      : `<div class="vide-etat"><span class="ico">${ICO.coeur}</span><h3>Aucun favori pour l’instant</h3><p class="muted">Touchez le cœur sur la page d’un restaurant ou d’un commerce : il apparaîtra ici et en haut de Manger.</p><a class="btn btn-p" href="#/manger">Voir les restaurants</a></div>`}</div>`);
}

// ---------------------------------------------------------------- moyens de paiement : ce qui est vrai aujourd'hui
function pagePaiement() {
  vue(`<div class="wrap compte-s">${entete('Moyens de paiement')}
    <div class="bandeau info">${ICO.info}<span>Pour l’instant, vous payez directement <b>le livreur, le chauffeur ou le commerçant</b> : en espèces, ou par carte quand il l’accepte. Woulib ne garde aucune carte bancaire.</span></div>
    <div class="liste-g" style="margin-top:14px">${[[ICO.manger, 'Repas et commerces', 'Au livreur à la livraison, ou sur place au retrait'], [ICO.taxi, 'Taxi et VTC', 'Au chauffeur, à la fin de la course'], [ICO.colis, 'Colis', 'Au livreur, selon ce qui est convenu à la commande']]
      .map(([i, t, d]) => `<div class="menu-l"><span class="ico-l">${i}</span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
    <p class="muted petit" style="margin-top:12px">Le paiement en ligne arrivera plus tard, avec un prestataire agréé : vous serez prévenu dans l’appli.</p></div>`);
}

// ---------------------------------------------------------------- profil
async function pageProfil() {
  const c = await q(sb.from('contacts').select('telephone').eq('id', moi.id).maybeSingle()).catch(() => null);
  vue(`<div class="wrap compte-s">${entete('Mon profil')}
    <form class="f panneau" id="fProfil"><div class="ligne2"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name" value="${esc(profil?.prenom)}"></label>
      <label>Nom<input name="nom" maxlength="60" autocomplete="family-name" value="${esc(profil?.nom)}"></label></div>
      <label>Téléphone <span class="aide">(le restaurant, le chauffeur ou le livreur vous joint à ce numéro)</span><input type="tel" name="telephone" pattern="[0-9 +.\\-]{6,20}" autocomplete="tel" value="${esc(c?.telephone || '')}"></label>
      <label>Territoire <span class="aide">(ce que l’appli vous montre en premier)</span><select name="territoire">${optsTerritoires(profil?.territoire || terrPrefere(), 'Choisir')}</select></label>
      <label>Email<input type="email" value="${esc(moi.email)}" disabled></label>
      <p class="aide" style="margin:0">Pour changer d’email, écrivez à l’<a href="#/assistance?sujet=compte">assistance</a>.</p>
      <button class="btn btn-p">Enregistrer</button></form></div>`);
  $('#fProfil').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try {
      await q(sb.from('profiles').update({ prenom: d.prenom.trim(), nom: d.nom.trim(), territoire: d.territoire || null }).eq('id', moi.id));
      await q(sb.from('contacts').update({ telephone: d.telephone.trim() || null }).eq('id', moi.id));
      if (d.territoire) terrPrefere(d.territoire);
      await chargerMoi(); toast('Profil enregistré.'); aller('#/compte');
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
}

// ---------------------------------------------------------------- sécurité
function pageSecurite() {
  vue(`<div class="wrap compte-s">${entete('Sécurité')}
    <form class="f panneau" id="fMdp"><h2 style="margin:0">Changer de mot de passe</h2>
      <label>Nouveau mot de passe <span class="aide">(8 caractères au moins, avec une majuscule, une minuscule et un chiffre)</span><input type="password" name="mdp" required minlength="8" autocomplete="new-password"></label>
      <label>Le même, une seconde fois<input type="password" name="mdp2" required minlength="8" autocomplete="new-password"></label>
      <button class="btn btn-p">Changer le mot de passe</button></form>
    <div class="panneau" style="margin-top:16px"><h2 style="margin:0">Appareils connectés</h2>
      <p class="muted">Téléphone prêté, perdu ou volé ? Fermez votre session partout : il faudra vous reconnecter sur chaque appareil.</p>
      <button class="btn" id="partout" type="button">Se déconnecter de tous les appareils</button></div></div>`);
  $('#fMdp').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button');
    if (!/[a-z]/.test(d.mdp) || !/[A-Z]/.test(d.mdp) || !/[0-9]/.test(d.mdp)) return toast('Ajoutez au moins une majuscule, une minuscule et un chiffre.', true);
    if (d.mdp !== d.mdp2) return toast('Les deux mots de passe ne sont pas les mêmes.', true);
    b.disabled = true;
    try { await q(sb.auth.updateUser({ password: d.mdp })); e.target.reset(); toast('Mot de passe changé.'); }
    catch (err) { toast(/reauth|recent/i.test(err?.message || '') ? 'Par sécurité, déconnectez-vous puis reconnectez-vous avant de changer le mot de passe.' : /different/i.test(err?.message || '') ? 'Choisissez un mot de passe différent de l’actuel.' : erreur(err), true); }
    b.disabled = false;
  });
  $('#partout').addEventListener('click', async () => {
    try { await sb.auth.signOut({ scope: 'global' }); } catch (err) { /* la session locale est fermée quoi qu'il arrive */ }
    await chargerMoi(); toast('Vous êtes déconnecté de tous vos appareils.'); aller('#/connexion');
  });
}

// ---------------------------------------------------------------- confidentialité : mes données, supprimer mon compte
async function pageConfidentialite() {
  attente();
  const ok = await droitsInstalles(), s = ok ? await q(sb.rpc('suppression_possible')).catch(() => ({})) : {};
  const supprimer = !ok ? `<p>Pour l’instant, demandez-le par email à <b>${EMAIL_IT}</b>. Nous répondons sous un mois au plus.</p>`
    : s.demande === 'a_finaliser' ? '<p><b>Votre demande est enregistrée.</b> L’équipe termine l’effacement de vos identifiants sous un mois au plus.</p>'
    : s.pro ? `<p>Votre compte a ${esc(s.pro)}. La suppression se fait avec l’équipe IloTech : la loi oblige à garder certaines informations des professionnels (comptabilité, déclarations fiscales).</p>
        <button class="btn" type="button" id="supEquipe">Demander la suppression à l’équipe</button>`
    : s.en_cours ? `<p>Terminez ou annulez d’abord ${esc(s.en_cours)}. Ensuite, vous pourrez supprimer votre compte ici.</p>`
    : `<ul class="liste-d"><li><b>Effacé :</b> votre nom, votre téléphone, votre email, vos adresses, vos favoris, le texte de vos avis et de vos messages, vos notifications.</li>
        <li><b>Gardé sans votre nom :</b> les montants et les dates de vos commandes, trajets et billets. La loi oblige les professionnels à les garder (5 à 10 ans).</li></ul>
      <form class="f" id="fSup"><label>Pourquoi partez-vous ? <span class="aide">(facultatif, cela nous aide)</span><textarea name="motif" maxlength="500" style="min-height:70px"></textarea></label>
        <label class="case-l"><input type="checkbox" name="compris" required> <span>J’ai compris : la suppression est définitive.</span></label>
        <button class="btn btn-ko" id="btnSup">Supprimer mon compte</button></form>`;
  vue(`<div class="wrap compte-s">${entete('Confidentialité')}
    <p class="muted">Ce que nous faisons de vos données, en clair : <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>.</p>
    <div class="panneau"><h2 style="margin:0">Télécharger mes données</h2>
      <p>Un fichier avec tout ce qui est lié à votre compte : profil, commandes, trajets, colis, billets, réservations, avis, messages. Il s’ouvre avec un éditeur de texte (format JSON).</p>
      ${ok ? '<button class="btn btn-p" type="button" id="export">Télécharger mes données</button>' : `<p>Pour l’instant, demandez-les par email à <b>${EMAIL_IT}</b>. Nous répondons sous un mois au plus.</p>`}</div>
    <div class="panneau" style="margin-top:16px"><h2 style="margin:0">Supprimer mon compte</h2>${supprimer}</div></div>`);
  $('#export')?.addEventListener('click', async e => {
    const b = e.currentTarget; b.disabled = true;
    try {
      const d = await q(sb.rpc('mes_donnees'));
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' }));
      a.download = `mes-donnees-woulib-${new Date().toISOString().slice(0, 10)}.json`; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 60000); toast('Fichier téléchargé.');
    } catch (err) { toast(erreur(err), true); }
    b.disabled = false;
  });
  $('#supEquipe')?.addEventListener('click', async () => {
    try { await q(sb.rpc('demander_aide', { app: 'woulib', sujet_a: 'donnees', objet: null, texte: `Je demande la suppression de mon compte (activité professionnelle : ${s.pro}).` })); toast('Demande envoyée : la réponse arrive dans l’assistance.'); aller('#/assistance'); }
    catch (err) { toast(erreur(err), true); }
  });
  // deux temps : le premier appui demande la confirmation, le second supprime
  $('#fSup')?.addEventListener('submit', async e => {
    e.preventDefault(); const b = $('#btnSup');
    if (!b.dataset.confirme) { b.dataset.confirme = '1'; b.textContent = 'Confirmer : supprimer définitivement'; return; }
    b.disabled = true;
    try {
      const r = await q(sb.rpc('demander_suppression', { motif_s: new FormData(e.target).get('motif') || null }));
      try { await sb.auth.signOut(); } catch (x) { /* la session est déjà fermée côté serveur */ }
      await chargerMoi(); nav();
      vue(`<div class="wrap"><div class="vide-etat" style="margin-top:30px"><h3>Votre compte est supprimé</h3>
        <p class="muted">${r === 'faite' ? 'Vos informations personnelles sont effacées.' : 'Vos informations sont effacées ; l’équipe termine l’effacement de votre email sous un mois au plus.'} Merci d’avoir utilisé Woulib.</p>
        <a class="btn btn-p" href="#/">Accueil</a></div></div>`);
    } catch (err) { toast(sansCode(err), true); b.disabled = false; delete b.dataset.confirme; b.textContent = 'Supprimer mon compte'; }
  });
}

// ---------------------------------------------------------------- assistance
APP.pages.assistance = async () => {
  if (!exigeCompte()) return;
  attente();
  const p = param(), ok = await droitsInstalles();
  const autres = `<p class="muted petit">Vous pouvez aussi écrire sur <a href="${wa(WA, 'Bonjour, j’ai une question sur Woulib.')}" target="_blank" rel="noopener">WhatsApp</a> ou à <b>${EMAIL_IT}</b>. En cas de danger, appelez le 17 ou le 112.</p>`;
  if (!ok) return vue(`<div class="wrap compte-s">${entete('Assistance')}<div class="panneau"><p>Écrivez-nous, nous répondons au plus vite :</p>
    <div class="actions"><a class="btn btn-wa" href="${wa(WA, 'Bonjour, j’ai une question sur Woulib.')}" target="_blank" rel="noopener">WhatsApp</a></div><p>Email : <b>${EMAIL_IT}</b></p></div></div>`);
  const [mes, sig] = await Promise.all([
    q(sb.from('assistance').select('*').eq('auteur', moi.id).order('created_at', { ascending: false }).limit(20)),
    q(sb.from('signalements').select('*').eq('auteur', moi.id).order('created_at', { ascending: false }).limit(20))]);
  const sujet = SUJETS[p.sujet] ? p.sujet : '', objet = UUID.test(p.id || '') ? p.id : '';
  vue(`<div class="wrap compte-s">${entete('Assistance')}
    <form class="f panneau" id="fAide"><label>C’est à propos de<select name="sujet" required><option value="">Choisir</option>${Object.entries(SUJETS).map(([k, t]) => `<option value="${k}" ${k === sujet ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      ${objet ? `<p class="aide" style="margin:0">Référence jointe : ${esc(objet.slice(0, 6).toUpperCase())}</p>` : ''}
      <label>Votre message<textarea name="message" required minlength="5" maxlength="2000" style="min-height:110px" placeholder="Que se passe-t-il ?"></textarea></label>
      <button class="btn btn-p">Envoyer</button>${autres}</form>
    <h2>Mes demandes</h2>
    ${mes.length ? `<div class="acts">${mes.map(a => `<div class="panneau aide-l"><div class="aide-t"><b>${esc(SUJETS[a.sujet] || a.sujet)}</b>${tag(ST_AIDE[a.statut] || ['', a.statut])}</div>
      <p class="muted petit" style="margin:2px 0 6px">${esc(jourHeure(a.created_at))}</p><p style="white-space:pre-line;margin:0">${esc(a.message)}</p>
      ${a.reponse ? `<div class="reponse"><b>Réponse de l’équipe</b><p style="white-space:pre-line;margin:4px 0 0">${esc(a.reponse)}</p></div>` : ''}</div>`).join('')}</div>`
      : '<p class="muted">Aucune demande pour l’instant.</p>'}
    ${sig.length ? `<h2>Mes signalements</h2><div class="acts">${sig.map(x => `<div class="panneau aide-l"><div class="aide-t"><b>${esc((MOTIFS.find(([k]) => k === x.motif) || [, x.motif])[1])}</b>${tag(ST_SIGNAL[x.statut] || ['', x.statut])}</div>
      <p class="muted petit" style="margin:2px 0 0">${esc(jourHeure(x.created_at))}</p>${x.decision ? `<div class="reponse"><b>Décision</b><p style="margin:4px 0 0">${esc(x.decision)}</p></div>` : ''}</div>`).join('')}</div>` : ''}</div>`);
  $('#fAide').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('button'); b.disabled = true;
    try { await q(sb.rpc('demander_aide', { app: 'woulib', sujet_a: d.sujet, objet: objet || null, texte: d.message.trim() })); toast('Demande envoyée : la réponse arrive ici et dans vos notifications.'); rendre(); }
    catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
};

// ---------------------------------------------------------------- signaler (bouton [data-signaler] : type, id, univers, nom)
APP.signaler = async d => {
  const ok = await droitsInstalles();
  const g = document.createElement('dialog'); g.className = 'dlg-options'; g.setAttribute('aria-labelledby', 'tSig');
  g.innerHTML = `<form class="f" id="fSig"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h2 id="tSig" style="margin:0">Signaler ${esc(d.nom || 'ce contenu')}</h2>
      <button type="button" class="btn btn-s" data-fermer aria-label="Fermer">✕</button></div>
    ${ok ? `<p class="muted petit" style="margin:0">Un modérateur examine chaque signalement et vous envoie sa décision. En cas de danger immédiat, appelez le 17 ou le 112.</p>
      <fieldset class="opt-g"><legend><b>Que se passe-t-il ?</b></legend>${MOTIFS.map(([k, t]) => `<label class="opt-c"><input type="radio" name="motif" value="${k}" required><span>${t}</span></label>`).join('')}</fieldset>
      <label>Précisions <span class="aide">(facultatif)</span><textarea name="details" maxlength="1000" style="min-height:70px"></textarea></label>
      <button class="btn btn-p">Envoyer le signalement</button>`
    : `<p>Écrivez-nous en précisant ce qui ne va pas : <a href="${wa(WA, `Bonjour, je souhaite signaler ${d.nom || 'un contenu'} sur Woulib.`)}" target="_blank" rel="noopener">WhatsApp</a> ou <b>${EMAIL_IT}</b>. En cas de danger immédiat, appelez le 17 ou le 112.</p>`}</form>`;
  document.body.append(g); g.showModal();
  g.addEventListener('close', () => g.remove());
  g.addEventListener('click', e => { if (e.target.closest('[data-fermer]') || e.target === g) g.close(); });
  g.querySelector('#fSig').addEventListener('submit', async e => {
    e.preventDefault(); if (!ok) return; const f = Object.fromEntries(new FormData(e.target)), b = e.target.querySelector('.btn-p'); b.disabled = true;
    try {
      await q(sb.rpc('signaler', { app: 'woulib', univ: d.univers || 'autre', type_objet: d.signaler || 'autre', objet: UUID.test(d.id || '') ? d.id : null, motif_s: f.motif, texte: (f.details || '').trim() }));
      g.close(); toast('Merci : le signalement est envoyé. La décision arrivera dans vos notifications.');
    } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
};
