/* NEXORA — vue « Mon entreprise » du tableau de bord : l'entreprise dessinée comme un petit immeuble en coupe, une pièce par module
   (Ventes, Encaissements, Stock, Équipe, Trésorerie, Clients). Chaque pièce a une jauge de besoin (vert, orange, rouge) et une phrase d'état
   calculées sur les vraies données (nx_mon_entreprise, equipe_devis.sql) ; toucher une pièce ouvre le module. Dessin original en SVG et CSS,
   thèmes clair et sombre, sans animation quand l'appareil demande moins de mouvement. Choix de la vue gardé sur l'appareil (nxVue). */
'use strict';
const ISO = (x, y, z = 0) => [100 + (x - y) * 14, 48 + (x + y) * 7 - z * 16];   // sol de 6 × 6 cases, murs de 3 de haut
const isoPts = l => l.map(p => ISO(...p).map(n => n.toFixed(1)).join(',')).join(' ');
// pavé (x, y au sol, w × d, hauteur h, posé à l'altitude z) ; couleurs [dessus, face gauche, face droite]
const pave = (x, y, w, d, h, [haut, gauche, droite], z = 0) => `<polygon points="${isoPts([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${gauche}"/>`
  + `<polygon points="${isoPts([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]])}" fill="${droite}"/>`
  + `<polygon points="${isoPts([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]])}" fill="${haut}"/>`;
// cadre accroché au mur du fond : gauche (x = 0) ou droit (y = 0)
const surMur = (mur, a, b, z1, z2, fond, trait = 'rgba(0,0,0,.25)') => `<polygon points="${isoPts(mur === 'g' ? [[0, a, z1], [0, b, z1], [0, b, z2], [0, a, z2]] : [[a, 0, z1], [b, 0, z1], [b, 0, z2], [a, 0, z2]])}" fill="${fond}" stroke="${trait}" stroke-width=".8"/>`;
const C_BOIS = ['#D9A066', '#B9814B', '#9C6A3B'], C_BLANC = ['#F7F4EE', '#DED8CC', '#C9C1B2'], C_SOMBRE = ['#4A5A70', '#36445A', '#2A3546'], C_CARTON = ['#E2B26A', '#C8964F', '#AE7F3F'],
  C_METAL = ['#B8C3CF', '#97A3B1', '#7C8896'], C_TISSU = ['#3FB6B9', '#2E9497', '#257A7D'], C_OR = ['#F5C542', '#D9A82E', '#BF9020'], C_POT = ['#C46A4A', '#A9573A', '#8E482F'];
const PEAUX = ['#8D5524', '#C68642', '#5C3A1E', '#E0AC69', '#7A4A2A'], HABITS = ['#0E9CC4', '#8067F5', '#F79009', '#12B76A', '#E0457B'];
// habitant (dessin original) debout au point (x, y) du sol
const habitant = (x, y, i = 0) => { const [cx, cy] = ISO(x, y); return `<ellipse cx="${cx}" cy="${cy}" rx="7" ry="3" fill="rgba(0,0,0,.18)"/><rect x="${(cx - 5.5).toFixed(1)}" y="${(cy - 23).toFixed(1)}" width="11" height="21" rx="5.5" fill="${HABITS[i % 5]}"/><circle cx="${cx}" cy="${(cy - 28.5).toFixed(1)}" r="5.5" fill="${PEAUX[i % 5]}"/>`; };
const plante = (x, y) => { const [cx, cy] = ISO(x + 0.3, y + 0.3, 1.25); return pave(x, y, 0.6, 0.6, 0.5, C_POT) + `<circle cx="${cx}" cy="${cy}" r="9" fill="#3FA66B"/><circle cx="${cx - 5}" cy="${cy + 3}" r="6" fill="#2E8B57"/>`; };
const coque = (mur1, mur2) => `<polygon class="iso-sol" points="${isoPts([[0, 0, 0], [6, 0, 0], [6, 6, 0], [0, 6, 0]])}"/>`
  + [2, 4].map(k => `<polyline class="iso-joint" points="${isoPts([[k, 0, 0], [k, 6, 0]])}"/><polyline class="iso-joint" points="${isoPts([[0, k, 0], [6, k, 0]])}"/>`).join('')
  + `<polygon points="${isoPts([[0, 0, 0], [0, 6, 0], [0, 6, 3], [0, 0, 3]])}" fill="${mur1}"/><polygon points="${isoPts([[0, 0, 0], [6, 0, 0], [6, 0, 3], [0, 0, 3]])}" fill="${mur2}"/>`;
const fenetre = () => surMur('d', 3.3, 5.3, 1.2, 2.5, '#BFE8FA') + `<polyline points="${isoPts([[4.3, 0, 1.2], [4.3, 0, 2.5]])}" stroke="#fff" stroke-width="1.5" fill="none"/>`;

// une scène par pièce, dessinée du fond vers l'avant ; d = données de la pièce (le nombre d'objets suit les vraies données, plafonné)
const SCENES = {
  ventes: d => { const n = Math.min(5, (d?.en_attente || 0) + (d?.a_facturer || 0));
    return coque('#D5E4FA', '#E4EEFD') + fenetre() + surMur('g', 1.4, 3.4, 1.4, 2.6, '#fff') + `<polyline points="${isoPts([[0, 1.7, 1.6], [0, 2.3, 1.9], [0, 2.8, 1.8], [0, 3.2, 2.4]])}" stroke="#12B76A" stroke-width="1.6" fill="none"/>`
      + habitant(2.9, 1.5, 0) + pave(1.2, 2.2, 3, 1.3, 1, C_BOIS) + pave(2.6, 2.4, 1.1, 0.15, 0.85, C_SOMBRE, 1) + (n ? pave(1.4, 2.6, 0.7, 0.5, 0.06 * n, C_BLANC, 1) : '') + plante(4.9, 4.6); },
  encaissements: d => { const r = Math.min(3, d?.nb_retard || 0);
    return coque('#D2F0DE', '#E2F6EA') + fenetre() + Array.from({ length: r }, (_, i) => surMur('g', 1 + i * 1.3, 2 + i * 1.3, 1.5, 2.2, '#EF6B5B', '#B53E31')).join('')
      + habitant(2.4, 1.5, 1) + pave(1, 2.6, 3.6, 1.2, 1.1, C_BLANC) + pave(1.4, 2.8, 1, 0.8, 0.45, C_SOMBRE, 1.1) + pave(3.1, 2.9, 0.45, 0.45, d?.a_encaisser > 0 ? 0.35 : 0.12, C_OR, 1.1); },
  stock: d => { const n = d ? Math.min(5, Math.max(0, d.suivis - d.rupture)) : 0;
    return coque('#F6E2BB', '#FBEFD6') + pave(0.3, 0.5, 1, 2.8, 2.4, C_METAL) + pave(1.6, 0.3, 2.8, 0.9, 2.4, C_METAL)
      + Array.from({ length: n }, (_, i) => pave(2.2 + (i % 3) * 1.05, 2.6 + Math.floor(i / 3) * 1.1, 0.85, 0.85, 0.7, C_CARTON)).join('') + habitant(4.6, 4.8, 2); },
  equipe: d => { const presents = d ? Math.min(4, Math.max(0, d.employes - d.absents.length)) : 0, places = [[1.4, 1.6], [4.2, 2], [1.3, 4.4], [3.9, 4.5]].slice(0, presents);
    return coque('#E3D8FB', '#EFE8FF') + surMur('g', 1.6, 3.2, 1.3, 2.6, '#fff') + (d?.demandes ? surMur('g', 2.6, 3, 1.5, 1.9, '#EF6B5B', '#B53E31') : '')
      + places.filter(([x, y]) => x + y < 5.8).map(([x, y], i) => habitant(x, y, i + 1)).join('') + pave(2, 2, 1.8, 1.8, 0.8, C_BOIS)
      + places.filter(([x, y]) => x + y >= 5.8).map(([x, y], i) => habitant(x, y, i + 3)).join(''); },
  tresorerie: (d, niv) => { const piles = niv === 'ok' ? 3 : niv === 'att' ? 2 : niv === 'ko' ? 1 : 0, [cx, cy] = ISO(1.8, 2.6, 1);
    return coque('#CBEBEE', '#DDF4F6') + pave(1, 1.2, 1.6, 1.4, 1.8, C_SOMBRE) + `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#D9DEE6"/><circle cx="${cx}" cy="${cy}" r="1.6" fill="#36445A"/>`
      + Array.from({ length: piles }, (_, i) => pave(3.1 + i * 0.75, 3.4, 0.5, 0.5, 0.3 + i * 0.25, C_OR)).join('') + plante(4.7, 0.6); },
  clients: d => { const n = d ? Math.min(3, (d.clients + d.prospects > 0 ? 1 : 0) + (d.clients >= 5 ? 1 : 0) + (d.prospects >= 3 ? 1 : 0)) : 0;
    return coque('#F8D3DD', '#FCE6EC') + fenetre() + pave(0.25, 2.3, 0.35, 2.8, 1.1, C_TISSU) + pave(0.6, 2.3, 1, 2.8, 0.5, C_TISSU)
      + [[1.2, 2.9], [1.2, 4.3], [3.9, 4.6]].slice(0, n).map(([x, y], i) => habitant(x, y, i + 2)).join('') + pave(2.4, 3, 1, 1.4, 0.4, C_BOIS) + plante(4.8, 0.7); }
};

// niveau de chaque pièce : ok (vert), att (orange), ko (rouge), neutre (rien à suivre encore), verrou (pas le droit de la voir)
const NIVEAUX = { ok: 'Tout va bien', att: 'À surveiller', ko: 'À traiter vite', neutre: 'À démarrer', verrou: 'Accès réservé' };
const pl = (n, s, p = s + 's') => `${n} ${n > 1 ? p : s}`;
function etatsPieces(e) {
  const v = e.ventes, f = e.encaissements, s = e.stock, q2 = e.equipe, t = e.tresorerie, c = e.clients;
  return [
    ['ventes', '💼', 'Ventes', '#/devis', v.a_facturer_vieux ? ['ko', `${pl(v.a_facturer, 'devis accepté', 'devis acceptés')} à facturer depuis plus d’une semaine (${montant(v.a_facturer_ht)} HT)`, [`Transformer ${pl(v.a_facturer, 'devis', 'devis')} en facture`, '#/devis?f=afacturer']]
      : v.a_facturer ? ['att', `${pl(v.a_facturer, 'devis accepté', 'devis acceptés')} à transformer en facture (${montant(v.a_facturer_ht)} HT)`, [`Transformer ${pl(v.a_facturer, 'devis', 'devis')} en facture`, '#/devis?f=afacturer']]
      : v.expires ? ['att', `${pl(v.expires, 'devis expiré', 'devis expirés')} sans réponse du client`, [`Relancer ${pl(v.expires, 'devis', 'devis')}`, '#/devis?f=envoye']]
      : !v.total ? ['neutre', 'Aucun devis pour l’instant', ['Créer un devis', '#/devis/nouveau']]
      : !v.recents && !v.en_attente ? ['att', 'Aucun devis depuis 30 jours', ['Faire un devis', '#/devis/nouveau']]
      : ['ok', v.en_attente ? `${pl(v.en_attente, 'devis', 'devis')} en attente de réponse` : 'Ventes à jour', null]],
    ['encaissements', '💶', 'Encaissements', '#/factures', f.nb_retard_30 ? ['ko', `${pl(f.nb_retard, 'facture', 'factures')} en retard · ${montant(f.retard_ttc)}`, [`Relancer ${pl(f.nb_retard, 'facture', 'factures')}`, ERP ? '#/relances' : '#/factures?f=retard']]
      : f.nb_retard ? ['att', `${pl(f.nb_retard, 'facture', 'factures')} en retard · ${montant(f.retard_ttc)}`, [`Relancer ${pl(f.nb_retard, 'facture', 'factures')}`, ERP ? '#/relances' : '#/factures?f=retard']]
      : f.declares ? ['att', `${pl(f.declares, 'paiement signalé', 'paiements signalés')} par vos clients, à vérifier`, ['Vérifier les paiements', '#/factures']]
      : f.brouillons ? ['att', `${pl(f.brouillons, 'facture en brouillon', 'factures en brouillon')}, à valider`, ['Voir les brouillons', '#/factures?f=brouillon']]
      : ['ok', Number(f.a_encaisser) ? `${montant(f.a_encaisser)} à encaisser, rien en retard` : 'Tout est encaissé', null]],
    ['stock', '📦', 'Stock', '#/stock', !ERP || !s.suivis ? ['neutre', 'Aucun article suivi en stock', ['Suivre un article', '#/stock']]
      : s.rupture ? ['ko', `En rupture : ${s.noms.join(', ')}`, ['Commander', '#/stock']]
      : s.sous_seuil ? ['att', `${pl(s.sous_seuil, 'article', 'articles')} à commander : ${s.noms.join(', ')}`, ['Voir le stock', '#/stock']]
      : ['ok', `${pl(s.suivis, 'article suivi', 'articles suivis')}, rien à commander`, null]],
    ['equipe', '👥', 'Équipe', '#/planning', !q2 ? ['verrou', 'Réservé aux propriétaires et administrateurs', null]
      : !q2.employes ? ['neutre', 'Aucun employé enregistré', ['Ajouter un employé', '#/employes']]
      : q2.demandes && q2.demande_jours >= 7 ? ['ko', `${pl(q2.demandes, 'demande', 'demandes')} de congés sans réponse depuis plus d’une semaine`, ['Répondre aux demandes', '#/employes/absences']]
      : q2.demandes ? ['att', `${pl(q2.demandes, 'demande', 'demandes')} de congés à traiter`, ['Répondre aux demandes', '#/employes/absences']]
      : !q2.creneaux ? ['att', 'Planning de la semaine vide', ['Préparer le planning', '#/planning']]
      : ['ok', q2.absents.length ? `Absent aujourd’hui : ${q2.absents.join(', ')}` : `${pl(q2.employes, 'personne', 'personnes')}, planning à jour`, null]],
    ['tresorerie', '🏦', 'Trésorerie', '#/tresorerie', !t ? ['verrou', 'Réservé aux propriétaires, administrateurs et comptables', null]
      : !t.comptes ? ['neutre', 'Ajoutez votre compte bancaire', ['Ajouter un compte', '#/tresorerie']]
      : t.total < 0 ? ['ko', `Solde négatif : ${montant(t.total)}`, ['Voir la trésorerie', '#/tresorerie']]
      : t.solde_min < 0 ? ['ko', 'Passage dans le rouge prévu d’ici 12 semaines', ['Voir la prévision', '#/tresorerie']]
      : t.a_payer_retard ? ['att', `${pl(t.a_payer_retard, 'dépense', 'dépenses')} en retard de paiement`, ['Payer les dépenses', '#/depenses']]
      : ['ok', `Solde : ${montant(t.total)}`, null]],
    ['clients', '🤝', 'Clients', '#/clients', !c.clients && !c.prospects ? ['neutre', 'Aucun client pour l’instant', ['Ajouter un client', '#/clients?nouveau=1']]
      : c.rappels_retard ? [c.rappels_retard > 5 ? 'ko' : 'att', `${pl(c.rappels_retard, 'rappel', 'rappels')} en retard`, ['Voir les rappels', '#/activites']]
      : ['ok', `${pl(c.clients, 'client', 'clients')} · ${pl(c.prospects, 'prospect', 'prospects')}${c.nouveaux ? ` · ${c.nouveaux} nouveau${c.nouveaux > 1 ? 'x' : ''} ce mois` : ''}`, null]]
  ].map(([cle, ico, nom, href, [niv, texte, action]]) => ({ cle, ico, nom, href, niv, texte, action, donnees: { ventes: v, encaissements: f, stock: s, equipe: q2, tresorerie: t, clients: c }[cle] }));
}

const basculeVue = mode => EQ ? `<div class="seg" role="group" aria-label="Affichage du tableau de bord"><button type="button" data-vue="classique" aria-pressed="${mode === 'classique'}">Vue classique</button><button type="button" data-vue="entreprise" aria-pressed="${mode === 'entreprise'}">🏢 Mon entreprise</button></div>` : '';

async function vueEntreprise() {
  const titre = `Bonjour ${esc(profil?.prenom || '')}`, sous = esc(ORG.nom) + ' · ' + esc(ROLES[ROLE]), org = ORG.id;
  vue(entete(titre, sous, basculeVue('entreprise')) + '<div class="chargement">Visite de votre entreprise…</div>');
  const e = await q(sb.rpc('nx_mon_entreprise', { org }));
  if (ORG?.id !== org || !$('#page')) return;
  const pieces = etatsPieces(e), moment = e.heure >= 6 && e.heure < 17 ? 'jour' : e.heure >= 17 && e.heure < 19 ? 'soir' : 'nuit';
  const nKo = pieces.filter(p => p.niv === 'ko').length, nAtt = pieces.filter(p => p.niv === 'att').length;
  const actions = [...pieces.filter(p => p.niv === 'ko'), ...pieces.filter(p => p.niv === 'att'), ...pieces.filter(p => p.niv === 'neutre')].filter(p => p.action).slice(0, 4);
  const seg = { ok: 5, att: 3, ko: 1, neutre: 0, verrou: 0 };
  const piece = p => { const contenu = `<span class="piece-tete"><span class="piece-nom">${p.ico} ${p.nom}</span>${p.niv === 'ko' || p.niv === 'att' ? '<span class="bulle" aria-hidden="true">!</span>' : ''}</span>
      <svg class="iso" viewBox="0 -4 200 140" aria-hidden="true" focusable="false">${p.niv === 'verrou' ? coque('#E3E7ED', '#EEF1F5') : SCENES[p.cle](p.donnees, p.niv)}</svg>
      ${p.niv === 'verrou' ? '<span class="verrou" aria-hidden="true">🔒</span>' : ''}
      <span class="piece-jauge"><span class="jauge" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<i class="${i < seg[p.niv] ? 'on' : ''}"></i>`).join('')}</span><span class="niv-txt">${NIVEAUX[p.niv]}</span></span>
      <span class="piece-etat">${esc(p.texte)}</span>`;
    return p.niv === 'verrou' ? `<div class="piece niv-verrou" role="group" aria-label="${p.nom} : ${NIVEAUX[p.niv]}">${contenu}</div>`
      : `<a class="piece niv-${p.niv}" href="${p.href}" aria-label="${p.nom} : ${NIVEAUX[p.niv]}. ${esc(p.texte)}">${contenu}</a>`; };
  const palmier = `<svg class="palmier" viewBox="0 0 60 90" aria-hidden="true" focusable="false"><path d="M30 88 C31 70 33 50 30 30" stroke="#8A5A30" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30 30 C18 18 6 22 2 30 C12 24 22 26 30 30 M30 30 C42 16 54 20 58 28 C48 23 38 25 30 30 M30 30 C26 14 32 4 40 2 C34 10 32 20 30 30 M30 30 C22 32 14 40 12 50 C20 42 26 36 30 30 M30 30 C38 32 46 40 48 50 C40 42 34 36 30 30" fill="#2E8B57"/></svg>`;
  vue(entete(titre, sous, basculeVue('entreprise'))
    + `<section class="ent"><div class="carte ent-resume"><span class="humeur ${nKo ? 'ko' : nAtt ? 'att' : 'ok'}" aria-hidden="true">${nKo ? '🔴' : nAtt ? '🟠' : '🟢'}</span>
        <div><h2>${nKo || nAtt ? [nKo && pl(nKo, 'pièce demande', 'pièces demandent') + ' d’agir vite', nAtt && pl(nAtt, 'pièce', 'pièces') + ' à surveiller'].filter(Boolean).join(', ') : 'Tout roule : aucune pièce ne demande votre attention'}</h2>
        ${actions.length ? `<p class="muted petit">À faire maintenant :</p><div class="actions">${actions.map((p, i) => `<a class="btn ${i ? '' : 'btn-p'}" href="${p.action[1]}">${p.ico} ${esc(p.action[0])}</a>`).join('')}</div>` : ''}</div></div>
      <div class="immeuble ${moment}" role="region" aria-label="Votre entreprise, pièce par pièce"><div class="ciel" aria-hidden="true"><span class="astre" style="left:${moment === 'jour' ? 10 + (e.heure - 6) / 11 * 75 : moment === 'soir' ? 88 : 80}%"></span><span class="nuage n1"></span><span class="nuage n2"></span></div>
        <div class="toit" aria-hidden="true"></div><div class="enseigne"><span>${esc(ORG.nom)}</span></div>
        <div class="etages">${pieces.map(piece).join('')}</div><div class="trottoir" aria-hidden="true">${palmier}<span class="porte"></span>${palmier}</div></div>
      <p class="muted petit">Chaque pièce est calculée sur vos vraies données : vert, tout va bien ; orange, à surveiller ; rouge, à traiter vite. Touchez une pièce pour l’ouvrir.</p></section>`);
  $('#page').onclick = ev => { const b = ev.target.closest('[data-vue]'); if (b) { ecrire('nxVue', b.dataset.vue); NX.pages[''](); } };
}
