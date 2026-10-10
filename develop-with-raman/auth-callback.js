document.addEventListener('DOMContentLoaded', async () => {
  const title=document.querySelector('#callback-title');
  const message=document.querySelector('#callback-message');
  const action=document.querySelector('#callback-action');
  const fail=(heading,detail)=>{title.textContent=heading;message.textContent=detail;action.hidden=false;};
  const params=new URLSearchParams(location.search);
  const hash=new URLSearchParams(location.hash.replace(/^#/,''));
  const authType=params.get('type')||hash.get('type')||'';
  const error=params.get('error_description')||params.get('error')||hash.get('error_description')||hash.get('error');
  if(error){
    const code=params.get('error_code')||hash.get('error_code')||'';
    const detail=String(error);
    fail('Sign-in could not be completed',code==='provider_disabled'||/provider.*not enabled|unsupported provider/i.test(detail)
      ?'Social sign-in is not enabled in the authentication settings yet. The site owner must enable the provider and add its OAuth credentials in Supabase.'
      :detail);
    return;
  }
  if(!window.supabaseClient?.auth){fail('Authentication service unavailable','Please reload this page. If the problem continues, contact the site owner.');return;}
  try{
    const {data,error}=await window.supabaseClient.auth.getSession();
    if(error)throw error;
    if(!data.session){fail('No active session found','The sign-in link may have expired or the provider may not be configured. Return to sign in and try again.');return;}
    if(authType==='invite'||authType==='recovery'){location.replace('/reset-password.html?mode='+encodeURIComponent(authType));return;}
    title.textContent='You’re signed in';
    message.textContent='Taking you to your workspace…';
    location.replace('/portal.html');
  }catch(err){fail('Could not verify your session',err?.message||'Please return to sign in and try again.');}
});