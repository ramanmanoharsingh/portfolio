/* Admin workspace. Authorization is enforced by Supabase RLS and SECURITY DEFINER RPCs; the role check
   below only decides which page to show. Enquiries are immutable: admins can read them, mark them read,
   and create projects from them — nothing else. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nice = s => String(s || '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const fmtDateTime = d => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const hours = m => (Number(m || 0) / 60).toFixed(1);
  const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n) || 0);
  const safeHttps = u => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : ''; } catch (_e) { return ''; } };

  const VIEWS = {
    dashboard: ['Dashboard', 'Everything that needs your attention, in one place.'],
    enquiries: ['Enquiries', 'Read-only requests from guests and signed-in clients. Create a project from any of them.'],
    projects: ['Projects', 'Status, progress, milestones and updates for every project.'],
    clients: ['Clients', 'Registered client accounts and their work.'],
    messages: ['Messages', 'Direct conversations with your clients.'],
    trends: ['Service trends', 'How enquiries for each service change over time.'],
    questions: ['Questions & answers', 'Questions asked on the site. Answer them and choose what to publish.'],
    feedback: ['Feedback', 'What visitors and clients say. Approve feedback to show it publicly.'],
    time: ['Time tracking', 'Hours spent on each project.'],
    billing: ['Billing', 'Create invoices and see what is outstanding.'],
    deliverables: ['Deliverables', 'Upload files privately for a project’s client.'],
    settings: ['Settings & audit', 'Account roles, deletion requests and the activity log.']
  };

  const S = { sb: null, user: null, route: 'dashboard', clients: [], projects: [], pollId: null, openThread: null, loaded: {} };

  /* ---------- helpers ---------- */
  function toast(msg, bad = false) {
    let el = $('#portal-toast');
    if (!el) { el = document.createElement('div'); el.id = 'portal-toast'; el.className = 'portal-toast'; el.setAttribute('role', 'status'); document.body.append(el); }
    el.textContent = msg; el.dataset.error = String(bad); el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3600);
  }
  const fail = (e, ctx) => { console.error('[admin]', ctx || '', e); toast((ctx ? ctx + ': ' : '') + (e?.message || 'Something went wrong.'), true); };
  async function q(promise) { const r = await promise; if (r.error) throw r.error; return r.data; }
  const empty = (title, text = '') => '<div class="empty-state"><strong>' + esc(title) + '</strong>' + (text ? '<p>' + esc(text) + '</p>' : '') + '</div>';
  const badge = (text, kind = '') => '<span class="status ' + (kind ? 'status-' + esc(kind) : '') + '">' + esc(text) + '</span>';

  function openModal(title, html, onMount) {
    closeModal();
    const root = $('#modal-root');
    root.innerHTML = '<div class="portal-modal-backdrop" data-modal-backdrop><section class="portal-modal" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><header class="portal-modal-head"><div><div class="eyebrow">Admin</div><h2>' + esc(title) + '</h2></div><button class="button" type="button" data-close-modal aria-label="Close">✕</button></header><div data-modal-body>' + html + '</div></section></div>';
    root.querySelector('[data-close-modal]').addEventListener('click', closeModal);
    root.querySelector('[data-modal-backdrop]').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
    onMount?.(root.querySelector('[data-modal-body]'));
    root.querySelector('input,select,textarea,button')?.focus();
  }
  function closeModal() { const r = $('#modal-root'); if (r) r.innerHTML = ''; }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); $('[data-bell-panel]') && ($('[data-bell-panel]').hidden = true); } });

  /* ---------- shared data ---------- */
  async function loadClients() {
    const rows = await q(S.sb.rpc('admin_client_directory'));
    S.clients = rows || [];
    S.clientById = new Map(S.clients.map(c => [c.id, c]));
    return S.clients;
  }
  async function loadProjects() {
    S.projects = await q(S.sb.from('projects').select('id,client_id,pending_client_email,title,description,service_type,status,progress,start_date,due_date,live_url,repository_url,created_at,updated_at,source_lead_id').order('updated_at', { ascending: false }).limit(300)) || [];
    S.projectById = new Map(S.projects.map(p => [p.id, p]));
    return S.projects;
  }
  const clientName = id => { const c = S.clientById?.get(id); return c ? (c.full_name || c.email || 'Client') : 'Unassigned'; };
  const projectOptions = (selected = '') => '<option value="">Choose a project…</option>' + S.projects.map(p => '<option value="' + esc(p.id) + '"' + (p.id === selected ? ' selected' : '') + '>' + esc(p.title) + ' — ' + esc(clientName(p.client_id)) + '</option>').join('');
  const clientOptions = (selected = '', blank = 'Choose a client…') => '<option value="">' + esc(blank) + '</option>' + S.clients.filter(c => c.role === 'client').map(c => '<option value="' + esc(c.id) + '"' + (c.id === selected ? ' selected' : '') + '>' + esc(c.full_name || 'Unnamed') + ' · ' + esc(c.email) + '</option>').join('');

  /* ---------- routing ---------- */
  function currentRoute() { const h = (location.hash || '').replace('#', '').split('?')[0]; return VIEWS[h] ? h : 'dashboard'; }
  async function go() {
    const route = currentRoute();
    S.route = route;
    clearInterval(S.pollId); S.pollId = null;
    $$('[data-view]').forEach(v => v.hidden = v.dataset.view !== route);
    $$('[data-nav]').forEach(a => { const on = a.dataset.nav === route; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('[data-view-title]').textContent = VIEWS[route][0];
    $('[data-view-subtitle]').textContent = VIEWS[route][1];
    document.title = VIEWS[route][0] + ' · Admin · Develop with Raman';
    const stale = $('[data-view="' + route + '"]');
    const host = stale.cloneNode(false); stale.replaceWith(host); host.hidden = false;
    host.innerHTML = '<div class="portal-card"><p class="muted">Loading…</p></div>';
    try { await RENDER[route](host); } catch (e) { host.innerHTML = '<div class="portal-error">Could not load this section: ' + esc(e.message || e) + '</div>'; console.error(e); }
    window.scrollTo(0, 0);
    updateBadges();
  }
  const refresh = () => { S.loaded = {}; return go(); };

  /* ---------- badges + notifications ---------- */
  async function updateBadges() {
    try {
      const head = { count: 'exact', head: true };
      const [enq, msg, qs, fb, notif] = await Promise.all([
        S.sb.from('leads').select('id', head).is('read_at', null).is('project_id', null),
        S.sb.from('client_messages').select('id', head).is('read_at', null).neq('sender_id', S.user.id),
        S.sb.from('questions').select('id', head).is('answer', null),
        S.sb.from('feedback').select('id', head).eq('reviewed', false),
        S.sb.from('notifications').select('id', head).eq('user_id', S.user.id).is('read_at', null)
      ]);
      const set = (name, n) => { const el = $('[data-badge="' + name + '"]'); if (el) { el.textContent = n; el.hidden = !n; } };
      set('enquiries', enq.count || 0); set('messages', msg.count || 0); set('questions', qs.count || 0); set('feedback', fb.count || 0);
      const bc = $('[data-bell-count]'); if (bc) { bc.textContent = notif.count || 0; bc.hidden = !notif.count; }
    } catch (e) { console.warn('badges', e); }
  }
  async function loadBell() {
    const list = $('[data-bell-list]');
    try {
      const rows = await q(S.sb.from('notifications').select('id,type,title,body,link,read_at,created_at').eq('user_id', S.user.id).order('created_at', { ascending: false }).limit(25));
      list.innerHTML = rows.length ? rows.map(n => '<a class="client-update-row' + (n.read_at ? ' is-read' : '') + '" href="' + esc((/^\/admin-portal\.html#\w+$/.test(n.link || '') ? n.link.replace('/admin-portal.html', '') : ({ new_enquiry: '#enquiries', new_message: '#messages', new_question: '#questions', new_feedback: '#feedback', account_deletion_request: '#settings' }[n.type] || '#dashboard'))) + '" data-notif="' + esc(n.id) + '"><span class="client-update-copy"><strong>' + esc(n.title) + '</strong><span>' + esc(n.body) + '</span><small>' + esc(fmtDateTime(n.created_at)) + '</small></span>' + (n.read_at ? '' : '<i class="client-update-unread" aria-label="Unread"></i>') + '</a>').join('') : empty('You’re all caught up');
    } catch (e) { list.innerHTML = '<p class="muted">Could not load notifications.</p>'; }
  }

  /* ---------- views ---------- */
  const RENDER = {};

  /* Dashboard */
  RENDER.dashboard = async host => {
    const head = { count: 'exact', head: true };
    const since = new Date(Date.now() - 7 * 864e5).toISOString();
    const [newEnq, active, unreadMsg, time, fbRows, openQ, audit, dueSoon] = await Promise.all([
      S.sb.from('leads').select('id', head).is('read_at', null).is('project_id', null),
      S.sb.from('projects').select('id', head).in('status', ['planning', 'in_progress', 'review']),
      S.sb.from('client_messages').select('id', head).is('read_at', null).neq('sender_id', S.user.id),
      q(S.sb.from('time_entries').select('minutes').gte('started_at', since)),
      q(S.sb.from('feedback').select('rating').limit(500)),
      S.sb.from('questions').select('id', head).is('answer', null),
      q(S.sb.from('audit_log').select('id,action,entity,created_at,meta').order('created_at', { ascending: false }).limit(10)),
      q(S.sb.from('projects').select('id,title,due_date,status').in('status', ['planning', 'in_progress', 'review']).not('due_date', 'is', null).order('due_date').limit(5))
    ]);
    const mins = (time || []).reduce((a, r) => a + (r.minutes || 0), 0);
    const avg = fbRows.length ? (fbRows.reduce((a, r) => a + r.rating, 0) / fbRows.length).toFixed(1) : '—';
    const card = (label, value, note, href) => '<a class="metric-card" href="' + href + '"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div><div class="metric-note">' + note + '</div></a>';
    host.innerHTML = '<div class="portal-grid">' +
      card('New enquiries', newEnq.count || 0, 'Not yet reviewed', '#enquiries') +
      card('Active projects', active.count || 0, 'Planning, in progress or review', '#projects') +
      card('Unread messages', unreadMsg.count || 0, 'From clients', '#messages') +
      card('Hours this week', hours(mins), 'Logged in the last 7 days', '#time') + '</div>' +
      '<div class="portal-grid">' +
      card('Open questions', openQ.count || 0, 'Waiting for an answer', '#questions') +
      card('Feedback rating', avg, fbRows.length + ' review' + (fbRows.length === 1 ? '' : 's'), '#feedback') + '</div>' +
      '<div class="portal-two-col"><section><div class="portal-section-head"><h2>Recent activity</h2><a class="button" href="#settings">Full log ↗</a></div><div class="portal-card">' +
      (audit.length ? audit.map(a => '<div class="request-row"><div><strong>' + esc(nice(a.action)) + '</strong><span>' + esc(nice(a.entity)) + ' · ' + esc(fmtDateTime(a.created_at)) + '</span></div></div>').join('') : empty('No activity yet')) +
      '</div></section><section><div class="portal-section-head"><h2>Upcoming deadlines</h2></div><div class="portal-card">' +
      (dueSoon.length ? dueSoon.map(p => '<div class="request-row"><div><strong>' + esc(p.title) + '</strong><span>Due ' + esc(fmtDate(p.due_date)) + '</span></div></div>').join('') : empty('No deadlines set', 'Add a due date to a project to see it here.')) + '</div></section></div>';
  };

  /* Enquiries (read-only) */
  RENDER.enquiries = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    const leads = await q(S.sb.from('leads').select('id,name,email,whatsapp,project_type,budget_range,deadline,description,user_id,client_email,submitter_type,read_at,project_id,created_at').order('created_at', { ascending: false }).limit(500));
    S.leads = leads;
    let tab = S.enqTab || 'anonymous', search = '';
    const draw = () => {
      const rows = leads.filter(l => l.submitter_type === tab && (!search || (l.name + ' ' + l.email + ' ' + l.project_type + ' ' + l.description).toLowerCase().includes(search)));
      const count = t => leads.filter(l => l.submitter_type === t).length;
      const unread = t => leads.filter(l => l.submitter_type === t && !l.read_at && !l.project_id).length;
      host.innerHTML = '<div class="portal-tabs" role="tablist"><button class="portal-tab' + (tab === 'anonymous' ? ' active' : '') + '" role="tab" data-enq-tab="anonymous">Guest enquiries (' + count('anonymous') + ')' + (unread('anonymous') ? ' · ' + unread('anonymous') + ' new' : '') + '</button><button class="portal-tab' + (tab === 'client' ? ' active' : '') + '" role="tab" data-enq-tab="client">Client enquiries (' + count('client') + ')' + (unread('client') ? ' · ' + unread('client') + ' new' : '') + '</button></div>' +
        '<div class="field" style="max-width:340px;margin-bottom:16px"><label for="enq-search">Search</label><input id="enq-search" type="search" placeholder="Name, email, service…" value="' + esc(search) + '"></div>' +
        '<div class="portal-card table-scroll">' + (rows.length ? '<table class="portal-table"><thead><tr><th>Service</th><th>From</th><th>Budget / deadline</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>' + rows.map(l => {
          const status = l.project_id ? badge('Project created', 'completed') : l.read_at ? badge('Read') : badge('New', 'in_progress');
          return '<tr><td><strong>' + esc(l.project_type || 'Project enquiry') + '</strong></td><td><strong>' + esc(l.name) + '</strong><small><a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a></small></td><td>' + esc(l.budget_range || 'Not specified') + '<small>Deadline: ' + esc(l.deadline || '—') + '</small></td><td>' + esc(fmtDateTime(l.created_at)) + '</td><td>' + status + '</td><td><button class="button" type="button" data-view-lead="' + esc(l.id) + '">Open</button></td></tr>';
        }).join('') + '</tbody></table>' : empty(tab === 'anonymous' ? 'No guest enquiries' : 'No client enquiries', 'New requests will appear here.')) + '</div>';
      $$('[data-enq-tab]', host).forEach(b => b.addEventListener('click', () => { tab = S.enqTab = b.dataset.enqTab; draw(); }));
      const input = $('#enq-search', host); input.addEventListener('input', () => { search = input.value.trim().toLowerCase(); const pos = input.selectionStart; draw(); const n = $('#enq-search', host); n.focus(); n.setSelectionRange(pos, pos); });
      $$('[data-view-lead]', host).forEach(b => b.addEventListener('click', () => openLead(leads.find(l => l.id === b.dataset.viewLead), draw)));
    };
    draw();
  };

  function openLead(lead, redraw) {
    if (!lead) return;
    const linked = lead.project_id ? S.projectById?.get(lead.project_id) : null;
    openModal('Enquiry from ' + lead.name,
      '<div class="profile-meta"><div>Service<span>' + esc(lead.project_type || '—') + '</span></div><div>Email<span><a href="mailto:' + esc(lead.email) + '">' + esc(lead.email) + '</a></span></div>' + (lead.whatsapp ? '<div>WhatsApp<span>' + esc(lead.whatsapp) + '</span></div>' : '') + '<div>Type<span>' + (lead.submitter_type === 'client' ? 'Signed-in client' : 'Guest') + '</span></div><div>Budget<span>' + esc(lead.budget_range || 'Not specified') + '</span></div><div>Deadline<span>' + esc(lead.deadline || '—') + '</span></div><div>Received<span>' + esc(fmtDateTime(lead.created_at)) + '</span></div></div>' +
      '<h3 style="margin:22px 0 8px">Brief</h3><div class="portal-card" style="white-space:pre-wrap;font-size:13px;line-height:1.7">' + esc(lead.description) + '</div>' +
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;flex-wrap:wrap">' +
      (linked ? '<a class="button" href="#projects" data-close-modal>Open project: ' + esc(linked.title) + '</a>' : '<button class="button button-dark" type="button" data-create-project>＋ Create project</button>') +
      (!lead.read_at && !lead.project_id ? '<button class="button" type="button" data-mark-read>Mark as read</button>' : '') + '</div>',
      body => {
        $('[data-mark-read]', body)?.addEventListener('click', async e => {
          e.currentTarget.disabled = true;
          try { await q(S.sb.from('leads').update({ read_at: new Date().toISOString() }).eq('id', lead.id)); lead.read_at = new Date().toISOString(); closeModal(); redraw?.(); updateBadges(); toast('Marked as read.'); } catch (err) { fail(err, 'Could not update'); e.currentTarget.disabled = false; }
        });
        $('[data-create-project]', body)?.addEventListener('click', () => openCreateProject(lead, redraw));
        $$('a[data-close-modal]', body).forEach(a => a.addEventListener('click', closeModal));
      });
  }

  function openCreateProject(lead, redraw) {
    const registered = S.clients.find(c => c.id === lead.user_id) || S.clients.find(c => (c.email || '').toLowerCase() === (lead.email || '').toLowerCase());
    openModal('Create project from enquiry',
      '<form class="portal-form" data-project-form>' +
      '<div class="field full"><label for="np-title">Project title</label><input id="np-title" name="title" required minlength="3" maxlength="180" value="' + esc((lead.project_type || 'Project') + ' — ' + lead.name) + '"></div>' +
      '<div class="field full"><label for="np-service">Service</label><input id="np-service" name="service" value="' + esc(lead.project_type || '') + '" maxlength="120"></div>' +
      '<div class="field full"><label for="np-desc">Description</label><textarea id="np-desc" name="description" rows="6" required maxlength="10000">' + esc(lead.description) + '</textarea></div>' +
      '<div class="field"><label for="np-client">Client</label><select id="np-client" name="client_id"><option value="">Not registered yet (use email below)</option>' + S.clients.filter(c => c.role === 'client').map(c => '<option value="' + esc(c.id) + '"' + (registered && registered.id === c.id ? ' selected' : '') + '>' + esc(c.full_name || 'Unnamed') + ' · ' + esc(c.email) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="np-email">Invite by email</label><input id="np-email" name="pending" type="email" value="' + esc(lead.email) + '"></div>' +
      '<div class="field"><label for="np-due">Due date</label><input id="np-due" name="due" type="date" value="' + esc(lead.deadline || '') + '"></div>' +
      '<div class="field full"><p class="muted">The enquiry itself stays unchanged. If the client has no account yet, the project attaches automatically when they sign up with this verified email.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="button" type="button" data-close-modal>Cancel</button><button class="button button-dark" type="submit">Create project ↗</button></div></div></form>',
      body => {
        $('[data-close-modal]', body).addEventListener('click', closeModal);
        $('[data-project-form]', body).addEventListener('submit', async e => {
          e.preventDefault();
          const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
          try {
            const args = { p_lead_id: lead.id, p_title: f.title.value.trim(), p_description: f.description.value.trim(), p_service_type: f.service.value.trim() || 'Web Development', p_due_date: f.due.value || null };
            if (f.client_id.value) args.p_client_id = f.client_id.value; else args.p_pending_client_email = f.pending.value.trim();
            await q(S.sb.rpc('create_project_from_lead', args));
            closeModal(); toast('Project created.'); S.loaded = {};
            await loadProjects(); const fresh = await q(S.sb.from('leads').select('project_id').eq('id', lead.id).maybeSingle()); lead.project_id = fresh?.project_id || lead.project_id; redraw?.(); updateBadges();
          } catch (err) { fail(err, 'Could not create project'); btn.disabled = false; }
        });
      });
  }

  /* Projects */
  RENDER.projects = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    const draw = () => {
      host.innerHTML = '<div class="portal-section-head"><h2>All projects (' + S.projects.length + ')</h2><button class="button button-dark" type="button" data-new-project>＋ New project</button></div><div class="portal-card table-scroll">' + (S.projects.length ? '<table class="portal-table"><thead><tr><th>Project</th><th>Client</th><th>Status</th><th>Progress</th><th>Due</th><th></th></tr></thead><tbody>' + S.projects.map(p => '<tr><td><strong>' + esc(p.title) + '</strong><small>' + esc(p.service_type || '') + '</small></td><td>' + esc(p.client_id ? clientName(p.client_id) : (p.pending_client_email ? 'Invited: ' + p.pending_client_email : 'Unassigned')) + '</td><td>' + badge(nice(p.status), p.status) + '</td><td><div class="progress" style="min-width:90px"><i style="width:' + Number(p.progress || 0) + '%"></i></div><small>' + Number(p.progress || 0) + '%</small></td><td>' + esc(fmtDate(p.due_date)) + '</td><td><button class="button" type="button" data-manage="' + esc(p.id) + '">Manage</button></td></tr>').join('') + '</tbody></table>' : empty('No projects yet', 'Create one from an enquiry or with “New project”.')) + '</div>';
      $('[data-new-project]', host).addEventListener('click', () => openNewProject(draw));
      $$('[data-manage]', host).forEach(b => b.addEventListener('click', () => openManageProject(b.dataset.manage, draw)));
    };
    draw();
    if (location.hash.includes('project=')) { const id = new URLSearchParams(location.hash.split('?')[1]).get('project'); if (id) openManageProject(id, draw); }
  };

  function openNewProject(redraw) {
    openModal('New project',
      '<form class="portal-form" data-form>' +
      '<div class="field full"><label for="p-title">Project title</label><input id="p-title" name="title" required minlength="3" maxlength="180"></div>' +
      '<div class="field"><label for="p-client">Client</label><select id="p-client" name="client_id"><option value="">Not registered yet</option>' + S.clients.filter(c => c.role === 'client').map(c => '<option value="' + esc(c.id) + '">' + esc(c.full_name || 'Unnamed') + ' · ' + esc(c.email) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="p-email">Invite by email</label><input id="p-email" name="pending" type="email" placeholder="client@example.com"></div>' +
      '<div class="field"><label for="p-service">Service</label><input id="p-service" name="service" maxlength="120" value="Web Development"></div>' +
      '<div class="field"><label for="p-due">Due date</label><input id="p-due" name="due" type="date"></div>' +
      '<div class="field full"><label for="p-desc">Description</label><textarea id="p-desc" name="description" rows="4" maxlength="10000"></textarea></div>' +
      '<div class="field full" style="display:flex;gap:8px;justify-content:flex-end"><button class="button" type="button" data-close-modal>Cancel</button><button class="button button-dark" type="submit">Create project ↗</button></div></form>',
      body => {
        $('[data-close-modal]', body).addEventListener('click', closeModal);
        $('[data-form]', body).addEventListener('submit', async e => {
          e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
          try {
            const row = { title: f.title.value.trim(), description: f.description.value.trim(), service_type: f.service.value.trim() || 'Web Development', due_date: f.due.value || null, created_by: S.user.id, status: 'planning', progress: 0 };
            if (f.client_id.value) row.client_id = f.client_id.value; else if (f.pending.value.trim()) row.pending_client_email = f.pending.value.trim().toLowerCase();
            await q(S.sb.from('projects').insert(row)); closeModal(); toast('Project created.'); await loadProjects(); redraw();
          } catch (err) { fail(err, 'Could not create project'); btn.disabled = false; }
        });
      });
  }

  async function openManageProject(id, redraw) {
    const p = S.projectById.get(id); if (!p) return;
    const [milestones, updates] = await Promise.all([
      q(S.sb.from('milestones').select('id,title,status,progress,due_date,sort_order').eq('project_id', id).order('sort_order').order('created_at')),
      q(S.sb.from('project_updates').select('id,message,created_at').eq('project_id', id).order('created_at', { ascending: false }).limit(15))
    ]);
    const STAT = ['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'];
    const MSTAT = ['pending', 'in_progress', 'completed', 'submitted_for_approval', 'approved'];
    openModal(p.title,
      '<form class="portal-form" data-form>' +
      '<div class="field"><label for="m-status">Status</label><select id="m-status" name="status">' + STAT.map(s => '<option value="' + s + '"' + (s === p.status ? ' selected' : '') + '>' + nice(s) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="m-progress">Progress (%)</label><input id="m-progress" name="progress" type="number" min="0" max="100" value="' + Number(p.progress || 0) + '"></div>' +
      '<div class="field"><label for="m-due">Due date</label><input id="m-due" name="due" type="date" value="' + esc(p.due_date || '') + '"></div>' +
      '<div class="field"><label for="m-live">Live URL</label><input id="m-live" name="live" type="url" placeholder="https://…" value="' + esc(p.live_url || '') + '"></div>' +
      '<div class="field full" style="display:flex;gap:8px;justify-content:flex-end"><button class="button button-dark" type="submit">Save changes</button></div></form>' +
      '<h3 style="margin:24px 0 8px">Post an update</h3><form class="portal-form" data-update-form><div class="field full"><textarea name="message" rows="2" maxlength="4000" required placeholder="What changed? Shown to the client in their activity."></textarea></div><div class="field full" style="display:flex;justify-content:flex-end"><button class="button" type="submit">Post update</button></div></form>' +
      (updates.length ? '<div class="portal-card" style="margin-top:12px">' + updates.map(u => '<div class="request-row"><div><strong>' + esc(u.message) + '</strong><span>' + esc(fmtDateTime(u.created_at)) + '</span></div></div>').join('') + '</div>' : '') +
      '<h3 style="margin:24px 0 8px">Milestones</h3><div class="portal-card" data-milestones>' + (milestones.length ? milestones.map(m => '<div class="request-row" data-ms="' + esc(m.id) + '"><div style="flex:1"><strong>' + esc(m.title) + '</strong><span>Due ' + esc(fmtDate(m.due_date)) + '</span></div><select aria-label="Milestone status" data-ms-status>' + MSTAT.map(s => '<option value="' + s + '"' + (s === m.status ? ' selected' : '') + '>' + nice(s) + '</option>').join('') + '</select><input aria-label="Milestone progress" data-ms-progress type="number" min="0" max="100" value="' + Number(m.progress || 0) + '" style="width:70px;border:1px solid var(--portal-line);border-radius:10px;padding:8px;background:var(--portal-card);color:var(--portal-ink)"><button class="button" type="button" data-ms-save>Save</button></div>').join('') : '<p class="muted">No milestones yet.</p>') + '</div>' +
      '<form class="portal-form" data-ms-form style="margin-top:12px"><div class="field"><label for="ms-title">New milestone</label><input id="ms-title" name="title" required maxlength="160"></div><div class="field"><label for="ms-due">Due date</label><input id="ms-due" name="due" type="date"></div><div class="field full" style="display:flex;justify-content:flex-end"><button class="button" type="submit">Add milestone</button></div></form>',
      body => {
        $('[data-form]', body).addEventListener('submit', async e => {
          e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
          try {
            const live = f.live.value.trim(); if (live && !safeHttps(live)) throw new Error('The live URL must start with https://');
            await q(S.sb.from('projects').update({ status: f.status.value, progress: Math.max(0, Math.min(100, Number(f.progress.value) || 0)), due_date: f.due.value || null, live_url: live || null }).eq('id', id));
            toast('Project saved.'); await loadProjects(); closeModal(); redraw?.();
          } catch (err) { fail(err, 'Could not save'); btn.disabled = false; }
        });
        $('[data-update-form]', body).addEventListener('submit', async e => {
          e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
          try { await q(S.sb.from('project_updates').insert({ project_id: id, message: f.message.value.trim(), created_by: S.user.id })); toast('Update posted.'); closeModal(); openManageProject(id, redraw); } catch (err) { fail(err, 'Could not post'); btn.disabled = false; }
        });
        $('[data-ms-form]', body).addEventListener('submit', async e => {
          e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
          try { await q(S.sb.from('milestones').insert({ project_id: id, title: f.title.value.trim(), due_date: f.due.value || null, sort_order: milestones.length })); toast('Milestone added.'); closeModal(); openManageProject(id, redraw); } catch (err) { fail(err, 'Could not add milestone'); btn.disabled = false; }
        });
        $$('[data-ms-save]', body).forEach(b => b.addEventListener('click', async () => {
          const row = b.closest('[data-ms]'); b.disabled = true;
          try { await q(S.sb.from('milestones').update({ status: $('[data-ms-status]', row).value, progress: Math.max(0, Math.min(100, Number($('[data-ms-progress]', row).value) || 0)) }).eq('id', row.dataset.ms)); toast('Milestone saved.'); } catch (err) { fail(err, 'Could not save milestone'); } finally { b.disabled = false; }
        }));
      });
  }

  /* Clients */
  RENDER.clients = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    const list = S.clients.filter(c => c.role === 'client');
    host.innerHTML = '<div class="portal-card table-scroll">' + (list.length ? '<table class="portal-table"><thead><tr><th>Client</th><th>Company</th><th>Projects</th><th>Joined</th><th></th></tr></thead><tbody>' + list.map(c => '<tr><td><strong>' + esc(c.full_name || 'Unnamed') + '</strong><small>' + esc(c.email) + '</small></td><td>' + esc(c.company_name || '—') + '</td><td>' + S.projects.filter(p => p.client_id === c.id).length + '</td><td>' + esc(fmtDate(c.created_at)) + '</td><td><button class="button" type="button" data-msg-client="' + esc(c.id) + '">Message</button></td></tr>').join('') + '</tbody></table>' : empty('No client accounts yet', 'Clients appear here after they sign up.')) + '</div>';
    $$('[data-msg-client]', host).forEach(b => b.addEventListener('click', () => { S.openThreadFor = b.dataset.msgClient; location.hash = '#messages'; }));
  };

  /* Messages */
  RENDER.messages = async host => {
    await loadClients();
    host.innerHTML = '<div class="admin-split"><div class="portal-card thread-list" data-threads></div><div class="portal-card chat" data-chat><p class="muted">Select a conversation.</p></div></div>';
    const drawThreads = async () => {
      const threads = await q(S.sb.from('client_threads').select('id,client_id,project_id,updated_at').order('updated_at', { ascending: false }).limit(200));
      const unread = await q(S.sb.from('client_messages').select('thread_id').is('read_at', null).neq('sender_id', S.user.id));
      const un = {}; unread.forEach(m => un[m.thread_id] = (un[m.thread_id] || 0) + 1);
      S.threads = threads;
      const withThread = new Set(threads.map(t => t.client_id));
      const noThread = S.clients.filter(c => c.role === 'client' && !withThread.has(c.id));
      $('[data-threads]', host).innerHTML = (threads.length ? threads.map(t => '<button type="button" class="thread-item' + (S.openThread === t.id ? ' active' : '') + '" data-thread="' + esc(t.id) + '"><strong>' + esc(clientName(t.client_id)) + '</strong><small>' + esc(fmtDateTime(t.updated_at)) + '</small>' + (un[t.id] ? '<b class="nav-badge">' + un[t.id] + '</b>' : '') + '</button>').join('') : '<p class="muted" style="padding:6px 4px">No conversations yet.</p>') +
        (noThread.length ? '<div class="field" style="margin-top:14px"><label for="new-thread">Start a conversation</label><select id="new-thread"><option value="">Choose a client…</option>' + noThread.map(c => '<option value="' + esc(c.id) + '">' + esc(c.full_name || c.email) + '</option>').join('') + '</select></div>' : '');
      $$('[data-thread]', host).forEach(b => b.addEventListener('click', () => openThread(b.dataset.thread)));
      $('#new-thread', host)?.addEventListener('change', async e => { if (!e.target.value) return; try { const t = await q(S.sb.from('client_threads').insert({ client_id: e.target.value }).select('id').single()); S.openThread = t.id; await drawThreads(); openThread(t.id); } catch (err) { fail(err, 'Could not start conversation'); } });
    };
    const openThread = async id => {
      S.openThread = id;
      const t = S.threads.find(x => x.id === id); if (!t) return;
      const msgs = await q(S.sb.from('client_messages').select('id,sender_id,body,read_at,created_at').eq('thread_id', id).order('created_at').limit(300));
      const chat = $('[data-chat]', host);
      const keepScroll = chat.querySelector('[data-log]'); const atBottom = !keepScroll || keepScroll.scrollHeight - keepScroll.scrollTop - keepScroll.clientHeight < 80;
      const draft = chat.querySelector('textarea')?.value || '';
      chat.innerHTML = '<div class="chat-head"><strong>' + esc(clientName(t.client_id)) + '</strong></div><div class="chat-log" data-log>' + (msgs.length ? msgs.map(m => '<div class="bubble ' + (m.sender_id === S.user.id ? 'me' : 'them') + '"><p>' + esc(m.body) + '</p><small>' + esc(fmtDateTime(m.created_at)) + '</small></div>').join('') : '<p class="muted">No messages yet — say hello.</p>') + '</div><form class="chat-form" data-send><textarea name="body" rows="2" maxlength="10000" required placeholder="Write a message…" aria-label="Message">' + esc(draft) + '</textarea><button class="button button-dark" type="submit">Send ↗</button></form>';
      const log = $('[data-log]', chat); if (atBottom) log.scrollTop = log.scrollHeight; else log.scrollTop = keepScroll.scrollTop;
      $('[data-send]', chat).addEventListener('submit', async e => {
        e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('button'); const body = f.body.value.trim(); if (!body) return; btn.disabled = true;
        try { await q(S.sb.from('client_messages').insert({ thread_id: id, sender_id: S.user.id, body })); f.body.value = ''; await openThread(id); } catch (err) { fail(err, 'Message not sent'); } finally { btn.disabled = false; }
      });
      const unreadIds = msgs.filter(m => m.sender_id !== S.user.id && !m.read_at).map(m => m.id);
      if (unreadIds.length) { S.sb.from('client_messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds).then(() => { drawThreads(); updateBadges(); }); }
    };
    await drawThreads();
    if (S.openThreadFor) {
      const cid = S.openThreadFor; S.openThreadFor = null;
      let t = S.threads.find(x => x.client_id === cid);
      if (!t) { try { t = await q(S.sb.from('client_threads').insert({ client_id: cid }).select('id,client_id,project_id,updated_at').single()); await drawThreads(); } catch (err) { fail(err, 'Could not start conversation'); } }
      if (t) await openThread(t.id);
    } else if (S.threads[0]) await openThread(S.openThread && S.threads.some(x => x.id === S.openThread) ? S.openThread : S.threads[0].id);
    S.pollId = setInterval(async () => { if (S.route !== 'messages' || document.hidden) return; try { await drawThreads(); if (S.openThread && !$('[data-send] textarea', host)?.value) await openThread(S.openThread); } catch (_e) {} }, 15000);
  };

  /* Service trends */
  RENDER.trends = async host => {
    const rows = await q(S.sb.from('leads').select('project_type,project_id,created_at').order('created_at').limit(5000));
    const services = [...new Set(rows.map(r => r.project_type || 'Other'))];
    const COLORS = { light: ['#2a78d6', '#eb6834', '#1baf7a', '#6250d6'], dark: ['#3987e5', '#d95926', '#199e70', '#9085e9'] };
    const totals = {}; rows.forEach(r => { const k = r.project_type || 'Other'; totals[k] = (totals[k] || 0) + 1; });
    const ranked = services.sort((a, b) => totals[b] - totals[a]);
    let range = 6, grain = 'month', picked = ranked.slice(0, 4);
    const periodKey = (d, g) => { const x = new Date(d); if (g === 'month') return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); const t = new Date(x); const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); return t.toISOString().slice(0, 10); };
    const buckets = (g, n) => { const out = []; const now = new Date(); if (g === 'month') { for (let i = n - 1; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); out.push(periodKey(d, 'month')); } } else { const weeks = Math.round(n * 4.35); const mon = new Date(now); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); for (let i = weeks - 1; i >= 0; i--) { const d = new Date(mon); d.setDate(d.getDate() - i * 7); out.push(periodKey(d, 'week')); } } return out; };
    const labelOf = (k, g) => g === 'month' ? new Date(k + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : new Date(k).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const dark = () => (document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme:dark)').matches);
    const draw = () => {
      const keys = buckets(grain, range); const idx = new Map(keys.map((k, i) => [k, i]));
      const data = { __total: keys.map(() => 0) }; ranked.forEach(s => data[s] = keys.map(() => 0));
      rows.forEach(r => { const i = idx.get(periodKey(r.created_at, grain)); if (i == null) return; data.__total[i]++; data[r.project_type || 'Other'][i]++; });
      const palette = dark() ? COLORS.dark : COLORS.light;
      const series = picked.map((s, i) => ({ name: s, color: palette[i % 4], values: data[s] }));
      const inRange = rows.filter(r => idx.has(periodKey(r.created_at, grain)));
      const conv = inRange.length ? Math.round(inRange.filter(r => r.project_id).length / inRange.length * 100) : 0;
      const top = ranked.map(s => [s, data[s].reduce((a, b) => a + b, 0)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]);
      const max = Math.max(1, ...series.flatMap(s => s.values), 1);
      const W = 720, H = 280, L = 40, R = 20, T = 16, B = 34, pw = W - L - R, ph = H - T - B;
      const x = i => L + (keys.length === 1 ? pw / 2 : pw * i / (keys.length - 1)), y = v => T + ph - ph * v / max;
      const step = Math.max(1, Math.ceil(max / 4));
      let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="viz-svg" role="img" aria-label="Enquiries per ' + grain + ' by service" data-svg>';
      for (let g = 0; g <= max; g += step) svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" class="viz-grid"/><text x="' + (L - 8) + '" y="' + (y(g) + 4) + '" text-anchor="end" class="viz-tick">' + g + '</text>';
      const every = Math.ceil(keys.length / 8);
      keys.forEach((k, i) => { if (i % every === 0 || i === keys.length - 1) svg += '<text x="' + x(i) + '" y="' + (H - 10) + '" text-anchor="middle" class="viz-tick">' + esc(labelOf(k, grain)) + '</text>'; });
      series.forEach(s => {
        svg += '<polyline fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + s.values.map((v, i) => x(i) + ',' + y(v)).join(' ') + '"/>';
        s.values.forEach((v, i) => { svg += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="4" fill="' + s.color + '" stroke="var(--portal-card)" stroke-width="2"/>'; });
      });
      svg += '<line class="viz-cross" data-cross y1="' + T + '" y2="' + (T + ph) + '" x1="0" x2="0" hidden/></svg>';
      host.innerHTML =
        '<div class="portal-grid"><div class="metric-card"><div class="metric-label">Enquiries in range</div><div class="metric-value">' + inRange.length + '</div><div class="metric-note">Last ' + range + ' months</div></div><div class="metric-card"><div class="metric-label">Became projects</div><div class="metric-value">' + conv + '%</div><div class="metric-note">Conversion</div></div><div class="metric-card"><div class="metric-label">Top service</div><div class="metric-value metric-date">' + esc(top[0]?.[0] || '—') + '</div><div class="metric-note">' + (top[0]?.[1] || 0) + ' enquiries</div></div></div>' +
        '<div class="portal-card"><div class="viz-controls"><div class="portal-tabs" style="margin:0;border:0;padding:0"><button class="portal-tab' + (grain === 'month' ? ' active' : '') + '" data-grain="month">Monthly</button><button class="portal-tab' + (grain === 'week' ? ' active' : '') + '" data-grain="week">Weekly</button></div><div class="field" style="min-width:150px"><label for="range">Range</label><select id="range"><option value="3"' + (range === 3 ? ' selected' : '') + '>3 months</option><option value="6"' + (range === 6 ? ' selected' : '') + '>6 months</option><option value="12"' + (range === 12 ? ' selected' : '') + '>12 months</option></select></div></div>' +
        '<h2 style="font-size:16px;margin:14px 0 6px">Enquiries per ' + grain + ', by service</h2>' +
        (rows.length ? '<div class="viz-wrap">' + svg + '<div class="viz-tip" data-tip hidden></div></div>' : empty('No enquiries yet', 'The chart fills in as requests arrive.')) +
        '<div class="viz-legend" role="group" aria-label="Choose services to show (up to 4)">' + ranked.map(s => { const on = picked.includes(s); const ci = picked.indexOf(s); return '<button type="button" class="chip-toggle" aria-pressed="' + on + '" data-svc="' + esc(s) + '">' + (on ? '<i style="background:' + palette[ci % 4] + '"></i>' : '<i class="off"></i>') + esc(s) + '</button>'; }).join('') + '</div>' +
        '<details style="margin-top:14px"><summary class="muted" style="cursor:pointer">View as table</summary><div class="table-scroll"><table class="portal-table"><thead><tr><th>Period</th>' + series.map(s => '<th>' + esc(s.name) + '</th>').join('') + '<th>All services</th></tr></thead><tbody>' + keys.map((k, i) => '<tr><td>' + esc(labelOf(k, grain)) + '</td>' + series.map(s => '<td>' + s.values[i] + '</td>').join('') + '<td>' + data.__total[i] + '</td></tr>').join('') + '</tbody></table></div></details></div>' +
        '<div class="portal-section-head"><h2>Most requested services</h2></div><div class="portal-card">' + (top.length ? top.map(([s, n]) => '<div class="bar-row"><span>' + esc(s) + '</span><div class="bar-track"><i style="width:' + Math.round(n / top[0][1] * 100) + '%"></i></div><b>' + n + '</b></div>').join('') : empty('Nothing to rank yet')) + '</div>';
      $$('[data-grain]', host).forEach(b => b.addEventListener('click', () => { grain = b.dataset.grain; draw(); }));
      $('#range', host).addEventListener('change', e => { range = Number(e.target.value); draw(); });
      $$('[data-svc]', host).forEach(b => b.addEventListener('click', () => { const s = b.dataset.svc; if (picked.includes(s)) { if (picked.length > 1) picked = picked.filter(x => x !== s); } else if (picked.length < 4) picked = [...picked, s]; else toast('Show up to 4 services at once.'); draw(); }));
      const svgEl = $('[data-svg]', host), tip = $('[data-tip]', host), cross = $('[data-cross]', host);
      if (svgEl) {
        svgEl.addEventListener('pointermove', e => {
          const r = svgEl.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; let best = 0, bd = 1e9; keys.forEach((_k, i) => { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } });
          cross.removeAttribute('hidden'); cross.setAttribute('x1', x(best)); cross.setAttribute('x2', x(best));
          tip.hidden = false; tip.innerHTML = '<strong>' + esc(labelOf(keys[best], grain)) + '</strong>' + series.map(s => '<div><i style="background:' + s.color + '"></i>' + esc(s.name) + ': <b>' + s.values[best] + '</b></div>').join('');
          const left = Math.min(r.width - 170, Math.max(0, x(best) / W * r.width + 12)); tip.style.left = left + 'px'; tip.style.top = '8px';
        });
        svgEl.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('hidden', ''); });
      }
    };
    draw();
    S.redrawTrends = draw;
  };

  /* Questions & answers */
  RENDER.questions = async host => {
    const rows = await q(S.sb.from('questions').select('id,user_id,email,question,answer,published,answered_at,created_at').order('created_at', { ascending: false }).limit(300));
    await loadClients().catch(() => {});
    let filter = 'open';
    const draw = () => {
      const list = rows.filter(r => filter === 'open' ? !r.answer : filter === 'published' ? r.published : !!r.answer);
      host.innerHTML = '<div class="portal-tabs"><button class="portal-tab' + (filter === 'open' ? ' active' : '') + '" data-f="open">Waiting (' + rows.filter(r => !r.answer).length + ')</button><button class="portal-tab' + (filter === 'answered' ? ' active' : '') + '" data-f="answered">Answered (' + rows.filter(r => r.answer).length + ')</button><button class="portal-tab' + (filter === 'published' ? ' active' : '') + '" data-f="published">Published (' + rows.filter(r => r.published).length + ')</button></div>' +
        (list.length ? list.map(r => '<article class="portal-card" style="margin-bottom:14px" data-q="' + esc(r.id) + '"><div class="eyebrow">' + esc(r.user_id ? (S.clientById?.get(r.user_id)?.full_name || 'Signed-in client') : 'Guest') + (r.email ? ' · ' + esc(r.email) : '') + ' · ' + esc(fmtDateTime(r.created_at)) + '</div><p style="margin:10px 0 14px;font-weight:600;white-space:pre-wrap">' + esc(r.question) + '</p><div class="field"><label for="a-' + esc(r.id) + '">Your answer</label><textarea id="a-' + esc(r.id) + '" rows="3" maxlength="4000" placeholder="Write an answer…">' + esc(r.answer || '') + '</textarea></div><div style="display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:12px;flex-wrap:wrap"><label class="toggle-field"><input type="checkbox" data-publish' + (r.published ? ' checked' : '') + '> Show on the public Questions section</label><button class="button button-dark" type="button" data-save-q>Save answer</button></div></article>').join('') : '<div class="portal-card">' + empty(filter === 'open' ? 'No questions waiting' : 'Nothing here yet') + '</div>');
      $$('[data-f]', host).forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; draw(); }));
      $$('[data-save-q]', host).forEach(b => b.addEventListener('click', async () => {
        const card = b.closest('[data-q]'), row = rows.find(r => r.id === card.dataset.q), answer = $('textarea', card).value.trim(), publish = $('[data-publish]', card).checked;
        if (publish && !answer) { toast('Write an answer before publishing.', true); return; }
        b.disabled = true;
        try { const upd = { answer: answer || null, published: publish && !!answer, answered_at: answer ? new Date().toISOString() : null }; await q(S.sb.from('questions').update(upd).eq('id', row.id)); Object.assign(row, upd); toast(publish ? 'Answer saved and published.' : 'Answer saved.'); updateBadges(); draw(); } catch (err) { fail(err, 'Could not save'); b.disabled = false; }
      }));
    };
    draw();
  };

  /* Feedback */
  RENDER.feedback = async host => {
    const rows = await q(S.sb.from('feedback').select('id,user_id,rating,text,service,display_name,approved,reviewed,created_at').order('created_at', { ascending: false }).limit(300));
    await loadClients().catch(() => {});
    const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : '—';
    const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    host.innerHTML = '<div class="portal-grid"><div class="metric-card"><div class="metric-label">Average rating</div><div class="metric-value">' + avg + '</div><div class="metric-note">' + rows.length + ' total</div></div><div class="metric-card"><div class="metric-label">To review</div><div class="metric-value">' + rows.filter(r => !r.reviewed).length + '</div><div class="metric-note">Not yet reviewed</div></div><div class="metric-card"><div class="metric-label">Public</div><div class="metric-value">' + rows.filter(r => r.approved).length + '</div><div class="metric-note">Approved testimonials</div></div></div>' +
      (rows.length ? rows.map(r => '<article class="portal-card" style="margin-bottom:14px" data-fb="' + esc(r.id) + '"><div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><strong aria-label="' + r.rating + ' out of 5">' + stars(r.rating) + '</strong><span class="muted">' + esc(r.display_name || (r.user_id ? (S.clientById?.get(r.user_id)?.full_name || 'Client') : 'Anonymous')) + (r.service ? ' · ' + esc(r.service) : '') + ' · ' + esc(fmtDate(r.created_at)) + '</span></div><p style="margin:12px 0;white-space:pre-wrap">' + esc(r.text) + '</p><div style="display:flex;gap:16px;flex-wrap:wrap"><label class="toggle-field"><input type="checkbox" data-reviewed' + (r.reviewed ? ' checked' : '') + '> Reviewed</label><label class="toggle-field"><input type="checkbox" data-approved' + (r.approved ? ' checked' : '') + '> Show publicly as a testimonial</label></div></article>').join('') : '<div class="portal-card">' + empty('No feedback yet', 'Feedback submitted on the site will appear here.') + '</div>');
    host.onchange = async e => {
      const card = e.target.closest('[data-fb]'); if (!card) return; const row = rows.find(r => r.id === card.dataset.fb);
      const reviewed = $('[data-reviewed]', card).checked, approved = $('[data-approved]', card).checked;
      try { await q(S.sb.from('feedback').update({ reviewed: reviewed || approved, approved }).eq('id', row.id)); row.reviewed = reviewed || approved; row.approved = approved; if (approved) $('[data-reviewed]', card).checked = true; toast('Saved.'); updateBadges(); } catch (err) { fail(err, 'Could not save'); }
    };
  };

  /* Time tracking */
  RENDER.time = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    const since = new Date(Date.now() - 56 * 864e5).toISOString();
    const rows = await q(S.sb.from('time_entries').select('id,project_id,started_at,ended_at,minutes,note,billable').gte('started_at', since).order('started_at', { ascending: false }).limit(1000));
    const all = await q(S.sb.from('time_entries').select('project_id,minutes').limit(5000));
    const perProject = {}; all.forEach(r => perProject[r.project_id] = (perProject[r.project_id] || 0) + (r.minutes || 0));
    const weekKey = d => { const t = new Date(d); t.setHours(0, 0, 0, 0); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.toISOString().slice(0, 10); };
    const weeks = []; const mon = new Date(); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); for (let i = 7; i >= 0; i--) { const d = new Date(mon); d.setDate(d.getDate() - i * 7); weeks.push(d.toISOString().slice(0, 10)); }
    const wm = Object.fromEntries(weeks.map(w => [w, 0])); rows.forEach(r => { const k = weekKey(r.started_at); if (k in wm) wm[k] += r.minutes || 0; });
    const wmax = Math.max(1, ...Object.values(wm));
    let running = null; try { running = JSON.parse(localStorage.getItem('dwr-timer') || 'null'); } catch (_e) {}
    const fmtElapsed = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    const draw = () => {
      host.innerHTML = '<div class="portal-two-col"><section><div class="portal-section-head"><h2>Timer</h2></div><div class="portal-card"><form class="portal-form" data-timer-form><div class="field full"><label for="t-project">Project</label><select id="t-project" name="project" required>' + projectOptions(running?.project) + '</select></div><div class="field full"><label for="t-note">What are you working on?</label><input id="t-note" name="note" maxlength="2000" value="' + esc(running?.note || '') + '"></div><div class="field"><label class="toggle-field"><input type="checkbox" name="billable" ' + (running ? (running.billable ? 'checked' : '') : 'checked') + '> Billable</label></div><div class="field" style="align-items:center;justify-content:end;grid-auto-flow:column;gap:12px"><b class="metric-date" data-elapsed>' + (running ? fmtElapsed(Date.now() - running.start) : '00:00:00') + '</b><button class="button button-dark" type="submit">' + (running ? '■ Stop &amp; save' : '▶ Start timer') + '</button></div></form></div>' +
        '<div class="portal-section-head"><h2>Add time manually</h2></div><div class="portal-card"><form class="portal-form" data-manual-form><div class="field full"><label for="mt-project">Project</label><select id="mt-project" name="project" required>' + projectOptions() + '</select></div><div class="field"><label for="mt-date">Date</label><input id="mt-date" name="date" type="date" required value="' + new Date().toISOString().slice(0, 10) + '"></div><div class="field"><label for="mt-min">Minutes</label><input id="mt-min" name="minutes" type="number" min="1" max="1440" required></div><div class="field full"><label for="mt-note">Note</label><input id="mt-note" name="note" maxlength="2000"></div><div class="field full" style="display:flex;justify-content:space-between;align-items:center"><label class="toggle-field"><input type="checkbox" name="billable" checked> Billable</label><button class="button" type="submit">Add entry</button></div></form></div></section>' +
        '<section><div class="portal-section-head"><h2>Hours per week</h2></div><div class="portal-card"><div class="week-bars" role="img" aria-label="Hours per week for the last 8 weeks">' + weeks.map(w => '<div class="week-bar"><span class="wb-val">' + hours(wm[w]) + '</span><i style="height:' + Math.round(wm[w] / wmax * 100) + '%"></i><small>' + esc(new Date(w).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) + '</small></div>').join('') + '</div></div>' +
        '<div class="portal-section-head"><h2>Time per project</h2></div><div class="portal-card">' + (Object.keys(perProject).length ? Object.entries(perProject).sort((a, b) => b[1] - a[1]).map(([id, m]) => '<div class="request-row"><div><strong>' + esc(S.projectById.get(id)?.title || 'Project') + '</strong><span>' + esc(clientName(S.projectById.get(id)?.client_id)) + '</span></div><b>' + hours(m) + ' h</b></div>').join('') : empty('No time logged yet')) + '</div></section></div>' +
        '<div class="portal-section-head"><h2>Recent entries</h2></div><div class="portal-card table-scroll">' + (rows.length ? '<table class="portal-table"><thead><tr><th>Date</th><th>Project</th><th>Note</th><th>Hours</th><th>Billable</th></tr></thead><tbody>' + rows.slice(0, 40).map(r => '<tr><td>' + esc(fmtDate(r.started_at)) + '</td><td>' + esc(S.projectById.get(r.project_id)?.title || '—') + '</td><td>' + esc(r.note || '—') + '</td><td>' + hours(r.minutes) + '</td><td>' + (r.billable ? 'Yes' : 'No') + '</td></tr>').join('') + '</tbody></table>' : empty('No entries yet')) + '</div>';
      const tick = $('[data-elapsed]', host);
      if (running) S.pollId = setInterval(() => { if (S.route === 'time' && tick.isConnected) tick.textContent = fmtElapsed(Date.now() - running.start); }, 1000);
      $('[data-timer-form]', host).addEventListener('submit', async e => {
        e.preventDefault(); const f = e.currentTarget; const btn = f.querySelector('[type=submit]');
        if (!running) { running = { start: Date.now(), project: f.project.value, note: f.note.value.trim(), billable: f.billable.checked }; try { localStorage.setItem('dwr-timer', JSON.stringify(running)); } catch (_e) {} clearInterval(S.pollId); draw(); return; }
        btn.disabled = true;
        try {
          const minutes = Math.max(1, Math.round((Date.now() - running.start) / 60000));
          await q(S.sb.from('time_entries').insert({ project_id: f.project.value || running.project, actor_id: S.user.id, started_at: new Date(running.start).toISOString(), ended_at: new Date().toISOString(), minutes, note: f.note.value.trim(), billable: f.billable.checked }));
          running = null; try { localStorage.removeItem('dwr-timer'); } catch (_e) {} toast('Time saved.'); clearInterval(S.pollId); await RENDER.time(host);
        } catch (err) { fail(err, 'Could not save time'); btn.disabled = false; }
      });
      $('[data-manual-form]', host).addEventListener('submit', async e => {
        e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
        try {
          const start = new Date(f.date.value + 'T09:00:00'); const minutes = Number(f.minutes.value);
          await q(S.sb.from('time_entries').insert({ project_id: f.project.value, actor_id: S.user.id, started_at: start.toISOString(), ended_at: new Date(start.getTime() + minutes * 60000).toISOString(), minutes, note: f.note.value.trim(), billable: f.billable.checked }));
          toast('Time added.'); clearInterval(S.pollId); await RENDER.time(host);
        } catch (err) { fail(err, 'Could not add time'); btn.disabled = false; }
      });
    };
    draw();
  };

  /* Billing */
  RENDER.billing = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    const invoices = await q(S.sb.from('invoices').select('id,client_id,project_id,invoice_number,description,amount,currency,status,issued_at,due_at,paid_at,payment_url').order('issued_at', { ascending: false }).limit(200));
    const outstanding = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((a, i) => a + Number(i.amount), 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((a, i) => a + Number(i.amount), 0);
    host.innerHTML = '<div class="portal-grid"><div class="metric-card"><div class="metric-label">Outstanding</div><div class="metric-value">' + money(outstanding) + '</div><div class="metric-note">Pending or overdue</div></div><div class="metric-card"><div class="metric-label">Paid</div><div class="metric-value">' + money(paid) + '</div><div class="metric-note">All time</div></div></div>' +
      '<div class="portal-two-col"><section><div class="portal-section-head"><h2>Invoices</h2></div><div class="portal-card table-scroll">' + (invoices.length ? '<table class="portal-table"><thead><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>' + invoices.map(i => '<tr><td><strong>' + esc(i.invoice_number) + '</strong><small>' + esc(i.description) + '</small></td><td>' + esc(clientName(i.client_id)) + '</td><td>' + money(i.amount) + '</td><td><select aria-label="Invoice status" data-inv-status="' + esc(i.id) + '">' + ['draft', 'pending', 'paid', 'overdue', 'cancelled'].map(s => '<option value="' + s + '"' + (s === i.status ? ' selected' : '') + '>' + nice(s) + '</option>').join('') + '</select></td><td>' + esc(fmtDate(i.due_at)) + '</td></tr>').join('') + '</tbody></table>' : empty('No invoices yet')) + '</div></section>' +
      '<section><div class="portal-section-head"><h2>New invoice</h2></div><div class="portal-card"><form class="portal-form" data-inv-form style="grid-template-columns:1fr"><div class="field"><label for="i-client">Client</label><select id="i-client" name="client" required>' + clientOptions() + '</select></div><div class="field"><label for="i-project">Project (optional)</label><select id="i-project" name="project">' + projectOptions().replace('Choose a project…', 'No project') + '</select></div><div class="field"><label for="i-number">Invoice number</label><input id="i-number" name="number" required maxlength="40" placeholder="INV-001"></div><div class="field"><label for="i-desc">Description</label><input id="i-desc" name="description" required maxlength="300"></div><div class="field"><label for="i-amount">Amount (INR)</label><input id="i-amount" name="amount" type="number" min="0" step="0.01" required></div><div class="field"><label for="i-due">Due date</label><input id="i-due" name="due" type="date"></div><div class="field"><label for="i-url">Payment link (https)</label><input id="i-url" name="url" type="url" placeholder="https://…"></div><div style="display:flex;justify-content:flex-end"><button class="button button-dark" type="submit">Create invoice ↗</button></div></form></div></section></div>';
    host.onchange = async e => {
      const sel = e.target.closest('[data-inv-status]'); if (!sel) return; sel.disabled = true;
      try { const status = sel.value; await q(S.sb.from('invoices').update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', sel.dataset.invStatus)); toast('Invoice updated.'); } catch (err) { fail(err, 'Could not update'); } finally { sel.disabled = false; }
    };
    $('[data-inv-form]', host).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'); btn.disabled = true;
      try {
        const pid = f.project.value || null; if (pid && S.projectById.get(pid)?.client_id !== f.client.value) throw new Error('The selected project belongs to a different client.');
        const url = f.url.value.trim() || null; if (url && !safeHttps(url)) throw new Error('Payment links must use HTTPS.');
        await q(S.sb.from('invoices').insert({ client_id: f.client.value, project_id: pid, invoice_number: f.number.value.trim(), description: f.description.value.trim(), amount: Number(f.amount.value), currency: 'INR', status: 'pending', due_at: f.due.value ? new Date(f.due.value + 'T23:59:59').toISOString() : null, payment_url: url }));
        toast('Invoice created.'); await RENDER.billing(host);
      } catch (err) { fail(err, 'Could not create invoice'); btn.disabled = false; }
    });
  };

  /* Deliverables */
  RENDER.deliverables = async host => {
    await Promise.all([loadClients(), loadProjects()]);
    host.innerHTML = '<div class="portal-card" style="max-width:640px"><form class="portal-form" data-del-form style="grid-template-columns:1fr"><div class="field"><label for="d-project">Project</label><select id="d-project" name="project" required>' + projectOptions() + '</select></div><div class="field"><label for="d-title">Title</label><input id="d-title" name="title" required maxlength="160"></div><div class="field"><label for="d-desc">Description</label><textarea id="d-desc" name="description" rows="3" maxlength="2000"></textarea></div><div class="field"><label for="d-file">File (PDF, image, ZIP or text, up to 50 MB)</label><input id="d-file" name="file" type="file" required></div><div style="display:flex;justify-content:flex-end"><button class="button button-dark" type="submit">Upload privately ↗</button></div></form></div>';
    $('[data-del-form]', host).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.currentTarget, btn = f.querySelector('[type=submit]'), file = f.file.files[0]; btn.disabled = true; let path = '';
      try {
        if (!file) throw new Error('Choose a file to upload.'); if (file.size > 50 * 1024 * 1024) throw new Error('Files must be 50 MB or smaller.');
        const ext = (file.name.split('.').pop() || '').toLowerCase(); const okType = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'application/zip', 'application/x-zip-compressed', 'text/plain'];
        if (!okType.includes(file.type) && !['pdf', 'png', 'jpg', 'jpeg', 'webp', 'zip', 'txt'].includes(ext)) throw new Error('That file type is not supported.');
        path = f.project.value + '/' + crypto.randomUUID() + '-' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-140);
        await q(S.sb.storage.from('client-deliverables').upload(path, file, { contentType: file.type, upsert: false }));
        const { error } = await S.sb.from('deliverables').insert({ project_id: f.project.value, title: f.title.value.trim(), description: f.description.value.trim(), file_url: path, status: 'ready' });
        if (error) { await S.sb.storage.from('client-deliverables').remove([path]); throw error; }
        toast('Uploaded and shared with the client.'); f.reset();
      } catch (err) { fail(err, 'Upload failed'); } finally { btn.disabled = false; }
    });
  };

  /* Settings & audit */
  RENDER.settings = async host => {
    await loadClients();
    const [audit, deletions] = await Promise.all([
      q(S.sb.from('audit_log').select('id,actor_id,action,entity,created_at,meta').order('created_at', { ascending: false }).limit(100)),
      q(S.sb.from('account_deletion_requests').select('id,user_id,email,reason,status,created_at').order('created_at', { ascending: false }).limit(50))
    ]);
    host.innerHTML = '<div class="portal-section-head"><h2>Account roles</h2></div><div class="portal-card table-scroll"><table class="portal-table"><thead><tr><th>Account</th><th>Role</th><th></th></tr></thead><tbody>' + S.clients.map(c => '<tr><td><strong>' + esc(c.full_name || 'Unnamed') + '</strong><small>' + esc(c.email) + '</small></td><td>' + badge(c.role === 'admin' ? 'Admin' : 'Client', c.role === 'admin' ? 'in_progress' : '') + '</td><td>' + (c.id === S.user.id ? '<span class="muted">You</span>' : '<button class="button" type="button" data-role-btn="' + esc(c.id) + '" data-to="' + (c.role === 'admin' ? 'client' : 'admin') + '">Make ' + (c.role === 'admin' ? 'client' : 'admin') + '</button>') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<div class="portal-section-head"><h2>Deletion requests</h2></div><div class="portal-card table-scroll">' + (deletions.length ? '<table class="portal-table"><thead><tr><th>Account</th><th>Reason</th><th>Requested</th><th>Status</th></tr></thead><tbody>' + deletions.map(d => '<tr><td>' + esc(d.email) + '</td><td>' + esc(d.reason || '—') + '</td><td>' + esc(fmtDate(d.created_at)) + '</td><td><select aria-label="Request status" data-del-status="' + esc(d.id) + '">' + ['pending', 'in_review', 'completed', 'declined'].map(s => '<option value="' + s + '"' + (s === d.status ? ' selected' : '') + '>' + nice(s) + '</option>').join('') + '</select></td></tr>').join('') + '</tbody></table>' : empty('No deletion requests')) + '</div>' +
      '<div class="portal-section-head"><h2>Activity log</h2></div><div class="portal-card table-scroll">' + (audit.length ? '<table class="portal-table"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Item</th></tr></thead><tbody>' + audit.map(a => '<tr><td>' + esc(fmtDateTime(a.created_at)) + '</td><td>' + esc(a.actor_id ? (S.clientById?.get(a.actor_id)?.full_name || 'User') : 'Visitor / system') + '</td><td>' + esc(nice(a.action)) + '</td><td>' + esc(nice(a.entity)) + '</td></tr>').join('') + '</tbody></table>' : empty('No activity yet')) + '</div>';
    host.onclick = async e => {
      const b = e.target.closest('[data-role-btn]'); if (!b) return;
      if (!confirm('Change this account to ' + b.dataset.to + '?')) return; b.disabled = true;
      try { await q(S.sb.rpc('set_profile_role', { p_user_id: b.dataset.roleBtn, p_role: b.dataset.to })); toast('Role updated.'); await RENDER.settings(host); } catch (err) { fail(err, 'Could not change role'); b.disabled = false; }
    };
    host.onchange = async e => {
      const s = e.target.closest('[data-del-status]'); if (!s) return; s.disabled = true;
      try { await q(S.sb.from('account_deletion_requests').update({ status: s.value, resolved_at: ['completed', 'declined'].includes(s.value) ? new Date().toISOString() : null }).eq('id', s.dataset.delStatus)); toast('Request updated.'); } catch (err) { fail(err, 'Could not update'); } finally { s.disabled = false; }
    };
  };

  /* ---------- boot ---------- */
  async function init() {
    if (!$('[data-page="admin"]')) return;
    const errBox = $('[data-error-message]');
    const stop = msg => { errBox.hidden = false; errBox.textContent = msg; };
    S.sb = window.supabaseClient;
    if (!S.sb) { stop('The secure database connection did not initialise. Reload the page; if it persists, check the Supabase script.'); return; }
    const { data: { user }, error: authError } = await S.sb.auth.getUser();
    if (authError || !user) { location.replace('/auth.html?next=' + encodeURIComponent('/admin-console.html' + location.hash)); return; }
    S.user = user;
    const { data: profile, error: profileError } = await S.sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profileError) { stop('We could not verify administrator access. Please refresh and try again.'); return; }
    if (profile?.role !== 'admin') { location.replace('/client-dashboard.html'); return; }

    $('[data-sign-out]').addEventListener('click', async () => { const { error } = await S.sb.auth.signOut(); if (error) { toast(error.message, true); return; } location.replace('/auth.html'); });
    $('[data-refresh]').addEventListener('click', refresh);
    const bell = $('[data-bell]'), panel = $('[data-bell-panel]');
    bell.addEventListener('click', async () => { panel.hidden = !panel.hidden; bell.setAttribute('aria-expanded', String(!panel.hidden)); if (!panel.hidden) await loadBell(); });
    document.addEventListener('click', e => { if (!panel.hidden && !e.target.closest('.bell-wrap')) { panel.hidden = true; bell.setAttribute('aria-expanded', 'false'); } });
    $('[data-bell-readall]').addEventListener('click', async () => { try { await q(S.sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', S.user.id).is('read_at', null)); await loadBell(); updateBadges(); } catch (err) { fail(err, 'Could not update'); } });
    $('[data-bell-list]').addEventListener('click', async e => { const a = e.target.closest('[data-notif]'); if (!a) return; panel.hidden = true; S.sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', a.dataset.notif).then(updateBadges); });
    window.addEventListener('hashchange', go);
    new MutationObserver(() => { if (S.route === 'trends' && S.redrawTrends) S.redrawTrends(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    await go();
    setInterval(() => { if (!document.hidden) updateBadges(); }, 60000);
  }
  document.addEventListener('DOMContentLoaded', init);
})();
