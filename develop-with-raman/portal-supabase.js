/* Public browser configuration only. Supabase publishable/anon keys are designed for browser use;
   database security must be enforced by RLS. Never put service_role keys here. */
(() => {
  if (!window.supabase?.createClient) {
    console.error('Supabase JS SDK failed to load.');
    return;
  }
  const url = 'https://nmqntqxvficakxkticxc.supabase.co';
  const key = 'sb_publishable_0hlTmV7OmeLYkBqu3MrGmg_oCdqDMGG';
  window.supabaseClient = window.supabase.createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
})();