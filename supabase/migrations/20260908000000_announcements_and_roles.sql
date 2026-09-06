-- Migration: 20260908000000_announcements_and_roles.sql
-- Description: Create user_roles, announcements, and user_announcements tables with RLS and helper functions

-- 0. Ensure handle_updated_at trigger function exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. Create user_roles table
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'user')) default 'user',
  created_at timestamp with time zone default now() not null
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Helper function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
    and role = 'admin'
  );
end;
$$ language plpgsql security definer;

-- Drop existing policies on user_roles if any
drop policy if exists "Users can view their own role or admins can view all" on public.user_roles;
drop policy if exists "Only admins can insert roles" on public.user_roles;
drop policy if exists "Only admins can update roles" on public.user_roles;
drop policy if exists "Only admins can delete roles" on public.user_roles;

-- Policies for user_roles
create policy "Users can view their own role or admins can view all"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id or public.is_admin());

create policy "Only admins can insert roles"
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Only admins can update roles"
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Only admins can delete roles"
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin());

-- 2. Create announcements table
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_active boolean not null default false,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Enable RLS on announcements
alter table public.announcements enable row level security;

-- Trigger for updated_at on announcements
drop trigger if exists trigger_announcements_updated_at on public.announcements;
create trigger trigger_announcements_updated_at
  before update on public.announcements
  for each row
  execute function public.handle_updated_at();

-- Drop existing policies on announcements if any
drop policy if exists "Anyone can read active announcements and admins can read all" on public.announcements;
drop policy if exists "Admins can insert announcements" on public.announcements;
drop policy if exists "Admins can update announcements" on public.announcements;
drop policy if exists "Admins can delete announcements" on public.announcements;

-- Policies for announcements
create policy "Anyone can read active announcements and admins can read all"
  on public.announcements
  for select
  to authenticated, anon
  using (is_active = true or public.is_admin());

create policy "Admins can insert announcements"
  on public.announcements
  for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update announcements"
  on public.announcements
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete announcements"
  on public.announcements
  for delete
  to authenticated
  using (public.is_admin());

-- 3. Create user_announcements table to track user dismissals
create table if not exists public.user_announcements (
  user_id uuid not null references auth.users(id) on delete cascade,
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  dismissed_at timestamp with time zone default now() not null,
  primary key (user_id, announcement_id)
);

-- Enable RLS on user_announcements
alter table public.user_announcements enable row level security;

-- Drop existing policies on user_announcements if any
drop policy if exists "Users can view their own dismissals" on public.user_announcements;
drop policy if exists "Users can record their own dismissals" on public.user_announcements;

-- Policies for user_announcements
create policy "Users can view their own dismissals"
  on public.user_announcements
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can record their own dismissals"
  on public.user_announcements
  for insert
  to authenticated
  with check (auth.uid() = user_id);
