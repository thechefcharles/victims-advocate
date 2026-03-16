-- Phase 11: Program definitions and routing runs for intake-to-program routing engine.

create table if not exists public.program_definitions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,

  program_key text not null,
  name text not null,
  description text,
  state_code text,
  scope_type text not null check (scope_type in ('state', 'federal', 'local', 'general')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  is_active boolean not null default false,
  version text not null,

  rule_set jsonb not null default '{}'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  deadline_metadata jsonb not null default '{}'::jsonb,
  dependency_rules jsonb not null default '{}'::jsonb,
  stacking_rules jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.program_definitions is 'Phase 11: Routable program definitions with rule_set and requirements.';

create unique index if not exists program_definitions_program_key_key on public.program_definitions (program_key) where (is_active = true);
create index if not exists program_definitions_state_active_idx on public.program_definitions (state_code, is_active) where is_active = true;
create index if not exists program_definitions_status_active_idx on public.program_definitions (status, is_active);

alter table public.program_definitions enable row level security;

create policy "Service role full access program_definitions"
  on public.program_definitions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- routing_runs: one row per run per case
create table if not exists public.routing_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid,
  intake_version text,
  knowledge_version_summary jsonb not null default '{}'::jsonb,
  engine_version text not null,
  status text not null default 'completed' check (status in ('completed', 'errored')),
  result jsonb not null default '{}'::jsonb
);

comment on table public.routing_runs is 'Phase 11: Per-case routing run history; result holds program results.';

create index if not exists routing_runs_case_created_idx on public.routing_runs (case_id, created_at desc);
create index if not exists routing_runs_org_created_idx on public.routing_runs (organization_id, created_at desc);

alter table public.routing_runs enable row level security;

create policy "Service role full access routing_runs"
  on public.routing_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
