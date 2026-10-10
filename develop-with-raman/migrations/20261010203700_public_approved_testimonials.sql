-- Only admin-approved feedback may be read publicly, and only display-safe columns are exposed.
grant select (id, rating, text, service, display_name, created_at) on public.feedback to anon;
drop policy if exists "Public reads approved testimonials" on public.feedback;
create policy "Public reads approved testimonials"
  on public.feedback for select to anon
  using (approved = true);
