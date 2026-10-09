-- Develop with Raman — Supabase starter schema (free tier)
-- Run in Supabase Dashboard → SQL Editor → New query.
-- Auth providers are configured separately in Authentication → Sign In / Providers.
create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  client_email text,
  name text not null check (char_length(name) between 2 and 120),
  email text not null,
  whatsapp text,
  project_type text,
  budget_range text,
  deadline date,
  preferred_payment text,
  description text not null check (char_length(description) between 15 and 10000),
  status text not null default 'New'
    check (status in ('New','Contacted','Scoped','In Progress','Waiting on Client','Completed','Declined'))
);

alter table public.leads enable row level security;

-- Remove old policies with these names before recreating them.
drop policy if exists "Anyone can submit a project enquiry" on public.leads;
drop policy if exists "Clients can read their own enquiries" on public.leads;
drop policy if exists "Owner can read all enquiries" on public.leads;
drop policy if exists "Owner can update enquiry status" on public.leads;

-- Public enquiry form: insert only. No anonymous select/update/delete.
create policy "Anyone can submit a project enquiry"
on public.leads for insert to anon, authenticated
with check (
  char_length(trim(name)) >= 2
  and char_length(trim(email)) >= 5
  and char_length(trim(description)) >= 15
  and status = 'New'
  and (
    (auth.uid() is null and user_id is null)
    or (auth.uid() is not null and user_id = (select auth.uid()))
  )
);

-- Clients can read only records tied to their authenticated account.
create policy "Clients can read their own enquiries"
on public.leads for select to authenticated
using (user_id = (select auth.uid()));

-- Owner has private admin access based on verified auth email.
create policy "Owner can read all enquiries"
on public.leads for select to authenticated
using (lower((select auth.jwt()->>'email')) = 'ramanmanoharsingh@gmail.com');

create policy "Owner can update enquiry status"
on public.leads for update to authenticated
using (lower((select auth.jwt()->>'email')) = 'ramanmanoharsingh@gmail.com')
with check (lower((select auth.jwt()->>'email')) = 'ramanmanoharsingh@gmail.com');

create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_user_id_idx on public.leads (user_id);
-- Composite indexes support the signed-in client history and owner status/date views.
create index if not exists leads_user_created_at_idx on public.leads (user_id, created_at desc);
create index if not exists leads_status_created_at_idx on public.leads (status, created_at desc);


-- Keep updated_at current when the owner changes a lead's status or details.
create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $
begin
  new.updated_at = now();
  return new;
end;
$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_leads_updated_at();

-- Enable live dashboard updates where Supabase Realtime is available.
-- Safe to rerun: it only adds the table if it is not already published.
do $
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'leads'
     ) then
    execute 'alter publication supabase_realtime add table public.leads';
  end if;
end;
$;

-- Important:
-- 1. Never put a service_role key in browser code.
-- 2. For clients to track enquiries, they must be signed in when submitting,
--    so the front-end can attach auth.uid() to user_id.
-- 3. Anonymous enquiries are visible only to the owner; clients must sign in
--    before submitting if they need their own dashboard history.
