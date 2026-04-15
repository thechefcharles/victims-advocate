-- Domain 7.4 — Cron run telemetry for the admin health dashboard.
-- Each cron entrypoint writes one row per execution so the admin UI can
-- surface last-run status without reading Vercel logs directly.

CREATE TABLE IF NOT EXISTS cron_run_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cron_name       text NOT NULL,
  last_run_at     timestamptz NOT NULL DEFAULT now(),
  last_run_status text NOT NULL CHECK (last_run_status IN ('success', 'error')),
  error_message   text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_run_log_name_time
  ON cron_run_log (cron_name, last_run_at DESC);

ALTER TABLE cron_run_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY cron_run_log_service_all
  ON cron_run_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
