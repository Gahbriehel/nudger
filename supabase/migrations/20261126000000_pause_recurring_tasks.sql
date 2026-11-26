-- Pause support for recurring tasks.
-- paused_at: set while paused. paused_until: optional auto-resume time
-- (null = paused until the user resumes it).
alter table public.tasks add column if not exists paused_at timestamp with time zone;
alter table public.tasks add column if not exists paused_until timestamp with time zone;

-- Lets the cron job find paused tasks due to auto-resume cheaply
create index if not exists idx_tasks_paused_until on public.tasks(paused_until) where paused_at is not null;
