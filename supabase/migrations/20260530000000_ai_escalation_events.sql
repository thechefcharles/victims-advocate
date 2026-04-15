-- Domain 7.3 — AI escalation events + per-session distress counters.
--
-- Two new tables powering the three-category escalation architecture:
--
--   ai_escalation_events           — one row per triggered escalation. Logs
--                                    category, reason_code, and which crisis
--                                    resources were surfaced. NEVER stores
--                                    raw applicant message content. Append-
--                                    only via DO INSTEAD NOTHING rules.
--
--   ai_session_distress_counters   — per-session counter for Category 3
--                                    (accumulative distress). Tracks softer
--                                    signals; a soft escalation fires at 3,
--                                    a full escalation at 5.

CREATE TABLE IF NOT EXISTS ai_escalation_events (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id             uuid NOT NULL REFERENCES ai_guidance_sessions(id) ON DELETE CASCADE,
  organization_id        uuid REFERENCES organizations(id) ON DELETE SET NULL,
  category               text NOT NULL CHECK (category IN (
    'safety_crisis',
    'scope_boundary',
    'accumulative_distress'
  )),
  reason_code            text NOT NULL,
  resources_surfaced     text[] NOT NULL DEFAULT '{}',
  advocate_notified      boolean NOT NULL DEFAULT false,
  soft_escalation_fired  boolean NOT NULL DEFAULT false,
  session_escalated      boolean NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_escalation_events IS
  'AI escalation audit trail. Stores category + reason_code ONLY. Raw message content is NEVER written here.';

CREATE INDEX IF NOT EXISTS idx_ai_escalation_events_session
  ON ai_escalation_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_escalation_events_category
  ON ai_escalation_events (category, created_at DESC);

ALTER TABLE ai_escalation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_escalation_events_service_role_all
  ON ai_escalation_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Append-only: block UPDATE/DELETE at the rule level.
CREATE RULE ai_escalation_events_no_update
  AS ON UPDATE TO ai_escalation_events DO INSTEAD NOTHING;
CREATE RULE ai_escalation_events_no_delete
  AS ON DELETE TO ai_escalation_events DO INSTEAD NOTHING;

-- ---------------------------------------------------------------------------
-- Per-session distress counter (Category 3 accumulative)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_session_distress_counters (
  session_id             uuid PRIMARY KEY REFERENCES ai_guidance_sessions(id) ON DELETE CASCADE,
  distress_signal_count  integer NOT NULL DEFAULT 0,
  soft_escalation_fired  boolean NOT NULL DEFAULT false,
  last_signal_at         timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_session_distress_counters IS
  'Counts soft distress signals per session for Category 3 accumulative escalation. Reset when session closes.';

ALTER TABLE ai_session_distress_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_session_distress_counters_service_role_all
  ON ai_session_distress_counters FOR ALL TO service_role
  USING (true) WITH CHECK (true);
