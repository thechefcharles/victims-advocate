/**
 * Domain 5.2 — Recommendation policy evaluator.
 *
 * Handles 3 recommendation actions:
 *   recommendation:generate — create a fresh RecommendationSet
 *   recommendation:view     — read a (cached or fresh) RecommendationSet
 *   recommendation:refresh  — force regeneration bypassing cache
 *
 * Access model:
 *   - Applicants can always generate/view/refresh their OWN recommendations.
 *     ownerId on the resource must match actor.userId.
 *   - Providers can browse non-personalized discovery recommendations
 *     (resourceType: "organization") — no ownerId check.
 *   - Unauthenticated users are denied.
 *   - Admins get ALLOW + auditRequired (platform governance).
 */

import type {
  PolicyActor,
  PolicyResource,
  PolicyContext,
  PolicyDecision,
} from "@/lib/server/policy/policyTypes";

function allow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: false };
}

function deny(message: string): PolicyDecision {
  return { allowed: false, reason: "INSUFFICIENT_ROLE", auditRequired: true, message };
}

function unauthenticated(): PolicyDecision {
  return {
    allowed: false,
    reason: "UNAUTHENTICATED",
    auditRequired: true,
    message: "Authentication required.",
  };
}

export async function evalRecommendation(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  switch (action) {
    case "recommendation:generate":
    case "recommendation:refresh": {
      if (actor.accountType === "applicant") {
        // Applicants can only generate their own recommendation set.
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("Applicants may only generate their own recommendations.");
        }
        return allow();
      }
      if (actor.accountType === "provider") {
        // Providers browse non-personalized discovery — no ownership check.
        return allow();
      }
      return deny("Access denied.");
    }

    case "recommendation:view": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("Applicants may only view their own recommendations.");
        }
        return allow();
      }
      if (actor.accountType === "provider") {
        return allow();
      }
      return deny("Access denied.");
    }

    default:
      return deny(`Unknown recommendation action: ${action}`);
  }
}
