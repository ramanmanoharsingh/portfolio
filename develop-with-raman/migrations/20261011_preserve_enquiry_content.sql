-- Creating a project from an enquiry must not alter the submitted enquiry content or status.
create or replace function public.create_project_from_lead(
  p_lead_id uuid,
  p_title text,
  p_description text,
  p_service_type text,
  p_client_id uuid default null,
  p_pending_client_email text default null,
  p_due_date date default null
) returns uuid
language plpgsql
security definer
set search_path=''
as $function$
declare l public.leads%rowtype; v_project_id uuid; v_email text;
begin
  if not private.is_admin() then raise exception 'Administrator access required'; end if;
  select * into l from public.leads where id=p_lead_id for update;
  if not found then raise exception 'Enquiry not found'; end if;
  if l.project_id is not null then raise exception 'This enquiry already has a project'; end if;
  if char_length(trim(coalesce(p_title,''))) < 3 or char_length(p_title) > 180 then raise exception 'Project title must be 3–180 characters'; end if;
  if char_length(trim(coalesce(p_description,''))) < 1 or char_length(p_description) > 10000 then raise exception 'Project description is required and must be at most 10000 characters'; end if;
  if p_client_id is not null then
    if not exists(select 1 from public.profiles where id=p_client_id and role='client') then raise exception 'Choose a registered client account'; end if;
    if p_pending_client_email is not null then raise exception 'Choose a client account or pending email, not both'; end if;
    v_email := null;
  else
    v_email := lower(trim(coalesce(p_pending_client_email,l.email)));
    if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'A valid pending client email is required'; end if;
  end if;
  insert into public.projects(client_id,pending_client_email,title,description,service_type,status,progress,due_date,created_by,source_lead_id)
  values(p_client_id,v_email,trim(p_title),trim(p_description),coalesce(nullif(trim(p_service_type),''),l.project_type,'Web Development'),'planning',0,p_due_date,auth.uid(),l.id)
  returning id into v_project_id;
  update public.leads set project_id=v_project_id where id=l.id;
  perform private.write_audit('project_created_from_enquiry','project',v_project_id,jsonb_build_object('lead_id',l.id,'client_pending',p_client_id is null));
  if p_client_id is not null then
    insert into public.notifications(user_id,type,title,body,link)
    values(p_client_id,'project_created','A project was created for you',trim(p_title),'/client-dashboard.html');
  end if;
  return v_project_id;
end;
$function$;
revoke all on function public.create_project_from_lead(uuid,text,text,text,uuid,text,date) from public, anon;
grant execute on function public.create_project_from_lead(uuid,text,text,text,uuid,text,date) to authenticated;
