/**
 * Domain 2.1 — Intake: serializer tests.
 *
 * Confirms:
 *   - serializeForApplicant returns the applicant-safe shape
 *   - serializeForApplicant counts populated fields in draft_progress
 *   - serializeForApplicant includes submission metadata when a submission is provided
 *   - serializeForProvider includes the immutable snapshot
 *   - serializeForProvider includes amendment indicators
 *   - intake_schema_version is preserved on both views
 */

import { describe, it, expect } from "vitest";

import {
  serializeForApplicant,
  serializeForProvider,
} from "@/lib/server/intake/intakeSerializer";
import type {
  IntakeSessionRecord,
  IntakeSubmissionRecord,
  IntakeAmendmentRecord,
} from "@/lib/server/intake/intakeTypes";

function makeSession(overrides: Partial<IntakeSessionRecord> = {}): IntakeSessionRecord {
  return {
    id: "ses-1",
    owner_user_id: "applicant-1",
    case_id: "case-1",
    support_request_id: null,
    organization_id: "org-1",
    state_code: "IL",
    status: "draft",
    draft_payload: {
      victim: { firstName: "A" },
      applicant: { isSameAsVictim: true },
    },
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    translation_mapping_set_id: null,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
    ...overrides,
  };
}

function makeSubmission(overrides: Partial<IntakeSubmissionRecord> = {}): IntakeSubmissionRecord {
  return {
    id: "sub-1",
    session_id: "ses-1",
    case_id: "case-1",
    organization_id: "org-1",
    owner_user_id: "applicant-1",
    submitted_payload: { crime: { dateOfCrime: "2026-03-01" } },
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    translation_mapping_set_id: null,
    state_code: "IL",
    submitted_at: "2026-04-08T00:00:00Z",
    submitted_by_user_id: "applicant-1",
    ...overrides,
  };
}

function makeAmendment(overrides: Partial<IntakeAmendmentRecord> = {}): IntakeAmendmentRecord {
  return {
    id: "amend-1",
    submission_id: "sub-1",
    field_key: "crime.crimeCounty",
    previous_value: "Cook",
    new_value: "DuPage",
    reason: "applicant correction",
    amended_by_user_id: "advocate-1",
    amended_at: "2026-04-09T00:00:00Z",
    ...overrides,
  };
}

describe("serializeForApplicant", () => {
  it("returns the applicant-safe shape with status, state_code, and version", () => {
    const view = serializeForApplicant(makeSession());

    expect(view.id).toBe("ses-1");
    expect(view.status).toBe("draft");
    expect(view.state_code).toBe("IL");
    expect(view.intake_schema_version).toBe("v1");
  });

  it("counts populated top-level fields in draft_progress", () => {
    const view = serializeForApplicant(makeSession());
    // Two top-level keys (victim, applicant) populated
    expect(view.draft_progress.populated_field_count).toBe(2);
  });

  it("includes submission_id and submitted_at when a submission is provided", () => {
    const view = serializeForApplicant(makeSession({ status: "submitted" }), makeSubmission());
    expect(view.submission_id).toBe("sub-1");
    expect(view.submitted_at).toBe("2026-04-08T00:00:00Z");
  });

  it("returns nulls for submission fields when no submission is provided", () => {
    const view = serializeForApplicant(makeSession());
    expect(view.submission_id).toBeNull();
    expect(view.submitted_at).toBeNull();
  });
});

describe("serializeForProvider", () => {
  it("includes the immutable submission snapshot and workflow linkage", () => {
    const view = serializeForProvider(makeSubmission(), []);
    expect(view.id).toBe("sub-1");
    expect(view.session_id).toBe("ses-1");
    expect(view.case_id).toBe("case-1");
    expect(view.organization_id).toBe("org-1");
    expect(view.submitted_payload).toEqual({ crime: { dateOfCrime: "2026-03-01" } });
    expect(view.intake_schema_version).toBe("v1");
  });

  it("reports has_amendments=false and amendment_count=0 when no amendments exist", () => {
    const view = serializeForProvider(makeSubmission(), []);
    expect(view.has_amendments).toBe(false);
    expect(view.amendment_count).toBe(0);
  });

  it("reports amendment_count when amendments exist", () => {
    const view = serializeForProvider(makeSubmission(), [
      makeAmendment(),
      makeAmendment({ id: "amend-2" }),
    ]);
    expect(view.amendment_count).toBe(2);
    expect(view.has_amendments).toBe(true);
  });
});
