-- Domain 6.1 — CBO Grading compliance additions.
--
-- 1. 30-day private review window on trust_signal_summary — a newly computed
--    score is NEVER publicly displayed. The org sees it privately for 30 days
--    (or acknowledges early). After that window, a cron flip makes it public.
--
-- 2. org_tier_type on organizations — grassroots vs social-service-agency
--    cohort separator. Matching + ecosystem views must never compare across
--    cohorts.

-- ---------------------------------------------------------------------------
-- 1. Private review window
-- ---------------------------------------------------------------------------

ALTER TABLE public.trust_signal_summary
  ADD COLUMN IF NOT EXISTS public_display_active      boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_review_expires_at  timestamptz,
  ADD COLUMN IF NOT EXISTS acknowledged_at            timestamptz;

-- Covers the cron query WHERE public_display_active=false AND
-- private_review_expires_at < now().
CREATE INDEX IF NOT EXISTS idx_trust_signal_summary_review_window
  ON public.trust_signal_summary (private_review_expires_at)
  WHERE public_display_active = false;

-- Existing rows (historical): treat as already-public so we don't accidentally
-- hide them. Only *new* writes enter the private window.
UPDATE public.trust_signal_summary
  SET public_display_active = true
  WHERE public_display_active = false
    AND private_review_expires_at IS NULL;

-- ---------------------------------------------------------------------------
-- 2. Organizational tier separation
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS org_tier_type text NOT NULL DEFAULT 'tier_2_social_service_agency'
    CHECK (org_tier_type IN ('tier_1_grassroots','tier_2_social_service_agency'));

CREATE INDEX IF NOT EXISTS idx_organizations_org_tier_type
  ON public.organizations (org_tier_type);
