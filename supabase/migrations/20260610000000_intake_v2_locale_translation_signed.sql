-- Domain 2.5 — intake-v2 locale + English translation cache + signature timestamp.
--
-- answers_locale : caller-declared locale for the raw `answers` map. When 'es'
--                  the submit flow runs the values through the AI translation
--                  service and caches the English version in answers_en, so the
--                  PDF download route can render official forms in English
--                  without a per-download model call.
-- answers_en     : read-only cache of English-translated answers. NULL while
--                  the session is still in its original locale (en) OR before
--                  submit. Populated exactly once at submit time.
-- signed_at      : timestamp of first certification completion (subrogation +
--                  release checkboxes + typed signature). Once set, never
--                  recomputed — every PDF download renders this fixed date.

ALTER TABLE public.intake_v2_sessions
  ADD COLUMN IF NOT EXISTS answers_locale text NOT NULL DEFAULT 'en'
    CHECK (answers_locale IN ('en', 'es')),
  ADD COLUMN IF NOT EXISTS answers_en jsonb,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

COMMENT ON COLUMN public.intake_v2_sessions.answers_locale IS
  'Locale of values stored in answers. Set at session creation from user i18n context.';
COMMENT ON COLUMN public.intake_v2_sessions.answers_en IS
  'Cached English translation of answers, populated at submit when answers_locale = ''es''. NULL otherwise.';
COMMENT ON COLUMN public.intake_v2_sessions.signed_at IS
  'First time the applicant completed certification (both checkboxes + typed name). Immutable once set.';
