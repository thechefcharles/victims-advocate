-- Domain 2.5 — Lift state-specific intake requirements into the config table.
--
-- These two flags currently live as `stateCode === "IN"` literals inside
-- lib/intake/stepCompleteness.ts and lib/intake/intakeStepContinueGate.ts.
-- Phase E moves them onto the governed config so new states are a data
-- operation, not a code change.
--
-- Defaults are conservative (false) so seeded draft rows for the other 49
-- jurisdictions don't accidentally flag SSN as required.

ALTER TABLE public.state_workflow_configs
  ADD COLUMN IF NOT EXISTS requires_last4_ssn      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_submitter_type boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.state_workflow_configs.requires_last4_ssn IS
  'When true, applicant + victim last-4 SSN are required intake fields. Currently true for IN.';
COMMENT ON COLUMN public.state_workflow_configs.requires_submitter_type IS
  'When true, intake must capture contact.who_is_submitting. Currently true for IN.';

UPDATE public.state_workflow_configs
   SET requires_last4_ssn = true,
       requires_submitter_type = true
 WHERE state_code = 'IN';
