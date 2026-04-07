-- Domain 1.3 — Messaging thread v2
--
-- Changes:
--   1. Add Option C columns to case_conversations: linked_object_type, linked_object_id, thread_type
--   2. Backfill existing rows: linked_object_type = 'case', linked_object_id = case_id, thread_type = 'case'
--   3. Data-migrate status: 'closed' → 'read_only'
--   4. Drop old CHECK constraint on case_conversations.status
--   5. Add new CHECK constraint: (active, read_only, archived)
--
-- Strategy: additive (Option C) — no rename of case_conversations table to minimize blast radius.
-- Dependent views/aggregates that reference case_conversations continue to work unchanged.

-- ---------------------------------------------------------------------------
-- 1. Add new columns (idempotent via IF NOT EXISTS)
-- ---------------------------------------------------------------------------

ALTER TABLE case_conversations
  ADD COLUMN IF NOT EXISTS linked_object_type TEXT,
  ADD COLUMN IF NOT EXISTS linked_object_id   TEXT,
  ADD COLUMN IF NOT EXISTS thread_type        TEXT;

-- ---------------------------------------------------------------------------
-- 2. Backfill existing rows
-- ---------------------------------------------------------------------------

UPDATE case_conversations
SET
  linked_object_type = 'case',
  linked_object_id   = case_id,
  thread_type        = 'case'
WHERE linked_object_type IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Data-migrate status: 'closed' → 'read_only'
-- ---------------------------------------------------------------------------

UPDATE case_conversations
SET status = 'read_only'
WHERE status = 'closed';

-- ---------------------------------------------------------------------------
-- 4. Drop old CHECK constraint (name may differ by environment)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_constraint TEXT;
BEGIN
  SELECT constraint_name
    INTO v_constraint
    FROM information_schema.table_constraints
   WHERE table_name = 'case_conversations'
     AND constraint_type = 'CHECK'
     AND constraint_name ILIKE '%status%'
   LIMIT 1;

  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE case_conversations DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Add new CHECK constraint
-- ---------------------------------------------------------------------------

ALTER TABLE case_conversations
  ADD CONSTRAINT case_conversations_status_check
    CHECK (status IN ('active', 'read_only', 'archived'));
