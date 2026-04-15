-- Domain 6.1 — Anonymous Victim Experience Survey infrastructure.
--
-- Powers scoring Category 4 (Victim Experience & Dignity). Two tables:
--
--   org_surveys           — one row per delivered survey invite. Opaque to the
--                           respondent (id is the delivery token). NO applicant,
--                           case, or advocate linkage is persisted here, by
--                           design. This is the anonymization boundary.
--
--   org_survey_responses  — the 5 dimension ratings. Only linked back to the
--                           survey row (via survey_id) and to the organization
--                           (denormalized for aggregate queries). No user-level
--                           FKs. Once a response row is written, there is no
--                           way to trace it back to a case or person.
--
-- The 72-hour validity window is enforced in application code: the service
-- rejects tokens whose survey was delivered_at earlier than now() - 72h, and
-- rejects surveys with completed = true. The DB has no scheduled cleanup —
-- stale uncompleted surveys are harmless (they just never get responses).

-- ---------------------------------------------------------------------------
-- org_surveys
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS org_surveys (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  delivered_at     timestamptz NOT NULL DEFAULT now(),
  trigger_type      text NOT NULL CHECK (trigger_type IN (
    'first_advocate_interaction',
    'application_submission'
  )),
  completed         boolean NOT NULL DEFAULT false,
  completed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_org_surveys_org_completed
  ON org_surveys (organization_id, completed);

CREATE INDEX IF NOT EXISTS idx_org_surveys_delivered_at
  ON org_surveys (delivered_at);

-- ---------------------------------------------------------------------------
-- org_survey_responses
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS org_survey_responses (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id                 uuid NOT NULL REFERENCES org_surveys(id) ON DELETE CASCADE,
  -- Denormalized so Phase 6 aggregate queries never need a join.
  organization_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  felt_heard                integer NOT NULL CHECK (felt_heard BETWEEN 1 AND 5),
  advocate_clarity          integer NOT NULL CHECK (advocate_clarity BETWEEN 1 AND 5),
  felt_safe                 integer NOT NULL CHECK (felt_safe BETWEEN 1 AND 5),
  rights_explained          integer NOT NULL CHECK (rights_explained BETWEEN 1 AND 5),
  likelihood_to_recommend   integer NOT NULL CHECK (likelihood_to_recommend BETWEEN 1 AND 5),
  responded_at              timestamptz NOT NULL DEFAULT now(),
  -- One response per survey — enforces single-use token at the DB level.
  UNIQUE (survey_id)
);

CREATE INDEX IF NOT EXISTS idx_org_survey_responses_org
  ON org_survey_responses (organization_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE org_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_survey_responses ENABLE ROW LEVEL SECURITY;

-- org_surveys: service-role-only writes. Orgs see their own surveys via
-- admin/governance tooling that always goes through service-role reads.
CREATE POLICY "org_surveys_service_all"
  ON org_surveys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- org_survey_responses: NO direct reads to anon/authenticated. All reads must
-- go through service-role aggregate queries in surveyService. This is the
-- privacy guarantee — no raw row is ever exposed to a tenant UI.
CREATE POLICY "org_survey_responses_service_all"
  ON org_survey_responses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
