document.addEventListener('DOMContentLoaded', async () => {
  const title = document.querySelector('#callback-title');
  const message = document.querySelector('#callback-message');
  const action = document.querySelector('#callback-action');
  const fail = (heading, detail) => {
    title.textContent = heading;
    message.textContent = detail;
    action.hidden = false;
  };
  const params = new URLSearchParams(location.search);
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const authType = params.get('type') || hash.get('type') || '';
  const error = params.get('error_description') || params.get('error') ||
    hash.get('error_description') || hash.get('error');

  if (error) {
    const code = params.get('error_code') || hash.get('error_code') || '';
    fail('Sign-in could not be completed',
      code === 'provider_disabled' || /provider.*not enabled|unsupported provider/i.test(String(error))
        ? 'Google sign-in is not enabled or its provider credentials are invalid. The site owner must check the Google provider settings in Supabase.'
        : String(error));
    return;
  }

  const client = window.supabaseClient;
  if (!client?.auth) {
    fail('Authentication service unavailable', 'Please reload this page. If the problem continues, contact the site owner.');
    return;
  }

  try {
    // Supabase processes the OAuth callback during client initialization. A code exchange
    // may finish just after this page starts, so do not fail on the first empty session.
    let { data, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    let session = data.session;

    const hasCallbackPayload = params.has('code') ||
      hash.has('access_token') || hash.has('refresh_token');

    if (!session && hasCallbackPayload) {
      session = await new Promise(resolve => {
        let settled = false;
        let timer;
        const finish = value => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          subscription?.unsubscribe();
          resolve(value || null);
        };
        const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
          if (nextSession && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
            finish(nextSession);
          }
        });
        timer = setTimeout(() => finish(null), 12000);
      });
    }

    if (!session) {
      fail('No active session found', 'The sign-in may have expired or Google could not complete authentication. Return to sign in and try again.');
      return;
    }

    if (authType === 'invite' || authType === 'recovery') {
      location.replace('/reset-password.html?mode=' + encodeURIComponent(authType));
      return;
    }

    title.textContent = 'You’re signed in';
    message.textContent = 'Opening the correct workspace…';
    location.replace('/portal.html');
  } catch (err) {
    console.error('[auth callback]', err);
    fail('Could not verify your session', err?.message || 'Please return to sign in and try again.');
  }
});
