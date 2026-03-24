-- Advocate requests to join an organization (approval by org admin/supervisor)

create table if not exists public.advocate_org_join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  advocate_user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists advocate_org_join_requests_org_created_idx
  on public.advocate_org_join_requests (organization_id, created_at desc);

create index if not exists advocate_org_join_requests_advocate_created_idx
  on public.advocate_org_join_requests (advocate_user_id, created_at desc);

-- One pending request at a time per advocate (v1)
create unique index if not exists advocate_org_join_one_pending_per_advocate
  on public.advocate_org_join_requests (advocate_user_id)
  where status = 'pending';

alter table public.advocate_org_join_requests enable row level security;
