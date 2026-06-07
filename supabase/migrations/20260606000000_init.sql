-- Create tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null check (task_type in ('flexible', 'scheduled', 'recurring')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  recurrence_type text check (recurrence_type in ('daily', 'weekly', 'monthly', 'yearly')),
  recurrence_interval integer,
  due_date timestamp with time zone,
  reminder_at timestamp with time zone,
  notes text,
  last_completed_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Create subtasks table
create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null,
  completed boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamp with time zone default now() not null
);

-- Create tags table
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamp with time zone default now() not null,
  constraint unique_user_tag unique (user_id, name)
);

-- Create task_tags table (join table)
create table public.task_tags (
  task_id uuid not null references public.tasks(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (task_id, tag_id)
);

-- Create task_memory_cues table
create table public.task_memory_cues (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now() not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.tags enable row level security;
alter table public.task_tags enable row level security;
alter table public.task_memory_cues enable row level security;

-- Policies for public.tasks
create policy "Users can perform CRUD on their own tasks"
  on public.tasks
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for public.subtasks
create policy "Users can perform CRUD on subtasks of their own tasks"
  on public.subtasks
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks
      where public.tasks.id = subtasks.task_id
      and public.tasks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks
      where public.tasks.id = subtasks.task_id
      and public.tasks.user_id = auth.uid()
    )
  );

-- Policies for public.tags
create policy "Users can perform CRUD on their own tags"
  on public.tags
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policies for public.task_tags
create policy "Users can perform CRUD on task_tags for their own tasks"
  on public.task_tags
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks
      where public.tasks.id = task_tags.task_id
      and public.tasks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks
      where public.tasks.id = task_tags.task_id
      and public.tasks.user_id = auth.uid()
    )
  );

-- Policies for public.task_memory_cues
create policy "Users can perform CRUD on memory cues of their own tasks"
  on public.task_memory_cues
  for all
  to authenticated
  using (
    exists (
      select 1 from public.tasks
      where public.tasks.id = task_memory_cues.task_id
      and public.tasks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tasks
      where public.tasks.id = task_memory_cues.task_id
      and public.tasks.user_id = auth.uid()
    )
  );

-- Trigger for public.tasks updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();
