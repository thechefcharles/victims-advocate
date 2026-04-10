/**
 * Domain 2.1 — Intake: serializers.
 *
 * No DB access. No business logic. Pure record → view transforms.
 *
 * serializeForApplicant — owner-safe view (excludes provider/internal metadata).
 * serializeForProvider  — review-time view of a submission, with amendment indicators.
 *
 * Always serialize before returning from a route. Never return raw *Record types.
 */

import type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
  IntakeAmendmentRecord,
  IntakeApplicantView,
  IntakeProviderView,
} from "./intakeTypes";

function countPopulatedFields(payload: Record<string, unknown>): number {
  if (!payload || typeof payload !== "object") return 0;
  let count = 0;
  for (const value of Object.values(payload)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "object") {
      // Count any nested object as one populated key — we deliberately do not
      // walk the tree, this is a coarse progress signal not a completeness score.
      count += 1;
    } else if (typeof value === "string") {
      if (value.trim().length > 0) count += 1;
    } else {
      count += 1;
    }
  }
  return count;
}

export function serializeForApplicant(
  session: IntakeSessionRecord,
  submission?: IntakeSubmissionRecord | null,
): IntakeApplicantView {
  return {
    id: session.id,
    status: session.status,
    state_code: session.state_code,
    intake_schema_version: session.intake_schema_version,
    draft_progress: {
      populated_field_count: countPopulatedFields(session.draft_payload ?? {}),
    },
    draft_payload: session.draft_payload ?? {},
    submission_id: submission?.id ?? null,
    submitted_at: submission?.submitted_at ?? null,
    created_at: session.created_at,
    updated_at: session.updated_at,
  };
}

export function serializeForProvider(
  submission: IntakeSubmissionRecord,
  amendments?: IntakeAmendmentRecord[] | null,
): IntakeProviderView {
  const amendmentList = amendments ?? [];
  return {
    id: submission.id,
    session_id: submission.session_id,
    case_id: submission.case_id,
    organization_id: submission.organization_id,
    owner_user_id: submission.owner_user_id,
    state_code: submission.state_code,
    intake_schema_version: submission.intake_schema_version,
    submitted_payload: submission.submitted_payload,
    submitted_at: submission.submitted_at,
    submitted_by_user_id: submission.submitted_by_user_id,
    amendment_count: amendmentList.length,
    has_amendments: amendmentList.length > 0,
  };
}
