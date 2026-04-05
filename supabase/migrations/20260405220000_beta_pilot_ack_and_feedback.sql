-- Beta / pilot acknowledgment: audit document type, profile accept metadata, feedback + status-change logs.

-- Allow new audit document_type (keep legacy beta_platform_ack for existing rows).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.legal_consent_audit'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) like '%document_type%'
  loop
    execute format('alter table public.legal_consent_audit drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.legal_consent_audit
  add constraint legal_consent_audit_document_type_check
  check (document_type in (
    'terms_of_use',
    'privacy_policy',
    'liability_waiver',
    'beta_platform_ack',
    'beta_pilot_acknowledgment'
  ));

alter table public.profiles
  add column if not exists beta_platform_ack_accept_ip inet,
  add column if not exists beta_platform_ack_accept_user_agent text;

comment on column public.profiles.beta_platform_ack_accept_ip is 'IP at beta/pilot platform acknowledgment acceptance.';
comment on column public.profiles.beta_platform_ack_accept_user_agent is 'User-Agent at beta/pilot acknowledgment acceptance.';

-- Pilot feedback (API inserts via service role only).
create table if not exists public.pilot_platform_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pathname text,
  category text not null,
  message text,
  affects_application boolean,
  user_agent text
);

create index if not exists pilot_platform_feedback_user_created_idx
  on public.pilot_platform_feedback (user_id, created_at desc);

comment on table public.pilot_platform_feedback is
  'Pilot/MVP-only user feedback; not used when PLATFORM_STATUS is production.';

alter table public.pilot_platform_feedback enable row level security;

-- Optional compliance / ops log when platform status is changed (insert via admin/script).
create table if not exists public.platform_status_change_log (
  id uuid primary key default gen_random_uuid(),
  changed_at timestamptz not null default now(),
  event_type text not null default 'platform_status_change',
  previous_status text not null,
  new_status text not null,
  changed_by uuid references auth.users (id) on delete set null
);

comment on table public.platform_status_change_log is
  'Record production transitions (e.g. pilot to production); append when config changes.';

alter table public.platform_status_change_log enable row level security;
