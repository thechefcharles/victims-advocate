-- Domain 3.1 — Applicant Domain
-- trusted_helper_access: delegate/helper grant management
-- granted_scope stored as text[] for efficient ANY() queries

CREATE TABLE IF NOT EXISTS public.trusted_helper_access (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  applicant_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  helper_user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Array of permitted action strings
  -- Valid values: 'intake:view','intake:edit','documents:upload','messages:read','profile:view'
  granted_scope       text[] NOT NULL DEFAULT '{}',

  status              text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','revoked')),

  granted_at          timestamptz NOT NULL DEFAULT now(),
  accepted_at         timestamptz,
  revoked_at          timestamptz,

  granted_by_user_id  uuid NOT NULL REFERENCES auth.users(id),
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  -- One grant record per applicant-helper pair; status tracks lifecycle
  UNIQUE (applicant_user_id, helper_user_id)
);

ALTER TABLE public.trusted_helper_access ENABLE ROW LEVEL SECURITY;

-- Applicant: can see their own grants (as grantor)
CREATE POLICY "trusted_helper_access_applicant_select"
  ON public.trusted_helper_access FOR SELECT
  USING (auth.uid() = applicant_user_id);

-- Applicant: can insert grants they initiate
CREATE POLICY "trusted_helper_access_applicant_insert"
  ON public.trusted_helper_access FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

-- Applicant: can update (revoke) their own grants
CREATE POLICY "trusted_helper_access_applicant_update"
  ON public.trusted_helper_access FOR UPDATE
  USING (auth.uid() = applicant_user_id)
  WITH CHECK (auth.uid() = applicant_user_id);

-- Helper: can see grants they have received
CREATE POLICY "trusted_helper_access_helper_select"
  ON public.trusted_helper_access FOR SELECT
  USING (auth.uid() = helper_user_id);

-- Helper: can update to accept (status pending → active)
CREATE POLICY "trusted_helper_access_helper_update"
  ON public.trusted_helper_access FOR UPDATE
  USING (auth.uid() = helper_user_id AND status = 'pending')
  WITH CHECK (auth.uid() = helper_user_id);

-- Platform admin: read-only
CREATE POLICY "trusted_helper_access_admin_select"
  ON public.trusted_helper_access FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "trusted_helper_access_service_role"
  ON public.trusted_helper_access FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER set_trusted_helper_access_updated_at
  BEFORE UPDATE ON public.trusted_helper_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_trusted_helper_applicant ON public.trusted_helper_access (applicant_user_id, status);
CREATE INDEX idx_trusted_helper_helper ON public.trusted_helper_access (helper_user_id, status);
