-- public.set_updated_at() — required by Phase 3 updated_at triggers.
-- Mirrors public.handle_updated_at() (20260501450000). Must run before
-- 20260508000000_applicant_profiles.sql and siblings which reference this name.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
