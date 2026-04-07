-- Domain 0.4 — Workflow State Infrastructure
-- Append-only audit log of all workflow state transitions.
-- Data class: B (Sensitive Operational). No PII columns.
-- Every successful transition() call inserts one row here.

CREATE TABLE public.workflow_state_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL    DEFAULT now(),
  entity_type         text        NOT NULL,
  entity_id           uuid        NOT NULL,
  from_state          text        NOT NULL,
  to_state            text        NOT NULL,
  actor_user_id       uuid        NOT NULL,
  actor_account_type  text        NOT NULL,
  tenant_id           uuid,
  metadata            jsonb
);

COMMENT ON TABLE public.workflow_state_log IS
  'Append-only audit log of all workflow state transitions. Data class: B (Sensitive Operational).';

-- Timeline query: fetch transition history for a specific entity
CREATE INDEX workflow_state_log_entity_created_idx
  ON public.workflow_state_log (entity_type, entity_id, created_at DESC);

-- Actor query: fetch all transitions performed by a given user
CREATE INDEX workflow_state_log_actor_idx
  ON public.workflow_state_log (actor_user_id, created_at DESC);

-- RLS: enable row level security
ALTER TABLE public.workflow_state_log ENABLE ROW LEVEL SECURITY;

-- Admin select: platform admins can read all transition history
DROP POLICY IF EXISTS "workflow_state_log_admin_select" ON public.workflow_state_log;
CREATE POLICY "workflow_state_log_admin_select"
  ON public.workflow_state_log
  FOR SELECT
  USING (public.is_admin());

-- Append-only enforcement: reject UPDATE and DELETE at the rule level
-- These rules fire before RLS, making the table structurally immutable.
CREATE RULE workflow_state_log_no_update
  AS ON UPDATE TO public.workflow_state_log
  DO INSTEAD NOTHING;

CREATE RULE workflow_state_log_no_delete
  AS ON DELETE TO public.workflow_state_log
  DO INSTEAD NOTHING;
