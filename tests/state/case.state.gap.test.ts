/**
 * Gap closure — Case state machine invalid transitions (4 tests)
 */

import { describe, it, expect } from "vitest";
import { isValidCaseTransition } from "@/lib/server/cases/caseStateMachine";
import type { CaseStatus } from "@nxtstps/registry";

describe("case state machine — invalid transitions", () => {
  it("closed → in_progress DENIED (cannot reopen closed case)", () => {
    expect(isValidCaseTransition("closed", "in_progress")).toBe(false);
  });

  it("awaiting_applicant → closed directly DENIED (must go through in_progress/ready_for_submission)", () => {
    expect(isValidCaseTransition("awaiting_applicant", "closed")).toBe(false);
  });

  it("open → approved directly DENIED (must go through full pipeline)", () => {
    expect(isValidCaseTransition("open", "approved")).toBe(false);
  });

  it("any status → nonexistent status always DENIED", () => {
    expect(isValidCaseTransition("open", "nonexistent" as CaseStatus)).toBe(false);
    expect(isValidCaseTransition("in_progress", "bogus_state" as CaseStatus)).toBe(false);
    expect(isValidCaseTransition("closed", "reopen" as CaseStatus)).toBe(false);
  });
});
