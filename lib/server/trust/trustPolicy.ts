/**
 * Domain 6.1 — Trust policy evaluator.
 *
 * Handles 12 trust actions across four resource sub-types (all dispatched
 * to "trust" by the central policy engine):
 *
 *   provider_reliability:view_public          — public-safe summary
 *   provider_reliability:view_applicant_safe  — applicant-safe summary
 *   provider_score:view_internal              — own-org internal scores
 *   provider_score:view_comparative           — agency cross-provider view
 *   provider_score:recalculate                — admin or own-org leadership
 *   provider_score:dispute.create             — provider against own snapshot
 *   provider_score:dispute.review             — admin only
 *   score_methodology:view                    — admin only
 *   score_methodology:update                  — admin only (draft only)
 *   score_methodology:publish                 — admin only
 *   provider_affiliation:view                 — admin or own-org member
 *   provider_affiliation:manage               — admin only
 *
 * Resource shape — callers populate:
 *   tenantId — organization_id of the target org (cross-tenant guard)
 *   ownerId  — for own-org checks (set to actor.tenantId or null)
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
  return {
    allowed: false,
    reason: "UNAUTHENTICATED",
    auditRequired: true,
    message: "Authentication required.",
  };
}

const PROVIDER_LEADERSHIP_ROLES = new Set([
  "org_owner",
  "program_manager",
  "supervisor",
]);

const AGENCY_VIEW_ROLES = new Set(["agency_owner", "program_officer"]);

export async function evalTrust(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) {
    return { allowed: true, reason: "ALLOWED", auditRequired: true };
  }

  switch (action) {
    // -----------------------------------------------------------------------
    // Reliability — public + applicant-safe surfaces
    // -----------------------------------------------------------------------
    case "provider_reliability:view_public": {
      // Public summaries are open to any authenticated user.
      return allow();
    }
    case "provider_reliability:view_applicant_safe": {
      // Applicant-safe view is open to applicants and to providers
      // (so they can see what their applicants see).
      if (
        actor.accountType === "applicant" ||
        actor.accountType === "provider"
      ) {
        return allow();
      }
      return deny("Account type not permitted.");
    }

    // -----------------------------------------------------------------------
    // Score — internal vs. comparative vs. recalculate vs. dispute
    // -----------------------------------------------------------------------
    case "provider_score:view_internal": {
      if (actor.accountType !== "provider") {
        return deny("Internal scores are provider-only.");
      }
      if (!actor.activeRole || !PROVIDER_LEADERSHIP_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required to view internal scores.");
      }
      // Cross-tenant guard.
      if (
        actor.tenantId &&
        resource.tenantId &&
        actor.tenantId !== resource.tenantId
      ) {
        return deny("You can only view your own organization's scores.");
      }
      return allow();
    }
    case "provider_score:view_comparative": {
      if (actor.accountType !== "agency") {
        return deny("Comparative analytics are agency-only.");
      }
      if (!actor.activeRole || !AGENCY_VIEW_ROLES.has(actor.activeRole)) {
        return deny("Agency role required to view comparative analytics.");
      }
      return allow();
    }
    case "provider_score:recalculate": {
      // Provider leadership can recalculate own-org scores.
      if (actor.accountType !== "provider") {
        return deny("Only providers can recalculate their own scores.");
      }
      if (!actor.activeRole || !PROVIDER_LEADERSHIP_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required.");
      }
      if (
        actor.tenantId &&
        resource.tenantId &&
        actor.tenantId !== resource.tenantId
      ) {
        return deny("You can only recalculate your own organization's scores.");
      }
      return allow();
    }
    case "provider_score:dispute.create": {
      if (actor.accountType !== "provider") {
        return deny("Only providers can dispute their scores.");
      }
      if (!actor.activeRole || !PROVIDER_LEADERSHIP_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required to file disputes.");
      }
      if (
        actor.tenantId &&
        resource.tenantId &&
        actor.tenantId !== resource.tenantId
      ) {
        return deny("You can only dispute your own organization's scores.");
      }
      return allow();
    }
    case "provider_score:dispute.review": {
      // Admin-only — already short-circuited above; explicit deny here.
      return deny("Only platform admins can review score disputes.");
    }

    // -----------------------------------------------------------------------
    // Methodology — admin only (already short-circuited)
    // -----------------------------------------------------------------------
    case "score_methodology:view":
    case "score_methodology:update":
    case "score_methodology:publish": {
      return deny("Methodology actions are platform-admin only.");
    }

    // -----------------------------------------------------------------------
    // Affiliation
    // -----------------------------------------------------------------------
    case "provider_affiliation:view": {
      // Providers can view their own org's affiliation.
      if (actor.accountType === "provider") {
        if (
          actor.tenantId &&
          resource.tenantId &&
          actor.tenantId !== resource.tenantId
        ) {
          return deny("You can only view your own organization's affiliation.");
        }
        return allow();
      }
      // Agencies can view affiliations within their oversight scope.
      if (actor.accountType === "agency") {
        if (!actor.activeRole || !AGENCY_VIEW_ROLES.has(actor.activeRole)) {
          return deny("Agency role required to view affiliations.");
        }
        return allow();
      }
      return deny("Account type not permitted.");
    }
    case "provider_affiliation:manage": {
      // Admin-only — already short-circuited above.
      return deny("Affiliation management is platform-admin only.");
    }

    default:
      return deny(`Unknown trust action: ${action}`);
  }
}
