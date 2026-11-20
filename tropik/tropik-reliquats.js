/* Tropik — reliquats de la matrice (19/11/2026) : facture ou reçu imprimable (#/facture/<id>), mes données et suppression du compte
   (#/mes-donnees), import d'un tableau de produits par le vendeur (#/import-produits), aperçu rapide d'un produit, rappel du panier
   laissé, langue de l'interface (FR, EN, ES : menus et boutons ; les annonces restent dans la langue du vendeur), bouton Google.
   Tout est dans une fonction : aucun nom global ajouté. Les montants viennent de la base (tk_facture, tk_fiche). Base : tropik3.sql
   (facture, export), caché tant que tk_version() < 3. Chargé AVANT tropik-ui.js (qui démarre l'appli). */
(() => {
  'use strict';
  const eurF = n => Number(n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  const dateF = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Martinique' }) : '';
  let version = null;
  const v3 = () => version || (version = q(sb.rpc('tk_version')).then(v => Number(v) >= 3, () => false));

  // ---------------------------------------------------------------- facture ou reçu
  APP.pages.facture = async id => {
    if (!exigeCompte()) return;
    attente();
    if (!(await v3())) return vue('<div class="wrap tk"><div class="vide-etat"><h3>Bientôt disponible</h3><a class="btn btn-p" href="#/commandes">Mes commandes</a></div></div>');
    let f;
    try { f = await q(sb.rpc('tk_facture', { c: id })); } catch (e) { return vue(`<div class="wrap tk"><div class="vide-etat"><h3>Document indisponible</h3><p class="muted">${esc(erreur(e))}</p><a class="btn btn-p" href="#/commandes">Mes commandes</a></div></div>`); }
    const titre = { facture: 'Facture', recu: 'Reçu de vente entre particuliers', bon_commande: 'Bon de commande' }[f.document], v = f.vendeur;
    vue(`<div class="wrap tk tk-facture"><p class="no-print"><a href="#/commande/${esc(id)}">‹ Retour à la commande</a></p>
      <section class="carte doc-f"><div class="doc-tete"><div><p class="petit muted" style="margin:0">Tropik · commande n° ${esc(f.numero)}</p><h1 style="margin:4px 0">${titre} n° TK-${esc(f.numero)}</h1>
        <p class="petit" style="margin:0">Commande du ${esc(dateF(f.date))}${f.remise_le ? ' · remise le ' + esc(dateF(f.remise_le)) : ''}</p></div></div>
        <div class="doc-parties"><div><h2>Vendeur</h2><p><b>${esc(v.nom)}</b><br>${v.type === 'professionnel' ? `${esc(v.adresse || '')}${v.commune ? ', ' + esc(v.commune) : ''}<br>SIRET ${esc(v.siret || '')}${v.telephone ? '<br>Tél. ' + esc(v.telephone) : ''}` : `Particulier${v.commune ? ', ' + esc(v.commune) : ''}`}</p></div>
          <div><h2>Client</h2><p><b>${esc(f.client.nom)}</b>${f.client.adresse ? '<br>' + esc(f.client.adresse) : ''}</p></div></div>
        <div class="defile"><table class="tab-f"><thead><tr><th>Article</th><th>Taille, couleur</th><th class="n">Qté</th><th class="n">Prix unitaire</th><th class="n">Total</th></tr></thead>
          <tbody>${f.lignes.map(l => `<tr><td>${esc(l.titre)}</td><td>${esc(l.taille)}, ${esc(l.couleur)}</td><td class="n">${l.qte}</td><td class="n">${eurF(l.prix_unitaire)}</td><td class="n">${eurF(l.total)}</td></tr>`).join('')}</tbody></table></div>
        <div class="doc-totaux"><div><span>Articles</span><span>${eurF(f.sous_total)}</span></div><div><span>${f.mode === 'retrait' ? 'Retrait' : 'Livraison'}</span><span>${f.frais ? eurF(f.frais) : 'Gratuit'}</span></div>
          <div class="gros"><span>Total TTC</span><b>${eurF(f.total)}</b></div></div>
        <p class="petit muted">${f.document === 'facture' ? 'Facture établie par le vendeur, seul responsable de la vente et des mentions fiscales qui lui sont propres. Paiement à la remise. '
          : f.document === 'bon_commande' ? 'La facture sera disponible ici après la remise de la commande. ' : 'Vente entre particuliers : pas de TVA, pas de garantie légale de conformité ni de droit de rétractation. '}
          Tropik (IloTech) met en relation acheteurs et vendeurs et n’est pas partie à la vente.</p>
        <p class="actions-r no-print"><button class="btn btn-p" type="button" data-act="imprimer">Imprimer ou enregistrer en PDF</button></p></section></div>`);
    $('#app').onclick = e => { if (e.target.closest('[data-act=imprimer]')) window.print(); };
  };

  // ---------------------------------------------------------------- mes données, suppression du compte (fonctions communes de commun/compte.sql)
  APP.pages['mes-donnees'] = async () => {
    if (!exigeCompte()) return;
    vue(`<div class="wrap tk"><h1>Mes données</h1>
      <section class="carte"><h2>Télécharger mes données</h2><p class="muted">Un fichier avec tout ce que nous gardons sur vous : compte, profil, commandes, favoris, avis, boutique et ventes.</p>
        <button class="btn btn-p" type="button" data-act="export">Télécharger (fichier JSON)</button></section>
      <section class="carte"><h2>Supprimer mon compte</h2><p class="muted">Votre demande est traitée sous 30 jours. Les commandes en cours doivent être terminées ; les factures sont gardées le temps exigé par la loi.</p>
        <form class="f" id="fSupp"><label>Motif <span class="aide">(facultatif)</span><textarea name="motif" maxlength="500" rows="3"></textarea></label><button class="btn btn-sec">Demander la suppression</button></form></section>
      <p class="petit"><a href="cgu.html">Conditions et confidentialité</a></p></div>`);
    $('#app').onclick = async e => {
      if (!e.target.closest('[data-act=export]')) return;
      try {
        const d = await q(sb.rpc((await v3()) ? 'tk_mes_donnees' : 'mes_donnees'));
        const u = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), a = document.createElement('a');
        a.href = u; a.download = 'mes-donnees-tropik.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
        toast('Fichier téléchargé.');
      } catch (err) { toast(erreur(err), true); }
    };
    $('#app').onsubmit = async e => {
      e.preventDefault(); const b = e.target.querySelector('button'); b.disabled = true;
      try { const r = await q(sb.rpc('demander_suppression', { motif_s: e.target.motif.value.trim() || null })); toast(typeof r === 'string' ? r : 'Demande enregistrée.'); }
      catch (err) { toast(erreur(err), true); b.disabled = false; }
    };
  };

  // ---------------------------------------------------------------- import d'un tableau de produits (vendeur) : chaque ligne devient un brouillon
  const COULEURS = ['Noir', 'Blanc', 'Gris', 'Beige', 'Marron', 'Rouge', 'Rose', 'Orange', 'Jaune', 'Vert', 'Bleu', 'Violet', 'Multicolore'];
  const COLONNES = ['titre', 'rayon', 'marque', 'prix', 'etat', 'public', 'description', 'photo', 'taille', 'couleur', 'stock'];
  const lireCsv = texte => {
    const lignes = []; let ligne = [], champ = '', guil = false;
    const sep = (texte.split('\n')[0].match(/;/g) || []).length >= (texte.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < texte.length; i++) {
      const c = texte[i];
      if (guil) { if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++; } else if (c === '"') guil = false; else champ += c; }
      else if (c === '"') guil = true; else if (c === sep) { ligne.push(champ); champ = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texte[i + 1] === '\n') i++; ligne.push(champ); champ = ''; if (ligne.some(x => x.trim())) lignes.push(ligne); ligne = []; }
      else champ += c;
    }
    ligne.push(champ); if (ligne.some(x => x.trim())) lignes.push(ligne);
    return lignes;
  };
  APP.pages['import-produits'] = async () => {
    if (!exigeCompte()) return;
    vue(`<div class="wrap tk"><p><a href="#/vendeur">‹ Mon espace vendeur</a></p><h1>Importer un tableau de produits</h1>
      <section class="carte"><p>Un fichier CSV (Excel : « Enregistrer sous » › CSV), une ligne par taille et couleur. Les lignes d’un même titre forment un seul produit.
        Colonnes, dans cet ordre, avec cette première ligne : <code>${COLONNES.join(';')}</code></p>
        <p class="petit muted">Chaque produit est créé en <b>brouillon</b> : vérifiez-le et ajoutez vos photos avant de le publier. Prix en euros (ex. 45,90). État : neuf ou occasion. Public : femme, homme, enfant ou mixte. Couleur : ${COULEURS.join(', ')} (vide = Multicolore).
          Photo : une adresse https:// (facultatif).</p>
        <label class="btn btn-p" style="cursor:pointer">Choisir le fichier<input type="file" id="fCsv" accept=".csv,text/csv" hidden></label></section><div id="zoneImport"></div></div>`);
    $('#app').onchange = async e => {
      if (e.target.id !== 'fCsv' || !e.target.files[0]) return;
      const brut = lireCsv(await e.target.files[0].text()), tete = (brut[0] || []).map(x => x.trim().toLowerCase().replace(/^﻿/, ''));
      const z = $('#zoneImport');
      if (COLONNES.some(c => !tete.includes(c))) return (z.innerHTML = `<div class="avert avert-ko">Colonnes manquantes : ${esc(COLONNES.filter(c => !tete.includes(c)).join(', '))}.</div>`);
      const col = n => tete.indexOf(n), produits = new Map(), erreurs = [];
      brut.slice(1).forEach((l, i) => {
        const g = n => String(l[col(n)] || '').trim(), prix = Number(g('prix').replace(/\s/g, '').replace(',', '.')), stock = parseInt(g('stock'), 10);
        if (!g('titre') || !g('rayon') || !(prix > 0) || !g('taille') || !(stock >= 0)) return erreurs.push(`Ligne ${i + 2} : titre, rayon, prix, taille et stock sont obligatoires.`);
        const cle = g('titre').toLowerCase();
        if (!produits.has(cle)) produits.set(cle, { titre: g('titre'), rayon: g('rayon'), marque: g('marque'), prix, etat: g('etat') || 'neuf', public_cible: g('public') || 'mixte', description: g('description'), photos: /^https:\/\//.test(g('photo')) ? [g('photo')] : [], variantes: [] });
        const coul = g('couleur') ? g('couleur').charAt(0).toUpperCase() + g('couleur').slice(1).toLowerCase() : 'Multicolore';
        if (!COULEURS.includes(coul)) return erreurs.push(`Ligne ${i + 2} : couleur « ${g('couleur')} » inconnue (${COULEURS.join(', ')}).`);
        produits.get(cle).variantes.push({ taille: g('taille'), couleur: coul, stock });
      });
      z.innerHTML = `<section class="carte"><h2>${produits.size} produit(s) à créer</h2>${erreurs.length ? `<div class="avert avert-ko">${erreurs.slice(0, 8).map(esc).join('<br>')}</div>` : ''}
        <ul>${[...produits.values()].slice(0, 30).map(p => `<li>${esc(p.titre)} · ${eurF(p.prix)} · ${p.variantes.length} variante(s)</li>`).join('')}</ul>
        ${produits.size ? '<button class="btn btn-p" type="button" data-act="importer">Créer les brouillons</button>' : ''}<div id="journalImport" class="petit"></div></section>`;
      $('#app').onclick = async ev => {
        const b = ev.target.closest('[data-act=importer]'); if (!b) return; b.disabled = true;
        let ok = 0; const j = $('#journalImport');
        for (const p of produits.values()) {
          try { await q(sb.rpc('tk_annonce_enregistrer', { d: { statut: 'brouillon', mode: 'vente', titre: p.titre, rayon: p.rayon, marque: p.marque, prix: p.prix, etat: p.etat, public_cible: p.public_cible, description: p.description, photos: p.photos, variantes: p.variantes } })); ok++; }
          catch (err) { j.insertAdjacentHTML('beforeend', `<div class="ko">${esc(p.titre)} : ${esc(erreur(err))}</div>`); }
        }
        j.insertAdjacentHTML('afterbegin', `<p><b>${ok} brouillon(s) créé(s).</b> <a href="#/vendeur/produits">Voir mes produits</a></p>`);
      };
    };
  };

  // ---------------------------------------------------------------- aperçu rapide (bouton sur chaque carte produit)
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-act=apercu]'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    let p; try { p = await q(sb.rpc('tk_fiche', { p: b.dataset.id })); } catch (err) { return toast(erreur(err), true); }
    if (!p) return toast('Produit indisponible.', true);
    const dispo = (p.variantes || []).filter(x => x.stock > 0);
    const d = document.createElement('dialog'); d.className = 'apercu-d';
    d.innerHTML = `<form method="dialog" class="apercu-in"><button class="apercu-x" aria-label="Fermer">×</button>
      <div class="apercu-im"${p.photo ? ` style="background-image:url('${esc(p.photo)}')"` : ''}>${p.photo ? '' : '👟'}</div>
      <div class="apercu-t">${p.marque ? `<span class="marque">${esc(p.marque)}</span>` : ''}<h2>${esc(p.titre)}</h2><p class="apercu-px">${eurF(p.prix)}${p.barre ? ` <s class="muted">${eurF(p.barre)}</s>` : ''}</p>
        ${dispo.length ? `<div class="apercu-tailles" role="group" aria-label="Taille et couleur">${dispo.map(x => `<button type="button" class="tag" data-va="${esc(x.id)}" aria-pressed="false">${esc(x.taille)}${x.couleur && x.couleur !== 'Multicolore' ? ' · ' + esc(x.couleur) : ''}</button>`).join('')}</div>` : '<p class="muted">Plus en stock.</p>'}
        <div class="actions-r">${dispo.length && p.mode !== 'location' && !p.enchere ? '<button type="button" class="btn btn-p" data-x="ajout" disabled>Ajouter au panier</button>' : ''}<a class="btn btn-sec" href="#/p/${esc(p.id)}">Voir le produit</a></div></div></form>`;
    document.body.appendChild(d); d.showModal();
    let va = null;
    d.addEventListener('click', ev => {
      const t = ev.target.closest('[data-va]');
      if (t) { va = t.dataset.va; d.querySelectorAll('[data-va]').forEach(x => x.setAttribute('aria-pressed', String(x === t))); const a = d.querySelector('[data-x=ajout]'); if (a) a.disabled = false; return; }
      if (ev.target.closest('[data-x=ajout]') && va) {
        try { const l = JSON.parse(localStorage.getItem('tropik-panier') || '[]'), x = l.find(y => y.v === va); if (x) x.q = Math.min(9, (Number(x.q) || 0) + 1); else l.push({ v: va, q: 1 }); localStorage.setItem('tropik-panier', JSON.stringify(l)); localStorage.setItem('tropik-panier-t', String(Date.now())); } catch (er) { /* navigation privée */ }
        if (typeof nav === 'function') nav(); toast('Ajouté au panier.'); d.close(); return;
      }
      if (ev.target.closest('a[href]')) d.close();
      if (ev.target === d) d.close();
    });
    d.addEventListener('close', () => d.remove());
  }, true);

  // ---------------------------------------------------------------- rappel du panier laissé, langue, bouton Google : posés après chaque page
  const LANGUES = { fr: 'Français', en: 'English', es: 'Español' };
  const lireLangue = () => { try { return localStorage.getItem('tropik-langue') || 'fr'; } catch (e) { return 'fr'; } };
  const traduire = racine => {
    const lg = lireLangue(), dico = window.TK_LANGUES && window.TK_LANGUES[lg]; if (lg === 'fr' || !dico) return;
    const w = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.nodeValue.trim(); if (!t) continue;
      if (dico[t]) { n.nodeValue = n.nodeValue.replace(t, dico[t]); continue; }
      const m = t.match(/^([^\p{L}\p{N}]+)(.+)$/u);   // icône ou symbole en tête (« 📦 Mes commandes ») : on traduit la suite
      if (m && dico[m[2].trim()]) n.nodeValue = n.nodeValue.replace(m[2].trim(), dico[m[2].trim()]);
    }
    racine.querySelectorAll && racine.querySelectorAll('[placeholder],[aria-label]').forEach(el => ['placeholder', 'aria-label'].forEach(a => { const t = el.getAttribute(a); if (t && dico[t]) el.setAttribute(a, dico[t]); }));
  };
  const poser = () => {
    const h = location.hash || '#/', app = $('#app'); if (!app) return;
    // panier laissé depuis plus d'une heure : rappel sur l'accueil, une fois par visite
    if ((h === '#/' || h === '#') && !app.querySelector('.rappel-panier')) {
      let n = 0, t = 0; try { n = JSON.parse(localStorage.getItem('tropik-panier') || '[]').reduce((s, l) => s + (Number(l.q) || 0), 0); t = Number(localStorage.getItem('tropik-panier-t') || 0); } catch (e) { /* rien */ }
      let vu = false; try { vu = sessionStorage.getItem('tropik-rappel') === '1'; } catch (e) { /* rien */ }
      if (n > 0 && t && Date.now() - t > 36e5 && !vu) {
        app.insertAdjacentHTML('afterbegin', `<div class="rappel-panier" role="status"><span>🛒 Vous avez laissé <b>${n} article${n > 1 ? 's' : ''}</b> dans votre panier.</span><a class="btn btn-p btn-s" href="#/panier">Voir mon panier</a><button type="button" class="btn-x" aria-label="Fermer" data-x="rappel">×</button></div>`);
        try { sessionStorage.setItem('tropik-rappel', '1'); } catch (e) { /* rien */ }
      }
    }
    // langue : choix sur la page du compte
    if (/^#\/compte/.test(h) && !app.querySelector('#choixLangue')) {
      const wrap = app.querySelector('.wrap'); if (wrap) wrap.insertAdjacentHTML('beforeend', `<section class="carte" id="choixLangue"><h2>Langue</h2><div class="ligne-l">${Object.entries(LANGUES).map(([k, n]) => `<button type="button" class="btn btn-sec btn-s" data-langue="${k}" aria-pressed="${lireLangue() === k}">${n}</button>`).join('')}</div><p class="petit muted">Menus et boutons. Les annonces restent dans la langue du vendeur.</p></section>
        <section class="carte"><a href="#/mes-donnees">🔒 Mes données : télécharger, supprimer mon compte</a></section>`);
    }
    // connexion avec Google : seulement quand le fournisseur est activé dans Supabase (window.KAZ_CONFIG.google === true)
    if (/^#\/(connexion|inscription)/.test(h) && window.KAZ_CONFIG && window.KAZ_CONFIG.google === true && !app.querySelector('#btnGoogle')) {
      const f = app.querySelector('form'); if (f) f.insertAdjacentHTML('afterend', '<p class="centre"><button type="button" class="btn btn-sec btn-plein" id="btnGoogle">Continuer avec Google</button></p>');
    }
    traduire(document.body);
  };
  document.addEventListener('click', e => {
    const l = e.target.closest('[data-langue]');
    if (l) { try { localStorage.setItem('tropik-langue', l.dataset.langue); } catch (x) { /* rien */ } location.reload(); return; }
    if (e.target.closest('[data-x=rappel]')) { const r = e.target.closest('.rappel-panier'); if (r) r.remove(); return; }
    if (e.target.closest('#btnGoogle')) sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
  });
  window.addEventListener('DOMContentLoaded', () => {
    const app = $('#app'); if (!app) return;
    let att = null; new MutationObserver(() => { clearTimeout(att); att = setTimeout(poser, 60); }).observe(app, { childList: true });
    document.documentElement.lang = lireLangue();
  });
})();
