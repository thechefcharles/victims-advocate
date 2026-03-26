-- Phase 1: Case → organization referrals (foundation only; no UI, access grants, or transfer).

create table public.case_org_referrals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  from_organization_id uuid references public.organizations(id) on delete set null,
  to_organization_id uuid not null references public.organizations(id) on delete restrict,
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  responded_at timestamptz null,
  responded_by_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists case_org_referrals_case_id_idx
  on public.case_org_referrals (case_id);

create index if not exists case_org_referrals_to_organization_id_idx
  on public.case_org_referrals (to_organization_id);

create index if not exists case_org_referrals_status_idx
  on public.case_org_referrals (status);

create index if not exists case_org_referrals_to_org_status_created_idx
  on public.case_org_referrals (to_organization_id, status, created_at desc);

-- One active pending referral per case + target org (MVP duplicate guard).
create unique index if not exists case_org_referrals_pending_case_target_unique
  on public.case_org_referrals (case_id, to_organization_id)
  where status = 'pending';

comment on table public.case_org_referrals is
  'Tracks handoff requests from a case to a receiving organization. Phase 1: persistence only; access grants and transfer are later phases.';

alter table public.case_org_referrals enable row level security;

drop policy if exists "Service role all case_org_referrals" on public.case_org_referrals;
create policy "Service role all case_org_referrals"
  on public.case_org_referrals for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
