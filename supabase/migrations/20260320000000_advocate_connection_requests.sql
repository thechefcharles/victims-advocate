-- Advocate connection requests: victims request to connect with advocates; advocates accept/decline.

create table if not exists public.advocate_connection_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  victim_user_id uuid not null references auth.users(id) on delete cascade,
  advocate_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  unique(victim_user_id, advocate_user_id)
);

create index if not exists advocate_connection_requests_advocate_status_idx
  on public.advocate_connection_requests (advocate_user_id, status);
create index if not exists advocate_connection_requests_victim_idx
  on public.advocate_connection_requests (victim_user_id);

alter table public.advocate_connection_requests enable row level security;

-- Only service role for now (APIs use server-side auth)
drop policy if exists "Service role all advocate_connection_requests" on public.advocate_connection_requests;
create policy "Service role all advocate_connection_requests"
  on public.advocate_connection_requests for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

comment on table public.advocate_connection_requests is 'Victim requests to connect with advocate; advocate accepts/declines.';
