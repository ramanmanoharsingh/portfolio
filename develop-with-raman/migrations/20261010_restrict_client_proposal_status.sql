-- Clients may submit proposals, but cannot pre-approve or alter workflow status on insert.
-- Admin workflow updates remain covered by the separate "Admins manage proposals" policy.
drop policy if exists "Clients submit own proposals" on public.proposals;
create policy "Clients submit own proposals"
on public.proposals
for insert
to authenticated
with check (
  client_id = (select auth.uid())
  and status = 'submitted'
);
