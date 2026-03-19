# Role-based dashboards

After login, users are sent to exactly one home dashboard:

| Condition | Route |
|-----------|--------|
| `profiles.is_admin = true` | `/admin/dashboard` — platform admin (all orgs, ecosystem, cases, users) |
| Org member with `org_role` **org_admin** or **supervisor** | `/organization/dashboard` — org-wide tools |
| `profiles.role = advocate` (and not platform admin; org staff use advocate home) | `/advocate/dashboard` — your clients / victims |
| `profiles.role = organization` and **no** org membership yet | `/organization/setup` — register the agency (then you become `org_admin`) |
| `profiles.role = organization` and **has** org (e.g. staff) | `/organization/dashboard` |
| `profiles.role = victim` | `/victim/dashboard` — your cases |

`/dashboard` redirects to the correct URL above.

## Platform admin

Assign in Supabase SQL (replace email):

```sql
update public.profiles
set is_admin = true
where id = (select id from auth.users where lower(email) = 'your-admin@example.com');
```

Remove admin:

```sql
update public.profiles set is_admin = false
where id = (select id from auth.users where lower(email) = '...');
```

## Demo accounts (victimadmin / advocateadmin)

Migration `20260321000000_demote_test_admin_emails.sql` clears platform admin from those emails while keeping victim/advocate roles.

## Organization self-signup

1. User picks **Organization** on `/signup` (or creates victim/advocate first, then registers an org).
2. New **organization** accounts are sent to `/organization/setup` until they complete `POST /api/org/register`.
3. Alternate path: signed-in user opens `/signup/organization`, enters org name and type (same API).
4. API `POST /api/org/register` creates the org and makes the user `org_admin` (only if they have no existing org membership).

Profile role `organization` is allowed by migration `20260322000000_profiles_role_organization.sql`. `POST /api/me/sync-profile-role` syncs `profiles.role` from `auth.users.raw_user_meta_data.role` if your Supabase trigger is missing.

## Priority note

Org **leadership** (org_admin / supervisor) is routed to **organization** dashboard before the advocate dashboard, so they see org-wide advocate lists first. **Staff** advocates use `/advocate/dashboard`.
