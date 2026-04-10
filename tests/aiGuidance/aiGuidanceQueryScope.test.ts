/**
 * Domain 7.3 — AI Guidance query scope tests (4 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeSessionForApplicant,
  serializeLogForAdmin,
  serializeDraftForProvider,
} from "@/lib/server/aiGuidance/aiGuidanceSerializer";
import { resolveAIGuidanceContext } from "@/lib/server/aiGuidance/aiGuidanceService";
import type { AIGuidanceSession, AIGuidanceMessage, AIGuidanceLog, AdvocateCopilotDraft } from "@/lib/server/aiGuidance/aiGuidanceTypes";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

function mockSession(): AIGuidanceSession {
  return {
    id: "s-1", actorUserId: "user-1", actorAccountType: "applicant",
    surfaceType: "applicant_general", linkedObjectType: null, linkedObjectId: null,
    status: "active", language: "en", escalationReason: null,
    createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
  };
}

function mockMessage(overrides: Partial<AIGuidanceMessage> = {}): AIGuidanceMessage {
  return {
    id: "m-1", sessionId: "s-1", actorType: "assistant",
    content: "I can help with that.", contentType: "text",
    disclaimerFlags: ["This is general guidance, not legal advice."],
    createdAt: "2026-04-10T00:00:00Z",
    ...overrides,
  };
}

describe("ai guidance query scope", () => {
  it("applicant sees only own sessions — serializer excludes internal fields", () => {
    const view = serializeSessionForApplicant(mockSession(), [mockMessage()]);
    const json = JSON.stringify(view);
    // Must NOT contain: actorUserId, actorAccountType, linkedObjectType/Id
    expect(json).not.toMatch(/actorUserId/);
    expect(json).not.toMatch(/actorAccountType/);
    // Session status and messages are included.
    expect(view.status).toBe("active");
    expect(view.messages.length).toBe(1);
    expect(view.messages[0].disclaimerFlags.length).toBeGreaterThan(0);
  });

  it("provider sees draft with human_review_required prominently", () => {
    const draft: AdvocateCopilotDraft = {
      id: "d-1", sessionId: "s-1", organizationId: "org-1", generatedByUserId: "u-1",
      draftType: "case_note", draftContent: "Draft content.", humanReviewRequired: true,
      status: "draft_generated", reviewedByUserId: null, reviewedAt: null,
      createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeDraftForProvider(draft);
    expect(view.humanReviewRequired).toBe(true);
    expect(view.draftContent).toBe("Draft content.");
    // Must NOT contain: organizationId, generatedByUserId
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/organizationId/);
    expect(json).not.toMatch(/generatedByUserId/);
  });

  it("admin logs scoped correctly — no raw message content", () => {
    const log: AIGuidanceLog = {
      id: "l-1", sessionId: "s-1", actorId: "user-1",
      eventType: "message_sent", metadata: { content_type: "text" },
      createdAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeLogForAdmin(log);
    const json = JSON.stringify(view);
    // Must NOT contain raw message content.
    expect(json).not.toMatch(/I can help/);
    expect(json).not.toMatch(/content":/);
    // But includes event metadata.
    expect(view.eventType).toBe("message_sent");
    expect(view.metadata).toEqual({ content_type: "text" });
  });

  it("workflow context bundle excludes unauthorized fields", async () => {
    const actor: PolicyActor = {
      userId: "user-1", accountType: "applicant", activeRole: null,
      tenantId: null, tenantType: null, isAdmin: false, supportMode: false, safetyModeEnabled: false,
    };
    const ctx = await resolveAIGuidanceContext(actor, mockSession());
    const json = JSON.stringify(ctx);
    // Must NOT contain: raw_data, internal_notes, provider_scores, case_notes
    expect(json).not.toMatch(/raw_data/);
    expect(json).not.toMatch(/internal_notes/);
    expect(json).not.toMatch(/provider_score/);
    // Only contains safe summary fields.
    expect(ctx.surfaceType).toBe("applicant_general");
    expect(ctx.language).toBe("en");
  });
});
