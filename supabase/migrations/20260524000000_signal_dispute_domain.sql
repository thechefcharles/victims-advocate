-- Domain 6.1 — SignalDispute workflow.
--
-- Adds:
--   signal_event_exclusions     — anti-join marker for signals removed from
--                                 scoring. Used instead of a column on
--                                 trust_signal_events because that table has
--                                 DO INSTEAD NOTHING rules for UPDATE/DELETE
--                                 (append-only by design). The exclusion row
--                                 is inserted on resolved_removed; signals
--                                 themselves remain immutable.
--
--   signal_disputes             — the dispute workflow state.
--   signal_dispute_audit_events — per-dispute immutable audit trail (in
--                                 addition to governance.audit_events).
--
-- Status graph (enforced by CHECK constraint):
--   submitted → under_review → resolved_upheld | resolved_annotated
--                              | resolved_removed | closed

-- ---------------------------------------------------------------------------
-- signal_event_exclusions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signal_event_exclusions (
  signal_event_id  uuid PRIMARY KEY REFERENCES trust_signal_events(id) ON DELETE CASCADE,
  excluded_at      timestamptz NOT NULL DEFAULT now(),
  excluded_by_dispute_id uuid,       -- set after signal_disputes is created
  reason           text NOT NULL DEFAULT 'resolved_removed'
);

COMMENT ON TABLE signal_event_exclusions IS
  'Signals excluded from scoring (never deleted). Aggregator anti-joins against this.';

CREATE INDEX IF NOT EXISTS idx_signal_event_exclusions_dispute
  ON signal_event_exclusions (excluded_by_dispute_id);

ALTER TABLE signal_event_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_event_exclusions_service_all"
  ON signal_event_exclusions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- signal_disputes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signal_disputes (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signal_event_id      uuid NOT NULL REFERENCES trust_signal_events(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','under_review','resolved_upheld','resolved_annotated',
    'resolved_removed','closed'
  )),
  submitted_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  provider_explanation text NOT NULL,
  evidence_urls        text[] NOT NULL DEFAULT '{}',
  resolution_reason    text,            -- plain-language, shown to provider
  admin_notes          text,            -- internal review notes; NEVER shown to provider
  sla_deadline         timestamptz NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  sla_escalated        boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  -- A given signal can only have one live dispute — resolved/closed ones free the lock.
  UNIQUE (signal_event_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_disputes_org_status
  ON signal_disputes (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_signal_disputes_sla
  ON signal_disputes (status, sla_deadline)
  WHERE status = 'under_review' AND sla_escalated = false;

ALTER TABLE signal_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_disputes_service_all"
  ON signal_disputes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- signal_dispute_audit_events
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS signal_dispute_audit_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id  uuid NOT NULL REFERENCES signal_disputes(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role  text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_dispute_audit_events_dispute
  ON signal_dispute_audit_events (dispute_id, created_at DESC);

ALTER TABLE signal_dispute_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_dispute_audit_events_service_all"
  ON signal_dispute_audit_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Append-only: block UPDATE and DELETE at the rule level.
CREATE RULE signal_dispute_audit_events_no_update
  AS ON UPDATE TO signal_dispute_audit_events DO INSTEAD NOTHING;
CREATE RULE signal_dispute_audit_events_no_delete
  AS ON DELETE TO signal_dispute_audit_events DO INSTEAD NOTHING;

-- Updated-at trigger for signal_disputes
CREATE OR REPLACE FUNCTION signal_disputes_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_signal_disputes_updated_at
  BEFORE UPDATE ON signal_disputes
  FOR EACH ROW EXECUTE FUNCTION signal_disputes_set_updated_at();
