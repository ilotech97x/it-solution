/* Woulib GPS (univers Move) : guidage vocal pas à pas et alertes route partagées par les conducteurs, façon Waze.
   Itinéraire : OSRM (serveur public de démonstration, à remplacer par un serveur à nous avant un gros trafic, voir A-FAIRE).
   Alertes : signaler_route / signalements_proches / voter_signalement (move.sql). Pas d'alerte « police ». */
'use strict';
const OSRM = 'https://router.project-osrm.org/route/v1/driving/';
const ALERTES = { accident: ['💥', 'Accident'], bouchon: ['🚗', 'Bouchon'], travaux: ['🚧', 'Travaux'], danger: ['⚠️', 'Danger sur la route'],
  inondation: ['🌊', 'Route inondée'], eboulement: ['🪨', 'Éboulement'], route_coupee: ['⛔', 'Route coupée'] };
const SENS = { left: 'à gauche', right: 'à droite', 'slight left': 'légèrement à gauche', 'slight right': 'légèrement à droite', 'sharp left': 'franchement à gauche',
  'sharp right': 'franchement à droite', straight: 'tout droit', uturn: 'demi-tour' };
const FLECHE = { left: '⬅️', right: '➡️', 'slight left': '↖️', 'slight right': '↗️', 'sharp left': '↙️', 'sharp right': '↘️', straight: '⬆️', uturn: '↩️' };
let guidage = null;   // guidage en cours : position, itinéraire, étape, carte, minuteries

// lien vers le GPS depuis une course ou une livraison

// distances en mètres
const metres = ([a, b], [c, d]) => 2 * 6371000 * Math.asin(Math.sqrt(Math.sin((c - a) * Math.PI / 360) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin((d - b) * Math.PI / 360) ** 2));
function auSegment(p, a, b) {   // distance d'un point à un segment (projection locale)
  const k = Math.cos(p[0] * Math.PI / 180), x = (q) => [(q[1] - p[1]) * k * 111320, (q[0] - p[0]) * 110540];
  const [ax, ay] = x(a), [bx, by] = x(b), dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l)) : 0;
  return Math.hypot(ax + t * dx, ay + t * dy);
}
const horsRoute = (p, ligne) => { let m = Infinity; for (let i = 1; i < ligne.length; i++) m = Math.min(m, auSegment(p, ligne[i - 1], ligne[i])); return m; };
const enDistance = m => m >= 1000 ? `${(m / 1000).toFixed(m >= 10000 ? 0 : 1).replace('.', ',')} km` : `${Math.max(10, Math.round(m / 10) * 10)} m`;
const enDistanceParlee = m => m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',').replace(',0', '')} kilomètres` : `${Math.max(10, Math.round(m / 50) * 50)} mètres`;

// consigne en français à partir d'une étape OSRM
function consigne(st) {
  const m = st.maneuver, sur = st.name ? ` sur ${st.name}` : '', s = SENS[m.modifier] || '';
  switch (m.type) {
    case 'depart': return `Partez${sur}`;
    case 'arrive': return 'Vous êtes arrivé';
    case 'roundabout': case 'rotary': case 'roundabout turn': return m.exit ? `Au rond-point, prenez la ${m.exit === 1 ? '1re' : m.exit + 'e'} sortie${sur}` : `Prenez le rond-point${sur}`;
    case 'exit roundabout': case 'exit rotary': return `Sortez du rond-point${sur}`;
    case 'merge': return `Insérez-vous ${s}${sur}`;
    case 'on ramp': return `Prenez la bretelle ${s}${sur}`;
    case 'off ramp': return `Prenez la sortie ${s}${sur}`;
    case 'fork': return `Restez ${s}${sur}`;
    case 'end of road': return `Au bout de la route, tournez ${s}${sur}`;
    case 'continue': case 'new name': return m.modifier && m.modifier !== 'straight' ? `Continuez ${s}${sur}` : `Continuez tout droit${sur}`;
    default: return m.modifier === 'uturn' ? `Faites demi-tour${sur}` : m.modifier === 'straight' ? `Continuez tout droit${sur}` : `Tournez ${s}${sur}`;
  }
}
const flecheDe = st => st.maneuver.type === 'arrive' ? '🏁' : /roundabout|rotary/.test(st.maneuver.type) ? '🔄' : FLECHE[st.maneuver.modifier] || '⬆️';

function parler(t) {
  if (!guidage?.voix || !('speechSynthesis' in window)) return;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'fr-FR'; u.rate = 1.02; speechSynthesis.speak(u); } catch (e) { /* voix indisponible */ }
}
function arreterGuidage() {
  if (!guidage) return;
  if (guidage.watch != null) navigator.geolocation.clearWatch(guidage.watch);
  clearInterval(guidage.minuterie); guidage.verrou?.release?.().catch(() => {});
  try { speechSynthesis.cancel(); } catch (e) { /* rien */ }
  guidage = null;
}

APP.pages.gps = async () => {
  arreterGuidage(); await chargerRegistre();
  const p = param(), dest = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng), nom: p.nom || 'Destination' } : null;
  vue(`<div class="gps"><div id="gpsCarte"></div>
    <div class="gps-haut" id="gpsHaut">${dest ? '<div class="gps-consigne"><span class="gps-fl">🧭</span><div><b>Recherche de votre position…</b><span class="petit">Autorisez la localisation</span></div></div>' : ''}</div>
    <div class="gps-alerte" id="gpsAlerte" hidden></div>
    <div class="gps-bas" id="gpsBas">${dest ? '' : `<form id="fDest" class="gps-recherche"><input name="q" placeholder="Où allez-vous ?" aria-label="Destination" autocomplete="off" required><button class="btn btn-p">Aller</button></form>
      <div id="resultats"></div><p class="petit muted" style="margin:6px 0 0">Guidage vocal et alertes des autres conducteurs. Ne manipulez pas le téléphone en conduisant.</p>`}</div></div>`);
  const L = await chargerCarte();
  const c = CENTRES[terrPrefere()] || CENTRES.Martinique;
  const carte = L.map($('#gpsCarte'), { zoomControl: false, attributionControl: true }).setView([c[0], c[1]], c[2]);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(carte);
  guidage = { carte, L, dest, voix: true, suivre: true, pos: null, cap: 0, route: null, etape: 0, dits: {}, horsRoute: 0, recalcul: 0, alertes: [], prevenues: {}, calques: L.layerGroup().addTo(carte) };
  carte.on('dragstart', () => { if (guidage) { guidage.suivre = false; majBas(); } });
  if (!dest) {
    $('#fDest').addEventListener('submit', async e => {
      e.preventDefault(); const t = e.target.q.value.trim();
      try {
        const l = await geocoder(t, terrPrefere());
        $('#resultats').innerHTML = l.length ? l.map((x, i) => `<button type="button" class="gps-res" data-i="${i}">📍 ${esc(x.nom)}</button>`).join('') : '<p class="petit">Aucun lieu trouvé.</p>';
        $('#resultats').onclick = ev => { const b = ev.target.closest('[data-i]'); if (!b) return; const x = l[b.dataset.i]; aller('#/gps?' + new URLSearchParams({ lat: x.lat, lng: x.lng, nom: x.nom.split(',')[0] })); };
      } catch (err) { toast('Recherche impossible pour le moment.', true); }
    });
  }
  if (!('geolocation' in navigator)) return toast('Ce téléphone ne donne pas sa position.', true);
  guidage.watch = navigator.geolocation.watchPosition(nouvellePosition, () => { if (guidage && !guidage.pos) $('#gpsHaut').innerHTML = '<div class="gps-consigne"><span class="gps-fl">📵</span><div><b>Position indisponible</b><span class="petit">Activez la localisation pour être guidé</span></div></div>'; },
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
  guidage.minuterie = setInterval(() => { if (guidage?.pos && !document.hidden) chargerAlertes(); }, 120000);
  try { guidage.verrou = await navigator.wakeLock?.request('screen'); } catch (e) { /* écran : réglage du téléphone */ }
  $('#app').onclick = ev => {
    const b = ev.target.closest('[data-gps]'); if (!b || !guidage) return;
    const a = b.dataset.gps;
    if (a === 'voix') { guidage.voix = !guidage.voix; if (!guidage.voix) speechSynthesis?.cancel(); majBas(); }
    if (a === 'centrer') { guidage.suivre = true; if (guidage.pos) carte.setView(guidage.pos, Math.max(carte.getZoom(), 16)); majBas(); }
    if (a === 'stop') { const r = param().retour; arreterGuidage(); aller(r && r.startsWith('#/') ? r : '#/move'); }
    if (a === 'signaler') { if (!exigeCompte()) return; $('#gpsAlerte').hidden = false; $('#gpsAlerte').innerHTML = `<b>Que se passe-t-il ici ?</b><div class="gps-types">${Object.entries(ALERTES).map(([k, [i, t]]) => `<button class="btn btn-s" data-type="${k}">${i} ${t}</button>`).join('')}</div><button class="btn btn-s" data-gps="fermer">Annuler</button>`; }
    if (a === 'fermer') $('#gpsAlerte').hidden = true;
  };
  $('#gpsAlerte').onclick = ev => {   // les boutons « fermer » sont gérés plus haut (#app)
    const t = ev.target.closest('[data-type]'); if (t) return signaler(t.dataset.type);
    const v = ev.target.closest('[data-vote]'); if (v) voter(v.dataset.id, v.dataset.vote === 'oui');
  };
};

async function signaler(type) {
  if (!guidage?.pos) return toast('Position pas encore connue.', true);
  try { await q(sb.rpc('signaler_route', { type_s: type, plat: guidage.pos[0], plng: guidage.pos[1] })); toast(`${ALERTES[type][0]} Merci ! Les conducteurs autour sont prévenus.`); $('#gpsAlerte').hidden = true; chargerAlertes(); }
  catch (err) { toast(erreur(err), true); }
}
async function voter(id, oui) {
  if (!exigeCompte()) return;
  try { await q(sb.rpc('voter_signalement', { sid: id, encore_la: oui })); toast(oui ? 'Merci, alerte confirmée.' : 'Merci, c’est noté.'); $('#gpsAlerte').hidden = true; chargerAlertes(); }
  catch (err) { toast(erreur(err), true); }
}
async function chargerAlertes() {
  const g = guidage; if (!g?.pos || !BASE_V2) return;
  g.alertes = await q(sb.rpc('signalements_proches', { plat: g.pos[0], plng: g.pos[1], rayon_km: 40 })).catch(() => g.alertes);
  if (guidage !== g) return;
  g.calques.clearLayers();
  g.alertes.forEach(a => g.L.marker([a.lat, a.lng], { icon: g.L.divIcon({ html: `<span class="gps-pin">${ALERTES[a.type]?.[0] || '⚠️'}</span>`, className: '', iconSize: [36, 36], iconAnchor: [18, 18] }) })
    .on('click', () => { $('#gpsAlerte').hidden = false; $('#gpsAlerte').innerHTML = `<b>${ALERTES[a.type]?.[0]} ${ALERTES[a.type]?.[1]}</b> <span class="petit muted">signalé à ${esc(heure(a.created_at))}${a.confirmations ? ` · confirmé ${a.confirmations} fois` : ''}</span>
      <div class="actions" style="margin-top:8px"><span>Toujours là ?</span><button class="btn btn-s btn-ok" data-vote="oui" data-id="${a.id}">👍 Oui</button><button class="btn btn-s btn-ko" data-vote="non" data-id="${a.id}">👎 Non, c’est fini</button><button class="btn btn-s" data-gps="fermer">Fermer</button></div>`; })
    .addTo(g.calques));
}

async function calculerRoute() {
  const g = guidage; if (!g?.pos || !g.dest) return;
  g.recalcul = Date.now();
  try {
    const r = await (await fetch(`${OSRM}${g.pos[1]},${g.pos[0]};${g.dest.lng},${g.dest.lat}?overview=full&geometries=geojson&steps=true&alternatives=false`)).json();
    if (guidage !== g) return;
    if (r.code !== 'Ok' || !r.routes?.length) throw new Error(r.message || 'itinéraire');
    const route = r.routes[0], steps = route.legs[0].steps;
    g.route = { ligne: route.geometry.coordinates.map(([x, y]) => [y, x]), steps, duree: route.duration, distance: route.distance };
    g.etape = 1; g.dits = {}; g.horsRoute = 0;
    g.trace?.remove(); g.trace = g.L.polyline(g.route.ligne, { color: '#2563EB', weight: 8, opacity: .85 }).addTo(g.carte);
    g.arrivee?.remove(); g.arrivee = g.L.marker([g.dest.lat, g.dest.lng], { icon: g.L.divIcon({ html: '<span class="gps-pin">🏁</span>', className: '', iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(g.carte);
    if (!g.premiere) { g.premiere = true; parler(`C’est parti. ${enDistanceParlee(route.distance)}, environ ${Math.max(1, Math.round(route.duration / 60))} minutes. ${steps[1] ? consigne(steps[1]) : ''}`); }
    else parler('Nouvel itinéraire');
    return guider();
  } catch (e) {
    $('#gpsHaut').innerHTML = '<div class="gps-consigne"><span class="gps-fl">⚠️</span><div><b>Itinéraire indisponible</b><span class="petit">Nouvel essai dans quelques secondes</span></div></div>';
  }
  majBas();
}

function nouvellePosition(p) {
  const g = guidage; if (!g) return;
  const pos = [p.coords.latitude, p.coords.longitude], premier = !g.pos;
  if (g.pos && metres(g.pos, pos) > 3) g.cap = Math.atan2((pos[1] - g.pos[1]) * Math.cos(pos[0] * Math.PI / 180), pos[0] - g.pos[0]) * 180 / Math.PI;
  if (p.coords.heading != null && !Number.isNaN(p.coords.heading)) g.cap = p.coords.heading;
  g.pos = pos; g.vitesse = p.coords.speed != null ? Math.round(p.coords.speed * 3.6) : null;
  const icone = g.L.divIcon({ html: `<span class="gps-moi" style="transform:rotate(${Math.round(g.cap)}deg)">➤</span>`, className: '', iconSize: [40, 40], iconAnchor: [20, 20] });
  if (!g.moi) g.moi = g.L.marker(pos, { icon: icone, zIndexOffset: 1000 }).addTo(g.carte); else { g.moi.setLatLng(pos); g.moi.setIcon(icone); }
  if (g.suivre) g.carte.setView(pos, premier ? 17 : Math.max(g.carte.getZoom(), 15), { animate: !premier });
  if (premier) { chargerAlertes(); if (g.dest) calculerRoute(); else majBas(); return; }
  if (!g.route) { if (g.dest && Date.now() - g.recalcul > 10000) calculerRoute(); majBas(); return; }
  guider();
}
// consigne, annonces et alertes depuis la position actuelle (à chaque position, et dès qu'un itinéraire arrive)
function guider() {
  const g = guidage; if (!g?.pos || !g.route) return;
  const pos = g.pos;
  // hors itinéraire (3 positions de suite à plus de 50 m) : nouvel itinéraire, au plus toutes les 15 s
  g.horsRoute = horsRoute(pos, g.route.ligne) > 50 ? g.horsRoute + 1 : 0;
  if (g.horsRoute >= 3 && Date.now() - g.recalcul > 15000) return calculerRoute();
  // étape suivante quand on passe la manœuvre
  const st = g.route.steps;
  while (g.etape < st.length - 1 && metres(pos, [st[g.etape].maneuver.location[1], st[g.etape].maneuver.location[0]]) < 20) g.etape++;
  const prochaine = st[g.etape], loc = [prochaine.maneuver.location[1], prochaine.maneuver.location[0]], d = metres(pos, loc);
  if (prochaine.maneuver.type === 'arrive' && d < 30) { majHaut(prochaine, 0); majBas(0, 0); if (!g.dits.fin) { g.dits.fin = true; parler(`Vous êtes arrivé : ${g.dest.nom}`); } return; }
  // annonces vocales : vers 500 m (grandes routes), 150 m, puis au moment de tourner
  const cle = g.etape + ':', seuils = [[500, 'loin'], [150, 'pres'], [35, 'maintenant']], atteint = [...seuils].reverse().find(([s]) => d <= s);
  if (atteint && !g.dits[cle + atteint[1]] && (atteint[1] !== 'loin' || st[g.etape - 1]?.distance > 900)) {
    seuils.filter(([s]) => s >= atteint[0]).forEach(([, n]) => { g.dits[cle + n] = true; });   // une annonce plus proche rend inutiles les plus lointaines
    parler(atteint[1] === 'maintenant' ? consigne(prochaine) : `Dans ${enDistanceParlee(d)}, ${consigne(prochaine).replace(/^./, x => x.toLowerCase())}`);
  }
  const reste = st.slice(g.etape + 1).reduce((t, x) => t + x.distance, 0) + d, ratio = g.route.distance ? reste / g.route.distance : 0;
  majHaut(prochaine, d); majBas(reste, g.route.duree * ratio);
  avertirAlertes(pos);
}
// alerte signalée à moins de 700 m, sur l'itinéraire (ou devant soi sans itinéraire) : bandeau et voix, une fois
function avertirAlertes(pos) {
  const g = guidage;
  for (const a of g.alertes) {
    const d = metres(pos, [a.lat, a.lng]);
    if (d > 700 || g.prevenues[a.id] || (g.route && horsRoute([a.lat, a.lng], g.route.ligne) > 60)) continue;
    g.prevenues[a.id] = true;
    const [i, t] = ALERTES[a.type] || ['⚠️', 'Alerte'];
    $('#gpsAlerte').hidden = false;
    $('#gpsAlerte').innerHTML = `<b>${i} ${t} à ${enDistance(d)}</b> <span class="petit muted">signalé par un conducteur</span><div class="actions" style="margin-top:8px"><span>Toujours là ?</span><button class="btn btn-s btn-ok" data-vote="oui" data-id="${a.id}">👍 Oui</button><button class="btn btn-s btn-ko" data-vote="non" data-id="${a.id}">👎 Non</button><button class="btn btn-s" data-gps="fermer">OK</button></div>`;
    parler(`Attention, ${t.toLowerCase()} à ${enDistanceParlee(d)}`);
    try { navigator.vibrate?.([200, 100, 200]); } catch (e) { /* facultatif */ }
    break;
  }
}
function majHaut(st, d) {
  $('#gpsHaut').innerHTML = `<div class="gps-consigne"><span class="gps-fl">${flecheDe(st)}</span><div>${d ? `<span class="gps-dist">${enDistance(d)}</span>` : ''}<b>${esc(consigne(st))}</b></div></div>`;
}
function majBas(reste, duree) {
  const g = guidage; if (!g || !$('#gpsBas')) return;
  if (!g.dest) { if (!$('#fDest')) return; $('#gpsBas').querySelector('.gps-outils')?.remove(); $('#gpsBas').insertAdjacentHTML('beforeend', outils(g)); return; }
  const arr = duree != null ? new Date(Date.now() + duree * 1000) : null;
  $('#gpsBas').innerHTML = `<div class="gps-infos">${reste != null ? `<div><b>${arr ? esc(heure(arr.toISOString())) : '—'}</b><span>arrivée</span></div><div><b>${Math.max(1, Math.round((duree || 0) / 60))} min</b><span>${enDistance(reste)}</span></div>` : `<div><b>${esc(g.dest.nom)}</b><span>calcul de l’itinéraire…</span></div>`}
    ${g.vitesse != null ? `<div class="gps-vitesse"><b>${g.vitesse}</b><span>km/h</span></div>` : ''}</div>${outils(g)}`;
}
const outils = g => `<div class="gps-outils">${BASE_V2 ? '<button class="btn btn-s btn-j" data-gps="signaler">⚠️ Signaler</button>' : ''}<button class="btn btn-s" data-gps="voix" aria-pressed="${g.voix}">${g.voix ? '🔊 Voix' : '🔇 Muet'}</button>
  ${g.suivre ? '' : '<button class="btn btn-s" data-gps="centrer">🎯 Recentrer</button>'}<button class="btn btn-s btn-ko" data-gps="stop">✕ ${g.dest ? 'Arrêter' : 'Fermer'}</button></div>`;
