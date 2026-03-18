-- Base profiles table (required before audit_log and org RLS policies reference it).
-- If you already hit "profiles does not exist" on audit_log: run this file first in SQL Editor,
-- then re-run remaining migrations or create the audit_log select policy manually.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'victim' check (role in ('victim', 'advocate')),
  is_admin boolean not null default false,
  organization text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_is_admin_idx
  on public.profiles (is_admin)
  where is_admin = true;

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Service role has full access" on public.profiles;
drop policy if exists "profiles_service_role_all" on public.profiles;
create policy "Service role has full access"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.profiles is 'User profile aligned with auth.users; is_admin gates platform admin UI.';
