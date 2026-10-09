/* Public browser config only. Publishable key is designed for browser use; RLS protects data. */
(() => {
  if(!window.supabase?.createClient){console.error('Supabase JS SDK failed to load.');return;}
  const url='https://nmqntqxvficakxkticxc.supabase.co';
  const key='sb_publishable_0hlTmV7OmeLYkBqu3MrGmg_oCdqDMGG';
  window.createPortalSupabaseClient=(remember=true)=>window.supabase.createClient(url,key,{auth:{persistSession:true,storage:remember?window.localStorage:window.sessionStorage,autoRefreshToken:true,detectSessionInUrl:true}});
  const sessionMode=document.cookie.split(';').some(c=>c.trim()==='portal_session=1');
  const remember=document.querySelector('[name=remember]')?.checked!==false;
  window.supabaseClient=window.createPortalSupabaseClient(sessionMode?false:remember);
})();