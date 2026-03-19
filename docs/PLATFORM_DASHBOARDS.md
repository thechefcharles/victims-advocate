# Role-based dashboards

After login, users are sent to exactly one home dashboard:

| Condition | Route |
|-----------|--------|
| `profiles.is_admin = true` | `/admin/dashboard` — platform admin (all orgs, ecosystem, cases, users) |
| Org member with `org_role` **org_admin** or **supervisor** | `/organization/dashboard` — org-wide tools |
| `profiles.role = advocate` (and not platform admin; org staff use advocate home) | `/advocate/dashboard` — your clients / victims |
| `profiles.role = organization` and **no** org membership yet | `/organization/setup` — fallback if org creation failed or email-confirm path |
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

1. User picks **Organization** on `/signup`, enters email, password, **organization name**, and **type** on the same form.
2. With an immediate session, the app calls `POST /api/org/register` right after signup (org row in `organizations`, user is `org_admin` in `org_memberships` — visible in admin org tools).
3. If email confirmation is required and there is **no** session, `pending_org_name` / `pending_org_type` are stored in `user_metadata`; first sign-in runs `POST /api/org/complete-pending-signup` to create the org automatically.
4. Alternate path: signed-in user opens `/signup/organization` (same `POST /api/org/register`).

Profile role `organization` is allowed by migration `20260322000000_profiles_role_organization.sql`. `POST /api/me/sync-profile-role` syncs `profiles.role` from `auth.users.raw_user_meta_data.role` if your Supabase trigger is missing.

## Priority note

Org **leadership** (org_admin / supervisor) is routed to **organization** dashboard before the advocate dashboard, so they see org-wide advocate lists first. **Staff** advocates use `/advocate/dashboard`.
