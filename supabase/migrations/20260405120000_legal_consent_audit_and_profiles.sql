-- Legal onboarding: profile fields, immutable consent audit, Terms of Use policy v2.0 activation.

-- ---------------------------------------------------------------------------
-- profiles: acceptance timestamps and versioning (signup consent flow)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text,
  add column if not exists terms_accept_ip inet,
  add column if not exists terms_accept_user_agent text,
  add column if not exists legal_user_type text,
  add column if not exists legal_organization_id uuid,
  add column if not exists legal_accepting_role text,
  add column if not exists mfa_sms_consent_given boolean not null default false,
  add column if not exists mfa_sms_consent_at timestamptz,
  add column if not exists privacy_policy_accepted_at timestamptz,
  add column if not exists privacy_policy_version text,
  add column if not exists liability_waiver_accepted_at timestamptz,
  add column if not exists liability_waiver_version text,
  add column if not exists beta_platform_ack_at timestamptz,
  add column if not exists beta_platform_ack_version text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_legal_user_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_legal_user_type_check
      check (legal_user_type is null or legal_user_type in ('individual', 'organizational'));
  end if;
end $$;

comment on column public.profiles.terms_version is 'Accepted Terms of Use version (e.g. 2.0); mismatch with platform config forces re-acceptance.';
comment on column public.profiles.legal_user_type is 'Signup consent pathway: individual victim vs organizational invite.';
comment on column public.profiles.mfa_sms_consent_given is 'User consented to SMS for MFA security codes at Terms step.';

-- ---------------------------------------------------------------------------
-- legal_consent_audit — append-only; no updates or deletes
-- ---------------------------------------------------------------------------
create table if not exists public.legal_consent_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_type text not null
    check (document_type in (
      'terms_of_use',
      'privacy_policy',
      'liability_waiver',
      'beta_platform_ack'
    )),
  version text not null,
  accepted_at timestamptz not null default now(),
  ip inet,
  user_agent text,
  user_type text,
  mfa_consent_given boolean,
  organization_id uuid,
  accepting_role text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists legal_consent_audit_user_created_idx
  on public.legal_consent_audit (user_id, created_at desc);

create index if not exists legal_consent_audit_doc_type_idx
  on public.legal_consent_audit (document_type, version);

comment on table public.legal_consent_audit is
  'Immutable log of legal consent events; application must never UPDATE or DELETE rows.';

alter table public.legal_consent_audit enable row level security;

-- No GRANT to authenticated for insert/select — only service_role (API) touches this table.

create or replace function public.prevent_legal_consent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'legal_consent_audit is append-only';
end;
$$;

drop trigger if exists legal_consent_audit_no_update on public.legal_consent_audit;
create trigger legal_consent_audit_no_update
  before update on public.legal_consent_audit
  for each row execute function public.prevent_legal_consent_audit_mutation();

drop trigger if exists legal_consent_audit_no_delete on public.legal_consent_audit;
create trigger legal_consent_audit_no_delete
  before delete on public.legal_consent_audit
  for each row execute function public.prevent_legal_consent_audit_mutation();

-- ---------------------------------------------------------------------------
-- Activate Terms of Use Version 2.0 (deactivate prior active terms slot)
-- ---------------------------------------------------------------------------
update public.policy_documents
set is_active = false, updated_at = now()
where doc_type = 'terms_of_use'
  and coalesce(applies_to_role, '') = ''
  and coalesce(workflow_key, '') = ''
  and is_active = true;

insert into public.policy_documents (
  doc_type,
  version,
  title,
  content,
  is_active,
  applies_to_role,
  workflow_key,
  metadata
)
values (
  'terms_of_use',
  '2.0',
  'NxtStps Terms of Use',
  'Version 2.0. The full Terms of Use were presented in the NxtStps application at the time of acceptance. For the complete text, see the in-app Terms of Use (Version 2.0) or contact support.',
  true,
  null,
  null,
  jsonb_build_object(
    'summary', 'Expanded to cover Provider users, prohibited uses, content ownership, termination, and communications consent.'
  )
);
