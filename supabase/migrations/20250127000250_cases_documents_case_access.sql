-- Phase 2.5: Base cases, documents, case_access (ensures tables exist for tenant_isolation)
-- Uses unique timestamp to avoid version conflict with 20250127000002_organizations.
-- CREATE TABLE IF NOT EXISTS is safe: skips when tables already exist.

-- cases
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

-- documents
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

-- case_access
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

comment on table public.cases is 'Compensation application cases';
comment on table public.documents is 'Case documents';
comment on table public.case_access is 'User access to cases';
