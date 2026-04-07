-- Domain 0.5 — Trust Signal Infrastructure
-- Append-only event log + pre-aggregated totals per org.
-- Data class: B (Sensitive Operational). No PII in signal values.

-- ---------------------------------------------------------------------------
-- trust_signal_events: append-only event log
-- ---------------------------------------------------------------------------

CREATE TABLE public.trust_signal_events (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz NOT NULL    DEFAULT now(),
  org_id              uuid        NOT NULL,
  entity_type         text        NOT NULL    DEFAULT 'organization',
  signal_type         text        NOT NULL,
  value               numeric     NOT NULL    DEFAULT 0,
  metadata            jsonb,
  actor_user_id       uuid        NOT NULL,
  actor_account_type  text        NOT NULL,
  idempotency_key     text        NOT NULL,
  UNIQUE (idempotency_key)
);

COMMENT ON TABLE public.trust_signal_events IS
  'Append-only trust signal event log. Data class: B (Sensitive Operational).';

-- Timeline query: all signals for an org by type, newest first
CREATE INDEX trust_signal_events_org_type_created_idx
  ON public.trust_signal_events (org_id, signal_type, created_at DESC);

ALTER TABLE public.trust_signal_events ENABLE ROW LEVEL SECURITY;

-- Admin select only — service role bypasses RLS for inserts
DROP POLICY IF EXISTS "admin_select" ON public.trust_signal_events;
CREATE POLICY "admin_select"
  ON public.trust_signal_events
  FOR SELECT
  USING (auth.jwt() ->> 'is_admin' = 'true');

-- Append-only: reject UPDATE and DELETE at the rule level
CREATE RULE trust_signal_events_no_update
  AS ON UPDATE TO public.trust_signal_events
  DO INSTEAD NOTHING;

CREATE RULE trust_signal_events_no_delete
  AS ON DELETE TO public.trust_signal_events
  DO INSTEAD NOTHING;

-- ---------------------------------------------------------------------------
-- trust_signal_aggregates: pre-aggregated totals per (org, signal_type)
-- ---------------------------------------------------------------------------

CREATE TABLE public.trust_signal_aggregates (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid        NOT NULL,
  signal_type   text        NOT NULL,
  total_count   integer     NOT NULL    DEFAULT 0,
  total_value   numeric     NOT NULL    DEFAULT 0,
  last_event_at timestamptz,
  updated_at    timestamptz NOT NULL    DEFAULT now(),
  UNIQUE (org_id, signal_type)
);

COMMENT ON TABLE public.trust_signal_aggregates IS
  'Pre-aggregated trust signal totals per org. Data class: B (Sensitive Operational).';

-- Lookup query: all aggregate rows for an org
CREATE INDEX trust_signal_aggregates_org_idx
  ON public.trust_signal_aggregates (org_id);

ALTER TABLE public.trust_signal_aggregates ENABLE ROW LEVEL SECURITY;

-- Admin select only — service role bypasses RLS for upserts
DROP POLICY IF EXISTS "admin_select" ON public.trust_signal_aggregates;
CREATE POLICY "admin_select"
  ON public.trust_signal_aggregates
  FOR SELECT
  USING (auth.jwt() ->> 'is_admin' = 'true');
