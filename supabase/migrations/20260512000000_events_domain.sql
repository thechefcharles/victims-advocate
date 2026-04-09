-- Domain 4.3 — Events
--
-- First-class org/program-level events. NOT appointments (4.2) — appointments are
-- case-bound, single-applicant, operational. Events are org-scoped, multi-attendee,
-- scheduled offerings (workshops, info sessions, clinics, etc).
--
-- Non-negotiable rules enforced in this migration:
--   1. audience_scope is NOT NULL — every event has explicit visibility
--   2. Status check constraint mirrors EventStatus enum exactly
--   3. audience_scope check constraint mirrors EventAudienceScope enum
--   4. service_role RLS on both tables

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  program_id          uuid references public.programs(id) on delete set null,
  title               text not null,
  description         text,
  event_type          text not null,
  start_at            timestamptz not null,
  end_at              timestamptz not null,
  timezone            text not null default 'UTC',
  location            text,
  modality            text not null default 'in_person',
  status              text not null default 'draft',
  audience_scope      text not null,
  capacity            integer,
  registered_count    integer not null default 0,
  registration_open   boolean not null default false,
  created_by          uuid not null references auth.users(id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  constraint events_status_check check (
    status in ('draft', 'published', 'cancelled', 'closed')
  ),
  constraint events_audience_scope_check check (
    audience_scope in ('public', 'applicant_visible', 'provider_internal', 'invite_only')
  ),
  constraint events_modality_check check (
    modality in ('in_person', 'virtual', 'hybrid')
  ),
  constraint events_end_after_start check (end_at > start_at),
  constraint events_capacity_nonneg check (capacity is null or capacity >= 0),
  constraint events_registered_count_nonneg check (registered_count >= 0)
);

create index if not exists events_org_id_idx         on public.events(organization_id);
create index if not exists events_program_id_idx     on public.events(program_id);
create index if not exists events_status_idx         on public.events(status);
create index if not exists events_audience_scope_idx on public.events(audience_scope);
create index if not exists events_start_at_idx       on public.events(start_at);

create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.handle_updated_at();

alter table public.events enable row level security;

create policy "service_role_events"
  on public.events
  for all
  using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- event_registrations
-- ---------------------------------------------------------------------------
-- Minimal v1 registration model. GREEN tier: clean boundary, not full feature.
-- Capacity + status guards live in the service layer; no waitlist in v1.

create table if not exists public.event_registrations (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references public.events(id) on delete cascade,
  participant_id  uuid not null references auth.users(id) on delete cascade,
  status          text not null default 'registered',
  registered_at   timestamptz not null default now(),

  constraint event_registrations_status_check check (
    status in ('registered', 'cancelled')
  ),
  constraint event_registrations_unique_participant unique (event_id, participant_id)
);

create index if not exists event_registrations_event_id_idx       on public.event_registrations(event_id);
create index if not exists event_registrations_participant_id_idx on public.event_registrations(participant_id);

alter table public.event_registrations enable row level security;

create policy "service_role_event_registrations"
  on public.event_registrations
  for all
  using (auth.role() = 'service_role');
