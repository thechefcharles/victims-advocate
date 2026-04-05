-- User-initiated account/data deletion (User Data Deletion Policy v2.0).

alter table public.profiles
  add column if not exists deletion_requested boolean not null default false,
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_type text,
  add column if not exists deletion_request_ip inet;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_deletion_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_deletion_type_check
      check (deletion_type is null or deletion_type in ('standard', 'safety'));
  end if;
end $$;

comment on column public.profiles.deletion_requested is 'User submitted in-app deletion request; ops queue processes full data deletion.';
comment on column public.profiles.deletion_type is 'standard (30-day process) or safety (immediate access revocation).';

create table if not exists public.account_deletion_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deletion_type text not null check (deletion_type in ('standard', 'safety')),
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  request_ip inet,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists account_deletion_queue_user_created_idx
  on public.account_deletion_queue (user_id, created_at desc);

create index if not exists account_deletion_queue_status_idx
  on public.account_deletion_queue (status, priority desc, created_at asc);

comment on table public.account_deletion_queue is 'Append-only style queue for engineering deletion execution (see internal runbook).';

alter table public.account_deletion_queue enable row level security;
