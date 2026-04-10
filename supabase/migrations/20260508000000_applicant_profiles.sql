-- Domain 3.1 — Applicant Domain
-- Creates applicant_profiles as a one-to-one extension of profiles
-- personal_info jsonb on profiles is NOT dropped here (dual-write transition)

CREATE TABLE IF NOT EXISTS public.applicant_profiles (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Identity (mirrors personal_info jsonb fields as relational columns)
  preferred_name              text,
  legal_first_name            text,
  legal_last_name             text,
  pronouns                    text,
  gender_identity             text,
  date_of_birth               date,
  ethnicity                   text,
  race                        text,

  -- Contact
  street_address              text,
  apt                         text,
  city                        text,
  state                       text,
  zip                         text,
  cell_phone                  text,
  alternate_phone             text,

  -- Background
  occupation                  text,
  education_level             text,

  -- Communication preferences (profile-level, distinct from locale_preferences)
  interpreter_needed          boolean DEFAULT false,
  preferred_contact_method    text,

  -- Computed
  profile_completion_pct      integer NOT NULL DEFAULT 0 CHECK (profile_completion_pct BETWEEN 0 AND 100),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.applicant_profiles ENABLE ROW LEVEL SECURITY;

-- Applicant: full access to own row
CREATE POLICY "applicant_profiles_self_select"
  ON public.applicant_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "applicant_profiles_self_insert"
  ON public.applicant_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applicant_profiles_self_update"
  ON public.applicant_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Platform admin: read-only
CREATE POLICY "applicant_profiles_admin_select"
  ON public.applicant_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

-- Service role: unrestricted (for server-side operations)
CREATE POLICY "applicant_profiles_service_role"
  ON public.applicant_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- updated_at trigger
CREATE TRIGGER set_applicant_profiles_updated_at
  BEFORE UPDATE ON public.applicant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_applicant_profiles_user_id ON public.applicant_profiles (user_id);
CREATE INDEX idx_applicant_profiles_state ON public.applicant_profiles (state);
