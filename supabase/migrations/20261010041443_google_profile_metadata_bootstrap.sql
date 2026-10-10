create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(metadata ->> 'full_name'), ''),
      nullif(btrim(metadata ->> 'name'), ''),
      nullif(btrim(metadata ->> 'preferred_username'), ''),
      ''
    ),
    coalesce(
      nullif(metadata ->> 'avatar_url', ''),
      nullif(metadata ->> 'picture', '')
    ),
    'client'
  )
  on conflict (id) do update
  set
    full_name = case
      when coalesce(nullif(btrim(public.profiles.full_name), ''), '') = ''
        then excluded.full_name
      else public.profiles.full_name
    end,
    avatar_url = coalesce(
      nullif(public.profiles.avatar_url, ''),
      excluded.avatar_url
    );

  return new;
end;
$function$;

-- Backfill only missing provider profile details; never alter role or non-empty user edits.
update public.profiles p
set
  full_name = coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'preferred_username'), ''),
    p.full_name
  ),
  avatar_url = coalesce(
    nullif(p.avatar_url, ''),
    nullif(u.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(u.raw_user_meta_data ->> 'picture', '')
  )
from auth.users u
where p.id = u.id
  and (coalesce(nullif(btrim(p.full_name), ''), '') = '' or nullif(p.avatar_url, '') is null);
