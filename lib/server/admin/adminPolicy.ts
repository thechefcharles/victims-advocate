/**
 * Domain 7.4 — Admin policy evaluator.
 *
 * Platform Admin only for ALL actions. Non-admin always denied.
 * This is the server-side gate — never frontend-only.
 */

import type {
  PolicyActor,
  PolicyContext,
  PolicyDecision,
  PolicyResource,
} from "@/lib/server/policy/policyTypes";

function deny(message: string): PolicyDecision {
  return { allowed: false, reason: "INSUFFICIENT_ROLE", auditRequired: true, message };
}

export async function evalAdminTools(
  action: string,
  actor: PolicyActor,
  _resource: PolicyResource,
  _context?: PolicyContext,
): Promise<PolicyDecision> {
  if (!actor.userId) {
    return { allowed: false, reason: "UNAUTHENTICATED", auditRequired: true, message: "Authentication required." };
  }

  // Platform Admin only — all admin tool actions.
  if (!actor.isAdmin) {
    return deny("Admin tools are platform-admin only.");
  }

  // Support mode actions require additional validation at the service layer
  // (active session check). Policy just confirms admin status.
  return { allowed: true, reason: "ALLOWED", auditRequired: true };
}
