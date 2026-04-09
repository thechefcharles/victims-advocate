/**
 * Domain 3.1 — Applicant Domain: policy evaluator.
 *
 * Handles all 16 policy actions for the applicant domain resource types:
 *   applicant_profile, applicant_preference, safety_preference,
 *   trusted_helper_access, applicant_bookmark
 *
 * The engine contract (Decision 7) states no DB queries in evaluators.
 * The one exception is trusted_helper:act_as which requires a grant lookup —
 * callers must pre-fetch the grant and pass it via context.requestMetadata.helperGrant,
 * OR pass { applicantUserId, helperUserId } in resource for the evaluator to
 * use context.requestMetadata.helperGrant.
 */

import type { PolicyActor, PolicyResource, PolicyContext, PolicyDecision } from "@/lib/server/policy/policyTypes";

function allow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: false };
}

function deny(message: string): PolicyDecision {
  return { allowed: false, reason: "INSUFFICIENT_ROLE", auditRequired: true, message };
}

function unauthenticated(): PolicyDecision {
  return { allowed: false, reason: "UNAUTHENTICATED", auditRequired: true, message: "Authentication required." };
}

export async function evalApplicantDomain(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();

  // ownerId is the target applicant's userId
  const targetUserId = resource.ownerId ?? null;

  switch (action) {
    // -----------------------------------------------------------------------
    // applicant_profile
    // -----------------------------------------------------------------------
    case "applicant_profile:view": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      // Active trusted helper with profile:view in scope
      const grant = context?.requestMetadata?.helperGrant as {
        status: string;
        granted_scope: string[];
      } | null | undefined;
      if (
        grant &&
        grant.status === "active" &&
        grant.granted_scope.includes("profile:view")
      ) {
        return allow();
      }
      return deny("You do not have access to this applicant profile.");
    }

    case "applicant_profile:update": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Only the applicant may update their own profile.");
    }

    case "applicant_profile:view_others": {
      // Admin or provider with case access (case access checked via context)
      if (actor.accountType === "platform_admin") return allow();
      if (actor.accountType === "provider") {
        const hasCaseAccess = context?.requestMetadata?.hasCaseAccess as boolean | undefined;
        if (hasCaseAccess === true) return allow();
        return deny("Provider must have an active case with this applicant to view their profile.");
      }
      return deny("Insufficient role to view other applicant profiles.");
    }

    // -----------------------------------------------------------------------
    // applicant_preference
    // -----------------------------------------------------------------------
    case "applicant_preference:view": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Applicants may only view their own preferences.");
    }

    case "applicant_preference:update": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Only the applicant may update their own preferences.");
    }

    // -----------------------------------------------------------------------
    // safety_preference
    // -----------------------------------------------------------------------
    case "safety_preference:view": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Applicants may only view their own safety preferences.");
    }

    case "safety_preference:update": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Only the applicant may update their own safety preferences.");
    }

    case "safety_preference:quick_exit": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Only the applicant may trigger quick exit.");
    }

    // -----------------------------------------------------------------------
    // trusted_helper_access — moved to evalTrustedHelper (Domain 5.1)
    // -----------------------------------------------------------------------
    // All trusted_helper:* cases are now dispatched by policyEngine.ts to
    // evalTrustedHelper. This branch is unreachable — the case list in the
    // policy engine routes "trusted_helper_access" and "trusted_helper"
    // resource types to evalTrustedHelper instead of evalApplicantDomain.

    // -----------------------------------------------------------------------
    // applicant_bookmark
    // -----------------------------------------------------------------------
    case "applicant_bookmark:create": {
      if (actor.accountType !== "applicant") {
        return deny("Only applicants may create bookmarks.");
      }
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId !== targetUserId) {
        return deny("Applicants may only create bookmarks for themselves.");
      }
      return allow();
    }

    case "applicant_bookmark:list": {
      if (actor.accountType !== "applicant") {
        return deny("Only applicants may list their bookmarks.");
      }
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId !== targetUserId) {
        return deny("Applicants may only list their own bookmarks.");
      }
      return allow();
    }

    case "applicant_bookmark:delete": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Applicants may only delete their own bookmarks.");
    }

    case "applicant_bookmark:reorder": {
      if (!targetUserId) return deny("Target user ID required.");
      if (actor.userId === targetUserId) return allow();
      return deny("Applicants may only reorder their own bookmarks.");
    }

    case "profile:set_affiliation": {
      // Domain 3.3 — any authenticated user may set their own program affiliation
      return allow();
    }

    case "provider_search:browse": {
      // Domain 3.4 — any authenticated user may browse the provider discovery map
      return allow();
    }

    default:
      return deny(`Unknown applicant domain action: ${action}`);
  }
}
