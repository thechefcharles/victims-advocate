/**
 * Domain 3.2 — Organization policy evaluator.
 *
 * Extracted from policyEngine.ts evalOrg() to match the external-evaluator
 * pattern used by all Phase 4+ domains.
 *
 * Handles 17 org actions: view_members, manage_members, view_cases,
 * edit_profile, view_profile, register, claim, invite, revoke_invite,
 * update_member_role, revoke_member, accept_invite, request_to_join,
 * approve_join, submit_for_review, view_program_catalog, link_catalog_entry
 */

import type {
  PolicyActor,
  PolicyContext,
  PolicyDecision,
  PolicyResource,
} from "@/lib/server/policy/policyTypes";
import { assertSameTenant } from "@/lib/server/policy/tenantScope";

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

function allow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: false };
}

function deny(reason: string, message?: string): PolicyDecision {
  return { allowed: false, reason: reason as PolicyDecision["reason"], auditRequired: true, message };
}

// ---------------------------------------------------------------------------
// Role sets
// ---------------------------------------------------------------------------

const ORG_VIEW_MEMBERS_ROLES = new Set<string>(["org_owner", "supervisor", "auditor"]);
const ORG_MANAGE_MEMBERS_ROLES = new Set<string>(["org_owner", "supervisor"]);
const ORG_CASE_ACCESS_ROLES = new Set<string>([
  "org_owner", "supervisor", "victim_advocate", "intake_specialist", "auditor",
]);
const CASE_LEADERSHIP = new Set<string>(["org_owner", "program_manager", "supervisor"]);
const ORG_MANAGEMENT_DB_ROLES = new Set<string>(["org_owner", "program_manager"]);
const ADVOCATE_DB_ROLES = new Set<string>(["victim_advocate", "intake_specialist"]);

// ---------------------------------------------------------------------------
// Consent helper
// ---------------------------------------------------------------------------

function checkConsent(context?: PolicyContext): PolicyDecision | null {
  if (context?.consentStatus === "missing") {
    return {
      allowed: false,
      reason: "MISSING_CONSENT",
      auditRequired: true,
      message: "Policy acceptance is required to proceed.",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

export async function evalOrganization(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "org:view_members": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ORG_VIEW_MEMBERS_ROLES.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization owner, supervisor, or auditor required.");
      }
      return consentDenial ?? allow();
    }

    case "org:manage_members": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ORG_MANAGE_MEMBERS_ROLES.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization owner or supervisor required.");
      }
      return consentDenial ?? allow();
    }

    case "org:view_cases": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ORG_CASE_ACCESS_ROLES.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization case-access role required.");
      }
      return consentDenial ?? allow();
    }

    case "org:edit_profile": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization owner or supervisor required.");
      }
      return consentDenial ?? allow();
    }

    case "org:view_profile": {
      if (actor.isAdmin) return consentDenial ?? allow();
      if (actor.accountType !== "provider" || !actor.activeRole) {
        return deny("INSUFFICIENT_ROLE", "Organization membership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:register":
    case "org:claim": {
      if (!actor.isAdmin) {
        return deny("INSUFFICIENT_ROLE", "Platform administrator required.");
      }
      return consentDenial ?? allow();
    }

    case "org:invite":
    case "org:revoke_invite":
    case "org:update_member_role":
    case "org:revoke_member": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ORG_MANAGEMENT_DB_ROLES.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization owner or program manager required.");
      }
      return consentDenial ?? allow();
    }

    case "org:accept_invite": {
      if (!actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Authentication required.");
      }
      return consentDenial ?? allow();
    }

    case "org:request_to_join": {
      if (actor.accountType !== "provider") {
        return deny("INSUFFICIENT_ROLE", "Provider account required.");
      }
      if (actor.activeRole !== null && !ADVOCATE_DB_ROLES.has(actor.activeRole)) {
        return deny("INSUFFICIENT_ROLE", "Advocate role required to request joining an organization.");
      }
      return consentDenial ?? allow();
    }

    case "org:approve_join": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:submit_for_review": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:view_program_catalog": {
      if (actor.isAdmin) return consentDenial ?? allow();
      if (actor.accountType !== "provider" || !actor.activeRole) {
        return deny("INSUFFICIENT_ROLE", "Organization membership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:link_catalog_entry": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ORG_MANAGE_MEMBERS_ROLES.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization owner or supervisor required.");
      }
      return consentDenial ?? allow();
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'org'.`,
      );
  }
}
