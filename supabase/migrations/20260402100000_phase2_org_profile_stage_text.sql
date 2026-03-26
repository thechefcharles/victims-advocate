-- Phase 2: profile_stage as text (created | searchable | enriched) for matching gating.
-- Replaces ORG-1A integer 1–4 with explicit product stages.

alter table public.organizations
  drop constraint if exists organizations_profile_stage_check;

alter table public.organizations
  alter column profile_stage drop default;

alter table public.organizations
  alter column profile_stage type text using (
    case profile_stage
      when 1 then 'created'
      when 2 then 'searchable'
      when 3 then 'searchable'
      when 4 then 'enriched'
      else 'created'
    end
  );

alter table public.organizations
  alter column profile_stage set default 'created';

alter table public.organizations
  add constraint organizations_profile_stage_phase2_chk
  check (profile_stage in ('created', 'searchable', 'enriched'));

comment on column public.organizations.profile_stage is
  'Phase 2: created | searchable | enriched. Matching considers searchable+enriched when profile_status is active.';

-- Align stored stage with current profile fields (source of truth).
update public.organizations o
set profile_stage = c.computed_stage
from (
  select
    id,
    case
      when cardinality(service_types) > 0
        and cardinality(languages) > 0
        and coverage_area is not null
        and coverage_area <> '{}'::jsonb
        and lower(trim(capacity_status)) <> 'unknown'
      then
        case
          when cardinality(intake_methods) > 0
            or (hours is not null and hours <> '{}'::jsonb)
            or cardinality(accessibility_features) > 0
            or cardinality(special_populations) > 0
          then 'enriched'
          else 'searchable'
        end
      else 'created'
    end as computed_stage
  from public.organizations
) c
where o.id = c.id;
