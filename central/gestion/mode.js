/* ILO Central · Gestion (26/11/2026) : instance PRIVÉE du moteur NEXORA, publiée à /central/gestion/ à partir des mêmes sources (sites/nexora/).
   Chargé AVANT noyau.js : il pose le mode, puis (au chargement de la page, avant le démarrage de NEXORA) installe les écrans propres à ce mode.
   Ici : seules les entreprises internes de l'écosystème sont listées (noyau.js), accès réservé à l'administrateur (profiles.role = 'admin'),
   aucune inscription, aucune invitation, aucun espace client, aucune page marketing. La base vérifie aussi : l'entreprise n'est lisible que par ses membres. */
window.NX_MODE = 'central';
document.documentElement.dataset.mode = 'central';
document.addEventListener('DOMContentLoaded', () => {
  'use strict';
  const coque = (corps, haut = true) => {
    document.body.innerHTML = `<main id="app">${haut ? `<header class="pub-haut"><a class="marque" href="../"><img src="img/logo.svg" alt="">ILO Central · Gestion</a>
      <div class="actions"><a class="btn" href="../">← ILO Central</a></div></header>` : ''}<div class="carte-auth"><div class="carte">${corps}</div></div></main>`;
  };
  const ecranConnexion = () => {
    coque(`<h1>Gestion · ILO Central</h1><p class="muted">Espace privé de l’administrateur : clients, devis, factures et comptabilité des entreprises de l’écosystème.</p>
      <form class="f" id="fCo"><label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label><button class="btn btn-p">Se connecter</button></form>`);
    $('#fCo').addEventListener('submit', async e => {
      e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)), b = $('button', e.target); b.disabled = true;
      try { await q(sb.auth.signInWithPassword({ email: d.email.trim(), password: d.mdp })); await chargerSession(); aller('#/'); }
      catch (err) { toast(erreur(err), true); b.disabled = false; }
    });
  };
  const ecranReserve = () => {
    coque(`<h1>Espace réservé</h1><p class="muted">La gestion d’ILO Central est réservée à l’administrateur de l’écosystème. Votre compte n’y a pas accès.</p>
      <div class="actions"><a class="btn btn-p" href="../">Retour</a><button class="btn" id="deco3">Se déconnecter</button></div>`);
    $('#deco3').onclick = async () => { await sb.auth.signOut(); await chargerSession(); rendre(); };
  };
  // appelé par rendre() avant tout : renvoie une promesse (écran affiché) ou rien (accès autorisé)
  NX.garde = nom => {
    if (!PRET) return null;
    if (!moi) return Promise.resolve(ecranConnexion());
    if (profil?.role !== 'admin') return Promise.resolve(ecranReserve());
    if (['connexion', 'inscription', 'invitation', 'client'].includes(nom)) return Promise.resolve(aller('#/'));
    return null;
  };
  // aucune entreprise interne visible (SQL non installé, ou compte qui n'en est pas membre)
  NX.publiques.bienvenue = async () => {
    coque(`<h1>Aucune entreprise</h1><p class="muted">Aucune entreprise de l’écosystème n’est reliée à votre compte. Dans ILO Central, ouvrez « Mes entreprises » et créez-les d’abord.</p>
      <div class="actions"><a class="btn btn-p" href="../#/entreprises">Mes entreprises</a></div>`);
  };
  // thème d'ILO Central : barre latérale sombre et accent bleu-vert, sur le design de NEXORA
  const st = document.createElement('style');
  st.textContent = 'html[data-mode=central]{--profond:#0E7490;--cyan-f:#0E7490}html[data-mode=central] .side{background:#15171C}html[data-mode=central] #versCentral{margin-bottom:6px;border-bottom:1px solid #2A2E37}';
  document.head.appendChild(st);
});
