insert into public.audit_logs (admin_id, admin_name, action, method, path, details, created_at)
select
  admin_user.id,
  admin_user.name,
  'Aprovou o empréstimo ' || loan.id || ' de ' || reader.name || ' para ' || book.title,
  'POST',
  '/loans/' || loan.id || '/approve',
  jsonb_build_object(
    'retroactive_source', 'loan_approval',
    'loan_id', loan.id,
    'reader', reader.name,
    'book', book.title
  ),
  loan.approved_at
from public.loans as loan
join public.app_users as admin_user on admin_user.id = loan.approved_by
join public.app_users as reader on reader.id = loan.user_id
join public.books as book on book.id = loan.book_id
where loan.approved_at is not null
  and admin_user.is_admin = true
  and (admin_user.name ilike 'Camila%' or admin_user.name ilike 'Yasmin%')
  and not exists (
    select 1 from public.audit_logs as existing
    where existing.details ->> 'retroactive_source' = 'loan_approval'
      and existing.details ->> 'loan_id' = loan.id::text
  );

insert into public.audit_logs (admin_id, admin_name, action, method, path, details, created_at)
select
  admin_user.id,
  admin_user.name,
  'Registrou a devolução do empréstimo ' || loan.id || ' de ' || reader.name || ' para ' || book.title,
  'POST',
  '/loans/' || loan.id || '/return',
  jsonb_build_object(
    'retroactive_source', 'loan_return',
    'loan_id', loan.id,
    'reader', reader.name,
    'book', book.title
  ),
  loan.returned_at
from public.loans as loan
join public.app_users as admin_user on admin_user.id = loan.returned_by
join public.app_users as reader on reader.id = loan.user_id
join public.books as book on book.id = loan.book_id
where loan.returned_at is not null
  and admin_user.is_admin = true
  and (admin_user.name ilike 'Camila%' or admin_user.name ilike 'Yasmin%')
  and not exists (
    select 1 from public.audit_logs as existing
    where existing.details ->> 'retroactive_source' = 'loan_return'
      and existing.details ->> 'loan_id' = loan.id::text
  );

insert into public.audit_logs (admin_id, admin_name, action, method, path, details, created_at)
select
  admin_user.id,
  admin_user.name,
  'Enviou um aviso exclusivo para ' || coalesce(recipient.name, 'usuário'),
  'POST',
  '/notifications/send-user',
  jsonb_build_object(
    'retroactive_source', 'admin_notification',
    'notification_id', notification.id,
    'recipient', coalesce(recipient.name, 'usuário')
  ),
  notification.created_at
from public.notifications as notification
join public.app_users as admin_user
  on admin_user.is_admin = true
  and (admin_user.name ilike 'Camila%' or admin_user.name ilike 'Yasmin%')
  and notification.message ilike ('Enviado por: ' || admin_user.name || E'\n%')
left join public.app_users as recipient on recipient.id = notification.recipient_user_id
where notification.type = 'admin_message'
  and not exists (
    select 1 from public.audit_logs as existing
    where existing.details ->> 'retroactive_source' = 'admin_notification'
      and existing.details ->> 'notification_id' = notification.id::text
  );

