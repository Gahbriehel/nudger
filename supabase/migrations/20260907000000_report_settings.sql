-- Add report digest preferences to user_settings
alter table public.user_settings 
  add column if not exists enable_weekly_report boolean not null default true,
  add column if not exists enable_monthly_report boolean not null default true,
  add column if not exists last_weekly_report_date date default null,
  add column if not exists last_monthly_report_date date default null;

-- Add index on tasks for fast report filtering
create index if not exists idx_tasks_user_completed on public.tasks(user_id, completed_at);
create index if not exists idx_tasks_user_last_completed on public.tasks(user_id, last_completed_at);
