-- Client data-deletion requests and guarded administrator role management.
create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (char_length(email) between 5 and 254),
  reason text not null default '' check (char_length(reason) <= 2000),
  status text not null default 'pending' check (status in ('pending','in_review','completed','declined')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists account_deletion_queue_idx on public.account_deletion_requests(status,created_at desc);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from anon,authenticated;
grant select,insert on public.account_deletion_requests to authenticated;
grant update(status,resolved_at) on public.account_deletion_requests to authenticated;

create or replace function private.prepare_account_deletion_request()
returns trigger language plpgsql security definer set search_path=''
as $function$
begin
  if auth.uid() is null then raise exception 'Sign-in required'; end if;
  new.user_id:=auth.uid();
  new.email:=coalesce(nullif(trim(new.email),''),auth.jwt()->>'email');
  new.status:='pending';
  new.resolved_at:=null;
  return new;
end;
$function$;
drop trigger if exists account_deletion_request_prepare on public.account_deletion_requests;
create trigger account_deletion_request_prepare before insert on public.account_deletion_requests
for each row execute function private.prepare_account_deletion_request();

drop policy if exists "Clients request own account deletion" on public.account_deletion_requests;
create policy "Clients request own account deletion" on public.account_deletion_requests for insert to authenticated
with check (user_id=auth.uid() and status='pending');
drop policy if exists "Clients read own deletion requests" on public.account_deletion_requests;
create policy "Clients read own deletion requests" on public.account_deletion_requests for select to authenticated
using (user_id=auth.uid() or private.is_admin());
drop policy if exists "Admins review deletion requests" on public.account_deletion_requests;
create policy "Admins review deletion requests" on public.account_deletion_requests for update to authenticated
using (private.is_admin()) with check (private.is_admin());

create or replace function private.on_account_deletion_request()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare a record;
begin
  for a in select id from public.profiles where role='admin' loop
    insert into public.notifications(user_id,type,title,body,link)
    values(a.id,'account_deletion_request','Account deletion requested','A client submitted an account/data deletion request.','/admin-portal.html#settings');
  end loop;
  perform private.write_audit('account_deletion_requested','account_deletion_request',new.id,'{}'::jsonb);
  return new;
end;
$function$;
drop trigger if exists account_deletion_notify_admins on public.account_deletion_requests;
create trigger account_deletion_notify_admins after insert on public.account_deletion_requests
for each row execute function private.on_account_deletion_request();

create or replace function public.set_profile_role(p_user_id uuid,p_role text)
returns void language plpgsql security definer set search_path=''
as $function$
declare current_role text; admin_count integer;
begin
  if not private.is_admin() then raise exception 'Administrator access required'; end if;
  if p_role not in ('client','admin') then raise exception 'Role must be client or admin'; end if;
  if p_user_id=auth.uid() then raise exception 'For safety, you cannot change your own role here'; end if;
  select role into current_role from public.profiles where id=p_user_id for update;
  if current_role is null then raise exception 'Account profile not found'; end if;
  if current_role='admin' and p_role='client' then
    select count(*) into admin_count from public.profiles where role='admin';
    if admin_count<=1 then raise exception 'At least one administrator must remain'; end if;
  end if;
  update public.profiles set role=p_role,updated_at=now() where id=p_user_id;
  perform private.write_audit('profile_role_changed','profile',p_user_id,jsonb_build_object('old_role',current_role,'new_role',p_role));
end;
$function$;
revoke all on function public.set_profile_role(uuid,text) from public,anon;
grant execute on function public.set_profile_role(uuid,text) to authenticated;
