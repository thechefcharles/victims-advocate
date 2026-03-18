-- Platform admins by email. Users must already exist in auth.users (sign up first).
-- victimadmin@gmail.com → victim role + admin
-- advocateadmin@gmail.com → advocate role + admin

insert into public.profiles (id, role, is_admin)
select
  u.id,
  case
    when lower(u.email) = 'advocateadmin@gmail.com' then 'advocate'
    else 'victim'
  end,
  true
from auth.users u
where lower(u.email) in (
  'victimadmin@gmail.com',
  'advocateadmin@gmail.com'
)
on conflict (id) do update set
  is_admin = true;
