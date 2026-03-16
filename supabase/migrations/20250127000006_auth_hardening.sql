-- Phase 5: Auth security hardening – rate limits and account status

-- auth_rate_limits: track failed attempts by email and optionally IP
create table if not exists public.auth_rate_limits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  ip inet,
  action text not null,
  failure_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  locked_until timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists auth_rate_limits_email_action_idx
  on public.auth_rate_limits (lower(trim(email)), action);

create index if not exists auth_rate_limits_ip_action_idx
  on public.auth_rate_limits (ip, action);

create index if not exists auth_rate_limits_locked_until_idx
  on public.auth_rate_limits (locked_until)
  where locked_until is not null;

alter table public.auth_rate_limits enable row level security;

-- Only service role / server should read/write rate limits
create policy "Service role only for auth_rate_limits"
  on public.auth_rate_limits for all
  using (auth.role() = 'service_role');

-- profiles: account status for soft delete / disable
alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'disabled', 'deleted'));

alter table public.profiles
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  add column if not exists disabled_at timestamptz;

create index if not exists profiles_account_status_idx
  on public.profiles (account_status);
