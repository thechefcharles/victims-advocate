-- One-time cleanup: remove legacy in-app "Connection accepted" notifications.
-- We no longer create type advocate_connection_accepted when an advocate accepts.

delete from public.notifications
where type = 'advocate_connection_accepted';
