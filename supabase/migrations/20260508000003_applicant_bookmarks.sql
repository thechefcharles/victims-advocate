-- Domain 3.1 — Applicant Domain
-- applicant_bookmarks: polymorphic saved resources
-- target_id is UUID stored without FK (polymorphic targets in different tables)

CREATE TABLE IF NOT EXISTS public.applicant_bookmarks (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  target_type         text NOT NULL
    CHECK (target_type IN ('provider','program','resource')),
  target_id           uuid NOT NULL,

  position            integer NOT NULL DEFAULT 0,
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (applicant_user_id, target_type, target_id)
);

ALTER TABLE public.applicant_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicant_bookmarks_self_select"
  ON public.applicant_bookmarks FOR SELECT
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "applicant_bookmarks_self_insert"
  ON public.applicant_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "applicant_bookmarks_self_update"
  ON public.applicant_bookmarks FOR UPDATE
  USING (auth.uid() = applicant_user_id)
  WITH CHECK (auth.uid() = applicant_user_id);

CREATE POLICY "applicant_bookmarks_self_delete"
  ON public.applicant_bookmarks FOR DELETE
  USING (auth.uid() = applicant_user_id);

CREATE POLICY "applicant_bookmarks_admin_select"
  ON public.applicant_bookmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.is_admin = true
    )
  );

CREATE POLICY "applicant_bookmarks_service_role"
  ON public.applicant_bookmarks FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_applicant_bookmarks_owner ON public.applicant_bookmarks (applicant_user_id, position);
CREATE INDEX idx_applicant_bookmarks_target ON public.applicant_bookmarks (target_type, target_id);
