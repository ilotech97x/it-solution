/* Woulib : organiser un projet (anniversaire, mariage, séjour, déménagement…). Un plan d'étapes qui envoie vers le bon service
   de l'écosystème (repas, transport, lieu, prestataires, invitations, excursions), avec budget et avancement. Données : projets.sql. */
'use strict';
// où trouver chaque type d'étape dans l'écosystème
const OU = { food: ['🍛', 'Repas et traiteur', '#/manger'], move: ['🚗', 'Transport', '#/move'], express: ['📦', 'Livraison', '#/express'],
  events: ['🎟️', 'Invitations QR code (EventPass)', '../pass/#/orga'], experiences: ['🌴', 'Activités et excursions', '../pass/#/?genre=experience'],
  living: ['🏡', 'Lieu ou logement (Kaz An Nou)', 'https://immo.ilo-tech.com/'], services: ['🔧', 'Prestataires (Kaz An Nou)', 'https://immo.ilo-tech.com/#/services'],
  rental: ['🚙', 'Location de matériel', null], autre: ['✅', 'À faire', null] };
const MODELES = {
  anniversaire: ['🎂', 'Anniversaire', [['Trouver le lieu', 'living'], ['Repas et boissons', 'food'], ['DJ ou animateur', 'services'], ['Matériel et décoration', 'rental'], ['Invitations', 'events'], ['Transport des invités', 'move'], ['Gâteau', 'food']]],
  mariage: ['💍', 'Mariage', [['Lieu de réception', 'living'], ['Traiteur', 'food'], ['DJ et animation', 'services'], ['Photographe', 'services'], ['Tente, tables, sono', 'rental'], ['Invitations et liste des invités', 'events'], ['Navettes des invités', 'move'], ['Hébergement des invités', 'living'], ['Décoration et fleurs', 'services']]],
  soiree: ['🪩', 'Soirée', [['Lieu', 'living'], ['Billetterie ou invitations', 'events'], ['Boissons et snack', 'food'], ['DJ', 'services'], ['Sono et lumières', 'rental'], ['Retour en VTC des invités', 'move']]],
  sejour: ['🌴', 'Séjour ou vacances', [['Logement', 'living'], ['Transfert aéroport', 'move'], ['Excursions et activités', 'experiences'], ['Restaurants', 'food'], ['Location de voiture', 'rental'], ['Ménage et accueil', 'services']]],
  demenagement: ['📦', 'Déménagement', [['Déménageurs', 'services'], ['Cartons et petits colis', 'express'], ['Ménage de fin de bail', 'services'], ['Installation internet et Wi-Fi', 'services'], ['Repas pour l’équipe', 'food']]],
  touristes: ['🧳', 'Accueillir des visiteurs', [['Navette aéroport', 'move'], ['Hébergement', 'living'], ['Visites et excursions', 'experiences'], ['Restaurants à faire découvrir', 'food'], ['Location de voiture', 'rental']]],
  libre: ['✨', 'Projet libre', []] };
// « décrivez votre projet » : choix du modèle d'après les mots employés
const deviner = t => { t = (t || '').toLowerCase();
  return /mari|noce|pacs/.test(t) ? 'mariage' : /anniv|bapt|communion|fête d|ans de/.test(t) ? 'anniversaire' : /soir|fête|party|concert/.test(t) ? 'soiree'
    : /vacance|séjour|sejour|voyage|week-end|weekend/.test(t) ? 'sejour' : /déménag|demenag|emménag/.test(t) ? 'demenagement' : /touriste|famille arrive|visiteur|accueillir/.test(t) ? 'touristes' : 'libre'; };

APP.pages.projets = async sous => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  if (sous === 'nouveau') return nouveauProjet();
  const l = await q(sb.from('projets').select('*').order('date_prevue', { ascending: true, nullsFirst: false }));
  vue(`<div class="wrap bienvenue"><h1>🗂️ Mes projets</h1><p class="muted">Anniversaire, mariage, séjour, déménagement : Woulib prépare la liste des étapes et vous envoie vers les bons services, au même endroit.</p>
    <form class="recherche-unique" id="fIdee"><div class="rch"><span aria-hidden="true">✨</span><input name="idee" placeholder="Décrivez votre projet : « les 40 ans de Paul en juillet, 50 personnes »" autocomplete="off"><button class="btn btn-p">Préparer</button></div></form>
    <div class="profils" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))">${Object.entries(MODELES).map(([k, [i, t, e]]) => `<a class="profil-c" href="#/projets/nouveau?modele=${k}"><span>${i}</span><div><b>${t}</b><small>${e.length ? e.length + ' étapes prêtes' : 'Vos propres étapes'}</small></div><i>›</i></a>`).join('')}</div>
    ${l.length ? `<h2>En cours</h2><div class="profils">${l.map(p => { const f = p.etapes.filter(e => e.fait).length, tot = p.etapes.reduce((t, e) => t + Number(e.montant || 0), 0);
      return `<a class="profil-c" href="#/projet/${p.id}"><span>${MODELES[p.modele]?.[0] || '✨'}</span><div><b>${esc(p.titre)}</b><small>${p.date_prevue ? esc(new Date(p.date_prevue + 'T12:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })) + ' · ' : ''}${f}/${p.etapes.length} étapes${p.budget ? ` · ${eur(tot)} / ${eur(p.budget)}` : ''}</small>
        <i class="prog"><i style="width:${p.etapes.length ? f / p.etapes.length * 100 : 0}%"></i></i></div><i>›</i></a>`; }).join('')}</div>` : ''}</div>`);
  $('#fIdee').addEventListener('submit', e => { e.preventDefault(); const t = e.target.idee.value.trim(); if (!t) return;
    aller('#/projets/nouveau?' + new URLSearchParams({ modele: deviner(t), titre: t.slice(0, 120) })); });
};

async function nouveauProjet() {
  const p = param(), m = MODELES[p.modele] ? p.modele : 'libre', [ico, nom, etapes] = MODELES[m];
  const nb = (p.titre || '').match(/(\d+)\s*(personnes|invités|pers)/i)?.[1];
  vue(`<div class="wrap bienvenue"><a href="#/projets" class="petit">← Mes projets</a><h1>${ico} ${esc(nom)}</h1>
    <form class="f carte-f" id="fProjet" style="margin:14px 0"><label>Nom du projet<input name="titre" required minlength="2" maxlength="120" value="${esc(p.titre || (m === 'libre' ? '' : nom))}"></label>
      <div class="ligne3"><label>Date<input name="date" type="date"></label><label>Budget (€)<input name="budget" type="number" min="0" step="10"></label><label>Invités<input name="invites" type="number" min="0" max="5000" value="${nb || ''}"></label></div>
      ${etapes.length ? `<p class="petit muted" style="margin:0">Étapes préparées : ${etapes.map(e => esc(e[0])).join(' · ')}. Vous pourrez en ajouter ou en retirer.</p>` : ''}
      <button class="btn btn-p">Créer le projet</button></form></div>`);
  $('#fProjet').addEventListener('submit', async e => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try {
      const n = await q(sb.from('projets').insert({ modele: m, titre: d.titre.trim(), date_prevue: d.date || null, budget: d.budget === '' ? null : Number(d.budget), invites: d.invites === '' ? null : Number(d.invites),
        territoire: terrPrefere() || profil?.territoire || null, etapes: etapes.map(([titre, univers]) => ({ titre, univers, fait: false, montant: 0, note: '' })) }).select('id').single());
      toast('Projet créé : à vous de jouer !'); aller('#/projet/' + n.id);
    } catch (err) { toast(erreur(err), true); }
  });
}

APP.pages.projet = async id => {
  if (!exigeCompte()) return;
  await chargerRegistre();
  const p = await q(sb.from('projets').select('*').eq('id', id).maybeSingle());
  if (!p) return vue('<div class="wrap vide-etat" style="margin-top:30px"><h3>Projet introuvable</h3><a href="#/projets">Mes projets</a></div>');
  let minu = null;
  const enregistrer = () => { clearTimeout(minu); minu = setTimeout(async () => { try { await q(sb.from('projets').update({ etapes: p.etapes, notes: p.notes }).eq('id', id)); } catch (err) { toast(erreur(err), true); } }, 500); };
  const dessiner = () => {
    const f = p.etapes.filter(e => e.fait).length, tot = p.etapes.reduce((t, e) => t + Number(e.montant || 0), 0);
    const jours = p.date_prevue ? Math.ceil((new Date(p.date_prevue + 'T12:00') - new Date()) / 864e5) : null;
    vue(`<div class="wrap bienvenue"><a href="#/projets" class="petit">← Mes projets</a>
      <h1>${MODELES[p.modele]?.[0] || '✨'} ${esc(p.titre)}</h1>
      <div class="stats" style="margin:10px 0 16px">${[['Avancement', `${f}/${p.etapes.length}`, 'étapes faites'], ['Jour J', jours == null ? '—' : jours > 0 ? `J−${jours}` : jours === 0 ? 'Aujourd’hui' : 'Passé', p.date_prevue ? new Date(p.date_prevue + 'T12:00').toLocaleDateString('fr-FR') : 'date à fixer'],
        ['Budget', eur(tot), p.budget ? `sur ${eur(p.budget)}${tot > p.budget ? ' ⚠️ dépassé' : ''}` : 'aucun budget fixé'], ['Invités', p.invites ?? '—', '']].map(([t, v, s]) => `<div class="panneau stat"><span class="petit muted">${t}</span><b>${v}</b><span class="petit muted">${s}</span></div>`).join('')}</div>
      <i class="prog" style="margin-bottom:16px"><i style="width:${p.etapes.length ? f / p.etapes.length * 100 : 0}%"></i></i>
      <div class="etapes-pj">${p.etapes.map((e, i) => { const o = OU[e.univers] || OU.autre; return `<div class="etape-pj ${e.fait ? 'faite' : ''}" data-i="${i}">
        <label class="coche-pj"><input type="checkbox" data-fait ${e.fait ? 'checked' : ''}><span>${o[0]}</span></label>
        <div><b>${esc(e.titre)}</b><input class="note-pj" data-note value="${esc(e.note || '')}" placeholder="Note, nom du prestataire…" maxlength="500"></div>
        <label class="montant-pj"><input type="number" min="0" step="5" data-montant value="${Number(e.montant) || ''}" placeholder="€" aria-label="Montant"></label>
        ${o[2] ? `<a class="btn btn-s" href="${o[2]}">Trouver →</a>` : `<span class="tag">${e.univers === 'rental' ? 'Bientôt' : ''}</span>`}
        <button type="button" class="lien" data-retirer aria-label="Retirer l’étape">✕</button></div>`; }).join('')}</div>
      <form id="fEtape" class="rch" style="margin:12px 0"><input name="titre" maxlength="80" placeholder="Ajouter une étape (ex. Photographe)" required><select name="univers" aria-label="Service">${Object.entries(OU).map(([k, [i, t]]) => `<option value="${k}">${i} ${t}</option>`).join('')}</select><button class="btn btn-p">+</button></form>
      <label class="f"><b>Notes</b><textarea id="notesPj" maxlength="4000" placeholder="Idées, contacts, liste de courses…">${esc(p.notes)}</textarea></label>
      <p><button class="btn btn-s btn-ko" id="supprPj">Supprimer le projet</button></p></div>`);
  };
  dessiner();
  $('#app').oninput = e => {
    const l = e.target.closest('[data-i]'); if (e.target.id === 'notesPj') { p.notes = e.target.value; return enregistrer(); } if (!l) return;
    const et = p.etapes[l.dataset.i];
    if (e.target.matches('[data-note]')) et.note = e.target.value;
    if (e.target.matches('[data-montant]')) et.montant = Number(e.target.value) || 0;
    enregistrer();
  };
  $('#app').onchange = e => { const l = e.target.closest('[data-i]'); if (l && e.target.matches('[data-fait]')) { p.etapes[l.dataset.i].fait = e.target.checked; enregistrer(); dessiner(); } };
  $('#app').onclick = async e => {
    const r = e.target.closest('[data-retirer]'); if (r) { p.etapes.splice(r.closest('[data-i]').dataset.i, 1); enregistrer(); return dessiner(); }
    if (e.target.id === 'supprPj' && confirm('Supprimer ce projet ?')) { try { await q(sb.from('projets').delete().eq('id', id)); aller('#/projets'); } catch (err) { toast(erreur(err), true); } }
  };
  $('#app').onsubmit = e => { if (e.target.id !== 'fEtape') return; e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    if (p.etapes.length >= 40) return toast('40 étapes au maximum.', true);
    p.etapes.push({ titre: d.titre.trim(), univers: d.univers, fait: false, montant: 0, note: '' }); enregistrer(); dessiner(); };
};
