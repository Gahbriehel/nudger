-- Welcome tour: set when the user finishes or skips it, so it only
-- auto-starts once per account (across devices). Null = not yet.
alter table public.user_settings
  add column if not exists tour_completed_at timestamp with time zone;
