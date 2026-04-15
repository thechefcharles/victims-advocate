-- Domain 2.5 — intake_v2_sessions (Phase D parallel renderer).
--
-- Backs the new template-driven intake renderer at /compensation/intake-v2.
-- Lives alongside the legacy `intake_sessions` table; the two run in parallel
-- until Phase F flips the default. Answers are stored as a flat
-- {field_key: value} jsonb to match the cvc_form_fields source of truth.

CREATE TABLE IF NOT EXISTS intake_v2_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id         uuid REFERENCES cvc_form_templates(id) ON DELETE SET NULL,
  state_code          text NOT NULL,
  filer_type          text NOT NULL,
  answers             jsonb NOT NULL DEFAULT '{}'::jsonb,
  completed_sections  text[] NOT NULL DEFAULT '{}',
  current_section     text,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'submitted', 'abandoned'
  )),
  submitted_at        timestamptz,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intake_v2_sessions_owner_idx
  ON intake_v2_sessions (owner_user_id);
CREATE INDEX IF NOT EXISTS intake_v2_sessions_status_idx
  ON intake_v2_sessions (status);
CREATE INDEX IF NOT EXISTS intake_v2_sessions_template_idx
  ON intake_v2_sessions (template_id);

ALTER TABLE intake_v2_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_v2_sessions_service_all
  ON intake_v2_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Owners read/write their own draft sessions.
CREATE POLICY intake_v2_sessions_owner_rw
  ON intake_v2_sessions FOR ALL
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

-- Platform admins can read all (for support).
CREATE POLICY intake_v2_sessions_admin_read
  ON intake_v2_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_updated_at') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS intake_v2_sessions_updated_at ON intake_v2_sessions';
    EXECUTE 'CREATE TRIGGER intake_v2_sessions_updated_at
             BEFORE UPDATE ON intake_v2_sessions
             FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at()';
  END IF;
END $$;
