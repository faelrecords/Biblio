alter table public.reviews
  add column if not exists counts_as_read boolean not null default true;

update public.reviews as review
set counts_as_read = false
from public.app_users as app_user, public.books as book
where review.user_id = app_user.id
  and review.book_id = book.id
  and app_user.name ilike 'Mikaela%'
  and book.title ilike 'Conhecendo JavaScript';
