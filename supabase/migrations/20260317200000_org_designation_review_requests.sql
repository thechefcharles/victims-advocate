-- Phase E: Org designation review / correction requests (transparency workflow)

create table if not exists public.org_designation_review_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by_user_id uuid not null references auth.users(id) on delete set null,
  request_kind text not null
    check (request_kind in ('clarification', 'correction', 'data_update')),
  subject text not null,
  body text not null,
  designation_tier_snapshot text,
  designation_version_snapshot text,
  status text not null default 'pending'
    check (status in (
      'pending',
      'in_review',
      'resolved_affirmed',
      'resolved_recomputed',
      'resolved_declined',
      'withdrawn'
    )),
  admin_notes_internal text,
  admin_response_org_visible text,
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.org_designation_review_requests is 'Phase E: Org requests review of platform designation; admin workflow.';

create index if not exists org_designation_review_requests_org_idx
  on public.org_designation_review_requests (organization_id, created_at desc);
create index if not exists org_designation_review_requests_status_idx
  on public.org_designation_review_requests (status, created_at desc);

alter table public.org_designation_review_requests enable row level security;

create policy "Service role full access org_designation_review_requests"
  on public.org_designation_review_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
