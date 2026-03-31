-- Onboarding “Find my organization” uses public/data/il-victim-assistance-programs.json (id 225).
-- Link existing demo rows created before catalog_entry_id was added to the seed insert.
--
-- If another org already holds 225 (e.g. duplicate registration), clear it so the demo row can claim it.

update public.organizations
set catalog_entry_id = null
where catalog_entry_id = 225
  and coalesce(metadata->>'demo_org', '') <> 'nxtstps_platform_demo';

update public.organizations
set catalog_entry_id = 225
where metadata->>'demo_org' = 'nxtstps_platform_demo'
  and (catalog_entry_id is distinct from 225);
