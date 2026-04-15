/**
 * Domain 7.3 — Escalation detector tests.
 *
 * Pure function; no DB required. Verifies:
 *   - Category 1 (safety/crisis) pattern hits set requiresSessionEscalation
 *   - Category 2 (scope boundary) returns inlineMessage, session stays active
 *   - Category 3 (accumulative distress) counter increments at 1, 2; soft
 *     escalation fires at 3; full escalation fires at 5 after soft
 *   - No message content is retained on the return value
 */

import { describe, it, expect } from "vitest";
import {
  detectEscalation,
  SOFT_ESCALATION_THRESHOLD,
  FULL_ESCALATION_THRESHOLD,
} from "@/lib/server/aiGuidance/escalationDetector";

describe("Category 1 — safety/crisis", () => {
  const crisisInputs: Array<[string, string]> = [
    ["I want to hurt myself", "self_harm_explicit"],
    ["I've been thinking about ending it", "suicidal_ideation"],
    ["I don't want to be here anymore", "suicidal_ideation"],
    ["He is hitting me right now", "ongoing_violence"],
    ["I'm not safe", "immediate_danger"],
    ["I'm afraid for my life", "immediate_danger"],
    ["i am suicidal", "suicidal_ideation"],
    ["self-harm", "self_harm_explicit"],
  ];

  for (const [input, expectedReason] of crisisInputs) {
    it(`fires safety_crisis on: "${input}"`, () => {
      const d = detectEscalation(input, 0, false);
      expect(d.triggered).toBe(true);
      expect(d.category).toBe("safety_crisis");
      expect(d.reasonCode).toBe(expectedReason);
      expect(d.requiresSessionEscalation).toBe(true);
      expect(d.requiresSoftEscalation).toBe(false);
      expect(d.inlineMessage).toBeNull();
      expect(d.resourcesSurfaced.length).toBeGreaterThan(0);
    });
  }
});

describe("Category 2 — scope boundary", () => {
  const boundaryInputs: Array<[string, string]> = [
    ["Will I win my case?", "outcome_guarantee_request"],
    ["Am I going to get approved?", "outcome_guarantee_request"],
    ["How much will I receive?", "outcome_guarantee_request"],
    ["What should I do legally?", "legal_advice_request"],
    ["Is this legal?", "legal_advice_request"],
    ["what are my legal rights", "legal_advice_request"],
    ["should I sue him", "legal_advice_request"],
    ["Can I talk to a real person?", "human_request"],
    ["I need a human", "human_request"],
  ];

  for (const [input, expectedReason] of boundaryInputs) {
    it(`fires scope_boundary on: "${input}"`, () => {
      const d = detectEscalation(input, 0, false);
      expect(d.triggered).toBe(true);
      expect(d.category).toBe("scope_boundary");
      expect(d.reasonCode).toBe(expectedReason);
      expect(d.requiresSessionEscalation).toBe(false);
      expect(d.requiresSoftEscalation).toBe(false);
      expect(d.inlineMessage).not.toBeNull();
      expect(d.resourcesSurfaced.length).toBe(0);
    });
  }

  it("fires unsupported_state on a non-IL/IN state mention", () => {
    const d = detectEscalation("Does this work in Texas?", 0, false);
    expect(d.triggered).toBe(true);
    expect(d.category).toBe("scope_boundary");
    expect(d.reasonCode).toBe("unsupported_state");
    expect(d.inlineMessage).toContain("Illinois");
  });

  it("does NOT fire unsupported_state on IL or IN mentions", () => {
    expect(detectEscalation("I live in Illinois", 0, false).triggered).toBe(false);
    expect(detectEscalation("I live in Indiana", 0, false).triggered).toBe(false);
  });
});

describe("Category 3 — accumulative distress", () => {
  it("counts a distress signal without escalating at count 1", () => {
    const d = detectEscalation("This is pointless", 0, false);
    expect(d.triggered).toBe(false);
    expect(d.nextDistressCount).toBe(1);
  });

  it("counts without escalating at count 2", () => {
    const d = detectEscalation("Why bother", 1, false);
    expect(d.triggered).toBe(false);
    expect(d.nextDistressCount).toBe(2);
  });

  it(`fires soft escalation at threshold (${SOFT_ESCALATION_THRESHOLD})`, () => {
    const d = detectEscalation("I can't do this anymore", 2, false);
    expect(d.triggered).toBe(true);
    expect(d.category).toBe("accumulative_distress");
    expect(d.requiresSoftEscalation).toBe(true);
    expect(d.requiresSessionEscalation).toBe(false);
    expect(d.nextDistressCount).toBe(3);
    expect(d.flipSoftFired).toBe(true);
  });

  it("does NOT re-fire soft escalation once already fired", () => {
    const d = detectEscalation("I give up", 3, true);
    expect(d.requiresSoftEscalation).toBe(false);
  });

  it(`fires FULL escalation at full threshold (${FULL_ESCALATION_THRESHOLD}) after soft has fired`, () => {
    const d = detectEscalation("nothing will help", 4, true);
    expect(d.triggered).toBe(true);
    expect(d.category).toBe("accumulative_distress");
    expect(d.requiresSessionEscalation).toBe(true);
    expect(d.resourcesSurfaced.length).toBeGreaterThan(0);
  });

  it("does not count non-distress messages", () => {
    const d = detectEscalation("What documents do I need?", 2, false);
    expect(d.triggered).toBe(false);
    expect(d.nextDistressCount).toBe(2);
  });
});

describe("privacy — no message content retained", () => {
  it("detection result carries reason_code + category only, never the raw text", () => {
    const secret = "My name is Jane Doe and I want to hurt myself";
    const d = detectEscalation(secret, 0, false);
    const serialized = JSON.stringify(d);
    expect(serialized).not.toContain("Jane");
    expect(serialized).not.toContain("Doe");
    // The pattern match returns a reason_code slug, not the phrase.
    expect(d.reasonCode).toBe("self_harm_explicit");
  });
});

describe("weight/threshold formula", () => {
  it("thresholds are ordered and sensible", () => {
    expect(SOFT_ESCALATION_THRESHOLD).toBeLessThan(FULL_ESCALATION_THRESHOLD);
    expect(SOFT_ESCALATION_THRESHOLD).toBeGreaterThan(0);
  });
});
