-- Run this in Supabase SQL Editor for the account/auth foundation.
-- This creates a minimal profile table with restrictive row-level security.
-- Do not add service_role keys to the website.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- Optional future table for authenticated clients to track their own enquiries.
create table if not exists public.project_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  whatsapp text,
  project_type text not null,
  budget_range text not null,
  deadline date,
  description text not null,
  status text not null default 'New' check (status in ('New','Contacted','In Progress','Completed')),
  created_at timestamptz not null default now()
);

alter table public.project_requests enable row level security;

create policy "Clients can read only their own requests"
  on public.project_requests for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Clients can create their own requests"
  on public.project_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admin access must be added deliberately using a server-side role/claim.
-- Do not let users set their own admin flag from the browser.
