-- Non-destructive integrity guards for portal records.
-- Preflight on 2026-10-10 found no existing invoice/project mismatches,
-- orphaned invoice project references, out-of-range progress, or negative amounts.

create or replace function private.validate_invoice_project_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.project_id is not null and not exists (
    select 1
    from public.projects as p
    where p.id = new.project_id
      and p.client_id = new.client_id
  ) then
    raise exception 'Invoice project must belong to the selected client'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_invoice_project_client() from public, anon, authenticated;

drop trigger if exists validate_invoice_project_client on public.invoices;
create trigger validate_invoice_project_client
before insert or update of project_id, client_id
on public.invoices
for each row
execute function private.validate_invoice_project_client();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_progress_range_check'
  ) then
    alter table public.projects
      add constraint projects_progress_range_check
      check (progress between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.milestones'::regclass
      and conname = 'milestones_progress_range_check'
  ) then
    alter table public.milestones
      add constraint milestones_progress_range_check
      check (progress between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.invoices'::regclass
      and conname = 'invoices_amount_nonnegative_check'
  ) then
    alter table public.invoices
      add constraint invoices_amount_nonnegative_check
      check (amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.proposals'::regclass
      and conname = 'proposals_budget_nonnegative_check'
  ) then
    alter table public.proposals
      add constraint proposals_budget_nonnegative_check
      check (budget is null or budget >= 0);
  end if;
end;
$$;
