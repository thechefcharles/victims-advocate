/**
 * Domain 2.4: Translation / i18n — locale preference service tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/server/translation/translationRepository", () => ({
  getLocalePreference: vi.fn(),
  upsertLocalePreference: vi.fn(),
}));

import * as repo from "@/lib/server/translation/translationRepository";
import type { AuthContext } from "@/lib/server/auth/context";
import type { LocalePreferenceRecord } from "@/lib/server/translation/translationTypes";

function ctx(): AuthContext {
  return {
    user: { id: "user-1", email: "u@x.com" },
    userId: "user-1",
    role: "victim",
    orgId: null,
    orgRole: null,
    affiliatedCatalogEntryId: null,
    organizationCatalogEntryId: null,
    isAdmin: false,
    emailVerified: true,
    accountStatus: "active",
    accountType: "applicant",
    safetyModeEnabled: false,
  } as unknown as AuthContext;
}

function makeRow(
  overrides: Partial<LocalePreferenceRecord> = {},
): LocalePreferenceRecord {
  return {
    id: "lp-1",
    user_id: "user-1",
    locale: "en",
    updated_at: "2026-04-01T00:00:00Z",
    ...overrides,
  };
}

const fakeSupabase = {} as unknown as import("@supabase/supabase-js").SupabaseClient;

describe("localePreferenceService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("18. updateLocalePreference upserts and returns serialized view", async () => {
    vi.mocked(repo.upsertLocalePreference).mockResolvedValueOnce(makeRow({ locale: "es" }));

    const { updateLocalePreference } = await import(
      "@/lib/server/translation/localePreferenceService"
    );
    const result = await updateLocalePreference(ctx(), "es", fakeSupabase);

    expect(repo.upsertLocalePreference).toHaveBeenCalledWith(fakeSupabase, "user-1", "es");
    expect(result).toEqual({ locale: "es" });
  });

  it("19. getLocalePreference returns the stored locale or null", async () => {
    vi.mocked(repo.getLocalePreference).mockResolvedValueOnce(makeRow({ locale: "es" }));

    const { getLocalePreference } = await import(
      "@/lib/server/translation/localePreferenceService"
    );
    const result = await getLocalePreference(ctx(), fakeSupabase);
    expect(result).toEqual({ locale: "es" });
  });

  it("getLocalePreference returns null when no row exists", async () => {
    vi.mocked(repo.getLocalePreference).mockResolvedValueOnce(null);

    const { getLocalePreference } = await import(
      "@/lib/server/translation/localePreferenceService"
    );
    const result = await getLocalePreference(ctx(), fakeSupabase);
    expect(result).toBeNull();
  });
});
