-- Domain 5.1 — Trusted Helper / Delegate Access
--
-- Normalizes the trusted_helper_access table created by Domain 3.1:
--   1. Adds relationship_type column (with CHECK constraint)
--   2. Adds expires_at timestamptz column (for time-bounded grants)
--   3. Adds granted_scope_detail jsonb column (richer structured scope)
--      — existing granted_scope text[] kept for backwards compatibility
--   4. Extends the status CHECK constraint to include 'expired'
--
-- Also creates trusted_helper_events — the append-only audit log.

-- ---------------------------------------------------------------------------
-- trusted_helper_access — ALTER to add missing columns
-- ---------------------------------------------------------------------------

-- relationship_type: pre-defined categories of helper
alter table public.trusted_helper_access
  add column if not exists relationship_type text;

alter table public.trusted_helper_access
  drop constraint if exists trusted_helper_access_relationship_type_check;

alter table public.trusted_helper_access
  add constraint trusted_helper_access_relationship_type_check check (
    relationship_type is null or relationship_type in (
      'guardian',
      'family_member',
      'advocate_assisted',
      'trusted_contact',
      'other_approved_helper'
    )
  );

-- expires_at: optional time-bound on helper access
alter table public.trusted_helper_access
  add column if not exists expires_at timestamptz;

-- granted_scope_detail: richer structured scope
-- Shape: { allowedActions: string[], allowedDomains: string[], caseRestriction?: string, viewOnly?: boolean }
-- Legacy granted_scope text[] is retained for backwards-compatible reads.
alter table public.trusted_helper_access
  add column if not exists granted_scope_detail jsonb
  not null
  default '{"allowedActions":[],"allowedDomains":[]}'::jsonb;

-- Extend status CHECK to include 'expired'
alter table public.trusted_helper_access
  drop constraint if exists trusted_helper_access_status_check;

alter table public.trusted_helper_access
  add constraint trusted_helper_access_status_check check (
    status in ('pending', 'active', 'revoked', 'expired')
  );

-- Index for resolver lookups: (helper, applicant, status) — hot path
create index if not exists idx_trusted_helper_resolve
  on public.trusted_helper_access (helper_user_id, applicant_user_id, status);

-- Index on expires_at for expiry sweep jobs
create index if not exists idx_trusted_helper_expires_at
  on public.trusted_helper_access (expires_at)
  where expires_at is not null;

-- ---------------------------------------------------------------------------
-- trusted_helper_events — immutable audit log (append-only)
-- ---------------------------------------------------------------------------

create table if not exists public.trusted_helper_events (
  id               uuid primary key default gen_random_uuid(),
  grant_id         uuid not null references public.trusted_helper_access(id) on delete cascade,
  event_type       text not null,
  previous_status  text,
  new_status       text,
  metadata         jsonb not null default '{}'::jsonb,
  actor_user_id    uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),

  constraint trusted_helper_events_type_check check (
    event_type in ('granted', 'accepted', 'revoked', 'expired', 'scope_updated', 'access_denied')
  )
);

-- No update trigger — trusted_helper_events is append-only.

create index if not exists idx_trusted_helper_events_grant_id
  on public.trusted_helper_events (grant_id);
create index if not exists idx_trusted_helper_events_type
  on public.trusted_helper_events (event_type);

alter table public.trusted_helper_events enable row level security;

create policy "service_role_trusted_helper_events"
  on public.trusted_helper_events
  for all
  using (auth.role() = 'service_role');

-- Applicant can read their own grant's events
create policy "trusted_helper_events_applicant_select"
  on public.trusted_helper_events
  for select
  using (
    exists (
      select 1 from public.trusted_helper_access a
      where a.id = trusted_helper_events.grant_id
        and a.applicant_user_id = auth.uid()
    )
  );
