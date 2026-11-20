/* Tropik : la boutique en ligne multi-vendeurs (chaussures, vêtements, accessoires de marque), Antilles d'abord.
   Les prix, promotions, totaux, stocks, statuts et commissions sont décidés par la base (tropik.sql : fonctions tk_*, droits par ligne) ; ce fichier les affiche.
   Paiement à la remise ou au retrait pour l'instant ; Stripe Connect viendra plus tard (aucun paiement en ligne ici).
   Base commune : commun/base.js (APP, pages, connexion, transitions). Tout est dans une fonction : aucun nom global en plus de APP. */
'use strict';

const APP = {
  nom: 'Tropik', titre: 'Tropik — la boutique des vendeurs des Antilles', accueilConnecte: '#/', apresInscription: '#/', pourTel: 'que le vendeur puisse vous joindre pour votre commande',
  texteConnexion: 'Un seul compte pour Tropik, Woulib, EventPass et Kaz An Nou.',
  menu: () => [], pages: {}, racines: ['#/'],
  enteteRail: () => '<a class="rail-logo" href="#/" aria-label="Tropik, accueil">Tropik</a>',   // ordinateur : le logo est en haut du rail
  menuBas: () => [['#/', APP.icones().accueil, 'Accueil'], ['#/rayons', APP.icones().rayons, 'Rayons'], ['#/recherche', APP.icones().loupe, 'Recherche'],
    ['#/panier', APP.icones().panier, 'Panier', APP.nbPanier()], [moi ? '#/compte' : '#/connexion', APP.icones().compte, 'Compte', nbNotifs || 0]],
  ongletDe: h => {
    const p = h.split('?')[0];
    if (p === '#/rayons') return '#/rayons';
    if (p === '#/recherche') return '#/recherche';
    if (/^#\/(panier|commander)/.test(p)) return '#/panier';
    if (/^#\/(compte|connexion|inscription|commandes|commande|favoris|vendeur|devenir-vendeur|moderation|notifs)/.test(p)) return moi ? '#/compte' : '#/connexion';
    return '#/';
  },
  parent: h => /^#\/commande\//.test(h) ? '#/commandes' : /^#\/facture\//.test(h) ? h.replace('#/facture/', '#/commande/') : /^#\/import-produits/.test(h) ? '#/vendeur' : /^#\/mes-donnees/.test(h) ? '#/compte' : /^#\/vendeur\/.+/.test(h) ? '#/vendeur' : '#/'
};

(() => {
  const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    accueil: svg('M4 11l8-7 8 7M6 10v10h12V10'), rayons: svg('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'), loupe: svg('M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5'),
    panier: svg('M3 4h2l2.4 11h10.2L20 7H6M9 20h.01M17 20h.01'), compte: svg('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'),
    retour: svg('M15 6l-6 6 6 6'), cloche: svg('M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4'), coeur: svg('M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.600-7 10-7 10z')
  };
  APP.icones = () => IC;

  // ---------------------------------------------------------------- panier (gardé dans le navigateur : lignes {v: variante, q: quantité} ; la base en calcule prix et totaux)
  const CLE_P = 'tropik-panier';
  let panierMem = [];
  const lirePanier = () => { try { const x = JSON.parse(localStorage.getItem(CLE_P) || '[]'); return Array.isArray(x) ? x.filter(l => l && typeof l.v === 'string') : []; } catch (e) { return panierMem; } };
  const ecrirePanier = l => { panierMem = l; try { localStorage.setItem(CLE_P, JSON.stringify(l)); localStorage.setItem(CLE_P + '-t', String(Date.now())); } catch (e) { /* navigation privée : valable jusqu'à la fermeture */ } if (typeof nav === 'function') nav(); };
  APP.nbPanier = () => lirePanier().reduce((n, l) => n + (Number(l.q) || 0), 0);
  const lignesRpc = () => lirePanier().map(l => ({ variante: l.v, qte: l.q }));

  let minuteur = null;
  APP.quitter = h => {
    clearInterval(minuteur); minuteur = null;
    document.body.dataset.page = h.split('?')[0].split('/')[1] || 'accueil';   // pied de page et écosystème seulement sur l'accueil
  };

  // ---------------------------------------------------------------- petits outils
  const pluriel = (n, un, plu) => `${n} ${n > 1 ? plu : un}`;
  const erreurPage = e => vue(`<div class="wrap tk"><div class="vide-etat"><h3>Un instant…</h3><p>${esc(erreur(e))}</p><a class="btn btn-p" href="#/">Retour à l’accueil</a></div></div>`);
  const fond = p => { const u = p ? photo(p) : ''; return u ? ` style="background-image:url('${esc(u)}')"` : ''; };
  const etoiles = n => n == null ? '' : `<span class="etoiles" role="img" aria-label="Note ${n} sur 5">${'★'.repeat(Math.round(n))}${'☆'.repeat(5 - Math.round(n))}</span>`;
  const STATUT = { nouvelle: ['att', 'À accepter'], acceptee: ['info', 'Acceptée'], prete: ['info', 'Prête'], remise: ['ok', 'Remise'], expediee: ['ok', 'Expédiée'], terminee: ['ok', 'Terminée'], refusee: ['ko', 'Refusée'], annulee: ['ko', 'Annulée'] };
  const STATUT_P = { brouillon: ['gris', 'Brouillon'], publie: ['ok', 'En vente'], pause: ['att', 'En pause'], retire: ['ko', 'Retiré par la modération'] };
  const COULEURS = ['Noir', 'Blanc', 'Gris', 'Beige', 'Marron', 'Rouge', 'Rose', 'Orange', 'Jaune', 'Vert', 'Bleu', 'Violet', 'Multicolore'];
  const TERRITOIRES = ['Martinique', 'Guadeloupe', 'Guyane', 'Saint-Martin', 'Saint-Barthélemy', 'La Réunion', 'Mayotte', 'Hexagone et Corse', 'Autre pays'];
  const TRIS = [['pertinence', 'Pertinence'], ['recents', 'Nouveautés'], ['prix_asc', 'Prix croissant'], ['prix_desc', 'Prix décroissant'], ['populaires', 'Les plus achetés'], ['promos', 'Plus fortes promotions']];
  const PUBLICS = { femme: 'Femme', homme: 'Homme', enfant: 'Enfant', mixte: 'Mixte' };
  const MOTIFS_SIG = [['faux', 'Contrefaçon ou faux produit'], ['arnaque', 'Arnaque'], ['illegal', 'Produit interdit ou illégal'], ['danger', 'Produit dangereux'], ['droits', 'Atteinte à mes droits'], ['choquant', 'Contenu choquant'], ['autre', 'Autre']];
  const tagStatut = s => tag(STATUT[s] || ['gris', s]);
  const tagVendeur = t => tag(t === 'professionnel' ? ['info', 'Vendeur professionnel'] : ['gris', 'Vendeur particulier']);
  const jourLong = d => fmt(d, { day: 'numeric', month: 'long', year: 'numeric' });
  const rpc = (nom, args) => q(sb.rpc(nom, args));
  const rayons = () => memo('tk-rayons', () => q(sb.from('tk_rayons').select('*').order('ordre')), 300000);
  const familles = rs => rs.filter(r => !r.parent);
  const nomRayon = (rs, code) => (rs.find(r => r.code === code) || {}).nom || '';

  // la base Tropik est-elle installée ? sinon : « ouverture prochaine » (interrupteur)
  let infosP = null;
  const infos = () => infosP || (infosP = rpc('tk_infos').then(x => x, () => { infosP = null; return null; }));
  const fermee = () => vue(`<div class="wrap tk"><section class="hero-t"><h1>Ouverture prochaine</h1><p>Tropik réunit bientôt des commerçants des Antilles : chaussures, vêtements et accessoires de marque, avec retrait chez le vendeur ou livraison, et paiement à la remise.</p></section>
    <section class="carte"><h2>Vous êtes commerçant ?</h2><p class="muted">Les demandes de boutique ouvriront avec la boutique. Pour en parler : <a href="${esc(wa('', 'Bonjour, je voudrais vendre sur Tropik.'))}" target="_blank" rel="noopener">WhatsApp</a>.</p><p class="petit"><a href="#/aide">Nos engagements envers les acheteurs et les vendeurs</a></p></section></div>`);
  // une page qui a besoin de la base : squelette, puis la page (ou « ouverture prochaine »)
  const ouverte = f => async (...a) => { attente(); const i = await infos(); if (!i) return fermee(); try { return await f(i, ...a); } catch (e) { return erreurPage(e); } };

  // ---------------------------------------------------------------- cartes produit, prix
  const prixHtml = p => p.barre ? `<span class="px promo"><b>${eur(p.prix)}</b><s><span class="cache-visuel">Prix de référence </span>${eur(p.barre)}</s><span class="red">−${p.reduction} %</span></span>` : `<span class="px"><b>${eur(p.prix)}</b></span>`;
  const TK = APP.tk = {};
  const carte = p => TK.carte(p);
  const grille = l => TK.grille(l);
  const squelette = () => TK.squelette();

  const GUIDE_CH = [['36', '5,5', '3,5', '22,8'], ['37', '6', '4', '23,5'], ['38', '7', '5', '24,1'], ['39', '8', '6', '24,8'], ['40', '8,5', '6,5', '25,4'], ['41', '9', '7', '26'], ['42', '9,5', '7,5', '26,7'], ['43', '10,5', '8,5', '27,3'], ['44', '11', '9', '28'], ['45', '12', '10', '28,6']];
  const GUIDE_V = [['XS', '34', '6', '82'], ['S', '36', '8', '86'], ['M', '38', '10', '92'], ['L', '40', '12', '98'], ['XL', '42', '14', '104'], ['XXL', '44', '16', '110']];
  const guideTailles = fam => fam === 'chaussures' ? `<table class="tableau-t"><thead><tr><th>EU</th><th>US (homme)</th><th>UK</th><th>Pied (cm)</th></tr></thead><tbody>${GUIDE_CH.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : fam === 'vetements' || fam === 'maillots' ? `<table class="tableau-t"><thead><tr><th>Taille</th><th>EU</th><th>US</th><th>Poitrine (cm)</th></tr></thead><tbody>${GUIDE_V.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>` : '';
  let sel = { couleur: null, variante: null };
  const stockTexte = n => n <= 0 ? 'Épuisé' : n <= 3 ? `Plus que ${n} en stock` : 'En stock';

  // ---------------------------------------------------------------- boutique d'un vendeur
  // ---------------------------------------------------------------- favoris
  const pageFavoris = async () => {
    if (!exigeCompte()) return; attente();
    try {
      const l = await rpc('tk_favoris_liste');
      vue(`<div class="wrap tk"><h1>Mes favoris</h1>${l.length ? grille(l) : '<div class="vide-etat"><span class="ico" aria-hidden="true">♥</span><h3>Pas encore de favori</h3><p>Touchez le cœur d’un produit pour le retrouver ici.</p><a class="btn btn-p" href="#/recherche">Voir le catalogue</a></div>'}</div>`);
    } catch (e) { erreurPage(e); }
  };

  // ---------------------------------------------------------------- panier
  const pagePanier = ouverte(async () => {
    const cle = lirePanier(); let r = { groupes: [], total: 0, nb: 0 };
    if (cle.length) r = await rpc('tk_panier', { lignes: lignesRpc() });
    const connus = new Set(r.groupes.flatMap(g => g.lignes.map(l => l.variante)));
    if (cle.some(l => !connus.has(l.v))) { ecrirePanier(cle.filter(l => connus.has(l.v))); }
    const qte = Object.fromEntries(lirePanier().map(l => [l.v, l.q]));
    const bloque = r.groupes.some(g => g.lignes.some(l => l.probleme));
    vue(`<div class="wrap tk"><h1>Mon panier</h1>${r.groupes.length ? `<div class="cmd-2"><div class="pan-g">${r.groupes.map(g => `<section class="carte"><h2><a href="#/boutique/${g.vendeur}">${esc(g.nom)}</a> ${tagVendeur(g.type)}</h2>
        ${g.lignes.map(l => `<div class="pan-l"><a class="im" href="#/p/${l.produit}" aria-label="${esc(l.titre)}"${fond(l.photo)}></a><div style="display:grid;gap:4px;min-width:0"><a href="#/p/${l.produit}" style="font-weight:700;color:var(--encre);overflow-wrap:anywhere">${esc(l.titre)}</a>
          <span class="petit muted">${l.marque ? esc(l.marque) + ' · ' : ''}Taille ${esc(l.taille)} · ${esc(l.couleur)}</span>${prixHtml({ prix: l.prix, barre: l.barre, reduction: l.barre ? Math.round((l.barre - l.prix) / l.barre * 100) : 0 })}
          ${l.probleme ? `<span class="pan-pb">${esc(l.probleme)}</span>` : ''}
          <div class="actions-r"><span class="qte"><button type="button" data-act="qte" data-v="${l.variante}" data-d="-1" aria-label="Moins : ${esc(l.titre)}">−</button><span aria-live="polite">${qte[l.variante] || l.qte}</span><button type="button" data-act="qte" data-v="${l.variante}" data-d="1" aria-label="Plus : ${esc(l.titre)}">+</button></span>
          <button type="button" class="btn btn-sec btn-s" data-act="ote" data-v="${l.variante}">Retirer</button></div></div></div>`).join('')}
        <div class="total-l"><span>Sous-total (${pluriel(g.nb, 'article', 'articles')})</span><b>${eur(g.sous_total)}</b></div></section>`).join('')}</div>
        <section class="carte"><h2>Récapitulatif</h2><div class="total-l gros"><span>Articles</span><b>${eur(r.total)}</b></div><p class="petit muted">Retrait ou livraison à choisir pour chaque vendeur à l’étape suivante : les frais de livraison y sont calculés avant que vous validiez.</p>
          <div class="avert">💶 <b>Paiement à la remise ou au retrait.</b> Vous ne payez rien en ligne.</div>
          ${r.groupes.length > 1 ? `<p class="petit muted">Votre commande sera découpée en ${r.groupes.length} commandes, une par vendeur.</p>` : ''}
          <a class="btn btn-p btn-plein" href="#/commander" ${bloque ? 'aria-disabled="true" data-bloque="1"' : ''}>Commander</a>${bloque ? '<p class="pan-pb">Retirez ou ajustez les articles signalés avant de commander.</p>' : ''}</section></div>`
      : '<div class="vide-etat"><span class="ico" aria-hidden="true">🛒</span><h3>Votre panier est vide</h3><p>Ajoutez des produits de un ou plusieurs vendeurs : chaque vendeur reçoit sa propre commande.</p><a class="btn btn-p" href="#/recherche">Voir le catalogue</a></div>'}</div>`);
  });

  // ---------------------------------------------------------------- commander
  let choixMode = {};
  const pageCommander = ouverte(async () => {
    if (!exigeCompte()) return;
    if (!lirePanier().length) return aller('#/panier');
    const r = await rpc('tk_panier', { lignes: lignesRpc(), choix: choixMode });
    if (!r.groupes.length || r.groupes.some(g => g.lignes.some(l => l.probleme))) { toast('Vérifiez votre panier avant de commander.', true); return aller('#/panier'); }
    for (const g of r.groupes) if (!choixMode[g.vendeur] || (choixMode[g.vendeur] === 'retrait' && !g.retrait_ok) || (choixMode[g.vendeur] === 'livraison' && !g.livraison_ok)) choixMode[g.vendeur] = g.retrait_ok ? 'retrait' : 'livraison';
    const r2 = await rpc('tk_panier', { lignes: lignesRpc(), choix: choixMode }), liv = r2.groupes.some(g => choixMode[g.vendeur] === 'livraison');
    const tel = (contact && contact.telephone) || '', nom = profil ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : '';
    vue(`<div class="wrap tk"><h1>Valider la commande</h1><form id="fCmd" class="cmd-2"><div class="pan-g">
      ${r2.groupes.map(g => `<section class="carte"><h2>${esc(g.nom)} ${tagVendeur(g.type)}</h2><p class="petit muted">${g.lignes.map(l => `${l.qte} × ${esc(l.titre)} (${esc(l.taille)}, ${esc(l.couleur)})`).join(' · ')}</p>
        <fieldset class="choix-2" style="border:0;padding:0;margin:0" role="radiogroup" aria-label="Remise des articles de ${esc(g.nom)}"><label><input type="radio" name="m-${g.vendeur}" value="retrait" data-mode="${g.vendeur}" ${choixMode[g.vendeur] === 'retrait' ? 'checked' : ''} ${g.retrait_ok ? '' : 'disabled'}>Retrait<small>${g.retrait_ok ? 'Chez le vendeur (' + esc(g.commune) + '), gratuit' : 'Non proposé'}</small></label>
          <label><input type="radio" name="m-${g.vendeur}" value="livraison" data-mode="${g.vendeur}" ${choixMode[g.vendeur] === 'livraison' ? 'checked' : ''} ${g.livraison_ok ? '' : 'disabled'}>Livraison<small>${g.livraison_ok ? (g.frais ? eur(g.frais) : 'Gratuite') + (g.gratuite_des ? ', offerte dès ' + eur(g.gratuite_des) : '') : 'Non proposée'}</small></label></fieldset>
        <div class="total-l"><span>Articles</span><span>${eur(g.sous_total)}</span></div><div class="total-l"><span>Livraison</span><span>${g.frais_appliques ? eur(g.frais_appliques) : choixMode[g.vendeur] === 'livraison' ? 'Offerte' : '—'}</span></div><div class="total-l"><b>Total ${esc(g.nom)}</b><b>${eur(g.total)}</b></div>
        ${g.type === 'particulier' ? '<p class="petit muted">Vendeur particulier : pas de rétractation de 14 jours.</p>' : '<p class="petit muted">Vendeur professionnel : rétractation de 14 jours à la remise.</p>'}</section>`).join('')}</div>
      <div class="pan-g"><section class="carte"><h2>Vos coordonnées</h2><div class="f"><label>Nom pour la remise<input name="nom" required maxlength="80" value="${esc(nom)}" autocomplete="name"></label>
        <label>Téléphone<input name="tel" type="tel" required pattern="[0-9 +.]{6,20}" value="${esc(tel)}" autocomplete="tel"></label>
        <label id="lAdresse" ${liv ? '' : 'hidden'}>Adresse de livraison<textarea name="adresse" maxlength="300" placeholder="Rue, quartier, commune, repères" ${liv ? 'required' : ''}></textarea></label>
        <label>Un mot pour le vendeur <span class="aide">(facultatif)</span><input name="note" maxlength="300"></label></div></section>
        <section class="carte"><label class="code-l">Code de réduction ou récompense <span class="aide">(facultatif)</span><span class="ligne-ds"><input name="code" maxlength="24" autocomplete="off" style="flex:1;text-transform:uppercase" placeholder="TK-…"><button type="button" class="btn btn-sec" data-act="x-code" data-total="${r2.total}" data-frais="${r2.groupes.reduce((n, g) => n + (g.frais_appliques || 0), 0)}">Appliquer</button></span></label><p class="petit muted" id="remiseL" aria-live="polite"></p><div class="total-l gros"><span>Total à payer</span><b id="totalAP" data-base="${r2.a_payer}">${eur(r2.a_payer)}</b></div><div class="avert">💶 <b>Paiement à la remise ou au retrait</b>, directement au vendeur. Rien n’est débité en ligne.</div>
          <button class="btn btn-p btn-plein" id="valider">Envoyer ma commande</button><p class="petit muted">En commandant, vous acceptez les <a href="cgu.html" target="_blank">conditions générales</a>. Chaque vendeur confirme sa commande.</p></section></div></form></div>`);
  });

  // ---------------------------------------------------------------- mes commandes (acheteur)
  const ETAPES = { retrait: [['nouvelle', 'Envoyée'], ['acceptee', 'Acceptée'], ['prete', 'Prête'], ['remise', 'Remise'], ['terminee', 'Terminée']], livraison: [['nouvelle', 'Envoyée'], ['acceptee', 'Acceptée'], ['prete', 'Prête'], ['expediee', 'Expédiée'], ['terminee', 'Terminée']] };
  const pageCommandes = ouverte(async () => {
    if (!exigeCompte()) return;
    const l = await q(sb.from('tk_commandes').select('*, tk_lignes(titre, qte)').eq('acheteur_id', moi.id).order('created_at', { ascending: false }).limit(60));
    vue(`<div class="wrap tk"><h1>Mes commandes</h1>${param().ok ? '<div class="bandeau-b" role="status">Commande envoyée ! Chaque vendeur doit l’accepter ; vous êtes prévenu à chaque étape.</div>' : ''}
      ${l.length ? `<div class="liste-c">${l.map(c => `<a class="cmd-c" href="#/commande/${c.id}"><div class="ligne"><b>Commande n° ${c.numero} · ${esc(c.vendeur_nom || 'Vendeur')}</b>${tagStatut(c.statut)}</div>
        <span class="petit muted">${c.tk_lignes.map(x => x.qte + ' × ' + esc(x.titre)).join(' · ')}</span><div class="ligne"><span class="petit">${esc(jourHeure(c.created_at))} · ${c.mode === 'retrait' ? 'Retrait' : 'Livraison'}</span><b>${eur(c.total)}</b></div></a>`).join('')}</div>`
        : '<div class="vide-etat"><span class="ico" aria-hidden="true">📦</span><h3>Aucune commande</h3><p>Vos commandes et leur avancement apparaîtront ici.</p><a class="btn btn-p" href="#/recherche">Voir le catalogue</a></div>'}</div>`);
  });
  const pageCommande = ouverte(async (i, id) => {
    if (!exigeCompte()) return;
    const [c, avis, ret] = await Promise.all([q(sb.from('tk_commandes').select('*, tk_lignes(*)').eq('id', id).maybeSingle()), q(sb.from('tk_avis').select('produit_id').eq('acheteur', moi.id)), q(sb.from('tk_retractations').select('*').eq('commande_id', id).maybeSingle())]);
    if (!c || c.acheteur_id !== moi.id) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Commande introuvable</h3><a class="btn btn-p" href="#/commandes">Mes commandes</a></div></div>');
    const dejaAvis = new Set(avis.map(a => a.produit_id)), etapes = ETAPES[c.mode], pos = etapes.findIndex(e => e[0] === c.statut), fini = ['refusee', 'annulee'].includes(c.statut);
    const delai = c.remise_at ? new Date(c.remise_at).getTime() + 14 * 864e5 : 0, retractOk = c.vendeur_type === 'professionnel' && ['remise', 'expediee', 'terminee'].includes(c.statut) && !ret && Date.now() <= delai;
    vue(`<div class="wrap tk"><h1>Commande n° ${c.numero}</h1><section class="carte"><div class="ligne" style="display:flex;justify-content:space-between;gap:10px"><b>${esc(c.vendeur_nom || 'Vendeur')}</b>${tagStatut(c.statut)}</div>
      ${fini ? `<div class="avert avert-ko"><b>${c.statut === 'refusee' ? 'Refusée par le vendeur' : 'Annulée'}</b>${c.motif ? ' : ' + esc(c.motif) : ''}. Le stock a été rendu, rien n’est à payer.</div>`
        : `<ol class="etapes" aria-label="Avancement">${etapes.map(([k, t], n) => `<li class="${n < pos ? 'fait' : n === pos ? 'fait cour' : ''}" ${n === pos ? 'aria-current="step"' : ''}>${t}</li>`).join('')}</ol>`}
      ${c.statut === 'prete' && c.mode === 'retrait' ? `<div class="avert"><b>Votre commande est prête.</b> ${c.vendeur_adresse ? 'Retrait : ' + esc(c.vendeur_adresse) + (c.vendeur_commune ? ', ' + esc(c.vendeur_commune) : '') + '.' : 'Le vendeur vous contactera au ' + esc(c.contact_tel) + ' pour convenir du lieu.'} Apportez de quoi payer ${eur(c.total)}.</div>` : ''}
      ${c.statut === 'expediee' ? `<div class="avert"><b>Votre commande est en route.</b> Payez ${eur(c.total)} à la livraison.</div>` : ''}</section>
      <section class="carte"><h2>Articles</h2>${c.tk_lignes.map(l => `<div class="pan-l"><span class="im"${fond(l.photo)}></span><div style="display:grid;gap:3px"><b>${l.produit_id ? `<a href="#/p/${l.produit_id}">${esc(l.titre)}</a>` : esc(l.titre)}</b><span class="petit muted">Taille ${esc(l.taille)} · ${esc(l.couleur)} · ${l.qte} × ${eur(l.prix_unitaire)}</span>
        ${c.statut === 'terminee' && l.produit_id && !dejaAvis.has(l.produit_id) ? `<details class="plus-options"><summary>Donner mon avis</summary><form class="f" data-form="avis" data-id="${l.produit_id}"><div class="note-sel" role="group" aria-label="Note">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-act="note" data-n="${n}" aria-pressed="false">${n}★</button>`).join('')}</div><input type="hidden" name="note"><label>Commentaire<textarea name="texte" maxlength="1000"></textarea></label><button class="btn btn-p">Publier mon avis</button></form></details>` : c.statut === 'terminee' && dejaAvis.has(l.produit_id) ? '<span class="petit muted">Avis donné, merci.</span>' : ''}</div></div>`).join('')}
        <div class="total-l"><span>Articles</span><span>${eur(c.sous_total)}</span></div><div class="total-l"><span>${c.mode === 'retrait' ? 'Retrait' : 'Livraison'}</span><span>${c.frais ? eur(c.frais) : 'Gratuit'}</span></div><div class="total-l gros"><span>Total à payer ${c.mode === 'retrait' ? 'au retrait' : 'à la livraison'}</span><b>${eur(c.total)}</b></div>
        <p class="petit muted">${c.mode === 'livraison' ? 'Livraison à : ' + esc(c.adresse) + '. ' : ''}Contact : ${esc(c.contact_nom)}, ${esc(c.contact_tel)}.${c.vendeur_tel ? ' Vendeur : ' + esc(c.vendeur_tel) + '.' : ''}</p></section>
      <section class="carte"><h2>Vos droits</h2>${c.vendeur_type === 'professionnel' ? `<p style="margin:0">Vendeur professionnel : <b>14 jours pour vous rétracter</b> à compter de la remise${c.remise_at ? ' (jusqu’au ' + esc(jourLong(delai)) + ')' : ''}.</p>` : '<p style="margin:0">Vendeur particulier : pas de rétractation de 14 jours ni de garantie légale de conformité.</p>'}
        ${ret ? `<div class="avert"><b>Rétractation demandée</b> le ${esc(jourLong(ret.created_at))} : ${ret.statut === 'demandee' ? 'le vendeur va récupérer l’article puis vous rembourser.' : ret.statut === 'recue' ? 'article reçu par le vendeur, remboursement à venir.' : 'remboursée.'}</div>` : ''}
        <div class="actions-r">${!fini ? `<a class="btn btn-sec" href="#/facture/${c.id}">${c.vendeur_type === 'professionnel' && ['remise', 'expediee', 'terminee'].includes(c.statut) ? 'Facture' : c.vendeur_type === 'professionnel' ? 'Bon de commande' : 'Reçu'} imprimable</a>` : ''}${['nouvelle', 'acceptee'].includes(c.statut) ? `<details class="plus-options"><summary>Annuler la commande</summary><form class="f" data-form="statut" data-id="${c.id}" data-statut="annulee"><label>Motif (obligatoire)<textarea name="motif" required minlength="5" maxlength="500"></textarea></label><button class="btn btn-sec">Confirmer l’annulation</button></form></details>` : ''}
          ${['remise', 'expediee'].includes(c.statut) ? `<button class="btn btn-p" data-act="statut" data-id="${c.id}" data-statut="terminee">J’ai bien reçu ma commande</button>` : ''}
          ${retractOk ? `<details class="plus-options"><summary>Me rétracter (14 jours)</summary><form class="f" data-form="retractation" data-id="${c.id}"><label>Motif <span class="aide">(facultatif)</span><input name="motif" maxlength="300"></label><button class="btn btn-sec">Demander la rétractation</button></form></details>` : ''}</div></section></div>`);
  });

  // ---------------------------------------------------------------- compte
  const pageCompte = ouverte(async () => {
    if (!moi) return vue(`<div class="wrap tk"><div class="vide-etat"><span class="ico" aria-hidden="true">👤</span><h3>Votre compte Tropik</h3><p>Connectez-vous pour suivre vos commandes, garder vos favoris et vendre.</p><a class="btn btn-p" href="#/connexion?retour=${encodeURIComponent('#/compte')}">Se connecter</a><a class="btn btn-sec" href="#/inscription">Créer un compte</a></div></div>`);
    const [vend, mod] = await Promise.all([q(sb.from('tk_vendeurs').select('id, statut, nom').eq('id', moi.id).maybeSingle()).catch(() => null), rpc('tk_moderation_file').then(() => true, () => false)]);
    vue(`<div class="wrap tk"><h1>Bonjour ${esc((profil && profil.prenom) || '')}</h1><div class="menu-v"><a href="#/commandes">📦 Mes commandes<small>Suivi et avis</small></a><a href="#/favoris">♥ Mes favoris<small>Produits gardés</small></a>
      <a href="#/${vend && vend.statut === 'valide' ? 'vendeur' : 'devenir-vendeur'}">🏪 ${vend ? 'Mon espace vendeur' : 'Vendre sur Tropik'}<small>${vend ? esc(vend.nom) : 'Ouvrir une boutique'}</small></a><a href="#/notifs">🔔 Notifications<small>${nbNotifs ? pluriel(nbNotifs, 'nouvelle', 'nouvelles') : 'Aucune nouvelle'}</small></a>
      ${mod ? '<a href="#/moderation">🛡️ Modération<small>Signalements</small></a>' : ''}<a href="#/aide">ℹ️ Vos droits<small>Classement, commission, retours</small></a></div>
      <p><a class="btn btn-sec" href="#/deconnexion">Se déconnecter</a></p></div>`);
  });

  // ---------------------------------------------------------------- devenir vendeur
  const pageDevenir = ouverte(async i => {
    if (!exigeCompte()) return;
    const v = await q(sb.from('tk_vendeurs').select('*').eq('id', moi.id).maybeSingle());
    if (v && v.statut === 'valide') return aller('#/vendeur');
    if (v && v.statut === 'demande') return vue(`<div class="wrap tk"><div class="vide-etat"><span class="ico" aria-hidden="true">⏳</span><h3>Demande en cours de vérification</h3><p>Votre boutique « ${esc(v.nom)} » est examinée par la modération. Vous serez prévenu ici dès la décision.</p><a class="btn btn-sec" href="#/compte">Retour</a></div></div>`);
    if (v && v.statut === 'suspendu') return vue(`<div class="wrap tk"><div class="vide-etat"><h3>Boutique suspendue</h3><p>${esc(v.motif_refus || '')}</p><p class="petit">Pour répondre, écrivez à ilotech.contact@gmail.com.</p></div></div>`);
    vue(`<div class="wrap tk"><h1>Vendre sur Tropik</h1>${v && v.statut === 'refuse' ? `<div class="avert avert-ko"><b>Votre demande n’a pas été validée</b> : ${esc(v.motif_refus || '')}. Corrigez puis renvoyez-la.</div>` : ''}
      <section class="carte"><p style="margin:0">Une commission de <b>${i.commission_pct} %</b> est prélevée sur chaque vente terminée (articles seulement). Chaque demande est vérifiée par la modération, qui peut la refuser en donnant le motif. <a href="#/aide">Détails</a></p></section>
      <form class="f carte" id="fVend"><fieldset class="choix-2" style="border:0;padding:0;margin:0"><label><input type="radio" name="type_vendeur" value="professionnel" ${!v || v.type_vendeur === 'professionnel' ? 'checked' : ''}>Professionnel<small>Entreprise ou auto-entrepreneur : SIRET exigé</small></label>
          <label><input type="radio" name="type_vendeur" value="particulier" ${v && v.type_vendeur === 'particulier' ? 'checked' : ''}>Particulier<small>Vide-dressing, occasion</small></label></fieldset>
        <label>Nom de la boutique<input name="nom" required minlength="2" maxlength="60" value="${esc(v ? v.nom : '')}"></label>
        <div data-pro class="f"><label>SIRET (14 chiffres)<input name="siret" inputmode="numeric" pattern="[0-9 ]{14,20}" maxlength="20" value="${esc(v ? v.siret || '' : '')}"></label>
          <label>Adresse de l’établissement<input name="adresse" maxlength="200" value="${esc(v ? v.adresse || '' : '')}" autocomplete="street-address"></label></div>
        <div class="ligne2"><label>Commune<input name="commune" required maxlength="60" value="${esc(v ? v.commune : '')}"></label><label>Territoire<select name="territoire">${TERRITOIRES.map(t => `<option ${(v ? v.territoire : 'Martinique') === t ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
        <label>Téléphone <span class="aide" data-pro>(affiché pour un professionnel)</span><input name="telephone" type="tel" pattern="[0-9 +.]{6,20}" value="${esc(v ? v.telephone || '' : '')}"></label>
        <label>Présentation de la boutique<textarea name="description" maxlength="800">${esc(v ? v.description : '')}</textarea></label>
        <fieldset class="f-liste" style="border:0;padding:0"><label><input type="checkbox" name="retrait_ok" checked>Retrait chez moi</label><label><input type="checkbox" name="livraison_ok" ${v && v.livraison_ok ? 'checked' : ''}>Livraison</label></fieldset>
        <label>Frais de livraison (€) <span class="aide">(0 = gratuite)</span><input name="frais_livraison" type="number" min="0" max="100" step="0.5" value="${v ? v.frais_livraison : 0}"></label>
        <label>Politique de retour <span class="aide">(facultatif, s’ajoute à la loi)</span><textarea name="politique_retour" maxlength="600">${esc(v ? v.politique_retour : '')}</textarea></label>
        <p class="petit muted">DAC7 : au-delà de 30 ventes ou 2 000 € par an, Tropik déclare vos ventes à l’administration fiscale, comme la loi l’exige.</p>
        <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" name="cgu" required style="width:auto"> <span>J’accepte les <a href="cgu.html" target="_blank">conditions générales</a>, je vends des produits authentiques et licites.</span></label>
        <button class="btn btn-p">Envoyer ma demande</button></form></div>`);
    const bascule = () => { const pro = $('#fVend [name=type_vendeur]:checked').value === 'professionnel'; document.querySelectorAll('#fVend [data-pro]').forEach(e => { e.hidden = !pro && e.tagName !== 'SPAN'; }); };
    bascule(); $('#fVend').addEventListener('change', bascule);
  });

  // ---------------------------------------------------------------- espace vendeur
  const monVendeur = async () => { if (!exigeCompte()) return null; const v = await q(sb.from('tk_vendeurs').select('*').eq('id', moi.id).maybeSingle()); if (!v || v.statut !== 'valide') { aller('#/devenir-vendeur'); return null; } return v; };
  const menuVendeur = a => TK.menuVendeur(a);
  const menuVendeur0 = (actif) => `<div class="puces" role="group" aria-label="Espace vendeur">${[['', 'Tableau de bord'], ['produits', 'Produits'], ['commandes', 'Commandes'], ['boutique', 'Boutique']].map(([k, t]) => `<a href="#/vendeur${k ? '/' + k : ''}" class="${actif === k ? 'on' : ''}" ${actif === k ? 'aria-current="true"' : ''}>${t}</a>`).join('')}</div>`;
  const pageVendeur = ouverte(async (i, sub, id) => {
    const v = await monVendeur(); if (!v) return;
    if (sub === 'produits') return vendeurProduits(v);
    if (sub === 'produit') return vendeurProduit(v, id);
    if (sub === 'commandes') return vendeurCommandes(v, i);
    if (sub === 'boutique') return vendeurBoutique(v);
    const s = await rpc('tk_stats_vendeur', { jours: 30 });
    vue(`<div class="wrap tk"><h1>${esc(v.nom)}</h1>${menuVendeur('')}
      ${s.a_traiter ? `<a class="avert" href="#/vendeur/commandes" style="display:block;color:var(--encre)"><b>${pluriel(s.a_traiter, 'commande à accepter', 'commandes à accepter')}</b> : répondez vite, le stock est réservé.</a>` : ''}
      ${s.dac7 ? '<div class="avert"><b>DAC7 :</b> vous avez dépassé 30 ventes ou 2 000 € cette année : Tropik déclare vos ventes à l’administration fiscale.</div>' : ''}
      <div class="chiffres"><div class="chiffre ${s.a_traiter ? 'alerte' : ''}"><span>À accepter</span><b>${s.a_traiter}</b></div><div class="chiffre"><span>En cours</span><b>${s.en_cours}</b></div><div class="chiffre"><span>Ventes, 30 jours</span><b>${eur(s.ventes)}</b></div><div class="chiffre"><span>Produits en vente</span><b>${s.produits}</b></div></div>
      <section class="carte"><h2>Commission</h2><p style="margin:0">Taux publié : <b>${String(s.taux_commission).replace('.', ',')} %</b> sur le prix des articles, à la fin de chaque vente. À régler à IloTech : <b>${eur(s.commission_due)}</b>${s.commission_payee ? ' · déjà réglé : ' + eur(s.commission_payee) : ''}.</p></section>
      <section class="carte"><h2>Chiffres</h2><p style="margin:0">${s.commandes} commandes en 30 jours, ${s.refusees} refusées ou annulées. ${s.stock_bas ? `<b>${pluriel(s.stock_bas, 'variante presque épuisée', 'variantes presque épuisées')}</b>. ` : ''}${s.nb_avis ? `Note : ★ ${String(s.note).replace('.', ',')} (${s.nb_avis} avis).` : 'Pas encore d’avis.'}</p>
        ${s.top.length ? `<p class="petit muted" style="margin:0">Les plus vendus : ${s.top.map(t => esc(t.titre) + ' (' + t.qte + ')').join(', ')}.</p>` : ''}</section>
      <div class="menu-v"><a href="#/vendeur/produit/nouveau">➕ Nouveau produit</a><a href="#/import-produits">📥 Importer un tableau</a><a href="#/vendeur/produits">👟 Mes produits</a><a href="#/vendeur/commandes">📦 Commandes</a><a href="#/boutique/${v.id}">🏪 Ma boutique en ligne</a></div></div>`);
  });
  const vendeurProduits = async v => {
    const l = await q(sb.from('tk_produits').select('id, titre, prix, statut, photos, motif_retrait, tk_variantes(stock)').eq('vendeur_id', v.id).order('created_at', { ascending: false }));
    vue(`<div class="wrap tk"><h1>Mes produits</h1>${menuVendeur('produits')}<a class="btn btn-p" href="#/vendeur/produit/nouveau">➕ Nouveau produit</a>
      ${l.length ? `<section class="carte">${l.map(p => `<div class="lig-p"><span class="im"${fond(p.photos[0])}></span><div style="min-width:0"><b style="overflow-wrap:anywhere">${esc(p.titre)}</b><br>${tag(STATUT_P[p.statut])} <span class="petit muted">${eur(p.prix)} · stock ${p.tk_variantes.reduce((n, x) => n + x.stock, 0)}</span>${p.motif_retrait ? `<br><span class="pan-pb">Retiré : ${esc(p.motif_retrait)}</span>` : ''}</div>
        <div class="actions-r"><a class="btn btn-sec btn-s" href="#/vendeur/produit/${p.id}">Modifier</a>${p.statut === 'publie' ? `<button class="btn btn-sec btn-s" data-act="prod-statut" data-id="${p.id}" data-st="pause">Mettre en pause</button>` : p.statut !== 'retire' ? `<button class="btn btn-p btn-s" data-act="prod-statut" data-id="${p.id}" data-st="publie">Publier</button>` : ''}
        ${p.statut === 'publie' ? `<a class="btn btn-sec btn-s" href="#/p/${p.id}">Voir</a>` : ''}</div></div>`).join('')}</section>`
        : '<div class="vide-etat"><span class="ico" aria-hidden="true">👟</span><h3>Aucun produit</h3><p>Ajoutez votre premier produit avec ses photos, ses tailles et son stock.</p><a class="btn btn-p" href="#/vendeur/produit/nouveau">Créer un produit</a></div>'}</div>`);
  };
  let formP = { id: null, photos: [] };
  const ligneVar = (x = {}) => `<div class="ligne" data-var="${esc(x.id || '')}"><label>Taille<input name="taille" required maxlength="12" value="${esc(x.taille || '')}" placeholder="42, M…"></label><label>Couleur<select name="couleur">${COULEURS.map(c => `<option ${x.couleur === c ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
    <label>Stock<input name="stock" type="number" min="0" max="9999" required value="${x.stock ?? 1}"></label><button type="button" class="btn btn-sec" data-act="var-ote" aria-label="Retirer cette variante">✕</button></div>`;
  const photosHtml = () => formP.photos.map((x, k) => `<span class="ph"${fond(x)}><button type="button" data-act="ph-ote" data-k="${k}" aria-label="Retirer la photo ${k + 1}">✕</button></span>`).join('');
  const vendeurProduit = async (v, id) => {
    const rs = await rayons(), p = id && id !== 'nouveau' ? await q(sb.from('tk_produits').select('*, tk_variantes(*)').eq('id', id).eq('vendeur_id', v.id).maybeSingle()) : null;
    if (id && id !== 'nouveau' && !p) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Produit introuvable</h3><a class="btn btn-p" href="#/vendeur/produits">Mes produits</a></div></div>');
    formP = { id: p ? p.id : null, photos: p ? [...p.photos] : [] };
    const flashs = p && p.statut === 'publie' ? await q(sb.from('tk_flash').select('*').eq('produit_id', p.id).gte('fin', new Date().toISOString()).order('debut')) : [];
    vue(`<div class="wrap tk"><h1>${p ? 'Modifier le produit' : 'Nouveau produit'}</h1>${menuVendeur('produits')}
      ${p && p.statut === 'retire' ? `<div class="avert avert-ko"><b>Retiré par la modération :</b> ${esc(p.motif_retrait || '')}</div>` : ''}
      <form class="f carte" id="fProd"><label>Titre<input name="titre" required minlength="3" maxlength="120" value="${esc(p ? p.titre : '')}"></label>
        <label>Rayon<select name="rayon" required><option value="">Choisir…</option>${familles(rs).map(fm => `<optgroup label="${esc(fm.nom)}">${rs.filter(s => s.parent === fm.code).map(s => `<option value="${s.code}" ${p && p.rayon === s.code ? 'selected' : ''}>${esc(s.nom)}</option>`).join('')}</optgroup>`).join('')}</select></label>
        <div class="ligne2"><label>Marque <span class="aide">(vide si sans marque)</span><input name="marque" maxlength="40" value="${esc(p ? p.marque || '' : '')}"></label><label>Prix (€)<input name="prix" type="number" min="1" max="20000" step="0.01" required value="${p ? p.prix : ''}"></label></div>
        <label id="lAuth" ${p && p.marque ? '' : 'hidden'} style="display:${p && p.marque ? 'flex' : 'none'};gap:8px;font-weight:700;background:var(--soleil-doux);padding:10px;border-radius:10px"><input type="checkbox" name="authentique" ${p && p.authentique ? 'checked' : ''} style="width:auto"> <span>Je certifie que ce produit de marque est <b>authentique</b>. Les contrefaçons sont interdites.</span></label>
        <div class="ligne2"><label>Pour qui<select name="public_cible">${Object.entries(PUBLICS).map(([k, t]) => `<option value="${k}" ${p && p.public_cible === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label><label>État<select name="etat"><option value="neuf" ${p && p.etat === 'neuf' ? 'selected' : ''}>Neuf</option><option value="occasion" ${p && p.etat === 'occasion' ? 'selected' : ''}>Occasion</option></select></label></div>
        <label>Description<textarea name="description" maxlength="2000">${esc(p ? p.description : '')}</textarea></label>
        <div><b>Photos</b> <span class="aide">(au moins une pour publier, 8 au plus)</span><div class="photos-f" id="photosF">${photosHtml()}</div><label class="btn btn-sec btn-s" style="margin-top:8px;cursor:pointer">Ajouter une photo<input type="file" accept="image/*" id="phIn" hidden></label></div>
        <div><b>Tailles, couleurs et stock</b><div class="var-l" id="varL">${(p && p.tk_variantes.length ? p.tk_variantes : [{}]).map(ligneVar).join('')}</div><button type="button" class="btn btn-sec btn-s" data-act="var-ajoute" style="margin-top:8px">+ Ajouter une taille ou une couleur</button></div>
        <div class="actions-r"><button class="btn btn-sec" value="brouillon" ${p && p.statut === 'publie' ? 'hidden' : ''}>Enregistrer en brouillon</button><button class="btn btn-p" value="publie">${p && p.statut === 'publie' ? 'Enregistrer' : 'Publier'}</button></div></form>
      ${p && p.statut === 'publie' ? `<section class="carte"><h2>Vente flash</h2><p class="petit muted">Un prix plus bas pendant une durée limitée (14 jours au plus). Le prix barré sera le plus bas des 30 derniers jours : Tropik le calcule, vous ne le saisissez pas.</p>
        ${flashs.map(f => `<div class="total-l"><span>${eur(f.prix)} du ${esc(jourHeure(f.debut))} au ${esc(jourHeure(f.fin))}</span><button class="btn btn-sec btn-s" data-act="flash-ote" data-id="${f.id}">Annuler</button></div>`).join('')}
        <form class="f" id="fFlash" data-id="${p.id}"><div class="ligne3"><label>Prix flash (€)<input name="prix" type="number" min="1" step="0.01" required></label><label>Début<input name="debut" type="datetime-local" required></label><label>Fin<input name="fin" type="datetime-local" required></label></div><button class="btn btn-sec">Programmer la vente flash</button></form></section>` : ''}</div>`);
  };
  const vendeurCommandes = async (v, i) => {
    const f = param().f || 'traiter', l = await q(sb.from('tk_commandes').select('*, tk_lignes(*), tk_retractations(*)').eq('vendeur_id', v.id).order('created_at', { ascending: false }).limit(100));
    const GR = { traiter: ['À accepter', c => c.statut === 'nouvelle'], cours: ['En cours', c => ['acceptee', 'prete', 'remise', 'expediee'].includes(c.statut)], finies: ['Terminées', c => c.statut === 'terminee'], annulees: ['Refusées ou annulées', c => ['refusee', 'annulee'].includes(c.statut)] };
    const liste = l.filter((GR[f] || GR.traiter)[1]);
    const motifF = (c, st, lib) => `<details class="plus-options"><summary>${lib}…</summary><form class="f" data-form="statut" data-id="${c.id}" data-statut="${st}"><label>Motif (envoyé à l’acheteur)<textarea name="motif" required minlength="5" maxlength="500"></textarea></label><button class="btn btn-sec">Confirmer</button></form></details>`;
    vue(`<div class="wrap tk"><h1>Commandes reçues</h1>${menuVendeur('commandes')}<div class="puces" role="group" aria-label="Filtrer">${Object.entries(GR).map(([k, [t, fn]]) => `<a href="#/vendeur/commandes?f=${k}" class="${f === k ? 'on' : ''}" ${f === k ? 'aria-current="true"' : ''}>${t} (${l.filter(fn).length})</a>`).join('')}</div>
      ${liste.length ? `<div class="liste-c">${liste.map(c => { const ret = c.tk_retractations && (Array.isArray(c.tk_retractations) ? c.tk_retractations[0] : c.tk_retractations);
        return `<article class="carte" data-cmd="${c.id}"><div class="ligne" style="display:flex;justify-content:space-between;gap:10px"><b>Commande n° ${c.numero}</b>${tagStatut(c.statut)}</div>
        <span class="petit muted">${esc(jourHeure(c.created_at))} · ${c.mode === 'retrait' ? 'Retrait chez vous' : 'Livraison'} · ${esc(c.contact_nom)} · <a href="tel:${esc(c.contact_tel)}">${esc(c.contact_tel)}</a></span>
        ${c.mode === 'livraison' ? `<span class="petit">📍 ${esc(c.adresse)}</span>` : ''}${c.note ? `<span class="petit">💬 ${esc(c.note)}</span>` : ''}
        <div>${c.tk_lignes.map(x => `<div class="total-l"><span>${x.qte} × ${esc(x.titre)} <small class="muted">(${esc(x.taille)}, ${esc(x.couleur)})</small></span><span>${eur(x.prix_unitaire * x.qte)}</span></div>`).join('')}
          ${c.frais ? `<div class="total-l"><span>Livraison</span><span>${eur(c.frais)}</span></div>` : ''}<div class="total-l gros"><span>À encaisser ${c.mode === 'retrait' ? 'au retrait' : 'à la livraison'}</span><b>${eur(c.total)}</b></div></div>
        ${c.motif ? `<span class="petit">Motif : ${esc(c.motif)}</span>` : ''}
        ${ret ? `<div class="avert"><b>Rétractation ${ret.statut === 'demandee' ? 'demandée' : ret.statut === 'recue' ? 'article reçu' : 'remboursée'}</b>${ret.motif ? ' : ' + esc(ret.motif) : ''}${ret.statut !== 'remboursee' ? `<div class="actions-r" style="margin-top:8px">${ret.statut === 'demandee' ? `<button class="btn btn-sec btn-s" data-act="ret" data-id="${c.id}" data-e="recue">Article reçu</button>` : ''}<button class="btn btn-p btn-s" data-act="ret" data-id="${c.id}" data-e="remboursee">Remboursé</button></div>` : ''}</div>` : ''}
        <div class="actions-r">${c.statut === 'nouvelle' ? `<button class="btn btn-p" data-act="statut" data-id="${c.id}" data-statut="acceptee">Accepter</button>${motifF(c, 'refusee', 'Refuser')}` : ''}
          ${c.statut === 'acceptee' ? `<button class="btn btn-p" data-act="statut" data-id="${c.id}" data-statut="prete">Marquer prête</button>${motifF(c, 'annulee', 'Annuler')}` : ''}
          ${c.statut === 'prete' ? `<button class="btn btn-p" data-act="statut" data-id="${c.id}" data-statut="${c.mode === 'retrait' ? 'remise' : 'expediee'}">${c.mode === 'retrait' ? 'Remise au client' : 'Expédiée'}</button>${motifF(c, 'annulee', 'Annuler')}` : ''}
          ${['remise', 'expediee'].includes(c.statut) ? `<button class="btn btn-p" data-act="statut" data-id="${c.id}" data-statut="terminee">Terminée (payée)</button>` : ''}</div></article>`; }).join('')}</div>`
        : `<div class="vide-etat"><span class="ico" aria-hidden="true">📦</span><h3>Rien ici</h3><p>${f === 'traiter' ? 'Les nouvelles commandes à accepter apparaîtront ici ; vous serez prévenu.' : 'Aucune commande dans cette liste.'}</p></div>`}</div>`);
  };
  const vendeurBoutique = async v => {
    vue(`<div class="wrap tk"><h1>Ma boutique</h1>${menuVendeur('boutique')}<section class="carte"><h2>Identité (non modifiable ici)</h2><p style="margin:0">${esc(v.nom)} · ${tagVendeur(v.type_vendeur)}<br>${v.siret ? 'SIRET ' + esc(v.siret) + '<br>' : ''}${esc(v.adresse || v.commune)} · ${esc(v.territoire)}</p>
      <p class="petit muted" style="margin:0">Pour changer le nom, le SIRET ou l’adresse, écrivez à ilotech.contact@gmail.com : la modération revérifie.</p></section>
      <form class="f carte" id="fBoutique"><label>Présentation<textarea name="description" maxlength="800">${esc(v.description)}</textarea></label>
        <div><b>Logo</b><div class="photos-f" id="logoF">${v.logo ? `<span class="ph"${fond(v.logo)}></span>` : ''}</div><label class="btn btn-sec btn-s" style="margin-top:8px;cursor:pointer">Choisir un logo<input type="file" accept="image/*" id="logoIn" hidden></label><input type="hidden" name="logo" value="${esc(v.logo || '')}"></div>
        <label>Téléphone<input name="telephone" type="tel" pattern="[0-9 +.]{6,20}" value="${esc(v.telephone || '')}"></label>
        <fieldset class="f-liste" style="border:0;padding:0"><label><input type="checkbox" name="retrait_ok" ${v.retrait_ok ? 'checked' : ''}>Retrait chez moi</label><label><input type="checkbox" name="livraison_ok" ${v.livraison_ok ? 'checked' : ''}>Livraison</label></fieldset>
        <div class="ligne2"><label>Frais de livraison (€)<input name="frais_livraison" type="number" min="0" max="100" step="0.5" value="${v.frais_livraison}"></label><label>Offerte dès (€) <span class="aide">(vide : jamais)</span><input name="livraison_gratuite_des" type="number" min="1" step="1" value="${v.livraison_gratuite_des ?? ''}"></label></div>
        <label>Politique de retour<textarea name="politique_retour" maxlength="600">${esc(v.politique_retour)}</textarea></label><button class="btn btn-p">Enregistrer</button></form></div>`);
  };

  // ---------------------------------------------------------------- modération
  const pageModeration = ouverte(async () => {
    if (!exigeCompte()) return;
    let l; try { l = await rpc('tk_moderation_file'); } catch (e) { return vue('<div class="wrap tk"><div class="vide-etat"><h3>Réservé à la modération</h3><a class="btn btn-p" href="#/compte">Retour</a></div></div>'); }
    vue(`<div class="wrap tk"><h1>Signalements</h1><p class="muted">Examinez, décidez et motivez : la personne qui a signalé reçoit votre décision, le vendeur reçoit le motif d’un retrait.</p>
      ${l.length ? `<section class="carte mod-l">${l.map(s => `<article><b>${esc(s.titre || 'Objet supprimé')}</b> <span class="petit muted">· ${esc(s.vendeur || '')} · motif « ${esc(s.motif)} » · ${esc(jourHeure(s.date))}</span>${s.details ? `<p style="margin:0">${esc(s.details)}</p>` : ''}
        ${s.objet_type === 'produit' ? `<a class="btn btn-sec btn-s" href="#/p/${s.objet_id}">Voir le produit</a>` : s.objet_type === 'boutique' ? `<a class="btn btn-sec btn-s" href="#/boutique/${s.objet_id}">Voir la boutique</a>` : ''}
        <form class="f" data-form="moderer" data-id="${s.id}" data-objet="${s.objet_id || ''}" data-type="${s.objet_type}"><label>Décision motivée (10 caractères au moins)<textarea name="decision" required minlength="10" maxlength="500"></textarea></label>
          <div class="actions-r">${s.objet_type === 'produit' && s.produit_statut !== 'retire' ? '<button class="btn btn-ko" value="retirer">Retirer le produit</button>' : ''}<button class="btn btn-sec" value="sans_suite">Classer sans suite</button></div></form></article>`).join('')}</section>`
        : '<div class="vide-etat"><span class="ico" aria-hidden="true">🛡️</span><h3>Aucun signalement</h3><p>Les signalements d’acheteurs apparaîtront ici. Les demandes de boutique se valident dans le Control Panel.</p></div>'}</div>`);
  });

  // ---------------------------------------------------------------- aide : droits, classement, commission
  const pageAide = async () => {
    const i = await infos();
    vue(`<div class="wrap tk"><h1>Vos droits sur Tropik</h1>
      <section class="carte"><h2>Qui vend ?</h2><p style="margin:0">Tropik est une <b>place de marché</b> : le contrat est conclu avec le vendeur, pas avec Tropik. Chaque fiche dit si le vendeur est <b>professionnel</b> (nom, SIRET, adresse, téléphone affichés) ou <b>particulier</b>. Chaque vendeur est vérifié avant d’ouvrir sa boutique.</p></section>
      <section class="carte"><h2>Le classement des produits</h2><p style="margin:0">Par défaut, par <b>pertinence</b> : d’abord les produits dont le titre ou la marque correspond à votre recherche, puis les plus récents. <b>Aucun vendeur ne paie pour être mieux placé.</b> Vous pouvez trier par nouveautés, prix, popularité ou promotions.</p></section>
      <section class="carte"><h2>Prix barrés honnêtes</h2><p style="margin:0">Un prix barré n’apparaît que s’il est le <b>prix le plus bas des 30 derniers jours</b> avant la réduction, calculé par Tropik à partir de l’historique. Les ventes flash ont des dates affichées.</p></section>
      <section class="carte"><h2>Rétractation de 14 jours</h2><p style="margin:0">Chez un vendeur <b>professionnel</b>, vous pouvez vous rétracter 14 jours après la remise, depuis votre commande. Entre particuliers, ce droit n’existe pas : c’est indiqué avant de commander.</p></section>
      <section class="carte"><h2>Paiement</h2><p style="margin:0">À la remise ou au retrait, directement au vendeur. Aucun paiement en ligne pour l’instant.</p></section>
      <section class="carte"><h2>Contrefaçons et signalements</h2><p style="margin:0">Le vendeur déclare l’authenticité de chaque produit de marque. Le bouton « Signaler » de chaque fiche envoie votre signalement à la modération, qui décide et motive sa décision.</p></section>
      <section class="carte"><h2>Pour les vendeurs</h2><p style="margin:0">Commission : <b>${i ? i.commission_pct + ' %' : 'publiée à l’ouverture'}</b> du prix des articles, à chaque vente terminée, sans effet sur le classement. Au-delà de 30 ventes ou 2 000 € par an, Tropik déclare vos ventes à l’administration fiscale (DAC7).</p></section>
      <section class="carte"><h2>Médiation</h2><p style="margin:0">En cas de litige avec un vendeur professionnel, écrivez d’abord au vendeur puis à Tropik ; vous pouvez ensuite saisir gratuitement un médiateur de la consommation.</p><p class="cgu-lien"><a href="cgu.html">Lire les conditions générales complètes</a></p></section></div>`);
  };

  // ---------------------------------------------------------------- actions (un seul écouteur : le contenu des pages est remplacé à chaque affichage)
  const occupe = (b, f) => { if (b) b.disabled = true; return f().finally(() => { if (b && b.isConnected) b.disabled = false; }); };
  const rafraichir = () => { oublier('tk-'); rendre(); };
  const hashDe = p => { const u = new URLSearchParams(); for (const [k, v] of Object.entries(p)) if (v) u.set(k, v); const x = u.toString(); return '#/recherche' + (x ? '?' + x : ''); };
  const vers = (hash, p) => { const h = hashDe(p); if (location.hash === h) rendre(); else location.hash = h; };
  const paramsActuels = () => { const p = param(); return { ...p }; };
  const A = {
    async fav(b) {
      if (!moi) return aller('#/connexion?retour=' + encodeURIComponent(location.hash));
      try {
        const actif = await rpc('tk_favori_basculer', { p: b.dataset.id });
        document.querySelectorAll(`[data-act="fav"][data-id="${b.dataset.id}"]`).forEach(x => { x.setAttribute('aria-pressed', String(actif)); if (x.classList.contains('coeur')) x.setAttribute('aria-label', (actif ? 'Retirer des favoris' : 'Ajouter aux favoris')); else x.textContent = '♥ ' + (actif ? 'Dans mes favoris' : 'Favori'); });
        toast(actif ? 'Ajouté aux favoris.' : 'Retiré des favoris.');
      } catch (e) { toast(erreur(e), true); }
    },
    qte(b) { const l = lirePanier(), x = l.find(y => y.v === b.dataset.v); if (!x) return; x.q = Math.max(1, Math.min(10, x.q + Number(b.dataset.d))); ecrirePanier(l); rendre(); },
    ote(b) { ecrirePanier(lirePanier().filter(y => y.v !== b.dataset.v)); rendre(); },
    note(b) { const f = b.closest('form'); f.note.value = b.dataset.n; f.querySelectorAll('[data-act="note"]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.n) <= Number(b.dataset.n) && x === b))); },
    async statut(b) { await occupe(b, async () => { try { await rpc('tk_changer_statut', { cmd: b.dataset.id, nouveau: b.dataset.statut, motif_c: null }); toast('Étape enregistrée.'); rafraichir(); } catch (e) { toast(erreur(e), true); } }); },
    async 'prod-statut'(b) { await occupe(b, async () => { try { await rpc('tk_produit_statut', { p: b.dataset.id, st: b.dataset.st }); toast(b.dataset.st === 'publie' ? 'Produit publié.' : 'Produit en pause.'); rendre(); } catch (e) { toast(erreur(e), true); } }); },
    async ret(b) { await occupe(b, async () => { try { await rpc('tk_retractation_traiter', { cmd: b.dataset.id, etat: b.dataset.e }); toast('Enregistré.'); rendre(); } catch (e) { toast(erreur(e), true); } }); },
    async 'flash-ote'(b) { await occupe(b, async () => { try { await rpc('tk_flash_annuler', { f: b.dataset.id }); toast('Vente flash annulée.'); rendre(); } catch (e) { toast(erreur(e), true); } }); },
    'var-ajoute'() { $('#varL').insertAdjacentHTML('beforeend', ligneVar()); },
    'var-ote'(b) { if (document.querySelectorAll('#varL .ligne').length > 1) b.closest('.ligne').remove(); else toast('Il faut au moins une taille.', true); },
    'ph-ote'(b) { formP.photos.splice(Number(b.dataset.k), 1); $('#photosF').innerHTML = photosHtml(); }
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (b && A[b.dataset.act]) { e.preventDefault(); A[b.dataset.act](b, e); return; }
    const c = e.target.closest('a[data-bloque]'); if (c) { e.preventDefault(); toast('Retirez ou ajustez les articles signalés.', true); }
  });
  // filtres : chaque changement met à jour l'adresse (donc la liste), sans bouton « appliquer »
  document.addEventListener('change', async e => {
    const t = e.target;
    if (false) {}
    else if (t.matches('[data-mode]')) { choixMode[t.dataset.mode] = t.value; const f = $('#fCmd'), mem = f ? Object.fromEntries(new FormData(f)) : {}; await pageCommander(); const g = $('#fCmd'); if (g) for (const k of ['nom', 'tel', 'adresse', 'note']) if (mem[k] != null && g[k]) g[k].value = mem[k]; }
    else if (t.id === 'phIn' && t.files[0]) {
      if (formP.photos.length >= 8) { toast('8 photos au plus.', true); return; }
      try { formP.photos.push(await envoyerPhoto(t.files[0])); $('#photosF').innerHTML = photosHtml(); } catch (x) { toast(erreur(x), true); } t.value = '';
    } else if (t.id === 'logoIn' && t.files[0]) {
      try { const c = await envoyerPhoto(t.files[0]); $('#fBoutique [name=logo]').value = c; $('#logoF').innerHTML = `<span class="ph"${fond(c)}></span>`; } catch (x) { toast(erreur(x), true); } t.value = '';
    }
  });
  document.addEventListener('input', e => {
    if (e.target.name === 'marque' && e.target.closest('#fProd')) { const l = $('#lAuth'), a = e.target.value.trim() !== ''; l.hidden = !a; l.style.display = a ? 'flex' : 'none'; }
  });
  document.addEventListener('submit', async e => {
    const f = e.target; e.preventDefault();
    const bouton = e.submitter, fin = () => { if (bouton) bouton.disabled = false; };
    if (bouton) bouton.disabled = true;
    try {
      if (f.id === 'fRech') { vers('', { q: f.q.value.trim() }); }
      else if (f.id === 'fCmd') {
        const d = Object.fromEntries(new FormData(f));
        const r = await rpc('tk_commander2', { lignes: lignesRpc(), choix: choixMode, adresse_c: d.adresse || null, nom_c: d.nom, tel_c: d.tel, note_c: d.note || null, code_c: (d.code || '').trim() || null });
        ecrirePanier([]); choixMode = {}; toast(r.commandes.length > 1 ? `${r.commandes.length} commandes envoyées.` : 'Commande envoyée.'); aller('#/commandes?ok=1');
      } else if (f.id === 'fVend') {
        const d = Object.fromEntries(new FormData(f));
        await rpc('tk_devenir_vendeur', { d: { ...d, retrait_ok: !!d.retrait_ok, livraison_ok: !!d.livraison_ok, cgu: !!d.cgu, frais_livraison: Number(d.frais_livraison || 0) } });
        toast('Demande envoyée : la modération la vérifie.'); rendre();
      } else if (f.id === 'fProd') {
        const d = Object.fromEntries(new FormData(f)), st = bouton ? bouton.value : 'brouillon';
        const variantes = [...f.querySelectorAll('#varL .ligne')].map(l => ({ id: l.dataset.var || null, taille: l.querySelector('[name=taille]').value.trim(), couleur: l.querySelector('[name=couleur]').value, stock: Number(l.querySelector('[name=stock]').value) }));
        const id = await rpc('tk_produit_enregistrer', { d: { id: formP.id, statut: st, titre: d.titre, rayon: d.rayon, marque: d.marque, prix: Number(d.prix), authentique: !!d.authentique, public_cible: d.public_cible, etat: d.etat, description: d.description, photos: formP.photos, variantes } });
        toast(st === 'publie' ? 'Produit publié.' : 'Brouillon enregistré.'); aller('#/vendeur/produits'); return id;
      } else if (f.id === 'fFlash') {
        const d = Object.fromEntries(new FormData(f));
        await rpc('tk_flash_poser', { p: f.dataset.id, prix_f: Number(d.prix), debut_f: new Date(d.debut).toISOString(), fin_f: new Date(d.fin).toISOString() }); toast('Vente flash programmée.'); rendre();
      } else if (f.id === 'fBoutique') {
        const d = Object.fromEntries(new FormData(f));
        await rpc('tk_maj_boutique', { d: { description: d.description, logo: d.logo, telephone: d.telephone, retrait_ok: !!d.retrait_ok, livraison_ok: !!d.livraison_ok, frais_livraison: Number(d.frais_livraison || 0), livraison_gratuite_des: d.livraison_gratuite_des || '', politique_retour: d.politique_retour } });
        toast('Boutique mise à jour.'); rendre();
      } else if (f.dataset.form === 'signaler') {
        const d = Object.fromEntries(new FormData(f));
        await rpc('signaler', { app: 'tropik', univ: 'tropik', type_objet: f.dataset.type, objet: f.dataset.id, motif_s: d.motif, texte: d.details || '' });
        f.closest('details').innerHTML = '<p>Merci : votre signalement est envoyé à la modération. Vous recevrez sa décision.</p>';
      } else if (f.dataset.form === 'avis') {
        const d = Object.fromEntries(new FormData(f)); if (!d.note) { toast('Choisissez une note.', true); fin(); return; }
        await rpc('tk_avis_laisser', { p: f.dataset.id, note_a: Number(d.note), texte_a: d.texte || '' }); toast('Merci pour votre avis !'); rendre();
      } else if (f.dataset.form === 'statut') {
        await rpc('tk_changer_statut', { cmd: f.dataset.id, nouveau: f.dataset.statut, motif_c: new FormData(f).get('motif') }); toast('Étape enregistrée.'); rendre();
      } else if (f.dataset.form === 'retractation') {
        await rpc('tk_retractation_demander', { cmd: f.dataset.id, motif_r: new FormData(f).get('motif') || null }); toast('Rétractation demandée.'); rendre();
      } else if (f.dataset.form === 'moderer') {
        const d = new FormData(f).get('decision'), v = bouton ? bouton.value : 'sans_suite';
        if (v === 'retirer') await rpc('tk_retirer_produit', { p: f.dataset.objet, motif_r: d });
        await rpc('traiter_signalement', { sid: f.dataset.id, nouveau: v === 'retirer' ? 'traite' : 'rejete', motivation: d }); toast('Décision enregistrée.'); rendre();
      }
    } catch (err) { toast(erreur(err), true); }
    fin();
  });

  Object.assign(APP.pages, { favoris: pageFavoris, panier: pagePanier, commander: pageCommander,
    commandes: pageCommandes, commande: pageCommande, compte: pageCompte, 'devenir-vendeur': pageDevenir, vendeur: pageVendeur, moderation: pageModeration, aide: pageAide });
/* service worker : enregistré par pwa.js (commun/pwa.js) */
  Object.assign(TK, { rpc, q, IC, svg, lirePanier, ecrirePanier, rayons, familles, nomRayon, infos, ouverte, erreurPage, prixHtml, etoiles, tagVendeur, tagStatut, pluriel, fond, occupe, rafraichir, vers, hashDe, jourLong, jourHeure, STATUT, STATUT_P, COULEURS, TERRITOIRES, PUBLICS, MOTIFS_SIG, TRIS, guideTailles, stockTexte, vendeurCommandes, monVendeur, menuVendeur, A, ligneVar, photosHtml});
  Object.defineProperty(TK, 'formP', { get: () => formP, set: v => { formP = v; } });
})();
