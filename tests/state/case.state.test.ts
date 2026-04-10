/**
 * Domain 1.2 — Case: state machine tests.
 *
 * Tests the isValidCaseTransition helper and the CASE_TRANSITIONS graph
 * that mirrors lib/server/workflow/transitions.ts case_status block.
 */

import { describe, it, expect } from "vitest";
import {
  isValidCaseTransition,
  isCaseTerminal,
  CASE_TRANSITIONS,
} from "@/lib/server/cases/caseStateMachine";

describe("case state machine", () => {
  describe("valid transitions", () => {
    it.each(CASE_TRANSITIONS)("allows %s → %s", (from, to) => {
      expect(isValidCaseTransition(from, to)).toBe(true);
    });
  });

  describe("invalid (reversed) transitions", () => {
    it("does not allow assigned → open", () => {
      expect(isValidCaseTransition("assigned", "open")).toBe(false);
    });

    it("does not allow submitted → ready_for_submission", () => {
      expect(isValidCaseTransition("submitted", "ready_for_submission")).toBe(false);
    });

    it("does not allow closed → approved", () => {
      expect(isValidCaseTransition("closed", "approved")).toBe(false);
    });
  });

  describe("isCaseTerminal", () => {
    it.each(["approved", "denied", "closed"] as const)("%s is terminal", (status) => {
      expect(isCaseTerminal(status)).toBe(true);
    });

    it.each(["open", "assigned", "in_progress", "submitted"] as const)(
      "%s is not terminal",
      (status) => {
        expect(isCaseTerminal(status)).toBe(false);
      },
    );
  });

  describe("key graph properties", () => {
    it("open is the only entry point (no transitions lead to open)", () => {
      const toOpen = CASE_TRANSITIONS.filter(([, to]) => to === "open");
      expect(toOpen).toHaveLength(0);
    });

    it("graph has 16 edges", () => {
      expect(CASE_TRANSITIONS).toHaveLength(16);
    });

    it("denied can go to both closed and appeal_in_progress", () => {
      const fromDenied = CASE_TRANSITIONS.filter(([from]) => from === "denied").map(([, to]) => to);
      expect(fromDenied).toContain("closed");
      expect(fromDenied).toContain("appeal_in_progress");
    });
  });
});
