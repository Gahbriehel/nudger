-- Add completed_at column to public.subtasks
alter table public.subtasks
  add column if not exists completed_at timestamp with time zone;

-- Backfill completed_at for existing completed subtasks using their created_at date
update public.subtasks
  set completed_at = created_at
  where completed = true and completed_at is null;

-- Add index on completed_at for efficient reporting queries
create index if not exists idx_subtasks_completed_at
  on public.subtasks(completed_at);
