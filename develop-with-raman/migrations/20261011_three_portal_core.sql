-- Develop with Raman: additive three-portal data layer.
-- Existing tables and records are retained. Intake content is immutable; only status/read/project references can change.

create schema if not exists private;

alter table public.leads
  add column if not exists submitter_type text not null default 'anonymous',
  add column if not exists read_at timestamptz,
  add column if not exists project_id uuid;

update public.leads
set submitter_type = case when user_id is null then 'anonymous' else 'client' end
where submitter_type is null or submitter_type not in ('anonymous','client');

alter table public.leads
  drop constraint if exists leads_submitter_type_check;
alter table public.leads
  add constraint leads_submitter_type_check check (submitter_type in ('anonymous','client'));

alter table public.projects
  alter column client_id drop not null,
  add column if not exists pending_client_email text,
  add column if not exists source_lead_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='leads_project_id_fkey' and conrelid='public.leads'::regclass) then
    alter table public.leads add constraint leads_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname='projects_source_lead_id_fkey' and conrelid='public.projects'::regclass) then
    alter table public.projects add constraint projects_source_lead_id_fkey
      foreign key (source_lead_id) references public.leads(id) on delete set null;
  end if;
end $$;

create index if not exists leads_project_id_idx on public.leads(project_id);
create index if not exists leads_submitter_created_idx on public.leads(submitter_type, created_at desc);
create index if not exists projects_pending_client_email_idx on public.projects(lower(pending_client_email)) where client_id is null;

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  status_before text,
  status_after text,
  progress_before integer check (progress_before between 0 and 100),
  progress_after integer check (progress_after between 0 and 100),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (char_length(type) between 1 and 80),
  title text not null check (char_length(title) between 1 and 180),
  body text not null default '' check (char_length(body) <= 1200),
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;

create table if not exists public.client_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists client_threads_client_project_idx on public.client_threads(client_id, project_id) where project_id is not null;
create unique index if not exists client_threads_client_general_idx on public.client_threads(client_id) where project_id is null;

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.client_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 10000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists client_messages_thread_created_idx on public.client_messages(thread_id, created_at);
create index if not exists client_messages_unread_idx on public.client_messages(thread_id, read_at) where read_at is null;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  text text not null check (char_length(trim(text)) between 1 and 4000),
  service text,
  project_id uuid references public.projects(id) on delete set null,
  display_name text,
  approved boolean not null default false,
  reviewed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedback_review_queue_idx on public.feedback(reviewed, created_at desc);
create index if not exists feedback_approved_idx on public.feedback(approved, created_at desc);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  question text not null check (char_length(trim(question)) between 5 and 3000),
  answer text,
  published boolean not null default false,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists questions_queue_idx on public.questions(published, answered_at, created_at desc);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  minutes integer check (minutes is null or minutes between 0 and 100000),
  note text not null default '' check (char_length(note) <= 2000),
  billable boolean not null default true,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);
create index if not exists time_entries_project_started_idx on public.time_entries(project_id, started_at desc);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log(created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log(entity, entity_id, created_at desc);

create table if not exists private.intake_rate_limits (
  ip_hash text not null,
  intake_kind text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (ip_hash, intake_kind)
);
alter table private.intake_rate_limits enable row level security;
revoke all on private.intake_rate_limits from public, anon, authenticated;

create or replace function public.consume_intake_rate_limit(
  p_ip_hash text, p_kind text, p_limit integer, p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 32
     or p_kind not in ('enquiry','question','feedback')
     or p_limit < 1 or p_limit > 20
     or p_window_seconds < 60 or p_window_seconds > 86400 then
    return false;
  end if;

  insert into private.intake_rate_limits(ip_hash, intake_kind, window_started_at, request_count)
  values (p_ip_hash, p_kind, now(), 1)
  on conflict (ip_hash, intake_kind) do update
    set window_started_at = case
          when private.intake_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now() else private.intake_rate_limits.window_started_at end,
        request_count = case
          when private.intake_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1 else private.intake_rate_limits.request_count + 1 end
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$function$;
revoke all on function public.consume_intake_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_intake_rate_limit(text,text,integer,integer) to service_role;

create or replace function private.write_audit(p_action text, p_entity text, p_entity_id uuid, p_meta jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $function$
  insert into public.audit_log(actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_meta, '{}'::jsonb));
$function$;
revoke all on function private.write_audit(text,text,uuid,jsonb) from public, anon, authenticated;

create or replace function private.prepare_lead_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    new.submitter_type := case when new.user_id is null then 'anonymous' else 'client' end;
  elsif auth.uid() is null then
    new.user_id := null;
    new.submitter_type := 'anonymous';
  else
    new.user_id := auth.uid();
    new.submitter_type := 'client';
    new.client_email := coalesce(new.client_email, auth.jwt()->>'email');
  end if;
  new.status := 'New';
  new.read_at := null;
  new.project_id := null;
  new.updated_at := now();
  return new;
end;
$function$;

create or replace function private.guard_lead_immutability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (new.id, new.name, new.email, new.whatsapp, new.project_type, new.budget_range,
      new.deadline, new.preferred_payment, new.description, new.user_id, new.client_email,
      new.submitter_type, new.created_at)
     is distinct from
     (old.id, old.name, old.email, old.whatsapp, old.project_type, old.budget_range,
      old.deadline, old.preferred_payment, old.description, old.user_id, old.client_email,
      old.submitter_type, old.created_at) then
    raise exception 'Enquiry content is immutable';
  end if;
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists leads_prepare_insert on public.leads;
create trigger leads_prepare_insert before insert on public.leads
for each row execute function private.prepare_lead_insert();
drop trigger if exists leads_immutable_content on public.leads;
create trigger leads_immutable_content before update on public.leads
for each row execute function private.guard_lead_immutability();

revoke update, delete on public.leads from anon, authenticated;
grant insert on public.leads to anon, authenticated;
grant select on public.leads to authenticated;
grant update(status, project_id, read_at, updated_at) on public.leads to authenticated;

create or replace function private.prepare_feedback_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.user_id := auth.uid();
  end if;
  new.approved := false;
  new.reviewed := false;
  return new;
end;
$function$;

create or replace function private.guard_feedback_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (new.id, new.user_id, new.rating, new.text, new.service, new.project_id, new.display_name, new.created_at)
     is distinct from
     (old.id, old.user_id, old.rating, old.text, old.service, old.project_id, old.display_name, old.created_at) then
    raise exception 'Feedback content is immutable';
  end if;
  return new;
end;
$function$;

create or replace function private.prepare_question_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    new.user_id := auth.uid();
  end if;
  new.answer := null;
  new.published := false;
  new.answered_at := null;
  return new;
end;
$function$;

create or replace function private.guard_question_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (new.id, new.user_id, new.email, new.question, new.created_at)
     is distinct from
     (old.id, old.user_id, old.email, old.question, old.created_at) then
    raise exception 'Question content is immutable';
  end if;
  return new;
end;
$function$;

create or replace function private.guard_client_message_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if (new.id, new.thread_id, new.sender_id, new.body, new.created_at)
     is distinct from
     (old.id, old.thread_id, old.sender_id, old.body, old.created_at) then
    raise exception 'Messages are immutable';
  end if;
  return new;
end;
$function$;

drop trigger if exists feedback_prepare_insert on public.feedback;
create trigger feedback_prepare_insert before insert on public.feedback
for each row execute function private.prepare_feedback_insert();
drop trigger if exists feedback_immutable_content on public.feedback;
create trigger feedback_immutable_content before update on public.feedback
for each row execute function private.guard_feedback_content();
drop trigger if exists questions_prepare_insert on public.questions;
create trigger questions_prepare_insert before insert on public.questions
for each row execute function private.prepare_question_insert();
drop trigger if exists questions_immutable_content on public.questions;
create trigger questions_immutable_content before update on public.questions
for each row execute function private.guard_question_content();
drop trigger if exists client_messages_immutable_content on public.client_messages;
create trigger client_messages_immutable_content before update on public.client_messages
for each row execute function private.guard_client_message_content();

alter table public.project_updates enable row level security;
alter table public.notifications enable row level security;
alter table public.client_threads enable row level security;
alter table public.client_messages enable row level security;
alter table public.feedback enable row level security;
alter table public.questions enable row level security;
alter table public.time_entries enable row level security;
alter table public.audit_log enable row level security;

grant select on public.project_updates to authenticated;
grant insert on public.project_updates to authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select, insert, update, delete on public.client_threads to authenticated;
grant select, insert on public.client_messages to authenticated;
grant update(read_at) on public.client_messages to authenticated;
grant select, insert on public.feedback to anon, authenticated;
grant select, insert on public.questions to anon, authenticated;
grant update(answer, published, answered_at) on public.questions to authenticated;
grant update(approved, reviewed) on public.feedback to authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;
grant select on public.audit_log to authenticated;

drop policy if exists "Project participants read updates" on public.project_updates;
create policy "Project participants read updates" on public.project_updates for select to authenticated
using (exists(select 1 from public.projects p where p.id=project_updates.project_id and (p.client_id=auth.uid() or private.is_admin())));
drop policy if exists "Admins add project updates" on public.project_updates;
create policy "Admins add project updates" on public.project_updates for insert to authenticated
with check (private.is_admin());

drop policy if exists "Users read own notifications or admin reads all" on public.notifications;
create policy "Users read own notifications or admin reads all" on public.notifications for select to authenticated
using (user_id=auth.uid() or private.is_admin());
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications for update to authenticated
using (user_id=auth.uid() or private.is_admin())
with check (user_id=auth.uid() or private.is_admin());

drop policy if exists "Participants read client threads" on public.client_threads;
create policy "Participants read client threads" on public.client_threads for select to authenticated
using (client_id=auth.uid() or private.is_admin());
drop policy if exists "Clients create own threads" on public.client_threads;
create policy "Clients create own threads" on public.client_threads for insert to authenticated
with check (client_id=auth.uid() and (project_id is null or exists(select 1 from public.projects p where p.id=project_id and p.client_id=auth.uid())));
drop policy if exists "Admins manage client threads" on public.client_threads;
create policy "Admins manage client threads" on public.client_threads for all to authenticated
using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Participants read client messages" on public.client_messages;
create policy "Participants read client messages" on public.client_messages for select to authenticated
using (exists(select 1 from public.client_threads t where t.id=client_messages.thread_id and (t.client_id=auth.uid() or private.is_admin())));
drop policy if exists "Participants send client messages" on public.client_messages;
create policy "Participants send client messages" on public.client_messages for insert to authenticated
with check (sender_id=auth.uid() and exists(select 1 from public.client_threads t where t.id=client_messages.thread_id and (t.client_id=auth.uid() or private.is_admin())));
drop policy if exists "Participants mark messages read" on public.client_messages;
create policy "Participants mark messages read" on public.client_messages for update to authenticated
using (exists(select 1 from public.client_threads t where t.id=client_messages.thread_id and (t.client_id=auth.uid() or private.is_admin())))
with check (exists(select 1 from public.client_threads t where t.id=client_messages.thread_id and (t.client_id=auth.uid() or private.is_admin())));

drop policy if exists "Admins read feedback" on public.feedback;
create policy "Admins read feedback" on public.feedback for select to authenticated using (private.is_admin());
drop policy if exists "Clients read own feedback" on public.feedback;
create policy "Clients read own feedback" on public.feedback for select to authenticated using (user_id=auth.uid());
drop policy if exists "Anyone submits anonymous feedback" on public.feedback;
create policy "Anyone submits anonymous feedback" on public.feedback for insert to anon with check (user_id is null and approved=false and reviewed=false);
drop policy if exists "Clients submit own feedback" on public.feedback;
create policy "Clients submit own feedback" on public.feedback for insert to authenticated with check (user_id=auth.uid() and approved=false and reviewed=false);
drop policy if exists "Admins review feedback" on public.feedback;
create policy "Admins review feedback" on public.feedback for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Public reads published questions" on public.questions;
create policy "Public reads published questions" on public.questions for select to anon, authenticated using (published=true and answer is not null);
drop policy if exists "Clients read own questions" on public.questions;
create policy "Clients read own questions" on public.questions for select to authenticated using (user_id=auth.uid());
drop policy if exists "Admins read all questions" on public.questions;
create policy "Admins read all questions" on public.questions for select to authenticated using (private.is_admin());
drop policy if exists "Anyone submits anonymous questions" on public.questions;
create policy "Anyone submits anonymous questions" on public.questions for insert to anon with check (user_id is null and published=false and answer is null);
drop policy if exists "Clients submit own questions" on public.questions;
create policy "Clients submit own questions" on public.questions for insert to authenticated with check (user_id=auth.uid() and published=false and answer is null);
drop policy if exists "Admins answer and publish questions" on public.questions;
create policy "Admins answer and publish questions" on public.questions for update to authenticated using (private.is_admin()) with check (private.is_admin());

drop policy if exists "Admins manage time entries" on public.time_entries;
create policy "Admins manage time entries" on public.time_entries for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists "Clients read billable time for own projects" on public.time_entries;
create policy "Clients read billable time for own projects" on public.time_entries for select to authenticated
using (billable=true and exists(select 1 from public.projects p where p.id=time_entries.project_id and p.client_id=auth.uid()));

drop policy if exists "Admins read audit log" on public.audit_log;
create policy "Admins read audit log" on public.audit_log for select to authenticated using (private.is_admin());

create or replace function private.on_lead_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare a record;
begin
  for a in select id from public.profiles where role='admin' loop
    insert into public.notifications(user_id,type,title,body,link)
    values(a.id,'new_enquiry','New enquiry received','A new project enquiry is waiting for review.','/admin-portal.html');
  end loop;
  perform private.write_audit('enquiry_submitted','lead',new.id,jsonb_build_object('submitter_type',new.submitter_type,'project_type',new.project_type));
  return new;
end;
$function$;

create or replace function private.on_project_progress_change()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare msg text;
begin
  if new.status is distinct from old.status or new.progress is distinct from old.progress then
    msg := concat_ws(' · ',
      case when new.status is distinct from old.status then 'Status: '||old.status||' → '||new.status end,
      case when new.progress is distinct from old.progress then 'Progress: '||old.progress||'% → '||new.progress||'%' end);
    insert into public.project_updates(project_id,message,status_before,status_after,progress_before,progress_after,created_by)
    values(new.id,msg,old.status,new.status,old.progress,new.progress,auth.uid());
    if new.client_id is not null then
      insert into public.notifications(user_id,type,title,body,link)
      values(new.client_id,'project_update','Project updated',msg,'/client-dashboard.html');
    end if;
    perform private.write_audit('project_updated','project',new.id,jsonb_build_object('status_before',old.status,'status_after',new.status,'progress_before',old.progress,'progress_after',new.progress));
  end if;
  return new;
end;
$function$;
drop trigger if exists projects_notify_progress_change on public.projects;
create trigger projects_notify_progress_change after update of status, progress on public.projects
for each row execute function private.on_project_progress_change();

create or replace function private.on_feedback_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare a record;
begin
  for a in select id from public.profiles where role='admin' loop
    insert into public.notifications(user_id,type,title,body,link)
    values(a.id,'new_feedback','New feedback received','New feedback is waiting for review.','/admin-portal.html#feedback');
  end loop;
  perform private.write_audit('feedback_submitted','feedback',new.id,jsonb_build_object('rating',new.rating,'service',new.service));
  return new;
end;
$function$;
drop trigger if exists feedback_notify_admins on public.feedback;
create trigger feedback_notify_admins after insert on public.feedback for each row execute function private.on_feedback_created();

create or replace function private.on_question_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare a record;
begin
  for a in select id from public.profiles where role='admin' loop
    insert into public.notifications(user_id,type,title,body,link)
    values(a.id,'new_question','New question received','A visitor submitted a question.','/admin-portal.html#questions');
  end loop;
  perform private.write_audit('question_submitted','question',new.id,'{}'::jsonb);
  return new;
end;
$function$;
drop trigger if exists questions_notify_admins on public.questions;
create trigger questions_notify_admins after insert on public.questions for each row execute function private.on_question_created();

create or replace function private.on_question_answered()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  if new.answer is distinct from old.answer and new.user_id is not null then
    insert into public.notifications(user_id,type,title,body,link)
    values(new.user_id,'question_answered','Your question was answered','Raman has replied to your question.','/#questions');
  end if;
  return new;
end;
$function$;
drop trigger if exists questions_notify_answer on public.questions;
create trigger questions_notify_answer after update of answer on public.questions for each row execute function private.on_question_answered();

create or replace function private.on_project_message_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare p record; a record;
begin
  select id,client_id,title into p from public.projects where id=new.project_id;
  if p.client_id is null then return new; end if;
  if new.sender_id=p.client_id then
    for a in select id from public.profiles where role='admin' loop
      insert into public.notifications(user_id,type,title,body,link)
      values(a.id,'new_message','New client message','A client sent a project message.','/admin-portal.html#messages');
    end loop;
  else
    insert into public.notifications(user_id,type,title,body,link)
    values(p.client_id,'new_message','New message from Raman','There is a new message on your project.','/client-dashboard.html');
  end if;
  perform private.write_audit('message_sent','message',new.id,jsonb_build_object('project_id',new.project_id));
  return new;
end;
$function$;
drop trigger if exists messages_notify_participants on public.messages;
create trigger messages_notify_participants after insert on public.messages for each row execute function private.on_project_message_created();

create or replace function private.on_client_message_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare t record; a record;
begin
  select client_id into t from public.client_threads where id=new.thread_id;
  if t.client_id is null then return new; end if;
  if new.sender_id=t.client_id then
    for a in select id from public.profiles where role='admin' loop
      insert into public.notifications(user_id,type,title,body,link)
      values(a.id,'new_message','New client message','A client sent a direct message.','/admin-portal.html#messages');
    end loop;
  else
    insert into public.notifications(user_id,type,title,body,link)
    values(t.client_id,'new_message','New message from Raman','Raman sent you a message.','/client-dashboard.html');
  end if;
  perform private.write_audit('message_sent','client_message',new.id,jsonb_build_object('thread_id',new.thread_id));
  update public.client_threads set updated_at=now() where id=new.thread_id;
  return new;
end;
$function$;
drop trigger if exists client_messages_notify_participants on public.client_messages;
create trigger client_messages_notify_participants after insert on public.client_messages for each row execute function private.on_client_message_created();

create or replace function private.on_deliverable_created()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare p record;
begin
  select client_id,title into p from public.projects where id=new.project_id;
  if p.client_id is not null then
    insert into public.notifications(user_id,type,title,body,link)
    values(p.client_id,'new_deliverable','New deliverable available','A deliverable was added to your project.','/client-dashboard.html');
  end if;
  perform private.write_audit('deliverable_added','deliverable',new.id,jsonb_build_object('project_id',new.project_id));
  return new;
end;
$function$;
drop trigger if exists deliverables_notify_client on public.deliverables;
create trigger deliverables_notify_client after insert on public.deliverables for each row execute function private.on_deliverable_created();

create or replace function private.on_time_entry_audit()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  perform private.write_audit(case when tg_op='INSERT' then 'time_entry_created' else 'time_entry_updated' end,'time_entry',coalesce(new.id,old.id),jsonb_build_object('project_id',coalesce(new.project_id,old.project_id),'billable',coalesce(new.billable,old.billable)));
  return coalesce(new,old);
end;
$function$;
drop trigger if exists time_entries_audit on public.time_entries;
create trigger time_entries_audit after insert or update on public.time_entries for each row execute function private.on_time_entry_audit();

create or replace function public.create_project_from_lead(
  p_lead_id uuid,
  p_title text,
  p_description text,
  p_service_type text,
  p_client_id uuid default null,
  p_pending_client_email text default null,
  p_due_date date default null
) returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare l public.leads%rowtype; v_project_id uuid; v_email text;
begin
  if not private.is_admin() then raise exception 'Administrator access required'; end if;
  select * into l from public.leads where id=p_lead_id for update;
  if not found then raise exception 'Enquiry not found'; end if;
  if l.project_id is not null then raise exception 'This enquiry already has a project'; end if;
  if char_length(trim(coalesce(p_title,''))) < 3 or char_length(p_title) > 180 then raise exception 'Project title must be 3–180 characters'; end if;
  if char_length(trim(coalesce(p_description,''))) < 1 or char_length(p_description) > 10000 then raise exception 'Project description is required and must be at most 10000 characters'; end if;
  if p_client_id is not null then
    if not exists(select 1 from public.profiles where id=p_client_id and role='client') then raise exception 'Choose a registered client account'; end if;
    if p_pending_client_email is not null then raise exception 'Choose a client account or pending email, not both'; end if;
    v_email := null;
  else
    v_email := lower(trim(coalesce(p_pending_client_email,l.email)));
    if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid pending client email is required'; end if;
  end if;
  insert into public.projects(client_id,pending_client_email,title,description,service_type,status,progress,due_date,created_by,source_lead_id)
  values(p_client_id,v_email,trim(p_title),trim(p_description),coalesce(nullif(trim(p_service_type),''),l.project_type,'Web Development'),'planning',0,p_due_date,auth.uid(),l.id)
  returning id into v_project_id;
  update public.leads set project_id=v_project_id, status=case when status='New' then 'Scoped' else status end where id=l.id;
  perform private.write_audit('project_created_from_enquiry','project',v_project_id,jsonb_build_object('lead_id',l.id,'client_pending',p_client_id is null));
  if p_client_id is not null then
    insert into public.notifications(user_id,type,title,body,link)
    values(p_client_id,'project_created','A project was created for you',trim(p_title),'/client-dashboard.html');
  end if;
  return v_project_id;
end;
$function$;
revoke all on function public.create_project_from_lead(uuid,text,text,text,uuid,text,date) from public, anon;
grant execute on function public.create_project_from_lead(uuid,text,text,text,uuid,text,date) to authenticated;

create or replace function public.attach_pending_projects()
returns integer
language plpgsql
security definer
set search_path=''
as $function$
declare v_email text; v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
  if v_email is null then return 0; end if;
  update public.projects set client_id=auth.uid(),pending_client_email=null
  where client_id is null and lower(pending_client_email)=v_email;
  get diagnostics v_count = row_count;
  if v_count > 0 then
    insert into public.notifications(user_id,type,title,body,link)
    values(auth.uid(),'project_assigned','Your project is ready','A project has been linked to your verified account.','/client-dashboard.html');
    perform private.write_audit('pending_projects_attached','profile',auth.uid(),jsonb_build_object('count',v_count));
  end if;
  return v_count;
end;
$function$;
revoke all on function public.attach_pending_projects() from public, anon;
grant execute on function public.attach_pending_projects() to authenticated;

-- RLS and grants: every new public table is protected before it is exposed through the Data API.
drop policy if exists "Admins manage projects all" on public.projects;
-- Existing project policies remain in place; nullable client_id is used only for pending assignments.

drop policy if exists "Admins read all leads" on public.leads;
-- Existing lead read/update policies remain, while column grants and the immutable trigger constrain writes.

-- Restrict updates to the approval fields only; no public content editing or deletes.
revoke update, delete on public.feedback from anon, authenticated;
grant update(approved, reviewed) on public.feedback to authenticated;
revoke update, delete on public.questions from anon, authenticated;
grant update(answer, published, answered_at) on public.questions to authenticated;
revoke update, delete on public.project_updates from anon, authenticated;
revoke update, delete on public.audit_log from anon, authenticated;
revoke update, delete on public.time_entries from anon;
revoke delete on public.client_messages from anon, authenticated;
revoke delete on public.client_threads from anon;

-- Keep the new message stream available to Supabase Realtime when the default publication exists.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    begin execute 'alter publication supabase_realtime add table public.client_messages';
    exception when duplicate_object then null; end;
    begin execute 'alter publication supabase_realtime add table public.notifications';
    exception when duplicate_object then null; end;
  end if;
end $$;
