/**
 * Domain 4.1 — Referral policy evaluator.
 *
 * Handles 8 referral actions:
 *   referral:create, referral:view, referral:accept, referral:reject,
 *   referral:cancel, referral:close, referral:share_package.view,
 *   referral:share_package.prepare
 *
 * The engine never queries the DB (Decision 7). Resource must have:
 *   tenantId  — source organization ID (for creation/cancel/close)
 *   status    — current referral status (for accept/reject state checks)
 *   ownerId   — applicant_id (for applicant self-access on view)
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

const REFERRAL_INITIATOR_ROLES = new Set<string>(["org_owner", "program_manager", "supervisor"]);
const REFERRAL_RECEIVER_ROLES = new Set<string>(["org_owner", "program_manager", "supervisor"]);

export async function evalReferral(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  switch (action) {
    case "referral:create": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !REFERRAL_INITIATOR_ROLES.has(actor.activeRole)
      ) {
        return deny("Organization leadership (org_owner, program_manager, supervisor) required to create referrals.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only create referrals from your own organization.");
      }
      return allow();
    }

    case "referral:view": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("You can only view your own referrals.");
        }
        return allow();
      }
      if (actor.accountType === "provider") {
        return allow();
      }
      return deny("Access denied.");
    }

    case "referral:accept":
    case "referral:reject": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !REFERRAL_RECEIVER_ROLES.has(actor.activeRole)
      ) {
        return deny("Organization leadership in the receiving organization required.");
      }
      if (resource.status && resource.status !== "pending_acceptance") {
        return deny(
          `Referral cannot be ${action.replace("referral:", "")}ed — current status is '${resource.status}'.`,
        );
      }
      return allow();
    }

    case "referral:cancel": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !REFERRAL_INITIATOR_ROLES.has(actor.activeRole)
      ) {
        return deny("Organization leadership required to cancel referrals.");
      }
      if (resource.status === "closed") {
        return deny("Closed referrals cannot be cancelled.");
      }
      return allow();
    }

    case "referral:close": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !REFERRAL_INITIATOR_ROLES.has(actor.activeRole)
      ) {
        return deny("Organization leadership required to close referrals.");
      }
      return allow();
    }

    case "referral:share_package.view": {
      if (actor.accountType === "applicant") {
        return deny("Applicants access referral status through the applicant view, not share packages.");
      }
      if (actor.accountType === "provider") {
        return allow();
      }
      return deny("Access denied.");
    }

    case "referral:share_package.prepare": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !REFERRAL_INITIATOR_ROLES.has(actor.activeRole)
      ) {
        return deny("Organization leadership required to prepare referral share packages.");
      }
      return allow();
    }

    default:
      return deny(`Unknown referral action: ${action}`);
  }
}
