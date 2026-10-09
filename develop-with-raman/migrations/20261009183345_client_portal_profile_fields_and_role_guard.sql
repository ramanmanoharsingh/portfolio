alter table public.profiles add column if not exists phone text, add column if not exists company_name text, add column if not exists notify_email boolean not null default true, add column if not exists notify_project_updates boolean not null default true;
create or replace function public.prevent_profile_role_escalation() returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.role is distinct from old.role and not coalesce((select private.is_admin()),false) then raise exception 'Only an administrator can change account roles'; end if;
 new.updated_at:=now(); return new;
end; $$;
drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation before update on public.profiles for each row execute function public.prevent_profile_role_escalation();