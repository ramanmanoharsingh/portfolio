/* Develop with Raman — authenticated client portal.
   Reuses the existing Supabase client when exposed as window.supabaseClient.
   Otherwise configure window.SUPABASE_URL and window.SUPABASE_ANON_KEY before this script. */
(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const esc = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const toast = (message, error=false) => {
    let el = $('#portal-toast');
    if (!el) { el=document.createElement('div'); el.id='portal-toast'; el.className='portal-toast'; document.body.append(el); }
    el.textContent=message; el.dataset.error=String(error); el.classList.add('show');
    setTimeout(()=>el.classList.remove('show'),3500);
  };
  async function getClient() {
    if (window.supabaseClient?.auth) return window.supabaseClient;
    if (window.supabase?.auth && window.supabase?.from) return window.supabase;
    if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY && window.supabase?.createClient) {
      return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    }
    throw new Error('Supabase client not found. Expose your existing client as window.supabaseClient before loading client-portal.js.');
  }
  const nice = value => String(value||'').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const date = value => value ? new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—';
  async function init() {
    const root=$('[data-portal]');
    if (!root) return;
    try {
      const sb=await getClient();
      const {data:{user},error:authError}=await sb.auth.getUser();
      if(authError||!user){ location.replace('/login.html?next='+encodeURIComponent(location.pathname)); return; }
      const {data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
      if(profileError) throw profileError;
      if(!profile){ const {error}=await sb.from('profiles').upsert({id:user.id,full_name:user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'',role:'client'},{onConflict:'id'}); if(error) throw error; }
      const currentProfile=profile || {id:user.id,full_name:user.user_metadata?.full_name||user.user_metadata?.name||'',role:'client'};
      const isAdmin=currentProfile.role==='admin';
      if(root.dataset.role==='client' && currentProfile.role!=='client' && !isAdmin){ location.replace('/unauthorized.html'); return; }
      if(root.dataset.role==='admin' && !isAdmin){ location.replace('/welcome.html'); return; }
      const name=currentProfile.full_name||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'there';
      document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=name);
      document.querySelectorAll('[data-user-email]').forEach(el=>el.textContent=user.email||'');
      document.querySelectorAll('[data-user-avatar]').forEach(el=>{
        const src=currentProfile.avatar_url;
        if(src){el.innerHTML='<img alt="" src="'+esc(src)+'">';}
        else el.textContent=(name.trim()[0]||'U').toUpperCase();
      });
      const signOut=$('[data-sign-out]');
      signOut?.addEventListener('click',async()=>{await sb.auth.signOut();location.replace('/login.html');});
      if(root.dataset.page==='welcome') return;
      if(root.dataset.page==='dashboard') {
        const [projectsResult,leadsResult]=await Promise.all([
          sb.from('projects').select('id,title,status,progress,due_date,service_type,updated_at').eq('client_id',user.id).order('updated_at',{ascending:false}).limit(8),
          sb.from('leads').select('id,name,project_type,status,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(8)
        ]);
        if(projectsResult.error) throw projectsResult.error;
        if(leadsResult.error) throw leadsResult.error;
        const projects=projectsResult.data||[], leads=leadsResult.data||[];
        $('[data-metric-projects]').textContent=projects.filter(p=>!['completed','cancelled'].includes(p.status)).length;
        $('[data-metric-completed]').textContent=projects.filter(p=>p.status==='completed').length;
        $('[data-metric-requests]').textContent=leads.length;
        $('[data-metric-tasks]').textContent=projects.filter(p=>['planning','review','on_hold'].includes(p.status)).length;
        const list=$('[data-project-list]');
        list.innerHTML=projects.length?projects.map(p=>'<article class="project-row"><div class="project-symbol">↗</div><div class="project-main"><strong>'+esc(p.title)+'</strong><span>'+esc(nice(p.service_type))+' · Due '+esc(date(p.due_date))+'</span><div class="progress"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div></div><span class="status status-'+esc(p.status)+'">'+esc(nice(p.status))+'</span></article>').join(''):'<div class="empty-state"><span>✳</span><strong>No projects yet</strong><p>Your projects will appear here when one is assigned to your account.</p><a class="button button-dark" href="/#contact">Explore services</a></div>';
        const req=$('[data-request-list]');
        req.innerHTML=leads.length?leads.map(l=>'<article class="request-row"><div><strong>'+esc(l.project_type||l.name||'Project enquiry')+'</strong><span>'+esc(date(l.created_at))+'</span></div><span class="status">'+esc(nice(l.status))+'</span></article>').join(''):'<p class="muted">No linked enquiries yet.</p>';
      }
      if(root.dataset.page==='profile') {
        const form=$('#profile-form');
        const fields={full_name:currentProfile.full_name||'',phone:currentProfile.phone||'',company_name:currentProfile.company_name||'',avatar_url:currentProfile.avatar_url||'',notify_email:currentProfile.notify_email??true,notify_project_updates:currentProfile.notify_project_updates??true};
        Object.entries(fields).forEach(([key,val])=>{const el=form.elements.namedItem(key);if(el) {if(el.type==='checkbox')el.checked=Boolean(val);else el.value=val;}});
        $('[data-account-id]').textContent=user.id;
        $('[data-account-created]').textContent=date(user.created_at);
        $('[data-account-status]').textContent=user.email_confirmed_at?'Verified':'Email verification pending';
        form.addEventListener('submit',async e=>{
          e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Saving…';
          const payload={id:user.id,full_name:form.elements.full_name.value.trim(),phone:form.elements.phone.value.trim()||null,company_name:form.elements.company_name.value.trim()||null,avatar_url:form.elements.avatar_url.value.trim()||null,notify_email:form.elements.notify_email.checked,notify_project_updates:form.elements.notify_project_updates.checked,updated_at:new Date().toISOString()};
          try {const {error}=await sb.from('profiles').upsert(payload,{onConflict:'id'});if(error)throw error;toast('Profile saved successfully.');document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=payload.full_name||name);document.querySelectorAll('[data-user-avatar]').forEach(el=>{el.textContent=(payload.full_name||name).trim()[0]?.toUpperCase()||'U';});}
          catch(err){toast(err.message||'Could not save profile.',true);}
          finally{btn.disabled=false;btn.textContent='Save changes';}
        });
      }
    } catch(error) { console.error('[client portal]',error); const el=$('[data-error-message]');if(el){el.hidden=false;el.textContent='We could not load your account: '+(error.message||'Unknown error')+'. Check your Supabase client setup and database permissions.';} else toast(error.message||'Unable to load account.',true); }
  }
  document.addEventListener('DOMContentLoaded',init);
})();