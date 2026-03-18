-- Phase B: Persisted organization matching results per case run

create table if not exists public.organization_match_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  scope_organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_name text not null,
  organization_profile_snapshot jsonb not null default '{}'::jsonb,
  match_input_snapshot jsonb not null default '{}'::jsonb,
  match_score numeric not null,
  match_tier text not null,
  strong_match boolean not null default false,
  possible_match boolean not null default false,
  limited_match boolean not null default false,
  reasons jsonb not null default '[]'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  run_group_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null
);

comment on table public.organization_match_runs is 'Phase B: Per-org rows for each case matching run; same run_group_id = one evaluation.';

create index if not exists organization_match_runs_case_created_idx
  on public.organization_match_runs (case_id, created_at desc);
create index if not exists organization_match_runs_run_group_idx
  on public.organization_match_runs (run_group_id);
create index if not exists organization_match_runs_scope_idx
  on public.organization_match_runs (scope_organization_id, created_at desc);

alter table public.organization_match_runs enable row level security;

create policy "Service role full access organization_match_runs"
  on public.organization_match_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
