-- Victim-owned cases may have no organization until the victim connects with one via Find organizations.

alter table public.cases
  alter column organization_id drop not null;

alter table public.case_access
  alter column organization_id drop not null;

alter table public.documents
  alter column organization_id drop not null;

alter table public.case_timeline_events
  alter column organization_id drop not null;
