/* Role-aware homepage workspace. Uses the existing authenticated Supabase client and database RLS. */
(function(){
  'use strict';
  const state={client:null,role:null,user:null,profile:null,section:'overview',enquiryTab:'anonymous',search:'',leads:[],projects:[],clients:[],proposals:[],messages:[],notifications:[],heroOriginal:null};
  const $=(s,r=document)=>r.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=v=>v?new Date(v).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'—';
  const initials=v=>String(v||'U').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const notice=(message,error=false)=>{const n=$('#dwr-toast');if(!n)return;n.textContent=message;n.dataset.error=String(error);n.classList.add('show');setTimeout(()=>n.classList.remove('show'),3600);};
  const labelStatus=v=>String(v||'New').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  const roleName=()=>state.role==='admin'?'Admin console':'Client workspace';
  const menu=()=>state.role==='admin'?[
    ['overview','Overview','◫'],['enquiries','Enquiries','✉'],['projects','Projects','▦'],['clients','Clients','♙'],['messages','Messages','◌'],['trends','Service trends','⌁'],['questions','Questions & answers','?'],['feedback','Feedback','☆'],['time','Time tracking','◷'],['activity','Audit & notifications','↻'],['settings','Settings','⚙']
  ]:[
    ['overview','Dashboard','◫'],['projects','My projects / status','▦'],['messages','Chat with Raman','◌'],['updates','Notifications','↻'],['requests','My enquiries','✉'],['feedback','Feedback & questions','?'],['profile','Account','♙']
  ];
  function personalizeHomepageHero(){
    const hero=$('#top');if(!hero)return;
    const copy=$('.hc p',hero),cta=$('.hc a.ex',hero);
    if(!copy||!cta)return;
    if(!state.heroOriginal)state.heroOriginal={copy:copy.textContent,ctaText:cta.textContent,ctaHref:cta.getAttribute('href')||'#work'};
    let title=$('.dwr-hero-welcome',hero);
    if(!title){title=document.createElement('h2');title.className='dwr-hero-welcome';copy.before(title);}
    const name=state.profile?.full_name||state.user?.user_metadata?.full_name||state.user?.user_metadata?.name||state.user?.email?.split('@')[0]||'there';
    title.textContent='Welcome back, '+name+'.';
    copy.textContent=state.role==='admin'?'Your portfolio, client projects, and incoming requests are ready in one place.':'Your projects, updates, and conversations are ready when you are.';
    cta.textContent=state.role==='admin'?'Open your workspace ↘':'Open my workspace ↘';
    cta.href='#dwr-role-workspace';
    hero.classList.add('dwr-client-hero');
  }
  function restoreHomepageHero(){
    const hero=$('#top');if(!hero)return;
    $('.dwr-hero-welcome',hero)?.remove();
    hero.classList.remove('dwr-client-hero');
    const copy=$('.hc p',hero),cta=$('.hc a.ex',hero);
    if(state.heroOriginal){
      if(copy)copy.textContent=state.heroOriginal.copy;
      if(cta){cta.textContent=state.heroOriginal.ctaText;cta.href=state.heroOriginal.ctaHref;}
    }
    state.heroOriginal=null;
  }
  function shell(){
    let root=$('#dwr-role-workspace');
    if(!root){
      root=document.createElement('section');root.id='dwr-role-workspace';root.setAttribute('aria-label','Authenticated workspace');
      root.innerHTML=`<div class="dwr-workspace-inner">
<header class="dwr-header"><div><div class="dwr-kicker" data-dwr-kicker>CLIENT WORKSPACE</div><h2 data-dwr-title>Your workspace.</h2><p data-dwr-subtitle>Projects, progress, and next steps.</p></div><div class="dwr-header-actions"><a class="dwr-secondary" href="/?view=public">View portfolio ↗</a><button class="dwr-primary" type="button" data-dwr-refresh>Refresh data ↻</button></div></header>
<div class="dwr-alert" role="status" aria-live="polite" hidden></div>
<div class="dwr-workspace-layout">
<aside class="dwr-sidebar"><div class="dwr-sidebar-head"><div class="dwr-eyebrow" data-dwr-role>CLIENT WORKSPACE</div><p class="dwr-sidebar-note">Your work, all in one place.</p></div><nav class="dwr-nav" aria-label="Workspace navigation"></nav><div class="dwr-sidebar-bottom"><span class="dwr-sidebar-footnote">Private workspace · Your account permissions apply.</span></div></aside>
<main class="dwr-main"><section class="dwr-content"></section></main>
</div><footer class="dwr-footer">Develop with Raman · Private workspace</footer></div><div id="dwr-toast" role="status" aria-live="polite"></div>`;
      const hero=$('#top');
      if(hero)hero.insertAdjacentElement('afterend',root);else document.body.appendChild(root);
      root.addEventListener('click',onClick);
      root.addEventListener('submit',onSubmit);
      root.addEventListener('input',onInput);
      root.addEventListener('change',onChange);
    }
    root.querySelector('.dwr-nav').innerHTML=menu().map(([id,name,ico])=>'<button type="button" class="dwr-nav-item '+(state.section===id?'active':'')+'" data-dwr-section="'+id+'"><span class="dwr-nav-icon">'+ico+'</span><span>'+name+'</span>'+(id==='questions'&&state.role==='admin'?'<i data-badge="questions"></i>':'')+(id==='feedback'&&state.role==='admin'?'<i data-badge="feedback"></i>':'')+'</button>').join('');
    $('[data-dwr-role]',root).textContent=roleName();
    document.documentElement.classList.add('dwr-portal-active');
    personalizeHomepageHero();
    render();
  }
  function setHeader(title,subtitle){$('[data-dwr-title]').textContent=title;$('[data-dwr-subtitle]').textContent=subtitle;$('[data-dwr-kicker]').textContent=roleName().toUpperCase();}
  function alertBox(message,error=false){const el=$('.dwr-alert');el.hidden=!message;el.textContent=message||'';el.dataset.error=String(error);}
  function metric(title,value,note=''){return '<article class="dwr-metric"><span>'+title+'</span><strong>'+esc(value)+'</strong><small>'+note+'</small></article>';}
  function empty(title,copy){return '<div class="dwr-empty"><span>◇</span><h3>'+title+'</h3><p>'+copy+'</p></div>';}
  function sectionCard(title,action,content){return '<section class="dwr-card"><header><h2>'+title+'</h2>'+(action||'')+'</header>'+content+'</section>';}
  function projectRows(rows){return rows.length?'<div class="dwr-table-wrap"><table><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Due</th></tr></thead><tbody>'+rows.map(p=>'<tr><td><strong>'+esc(p.title||'Untitled project')+'</strong><small>'+esc(p.id)+'</small></td><td>'+esc(p.client_name||p.client_id||'Not assigned')+'</td><td><span class="dwr-status">'+esc(labelStatus(p.status))+'</span></td><td><div class="dwr-progress"><i style="width:'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%"></i></div><small>'+Math.max(0,Math.min(100,Number(p.progress)||0))+'%</small></td><td>'+date(p.due_date||p.due_at)+'</td></tr>').join('')+'</tbody></table></div>':empty('No projects yet','Projects will appear here when they are assigned to your workspace.');}
  function leadRows(){
    const rows=state.leads.filter(l=>(state.enquiryTab==='anonymous'?!l.user_id:!!l.user_id)&&(!state.search||[l.name,l.email,l.project_type,l.description,l.status].some(v=>String(v||'').toLowerCase().includes(state.search.toLowerCase()))));
    return rows.length?'<div class="dwr-table-wrap"><table><thead><tr><th>Enquiry</th><th>Contact</th><th>Details</th><th>Received</th><th>Actions</th></tr></thead><tbody>'+rows.map(l=>'<tr><td><strong>'+esc(l.project_type||'Project enquiry')+'</strong><small>'+esc(l.id)+'</small><span class="dwr-status">'+esc(labelStatus(l.status))+'</span></td><td>'+esc(l.name)+'<small><a href="mailto:'+esc(l.email)+'">'+esc(l.email)+'</a></small></td><td><details><summary>Read original brief</summary><p class="dwr-brief">'+esc(l.description)+'</p></details><small>'+esc(l.budget_range||'Budget not specified')+' · Due '+date(l.deadline)+'</small></td><td>'+date(l.created_at)+(l.is_read?'':'<span class="dwr-unread">Unread</span>')+'</td><td><div class="dwr-actions">'+(!l.is_read?'<button class="dwr-secondary" data-mark-read="'+esc(l.id)+'">Mark read</button>':'<span class="dwr-muted">Read</span>')+'<button class="dwr-primary" data-create-project="'+esc(l.id)+'">Create project</button></div></td></tr>').join('')+'</tbody></table></div>':empty('No enquiries found','Try the other tab or clear your search.');}
  function render(){
    const root=$('#dwr-role-workspace');if(!root)return;
    root.querySelectorAll('.dwr-nav-item').forEach(b=>b.classList.toggle('active',b.dataset.dwrSection===state.section));
    const content=$('.dwr-content');let html='';
    if(state.role==='admin'){
      if(state.section==='overview'){
        setHeader('Admin overview','A live view of enquiries, projects and client activity.');
        const unread=state.leads.filter(l=>!l.is_read).length,active=state.projects.filter(p=>!['completed','cancelled'].includes(String(p.status).toLowerCase())).length;
        html='<div class="dwr-metrics">'+metric('New enquiries',unread,'Unreviewed submissions')+metric('Active projects',active,'Not marked complete')+metric('Client accounts',state.clients.length,'Registered profiles')+metric('Unread messages',state.messages.length,'Available threads')+metric('Hours this week','—','Time tracking schema not connected')+'</div>'+sectionCard('Latest enquiries','<button class="dwr-text-button" data-dwr-section="enquiries">View all ↗</button>',leadRows())+sectionCard('Project pipeline','<button class="dwr-text-button" data-dwr-section="projects">Open projects ↗</button>',projectRows(state.projects.slice(0,6)));
      }else if(state.section==='enquiries'){
        setHeader('Enquiries','Original submissions are immutable. Only the separate read flag and project reference may change.');
        html='<div class="dwr-tabs"><button data-enquiry-tab="anonymous" class="'+(state.enquiryTab==='anonymous'?'active':'')+'">Anonymous <b>'+state.leads.filter(l=>!l.user_id).length+'</b></button><button data-enquiry-tab="clients" class="'+(state.enquiryTab==='clients'?'active':'')+'">Logged-in clients <b>'+state.leads.filter(l=>!!l.user_id).length+'</b></button><label class="dwr-search"><span>⌕</span><input data-enquiry-search value="'+esc(state.search)+'" placeholder="Search enquiries"></label></div>'+sectionCard(state.enquiryTab==='anonymous'?'Anonymous enquiries':'Logged-in client enquiries','',leadRows());
      }else if(state.section==='projects'){
        setHeader('Projects','Manage the active project pipeline. Status editing remains in the dedicated admin workspace.');
        html=sectionCard('All projects','<a class="dwr-secondary" href="/admin-portal.html#projects">Open project manager ↗</a>',projectRows(state.projects));
      }else if(state.section==='clients'){
        setHeader('Clients','Registered accounts and their project activity.');
        html=sectionCard('Client directory','',state.clients.length?'<div class="dwr-table-wrap"><table><thead><tr><th>Client</th><th>Email</th><th>Projects</th><th>Joined</th><th>Workspace</th></tr></thead><tbody>'+state.clients.map(c=>'<tr><td><strong>'+esc(c.full_name||'Unnamed client')+'</strong><small>'+esc(c.company_name||'')+'</small></td><td>'+esc(c.email||'—')+'</td><td>'+state.projects.filter(p=>p.client_id===c.id).length+'</td><td>'+date(c.created_at)+'</td><td><a href="/admin-portal.html#clients">Open client manager ↗</a></td></tr>').join('')+'</tbody></table></div>':empty('No client accounts','No client profiles were returned by the database.'));
      }else if(state.section==='messages'){
        setHeader('Messages','Client conversation inbox.');
        html=sectionCard('Conversation inbox','<a class="dwr-secondary" href="/admin-portal.html">Open existing admin portal ↗</a>',empty('Message schema not verified','The current repository does not confirm a client chat table. This section will activate when the existing messaging schema is verified.'));
      }else if(state.section==='trends'){
        setHeader('Service trend report','Explore enquiry volume and conversion using real lead timestamps.');
        const counts={};state.leads.forEach(l=>{const k=l.project_type||'Unspecified';counts[k]=(counts[k]||0)+1;});
        const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
        html=sectionCard('Top requested services','',sorted.length?'<div class="dwr-bars">'+sorted.slice(0,8).map(([name,n])=>'<div><span>'+esc(name)+'</span><i><b style="width:'+Math.max(4,n/Math.max(1,sorted[0][1])*100)+'%"></b></i><strong>'+n+'</strong></div>').join('')+'</div>':empty('No trend data yet','Service totals will appear after enquiries are submitted.'))+sectionCard('Conversion','',metric('Enquiries',state.leads.length,'All recorded enquiries')+metric('Projects created from enquiries',state.leads.filter(l=>l.project_id).length,'Uses the enquiry project reference')+'<p class="dwr-muted">A time-series chart requires the service/timestamp aggregation and range controls in the next reporting pass.</p>');
      }else if(state.section==='questions'||state.section==='feedback'||state.section==='time'||state.section==='activity'||state.section==='settings'){
        const info={
          questions:['Questions & answers','Answer visitor questions and choose which answers become public.','The current main schema does not yet confirm a questions table or publish/approval fields. No fake questions are shown.'],
          feedback:['Feedback','Review ratings and approve testimonials before they appear publicly.','The current main schema does not yet confirm a feedback table or testimonial approval fields.'],
          time:['Time tracking','Track time by project with timer and manual entries.','A time-entry table is not present in the verified schema. Hours and billable totals are intentionally not fabricated.'],
          activity:['Audit & notifications','Review administrative activity and important updates.','A durable audit-log schema is not verified. Recent enquiry/project data is available in Overview.'],
          settings:['Settings','Account details, export and access controls.','Profile and role changes must remain backed by verified administrator permissions. Use the existing protected portal for current account controls.']
        }[state.section];setHeader(info[0],info[1]);html=sectionCard(info[0],'',empty('Backend schema required',info[2])+'<p class="dwr-muted">This section is visible in the navigation, but will not pretend to save data until its database tables and row-level security policies are in place.</p>');
      }
    }else{
      if(state.section==='overview'){
        const clientName=state.profile?.full_name||state.user?.user_metadata?.full_name||state.user?.user_metadata?.name||state.user?.email?.split('@')[0]||'there';
        setHeader('Your dashboard','A clear view of your requests, projects and next steps.');
        html='<div class="dwr-metrics">'+metric('My projects',state.projects.length,'Assigned to your account')+metric('My requests',state.proposals.length,'Project briefs submitted')+metric('Unread updates',state.notifications.length,'Available in your workspace')+'</div>'+sectionCard('My projects','<button class="dwr-text-button" data-dwr-section="projects">View projects ↗</button>',projectRows(state.projects)) +sectionCard('Recent requests','<button class="dwr-text-button" data-dwr-section="requests">View requests ↗</button>',state.proposals.length?'<div class="dwr-list">'+state.proposals.slice(0,5).map(p=>'<article><div><strong>'+esc(p.title)+'</strong><p>'+esc((p.description||'').slice(0,170))+'</p></div><span class="dwr-status">'+esc(labelStatus(p.status))+'</span><small>'+date(p.created_at)+'</small></article>').join('')+'</div>':empty('No requests yet','Choose a service from the portfolio and submit a project brief.'))+'<div class="dwr-cta"><div><strong>Have another idea?</strong><p>Choose a service and send a brief. Your request will be saved to this account.</p></div><a class="dwr-primary" href="/?view=public&flow=services#services">Explore services ↗</a></div>';
      }else if(state.section==='projects'){
        setHeader('My projects','Track your assigned projects and progress.');
        html=sectionCard('Project progress','',projectRows(state.projects));
      }else if(state.section==='requests'){
        setHeader('My requests','Your project briefs and their latest status.');
        html=sectionCard('Project requests','<a class="dwr-primary" href="/?view=public&flow=services#services">＋ New request</a>',state.proposals.length?'<div class="dwr-list">'+state.proposals.map(p=>'<article><div><strong>'+esc(p.title)+'</strong><p>'+esc(p.description)+'</p></div><span class="dwr-status">'+esc(labelStatus(p.status))+'</span><small>'+date(p.created_at)+'</small></article>').join('')+'</div>':empty('No requests submitted','Browse services to start a request.')) ;
      }else if(state.section==='messages'){
        setHeader('Messages','Your direct conversation with Raman.');
        html=sectionCard('Conversation','',empty('Messaging setup pending','Use the email contact link below until a private chat table and policies are configured.')+'<p><a class="dwr-primary" href="mailto:ramanmanoharsingh@gmail.com">Email Raman ↗</a></p>');
      }else if(state.section==='updates'){
        setHeader('Notifications','Project and request updates for your account.');
        html=sectionCard('Recent updates','<a class="dwr-secondary" href="/client-dashboard.html#notifications">Open full notifications ↗</a>',empty('No unread updates','When an update is available, it will appear in your client dashboard.'));
      }else if(state.section==='feedback'){
        setHeader('Feedback & questions','Share feedback or ask Raman a question.');
        html='<div class="dwr-two-col">'+sectionCard('Leave feedback','', '<form data-dwr-form="feedback"><label>Rating</label><select name="rating" required><option value="">Choose a rating</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Needs improvement</option><option value="1">1 — Poor</option></select><label>Your feedback</label><textarea name="feedback" rows="4" required placeholder="Share your experience…"></textarea><button class="dwr-primary" type="submit">Submit feedback</button></form>')+sectionCard('Ask a question','', '<form data-dwr-form="question"><label>Your question</label><textarea name="question" rows="4" required placeholder="What would you like to ask Raman? "></textarea><label>Email for a reply (optional)</label><input name="reply_email" type="email" placeholder="you@example.com"><button class="dwr-primary" type="submit">Send question</button></form>')+'</div><p class="dwr-muted">Secure submission is not enabled yet because the feedback and question tables, spam controls, and row-level security policies still need to be verified. These forms will not claim success or send data until that backend is ready.</p>';
      }else if(state.section==='profile'){
        setHeader('Account','Your account details and settings.');
        html=sectionCard('Profile','<a class="dwr-primary" href="/profile.html">Manage profile ↗</a>','<p class="dwr-muted">Your name and profile photo remain visible. Manage profile settings, sign out, and review account details here.</p><button class="dwr-secondary" data-account-delete-request type="button">Request account/data deletion</button>');
      }
    }
    content.innerHTML=html;
  }
  async function load(){
    const sb=state.client;
    alertBox('');
    try{
      const {data:{user},error:userError}=await sb.auth.getUser();if(userError)throw userError;if(!user){clear();return;}
      const {data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();if(profileError)throw profileError;
      if(!profile){alertBox('Your account profile could not be verified. The public portfolio remains available; please sign in again or contact the site owner.',true);return;}
      state.user=user;state.profile=profile;state.role=profile.role==='admin'?'admin':'client';
      if(state.role==='admin'){
        const [l,p,c,q]=await Promise.all([
          sb.from('leads').select('*').order('created_at',{ascending:false}).limit(500),
          sb.from('projects').select('id,client_id,title,status,progress,due_date,updated_at').order('updated_at',{ascending:false}).limit(300),
          sb.from('profiles').select('id,full_name,company_name,created_at,avatar_url,role').eq('role','client').order('created_at',{ascending:false}).limit(300),
          sb.from('proposals').select('id,client_id,title,description,budget,timeline,status,created_at').order('created_at',{ascending:false}).limit(300)
        ]);
        if(l.error)throw l.error;if(p.error)throw p.error;if(c.error)throw c.error;
        state.leads=l.data||[];state.projects=p.data||[];state.clients=c.data||[];state.proposals=q.error?[]:(q.data||[]);
        state.messages=[];
      }else{
        const [p,q]=await Promise.all([
          sb.from('projects').select('id,client_id,title,status,progress,due_date,updated_at').eq('client_id',user.id).order('updated_at',{ascending:false}).limit(100),
          sb.from('proposals').select('id,client_id,title,description,budget,timeline,status,created_at').eq('client_id',user.id).order('created_at',{ascending:false}).limit(100)
        ]);
        if(p.error)throw p.error;if(q.error)throw q.error;state.projects=p.data||[];state.proposals=q.data||[];state.notifications=[];
      }
      shell();
    }catch(e){console.error('[DWR workspace]',e);alertBox('Could not load your workspace data: '+(e?.message||'Unknown error')+'. Check your session and database permissions.',true);}
  }
  async function markRead(id){
    const sb=state.client;
    const {error}=await sb.from('leads').update({is_read:true}).eq('id',id);
    if(error)throw error;
    const row=state.leads.find(l=>l.id===id);if(row)row.is_read=true;render();notice('Enquiry marked as read.');
  }
  async function createProject(id){
    const lead=state.leads.find(l=>l.id===id);if(!lead)throw new Error('Enquiry not found. Refresh the list and try again.');
    if(lead.project_id){notice('A project is already linked to this enquiry.');return;}
    const title=(lead.project_type||'New project enquiry').slice(0,180);
    const payload={client_id:lead.user_id||null,title,status:'planning',progress:0};
    const {data:project,error}=await state.client.from('projects').insert(payload).select('id').single();
    if(error)throw error;
    const {error:linkError}=await state.client.from('leads').update({project_id:project.id}).eq('id',lead.id);
    if(linkError){notice('Project was created, but the enquiry reference could not be saved: '+linkError.message,true);await load();return;}
    notice('Project created. The original enquiry text was not changed.');
    await load();
  }
  async function onClick(e){
    const nav=e.target.closest('[data-dwr-section]');if(nav){state.section=nav.dataset.dwrSection;state.search='';render();return;}
    const tab=e.target.closest('[data-enquiry-tab]');if(tab){state.enquiryTab=tab.dataset.enquiryTab;render();return;}
    const read=e.target.closest('[data-mark-read]');if(read){read.disabled=true;try{await markRead(read.dataset.markRead);}catch(err){notice('Could not mark enquiry as read: '+err.message,true);}finally{read.disabled=false;}return;}
    const create=e.target.closest('[data-create-project]');if(create){if(!confirm('Create a new project from this enquiry? The enquiry content will remain unchanged.'))return;create.disabled=true;try{await createProject(create.dataset.createProject);}catch(err){notice('Could not create project: '+err.message,true);}finally{create.disabled=false;}return;}
    if(e.target.closest('[data-account-delete-request]')){notice('Account/data deletion requests are not connected yet. No request was sent.',true);return;}
    if(e.target.closest('[data-dwr-refresh]')){await load();notice('Workspace refreshed.');return;}
    if(e.target.closest('.dwr-signout')){const {error}=await state.client.auth.signOut();if(error){notice('Sign out failed: '+error.message,true);return;}clear();location.assign('/');}
  }
  function onInput(e){if(e.target.matches('[data-enquiry-search]')){state.search=e.target.value;const cursor=e.target.selectionStart;render();const input=$('[data-enquiry-search]');input?.focus();input?.setSelectionRange(cursor,cursor);}}
  function onChange(e){if(e.target.matches('[data-enquiry-search]')){state.search=e.target.value;render();}}
  async function onSubmit(e){if(e.target.matches('[data-dwr-form]')){e.preventDefault();notice('This form is displayed for review but is not connected to a secure submission table yet. No data was sent.',true);}}
  function clear(){restoreHomepageHero();document.documentElement.classList.remove('dwr-portal-active');$('#dwr-role-workspace')?.remove();state.role=null;state.user=null;state.profile=null;}
  async function init(client){
    if(!client?.auth)return;
    if(new URLSearchParams(location.search).get('view')==='public'){clear();return;}
    state.client=client;
    const {data,error}=await client.auth.getSession();if(error)throw error;
    if(!data?.session?.user){clear();return;}
    await load();
    client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>{if(session?.user)load();else clear();},0);});
  }
  window.DWRPortalTransform={init,clear};
})();