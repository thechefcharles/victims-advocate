/**
 * Gap closure — Case serializer safety tests (3 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeCaseForApplicant,
  serializeCaseForProvider,
  serializeCaseForAdmin,
} from "@/lib/server/cases/caseSerializer";
import type { CaseRecord } from "@/lib/server/cases/caseTypes";

const mockCase: CaseRecord = {
  id: "case-1",
  owner_user_id: "user-1",
  organization_id: "org-1",
  program_id: "prog-1",
  support_request_id: "sr-1",
  assigned_advocate_id: "adv-1",
  status: "in_progress",
  name: "Test Case",
  application: '{"raw_intake":"SENSITIVE_DATA"}',
  eligibility_answers: { q1: "yes" },
  eligibility_result: '{"eligible":true,"score":85}',
  eligibility_readiness: "ready",
  eligibility_completed_at: null,
  state_code: "IL",
  submitted_at: null,
  outcome_recorded_at: "2026-04-10T00:00:00Z",
  closed_at: null,
  created_at: "2026-04-01T00:00:00Z",
  updated_at: "2026-04-10T00:00:00Z",
};

describe("case serializer safety", () => {
  it("applicant serializer does NOT include assigned_advocate_id, owner_user_id, or eligibility_result", () => {
    const view = serializeCaseForApplicant(mockCase);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/assigned_advocate_id/);
    expect(json).not.toMatch(/owner_user_id/);
    expect(json).not.toMatch(/eligibility_result/);
    expect(json).not.toMatch(/support_request_id/);
    expect(json).not.toMatch(/outcome_recorded_at/);
    expect(view.id).toBe("case-1");
    expect(view.status).toBe("in_progress");
  });

  it("provider serializer includes assigned_advocate_id and status but NOT raw application blob", () => {
    const view = serializeCaseForProvider(mockCase);
    expect(view.assigned_advocate_id).toBe("adv-1");
    expect(view.status).toBe("in_progress");
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/application/);
    expect(json).not.toMatch(/raw_intake/);
    expect(json).not.toMatch(/SENSITIVE_DATA/);
  });

  it("admin serializer includes full metadata including internal fields", () => {
    const view = serializeCaseForAdmin(mockCase);
    expect(view.assigned_advocate_id).toBe("adv-1");
    expect(view.owner_user_id).toBe("user-1");
    expect(view.eligibility_result).toBe('{"eligible":true,"score":85}');
    expect(view.outcome_recorded_at).toBe("2026-04-10T00:00:00Z");
  });
});
