-- Domain 2.2 — Seed StateWorkflowConfig for all 50 states + DC.
--
-- IL and IN already exist as `status='active'` rows from the canonical seed
-- (20260527000000_state_workflow_config_canonical.sql) and were sourced from
-- spec / Base Truth documents. The remaining 49 jurisdictions are seeded
-- here as `status='draft'` so the platform has full nationwide config
-- coverage as governed data — admins activate via the config editor after
-- human verification.
--
-- Source for non-IL/IN seeded fields: training knowledge of state CVC
-- programs. Every non-IL/IN row is `human_verified=false` and MUST be
-- reviewed by ops before being promoted to `status='active'`. Fields where
-- training-knowledge confidence was low are NULL by design — admins will
-- fill via the verify flow.
--
-- Idempotent: WHERE NOT EXISTS guard on (state_code) so re-running the
-- migration is a no-op for any state already present.

-- ---------------------------------------------------------------------------
-- 1. Widen state_code CHECK to allow all 51 jurisdictions.
-- ---------------------------------------------------------------------------

ALTER TABLE public.state_workflow_configs
  DROP CONSTRAINT IF EXISTS state_workflow_configs_state_code_check;

ALTER TABLE public.state_workflow_configs
  ADD CONSTRAINT state_workflow_configs_state_code_check
  CHECK (state_code IN (
    'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL',
    'IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE',
    'NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD',
    'TN','TX','UT','VT','VA','WA','WV','WI','WY'
  ));

-- ---------------------------------------------------------------------------
-- 2. Add human_verified tracking columns.
-- ---------------------------------------------------------------------------

ALTER TABLE public.state_workflow_configs
  ADD COLUMN IF NOT EXISTS human_verified     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at        timestamptz,
  ADD COLUMN IF NOT EXISTS verification_notes text;

-- IL and IN were sourced from the spec / Base Truth, not training knowledge,
-- so they are pre-marked verified. verified_by stays NULL because the
-- verification predates user-bound provenance.
UPDATE public.state_workflow_configs
   SET human_verified = true,
       verified_at    = COALESCE(verified_at, now()),
       verification_notes = COALESCE(verification_notes,
         'Pre-verified: sourced from Master System Document Base Truth.')
 WHERE state_code IN ('IL','IN')
   AND status = 'active';

-- ---------------------------------------------------------------------------
-- 3. Seed 49 draft rows (50 states + DC, minus IL/IN).
-- All rows are status='draft', human_verified=false. Source: training
-- knowledge, requires human verification before activation.
-- ---------------------------------------------------------------------------

INSERT INTO public.state_workflow_configs (
  state_code, version_number, status, display_name, seeded_from,
  program_name, admin_agency, statute,
  submission_method, advocate_model,
  police_report_required,
  filing_deadline_days, max_award_cents, max_funeral_award_cents
)
SELECT v.state_code, 1, 'draft', v.display_name,
       'training_knowledge_unverified',
       v.program_name, v.admin_agency, v.statute,
       v.submission_method, v.advocate_model,
       COALESCE(v.police_report_required, true),
       v.filing_deadline_days, v.max_award_cents, v.max_funeral_award_cents
  FROM (VALUES
    -- state, display_name, program_name, admin_agency, statute,
    --   submission_method, advocate_model, police_report_required,
    --   filing_deadline_days, max_award_cents, max_funeral_award_cents
    ('AL', 'Alabama Crime Victims Compensation',          'Alabama Crime Victims Compensation',                'Alabama Crime Victims Compensation Commission',           NULL,                  NULL,            NULL, true,  365,  2000000,  NULL),
    ('AK', 'Alaska Violent Crimes Compensation',          'Alaska Violent Crimes Compensation',                'Alaska Violent Crimes Compensation Board',                NULL,                  NULL,            NULL, true,  730,  8000000,  NULL),
    ('AZ', 'Arizona Crime Victim Compensation',           'Arizona Crime Victim Compensation Program',         'Arizona Criminal Justice Commission',                     NULL,                  NULL,            NULL, true,  730,  2500000,  NULL),
    ('AR', 'Arkansas Crime Victims Reparations',          'Arkansas Crime Victims Reparations Program',        'Arkansas Attorney General',                               NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('CA', 'California Victim Compensation',              'California Victim Compensation Program',            'California Victim Compensation Board (CalVCB)',           'California Government Code §13950', 'online',  'filer',     true,  2555, 7000000,  750000),
    ('CO', 'Colorado Crime Victim Compensation',          'Colorado Crime Victim Compensation',                'Colorado Division of Criminal Justice (district-administered)', NULL,            NULL,            NULL, true,  365,  3000000,  NULL),
    ('CT', 'Connecticut Office of Victim Services',       'Connecticut Office of Victim Services Compensation','Connecticut Judicial Branch — Office of Victim Services', NULL,                  NULL,            NULL, true,  730,  1500000,  NULL),
    ('DE', 'Delaware Victims Compensation Assistance',    'Delaware Victims'' Compensation Assistance Program','Delaware Victims'' Compensation Assistance Program (DOJ)', NULL,                NULL,            NULL, true,  730,  2500000,  NULL),
    ('DC', 'DC Crime Victims Compensation',               'DC Crime Victims Compensation Program',             'DC Superior Court Crime Victims Compensation Program',    NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('FL', 'Florida Bureau of Victim Compensation',       'Florida Crime Victim Compensation Program',         'Florida Office of the Attorney General — Bureau of Victim Compensation', NULL,   NULL,            NULL, true,  365,  2500000,  750000),
    ('GA', 'Georgia Crime Victims Compensation',          'Georgia Crime Victims Compensation Program',        'Georgia Criminal Justice Coordinating Council',           NULL,                  NULL,            NULL, true,  1095, 2500000,  NULL),
    ('HI', 'Hawaii Crime Victim Compensation',            'Hawaii Crime Victim Compensation',                  'Hawaii Crime Victim Compensation Commission',             NULL,                  NULL,            NULL, true,  730,  1000000,  NULL),
    ('ID', 'Idaho Crime Victims Compensation',            'Idaho Crime Victims Compensation Program',          'Idaho Industrial Commission — Crime Victims Compensation',NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('IA', 'Iowa Crime Victim Compensation',              'Iowa Crime Victim Compensation Program',            'Iowa Attorney General — Crime Victim Assistance Division',NULL,                  NULL,            NULL, true,  730,  2500000,  NULL),
    ('KS', 'Kansas Crime Victims Compensation',           'Kansas Crime Victims Compensation',                 'Kansas Attorney General — Crime Victims Compensation Board', NULL,                NULL,            NULL, true,  730,  2500000,  NULL),
    ('KY', 'Kentucky Crime Victims Compensation',         'Kentucky Crime Victims Compensation',               'Kentucky Crime Victims Compensation Board',               NULL,                  NULL,            NULL, true,  1825, 2500000,  NULL),
    ('LA', 'Louisiana Crime Victims Reparations',         'Louisiana Crime Victims Reparations Program',       'Louisiana Commission on Law Enforcement',                 NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('ME', 'Maine Victims Compensation',                  'Maine Victims'' Compensation Program',              'Maine Office of the Attorney General',                    NULL,                  NULL,            NULL, true,  1095, 2000000,  NULL),
    ('MD', 'Maryland Criminal Injuries Compensation',     'Maryland Criminal Injuries Compensation Board',     'Maryland Department of Public Safety and Correctional Services', NULL,           NULL,            NULL, true,  1095, 4500000,  NULL),
    ('MA', 'Massachusetts Victim Compensation',           'Massachusetts Victim Compensation Program',         'Massachusetts Office of the Attorney General — Victim Compensation Division', NULL, NULL,           NULL, true,  1095, 2500000,  NULL),
    ('MI', 'Michigan Crime Victim Services',              'Michigan Crime Victim Compensation',                'Michigan Crime Victim Services Commission',               NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('MN', 'Minnesota Crime Victims Reparations',         'Minnesota Crime Victims Reparations Program',       'Minnesota Crime Victims Reparations Board',               NULL,                  NULL,            NULL, true,  1095, 5000000,  750000),
    ('MS', 'Mississippi Crime Victim Compensation',       'Mississippi Crime Victim Compensation Program',     'Mississippi Office of the Attorney General',              NULL,                  NULL,            NULL, true,  1095, 2000000,  NULL),
    ('MO', 'Missouri Crime Victims Compensation',         'Missouri Crime Victims Compensation Program',       'Missouri Department of Public Safety',                    NULL,                  NULL,            NULL, true,  730,  2500000,  NULL),
    ('MT', 'Montana Crime Victims Compensation',          'Montana Crime Victims Compensation Program',        'Montana Department of Justice',                           NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('NE', 'Nebraska Crime Victim Reparations',           'Nebraska Crime Victim Reparations Program',         'Nebraska Commission on Law Enforcement and Criminal Justice', NULL,              NULL,            NULL, true,  730,  2500000,  NULL),
    ('NV', 'Nevada Victims of Crime',                     'Nevada Victims of Crime Program',                   'Nevada Department of Administration — Victims of Crime Program', NULL,           NULL,            NULL, true,  365,  3500000,  NULL),
    ('NH', 'New Hampshire Victims Assistance',            'New Hampshire Victims'' Assistance Compensation',   'New Hampshire Department of Justice — Victim/Witness Office', NULL,              NULL,            NULL, true,  730,  3000000,  NULL),
    ('NJ', 'New Jersey Victims of Crime Compensation',    'NJ Victims of Crime Compensation Office',           'New Jersey Office of the Attorney General — VCCO',        NULL,                  NULL,            NULL, true,  1095, 2500000,  NULL),
    ('NM', 'New Mexico Crime Victims Reparation',         'New Mexico Crime Victims Reparation',               'New Mexico Crime Victims Reparation Commission',          NULL,                  NULL,            NULL, true,  730,  2000000,  NULL),
    ('NY', 'New York Office of Victim Services',          'NY State Crime Victim Compensation',                'New York State Office of Victim Services (OVS)',          'NY Executive Law Article 22', NULL,    'filer',     true,  365,  3000000,  600000),
    ('NC', 'North Carolina Crime Victims Compensation',   'North Carolina Crime Victims Compensation',         'North Carolina Crime Victims Compensation Commission',    NULL,                  NULL,            NULL, true,  730,  3000000,  NULL),
    ('ND', 'North Dakota Crime Victims Compensation',     'North Dakota Crime Victims Compensation Program',   'North Dakota Department of Corrections and Rehabilitation', NULL,                NULL,            NULL, true,  365,  2500000,  NULL),
    ('OH', 'Ohio Victims of Crime Compensation',          'Ohio Victims of Crime Compensation',                'Ohio Office of the Attorney General — Crime Victim Services Section', NULL,      NULL,            NULL, true,  730,  5000000,  NULL),
    ('OK', 'Oklahoma Crime Victims Compensation',         'Oklahoma Crime Victims Compensation',               'Oklahoma District Attorneys Council — CVCB',              NULL,                  NULL,            NULL, true,  365,  2000000,  NULL),
    ('OR', 'Oregon Crime Victims Compensation',           'Oregon Crime Victims'' Compensation Program',       'Oregon Department of Justice — Crime Victims'' Services Division', NULL,         NULL,            NULL, true,  365,  4700000,  NULL),
    ('PA', 'Pennsylvania Victims Compensation',           'Pennsylvania Victims Compensation Assistance',      'Pennsylvania Commission on Crime and Delinquency (PCCD)', NULL,                  NULL,            NULL, true,  730,  3500000,  NULL),
    ('RI', 'Rhode Island Crime Victim Compensation',      'Rhode Island Crime Victim Compensation Program',    'Rhode Island Office of the General Treasurer',            NULL,                  NULL,            NULL, true,  1095, 2500000,  NULL),
    ('SC', 'South Carolina Office of Victim Assistance',  'SC State Office of Victim Assistance',              'South Carolina State Office of Victim Assistance',        NULL,                  NULL,            NULL, true,  730,  1500000,  NULL),
    ('SD', 'South Dakota Crime Victims Compensation',     'South Dakota Crime Victims'' Compensation Program', 'South Dakota Department of Social Services',              NULL,                  NULL,            NULL, true,  365,  1500000,  NULL),
    ('TN', 'Tennessee Criminal Injuries Compensation',    'Tennessee Criminal Injuries Compensation Program',  'Tennessee Department of Treasury — Division of Claims',   NULL,                  NULL,            NULL, true,  365,  3000000,  NULL),
    ('TX', 'Texas Crime Victims Compensation',            'Texas Crime Victims'' Compensation Program',        'Texas Office of the Attorney General',                    'Texas Code of Criminal Procedure Chapter 56B', NULL, 'filer', true, 1095, 5000000,  NULL),
    ('UT', 'Utah Office for Victims of Crime',            'Utah Crime Victims Reparations',                    'Utah Office for Victims of Crime',                        NULL,                  NULL,            NULL, true,  365,  5000000,  NULL),
    ('VT', 'Vermont Victims Compensation',                'Vermont Victims Compensation Program',              'Vermont Center for Crime Victim Services',                NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('VA', 'Virginia Criminal Injuries Compensation',     'Virginia Criminal Injuries Compensation Fund',      'Virginia Workers'' Compensation Commission',              NULL,                  NULL,            NULL, true,  365,  2500000,  NULL),
    ('WA', 'Washington Crime Victims Compensation',       'Washington Crime Victims Compensation Program',     'Washington Department of Labor & Industries',             NULL,                  NULL,            NULL, true,  730,  4000000,  NULL),
    ('WV', 'West Virginia Crime Victims Compensation',    'West Virginia Crime Victims Compensation Fund',     'West Virginia Court of Claims — Crime Victims Compensation', NULL,                NULL,            NULL, true,  730,  3500000,  NULL),
    ('WI', 'Wisconsin Crime Victim Compensation',         'Wisconsin Crime Victim Compensation Program',       'Wisconsin Department of Justice — Office of Crime Victim Services', NULL,         NULL,            NULL, true,  365,  4000000,  NULL),
    ('WY', 'Wyoming Crime Victims Compensation',          'Wyoming Crime Victims Compensation Program',        'Wyoming Office of the Attorney General',                  NULL,                  NULL,            NULL, true,  365,  1500000,  NULL)
  ) AS v(state_code, display_name, program_name, admin_agency, statute,
         submission_method, advocate_model, police_report_required,
         filing_deadline_days, max_award_cents, max_funeral_award_cents)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.state_workflow_configs s WHERE s.state_code = v.state_code
 );
