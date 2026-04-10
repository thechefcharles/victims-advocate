/**
 * Gap closure — Message thread state machine invalid transitions (2 tests)
 */

import { describe, it, expect } from "vitest";
import {
  deriveThreadStatusFromCaseStatus,
  CASE_STATES_MESSAGING_ARCHIVED,
} from "@/lib/server/messaging/threadStateMachine";
import type { CaseStatus } from "@/lib/registry";

describe("message thread state machine — invalid transitions", () => {
  it("closed case → thread is archived (cannot go back to active)", () => {
    // When case is closed, thread is archived — no path back to active.
    const status = deriveThreadStatusFromCaseStatus("closed");
    expect(status).toBe("archived");
    // Attempting to derive from closed always returns archived.
    expect(CASE_STATES_MESSAGING_ARCHIVED.has("closed")).toBe(true);
  });

  it("denied case → thread is archived (no messaging on denied cases)", () => {
    const status = deriveThreadStatusFromCaseStatus("denied");
    expect(status).toBe("archived");
    // An undefined/nonexistent status would fall through to "archived" (default).
    const bogus = deriveThreadStatusFromCaseStatus("nonexistent_status" as CaseStatus);
    expect(bogus).toBe("archived");
  });
});
