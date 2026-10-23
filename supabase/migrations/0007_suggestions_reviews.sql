create table if not exists public.suggestions (
  id bigint generated always as identity primary key,
  user_id bigint references public.app_users(id) on delete set null,
  title text not null default 'Sugestão',
  message text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  loan_id bigint references public.loans(id) on delete set null,
  book_id bigint not null references public.books(id) on delete cascade,
  user_id bigint references public.app_users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (loan_id)
);
create index if not exists suggestions_created_idx on public.suggestions(created_at desc);
create index if not exists reviews_book_idx on public.reviews(book_id, created_at desc);
alter table public.suggestions enable row level security;
alter table public.reviews enable row level security;
