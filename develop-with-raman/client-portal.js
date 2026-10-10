/* Develop with Raman — Supabase-backed portal. Authorization is enforced by database RLS. */
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const nice=s=>String(s||'').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const date=s=>s?new Date(s).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}):'—';
  const safeUrl=s=>{try{const u=new URL(String(s||''),location.origin);return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const money=(amount,currency='INR')=>new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(amount)||0);
  function toast(msg,error=false){let el=$('#portal-toast');if(!el){el=document.createElement('div');el.id='portal-toast';el.className='portal-toast';document.body.append(el);}el.textContent=msg;el.dataset.error=String(error);el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500);}
  function sameSiteNext(){const candidate=new URLSearchParams(location.search).get('next')||'/welcome.html';return candidate.startsWith('/')&&!candidate.startsWith('//')&&!candidate.includes('\\')?candidate:'/welcome.html';}
  async function init(){
    const root=$('[data-portal]');if(!root)return;
    try{
      const sb=window.supabaseClient;
      if(!sb?.auth)throw new Error('Supabase client not configured. Check portal-supabase.js and the Supabase SDK.');
      const {data:{user},error:authError}=await sb.auth.getUser();
      if(authError||!user){location.replace('/auth.html?next='+encodeURIComponent(location.pathname+location.search));return;}
      let {data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
      if(profileError)throw profileError;
      if(!profile){const {error}=await sb.from('profiles').insert({id:user.id,full_name:user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'',role:'client'});if(error)throw error;({data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',user.id).single());if(profileError)throw profileError;}
      const role=profile.role||'client';
      if(root.dataset.role==='admin'&&role!=='admin'){location.replace('/client-dashboard.html');return;}
      if(root.dataset.role==='client'&&role==='admin'&&root.dataset.page!=='welcome'){location.replace('/admin-portal.html');return;}
      const name=profile.full_name||user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'there';
      document.querySelectorAll('[data-user-name]').forEach(e=>e.textContent=name);
      document.querySelectorAll('[data-user-email]').forEach(e=>{if('value' in e)e.value=user.email||'';else e.textContent=user.email||'';});
      document.querySelectorAll('[data-user-avatar]').forEach(e=>{if(safeUrl(profile.avatar_url)){const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=safeUrl(profile.avatar_url);e.replaceChildren(img);}else e.textContent=(name.trim()[0]||'U').toUpperCase();});
      $('[data-sign-out]')?.addEventListener('click',async()=>{const {error}=await sb.auth.signOut();if(error){toast(error.message,true);return;}location.replace('/auth.html');});
      if(root.dataset.page==='welcome'){if(role==='admin'){location.replace('/admin-portal.html');return;}document.querySelectorAll('[data-dashboard-link]').forEach(a=>a.href='/client-dashboard.html');return;}
      if(root.dataset.page==='profile'){await setupProfile(sb,user,profile,name);return;}
      if(root.dataset.page==='dashboard'){await setupDashboard(sb,user,profile);return;}
    }catch(error){console.error('[client portal]',error);const el=$('[data-error-message]');if(el){el.hidden=false;el.textContent='We could not load your account: '+(error.message||'Unknown error')+'.';}else toast(error.message||'Unable to load account.',true);}
  }
  async function setupProfile(sb,user,profile,name){
    const form=$('#profile-form');if(!form)return;
    const fields={full_name:profile.full_name||'',phone:profile.phone||'',company_name:profile.company_name||'',avatar_url:profile.avatar_url||'',notify_email:profile.notify_email??true,notify_project_updates:profile.notify_project_updates??true};
    Object.entries(fields).forEach(([k,v])=>{const el=form.elements.namedItem(k);if(el){if(el.type==='checkbox')el.checked=Boolean(v);else el.value=v;}});
    $('[data-account-id]').textContent=user.id;$('[data-account-created]').textContent=date(user.created_at);$('[data-account-status]').textContent=user.email_confirmed_at?'Verified':'Email verification pending';
    form.addEventListener('submit',async e=>{e.preventDefault();const btn=form.querySelector('[type=submit]');btn.disabled=true;try{const payload={id:user.id,full_name:form.elements.full_name.value.trim(),phone:form.elements.phone.value.trim()||null,company_name:form.elements.company_name.value.trim()||null,avatar_url:safeUrl(form.elements.avatar_url.value.trim())||null,notify_email:form.elements.notify_email.checked,notify_project_updates:form.elements.notify_project_updates.checked,updated_at:new Date().toISOString()};const {error}=await sb.from('profiles').update(payload).eq('id',user.id);if(error)throw error;toast('Profile saved successfully.');document.querySelectorAll('[data-user-name]').forEach(el=>el.textContent=payload.full_name||name);document.querySelectorAll('[data-user-avatar]').forEach(el=>{if(payload.avatar_url){const img=document.createElement('img');img.alt='';img.src=payload.avatar_url;el.replaceChildren(img);}else el.textContent=(payload.full_name||name).trim()[0]?.toUpperCase()||'U';});}catch(err){toast(err.message||'Could not save profile.',true);}finally{btn.disabled=false;btn.textContent='Save changes';}});
    $('#password-change-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;const password=form.elements.new_password.value;if(password.length<8){toast('Password must contain at least 8 characters.',true);return;}const {error}=await sb.auth.updateUser({password});if(error)toast(error.message,true);else{form.reset();toast('Password updated.');}});
  }
  async function setupDashboard(sb,user,profile){
    try{const {error:attachError}=await sb.rpc('attach_pending_projects');if(attachError)console.warn('[pending project attach]',attachError.message);}catch(err){console.warn('[pending project attach]',err);}
    const root=$('[data-page="dashboard"]');
    const load=async(table,select,order='created_at')=>{const r=await sb.from(table).select(select).order(order,{ascending:false}).limit(100);if(r.error)throw r.error;return r.data||[];};
    const {data:projects,error:projectError}=await sb.from('projects').select('id,title,description,service_type,status,progress,due_date,live_url,updated_at').eq('client_id',user.id).order('updated_at',{ascending:false}).limit(100);if(projectError)throw projectError;
    const ids=(projects||[]).map(p=>p.id);
    let milestones=[],deliverables=[];
    if(ids.length){const [m,d]=await Promise.all([sb.from('milestones').select('id,project_id,title,description,status,due_date,sort_order,progress,approved_at,deliverable_url').in('project_id',ids).order('sort_order'),sb.from('deliverables').select('id,project_id,title,description,file_url,status,created_at').in('project_id',ids).order('created_at',{ascending:false})]);if(m.error)throw m.error;if(d.error)throw d.error;milestones=m.data||[];deliverables=d.data||[];}
    const [invoices,proposals]=await Promise.all([sb.from('invoices').select('id,project_id,invoice_number,description,amount,currency,status,issued_at,due_at,paid_at,payment_url').eq('client_id',user.id).order('issued_at',{ascending:false}),sb.from('proposals').select('id,title,description,status,budget,timeline,created_at').eq('client_id',user.id).order('created_at',{ascending:false})]);
    if(invoices.error)throw invoices.error;if(proposals.error)throw proposals.error;
    const [leadResult,notificationResult]=await Promise.all([
      sb.from('leads').select('id,name,email,project_type,budget_range,description,status,submitter_type,created_at,read_at,project_id').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
      sb.from('notifications').select('id,type,title,body,link,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100)
    ]);
    if(leadResult.error)throw leadResult.error;
    if(notificationResult.error)throw notificationResult.error;
    const leads=leadResult.data||[], notifications=notificationResult.data||[];
    let latestProjectUpdate=null;
    if(ids.length){
      const {data:updates,error:updateError}=await sb.from('project_updates').select('id,project_id,message,created_at').in('project_id',ids).order('created_at',{ascending:false}).limit(1);
      if(updateError)throw updateError;
      latestProjectUpdate=updates?.[0]||null;
    }
    const inv=invoices.data||[],props=proposals.data||[],active=(projects||[]).filter(p=>!['completed','cancelled'].includes(p.status));
    $('[data-metric-projects]').textContent=active.length;
    const pendingMilestones=milestones.filter(m=>m.status==='submitted_for_approval').length;
    const pendingInvoices=inv.filter(i=>['pending','overdue'].includes(i.status));
    $('[data-metric-completed]').textContent=pendingMilestones;
    const requestsMetric=$('[data-metric-requests]');if(requestsMetric)requestsMetric.textContent=leads.length+props.filter(p=>['submitted','reviewing','quoted'].includes(p.status)).length;
    const tasksMetric=$('[data-metric-tasks]');if(tasksMetric)tasksMetric.textContent=pendingInvoices.length;
    const total=inv.filter(i=>i.status==='paid').reduce((n,i)=>n+Number(i.amount||0),0);
    $('[data-investment-total]')?.replaceChildren(document.createTextNode(money(total)));
    const nextDate=milestones.filter(m=>m.due_date&&!['completed','approved'].includes(m.status)).map(m=>m.due_date).sort()[0];
    const dateEl=$('[data-next-milestone]');if(dateEl)dateEl.textContent=date(nextDate);
    const projectBoxes=document.querySelectorAll('[data-project-list]');
    projectBoxes.forEach(projectBox=>projectBox.innerHTML=(projects||[]).length?(projects||[]).map(p=>'<article class="project-row"><div class="project-symbol">↗</div><div class="project-main"><strong>'+esc(p.title||'Project')+'</strong><span>'+esc(nice(p.service_type))+' · Due '+esc(date(p.due_date))+'</span><div class="progress"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div><small class="muted">'+Math.max(0,Math.min(100,Number(p.progress)||0))+'% complete</small></div><span class="status status-'+esc(p.status)+'">'+esc(nice(p.status))+'</span></article>').join(''):'<div class="empty-state"><span>✳</span><strong>No projects yet</strong><p>Submit a brief to start your next project.</p></div>');
    const msBox=$('[data-milestone-list]');if(msBox)msBox.innerHTML=milestones.length?milestones.map(m=>'<article class="request-row"><div><strong>'+esc(m.title)+'</strong><span>'+esc(date(m.due_date))+' · '+esc(nice(m.status))+'</span><div class="progress"><i style="width:'+Math.max(0,Math.min(100,Number(m.progress)||0))+'%"></i></div>'+(safeUrl(m.deliverable_url)?'<p><a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(m.deliverable_url))+'">View milestone deliverable ↗</a></p>':'')+'</div>'+(m.status==='submitted_for_approval'?'<button class="button button-dark" data-approve-milestone="'+esc(m.id)+'">Approve</button>':'<span class="status">'+esc(nice(m.status))+'</span>')+'</article>').join(''):'<p class="muted">Milestones appear when a project is assigned.</p>';
    msBox?.querySelectorAll('[data-approve-milestone]').forEach(b=>b.addEventListener('click',async()=>{b.disabled=true;const {error}=await sb.from('milestones').update({status:'approved',approved_at:new Date().toISOString()}).eq('id',b.dataset.approveMilestone);if(error){toast(error.message,true);b.disabled=false;}else{toast('Milestone approved.');location.reload();}}));
    const invBox=$('[data-invoice-list]');if(invBox)invBox.innerHTML=inv.length?'<div class="table-scroll"><table class="portal-table"><thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>'+inv.map(i=>'<tr><td>'+esc(i.invoice_number)+'<small>'+esc(i.description)+'</small></td><td>'+esc(date(i.issued_at))+'</td><td>'+esc(date(i.due_at))+'</td><td>'+esc(money(i.amount,i.currency||'INR'))+'</td><td><span class="status status-'+esc(i.status)+'">'+esc(nice(i.status))+'</span></td><td>'+(safeUrl(i.payment_url)?'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeUrl(i.payment_url))+'">Pay ↗</a>':'')+'</td></tr>').join('')+'</tbody></table></div><button class="button" data-print-invoices style="margin-top:14px">Print invoice summary ↗</button>':'<p class="muted">No invoices have been issued yet.</p>';
    $('[data-print-invoices]')?.addEventListener('click',()=>{const w=window.open('','_blank');if(!w){toast('Allow pop-ups to print the invoice summary.',true);return;}w.opener=null;w.document.write('<!doctype html><html><head><title>Invoice summary</title><style>body{font:14px system-ui;padding:30px}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #ddd}</style></head><body><h1>Invoice summary</h1><p>Prepared '+esc(date(new Date().toISOString()))+'</p>'+invBox.querySelector('.table-scroll').innerHTML+'</body></html>');w.document.close();w.focus();w.print();});
    const dBox=$('[data-deliverable-list]');if(dBox){if(!deliverables.length)dBox.innerHTML='<p class="muted">Your shared files will appear here.</p>';else{const links=await Promise.all(deliverables.map(async d=>{const fileRef=String(d.file_url||'');let href='';if(/^https:\/\//i.test(fileRef)){href=safeUrl(fileRef);}else if(fileRef){const {data,error}=await sb.storage.from('client-deliverables').createSignedUrl(fileRef,3600);href=error?'':data?.signedUrl||'';}return '<article class="request-row"><div><strong>'+esc(d.title)+'</strong><span>'+esc(d.description||nice(d.status))+' · '+esc(date(d.created_at))+'</span></div>'+(href?'<a class="button" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Open file ↗</a>':'<span class="status">'+esc(nice(d.status))+'</span>')+'</article>';}));dBox.innerHTML=links.join('');}}
    const proposalBoxes=document.querySelectorAll('[data-proposal-list]');proposalBoxes.forEach(pBox=>pBox.innerHTML=props.length?props.map(p=>'<article class="request-row"><div><strong>'+esc(p.title)+'</strong><span>'+esc(date(p.created_at))+' · '+esc(nice(p.status))+'</span></div><span class="status">'+esc(nice(p.status))+'</span></article>').join(''):'<p class="muted">No proposals submitted yet.</p>');

    const enquiryBoxes=document.querySelectorAll('[data-enquiry-list]');
    enquiryBoxes.forEach(box=>box.innerHTML=leads.length?leads.map(l=>'<article class="request-row"><div><strong>'+esc(l.project_type||'Project enquiry')+'</strong><span>'+esc(date(l.created_at))+' · '+esc(nice(l.status||'New'))+'</span><p>'+esc(l.description)+'</p>'+(l.project_id?'<small class="muted">A project has been created from this enquiry.</small>':'')+'</div><span class="status">'+esc(nice(l.submitter_type||'client'))+'</span></article>').join(''):'<div class="empty-state"><strong>No enquiries yet</strong><p>Use “New project request” to tell Raman about your idea.</p></div>');
    const unreadNotifications=notifications.filter(n=>!n.read_at);
    const notificationCount=$('[data-notification-count]');if(notificationCount)notificationCount.textContent=String(unreadNotifications.length);
    const latestUpdateEl=$('[data-latest-update]');if(latestUpdateEl)latestUpdateEl.textContent=latestProjectUpdate?date(latestProjectUpdate.created_at):'—';
    const notificationBox=$('[data-notification-list]');
    const renderNotifications=()=>{if(notificationBox)notificationBox.innerHTML=notifications.length?notifications.map(n=>'<article class="request-row"><div><strong>'+esc(n.title)+'</strong><span>'+esc(date(n.created_at))+' · '+(n.read_at?'Read':'Unread')+'</span><p>'+esc(n.body||'')+'</p></div>'+(n.link?'<a class="button" href="'+esc(safeUrl(n.link)||'/client-dashboard.html')+'">Open ↗</a>':'')+'</article>').join(''):'<p class="muted">You are all caught up. Updates will appear here.</p>';};
    renderNotifications();
    $('[data-notification-mark-all]')?.addEventListener('click',async e=>{const btn=e.currentTarget;btn.disabled=true;try{const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);if(error)throw error;toast('Notifications marked as read.');location.reload();}catch(err){toast(err.message||'Could not update notifications.',true);}finally{btn.disabled=false;}});
    const feedbackProjects=$('[data-feedback-project-options]');
    if(feedbackProjects)feedbackProjects.innerHTML='<option value="">No project selected</option>'+(projects||[]).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title||'Project')+'</option>').join('');
    const questionForm=$('#client-question-form');
    if(questionForm){
      questionForm.elements.email.value=user.email||'';
      questionForm.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]'),status=form.querySelector('[data-question-status]');btn.disabled=true;status.textContent='Sending…';try{const {data,error}=await sb.functions.invoke('public-intake',{body:{kind:'question',website:'',email:form.elements.email.value.trim(),question:form.elements.question.value.trim()}});if(error){let detail=error.message;try{const body=await error.context?.json();if(body?.error)detail=body.error;}catch{}throw new Error(detail||'Could not send question.');}if(data?.ok!==true)throw new Error(data?.error||'Could not send question.');form.elements.question.value='';status.textContent='Question sent. Raman will reply in your workspace.';toast('Question sent.');}catch(err){status.textContent=err.message||'Could not send question.';toast(status.textContent,true);}finally{btn.disabled=false;}});
    }
    const feedbackForm=$('#client-feedback-form');
    if(feedbackForm){
      feedbackForm.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]'),status=form.querySelector('[data-feedback-status]');btn.disabled=true;status.textContent='Submitting…';try{const {data,error}=await sb.functions.invoke('public-intake',{body:{kind:'feedback',website:'',rating:Number(form.elements.rating.value),text:form.elements.text.value.trim(),service:form.elements.service.value.trim(),project_id:form.elements.project_id.value||null,display_name:profile.full_name||''}});if(error){let detail=error.message;try{const body=await error.context?.json();if(body?.error)detail=body.error;}catch{}throw new Error(detail||'Could not submit feedback.');}if(data?.ok!==true)throw new Error(data?.error||'Could not submit feedback.');form.reset();status.textContent='Feedback received. It will remain private unless approved.';toast('Feedback submitted.');}catch(err){status.textContent=err.message||'Could not submit feedback.';toast(status.textContent,true);}finally{btn.disabled=false;}});
    }
    let clientThread=null,chatMessages=[];
    const chatBox=$('[data-chat-message-list]');
    const renderChat=()=>{if(!chatBox)return;chatBox.innerHTML=chatMessages.length?chatMessages.map(m=>'<article class="request-row"><div><strong>'+esc(m.sender_id===user.id?'You':'Raman')+'</strong><span>'+esc(date(m.created_at))+(m.pending?' · Sending…':'')+'</span><p>'+esc(m.body)+'</p></div></article>').join(''):'<p class="muted">No messages yet. Send Raman a message to start the conversation.</p>';};
    const loadChat=async()=>{
      if(!clientThread)return;
      const {data,error}=await sb.from('client_messages').select('id,thread_id,sender_id,body,read_at,created_at').eq('thread_id',clientThread.id).order('created_at',{ascending:true}).limit(100);
      if(error){if(chatBox)chatBox.innerHTML='<p class="muted">Could not load messages. Please refresh and try again.</p>';return;}
      chatMessages=data||[];
      const unread=chatMessages.filter(m=>m.sender_id!==user.id&&!m.read_at);
      if(unread.length){
        const idsToRead=unread.map(m=>m.id);
        const {error:readError}=await sb.from('client_messages').update({read_at:new Date().toISOString()}).in('id',idsToRead);
        if(readError)console.warn('[chat read receipts]',readError.message);
        chatMessages=chatMessages.map(m=>unread.some(u=>u.id===m.id)?{...m,read_at:new Date().toISOString()}:m);
      }
      const unreadCount=$('[data-metric-messages]');if(unreadCount)unreadCount.textContent=String(chatMessages.filter(m=>m.sender_id!==user.id&&!m.read_at).length);
      renderChat();
    };
    try{
      const {data:existingThread,error:threadError}=await sb.from('client_threads').select('id').eq('client_id',user.id).is('project_id',null).maybeSingle();
      if(threadError)throw threadError;
      if(existingThread)clientThread=existingThread;
      else{
        const {data:newThread,error:createThreadError}=await sb.from('client_threads').insert({client_id:user.id,project_id:null}).select('id').single();
        if(createThreadError){
          const {data:retryThread,error:retryError}=await sb.from('client_threads').select('id').eq('client_id',user.id).is('project_id',null).maybeSingle();
          if(retryError||!retryThread)throw createThreadError;
          clientThread=retryThread;
        }else clientThread=newThread;
      }
      await loadChat();
      sb.channel('client-messages-'+clientThread.id).on('postgres_changes',{event:'*',schema:'public',table:'client_messages',filter:'thread_id=eq.'+clientThread.id},()=>{void loadChat();}).subscribe();
    }catch(err){if(chatBox)chatBox.innerHTML='<p class="muted">Chat is temporarily unavailable. You can still submit an enquiry or question.</p>';console.warn('[client chat]',err);}
    $('#client-message-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]'),body=form.elements.body.value.trim();if(!body||!clientThread)return;btn.disabled=true;try{const optimistic={id:'pending-'+Date.now(),sender_id:user.id,body,created_at:new Date().toISOString(),pending:true};chatMessages=[...chatMessages,optimistic];renderChat();form.elements.body.value='';const {error}=await sb.from('client_messages').insert({thread_id:clientThread.id,sender_id:user.id,body});if(error){chatMessages=chatMessages.filter(m=>m.id!==optimistic.id);form.elements.body.value=body;renderChat();throw error;}await loadChat();}catch(err){toast(err.message||'Message failed to send. Your text is back in the composer so you can retry.',true);}finally{btn.disabled=false;}});
    sb.channel('client-notifications-'+user.id).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+user.id},payload=>{const n=payload.new;if(n){notifications.unshift(n);const count=$('[data-notification-count]');if(count)count.textContent=String(notifications.filter(x=>!x.read_at).length);renderNotifications();toast('New notification: '+(n.title||'Update'));}}).subscribe();
    document.querySelectorAll('[data-dashboard-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-dashboard-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});document.querySelectorAll('[data-dashboard-panel]').forEach(p=>p.hidden=p.dataset.dashboardPanel!==b.dataset.dashboardTab);}));
    const modal=$('#proposal-modal');document.querySelectorAll('[data-open-proposal]').forEach(b=>b.addEventListener('click',()=>{modal.hidden=false;modal.querySelector('input')?.focus();}));modal?.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>modal.hidden=true));modal?.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});
    $('#proposal-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]');btn.disabled=true;try{const data={client_id:user.id,title:form.elements.title.value.trim(),description:form.elements.description.value.trim(),budget:form.elements.budget.value?Number(form.elements.budget.value):null,timeline:form.elements.timeline.value.trim()||null,status:'submitted'};if(data.title.length<3||data.description.length<20)throw new Error('Add a title and at least 20 characters describing your project.');const {error}=await sb.from('proposals').insert(data);if(error)throw error;form.reset();modal.hidden=true;toast('Project brief submitted.');location.reload();}catch(err){toast(err.message||'Could not submit the brief.',true);}finally{btn.disabled=false;}});
  }
  document.addEventListener('DOMContentLoaded',init);
})();