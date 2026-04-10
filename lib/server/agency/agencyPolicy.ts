/**
 * Domain 6.2 — Agency policy evaluator.
 *
 * Handles reporting submission + agency-specific actions:
 *
 *   reporting_submission:create   — provider leadership (own org)
 *   reporting_submission:submit   — provider leadership (own org)
 *   reporting_submission:view     — provider (own org), agency (in-scope), admin
 *   reporting_submission:request_revision — agency officer/owner (in-scope)
 *   reporting_submission:accept   — agency officer/owner ONLY (NOT reviewer)
 *   reporting_submission:reject   — agency officer/owner ONLY (NOT reviewer)
 *   agency_notice:create          — agency officer/owner
 *   agency_analytics:view         — agency member (any role)
 *   provider_score:view_agency_comparative — agency member (any role)
 *
 * CRITICAL: Agency Reviewer CANNOT accept or reject. Officer/Owner only.
 *
 * Resource shape:
 *   tenantId — organization_id of the provider (for cross-tenant guard)
 *   ownerId  — actor's agency_id (for scope check)
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

/** Provider roles that can create/submit reporting packages. */
const PROVIDER_REPORTING_ROLES = new Set([
  "org_owner",
  "program_manager",
  "supervisor",
]);

/** Agency roles that can request revision, accept, reject. */
const AGENCY_DECISION_ROLES = new Set(["agency_owner", "program_officer"]);

/** Agency roles that can view (includes reviewer). */
const AGENCY_VIEW_ROLES = new Set([
  "agency_owner",
  "program_officer",
  "agency_reviewer",
]);

export async function evalAgency(
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
    // Provider-side submission actions
    // -----------------------------------------------------------------------
    case "reporting_submission:create":
    case "reporting_submission:submit": {
      if (actor.accountType !== "provider") {
        return deny("Only provider accounts can create/submit reporting packages.");
      }
      if (!actor.activeRole || !PROVIDER_REPORTING_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only submit for your own organization.");
      }
      return allow();
    }

    // -----------------------------------------------------------------------
    // View — provider (own org) + agency (in-scope) + admin
    // -----------------------------------------------------------------------
    case "reporting_submission:view": {
      if (actor.accountType === "provider") {
        if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
          return deny("You can only view your own organization's submissions.");
        }
        return allow();
      }
      if (actor.accountType === "agency") {
        if (!actor.activeRole || !AGENCY_VIEW_ROLES.has(actor.activeRole)) {
          return deny("Agency role required to view submissions.");
        }
        // Scope check happens at the service layer — policy allows if role matches.
        return allow();
      }
      if (actor.accountType === "applicant") {
        return deny("Applicants cannot view reporting submissions.");
      }
      return deny("Access denied.");
    }

    // -----------------------------------------------------------------------
    // Agency review actions — officer/owner for decisions, reviewer for view only
    // -----------------------------------------------------------------------
    case "reporting_submission:request_revision": {
      if (actor.accountType !== "agency") {
        return deny("Only agency accounts can request revisions.");
      }
      if (!actor.activeRole || !AGENCY_DECISION_ROLES.has(actor.activeRole)) {
        return deny("Agency Officer or Owner role required to request revision.");
      }
      return allow();
    }

    case "reporting_submission:accept":
    case "reporting_submission:reject": {
      if (actor.accountType !== "agency") {
        return deny("Only agency accounts can accept/reject submissions.");
      }
      // CRITICAL: Reviewer CANNOT accept or reject — Officer/Owner only.
      if (!actor.activeRole || !AGENCY_DECISION_ROLES.has(actor.activeRole)) {
        return deny("Agency Officer or Owner role required. Reviewers cannot accept or reject.");
      }
      return allow();
    }

    // -----------------------------------------------------------------------
    // Notice + analytics
    // -----------------------------------------------------------------------
    case "agency_notice:create": {
      if (actor.accountType !== "agency") {
        return deny("Only agency accounts can issue notices.");
      }
      if (!actor.activeRole || !AGENCY_DECISION_ROLES.has(actor.activeRole)) {
        return deny("Agency Officer or Owner role required to issue notices.");
      }
      return allow();
    }

    case "agency_analytics:view":
    case "provider_score:view_agency_comparative": {
      if (actor.accountType !== "agency") {
        return deny("Agency analytics are agency-only.");
      }
      if (!actor.activeRole || !AGENCY_VIEW_ROLES.has(actor.activeRole)) {
        return deny("Agency role required to view analytics.");
      }
      return allow();
    }

    default:
      return deny(`Unknown agency action: ${action}`);
  }
}
