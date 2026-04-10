-- Domain 3.1 — Applicant Domain
-- applicant_preferences: accessibility, notification channel, discovery defaults
-- Does NOT duplicate locale (locale_preferences, Domain 2.4) or safety mode (user_safety_settings)

CREATE TABLE IF NOT EXISTS public.applicant_preferences (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  accessibility_mode              text NOT NULL DEFAULT 'none'
    CHECK (accessibility_mode IN ('high_contrast','large_text','screen_reader','none')),

  notification_channel_preference text NOT NULL DEFAULT 'in_app'
    CHECK (notification_channel_preference IN ('email','sms','in_app')),

  discovery_search_radius_miles   integer NOT NULL DEFAULT 25
    CHECK (discovery_search_radius_miles > 0),

  discovery_default_state_code    text,

  intake_save_frequency_seconds   integer NOT NULL DEFAULT 30
    CHECK (intake_save_frequency_seconds BETWEEN 5 AND 300),

  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.applicant_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicant_preferences_self_select"
  ON public.applicant_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "applicant_preferences_self_insert"
  ON public.applicant_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applicant_preferences_self_update"
  ON public.applicant_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applicant_preferences_admin_select"
  ON public.applicant_preferences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "applicant_preferences_service_role"
  ON public.applicant_preferences FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_applicant_preferences_updated_at
  BEFORE UPDATE ON public.applicant_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_applicant_preferences_user_id ON public.applicant_preferences (user_id);
