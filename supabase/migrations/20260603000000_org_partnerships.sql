-- Domain 7.5 — Org Partnerships: MOUs, referral agreements, VOCA grants,
-- hospital MOUs, COUs, law enforcement MOUs.
--
-- Used by:
--   * Funder reporting (VOCA outcome export aggregates by partnership grant year)
--   * Bedside intake gating (`bedside_intake_enabled`)
--   * Renewal cron (notifies org admins of partnerships expiring within 30 days)
--
-- RLS: service-role full access; authenticated read scoped to caller's org
-- (memberships join). Writes flow through service-role only.

CREATE TABLE IF NOT EXISTS org_partnerships (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  partner_type             text NOT NULL CHECK (partner_type IN (
    'mou',
    'referral_agreement',
    'voca_subgrant',
    'voca_direct',
    'hospital_mou',
    'cou',
    'law_enforcement_mou',
    'other'
  )),
  partnership_status       text NOT NULL CHECK (partnership_status IN (
    'pending',
    'active',
    'expired',
    'terminated',
    'under_renewal'
  )),
  partner_name             text,
  partner_organization_id  uuid REFERENCES organizations(id) ON DELETE SET NULL,
  effective_date           date,
  expiration_date          date,
  auto_renew               boolean NOT NULL DEFAULT false,
  voca_grant_year          text,
  voca_award_amount_cents  bigint,
  voca_services_funded     text[],
  bedside_intake_enabled   boolean NOT NULL DEFAULT false,
  bedside_location_name    text,
  notes                    text,
  created_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS org_partnerships_org_idx
  ON org_partnerships (organization_id);
CREATE INDEX IF NOT EXISTS org_partnerships_status_idx
  ON org_partnerships (partnership_status);
CREATE INDEX IF NOT EXISTS org_partnerships_type_idx
  ON org_partnerships (partner_type);
-- Partial index — renewal cron only ever scans active rows by expiration.
CREATE INDEX IF NOT EXISTS org_partnerships_active_expiration_idx
  ON org_partnerships (expiration_date)
  WHERE partnership_status = 'active';

ALTER TABLE org_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_partnerships_service_all
  ON org_partnerships FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Authenticated members of the owning org can read their partnerships.
CREATE POLICY org_partnerships_member_read
  ON org_partnerships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_memberships m
       WHERE m.organization_id = org_partnerships.organization_id
         AND m.user_id = auth.uid()
         AND m.status = 'active'
    )
  );

-- Platform admins can read all.
CREATE POLICY org_partnerships_admin_read
  ON org_partnerships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ---------------------------------------------------------------------------
-- Seed: FY26 IL VOCA partnerships (representative subset of Cook County and
-- statewide victim service providers). 22 rows. All organizations seeded
-- with status='active' and metadata.is_verified=false so ops review is
-- required before any seeded org is surfaced as authoritative.
--
-- Partnership window: FY26 = 2025-10-01 → 2026-09-30 (federal VOCA fiscal).
-- ---------------------------------------------------------------------------

WITH new_orgs AS (
  INSERT INTO organizations (name, type, status, service_types, states_of_operation, compliance_profiles, funding_sources, metadata)
  VALUES
    ('Apna Ghar',                           'nonprofit', 'active', ARRAY['domestic_violence','sexual_assault','case_management','counseling','shelter'],     ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Between Friends',                     'nonprofit', 'active', ARRAY['domestic_violence','counseling','case_management'],                                ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Chicago Childrens Advocacy Center',   'nonprofit', 'active', ARRAY['child_abuse','counseling','medical','case_management'],                            ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Connections for Abused Women and their Children', 'nonprofit', 'active', ARRAY['domestic_violence','shelter','case_management','counseling'],          ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Family Rescue',                       'nonprofit', 'active', ARRAY['domestic_violence','shelter','case_management'],                                   ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Heartland Alliance',                  'nonprofit', 'active', ARRAY['case_management','counseling','legal','employment_support','housing_assistance'],  ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('KAN-WIN',                             'nonprofit', 'active', ARRAY['domestic_violence','sexual_assault','counseling','case_management'],               ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Niles','is_verified',false,'seed_source','fy26_il_voca')),
    ('Life Span Center for Legal Services and Advocacy', 'nonprofit', 'active', ARRAY['domestic_violence','legal','case_management'],                       ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Des Plaines','is_verified',false,'seed_source','fy26_il_voca')),
    ('Mujeres Latinas en Accion',           'nonprofit', 'active', ARRAY['domestic_violence','sexual_assault','counseling','case_management'],               ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Resilience',                          'nonprofit', 'active', ARRAY['sexual_assault','counseling','medical','case_management'],                         ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('YWCA Metropolitan Chicago',           'nonprofit', 'active', ARRAY['sexual_assault','counseling','case_management','employment_support'],              ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Sarahs Inn',                          'nonprofit', 'active', ARRAY['domestic_violence','counseling','case_management'],                                ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Forest Park','is_verified',false,'seed_source','fy26_il_voca')),
    ('South Suburban Family Shelter',       'nonprofit', 'active', ARRAY['domestic_violence','shelter','counseling'],                                        ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Homewood','is_verified',false,'seed_source','fy26_il_voca')),
    ('Hamdard Center',                      'nonprofit', 'active', ARRAY['domestic_violence','counseling','case_management'],                                ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Addison','is_verified',false,'seed_source','fy26_il_voca')),
    ('Pillars Community Health',            'nonprofit', 'active', ARRAY['domestic_violence','sexual_assault','counseling','medical'],                       ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','La Grange Park','is_verified',false,'seed_source','fy26_il_voca')),
    ('WINGS Program',                       'nonprofit', 'active', ARRAY['domestic_violence','shelter','case_management','housing_assistance'],              ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Palatine','is_verified',false,'seed_source','fy26_il_voca')),
    ('Northwest CASA',                      'nonprofit', 'active', ARRAY['sexual_assault','counseling','case_management'],                                   ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Hoffman Estates','is_verified',false,'seed_source','fy26_il_voca')),
    ('Crisis Center for South Suburbia',    'nonprofit', 'active', ARRAY['domestic_violence','shelter','counseling','case_management'],                     ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Tinley Park','is_verified',false,'seed_source','fy26_il_voca')),
    ('A Safe Place',                        'nonprofit', 'active', ARRAY['domestic_violence','shelter','counseling','case_management'],                     ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Zion','is_verified',false,'seed_source','fy26_il_voca')),
    ('Metropolitan Family Services',        'nonprofit', 'active', ARRAY['domestic_violence','counseling','case_management','legal'],                       ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca')),
    ('Family Shelter Service',              'nonprofit', 'active', ARRAY['domestic_violence','shelter','counseling','case_management'],                     ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Wheaton','is_verified',false,'seed_source','fy26_il_voca')),
    ('Center on Halsted',                   'nonprofit', 'active', ARRAY['domestic_violence','sexual_assault','counseling','case_management'],               ARRAY['IL'], ARRAY['voca'], ARRAY['voca'], jsonb_build_object('city','Chicago','is_verified',false,'seed_source','fy26_il_voca'))
  RETURNING id, name
)
INSERT INTO org_partnerships (
  organization_id,
  partner_type,
  partnership_status,
  partner_name,
  effective_date,
  expiration_date,
  voca_grant_year,
  voca_services_funded
)
SELECT
  id,
  'voca_direct',
  'active',
  'Illinois Criminal Justice Information Authority (ICJIA)',
  DATE '2025-10-01',
  DATE '2026-09-30',
  'FY26',
  ARRAY['case_management','counseling','crisis_intervention']
FROM new_orgs;
