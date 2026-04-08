/**
 * Domain 2.1 — Intake: buildSearchAttributesFromIntake mapper tests.
 *
 * Pure-function tests. No mocking.
 *
 * Confirms:
 *   - Maps state, county, language, advocateAssisted from submitted_payload
 *   - Derives urgencyLevel from crime.dateOfCrime and order of protection
 *   - Passes through losses.* boolean flags as needs map
 *   - Does NOT include safetyModeEnabled
 *   - Does NOT import searchService.ts (enforced by file-content grep below)
 *   - Does NOT query organizations (enforced by file-content grep below)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildSearchAttributesFromIntake } from "@/lib/server/intake/buildSearchAttributesFromIntake";
import type { IntakeSubmissionRecord } from "@/lib/server/intake/intakeTypes";

function makeSubmission(
  payload: Record<string, unknown>,
  overrides: Partial<IntakeSubmissionRecord> = {},
): IntakeSubmissionRecord {
  return {
    id: "sub-1",
    session_id: "ses-1",
    case_id: null,
    organization_id: null,
    owner_user_id: "applicant-1",
    submitted_payload: payload,
    intake_schema_version: "v1",
    state_workflow_config_id: null,
    state_code: "IL",
    submitted_at: "2026-04-08T00:00:00Z",
    submitted_by_user_id: "applicant-1",
    ...overrides,
  };
}

describe("buildSearchAttributesFromIntake — mapping", () => {
  it("maps state, county, language, advocateAssisted", () => {
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({
        crime: { crimeCounty: "Cook" },
        contact: { preferredLanguage: "es", workingWithAdvocate: true },
      }),
    );

    expect(profile.state).toBe("IL");
    expect(profile.county).toBe("Cook");
    expect(profile.language).toBe("es");
    expect(profile.advocateAssisted).toBe(true);
  });

  it("returns null for missing strings", () => {
    const profile = buildSearchAttributesFromIntake(makeSubmission({}));
    expect(profile.county).toBeNull();
    expect(profile.language).toBeNull();
    expect(profile.advocateAssisted).toBe(false);
  });
});

describe("buildSearchAttributesFromIntake — urgencyLevel derivation", () => {
  it("returns 'high' when an order of protection is on file", () => {
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({
        protectionAndCivil: { hasOrderOfProtection: true },
        crime: { dateOfCrime: "2020-01-01" }, // old date overridden by OP
      }),
    );
    expect(profile.urgencyLevel).toBe("high");
  });

  it("returns 'high' when dateOfCrime is within 30 days", () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({ crime: { dateOfCrime: recent } }),
    );
    expect(profile.urgencyLevel).toBe("high");
  });

  it("returns 'medium' when dateOfCrime is between 30 and 90 days", () => {
    const mid = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({ crime: { dateOfCrime: mid } }),
    );
    expect(profile.urgencyLevel).toBe("medium");
  });

  it("returns 'low' when dateOfCrime is older than 90 days", () => {
    const old = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({ crime: { dateOfCrime: old } }),
    );
    expect(profile.urgencyLevel).toBe("low");
  });

  it("returns 'low' when dateOfCrime is missing", () => {
    const profile = buildSearchAttributesFromIntake(makeSubmission({}));
    expect(profile.urgencyLevel).toBe("low");
  });
});

describe("buildSearchAttributesFromIntake — needs map", () => {
  it("passes through losses.* boolean flags", () => {
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({
        losses: {
          medicalBills: true,
          mentalHealth: true,
          relocation: false,
          // numeric values should be filtered out
          medicalBillTotal: 1500,
          // strings filtered out
          notes: "ignore me",
        },
      }),
    );
    expect(profile.needs).toEqual({
      medicalBills: true,
      mentalHealth: true,
      relocation: false,
    });
  });

  it("returns empty needs map when losses missing", () => {
    const profile = buildSearchAttributesFromIntake(makeSubmission({}));
    expect(profile.needs).toEqual({});
  });
});

describe("buildSearchAttributesFromIntake — safety law", () => {
  it("does NOT include safetyModeEnabled in the output", () => {
    const profile = buildSearchAttributesFromIntake(
      makeSubmission({
        contact: { preferredLanguage: "en", safetyModeEnabled: true },
      }),
    );
    expect((profile as Record<string, unknown>).safetyModeEnabled).toBeUndefined();
  });
});

describe("buildSearchAttributesFromIntake — Search Law (Rule 12)", () => {
  const sourcePath = join(
    process.cwd(),
    "lib/server/intake/buildSearchAttributesFromIntake.ts",
  );
  const source = readFileSync(sourcePath, "utf8");

  it("does NOT import searchService.ts", () => {
    expect(source).not.toMatch(/from\s+["'][^"']*searchService["']/);
    expect(source).not.toMatch(/searchService\s+from/);
  });

  it("does NOT query the organizations table (excluding doc comments)", () => {
    // Strip line comments and block comments before checking, so the
    // doc-comment that DOCUMENTS this rule does not falsely trip the test.
    const stripped = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    expect(stripped).not.toMatch(/\borganizations\b/);
  });
});
