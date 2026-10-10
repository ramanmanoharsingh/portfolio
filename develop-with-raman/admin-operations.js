/* Admin operations: all access is gated by the admin profile and enforced again by Supabase RLS/RPCs. */
document.addEventListener('DOMContentLoaded', async () => {
  const root = document.querySelector('[data-page="admin"]');
  const sb = window.supabaseClient;
  if (!root || !sb) return;

  const $ = (selector, context = document) => context.querySelector(selector);
  const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const nice = value => String(value || '').replace(/[_-]/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  const date = value => value ? new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata', dateStyle:'medium', timeStyle:'short'}) : '—';
  const notify = (message, bad = false) => {
    let node = $('#portal-toast');
    if (!node) { node = document.createElement('div'); node.id = 'portal-toast'; node.className = 'portal-toast'; document.body.append(node); }
    node.textContent = message; node.dataset.error = String(bad); node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 3500);
  };
  const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
  const csvCell = value => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  const downloadCsv = (filename, rows) => {
    const content = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + content], {type:'text/csv;charset=utf-8;'}));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const istDate = value => {
    const parts = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Kolkata', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(new Date(value));
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return p.year + '-' + p.month + '-' + p.day;
  };
  const startOfWeek = day => {
    const d = new Date(day + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0,10);
  };
  const monthBucket = day => day.slice(0,7);
  const weekBucket = day => startOfWeek(day);
  const now = new Date();
  const todayIST = istDate(now);
  const fromDefault = new Date(now.getTime() - 89 * 86400000);
  if ($('[data-trend-from]')) $('[data-trend-from]').value = istDate(fromDefault);
  if ($('[data-trend-to]')) $('[data-trend-to]').value = todayIST;

  const {data:{user}, error:authError} = await sb.auth.getUser();
  if (authError || !user) return;
  const {data:profile, error:profileError} = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin') return;

  let directory = [], projects = [], leads = [], feedbackRows = [], questions = [], timeEntries = [], auditRows = [], notifications = [], threads = [], messages = [], deletionRequests = [];
  let activeThreadId = null;

  async function loadData() {
    const results = await Promise.all([
      sb.rpc('admin_client_directory'),
      sb.from('projects').select('id,client_id,pending_client_email,title,service_type,status,progress,updated_at').order('updated_at',{ascending:false}).limit(500),
      sb.from('leads').select('id,name,email,whatsapp,project_type,budget_range,deadline,description,status,submitter_type,created_at,read_at,project_id,user_id,client_email').order('created_at',{ascending:false}).limit(1000),
      sb.from('feedback').select('id,user_id,rating,text,service,project_id,display_name,approved,reviewed,created_at').order('created_at',{ascending:false}).limit(500),
      sb.from('questions').select('id,user_id,email,question,answer,published,answered_at,created_at').order('created_at',{ascending:false}).limit(500),
      sb.from('time_entries').select('id,project_id,actor_id,started_at,ended_at,minutes,note,billable,created_at').order('started_at',{ascending:false}).limit(1000),
      sb.from('audit_log').select('id,actor_id,action,entity,entity_id,meta,created_at').order('created_at',{ascending:false}).limit(100),
      sb.from('notifications').select('id,type,title,body,link,read_at,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100),
      sb.from('client_threads').select('id,client_id,project_id,created_at,updated_at').order('updated_at',{ascending:false}).limit(500),
      sb.from('client_messages').select('id,thread_id,sender_id,body,read_at,created_at').order('created_at',{ascending:false}).limit(1000),
      sb.from('account_deletion_requests').select('id,user_id,email,reason,status,created_at,resolved_at').order('created_at',{ascending:false}).limit(200)
    ]);
    for (const result of results) if (result.error) throw result.error;
    directory = results[0].data || [];
    projects = results[1].data || [];
    leads = results[2].data || [];
    feedbackRows = results[3].data || [];
    questions = results[4].data || [];
    timeEntries = results[5].data || [];
    auditRows = results[6].data || [];
    notifications = results[7].data || [];
    threads = results[8].data || [];
    messages = results[9].data || [];
    deletionRequests = results[10].data || [];
    renderAll();
  }

  function renderAll() {
    const unreadLeads = leads.filter(item => !item.read_at).length;
    setText('[data-admin-new-leads]', String(unreadLeads));
    const unreadMessages = messages.filter(item => item.sender_id !== user.id && !item.read_at).length;
    setText('[data-admin-unread-messages]', String(unreadMessages));
    const unreadNotifications = notifications.filter(item => !item.read_at).length;
    setText('[data-admin-notification-count]', String(unreadNotifications));
    const feedbackAverage = feedbackRows.length ? feedbackRows.reduce((sum,item)=>sum+Number(item.rating||0),0)/feedbackRows.length : null;
    setText('[data-admin-feedback-average]', feedbackAverage === null ? '—' : feedbackAverage.toFixed(1) + ' / 5');
    const weekStart = (() => {
      const d = new Date(todayIST + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay()+6)%7)); return d.toISOString().slice(0,10);
    })();
    const minutesThisWeek = timeEntries.reduce((sum, entry) => {
      if (istDate(entry.started_at) < weekStart) return sum;
      if (entry.minutes != null) return sum + Number(entry.minutes);
      return sum + (entry.ended_at ? 0 : Math.max(0, Math.round((Date.now()-new Date(entry.started_at).getTime())/60000)));
    }, 0);
    setText('[data-admin-hours]', (minutesThisWeek/60).toFixed(1));
    const activity = auditRows.slice(0,8);
    const activityBox = $('[data-admin-activity-feed]');
    if (activityBox) activityBox.innerHTML = activity.length ? activity.map(item => '<article class="request-row"><div><strong>'+esc(nice(item.action))+'</strong><span>'+esc(nice(item.entity))+' · '+esc(date(item.created_at))+'</span></div><small class="muted">'+esc(item.entity_id ? String(item.entity_id).slice(0,8) : '')+'</small></article>').join('') : '<p class="muted">Activity will appear here as projects, enquiries and messages change.</p>';
    renderQuestions(); renderFeedback(); renderThreads(); renderTimeEntries(); renderTrend(); renderNotifications(); renderAudit(); renderDeletionRequests();
    const clientSelect = $('[data-role-user-select]');
    if (clientSelect) clientSelect.innerHTML = '<option value="">Choose account…</option>' + directory.filter(person => person.id !== user.id).map(person => '<option value="'+esc(person.id)+'" data-current-role="'+esc(person.role)+'">'+esc(person.full_name||person.email||'Unnamed account')+' · '+esc(person.email||'')+' · '+esc(person.role)+'</option>').join('');
    document.querySelectorAll('[data-time-project-select]').forEach(select => {
      const current = select.value;
      select.innerHTML = '<option value="">Choose project…</option>' + projects.map(p => '<option value="'+esc(p.id)+'">'+esc(p.title||'Project')+(p.client_id?'':' · Pending client')+'</option>').join('');
      if (projects.some(p=>p.id===current)) select.value=current;
    });
  }

  function renderQuestions() {
    const box = $('[data-admin-question-list]'); if (!box) return;
    box.innerHTML = questions.length ? questions.map(q => '<article class="request-row"><div style="flex:1;min-width:0"><strong>'+esc(q.question)+'</strong><span>'+esc(date(q.created_at))+' · '+esc(q.email||'No reply email')+'</span><form class="portal-form" data-answer-question="'+esc(q.id)+'" style="margin-top:12px"><div class="field full"><label>Answer</label><textarea name="answer" rows="3" maxlength="4000">'+esc(q.answer||'')+'</textarea></div><div class="field full"><label class="toggle-field"><input type="checkbox" name="published" '+(q.published?'checked':'')+'> Publish in the public Questions section</label></div><div class="field full"><button class="button button-dark" type="submit">Save answer</button></div></form></div><span class="status">'+(q.published?'Published':q.answer?'Answered':'Waiting')+'</span></article>').join('') : '<p class="muted">No questions have been submitted yet.</p>';
  }

  function renderFeedback() {
    const box = $('[data-admin-feedback-list]'); if (!box) return;
    box.innerHTML = feedbackRows.length ? feedbackRows.map(f => '<article class="request-row"><div style="flex:1;min-width:0"><strong>'+esc('★'.repeat(Number(f.rating))+' · '+(f.display_name||'Client feedback'))+'</strong><span>'+esc(date(f.created_at))+' · '+esc(f.service||'General')+'</span><p>'+esc(f.text)+'</p><small class="muted">'+(f.reviewed?'Reviewed':'Not reviewed')+' · '+(f.approved?'Approved testimonial':'Private feedback')+'</small></div><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="button" type="button" data-review-feedback="'+esc(f.id)+'" '+(f.reviewed?'disabled':'')+'>Mark reviewed</button><button class="button '+(f.approved?'':'button-dark')+'" type="button" data-feature-feedback="'+esc(f.id)+'">'+(f.approved?'Remove testimonial':'Approve testimonial')+'</button></div></article>').join('') : '<p class="muted">No feedback has been submitted yet.</p>';
  }

  function renderThreads() {
    const box = $('[data-admin-thread-list]'); if (!box) return;
    box.innerHTML = threads.length ? threads.map(t => {
      const person = directory.find(p=>p.id===t.client_id);
      const project = projects.find(p=>p.id===t.project_id);
      const latest = messages.find(m=>m.thread_id===t.id);
      const unread = messages.filter(m=>m.thread_id===t.id && m.sender_id!==user.id && !m.read_at).length;
      return '<article class="request-row"><div style="flex:1;min-width:0"><strong>'+esc(person?.full_name||person?.email||'Client')+'</strong><span>'+esc(project?.title||'General conversation')+' · '+esc(date(t.updated_at||t.created_at))+'</span><p>'+esc(latest?.body||'No messages yet')+'</p></div><button class="button '+(activeThreadId===t.id?'button-dark':'')+'" type="button" data-open-admin-thread="'+esc(t.id)+'">Open'+(unread?' · '+unread:'')+'</button></article>';
    }).join('') : '<p class="muted">No client conversations yet. A thread appears when a client opens Chat with Raman.</p>';
    renderActiveThread();
  }

  function renderActiveThread() {
    const box = $('[data-admin-chat-messages]'), form = $('#admin-message-form');
    if (!box) return;
    const thread = threads.find(t=>t.id===activeThreadId);
    if (!thread) { box.innerHTML='<p class="muted">Choose a conversation.</p>'; if(form)form.hidden=true; return; }
    const person = directory.find(p=>p.id===thread.client_id);
    setText('[data-admin-chat-title]', (person?.full_name||person?.email||'Client')+' · '+(projects.find(p=>p.id===thread.project_id)?.title||'General conversation'));
    const rows = messages.filter(m=>m.thread_id===thread.id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    box.innerHTML = rows.length ? rows.map(m=>'<article class="request-row"><div><strong>'+esc(m.sender_id===user.id?'You':(person?.full_name||'Client'))+'</strong><span>'+esc(date(m.created_at))+(m.read_at?' · Read':'')+'</span><p>'+esc(m.body)+'</p></div></article>').join('') : '<p class="muted">No messages in this thread yet.</p>';
    if(form){form.hidden=false;form.elements.thread_id.value=thread.id;}
    const unread = rows.filter(m=>m.sender_id!==user.id&&!m.read_at);
    if(unread.length){
      const readAt = new Date().toISOString();
      sb.from('client_messages').update({read_at:readAt}).in('id',unread.map(m=>m.id)).then(({error})=>{
        if(error){console.warn('[admin message read]',error.message);return;}
        messages=messages.map(m=>unread.some(u=>u.id===m.id)?{...m,read_at:readAt}:m);
        renderThreads();renderActiveThread();
      });
    }
  }

  function renderTimeEntries() {
    const box = $('[data-admin-time-list]'); if (!box) return;
    box.innerHTML = timeEntries.length ? timeEntries.map(entry => {
      const project = projects.find(p=>p.id===entry.project_id);
      const minutes = entry.minutes ?? (entry.ended_at ? 0 : Math.max(0,Math.round((Date.now()-new Date(entry.started_at).getTime())/60000)));
      return '<tr><td>'+esc(project?.title||'Project')+'</td><td>'+esc((Number(minutes)/60).toFixed(2))+' h</td><td>'+esc(entry.note||'—')+(entry.ended_at?'':' · Running')+'</td><td>'+ (entry.billable?'Yes':'No')+'</td></tr>';
    }).join('') : '<tr><td colspan="4">No time entries yet.</td></tr>';
    const active = timeEntries.find(entry=>!entry.ended_at && entry.actor_id===user.id);
    const start = $('[data-time-start]'), stop = $('[data-time-stop]');
    if(start)start.hidden=Boolean(active);
    if(stop)stop.hidden=!active;
    const projectSelect=$('[data-time-project-select]');
    if(active&&projectSelect)projectSelect.value=active.project_id;
    if(active)setText('[data-time-status]','Timer running since '+date(active.started_at));
    else setText('[data-time-status]','No timer running.');
  }

  function renderTrend() {
    const chart = $('[data-trend-chart]'); if (!chart) return;
    const from = $('[data-trend-from]')?.value || '';
    const to = $('[data-trend-to]')?.value || todayIST;
    const period = $('[data-trend-period]')?.value || 'week';
    const rows = leads.filter(l => { const d=istDate(l.created_at);return (!from||d>=from)&&(!to||d<=to); });
    const totals = new Map();
    rows.forEach(l=>{const service=String(l.project_type||'Other').trim()||'Other';totals.set(service,(totals.get(service)||0)+1);});
    const topServices = [...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>x[0]);
    const buckets = [...new Set(rows.map(l=>{const d=istDate(l.created_at);return period==='month'?monthBucket(d):weekBucket(d);} ))].sort();
    const series = topServices.map(service=>({service,values:buckets.map(bucket=>rows.filter(l=>(String(l.project_type||'Other').trim()||'Other')===service&&(period==='month'?monthBucket(istDate(l.created_at)):weekBucket(istDate(l.created_at)))===bucket).length)}));
    if(!buckets.length){chart.innerHTML='<p class="muted">No enquiries match this date range yet.</p>';}
    else{
      const w=760,h=260,pad=36,max=Math.max(1,...series.flatMap(s=>s.values)),x=i=>pad+(buckets.length===1?(w-2*pad)/2:i*(w-2*pad)/(buckets.length-1)),y=v=>h-pad-(v/max)*(h-2*pad);
      const colors=['var(--portal-ink)','var(--portal-accent)','var(--portal-muted)','var(--portal-line)'];
      const lines=series.map((s,idx)=>'<polyline fill="none" stroke="'+colors[idx]+'" stroke-width="2.5" points="'+s.values.map((v,i)=>x(i)+','+y(v)).join(' ')+'"/>').join('');
      const labels=buckets.map((b,i)=>'<text x="'+x(i)+'" y="'+(h-8)+'" font-size="10" text-anchor="middle" fill="currentColor">'+esc(b)+'</text>').join('');
      const grid=[0,1,2,3].map(i=>{const gy=pad+i*(h-2*pad)/3;return '<line x1="'+pad+'" x2="'+(w-pad)+'" y1="'+gy+'" y2="'+gy+'" stroke="var(--portal-line)" stroke-width="1"/>';}).join('');
      chart.innerHTML='<div style="max-width:100%;overflow-x:auto"><svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="Enquiries by service over time" style="width:100%;min-width:440px;height:auto;color:var(--portal-ink)">'+grid+lines+labels+'</svg></div><div style="display:flex;gap:14px;flex-wrap:wrap">'+series.map((s,i)=>'<span class="muted"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+colors[i]+';margin-right:6px"></span>'+esc(s.service)+'</span>').join('')+'</div>';
    }
    const bars=$('[data-trend-bars]');
    if(bars)bars.innerHTML=topServices.length?topServices.map(service=>'<div style="margin:10px 0"><div style="display:flex;justify-content:space-between;gap:12px"><span>'+esc(service)+'</span><strong>'+totals.get(service)+'</strong></div><div style="height:8px;background:var(--portal-line);border-radius:99px;overflow:hidden"><i style="display:block;height:100%;width:'+Math.round(totals.get(service)/Math.max(1,...totals.values())*100)+'%;background:var(--portal-accent)"></i></div></div>').join(''):'<p class="muted">No service data in this range.</p>';
    const conversion=$('[data-trend-conversion]');
    if(conversion)conversion.innerHTML=topServices.length?topServices.map(service=>{const group=rows.filter(l=>(String(l.project_type||'Other').trim()||'Other')===service);const converted=group.filter(l=>l.project_id).length;return '<article class="request-row"><div><strong>'+esc(service)+'</strong><span>'+converted+' projects from '+group.length+' enquiries</span></div><strong>'+Math.round(converted/Math.max(1,group.length)*100)+'%</strong></article>';}).join(''):'<p class="muted">Conversion data will appear after projects are created from enquiries.</p>';
  }

  function renderNotifications() {
    const box=$('[data-admin-notification-list]'); if(!box)return;
    box.innerHTML=notifications.length?notifications.map(n=>'<article class="request-row"><div><strong>'+esc(n.title)+'</strong><span>'+esc(date(n.created_at))+' · '+(n.read_at?'Read':'Unread')+'</span><p>'+esc(n.body||'')+'</p></div>'+(n.link?'<a class="button" href="'+esc(n.link)+'">Open ↗</a>':'')+'</article>').join(''):'<p class="muted">No notifications yet.</p>';
  }
  function renderAudit() {
    const box=$('[data-admin-audit-list]');if(!box)return;
    box.innerHTML=auditRows.length?auditRows.map(a=>'<article class="request-row"><div><strong>'+esc(nice(a.action))+'</strong><span>'+esc(nice(a.entity))+' · '+esc(date(a.created_at))+'</span><p>'+esc(JSON.stringify(a.meta||{}))+'</p></div><small class="muted">'+esc(a.actor_id?String(a.actor_id).slice(0,8):'System')+'</small></article>').join(''):'<p class="muted">No audit entries yet.</p>';
  }
  function renderDeletionRequests() {
    const box=$('[data-deletion-admin-list]');if(!box)return;
    box.innerHTML=deletionRequests.length?deletionRequests.map(r=>'<article class="request-row"><div><strong>'+esc(r.email)+'</strong><span>'+esc(date(r.created_at))+'</span><p>'+esc(r.reason||'No extra details provided.')+'</p></div><div style="display:flex;gap:8px;align-items:center"><select data-deletion-status="'+esc(r.id)+'">'+['pending','in_review','completed','declined'].map(s=>'<option value="'+s+'" '+(s===r.status?'selected':'')+'>'+nice(s)+'</option>').join('')+'</select><button class="button" type="button" data-save-deletion="'+esc(r.id)+'">Save</button></div></article>').join(''):'<p class="muted">No account deletion requests.</p>';
  }

  async function reload() { try { await loadData(); } catch (error) { console.error('[admin operations]',error); notify('Could not refresh admin operations: '+(error.message||'Unknown error'),true); } }
  try { await loadData(); } catch (error) { console.error('[admin operations]',error); notify('Some admin panels could not load: '+(error.message||'Unknown error'),true); }

  document.querySelectorAll('[data-enquiry-tab]').forEach(tab=>tab.addEventListener('click',()=>{document.querySelectorAll('[data-enquiry-tab]').forEach(other=>{other.classList.toggle('button-dark',other===tab);other.setAttribute('aria-selected',String(other===tab));});}));
  $('#admin-message-form')?.addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]'),threadId=form.elements.thread_id.value,body=form.elements.body.value.trim();
    if(!threadId||!body)return;btn.disabled=true;setText('[data-admin-chat-status]','Sending…');
    try{const {error}=await sb.from('client_messages').insert({thread_id:threadId,sender_id:user.id,body});if(error)throw error;form.elements.body.value='';setText('[data-admin-chat-status]','Message sent.');await reload();}
    catch(err){setText('[data-admin-chat-status]',err.message||'Message could not be sent.');notify(err.message||'Message could not be sent.',true);}
    finally{btn.disabled=false;}
  });
  document.addEventListener('click',async e=>{
    const open=e.target.closest('[data-open-admin-thread]');
    if(open){activeThreadId=open.dataset.openAdminThread;renderThreads();renderActiveThread();return;}
    const reviewed=e.target.closest('[data-review-feedback]');
    if(reviewed){reviewed.disabled=true;try{const {error}=await sb.from('feedback').update({reviewed:true}).eq('id',reviewed.dataset.reviewFeedback);if(error)throw error;await reload();}catch(err){notify(err.message||'Could not mark feedback reviewed.',true);reviewed.disabled=false;}return;}
    const feature=e.target.closest('[data-feature-feedback]');
    if(feature){feature.disabled=true;const row=feedbackRows.find(f=>f.id===feature.dataset.featureFeedback);try{const {error}=await sb.from('feedback').update({approved:!row?.approved,reviewed:true}).eq('id',feature.dataset.featureFeedback);if(error)throw error;await reload();}catch(err){notify(err.message||'Could not update testimonial approval.',true);feature.disabled=false;}return;}
    const start=e.target.closest('[data-time-start]');
    if(start){start.disabled=true;try{const form=$('#admin-timer-form'),projectId=form.elements.project_id.value;if(!projectId)throw new Error('Choose a project before starting the timer.');const {error}=await sb.from('time_entries').insert({project_id:projectId,actor_id:user.id,started_at:new Date().toISOString(),note:form.elements.note.value.trim(),billable:form.elements.billable.checked});if(error)throw error;notify('Timer started.');await reload();}catch(err){notify(err.message||'Could not start timer.',true);}finally{start.disabled=false;}return;}
    const stop=e.target.closest('[data-time-stop]');
    if(stop){stop.disabled=true;try{const active=timeEntries.find(item=>!item.ended_at&&item.actor_id===user.id);if(!active)throw new Error('No running timer found.');const ended=new Date(),minutes=Math.max(1,Math.round((ended-new Date(active.started_at))/60000));const {error}=await sb.from('time_entries').update({ended_at:ended.toISOString(),minutes}).eq('id',active.id);if(error)throw error;notify('Timer stopped and saved.');await reload();}catch(err){notify(err.message||'Could not stop timer.',true);}finally{stop.disabled=false;}return;}
    const markAll=e.target.closest('[data-admin-notification-mark-all]');
    if(markAll){markAll.disabled=true;try{const {error}=await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',user.id).is('read_at',null);if(error)throw error;await reload();notify('Notifications marked as read.');}catch(err){notify(err.message||'Could not mark notifications read.',true);}finally{markAll.disabled=false;}return;}
    const saveDeletion=e.target.closest('[data-save-deletion]');
    if(saveDeletion){saveDeletion.disabled=true;const id=saveDeletion.dataset.saveDeletion,status=$('[data-deletion-status="'+id+'"]').value;try{const {error}=await sb.from('account_deletion_requests').update({status,resolved_at:status==='completed'?new Date().toISOString():null}).eq('id',id);if(error)throw error;notify('Deletion request updated.');await reload();}catch(err){notify(err.message||'Could not update deletion request.',true);saveDeletion.disabled=false;}return;}
  });
  document.addEventListener('submit',async e=>{
    const answerForm=e.target.closest('[data-answer-question]');if(answerForm){e.preventDefault();const btn=answerForm.querySelector('[type=submit]'),answer=answerForm.elements.answer.value.trim(),published=answerForm.elements.published.checked&&Boolean(answer);btn.disabled=true;try{const {error}=await sb.from('questions').update({answer:answer||null,published,answered_at:answer?new Date().toISOString():null}).eq('id',answerForm.dataset.answerQuestion);if(error)throw error;notify('Question answer saved.');await reload();}catch(err){notify(err.message||'Could not save answer.',true);btn.disabled=false;}return;}
    const manual=e.target.closest('#admin-time-manual-form');if(manual){e.preventDefault();const btn=manual.querySelector('[type=submit]'),minutes=Number(manual.elements.minutes.value);btn.disabled=true;try{if(!Number.isInteger(minutes)||minutes<1)throw new Error('Enter a number of minutes greater than zero.');const ended=new Date(),started=new Date(ended.getTime()-minutes*60000);const {error}=await sb.from('time_entries').insert({project_id:manual.elements.project_id.value,actor_id:user.id,started_at:started.toISOString(),ended_at:ended.toISOString(),minutes,note:manual.elements.note.value.trim(),billable:manual.elements.billable.checked});if(error)throw error;manual.reset();notify('Manual time entry saved.');await reload();}catch(err){setText('[data-manual-time-status]',err.message||'Could not save time entry.');notify(err.message||'Could not save time entry.',true);}finally{btn.disabled=false;}return;}
  });
  $('#admin-role-form')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,btn=form.querySelector('[type=submit]');btn.disabled=true;setText('[data-role-message]','Saving…');try{const {error}=await sb.rpc('set_profile_role',{p_user_id:form.elements.user_id.value,p_role:form.elements.role.value});if(error)throw error;setText('[data-role-message]','Role updated. The account will use the new role after the next token refresh/sign-in.');notify('Role updated.');await reload();}catch(err){setText('[data-role-message]',err.message||'Could not change role.');notify(err.message||'Could not change role.',true);}finally{btn.disabled=false;}});
  $('[data-trend-period]')?.addEventListener('change',renderTrend);
  $('[data-trend-from]')?.addEventListener('change',renderTrend);
  $('[data-trend-to]')?.addEventListener('change',renderTrend);
  $('[data-export-leads]')?.addEventListener('click',()=>downloadCsv('develop-with-raman-enquiries.csv',[['id','created_at','submitter_type','name','email','service','status','read_at','project_id','description'],...leads.map(l=>[l.id,l.created_at,l.submitter_type,l.name,l.email,l.project_type,l.status,l.read_at,l.project_id,l.description])]));
  $('[data-export-time]')?.addEventListener('click',()=>downloadCsv('develop-with-raman-time-entries.csv',[['id','project_id','actor_id','started_at','ended_at','minutes','note','billable'],...timeEntries.map(t=>[t.id,t.project_id,t.actor_id,t.started_at,t.ended_at,t.minutes,t.note,t.billable])]));
  sb.channel('admin-operations-messages').on('postgres_changes',{event:'INSERT',schema:'public',table:'client_messages'},()=>{void reload();}).subscribe();
  sb.channel('admin-operations-notifications').on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+user.id},()=>{void reload();}).subscribe();
});
