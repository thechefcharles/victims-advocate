/**
 * Domain 7.2 — Notification policy evaluator.
 *
 * Handles 7 notification actions:
 *   notification:list, notification:view, notification:mark_read,
 *   notification:mark_unread, notification:dismiss,
 *   notification:preference.view, notification:preference.update
 *
 * Access model:
 *   - All notification reads are user-scoped (own notifications only)
 *   - Preference updates are owner-only
 *   - Cross-user notification access is ALWAYS denied
 *   - Admin can view any user's notifications (with auditRequired)
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

export async function evalNotification(
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
    case "notification:list":
    case "notification:view":
    case "notification:mark_read":
    case "notification:mark_unread":
    case "notification:dismiss": {
      // User-scoped: ownerId on resource must match actor.
      if (resource.ownerId && resource.ownerId !== actor.userId) {
        return deny("You can only access your own notifications.");
      }
      return allow();
    }

    case "notification:preference.view":
    case "notification:preference.update": {
      // Owner-only: ownerId must match actor.
      if (resource.ownerId && resource.ownerId !== actor.userId) {
        return deny("You can only manage your own notification preferences.");
      }
      return allow();
    }

    default:
      return deny(`Unknown notification action: ${action}`);
  }
}
