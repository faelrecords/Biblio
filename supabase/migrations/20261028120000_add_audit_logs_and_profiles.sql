alter table public.app_users
  add column if not exists phone text not null default '',
  add column if not exists department text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists audit_log_enabled boolean not null default true;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  admin_id bigint references public.app_users(id) on delete set null,
  admin_name text not null,
  action text not null,
  method text not null,
  path text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx
  on public.audit_logs(created_at desc);

create index if not exists audit_logs_admin_idx
  on public.audit_logs(admin_id, created_at desc);

alter table public.audit_logs enable row level security;

