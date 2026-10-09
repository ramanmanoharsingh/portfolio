insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('client-deliverables','client-deliverables',false,52428800,array['application/pdf','image/png','image/jpeg','image/webp','application/zip','text/plain'])
on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Admins upload client deliverables" on storage.objects;
create policy "Admins upload client deliverables" on storage.objects for insert to authenticated with check(bucket_id='client-deliverables' and (select private.is_admin()));
drop policy if exists "Admins update client deliverables" on storage.objects;
create policy "Admins update client deliverables" on storage.objects for update to authenticated using(bucket_id='client-deliverables' and (select private.is_admin())) with check(bucket_id='client-deliverables' and (select private.is_admin()));
drop policy if exists "Admins delete client deliverables" on storage.objects;
create policy "Admins delete client deliverables" on storage.objects for delete to authenticated using(bucket_id='client-deliverables' and (select private.is_admin()));
drop policy if exists "Clients read own project deliverables storage" on storage.objects;
create policy "Clients read own project deliverables storage" on storage.objects for select to authenticated using(bucket_id='client-deliverables' and ((select private.is_admin()) or exists(select 1 from public.projects p where p.id::text=(storage.foldername(name))[1] and p.client_id=(select auth.uid()))));
