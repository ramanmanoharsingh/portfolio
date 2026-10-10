/* Admin actions are guarded by profiles.role and re-enforced by database RLS/storage policies. */
document.addEventListener('DOMContentLoaded',async()=>{
 const root=document.querySelector('[data-page="admin"]');if(!root||!window.supabaseClient)return;
 const sb=window.supabaseClient,$=s=>document.querySelector(s);
 const say=(id,msg,bad=false)=>{const e=$('#'+id);if(e){e.textContent=msg;e.dataset.error=String(bad);}};
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const {data:{user},error:authError}=await sb.auth.getUser();
 if(authError||!user){location.replace('/auth.html?next='+encodeURIComponent('/admin-portal.html'));return;}
 const {data:profile,error:profileError}=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(profileError||profile?.role!=='admin'){location.replace('/client-dashboard.html');return;}
 let projects=[],clients=[],leads=[],enquiryFilter='anonymous',activeLead=null,threads=[],messages=[],questions=[],feedbackItems=[],timeEntries=[],auditRows=[],adminNotifications=[],allProfiles=[],activeThreadId=null;

 function renderEnquiries(){
  const tbody=$('[data-admin-enquiry-list]');if(!tbody)return;
  const query=($('#enquiry-search')?.value||'').trim().toLowerCase();
  const counts={anonymous:0,client:0};
  leads.forEach(item=>{const type=item.submitter_type==='client'||item.user_id?'client':'anonymous';counts[type]++;});
  for(const type of ['anonymous','client']){const count=$('[data-enquiry-tab-count="'+type+'"]');if(count)count.textContent=String(counts[type]);}
  document.querySelectorAll('[data-enquiry-tab]').forEach(tab=>{const active=tab.dataset.enquiryTab===enquiryFilter;tab.setAttribute('aria-selected',String(active));tab.classList.toggle('button-dark',active);});
  const rows=leads.filter(item=>{
   const type=item.submitter_type==='client'||item.user_id?'client':'anonymous';
   if(type!==enquiryFilter)return false;
   const haystack=[item.name,item.email,item.client_email,item.whatsapp,item.project_type,item.description,item.budget_range].join(' ').toLowerCase();
   return !query||haystack.includes(query);
  });
  tbody.innerHTML=rows.length?rows.map(item=>{
   const id=esc(item.id),name=esc(item.name||'Unnamed visitor'),email=esc(item.email||item.client_email||'No email');
   const type=item.submitter_type==='client'||item.user_id?'Signed-in client':'Anonymous';
   const submitted=item.created_at?new Date(item.created_at).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'Date unavailable';
   const service=esc(item.project_type||'Not specified'),description=esc(item.description||'No description');
   const budget=esc(item.budget_range||'Budget not provided'),deadline=esc(item.deadline||'No deadline');
   const read=item.read_at?'Read':'Unread';
   const project=item.project_id?'<span>Project created</span><small>'+esc(item.project_id)+'</small>':'<span class="muted">No project yet</span>';
   return '<tr><td><strong>'+name+'</strong><small>'+email+'</small><small>'+esc(submitted)+'</small></td><td>'+type+'</td><td><strong>'+service+'</strong><small>'+description+'</small><small>'+budget+' · '+deadline+'</small></td><td><span>'+read+'</span></td><td>'+project+'</td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="button" type="button" data-lead-read="'+id+'" '+(item.read_at?'disabled':'')+'>'+(item.read_at?'Read':'Mark read')+'</button><button class="button button-dark" type="button" data-lead-create="'+id+'" '+(item.project_id?'disabled':'')+'>Create project</button></div></td></tr>';
  }).join(''):'<tr><td colspan="6">'+(leads.length?'No enquiries match this filter.':'No enquiries have been submitted yet.')+'</td></tr>';
 }

 const dateKeyIST=value=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value)).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
 const weekKeyIST=key=>{const d=new Date(key+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10);};
 const displayIST=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}):'—';
 const weekStartKey=()=>weekKeyIST(dateKeyIST(new Date()));
 const weeklyMinutes=()=>timeEntries.filter(t=>dateKeyIST(t.started_at)>=weekStartKey()&&dateKeyIST(t.started_at)<=dateKeyIST(new Date())).reduce((sum,t)=>sum+Math.max(0,Number(t.minutes)||0),0);
 const projectName=id=>projects.find(p=>p.id===id)?.title||'Unknown project';
 function renderAdminThreads(){
  const box=$('[data-admin-thread-list]');if(!box)return;
  const rows=[...threads].sort((a,b)=>{const ma=messages.find(m=>m.thread_id===a.id)?.created_at||a.updated_at,mb=messages.find(m=>m.thread_id===b.id)?.created_at||b.updated_at;return new Date(mb)-new Date(ma);});
  box.innerHTML=rows.length?'<div style="display:grid;gap:8px">'+rows.map(t=>{const latest=messages.find(m=>m.thread_id===t.id),client=clients.find(c=>c.id===t.client_id),unread=messages.filter(m=>m.thread_id===t.id&&m.sender_id!==user.id&&!m.read_at).length;return '<button class="button" type="button" data-admin-thread-id="'+esc(t.id)+'" style="justify-content:space-between;text-align:left;width:100%;white-space:normal"><span><strong>'+esc(client?.full_name||'Client '+t.client_id.slice(0,8))+'</strong><small style="display:block;color:var(--portal-muted);font-weight:400">'+esc(latest?.body||'No messages yet')+'</small></span><span>'+unread+' unread</span></button>';}).join('')+'</div>':'<p class="muted">No client conversations yet.</p>';
 }
 function renderAdminThread(threadId){
  const pane=$('[data-admin-message-pane]');if(!pane)return;
  const thread=threads.find(t=>t.id===threadId);if(!thread){pane.innerHTML='<p class="muted">Choose a conversation to open the thread.</p>';return;}
  const client=clients.find(c=>c.id===thread.client_id),rows=messages.filter(m=>m.thread_id===threadId).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  pane.innerHTML='<div class="portal-section-head" style="margin-top:0"><div><h3>'+esc(client?.full_name||'Client conversation')+'</h3><p class="muted">'+esc(client?.id||thread.client_id)+'</p></div></div><div data-admin-message-list aria-live="polite">'+(rows.length?rows.map(m=>'<article class="admin-message-bubble" data-own="'+String(m.sender_id===user.id)+'"><div class="cap">'+(m.sender_id===user.id?'You':'Client')+' · '+esc(displayIST(m.created_at))+'</div><p style="white-space:pre-wrap;margin:8px 0">'+esc(m.body)+'</p></article>').join(''):'<p class="muted">No messages in this conversation yet.</p>')+'</div><form id="admin-message-form" class="portal-form"><input type="hidden" name="thread_id" value="'+esc(threadId)+'"><div class="field full"><label for="admin-message-body">Reply to client</label><textarea id="admin-message-body" name="body" rows="3" maxlength="10000" required placeholder="Write a message…"></textarea></div><div class="field full"><button class="button button-dark" type="submit">Send message ↗</button><p class="muted" data-admin-message-status role="status"></p></div></form>';
 }
 function renderQuestions(){
  const box=$('[data-admin-question-list]');if(!box)return;
  box.innerHTML=questions.length?questions.map(q=>'<article class="portal-card" data-question-card="'+esc(q.id)+'" style="margin-bottom:12px"><div class="cap">'+esc(displayIST(q.created_at))+' · '+esc(q.email||('Account '+String(q.user_id||'anonymous').slice(0,8)))+'</div><h3 style="font-size:16px;margin:12px 0">'+esc(q.question)+'</h3><form data-question-form="'+esc(q.id)+'" class="portal-form"><div class="field full"><label>Answer</label><textarea name="answer" rows="3" maxlength="4000" placeholder="Write a helpful answer…">'+esc(q.answer||'')+'</textarea></div><div class="field full"><label><input type="checkbox" name="published" '+(q.published?'checked':'')+'> Publish this answer in the public Questions section</label></div><div class="field full"><button class="button button-dark" type="submit">Save answer ↗</button><p class="muted" data-question-status role="status"></p></div></form></article>').join(''):'<div class="portal-card"><p class="muted">No questions have been submitted.</p></div>';
 }
 function renderFeedback(){
  const box=$('[data-admin-feedback-list]');if(!box)return;
  box.innerHTML=feedbackItems.length?feedbackItems.map(f=>'<article class="portal-card" style="margin-bottom:12px"><div class="cap">'+esc(displayIST(f.created_at))+' · '+(f.user_id?'Signed-in client':'Anonymous')+'</div><h3 style="font-size:16px;margin:10px 0">'+esc(f.rating)+'/5 · '+esc(f.service||'General feedback')+'</h3><p style="white-space:pre-wrap">'+esc(f.text)+'</p><p class="muted">By '+esc(f.display_name||'No display name')+(f.project_id?' · Project '+esc(f.project_id.slice(0,8)):'')+'</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="button" type="button" data-feedback-toggle="'+esc(f.id)+'" data-feedback-field="reviewed" data-feedback-next="'+String(!f.reviewed)+'">'+(f.reviewed?'Mark unreviewed':'Mark reviewed')+'</button><button class="button '+(f.approved?'':'button-dark')+'" type="button" data-feedback-toggle="'+esc(f.id)+'" data-feedback-field="approved" data-feedback-next="'+String(!f.approved)+'">'+(f.approved?'Remove public approval':'Approve as testimonial')+'</button><span class="muted">'+(f.approved?'Approved for public display':'Private until approved')+'</span></div></article>').join(''):'<div class="portal-card"><p class="muted">No feedback has been submitted.</p></div>';
 }
 function renderTime(){
  const list=$('[data-admin-time-list]');if(list)list.innerHTML=timeEntries.length?timeEntries.slice(0,100).map(t=>'<tr><td><strong>'+esc(projectName(t.project_id))+'</strong><small>'+esc(t.project_id)+'</small></td><td>'+esc(displayIST(t.started_at))+'</td><td>'+esc(t.minutes==null?'Running':(Number(t.minutes)/60).toFixed(2)+' h')+'</td><td>'+ (t.billable?'Yes':'No')+'</td><td>'+esc(t.note||'—')+'</td></tr>').join(''):'<tr><td colspan="5">No time entries yet.</td></tr>';
  const box=$('[data-admin-time-week-chart]');if(!box)return;
  const weekly=timeEntries.filter(t=>dateKeyIST(t.started_at)>=weekStartKey()&&dateKeyIST(t.started_at)<=dateKeyIST(new Date()));
  const grouped={};weekly.forEach(t=>{grouped[t.project_id]=(grouped[t.project_id]||0)+(Number(t.minutes)||0);});
  const values=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,8),max=Math.max(1,...values.map(v=>v[1]));
  box.innerHTML=values.length?values.map(([id,minutes])=>'<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;gap:12px"><strong>'+esc(projectName(id))+'</strong><span>'+((minutes/60).toFixed(1))+' h</span></div><div class="admin-inline-bar"><span style="width:'+Math.round(minutes/max*100)+'%"></span></div></div>').join(''):'<p class="muted">No time logged for this week yet.</p>';
 }
 function renderTrends(){
  const chart=$('[data-service-trend-chart]'),topBox=$('[data-top-service-list]');if(!chart||!topBox)return;
  const period=$('[data-trend-period]').value||'week';
  const today=dateKeyIST(new Date()),defaultStart=dateKeyIST(Date.now()-90*86400000);
  const start=$('[data-trend-start]').value||defaultStart,end=$('[data-trend-end]').value||today;
  if(!$('[data-trend-start]').value)$('[data-trend-start]').value=defaultStart;
  if(!$('[data-trend-end]').value)$('[data-trend-end]').value=today;
  if(start>end){chart.innerHTML='<p class="muted">Choose a start date on or before the end date.</p>';topBox.innerHTML='';return;}
  const filtered=leads.filter(l=>{const key=dateKeyIST(l.created_at);return key>=start&&key<=end;});
  const serviceOf=l=>l.project_type||'Other / unspecified';
  const totals={};filtered.forEach(l=>totals[serviceOf(l)]=(totals[serviceOf(l)]||0)+1);
  const services=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
  const periodKey=l=>{const key=dateKeyIST(l.created_at);return period==='month'?key.slice(0,7):weekKeyIST(key);};
  const keys=[...new Set(filtered.map(periodKey))].sort();
  if(!keys.length){chart.innerHTML='<p class="muted">No enquiries in this date range.</p>';topBox.innerHTML='<p class="muted">No service totals for this range.</p>';return;}
  const colors=['var(--portal-ink)','var(--portal-accent)','var(--portal-muted)','var(--portal-line)'],W=720,H=250,pad=38,max=Math.max(1,...filtered.map(l=>1));
  const counts=services.map(service=>keys.map(key=>filtered.filter(l=>serviceOf(l)===service&&periodKey(l)===key).length));
  const maxCount=Math.max(1,...counts.flat());
  const x=i=>pad+(keys.length===1?0:i*(W-pad*2)/(keys.length-1));
  const y=v=>H-pad-(v/maxCount)*(H-pad*2);
  const grid=[0,0.5,1].map(r=>{const yy=H-pad-r*(H-pad*2);return '<line x1="'+pad+'" y1="'+yy+'" x2="'+(W-pad)+'" y2="'+yy+'" stroke="var(--portal-line)"/>';}).join('');
  const lines=services.map((service,si)=>{const pts=counts[si].map((v,i)=>x(i)+','+y(v)).join(' ');return '<polyline fill="none" stroke="'+colors[si]+'" stroke-width="2.5" points="'+pts+'"/>'+counts[si].map((v,i)=>'<circle cx="'+x(i)+'" cy="'+y(v)+'" r="3" fill="'+colors[si]+'"/>').join('');}).join('');
  const labels=keys.map((key,i)=>i===0||i===keys.length-1||i%Math.max(1,Math.ceil(keys.length/6))===0?'<text x="'+x(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10" fill="var(--portal-muted)">'+esc(key)+'</text>':'').join('');
  chart.innerHTML='<svg class="admin-trend-svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Enquiries per service over time">'+grid+lines+labels+'</svg><div style="display:flex;gap:12px;flex-wrap:wrap">'+services.map((s,i)=>'<span class="muted"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+colors[i]+';margin-right:6px"></span>'+esc(s)+'</span>').join('')+'</div>';
  const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,8),maxTotal=Math.max(1,...top.map(x=>x[1]));
  topBox.innerHTML=top.map(([service,count])=>{const converted=filtered.filter(l=>serviceOf(l)===service&&l.project_id).length,conversion=count?Math.round(converted/count*100):0;return '<div style="margin:12px 0"><div style="display:flex;justify-content:space-between;gap:12px"><strong>'+esc(service)+'</strong><span>'+count+' enquiries · '+conversion+'% converted</span></div><div class="admin-inline-bar"><span style="width:'+Math.round(count/maxTotal*100)+'%"></span></div></div>';}).join('');
 }
 function renderAudit(){
  const box=$('[data-admin-audit-list]');if(!box)return;
  box.innerHTML=auditRows.length?auditRows.map(a=>'<tr><td>'+esc(displayIST(a.created_at))+'</td><td><strong>'+esc(a.action)+'</strong></td><td>'+esc(a.entity)+(a.entity_id?'<small>'+esc(a.entity_id)+'</small>':'')+'</td><td>'+esc(a.actor_id||'System')+'</td><td>'+esc(JSON.stringify(a.meta||{}))+'</td></tr>').join(''):'<tr><td colspan="5">No audit events yet.</td></tr>';
 }
 function renderNotifications(){
  const box=$('[data-admin-notification-list]');if(!box)return;
  box.innerHTML=adminNotifications.length?adminNotifications.map(n=>'<article class="request-row"><div style="flex:1;min-width:0"><strong>'+esc(n.title)+'</strong><p class="muted">'+esc(n.body||'')+'</p><small>'+esc(displayIST(n.created_at))+' · '+(n.read_at?'Read':'Unread')+'</small></div><button class="button" type="button" data-admin-notification-read="'+esc(n.id)+'" '+(n.read_at?'disabled':'')+'>'+(n.read_at?'Read':'Mark read')+'</button></article>').join(''):'<p class="muted">No notifications yet.</p>';
 }
 function renderRoles(){
  const box=$('[data-admin-role-list]');if(!box)return;
  box.innerHTML=allProfiles.length?allProfiles.map(p=>'<tr><td><strong>'+esc(p.full_name||'Unnamed account')+'</strong><small>'+esc(p.id)+'</small></td><td>'+esc(p.role)+'</td><td>'+esc(p.created_at?dateKeyIST(p.created_at):'—')+'</td><td><select data-profile-role="'+esc(p.id)+'" '+(p.id===user.id?'disabled':'')+'><option value="client" '+(p.role==='client'?'selected':'')+'>Client</option><option value="admin" '+(p.role==='admin'?'selected':'')+'>Admin</option></select></td></tr>').join(''):'<tr><td colspan="4">No accounts found.</td></tr>';
 }
 function downloadCsv(rows,filename){
  if(!rows.length){const status=$('#admin-settings-message');if(status)status.textContent='There is no data to export yet.';return;}
  const columns=Object.keys(rows[0]),cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const csv=[columns.map(cell).join(','),...rows.map(row=>columns.map(key=>cell(row[key])).join(','))].join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function loadAll(){
  const [c,p,q,i,m,l,th,msg,questionRows,feedbackRows,timeRows,auditData,notificationRows,profileRows]=await Promise.all([
   sb.from('profiles').select('id,full_name,company_name,created_at,role').eq('role','client').order('created_at',{ascending:false}).limit(100),
   sb.from('projects').select('id,client_id,title,status,progress,due_date,created_at,updated_at').order('updated_at',{ascending:false}).limit(200),
   sb.from('proposals').select('id,client_id,title,description,budget,timeline,status,created_at').order('created_at',{ascending:false}).limit(200),
   sb.from('invoices').select('id,client_id,status').in('status',['pending','overdue']),
   sb.from('milestones').select('id,project_id,title,status,progress,due_date,sort_order').order('sort_order',{ascending:true}).limit(500),
   sb.from('leads').select('id,name,email,whatsapp,project_type,budget_range,deadline,description,status,submitter_type,read_at,project_id,user_id,client_email,created_at').order('created_at',{ascending:false}).limit(500),
   sb.from('client_threads').select('id,client_id,project_id,created_at,updated_at').order('updated_at',{ascending:false}).limit(300),
   sb.from('client_messages').select('id,thread_id,sender_id,body,read_at,created_at').order('created_at',{ascending:false}).limit(600),
   sb.from('questions').select('id,user_id,email,question,answer,published,answered_at,created_at').order('created_at',{ascending:false}).limit(300),
   sb.from('feedback').select('id,user_id,rating,text,service,project_id,display_name,approved,reviewed,created_at').order('created_at',{ascending:false}).limit(300),
   sb.from('time_entries').select('id,project_id,actor_id,started_at,ended_at,minutes,note,billable,created_at').order('started_at',{ascending:false}).limit(500),
   sb.from('audit_log').select('id,actor_id,action,entity,entity_id,meta,created_at').order('created_at',{ascending:false}).limit(150),
   sb.from('notifications').select('id,user_id,type,title,body,link,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(150),
   sb.from('profiles').select('id,full_name,role,created_at').order('created_at',{ascending:false}).limit(200)
  ]);
  for(const r of [c,p,q,i,m,l,th,msg,questionRows,feedbackRows,timeRows,auditData,notificationRows,profileRows])if(r.error)throw r.error;
  clients=c.data||[];projects=p.data||[];leads=l.data||[];const milestoneRows=m.data||[];
  threads=th.data||[];messages=msg.data||[];questions=questionRows.data||[];feedbackItems=feedbackRows.data||[];timeEntries=timeRows.data||[];auditRows=auditData.data||[];adminNotifications=notificationRows.data||[];allProfiles=profileRows.data||[];
  $('[data-admin-clients]').textContent=clients.length;$('[data-admin-projects]').textContent=projects.length;
  $('[data-admin-proposals]').textContent=(q.data||[]).filter(x=>['submitted','reviewing','quoted'].includes(x.status)).length;
  $('[data-admin-invoices]').textContent=(i.data||[]).length;
  const unreadEnquiries=leads.filter(x=>!x.read_at).length;const navCount=$('[data-admin-new-enquiries-nav]');if(navCount)navCount.textContent=unreadEnquiries?'('+unreadEnquiries+')':'';
  const summary=$('[data-enquiry-summary]');if(summary)summary.textContent=unreadEnquiries+' unread · '+leads.length+' total';
  $('[data-admin-client-list]').innerHTML=clients.length?clients.map(c=>'<tr><td>'+esc(c.full_name||'Unnamed client')+'</td><td>'+esc(c.company_name||'—')+'</td><td>'+projects.filter(p=>p.client_id===c.id).length+'</td><td>'+(i.data||[]).filter(inv=>inv.client_id===c.id).length+'</td><td>'+esc(c.created_at?new Date(c.created_at).toLocaleDateString():'—')+'</td></tr>').join(''):'<tr><td colspan="5">No client accounts found.</td></tr>';
  $('#invoice-client').innerHTML='<option value="">Choose client…</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.full_name||'Unnamed client')+' · '+esc(c.id.slice(0,8))+'</option>').join('');
  $('[data-admin-milestone-list]').innerHTML=milestoneRows.length?milestoneRows.map(m=>'<tr><td><strong>'+esc(m.title)+'</strong><small>'+esc(m.id)+'</small></td><td><small>'+esc(m.project_id)+'</small></td><td><select data-milestone-status="'+esc(m.id)+'">'+['pending','in_progress','submitted_for_approval','approved','completed'].map(s=>'<option value="'+s+'" '+(s===m.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td><input aria-label="Milestone progress" data-milestone-progress="'+esc(m.id)+'" type="number" min="0" max="100" value="'+Number(m.progress||0)+'" style="width:72px;padding:8px;border:1px solid var(--portal-line);border-radius:8px"></td><td>'+esc(m.due_date||'—')+'</td><td><button class="button" type="button" data-save-milestone="'+esc(m.id)+'">Save</button></td></tr>').join(''):'<tr><td colspan="6">No milestones created yet.</td></tr>';$('[data-admin-project-list]').innerHTML=projects.length?projects.map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><small>'+esc(p.id)+'</small></td><td><small>'+esc(p.client_id)+'</small></td><td>'+esc(p.status)+'</td><td>'+Number(p.progress||0)+'%</td><td><button class="button" type="button" data-fill-project="'+esc(p.id)+'">Use ID</button></td></tr>').join(''):'<tr><td colspan="5">No projects yet.</td></tr>';
  renderEnquiries();
  $('[data-admin-active-projects]').textContent=projects.filter(p=>!['completed','cancelled'].includes(p.status)).length;
  $('[data-admin-new-enquiries]').textContent=leads.filter(l=>!l.read_at).length;
  $('[data-admin-unread-messages]').textContent=messages.filter(m=>m.sender_id!==user.id&&!m.read_at).length;
  $('[data-admin-hours-week]').textContent=(weeklyMinutes()/60).toFixed(1);
  const average=feedbackItems.length?feedbackItems.reduce((sum,f)=>sum+Number(f.rating||0),0)/feedbackItems.length:null;
  $('[data-admin-feedback-average]').textContent=average==null?'—':average.toFixed(1)+'/5';
  const timeProjects=$('[data-time-project-options]');if(timeProjects)timeProjects.innerHTML='<option value="">Choose project…</option>'+projects.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.title)+' · '+esc(p.id.slice(0,8))+'</option>').join('');
  renderAdminThreads();renderQuestions();renderFeedback();renderTime();renderTrends();renderAudit();renderNotifications();renderRoles();
  if(activeThreadId)renderAdminThread(activeThreadId);
  $('[data-admin-proposal-list]').innerHTML=(q.data||[]).length?(q.data||[]).map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><small>'+esc(p.description)+'</small></td><td>'+esc(p.budget==null?'—':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(p.budget)))+'</td><td>'+esc(p.timeline||'—')+'</td><td><select data-proposal-status="'+esc(p.id)+'">'+['submitted','reviewing','quoted','accepted','declined','converted'].map(s=>'<option value="'+s+'" '+(s===p.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td>'+esc(p.created_at?new Date(p.created_at).toLocaleDateString():'—')+'</td></tr>').join(''):'<tr><td colspan="5">No proposals submitted yet.</td></tr>';
 }
 try{await loadAll();}catch(e){const el=$('[data-error-message]');el.hidden=false;el.textContent='Could not load admin data: '+e.message;}
 const timeStart=$('#time-started');if(timeStart&&!timeStart.value)timeStart.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
 const requestedLeadId=new URLSearchParams(location.search).get('lead');
 if(requestedLeadId){const requestedLead=leads.find(item=>item.id===requestedLeadId);if(requestedLead){enquiryFilter=requestedLead.submitter_type==='client'||requestedLead.user_id?'client':'anonymous';renderEnquiries();const button=[...document.querySelectorAll('[data-lead-create]')].find(item=>item.dataset.leadCreate===requestedLeadId);button?.click();}}


 document.querySelectorAll('[data-enquiry-tab]').forEach(tab=>tab.addEventListener('click',()=>{enquiryFilter=tab.dataset.enquiryTab;renderEnquiries();}));
 $('#enquiry-search')?.addEventListener('input',renderEnquiries);
 const leadModal=$('#lead-project-modal'),leadForm=$('#lead-project-form'),clientChoice=$('#lead-project-client'),pendingEmail=$('#lead-project-email');
 const closeLeadModal=()=>{if(leadModal)leadModal.hidden=true;activeLead=null;};
 leadModal?.querySelectorAll('[data-close-lead-project]').forEach(btn=>btn.addEventListener('click',closeLeadModal));
 leadModal?.addEventListener('click',event=>{if(event.target===leadModal)closeLeadModal();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&leadModal&&!leadModal.hidden)closeLeadModal();});
 clientChoice?.addEventListener('change',()=>{const selected=Boolean(clientChoice.value);pendingEmail.disabled=selected;pendingEmail.required=!selected;if(selected)pendingEmail.value='';else if(activeLead)pendingEmail.value=activeLead.email||activeLead.client_email||'';});
 $('[data-admin-enquiry-list]')?.addEventListener('click',async event=>{
  const readButton=event.target.closest('[data-lead-read]');
  if(readButton){
   const id=readButton.dataset.leadRead;readButton.disabled=true;
   try{const {data,error}=await sb.from('leads').update({read_at:new Date().toISOString()}).eq('id',id).is('read_at',null).select('id,read_at').maybeSingle();if(error)throw error;if(!data){const {data:latest,error:refreshError}=await sb.from('leads').select('id,read_at').eq('id',id).maybeSingle();if(refreshError)throw refreshError;if(latest)leads=leads.map(item=>item.id===id?{...item,...latest}:item);}else leads=leads.map(item=>item.id===id?{...item,read_at:data.read_at}:item);renderEnquiries();say('enquiry-message','Enquiry marked as read.');}
   catch(error){say('enquiry-message','Could not mark this enquiry as read: '+(error.message||'Please try again.'),true);readButton.disabled=false;}
   return;
  }
  const createButton=event.target.closest('[data-lead-create]');if(!createButton)return;
  activeLead=leads.find(item=>item.id===createButton.dataset.leadCreate);if(!activeLead)return;
  leadForm.reset();leadForm.elements.lead_id.value=activeLead.id;
  leadForm.elements.title.value=((activeLead.project_type||'Project')+' — '+(activeLead.name||'Client')).slice(0,180);
  leadForm.elements.description.value=activeLead.description||'';
  leadForm.elements.service_type.value=activeLead.project_type||'Web Development';
  leadForm.elements.due_date.value='';
  clientChoice.innerHTML='<option value="">Pending client — use email below</option>'+clients.map(client=>'<option value="'+esc(client.id)+'">'+esc(client.full_name||'Unnamed client')+' · '+esc(client.id.slice(0,8))+'</option>').join('');
  clientChoice.value='';pendingEmail.disabled=false;pendingEmail.required=true;pendingEmail.value=activeLead.email||activeLead.client_email||'';say('lead-project-message','');
  leadModal.hidden=false;leadForm.querySelector('[name="title"]')?.focus();
 });
 leadForm?.addEventListener('submit',async event=>{
  event.preventDefault();if(!activeLead)return;
  const form=event.currentTarget,button=form.querySelector('[type="submit"]'),clientId=form.elements.client_id.value||null,email=form.elements.pending_client_email.value.trim();
  if(!clientId&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){say('lead-project-message','Enter a valid pending client email or choose a registered client.',true);return;}
  button.disabled=true;say('lead-project-message','Creating project…');
  try{
   const {data,error}=await sb.rpc('create_project_from_lead',{p_lead_id:activeLead.id,p_title:form.elements.title.value.trim(),p_description:form.elements.description.value.trim(),p_service_type:form.elements.service_type.value.trim()||activeLead.project_type||'Web Development',p_client_id:clientId,p_pending_client_email:clientId?null:email,p_due_date:form.elements.due_date.value||null});
   if(error)throw error;
   const leadId=activeLead.id;leads=leads.map(item=>item.id===leadId?{...item,project_id:data}:item);renderEnquiries();closeLeadModal();form.reset();say('enquiry-message','Project created. The original enquiry content and read status were preserved.');
   try{await loadAll();}catch(refreshError){say('enquiry-message','Project created, but the dashboard could not refresh automatically. Reload this page to see the new project.',true);}
  }catch(error){say('lead-project-message','Could not create project: '+(error.message||'Please try again.'),true);}
  finally{button.disabled=false;}
 });


 // Message inbox: thread access is still enforced by Supabase RLS.
 $('[data-admin-thread-list]')?.addEventListener('click',async event=>{
  const button=event.target.closest('[data-admin-thread-id]');if(!button)return;
  activeThreadId=button.dataset.adminThreadId;
  const unread=messages.filter(m=>m.thread_id===activeThreadId&&m.sender_id!==user.id&&!m.read_at);
  if(unread.length){const ids=unread.map(m=>m.id);const {error}=await sb.from('client_messages').update({read_at:new Date().toISOString()}).in('id',ids);if(!error){const stamp=new Date().toISOString();messages=messages.map(m=>ids.includes(m.id)?{...m,read_at:stamp}:m);}}
  renderAdminThreads();renderAdminThread(activeThreadId);
 });
 $('[data-admin-message-pane]')?.addEventListener('submit',async event=>{
  const form=event.target.closest('#admin-message-form');if(!form)return;event.preventDefault();
  const button=form.querySelector('[type="submit"]'),body=form.elements.body.value.trim(),threadId=form.elements.thread_id.value;if(!body)return;
  button.disabled=true;const status=form.querySelector('[data-admin-message-status]');if(status)status.textContent='Sending…';
  const optimistic={id:'pending-'+Date.now(),thread_id:threadId,sender_id:user.id,body,created_at:new Date().toISOString(),read_at:null};
  messages=[...messages,optimistic];renderAdminThread(threadId);
  try{const {error}=await sb.from('client_messages').insert({thread_id:threadId,sender_id:user.id,body});if(error)throw error;await loadAll();renderAdminThread(threadId);}
  catch(error){messages=messages.filter(m=>m.id!==optimistic.id);renderAdminThread(threadId);const area=$('#admin-message-body');if(area)area.value=body;const msg=$('[data-admin-message-status]');if(msg)msg.textContent='Message failed to send. Your text is restored; please retry.';}
  finally{const submit=$('#admin-message-form [type="submit"]');if(submit)submit.disabled=false;}
 });
 $('[data-admin-question-list]')?.addEventListener('submit',async event=>{
  const form=event.target.closest('[data-question-form]');if(!form)return;event.preventDefault();
  const id=form.dataset.questionForm,answer=form.elements.answer.value.trim(),published=form.elements.published.checked&&Boolean(answer),button=form.querySelector('[type="submit"]'),status=form.querySelector('[data-question-status]');
  button.disabled=true;if(status)status.textContent='Saving answer…';
  try{const {error}=await sb.from('questions').update({answer:answer||null,published,answered_at:answer?new Date().toISOString():null}).eq('id',id);if(error)throw error;questions=questions.map(q=>q.id===id?{...q,answer:answer||null,published,answered_at:answer?new Date().toISOString():null}:q);renderQuestions();const box=$('[data-admin-question-list] [data-question-card="'+id+'"] [data-question-status]');if(box)box.textContent='Answer saved.';}
  catch(error){if(status)status.textContent='Could not save answer: '+(error.message||'Please try again.');}
  finally{const b=$('[data-question-form="'+id+'"] [type="submit"]');if(b)b.disabled=false;}
 });
 $('[data-admin-feedback-list]')?.addEventListener('click',async event=>{
  const button=event.target.closest('[data-feedback-toggle]');if(!button)return;
  const id=button.dataset.feedbackToggle,field=button.dataset.feedbackField,next=button.dataset.feedbackNext==='true';button.disabled=true;
  try{const {error}=await sb.from('feedback').update({[field]:next}).eq('id',id);if(error)throw error;feedbackItems=feedbackItems.map(f=>f.id===id?{...f,[field]:next}:f);renderFeedback();const average=feedbackItems.length?feedbackItems.reduce((sum,f)=>sum+Number(f.rating||0),0)/feedbackItems.length:null;$('[data-admin-feedback-average]').textContent=average==null?'—':average.toFixed(1)+'/5';}
  catch(error){button.disabled=false;button.textContent='Update failed: '+(error.message||'Retry');}
 });
 $('#admin-time-form')?.addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget,button=form.querySelector('[type="submit"]'),projectId=form.elements.project_id.value,minutes=Number(form.elements.minutes.value),started=form.elements.started_at.value;
  if(!projects.some(p=>p.id===projectId)){say('admin-time-message','Choose a project from the list.',true);return;}
  if(!Number.isInteger(minutes)||minutes<1||minutes>1440){say('admin-time-message','Enter a duration from 1 to 1440 minutes.',true);return;}
  button.disabled=true;say('admin-time-message','Saving time entry…');
  try{const start=new Date(started);if(Number.isNaN(start.getTime()))throw new Error('Choose a valid start time.');const {error}=await sb.from('time_entries').insert({project_id:projectId,actor_id:user.id,started_at:start.toISOString(),ended_at:new Date(start.getTime()+minutes*60000).toISOString(),minutes,note:form.elements.note.value.trim(),billable:form.elements.billable.checked});if(error)throw error;form.reset();form.elements.billable.checked=true;form.elements.started_at.value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);say('admin-time-message','Time entry saved.');await loadAll();}
  catch(error){say('admin-time-message','Could not save time: '+(error.message||'Please try again.'),true);}
  finally{button.disabled=false;}
 });
 $('[data-trend-refresh]')?.addEventListener('click',renderTrends);$('[data-trend-period]')?.addEventListener('change',renderTrends);
 $('[data-admin-notification-list]')?.addEventListener('click',async event=>{const button=event.target.closest('[data-admin-notification-read]');if(!button)return;button.disabled=true;try{const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('id',button.dataset.adminNotificationRead);if(error)throw error;adminNotifications=adminNotifications.map(n=>n.id===button.dataset.adminNotificationRead?{...n,read_at:new Date().toISOString()}:n);renderNotifications();}catch(error){button.disabled=false;button.textContent='Retry';}});
 $('[data-admin-notifications-read-all]')?.addEventListener('click',async()=>{const ids=adminNotifications.filter(n=>!n.read_at).map(n=>n.id);if(!ids.length)return;say('admin-settings-message','');try{const stamp=new Date().toISOString();const {error}=await sb.from('notifications').update({read_at:stamp}).in('id',ids);if(error)throw error;adminNotifications=adminNotifications.map(n=>ids.includes(n.id)?{...n,read_at:stamp}:n);renderNotifications();}catch(error){say('admin-settings-message','Could not mark notifications read: '+(error.message||'Please try again.'),true);}});
 $('[data-admin-role-list]')?.addEventListener('change',async event=>{const select=event.target.closest('[data-profile-role]');if(!select)return;const id=select.dataset.profileRole,role=select.value,old=allProfiles.find(p=>p.id===id)?.role;if(!old||id===user.id){select.value=old||'client';return;}select.disabled=true;try{const {error}=await sb.rpc('set_profile_role',{p_user_id:id,p_role:role});if(error)throw error;allProfiles=allProfiles.map(p=>p.id===id?{...p,role}:p);say('admin-settings-message','Account role updated.');await loadAll();}catch(error){select.value=old;say('admin-settings-message','Role update failed: '+(error.message||'Please try again.'),true);}finally{select.disabled=false;}});
 const csvCell=value=>String(value??'').replace(/\r?\n/g,' ').trim();
 $('[data-export-enquiries]')?.addEventListener('click',()=>downloadCsv(leads.map(l=>({created_at:l.created_at,submitter_type:l.submitter_type,read_at:l.read_at,project_id:l.project_id,name:l.name,email:l.email,whatsapp:l.whatsapp,service:l.project_type,budget:l.budget_range,deadline:l.deadline,description:l.description})), 'enquiries-'+dateKeyIST(new Date())+'.csv'));
 $('[data-export-time]')?.addEventListener('click',()=>downloadCsv(timeEntries.map(t=>({project:projectName(t.project_id),project_id:t.project_id,started_at:t.started_at,ended_at:t.ended_at,minutes:t.minutes,note:t.note,billable:t.billable})), 'time-entries-'+dateKeyIST(new Date())+'.csv'));

 document.addEventListener('click',e=>{const b=e.target.closest('[data-fill-project]');if(!b)return;const id=b.dataset.fillProject;['#project-id','#milestone-project-id','#deliverable-project-id','#invoice-project'].forEach(sel=>{const el=$(sel);if(el)el.value=id;});say('admin-message','Project ID filled into the status form.');});
 const requestedLeadId=new URLSearchParams(location.search).get('lead');
 if(requestedLeadId){const requestedLead=leads.find(item=>item.id===requestedLeadId);if(requestedLead){enquiryFilter=requestedLead.submitter_type==='client'||requestedLead.user_id?'client':'anonymous';renderEnquiries();const button=[...document.querySelectorAll('[data-lead-create]')].find(item=>item.dataset.leadCreate===requestedLeadId);button?.click();}}
 $('#admin-project-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const id=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===id))throw new Error('Choose a project ID from the list below.');const {error}=await sb.from('projects').update({status:f.elements.status.value,progress:Number(f.elements.progress.value),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;say('admin-message','Project updated.');await loadAll();}catch(err){say('admin-message','Update failed: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-milestone-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const id=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===id))throw new Error('Choose a project ID from the list below.');const {error}=await sb.from('milestones').insert({project_id:id,title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),status:f.elements.status.value,progress:Number(f.elements.progress.value),due_date:f.elements.due_date.value||null});if(error)throw error;say('milestone-message','Milestone created.');f.reset();f.elements.progress.value=0;await loadAll();}catch(err){say('milestone-message','Could not create milestone: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-deliverable-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]'),file=f.elements.file.files[0];btn.disabled=true;try{const projectId=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===projectId))throw new Error('Choose a project ID from the list below.');if(!file)throw new Error('Choose a file to upload.');if(file.size>50*1024*1024)throw new Error('Files must be 50 MB or smaller.');const ext=(file.name.split('.').pop()||'').toLowerCase();const allowedTypes=['application/pdf','image/png','image/jpeg','image/webp','application/zip','application/x-zip-compressed','text/plain'];if(!allowedTypes.includes(file.type)&&!['pdf','png','jpg','jpeg','webp','zip','txt'].includes(ext))throw new Error('That file type is not supported.');const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140);const storagePath=projectId+'/'+crypto.randomUUID()+'-'+safeName;const {error:uploadError}=await sb.storage.from('client-deliverables').upload(storagePath,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const {error:rowError}=await sb.from('deliverables').insert({project_id:projectId,title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),file_url:storagePath,status:'ready'});if(rowError){await sb.storage.from('client-deliverables').remove([storagePath]);throw rowError;}say('deliverable-message','File uploaded privately and shared with the project client.');f.reset();}catch(err){say('deliverable-message','Upload failed: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-invoice-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const projectId=f.elements.project_id.value.trim()||null;const selectedClient=f.elements.client_id.value;if(projectId&&!projects.some(p=>p.id===projectId))throw new Error('Project ID was not found in the project list.');if(projectId&&projects.find(p=>p.id===projectId)?.client_id!==selectedClient)throw new Error('The selected project belongs to a different client.');const paymentUrl=f.elements.payment_url.value.trim()||null;if(paymentUrl&&!/^https:\/\//i.test(paymentUrl))throw new Error('Payment links must use HTTPS.');const {error}=await sb.from('invoices').insert({client_id:f.elements.client_id.value,project_id:projectId,invoice_number:f.elements.invoice_number.value.trim(),description:f.elements.description.value.trim(),amount:Number(f.elements.amount.value),currency:'INR',status:'pending',due_at:f.elements.due_at.value?new Date(f.elements.due_at.value+'T23:59:59').toISOString():null,payment_url:paymentUrl});if(error)throw error;say('invoice-message','Invoice created. It is now visible in the selected client’s billing tab.');f.reset();await loadAll();}catch(err){say('invoice-message','Could not create invoice: '+err.message,true);}finally{btn.disabled=false;}});
 $('[data-admin-milestone-list]').addEventListener('click',async e=>{const btn=e.target.closest('[data-save-milestone]');if(!btn)return;btn.disabled=true;try{const id=btn.dataset.saveMilestone,status=$('[data-milestone-status="'+id+'"]').value,progress=Number($('[data-milestone-progress="'+id+'"]').value);const {error}=await sb.from('milestones').update({status,progress}).eq('id',id);if(error)throw error;say('milestone-message','Milestone updated.');await loadAll();}catch(err){say('milestone-message','Could not update milestone: '+err.message,true);}finally{btn.disabled=false;}});
 const realtime=sb.channel('admin-live-'+user.id).on('postgres_changes',{event:'*',schema:'public',table:'client_messages'},async()=>{try{await loadAll();}catch(error){console.warn('[admin realtime]',error.message);}}).subscribe();
 const preview=$('#admin-client-preview');$('[data-open-client-preview]')?.addEventListener('click',()=>{preview.hidden=false;preview.querySelector('[data-close-client-preview]')?.focus();});preview?.querySelectorAll('[data-close-client-preview]').forEach(b=>b.addEventListener('click',()=>preview.hidden=true));preview?.addEventListener('click',e=>{if(e.target===preview)preview.hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&preview&&!preview.hidden)preview.hidden=true;});
 $('[data-admin-proposal-list]').addEventListener('change',async e=>{const sel=e.target.closest('[data-proposal-status]');if(!sel)return;sel.disabled=true;try{const {error}=await sb.from('proposals').update({status:sel.value,updated_at:new Date().toISOString()}).eq('id',sel.dataset.proposalStatus);if(error)throw error;say('admin-message','Proposal status updated.');await loadAll();}catch(err){say('admin-message','Proposal update failed: '+err.message,true);}finally{sel.disabled=false;}});

});