-- Demo organization for product walkthroughs (idempotent).
-- Map pin uses metadata.public_lat / public_lng (approx. geocode for 1318 Circle Ave, Forest Park, IL 60130).

insert into public.organizations (
  name,
  type,
  status,
  catalog_entry_id,
  metadata,
  service_types,
  languages,
  coverage_area,
  intake_methods,
  hours,
  accepting_clients,
  capacity_status,
  avg_response_time_hours,
  special_populations,
  accessibility_features,
  profile_status,
  profile_last_updated_at,
  lifecycle_status,
  public_profile_status,
  profile_stage
)
select
  'Nxt Stps',
  'nonprofit',
  'active',
  225,
  jsonb_build_object(
    'demo_org', 'nxtstps_platform_demo',
    'public_lat', 41.8738,
    'public_lng', -87.8145,
    'listing_address', '1318 Circle Ave, Forest Park, IL 60130',
    'listing_phone', '708-738-9919',
    'listing_website', 'https://www.nxtstps.org'
  ),
  array['case_management', 'therapy', 'legal_aid']::text[],
  array['en']::text[],
  jsonb_build_object('states', array['IL']::text[]),
  array['phone', 'walk_in', 'online_form']::text[],
  jsonb_build_object('summary', 'Call for hours and intake availability.'),
  true,
  'open',
  24,
  array['domestic_violence']::text[],
  array['virtual_services', 'interpreters']::text[],
  'active',
  now(),
  'seeded',
  'draft',
  'enriched'
where not exists (
  select 1
  from public.organizations o
  where o.metadata->>'demo_org' = 'nxtstps_platform_demo'
);
