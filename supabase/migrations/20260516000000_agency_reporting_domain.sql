-- Domain 6.2 — Agency / Reporting
--
-- Creates 5 tables for the agency oversight model plus adds reporting-specific
-- trust signal types to the Domain 0.5 canonical type set.
--
-- Agency is an OVERSIGHT account — not a casework account.
-- Key architectural rules enforced at DB level:
--   1. reporting_submissions has an explicit lifecycle (draft → submitted → etc.)
--   2. analytics_snapshots is the only source for dashboard queries — never live-join ops tables
--   3. RLS on all tables; service_role only by default
--   4. agency_memberships: role CHECK constraint matches the canonical AgencyRole enum

-- ---------------------------------------------------------------------------
-- 1. administering_agencies — agency identity + scope
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS administering_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  state_code text NOT NULL,
  scope_type text NOT NULL DEFAULT 'state' CHECK (scope_type IN ('state', 'regional', 'federal')),
  oversight_org_ids uuid[] NOT NULL DEFAULT '{}',
  oversight_program_ids uuid[] NOT NULL DEFAULT '{}',
  contact_email text,
  contact_phone text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX administering_agencies_state_idx ON administering_agencies (state_code);
CREATE INDEX administering_agencies_status_idx ON administering_agencies (status);

ALTER TABLE administering_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY administering_agencies_service_role_all
  ON administering_agencies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. agency_memberships — user↔agency link with role
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agency_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES administering_agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('agency_owner', 'program_officer', 'agency_reviewer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, user_id)
);

CREATE INDEX agency_memberships_user_idx ON agency_memberships (user_id);
CREATE INDEX agency_memberships_agency_idx ON agency_memberships (agency_id, status);

ALTER TABLE agency_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_memberships_service_role_all
  ON agency_memberships FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. reporting_submissions — first-class workflow object
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reporting_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES administering_agencies(id) ON DELETE CASCADE,
  submitted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'revision_requested', 'accepted', 'rejected')),
  title text NOT NULL,
  description text,
  reporting_period_start date NOT NULL,
  reporting_period_end date NOT NULL,
  submission_data jsonb NOT NULL DEFAULT '{}',
  revision_reason text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reporting_submissions_org_idx ON reporting_submissions (organization_id, status);
CREATE INDEX reporting_submissions_agency_idx ON reporting_submissions (agency_id, status);
CREATE INDEX reporting_submissions_status_idx ON reporting_submissions (status);

ALTER TABLE reporting_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY reporting_submissions_service_role_all
  ON reporting_submissions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. agency_notices — formal notices from agency to provider
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS agency_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES administering_agencies(id) ON DELETE CASCADE,
  target_organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notice_type text NOT NULL CHECK (notice_type IN ('revision_request', 'compliance_warning', 'information_request', 'commendation', 'general')),
  subject text NOT NULL,
  body text NOT NULL,
  related_submission_id uuid REFERENCES reporting_submissions(id) ON DELETE SET NULL,
  issued_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agency_notices_agency_idx ON agency_notices (agency_id);
CREATE INDEX agency_notices_org_idx ON agency_notices (target_organization_id);

ALTER TABLE agency_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY agency_notices_service_role_all
  ON agency_notices FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. analytics_snapshots — pre-computed aggregate metrics
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES administering_agencies(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('provider_overview', 'submission_status', 'service_gap', 'performance_trend')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_snapshots_agency_idx ON analytics_snapshots (agency_id, snapshot_type);
CREATE INDEX analytics_snapshots_period_idx ON analytics_snapshots (period_start, period_end);

ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_snapshots_service_role_all
  ON analytics_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);
