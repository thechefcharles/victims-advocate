-- One-time reset: mark all pending advocate connection requests as declined, then remove all in-app notifications.

update public.advocate_connection_requests
set
  status = 'declined',
  updated_at = now()
where status = 'pending';

delete from public.notifications;
