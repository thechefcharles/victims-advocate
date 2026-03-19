-- Remove platform admin from demo accounts; keep victim/advocate roles only.
-- victimadmin@gmail.com → victim, not admin
-- advocateadmin@gmail.com → advocate, not admin

update public.profiles p
set
  is_admin = false,
  role = case
    when lower(u.email) = 'advocateadmin@gmail.com' then 'advocate'
    when lower(u.email) = 'victimadmin@gmail.com' then 'victim'
    else p.role
  end
from auth.users u
where p.id = u.id
  and lower(u.email) in ('victimadmin@gmail.com', 'advocateadmin@gmail.com');
