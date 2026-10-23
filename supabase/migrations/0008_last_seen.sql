alter table public.app_users
  add column if not exists last_seen_at timestamptz;
