-- Domain 3.6 — Per-org Programs.
--
-- A Program is a specific service offering owned by an organization. Distinct
-- from `program_definitions` (Domain 3.3 platform routing catalog) which
-- describes external compensation programs an applicant might qualify for.
--
-- Used by:
--   * Public provider profiles — programs[] surfaces the org's actual offerings
--   * provider_search_index — denormalized program_types / program_count /
--     programs_accepting_referrals so search can filter by program presence
--     without joining
--   * Trust signal pipeline — capacity_status changes emit
--     `program.capacity_updated`
--
-- RLS: service-role full; authenticated read of active rows; org-management
-- members of the owning org can manage.

CREATE TABLE IF NOT EXISTS programs (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  program_name             text NOT NULL,
  program_type             text NOT NULL CHECK (program_type IN (
    'direct_services',
    'legal_advocacy',
    'counseling',
    'emergency_shelter',
    'transitional_housing',
    'financial_assistance',
    'court_advocacy',
    'hospital_advocacy',
    'crisis_hotline',
    'other'
  )),
  description              text,
  service_types            text[]  NOT NULL DEFAULT '{}',
  crime_types_served       text[]  NOT NULL DEFAULT '{}',
  eligibility_criteria     text,
  languages                text[]  NOT NULL DEFAULT ARRAY['en'],
  accepting_referrals      boolean NOT NULL DEFAULT true,
  capacity_status          text    NOT NULL DEFAULT 'open' CHECK (
    capacity_status IN ('open','limited','waitlist','paused')
  ),
  min_age                  integer,
  max_age                  integer,
  serves_minors            boolean NOT NULL DEFAULT false,
  geographic_coverage      text[]  NOT NULL DEFAULT '{}',
  is_active                boolean NOT NULL DEFAULT true,
  created_by               uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS programs_org_idx                 ON programs (organization_id);
CREATE INDEX IF NOT EXISTS programs_active_idx              ON programs (is_active);
CREATE INDEX IF NOT EXISTS programs_type_idx                ON programs (program_type);
CREATE INDEX IF NOT EXISTS programs_capacity_idx            ON programs (capacity_status);
CREATE INDEX IF NOT EXISTS programs_org_active_idx
  ON programs (organization_id) WHERE is_active = true;

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY programs_service_all
  ON programs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public-safe read: any authenticated user can see active programs. Public
-- (anon) discovery flows go through the API route which uses service-role.
CREATE POLICY programs_authenticated_read
  ON programs FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- Org-management members of the owning org can manage their programs.
CREATE POLICY programs_org_manage
  ON programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships m
       WHERE m.organization_id = programs.organization_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
         AND m.org_role IN ('org_owner','program_manager','supervisor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM org_memberships m
       WHERE m.organization_id = programs.organization_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
         AND m.org_role IN ('org_owner','program_manager','supervisor')
    )
  );

-- Platform admin override.
CREATE POLICY programs_admin_all
  ON programs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Updated_at trigger reuses the project handle_updated_at function if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS programs_updated_at ON programs';
    EXECUTE 'CREATE TRIGGER programs_updated_at
             BEFORE UPDATE ON programs
             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Extend provider_search_index with program rollups so search can filter by
-- program presence without joining the programs table at query time.
-- ---------------------------------------------------------------------------

ALTER TABLE provider_search_index
  ADD COLUMN IF NOT EXISTS program_types                 text[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS program_count                 integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS programs_accepting_referrals  boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_psi_program_types
  ON provider_search_index USING GIN (program_types);

-- Refresh helper — recompute the rollups for a single org. Service code calls
-- this from the program service after every mutation. SECURITY DEFINER so
-- RLS doesn't block the read of `programs` from non-admin contexts (the
-- service layer is already privileged).
CREATE OR REPLACE FUNCTION refresh_provider_search_index_programs(target_org uuid)
RETURNS void AS $$
DECLARE
  v_types  text[];
  v_count  integer;
  v_accept boolean;
BEGIN
  SELECT
    COALESCE(array_agg(DISTINCT program_type), ARRAY[]::text[]),
    COUNT(*)::int,
    COALESCE(bool_or(accepting_referrals AND capacity_status <> 'paused'), false)
  INTO v_types, v_count, v_accept
  FROM programs
  WHERE organization_id = target_org
    AND is_active = true;

  UPDATE provider_search_index
     SET program_types                = COALESCE(v_types,  ARRAY[]::text[]),
         program_count                = COALESCE(v_count,  0),
         programs_accepting_referrals = COALESCE(v_accept, false),
         updated_at                   = now()
   WHERE org_id = target_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
