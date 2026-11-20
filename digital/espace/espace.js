/* Espace client IloTech Studio (ilo-tech.com/digital/espace/) : le client valide les publications préparées par l'agence, voit le calendrier,
   remplit son brief et suit ses chiffres. L'agence prépare, le client valide, le hub envoie : rien ne part sans réponse.
   Même compte et même base que les autres applis (commun/base.js). Base : commun/marketing2.sql (mk_espace, mk_avis, mk_brief_maj) :
   aucun accès direct aux tables. Tant que marketing2.sql n'est pas installé, l'appli affiche « ouverture bientôt ».
   Maquette validée : « Hub marketing, espace client » (parties B et C). */
'use strict';

const APP = {
  nom: 'Espace client', titre: 'Espace client — IloTech Studio', accueilConnecte: '#/', pourTel: 'que l’agence puisse vous joindre',
  texteConnexion: 'Votre espace client IloTech Studio : le même compte que Woulib, EventPass et Kaz An Nou.',
  menu: () => [], pages: {}, racines: ['#/'],
  enteteRail: () => '<a class="rail-logo" href="#/" aria-label="Espace client, accueil">Espace client</a>',
  menuBas: () => moi ? [['#/', APP.icones().accueil, 'Accueil', 0], ['#/calendrier', APP.icones().agenda, 'Calendrier'], ['#/brief', APP.icones().brief, 'Brief'],
    ['#/stats', APP.icones().stats, 'Chiffres'], ['#/compte', APP.icones().compte, 'Compte']] : [],
  ongletDe: h => {
    const p = h.split('?')[0];
    if (/^#\/(calendrier|brief|stats|compte)/.test(p)) return '#/' + p.split('/')[1];
    return '#/';
  },
  parent: () => '#/',
  quitter: () => { const a = $('#app'); if (a) a.oninput = a.onsubmit = a.onclick = a.onchange = null; }
};

(() => {
  const svg = (d, c = 'ic') => `<svg class="${c}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    accueil: svg('M3 11l9-7 9 7v9H5zM10 20v-6h4v6'), agenda: svg('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'), brief: svg('M5 4h14v16H5zM8 9h8M8 13h8M8 17h5'),
    stats: svg('M4 20V10M10 20V4M16 20v-8M22 20H2'), compte: svg('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'), retour: svg('M15 6l-6 6 6 6'),
    coche: svg('M5 12l4 4 10-10'), crayon: svg('M4 20l4-1 11-11-3-3L5 16z'), horloge: svg('M12 7v5l3 2M12 3a9 9 0 1 0 0 .01')
  };
  APP.icones = () => IC;

  const TZ = 'America/Martinique';
  const RESEAUX = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube', linkedin: 'LinkedIn', whatsapp: 'WhatsApp', google: 'Google' };
  const nomReseau = r => RESEAUX[String(r).toLowerCase()] || String(r);
  const nb = n => n == null ? '—' : Number(n).toLocaleString('fr-FR');
  const cle = d => new Date(d).toLocaleDateString('sv-SE', { timeZone: TZ });   // AAAA-MM-JJ à l'heure de Martinique
  const jourLong = d => fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }, TZ);
  const jourHeureM = d => fmt(d, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }, TZ);
  const PAS_PRET = /PGRST202|42883|schema cache|does not exist|Could not find/i;

  // état d'une publication, pour le client
  const etat = p => p.statut === 'envoyee' ? ['ok', 'Publiée', 'publiee']
    : p.statut === 'chez_client' && p.avis === 'valide' ? ['info', 'Prévue', 'prevue']
    : p.statut === 'chez_client' && p.avis === 'modif' ? ['gris', 'Modification demandée', 'modif']
    : p.statut === 'chez_client' ? ['att', 'À valider', 'valider'] : ['gris', 'En préparation', 'prepa'];
  const pastilleReseaux = l => (l || []).map(r => `<span class="esp-res">${esc(nomReseau(r))}</span>`).join('');

  let cache = null, compteId = null;
  const charger = async (force = false) => {
    if (!force && cache && Date.now() - cache.t < 20000) return cache.d;
    const d = await q(sb.rpc('mk_espace'));
    cache = { t: Date.now(), d };
    return d;
  };
  const oublierCache = () => { cache = null; };
  const monCompte = d => {
    const l = d.comptes || [];
    return l.find(c => c.id === compteId) || l[0] || null;
  };

  // porte d'entrée de chaque page : connexion, base installée, compte relié
  const entree = async () => {
    if (!exigeCompte()) return null;
    attente();
    let d;
    try { d = await charger(true); }
    catch (e) {
      if (PAS_PRET.test(String(e?.message || e))) vue(`<div class="wrap esp"><div class="vide-etat"><h3>Ouverture très bientôt</h3><p>L’espace client n’est pas encore ouvert. Nous vous prévenons dès qu’il l’est.</p></div></div>`);
      else vue(`<div class="wrap esp"><div class="vide-etat"><h3>Oups</h3><p>${esc(erreur(e))}</p><a class="btn" href="#/">Réessayer</a></div></div>`);
      return null;
    }
    const c = monCompte(d);
    if (!c) {
      vue(`<div class="wrap esp"><div class="vide-etat"><h3>Aucun espace relié à votre compte</h3><p>Votre adresse ${esc(moi.email || '')} n’est pas encore reliée à un espace client. Écrivez-nous : nous la relions en quelques minutes.</p>
        <a class="btn btn-wa" href="${esc(wa('', 'Bonjour, je voudrais accéder à mon espace client IloTech Studio avec l’adresse ' + (moi.email || '')))}" target="_blank" rel="noopener">Écrire sur WhatsApp</a></div></div>`);
      return null;
    }
    compteId = c.id;
    return { d, c };
  };
  const choixCompte = d => (d.comptes || []).length > 1
    ? `<div class="seg esp-comptes" role="group" aria-label="Mon espace">${d.comptes.map(x => `<button type="button" data-compte="${esc(x.id)}" aria-pressed="${x.id === compteId}">${esc(x.nom || x.id)}</button>`).join('')}</div>` : '';
  const brancherComptes = () => {
    const a = $('#app'), avant = a.onclick;
    a.onclick = e => { const b = e.target.closest('[data-compte]'); if (b) { compteId = b.dataset.compte; rendre(); return; } avant?.(e); };
  };
  const carte = (titre, corps, cls = '') => `<section class="carte ${cls}"><h2>${titre}</h2>${corps}</section>`;
  const ligne = p => {
    const [ton, txt, code] = etat(p);
    const contenu = `<span class="esp-l-t"><b>${esc(p.titre || 'Publication')}</b><small>${p.quand ? esc(jourHeureM(p.quand)) : 'Date à fixer'}${p.reseaux?.length ? ' · ' + esc(p.reseaux.map(nomReseau).join(', ')) : ''}</small></span><span class="tag ${ton}">${esc(txt)}</span>`;
    return code === 'valider' || code === 'prevue' || code === 'modif' || code === 'publiee'
      ? `<a class="esp-ligne" href="#/valider/${esc(p.id)}">${contenu}</a>` : `<div class="esp-ligne">${contenu}</div>`;
  };

  // ---------------------------------------------------------------- 1. Accueil
  APP.pages[''] = async () => {
    const r = await entree(); if (!r) return;
    const { d, c } = r, pubs = c.publications || [], now = Date.now(), J = 864e5;
    const avalider = pubs.filter(p => etat(p)[2] === 'valider');
    const semaine = pubs.filter(p => etat(p)[2] !== 'valider' && p.quand && Math.abs(new Date(p.quand) - now) <= 7 * J);
    const s = c.stats || {};
    vue(`<div class="wrap esp"><h1>Bonjour${profil?.prenom ? ' ' + esc(profil.prenom) : ''}</h1>
      <p class="muted esp-sous">${esc(c.nom || c.id)}</p>${choixCompte(d)}
      ${avalider.length ? `<section class="carte esp-urgent"><h2>À valider <span class="tag att">${avalider.length}</span></h2>
        <p class="petit muted">Rien n’est publié sans votre réponse.</p>${avalider.map(ligne).join('')}</section>`
        : carte('À valider', '<p class="muted">Rien à valider pour l’instant. Nous vous prévenons dès qu’une publication est prête.</p>')}
      ${carte('Cette semaine', semaine.length ? semaine.map(ligne).join('') : '<p class="muted">Aucune publication prévue ni publiée sur les 7 derniers et prochains jours.</p>')}
      <section class="carte"><h2>Chiffres des 30 derniers jours</h2><div class="esp-kpis">
        <div><b>${nb(s.publications)}</b><span>publications</span></div><div><b>${nb(s.vues)}</b><span>vues</span></div><div><b>${nb(s.likes)}</b><span>j’aime</span></div></div>
        <p><a href="#/stats">Voir le détail</a></p></section></div>`);
    brancherComptes();
  };

  // ---------------------------------------------------------------- 2. Valider une publication
  APP.pages.valider = async id => {
    const r = await entree(); if (!r) return;
    const p = (r.c.publications || []).find(x => x.id === id);
    if (!p) return vue('<div class="wrap esp"><div class="vide-etat"><h3>Publication introuvable</h3><p>Elle n’est plus chez vous : elle a peut-être déjà été traitée.</p><a class="btn" href="#/">Accueil</a></div></div>');
    const [ton, txt, code] = etat(p), libre = code === 'valider';
    vue(`<div class="wrap esp"><h1>${libre ? 'Valider cette publication' : esc(p.titre || 'Publication')}</h1>
      <article class="carte esp-apercu" aria-label="Aperçu de la publication">
        ${p.media ? `<img src="${esc(p.media)}" alt="Image de la publication" loading="lazy">` : ''}
        ${libre && p.titre ? `<h2 class="esp-titre-pub">${esc(p.titre)}</h2>` : ''}
        <div class="esp-texte">${esc(p.texte).replace(/\n/g, '<br>')}</div>
        <div class="esp-meta"><span class="tag ${ton}">${esc(txt)}</span>${pastilleReseaux(p.reseaux)}</div>
        <p class="petit muted esp-quand">${p.quand ? 'Prévue le ' + esc(jourLong(p.quand)) + ' à ' + esc(heure(p.quand)) : 'Date à fixer avec vous'}</p>
      </article>
      ${libre ? `<form class="f carte" id="fAvis"><label>Un commentaire ? <span class="aide">(obligatoire si vous demandez une modification)</span>
          <textarea name="texte" maxlength="1000" rows="4" placeholder="Ce que vous voulez changer : le texte, l’image, la date…"></textarea></label>
        <button type="button" class="btn btn-ok btn-g btn-plein" data-avis="valide">${IC.coche}Valider : publier à la date prévue</button>
        <button type="button" class="btn btn-sec btn-g btn-plein" data-avis="modif">${IC.crayon}Demander une modification</button></form>`
        : `${p.avis_texte ? `<div class="bandeau info"><span><b>Votre demande :</b> ${esc(p.avis_texte)}</span></div>` : ''}<a class="btn" href="#/">Retour à l’accueil</a>`}</div>`);
    $('#app').onclick = async e => {
      const b = e.target.closest('[data-avis]'); if (!b) return;
      const f = $('#fAvis'), avis = b.dataset.avis, texte = f.texte.value.trim();
      if (avis === 'modif' && texte.length < 3) { f.texte.setAttribute('aria-invalid', 'true'); f.texte.focus(); return toast('Écrivez ce que vous voulez changer.', true); }
      f.querySelectorAll('button').forEach(x => { x.disabled = true; });
      try {
        await q(sb.rpc('mk_avis', { pub: id, avis, texte: texte || null }));
        oublierCache();
        toast(avis === 'valide' ? 'Merci ! La publication partira à la date prévue.' : 'Merci, nous préparons la modification.');
        aller('#/');
      } catch (err) { toast(erreur(err), true); f.querySelectorAll('button').forEach(x => { x.disabled = false; }); }
    };
    $('#app').oninput = e => e.target.removeAttribute?.('aria-invalid');
  };

  // ---------------------------------------------------------------- 3. Calendrier du mois
  APP.pages.calendrier = async () => {
    const r = await entree(); if (!r) return;
    const pubs = (r.c.publications || []).filter(p => p.quand);
    const aujourdhui = cle(Date.now());
    let [an, mo] = (param().m || aujourdhui.slice(0, 7)).split('-').map(Number);
    if (!(an > 2000 && mo >= 1 && mo <= 12)) { [an, mo] = aujourdhui.slice(0, 7).split('-').map(Number); }
    const mm = n => String(n).padStart(2, '0'), cleM = `${an}-${mm(mo)}`;
    const prec = mo === 1 ? `${an - 1}-12` : `${an}-${mm(mo - 1)}`, suiv = mo === 12 ? `${an + 1}-01` : `${an}-${mm(mo + 1)}`;
    const nbJours = new Date(an, mo, 0).getDate(), decal = (new Date(an, mo - 1, 1).getDay() + 6) % 7;
    const parJour = {};
    pubs.forEach(p => (parJour[cle(p.quand)] = parJour[cle(p.quand)] || []).push(p));
    const cases = [...Array(decal).fill('<i class="esp-vide" aria-hidden="true"></i>')];
    for (let j = 1; j <= nbJours; j++) {
      const k = `${cleM}-${mm(j)}`, l = parJour[k] || [];
      const codes = [...new Set(l.map(p => etat(p)[2]))];
      cases.push(`<div class="esp-jour${k === aujourdhui ? ' auj' : ''}${l.length ? ' plein' : ''}" ${l.length ? `aria-label="${j} : ${l.map(p => esc(etat(p)[1])).join(', ')}"` : ''}><b>${j}</b>
        <span class="esp-pts" aria-hidden="true">${codes.slice(0, 3).map(c => `<i class="pt-${c}"></i>`).join('')}</span></div>`);
    }
    const duMois = pubs.filter(p => cle(p.quand).startsWith(cleM)).sort((a, b) => new Date(a.quand) - new Date(b.quand));
    const titreMois = new Date(an, mo - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    vue(`<div class="wrap esp"><h1>Calendrier</h1>${choixCompte(r.d)}
      <section class="carte"><div class="esp-mois"><a class="btn-icone" href="#/calendrier?m=${prec}" aria-label="Mois précédent">‹</a><h2>${esc(titreMois)}</h2><a class="btn-icone" href="#/calendrier?m=${suiv}" aria-label="Mois suivant">›</a></div>
        <div class="esp-grille" role="grid" aria-label="${esc(titreMois)}">${['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(x => `<span class="esp-sem" aria-hidden="true">${x}</span>`).join('')}${cases.join('')}</div>
        <p class="esp-legende"><span><i class="pt-publiee"></i>Publiée</span><span><i class="pt-prevue"></i>Prévue</span><span><i class="pt-valider"></i>À valider</span></p></section>
      ${carte('Ce mois-ci', duMois.length ? duMois.map(ligne).join('') : '<p class="muted">Aucune publication ce mois-ci.</p>')}</div>`);
    brancherComptes();
  };

  // ---------------------------------------------------------------- 4. Brief
  APP.pages.brief = async () => {
    const r = await entree(); if (!r) return;
    const b = r.c.brief || {};
    vue(`<div class="wrap esp"><h1>Votre brief</h1><p class="muted esp-sous">Dites-nous ce qui compte : nous nous en servons pour écrire vos publications.</p>${choixCompte(r.d)}
      <form class="f carte" id="fBrief">
        <label>Ce que nous mettons en avant<textarea name="met_en_avant" maxlength="500" rows="3" placeholder="Vos produits phares, une promotion, un événement…">${esc(b.met_en_avant || '')}</textarea></label>
        <label>Le ton que vous voulez<textarea name="ton" maxlength="500" rows="3" placeholder="Chaleureux, professionnel, drôle, tutoiement ou vouvoiement…">${esc(b.ton || '')}</textarea></label>
        <label>Ce qu’il faut éviter<textarea name="a_eviter" maxlength="500" rows="3" placeholder="Des sujets, des mots, des prix à ne pas montrer…">${esc(b.a_eviter || '')}</textarea></label>
        <button class="btn btn-p btn-g btn-plein">Enregistrer mon brief</button>
        ${b.maj_le ? `<p class="petit muted esp-quand">Dernière mise à jour : ${esc(jourHeureM(b.maj_le))}</p>` : ''}</form>
      <section class="carte"><h2>Vos photos <span class="tag gris">Bientôt</span></h2><p class="muted">L’envoi de vos photos et vidéos depuis l’espace arrive bientôt. En attendant, envoyez-les-nous sur WhatsApp.</p>
        <a class="btn" href="${esc(wa('', 'Bonjour, voici des photos pour mes publications (' + (r.c.nom || r.c.id) + ')'))}" target="_blank" rel="noopener">Envoyer sur WhatsApp</a></section></div>`);
    brancherComptes();
    $('#app').onsubmit = async e => {
      e.preventDefault();
      const f = e.target, bt = f.querySelector('button'); bt.disabled = true;
      try {
        await q(sb.rpc('mk_brief_maj', { compte: compteId, met_en_avant: f.met_en_avant.value, ton: f.ton.value, a_eviter: f.a_eviter.value }));
        oublierCache(); toast('Brief enregistré. Merci !');
      } catch (err) { toast(erreur(err), true); }
      bt.disabled = false;
    };
  };

  // ---------------------------------------------------------------- 5. Statistiques 30 jours
  APP.pages.stats = async () => {
    const r = await entree(); if (!r) return;
    const s = r.c.stats || {}, res = s.reseaux || [];
    vue(`<div class="wrap esp"><h1>Vos chiffres</h1><p class="muted esp-sous">Les 30 derniers jours · « — » : pas encore connu.</p>${choixCompte(r.d)}
      <div class="esp-kpis esp-kpis-g"><div><b>${nb(s.publications)}</b><span>publications</span></div><div><b>${nb(s.vues)}</b><span>vues</span></div><div><b>${nb(s.likes)}</b><span>j’aime</span></div></div>
      ${carte('Par réseau', res.length ? `<div class="tableau"><table class="t"><thead><tr><th scope="col">Réseau</th><th scope="col" class="num">Posts</th><th scope="col" class="num">Vues</th><th scope="col" class="num">J’aime</th></tr></thead>
        <tbody>${res.map(x => `<tr><th scope="row">${esc(nomReseau(x.reseau))}</th><td class="num">${nb(x.publications)}</td><td class="num">${nb(x.vues)}</td><td class="num">${nb(x.likes)}</td></tr>`).join('')}</tbody></table></div>`
        : '<p class="muted">Pas encore de chiffres : ils arrivent après vos premières publications.</p>')}
      ${carte('Meilleure publication', '<p class="esp-gros">—</p><p class="muted petit">Nous l’afficherons dès que les réseaux nous donnent les chiffres de chaque publication.</p>')}</div>`);
    brancherComptes();
  };

  // ---------------------------------------------------------------- 6. Compte et factures
  APP.pages.compte = async () => {
    const r = await entree(); if (!r) return;
    const reseaux = [...new Set([...(r.c.publications || []).flatMap(p => p.reseaux || []), ...((r.c.stats?.reseaux) || []).map(x => x.reseau)])];
    vue(`<div class="wrap esp"><h1>Mon compte</h1>${choixCompte(r.d)}
      ${carte('Mon espace', `<p><b>${esc(r.c.nom || r.c.id)}</b></p><p class="muted">Connecté : ${esc(moi.email || '')}</p>`)}
      ${carte('Réseaux branchés', reseaux.length ? `<div class="esp-meta">${pastilleReseaux(reseaux)}</div>` : '<p class="muted">Aucun réseau pour l’instant : il apparaît après la première publication.</p>')}
      ${carte('Devis et factures', '<p class="muted">Vos devis, factures et paiements sont dans votre espace client NEXORA.</p><a class="btn btn-p" href="../../nexora/#/client">Ouvrir mes devis et factures</a>')}
      <p class="centre"><a class="btn" href="#/deconnexion">Se déconnecter</a></p></div>`);
    brancherComptes();
  };
  demarrer();   // commun/base.js : connexion, pages, transitions
})();
