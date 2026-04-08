-- Domain 2.2: State Workflow Config infrastructure
-- Timestamp: 20260505000000 (> 20260504000000 — Domain 2.1 — and > Rule 13 floor 20260501400000)
--
-- Creates the state_workflow_configs primary table plus 7 child set tables,
-- wires up FK columns on intake_sessions, intake_submissions, cases, and the
-- existing reserved column on support_requests, and marks the legacy
-- intake_schema_version columns from Domain 2.1 as deprecated.
--
-- Data class: Class C — Controlled Business (config / non-PII).
-- Access: platform admin for mutations, any authenticated user for active reads.

-- ---------------------------------------------------------------------------
-- 1. Primary config table
-- ---------------------------------------------------------------------------

create table if not exists public.state_workflow_configs (
  id              uuid primary key default gen_random_uuid(),
  state_code      text not null check (state_code in ('IL', 'IN')),
  version_number  integer not null default 1,
  status          text not null default 'draft'
    check (status in ('draft', 'active', 'deprecated')),
  display_name    text not null,
  seeded_from     text,                                  -- references Base Truth source file
  published_at    timestamptz,
  deprecated_at   timestamptz,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.state_workflow_configs is
  'Domain 2.2: Versioned per-state workflow configurations. Class C data.';

alter table public.state_workflow_configs enable row level security;

-- One active config per state at a time
create unique index if not exists state_workflow_configs_one_active_per_state
  on public.state_workflow_configs (state_code)
  where status = 'active';

create policy "state_workflow_configs_admin_all"
  on public.state_workflow_configs
  for all
  using (public.is_admin());

create policy "state_workflow_configs_authenticated_read_active"
  on public.state_workflow_configs
  for select
  using (status = 'active' and auth.uid() is not null);

create policy "state_workflow_configs_service_role"
  on public.state_workflow_configs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. intake_schemas (step / field structure for intake)
-- ---------------------------------------------------------------------------

create table if not exists public.intake_schemas (
  id              uuid primary key default gen_random_uuid(),
  config_id       uuid not null references public.state_workflow_configs(id) on delete cascade,
  schema_payload  jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.intake_schemas is
  'Domain 2.2: Intake step + field definitions per state workflow config. Class C.';

alter table public.intake_schemas enable row level security;

create policy "intake_schemas_admin"
  on public.intake_schemas
  for all
  using (public.is_admin());

create policy "intake_schemas_authenticated_read"
  on public.intake_schemas
  for select
  using (auth.uid() is not null);

create policy "intake_schemas_service_role"
  on public.intake_schemas
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. eligibility_rule_sets
-- ---------------------------------------------------------------------------

create table if not exists public.eligibility_rule_sets (
  id              uuid primary key default gen_random_uuid(),
  config_id       uuid not null references public.state_workflow_configs(id) on delete cascade,
  rules_payload   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.eligibility_rule_sets is
  'Domain 2.2: Per-state eligibility decision tree (questions, outcomes). Class C.';

alter table public.eligibility_rule_sets enable row level security;

create policy "eligibility_rule_sets_admin"
  on public.eligibility_rule_sets
  for all
  using (public.is_admin());

create policy "eligibility_rule_sets_authenticated_read"
  on public.eligibility_rule_sets
  for select
  using (auth.uid() is not null);

create policy "eligibility_rule_sets_service_role"
  on public.eligibility_rule_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. document_requirement_sets
-- ---------------------------------------------------------------------------

create table if not exists public.document_requirement_sets (
  id                    uuid primary key default gen_random_uuid(),
  config_id             uuid not null references public.state_workflow_configs(id) on delete cascade,
  requirements_payload  jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now()
);

comment on table public.document_requirement_sets is
  'Domain 2.2: Per-state required-document catalog. Class C.';

alter table public.document_requirement_sets enable row level security;

create policy "document_requirement_sets_admin"
  on public.document_requirement_sets
  for all
  using (public.is_admin());

create policy "document_requirement_sets_authenticated_read"
  on public.document_requirement_sets
  for select
  using (auth.uid() is not null);

create policy "document_requirement_sets_service_role"
  on public.document_requirement_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. translation_mapping_sets
-- ---------------------------------------------------------------------------

create table if not exists public.translation_mapping_sets (
  id                uuid primary key default gen_random_uuid(),
  config_id         uuid not null references public.state_workflow_configs(id) on delete cascade,
  locale            text not null default 'es',
  mappings_payload  jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.translation_mapping_sets is
  'Domain 2.2: Per-state per-locale translation mappings. Class C.';

alter table public.translation_mapping_sets enable row level security;

create policy "translation_mapping_sets_admin"
  on public.translation_mapping_sets
  for all
  using (public.is_admin());

create policy "translation_mapping_sets_authenticated_read"
  on public.translation_mapping_sets
  for select
  using (auth.uid() is not null);

create policy "translation_mapping_sets_service_role"
  on public.translation_mapping_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 6. output_mapping_sets
-- ---------------------------------------------------------------------------

create table if not exists public.output_mapping_sets (
  id              uuid primary key default gen_random_uuid(),
  config_id       uuid not null references public.state_workflow_configs(id) on delete cascade,
  template_id     text not null,                          -- e.g. 'il_cvc', 'in_cvc'
  field_metadata  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.output_mapping_sets is
  'Domain 2.2: Per-state output (PDF) field mappings — metadata only, no function bodies. Class C.';

alter table public.output_mapping_sets enable row level security;

create policy "output_mapping_sets_admin"
  on public.output_mapping_sets
  for all
  using (public.is_admin());

create policy "output_mapping_sets_authenticated_read"
  on public.output_mapping_sets
  for select
  using (auth.uid() is not null);

create policy "output_mapping_sets_service_role"
  on public.output_mapping_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 7. form_template_sets
-- ---------------------------------------------------------------------------

create table if not exists public.form_template_sets (
  id              uuid primary key default gen_random_uuid(),
  config_id       uuid not null references public.state_workflow_configs(id) on delete cascade,
  template_id     text not null,                          -- 'il_cvc' | 'in_cvc'
  field_metadata  jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.form_template_sets is
  'Domain 2.2: Per-state form template metadata (label, page, x, y, type, sourcePath). Class C.';

alter table public.form_template_sets enable row level security;

create policy "form_template_sets_admin"
  on public.form_template_sets
  for all
  using (public.is_admin());

create policy "form_template_sets_authenticated_read"
  on public.form_template_sets
  for select
  using (auth.uid() is not null);

create policy "form_template_sets_service_role"
  on public.form_template_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 8. disclaimer_sets
-- ---------------------------------------------------------------------------

create table if not exists public.disclaimer_sets (
  id                  uuid primary key default gen_random_uuid(),
  config_id           uuid not null references public.state_workflow_configs(id) on delete cascade,
  disclaimers_payload jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now()
);

comment on table public.disclaimer_sets is
  'Domain 2.2: Per-state legal disclaimer payloads (consent text, footer notices). Class C.';

alter table public.disclaimer_sets enable row level security;

create policy "disclaimer_sets_admin"
  on public.disclaimer_sets
  for all
  using (public.is_admin());

create policy "disclaimer_sets_service_role"
  on public.disclaimer_sets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 9. state_workflow_config_id FK on existing tables
-- ---------------------------------------------------------------------------

alter table public.intake_sessions
  add column if not exists state_workflow_config_id uuid
  references public.state_workflow_configs(id) on delete set null;

comment on column public.intake_sessions.intake_schema_version is
  'Deprecated: use state_workflow_config_id FK instead. Kept for data preservation.';

alter table public.intake_submissions
  add column if not exists state_workflow_config_id uuid
  references public.state_workflow_configs(id) on delete set null;

comment on column public.intake_submissions.intake_schema_version is
  'Deprecated: use state_workflow_config_id FK instead. Kept for data preservation.';

alter table public.cases
  add column if not exists state_workflow_config_id uuid
  references public.state_workflow_configs(id) on delete set null;

-- Wire up the existing reserved column on support_requests (added in 20260501500000)
alter table public.support_requests
  add constraint support_requests_state_workflow_config_id_fk
  foreign key (state_workflow_config_id)
  references public.state_workflow_configs(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 10. Indexes
-- ---------------------------------------------------------------------------

create index if not exists swc_state_code_status_idx
  on public.state_workflow_configs (state_code, status);

create index if not exists intake_sessions_swc_idx
  on public.intake_sessions (state_workflow_config_id)
  where state_workflow_config_id is not null;

create index if not exists intake_submissions_swc_idx
  on public.intake_submissions (state_workflow_config_id)
  where state_workflow_config_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at trigger on state_workflow_configs
-- ---------------------------------------------------------------------------

create trigger state_workflow_configs_updated_at
  before update on public.state_workflow_configs
  for each row execute function public.handle_updated_at();
