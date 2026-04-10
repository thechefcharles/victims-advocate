-- Security compliance: add source IP and user agent to audit_events
-- Required by spec §10 for forensic audit trail completeness.

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS audit_events_ip_idx
  ON audit_events (ip_address)
  WHERE ip_address IS NOT NULL;
