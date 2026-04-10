/**
 * Domain 1.3 — Thread state machine tests.
 *
 * Validates that deriveThreadStatusFromCaseStatus correctly maps all 12
 * CaseStatus values to the right MessageThreadStatus.
 */

import { describe, it, expect } from "vitest";
import {
  deriveThreadStatusFromCaseStatus,
  CASE_STATES_MESSAGING_ACTIVE,
  CASE_STATES_MESSAGING_READ_ONLY,
  CASE_STATES_MESSAGING_ARCHIVED,
} from "@/lib/server/messaging/threadStateMachine";
import type { CaseStatus } from "@/lib/registry";

const ALL_CASE_STATUSES: CaseStatus[] = [
  "open",
  "assigned",
  "in_progress",
  "awaiting_applicant",
  "awaiting_provider",
  "ready_for_submission",
  "submitted",
  "under_review",
  "approved",
  "denied",
  "appeal_in_progress",
  "closed",
];

// ---------------------------------------------------------------------------
// Completeness: every CaseStatus is covered by exactly one set
// ---------------------------------------------------------------------------

describe("Thread state machine completeness", () => {
  it("every CaseStatus maps to exactly one messaging state set", () => {
    for (const status of ALL_CASE_STATUSES) {
      const inActive = CASE_STATES_MESSAGING_ACTIVE.has(status);
      const inReadOnly = CASE_STATES_MESSAGING_READ_ONLY.has(status);
      const inArchived = CASE_STATES_MESSAGING_ARCHIVED.has(status);
      const count = [inActive, inReadOnly, inArchived].filter(Boolean).length;
      expect(count).toBe(1);
    }
  });

  it("all 12 CaseStatuses are covered across the three sets", () => {
    const union = new Set([
      ...CASE_STATES_MESSAGING_ACTIVE,
      ...CASE_STATES_MESSAGING_READ_ONLY,
      ...CASE_STATES_MESSAGING_ARCHIVED,
    ]);
    expect(union.size).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// Active states
// ---------------------------------------------------------------------------

describe("ACTIVE case states map to thread status 'active'", () => {
  const activeStatuses: CaseStatus[] = [
    "open",
    "assigned",
    "in_progress",
    "awaiting_applicant",
    "awaiting_provider",
    "ready_for_submission",
  ];
  for (const status of activeStatuses) {
    it(`"${status}" → "active"`, () => {
      expect(deriveThreadStatusFromCaseStatus(status)).toBe("active");
    });
  }
});

// ---------------------------------------------------------------------------
// Read-only states
// ---------------------------------------------------------------------------

describe("READ_ONLY case states map to thread status 'read_only'", () => {
  const readOnlyStatuses: CaseStatus[] = ["submitted", "under_review", "appeal_in_progress"];
  for (const status of readOnlyStatuses) {
    it(`"${status}" → "read_only"`, () => {
      expect(deriveThreadStatusFromCaseStatus(status)).toBe("read_only");
    });
  }
});

// ---------------------------------------------------------------------------
// Archived states
// ---------------------------------------------------------------------------

describe("ARCHIVED case states map to thread status 'archived'", () => {
  const archivedStatuses: CaseStatus[] = ["approved", "denied", "closed"];
  for (const status of archivedStatuses) {
    it(`"${status}" → "archived"`, () => {
      expect(deriveThreadStatusFromCaseStatus(status)).toBe("archived");
    });
  }
});
