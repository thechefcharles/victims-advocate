-- Domain 5.3 — Denial Prevention Engine.
--
-- Two tables:
--   denial_risk_checks   — per-intake-session snapshot of the 13-category
--                          Illinois CVC denial check. Append a new row per
--                          run; we keep history for audit/analytics.
--   intake_reminders     — 7/14/21-day reminder schedule per missing item.

CREATE TABLE IF NOT EXISTS denial_risk_checks (
  id                                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_session_id                        uuid NOT NULL,
  case_id                                  uuid,
  organization_id                          uuid REFERENCES organizations(id) ON DELETE SET NULL,
  checked_at                               timestamptz NOT NULL DEFAULT now(),
  denial_category_1_cooperation            boolean,
  denial_category_2_contributory           boolean,
  denial_category_3_filing_deadline        boolean,
  denial_category_4_report_deadline        boolean,
  denial_category_5_crime_covered          boolean,
  denial_category_6_eligible_applicant     boolean,
  denial_category_7_collateral_sources     boolean,
  denial_category_8_expense_docs           boolean,
  denial_category_9_crime_docs             boolean,
  denial_category_10_complete              boolean,
  denial_category_11_eligible_expenses     boolean,
  denial_category_12_felony                boolean,
  denial_category_13_authorizations        boolean,
  overall_risk_level                       text NOT NULL CHECK (overall_risk_level IN (
    'low','medium','high','blocking'
  )),
  blocking_categories                      integer[] NOT NULL DEFAULT '{}',
  warning_categories                       integer[] NOT NULL DEFAULT '{}',
  passed_all                               boolean NOT NULL DEFAULT false,
  details                                  jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_denial_risk_checks_session
  ON denial_risk_checks (intake_session_id, checked_at DESC);

ALTER TABLE denial_risk_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY denial_risk_checks_service_all
  ON denial_risk_checks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- intake_reminders — 7/14/21 cadence per missing item
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intake_reminders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intake_session_id  uuid NOT NULL,
  reminder_type      text NOT NULL,
  missing_item       text NOT NULL,
  scheduled_for      timestamptz NOT NULL,
  sent_at            timestamptz,
  channel            text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('email','sms','in_app')),
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','cancelled')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (intake_session_id, missing_item, reminder_type)
);

CREATE INDEX IF NOT EXISTS idx_intake_reminders_due
  ON intake_reminders (scheduled_for)
  WHERE status = 'pending';

ALTER TABLE intake_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_reminders_service_all
  ON intake_reminders FOR ALL TO service_role
  USING (true) WITH CHECK (true);
