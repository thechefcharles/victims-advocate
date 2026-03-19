-- Illinois Crime Victim Assistance Services directory line # (see lib/catalog/programs.tsv)

alter table public.profiles
  add column if not exists affiliated_catalog_entry_id integer;

comment on column public.profiles.affiliated_catalog_entry_id is
  'Victim advocate / staff: selected program directory id (#) for their affiliated agency (public/data/il-victim-assistance-programs.json).';

alter table public.organizations
  add column if not exists catalog_entry_id integer;

comment on column public.organizations.catalog_entry_id is
  'If registered from the IL victim assistance directory, the PDF line # / catalog id.';

create index if not exists organizations_catalog_entry_id_idx
  on public.organizations (catalog_entry_id)
  where catalog_entry_id is not null;
