-- Admin-only directory: exposes account emails to the admin UI without exposing auth.users to the browser.
create or replace function public.admin_client_directory()
returns table (
  id uuid,
  email text,
  full_name text,
  company_name text,
  role text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $function$
begin
  if not private.is_admin() then raise exception 'Administrator access required'; end if;
  return query
    select p.id, u.email::text, p.full_name::text, p.company_name::text, p.role::text, p.created_at
    from public.profiles p
    join auth.users u on u.id=p.id
    order by p.created_at desc
    limit 500;
end;
$function$;
revoke all on function public.admin_client_directory() from public, anon;
grant execute on function public.admin_client_directory() to authenticated;
