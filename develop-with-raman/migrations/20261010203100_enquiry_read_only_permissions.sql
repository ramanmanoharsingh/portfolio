-- Keep enquiry submissions immutable. Read state is separate from the original submitted status/content.
-- Project references are set only by the admin-checked create_project_from_lead function.
revoke update on table public.leads from authenticated;
revoke update(status, project_id, updated_at) on table public.leads from authenticated;
grant update(read_at) on table public.leads to authenticated;

-- Retire the legacy overload that changes enquiry status during project conversion.
-- The current seven-argument function copies the enquiry into a project and only sets project_id.
revoke execute on function public.create_project_from_lead(uuid, uuid, text, text, text, text, date, date) from public, anon, authenticated;
grant execute on function public.create_project_from_lead(uuid, text, text, text, uuid, text, date) to authenticated;
