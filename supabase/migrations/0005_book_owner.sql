alter table public.books
  add column if not exists owner_name text not null default 'Empresa';
