/* NEXORA — noyau : session, entreprises, droits, mise en page, routeur, composants (fenêtres, palette de commandes, thème).
   Les modules (accueil.js, crm.js, ventes.js, erp.js, reglages.js) déclarent leurs pages dans NX.pages. Toutes les règles sont aussi vérifiées par la base (nexora.sql). */
'use strict';
if (window.top !== window.self) { try { window.top.location = window.location.href; } catch (e) { document.documentElement.style.display = 'none'; } }

const CFG = window.KAZ_CONFIG || {};
const PRET = !!(CFG.url && CFG.cle && window.supabase);
const sb = PRET ? window.supabase.createClient(CFG.url, CFG.cle, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } }) : null;
// « Mot de passe oublié » : lien en flux implicite (les jetons voyagent dans le lien). Avec le flux PKCE de `sb`, il faudrait ouvrir l'email dans le
// navigateur et sur le site qui ont fait la demande : depuis Gmail sur un autre appareil, ou vers Kaz An Nou qui reçoit les liens de toutes les applis, il échoue.
const lienMdp = (email, retour = 'https://immo.ilo-tech.com/?nouveau-mdp=1') => window.supabase.createClient(CFG.url, CFG.cle, { auth: { flowType: 'implicit',
  persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ilotech-lien-mdp' } }).auth.resetPasswordForEmail(email, { redirectTo: retour });
const NX = { pages: {}, publiques: {} };

// ---------------------------------------------------------------- outils
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const param = () => Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
const aller = h => { if (location.hash === h) rendre(); else location.hash = h; };
const lire = (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } };
const ecrire = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* stockage indisponible */ } };
const montant = (n, devise) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise || ORG?.devise || 'EUR' }).format(Number(n) || 0);
const nombre = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(Number(n) || 0);
const date = d => d ? new Date(String(d).length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const dateHeure = d => d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const aujourdhui = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const tag = ([c, t]) => `<span class="tag ${c}">${esc(t)}</span>`;
async function q(p) { const { data, error } = await p; if (error) throw error; return data; }
function toast(m, ko = false) { const t = document.createElement('div'); t.className = 'toast' + (ko ? ' ko' : ''); t.textContent = m; t.setAttribute('role', 'status'); document.body.appendChild(t); setTimeout(() => t.remove(), ko ? 6000 : 3200); }
function erreur(e) {
  const m = String(e?.message || e || '');
  if (/row-level security|permission denied/i.test(m)) return 'Action non autorisée avec votre rôle dans cette entreprise.';
  if (/violates foreign key.*nx_(devis|factures)/i.test(m) || /still referenced/i.test(m)) return 'Impossible : des devis ou factures y sont liés. Passez plutôt le client en « inactif ».';
  if (/Invalid login credentials/i.test(m)) return 'Email ou mot de passe incorrect.';
  if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec cet email.';
  if (/Password should be/i.test(m)) return 'Mot de passe trop court (8 caractères minimum).';
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Connexion impossible. Vérifiez votre internet.';
  if (/violates check constraint/i.test(m)) return 'Une valeur saisie n’est pas acceptée (format ou longueur).';
  return m || 'Une erreur est survenue.';
}
const vide = (titre, texte, bouton = '') => `<div class="vide"><b>${esc(titre)}</b>${texte ? `<p>${texte}</p>` : ''}${bouton}</div>`;
const tableau = (entetes, lignes, videHtml) => lignes.length ? `<div class="tab-boite"><table class="tab"><thead><tr>${entetes.map(h => `<th class="${h.startsWith('#') ? 'num' : ''}">${esc(h.replace(/^#/, ''))}</th>`).join('')}</tr></thead><tbody>${lignes.join('')}</tbody></table></div>` : `<div class="carte">${videHtml}</div>`;
const ICONES = {
  emails: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6',
  accueil: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', clients: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  pipeline: 'M3 4h18M6 9h12M9 14h6M11 19h2', activites: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9', devis: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  factures: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6', catalogue: 'M21 8l-9-5-9 5 9 5zM3 8v8l9 5 9-5V8M12 13v8', reglages: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  equipe: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1', journal: 'M12 8v4l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', paiements: 'M2 7h20v12H2zM2 11h20M6 15h4',
  depenses: 'M4 4h16v16H4zM8 9h8M8 13h5M15 16l2 2 3-4', fournisseurs: 'M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M9 20v-6h6v6', stock: 'M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7M12 11v10',
  tresorerie: 'M3 10h18M5 10V20M9 10v10M15 10v10M19 10v10M2 20h20M12 3l10 5H2z', abonnements: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  relances: 'M22 12h-4l-3 9L9 3l-3 9H2', employes: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.9', rapports: 'M3 3v18h18M7 15l4-4 3 3 6-7',
  planning: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M8 13h3M13 13h3M8 17h3', moi: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0',
  cloche: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0'
};
const icone = n => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[n]}"/></svg>`;

// ---------------------------------------------------------------- session, entreprises, droits
let moi = null, profil = null, ORGS = [], ORG = null, ROLE = null;
let ERP = false;   // erp.sql installé dans la base (sinon les modules de gestion restent masqués)
let PORTAIL = false;   // espace_client.sql installé (espace client : signature, échéancier, paiements déclarés)
let COMM = false;  // communication.sql installé (emails de l'entreprise, comparatif des devis)
let EQ = false;    // equipe_devis.sql installé (catégories de lignes, compte employé, planning, notifications, vue « Mon entreprise »)
let FICHES = new Set();   // entreprises où mon compte est relié à une fiche employé (menu « Mon espace »)
const ROLES = { proprietaire: 'Propriétaire', admin: 'Administrateur', commercial: 'Commercial', comptable: 'Comptable', lecteur: 'Lecteur', employe: 'Employé' };
const DROITS = { crm: ['proprietaire', 'admin', 'commercial'], ventes: ['proprietaire', 'admin', 'commercial'], facturation: ['proprietaire', 'admin', 'comptable'],
  catalogue: ['proprietaire', 'admin', 'commercial', 'comptable'], equipe: ['proprietaire', 'admin'], parametres: ['proprietaire', 'admin'],
  achats: ['proprietaire', 'admin', 'comptable'], stock: ['proprietaire', 'admin', 'commercial', 'comptable'], tresorerie: ['proprietaire', 'admin', 'comptable'], rh: ['proprietaire', 'admin'] };
// affichage seulement : la base vérifie aussi. Un employé ne lit rien de l'entreprise : il n'a que « Mon espace ».
const peut = d => !!ROLE && (d === 'lire' ? ROLE !== 'employe' : (['achats', 'stock', 'tresorerie', 'rh'].includes(d) ? ERP : true) && (DROITS[d] || []).includes(ROLE));

async function chargerSession() {
  moi = null; profil = null; ORGS = []; ORG = null; ROLE = null; if (!PRET) return;
  moi = (await sb.auth.getSession()).data.session?.user || null;
  if (!moi) return;
  [profil, ORGS] = await Promise.all([q(sb.from('profiles').select('id, prenom, nom').eq('id', moi.id).maybeSingle()), chargerOrgs()]);
  choisirOrg(lire('nxOrg'));
}
async function chargerOrgs() {
  const [l, f] = await Promise.all([q(sb.from('nx_membres').select('role, org_id, nx_organisations(*)').eq('user_id', moi.id)), EQ ? q(sb.rpc('nx_mes_fiches')).catch(() => []) : []]);
  FICHES = new Set(f || []);
  return l.filter(x => x.nx_organisations).map(x => ({ ...x.nx_organisations, role: x.role })).sort((a, b) => a.demo - b.demo || a.nom.localeCompare(b.nom));
}
function choisirOrg(id) {
  ORG = ORGS.find(o => o.id === id) || ORGS[0] || null; ROLE = ORG?.role || null; ecrire('nxOrg', ORG?.id || null);
}
async function rechargerOrgs(id) { ORGS = await chargerOrgs(); choisirOrg(id || ORG?.id); }

// ---------------------------------------------------------------- fenêtres et palette
function modale(titre, corps, { valider = 'Enregistrer', large = false } = {}) {
  return new Promise(ok => {
    const v = document.createElement('div'); v.className = 'voile';
    v.innerHTML = `<div class="modale" role="dialog" aria-modal="true" aria-label="${esc(titre)}" style="${large ? 'width:min(860px,100%)' : ''}"><h2>${esc(titre)}</h2>
      <form class="f" novalidate>${corps}<div class="actions" style="justify-content:flex-end"><button type="button" class="btn" data-x>Annuler</button><button class="btn btn-p">${esc(valider)}</button></div></form></div>`;
    document.body.appendChild(v);
    const f = $('form', v), fermer = r => { v.remove(); document.removeEventListener('keydown', echap); ok(r); };
    const echap = e => { if (e.key === 'Escape') fermer(null); };
    document.addEventListener('keydown', echap);
    v.addEventListener('click', e => { if (e.target === v || e.target.closest('[data-x]')) fermer(null); });
    f.addEventListener('submit', e => { e.preventDefault(); if (!f.reportValidity()) return; fermer(Object.fromEntries(new FormData(f))); });
    setTimeout(() => $('input:not([type=hidden]),select,textarea', f)?.focus(), 30);
  });
}
const confirmer = async (titre, texte, valider = 'Confirmer') => (await modale(titre, `<p style="margin:0">${texte}</p>`, { valider })) !== null;

const COMMANDES = () => [['#/', 'Tableau de bord', 'accueil'], ['#/clients', 'Clients et prospects', 'clients'], ['#/pipeline', 'Pipeline commercial', 'pipeline'], ['#/activites', 'Activités et rappels', 'activites'],
  ...(COMM ? [['#/emails', 'Emails et modèles', 'emails']] : []), ['#/devis', 'Devis', 'devis'], ['#/factures', 'Factures et avoirs', 'factures'], ['#/catalogue', 'Catalogue', 'catalogue'], ['#/reglages', 'Réglages de l’entreprise', 'reglages'],
  ['#/equipe', 'Équipe et rôles', 'equipe'], ['#/journal', 'Journal d’activité', 'journal'], ['#/clients?nouveau=1', 'Nouveau client', 'clients'], ['#/devis/nouveau', 'Nouveau devis', 'devis'], ['#/factures/nouvelle', 'Nouvelle facture', 'factures'],
  ...(ERP ? [['#/abonnements', 'Abonnements (factures récurrentes)', 'abonnements'], ['#/relances', 'Relances des impayés', 'relances'], ['#/depenses', 'Dépenses et achats', 'depenses'], ['#/fournisseurs', 'Fournisseurs', 'fournisseurs'],
  ['#/stock', 'Stock et inventaire', 'stock'], ['#/tresorerie', 'Trésorerie', 'tresorerie'], ['#/rapports', 'Rapports et TVA', 'rapports'], ['#/employes', 'Employés et absences', 'employes']] : []),
  ...(EQ && peut('rh') ? [['#/planning', 'Planning de l’équipe', 'planning']] : []), ...(EQ && FICHES.has(ORG?.id) ? [['#/moi', 'Mon espace : planning et congés', 'moi']] : [])];
async function palette() {
  if (!ORG || ROLE === 'employe' || $('.palette')) return;
  const p = document.createElement('div'); p.className = 'palette';
  p.innerHTML = `<div class="boite" role="dialog" aria-label="Recherche et commandes"><input placeholder="Rechercher un client, un devis, une facture, ou une page…" aria-label="Recherche"><ul></ul></div>`;
  document.body.appendChild(p);
  const champ = $('input', p), liste = $('ul', p); let sel = 0, res = [], minu = null;
  const dessiner = () => { liste.innerHTML = res.map((r, i) => `<li><a href="${r[0]}" class="${i === sel ? 'sel' : ''}">${r[2] ? icone(r[2]) : ''}<span>${esc(r[1])}</span><small>${esc(r[3] || '')}</small></a></li>`).join('') || '<li class="vide">Aucun résultat</li>'; };
  const chercher = async () => {
    const t = champ.value.trim(), m = t.toLowerCase();
    res = COMMANDES().filter(c => !m || c[1].toLowerCase().includes(m)).map(c => [...c, 'Page']);
    if (t.length >= 2) {
      const motif = `%${t.replace(/[%_,()]/g, ' ')}%`;
      const [c, d, f] = await Promise.all([q(sb.from('nx_clients').select('id, nom, ville').eq('org_id', ORG.id).ilike('nom', motif).limit(6)).catch(() => []),
        q(sb.from('nx_devis').select('id, numero, objet').eq('org_id', ORG.id).ilike('numero', motif).limit(4)).catch(() => []),
        q(sb.from('nx_factures').select('id, numero, objet, type').eq('org_id', ORG.id).ilike('numero', motif).limit(4)).catch(() => [])]);
      res = [...c.map(x => [`#/clients/${x.id}`, x.nom, 'clients', x.ville || 'Client']), ...d.map(x => [`#/devis/${x.id}`, `${x.numero} ${x.objet}`, 'devis', 'Devis']),
        ...f.map(x => [`#/factures/${x.id}`, `${x.numero} ${x.objet}`, 'factures', x.type === 'avoir' ? 'Avoir' : 'Facture']), ...res];
    }
    sel = 0; dessiner();
  };
  const fermer = () => { p.remove(); document.removeEventListener('keydown', clavier, true); };
  const clavier = e => {
    if (e.key === 'Escape') { e.preventDefault(); fermer(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, Math.min(res.length - 1, sel + (e.key === 'ArrowDown' ? 1 : -1))); dessiner(); }
    else if (e.key === 'Enter' && res[sel]) { e.preventDefault(); fermer(); aller(res[sel][0]); }
  };
  document.addEventListener('keydown', clavier, true);
  p.addEventListener('click', e => { if (e.target === p) fermer(); else if (e.target.closest('a')) fermer(); });
  champ.addEventListener('input', () => { clearTimeout(minu); minu = setTimeout(chercher, 180); });
  champ.focus(); chercher();
}
document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); } });

function theme(v) {
  if (v !== undefined) ecrire('nxTheme', v);
  const t = lire('nxTheme'); if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
theme();
const sombre = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';

// ---------------------------------------------------------------- mise en page
const MENU = () => ROLE === 'employe' ? [['moi', 'Mon espace', null, [['#/moi', 'Mon planning et mes congés', 'moi']]]] : [['', 'Accueil', 'accueil', [['#/', 'Tableau de bord', 'accueil']]],
  ['crm', 'Clients', null, [['#/clients', 'Clients', 'clients'], ['#/pipeline', 'Pipeline', 'pipeline'], ['#/activites', 'Activités', 'activites'], ...(COMM ? [['#/emails', 'Emails', 'emails']] : [])]],
  ['ventes', 'Ventes', null, [['#/devis', 'Devis', 'devis'], ['#/factures', 'Factures', 'factures'], ...(ERP ? [['#/abonnements', 'Abonnements', 'abonnements'], ['#/relances', 'Relances', 'relances']] : []), ['#/catalogue', 'Catalogue', 'catalogue']]],
  ...(ERP ? [['achats', 'Achats et stock', null, [['#/depenses', 'Dépenses', 'depenses'], ['#/fournisseurs', 'Fournisseurs', 'fournisseurs'], ['#/stock', 'Stock', 'stock']]]] : []),
  ...(peut('tresorerie') ? [['finances', 'Finances', null, [['#/tresorerie', 'Trésorerie', 'tresorerie'], ['#/rapports', 'Rapports et TVA', 'rapports']]]] : []),
  ['org', 'Entreprise', null, [...(peut('rh') ? [['#/employes', 'Employés', 'employes']] : []), ...(EQ && peut('rh') ? [['#/planning', 'Planning', 'planning']] : []),
    ...(EQ && FICHES.has(ORG?.id) ? [['#/moi', 'Mon espace', 'moi']] : []), ['#/equipe', 'Équipe', 'equipe'], ['#/reglages', 'Réglages', 'reglages'], ...(peut('equipe') ? [['#/journal', 'Journal', 'journal']] : [])]]];
function coquille() {
  const h = (location.hash || '#/').split('?')[0], on = p => (p === '#/' ? h === '#/' : h.startsWith(p)) ? 'on' : '';
  document.body.innerHTML = `<div class="app"><aside class="side" id="side" aria-label="Navigation">
      <a class="marque" href="#/"><img src="img/logo.svg" alt="">NEXORA</a>
      ${MENU().map(([, g, , l]) => `${g !== 'Accueil' ? `<div class="grp">${g}</div>` : ''}${l.map(([href, t, i]) => `<a class="it ${on(href)}" href="${href}">${icone(i)}${t}</a>`).join('')}`).join('')}
      <div class="bas-side">${esc(profil?.prenom || '')} ${esc(profil?.nom || '')}<br>${esc(ROLES[ROLE] || '')} · <button class="lien" id="deco" style="color:#C9D4E5">Se déconnecter</button></div></aside>
    <div class="main">${ORG?.demo ? `<div class="bandeau-demo">Entreprise de démonstration : les données sont fictives. <a class="btn btn-s" href="#/bienvenue">Créer ma vraie entreprise</a></div>` : ''}
      <header class="top"><button class="btn btn-i burger" id="burger" aria-label="Menu">☰</button>
        <select id="orgSel" aria-label="Entreprise">${ORGS.map(o => `<option value="${o.id}" ${o.id === ORG.id ? 'selected' : ''}>${esc(o.nom)}</option>`).join('')}<option value="+">+ Ajouter une entreprise</option></select>
        ${ROLE === 'employe' ? '' : '<button class="cherche" id="cherche">🔎 <span>Rechercher…</span><kbd>Ctrl K</kbd></button>'}<span class="espace"></span>
        ${EQ ? `<button class="btn btn-i cloche" id="cloche" aria-label="Notifications" aria-haspopup="dialog" aria-expanded="false">${icone('cloche')}<span class="pastille-n" hidden></span></button>` : ''}
        <button class="btn btn-i" id="themeBtn" aria-label="Changer de thème" title="Thème clair ou sombre">${sombre() ? '☀️' : '🌙'}</button></header>
      <main class="page" id="page"><div class="chargement">Chargement…</div></main></div></div>`;
  $('#orgSel').onchange = e => { if (e.target.value === '+') return aller('#/bienvenue'); choisirOrg(e.target.value); aller('#/'); rendre(); };
  if ($('#cherche')) $('#cherche').onclick = palette;
  notifsCloche();
  $('#burger').onclick = () => $('#side').classList.toggle('ouvert');
  $('#side').addEventListener('click', e => { if (e.target.closest('a')) $('#side').classList.remove('ouvert'); });
  $('#themeBtn').onclick = () => { theme(sombre() ? 'light' : 'dark'); $('#themeBtn').textContent = sombre() ? '☀️' : '🌙'; };
  $('#deco').onclick = async () => { await sb.auth.signOut(); await chargerSession(); aller('#/'); };
}
// notifications de l'appli (equipe_devis.sql) : pastille sur la cloche, liste au clic, marquées lues à l'ouverture
async function notifsCloche() {
  const b = $('#cloche'), org = ORG?.id; if (!b || !org) return;
  const l = await q(sb.from('nx_notifications').select('id, texte, lien, lu, created_at').eq('org_id', org).order('created_at', { ascending: false }).limit(15)).catch(() => []);
  if ($('#cloche') !== b || ORG?.id !== org) return;   // page ou entreprise changée entre-temps
  let n = l.filter(x => !x.lu).length; const p = $('.pastille-n', b);
  const marquer = () => { p.hidden = !n; p.textContent = n > 9 ? '9+' : String(n); b.setAttribute('aria-label', n ? `Notifications : ${n} non lue${n > 1 ? 's' : ''}` : 'Notifications'); };
  marquer();
  b.onclick = e => {
    e.stopPropagation(); if ($('.notifs')) return $('.notifs').remove();
    const d = document.createElement('div'); d.className = 'notifs'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Notifications');
    d.innerHTML = `<b class="notifs-t">Notifications</b>${l.length ? `<ul>${l.map(x => `<li><a href="${esc(x.lien || '#/')}" class="${x.lu ? '' : 'non-lu'}"><span>${esc(x.texte)}</span><small>${dateHeure(x.created_at)}</small></a></li>`).join('')}</ul>`
      : '<p class="muted petit">Aucune notification pour l’instant.</p>'}`;
    document.body.appendChild(d); b.setAttribute('aria-expanded', 'true');
    const fermer = () => { d.remove(); b.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', dehors); document.removeEventListener('keydown', echap); };
    const dehors = ev => { if (!d.contains(ev.target) || ev.target.closest('a')) fermer(); };
    const echap = ev => { if (ev.key === 'Escape') { fermer(); b.focus(); } };
    setTimeout(() => { document.addEventListener('click', dehors); document.addEventListener('keydown', echap); $('a', d)?.focus(); }, 0);
    if (n) { sb.rpc('nx_notifs_lues', { org }).then(() => { n = 0; l.forEach(x => { x.lu = true; }); marquer(); }, () => {}); }
  };
}

const vue = h => { const p = $('#page') || $('#app'); p.innerHTML = h; };
const entete = (titre, sous = '', boutons = '') => `<div class="titre-p"><div><h1>${titre}</h1>${sous ? `<p class="muted">${sous}</p>` : ''}</div><div class="actions">${boutons}</div></div>`;

// ---------------------------------------------------------------- routeur
async function rendre() {
  const h = (location.hash || '#/').split('?')[0], parts = h.split('/').slice(1), nom = parts[0] || '';
  window.scrollTo(0, 0); document.title = 'NEXORA — The Business Operating System';
  try {
    if (!PRET) { document.body.innerHTML = '<div class="carte-auth"><div class="carte"><h1>NEXORA</h1><p>Ouverture très bientôt.</p></div></div>'; return; }
    if (nom === 'invitation') return await NX.publiques.invitation(parts[1]);
    if (nom === 'client') return await NX.publiques.client();   // espace client : la même page, avec ou sans compte
    if (!moi) { const p = NX.publiques[nom] || NX.publiques['']; return await p(...parts.slice(1)); }
    if (!ORG || nom === 'bienvenue') return await NX.publiques.bienvenue();
    if (ROLE === 'employe' && nom !== 'moi') { history.replaceState(null, '', '#/moi'); return await rendre(); }   // un employé n'a que « Mon espace »
    coquille();
    const page = NX.pages[nom];
    if (!page) return vue(vide('Page introuvable', '', '<a class="btn" href="#/">Tableau de bord</a>'));
    await page(...parts.slice(1));
  } catch (e) {
    console.error(e);
    const html = `<div class="erreur-p"><h2>Oups</h2><p class="muted">${esc(erreur(e))}</p><a class="btn" href="#/">Retour</a></div>`;
    if ($('#page')) vue(html); else document.body.innerHTML = html;
  }
}
function demarrer() {
  window.addEventListener('hashchange', rendre);
  (async () => {
    if (PRET) {
      const existe = t => sb.from(t).select('id').limit(1).then(r => !r.error, () => false);   // modules installés dans la base
      [ERP, COMM, PORTAIL, EQ] = await Promise.all(['nx_fournisseurs', 'nx_modeles_email', 'nx_echeances', 'nx_creneaux'].map(existe));
      sb.auth.onAuthStateChange(ev => { if (ev === 'SIGNED_OUT') { moi = null; ORG = null; } }); await chargerSession().catch(e => console.error(e));
    }
    rendre();
  })();
}
document.addEventListener('DOMContentLoaded', demarrer);
