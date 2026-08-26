-- Create task_occurrences table to log completion, skip, and missed actions for recurring tasks & reporting
create table if not exists public.task_occurrences (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_date timestamp with time zone not null,
  action_date timestamp with time zone default now() not null,
  status text not null check (status in ('completed', 'skipped', 'missed')),
  notes text,
  created_at timestamp with time zone default now() not null
);

-- Add last_skipped_at column to public.tasks table
alter table public.tasks add column if not exists last_skipped_at timestamp with time zone;

-- Enable Row Level Security (RLS)
alter table public.task_occurrences enable row level security;

-- Policies for public.task_occurrences
create policy "Users can perform CRUD on their own task_occurrences"
  on public.task_occurrences
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create indexes for performance
create index if not exists idx_task_occurrences_user_created on public.task_occurrences(user_id, created_at);
create index if not exists idx_task_occurrences_task_scheduled on public.task_occurrences(task_id, scheduled_date);
