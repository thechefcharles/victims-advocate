-- Phase 2: Organizations, memberships, invites (multi-tenant v1)

-- organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  type text not null check (type in ('nonprofit', 'hospital', 'gov', 'other')),
  status text not null default 'active' check (status in ('active', 'suspended', 'archived')),
  created_by uuid,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists organizations_status_idx on public.organizations (status);
create index if not exists organizations_created_at_idx on public.organizations (created_at desc);

-- org_memberships (created before org RLS policies that reference it) (v1: one org per user)
create table if not exists public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  org_role text not null default 'staff' check (org_role in ('staff', 'supervisor', 'org_admin')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid
);

create index if not exists org_memberships_org_role_idx on public.org_memberships (organization_id, org_role);
create index if not exists org_memberships_user_id_idx on public.org_memberships (user_id);
create index if not exists org_memberships_created_at_idx on public.org_memberships (created_at desc);

alter table public.org_memberships enable row level security;

create policy "User can view own membership"
  on public.org_memberships for select
  using (user_id = auth.uid());

create policy "Org admin and supervisor can view org members"
  on public.org_memberships for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_memberships.organization_id
        and m.user_id = auth.uid()
        and m.org_role in ('org_admin', 'supervisor')
        and m.status = 'active'
    )
  );

create policy "Admin can manage all memberships"
  on public.org_memberships for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Org admin can manage memberships in own org"
  on public.org_memberships for all
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_memberships.organization_id
        and m.user_id = auth.uid()
        and m.org_role = 'org_admin'
        and m.status = 'active'
    )
  );

-- org_invites
create table if not exists public.org_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  org_role text not null default 'staff' check (org_role in ('staff', 'supervisor', 'org_admin')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid,
  created_by uuid,
  revoked_at timestamptz,
  revoked_by uuid
);

create index if not exists org_invites_org_created_idx on public.org_invites (organization_id, created_at desc);
create index if not exists org_invites_email_idx on public.org_invites (email);
create index if not exists org_invites_expires_at_idx on public.org_invites (expires_at);

alter table public.org_invites enable row level security;

create policy "Org admin and supervisor can view invites"
  on public.org_invites for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_invites.organization_id
        and m.user_id = auth.uid()
        and m.org_role in ('org_admin', 'supervisor')
        and m.status = 'active'
    )
  );

create policy "Admin can manage invites"
  on public.org_invites for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Org admin can manage invites"
  on public.org_invites for all
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_invites.organization_id
        and m.user_id = auth.uid()
        and m.org_role = 'org_admin'
        and m.status = 'active'
    )
  );

-- Organizations RLS (after org_memberships exists)
alter table public.organizations enable row level security;

create policy "Admin can manage organizations"
  on public.organizations for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Org members can view own org"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = organizations.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );
