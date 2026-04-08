-- Domain 2.1 Intake — sessions, submissions, amendments
-- Timestamp: 20260504000000 (> 20260501400000 floor per AGENTS.md Rule 13)
--
-- Creates three greenfield tables that coexist with the legacy
-- cases.application jsonb intake store. The legacy column is left
-- untouched; saveIntakeDraft performs a dual-write so the legacy
-- intake page continues to work until it is rewritten.
--
-- Data class: Class A — Restricted.
-- Applicant identity, crime details, and trauma narratives are all
-- in scope. RLS is the primary access control; service role is the
-- only path that can mutate intake_submissions and intake_amendments.

-- ---------------------------------------------------------------------------
-- Table: intake_sessions (mutable draft)
-- ---------------------------------------------------------------------------

create table if not exists public.intake_sessions (
  id                     uuid primary key default gen_random_uuid(),
  owner_user_id          uuid not null references auth.users(id) on delete restrict,
  case_id                uuid references public.cases(id) on delete set null,
  support_request_id     uuid references public.support_requests(id) on delete set null,
  organization_id        uuid references public.organizations(id) on delete set null,
  state_code             text not null check (state_code in ('IL', 'IN')),
  status                 text not null default 'draft'
    check (status in ('draft', 'submitted', 'locked')),
  draft_payload          jsonb not null default '{}'::jsonb,
  intake_schema_version  text not null default 'v1',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.intake_sessions is
  'Domain 2.1: Class A data. Mutable draft container for an applicant''s in-progress intake. Coexists with the legacy cases.application jsonb store via dual-write.';

create index if not exists intake_sessions_owner_status_idx
  on public.intake_sessions (owner_user_id, status);

create index if not exists intake_sessions_case_id_idx
  on public.intake_sessions (case_id);

-- ---------------------------------------------------------------------------
-- Table: intake_submissions (immutable snapshot)
-- ---------------------------------------------------------------------------

create table if not exists public.intake_submissions (
  id                     uuid primary key default gen_random_uuid(),
  session_id             uuid not null references public.intake_sessions(id) on delete restrict,
  case_id                uuid references public.cases(id) on delete set null,
  organization_id        uuid references public.organizations(id) on delete set null,
  owner_user_id          uuid not null references auth.users(id) on delete restrict,
  submitted_payload      jsonb not null,                          -- immutable after insert
  intake_schema_version  text not null,
  state_code             text not null check (state_code in ('IL', 'IN')),
  submitted_at           timestamptz not null default now(),
  submitted_by_user_id   uuid references auth.users(id) on delete set null
);

comment on table public.intake_submissions is
  'Domain 2.1: Class A data. Immutable snapshot of an intake session at submission time. No UPDATE policy is granted — service role inserts only; downstream domains (CVC alignment, agency reporting, search profile builder) consume the snapshot.';

create index if not exists intake_submissions_org_submitted_idx
  on public.intake_submissions (organization_id, submitted_at desc);

create index if not exists intake_submissions_session_id_idx
  on public.intake_submissions (session_id);

-- ---------------------------------------------------------------------------
-- Table: intake_amendments (append-only audit)
-- ---------------------------------------------------------------------------

create table if not exists public.intake_amendments (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid not null references public.intake_submissions(id) on delete restrict,
  field_key           text not null,
  previous_value      jsonb,
  new_value           jsonb,
  reason              text,
  amended_by_user_id  uuid not null references auth.users(id) on delete restrict,
  amended_at          timestamptz not null default now()
);

comment on table public.intake_amendments is
  'Domain 2.1: Class A data. Append-only audit of post-submission amendments to an intake_submission. No UPDATE/DELETE policies — service role inserts only.';

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.intake_sessions    enable row level security;
alter table public.intake_submissions enable row level security;
alter table public.intake_amendments  enable row level security;

-- intake_sessions: applicant owner sees and updates own session
create policy "intake_sessions_owner_select"
  on public.intake_sessions
  for select
  using (owner_user_id = auth.uid());

create policy "intake_sessions_owner_update"
  on public.intake_sessions
  for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- intake_sessions: org members can read once linked
create policy "intake_sessions_org_select"
  on public.intake_sessions
  for select
  using (
    organization_id is not null
    and organization_id in (
      select organization_id
      from public.org_memberships
      where user_id = auth.uid()
        and status = 'active'
    )
  );

-- intake_sessions: service role full access
create policy "intake_sessions_service_role_all"
  on public.intake_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- intake_submissions: applicant owner can read own submission
create policy "intake_submissions_owner_select"
  on public.intake_submissions
  for select
  using (owner_user_id = auth.uid());

-- intake_submissions: org members can read once linked
create policy "intake_submissions_org_select"
  on public.intake_submissions
  for select
  using (
    organization_id is not null
    and organization_id in (
      select organization_id
      from public.org_memberships
      where user_id = auth.uid()
        and status = 'active'
    )
  );

-- intake_submissions: service role full access (no UPDATE policy means rows are immutable to non-service callers)
create policy "intake_submissions_service_role_all"
  on public.intake_submissions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- intake_amendments: org members can read amendments tied to a submission they can see
create policy "intake_amendments_org_select"
  on public.intake_amendments
  for select
  using (
    submission_id in (
      select id from public.intake_submissions
      where organization_id is not null
        and organization_id in (
          select organization_id
          from public.org_memberships
          where user_id = auth.uid()
            and status = 'active'
        )
    )
  );

-- intake_amendments: service role full access (append-only — no UPDATE/DELETE policies)
create policy "intake_amendments_service_role_all"
  on public.intake_amendments
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- updated_at trigger on intake_sessions (uses shared handle_updated_at())
-- ---------------------------------------------------------------------------

create trigger intake_sessions_updated_at
  before update on public.intake_sessions
  for each row execute function public.handle_updated_at();
