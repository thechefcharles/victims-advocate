/**
 * Domain 7.1 — Governance policy evaluator.
 *
 * Handles 14 governance actions across policy documents, acceptances,
 * change requests, and audit events.
 *
 * Access model:
 *   - Policy acceptance: any authenticated user can accept required policies
 *   - Policy document management: platform admin only
 *   - Change requests: platform admin only (create, approve, reject, rollback)
 *   - Audit events: platform admin for view/export; log is service-layer only
 *   - Compliance events: platform admin + agency oversight roles
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

export async function evalGovernance(
  action: string,
  actor: PolicyActor,
  _resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) {
    return { allowed: true, reason: "ALLOWED", auditRequired: true };
  }

  switch (action) {
    // Any authenticated user can accept a required policy.
    case "policy_acceptance:create":
    case "policy_acceptance:view": {
      return allow();
    }

    // View active policies — any authenticated user (for acceptance flow).
    case "policy_document:view": {
      return allow();
    }

    // Policy document management — admin only (short-circuited above).
    case "policy_document:create":
    case "policy_document:publish":
    case "policy_document:deprecate": {
      return deny("Policy document management is platform-admin only.");
    }

    // Change request lifecycle — admin only.
    case "change_request:create":
    case "change_request:approve":
    case "change_request:reject":
    case "change_request:rollback": {
      return deny("Change request management is platform-admin only.");
    }

    // Audit event operations — admin only.
    case "audit_event:log":
    case "audit_event:view":
    case "audit_event:export": {
      return deny("Audit event access is platform-admin only.");
    }

    // Compliance event view — admin + agency oversight.
    case "compliance_event:view": {
      if (actor.accountType === "agency") {
        return allow();
      }
      return deny("Compliance event access requires agency or admin role.");
    }

    default:
      return deny(`Unknown governance action: ${action}`);
  }
}
