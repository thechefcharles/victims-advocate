-- Phase 2: Platform-admin-reviewed ownership claims (directory / register flow).
-- Distinct from org_rep_join_requests (join existing workspace with owners).

create table if not exists public.org_claim_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users (id) on delete set null,
  reviewer_note text,
  created_at timestamptz not null default now()
);

create index if not exists org_claim_requests_org_submitted_idx
  on public.org_claim_requests (organization_id, submitted_at desc);

create index if not exists org_claim_requests_user_submitted_idx
  on public.org_claim_requests (user_id, submitted_at desc);

create index if not exists org_claim_requests_pending_list_idx
  on public.org_claim_requests (status, submitted_at desc)
  where status = 'pending';

-- At most one pending claim per (user, organization).
create unique index if not exists org_claim_requests_one_pending_per_user_org
  on public.org_claim_requests (user_id, organization_id)
  where status = 'pending';

alter table public.org_claim_requests enable row level security;

comment on table public.org_claim_requests is
  'Ownership claim awaiting platform admin approval. Approved row adds org_owner membership; rejected does not.';
