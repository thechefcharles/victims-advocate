-- Domain 7.1 — Governance / Policy Documents / Audit
--
-- Creates 5 tables for the governance system of record.
--
-- Hard rules enforced at DB level:
--   1. audit_events — INSERT ONLY (trigger blocks UPDATE/DELETE)
--   2. policy_acceptances — INSERT ONLY (trigger blocks UPDATE/DELETE)
--   3. approval_decisions — INSERT ONLY (trigger blocks UPDATE/DELETE)
--   4. policy_documents — only ONE active per policy_type (partial unique index)
--   5. change_requests — target_type validated against GOVERNED_TARGETS at app level
--   6. RLS enabled on all 5 tables; service_role only

-- ---------------------------------------------------------------------------
-- 1. audit_events — append-only system of record
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  tenant_id text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  event_category text NOT NULL CHECK (event_category IN (
    'auth_security', 'policy_acceptance', 'governance_change',
    'trust_scoring', 'workflow_transition', 'admin_action', 'compliance_event'
  )),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_actor_idx ON audit_events (actor_id);
CREATE INDEX audit_events_resource_idx ON audit_events (resource_type, resource_id);
CREATE INDEX audit_events_category_idx ON audit_events (event_category);
CREATE INDEX audit_events_created_idx ON audit_events (created_at DESC);

-- INSERT ONLY — block UPDATE and DELETE at DB level
CREATE OR REPLACE FUNCTION governance_block_audit_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only. UPDATE and DELETE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION governance_block_audit_mutation();

CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION governance_block_audit_mutation();

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_events_service_role_all
  ON audit_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. policy_documents — extend existing table from 20250127000004
--    Legacy table has: id, doc_type, version, title, content, is_active,
--    applies_to_role, workflow_key, created_by, metadata, created_at, updated_at
--    We add governance columns alongside the existing ones.
-- ---------------------------------------------------------------------------

-- Add a status column that maps to the governance lifecycle.
-- Backfill: is_active=true → 'active', else 'draft'.
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft'
    CHECK (status IS NULL OR status IN ('draft', 'active', 'deprecated'));

UPDATE policy_documents SET status = 'active' WHERE is_active = true AND status IS NULL;
UPDATE policy_documents SET status = 'draft' WHERE is_active = false AND status IS NULL;

-- Add policy_type as an alias for doc_type (governance convention).
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS policy_type text;

UPDATE policy_documents SET policy_type = doc_type WHERE policy_type IS NULL;

-- Add governance-specific columns.
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE policy_documents
  ADD COLUMN IF NOT EXISTS deprecated_at timestamptz;

-- Backfill published_at for already-active documents.
UPDATE policy_documents SET published_at = updated_at
  WHERE status = 'active' AND published_at IS NULL;

-- Single-active per policy_type (governance layer — coexists with legacy index).
CREATE UNIQUE INDEX IF NOT EXISTS policy_documents_one_active_per_policy_type
  ON policy_documents (policy_type)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS policy_documents_policy_type_status_idx
  ON policy_documents (policy_type, status);

-- ---------------------------------------------------------------------------
-- 3. policy_acceptances — immutable INSERT-ONLY
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS policy_acceptances_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_document_id uuid NOT NULL REFERENCES policy_documents(id) ON DELETE RESTRICT,
  policy_type text NOT NULL,
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE (user_id, policy_document_id)
);

CREATE INDEX policy_acceptances_v2_user_idx ON policy_acceptances_v2 (user_id);
CREATE INDEX policy_acceptances_v2_policy_idx ON policy_acceptances_v2 (policy_document_id);

-- INSERT ONLY — block UPDATE and DELETE
CREATE OR REPLACE FUNCTION governance_block_acceptance_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'policy_acceptances_v2 is immutable. UPDATE and DELETE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER policy_acceptances_v2_no_update
  BEFORE UPDATE ON policy_acceptances_v2
  FOR EACH ROW EXECUTE FUNCTION governance_block_acceptance_mutation();

CREATE TRIGGER policy_acceptances_v2_no_delete
  BEFORE DELETE ON policy_acceptances_v2
  FOR EACH ROW EXECUTE FUNCTION governance_block_acceptance_mutation();

ALTER TABLE policy_acceptances_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_acceptances_v2_service_role_all
  ON policy_acceptances_v2 FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. change_requests — governed change workflow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id text NOT NULL,
  requested_change jsonb NOT NULL DEFAULT '{}',
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected', 'rolled_back'
  )),
  requested_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX change_requests_target_idx ON change_requests (target_type, target_id);
CREATE INDEX change_requests_status_idx ON change_requests (status);

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY change_requests_service_role_all
  ON change_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 5. approval_decisions — immutable INSERT-ONLY
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_request_id uuid NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX approval_decisions_request_idx ON approval_decisions (change_request_id);

-- INSERT ONLY — block UPDATE and DELETE
CREATE OR REPLACE FUNCTION governance_block_approval_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'approval_decisions is immutable. UPDATE and DELETE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_decisions_no_update
  BEFORE UPDATE ON approval_decisions
  FOR EACH ROW EXECUTE FUNCTION governance_block_approval_mutation();

CREATE TRIGGER approval_decisions_no_delete
  BEFORE DELETE ON approval_decisions
  FOR EACH ROW EXECUTE FUNCTION governance_block_approval_mutation();

ALTER TABLE approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_decisions_service_role_all
  ON approval_decisions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
