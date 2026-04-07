-- Domain 1.1 SupportRequest
-- Timestamp: 20260501500000 (> 20260501400000 floor per AGENTS.md Rule 13)
--
-- Creates the support_requests table, RLS policies, one-active-request
-- partial unique index, and updated_at trigger.
--
-- Data class: Class A — Restricted.
-- Applicant identity, case linkage, and org assignment are all PII-adjacent.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.support_requests (
  id                       uuid primary key default gen_random_uuid(),
  applicant_id             uuid not null references public.profiles(id),
  organization_id          uuid not null references public.organizations(id),
  program_id               uuid,                          -- nullable; informational only in v1
  status                   text not null default 'draft'
    check (status in (
      'draft', 'submitted', 'pending_review', 'accepted',
      'declined', 'transferred', 'withdrawn', 'closed'
    )),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  submitted_at             timestamptz,
  reviewed_at              timestamptz,
  accepted_at              timestamptz,
  declined_at              timestamptz,
  withdrawn_at             timestamptz,
  closed_at                timestamptz,
  decline_reason           text,
  transfer_reason          text,
  case_id                  uuid,                          -- nullable FK; set by Domain 1.2 on accept
  state_workflow_config_id uuid                           -- reserved; no FK constraint in v1
);

comment on table public.support_requests is
  'Domain 1.1 SupportRequest — entry workflow object connecting an applicant to a provider organization.';

comment on column public.support_requests.program_id is
  'Optional link to a specific program within the org. Informational only in v1.';

comment on column public.support_requests.case_id is
  'Set by Domain 1.2 when a Case is created on acceptance. Nullable FK.';

comment on column public.support_requests.state_workflow_config_id is
  'Reserved for future workflow configuration domain. No FK constraint in v1.';

-- ---------------------------------------------------------------------------
-- One-active-request constraint (DB level — defense in depth)
-- Active = status NOT IN terminal states
-- ---------------------------------------------------------------------------

create unique index if not exists support_requests_applicant_active_idx
  on public.support_requests (applicant_id)
  where status not in ('declined', 'transferred', 'withdrawn', 'closed');

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.support_requests enable row level security;

-- Applicant: sees own rows only
create policy "support_requests_applicant_select"
  on public.support_requests
  for select
  using (applicant_id = auth.uid());

-- Provider: sees rows belonging to their active org memberships
create policy "support_requests_provider_select"
  on public.support_requests
  for select
  using (
    organization_id in (
      select organization_id
      from public.org_memberships
      where user_id = auth.uid()
        and status = 'active'
    )
  );

-- Service role: full access for all operations (server-side only)
create policy "support_requests_service_role_all"
  on public.support_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- updated_at trigger (uses shared handle_updated_at() function)
-- ---------------------------------------------------------------------------

create trigger support_requests_updated_at
  before update on public.support_requests
  for each row execute function public.handle_updated_at();
