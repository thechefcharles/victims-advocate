-- ORG-1B: RBAC — org_membership_role enum, org_role_permissions, org_invitations,
-- org_staff_trainings, audit_log.target_user_id, org_memberships.supervised_by_user_id,
-- RLS on org_memberships per role.

-- ---------------------------------------------------------------------------
-- Enum + migrate org_memberships.org_role
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'org_membership_role') then
    create type public.org_membership_role as enum (
      'org_owner',
      'program_manager',
      'supervisor',
      'victim_advocate',
      'intake_specialist',
      'auditor'
    );
  end if;
end $$;

alter table public.org_memberships
  drop constraint if exists org_memberships_org_role_check;

update public.org_memberships
set org_role = 'org_owner'
where org_role = 'org_admin';

update public.org_memberships
set org_role = 'victim_advocate'
where org_role = 'staff';

alter table public.org_memberships
  alter column org_role drop default;

alter table public.org_memberships
  alter column org_role type public.org_membership_role
  using (org_role::text::public.org_membership_role);

alter table public.org_memberships
  alter column org_role set default 'victim_advocate'::public.org_membership_role;

alter table public.org_memberships
  add column if not exists supervised_by_user_id uuid references auth.users (id) on delete set null;

create index if not exists org_memberships_supervised_by_idx
  on public.org_memberships (supervised_by_user_id)
  where supervised_by_user_id is not null;

comment on column public.org_memberships.supervised_by_user_id is
  'Supervisor who oversees this member; used for ORG-1B membership RLS (supervisor sees own team).';

-- ---------------------------------------------------------------------------
-- org_invites: align org_role with enum
-- ---------------------------------------------------------------------------
alter table public.org_invites
  drop constraint if exists org_invites_org_role_check;

update public.org_invites
set org_role = 'org_owner'
where org_role = 'org_admin';

update public.org_invites
set org_role = 'victim_advocate'
where org_role = 'staff';

alter table public.org_invites
  alter column org_role type public.org_membership_role
  using (org_role::text::public.org_membership_role);

alter table public.org_invites
  alter column org_role set default 'victim_advocate'::public.org_membership_role;

-- ---------------------------------------------------------------------------
-- org_role_permissions
-- ---------------------------------------------------------------------------
create table if not exists public.org_role_permissions (
  role public.org_membership_role not null,
  resource text not null
    check (resource in ('cases', 'documents', 'team', 'profile', 'reports', 'messages')),
  action text not null
    check (action in ('view', 'create', 'edit', 'delete', 'export')),
  scope text not null
    check (scope in ('all', 'team', 'own', 'none')),
  primary key (role, resource, action)
);

comment on table public.org_role_permissions is 'ORG-1B: Normalized org RBAC matrix; evaluated in ORG-2A.';

-- Seed baseline (expand in ORG-2A)
insert into public.org_role_permissions (role, resource, action, scope) values
  -- org_owner
  ('org_owner', 'cases', 'view', 'all'),
  ('org_owner', 'cases', 'create', 'all'),
  ('org_owner', 'cases', 'edit', 'all'),
  ('org_owner', 'cases', 'delete', 'all'),
  ('org_owner', 'cases', 'export', 'all'),
  ('org_owner', 'documents', 'view', 'all'),
  ('org_owner', 'documents', 'create', 'all'),
  ('org_owner', 'documents', 'edit', 'all'),
  ('org_owner', 'documents', 'delete', 'all'),
  ('org_owner', 'documents', 'export', 'all'),
  ('org_owner', 'team', 'view', 'all'),
  ('org_owner', 'team', 'create', 'all'),
  ('org_owner', 'team', 'edit', 'all'),
  ('org_owner', 'team', 'delete', 'all'),
  ('org_owner', 'team', 'export', 'none'),
  ('org_owner', 'profile', 'view', 'all'),
  ('org_owner', 'profile', 'create', 'all'),
  ('org_owner', 'profile', 'edit', 'all'),
  ('org_owner', 'profile', 'delete', 'none'),
  ('org_owner', 'profile', 'export', 'all'),
  ('org_owner', 'reports', 'view', 'all'),
  ('org_owner', 'reports', 'create', 'all'),
  ('org_owner', 'reports', 'edit', 'all'),
  ('org_owner', 'reports', 'delete', 'none'),
  ('org_owner', 'reports', 'export', 'all'),
  ('org_owner', 'messages', 'view', 'all'),
  ('org_owner', 'messages', 'create', 'all'),
  ('org_owner', 'messages', 'edit', 'all'),
  ('org_owner', 'messages', 'delete', 'all'),
  ('org_owner', 'messages', 'export', 'none'),
  -- program_manager (same as owner except no delete team member — still edit for suspend in API layer)
  ('program_manager', 'cases', 'view', 'all'),
  ('program_manager', 'cases', 'create', 'all'),
  ('program_manager', 'cases', 'edit', 'all'),
  ('program_manager', 'cases', 'delete', 'none'),
  ('program_manager', 'cases', 'export', 'all'),
  ('program_manager', 'documents', 'view', 'all'),
  ('program_manager', 'documents', 'create', 'all'),
  ('program_manager', 'documents', 'edit', 'all'),
  ('program_manager', 'documents', 'delete', 'none'),
  ('program_manager', 'documents', 'export', 'all'),
  ('program_manager', 'team', 'view', 'all'),
  ('program_manager', 'team', 'create', 'all'),
  ('program_manager', 'team', 'edit', 'all'),
  ('program_manager', 'team', 'delete', 'none'),
  ('program_manager', 'profile', 'view', 'all'),
  ('program_manager', 'profile', 'create', 'none'),
  ('program_manager', 'profile', 'edit', 'all'),
  ('program_manager', 'reports', 'view', 'all'),
  ('program_manager', 'reports', 'export', 'all'),
  ('program_manager', 'messages', 'view', 'all'),
  ('program_manager', 'messages', 'create', 'all'),
  ('program_manager', 'messages', 'edit', 'all'),
  -- supervisor
  ('supervisor', 'cases', 'view', 'team'),
  ('supervisor', 'cases', 'create', 'team'),
  ('supervisor', 'cases', 'edit', 'team'),
  ('supervisor', 'documents', 'view', 'team'),
  ('supervisor', 'documents', 'create', 'team'),
  ('supervisor', 'documents', 'edit', 'team'),
  ('supervisor', 'team', 'view', 'team'),
  ('supervisor', 'profile', 'view', 'team'),
  ('supervisor', 'profile', 'edit', 'none'),
  ('supervisor', 'reports', 'view', 'team'),
  ('supervisor', 'messages', 'view', 'team'),
  ('supervisor', 'messages', 'create', 'team'),
  -- victim_advocate
  ('victim_advocate', 'cases', 'view', 'own'),
  ('victim_advocate', 'cases', 'create', 'own'),
  ('victim_advocate', 'cases', 'edit', 'own'),
  ('victim_advocate', 'documents', 'view', 'own'),
  ('victim_advocate', 'documents', 'create', 'own'),
  ('victim_advocate', 'documents', 'edit', 'own'),
  ('victim_advocate', 'profile', 'view', 'own'),
  ('victim_advocate', 'profile', 'edit', 'own'),
  ('victim_advocate', 'messages', 'view', 'own'),
  ('victim_advocate', 'messages', 'create', 'own'),
  -- intake_specialist
  ('intake_specialist', 'cases', 'view', 'own'),
  ('intake_specialist', 'cases', 'create', 'own'),
  ('intake_specialist', 'cases', 'edit', 'own'),
  ('intake_specialist', 'documents', 'view', 'own'),
  ('intake_specialist', 'documents', 'create', 'own'),
  ('intake_specialist', 'documents', 'edit', 'own'),
  ('intake_specialist', 'profile', 'view', 'own'),
  ('intake_specialist', 'messages', 'view', 'own'),
  ('intake_specialist', 'messages', 'create', 'own'),
  -- auditor
  ('auditor', 'reports', 'view', 'all'),
  ('auditor', 'reports', 'export', 'all')
on conflict (role, resource, action) do nothing;

alter table public.org_role_permissions enable row level security;

create policy "org_role_permissions select authenticated"
  on public.org_role_permissions for select
  to authenticated
  using (true);

create policy "org_role_permissions admin write"
  on public.org_role_permissions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- org_invitations (new flow; parallel to legacy org_invites)
-- ---------------------------------------------------------------------------
create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_membership_role not null,
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid references auth.users (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked'))
);

create index if not exists org_invitations_org_created_idx
  on public.org_invitations (organization_id, created_at desc);
create index if not exists org_invitations_email_idx
  on public.org_invitations (email);
create unique index if not exists org_invitations_token_hash_unique
  on public.org_invitations (token_hash);

comment on table public.org_invitations is 'ORG-1B: Role-based invitations (ORG-4 accept flow).';

alter table public.org_invitations enable row level security;

create policy "org_invitations select org management or admin"
  on public.org_invitations for select
  using (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_invitations.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role,
            'supervisor'::public.org_membership_role
          )
      )
    )
  );

create policy "org_invitations insert org management or admin"
  on public.org_invitations for insert
  with check (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_invitations.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  );

create policy "org_invitations update org management or admin"
  on public.org_invitations for update
  using (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_invitations.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  )
  with check (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_invitations.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- audit_log: target user for membership / role events
-- ---------------------------------------------------------------------------
alter table public.audit_log
  add column if not exists target_user_id uuid;

comment on column public.audit_log.target_user_id is 'User affected by the action (e.g. role change, invite, suspend).';

create index if not exists audit_log_target_user_id_created_at_idx
  on public.audit_log (target_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- org_staff_trainings
-- ---------------------------------------------------------------------------
create table if not exists public.org_staff_trainings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  training_key text not null,
  training_name text not null,
  completed_at date,
  certificate_url text,
  verified boolean not null default false
);

create index if not exists org_staff_trainings_org_user_idx
  on public.org_staff_trainings (organization_id, user_id);
create index if not exists org_staff_trainings_training_key_idx
  on public.org_staff_trainings (organization_id, training_key);

comment on table public.org_staff_trainings is 'ORG-1B: Staff training records for advocate competency inputs.';

alter table public.org_staff_trainings enable row level security;

create policy "org_staff_trainings select self or org leadership or admin"
  on public.org_staff_trainings for select
  using (
    public.is_admin()
    or user_id = auth.uid()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_staff_trainings.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role,
            'supervisor'::public.org_membership_role
          )
      )
    )
  );

create policy "org_staff_trainings insert leadership or admin"
  on public.org_staff_trainings for insert
  with check (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_staff_trainings.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  );

create policy "org_staff_trainings update leadership or admin"
  on public.org_staff_trainings for update
  using (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_staff_trainings.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  )
  with check (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_staff_trainings.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  );

create policy "org_staff_trainings delete leadership or admin"
  on public.org_staff_trainings for delete
  using (
    public.is_admin()
    or (
      organization_id = public.current_org_id()
      and exists (
        select 1 from public.org_memberships m
        where m.user_id = auth.uid()
          and m.organization_id = org_staff_trainings.organization_id
          and m.status = 'active'
          and m.org_role in (
            'org_owner'::public.org_membership_role,
            'program_manager'::public.org_membership_role
          )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- org_memberships RLS (replace role-based select; keep admin + management DML)
-- ---------------------------------------------------------------------------
drop policy if exists "User can view own membership" on public.org_memberships;
drop policy if exists "Org admin and supervisor can view org members" on public.org_memberships;
drop policy if exists "Org admin can manage memberships in own org" on public.org_memberships;

create policy "org_memberships select own row"
  on public.org_memberships for select
  using (user_id = auth.uid());

create policy "org_memberships select owner pm full org"
  on public.org_memberships for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.organization_id = org_memberships.organization_id
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role
        )
    )
  );

create policy "org_memberships select supervisor team"
  on public.org_memberships for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.org_role = 'supervisor'::public.org_membership_role
        and m.organization_id = org_memberships.organization_id
        and (
          org_memberships.user_id = auth.uid()
          or org_memberships.supervised_by_user_id = auth.uid()
        )
    )
  );

create policy "org_memberships manage owner pm in org"
  on public.org_memberships for all
  using (
    exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.organization_id = org_memberships.organization_id
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role
        )
    )
  )
  with check (
    exists (
      select 1 from public.org_memberships m
      where m.user_id = auth.uid()
        and m.status = 'active'
        and m.organization_id = org_memberships.organization_id
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role
        )
    )
  );

-- ---------------------------------------------------------------------------
-- org_invites RLS: replace legacy org_admin/supervisor text checks
-- ---------------------------------------------------------------------------
drop policy if exists "Org admin and supervisor can view invites" on public.org_invites;
drop policy if exists "Org admin can manage invites" on public.org_invites;

create policy "Org leadership can view invites"
  on public.org_invites for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_invites.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role,
          'supervisor'::public.org_membership_role
        )
    )
  );

create policy "Org management can manage invites"
  on public.org_invites for all
  using (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_invites.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role
        )
    )
  )
  with check (
    exists (
      select 1 from public.org_memberships m
      where m.organization_id = org_invites.organization_id
        and m.user_id = auth.uid()
        and m.status = 'active'
        and m.org_role in (
          'org_owner'::public.org_membership_role,
          'program_manager'::public.org_membership_role
        )
    )
  );
