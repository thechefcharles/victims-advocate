-- Prevent duplicate organizations per directory entry (one NxtStps org per catalog program)
-- Handle existing duplicates by keeping one and nulling catalog_entry_id on others (if any)
do $$
declare
  r record;
  first_id uuid;
begin
  for r in (
    select catalog_entry_id, array_agg(id order by created_at) as ids
    from public.organizations
    where catalog_entry_id is not null
    group by catalog_entry_id
    having count(*) > 1
  )
  loop
    first_id := r.ids[1];
    update public.organizations
    set catalog_entry_id = null, metadata = metadata || jsonb_build_object('catalog_entry_id_duplicate_of', first_id::text)
    where id = any(r.ids) and id != first_id;
  end loop;
end $$;

create unique index if not exists organizations_catalog_entry_id_unique
  on public.organizations (catalog_entry_id)
  where catalog_entry_id is not null;

-- Org reps (role organization) request to join an existing org when catalog entry already has one
create table if not exists public.org_rep_join_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'cancelled')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

create index if not exists org_rep_join_requests_org_created_idx
  on public.org_rep_join_requests (organization_id, created_at desc);

create index if not exists org_rep_join_requests_user_created_idx
  on public.org_rep_join_requests (user_id, created_at desc);

create unique index if not exists org_rep_join_one_pending_per_user
  on public.org_rep_join_requests (user_id)
  where status = 'pending';

alter table public.org_rep_join_requests enable row level security;

-- Pending organization proposals: new orgs not in directory, awaiting admin approval
create table if not exists public.pending_organization_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  created_by uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,

  name text not null,
  type text not null check (type in ('nonprofit', 'hospital', 'gov', 'other')),
  address text not null default '',
  phone text not null default '',
  website text,
  program_type text,
  notes text
);

create index if not exists pending_organization_proposals_status_created_idx
  on public.pending_organization_proposals (status, created_at desc);

create index if not exists pending_organization_proposals_created_by_idx
  on public.pending_organization_proposals (created_by);

alter table public.pending_organization_proposals enable row level security;
