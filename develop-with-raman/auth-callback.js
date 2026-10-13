document.addEventListener('DOMContentLoaded', async () => {
  const title=document.querySelector('#callback-title');
  const message=document.querySelector('#callback-message');
  const action=document.querySelector('#callback-action');
  const fail=(heading,detail)=>{title.textContent=heading;message.textContent=detail;action.hidden=false;};
  const params=new URLSearchParams(location.search);
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const error=params.get('error_description')||params.get('error')||hash.get('error_description')||hash.get('error');
  if(error){
    const code=params.get('error_code')||hash.get('error_code')||'';
    const detail=String(error);
    const normalized=detail.toLowerCase();
    let friendly=detail;
    if(code==='provider_disabled'||/provider.*not enabled|unsupported provider/i.test(detail)){
      friendly='Social sign-in is not enabled yet. The site owner must enable the provider and save its OAuth client ID and client secret in Supabase Authentication settings.';
    }else if(/redirect_uri_mismatch|redirect uri.*match|redirect_uri/i.test(normalized)){
      friendly='The OAuth provider rejected its callback URL. The site owner must set the provider callback to https://nmqntqxvficakxkticxc.supabase.co/auth/v1/callback and allow the website callback URL in Supabase Authentication URL Configuration.';
    }else if(/invalid_client|client secret|client_id/i.test(normalized)){
      friendly='The OAuth credentials may be missing or incorrect. The site owner must verify the provider client ID and client secret in Supabase Authentication settings.';
    }else if(/access_denied|user denied|cancelled|canceled/i.test(normalized)){
      friendly='Sign-in was cancelled. Return to the sign-in page and try again.';
    }
    fail('Sign-in could not be completed',friendly);
    return;
  }
  if(!window.supabaseClient?.auth){fail('Authentication service unavailable','Please reload this page. If the problem continues, contact the site owner.');return;}
  try{
    const {data,error}=await window.supabaseClient.auth.getSession();
    if(error)throw error;
    if(!data.session){fail('No active session found','The sign-in link may have expired or the provider may not be configured. Return to sign in and try again.');return;}
    title.textContent='You’re signed in';
    message.textContent='Taking you to your workspace…';
    let role='client';
    try{const {data:profile}=await window.supabaseClient.from('profiles').select('role').eq('id',data.session.user.id).maybeSingle();role=profile?.role||'client';}catch(_e){}
    let next=null;
    try{next=sessionStorage.getItem('dwr-auth-next');sessionStorage.removeItem('dwr-auth-next');}catch(_e){}
    const safe=next&&next.startsWith('/')&&!next.startsWith('//')&&!next.includes('\\')&&!/^\/(?:auth|login)/i.test(next)?next:null;
    let dest=role==='admin'?'/admin-portal.html':'/client-dashboard.html';
    if(safe){dest=(role==='admin'&&safe.startsWith('/client-dashboard'))?'/admin-portal.html':(role!=='admin'&&safe.startsWith('/admin-portal'))?'/client-dashboard.html':safe;}
    location.replace(dest);
  }catch(err){fail('Could not verify your session',err?.message||'Please return to sign in and try again.');}
});