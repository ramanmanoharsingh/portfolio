-- Role is database-controlled. Clients may edit profile fields but cannot update or insert their own role.
-- The default role is 'client'; promotion/demotion remains available only through the admin-checked set_profile_role() function.
revoke update on table public.profiles from authenticated;
revoke update (id, full_name, avatar_url, role, created_at, updated_at, phone, company_name, notify_email, notify_project_updates) on table public.profiles from authenticated;
grant update (full_name, avatar_url, phone, company_name, notify_email, notify_project_updates) on table public.profiles to authenticated;

revoke insert on table public.profiles from authenticated;
revoke insert (id, full_name, avatar_url, role, created_at, updated_at, phone, company_name, notify_email, notify_project_updates) on table public.profiles from authenticated;
grant insert (id, full_name) on table public.profiles to authenticated;
