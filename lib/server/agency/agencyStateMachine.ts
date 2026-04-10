/**
 * Domain 6.2 — ReportingSubmission state machine.
 *
 * Valid transitions:
 *   draft              → submitted
 *   submitted          → revision_requested | accepted | rejected
 *   revision_requested → submitted  (provider resubmits)
 *
 * Terminal states: accepted, rejected (no outbound transitions).
 *
 * Rules:
 *   - Agency Reviewer can ONLY trigger revision_requested (not accept/reject)
 *   - Agency Officer/Owner can trigger revision_requested, accepted, rejected
 *   - Provider triggers draft → submitted and revision_requested → submitted
 */

import { AppError } from "@/lib/server/api";
import type { ReportingSubmissionStatus } from "./agencyTypes";

const SUBMISSION_TRANSITIONS: Record<
  ReportingSubmissionStatus,
  ReportingSubmissionStatus[]
> = {
  draft: ["submitted"],
  submitted: ["revision_requested", "accepted", "rejected"],
  revision_requested: ["submitted"],
  accepted: [],
  rejected: [],
};

export function validateSubmissionTransition(
  from: ReportingSubmissionStatus,
  to: ReportingSubmissionStatus,
): void {
  const allowed = SUBMISSION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Cannot transition reporting submission from '${from}' to '${to}'.`,
      undefined,
      422,
    );
  }
}

export function isTerminalSubmissionStatus(
  status: ReportingSubmissionStatus,
): boolean {
  return status === "accepted" || status === "rejected";
}
