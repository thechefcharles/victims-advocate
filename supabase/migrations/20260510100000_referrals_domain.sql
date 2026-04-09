-- Domain 4.1 — Referrals: first-class domain objects
-- Creates referrals, referral_share_packages, referral_events tables.
-- The legacy case_org_referrals table (Phase 1) is unchanged.

-- ============================================================================
-- 1. referrals table
-- ============================================================================

create table public.referrals (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  source_organization_id  uuid not null references public.organizations(id) on delete restrict,
  target_organization_id  uuid not null references public.organizations(id) on delete restrict,
  applicant_id            uuid not null references auth.users(id) on delete restrict,
  initiated_by            uuid not null references auth.users(id) on delete restrict,
  case_id                 uuid references public.cases(id) on delete set null,
  support_request_id      uuid references public.support_requests(id) on delete set null,
  status                  text not null default 'draft'
                            check (status in ('draft', 'pending_acceptance', 'accepted', 'rejected', 'cancelled', 'closed')),
  reason                  text,
  consent_grant_id        uuid references public.consent_grants(id) on delete set null,
  responded_at            timestamptz,
  responded_by            uuid references auth.users(id) on delete set null,

  constraint referrals_diff_orgs check (source_organization_id <> target_organization_id)
);

create index if not exists idx_referrals_source_org
  on public.referrals (source_organization_id);

create index if not exists idx_referrals_target_org
  on public.referrals (target_organization_id);

create index if not exists idx_referrals_applicant
  on public.referrals (applicant_id);

create index if not exists idx_referrals_status
  on public.referrals (status);

create index if not exists idx_referrals_target_pending
  on public.referrals (target_organization_id, status)
  where status = 'pending_acceptance';

create trigger set_referrals_updated_at
  before update on public.referrals
  for each row execute function public.set_updated_at();

comment on table public.referrals is
  'Domain 4.1 first-class referral objects. Distinct from case_org_referrals (Phase 1 legacy).';

alter table public.referrals enable row level security;

create policy "Service role all referrals"
  on public.referrals for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 2. referral_share_packages — consent-governed data shared with target org
-- ============================================================================

create table public.referral_share_packages (
  id               uuid primary key default gen_random_uuid(),
  referral_id      uuid not null references public.referrals(id) on delete cascade,
  prepared_by      uuid not null references auth.users(id) on delete restrict,
  prepared_at      timestamptz not null default now(),
  consent_grant_id uuid references public.consent_grants(id) on delete set null,
  package_type     text not null default 'basic',
  scoped_data      jsonb not null default '{}'::jsonb,
  doc_ids          uuid[] not null default '{}'::uuid[]
);

create index if not exists idx_referral_share_packages_referral
  on public.referral_share_packages (referral_id);

comment on table public.referral_share_packages is
  'Consent-governed data assembled for the target org when a referral is sent.';

alter table public.referral_share_packages enable row level security;

create policy "Service role all referral_share_packages"
  on public.referral_share_packages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================================
-- 3. referral_events — immutable lifecycle log
-- ============================================================================

create table public.referral_events (
  id           uuid primary key default gen_random_uuid(),
  referral_id  uuid not null references public.referrals(id) on delete cascade,
  event_type   text not null
                 check (event_type in ('initiated', 'sent', 'viewed', 'accepted', 'rejected', 'cancelled', 'closed')),
  actor_id     uuid not null references auth.users(id) on delete restrict,
  occurred_at  timestamptz not null default now(),
  metadata     jsonb not null default '{}'::jsonb
);

create index if not exists idx_referral_events_referral
  on public.referral_events (referral_id);

create index if not exists idx_referral_events_referral_time
  on public.referral_events (referral_id, occurred_at desc);

comment on table public.referral_events is
  'Immutable lifecycle event log for referrals. Never updated or deleted.';

alter table public.referral_events enable row level security;

create policy "Service role all referral_events"
  on public.referral_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
