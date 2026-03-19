-- Allow organization as a primary account type (agency / org admin signup path)

alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('victim', 'advocate', 'organization'));

comment on column public.profiles.role is 'victim | advocate | organization (org representative signup)';
