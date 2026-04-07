/**
 * Domain 0.3 — Tenant isolation helpers.
 *
 * isSameTenant()    — boolean predicate, safe for use in conditionals.
 * assertSameTenant() — returns a denial PolicyDecision on mismatch, null on pass.
 *
 * Design decisions (Domain 0.3):
 * - Resources with no tenantId have no tenant constraint; always pass.
 * - Actors with no tenantId (applicants) only pass if resource also has no tenant.
 * - Platform admin in supportMode bypasses tenant isolation — auditRequired is
 *   propagated by the policyEngine's adminAllow() helper, not here.
 * - This module does NOT create scoped DB clients or enforce RLS (Decision 8).
 */

import type { PolicyActor, PolicyResource, PolicyDecision } from "./policyTypes";

/**
 * Returns true when the actor and resource are in the same tenant,
 * or when the resource has no tenant constraint.
 *
 * Applicants (tenantId: null) pass only against resources with no tenantId.
 */
export function isSameTenant(actor: PolicyActor, resource: PolicyResource): boolean {
  if (!resource.tenantId) return true; // no tenant constraint on resource
  if (!actor.tenantId) return false;   // actor has no tenant, resource requires one
  return actor.tenantId === resource.tenantId;
}

/**
 * Returns null (pass) when tenant isolation is satisfied.
 * Returns a PolicyDecision denial when the actor is in a different tenant.
 *
 * Admin in supportMode bypasses tenant isolation — returns null so the
 * resource handler can continue. The policyEngine tags the final allow
 * with auditRequired: true for all admin actions.
 */
export function assertSameTenant(
  actor: PolicyActor,
  resource: PolicyResource,
): PolicyDecision | null {
  // Admin in supportMode: bypass tenant isolation (auditRequired handled by engine)
  if (actor.isAdmin && actor.supportMode) return null;

  if (isSameTenant(actor, resource)) return null;

  return {
    allowed: false,
    reason: "TENANT_SCOPE_MISMATCH",
    message: "Access denied: resource belongs to a different tenant.",
    auditRequired: true,
  };
}
