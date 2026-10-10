/* Public browser config only. Publishable key is designed for browser use; RLS protects data. */
(() => {
  if(!window.supabase?.createClient){console.error('Supabase JS SDK failed to load.');return;}
  const url='https://nmqntqxvficakxkticxc.supabase.co';
  const key='sb_publishable_0hlTmV7OmeLYkBqu3MrGmg_oCdqDMGG';
  // One client per storage mode (remembered = localStorage, session-only = sessionStorage). Creating a fresh client on every
  // click would leave several clients sharing one stored session, which Supabase warns can behave unpredictably.
  const clients={};
  window.createPortalSupabaseClient=(remember=true)=>{const mode=remember?'local':'session';return clients[mode]||(clients[mode]=window.supabase.createClient(url,key,{auth:{persistSession:true,storage:remember?window.localStorage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}}));};
  const sessionMode=document.cookie.split(';').some(c=>c.trim()==='portal_session=1');
  const remember=document.querySelector('[name=remember]')?.checked!==false;
  window.supabaseClient=window.createPortalSupabaseClient(sessionMode?false:remember);
})();