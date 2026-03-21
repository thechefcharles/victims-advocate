-- Case-scoped advocate connection requests: same victim+advocate can have one global row
-- (case_id null, legacy) and/or one row per case (case_id set).

alter table public.advocate_connection_requests
  add column if not exists case_id uuid references public.cases(id) on delete cascade;

comment on column public.advocate_connection_requests.case_id is
  'When set, accepting the request grants advocate case_access on this case. Null = global relationship only.';

-- Replace single unique(victim, advocate) with partial uniques
alter table public.advocate_connection_requests
  drop constraint if exists advocate_connection_requests_victim_user_id_advocate_user_id_key;

create unique index if not exists advocate_connection_requests_victim_advocate_case_unique
  on public.advocate_connection_requests (victim_user_id, advocate_user_id, case_id)
  where case_id is not null;

create unique index if not exists advocate_connection_requests_victim_advocate_global_unique
  on public.advocate_connection_requests (victim_user_id, advocate_user_id)
  where case_id is null;

create index if not exists advocate_connection_requests_case_idx
  on public.advocate_connection_requests (case_id)
  where case_id is not null;
