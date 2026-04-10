/**
 * Domain 5.1 — Trusted helper state machine tests (6 tests)
 *
 * Tests validateHelperGrantTransition() — pure function, no DB.
 */

import { describe, it, expect } from "vitest";
import { validateHelperGrantTransition } from "@/lib/server/trustedHelper/trustedHelperStateMachine";

describe("trusted helper state machine", () => {
  it("pending → active is valid", () => {
    expect(() => validateHelperGrantTransition("pending", "active")).not.toThrow();
  });

  it("pending → revoked is valid", () => {
    expect(() => validateHelperGrantTransition("pending", "revoked")).not.toThrow();
  });

  it("active → revoked is valid (immediate denial, no grace period)", () => {
    expect(() => validateHelperGrantTransition("active", "revoked")).not.toThrow();
  });

  it("active → expired is valid", () => {
    expect(() => validateHelperGrantTransition("active", "expired")).not.toThrow();
  });

  it("revoked → any status is invalid (terminal — no reactivation in v1)", () => {
    expect(() => validateHelperGrantTransition("revoked", "active")).toThrow();
    expect(() => validateHelperGrantTransition("revoked", "pending")).toThrow();
  });

  it("expired → any status is invalid (terminal)", () => {
    expect(() => validateHelperGrantTransition("expired", "active")).toThrow();
    expect(() => validateHelperGrantTransition("expired", "pending")).toThrow();
  });
});
