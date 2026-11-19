/* Sousou : la tontine entre proches. Un groupe cotise à chaque échéance, chacun reçoit la cagnotte à son tour.
   Sousou n'encaisse ni ne garde l'argent : il passe directement entre les membres ; l'appli organise et garde la trace.
   Les montants, les statuts et l'ordre des tours sont décidés par la base (sousou.sql : fonctions sou_*, droits par ligne) ; ce fichier les affiche.
   Base commune : commun/base.js (APP, pages, connexion, transitions). Tout est dans une fonction : aucun nom global en plus de APP. */
'use strict';

const APP = {
  nom: 'Sousou', titre: 'Sousou — la tontine entre proches', accueilConnecte: '#/', apresInscription: '#/', pourTel: 'que les membres de votre groupe puissent vous joindre',
  texteConnexion: 'Un seul compte pour Sousou, Woulib, EventPass et Kaz An Nou.',
  menu: () => [], pages: {}, racines: ['#/'],
  enteteRail: () => '<a class="rail-logo" href="#/" aria-label="Sousou, accueil">Sousou</a>',   // ordinateur : le logo est en haut du rail
  menuBas: () => [['#/', APP.icones().accueil, 'Mes tontines'], ['#/creer', APP.icones().plus, 'Créer'], ['#/avis', APP.icones().cloche, 'Avis', nbNotifs || 0],
    [moi ? '#/compte' : '#/connexion', APP.icones().compte, 'Profil']],
  ongletDe: h => {
    const p = h.split('?')[0];
    if (p === '#/creer') return '#/creer';
    if (p === '#/avis') return '#/avis';
    if (/^#\/(compte|connexion|inscription)/.test(p)) return moi ? '#/compte' : '#/connexion';
    return '#/';
  },
  parent: h => /^#\/(recap|engagement|attestation)\//.test(h) ? h.replace(/^#\/(recap|engagement|attestation)\//, '#/t/') : '#/'
};

(() => {
  const svg = (d, c = 'ic') => `<svg class="${c}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const IC = {
    accueil: svg('M12 4a3 3 0 1 0 0 .01M5 10a2.5 2.5 0 1 0 0 .01M19 10a2.5 2.5 0 1 0 0 .01M7 20a5 5 0 0 1 10 0M1.5 18a4 4 0 0 1 5-3.7M22.5 18a4 4 0 0 0-5-3.7'),
    plus: svg('M12 5v14M5 12h14'), cloche: svg('M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4'), compte: svg('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0'),
    retour: svg('M15 6l-6 6 6 6'), partage: svg('M12 3v12M7 8l5-5 5 5M5 14v6h14v-6'), croix: svg('M6 6l12 12M18 6L6 18'), coche: svg('M5 12l4 4 10-10'),
    fleche: svg('M5 12h14M13 6l6 6-6 6'), horloge: svg('M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'), alerte: svg('M12 8v5M12 17v.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z'),
    piece: svg('M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 9a4 4 0 1 0 0 6M7.5 11h5M7.5 13.5h5'),
    tel: svg('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'), bouclier: svg('M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'),
    cadeau: svg('M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-4-3s3-2 4 3c1-5 4-5 4-3s-2 3-4 3'), calendrier: svg('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'), msg: svg('M4 5h16v11H9l-5 4z'),
    enveloppe: svg('M3 6h18v12H3zM3 7l9 7 9-7')
  };
  const IC_D = { horloge: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', coche: 'M5 12l4 4 10-10', alerte: 'M12 8v5M12 17v.01M10.3 4l-8 14a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14a2 2 0 0 0-3.4 0z' };
  APP.icones = () => IC;

  // ---------------------------------------------------------------- confort de lecture (texte plus grand, contraste renforcé), gardé sur cet appareil
  const PREFS = { grand: 'sousou-grand', contraste: 'sousou-contraste' };
  const lirePref = k => { try { return localStorage.getItem(PREFS[k]) === '1'; } catch (e) { return false; } };
  const appliquerPrefs = () => { document.documentElement.toggleAttribute('data-grand', lirePref('grand')); document.documentElement.toggleAttribute('data-contraste', lirePref('contraste')); };
  const lireTheme = () => { try { return localStorage.getItem('sousou-theme') || 'auto'; } catch (e) { return 'auto'; } };
  const appliquerTheme = () => { const t = lireTheme(); if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; };
  appliquerPrefs(); appliquerTheme();
  document.addEventListener('click', e => {
    const th = e.target.closest('[data-theme-set]');
    if (th) { try { localStorage.setItem('sousou-theme', th.dataset.themeSet); } catch (x) { document.documentElement.dataset.theme = th.dataset.themeSet; } appliquerTheme(); document.querySelectorAll('[data-theme-set]').forEach(b => b.setAttribute('aria-pressed', String(b === th))); return; }
    const b = e.target.closest('[data-pref]'); if (!b) return;
    const k = b.dataset.pref, v = !lirePref(k);
    try { localStorage.setItem(PREFS[k], v ? '1' : '0'); } catch (x) { /* navigation privée : valable jusqu'à la fermeture */ document.documentElement.toggleAttribute(k === 'grand' ? 'data-grand' : 'data-contraste', v); }
    appliquerPrefs(); document.querySelectorAll(`[data-pref="${k}"]`).forEach(x => x.setAttribute('aria-pressed', String(v)));
  });
  const reglages = () => `<div class="reglages" role="group" aria-label="Confort de lecture"><button type="button" class="btn btn-sec btn-s" data-pref="grand" aria-pressed="${lirePref('grand')}">Texte plus grand</button><button type="button" class="btn btn-sec btn-s" data-pref="contraste" aria-pressed="${lirePref('contraste')}">Contraste renforcé</button></div>`;

  // les nouveautés du 2e lot (sousou2.sql) restent cachées tant que la base ne l'a pas : sou_version() absente = lot non installé
  let lot2 = null;   // la promesse est gardée : deux appels simultanés partagent la même réponse (appelé seulement une fois connecté)
  const lot2Pret = () => lot2 || (lot2 = q(sb.rpc('sou_version')).then(() => true, () => false));
  // 4e lot (sousou4.sql : renouveler, importer, engagement signé) : caché tant que sou_version() < 4
  let versionB = null;   // version de la base Sousou (0 si inconnue) : 4 = renouveler, importer, engagement ; 5 = remplacer un membre, double main
  const versionBase = () => versionB || (versionB = q(sb.rpc('sou_version')).then(v => Number(v) || 0, () => 0));
  const lot4Pret = () => versionBase().then(v => v >= 4), lot5Pret = () => versionBase().then(v => v >= 5), lot6Pret = () => versionBase().then(v => v >= 6);   // 6 = attestation pour la banque

  let minuteur = null, instantane = '';
  APP.quitter = h => {
    clearInterval(minuteur); minuteur = null; instantane = '';
    const a = document.getElementById('app'); if (a) a.oninput = a.onsubmit = a.onclick = a.onchange = null;   // réactions propres à une page
    document.body.dataset.page = h.split('?')[0].split('/')[1] || 'accueil';   // pied de page et écosystème seulement sur l'accueil
  };

  // ---------------------------------------------------------------- petits outils
  const aujourdhui = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const dansJours = n => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const jour = d => fmt(d + 'T12:00:00', { weekday: 'short', day: 'numeric', month: 'short' });
  const jourLong = d => fmt(d + 'T12:00:00', { day: 'numeric', month: 'long', year: 'numeric' });
  const rythme = p => p === 'mensuelle' ? 'mois' : 'semaine';
  const ini = n => (String(n || '?').trim()[0] || '?').toUpperCase();
  const STATUT = { preparation: ['gris', 'En préparation'], en_cours: ['ok', 'En cours'], terminee: ['info', 'Terminée'], annulee: ['ko', 'Annulée'] };
  const ETAT = { a_payer: ['horloge', 'À payer'], declaree: ['horloge', 'Déclarée, à confirmer'], confirmee: ['coche', 'Confirmée'], en_retard: ['alerte', 'En retard'] };
  const etat = s => `<span class="etat ${s}">${svg(IC_D[ETAT[s][0]], 'ic-s')}${ETAT[s][1]}</span>`;
  const tagStatut = s => tag(STATUT[s] || ['gris', s]);
  const dans = n => n < 0 ? 'dépassée' : n === 0 ? 'aujourd’hui' : n === 1 ? 'demain' : 'dans ' + n + ' jours';
  const pluriel = (n, un, plu) => `${n} ${n > 1 ? plu : un}`;
  const erreurPage = e => vue(`<div class="wrap sou"><div class="vide-etat"><h3>Un instant…</h3><p>${esc(erreur(e))}</p><a class="btn btn-p" href="#/">Retour à mes tontines</a></div></div>`);
  async function majNotifs() {
    if (!moi) return;
    try { nbNotifs = (await q(sb.from('notifs').select('id').eq('lu', false))).length; nav(); } catch (e) { /* le compteur reste tel quel */ }
  }
  // action sensible en deux temps : le premier appui demande confirmation sur le bouton lui-même (pas de fenêtre du navigateur)
  const doubleClic = b => { if (b.dataset.sur) return true; b.dataset.sur = '1'; b.dataset.txt = b.textContent; b.textContent = 'Confirmer : ' + b.dataset.txt; setTimeout(() => { if (b.isConnected && b.dataset.sur) { delete b.dataset.sur; b.textContent = b.dataset.txt; } }, 5000); return false; };

  // ---------------------------------------------------------------- connexion : email par défaut, numéro de téléphone dès que les SMS sont actifs
  // Le propriétaire activera le fournisseur SMS plus tard dans Supabase (docs/ACTIVER-SMS.md). Tant que ce n'est pas fait, l'email (base.js) reste le
  // chemin par défaut ; l'écran par numéro est prêt, il s'affiche tout seul quand Supabase annonce le téléphone actif (/auth/v1/settings),
  // ou derrière le lien discret « Bientôt : connexion par numéro » (qui retombe proprement sur l'email si l'envoi du SMS échoue).
  const PAYS = [['596', 'Martinique'], ['590', 'Guadeloupe'], ['594', 'Guyane'], ['262', 'La Réunion, Mayotte'], ['33', 'France'], ['32', 'Belgique'], ['41', 'Suisse'], ['1', 'Canada, États-Unis'], ['509', 'Haïti'], ['212', 'Maroc']];
  const lirePays = () => { try { return localStorage.getItem('sousou-pays') || '596'; } catch (e) { return '596'; } };
  const garderPays = p => { try { localStorage.setItem('sousou-pays', p); } catch (e) { /* tant pis */ } };
  const numE164 = (ind, saisie) => {   // « 0696 48 26 78 » + 596 -> +596696482678 ; « +33 6 12 34 56 78 » ou « 0033… » acceptés tels quels
    const brut = String(saisie || '').trim(), n = brut.replace(/\D/g, '');
    const x = /^(\+|00)/.test(brut) ? n.replace(/^00/, '') : ind + n.replace(/^0+/, '');
    return x.length >= 8 && x.length <= 15 ? '+' + x : '';
  };
  const telLisible = t => { const n = String(t || '').replace(/\D/g, ''), p = PAYS.find(x => n.startsWith(x[0])); return p ? '+' + p[0] + ' ' + n.slice(p[0].length).replace(/(\d{2})(?=\d)/g, '$1 ') : '+' + n; };
  const optionsPays = sel => PAYS.map(([i, n]) => `<option value="${i}" ${i === sel ? 'selected' : ''}>${esc(n)} (+${i})</option>`).join('');
  const smsIndispo = e => /phone_provider_disabled|sms_send_failed|provider_disabled|unsupported phone provider|phone.{0,20}(disabled|not enabled)|sms.{0,20}(fail|not)/i.test(`${e?.code || ''} ${e?.error_code || ''} ${e?.message || ''} ${e?.msg || ''}`);
  const msgAuth = e => {
    const t = `${e?.code || ''} ${e?.error_code || ''} ${e?.message || ''}`;
    if (/rate_limit|too many|429/i.test(t) || e?.status === 429) return 'Trop de demandes pour le moment. Patientez une minute puis réessayez.';
    if (/otp_expired|expired|invalid/i.test(t)) return 'Ce code n’est pas bon ou a expiré. Vérifiez-le, ou demandez-en un nouveau.';
    if (/phone|validation/i.test(t)) return 'Ce numéro ne semble pas valide. Vérifiez-le (sans l’indicatif, ou avec +).';
    return erreur(e);
  };
  let smsActif = null;   // promesse : Supabase annonce-t-il le téléphone actif ? (réponse publique, aucune clé secrète)
  const smsPret = () => smsActif || (smsActif = (PRET ? fetch(CFG.url + '/auth/v1/settings', { headers: { apikey: CFG.cle } }).then(r => r.json()).then(j => !!j?.external?.phone) : Promise.resolve(false)).catch(() => false));
  const retourApres = () => decodeURIComponent(param().retour || '') || '#/';
  async function bandeauInvitation() {
    const m = /rejoindre\?code=([A-Za-z0-9]+)/.exec(decodeURIComponent(param().retour || '')); if (!m) return '';
    try {
      const t = await q(sb.rpc('sou_invitation', { code_c: m[1] })); if (!t) return '';
      return `<div class="invit" id="invit"><small>Vous êtes invité(e)</small><b>${esc(t.nom)}</b><span>${esc(t.organisateur)} vous attend : ${eur(t.montant)} par ${rythme(t.periodicite)}, ${t.nb_membres} personnes, cagnotte de ${eur(t.cagnotte)}.</span></div>`;
    } catch (e) { return ''; }
  }
  const logoEntrer = (titre, sous) => `<div class="entrer-logo"><span class="rond">${IC.piece}</span><h1>${titre}</h1><p>${sous}</p></div>`;
  async function entrer(etat = {}) {
    if (moi) return aller(retourApres());
    const e = { ind: lirePays(), num: '', ...etat }, invit = await bandeauInvitation(), retour = encodeURIComponent(param().retour || '');
    const ecranTel = () => {
      vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Votre numéro', 'Nous vous envoyons un code par SMS. Pas de mot de passe à retenir.')}${invit}
        <form class="f" id="fTel" novalidate><label for="tPays" class="sr">Pays</label><div class="tel-champ"><select id="tPays" name="pays" aria-label="Pays">${optionsPays(e.ind)}</select>
        <input id="tNum" name="num" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="0696 12 34 56" value="${esc(e.num)}" aria-label="Numéro de téléphone"></div>
        <p class="muted petit" style="margin:0" id="tAide">Seulement pour vous envoyer le code et permettre à votre groupe de vous joindre.</p>
        <button class="btn btn-p btn-gros btn-plein" id="tGo">Recevoir le code</button></form>
        <div class="sous-actions"><a class="lien" href="#/connexion?mode=email&retour=${retour}">Utiliser mon email à la place</a></div>
        <p class="muted petit centre">En continuant, vous acceptez les <a href="cgu.html" target="_blank">conditions</a> et la <a href="confidentialite.html" target="_blank">confidentialité</a>.</p></div></div>`);
      $('#tNum').focus({ preventScroll: true });
      $('#fTel').addEventListener('submit', async ev => {
        ev.preventDefault(); e.ind = $('#tPays').value; e.num = $('#tNum').value; garderPays(e.ind);
        const t = numE164(e.ind, e.num); if (!t) { $('#tAide').textContent = 'Entrez votre numéro, par exemple 0696 12 34 56.'; $('#tAide').style.color = 'var(--erreur)'; return $('#tNum').focus(); }
        e.tel = t; const b = $('#tGo'); b.disabled = true; b.textContent = 'Envoi du code…';
        try { await q(sb.auth.signInWithOtp({ phone: t, options: { channel: 'sms', shouldCreateUser: true, data: { telephone: t } } })); ecranCode(); }
        catch (err) {
          if (smsIndispo(err)) return aller('#/connexion?mode=email&sms=off&retour=' + retour);   // fournisseur SMS pas activé : l'email prend le relais, avec un message honnête
          toast(msgAuth(err), true); b.disabled = false; b.textContent = 'Recevoir le code';
        }
      });
    };
    const ecranCode = () => {
      let reste = 30, envoi = false;
      vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Entrez le code', `Envoyé par SMS au <b>${esc(telLisible(e.tel))}</b>`)}${invit}
        <form class="f" id="fCode" novalidate><div class="code-cases" id="cases" role="group" aria-label="Code à 6 chiffres">${[0, 1, 2, 3, 4, 5].map(i => `<input inputmode="numeric" pattern="[0-9]*" maxlength="1" autocomplete="${i ? 'off' : 'one-time-code'}" aria-label="Chiffre ${i + 1} sur 6" data-i="${i}">`).join('')}</div>
        <p class="muted petit centre" id="cAide" role="status" style="margin:0">Le SMS arrive en quelques secondes.</p></form>
        <div class="sous-actions"><button class="lien" type="button" id="renvoi" disabled>Renvoyer le code (30 s)</button><button class="lien" type="button" id="autreNum">Changer de numéro</button></div></div></div>`);
      const cs = [...document.querySelectorAll('#cases input')], cases = $('#cases');
      const code = () => cs.map(c => c.value).join('');
      const remplir = txt => { const d = String(txt).replace(/\D/g, '').slice(0, 6); cs.forEach((c, i) => { c.value = d[i] || ''; c.classList.toggle('plein', !!c.value); }); cs[Math.min(d.length, 5)].focus(); if (d.length === 6) valider(); };
      const valider = async () => {
        if (envoi || code().length !== 6) return; envoi = true; $('#cAide').textContent = 'Vérification…';
        try {
          await q(sb.auth.verifyOtp({ phone: e.tel, token: code(), type: 'sms' })); await chargerMoi();
          if (!profil?.prenom) return ecranNom();
          toast('Bienvenue ' + profil.prenom + ' !'); aller(retourApres());
        } catch (err) {
          envoi = false; cases.classList.remove('ko'); void cases.offsetWidth; cases.classList.add('ko'); $('#cAide').textContent = msgAuth(err); $('#cAide').style.color = 'var(--erreur)';
          cs.forEach(c => { c.value = ''; c.classList.remove('plein'); }); cs[0].focus();
        }
      };
      cs.forEach((c, i) => {
        c.addEventListener('input', () => { const d = c.value.replace(/\D/g, ''); if (d.length > 1) return remplir(d); c.value = d; c.classList.toggle('plein', !!d); if (d && i < 5) cs[i + 1].focus(); if (code().length === 6) valider(); });
        c.addEventListener('keydown', ev => { if (ev.key === 'Backspace' && !c.value && i) { cs[i - 1].value = ''; cs[i - 1].classList.remove('plein'); cs[i - 1].focus(); } if (ev.key === 'ArrowLeft' && i) cs[i - 1].focus(); if (ev.key === 'ArrowRight' && i < 5) cs[i + 1].focus(); });
        c.addEventListener('paste', ev => { ev.preventDefault(); remplir((ev.clipboardData || window.clipboardData).getData('text')); });
        c.addEventListener('focus', () => c.select());
      });
      cs[0].focus({ preventScroll: true });
      const r = $('#renvoi');
      clearInterval(minuteur); minuteur = setInterval(() => { reste--; if (reste > 0) r.textContent = `Renvoyer le code (${reste} s)`; else { clearInterval(minuteur); r.disabled = false; r.textContent = 'Renvoyer le code'; } }, 1000);
      r.addEventListener('click', async () => {
        r.disabled = true;
        try { await q(sb.auth.signInWithOtp({ phone: e.tel, options: { channel: 'sms', shouldCreateUser: true } })); toast('Nouveau code envoyé.'); ecranCode(); } catch (err) { toast(msgAuth(err), true); r.disabled = false; }
      });
      $('#autreNum').addEventListener('click', () => { clearInterval(minuteur); ecranTel(); });
    };
    const ecranNom = () => {
      vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Comment vous appelez-vous ?', 'Votre groupe verra votre prénom, rien d’autre.')}${invit}
        <form class="f" id="fNom"><label>Prénom<input name="prenom" required maxlength="60" autocomplete="given-name" style="min-height:56px;font-size:18px"></label>
        <label>Nom <span class="aide">(facultatif : seule l’initiale est montrée)</span><input name="nom" maxlength="60" autocomplete="family-name" style="min-height:56px;font-size:18px"></label>
        <label class="case-ok"><input type="checkbox" name="ok" required> <span>J’ai 15 ans ou plus et j’accepte les <a href="cgu.html" target="_blank">conditions</a> et la <a href="confidentialite.html" target="_blank">confidentialité</a>.</span></label>
        <button class="btn btn-p btn-gros btn-plein">C’est parti</button></form></div></div>`);
      $('#fNom [name=prenom]').focus({ preventScroll: true });
      $('#fNom').addEventListener('submit', async ev => {
        ev.preventDefault(); const d = Object.fromEntries(new FormData(ev.target)), b = ev.target.querySelector('button'); b.disabled = true;
        try {
          await q(sb.from('profiles').update({ prenom: d.prenom.trim(), nom: (d.nom || '').trim() }).eq('id', moi.id));
          sb.auth.updateUser({ data: { prenom: d.prenom.trim(), nom: (d.nom || '').trim(), quinze_ans: true } }).catch(() => {});   // la déclaration d'âge suit le compte
          await chargerMoi(); toast('Bienvenue ' + profil.prenom + ' !'); aller(retourApres());
        } catch (err) { toast(erreur(err), true); b.disabled = false; }
      });
    };
    ecranTel();
  }
  // email (base.js) : chemin par défaut tant que les SMS ne sont pas actifs ; message honnête quand l'envoi du SMS vient d'échouer
  const connexionEmail = pageConnexion, inscriptionEmail = pageInscription;
  async function pageEmail() {
    connexionEmail();
    const f = $('.carte-f'); if (!f) return;
    const off = param().sms === 'off', retour = encodeURIComponent(param().retour || ''), invit = await bandeauInvitation();
    if (!$('.carte-f')) return;
    f.insertAdjacentHTML('afterbegin', `<div class="entrer-logo"><span class="rond">${IC.piece}</span></div>${invit}${off ? '<div class="note-sms" role="status"><b>La connexion par numéro n’est pas encore ouverte.</b> Sousou ne peut pas envoyer de SMS pour l’instant : connectez-vous avec votre email, c’est aussi simple.</div>' : ''}`);
    const a = f.querySelector('a[href="#/inscription"]'); if (a) a.href = '#/inscription?mode=email' + (retour ? '&retour=' + retour : '');
    if (!off) f.insertAdjacentHTML('beforeend', `<p class="centre petit"><a class="lien" href="#/connexion?mode=tel&retour=${retour}">Bientôt : connexion par numéro</a></p>`);
  }
  async function pageInscriptionSou() {
    inscriptionEmail();
    const f = $('.carte-f'); if (!f) return;
    const invit = await bandeauInvitation(); if (!$('.carte-f')) return;
    f.insertAdjacentHTML('afterbegin', `<div class="entrer-logo"><span class="rond">${IC.piece}</span></div>${invit}`);
  }
  pageConnexion = async () => { const m = param().mode; if (m === 'tel') return entrer(); if (m === 'email') return pageEmail(); return (await smsPret()) ? entrer() : pageEmail(); };
  pageInscription = async () => { if (!moi && param().mode !== 'email' && (await smsPret())) return aller('#/connexion?retour=' + encodeURIComponent(param().retour || '')); return pageInscriptionSou(); };

  // ---------------------------------------------------------------- accueil
  async function accueilVisiteur() {
    const tel = await smsPret(), go = tel ? '#/connexion' : '#/inscription';
    vue(`<div class="wrap sou"><section class="hero-s"><span class="rond">${IC.piece}</span><h1>Votre tontine, sans cahier ni prise de tête</h1>
      <p>Un groupe de proches cotise à chaque échéance et chacun reçoit la cagnotte à son tour. Sousou garde l’ordre, les comptes et les rappels.</p>
      <div class="actions-h"><a class="btn btn-p btn-gros btn-plein" href="${go}">Commencer, c’est gratuit</a><a class="btn btn-sec btn-plein" href="#/connexion">J’ai déjà un compte</a></div></section>
      <section class="carte"><h2>Comment ça marche</h2><ol class="etapes-c"><li><span><b>On forme un groupe</b><span>Vous choisissez la cotisation et le nombre de membres, puis vous envoyez l’invitation par WhatsApp.</span></span></li>
        <li><span><b>Chacun verse à chaque échéance</b><span>Directement au bénéficiaire du tour (virement, espèces…). Chacun le déclare d’un glissement du doigt.</span></span></li>
        <li><span><b>Un membre reçoit la cagnotte</b><span>À chaque tour, jusqu’à ce que tout le monde ait reçu la sienne. Rien n’est gagné ni perdu en intérêts.</span></span></li></ol>
        <p style="margin:12px 0 0"><a href="#/aide">Voir un exemple et les risques</a></p></section>
      <div class="avert"><b>Sousou ne touche jamais à l’argent</b> : il passe directement entre vous. Une tontine repose sur la confiance : ne vous engagez qu’avec des personnes que vous connaissez.</div></div>`);
  }
  async function accueil() {
    if (!moi) return accueilVisiteur();
    attente();
    const l = await q(sb.rpc('sou_mes_tontines'));
    const dois = l.reduce((s, x) => s + Number(x.je_dois), 0), recoit = l.reduce((s, x) => s + Number(x.on_me_doit), 0);
    const carte = x => {
      const enCours = x.statut === 'en_cours', fait = enCours ? Math.round(100 * (x.tour_actuel - 1) / x.nb_membres) : 0;
      return `<a class="t-carte" href="#/t/${x.id}"><div class="t-tete"><span class="t-ico" aria-hidden="true">${x.objectif_emoji ? esc(x.objectif_emoji) : IC.accueil}</span><b class="t-nom">${esc(x.nom)}</b>${tagStatut(x.statut)}</div>
        ${x.objectif ? `<div class="t-sous">Objectif : <b>${esc(x.objectif)}</b></div>` : ''}
        <div class="t-sous">${eur(x.montant)} par ${rythme(x.periodicite)} · ${x.nb_membres} membres · cagnotte ${eur(x.montant * x.nb_membres)}</div>
        ${x.statut === 'preparation' ? `<div class="t-sous">${x.mes_parts != null ? `${x.inscrits} place${x.inscrits > 1 ? 's' : ''} prise${x.inscrits > 1 ? 's' : ''}` : `${x.inscrits} inscrit${x.inscrits > 1 ? 's' : ''}`} sur ${x.nb_membres}${x.role === 'organisateur' ? ' · à vous de démarrer quand le groupe est prêt' : ' · en attente du démarrage'}</div>` : ''}
        ${enCours ? `<span class="mini-prog" role="img" aria-label="Tour ${x.tour_actuel} sur ${x.nb_membres}"><i style="width:${fait}%"></i></span>
          <div class="t-sous">Tour ${x.tour_actuel}/${x.nb_membres} : ${x.tour_pour_moi ? '<b>c’est votre tour</b>' : 'pour <b>' + esc(x.tour_beneficiaire) + '</b>'} · échéance ${esc(jour(x.tour_echeance))}</div>` : ''}
        ${enCours && !x.tour_pour_moi && x.mon_tour_jours != null ? `<div class="t-sous">Votre tour (n° ${x.mon_tour}) : <b>${dans(x.mon_tour_jours)}</b></div>` : ''}
        <div class="t-etat">${Number(x.en_retard) > 0 ? `<span class="alerte-t ko">En retard : à verser dès que possible</span>` : Number(x.je_dois) > 0 && x.tour_jours != null && x.tour_jours <= 3 ? `<span class="alerte-t">Échéance ${dans(x.tour_jours)}</span>` : ''}${Number(x.je_dois) > 0 ? `<span class="alerte-t">À verser : ${eur(x.je_dois)}</span>` : ''}${Number(x.on_me_doit) > 0 ? `<span class="alerte-t ok">On vous doit ${eur(x.on_me_doit)}</span>` : ''}
          ${x.a_confirmer > 0 ? `<span class="alerte-t">${pluriel(x.a_confirmer, 'cotisation à confirmer', 'cotisations à confirmer')}</span>` : ''}</div></a>`;
    };
    const actives = l.filter(x => x.statut === 'preparation' || x.statut === 'en_cours'), finies = l.filter(x => x.statut === 'terminee' || x.statut === 'annulee'), enCours = actives.filter(x => x.statut === 'en_cours');
    // « ce que je dois, ce que je vais recevoir, quand » : tout vient de la base (sou_mes_tontines) ; ici on choisit seulement quoi mettre en avant
    const aVerser = enCours.filter(x => Number(x.je_dois) > 0 && x.tour_jours != null).sort((a, b) => a.tour_jours - b.tour_jours)[0];
    const monTour = enCours.filter(x => !x.tour_pour_moi && x.mon_tour_jours != null).sort((a, b) => a.mon_tour_jours - b.mon_tour_jours)[0];
    const faire = enCours.flatMap(x => [
      Number(x.en_retard) > 0 ? `<a class="faire ko" href="#/t/${x.id}">${IC.alerte}<span>Vous êtes en retard : ${eur(x.je_dois)} à verser<small>${esc(x.nom)} · pour ${esc(x.tour_beneficiaire)}</small></span>${IC.fleche}</a>`
        : Number(x.je_dois) > 0 ? `<a class="faire" href="#/t/${x.id}">${IC.horloge}<span>Versez ${eur(x.je_dois)} à ${esc(x.tour_beneficiaire)}<small>${esc(x.nom)} · échéance ${dans(x.tour_jours)}</small></span>${IC.fleche}</a>` : '',
      x.a_confirmer > 0 ? `<a class="faire" href="#/t/${x.id}">${IC.coche}<span>${pluriel(x.a_confirmer, 'versement à confirmer', 'versements à confirmer')}<small>${esc(x.nom)}</small></span>${IC.fleche}</a>` : ''].filter(Boolean));
    vue(`<div class="wrap sou accueil"><div class="bonjour"><span class="pastille" aria-hidden="true">${esc(ini(profil?.prenom))}</span><div><h1>Bonjour ${esc(profil?.prenom || '')}</h1><p class="muted">${enCours.length ? 'Voici où vous en êtes.' : 'Vos tontines en un coup d’œil.'}</p></div></div>
      ${enCours.length ? `<section class="bilan" aria-label="Votre situation"><div class="chiffres"><div class="chiffre doit"><span>Vous devez verser</span><b>${eur(dois)}</b></div><div class="chiffre recoit"><span>On vous doit</span><b>${eur(recoit)}</b></div></div>
        <p class="quand">${IC.horloge}<span>${aVerser ? `Prochain versement : <b>${dans(aVerser.tour_jours)}</b> (${esc(aVerser.nom)})` : monTour ? `Votre tour arrive <b>${dans(monTour.mon_tour_jours)}</b> (${esc(monTour.nom)}) : ${eur(monTour.montant * monTour.nb_membres)}` : 'Rien à verser pour le moment.'}</span></p></section>` : ''}
      ${faire.length ? `<section class="a-faire" aria-label="À faire"><h2>À faire</h2>${faire.join('')}</section>` : ''}
      <div class="actions-h"><a class="btn btn-p btn-gros btn-plein" href="#/creer">${IC.plus} Créer une tontine</a></div>
      ${actives.length ? `<section><h2>Mes tontines</h2><div class="liste-t">${actives.map(carte).join('')}</div></section>`
        : `<div class="vide-etat"><span class="ill">${IC.accueil}</span><h3>Pas encore de tontine</h3><p class="muted">Créez la vôtre en 2 minutes et invitez vos proches par WhatsApp, ou entrez le code que l’on vous a envoyé.</p><a href="#/aide">Comment ça marche ?</a></div>`}
      ${finies.length ? `<section><h2>Terminées ou annulées</h2><div class="liste-t">${finies.map(carte).join('')}</div></section>` : ''}
      <section class="carte"><h2>Vous avez un code ?</h2><form class="rejoindre-f" id="fRej" aria-label="Rejoindre avec un code"><input class="champ" name="code" maxlength="8" placeholder="Code d’invitation" autocomplete="off" autocapitalize="characters" aria-label="Code d’invitation" required><button class="btn btn-p">Rejoindre</button></form></section>
      ${blocInstallation()}</div>`);
    $('#app').onsubmit = e => { e.preventDefault(); aller('#/rejoindre?code=' + encodeURIComponent(e.target.code.value.trim().toUpperCase())); };
    majNotifs();
  }

  // ---------------------------------------------------------------- page d'une tontine
  const lienInvitation = code => location.origin + location.pathname + '#/rejoindre?code=' + code;
  const fiabilite = m => {   // ponctualité : explicable (nombre de cotisations à l'heure et en retard), jamais une note
    const f = m.fiab; if (!f || !(Number(f.a_l_heure) + Number(f.retards))) return '';
    return `<small class="fiab ${f.retards > 0 ? 'att' : 'ok'}"><span aria-hidden="true">${f.retards > 0 ? '!' : '✓'}</span> Ponctualité : ${pluriel(f.a_l_heure, 'fois', 'fois')} à l’heure, ${pluriel(f.retards, 'retard', 'retards')}</small>`;
  };
  const filMessages = (d, ouvert) => {
    const M = d.moi, orga = M.role === 'organisateur';
    return `<section class="carte fil"><h2>Messages du groupe</h2>
      ${d.messages.length ? `<ul class="msgs" aria-live="polite">${d.messages.map(x => `<li class="${x.mien ? 'mien' : ''}"><span class="msg-t"><b>${esc(x.prenom)}${x.mien ? ' (vous)' : ''}</b><small>${esc(jourHeure(x.created_at))}</small></span><p>${esc(x.texte)}</p>${x.mien || orga ? `<button type="button" class="lien-petit" data-act="msg-del" data-id="${x.id}">Effacer</button>` : ''}</li>`).join('')}</ul>`
        : '<div class="vide-mini"><b>Pas encore de message</b><span>Dites bonjour au groupe, ou rappelez la date du prochain versement.</span></div>'}
      ${ouvert ? `<div class="f"><label for="msgTexte" class="sr">Votre message</label><textarea class="champ" id="msgTexte" rows="2" maxlength="500" placeholder="Écrire au groupe…"></textarea><button class="btn btn-p" data-act="msg">Envoyer</button></div>`
        : '<p class="muted petit">Le fil est fermé : la tontine est terminée ou annulée.</p>'}
      <p class="muted petit">Visible par les membres de cette tontine seulement. Pour parler librement ou envoyer des photos, WhatsApp reste le plus simple.</p></section>`;
  };
  const celebrer = () => {   // petite pluie de confettis, jamais si l'appareil demande moins d'animation
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const f = document.createElement('div'); f.className = 'fete'; f.setAttribute('aria-hidden', 'true');
    f.innerHTML = Array.from({ length: 18 }, (_, i) => `<i style="--x:${(i * 37 + 8) % 100}%;--d:${(i % 6) * 0.15}s;--c:${['#E0A526', '#1F7A4D', '#F2C14E', '#7CC29B'][i % 4]}"></i>`).join('');
    document.body.appendChild(f); setTimeout(() => f.remove(), 3800);
  };
  const EMOJIS = ['🎒', '🏖️', '🏠', '🎄', '🚗', '💍', '🎉', '🌱'];
  function pageTontine(d, d4) {   // d4 : ce qu'ajoute le 4e lot (null tant que sousou4.sql n'est pas installé)
    const t = d.tontine, M = d.moi, nomDe = id => { const m = d.membres.find(x => x.id === id); return m ? m.prenom + (id === M.id ? ' (vous)' : '') : 'Ancien membre'; };
    const orga = M.role === 'organisateur', cagnotte = Number(t.cagnotte);
    const tour = d.tours.find(x => x.statut === 'en_cours'), versesN = d.tours.filter(x => x.statut === 'verse').length;
    const v2 = !!d.v2, actif = t.statut === 'preparation' || t.statut === 'en_cours', monJ = M.mon_tour_jours;
    const decompte = v2 && t.statut === 'en_cours' && M.mon_tour != null ? (tour && tour.beneficiaire === M.id ? ''   // c'est déjà dit, en grand, par la carte du bénéficiaire
      : `<div class="decompte"><strong>${Math.max(0, monJ)}</strong><span><b>${monJ <= 1 ? 'jour' : 'jours'} avant votre tour</b><small>Tour n° ${M.mon_tour} · ${esc(jourLong(M.mon_tour_echeance))}</small></span></div>`) : '';
    const objectif = v2 && (t.objectif || decompte || (orga && actif)) ? `<section class="carte objectif">${t.objectif ? `<div class="obj-l"><span class="obj-emoji" aria-hidden="true">${esc(t.objectif_emoji || '🎯')}</span><div><small>Objectif du groupe</small><b>${esc(t.objectif)}</b></div></div>` : ''}${decompte}
      ${orga && actif ? `<details class="plus-options"><summary>${t.objectif ? 'Changer l’objectif' : 'Ajouter un objectif (rentrée, vacances, projet…)'}</summary>
        <div class="f"><label>Objectif du groupe<input class="champ" id="objTexte" maxlength="60" value="${esc(t.objectif || '')}" placeholder="Ex. : La rentrée des enfants"></label>
        <div class="emojis" role="group" aria-label="Choisir une image">${EMOJIS.map(e => `<button type="button" class="emo ${e === t.objectif_emoji ? 'sel' : ''}" data-emoji="${e}" aria-pressed="${e === t.objectif_emoji}" aria-label="Image ${e}">${e}</button>`).join('')}</div>
        <button class="btn btn-sec" data-act="objectif">Enregistrer l’objectif</button></div></details>` : ''}</section>` : '';
    const entete = `<section class="carte t-haut"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h1>${t.objectif_emoji ? `<span aria-hidden="true">${esc(t.objectif_emoji)}</span> ` : ''}${esc(t.nom)}</h1>${tagStatut(t.statut)}</div>
      <div class="t-resume">${t.nb_membres} ${d4 && d4.parts && Object.values(d4.parts).some(x => x > 1) ? 'places' : 'membres'} × ${eur(t.montant)} = <b>${eur(cagnotte)}</b> par tour · ${t.periodicite === 'mensuelle' ? 'chaque mois' : 'chaque semaine'} · à partir du ${esc(jourLong(t.debut))}</div>${d4 && d4.origine ? `<p class="petit muted" style="margin:6px 0 0">Suite de <a href="#/t/${esc(d4.origine.id)}">« ${esc(d4.origine.nom)} »</a></p>` : ''}${d4 && d4.deja ? `<p class="petit muted" style="margin:6px 0 0">Tontine reprise dans Sousou : ${d4.deja > 1 ? 'les tours 1 à ' + d4.deja + ' ont été réglés' : 'le tour 1 a été réglé'} entre les membres avant.</p>` : ''}</section>`;
    const fil = v2 ? filMessages(d, actif) : '';
    const hist = v2 && (t.statut === 'en_cours' || t.statut === 'terminee') ? `<a class="btn btn-sec btn-plein" href="#/recap/${t.id}">Historique et récapitulatif imprimable</a>`
      + (d4 && d4.lot6 ? `<a class="btn btn-sec btn-plein" id="lienAttest" href="#/attestation/${t.id}">Attestation pour la banque</a>` : '') : '';
    let corps = '', agirHaut = '';
    if (t.statut === 'preparation') {
      const parts = id => (d4 && d4.parts && d4.parts[id]) || 1, prises = d.membres.flatMap(m => Array(parts(m.id)).fill(m)), manque = t.nb_membres - prises.length;
      const lot5 = !!(d4 && d4.parts), mesParts = parts(M.id);
      const lien = lienInvitation(t.code), msg = `Rejoins ma tontine « ${t.nom} » sur Sousou : ${t.nb_membres} personnes, ${t.montant} € par ${rythme(t.periodicite)}. Code : ${t.code}\n${lien}`;
      corps = `<div class="sou-2 ${manque > 0 ? 'inviter-dabord' : ''}"><div>
        <section class="carte"><h2>Le groupe : ${lot5 ? pluriel(prises.length, 'place', 'places') : prises.length} sur ${t.nb_membres}</h2><div class="attente-membres" aria-hidden="true">${Array.from({ length: t.nb_membres }, (_, i) => prises[i] ? `<span class="place pris">${esc(ini(prises[i].prenom))}</span>` : `<span class="place">${IC.plus}</span>`).join('')}</div><ul class="membres-l">${d.membres.map(m => `<li><span class="pastille" aria-hidden="true">${esc(ini(m.prenom))}</span><span class="m-nom">${esc(m.prenom)}${m.id === M.id ? ' (vous)' : ''}${m.role === 'organisateur' ? '<small>Organisateur</small>' : ''}</span>${parts(m.id) > 1 ? '<span class="deux-parts" title="Double main : 2 parts">2 parts</span>' : '<span></span>'}</li>`).join('')}</ul>
          ${lot5 && (mesParts > 1 || manque > 0) ? `<p style="margin:10px 0 0"><button class="btn btn-sec btn-s" data-act="parts" data-n="${mesParts > 1 ? 1 : 2}">${mesParts > 1 ? 'Revenir à une seule part' : 'Prendre une 2e part (double main)'}</button></p><p class="muted petit" style="margin:4px 0 0">Double main : vous versez 2 fois la cotisation à chaque tour et recevez la cagnotte 2 fois.</p>` : ''}
          ${manque > 0 ? `<p class="muted petit">Il manque encore ${lot5 ? pluriel(manque, 'place', 'places') : pluriel(manque, 'personne', 'personnes')}. Vous pouvez démarrer sans attendre : le groupe sera de ${lot5 ? pluriel(prises.length, 'place', 'places') : d.membres.length}.</p>` : '<p class="petit"><b>Le groupe est complet.</b></p>'}</section>
        ${orga && d4 && d4.deja ? `<section class="carte"><h2>Reprendre la tontine dans Sousou</h2><p class="muted petit">Placez les membres dans l’ordre réel des tours. ${d4.deja > 1 ? 'Les ' + d4.deja + ' premiers ont' : 'Le premier a'} déjà reçu sa cagnotte : Sousou suit la tontine à partir du tour ${d4.deja + 1}.</p>
          <input type="radio" name="mode" value="choisi" checked hidden><ol class="ordre-l" id="ordreL"></ol>
          <p style="margin-top:12px"><button class="btn btn-p btn-plein" data-act="demarrer" ${manque > 0 ? 'disabled' : ''}>Reprendre au tour ${d4.deja + 1}</button></p>${manque > 0 ? `<p class="muted petit">Il faut que les ${t.nb_membres} places soient prises : il en manque ${manque}.</p>` : ''}</section>`
        : orga ? `<section class="carte"><h2>Démarrer la tontine</h2><p class="muted petit">L’ordre des tours est fixé une seule fois, au démarrage. Ensuite, un échange de tour demande l’accord de l’organisateur et des deux membres.</p>
          <div class="choix-2" role="radiogroup" aria-label="Ordre des tours"><label><input type="radio" name="mode" value="tirage" checked>Tirage au sort<small>Équitable, fait par le serveur</small></label><label><input type="radio" name="mode" value="choisi">Je choisis l’ordre<small>Vous placez chacun</small></label></div>
          <ol class="ordre-l" id="ordreL" hidden></ol>
          <p style="margin-top:12px"><button class="btn btn-p btn-plein" data-act="demarrer" ${d.membres.length < 2 ? 'disabled' : ''}>Démarrer la tontine</button></p>${d.membres.length < 2 ? '<p class="muted petit">Il faut au moins 2 membres : partagez le code.</p>' : ''}</section>` : ''}</div><div>
        <section class="carte code-zone"><h2>Inviter vos proches</h2><div class="code-gros" aria-label="Code d’invitation">${esc(t.code)}</div>
          <a class="btn btn-wa-sou btn-plein" id="partageWa" data-mesure="partage whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Partager par WhatsApp</a>
          <button class="btn btn-sec btn-plein" data-act="copier" data-lien="${esc(lien)}">Copier le lien d’invitation</button>
          <details class="plus-options inviter-num"><summary>Écrire à un numéro précis sur WhatsApp</summary><div class="tel-champ"><select id="inNumPays" aria-label="Pays">${optionsPays(lirePays())}</select><input id="inNum" type="tel" inputmode="tel" placeholder="0696 12 34 56" aria-label="Numéro à inviter"></div>
          <button class="btn btn-wa-sou btn-plein" data-act="inviter-num" data-msg="${esc(msg)}">Envoyer l’invitation à ce numéro</button></details></section>
        ${fil}
        <section class="danger-zone">${orga ? '<button class="lien-danger" data-act="annuler">Annuler la tontine</button>' : '<button class="lien-danger" data-act="quitter">Quitter la tontine</button>'}</section></div></div>`;
    } else if (t.statut === 'annulee') {
      corps = '<div class="avert"><b>Cette tontine a été annulée</b> avant son démarrage. Aucun argent n’est dû.</div>';
    } else {
      const cots = tour ? d.cotisations.filter(c => c.tour_id === tour.id) : [], conf = cots.filter(c => c.statut === 'confirmee').length, pct = cots.length ? Math.round(100 * conf / cots.length) : 0;
      const maCot = tour && cots.find(c => c.membre === M.id), tousConf = tour && cots.length > 0 && conf === cots.length, aujourd = aujourdhui();
      const lignes = cots.map(c => {
        const m = d.membres.find(x => x.id === c.membre) || {}, soi = c.membre === M.id, benef = tour.beneficiaire === c.membre;
        const act = [], fb = v2 ? fiabilite(m) : '';
        if (!soi && c.statut === 'declaree' && (M.id === tour.beneficiaire || orga)) act.push(`<button class="btn btn-ok btn-s" data-act="conf" data-id="${c.id}">Confirmer la réception de ${eur(c.montant)}</button>`);
        if (!v2 && orga && !soi && c.statut === 'a_payer' && tour.echeance < aujourd) act.push(`<button class="btn btn-sec btn-s" data-act="retard" data-id="${c.id}">Marquer en retard</button>`);
        if (!v2 && orga && soi && c.statut === 'a_payer' && tour.echeance < aujourd) act.push(`<button class="btn btn-sec btn-s" data-act="retard" data-id="${c.id}">Me marquer en retard</button>`);
        if (v2 && !soi && (c.statut === 'a_payer' || c.statut === 'en_retard') && (orga || M.id === tour.beneficiaire)) {
          const msg = `Bonjour ${String(m.prenom || '').split(' ')[0]}, petit rappel pour la tontine « ${t.nom} » : ta cotisation de ${c.montant} € est à verser à ${nomDe(tour.beneficiaire).replace(' (vous)', '')} ${c.statut === 'en_retard' ? '(l’échéance du ' + jour(tour.echeance) + ' est passée)' : 'avant le ' + jour(tour.echeance)}. Merci !`;
          act.push(`<a class="btn btn-wa-sou btn-s" data-mesure="relance whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Relancer sur WhatsApp</a>`);
        }
        return `<li data-membre="${esc(m.id)}"><span class="pastille" aria-hidden="true">${esc(ini(m.prenom))}</span><span class="m-nom">${esc(nomDe(c.membre))}<small>${benef ? 'Reçoit la cagnotte : sa part reste dedans' : 'Verse ' + eur(c.montant)}</small>${fb}</span>${etat(c.statut)}${act.length ? `<span class="m-act">${act.join('')}</span>` : ''}</li>`;
      }).join('');
      const echangeables = d.tours.filter(x => x.statut === 'a_venir'), monTour = echangeables.find(x => x.beneficiaire === M.id), enAttente = d.echanges;
      const echanges = enAttente.map(e => {
        const A = nomDe(e.demandeur), B = nomDe(e.cible), btns = [];
        if (e.demandeur === M.id) btns.push(`<button class="btn btn-sec btn-s" data-act="ech-retire" data-id="${e.id}">Retirer la demande</button>`);
        if ((e.cible === M.id && e.accord_cible === null) || (orga && e.accord_orga === null)) btns.push(`<button class="btn btn-p btn-s" data-act="ech-oui" data-id="${e.id}">Accepter</button><button class="btn btn-sec btn-s" data-act="ech-non" data-id="${e.id}">Refuser</button>`);
        return `<div class="avert"><b>Échange de tours demandé</b> : ${esc(A)} ↔ ${esc(B)}.<br>Accords : ${esc(B)} ${e.accord_cible ? '✓' : '…'} · organisateur ${e.accord_orga ? '✓' : '…'}<p class="actions" style="margin:8px 0 0;display:flex;gap:8px;flex-wrap:wrap">${btns.join('')}</p></div>`;
      }).join('');
      const duA = tour && maCot && tour.beneficiaire !== M.id ? nomDe(tour.beneficiaire).replace(' (vous)', '') : '';
      agirHaut = !tour ? '' : maCot && tour.beneficiaire !== M.id && (maCot.statut === 'a_payer' || maCot.statut === 'en_retard')
        ? `<section class="carte carte-agir ${maCot.statut === 'en_retard' ? 'ko' : ''}"><div class="a-titre"><span class="t-ico" aria-hidden="true">${IC.piece}</span><div><b>À verser : ${eur(maCot.montant)}</b><small>à ${esc(duA)} avant le ${esc(jourLong(tour.echeance))}</small></div></div>
          <p class="petit muted" style="margin:0">Faites d’abord votre virement ou remettez l’argent, puis glissez le bouton : ${esc(duA)} sera prévenu(e) et confirmera.</p>
          <div class="glisse"><span class="glisse-t">Glissez pour dire : J’ai versé ${eur(maCot.montant)}</span><button type="button" class="glisse-b" data-act="decl" data-id="${maCot.id}" aria-label="J’ai versé ${eur(maCot.montant)} à ${esc(duA)} (glissez vers la droite, ou appuyez sur Entrée)">${IC.fleche}</button></div></section>`
        : maCot && tour.beneficiaire !== M.id && maCot.statut === 'declaree' ? `<section class="carte carte-attend">${IC.horloge}<div><b>C’est noté, merci !</b><br><span class="muted petit">En attente de la confirmation de ${esc(nomDe(tour.beneficiaire).replace(' (vous)', ''))}.</span></div></section>`
        : maCot && tour.beneficiaire !== M.id && maCot.statut === 'confirmee' ? `<section class="carte carte-attend">${IC.coche}<div><b>Votre versement est confirmé</b><br><span class="muted petit">Rien à faire jusqu’au prochain tour.</span></div></section>` : '';
      corps = `<div class="sou-2"><div>
        ${v2 && tour && maCot && maCot.statut === 'en_retard' ? `<div class="avert avert-ko" role="alert"><b>Votre cotisation est en retard.</b> Versez ${eur(maCot.montant)} à ${esc(nomDe(tour.beneficiaire).replace(' (vous)', ''))}, puis appuyez sur « J’ai versé » ci-dessous : le groupe est prévenu.</div>`
          : v2 && tour && maCot && maCot.statut === 'a_payer' && tour.jours >= 0 && tour.jours <= 3 ? `<div class="avert"><b>Échéance ${dans(tour.jours)}.</b> Pensez à verser ${eur(maCot.montant)} à ${esc(nomDe(tour.beneficiaire).replace(' (vous)', ''))}, puis à le déclarer ici.</div>` : ''}
        ${tour ? `<section class="carte"><div class="pot-zone"><div class="pot" role="img" aria-label="Cagnotte remplie à ${pct} %"><i style="--p:${pct}%"></i></div>
            <div class="pot-texte"><span class="muted petit">Cagnotte du tour ${tour.numero}</span><span class="gros-montant">${eur(cagnotte)}</span><span class="petit"><b>${conf}</b> part${conf > 1 ? 's' : ''} sur ${cots.length} confirmée${conf > 1 ? 's' : ''}</span></div></div></section>
          <div class="beneficiaire ${tour.beneficiaire === M.id ? 'moi' : ''}"><span class="pastille" aria-hidden="true">${esc(ini(nomDe(tour.beneficiaire)))}</span><div><small>Tour ${tour.numero} sur ${t.nb_membres}</small><b>${tour.beneficiaire === M.id ? 'C’est votre tour !' : 'Cagnotte pour ' + esc(nomDe(tour.beneficiaire))}</b><small>Échéance : ${esc(jourLong(tour.echeance))}</small></div></div>` : ''}
        ${tour ? `<section class="carte"><h2>Où en est chacun ?</h2><ul class="membres-l" id="listeCotis">${lignes}</ul>
          ${v2 ? '<p class="muted petit" style="margin:10px 0 0">La ponctualité compte les cotisations de cette tontine seulement, et elle n’est visible que de ses membres : ce n’est ni une note ni un classement.</p>' : ''}
          ${tousConf ? (M.id === tour.beneficiaire ? `<p style="margin:12px 0 0"><button class="btn btn-p btn-plein" data-act="verse" data-id="${tour.id}">J’ai reçu la cagnotte (${eur(cagnotte)})</button></p>` : `<p class="petit muted" style="margin-bottom:0">Tout est confirmé : on attend que ${esc(nomDe(tour.beneficiaire))} déclare avoir reçu la cagnotte.</p>`) : ''}</section>` : `<div class="avert fete-fin"><b><span aria-hidden="true">🎉</span> Tontine terminée.</b> Chaque membre a reçu son tour. Bravo au groupe !</div>`}
        ${echanges}</div><div>
        <section class="carte progres" style="--w:${Math.round(100 * versesN / t.nb_membres)}%"><h2>Le calendrier des tours</h2><div class="barre" role="img" aria-label="${versesN} tours versés sur ${t.nb_membres}"><i></i></div><small>${versesN} tour${versesN > 1 ? 's' : ''} versé${versesN > 1 ? 's' : ''} sur ${t.nb_membres}</small>
          <ol class="frise" id="frise" aria-label="Ordre des tours">${d.tours.map(x => `<li class="${x.statut} ${x.beneficiaire === M.id ? 'moi' : ''}"${x.statut === 'en_cours' ? ' aria-current="step"' : ''}><span class="pt">${x.statut === 'verse' ? IC.coche : x.numero}</span><span class="f-nom">${esc(nomDe(x.beneficiaire).replace(' (vous)', ''))}</span><small>${esc(jour(x.echeance))}</small><span class="sr">${x.statut === 'verse' ? 'Versé' : x.statut === 'en_cours' ? 'En cours' : 'À venir'}</span></li>`).join('')}</ol>
          <p class="petit muted" style="margin:0">Ordre ${t.mode_ordre === 'tirage' ? 'tiré au sort' : 'choisi par l’organisateur'}, fixé au démarrage.</p></section>
        ${t.statut === 'en_cours' && monTour && echangeables.length > 1 && !enAttente.some(e => e.demandeur === M.id || e.cible === M.id) ? `<section class="carte"><details class="plus-options"><summary>Échanger mon tour (n° ${monTour.numero})</summary>
          <p class="petit muted">L’échange n’a lieu qu’avec l’accord de l’autre membre et de l’organisateur.</p>
          <div class="f"><label>Avec qui ?<select id="echCible">${echangeables.filter(x => x.beneficiaire !== M.id).map(x => `<option value="${x.beneficiaire}">${esc(nomDe(x.beneficiaire))} : tour ${x.numero}, ${esc(jour(x.echeance))}</option>`).join('')}</select></label>
          <button class="btn btn-sec" data-act="ech-demande">Proposer l’échange</button></div></details></section>` : ''}
        ${hist}${fil}
        <section class="carte petit muted">Rappel : l’argent passe directement entre les membres, jamais par Sousou. Vous restez engagé jusqu’au dernier tour, même après avoir reçu la cagnotte. <a href="#/aide">Voir les règles et les risques</a>.</section></div></div>`;
    }
    let lot4 = '';
    if (d4 && t.statut === 'terminee') {
      const s = d4.suite;
      lot4 = s ? `<section class="carte carte-suite"><h2>La suite : « ${esc(t.nom)} » recommence</h2><p class="petit muted" style="margin:0">${s.inscrits} place${s.inscrits > 1 ? 's' : ''} prise${s.inscrits > 1 ? 's' : ''} sur ${s.nb_membres} · début le ${esc(jourLong(s.debut))}${s.statut === 'en_cours' ? ' · en cours' : ''}</p>
          <p style="margin:12px 0 0">${s.membre ? `<a class="btn btn-p btn-plein" href="#/t/${esc(s.id)}">Ouvrir la nouvelle tontine</a>` : s.statut === 'preparation' ? `<a class="btn btn-p btn-plein" href="#/rejoindre?code=${esc(s.code)}">Je suis partant(e) : rejoindre</a>` : ''}</p></section>`
        : orga ? `<section class="carte carte-suite"><div class="avert" style="margin:0 0 12px"><b>« ${esc(t.nom)} » est terminée.</b> ${t.nb_membres} tours sur ${t.nb_membres} : tout le monde a reçu sa cagnotte.</div><h2>On recommence ?</h2>
          <ul class="recap-l"><li><span>Mêmes membres</span><b>${d.membres.length}, invités à confirmer</b></li><li><span>Cotisation</span><b>${eur(t.montant)} ${t.periodicite === 'mensuelle' ? 'chaque mois' : 'chaque semaine'}</b></li><li><span>Ordre des tours</span><b>Nouveau, au démarrage</b></li></ul>
          <div class="f"><label>Date du premier tour<input class="champ" id="renDebut" type="date" min="${aujourdhui()}" value="${dansJours(7)}"></label></div>
          <p class="petit muted">Chaque membre reçoit une invitation et confirme en rejoignant : personne n’est inscrit d’office.</p>
          <p style="margin:0;display:grid;gap:8px"><button class="btn btn-p btn-plein" data-act="renouveler">Renouveler la tontine</button><a class="btn btn-sec btn-plein" href="#/creer?nom=${encodeURIComponent(t.nom)}&montant=${t.montant}&per=${t.periodicite}&nb=${t.nb_membres}">Changer quelque chose d’abord</a></p></section>` : '';
    }
    let rempl = '';
    if (d4 && d4.parts && t.statut === 'en_cours') {
      const r = d4.remplacement, peutMoi = d4.remplacables.includes(M.id), autres = d4.remplacables.filter(x => x !== M.id);
      if (r) {
        const besoin = Math.floor(r.votants / 2) + 1, moiSort = r.sortant === M.id, gere = r.demandeur === M.id || orga;
        const lienP = location.origin + location.pathname + '#/place?code=' + r.code, msgP = `Une place se libère dans la tontine « ${t.nom} » sur Sousou (${t.montant} € par ${rythme(t.periodicite)}). Tu reprendrais la place de ${r.sortant_prenom}. Voici le lien :\n${lienP}`;
        rempl = `<section class="carte carte-rempl"><h2>${moiSort ? 'Votre remplacement' : esc(r.sortant_prenom) + ' doit être remplacé(e)'}</h2>
          ${r.statut === 'vote' ? `<ul class="recap-l"><li><span>${moiSort ? 'Votre accord' : 'Accord de ' + esc(r.sortant_prenom)}</span><b>${r.accord_sortant === true ? '✓ oui' : r.accord_sortant === false ? 'non' : 'en attente'}</b></li><li><span>Le groupe</span><b>${r.oui} oui sur ${besoin} nécessaires</b></li></ul>
            <p class="petit muted">La personne qui reprend la place reçoit les mêmes tours et rembourse directement à ${esc(r.sortant_prenom)} ce qu’il ou elle a déjà versé.</p>
            <p class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:0">${moiSort && r.accord_sortant === null ? `<button class="btn btn-p btn-s" data-act="rempl-oui" data-id="${r.id}">Je suis d’accord</button><button class="btn btn-sec btn-s" data-act="rempl-non" data-id="${r.id}">Je refuse</button>`
              : !moiSort && r.mon_vote === null ? `<button class="btn btn-p btn-s" data-act="rempl-oui" data-id="${r.id}">D’accord</button><button class="btn btn-sec btn-s" data-act="rempl-non" data-id="${r.id}">Pas d’accord</button>` : '<span class="petit muted">Votre réponse est enregistrée.</span>'}
            ${gere ? `<button class="lien-danger" data-act="rempl-annuler" data-id="${r.id}">Annuler la demande</button>` : ''}</p>`
          : `<div class="avert" style="margin:0 0 10px"><b>Le groupe est d’accord.</b> Envoyez ce lien à la personne qui reprend la place de ${esc(r.sortant_prenom)}.</div>
            <a class="btn btn-wa-sou btn-plein" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msgP)}">Envoyer l’invitation par WhatsApp</a>
            <p style="margin:8px 0 0;display:grid;gap:8px"><button class="btn btn-sec btn-plein" data-act="copier" data-lien="${esc(lienP)}">Copier le lien</button>${gere ? `<button class="lien-danger" data-act="rempl-annuler" data-id="${r.id}">Annuler la demande</button>` : ''}</p>`}</section>`;
      } else if (peutMoi || (orga && autres.length)) {
        rempl = `<section class="carte"><details class="plus-options"><summary>${peutMoi ? 'Je dois partir : être remplacé(e)' : 'Remplacer un membre qui doit partir'}</summary>
          <p class="petit muted">Possible tant que la personne n’a pas commencé à recevoir la cagnotte. Il faut son accord et celui de la majorité des autres membres. La personne qui reprend la place reçoit les mêmes tours et lui rembourse directement ce qu’elle a déjà versé.</p>
          ${peutMoi ? `<button class="btn btn-sec" data-act="rempl-moi">Demander à être remplacé(e)</button>` : `<div class="f"><label>Membre à remplacer<select id="remplQui">${autres.map(x => `<option value="${esc(x)}">${esc(nomDe(x))}</option>`).join('')}</select></label><button class="btn btn-sec" data-act="rempl-orga">Proposer le remplacement</button></div>`}</details></section>`;
      }
      if (d4.remplaces.length) rempl += `<section class="carte petit muted">${d4.remplaces.map(x => `${esc(x.entrant || 'Un membre')} a remplacé ${esc(x.sortant)} le ${esc(jourLong(String(x.quand).slice(0, 10)))}${Number(x.du) ? ' (remboursement de ' + eur(x.du) + ' convenu entre eux)' : ''}.`).join('<br>')}</section>`;
    }
    if (d4 && t.statut === 'en_cours') {
      const e = d4.mon_engagement, n = d4.signes.length, manquent = d.membres.filter(m => !d4.signes.includes(m.id));
      lot4 = e ? `<section class="carte carte-eng ok"><div class="a-titre"><span class="t-ico" aria-hidden="true">${IC.coche}</span><div><b>Engagement signé</b><small>le ${esc(jourHeure(e.signe_at))}</small></div></div>
          <p class="petit muted" style="margin:8px 0">${n} membre${n > 1 ? 's' : ''} sur ${d.membres.length} ${n > 1 ? 'ont' : 'a'} signé.${orga && manquent.length ? ' Pas encore : ' + manquent.map(m => esc(m.prenom)).join(', ') + '.' : ''}</p><a class="btn btn-sec btn-plein" href="#/engagement/${t.id}">Voir et télécharger le document</a></section>`
        : `<section class="carte carte-eng"><h2>Signez votre engagement</h2><p class="petit muted" style="margin:0 0 8px">Une minute, un écrit simple qui rassure ceux qui reçoivent en dernier. ${n} membre${n > 1 ? 's' : ''} sur ${d.membres.length} ${n > 1 ? 'ont' : 'a'} déjà signé.</p>
          <blockquote class="eng-texte replie" id="engTexte">${esc(d4.brouillon || '')}</blockquote><button type="button" class="lien-plus" data-act="eng-lire" aria-controls="engTexte" aria-expanded="false">Lire tout le texte</button>
          <div class="f"><label>Votre prénom et votre nom<input class="champ" id="engNom" maxlength="80" autocomplete="name" value="${esc([profil?.prenom, profil?.nom].filter(Boolean).join(' '))}"></label>
          <label class="case-ok"><input type="checkbox" id="engOk"> <span>J’ai lu ce texte et je m’engage envers les membres du groupe.</span></label>
          <button class="btn btn-p btn-plein" data-act="signer">Signer mon engagement</button></div></section>`;
    }
    return `<div class="wrap sou">${entete}${agirHaut}${t.statut === 'terminee' ? lot4 : ''}${objectif}${t.statut === 'en_cours' ? rempl + lot4 : ''}${corps}</div>`;
  }

  async function tontine(id) {
    if (!exigeCompte()) return;
    attente();
    const M_ID = () => d.moi.id;
    const avec4 = await lot4Pret(), avec6 = await lot6Pret();
    const lire4 = () => avec4 ? q(sb.rpc('sou_detail4', { t_id: id })).then(x => x && Object.assign(x, { lot6: avec6 })).catch(() => null) : Promise.resolve(null);
    let [d, d4] = await Promise.all([q(sb.rpc('sou_detail', { t_id: id })), lire4()]);
    let emoji = '';
    const dessiner = (x, garder = true) => {
      const m0 = $('#msgTexte'), brouillon = garder && m0 ? m0.value : '';   // un message en cours d'écriture survit au rafraîchissement
      instantane = JSON.stringify(x); d = x; emoji = x.tontine.objectif_emoji || ''; vue(pageTontine(x, d4)); lier();
      const m1 = $('#msgTexte'); if (m1 && brouillon) m1.value = brouillon;
      const fil = $('.msgs'); if (fil) fil.scrollTop = fil.scrollHeight;
      const fr = $('#frise'), cur = fr && fr.querySelector('.en_cours'); if (cur) fr.scrollLeft = cur.offsetLeft - fr.clientWidth / 2 + cur.offsetWidth / 2;
    };
    const recharger = async (garder = true) => { oublier(''); const [x, y] = await Promise.all([q(sb.rpc('sou_detail', { t_id: id })), lire4()]); d4 = y; dessiner(x, garder); majNotifs(); };
    let ordre = [];
    const dessinerOrdre = () => { const ol = $('#ordreL'); if (!ol) return; ol.innerHTML = ordre.map((m, i) => `<li><b>${i + 1}</b><span>${esc(m.prenom)}${i < (d4?.deja || 0) ? ' <small class="deja-recu">a déjà reçu</small>' : ''}</span><button data-ord="-1" data-i="${i}" aria-label="Monter ${esc(m.prenom)}" ${i === 0 ? 'disabled' : ''}>↑</button><button data-ord="1" data-i="${i}" aria-label="Descendre ${esc(m.prenom)}" ${i === ordre.length - 1 ? 'disabled' : ''}>↓</button></li>`).join(''); };
    const lier = () => {
      ordre = d.membres.flatMap(m => Array((d4 && d4.parts && d4.parts[m.id]) || 1).fill(m));   // double main : 2 places dans l'ordre
      if (d4 && d4.deja && $('#ordreL')) dessinerOrdre();   // tontine reprise : l'ordre réel se place tout de suite
      const a = $('#app');
      a.onchange = e => { if (e.target.name === 'mode') { const ol = $('#ordreL'); ol.hidden = e.target.value !== 'choisi'; dessinerOrdre(); } };
      a.onclick = async e => {
        const em = e.target.closest('[data-emoji]');
        if (em) { emoji = emoji === em.dataset.emoji ? '' : em.dataset.emoji; a.querySelectorAll('[data-emoji]').forEach(x => { const on = x.dataset.emoji === emoji; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); }); return; }
        const o = e.target.closest('[data-ord]');
        if (o) { const i = Number(o.dataset.i), j = i + Number(o.dataset.ord); if (j >= 0 && j < ordre.length) { [ordre[i], ordre[j]] = [ordre[j], ordre[i]]; dessinerOrdre(); } return; }
        const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
        const act = b.dataset.act, cible = b.dataset.id;
        if (b._drag) { b._drag = false; return; }
        if (act === 'decl' && !b.dataset.glisse && e.detail !== 0) { const g = b.parentElement; g.classList.remove('indice'); void g.offsetWidth; g.classList.add('indice'); toast('Faites glisser le bouton vers la droite pour confirmer.'); return; }
        if (act === 'inviter-num') {
          const n = numE164($('#inNumPays').value, $('#inNum').value); if (!n) return toast('Entrez le numéro de la personne, par exemple 0696 12 34 56.', true);
          garderPays($('#inNumPays').value); window.open('https://wa.me/' + n.slice(1) + '?text=' + encodeURIComponent(b.dataset.msg), '_blank', 'noopener'); return;
        }
        if (act === 'eng-lire') { const x = $('#engTexte'), ouvert = x.classList.toggle('replie') === false; b.setAttribute('aria-expanded', String(ouvert)); b.textContent = ouvert ? 'Replier le texte' : 'Lire tout le texte'; return; }
        if (act === 'copier') { try { await navigator.clipboard.writeText(b.dataset.lien); toast('Lien copié : collez-le dans un message.'); } catch (x) { toast('Copiez le code : ' + d.tontine.code); } return; }
        if (['annuler', 'quitter', 'retard', 'ech-non', 'verse', 'msg-del', 'rempl-moi', 'rempl-orga', 'rempl-annuler'].includes(act) && !doubleClic(b)) return;
        b.disabled = true;
        try {
          if (act === 'demarrer') {
            const choisi = a.querySelector('[name=mode]:checked')?.value === 'choisi';
            await q(sb.rpc('sou_demarrer', choisi ? { t_id: id, ordre: ordre.map(m => m.id) } : { t_id: id })); toast('La tontine démarre : le tour 1 est ouvert.');
          } else if (act === 'decl') { await q(sb.rpc('sou_declarer_cotisation', { c_id: cible })); toast('C’est noté : le bénéficiaire va confirmer la réception.'); }
          else if (act === 'conf') { await q(sb.rpc('sou_confirmer_cotisation', { c_id: cible })); toast('Réception confirmée.'); }
          else if (act === 'retard') { await q(sb.rpc('sou_marquer_en_retard', { c_id: cible })); toast('Cotisation marquée en retard, le membre est prévenu.'); }
          else if (act === 'verse') { await q(sb.rpc('sou_declarer_versement', { tour_c: cible })); celebrer(); toast('🎉 Cagnotte reçue : le tour suivant commence.'); }
          else if (act === 'renouveler') {
            const v = $('#renDebut').value; if (!v || v < aujourdhui()) { b.disabled = false; return toast('Choisissez une date à partir d’aujourd’hui.', true); }
            const nid = await q(sb.rpc('sou_renouveler', { t_id: id, debut_c: v })); toast('C’est reparti ! Les membres sont invités à confirmer.'); oublier(''); return aller('#/t/' + nid);
          } else if (act === 'parts') { await q(sb.rpc('sou_mes_parts', { t_id: id, parts_c: Number(b.dataset.n) })); toast(b.dataset.n === '2' ? 'Vous prenez 2 parts (double main).' : 'Vous revenez à une seule part.');
          } else if (act === 'rempl-moi' || act === 'rempl-orga') {
            await q(sb.rpc('sou_demander_remplacement', { t_id: id, sortant_c: act === 'rempl-moi' ? M_ID() : $('#remplQui').value })); toast('Demande envoyée : les membres vont répondre.');
          } else if (act === 'rempl-oui' || act === 'rempl-non') { await q(sb.rpc('sou_voter_remplacement', { r_id: cible, oui_c: act === 'rempl-oui' })); toast('Réponse enregistrée.');
          } else if (act === 'rempl-annuler') { await q(sb.rpc('sou_annuler_remplacement', { r_id: cible })); toast('Demande annulée.');
          } else if (act === 'signer') {
            if (!$('#engOk').checked) { b.disabled = false; return toast('Cochez la case pour confirmer votre engagement.', true); }
            await q(sb.rpc('sou_signer', { t_id: id, nom_s: $('#engNom').value })); toast('Engagement signé. Merci pour le groupe !');
          } else if (act === 'objectif') { await q(sb.rpc('sou_objectif', { t_id: id, texte_o: $('#objTexte').value, emoji_o: emoji || null })); toast('Objectif enregistré.'); }
          else if (act === 'msg') { await q(sb.rpc('sou_poster', { t_id: id, texte_m: $('#msgTexte').value })); }
          else if (act === 'msg-del') { await q(sb.rpc('sou_effacer_message', { m_id: cible })); toast('Message effacé.'); }
          else if (act === 'annuler') { await q(sb.rpc('sou_annuler', { t_id: id })); toast('Tontine annulée.'); }
          else if (act === 'quitter') { await q(sb.rpc('sou_quitter', { t_id: id })); toast('Vous avez quitté la tontine.'); oublier(''); return aller('#/'); }
          else if (act === 'ech-demande') { await q(sb.rpc('sou_demander_echange', { t_id: id, cible_c: $('#echCible').value })); toast('Demande envoyée à l’autre membre et à l’organisateur.'); }
          else if (act === 'ech-oui' || act === 'ech-non') { await q(sb.rpc('sou_repondre_echange', { e_id: cible, accepte: act === 'ech-oui' })); toast(act === 'ech-oui' ? 'Réponse enregistrée.' : 'Demande refusée.'); }
          else if (act === 'ech-retire') { await q(sb.rpc('sou_annuler_echange', { e_id: cible })); toast('Demande retirée.'); }
          await recharger(act !== 'msg');
        } catch (err) { toast(erreur(err), true); b.disabled = false; const g = b.closest('.glisse'); if (g) { delete b.dataset.glisse; g.classList.remove('fini'); g.classList.add('retour'); b.style.setProperty('--dx', '0px'); } }
      };
      a.onpointerdown = ev => {   // glisser le bouton de gauche à droite (au doigt ou à la souris) ; le clavier garde Entrée
        const h = ev.target.closest('.glisse-b'); if (!h || h.disabled) return;
        const g = h.parentElement, max = g.clientWidth - h.offsetWidth - 12, x0 = ev.clientX; h._dx = 0; h._drag = false; g.classList.remove('retour', 'indice'); h.setPointerCapture(ev.pointerId);
        const bouge = m => { h._dx = Math.max(0, Math.min(max, m.clientX - x0)); if (h._dx > 4) h._drag = true; h.style.setProperty('--dx', h._dx + 'px'); };
        const fin = () => {
          h.removeEventListener('pointermove', bouge); h.removeEventListener('pointerup', fin); h.removeEventListener('pointercancel', fin);
          if (h._dx >= max * 0.85) { h.style.setProperty('--dx', max + 'px'); g.classList.add('fini'); h.dataset.glisse = '1'; h._drag = false; h.click(); }
          else if (h._dx > 4) { g.classList.add('retour'); h.style.setProperty('--dx', '0px'); h._dx = 0; }
        };
        h.addEventListener('pointermove', bouge); h.addEventListener('pointerup', fin); h.addEventListener('pointercancel', fin);
      };
    };
    dessiner(d);
    // la page se met à jour toute seule (les autres membres déclarent et confirment), sans écraser une saisie en cours
    minuteur = setInterval(async () => {
      if (document.hidden || enSaisie()) return;
      try { const x = await q(sb.rpc('sou_detail', { t_id: id })); if (JSON.stringify(x) !== instantane && !$('#app [data-sur]')) dessiner(x); } catch (e) { /* on réessaie au prochain passage */ }
    }, 15000);
  }
  const enSaisie = () => document.activeElement?.matches?.('#app input:not([type=radio]):not([type=checkbox]), #app textarea, #app select');

  // ---------------------------------------------------------------- créer : 3 écrans (combien et quand, avec qui, on vérifie)
  async function creer() {
    if (!exigeCompte()) return;
    const avec = await lot2Pret(), avec4 = await lot4Pret(), pa = param();
    const dans = n => { const x = new Date(); x.setDate(x.getDate() + n); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    const e = { etape: 1, nom: '', per: 'mensuelle', nb: 5, montant: 50, debut: dans(7), majeur: false, objectif: '', emo: '', importe: false, deja: 1 };
    if (pa.nom) e.nom = String(pa.nom).slice(0, 60);   // « Changer quelque chose d'abord » depuis une tontine terminée : mêmes réglages, modifiables
    if (Number(pa.montant) >= 10 && Number(pa.montant) <= 2000) e.montant = Number(pa.montant);
    if (pa.per === 'hebdomadaire' || pa.per === 'mensuelle') e.per = pa.per;
    if (Number.isInteger(Number(pa.nb)) && Number(pa.nb) >= 2 && Number(pa.nb) <= 30) e.nb = Number(pa.nb);
    const resume = () => {
      const tot = e.nb * e.montant, mois = e.per === 'mensuelle' ? pluriel(e.nb, 'mois', 'mois') : pluriel(e.nb, 'semaine', 'semaines');
      return `<div class="resume-c" id="resume"><p>${e.nb} membres × ${eur(e.montant)} =</p><span class="gros-montant">${eur(tot)}</span><p>par tour, ${e.per === 'mensuelle' ? 'chaque mois' : 'chaque semaine'}</p><p class="muted petit" style="font-weight:600">Durée : ${mois}. Chacun verse ${eur(tot)} au total et reçoit ${eur(tot)} une fois.</p></div>`;
    };
    const lire = () => {
      const g = n => document.getElementById(n);
      if (g('cNom')) e.nom = g('cNom').value;
      const r = document.querySelector('[name=per]:checked'); if (r) e.per = r.value;
      if (g('cNb')) e.nb = Number(g('cNb').value) || 0;
      if (g('cMontant')) e.montant = Number(g('cMontant').value) || 0;
      if (g('cDebut')) { e.debut = g('cDebut').value; e.majeur = g('cMajeur').checked; if (g('cObj')) e.objectif = g('cObj').value; }
      const im = document.querySelector('[name=importe]:checked'); if (im) e.importe = im.value === 'oui';
      if (g('cDeja')) e.deja = Number(g('cDeja').value) || 0;
    };
    const pas = (id, cle, d, lib, min, max, step) => `<div class="stepper"><button type="button" data-pas="${cle}" data-d="-${d}" aria-label="${lib} de moins">−</button><input class="champ" id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" step="${step}" value="${e[cle]}" aria-label="${lib}"><button type="button" data-pas="${cle}" data-d="${d}" aria-label="${lib} de plus">+</button></div>`;
    const dessiner = () => {
      const barre = `<div class="etapes" aria-hidden="true">${[1, 2, 3].map(i => `<i class="${i <= e.etape ? 'fait' : ''}"></i>`).join('')}</div><div class="etape-t">Étape ${e.etape} sur 3</div>`;
      let c;
      if (e.etape === 1) c = `<h1 class="creer-q">Combien chacun verse ?</h1><div class="f"><label>Cotisation, en euros <span class="aide">(10 à 2 000 €)</span></label>${pas('cMontant', 'montant', 10, 'Euros', 10, 2000, 5)}
        <div class="puces" role="group" aria-label="Montants courants">${[20, 50, 100, 200].map(m => `<button type="button" class="puce" data-montant="${m}" aria-pressed="${m === e.montant}">${m} €</button>`).join('')}</div>
        <fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:800;margin-bottom:6px">On cotise…</legend><div class="choix-2"><label><input type="radio" name="per" value="mensuelle" ${e.per === 'mensuelle' ? 'checked' : ''}>Chaque mois<small>Le plus courant</small></label><label><input type="radio" name="per" value="hebdomadaire" ${e.per === 'hebdomadaire' ? 'checked' : ''}>Chaque semaine<small>Pour des petits montants</small></label></div></fieldset></div>`;
      else if (e.etape === 2) c = `<h1 class="creer-q">Avec qui ?</h1><div class="f"><label for="cNb">Nombre de membres, vous compris <span class="aide">(2 à 30)</span></label>${pas('cNb', 'nb', 1, 'Membres', 2, 30, 1)}
        <label>Nom de la tontine<input class="champ" id="cNom" maxlength="60" value="${esc(e.nom)}" placeholder="Ex. : Les cousins, Collègues du bureau" autocomplete="off"></label>
        <div class="puces" role="group" aria-label="Idées de noms">${['La famille', 'Les amis', 'Le bureau', 'Les voisins'].map(n => `<button type="button" class="puce" data-nom="${n}">${n}</button>`).join('')}</div></div>${resume()}`;
      else c = `<h1 class="creer-q">On vérifie ensemble</h1>${resume()}
        <section class="carte"><ul class="recap-l"><li><span>Nom</span><b>${esc(e.nom)}</b></li><li><span>Cotisation</span><b>${eur(e.montant)} ${e.per === 'mensuelle' ? 'chaque mois' : 'chaque semaine'}</b></li><li><span>Membres</span><b>${e.nb} personnes, vous comprise</b></li><li><span>Cagnotte à chaque tour</span><b>${eur(e.nb * e.montant)}</b></li></ul></section>
        ${avec4 ? `<fieldset class="f" style="border:0;padding:0;margin:0 0 12px"><legend style="font-weight:800;margin-bottom:6px">Cette tontine tourne-t-elle déjà ?</legend><div class="choix-2"><label><input type="radio" name="importe" value="non" ${e.importe ? '' : 'checked'}>Non, elle commence<small>Premier tour à venir</small></label><label><input type="radio" name="importe" value="oui" ${e.importe ? 'checked' : ''}>Oui, elle a déjà commencé<small>Sur un cahier ou WhatsApp</small></label></div>
          ${e.importe ? `<label for="cDeja">Tours déjà réglés entre vous <span class="aide">(1 à ${e.nb - 1})</span></label>${pas('cDeja', 'deja', 1, 'Tours réglés', 1, e.nb - 1, 1)}<p class="muted petit" style="margin:0">Ces tours sont notés « réglés hors Sousou ». Chaque membre le confirme en rejoignant.</p>` : ''}</fieldset>` : ''}
        <div class="f"><label>${e.importe ? 'Échéance du prochain tour (le premier suivi dans Sousou)' : 'Date du premier tour'}<input class="champ" id="cDebut" type="date" min="${dans(0)}" max="${dans(365)}" value="${esc(e.debut)}"></label>
        ${avec ? `<label>Un objectif ? <span class="aide">(facultatif : rentrée, vacances, projet…)</span><input class="champ" id="cObj" maxlength="60" value="${esc(e.objectif)}" placeholder="Ex. : Les vacances d’été"></label>
        <div class="emojis" role="group" aria-label="Choisir une image">${EMOJIS.map(m => `<button type="button" class="emo ${m === e.emo ? 'sel' : ''}" data-emo="${m}" aria-pressed="${m === e.emo}" aria-label="Image ${m}">${m}</button>`).join('')}</div>` : ''}
        <label class="case-ok"><input type="checkbox" id="cMajeur" ${e.majeur ? 'checked' : ''}> <span>J’ai 18 ans ou plus et je comprends que Sousou ne touche pas à l’argent : il passe directement entre les membres, chacun s’engage envers le groupe.</span></label></div>
        <div class="avert">${e.importe ? `Au démarrage, vous placerez les membres dans l’ordre réel : ${e.deja > 1 ? 'les ' + e.deja + ' premiers ont' : 'le premier a'} déjà reçu sa cagnotte. Tout le groupe (${e.nb} personnes) doit avoir rejoint avant.` : 'L’ordre des tours sera tiré au sort ou choisi par vous au démarrage, puis il ne bouge plus.'} Ensuite, vous invitez vos proches par WhatsApp.</div>`;
      vue(`<div class="wrap sou">${barre}${c}<div class="btns-bas">${e.etape > 1 ? '<button class="btn btn-sec" data-nav="-1">Retour</button>' : ''}<button class="btn btn-p" data-nav="1" id="suite">${e.etape === 3 ? 'Créer la tontine' : 'Continuer'}</button></div></div>`);
    };
    const valider = () => {
      if (e.etape >= 1 && (!(e.montant >= 10) || e.montant > 2000)) return 'La cotisation doit être comprise entre 10 € et 2 000 €.';
      if (e.etape >= 2 && (!Number.isInteger(e.nb) || e.nb < 2 || e.nb > 30)) return 'Une tontine compte entre 2 et 30 membres.';
      if (e.etape >= 2 && e.nom.trim().length < 2) return 'Donnez un nom à votre tontine (2 caractères au moins).';
      if (e.etape === 3 && (!e.debut || e.debut < aujourdhui())) return e.importe ? 'Choisissez l’échéance du prochain tour, à partir d’aujourd’hui.' : 'Choisissez une date de début à partir d’aujourd’hui.';
      if (e.etape === 3 && e.importe && (!Number.isInteger(e.deja) || e.deja < 1 || e.deja > e.nb - 1)) return `Indiquez entre 1 et ${e.nb - 1} tours déjà réglés.`;
      if (e.etape === 3 && !e.majeur) return 'Cochez la case pour confirmer que vous avez 18 ans ou plus.';
      return '';
    };
    dessiner();
    const a = $('#app');
    a.oninput = () => { lire(); const r = $('#resume'); if (r && e.etape === 2) r.outerHTML = resume(); };
    a.onchange = ev => { if (ev.target.name === 'importe') { lire(); e.deja = Math.min(Math.max(1, e.deja), e.nb - 1); dessiner(); } };
    a.onclick = async ev => {
      const em = ev.target.closest('[data-emo]');
      if (em) { e.emo = e.emo === em.dataset.emo ? '' : em.dataset.emo; a.querySelectorAll('[data-emo]').forEach(x => { const on = x.dataset.emo === e.emo; x.classList.toggle('sel', on); x.setAttribute('aria-pressed', String(on)); }); return; }
      const mo = ev.target.closest('[data-montant]');
      if (mo) { e.montant = Number(mo.dataset.montant); $('#cMontant').value = e.montant; a.querySelectorAll('[data-montant]').forEach(x => x.setAttribute('aria-pressed', String(x === mo))); return; }
      const no = ev.target.closest('[data-nom]'); if (no) { e.nom = no.dataset.nom; $('#cNom').value = e.nom; return; }
      const p = ev.target.closest('[data-pas]');
      if (p) { lire(); const k = p.dataset.pas, v = k === 'nb' ? Math.min(30, Math.max(2, e.nb + Number(p.dataset.d))) : k === 'deja' ? Math.min(e.nb - 1, Math.max(1, e.deja + Number(p.dataset.d))) : Math.min(2000, Math.max(10, e.montant + Number(p.dataset.d))); e[k] = v; $(k === 'nb' ? '#cNb' : k === 'deja' ? '#cDeja' : '#cMontant').value = v; if (k === 'deja') return dessiner(); const r = $('#resume'); if (r) r.outerHTML = resume(); return; }
      const n = ev.target.closest('[data-nav]'); if (!n) return;
      lire();
      if (n.dataset.nav === '-1') { e.etape--; return dessiner(); }
      const m = valider(); if (m) return toast(m, true);
      if (e.etape < 3) { e.etape++; window.scrollTo(0, 0); return dessiner(); }
      n.disabled = true;
      try { const id = await q(avec4 ? sb.rpc('sou_creer2', { nom_c: e.nom.trim(), montant_c: e.montant, periodicite_c: e.per, nb_c: e.nb, prochaine_c: e.debut, deja_c: e.importe ? e.deja : 0 })
          : sb.rpc('sou_creer', { nom_c: e.nom.trim(), montant_c: e.montant, periodicite_c: e.per, nb_c: e.nb, debut_c: e.debut }));
        if (avec && e.objectif.trim()) { try { await q(sb.rpc('sou_objectif', { t_id: id, texte_o: e.objectif, emoji_o: e.emo || null })); } catch (x) { /* l'objectif se refait depuis la page de la tontine */ } }
        oublier(''); toast('Tontine créée ! Invitez maintenant vos proches.'); aller('#/t/' + id); }
      catch (err) { toast(erreur(err), true); n.disabled = false; }
    };
  }

  // ---------------------------------------------------------------- rejoindre avec un code
  async function rejoindre() {
    if (!exigeCompte()) return;
    const code = (param().code || '').trim().toUpperCase();
    if (!code) {
      vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Rejoindre une tontine', 'Entrez le code que l’organisateur vous a envoyé.')}<form class="rejoindre-f" id="fRej"><input class="champ" name="code" maxlength="8" placeholder="Code d’invitation" autocomplete="off" autocapitalize="characters" aria-label="Code d’invitation" required style="min-height:56px;font-size:20px"><button class="btn btn-p btn-gros">Continuer</button></form></div></div>`);
      $('#app').onsubmit = ev => { ev.preventDefault(); aller('#/rejoindre?code=' + encodeURIComponent(ev.target.code.value.trim().toUpperCase())); };
      return;
    }
    attente();
    let t;
    try { t = await q(sb.rpc('sou_apercu', { code_c: code })); t.lot5 = await lot5Pret(); } catch (err) {
      vue(`<div class="wrap sou"><div class="vide-etat"><h3>Code inconnu</h3><p class="muted">${esc(erreur(err))}</p><a class="btn btn-p" href="#/rejoindre">Essayer un autre code</a></div></div>`); return;
    }
    const places = t.nb_membres - t.inscrits, ouvert = t.statut === 'preparation' && places > 0 && !t.deja_membre;
    vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Rejoindre « ' + esc(t.nom) + ' »', 'Organisé par <b>' + esc(t.organisateur) + '</b>' + (t.suite_de ? ' · suite de « ' + esc(t.suite_de) + ' »' : ''))}<section class="carte"><div class="gros-montant">${eur(t.montant)} <small>par ${rythme(t.periodicite)}</small></div>
      <p style="margin:8px 0 0">${t.nb_membres} ${t.lot5 ? 'places' : 'membres'} : cagnotte de <b>${eur(t.montant * t.nb_membres)}</b> à chaque tour. Début prévu le ${esc(jourLong(t.debut))}.</p>
      <p class="muted petit" style="margin:6px 0 0">${t.lot5 ? `${t.inscrits} place${t.inscrits > 1 ? 's' : ''} prise${t.inscrits > 1 ? 's' : ''} sur ${t.nb_membres}.` : `${t.inscrits} inscrit${t.inscrits > 1 ? 's' : ''} sur ${t.nb_membres}.`}</p></section>
      ${t.deja_membre ? `<div class="avert">Vous faites déjà partie de cette tontine.</div><a class="btn btn-p btn-gros btn-plein" href="#/t/${t.id}">Ouvrir la tontine</a>`
        : t.statut !== 'preparation' ? '<div class="avert"><b>Cette tontine a déjà démarré ou n’existe plus.</b> On ne peut plus la rejoindre.</div><a class="btn btn-sec btn-plein" href="#/">Mes tontines</a>'
        : places <= 0 ? '<div class="avert"><b>Cette tontine est complète.</b></div><a class="btn btn-sec btn-plein" href="#/">Mes tontines</a>'
        : `<div class="avert"><b>Avant de vous engager.</b> Vous versez ${eur(t.montant)} à chaque échéance directement au membre qui reçoit, jusqu’au dernier tour, y compris après avoir reçu votre tour. Sousou ne touche pas à l’argent.</div>
          ${t.deja ? `<div class="avert"><b>Cette tontine a déjà commencé</b> entre les membres : ${t.deja > 1 ? 'les tours 1 à ' + t.deja + ' sont réglés' : 'le tour 1 est réglé'}. Sousou la suit à partir du tour ${t.deja + 1}.</div>` : ''}
          <form class="f" id="fJoin">${t.deja ? `<label class="case-ok"><input type="checkbox" required> <span>Je confirme que ${t.deja > 1 ? 'les ' + t.deja + ' premiers tours ont' : 'le premier tour a'} déjà été réglé${t.deja > 1 ? 's' : ''} entre nous.</span></label>` : ''}${t.lot5 && t.places_libres >= 2 ? `<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:800;margin-bottom:6px">Combien de parts ?</legend><div class="choix-2"><label><input type="radio" name="parts" value="1" checked>1 part<small>${eur(t.montant)} par ${rythme(t.periodicite)}, une cagnotte</small></label><label><input type="radio" name="parts" value="2">2 parts (double main)<small>${eur(t.montant * 2)} par ${rythme(t.periodicite)}, deux cagnottes</small></label></div></fieldset>` : ''}<label class="case-ok"><input type="checkbox" required> <span>J’ai 18 ans ou plus, je connais les membres et je m’engage envers le groupe. <a href="cgu.html" target="_blank">Conditions et risques</a></span></label><button class="btn btn-p btn-gros btn-plein" ${ouvert ? '' : 'disabled'}>Rejoindre la tontine</button></form>`}</div></div>`);
    const f = $('#fJoin');
    if (f) f.addEventListener('submit', async ev => {
      ev.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
      const nParts = Number(f.querySelector('[name=parts]:checked')?.value || 1);
      try { const id = await q(nParts > 1 ? sb.rpc('sou_rejoindre2', { code_c: code, parts_c: nParts }) : sb.rpc('sou_rejoindre', { code_c: code })); oublier(''); toast('Bienvenue dans le groupe !'); aller('#/t/' + id); } catch (err) { toast(erreur(err), true); b.disabled = false; }
    });
  }

  // ---------------------------------------------------------------- avis (notifications), aide, profil
  async function avis() {
    if (!exigeCompte()) return;
    attente();
    const n = await q(sb.from('notifs').select('*').order('created_at', { ascending: false }).limit(50));
    const icone = t => /retard/i.test(t) ? IC.alerte : /confirm|re[cç]u|vers/i.test(t) ? IC.coche : /rejoint|quitt|group/i.test(t) ? IC.accueil : /tour|rappel|échéance|echeance/i.test(t) ? IC.calendrier : IC.cloche;
    const ligne = x => `<a class="notif-l ${x.lu ? 'lue' : ''}" href="${esc(x.lien && x.lien.startsWith('#/') ? x.lien : '#/')}"><span class="notif-ic" aria-hidden="true">${icone(x.texte)}</span>
      <span><span class="notif-t">${esc(x.texte)}</span><small class="muted">${esc(jourHeure(x.created_at))}${x.lu ? '' : ' · nouveau'}</small></span></a>`;
    const nouv = n.filter(x => !x.lu), anc = n.filter(x => x.lu);
    vue(`<div class="wrap sou"><h1>Avis</h1>${n.length ? `${nouv.length ? `<p class="notif-sec">Nouveaux</p><div class="liste-g">${nouv.map(ligne).join('')}</div>` : '<div class="vide-mini"><b>Vous êtes à jour</b><span>Aucun nouvel avis.</span></div>'}${anc.length ? `<p class="notif-sec">Plus anciens</p><div class="liste-g">${anc.map(ligne).join('')}</div>` : ''}`
      : `<div class="vide-etat"><span class="ill">${IC.cloche}</span><h3>Aucun avis pour l’instant</h3><p class="muted">Vous serez prévenu ici quand quelqu’un rejoint votre groupe, déclare une cotisation, ou quand c’est votre tour.</p><a class="btn btn-sec" href="#/">Mes tontines</a></div>`}</div>`);
    const nonLues = n.filter(x => !x.lu).map(x => x.id);
    if (nonLues.length) { await sb.from('notifs').update({ lu: true }).in('id', nonLues); nbNotifs = 0; nav(); }
  }
  async function aide() {
    const avec = moi && await lot2Pret();
    vue(`<div class="wrap sou"><h1>Comment marche une tontine ?</h1>
      <section class="carte"><p>Un groupe de proches verse la même somme à chaque échéance. À chaque tour, <b>un membre reçoit toute la cagnotte</b>, jusqu’à ce que chacun ait reçu la sienne.</p>
        <p><b>Exemple : 3 amis, 100 € par mois.</b> Au mois 1, Marie reçoit 300 € ; au mois 2, Kévin ; au mois 3, Léa. Chacun a versé 300 € et reçu 300 € : personne ne gagne ni ne perd d’argent, mais chacun reçoit une grosse somme d’un coup, une fois.</p></section>
      <section class="carte"><h2>Ce que fait Sousou</h2><ul><li>Il fixe l’ordre des tours (tirage au sort ou choix de l’organisateur), puis ne le change plus.</li><li>Il suit qui a déclaré, qui est confirmé, qui est en retard.</li><li>Il prévient chacun à chaque étape.</li></ul>
        <p><b>Sousou n’encaisse ni ne garde l’argent.</b> Chacun verse directement au bénéficiaire du tour (virement, espèces…) puis le déclare dans l’appli. Le bénéficiaire confirme la réception.</p></section>
      <section class="carte"><h2>Les règles</h2><ul><li>De 2 à 30 membres, cotisation de 10 à 2 000 €.</li><li>On peut quitter ou annuler tant que la tontine n’a pas démarré. Ensuite, chacun reste engagé jusqu’au dernier tour.</li><li>Un échange de tour demande l’accord de l’organisateur et des deux membres.</li><li>L’organisateur peut marquer un retard après l’échéance.</li></ul></section>
      ${avec ? `<section class="carte"><h2>Rappels, retards et ponctualité</h2><ul><li>Quelques jours avant l’échéance, Sousou vous rappelle dans l’onglet Avis ce que vous devez verser.</li><li>Une cotisation non déclarée après l’échéance passe « en retard » toute seule, et l’organisateur est prévenu. Il peut relancer le membre sur WhatsApp d’un seul geste.</li><li>La ponctualité d’un membre (cotisations à l’heure, retards) n’est visible que des membres de la même tontine. Ce n’est pas une note.</li></ul></section>` : ''}
      <section class="carte"><h2>Essayer sans risque</h2><p>Pour découvrir, créez une tontine de 2 ou 3 proches avec la cotisation minimale (10 €) : tant que vous ne l’avez pas démarrée, vous pouvez l’annuler sans rien devoir à personne. Sousou ne prélève jamais d’argent : les virements, c’est vous qui les faites, entre vous.</p>
        <p class="muted petit">Astuce : le bouton « Texte plus grand » (sur l’accueil et dans le profil) agrandit tout l’écran ; « Contraste renforcé » épaissit les contours.</p></section>
      <div class="avert"><b>Les risques, sans détour.</b> Si un membre ne verse plus après avoir reçu la cagnotte, le groupe perd cet argent : Sousou ne peut ni le rembourser ni le récupérer. Ce n’est ni un placement ni un crédit, et rien n’est garanti. Ne rejoignez que des personnes de confiance et ne cotisez que ce que vous pouvez vous permettre de perdre.</div>
      <p class="petit"><a href="cgu.html">Conditions d’utilisation et risques</a> · <a href="confidentialite.html">Confidentialité</a> · <a href="#/verifier">Vérifier une attestation (banques)</a></p></div>`);
  }
  async function compte() {
    if (!moi) return aller('#/connexion');
    vue(`<div class="wrap sou"><h1>Profil</h1><section class="carte profil-l"><div style="display:flex;gap:12px;align-items:center"><span class="pastille" aria-hidden="true">${esc(ini(profil?.prenom))}</span><div><b>${esc(((profil?.prenom || '') + ' ' + (profil?.nom || '')).trim() || 'Votre compte')}</b><br><span class="muted petit">${esc(moi.phone ? telLisible(moi.phone) : moi.email || '')}</span></div></div>
      <p class="petit muted" style="margin:0">Votre compte est le même pour Sousou, Woulib, EventPass et Kaz An Nou : nom, téléphone et mot de passe se changent dans le compte commun.</p>
      <a class="btn btn-sec btn-plein" href="https://ilo-tech.com/pass/#/compte">Gérer mon compte commun</a></section>
      <section class="carte"><h2>Apparence</h2><div class="theme-choix" role="group" aria-label="Thème">${[['auto', 'Automatique'], ['clair', 'Clair'], ['sombre', 'Sombre']].map(([k, n]) => `<button type="button" class="btn btn-sec btn-s" data-theme-set="${k}" aria-pressed="${lireTheme() === k}">${n}</button>`).join('')}</div></section>
      <section class="carte"><h2>Confort de lecture</h2>${reglages()}<p class="muted petit" style="margin:8px 0 0">Gardé sur cet appareil seulement.</p></section>
      <section class="carte"><ul class="menu-liens"><li><a href="#/aide">Comment ça marche et les risques <span aria-hidden="true">›</span></a></li><li><a href="cgu.html">Conditions d’utilisation <span aria-hidden="true">›</span></a></li><li><a href="confidentialite.html">Confidentialité <span aria-hidden="true">›</span></a></li></ul></section>
      <a class="btn btn-sec btn-plein" href="#/deconnexion">Se déconnecter</a></div>`);
  }

  // ---------------------------------------------------------------- historique, récapitulatif imprimable et export CSV de ses propres cotisations
  const csvTexte = lignes => '\ufeff' + lignes.map(l => l.map(c => { let x = String(c ?? ''); if (/^[=+\-@\t\r]/.test(x)) x = "'" + x; return '"' + x.replace(/"/g, '""') + '"'; }).join(';')).join('\r\n');   // ; pour Excel en français, apostrophe contre les formules
  const telecharger = (nom, texte) => {
    const u = URL.createObjectURL(new Blob([texte], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  };
  const jjmmaaaa = x => x ? fmt(x, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  async function recap(id) {
    if (!exigeCompte()) return;
    attente();
    const [d, h, mes] = await Promise.all([q(sb.rpc('sou_detail', { t_id: id })), q(sb.rpc('sou_historique', { t_id: id })), q(sb.rpc('sou_mes_cotisations', { t_id: id }))]);
    const t = d.tontine, nomDe = i => (d.membres.find(x => x.id === i) || {}).prenom || '?', versesN = d.tours.filter(x => x.statut === 'verse').length;
    vue(`<div class="wrap sou recap"><div class="no-print"><a href="#/t/${t.id}">‹ Retour à la tontine</a></div>
      <section class="carte"><h1>${t.objectif_emoji ? `<span aria-hidden="true">${esc(t.objectif_emoji)}</span> ` : ''}${esc(t.nom)}</h1>
        <p class="muted" style="margin:4px 0 0">Récapitulatif au ${esc(jourLong(t.aujourdhui))} · ${t.nb_membres} membres × ${eur(t.montant)} = ${eur(t.cagnotte)} par tour · ${versesN} tour${versesN > 1 ? 's' : ''} versé${versesN > 1 ? 's' : ''} sur ${t.nb_membres}${t.objectif ? ' · Objectif : ' + esc(t.objectif) : ''}</p>
        <p class="actions-r no-print"><button class="btn btn-p" data-act="imprimer">Imprimer ou enregistrer en PDF</button><button class="btn btn-sec" data-act="csv">Télécharger mes cotisations (CSV)</button></p></section>
      <section class="carte"><h2>Les tours</h2><table class="tab-r"><thead><tr><th>Tour</th><th>Bénéficiaire</th><th>Échéance</th><th>État</th></tr></thead><tbody>${d.tours.map(x => `<tr><td>${x.numero}</td><td>${esc(nomDe(x.beneficiaire))}</td><td>${esc(jjmmaaaa(x.echeance + 'T12:00:00'))}</td><td>${x.statut === 'verse' ? 'Versé' : x.statut === 'en_cours' ? 'En cours' : 'À venir'}</td></tr>`).join('')}</tbody></table></section>
      <section class="carte"><h2>Le groupe</h2><table class="tab-r"><thead><tr><th>Membre</th><th>À l’heure</th><th>En retard</th></tr></thead><tbody>${d.membres.map(m => `<tr><td>${esc(m.prenom)}</td><td>${m.fiab ? m.fiab.a_l_heure : 0}</td><td>${m.fiab ? m.fiab.retards : 0}</td></tr>`).join('')}</tbody></table>
        <p class="muted petit">Compté sur cette tontine seulement. Le versement de la cagnotte et les cotisations passent directement entre les membres : Sousou n’en garde que la trace.</p></section>
      <section class="carte"><h2>Chronologie</h2>${h.length ? `<ol class="chrono">${h.map(x => `<li class="${esc(x.type)}"><time>${esc(jourHeure(x.quand))}</time><span>${esc(x.texte)}</span></li>`).join('')}</ol>` : '<div class="vide-mini"><b>Rien pour l’instant</b><span>Les arrivées, déclarations et versements s’afficheront ici au fil des jours.</span></div>'}</section></div>`);
    $('#app').onclick = ev => {
      const b = ev.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'imprimer') window.print();
      if (b.dataset.act === 'csv') {
        const en = [['Tour', 'Échéance', 'Bénéficiaire', 'Montant (€)', 'Statut', 'Déclarée le', 'Confirmée le', 'Votre propre tour']].concat(mes.map(c => [c.tour, jjmmaaaa(c.echeance + 'T12:00:00'), c.beneficiaire, c.montant, ETAT[c.statut][1], jjmmaaaa(c.declaree_at), jjmmaaaa(c.confirmee_at), c.pour_moi ? 'oui' : 'non']));
        telecharger('sousou-' + t.nom.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-mes-cotisations.csv', csvTexte(en)); toast('Fichier téléchargé.');
      }
    };
  }

  // ---------------------------------------------------------------- C. le document d'engagement (texte figé par la base au moment de la signature)
  async function engagement(id) {
    if (!exigeCompte()) return;
    attente();
    const [d, d4] = await Promise.all([q(sb.rpc('sou_detail', { t_id: id })), q(sb.rpc('sou_detail4', { t_id: id }))]);
    const t = d.tontine, e = d4.mon_engagement;
    if (!e) return vue(`<div class="wrap sou"><div class="vide-etat"><h3>Pas encore signé</h3><p class="muted">Signez votre engagement depuis la page de la tontine.</p><a class="btn btn-p" href="#/t/${t.id}">Retour à la tontine</a></div></div>`);
    vue(`<div class="wrap sou recap engagement"><div class="no-print"><a href="#/t/${t.id}">‹ Retour à la tontine</a></div>
      <section class="carte doc-eng"><p class="etiq-doc">Sousou · tontine entre proches</p><h1>Engagement de participation</h1>
        <p class="muted" style="margin:4px 0 16px">Tontine « ${esc(t.nom)} » · code ${esc(t.code)} · ${t.nb_membres} membres × ${eur(t.montant)} ${t.periodicite === 'mensuelle' ? 'chaque mois' : 'chaque semaine'}</p>
        <p class="eng-texte doc">${esc(e.texte)}</p>
        <div class="signature"><span class="petit muted">Signé en ligne par</span><span class="sig-nom">${esc(e.nom)}</span><span class="petit muted">le ${esc(jourHeure(e.signe_at))}, depuis son compte Sousou. ${d4.signes.length} membre${d4.signes.length > 1 ? 's' : ''} sur ${t.nb_membres} ${d4.signes.length > 1 ? 'ont' : 'a'} signé.</span></div>
        <p class="petit muted" style="margin:16px 0 0">Ce document n’est pas un prêt et ne fait pas de Sousou une partie : l’argent passe directement entre les membres. Il sert de trace écrite entre membres d’une tontine.</p>
        <p class="actions-r no-print" style="margin-top:16px"><button class="btn btn-p" data-act="imprimer">Imprimer ou enregistrer en PDF</button></p></section></div>`);
    $('#app').onclick = ev => { if (ev.target.closest('[data-act=imprimer]')) window.print(); };
  }

  // ---------------------------------------------------------------- D. reprendre la place d'un membre qui part (lien envoyé par le groupe)
  async function place() {
    if (!exigeCompte()) return;
    const code = (param().code || '').trim().toUpperCase();
    attente();
    let x;
    try { x = await q(sb.rpc('sou_apercu_place', { code_c: code })); } catch (err) {
      return vue(`<div class="wrap sou"><div class="vide-etat"><h3>Lien inconnu</h3><p class="muted">${esc(erreur(err))}</p><a class="btn btn-p" href="#/">Mes tontines</a></div></div>`);
    }
    const parts = x.parts || 1, verse = eur(x.montant * parts);
    vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Reprendre une place', 'dans « ' + esc(x.nom) + ' », organisée par <b>' + esc(x.organisateur) + '</b>')}
      <section class="carte"><p style="margin:0">Vous remplacez <b>${esc(x.sortant)}</b>, qui doit partir.</p>
        <ul class="recap-l"><li><span>Vous versez</span><b>${verse} par ${rythme(x.periodicite)}${parts > 1 ? ' (2 parts)' : ''}</b></li><li><span>Vous recevez</span><b>${eur(x.cagnotte)} ${x.tours.length > 1 ? 'aux tours' : 'au tour'} ${x.tours.map(r => r.numero + ' (' + esc(jourLong(r.echeance)) + ')').join(' et ')}</b></li>
        <li><span>À rembourser à ${esc(x.sortant)}</span><b>${eur(x.du)}</b></li></ul>
        <p class="petit muted" style="margin:0">${Number(x.du) ? `C’est ce que ${esc(x.sortant)} a déjà versé au groupe. Vous le lui remboursez directement : Sousou ne touche pas à l’argent.` : `${esc(x.sortant)} n’a encore rien versé : rien à rembourser.`}</p></section>
      ${x.deja_membre ? `<div class="avert">Vous faites déjà partie de cette tontine.</div><a class="btn btn-p btn-plein" href="#/t/${esc(x.tontine_id)}">Ouvrir la tontine</a>`
        : !x.ouvert ? '<div class="avert"><b>Cette place n’est plus à reprendre.</b></div><a class="btn btn-sec btn-plein" href="#/">Mes tontines</a>'
        : `<form class="f" id="fPlace">${Number(x.du) ? `<label class="case-ok"><input type="checkbox" required> <span>Je rembourse ${eur(x.du)} à ${esc(x.sortant)}, directement.</span></label>` : ''}
          <label class="case-ok"><input type="checkbox" required> <span>J’ai 18 ans ou plus, je connais les membres et je m’engage envers le groupe jusqu’au dernier tour. <a href="cgu.html" target="_blank">Conditions et risques</a></span></label>
          <button class="btn btn-p btn-gros btn-plein">Reprendre la place</button></form>`}</div></div>`);
    const f = $('#fPlace');
    if (f) f.addEventListener('submit', async ev => {
      ev.preventDefault(); const b = f.querySelector('button'); b.disabled = true;
      try { const id = await q(sb.rpc('sou_reprendre_place', { code_c: code })); oublier(''); toast('Bienvenue dans le groupe !'); aller('#/t/' + id); } catch (err) { toast(erreur(err), true); b.disabled = false; }
    });
  }

  // ---------------------------------------------------------------- F. attestation de participation pour la banque (chiffres figés par la base, code vérifiable sans compte)
  const lienVerif = code => location.origin + location.pathname + '#/verifier?code=' + encodeURIComponent(code);
  function docAttestation(a, verifiee) {
    const ponct = a.ponctualite == null ? 'pas encore d’échéance' : `${a.ponctualite} % à l’heure`, ponctD = a.ponctualite == null ? '' : `${pluriel(a.a_l_heure, 'cotisation', 'cotisations')} à l’heure, ${pluriel(a.retards, 'retard', 'retards')}`;
    const recus = (a.recus || []).map(r => `<li><span>Tour ${r.numero} · ${esc(jourLong(r.echeance))}</span><b>${r.statut === 'a_venir' ? 'à venir' : Number(r.recu) ? eur(r.recu) + ' reçus' : r.statut === 'en_cours' ? 'en cours' : 'rien de confirmé'}</b></li>`).join('');
    return `<section class="carte doc-eng doc-attest"><p class="etiq-doc">Sousou · tontine entre proches</p><h1>Attestation de participation</h1>
      <p style="margin:8px 0 14px">Sousou atteste que <b>${esc(a.nom)}</b> participe à la tontine « ${esc(a.tontine)} » : ${a.places} places, ${eur(a.montant)} ${a.periodicite === 'mensuelle' ? 'chaque mois' : 'chaque semaine'}${a.parts > 1 ? ' par part, avec 2 parts' : ''}, du ${esc(jourLong(a.debut))} au ${esc(jourLong(a.fin))}${a.statut === 'terminee' ? ' (tontine terminée)' : ''}. Situation au ${esc(jourLong(a.au))}.</p>
      <ul class="recap-l attest-chiffres"><li><span>Versé aux autres membres<small>${pluriel(a.nb_verse, 'versement confirmé', 'versements confirmés')} par le bénéficiaire</small></span><b>${eur(a.verse)}</b></li>
        <li><span>Reçu des autres membres<small>à ${(a.recus || []).length > 1 ? 'ses tours' : 'son tour'}</small></span><b>${eur(a.recu)}</b></li>
        <li><span>Reste à verser jusqu’au dernier tour<small>sur un engagement de ${eur(a.engagement)}</small></span><b>${eur(a.reste)}</b></li>
        <li><span>Ponctualité${ponctD ? `<small>${esc(ponctD)}</small>` : ''}</span><b>${esc(ponct)}</b></li></ul>
      ${recus ? `<h2 class="attest-h2">${(a.recus || []).length > 1 ? 'Ses tours' : 'Son tour'}</h2><ul class="recap-l">${recus}</ul>` : ''}
      ${a.deja ? `<p class="petit muted">Tontine reprise dans Sousou au tour ${a.deja + 1} : les tours précédents, réglés entre les membres avant, ne sont pas comptés ici${a.avant_sousou ? ` (dont ${pluriel(a.avant_sousou, 'cagnotte reçue', 'cagnottes reçues')} par ce membre)` : ''}.</p>` : ''}
      <div class="avert attest-banque"><b>Pour la banque.</b> Une tontine est une épargne tournante entre proches : chaque membre verse la même somme à chaque échéance et reçoit, à son tour, la cagnotte du groupe. Les virements entre particuliers visibles sur le relevé correspondent à ces versements. Ce n’est ni un prêt ni un revenu : chaque membre récupère ce qu’il a versé. Sousou n’encaisse pas l’argent ; les montants sont ceux déclarés par les membres et confirmés par le bénéficiaire.</div>
      <div class="signature attest-code"><span class="petit muted">${verifiee ? 'Attestation authentique, faite le' : 'Faite le'} ${esc(new Date(a.emise_at).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Martinique' }))} (heure de Martinique). Code de vérification</span><span class="code-verif">${esc(a.code)}</span><span class="petit muted">À vérifier sans compte sur ilo-tech.com/sousou, rubrique « Vérifier une attestation », ou à l’adresse ${esc(lienVerif(a.code))}</span></div>`;
  }
  async function attestation(id) {
    if (!exigeCompte()) return;
    attente();
    let a;
    try { a = await q(sb.rpc('sou_attestation', { t_id: id })); } catch (err) {
      return vue(`<div class="wrap sou"><div class="vide-etat"><h3>Attestation indisponible</h3><p class="muted">${esc(erreur(err))}</p><a class="btn btn-p" href="#/t/${esc(id)}">Retour à la tontine</a></div></div>`);
    }
    vue(`<div class="wrap sou recap attestation"><div class="no-print"><a href="#/t/${esc(id)}">‹ Retour à la tontine</a></div>${docAttestation(a, false)}
      <p class="actions-r no-print" style="margin-top:4px"><button class="btn btn-p" data-act="imprimer">Imprimer ou enregistrer en PDF</button><button class="btn btn-sec" data-act="copier">Copier le lien de vérification</button></p>
      <p class="petit muted no-print">Les chiffres sont figés à la date du jour. Si quelque chose change (une cotisation confirmée, un tour reçu), une nouvelle attestation avec un nouveau code sera faite ; les anciennes restent vérifiables telles quelles.</p></div>`);
    $('#app').onclick = async ev => {
      const b = ev.target.closest('[data-act]'); if (!b) return;
      if (b.dataset.act === 'imprimer') window.print();
      if (b.dataset.act === 'copier') { try { await navigator.clipboard.writeText(lienVerif(a.code)); toast('Lien copié : vous pouvez l’envoyer à votre banquier.'); } catch (x) { toast('Code de vérification : ' + a.code); } }
    };
  }
  async function verifier() {   // ouverte à tous, sans compte : le banquier tape le code imprimé sur l'attestation
    const code = (param().code || '').trim().toUpperCase();
    const forme = `<form class="rejoindre-f" id="fVerif"><input class="champ" name="code" maxlength="16" placeholder="SOU-XXXX-XXXX" autocomplete="off" autocapitalize="characters" aria-label="Code de vérification" value="${esc(code)}" required style="min-height:56px;font-size:20px"><button class="btn btn-p btn-gros">Vérifier</button></form>`;
    const lier = () => { $('#app').onsubmit = ev => { ev.preventDefault(); aller('#/verifier?code=' + encodeURIComponent(ev.target.code.value.trim().toUpperCase())); }; $('#app').onclick = ev => { if (ev.target.closest('[data-act=imprimer]')) window.print(); }; };
    if (!code) { vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Vérifier une attestation', 'Tapez le code imprimé en bas de l’attestation Sousou.')}${forme}</div></div>`); return lier(); }
    attente();
    let a = null;
    try { a = await q(sb.rpc('sou_verifier_attestation', { code_c: code })); } catch (err) { a = undefined; }
    if (!a) {
      vue(`<div class="wrap sou"><div class="entrer">${logoEntrer('Vérifier une attestation', 'Tapez le code imprimé en bas de l’attestation Sousou.')}<div class="avert"><b>${a === undefined ? 'Vérification impossible pour l’instant.' : 'Aucune attestation ne porte ce code.'}</b> ${a === undefined ? 'Réessayez dans un moment.' : 'Vérifiez qu’il est bien recopié (SOU-, puis 4 et 4 caractères). Une attestation sans code valable ne vient pas de Sousou.'}</div>${forme}</div></div>`);
      return lier();
    }
    vue(`<div class="wrap sou recap attestation"><div class="verif-ok no-print" role="status"><b>Attestation authentique</b><span>Ce code correspond à une attestation faite par Sousou. Voici son contenu exact, à comparer avec le document reçu.</span></div>${docAttestation(a, true)}
      <p class="actions-r no-print"><button class="btn btn-sec" data-act="imprimer">Imprimer</button><a class="btn btn-sec" href="#/verifier">Vérifier un autre code</a></p></div>`);
    lier();
  }

  Object.assign(APP.pages, { '': accueil, t: tontine, recap, engagement, attestation, verifier, place, creer, rejoindre, avis, aide, compte });
/* service worker : enregistré par pwa.js (commun/pwa.js) */
  demarrer();
})();
