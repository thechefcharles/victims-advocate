-- Migration: 20260502000000_case_status_12state.sql
-- Domain 1.2 — Case: expand status to 12-state graph + add new columns.
--
-- Steps:
--   1. Add new columns (IF NOT EXISTS — safe to re-run)
--   2. Data migration: map 4 old statuses to 12-state equivalents
--   3. Drop old CHECK constraint
--   4. Add new CHECK constraint with all 12 states

-- ---------------------------------------------------------------------------
-- 1. Add new columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS support_request_id      uuid       NULL,
  ADD COLUMN IF NOT EXISTS assigned_advocate_id     uuid       NULL,
  ADD COLUMN IF NOT EXISTS submitted_at             timestamptz NULL,
  ADD COLUMN IF NOT EXISTS outcome_recorded_at      timestamptz NULL,
  ADD COLUMN IF NOT EXISTS closed_at                timestamptz NULL,
  ADD COLUMN IF NOT EXISTS program_id               uuid       NULL;

-- ---------------------------------------------------------------------------
-- 2. Data migration — map old 4-state values to new 12-state equivalents
-- ---------------------------------------------------------------------------

-- draft         → open          (case exists but no advocate yet)
-- ready_for_review → in_progress (advocate is actively working it)
-- submitted     → submitted     (no change — value is identical)
-- closed        → closed        (no change — value is identical)

UPDATE public.cases SET status = 'open'        WHERE status = 'draft';
UPDATE public.cases SET status = 'in_progress' WHERE status = 'ready_for_review';
-- 'submitted' and 'closed' remain as-is

-- ---------------------------------------------------------------------------
-- 3. Drop old CHECK constraint
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  _constraint_name text;
BEGIN
  SELECT conname INTO _constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.cases'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%status%';

  IF _constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.cases DROP CONSTRAINT %I', _constraint_name);
  END IF;
END$$;

-- ---------------------------------------------------------------------------
-- 4. Add new CHECK constraint with all 12 states
-- ---------------------------------------------------------------------------

ALTER TABLE public.cases
  ADD CONSTRAINT cases_status_check CHECK (
    status IN (
      'open',
      'assigned',
      'in_progress',
      'awaiting_applicant',
      'awaiting_provider',
      'ready_for_submission',
      'submitted',
      'under_review',
      'approved',
      'denied',
      'appeal_in_progress',
      'closed'
    )
  );
