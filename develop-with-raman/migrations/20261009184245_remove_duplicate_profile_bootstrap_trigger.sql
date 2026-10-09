-- public.handle_new_user() already creates client profiles. Keep a single auth.users trigger.
drop trigger if exists on_auth_user_created_profile on auth.users;
drop function if exists private.handle_new_user_profile();
