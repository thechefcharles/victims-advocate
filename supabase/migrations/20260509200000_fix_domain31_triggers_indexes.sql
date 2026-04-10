-- Fixup: Domain 3.1 triggers and indexes that failed to apply because
-- public.set_updated_at() did not exist when 20260508000000-0002 ran.
-- Tables, RLS, and policies were committed by those migrations; only
-- triggers and indexes are created here.

-- applicant_profiles
DROP TRIGGER IF EXISTS set_applicant_profiles_updated_at ON public.applicant_profiles;
CREATE TRIGGER set_applicant_profiles_updated_at
  BEFORE UPDATE ON public.applicant_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_applicant_profiles_user_id ON public.applicant_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_applicant_profiles_state ON public.applicant_profiles (state);

-- applicant_preferences
DROP TRIGGER IF EXISTS set_applicant_preferences_updated_at ON public.applicant_preferences;
CREATE TRIGGER set_applicant_preferences_updated_at
  BEFORE UPDATE ON public.applicant_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_applicant_preferences_user_id ON public.applicant_preferences (user_id);

-- trusted_helper_access
DROP TRIGGER IF EXISTS set_trusted_helper_access_updated_at ON public.trusted_helper_access;
CREATE TRIGGER set_trusted_helper_access_updated_at
  BEFORE UPDATE ON public.trusted_helper_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_trusted_helper_applicant ON public.trusted_helper_access (applicant_user_id, status);
CREATE INDEX IF NOT EXISTS idx_trusted_helper_helper ON public.trusted_helper_access (helper_user_id, status);
