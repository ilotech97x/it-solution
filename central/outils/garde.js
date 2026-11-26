/* ILO Central · Outils internes (26/11/2026) : prospection, rendez-vous, « Être trouvé ».
   Avant : pages du site public (ilo-tech.com/prospection.html…), cachées des moteurs mais ouvertes à tous.
   Maintenant : /central/outils/, la page reste masquée tant que le compte connecté n'est pas l'administrateur (profiles.role = 'admin'),
   avec la même session qu'ILO Central (même site, même stockage). Les données restent protégées comme avant par le code du script Google. */
(() => {
  'use strict';
  const H = document.documentElement;
  const CFG = window.KAZ_CONFIG || {};
  const sb = window.supabase && CFG.url ? window.supabase.createClient(CFG.url, CFG.cle, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: false } }) : null;
  const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pret = new Promise(r => { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', r, { once: true }); else r(); });

  const ecran = (titre, texte, avecForm) => pret.then(() => {
    document.body.className = 'garde-ecran';
    document.body.innerHTML = `<main class="garde-carte"><a class="garde-marque" href="../">ILO Central</a><h1>${e(titre)}</h1><p>${e(texte)}</p>
      ${avecForm ? `<form id="gardeForm"><label>Email<input type="email" name="email" required autocomplete="email"></label>
      <label>Mot de passe<input type="password" name="mdp" required autocomplete="current-password"></label>
      <button type="submit">Se connecter</button><p id="gardeErr" class="garde-err" role="alert"></p></form>` : `<p><a class="garde-btn" href="../">Retour à ILO Central</a> <button type="button" id="gardeDeco">Se déconnecter</button></p>`}</main>`;
    H.classList.remove('garde-attente');
    const f = document.getElementById('gardeForm');
    if (f) f.addEventListener('submit', async ev => {
      ev.preventDefault(); const d = new FormData(f), b = f.querySelector('button'); b.disabled = true;
      const { error } = await sb.auth.signInWithPassword({ email: String(d.get('email')).trim(), password: String(d.get('mdp')) });
      if (error) { document.getElementById('gardeErr').textContent = 'Connexion refusée : email ou mot de passe incorrect.'; b.disabled = false; return; }
      location.reload();
    });
    const deco = document.getElementById('gardeDeco');
    if (deco) deco.addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
  });

  const verifier = async () => {
    if (!sb) return ecran('Indisponible', 'La connexion à ILO Central n’a pas pu démarrer. Rechargez la page.', false);
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return ecran('Outils internes · ILO Central', 'Espace réservé à l’administrateur de l’écosystème. Connectez-vous avec votre compte ILO Central.', true);
    const { data: p } = await sb.from('profiles').select('role').eq('id', session.user.id).maybeSingle();
    if (p?.role !== 'admin') return ecran('Espace réservé', 'Ces outils sont réservés à l’administrateur de l’écosystème. Votre compte n’y a pas accès.', false);
    await pret;
    H.classList.remove('garde-attente');
    // bouton « Se déconnecter » de la page rendez-vous (avant : onclick en ligne, interdit par la règle de sécurité script-src 'self')
    document.getElementById('logout')?.addEventListener('click', () => { if (typeof window.logout === 'function') window.logout(); });
  };
  verifier().catch(() => ecran('Indisponible', 'Impossible de vérifier votre compte. Vérifiez votre connexion puis rechargez la page.', false));
})();
