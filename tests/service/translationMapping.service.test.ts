/**
 * Domain 2.4: Translation / i18n — translation mapping service tests.
 *
 * Covers state/version + mapping behavior:
 *   - resolveCanonicalValue (pure function)
 *   - normalizeStructuredPayload (stub — pass-through per Spanish enum audit)
 *   - publishTranslationMappingSet transitions via workflow engine + validation gate
 *   - createTranslationMappingSet increments version_number
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: true }),
}));

vi.mock("@/lib/server/workflow/engine", () => ({
  transition: vi.fn().mockResolvedValue({
    success: true,
    transitionId: "txn-1",
    fromState: "draft",
    toState: "active",
  }),
}));

vi.mock("@/lib/server/translation/translationRepository", () => ({
  getActiveMappingSet: vi.fn(),
  getMappingSetById: vi.fn(),
  getMaxMappingSetVersionNumber: vi.fn().mockResolvedValue(0),
  listMappingSets: vi.fn(),
  insertMappingSet: vi.fn(),
  updateMappingSetStatus: vi.fn(),
  insertTranslationMapping: vi.fn(),
  getMappingsBySetId: vi.fn().mockResolvedValue([]),
}));

import * as repo from "@/lib/server/translation/translationRepository";
import { transition } from "@/lib/server/workflow/engine";
import {
  resolveCanonicalValue,
  normalizeStructuredPayload,
} from "@/lib/server/translation/translationMappingService";
import type { AuthContext } from "@/lib/server/auth/context";
import type {
  TranslationMappingSetRecordV2,
  TranslationMappingRecord,
} from "@/lib/server/translation/translationTypes";

function makeSet(
  overrides: Partial<TranslationMappingSetRecordV2> = {},
): TranslationMappingSetRecordV2 {
  return {
    id: "set-1",
    state_workflow_config_id: null,
    state_code: "IL",
    locale: "es",
    status: "draft",
    version_number: 1,
    display_name: "IL Spanish v1",
    published_at: null,
    deprecated_at: null,
    created_by: "admin-1",
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function makeMapping(
  overrides: Partial<TranslationMappingRecord> = {},
): TranslationMappingRecord {
  return {
    id: "m-1",
    mapping_set_id: "set-1",
    source_value: "víctima",
    canonical_value: "victim",
    field_context: "applicant_type",
    locale: "es",
    transform_type: "exact_match",
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

function adminCtx(): AuthContext {
  return {
    user: { id: "admin-1", email: "admin@nxtstps.com" },
    userId: "admin-1",
    role: "platform_admin",
    orgId: null,
    orgRole: null,
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: true,
    emailVerified: true,
    accountStatus: "active",
    accountType: "platform_admin",
    safetyModeEnabled: false,
  } as unknown as AuthContext;
}

const fakeSupabase = {} as unknown as import("@supabase/supabase-js").SupabaseClient;

// ---------------------------------------------------------------------------
// Pure functions
// ---------------------------------------------------------------------------

describe("resolveCanonicalValue", () => {
  it("returns canonical_value for exact match in same field_context", () => {
    const mappings = [makeMapping()];
    expect(resolveCanonicalValue("víctima", "applicant_type", mappings)).toBe("victim");
  });

  it("returns sourceValue unchanged when no mapping found", () => {
    const mappings = [makeMapping()];
    expect(resolveCanonicalValue("unknown", "applicant_type", mappings)).toBe("unknown");
  });

  it("does not cross field_context boundaries", () => {
    const mappings = [makeMapping({ field_context: "gender" })];
    expect(resolveCanonicalValue("víctima", "applicant_type", mappings)).toBe("víctima");
  });
});

describe("normalizeStructuredPayload", () => {
  it("is a pass-through stub in v1 (Spanish enum audit found zero hits)", () => {
    const payload = { victim: { gender: "female" }, contact: { language: "es" } };
    const result = normalizeStructuredPayload(payload, []);
    expect(result).toBe(payload);
  });
});

// ---------------------------------------------------------------------------
// Mutating service tests
// ---------------------------------------------------------------------------

describe("createTranslationMappingSet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("increments version_number based on max existing", async () => {
    vi.mocked(repo.getMaxMappingSetVersionNumber).mockResolvedValueOnce(2);
    vi.mocked(repo.insertMappingSet).mockResolvedValueOnce(makeSet({ version_number: 3 }));

    const { createTranslationMappingSet } = await import(
      "@/lib/server/translation/translationMappingService"
    );
    const result = await createTranslationMappingSet(
      adminCtx(),
      { state_code: "IL", locale: "es", display_name: "IL v3" },
      fakeSupabase,
    );

    expect(repo.insertMappingSet).toHaveBeenCalledWith(
      fakeSupabase,
      expect.objectContaining({ version_number: 3 }),
    );
    expect(result.version_number).toBe(3);
    expect(result.status).toBe("draft");
  });
});

describe("publishTranslationMappingSet", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates that mappings exist before publishing", async () => {
    vi.mocked(repo.getMappingSetById).mockResolvedValueOnce(makeSet({ status: "draft" }));
    vi.mocked(repo.getMappingsBySetId).mockResolvedValueOnce([]);

    const { publishTranslationMappingSet } = await import(
      "@/lib/server/translation/translationMappingService"
    );
    await expect(
      publishTranslationMappingSet(adminCtx(), "set-1", fakeSupabase),
    ).rejects.toThrow(/zero mappings/);

    expect(transition).not.toHaveBeenCalled();
  });

  it("transitions draft → active and persists published_at", async () => {
    vi.mocked(repo.getMappingSetById).mockResolvedValueOnce(makeSet({ status: "draft" }));
    vi.mocked(repo.getMappingsBySetId).mockResolvedValue([makeMapping()]);
    vi.mocked(repo.updateMappingSetStatus).mockResolvedValueOnce(
      makeSet({ status: "active", published_at: "2026-04-08T00:00:00Z" }),
    );

    const { publishTranslationMappingSet } = await import(
      "@/lib/server/translation/translationMappingService"
    );
    const result = await publishTranslationMappingSet(adminCtx(), "set-1", fakeSupabase);

    expect(transition).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "translation_mapping_set_status",
        toState: "active",
      }),
      fakeSupabase,
    );
    expect(result.status).toBe("active");
  });
});
