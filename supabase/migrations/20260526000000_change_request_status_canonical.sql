-- Domain 7.1 — Canonicalize change_requests.status to the 7-state
-- Master System Document lifecycle.
--
-- Before:
--   draft | pending_approval | approved | rejected | rolled_back
--
-- After:
--   draft | submitted | under_review | approved | rejected | rolled_back | closed
--
-- Data mapping (legacy → canonical):
--   pending_approval → submitted    (per user spec: "pending → submitted")
--   declined         → rejected     (defensive — not currently present in DB
--                                    but covered because the deferred Sprint 1
--                                    audit called these out)
--   withdrawn        → closed       (defensive — same)
--   pending          → submitted    (defensive alias for pending_approval)
--
-- approved, rejected, rolled_back, draft remain unchanged.

-- 1. Backfill legacy values before swapping the CHECK constraint.
UPDATE change_requests SET status = 'submitted'
  WHERE status IN ('pending_approval', 'pending');
UPDATE change_requests SET status = 'rejected'
  WHERE status = 'declined';
UPDATE change_requests SET status = 'closed'
  WHERE status = 'withdrawn';

-- 2. Replace the CHECK constraint. Postgres auto-names the old one; we drop
--    by discovery and add the new one.
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.change_requests'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.change_requests DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.change_requests
  ADD CONSTRAINT change_requests_status_check
  CHECK (status IN (
    'draft',
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'rolled_back',
    'closed'
  ));
