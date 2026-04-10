/**
 * Domain 7.3 — AI Guidance serializer tests (5 tests)
 */

import { describe, it, expect } from "vitest";
import {
  serializeSessionForApplicant,
  serializeDraftForProvider,
  serializeEscalation,
  serializeLogForAdmin,
} from "@/lib/server/aiGuidance/aiGuidanceSerializer";
import { applyAIGovernanceGuardrails, resolveAIConstraintProfile } from "@/lib/server/aiGuidance/aiGuidanceService";
import type {
  AIEscalationDecision,
  AIGuidanceLog,
  AIGuidanceMessage,
  AIGuidanceSession,
  AdvocateCopilotDraft,
} from "@/lib/server/aiGuidance/aiGuidanceTypes";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";

function mockSession(): AIGuidanceSession {
  return {
    id: "s-1", actorUserId: "user-1", actorAccountType: "applicant",
    surfaceType: "applicant_general", linkedObjectType: null, linkedObjectId: null,
    status: "active", language: "en", escalationReason: null,
    createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
  };
}

function mockMessage(): AIGuidanceMessage {
  return {
    id: "m-1", sessionId: "s-1", actorType: "assistant",
    content: "Here's how you can complete your intake form.",
    contentType: "text",
    disclaimerFlags: ["This is general guidance, not legal advice."],
    createdAt: "2026-04-10T00:00:00Z",
  };
}

describe("ai guidance serializer", () => {
  it("applicant serializer is applicant-safe — no provider-internal data", () => {
    const view = serializeSessionForApplicant(mockSession(), [mockMessage()]);
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/actorUserId/);
    expect(json).not.toMatch(/actorAccountType/);
    expect(json).not.toMatch(/linkedObjectType/);
    expect(json).not.toMatch(/linkedObjectId/);
    expect(view.messages[0].content).toContain("intake form");
    expect(view.messages[0].disclaimerFlags).toContain("This is general guidance, not legal advice.");
  });

  it("provider serializer includes draft/review metadata with human_review_required", () => {
    const draft: AdvocateCopilotDraft = {
      id: "d-1", sessionId: "s-1", organizationId: "org-1", generatedByUserId: "u-1",
      draftType: "case_note", draftContent: "This is a draft note.",
      humanReviewRequired: true, status: "draft_generated",
      reviewedByUserId: null, reviewedAt: null,
      createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeDraftForProvider(draft);
    expect(view.humanReviewRequired).toBe(true);
    expect(view.draftType).toBe("case_note");
    expect(view.status).toBe("draft_generated");
  });

  it("escalation serializer includes crisis resources", () => {
    const decision: AIEscalationDecision = {
      escalationType: "distress_detected",
      reasonCode: "distress_detected",
      recommendedNextStep: "Please reach out to one of these support resources.",
      crisisResources: [
        { name: "National Domestic Violence Hotline", contact: "1-800-799-7233", available: "24/7" },
        { name: "Crisis Text Line", contact: "Text HOME to 741741", available: "24/7" },
      ],
      sessionStatus: "escalated",
    };
    const view = serializeEscalation(decision);
    expect(view.sessionStatus).toBe("escalated");
    expect(view.crisisResources.length).toBe(2);
    expect(view.crisisResources[0].contact).toBe("1-800-799-7233");
    // Must NOT contain: model internals, raw reason codes
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/reasonCode/);
    expect(json).not.toMatch(/escalationType/);
  });

  it("admin serializer includes event metadata, no raw message content", () => {
    const log: AIGuidanceLog = {
      id: "l-1", sessionId: "s-1", actorId: "user-1",
      eventType: "escalation_triggered",
      metadata: { escalation_type: "self_harm_risk" },
      createdAt: "2026-04-10T00:00:00Z",
    };
    const view = serializeLogForAdmin(log);
    expect(view.eventType).toBe("escalation_triggered");
    expect(view.metadata.escalation_type).toBe("self_harm_risk");
    // No raw message content field.
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/"content"/);
  });

  it("disclaimer text present in applicant-facing responses via guardrails", () => {
    const actor: PolicyActor = {
      userId: "u", accountType: "applicant", activeRole: null,
      tenantId: null, tenantType: null, isAdmin: false, supportMode: false, safetyModeEnabled: false,
    };
    const constraints = resolveAIConstraintProfile(actor, mockSession());
    const output = applyAIGovernanceGuardrails(
      "You should complete your intake form next.",
      constraints,
    );
    expect(output).toContain("not legal advice");
    // Certainty language stripped.
    const output2 = applyAIGovernanceGuardrails(
      "You will definitely qualify for compensation.",
      constraints,
    );
    expect(output2).not.toMatch(/definitely/i);
    expect(output2).toContain("may");
  });
});
