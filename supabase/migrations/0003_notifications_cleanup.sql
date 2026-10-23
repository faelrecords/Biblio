alter table public.settings
  add column if not exists notifications_last_cleanup_at timestamptz not null default now(),
  add column if not exists notifications_cleanup_reminder_sent boolean not null default false;
update public.settings
set notifications_last_cleanup_at = coalesce(notifications_last_cleanup_at, now()),
    notifications_cleanup_reminder_sent = coalesce(notifications_cleanup_reminder_sent, false)
where id = 1;
