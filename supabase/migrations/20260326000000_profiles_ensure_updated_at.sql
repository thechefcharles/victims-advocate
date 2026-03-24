-- Some environments created profiles without updated_at; PostgREST rejects updates that reference it.
alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

comment on column public.profiles.updated_at is 'Last update time for profile row (e.g. personal_info, role sync).';
