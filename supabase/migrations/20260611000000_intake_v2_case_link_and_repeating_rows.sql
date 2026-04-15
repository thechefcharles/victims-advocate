-- Two additive changes for intake-v2 phase F:
--
-- 1. intake_v2_sessions.case_id — lets the v2 renderer resume a draft when
--    the URL carries a legacy ?caseId= param. Nullable so stand-alone v2
--    sessions (no paired case row) keep working.
-- 2. cvc_form_fields.field_type gains 'repeating_rows' — new renderer
--    primitive that expands into a table-style input group for fields like
--    the employer table, funeral payers, benefits list. Existing 6 types
--    keep their meaning.

ALTER TABLE public.intake_v2_sessions
  ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS intake_v2_sessions_case_idx
  ON public.intake_v2_sessions (case_id)
  WHERE case_id IS NOT NULL;

COMMENT ON COLUMN public.intake_v2_sessions.case_id IS
  'Optional link to legacy cases.id so ?caseId= URLs can resume the most-recent draft.';

-- Drop-and-recreate of the field_type CHECK. Using the actual constraint
-- name from the base migration (cvc_form_fields_field_type_check) — the
-- conditional DO block tolerates either first-run or rerun.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cvc_form_fields_field_type_check'
      AND conrelid = 'public.cvc_form_fields'::regclass
  ) THEN
    ALTER TABLE public.cvc_form_fields
      DROP CONSTRAINT cvc_form_fields_field_type_check;
  END IF;
END $$;

ALTER TABLE public.cvc_form_fields
  ADD CONSTRAINT cvc_form_fields_field_type_check
  CHECK (field_type IN (
    'text',
    'textarea',
    'checkbox',
    'date',
    'currency',
    'signature',
    'repeating_rows'
  ));
