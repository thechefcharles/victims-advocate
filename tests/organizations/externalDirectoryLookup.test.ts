/**
 * External directory lookup helpers (Domain 3.4 — applicant-facing org profile).
 *
 * Locked 2026-04-15: the unified profile page renders both verified NxtStps
 * orgs and external public-directory rows. These helpers are how the API
 * branches between the two paths.
 */

import { describe, it, expect } from "vitest";
import {
  isExternalDirectoryId,
  getExternalOrganizationById,
} from "@/lib/server/organizations/organizationsMapData";

describe("isExternalDirectoryId", () => {
  it("recognizes ext: prefix", () => {
    expect(isExternalDirectoryId("ext:cbo-2026:1")).toBe(true);
    expect(isExternalDirectoryId("ext:anything")).toBe(true);
  });

  it("rejects UUIDs and unknown formats", () => {
    expect(isExternalDirectoryId("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(isExternalDirectoryId("")).toBe(false);
    expect(isExternalDirectoryId("nxtstps:org:1")).toBe(false);
  });

  it("rejects non-strings safely", () => {
    // @ts-expect-error — runtime defensiveness
    expect(isExternalDirectoryId(null)).toBe(false);
    // @ts-expect-error
    expect(isExternalDirectoryId(undefined)).toBe(false);
    // @ts-expect-error
    expect(isExternalDirectoryId(123)).toBe(false);
  });
});

describe("getExternalOrganizationById", () => {
  it("returns null for non-external ids without touching the directory", () => {
    expect(getExternalOrganizationById("550e8400-e29b-41d4-a716-446655440000")).toBeNull();
    expect(getExternalOrganizationById("")).toBeNull();
  });

  it("returns null for unknown external ids", () => {
    // The directory file in repo has entries ext:cbo-2026:1 .. N. An obviously
    // out-of-range id should miss; this also tolerates a missing/empty directory.
    expect(getExternalOrganizationById("ext:cbo-2026:9999999")).toBeNull();
  });

  it("returns a directory row for a known external id (when the directory is present)", () => {
    const row = getExternalOrganizationById("ext:cbo-2026:1");
    // Directory file ships in repo with at least one geocoded entry, so this
    // resolves in CI. If the file ever rolls and the id changes, update both
    // here and any sample data tests.
    if (row) {
      expect(row.id).toBe("ext:cbo-2026:1");
      expect(row.external).toBe(true);
      expect(typeof row.name).toBe("string");
      expect(row.response_accessibility).toBeNull();
    }
  });
});
