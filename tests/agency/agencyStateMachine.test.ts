/**
 * Domain 6.2 — Reporting submission state machine tests (7 tests)
 */

import { describe, it, expect } from "vitest";
import {
  validateSubmissionTransition,
  isTerminalSubmissionStatus,
} from "@/lib/server/agency/agencyStateMachine";

describe("reporting submission state machine", () => {
  it("draft → submitted (valid)", () => {
    expect(() => validateSubmissionTransition("draft", "submitted")).not.toThrow();
  });

  it("submitted → revision_requested with reason (valid)", () => {
    expect(() =>
      validateSubmissionTransition("submitted", "revision_requested"),
    ).not.toThrow();
  });

  it("revision_requested → submitted (provider resubmits, valid)", () => {
    expect(() =>
      validateSubmissionTransition("revision_requested", "submitted"),
    ).not.toThrow();
  });

  it("submitted → accepted (valid)", () => {
    expect(() =>
      validateSubmissionTransition("submitted", "accepted"),
    ).not.toThrow();
  });

  it("submitted → rejected (valid)", () => {
    expect(() =>
      validateSubmissionTransition("submitted", "rejected"),
    ).not.toThrow();
  });

  it("no silent transitions — terminal states have no outbound paths", () => {
    expect(isTerminalSubmissionStatus("accepted")).toBe(true);
    expect(isTerminalSubmissionStatus("rejected")).toBe(true);
    expect(isTerminalSubmissionStatus("draft")).toBe(false);
    expect(isTerminalSubmissionStatus("submitted")).toBe(false);
  });

  it("invalid transition denied — draft → accepted directly", () => {
    expect(() =>
      validateSubmissionTransition("draft", "accepted"),
    ).toThrow(/Cannot transition/);
  });
});
