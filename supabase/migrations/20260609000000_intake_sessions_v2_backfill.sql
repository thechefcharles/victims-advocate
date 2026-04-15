-- Domain 2.5 — Intake sessions: v2 backfill infrastructure.
--
-- 1. `draft_payload_v1_backup` preserves the original nested payload before
--    the backfill script rewrites `draft_payload` into flat field_key form.
--    Kept indefinitely for rollback; Phase F can drop it.
-- 2. `intake_schema_version` default flips to 'v2' so any new row inserted
--    from application code (once the repo change lands) gets the canonical
--    version marker even if the code path forgets to set it. Existing rows
--    retain their literal 'v1' value until the backfill script runs.

ALTER TABLE public.intake_sessions
  ADD COLUMN IF NOT EXISTS draft_payload_v1_backup jsonb;

ALTER TABLE public.intake_sessions
  ALTER COLUMN intake_schema_version SET DEFAULT 'v2';

COMMENT ON COLUMN public.intake_sessions.draft_payload_v1_backup IS
  'Original nested CompensationApplication payload captured before v2 backfill. Null on rows created natively as v2.';
