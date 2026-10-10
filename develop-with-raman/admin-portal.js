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
 let projects=[],clients=[],leads=[],enquiryFilter='anonymous',activeLead=null;

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
 async function loadAll(){
  const [c,p,q,i,m,l]=await Promise.all([
   sb.from('profiles').select('id,full_name,company_name,created_at').eq('role','client').order('created_at',{ascending:false}).limit(100),
   sb.from('projects').select('id,client_id,title,status,progress,due_date').order('updated_at',{ascending:false}).limit(200),
   sb.from('proposals').select('id,client_id,title,description,budget,timeline,status,created_at').order('created_at',{ascending:false}).limit(200),
   sb.from('invoices').select('id,client_id,status').in('status',['pending','overdue']),
   sb.from('milestones').select('id,project_id,title,status,progress,due_date,sort_order').order('sort_order',{ascending:true}).limit(500),
   sb.from('leads').select('id,name,email,whatsapp,project_type,budget_range,deadline,description,status,submitter_type,read_at,project_id,user_id,client_email,created_at').order('created_at',{ascending:false}).limit(500)
  ]);
  for(const r of [c,p,q,i,m,l])if(r.error)throw r.error;
  clients=c.data||[];projects=p.data||[];leads=l.data||[];const milestoneRows=m.data||[];
  $('[data-admin-clients]').textContent=clients.length;$('[data-admin-projects]').textContent=projects.length;
  $('[data-admin-proposals]').textContent=(q.data||[]).filter(x=>['submitted','reviewing','quoted'].includes(x.status)).length;
  $('[data-admin-invoices]').textContent=(i.data||[]).length;
  const unreadEnquiries=leads.filter(x=>!x.read_at).length;const navCount=$('[data-admin-new-enquiries-nav]');if(navCount)navCount.textContent=unreadEnquiries?'('+unreadEnquiries+')':'';
  const summary=$('[data-enquiry-summary]');if(summary)summary.textContent=unreadEnquiries+' unread · '+leads.length+' total';
  $('[data-admin-client-list]').innerHTML=clients.length?clients.map(c=>'<tr><td>'+esc(c.full_name||'Unnamed client')+'</td><td>'+esc(c.company_name||'—')+'</td><td>'+projects.filter(p=>p.client_id===c.id).length+'</td><td>'+(i.data||[]).filter(inv=>inv.client_id===c.id).length+'</td><td>'+esc(c.created_at?new Date(c.created_at).toLocaleDateString():'—')+'</td></tr>').join(''):'<tr><td colspan="5">No client accounts found.</td></tr>';
  $('#invoice-client').innerHTML='<option value="">Choose client…</option>'+clients.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.full_name||'Unnamed client')+' · '+esc(c.id.slice(0,8))+'</option>').join('');
  $('[data-admin-milestone-list]').innerHTML=milestoneRows.length?milestoneRows.map(m=>'<tr><td><strong>'+esc(m.title)+'</strong><small>'+esc(m.id)+'</small></td><td><small>'+esc(m.project_id)+'</small></td><td><select data-milestone-status="'+esc(m.id)+'">'+['pending','in_progress','submitted_for_approval','approved','completed'].map(s=>'<option value="'+s+'" '+(s===m.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td><input aria-label="Milestone progress" data-milestone-progress="'+esc(m.id)+'" type="number" min="0" max="100" value="'+Number(m.progress||0)+'" style="width:72px;padding:8px;border:1px solid var(--portal-line);border-radius:8px"></td><td>'+esc(m.due_date||'—')+'</td><td><button class="button" type="button" data-save-milestone="'+esc(m.id)+'">Save</button></td></tr>').join(''):'<tr><td colspan="6">No milestones created yet.</td></tr>';$('[data-admin-project-list]').innerHTML=projects.length?projects.map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><small>'+esc(p.id)+'</small></td><td><small>'+esc(p.client_id)+'</small></td><td>'+esc(p.status)+'</td><td>'+Number(p.progress||0)+'%</td><td><button class="button" type="button" data-fill-project="'+esc(p.id)+'">Use ID</button></td></tr>').join(''):'<tr><td colspan="5">No projects yet.</td></tr>';
  renderEnquiries();
  $('[data-admin-proposal-list]').innerHTML=(q.data||[]).length?(q.data||[]).map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><small>'+esc(p.description)+'</small></td><td>'+esc(p.budget==null?'—':new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(Number(p.budget)))+'</td><td>'+esc(p.timeline||'—')+'</td><td><select data-proposal-status="'+esc(p.id)+'">'+['submitted','reviewing','quoted','accepted','declined','converted'].map(s=>'<option value="'+s+'" '+(s===p.status?'selected':'')+'>'+s+'</option>').join('')+'</select></td><td>'+esc(p.created_at?new Date(p.created_at).toLocaleDateString():'—')+'</td></tr>').join(''):'<tr><td colspan="5">No proposals submitted yet.</td></tr>';
 }
 try{await loadAll();}catch(e){const el=$('[data-error-message]');el.hidden=false;el.textContent='Could not load admin data: '+e.message;}

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

 document.addEventListener('click',e=>{const b=e.target.closest('[data-fill-project]');if(!b)return;const id=b.dataset.fillProject;['#project-id','#milestone-project-id','#deliverable-project-id','#invoice-project'].forEach(sel=>{const el=$(sel);if(el)el.value=id;});say('admin-message','Project ID filled into the status form.');});
 const requestedLeadId=new URLSearchParams(location.search).get('lead');
 if(requestedLeadId){const requestedLead=leads.find(item=>item.id===requestedLeadId);if(requestedLead){enquiryFilter=requestedLead.submitter_type==='client'||requestedLead.user_id?'client':'anonymous';renderEnquiries();const button=[...document.querySelectorAll('[data-lead-create]')].find(item=>item.dataset.leadCreate===requestedLeadId);button?.click();}}
 $('#admin-project-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const id=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===id))throw new Error('Choose a project ID from the list below.');const {error}=await sb.from('projects').update({status:f.elements.status.value,progress:Number(f.elements.progress.value),updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;say('admin-message','Project updated.');await loadAll();}catch(err){say('admin-message','Update failed: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-milestone-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const id=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===id))throw new Error('Choose a project ID from the list below.');const {error}=await sb.from('milestones').insert({project_id:id,title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),status:f.elements.status.value,progress:Number(f.elements.progress.value),due_date:f.elements.due_date.value||null});if(error)throw error;say('milestone-message','Milestone created.');f.reset();f.elements.progress.value=0;await loadAll();}catch(err){say('milestone-message','Could not create milestone: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-deliverable-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]'),file=f.elements.file.files[0];btn.disabled=true;try{const projectId=f.elements.project_id.value.trim();if(!projects.some(p=>p.id===projectId))throw new Error('Choose a project ID from the list below.');if(!file)throw new Error('Choose a file to upload.');if(file.size>50*1024*1024)throw new Error('Files must be 50 MB or smaller.');const ext=(file.name.split('.').pop()||'').toLowerCase();const allowedTypes=['application/pdf','image/png','image/jpeg','image/webp','application/zip','application/x-zip-compressed','text/plain'];if(!allowedTypes.includes(file.type)&&!['pdf','png','jpg','jpeg','webp','zip','txt'].includes(ext))throw new Error('That file type is not supported.');const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140);const storagePath=projectId+'/'+crypto.randomUUID()+'-'+safeName;const {error:uploadError}=await sb.storage.from('client-deliverables').upload(storagePath,file,{contentType:file.type,upsert:false});if(uploadError)throw uploadError;const {error:rowError}=await sb.from('deliverables').insert({project_id:projectId,title:f.elements.title.value.trim(),description:f.elements.description.value.trim(),file_url:storagePath,status:'ready'});if(rowError){await sb.storage.from('client-deliverables').remove([storagePath]);throw rowError;}say('deliverable-message','File uploaded privately and shared with the project client.');f.reset();}catch(err){say('deliverable-message','Upload failed: '+err.message,true);}finally{btn.disabled=false;}});
 $('#admin-invoice-form').addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('[type=submit]');btn.disabled=true;try{const projectId=f.elements.project_id.value.trim()||null;const selectedClient=f.elements.client_id.value;if(projectId&&!projects.some(p=>p.id===projectId))throw new Error('Project ID was not found in the project list.');if(projectId&&projects.find(p=>p.id===projectId)?.client_id!==selectedClient)throw new Error('The selected project belongs to a different client.');const paymentUrl=f.elements.payment_url.value.trim()||null;if(paymentUrl&&!/^https:\/\//i.test(paymentUrl))throw new Error('Payment links must use HTTPS.');const {error}=await sb.from('invoices').insert({client_id:f.elements.client_id.value,project_id:projectId,invoice_number:f.elements.invoice_number.value.trim(),description:f.elements.description.value.trim(),amount:Number(f.elements.amount.value),currency:'INR',status:'pending',due_at:f.elements.due_at.value?new Date(f.elements.due_at.value+'T23:59:59').toISOString():null,payment_url:paymentUrl});if(error)throw error;say('invoice-message','Invoice created. It is now visible in the selected client’s billing tab.');f.reset();await loadAll();}catch(err){say('invoice-message','Could not create invoice: '+err.message,true);}finally{btn.disabled=false;}});
 $('[data-admin-milestone-list]').addEventListener('click',async e=>{const btn=e.target.closest('[data-save-milestone]');if(!btn)return;btn.disabled=true;try{const id=btn.dataset.saveMilestone,status=$('[data-milestone-status="'+id+'"]').value,progress=Number($('[data-milestone-progress="'+id+'"]').value);const {error}=await sb.from('milestones').update({status,progress}).eq('id',id);if(error)throw error;say('milestone-message','Milestone updated.');await loadAll();}catch(err){say('milestone-message','Could not update milestone: '+err.message,true);}finally{btn.disabled=false;}});
 const preview=$('#admin-client-preview');$('[data-open-client-preview]')?.addEventListener('click',()=>{preview.hidden=false;preview.querySelector('[data-close-client-preview]')?.focus();});preview?.querySelectorAll('[data-close-client-preview]').forEach(b=>b.addEventListener('click',()=>preview.hidden=true));preview?.addEventListener('click',e=>{if(e.target===preview)preview.hidden=true;});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&preview&&!preview.hidden)preview.hidden=true;});
 $('[data-admin-proposal-list]').addEventListener('change',async e=>{const sel=e.target.closest('[data-proposal-status]');if(!sel)return;sel.disabled=true;try{const {error}=await sb.from('proposals').update({status:sel.value,updated_at:new Date().toISOString()}).eq('id',sel.dataset.proposalStatus);if(error)throw error;say('admin-message','Proposal status updated.');await loadAll();}catch(err){say('admin-message','Proposal update failed: '+err.message,true);}finally{sel.disabled=false;}});

});