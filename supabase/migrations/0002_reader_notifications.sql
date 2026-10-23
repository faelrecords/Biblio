alter table public.notifications
  add column if not exists recipient_role text not null default 'admin'
    check (recipient_role in ('admin', 'user')),
  add column if not exists recipient_user_id bigint references public.app_users(id) on delete cascade;
alter table public.loans
  add column if not exists overdue_notified boolean not null default false;
create index if not exists notifications_recipient_idx
  on public.notifications(recipient_role, recipient_user_id, created_at desc);
