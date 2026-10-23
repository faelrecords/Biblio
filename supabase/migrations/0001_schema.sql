create extension if not exists pgcrypto with schema extensions;
create table if not exists public.app_users (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null default '',
  access_code text not null unique,
  is_admin boolean not null default false,
  is_super boolean not null default false,
  password_hash text,
  avatar_url text not null default '',
  books_read integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.books (
  id bigint generated always as identity primary key,
  title text not null,
  author text not null default '',
  category text not null default 'Geral',
  cover_url text not null default '',
  synopsis text not null default '',
  default_days integer not null default 14 check (default_days > 0),
  auto_approve_override boolean,
  waitlist_hold_hours integer check (waitlist_hold_hours is null or waitlist_hold_hours >= 0),
  created_at timestamptz not null default now()
);
create table if not exists public.loans (
  id bigint generated always as identity primary key,
  book_id bigint not null references public.books(id) on delete cascade,
  user_id bigint not null references public.app_users(id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'rejected', 'returned')),
  days integer not null default 14 check (days > 0),
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by bigint references public.app_users(id) on delete set null,
  auto_approved boolean not null default false,
  due_at timestamptz,
  returned_at timestamptz,
  returned_by bigint references public.app_users(id) on delete set null,
  renewed_count integer not null default 0,
  reminder_sent boolean not null default false,
  self_returned boolean not null default false
);
create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  book_id bigint not null references public.books(id) on delete cascade,
  user_id bigint not null references public.app_users(id) on delete cascade,
  hold_until timestamptz,
  expired boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists waitlist_active_unique
  on public.waitlist(book_id, user_id)
  where expired = false;
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  type text not null,
  title text not null,
  message text not null,
  loan_id bigint references public.loans(id) on delete cascade,
  book_id bigint references public.books(id) on delete cascade,
  user_id bigint references public.app_users(id) on delete cascade,
  waitlist_id bigint references public.waitlist(id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  auto_approve boolean not null default true,
  default_days integer not null default 14 check (default_days > 0),
  default_waitlist_hold_hours integer not null default 24 check (default_waitlist_hold_hours >= 0),
  show_top_readers boolean not null default false
);
insert into public.settings (id)
values (1)
on conflict (id) do nothing;
create index if not exists loans_book_status_idx on public.loans(book_id, status);
create unique index if not exists loans_active_book_unique
  on public.loans(book_id)
  where status in ('pending', 'approved');
create index if not exists loans_requested_idx on public.loans(requested_at desc);
create index if not exists loans_returned_idx on public.loans(returned_at) where status = 'returned';
create index if not exists waitlist_book_created_idx on public.waitlist(book_id, created_at) where expired = false;
create index if not exists notifications_created_idx on public.notifications(created_at desc);
alter table public.app_users enable row level security;
alter table public.books enable row level security;
alter table public.loans enable row level security;
alter table public.waitlist enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
create or replace function public.hash_password(password_plain text)
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select crypt(password_plain, gen_salt('bf'));
$$;
create or replace function public.verify_password(password_plain text, password_hash text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select password_hash is not null and crypt(password_plain, password_hash) = password_hash;
$$;
revoke all on function public.hash_password(text) from public, anon, authenticated;
revoke all on function public.verify_password(text, text) from public, anon, authenticated;
grant execute on function public.hash_password(text) to service_role;
grant execute on function public.verify_password(text, text) to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-covers', 'book-covers', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
