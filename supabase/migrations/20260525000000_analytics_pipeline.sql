-- Domain 6.1 — Analytics aggregation pipeline.
--
-- Three new tables that turn the append-only trust_signal_events log into
-- query-ready aggregates for Phase 6 scoring + agency reporting:
--
--   trust_signal_aggregates_windowed
--       Per (organization, signal_type, window_type). window_type is one of
--       30_day / 90_day / all_time. UNIQUE across all three dimensions.
--       Separate from the pre-existing trust_signal_aggregates (which is
--       non-windowed, used by Domain 6.1 scoring today). Keeping them
--       decoupled preserves existing tests and lets scoring migrate at its
--       own pace.
--
--   trust_signal_summary
--       One row per organization — the public-safe tier projection. Six
--       canonical category score columns + quality_tier + confidence flag.
--       Never carries raw values, per-signal counts, or PII.
--
--   trust_analytics_snapshots
--       Point-in-time snapshots for org and ecosystem views. Distinct from
--       the agency-scoped analytics_snapshots table (migration 516000000).

-- ---------------------------------------------------------------------------
-- trust_signal_aggregates_windowed
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trust_signal_aggregates_windowed (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type       text NOT NULL,
  window_type       text NOT NULL CHECK (window_type IN ('30_day','90_day','all_time')),
  event_count       integer NOT NULL DEFAULT 0,
  sum_value         numeric NOT NULL DEFAULT 0,
  avg_value         numeric,
  min_value         numeric,
  max_value         numeric,
  last_computed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, signal_type, window_type)
);

CREATE INDEX IF NOT EXISTS idx_tsaw_org_window
  ON trust_signal_aggregates_windowed (organization_id, window_type);

ALTER TABLE trust_signal_aggregates_windowed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tsaw_service_all"
  ON trust_signal_aggregates_windowed FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- trust_signal_summary
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trust_signal_summary (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id               uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  response_accessibility_score  numeric,
  advocate_competency_score     numeric,
  case_outcomes_score           numeric,
  victim_experience_score       numeric,
  org_reliability_score         numeric,
  system_integration_score      numeric,
  overall_score                 numeric,
  quality_tier                  text CHECK (quality_tier IN (
    'comprehensive','established','developing','data_pending'
  )),
  confidence_floor_met          boolean NOT NULL DEFAULT false,
  computed_at                   timestamptz NOT NULL DEFAULT now(),
  methodology_version           text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trust_signal_summary_tier
  ON trust_signal_summary (quality_tier);

ALTER TABLE trust_signal_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_signal_summary_service_all"
  ON trust_signal_summary FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Public read of the safe projection: tier + overall_score only would be OK,
-- but we keep public reads blocked at the DB level and serve via surface-
-- specific serializers in the service layer.

-- ---------------------------------------------------------------------------
-- trust_analytics_snapshots
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS trust_analytics_snapshots (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type    text NOT NULL CHECK (snapshot_type IN ('org_score','ecosystem')),
  organization_id  uuid REFERENCES organizations(id) ON DELETE CASCADE,
  data             jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_start     timestamptz,
  period_end       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- Ecosystem snapshots have organization_id = NULL; org snapshots require it.
  CHECK (snapshot_type <> 'org_score' OR organization_id IS NOT NULL),
  CHECK (snapshot_type <> 'ecosystem' OR organization_id IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_trust_analytics_snapshots_type_time
  ON trust_analytics_snapshots (snapshot_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_analytics_snapshots_org_time
  ON trust_analytics_snapshots (organization_id, created_at DESC);

ALTER TABLE trust_analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trust_analytics_snapshots_service_all"
  ON trust_analytics_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);
