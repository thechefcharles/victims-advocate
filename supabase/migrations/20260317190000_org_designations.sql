-- Phase D: Public-safe organization designation (derived from internal grading)

create table if not exists public.org_designations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  grading_run_id uuid references public.org_quality_scores(id) on delete set null,
  designation_version text not null,
  designation_tier text not null
    check (designation_tier in ('comprehensive', 'established', 'foundational', 'insufficient_data')),
  designation_confidence text not null
    check (designation_confidence in ('low', 'medium', 'high')),
  is_current boolean not null default true,
  public_summary text,
  category_snapshot jsonb not null default '{}'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  computed_by uuid references auth.users(id) on delete set null
);

comment on table public.org_designations is 'Phase D: Designation tier per org; historical rows retained.';

create index if not exists org_designations_org_created_idx
  on public.org_designations (organization_id, created_at desc);

create unique index if not exists org_designations_one_current_per_org
  on public.org_designations (organization_id)
  where (is_current = true);

alter table public.org_designations enable row level security;

create policy "Service role full access org_designations"
  on public.org_designations for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
