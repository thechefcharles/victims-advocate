/**
 * Domain 7.3 — AI Guidance policy evaluator.
 *
 * Handles 11 AI guidance actions. Key rules:
 *   - Applicants can only access their OWN sessions
 *   - Providers can only generate drafts for their OWN org workflows
 *   - Agency gets NO applicant-level AI guidance by default
 *   - Admin can inspect logs (with auditRequired)
 */

import type {
  PolicyActor,
  PolicyContext,
  PolicyDecision,
  PolicyResource,
} from "@/lib/server/policy/policyTypes";

function allow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: false };
}

function deny(message: string): PolicyDecision {
  return { allowed: false, reason: "INSUFFICIENT_ROLE", auditRequired: true, message };
}

function unauthenticated(): PolicyDecision {
  return { allowed: false, reason: "UNAUTHENTICATED", auditRequired: true, message: "Authentication required." };
}

const PROVIDER_DRAFT_ROLES = new Set(["org_owner", "program_manager", "supervisor", "victim_advocate"]);

export async function evalAIGuidance(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  switch (action) {
    case "ai_guidance.session.create":
    case "ai_guidance.session.view":
    case "ai_guidance.message.send":
    case "ai_guidance.explain":
    case "ai_guidance.intake.assist":
    case "ai_guidance.checklist.generate":
    case "ai_guidance.status.summarize":
    case "ai_guidance.resource.recommend":
    case "ai_guidance.escalate": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("You can only access your own AI guidance sessions.");
        }
        return allow();
      }
      if (actor.accountType === "provider") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("You can only access your own AI guidance sessions.");
        }
        return allow();
      }
      if (actor.accountType === "agency") {
        return deny("Agency accounts do not have access to applicant-level AI guidance.");
      }
      return deny("Access denied.");
    }

    case "ai_guidance.draft.generate": {
      if (actor.accountType !== "provider") {
        return deny("Only provider accounts can generate copilot drafts.");
      }
      if (!actor.activeRole || !PROVIDER_DRAFT_ROLES.has(actor.activeRole)) {
        return deny("Provider role required to generate drafts.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only generate drafts for your own organization's workflows.");
      }
      return allow();
    }

    case "ai_guidance.log.view_admin": {
      return deny("AI guidance log inspection is platform-admin only.");
    }

    default:
      return deny(`Unknown AI guidance action: ${action}`);
  }
}
