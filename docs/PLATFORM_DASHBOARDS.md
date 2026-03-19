# Role-based dashboards

After login, users are sent to exactly one home dashboard:

| Condition | Route |
|-----------|--------|
| `profiles.is_admin = true` | `/admin/dashboard` — platform admin (all orgs, ecosystem, cases, users) |
| Org member with `org_role` **org_admin** or **supervisor** | `/organization/dashboard` — advocates in your org |
| `profiles.role = advocate` (and not platform admin; org staff use advocate home) | `/advocate/dashboard` — your clients / victims |
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

1. User creates a normal account (`/signup`).
2. Signed-in user opens `/signup/organization`, enters org name and type.
3. API `POST /api/org/register` creates the org and makes the user `org_admin` (only if they have no existing org membership).

## Priority note

Org **leadership** (org_admin / supervisor) is routed to **organization** dashboard before the advocate dashboard, so they see org-wide advocate lists first. **Staff** advocates use `/advocate/dashboard`.
