/**
 * Domain 0.3 — Policy Engine: can()
 *
 * can(action, actor, resource, context?) → Promise<PolicyDecision>
 *
 * Handler order (per domain decision):
 *   1. Auth check   — actor.userId must be present
 *   2. Admin bypass — isAdmin && !supportMode → adminAllow() immediately
 *   3. Dispatch     — route to resource-type handler
 *   4. Per handler: tenant scope → role check → state check → ownership → consent
 *
 * Audit rule (Decision 5):
 *   - Admin ALLOW  → auditRequired: true (returned by adminAllow())
 *   - Any DENY     → fire-and-forget logEvent + auditRequired: true
 *   - Normal ALLOW → auditRequired: false
 *
 * The engine never queries the DB (Decision 7). All context must be
 * pre-fetched and injected by the caller via PolicyContext.
 */

import type { PolicyDecisionReasonCode } from "@/lib/registry";
import { logEvent } from "@/lib/server/audit/logEvent";
import type { PolicyActor, PolicyResource, PolicyContext, PolicyDecision } from "./policyTypes";
import type { PolicyAction } from "./actionRegistry";
import { assertSameTenant } from "./tenantScope";

// ---------------------------------------------------------------------------
// Decision helpers
// ---------------------------------------------------------------------------

function allow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: false };
}

function deny(reason: PolicyDecisionReasonCode, message?: string): PolicyDecision {
  return { allowed: false, reason, auditRequired: true, message };
}

/** Admin allowed — always marks auditRequired per Decision 5. */
function adminAllow(): PolicyDecision {
  return { allowed: true, reason: "ALLOWED", auditRequired: true };
}

// ---------------------------------------------------------------------------
// Audit helper — fire-and-forget on DENY (Decision 5)
// ---------------------------------------------------------------------------

function fireAuditOnDeny(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  decision: PolicyDecision,
): void {
  void logEvent({
    ctx: null,
    action: "org.permission_denied",
    resourceType: resource.type,
    resourceId: resource.id ?? null,
    severity: "security",
    metadata: {
      policy_action: action,
      reason: decision.reason,
      actor_user_id: actor.userId,
      actor_account_type: actor.accountType,
      actor_active_role: actor.activeRole ?? null,
      actor_tenant_id: actor.tenantId ?? null,
      actor_support_mode: actor.supportMode,
      resource_tenant_id: resource.tenantId ?? null,
      resource_owner_id: resource.ownerId ?? null,
    },
  });
}

// ---------------------------------------------------------------------------
// Role sets (provider roles permitted per action group)
// ---------------------------------------------------------------------------

/** All provider roles that can access case/document content. */
const CASE_STAFF = new Set<string>([
  "org_owner",
  "supervisor",
  "victim_advocate",
  "intake_specialist",
]);

/** Provider roles with write/leadership authority. */
const CASE_LEADERSHIP = new Set<string>(["org_owner", "supervisor"]);

/** Roles permitted to restrict/unrestrict documents (Decision 2). */
const DOC_RESTRICT_ROLES = new Set<string>([
  "org_owner",
  "supervisor",
  "victim_advocate",
]);

/** Roles permitted to view the member list (Decision 3). */
const ORG_VIEW_MEMBERS_ROLES = new Set<string>([
  "org_owner",
  "supervisor",
  "auditor",
]);

/** Roles permitted to manage (add/remove/change) members (Decision 3). */
const ORG_MANAGE_MEMBERS_ROLES = new Set<string>(["org_owner", "supervisor"]);

/** Roles with any case-access rights within an org. */
const ORG_CASE_ACCESS_ROLES = new Set<string>([
  "org_owner",
  "supervisor",
  "victim_advocate",
  "intake_specialist",
  "auditor",
]);

// ---------------------------------------------------------------------------
// Consent helper
// ---------------------------------------------------------------------------

/**
 * Returns a MISSING_CONSENT denial if context signals consent is absent.
 * Returns null otherwise (pass — no consent issue).
 * Consent is always the last check in the handler order.
 */
function checkConsent(context?: PolicyContext): PolicyDecision | null {
  if (context?.consentStatus === "missing") {
    return deny("MISSING_CONSENT", "Policy acceptance is required to proceed.");
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resource-type handlers
// ---------------------------------------------------------------------------

async function evalCase(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // Tenant scope
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  // Consent check (applied to all case actions, last in chain)
  const consentDenial = checkConsent(context);

  switch (action) {
    case "case:read":
    case "case:edit":
    case "case:update_status":
    case "case:view_timeline": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this case.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role for case access.");
        }
        // Advocates can only access cases assigned to them
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Advocates can only access cases assigned to them.",
          );
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "case:assign":
    case "case:close":
    case "case:reopen": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required.");
      }
      return consentDenial ?? allow();
    }

    case "case:delete": {
      // Decision 1: applicant owner only
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the case owner can delete this case.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the case owner can delete this case.");
      }
      return consentDenial ?? allow();
    }

    default:
      return deny("RESOURCE_NOT_FOUND", `Action '${action}' is not valid for resource type 'case'.`);
  }
}

async function evalDocument(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "document:upload":
    case "document:view": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this document.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role for document access.");
        }
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Advocates can only access documents on cases assigned to them.",
          );
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "document:share": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required to share documents.");
      }
      return consentDenial ?? allow();
    }

    case "document:restrict":
    case "document:unrestrict": {
      // Decision 2: victim_advocate, org_owner, supervisor
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !DOC_RESTRICT_ROLES.has(actor.activeRole)
      ) {
        return deny(
          "INSUFFICIENT_ROLE",
          "Organization advocate, owner, or supervisor required to restrict documents.",
        );
      }
      return consentDenial ?? allow();
    }

    case "document:delete": {
      if (actor.accountType === "applicant" && resource.ownerId === actor.userId) {
        return consentDenial ?? allow();
      }
      if (
        actor.accountType === "provider" &&
        actor.activeRole &&
        CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Insufficient role to delete this document.");
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'document'.`,
      );
  }
}

async function evalMessage(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "message:send":
    case "message:read": {
      if (actor.accountType === "applicant") {
        // Applicant must own the case (ownerId) or be the assigned party
        if (resource.ownerId !== actor.userId && resource.assignedTo !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: not a participant in this conversation.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role for messaging.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "message:delete": {
      // Own messages: any authenticated participant; others' messages: leadership
      if (actor.accountType === "applicant" && resource.ownerId === actor.userId) {
        return consentDenial ?? allow();
      }
      if (
        actor.accountType === "provider" &&
        actor.activeRole &&
        CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Insufficient role to delete this message.");
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'message'.`,
      );
  }
}

async function evalOrg(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "org:view_members": {
      // Decision 3: org_owner, supervisor, auditor
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
      // Decision 3: org_owner, supervisor only
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

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'org'.`,
      );
  }
}

async function evalSupportRequest(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "support_request:create": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only applicants can create support requests.");
      }
      return consentDenial ?? allow();
    }

    case "support_request:submit":
    case "support_request:withdraw": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can perform this action.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can perform this action.");
      }
      return consentDenial ?? allow();
    }

    case "support_request:accept":
    case "support_request:decline": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_STAFF.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization case staff required.");
      }
      return consentDenial ?? allow();
    }

    case "support_request:transfer": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required to transfer requests.");
      }
      return consentDenial ?? allow();
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'support_request'.`,
      );
  }
}

async function evalAdmin(
  action: PolicyAction,
  actor: PolicyActor,
  _resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  // Admin resource type: platform admin only, no further checks
  if (!actor.isAdmin) {
    return deny("INSUFFICIENT_ROLE", "Platform administrator access required.");
  }
  return adminAllow();
}

// ---------------------------------------------------------------------------
// can() — public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluates whether `actor` is permitted to perform `action` on `resource`.
 *
 * @param action   - The action being attempted (from POLICY_ACTIONS).
 * @param actor    - The actor snapshot. Build with buildActor(ctx).
 * @param resource - The resource being acted upon.
 * @param context  - Optional ambient context (consent, feature flags, metadata).
 * @returns        PolicyDecision — always inspect `allowed` before proceeding.
 *
 * Audit rule (Decision 5):
 *   - DENYs: fire-and-forget logEvent is emitted by the engine.
 *   - Admin ALLOWs: auditRequired=true is set; caller must record the action.
 *   - Normal ALLOWs: no audit emitted; caller may log at their discretion.
 */
export async function can(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // 1. Auth check
  if (!actor.userId) {
    const d = deny("UNAUTHENTICATED", "Authentication required.");
    fireAuditOnDeny(action, actor, resource, d);
    return d;
  }

  // 2. Platform admin bypass (not in supportMode)
  //    Admins in supportMode go through the normal handler so their
  //    effective persona role is validated, not bypassed.
  if (actor.isAdmin && !actor.supportMode) {
    return adminAllow();
  }

  // 3. Dispatch to resource-type handler
  let decision: PolicyDecision;

  switch (resource.type) {
    case "case":
      decision = await evalCase(action, actor, resource, context);
      break;
    case "document":
      decision = await evalDocument(action, actor, resource, context);
      break;
    case "message":
      decision = await evalMessage(action, actor, resource, context);
      break;
    case "org":
      decision = await evalOrg(action, actor, resource, context);
      break;
    case "support_request":
      decision = await evalSupportRequest(action, actor, resource, context);
      break;
    case "admin":
      decision = await evalAdmin(action, actor, resource, context);
      break;
    default:
      decision = deny("RESOURCE_NOT_FOUND", "Unknown resource type.");
  }

  // 4. Audit on DENY (Decision 5)
  if (!decision.allowed) {
    fireAuditOnDeny(action, actor, resource, decision);
  }

  // 5. Ensure all admin ALLOWs are audited (Decision 5)
  //    Handles supportMode admins who went through the normal handler.
  if (decision.allowed && actor.isAdmin) {
    return { ...decision, auditRequired: true };
  }

  return decision;
}
