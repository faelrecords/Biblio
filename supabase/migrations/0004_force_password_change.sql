alter table public.app_users
  add column if not exists force_password_change boolean not null default false;
