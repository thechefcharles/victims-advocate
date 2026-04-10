-- Domain 7.3 — AI Guidance Chatbot
--
-- Creates 4 tables for the trauma-informed AI guidance layer.
--
-- Hard rules at DB level:
--   1. ai_guidance_logs — INSERT ONLY (trigger blocks UPDATE/DELETE)
--   2. ai_guidance_messages — no raw content in logs table (enforced at service layer)
--   3. advocate_copilot_drafts.human_review_required defaults to TRUE, no CHECK false
--   4. RLS on all tables; service_role only

-- ---------------------------------------------------------------------------
-- 1. ai_guidance_sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_guidance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_account_type text NOT NULL,
  surface_type text NOT NULL CHECK (surface_type IN (
    'applicant_intake', 'applicant_case', 'applicant_general',
    'provider_copilot', 'admin_inspection'
  )),
  linked_object_type text,
  linked_object_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'escalated', 'closed')),
  language text NOT NULL DEFAULT 'en',
  escalation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_guidance_sessions_actor_idx ON ai_guidance_sessions (actor_user_id, status);
CREATE INDEX ai_guidance_sessions_status_idx ON ai_guidance_sessions (status);

ALTER TABLE ai_guidance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_guidance_sessions_service_role_all
  ON ai_guidance_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 2. ai_guidance_messages
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_guidance_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_guidance_sessions(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  content_type text NOT NULL DEFAULT 'text' CHECK (content_type IN ('text', 'checklist', 'explanation', 'escalation', 'draft')),
  disclaimer_flags jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_guidance_messages_session_idx ON ai_guidance_messages (session_id, created_at);

ALTER TABLE ai_guidance_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_guidance_messages_service_role_all
  ON ai_guidance_messages FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 3. ai_guidance_logs — INSERT ONLY (governance audit)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ai_guidance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_guidance_sessions(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'session_created', 'message_sent', 'escalation_triggered',
    'draft_generated', 'draft_reviewed', 'explain_requested',
    'checklist_generated', 'session_closed'
  )),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_guidance_logs_session_idx ON ai_guidance_logs (session_id);
CREATE INDEX ai_guidance_logs_event_idx ON ai_guidance_logs (event_type);

-- INSERT ONLY — no raw message content in logs
CREATE OR REPLACE FUNCTION ai_guidance_block_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ai_guidance_logs is append-only. UPDATE and DELETE are forbidden.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_guidance_logs_no_update
  BEFORE UPDATE ON ai_guidance_logs FOR EACH ROW
  EXECUTE FUNCTION ai_guidance_block_log_mutation();

CREATE TRIGGER ai_guidance_logs_no_delete
  BEFORE DELETE ON ai_guidance_logs FOR EACH ROW
  EXECUTE FUNCTION ai_guidance_block_log_mutation();

ALTER TABLE ai_guidance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_guidance_logs_service_role_all
  ON ai_guidance_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 4. advocate_copilot_drafts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS advocate_copilot_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES ai_guidance_sessions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  generated_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  draft_type text NOT NULL CHECK (draft_type IN ('case_note', 'referral_summary', 'status_update', 'compliance_response')),
  draft_content text NOT NULL,
  human_review_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft_generated' CHECK (status IN ('draft_generated', 'reviewed', 'discarded', 'applied')),
  reviewed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX advocate_copilot_drafts_session_idx ON advocate_copilot_drafts (session_id);
CREATE INDEX advocate_copilot_drafts_org_idx ON advocate_copilot_drafts (organization_id, status);

ALTER TABLE advocate_copilot_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY advocate_copilot_drafts_service_role_all
  ON advocate_copilot_drafts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
