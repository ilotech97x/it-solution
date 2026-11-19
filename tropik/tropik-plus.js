/* Tropik v2 : enchères, locations, roue du jour, fidélité, atelier sur mesure, messages, alertes, aide. Les chiffres viennent de la base (tropik2.sql). */
'use strict';
(() => {
  const TK = APP.tk, { rpc, q, ouverte, pluriel, fond, occupe, rail, grille, carte, dec, MODES, jourLong } = TK;
  const connecte = () => { if (moi) return true; aller('#/connexion?retour=' + encodeURIComponent(location.hash)); return false; };
  const vide = (ico, t, p, lien, cta) => `<div class="vide-etat"><span class="ico" aria-hidden="true">${ico}</span><h3>${t}</h3><p>${p}</p>${lien ? `<a class="btn btn-p" href="${lien}">${cta}</a>` : ''}</div>`;
  const reduit = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- enchères
  const pageMesEncheres = ouverte(async () => {
    if (!connecte()) return;
    const l = await rpc('tk_mes_encheres');
    const lib = { meilleur: '🏆 Meilleure offre', depasse: '⚠️ Dépassé', gagnant: '🎉 Gagnée' };
    vue(`<div class="wrap tk"><h1>Mes enchères</h1>${l.length ? `<div class="liste-c">${l.map(x => `<a class="cmd-c" href="#/p/${x.produit_id}"><div class="ligne"><b>${esc(x.titre)}</b><span class="tag ${x.enchere.moi === 'depasse' ? 'att' : 'ok'}">${lib[x.enchere.moi] || ''}</span></div><span class="petit muted">${x.enchere.phase === 'terminee' ? 'Terminée' : 'Fin ' + esc(jourHeure(x.enchere.fin))} · ${pluriel(x.enchere.nb_offres, 'offre', 'offres')}</span><b>${eur(x.enchere.courant)}</b></a>`).join('')}</div>` : vide('🔨', 'Aucune offre pour l’instant', 'Vos offres et leur issue apparaîtront ici.', '#/encheres', 'Voir les enchères')}</div>`);
  });

  // ---------------------------------------------------------------- locations (côté locataire)
  const ST_LOC = { demandee: ['att', 'Demandée'], acceptee: ['info', 'Acceptée'], en_cours: ['info', 'En cours'], retournee: ['ok', 'Rendue'], refusee: ['ko', 'Refusée'], annulee: ['gris', 'Annulée'] };
  const pageLocations = ouverte(async () => {
    if (!connecte()) return;
    const l = await rpc('tk_locations_liste');
    vue(`<div class="wrap tk"><h1>Mes locations</h1>${param().ok ? '<div class="bandeau-b" role="status">Demande envoyée ! Le vendeur accepte ou refuse ; vous êtes prévenu.</div>' : ''}
      ${l.length ? `<div class="liste-c">${l.map(x => `<article class="carte"><div class="ligne" style="display:flex;justify-content:space-between;gap:10px"><b><a href="#/p/${x.produit_id}">${esc(x.titre)}</a></b>${tag(ST_LOC[x.statut] || ['gris', x.statut])}</div>
        <span class="petit">Du ${esc(jourLong(x.debut))} au ${esc(jourLong(x.fin))} · ${pluriel(x.jours, 'jour', 'jours')}</span><div class="total-l"><span>Location</span><b>${eur(x.total)}</b></div><div class="total-l"><span>Caution (hors application)</span><span>${eur(x.caution)}</span></div>
        ${x.retard ? '<div class="avert avert-ko"><b>Retour en retard</b> : rendez l’article au vendeur.</div>' : ''}${x.motif ? `<span class="petit">Motif : ${esc(x.motif)}</span>` : ''}
        ${['acceptee', 'en_cours'].includes(x.statut) ? `<span class="petit muted">Remise et retour : ${esc(x.vendeur.nom)}${x.vendeur.telephone ? ', ' + esc(x.vendeur.telephone) : ''}, ${esc(x.vendeur.commune)}.</span>` : ''}
        ${['demandee', 'acceptee'].includes(x.statut) ? `<details class="plus-options"><summary>Annuler</summary><form class="f" data-pform="loc-statut" data-id="${x.id}" data-st="annulee"><label>Motif<input name="motif" required minlength="5" maxlength="300"></label><button class="btn btn-sec">Annuler la location</button></form></details>` : ''}</article>`).join('')}</div>`
        : vide('📅', 'Aucune location', 'Louez une robe, des baskets ou un sac pour quelques jours : choisissez vos dates sur la fiche.', '#/recherche?mode=location', 'Voir les articles à louer')}</div>`);
  });

  // ---------------------------------------------------------------- roue du jour
  let tourne = false;
  const pageRoue = ouverte(async () => {
    const r = await rpc('tk_roue_infos'), n = r.lots.length, seg = 360 / n, cols = ['#F97316', '#16161F', '#FBBF24', '#0E7C86', '#C2410C'];
    const fond_ = `conic-gradient(${r.lots.map((l, k) => `${cols[k % 5]} ${k * seg}deg ${(k + 1) * seg}deg`).join(',')})`;
    vue(`<div class="wrap tk"><h1>La roue du jour</h1><div class="roue-z"><p class="muted" style="max-width:520px">Un tour <b>gratuit</b> par jour et par compte, <b>sans obligation d’achat</b>. Vos points s’échangent contre des réductions dans <a href="#/fidelite">Fidélité</a>.</p>
      <div class="roue" id="roue" style="background:${fond_}" role="img" aria-label="Roue de ${n} lots"><span class="moy" id="roueM">🎡</span>${r.lots.map((l, k) => `<span style="position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(${k * seg + seg / 2}deg)"><b style="position:absolute;left:-30px;top:-128px;width:60px;text-align:center;color:#fff;font:900 15px var(--police);text-shadow:0 1px 3px #000">${l.points}</b></span>`).join('')}</div>
      <p id="roueR" aria-live="polite" style="font-weight:800;margin:0">${r.joue ? 'Vous avez déjà tourné aujourd’hui. Revenez demain !' : moi ? 'À vous de jouer !' : 'Connectez-vous pour tourner (gratuit).'}</p>
      <button class="btn btn-p" style="min-height:54px;padding:0 36px;border-radius:999px;font-weight:900" data-p="tirer" ${r.joue ? 'disabled' : ''}>${moi ? 'Tourner la roue' : 'Me connecter pour jouer'}</button>
      <div class="lots-t" aria-label="Lots et chances">${r.lots.map(l => `<div><span>${esc(l.libelle)}</span><b>${dec(l.chance)} %</b></div>`).join('')}</div>
      ${r.solde != null ? `<p style="margin:0">Votre solde : <b>${r.solde} points</b></p>` : ''}<p class="petit muted" style="max-width:520px">${esc(r.reglement)} Prochain tour possible à partir de ${esc(jourHeure(r.prochain))}.</p></div></div>`);
    tourne = false;
  });
  const tirer = async b => {
    if (!moi) return aller('#/connexion?retour=' + encodeURIComponent('#/roue'));
    if (tourne) return; tourne = true; b.disabled = true;
    try {
      const r = await rpc('tk_roue_tirer'), infos = await rpc('tk_roue_infos'), k = infos.lots.findIndex(l => l.id === r.lot), seg = 360 / infos.lots.length, cible = 360 * 5 - (k * seg + seg / 2);
      const fin = () => { $('#roueR').textContent = `Bravo : ${r.points} points ! Solde : ${r.solde} points.`; $('#roueM').textContent = '+' + r.points; toast(`+${r.points} points`); };
      if (window.gsap && !reduit()) window.gsap.to('#roue', { rotation: cible, duration: 4.2, ease: 'power4.out', onComplete: fin }); else { $('#roue').style.transform = `rotate(${cible}deg)`; fin(); }
    } catch (e) { toast(erreur(e), true); tourne = false; b.disabled = false; }
  };

  // ---------------------------------------------------------------- fidélité
  const pageFidelite = ouverte(async () => {
    if (!connecte()) return;
    const f = await rpc('tk_fidelite'), nv = f.niveau, sv = f.suivant, pc = sv ? Math.min(100, Math.round((f.cumul - nv.seuil) / (sv.seuil - nv.seuil) * 100)) : 100;
    vue(`<div class="wrap tk"><h1>Fidélité</h1>
      <section class="niv-c"><span class="petit">Niveau</span><h2>${esc(nv.nom)}</h2><div class="gros-c">${f.solde} <small style="font-size:16px">points</small></div><div class="barre-n" role="progressbar" aria-valuenow="${pc}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pc}%"></i></div>
        <span class="petit">${sv ? `Encore ${sv.manque} points pour le niveau ${esc(sv.nom)}.` : 'Niveau maximum atteint.'}</span><span class="petit">${esc(nv.avantage)}</span></section>
      <section class="carte"><h2>Gagner des points</h2><ul class="garanties"><li>🛍️ <span>Acheter : 1 point par euro (10 au minimum) à la fin de la commande.</span></li><li>🏷️ <span>Vendre : 10 points + 1 par 10 € vendus.</span></li><li>⭐ <span>Laisser un avis : 5 points.</span></li><li>📅 <span>Louer et rendre un article.</span></li><li>🎡 <span><a href="#/roue">Roue du jour</a> : gratuite, jusqu’à 1000 points${f.roue.joue ? ' (déjà jouée aujourd’hui)' : ''}.</span></li><li>🎁 <span>Parrainer : 100 points chacun à la première commande de votre filleul.</span></li></ul></section>
      <section class="carte"><h2>Récompenses</h2><div class="rec-g">${f.recompenses.map(r => `<div><span><b>${esc(r.nom)}</b><br><small class="muted">${r.cout} points${r.minimum ? ' · dès ' + eur(r.minimum) : ''}</small></span><button class="btn btn-sec btn-s" data-p="echanger" data-r="${r.code}" ${f.solde < r.cout ? 'disabled' : ''}>Échanger</button></div>`).join('')}</div>
        ${f.codes.length ? `<h3>Mes codes disponibles</h3>${f.codes.map(c => `<p style="margin:0"><span class="code-t">${esc(c.code)}</span> <span class="petit muted">${c.type === 'montant' ? eur(c.valeur) : c.type === 'pct' ? c.valeur + ' %' : 'livraison offerte'}${c.minimum ? ' dès ' + eur(c.minimum) : ''}, jusqu’au ${esc(jourLong(c.expire))}</span></p>`).join('')}<p class="petit muted">À saisir à la validation de votre commande. Financés par Tropik : le vendeur est payé du prix plein.</p>` : ''}</section>
      <section class="carte"><h2>Les niveaux</h2>${f.niveaux.map(n => `<div class="total-l"><span><b>${esc(n.nom)}</b> · dès ${n.seuil} points</span><span class="petit muted" style="text-align:right">${n.remise_pct ? '−' + n.remise_pct + ' %' : ''}${n.livraison_offerte ? ' + livraison' : ''}</span></div>`).join('')}</section>
      <section class="carte"><h2>Succès</h2><div class="succes">${f.succes.map(s => `<div class="${s.ok ? 'ok' : ''}"><span>${s.ok ? '🏅' : '🔒'} ${esc(s.nom)}</span><span class="petit muted">${Math.floor(s.progres)} / ${s.cible}</span></div>`).join('')}</div></section>
      <section class="carte"><h2>Parrainage</h2><p style="margin:0">Votre code : <span class="code-t">${esc(f.code_parrain)}</span> · ${pluriel(f.filleuls, 'filleul', 'filleuls')}</p>
        ${f.parraine ? '<p class="petit muted" style="margin:0">Vous avez déjà utilisé un code de parrainage.</p>' : `<form class="f" data-pform="parrain"><label>Un code de parrainage ?<span class="ligne-ds"><input name="code" maxlength="12" style="flex:1;text-transform:uppercase" placeholder="CODE"><button class="btn btn-sec">Utiliser</button></span></label></form>`}</section>
      <section class="carte"><h2>Historique</h2>${f.historique.length ? f.historique.map(h => `<div class="total-l"><span>${esc(h.libelle)}<br><small class="muted">${esc(jourHeure(h.date))}</small></span><b style="color:${h.delta > 0 ? 'var(--canne)' : 'var(--corail)'}">${h.delta > 0 ? '+' : ''}${h.delta}</b></div>`).join('') : '<p class="muted" style="margin:0">Aucun mouvement pour l’instant.</p>'}</section></div>`);
  });

  // ---------------------------------------------------------------- atelier sur mesure
  const pageAtelier = ouverte(async () => {
    const a = await rpc('tk_atelier'), dm = moi ? await rpc('tk_demandes_liste') : [], vId = param().v || '';
    vue(`<div class="wrap tk"><h1>Atelier sur mesure</h1><p class="muted">Couleurs, broderie, gravure : les vendeurs décrivent leurs options, le prix se calcule tout seul. Vous avez une idée précise ? Écrivez à un atelier.</p>
      ${a.produits.length ? `<section class="sect-s"><h2>Articles personnalisables</h2>${grille(a.produits)}</section>` : vide('🧵', 'Pas encore d’article personnalisable', 'Les vendeurs ajoutent leurs options de personnalisation (couleur, broderie, gravure) depuis leur espace.', '#/devenir-vendeur', 'Je suis artisan : vendre sur Tropik')}
      <section class="carte"><h2>Demande sur mesure</h2>${a.ateliers.length || vId ? `<form class="f" data-pform="demande"><label>Atelier<select name="v" required>${a.ateliers.map(x => `<option value="${x.id}" ${x.id === vId ? 'selected' : ''}>${esc(x.nom)} · ${esc(x.commune)}</option>`).join('')}${vId && !a.ateliers.some(x => x.id === vId) ? `<option value="${esc(vId)}" selected>La boutique choisie</option>` : ''}</select></label>
        <label>Votre projet<textarea name="texte" required minlength="10" maxlength="1000" placeholder="Décrivez ce que vous voulez : article, couleurs, texte, quantité, date…"></textarea></label><label>Budget (€) <span class="aide">(facultatif)</span><input name="budget" type="number" min="1" max="20000" step="1"></label><button class="btn btn-p">Envoyer la demande</button></form>` : '<p class="muted" style="margin:0">Aucun atelier n’est encore inscrit.</p>'}</section>
      ${dm.filter(x => x.a_moi).length ? `<section class="carte"><h2>Mes demandes</h2>${dm.filter(x => x.a_moi).map(x => `<article><b>${esc(x.vendeur_nom)}</b> ${tag(x.statut === 'repondue' ? ['ok', 'Réponse reçue'] : ['att', 'En attente'])}<p style="margin:4px 0">${esc(x.texte)}</p>${x.reponse ? `<div class="avert"><b>Réponse :</b> ${esc(x.reponse)}${x.prix_propose ? ` · <b>${eur(x.prix_propose)}</b>` : ''}</div>` : ''}</article>`).join('')}</section>` : ''}</div>`);
    TK.apresVue && TK.apresVue('liste');
  });
  const pageCmdPerso = ouverte(async () => {
    if (!connecte()) return;
    let s; try { s = JSON.parse(sessionStorage.getItem('tk-perso') || 'null'); } catch (e) { s = null; }
    if (!s) return aller('#/atelier');
    const [p, pp] = await Promise.all([rpc('tk_fiche', { p: s.produit }), rpc('tk_perso_prix', { p: s.produit, choix: s.choix })]), v = p.vendeur, va = p.variantes.find(x => x.id === s.variante);
    vue(`<div class="wrap tk"><h1>Commande sur mesure</h1><form class="cmd-2" data-pform="perso"><div class="pan-g"><section class="carte"><h2>${esc(p.titre)}</h2><p class="petit muted">${va ? 'Taille ' + esc(va.taille) + ' · ' + esc(va.couleur) : ''}</p>
      <div class="total-l"><span>Prix de base</span><span>${eur(pp.base)}</span></div>${pp.options.map(o => `<div class="total-l"><span>${esc(o.groupe)} : ${esc(o.libelle)}${o.texte ? ' « ' + esc(o.texte) + ' »' : ''}</span><span>${o.supplement ? '+' + eur(o.supplement) : 'inclus'}</span></div>`).join('')}<div class="total-l gros"><span>Total</span><b>${eur(pp.total)}</b></div>
      ${pp.delai_jours ? `<p class="petit muted">Délai annoncé par le vendeur : ${pp.delai_jours} jours.</p>` : ''}</section>
      <section class="carte"><h2>Remise</h2><fieldset class="choix-2" style="border:0;padding:0;margin:0"><label><input type="radio" name="mode" value="retrait" ${v.retrait_ok ? 'checked' : 'disabled'}>Retrait<small>${v.retrait_ok ? esc(v.commune) : 'Non proposé'}</small></label><label><input type="radio" name="mode" value="livraison" ${!v.retrait_ok ? 'checked' : ''} ${v.livraison_ok ? '' : 'disabled'}>Livraison<small>${v.livraison_ok ? (v.frais ? eur(v.frais) : 'Gratuite') : 'Non proposée'}</small></label></fieldset></section></div>
      <div class="pan-g"><section class="carte"><h2>Vos coordonnées</h2><div class="f"><label>Nom<input name="nom" required maxlength="80" value="${esc(profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '')}"></label><label>Téléphone<input name="tel" type="tel" required pattern="[0-9 +.]{6,20}" value="${esc((contact && contact.telephone) || '')}"></label>
        <label>Adresse de livraison <span class="aide">(si livraison)</span><textarea name="adresse" maxlength="300"></textarea></label><label>Un mot pour le vendeur<input name="note" maxlength="200"></label></div></section>
        <section class="carte"><div class="avert">💶 <b>Paiement à la remise ou au retrait</b>, directement au vendeur.</div><button class="btn btn-p btn-plein">Envoyer ma commande</button></section></div></form></div>`);
  });

  // ---------------------------------------------------------------- messages
  const pageMessages = ouverte(async (i, autre) => {
    if (!connecte()) return;
    if (!autre) {
      const l = await rpc('tk_conversations');
      return vue(`<div class="wrap tk"><h1>Messages</h1>${l.length ? `<div class="liste-c">${l.map(c => `<a class="cmd-c" href="#/messages/${c.autre}${c.produit ? '?p=' + c.produit : ''}"><div class="ligne"><b>${esc(c.nom)}</b>${c.non_lus ? `<span class="badge">${c.non_lus}</span>` : ''}</div><span class="petit muted">${c.produit_titre ? esc(c.produit_titre) + ' · ' : ''}${esc(c.dernier)}</span><span class="petit">${esc(jourHeure(c.date))}</span></a>`).join('')}</div>` : vide('💬', 'Aucun message', 'Écrivez à un vendeur depuis une fiche produit ou une annonce.', '#/recherche', 'Voir le catalogue')}</div>`);
    }
    const c = await rpc('tk_conversation', { autre }), prod = param().p || '';
    vue(`<div class="wrap tk"><h1>${esc(c.nom)}</h1><div class="msg-l" id="msgL">${c.messages.length ? c.messages.map(m => `<div class="msg ${m.moi ? 'moi' : ''}">${m.produit_titre ? `<small>À propos de « ${esc(m.produit_titre)} »</small>` : ''}${esc(m.texte)}<small>${esc(jourHeure(m.date))}</small></div>`).join('') : '<p class="muted">Écrivez votre premier message.</p>'}</div>
      <form class="f carte" data-pform="message" data-a="${esc(autre)}" data-p="${esc(prod)}"><label>Votre message<textarea name="texte" required maxlength="1000" placeholder="Bonjour, cet article est-il disponible ?"></textarea></label><button class="btn btn-p">Envoyer</button><p class="petit muted" style="margin:0">Ne partagez pas de mot de passe ni de code bancaire. Le paiement se fait à la remise, jamais à l’avance.</p></form></div>`);
    TK.apresVue && TK.apresVue('messages');
  });

  // ---------------------------------------------------------------- alertes : recherches enregistrées et prix suivis
  const pageAlertes = ouverte(async () => {
    if (!connecte()) return;
    const [rs, sv] = await Promise.all([q(sb.from('tk_recherches').select('*').order('created_at', { ascending: false })), rpc('tk_suivis_liste')]);
    vue(`<div class="wrap tk"><h1>Mes alertes</h1><section class="carte"><h2>Recherches enregistrées</h2>${rs.length ? rs.map(r => `<div class="ligne-ds" style="padding:8px 0;border-top:1px solid var(--ligne)"><a href="${TK.hashDe(urlDe(r.filtre))}"><b>${esc(r.nom)}</b></a><span class="actions-r"><button class="btn btn-sec btn-s" data-p="alerte" data-id="${r.id}" data-v="${!r.alerte}">${r.alerte ? '🔔 Alerte active' : '🔕 Alerte coupée'}</button><button class="btn btn-sec btn-s" data-p="suppr-rech" data-id="${r.id}">Supprimer</button></span></div>`).join('') : '<p class="muted" style="margin:0">Aucune recherche. Dans le catalogue, filtrez puis touchez « Enregistrer cette recherche avec alerte ».</p>'}</section>
      <section class="sect-s"><h2>Prix suivis</h2>${sv.length ? grille(sv) : '<p class="muted">Aucun prix suivi. Sur une fiche, touchez « Suivre le prix » : vous êtes prévenu à chaque baisse et vente flash.</p>'}</section></div>`);
  });
  const urlDe = f => { const p = {}; if (f.q) p.q = f.q; if (f.rayon) p.rayon = f.rayon; if (f.vendeur) p.vendeur = f.vendeur; if (f.etat) p.etat = f.etat; if (f.public) p.public = f.public; if (f.marques) p.marque = f.marques.join('|'); if (f.tailles) p.taille = f.tailles.join('|'); if (f.pointures) p.pointure = f.pointures.join('|'); if (f.couleurs) p.couleur = f.couleurs.join('|'); if (f.modes) p.mode = f.modes.join('|'); if (f.prix_min) p.pmin = f.prix_min; if (f.prix_max) p.pmax = f.prix_max; if (f.promo) p.promo = 1; if (f.dispo) p.dispo = 1; if (f.tri) p.tri = f.tri; return p; };

  // ---------------------------------------------------------------- compte (accueil de l'espace personnel)
  const pageCompte = ouverte(async () => {
    if (!moi) return vue(`<div class="wrap tk"><div class="vide-etat"><span class="ico" aria-hidden="true">👤</span><h3>Votre compte Tropik</h3><p>Connectez-vous pour suivre vos commandes, enchérir, louer, garder vos favoris, gagner des points et vendre.</p><a class="btn btn-p" href="#/connexion?retour=${encodeURIComponent('#/compte')}">Me connecter</a> <a class="btn btn-sec" href="#/inscription">Créer un compte</a></div></div>`);
    const [vend, mod, fid] = await Promise.all([q(sb.from('tk_vendeurs').select('id, statut, nom').eq('id', moi.id).maybeSingle()).catch(() => null), rpc('tk_moderation_file').then(() => true, () => false), rpc('tk_fidelite').catch(() => null)]);
    vue(`<div class="wrap tk"><h1>Bonjour ${esc((profil && profil.prenom) || '')}</h1>
      ${fid ? `<a class="niv-c" href="#/fidelite" style="text-decoration:none"><span class="petit" style="color:#fff">Niveau ${esc(fid.niveau.nom)}</span><div class="gros-c">${fid.solde} points</div><span class="petit" style="color:#fff">${fid.roue.joue ? 'Roue du jour déjà tournée' : '🎡 Votre tour de roue gratuit vous attend'}</span></a>` : ''}
      <div class="menu-v"><a href="#/commandes">📦 Mes commandes<small>Suivi et avis</small></a><a href="#/locations">📅 Mes locations<small>Dates et retours</small></a><a href="#/mes-encheres">🔨 Mes enchères<small>Offres et gains</small></a><a href="#/favoris">♥ Mes favoris<small>Produits gardés</small></a>
        <a href="#/alertes">🔔 Mes alertes<small>Recherches et prix suivis</small></a><a href="#/messages">💬 Messages<small>Acheteurs et vendeurs</small></a><a href="#/fidelite">⭐ Fidélité<small>Points, niveaux, récompenses</small></a><a href="#/roue">🎡 Roue du jour<small>Gratuite, sans achat</small></a>
        <a href="#/${vend && vend.statut === 'valide' ? 'vendeur' : 'devenir-vendeur'}">🏪 ${vend ? 'Mon espace vendeur' : 'Vendre sur Tropik'}<small>${vend ? esc(vend.nom) : 'Annonce ou boutique'}</small></a><a href="#/notifs">🔔 Notifications<small>${nbNotifs ? pluriel(nbNotifs, 'nouvelle', 'nouvelles') : 'Rien de nouveau'}</small></a>
        ${mod ? '<a href="#/moderation">🛡️ Modération<small>Signalements</small></a><a href="#/outils-moderation">🧰 Outils<small>Codes, boosts, collections</small></a>' : ''}<a href="#/aide">ℹ️ Vos droits<small>Classement, commission, retours</small></a></div>
      <p><a class="btn btn-sec" href="#/deconnexion">Se déconnecter</a></p></div>`);
  });

  // ---------------------------------------------------------------- outils de la modération : codes promotionnels, boosts, rayons
  const pageOutils = ouverte(async () => {
    if (!connecte()) return;
    let cod, bo; try { [cod, bo] = await Promise.all([rpc('tk_codes_liste'), rpc('tk_boosts_file')]); } catch (e) { return vue('<div class="wrap tk"><div class="vide-etat"><h3>Réservé à la modération</h3><a class="btn btn-p" href="#/compte">Retour</a></div></div>'); }
    vue(`<div class="wrap tk"><h1>Outils de la modération</h1>
      <section class="carte"><h2>Demandes de mise en avant</h2><p class="petit muted">Activer une demande ajoute l’étiquette « Sponsorisé » (paiement en ligne à venir) ; le classement des recherches ne change jamais.</p>${bo.length ? bo.map(b => `<div class="ligne-ds" style="padding:8px 0;border-top:1px solid var(--ligne)"><span><b>${esc(b.titre)}</b><br><small class="muted">${esc(b.vendeur)}</small></span><span class="actions-r"><button class="btn btn-p btn-s" data-p="boost" data-id="${b.id}" data-ok="1">Activer 7 jours</button><button class="btn btn-sec btn-s" data-p="boost" data-id="${b.id}" data-ok="0">Refuser</button></span></div>`).join('') : '<p class="muted" style="margin:0">Aucune demande.</p>'}</section>
      <section class="carte"><h2>Codes promotionnels</h2><p class="petit muted">Financés par Tropik : le vendeur reste payé du prix plein.</p>${cod.length ? cod.map(c => `<div class="ligne-ds" style="padding:6px 0;border-top:1px solid var(--ligne)"><span><span class="code-t" style="font-size:15px">${esc(c.code)}</span> <small class="muted">${c.type === 'pct' ? c.valeur + ' %' : c.type === 'montant' ? eur(c.valeur) : 'livraison'}${c.minimum ? ' dès ' + eur(c.minimum) : ''} · ${c.usages}${c.max_usages ? '/' + c.max_usages : ''} utilisations</small></span><button class="btn btn-sec btn-s" data-p="code-bascule" data-id="${c.id}">${c.actif ? 'Désactiver' : 'Réactiver'}</button></div>`).join('') : ''}
        <form class="f" data-pform="code"><div class="ligne3"><label>Code<input name="code" required maxlength="24" style="text-transform:uppercase"></label><label>Type<select name="type"><option value="pct">Pourcentage</option><option value="montant">Montant (€)</option><option value="livraison">Livraison offerte</option></select></label><label>Valeur<input name="valeur" type="number" step="0.5" min="0" value="10"></label></div>
        <div class="ligne3"><label>Commande minimum (€)<input name="minimum" type="number" min="0" value="0"></label><label>Plafond (€)<input name="plafond" type="number" min="0"></label><label>Utilisations max<input name="max_usages" type="number" min="1"></label></div><button class="btn btn-p">Créer le code</button></form></section></div>`);
  });

  // ---------------------------------------------------------------- aide : FAQ, guide des tailles
  const faq = () => vue(`<div class="wrap tk"><h1>Questions fréquentes</h1>
    ${[['Comment fonctionnent les enchères ?', 'Le vendeur fixe le prix de départ, le pas minimum et la durée. Vous devez battre la meilleure offre d’au moins le pas minimum. Une offre dans les 2 dernières minutes repousse la fin de 2 minutes. À la fin, le gagnant reçoit une commande à payer à la remise ou au retrait. Tout est calculé par Tropik.'],
      ['Comment louer un article ?', 'Sur la fiche d’un article à louer, choisissez vos dates dans le calendrier. Le vendeur accepte ou refuse. Le prix par jour est multiplié par le nombre de jours. La caution est affichée et se règle directement avec le vendeur, pas dans l’application.'],
      ['La roue est-elle vraiment gratuite ?', 'Oui : un tour par jour et par compte, sans obligation d’achat. Les chances de chaque lot sont affichées sur la page de la roue et le tirage est fait par la base de données.'],
      ['À quoi servent les points ?', 'Ils font monter votre niveau (Bronze, Argent, Or, Platine) et s’échangent contre des codes de réduction financés par Tropik. Le vendeur est toujours payé du prix plein.'],
      ['Comment payer ?', 'À la remise ou au retrait, directement au vendeur. Aucun paiement en ligne pour l’instant.'],
      ['Puis-je me rétracter ?', 'Chez un vendeur professionnel, oui : 14 jours à compter de la remise. Entre particuliers, non.'],
      ['Comment sont calculés les prix barrés ?', 'Le prix barré est le plus bas des 30 derniers jours avant la réduction. Le vendeur ne le saisit pas.'],
      ['Comment vendre ?', 'Créez votre boutique (particulier ou professionnel). La modération la vérifie, puis vous publiez : vente, location, enchère, 360°, personnalisation.']].map(([a, b]) => `<details class="plus-options carte"><summary><b>${a}</b></summary><p style="margin:8px 0 0">${b}</p></details>`).join('')}
    <p><a href="#/aide">Vos droits et le classement</a> · <a href="#/tailles">Guide des tailles</a></p></div>`);
  const tailles = () => vue(`<div class="wrap tk"><h1>Guide des tailles</h1><p class="muted">Repères indicatifs : les coupes varient selon les marques. Demandez conseil au vendeur.</p><section class="carte"><h2>Chaussures</h2>${TK.guideTailles('chaussures')}</section><section class="carte"><h2>Vêtements</h2>${TK.guideTailles('vetements')}</section></div>`);

  // ---------------------------------------------------------------- actions et formulaires de ce fichier
  const P = {
    tirer: b => tirer(b),
    async echanger(b) { await occupe(b, async () => { try { const r = await rpc('tk_recompense_echanger', { r: b.dataset.r }); toast('Code ' + r.code + ' ajouté à vos récompenses.'); rendre(); } catch (e) { toast(erreur(e), true); } }); },
    async alerte(b) { await rpc('tk_recherche_alerte', { r: b.dataset.id, a: b.dataset.v === 'true' }); rendre(); },
    async 'suppr-rech'(b) { await rpc('tk_recherche_supprimer', { r: b.dataset.id }); rendre(); },
    async boost(b) { try { await rpc('tk_boost_decider', { b: b.dataset.id, ok: b.dataset.ok === '1', jours: 7 }); toast('Enregistré.'); rendre(); } catch (e) { toast(erreur(e), true); } },
    async 'code-bascule'(b) { try { await rpc('tk_code_basculer', { c: b.dataset.id }); rendre(); } catch (e) { toast(erreur(e), true); } }
  };
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-p]'); if (b && P[b.dataset.p]) { e.preventDefault(); P[b.dataset.p](b); return; }
    const c = e.target.closest('[data-act="x-code"]');
    if (c) {
      e.preventDefault(); const code = c.closest('form').code.value.trim();
      try { const r = await rpc('tk_remise_apercu', { montant: Number(c.dataset.total), frais: Number(c.dataset.frais), code_c: code || null }); const base = Number($('#totalAP').dataset.base);
        $('#remiseL').textContent = r.code_message ? r.code_message + (r.remise ? ` · remise de ${eur(r.remise)} (${r.libelle})` : '') : r.remise ? `Remise de ${eur(r.remise)} (${r.libelle}), financée par Tropik.` : 'Aucune remise.';
        $('#totalAP').textContent = eur(Math.max(0, base - Number(r.remise))); } catch (x) { toast(erreur(x), true); }
    }
  });
  document.addEventListener('submit', async e => {
    const f = e.target, k = f.dataset.pform; if (!k) return; e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), btn = e.submitter;
    try {
      if (btn) btn.disabled = true;
      if (k === 'loc-statut') { await rpc('tk_location_statut', { loc: f.dataset.id, nouveau: f.dataset.st, motif_l: d.motif }); toast('Enregistré.'); rendre(); }
      else if (k === 'parrain') { await rpc('tk_parrainage_utiliser', { code_p: d.code }); toast('Code de parrainage enregistré.'); rendre(); }
      else if (k === 'demande') { await rpc('tk_demande_envoyer', { v: d.v, texte_d: d.texte, budget_d: d.budget ? Number(d.budget) : null }); toast('Demande envoyée à l’atelier.'); rendre(); }
      else if (k === 'perso') {
        const s = JSON.parse(sessionStorage.getItem('tk-perso')); const r = await rpc('tk_perso_commander', { va: s.variante, choix: s.choix, mode_c: d.mode, adresse_c: d.adresse || null, nom_c: d.nom, tel_c: d.tel, note_c: d.note || null });
        sessionStorage.removeItem('tk-perso'); toast('Commande envoyée : ' + eur(r.total)); aller('#/commandes?ok=1');
      } else if (k === 'message') { await rpc('tk_message_envoyer', { dest: f.dataset.a, p: f.dataset.p || null, texte_m: d.texte }); rendre(); }
      else if (k === 'code') { await rpc('tk_code_creer', { d: { code: d.code, type: d.type, valeur: Number(d.valeur || 0), minimum: d.minimum, plafond: d.plafond, max_usages: d.max_usages } }); toast('Code créé.'); rendre(); }
    } catch (err) { toast(erreur(err), true); } finally { if (btn && btn.isConnected) btn.disabled = false; }
  });
  Object.assign(APP.pages, { encheres: () => location.replace('#/recherche?mode=enchere&tri=fin_proche'),   // ancienne adresse : même liste, avec les filtres
    'mes-encheres': pageMesEncheres, locations: pageLocations, 'locations-a-louer': () => aller('#/recherche?mode=location'), roue: pageRoue, fidelite: pageFidelite, atelier: pageAtelier,
    'commander-sur-mesure': pageCmdPerso, messages: pageMessages, alertes: pageAlertes, compte: pageCompte, 'outils-moderation': pageOutils, faq, tailles });
})();
