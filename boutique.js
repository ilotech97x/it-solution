/* Boutique IloTech (boutique.html) : catalogue, filtres, panier gardé sur l'appareil, commande par WhatsApp ou email.
   Les prix du matériel viennent de data.js (mêmes prix que sur les devis : une seule source). Rien n'est payé en ligne :
   IloTech confirme le prix du jour et la disponibilité, le client paie au retrait ou à la livraison.
   Mobilité électrique : sur commande, prix sur demande tant que le fournisseur et les tarifs ne sont pas fixés (A-FAIRE.txt). */

const CATS_B = [
  { id: 'mobilite', nom: 'Mobilité électrique', ico: 'velo', c: '#16a34a' },
  { id: 'starlink', nom: 'Starlink et internet', ico: 'antenne', c: '#2b8cff' },
  { id: 'wifi', nom: 'Wi-Fi et réseau', ico: 'wifi', c: '#0891b2' },
  { id: 'securite', nom: 'Caméras et alarme', ico: 'camera', c: '#e11d48' },
  { id: 'energie', nom: 'Énergie et coupures', ico: 'batterie', c: '#f59e0b' },
  { id: 'ordi', nom: 'Ordinateurs reconditionnés', ico: 'ordi', c: '#7c3aed' },
  { id: 'maison', nom: 'Maison connectée et TV', ico: 'maison', c: '#0ea5e9' },
  { id: 'pro', nom: 'Commerce et bureau', ico: 'caisse', c: '#64748b' },
];

// ref : [service, option] de data.js → prix et libellé du devis ; prix null = prix sur demande
// regle : clé de REGLES (ce que la loi demande pour l'utiliser), montrée sur la fiche
const PRODUITS = [
  { id: 'vae-ville', cat: 'mobilite', ico: 'velo', nom: 'Vélo à assistance électrique de ville', desc: 'Pour les trajets du quotidien, même dans les côtes.', points: ['Assistance jusqu’à 25 km/h', 'Moteur 250 W, batterie amovible', 'Sans permis ni immatriculation'], regle: 'vae', commande: true },
  { id: 'vtt-ae', cat: 'mobilite', ico: 'velo', nom: 'VTT à assistance électrique', desc: 'Pour les mornes, les traces et les chemins de terre.', points: ['Assistance jusqu’à 25 km/h', 'Suspensions, pneus tout-terrain', 'Sans permis ni immatriculation'], regle: 'vae', commande: true },
  { id: 'cargo-ae', cat: 'mobilite', ico: 'cargo', nom: 'Vélo cargo électrique', desc: 'Courses, enfants ou petites livraisons, sans voiture.', points: ['Caisse ou porte-bagages renforcé', 'Assistance jusqu’à 25 km/h', 'Idéal pour les commerces de proximité'], regle: 'vae', commande: true },
  { id: 'trottinette', cat: 'mobilite', ico: 'trottinette', nom: 'Trottinette électrique', desc: 'Pliable, pour la ville et le dernier kilomètre.', points: ['Vitesse bridée à 25 km/h', 'Pliable, se range partout', 'Autonomie selon le modèle'], regle: 'edpm', commande: true },
  { id: 'moto-tt', cat: 'mobilite', ico: 'moto', nom: 'Moto électrique légère tout-terrain', desc: 'Type Sur-Ron Light Bee X ou Talaria : légère, silencieuse, très coupleuse.', points: ['Marque et modèle au choix', 'Silencieuse, sans essence', 'Usage hors route uniquement'], regle: 'tt', commande: true },
  { id: 'moto-route', cat: 'mobilite', ico: 'moto', nom: 'Moto électrique légère homologuée route', desc: 'Version homologuée (catégorie L1e, 45 km/h) des motos électriques légères.', points: ['Carte grise et plaque', 'Circule sur route', 'Recharge sur une prise normale'], regle: 'l1e', commande: true },
  { id: 'scooter', cat: 'mobilite', ico: 'scooter', nom: 'Scooter électrique', desc: 'L’équivalent d’un 50 cm³, sans bruit et sans plein d’essence.', points: ['45 km/h, catégorie L1e', 'Coffre sous la selle', 'Recharge sur une prise normale'], regle: 'l1e', commande: true },
  { id: 'access-mob', cat: 'mobilite', ico: 'casque', nom: 'Casques, antivols, chargeurs et batteries', desc: 'Pour votre vélo, trottinette ou moto électrique, selon le modèle.', points: ['Casques aux normes', 'Antivols en U et chaînes', 'Batteries et chargeurs compatibles'], commande: true },
  { id: 'kitstd', cat: 'starlink', ico: 'antenne', ref: ['starlink', 'kitstd'], nom: 'Kit Starlink Standard', desc: 'Antenne et routeur Wi-Fi : internet par satellite partout en Martinique.', points: ['Antenne + routeur Wi-Fi', 'Abonnement payé à Starlink', 'Pose sur toit possible'], svc: 'starlink' },
  { id: 'kitmini', cat: 'starlink', ico: 'antenne', ref: ['starlink', 'kitmini'], nom: 'Kit Starlink Mini', desc: 'Compact : bateau, véhicule, petit logement.', points: ['Routeur intégré', 'Se branche en USB-C', 'Abonnement payé à Starlink'], svc: 'starlink' },
  { id: 'sl-support', cat: 'starlink', ico: 'support', ref: ['starlink', 'support'], nom: 'Support pivotant Starlink', desc: 'Pour orienter et fixer l’antenne solidement.', points: ['Fixation murale ou toiture', 'Résiste au vent'], svc: 'starlink' },
  { id: 'sl-mat', cat: 'starlink', ico: 'support', ref: ['starlink', 'mat'], nom: 'Mât ou support mural', desc: 'Acier galvanisé, pour l’air salin.', points: ['Acier galvanisé', 'Dégage l’antenne des obstacles'], svc: 'starlink' },
  { id: 'sl-cable', cat: 'starlink', ico: 'cable', ref: ['starlink', 'cable45'], nom: 'Câble Starlink 45 m', desc: 'Quand l’antenne est loin de la maison.', points: ['45 mètres', 'Compatible kit Standard'], svc: 'starlink' },
  { id: 'sl-fix', cat: 'starlink', ico: 'cable', ref: ['starlink', 'fixations'], nom: 'Lot de fixation et traversée murale', desc: 'Pour passer le câble proprement et sans infiltration.', points: ['Passe-câble étanche', 'Visserie inox'], svc: 'starlink' },
  { id: 'mesh2', cat: 'wifi', ico: 'wifi', ref: ['network', 'mesh2'], nom: '2 bornes Wi-Fi mesh', desc: 'Le Wi-Fi partout dans une maison de plain-pied.', points: ['Un seul nom de réseau', 'Couvre jusqu’à environ 200 m²'], svc: 'network' },
  { id: 'mesh3', cat: 'wifi', ico: 'wifi', ref: ['network', 'mesh3'], nom: '3 bornes Wi-Fi mesh', desc: 'Grande maison ou étage : plus de zones blanches.', points: ['Un seul nom de réseau', 'Pour les maisons à étage'], svc: 'network' },
  { id: 'kit2', cat: 'securite', ico: 'camera', ref: ['camera', 'kit2'], nom: 'Kit 2 caméras Wi-Fi', desc: 'Vision de nuit, alertes et vidéo sur votre téléphone.', points: ['Vision de nuit', 'Application mobile', 'Alerte de mouvement'], svc: 'camera' },
  { id: 'kit4', cat: 'securite', ico: 'camera', ref: ['camera', 'kit4'], nom: 'Kit 4 caméras + enregistreur', desc: 'La maison ou le commerce surveillé de tous les côtés.', points: ['Enregistrement continu', 'Vision de nuit', 'Accès à distance'], svc: 'camera' },
  { id: 'kit8', cat: 'securite', ico: 'camera', ref: ['camera', 'kit8'], nom: 'Kit 8 caméras + enregistreur', desc: 'Pour les grands terrains, entrepôts et commerces.', points: ['8 caméras', 'Enregistreur avec disque', 'Accès à distance'], svc: 'camera' },
  { id: 'nvr', cat: 'securite', ico: 'disque', ref: ['camera', 'nvr'], nom: 'Enregistreur vidéo avec disque', desc: 'Garde les images de vos caméras, même sans internet.', points: ['Disque inclus', 'Compatible caméras IP'], svc: 'camera' },
  { id: 'kitalarme', cat: 'securite', ico: 'alarme', ref: ['alarme', 'kitalarme'], nom: 'Kit alarme connectée', desc: 'Centrale, sirène, 2 détecteurs et badges.', points: ['Alerte sur le téléphone', 'Sirène', 'Badges pour la famille'], svc: 'alarme' },
  { id: 'ups600', cat: 'energie', ico: 'batterie', ref: ['ups', 'ups600'], nom: 'Onduleur 600 VA', desc: 'PC, box et TV protégés des coupures et des surtensions.', points: ['Quelques minutes d’autonomie', 'Protège des surtensions'], svc: 'ups' },
  { id: 'ups1500', cat: 'energie', ico: 'batterie', ref: ['ups', 'ups1500'], nom: 'Onduleur 1500 VA', desc: 'Pour un serveur, une caisse ou un poste de travail complet.', points: ['Plus d’autonomie', 'Arrêt propre des appareils'], svc: 'ups' },
  { id: 'station', cat: 'energie', ico: 'batterie', nom: 'Batterie nomade (station d’énergie)', desc: 'Pour tenir pendant une coupure ou un cyclone : box, téléphone, lampe, petit frigo selon le modèle.', points: ['Prises 230 V et USB', 'Rechargeable au panneau solaire selon le modèle'], commande: true },
  { id: 'compteur', cat: 'energie', ico: 'eclair', ref: ['energie', 'compteur'], nom: 'Compteur électrique connecté', desc: 'Voyez ce que consomment la clim et le chauffe-eau.', points: ['Suivi sur le téléphone', 'Pose par un électricien partenaire si besoin'], svc: 'energie' },
  { id: 'p1', cat: 'ordi', ico: 'ordi', ref: ['reconditionne', 'p1'], nom: 'PC portable bureautique reconditionné', desc: 'Pour internet, les mails, les papiers et l’école.', points: ['8 Go de mémoire, SSD', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true },
  { id: 'p2', cat: 'ordi', ico: 'ordi', ref: ['reconditionne', 'p2'], nom: 'PC portable performant reconditionné', desc: 'Pour le travail, plusieurs logiciels ouverts, la photo.', points: ['16 Go, SSD, i5 ou i7', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true },
  { id: 'p3', cat: 'ordi', ico: 'ecran', ref: ['reconditionne', 'p3'], nom: 'PC fixe reconditionné + écran 22 pouces', desc: 'Un poste complet pour la maison ou le bureau.', points: ['Écran 22 pouces', 'Vérifié et nettoyé', 'Prêt à l’emploi'], svc: 'reconditionne', recond: true },
  { id: 'nas2', cat: 'ordi', ico: 'disque', ref: ['sauvegarde', 'nas2'], nom: 'NAS 2 baies + 2 disques de 4 To', desc: 'Vos photos et dossiers copiés en double, à la maison ou au bureau.', points: ['Copie en double (RAID 1)', 'Accès depuis le téléphone'], svc: 'sauvegarde' },
  { id: 'kitdomo', cat: 'maison', ico: 'maison', ref: ['domotique', 'kitdomo'], nom: 'Pack maison connectée', desc: 'Une box et 4 prises connectées pour commencer.', points: ['Programmation de la clim et du chauffe-eau', 'Commande depuis le téléphone'], svc: 'domotique' },
  { id: 'support-tv', cat: 'maison', ico: 'ecran', ref: ['multimedia', 'support'], nom: 'Support mural TV', desc: 'Jusqu’à 65 pouces.', points: ['Jusqu’à 65 pouces', 'Inclinable'], svc: 'multimedia' },
  { id: 'kitcaisse', cat: 'pro', ico: 'caisse', ref: ['pos', 'kitcaisse'], nom: 'Kit caisse enregistreuse', desc: 'Écran tactile, imprimante ticket, tiroir-caisse et lecteur.', points: ['Prêt pour la facturation électronique', 'Pose et formation possibles'], svc: 'pos' },
];

// ce que la loi demande pour utiliser chaque engin (Code de la route, Code des assurances), montré sur la fiche et dans « Bon à savoir »
const REGLES = {
  vae: 'Vélo au sens du Code de la route : assistance seulement quand vous pédalez, coupée à 25 km/h, moteur de 250 W au plus. Ni permis, ni immatriculation, ni assurance obligatoire (une responsabilité civile reste conseillée). Casque obligatoire pour les moins de 12 ans.',
  edpm: 'Engin de déplacement personnel motorisé : 25 km/h au plus, dès 14 ans, une seule personne, interdit sur les trottoirs. Assurance responsabilité civile obligatoire. Casque et gilet conseillés, obligatoires hors agglomération la nuit pour le gilet.',
  tt: 'Version tout-terrain, non homologuée : interdite sur la voie publique, réservée aux terrains privés avec l’accord du propriétaire et aux circuits. Assurance obligatoire, même hors route. Casque et protections fortement conseillés.',
  l1e: 'Cyclomoteur électrique (catégorie L1e, 45 km/h) : carte grise, plaque, assurance et casque homologué obligatoires ; permis AM (ancien BSR) ou permis B selon votre âge.',
};

const PANIER_CLE = 'itPanier';
const lirePanier = () => { try { const p = JSON.parse(localStorage.getItem(PANIER_CLE) || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } };
let panier = lirePanier();
const garder = () => { try { localStorage.setItem(PANIER_CLE, JSON.stringify(panier)); } catch (e) { /* navigation privée : le panier vit le temps de la page */ } };

const prixDe = p => { if (!p.ref) return null; const s = SERVICES.find(x => x.id === p.ref[0]); const o = s && s.options.find(x => x[0] === p.ref[1]); return o && o[2] > 0 ? o[2] : null; };
const parId = id => PRODUITS.find(p => p.id === id);
const catDe = id => CATS_B.find(c => c.id === id);

// pictogrammes au trait (24 × 24), couleur de la catégorie
const ICO_B = {
  velo: '<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-8h5l4 8M9.5 8.5h-2M12 16.5l2.5-8M14 5.5h2.5"/>',
  cargo: '<circle cx="5.5" cy="17.5" r="2.5"/><circle cx="18.5" cy="17.5" r="2.5"/><path d="M8 17.5h8M3 10h8v5H3zM11 15l3-8h3M14 7l4.5 10.5"/>',
  trottinette: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 18h7M16 4h3l-1 14"/>',
  moto: '<circle cx="5" cy="16" r="3.5"/><circle cx="19" cy="16" r="3.5"/><path d="M5 16l4-6h5l2 3h3M14 10l-2-4h3M9 10l3 6h4"/>',
  scooter: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="17" r="2.5"/><path d="M8.5 17H15l3-7h-3M18 10V6h-2M4 14h6l1 3"/>',
  casque: '<path d="M4 15a8 8 0 0 1 16 0v2H4z"/><path d="M12 7v4h8"/>',
  antenne: '<path d="M5 19l4-4M4 9a8 8 0 0 0 11 11z"/><path d="M14 4a6 6 0 0 1 6 6M14 7.5a2.5 2.5 0 0 1 2.5 2.5"/>',
  support: '<path d="M12 3v18M7 21h10M12 7l5-3M12 7L7 4"/>',
  cable: '<path d="M7 3v5a5 5 0 0 0 10 0V3M5 3h4M15 3h4M12 13v8"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  camera: '<path d="M3 7h12l3 3-3 3H3zM6 13v4h4M18 10h3"/>',
  alarme: '<path d="M6 17V11a6 6 0 0 1 12 0v6M4 17h16M10 20h4M12 2v2M3.5 6l1.5 1M20.5 6L19 7"/>',
  disque: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 13h18M7 16h.01M11 16h.01"/>',
  batterie: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M11 9l-2 3h4l-2 3"/>',
  eclair: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  ordi: '<rect x="4" y="5" width="16" height="10" rx="1.5"/><path d="M2 19h20"/>',
  ecran: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>',
  maison: '<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
  caisse: '<rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M7 11V5h10v6M9 8h6M8 15h8"/>',
};
const icoB = (k, c) => `<svg viewBox="0 0 24 24" aria-hidden="true" style="color:${c}">${ICO_B[k] || ICO_B.caisse}</svg>`;

let filtre = 'tout', recherche = '';
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function carte(p) {
  const c = catDe(p.cat), prix = prixDe(p), n = panier[p.id] || 0;
  const badge = p.commande ? '<span class="b-badge b-cmd">Sur commande</span>' : p.recond ? '<span class="b-badge b-rec">Reconditionné</span>' : '<span class="b-badge">Disponible sous quelques jours</span>';
  return `<article class="b-carte" id="p-${p.id}" style="--bc:${c.c}">
    <div class="b-vis">${icoB(p.ico, c.c)}</div>
    <div class="b-corps">${badge}
      <h3>${esc(p.nom)}</h3><p class="b-desc">${esc(p.desc)}</p>
      <ul class="b-points">${p.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${p.regle ? `<details class="b-regle"><summary>Ce que dit la loi</summary><p>${esc(REGLES[p.regle])}</p></details>` : ''}
      <div class="b-pied"><div class="b-prix">${prix ? `<strong>${eur(prix)}</strong><small>prix indicatif TTC</small>` : '<strong class="b-sd">Prix sur demande</strong><small>selon la marque et le modèle</small>'}</div>
        <div class="b-act">${n ? `<div class="b-qte" role="group" aria-label="Quantité : ${esc(p.nom)}"><button type="button" data-moins="${p.id}" aria-label="Retirer un">−</button><span aria-live="polite">${n}</span><button type="button" data-plus="${p.id}" aria-label="Ajouter un">+</button></div>`
          : `<button type="button" class="btn btn-primary b-ajout" data-plus="${p.id}">${prix ? 'Ajouter' : 'Demander'}</button>`}</div></div>
      ${p.svc ? `<a class="b-pose" href="index.html?svc=${encodeURIComponent(p.svc)}">Avec la pose par nos techniciens →</a>` : ''}
    </div></article>`;
}

function rendre() {
  const q = norm(recherche);
  const liste = PRODUITS.filter(p => (filtre === 'tout' || p.cat === filtre) && (!q || norm(p.nom + ' ' + p.desc + ' ' + p.points.join(' ') + ' ' + catDe(p.cat).nom).includes(q)));
  const groupes = CATS_B.filter(c => liste.some(p => p.cat === c.id));
  document.getElementById('bListe').innerHTML = groupes.length ? groupes.map(c => `<section class="b-groupe" aria-labelledby="g-${c.id}">
      <h2 id="g-${c.id}" style="--bc:${c.c}">${icoB(c.ico, c.c)}${esc(c.nom)}</h2>
      <div class="b-grille">${liste.filter(p => p.cat === c.id).map(carte).join('')}</div></section>`).join('')
    : `<div class="b-vide"><p><b>Aucun article ne correspond à « ${esc(recherche)} ».</b></p><p>Demandez-nous : nous trouvons souvent le matériel sur commande.</p>
       <a class="btn btn-primary" href="${waUrl(CONFIG.whatsapp || AGENCES.ducos.tel, 'Bonjour IloTech, je cherche : ' + recherche)}" target="_blank" rel="noopener">Demander sur WhatsApp</a></div>`;
  document.querySelectorAll('.b-filtre').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === filtre)));
  rendrePanier();
}

function lignes() { return Object.entries(panier).map(([id, n]) => ({ p: parId(id), n })).filter(x => x.p && x.n > 0); }

function rendrePanier() {
  const L = lignes(), nb = L.reduce((t, x) => t + x.n, 0);
  const total = L.reduce((t, x) => t + (prixDe(x.p) || 0) * x.n, 0), surDemande = L.filter(x => !prixDe(x.p)).length;
  const barre = document.getElementById('bBarre');
  barre.hidden = !nb;
  barre.querySelector('[data-nb]').textContent = nb + (nb > 1 ? ' articles' : ' article');
  barre.querySelector('[data-total]').textContent = total ? eur(total) + (surDemande ? ' + sur demande' : '') : 'Prix sur demande';
  document.getElementById('bLignes').innerHTML = L.length ? L.map(({ p, n }) => {
    const prix = prixDe(p);
    return `<li><span class="b-l-nom">${esc(p.nom)}</span><span class="b-qte" role="group" aria-label="Quantité : ${esc(p.nom)}"><button type="button" data-moins="${p.id}" aria-label="Retirer un">−</button><span>${n}</span><button type="button" data-plus="${p.id}" aria-label="Ajouter un">+</button></span><span class="b-l-prix mono">${prix ? eur(prix * n) : 'sur demande'}</span></li>`;
  }).join('') : '<li class="b-l-vide">Votre panier est vide.</li>';
  document.getElementById('bTotal').innerHTML = `<span>Total indicatif</span><strong class="mono">${total ? eur(total) : '—'}</strong>${surDemande ? `<small>+ ${surDemande} article${surDemande > 1 ? 's' : ''} au prix sur demande</small>` : ''}`;
}

function message() {
  const f = document.getElementById('bForm'), d = Object.fromEntries(new FormData(f));
  const L = lignes(), total = L.reduce((t, x) => t + (prixDe(x.p) || 0) * x.n, 0);
  const modes = { ducos: 'Retrait à Ducos', robert: 'Retrait au Robert', livraison: 'Livraison en Martinique', pose: 'Livraison avec la pose par un technicien' };
  return ['Bonjour IloTech, je voudrais commander :', ...L.map(({ p, n }) => `- ${n} × ${p.nom}${prixDe(p) ? ` (${eur(prixDe(p) * n)})` : ' (prix à me donner)'}`),
    total ? `Total indicatif : ${eur(total)}` : '', `Mode : ${modes[d.mode] || modes.ducos}`, d.commune ? `Commune : ${d.commune}` : '', d.nom ? `Nom : ${d.nom}` : '',
    d.note ? `Précision : ${d.note}` : '', 'Merci de me confirmer le prix et la disponibilité.'].filter(Boolean).join('\n');
}

function changer(id, delta) {
  if (!parId(id)) return;
  const n = Math.max(0, Math.min(20, (panier[id] || 0) + delta));
  if (n) panier[id] = n; else delete panier[id];
  garder(); rendre();
  if (delta > 0) annoncer(parId(id).nom + ' ajouté au panier');
}
function annoncer(t) { const z = document.getElementById('bAnnonce'); z.textContent = ''; setTimeout(() => { z.textContent = t; }, 30); }

document.addEventListener('DOMContentLoaded', () => {
  // filtres : un bouton par catégorie, en grille (pas de défilement de côté)
  document.getElementById('bFiltres').innerHTML = [{ id: 'tout', nom: 'Tout voir', ico: 'caisse', c: '#2b8cff' }, ...CATS_B].map(c =>
    `<button type="button" class="b-filtre" data-f="${c.id}" aria-pressed="false" style="--bc:${c.c}">${c.id === 'tout' ? '<span aria-hidden="true">✦</span>' : icoB(c.ico, c.c)}<span>${esc(c.nom)}</span></button>`).join('');
  const h = location.hash.slice(1); if (CATS_B.some(c => c.id === h)) filtre = h;
  document.body.addEventListener('click', e => {
    const t = e.target.closest('[data-plus],[data-moins],[data-f],[data-ouvrir],[data-fermer],[data-envoi]');
    if (!t) return;
    if (t.dataset.plus) changer(t.dataset.plus, 1);
    else if (t.dataset.moins) changer(t.dataset.moins, -1);
    else if (t.dataset.f) {
      e.preventDefault(); filtre = t.dataset.f; history.replaceState(null, '', filtre === 'tout' ? location.pathname : '#' + filtre); rendre();
      const cible = t.classList.contains('b-filtre') ? document.getElementById('bListe') : document.querySelector('.b-outils');
      cible.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    else if (t.dataset.ouvrir !== undefined) { const dlg = document.getElementById('bPanier'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', ''); }
    else if (t.dataset.fermer !== undefined) document.getElementById('bPanier').close();
    else if (t.dataset.envoi) {
      e.preventDefault();
      if (!lignes().length) return annoncer('Votre panier est vide');
      const txt = message();
      if (t.dataset.envoi === 'wa') window.open(waUrl(CONFIG.whatsapp || AGENCES.ducos.tel, txt), '_blank', 'noopener');
      else location.href = 'mailto:' + CONFIG.email + '?subject=' + encodeURIComponent('Commande boutique IloTech') + '&body=' + encodeURIComponent(txt);
    }
  });
  document.getElementById('bCherche').addEventListener('input', e => { recherche = e.target.value.trim(); rendre(); });
  window.addEventListener('storage', e => { if (e.key === PANIER_CLE) { panier = lirePanier(); rendre(); } });
  rendre();
});
