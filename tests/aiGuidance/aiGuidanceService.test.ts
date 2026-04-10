/**
 * Domain 7.3 — AI Guidance service tests (8 tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabaseAdmin", () => ({ getSupabaseAdmin: () => ({}) as never }));
vi.mock("@/lib/server/audit/logEvent", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));

vi.mock("@/lib/server/aiGuidance/aiGuidanceRepository", () => ({
  insertSession: vi.fn(),
  getSessionById: vi.fn(),
  updateSessionStatus: vi.fn(),
  insertMessage: vi.fn(),
  listMessagesForSession: vi.fn().mockResolvedValue([]),
  insertLog: vi.fn().mockResolvedValue({ id: "log-1" }),
  insertDraft: vi.fn(),
  updateDraftStatus: vi.fn(),
  listLogsForSession: vi.fn(),
  listSessionsForUser: vi.fn(),
}));

import * as repo from "@/lib/server/aiGuidance/aiGuidanceRepository";
import {
  createAIGuidanceSession,
  sendAIGuidanceMessage,
  resolveAIGuidanceContext,
  resolveAIConstraintProfile,
  applyAIGovernanceGuardrails,
} from "@/lib/server/aiGuidance/aiGuidanceService";
import { explainWorkflowText, generateWorkflowChecklist } from "@/lib/server/aiGuidance/aiExplanationService";
import { escalateAIGuidanceSession } from "@/lib/server/aiGuidance/aiEscalationService";
import { generateAdvocateCopilotDraft } from "@/lib/server/aiGuidance/advocateCopilotService";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type { AIGuidanceSession, AdvocateCopilotDraft } from "@/lib/server/aiGuidance/aiGuidanceTypes";

function makeActor(overrides: Partial<PolicyActor> = {}): PolicyActor {
  return {
    userId: "user-1", accountType: "applicant", activeRole: null,
    tenantId: null, tenantType: null, isAdmin: false, supportMode: false, safetyModeEnabled: false,
    ...overrides,
  };
}

function mockSession(overrides: Partial<AIGuidanceSession> = {}): AIGuidanceSession {
  return {
    id: "s-1", actorUserId: "user-1", actorAccountType: "applicant",
    surfaceType: "applicant_general", linkedObjectType: null, linkedObjectId: null,
    status: "active", language: "en", escalationReason: null,
    createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("ai guidance service", () => {
  it("createAIGuidanceSession creates with correct surface_type", async () => {
    vi.mocked(repo.insertSession).mockResolvedValueOnce(mockSession({ surfaceType: "applicant_intake" }));
    const session = await createAIGuidanceSession({
      actor: makeActor(), surfaceType: "applicant_intake",
    });
    expect(session.surfaceType).toBe("applicant_intake");
    expect(session.status).toBe("active");
    expect(repo.insertLog).toHaveBeenCalledTimes(1);
  });

  it("sendAIGuidanceMessage runs escalation check FIRST — distress triggers escalation", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(mockSession());
    vi.mocked(repo.insertMessage).mockResolvedValue({
      id: "m-1", sessionId: "s-1", actorType: "system", content: "Please reach out...",
      contentType: "escalation", disclaimerFlags: ["crisis_resources_provided"],
      createdAt: "2026-04-10T00:00:00Z",
    });
    vi.mocked(repo.updateSessionStatus).mockResolvedValueOnce(mockSession({ status: "escalated" }));

    const result = await sendAIGuidanceMessage({
      actor: makeActor(), sessionId: "s-1", content: "I want to kill myself",
    });

    expect(result.escalation).toBeTruthy();
    expect(result.escalation?.sessionStatus).toBe("escalated");
    expect(result.escalation?.crisisResources.length).toBeGreaterThanOrEqual(3);
    // Model API was NOT called — escalation short-circuited.
    expect(repo.listMessagesForSession).not.toHaveBeenCalled();
  });

  it("sendAIGuidanceMessage proceeds to model when no distress detected", async () => {
    vi.mocked(repo.getSessionById).mockResolvedValueOnce(mockSession());
    vi.mocked(repo.insertMessage).mockResolvedValue({
      id: "m-2", sessionId: "s-1", actorType: "assistant",
      content: "I'm here to help.", contentType: "text",
      disclaimerFlags: ["This is general guidance, not legal advice."],
      createdAt: "2026-04-10T00:00:00Z",
    });

    const result = await sendAIGuidanceMessage({
      actor: makeActor(), sessionId: "s-1", content: "How do I fill out the intake form?",
    });

    expect(result.escalation).toBeUndefined();
    expect(result.message.actorType).toBe("assistant");
    expect(repo.insertLog).toHaveBeenCalled();
  });

  it("resolveAIGuidanceContext strips unauthorized fields — returns safe summaries only", async () => {
    const ctx = await resolveAIGuidanceContext(makeActor(), mockSession());
    expect(ctx.actorUserId).toBe("user-1");
    expect(ctx.surfaceType).toBe("applicant_general");
    // v1: intake/case/workflow are null (not yet wired). The important thing
    // is that the context does NOT contain raw data fields.
    const json = JSON.stringify(ctx);
    expect(json).not.toMatch(/raw_data/);
    expect(json).not.toMatch(/internal_notes/);
    expect(json).not.toMatch(/password/);
  });

  it("explainWorkflowText returns plain-language output with disclaimer", () => {
    const result = explainWorkflowText({
      topic: "intake completion",
      context: { actorUserId: "u", surfaceType: "applicant_general", language: "en", intakeStatus: null, caseStatus: null, workflowSummary: null },
      constraints: resolveAIConstraintProfile(makeActor(), mockSession()),
    });
    expect(result.explanation).toContain("intake completion");
    expect(result.disclaimer).toContain("not legal advice");
  });

  it("generateWorkflowChecklist returns checklist from context", () => {
    const result = generateWorkflowChecklist({
      context: {
        actorUserId: "u", surfaceType: "applicant_general", language: "en",
        intakeStatus: { step: "personal_info", completionPct: 40 },
        caseStatus: null, workflowSummary: null,
      },
    });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].label).toContain("intake");
    expect(result.disclaimer).toContain("not legal advice");
  });

  it("generateAdvocateCopilotDraft always sets human_review_required = true", async () => {
    vi.mocked(repo.insertDraft).mockResolvedValueOnce({
      id: "d-1", sessionId: "s-1", organizationId: "org-1", generatedByUserId: "u-1",
      draftType: "case_note", draftContent: "Draft...", humanReviewRequired: true,
      status: "draft_generated", reviewedByUserId: null, reviewedAt: null,
      createdAt: "2026-04-10T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z",
    });

    const draft = await generateAdvocateCopilotDraft({
      sessionId: "s-1", organizationId: "org-1", generatedByUserId: "u-1",
      draftType: "case_note", draftContent: "Draft...",
    });
    expect(draft.humanReviewRequired).toBe(true);
  });

  it("escalateAIGuidanceSession sets status to escalated + logs event", async () => {
    vi.mocked(repo.updateSessionStatus).mockResolvedValueOnce(mockSession({ status: "escalated" }));
    const decision = await escalateAIGuidanceSession({
      sessionId: "s-1", actorId: "user-1", escalationType: "distress_detected",
    });
    expect(decision.sessionStatus).toBe("escalated");
    expect(decision.crisisResources.length).toBeGreaterThanOrEqual(3);
    expect(repo.updateSessionStatus).toHaveBeenCalledWith("s-1", "escalated", expect.anything(), expect.anything());
    expect(repo.insertLog).toHaveBeenCalled();
  });
});
