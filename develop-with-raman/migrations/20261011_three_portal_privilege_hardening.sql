-- Tighten grants on new portal tables; RLS remains the row-level authorization layer.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;

revoke all on public.client_messages from anon, authenticated;
grant select, insert on public.client_messages to authenticated;
grant update(read_at) on public.client_messages to authenticated;

revoke all on public.client_threads from anon, authenticated;
grant select, insert, update, delete on public.client_threads to authenticated;

revoke all on public.project_updates from anon, authenticated;
grant select, insert on public.project_updates to authenticated;

revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;
grant update(approved, reviewed) on public.feedback to authenticated;

revoke all on public.questions from anon, authenticated;
grant select, insert on public.questions to anon, authenticated;
grant update(answer, published, answered_at) on public.questions to authenticated;

revoke all on public.time_entries from anon, authenticated;
grant select, insert, update, delete on public.time_entries to authenticated;

revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

revoke all on public.leads from anon;
grant insert on public.leads to anon;
grant select, insert on public.leads to authenticated;
grant update(status, project_id, read_at, updated_at) on public.leads to authenticated;
