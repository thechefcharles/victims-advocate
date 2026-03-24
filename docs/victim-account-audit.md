# Victim account: personal info form audit

Use this when `/account` does not show **Victim personal info** for victim signups.

## 1. What the app expects (code)

| Step | Where | Expected |
|------|--------|----------|
| Signup | `app/signup/page.tsx` | `user_metadata.role` = `victim` (and optional `preferred_name`) |
| Server role | `GET /api/me` → `lib/server/auth/context.ts` | Reads **`public.profiles.role`**. Missing profile → treated as **`victim`**. |
| Client UI | `app/account/page.tsx` | If **`user_metadata.role`** is **`victim`** (JWT from signup), show the form. Otherwise hide only when effective role is **`advocate`** or **`organization`** (`/api/me` + `useAuth()`). |
| Save | `PATCH /api/me/personal-info` | Requires **`ctx.role === "victim"`** (effective role from profile + view-as). |

## 2. Supabase checks (SQL Editor)

Run with your user’s email:

```sql
-- A) Auth user + metadata
select id, email, raw_user_meta_data
from auth.users
where lower(email) = lower('YOUR_EMAIL@example.com');

-- B) Profile row (must exist for consistent RLS/admin; API still defaults missing row to victim)
select id, role, is_admin, account_status, personal_info
from public.profiles
where id = (select id from auth.users where lower(email) = lower('YOUR_EMAIL@example.com'));
```

**Fix profile role** (if wrong):

```sql
update public.profiles
set role = 'victim'
where id = 'PASTE_UUID_FROM_A';
```

**Insert profile if missing** (only if B returns no row):

```sql
insert into public.profiles (id, role)
values ('PASTE_UUID_FROM_A', 'victim')
on conflict (id) do update set role = excluded.role;
```

## 3. Trigger for new signups

Migration **`20260327130000_handle_new_user_profile.sql`** creates `handle_new_user` on `auth.users` so each signup gets a `profiles` row. Apply with:

`supabase db push` (or run the SQL in the Supabase SQL Editor if migrations are not used).

If the trigger already exists with different logic, compare and merge manually.

## 4. Browser checks

1. **Network → `GET /api/me` → Response**  
   - `data.role` and `data.realRole` should be `"victim"` for a victim account (unless admin “view as” is active).
2. **Console**  
   - Look for React/runtime errors on `/account`.

## 5. Environment

- Local **`.env.local`** must use the same Supabase project you inspect in the dashboard (`NEXT_PUBLIC_SUPABASE_URL`, anon key, and server **`SUPABASE_SERVICE_ROLE_KEY`** for API routes).

## 6. AuthProvider behavior (fixed in repo)

- `/api/me`-derived role is **not** cleared on every token refresh; only when the **signed-in user id** changes. That prevents the victim form from disappearing due to auth churn.
