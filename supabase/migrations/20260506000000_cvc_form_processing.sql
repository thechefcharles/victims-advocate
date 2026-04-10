-- Domain 2.3: CVC Form Processing & Alignment Engine
-- Timestamp: 20260506000000 (> 20260505000000 — Domain 2.2 — and > Rule 13 floor 20260501400000)
--
-- Option B (confirmed): new relational tables (cvc_form_templates, cvc_form_fields,
-- form_alignment_mappings, output_generation_jobs). Domain 2.2's form_template_sets
-- and output_mapping_sets jsonb-blob containers are marked deprecated via COMMENT
-- but NOT dropped. Cleanup migration is deferred.
--
-- Data classification:
--   cvc_form_templates / cvc_form_fields / form_alignment_mappings → Class C (config)
--   output_generation_jobs → Class B (operational audit; references case_id)

-- ---------------------------------------------------------------------------
-- 1. Mark Domain 2.2 jsonb shells as deprecated
-- ---------------------------------------------------------------------------

comment on table public.form_template_sets is
  'Deprecated by Domain 2.3. Replaced by cvc_form_templates + cvc_form_fields. Do not write new data. Cleanup migration pending.';

comment on table public.output_mapping_sets is
  'Deprecated by Domain 2.3. Replaced by form_alignment_mappings. Do not write new data. Cleanup migration pending.';

-- ---------------------------------------------------------------------------
-- 2. CVC Form Templates (versioned official state forms)
-- ---------------------------------------------------------------------------

create table if not exists public.cvc_form_templates (
  id                          uuid primary key default gen_random_uuid(),
  state_workflow_config_id    uuid references public.state_workflow_configs(id) on delete restrict,
  state_code                  text not null check (state_code in ('IL', 'IN')),
  form_name                   text not null,
  template_id                 text not null,                  -- 'il_cvc' | 'in_cvc'
  version_number              integer not null default 1,
  status                      text not null default 'draft'
    check (status in ('draft', 'active', 'deprecated')),
  source_pdf_path             text,                           -- reference to PDF in public/pdf/ or storage
  seeded_from                 text,
  published_at                timestamptz,
  deprecated_at               timestamptz,
  created_by                  uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.cvc_form_templates is
  'Domain 2.3: Versioned official state CVC form templates. Class C data.';

alter table public.cvc_form_templates enable row level security;

create unique index if not exists cvc_form_templates_one_active_per_state
  on public.cvc_form_templates (state_code)
  where status = 'active';

create policy "cvc_templates_admin"
  on public.cvc_form_templates
  for all
  using (public.is_admin());

create policy "cvc_templates_authenticated_read"
  on public.cvc_form_templates
  for select
  using (status in ('active', 'deprecated') and auth.uid() is not null);

create policy "cvc_templates_service_role"
  on public.cvc_form_templates
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. CVC Form Fields (addressable PDF field/region per template)
-- ---------------------------------------------------------------------------

create table if not exists public.cvc_form_fields (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.cvc_form_templates(id) on delete cascade,
  field_key     text not null,                              -- AcroForm field name (IL) or synthetic id (IN)
  label         text,
  field_type    text not null check (field_type in ('text', 'textarea', 'checkbox', 'date', 'currency', 'signature')),
  page_number   integer,
  x             numeric,                                    -- coordinate (IN only)
  y             numeric,                                    -- coordinate (IN only)
  font_size     numeric,                                    -- IN only
  required      boolean not null default false,
  source_path   text,                                       -- e.g. 'victim.firstName' — dotted path into CompensationApplication
  created_at    timestamptz not null default now(),
  unique (template_id, field_key)
);

comment on table public.cvc_form_fields is
  'Domain 2.3: Per-template addressable form fields. Class C data.';

alter table public.cvc_form_fields enable row level security;

create policy "cvc_form_fields_admin"
  on public.cvc_form_fields
  for all
  using (public.is_admin());

create policy "cvc_form_fields_authenticated_read"
  on public.cvc_form_fields
  for select
  using (auth.uid() is not null);

create policy "cvc_form_fields_service_role"
  on public.cvc_form_fields
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. Form Alignment Mappings (bridge: form field → canonical → intake → eligibility)
-- ---------------------------------------------------------------------------

create table if not exists public.form_alignment_mappings (
  id                      uuid primary key default gen_random_uuid(),
  template_id             uuid not null references public.cvc_form_templates(id) on delete cascade,
  cvc_form_field_id       uuid not null references public.cvc_form_fields(id) on delete cascade,
  canonical_field_key     text not null,                    -- canonical field path in CompensationApplication
  intake_field_path       text,                             -- dotted path for intake field override
  eligibility_field_key   text,                             -- references eligibility answer key if applicable
  mapping_purpose         text not null
    check (mapping_purpose in ('intake', 'eligibility', 'output', 'computed')),
  transform_type          text,                             -- 'date_reformat' | 'phone_split' | 'currency_format' | null
  transform_config        jsonb,                            -- transform-specific params
  required                boolean not null default false,
  created_at              timestamptz not null default now(),
  unique (template_id, cvc_form_field_id)
);

comment on table public.form_alignment_mappings is
  'Domain 2.3: Bridge from cvc_form_fields → canonical/intake/eligibility data. Class C data.';

alter table public.form_alignment_mappings enable row level security;

create policy "alignment_mappings_admin"
  on public.form_alignment_mappings
  for all
  using (public.is_admin());

create policy "alignment_mappings_authenticated_read"
  on public.form_alignment_mappings
  for select
  using (auth.uid() is not null);

create policy "alignment_mappings_service_role"
  on public.form_alignment_mappings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. Output Generation Jobs (audit trail for CVC PDF generation)
-- ---------------------------------------------------------------------------

create table if not exists public.output_generation_jobs (
  id                       uuid primary key default gen_random_uuid(),
  case_id                  uuid not null references public.cases(id) on delete restrict,
  cvc_form_template_id     uuid not null references public.cvc_form_templates(id) on delete restrict,
  state_code               text not null check (state_code in ('IL', 'IN')),
  status                   text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  generated_document_id    uuid,                            -- FK to documents table after completion
  generation_metadata      jsonb default '{}'::jsonb,       -- warnings, completeness status, etc.
  failure_reason           text,
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  completed_at             timestamptz
);

comment on table public.output_generation_jobs is
  'Domain 2.3: Audit trail for CVC PDF generation events. Class B data.';

alter table public.output_generation_jobs enable row level security;

-- Org members can read jobs for cases in their org. Admins can read all.
create policy "output_jobs_org_read"
  on public.output_generation_jobs
  for select
  using (
    exists (
      select 1
      from public.cases c
      where c.id = output_generation_jobs.case_id
        and c.organization_id = public.current_org_id()
    )
    or public.is_admin()
  );

create policy "output_jobs_service_role"
  on public.output_generation_jobs
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------

create index if not exists cvc_form_templates_state_status_idx
  on public.cvc_form_templates (state_code, status);

create index if not exists cvc_form_fields_template_idx
  on public.cvc_form_fields (template_id);

create index if not exists form_alignment_mappings_template_idx
  on public.form_alignment_mappings (template_id);

create index if not exists output_jobs_case_idx
  on public.output_generation_jobs (case_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger on cvc_form_templates
-- ---------------------------------------------------------------------------

create trigger cvc_form_templates_updated_at
  before update on public.cvc_form_templates
  for each row execute function public.handle_updated_at();
