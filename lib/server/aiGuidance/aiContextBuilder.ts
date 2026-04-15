/**
 * Domain 7.3 — AI Guidance context + mode resolution.
 *
 * Bridges the AI Guidance session / actor state to the orchestrator's
 * `AIModeKey` + `AIContext` shape. Pure helpers — no DB access.
 */

import type { AIModeKey, AIContext } from "@/lib/server/aiOps";
import type { PolicyActor } from "@/lib/server/policy/policyTypes";
import type { AIGuidanceSession } from "./aiGuidanceTypes";

export function resolveAIMode(session: AIGuidanceSession): AIModeKey {
  switch (session.surfaceType) {
    case "applicant_intake":
      return "applicant_guidance";
    case "applicant_case":
      return "applicant_guidance";
    case "applicant_general":
      return "applicant_guidance";
    case "provider_copilot":
      return "provider_copilot";
    case "admin_inspection":
      return "admin_evaluation";
    default:
      return "applicant_guidance";
  }
}

export function buildAIContext(
  session: AIGuidanceSession,
  actor: PolicyActor,
): AIContext {
  return {
    stateCode: undefined, // populated from intake when wired
    caseId: session.linkedObjectType === "case" ? session.linkedObjectId : null,
    intakeSessionId:
      session.linkedObjectType === "intake_session" ? session.linkedObjectId : null,
    organizationId: actor.tenantId ?? null,
    locale: (session.language === "es" ? "es" : "en") as "en" | "es",
  };
}
