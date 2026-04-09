-- Domain 4.2 — Appointments / Scheduling
--
-- Three tables:
--   appointments           — first-class case-linked scheduling object
--   availability_rules     — org/staff/program availability windows + blackout dates
--   appointment_events     — immutable audit log (append-only)
--
-- Non-negotiable rules enforced in this migration:
--   1. appointments.case_id is NOT NULL (system law)
--   2. Status check constraint mirrors AppointmentStatus enum exactly
--   3. All tables: service_role RLS only — no public access

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------

create table if not exists public.appointments (
  id                    uuid primary key default gen_random_uuid(),
  case_id               uuid not null references public.cases(id) on delete cascade,
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  program_id            uuid references public.program_definitions(id) on delete set null,
  service_type          text not null,
  scheduled_start       timestamptz not null,
  scheduled_end         timestamptz not null,
  timezone              text not null default 'UTC',
  status                text not null default 'scheduled',
  assigned_staff_id     uuid references auth.users(id) on delete set null,
  notes                 text,
  rescheduled_from_id   uuid references public.appointments(id) on delete set null,
  -- Reminder state — owned here, consumed by Notifications domain (7.2)
  next_reminder_at      timestamptz,
  reminder_status       text,
  last_reminded_at      timestamptz,
  created_by            uuid not null references auth.users(id) on delete restrict,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint appointments_status_check check (
    status in ('scheduled', 'rescheduled', 'cancelled', 'completed', 'no_show')
  ),
  constraint appointments_end_after_start check (scheduled_end > scheduled_start)
);

create index if not exists appointments_case_id_idx        on public.appointments(case_id);
create index if not exists appointments_org_id_idx         on public.appointments(organization_id);
create index if not exists appointments_status_idx         on public.appointments(status);
create index if not exists appointments_scheduled_start_idx on public.appointments(scheduled_start);
create index if not exists appointments_staff_id_idx       on public.appointments(assigned_staff_id);

create trigger set_appointments_updated_at
  before update on public.appointments
  for each row execute function public.handle_updated_at();

alter table public.appointments enable row level security;

create policy "service_role_appointments"
  on public.appointments
  for all
  using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- availability_rules
-- ---------------------------------------------------------------------------

create table if not exists public.availability_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  program_id      uuid references public.program_definitions(id) on delete cascade,
  staff_user_id   uuid references auth.users(id) on delete cascade,
  -- 0 = Sunday, 1 = Monday, … 6 = Saturday. NULL means entire date range (for blackouts).
  day_of_week     smallint check (day_of_week between 0 and 6),
  start_time      time,    -- null for blackout rules
  end_time        time,    -- null for blackout rules
  effective_from  date not null,
  effective_until date,    -- null = open-ended
  is_blackout     boolean not null default false,
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists availability_rules_org_id_idx   on public.availability_rules(organization_id);
create index if not exists availability_rules_staff_id_idx on public.availability_rules(staff_user_id);

alter table public.availability_rules enable row level security;

create policy "service_role_availability_rules"
  on public.availability_rules
  for all
  using (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- appointment_events (immutable audit log)
-- ---------------------------------------------------------------------------

create table if not exists public.appointment_events (
  id              uuid primary key default gen_random_uuid(),
  appointment_id  uuid not null references public.appointments(id) on delete cascade,
  event_type      text not null,
  previous_status text,
  new_status      text,
  metadata        jsonb not null default '{}',
  actor_id        uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),

  constraint appointment_events_type_check check (
    event_type in ('created', 'rescheduled', 'cancelled', 'completed', 'no_show', 'reminder_sent', 'notes_updated')
  )
);

-- No update trigger — appointment_events is append-only.

create index if not exists appointment_events_appointment_id_idx on public.appointment_events(appointment_id);
create index if not exists appointment_events_type_idx           on public.appointment_events(event_type);

alter table public.appointment_events enable row level security;

create policy "service_role_appointment_events"
  on public.appointment_events
  for all
  using (auth.role() = 'service_role');
