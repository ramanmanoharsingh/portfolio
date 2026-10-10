/* Keep homepage account navigation aligned with the dedicated Supabase portal. */
(() => {
  const links = [
    document.getElementById('nav-auth-action'),
    document.getElementById('menu-auth-action')
  ].filter(Boolean);

  const applySession = user => {
    const signedIn = Boolean(user);
    for (const link of links) {
      link.textContent = signedIn ? 'My workspace' : 'Sign in';
      link.href = signedIn ? '/welcome.html' : '/auth.html';
      link.setAttribute('aria-label', signedIn ? 'Open your workspace' : 'Sign in to your account');
      link.dataset.signedIn = String(signedIn);
    }
  };

  const supabase = window.supabaseClient;
  if (!supabase?.auth) {
    applySession(null);
    return;
  }

  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (!error) applySession(data?.session?.user || null);
    })
    .catch(() => {});

  supabase.auth.onAuthStateChange((_event, session) => {
    applySession(session?.user || null);
  });
})();
