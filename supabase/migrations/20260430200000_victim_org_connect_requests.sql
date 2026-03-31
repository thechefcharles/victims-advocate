-- Victim interest in connecting with a victim-service organization (notifies org leadership).

create table if not exists public.victim_org_connect_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  victim_user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'cancelled'))
);

create index if not exists victim_org_connect_requests_org_created_idx
  on public.victim_org_connect_requests (organization_id, created_at desc);

create index if not exists victim_org_connect_requests_victim_created_idx
  on public.victim_org_connect_requests (victim_user_id, created_at desc);

create unique index if not exists victim_org_connect_one_pending_per_pair
  on public.victim_org_connect_requests (victim_user_id, organization_id)
  where status = 'pending';

alter table public.victim_org_connect_requests enable row level security;
