/* NEXORA — équipe : « Mon espace » de l'employé (son planning de la semaine, son solde de congés, ses demandes) et planning des responsables
   (employés × jours, créneaux, copie de semaine, repères du Code du travail, impression). Règles, droits et calculs : equipe_devis.sql
   (nx_mon_espace, nx_demander_absence, nx_planning, nx_enregistrer_creneau…) ; un employé n'a accès qu'à ses propres données. */
'use strict';
const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const plusJours = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const lundiDe = d => plusJours(d, -((new Date(d + 'T12:00:00Z').getUTCDay() + 6) % 7));
const jourTxt = d => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const semaineTxt = l => `Semaine du ${new Date(l + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${date(plusJours(l, 6))}`;
const dureeTxt = m => { m = Math.round(Number(m) || 0); const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`; };
const minutesCreneau = (d, f, p) => { const [a, b] = [d, f].map(x => { const [h, mn] = String(x).split(':').map(Number); return h * 60 + mn; }); return (b > a ? b - a : b - a + 1440) - (Number(p) || 0); };
const semaineParam = () => { const s = param().semaine; return /^\d{4}-\d{2}-\d{2}$/.test(s || '') ? lundiDe(s) : null; };

// ---------------------------------------------------------------- « Mon espace » (employé)
NX.pages.moi = async () => {
  if (!EQ) return vue(vide('Bientôt disponible', 'Le planning et les congés arrivent avec la prochaine mise à jour de NEXORA.'));
  vue(entete('Mon espace', esc(ORG.nom)) + '<div class="chargement">Chargement de votre planning…</div>');
  const org = ORG.id, m = await q(sb.rpc('nx_mon_espace', { org, lundi: semaineParam() }));
  if (ORG?.id !== org) return;
  const quitter = ROLE === 'employe' ? '<p class="petit moi-pied"><button class="lien" id="quitterOrg">Quitter cette entreprise</button></p>' : '';
  if (!m.employe) {
    vue(entete('Mon espace', esc(ORG.nom)) + `<div class="carte">${vide('Votre compte n’est pas encore relié à votre fiche', peut('rh')
      ? 'Ouvrez Employés, puis « Donner l’accès » sur votre fiche, pour voir ici votre planning et vos congés.'
      : 'Demandez à votre responsable de vous donner l’accès depuis votre fiche employé : vous verrez ici votre planning et vos congés.', peut('rh') ? '<a class="btn" href="#/employes">Employés</a>' : '')}</div>` + quitter);
    return brancherMoi(m);
  }
  const e = m.employe, s = m.solde, l = m.lundi, jours = Array.from({ length: 7 }, (_, i) => plusJours(l, i));
  const droit = Number(s.acquis) + Number(s.report), reste = droit - Number(s.pris);
  const total = m.creneaux.reduce((x, c) => x + Number(c.minutes), 0);
  const absJour = j => m.absences.find(a => a.statut !== 'refusee' && a.debut <= j && a.fin >= j);
  const jourHtml = (j, i) => {
    const c = m.creneaux.filter(x => x.jour === j), a = absJour(j), f = m.feries.find(x => x.jour === j), mn = c.reduce((x, y) => x + Number(y.minutes), 0);
    return `<li class="jour${j === m.aujourdhui ? ' auj' : ''}${f ? ' ferie' : ''}"><div class="jour-t"><b>${JOURS_COURTS[i]}</b><span>${new Date(j + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>${j === m.aujourdhui ? '<span class="tag info">aujourd’hui</span>' : ''}</div>
      <div class="jour-c">${a ? `<span class="abs-pl ${a.statut === 'demande' ? 'att' : ''}">${esc(ABSENCES[a.type])}${a.statut === 'demande' ? ' (demandé)' : ''}</span>` : ''}${f ? `<span class="tag">Férié : ${esc(f.nom)}</span>` : ''}
        ${c.map(x => `<div class="creneau"><b>${x.debut} – ${x.fin}</b>${x.pause_min ? `<span class="muted petit">pause ${x.pause_min} min</span>` : ''}${x.lieu ? `<span>📍 ${esc(x.lieu)}</span>` : ''}${x.note ? `<span class="muted petit">${esc(x.note)}</span>` : ''}</div>`).join('')
          || (a || f ? '' : '<span class="muted">Repos</span>')}</div><div class="jour-h">${mn ? dureeTxt(mn) : ''}</div></li>`;
  };
  const ST_MOI = { demande: ['att', 'En attente de réponse'], validee: ['ok', 'Acceptée'], refusee: ['ko', 'Refusée'] };
  vue(entete(`Bonjour ${esc(e.prenom)}`, `${esc(m.entreprise)}${e.poste ? ' · ' + esc(e.poste) : ''}`, e.actif ? '<button class="btn btn-p" id="demander">+ Demander un congé</button>' : '')
    + `<div class="moi-grille"><section class="carte moi-semaine" aria-labelledby="tSem"><div class="titre-l"><h2 id="tSem">Mon planning</h2>
        <div class="actions"><a class="btn btn-s" href="#/moi?semaine=${plusJours(l, -7)}" aria-label="Semaine précédente">←</a><a class="btn btn-s" href="#/moi">Cette semaine</a><a class="btn btn-s" href="#/moi?semaine=${plusJours(l, 7)}" aria-label="Semaine suivante">→</a></div></div>
      <p class="muted petit">${semaineTxt(l)} · ${total ? `${dureeTxt(total)} prévues` : 'aucun créneau prévu'}${Number(e.heures_hebdo) ? ` · contrat : ${nombre(e.heures_hebdo)} h` : ''}</p>
      <ol class="jours">${jours.map(jourHtml).join('')}</ol></section>
    <div class="grille"><section class="carte" aria-labelledby="tSolde"><h2 id="tSolde">Mes congés payés ${s.annee}</h2>
        <p class="solde"><b>${nombre(reste)}</b> jour${Math.abs(reste) > 1 ? 's' : ''} restant${Math.abs(reste) > 1 ? 's' : ''}</p>
        <div class="barre" role="img" aria-label="${nombre(s.pris)} jours pris sur ${nombre(droit)}"><i style="width:${droit > 0 ? Math.min(100, Number(s.pris) / droit * 100) : 0}%"></i></div>
        <p class="petit muted">${nombre(s.acquis)} j par an${Number(s.report) ? ` ${Number(s.report) > 0 ? '+' : '−'} ${nombre(Math.abs(s.report))} j de report` : ''} · ${nombre(s.pris)} j pris${Number(s.en_attente) ? ` · ${nombre(s.en_attente)} j en attente de réponse` : ''}${Number(s.rtt_pris) ? ` · RTT pris : ${nombre(s.rtt_pris)} j` : ''}</p>
        <p class="petit muted">Jours ouvrés, du lundi au vendredi, jours fériés non comptés.</p></section>
      <section class="carte" aria-labelledby="tDem"><h2 id="tDem">Mes demandes</h2>${m.absences.length ? `<ul class="ec-ech">${m.absences.map(a => `<li><span><b>${esc(ABSENCES[a.type])}</b><br><span class="petit">${a.debut === a.fin ? date(a.debut) : `du ${date(a.debut)} au ${date(a.fin)}`} · ${nombre(a.jours)} j</span>${a.reponse ? `<br><span class="petit muted">« ${esc(a.reponse)} »</span>` : ''}</span>
          ${tag(ST_MOI[a.statut])}${a.statut === 'demande' ? `<button class="btn btn-s" type="button" data-retirer="${a.id}">Retirer</button>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Aucune demande pour l’instant.</p>'}
        <p class="petit muted">Arrêt maladie : prévenez votre responsable au plus vite et envoyez-lui l’avis d’arrêt de travail sous 48 heures.</p></section></div></div>` + quitter);
  brancherMoi(m);
};
function brancherMoi(m) {
  const page = $('#page'), org = ORG.id;
  page.onclick = async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    try {
      if (b.id === 'demander') return demanderConge(m);
      if (b.dataset.retirer && await confirmer('Retirer la demande', 'Votre responsable ne la verra plus.', 'Retirer')) { await q(sb.rpc('nx_annuler_absence', { aid: b.dataset.retirer })); toast('Demande retirée.'); return NX.pages.moi(); }
      if (b.id === 'quitterOrg' && await confirmer('Quitter l’entreprise', `Vous n’aurez plus accès à votre planning chez « ${esc(ORG.nom)} ».`, 'Quitter')) {
        await q(sb.rpc('nx_retirer_membre', { org, membre: moi.id })); await rechargerOrgs(); aller(ORGS.length ? '#/' : '#/bienvenue');
      }
    } catch (err) { toast(erreur(err), true); }
  };
}
async function demanderConge(m) {
  const demain = plusJours(m.aujourdhui, 1), reste = Number(m.solde.acquis) + Number(m.solde.report) - Number(m.solde.pris) - Number(m.solde.en_attente);
  const attente = modale('Demander un congé', `<div class="g2"><label>Type<select name="type">${opts(ABSENCES, 'conges')}</select></label><span></span></div>
    <div class="g2"><label>Du<input name="du" type="date" required value="${demain}" min="${plusJours(m.aujourdhui, -31)}"></label><label>Au (inclus)<input name="au" type="date" required value="${demain}"></label></div>
    <p class="petit apercu-j" id="apercuJours" aria-live="polite"></p>
    <label>Commentaire <span class="muted">(facultatif)</span><input name="commentaire" maxlength="500" placeholder="Ex. Mariage de ma sœur"></label>
    <p class="petit muted" id="aideMaladie" hidden>Arrêt maladie : envoyez aussi l’avis d’arrêt de travail à votre employeur sous 48 heures.</p>`, { valider: 'Envoyer la demande' });
  const fm = $('.modale form'); let minu = null, n = 0;
  const calc = async () => {
    const du = fm.elements.du.value, au = fm.elements.au.value, conges = fm.elements.type.value === 'conges';
    $('#aideMaladie').hidden = fm.elements.type.value !== 'maladie';
    if (!du || !au || au < du) { $('#apercuJours').textContent = du && au ? 'La date de fin doit suivre la date de début.' : ''; return; }
    n = await q(sb.rpc('nx_compter_jours', { org: ORG.id, du, au })).catch(() => 0);
    if (!$('#apercuJours')) return;
    $('#apercuJours').textContent = `${nombre(n)} jour${n > 1 ? 's' : ''} ouvré${n > 1 ? 's' : ''} (week-ends et jours fériés non comptés)${conges ? ` · solde après acceptation : ${nombre(reste - n)} j` : ''}`;
  };
  fm.addEventListener('input', ev => {
    if (ev.target.name === 'du' && fm.elements.au.value < ev.target.value) fm.elements.au.value = ev.target.value;   // la fin suit le début
    clearTimeout(minu); minu = setTimeout(calc, 250);
  });
  calc();
  const r = await attente; if (!r) return;
  try { await q(sb.rpc('nx_demander_absence', { org: ORG.id, type_a: r.type, du: r.du, au: r.au, commentaire_c: r.commentaire?.trim() || null })); toast('Demande envoyée à votre responsable.'); NX.pages.moi(); }
  catch (err) { toast(erreur(err), true); }
}

// ---------------------------------------------------------------- planning de l'équipe (responsables)
NX.pages.planning = async () => {
  if (!EQ) return vue(vide('Bientôt disponible', 'Le planning arrive avec la prochaine mise à jour de NEXORA.'));
  if (refuse('rh', 'Le planning est géré par les propriétaires et administrateurs.')) return;
  const org = ORG.id, p = await q(sb.rpc('nx_planning', { org, lundi: semaineParam() }));
  if (ORG?.id !== org) return;
  const l = p.lundi, jours = Array.from({ length: 7 }, (_, i) => plusJours(l, i)), auj = aujourdhui();
  const creneaux = (eid, j) => p.creneaux.filter(c => c.employe_id === eid && c.jour === j);
  const absence = (eid, j) => p.absences.find(a => a.employe_id === eid && a.debut <= j && a.fin >= j);
  const ferie = j => p.feries.find(f => f.jour === j);
  const totalEmp = eid => p.creneaux.filter(c => c.employe_id === eid).reduce((x, c) => x + Number(c.minutes), 0);
  const total = p.creneaux.reduce((x, c) => x + Number(c.minutes), 0);
  const prenom = id => p.employes.find(x => x.id === id)?.prenom || '';
  const ALERTE = { jour_10h: a => `${esc(prenom(a.employe_id))} : ${dureeTxt(a.minutes)} de travail le ${jourTxt(a.jour)} (10 h au plus par jour)`,
    semaine_48h: a => `${esc(prenom(a.employe_id))} : ${dureeTxt(a.minutes)} sur la semaine (48 h au plus)`,
    repos_11h: a => `${esc(prenom(a.employe_id))} : ${dureeTxt(a.minutes)} de repos seulement avant le ${jourTxt(a.jour)} (11 h au moins entre deux journées)`,
    sept_jours: a => `${esc(prenom(a.employe_id))} : aucun jour de repos dans la semaine` };
  const caseHtml = (e, j) => {
    const a = absence(e.id, j), libre = !(a && a.statut === 'validee') && e.actif;
    return `<td class="case-pl${j === auj ? ' auj' : ''}${ferie(j) ? ' ferie' : ''}">${a ? `<span class="abs-pl ${a.statut === 'demande' ? 'att' : ''}">${esc(ABSENCES[a.type])}${a.statut === 'demande' ? ' ?' : ''}</span>` : ''}
      ${creneaux(e.id, j).map(c => `<button type="button" class="cr-pl" data-cr="${c.id}" aria-label="Modifier le créneau de ${esc(e.prenom)}, ${jourTxt(j)}, ${c.debut} à ${c.fin}"><b>${c.debut}–${c.fin}</b>${c.lieu ? `<small>${esc(c.lieu)}</small>` : ''}</button>`).join('')}
      ${libre ? `<button type="button" class="aj-pl no-print" data-aj="${e.id}" data-jour="${j}" aria-label="Ajouter un créneau pour ${esc(e.prenom)}, ${jourTxt(j)}">+</button>` : ''}</td>`;
  };
  vue(entete('Planning', `${semaineTxt(l)} · ${p.employes.length} personne${p.employes.length > 1 ? 's' : ''} · ${dureeTxt(total)} planifiées`,
      `<span class="actions no-print"><a class="btn" href="#/planning?semaine=${plusJours(l, -7)}" aria-label="Semaine précédente">←</a><a class="btn" href="#/planning">Cette semaine</a><a class="btn" href="#/planning?semaine=${plusJours(l, 7)}" aria-label="Semaine suivante">→</a></span>
      <button class="btn no-print" id="copierSem" ${p.creneaux.length ? '' : 'disabled'}>Copier vers la semaine suivante</button><button class="btn no-print" id="imprimerPl">🖨️ Imprimer</button>`)
    + (p.demandes ? `<div class="carte rappel-fact no-print">🌴 <b>${p.demandes} demande${p.demandes > 1 ? 's' : ''} de congés</b> à traiter. <a href="#/employes/absences">Voir les demandes</a></div>` : '')
    + (p.alertes.length ? `<div class="carte alerte-pl" role="note"><b>⚠️ Repères du Code du travail</b><ul>${p.alertes.map(a => `<li>${(ALERTE[a.code] || (() => ''))(a)}</li>`).join('')}</ul>
        <p class="petit muted">Repères généraux (10 h par jour, 48 h par semaine, 11 h de repos entre deux journées, un jour de repos par semaine) : vérifiez ce que prévoit votre convention collective.</p></div>` : '')
    + (p.employes.length ? `<div class="tab-boite planning-boite"><table class="tab planning"><caption class="sr">Planning, ${semaineTxt(l)}</caption>
        <thead><tr><th scope="col">Employé</th>${jours.map((j, i) => `<th scope="col" class="${j === auj ? 'auj' : ''}">${JOURS_COURTS[i]} ${Number(j.slice(8))}${ferie(j) ? `<br><span class="tag" title="${esc(ferie(j).nom)}">Férié</span>` : ''}</th>`).join('')}<th scope="col" class="num">Total</th></tr></thead>
        <tbody>${p.employes.map(e => { const t = totalEmp(e.id), sup = t - Number(e.heures_hebdo) * 60; return `<tr><th scope="row"><b>${esc(e.prenom)} ${esc(e.nom)}</b>${e.poste ? `<br><span class="muted petit">${esc(e.poste)}</span>` : ''}${e.compte ? '' : '<br><span class="muted petit">sans compte</span>'}</th>
          ${jours.map(j => caseHtml(e, j)).join('')}<td class="num"><b>${dureeTxt(t)}</b><br><span class="muted petit">contrat ${nombre(e.heures_hebdo)} h</span>${t && sup > 0 ? `<br>${tag(['att', '+' + dureeTxt(sup)])}` : ''}</td></tr>`; }).join('')}</tbody>
        <tfoot><tr><th scope="row">Présents</th>${jours.map(j => `<td class="num petit">${new Set(p.creneaux.filter(c => c.jour === j).map(c => c.employe_id)).size || '—'}</td>`).join('')}<td></td></tr></tfoot></table></div>`
      : `<div class="carte">${vide('Aucun employé', 'Ajoutez votre équipe dans Employés pour préparer le planning de la semaine.', '<a class="btn btn-p" href="#/employes">Ajouter un employé</a>')}</div>`)
    + '<p class="muted petit no-print">Touchez « + » pour ajouter un créneau (le même horaire sur plusieurs jours en une fois), ou un créneau pour le modifier. Les employés qui ont un compte voient leur planning dans « Mon espace » et sont prévenus des changements.</p>');

  const formCreneau = async (e, jour, c = null) => {
    const attente = modale(c ? `Créneau de ${e.prenom}` : `Nouveau créneau · ${e.prenom}`, `<div class="g3"><label>Début<input name="debut" type="time" required value="${c?.debut || '08:00'}"></label>
        <label>Fin<input name="fin" type="time" required value="${c?.fin || '12:00'}"></label><label>Pause (min)<input name="pause" type="number" min="0" max="240" step="5" inputmode="numeric" value="${c?.pause_min ?? 0}"></label></div>
      <p class="petit muted" id="dureeCr" aria-live="polite"></p>
      ${c ? `<label>Jour<select name="jour">${jours.map(j => `<option value="${j}" ${j === c.jour ? 'selected' : ''}>${jourTxt(j)}</option>`).join('')}</select></label>`
        : `<fieldset class="jours-rep"><legend>Jours (même horaire)</legend>${jours.map((j, i) => `<label class="case"><input type="checkbox" name="j${i}" value="${j}" ${j === jour ? 'checked' : ''}> ${JOURS_COURTS[i]} ${Number(j.slice(8))}</label>`).join('')}</fieldset>`}
      <label>Lieu <span class="muted">(chantier, client, boutique… facultatif)</span><input name="lieu" maxlength="120" value="${esc(c?.lieu || '')}"></label>
      <label>Note <span class="muted">(facultatif)</span><input name="note" maxlength="300" value="${esc(c?.note || '')}"></label>
      ${c ? '<input type="hidden" name="quoi" value=""><p style="margin:0"><button type="button" class="btn btn-s btn-ko" id="supprCr">Supprimer ce créneau</button></p>' : ''}`, { valider: c ? 'Enregistrer' : 'Ajouter' });
    const fm = $('.modale form');
    const duree = () => { const d = fm.elements.debut.value, f = fm.elements.fin.value; $('#dureeCr').textContent = d && f && d !== f ? `Durée de travail : ${dureeTxt(minutesCreneau(d, f, fm.elements.pause.value))}${f <= d ? ' (finit le lendemain)' : ''}` : ''; };
    fm.addEventListener('input', duree); duree();
    $('#supprCr')?.addEventListener('click', () => { fm.elements.quoi.value = 'supprimer'; fm.requestSubmit(); });
    const r = await attente; if (!r) return;
    try {
      if (r.quoi === 'supprimer') { await q(sb.rpc('nx_supprimer_creneau', { cid: c.id })); toast('Créneau supprimé.'); return NX.pages.planning(); }
      const js = c ? [r.jour] : jours.filter((_, i) => r['j' + i]);
      if (!js.length) return toast('Cochez au moins un jour.', true);
      const n = await q(sb.rpc('nx_enregistrer_creneau', { org: ORG.id, cid: c?.id || null, eid: e.id, jours: js, h_debut: r.debut, h_fin: r.fin, pause: Number(r.pause || 0), lieu_c: r.lieu?.trim() || null, note_c: r.note?.trim() || null }));
      toast(c ? 'Créneau modifié.' : `${n} créneau${n > 1 ? 'x' : ''} ajouté${n > 1 ? 's' : ''}.`); NX.pages.planning();
    } catch (err) { toast(erreur(err), true); }
  };
  $('#page').onclick = async ev => {
    const aj = ev.target.closest('[data-aj]'); if (aj) return formCreneau(p.employes.find(x => x.id === aj.dataset.aj), aj.dataset.jour);
    const cr = ev.target.closest('[data-cr]'); if (cr) { const c = p.creneaux.find(x => x.id === cr.dataset.cr); return formCreneau(p.employes.find(x => x.id === c.employe_id), c.jour, c); }
    if (ev.target.id === 'imprimerPl') return window.print();
    if (ev.target.id === 'copierSem' && await confirmer('Copier la semaine', `Les créneaux de la ${semaineTxt(l).toLowerCase()} sont recopiés sur la semaine suivante. Ceux qui tomberaient sur un créneau existant ou une absence validée sont laissés de côté.`, 'Copier')) {
      try { const r = await q(sb.rpc('nx_copier_semaine', { org: ORG.id, de: l, vers: plusJours(l, 7) }));
        toast(`${r.copies} créneau${r.copies > 1 ? 'x' : ''} copié${r.copies > 1 ? 's' : ''}${r.ignores ? ` (${r.ignores} laissé${r.ignores > 1 ? 's' : ''} de côté)` : ''}.`); aller('#/planning?semaine=' + plusJours(l, 7)); }
      catch (err) { toast(erreur(err), true); }
    }
  };
};
