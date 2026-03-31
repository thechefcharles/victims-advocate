-- Victim connect request: what the victim needs help with (for org triage / assignment).

alter table public.victim_org_connect_requests
  add column if not exists help_needs text[] not null default '{}'::text[];

comment on column public.victim_org_connect_requests.help_needs is
  'Stable keys: general_support, police_report, medical_bills, employment, funeral (multi-select).';
