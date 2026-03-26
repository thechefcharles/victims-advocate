-- Phase 1: Organization lifecycle vs operational status vs public visibility.
-- organizations.status stays operational (active | suspended | archived) — unchanged.

alter table public.organizations
  add column if not exists lifecycle_status text not null default 'seeded'
    check (lifecycle_status in ('seeded', 'managed', 'archived')),
  add column if not exists public_profile_status text not null default 'draft'
    check (public_profile_status in ('draft', 'pending_review', 'active', 'paused'));

comment on column public.organizations.lifecycle_status is
  'Phase 1 lifecycle: seeded (no confirmed org_owner) | managed (has active org_owner) | archived. '
  'Product “organization managed” — distinct from organizations.status (operational).';

comment on column public.organizations.public_profile_status is
  'Phase 1 public/discovery: draft | pending_review | active (eligible for discovery when wired) | paused. '
  'Distinct from profile_status (org profile workflow).';

create index if not exists organizations_lifecycle_status_idx
  on public.organizations (lifecycle_status);

create index if not exists organizations_public_profile_status_idx
  on public.organizations (public_profile_status);

-- One-time alignment: rows that already have an active org_owner match “managed” (deterministic; mirrors app sync).
update public.organizations o
set lifecycle_status = 'managed'
where o.lifecycle_status = 'seeded'
  and exists (
    select 1 from public.org_memberships m
    where m.organization_id = o.id
      and m.status = 'active'
      and m.org_role = 'org_owner'
  );
