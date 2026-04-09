/**
 * Domain 2.4: Translation / i18n — explanation service tests.
 *
 * Covers SAFETY tests 13-17 (architect's hard rules) plus end-to-end smoke.
 *
 * Key invariants:
 *   - source text NEVER persisted (verified by inspecting insertExplanationRequest call)
 *   - applyOutputGuardrails returns SAFE_FALLBACK when blacklist hit
 *   - DEFAULT_DISCLAIMER auto-appended when missing
 *   - MAX_EXPLANATION_LENGTH truncation enforced
 *   - failed runs persisted with status='failed' and failure_reason
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/server/audit/logEvent", () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/policy/policyEngine", () => ({
  can: vi.fn().mockResolvedValue({ allowed: true, reason: "ALLOWED", auditRequired: false }),
}));

vi.mock("@/lib/server/knowledge", () => ({
  getKnowledgeForExplain: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/config", () => ({
  config: {
    openaiApiKey: "test-key",
  },
}));

vi.mock("@/lib/server/translation/translationRepository", () => ({
  insertExplanationRequest: vi.fn(),
  updateExplanationRequest: vi.fn(),
  listExplanationRequests: vi.fn(),
}));

import * as repo from "@/lib/server/translation/translationRepository";
import {
  applyOutputGuardrails,
  EXPLANATION_BLACKLIST,
  SAFE_FALLBACK_MESSAGE,
} from "@/lib/server/translation/outputGuardrails";
import { hashExplanationSourceText } from "@/lib/server/translation/hashUtils";
import {
  DEFAULT_DISCLAIMER,
  MAX_EXPLANATION_LENGTH,
} from "@/lib/server/translation/translationTypes";
import type { AuthContext } from "@/lib/server/auth/context";
import type { ExplanationRequestRecord } from "@/lib/server/translation/translationTypes";

function applicantCtx(): AuthContext {
  return {
    user: { id: "applicant-1", email: "a@b.com" },
    userId: "applicant-1",
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

function makeRequestRow(
  overrides: Partial<ExplanationRequestRecord> = {},
): ExplanationRequestRecord {
  return {
    id: "req-1",
    user_id: "applicant-1",
    workflow_key: "translator",
    context_type: "general",
    field_key: null,
    state_code: null,
    source_text_hash: "abc123",
    source_text_length: 42,
    explanation_text: null,
    disclaimer: null,
    model: "gpt-4o-mini",
    status: "pending",
    failure_reason: null,
    created_at: "2026-04-08T00:00:00Z",
    completed_at: null,
    ...overrides,
  };
}

const fakeSupabase = {} as unknown as import("@supabase/supabase-js").SupabaseClient;

// ---------------------------------------------------------------------------
// Pure helper tests (no module import needed)
// ---------------------------------------------------------------------------

describe("applyOutputGuardrails", () => {
  it("13. returns safe=false and SAFE_FALLBACK when blacklist phrase hit", () => {
    const result = applyOutputGuardrails(
      "Based on your situation, you will qualify for compensation.",
    );
    expect(result.safe).toBe(false);
    expect(result.output).toBe(SAFE_FALLBACK_MESSAGE);
    expect(result.trippedPhrase).toBe("you will qualify");
  });

  it("14. catches eligibility-certainty phrases case-insensitively", () => {
    const result = applyOutputGuardrails("YOU WILL RECEIVE benefits within 30 days.");
    expect(result.safe).toBe(false);
    expect(result.output).toBe(SAFE_FALLBACK_MESSAGE);
  });

  it("returns safe=true and unchanged output when no blacklist hit", () => {
    const explanation =
      "This question asks about your current address. We use it to send mail.";
    const result = applyOutputGuardrails(explanation);
    expect(result.safe).toBe(true);
    expect(result.output).toBe(explanation);
  });

  it("EXPLANATION_BLACKLIST contains the architect's required phrases", () => {
    expect(EXPLANATION_BLACKLIST).toContain("you will qualify");
    expect(EXPLANATION_BLACKLIST).toContain("you will get");
    expect(EXPLANATION_BLACKLIST).toContain("you should apply");
    expect(EXPLANATION_BLACKLIST).toContain("you definitely");
    expect(EXPLANATION_BLACKLIST).toContain("you are eligible");
    expect(EXPLANATION_BLACKLIST).toContain("you will receive");
  });
});

describe("hashExplanationSourceText", () => {
  it("returns a deterministic sha256 hex", async () => {
    const a = await hashExplanationSourceText("hello world");
    const b = await hashExplanationSourceText("hello world");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different inputs produce different hashes", async () => {
    const a = await hashExplanationSourceText("text one");
    const b = await hashExplanationSourceText("text two");
    expect(a).not.toBe(b);
  });
});

describe("explanationService.explainText — persistence safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default OpenAI mock — return a benign response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                "This question asks about your contact details so the office can reach you.",
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;
  });

  it("15. insertExplanationRequest is called with source_text_hash + source_text_length, NEVER source_text", async () => {
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValueOnce(makeRequestRow());

    const { explainText } = await import("@/lib/server/translation/explanationService");
    await explainText(
      applicantCtx(),
      {
        sourceText: "What does this field mean?",
        contextType: "intake_question",
        workflowKey: "compensation_intake",
      },
      fakeSupabase,
    );

    expect(repo.insertExplanationRequest).toHaveBeenCalledTimes(1);
    const call = vi.mocked(repo.insertExplanationRequest).mock.calls[0]?.[1];
    expect(call).toBeDefined();
    expect(call?.source_text_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(call?.source_text_length).toBe("What does this field mean?".length);
    // CRITICAL: no raw text field on the insert payload
    expect(call as Record<string, unknown>).not.toHaveProperty("source_text");
    expect(call as Record<string, unknown>).not.toHaveProperty("sourceText");
  });

  it("16. auto-appends DEFAULT_DISCLAIMER when model output lacks one", async () => {
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValueOnce(makeRequestRow());

    const { explainText } = await import("@/lib/server/translation/explanationService");
    const result = await explainText(
      applicantCtx(),
      {
        sourceText: "Field?",
        contextType: "general",
        workflowKey: "translator",
      },
      fakeSupabase,
    );

    expect(result.disclaimer).toBe(DEFAULT_DISCLAIMER);
  });

  it("does NOT append disclaimer when model output already mentions 'general information'", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "This is general information about the form." } }],
      }),
    }) as unknown as typeof fetch;
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValueOnce(makeRequestRow());

    const { explainText } = await import("@/lib/server/translation/explanationService");
    const result = await explainText(
      applicantCtx(),
      { sourceText: "Field?", contextType: "general", workflowKey: "translator" },
      fakeSupabase,
    );
    expect(result.disclaimer).toBeUndefined();
  });

  it("17. truncates output past MAX_EXPLANATION_LENGTH", async () => {
    const longText = "x".repeat(MAX_EXPLANATION_LENGTH + 200);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: longText } }] }),
    }) as unknown as typeof fetch;
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValueOnce(makeRequestRow());

    const { explainText } = await import("@/lib/server/translation/explanationService");
    const result = await explainText(
      applicantCtx(),
      { sourceText: "Field?", contextType: "general", workflowKey: "translator" },
      fakeSupabase,
    );
    expect(result.explanation.length).toBe(MAX_EXPLANATION_LENGTH);
    expect(result.explanation.endsWith("...")).toBe(true);
  });

  it("blacklist post-processor: model returns 'you will qualify' → SAFE_FALLBACK persisted", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Based on this, you will qualify for full benefits." } }],
      }),
    }) as unknown as typeof fetch;
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValueOnce(makeRequestRow());

    const { explainText } = await import("@/lib/server/translation/explanationService");
    const result = await explainText(
      applicantCtx(),
      { sourceText: "Field?", contextType: "general", workflowKey: "translator" },
      fakeSupabase,
    );
    expect(result.explanation).toBe(SAFE_FALLBACK_MESSAGE);
    // Disclaimer still appended on top of fallback
    expect(result.disclaimer).toBe(DEFAULT_DISCLAIMER);
  });

  it("on OpenAI error: updateExplanationRequest called with status='failed' and failure_reason", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "service unavailable",
    }) as unknown as typeof fetch;
    vi.mocked(repo.insertExplanationRequest).mockResolvedValueOnce(makeRequestRow());
    vi.mocked(repo.updateExplanationRequest).mockResolvedValue(
      makeRequestRow({ status: "failed" }),
    );

    const { explainText } = await import("@/lib/server/translation/explanationService");
    await expect(
      explainText(
        applicantCtx(),
        { sourceText: "Field?", contextType: "general", workflowKey: "translator" },
        fakeSupabase,
      ),
    ).rejects.toThrow();

    const calls = vi.mocked(repo.updateExplanationRequest).mock.calls;
    const failedCall = calls.find((c) => c[2]?.status === "failed");
    expect(failedCall).toBeDefined();
    expect(failedCall?.[2]?.failure_reason).toBeDefined();
  });
});
