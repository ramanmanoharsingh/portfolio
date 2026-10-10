-- Support the foreign key join/filter on tasks.assigned_to.
create index if not exists tasks_assigned_to_idx
on public.tasks (assigned_to);
