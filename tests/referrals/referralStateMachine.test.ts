/**
 * Domain 4.1 — Referral state machine tests (8 tests)
 *
 * Tests validateReferralTransition() — pure function, no DB required.
 */

import { describe, it, expect } from "vitest";
import { validateReferralTransition } from "@/lib/server/referrals/referralStateMachine";

describe("referral state machine — validateReferralTransition", () => {
  it("draft → pending_acceptance is valid", () => {
    expect(() => validateReferralTransition("draft", "pending_acceptance")).not.toThrow();
  });

  it("draft → cancelled is valid", () => {
    expect(() => validateReferralTransition("draft", "cancelled")).not.toThrow();
  });

  it("pending_acceptance → accepted is valid", () => {
    expect(() => validateReferralTransition("pending_acceptance", "accepted")).not.toThrow();
  });

  it("pending_acceptance → rejected is valid with reason", () => {
    expect(() => validateReferralTransition("pending_acceptance", "rejected")).not.toThrow();
  });

  it("pending_acceptance → cancelled is valid", () => {
    expect(() => validateReferralTransition("pending_acceptance", "cancelled")).not.toThrow();
  });

  it("accepted → closed is valid", () => {
    expect(() => validateReferralTransition("accepted", "closed")).not.toThrow();
  });

  it("closed → any state is invalid (terminal)", () => {
    expect(() => validateReferralTransition("closed", "draft")).toThrow();
    expect(() => validateReferralTransition("closed", "pending_acceptance")).toThrow();
    expect(() => validateReferralTransition("closed", "accepted")).toThrow();
  });

  it("draft → accepted is invalid (no shortcut)", () => {
    expect(() => validateReferralTransition("draft", "accepted")).toThrow();
  });
});
