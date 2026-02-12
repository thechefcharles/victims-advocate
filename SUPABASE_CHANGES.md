# Supabase changes for NxtStps homepage & admin gating

Run these in the Supabase SQL Editor or via migrations.

**If you already have a `profiles` table and `handle_new_user` trigger:**
- Add `is_admin` and `organization` columns (step 2)
- Optionally update `handle_new_user` to include `organization` (step 2)
- Skip creating a new profiles table

---

## 1. Newsletter subscribers table (no auth)

```sql
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text default 'homepage',
  created_at timestamptz default now()
);

-- Allow anonymous inserts for newsletter signup
alter table public.newsletter_subscribers enable row level security;

create policy "Anyone can insert newsletter subscribers"
  on public.newsletter_subscribers
  for insert
  to anon, authenticated
  with check (true);

-- No select policy for anon/authenticated = deny (service_role bypasses RLS)
```

---

## 2. Add is_admin to profiles

If `profiles` exists (synced with auth.users), add the column:

```sql
alter table public.profiles
  add column if not exists is_admin boolean default false;

-- Create index if you'll query by is_admin
create index if not exists profiles_is_admin_idx on public.profiles(is_admin) where is_admin = true;
```

If you don't have a profiles table yet, create one with a trigger:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text default 'victim' check (role in ('victim', 'advocate')),
  is_admin boolean default false,
  organization text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Service role has full access"
  on public.profiles for all
  using (auth.role() = 'service_role');

-- Trigger to create profile on signup (if you already have handle_new_user, add organization)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, organization)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'victim'),
    new.raw_user_meta_data->>'organization'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 3. Set cofounders as admin (run after profiles exist)

Replace the emails with your four cofounder emails:

```sql
update public.profiles
set is_admin = true
where id in (
  select id from auth.users
  where email in (
    'cofounder1@nxtstps.org',
    'cofounder2@nxtstps.org',
    'cofounder3@nxtstps.org',
    'cofounder4@nxtstps.org'
  )
);
```

---

## 4. Optional: add organization to profiles for full signup

If not already present:

```sql
alter table public.profiles
  add column if not exists organization text;
```

---

---

## 5. Add name to cases (optional label per case)

```sql
alter table public.cases
  add column if not exists name text;
```

---

## 6. Case delete behavior

The DELETE API will remove the case and rely on foreign keys. Ensure `case_access` and `documents` reference `cases(id)` with `ON DELETE CASCADE` (or handle cleanup in the API). If not set, you may need to delete `case_access` and `documents` rows first.

---

## Summary

| Change | Purpose |
|--------|---------|
| `newsletter_subscribers` table | Store newsletter-only signups (no auth) |
| `profiles.is_admin` | Flag admin users (4 cofounders) for MVP access |
| `profiles.organization` | Optional org from full signup |
| `cases.name` | User-defined label for each case |
