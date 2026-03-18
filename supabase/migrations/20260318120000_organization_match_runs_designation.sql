-- Phase F: Designation context on match runs (audit + UI)

alter table public.organization_match_runs
  add column if not exists fit_match_score numeric,
  add column if not exists designation_tier text,
  add column if not exists designation_confidence text,
  add column if not exists designation_summary text,
  add column if not exists designation_influenced_match boolean not null default false,
  add column if not exists designation_reason text,
  add column if not exists designation_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists designation_applied boolean not null default false;

comment on column public.organization_match_runs.fit_match_score is 'Phase B fit score before designation boost.';
comment on column public.organization_match_runs.designation_snapshot is 'Per-result designation audit payload (tier, boost, policy version).';
