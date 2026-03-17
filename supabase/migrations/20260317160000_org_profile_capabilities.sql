-- Phase A: Organization profile & capability model foundation

alter table public.organizations
  add column if not exists service_types text[] not null default '{}',
  add column if not exists languages text[] not null default '{}',
  add column if not exists coverage_area jsonb not null default '{}'::jsonb,
  add column if not exists intake_methods text[] not null default '{}',
  add column if not exists hours jsonb not null default '{}'::jsonb,
  add column if not exists accepting_clients boolean not null default false,
  add column if not exists capacity_status text not null default 'unknown'
    check (capacity_status in ('open', 'limited', 'waitlist', 'closed', 'unknown')),
  add column if not exists avg_response_time_hours integer,
  add column if not exists special_populations text[] not null default '{}',
  add column if not exists accessibility_features text[] not null default '{}',
  add column if not exists profile_status text not null default 'draft'
    check (profile_status in ('draft', 'active', 'archived')),
  add column if not exists profile_last_updated_at timestamptz;

create index if not exists organizations_profile_status_idx on public.organizations (profile_status);
create index if not exists organizations_accepting_clients_idx on public.organizations (accepting_clients);
create index if not exists organizations_capacity_status_idx on public.organizations (capacity_status);
