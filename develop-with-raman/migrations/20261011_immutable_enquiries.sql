-- Role-aware homepage admin workflow: additive changes only.
-- Review and apply in Supabase SQL Editor after checking the live schema.
-- The original lead content remains immutable; only is_read and project_id are writable by admins.
alter table public.leads
  add column if not exists is_read boolean not null default false,
  add column if not exists project_id uuid null references public.projects(id) on delete set null;

create index if not exists leads_is_read_created_at_idx
  on public.leads (is_read, created_at desc);

-- Ensure the admin can only update the separate read/reference fields, not the original enquiry content.
revoke update on public.leads from anon, authenticated;
grant update (is_read, project_id) on public.leads to authenticated;

drop policy if exists "Owner can update enquiry status" on public.leads;
drop policy if exists "Owner can update enquiry read and project reference" on public.leads;
create policy "Owner can update enquiry read and project reference"
on public.leads for update to authenticated
using (lower((select auth.jwt()->>'email')) = 'ramanmanoharsingh@gmail.com')
with check (lower((select auth.jwt()->>'email')) = 'ramanmanoharsingh@gmail.com');

-- Existing lead read policies are retained. This migration does not grant anonymous read access.
