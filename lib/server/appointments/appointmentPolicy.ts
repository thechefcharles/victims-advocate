/**
 * Domain 4.2 — Appointment policy evaluator.
 *
 * Handles 8 appointment actions:
 *   appointment:create, appointment:view, appointment:update,
 *   appointment:reschedule, appointment:cancel, appointment:complete,
 *   appointment:list, appointment:availability.view
 *
 * Never queries the DB. Resource shape:
 *   ownerId    — case owner (applicant userId) for applicant self-access
 *   tenantId   — organization_id the appointment belongs to
 *   status     — current AppointmentStatus (for terminal-state guards)
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

/** Roles that can create and manage appointments on behalf of a case. */
const APPOINTMENT_STAFF_ROLES = new Set<string>([
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
]);

/** Roles that can view appointments in provider scope. */
const APPOINTMENT_VIEW_ROLES = new Set<string>([
  "org_owner",
  "program_manager",
  "supervisor",
  "victim_advocate",
  "auditor",
]);

export async function evalAppointment(
  action: string,
  actor: PolicyActor,
  resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) return unauthenticated();
  if (actor.isAdmin) return { allowed: true, reason: "ALLOWED", auditRequired: true };

  switch (action) {
    case "appointment:create": {
      if (actor.accountType !== "provider") {
        return deny("Only provider accounts can create appointments.");
      }
      if (!actor.activeRole || !APPOINTMENT_STAFF_ROLES.has(actor.activeRole)) {
        return deny("Provider staff role required to create appointments.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only create appointments within your own organization.");
      }
      return allow();
    }

    case "appointment:view": {
      // Applicant: can only view their own case-linked appointments
      if (actor.accountType === "applicant") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("You can only view your own appointments.");
        }
        return allow();
      }
      // Provider: must have a recognized role
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !APPOINTMENT_VIEW_ROLES.has(actor.activeRole)) {
          return deny("Provider role required to view appointments.");
        }
        return allow();
      }
      return deny("Access denied.");
    }

    case "appointment:list": {
      if (actor.accountType === "applicant") return allow();
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !APPOINTMENT_VIEW_ROLES.has(actor.activeRole)) {
          return deny("Provider role required to list appointments.");
        }
        return allow();
      }
      return deny("Access denied.");
    }

    case "appointment:update": {
      if (actor.accountType !== "provider") {
        return deny("Only provider staff can update appointment details.");
      }
      if (!actor.activeRole || !APPOINTMENT_STAFF_ROLES.has(actor.activeRole)) {
        return deny("Provider staff role required to update appointments.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only update appointments in your own organization.");
      }
      return allow();
    }

    case "appointment:reschedule": {
      if (actor.accountType !== "provider") {
        return deny("Only provider staff can reschedule appointments.");
      }
      if (!actor.activeRole || !APPOINTMENT_STAFF_ROLES.has(actor.activeRole)) {
        return deny("Provider staff role required to reschedule appointments.");
      }
      if (actor.tenantId && resource.tenantId && actor.tenantId !== resource.tenantId) {
        return deny("You can only reschedule appointments in your own organization.");
      }
      return allow();
    }

    case "appointment:cancel": {
      // Both provider staff and the applicant (case owner) can cancel
      if (actor.accountType === "applicant") {
        if (resource.ownerId && resource.ownerId !== actor.userId) {
          return deny("You can only cancel your own appointments.");
        }
        return allow();
      }
      if (actor.accountType === "provider") {
        if (!actor.activeRole || !APPOINTMENT_STAFF_ROLES.has(actor.activeRole)) {
          return deny("Provider staff role required to cancel appointments.");
        }
        return allow();
      }
      return deny("Access denied.");
    }

    case "appointment:complete": {
      if (actor.accountType !== "provider") {
        return deny("Only provider staff can mark appointments as completed.");
      }
      if (!actor.activeRole || !APPOINTMENT_STAFF_ROLES.has(actor.activeRole)) {
        return deny("Provider staff role required to complete appointments.");
      }
      return allow();
    }

    case "appointment:availability.view": {
      // Any authenticated provider or applicant can view availability for scheduling
      if (actor.accountType === "applicant" || actor.accountType === "provider") {
        return allow();
      }
      return deny("Access denied.");
    }

    default:
      return deny(`Unknown appointment action: ${action}`);
  }
}
