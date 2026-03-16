-- Phase 13: OCR runs and extracted fields for document parsing pipeline.

create table if not exists public.ocr_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  document_id uuid not null references public.documents(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'needs_review')),
  ocr_provider text,
  ocr_model text,
  raw_text_hash text,
  raw_text_length integer,
  failure_reason text,
  result_summary jsonb not null default '{}'::jsonb
);

comment on table public.ocr_runs is 'Phase 13: OCR processing runs per document; raw text not stored, only hash and extracted fields.';

create index if not exists ocr_runs_document_created_idx on public.ocr_runs (document_id, created_at desc);
create index if not exists ocr_runs_case_created_idx on public.ocr_runs (case_id, created_at desc);
create index if not exists ocr_runs_org_created_idx on public.ocr_runs (organization_id, created_at desc);

alter table public.ocr_runs enable row level security;

create policy "Service role full access ocr_runs"
  on public.ocr_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ocr_extracted_fields: one row per field per run
create table if not exists public.ocr_extracted_fields (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ocr_run_id uuid not null references public.ocr_runs(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  field_key text not null,
  field_label text,
  value_text text,
  value_number numeric,
  value_date date,
  normalized_value jsonb not null default '{}'::jsonb,
  confidence_score numeric,
  status text not null default 'extracted' check (status in ('extracted', 'confirmed', 'corrected', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  correction_reason text,
  source_region jsonb not null default '{}'::jsonb
);

comment on table public.ocr_extracted_fields is 'Phase 13: Extracted fields from OCR; human review state.';

create index if not exists ocr_extracted_fields_document_field_idx on public.ocr_extracted_fields (document_id, field_key);
create index if not exists ocr_extracted_fields_case_field_idx on public.ocr_extracted_fields (case_id, field_key);
create index if not exists ocr_extracted_fields_run_field_idx on public.ocr_extracted_fields (ocr_run_id, field_key);

alter table public.ocr_extracted_fields enable row level security;

create policy "Service role full access ocr_extracted_fields"
  on public.ocr_extracted_fields for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
