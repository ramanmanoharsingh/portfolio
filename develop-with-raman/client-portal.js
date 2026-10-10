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
    const root=$('[data-page="dashboard"]');
    const load=async(table,select,order='created_at')=>{const r=await sb.from(table).select(select).order(order,{ascending:false}).limit(100);if(r.error)throw r.error;return r.data||[];};
    const {data:projects,error:projectError}=await sb.from('projects').select('id,title,description,service_type,status,progress,due_date,live_url,updated_at').eq('client_id',user.id).order('updated_at',{ascending:false}).limit(100);if(projectError)throw projectError;
    const ids=(projects||[]).map(p=>p.id);
    let milestones=[],deliverables=[];
    if(ids.length){const [m,d]=await Promise.all([sb.from('milestones').select('id,project_id,title,description,status,due_date,sort_order,progress,approved_at,deliverable_url').in('project_id',ids).order('sort_order'),sb.from('deliverables').select('id,project_id,title,description,file_url,status,created_at').in('project_id',ids).order('created_at',{ascending:false})]);if(m.error)throw m.error;if(d.error)throw d.error;milestones=m.data||[];deliverables=d.data||[];}
    const [invoices,proposals]=await Promise.all([sb.from('invoices').select('id,project_id,invoice_number,description,amount,currency,status,issued_at,due_at,paid_at,payment_url').eq('client_id',user.id).order('issued_at',{ascending:false}),sb.from('proposals').select('id,title,description,status,budget,timeline,created_at').eq('client_id',user.id).order('created_at',{ascending:false})]);
    if(invoices.error)throw invoices.error;if(proposals.error)throw proposals.error;
    const inv=invoices.data||[],props=proposals.data||[],active=(projects||[]).filter(p=>!['completed','cancelled'].includes(p.status));
    $('[data-metric-projects]').textContent=active.length;
    const pendingMilestones=milestones.filter(m=>m.status==='submitted_for_approval').length;
    const pendingInvoices=inv.filter(i=>['pending','overdue'].includes(i.status));
    $('[data-metric-completed]').textContent=pendingMilestones;
    const requestsMetric=$('[data-metric-requests]');if(requestsMetric)requestsMetric.textContent=props.filter(p=>['submitted','reviewing','quoted'].includes(p.status)).length;
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
    // Client activity is built from real, RLS-protected records already loaded above.
    // Read markers are per-account and per-browser; the activity itself is never fabricated.
    const updateItems=[];
    const addUpdate=(key,title,detail,when,tab,kind='update')=>updateItems.push({key,title,detail,when,tab,kind});
    props.forEach(p=>addUpdate('proposal:'+p.id+':'+p.status,'Request: '+(p.title||'Project enquiry'),'Request status: '+nice(p.status),p.created_at,'requests','request'));
    (projects||[]).forEach(p=>addUpdate('project:'+p.id+':'+p.status+':'+(p.updated_at||''),'Project: '+(p.title||'Project'),'Project status: '+nice(p.status),p.updated_at,'projects','project'));
    milestones.forEach(m=>{
      const meaningful=['submitted_for_approval','approved','completed','blocked'].includes(m.status);
      if(meaningful)addUpdate('milestone:'+m.id+':'+m.status,'Milestone: '+(m.title||'Project milestone'),m.status==='submitted_for_approval'?'Your review is needed':('Milestone status: '+nice(m.status)),m.approved_at||m.due_date,'projects','milestone');
    });
    deliverables.forEach(d=>addUpdate('deliverable:'+d.id,'New deliverable: '+(d.title||'Shared file'),'A project file is available in your dashboard.',d.created_at,'projects','deliverable'));
    inv.forEach(i=>{
      if(['pending','overdue','paid'].includes(i.status))addUpdate('invoice:'+i.id+':'+i.status,'Invoice '+(i.invoice_number||''),i.status==='overdue'?'This invoice is overdue.':i.status==='pending'?'An invoice is awaiting payment.':'Payment recorded.',i.issued_at||i.due_at,'billing','invoice');
    });
    updateItems.sort((a,b)=>(new Date(b.when||0).getTime()||0)-(new Date(a.when||0).getTime()||0));
    const updatesKey='dwr-client-updates-read-v1:'+user.id;
    const readUpdates=()=>{try{return new Set(JSON.parse(localStorage.getItem(updatesKey)||'[]'));}catch(_error){return new Set();}};
    const renderUpdates=()=>{
      const read=readUpdates(),list=$('[data-notification-list]'),badge=$('[data-notification-count]');
      const unread=updateItems.filter(item=>!read.has(item.key)).length;
      if(badge){badge.textContent=String(unread);badge.hidden=unread===0;}
      if(!list)return;
      list.innerHTML=updateItems.length?updateItems.slice(0,30).map(item=>'<a class="client-update-row'+(read.has(item.key)?' is-read':'')+'" href="#'+esc(item.tab)+'" data-update-tab="'+esc(item.tab)+'" data-update-key="'+esc(item.key)+'"><span class="client-update-icon" aria-hidden="true">'+(item.kind==='invoice'?'₹':item.kind==='deliverable'?'↧':item.kind==='milestone'?'✓':item.kind==='project'?'↗':'•')+'</span><span class="client-update-copy"><strong>'+esc(item.title)+'</strong><span>'+esc(item.detail)+'</span><small>'+esc(date(item.when))+'</small></span>'+(read.has(item.key)?'':'<span class="client-update-unread" aria-label="Unread"></span>')+'</a>').join(''):'<div class="empty-state"><span>✓</span><strong>You are all caught up</strong><p>New project and request activity will appear here.</p></div>';
    };
    renderUpdates();
    $('[data-mark-updates-read]')?.addEventListener('click',()=>{
      try{localStorage.setItem(updatesKey,JSON.stringify(updateItems.map(item=>item.key)));}catch(_error){}
      renderUpdates();toast('All current updates marked as read.');
    });
    $('[data-notification-list]')?.addEventListener('click',event=>{
      const link=event.target.closest('[data-update-tab]');if(!link)return;
      event.preventDefault();
      const tab=link.dataset.updateTab;
      const button=$('[data-dashboard-tab="'+tab+'"]');
      if(button)button.click();
      const key=link.dataset.updateKey;
      if(key){const read=readUpdates();read.add(key);try{localStorage.setItem(updatesKey,JSON.stringify([...read]));}catch(_error){}renderUpdates();}
      history.replaceState(null,'',location.pathname+'#'+(tab==='requests'?'requests':tab==='billing'?'billing':'projects'));
    });

    document.querySelectorAll('[data-dashboard-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-dashboard-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',String(x===b));});document.querySelectorAll('[data-dashboard-panel]').forEach(p=>p.hidden=p.dataset.dashboardPanel!==b.dataset.dashboardTab);}));
    const modal=$('#proposal-modal');
    const proposalForm=$('#proposal-form');
    document.querySelectorAll('[data-open-proposal]').forEach(b=>b.addEventListener('click',()=>{
      modal.hidden=false;
      (proposalForm?.elements.title||modal.querySelector('input'))?.focus();
    }));
    modal?.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>modal.hidden=true));
    modal?.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal&&!modal.hidden)modal.hidden=true;});

    // A service selected on the public site opens this same authenticated request form.
    const queryParams=new URLSearchParams(location.search);
    const requestedService=queryParams.get('service')||'';
    const requestedProject=queryParams.get('project')||'';
    const requestedSummary=queryParams.get('summary')||'';
    const requestedTitle=queryParams.get('title')||(requestedProject?'Build inspired by '+requestedProject:'');
    const openRequestedForm=queryParams.get('request')==='1';
    const submittedFromRequest=queryParams.get('submitted')==='1';
    const dashboardDraftKey='dwr-client-proposal-draft-v1';
    let dashboardDraft=null;
    try{dashboardDraft=JSON.parse(sessionStorage.getItem(dashboardDraftKey)||'null');}catch(_error){}
    const serviceField=$('#brief-service');
    const titleField=$('#brief-title');
    const descriptionField=$('#brief-description');
    const budgetField=$('#brief-budget');
    const timelineField=$('#brief-timeline');
    const serviceFromDraft=typeof dashboardDraft?.service==='string'?dashboardDraft.service:'';
    const serviceToSelect=serviceFromDraft||requestedService;
    if(serviceField&&serviceToSelect){
      serviceField.value=[...serviceField.options].some(option=>option.value===serviceToSelect)?serviceToSelect:'Something else';
    }
    if(proposalForm&&dashboardDraft){
      if(typeof dashboardDraft.title==='string'&&dashboardDraft.title.trim())titleField.value=dashboardDraft.title;
      if(typeof dashboardDraft.description==='string')descriptionField.value=dashboardDraft.description;
      if(typeof dashboardDraft.budget==='string'||typeof dashboardDraft.budget==='number')budgetField.value=String(dashboardDraft.budget);
      if(typeof dashboardDraft.timeline==='string')timelineField.value=dashboardDraft.timeline;
    }
    if(requestedTitle&&titleField&&!titleField.value.trim())titleField.value=requestedTitle;
    if(requestedProject&&descriptionField&&!descriptionField.value.trim()){
      const context=[ 'I would like a build inspired by: '+requestedProject ];
      if(requestedSummary)context.push('Reference project summary: '+requestedSummary);
      context.push('What I would change or add: ');
      descriptionField.value=context.join(String.fromCharCode(10)+String.fromCharCode(10));
    }
    if(serviceToSelect&&titleField&&!titleField.value.trim()){
      titleField.value=serviceField?.value?serviceField.value+' enquiry':'New project enquiry';
    }
    serviceField?.addEventListener('change',()=>{
      if(titleField&&!titleField.value.trim()&&serviceField.value)titleField.value=serviceField.value+' enquiry';
    });
    if(openRequestedForm){
      modal.hidden=false;
      (titleField||modal.querySelector('input'))?.focus();
      // The selected service is already in the form, so refresh/back won't reopen a duplicate form.
      history.replaceState(null,'',location.pathname+(location.hash||''));
    }
    if(submittedFromRequest){
      $('[data-dashboard-tab="requests"]')?.click();
      toast('Project request submitted. It is now listed in Project requests.');
      history.replaceState(null,'',location.pathname+'#requests');
    }

    proposalForm?.addEventListener('submit',async e=>{
      e.preventDefault();
      const form=e.currentTarget,btn=form.querySelector('[type=submit]');
      if(btn.disabled)return;
      btn.disabled=true;
      try{
        const serviceName=String(form.elements.service?.value||'').trim();
        const title=String(form.elements.title.value||'').trim();
        const rawDescription=String(form.elements.description.value||'').trim();
        const description=['Requested service: '+(serviceName||'Something else'),'',rawDescription].join(String.fromCharCode(10));
        const data={
          client_id:user.id,
          title,
          description,
          budget:form.elements.budget.value?Number(form.elements.budget.value):null,
          timeline:form.elements.timeline.value.trim()||null,
          status:'submitted'
        };
        if(!serviceName)throw new Error('Choose the service you are enquiring about.');
        if(data.title.length<3||rawDescription.length<20)throw new Error('Add a title and at least 20 characters describing your project.');
        if(data.description.length>12000)throw new Error('Please shorten the project brief slightly and submit again.');
        const {error}=await sb.from('proposals').insert(data);
        if(error)throw error;
        try{sessionStorage.removeItem(dashboardDraftKey);sessionStorage.removeItem('dwr-project-enquiry-draft-v1');}catch(_error){}
        form.reset();
        modal.hidden=true;
        location.replace('/client-dashboard.html?submitted=1#requests');
      }catch(err){
        toast(err.message||'Could not submit the brief.',true);
      }finally{
        btn.disabled=false;
      }
    });
  }
  document.addEventListener('DOMContentLoaded',init);
})();