-- Phase 4: lightweight flags for org-initiated sensitive profile edits (admin visibility).

create table if not exists public.organization_profile_flags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  flag_type text not null default 'sensitive_change'
    check (flag_type in ('sensitive_change')),
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists organization_profile_flags_org_created_idx
  on public.organization_profile_flags (organization_id, created_at desc);

create index if not exists organization_profile_flags_org_unresolved_idx
  on public.organization_profile_flags (organization_id)
  where resolved = false;

alter table public.organization_profile_flags enable row level security;

comment on table public.organization_profile_flags is
  'Non-blocking markers for org-led sensitive profile changes; audit_log remains source of truth.';
