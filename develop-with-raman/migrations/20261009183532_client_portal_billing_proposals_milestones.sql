create table if not exists public.proposals (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 180), description text not null check(char_length(description) between 20 and 12000),
 budget numeric(12,2), timeline text, status text not null default 'submitted' check(status in ('draft','submitted','reviewing','quoted','accepted','declined','converted')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.invoices (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references auth.users(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null, invoice_number text not null unique, description text not null,
 amount numeric(12,2) not null check(amount>=0), currency text not null default 'INR',
 status text not null default 'pending' check(status in ('draft','pending','paid','overdue','cancelled')),
 issued_at timestamptz not null default now(), due_at timestamptz, paid_at timestamptz, payment_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.milestones (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
 title text not null, description text, status text not null default 'pending' check(status in ('pending','in_progress','completed')),
 due_date date, sort_order integer not null default 0, created_at timestamptz not null default now()
);
alter table public.proposals enable row level security; alter table public.invoices enable row level security; alter table public.milestones enable row level security;
create policy "Clients read own proposals" on public.proposals for select to authenticated using(client_id=(select auth.uid()) or (select private.is_admin()));
create policy "Clients submit own proposals" on public.proposals for insert to authenticated with check(client_id=(select auth.uid()));
create policy "Admins manage proposals" on public.proposals for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy "Clients read own invoices" on public.invoices for select to authenticated using(client_id=(select auth.uid()) or (select private.is_admin()));
create policy "Admins manage invoices" on public.invoices for all to authenticated using((select private.is_admin())) with check((select private.is_admin()));
create policy "Clients read project milestones" on public.milestones for select to authenticated using(exists(select 1 from public.projects p where p.id=milestones.project_id and (p.client_id=(select auth.uid()) or (select private.is_admin()))));
create policy "Clients approve submitted milestones" on public.milestones for update to authenticated using(status='submitted_for_approval' and exists(select 1 from public.projects p where p.id=milestones.project_id and p.client_id=(select auth.uid()))) with check(status='approved' and exists(select 1 from public.projects p where p.id=milestones.project_id and p.client_id=(select auth.uid())));
grant select,insert,update on public.proposals to authenticated; grant select on public.invoices to authenticated; grant select,update on public.milestones to authenticated;