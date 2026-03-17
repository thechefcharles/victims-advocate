-- Phase 12: Document completeness & validation engine – persist completeness evaluations per case.

create table if not exists public.completeness_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  actor_user_id uuid,
  routing_run_id uuid references public.routing_runs(id) on delete set null,
  engine_version text not null,
  status text not null default 'completed' check (status in ('completed', 'errored')),
  result jsonb not null default '{}'::jsonb
);

comment on table public.completeness_runs is 'Phase 12: Per-case completeness/readiness evaluation history.';

create index if not exists completeness_runs_case_created_idx on public.completeness_runs (case_id, created_at desc);
create index if not exists completeness_runs_org_created_idx on public.completeness_runs (organization_id, created_at desc);

alter table public.completeness_runs enable row level security;

create policy "Service role full access completeness_runs"
  on public.completeness_runs for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
