-- Domain 0.2: Add account_type column to profiles.
-- Coexists with legacy role column — both remain valid during migration.
-- account_type is the 2.0 canonical persona; role is legacy and read-only going forward.

alter table public.profiles
  add column if not exists account_type text
  check (account_type in ('applicant', 'provider', 'agency', 'platform_admin'));

update public.profiles set account_type = case
  when is_admin = true then 'platform_admin'
  when role = 'victim' then 'applicant'
  when role in ('advocate', 'organization') then 'provider'
  else 'applicant'
end where account_type is null;

alter table public.profiles alter column account_type set not null;

create index if not exists profiles_account_type_idx on public.profiles (account_type);

comment on column public.profiles.account_type is
  '2.0 AccountType: applicant | provider | agency | platform_admin. Coexists with legacy role.';
