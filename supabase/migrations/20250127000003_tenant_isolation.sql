-- Phase 3: Tenant isolation - add organization_id to cases, documents, case_access

-- 0) Ensure base tables exist (CREATE IF NOT EXISTS for fresh DBs; no-op if already exist)
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'ready_for_review', 'submitted', 'closed')),
  state_code text not null default 'IL' check (state_code in ('IL', 'IN')),
  name text,
  application jsonb not null default '{}'::jsonb
);
create index if not exists cases_owner_created_idx on public.cases (owner_user_id, created_at desc);
create index if not exists cases_status_idx on public.cases (status);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid references public.cases(id) on delete cascade,
  uploaded_by_user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null default 'other',
  description text,
  file_name text not null,
  file_size bigint,
  mime_type text,
  storage_path text not null
);
create index if not exists documents_case_idx on public.documents (case_id) where case_id is not null;
create index if not exists documents_uploaded_by_idx on public.documents (uploaded_by_user_id);

create table if not exists public.case_access (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'advocate')),
  can_view boolean not null default true,
  can_edit boolean not null default false,
  unique(case_id, user_id)
);
create index if not exists case_access_user_idx on public.case_access (user_id);
create index if not exists case_access_case_idx on public.case_access (case_id);

-- 1) Add nullable organization_id to each table
alter table public.cases
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.documents
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

alter table public.case_access
  add column if not exists organization_id uuid references public.organizations(id) on delete restrict;

-- 2) Legacy org for pre-tenant rows (owners with no membership)
insert into public.organizations (name, type, status)
select 'Legacy (pre-tenant)', 'other', 'active'
where not exists (
  select 1 from public.organizations where name = 'Legacy (pre-tenant)'
);

-- Get legacy org id (assume name is unique or we take first match)
do $$
declare
  legacy_org_id uuid;
begin
  select id into legacy_org_id
  from public.organizations
  where name = 'Legacy (pre-tenant)'
  limit 1;

  -- Backfill cases: owner's org from org_memberships, else legacy
  update public.cases c
  set organization_id = coalesce(
    (select m.organization_id
     from public.org_memberships m
     where m.user_id = c.owner_user_id and m.status = 'active'
     limit 1),
    legacy_org_id
  )
  where c.organization_id is null;

  -- Backfill documents: from parent case first, then uploader's org, else legacy
  update public.documents d
  set organization_id = coalesce(
    (select c.organization_id from public.cases c where c.id = d.case_id limit 1),
    (select m.organization_id
     from public.org_memberships m
     where m.user_id = d.uploaded_by_user_id and m.status = 'active'
     limit 1),
    legacy_org_id
  )
  where d.organization_id is null;

  -- Backfill case_access from case
  update public.case_access ca
  set organization_id = (select c.organization_id from public.cases c where c.id = ca.case_id limit 1)
  where ca.organization_id is null;
end $$;

-- 3) Enforce NOT NULL (drop default ref first if added as with FK)
alter table public.cases
  alter column organization_id set not null;

alter table public.documents
  alter column organization_id set not null;

alter table public.case_access
  alter column organization_id set not null;

-- 4) Indexes
create index if not exists cases_organization_created_idx
  on public.cases (organization_id, created_at desc);

create index if not exists documents_organization_case_created_idx
  on public.documents (organization_id, case_id, created_at desc);

create index if not exists case_access_organization_case_user_idx
  on public.case_access (organization_id, case_id, user_id);

-- 5) RLS helper functions
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.org_memberships
  where user_id = auth.uid() and status = 'active'
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  );
$$;

-- 6) RLS: cases
alter table public.cases enable row level security;

drop policy if exists "Cases org or admin select" on public.cases;
create policy "Cases org or admin select"
  on public.cases for select
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Cases org or admin insert" on public.cases;
create policy "Cases org or admin insert"
  on public.cases for insert
  with check (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Cases org or admin update" on public.cases;
create policy "Cases org or admin update"
  on public.cases for update
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Cases org or admin delete" on public.cases;
create policy "Cases org or admin delete"
  on public.cases for delete
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

-- 7) RLS: documents
alter table public.documents enable row level security;

drop policy if exists "Documents org or admin select" on public.documents;
create policy "Documents org or admin select"
  on public.documents for select
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Documents org or admin insert" on public.documents;
create policy "Documents org or admin insert"
  on public.documents for insert
  with check (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Documents org or admin update" on public.documents;
create policy "Documents org or admin update"
  on public.documents for update
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Documents org or admin delete" on public.documents;
create policy "Documents org or admin delete"
  on public.documents for delete
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

-- 8) RLS: case_access
alter table public.case_access enable row level security;

drop policy if exists "Case access org or admin select" on public.case_access;
create policy "Case access org or admin select"
  on public.case_access for select
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Case access org or admin insert" on public.case_access;
create policy "Case access org or admin insert"
  on public.case_access for insert
  with check (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Case access org or admin update" on public.case_access;
create policy "Case access org or admin update"
  on public.case_access for update
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );

drop policy if exists "Case access org or admin delete" on public.case_access;
create policy "Case access org or admin delete"
  on public.case_access for delete
  using (
    organization_id = public.current_org_id() or public.is_admin()
  );
