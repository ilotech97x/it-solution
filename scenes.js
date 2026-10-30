/* Scènes illustrées : pour chaque catégorie, un exemple concret de ce que le client obtient
   (un écran, un téléphone, un rapport…), dessiné en SVG pour rester net à toutes les tailles.
   scene(categorie ou pôle, classe) ; sans scène connue, on retombe sur illustration(). */
(function () {
  const W = 320, H = 200;
  const e = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const t = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.s || 11}" fill="${o.c || '#0f172a'}" font-weight="${o.b ? 700 : 500}"${o.a ? ` text-anchor="${o.a}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}>${e(s)}</text>`;
  const r = (x, y, w, h, c, rx = 6, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"${extra}/>`;
  const ok = (x, y, c = '#16a34a') => `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/><path d="M${x - 3} ${y} l2 2.2 l4 -4.4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  const alerte = (x, y) => `<circle cx="${x}" cy="${y}" r="6" fill="#f59e0b"/><path d="M${x} ${y - 3} v3.4 M${x} ${y + 2.6} v.1" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`;
  const barre = (x, y, w, p, c) => r(x, y, w, 6, '#e2e8f0', 3) + r(x, y, Math.max(6, w * p), 6, c, 3);
  // fenêtre d'ordinateur (barre de titre + contenu clair)
  const fenetre = (x, y, w, h, titre, c, contenu) => `<g>${r(x, y, w, h, '#f8fafc', 10)}${r(x, y, w, 22, '#e2e8f0', 10)}${r(x, y + 12, w, 10, '#e2e8f0', 0)}
    <circle cx="${x + 12}" cy="${y + 11}" r="3.4" fill="#f87171"/><circle cx="${x + 23}" cy="${y + 11}" r="3.4" fill="#fbbf24"/><circle cx="${x + 34}" cy="${y + 11}" r="3.4" fill="#34d399"/>
    ${t(x + 46, y + 15, titre, { s: 10, c: '#475569' })}${contenu}</g>`;
  // téléphone (cadre sombre, écran clair)
  const tel = (x, y, contenu, w = 104, h = 184) => `<g>${r(x, y, w, h, '#0f172a', 16)}${r(x + 5, y + 5, w - 10, h - 10, '#f8fafc', 12)}${r(x + w / 2 - 16, y + 9, 32, 5, '#0f172a', 3)}${contenu}</g>`;
  const fond = (id, c) => `<defs><linearGradient id="sc-${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".9"/><stop offset="1" stop-color="${c}" stop-opacity=".25"/></linearGradient></defs>
    ${r(0, 0, W, H, '#0b1324', 18)}${r(0, 0, W, H, `url(#sc-${id})`, 18, ' opacity=".55"')}<circle cx="290" cy="22" r="60" fill="#fff" opacity=".06"/><circle cx="20" cy="190" r="50" fill="#fff" opacity=".05"/>`;

  const S = {
    ordi: c => fenetre(22, 18, 276, 166, 'Diagnostic de votre PC', c,
      t(38, 62, 'Démarrage', { s: 12, b: 1 }) + t(282, 62, '1 min 40  →  14 s', { s: 12, b: 1, c: '#16a34a', a: 'end' }) +
      [['Disque dur', 'Sain'], ['Mémoire', 'OK'], ['Windows', 'À jour'], ['Virus', 'Aucun']].map(([a, b], i) =>
        ok(44, 84 + i * 20) + t(58, 88 + i * 20, a) + t(282, 88 + i * 20, b, { a: 'end', c: '#16a34a', b: 1 })).join('') +
      barre(38, 166, 244, 1, c) + t(282, 160, 'PC remis en forme', { s: 9, a: 'end', c: '#475569' })),
    securite: c => tel(30, 8, t(82, 40, 'Sécurité', { s: 12, b: 1, a: 'middle' }) + r(42, 50, 80, 50, '#dcfce7', 10) + t(82, 72, '12', { s: 20, b: 1, a: 'middle', c: '#16a34a' }) + t(82, 90, 'virus supprimés', { s: 9, a: 'middle' }) +
      ok(46, 118) + t(56, 122, 'Antivirus actif', { s: 9 }) + ok(46, 140) + t(56, 144, 'Pubs bloquées', { s: 9 }) + ok(46, 162) + t(56, 166, 'Navigateur sain', { s: 9 })) +
      r(150, 40, 150, 120, '#f8fafc', 12) + t(164, 64, 'Compte récupéré', { s: 12, b: 1 }) + t(164, 84, 'Facebook · Gmail', { s: 10, c: '#475569' }) +
      ok(170, 108) + t(182, 112, 'Mot de passe changé', { s: 10 }) + ok(170, 132) + t(182, 136, 'Double sécurité activée', { s: 10 }),
    donnees: c => fenetre(18, 18, 180, 164, 'Sauvegarde', c,
      [['Lun. 02:00', 1], ['Mar. 02:00', 1], ['Mer. 02:00', 1], ['Jeu. 02:00', 1]].map(([a], i) => ok(34, 54 + i * 24) + t(46, 58 + i * 24, a) + t(186, 58 + i * 24, 'Vérifiée', { a: 'end', c: '#16a34a', b: 1, s: 10 })).join('') +
      t(30, 166, 'Automatique, chaque nuit', { s: 9, c: '#475569' })) +
      r(210, 46, 94, 110, '#f8fafc', 12) + t(257, 74, 'Photos', { s: 11, a: 'middle', b: 1 }) + t(257, 102, '1 284', { s: 22, a: 'middle', b: 1, c }) + t(257, 120, 'récupérées', { s: 10, a: 'middle' }) + ok(257, 140),
    install: c => fenetre(20, 20, 186, 160, 'Nouveau PC', c,
      [['Windows configuré'], ['Office installé'], ['Fichiers transférés'], ['Antivirus'], ['Imprimante connectée']].map(([a], i) => ok(36, 54 + i * 24) + t(48, 58 + i * 24, a)).join('')) +
      `<g transform="translate(218 64)">${r(0, 30, 86, 50, '#e2e8f0', 8)}${r(12, 0, 62, 40, '#ffffff', 3, ' stroke="#cbd5e1"')}${r(20, 10, 40, 4, c, 2)}${r(20, 18, 30, 4, '#cbd5e1', 2)}${r(10, 62, 66, 10, '#94a3b8', 3)}<circle cx="74" cy="44" r="3" fill="#16a34a"/></g>` +
      t(261, 166, 'Imprime ✓', { s: 11, a: 'middle', c: '#fff', b: 1 }),
    mobile: c => tel(24, 8, t(76, 40, 'Stockage', { s: 11, b: 1, a: 'middle' }) + barre(38, 50, 76, .41, '#16a34a') + t(76, 72, '92 % → 41 %', { s: 11, a: 'middle', b: 1, c: '#16a34a' }) +
      ok(40, 98) + t(50, 102, 'Batterie OK', { s: 9 }) + ok(40, 120) + t(50, 124, 'Écran neuf', { s: 9 }) + ok(40, 142) + t(50, 146, 'Mises à jour', { s: 9 })) +
      tel(186, 8, t(238, 40, 'Transfert', { s: 11, b: 1, a: 'middle' }) + t(238, 56, 'vers le nouveau', { s: 9, a: 'middle', c: '#475569' }) + barre(200, 70, 76, 1, c) + t(238, 96, '100 %', { s: 18, b: 1, a: 'middle', c }) +
        t(238, 120, 'Contacts · Photos', { s: 9, a: 'middle' }) + t(238, 134, 'WhatsApp', { s: 9, a: 'middle' })) +
      `<path d="M136 100 h40" stroke="#fff" stroke-width="3" stroke-dasharray="6 5" stroke-linecap="round"/><path d="M170 92 l8 8 l-8 8" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    gaming: c => r(20, 20, 280, 150, '#111827', 12) + r(28, 28, 264, 134, '#1e1b4b', 8) +
      `<path d="M28 140 L90 96 L130 120 L190 70 L240 104 L292 80 V162 H28 Z" fill="${c}" opacity=".45"/>` +
      r(36, 36, 78, 46, '#000', 6, ' opacity=".55"') + t(44, 54, 'FPS', { s: 10, c: '#a5f3fc' }) + t(44, 75, '144', { s: 20, b: 1, c: '#4ade80' }) +
      r(214, 36, 70, 46, '#000', 6, ' opacity=".55"') + t(222, 54, 'CPU', { s: 10, c: '#a5f3fc' }) + t(222, 75, '62 °C', { s: 16, b: 1, c: '#fff' }) +
      r(120, 172, 80, 8, '#334155', 3),
    aide: c => tel(108, 8, r(113, 22, 94, 26, c, 0, ' opacity=".9"') + t(160, 39, 'IloTech', { s: 11, b: 1, a: 'middle', c: '#fff' }) +
      r(116, 58, 84, 30, '#ffffff', 8, ' stroke="#e2e8f0"') + t(121, 71, 'J’envoie une', { s: 8.5 }) + t(121, 82, 'photo comment ?', { s: 8.5 }) +
      r(120, 96, 82, 42, '#dcfce7', 8) + t(125, 109, 'Appuyez sur « + »', { s: 8.5 }) + t(125, 120, 'puis « Galerie ».', { s: 8.5 }) + t(125, 131, 'On vous montre !', { s: 8.5, b: 1 }) +
      r(116, 146, 84, 22, '#ffffff', 8, ' stroke="#e2e8f0"') + t(121, 161, 'Merci, ça marche !', { s: 8.5 })) +
      t(52, 92, 'Pas à pas,', { s: 13, b: 1, c: '#fff', a: 'middle' }) + t(52, 110, 'sans jargon', { s: 13, b: 1, c: '#fff', a: 'middle' }) +
      t(266, 92, 'À domicile', { s: 12, b: 1, c: '#fff', a: 'middle' }) + t(266, 110, 'ou à distance', { s: 12, b: 1, c: '#fff', a: 'middle' }),
    camera: c => tel(14, 8, t(66, 38, 'Mes caméras', { s: 11, b: 1, a: 'middle' }) +
      [['Portail', '#64748b'], ['Jardin', '#16a34a'], ['Garage', '#475569'], ['Entrée', '#0ea5e9']].map(([n, col], i) =>
        r(24 + (i % 2) * 44, 48 + Math.floor(i / 2) * 44, 40, 40, col, 6) + `<circle cx="${30 + (i % 2) * 44}" cy="${55 + Math.floor(i / 2) * 44}" r="2.5" fill="#ef4444"/>` + t(28 + (i % 2) * 44, 84 + Math.floor(i / 2) * 44, n, { s: 7.5, c: '#fff', b: 1 })).join('') +
      t(66, 158, '● En direct', { s: 9, a: 'middle', c: '#ef4444', b: 1 })) +
      r(132, 52, 172, 58, '#ffffff', 12) + t(146, 74, 'Mouvement détecté', { s: 12, b: 1 }) + t(146, 94, 'Portail · 21:14', { s: 11, c: '#475569' }) + `<circle cx="286" cy="70" r="6" fill="#ef4444"/>` +
      r(132, 122, 172, 46, '#ffffff', 12, ' opacity=".92"') + ok(150, 145) + t(162, 149, 'Enregistré 30 jours', { s: 11 }),
    domo: c => tel(108, 8, t(160, 38, 'Ma maison', { s: 11, b: 1, a: 'middle' }) +
      [['Lumières', 1], ['Volets', 0], ['Clim 24 °C', 1], ['Arrosage', 1]].map(([n, on], i) => t(120, 64 + i * 28, n, { s: 9 }) +
        r(178, 55 + i * 28, 22, 12, on ? '#22c55e' : '#cbd5e1', 6) + `<circle cx="${on ? 194 : 184}" cy="${61 + i * 28}" r="4.5" fill="#fff"/>`).join('')) +
      t(54, 88, 'Tout se pilote', { s: 12, b: 1, c: '#fff', a: 'middle' }) + t(54, 106, 'du téléphone', { s: 12, b: 1, c: '#fff', a: 'middle' }) +
      t(266, 88, 'Même loin', { s: 12, b: 1, c: '#fff', a: 'middle' }) + t(266, 106, 'de chez vous', { s: 12, b: 1, c: '#fff', a: 'middle' }),
    wifi: c => r(20, 18, 280, 164, '#f8fafc', 12) + `<path d="M20 100 H300 M150 18 V182 M225 100 V182" stroke="#cbd5e1" stroke-width="3"/>` +
      [['Salon', 85, 60, 4], ['Chambre', 225, 60, 4], ['Cuisine', 85, 142, 4], ['Bureau', 187, 142, 4], ['Terrasse', 262, 142, 3]].map(([n, x, y, b]) =>
        t(x, y, n, { s: 11, b: 1, a: 'middle' }) + [0, 1, 2, 3].map(k => r(x - 14 + k * 8, y + 18 - k * 4, 5, 6 + k * 4, k < b ? '#16a34a' : '#cbd5e1', 1)).join('')).join('') +
      `<circle cx="150" cy="100" r="11" fill="${c}"/><path d="M144 98 q6 -6 12 0 M146.5 101 q3.5 -3 7 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
    multimedia: c => r(26, 16, 268, 150, '#0f172a', 10) + r(32, 22, 256, 138, '#1e293b', 6) + `<path d="M32 130 L110 80 L160 110 L220 66 L288 104 V160 H32 Z" fill="${c}" opacity=".5"/>` +
      r(44, 34, 110, 92, '#000', 8, ' opacity=".6"') + [['Box TV', 1], ['Chaînes', 1], ['Netflix', 1], ['Barre de son', 1]].map(([n], i) => ok(56, 52 + i * 20, '#22c55e') + t(66, 56 + i * 20, n, { s: 10, c: '#fff' })).join('') +
      r(140, 166, 40, 8, '#334155', 2) + r(110, 174, 100, 6, '#334155', 3),
    web: c => fenetre(14, 14, 214, 172, 'ti-bokit.mq', c,
      r(14, 36, 214, 26, '#fef3c7', 0) + t(26, 54, 'Ti Bokit', { s: 13, b: 1 }) + t(214, 54, 'Commander', { s: 10, a: 'end', b: 1, c }) +
      [['Bokit morue', '7,50 €'], ['Accras (6)', '6,00 €'], ['Jus de goyave', '3,50 €']].map(([a, b], i) => t(26, 84 + i * 22, a) + t(196, 84 + i * 22, b, { a: 'end', b: 1 }) + r(202, 76 + i * 22, 14, 11, c, 3) + t(209, 85 + i * 22, '+', { s: 10, a: 'middle', c: '#fff', b: 1 })).join('') +
      r(26, 150, 190, 24, c, 8) + t(121, 166, 'Voir le panier', { s: 11, a: 'middle', c: '#fff', b: 1 })) +
      tel(216, 22, t(268, 54, 'Nouvelle', { s: 10, b: 1, a: 'middle' }) + t(268, 68, 'commande', { s: 10, b: 1, a: 'middle' }) + ok(268, 92) + t(268, 118, '11,00 €', { s: 13, b: 1, a: 'middle', c: '#16a34a' }) + t(268, 136, 'Retrait 12 h 30', { s: 8.5, a: 'middle', c: '#475569' }), 96, 160),
    appli: c => tel(24, 8, t(76, 38, 'Réserver', { s: 11, b: 1, a: 'middle' }) + ['L', 'M', 'M', 'J', 'V'].map((d, i) => r(35 + i * 17, 48, 14, 24, i === 3 ? c : '#e2e8f0', 4) + t(42 + i * 17, 58, d, { s: 7, a: 'middle', c: i === 3 ? '#fff' : '#0f172a' }) + t(42 + i * 17, 68, String(11 + i), { s: 7.5, a: 'middle', b: 1, c: i === 3 ? '#fff' : '#0f172a' })).join('') +
      ['9 h', '10 h', '11 h'].map((h, i) => r(36, 82 + i * 22, 80, 18, i === 1 ? c : '#ffffff', 5, ' stroke="#e2e8f0"') + t(76, 95 + i * 22, h, { s: 9, a: 'middle', c: i === 1 ? '#fff' : '#0f172a', b: i === 1 })).join('') +
      r(36, 156, 80, 20, '#0f172a', 6) + t(76, 170, 'Confirmer', { s: 9, a: 'middle', c: '#fff', b: 1 })) +
      r(150, 50, 156, 100, '#ffffff', 12) + ok(170, 76) + t(182, 80, 'Rendez-vous confirmé', { s: 11, b: 1 }) + t(166, 104, 'Jeudi 14 · 10 h', { s: 12 }) + t(166, 126, 'Rappel envoyé la veille', { s: 10, c: '#475569' }),
    prog: c => fenetre(14, 16, 196, 168, 'automatisation.js', c,
      [['#7c3aed', 'const', 60], ['#0f172a', 'factures', 110], ['#16a34a', '.trier()', 90], ['#0ea5e9', '.exporter("Excel")', 140], ['#7c3aed', 'envoyer', 70], ['#0f172a', 'chaque lundi', 100]].map(([col, s, w], i) =>
        t(26 + (i % 3 === 0 ? 0 : 12), 52 + i * 20, s, { s: 10.5, c: col, b: i === 0 })).join('')) +
      r(220, 50, 88, 100, '#ffffff', 12) + t(264, 80, '3 h', { s: 24, b: 1, a: 'middle', c }) + t(264, 100, 'gagnées', { s: 10, a: 'middle' }) + t(264, 114, 'par semaine', { s: 10, a: 'middle' }) + ok(264, 134),
    marketing: c => r(16, 22, 168, 156, '#ffffff', 12) + r(16, 22, 168, 60, '#bfdbfe', 12) + r(16, 70, 168, 12, '#bfdbfe', 0) +
      `<path d="M100 32 c-12 0 -18 9 -18 16 c0 12 18 26 18 26 s18 -14 18 -26 c0 -7 -6 -16 -18 -16 z" fill="#ef4444"/><circle cx="100" cy="48" r="6" fill="#fff"/>` +
      t(28, 104, 'Snack Bèlè', { s: 13, b: 1 }) + t(28, 124, '★★★★★', { s: 12, c: '#f59e0b' }) + t(98, 124, '4,8 (126 avis)', { s: 10, c: '#475569' }) +
      r(28, 136, 70, 22, c, 8) + t(63, 151, 'Itinéraire', { s: 10, a: 'middle', c: '#fff', b: 1 }) + r(104, 136, 68, 22, '#e2e8f0', 8) + t(138, 151, 'Appeler', { s: 10, a: 'middle', b: 1 }) +
      r(196, 40, 110, 120, '#ffffff', 12) + t(208, 62, 'Visites', { s: 11, b: 1 }) + t(294, 62, '+38 %', { s: 11, b: 1, a: 'end', c: '#16a34a' }) +
      [24, 34, 30, 46, 52, 70].map((h, i) => r(210 + i * 15, 148 - h, 10, h, i === 5 ? c : '#cbd5e1', 2)).join(''),
    pro: c => fenetre(16, 16, 288, 168, 'Votre parc informatique', c,
      r(30, 48, 80, 52, '#dcfce7', 8) + t(70, 72, '8/8', { s: 18, b: 1, a: 'middle', c: '#16a34a' }) + t(70, 90, 'postes à jour', { s: 9, a: 'middle' }) +
      r(120, 48, 80, 52, '#dcfce7', 8) + t(160, 72, '02:00', { s: 16, b: 1, a: 'middle', c: '#16a34a' }) + t(160, 90, 'sauvegarde OK', { s: 9, a: 'middle' }) +
      r(210, 48, 80, 52, '#fef3c7', 8) + t(250, 72, '1', { s: 18, b: 1, a: 'middle', c: '#b45309' }) + t(250, 90, 'alerte traitée', { s: 9, a: 'middle' }) +
      ok(36, 124) + t(48, 128, 'Antivirus sur tous les postes') + ok(36, 148) + t(48, 152, 'Rapport mensuel envoyé') + t(290, 172, 'Suivi assuré par IloTech', { s: 9, a: 'end', c: '#475569' })),
    reseau: c => {
      const n = (x, y, l) => r(x - 28, y - 14, 56, 28, '#f8fafc', 8) + t(x, y + 4, l, { s: 9.5, a: 'middle', b: 1 });
      return `<g stroke="#fff" stroke-width="2.5" opacity=".85"><path d="M160 46 V86 M160 114 L60 150 M160 114 L127 150 M160 114 L193 150 M160 114 L262 150"/></g>` +
        n(160, 34, 'Box fibre') + r(116, 86, 88, 28, c, 8) + t(160, 104, 'Switch · Wi-Fi pro', { s: 9.5, a: 'middle', b: 1, c: '#fff' }) +
        n(60, 162, 'Accueil') + n(127, 162, 'Bureau') + n(193, 162, 'Imprimante') + n(262, 162, 'Caisse') + ok(296, 40) + t(286, 44, 'Réseau sécurisé', { s: 10, a: 'end', c: '#fff', b: 1 });
    },
    cloud: c => fenetre(16, 16, 288, 168, 'Messagerie', c,
      t(30, 52, 'contact@votre-entreprise.mq', { s: 12, b: 1, c }) +
      [['Client', 'Demande de devis', '09:12'], ['Comptable', 'Factures d’octobre', '08:40'], ['Équipe', 'Planning partagé', 'Hier']].map(([a, b, h], i) =>
        r(28, 64 + i * 32, 264, 26, i ? '#ffffff' : '#eef2ff', 6) + `<circle cx="42" cy="${77 + i * 32}" r="7" fill="${['#f59e0b', '#14b8a6', '#8b5cf6'][i]}"/>` + t(56, 81 + i * 32, a, { s: 10, b: 1 }) + t(124, 81 + i * 32, b, { s: 10 }) + t(284, 81 + i * 32, h, { s: 9, a: 'end', c: '#64748b' })).join('') +
      t(290, 174, 'Sur l’ordinateur et le téléphone', { s: 9, a: 'end', c: '#475569' })),
    cyber: c => fenetre(16, 16, 288, 168, 'Rapport de sécurité', c,
      t(30, 52, 'votre-site.mq', { s: 12, b: 1 }) + t(290, 52, '4 / 5 vérifiés', { s: 11, b: 1, a: 'end', c: '#16a34a' }) +
      [['Certificat HTTPS', 1], ['Mots de passe', 1], ['Sauvegardes', 1], ['Emails (SPF, DMARC)', 0], ['Mises à jour', 1]].map(([a, v], i) =>
        (v ? ok(36, 70 + i * 21) : alerte(36, 70 + i * 21)) + t(48, 74 + i * 21, a) + t(290, 74 + i * 21, v ? 'Vérifié' : 'À corriger', { s: 10, a: 'end', b: 1, c: v ? '#16a34a' : '#b45309' })).join('')),
    caisse: c => r(30, 30, 120, 150, '#1f2937', 10) + r(38, 38, 104, 64, '#0ea5e9', 6, ' opacity=".85"') + t(90, 66, 'Total', { s: 10, a: 'middle', c: '#fff' }) + t(90, 88, '18,50 €', { s: 16, a: 'middle', b: 1, c: '#fff' }) +
      [0, 1, 2].flatMap(i => [0, 1, 2].map(j => r(42 + j * 34, 110 + i * 22, 28, 16, '#374151', 4))).join('') +
      `<path d="M176 20 h120 v160 l-10 -6 l-10 6 l-10 -6 l-10 6 l-10 -6 l-10 6 l-10 -6 l-10 6 l-10 -6 l-10 6 l-10 -6 l-10 6 z" fill="#fff"/>` +
      t(236, 42, 'Ti Kréyol', { s: 12, b: 1, a: 'middle' }) + t(236, 56, 'Ticket n° 0142', { s: 9, a: 'middle', c: '#64748b' }) +
      [['Colombo', '12,00'], ['Jus maracudja', '3,50'], ['Blanc-manger', '3,00']].map(([a, b], i) => t(188, 80 + i * 18, a, { s: 9.5 }) + t(286, 80 + i * 18, b, { s: 9.5, a: 'end' })).join('') +
      `<path d="M188 136 h98" stroke="#cbd5e1" stroke-dasharray="3 3"/>` + t(188, 152, 'Total', { s: 11, b: 1 }) + t(286, 152, '18,50 €', { s: 11, b: 1, a: 'end' }) + t(236, 168, 'Payé par carte ✓', { s: 9, a: 'middle', c: '#16a34a', b: 1 }),
    drone: c => `<defs><linearGradient id="sc-ciel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#e0f2fe"/></linearGradient></defs>` +
      r(14, 14, 292, 172, 'url(#sc-ciel)', 14) + `<path d="M14 120 Q90 100 160 112 T306 104 V186 H14 Z" fill="#0ea5e9" opacity=".55"/><path d="M14 150 Q120 132 200 146 T306 140 V186 H14 Z" fill="#16a34a" opacity=".7"/>` +
      `<path d="M120 132 l40 -26 l40 26 v26 h-80 z" fill="#f8fafc"/><path d="M114 134 l46 -32 l46 32" fill="none" stroke="#b91c1c" stroke-width="6" stroke-linejoin="round"/>` +
      `<g stroke="#fff" stroke-width="2" fill="none" opacity=".95"><path d="M30 30 h18 M30 30 v18 M290 30 h-18 M290 30 v18 M30 170 h18 M30 170 v-18 M290 170 h-18 M290 170 v-18"/><circle cx="160" cy="100" r="10"/><path d="M160 84 v8 M160 108 v8 M144 100 h8 M168 100 h8"/></g>` +
      r(36, 36, 74, 22, '#000', 6, ' opacity=".45"') + t(44, 51, 'ALT 48 m', { s: 10, c: '#fff', b: 1 }) + r(222, 36, 62, 22, '#000', 6, ' opacity=".45"') + `<circle cx="234" cy="47" r="4" fill="#ef4444"/>` + t(242, 51, '4K REC', { s: 10, c: '#fff', b: 1 }) +
      r(36, 150, 128, 22, '#000', 6, ' opacity=".45"') + t(44, 165, 'Toiture · vue d’ensemble', { s: 9, c: '#fff' }),
    print3d: c => r(26, 14, 150, 172, '#334155', 12) + r(36, 24, 130, 140, '#0f172a', 8) + r(46, 150, 110, 8, '#475569', 2) + r(50, 34, 102, 8, '#64748b', 3) + r(92, 42, 18, 16, '#94a3b8', 3) + `<path d="M101 58 v10" stroke="#f97316" stroke-width="3"/>` +
      `<path d="M74 150 l10 -76 h34 l10 76 z" fill="${c}"/><path d="M84 74 h34" stroke="#fff" stroke-width="2" opacity=".6"/>` + [96, 110, 124, 138].map(y => `<path d="M${76 + (150 - y) * .13} ${y} h${50 - (150 - y) * .26}" stroke="#000" stroke-opacity=".15"/>`).join('') +
      r(190, 40, 116, 120, '#ffffff', 12) + t(204, 64, 'Vase', { s: 12, b: 1 }) + t(204, 82, 'PLA · vert', { s: 10, c: '#475569' }) + barre(204, 96, 88, 1, c) + t(204, 128, '100 %', { s: 18, b: 1, c }) + t(204, 146, 'Impression terminée', { s: 9, c: '#475569' })
  };
  Object.assign(S, {
    starlink: c => `<defs><linearGradient id="sc-nuit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e3a8a"/><stop offset="1" stop-color="#7dd3fc"/></linearGradient></defs>` +
      r(14, 14, 180, 172, 'url(#sc-nuit)', 14) + [[40, 34], [70, 52], [150, 30], [170, 60], [110, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('') +
      `<g transform="translate(150 40) rotate(-20)"><rect x="-10" y="-3" width="20" height="6" rx="1" fill="#e2e8f0"/><rect x="-22" y="-2" width="10" height="4" fill="#60a5fa"/><rect x="12" y="-2" width="10" height="4" fill="#60a5fa"/></g>` +
      `<path d="M96 104 Q120 70 146 50" stroke="#fde68a" stroke-width="2" stroke-dasharray="4 4" fill="none"/>` +
      `<path d="M14 160 Q60 120 104 150 T194 140 V186 H14 Z" fill="#16a34a" opacity=".75"/>` +
      `<path d="M52 150 l40 -30 l40 30 v30 h-80 z" fill="#f8fafc"/><path d="M46 152 l46 -36 l46 36" fill="none" stroke="#b91c1c" stroke-width="6" stroke-linejoin="round"/>` +
      `<g transform="translate(96 110) rotate(-25)"><rect x="-13" y="-8" width="26" height="16" rx="2" fill="#f8fafc" stroke="#334155" stroke-width="1.5"/><path d="M0 8 v8" stroke="#334155" stroke-width="2"/></g>` +
      tel(206, 8, t(258, 40, 'Starlink', { s: 12, b: 1, a: 'middle' }) + ok(258, 60) + t(258, 80, 'En ligne', { s: 11, b: 1, a: 'middle', c: '#16a34a' }) +
        t(258, 106, '180', { s: 22, b: 1, a: 'middle', c: '#0f172a' }) + t(258, 120, 'Mb/s', { s: 9, a: 'middle', c: '#475569' }) +
        t(222, 146, 'Obstacles', { s: 8.5 }) + t(294, 146, '0 %', { s: 8.5, a: 'end', b: 1, c: '#16a34a' }) + t(222, 162, 'Wi-Fi', { s: 8.5 }) + t(294, 162, 'Partout', { s: 8.5, a: 'end', b: 1, c: '#16a34a' }), 104, 184),
    onduleur: c => r(18, 26, 150, 148, '#f8fafc', 12) + `<path d="M74 44 l-14 30 h14 l-8 26 l26 -36 h-14 l8 -20 z" fill="#f59e0b"/>` +
      t(93, 124, 'Coupure de courant', { s: 11, b: 1, a: 'middle' }) + t(93, 142, '14:02 · quartier', { s: 10, a: 'middle', c: '#475569' }) + t(93, 162, 'Rien ne s’éteint', { s: 10, a: 'middle', b: 1, c: '#16a34a' }) +
      r(180, 26, 124, 148, '#ffffff', 12) + t(194, 50, 'Onduleur', { s: 12, b: 1 }) + barre(194, 60, 96, .7, '#16a34a') + t(194, 84, '18 min d’autonomie', { s: 10, c: '#475569' }) +
      ok(198, 108) + t(210, 112, 'Ordinateur allumé', { s: 10 }) + ok(198, 130) + t(210, 134, 'Box internet OK', { s: 10 }) + ok(198, 152) + t(210, 156, 'Fichiers sauvés', { s: 10 }),
    ia: c => fenetre(16, 16, 288, 168, 'Assistant IA', c,
      r(120, 44, 172, 34, '#e0e7ff', 10) + t(130, 58, 'Rédige une réponse polie', { s: 10 }) + t(130, 71, 'à ce client pour son devis', { s: 10 }) +
      `<circle cx="38" cy="100" r="10" fill="${c}"/>` + t(38, 104, 'IA', { s: 8, a: 'middle', c: '#fff', b: 1 }) +
      r(54, 88, 200, 62, '#ffffff', 10, ' stroke="#e2e8f0"') + t(64, 104, 'Bonjour Madame Joseph,', { s: 10 }) + t(64, 119, 'merci pour votre demande. Votre', { s: 10 }) + t(64, 134, 'devis est prêt, le voici…', { s: 10 }) +
      ok(36, 168) + t(48, 172, 'On vous apprend à l’utiliser, sans risque', { s: 9.5, c: '#475569' }))
  });
  S.immo = c => fenetre(14, 16, 196, 168, 'Annonce · Le Diamant', c,
      `<defs><linearGradient id="sc-mer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs>` +
      r(24, 44, 176, 78, 'url(#sc-mer)', 8) + `<path d="M24 104 Q70 90 112 100 T200 96 V122 H24 Z" fill="#16a34a" opacity=".8"/>` +
      `<path d="M74 104 l26 -18 l26 18 v14 h-52 z" fill="#f8fafc"/><path d="M70 106 l30 -22 l30 22" fill="none" stroke="#b91c1c" stroke-width="4" stroke-linejoin="round"/>` +
      r(30, 50, 46, 16, '#000', 4, ' opacity=".45"') + t(36, 62, '◉ Drone', { s: 8.5, c: '#fff', b: 1 }) +
      t(26, 140, 'Villa vue mer', { s: 12, b: 1 }) + t(26, 156, '4 chambres · piscine', { s: 9.5, c: '#475569' }) +
      r(26, 164, 70, 14, c, 7) + t(61, 174, 'Visite vidéo', { s: 8, a: 'middle', c: '#fff', b: 1 })) +
    r(220, 40, 88, 130, '#ffffff', 12) + t(264, 62, 'Livré', { s: 11, b: 1, a: 'middle' }) +
    [['15 photos', 82], ['Vue drone', 104], ['Vidéo', 126], ['Annonce', 148]].map(([l, y]) => ok(234, y - 4) + t(244, y, l, { s: 9.5 })).join('');
  const POLE = { info: 'ordi', maison: 'camera', web: 'web', pro: 'pro', crea: 'drone', continuite: 'onduleur', gestion: 'caisse' };

  window.scene = function (o, cls = '') {
    const id = S[o.id] ? o.id : POLE[o.id];
    if (!id) return illustration(o, cls);
    const c = o.couleur || '#2b8cff';
    return `<svg class="illu scene ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Exemple : ${e(o.nom || '')}" font-family="inherit">${fond(id + cls.replace(/\W/g, ''), c)}${S[id](c)}</svg>`;
  };
  // photo de la catégorie (PHOTOS_CAT dans data.js), affichée EN PLUS du dessin ; '' s'il n'y en a pas
  window.photoCat = function (o, cls = '') {
    const p = typeof PHOTOS_CAT !== 'undefined' && PHOTOS_CAT[o.id];
    return p ? `<img class="illu photo ${cls}" src="img/photos/${p}.jpg" alt="${e(o.nom || '')} (illustration)" width="410" height="464" loading="lazy" decoding="async">` : '';
  };
  window.visuel = (o, cls = '') => window.photoCat(o, cls) || window.scene(o, cls);
  window.SCENES = Object.keys(S);
})();
