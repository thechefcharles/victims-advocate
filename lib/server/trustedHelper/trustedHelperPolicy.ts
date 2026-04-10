/**
 * Domain 5.1 — Trusted helper policy evaluator.
 *
 * Handles 9 actions:
 *   trusted_helper:grant           — applicant-only, own grants
 *   trusted_helper:view            — applicant owner, helper party, or admin
 *   trusted_helper:revoke          — applicant owner or admin
 *   trusted_helper:accept          — helper party (own pending grant)
 *   trusted_helper:expire          — admin / system sweep
 *   trusted_helper:scope.update    — applicant owner (own active grant)
 *   trusted_helper:audit.view      — applicant owner (own events) or admin
 *   trusted_helper:list            — applicant or helper (legacy action, still used)
 *   trusted_helper:act_as          — helper acting on behalf of applicant — REQUIRES injected grant
 *
 * The engine never queries the DB. resolveTrustedHelperScope() in the service
 * layer is the runtime authorization gate — this policy handles the
 * ownership + role gate only.
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

type InjectedGrant =
  | {
      status: string;
      granted_scope?: string[];
      granted_scope_detail?: { allowedActions?: string[] };
    }
  | null
  | undefined;

export async function evalTrustedHelper(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  // For most actions, resource.ownerId is the applicant who owns the grant.
  const applicantOwnerId = resource.ownerId ?? null;

  switch (action) {
    case "trusted_helper:grant": {
      if (actor.accountType !== "applicant") {
        return deny("Only applicants may grant trusted helper access.");
      }
      if (applicantOwnerId && applicantOwnerId !== actor.userId) {
        return deny("Applicants may only grant helper access on their own account.");
      }
      return allow();
    }

    case "trusted_helper:view": {
      // Applicant owner — can view own grants
      if (actor.accountType === "applicant") {
        if (!applicantOwnerId || applicantOwnerId === actor.userId) {
          return allow();
        }
        return deny("Applicants may only view their own helper grants.");
      }
      // Helper party — can view a grant where they are the helper
      // Caller must set resource.assignedTo = helper_user_id for this case
      if (resource.assignedTo === actor.userId) {
        return allow();
      }
      return deny("Access denied.");
    }

    case "trusted_helper:list": {
      if (actor.accountType === "applicant") return allow();
      // Helper listing their own grants is allowed (post-auth only — no DB filter here)
      return allow();
    }

    case "trusted_helper:revoke": {
      if (actor.accountType !== "applicant") {
        return deny("Only the applicant (or a platform admin) may revoke helper access.");
      }
      if (applicantOwnerId && applicantOwnerId !== actor.userId) {
        return deny("Applicants may only revoke grants on their own account.");
      }
      return allow();
    }

    case "trusted_helper:accept": {
      // The helper accepts a pending grant addressed to them.
      // Caller must set resource.assignedTo = helper_user_id.
      if (!resource.assignedTo) {
        return deny("Helper identity required on the grant resource.");
      }
      if (resource.assignedTo !== actor.userId) {
        return deny("Only the named helper may accept a pending grant.");
      }
      if (resource.status && resource.status !== "pending") {
        return deny(`Cannot accept a grant with status '${resource.status}'.`);
      }
      return allow();
    }

    case "trusted_helper:expire": {
      // Reserved for scheduled sweeps and platform admins.
      return deny("Only platform admins or scheduled sweep jobs may expire grants.");
    }

    case "trusted_helper:scope.update": {
      if (actor.accountType !== "applicant") {
        return deny("Only the applicant may update helper scope.");
      }
      if (applicantOwnerId && applicantOwnerId !== actor.userId) {
        return deny("Applicants may only update scope on their own grants.");
      }
      if (resource.status && resource.status !== "active") {
        return deny(`Can only update scope on an active grant (current status: '${resource.status}').`);
      }
      return allow();
    }

    case "trusted_helper:audit.view": {
      if (actor.accountType !== "applicant") {
        return deny("Only the applicant owner (or admin) may view helper audit events.");
      }
      if (applicantOwnerId && applicantOwnerId !== actor.userId) {
        return deny("Applicants may only view audit events for their own grants.");
      }
      return allow();
    }

    case "trusted_helper:act_as": {
      // Caller MUST pre-fetch the grant and inject it via context.requestMetadata.helperGrant.
      // This policy confirms the grant is active and the requested action is in scope.
      const grant = (context?.requestMetadata?.helperGrant as InjectedGrant) ?? null;
      if (!grant || grant.status !== "active") {
        return deny("No active helper grant found.");
      }
      const requestedAction = resource.status ?? "";
      if (requestedAction) {
        const detailActions = grant.granted_scope_detail?.allowedActions ?? [];
        const legacyActions = grant.granted_scope ?? [];
        const inScope = detailActions.includes(requestedAction) || legacyActions.includes(requestedAction);
        if (!inScope) {
          return deny(`Action '${requestedAction}' is not in the helper's granted scope.`);
        }
      }
      return allow();
    }

    default:
      return deny(`Unknown trusted_helper action: ${action}`);
  }
}
