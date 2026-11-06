/* Woulib — espace restaurateur et commerçant (#/pro), chargé à la première ouverture : le démarrage de l'appli reste léger pour les clients.
   Utilise ce que food.js définit (états, catégories, etatOuverture, suivi). Prix, étapes et pause contrôlés par la base (food.sql, espace_pro.sql). */
'use strict';
// ---------------------------------------------------------------- espace restaurateur
APP.pages.pro = async (sous, id) => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  if (sous === 'resto') return formResto(id === 'nouveau' ? null : id);
  if (sous === 'boutique') return BOUTIQUES ? formResto(id === 'nouveau' ? null : id, 'boutique') : vue('<div class="wrap vide-etat" style="margin-top:30px"><div class="ico">🛒</div><h3>Les boutiques ouvrent très bientôt</h3><a class="btn btn-p" href="#/pro">Mon espace</a></div>');
  if (sous === 'menu') return pageMenu(id);
  if (sous === 'commandes') return pageCommandesPro(id);
  if (sous === 'avis') return pageAvisPro(id);
  if (sous === 'commissions') return pageCommissionsPro();
  if (sous === 'codes') return pageCodes(id);
  if (sous === 'stats') return pageStats(id);
  const l = await q(sb.from('restaurants').select('*').eq('owner', moi.id).order('created_at'));
  const dus = l.some(x => x.livreurs_kivora) ? await q(sb.rpc('a_recevoir_livreurs')).catch(() => []) : [];
  const cm = await blocCommission();
  vue(`<div class="wrap" style="padding-top:22px">${cm}${dus.length ? `<div class="panneau" style="margin-bottom:16px;border-color:var(--jaune)"><h2 style="margin:0 0 8px">💶 À recevoir des livreurs</h2>
      ${dus.map(x => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 0"><span><b>${esc(x.livreur)}</b> · ${x.nb} livraison${x.nb > 1 ? 's' : ''}${x.telephone ? ` · <a href="tel:${esc(x.telephone)}">${esc(x.telephone)}</a>` : ''}</span>
        <span class="actions"><b>${eur(x.montant)}</b><button class="btn btn-s btn-ok" data-recu="${x.livreur_id}" data-montant="${x.montant}">J’ai reçu ${eur(x.montant)}</button></span></div>`).join('')}</div>` : ''}<div class="titre-s"><h1>${l.length && l.every(estBoutique) ? 'Ma boutique' : 'Espace restaurateur'}</h1><div class="actions">${l.some(x => x.statut === 'publie') ? '<a class="btn btn-p" href="#/pro/commandes">Commandes en direct</a>' : ''}${l.length < 3 ? '<a class="btn" href="#/pro/resto/nouveau">+ Restaurant</a>' + (BOUTIQUES ? '<a class="btn" href="#/pro/boutique/nouveau">+ Boutique</a>' : '') : ''}</div></div>
    ${l.length ? l.map(x => `<div class="ligne-l">${x.photo ? `<img class="mini" src="${esc(photo(x.photo))}" alt="">` : `<div class="mini" style="display:grid;place-items:center;font-size:30px">${estBoutique(x) ? '🛒' : CUISINES[x.cuisine]?.[0]}</div>`}
      <div><b>${esc(x.nom)}</b> ${tag(ST_RESTO[x.statut])}<div class="muted petit">${esc([x.commune, x.livraison && 'Livraison', x.emporter && 'À emporter'].filter(Boolean).join(' · '))}</div>${x.statut === 'refuse' && x.motif_refus ? `<div class="petit" style="color:var(--rouge)">Motif : ${esc(x.motif_refus)}</div>` : ''}
        ${x.statut === 'publie' ? `<label style="display:flex;gap:8px;align-items:center;margin-top:6px;font-weight:800"><input type="checkbox" data-ouvert="${x.id}" ${x.ouvert ? 'checked' : ''} style="width:22px;height:22px"> ${x.ouvert ? (x.horaires_sem && Object.keys(x.horaires_sem).length ? 'Commandes activées (selon mes horaires)' : 'Je prends les commandes') : 'Fermé (cochez pour ouvrir)'}</label>` : ''}</div>
      <div class="actions">${x.statut === 'publie' ? `<a class="btn btn-s btn-p" href="#/pro/commandes/${x.id}">Commandes</a>` : ''}<a class="btn btn-s" href="#/pro/menu/${x.id}">${estBoutique(x) ? 'Articles et stock' : 'Ma carte'}</a><a class="btn btn-s" href="#/pro/codes/${x.id}">Promotions</a><a class="btn btn-s" href="#/pro/${estBoutique(x) ? 'boutique' : 'resto'}/${x.id}">Horaires et infos</a>
        ${['brouillon', 'refuse'].includes(x.statut) ? `<button class="btn btn-s btn-p" data-envoi="${x.id}">Envoyer en validation</button>` : ''}
        ${x.statut === 'publie' ? `<button class="btn btn-s" data-pause="${x.id}">Pause</button>` : x.statut === 'pause' ? `<button class="btn btn-s btn-ok" data-reprise="${x.id}">Reprendre</button>` : ''}<a class="btn btn-s" href="#/resto/${x.id}">Voir</a></div></div>`).join('')
      : '<div class="vide-etat"><div class="ico">👩‍🍳</div><h3>Inscrivez votre restaurant ou votre boutique</h3><p class="muted">Gratuit pour démarrer. Nous vérifions chaque commerce (SIRET, hygiène) avant sa mise en ligne.</p><div class="actions" style="justify-content:center"><a class="btn btn-p" href="#/pro/resto/nouveau">Inscrire mon restaurant</a>' + (BOUTIQUES ? '<a class="btn" href="#/pro/boutique/nouveau">🛒 Ouvrir une boutique (boissons, dépannage)</a>' : '') + '</div></div>'}</div>`);
  $('#app').onchange = async ev => { const o = ev.target.closest('[data-ouvert]'); if (!o) return; try { await q(sb.from('restaurants').update({ ouvert: o.checked }).eq('id', o.dataset.ouvert)); toast(o.checked ? 'Vous prenez les commandes.' : 'Fermé aux commandes.'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); } };
  $('#app').onclick = async ev => {
    const rc = ev.target.closest('[data-recu]');
    if (rc) { if (!confirm(`Confirmer avoir reçu ${eur(rc.dataset.montant)} de ce livreur ?`)) return; try { await q(sb.rpc('confirmer_reversement', { livreur: rc.dataset.recu })); toast('Merci, c’est noté.'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); } return; }
    const b = ev.target.closest('[data-envoi],[data-pause],[data-reprise]'); if (!b) return;
    const [rid, st] = b.dataset.envoi ? [b.dataset.envoi, 'en_attente'] : b.dataset.pause ? [b.dataset.pause, 'pause'] : [b.dataset.reprise, 'publie'];
    try { await q(sb.from('restaurants').update({ statut: st }).eq('id', rid)); toast('C’est fait.'); APP.pages.pro(); } catch (err) { toast(erreur(err), true); }
  };
};
async function formResto(id, genre) {
  const neuf = { nom: genre === 'boutique' ? `${profil?.prenom || ''} Dépannage`.trim() : '', cuisine: genre === 'boutique' ? 'boissons' : 'creole', ...(genre === 'boutique' ? { frais_livraison: 2, minimum: 5, genre } : {}) };
  const r = id ? await q(sb.from('restaurants').select('*').eq('id', id).single()) : { description: '', territoire: profil?.territoire || terrPrefere() || 'Martinique', commune: profil?.commune || '', adresse: '', telephone: contact?.telephone || '', horaires: '', livraison: true, frais_livraison: 3, minimum: 10, communes_livrees: [], emporter: true, delai_min: 30, photo: null, statut: 'brouillon', ...neuf };
  let ph = r.photo; const bq = estBoutique(r);
  const types = Object.entries(CUISINES).filter(([k]) => bq ? TYPES_BOUTIQUE.includes(k) : !['boissons', 'epicerie'].includes(k) || k === r.cuisine);
  vue(`<div class="wrap page-pro" style="max-width:960px">${id ? enteteResto(r, 'horaires') : '<a href="#/pro" class="retour-l" style="display:inline-flex">Espace pro</a>'}<h1>${bq ? (id ? 'Ma boutique : horaires et infos' : 'Ouvrir ma boutique') : id ? 'Horaires et infos' : 'Inscrire mon restaurant'}</h1>
    ${bq && !id ? '<p class="muted">Boissons fraîches, glaçons, apéro, petite épicerie, dépannage : les clients remplissent leur panier dans Woulib, vous livrez (ou ils passent prendre). Vous gérez vos articles, vos prix et votre stock.</p>' : ''}
    <form class="f" id="fR"><div class="ligne2"><label>Nom<input name="nom" required minlength="2" maxlength="80" value="${esc(r.nom)}"></label><label>${bq ? 'Type' : 'Cuisine'}<select name="cuisine">${types.map(([k, [i, t]]) => `<option value="${k}" ${k === r.cuisine ? 'selected' : ''}>${i} ${esc(t)}</option>`).join('')}</select></label></div>
      <label>Présentation<textarea name="description" maxlength="1500" placeholder="${bq ? 'Boissons bien fraîches, glaçons, apéro… livrés en 30 minutes' : 'Votre histoire, vos spécialités, vos produits…'}">${esc(r.description)}</textarea></label>
      <div class="ligne3"><label>Territoire<select name="territoire" data-villes="villesR">${optsTerritoires(r.territoire)}</select></label><label>Ville<input name="commune" required maxlength="60" list="villesR" value="${esc(r.commune)}">${listeVilles('villesR', r.territoire)}</label><label>Adresse<input name="adresse" maxlength="200" value="${esc(r.adresse || '')}"></label></div>
      <label>Téléphone du restaurant<input name="telephone" type="tel" pattern="[0-9 +]{6,20}" value="${esc(r.telephone || '')}"></label>
      ${BASE_V2 ? `      <div class="panneau" style="padding:14px"><b>🕒 Horaires d’ouverture</b><p class="aide" style="margin:4px 0 10px">Exemple : « 11:00-14:00, 18:00-22:00 ». Vide = fermé ce jour-là. Woulib ouvre et ferme vos commandes tout seul ;
        en dehors des horaires, vos clients peuvent programmer leur commande. Laissez tout vide pour ouvrir et fermer vous-même.</p>
        <div class="horaires-g">${SEMAINE.map(j => `<label>${JOURS[j]}<input name="h${j}" value="${esc(texteCreneaux(r.horaires_sem?.[j]))}" placeholder="Fermé" autocomplete="off"></label>`).join('')}</div>
        <button type="button" class="btn btn-s" id="copierH" style="margin-top:10px">Copier le lundi sur toute la semaine</button></div>` : `<label>Horaires<input name="horaires" maxlength="200" value="${esc(r.horaires || '')}" placeholder="Lun–Sam 11 h–14 h, 18 h–22 h"></label>`}
      <div class="ligne3"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="livraison" ${r.livraison ? 'checked' : ''} style="width:auto"> 🛵 Je livre</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="emporter" ${r.emporter ? 'checked' : ''} style="width:auto"> 🛍️ À emporter</label><label>Délai moyen (min)<input name="delai_min" type="number" min="5" max="240" value="${r.delai_min}"></label></div>
      <div class="ligne3"><label>Frais de livraison (€)<input name="frais_livraison" type="number" min="0" max="100" step="0.5" value="${r.frais_livraison}"></label><label>Commande minimum (€)<input name="minimum" type="number" min="0" max="500" value="${r.minimum}"></label>
        <label>Villes livrées <span class="aide">(virgules ; vide = toutes)</span><input name="villes" maxlength="400" value="${esc(r.communes_livrees.join(', '))}"></label></div>
      <div class="panneau" style="padding:14px"><label style="display:flex;gap:8px;align-items:flex-start;font-weight:800"><input type="checkbox" name="livreurs_kivora" ${r.livreurs_kivora ? 'checked' : ''} style="width:auto;margin-top:4px">
        <span>🛵 Mes livraisons sont faites par les livreurs Woulib<br><span class="aide" style="font-weight:600">Pas de livreur à embaucher : dès que vous acceptez une commande, les livreurs vérifiés les plus proches sont prévenus. Le client paie le livreur à la livraison ;
        les frais de livraison (2 € minimum) reviennent au livreur, qui vous remet le prix du repas. Woulib tient le compte de ce qu’il vous doit, et vous confirmez la réception.</span></span></label></div>
      <div><b>Photo</b><div id="apercu" style="max-width:240px;margin:8px 0"></div><input type="file" id="ph" accept="image/*"></div>
      <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" required style="width:auto"> ${bq ? 'Mon activité est déclarée (SIRET) ; si je vends de l’alcool, j’ai la licence de vente à emporter et je ne vends jamais à un mineur (pièce d’identité à la remise) ; les prix affichés sont les vrais prix.' : 'Mon activité est déclarée (SIRET) et respecte les règles d’hygiène ; les prix affichés sont les vrais prix.'}</label>
      <div class="actions"><button class="btn btn-p" value="en_attente">${id && r.statut === 'publie' ? 'Enregistrer' : 'Enregistrer et envoyer en validation'}</button>${!id || r.statut !== 'publie' ? '<button class="btn" value="brouillon">Brouillon</button>' : ''}</div></form></div>`);
  const ap = () => { $('#apercu').innerHTML = ph ? `<img src="${esc(photo(ph))}" alt="" style="border-radius:16px">` : ''; }; ap();
  brancherVilles(document.querySelector('#fR [name=territoire]'), 'villesR');
  $('#copierH')?.addEventListener('click', () => { const v = $('#fR').h1.value; SEMAINE.forEach(j => { $('#fR')['h' + j].value = v; }); });
  $('#ph').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; toast('Envoi de la photo…'); try { ph = await envoyerPhoto(f); ap(); } catch (err) { toast(erreur(err), true); } });
  $('#fR').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, d = Object.fromEntries(new FormData(f)), envoi = ev.submitter?.value || 'en_attente';
    if (!d.livraison && !d.emporter) return toast('Choisissez livraison, à emporter ou les deux.', true);
    if (d.livreurs_kivora && d.livraison && (+d.frais_livraison || 0) < 2) return toast('Avec les livreurs Woulib, les frais de livraison doivent être d’au moins 2 € (ils paient le livreur).', true);
    const sem = {};
    for (const j of BASE_V2 ? SEMAINE : []) {
      const t = d['h' + j].trim(); if (!t) continue;
      const l = lireCreneaux(t);
      if (!l) return toast(`${JOURS[j]} : horaires non compris. Écrivez par exemple « 11:00-14:00, 18:00-22:00 ».`, true);
      sem[j] = l;
    }
    const l = { nom: d.nom.trim(), cuisine: d.cuisine, description: d.description.trim(), territoire: d.territoire, commune: d.commune.trim(), adresse: d.adresse.trim() || null, telephone: d.telephone.trim() || null,
      ...(BASE_V2 ? { horaires: Object.keys(sem).length ? null : r.horaires || null, horaires_sem: Object.keys(sem).length ? sem : null } : { horaires: d.horaires?.trim() || null }), livraison: !!d.livraison, emporter: !!d.emporter, delai_min: +d.delai_min, frais_livraison: +d.frais_livraison || 0, minimum: +d.minimum || 0,
      communes_livrees: d.villes.split(',').map(x => x.trim()).filter(Boolean).slice(0, 40), photo: ph, livreurs_kivora: !!(d.livreurs_kivora && d.livraison), ...(bq && !id ? { genre: 'boutique' } : {}) };
    // position du restaurant (pour envoyer les livreurs les plus proches), recalculée si l'adresse change
    if (r.lat == null || l.adresse !== r.adresse || l.commune !== r.commune) {
      const pos = (await geocoder([l.adresse, l.commune].filter(Boolean).join(', '), l.territoire).catch(() => []))[0];
      if (pos) { l.lat = pos.lat; l.lng = pos.lng; }
    }
    if (!(id && r.statut === 'publie')) l.statut = envoi;
    try { if (id) await q(sb.from('restaurants').update(l).eq('id', id)); else { const n = await q(sb.from('restaurants').insert(l).select('id').single()); toast(bq ? 'Boutique créée : ajoutez vos articles !' : 'Restaurant créé : ajoutez votre carte !'); return aller('#/pro/menu/' + n.id); } toast('Enregistré.'); aller('#/pro'); }
    catch (err) { toast(erreur(err), true); }
  });
}
// « 11h-14h30, 18:00 - 22:00 » → [["11:00", "14:30"], ["18:00", "22:00"]] ; null si illisible (après minuit : finir à 24:00)
function lireCreneaux(t) {
  const l = [];
  for (const morceau of t.split(/[,;/]|\s+et\s+/).map(x => x.trim()).filter(Boolean)) {
    const m = morceau.match(/^(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?\s*(?:-|–|à|a)\s*(\d{1,2})\s*(?:[h:.]\s*(\d{2})?)?$/i);
    if (!m) return null;
    const a = `${m[1].padStart(2, '0')}:${m[2] || '00'}`; let b = `${m[3].padStart(2, '0')}:${m[4] || '00'}`;
    if (b === '00:00') b = '24:00';
    if (a > '23:59' || (b > '23:59' && b !== '24:00') || a >= b) return null;
    l.push([a, b]);
  }
  return l.length && l.length <= 3 ? l.sort((x, y) => x[0] < y[0] ? -1 : 1) : null;
}
// catalogue de départ d'une boutique : prix indicatifs, que le vendeur ajuste avant d'ajouter
const DEPART = [['frais', 'Eau minérale 1,5 L', 1.5], ['frais', 'Eau gazeuse 1 L', 1.8], ['frais', 'Soda 33 cl', 1.8], ['frais', 'Jus de fruits local 1 L', 3.5], ['frais', 'Boisson énergisante 25 cl', 2.5],
  ['alcool', 'Bière locale 33 cl', 2.5], ['alcool', 'Pack de 6 bières', 12], ['alcool', 'Rhum agricole blanc 70 cl', 18], ['apero', 'Chips 150 g', 2.5], ['apero', 'Cacahuètes grillées', 2], ['apero', 'Biscuits apéritif', 2.5],
  ['plat', 'Bokit poulet', 6, false], ['plat', 'Accras de morue (10 pièces)', 5, false], ['plat', 'Sandwich jambon-beurre', 4, false], ['plat', 'Salade de fruits frais', 3.5, false],
  ['glace', 'Sachet de glaçons 2 kg', 3], ['glace', 'Glace en pot 500 ml', 5.5], ['epicerie', 'Baguette de pain', 1.2], ['epicerie', 'Lait 1 L', 1.6], ['maison', 'Gobelets (lot de 50)', 3], ['maison', 'Charbon de bois 3 kg', 7], ['maison', 'Papier toilette (lot de 4)', 3.5]];
async function pageMenu(rid, edite) {
  const [r, plats] = await Promise.all([q(sb.from('restaurants').select('*').eq('id', rid).single()), q(sb.from('plats').select('*').eq('restaurant_id', rid).order('ordre').order('created_at'))]);
  const bq = estBoutique(r), CATS = bq ? CATS_BOUTIQUE : CATS_PLAT, depart = DEPART.filter(([, nom]) => !plats.some(p => p.nom.toLowerCase() === nom.toLowerCase()));
  const p0 = plats.find(p => p.id === edite) || { nom: '', prix: '', categorie: bq ? 'frais' : 'plat', description: '', options: [], stock: null };
  vue(`<div class="wrap page-pro" style="max-width:960px">${enteteResto(r, 'carte')}<h1>${bq ? 'Articles et stock' : 'La carte'}</h1>
    ${bq && depart.length ? `<details class="panneau depart" ${plats.length ? '' : 'open'}><summary><b>🚀 Catalogue de départ</b> · cochez, mettez vos prix, ajoutez tout d’un coup</summary>
      <form id="fDepart" class="f"><p class="aide" style="margin:0">Prix indicatifs : remplacez-les par vos vrais prix. Vous pourrez tout modifier ensuite. Plats préparés : seulement si vous respectez les règles d’hygiène (formation HACCP) ; indiquez leurs allergènes.</p>
        <div class="depart-l">${depart.map(([c, nom, prix, coche = true], i) => `<label><input type="checkbox" name="c${i}" ${coche ? 'checked' : ''}><span>${LIB_CAT[c].split(' ')[0]} ${esc(nom)}</span><input type="number" name="p${i}" min="0.5" max="500" step="0.1" value="${prix}" aria-label="Prix de ${esc(nom)}"> €</label>`).join('')}</div>
        <button class="btn btn-p">Ajouter les articles cochés</button></form></details>` : ''}
    ${plats.length ? plats.map(p => `<div class="ligne-l">${p.photo ? `<img class="mini" style="height:72px" src="${esc(photo(p.photo))}" alt="">` : `<div class="mini" style="height:72px;display:grid;place-items:center;font-size:28px">${(LIB_CAT[p.categorie] || '🍽️').split(' ')[0]}</div>`}
      <div><b>${esc(p.nom)}</b> · <span class="prix">${eur(p.prix)}</span> ${p.dispo ? '' : tag(['gris', 'Épuisé'])}${p.majeur ? ' ' + tag(['att', '🔞 18+']) : ''}<div class="muted petit">${esc(CATS[p.categorie] || LIB_CAT[p.categorie] || '')}${p.description ? ' · ' + esc(p.description) : ''}</div>
        ${BOUTIQUES ? (p.allergenes ? `<div class="allerg">${esc(texteAllergenes(p))}</div>` : tag(['att', '⚠️ Allergènes à renseigner'])) : ''}
        ${bq ? `<label class="stock-l">Stock <input type="number" min="0" max="9999" data-stock="${p.id}" value="${p.stock ?? ''}" placeholder="non suivi" aria-label="Stock de ${esc(p.nom)}">${p.stock === 0 ? ' <b style="color:var(--rouge)">épuisé</b>' : ''}</label>` : ''}
        ${p.options?.length ? `<div class="petit">${p.options.map(g => `<b>${esc(g.nom)}</b> : ${esc(g.choix.map(c => c.nom + (Number(c.prix) ? ' +' + eur(c.prix) : '')).join(', '))}`).join(' · ')}</div>` : ''}</div>
      <div class="actions"><button class="btn btn-s" data-modif="${p.id}">✏️ Modifier</button><button class="btn btn-s ${p.dispo ? '' : 'btn-ok'}" data-dispo="${p.id}" data-v="${!p.dispo}">${p.dispo ? 'Épuisé' : 'Disponible'}</button><button class="btn btn-s btn-ko" data-suppr="${p.id}" aria-label="Retirer ${esc(p.nom)}">×</button></div></div>`).join('') : `<p class="muted">${bq ? 'Aucun article pour l’instant.' : 'Aucun plat pour l’instant.'}</p>`}
    <form class="f panneau" id="fP" style="margin-top:16px"><h2 style="margin:0">${edite ? 'Modifier · ' + esc(p0.nom) : bq ? 'Ajouter un article' : 'Ajouter un plat'}</h2>
      <div class="ligne3"><label>Nom<input name="nom" required minlength="2" maxlength="80" placeholder="${bq ? 'Eau 1,5 L' : 'Colombo de poulet'}" value="${esc(p0.nom)}"></label><label>Prix (€)<input name="prix" type="number" min="0.5" max="500" step="${bq ? '0.1' : '0.5'}" required value="${esc(p0.prix)}"></label><label>${bq ? 'Rayon' : 'Catégorie'}<select name="categorie">${Object.entries(CATS).map(([k, t]) => `<option value="${k}" ${k === p0.categorie ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <label>Description <span class="aide">(facultatif)</span><input name="description" maxlength="400" placeholder="${bq ? 'Bien fraîche' : 'Riz, légumes pays, sauce chien'}" value="${esc(p0.description || '')}"></label>
      ${bq ? `<label>Stock <span class="aide">(facultatif : vide = pas de suivi ; à 0, l’article s’affiche épuisé)</span><input name="stock" type="number" min="0" max="9999" value="${p0.stock ?? ''}"></label><p class="aide" style="margin:0">🔞 Les articles du rayon « Bières et alcools » sont réservés aux majeurs : âge contrôlé à la remise.</p>` : ''}
      ${BOUTIQUES ? `<fieldset class="allerg-f"><legend><b>Allergènes présents</b> <span class="aide">(obligatoire pour vendre à distance : les 14 allergènes majeurs)</span></legend>
        <div class="puces-c">${Object.entries(ALLERGENES).map(([k, t]) => `<label><input type="checkbox" name="al_${k}" ${p0.allergenes?.includes(k) ? 'checked' : ''}> ${t}</label>`).join('')}</div>
        <label class="aucun"><input type="checkbox" name="al_aucun" ${Array.isArray(p0.allergenes) && !p0.allergenes.length ? 'checked' : ''}> Aucun des 14 allergènes</label></fieldset>` : ''}
      <div ${BASE_V2 && !bq ? '' : 'hidden'}><b>Choix et suppléments</b> <span class="aide">(facultatif : accompagnement au choix, cuisson, sauce, suppléments payants…)</span><div id="groupes">${(p0.options || []).map(blocGroupe).join('')}</div>
        <button type="button" class="btn btn-s" id="ajG">+ Ajouter un choix</button></div>
      <label>Photo <span class="aide">(facultatif${edite && p0.photo ? ' : laissez vide pour garder la photo actuelle' : ''})</span><input type="file" name="fichier" accept="image/*"></label>
      <div class="actions"><button class="btn btn-p">${edite ? 'Enregistrer' : '+ Ajouter à la carte'}</button>${edite ? '<button type="button" class="btn" id="annulerP">Annuler</button>' : ''}</div></form></div>`);
  if (edite) $('#fP').scrollIntoView({ block: 'start' });
  $('#ajG').addEventListener('click', () => { if ($('#groupes').children.length >= 8) return toast('8 choix au maximum par plat.', true); $('#groupes').insertAdjacentHTML('beforeend', blocGroupe()); });
  $('#annulerP')?.addEventListener('click', () => pageMenu(rid));
  $('#fP').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, d = Object.fromEntries(new FormData(f));
    const options = [];
    for (const g of f.querySelectorAll('[data-g]')) {
      const nom = g.querySelector('[name=gnom]').value.trim(), choix = lireChoix(g.querySelector('[name=gchoix]').value), [, mi, ma] = TYPES_G[g.querySelector('[name=gtype]').value];
      if (!nom && !choix.length) continue;
      if (!nom || !choix.length) return toast('Chaque choix demande un titre et au moins une possibilité.', true);
      if (choix.some(c => !(c.prix >= 0 && c.prix <= 100))) return toast(`« ${nom} » : supplément entre 0 et 100 €.`, true);
      options.push({ nom: nom.slice(0, 40), min: mi, max: ma || Math.min(20, choix.length), choix: choix.slice(0, 20) });
    }
    const b = f.querySelector('.btn-p'); b.disabled = true;
    try {
      const al = Object.keys(ALLERGENES).filter(k => d['al_' + k]);
      if (BOUTIQUES && al.length && d.al_aucun) { b.disabled = false; return toast('Choisissez des allergènes ou « Aucun », pas les deux.', true); }
      const l = { nom: d.nom.trim(), prix: +d.prix, categorie: d.categorie, description: d.description.trim() || null, ...(BASE_V2 ? { options } : {}), ...(bq ? { stock: d.stock === '' ? null : +d.stock } : {}),
        ...(BOUTIQUES ? { allergenes: al.length ? al : d.al_aucun ? [] : null } : {}) };
      if (f.fichier.files[0]) l.photo = await envoyerPhoto(f.fichier.files[0]);
      if (edite) await q(sb.from('plats').update(l).eq('id', edite)); else await q(sb.from('plats').insert({ ...l, restaurant_id: rid, ordre: plats.length }));
      toast(edite ? (bq ? 'Article modifié.' : 'Plat modifié.') : bq ? 'Article ajouté.' : 'Plat ajouté.'); pageMenu(rid);
    } catch (err) { toast(/options_valides/.test(err.message) ? 'Choix invalides : vérifiez les titres et les prix.' : erreur(err), true); b.disabled = false; }
  });
  $('#fDepart')?.addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, b = f.querySelector('.btn-p');
    const l = depart.map(([c, nom], i) => f['c' + i].checked ? { restaurant_id: rid, nom, categorie: c, prix: Number(f['p' + i].value), ordre: plats.length + i } : null).filter(Boolean);
    if (!l.length) return toast('Cochez au moins un article.', true);
    if (l.some(x => !(x.prix >= 0.5 && x.prix <= 500))) return toast('Chaque prix doit être entre 0,50 € et 500 €.', true);
    b.disabled = true;
    try { await q(sb.from('plats').insert(l)); toast(`${l.length} articles ajoutés : vérifiez vos prix et votre stock.`); pageMenu(rid); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  });
  $('#app').onchange = async ev => {
    const st = ev.target.closest('[data-stock]'); if (!st) return;
    try { await q(sb.from('plats').update({ stock: st.value === '' ? null : Math.max(0, Math.min(9999, +st.value)) }).eq('id', st.dataset.stock)); toast('Stock enregistré.'); } catch (err) { toast(erreur(err), true); }
  };
  $('#app').onclick = async ev => {
    const d = ev.target.closest('[data-dispo]'), s = ev.target.closest('[data-suppr]'), m = ev.target.closest('[data-modif]'), rg = ev.target.closest('[data-retirer-g]');
    if (m) return pageMenu(rid, m.dataset.modif);
    if (rg) return rg.closest('[data-g]').remove();
    try {
      if (d) { await q(sb.from('plats').update({ dispo: d.dataset.v === 'true' }).eq('id', d.dataset.dispo)); pageMenu(rid); }
      if (s && confirm(bq ? 'Retirer cet article ?' : 'Retirer ce plat de la carte ?')) { await q(sb.from('plats').delete().eq('id', s.dataset.suppr)); pageMenu(rid); }
    } catch (err) { toast(erreur(err), true); }
  };
}
// éditeur des choix d'un plat : un titre, un type, une possibilité par ligne (« Frites +1,50 »)
const TYPES_G = { un: ['1 choix obligatoire', 1, 1], unf: ['1 choix facultatif', 0, 1], plus: ['Plusieurs choix facultatifs', 0, 0] };
const lireChoix = t => t.split('\n').map(x => x.trim()).filter(Boolean).map(x => { const m = x.match(/^(.*?)\s*(?:\+\s*(\d+(?:[.,]\d{1,2})?)\s*€?)?$/); return { nom: m[1].trim().slice(0, 60), prix: m[2] ? Number(m[2].replace(',', '.')) : 0 }; }).filter(c => c.nom);
const blocGroupe = (g = { nom: '', min: 1, max: 1, choix: [] }) => `<div class="panneau groupe-opt" data-g>
  <div class="ligne2"><label>Titre<input name="gnom" maxlength="40" value="${esc(g.nom)}" placeholder="Accompagnement, Sauce, Suppléments…"></label>
    <label>Type<select name="gtype">${Object.entries(TYPES_G).map(([k, [t]]) => `<option value="${k}" ${(g.max === 1 ? (g.min ? 'un' : 'unf') : 'plus') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label></div>
  <label>Possibilités <span class="aide">(une par ligne ; prix en plus après « + », ex. « Frites +1,50 »)</span><textarea name="gchoix" rows="3" placeholder="Riz&#10;Frites +1,50">${esc(g.choix.map(c => c.nom + (Number(c.prix) ? ' +' + String(c.prix).replace('.', ',') : '')).join('\n'))}</textarea></label>
  <button type="button" class="btn btn-s btn-ko" data-retirer-g>Retirer ce choix</button></div>`;

// tableau de bord du restaurateur
async function pageStats(rid) {
  const [r, s] = await Promise.all([q(sb.from('restaurants').select('*').eq('id', rid).single()), q(sb.rpc('stats_resto', { rid }))]);
  const tuile = (t, v, sous) => `<div class="panneau stat"><span class="petit muted">${t}</span><b>${v}</b>${sous ? `<span class="petit muted">${sous}</span>` : ''}</div>`;
  vue(`<div class="wrap page-pro" style="max-width:960px">${enteteResto(r, 'stats')}<h1>Statistiques</h1>
    <p class="muted">Ventes des repas après codes promo, hors frais de livraison et pourboires, pour les commandes livrées ou retirées.</p>
    <div class="stats">${tuile('Aujourd’hui', eur(s.jour.ventes), `${s.jour.nb} commande${s.jour.nb > 1 ? 's' : ''}`)}${tuile('7 jours', eur(s.semaine.ventes), `${s.semaine.nb} commande${s.semaine.nb > 1 ? 's' : ''}`)}
      ${tuile('30 jours', eur(s.mois.ventes), `${s.mois.nb} commande${s.mois.nb > 1 ? 's' : ''}`)}${tuile('Panier moyen', eur(s.panier_moyen), 'sur 30 jours')}${tuile('Refusées ou annulées', s.annulees, 'sur 30 jours')}</div>
    <h2>🏆 Les plus vendus (30 jours)</h2>${s.top.length ? `<div class="types">${s.top.map((x, i) => `<div class="type"><span><b>${i + 1}.</b> ${esc(x.nom)}</span><span class="petit">${x.quantite} vendu${x.quantite > 1 ? 's' : ''} · <b>${eur(x.ventes)}</b></span></div>`).join('')}</div>`
      : '<p class="muted">Pas encore de vente sur les 30 derniers jours.</p>'}</div>`);
}
// ---------------------------------------------------------------- espace restaurateur (maquette « Espace restaurateur ») : en-tête, onglets, commandes en colonnes
const ONGLETS_PRO = r => [['commandes', 'Commandes', '#/pro/commandes/' + r.id], ['carte', estBoutique(r) ? 'Articles et stock' : 'Carte', '#/pro/menu/' + r.id], ['horaires', 'Horaires et infos', '#/pro/resto/' + r.id],
  ['promotions', 'Promotions', '#/pro/codes/' + r.id], ['avis', 'Avis', '#/pro/avis/' + r.id], ['stats', 'Statistiques', '#/pro/stats/' + r.id], ['commissions', 'Commissions', '#/pro/commissions']];
function enteteResto(r, actif) {
  const e = etatOuverture(r), pause = r.pause_jusqu_a && new Date(r.pause_jusqu_a) > new Date();
  const etat = r.statut !== 'publie' ? tag(ST_RESTO[r.statut]) : `<span class="etat-pill ${e.ouvert ? 'ok' : ''}"><i aria-hidden="true"></i>${esc(e.ouvert ? 'Ouvert' + (e.ferme ? ' · ferme à ' + hFr(e.ferme) : '') : r.ouvert ? etatTexte(r, e).split(' · ')[0] : 'Commandes coupées')}</span>`;
  return `<header class="pro-tete"><div class="pro-id"><span class="muted petit">Espace pro</span><b>${esc(r.nom)}</b></div>${etat}
    <div class="pro-actions">${r.statut === 'publie' && r.ouvert && 'pause_jusqu_a' in r ? `<button type="button" class="btn btn-s" data-pause-r="${r.id}" data-min="${pause ? 0 : 30}">${pause ? 'Je rouvre maintenant' : 'Je ferme 30 min'}</button>` : ''}
      <button type="button" class="btn btn-s" data-epuise="${r.id}">${estBoutique(r) ? 'Article épuisé' : 'Produit épuisé'}</button></div></header>
    <nav class="onglets-s pro-onglets" aria-label="Espace pro">${ONGLETS_PRO(r).map(([k, t, h]) => `<a href="${h}" class="${k === actif ? 'on' : ''}" ${k === actif ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}
// « Je ferme 30 min » (la base refuse les commandes immédiates pendant la pause : espace_pro.sql) et « Produit épuisé »
document.addEventListener('click', async e => {
  const p = e.target.closest('[data-pause-r]'), ep = e.target.closest('[data-epuise]');
  if (p) {
    p.disabled = true;
    try { const fin = await q(sb.rpc('pause_resto', { rid: p.dataset.pauseR, minutes: Number(p.dataset.min) })); oublier('resto'); oublier('acc-');
      toast(fin ? `Pause jusqu’à ${heure(fin)} : les clients peuvent programmer une commande pour après.` : 'Vous reprenez les commandes.'); rendre(); }
    catch (err) { toast(/pause_resto|function|fonction/i.test(err.message || '') ? 'La pause courte arrive très bientôt. En attendant, coupez les commandes depuis l’accueil de votre espace pro.' : erreur(err), true); p.disabled = false; }
  }
  if (ep) ouvrirEpuise(ep.dataset.epuise).catch(err => toast(erreur(err), true));
});
async function ouvrirEpuise(rid) {
  const plats = await q(sb.from('plats').select('id, nom, dispo').eq('restaurant_id', rid).order('ordre').order('created_at'));
  const d = document.createElement('dialog'); d.className = 'feuille'; d.setAttribute('aria-labelledby', 'tEp');
  d.innerHTML = `<h2 id="tEp">Ce qui est disponible</h2><p class="muted petit">Décochez ce qui est épuisé : il disparaît tout de suite de la carte. Recochez quand il revient.</p>
    <div class="choix-l">${plats.map(p => `<label><input type="checkbox" data-dispo="${p.id}" ${p.dispo ? 'checked' : ''}><span>${esc(p.nom)}</span></label>`).join('') || '<p class="muted">Aucun produit pour l’instant.</p>'}</div>
    <button type="button" class="btn btn-plein" data-fermer style="margin-top:14px">Fermer</button>`;
  document.body.append(d); d.showModal();
  d.addEventListener('change', async ev => {
    const c = ev.target.closest('[data-dispo]'); if (!c) return;
    try { await q(sb.from('plats').update({ dispo: c.checked }).eq('id', c.dataset.dispo)); oublier('resto'); oublier('acc-'); toast(c.checked ? 'De nouveau disponible.' : 'Marqué épuisé.'); }
    catch (err) { toast(erreur(err), true); c.checked = !c.checked; }
  });
  d.addEventListener('click', ev => { if (ev.target.closest('[data-fermer]') || ev.target === d) d.close(); });
  d.addEventListener('close', () => { d.remove(); if (/^#\/pro\/(menu|commandes)/.test(location.hash)) rendre(); });
}
// alerte sonore d'une nouvelle commande : à activer d'un geste (les navigateurs l'exigent), retenue sur cet appareil
let sonCtx = null;
const sonPro = v => { try { if (v !== undefined) localStorage.setItem('wlSonPro', v ? '1' : '0'); return localStorage.getItem('wlSonPro') === '1'; } catch (e) { return false; } };
function bip(n = 2) {
  try {
    sonCtx ??= new (window.AudioContext || window.webkitAudioContext)(); if (sonCtx.state === 'suspended') sonCtx.resume();
    for (let i = 0; i < n; i++) {
      const o = sonCtx.createOscillator(), g = sonCtx.createGain(), t = sonCtx.currentTime + i * 0.35;
      o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(sonCtx.destination); o.start(t); o.stop(t + 0.32);
    }
  } catch (e) { /* son indisponible : la vibration et le message restent */ }
}
// étapes proposées au restaurateur (la base n'accepte que celles-ci : changer_commande)
const ACTIONS_CMD = (c, bq, livreurWoulib) => ({
  envoyee: [['acceptee', 'Accepter', 'btn-p'], ['refusee', 'Refuser', '']], acceptee: [['en_preparation', bq ? 'Je prépare' : 'En cuisine', 'btn-n'], ['annulee', 'Annuler', 'btn-ko']],
  en_preparation: [['prete', 'Marquer prête', 'btn-n']], prete: c.mode === 'emporter' ? [['retiree', 'Remise au client', 'btn-n']] : livreurWoulib ? [] : [['en_livraison', 'Partie en livraison', 'btn-n']],
  en_livraison: livreurWoulib ? [] : [['livree', 'Livrée', 'btn-n']] }[c.statut] || []);
async function pageCommandesPro(rid) {
  const mes = await q(sb.from('restaurants').select('*').eq('owner', moi.id).order('created_at'));
  if (!mes.length) return aller('#/pro');
  const r0 = mes.find(x => x.id === rid) || mes[0], ids = rid ? [r0.id] : mes.map(x => x.id);   // sans restaurant précisé : toutes les commandes du compte
  let connues = null;
  const dessiner = async () => {
    const [l, lvs, r] = await Promise.all([q(sb.from('commandes').select('*, commande_lignes(*)').in('restaurant_id', ids).gte('created_at', new Date(Date.now() - 36 * 36e5).toISOString()).order('created_at')),
      q(sb.rpc('livraisons_resto')).catch(() => []), q(sb.from('restaurants').select('*').eq('id', r0.id).single()).catch(() => r0)]);
    if (!location.hash.startsWith('#/pro/commandes')) return;
    const lvDe = c => lvs.find(x => x.commande_id === c.id && !['annulee', 'echec'].includes(x.statut));
    const nouvelles = l.filter(c => c.statut === 'envoyee');
    if (connues && nouvelles.some(c => !connues.has(c.id))) { toast('Nouvelle commande !'); try { navigator.vibrate?.([120, 80, 120]); } catch (e) { /* facultatif */ } if (sonPro()) bip(); }
    connues = new Set(l.map(c => c.id));
    const bqDe = c => estBoutique(mes.find(x => x.id === c.restaurant_id));
    const infoLv = v => !v ? '' : v.livreur ? `<span class="petit">Livreur : <b>${esc(v.livreur)}</b> (${esc(v.vehicule)}) · ${{ acceptee: 'en route vers vous', au_restaurant: 'est au restaurant', recuperee: 'en livraison', livree: 'livrée' }[v.statut] || ''}${v.telephone ? ` · <a href="tel:${esc(v.telephone)}">${esc(v.telephone)}</a>` : ''}</span>`
      : '<span class="petit">Recherche d’un livreur Woulib…</span>';
    const carteC = c => { const v = lvDe(c), bq = bqDe(c), actions = ACTIONS_CMD(c, bq, !!v); return `<article class="kb-carte ${c.statut === 'envoyee' ? 'nouvelle' : ''}">
      <div class="kb-t"><b>n° ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(c.client_nom)}</b><span>${esc(heure(c.created_at))}</span></div>
      ${c.statut === 'acceptee' ? tag(ST_CMD.acceptee) : ''}${c.pour_heure ? `<span class="tag att">⏰ Pour ${esc(jourHeure(c.pour_heure))}</span>` : ''}${c.majeur ? '<span class="tag ko">18+ : contrôlez une pièce d’identité à la remise</span>' : ''}
      <ul class="kb-l">${c.commande_lignes.map(x => `<li><b>${x.quantite} ×</b> ${esc(x.nom)}${x.options ? ` <span class="muted">· ${esc(x.options)}</span>` : ''}${x.note ? ` <i>(${esc(x.note)})</i>` : ''}</li>`).join('')}</ul>${c.note ? `<p class="petit">Note : ${esc(c.note)}</p>` : ''}
      <div class="kb-m"><span class="kb-mode ${c.mode === 'livraison' ? 'liv' : 'emp'}">${c.mode === 'livraison' ? 'Livraison' : 'À emporter'}</span><b>${eur(c.total)}</b></div>
      <span class="petit muted">${c.mode === 'livraison' ? `${esc(c.adresse)}, ${esc(c.commune)}` : 'À retirer sur place'} · <a href="${wa(c.telephone, 'Bonjour, ici le restaurant pour votre commande ' + c.id.slice(0, 6).toUpperCase() + ' (Woulib).')}" target="_blank" rel="noopener">${esc(c.telephone)}</a>
        ${Number(c.remise) ? ` · code ${esc(c.code_promo)} −${eur(c.remise)}` : ''}${Number(c.pourboire) ? ` · dont ${eur(c.pourboire)} de pourboire livreur` : ''}</span>
      ${infoLv(v)}${actions.length ? `<div class="kb-actions">${actions.map(([s, t, cl]) => `<button type="button" class="btn btn-s ${cl}" data-cmd="${c.id}" data-st="${s}">${t}</button>`).join('')}</div>` : ''}</article>`; };
    const col = (titre, liste, vide) => `<section class="kb-col" aria-label="${titre}"><h2>${titre} <span>${liste.length}</span></h2>${liste.length ? liste.map(carteC).join('') : `<p class="kb-vide">${vide}</p>`}</section>`;
    const livre = mes.some(x => ids.includes(x.id) && x.livraison), finies = l.filter(c => ['livree', 'retiree', 'refusee', 'annulee'].includes(c.statut)).reverse();
    vue(`<div class="wrap page-pro">${enteteResto(r, 'commandes')}
      ${mes.length > 1 ? `<div class="puces" role="group" aria-label="Établissement"><a href="#/pro/commandes" class="${rid ? '' : 'on'}">Tous</a>${mes.map(x => `<a href="#/pro/commandes/${x.id}" class="${x.id === rid ? 'on' : ''}">${esc(x.nom)}</a>`).join('')}</div>` : ''}
      <div class="kb-barre"><p class="muted petit">Mise à jour toutes les 10 secondes : gardez cette page ouverte pendant le service.${sonPro() ? ' Une alerte sonore signale chaque nouvelle commande.' : ''}</p>
        <button type="button" class="btn btn-s" data-son aria-pressed="${sonPro()}">${sonPro() ? 'Couper le son' : 'Activer le son'}</button></div>
      <div class="kanban">${col('Nouvelles', nouvelles, 'Aucune nouvelle commande.')}${col('En préparation', l.filter(c => ['acceptee', 'en_preparation'].includes(c.statut)), 'Rien en cuisine.')}
        ${col('Prêtes', l.filter(c => c.statut === 'prete'), 'Rien en attente.')}${livre ? col('En livraison', l.filter(c => c.statut === 'en_livraison'), 'Rien en route.') : ''}</div>
      ${finies.length ? `<details class="kb-fini"><summary>Terminées depuis hier (${finies.length})</summary><div class="liste-g">${finies.map(c => `<div class="menu-l"><div><b>n° ${esc(c.id.slice(0, 6).toUpperCase())} · ${esc(c.client_nom)}</b><small>${esc(jourHeure(c.created_at))} · ${eur(c.total)}</small></div>${tag(ST_CMD[c.statut])}</div>`).join('')}</div></details>` : ''}
      <p class="petit muted">Le prix, la commission et les étapes sont calculés et vérifiés par le serveur. Le client est prévenu à chaque étape.</p></div>`);
  };
  await dessiner();
  $('#app').onclick = async ev => {
    if (ev.target.closest('[data-son]')) { const on = !sonPro(); sonPro(on); if (on) bip(1); return dessiner(); }
    const b = ev.target.closest('[data-cmd]'); if (!b) return;
    if (['refusee', 'annulee'].includes(b.dataset.st) && !confirm(b.dataset.st === 'refusee' ? 'Refuser cette commande ? Le client est prévenu.' : 'Annuler cette commande ? Le client est prévenu.')) return;
    b.disabled = true;
    try { await q(sb.rpc('changer_commande', { cmd: b.dataset.cmd, nouveau: b.dataset.st })); await dessiner(); } catch (err) { toast(erreur(err), true); b.disabled = false; }
  };
  clearInterval(suivi); suivi = setInterval(() => { if (location.hash.startsWith('#/pro/commandes') && !document.hidden && !enSaisie()) dessiner().catch(() => {}); }, 10000);
}
// avis des clients (vérifiés : laissés après une commande reçue)
async function pageAvisPro(rid) {
  const [r, l] = await Promise.all([q(sb.from('restaurants').select('*').eq('id', rid).single()), q(sb.from('avis_resto').select('note, texte, created_at').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(100))]);
  const moy = l.length ? l.reduce((t, x) => t + x.note, 0) / l.length : 0;
  vue(`<div class="wrap page-pro">${enteteResto(r, 'avis')}<h1>Avis</h1>
    ${l.length ? `<p><b>★ ${moy.toFixed(1).replace('.', ',')}</b> · ${l.length} avis vérifié${l.length > 1 ? 's' : ''}, laissé${l.length > 1 ? 's' : ''} après une commande reçue</p>
      <div class="liste-g">${l.map(x => `<div class="avis-l"><b aria-label="Note : ${x.note} sur 5">${'★'.repeat(x.note)}${'☆'.repeat(5 - x.note)}</b><span class="muted petit">${esc(jourHeure(x.created_at))}</span>${x.texte ? `<p>${esc(x.texte)}</p>` : ''}</div>`).join('')}</div>`
      : '<div class="vide-etat"><h3>Pas encore d’avis</h3><p class="muted">Vos clients peuvent vous noter une fois leur commande reçue. Les avis sont vérifiés : impossible d’en laisser un sans avoir commandé.</p></div>'}</div>`);
}
// commissions de la plateforme (ce qui est dû, réglé une fois par mois)
async function pageCommissionsPro() {
  const mes = await q(sb.from('restaurants').select('*').eq('owner', moi.id).order('created_at'));
  const cm = await blocCommission();
  vue(`<div class="wrap page-pro">${mes[0] ? enteteResto(mes[0], 'commissions') : ''}<h1>Commissions</h1>
    ${cm ? cm.replace('<details class="panneau commission">', '<details class="panneau commission" open>') : '<div class="vide-etat"><h3>Rien pour l’instant</h3><p class="muted">La commission apparaît ici après vos premières ventes. Vos clients vous paient directement ; la commission se règle une fois par mois.</p></div>'}</div>`);
}

async function pageCodes(rid) {
  const [r, l] = await Promise.all([q(sb.from('restaurants').select('*').eq('id', rid).single()), q(sb.from('codes_resto').select('*').eq('restaurant_id', rid).order('created_at', { ascending: false }))]);
  vue(`<div class="wrap page-pro" style="max-width:960px">${enteteResto(r, 'promotions')}<h1>Promotions : codes promo</h1>
    <p class="muted">Partagez un code sur vos réseaux : le client le saisit dans son panier. La remise est à votre charge ; chaque client ne peut l’utiliser qu’une fois.</p>
    ${l.length ? l.map(k => `<div class="ligne-l" style="grid-template-columns:minmax(0,1fr) auto;${k.actif ? '' : 'opacity:.55'}"><div><b class="mono" style="font-size:18px">${esc(k.code)}</b> · ${k.type === 'pct' ? `−${Number(k.valeur)} %` : `−${eur(k.valeur)}`}
      <div class="muted petit">${Number(k.minimum) ? `dès ${eur(k.minimum)} · ` : ''}${k.expire_le ? `jusqu’au ${esc(new Date(k.expire_le + 'T12:00').toLocaleDateString('fr-FR'))} · ` : ''}${k.utilisations} utilisation(s)${k.max_utilisations ? ' / ' + k.max_utilisations : ''}</div></div>
      <button class="btn btn-s ${k.actif ? 'btn-ko' : 'btn-ok'}" data-code="${k.id}" data-actif="${!k.actif}">${k.actif ? 'Désactiver' : 'Réactiver'}</button></div>`).join('') : '<p class="muted">Aucun code pour l’instant.</p>'}
    <form class="f panneau" id="fCode" style="margin-top:16px"><h2 style="margin:0">Nouveau code</h2>
      <div class="ligne3"><label>Code<input name="code" required pattern="[A-Za-z0-9]{3,20}" placeholder="BIENVENUE10" style="text-transform:uppercase"></label><label>Type<select name="type"><option value="pct">Pourcentage (%)</option><option value="eur">Montant (€)</option></select></label>
        <label>Valeur<input name="valeur" type="number" min="0.5" max="90" step="0.5" required value="10"></label></div>
      <div class="ligne3"><label>Commande minimum (€)<input name="minimum" type="number" min="0" step="0.5" value="0"></label><label>Valable jusqu’au <span class="aide">(facultatif)</span><input name="expire_le" type="date"></label>
        <label>Nombre max. d’utilisations <span class="aide">(facultatif)</span><input name="max" type="number" min="1"></label></div><button class="btn btn-p">Créer le code</button></form></div>`);
  $('#fCode').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try { await q(sb.from('codes_resto').insert({ restaurant_id: rid, code: d.code.trim().toUpperCase(), type: d.type, valeur: +d.valeur, minimum: +d.minimum || 0, expire_le: d.expire_le || null, max_utilisations: d.max ? +d.max : null })); toast('Code créé.'); pageCodes(rid); }
    catch (err) { toast(/duplicate|unique/i.test(err.message) ? 'Ce code existe déjà.' : erreur(err), true); }
  });
  $('#app').onclick = async e => { const b = e.target.closest('[data-code]'); if (!b) return; try { await q(sb.from('codes_resto').update({ actif: b.dataset.actif === 'true' }).eq('id', b.dataset.code)); pageCodes(rid); } catch (err) { toast(erreur(err), true); } };
}
