/**
 * Domain 2.5 — draftPayloadMigrator tests.
 */

import { describe, it, expect } from "vitest";
import {
  getValueAtPath,
  migrateV1DraftToV2,
  type FormAlignmentMapping,
} from "@/lib/server/intake/draftPayloadMigrator";

const v1 = {
  victim: {
    firstName: "Jane",
    lastName: "Doe",
    contact: { phone: "312-555-0101" },
  },
  losses: { medicalHospital: true, counseling: false },
  employment: {
    employmentHistory: [{ employerName: "Acme" }, { employerName: "Beta" }],
  },
  crime: { dateOfCrime: "2026-04-01", crimeCounty: null },
};

describe("getValueAtPath", () => {
  it("reads simple dotted paths", () => {
    expect(getValueAtPath(v1, "victim.firstName")).toBe("Jane");
  });
  it("traverses nested objects", () => {
    expect(getValueAtPath(v1, "victim.contact.phone")).toBe("312-555-0101");
  });
  it("returns undefined for missing keys (no throw)", () => {
    expect(getValueAtPath(v1, "victim.middleName")).toBeUndefined();
    expect(getValueAtPath(v1, "nope.whatever")).toBeUndefined();
  });
  it("returns undefined for null/undefined input", () => {
    expect(getValueAtPath(null, "x")).toBeUndefined();
    expect(getValueAtPath(undefined, "x.y")).toBeUndefined();
  });
  it("supports bracket-indexed arrays", () => {
    expect(
      getValueAtPath(v1, "employment.employmentHistory[0].employerName"),
    ).toBe("Acme");
    expect(
      getValueAtPath(v1, "employment.employmentHistory[1].employerName"),
    ).toBe("Beta");
  });
  it("returns undefined for out-of-bounds index", () => {
    expect(
      getValueAtPath(v1, "employment.employmentHistory[5].employerName"),
    ).toBeUndefined();
  });
});

describe("migrateV1DraftToV2", () => {
  const mappings: FormAlignmentMapping[] = [
    {
      canonical_field_key: "victim_first_name",
      intake_field_path: "victim.firstName",
      mapping_purpose: "intake",
    },
    {
      canonical_field_key: "victim_last_name",
      intake_field_path: "victim.lastName",
      mapping_purpose: "intake",
    },
    {
      canonical_field_key: "victim_phone",
      intake_field_path: "victim.contact.phone",
      mapping_purpose: "intake",
    },
    {
      canonical_field_key: "losses_medical_hospital",
      intake_field_path: "losses.medicalHospital",
      mapping_purpose: "intake",
    },
    {
      canonical_field_key: "losses_counseling",
      intake_field_path: "losses.counseling",
      mapping_purpose: "intake",
    },
    // Non-intake purpose — should be ignored.
    {
      canonical_field_key: "victim_first_name_output",
      intake_field_path: "victim.firstName",
      mapping_purpose: "output",
    },
    // Null source path → skip.
    {
      canonical_field_key: "only_canonical",
      intake_field_path: null,
      mapping_purpose: "intake",
    },
    // Source value is null → skip.
    {
      canonical_field_key: "crime_crime_county",
      intake_field_path: "crime.crimeCounty",
      mapping_purpose: "intake",
    },
  ];

  it("maps nested v1 paths to flat canonical keys", () => {
    const v2 = migrateV1DraftToV2(v1, mappings);
    expect(v2.victim_first_name).toBe("Jane");
    expect(v2.victim_last_name).toBe("Doe");
    expect(v2.victim_phone).toBe("312-555-0101");
    expect(v2.losses_medical_hospital).toBe(true);
    expect(v2.losses_counseling).toBe(false);
  });

  it("ignores non-intake mappings", () => {
    const v2 = migrateV1DraftToV2(v1, mappings);
    expect(v2.victim_first_name_output).toBeUndefined();
  });

  it("skips mappings with null intake_field_path that don't resolve via canonical", () => {
    const v2 = migrateV1DraftToV2(v1, mappings);
    // canonical `only_canonical` doesn't exist in v1 → skipped
    expect(v2.only_canonical).toBeUndefined();
  });

  it("skips keys whose source value is null/undefined", () => {
    const v2 = migrateV1DraftToV2(v1, mappings);
    expect(Object.prototype.hasOwnProperty.call(v2, "crime_crime_county")).toBe(false);
  });

  it("returns {} for null/undefined payload", () => {
    expect(migrateV1DraftToV2(null, mappings)).toEqual({});
    expect(migrateV1DraftToV2(undefined, mappings)).toEqual({});
  });

  it("idempotent: running twice produces the same output", () => {
    const first = migrateV1DraftToV2(v1, mappings);
    const second = migrateV1DraftToV2(v1, mappings);
    expect(second).toEqual(first);
  });
});
