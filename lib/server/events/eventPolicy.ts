/**
 * Domain 4.3 — Event policy evaluator.
 *
 * Handles 9 event actions:
 *   event:create, event:view, event:update, event:publish, event:cancel,
 *   event:close, event:list, event:register, event:unregister
 *
 * Resource shape:
 *   tenantId      — organization_id that owns the event
 *   status        — current EventStatus (for state guards on register/unregister/close)
 *   ownerId       — created_by / participant id (for applicant self-unregister)
 *   audienceScope — event's audience_scope (for visibility checks)
 *
 * Note: audience_scope is also enforced at the DB query level in the
 * repository (public queries filter on it). The policy handles single-row
 * view access and action gating.
 */

import type {
  PolicyActor,
  PolicyResource,
  PolicyContext,
  PolicyDecision,
} from "@/lib/server/policy/policyTypes";
import type { EventAudienceScope } from "./eventTypes";
import { PUBLIC_VISIBLE_SCOPES } from "./eventTypes";

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

/** Provider roles authorized to create / publish / cancel / close events. */
const EVENT_MANAGER_ROLES = new Set<string>([
  "org_owner",
  "program_manager",
  "supervisor",
]);

/** Provider roles authorized to edit event metadata (broader than managers). */
const EVENT_EDITOR_ROLES = new Set<string>([
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
]);

/** Provider roles that can view provider_internal events. */
const PROVIDER_VIEW_ROLES = new Set<string>([
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
  "auditor",
  "intake_specialist",
]);

/**
 * Resource extension — eventPolicy reads audienceScope off the resource.
 * Callers inject it from the fetched EventRow.
 */
type EventPolicyResource = PolicyResource & { audienceScope?: EventAudienceScope };

export async function evalEvent(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  const eventResource = resource as EventPolicyResource;

  switch (action) {
    case "event:create": {
      if (actor.accountType !== "provider") {
        return deny("Only provider accounts can create events.");
      }
      if (!actor.activeRole || !EVENT_MANAGER_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required to create events.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only create events within your own organization.");
      }
      return allow();
    }

    case "event:view": {
      // Provider: org-scoped access to any audience_scope for own org
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !PROVIDER_VIEW_ROLES.has(actor.activeRole)) {
          return deny("Provider role required to view events.");
        }
        // Cross-tenant view — only if event is public/applicant_visible
        if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
          if (eventResource.audienceScope && PUBLIC_VISIBLE_SCOPES.includes(eventResource.audienceScope)) {
            return allow();
          }
          return deny("Cross-organization events require public or applicant-visible scope.");
        }
        return allow();
      }
      // Applicant: only public/applicant_visible
      if (actor.accountType === "applicant") {
        if (eventResource.audienceScope && PUBLIC_VISIBLE_SCOPES.includes(eventResource.audienceScope)) {
          return allow();
        }
        return deny("This event is not visible to applicants.");
      }
      // Agency accounts — denied from provider event management by default
      return deny("Access denied.");
    }

    case "event:list": {
      // Any authenticated user may list — repository enforces scope via filters.
      if (actor.accountType === "provider" || actor.accountType === "applicant") {
        return allow();
      }
      return deny("Access denied.");
    }

    case "event:update": {
      if (actor.accountType !== "provider") {
        return deny("Only provider staff can update events.");
      }
      if (!actor.activeRole || !EVENT_EDITOR_ROLES.has(actor.activeRole)) {
        return deny("Provider staff role required to update events.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only update events in your own organization.");
      }
      return allow();
    }

    case "event:publish":
    case "event:cancel":
    case "event:close": {
      if (actor.accountType !== "provider") {
        return deny("Only provider leadership can change event lifecycle state.");
      }
      if (!actor.activeRole || !EVENT_MANAGER_ROLES.has(actor.activeRole)) {
        return deny("Provider leadership role required for event lifecycle actions.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only manage events in your own organization.");
      }
      return allow();
    }

    case "event:register": {
      // Registration requires a published event (guards also enforced in service layer)
      if (resource.status && resource.status !== "published") {
        return deny(`Cannot register for a '${resource.status}' event.`);
      }
      // Only public/applicant_visible events are open to applicant registration
      if (actor.accountType === "applicant") {
        if (eventResource.audienceScope && !PUBLIC_VISIBLE_SCOPES.includes(eventResource.audienceScope)) {
          return deny("This event is not open to applicant registration.");
        }
        return allow();
      }
      // Providers can register for provider_internal or public events in their own org
      if (actor.accountType === "provider") {
        return allow();
      }
      return deny("Access denied.");
    }

    case "event:unregister": {
      // A user can always cancel their own registration
      if (resource.ownerId && resource.ownerId !== actor.userId) {
        return deny("You can only cancel your own registration.");
      }
      return allow();
    }

    default:
      return deny(`Unknown event action: ${action}`);
  }
}
