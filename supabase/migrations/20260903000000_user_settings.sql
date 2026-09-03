-- Create user_settings table for user notification preferences and rate limits
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  max_flexible_nudges_per_day integer not null default 2,
  enable_idle_nudges boolean not null default true,
  enable_subtask_nudges boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '07:00',
  flexible_nudges_count_today integer not null default 0,
  last_nudge_date date default CURRENT_DATE,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Policies for public.user_settings
create policy "Users can perform CRUD on their own settings"
  on public.user_settings
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Trigger for updated_at
create trigger trigger_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.handle_updated_at();
