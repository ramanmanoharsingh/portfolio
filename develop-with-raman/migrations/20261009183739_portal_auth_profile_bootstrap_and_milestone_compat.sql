-- Applied to the connected Supabase project.
alter table public.milestones add column if not exists progress integer not null default 0;
alter table public.milestones add column if not exists approved_at timestamptz;
alter table public.milestones add column if not exists deliverable_url text;
alter table public.milestones drop constraint if exists milestones_status_check;
alter table public.milestones add constraint milestones_status_check check (status in ('pending','in_progress','completed','submitted_for_approval','approved'));
alter table public.milestones drop constraint if exists milestones_progress_check;
alter table public.milestones add constraint milestones_progress_check check (progress between 0 and 100);
drop policy if exists "Clients approve submitted milestones" on public.milestones;
create policy "Clients approve submitted milestones" on public.milestones for update to authenticated
using (status = 'submitted_for_approval' and exists (select 1 from public.projects p where p.id = milestones.project_id and p.client_id = (select auth.uid())))
with check (status = 'approved' and exists (select 1 from public.projects p where p.id = milestones.project_id and p.client_id = (select auth.uid())));
drop policy if exists "Insert own client profile" on public.profiles;
create policy "Insert own client profile" on public.profiles for insert to authenticated
with check (id = (select auth.uid()) and role = 'client');
create schema if not exists private;
create or replace function private.handle_new_user_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
 insert into public.profiles(id,full_name,avatar_url,role,created_at,updated_at)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',''),nullif(new.raw_user_meta_data->>'avatar_url',''),'client',now(),now())
 on conflict(id) do nothing;
 return new;
end;
$$;
revoke all on function private.handle_new_user_profile() from public,anon,authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function private.handle_new_user_profile();
