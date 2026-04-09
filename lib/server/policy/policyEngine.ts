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
import { evalApplicantDomain } from "@/lib/server/applicant/evalApplicantProfile";
import { evalReferral } from "@/lib/server/referrals/referralPolicy";
import { evalAppointment } from "@/lib/server/appointments/appointmentPolicy";
import { evalEvent } from "@/lib/server/events/eventPolicy";
import { evalTrustedHelper } from "@/lib/server/trustedHelper/trustedHelperPolicy";
import { evalRecommendation } from "@/lib/server/recommendations/recommendationPolicy";

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
  "program_manager",
  "supervisor",
  "victim_advocate",
  "intake_specialist",
]);

/** Provider roles with write/leadership authority (Domain 1.2 Decision: program_manager added). */
const CASE_LEADERSHIP = new Set<string>(["org_owner", "program_manager", "supervisor"]);

/**
 * Roles permitted to accept, decline, assign, and close support requests.
 * victim_advocate is explicitly excluded — they get view-only access.
 * Domain 1.1 Decision 3.
 */
const ACCEPT_LEADERSHIP = new Set<string>(["org_owner", "program_manager", "supervisor"]);

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

    case "case:create_from_support_request":
    case "case:reassign":
    case "case:submit":
    case "case:record_outcome": {
      // CASE_LEADERSHIP only (Domain 1.2 Decision)
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required.");
      }
      return consentDenial ?? allow();
    }

    case "case:mark_ready": {
      // CASE_LEADERSHIP or the assigned advocate
      if (actor.accountType !== "provider" || !actor.activeRole) {
        return deny("INSUFFICIENT_ROLE", "Provider role required to mark a case ready.");
      }
      if (CASE_LEADERSHIP.has(actor.activeRole)) {
        return consentDenial ?? allow();
      }
      if (actor.activeRole === "victim_advocate" && resource.assignedTo === actor.userId) {
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Leadership or the assigned advocate can mark a case ready.");
    }

    case "case:note_create": {
      // Any CASE_STAFF provider
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_STAFF.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Provider staff role required to create notes.");
      }
      return consentDenial ?? allow();
    }

    case "case:note_view":
    case "case:next_steps_view": {
      // CASE_STAFF or applicant owner
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this case.");
        }
        return consentDenial ?? allow();
      }
      if (
        actor.accountType === "provider" &&
        actor.activeRole &&
        CASE_STAFF.has(actor.activeRole)
      ) {
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Insufficient role for this case action.");
    }

    case "case:appeal_start": {
      // Applicant owner only
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the case owner can start an appeal.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the case owner can start an appeal.");
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

  // Status gate helpers
  const isLocked = resource.status === "locked";
  const isArchived = resource.status === "archived";

  switch (action) {
    case "document:upload": {
      // Archived/locked documents cannot receive new uploads (would create a new doc anyway
      // but guard here for completeness — replace is the correct path for locked docs, denied below).
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived.");
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
          return deny("INSUFFICIENT_ROLE", "Advocates can only access documents on cases assigned to them.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

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
          return deny("INSUFFICIENT_ROLE", "Advocates can only access documents on cases assigned to them.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "document:download": {
      // Same permissions as view; separate action for SOC 2 audit trail.
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived.");
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this document.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role to download documents.");
        }
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Advocates can only access documents on cases assigned to them.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "document:replace": {
      // Replace requires status === 'active'; locked and archived deny.
      if (isLocked) return deny("INSUFFICIENT_ROLE", "This document is locked and cannot be replaced.");
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived and cannot be replaced.");
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this document.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role to replace documents.");
        }
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Advocates can only access documents on cases assigned to them.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "document:lock": {
      // CASE_LEADERSHIP only; status must be active.
      if (isLocked) return deny("INSUFFICIENT_ROLE", "Document is already locked.");
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived.");
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required to lock documents.");
      }
      return consentDenial ?? allow();
    }

    case "document:share": {
      // CASE_LEADERSHIP + status gate (archived = deny; locked = allow read-only sharing).
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived and cannot be shared.");
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required to share documents.");
      }
      // Full ConsentGrant check is done in documentService.shareDocument() via isSharingAllowed().
      return consentDenial ?? allow();
    }

    case "document:restrict":
    case "document:unrestrict": {
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
      if (isLocked) return deny("INSUFFICIENT_ROLE", "This document is locked and cannot be deleted.");
      if (isArchived) return deny("INSUFFICIENT_ROLE", "This document is archived and cannot be deleted.");
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

async function evalConsent(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // Consent grants are cross-tenant by design (applicant → org).
  // Do NOT call assertSameTenant here. Access is governed by ownership and role.

  const consentDenial = checkConsent(context);

  // Agency actors are explicitly denied all consent actions.
  if (actor.tenantType === "agency") {
    return deny("INSUFFICIENT_ROLE", "Agency accounts cannot perform consent operations.");
  }

  switch (action) {
    case "consent:create": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only applicants can create consent grants.");
      }
      return consentDenial ?? allow();
    }

    case "consent:view": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this consent grant.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role to view consent grants.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "consent:revoke": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can revoke a consent grant.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can revoke a consent grant.");
      }
      return consentDenial ?? allow();
    }

    case "consent:request": {
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role to request consent.");
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Provider role required to request consent.");
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'consent'.`,
      );
  }
}

async function evalMessageThread(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  const tenantDenial = assertSameTenant(actor, resource);
  if (tenantDenial) return tenantDenial;

  const consentDenial = checkConsent(context);

  switch (action) {
    case "message_thread:create_workflow":
    case "message_thread:archive":
    case "message_thread:set_read_only": {
      // CASE_LEADERSHIP only
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !CASE_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny("INSUFFICIENT_ROLE", "Organization leadership required for thread management.");
      }
      return consentDenial ?? allow();
    }

    case "message_thread:view": {
      // Applicant (owner) or any CASE_STAFF provider
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: not a participant in this thread.");
        }
        return consentDenial ?? allow();
      }
      if (
        actor.accountType === "provider" &&
        actor.activeRole &&
        CASE_STAFF.has(actor.activeRole)
      ) {
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Insufficient role to view this thread.");
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'message_thread'.`,
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
      // Thread status gate — resource.status carries the thread's current status.
      // Callers must pre-fetch the thread and pass status in the resource.
      if (action === "message:send") {
        if (resource.status && resource.status !== "active") {
          return deny(
            "INSUFFICIENT_ROLE",
            "This conversation is not accepting new messages.",
          );
        }
      }

      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: not a participant in this conversation.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role for messaging.");
        }
        // Decision 8: advocates can only message on cases assigned to them
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Advocates can only message on cases assigned to them.",
          );
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

    case "message:attachment_upload": {
      // Domain 1.4: enable attachment upload on active threads.
      // Mirrors message:send permissions — applicant owner OR CASE_STAFF
      // (advocates restricted to assigned cases).
      if (resource.status && resource.status !== "active") {
        return deny(
          "INSUFFICIENT_ROLE",
          "This conversation is not accepting new attachments.",
        );
      }
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Access denied: not a participant in this conversation.",
          );
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Insufficient organization role to upload attachments.",
          );
        }
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Advocates can only upload attachments on cases assigned to them.",
          );
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
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

    // -----------------------------------------------------------------------
    // Domain 3.2 additions
    // -----------------------------------------------------------------------

    case "org:view_profile": {
      // Any active org member or admin
      if (actor.isAdmin) return consentDenial ?? allow();
      if (actor.accountType !== "provider" || !actor.activeRole) {
        return deny("INSUFFICIENT_ROLE", "Organization membership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:register":
    case "org:claim": {
      // Platform-controlled: admin only
      if (!actor.isAdmin) {
        return deny("INSUFFICIENT_ROLE", "Platform administrator required.");
      }
      return consentDenial ?? allow();
    }

    case "org:invite":
    case "org:revoke_invite":
    case "org:update_member_role":
    case "org:revoke_member": {
      // Management tier only: org_owner, program_manager (mapped to SimpleOrgRole 'owner')
      const ORG_MANAGEMENT_DB_ROLES = new Set(["org_owner", "program_manager"]);
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
      // Any authenticated user (no org role required — they are joining an org)
      if (!actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Authentication required.");
      }
      return consentDenial ?? allow();
    }

    case "org:request_to_join": {
      // Advocate role users (victim_advocate, intake_specialist) or unaffiliated providers.
      // Providers with a non-advocate role (org_owner, supervisor, etc.) are denied.
      const ADVOCATE_DB_ROLES = new Set(["victim_advocate", "intake_specialist"]);
      if (actor.accountType !== "provider") {
        return deny("INSUFFICIENT_ROLE", "Provider account required.");
      }
      // Allow unaffiliated providers (no role yet) or those with advocate roles.
      // Deny providers who already hold a non-advocate role.
      if (actor.activeRole !== null && !ADVOCATE_DB_ROLES.has(actor.activeRole)) {
        return deny("INSUFFICIENT_ROLE", "Advocate role required to request joining an organization.");
      }
      // Note: uniqueness of org membership is enforced at DB level
      return consentDenial ?? allow();
    }

    case "org:approve_join": {
      // Leadership: org_owner, program_manager, supervisor
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
      // Leadership tier
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
      // Any active org member or admin
      if (actor.isAdmin) return consentDenial ?? allow();
      if (actor.accountType !== "provider" || !actor.activeRole) {
        return deny("INSUFFICIENT_ROLE", "Organization membership required.");
      }
      return consentDenial ?? allow();
    }

    case "org:link_catalog_entry": {
      // Domain 3.3 — same tier as org:edit_profile: org_owner or supervisor
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

async function evalSupportRequest(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // For create, tenant isolation is not applicable (resource has no tenant yet).
  // For all other actions, enforce same-tenant scoping.
  if (action !== "support_request:create") {
    const tenantDenial = assertSameTenant(actor, resource);
    if (tenantDenial) return tenantDenial;
  }

  const consentDenial = checkConsent(context);

  switch (action) {
    case "support_request:create": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only applicants can create support requests.");
      }
      return consentDenial ?? allow();
    }

    case "support_request:view":
    case "support_request:view_status_reason": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this request.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        // Same-tenant check already done above. Any active org member may view.
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "support_request:update_self": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can update this request.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the applicant owner can update this request.");
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
    case "support_request:decline":
    case "support_request:assign":
    case "support_request:close": {
      // victim_advocate is explicitly excluded — view-only by default (Domain 1.1 Decision 3).
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ACCEPT_LEADERSHIP.has(actor.activeRole)
      ) {
        return deny(
          "INSUFFICIENT_ROLE",
          "Organization leadership required for this action.",
        );
      }
      return consentDenial ?? allow();
    }

    case "support_request:transfer": {
      if (
        actor.accountType !== "provider" ||
        !actor.activeRole ||
        !ACCEPT_LEADERSHIP.has(actor.activeRole)
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

async function evalIntake(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // Tenant scope (only enforced when the resource has a tenantId — pre-link sessions skip this).
  if (resource.tenantId) {
    const tenantDenial = assertSameTenant(actor, resource);
    if (tenantDenial) return tenantDenial;
  }

  const consentDenial = checkConsent(context);

  // Agency accounts are explicitly denied all intake actions.
  if (actor.tenantType === "agency") {
    return deny("INSUFFICIENT_ROLE", "Agency accounts cannot perform intake operations.");
  }

  switch (action) {
    case "intake:start": {
      // Applicant only — owns the session being created.
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only applicants can start an intake session.");
      }
      return consentDenial ?? allow();
    }

    case "intake:save_draft": {
      // Applicant only, must own session, status must be draft.
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the session owner can save draft changes.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the session owner can save draft changes.");
      }
      if (resource.status && resource.status !== "draft") {
        return deny("INSUFFICIENT_ROLE", "This intake session is no longer editable.");
      }
      return consentDenial ?? allow();
    }

    case "intake:submit": {
      if (actor.accountType !== "applicant") {
        return deny("INSUFFICIENT_ROLE", "Only the session owner can submit this intake.");
      }
      if (resource.ownerId !== actor.userId) {
        return deny("INSUFFICIENT_ROLE", "Only the session owner can submit this intake.");
      }
      if (resource.status && resource.status !== "draft") {
        return deny("INSUFFICIENT_ROLE", "This intake session has already been submitted.");
      }
      return consentDenial ?? allow();
    }

    case "intake:view": {
      if (actor.accountType === "applicant") {
        if (resource.ownerId !== actor.userId) {
          return deny("INSUFFICIENT_ROLE", "Access denied: you do not own this intake.");
        }
        return consentDenial ?? allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
          return deny("INSUFFICIENT_ROLE", "Insufficient organization role for intake access.");
        }
        // Advocates only see intakes for cases assigned to them.
        if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
          return deny(
            "INSUFFICIENT_ROLE",
            "Advocates can only view intakes for cases assigned to them.",
          );
        }
        return consentDenial ?? allow();
      }
      return deny("INSUFFICIENT_ROLE", "Access denied.");
    }

    case "intake:amend_after_submission": {
      // v1: CASE_STAFF only (advocate/program_manager/owner/supervisor) — applicant self-amend deferred to v2.
      if (actor.accountType !== "provider") {
        return deny("INSUFFICIENT_ROLE", "Provider role required to amend an intake submission.");
      }
      if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
        return deny("INSUFFICIENT_ROLE", "Insufficient organization role to amend intake submissions.");
      }
      if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
        return deny(
          "INSUFFICIENT_ROLE",
          "Advocates can only amend intake submissions on cases assigned to them.",
        );
      }
      return consentDenial ?? allow();
    }

    case "intake:lock_from_silent_edits": {
      // Platform admin only — handled via the global isAdmin bypass in can().
      // If we reach this case it means the actor is not an admin → deny.
      return deny("INSUFFICIENT_ROLE", "Platform administrator access required to lock intake sessions.");
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'intake_session' or 'intake_submission'.`,
      );
  }
}

async function evalStateWorkflow(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // State workflow config is platform-wide; no tenant scope.
  // Agency accounts are explicitly denied for all mutations and admin reads;
  // they may still resolve the active config (read-only public surface).
  const consentDenial = checkConsent(context);

  switch (action) {
    case "state_workflow:resolve_active_config": {
      // Allowed for any authenticated user (already auth-checked in can()).
      return consentDenial ?? allow();
    }

    case "state_workflow:view":
    case "state_workflow:list": {
      // Admin-only read of draft/deprecated configs and full metadata.
      // Platform admins are short-circuited via the can() admin bypass; reaching
      // this case means the actor is not an admin → deny.
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to read state workflow configs in admin context.",
      );
    }

    case "state_workflow:update_config": {
      // Mutations require platform admin (handled via the can() admin bypass).
      // Reaching this case means the actor is not an admin OR the resource status
      // is not 'draft'. Surface a clear status-gate denial when applicable.
      if (resource.status && resource.status !== "draft") {
        return deny(
          "INSUFFICIENT_ROLE",
          "State workflow configs can only be edited while in draft status.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to update state workflow configs.",
      );
    }

    case "state_workflow:publish_version": {
      if (resource.status && resource.status !== "draft") {
        return deny(
          "INSUFFICIENT_ROLE",
          "Only draft state workflow configs can be published.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to publish state workflow configs.",
      );
    }

    case "state_workflow:deprecate_version": {
      if (resource.status && resource.status !== "active") {
        return deny(
          "INSUFFICIENT_ROLE",
          "Only active state workflow configs can be deprecated.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to deprecate state workflow configs.",
      );
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'state_workflow_config'.`,
      );
  }
}

async function evalCvcTemplate(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // CVC form templates are platform-wide; no tenant scope. Agency accounts denied.
  if (actor.tenantType === "agency") {
    return deny("INSUFFICIENT_ROLE", "Agency accounts cannot perform CVC template operations.");
  }
  const consentDenial = checkConsent(context);

  // Runtime actions: cvc_form:* — allowed for CASE_STAFF in tenant scope.
  // Tenant + assignment + status checks happen against the case resource the
  // caller passes in (resource.tenantId = case.organization_id, resource.assignedTo
  // = case.assigned_advocate_id, resource.status = case.status).
  if (
    action === "cvc_form:preview" ||
    action === "cvc_form:generate" ||
    action === "cvc_form:download"
  ) {
    if (resource.tenantId) {
      const tenantDenial = assertSameTenant(actor, resource);
      if (tenantDenial) return tenantDenial;
    }
    if (actor.accountType === "applicant") {
      return deny("INSUFFICIENT_ROLE", "Applicants cannot generate CVC forms in v1.");
    }
    if (actor.accountType !== "provider") {
      return deny("INSUFFICIENT_ROLE", "Provider role required to generate CVC forms.");
    }
    if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
      return deny("INSUFFICIENT_ROLE", "Insufficient organization role for CVC generation.");
    }
    if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
      return deny(
        "INSUFFICIENT_ROLE",
        "Advocates can only generate CVC forms on cases assigned to them.",
      );
    }
    // generate has an additional case-state gate: cannot generate on closed cases
    if (action === "cvc_form:generate" && resource.status === "closed") {
      return deny("INSUFFICIENT_ROLE", "Cannot generate CVC output on a closed case.");
    }
    return consentDenial ?? allow();
  }

  // Admin actions — handled via the global isAdmin bypass in can(). Reaching
  // these cases means the actor is not an admin → deny.
  switch (action) {
    case "cvc_template:create":
    case "cvc_template:view":
    case "cvc_template:list":
    case "cvc_template:upload_source":
    case "cvc_template:map_fields":
    case "cvc_template:validate_alignment": {
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required for CVC template management.",
      );
    }

    case "cvc_template:update": {
      if (resource.status && resource.status !== "draft") {
        return deny(
          "INSUFFICIENT_ROLE",
          "CVC form templates can only be edited while in draft status.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to update CVC templates.",
      );
    }

    case "cvc_template:activate": {
      if (resource.status && resource.status !== "draft") {
        return deny("INSUFFICIENT_ROLE", "Only draft CVC templates can be activated.");
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to activate CVC templates.",
      );
    }

    case "cvc_template:deprecate": {
      if (resource.status && resource.status !== "active") {
        return deny("INSUFFICIENT_ROLE", "Only active CVC templates can be deprecated.");
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to deprecate CVC templates.",
      );
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for resource type 'cvc_form_template'.`,
      );
  }
}

async function evalOutputGenerationJob(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // Output jobs inherit the case's tenant + assignment context. Same gates as
  // the runtime cvc_form:* actions but applied to the job resource directly.
  if (resource.tenantId) {
    const tenantDenial = assertSameTenant(actor, resource);
    if (tenantDenial) return tenantDenial;
  }
  const consentDenial = checkConsent(context);

  if (actor.tenantType === "agency") {
    return deny("INSUFFICIENT_ROLE", "Agency accounts cannot view CVC generation jobs.");
  }

  // The only action targeting this resource type today is cvc_form:preview
  // (used to read the latest job status). Applicants are denied in v1.
  if (actor.accountType === "applicant") {
    return deny("INSUFFICIENT_ROLE", "Applicants cannot view CVC generation jobs in v1.");
  }
  if (actor.accountType !== "provider") {
    return deny("INSUFFICIENT_ROLE", "Provider role required.");
  }
  if (!actor.activeRole || !CASE_STAFF.has(actor.activeRole)) {
    return deny("INSUFFICIENT_ROLE", "Insufficient organization role.");
  }
  if (actor.activeRole === "victim_advocate" && resource.assignedTo !== actor.userId) {
    return deny(
      "INSUFFICIENT_ROLE",
      "Advocates can only view CVC jobs on cases assigned to them.",
    );
  }
  return consentDenial ?? allow();
}

async function evalTranslation(
  action: PolicyAction,
  actor: PolicyActor,
  resource: PolicyResource,
  context?: PolicyContext,
): Promise<PolicyDecision> {
  // Translation surfaces are platform-wide. No tenant scope.
  // Agency accounts ARE allowed to use Explain This and update their own
  // locale preference (they use the app too). Admin-only mutations stay denied
  // for agencies via the global isAdmin bypass logic.
  const consentDenial = checkConsent(context);

  switch (action) {
    case "translation:explain_text":
    case "translation_mapping:resolve": {
      // Allowed for any authenticated actor (auth check already done in can()).
      return consentDenial ?? allow();
    }

    case "locale_preference:update": {
      // Owner-only: actor.userId must match resource.ownerId (the user_id of the
      // locale_preferences row). Allowed for any authenticated account type
      // (applicant, provider, agency, admin via bypass).
      if (resource.ownerId && resource.ownerId !== actor.userId) {
        return deny(
          "INSUFFICIENT_ROLE",
          "You can only update your own locale preference.",
        );
      }
      return consentDenial ?? allow();
    }

    case "translation:explanation_view_log":
    case "translation_mapping_set:view": {
      // Admin-only — handled via the global isAdmin bypass in can(). Reaching
      // here means the actor is not an admin → deny.
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required for translation log/admin views.",
      );
    }

    case "translation_mapping_set:update": {
      if (resource.status && resource.status !== "draft") {
        return deny(
          "INSUFFICIENT_ROLE",
          "Translation mapping sets can only be edited while in draft status.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to update translation mapping sets.",
      );
    }

    case "translation_mapping_set:publish": {
      if (resource.status && resource.status !== "draft") {
        return deny(
          "INSUFFICIENT_ROLE",
          "Only draft translation mapping sets can be published.",
        );
      }
      return deny(
        "INSUFFICIENT_ROLE",
        "Platform administrator access required to publish translation mapping sets.",
      );
    }

    default:
      return deny(
        "RESOURCE_NOT_FOUND",
        `Action '${action}' is not valid for translation resource types.`,
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

  // 2. Platform admin bypass — all admins (including supportMode) get through.
  //    Tenant isolation for supportMode admins is handled by assertSameTenant
  //    returning null (bypass). Role validation is not meaningful for
  //    platform_admin accountType — ownership/resource checks are the guard.
  //    auditRequired: true is always set for admin ALLOWs (Decision 5).
  if (actor.isAdmin) {
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
    case "message_thread":
      decision = await evalMessageThread(action, actor, resource, context);
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
    case "consent":
      decision = await evalConsent(action, actor, resource, context);
      break;
    case "intake_session":
    case "intake_submission":
      decision = await evalIntake(action, actor, resource, context);
      break;
    case "state_workflow_config":
      decision = await evalStateWorkflow(action, actor, resource, context);
      break;
    case "cvc_form_template":
      decision = await evalCvcTemplate(action, actor, resource, context);
      break;
    case "output_generation_job":
      decision = await evalOutputGenerationJob(action, actor, resource, context);
      break;
    case "translation_mapping_set":
    case "locale_preference":
    case "explanation_request":
      decision = await evalTranslation(action, actor, resource, context);
      break;
    case "admin":
      decision = await evalAdmin(action, actor, resource, context);
      break;
    case "applicant_profile":
    case "applicant_preference":
    case "safety_preference":
    case "applicant_bookmark":
    case "provider_search":
      decision = await evalApplicantDomain(action, actor, resource, context);
      break;
    case "trusted_helper_access":
    case "trusted_helper":
      decision = await evalTrustedHelper(action, actor, resource, context);
      break;
    case "referral":
      decision = await evalReferral(action, actor, resource, context);
      break;
    case "appointment":
      decision = await evalAppointment(action, actor, resource, context);
      break;
    case "event":
      decision = await evalEvent(action, actor, resource, context);
      break;
    case "recommendation":
      decision = await evalRecommendation(action, actor, resource, context);
      break;
    default:
      decision = deny("RESOURCE_NOT_FOUND", "Unknown resource type.");
  }

  // 4. Audit on DENY (Decision 5)
  if (!decision.allowed) {
    fireAuditOnDeny(action, actor, resource, decision);
  }

  return decision;
}
