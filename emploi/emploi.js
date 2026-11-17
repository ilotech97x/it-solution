/* Travay : les offres d'emploi du groupe. Les entreprises publient depuis NEXORA (nexora/recrutement.sql) ; le public consulte, filtre, garde des favoris,
   crée des alertes, postule avec le compte commun et suit ses candidatures. Les règles (offres visibles, loi, étapes, RGPD) sont dans la base
   (emploi/emploi.sql : fonctions emp_*) ; ce fichier les affiche. Base commune : commun/base.js. Tout est dans une fonction : aucun nom global en plus de APP. */
'use strict';

const APP = {
  nom: 'Travay', titre: 'Travay — offres d’emploi en Martinique et dans les outre-mer', accueilConnecte: '#/', apresInscription: '#/', pourTel: 'que les entreprises puissent vous répondre',
  texteConnexion: 'Un seul compte pour Travay, Woulib, EventPass, Sousou et Kaz An Nou.',
  menu: () => [], pages: {}, racines: ['#/', '#/entreprises', '#/favoris', '#/candidatures'],
  enteteRail: () => '<a class="rail-logo" href="#/" aria-label="Travay, accueil">Travay</a>',
  menuBas: () => [['#/', APP.icones().offres, 'Offres'], ['#/entreprises', APP.icones().entreprises, 'Entreprises'], ['#/favoris', APP.icones().coeur, 'Favoris'],
    ['#/candidatures', APP.icones().candidatures, 'Candidatures'], [moi ? '#/compte' : '#/connexion', APP.icones().compte, 'Profil']],
  ongletDe: h => {
    const p = h.split('?')[0];
    if (/^#\/(entreprises|entreprise)/.test(p)) return '#/entreprises';
    if (p === '#/favoris') return '#/favoris';
    if (/^#\/(candidatures|postuler)/.test(p)) return '#/candidatures';
    if (/^#\/(compte|connexion|inscription)/.test(p)) return moi ? '#/compte' : '#/connexion';
    return '#/';
  },
  parent: h => /^#\/postuler\//.test(h) ? h.replace('#/postuler/', '#/offre/') : /^#\/entreprise\//.test(h) ? '#/entreprises' : '#/'
};

(() => {
  const svg = d => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    offres: svg('M3 8h18v12H3zM8 8V5h8v3M3 13h18'), entreprises: svg('M4 21V5l8-2v18M12 9h8v12M7 9h2M7 13h2M7 17h2M15 13h2M15 17h2'),
    coeur: svg('M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'), candidatures: svg('M9 4h6v3H9zM7 5H5v16h14V5h-2M9 14l2 2 4-4'),
    cloche: svg('M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4'), compte: svg('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'), retour: svg('M15 6l-6 6 6 6'),
    partage: svg('M12 3v12M7 8l5-5 5 5M5 14v6h14v-6'), croix: svg('M6 6l12 12M18 6L6 18'), coche: svg('M5 12l4 4 10-10')
  };
  APP.icones = () => IC;

  const CONTRATS = { CDI: 'CDI', CDD: 'CDD', interim: 'Intérim', alternance: 'Alternance', stage: 'Stage', saisonnier: 'Saisonnier', freelance: 'Freelance' };
  const SECTEURS = { commerce: 'Commerce', restauration: 'Restauration', batiment: 'Bâtiment', sante: 'Santé et social', numerique: 'Numérique', transport: 'Transport et logistique', tourisme: 'Tourisme et hôtellerie',
    services: 'Services', education: 'Éducation', agriculture: 'Agriculture et pêche', industrie: 'Industrie', administration: 'Administration', autre: 'Autre' };
  const TERRS = ['Martinique', 'Guadeloupe', 'Guyane', 'Saint-Martin', 'Saint-Barthélemy', 'La Réunion', 'Mayotte', 'Hexagone et Corse', 'Autre pays'];
  const TELE = { partiel: 'Télétravail partiel', total: 'Télétravail total' };
  const opts = (liste, cur, vide) => (vide ? `<option value="">${esc(vide)}</option>` : '') + Object.entries(liste).map(([k, t]) => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const optsT = (cur, vide) => `<option value="">${esc(vide)}</option>` + TERRS.map(t => `<option ${t === cur ? 'selected' : ''}>${esc(t)}</option>`).join('');
  const mesure = e => { try { return fmt(e, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (x) { return ''; } };
  const depuis = d => { const j = Math.floor((Date.now() - new Date(d)) / 864e5); return j <= 0 ? 'Publiée aujourd’hui' : j === 1 ? 'Publiée hier' : j < 30 ? `Publiée il y a ${j} jours` : `Publiée le ${mesure(d)}`; };
  const nombre = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(Number(n));
  const salaire = o => {
    if (o.salaire_selon_profil) return 'Salaire selon profil';
    const u = { heure: 'h', mois: 'mois', an: 'an' }[o.salaire_periode] || 'mois';
    if (o.salaire_min != null && o.salaire_max != null && Number(o.salaire_max) !== Number(o.salaire_min)) return `${nombre(o.salaire_min)} – ${nombre(o.salaire_max)} € brut / ${u}`;
    const v = o.salaire_min ?? o.salaire_max; return v != null ? `${nombre(v)} € brut / ${u}` : 'Salaire selon profil';
  };
  const initiale = s => (String(s || '?').trim()[0] || '?').toUpperCase();
  const logo = e => `<span class="o-logo" aria-hidden="true">${e.logo ? `<img src="${esc(photo(e.logo))}" alt="" loading="lazy">` : esc(initiale(e.nom))}</span>`;

  APP.quitter = h => {
    const a = document.getElementById('app'); if (a) a.oninput = a.onsubmit = a.onclick = a.onchange = null;   // réactions propres à une page
    document.body.dataset.page = h.split('?')[0].split('/')[1] || 'accueil';   // pied de page et écosystème seulement sur l'accueil
  };

  // interrupteur : tant que la base n'a pas emploi.sql, « ouverture prochaine »
  let dispo = null;
  const ouvert = () => dispo || (dispo = Promise.resolve(sb.rpc('emp_version')).then(r => !r.error, () => false));
  const prochainement = () => vue(`<div class="wrap emp"><div class="vide-etat"><span class="ico">${IC.offres}</span><h3>Ouverture prochaine</h3><p class="muted">Travay, les offres d’emploi des entreprises de Martinique et des outre-mer, ouvre très bientôt.</p></div></div>`);

  // favoris (identifiants), rechargés à la connexion
  let favoris = null;
  const chargerFavoris = async () => { favoris = new Set(moi ? (await q(sb.rpc('emp_mes_favoris')).catch(() => [])).map(o => o.id) : []); return favoris; };
  APP.apresConnexion = () => { favoris = null; };

  // ---------------------------------------------------------------- cartes
  const tagsOffre = o => [['gris', CONTRATS[o.contrat]], ['gris', o.temps === 'partiel' ? 'Temps partiel' : 'Temps plein'], ...(TELE[o.teletravail] ? [['gris', TELE[o.teletravail]]] : []), ...(o.debutant_accepte ? [['ok', 'Débutant accepté']] : [])];
  const carteOffre = o => `<article class="offre"><a class="o-lien" href="#/offre/${esc(o.id)}"><div class="o-tete">${logo(o.entreprise)}<div><span class="o-titre">${esc(o.intitule)}</span><span class="o-ent">${esc(o.entreprise.nom)}</span></div></div>
    <div class="o-tags">${tagsOffre(o).map(tag).join('')}</div><div class="o-meta"><span>📍 ${esc(o.commune || '')}${o.territoire ? ' · ' + esc(o.territoire) : ''}</span><span class="o-sal">${esc(salaire(o))}</span></div>
    <small class="muted">${esc(depuis(o.publiee_at))}${o.date_limite ? ' · avant le ' + esc(mesure(o.date_limite + 'T12:00:00')) : ''}</small></a>
    <button class="fav" type="button" data-fav="${esc(o.id)}" aria-pressed="${favoris?.has(o.id) ? 'true' : 'false'}" aria-label="Garder l’offre ${esc(o.intitule)} en favoris">${IC.coeur}</button></article>`;
  const carteEntreprise = e => `<a class="offre o-lien" style="padding-right:14px" href="#/entreprise/${esc(e.slug)}"><div class="o-tete">${logo(e)}<div><span class="o-titre">${esc(e.nom)}</span><span class="o-ent">${esc(SECTEURS[e.secteur] || '')}${e.commune ? ' · ' + esc(e.commune) : ''}</span></div></div>
    <p class="muted petit" style="margin:0">${esc(e.resume || '')}${(e.resume || '').length >= 160 ? '…' : ''}</p><span class="tag ok" style="justify-self:start">${e.nb} offre${e.nb > 1 ? 's' : ''} en ligne</span></a>`;

  // favori : un clic sur le cœur (sans quitter la page)
  async function basculerFavori(b) {
    if (!exigeCompte()) return;
    const id = b.dataset.fav, actif = b.getAttribute('aria-pressed') !== 'true';
    try { await q(sb.rpc('emp_favori', { oid: id, actif })); (favoris ||= new Set())[actif ? 'add' : 'delete'](id); document.querySelectorAll(`[data-fav="${id}"]`).forEach(x => x.setAttribute('aria-pressed', String(actif))); toast(actif ? 'Ajoutée à vos favoris.' : 'Retirée de vos favoris.'); }
    catch (e) { toast(erreur(e), true); }
  }

  // ---------------------------------------------------------------- liste des offres et filtres
  const FILTRES_VIDES = { q: '', contrat: [], temps: '', lieu: '', territoire: '', secteur: '', salaire_min: 0, depuis: 0, teletravail: false, debutant: false, tri: 'recent' };
  let F = (() => { try { return { ...FILTRES_VIDES, ...JSON.parse(sessionStorage.getItem('travayFiltres') || '{}') }; } catch (e) { return { ...FILTRES_VIDES }; } })();
  const nbFiltres = () => ['contrat', 'temps', 'lieu', 'territoire', 'secteur', 'salaire_min', 'depuis', 'teletravail', 'debutant'].filter(k => Array.isArray(F[k]) ? F[k].length : F[k]).length;
  const lireForm = f => { const d = new FormData(f); return { q: d.get('q') || '', contrat: d.getAll('contrat'), temps: d.get('temps') || '', lieu: d.get('lieu') || '', territoire: d.get('territoire') || '', secteur: d.get('secteur') || '',
    salaire_min: Number(d.get('salaire_min')) || 0, depuis: Number(d.get('depuis')) || 0, teletravail: d.has('teletravail'), debutant: d.has('debutant'), tri: d.get('tri') || 'recent' }; };

  async function accueil() {
    if (!await ouvert()) return prochainement();
    if (favoris === null) await chargerFavoris();
    let liste = [], total = 0;
    vue(`<div class="wrap emp"><section class="hero-e"><h1>Trouvez votre prochain emploi</h1><p>Les offres publiées directement par les entreprises de Martinique et des outre-mer. Gratuit, sans intermédiaire.</p></section>
      <form class="filtres-f" id="fF" novalidate><div class="recherche"><input type="search" name="q" value="${esc(F.q)}" placeholder="Métier, mot-clé, entreprise…" aria-label="Métier ou mot-clé" autocomplete="off"><button class="btn btn-p" type="submit">Chercher</button></div>
      <details class="filtres-e" style="margin-top:10px" ${nbFiltres() ? 'open' : ''}><summary><span>Filtres</span><span class="nb-f" id="nbF" ${nbFiltres() ? '' : 'hidden'}>${nbFiltres()}</span></summary><div class="corps-f">
        <fieldset><legend>Contrat</legend><div class="chips">${Object.entries(CONTRATS).map(([k, t]) => `<label><input type="checkbox" name="contrat" value="${k}" ${F.contrat.includes(k) ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div></fieldset>
        <div class="g-f"><label>Temps de travail<select name="temps">${opts({ plein: 'Temps plein', partiel: 'Temps partiel' }, F.temps, 'Tous')}</select></label>
          <label>Commune<input name="lieu" value="${esc(F.lieu)}" placeholder="Ex. Le Lamentin" autocomplete="off"></label>
          <label>Territoire<select name="territoire">${optsT(F.territoire, 'Tous')}</select></label>
          <label>Secteur<select name="secteur">${opts(SECTEURS, F.secteur, 'Tous')}</select></label>
          <label>Salaire minimum (€ brut / mois)<input type="number" name="salaire_min" min="0" step="100" inputmode="numeric" value="${F.salaire_min || ''}" placeholder="Ex. 1800"></label>
          <label>Publiée<select name="depuis">${opts({ 1: 'Aujourd’hui', 7: 'Cette semaine', 30: 'Ce mois-ci' }, String(F.depuis), 'À tout moment')}</select></label></div>
        <label class="case-e"><input type="checkbox" name="teletravail" ${F.teletravail ? 'checked' : ''}> Télétravail possible</label>
        <label class="case-e"><input type="checkbox" name="debutant" ${F.debutant ? 'checked' : ''}> Débutant accepté</label>
        <button class="btn btn-sec" type="button" id="raz">Effacer les filtres</button></div></details>
      <div class="ligne-res" style="margin-top:10px"><b id="nbRes" aria-live="polite"></b><label class="petit">Trier par <select name="tri" aria-label="Trier">${opts({ recent: 'Les plus récentes', salaire: 'Salaire décroissant', limite: 'Date limite proche' }, F.tri)}</select></label></div></form>
      <div class="liste-o deux" id="res" aria-busy="true"></div><div class="plus-o" id="plusO"></div>
      <section class="carte"><h2>Vous recrutez ?</h2><p class="muted" style="margin:0 0 10px">Publiez vos offres gratuitement depuis NEXORA, le logiciel de gestion d’IloTech : page entreprise, offres et suivi des candidatures au même endroit.</p><a class="btn btn-sec" href="../nexora/#/recrutement">Publier mes offres avec NEXORA</a></section></div>`);
    const form = $('#fF');
    const dessiner = () => {
      $('#nbRes').textContent = total ? `${total} offre${total > 1 ? 's' : ''}` : 'Aucune offre';
      $('#res').innerHTML = liste.length ? liste.map(carteOffre).join('') : `<div class="vide-etat" style="grid-column:1/-1"><h3>Aucune offre ne correspond</h3><p class="muted">Élargissez votre recherche ou effacez des filtres. Créez une alerte pour être prévenu des nouvelles offres.</p><a class="btn btn-sec" href="#/favoris">Créer une alerte</a></div>`;
      $('#res').setAttribute('aria-busy', 'false'); $('#plusO').innerHTML = liste.length < total ? '<button class="btn btn-sec" type="button" id="plus">Voir plus d’offres</button>' : '';
      const n = nbFiltres(); $('#nbF').hidden = !n; $('#nbF').textContent = n;
    };
    const chercher = async (suite = false) => {
      F = lireForm(form); try { sessionStorage.setItem('travayFiltres', JSON.stringify(F)); } catch (e) { /* navigation privée */ }
      $('#res').setAttribute('aria-busy', 'true');
      try { const r = await q(sb.rpc('emp_offres', { f: { ...F, limite: 20, decalage: suite ? liste.length : 0 } })); total = r.total; liste = suite ? liste.concat(r.offres) : r.offres; dessiner(); }
      catch (e) { $('#res').innerHTML = `<div class="vide-etat" style="grid-column:1/-1"><h3>Oups</h3><p>${esc(erreur(e))}</p></div>`; }
    };
    let minu = null;
    $('#app').oninput = e => { if (e.target.closest('#fF') && e.target.type !== 'checkbox') { clearTimeout(minu); minu = setTimeout(() => chercher(), 300); } };
    $('#app').onchange = e => { if (e.target.closest('#fF')) chercher(); };
    $('#app').onsubmit = e => { e.preventDefault(); chercher(); };
    $('#app').onclick = e => {
      const f = e.target.closest('[data-fav]'); if (f) return basculerFavori(f);
      if (e.target.closest('#plus')) return chercher(true);
      if (e.target.closest('#raz')) { F = { ...FILTRES_VIDES, q: form.q.value, tri: F.tri }; try { sessionStorage.setItem('travayFiltres', JSON.stringify(F)); } catch (x) { /* navigation privée */ } rendre(); }
    };
    await chercher();
  }

  // ---------------------------------------------------------------- fiche d'une offre
  async function offre(id) {
    if (!await ouvert()) return prochainement();
    if (favoris === null) await chargerFavoris();
    attente();
    const o = await q(sb.rpc('emp_offre', { oid: id }));
    if (!o) return vue('<div class="wrap emp"><div class="vide-etat"><h3>Cette offre n’est plus disponible</h3><p class="muted">Elle a été pourvue, mise en pause ou retirée.</p><a class="btn btn-p" href="#/">Voir les autres offres</a></div></div>');
    const e = o.entreprise, deja = o.candidature;
    document.title = `${o.intitule} — ${e.nom} — Travay`;
    vue(`<div class="wrap emp fiche-o"><article class="carte"><div class="o-tete">${logo(e)}<div><a class="o-ent" href="#/entreprise/${esc(e.slug)}">${esc(e.nom)}</a></div></div>
      <h1 style="margin-top:10px">${esc(o.intitule)}</h1><div class="o-tags" style="margin:8px 0">${tagsOffre(o).map(tag).join('')}</div>
      <dl class="dl-e"><dt>Lieu</dt><dd>${esc(o.commune || '')}${o.territoire ? ' · ' + esc(o.territoire) : ''}</dd><dt>Salaire</dt><dd>${esc(salaire(o))}</dd>
        ${o.date_debut ? `<dt>Début</dt><dd>${esc(mesure(o.date_debut + 'T12:00:00'))}</dd>` : ''}${o.date_limite ? `<dt>Candidater avant le</dt><dd>${esc(mesure(o.date_limite + 'T12:00:00'))}</dd>` : ''}</dl></article>
      <section class="carte"><h2>Les missions</h2><p class="bloc">${esc(o.missions)}</p></section>
      ${o.profil ? `<section class="carte"><h2>Le profil recherché</h2><p class="bloc">${esc(o.profil)}</p></section>` : ''}
      <section class="carte"><div class="actions-f">${o.membre ? '<p class="avert" style="grid-column:1/-1;margin:0">Vous faites partie de cette entreprise : vous ne pouvez pas postuler à sa propre offre.</p>'
        : deja ? `<a class="btn btn-p" href="#/candidatures">Vous avez postulé (${esc(({ nouvelle: 'envoyée', a_rencontrer: 'à rencontrer', entretien: 'entretien', retenue: 'retenue', non_retenue: 'non retenue', retiree: 'retirée' })[deja.statut])}) : voir le suivi</a>`
        : `<a class="btn btn-p" id="postuler" href="#/postuler/${esc(o.id)}">Postuler à cette offre</a>`}
        <button class="btn btn-sec" type="button" data-fav="${esc(o.id)}" aria-pressed="${o.favori || favoris?.has(o.id) ? 'true' : 'false'}" id="favB">♡ Favori</button><button class="btn btn-sec" type="button" id="signaler">🚩 Signaler</button></div></section>
      <p class="legal-o">${esc(depuis(o.publiee_at))}. Annonce de ${esc(e.nom)}${e.siret ? ' (SIRET ' + esc(e.siret) + ')' : ''}. Cette offre s’adresse à toutes et tous (H/F) : aucun critère d’âge, de sexe, d’origine, de situation familiale ou de santé n’est admis (Code du travail L1132-1). Une annonce qui ne respecte pas ces règles peut être signalée.</p></div>`);
    const fb = $('#favB'); const maj = () => { fb.textContent = (fb.getAttribute('aria-pressed') === 'true' ? '♥ ' : '♡ ') + 'Favori'; }; maj();
    $('#app').onclick = async ev => {
      const f = ev.target.closest('[data-fav]'); if (f) { await basculerFavori(f); return maj(); }
      if (ev.target.closest('#signaler')) {
        if (!exigeCompte()) return;
        const motif = prompt('Pourquoi signalez-vous cette offre ?\nTapez : faux, arnaque, illegal, harcelement ou autre', 'faux'); if (!motif) return;
        const m = { faux: 'faux', arnaque: 'arnaque', illegal: 'illegal', harcelement: 'harcelement', autre: 'autre' }[motif.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')]; if (!m) return toast('Motif non reconnu.', true);
        try { await q(sb.rpc('signaler', { app: 'emploi', univ: 'emploi', type_objet: 'offre', objet: o.id, motif_s: m, texte: '' })); toast('Merci, le signalement est transmis à la modération.'); } catch (x) { toast(erreur(x), true); }
      }
    };
  }

  // ---------------------------------------------------------------- postuler
  async function postuler(id) {
    if (!exigeCompte()) return;
    if (!await ouvert()) return prochainement();
    attente(); const o = await q(sb.rpc('emp_offre', { oid: id }));
    if (!o) return vue('<div class="wrap emp"><div class="vide-etat"><h3>Cette offre n’est plus disponible</h3><a class="btn btn-p" href="#/">Voir les offres</a></div></div>');
    if (o.candidature) return aller('#/candidatures');
    vue(`<div class="wrap emp"><a href="#/offre/${esc(o.id)}">‹ Retour à l’offre</a><section class="carte"><h1>Postuler</h1><p class="muted" style="margin:4px 0 12px">${esc(o.intitule)} · ${esc(o.entreprise.nom)}</p>
      <form class="f" id="fP"><label>Votre message à l’entreprise<textarea name="message" required minlength="10" maxlength="2000" rows="6" placeholder="Présentez-vous en quelques lignes : votre parcours, ce qui vous motive, vos disponibilités."></textarea></label>
        <label>Téléphone <span class="aide">(l’entreprise vous appelle pour un entretien)</span><input type="tel" name="tel" required pattern="[0-9 +.\\-]{6,20}" value="${esc(contact?.telephone || '')}" autocomplete="tel"></label>
        <label>CV en PDF <span class="aide">(3 Mo au plus, lu seulement par cette entreprise)</span><input type="file" name="cv" accept="application/pdf"></label>
        <label>ou lien vers votre CV <span class="aide">(https://…, facultatif)</span><input type="url" name="cv_url" pattern="https://.+" maxlength="300" placeholder="https://"></label>
        <label style="display:flex;gap:8px;font-weight:600"><input type="checkbox" name="consent" required style="width:auto"> <span>J’accepte que ces informations soient transmises à ${esc(o.entreprise.nom)} pour traiter ma candidature. Elles sont conservées 2 ans au plus ; je peux les consulter et les supprimer à tout moment dans « Candidatures » (<a href="confidentialite.html" target="_blank">confidentialité</a>).</span></label>
        <button class="btn btn-p">Envoyer ma candidature</button></form></section></div>`);
    $('#fP').onsubmit = async ev => {
      ev.preventDefault(); const d = new FormData(ev.target), b = ev.target.querySelector('.btn-p'), fichier = d.get('cv'); b.disabled = true; let chemin = null;
      try {
        if (fichier && fichier.size) {
          if (fichier.type !== 'application/pdf') throw new Error('Le CV doit être un fichier PDF.');
          if (fichier.size > 3 * 1024 * 1024) throw new Error('Le CV dépasse 3 Mo : réduisez-le ou envoyez un lien.');
          chemin = `${moi.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
          await q(sb.storage.from('cv').upload(chemin, fichier, { contentType: 'application/pdf' }));
        }
        try { await q(sb.rpc('emp_postuler', { oid: o.id, message_s: d.get('message'), tel_s: d.get('tel'), cv_url_s: d.get('cv_url') || null, cv_chemin_s: chemin, consentement: d.has('consent') })); }
        catch (x) { if (chemin) await sb.storage.from('cv').remove([chemin]).catch(() => {}); throw x; }
        toast('Candidature envoyée. Bonne chance !'); aller('#/candidatures');
      } catch (x) { toast(erreur(x), true); b.disabled = false; }
    };
  }

  // ---------------------------------------------------------------- mes candidatures
  const ETAPES = [['nouvelle', 'Envoyée'], ['a_rencontrer', 'À rencontrer'], ['entretien', 'Entretien'], ['decision', 'Décision']];
  const rang = s => ({ nouvelle: 0, a_rencontrer: 1, entretien: 2, retenue: 3, non_retenue: 3, retiree: 0 })[s];
  async function candidatures() {
    if (!exigeCompte()) return;
    if (!await ouvert()) return prochainement();
    attente(); const l = await q(sb.rpc('emp_mes_candidatures'));
    const fin = s => ['retenue', 'non_retenue', 'retiree'].includes(s);
    vue(`<div class="wrap emp"><h1>Mes candidatures</h1>${l.length ? `<div class="liste-o">${l.map(c => `<article class="carte cand"><div><b><a href="${c.offre_en_ligne ? '#/offre/' + esc(c.offre_id) : '#/candidatures'}">${esc(c.intitule)}</a></b><br><span class="muted">${esc(c.entreprise)} · envoyée le ${esc(mesure(c.created_at))}</span></div>
      ${c.statut === 'retiree' ? '<span class="tag gris" style="justify-self:start">Candidature retirée</span>' : `<ol class="etapes" aria-label="Suivi">${ETAPES.map(([k, t], i) => {
        const r = rang(c.statut), cl = i <= r ? (i === 3 && c.statut === 'non_retenue' ? 'ko' : 'fait') : ''; const txt = i === 3 ? (c.statut === 'retenue' ? 'Retenue' : c.statut === 'non_retenue' ? 'Non retenue' : 'Décision') : t;
        return `<li class="${cl}">${esc(txt)}${cl ? '<span class="sr"> (atteint)</span>' : ''}</li>`; }).join('')}</ol>`}
      ${c.motif ? `<p class="petit" style="margin:0"><b>Motif :</b> ${esc(c.motif)}</p>` : ''}${c.reponse ? `<div class="reponse-e"><b>Message de ${esc(c.entreprise)}</b><br>${esc(c.reponse)}</div>` : ''}
      <div class="actions-r">${fin(c.statut) ? '' : `<button class="btn btn-sec btn-s" data-retirer="${esc(c.id)}">Retirer ma candidature</button>`}<button class="btn btn-sec btn-s" data-suppr="${esc(c.id)}">Supprimer mes données</button></div></article>`).join('')}</div>`
      : `<div class="vide-etat"><span class="ico">${IC.candidatures}</span><h3>Aucune candidature</h3><p class="muted">Quand vous postulez, vous suivez ici chaque étape : envoyée, à rencontrer, entretien, décision.</p><a class="btn btn-p" href="#/">Voir les offres</a></div>`}
      <p class="muted petit">Vos candidatures sont conservées 2 ans au plus puis supprimées automatiquement. « Supprimer mes données » efface la candidature et le CV déposé.</p></div>`);
    $('#app').onclick = async ev => {
      const r = ev.target.closest('[data-retirer]'), s = ev.target.closest('[data-suppr]');
      try {
        if (r) { if (!confirm('Retirer cette candidature ? L’entreprise verra qu’elle est retirée.')) return; await q(sb.rpc('emp_retirer_candidature', { cid: r.dataset.retirer })); toast('Candidature retirée.'); rendre(); }
        if (s) { if (!confirm('Supprimer définitivement cette candidature et votre CV ? Cette action est irréversible.')) return;
          const chemin = await q(sb.rpc('emp_supprimer_candidature', { cid: s.dataset.suppr })); if (chemin) await sb.storage.from('cv').remove([chemin]).catch(() => {}); toast('Candidature et CV supprimés.'); rendre(); }
      } catch (x) { toast(erreur(x), true); }
    };
  }

  // ---------------------------------------------------------------- entreprises
  async function entreprises() {
    if (!await ouvert()) return prochainement();
    const f = { secteur: '', territoire: '', q: '' }; let l = [];
    vue(`<div class="wrap emp"><h1>Les entreprises qui recrutent</h1><form class="f" id="fE" novalidate><div class="recherche"><input type="search" name="q" placeholder="Nom de l’entreprise…" aria-label="Nom de l’entreprise" autocomplete="off"></div>
      <div class="g-f" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px"><label>Secteur<select name="secteur">${opts(SECTEURS, '', 'Tous')}</select></label><label>Territoire<select name="territoire">${optsT('', 'Tous')}</select></label></div></form>
      <div class="liste-o deux" id="resE" aria-busy="true"></div></div>`);
    const chercher = async () => { Object.assign(f, Object.fromEntries(new FormData($('#fE'))));
      try { l = await q(sb.rpc('emp_entreprises', { f })); $('#resE').innerHTML = l.length ? l.map(carteEntreprise).join('') : '<div class="vide-etat" style="grid-column:1/-1"><h3>Aucune entreprise ne recrute avec ces critères</h3></div>'; $('#resE').setAttribute('aria-busy', 'false'); }
      catch (e) { $('#resE').innerHTML = `<p>${esc(erreur(e))}</p>`; } };
    let minu = null; $('#app').oninput = () => { clearTimeout(minu); minu = setTimeout(chercher, 300); }; $('#app').onchange = chercher; $('#app').onsubmit = e => { e.preventDefault(); chercher(); };
    await chercher();
  }
  async function entreprise(slug) {
    if (!await ouvert()) return prochainement();
    if (favoris === null) await chargerFavoris();
    attente(); const e = await q(sb.rpc('emp_entreprise', { slug_s: slug }));
    if (!e) return vue('<div class="wrap emp"><div class="vide-etat"><h3>Entreprise introuvable</h3><a class="btn btn-p" href="#/entreprises">Les entreprises qui recrutent</a></div></div>');
    document.title = `${e.nom} recrute — Travay`;
    vue(`<div class="wrap emp"><section class="carte"><div class="o-tete">${logo(e)}<div><h1 style="font-size:22px">${esc(e.nom)}</h1><span class="o-ent">${esc(SECTEURS[e.secteur] || '')} · ${esc(e.commune || '')}${e.territoire ? ', ' + esc(e.territoire) : ''} · ${esc(e.taille)} personnes</span></div></div>
      <p class="bloc" style="white-space:pre-line;overflow-wrap:anywhere;margin:12px 0 0">${esc(e.presentation)}</p>
      ${(e.valeurs || []).length ? `<h2 style="margin-top:14px">Nos valeurs</h2><div class="o-tags">${e.valeurs.map(v => tag(['gris', v])).join('')}</div>` : ''}
      ${(e.avantages || []).length ? `<h2 style="margin-top:14px">Les avantages</h2><div class="o-tags">${e.avantages.map(v => tag(['ok', v])).join('')}</div>` : ''}
      <p class="legal-o" style="margin:12px 0 0">${e.siret ? 'SIRET ' + esc(e.siret) + '. ' : ''}${e.site_web ? `<a href="${esc(e.site_web)}" target="_blank" rel="noopener noreferrer">Site web</a>` : ''}</p></section>
      <h2>${e.offres.length} offre${e.offres.length > 1 ? 's' : ''} en ligne</h2><div class="liste-o deux">${e.offres.map(carteOffre).join('') || '<div class="vide-mini"><b>Aucune offre en ce moment</b></div>'}</div></div>`);
    $('#app').onclick = ev => { const f = ev.target.closest('[data-fav]'); if (f) basculerFavori(f); };
  }

  // ---------------------------------------------------------------- favoris et alertes
  async function pageFavoris() {
    if (!await ouvert()) return prochainement();
    if (!moi) return vue(`<div class="wrap emp"><h1>Favoris et alertes</h1><div class="vide-etat"><span class="ico">${IC.coeur}</span><h3>Gardez les offres qui vous plaisent</h3><p class="muted">Avec un compte, gardez des offres en favoris et recevez une notification quand une nouvelle offre correspond à votre recherche.</p><a class="btn btn-p" href="#/connexion?retour=${encodeURIComponent('#/favoris')}">Se connecter</a></div></div>`);
    attente(); const [fav, al] = await Promise.all([q(sb.rpc('emp_mes_favoris')), q(sb.from('emp_alertes').select('*').order('created_at'))]); favoris = new Set(fav.map(o => o.id));
    const texteAlerte = a => [a.mots && `« ${a.mots} »`, a.contrat && CONTRATS[a.contrat], a.territoire, a.commune, a.teletravail && 'télétravail', a.debutant && 'débutant accepté', a.salaire_min && `dès ${nombre(a.salaire_min)} €/mois`].filter(Boolean).join(' · ') || 'Toutes les offres';
    vue(`<div class="wrap emp"><h1>Favoris et alertes</h1><section><h2>Mes favoris</h2>${fav.length ? `<div class="liste-o deux">${fav.map(carteOffre).join('')}</div>` : '<div class="vide-mini"><b>Aucun favori</b><span>Touchez le cœur d’une offre pour la retrouver ici.</span></div>'}</section>
      <section class="carte"><h2>Mes alertes d’emploi</h2><p class="muted petit" style="margin:0 0 10px">Vous êtes prévenu dans l’appli (cloche) quand une nouvelle offre correspond. 5 alertes au plus.</p>
        ${al.length ? `<ul class="alertes-l">${al.map(a => `<li><span>🔔 ${esc(texteAlerte(a))}</span><button class="btn btn-sec btn-s" data-sup="${esc(a.id)}" aria-label="Supprimer l’alerte">Supprimer</button></li>`).join('')}</ul>` : ''}
        <details class="plus-options" style="margin-top:10px"><summary>Créer une alerte</summary><form class="f" id="fA" style="margin-top:10px"><label>Mots-clés<input name="mots" maxlength="100" placeholder="Ex. cuisinier"></label>
          <div class="ligne2"><label>Contrat<select name="contrat">${opts(CONTRATS, '', 'Tous')}</select></label><label>Territoire<select name="territoire">${optsT('', 'Tous')}</select></label></div>
          <div class="ligne2"><label>Commune<input name="commune" maxlength="80"></label><label>Salaire minimum (€ / mois)<input type="number" name="salaire_min" min="0" step="100"></label></div>
          <label class="case-e"><input type="checkbox" name="teletravail"> Télétravail possible</label><label class="case-e"><input type="checkbox" name="debutant"> Débutant accepté</label><button class="btn btn-p">Créer l’alerte</button></form></details></section></div>`);
    $('#app').onclick = async ev => {
      const f = ev.target.closest('[data-fav]'); if (f) { await basculerFavori(f); return rendre(); }
      const s = ev.target.closest('[data-sup]'); if (s) { try { await q(sb.from('emp_alertes').delete().eq('id', s.dataset.sup)); toast('Alerte supprimée.'); rendre(); } catch (x) { toast(erreur(x), true); } }
    };
    $('#fA').onsubmit = async ev => {
      ev.preventDefault(); const d = new FormData(ev.target);
      try { await q(sb.from('emp_alertes').insert({ mots: d.get('mots').trim() || null, contrat: d.get('contrat') || null, territoire: d.get('territoire') || null, commune: d.get('commune').trim() || null, teletravail: d.has('teletravail'), debutant: d.has('debutant'), salaire_min: Number(d.get('salaire_min')) || null }));
        toast('Alerte créée.'); rendre(); } catch (x) { toast(erreur(x), true); }
    };
  }

  // ---------------------------------------------------------------- profil
  async function compte() {
    if (!moi) return aller('#/connexion');
    vue(`<div class="wrap emp"><h1>Profil</h1><section class="carte profil-l"><div style="display:flex;gap:12px;align-items:center"><span class="pastille" aria-hidden="true">${esc(initiale(profil?.prenom))}</span><div><b>${esc(((profil?.prenom || '') + ' ' + (profil?.nom || '')).trim() || 'Mon compte')}</b><br><span class="muted petit">${esc(moi.email || '')}</span></div></div>
      <p class="petit muted" style="margin:0">Votre compte est le même pour Travay, Woulib, EventPass, Sousou et Kaz An Nou : nom, téléphone et mot de passe se changent dans le compte commun.</p><a class="btn btn-sec btn-plein" href="https://ilo-tech.com/pass/#/compte">Gérer mon compte commun</a></section>
      <section class="carte"><h2>Mes données (RGPD)</h2><p class="muted petit" style="margin:0 0 10px">Vous pouvez à tout moment télécharger tout ce que Travay garde sur vous, ou supprimer vos candidatures.</p><div class="actions-r"><button class="btn btn-sec" id="export">Télécharger mes données</button><a class="btn btn-sec" href="#/candidatures">Mes candidatures</a></div></section>
      <section class="carte"><h2>Vous recrutez ?</h2><a class="btn btn-sec btn-plein" href="../nexora/#/recrutement">Publier des offres avec NEXORA</a></section>
      <section class="carte"><ul class="menu-liens"><li><a href="#/notifs">Notifications <span aria-hidden="true">›</span></a></li><li><a href="cgu.html">Conditions d’utilisation <span aria-hidden="true">›</span></a></li><li><a href="confidentialite.html">Confidentialité <span aria-hidden="true">›</span></a></li></ul></section>
      <a class="btn btn-sec btn-plein" href="#/deconnexion">Se déconnecter</a></div>`);
    $('#app').onclick = async ev => {
      if (!ev.target.closest('#export')) return;
      try { const d = await q(sb.rpc('emp_mes_donnees')), u = URL.createObjectURL(new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })), a = document.createElement('a');
        a.href = u; a.download = 'travay-mes-donnees.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); toast('Fichier téléchargé.'); } catch (x) { toast(erreur(x), true); }
    };
  }

  Object.assign(APP.pages, { '': accueil, offre, postuler, candidatures, entreprises, entreprise, favoris: pageFavoris, compte });
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  demarrer();
})();
