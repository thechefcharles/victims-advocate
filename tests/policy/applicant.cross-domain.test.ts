/**
 * Domain 3.1 — Applicant Domain: cross-domain integration tests.
 *
 * Tests 30–32 from the analysis test plan.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getSupabaseAdmin: vi.fn(() => ({})),
}));

describe("Domain 3.1 — Cross-domain Integration (3 tests)", () => {
  // Test 30: resolveApplicantByUserId reads from applicant_profiles, not profiles.personal_info
  it("30. resolveApplicantByUserId queries applicant_profiles table", async () => {
    const { resolveApplicantByUserId } = await import(
      "@/lib/server/applicant/applicantProfileRepository"
    );

    let queriedTable: string | null = null;
    const mockSupa = {
      from: vi.fn((table: string) => {
        queriedTable = table;
        return mockSupa;
      }),
      select: vi.fn(() => mockSupa),
      eq: vi.fn(() => mockSupa),
      maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    };

    await resolveApplicantByUserId("some-user-id", mockSupa as any);
    expect(queriedTable).toBe("applicant_profiles");
  });

  // Test 31: safetyModeEnabled from user_safety_settings propagates through defaultSafetyPreference
  it("31. defaultSafetyPreference initializes safetyModeEnabled=false (safe default)", async () => {
    const { defaultSafetyPreference } = await import(
      "@/lib/server/applicant/safetyPreferenceService"
    );

    const defaults = defaultSafetyPreference("user-1");
    // Safety mode starts disabled by default
    expect(defaults.safety_mode_enabled).toBe(false);
    // But notification suppression defaults to true (safer default)
    expect(defaults.suppress_notification_previews).toBe(true);
  });

  // Test 32: safety settings shim (settings.ts) back-compat — same shape as before
  it("32. lib/server/safety/settings.ts shim exports same function names as before", async () => {
    const safetySettings = await import("@/lib/server/safety/settings");

    // All original exports must still be present
    expect(typeof safetySettings.defaultSafetySettings).toBe("function");
    expect(typeof safetySettings.getSafetySettings).toBe("function");
    expect(typeof safetySettings.upsertSafetySettings).toBe("function");
    expect(typeof safetySettings.isSafetyModeEnabled).toBe("function");
    expect(typeof safetySettings.getSafeNotificationMode).toBe("function");
  });
});
