create or replace function private.guard_client_milestone_approval() returns trigger language plpgsql set search_path = '' as $$
begin
 if not (select private.is_admin()) then
  if old.status <> 'submitted_for_approval' or new.status <> 'approved' or (to_jsonb(new)-'status'-'approved_at') is distinct from (to_jsonb(old)-'status'-'approved_at') then raise exception 'Clients may only approve milestones submitted for approval.'; end if;
  new.approved_at:=now();
 end if;
 return new;
end; $$;
drop trigger if exists guard_client_milestone_approval on public.milestones;
create trigger guard_client_milestone_approval before update on public.milestones for each row execute function private.guard_client_milestone_approval();