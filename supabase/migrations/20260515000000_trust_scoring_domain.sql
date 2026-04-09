-- Domain 6.1 — Trust / Transparency / Scoring
--
-- Creates the 6 tables that own the scoring + reliability + affiliation
-- pipeline that consumes Domain 0.5 trust_signal_aggregates and projects
-- a single applicant-safe reliability_tier into provider_search_index.
--
-- Pipeline:
--   trust_signal_aggregates (Domain 0.5)
--     → aggregateScoreInputs()         → provider_score_inputs
--     → computeProviderScoreSnapshot() → provider_score_snapshots
--     → mapToReliabilitySummary()      → provider_reliability_summaries
--     → updateSearchTrustProjection()  → provider_search_index.reliability_tier
--
-- Hard rules enforced at the DB level:
--   1. score_methodologies — at most ONE row may have status='active' at a time
--      (partial unique index on status WHERE status='active')
--   2. provider_score_snapshots are immutable history — no updates after insert
--      (enforced by trigger; recalculation creates a new row)
--   3. provider_affiliation_statuses is append-only with a single current row
--      (partial unique index on organization_id WHERE is_current=true)
--   4. RLS enabled on all 6 tables; service_role only by default

-- ---------------------------------------------------------------------------
-- 1. score_methodologies — versioned governed scoring model
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS score_methodologies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'deprecated')),
  category_definitions jsonb NOT NULL DEFAULT '[]',
  weights jsonb NOT NULL DEFAULT '{}',
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  deprecated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version)
);

-- Single-active enforcement: only one row may have status='active' at a time.
CREATE UNIQUE INDEX score_methodologies_one_active
  ON score_methodologies (status)
  WHERE status = 'active';

CREATE INDEX score_methodologies_status_idx ON score_methodologies (status);

ALTER TABLE score_methodologies ENABLE ROW LEVEL SECURITY;

CREATE POLICY score_methodologies_service_role_all
  ON score_methodologies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. provider_score_snapshots — immutable versioned score history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_score_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  methodology_id uuid NOT NULL REFERENCES score_methodologies(id) ON DELETE RESTRICT,
  methodology_version text NOT NULL,
  category_scores jsonb NOT NULL DEFAULT '{}',
  weighted_composite numeric(6, 3) NOT NULL DEFAULT 0,
  score_status text NOT NULL DEFAULT 'computed' CHECK (score_status IN ('computed', 'insufficient_data', 'error')),
  calc_metadata jsonb NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_score_snapshots_org_idx
  ON provider_score_snapshots (organization_id, computed_at DESC);
CREATE INDEX provider_score_snapshots_methodology_idx
  ON provider_score_snapshots (methodology_id);

-- Immutability: snapshots are append-only history. No updates allowed.
CREATE OR REPLACE FUNCTION trust_block_snapshot_update()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'provider_score_snapshots is immutable; create a new snapshot instead';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER provider_score_snapshots_no_update
  BEFORE UPDATE ON provider_score_snapshots
  FOR EACH ROW EXECUTE FUNCTION trust_block_snapshot_update();

ALTER TABLE provider_score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_score_snapshots_service_role_all
  ON provider_score_snapshots
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. provider_score_inputs — normalized inputs feeding a snapshot
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_score_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES provider_score_snapshots(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  signal_type text NOT NULL,
  raw_value numeric NOT NULL DEFAULT 0,
  normalized_value numeric(6, 3) NOT NULL DEFAULT 0,
  weight numeric(6, 3) NOT NULL DEFAULT 0,
  contribution numeric(6, 3) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'trust_signal_aggregates',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_score_inputs_snapshot_idx
  ON provider_score_inputs (snapshot_id);
CREATE INDEX provider_score_inputs_org_idx
  ON provider_score_inputs (organization_id);
CREATE INDEX provider_score_inputs_category_idx
  ON provider_score_inputs (category);

ALTER TABLE provider_score_inputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_score_inputs_service_role_all
  ON provider_score_inputs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. provider_reliability_summaries — applicant-safe derived view
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_reliability_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES provider_score_snapshots(id) ON DELETE CASCADE,
  reliability_tier text NOT NULL CHECK (reliability_tier IN ('verified', 'established', 'emerging', 'unverified')),
  highlights jsonb NOT NULL DEFAULT '[]',
  availability_summary text,
  language_summary text,
  freshness timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_reliability_summaries_org_idx
  ON provider_reliability_summaries (organization_id, computed_at DESC);

-- Single-current enforcement: only one current summary per org.
CREATE UNIQUE INDEX provider_reliability_summaries_one_current
  ON provider_reliability_summaries (organization_id)
  WHERE is_current = true;

ALTER TABLE provider_reliability_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_reliability_summaries_service_role_all
  ON provider_reliability_summaries
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. score_disputes — provider disputes against snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS score_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_id uuid NOT NULL REFERENCES provider_score_snapshots(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'closed')),
  reason text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}',
  opened_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  resolution_notes text,
  resolution_outcome text CHECK (resolution_outcome IN ('affirmed', 'recomputed', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX score_disputes_org_idx ON score_disputes (organization_id);
CREATE INDEX score_disputes_snapshot_idx ON score_disputes (snapshot_id);
CREATE INDEX score_disputes_status_idx ON score_disputes (status);

ALTER TABLE score_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY score_disputes_service_role_all
  ON score_disputes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 6. provider_affiliation_statuses — platform-admin controlled
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS provider_affiliation_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending_review', 'affiliated', 'not_affiliated', 'suspended')),
  reason text,
  notes text,
  set_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  set_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX provider_affiliation_statuses_org_idx
  ON provider_affiliation_statuses (organization_id, set_at DESC);

-- Single-current enforcement: only one current row per org.
CREATE UNIQUE INDEX provider_affiliation_statuses_one_current
  ON provider_affiliation_statuses (organization_id)
  WHERE is_current = true;

ALTER TABLE provider_affiliation_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_affiliation_statuses_service_role_all
  ON provider_affiliation_statuses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 7. provider_search_index.reliability_tier projection column
-- ---------------------------------------------------------------------------

ALTER TABLE provider_search_index
  ADD COLUMN IF NOT EXISTS reliability_tier text
    CHECK (reliability_tier IS NULL OR reliability_tier IN ('verified', 'established', 'emerging', 'unverified'));

CREATE INDEX IF NOT EXISTS provider_search_index_reliability_tier_idx
  ON provider_search_index (reliability_tier)
  WHERE reliability_tier IS NOT NULL;
