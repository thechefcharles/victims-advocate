/**
 * Domain 2.5 — intake answer adapter tests.
 */

import { describe, it, expect } from "vitest";
import {
  normalizeIntakeAnswers,
  normalizeKey,
  detectAnswerVersion,
  getAnswerValue,
} from "@/lib/server/intake/intakeAnswerAdapter";
import { staticStateRequirements } from "@/lib/stateRequirements";

const v1Sample = {
  victim: {
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "1990-05-01",
    last4SSN: "1234",
  },
  contact: { preferredLanguage: "es", workingWithAdvocate: true },
  crime: { crimeCounty: "Cook", dateOfCrime: "2026-04-01" },
  losses: { medicalHospital: true, counseling: false, lossOfEarnings: true },
};

const v2Equivalent = {
  victim_first_name: "Jane",
  victim_last_name: "Doe",
  victim_date_of_birth: "1990-05-01",
  victim_last4_ssn: "1234",
  contact_preferred_language: "es",
  contact_working_with_advocate: true,
  crime_crime_county: "Cook",
  crime_date_of_crime: "2026-04-01",
  losses_medical_hospital: true,
  losses_counseling: false,
  losses_loss_of_earnings: true,
};

describe("normalizeKey", () => {
  it("flattens dotted camelCase paths", () => {
    expect(normalizeKey("victim.firstName")).toBe("victim_first_name");
  });
  it("collapses runs of separators", () => {
    expect(normalizeKey("__crime__crimeCounty__")).toBe("crime_crime_county");
  });
});

describe("detectAnswerVersion", () => {
  it("v1 when nested groups present", () => {
    expect(detectAnswerVersion(v1Sample)).toBe("v1");
  });
  it("v2 for flat keys", () => {
    expect(detectAnswerVersion(v2Equivalent)).toBe("v2");
  });
  it("v2 for empty input", () => {
    expect(detectAnswerVersion({})).toBe("v2");
  });
});

describe("normalizeIntakeAnswers", () => {
  it("v1 → v2 produces matching keys + values", () => {
    const flat = normalizeIntakeAnswers(v1Sample, "v1");
    for (const [k, v] of Object.entries(v2Equivalent)) {
      expect(flat[k]).toEqual(v);
    }
  });

  it("v2 input passes through (with key normalization)", () => {
    const flat = normalizeIntakeAnswers(v2Equivalent, "v2");
    expect(flat.victim_first_name).toBe("Jane");
    expect(flat.losses_medical_hospital).toBe(true);
  });

  it("returns {} for null/undefined", () => {
    expect(normalizeIntakeAnswers(null, "v1")).toEqual({});
    expect(normalizeIntakeAnswers(undefined, "v2")).toEqual({});
  });
});

describe("getAnswerValue", () => {
  it("returns matching key", () => {
    expect(getAnswerValue(v2Equivalent, "victim_first_name")).toBe("Jane");
  });
  it("returns undefined for missing key (no throw)", () => {
    expect(getAnswerValue(v2Equivalent, "doesnt_exist")).toBeUndefined();
  });
  it("tolerates dotted legacy path passed by mistake", () => {
    expect(getAnswerValue(v2Equivalent, "victim.firstName")).toBe("Jane");
  });
});

describe("staticStateRequirements", () => {
  it("IN requires last4 + submitter type", () => {
    const r = staticStateRequirements("IN");
    expect(r.requiresLast4Ssn).toBe(true);
    expect(r.requiresSubmitterType).toBe(true);
  });
  it("IL has no extra requirements", () => {
    const r = staticStateRequirements("IL");
    expect(r.requiresLast4Ssn).toBe(false);
    expect(r.requiresSubmitterType).toBe(false);
  });
  it("unknown code returns defaults", () => {
    expect(staticStateRequirements("ZZ").requiresLast4Ssn).toBe(false);
  });
});
