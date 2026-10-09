-- Applied to Supabase project nmqntqxvficakxkticxc.
-- Trigger functions do not need to be directly executable by browser roles.
revoke all on function public.prevent_profile_role_escalation() from public, anon, authenticated;

-- Keep a single profile-role guard trigger; both old and new trigger names used the same function.
drop trigger if exists protect_profile_role on public.profiles;

-- Remove a duplicate SELECT policy; the remaining policy has the same ownership predicate.
drop policy if exists "Read project milestones" on public.milestones;

-- Cover client dashboard filters and sort order.
create index if not exists proposals_client_created_idx on public.proposals (client_id, created_at desc);
create index if not exists invoices_client_issued_idx on public.invoices (client_id, issued_at desc);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists milestones_project_sort_idx on public.milestones (project_id, sort_order);
