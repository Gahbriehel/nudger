-- Add reminder_sent column to tasks table to prevent duplicate triggers
alter table public.tasks 
  add column if not exists reminder_sent boolean not null default false;

-- Create push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint unique_user_subscription unique (user_id, subscription)
);

-- Enable RLS on push_subscriptions
alter table public.push_subscriptions enable row level security;

-- Policies for public.push_subscriptions
create policy "Users can perform CRUD on their own subscriptions"
  on public.push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
