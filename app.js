/* =====================================================================
   OUTILS
   ===================================================================== */
const lineVal = l => eur(l.prix) + (l.mensuel ? '/mois' : '');
const fromPrice = s => s.base ? `dès ${eur(s.base)}${s.mensuel ? '/mois' : ''}` : 'Gratuit';
const packLabel = p => `Pack « ${p.nom} »`;
const commune = nom => COMMUNES.find(c => c[0] === nom);

const daysFromToday = s => Math.round((parseISO(s) - parseISO(todayISO())) / 86400000);
const frDate = s => parseISO(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = s => { const l = parseISO(s).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); return l.charAt(0).toUpperCase() + l.slice(1); };

// thème (couleur) d'une catégorie, d'un service, d'un pack
const catOf = sid => CATEGORIES.find(c => c.services.includes(sid)) || CATEGORIES[0];
const themeOf = sid => catOf(sid).couleur;
// un pack d'une seule catégorie garde sa couleur ; s'il en mélange plusieurs, il prend un dégradé
function packTheme(p) {
  const cols = [...new Set(Object.keys(p.items).map(themeOf))];
  return { c: cols[0], bg: cols.length > 1 ? `linear-gradient(120deg, ${cols.join(', ')})` : cols[0], multi: cols.length > 1 };
}
const packStyle = p => { const t = packTheme(p); return `--t:${t.c};--tg:${t.bg}`; };

/* =====================================================================
   ÉTAT
   ===================================================================== */
const STEPS = {
  rdv:   ['Choix', 'Rendez-vous', 'Coordonnées'],
  devis: ['Choix', 'Lieu', 'Coordonnées']
};
const DEFAULT = {
  step: 1, kind: 'rdv', tab: 'services', cat: 'ordi', pack: null, symptoms: [], sel: [], opt: {},
  d: { appType: '', mode: 'site', commune: '', agence: 'ducos', creneau: '', date: '', type: 'individual', budget: 'medium', appareil: '', desc: '', contrat: false, name: '', email: '', phone: '', address: '', pref: 'whatsapp', consent: false, website: '', chatMsg: MESSAGES_WA[0][1], chatCommune: '' }
};
let state = load();
// hauteur de l'en-tête : l'outil occupe exactement le reste du premier écran
const hautEntete = () => { try { const h = document.querySelector('header.top'); if (h) document.documentElement.style.setProperty('--haut-entete', h.offsetHeight + 'px'); } catch (e) {} };
window.addEventListener('resize', hautEntete); setTimeout(hautEntete, 0);
const ouvertLe = Date.now();   // anti-robot : un humain met plus de quelques secondes à remplir le formulaire
const slotCache = {};   // places restantes par créneau, par "date|agence" : { matin: 2, aprem: 0 }
const premierJour = () => addDays(todayISO(), CONFIG.delaiMinJours || 0);
let sending = false;
let photo = null;        // photo du problème (non sauvegardée dans le navigateur)
let suivi = {};          // recherche « Suivre ma demande »

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem('itDraft3'));
    if (saved && saved.d) {
      const base = structuredClone(DEFAULT);
      const st = { ...base, ...saved, d: { ...base.d, ...saved.d, consent: false, website: '' } };
      if (typeof st.step === 'number' && st.step > 3) st.step = 1;
      if (st.kind === 'rdv' && st.step > 2 && (!st.d.date || !CRENEAUX[st.d.creneau] || st.d.date < premierJour())) st.step = 2;
      if ((typeof st.step !== 'number' && st.step !== 'chat') || st.step < 1) st.step = 1;
      if (!CATEGORIES.find(c => c.id === st.cat && !c.bientot)) st.cat = 'ordi';
      st.sel = st.sel.filter(id => svc(id)); if (st.pack && !PACKS.find(x => x.id === st.pack)) st.pack = null;
      return st;
    }
  } catch (e) {}
  return structuredClone(DEFAULT);
}
function save() {
  try { localStorage.setItem('itDraft3', JSON.stringify(state)); } catch (e) {}
}

/* =====================================================================
   OUVERTURE, CRÉNEAUX
   ===================================================================== */
function openStatus() {
  const now = new Date(), day = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
  const today = HORAIRES[day];
  if (today && h >= today[0] && h < today[1]) return { open: true, text: `Ouvert · jusqu'à ${today[1]} h` };
  for (let i = 0; i < 8; i++) {
    const dt = new Date(now); dt.setDate(now.getDate() + i);
    const hrs = HORAIRES[dt.getDay()];
    if (!hrs || (i === 0 && h >= hrs[0])) continue;
    const when = i === 0 ? "aujourd'hui" : i === 1 ? 'demain' : dt.toLocaleDateString('fr-FR', { weekday: 'long' });
    return { open: false, text: `Fermé · ouvre ${when === "aujourd'hui" ? '' : when + ' '}à ${hrs[0]} h` };
  }
  return { open: false, text: 'Fermé' };
}

function delaiKey(date) {
  if (!date) return 'standard';
  const n = daysFromToday(date);
  return n <= 0 ? 'urgence' : n <= 2 ? 'rapide' : 'standard';
}

// agence qui traitera la demande
function agenceKey() {
  const { d } = state;
  if (d.mode === 'site') return commune(d.commune)?.[2] || 'ducos';
  if (d.mode === 'atelier') return d.agence;
  return CONFIG.agenceDistance;
}

// créneaux proposés pour une date : [clé, raison d'indisponibilité ou '']
function creneauxFor(date, agence = agenceKey()) {
  if (!date) return [];
  const day = parseISO(date).getDay();
  if (!HORAIRES[day]) return [];
  const keys = day === 6 ? ['samedi'] : ['matin', 'aprem'];
  const restants = slotCache[date + '|' + agence] || {};
  const now = new Date();
  return keys.map(k => {
    if (date < premierJour()) return [k, date === todayISO() ? 'Pas le jour même' : 'Passé'];
    if (date === todayISO() && now.getHours() >= CRENEAUX[k].h[1] - 1) return [k, 'Passé'];
    if (restants[k] === 0) return [k, 'Complet'];
    return [k, ''];
  });
}

// places restantes d'un créneau (null = pas encore connu)
const places = (date, k, agence = agenceKey()) => { const r = slotCache[date + '|' + agence]; return r && typeof r[k] === 'number' ? r[k] : null; };

// interroge le planning pour savoir quels créneaux sont complets
async function fetchSlots(date, agence = agenceKey()) {
  if (!CONFIG.endpoint || !date) return;
  const key = date + '|' + agence;
  if (slotCache[key]) return;
  slotCache[key] = {};
  try {
    const res = await fetch(`${CONFIG.endpoint}?action=slots&date=${date}&agence=${agence}`);
    const data = await res.json();
    if (data.ok) {
      const cap = data.capacite || CONFIG.placesParCreneau;
      // moteur à jour : places restantes ; ancien moteur : seulement « complet »
      slotCache[key] = data.restants || Object.fromEntries(Object.keys(CRENEAUX).map(k => [k, (data.complet || {})[k] ? 0 : null]).filter(([, v]) => v !== null));
      slotCache[key].capacite = cap;
    }
  } catch (e) { /* hors ligne : tous les créneaux restent proposés */ }
  if (state.step === 2) render();
}

/* =====================================================================
   SÉLECTION (services, packs, problèmes)
   ===================================================================== */
function applyItems(items) {
  Object.entries(items).forEach(([sid, opts]) => {
    if (!state.sel.includes(sid)) state.sel.push(sid);
    state.opt[sid] = [...new Set([...(state.opt[sid] || []), ...opts])];
  });
}
function packValid() {
  const p = pack(state.pack);
  return !!p && Object.entries(p.items).every(([sid, opts]) => state.sel.includes(sid) && opts.every(o => state.opt[sid]?.includes(o)));
}
function allowedModes() {
  if (!state.sel.length) return Object.keys(MODES);
  return Object.keys(MODES).filter(m => state.sel.every(id => svc(id).modes.includes(m)));
}
function fixMode() {
  const allowed = allowedModes();
  if (!allowed.includes(state.d.mode)) state.d.mode = allowed[0] || 'site';
}
const needsAppareil = () => state.sel.some(id => svc(id).appareil);

/* =====================================================================
   CALCUL
   ===================================================================== */
function calc() {
  const { sel, opt, d } = state;
  const p = packValid() ? pack(state.pack) : null;
  const lines = [];
  let presta = 0, variable = 0, packValue = 0;

  if (p) {
    packValue = itemsValue(p.items);
    presta += p.prix;
    lines.push({ label: packLabel(p), detail: p.inclus.join(' · '), prix: p.prix, old: packValue });
  }
  let mensuel = 0;
  sel.forEach(id => {
    const s = svc(id);
    if (s.mensuel) {
      const chosen = (opt[id] || []).map(o => optOf(id, o)).filter(Boolean);
      const m = s.base + chosen.reduce((t, o) => t + o[2], 0);
      mensuel += m;
      lines.push({ label: s.nom, detail: chosen.map(o => o[1]).join(', '), prix: m, mensuel: true });
      return;
    }
    const inPack = p?.items[id];
    const chosen = (opt[id] || []).filter(o => !inPack?.includes(o)).map(o => optOf(id, o)).filter(Boolean);
    const sub = (inPack ? 0 : s.base) + chosen.reduce((t, o) => t + o[2], 0);
    if (!sub) { if (!inPack) lines.push({ label: s.nom, detail: chosen.map(o => o[1]).join(', '), prix: 0 }); return; }
    presta += sub; variable += sub;
    lines.push({ label: inPack ? `${s.nom} — en plus du pack` : s.nom, detail: chosen.map(o => o[1]).join(', '), prix: sub });
  });

  let depl = 0, deplLabel = '', deplPlein = 0, offert = false;
  const c = commune(d.commune);
  if (d.mode === 'site' && c) {
    depl = deplPlein = ZONES[c[1]].prix;
    deplLabel = c[1] === 'agence' ? 'Déplacement (commune d’agence)' : `Déplacement zone ${ZONES[c[1]].nom}`;
    if (depl > 0 && presta >= CONFIG.deplacementOffertDes) { offert = true; depl = 0; }
  } else if (d.mode === 'atelier') {
    deplLabel = `Dépôt en agence (${AGENCES[d.agence].nom})`;
  } else if (d.mode === 'distance') {
    deplLabel = 'Intervention à distance';
  }

  const delai = state.kind === 'rdv' ? delaiKey(d.date) : 'standard';
  const urg = DELAIS[delai].prix;
  const cren = state.kind === 'rdv' && d.mode === 'site' && d.creneau ? CRENEAUX[d.creneau].prix : 0;
  const extras = depl + urg + cren;
  return {
    lines, presta, depl, deplPlein, deplLabel, offert, delai, urg, cren,
    pack: p ? p.id : null, savings: p ? packValue - p.prix : 0, mensuel,
    min: presta ? presta + extras : 0,
    max: presta ? Math.round((presta - variable) + variable * CONFIG.margeHaute) + extras : 0
  };
}
const priceText = r => {
  const once = r.min ? (r.min === r.max ? eur(r.min) : `${eur(r.min)} à ${eur(r.max)}`) : '';
  const mois = r.mensuel ? `${eur(r.mensuel)}/mois` : '';
  return [once, mois].filter(Boolean).join(' + ') || (state.sel.length ? 'Gratuit' : '—');
};

/* =====================================================================
   RENDU — résumé, étapes, navigation
   ===================================================================== */
function renderSummary() {
  const r = calc();
  const { d } = state;
  const line = (label, value, detail) => `<div class="line"><span>${label}${detail ? `<small>${esc(detail)}</small>` : ''}</span><b>${value}</b></div>`;
  let h = selectionHTML();
  if (r.presta && r.deplLabel && state.step >= 2) {
    const c = commune(d.commune);
    h += line(r.deplLabel, r.offert ? `<s>${eur(r.deplPlein)}</s><span class="free">Offert</span>` : r.depl ? eur(r.depl) : '<span class="free">Gratuit</span>', d.mode === 'site' && c ? c[0] : '');
  }
  if (r.presta && r.urg) h += line(`Délai ${DELAIS[r.delai].label.toLowerCase()}`, '+' + eur(r.urg));
  if (r.presta && r.cren) h += line(CRENEAUX[d.creneau].label, '+' + eur(r.cren));
  $('lines').innerHTML = h || '<p class="empty">Rien de choisi pour l’instant. Cochez un service ou un pack : il s’affiche ici avec son prix.</p>';
  const n = state.sel.filter(id => !(packValid() && pack(state.pack).items[id])).length + (packValid() ? 1 : 0);
  $('selCount').textContent = n || '';
  $('mobileCount').textContent = n ? `Ma sélection (${n})` : 'Total estimé';

  const txt = priceText(r);
  if ($('price').textContent !== txt) {
    $('price').textContent = txt;
    try { const p = $('price'); p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); } catch (e) {}
  }
  $('mobilePrice').textContent = txt;
  $('savings').innerHTML = r.savings ? `Vous économisez <b>${eur(r.savings)}</b> avec le pack` : '';

  const meta = [];
  const c = commune(d.commune);
  if (r.presta) {
    if (state.step >= 2 && d.mode === 'site' && c) meta.push(`Agence : <b>${AGENCES[c[2]].nom}</b>`);
    if (state.kind === 'rdv' && d.date) meta.push(`Rendez-vous : <b>${frDate(d.date)}${d.creneau ? ', ' + CRENEAUX[d.creneau].label.toLowerCase() : ''}</b>`);
    if (state.step >= 2 && d.mode === 'site' && c && !r.offert && r.deplPlein > 0) {
      const pct = Math.min(100, (r.presta / CONFIG.deplacementOffertDes) * 100);
      meta.push(`Encore <b>${eur(CONFIG.deplacementOffertDes - r.presta)}</b> pour un déplacement offert<div class="progress"><span style="width:${pct}%"></span></div>`);
    }
  }
  $('meta').innerHTML = meta.map(m => `<div>${m}</div>`).join('')
    + (n && state.step === 1 ? `<button type="button" class="btn btn-apercu" onclick="apercuDevis()">${ico('doc')} Voir mon devis tout de suite</button>` : '');

  $('kindToggle').hidden = !(typeof state.step === 'number' && state.step > 1);
  $('kindToggle').innerHTML = `<button type="button" aria-pressed="${state.kind === 'rdv'}" onclick="setKind('rdv')">${ico('calendar')} Rendez-vous</button><button type="button" aria-pressed="${state.kind === 'devis'}" onclick="setKind('devis')">${ico('doc')} Devis</button>`;
}

// Liste de ce que le client a pris : pack et services, chacun avec ses options (cochables ici même)
function selectionHTML() {
  const p = packValid() ? pack(state.pack) : null;
  const chosen = id => (state.opt[id] || []).map(o => optOf(id, o)).filter(Boolean);
  const card = ({ style, cls = '', icon, title, detail, price, remove, label }) => {
    return `<div class="sel ${cls}" style="${style}">
      <div class="sel-row"><span class="sel-ico">${ico(icon)}</span>
        <span class="sel-name"><b>${title}</b><small>${detail}</small></span>
        <span class="sel-price mono">${price}</span>
        <button type="button" class="sel-x" onclick="${remove}" aria-label="Retirer ${esc(label)}" title="Retirer">×</button></div>
</div>`;
  };
  let h = '';
  if (p) {
    const extra = Object.keys(p.items).flatMap(id => chosen(id).filter(o => !p.items[id].includes(o[0])));
    h += card({ style: packStyle(p), cls: 'sel-pack' + (packTheme(p).multi ? ' multi' : ''), icon: p.icon, title: esc(packLabel(p)), label: p.nom,
      detail: esc(p.inclus.join(' · ')) + (extra.length ? `<em>+ ${esc(extra.map(o => o[1]).join(', '))}</em>` : ''),
      price: `<s>${eur(itemsValue(p.items))}</s>${eur(p.prix + extra.reduce((t, o) => t + o[2], 0))}`,
      remove: `selectPack('${p.id}')` });
  }
  state.sel.filter(id => !p?.items[id]).forEach(id => {
    const s = svc(id), opts = chosen(id);
    const sub = s.base + opts.reduce((t, o) => t + o[2], 0);
    h += card({ style: `--t:${themeOf(id)}`, icon: s.icon, title: esc(s.nom), label: s.nom,
      detail: opts.length ? esc(opts.map(o => o[1]).join(', ')) : `<span class="sel-cat">${esc(catOf(id).nom)}</span>`,
      price: sub ? eur(sub) + (s.mensuel ? '/mois' : '') : '<span class="free">Gratuit</span>',
      remove: `toggle('${id}')` });
  });
  return h;
}

function renderSteps() {
  const inFlow = typeof state.step === 'number' && state.step > 1;
  $('steps').hidden = !inFlow;
  if (!inFlow) return;
  $('steps').innerHTML = STEPS[state.kind].map((s, i) => {
    const n = i + 1, cls = n === state.step ? 'cur' : n < state.step ? 'done' : '';
    return `<li class="${cls}" ${n === state.step ? 'aria-current="step"' : ''}><span class="n">${n < state.step ? '✓' : n}</span><span class="t">${n === state.step ? `Étape ${n} sur ${STEPS[state.kind].length} : ` : ''}${s}</span></li>`;
  }).join('');
}

function renderNav() {
  const s = state.step;
  $('nav').hidden = false;
  if (s === 'chat' || s === 'suivi') { $('nav').innerHTML = `<button type="button" class="btn" onclick="home()">Retour aux services</button><p id="err" class="err" role="alert"></p>`; return; }
  if (s === 1) {
    $('nav').innerHTML = `<button type="button" class="btn btn-wa nav-wa" onclick="openChat()" aria-label="Discuter sur WhatsApp">${ico('chat')}<span>WhatsApp</span></button>
      <p id="err" class="err" role="alert"></p><p class="howto"><b>1</b>Choisir <b>2</b>Le jour <b>3</b>Vos coordonnées<span> · gratuit</span></p>
      <div class="nav-go"><button type="button" class="btn" onclick="start('devis')">${ico('doc')}<span class="lg">Connaître le prix</span><span class="sm">Prix</span></button>
      <button type="button" class="btn btn-primary" onclick="start('rdv')">${ico('calendar')}<span class="lg">Prendre rendez-vous</span><span class="sm">Rendez-vous</span></button></div>`;
    return;
  }
  const steps = STEPS[state.kind];
  const last = s === steps.length;
  $('nav').innerHTML = `<button type="button" class="btn" onclick="prev()" ${sending ? 'disabled' : ''}>Retour</button>
    <p id="err" class="err" role="alert"></p>
    ${last ? `<button type="button" class="btn btn-primary" onclick="send()" ${sending ? 'disabled' : ''}>${sending ? 'Envoi en cours…' : state.kind === 'devis' ? 'Voir mon devis' : 'Réserver mon rendez-vous'}</button>`
           : `<button type="button" class="btn btn-primary" onclick="next()">Étape suivante<span class="hide-sm"> : ${steps[s]}</span> ${ico('arrow')}</button>`}`;
}

// Case cliquable (checkbox ou radio) accessible au clavier
function tile({ type = 'radio', name, value, checked, disabled, title, sub, icon, price, cls = '', tip = '', theme = '', onchange }) {
  return `<label class="tile ${cls} ${checked ? 'on' : ''} ${disabled ? 'off' : ''}"${tip ? ` title="${tip}"` : ''}${theme ? ` style="--t:${theme}"` : ''}>
    <input type="${type}" name="${name}" value="${value}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} onchange="${onchange}">
    ${icon ? ico(icon) : ''}<span class="box ${type === 'radio' ? 'round' : ''}" aria-hidden="true"></span>
    <span class="tile-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${price ? `<span class="price">${price}</span>` : ''}</label>`;
}

// vitrine compacte de l'onglet : visuel (dessin + photo + pastille), titre, accroche, « ce que vous obtenez », prix
function vitrineCompacte(c) {
  const v = (typeof VITRINES !== 'undefined' && VITRINES[c.id]) || { obtenez: [], puces: [] };
  const ss = c.services.map(svc);
  const moins = ss.filter(x => x.base).sort((a, b) => a.base - b.base)[0];
  const pk = PACKS.find(x => Object.keys(x.items).some(id => c.services.includes(id)));
  return `<div class="cat-vitrine" style="--t:${c.couleur}">
    <div class="cv-visuel">${scene(c)}</div>
    <div class="cv-texte">
      <p class="cv-ici">📍 Vous êtes ici : ${esc((UNIVERS.find(u => u.id === c.univers) || {}).court || '')} › <b>${esc(c.nom)}</b></p>
      <div class="cv-titre"><span class="cv-icone">${ico(c.icon)}</span><b>${esc(c.nom)}</b>${c.nouveau ? '<em class="neuf">Nouveau</em>' : ''}${v.puces[0] ? `<em class="cv-tag">${ico('sparkles')}${esc(v.puces[0])}</em>` : ''}</div>
      <p class="cv-accroche">${esc(c.accroche)}</p>
      <ul class="cv-obtenez">${v.obtenez.map(([i, t]) => `<li>${ico(i)}<span>${esc(t)}</span></li>`).join('')}</ul>
    </div>
    <div class="cv-prix">${pk ? `<span class="cv-prix-2">Formule ${eur(pk.prix)}</span>` : ''}<span class="cv-prix-1"><small>À partir de</small><b>${moins ? eur(moins.base) : 'Devis'}</b>${moins && moins.mensuel ? '<em>/mois</em>' : ''}</span></div>
  </div>`;
}

// carte d'un service : image à gauche (photo de la catégorie pour le 1er service, sinon illustration), texte à droite
function carteService(x, c, on, inPack) {
  const t = themeOf(x.id);
  const media = c.services[0] === x.id && photoCat(c) ? photoCat(c, 'carte-photo') : illustration({ id: 's-' + x.id, icon: x.icon, badge: c.badge, couleur: t }, 'bande');
  return `<label class="tile service carte ${on ? 'on' : ''} ${inPack ? 'included' : ''} ${x.id === dernierAjout ? 'vient' : ''}" style="--t:${t}">
    <input type="checkbox" name="svc" value="${x.id}" ${on ? 'checked' : ''} ${inPack ? 'disabled' : ''} onchange="toggle('${x.id}')">
    <span class="carte-media">${media}</span>
    <span class="carte-corps"><b>${esc(x.nom)}</b><span class="carte-desc">${inPack ? '✓ Inclus dans votre formule' : esc(x.desc)}</span>
      ${inPack ? '' : `<span class="price-row"><span class="mono">${fromPrice(x)}</span><span class="add">${on ? '✓ Ajouté' : '+ Ajouter'}</span></span>`}</span></label>`;
}

function packCard(p, on, action) {
  const value = itemsValue(p.items);
  const cats = [...new Set(Object.keys(p.items).map(id => catOf(id).nom))];
  return `<button type="button" class="pack ${on ? 'on' : ''} ${packTheme(p).multi ? 'multi' : ''}" style="${packStyle(p)}" aria-pressed="${on}" onclick="${action}">
    <span class="pack-tag mono">${p.populaire ? '★ Le plus demandé' : cats.join(' + ')}</span>
    <span class="pack-head">${ico(p.icon)}<b>${p.nom}</b></span>
    <ul class="pack-inclus">${p.inclus.map(i => `<li>${i}</li>`).join('')}</ul>
    <span class="pack-bottom"><b class="pack-now mono">${eur(p.prix)}</b><s class="mono" title="Prix des mêmes services pris un par un">${eur(value)}</s><span class="add">${on ? '✓ Choisi' : 'Choisir'}</span></span></button>`;
}

/* =====================================================================
   VUES
   ===================================================================== */
const VIEWS = {
  chat() {
    const { d } = state;
    const near = commune(d.chatCommune)?.[2];
    const st = openStatus();
    return `<h2 id="stepTitle">Discuter avec un technicien</h2>
      <p class="lead"><span class="dot ${st.open ? 'on' : ''}"></span> ${st.text}. Réponse rapide sur WhatsApp aux heures d'ouverture.</p>
      <div class="form"><div class="field full"><label for="chatCommune">Votre commune <span class="muted">(pour trouver l'agence la plus proche)</span></label>
        <select id="chatCommune" onchange="setD('chatCommune',this.value)"><option value="">Je ne sais pas / peu importe</option>${COMMUNES.map(c => `<option ${c[0] === d.chatCommune ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}</select></div></div>
      <h3>Votre message</h3>
      <div class="chips">${MESSAGES_WA.map(([l, m], i) => `<button type="button" class="chip ${d.chatMsg === m ? 'on' : ''}" onclick="setD('chatMsg', MESSAGES_WA[${i}][1])">${l}</button>`).join('')}</div>
      <textarea id="chatMsg" class="chat-msg" aria-label="Votre message" oninput="setD('chatMsg',this.value,true)">${esc(d.chatMsg)}</textarea>
      <div class="grid g2 agencies">${Object.entries(AGENCES).map(([k, a]) => `<div class="agency ${near === k ? 'near' : ''}">
        ${near === k ? '<span class="badge mono">La plus proche</span>' : ''}
        <b>${ico('pin')} ${a.nom}</b><span class="muted">${a.detail}</span><span class="mono tel">${esc(a.tel)}</span>
        <div class="agency-actions"><a class="btn btn-wa" target="_blank" rel="noopener" href="${waUrl(a.tel, d.chatMsg)}" onclick="this.href=waUrl(AGENCES.${k}.tel, state.d.chatMsg)">${ico('chat')} WhatsApp</a><a class="btn" href="${telUrl(a.tel)}">${ico('phone')} Appeler</a></div></div>`).join('')}</div>`;
  },
  suivi() {
    let h = `<h2 id="stepTitle">Suivre ma demande</h2>`;
    if (!CONFIG.endpoint) {
      return h + `<p class="lead">Le suivi en ligne n'est pas encore activé. Contactez directement votre agence avec votre référence :</p>
        <div class="grid g2 agencies">${Object.values(AGENCES).map(a => `<div class="agency"><b>${ico('pin')} ${a.nom}</b><span class="mono tel">${esc(a.tel)}</span>
        <div class="agency-actions"><a class="btn btn-wa" target="_blank" rel="noopener" href="${waUrl(a.tel, 'Bonjour IloTech, je viens aux nouvelles de ma demande (référence : ).')}">${ico('chat')} WhatsApp</a><a class="btn" href="${telUrl(a.tel)}">${ico('phone')} Appeler</a></div></div>`).join('')}</div>`;
    }
    h += `<p class="lead">Entrez la référence reçue (par exemple RDV-261004-AB12) et les 4 derniers chiffres de votre téléphone.</p>
      <div class="form"><div class="field"><label for="sRef">Référence</label><input id="sRef" class="mono" value="${esc(suivi.ref || '')}" autocapitalize="characters" autocomplete="off" placeholder="RDV-261004-AB12"></div>
      <div class="field"><label for="sTel">4 derniers chiffres de votre téléphone</label><input id="sTel" inputmode="numeric" maxlength="4" autocomplete="off" value="${esc(suivi.tel || '')}" placeholder="1234"></div></div>
      <div class="actions left"><button type="button" class="btn btn-primary" onclick="checkSuivi()" ${suivi.loading ? 'disabled' : ''}>${suivi.loading ? 'Recherche…' : 'Voir le statut'}</button></div>`;
    if (suivi.error) h += `<p class="notice">${esc(suivi.error)}</p>`;
    const r = suivi.result;
    if (r) {
      const ag = AGENCES[r.agence] || AGENCES.ducos;
      h += `<div class="suivi-card"><span class="mono">${esc(suivi.ref)}</span><b class="statut">${esc(r.statut)}</b><p>${esc(SUIVI[r.statut] || '')}</p>
        ${r.rdv ? `<p>Rendez-vous : <b>${esc(r.rdv)}</b></p>` : ''}<p class="muted">Agence ${ag.de} · ${esc(ag.tel)}</p>
        <div class="actions left"><a class="btn btn-wa" target="_blank" rel="noopener" href="${waUrl(ag.tel, `Bonjour IloTech, au sujet de ma demande ${suivi.ref} :`)}">${ico('chat')} Écrire à l'agence</a></div></div>`;
    }
    return h;
  },
  1() {
    if (state.tab === 'symptomes') {
      let h = `<h2 id="stepTitle">Qu'est-ce qui ne va pas ?</h2>
        <p class="lead">Touchez la phrase qui ressemble à votre situation (une ou plusieurs). Nous choisissons pour vous. <button type="button" class="link" onclick="setTab('services')">Retour à la liste des services</button></p>
        <div class="grid g3 symptoms">${SYMPTOMES.map(x => tile({ type: 'checkbox', name: 'sym', value: x.id, checked: state.symptoms.includes(x.id), title: x.label, cls: 'symptom', onchange: `toggleSymptom('${x.id}')` })).join('')}</div>`;
      if (state.sel.length) {
        const p = packValid() ? pack(state.pack) : null;
        const parts = (p ? [packLabel(p)] : []).concat(state.sel.filter(id => !p?.items[id]).map(id => svc(id).nom));
        h += `<p class="proposal">${ico('arrow')} Nous vous proposons : <b>${parts.join(' + ')}</b>. Touchez « Prendre rendez-vous » en bas pour continuer.</p>`;
      }
      return h;
    }
    const nb = state.sel.length + (packValid() ? 1 : 0);
    return `<div class="pick-head"><h2 id="stepTitle">De quoi avez-vous besoin ?</h2>
        <div class="help-row"><button type="button" class="btn btn-help" onclick="setTab('symptomes')">${ico('search')}<span>Dites-nous ce qui ne va pas</span></button>
        <button type="button" class="btn btn-help call" onclick="openHelp()">${ico('phone')}<span>Appeler un technicien</span></button></div></div>
      <div class="quete" aria-live="polite"><div class="quete-barre" aria-hidden="true"><span style="width:${nb ? 34 : 4}%"></span></div>
        <span class="quete-txt">${nb ? `<b>${nb} choix</b> · plus que 2 étapes pour réserver 🚀` : 'Choisissez un service pour commencer ⭐'}</span></div>
      <div class="univers-row"><span class="univers" role="tablist" aria-label="Pôles">${UNIVERS.map(u => {
          const n = CATEGORIES.filter(c => c.univers === u.id && !c.bientot).flatMap(c => c.services).filter((id, i, a) => a.indexOf(id) === i && state.sel.includes(id) && !(packValid() && pack(state.pack).items[id])).length;
          return `<button type="button" role="tab" style="--t:${u.couleur}" title="${esc(u.desc)}" aria-label="${esc(u.nom)}" aria-selected="${univOf(state.cat) === u.id}" onclick="setUniv('${u.id}')"><span class="u-ico">${ico(u.icon)}</span><span class="u-nom"><span class="u-long">${esc(u.nom)}</span><span class="u-court">${esc(u.court || u.nom)}</span></span>${n ? `<em class="count">${n}</em>` : ''}</button>`;
        }).join('')}</span></div>
      <div class="cats" role="tablist" aria-label="Type de besoin" style="--t:${(UNIVERS.find(u => u.id === univOf(state.cat)) || {}).couleur}">${CATEGORIES.filter(c => !c.bientot && c.univers === univOf(state.cat)).map(c => {
        const n = c.services.filter(id => state.sel.includes(id) && !(packValid() && pack(state.pack).items[id])).length;
        return `<button type="button" role="tab" style="--t:${c.couleur}" aria-selected="${state.cat === c.id}" onclick="setCat('${c.id}')"><span class="c-ico">${ico(c.icon)}</span><span class="c-nom">${c.nom}</span>${n ? `<em class="count">${n}</em>` : c.nouveau ? '<em class="neuf">Nouveau</em>' : ''}</button>`;
      }).join('')}</div>
      ${vitrineCompacte(CATEGORIES.find(c => c.id === state.cat))}
      <div class="grid g5 services" role="tabpanel">${CATEGORIES.find(c => c.id === state.cat).services.map(id => {
          const x = svc(id);
          const inPack = packValid() && pack(state.pack).items[x.id];
          return carteService(x, CATEGORIES.find(c => c.id === state.cat), !inPack && state.sel.includes(x.id), inPack);
        }).join('')}</div>
      ${(() => {
        const u = UNIVERS.find(x => x.id === univOf(state.cat));
        const duPole = PACKS.filter(p => p.univers === u.id || (state.pack === p.id && packValid()));
        const list = state.toutes ? PACKS : duPole.slice(0, 4);
        if (!state.toutes && state.pack && !list.some(p => p.id === state.pack) && packValid()) list[3] = pack(state.pack);
        return `<h3 class="sec">${ico('box')} Ou une formule tout compris <span class="muted">${state.toutes ? 'toutes les formules' : esc(u.nom)} · à prix fixe et moins cher</span>
          <button type="button" class="link sec-toggle" onclick="state.toutes=!state.toutes;render()">${state.toutes ? 'Seulement ' + esc(u.nom) : `Voir toutes les formules (${PACKS.length})`}</button></h3>
        <div class="grid g4 packs">${list.map(p => packCard(p, state.pack === p.id && packValid(), `selectPack('${p.id}')`)).join('')}</div>`;
      })()}
`;
  },
  2() {
    const { d } = state;
    const allowed = allowedModes();
    const c = commune(d.commune);
    let h = `<h2 id="stepTitle">${state.kind === 'rdv' ? 'Où et quand ?' : "Où aurait lieu l'intervention ?"}</h2>
      <div class="grid g3" role="radiogroup" aria-label="Lieu de l'intervention">${Object.entries(MODES).map(([k, m]) =>
        tile({ name: 'mode', value: k, checked: d.mode === k, disabled: !allowed.includes(k), title: m.label, sub: m.desc, icon: m.icon, onchange: `setD('mode','${k}')` })).join('')}</div>`;
    if (allowed.length < 3) h += `<p class="notice">Les caméras, caisses et réseaux s'installent forcément sur place.</p>`;

    if (d.mode === 'site') {
      h += `<div class="form"><div class="field full"><label for="commune">Votre commune <span class="req">*</span></label>
        <select id="commune" onchange="setD('commune',this.value)"><option value="">Choisissez votre commune</option>
        ${['agence', 'centre', 'sud', 'nord'].map(z => `<optgroup label="${ZONES[z].nom} — ${ZONES[z].prix ? 'déplacement ' + ZONES[z].prix + ' €' : 'déplacement offert'}">${COMMUNES.filter(x => x[1] === z).map(x => `<option ${x[0] === d.commune ? 'selected' : ''}>${esc(x[0])}</option>`).join('')}</optgroup>`).join('')}
        </select></div></div>`;
      if (c) h += `<div class="zonebadge" style="--z:var(--z-${c[1]})"><b>Zone ${ZONES[c[1]].nom}</b><span>${ZONES[c[1]].prix ? 'Déplacement ' + ZONES[c[1]].prix + ' €' : 'Déplacement offert'}</span><span>Agence ${AGENCES[c[2]].de}</span></div>`;
    }
    if (d.mode === 'atelier') {
      h += `<h3>Dans quelle agence ?</h3><div class="grid g2" role="radiogroup">${Object.entries(AGENCES).map(([k, a]) =>
        tile({ name: 'agence', value: k, checked: d.agence === k, title: a.nom, sub: a.detail, icon: 'pin', onchange: `setD('agence','${k}')` })).join('')}</div>`;
    }
    if (state.kind !== 'rdv') return h;

    // Date + créneaux
    const t = premierJour();
    const quick = [];
    for (let i = 0; quick.length < 4 && i < 12; i++) {
      const v = addDays(t, i);
      if (!creneauxFor(v).some(([, why]) => !why)) continue;
      quick.push([v, v === addDays(todayISO(), 1) ? 'Demain' : shortDate(v)]);
    }
    h += `<h3>${d.mode === 'atelier' ? 'Quand passez-vous déposer le matériel ?' : 'Quand souhaitez-vous le rendez-vous ?'} <span class="req">*</span></h3>
      <div class="when">
        <div class="chips">${quick.map(([v, l]) => `<button type="button" class="chip ${d.date === v ? 'on' : ''}" onclick="setDate('${v}')">${l}</button>`).join('')}</div>
        <input id="date" type="date" aria-label="Date du rendez-vous" min="${t}" value="${esc(d.date)}" onchange="setDate(this.value)">
      </div>
      <p class="muted small">Rendez-vous à partir de demain, ${CONFIG.placesParCreneau} clients maximum le matin et l’après-midi pour bien prendre le temps. Urgence aujourd’hui ? <a href="${telUrl(AGENCES[agenceKey()].tel)}">Appelez le ${esc(AGENCES[agenceKey()].tel)}</a>.</p>`;
    if (d.date) {
      const list = creneauxFor(d.date);
      const dk = delaiKey(d.date);
      if (!list.length) h += `<p class="notice">Nous sommes fermés ce jour-là. Choisissez un autre jour.</p>`;
      else h += `<div class="grid g3 slots" role="radiogroup" aria-label="Créneau">${list.map(([k, why]) => tile({
          name: 'creneau', value: k, checked: d.creneau === k && !why, disabled: !!why, title: CRENEAUX[k].label,
          sub: why ? `<span class="full">${why}</span>` : `<span class="mono">${CRENEAUX[k].heures}</span>${(n => n === null ? '' : `<span class="places ${n === 1 ? 'derniere' : ''}">${n === 1 ? 'Dernière place' : n + ' places libres'}</span>`)(places(d.date, k))}`, price: !why && d.mode === 'site' && CRENEAUX[k].prix ? '+' + CRENEAUX[k].prix + ' €' : '',
          onchange: `setD('creneau','${k}')` })).join('')}</div>`;
      if (list.length) h += `<p class="delai delai-${dk}">${frDate(d.date)} · <b>${DELAIS[dk].label}</b>${DELAIS[dk].prix ? ` (+${DELAIS[dk].prix} €)` : ''}</p>`;
    }
    return h;
  },
  3() {
    const { d } = state;
    const r = calc();
    const rdv = state.kind === 'rdv';
    const opts = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
    return `<h2 id="stepTitle">Vos coordonnées</h2><p class="lead">${rdv ? `L'agence ${AGENCES[agenceKey()].de} vous recontacte pour confirmer le rendez-vous.` : 'Votre devis s’affiche juste après, et l’agence en reçoit une copie.'}</p><div class="form">
      <div class="field"><label for="name">Nom et prénom <span class="req">*</span></label><input id="name" value="${esc(d.name)}" autocomplete="name" required oninput="setD('name',this.value,true)"></div>
      <div class="field"><label for="phone">Téléphone <span class="req">*</span></label><input id="phone" type="tel" value="${esc(d.phone)}" autocomplete="tel" placeholder="0696 00 00 00" required oninput="setD('phone',this.value,true)"></div>
      <div class="field"><label for="email">Email <span class="muted">(facultatif : pour recevoir le récapitulatif)</span></label><input id="email" type="email" value="${esc(d.email)}" autocomplete="email" oninput="setD('email',this.value,true)"></div>
      <div class="field"><label for="pref">On vous recontacte par</label><select id="pref" onchange="setD('pref',this.value,true)">${opts(CONTACT_PREF, d.pref)}</select></div>
      ${d.mode === 'site' ? `<div class="field full"><label for="address">Adresse ou quartier</label><input id="address" value="${esc(d.address)}" autocomplete="street-address" placeholder="Quartier, rue… (${esc(d.commune)})" oninput="setD('address',this.value,true)"></div>` : ''}
      <input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" oninput="setD('website',this.value,true)">
      </div>
      <h3>${ico('help')} Quelques précisions <span class="muted">facultatif : vous pouvez laisser vide</span></h3><div class="form">
      <div class="field"><label for="type">Vous êtes</label><select id="type" onchange="setD('type',this.value)">${opts(TYPES, d.type)}</select></div>
      ${needsAppareil() ? `<div class="field"><label for="appType">Type d'appareil</label><select id="appType" onchange="setD('appType',this.value,true)"><option value="">Choisir…</option>${opts(APPAREILS, d.appType)}</select></div>
      <div class="field"><label for="appareil">Marque et modèle <span class="muted">(si vous savez)</span></label><input id="appareil" value="${esc(d.appareil)}" placeholder="Exemple : HP Pavilion 15, Windows 11" oninput="setD('appareil',this.value,true)"></div>` : ''}
      <div class="field full"><label for="desc">Expliquez avec vos mots</label><textarea id="desc" placeholder="Exemple : mon ordinateur est très lent depuis une mise à jour." oninput="setD('desc',this.value,true)">${esc(d.desc)}</textarea></div>
      <div class="field full"><label for="photo">Photo du problème <span class="muted">(message d'erreur, matériel…)</span></label>
        <div class="photo-row"><input id="photo" type="file" accept="image/*" onchange="addPhoto(this.files[0])">${photo ? `<img src="${photo.url}" alt="Aperçu de votre photo" class="thumb"><button type="button" class="link" onclick="removePhoto()">Retirer</button>` : ''}</div></div></div>
      ${d.type !== 'individual' ? `<label class="check"><input type="checkbox" ${d.contrat ? 'checked' : ''} onchange="setD('contrat',this.checked,true)"><span><b>Je souhaite des informations sur le ${CONTRAT_PRO}</b><br><span class="muted">Interventions prioritaires, déplacements inclus, suivi des sauvegardes.</span></span></label>` : ''}
      <label class="check consent"><input type="checkbox" ${d.consent ? 'checked' : ''} onchange="setD('consent',this.checked,true)"><span>J'accepte que mes informations soient utilisées par IloTech pour traiter ma demande et me recontacter (<a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>). <span class="req">*</span></span></label>
      <div class="estimate">${rdv ? `Rendez-vous : <b>${frDate(d.date)}, ${CRENEAUX[d.creneau]?.label.toLowerCase() || ''}</b> · ` : ''}Estimation : <b>${priceText(r)}</b></div>`;
  }
};

function render() {
  document.body.classList.remove('print-devis');
  // garde le focus clavier sur le même élément après mise à jour
  const a = document.activeElement;
  const key = a && a.name ? `[name="${a.name}"][value="${a.value}"]` : a && a.id && $('app').contains(a) ? '#' + a.id : null;
  const vueCle = state.step + '|' + state.cat;
  try { $('app').classList.toggle('anime', vueCle !== derniereVue); } catch (e) {}
  derniereVue = vueCle;
  $('app').innerHTML = VIEWS[state.step]();
  $('app').dataset.view = String(state.step);
  document.body.dataset.etape = String(state.step);
  renderSteps();
  renderNav();
  renderSummary();
  save();
  if (key) document.querySelector(key)?.focus();
  document.querySelectorAll('.univers [aria-selected="true"], .cats [aria-selected="true"]').forEach(b => {
    const p = b.parentElement;
    if (p.scrollWidth > p.clientWidth) p.scrollLeft = b.offsetLeft - p.offsetLeft - 12;
  });
}

function renderStatic() {
  if ($('bientotNote')) $('bientotNote').innerHTML = BIENTOT.length ? `<span class="soon">Bientôt</span> ${BIENTOT.map(esc).join(' · ')}` : '';
  $('offertZones').textContent = CONFIG.deplacementOffertDes;
  $('tarifs').innerHTML = Object.entries(ZONES).map(([k, z]) => `<tr><td><span class="dot" style="--z:var(--z-${k})"></span>${z.nom}</td><td>${z.prix ? z.prix + ' €' : 'Offert'}</td></tr>`).join('')
    + `<tr><td>En agence ou à distance</td><td>Gratuit</td></tr>`;
  $('zonesGrid').innerHTML = Object.entries(ZONES).map(([k, z]) => `<div class="zone" style="--z:var(--z-${k})">
    <div class="zone-head"><b>${z.nom}</b><strong>${z.prix ? z.prix + ' €' : 'Offert'}</strong></div>
    <span class="muted">${z.delai}</span>
    <p>${COMMUNES.filter(c => c[1] === k).map(c => esc(c[0])).join(', ')}</p></div>`).join('');
  $('headContact').innerHTML = Object.values(AGENCES).map(a => `<a class="btn btn-head" href="${waUrl(a.tel, "Bonjour IloTech, j'aimerais un renseignement.")}" target="_blank" rel="noopener" aria-label="WhatsApp agence ${a.nom}, ${esc(a.tel)}">${ico('chat')}<span>${a.nom}</span><span class="tel mono">${esc(a.tel)}</span></a>`).join('');
  $('helpAgences').innerHTML = Object.values(AGENCES).map(a => `<div class="agency"><b>${ico('pin')} Agence ${a.de}</b>
    <span class="muted">${a.detail}</span><a class="btn btn-primary big" href="${telUrl(a.tel)}">${ico('phone')} Appeler le ${esc(a.tel)}</a>
    <a class="btn btn-wa" href="${waUrl(a.tel, "Bonjour IloTech, j'ai besoin d'aide.")}" target="_blank" rel="noopener">${ico('chat')} Écrire sur WhatsApp</a></div>`).join('');
  $('helpHours').textContent = 'Du lundi au vendredi de ' + HORAIRES[1][0] + ' h à ' + HORAIRES[1][1] + ' h, le samedi de ' + HORAIRES[6][0] + ' h à ' + HORAIRES[6][1] + ' h.';
  updateStatus();
}
function renderAvis() {
  const el = $('avis');
  if (el) el.innerHTML = CONFIG.avisGoogleUrl ? `<a href="${esc(CONFIG.avisGoogleUrl)}" target="_blank" rel="noopener">★ Nos avis Google</a>` : '';
}
function updateStatus() {
  const st = openStatus();
  $('openStatus').innerHTML = `<span class="dot ${st.open ? 'on' : ''}"></span>${st.text}`;
}
function openZones() { $('zonesDialog').showModal(); }

/* =====================================================================
   ACTIONS
   ===================================================================== */
function setD(k, v, silent) {
  state.d[k] = v;
  if (k === 'mode' || k === 'commune' || k === 'agence') { state.d.creneau = ''; fetchSlots(state.d.date); }
  if (silent) { renderSummary(); save(); } else render();
}
function setDate(v) {
  state.d.date = v;
  state.d.creneau = '';
  const list = creneauxFor(v).filter(([, why]) => !why);
  if (list.length === 1) state.d.creneau = list[0][0];
  render();
  fetchSlots(v);
}
function setTab(t) { state.tab = t; render(); }
function openHelp() { $('helpDialog').showModal(); stat('aide'); }
let toastTimer;
function toast(msg) {
  const t = $('toast'); if (!t) return;
  t.innerHTML = msg + (window.innerWidth <= 900 ? ' <button type="button" class="link" onclick="showSel()">Voir</button>' : '');
  t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
function setGrand(on) {
  document.body.classList.toggle('grand', on);
  try { localStorage.setItem('itGrand', on ? '1' : ''); } catch (e) {}
  const b = $('grandBtn'); if (b) b.setAttribute('aria-pressed', on);
}
function showSel() { document.querySelector('.summary').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
const univOf = cat => (CATEGORIES.find(c => c.id === cat) || CATEGORIES[0]).univers;
function setUniv(u) { const c = CATEGORIES.find(x => x.univers === u && !x.bientot); if (c) { state.cat = c.id; render(); stat('pole', u); } }
function setCat(c) { if (CATEGORIES.find(x => x.id === c && !x.bientot)) { state.cat = c; render(); } }
function setKind(k) {
  state.kind = k;
  if (state.step > 2 && k === 'rdv' && (!state.d.date || !state.d.creneau)) state.step = 2;
  render();
}
function start(kind) {
  if (!state.sel.length) return error('Choisissez d’abord un service ou un pack.');
  state.kind = kind;
  stat('etape', kind);
  goTo(2);
}
function home() { state.step = 1; state.tab = 'services'; render(); $('app').scrollTop = 0; }
function openChat() {
  if (!state.d.chatCommune && state.d.commune) state.d.chatCommune = state.d.commune;
  goTo('chat');
}
let dernierAjout = null, derniereVue = '';
function toggle(id) {
  const { sel } = state;
  const adding = !sel.includes(id);
  state.sel = adding ? [...sel, id] : sel.filter(x => x !== id);
  if (adding) stat('service', id);
  if (!packValid()) state.pack = null;
  state.symptoms = [];
  fixMode();
  dernierAjout = adding ? id : null;
  render();
  dernierAjout = null;
  toast(adding ? `${['🎉 Super choix !', '👍 Bien joué !', '⚡ Excellent !', '✨ Parfait !'][state.sel.length % 4]} « ${esc(svc(id).nom)} » est dans votre sélection` : `« ${esc(svc(id).nom)} » retiré`);
  if (adding) { try { const c = document.querySelector('.service.carte.on input[value="' + id + '"]'); const r = c && c.closest('.carte').getBoundingClientRect(); if (r) confettis(r.left + r.width / 2, r.top + r.height / 2, 18); } catch (e) {} }
}
// un pack s'ajoute aux services déjà cochés (un seul pack à la fois)
function selectPack(id) {
  const removeItems = items => Object.entries(items).forEach(([sid, opts]) => {
    state.opt[sid] = (state.opt[sid] || []).filter(o => !opts.includes(o));
    if (!state.opt[sid].length) state.sel = state.sel.filter(x => x !== sid);
  });
  const wasOn = state.pack === id && packValid();
  if (packValid()) removeItems(pack(state.pack).items);
  state.pack = null;
  if (!wasOn) { state.pack = id; applyItems(pack(id).items); stat('pack', id); }
  state.symptoms = [];
  fixMode();
  render();
  toast(wasOn ? `Formule « ${esc(pack(id).nom)} » retirée` : `✓ Formule « ${esc(pack(id).nom)} » choisie`);
}
function toggleSymptom(id) {
  const cur = state.symptoms;
  state.symptoms = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
  if (!cur.includes(id)) stat('symptome', id);
  state.sel = []; state.opt = {}; state.pack = null;
  state.symptoms.forEach(sid => {
    const s = SYMPTOMES.find(x => x.id === sid);
    if (s.pack) { state.pack = s.pack; applyItems(pack(s.pack).items); } else applyItems(s.items);
  });
  fixMode();
  render();
}
function error(msg) { const e = $('err'); if (e) e.textContent = msg; }
// type d'appareil deviné d'après les services choisis
function guessAppType() {
  const has = id => state.sel.includes(id);
  if (has('hwportable')) return 'portable';
  if (has('hwfixe') || has('gamer')) return 'fixe';
  if (has('console') || has('emulation')) return 'console';
  return '';
}
function goTo(step) {
  if (step === 3 && !state.d.appType) state.d.appType = guessAppType();
  state.step = step;
  render();
  $('app').scrollTop = 0;
  $('app').focus({ preventScroll: true });
  if (window.innerWidth <= 900) $('main').scrollIntoView({ block: 'start' });
  if (step === 2) fetchSlots(state.d.date);
}
function next() {
  const { step, sel, d, kind } = state;
  if (step === 1 && !sel.length) return error('Choisissez au moins un service ou un pack.');
  if (step === 2) {
    if (d.mode === 'site' && !d.commune) return error('Choisissez votre commune.');
    if (kind === 'rdv') {
      if (!d.date) return error('Choisissez une date.');
      if (d.date < premierJour()) return error('Les rendez-vous se prennent à partir de demain. Pour une urgence aujourd’hui, appelez-nous.');
      const ok = creneauxFor(d.date).some(([k, why]) => k === d.creneau && !why);
      if (!ok) return error('Choisissez un créneau disponible.');
    }
  }
  if (step < STEPS[kind].length) goTo(step + 1);
}
function prev() { if (state.step > 2) goTo(state.step - 1); else home(); }
function help() {
  state.sel = ['repair']; state.opt = { repair: [] }; state.pack = null; state.symptoms = [];
  if (!state.d.desc) state.d.desc = 'Je ne sais pas exactement quelle intervention choisir. Je souhaite un diagnostic et un conseil.';
  fixMode();
  goTo(2);
}

/* =====================================================================
   ENVOI
   ===================================================================== */
function lieuLabel(d) {
  if (d.mode === 'site') return `Chez le client — ${d.commune}${d.address ? ', ' + d.address : ''}`;
  if (d.mode === 'atelier') return `Dépôt en agence — ${AGENCES[d.agence].nom}`;
  return 'À distance';
}

function recapText(lead) {
  const r = lead.estimate;
  const lines = [
    `${lead.kind === 'devis' ? 'Demande de devis' : 'Demande de rendez-vous'} ${lead.ref} — IloTech (agence ${lead.agenceNom})`,
    `Client : ${lead.name} — ${lead.phone} — ${lead.email}`,
    lead.kind === 'rdv' ? `Rendez-vous : ${lead.dateLabel}, ${lead.creneauLabel}` : '',
    `Lieu : ${lead.lieu}`,
    '',
    ...r.lines.map(l => `- ${l.label}${l.detail ? ' (' + l.detail + ')' : ''} : ${l.prix || l.mensuel ? lineVal(l) : 'gratuit'}`),
    r.deplLabel ? `- ${r.deplLabel} : ${r.offert ? 'offert' : r.depl ? eur(r.depl) : 'gratuit'}` : '',
    r.urg ? `- Délai ${DELAIS[r.delai].label.toLowerCase()} : +${eur(r.urg)}` : '',
    r.cren ? `- ${CRENEAUX[lead.creneau].label} : +${eur(r.cren)}` : '',
    lead.appareil ? `- Appareil : ${lead.appareil}` : '',
    lead.hasPhoto ? '- Photo du problème jointe' : '',
    lead.contrat ? `- Souhaite des informations sur le ${CONTRAT_PRO}` : '',
    '',
    `Estimation : ${priceText(r)}${r.savings ? ` (économie : ${eur(r.savings)})` : ''}`,
    `Recontacter par : ${CONTACT_PREF[lead.pref]}`,
    lead.desc ? `\nBesoin : ${lead.desc}` : ''
  ];
  return lines.filter(l => l !== '').join('\n');
}

function buildLead() {
  const { d, kind } = state;
  const now = new Date();
  const ag = agenceKey();
  const cr = CRENEAUX[d.creneau];
  const p = packValid() ? pack(state.pack) : null;
  const lead = {
    ref: (kind === 'devis' ? 'DEV-' : 'RDV-') + iso(now).slice(2).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
    kind, ...d,
    agence: ag, agenceNom: AGENCES[ag].nom, agenceDe: AGENCES[ag].de,
    services: state.sel, options: state.opt, pack: p ? p.id : null,
    servicesLabel: (p ? [packLabel(p)] : []).concat(state.sel.filter(id => !p?.items[id]).map(id => svc(id).nom)).join(', '),
    lieu: lieuLabel(d),
    dateLabel: kind === 'rdv' ? frDate(d.date) : '', creneauLabel: kind === 'rdv' && cr ? `${cr.label} (${cr.heures})` : '',
    heures: kind === 'rdv' && cr ? cr.h : null,
    typeLabel: TYPES[d.type],
    estimate: calc(),
    date_demande: now.toLocaleString('fr-FR'),
    validite: iso(new Date(now.getTime() + CONFIG.validiteDevis * 86400000))
  };
  if (kind !== 'rdv') { lead.date = ''; lead.creneau = ''; }
  delete lead.chatMsg; delete lead.chatCommune;
  lead.delaiLabel = DELAIS[lead.estimate.delai].label;
  lead.appareil = [APPAREILS[d.appType], d.appareil].filter(Boolean).join(' — ');
  lead.hasPhoto = !!photo;
  lead.recap = recapText(lead);
  return lead;
}

async function send() {
  const { d } = state;
  if (sending) return;
  if (!d.name.trim() || !d.phone.trim()) return error('Merci d’indiquer votre nom et votre téléphone.');
  if (d.email.trim() && !/^\S+@\S+\.\S+$/.test(d.email)) return error("L'adresse email n'est pas valide (vous pouvez aussi la laisser vide).");
  if (d.pref === 'email' && !d.email.trim()) return error('Indiquez votre email, ou choisissez d’être recontacté par appel ou WhatsApp.');
  if (digits(d.phone).length < 10) return error("Le numéro de téléphone n'est pas valide.");
  if (!d.consent) return error('Merci de cocher la case d’accord pour que nous puissions vous recontacter.');

  const lead = buildLead();

  sending = true; renderNav();
  // ① Google (tableau, planning, photo) — en premier, car il peut refuser un créneau devenu complet
  let google = null;
  if (CONFIG.endpoint) {
    try {
      const res = await fetch(CONFIG.endpoint, { method: 'POST', body: JSON.stringify({ ...lead, duree: Date.now() - ouvertLe, photo: photo ? { data: photo.data, type: photo.type } : null }) });
      google = await res.json();
    } catch (e) { google = { ok: false, reason: 'reseau' }; }
  }
  if (google && !google.ok && google.reason === 'trop') { sending = false; renderNav(); return error('Trop de demandes envoyées : appelez-nous ou écrivez-nous sur WhatsApp.'); }
  if (google && !google.ok && google.reason === 'delai') { sending = false; goTo(2); return error('Les rendez-vous se prennent à partir de demain. Pour une urgence aujourd’hui, appelez-nous.'); }
  if (google && !google.ok && google.reason === 'complet') {
    sending = false;
    delete slotCache[d.date + '|' + lead.agence];
    goTo(2);
    return error('Ce créneau vient d’être réservé par un autre client. Choisissez-en un autre.');
  }
  // ② Email (FormSubmit)
  const mailed = CONFIG.emailReception ? await sendByEmail(lead, !!(google && google.ok)) : false;
  sending = false;
  const result = { ok: !!(google && google.ok) || mailed, google: !!(google && google.ok) };
  stat('demande', lead.kind);
  lead.kind === 'devis' ? renderDevis(lead, result.ok, result.google) : renderSuccess(lead, result.ok, result.google);
}

// Envoi de la demande par email à l'équipe (FormSubmit) + accusé de réception au client
async function sendByEmail(lead, photoInGoogle) {
  const r = lead.estimate;
  const body = {
    _subject: `${lead.kind === 'devis' ? 'Demande de devis' : 'Nouveau rendez-vous'} ${lead.ref} — ${lead.agenceNom}${lead.dateLabel ? ' — ' + lead.dateLabel : ''}`,
    _template: 'table',
    _captcha: 'false',
    _replyto: lead.email,
    _autoresponse: `Bonjour ${lead.name},\n\nNous avons bien reçu votre demande ${lead.ref}. L'agence ${AGENCES[lead.agence].de} vous recontacte rapidement.\n\n${lead.recap}\n\nIloTech — ${AGENCES[lead.agence].tel}`,
    email: lead.email,
    'Référence': lead.ref,
    'Demande': lead.kind === 'devis' ? 'Devis' : 'Rendez-vous',
    'Agence': lead.agenceNom,
    'Client': lead.name,
    'Téléphone': lead.phone,
    'Recontacter par': CONTACT_PREF[lead.pref],
    'Rendez-vous': lead.kind === 'rdv' ? `${lead.dateLabel}, ${lead.creneauLabel}` : '—',
    'Lieu': lead.lieu,
    'Services': lead.servicesLabel,
    'Estimation': priceText(r),
    'Appareil': lead.appareil || '—',
    'Photo': lead.hasPhoto ? (photoInGoogle ? 'Oui — dans le tableau Google' : 'Le client a une photo : demandez-la sur WhatsApp') : 'Non',
    'Description': lead.desc || '—',
    'Récapitulatif': lead.recap
  };
  if (CONFIG.emailCopie) body._cc = CONFIG.emailCopie;
  if (!lead.email) { delete body._replyto; delete body._autoresponse; body.email = 'Pas d’email (rappeler au ' + lead.phone + ')'; }
  try {
    const res = await fetch('https://formsubmit.co/ajax/' + encodeURIComponent(CONFIG.emailReception), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body)
    });
    const j = await res.json();
    return j.success === true || j.success === 'true';
  } catch (e) { return false; }
}

// Photo : redimensionnée dans le navigateur (1280 px max) avant l'envoi
async function addPhoto(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) return error('Choisissez une image (photo).');
  const url = URL.createObjectURL(file);
  const img = new Image();
  const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = url; });
  URL.revokeObjectURL(url);
  if (!ok) return error('Impossible de lire cette image.');
  const scale = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement('canvas');
  cv.width = Math.round(img.naturalWidth * scale);
  cv.height = Math.round(img.naturalHeight * scale);
  cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
  const dataUrl = cv.toDataURL('image/jpeg', 0.75);
  photo = { url: dataUrl, data: dataUrl.split(',')[1], type: 'image/jpeg' };
  render();
}
function removePhoto() { photo = null; render(); }

// Suivre ma demande
function openSuivi(ref) {
  if (ref) suivi = { ref };
  state.step = 'suivi';
  render();
  $('app').scrollTop = 0;
}
async function checkSuivi() {
  const ref = $('sRef').value.trim().toUpperCase();
  const tel = digits($('sTel').value);
  suivi = { ref, tel };
  if (!/^(RDV|DEV)-\d{6}-[A-Z0-9]{4}$/.test(ref)) { suivi.error = 'Référence non reconnue. Elle ressemble à RDV-261004-AB12.'; return render(); }
  if (tel.length !== 4) { suivi.error = 'Indiquez les 4 derniers chiffres de votre téléphone.'; return render(); }
  suivi.loading = true; render();
  try {
    const res = await fetch(`${CONFIG.endpoint}?action=suivi&ref=${encodeURIComponent(ref)}&tel=${tel}`);
    const j = await res.json();
    suivi = { ref, tel, ...(j.ok ? { result: j } : { error: 'Aucune demande trouvée avec ces informations.' }) };
  } catch (e) { suivi = { ref, tel, error: 'Connexion impossible. Réessayez dans un instant.' }; }
  render();
}

function finishScreen() {
  $('steps').innerHTML = STEPS[state.kind].map((s, i) => `<li class="done"><span class="n">0${i + 1}</span><span class="t">${s}</span></li>`).join('');
  $('nav').innerHTML = ''; $('nav').hidden = true;
  $('app').scrollTop = 0;
  $('app').focus();
  try { localStorage.removeItem('itDraft3'); } catch (e) {}
}

function renderSuccess(lead, received, google) {
  const ag = AGENCES[lead.agence];
  const txt = lead.recap;
  setTimeout(() => { try { if (received) confettis(innerWidth / 2, innerHeight / 3, 70); } catch (e) {} }, 150);
  $('app').innerHTML = `<div class="success">
      <div class="okmark ${received ? '' : 'warn'}" aria-hidden="true">${received ? '✓' : '!'}</div>
      <h2 id="stepTitle">${received ? `Merci ${esc(lead.name)}, votre demande est bien reçue` : 'Dernière étape : envoyez-nous votre demande'}</h2>
      <span class="ref mono">${esc(lead.ref)}</span>
      <p>${received
        ? `L'agence <b>${ag.de}</b> vous recontacte par <b>${CONTACT_PREF[lead.pref].toLowerCase()}</b> pour confirmer votre rendez-vous du <b>${esc(lead.dateLabel)}</b>, ${esc(lead.creneauLabel.toLowerCase())}.${lead.email ? ' Un email récapitulatif vient de vous être envoyé.' : ''}${lead.hasPhoto && !google ? ' <b>Envoyez aussi votre photo</b> sur WhatsApp.' : ''}`
        : `Votre demande est prête. Envoyez-la à l'agence <b>${ag.de}</b> sur WhatsApp pour réserver votre rendez-vous du <b>${esc(lead.dateLabel)}</b>.`}</p>
      <div class="actions">
        <a class="btn ${received ? '' : 'btn-wa'}" href="${waUrl(ag.tel, txt)}" target="_blank" rel="noopener">${ico('chat')} ${received ? 'Écrire' : 'Envoyer'} sur WhatsApp</a>
        <a class="btn" href="${telUrl(ag.tel)}">${ico('phone')} ${esc(ag.tel)}</a>
        ${received || !CONFIG.email ? '' : `<a class="btn" href="mailto:${CONFIG.email}?subject=${encodeURIComponent('Demande ' + lead.ref)}&body=${encodeURIComponent(txt)}">Par email</a>`}
      </div>
      ${google ? `<p class="small">Conservez votre référence : elle permet de <button type="button" class="link" onclick="openSuivi('${esc(lead.ref)}')">suivre votre demande</button>.</p>` : ''}
      <pre class="recap">${esc(txt)}</pre>
      ${CONFIG.avisGoogleUrl ? `<p class="small">Déjà client ? <a href="${esc(CONFIG.avisGoogleUrl)}" target="_blank" rel="noopener">Laissez-nous un avis Google</a></p>` : ''}
      <button type="button" class="link" onclick="reset()">Faire une nouvelle demande</button></div>`;
  finishScreen();
}

// document du devis : sert à l'aperçu immédiat (sans coordonnées) et au devis final
function devisDoc(r, { ref, agence, client, validite, apercu }) {
  const ag = AGENCES[agence];
  const row = (label, detail, value) => `<tr><td>${esc(label)}${detail ? `<small>${esc(detail)}</small>` : ''}</td><td>${value}</td></tr>`;
  let rows = r.lines.map(l => row(l.label, l.detail, (l.old ? `<s>${eur(l.old)}</s> ` : '') + (l.prix || l.mensuel ? lineVal(l) : 'Gratuit'))).join('');
  if (r.deplLabel) rows += row(r.deplLabel, client.commune || '', r.offert ? `<s>${eur(r.deplPlein)}</s> Offert` : r.depl ? eur(r.depl) : 'Gratuit');
  return `<article class="devis" id="devisDoc">
      <header class="devis-head">
        <div class="devis-brand"><img class="devis-logo" src="img/logo-ilo.png" alt=""><div><b>${ENTREPRISE.nomCommercial}</b><small>Agence ${ag.de} · ${esc(ag.tel)}</small><small>${ENTREPRISE.exploitant} · SIRET ${ENTREPRISE.siret}</small></div></div>
        <div class="mono devis-meta"><b>${apercu ? 'APERÇU DU DEVIS' : 'DEVIS ESTIMATIF'}</b><span>N° ${esc(ref)}</span><span>Émis le ${new Date().toLocaleDateString('fr-FR')}</span><span>Valable jusqu'au ${parseISO(validite).toLocaleDateString('fr-FR')}</span></div>
      </header>
      <div class="devis-client"><span class="mono">CLIENT</span>${client.nom ? `<b>${esc(client.nom)}</b><span>${esc(client.contact)}</span><span>${esc(client.lieu)}</span>${client.appareil ? `<span>Appareil : ${esc(client.appareil)}</span>` : ''}`
        : '<span class="muted">À compléter : vos coordonnées sont demandées pour recevoir le devis officiel.</span>'}</div>
      <table class="devis-table"><thead><tr><th>Désignation</th><th>Prix</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td>Total estimé${r.savings ? `<small>dont ${eur(r.savings)} d'économie</small>` : ''}</td><td>${priceText(r)}</td></tr></tfoot></table>
      <ul class="devis-conditions">
        <li>${CONFIG.mentionPrix ? esc(CONFIG.mentionPrix) + '.' : ''} Prix en euros, définitif après diagnostic et confirmé avant toute intervention.</li>
        <li>Aucun acompte pour un dépannage ; pièces éventuelles annoncées avant d'être commandées.${CONFIG.paiement3fois && r.min >= CONFIG.paiement3fois ? ' Paiement possible en 3 fois sans frais.' : ''}</li>
        <li>Devis gratuit et sans engagement, valable ${CONFIG.validiteDevis} jours.</li>
      </ul>
      ${apercu ? '' : `<div class="devis-accord"><div><span class="mono">BON POUR ACCORD</span><small>Date et signature du client</small></div><div><span class="mono">${ENTREPRISE.nomCommercial}</span><small>Agence ${ag.de}</small></div></div>`}
    </article>`;
}

function renderDevis(lead, received, google) {
  const ag = AGENCES[lead.agence];
  $('app').innerHTML = `
    <div class="devis-status ${received ? 'ok' : ''}">${received ? `✓ Votre demande de devis est transmise à l'agence <b>${ag.de}</b>. Une copie vous est envoyée par email.` : `Envoyez ce devis à l'agence <b>${ag.de}</b> sur WhatsApp pour qu'elle le confirme.`}</div>
    <div class="actions devis-actions">
      <button type="button" class="btn btn-primary" onclick="devisToRdv()">${ico('calendar')} J'accepte : prendre rendez-vous</button>
      <a class="btn btn-wa" href="${waUrl(ag.tel, lead.recap)}" target="_blank" rel="noopener">${ico('chat')} ${received ? 'Discuter' : 'Envoyer'} sur WhatsApp</a>
      <button type="button" class="btn" onclick="print()">${ico('doc')} Imprimer / PDF</button>
    </div>
    ${devisDoc(lead.estimate, { ref: lead.ref, agence: lead.agence, validite: lead.validite,
      client: { nom: lead.name, contact: [lead.phone, lead.email].filter(Boolean).join(' · '), lieu: lead.lieu, appareil: lead.appareil, commune: lead.mode === 'site' ? lead.commune : '' } })}
    <p class="center"><button type="button" class="link" onclick="reset()">Faire une nouvelle demande</button></p>`;
  document.body.classList.add('print-devis');
  finishScreen();
}

// aperçu immédiat, sans rien remplir : le client voit son devis, l'imprime, l'envoie, ou demande le devis officiel
function apercuDevis() {
  const r = calc(), dlg = $('apercuDevis');
  if (!r.lines.length) { toast('Choisissez d’abord un service ou une formule'); return; }
  const ag = agenceKey();
  const recap = `Bonjour IloTech, voici ma sélection : ${r.lines.map(l => l.label).join(', ')}. Total estimé : ${priceText(r)}.`;
  dlg.innerHTML = `<div class="dialog-head"><h2>Votre devis en un coup d’œil</h2><button type="button" class="btn" onclick="this.closest('dialog').close()">Fermer</button></div>
    ${devisDoc(r, { ref: 'aperçu', agence: ag, client: {}, validite: iso(new Date(Date.now() + CONFIG.validiteDevis * 86400000)), apercu: true })}
    <div class="actions devis-actions">
      <button type="button" class="btn btn-primary" onclick="$('apercuDevis').close();start('devis')">${ico('doc')} Recevoir le devis officiel (gratuit)</button>
      <button type="button" class="btn" onclick="$('apercuDevis').close();start('rdv')">${ico('calendar')} Prendre rendez-vous</button>
      <a class="btn btn-wa" href="${waUrl(AGENCES[ag].tel, recap)}" target="_blank" rel="noopener">${ico('chat')} Envoyer sur WhatsApp</a>
    </div>`;
  dlg.showModal(); stat('apercu_devis');
}

// menu du site (toutes tailles d'écran) : pôles, ressources, autres sites, contact, réglages d'affichage
function ouvrirMenu() {
  const dlg = $('menuSite');
  const lien = (href, t, sub = '') => `<a href="${href}">${t}${sub ? `<small>${sub}</small>` : ''}</a>`;
  dlg.innerHTML = `<div class="dialog-head"><h2>Menu</h2><button type="button" class="btn" onclick="this.closest('dialog').close()">Fermer</button></div>
    <div class="menu-grille">
      <section><h3>Nos services</h3>${UNIVERS.map(u => `<button type="button" style="--t:${u.couleur}" onclick="$('menuSite').close();setUniv('${u.id}');scrollTo({top:0,behavior:'smooth'})">${ico(u.icon)}<span>${esc(u.nom)}<small>${esc(u.desc)}</small></span></button>`).join('')}</section>
      <section><h3>Infos et outils</h3>
        ${lien('services.html', 'Tous les services et tarifs')}${lien('installation-starlink-martinique.html', 'Installation Starlink', 'Internet partout en Martinique')}
        ${lien('conseils.html', 'Conseils et guides')}${lien('outils-gratuits.html', 'Outils gratuits', 'QR code, mot de passe…')}
        ${lien('fiche-tarifs.html', 'Fiche tarifs à imprimer')}<a href="#" onclick="$('menuSite').close();openSuivi();return false">Suivre ma demande</a>
        <h3>Nos autres sites</h3>${lien('https://studio.ilo-tech.com/', 'IloTech Studio', 'Agence marketing et IA')}${lien('https://immo.ilo-tech.com/', 'IloTech Immobilier', 'Photos, drone, annonces')}</section>
      <section><h3>Nous contacter</h3>${Object.values(AGENCES).map(a => `<div class="menu-agence"><b>Agence ${a.de}</b>
          <a class="btn btn-primary" href="${telUrl(a.tel)}">${ico('phone')} ${esc(a.tel)}</a>
          <a class="btn btn-wa" href="${waUrl(a.tel, "Bonjour IloTech, j'aimerais un renseignement.")}" target="_blank" rel="noopener">${ico('chat')} WhatsApp</a></div>`).join('')}
        <h3>Affichage</h3>
        <button type="button" class="btn" onclick="setGrand(!document.body.classList.contains('grand'))"><b class="aa">A<small>A</small></b> Texte plus grand</button>
        <button type="button" class="btn" onclick="setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light')">Mode clair / sombre</button></section>
    </div>`;
  dlg.showModal();
}

function devisToRdv() { state.kind = 'rdv'; goTo(2); }

function reset() {
  state = structuredClone(DEFAULT);
  try { localStorage.removeItem('itDraft3'); } catch (e) {}
  render();
}

window.addEventListener('hashchange', () => { if (location.hash === '#suivi') openSuivi(); });
if (location.hash === '#suivi') { state.step = 'suivi'; suivi = { ref: new URLSearchParams(location.search).get('ref') || '' }; }
// lien direct vers un pôle ou un onglet : index.html?pole=web ou ?cat=drone (boutons « Découvrir » de la page Services)
(q => {
  const c = CATEGORIES.find(x => !x.bientot && (x.id === q.get('cat') || (!q.get('cat') && x.univers === q.get('pole'))));
  if (c) { state.cat = c.id; state.step = 1; state.tab = 'services'; }
})(new URLSearchParams(location.search));
setInterval(updateStatus, 60000);
try { if (localStorage.getItem('itGrand')) setGrand(true); } catch (e) {}
renderStatic();
renderAvis();
render();
if (state.step === 2) fetchSlots(state.d.date);
carrousel();

/* =====================================================================
   ACCUEIL : « IloTech en images », toutes les catégories défilent lentement de droite à gauche
   (photo ou illustration à gauche, texte à droite ; pause au survol, au toucher et au clavier)
   ===================================================================== */
function diapo(c, copie) {
  const moins = c.services.map(svc).filter(x => x.base).sort((a, b) => a.base - b.base)[0];
  const u = UNIVERS.find(x => x.id === c.univers);
  const media = PHOTOS_CAT[c.id] ? `<img src="img/photos/${PHOTOS_CAT[c.id]}.jpg" alt="" width="410" height="464" loading="lazy" decoding="async">` : scene(c);
  return `<a class="car-carte" href="index.html?cat=${c.id}" style="--t:${c.couleur}"${copie ? ' aria-hidden="true" tabindex="-1"' : ''}
    onclick="setCat('${c.id}');scrollTo({top:0,behavior:'smooth'});return false">
    <span class="car-media">${media}</span>
    <span class="car-txt"><span class="car-pole">${ico(c.icon)}${esc(u ? u.nom : '')}</span><b>${esc(c.nom)}</b><small>${esc(c.accroche)}</small>
      <span class="car-bas"><span class="car-prix">${moins ? `dès <b>${eur(moins.base)}</b>` : 'Sur devis'}</span><span class="car-go">Voir →</span></span></span></a>`;
}

function carrousel() {
  const car = document.querySelector('[data-carrousel]');
  if (!car) return;
  const piste = car.querySelector('.car-piste');
  const cats = CATEGORIES.filter(c => !c.bientot);
  piste.innerHTML = cats.map(c => diapo(c)).join('') + cats.map(c => diapo(c, true)).join('');
  let pause = false, reprise, pos = 0, avant = 0;
  const arret = () => { pause = true; clearTimeout(reprise); };
  const relance = () => { clearTimeout(reprise); reprise = setTimeout(() => { pause = false; pos = piste.scrollLeft; }, 1500); };
  car.addEventListener('mouseenter', arret); car.addEventListener('mouseleave', relance);
  car.addEventListener('focusin', arret); car.addEventListener('focusout', relance);
  piste.addEventListener('touchstart', arret, { passive: true }); piste.addEventListener('touchend', relance);
  const carte = () => (piste.firstElementChild ? piste.firstElementChild.offsetWidth + 16 : 300);
  car.querySelector('.prec').addEventListener('click', () => { arret(); piste.scrollBy({ left: -carte(), behavior: 'smooth' }); relance(); });
  car.querySelector('.suiv').addEventListener('click', () => { arret(); piste.scrollBy({ left: carte(), behavior: 'smooth' }); relance(); });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const tour = t => {
    const dt = avant ? Math.min(t - avant, 50) : 0; avant = t;
    if (!pause && !document.hidden) {
      const moitie = piste.scrollWidth / 2;
      if (Math.abs(piste.scrollLeft - pos) > 3) pos = piste.scrollLeft; // l'utilisateur a fait défiler
      pos += dt * 0.035; // environ 35 pixels par seconde
      if (pos >= moitie) pos -= moitie;
      piste.scrollLeft = pos;
    }
    requestAnimationFrame(tour);
  };
  requestAnimationFrame(tour);
}

/* =====================================================================
   VIE DE LA PAGE : prochaine disponibilité en direct, apparition des sections au défilement
   ===================================================================== */
// lit le vrai planning (places restantes par agence) et affiche le premier créneau libre
let dispo = null;
async function chercherDispo() {
  if (!CONFIG.endpoint) return;
  for (let i = 0, d = premierJour(); i < 10; i++, d = addDays(d, 1)) {
    if (!HORAIRES[parseISO(d).getDay()]) continue;
    await Promise.all(Object.keys(AGENCES).map(a => fetchSlots(d, a)));
    const libres = Object.keys(AGENCES).flatMap(a => creneauxFor(d, a).filter(([, why]) => !why).map(([k]) => ({ a, k, n: places(d, k, a) })));
    if (libres.length) { dispo = { d, libres }; break; }
  }
  renderDispo();
}
function renderDispo() {
  const el = $('dispo');
  if (!el || !dispo) return;
  const k = dispo.libres[0].k;
  const jour = dispo.d === addDays(todayISO(), 1) ? 'Demain' : shortDate(dispo.d);
  const ags = dispo.libres.filter(x => x.k === k).map(x => `${AGENCES[x.a].nom}${typeof x.n === 'number' ? ` (${x.n} place${x.n > 1 ? 's' : ''})` : ''}`);
  el.innerHTML = `<span class="point" aria-hidden="true"></span><span>Prochain rendez-vous : <b>${jour}, ${CRENEAUX[k].label.toLowerCase()}</b><small>${ags.join(' · ')}</small></span>`;
  el.hidden = false;
}

function reveler() {
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.bande-services, .accueil-plus .ap-tete, .site-carte, .engagements > div, .pied-grille > div').forEach((el, i) => {
    el.classList.add('reveal'); el.style.setProperty('--d', (i % 4) * 80 + 'ms'); io.observe(el);
  });
}
try { reveler(); chercherDispo(); } catch (e) {}

// petits confettis (réussite, ajout) ; rien si l'appareil demande moins d'animations
function confettis(x, y, n) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const couleurs = ['#2b8cff', '#22c55e', '#facc15', '#f97316', '#ec4899', '#a855f7', '#22d3ee'];
  const zone = document.createElement('div'); zone.className = 'confettis'; zone.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i'), a = Math.random() * Math.PI * 2, v = 60 + Math.random() * (n > 30 ? 260 : 120);
    p.style.cssText = `left:${x}px;top:${y}px;background:${couleurs[i % couleurs.length]};--dx:${Math.cos(a) * v}px;--dy:${Math.sin(a) * v - 60}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 80}ms`;
    zone.appendChild(p);
  }
  document.body.appendChild(zone);
  setTimeout(() => zone.remove(), 1400);
}
