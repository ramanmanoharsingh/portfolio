/* Client portal extras: chat with Raman + feedback / questions. Uses existing portal classes; RLS enforces access. */
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  const esc=(s='')=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when=s=>s?new Date(s).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
  let sb,user,thread=null,timer=null;
  const toast=(m,err)=>{let el=$('#portal-toast');if(!el){el=document.createElement('div');el.id='portal-toast';el.className='portal-toast';document.body.append(el);}el.textContent=m;el.dataset.error=String(!!err);el.classList.add('show');setTimeout(()=>el.classList.remove('show'),3500);};

  function mount(){
    const tabs=$('.portal-tabs'),main=$('.portal-main');if(!tabs||!main||$('[data-dashboard-tab="chat"]'))return false;
    const mk=(id,label)=>{const b=document.createElement('button');b.type='button';b.className='portal-tab';b.dataset.dashboardTab=id;b.setAttribute('role','tab');b.setAttribute('aria-selected','false');b.innerHTML=label;return b;};
    const settings=tabs.querySelector('a.portal-tab');
    tabs.insertBefore(mk('chat','Chat with Raman <span class="notification-count" data-chat-count hidden>0</span>'),settings);
    tabs.insertBefore(mk('feedback','Feedback & questions'),settings);
    const chat=document.createElement('section');chat.dataset.dashboardPanel='chat';chat.hidden=true;
    chat.innerHTML='<div class="portal-section-head"><div><h2>Chat with Raman</h2><p class="portal-subtitle">Send a message directly. Replies appear here and in your updates.</p></div></div><div class="portal-card chat"><div class="chat-log" data-chat-log><p class="muted">Loading…</p></div><form class="chat-form" data-chat-form><textarea name="body" rows="2" maxlength="4000" required placeholder="Write a message to Raman…"></textarea><button class="button button-dark" type="submit">Send ↗</button></form></div>';
    const fb=document.createElement('section');fb.dataset.dashboardPanel='feedback';fb.hidden=true;
    fb.innerHTML='<div class="portal-section-head"><h2>Feedback & questions</h2></div><div class="ce-grid"><form class="portal-card portal-form" data-feedback-form><div class="eyebrow">Feedback</div><div class="field full"><label>Rating</label><select name="rating" required><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Okay</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select></div><div class="field full"><label>Your feedback</label><textarea name="text" rows="4" required minlength="5" maxlength="2000" placeholder="How was working with Raman?"></textarea></div><div class="field full"><button class="button button-dark" type="submit">Send feedback ↗</button></div></form><form class="portal-card portal-form" data-question-form><div class="eyebrow">Ask a question</div><div class="field full"><label>Your question</label><textarea name="question" rows="4" required minlength="5" maxlength="2000" placeholder="Ask anything — answers may be published on the site."></textarea></div><div class="field full"><button class="button button-dark" type="submit">Ask question ↗</button></div></form></div><div class="portal-section-head"><h2>Your questions</h2></div><div class="portal-card" data-my-questions><p class="muted">Loading…</p></div>';
    main.append(chat,fb);
    tabs.addEventListener('click',e=>{const b=e.target.closest('[data-dashboard-tab]');if(b?.dataset.dashboardTab==='chat')openChat();else stop();});
    return true;
  }
  const stop=()=>{if(timer){clearInterval(timer);timer=null;}};

  async function ensureThread(){
    if(thread)return thread;
    let r=await sb.from('client_threads').select('id').eq('client_id',user.id).is('project_id',null).limit(1).maybeSingle();
    if(r.error)throw r.error;
    if(!r.data){r=await sb.from('client_threads').insert({client_id:user.id}).select('id').single();if(r.error)throw r.error;}
    thread=r.data.id;return thread;
  }
  async function drawChat(markRead){
    const log=$('[data-chat-log]');if(!log||!thread)return;
    const r=await sb.from('client_messages').select('id,sender_id,body,read_at,created_at').eq('thread_id',thread).order('created_at').limit(300);
    if(r.error){log.innerHTML='<p class="muted">Could not load messages.</p>';return;}
    const near=log.scrollHeight-log.scrollTop-log.clientHeight<80;
    log.innerHTML=r.data.length?r.data.map(m=>'<div class="bubble '+(m.sender_id===user.id?'me':'them')+'"><p>'+esc(m.body)+'</p><small>'+(m.sender_id===user.id?'You':'Raman')+' · '+esc(when(m.created_at))+'</small></div>').join(''):'<p class="muted">No messages yet — say hello.</p>';
    if(near)log.scrollTop=log.scrollHeight;
    const unread=r.data.filter(m=>m.sender_id!==user.id&&!m.read_at).map(m=>m.id);
    if(markRead&&unread.length)await sb.from('client_messages').update({read_at:new Date().toISOString()}).in('id',unread);
    badge();
  }
  async function badge(){
    try{await ensureThread();const r=await sb.from('client_messages').select('id',{count:'exact',head:true}).eq('thread_id',thread).is('read_at',null).neq('sender_id',user.id);
    const el=$('[data-chat-count]');if(el){const n=r.count||0;el.textContent=n;el.hidden=!n;}}catch{}
  }
  async function openChat(){
    stop();
    try{await ensureThread();await drawChat(true);timer=setInterval(()=>{if(!document.hidden)drawChat(true);},15000);}
    catch(e){const l=$('[data-chat-log]');if(l)l.innerHTML='<p class="muted">Chat is unavailable right now.</p>';}
  }
  async function myQuestions(){
    const box=$('[data-my-questions]');if(!box)return;
    const r=await sb.from('questions').select('id,question,answer,published,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(50);
    if(r.error||!r.data.length){box.innerHTML='<p class="muted">'+(r.error?'Could not load questions.':'Questions you ask will appear here with Raman\'s answer.')+'</p>';return;}
    box.innerHTML=r.data.map(q=>'<article class="request-row"><div><strong>'+esc(q.question)+'</strong><span>'+(q.answer?esc(q.answer):'Awaiting an answer')+'</span></div><span class="status">'+(q.answer?'Answered':'Pending')+'</span></article>').join('');
  }
  function wire(){
    $('[data-chat-form]').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,body=f.elements.body.value.trim();if(!body)return;const btn=f.querySelector('[type=submit]');btn.disabled=true;
      try{await ensureThread();const r=await sb.from('client_messages').insert({thread_id:thread,sender_id:user.id,body});if(r.error)throw r.error;f.reset();await drawChat(false);}catch(err){toast(err.message||'Could not send.',true);}finally{btn.disabled=false;}});
    $('[data-feedback-form]').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]');btn.disabled=true;
      try{const name=(user.user_metadata?.full_name||user.user_metadata?.name||'').trim()||null;const r=await sb.from('feedback').insert({user_id:user.id,rating:Number(f.elements.rating.value),text:f.elements.text.value.trim(),display_name:name,approved:false,reviewed:false});if(r.error)throw r.error;f.reset();toast('Thanks — feedback sent.');}catch(err){toast(err.message||'Could not send feedback.',true);}finally{btn.disabled=false;}});
    $('[data-question-form]').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,btn=f.querySelector('[type=submit]');btn.disabled=true;
      try{const r=await sb.from('questions').insert({user_id:user.id,email:user.email,question:f.elements.question.value.trim(),published:false});if(r.error)throw r.error;f.reset();toast('Question sent.');myQuestions();}catch(err){toast(err.message||'Could not send question.',true);}finally{btn.disabled=false;}});
  }
  async function start(){
    sb=window.supabaseClient;if(!sb?.auth)return;
    const r=await sb.auth.getUser();user=r.data?.user;if(!user)return;
    if(!mount())return;wire();myQuestions();badge();setInterval(()=>{if(!document.hidden)badge();},30000);
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(start,400));
})();
