-- Victim account personal information (no SSN). JSON for flexible optional fields.
alter table public.profiles
  add column if not exists personal_info jsonb not null default '{}'::jsonb;

comment on column public.profiles.personal_info is
  'Optional victim profile: name, contact, demographics, language, education — editable by user; visible to assigned advocates/orgs with case access.';
