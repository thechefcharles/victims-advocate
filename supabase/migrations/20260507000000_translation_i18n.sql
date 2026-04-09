-- Domain 2.4: Translation / i18n infrastructure
-- Timestamp: 20260507000000 (> 20260506000000 — Domain 2.3 — and > Rule 13 floor 20260501400000)
--
-- Option B (confirmed, symmetric with 2.3): new relational tables. Domain 2.2's
-- translation_mapping_sets jsonb shell is marked deprecated via COMMENT but NOT
-- dropped. Cleanup migration is deferred.
--
-- Tables:
--   translation_mapping_sets_v2 — versioned mapping sets, FK to state_workflow_configs
--   translation_mappings        — individual source→canonical rules, FK to v2 set
--   locale_preferences          — per-user server-persisted locale (en|es)
--   explanation_requests        — Explain This audit log; source text stored as HASH only
--
-- Data classification:
--   translation_mapping_sets_v2 / translation_mappings / locale_preferences → Class C
--   explanation_requests → Class B (operational audit)
--
-- HARD RULE: explanation_requests.source_text_hash is the ONLY representation of
-- the source text. There is no source_text column. Never add one.

-- ---------------------------------------------------------------------------
-- 0. Mark Domain 2.2 jsonb shell as deprecated
-- ---------------------------------------------------------------------------

comment on table public.translation_mapping_sets is
  'Deprecated by Domain 2.4. Replaced by translation_mapping_sets_v2 + translation_mappings. Do not write new data. Cleanup migration pending.';

-- ---------------------------------------------------------------------------
-- 1. Versioned translation mapping sets
-- ---------------------------------------------------------------------------

create table if not exists public.translation_mapping_sets_v2 (
  id                          uuid primary key default gen_random_uuid(),
  state_workflow_config_id    uuid references public.state_workflow_configs(id) on delete set null,
  state_code                  text not null check (state_code in ('IL', 'IN')),
  locale                      text not null default 'es' check (locale in ('en', 'es')),
  status                      text not null default 'draft'
    check (status in ('draft', 'active', 'deprecated')),
  version_number              integer not null default 1,
  display_name                text not null,
  published_at                timestamptz,
  deprecated_at               timestamptz,
  created_by                  uuid references auth.users(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

comment on table public.translation_mapping_sets_v2 is
  'Domain 2.4: Versioned translation mapping configurations per state+locale. Class C data.';

alter table public.translation_mapping_sets_v2 enable row level security;

create unique index if not exists translation_mapping_sets_v2_one_active
  on public.translation_mapping_sets_v2 (state_code, locale)
  where status = 'active';

create policy "tms_v2_admin"
  on public.translation_mapping_sets_v2
  for all
  using (public.is_admin());

create policy "tms_v2_authenticated_read"
  on public.translation_mapping_sets_v2
  for select
  using (status in ('active', 'deprecated') and auth.uid() is not null);

create policy "tms_v2_service_role"
  on public.translation_mapping_sets_v2
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 2. Individual translation mapping rules
-- ---------------------------------------------------------------------------

create table if not exists public.translation_mappings (
  id              uuid primary key default gen_random_uuid(),
  mapping_set_id  uuid not null references public.translation_mapping_sets_v2(id) on delete cascade,
  source_value    text not null,
  canonical_value text not null,
  field_context   text,                                  -- e.g. 'applicant_type', 'gender', 'expense_type'
  locale          text not null default 'es',
  transform_type  text,                                  -- 'exact_match' | 'contains' | 'regex'
  created_at      timestamptz not null default now(),
  unique (mapping_set_id, source_value, field_context)
);

comment on table public.translation_mappings is
  'Domain 2.4: Individual source-value → canonical-value translation rules. Class C data.';

alter table public.translation_mappings enable row level security;

create policy "tm_admin"
  on public.translation_mappings
  for all
  using (public.is_admin());

create policy "tm_authenticated_read"
  on public.translation_mappings
  for select
  using (auth.uid() is not null);

create policy "tm_service_role"
  on public.translation_mappings
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 3. Locale preferences (per user, server-side)
-- ---------------------------------------------------------------------------

create table if not exists public.locale_preferences (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade unique,
  locale      text not null default 'en' check (locale in ('en', 'es')),
  updated_at  timestamptz not null default now()
);

comment on table public.locale_preferences is
  'Domain 2.4: Per-user server-persisted locale preference. Class C data.';

alter table public.locale_preferences enable row level security;

create policy "locale_pref_own"
  on public.locale_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "locale_pref_service_role"
  on public.locale_preferences
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 4. Explanation request log (persistent audit, admin-readable)
-- ---------------------------------------------------------------------------
-- HARD RULE: source_text_hash is the ONLY representation of source text.
-- There is NO source_text column on this table. Never add one.

create table if not exists public.explanation_requests (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users(id) on delete set null,
  workflow_key        text not null,
  context_type        text not null,
  field_key           text,
  state_code          text,
  source_text_hash    text not null,                    -- HASH ONLY, never raw text
  source_text_length  integer not null,
  explanation_text    text,                             -- model output (BEHAVIOR_RULES prevent PII)
  disclaimer          text,
  model               text,
  status              text not null default 'pending'
    check (status in ('pending', 'completed', 'failed')),
  failure_reason      text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

comment on table public.explanation_requests is
  'Domain 2.4: Audit log for the Explain This feature. Class B data. Source text stored as hash only — never raw.';

comment on column public.explanation_requests.source_text_hash is
  'sha256 hex of the source text. The raw source text MUST NOT be persisted anywhere.';

alter table public.explanation_requests enable row level security;

-- Admin-only read. No SELECT for non-admin users.
create policy "explanation_requests_admin"
  on public.explanation_requests
  for all
  using (public.is_admin());

create policy "explanation_requests_service_role"
  on public.explanation_requests
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- 5. FK columns on intake tables (cross-domain wiring)
-- ---------------------------------------------------------------------------

alter table public.intake_sessions
  add column if not exists translation_mapping_set_id uuid
  references public.translation_mapping_sets_v2(id) on delete set null;

alter table public.intake_submissions
  add column if not exists translation_mapping_set_id uuid
  references public.translation_mapping_sets_v2(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------

create index if not exists tms_v2_state_locale_idx
  on public.translation_mapping_sets_v2 (state_code, locale, status);

create index if not exists tm_mapping_set_idx
  on public.translation_mappings (mapping_set_id, field_context);

create index if not exists explanation_requests_user_idx
  on public.explanation_requests (user_id, created_at desc);

create index if not exists explanation_requests_hash_idx
  on public.explanation_requests (source_text_hash);

-- ---------------------------------------------------------------------------
-- updated_at trigger on translation_mapping_sets_v2
-- ---------------------------------------------------------------------------

create trigger translation_mapping_sets_v2_updated_at
  before update on public.translation_mapping_sets_v2
  for each row execute function public.handle_updated_at();
