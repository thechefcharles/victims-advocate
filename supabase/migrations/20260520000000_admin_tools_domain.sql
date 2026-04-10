-- Domain 7.4 — Admin Tools
--
-- Thin orchestration layer. Only creates tables for admin-specific state
-- (remediation records, support mode sessions). All other reads go to
-- existing domain tables via admin services.

-- ---------------------------------------------------------------------------
-- 1. admin_remediation_records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_remediation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  remediation_type text NOT NULL,
  issue_context text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_remediation_records_status_idx ON admin_remediation_records (status);
CREATE INDEX admin_remediation_records_target_idx ON admin_remediation_records (target_type, target_id);

ALTER TABLE admin_remediation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_remediation_service_role_all
  ON admin_remediation_records FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. admin_support_sessions — explicit tracked support mode
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_support_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  purpose text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_support_sessions_admin_idx ON admin_support_sessions (admin_user_id, status);

ALTER TABLE admin_support_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_support_sessions_service_role_all
  ON admin_support_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
