-- Domain 2.2 — Canonicalize state_workflow_configs.
--
-- Adds the Master System Document canonical columns to the existing
-- state_workflow_configs shell and seeds the IL + IN active rows. The
-- existing child-set tables (intake_schemas, eligibility_rule_sets, etc.)
-- stay as-is — they carry larger jsonb payloads. The canonical fields
-- (filer types, submission method, advocate model, police report rules,
-- subrogation / release signatures, deadlines, award caps) live on the
-- parent row so any service can resolve them with a single read.
--
-- Hard rule (spec): NO `if (stateCode === 'IL')` branches in application
-- code. Every state-specific decision resolves through these columns.

ALTER TABLE public.state_workflow_configs
  ADD COLUMN IF NOT EXISTS program_name                      text,
  ADD COLUMN IF NOT EXISTS admin_agency                      text,
  ADD COLUMN IF NOT EXISTS statute                           text,
  ADD COLUMN IF NOT EXISTS submission_method                 text
    CHECK (submission_method IN ('online','paper_mail_only','email','hybrid')),
  ADD COLUMN IF NOT EXISTS submission_address                text,
  ADD COLUMN IF NOT EXISTS advocate_model                    text
    CHECK (advocate_model IN ('facilitator','filer','none')),
  ADD COLUMN IF NOT EXISTS advocate_portal                   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS police_report_required            boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS police_report_exceptions          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS filer_types                       jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS separate_application_required     jsonb   NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_subrogation_agreement    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_release_of_information   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS authorization_expiry_years        integer,
  ADD COLUMN IF NOT EXISTS good_samaritan_eligible           boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS immigration_restriction           text    NOT NULL DEFAULT 'none'
    CHECK (immigration_restriction IN ('none','citizen_or_eligible_alien','lawful_presence')),
  ADD COLUMN IF NOT EXISTS filing_deadline_days              integer,
  ADD COLUMN IF NOT EXISTS report_deadline_days              integer,
  ADD COLUMN IF NOT EXISTS max_award_cents                   integer,
  ADD COLUMN IF NOT EXISTS max_funeral_award_cents           integer,
  -- Used by cvcOutputService to pick the generated PDF doc_type without a
  -- stateCode === "IL" branch.
  ADD COLUMN IF NOT EXISTS generated_doc_type                text;

-- ---------------------------------------------------------------------------
-- Seed IL and IN active rows.
-- Idempotent: ON CONFLICT (state_code) WHERE status='active' via the existing
-- partial unique index would reject duplicates; we INSERT only if no active
-- row exists.
-- ---------------------------------------------------------------------------

INSERT INTO public.state_workflow_configs (
  state_code, version_number, status, display_name, published_at,
  program_name, admin_agency, statute,
  submission_method, submission_address,
  advocate_model, advocate_portal,
  police_report_required, police_report_exceptions,
  filer_types, separate_application_required,
  requires_subrogation_agreement, requires_release_of_information,
  authorization_expiry_years,
  good_samaritan_eligible, immigration_restriction,
  filing_deadline_days, report_deadline_days,
  max_award_cents, max_funeral_award_cents,
  generated_doc_type
)
SELECT
  'IL', 1, 'active', 'Illinois Crime Victims Compensation', now(),
  'Illinois Crime Victims Compensation',
  'Illinois Attorney General''s Office',
  '740 ILCS 45/2',
  'paper_mail_only',
  '115 S. LaSalle Street, Chicago IL 60603',
  'facilitator', false,
  true,
  '[
    {"crimeType":"domestic_violence","alternateVerification":"order_of_protection"},
    {"crimeType":"sexual_assault","alternateVerification":"medical_documentation"}
  ]'::jsonb,
  '["self_filing_adult","eligible_applicant_own_expenses","guardian_or_rep","third_party_expense_payer"]'::jsonb,
  '["eligible_applicant_own_expenses","third_party_expense_payer"]'::jsonb,
  true, true, 3,
  false, 'none',
  730, 72,
  NULL, NULL,
  'cvc_generated_il'
WHERE NOT EXISTS (
  SELECT 1 FROM public.state_workflow_configs WHERE state_code = 'IL' AND status = 'active'
);

INSERT INTO public.state_workflow_configs (
  state_code, version_number, status, display_name, published_at,
  program_name, admin_agency,
  submission_method,
  advocate_model, advocate_portal,
  police_report_required, police_report_exceptions,
  filer_types, separate_application_required,
  requires_subrogation_agreement, requires_release_of_information,
  good_samaritan_eligible, immigration_restriction,
  filing_deadline_days, report_deadline_days,
  max_award_cents, max_funeral_award_cents,
  generated_doc_type
)
SELECT
  'IN', 1, 'active', 'Indiana Crime Victim Compensation', now(),
  'Indiana Crime Victim Compensation',
  'Indiana Criminal Justice Institute',
  'online',
  'facilitator', false,
  true,
  '[
    {"crimeType":"sexual_assault","alternateVerification":"forensic_exam","effectiveDate":"2022-07-01"}
  ]'::jsonb,
  '["direct_victim","surviving_family_dependent"]'::jsonb,
  '[]'::jsonb,
  false, false,
  false, 'none',
  NULL, NULL,
  1500000, 500000,
  'cvc_generated_in'
WHERE NOT EXISTS (
  SELECT 1 FROM public.state_workflow_configs WHERE state_code = 'IN' AND status = 'active'
);
