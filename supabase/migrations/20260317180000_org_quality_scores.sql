-- Phase C: Internal organization quality scores (versioned, not public)

create table if not exists public.org_quality_scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  computed_at timestamptz not null default now(),
  score_version text not null,
  overall_score numeric not null,
  score_confidence text not null check (score_confidence in ('low', 'medium', 'high')),
  category_scores jsonb not null default '{}'::jsonb,
  inputs_summary jsonb not null default '{}'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  status text not null default 'current' check (status in ('current', 'superseded', 'draft')),
  computed_by uuid references auth.users(id) on delete set null
);

comment on table public.org_quality_scores is 'Phase C: Internal-only CBO quality scores; superseded rows retained for history.';

create index if not exists org_quality_scores_org_computed_idx
  on public.org_quality_scores (organization_id, computed_at desc);
create index if not exists org_quality_scores_status_computed_idx
  on public.org_quality_scores (status, computed_at desc);

create unique index if not exists org_quality_scores_one_current_per_org
  on public.org_quality_scores (organization_id)
  where (status = 'current');

alter table public.org_quality_scores enable row level security;

create policy "Service role full access org_quality_scores"
  on public.org_quality_scores for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
