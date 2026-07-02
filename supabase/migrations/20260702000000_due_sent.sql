-- Add due_sent column to tasks table to prevent duplicate triggers
alter table public.tasks 
  add column if not exists due_sent boolean not null default false;
