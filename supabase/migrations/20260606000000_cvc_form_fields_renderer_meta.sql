-- Domain 2.3 — Add dynamic-renderer metadata to cvc_form_fields.
--
-- Today cvc_form_fields carries only PDF-coordinate + alignment metadata
-- (field_key, label, field_type, page_number, x, y, source_path). A dynamic
-- intake renderer also needs grouping (section_key), ordering (display_order),
-- contextual UI hints (help_text, placeholder, input_options), conditional
-- visibility (conditional_on), per-field validation (validation_rules), and
-- visibility/edit gates for internal-only or computed fields.
--
-- Pure schema change. No data is migrated and no application code is required
-- to read these columns yet — Step 4 of the prompt covers the service layer.

ALTER TABLE public.cvc_form_fields
  ADD COLUMN IF NOT EXISTS section_key             text,
  ADD COLUMN IF NOT EXISTS display_order           integer,
  ADD COLUMN IF NOT EXISTS help_text               text,
  ADD COLUMN IF NOT EXISTS placeholder             text,
  ADD COLUMN IF NOT EXISTS input_options           jsonb,
  ADD COLUMN IF NOT EXISTS conditional_on          jsonb,
  ADD COLUMN IF NOT EXISTS validation_rules        jsonb,
  ADD COLUMN IF NOT EXISTS is_visible_to_applicant boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_readonly             boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.cvc_form_fields.section_key IS
  'UX step grouping: applicant | victim | crime | losses | medical | employment | funeral | documents | summary. NULL = ungrouped.';
COMMENT ON COLUMN public.cvc_form_fields.display_order IS
  'Sort order within section. Lower = first. NULL = end.';
COMMENT ON COLUMN public.cvc_form_fields.help_text IS
  'Plain-language explanation rendered below the field.';
COMMENT ON COLUMN public.cvc_form_fields.placeholder IS
  'Input placeholder text.';
COMMENT ON COLUMN public.cvc_form_fields.input_options IS
  'For select/radio/checkbox: [{"value","label"}]. NULL for text/date/currency/signature.';
COMMENT ON COLUMN public.cvc_form_fields.conditional_on IS
  'Single-field visibility rule: {"field_key","operator":"eq","value"}. NULL = always shown.';
COMMENT ON COLUMN public.cvc_form_fields.validation_rules IS
  'Extra validation: {"minLength","maxLength","pattern","patternMessage"}. NULL = type-level only.';
COMMENT ON COLUMN public.cvc_form_fields.is_visible_to_applicant IS
  'False = field is in the PDF but not the intake UI (internal/admin).';
COMMENT ON COLUMN public.cvc_form_fields.is_readonly IS
  'True = computed / auto-filled (renderer must not allow edits).';

-- Renderer queries by (template_id, section_key) and orders by display_order;
-- this composite index is the natural access path.
CREATE INDEX IF NOT EXISTS cvc_form_fields_section_key
  ON public.cvc_form_fields (template_id, section_key, display_order);
