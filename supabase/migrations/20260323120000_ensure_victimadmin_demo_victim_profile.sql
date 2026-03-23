-- Demo account victimadmin@gmail.com: keep victim profile and not platform admin.
-- Idempotent for this email.

update public.profiles p
set
  is_admin = false,
  role = 'victim'
from auth.users u
where p.id = u.id
  and lower(u.email) = 'victimadmin@gmail.com';
