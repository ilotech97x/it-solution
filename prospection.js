/* =====================================================================
   PROSPECTION IloTech — trouver, classer et contacter des clients professionnels en Martinique
   Sources publiques et gratuites (aucune clé) :
     - BODACC (journal officiel) : les entreprises créées ces dernières semaines
     - OpenStreetMap : commerces, restaurants, cabinets, hôtels… avec téléphone / site quand ils sont connus
     - Annuaire des entreprises (recherche-entreprises.api.gouv.fr) : recherche par nom ou activité
   Les prospects sont gardés sur cet appareil, et partagés via le script Google si l'espace pro est configuré.
   ===================================================================== */
const ageJours = s => s ? Math.round((parseISO(todayISO()) - parseISO(s)) / 86400000) : null;
const frDay = s => parseISO(s).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const frDate = s => parseISO(s).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const cap = s => String(s || '').toLowerCase().replace(/(^|[\s'-])\S/g, m => m.toUpperCase());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim();
const normCommune = s => norm(s).replace(/^(l|le|la|les) /, '');

/* ---------- Communes : centre (pour situer les commerces OpenStreetMap) ---------- */
const CENTRES = [["L'Ajoupa-Bouillon", 14.816, -61.1305], ["Les Anses-d'Arlet", 14.4996, -61.0736], ['Basse-Pointe', 14.841, -61.1237],
  ['Le Carbet', 14.7041, -61.1583], ['Case-Pilote', 14.6594, -61.1297], ['Le Diamant', 14.4787, -61.0165], ['Ducos', 14.5785, -60.9685],
  ['Fonds-Saint-Denis', 14.7228, -61.1207], ['Fort-de-France', 14.6492, -61.0686], ['Le François', 14.6093, -60.8976],
  ["Grand'Rivière", 14.847, -61.1836], ['Gros-Morne', 14.7084, -61.0303], ['Le Lamentin', 14.6231, -60.9923], ['Le Lorrain', 14.7995, -61.074],
  ['Macouba', 14.8474, -61.1465], ['Le Marigot', 14.7795, -61.053], ['Le Marin', 14.4822, -60.8589], ['Le Morne-Rouge', 14.7695, -61.1217],
  ['Le Prêcheur', 14.8221, -61.1963], ['Rivière-Pilote', 14.5027, -60.897], ['Rivière-Salée', 14.5262, -60.9623], ['Le Robert', 14.6786, -60.9243],
  ['Saint-Esprit', 14.5617, -60.9233], ['Saint-Joseph', 14.6835, -61.0407], ['Saint-Pierre', 14.7717, -61.1735], ['Sainte-Anne', 14.4314, -60.8516],
  ['Sainte-Luce', 14.4904, -60.9467], ['Sainte-Marie', 14.773, -61.0084], ['Schœlcher', 14.6518, -61.1001], ['La Trinité', 14.7518, -60.9469],
  ['Les Trois-Îlets', 14.5329, -61.0376], ['Le Vauclin', 14.542, -60.8595], ['Le Morne-Vert', 14.7046, -61.1362], ['Bellefontaine', 14.6747, -61.146]];
const communeData = nom => COMMUNES.find(c => normCommune(c[0]) === normCommune(nom));
const nomCommune = nom => communeData(nom)?.[0] || cap(nom || '');
function communeProche(lat, lon) {
  let best = null, dmin = Infinity;
  CENTRES.forEach(([n, a, b]) => { const d = (a - lat) ** 2 + ((b - lon) * Math.cos(lat * Math.PI / 180)) ** 2; if (d < dmin) { dmin = d; best = n; } });
  return nomCommune(best);
}
const agenceDe = p => communeData(p.commune)?.[2] || 'ducos';
const zoneDe = p => communeData(p.commune)?.[1] || '';

/* =====================================================================
   SEGMENTS : à qui l'on parle, ce qu'on leur propose, quand les appeler
   ===================================================================== */
const SEGMENTS = {
  resto: { nom: 'Restaurant / snack / bar', pluriel: 'restaurants et snacks', couleur: '#fb923c', base: 22,
    naf: /^(56\.|10\.71)/, mots: /restaura|snack|traiteur|\bbar\b|boulang|patiss|cafe|glacier|pizz|crep|lolo|food truck|brasserie|grill|sushi|burger/,
    offre: ['pos', 'network', 'camera', 'siteweb'], pack: 'shop', appel: 'entre 14 h 30 et 17 h, hors service',
    argument: 'une caisse simple, un Wi-Fi client qui marche et des caméras, pour encaisser vite et travailler tranquille',
    questions: ['Comment encaissez-vous aujourd’hui ? Caisse, tablette, carnet ?', 'Vos clients vous demandent-ils le Wi-Fi ?', 'Avez-vous déjà eu des soucis de vol ou de caisse ?'] },
  commerce: { nom: 'Commerce / boutique', pluriel: 'commerces', couleur: '#facc15', base: 20,
    naf: /^47\./, mots: /commerce|vente|boutique|magasin|epicerie|pret a porter|vetement|chaussure|bijou|quincaill|alimentation|librairie|fleur|optique|telephon|cosmetique|import export|negoce/,
    offre: ['pos', 'camera', 'siteweb', 'network'], pack: 'shop', appel: 'entre 9 h et 10 h 30, avant l’affluence',
    argument: 'une caisse avec gestion du stock, des caméras et une boutique en ligne pour vendre aussi sur internet',
    questions: ['Gérez-vous votre stock sur ordinateur ?', 'Vendez-vous déjà en ligne ou sur les réseaux ?', 'Avez-vous des caméras dans le magasin ?'] },
  sante: { nom: 'Santé (cabinet, pharmacie…)', pluriel: 'cabinets et professionnels de santé', couleur: '#ef4444', base: 26,
    naf: /^(86\.|75\.|47\.73)/, mots: /medic|medecin|dentaire|dentist|kine|infirmi|pharma|sante|clinique|osteo|psycho|veterin|orthophon|podolog|sage femme|ambulan|laboratoire|radiolog|optic/,
    offre: ['maintenance', 'sauvegarde', 'cyber', 'siteweb'], appel: 'entre 12 h et 14 h, ou après 17 h',
    argument: 'des ordinateurs fiables, des données patients sauvegardées chaque jour et une sécurité vérifiée',
    questions: ['Vos dossiers patients sont-ils sauvegardés en dehors du cabinet ?', 'Que se passe-t-il si votre ordinateur tombe en panne un lundi matin ?', 'Vos patients peuvent-ils prendre rendez-vous en ligne ?'] },
  hebergement: { nom: 'Hôtel / gîte / location', pluriel: 'hôtels, gîtes et locations', couleur: '#22d3ee', base: 24,
    naf: /^55\./, mots: /hotel|gite|location saisonniere|meuble de tourisme|residence de tourisme|chambre d hote|hebergement|villa|bungalow|camping|tourisme/,
    offre: ['network', 'camera', 'siteweb'], pack: 'wifi', appel: 'entre 10 h et 12 h',
    argument: 'un Wi-Fi qui capte dans toutes les chambres, des caméras et un site avec réservation en ligne',
    questions: ['Vos clients se plaignent-ils du Wi-Fi dans les chambres ?', 'Les réservations passent-elles toutes par Airbnb ou Booking ?', 'Surveillez-vous l’accès quand vous n’êtes pas sur place ?'] },
  beaute: { nom: 'Coiffure / beauté', pluriel: 'salons de coiffure et instituts', couleur: '#e040fb', base: 16,
    naf: /^96\.0[24]/, mots: /coiff|esthet|beaute|ongle|onglerie|barbier|\bspa\b|massage|institut|tatou|maquill/,
    offre: ['siteweb', 'pos', 'network'], appel: 'entre 9 h et 10 h, ou en fin de journée',
    argument: 'la prise de rendez-vous en ligne, une caisse simple et un Wi-Fi pour vos clientes',
    questions: ['Comment vos clientes prennent-elles rendez-vous aujourd’hui ?', 'Avez-vous beaucoup de rendez-vous oubliés ?'] },
  bureau: { nom: 'Bureau / cabinet / agence', pluriel: 'cabinets et entreprises de services', couleur: '#2b8cff', base: 22,
    naf: /^(66|69|70\.22|71|74|78|80|81|82)\./, mots: /comptab|expert comptable|avocat|assurance|immobili|architect|courtage|notaire|secretariat|bureau d etudes|transport|logistique|nettoyage|securite privee|interim|formation professionnelle/,
    offre: ['maintenance', 'sauvegarde', 'cyber', 'network'], appel: 'entre 9 h et 11 h',
    argument: 'des postes entretenus, des sauvegardes automatiques et une sécurité vérifiée, sans engagement',
    questions: ['Qui s’occupe de votre informatique aujourd’hui ?', 'Quand avez-vous vérifié vos sauvegardes pour la dernière fois ?', 'Avez-vous déjà reçu des emails frauduleux ?'] },
  artisan: { nom: 'Artisan du bâtiment', pluriel: 'artisans et entreprises du bâtiment', couleur: '#14b8a6', base: 14,
    naf: /^(41|42|43)\./, mots: /batiment|btp|maconn|plomb|electricien|menuis|peintre|peinture en batiment|renovation|construction|climatisation|carrelage|charpente|terrassement|paysag|serrur|vitrerie|froid/,
    offre: ['siteweb', 'install', 'sauvegarde'], appel: 'entre 7 h et 8 h, ou entre 17 h et 18 h',
    argument: 'un site vitrine pour être trouvé sur Google et un ordinateur prêt pour vos devis et factures',
    questions: ['Comment vos nouveaux clients vous trouvent-ils ?', 'Faites-vous vos devis sur ordinateur ou à la main ?'] },
  auto: { nom: 'Garage / auto / moto', pluriel: 'garages', couleur: '#94a3b8', base: 16,
    naf: /^45\./, mots: /garage|automobile|\bauto\b|mecaniq|carross|pneu|vehicule|\bmoto|lavage auto|controle technique/,
    offre: ['pos', 'camera', 'siteweb'], appel: 'entre 14 h et 16 h',
    argument: 'des caméras pour l’atelier, une caisse et la prise de rendez-vous en ligne',
    questions: ['L’atelier est-il surveillé la nuit ?', 'Comment vos clients prennent-ils rendez-vous ?'] },
  ecole: { nom: 'École / association', pluriel: 'écoles, crèches et associations', couleur: '#a78bfa', base: 12,
    naf: /^(85|88|94)\./, mots: /ecole|formation|creche|association|enseignement|soutien scolaire|auto ecole|club|sport/,
    offre: ['maintenance', 'network', 'cours'], appel: 'entre 9 h et 11 h',
    argument: 'des ordinateurs et un réseau qui fonctionnent pour vos élèves et vos équipes',
    questions: ['Combien d’ordinateurs utilisez-vous ?', 'Le Wi-Fi tient-il quand tout le monde est connecté ?'] },
  autre: { nom: 'Autre activité', pluriel: 'entreprises', couleur: '#64748b', base: 8,
    naf: /.*/, mots: /./, offre: ['siteweb', 'maintenance'], appel: 'entre 9 h et 11 h',
    argument: 'un informaticien local qui se déplace, pour tout ce qui touche à l’informatique, au site internet et à la sécurité',
    questions: ['Qui s’occupe de votre informatique aujourd’hui ?', 'Avez-vous un site internet ?'] }
};
// Activités sans besoin informatique réel : écartées automatiquement (sociétés civiles immobilières, holdings…)
const EXCLUS_NAF = /^(68\.20|64\.|70\.10|84\.|01\.|02\.|03\.|62\.|63\.1|58\.2|61\.|73\.1|70\.21|95\.1|47\.4[12])/;
// métier de l'informatique, du web ou de la communication : c'est un confrère, pas un client
const CONFRERE = /informati|numerique|digital|\bweb\b|webmaster|logiciel|telecom|cyber|infogerance|systemes? d information|reseaux? informatique|agence (de )?(communication|marketing|web)|marketing digital|community manag|developpeur|developpement (web|logiciel|d applications?)|creation de sites?/;
// indice plus faible : à vérifier à la main avant d'écrire
const CONFRERE_PEUT_ETRE = /\btech\b|technolog|multimedia|electronique|\bdata\b|consult/;
const EXCLUS_MOTS = /societe civile immobiliere|\bsci\b|holding|prise de participation|location de biens immobiliers|location de terrains|gestion de patrimoine|location de logement|acquisition.*immeubles|centre hospitalier|\bchu\b|hopital|mairie|prefecture|collectivite territoriale|gendarmerie|commissariat|securite sociale|france travail|vaccination|ville de|centre communal|communaute d agglomeration|conseil (departemental|regional)|ctm|cpam|caf/;

function segmentDe({ naf = '', texte = '' }) {
  const t = norm(texte);
  if (EXCLUS_NAF.test(naf) || EXCLUS_MOTS.test(t)) return 'exclu';
  for (const [k, s] of Object.entries(SEGMENTS)) if (k !== 'autre' && naf && s.naf.test(naf)) return k;
  for (const [k, s] of Object.entries(SEGMENTS)) if (k !== 'autre' && t && s.mots.test(t)) return k;
  return 'autre';
}
// métiers du bâtiment dans OpenStreetMap (les autres artisans — luthier, potier, couturier… — ne sont PAS du BTP)
const CRAFT_BTP = /^(builder|carpenter|electrician|plumber|painter|roofer|tiler|hvac|glaziery|stonemason|metal_construction|window_construction|plasterer|floorer|insulation|locksmith|scaffolder|joiner|gardener|landscaper|parquet_layer|stand_builder)$/;
function segmentOSM(t) {
  const a = t.amenity, sh = t.shop;
  if (EXCLUS_MOTS.test(norm(t.name))) return 'exclu';
  if (/^(computer|mobile_phone|electronics|telecommunication)$/.test(sh) || /^(it|telecommunication|advertising_agency)$/.test(t.office) || t.craft === 'electronics_repair') return 'exclu';
  if (/^(restaurant|cafe|bar|fast_food|ice_cream|pub|food_court)$/.test(a) || /^(bakery|pastry|confectionery)$/.test(sh)) return 'resto';
  if (/^(pharmacy|dentist|doctors|clinic|veterinary|hospital)$/.test(a) || t.healthcare || /^(optician|medical_supply|hearing_aids)$/.test(sh)) return 'sante';
  if (/^(hotel|guest_house|apartment|motel|hostel|chalet|camp_site)$/.test(t.tourism)) return 'hebergement';
  if (/^(hairdresser|beauty|massage|cosmetics|tattoo)$/.test(sh)) return 'beaute';
  if (/^(car|car_repair|car_parts|tyres|motorcycle)$/.test(sh) || /^(car_wash|car_rental|fuel)$/.test(a)) return 'auto';
  if (/^(school|college|university)$/.test(a) && !/prive|formation|auto ecole/.test(norm(t.name))) return 'exclu';   // écoles publiques : achats par marché public
  if (/^(kindergarten|driving_school|language_school|music_school|childcare)$/.test(a) || /^(association|ngo|educational_institution)$/.test(t.office)) return 'ecole';
  if (/^(government|diplomatic|political_party|religion)$/.test(t.office) || /^(place_of_worship|townhall|police|post_office|bank|atm)$/.test(a)) return 'exclu';
  if (t.office) return 'bureau';
  if (t.craft) return CRAFT_BTP.test(t.craft) ? 'artisan' : 'autre';
  if (sh) return 'commerce';
  return 'autre';
}
// l'activité est-elle connue avec certitude ? (sinon le message ne parle pas de son métier, et un humain vérifie avant l'envoi)
const segSurOSM = (t, seg) => seg !== 'autre' && !(seg === 'bureau' && /^(company|yes)$/.test(t.office)) && !(seg === 'commerce' && t.shop === 'yes');
function segmentSur(p) {
  if (p.segVerifie) return true;
  if (typeof p.segSur === 'boolean') return p.segSur;
  return p.segment !== 'autre' && (p.source === 'annuaire' || p.source === 'bodacc' || p.source === 'manuel');
}
// raisons de relire le 1er message avant qu'il parte (vide = il peut partir tout seul)
function aVerifier(p) {
  if (p.verifie || (p.etape || 0) > 0) return [];
  const t = norm([p.nom, p.activite, p.site, p.facebook, p.analyse?.titre, p.analyse?.description].join(' '));
  const r = [];
  if (CONFRERE.test(t)) r.push('Semble travailler dans l’informatique, le web ou la communication : c’est probablement un confrère');
  else if (CONFRERE_PEUT_ETRE.test(t)) r.push('Son nom ou son site évoque la technologie ou le conseil : vérifiez qu’il n’est pas du métier');
  if (!segmentSur(p)) r.push('Activité devinée, pas certaine : regardez son site ou sa page Facebook, puis choisissez l’activité');
  if (p.groupe) r.push('Enseigne nationale ou groupe : les décisions se prennent ailleurs');
  return r;
}
// site correct déjà en place : on ne lui propose ni site, ni visibilité
const dejaEnLigne = p => !!p.site && !siteFaible(p);

/* =====================================================================
   SCORE : plus il est haut, plus le prospect a de chances d'avoir besoin de nous MAINTENANT
   ===================================================================== */
const EFFECTIFS = { '00': '0 salarié', '01': '1 ou 2 salariés', '02': '3 à 5 salariés', '03': '6 à 9 salariés', '11': '10 à 19 salariés', '12': '20 à 49 salariés',
  '21': '50 à 99 salariés', '22': '100 à 199 salariés', '31': '200 à 249 salariés', '32': '250 à 499 salariés', '41': '500 à 999 salariés' };
function scorer(p) {
  const seg = SEGMENTS[p.segment] || SEGMENTS.autre;
  const r = [[seg.base, `Activité : ${seg.nom.toLowerCase()}`]];
  const age = ageJours(p.creation);
  if (age !== null && age >= 0) {
    if (age <= 120) r.push([30, `Entreprise toute neuve (créée il y a ${age < 31 ? age + ' jours' : Math.round(age / 30) + ' mois'}) : elle s’équipe en ce moment`]);
    else if (age <= 365) r.push([20, 'Créée cette année : encore en train de s’équiper']);
    else if (age <= 730) r.push([8, 'Créée il y a moins de 2 ans']);
  }
  const a = p.analyse;
  if (p.site && a && a.ok) {
    const vieux = a.annee && a.annee <= new Date().getFullYear() - 3;
    if (!a.https) r.push([10, 'Site non sécurisé (pas de cadenas)']);
    if (!a.mobile) r.push([10, 'Site mal affiché sur téléphone']);
    if (vieux) r.push([6, `Site pas mis à jour depuis ${a.annee}`]);
    if (a.https && a.mobile && !vieux) r.push([0, 'Site récent et correct']);
  } else if (p.site && a && a.reason === 'injoignable') r.push([12, 'Son site ne s’ouvre plus : les clients tombent sur une erreur']);
  else if (p.site) r.push(/^http:\/\//i.test(p.site) ? [10, 'Site internet non sécurisé (sans cadenas) : à moderniser'] : [0, 'A déjà un site internet']);
  else if (p.sansSite) r.push([15, 'N’a pas de site internet']);
  else r.push([5, 'Site internet non trouvé (à vérifier)']);
  if (p.tel) r.push([12, digits(p.tel).match(/^(0|596)?69[67]/) ? 'Portable connu : WhatsApp possible' : 'Téléphone connu']);
  if (p.email) r.push([6, 'Email connu']);
  if (!p.tel && !p.email) r.push([-10, 'Coordonnées à trouver']);
  if (['02', '03'].includes(p.effectif)) r.push([8, `${EFFECTIFS[p.effectif]} : plusieurs postes à équiper`]);
  else if (['11', '12'].includes(p.effectif)) r.push([15, `${EFFECTIFS[p.effectif]} : un vrai parc informatique`]);
  else if (p.effectif >= '21') r.push([3, 'Grande structure (service informatique probable)']);
  if (p.groupe) r.push([-15, 'Groupe ou enseigne nationale : décisions prises ailleurs']);
  const z = zoneDe(p);
  if (z === 'agence') r.push([10, `À côté de l’agence ${AGENCES[agenceDe(p)].de}`]);
  else if (z === 'centre') r.push([6, 'Zone Centre : déplacement rapide']);
  const s = Math.max(0, Math.min(100, r.reduce((t, x) => t + x[0], 0)));
  return { score: p.statut === 'stop' ? 0 : s, raisons: r };
}
const niveau = s => s >= 70 ? ['Très chaud', 'n-tc'] : s >= 50 ? ['Chaud', 'n-c'] : s >= 30 ? ['Tiède', 'n-t'] : ['Froid', 'n-f'];

// site à refaire : sans cadenas, mal affiché sur téléphone ou abandonné depuis 3 ans
const siteFaible = p => !!p.site && (/^http:/i.test(p.site) || p.analyse?.reason === 'injoignable' ||!!(p.analyse?.ok && (!p.analyse.https || !p.analyse.mobile || (p.analyse.annee && p.analyse.annee <= new Date().getFullYear() - 3))));

// Offre conseillée : services du site + valeur estimée
function offreDe(p) {
  const seg = SEGMENTS[p.segment] || SEGMENTS.autre;
  let ids = [...seg.offre];
  if (!p.site && !ids.includes('siteweb')) ids.unshift('siteweb');
  if (!p.site && ids.includes('siteweb')) ids = ['siteweb', ...ids.filter(x => x !== 'siteweb')];
  if (siteFaible(p)) ids = ['siteweb', 'maintweb', ...ids.filter(x => x !== 'siteweb')];
  // entreprise récente : elle doit se faire connaître
  if (ageJours(p.creation) !== null && ageJours(p.creation) <= 365) ids.splice(1, 0, 'marketing');
  const pk = seg.pack && segmentSur(p) && PACKS.find(x => x.id === seg.pack);
  const inPack = pk ? Object.keys(pk.items) : [];
  if (dejaEnLigne(p)) ids = ids.filter(id => !['siteweb', 'maintweb', 'marketing'].includes(id));
  if (!ids.length) ids = ['maintenance', 'sauvegarde'];
  ids = [...new Set(ids)].filter(id => SERVICES.find(s => s.id === id) && !inPack.includes(id)).slice(0, 4);
  const valeur = (pk ? pk.prix : 0) + ids.filter(id => !inPack.includes(id)).reduce((t, id) => { const s = SERVICES.find(x => x.id === id); return t + (s.mensuel ? s.base * 12 : s.base); }, 0);
  return { services: ids, pack: pk ? pk.id : null, valeur };
}

/* =====================================================================
   ÉTAT, SAUVEGARDE, SYNCHRONISATION
   ===================================================================== */
const STATUTS = {
  nouveau:   { nom: 'À contacter',       c: '#64748b' },
  contacte:  { nom: 'Contacté',          c: '#2b8cff' },
  interesse: { nom: 'Intéressé',         c: '#f59e0b' },
  rdv:       { nom: 'RDV / devis',       c: '#8b5cf6' },
  client:    { nom: 'Client',            c: '#16a34a' },
  sansrep:   { nom: 'Sans réponse',      c: '#94a3b8' },
  perdu:     { nom: 'Pas intéressé',     c: '#ef4444' },
  stop:      { nom: 'Ne plus contacter', c: '#111827' }
};
const ACTIFS = ['contacte', 'interesse', 'rdv'];
// séquence : 1er message, relance à J+3, dernière relance à J+7 après, puis « Sans réponse »
const SEQUENCE = [3, 7, 0];

let db = { prospects: [], reglages: { parJour: 10, signature: 'L’équipe IloTech' }, supprimes: [], listes: { noire: [], blanche: [] } };
try { const s = JSON.parse(localStorage.getItem('itProspects')); if (s && Array.isArray(s.prospects)) db = { ...db, ...s, reglages: { ...db.reglages, ...s.reglages }, listes: { noire: [], blanche: [], ...s.listes } }; } catch (e) {}
if (!db.reglages.signature || db.reglages.signature === 'Erwan') db.reglages.signature = 'L’équipe IloTech';
let cle = '';
try { cle = localStorage.getItem('itGestionCle') || ''; } catch (e) {}
let vue = 'jour', fiche = null, canal = 'whatsapp', resultats = [], recherche = { source: 'bodacc', jours: 60, segment: '', commune: '', q: '', avecTel: false },
  filtre = { statut: '', segment: '', agence: '', q: '', tri: 'score' }, chargement = '', sync = { etat: '', quand: '' }, dirty = new Set();

function sauver(p) {
  if (p) { p.maj = new Date().toISOString(); Object.assign(p, scorer(p)); dirty.add(p.id); }
  try { localStorage.setItem('itProspects', JSON.stringify(db)); } catch (e) { toast('Stockage plein : exportez puis videz les anciens prospects.', true); }
  planifierSync();
}
const parId = id => db.prospects.find(p => p.id === id);

let syncTimer;
function planifierSync() { if (!CONFIG.endpoint || !cle) return; clearTimeout(syncTimer); syncTimer = setTimeout(synchroniser, 2500); }
async function api(op, payload = {}) {
  const res = await fetch(CONFIG.endpoint, { method: 'POST', body: JSON.stringify({ action: 'gestion', op, cle, ...payload }) });
  const j = await res.json();
  if (!j.ok) throw new Error(j.reason || 'erreur');
  return j;
}
async function synchroniser() {
  if (!CONFIG.endpoint || !cle) return;
  sync.etat = 'en cours'; renderSync();
  try {
    const envoi = db.prospects.filter(p => dirty.has(p.id));
    if (envoi.length || db.supprimes.length) await api('prospects_ecrire', { prospects: envoi, supprimer: db.supprimes });
    dirty.clear(); db.supprimes = [];
    const { prospects } = await api('prospects_lire');
    (prospects || []).forEach(q => {
      const p = parId(q.id);
      if (!p) db.prospects.push(q);
      else if ((q.maj || '') > (p.maj || '')) Object.assign(p, q);
    });
    try { const l = await api('listes_lire'); db.listes = { noire: l.noire || [], blanche: l.blanche || [] }; } catch (e) {}   // moteur ancien : listes locales
    try { localStorage.setItem('itProspects', JSON.stringify(db)); } catch (e) {}
    sync = { etat: 'ok', quand: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) };
    render();
  } catch (e) {
    sync.etat = e.message === 'cle' ? 'cle' : 'erreur';
    if (e.message === 'cle') { cle = ''; try { localStorage.removeItem('itGestionCle'); } catch (x) {} }
    renderSync();
  }
}
function renderSync() {
  const el = $('syncEtat'); if (!el) return;
  el.innerHTML = !CONFIG.endpoint ? '<span class="dot"></span>Sur cet appareil'
    : !cle ? '<button type="button" class="link" onclick="setVue(\'reglages\')">Se connecter pour partager</button>'
    : sync.etat === 'en cours' ? '<span class="dot on"></span>Synchronisation…'
    : sync.etat === 'ok' ? `<span class="dot on"></span>Partagé · ${sync.quand}`
    : sync.etat === 'cle' ? 'Code incorrect' : sync.etat === 'erreur' ? '<span class="dot bad"></span>Hors ligne (sauvé ici)' : '<span class="dot on"></span>Partagé';
}

/* =====================================================================
   SOURCES DE DONNÉES
   ===================================================================== */
async function getJSON(url, opts = {}, essais = 3) {
  for (let i = 0; i < essais; i++) {
    try {
      const ctl = new AbortController(), minuteur = setTimeout(() => ctl.abort(), opts.delai || 60000);
      const r = await fetch(url, { ...opts, signal: ctl.signal }).finally(() => clearTimeout(minuteur));
      if (r.status === 429 || r.status >= 500) { await sleep(1200 * (i + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { if (i === essais - 1) throw e; await sleep(800 * (i + 1)); }
  }
  throw new Error('indisponible');
}

// BODACC : créations d'entreprises en Martinique, les plus récentes d'abord
async function sourceBodacc(jours) {
  const depuis = addDays(todayISO(), -jours);
  const out = [];
  for (let offset = 0; offset < 600; offset += 100) {
    chargement = `Journal officiel : ${out.length} créations lues…`; renderChargement();
    const where = encodeURIComponent(`numerodepartement="972" and familleavis="creation" and dateparution>=date'${depuis}'`);
    const j = await getJSON(`https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records?where=${where}&order_by=dateparution%20desc&limit=100&offset=${offset}`);
    (j.results || []).forEach(r => {
      let pers = {}, etab = {}, acte = {};
      try { pers = JSON.parse(r.listepersonnes || '{}').personne || {}; } catch (e) {}
      try { etab = JSON.parse(r.listeetablissements || '{}').etablissement || {}; } catch (e) {}
      try { acte = JSON.parse(r.acte || '{}'); } catch (e) {}
      if (Array.isArray(etab)) etab = etab[0] || {};
      if (Array.isArray(pers)) pers = pers[0] || {};
      const siren = digits((r.registre || '').toString()).slice(0, 9);
      const pp = pers.typePersonne === 'pp';
      const prenom = [].concat(pers.prenom || [])[0] || '';
      const nom = pp ? cap([prenom, pers.nomUsage || pers.nom].filter(Boolean).join(' ')) || cap(r.commercant) : (s => s === s.toUpperCase() && s.length > 6 ? cap(s) : s)((pers.denomination || r.commercant || '').trim());
      const enseigne = etab.enseigne || pers.nomCommercial || '';
      const activite = etab.activite || pers.activite || '';
      const adr = etab.adresse || {};
      out.push({
        id: siren ? 'siren:' + siren : 'bodacc:' + r.id, source: 'bodacc', siren,
        nom: enseigne && norm(enseigne) !== norm(nom) ? `${cap(enseigne)} (${nom})` : (enseigne ? cap(enseigne) : nom), prenom: pp ? cap(prenom) : '',
        activite, ...(seg => ({ segment: seg, segSur: seg !== 'autre' }))(segmentDe({ texte: activite + ' ' + enseigne })),
        commune: nomCommune(r.ville || adr.ville), adresse: [adr.numeroVoie, adr.typeVoie, adr.nomVoie].filter(Boolean).join(' '),
        creation: acte.dateCommencementActivite || (acte.creation && acte.creation.dateCommencementActivite) || r.dateparution,
        tel: '', email: '', site: ''
      });
    });
    if (!j.results || j.results.length < 100) break;
    await sleep(250);
  }
  return out;
}

// OpenStreetMap : tous les commerces et pros nommés de Martinique (gardés 7 jours sur l'appareil)
async function sourceOSM() {
  try {
    const c = JSON.parse(localStorage.getItem('itOsmCache') || 'null');
    if (c && c.date && ageJours(c.date) < 7 && c.items?.length) return c.items;
  } catch (e) {}
  chargement = 'OpenStreetMap : chargement des commerces de Martinique (≈ 20 s)…'; renderChargement();
  const q = `[out:json][timeout:90];area["ISO3166-1"="MQ"]->.a;(nwr["shop"]["name"](area.a);nwr["amenity"~"^(restaurant|cafe|bar|fast_food|ice_cream|pub|pharmacy|dentist|doctors|clinic|veterinary|car_wash|car_rental|school|kindergarten|driving_school|college|childcare)$"]["name"](area.a);nwr["office"]["name"](area.a);nwr["craft"]["name"](area.a);nwr["healthcare"]["name"](area.a);nwr["tourism"~"^(hotel|guest_house|apartment|motel|hostel|chalet|camp_site)$"]["name"](area.a););out tags center;`;
  let j;
  for (const srv of ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) {
    try { j = await getJSON(srv, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, delai: 100000 }, 2); break; } catch (e) {}
  }
  // secours : copie publiée avec le site (mise à jour à chaque publication)
  if (!j) { try { j = await getJSON('osm-martinique.json', {}, 1); toast('OpenStreetMap indisponible : copie du ' + frDate(j.date) + ' utilisée'); } catch (e) {} }
  if (!j) throw new Error('OpenStreetMap ne répond pas, réessayez dans une minute.');
  const items = (j.elements || []).map(e => {
    const t = e.tags || {}, g = k => t[k] || t['contact:' + k] || '';
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon;
    const seg = segmentOSM(t);
    if (seg === 'exclu' || lat == null) return null;
    const segSur = segSurOSM(t, seg);
    const type = t.amenity || t.shop || t.office || t.craft || t.tourism || t.healthcare || '';
    return { id: `osm:${e.type}/${e.id}`, source: 'osm', nom: t.name, activite: type.replace(/_/g, ' '), segment: seg, segSur,
      commune: t['addr:city'] ? nomCommune(t['addr:city']) : communeProche(lat, lon), lat, lon,
      adresse: [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
      tel: (g('phone') || g('mobile')).split(';')[0].trim(), email: g('email').split(';')[0].trim(),
      site: g('website').split(';')[0].trim(), facebook: g('facebook'), horaires: t.opening_hours || '', groupe: !!(t.brand || t['brand:wikidata']) };
  }).filter(Boolean);
  try { localStorage.setItem('itOsmCache', JSON.stringify({ date: todayISO(), items })); } catch (e) {}
  return items;
}

// Annuaire des entreprises : recherche par nom / activité, en Martinique, entreprises actives
async function sourceAnnuaire(q, segment) {
  const out = [];
  const nafs = { resto: '56.10A,56.10C,56.30Z,10.71C', commerce: '', sante: '86.21Z,86.22C,86.23Z,86.90E,47.73Z,75.00Z', hebergement: '55.10Z,55.20Z,55.30Z',
    beaute: '96.02A,96.02B,96.04Z', bureau: '69.10Z,69.20Z,66.22Z,68.31Z,71.11Z,70.22Z', artisan: '43.21A,43.22A,43.22B,43.31Z,43.32A,43.34Z,43.99C', auto: '45.20A,45.20B,45.11Z', ecole: '85.59A,85.59B,88.91A' };
  for (let page = 1; page <= 4; page++) {
    chargement = `Annuaire officiel : page ${page}…`; renderChargement();
    const params = new URLSearchParams({ departement: '972', etat_administratif: 'A', per_page: '25', page: String(page) });
    if (q) params.set('q', q);
    if (segment && nafs[segment]) params.set('activite_principale', nafs[segment]);
    else if (segment === 'commerce') params.set('section_activite_principale', 'G');
    if (!q && !segment) params.set('q', 'martinique');
    const j = await getJSON('https://recherche-entreprises.api.gouv.fr/search?' + params);
    (j.results || []).forEach(r => {
      const et = (r.matching_etablissements || []).find(x => String(x.code_postal || '').startsWith('972')) || r.siege || {};
      const naf = et.activite_principale || r.activite_principale || '';
      const d = (r.dirigeants || [])[0] || {};
      const ei = r.complements?.est_entrepreneur_individuel;
      out.push({ id: 'siren:' + r.siren, source: 'annuaire', siren: r.siren, nom: cap(r.nom_complet), prenom: ei && d.prenoms ? cap(d.prenoms.split(' ')[0]) : '',
        activite: (r.libelle_activite_principale || naf), naf, ...(seg => ({ segment: seg, segSur: seg !== 'autre' }))(segmentDe({ naf, texte: r.nom_complet })),
        commune: nomCommune(et.libelle_commune), adresse: (et.adresse || '').replace(/\s*\d{5}.*$/, ''),
        lat: et.latitude ? Number(et.latitude) : null, lon: et.longitude ? Number(et.longitude) : null,
        creation: r.date_creation, effectif: r.tranche_effectif_salarie && r.tranche_effectif_salarie !== 'NN' ? r.tranche_effectif_salarie : '',
        groupe: ['GE', 'ETI'].includes(r.categorie_entreprise) || !String(r.siege?.code_postal || '').startsWith('972'), tel: '', email: '', site: '' });
    });
    if (!j.results || page >= (j.total_pages || 1)) break;
    await sleep(300);
  }
  return out;
}

// complète un prospect avec OpenStreetMap si le nom correspond (téléphone, site…)
function completerOSM(items) {
  let osm = [];
  try { osm = JSON.parse(localStorage.getItem('itOsmCache') || '{}').items || []; } catch (e) {}
  if (!osm.length) return items;
  const index = {};
  osm.forEach(o => { index[norm(o.nom)] = o; });
  return items.map(p => {
    const cands = [p.nom, p.nom.replace(/\s*\(.*\)$/, ''), (p.nom.match(/\(([^)]+)\)/) || [])[1]].filter(Boolean);
    const o = cands.map(n => index[norm(n)]).find(Boolean);
    if (!o || (o.commune && p.commune && normCommune(o.commune) !== normCommune(p.commune))) return p;
    return { ...p, tel: p.tel || o.tel, email: p.email || o.email, site: p.site || o.site, lat: p.lat ?? o.lat, lon: p.lon ?? o.lon, horaires: o.horaires };
  });
}

/* =====================================================================
   RECHERCHE ET AJOUT
   ===================================================================== */
const enListe = id => db.prospects.some(p => p.id === id);
const stoppe = p => db.prospects.some(x => x.statut === 'stop' && (x.id === p.id || (norm(x.nom) === norm(p.nom) && normCommune(x.commune) === normCommune(p.commune))));
function preparer(items) {
  const vus = new Set();
  return items.filter(p => p && p.nom && p.segment !== 'exclu' && !stoppe(p) && !vus.has(p.id) && vus.add(p.id))
    .map(p => ({ ...p, statut: 'nouveau', ...scorer({ ...p, statut: 'nouveau' }) }))
    .sort((a, b) => b.score - a.score);
}
async function chercher() {
  const r = recherche;
  chargement = 'Recherche…'; resultats = []; render();
  try {
    let items;
    if (r.source === 'bodacc') items = completerOSM(await sourceBodacc(r.jours));
    else if (r.source === 'osm') items = await sourceOSM();
    else items = completerOSM(await sourceAnnuaire(r.q.trim(), r.segment));
    if (r.segment) items = items.filter(p => p.segment === r.segment);
    if (r.commune) items = items.filter(p => r.commune.startsWith('ag:') ? communeData(p.commune)?.[2] === r.commune.slice(3) : normCommune(p.commune) === normCommune(r.commune));
    if (r.avecTel) items = items.filter(p => p.tel);
    if (r.q && r.source !== 'annuaire') items = items.filter(p => norm(p.nom + ' ' + p.activite).includes(norm(r.q)));
    resultats = preparer(items);
    chargement = '';
  } catch (e) { chargement = ''; toast('Source indisponible : ' + e.message, true); }
  render();
}
function nouveauProspect(p) {
  const q = { ...p, statut: 'nouveau', etape: 0, relance: '', notes: [], historique: [{ d: new Date().toISOString(), t: `Ajouté (${SOURCES[p.source] || p.source})` }], cree: todayISO() };
  q.offre = offreDe(q);
  return q;
}
function ajouter(id) {
  const p = resultats.find(x => x.id === id);
  if (!p || enListe(id)) return;
  const q = nouveauProspect(p); db.prospects.push(q); sauver(q);
  toast(`« ${p.nom} » ajouté à vos prospects`); render();
}
function ajouterMeilleurs(n) {
  const list = resultats.filter(p => !enListe(p.id) && p.score >= 40).slice(0, n);
  list.forEach(p => { const q = nouveauProspect(p); db.prospects.push(q); sauver(q); });
  toast(list.length ? `${list.length} prospects ajoutés` : 'Aucun nouveau prospect au-dessus de 40 points', !list.length); render();
}
// « Trouver automatiquement » : nouvelles entreprises (60 jours) + commerces OSM joignables, on garde les meilleurs
async function remplirAuto() {
  chargement = 'Recherche des meilleurs prospects…'; render();
  try {
    const osm = await sourceOSM();
    const neufs = completerOSM(await sourceBodacc(60));
    const tous = preparer([...neufs, ...osm.filter(p => p.tel || p.email)]).filter(p => !enListe(p.id));
    // 20 prospects joignables tout de suite + 10 entreprises toutes neuves (coordonnées à trouver), équilibrés entre les deux agences
    const equilibre = (list, n) => {
      const ag = { ducos: list.filter(p => agenceDe(p) === 'ducos'), robert: list.filter(p => agenceDe(p) === 'robert') }, out = [];
      for (let i = 0; out.length < n && (ag.ducos[i] || ag.robert[i]); i++) { if (ag.ducos[i]) out.push(ag.ducos[i]); if (ag.robert[i] && out.length < n) out.push(ag.robert[i]); }
      return out;
    };
    const joignables = equilibre(tous.filter(p => p.tel || p.email), 20);
    const choix = [...joignables, ...equilibre(tous.filter(p => !p.tel && !p.email && ageJours(p.creation) !== null && ageJours(p.creation) <= 180), 30 - joignables.length)];
    choix.forEach(p => { const q = nouveauProspect(p); db.prospects.push(q); sauver(q); });
    chargement = '';
    toast(`${choix.length} prospects ajoutés, les plus prometteurs en premier`);
    vue = 'jour';
  } catch (e) { chargement = ''; toast('Recherche impossible : ' + e.message, true); }
  render();
  if (scriptPret() && aAnalyser().length) await completerEmails();
}
const SOURCES = { bodacc: 'journal officiel BODACC', osm: 'OpenStreetMap', annuaire: 'annuaire officiel des entreprises', manuel: 'saisie manuelle' };
const SOURCE_PHRASE = { bodacc: 'l’annonce de création publiée au BODACC', osm: 'la carte OpenStreetMap', annuaire: 'l’annuaire officiel des entreprises', manuel: '' };

/* =====================================================================
   MESSAGES PERSONNALISÉS
   ===================================================================== */
// « de Martin », « d’Esprit Guitare »
const deNom = n => /^[aeiouyhéèêàâîôû]/i.test(n) ? `d’${n}` : `de ${n}`;
function contexte(p) {
  const seg = SEGMENTS[p.segment] || SEGMENTS.autre;
  const ag = AGENCES[agenceDe(p)];
  const nomCourt = p.nom.replace(/\s*\(.*\)$/, '');
  const age = ageJours(p.creation);
  const pk = p.offre?.pack && PACKS.find(x => x.id === p.offre.pack);
  const v = hash(p.id) % 2;
  let accroche;
  if (age !== null && age <= 365) accroche = v ? `Félicitations pour le lancement ${deNom(nomCourt)} !` : `Bravo pour la création ${deNom(nomCourt)}, et bienvenue dans l’aventure !`;
  else if (p.site && p.analyse?.reason === 'injoignable') accroche = `Nous avons voulu consulter le site ${deNom(nomCourt)}, mais il ne s’affiche plus : vos clients tombent sur une page d’erreur.`;
  else if (p.analyse?.ok && !p.analyse.mobile) accroche = `Nous avons regardé le site ${deNom(nomCourt)} : il s’affiche mal sur téléphone, alors que la plupart de vos clients vous cherchent depuis leur portable.`;
  else if (p.analyse?.ok && p.analyse.annee && p.analyse.annee <= new Date().getFullYear() - 3) accroche = `Nous avons regardé le site ${deNom(nomCourt)} : il n’a pas l’air d’avoir été mis à jour depuis ${p.analyse.annee}.`;
  else if ((p.site && /^http:/i.test(p.site)) || (p.analyse?.ok && !p.analyse.https)) accroche = `Nous avons remarqué que le site ${deNom(nomCourt)} s’affiche « non sécurisé » dans les navigateurs, ce qui peut faire fuir des clients.`;
  else if (!p.site && p.sansSite) accroche = `Nous avons vu que ${nomCourt} n’a pas encore de site internet : c’est pourtant là que vos clients vous cherchent en premier.`;
  else accroche = v || !segmentSur(p) || p.segment === 'autre' ? `Nous nous permettons de vous contacter au sujet de l’informatique ${deNom(nomCourt)}.` : `Nous travaillons avec plusieurs ${seg.pluriel} en Martinique et pensons pouvoir vous être utiles.`;
  const bonjour = p.prenom ? `Bonjour ${p.prenom}` : 'Bonjour';
  const moi = db.reglages.signature || 'L’équipe IloTech';
  const source = SOURCE_PHRASE[p.source] ? `Nous avons trouvé vos coordonnées sur ${SOURCE_PHRASE[p.source]}. ` : '';
  const offre = pk ? ` Par exemple notre formule « ${pk.nom} », à prix fixe annoncé à l’avance.` : '';
  const sur = segmentSur(p) && p.segment !== 'autre';
  const equipe = sur ? `Nous équipons les ${seg.pluriel} de Martinique : ${seg.argument}.` : 'Nous aidons les entreprises de Martinique au quotidien pour leur informatique : dépannage, entretien des postes, réseau, sauvegardes et sécurité.';
  const utile = sur ? seg.argument.split(',')[0] : 'dépannage, réseau, sauvegardes';
  return { seg, ag, nomCourt, bonjour, moi, accroche, source, offre, equipe, utile, signature: `${moi} — agence ${ag.de} · ${ag.tel}` };
}
function messages(p) {
  const c = contexte(p);
  const etape = p.etape || 0;
  const optout = `${c.source}Si vous ne souhaitez pas être recontacté, dites-le nous simplement.`;
  let court;
  if (etape === 0) court = `${c.bonjour},\n\n${c.accroche}\n\nIloTech est une entreprise informatique martiniquaise (agence ${c.ag.de}). ${c.equipe}${c.offre}\n\nLe devis est gratuit et sans engagement. Seriez-vous disponible 10 minutes cette semaine pour en parler ?\n\nNotre présentation : ${SITE}plaquette.html?src=whatsapp\n\n${c.signature}\n\n${optout}`;
  else if (etape === 1) court = `${c.bonjour}, nous nous permettons de revenir vers vous au sujet de notre message pour ${c.nomCourt}. Le devis reste gratuit et sans engagement : un créneau cette semaine vous conviendrait-il ?\n\n${c.signature}`;
  else court = `${c.bonjour}, dernier petit message de notre part pour ${c.nomCourt} : si un jour vous avez besoin d’un informaticien qui se déplace en Martinique (${c.utile}), gardez simplement ce numéro. Bonne continuation !\n\n${c.signature}`;
  const sujet = etape === 0 ? (hash(p.id) % 2 ? `${c.nomCourt} : votre informatique en Martinique` : `Une question pour ${c.nomCourt}`) : etape === 1 ? `Re : ${c.nomCourt}, devis gratuit` : `Dernier message — ${c.nomCourt}`;
  const services = (p.offre?.services || []).map(id => SERVICES.find(s => s.id === id)).filter(Boolean);
  const email = etape === 0
    ? `${c.bonjour},\n\n${c.accroche}\n\nIloTech est une entreprise informatique martiniquaise installée à Ducos et au Robert. ${c.equipe}\n\nCe que nous pourrions vous apporter :\n${services.map(s => `• ${s.nom} : ${s.desc.toLowerCase()}`).join('\n')}\n${c.offre ? '\n' + c.offre.trim() + '\n' : ''}\nNous intervenons sur place ou à distance, et le devis est gratuit et sans engagement. Vous trouverez notre flyer en pièce jointe, et notre présentation complète ici : ${SITE}plaquette.html?src=email\n\nSeriez-vous disponible pour un échange de 10 minutes cette semaine ?\n\nBien cordialement,\n${c.moi}\nInformatique, réseaux, web et sécurité\nAgence ${c.ag.de} · ${c.ag.tel}\n${SITE}\n\n—\n${c.source}Pour ne plus recevoir de message de notre part, répondez simplement STOP.`
    : court + `\n\n—\nPour ne plus recevoir de message de notre part, répondez simplement STOP.`;
  const appel = `PRÉSENTATION\n« ${c.bonjour}, je vous appelle de la part d’IloTech, l’entreprise informatique de ${c.ag.nom}. Je vous dérange deux minutes ? »\n\nACCROCHE\n« ${c.accroche} »\n\nQUESTIONS\n${c.seg.questions.map(q => '• ' + q).join('\n')}\n\nPROPOSITION\n« ${c.equipe} Je peux passer voir votre installation et vous faire un devis gratuit, sans engagement.${c.offre} »\n\nOBJECTIONS\n• « J’ai déjà quelqu’un » → « Très bien ! Gardez notre numéro pour les urgences : nous intervenons sous 48 h. »\n• « Pas le temps » → « Je comprends. Quel moment vous arrangerait pour 10 minutes ? »\n• « C’est trop cher » → « Le devis est gratuit et le prix est annoncé avant toute intervention : vous savez tout avant. »\n• « Envoyez-moi un email » → « Avec plaisir, à quelle adresse ? »\n\nCONCLURE\nFixer un rendez-vous (jour + heure) ou une date de rappel.`;
  const visite = `À dire en arrivant (30 secondes) :\n« ${c.bonjour}, je viens de la part d’IloTech, l’entreprise informatique de ${c.ag.nom}. ${c.accroche} ${c.equipe} Je vous laisse ma carte : le devis est gratuit, il suffit d’un message WhatsApp au ${c.ag.tel}. »\n\nÀ regarder sur place : caisse, Wi-Fi client, caméras, ordinateur de l’accueil, présence sur Google Maps.`;
  return { whatsapp: court, sms: court.replace(/\n\n/g, '\n').slice(0, 600), email: { sujet, corps: email }, appel, visite };
}

/* =====================================================================
   ACTIONS SUR UN PROSPECT
   ===================================================================== */
function noter(p, t) { p.historique = [...(p.historique || []), { d: new Date().toISOString(), t }]; }
// après un message : statut, étape suivante et date de relance automatiques
function contacte(id, mode) {
  const p = parId(id); if (!p) return;
  const etiquettes = ['1er message', 'relance', 'dernière relance'];
  noter(p, `${mode} — ${etiquettes[Math.min(p.etape || 0, 2)]}`);
  if (p.statut === 'nouveau' || p.statut === 'sansrep') p.statut = 'contacte';
  const delai = SEQUENCE[Math.min(p.etape || 0, 2)];
  p.etape = Math.min((p.etape || 0) + 1, 3);
  p.relance = delai ? addDays(todayISO(), delai) : '';
  if (!delai && p.statut === 'contacte') { p.statut = 'sansrep'; noter(p, 'Séquence terminée sans réponse'); }
  sauver(p); renderFiche(); render();
}
/* ---------- Automatique (via le script Google) : analyse des sites, envoi des emails ---------- */
const scriptPret = () => !!(CONFIG.endpoint && cle);
// bouton automatique cliqué alors que le script n'est pas installé : on explique comment l'activer
function aActiver() {
  if ($('fiche').open) $('fiche').close();
  alert(CONFIG.endpoint
    ? 'Connectez-vous d’abord avec le code de l’espace pro (onglet Réglages).'
    : 'Ce bouton fonctionne dès que le « moteur » Google est installé : 15 minutes, une seule fois.\n\nSuivez README.txt, partie « INSTALLER LE MOTEUR GOOGLE » (ou demandez à Claude de vous guider), puis envoyez l’adresse qui finit par /exec.');
  setVue('reglages');
  return null;
}
async function analyser(id, silencieux) {
  if (!scriptPret()) return silencieux ? null : aActiver();
  const p = parId(id); if (!p || !p.site) return null;
  if (!silencieux) toast('Analyse du site en cours…');
  try { p.analyse = { ...(await api('prospects_site', { site: p.site })), quand: todayISO() }; }
  catch (e) { p.analyse = { ok: false, reason: e.message, quand: todayISO() }; }
  if (p.analyse.ok) {
    if (!p.email && p.analyse.emails?.[0]) { p.email = p.analyse.emails[0]; noter(p, `Email trouvé sur son site : ${p.email}`); }
    if (!p.tel && p.analyse.tels?.[0]) { p.tel = p.analyse.tels[0]; noter(p, `Téléphone trouvé sur son site : ${p.tel}`); }
  }
  p.offre = offreDe(p);
  sauver(p);
  if (!silencieux) { renderFiche(); render(); toast(p.analyse.ok ? (p.analyse.emails?.length ? 'Email trouvé sur le site' : 'Site analysé : aucun email affiché') : 'Site injoignable', !p.analyse.ok); }
  return p.analyse;
}
const aAnalyser = () => db.prospects.filter(p => p.site && !p.analyse && !['stop', 'perdu', 'client'].includes(p.statut));
async function completerEmails() {
  if (!scriptPret()) return aActiver();
  const list = aAnalyser().slice(0, 40);
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    chargement = `Analyse des sites : ${i + 1} / ${list.length}…`; renderChargement();
    const a = await analyser(list[i].id, true);
    if (a?.ok && a.emails?.length) n++;
  }
  chargement = ''; toast(`${list.length} sites analysés : ${n} emails trouvés`); render();
}
async function envoyerEmail(id, silencieux) {
  if (!scriptPret()) return silencieux ? false : aActiver();
  const p = parId(id); if (!p || !p.email) return false;
  if (estNoir(p)) { if (!silencieux) toast('Cette entreprise est sur la liste noire : pas d’envoi', true); return false; }
  if (aVerifier(p).length) { if (!silencieux) toast('À vérifier avant d’envoyer : voir l’encadré « Avant d’envoyer » de la fiche', true); return false; }
  const m = messages(p);
  const sujet = !silencieux && $('fSujet') ? $('fSujet').value : m.email.sujet;
  const corps = !silencieux && $('fMsg') ? $('fMsg').value : m.email.corps;
  try {
    await api('prospects_envoyer', { to: p.email, sujet, corps, id: p.id, nom: p.nom, commune: p.commune, etape: ['1er message', 'relance', 'dernière relance'][Math.min(p.etape || 0, 2)] });
    p.dernierEnvoi = new Date().toISOString();
    p.aValider = false;
    contacte(id, 'Email envoyé');
    if (!silencieux) toast(`Email envoyé à ${p.email}`);
    return true;
  } catch (e) {
    if (!silencieux) toast(e.message === 'quota' ? 'Limite Gmail du jour atteinte : réessayez demain' : e.message === 'email' ? 'Adresse email invalide' : e.message === 'domaine' ? 'Cette adresse ne reçoit pas d’emails (domaine inexistant)' : e.message === 'liste_noire' ? 'Cette entreprise est sur la liste noire : pas d’envoi' : 'Envoi impossible pour le moment', true);
    return e.message === 'quota' ? 'quota' : false;
  }
}
// emails du jour : relances dues + nouveaux prospects du plan qui ont un email (séquence pas terminée)
const emailsDuJour = () => { const { relances, choix } = plan(); return [...relances, ...choix].filter(envoyable).slice(0, db.reglages.maxEmails || 25); };
async function envoyerEmailsDuJour() {
  if (!scriptPret()) return aActiver();
  const list = emailsDuJour();
  if (!list.length || !confirm(`Envoyer ${list.length} emails personnalisés maintenant ?\n\n${list.map(p => '• ' + p.nom).join('\n')}\n\nChaque message est écrit pour le prospect, et la relance suivante est programmée.`)) return;
  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    chargement = `Envoi des emails : ${i + 1} / ${list.length}…`; renderChargement();
    const r = await envoyerEmail(list[i].id, true);
    if (r === 'quota') { toast('Limite Gmail du jour atteinte : la suite partira demain', true); break; }
    if (r) ok++;
    await sleep(1500);
  }
  chargement = ''; toast(`${ok} email${ok > 1 ? 's' : ''} envoyé${ok > 1 ? 's' : ''}`); render();
}

async function relancerTous() {
  if (!scriptPret()) return aActiver();
  const t = todayISO();
  const list = db.prospects.filter(p => p.email && p.statut === 'contacte' && !p.repondu && p.relance && p.relance <= t && (p.etape || 0) < 3);
  if (!list.length || !confirm(`Relancer ${list.length} entreprises qui n’ont pas répondu ?`)) return;
  let ok = 0;
  for (let i = 0; i < list.length; i++) { chargement = `Relances : ${i + 1} / ${list.length}…`; renderChargement(); if (await envoyerEmail(list[i].id, true) === true) ok++; await sleep(1200); }
  chargement = ''; toast(`${ok} relance${ok > 1 ? 's' : ''} envoyée${ok > 1 ? 's' : ''}`); render();
}
let auto = null;
const MODES_AUTO = {
  auto:       ['Automatique', 'Chaque jour ouvré à 9 h : cherche des entreprises, écrit et relance tout seul.'],
  validation: ['Validation', 'Chaque jour ouvré à 9 h : cherche et prépare les emails, mais n’envoie rien sans votre accord.'],
  arret:      ['Arrêt', 'Rien n’est fait automatiquement. Vous gardez les commandes manuelles.']
};
function autoHTML() {
  if (!scriptPret()) return '<p class="muted">Disponible quand le moteur Google est connecté (code de l’espace pro dans Réglages).</p>';
  if (!auto) { chargerAuto(); return '<p class="muted">Chargement…</p>'; }
  if (auto.erreur) return '<p class="notice">Moteur Google injoignable pour le moment (connexion, ou moteur pas à jour). <button type="button" class="link" onclick="auto=null;render()">Réessayer</button></p>';
  const b = auto.bilan, mode = auto.mode || (auto.actif ? 'auto' : 'arret');
  return `<div class="p-pilote">
      <div class="p-modes" role="radiogroup" aria-label="Mode de prospection">${Object.entries(MODES_AUTO).map(([k, [l]]) =>
        `<button type="button" role="radio" aria-checked="${mode === k}" class="${mode === k ? 'on m-' + k : ''}" onclick="reglerAuto('${k}')">${l}</button>`).join('')}</div>
      <label class="p-parjour">Emails par jour <input type="number" min="1" max="60" value="${auto.parJour}" onchange="reglerAuto(null, this.value)"></label>
      <label class="p-check"><input type="checkbox" ${auto.blancheSeule ? 'checked' : ''} onchange="reglerAuto(null, null, this.checked)"> Seulement la liste blanche</label>
      <button type="button" class="btn btn-sm" onclick="lancerAuto()" ${chargement ? 'disabled' : ''}>${ico('zap')} Lancer maintenant</button>
    </div>
    <p class="muted small">${MODES_AUTO[mode][1]} Les réponses, refus et « STOP » sont détectés tout seuls (refus → liste noire) ; la liste blanche passe en premier ; jamais d’envoi le week-end ; aucun prix dans les emails.</p>
    ${b ? `<p class="muted small">Dernier passage : ${new Date(b.date).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} —
      ${b.mode === 'validation' ? `${b.aValider || 0} emails préparés` : `${b.envoyes} nouveaux emails, ${b.relances} relances`}, ${b.reponses} réponses, ${b.analyses} sites analysés (${b.emailsTrouves} emails trouvés).</p>` : '<p class="muted small">Pas encore de passage.</p>'}`;
}
async function chargerAuto() {
  try { auto = await api('prospects_auto_etat'); } catch (e) { auto = { erreur: true }; }
  document.querySelectorAll('.auto-etat').forEach(el => { el.innerHTML = autoHTML(); });
}
async function reglerAuto(mode, parJour, blancheSeule) {
  if (mode === 'auto' && !confirm('Mode automatique : les emails partiront tout seuls chaque jour ouvré à 9 h. Continuer ?')) return;
  try { auto = await api('prospects_auto_regler', { mode: mode || undefined, parJour: parJour || undefined, blancheSeule: typeof blancheSeule === 'boolean' ? blancheSeule : undefined }); toast(mode ? `Mode « ${MODES_AUTO[mode][0]} » enregistré` : 'Réglage enregistré'); }
  catch (e) { toast('Réglage impossible (moteur à jour ?)', true); }
  render();
}
async function lancerAuto() {
  const mode = auto?.mode || 'auto';
  if (!confirm(mode === 'auto' ? 'Chercher des entreprises et envoyer les emails maintenant ? (1 à 5 minutes)' : 'Chercher des entreprises et préparer les emails maintenant (sans les envoyer) ? (1 à 5 minutes)')) return;
  chargement = 'Prospection en cours (1 à 5 minutes)…'; render();
  try {
    const r = await api('prospects_auto_lancer'); auto = null;
    const b = r.bilan || {};
    toast(b.mode === 'validation' ? `${b.aValider || 0} emails prêts à valider` : `${b.envoyes || 0} emails envoyés, ${b.relances || 0} relances`);
    await synchroniser();
  } catch (e) { toast('La prospection n’a pas pu se lancer', true); }
  chargement = ''; render();
}
// emails préparés par le moteur, en attente de votre accord
const aValider = () => db.prospects.filter(p => p.aValider && p.email && p.statut === 'nouveau').sort((a, b) => (b.score || 0) - (a.score || 0));
function ecarter(id) {
  const p = parId(id); if (!p) return;
  p.aValider = false; p.statut = 'perdu'; noter(p, 'Écarté à la validation (pas envoyé)');
  sauver(p); render();
}
async function envoyerValides() {
  if (!scriptPret()) return aActiver();
  const list = aValider().filter(envoyable);
  if (!list.length) return toast('Rien à envoyer : vérifiez d’abord les fiches marquées « À vérifier »', true);
  if (!confirm(`Envoyer les ${list.length} emails préparés ?\n\n${list.map(p => '• ' + p.nom + ' — ' + p.email).join('\n')}`)) return;
  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    chargement = `Envoi : ${i + 1} / ${list.length}…`; renderChargement();
    const r = await envoyerEmail(list[i].id, true);
    if (r === 'quota') { toast('Limite Gmail du jour atteinte : la suite demain', true); break; }
    if (r === true) ok++;
    await sleep(1200);
  }
  chargement = ''; toast(`${ok} email${ok > 1 ? 's' : ''} envoyé${ok > 1 ? 's' : ''}`); render();
}

function appeler(id) { const p = parId(id); noter(p, 'Appel passé'); if (p.statut === 'nouveau') p.statut = 'contacte'; p.relance = p.relance || addDays(todayISO(), 2); sauver(p); renderFiche(); render(); }
function setStatut(id, s) {
  const p = parId(id); if (!p || p.statut === s) return;
  if (s === 'stop' && !confirm('Ne plus jamais contacter ce prospect ? Il ne sera plus proposé dans les recherches.')) return;
  noter(p, `Statut : ${STATUTS[s].nom}`); p.statut = s;
  if (['client', 'perdu', 'stop', 'sansrep'].includes(s)) p.relance = '';
  if (s === 'interesse' && !p.relance) p.relance = addDays(todayISO(), 2);
  sauver(p); renderFiche(); render();
}
function majChamp(id, k, v) {
  const p = parId(id); if (!p) return;
  p[k] = typeof v === 'string' ? v.trim() : v;
  if (k === 'segment') p.segVerifie = true;
  if (['site', 'sansSite', 'segment'].includes(k)) p.offre = offreDe(p);
  sauver(p); renderFiche(); render();
}
function ajouterNote(id) {
  const p = parId(id); const t = $('fNote').value.trim(); if (!p || !t) return;
  p.notes = [...(p.notes || []), { d: new Date().toISOString(), t }]; sauver(p); renderFiche();
}
function supprimer(id) {
  if (!confirm('Supprimer ce prospect de votre liste ?')) return;
  db.prospects = db.prospects.filter(p => p.id !== id); db.supprimes.push(id); sauver(); $('fiche').close(); render();
}
function ajouterManuel(ev) {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const nom = String(f.get('nom') || '').trim(); if (!nom) return;
  const p = nouveauProspect({ id: 'manuel:' + Date.now().toString(36), source: 'manuel', nom, prenom: String(f.get('prenom') || '').trim(), activite: String(f.get('activite') || ''),
    segment: f.get('segment') || segmentDe({ texte: String(f.get('activite') || '') + ' ' + nom }), commune: String(f.get('commune') || ''), tel: String(f.get('tel') || '').trim(),
    email: String(f.get('email') || '').trim(), site: String(f.get('site') || '').trim(), adresse: '' });
  if (p.segment === 'exclu') p.segment = 'autre';
  p.offre = offreDe(p);
  db.prospects.push(p); sauver(p); ev.target.reset(); toast(`« ${nom} » ajouté`); ouvrir(p.id);
}

/* =====================================================================
   RENDU
   ===================================================================== */
function toast(msg, bad) {
  const t = $('toast'); t.textContent = msg; t.className = 'g-toast' + (bad ? ' bad' : ''); t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 3500);
}
function renderChargement() { const el = $('chargement'); if (el) el.textContent = chargement; }
const badgeScore = s => { const [l, c] = niveau(s); return `<span class="p-score ${c}" title="${l}"><b>${s}</b><small>${l}</small></span>`; };
const chipSeg = k => { const s = SEGMENTS[k] || SEGMENTS.autre; return `<span class="p-seg" style="--c:${s.couleur}">${esc(s.nom)}</span>`; };
const chipStatut = k => `<span class="p-st" style="--c:${STATUTS[k]?.c || '#64748b'}">${STATUTS[k]?.nom || k}</span>`;
const signaux = p => [p.tel && `<span title="Téléphone">${ico('phone')}</span>`, p.email && `<span title="Email">@</span>`,
  p.site ? `<span title="${esc(p.site)}">${ico('globe')}</span>` : '', ageJours(p.creation) !== null && ageJours(p.creation) <= 365 && '<span class="p-new">Nouveau</span>'].filter(Boolean).join('');
const relanceTxt = p => !p.relance ? '' : p.relance < todayISO() ? `<span class="p-late">Relance en retard (${frDay(p.relance)})</span>` : p.relance === todayISO() ? '<span class="p-due">À relancer aujourd’hui</span>' : `<span class="muted">Relance ${frDay(p.relance)}</span>`;

function ligne(p) {
  return `<button type="button" class="p-row" onclick="ouvrir('${esc(p.id)}')">
    ${badgeScore(p.score)}
    <span class="p-main"><b>${esc(p.nom)}${estNoir(p) ? ' <span class="p-lnoire">Liste noire</span>' : estBlanc(p) ? ' <span class="p-lblanche">Prioritaire</span>' : ''}${!estNoir(p) && aVerifier(p).length ? ' <span class="p-averif">À vérifier</span>' : ''}</b><small>${chipSeg(p.segment)} ${esc(p.commune || '')} · Agence ${AGENCES[agenceDe(p)].nom}</small></span>
    <span class="p-sig">${signaux(p)}</span>
    <span class="p-side">${chipStatut(p.statut)}${relanceTxt(p)}</span></button>`;
}
/* ---------- Liste noire (jamais contactées) et liste blanche (prioritaires) ----------
   Une valeur = une adresse email, un domaine (@exemple.fr), un nom d'entreprise ou l'identifiant d'un prospect.
   Partagées avec le moteur Google (onglet « Listes ») : le moteur ne leur écrit jamais / les traite en premier. */
const normNom = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function correspond(p, entrees) {
  const em = String(p.email || p.emailInvalide || '').toLowerCase(), dom = em.split('@')[1] || '', nom = normNom(p.nom);
  return (entrees || []).some(e => {
    const v = String(e.valeur || '').toLowerCase();
    if (v === String(p.id || '').toLowerCase()) return true;
    if (v.charAt(0) === '@') return !!dom && (dom === v.slice(1) || dom.endsWith('.' + v.slice(1)));
    if (v.indexOf('@') > 0) return em === v;
    return !!nom && normNom(v) === nom;
  });
}
const estNoir = p => correspond(p, db.listes.noire);
const estBlanc = p => correspond(p, db.listes.blanche);
const valeurDe = p => p.email || p.nom;
async function ajouterListe(liste, valeurs, raison) {
  valeurs = valeurs.map(v => String(v).trim()).filter(Boolean);
  if (!valeurs.length) return;
  const date = todayISO();
  valeurs.forEach(v => { if (!db.listes[liste].some(e => e.valeur.toLowerCase() === v.toLowerCase())) db.listes[liste].push({ valeur: v, raison: raison || '', date }); });
  if (liste === 'noire') db.prospects.filter(p => estNoir(p) && !['stop', 'client'].includes(p.statut)).forEach(p => { p.statut = 'stop'; p.relance = ''; p.aValider = false; noter(p, 'Liste noire : ne plus contacter'); sauver(p); });
  sauver();
  if (scriptPret()) { try { const r = await api('listes_ajouter', { liste, valeurs, raison }); db.listes = { noire: r.noire, blanche: r.blanche }; sauver(); } catch (e) { toast('Liste enregistrée sur cet appareil seulement (moteur à jour ?)', true); } }
  toast(`${valeurs.length} ajout${valeurs.length > 1 ? 's' : ''} à la liste ${liste}`); render();
}
async function retirerListe(liste, valeur) {
  db.listes[liste] = db.listes[liste].filter(e => e.valeur !== valeur); sauver();
  if (scriptPret()) { try { const r = await api('listes_retirer', { liste, valeur }); db.listes = { noire: r.noire, blanche: r.blanche }; sauver(); } catch (e) {} }
  render();
}
function listeFiche(id, liste) {
  const p = parId(id); if (!p) return;
  const dans = liste === 'noire' ? estNoir(p) : estBlanc(p);
  if (dans) { db.listes[liste].filter(e => correspond(p, [e])).forEach(e => retirerListe(liste, e.valeur)); }
  else if (liste === 'blanche' || confirm(`Mettre ${p.nom} sur la liste noire ? Elle ne recevra plus jamais de message (ni de vous, ni du moteur automatique).`)) {
    if (liste === 'blanche' && estNoir(p)) return toast('Cette entreprise est sur la liste noire : retirez-la d’abord', true);
    ajouterListe(liste, [valeurDe(p)], liste === 'noire' ? 'Ajouté depuis la fiche' : 'Prioritaire');
  }
  setTimeout(renderFiche, 50);
}
function listeSelection(liste) {
  const list = [...selection].map(parId).filter(Boolean);
  if (!list.length) return;
  if (liste === 'noire' && !confirm(`Mettre ${list.length} entreprise${list.length > 1 ? 's' : ''} sur la liste noire ?\n\n${list.map(p => '• ' + p.nom).join('\n')}`)) return;
  ajouterListe(liste, list.map(valeurDe), liste === 'noire' ? 'Ajouté depuis la sélection' : 'Prioritaire');
  selection.clear();
}
function listesHTML() {
  const bloc = (liste, titre, aide) => `<div class="p-liste p-liste-${liste}">
      <h3>${titre} <span class="muted">(${db.listes[liste].length})</span></h3>
      <p class="muted small">${aide}</p>
      <textarea id="ajout-${liste}" rows="3" placeholder="Une par ligne : contact@exemple.fr, @exemple.fr ou Nom de l’entreprise"></textarea>
      <div class="actions left"><button type="button" class="btn btn-sm" onclick="ajouterListe('${liste}', $('ajout-${liste}').value.split(/[\\n,;]+/), $('raison-${liste}').value)">Ajouter</button>
        <input id="raison-${liste}" class="p-raison" placeholder="Raison (facultatif)" value="${liste === 'noire' ? 'A refusé' : 'Prioritaire'}"></div>
      <ul class="p-entrees">${db.listes[liste].map((e, i) => `<li><b>${esc(e.valeur)}</b> <span class="muted small">${esc(e.raison || '')}${e.date ? ' · ' + esc(String(e.date).slice(0, 10)) : ''}</span>
        <button type="button" class="link" onclick="retirerListe('${liste}', db.listes.${liste}[${i}].valeur)">Retirer</button></li>`).join('') || '<li class="muted small">Vide.</li>'}</ul></div>`;
  return `<div class="p-listes">${bloc('noire', 'Liste noire : ne jamais contacter', 'Les entreprises qui ont refusé ou demandé STOP. Ni la page ni le moteur automatique ne leur écriront plus. <b>Ajoutez ici les adresses des refus déjà reçus.</b> Les nouveaux refus reçus par email y sont ajoutés tout seuls.')}
    ${bloc('blanche', 'Liste blanche : à contacter en priorité', 'Les entreprises que vous voulez démarcher : le moteur automatique leur écrit avant les nouvelles entreprises trouvées (si elles sont dans vos prospects avec un email).')}</div>`;
}

/* ---------- Sélection de plusieurs entreprises pour leur envoyer un email ---------- */
const selection = new Set();
const envoyable = p => !!(p && p.email && !['stop', 'client', 'perdu'].includes(p.statut) && (p.etape || 0) < 3 && !estNoir(p) && !aVerifier(p).length);
const etapeNom = p => ['1er message', 'relance', 'dernière relance'][Math.min(p.etape || 0, 2)];
function toggleSel(id) { selection.has(id) ? selection.delete(id) : selection.add(id); render(); }
function selTout(ids, on) { ids.forEach(id => on ? selection.add(id) : selection.delete(id)); render(); }
const caseSel = p => { const ok = envoyable(p), on = selection.has(p.id);
  return `<label class="p-coche" title="${ok ? 'Sélectionner' : 'Pas d’email, liste noire, STOP ou 3 messages déjà envoyés'}"><input type="checkbox" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'} onchange="toggleSel('${esc(p.id)}')" aria-label="Sélectionner ${esc(p.nom)}"></label>`; };
// « Emails envoyés » : relancer tout de suite, programmer la relance, liste noire
function actionsEnvoi(p) {
  const id = esc(p.id);
  if (estNoir(p)) return `<button type="button" class="link" onclick="listeFiche('${id}','noire')">Retirer de la liste noire</button>`;
  const ok = envoyable(p);
  return `${ok ? `<button type="button" class="btn btn-sm btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="envoyerEmail('${id}')" title="Envoie la relance maintenant">${ico('mail')} Relancer</button>
      <label class="p-quand" title="Date de la relance automatique">Relance le <input type="date" min="${todayISO()}" value="${esc(p.relance || '')}" onchange="relanceLe('${id}', this.value)"></label>
      <button type="button" class="link" onclick="relanceLe('${id}', addDays(todayISO(), 3))">dans 3 j</button>` : ''}
    <button type="button" class="btn btn-sm g-danger" onclick="listeFiche('${id}','noire')">Liste noire</button>`;
}
function relanceLe(id, date) {
  const p = parId(id); if (!p || !envoyable(p)) return;
  p.relance = date || '';
  if (date && ['sansrep', 'nouveau'].includes(p.statut)) p.statut = 'contacte';
  if (date) p.repondu = false;
  noter(p, date ? `Relance programmée le ${frDay(date)}` : 'Relance annulée');
  sauver(p); render();
  toast(date ? `Relance de ${p.nom} programmée le ${frDay(date)}` : 'Relance annulée');
}
function ligneSel(p, contenu) {
  const ok = envoyable(p), on = selection.has(p.id);
  return `<div class="p-selrow ${on ? 'coche' : ''}">
    <label class="p-coche" title="${ok ? 'Sélectionner pour l’envoi' : 'Pas d’email, liste noire, STOP ou 3 messages déjà envoyés'}"><input type="checkbox" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'} onchange="toggleSel('${esc(p.id)}')" aria-label="Sélectionner ${esc(p.nom)}"></label>
    ${contenu || ligne(p)}</div>`;
}
function barreSel(visibles, relance) {
  const ok = visibles.filter(envoyable);
  const n = [...selection].filter(id => envoyable(parId(id))).length;
  const tous = ok.length && ok.every(p => selection.has(p.id));
  return `<div class="p-selbar">
    <label class="p-check"><input type="checkbox" ${tous ? 'checked' : ''} ${ok.length ? '' : 'disabled'} onchange="selTout([${ok.map(p => `'${esc(p.id)}'`).join(',')}], this.checked)"> Tout sélectionner <span class="muted">(${ok.length} avec email)</span></label>
    <span class="p-selnb">${n} sélectionnée${n > 1 ? 's' : ''}</span>
    ${n ? `<button type="button" class="link" onclick="selection.clear();render()">Vider</button>
      <button type="button" class="link" onclick="listeSelection('blanche')">Liste blanche</button>
      <button type="button" class="link g-danger-link" onclick="listeSelection('noire')">Liste noire</button>
      ${relance ? `<button type="button" class="link" onclick="[...selection].forEach(id => relanceLe(id, addDays(todayISO(), 3)))">Relance dans 3 j</button>` : ''}
      <button type="button" class="btn btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="envoyerSelection()">${ico('mail')} ${relance ? 'Relancer' : 'Envoyer l’email à'} ${n} entreprise${n > 1 ? 's' : ''}</button>` : '<span class="muted small">Cochez une ou plusieurs entreprises.</span>'}</div>`;
}
async function envoyerSelection() {
  if (!scriptPret()) return aActiver();
  const list = [...selection].map(parId).filter(envoyable);
  if (!list.length) return;
  if (!confirm(`Envoyer un email à ${list.length} entreprise${list.length > 1 ? 's' : ''} ?\n\n${list.map(p => `• ${p.nom} — ${p.email} (${etapeNom(p)})`).join('\n')}\n\nChaque email est personnalisé, sans prix, envoyé depuis ${CONFIG.email || 'votre adresse'}. La relance suivante est programmée toute seule.`)) return;
  let ok = 0;
  for (let i = 0; i < list.length; i++) {
    chargement = `Envoi : ${i + 1} / ${list.length}…`; renderChargement();
    const r = await envoyerEmail(list[i].id, true);
    if (r === 'quota') { toast('Limite Gmail du jour atteinte : la suite demain', true); break; }
    if (r === true) { ok++; selection.delete(list[i].id); }
    await sleep(1200);
  }
  chargement = ''; toast(`${ok} email${ok > 1 ? 's' : ''} envoyé${ok > 1 ? 's' : ''}`); render();
}

/* ---------- Connexion de cet ordinateur au moteur (prospects, listes et envois partagés) ---------- */
function bandeauConnexion() {
  if (!CONFIG.endpoint || cle) return '';
  return `<form class="p-connexion" onsubmit="event.preventDefault();connecter($('pCleBandeau').value)">
    <div><b>🔒 Cet ordinateur n’est pas connecté</b>
      <span>Entrez le code de l’espace pro pour retrouver les prospects et la liste noire communs à tous vos ordinateurs, et pour pouvoir envoyer les emails.</span></div>
    <input id="pCleBandeau" type="password" autocomplete="current-password" placeholder="Code de l’espace pro" required>
    <button class="btn btn-primary">Connecter</button></form>`;
}
async function connecter(v) {
  cle = String(v || '').trim(); if (!cle) return;
  try { localStorage.setItem('itGestionCle', cle); } catch (e) {}
  await synchroniser();
  toast(cle ? 'Ordinateur connecté : prospects et listes synchronisés' : 'Code incorrect', !cle);
  render();
}

// tout ce qui peut partir maintenant : relances dues, puis prospects jamais contactés qui ont un email
function aEnvoyer() {
  const t = todayISO();
  const relances = db.prospects.filter(p => envoyable(p) && p.statut !== 'nouveau' && !p.repondu && p.relance && p.relance <= t);
  const neufs = db.prospects.filter(p => envoyable(p) && p.statut === 'nouveau' && !(p.etape > 0)).sort((a, b) => b.score - a.score);
  return [...relances.map(p => ({ p, type: 'relance' })), ...neufs.map(p => ({ p, type: 'neuf' }))];
}

function plan() {
  const t = todayISO();
  const relances = db.prospects.filter(p => ACTIFS.includes(p.statut) && p.relance && p.relance <= t).sort((a, b) => a.relance.localeCompare(b.relance) || b.score - a.score);
  const neufs = db.prospects.filter(p => p.statut === 'nouveau' && !p.aValider && (p.tel || p.email)).sort((a, b) => b.score - a.score);
  const n = Math.max(0, (db.reglages.parJour || 10) - relances.length);
  const ag = { ducos: neufs.filter(p => agenceDe(p) === 'ducos'), robert: neufs.filter(p => agenceDe(p) === 'robert') };
  const choix = [];
  for (let i = 0; choix.length < n && (ag.ducos[i] || ag.robert[i]); i++) { if (ag.ducos[i]) choix.push(ag.ducos[i]); if (ag.robert[i] && choix.length < n) choix.push(ag.robert[i]); }
  return { relances, choix, aChercher: db.prospects.filter(p => p.statut === 'nouveau' && !p.tel && !p.email).sort((a, b) => b.score - a.score).slice(0, 5) };
}

const VUES = {
  emails() {
    const l = aEnvoyer(), rel = l.filter(x => x.type === 'relance').map(x => x.p), neufs = l.filter(x => x.type === 'neuf').map(x => x.p);
    const jour = emailsDuJour();
    return `<h2>Envoyer des emails</h2>
      <p class="muted">Chaque email est personnalisé et sans prix. La liste noire est respectée automatiquement, et la relance suivante se programme toute seule. Limite : ${db.reglages.maxEmails || 25} emails par jour.</p>
      <div class="p-envoi-rapide">
        <div><b>${jour.length ? `${jour.length} email${jour.length > 1 ? 's' : ''} prêt${jour.length > 1 ? 's' : ''} pour aujourd’hui` : 'Rien de prévu aujourd’hui'}</b>
          <span class="muted">Les relances dues, puis les meilleurs nouveaux prospects (Ducos et Le Robert à parts égales).</span></div>
        <button type="button" class="btn btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="envoyerEmailsDuJour()" ${jour.length && !chargement ? '' : 'disabled'}>${ico('mail')} Envoyer les emails du jour</button>
      </div>
      <h3>Ou choisissez vous-même</h3>
      ${barreSel([...rel, ...neufs], false)}
      <h3>Relances à faire <span class="muted">(${rel.length})</span></h3>
      ${rel.length ? rel.map(p => ligneSel(p)).join('') : '<p class="muted">Aucune relance due.</p>'}
      <h3>Jamais contactés, avec email <span class="muted">(${neufs.length})</span></h3>
      ${neufs.length ? neufs.slice(0, 60).map(p => ligneSel(p)).join('') : `<p class="muted">Aucun. <button type="button" class="link" onclick="setVue('trouver')">Trouver des prospects</button></p>`}
      ${neufs.length > 60 ? `<p class="muted">Et ${neufs.length - 60} autres dans « Mes prospects ».</p>` : ''}`;
  },
  jour() {
    const P = db.prospects, t = todayISO(), mois = t.slice(0, 7);
    const contactes = P.filter(p => p.statut !== 'nouveau' && p.statut !== 'stop');
    const repondu = P.filter(p => ['interesse', 'rdv', 'client', 'perdu'].includes(p.statut));
    const enCours = P.filter(p => ['interesse', 'rdv'].includes(p.statut));
    const gagnes = P.filter(p => p.statut === 'client' && (p.historique || []).some(h => h.t === 'Statut : Client' && h.d.slice(0, 7) === mois));
    const { relances, choix, aChercher } = plan();
    if (!P.length) return `<div class="p-vide"><h2>Bienvenue dans la prospection</h2>
      <p>L’outil cherche pour vous les entreprises de Martinique qui ont le plus de chances d’avoir besoin de IloTech : nouvelles entreprises, commerces, cabinets, hôtels… Il les classe par score, propose le bon message et vous rappelle quand relancer.</p>
      <button type="button" class="btn btn-primary big" onclick="remplirAuto()" ${chargement ? 'disabled' : ''}>${ico('search')} Trouver automatiquement mes 30 meilleurs prospects</button>
      <p class="muted">Ou <button type="button" class="link" onclick="setVue('trouver')">choisir moi-même la source</button>.</p></div>`;
    const attente = aValider();
    return `<section class="p-pilotage"><h2>${ico('zap')} Pilotage de la prospection</h2><div class="auto-etat">${autoHTML()}</div></section>
      ${attente.length ? `<h2>${ico('mail')} À valider : ${attente.length} email${attente.length > 1 ? 's' : ''} prêt${attente.length > 1 ? 's' : ''}
          <button type="button" class="btn btn-primary btn-sm p-toutenvoyer${scriptPret() ? '' : ' btn-off'}" onclick="envoyerValides()">Tout envoyer</button></h2>
        ${barreSel(attente)}
        <div class="p-list">${attente.map(p => ligneSel(p, `<div class="p-row res">${badgeScore(p.score)}
          <span class="p-main"><b>${esc(p.nom)}${aVerifier(p).length ? ' <span class="p-averif">À vérifier</span>' : ''}</b><small>${chipSeg(p.segment)} ${esc(p.commune || '')} · ${esc(p.email)}${aVerifier(p).length ? ' · ' + esc(aVerifier(p)[0]) : ''}</small></span>
          <span class="p-sig"></span>
          <span class="p-side p-valider"><button type="button" class="btn btn-sm" onclick="canalOuvrir('${esc(p.id)}','email')">${aVerifier(p).length ? 'Vérifier' : 'Voir l’email'}</button>
            ${aVerifier(p).length ? '' : `<button type="button" class="btn btn-sm btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="envoyerEmail('${esc(p.id)}')">Envoyer</button>`}
            <button type="button" class="link" onclick="ecarter('${esc(p.id)}')">Écarter</button></span></div>`)).join('')}</div>` : ''}
      <div class="g-stats p-kpi">
        <span><b>${P.filter(p => p.statut === 'nouveau').length}</b> à contacter</span>
        <span><b>${relances.length}</b> relance${relances.length > 1 ? 's' : ''} aujourd’hui</span>
        <span><b>${enCours.length}</b> en discussion · ${eur(enCours.reduce((s, p) => s + (p.offre?.valeur || 0), 0))}</span>
        <span><b>${gagnes.length}</b> client${gagnes.length > 1 ? 's' : ''} gagné${gagnes.length > 1 ? 's' : ''} ce mois</span>
        <span><b>${contactes.length ? Math.round(repondu.length / contactes.length * 100) : 0} %</b> de réponses</span></div>
      ${(() => {
        const mails = emailsDuJour(), sites = aAnalyser().length;
        if (!mails.length && !sites) return '';
        const off = scriptPret() ? '' : ' btn-off';
        return `<div class="p-auto"><b>${ico('zap')} En automatique</b>
          ${mails.length ? `<button type="button" class="btn btn-primary${off}" onclick="envoyerEmailsDuJour()" ${chargement ? 'disabled' : ''}>Envoyer les ${mails.length} emails du jour</button>` : ''}
          ${sites ? `<button type="button" class="btn${off}" onclick="completerEmails()" ${chargement ? 'disabled' : ''}>Chercher les emails sur ${Math.min(sites, 40)} sites</button>` : ''}
          ${scriptPret() ? '' : '<span class="muted small">🔒 À activer : installez une fois le script Google (cliquez sur un bouton pour voir comment).</span>'}</div>`;
      })()}
      ${relances.length ? `<h2>${ico('repeat')} À relancer aujourd’hui (${relances.length})</h2><div class="p-list">${relances.map(ligne).join('')}</div>` : ''}
      <h2>${ico('zap')} Votre plan du jour : ${choix.length} prospect${choix.length > 1 ? 's' : ''} à contacter</h2>
      <p class="muted">Les plus prometteurs d’abord, équilibrés entre Ducos et Le Robert. Ouvrez une fiche : le message est déjà écrit.</p>
      <div class="p-list">${choix.map(ligne).join('') || '<p class="muted">Plus personne à contacter avec un téléphone ou un email. <button type="button" class="link" onclick="remplirAuto()">Trouver de nouveaux prospects</button></p>'}</div>
      ${aChercher.length ? `<h2>${ico('search')} Coordonnées à trouver</h2><p class="muted">Bons prospects sans téléphone ni email : ouvrez la fiche, puis « Chercher sur Google ».</p><div class="p-list">${aChercher.map(ligne).join('')}</div>` : ''}`;
  },
  trouver() {
    const r = recherche;
    const opt = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${k}" ${v === k ? 'selected' : ''}>${l}</option>`).join('');
    const segs = Object.fromEntries([['', 'Toutes les activités'], ...Object.entries(SEGMENTS).map(([k, s]) => [k, s.nom])]);
    const lieux = { '': 'Toute la Martinique', 'ag:ducos': 'Secteur Ducos (Sud, Centre)', 'ag:robert': 'Secteur Le Robert (Atlantique, Nord)', ...Object.fromEntries(COMMUNES.map(c => [c[0], c[0]])) };
    const src = (k, titre, txt, icone) => `<button type="button" class="p-src ${r.source === k ? 'on' : ''}" onclick="recherche.source='${k}';resultats=[];render()">${ico(icone)}<b>${titre}</b><small>${txt}</small></button>`;
    const nouveaux = resultats.filter(p => !enListe(p.id));
    return `<div class="p-srcs">
        ${src('bodacc', 'Nouvelles entreprises', 'Créées ces dernières semaines (journal officiel) : elles s’équipent maintenant', 'zap')}
        ${src('osm', 'Commerces et pros', 'Restaurants, boutiques, cabinets, hôtels… avec téléphone ou site', 'pin')}
        ${src('annuaire', 'Annuaire officiel', 'Recherche par nom ou par activité, toutes les entreprises actives', 'search')}
      </div>
      <form class="p-filtres" onsubmit="event.preventDefault();chercher()">
        ${r.source === 'bodacc' ? `<label>Créées depuis<select onchange="recherche.jours=+this.value">${opt({ 30: '30 jours', 60: '2 mois', 90: '3 mois', 180: '6 mois', 365: '1 an' }, String(r.jours))}</select></label>` : ''}
        <label>Activité<select onchange="recherche.segment=this.value">${opt(segs, r.segment)}</select></label>
        <label>Secteur<select onchange="recherche.commune=this.value">${opt(lieux, r.commune)}</select></label>
        <label>${r.source === 'annuaire' ? 'Nom ou activité' : 'Mot-clé'}<input value="${esc(r.q)}" placeholder="${r.source === 'annuaire' ? 'ex : pharmacie, garage…' : 'facultatif'}" oninput="recherche.q=this.value"></label>
        ${r.source === 'osm' ? `<label class="p-check"><input type="checkbox" ${r.avecTel ? 'checked' : ''} onchange="recherche.avecTel=this.checked"> Avec téléphone</label>` : ''}
        <button class="btn btn-primary" ${chargement ? 'disabled' : ''}>${ico('search')} Chercher</button>
      </form>
      <p id="chargement" class="p-load">${esc(chargement)}</p>
      ${resultats.length ? `<div class="p-res-head"><b>${resultats.length} résultats</b> classés par score · ${nouveaux.length} pas encore dans votre liste
        <button type="button" class="btn btn-primary" onclick="ajouterMeilleurs(20)">Ajouter les 20 meilleurs</button></div>
        <div class="p-list">${resultats.slice(0, 200).map(p => `<div class="p-row res">
          ${badgeScore(p.score)}
          <span class="p-main"><b>${esc(p.nom)}</b><small>${chipSeg(p.segment)} ${esc(p.commune || '')}${p.creation ? ' · créée le ' + frDate(p.creation) : ''}${p.activite ? ' · ' + esc(String(p.activite).slice(0, 90)) : ''}</small></span>
          <span class="p-sig">${signaux(p)}</span>
          <span class="p-side">${enListe(p.id) ? '<span class="muted">Dans ma liste</span>' : `<button type="button" class="btn btn-sm" onclick="ajouter('${esc(p.id)}')">+ Ajouter</button>`}</span></div>`).join('')}</div>` : chargement ? '' : '<p class="muted">Choisissez une source puis « Chercher ». Les résultats sont classés du plus prometteur au moins prometteur.</p>'}
      <details class="p-manuel"><summary>${ico('users')} Ajouter un prospect rencontré (bouche-à-oreille, visite…)</summary>
        <form class="p-filtres" onsubmit="ajouterManuel(event)">
          <label>Nom de l’entreprise *<input name="nom" required></label><label>Prénom du contact<input name="prenom"></label>
          <label>Activité<input name="activite" placeholder="ex : boulangerie"></label>
          <label>Commune<select name="commune"><option value="">—</option>${COMMUNES.map(c => `<option>${esc(c[0])}</option>`).join('')}</select></label>
          <label>Téléphone<input name="tel" type="tel"></label><label>Email<input name="email" type="email"></label><label>Site internet<input name="site"></label>
          <button class="btn btn-primary">Ajouter</button></form></details>`;
  },
  liste() {
    const f = filtre, t = todayISO();
    let list = db.prospects.filter(p => (!f.email || p.email) && (!f.statut || p.statut === f.statut) && (!f.segment || p.segment === f.segment) && (!f.agence || agenceDe(p) === f.agence)
      && (!f.q || norm(`${p.nom} ${p.commune} ${p.tel} ${p.activite}`).includes(norm(f.q))));
    list.sort(f.tri === 'relance' ? (a, b) => (a.relance || '9999').localeCompare(b.relance || '9999') : f.tri === 'recent' ? (a, b) => (b.maj || '').localeCompare(a.maj || '') : (a, b) => b.score - a.score);
    const nb = k => db.prospects.filter(p => p.statut === k).length;
    return `<div class="p-pipe">${Object.entries(STATUTS).map(([k, s]) => `<button type="button" class="${f.statut === k ? 'on' : ''}" style="--c:${s.c}" onclick="filtre.statut=filtre.statut==='${k}'?'':'${k}';render()"><b>${nb(k)}</b>${s.nom}</button>`).join('')}</div>
      <div class="p-filtres">
        <label>Rechercher<input value="${esc(f.q)}" placeholder="nom, commune, téléphone" oninput="filtre.q=this.value;clearTimeout(window._fq);window._fq=setTimeout(render,300)"></label>
        <label>Activité<select onchange="filtre.segment=this.value;render()"><option value="">Toutes</option>${Object.entries(SEGMENTS).map(([k, s]) => `<option value="${k}" ${f.segment === k ? 'selected' : ''}>${s.nom}</option>`).join('')}</select></label>
        <label>Agence<select onchange="filtre.agence=this.value;render()"><option value="">Les deux</option>${Object.entries(AGENCES).map(([k, a]) => `<option value="${k}" ${f.agence === k ? 'selected' : ''}>${a.nom}</option>`).join('')}</select></label>
        <label>Trier par<select onchange="filtre.tri=this.value;render()">${Object.entries({ score: 'Score', relance: 'Date de relance', recent: 'Derniers modifiés' }).map(([k, l]) => `<option value="${k}" ${f.tri === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="p-check"><input type="checkbox" ${f.email ? 'checked' : ''} onchange="filtre.email=this.checked;render()"> Avec email seulement</label>
        <button type="button" class="btn" onclick="exporterCSV()">Exporter (Excel)</button>
      </div>
      <p class="muted">${list.length} prospect${list.length > 1 ? 's' : ''}${list.some(p => p.relance && p.relance <= t) ? ' · les relances dues sont en orange' : ''}</p>
      ${barreSel(list)}
      <div class="p-list">${list.map(p => ligneSel(p)).join('') || '<p class="muted">Aucun prospect ici.</p>'}</div>`;
  },
  carte() {
    setTimeout(dessinerCarte, 0);
    return `<div class="p-legende">${Object.entries(STATUTS).filter(([k]) => k !== 'stop').map(([k, s]) => `<span><i style="background:${s.c}"></i>${s.nom}</span>`).join('')}<span class="muted">· taille = score</span></div>
      <div id="carte" class="p-carte"></div><p class="muted small">© contributeurs OpenStreetMap. Les prospects sans adresse précise sont placés au centre de leur commune.</p>`;
  },
  envoyes() {
    const estEmail = h => /^Email envoyé/.test(h.t) || /^Email —/.test(h.t);
    const list = db.prospects.map(p => ({ p, envois: (p.historique || []).filter(estEmail) })).filter(x => x.envois.length)
      .sort((a, b) => b.envois.slice(-1)[0].d.localeCompare(a.envois.slice(-1)[0].d));
    const t = todayISO(), semaine = addDays(t, -7);
    const nb = list.reduce((s, x) => s + x.envois.length, 0);
    const rep = list.filter(x => x.p.repondu || ['interesse', 'rdv', 'client'].includes(x.p.statut));
    const aRelancer = list.filter(x => x.p.statut === 'contacte' && !x.p.repondu && x.p.relance && x.p.relance <= t && (x.p.etape || 0) < 3);
    const etat = p => estNoir(p) ? '<span class="p-lnoire">Liste noire</span>' : p.statut === 'stop' ? '<span class="p-late">STOP — ne plus contacter</span>' : p.repondu || ['interesse', 'rdv', 'client'].includes(p.statut) ? '<span class="p-ok">✓ A répondu</span>'
      : p.statut === 'sansrep' ? '<span class="muted">Sans réponse (séquence terminée)</span>' : p.relance ? (p.relance <= t ? '<span class="p-due">Relance due</span>' : `<span class="muted">Relance le ${frDay(p.relance)}</span>`) : '';
    return `<div class="g-stats p-kpi"><span><b>${list.length}</b> entreprises contactées par email</span><span><b>${nb}</b> emails envoyés</span>
        <span><b>${list.filter(x => x.envois.some(h => h.d.slice(0, 10) >= semaine)).length}</b> cette semaine</span><span><b>${rep.length}</b> réponses</span><span><b>${aRelancer.length}</b> à relancer</span></div>
      ${aRelancer.length ? `<div class="p-auto"><b>${ico('repeat')} Sans réponse</b><button type="button" class="btn btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="relancerTous()">Relancer ${aRelancer.length > 1 ? `les ${aRelancer.length} entreprises` : "l’entreprise"} sans réponse</button><span class="muted small">Relance polie, sans prix ; 3 messages au maximum.</span></div>` : ''}
      <p class="muted">Tous les emails, envoyés depuis cette page ou par la prospection automatique. Le détail complet est aussi dans l’onglet « Emails envoyés » du tableau Google.</p>
      ${barreSel(list.map(x => x.p), true)}
      <div class="tablewrap"><table class="admin-table p-envoyes"><thead><tr><th></th><th>Entreprise</th><th>Email</th><th>Envois</th><th>Dernier envoi</th><th>Suivi</th><th></th></tr></thead><tbody>
      ${list.map(({ p, envois }) => `<tr class="${selection.has(p.id) ? 'coche' : ''}"><td>${caseSel(p)}</td><td><button type="button" class="link" onclick="ouvrir('${esc(p.id)}')">${esc(p.nom)}</button><br><span class="muted small">${esc(p.commune || '')}${p.auto ? ' · automatique' : ''}</span></td>
        <td>${esc(p.email || p.emailInvalide || '')}</td><td>${envois.map(h => esc(h.t.replace(/^Email envoyé( \(automatique\))? — /, '').replace(/^Email — /, ''))).join(' → ')}</td>
        <td>${new Date(envois.slice(-1)[0].d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</td><td>${etat(p)}</td>
        <td class="p-act">${actionsEnvoi(p)}</td></tr>`).join('')
        || '<tr><td colspan="7" class="muted">Aucun email envoyé pour l’instant.</td></tr>'}</tbody></table></div>`;
  },
  reglages() {
    const r = db.reglages;
    return `<h2>Réglages</h2><div class="p-filtres">
        <label>Signature des messages<input value="${esc(r.signature)}" onchange="db.reglages.signature=this.value.trim()||'L’équipe IloTech';sauver()"></label>
        <label>Prospects à contacter par jour<input type="number" min="1" max="50" value="${r.parJour}" onchange="db.reglages.parJour=Math.max(1,+this.value||10);sauver()"></label>
        <label>Emails envoyés par jour au maximum<input type="number" min="1" max="60" value="${r.maxEmails || 25}" onchange="db.reglages.maxEmails=Math.min(60,Math.max(1,+this.value||25));sauver()"></label></div>
      <p class="muted small">Gmail autorise environ 100 emails par jour : restez autour de 25 pour que vos messages ne finissent pas en spam.</p>
      <h2>Prospection automatique</h2>
      <div class="p-auto-etat auto-etat">${autoHTML()}</div>
      <h2 id="listes">Liste noire et liste blanche</h2>
      ${listesHTML()}
      <h2>Partage entre Ducos et Le Robert</h2>
      ${!CONFIG.endpoint ? '<p class="notice">Le script Google n’est pas encore branché : vos prospects restent sur cet appareil. Une fois le moteur Google installé (README.txt), ils seront partagés automatiquement dans l’onglet « Prospects » du tableau.</p>'
        : cle ? `<p class="notice ok">Connecté : vos prospects sont partagés dans l’onglet « Prospects » du tableau Google. <button type="button" class="link" onclick="synchroniser()">Synchroniser maintenant</button></p>`
        : `<form class="g-row" onsubmit="event.preventDefault();cle=$('pCle').value.trim();try{localStorage.setItem('itGestionCle',cle)}catch(e){};synchroniser();render()"><input id="pCle" type="password" placeholder="Code de l’espace pro" autocomplete="current-password"><button class="btn btn-primary">Se connecter</button></form>`}
      <h2>Sauvegarde</h2><div class="actions left">
        <button type="button" class="btn" onclick="exporterCSV()">Exporter pour Excel (CSV)</button>
        <button type="button" class="btn" onclick="exporterJSON()">Télécharger une sauvegarde</button>
        <label class="btn">Restaurer une sauvegarde<input type="file" accept=".json" hidden onchange="importerJSON(this.files[0])"></label>
        <button type="button" class="btn g-danger" onclick="if(confirm('Effacer le cache OpenStreetMap ? Il sera rechargé à la prochaine recherche.')){localStorage.removeItem('itOsmCache');toast('Cache effacé')}">Recharger OpenStreetMap</button></div>
      <h2>Prospecter dans les règles</h2>
      <ul class="p-regles">
        <li><b>Uniquement des professionnels</b>, pour une offre liée à leur activité. Le démarchage des particuliers par email ou SMS demande leur accord préalable.</li>
        <li><b>Toujours dire d’où viennent les coordonnées</b> et <b>offrir de ne plus être contacté</b> : les messages préparés le font déjà.</li>
        <li><b>« Ne plus contacter »</b> : le prospect est mis de côté pour toujours et n’apparaît plus dans les recherches.</li>
        <li><b>Un refus = la liste noire</b> : « non merci », « pas intéressé », « STOP »… Le moteur les détecte et les y ajoute ; ajoutez-y aussi les refus reçus par téléphone.</li>
        <li>Pas plus de <b>3 messages</b> sans réponse (la séquence s’arrête toute seule), et pas d’envoi automatique en masse.</li>
        <li>Les entrepreneurs individuels sont des personnes : gardez seulement ce qui est utile et supprimez les prospects inactifs après 3 ans.</li>
      </ul>
      <p class="muted small">Sources : BODACC (DILA), Annuaire des entreprises (État), OpenStreetMap (© contributeurs, licence ODbL).</p>`;
  }
};

function render() {
  const n = db.prospects.length, rel = plan().relances.length;
  $('pTabs').innerHTML = [['jour', `Aujourd’hui${rel ? ` <em>${rel}</em>` : ''}`], ['trouver', 'Trouver des prospects'], ['emails', `✉ Envoyer des emails${aEnvoyer().length ? ` <em>${aEnvoyer().length}</em>` : ''}`], ['liste', `Mes prospects (${n})`], ['envoyes', 'Emails envoyés'], ['carte', 'Carte'], ['reglages', 'Réglages']]
    .map(([k, l]) => `<button type="button" class="${vue === k ? 'on' : ''}" onclick="setVue('${k}')">${l}</button>`).join('');
  $('pVue').innerHTML = bandeauConnexion() + (vue !== 'trouver' ? `<p id="chargement" class="p-load">${esc(chargement)}</p>` : '') + VUES[vue]();
  renderSync();
}
function setVue(v) { vue = v; render(); window.scrollTo(0, 0); }

/* ---------- Fiche prospect ---------- */
function canalOuvrir(id, c) { ouvrir(id); canal = c; renderFiche(); }
function ouvrir(id) { fiche = id; canal = 'whatsapp'; renderFiche(); const d = $('fiche'); if (!d.open) d.showModal(); }
function renderFiche() {
  const p = parId(fiche); if (!p) return;
  const m = messages(p), seg = SEGMENTS[p.segment] || SEGMENTS.autre, offre = p.offre || offreDe(p);
  const mobile = /^(0|596)?69[67]/.test(digits(p.tel).replace(/^00/, ''));
  const q = encodeURIComponent(`${p.nom.replace(/\s*\(.*\)$/, '')} ${p.commune || 'Martinique'}`);
  const etapes = ['1er message', 'Relance', 'Dernière relance', 'Séquence terminée'];
  const txt = canal === 'email' ? m.email.corps : m[canal];
  const actions = {
    whatsapp: mobile ? `<a class="btn btn-wa" target="_blank" rel="noopener" href="https://wa.me/${intl(p.tel)}?text=${encodeURIComponent(txt)}" onclick="setTimeout(()=>contacte('${esc(p.id)}','WhatsApp'),300)">${ico('chat')} Ouvrir WhatsApp avec ce message</a>` : '<p class="muted">WhatsApp : il faut un numéro de portable (0696 / 0697).</p>',
    sms: p.tel ? `<a class="btn" href="sms:+${intl(p.tel)}?body=${encodeURIComponent(txt)}" onclick="setTimeout(()=>contacte('${esc(p.id)}','SMS'),300)">Envoyer par SMS</a>` : '<p class="muted">Ajoutez un téléphone.</p>',
    email: p.email ? `<button type="button" class="btn btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="envoyerEmail('${esc(p.id)}')">Envoyer maintenant à ${esc(p.email)}</button><a class="btn" href="mailto:${esc(p.email)}?subject=${encodeURIComponent(m.email.sujet)}&body=${encodeURIComponent(txt)}" onclick="setTimeout(()=>contacte('${esc(p.id)}','Email'),300)">Ouvrir dans ma messagerie</a>`
      : p.site ? `<button type="button" class="btn btn-primary${scriptPret() ? '' : ' btn-off'}" onclick="analyser('${esc(p.id)}')">Chercher l’email sur son site</button>` : '<p class="muted">Ajoutez une adresse email (voir « Chercher sur Google » à droite).</p>',
    appel: p.tel ? `<a class="btn btn-primary" href="tel:+${intl(p.tel)}" onclick="setTimeout(()=>appeler('${esc(p.id)}'),300)">${ico('phone')} Appeler le ${esc(p.tel)}</a>` : '<p class="muted">Ajoutez un téléphone.</p>',
    visite: `<button type="button" class="btn" onclick="noter(parId('${esc(p.id)}'),'Visite sur place');if(parId('${esc(p.id)}').statut==='nouveau')parId('${esc(p.id)}').statut='contacte';sauver(parId('${esc(p.id)}'));renderFiche();render()">J’y suis passé</button>`
  };
  const champ = (k, label, type = 'text') => `<label>${label}<input type="${type}" value="${esc(p[k] || '')}" onchange="majChamp('${esc(p.id)}','${k}',this.value)"></label>`;
  $('fiche').innerHTML = `<div class="dialog-head"><h2>${badgeScore(p.score)} <span>${esc(p.nom)}</span></h2><button type="button" class="btn" onclick="$('fiche').close()">Fermer</button></div>
    ${estNoir(p) ? '<p class="notice">Liste noire : cette entreprise ne doit plus être contactée.</p>' : ''}
    <p class="p-sub">${chipSeg(p.segment)} ${esc(p.commune || '')} · Agence ${AGENCES[agenceDe(p)].nom}${p.creation ? ` · créée le ${frDate(p.creation)}` : ''}${p.effectif ? ' · ' + EFFECTIFS[p.effectif] : ''}</p>
    <div class="p-statuts">${Object.entries(STATUTS).map(([k, s]) => `<button type="button" class="${p.statut === k ? 'on' : ''}" style="--c:${s.c}" onclick="setStatut('${esc(p.id)}','${k}')">${s.nom}</button>`).join('')}</div>
    <div class="p-fiche">
      <section>
        <h3>Contacter <span class="muted">· ${etapes[Math.min(p.etape || 0, 3)]}${p.relance ? ` · relance prévue ${frDay(p.relance)}` : ''}</span></h3>
        ${(() => { const r = aVerifier(p); return r.length ? `<div class="p-verif"><b>⚠ Avant d’envoyer</b><ul>${r.map(x => `<li>${esc(x)}</li>`).join('')}</ul>${p.analyse?.titre || p.analyse?.description ? `<p class="muted small">Son site dit : « ${esc([p.analyse.titre, p.analyse.description].filter(Boolean).join(' — ').slice(0, 220))} »</p>` : ''}<div class="actions left">${p.site ? `<a class="btn btn-sm" href="${esc(/^https?:/i.test(p.site) ? p.site : 'https://' + p.site)}" target="_blank" rel="noopener">Voir son site</a>` : ''}<button type="button" class="btn btn-sm" onclick="majChamp('${esc(p.id)}','verifie',true)">✓ J’ai vérifié, le message est adapté</button><button type="button" class="btn btn-sm g-danger" onclick="setStatut('${esc(p.id)}','perdu')">Pas une cible</button></div></div>` : ''; })()}
        <div class="g-tabs p-canaux">${[['whatsapp', 'WhatsApp'], ['sms', 'SMS'], ['email', 'Email'], ['appel', 'Script d’appel'], ['visite', 'Visite']].map(([k, l]) => `<button type="button" class="${canal === k ? 'on' : ''}" onclick="canal='${k}';renderFiche()">${l}</button>`).join('')}</div>
        ${canal === 'email' ? `<label class="p-lab">Objet<input id="fSujet" value="${esc(m.email.sujet)}"></label>` : ''}
        <textarea id="fMsg" class="p-msg ${canal === 'appel' || canal === 'visite' ? 'script' : ''}" ${canal === 'appel' || canal === 'visite' ? 'readonly' : ''}>${esc(txt)}</textarea>
        <div class="actions left">${actions[canal]}</div>
        <p class="muted small">Le message est écrit pour ce prospect : relisez-le, modifiez-le si besoin. Après l’envoi, la relance est programmée toute seule (J+3, puis J+10).</p>
        <h3>Notes</h3>
        <div class="g-row"><input id="fNote" placeholder="ex : rappeler mardi, gérante = Mme X…"><button type="button" class="btn" onclick="ajouterNote('${esc(p.id)}')">Ajouter</button></div>
        <ul class="p-notes">${[...(p.notes || []).map(n => ({ ...n, note: true })), ...(p.historique || [])].sort((a, b) => b.d.localeCompare(a.d)).map(n => `<li class="${n.note ? 'note' : ''}"><small>${new Date(n.d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small> ${esc(n.t)}</li>`).join('')}</ul>
      </section>
      <section>
        <h3>Pourquoi ${p.score} points</h3>
        <ul class="p-raisons">${(p.raisons || []).map(([v, t]) => `<li class="${v > 0 ? 'plus' : v < 0 ? 'moins' : ''}"><b>${v > 0 ? '+' : ''}${v}</b> ${esc(t)}</li>`).join('')}</ul>
        <h3>Offre conseillée <span class="muted">· ≈ ${eur(offre.valeur)}</span></h3>
        <div class="p-offre">${offre.pack ? `<span class="p-chip pk">Formule « ${esc(PACKS.find(x => x.id === offre.pack).nom)} »</span>` : ''}${offre.services.map(id => { const s = SERVICES.find(x => x.id === id); return `<span class="p-chip">${ico(s.icon)} ${esc(s.nom)}</span>`; }).join('')}</div>
        <p class="p-conseil">${ico('phone')} Meilleur moment pour appeler : <b>${seg.appel}</b></p>
        <h3>Coordonnées</h3>
        <div class="p-champs">${champ('prenom', 'Prénom du contact')}${champ('tel', 'Téléphone', 'tel')}${champ('email', 'Email', 'email')}${champ('site', 'Site internet')}
          <label class="p-check"><input type="checkbox" ${p.sansSite ? 'checked' : ''} onchange="majChamp('${esc(p.id)}','sansSite',this.checked)"> N’a pas de site internet</label>
          <label>Activité<select onchange="majChamp('${esc(p.id)}','segment',this.value)">${Object.entries(SEGMENTS).map(([k, s]) => `<option value="${k}" ${p.segment === k ? 'selected' : ''}>${s.nom}</option>`).join('')}</select></label>
          <label>Commune<select onchange="majChamp('${esc(p.id)}','commune',this.value)"><option value="">—</option>${COMMUNES.map(c => `<option ${normCommune(c[0]) === normCommune(p.commune) ? 'selected' : ''}>${esc(c[0])}</option>`).join('')}</select></label>
          <label>Relance le<input type="date" value="${esc(p.relance || '')}" onchange="majChamp('${esc(p.id)}','relance',this.value)"></label></div>
        ${p.site ? `<div class="p-analyse">${(() => {
          const a = p.analyse;
          if (!a) return `<button type="button" class="btn btn-sm${scriptPret() ? '' : ' btn-off'}" onclick="analyser('${esc(p.id)}')">${ico('search')} Analyser son site (email, téléphone, mobile)</button>`;
          if (!a.ok) return `<span class="p-ok ko">⚠ Le site ne s’ouvre plus (vérifié le ${frDate(a.quand)})</span> ${scriptPret() ? `<button type="button" class="link" onclick="analyser('${esc(p.id)}')">Réessayer</button>` : ''}`;
          const etat = (bon, oui, non) => `<span class="p-ok ${bon ? '' : 'ko'}">${bon ? '✓ ' + oui : '⚠ ' + non}</span>`;
          return `${etat(a.https, 'Sécurisé', 'Non sécurisé')}${etat(a.mobile, 'Adapté au mobile', 'Mal affiché sur mobile')}${a.annee ? etat(a.annee > new Date().getFullYear() - 3, 'À jour (' + a.annee + ')', 'Ancien (' + a.annee + ')') : ''}
            ${(a.emails || []).map(e => `<button type="button" class="p-chip" title="Utiliser cet email" onclick="majChamp('${esc(p.id)}','email','${esc(e)}')">@ ${esc(e)}</button>`).join('')}
            ${(a.tels || []).map(t => `<button type="button" class="p-chip" title="Utiliser ce numéro" onclick="majChamp('${esc(p.id)}','tel','${esc(t)}')">${ico('phone')} ${esc(t)}</button>`).join('')}`;
        })()}</div>` : ''}
        <div class="p-liens">
          <a href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Chercher sur Google</a>
          <a href="https://www.google.com/maps/search/${q}" target="_blank" rel="noopener">Google Maps</a>
          <a href="https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${encodeURIComponent(p.nom.replace(/\s*\(.*\)$/, ''))}&ou=${encodeURIComponent(p.commune || 'Martinique')}" target="_blank" rel="noopener">Pages Jaunes</a>
          <a href="https://www.facebook.com/search/top?q=${q}" target="_blank" rel="noopener">Facebook</a>
          ${p.siren ? `<a href="https://annuaire-entreprises.data.gouv.fr/entreprise/${p.siren}" target="_blank" rel="noopener">Fiche officielle</a>` : ''}
          ${p.site ? `<a href="${esc(/^https?:/i.test(p.site) ? p.site : 'https://' + p.site)}" target="_blank" rel="noopener">Voir son site</a>` : ''}</div>
        ${p.activite ? `<p class="muted small">Activité déclarée : ${esc(p.activite)}</p>` : ''}${p.horaires ? `<p class="muted small">Horaires : ${esc(p.horaires)}</p>` : ''}
        <p class="muted small">Source : ${SOURCES[p.source] || p.source}${p.adresse ? ' · ' + esc(p.adresse) : ''}</p>
        <div class="p-fiche-listes">
          <button type="button" class="btn btn-sm${estBlanc(p) ? ' on' : ''}" onclick="listeFiche('${esc(p.id)}','blanche')">${estBlanc(p) ? '✓ Sur la liste blanche (retirer)' : 'Liste blanche : prioritaire'}</button>
          <button type="button" class="btn btn-sm g-danger${estNoir(p) ? ' on' : ''}" onclick="listeFiche('${esc(p.id)}','noire')">${estNoir(p) ? '✓ Sur la liste noire (retirer)' : 'Liste noire : ne plus contacter'}</button></div>
        <button type="button" class="link g-danger-link" onclick="supprimer('${esc(p.id)}')">Supprimer ce prospect</button>
      </section></div>`;
  // garder les modifications du message pour le lien d'envoi
  const ta = $('fMsg');
  if (ta && !ta.readOnly) ta.addEventListener('input', () => {
    const a = $('fiche').querySelector('.actions a'); if (!a) return;
    const t = encodeURIComponent(ta.value);
    a.href = a.href.replace(/([?&](text|body)=)[^&]*/, '$1' + t);
    if (canal === 'email') a.href = a.href.replace(/subject=[^&]*/, 'subject=' + encodeURIComponent($('fSujet').value));
  });
}

/* ---------- Carte ---------- */
let carte;
async function dessinerCarte() {
  if (!window.L) {
    await new Promise((ok, ko) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s);
    }).catch(() => toast('Carte indisponible (connexion ?)', true));
  }
  const el = $('carte'); if (!el || !window.L) return;
  if (carte) { carte.remove(); carte = null; }
  carte = L.map(el).setView([14.64, -61.02], 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(carte);
  db.prospects.filter(p => p.statut !== 'stop').forEach(p => {
    let lat = p.lat, lon = p.lon;
    if (lat == null) { const c = CENTRES.find(x => normCommune(x[0]) === normCommune(p.commune)); if (!c) return; lat = c[1] + ((hash(p.id) % 100) - 50) / 9000; lon = c[2] + ((hash(p.id + 'x') % 100) - 50) / 9000; }
    L.circleMarker([lat, lon], { radius: 5 + p.score / 12, color: '#fff', weight: 1.5, fillColor: STATUTS[p.statut]?.c || '#64748b', fillOpacity: .9 })
      .addTo(carte).bindPopup(`<b>${esc(p.nom)}</b><br>${esc(SEGMENTS[p.segment]?.nom || '')} · ${p.score} pts<br><button type="button" onclick="ouvrir('${esc(p.id)}')">Ouvrir la fiche</button>`);
  });
}

/* ---------- Export / import ---------- */
function telecharger(nom, contenu, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([contenu], { type })); a.download = nom; a.click();
}
function exporterCSV() {
  const rows = [['Score', 'Nom', 'Statut', 'Activité', 'Commune', 'Agence', 'Téléphone', 'Email', 'Site', 'Créée le', 'Relance', 'Offre conseillée', 'Valeur estimée', 'Dernière note', 'Source']];
  db.prospects.slice().sort((a, b) => b.score - a.score).forEach(p => rows.push([p.score, p.nom, STATUTS[p.statut]?.nom, SEGMENTS[p.segment]?.nom, p.commune, AGENCES[agenceDe(p)].nom, p.tel, p.email, p.site, p.creation || '', p.relance || '',
    (p.offre?.services || []).map(id => SERVICES.find(s => s.id === id)?.nom).join(', '), p.offre?.valeur || '', (p.notes || []).slice(-1)[0]?.t || '', SOURCES[p.source] || p.source]));
  telecharger(`prospects-ilotech-${todayISO()}.csv`, '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}
function exporterJSON() { telecharger(`sauvegarde-prospects-${todayISO()}.json`, JSON.stringify(db), 'application/json'); }
async function importerJSON(file) {
  if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.prospects)) throw new Error('format');
    let n = 0;
    d.prospects.forEach(q => { const p = parId(q.id); if (!p) { db.prospects.push(q); n++; dirty.add(q.id); } else if ((q.maj || '') > (p.maj || '')) { Object.assign(p, q); dirty.add(q.id); } });
    sauver(); toast(`${n} prospects ajoutés depuis la sauvegarde`); render();
  } catch (e) { toast('Fichier de sauvegarde non reconnu', true); }
}

/* ---------- Démarrage ---------- */
db.prospects.forEach(p => { Object.assign(p, scorer(p)); if (!p.offre) p.offre = offreDe(p); });
render();
synchroniser();
