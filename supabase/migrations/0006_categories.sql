create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into public.categories (name)
select distinct category
from public.books
where nullif(trim(category), '') is not null
on conflict (name) do nothing;
alter table public.categories enable row level security;
