/**
 * Domain 4.3 — Event state machine tests (5 tests)
 *
 * Tests validateEventTransition() — pure function, no DB required.
 */

import { describe, it, expect } from "vitest";
import { validateEventTransition } from "@/lib/server/events/eventStateMachine";

describe("event state machine — validateEventTransition", () => {
  it("draft → published is valid", () => {
    expect(() => validateEventTransition("draft", "published")).not.toThrow();
  });

  it("published → cancelled is valid", () => {
    expect(() => validateEventTransition("published", "cancelled")).not.toThrow();
  });

  it("published → closed is valid", () => {
    expect(() => validateEventTransition("published", "closed")).not.toThrow();
  });

  it("closed → published is invalid (no reopening in v1)", () => {
    expect(() => validateEventTransition("closed", "published")).toThrow();
  });

  it("closed → any state is invalid (terminal)", () => {
    expect(() => validateEventTransition("closed", "draft")).toThrow();
    expect(() => validateEventTransition("closed", "cancelled")).toThrow();
  });
});
