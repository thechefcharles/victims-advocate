-- Phase 10: Structured, versioned knowledge base for eligibility, documents, timeline, rights, definitions.

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,

  entry_key text not null,
  title text not null,
  body text not null,

  category text not null check (category in (
    'eligibility', 'documents', 'timeline', 'rights', 'definitions', 'faq', 'program_overview'
  )),
  state_code text,
  program_key text,
  audience_role text,
  workflow_key text,

  version text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_active boolean not null default false,
  effective_at timestamptz,

  structured_data jsonb not null default '{}'::jsonb,
  tags text[],
  source_label text,
  source_url text,
  last_reviewed_at timestamptz
);

comment on table public.knowledge_entries is 'Phase 10: Versioned knowledge base entries for programs, eligibility, documents, timeline.';

create index if not exists knowledge_entries_entry_key_version_idx
  on public.knowledge_entries (entry_key, version);

create index if not exists knowledge_entries_category_active_idx
  on public.knowledge_entries (category, is_active) where is_active = true;

create index if not exists knowledge_entries_state_program_active_idx
  on public.knowledge_entries (state_code, program_key, is_active) where is_active = true;

create index if not exists knowledge_entries_workflow_active_idx
  on public.knowledge_entries (workflow_key, is_active) where is_active = true;

create unique index if not exists knowledge_entries_one_active_per_key
  on public.knowledge_entries (entry_key) where (is_active = true);

create index if not exists knowledge_entries_tags_gin_idx
  on public.knowledge_entries using gin (tags) where (tags is not null and array_length(tags, 1) > 0);

alter table public.knowledge_entries enable row level security;

create policy "Service role full access knowledge_entries"
  on public.knowledge_entries for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
